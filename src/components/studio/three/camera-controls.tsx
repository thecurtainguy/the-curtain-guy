"use client";

import {
  getCeilingDrapes,
  getStudioMaterials,
  type StudioCeilingFinish,
  type StudioDesignJson,
  type StudioPoint,
  type StudioWallFinish,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  DEFAULT_STUDIO_EDITOR_SETTINGS,
  useOptionalStudioEditorActions,
  useOptionalStudioSelection,
  useOptionalStudioSettings,
  useStudioCanvasCommand,
  type StudioCanvasCommand,
} from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import {
  cameraModeFromView,
  getStudioCameraMode,
  getStudioHeadBob,
  isInteriorMode,
  isStudioPointerLocked,
  mouseLookAvailable,
  publishCameraRigState,
  setStudioCameraMode,
  setStudioCameraMounted,
  subscribeCameraRig,
  useStudioCameraMode,
  useStudioMouseLook,
  type StudioCameraMode,
} from "./camera/camera-view-store";
import { getCeilingDesignPose, getCeilingViewPose } from "./camera/ceiling-poses";
import {
  DEFAULT_PIVOT_DISTANCE,
  MAX_PITCH_DOWN,
  MAX_PITCH_UP,
  WALK_FOV,
  clampEye,
  clampHeight,
  clampPivot,
  getInteriorCornerPose,
  getInteriorGuestPose,
  getInteriorShowcasePose,
  getInteriorStagePose,
  getWalkPose,
  interiorFov,
  maxEyeHeight,
  MIN_CAMERA_HEIGHT,
} from "./camera/interior-poses";
import {
  clampToFootprint,
  createRoomFootprint,
  isInsideFootprint,
  planInteriorPath,
  type RoomFootprint,
} from "./camera/room-footprint";
import { hasFlag, isSolidHit } from "./camera/scene-hits";
import { useInteriorInput } from "./camera/use-interior-input";
import { usePointerLook } from "./camera/use-pointer-look";
import {
  fitDistance,
  getCameraRange,
  getFitPose,
  getFocusPose,
  getFrontPose,
  getHeroPose,
  getSelectionBox,
  getTopPose,
  type StudioCameraPose,
} from "./engine-camera";
import { setStudioInteraction } from "./interaction-store";
import {
  ceilingArchitectureHangIn,
  resolveCeilingArchitecture,
} from "./venue/ceiling-architecture";

type ControlsImpl = React.ComponentRef<typeof OrbitControls>;

/** Mouse-look easing (1/s): ~30 ms to settle, enough to smooth uneven frames without lag. */
const POINTER_LOOK_RATE = 34;

type PoseFactory = (aspect: number) => StudioCameraPose;

type CameraTween = {
  elapsed: number;
  duration: number;
  /** In-room flight along floor waypoints; otherwise a spherical swing around the target. */
  path: THREE.Vector3[] | null;
  pathLengths: number[];
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromOffset: THREE.Spherical;
  toOffset: THREE.Spherical;
  fromFov: number;
  toFov: number;
};

/** First-person state for every in-room view. */
type LookState = {
  synced: boolean;
  yaw: number;
  pitch: number;
  goalYaw: number;
  goalPitch: number;
  /** Distance to the subject that right-drag orbits around. */
  pivotDistance: number;
  /** Eye height the camera eases toward (Q/E, HUD presets). */
  eyeGoal: number;
  bobPhase: number;
  bobOffset: number;
  /** "Lie back": eye dropped low, gazing straight up; `restoreEye` is where to return. */
  lyingBack: boolean;
  restoreEye: number;
};

const TWEEN_SECONDS = 0.9;
const MIN_PIVOT_DISTANCE = 2;
const WALK_SPEED = 6;
const RUN_SPEED = 13;
/** Feet per second for Q/E eye-height changes. */
const RISE_SPEED = 3;
/** Radians per second for the in-room showcase orbit (~100 s per turn). */
const SHOWCASE_SPIN = 0.065;
const ORBIT_GAIN = 1.6;
const LOOK_UP_PITCH = THREE.MathUtils.degToRad(55);
const LIE_BACK_PITCH = THREE.MathUtils.degToRad(84);
/** Near plane inside the room: fabric can hang within inches of a raised eye. */
const INTERIOR_NEAR = 0.04;
const EXTERIOR_NEAR = 0.1;
/** Room resizes refit the camera once they settle, or straight away past this fraction. */
const ROOM_REFIT_SETTLE_MS = 400;
const ROOM_REFIT_JUMP = 0.1;
/** OrbitControls keeps coasting (damping) after release; motion ends once changes stop. */
const ORBIT_COAST_MS = 120;
/** A rig remounted within this window (e.g. render-context swap) resumes the same view. */
const PARKED_POSE_MS = 4000;

let parkedPose: { pose: StudioCameraPose; framed: boolean; at: number } | null = null;

function takeParkedPose() {
  const parked = parkedPose;
  parkedPose = null;
  if (!parked || performance.now() - parked.at > PARKED_POSE_MS) return null;
  return parked;
}

/* Per-frame scratch; only one Studio canvas renders at a time. */
const scratch = {
  base: new THREE.Vector3(),
  forward: new THREE.Vector3(),
  flat: new THREE.Vector3(),
  right: new THREE.Vector3(),
  move: new THREE.Vector3(),
  pivot: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  spherical: new THREE.Spherical(),
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function shortestAngle(from: number, to: number) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta;
}

function isInsideRoom(footprint: RoomFootprint, point: THREE.Vector3) {
  return point.y < footprint.height && isInsideFootprint(footprint, point.x, point.z);
}

/** Unit view direction for a yaw (0 = −Z, + turns left) and pitch (+ looks up). */
function forwardFrom(yaw: number, pitch: number, out: THREE.Vector3) {
  const flat = Math.cos(pitch);
  return out.set(-Math.sin(yaw) * flat, Math.sin(pitch), -Math.cos(yaw) * flat);
}

function clampPitch(pitch: number) {
  return THREE.MathUtils.clamp(pitch, MAX_PITCH_DOWN, MAX_PITCH_UP);
}

/** Point along a floor polyline (with lerped height) at eased progress `k`. */
function alongPath(path: THREE.Vector3[], lengths: number[], k: number, out: THREE.Vector3) {
  const total = lengths[lengths.length - 1];
  const distance = total * k;
  for (let index = 1; index < path.length; index += 1) {
    if (distance <= lengths[index] || index === path.length - 1) {
      const span = lengths[index] - lengths[index - 1] || 1;
      const t = THREE.MathUtils.clamp((distance - lengths[index - 1]) / span, 0, 1);
      out.lerpVectors(path[index - 1], path[index], t);
      break;
    }
  }
  out.y = THREE.MathUtils.lerp(path[0].y, path[path.length - 1].y, k);
  return out;
}

/**
 * The Studio camera rig. Opens inside the room at a guest's eye level. Every
 * in-room view is first person: drag looks around (up to the ceiling),
 * right-drag orbits the subject, WASD / arrows walk with wall sliding, Q/E
 * change eye height, scroll steps, double-click glides. Top and dollhouse are
 * exterior orbit views driven by OrbitControls.
 */
export function StudioCameraControls({
  design,
  bounds,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
}) {
  const designRef = useRef(design);
  useLayoutEffect(() => {
    designRef.current = design;
  }, [design]);
  const getDesign = useCallback(() => designRef.current, []);
  const materials = getStudioMaterials(design);
  return (
    <CameraRig
      getDesign={getDesign}
      bounds={bounds}
      floor={design.room.floor}
      wallHeight={design.room.wallHeight}
      showCeiling={design.view.showCeiling !== false}
      ceilingFinish={materials.ceiling ?? "auto"}
      wallFinish={materials.walls}
    />
  );
}

/**
 * Memoized on room-level inputs only, so item drags (new design every frame)
 * never re-render the rig or re-bind OrbitControls. Handlers read the live
 * design through `getDesign`.
 */
const CameraRig = memo(function CameraRig({
  getDesign,
  bounds,
  floor,
  wallHeight,
  showCeiling,
  ceilingFinish,
  wallFinish,
}: {
  getDesign: () => StudioDesignJson;
  bounds: StudioBounds;
  floor: StudioPoint[];
  wallHeight: number;
  showCeiling: boolean;
  ceilingFinish: StudioCeilingFinish;
  wallFinish: StudioWallFinish;
}) {
  const command = useStudioCanvasCommand();
  const settings = useOptionalStudioSettings();
  const autoRotate = settings?.autoRotate ?? false;
  const layers = settings?.layers ?? DEFAULT_STUDIO_EDITOR_SETTINGS.layers;
  const updateSettings = useOptionalStudioEditorActions()?.updateSettings;
  const selectionState = useOptionalStudioSelection();
  const selection: StudioSelection = selectionState?.selection ?? null;
  const selectedIds = selectionState?.selectedIds;
  const mode = useStudioCameraMode();
  const interior = isInteriorMode(mode);
  const walk = mode === "walk";

  const getState = useThree((state) => state.get);
  const domElement = useThree((state) => state.gl.domElement);
  const getCamera = useCallback(
    () => getState().camera as THREE.PerspectiveCamera,
    [getState]
  );
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<ControlsImpl>(null);
  const tween = useRef<CameraTween | null>(null);
  /* The last preset framing; re-applied on canvas resize until the user moves. */
  const framing = useRef<PoseFactory | null>(null);
  const look = useRef<LookState>({
    synced: false,
    yaw: 0,
    pitch: 0,
    goalYaw: 0,
    goalPitch: 0,
    pivotDistance: DEFAULT_PIVOT_DISTANCE,
    eyeGoal: 5.5,
    bobPhase: 0,
    bobOffset: 0,
    lyingBack: false,
    restoreEye: 5.5,
  });
  const handledNonce = useRef(command?.nonce ?? 0);
  const range = useMemo(
    () => getCameraRange(bounds, wallHeight),
    [bounds, wallHeight]
  );
  const ceilingHangIn = useMemo(
    () =>
      showCeiling
        ? ceilingArchitectureHangIn(
            resolveCeilingArchitecture(ceilingFinish, wallFinish, floor, bounds, wallHeight),
            wallHeight
          )
        : 0,
    [bounds, ceilingFinish, floor, showCeiling, wallFinish, wallHeight]
  );
  const footprint = useMemo(
    () => createRoomFootprint(floor, wallHeight, bounds, ceilingHangIn),
    [bounds, ceilingHangIn, floor, wallHeight]
  );

  const latest = useRef({
    bounds,
    footprint,
    layers,
    selection,
    selectedIds: selectedIds ?? [],
    autoRotate,
  });
  useLayoutEffect(() => {
    latest.current = {
      bounds,
      footprint,
      layers,
      selection,
      selectedIds: selectedIds ?? [],
      autoRotate,
    };
  }, [autoRotate, bounds, footprint, layers, selectedIds, selection]);

  /* Last rendered orbit target; refs to the controls are gone by unmount cleanup. */
  const lastTarget = useRef(new THREE.Vector3());
  const motionFlags = useRef({ tween: false, walk: false, orbit: false });
  const setMotionFlag = useCallback((source: "tween" | "walk" | "orbit", on: boolean) => {
    if (motionFlags.current[source] === on) return;
    motionFlags.current[source] = on;
    setStudioInteraction(source, on);
  }, []);
  const orbitCoast = useRef(0);

  useEffect(() => {
    setStudioCameraMounted(true);
    const flags = motionFlags.current;
    const target = lastTarget.current;
    return () => {
      setStudioCameraMounted(false);
      window.clearTimeout(orbitCoast.current);
      for (const source of ["tween", "walk", "orbit"] as const) {
        if (flags[source]) setStudioInteraction(source, false);
        flags[source] = false;
      }
      if (!framedRoom.current) return;
      const camera = getCamera();
      parkedPose = {
        pose: { position: camera.position.clone(), target: target.clone(), fov: camera.fov },
        framed: framing.current !== null,
        at: performance.now(),
      };
    };
  }, [getCamera]);

  useEffect(() => {
    const camera = getCamera();
    camera.near = interior ? INTERIOR_NEAR : EXTERIOR_NEAR;
    camera.far = range.far;
    camera.updateProjectionMatrix();
    invalidate();
  }, [getCamera, interior, invalidate, range.far]);

  const moveTo = useCallback(
    (pose: StudioCameraPose, duration = TWEEN_SECONDS) => {
      const control = controls.current;
      if (!control) return;
      const camera = getCamera();
      look.current.synced = false;
      look.current.bobOffset = 0;
      look.current.lyingBack = false;
      if (duration <= 0 || prefersReducedMotion()) {
        tween.current = null;
        control.target.copy(pose.target);
        camera.position.copy(pose.position);
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
        control.update();
        invalidate();
        return;
      }
      const room = latest.current.footprint;
      const fromOffset = new THREE.Spherical().setFromVector3(
        camera.position.clone().sub(control.target)
      );
      const toOffset = new THREE.Spherical().setFromVector3(
        pose.position.clone().sub(pose.target)
      );
      toOffset.theta = shortestAngle(fromOffset.theta, toOffset.theta);
      let path: THREE.Vector3[] | null = null;
      const pathLengths: number[] = [0];
      if (isInsideRoom(room, camera.position) && isInsideRoom(room, pose.position)) {
        path = planInteriorPath(
          room,
          { x: camera.position.x, z: camera.position.z },
          { x: pose.position.x, z: pose.position.z }
        ).map((point) => new THREE.Vector3(point.x, 0, point.z));
        path[0].y = camera.position.y;
        path[path.length - 1].y = pose.position.y;
        for (let index = 1; index < path.length; index += 1) {
          pathLengths.push(
            pathLengths[index - 1] +
              Math.hypot(path[index].x - path[index - 1].x, path[index].z - path[index - 1].z)
          );
        }
        if (pathLengths[pathLengths.length - 1] < 1e-4) pathLengths[pathLengths.length - 1] = 1;
      }
      tween.current = {
        elapsed: 0,
        duration,
        path,
        pathLengths,
        fromPosition: camera.position.clone(),
        toPosition: pose.position.clone(),
        fromTarget: control.target.clone(),
        toTarget: pose.target.clone(),
        fromOffset,
        toOffset,
        fromFov: camera.fov,
        toFov: pose.fov,
      };
      invalidate();
    },
    [getCamera, invalidate]
  );

  const currentPose = useCallback((): StudioCameraPose => {
    const camera = getCamera();
    return {
      position: camera.position.clone(),
      target: controls.current?.target.clone() ?? new THREE.Vector3(),
      fov: camera.fov,
    };
  }, [getCamera]);

  /** Pose factory for a preset, evaluated per aspect so resizes can refit. */
  const presetFor = useCallback(
    (next: StudioCameraMode): PoseFactory => {
      const ctx = () => ({ ...latest.current, design: getDesign() });
      switch (next) {
        case "guest":
          return (a) => {
            const c = ctx();
            return getInteriorGuestPose(c.design, c.bounds, c.footprint, c.layers, a);
          };
        case "stage":
          return (a) => {
            const c = ctx();
            return getInteriorStagePose(c.design, c.bounds, c.footprint, c.layers, a);
          };
        case "corner":
          return (a) => {
            const c = ctx();
            return getInteriorCornerPose(c.design, c.bounds, c.footprint, c.layers, a);
          };
        case "ceiling": {
          const ceilingSelection = latest.current.selection;
          return (a) => {
            const c = ctx();
            return getCeilingViewPose(c.design, c.bounds, c.footprint, c.layers, a, ceilingSelection);
          };
        }
        case "showcase":
          return (a) => {
            const c = ctx();
            return getInteriorShowcasePose(c.design, c.bounds, c.footprint, c.layers, a);
          };
        case "walk": {
          const start = currentPose();
          return (a) => {
            const c = ctx();
            return getWalkPose(
              c.footprint,
              start,
              getInteriorGuestPose(c.design, c.bounds, c.footprint, c.layers, a),
              a
            );
          };
        }
        case "front": {
          const frontSelection = latest.current.selection;
          return (a) => {
            const c = ctx();
            const pose = getFrontPose(c.design, c.bounds, frontSelection, a);
            return { ...pose, fov: interiorFov(pose.fov, a) };
          };
        }
        case "top":
          return (a) => getTopPose(latest.current.bounds, getDesign().room.wallHeight, a);
        case "dollhouse":
          return (a) => getHeroPose(latest.current.bounds, getDesign().room.wallHeight, a);
      }
    },
    [currentPose, getDesign]
  );

  const goToMode = useCallback(
    (next: StudioCameraMode, duration = TWEEN_SECONDS) => {
      const aspect = getCamera().aspect || 1;
      const factory = presetFor(next);
      setStudioCameraMode(next);
      if (next === "showcase") {
        if (!latest.current.autoRotate) updateSettings?.({ autoRotate: true });
      } else if (latest.current.autoRotate) {
        updateSettings?.({ autoRotate: false });
      }
      framing.current = next === "walk" ? null : factory;
      moveTo(factory(aspect), duration);
    },
    [getCamera, moveTo, presetFor, updateSettings]
  );

  const markUserMoved = useCallback(() => {
    tween.current = null;
    framing.current = null;
  }, []);

  const takeOver = useCallback(() => {
    if (latest.current.autoRotate) updateSettings?.({ autoRotate: false });
    if (getStudioCameraMode() === "showcase") setStudioCameraMode("guest");
    markUserMoved();
    invalidate();
  }, [invalidate, markUserMoved, updateSettings]);

  /* Double-click the floor to glide there; proxies keep their own double-click. */
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const control = controls.current;
      if (!control || !control.enabled) return;
      const state = getState();
      const camera = state.camera as THREE.PerspectiveCamera;
      const rect = domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(state.scene.children, true);
      for (const hit of hits) {
        if (hasFlag(hit.object, "studioProxy") || hasFlag(hit.object, "studioGizmo")) return;
        if (!isSolidHit(hit.object)) continue;
        const normal = hit.face
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
          : null;
        if (!normal || normal.y < 0.7 || hit.point.y > 0.75) return;
        const room = latest.current.footprint;
        const spot = clampToFootprint(room, hit.point.x, hit.point.z);
        const shift = new THREE.Vector3(spot.x - camera.position.x, 0, spot.z - camera.position.z);
        takeOver();
        moveTo({
          position: camera.position.clone().add(shift),
          target: control.target.clone().add(shift),
          fov: camera.fov,
        });
        return;
      }
    },
    [domElement, getState, moveTo, takeOver]
  );

  const motion = useInteriorInput(domElement, interior, walk, {
    onActivity: takeOver,
    onDoubleClick: handleDoubleClick,
    wheelStep: () => Math.max(1.2, latest.current.footprint.diagonal * 0.045),
    isPaused: () => !(controls.current?.enabled ?? false),
  });

  const mouseLook = useStudioMouseLook();
  usePointerLook(domElement, mode, {
    available: mouseLookAvailable(mode, mouseLook),
    getState,
    onTurn: motion.addTurn,
    onActivity: takeOver,
  });

  /* Eye-height and look-up requests from the walk HUD. */
  useEffect(
    () =>
      subscribeCameraRig((request) => {
        const state = look.current;
        const room = latest.current.footprint;
        if (request.type === "lie_back") {
          if (request.on && !state.lyingBack) {
            state.restoreEye = state.eyeGoal;
            state.eyeGoal = clampHeight(room, MIN_CAMERA_HEIGHT);
            state.goalPitch = LIE_BACK_PITCH;
          } else if (!request.on && state.lyingBack) {
            state.eyeGoal = clampHeight(room, state.restoreEye);
            state.goalPitch = 0;
          }
          state.lyingBack = request.on;
        } else {
          state.lyingBack = false;
          if (request.type === "eye") state.eyeGoal = clampHeight(room, request.feet);
          else if (request.type === "eye_step") {
            state.eyeGoal = clampHeight(room, state.eyeGoal + request.feet);
          } else state.goalPitch = request.up ? LOOK_UP_PITCH : 0;
        }
        framing.current = null;
        invalidate();
      }),
    [invalidate]
  );

  const runCommand = useCallback(
    (next: StudioCanvasCommand) => {
      const control = controls.current;
      if (!control) return;
      const camera = getCamera();
      const current = getStudioCameraMode();
      const room = latest.current.footprint;
      const aspect = camera.aspect || 1;
      const stopSpin = () => {
        if (latest.current.autoRotate) updateSettings?.({ autoRotate: false });
      };

      switch (next.type) {
        case "reset":
          goToMode("guest");
          return;
        case "fit": {
          if (isInteriorMode(current)) {
            goToMode(current === "walk" || current === "showcase" ? "guest" : current);
            return;
          }
          stopSpin();
          const probe = camera.clone();
          probe.position.copy(camera.position).sub(control.target);
          const origin = new THREE.Vector3();
          const height = getDesign().room.wallHeight;
          framing.current = (a) =>
            getFitPose(latest.current.bounds, height, a, probe, origin);
          moveTo(framing.current(aspect));
          return;
        }
        case "zoom": {
          framing.current = null;
          if (isInteriorMode(current)) {
            motion.addDolly(
              (next.direction === "in" ? 1 : -1) * Math.max(2, room.diagonal * 0.1)
            );
            invalidate();
            return;
          }
          const offset = camera.position.clone().sub(control.target);
          const factor = next.direction === "in" ? 0.76 : 1.3;
          const radius = THREE.MathUtils.clamp(
            offset.length() * factor,
            range.minDistance,
            range.maxDistance
          );
          moveTo(
            {
              position: control.target.clone().add(offset.setLength(radius)),
              target: control.target.clone(),
              fov: camera.fov,
            },
            0.4
          );
          return;
        }
        case "focus_selection": {
          const { bounds: b, selectedIds: ids, selection: s } = latest.current;
          const d = getDesign();
          if (s?.kind === "ceiling" && ids.every((id) => id === s.id)) {
            const drape = getCeilingDrapes(d).find((item) => item.id === s.id);
            const pose = drape
              ? getCeilingDesignPose(d, b, room, drape, aspect, {
                  from: { x: camera.position.x, z: camera.position.z },
                })
              : null;
            if (!pose) return;
            stopSpin();
            framing.current = null;
            look.current.lyingBack = false;
            if (current === "walk") {
              moveTo({ position: camera.position.clone(), target: pose.target, fov: camera.fov });
              return;
            }
            setStudioCameraMode("ceiling");
            moveTo(pose);
            return;
          }
          const box = getSelectionBox(d, b, ids, s);
          if (!box) return;
          stopSpin();
          framing.current = null;
          if (!isInteriorMode(current)) {
            moveTo(getFocusPose(box, camera, control.target, aspect));
            return;
          }
          const center = box.getCenter(new THREE.Vector3());
          if (current === "showcase") setStudioCameraMode("guest");
          if (current === "walk") {
            moveTo({ position: camera.position.clone(), target: center, fov: camera.fov });
            return;
          }
          const away = camera.position.clone().sub(center);
          away.y = 0;
          if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
          away.normalize();
          away.y = 0.22;
          away.normalize();
          const distance = THREE.MathUtils.clamp(
            fitDistance(box, center, away, camera.fov, aspect, 1.3),
            4,
            Math.max(4, camera.position.distanceTo(center))
          );
          const position = center.clone().addScaledVector(away, distance);
          clampEye(room, position);
          moveTo({ position, target: center, fov: camera.fov });
          return;
        }
        case "camera":
          goToMode(cameraModeFromView(next.view));
          return;
      }
    },
    [
      getCamera,
      getDesign,
      goToMode,
      invalidate,
      motion,
      moveTo,
      range.maxDistance,
      range.minDistance,
      updateSettings,
    ]
  );

  useEffect(() => {
    if (!command || command.nonce === handledNonce.current) return;
    handledNonce.current = command.nonce;
    runCommand(command);
  }, [command, runCommand]);

  /* The showcase spin can also be toggled from the toolbar. */
  const wasRotating = useRef(autoRotate);
  useEffect(() => {
    const started = autoRotate && !wasRotating.current;
    wasRotating.current = autoRotate;
    const current = getStudioCameraMode();
    if (started && isInteriorMode(current) && current !== "showcase") {
      goToMode("showcase");
    }
    invalidate();
  }, [autoRotate, goToMode, invalidate]);

  /* Initial guest framing, then a gentle refit once a room resize settles
     (or jumps by >10%), so live resize previews don't restart the tween every frame. */
  const roomWidth = Math.round(bounds.width);
  const roomDepth = Math.round(bounds.depth);
  const roomHeight = Math.round(wallHeight);
  const roomKey = `${roomWidth}x${roomDepth}x${roomHeight}`;
  const framedRoom = useRef<{ key: string; width: number; depth: number; height: number } | null>(
    null
  );
  useEffect(() => {
    const previous = framedRoom.current;
    if (previous?.key === roomKey) return;
    const change = previous
      ? Math.max(
          Math.abs(roomWidth - previous.width) / Math.max(1, previous.width),
          Math.abs(roomDepth - previous.depth) / Math.max(1, previous.depth),
          Math.abs(roomHeight - previous.height) / Math.max(1, previous.height)
        )
      : 1;
    let frame = 0;
    const refit = () => {
      const control = controls.current;
      if (!control) return;
      const camera = getCamera();
      const aspect = camera.aspect || 1;
      if (framedRoom.current === null) {
        const parked = takeParkedPose();
        if (parked && !parked.framed) {
          framing.current = null;
          moveTo(parked.pose, 0);
        } else {
          framing.current = presetFor(getStudioCameraMode());
          moveTo(framing.current(aspect), 0);
        }
      } else if (framing.current) {
        moveTo(framing.current(aspect), 0.8);
      } else if (isInteriorMode(getStudioCameraMode())) {
        const position = camera.position.clone();
        const shift = position.clone();
        clampEye(latest.current.footprint, position);
        shift.subVectors(position, shift);
        moveTo({ position, target: control.target.clone().add(shift), fov: camera.fov }, 0.6);
      } else {
        moveTo(
          getFitPose(latest.current.bounds, getDesign().room.wallHeight, aspect, camera, control.target),
          0.8
        );
      }
      framedRoom.current = {
        key: roomKey,
        width: roomWidth,
        depth: roomDepth,
        height: roomHeight,
      };
    };
    const timer = window.setTimeout(
      () => {
        frame = window.requestAnimationFrame(refit);
      },
      change > ROOM_REFIT_JUMP ? 0 : ROOM_REFIT_SETTLE_MS
    );
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [getCamera, getDesign, moveTo, presetFor, roomDepth, roomHeight, roomKey, roomWidth]);

  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!viewportWidth || !viewportHeight) return;
      const aspect = viewportWidth / viewportHeight;
      const preset = framing.current;
      if (getStudioCameraMode() === "walk" && !tween.current) {
        const camera = getCamera();
        camera.fov = interiorFov(WALK_FOV, aspect);
        camera.updateProjectionMatrix();
        invalidate();
        return;
      }
      if (!preset || tween.current || latest.current.autoRotate) return;
      moveTo(preset(aspect), 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [getCamera, invalidate, moveTo, viewportHeight, viewportWidth]);

  /* Exterior views keep the orbit target near the room. */
  const constrainExterior = useCallback(() => {
    const control = controls.current;
    if (!control || tween.current || isInteriorMode(getStudioCameraMode())) return;
    const b = latest.current.bounds;
    const halfWidth = b.width / 24 + 4;
    const halfDepth = b.depth / 24 + 4;
    const top = getDesign().room.wallHeight / 12 + 2;
    const target = control.target;
    const clamped = new THREE.Vector3(
      THREE.MathUtils.clamp(target.x, -halfWidth, halfWidth),
      THREE.MathUtils.clamp(target.y, 0, top),
      THREE.MathUtils.clamp(target.z, -halfDepth, halfDepth)
    );
    if (clamped.distanceToSquared(target) < 1e-8) return;
    const shift = clamped.clone().sub(target);
    target.copy(clamped);
    control.object.position.add(shift);
  }, [getDesign]);

  useFrame((state, rawDelta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const control = controls.current;
    if (!control) return;
    const delta = Math.min(rawDelta, 1 / 20);
    const active = tween.current;
    setMotionFlag("tween", active !== null);
    if (active) {
      active.elapsed += Math.min(rawDelta, 1 / 30);
      const progress = Math.min(1, active.elapsed / active.duration);
      const k = easeInOutCubic(progress);
      control.target.lerpVectors(active.fromTarget, active.toTarget, k);
      if (active.path) {
        alongPath(active.path, active.pathLengths, k, camera.position);
      } else {
        const offset = new THREE.Spherical(
          THREE.MathUtils.lerp(active.fromOffset.radius, active.toOffset.radius, k),
          THREE.MathUtils.lerp(active.fromOffset.phi, active.toOffset.phi, k),
          THREE.MathUtils.lerp(active.fromOffset.theta, active.toOffset.theta, k)
        );
        camera.position.setFromSpherical(offset).add(control.target);
      }
      camera.fov = THREE.MathUtils.lerp(active.fromFov, active.toFov, k);
      camera.updateProjectionMatrix();
      camera.lookAt(control.target);
      control.update();
      lastTarget.current.copy(control.target);
      if (progress >= 1) tween.current = null;
      state.invalidate();
      return;
    }

    lastTarget.current.copy(control.target);
    const current = getStudioCameraMode();
    if (!isInteriorMode(current) || !control.enabled) {
      setMotionFlag("walk", false);
      return;
    }
    const room = latest.current.footprint;
    const rig = look.current;
    const { base, forward, flat, right, move, pivot, offset, spherical } = scratch;

    if (!rig.synced) {
      forward.subVectors(control.target, camera.position);
      const distance = forward.length();
      if (distance < 1e-4) camera.getWorldDirection(forward);
      forward.normalize();
      rig.yaw = rig.goalYaw = Math.atan2(-forward.x, -forward.z);
      rig.pitch = rig.goalPitch = clampPitch(Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1)));
      rig.pivotDistance = Math.max(MIN_PIVOT_DISTANCE, distance || DEFAULT_PIVOT_DISTANCE);
      rig.eyeGoal = clampHeight(room, camera.position.y);
      rig.bobOffset = 0;
      rig.synced = true;
    }

    let busy = false;
    /* The showcase spin keeps rendering but isn't user motion: AO stays on for it. */
    let spinning = false;
    const radiansPerPixel = THREE.MathUtils.degToRad(camera.fov) / Math.max(1, state.size.height);

    const lookDrag = motion.takeLook();
    if (lookDrag.x || lookDrag.y) {
      rig.goalYaw += lookDrag.x * radiansPerPixel;
      rig.goalPitch = clampPitch(rig.goalPitch + lookDrag.y * radiansPerPixel);
    }
    const turn = motion.takeTurn();
    if (turn.yaw || turn.pitch) {
      rig.goalYaw += turn.yaw;
      rig.goalPitch = clampPitch(rig.goalPitch + turn.pitch);
      busy = true;
    }

    base.copy(camera.position);
    base.y -= rig.bobOffset;

    const orbitDrag = motion.takeOrbit();
    if (orbitDrag.x || orbitDrag.y) {
      forwardFrom(rig.yaw, rig.pitch, forward);
      pivot.copy(base).addScaledVector(forward, rig.pivotDistance);
      clampPivot(room, pivot);
      spherical.setFromVector3(offset.subVectors(base, pivot));
      spherical.theta -= orbitDrag.x * radiansPerPixel * ORBIT_GAIN;
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi - orbitDrag.y * radiansPerPixel * ORBIT_GAIN,
        0.12,
        Math.PI - 0.12
      );
      base.copy(pivot).add(offset.setFromSpherical(spherical));
      clampEye(room, base);
      forward.subVectors(pivot, base);
      rig.pivotDistance = Math.max(MIN_PIVOT_DISTANCE, forward.length());
      forward.normalize();
      rig.yaw = rig.goalYaw = Math.atan2(-forward.x, -forward.z);
      rig.pitch = rig.goalPitch = clampPitch(Math.asin(forward.y));
      rig.eyeGoal = base.y;
      busy = true;
    }

    if (latest.current.autoRotate) {
      forwardFrom(rig.yaw, rig.pitch, forward);
      pivot.copy(base).addScaledVector(forward, rig.pivotDistance);
      offset.subVectors(base, pivot).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -SHOWCASE_SPIN * delta);
      base.copy(pivot).add(offset);
      rig.yaw -= SHOWCASE_SPIN * delta;
      rig.goalYaw -= SHOWCASE_SPIN * delta;
      spinning = true;
    }

    const damping = 1 - Math.exp(-delta * (isStudioPointerLocked() ? POINTER_LOOK_RATE : 16));
    const yawGap = rig.goalYaw - rig.yaw;
    const pitchGap = rig.goalPitch - rig.pitch;
    if (Math.abs(yawGap) > 1e-5 || Math.abs(pitchGap) > 1e-5) {
      rig.yaw += yawGap * damping;
      rig.pitch += pitchGap * damping;
      busy = true;
    } else {
      rig.yaw = rig.goalYaw;
      rig.pitch = rig.goalPitch;
    }

    flat.set(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw));
    right.set(Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
    move.set(0, 0, 0);
    const { ahead, side, rise, run } = motion.intent();
    if (ahead || side) {
      move.addScaledVector(flat, ahead).addScaledVector(right, side);
      move.setLength((run ? RUN_SPEED : WALK_SPEED) * delta);
    }
    const touchWalk = motion.takeWalk();
    move.addScaledVector(flat, touchWalk.ahead).addScaledVector(right, touchWalk.side);
    const dolly = motion.takeDolly(delta);
    if (dolly) {
      move.addScaledVector(flat, dolly);
      if (current !== "walk") {
        rig.pivotDistance = THREE.MathUtils.clamp(
          rig.pivotDistance - dolly,
          MIN_PIVOT_DISTANCE,
          Math.max(MIN_PIVOT_DISTANCE, room.diagonal)
        );
      }
    }
    const stride = move.length();
    if (stride > 0) {
      base.add(move);
      busy = true;
    }

    if (rise) {
      rig.eyeGoal = clampHeight(room, rig.eyeGoal + rise * RISE_SPEED * delta);
      rig.lyingBack = false;
      busy = true;
    }
    rig.eyeGoal = clampHeight(room, rig.eyeGoal);
    const eyeGap = rig.eyeGoal - base.y;
    if (Math.abs(eyeGap) > 1e-3) {
      base.y += eyeGap * (1 - Math.exp(-delta * 10));
      busy = true;
    } else {
      base.y = rig.eyeGoal;
    }
    clampEye(room, base);

    let bob = 0;
    if (current === "walk" && getStudioHeadBob() && stride > 0) {
      rig.bobPhase += stride * 2.4;
      bob = Math.sin(rig.bobPhase) * 0.05;
    } else if (Math.abs(rig.bobOffset) > 1e-3) {
      bob = rig.bobOffset * (1 - damping);
      busy = true;
    }
    rig.bobOffset = bob;

    forwardFrom(rig.yaw, rig.pitch, forward);
    camera.position.set(base.x, base.y + bob, base.z);
    control.target.copy(camera.position).addScaledVector(forward, rig.pivotDistance);
    camera.lookAt(control.target);
    publishCameraRigState(base.y, maxEyeHeight(room), rig.pitch > 0.6, rig.lyingBack);

    const moving = busy || Boolean(ahead || side || rise || dolly);
    setMotionFlag("walk", moving);
    if (moving || spinning) state.invalidate();
  });

  const endOrbit = useCallback(() => {
    orbitCoast.current = 0;
    setMotionFlag("orbit", false);
  }, [setMotionFlag]);

  /* Stable so drei's OrbitControls doesn't re-bind its listeners on re-render. */
  const handleOrbitStart = useCallback(() => {
    window.clearTimeout(orbitCoast.current);
    orbitCoast.current = 0;
    setMotionFlag("orbit", true);
    markUserMoved();
    if (latest.current.autoRotate) updateSettings?.({ autoRotate: false });
  }, [markUserMoved, setMotionFlag, updateSettings]);
  const handleOrbitEnd = useCallback(() => {
    window.clearTimeout(orbitCoast.current);
    orbitCoast.current = window.setTimeout(endOrbit, ORBIT_COAST_MS);
  }, [endOrbit]);
  const handleOrbitChange = useCallback(() => {
    constrainExterior();
    /* Still coasting from damping: keep motion on until it settles. */
    if (orbitCoast.current) {
      window.clearTimeout(orbitCoast.current);
      orbitCoast.current = window.setTimeout(endOrbit, ORBIT_COAST_MS);
    }
  }, [constrainExterior, endOrbit]);

  const exterior = !interior;
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.085}
      enableRotate={exterior}
      enablePan={exterior}
      enableZoom={exterior}
      screenSpacePanning={false}
      zoomToCursor
      panSpeed={0.9}
      rotateSpeed={0.62}
      zoomSpeed={0.85}
      minDistance={exterior ? range.minDistance : 0.01}
      maxDistance={exterior ? range.maxDistance : Infinity}
      minPolarAngle={0}
      maxPolarAngle={exterior ? Math.PI / 2 - 0.015 : Math.PI}
      autoRotate={autoRotate && exterior}
      autoRotateSpeed={-0.55}
      onStart={handleOrbitStart}
      onEnd={handleOrbitEnd}
      onChange={handleOrbitChange}
    />
  );
});

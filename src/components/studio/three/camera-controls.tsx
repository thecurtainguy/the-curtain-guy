"use client";

import type { StudioDesignJson } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  DEFAULT_STUDIO_EDITOR_SETTINGS,
  useOptionalStudioEditor,
  type StudioCanvasCommand,
} from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import {
  cameraModeFromView,
  getStudioCameraMode,
  getStudioHeadBob,
  isInteriorMode,
  publishCameraRigState,
  setStudioCameraMode,
  setStudioCameraMounted,
  subscribeCameraRig,
  useStudioCameraMode,
  type StudioCameraMode,
} from "./camera/camera-view-store";
import {
  DEFAULT_PIVOT_DISTANCE,
  MAX_PITCH_DOWN,
  MAX_PITCH_UP,
  WALK_FOV,
  clampEye,
  clampHeight,
  clampPivot,
  getInteriorCeilingPose,
  getInteriorCornerPose,
  getInteriorGuestPose,
  getInteriorShowcasePose,
  getInteriorStagePose,
  getWalkPose,
  interiorFov,
  maxEyeHeight,
} from "./camera/interior-poses";
import {
  clampToFootprint,
  createRoomFootprint,
  isInsideFootprint,
  planInteriorPath,
  type RoomFootprint,
} from "./camera/room-footprint";
import { useInteriorInput } from "./camera/use-interior-input";
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

type ControlsImpl = React.ComponentRef<typeof OrbitControls>;

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

function hasFlag(object: THREE.Object3D | null, flag: string) {
  for (let node = object; node; node = node.parent) {
    if (node.userData?.[flag]) return true;
  }
  return false;
}

function isSolidHit(object: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  const material = (object as THREE.Mesh).material as
    | THREE.Material
    | THREE.Material[]
    | undefined;
  if (!material) return false;
  const list = Array.isArray(material) ? material : [material];
  return list.some((entry) => entry.visible && !(entry.transparent && entry.opacity < 0.6));
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
  const editor = useOptionalStudioEditor();
  const command = editor?.canvasCommand ?? null;
  const autoRotate = editor?.settings.autoRotate ?? false;
  const layers = editor?.settings.layers ?? DEFAULT_STUDIO_EDITOR_SETTINGS.layers;
  const updateSettings = editor?.updateSettings;
  const selection: StudioSelection = editor?.selection ?? null;
  const selectedIds = editor?.selectedIds;
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
  });
  const handledNonce = useRef(command?.nonce ?? 0);
  const wallHeight = design.room.wallHeight;
  const range = useMemo(
    () => getCameraRange(bounds, wallHeight),
    [bounds, wallHeight]
  );
  const floor = design.room.floor;
  const footprint = useMemo(
    () => createRoomFootprint(floor, wallHeight, bounds),
    [bounds, floor, wallHeight]
  );

  const latest = useRef({
    design,
    bounds,
    footprint,
    layers,
    selection,
    selectedIds: selectedIds ?? [],
    autoRotate,
  });
  useLayoutEffect(() => {
    latest.current = {
      design,
      bounds,
      footprint,
      layers,
      selection,
      selectedIds: selectedIds ?? [],
      autoRotate,
    };
  }, [autoRotate, bounds, design, footprint, layers, selectedIds, selection]);

  useEffect(() => {
    setStudioCameraMounted(true);
    return () => setStudioCameraMounted(false);
  }, []);

  useEffect(() => {
    const camera = getCamera();
    camera.near = 0.1;
    camera.far = range.far;
    camera.updateProjectionMatrix();
    invalidate();
  }, [getCamera, invalidate, range.far]);

  const moveTo = useCallback(
    (pose: StudioCameraPose, duration = TWEEN_SECONDS) => {
      const control = controls.current;
      if (!control) return;
      const camera = getCamera();
      look.current.synced = false;
      look.current.bobOffset = 0;
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
      const ctx = () => latest.current;
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
        case "ceiling":
          return (a) => {
            const c = ctx();
            return getInteriorCeilingPose(c.design, c.bounds, c.footprint, c.layers, a);
          };
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
          return (a) => getTopPose(ctx().bounds, ctx().design.room.wallHeight, a);
        case "dollhouse":
          return (a) => getHeroPose(ctx().bounds, ctx().design.room.wallHeight, a);
      }
    },
    [currentPose]
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

  /* Eye-height and look-up requests from the walk HUD. */
  useEffect(
    () =>
      subscribeCameraRig((request) => {
        const state = look.current;
        const room = latest.current.footprint;
        if (request.type === "eye") state.eyeGoal = clampHeight(room, request.feet);
        else if (request.type === "eye_step") {
          state.eyeGoal = clampHeight(room, state.eyeGoal + request.feet);
        } else state.goalPitch = request.up ? LOOK_UP_PITCH : 0;
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
          const height = latest.current.design.room.wallHeight;
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
          const { design: d, bounds: b, selectedIds: ids, selection: s } = latest.current;
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

  /* Initial guest framing, then a gentle refit whenever the room is resized. */
  const roomKey = `${Math.round(bounds.width)}x${Math.round(bounds.depth)}x${Math.round(wallHeight)}`;
  const framedRoomKey = useRef<string | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const control = controls.current;
      if (!control) return;
      const camera = getCamera();
      const aspect = camera.aspect || 1;
      if (framedRoomKey.current === null) {
        framing.current = presetFor(getStudioCameraMode());
        moveTo(framing.current(aspect), 0);
      } else if (framedRoomKey.current !== roomKey) {
        if (framing.current) {
          moveTo(framing.current(aspect), 0.8);
        } else if (isInteriorMode(getStudioCameraMode())) {
          const position = camera.position.clone();
          const shift = position.clone();
          clampEye(latest.current.footprint, position);
          shift.subVectors(position, shift);
          moveTo({ position, target: control.target.clone().add(shift), fov: camera.fov }, 0.6);
        } else {
          const { bounds: b, design: d } = latest.current;
          moveTo(getFitPose(b, d.room.wallHeight, aspect, camera, control.target), 0.8);
        }
      }
      framedRoomKey.current = roomKey;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [getCamera, moveTo, presetFor, roomKey]);

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
    const { bounds: b, design: d } = latest.current;
    const halfWidth = b.width / 24 + 4;
    const halfDepth = b.depth / 24 + 4;
    const top = d.room.wallHeight / 12 + 2;
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
  }, []);

  useFrame((state, rawDelta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const control = controls.current;
    if (!control) return;
    const delta = Math.min(rawDelta, 1 / 20);
    const active = tween.current;
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
      if (progress >= 1) tween.current = null;
      state.invalidate();
      return;
    }

    const current = getStudioCameraMode();
    if (!isInteriorMode(current) || !control.enabled) return;
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
    const radiansPerPixel = THREE.MathUtils.degToRad(camera.fov) / Math.max(1, state.size.height);

    const lookDrag = motion.takeLook();
    if (lookDrag.x || lookDrag.y) {
      rig.goalYaw += lookDrag.x * radiansPerPixel;
      rig.goalPitch = clampPitch(rig.goalPitch + lookDrag.y * radiansPerPixel);
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
      busy = true;
    }

    const damping = 1 - Math.exp(-delta * 16);
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
    publishCameraRigState(base.y, maxEyeHeight(room), rig.pitch > 0.6);

    if (busy || ahead || side || rise || dolly) state.invalidate();
  });

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
      onStart={() => {
        markUserMoved();
        if (latest.current.autoRotate) updateSettings?.({ autoRotate: false });
      }}
      onChange={constrainExterior}
    />
  );
}

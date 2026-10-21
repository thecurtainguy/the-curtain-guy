/**
 * In-room camera presets: the guest's eye-level view of the focal point, the
 * reverse view from the stage, a high corner and the interior showcase orbit.
 * Inputs are design inches; poses are world feet.
 */
import type { StudioDesignJson, StudioObject } from "@/data/studio";
import {
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import * as THREE from "three";
import type { StudioEditorSettings } from "../../editor/studio-editor-context";
import type { StudioCameraPose } from "../engine-camera";
import { getInteriorSign, getWallInteriorNormal } from "../engine-light-rig";
import {
  clampToFootprint,
  rayToWall,
  type FootPoint,
  type RoomFootprint,
} from "./room-footprint";

const SCALE = 1 / 12;

/** 5'6" standing eye height. */
export const EYE_HEIGHT = 5.5;
export const AIM_HEIGHT = 4.5;
export const INTERIOR_FOV = 50;
export const WALK_FOV = 56;
export const CEILING_FOV = 65;
/** Seated child / low eye height, feet. */
export const MIN_CAMERA_HEIGHT = 2.5;
/** Eye stays this far below the ceiling plane so the 14″ tray soffit never clips. */
export const CEILING_CLEARANCE = 1.5;
/** Free-look pitch limits, radians. */
export const MAX_PITCH_UP = THREE.MathUtils.degToRad(85);
export const MAX_PITCH_DOWN = THREE.MathUtils.degToRad(-80);
/** Default distance to the look pivot (what right-drag orbits around), feet. */
export const DEFAULT_PIVOT_DISTANCE = 8;

type Layers = StudioEditorSettings["layers"];

export type FocalPoint = {
  point: FootPoint;
  /** Unit plan direction from the focal point toward the audience. */
  facing: FootPoint;
  /** Top of the focal surface (a stage deck), feet. */
  floorLift: number;
};

function toFeet(point: { x: number; z: number }, bounds: StudioBounds): FootPoint {
  return {
    x: (point.x - bounds.centerX) * SCALE,
    z: (point.z - bounds.centerZ) * SCALE,
  };
}

function normalize(vector: FootPoint, fallback: FootPoint = { x: 0, z: 1 }): FootPoint {
  const length = Math.hypot(vector.x, vector.z);
  return length > 1e-6 ? { x: vector.x / length, z: vector.z / length } : fallback;
}

function objectFocal(
  object: StudioObject,
  bounds: StudioBounds,
  footprint: RoomFootprint
): FocalPoint {
  const point = toFeet(object, bounds);
  const toCenter = {
    x: footprint.centroid.x - point.x,
    z: footprint.centroid.z - point.z,
  };
  const angle = (-object.rotation * Math.PI) / 180;
  const facing =
    Math.hypot(toCenter.x, toCenter.z) > 2
      ? normalize(toCenter)
      : { x: Math.sin(angle), z: Math.cos(angle) };
  const floorLift =
    object.type === "stage"
      ? Math.max(0, ((object.elevation ?? 0) + object.height) * SCALE)
      : 0;
  return { point, facing, floorLift };
}

function wallFocal(
  wall: StudioWallSegment,
  offset: number,
  sign: 1 | -1,
  bounds: StudioBounds
): FocalPoint {
  const facing = getWallInteriorNormal(wall, sign);
  const base = toFeet(getPointAlongWall(wall, offset), bounds);
  return {
    point: { x: base.x + facing.x * 1.2, z: base.z + facing.z * 1.2 },
    facing,
    floorLift: 0,
  };
}

/**
 * The room's centre of attention: a stage, then a backdrop / arch /
 * sweetheart / head table, then the most-draped wall, else the far wall.
 */
export function getFocalPoint(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers
): FocalPoint {
  const floor = design.room.floor;
  const walls = getWallSegments(floor);
  const sign = getInteriorSign(floor);
  const objects = layers.objects ? design.objects.filter((item) => !item.hidden) : [];
  const treatments = layers.treatments
    ? design.treatments.filter((item) => !item.hidden)
    : [];

  const stage = objects.find((item) => item.type === "stage");
  if (stage) return objectFocal(stage, bounds, footprint);

  const backdrop = objects.find((item) => item.type === "drape_backdrop");
  if (backdrop) return objectFocal(backdrop, bounds, footprint);

  const arch = treatments.find(
    (item) => item.type === "ceremony_arch" || item.type === "full_pleated_backdrop"
  );
  const archWall = arch ? walls[arch.anchor.wallIndex] : undefined;
  if (arch && archWall) {
    return wallFocal(
      archWall,
      (arch.anchor.startOffset + arch.anchor.endOffset) / 2,
      sign,
      bounds
    );
  }

  const table =
    objects.find((item) => item.type === "sweetheart_table") ??
    objects.find((item) => item.type === "head_table");
  if (table) return objectFocal(table, bounds, footprint);

  const coverage = new Map<number, { length: number; moment: number }>();
  const addSpan = (wallIndex: number, start: number, end: number) => {
    const entry = coverage.get(wallIndex) ?? { length: 0, moment: 0 };
    const length = Math.max(0, end - start);
    entry.length += length;
    entry.moment += length * ((start + end) / 2);
    coverage.set(wallIndex, entry);
  };
  if (layers.drapes) {
    for (const run of design.drapeRuns) {
      if (!run.hidden) addSpan(run.wallIndex, run.startOffset, run.endOffset);
    }
  }
  for (const item of treatments) {
    addSpan(item.anchor.wallIndex, item.anchor.startOffset, item.anchor.endOffset);
  }
  let bestWall: StudioWallSegment | null = null;
  let bestCoverage = 0;
  let bestOffset = 0;
  coverage.forEach((entry, wallIndex) => {
    const wall = walls[wallIndex];
    if (!wall || entry.length <= bestCoverage) return;
    bestWall = wall;
    bestCoverage = entry.length;
    bestOffset = entry.moment / entry.length;
  });
  if (bestWall) return wallFocal(bestWall, bestOffset, sign, bounds);

  const entrance = design.openings.find(
    (opening) => !opening.hidden && opening.type !== "window"
  );
  const entranceWall = entrance ? walls[entrance.wallIndex] : undefined;
  if (entrance && entranceWall) {
    const origin = toFeet(
      getPointAlongWall(entranceWall, entrance.offset + entrance.width / 2),
      bounds
    );
    const across = normalize({
      x: footprint.centroid.x - origin.x,
      z: footprint.centroid.z - origin.z,
    });
    const reach = rayToWall(footprint, origin, across);
    if (Number.isFinite(reach)) {
      const hit = { x: origin.x + across.x * reach, z: origin.z + across.z * reach };
      return {
        point: { x: hit.x - across.x * 1.2, z: hit.z - across.z * 1.2 },
        facing: { x: -across.x, z: -across.z },
        floorLift: 0,
      };
    }
  }

  const longest = [...walls].sort((a, b) => b.length - a.length)[0];
  if (longest) return wallFocal(longest, longest.length / 2, sign, bounds);
  return { point: { ...footprint.centroid }, facing: { x: 0, z: 1 }, floorLift: 0 };
}

const MIN_INTERIOR_HFOV_DEG = 70;

/**
 * Widens the lens for narrow viewports (portrait, split view, open rails)
 * instead of backing through walls, keeping a room-photography horizontal
 * field of at least MIN_INTERIOR_HFOV_DEG.
 */
export function interiorFov(baseFov: number, aspect: number) {
  if (!(aspect > 0)) return baseFov;
  let fov = baseFov;
  if (aspect < 1.35) {
    const k = Math.min(1.9, (1.35 / aspect) ** 0.8);
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * k);
    fov = THREE.MathUtils.radToDeg(half * 2);
  }
  const minHalf = Math.atan(
    Math.tan(THREE.MathUtils.degToRad(MIN_INTERIOR_HFOV_DEG) / 2) / aspect
  );
  return Math.min(88, Math.max(fov, THREE.MathUtils.radToDeg(minHalf * 2)));
}

function vec(point: FootPoint, y: number) {
  return new THREE.Vector3(point.x, y, point.z);
}

export function maxEyeHeight(footprint: RoomFootprint) {
  return Math.max(MIN_CAMERA_HEIGHT, footprint.height - CEILING_CLEARANCE);
}

export function clampHeight(footprint: RoomFootprint, y: number) {
  return Math.min(Math.max(y, MIN_CAMERA_HEIGHT), maxEyeHeight(footprint));
}

/** Where a guest stands: near the entrance facing the focal point, else just in from the opposite wall. */
function guestStandpoint(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  focal: FocalPoint
): FootPoint {
  const reach = rayToWall(footprint, focal.point, focal.facing);
  const depth = Number.isFinite(reach) ? reach : footprint.diagonal * 0.5;
  const opposite = {
    x: focal.point.x + focal.facing.x * depth * 0.93,
    z: focal.point.z + focal.facing.z * depth * 0.93,
  };

  const walls = getWallSegments(design.room.floor);
  const sign = getInteriorSign(design.room.floor);
  let best: { point: FootPoint; score: number } | null = null;
  for (const opening of design.openings) {
    if (opening.hidden || opening.type === "window") continue;
    const wall = walls[opening.wallIndex];
    if (!wall) continue;
    const normal = getWallInteriorNormal(wall, sign);
    const door = toFeet(getPointAlongWall(wall, opening.offset + opening.width / 2), bounds);
    const toFocal = { x: focal.point.x - door.x, z: focal.point.z - door.z };
    const distance = Math.hypot(toFocal.x, toFocal.z);
    if (distance < 6) continue;
    const facingFocal = (normal.x * toFocal.x + normal.z * toFocal.z) / distance;
    if (facingFocal < 0.35) continue;
    const step = Math.max(footprint.margin + 2, distance * 0.15);
    const dir = normalize(toFocal);
    const point = { x: door.x + dir.x * step, z: door.z + dir.z * step };
    const score = Math.hypot(point.x - opposite.x, point.z - opposite.z);
    if (!best || score < best.score) best = { point, score };
  }
  if (best && best.score < depth * 0.6) return best.point;
  return opposite;
}

export function getInteriorGuestPose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers,
  aspect: number
): StudioCameraPose {
  const focal = getFocalPoint(design, bounds, footprint, layers);
  const spot = guestStandpoint(design, bounds, footprint, focal);
  const stand = clampToFootprint(footprint, spot.x, spot.z);
  const target = clampToFootprint(footprint, focal.point.x, focal.point.z, 0.5);
  return {
    position: vec(stand, clampHeight(footprint, EYE_HEIGHT)),
    target: vec(target, AIM_HEIGHT + focal.floorLift * 0.5),
    fov: interiorFov(INTERIOR_FOV, aspect),
  };
}

/** The reverse shot: standing at the focal point, looking back over the room. */
export function getInteriorStagePose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers,
  aspect: number
): StudioCameraPose {
  const focal = getFocalPoint(design, bounds, footprint, layers);
  const stand = clampToFootprint(
    footprint,
    focal.point.x + focal.facing.x * 0.6,
    focal.point.z + focal.facing.z * 0.6
  );
  const reach = rayToWall(footprint, stand, focal.facing);
  const depth = Number.isFinite(reach) ? reach : footprint.diagonal * 0.5;
  const look = clampToFootprint(
    footprint,
    stand.x + focal.facing.x * depth * 0.72,
    stand.z + focal.facing.z * depth * 0.72,
    0.5
  );
  return {
    position: vec(stand, clampHeight(footprint, EYE_HEIGHT + focal.floorLift)),
    target: vec(look, 3.6),
    fov: interiorFov(INTERIOR_FOV + 4, aspect),
  };
}

/** A high corner shot (8–9 ft) looking diagonally across toward the focal point. */
export function getInteriorCornerPose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers,
  aspect: number
): StudioCameraPose {
  const focal = getFocalPoint(design, bounds, footprint, layers);
  const { points, sign } = footprint;
  let corner: FootPoint | null = null;
  let bestDistance = -Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const prev = points[(index + points.length - 1) % points.length];
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const cross =
      (point.x - prev.x) * (next.z - point.z) - (point.z - prev.z) * (next.x - point.x);
    if (cross * sign <= 0) continue;
    const distance = Math.hypot(point.x - focal.point.x, point.z - focal.point.z);
    if (distance > bestDistance) {
      bestDistance = distance;
      corner = point;
    }
  }
  const anchor = corner ?? footprint.centroid;
  const inward = normalize({
    x: footprint.centroid.x - anchor.x,
    z: footprint.centroid.z - anchor.z,
  });
  const stand = clampToFootprint(
    footprint,
    anchor.x + inward.x * footprint.margin * 2,
    anchor.z + inward.z * footprint.margin * 2
  );
  const look = {
    x: THREE.MathUtils.lerp(footprint.centroid.x, focal.point.x, 0.55),
    z: THREE.MathUtils.lerp(footprint.centroid.z, focal.point.z, 0.55),
  };
  return {
    position: vec(stand, clampHeight(footprint, Math.min(8.6, footprint.height - 0.7))),
    target: vec(clampToFootprint(footprint, look.x, look.z, 0.5), 3),
    fov: interiorFov(INTERIOR_FOV + 2, aspect),
  };
}

/** Eye-level ring around the room centre; the controls' auto-rotate drives it. */
export function getInteriorShowcasePose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers,
  aspect: number
): StudioCameraPose {
  const center = clampToFootprint(footprint, footprint.centroid.x, footprint.centroid.z);
  const guest = getInteriorGuestPose(design, bounds, footprint, layers, aspect);
  const away = normalize({ x: guest.position.x - center.x, z: guest.position.z - center.z });
  const radius = Math.max(3, Math.min(footprint.diagonal * 0.22, 14));
  const stand = clampToFootprint(
    footprint,
    center.x + away.x * radius,
    center.z + away.z * radius
  );
  return {
    position: vec(stand, clampHeight(footprint, EYE_HEIGHT)),
    target: vec(center, AIM_HEIGHT - 0.4),
    fov: interiorFov(INTERIOR_FOV + 2, aspect),
  };
}

/** First-person start: keep an interior eye point if there is one, else the guest spot. */
export function getWalkPose(
  footprint: RoomFootprint,
  from: StudioCameraPose,
  fallback: StudioCameraPose,
  aspect: number
): StudioCameraPose {
  const inside = clampToFootprint(footprint, from.position.x, from.position.z);
  const movedFar =
    Math.hypot(inside.x - from.position.x, inside.z - from.position.z) > 1 ||
    from.position.y > footprint.height;
  const base = movedFar ? fallback : from;
  const stand = movedFar
    ? { x: fallback.position.x, z: fallback.position.z }
    : inside;
  const look = normalize(
    { x: base.target.x - base.position.x, z: base.target.z - base.position.z },
    { x: 0, z: -1 }
  );
  const eye = movedFar ? clampHeight(footprint, EYE_HEIGHT) : clampHeight(footprint, from.position.y);
  return {
    position: vec(stand, eye),
    target: new THREE.Vector3(
      stand.x + look.x * DEFAULT_PIVOT_DISTANCE,
      eye,
      stand.z + look.z * DEFAULT_PIVOT_DISTANCE
    ),
    fov: interiorFov(WALK_FOV, aspect),
  };
}

/**
 * Near the room centre at eye height, tilted up ~58° toward the focal wall.
 * In big rooms the eye slides toward that wall until its crown line sits in
 * the lower frame, so the ceiling always reads against the drapes.
 */
export function getInteriorCeilingPose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers,
  aspect: number
): StudioCameraPose {
  const focal = getFocalPoint(design, bounds, footprint, layers);
  const center = clampToFootprint(footprint, footprint.centroid.x, footprint.centroid.z);
  const toward = normalize({ x: focal.point.x - center.x, z: focal.point.z - center.z });
  const eye = clampHeight(footprint, EYE_HEIGHT);
  const pitch = THREE.MathUtils.degToRad(58);
  const fov = interiorFov(CEILING_FOV, aspect);
  const rise = Math.max(1, footprint.height - eye);
  const reach = rise / Math.tan(pitch);
  const lowEdge = pitch - THREE.MathUtils.degToRad(fov / 2) + THREE.MathUtils.degToRad(6);
  const wantWall = rise / Math.tan(Math.max(0.2, lowEdge));
  const wallDistance = rayToWall(footprint, center, toward);
  const slide = Number.isFinite(wallDistance)
    ? Math.max(0, Math.min(wallDistance - wantWall, wallDistance - footprint.margin - 1))
    : 0;
  const stand = clampToFootprint(
    footprint,
    center.x + toward.x * slide,
    center.z + toward.z * slide
  );
  return {
    position: vec(stand, eye),
    target: new THREE.Vector3(
      stand.x + toward.x * reach,
      footprint.height,
      stand.z + toward.z * reach
    ),
    fov,
  };
}

/** Clamps the eye inside the walls (− margin) and between seated height and the ceiling clearance. */
export function clampEye(footprint: RoomFootprint, position: THREE.Vector3): boolean {
  const stand = clampToFootprint(footprint, position.x, position.z);
  const y = clampHeight(footprint, position.y);
  if (
    Math.abs(stand.x - position.x) < 1e-5 &&
    Math.abs(stand.z - position.z) < 1e-5 &&
    Math.abs(y - position.y) < 1e-5
  ) {
    return false;
  }
  position.set(stand.x, y, stand.z);
  return true;
}

/** Keeps an orbit pivot inside the room, anywhere from the floor up to the ceiling plane. */
export function clampPivot(footprint: RoomFootprint, pivot: THREE.Vector3) {
  const aim = clampToFootprint(footprint, pivot.x, pivot.z, 0.5);
  pivot.set(aim.x, Math.min(Math.max(pivot.y, 0.2), footprint.height), aim.z);
}

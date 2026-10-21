/**
 * Camera framing math for the Studio 3D view: exact box fitting for a given
 * view direction, the exterior presets (dollhouse, plan), the square-on wall
 * view and selection focus. In-room presets live in `camera/interior-poses`.
 * Inputs are design inches; poses are world feet.
 */
import type { StudioDesignJson } from "@/data/studio";
import {
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
} from "@/lib/studio-geometry";
import * as THREE from "three";
import type { StudioSelection } from "../studio-types";
import { getInteriorSign, getWallInteriorNormal } from "./engine-light-rig";

const SCALE = 1 / 12;
const UP = new THREE.Vector3(0, 1, 0);

export type StudioCameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

export function getRoomBox(bounds: StudioBounds, wallHeightInches: number) {
  const halfWidth = (bounds.width * SCALE) / 2;
  const halfDepth = (bounds.depth * SCALE) / 2;
  return new THREE.Box3(
    new THREE.Vector3(-halfWidth, 0, -halfDepth),
    new THREE.Vector3(halfWidth, wallHeightInches * SCALE, halfDepth)
  );
}

export function getCameraRange(bounds: StudioBounds, wallHeightInches: number) {
  const diagonal = Math.hypot(bounds.width, bounds.depth) * SCALE;
  const height = wallHeightInches * SCALE;
  const reach = Math.max(30, diagonal * 1.25 + height);
  return {
    minDistance: 1.5,
    maxDistance: reach * 2.6,
    far: Math.max(600, reach * 9),
  };
}

function boxCorners(box: THREE.Box3): THREE.Vector3[] {
  const { min, max } = box;
  const corners: THREE.Vector3[] = [];
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }
  return corners;
}

/**
 * Smallest camera distance from `target` along `direction` (unit, pointing
 * from target to camera) that keeps every corner of `box` in frame.
 */
export function fitDistance(
  box: THREE.Box3,
  target: THREE.Vector3,
  direction: THREE.Vector3,
  fovDegrees: number,
  aspect: number,
  margin = 1.06
): number {
  const forward = direction.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, UP);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2);
  const tanH = tanV * Math.max(0.2, aspect);
  let distance = 0;
  const relative = new THREE.Vector3();
  for (const corner of boxCorners(box)) {
    relative.subVectors(corner, target);
    const towardCamera = relative.dot(direction);
    distance = Math.max(
      distance,
      towardCamera + Math.abs(relative.dot(right)) / tanH,
      towardCamera + Math.abs(relative.dot(up)) / tanV
    );
  }
  return Math.max(1, distance * margin);
}

function directionFrom(azimuthDeg: number, elevationDeg: number) {
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation)
  ).normalize();
}

function poseAlong(
  box: THREE.Box3,
  target: THREE.Vector3,
  direction: THREE.Vector3,
  fov: number,
  aspect: number,
  scale = 1
): StudioCameraPose {
  const distance = fitDistance(box, target, direction, fov, aspect) * scale;
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    fov,
  };
}

export function getHeroPose(
  bounds: StudioBounds,
  wallHeight: number,
  aspect: number
): StudioCameraPose {
  const box = getRoomBox(bounds, wallHeight);
  const target = new THREE.Vector3(0, box.max.y * 0.22, 0);
  return poseAlong(box, target, directionFrom(38, 33), 38, aspect);
}

export function getTopPose(
  bounds: StudioBounds,
  wallHeight: number,
  aspect: number
): StudioCameraPose {
  const box = getRoomBox(bounds, wallHeight);
  const direction = new THREE.Vector3(0, 1, 0.0008).normalize();
  return poseAlong(box, new THREE.Vector3(0, 0, 0), direction, 40, aspect, 1.02);
}

/** Keeps the current viewing direction and refits the room. */
export function getFitPose(
  bounds: StudioBounds,
  wallHeight: number,
  aspect: number,
  camera: THREE.PerspectiveCamera,
  currentTarget: THREE.Vector3
): StudioCameraPose {
  const box = getRoomBox(bounds, wallHeight);
  const direction = camera.position.clone().sub(currentTarget).normalize();
  if (!Number.isFinite(direction.x) || direction.lengthSq() < 0.5) {
    return getHeroPose(bounds, wallHeight, aspect);
  }
  if (direction.y < 0.12) {
    direction.y = 0.12;
    direction.normalize();
  }
  const target = new THREE.Vector3(0, box.max.y * 0.22, 0);
  return poseAlong(box, target, direction, camera.fov, aspect);
}

/** Inches from `origin` along unit `dir` to the nearest polygon edge. */
function rayToFloorEdge(
  floor: StudioDesignJson["room"]["floor"],
  origin: { x: number; z: number },
  dir: { x: number; z: number },
  skipIndex = -1
): number {
  let nearest = Infinity;
  for (let index = 0; index < floor.length; index += 1) {
    if (index === skipIndex) continue;
    const p = floor[index];
    const q = floor[(index + 1) % floor.length];
    const sx = q.x - p.x;
    const sz = q.z - p.z;
    const denom = dir.x * sz - dir.z * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const ox = p.x - origin.x;
    const oz = p.z - origin.z;
    const t = (ox * sz - oz * sx) / denom;
    const u = (ox * dir.z - oz * dir.x) / denom;
    if (t > 1e-3 && u >= -1e-6 && u <= 1 + 1e-6) nearest = Math.min(nearest, t);
  }
  return nearest;
}

function selectionWallIndex(
  design: StudioDesignJson,
  selection: StudioSelection
): number | null {
  if (!selection) return null;
  if (selection.kind === "wall") return selection.index;
  if (selection.kind === "drape") {
    return design.drapeRuns.find((run) => run.id === selection.id)?.wallIndex ?? null;
  }
  if (selection.kind === "treatment") {
    return (
      design.treatments.find((item) => item.id === selection.id)?.anchor
        .wallIndex ?? null
    );
  }
  if (selection.kind === "opening") {
    return (
      design.openings.find((opening) => opening.id === selection.id)
        ?.wallIndex ?? null
    );
  }
  return null;
}

/** Stands inside the room facing a wall square-on and frames it. */
export function getFrontPose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  selection: StudioSelection,
  aspect: number
): StudioCameraPose {
  const floor = design.room.floor;
  const walls = getWallSegments(floor);
  const wallHeight = design.room.wallHeight;
  const wall = walls[selectionWallIndex(design, selection) ?? 0] ?? walls[0];
  if (!wall) return getHeroPose(bounds, wallHeight, aspect);
  const normal = getWallInteriorNormal(wall, getInteriorSign(floor));
  const height = wallHeight * SCALE;
  const center = new THREE.Vector3(
    (wall.center.x - bounds.centerX) * SCALE,
    Math.min(height * 0.46, 6.5),
    (wall.center.z - bounds.centerZ) * SCALE
  );
  const halfLength = (wall.length * SCALE) / 2;
  const along = new THREE.Vector3(Math.cos(wall.angle), 0, Math.sin(wall.angle));
  const box = new THREE.Box3().setFromPoints([
    center.clone().addScaledVector(along, -halfLength).setY(0),
    center.clone().addScaledVector(along, halfLength).setY(height),
  ]);
  const direction = new THREE.Vector3(normal.x, 0.1, normal.z).normalize();
  const available =
    (rayToFloorEdge(floor, wall.center, normal, wall.index) * SCALE - 1.5) *
    Math.hypot(1, 0.1);
  let fov = 42;
  let distance = fitDistance(box, center, direction, fov, aspect, 1.04);
  while (distance > available && fov < 64) {
    fov += 4;
    distance = fitDistance(box, center, direction, fov, aspect, 1.04);
  }
  distance = Math.max(4, Math.min(distance, available));
  return {
    position: center.clone().addScaledVector(direction, distance),
    target: center,
    fov,
  };
}

/** World-space bounds of the selected items, or null when nothing framable. */
export function getSelectionBox(
  design: StudioDesignJson,
  bounds: StudioBounds,
  ids: string[],
  selection: StudioSelection
): THREE.Box3 | null {
  const walls = getWallSegments(design.room.floor);
  const sign = getInteriorSign(design.room.floor);
  const box = new THREE.Box3();
  const toWorld = (x: number, z: number) => ({
    x: (x - bounds.centerX) * SCALE,
    z: (z - bounds.centerZ) * SCALE,
  });

  const addWallSpan = (
    wallIndex: number,
    start: number,
    end: number,
    bottom: number,
    top: number
  ) => {
    const wall = walls[wallIndex];
    if (!wall) return;
    const normal = getWallInteriorNormal(wall, sign);
    for (const offset of [start, end]) {
      const point = getPointAlongWall(wall, offset);
      const world = toWorld(point.x, point.z);
      box.expandByPoint(new THREE.Vector3(world.x, bottom * SCALE, world.z));
      box.expandByPoint(
        new THREE.Vector3(world.x + normal.x * 1.2, top * SCALE, world.z + normal.z * 1.2)
      );
    }
  };

  const allIds = new Set(ids);
  if (selection && selection.kind !== "wall") allIds.add(selection.id);
  if (selection?.kind === "wall") {
    const wall = walls[selection.index];
    if (wall) addWallSpan(wall.index, 0, wall.length, 0, design.room.wallHeight);
  }

  for (const object of design.objects) {
    if (!allIds.has(object.id)) continue;
    const angle = (object.rotation * Math.PI) / 180;
    const halfX =
      Math.abs((object.width / 2) * Math.cos(angle)) +
      Math.abs((object.depth / 2) * Math.sin(angle));
    const halfZ =
      Math.abs((object.width / 2) * Math.sin(angle)) +
      Math.abs((object.depth / 2) * Math.cos(angle));
    const center = toWorld(object.x, object.z);
    const bottom = (object.elevation ?? 0) * SCALE;
    box.expandByPoint(
      new THREE.Vector3(center.x - halfX * SCALE, bottom, center.z - halfZ * SCALE)
    );
    box.expandByPoint(
      new THREE.Vector3(
        center.x + halfX * SCALE,
        bottom + Math.max(object.height, 12) * SCALE,
        center.z + halfZ * SCALE
      )
    );
  }
  for (const run of design.drapeRuns) {
    if (allIds.has(run.id)) {
      addWallSpan(run.wallIndex, run.startOffset, run.endOffset, 0, run.height);
    }
  }
  for (const treatment of design.treatments) {
    if (allIds.has(treatment.id)) {
      addWallSpan(
        treatment.anchor.wallIndex,
        treatment.anchor.startOffset,
        treatment.anchor.endOffset,
        0,
        treatment.height
      );
    }
  }
  for (const opening of design.openings) {
    if (!allIds.has(opening.id)) continue;
    const sill = opening.sillHeight ?? (opening.type === "window" ? 36 : 0);
    const openingHeight =
      opening.openingHeight ?? (opening.type === "window" ? 60 : 84);
    addWallSpan(
      opening.wallIndex,
      opening.offset,
      opening.offset + opening.width,
      sill,
      sill + openingHeight
    );
  }
  return box.isEmpty() ? null : box;
}

export function getFocusPose(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  currentTarget: THREE.Vector3,
  aspect: number
): StudioCameraPose {
  const target = box.getCenter(new THREE.Vector3());
  const direction = camera.position.clone().sub(currentTarget).normalize();
  if (!Number.isFinite(direction.x) || direction.lengthSq() < 0.5) {
    direction.copy(directionFrom(38, 33));
  }
  if (direction.y < 0.15) {
    direction.y = 0.15;
    direction.normalize();
  }
  const fov = camera.fov;
  const distance = Math.max(4, fitDistance(box, target, direction, fov, aspect, 1.35));
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    fov,
  };
}

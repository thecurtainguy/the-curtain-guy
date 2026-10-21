/**
 * Ceiling as an interaction surface, for ceiling drape tools.
 *
 * The ceiling meshes stay non-raycastable on purpose: D's proxy picking gives
 * up an event whenever an opaque non-proxy mesh sits in front of it, so a
 * raycastable ceiling would swallow clicks on ceiling drapes and chandeliers.
 * Instead this is a pure ray–plane test against y = wallHeight, clipped to the
 * floor outline. Call it from your own handler (after checking that no
 * proxy claimed the event) to get a placement point.
 *
 *   const pick = useCeilingPicker(design.room.floor, bounds, design.room.wallHeight);
 *   const hit = pick(event.clientX, event.clientY); // { x, z } in design inches, or null
 */
import type { StudioDesignJson } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useThree } from "@react-three/fiber";
import { useCallback } from "react";
import * as THREE from "three";

const SCALE = 1 / 12;

export type CeilingPoint = {
  /** Design inches, same space as `design.room.floor`. */
  x: number;
  z: number;
};

function insidePolygon(points: StudioDesignJson["room"]["floor"], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

const ceilingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
const hitPoint = new THREE.Vector3();

/**
 * Where `raycaster` meets the ceiling plane from below, inside the room
 * outline. Returns null when looking down, standing above the ceiling, or
 * pointing past the walls.
 */
export function pickCeilingPoint(
  raycaster: THREE.Raycaster,
  floor: StudioDesignJson["room"]["floor"],
  bounds: StudioBounds,
  wallHeightInches: number
): CeilingPoint | null {
  const height = wallHeightInches * SCALE;
  const { ray } = raycaster;
  if (ray.direction.y <= 1e-4 || ray.origin.y >= height) return null;
  ceilingPlane.constant = height;
  if (!ray.intersectPlane(ceilingPlane, hitPoint)) return null;
  const x = hitPoint.x / SCALE + bounds.centerX;
  const z = hitPoint.z / SCALE + bounds.centerZ;
  return insidePolygon(floor, x, z) ? { x, z } : null;
}

/**
 * Stable `(clientX, clientY) => CeilingPoint | null` bound to the live R3F
 * camera and canvas. Must render inside the Canvas.
 */
export function useCeilingPicker(
  floor: StudioDesignJson["room"]["floor"],
  bounds: StudioBounds,
  wallHeightInches: number
) {
  const getState = useThree((state) => state.get);
  return useCallback(
    (clientX: number, clientY: number) => {
      const { camera, gl } = getState();
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1
        ),
        camera
      );
      return pickCeilingPoint(raycaster, floor, bounds, wallHeightInches);
    },
    [bounds, floor, getState, wallHeightInches]
  );
}

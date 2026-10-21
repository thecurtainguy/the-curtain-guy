import type { StudioBounds } from "@/lib/studio-geometry";
import * as THREE from "three";
import { offsetPolygon, type Vec2 } from "./polygon";
import { SCALE } from "./wall-geometry";

/**
 * Horizontal band hugging a polygon outline (`width` inches; positive =
 * inward). UV v runs 0 at the outline → 1 at the far edge, u is along the
 * perimeter in feet — pair with a fade texture for occlusion / glow strips.
 */
export function buildBandGeometry(
  outline: readonly Vec2[],
  width: number,
  yFt: number,
  bounds: StudioBounds,
  facing: "up" | "down"
): THREE.BufferGeometry | null {
  if (outline.length < 3) return null;
  const inner = offsetPolygon(outline, width);
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const ny = facing === "up" ? 1 : -1;
  const w = (p: Vec2): [number, number, number] => [
    (p.x - bounds.centerX) * SCALE,
    yFt,
    (p.z - bounds.centerZ) * SCALE,
  ];
  let run = 0;
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    const quad = [w(outline[i]), w(outline[j]), w(inner[j]), w(inner[i])];
    const len = Math.hypot(outline[j].x - outline[i].x, outline[j].z - outline[i].z) * SCALE;
    const quv: [number, number][] = [
      [run, 0],
      [run + len, 0],
      [run + len, 1],
      [run, 1],
    ];
    run += len;
    const e1x = quad[1][0] - quad[0][0];
    const e1z = quad[1][2] - quad[0][2];
    const e2x = quad[2][0] - quad[0][0];
    const e2z = quad[2][2] - quad[0][2];
    const crossY = e1z * e2x - e1x * e2z;
    const order = crossY * ny >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    for (const k of order) {
      pos.push(...quad[k]);
      uv.push(...quv[k]);
      nor.push(0, ny, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

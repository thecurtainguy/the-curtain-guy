/**
 * Fabric along the outline: perimeter swag scallops with corner jabots and
 * gathered knots, and the pleated valance band that hides edge attachments.
 */
import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import { insetCeilingPolygon, type CeilingRun } from "@/lib/studio-ceiling";
import * as THREE from "three";
import {
  createJabotGeometry,
  createSwagGeometry,
  foldDepth,
  foldsPerFoot,
  qualityProfile,
} from "../../fabric/geometry";
import { rng } from "../../texture-utils";
import { SCALE } from "../frame";
import {
  createPeriodicFolds,
  dropY,
  GridSurface,
  inwardNormal,
  maxFabricY,
  signedArea,
  smoothstep,
  TAU,
  worldX,
  worldZ,
  type CeilingFrame,
} from "./surface";

/** Distance the edge fabric hangs in front of the outline, feet. */
const EDGE_STANDOFF_FT = 0.12;

/**
 * Basis with local +X along `dir` (or its reverse), +Y up and +Z pointing
 * into the room; keeps the basis right-handed for either outline winding.
 */
function wallBasis(dir: { x: number; z: number }, inward: { x: number; z: number }) {
  const cross = { x: -dir.z, z: dir.x };
  const flip = cross.x * inward.x + cross.z * inward.z < 0;
  const x = flip ? { x: -dir.x, z: -dir.z } : dir;
  return {
    flip,
    matrix: new THREE.Matrix4().makeBasis(
      new THREE.Vector3(x.x, 0, x.z),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(inward.x, 0, inward.z)
    ),
  };
}

function placeOnWall(
  geometry: THREE.BufferGeometry,
  basis: THREE.Matrix4,
  position: THREE.Vector3
) {
  const matrix = basis.clone().setPosition(position);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** Ruffled gathered knot facing local +Z (used at swag junctions). */
function createKnotGeometry(radius: number, seed: number, quality: CeilingFrame["quality"]) {
  const detail = quality === "draft" ? 12 : quality === "ultra" ? 28 : 20;
  const geometry = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.7));
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const rand = rng(seed);
  const phase = rand() * TAU;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(y, x);
    const ruffle = 1 + 0.16 * Math.sin(angle * 7 + z * 4 + phase) + 0.06 * Math.sin(angle * 13 - phase);
    position.setXYZ(i, x * radius * ruffle, y * radius * 1.15 * ruffle, z * radius * 0.55);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export type EdgePieces = {
  /** Geometry per run colour key. */
  byColor: Array<{ color: CeilingRun["color"]; geometry: THREE.BufferGeometry }>;
};

export function buildPerimeterSwags(
  drape: StudioCeilingDrape,
  runs: CeilingRun[],
  outline: StudioPoint[],
  frame: CeilingFrame,
  seed: number
): EdgePieces {
  const area = signedArea(outline);
  const byColor: EdgePieces["byColor"] = [];
  const topY = Math.min(maxFabricY(frame), dropY(frame, drape.edgeDrop));
  const dropFt = Math.max(0.2, drape.sag * SCALE);
  const knotRadius = Math.min(0.3, 0.14 + dropFt * 0.06);

  runs.forEach((run, index) => {
    const [a, b] = run.points;
    const chord = Math.hypot(b.x - a.x, b.z - a.z);
    if (chord < 6) return;
    const dir = { x: (b.x - a.x) / chord, z: (b.z - a.z) / chord };
    const inward = inwardNormal(a, b, area);
    const { matrix } = wallBasis(dir, inward);
    const mid = {
      x: worldX(frame, (a.x + b.x) / 2) + inward.x * EDGE_STANDOFF_FT,
      z: worldZ(frame, (a.z + b.z) / 2) + inward.z * EDGE_STANDOFF_FT,
    };
    const swag = createSwagGeometry({
      width: chord * SCALE,
      drop: dropFt,
      seed: seed + index * 7919,
      quality: frame.quality,
      topSag: 0.12,
      belly: Math.min(0.55, dropFt * 0.24 + 0.08),
    });
    byColor.push({
      color: run.color,
      geometry: placeOnWall(swag, matrix, new THREE.Vector3(mid.x, topY, mid.z)),
    });
    const knot = createKnotGeometry(knotRadius, seed + index * 31, frame.quality);
    byColor.push({
      color: drape.color,
      geometry: placeOnWall(
        knot,
        matrix,
        new THREE.Vector3(
          worldX(frame, a.x) + inward.x * (EDGE_STANDOFF_FT + 0.08),
          topY - knotRadius * 0.6,
          worldZ(frame, a.z) + inward.z * (EDGE_STANDOFF_FT + 0.08)
        )
      ),
    });
  });

  // Jabots either side of every real corner.
  const n = outline.length;
  const jabotLong = Math.min(6, dropFt * 2.3 + 1.1);
  for (let i = 0; i < n; i++) {
    const prev = outline[(i - 1 + n) % n];
    const corner = outline[i];
    const next = outline[(i + 1) % n];
    const inLen = Math.hypot(corner.x - prev.x, corner.z - prev.z);
    const outLen = Math.hypot(next.x - corner.x, next.z - corner.z);
    if (inLen < 24 || outLen < 24) continue;
    const dirIn = { x: (corner.x - prev.x) / inLen, z: (corner.z - prev.z) / inLen };
    const dirOut = { x: (next.x - corner.x) / outLen, z: (next.z - corner.z) / outLen };
    const turn = Math.acos(Math.max(-1, Math.min(1, dirIn.x * dirOut.x + dirIn.z * dirOut.z)));
    if (turn < 0.35) continue;
    const width = Math.min(1.4, Math.min(inLen, outLen) * SCALE * 0.18 + 0.5);
    const offset = width * 0.5 + 0.12;
    const sides: Array<{ dir: { x: number; z: number }; inward: { x: number; z: number }; along: number; towardCorner: 1 | -1 }> = [
      { dir: dirIn, inward: inwardNormal(prev, corner, area), along: -offset, towardCorner: 1 },
      { dir: dirOut, inward: inwardNormal(corner, next, area), along: offset, towardCorner: -1 },
    ];
    sides.forEach((side, k) => {
      const { flip, matrix } = wallBasis(side.dir, side.inward);
      const longSide = (flip ? -side.towardCorner : side.towardCorner) as 1 | -1;
      const jabot = createJabotGeometry({
        width,
        longLength: jabotLong,
        shortLength: jabotLong * 0.42,
        side: longSide,
        seed: seed + i * 131 + k,
        quality: frame.quality,
      });
      const standoff = EDGE_STANDOFF_FT + 0.1;
      byColor.push({
        color: drape.accentColor ?? drape.color,
        geometry: placeOnWall(
          jabot,
          matrix,
          new THREE.Vector3(
            worldX(frame, corner.x) + side.dir.x * side.along + side.inward.x * standoff,
            topY - 0.04,
            worldZ(frame, corner.z) + side.dir.z * side.along + side.inward.z * standoff
          )
        ),
      });
    });
  }
  return { byColor };
}

/** Valance band depth, inches. */
export const VALANCE_DEPTH_IN = 15;

/** Gathered, pleated valance around the outline at the edge attachment line. */
export function buildValance(
  drape: StudioCeilingDrape,
  outline: StudioPoint[],
  frame: CeilingFrame,
  seed: number
): THREE.BufferGeometry | null {
  if (outline.length < 3) return null;
  const poly = insetCeilingPolygon(outline, EDGE_STANDOFF_FT * 12);
  const area = signedArea(poly);
  const n = poly.length;
  const profile = qualityProfile(frame.quality);
  const perimeterFt = poly.reduce((total, p, i) => {
    const q = poly[(i + 1) % n];
    return total + Math.hypot(q.x - p.x, q.z - p.z) * SCALE;
  }, 0);
  const foldCount = Math.max(8, Math.round(perimeterFt * foldsPerFoot(drape.fullness) * 0.9));
  const columnsPerFoot = Math.max(
    2,
    foldsPerFoot(drape.fullness) * 0.9 * profile.columnsPerFold * 0.75 * frame.density
  );
  const depthFt = VALANCE_DEPTH_IN * SCALE;
  const rows = Math.max(6, Math.round(depthFt * profile.rowsPerFoot * 3 * frame.density));
  const normals = poly.map((p, i) => inwardNormal(p, poly[(i + 1) % n], area));

  type Column = { x: number; z: number; nx: number; nz: number; s: number };
  const columns: Column[] = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const lengthFt = Math.hypot(b.x - a.x, b.z - a.z) * SCALE;
    const count = Math.max(2, Math.round(lengthFt * columnsPerFoot));
    const normal = normals[i];
    const prev = normals[(i - 1 + n) % n];
    for (let j = 0; j < count; j++) {
      const f = j / count;
      let nx = normal.x;
      let nz = normal.z;
      if (j === 0) {
        const bx = normal.x + prev.x;
        const bz = normal.z + prev.z;
        const len = Math.hypot(bx, bz) || 1;
        nx = bx / len;
        nz = bz / len;
      }
      columns.push({
        x: worldX(frame, a.x + (b.x - a.x) * f),
        z: worldZ(frame, a.z + (b.z - a.z) * f),
        nx,
        nz,
        s: s + lengthFt * f,
      });
    }
    s += lengthFt;
  }
  columns.push({ ...columns[0], s });

  const folds = createPeriodicFolds(seed, foldCount);
  const amp = Math.min(0.22, foldDepth(drape.fullness) * 0.85);
  const topY = Math.min(maxFabricY(frame), dropY(frame, drape.edgeDrop - 1));
  const surface = new GridSurface(columns.length - 1, rows, true);
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const heading = 0.55 + 0.45 * smoothstep(0, 0.3, v);
    const y = topY - v * depthFt;
    for (const column of columns) {
      const theta = (column.s / s) * TAU;
      const fold = folds(theta, v * 3);
      const out = 0.03 + amp * heading * (0.5 + 0.5 * fold) + 0.05 * v * v;
      surface.put(
        column.x + column.nx * out,
        y + (row === rows ? 0.012 * fold : 0),
        column.z + column.nz * out,
        column.s * Math.max(1, drape.fullness),
        y
      );
    }
  }
  return surface.finish();
}

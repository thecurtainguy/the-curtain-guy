/**
 * Canopy and tent webs: one continuous surface from a small gather ring at
 * the hub out to the outline, built as a single wrapped grid so neighbouring
 * wedges share vertices (no seams). Spoke lines follow `ceilingRunDrop`;
 * between spokes the fabric sags by `sag` (canopy) or stays tensioned with
 * edge scallops (tent).
 */
import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import { catenaryBump, type CeilingLayout } from "@/lib/studio-ceiling";
import type * as THREE from "three";
import { foldDepth, qualityProfile } from "../../fabric/geometry";
import { SCALE } from "../frame";
import {
  createPeriodicFolds,
  dropY,
  GridSurface,
  maxFabricY,
  TAU,
  worldX,
  worldZ,
  type CeilingFrame,
} from "./surface";

/** Radius of the fabric gather at the hub, inches. */
export const RADIAL_GATHER_RADIUS_IN = 4;

type Column = {
  plan: StudioPoint;
  reach: number;
  theta: number;
  /** 0..1 between the bounding spokes. */
  a: number;
  /** Plan distance between the bounding spokes at the outline, feet. */
  sectorFt: number;
  arc: number;
};

function radialColumns(
  layout: CeilingLayout,
  hub: StudioPoint,
  columnsPerFoot: number
): Column[] | null {
  const perimeter = layout.perimeter;
  const m = perimeter.length;
  if (m < 3) return null;
  const angle0 = Math.atan2(perimeter[0].z - hub.z, perimeter[0].x - hub.x);
  const unwrap = (p: StudioPoint) => {
    const a = Math.atan2(p.z - hub.z, p.x - hub.x);
    return angle0 + (((a - angle0) % TAU) + TAU) % TAU;
  };
  const angles = perimeter.map(unwrap);
  const anySpoke = perimeter.some((p) => p.spoke);
  const spokes = perimeter.map((p) => (anySpoke ? p.spoke : true));

  // Bounding spoke angles for each perimeter index (unwrapped across the loop).
  const prevSpoke: number[] = new Array(m);
  const nextSpoke: number[] = new Array(m);
  for (let i = 0; i < m; i++) {
    let k = 0;
    while (k < m && !spokes[(i - k + m) % m]) k++;
    const pi = (i - k + m) % m;
    prevSpoke[i] = angles[pi] - (pi > i ? TAU : 0);
    k = 1;
    while (k <= m && !spokes[(i + k) % m]) k++;
    const ni = (i + k) % m;
    nextSpoke[i] = angles[ni] + (ni <= i ? TAU : 0);
  }

  const columns: Column[] = [];
  let arc = 0;
  for (let i = 0; i < m; i++) {
    const a = perimeter[i];
    const b = perimeter[(i + 1) % m];
    const chordFt = Math.hypot(b.x - a.x, b.z - a.z) * SCALE;
    const count = Math.max(2, Math.round(chordFt * columnsPerFoot));
    const startAngle = angles[i];
    const lo = prevSpoke[i];
    const hi = nextSpoke[i];
    for (let j = 0; j < count; j++) {
      const f = j / count;
      const plan = { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
      const raw = Math.atan2(plan.z - hub.z, plan.x - hub.x);
      let theta = startAngle + ((((raw - startAngle) % TAU) + TAU) % TAU);
      if (theta - startAngle > Math.PI) theta -= TAU;
      const span = Math.max(1e-6, hi - lo);
      const along = Math.min(1, Math.max(0, (theta - lo) / span));
      const reachIn = Math.hypot(plan.x - hub.x, plan.z - hub.z);
      columns.push({
        plan,
        reach: reachIn,
        theta,
        a: along,
        sectorFt: span * reachIn * SCALE,
        arc,
      });
      arc += chordFt / count;
    }
  }
  // Closing column repeats the first so the grid wraps.
  const first = columns[0];
  columns.push({ ...first, theta: first.theta + TAU, arc });
  return columns;
}

export function radialResolution(
  layout: CeilingLayout,
  drape: StudioCeilingDrape,
  frame: Pick<CeilingFrame, "quality" | "density">
) {
  const profile = qualityProfile(frame.quality);
  const tent = drape.type === "tent";
  const foldsPerFoot = tent ? 0.18 : 0.2 + 0.1 * Math.max(1, drape.fullness);
  const columnsPerFoot = Math.max(
    tent ? 1.2 : 1.6,
    foldsPerFoot * profile.columnsPerFold * 0.7
  ) * frame.density;
  const hub = layout.hub;
  let maxReach = 0;
  let perimeterFt = 0;
  for (let i = 0; i < layout.perimeter.length; i++) {
    const p = layout.perimeter[i];
    const q = layout.perimeter[(i + 1) % layout.perimeter.length];
    if (hub) maxReach = Math.max(maxReach, Math.hypot(p.x - hub.x, p.z - hub.z));
    perimeterFt += Math.hypot(q.x - p.x, q.z - p.z) * SCALE;
  }
  const rows = Math.max(
    14,
    Math.round(Math.min(220, maxReach * SCALE * profile.rowsPerFoot * (tent ? 0.9 : 1.15)) * frame.density)
  );
  return { columnsPerFoot, rows, foldsPerFoot, perimeterFt };
}

export function buildRadialWeb(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  frame: CeilingFrame,
  seed: number
): THREE.BufferGeometry | null {
  const hub = layout.hub;
  if (!hub) return null;
  const tent = drape.type === "tent";
  const { columnsPerFoot, rows, foldsPerFoot, perimeterFt } = radialResolution(layout, drape, frame);
  const columns = radialColumns(layout, hub, columnsPerFoot);
  if (!columns) return null;
  const folds = createPeriodicFolds(seed, Math.max(6, perimeterFt * foldsPerFoot));
  const foldCount = Math.max(6, Math.round(perimeterFt * foldsPerFoot));
  const depth = foldDepth(drape.fullness);
  const topY = maxFabricY(frame);
  const hx = worldX(frame, hub.x);
  const hz = worldZ(frame, hub.z);
  const theta0 = columns[0].theta;
  const surface = new GridSurface(columns.length - 1, rows, true);

  const spokeDrop = (r: number) =>
    drape.hubDrop + (drape.edgeDrop - drape.hubDrop) * r + drape.sag * 0.25 * catenaryBump(r);

  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (const column of columns) {
      const r0 = Math.min(0.35, RADIAL_GATHER_RADIUS_IN / Math.max(1, column.reach));
      const r = r0 + (1 - r0) * Math.pow(v, 1.25);
      const bump = catenaryBump(column.a);
      let drop = spokeDrop(r);
      drop += tent
        ? drape.sag * bump * (0.3 * r + 0.7 * Math.pow(r, 5))
        : drape.sag * bump * Math.pow(r, 1.1);
      const reachFt = r * column.reach * SCALE;
      const spacing = (TAU * Math.max(0.05, reachFt)) / foldCount;
      const fold = folds(column.theta - theta0, reachFt);
      let amp: number;
      if (tent) {
        amp = depth * (0.3 * Math.pow(r, 4) * bump + 0.35 * Math.pow(1 - r, 3));
        // Sewn seam welt along each spoke.
        const seamFt = Math.min(column.a, 1 - column.a) * column.sectorFt * r;
        drop -= 0.45 * Math.exp(-Math.pow(seamFt / 0.1, 2));
      } else {
        amp = depth * (0.55 + 1.6 * Math.pow(1 - r, 1.4)) * (0.65 + 0.35 * bump);
      }
      amp = Math.min(amp, spacing * 0.42);
      const y = dropY(frame, drop) + fold * amp;
      const px = hx + (worldX(frame, column.plan.x) - hx) * r;
      const pz = hz + (worldZ(frame, column.plan.z) - hz) * r;
      surface.put(px, Math.min(topY, y), pz, column.arc * r, reachFt);
    }
  }
  return surface.finish();
}

/** World y (feet) of the radial gather (the hub), for hub décor. */
export function radialHubY(drape: StudioCeilingDrape, frame: CeilingFrame) {
  return dropY(frame, drape.hubDrop);
}

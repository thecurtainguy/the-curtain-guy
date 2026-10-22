/**
 * Fabric panels hung along a layout run: starburst spokes, ceiling swags,
 * billows (pinched at every support), criss-cross swags and stretched bands.
 * The panel centreline follows `ceilingRunDrop` exactly; width, trough and
 * fold depth are shaped per style around it.
 */
import type { StudioCeilingDrape } from "@/data/studio";
import {
  ceilingRunDrop,
  ceilingRunPoint,
  type CeilingRun,
} from "@/lib/studio-ceiling";
import * as THREE from "three";
import { createFoldField, foldDepth, qualityProfile } from "../../fabric/geometry";
import { SCALE } from "../frame";
import {
  clamp01,
  createGatherTie,
  dropY,
  GridSurface,
  lerp,
  maxFabricY,
  placeAlong,
  smoothstep,
  TAU,
  worldX,
  worldZ,
  type CeilingFrame,
} from "./surface";

export type PanelKind = "spoke" | "swag" | "billow" | "stretch";

/** Soft longitudinal folds across a panel of this width. */
function foldsAcross(widthFt: number, fullness: number, kind: PanelKind) {
  if (kind === "stretch") return Math.max(2, Math.round(widthFt * 0.6));
  return Math.max(3, Math.round(widthFt * (0.55 + 0.3 * Math.max(1, fullness))));
}

function runLengthIn(run: CeilingRun) {
  let total = 0;
  for (let i = 1; i < run.points.length; i++) {
    total += Math.hypot(
      run.points[i].x - run.points[i - 1].x,
      run.points[i].z - run.points[i - 1].z
    );
  }
  return total;
}

export function runPanelResolution(
  run: CeilingRun,
  fullness: number,
  kind: PanelKind,
  frame: Pick<CeilingFrame, "quality" | "density">
) {
  const profile = qualityProfile(frame.quality);
  const lengthFt = runLengthIn(run) * SCALE;
  const widthFt = Math.max(0.2, run.width * SCALE);
  const folds = foldsAcross(widthFt, fullness, kind);
  const perFold = kind === "stretch" ? 4 : profile.columnsPerFold * 0.8;
  const supports = Math.max(1, run.points.length - 1);
  const rowsPerFoot = profile.rowsPerFoot * (kind === "billow" ? 1.4 : 1);
  const columns = Math.round(Math.min(180, Math.max(10, folds * perFold)) * frame.density);
  const rows = Math.round(
    Math.min(520, Math.max(16 * supports, lengthFt * rowsPerFoot)) * frame.density
  );
  return {
    columns: Math.max(8, columns),
    rows: Math.max(10 * supports, rows),
    folds,
    lengthFt,
    widthFt,
  };
}

export type RunPanelOptions = {
  drape: StudioCeilingDrape;
  run: CeilingRun;
  frame: CeilingFrame;
  kind: PanelKind;
  seed: number;
  /** Extra drop (inches) so crossing / overlapping panels never coincide. */
  offsetIn?: number;
};

export type RunPanel = {
  geometry: THREE.BufferGeometry;
  /** Gathering ties, rod pockets and similar fabric trims for this run. */
  trims: THREE.BufferGeometry[];
};

/** Distance (feet) from the nearest gathered end / support, and that span's length. */
function endDistance(kind: PanelKind, t: number, lengthFt: number, supports: number) {
  if (kind === "billow") {
    const scaledT = t * supports;
    const local = t >= 1 ? 1 : scaledT - Math.floor(scaledT);
    const span = lengthFt / supports;
    return { e: Math.min(local, 1 - local) * span, span };
  }
  return { e: Math.min(t, 1 - t) * lengthFt, span: lengthFt };
}

export function buildRunPanel({
  drape,
  run,
  frame,
  kind,
  seed,
  offsetIn = 0,
}: RunPanelOptions): RunPanel | null {
  if (run.points.length < 2) return null;
  const res = runPanelResolution(run, drape.fullness, kind, frame);
  if (res.lengthFt < 0.3) return null;
  const { columns, rows, folds, lengthFt, widthFt } = res;
  const supports = Math.max(1, run.points.length - 1);
  const start = run.points[0];
  const end = run.points[run.points.length - 1];
  const dirLen = Math.hypot(end.x - start.x, end.z - start.z) || 1;
  const dx = (end.x - start.x) / dirLen;
  const dz = (end.z - start.z) / dirLen;
  const nx = -dz;
  const nz = dx;
  const field = createFoldField(seed, folds);
  const depth = foldDepth(drape.fullness);
  const topY = maxFabricY(frame);
  const taper = run.hubTaper ?? 0.08;
  const fanCap = kind === "billow" ? 0.45 : 0.32;
  const wrinklePhase = (seed % 1000) * 0.01;
  const surface = new GridSurface(columns, rows);

  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const plan = ceilingRunPoint(run, t);
    const cx = worldX(frame, plan.x);
    const cz = worldZ(frame, plan.z);
    const cy = dropY(frame, ceilingRunDrop(drape, run, t) + offsetIn);
    const s = t * lengthFt;
    const { e, span } = endDistance(kind, t, lengthFt, supports);
    const fan = Math.max(0.6, Math.min(span * fanCap, widthFt * 0.95));
    const g = clamp01(e / fan);
    const open = 1 - Math.pow(1 - g, 2.2);

    let widthFactor: number;
    let ampFactor: number;
    let trough: number;
    switch (kind) {
      case "spoke": {
        const wall = smoothstep(0.955, 1, t);
        widthFactor = lerp(taper, 1, Math.pow(t, 0.85)) * (1 - 0.14 * wall);
        ampFactor = lerp(0.55, 1, smoothstep(0, 0.4, t)) + 0.55 * wall;
        trough = smoothstep(0, 0.3, t) * (1 - smoothstep(0.9, 1, t));
        break;
      }
      case "stretch":
        widthFactor = lerp(0.9, 1, open);
        ampFactor = 0.1 + 0.25 * (1 - open);
        trough = 0.18 * open;
        break;
      default:
        widthFactor = lerp(0.1, 1, open);
        ampFactor = 1 + 0.45 * (1 - open);
        trough = open;
        break;
    }
    const w = widthFt * widthFactor;
    const troughFt = trough * Math.min(kind === "spoke" ? 0.3 : 0.42, w * 0.075);
    const ampAbs = Math.min(depth * ampFactor, (w / folds) * 0.42);

    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const across = u * 2 - 1;
      const lateral = across * w * 0.5;
      const fold = field.main(u, s);
      let y = cy + troughFt * across * across + fold * ampAbs;
      if (kind === "stretch") {
        const reach = Math.abs(lateral);
        const wrinkle =
          Math.exp(-e / 1.3) *
          Math.sin((TAU * (reach - e * 0.75)) / 0.6 + wrinklePhase) *
          smoothstep(0.1, 0.85, Math.abs(across));
        y += wrinkle * 0.028 + 0.022 * smoothstep(0.95, 1, Math.abs(across));
      }
      surface.put(
        cx + nx * lateral,
        Math.min(topY, y),
        cz + nz * lateral,
        u * widthFt,
        s
      );
    }
  }

  const trims: THREE.BufferGeometry[] = [];
  const axis = new THREE.Vector3(dx, 0, dz);
  const across = new THREE.Vector3(nx, 0, nz);
  const tieAt = (t: number, inward: number) => {
    const plan = ceilingRunPoint(run, t);
    const pinched = widthFt * (kind === "stretch" ? 0.9 : 0.1);
    const radius = Math.min(0.32, pinched * 0.32 + 0.05);
    const length = Math.min(0.5, 0.22 + radius);
    const y = Math.min(topY - radius * 0.8, dropY(frame, ceilingRunDrop(drape, run, t) + offsetIn));
    const position = new THREE.Vector3(
      worldX(frame, plan.x) + dx * inward,
      y,
      worldZ(frame, plan.z) + dz * inward
    );
    trims.push(placeAlong(createGatherTie(radius, length, frame.quality), position, axis));
  };

  if (kind === "spoke") {
    // Rod pocket along the wall end of the panel.
    const plan = ceilingRunPoint(run, 1);
    const pocketWidth = widthFt * 0.86 + 0.08;
    const radius = 0.075;
    const y = Math.min(topY - radius, dropY(frame, ceilingRunDrop(drape, run, 1) + offsetIn));
    const pocket = createGatherTie(radius, pocketWidth, frame.quality);
    trims.push(
      placeAlong(
        pocket,
        new THREE.Vector3(worldX(frame, plan.x) - dx * 0.04, y, worldZ(frame, plan.z) - dz * 0.04),
        across
      )
    );
  } else if (kind !== "stretch") {
    for (let i = 0; i <= supports; i++) {
      const t = i / supports;
      const inward = i === 0 ? 0.12 : i === supports ? -0.12 : 0;
      tieAt(t, inward);
    }
  }

  return { geometry: surface.finish(), trims };
}

/** Rough vertex count of a run panel at density 1 (for budgeting). */
export function estimateRunVertices(
  run: CeilingRun,
  fullness: number,
  kind: PanelKind,
  quality: CeilingFrame["quality"]
) {
  const res = runPanelResolution(run, fullness, kind, { quality, density: 1 });
  return (res.columns + 1) * (res.rows + 1);
}

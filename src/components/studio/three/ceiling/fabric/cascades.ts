/**
 * Fabric cascades: a panel gathered into a small ring at the ceiling and
 * falling as a soft, flattened sleeve of folds that opens toward a slightly
 * flared, uneven hem. Each fall gets its own twist and sway.
 */
import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import * as THREE from "three";
import { foldDepth, qualityProfile } from "../../fabric/geometry";
import { rng } from "../../texture-utils";
import { SCALE } from "../frame";
import {
  createGatherTie,
  createPeriodicFolds,
  GridSurface,
  maxFabricY,
  placeAlong,
  smoothstep,
  TAU,
  worldX,
  worldZ,
  type CeilingFrame,
} from "./surface";

export function cascadeResolution(
  drape: StudioCeilingDrape,
  frame: Pick<CeilingFrame, "quality" | "density">
) {
  const profile = qualityProfile(frame.quality);
  const widthFt = Math.max(0.5, drape.panelWidth * SCALE);
  const lengthFt = Math.max(0.5, drape.sag * SCALE);
  const folds = Math.max(7, Math.round(widthFt * (2.4 + 0.6 * Math.max(1, drape.fullness))));
  const columns = Math.max(24, Math.round(Math.min(220, folds * profile.columnsPerFold) * frame.density));
  const rows = Math.max(12, Math.round(Math.min(200, lengthFt * profile.rowsPerFoot * 1.4) * frame.density));
  return { widthFt, lengthFt, folds, columns, rows };
}

export function buildCascade(
  drape: StudioCeilingDrape,
  point: StudioPoint,
  frame: CeilingFrame,
  seed: number
): THREE.BufferGeometry[] {
  const { widthFt, lengthFt, folds, columns, rows } = cascadeResolution(drape, frame);
  const rand = rng(seed);
  const field = createPeriodicFolds(seed, folds);
  const twist = (rand() - 0.5) * 1.3;
  const baseAngle = rand() * Math.PI;
  const swayX = (rand() - 0.5) * 0.2;
  const swayZ = (rand() - 0.5) * 0.2;
  const hemPhase = rand() * TAU;
  const lobePhase = rand() * TAU;
  const aspect = 0.38 + rand() * 0.14;
  const depth = foldDepth(drape.fullness);
  const topY = maxFabricY(frame);
  const cx = worldX(frame, point.x);
  const cz = worldZ(frame, point.z);
  const ringRadius = Math.min(0.14, 0.07 + widthFt * 0.015);
  // A gathered panel hangs as a narrow column of folds, not a bell.
  const hangRadius = Math.max(ringRadius * 1.6, widthFt * 0.2);
  const surface = new GridSurface(columns, rows, true);

  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    // Near-linear fan from the ring; an eased flare gives the fall round "shoulders".
    const open = smoothstep(0, 1, Math.min(1, v / 0.75)) * 0.35 + Math.min(1, v / 0.75) * 0.65;
    const radius =
      ringRadius + (hangRadius - ringRadius) * open * (1 + 0.1 * v + 0.1 * smoothstep(0.85, 1, v));
    const angleOffset = baseAngle + twist * v;
    const sway = v * v;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const theta = u * TAU;
      const fold = field(theta, v * lengthFt);
      const spacing = (TAU * radius) / folds;
      const amp = Math.min(depth * (1.1 + 0.5 * (1 - open)), spacing * 0.45);
      // Uneven bunching so the fall never reads as a tube.
      const lobes = 1 + 0.18 * Math.sin(2 * theta + lobePhase + v * 1.5) + 0.08 * Math.sin(3 * theta - lobePhase);
      const r = radius * lobes + fold * amp;
      const a = theta + angleOffset;
      const hem =
        (0.07 * (Math.sin(2 * theta + hemPhase) + 0.5 * Math.sin(5 * theta - hemPhase)) +
          0.015 * fold) *
        v ** 4;
      surface.put(
        cx + Math.cos(a) * r + swayX * sway,
        topY - 0.06 - v * lengthFt * (1 - hem),
        cz + Math.sin(a) * r * aspect + swayZ * sway,
        u * widthFt * Math.max(1, drape.fullness),
        -v * lengthFt
      );
    }
  }

  const ring = placeAlong(
    createGatherTie(ringRadius + 0.05, 0.22, frame.quality),
    new THREE.Vector3(cx, topY - 0.14, cz),
    new THREE.Vector3(0, 1, 0)
  );
  return [surface.finish(), ring];
}

export function estimateCascadeVertices(
  drape: StudioCeilingDrape,
  quality: CeilingFrame["quality"]
) {
  const res = cascadeResolution(drape, { quality, density: 1 });
  return (res.columns + 1) * (res.rows + 1);
}

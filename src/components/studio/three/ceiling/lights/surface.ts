/**
 * Approximate fabric underside of a ceiling design: plan inches → drop
 * (inches below the ceiling). Runs follow `ceilingRunDrop` exactly; canopy /
 * tent wedges interpolate between their spokes and swag by `sag` across the
 * wedge, deepening toward the walls. Lights and washes sit on this so they
 * hug the fabric instead of floating.
 */
import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import {
  catenaryBump,
  ceilingRunDrop,
  type CeilingLayout,
  type CeilingRun,
} from "@/lib/studio-ceiling";
import { CEILING_FLUSH_CLEARANCE_IN } from "../frame";

const TAU = Math.PI * 2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Flush fabric still hangs a hair below the ceiling. */
export function fabricDrop(drop: number) {
  return Math.max(CEILING_FLUSH_CLEARANCE_IN, drop);
}

/** Distance from (ox, oz) along unit (dx, dz) to the first outline edge, or null. */
export function rayToOutline(
  outline: readonly StudioPoint[],
  ox: number,
  oz: number,
  dx: number,
  dz: number
): number | null {
  let best = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const denom = dx * ez - dz * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = a.x - ox;
    const az = a.z - oz;
    const t = (ax * ez - az * ex) / denom;
    const s = (ax * dz - az * dx) / denom;
    if (t > 1e-6 && s >= -1e-9 && s <= 1 + 1e-9 && t < best) best = t;
  }
  return Number.isFinite(best) ? best : null;
}

/* ------------------------------------------------------------------ */
/* Canopy / tent wedges                                                */
/* ------------------------------------------------------------------ */

export type RadialWedges = {
  hub: StudioPoint;
  /** Spoke angles in radians, ascending from the first spoke; wedge i spans [i, i + 1]. */
  angles: number[];
};

export function getRadialWedges(layout: CeilingLayout): RadialWedges | null {
  const hub = layout.hub;
  if (!hub) return null;
  const raw = layout.runs
    .filter((run) => run.kind === "spoke")
    .map((run) => {
      const end = run.points[run.points.length - 1];
      return Math.atan2(end.z - hub.z, end.x - hub.x);
    });
  if (raw.length < 2) return null;
  const base = raw[0];
  const angles = raw
    .map((angle) => base + ((((angle - base) % TAU) + TAU) % TAU))
    .sort((a, b) => a - b);
  angles.push(angles[0] + TAU);
  return { hub, angles };
}

/** Drop of a canopy / tent surface at radial fraction r (hub → wall) and wedge fraction s. */
export function wedgeDrop(drape: StudioCeilingDrape, r: number, s: number) {
  const rc = clamp01(r);
  const spoke =
    drape.hubDrop +
    (drape.edgeDrop - drape.hubDrop) * rc +
    drape.sag * 0.25 * catenaryBump(rc);
  /* Canopy swags open steadily from the gather; a tent stays taut and only scallops at the edge. */
  const reach = drape.type === "tent" ? rc * rc : rc;
  return fabricDrop(spoke + drape.sag * catenaryBump(s) * reach);
}

/* ------------------------------------------------------------------ */
/* Straight panels (rows, starburst spokes)                            */
/* ------------------------------------------------------------------ */

export type PanelFrame = {
  run: CeilingRun;
  x0: number;
  z0: number;
  /** Unit run direction and its left-hand normal. */
  ux: number;
  uz: number;
  vx: number;
  vz: number;
  length: number;
};

export function getPanelFrame(run: CeilingRun): PanelFrame | null {
  const a = run.points[0];
  const b = run.points[run.points.length - 1];
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (!(length > 1)) return null;
  const ux = (b.x - a.x) / length;
  const uz = (b.z - a.z) / length;
  return { run, x0: a.x, z0: a.z, ux, uz, vx: -uz, vz: ux, length };
}

/** Panel width as hung at fraction t (spokes taper toward the hub). */
export function panelWidthAt(run: CeilingRun, t: number) {
  if (run.kind !== "spoke" || run.hubTaper === undefined) return run.width;
  return run.width * (run.hubTaper + (1 - run.hubTaper) * clamp01(t));
}

/* ------------------------------------------------------------------ */
/* Surface query                                                       */
/* ------------------------------------------------------------------ */

export type CeilingSurface = {
  /** Fabric drop (inches) under a plan point, or null where there is no fabric overhead. */
  dropAt(x: number, z: number): number | null;
};

/**
 * Surface for styles with a continuous underside (canopy, tent, starburst,
 * row families). Perimeter swags and cascades hang vertically — null.
 */
export function createCeilingSurface(
  drape: StudioCeilingDrape,
  layout: CeilingLayout
): CeilingSurface | null {
  if (drape.type === "canopy" || drape.type === "tent") {
    const wedges = getRadialWedges(layout);
    if (!wedges) return null;
    const { hub, angles } = wedges;
    const outline = layout.outline;
    return {
      dropAt(x, z) {
        const dx = x - hub.x;
        const dz = z - hub.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 1e-3) return wedgeDrop(drape, 0, 0);
        const reach = rayToOutline(outline, hub.x, hub.z, dx / distance, dz / distance);
        if (reach === null || distance > reach) return null;
        const theta =
          angles[0] + ((((Math.atan2(dz, dx) - angles[0]) % TAU) + TAU) % TAU);
        let index = 0;
        while (index < angles.length - 2 && theta >= angles[index + 1]) index++;
        const span = angles[index + 1] - angles[index];
        const s = span > 0 ? (theta - angles[index]) / span : 0;
        return wedgeDrop(drape, distance / reach, s);
      },
    };
  }

  const panels = layout.runs
    .filter((run) => run.kind !== "perimeter" && run.width > 0)
    .map(getPanelFrame)
    .filter((frame): frame is PanelFrame => frame !== null);
  if (panels.length === 0) return null;
  return {
    dropAt(x, z) {
      /* Crossing panels: the lowest one is what an uplight hits. */
      let best: number | null = null;
      for (const panel of panels) {
        const px = x - panel.x0;
        const pz = z - panel.z0;
        const along = px * panel.ux + pz * panel.uz;
        if (along < 0 || along > panel.length) continue;
        const t = along / panel.length;
        const across = Math.abs(px * panel.vx + pz * panel.vz);
        if (across > panelWidthAt(panel.run, t) / 2) continue;
        const drop = fabricDrop(ceilingRunDrop(drape, panel.run, t));
        if (best === null || drop > best) best = drop;
      }
      return best;
    },
  };
}

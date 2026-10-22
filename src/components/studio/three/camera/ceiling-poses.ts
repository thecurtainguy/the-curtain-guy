/**
 * Look-up poses for ceiling drape designs: where a guest should stand and
 * how far to tilt so a starburst hub and its spokes, a run of swags, a
 * perimeter line or a field of cascades reads from below. Inputs are design
 * inches; poses are world feet.
 */
import {
  getCeilingDrapes,
  type StudioCeilingDrape,
  type StudioDesignJson,
} from "@/data/studio";
import {
  ceilingAxis,
  ceilingLowestDrop,
  ceilingStyleFamily,
  getCeilingLayout,
} from "@/lib/studio-ceiling";
import type { StudioBounds } from "@/lib/studio-geometry";
import * as THREE from "three";
import type { StudioEditorSettings } from "../../editor/studio-editor-context";
import type { StudioSelection } from "../../studio-types";
import { fitDistance, type StudioCameraPose } from "../engine-camera";
import {
  CEILING_FOV,
  EYE_HEIGHT,
  clampEye,
  clampHeight,
  getInteriorCeilingPose,
  interiorFov,
} from "./interior-poses";
import { clampToFootprint, type FootPoint, type RoomFootprint } from "./room-footprint";

const SCALE = 1 / 12;
const DEG = Math.PI / 180;
/** Tilt toward a hub / field centre: the hub sits mid-frame with the far spokes above it. */
const HUB_PITCH = 63 * DEG;
const ROWS_PITCH = 57 * DEG;
const PERIMETER_PITCH = 55 * DEG;
/** Closest the eye stands (plan feet) to the point it looks at, so the view never goes vertical. */
const MIN_REACH = 1.6;
/** Widest lens used to fit a whole area design before stepping back. */
const MAX_FIT_FOV = 84;
const MIN_FIT_PITCH = 50 * DEG;

type Layers = StudioEditorSettings["layers"];

function areaOf(points: FootPoint[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

function centroidOf(points: FootPoint[]): FootPoint {
  const area = areaOf(points);
  if (Math.abs(area) < 1e-6) {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
    return { x: sum.x / Math.max(1, points.length), z: sum.z / Math.max(1, points.length) };
  }
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.z - b.x * a.z;
    cx += (a.x + b.x) * cross;
    cz += (a.z + b.z) * cross;
  }
  return { x: cx / (6 * area), z: cz / (6 * area) };
}

/** Distance from `origin` along unit `dir` to the outline; 0 if it never crosses. */
function reach(points: FootPoint[], origin: FootPoint, dir: FootPoint) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const denom = dir.x * ez - dir.z * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = a.x - origin.x;
    const az = a.z - origin.z;
    const t = (ax * ez - az * ex) / denom;
    const s = (ax * dir.z - az * dir.x) / denom;
    if (t > 1e-4 && s >= -1e-6 && s <= 1 + 1e-6) best = Math.min(best, t);
  }
  return Number.isFinite(best) ? best : 0;
}

/** Plan direction from `origin` with the most design ahead of it. */
function deepestDirection(points: FootPoint[], origin: FootPoint): FootPoint {
  let best = { x: 0, z: -1 };
  let bestReach = -1;
  for (let k = 0; k < 24; k++) {
    const angle = (k / 24) * Math.PI * 2;
    const dir = { x: Math.cos(angle), z: Math.sin(angle) };
    const d = reach(points, origin, dir);
    if (d > bestReach) {
      bestReach = d;
      best = dir;
    }
  }
  return best;
}

function unit(v: FootPoint, fallback: FootPoint): FootPoint {
  const length = Math.hypot(v.x, v.z);
  return length > 1e-6 ? { x: v.x / length, z: v.z / length } : fallback;
}

/**
 * The design a ceiling camera should show: the selected one, else the
 * largest visible design. Null when there is none (or the layer is off).
 */
export function pickCeilingDrape(
  design: StudioDesignJson,
  selection: StudioSelection,
  layers: Layers
): StudioCeilingDrape | null {
  const drapes = getCeilingDrapes(design);
  if (selection?.kind === "ceiling") {
    const selected = drapes.find((drape) => drape.id === selection.id);
    if (selected) return selected;
  }
  if (!layers.ceiling) return null;
  let best: StudioCeilingDrape | null = null;
  let bestArea = 0;
  for (const drape of drapes) {
    if (drape.hidden) continue;
    const area = Math.abs(areaOf(getCeilingLayout(drape, design.room.floor).outline));
    if (area > bestArea) {
      best = drape;
      bestArea = area;
    }
  }
  return best;
}

type Aim = { focus: FootPoint; focusY: number; look: FootPoint; pitch: number };

/** Style-specific vantage: offset from a hub, near a wall across rows, facing a perimeter line. */
function showcaseAim(
  drape: StudioCeilingDrape,
  outline: FootPoint[],
  hub: FootPoint | null,
  drops: FootPoint[],
  height: number,
  eye: number
): Aim {
  const centre = centroidOf(outline);
  switch (ceilingStyleFamily(drape.type)) {
    case "radial": {
      const focus = hub ?? centre;
      return {
        focus,
        focusY: height - drape.hubDrop * SCALE,
        look: deepestDirection(outline, focus),
        pitch: HUB_PITCH,
      };
    }
    case "cascades": {
      const focus = drops.length ? centroidOf(drops.length >= 3 ? drops : outline) : centre;
      return {
        focus,
        focusY: height - drape.sag * SCALE * 0.45,
        look: deepestDirection(outline, focus),
        pitch: HUB_PITCH - 4 * DEG,
      };
    }
    case "rows": {
      const axis = ceilingAxis(drape.rotation);
      const across = { x: -axis.z, z: axis.x };
      const behind = reach(outline, centre, { x: -across.x, z: -across.z });
      const stand = {
        x: centre.x - across.x * Math.max(0, behind - 2.5),
        z: centre.z - across.z * Math.max(0, behind - 2.5),
      };
      const focusY = height - (drape.edgeDrop + drape.sag * 0.5) * SCALE;
      const ahead = Math.max(MIN_REACH, (focusY - eye) / Math.tan(ROWS_PITCH));
      return {
        focus: { x: stand.x + across.x * ahead, z: stand.z + across.z * ahead },
        focusY,
        look: across,
        pitch: ROWS_PITCH,
      };
    }
    case "perimeter": {
      let best = 0;
      let focus = centre;
      let look = { x: 0, z: -1 };
      const sign = areaOf(outline) >= 0 ? 1 : -1;
      outline.forEach((a, i) => {
        const b = outline[(i + 1) % outline.length];
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length <= best) return;
        best = length;
        focus = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        // Outward edge normal: the camera looks from inside toward this wall.
        look = { x: ((b.z - a.z) / length) * sign, z: (-(b.x - a.x) / length) * sign };
      });
      return {
        focus,
        focusY: height - (drape.edgeDrop + drape.sag * 0.5) * SCALE,
        look,
        pitch: PERIMETER_PITCH,
      };
    }
  }
}

/**
 * Looks up at one ceiling design. Room-wide designs get their style
 * showcase; area designs are viewed from the `from` side (the current eye)
 * and backed off along the view until the whole outline fits, keeping the
 * eye inside the room.
 */
export function getCeilingDesignPose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  drape: StudioCeilingDrape,
  aspect: number,
  options: { from?: FootPoint } = {}
): StudioCameraPose | null {
  const layout = getCeilingLayout(drape, design.room.floor);
  const toFeet = (p: { x: number; z: number }): FootPoint => ({
    x: (p.x - bounds.centerX) * SCALE,
    z: (p.z - bounds.centerZ) * SCALE,
  });
  const outline = layout.outline.map(toFeet);
  if (outline.length < 3) return null;
  const height = footprint.height;
  const eye = clampHeight(footprint, EYE_HEIGHT);
  const fov = interiorFov(CEILING_FOV + 5, aspect);
  const hub = layout.hub ? toFeet(layout.hub) : null;
  let aim = showcaseAim(drape, outline, hub, layout.drops.map(toFeet), height, eye);
  if (drape.coverage === "area") {
    const focus = hub ?? centroidOf(outline);
    const from = options.from;
    const look = from
      ? unit({ x: focus.x - from.x, z: focus.z - from.z }, deepestDirection(outline, focus))
      : deepestDirection(outline, focus);
    aim = {
      focus,
      focusY: height - (hub ? drape.hubDrop : ceilingLowestDrop(drape) * 0.5) * SCALE,
      look,
      pitch: HUB_PITCH,
    };
  }

  const focusY = Math.min(height, Math.max(eye + 0.5, aim.focusY));
  const back = Math.max(MIN_REACH, (focusY - eye) / Math.tan(aim.pitch));
  const stand = clampToFootprint(
    footprint,
    aim.focus.x - aim.look.x * back,
    aim.focus.z - aim.look.z * back
  );
  const position = new THREE.Vector3(stand.x, eye, stand.z);
  const target = new THREE.Vector3(aim.focus.x, focusY, aim.focus.z);
  if (Math.hypot(target.x - stand.x, target.z - stand.z) < MIN_REACH) {
    target.x = stand.x + aim.look.x * MIN_REACH;
    target.z = stand.z + aim.look.z * MIN_REACH;
  }

  if (drape.coverage !== "area") return { position, target, fov };

  // Fit the whole area: widen the lens first, then step back at eye height.
  const box = new THREE.Box3();
  for (const p of outline) {
    box.expandByPoint(new THREE.Vector3(p.x, height, p.z));
    box.expandByPoint(new THREE.Vector3(p.x, height - ceilingLowestDrop(drape) * SCALE, p.z));
  }
  const away = new THREE.Vector3();
  const needs = (lens: number) => {
    away.subVectors(position, target).normalize();
    return fitDistance(box, target, away, lens, aspect, 1.08) - position.distanceTo(target);
  };
  let lens = fov;
  while (lens < MAX_FIT_FOV && needs(lens) > 0) lens = Math.min(MAX_FIT_FOV, lens + 5);
  // Never back off so far that the shot stops looking up; big areas crop at the edges.
  const maxBack = (focusY - eye) / Math.tan(MIN_FIT_PITCH);
  for (let pass = 0; pass < 4; pass++) {
    const short = needs(lens);
    if (short <= 0.05) break;
    const flat = new THREE.Vector3(position.x - target.x, 0, position.z - target.z);
    if (flat.lengthSq() < 1e-6) flat.set(-aim.look.x, 0, -aim.look.z);
    const back = Math.min(maxBack, flat.length() + short);
    if (back <= flat.length() + 0.05) break;
    position.set(target.x, eye, target.z).addScaledVector(flat.normalize(), back);
    if (clampEye(footprint, position)) break;
  }
  return { position, target, fov: lens };
}

/** The "Ceiling" view: the showcased design when there is one, else the room's own ceiling. */
export function getCeilingViewPose(
  design: StudioDesignJson,
  bounds: StudioBounds,
  footprint: RoomFootprint,
  layers: Layers,
  aspect: number,
  selection: StudioSelection
): StudioCameraPose {
  const drape = pickCeilingDrape(design, selection, layers);
  const pose = drape
    ? getCeilingDesignPose(design, bounds, footprint, drape, aspect)
    : null;
  return pose ?? getInteriorCeilingPose(design, bounds, footprint, layers, aspect);
}

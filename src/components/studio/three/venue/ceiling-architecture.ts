/**
 * Ceiling architecture finishes as merged / instanced geometry in world feet:
 * tray with cove wash, flat plaster, coffered grid, exposed timber beams,
 * industrial open deck with truss / ducts / pendants, black-out and the tent
 * canvas. Every grid and beam line is clipped to the room outline, so
 * L-shaped and free-form rooms work. Pure: the React layer owns materials.
 */
import type { StudioCeilingFinish, StudioPoint, StudioWallFinish } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import * as THREE from "three";
import { WALL_FINISHES } from "../scene-finishes";
import {
  AO_NONE,
  bayLines,
  buildCans,
  chordsAt,
  createPlanFrame,
  emptyBuffers,
  fromFrame,
  mergeAll,
  pushPolygon,
  pushQuad,
  pushTube,
  subtractSpans,
  toFrame,
  toGeometry,
  type Buffers,
  type PlanFrame,
  type UV,
} from "./ceiling-kit";
import type { CeilingAoCell } from "./ceiling-textures";
import {
  distanceToOutline,
  edgeInward,
  offsetPolygon,
  pointInPolygon,
  signedArea,
  type Vec2,
} from "./polygon";

/** Explicit finishes plus the "auto" venue variants: tent canvas and the plain wash ceiling. */
export type CeilingArchitecture = Exclude<StudioCeilingFinish, "auto"> | "tent" | "plain";

export type CeilingMaterialKey =
  | "surface"
  | "surfaceTrim"
  | "timber"
  | "steel"
  | "alu"
  | "duct"
  | "glow"
  | "led"
  | "lens"
  | "bezel"
  | "halo"
  | "shade"
  | "shadeLining"
  | "bulb";

export type CeilingMesh = {
  key: string;
  material: CeilingMaterialKey;
  geometry: THREE.BufferGeometry;
  renderOrder?: number;
};

export type CeilingInstances = CeilingMesh & { matrices: THREE.Matrix4[] };

export type CeilingBuild = {
  architecture: CeilingArchitecture;
  meshes: CeilingMesh[];
  instances: CeilingInstances[];
  /** Crease occlusion for the ceiling plane (`uv1` cell fractions), or null. */
  surfaceAo: CeilingAoCell | null;
};

export function disposeCeilingBuild(build: CeilingBuild) {
  build.meshes.forEach((m) => m.geometry.dispose());
  build.instances.forEach((m) => m.geometry.dispose());
}

const DOWN = new THREE.Vector3(0, -1, 0);
const IN = 1 / 12;
const MAX_CANS = 64;

/** Tray geometry (inches). */
const TRAY_DROP_IN = 14;
const TRAY_LIP_IN = 3;
const TRAY_LEDGE_IN = 6;
const COVE_WASH_IN = 42;
const CAN_RADIUS_FT = 0.27;

function minDimension(bounds: StudioBounds) {
  return Math.min(bounds.width, bounds.depth);
}

function polygonArea(floor: readonly StudioPoint[]) {
  return Math.abs(signedArea(floor));
}

/** "auto" → what the venue would have; explicit trays fall back to flat in rooms too small for a soffit. */
export function resolveCeilingArchitecture(
  finish: StudioCeilingFinish,
  wallFinish: StudioWallFinish,
  floor: readonly StudioPoint[],
  bounds: StudioBounds,
  wallHeightIn: number
): CeilingArchitecture {
  const minDim = minDimension(bounds);
  const area = polygonArea(floor);
  if (finish === "auto") {
    if (wallFinish === "tent_canvas") return "tent";
    if (wallFinish === "black_box") return "black";
    return minDim >= 180 && wallHeightIn >= 120 && area > 1 ? "tray" : "plain";
  }
  if (finish === "tray" && !(minDim >= 120 && wallHeightIn >= 102 && area > 1)) return "flat";
  return finish;
}

/** Section sizes scaled to the room height so low rooms keep their headroom. */
function sizes(wallHeightIn: number) {
  const heightFt = wallHeightIn * IN;
  const k = THREE.MathUtils.clamp((heightFt - 8) / 8, 0.35, 1);
  const girder = 0.8 + 0.4 * k;
  const trussSize = 0.85 + 0.15 * k;
  const trussTop = girder + 0.35 + 0.9 * k;
  return {
    k,
    coffer: {
      depth: THREE.MathUtils.clamp(wallHeightIn * 0.075, 8, 15) * IN,
      half: 4.5 * IN,
      lip: 1.25 * IN,
      lipT: 1.75 * IN,
      cove: 3 * IN,
      frieze: 14 * IN,
    },
    beam: { depth: THREE.MathUtils.clamp(wallHeightIn * 0.065, 8, 13) * IN, half: 3.75 * IN },
    truss: {
      girder,
      flangeHalf: 0.28,
      flangeT: 0.06,
      webHalf: 0.022,
      duct: 0.55 + 0.25 * k,
      size: trussSize,
      top: trussTop,
      pendantDrop: THREE.MathUtils.clamp(heightFt * 0.28, 2, 5.5),
    },
  };
}

/**
 * Inches the architecture hangs below the ceiling plane along its continuous
 * members (soffits, beams, truss) — the camera keeps its eye under this.
 */
export function ceilingArchitectureHangIn(arch: CeilingArchitecture, wallHeightIn: number) {
  const s = sizes(wallHeightIn);
  switch (arch) {
    case "tray":
      return TRAY_DROP_IN;
    case "coffered":
      return s.coffer.depth / IN;
    case "beams":
      return s.beam.depth / IN;
    case "truss":
      return (s.truss.top + s.truss.size) / IN;
    default:
      return 0;
  }
}

type Ctx = {
  /** Room outline, plan inches. */
  plan: Vec2[];
  /** Room outline, world feet. */
  world: Vec2[];
  bounds: StudioBounds;
  heightIn: number;
  /** Ceiling plane, world feet. */
  H: number;
  out: CeilingBuild;
};

function addMesh(
  ctx: Ctx,
  key: string,
  material: CeilingMaterialKey,
  geometry: THREE.BufferGeometry | null,
  renderOrder?: number
) {
  if (geometry) ctx.out.meshes.push({ key, material, geometry, renderOrder });
}

function addBuffers(ctx: Ctx, key: string, material: CeilingMaterialKey, b: Buffers) {
  addMesh(ctx, key, material, toGeometry(b));
}

function addCans(ctx: Ctx, points: Vec2[], radius = CAN_RADIUS_FT) {
  const cans = buildCans(points.slice(0, MAX_CANS), ctx.H, radius);
  addMesh(ctx, "can-halos", "halo", cans.halo, 2);
  addMesh(ctx, "can-bezels", "bezel", cans.bezel);
  addMesh(ctx, "can-lenses", "lens", cans.lens);
}

function toWorldFeet(ctx: Ctx, p: Vec2): Vec2 {
  return { x: (p.x - ctx.bounds.centerX) * IN, z: (p.z - ctx.bounds.centerZ) * IN };
}

/** Regular downlight grid inside `field` (plan inches), as world feet. */
function gridCanPoints(ctx: Ctx, field: Vec2[], marginIn: number, spacingScale: number) {
  const { bounds } = ctx;
  const spacing =
    spacingScale * Math.min(132, Math.max(84, Math.sqrt((bounds.width * bounds.depth) / 40)));
  const nx = Math.max(1, Math.round((bounds.width - marginIn * 2) / spacing));
  const nz = Math.max(1, Math.round((bounds.depth - marginIn * 2) / spacing));
  const sx = (bounds.width - marginIn * 2) / nx;
  const sz = (bounds.depth - marginIn * 2) / nz;
  const points: Vec2[] = [];
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const cx = bounds.minX + marginIn + (i + 0.5) * sx;
      const cz = bounds.minZ + marginIn + (k + 0.5) * sz;
      if (!pointInPolygon(field, cx, cz) || distanceToOutline(field, cx, cz) < 24) continue;
      points.push(toWorldFeet(ctx, { x: cx, z: cz }));
    }
  }
  return points;
}

function addSlab(
  ctx: Ctx,
  uvOf: (p: Vec2) => UV = (p) => [p.x, p.z],
  aoOf?: (p: Vec2) => UV
) {
  const b = emptyBuffers();
  pushPolygon(b, ctx.world, ctx.H, DOWN, uvOf, aoOf);
  addBuffers(ctx, "slab", "surface", b);
}

/** `uv1` for a vertical face: dark at the ceiling crease, clear `fall` feet below. */
function creaseAo(ctx: Ctx, y: number, fall: number): UV {
  return [0.5, 0.5 * THREE.MathUtils.clamp((ctx.H - y) / fall, 0, 1)];
}

/* ------------------------------------------------------------------ */
/* Frame-aligned beam pieces                                           */
/* ------------------------------------------------------------------ */

type Line = { frame: PlanFrame; axis: "u" | "v"; at: number };

function linePoint(line: Line, t: number, offset: number, y: number) {
  const p =
    line.axis === "u"
      ? fromFrame(line.frame, t, line.at + offset)
      : fromFrame(line.frame, line.at + offset, t);
  return new THREE.Vector3(p.x, y, p.z);
}

function lineSide(line: Line, sign: 1 | -1) {
  const d = line.axis === "u" ? line.frame.v : line.frame.u;
  return new THREE.Vector3(d.x * sign, 0, d.z * sign);
}

function pushBottom(b: Buffers, line: Line, t0: number, t1: number, half: number, y: number) {
  pushQuad(
    b,
    [
      linePoint(line, t0, -half, y),
      linePoint(line, t1, -half, y),
      linePoint(line, t1, half, y),
      linePoint(line, t0, half, y),
    ],
    [
      [t0, -half],
      [t1, -half],
      [t1, half],
      [t0, half],
    ],
    DOWN
  );
}

function pushSides(
  b: Buffers,
  line: Line,
  t0: number,
  t1: number,
  half: number,
  y0: number,
  y1: number,
  ao: (y: number) => UV
) {
  for (const sign of [1, -1] as const) {
    pushQuad(
      b,
      [
        linePoint(line, t0, half * sign, y0),
        linePoint(line, t1, half * sign, y0),
        linePoint(line, t1, half * sign, y1),
        linePoint(line, t0, half * sign, y1),
      ],
      [
        [t0, y0],
        [t1, y0],
        [t1, y1],
        [t0, y1],
      ],
      lineSide(line, sign),
      [ao(y0), ao(y0), ao(y1), ao(y1)]
    );
  }
}

/** 45° cove from the member side (at `y`) out to the ceiling plane. */
function pushCoves(
  b: Buffers,
  line: Line,
  t0: number,
  t1: number,
  half: number,
  size: number,
  H: number,
  ao: UV
) {
  for (const sign of [1, -1] as const) {
    const n = lineSide(line, sign).add(DOWN).normalize();
    pushQuad(
      b,
      [
        linePoint(line, t0, half * sign, H - size),
        linePoint(line, t1, half * sign, H - size),
        linePoint(line, t1, (half + size) * sign, H),
        linePoint(line, t0, (half + size) * sign, H),
      ],
      [
        [t0, 0],
        [t1, 0],
        [t1, size],
        [t0, size],
      ],
      n,
      [ao, ao, ao, ao]
    );
  }
}

/* ------------------------------------------------------------------ */
/* Finishes                                                            */
/* ------------------------------------------------------------------ */

/** The original venue ceiling: tray + cove wash (or tent canvas) with cans. */
function buildTray(ctx: Ctx, tent: boolean, tray: boolean) {
  const { plan: outline, bounds, heightIn: H } = ctx;
  const minDim = minDimension(bounds);
  const toW = (p: Vec2, yIn: number) =>
    new THREE.Vector3((p.x - bounds.centerX) * IN, yIn * IN, (p.z - bounds.centerZ) * IN);
  const soffitIn = Math.min(48, Math.max(24, minDim * 0.1));
  const ledgeLine = tray ? offsetPolygon(outline, soffitIn) : outline;
  const riserLine = tray ? offsetPolygon(outline, soffitIn - TRAY_LEDGE_IN) : outline;
  const washLine = offsetPolygon(riserLine, COVE_WASH_IN);

  const soffit = emptyBuffers();
  const glow = emptyBuffers();
  const led: THREE.BufferGeometry[] = [];
  const aoAt = (yIn: number) => creaseAo(ctx, yIn * IN, 1.2);

  const ring = (b: Buffers, outer: Vec2[], inner: Vec2[], yIn: number, mode: "world" | "fade") => {
    let run = 0;
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      const quad = [toW(outer[i], yIn), toW(outer[j], yIn), toW(inner[j], yIn), toW(inner[i], yIn)];
      const len = Math.hypot(outer[j].x - outer[i].x, outer[j].z - outer[i].z) * IN;
      const uv: UV[] =
        mode === "world"
          ? quad.map((v) => [v.x, v.z] as UV)
          : [
              [run, 0],
              [run + len, 0],
              [run + len, 1],
              [run, 1],
            ];
      run += len;
      pushQuad(b, quad, uv, DOWN);
    }
  };

  const strip = (b: Buffers, line: Vec2[], y0: number, y1: number, inset: number, fade: boolean) => {
    const a = signedArea(line);
    let run = 0;
    for (let i = 0; i < line.length; i++) {
      const j = (i + 1) % line.length;
      const n = edgeInward(line, i, a);
      const p0 = { x: line[i].x + n.x * inset, z: line[i].z + n.z * inset };
      const p1 = { x: line[j].x + n.x * inset, z: line[j].z + n.z * inset };
      const len = Math.hypot(p1.x - p0.x, p1.z - p0.z) * IN;
      const quad = [toW(p0, y0), toW(p1, y0), toW(p1, y1), toW(p0, y1)];
      const uv: UV[] = fade
        ? [
            [run, 0],
            [run + len, 0],
            [run + len, 1],
            [run, 1],
          ]
        : [
            [run, y0 * IN],
            [run + len, y0 * IN],
            [run + len, y1 * IN],
            [run, y1 * IN],
          ];
      run += len;
      pushQuad(b, quad, uv, new THREE.Vector3(n.x, 0, n.z), [aoAt(y0), aoAt(y0), aoAt(y1), aoAt(y1)]);
    }
  };

  addSlab(ctx);
  if (tray) {
    const soffitY = H - TRAY_DROP_IN;
    ring(soffit, outline, ledgeLine, soffitY, "world");
    strip(soffit, ledgeLine, soffitY, soffitY + TRAY_LIP_IN, 0, false);
    strip(soffit, riserLine, soffitY, H, 0, false);
    strip(glow, riserLine, soffitY + TRAY_LIP_IN, H, 0.15, true);
    const a = signedArea(riserLine);
    riserLine.forEach((p, i) => {
      const q = riserLine[(i + 1) % riserLine.length];
      const n = edgeInward(riserLine, i, a);
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      const run = len - 2 * (TRAY_LEDGE_IN - 1.4);
      if (run < 2) return;
      const box = new THREE.BoxGeometry(run * IN, 0.6 * IN, 0.8 * IN);
      const mid = {
        x: (p.x + q.x) / 2 + n.x * (TRAY_LEDGE_IN - 1.4),
        z: (p.z + q.z) / 2 + n.z * (TRAY_LEDGE_IN - 1.4),
      };
      box.rotateY(-Math.atan2(q.z - p.z, q.x - p.x));
      const w = toW(mid, soffitY + 0.3);
      box.translate(w.x, w.y, w.z);
      led.push(box);
    });
  }
  ring(glow, riserLine, washLine, H - 0.15, "fade");
  addBuffers(ctx, "soffit", "surfaceTrim", soffit);
  addMesh(ctx, "glow", "glow", toGeometry(glow), 2);
  addMesh(ctx, "led", "led", mergeAll(led));
  if (!tent) addCans(ctx, gridCanPoints(ctx, tray ? riserLine : outline, soffitIn, 1));
}

function buildFlat(ctx: Ctx, wallFinish: StudioWallFinish) {
  addSlab(ctx);
  addCans(ctx, gridCanPoints(ctx, ctx.plan, 24, 1));
  if (WALL_FINISHES[wallFinish].crown !== null || wallFinish === "black_box") return;
  // Walls without their own crown get a small plaster cove at the wall line.
  const size = 4 * IN;
  const area = signedArea(ctx.world);
  const inset = offsetPolygon(ctx.world, size);
  const b = emptyBuffers();
  let run = 0;
  ctx.world.forEach((p, i) => {
    const j = (i + 1) % ctx.world.length;
    const q = ctx.world[j];
    const n = edgeInward(ctx.world, i, area);
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    pushQuad(
      b,
      [
        new THREE.Vector3(p.x, ctx.H - size, p.z),
        new THREE.Vector3(q.x, ctx.H - size, q.z),
        new THREE.Vector3(inset[j].x, ctx.H, inset[j].z),
        new THREE.Vector3(inset[i].x, ctx.H, inset[i].z),
      ],
      [
        [run, 0],
        [run + len, 0],
        [run + len, size],
        [run, size],
      ],
      new THREE.Vector3(n.x, -1, n.z).normalize(),
      [
        [0.5, 0.12],
        [0.5, 0.12],
        [0.5, 0.2],
        [0.5, 0.2],
      ]
    );
    run += len;
  });
  addBuffers(ctx, "crown", "surfaceTrim", b);
}

function buildBlack(ctx: Ctx) {
  addSlab(ctx);
  addCans(ctx, gridCanPoints(ctx, ctx.plan, 36, 1.7), 0.17);
}

/** Recessed coffers: a perimeter frieze plus a beam grid with stepped lips and coves. */
function buildCoffered(ctx: Ctx) {
  const { coffer } = sizes(ctx.heightIn);
  const { H } = ctx;
  const inset = offsetPolygon(ctx.world, coffer.frieze);
  if (Math.abs(signedArea(inset)) < 16) {
    buildFlat(ctx, "white_plaster");
    return;
  }
  const frame = createPlanFrame(ctx.world);
  const local = inset.map((p) => toFrame(frame, p));
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const p of local) {
    uMin = Math.min(uMin, p.x);
    uMax = Math.max(uMax, p.x);
    vMin = Math.min(vMin, p.z);
    vMax = Math.max(vMax, p.z);
  }
  const hw = coffer.half;
  const target = THREE.MathUtils.clamp(Math.min(uMax - uMin, vMax - vMin) / 3, 6, 10);
  const grid = (min: number, max: number) => {
    const bays = Math.max(1, Math.round((max - min + 2 * hw) / target));
    const step = (max - min + 2 * hw) / bays;
    const origin = min - hw;
    return { bays, step, origin, lines: Array.from({ length: bays - 1 }, (_, i) => origin + step * (i + 1)) };
  };
  const gu = grid(uMin, uMax);
  const gv = grid(vMin, vMax);
  const recess = hw + coffer.cove;
  ctx.out.surfaceAo = {
    edgeU: recess / gu.step,
    falloffU: Math.min(0.5 - recess / gu.step, 1.7 / gu.step),
    edgeV: recess / gv.step,
    falloffV: Math.min(0.5 - recess / gv.step, 1.7 / gv.step),
  };
  addSlab(ctx, undefined, (p) => {
    const l = toFrame(frame, p);
    return [(l.x - gu.origin) / gu.step, (l.z - gv.origin) / gv.step];
  });

  const trim = emptyBuffers();
  const sideAo = (y: number) => creaseAo(ctx, y, 1.3);
  const coveAo: UV = [0.5, 0.1];
  const bottom = H - coffer.depth;

  // Perimeter frieze: soffit band, inner face and cove.
  const area = signedArea(inset);
  const coveLine = offsetPolygon(inset, coffer.cove);
  ctx.world.forEach((p, i) => {
    const j = (i + 1) % ctx.world.length;
    const q = ctx.world[j];
    pushQuad(
      trim,
      [
        new THREE.Vector3(p.x, bottom, p.z),
        new THREE.Vector3(q.x, bottom, q.z),
        new THREE.Vector3(inset[j].x, bottom, inset[j].z),
        new THREE.Vector3(inset[i].x, bottom, inset[i].z),
      ],
      [p, q, inset[j], inset[i]].map((v) => [v.x, v.z] as UV),
      DOWN
    );
    const n = edgeInward(inset, i, area);
    const a = inset[i];
    const c = inset[j];
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    pushQuad(
      trim,
      [
        new THREE.Vector3(a.x, bottom, a.z),
        new THREE.Vector3(c.x, bottom, c.z),
        new THREE.Vector3(c.x, H - coffer.cove, c.z),
        new THREE.Vector3(a.x, H - coffer.cove, a.z),
      ],
      [
        [0, bottom],
        [len, bottom],
        [len, H],
        [0, H],
      ],
      new THREE.Vector3(n.x, 0, n.z),
      [sideAo(bottom), sideAo(bottom), sideAo(H - coffer.cove), sideAo(H - coffer.cove)]
    );
    pushQuad(
      trim,
      [
        new THREE.Vector3(a.x, H - coffer.cove, a.z),
        new THREE.Vector3(c.x, H - coffer.cove, c.z),
        new THREE.Vector3(coveLine[j].x, H, coveLine[j].z),
        new THREE.Vector3(coveLine[i].x, H, coveLine[i].z),
      ],
      [
        [0, 0],
        [len, 0],
        [len, coffer.cove],
        [0, coffer.cove],
      ],
      new THREE.Vector3(n.x, -1, n.z).normalize(),
      [coveAo, coveAo, coveAo, coveAo]
    );
  });

  // Beam grid. Lines along u run through; lines along v stop at them.
  const lipHalf = hw + coffer.lip;
  const lipTop = bottom + coffer.lipT;
  const member = (line: Line, body: Array<[number, number]>, lip: Array<[number, number]>) => {
    for (const [t0, t1] of lip) {
      pushBottom(trim, line, t0, t1, lipHalf, bottom);
      pushSides(trim, line, t0, t1, lipHalf, bottom, lipTop, () => AO_NONE);
    }
    for (const [t0, t1] of body) {
      pushSides(trim, line, t0, t1, hw, lipTop, H - coffer.cove, sideAo);
      pushCoves(trim, line, t0, t1, hw, coffer.cove, H, coveAo);
    }
  };
  for (const at of gv.lines) {
    const spans = chordsAt(local, "u", at);
    member({ frame, axis: "u", at }, spans, spans);
  }
  for (const at of gu.lines) {
    const spans = chordsAt(local, "v", at);
    member(
      { frame, axis: "v", at },
      subtractSpans(spans, gv.lines.map((c) => [c - hw, c + hw])),
      subtractSpans(spans, gv.lines.map((c) => [c - lipHalf, c + lipHalf]))
    );
  }
  addBuffers(ctx, "coffers", "surfaceTrim", trim);

  const clear = Math.min(gu.step, gv.step) * 0.3;
  const cans: Vec2[] = [];
  for (let i = 0; i < gu.bays; i++) {
    for (let j = 0; j < gv.bays; j++) {
      const p = fromFrame(frame, gu.origin + (i + 0.5) * gu.step, gv.origin + (j + 0.5) * gv.step);
      if (pointInPolygon(inset, p.x, p.z) && distanceToOutline(inset, p.x, p.z) >= clear) cans.push(p);
    }
  }
  addCans(ctx, cans, 0.24);
}

/** Exposed timber beams spanning the short dimension over whitewashed planks. */
function buildBeams(ctx: Ctx) {
  const { beam } = sizes(ctx.heightIn);
  const { H } = ctx;
  const frame = createPlanFrame(ctx.world);
  const local = ctx.world.map((p) => toFrame(frame, p));
  const bays = bayLines(frame.uMin, frame.uMax, 8, 2);
  ctx.out.surfaceAo = {
    edgeU: beam.half / bays.step,
    falloffU: Math.min(0.5 - beam.half / bays.step, 1.5 / bays.step),
    edgeV: 0,
    falloffV: 0,
  };
  addSlab(
    ctx,
    (p) => {
      const l = toFrame(frame, p);
      return [l.x, l.z];
    },
    (p) => [(toFrame(frame, p).x - frame.uMin) / bays.step, 0.5]
  );

  const wood = emptyBuffers();
  const bottom = H - beam.depth;
  const sideAo = (y: number) => creaseAo(ctx, y, 1.1);
  for (const at of bays.lines) {
    const line: Line = { frame, axis: "v", at };
    for (const [t0, t1] of chordsAt(local, "v", at)) {
      pushBottom(wood, line, t0, t1, beam.half, bottom);
      pushSides(wood, line, t0, t1, beam.half, bottom, H, sideAo);
    }
  }
  addBuffers(ctx, "beams", "timber", wood);

  const rows = bayLines(frame.vMin, frame.vMax, 8);
  const cans: Vec2[] = [];
  for (let i = 0; i < bays.bays; i++) {
    for (let j = 0; j < rows.bays; j++) {
      const p = fromFrame(frame, frame.uMin + (i + 0.5) * bays.step, frame.vMin + (j + 0.5) * rows.step);
      if (pointInPolygon(ctx.world, p.x, p.z) && distanceToOutline(ctx.world, p.x, p.z) >= 2) cans.push(p);
    }
  }
  addCans(ctx, cans, 0.22);
}

const UNIT_Y = new THREE.Vector3(0, 1, 0);

function strut(from: THREE.Vector3, to: THREE.Vector3, radius: number) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UNIT_Y, dir.divideScalar(length || 1));
  return new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5),
    q,
    new THREE.Vector3(radius, length, radius)
  );
}

/** Warehouse dome shade profile (feet), mouth at y = 0. */
function shadeGeometry(scale: number) {
  const profile = [
    [0.06, 0.62],
    [0.1, 0.6],
    [0.14, 0.5],
    [0.36, 0.3],
    [0.56, 0.1],
    [0.64, 0.02],
    [0.66, 0],
  ].map(([r, y]) => new THREE.Vector2(r * scale, y));
  return new THREE.LatheGeometry(profile, 28);
}

/** Industrial open ceiling: fluted deck, girders, spiral ducts, box truss and pendants. */
function buildTruss(ctx: Ctx) {
  const { truss } = sizes(ctx.heightIn);
  const { H } = ctx;
  const frame = createPlanFrame(ctx.world);
  const local = ctx.world.map((p) => toFrame(frame, p));
  const spanV = frame.vMax - frame.vMin;
  const at = (fraction: number) => frame.vMin + spanV * fraction;
  const girders = bayLines(frame.uMin, frame.uMax, 18, 2);

  ctx.out.surfaceAo = {
    edgeU: truss.flangeHalf / girders.step,
    falloffU: Math.min(0.5 - truss.flangeHalf / girders.step, 1.2 / girders.step),
    edgeV: 0,
    falloffV: 0,
  };
  addSlab(
    ctx,
    (p) => {
      const l = toFrame(frame, p);
      return [l.x, l.z];
    },
    (p) => [(toFrame(frame, p).x - frame.uMin) / girders.step, 0.5]
  );

  const steel = emptyBuffers();
  const sideAo = (y: number) => creaseAo(ctx, y, 0.9);
  const flangeTop = H - truss.girder + truss.flangeT;
  for (const u of girders.lines) {
    const line: Line = { frame, axis: "v", at: u };
    for (const [t0, t1] of chordsAt(local, "v", u)) {
      pushBottom(steel, line, t0, t1, truss.flangeHalf, H - truss.girder);
      pushSides(steel, line, t0, t1, truss.flangeHalf, H - truss.girder, flangeTop, () => AO_NONE);
      pushSides(steel, line, t0, t1, truss.webHalf, flangeTop, H, sideAo);
    }
  }

  const point = (a: number, b: number, y: number) => {
    const p = fromFrame(frame, a, b);
    return new THREE.Vector3(p.x, y, p.z);
  };

  const ducts = emptyBuffers();
  const ductY = H - (truss.girder + truss.duct + 0.2);
  for (const fraction of spanV > 16 ? [0.15, 0.85] : [0.2]) {
    const b = at(fraction);
    for (const [t0, t1] of chordsAt(local, "u", b)) {
      pushTube(ducts, point(t0, b, ductY), point(t1, b, ductY), truss.duct, 22);
      const hangers = bayLines(t0, t1, 8);
      for (const t of hangers.lines) {
        pushTube(steel, point(t, b, ductY + truss.duct), point(t, b, H), 0.02, 4);
      }
    }
  }
  addBuffers(ctx, "ducts", "duct", ducts);

  const chords = emptyBuffers();
  const lacing: THREE.Matrix4[] = [];
  const inner = offsetPolygon(ctx.world, 1.5).map((p) => toFrame(frame, p));
  const half = truss.size / 2;
  const top = H - truss.top;
  const corners: Array<[number, number]> = [
    [-half, top],
    [half, top],
    [half, top - truss.size],
    [-half, top - truss.size],
  ];
  for (const fraction of spanV > 24 ? [0.36, 0.64] : [0.5]) {
    const b = at(fraction);
    for (const [t0, t1] of chordsAt(inner, "u", b)) {
      if (t1 - t0 < truss.size * 2) continue;
      for (const [off, y] of corners) pushTube(chords, point(t0, b + off, y), point(t1, b + off, y), 0.085, 8);
      const panels = Math.max(1, Math.round((t1 - t0) / truss.size));
      const step = (t1 - t0) / panels;
      for (let f = 0; f < 4; f++) {
        const [oa, ya] = corners[f];
        const [ob, yb] = corners[(f + 1) % 4];
        lacing.push(strut(point(t0, b + oa, ya), point(t0, b + ob, yb), 0.045));
        lacing.push(strut(point(t1, b + oa, ya), point(t1, b + ob, yb), 0.045));
        for (let k = 0; k < panels; k++) {
          const ta = t0 + k * step;
          const tb = ta + step;
          lacing.push(
            k % 2 === 0
              ? strut(point(ta, b + oa, ya), point(tb, b + ob, yb), 0.04)
              : strut(point(ta, b + ob, yb), point(tb, b + oa, ya), 0.04)
          );
        }
      }
      for (const t of bayLines(t0, t1, 10).lines.concat([t0 + 0.6, t1 - 0.6])) {
        pushTube(steel, point(t, b, top), point(t, b, H), 0.018, 4);
      }
    }
  }
  addBuffers(ctx, "truss-chords", "alu", chords);
  if (lacing.length) {
    const unit = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    ctx.out.instances.push({ key: "truss-lacing", material: "alu", geometry: unit, matrices: lacing });
  }

  const pendants: THREE.Matrix4[] = [];
  const shadeY = H - truss.pendantDrop;
  const runs = bayLines(frame.uMin, frame.uMax, 9);
  for (const fraction of spanV > 24 ? [0.5] : [0.8]) {
    for (let i = 0; i < runs.bays; i++) {
      const p = fromFrame(frame, frame.uMin + (i + 0.5) * runs.step, at(fraction));
      if (!pointInPolygon(ctx.world, p.x, p.z) || distanceToOutline(ctx.world, p.x, p.z) < 2.5) continue;
      pushTube(steel, new THREE.Vector3(p.x, H, p.z), new THREE.Vector3(p.x, shadeY + 0.6, p.z), 0.014, 4);
      pendants.push(new THREE.Matrix4().makeTranslation(p.x, shadeY, p.z));
    }
  }
  addBuffers(ctx, "steel", "steel", steel);
  if (pendants.length) {
    const bulb = new THREE.SphereGeometry(0.13, 16, 10);
    bulb.translate(0, 0.16, 0);
    ctx.out.instances.push(
      { key: "pendant-shades", material: "shade", geometry: shadeGeometry(1), matrices: pendants },
      { key: "pendant-linings", material: "shadeLining", geometry: shadeGeometry(0.965), matrices: pendants },
      { key: "pendant-bulbs", material: "bulb", geometry: bulb, matrices: pendants }
    );
  }
}

/** Builds one ceiling architecture for a room outline (plan inches). */
export function buildCeilingArchitecture(
  architecture: CeilingArchitecture,
  floor: readonly StudioPoint[],
  bounds: StudioBounds,
  wallHeightIn: number,
  wallFinish: StudioWallFinish
): CeilingBuild {
  const plan: Vec2[] = floor.map((p) => ({ x: p.x, z: p.z }));
  const ctx: Ctx = {
    plan,
    world: plan.map((p) => ({ x: (p.x - bounds.centerX) * IN, z: (p.z - bounds.centerZ) * IN })),
    bounds,
    heightIn: wallHeightIn,
    H: wallHeightIn * IN,
    out: { architecture, meshes: [], instances: [], surfaceAo: null },
  };
  if (plan.length < 3) return ctx.out;
  switch (architecture) {
    case "tray":
      buildTray(ctx, false, true);
      break;
    case "tent":
      buildTray(ctx, true, false);
      break;
    case "plain":
      buildTray(ctx, false, false);
      break;
    case "flat":
      buildFlat(ctx, wallFinish);
      break;
    case "black":
      buildBlack(ctx);
      break;
    case "coffered":
      buildCoffered(ctx);
      break;
    case "beams":
      buildBeams(ctx);
      break;
    case "truss":
      buildTruss(ctx);
      break;
  }
  return ctx.out;
}

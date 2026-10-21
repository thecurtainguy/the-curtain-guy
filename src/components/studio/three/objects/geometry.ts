/**
 * Shared geometry caches and procedural builders for Studio objects.
 * Everything is keyed by quantised dimensions in a small LRU so resizing in
 * the editor reuses geometry and evicted entries are disposed.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import type { StudioQuality } from "../../editor/studio-editor-context";

const MAX_CACHED = 700;
const geometryCache = new Map<string, THREE.BufferGeometry>();

export function cachedGeometry<T extends THREE.BufferGeometry>(
  key: string,
  build: () => T
): T {
  const cached = geometryCache.get(key);
  if (cached) {
    geometryCache.delete(key);
    geometryCache.set(key, cached);
    return cached as T;
  }
  const geometry = build();
  geometryCache.set(key, geometry);
  if (geometryCache.size > MAX_CACHED) {
    const oldest = geometryCache.keys().next().value;
    if (oldest !== undefined) {
      // three re-uploads a disposed geometry if a live mesh still uses it.
      geometryCache.get(oldest)?.dispose();
      geometryCache.delete(oldest);
    }
  }
  return geometry;
}

/** Quantise to 1/4 inch so tiny drags don't thrash the cache. */
export const q = (value: number) => Math.round(value * 48) / 48;

export function segmentsFor(quality: StudioQuality, high: number) {
  if (quality === "draft") return Math.max(6, Math.round(high * 0.5));
  if (quality === "ultra") return Math.round(high * 1.5);
  return high;
}

/* ------------------------------------------------------------------ */
/* Unit primitives — scale per mesh                                    */
/* ------------------------------------------------------------------ */

export const UNIT = {
  box: () => cachedGeometry("u-box", () => new THREE.BoxGeometry(1, 1, 1)),
  /** Radius 1, height 1, centred. */
  cylinder: (segments = 24) =>
    cachedGeometry(
      `u-cyl:${segments}`,
      () => new THREE.CylinderGeometry(1, 1, 1, segments)
    ),
  /** Top radius `ratio`, bottom radius 1 (tapered legs, cans). */
  taper: (ratio: number, segments = 16) =>
    cachedGeometry(
      `u-taper:${ratio}:${segments}`,
      () => new THREE.CylinderGeometry(ratio, 1, 1, segments)
    ),
  sphere: (segments = 16) =>
    cachedGeometry(
      `u-sphere:${segments}`,
      () =>
        new THREE.SphereGeometry(1, segments, Math.max(6, Math.round(segments * 0.7)))
    ),
  hemisphere: (segments = 16) =>
    cachedGeometry(
      `u-hemi:${segments}`,
      () =>
        new THREE.SphereGeometry(
          1,
          segments,
          Math.max(4, Math.round(segments * 0.4)),
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        )
    ),
  cone: (segments = 12) =>
    cachedGeometry(`u-cone:${segments}`, () => new THREE.ConeGeometry(1, 1, segments)),
  icosahedron: (detail = 1) =>
    cachedGeometry(
      `u-ico:${detail}`,
      () => new THREE.IcosahedronGeometry(1, detail)
    ),
  octahedron: () =>
    cachedGeometry("u-oct", () => new THREE.OctahedronGeometry(1, 0)),
  /** Flat disc facing +Y, radius 1. */
  disc: (segments = 32) =>
    cachedGeometry(`u-disc:${segments}`, () =>
      new THREE.CircleGeometry(1, segments).rotateX(-Math.PI / 2)
    ),
  /** Flat 1×1 plane facing +Y. */
  plane: () =>
    cachedGeometry("u-plane", () =>
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    ),
};

/** Torus lying flat (in XZ) with tube radius relative to the ring radius 1. */
export function flatTorus(tube: number, radial = 8, tubular = 48, arc = Math.PI * 2) {
  return cachedGeometry(`torus:${tube}:${radial}:${tubular}:${arc}`, () =>
    new THREE.TorusGeometry(1, tube, radial, tubular, arc).rotateX(Math.PI / 2)
  );
}

export function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 3
) {
  const w = Math.max(0.01, q(width));
  const h = Math.max(0.01, q(height));
  const d = Math.max(0.01, q(depth));
  const r = Math.min(q(radius), w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return cachedGeometry(`rbox:${w}:${h}:${d}:${r}:${segments}`, () => {
    const box = new RoundedBoxGeometry(w, h, d, segments, Math.max(0.001, r));
    const indexed = box.index ? box : mergeVertices(box);
    if (indexed !== box) box.dispose();
    return indexed;
  });
}

export function lathe(
  key: string,
  profile: Array<[number, number]>,
  segments: number
) {
  return cachedGeometry(`lathe:${key}:${segments}`, () =>
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)),
      segments
    )
  );
}

/** Merge geometries; stays indexed unless some part is non-indexed. */
export function mergeLoose(parts: THREE.BufferGeometry[]) {
  const indexed = parts.every((part) => part.index);
  const prepared = parts.map((part) => {
    const g = indexed || !part.index ? part.clone() : part.toNonIndexed();
    for (const name of Object.keys(g.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") {
        g.deleteAttribute(name);
      }
    }
    if (!g.attributes.uv) {
      g.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)
      );
    }
    return g;
  });
  const merged = mergeGeometries(prepared, false) ?? new THREE.BufferGeometry();
  prepared.forEach((g) => g.dispose());
  return merged;
}

/** Positioned/rotated/scaled copy of a geometry, for merging. */
export function placed(
  geometry: THREE.BufferGeometry,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0]
) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale)
  );
  return geometry.clone().applyMatrix4(matrix);
}

/* ------------------------------------------------------------------ */
/* Rounded rectangle helpers                                           */
/* ------------------------------------------------------------------ */

export function roundedRectShape(hx: number, hz: number, radius: number) {
  const r = Math.max(0.0005, Math.min(radius, hx, hz));
  const shape = new THREE.Shape();
  shape.moveTo(-hx + r, -hz);
  shape.lineTo(hx - r, -hz);
  shape.absarc(hx - r, -hz + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hx, hz - r);
  shape.absarc(hx - r, hz - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hx + r, hz);
  shape.absarc(-hx + r, hz - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hx, -hz + r);
  shape.absarc(-hx + r, -hz + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** Flat rounded-rect outline ring on the floor (selection marker). */
export function outlineRing(
  hx: number,
  hz: number,
  radius: number,
  thickness: number
) {
  const key = `ring:${q(hx)}:${q(hz)}:${q(radius)}:${thickness}`;
  return cachedGeometry(key, () => {
    const outer = roundedRectShape(hx + thickness, hz + thickness, radius + thickness);
    const inner = roundedRectShape(hx, hz, radius);
    outer.holes.push(new THREE.Path(inner.getPoints(12).reverse()));
    return new THREE.ShapeGeometry(outer, 12).rotateX(-Math.PI / 2);
  });
}

export function roundedRectPlate(hx: number, hz: number, radius: number, curve = 10) {
  return cachedGeometry(`plate:${q(hx)}:${q(hz)}:${q(radius)}:${curve}`, () =>
    new THREE.ShapeGeometry(roundedRectShape(hx, hz, radius), curve).rotateX(
      -Math.PI / 2
    )
  );
}

/* ------------------------------------------------------------------ */
/* Draped skirt / linen generator                                      */
/* ------------------------------------------------------------------ */

export type SkirtRow = {
  /** Height (feet). */
  y: number;
  /** Outward offset from the base half-extents (feet). */
  offset: number;
  /** Fold amplitude (feet). */
  amp: number;
  /** Corner radius for this row (clamped to the half-extents). */
  radius: number;
};

type Segment =
  | { kind: "line"; from: [number, number]; to: [number, number]; normal: [number, number] }
  | { kind: "arc"; cx: number; cz: number; a0: number; a1: number };

function rrSegments(ax: number, az: number, r: number): Segment[] {
  const sx = ax - r;
  const sz = az - r;
  return [
    { kind: "line", from: [ax, 0], to: [ax, sz], normal: [1, 0] },
    { kind: "arc", cx: sx, cz: sz, a0: 0, a1: Math.PI / 2 },
    { kind: "line", from: [sx, az], to: [-sx, az], normal: [0, 1] },
    { kind: "arc", cx: -sx, cz: sz, a0: Math.PI / 2, a1: Math.PI },
    { kind: "line", from: [-ax, sz], to: [-ax, -sz], normal: [-1, 0] },
    { kind: "arc", cx: -sx, cz: -sz, a0: Math.PI, a1: Math.PI * 1.5 },
    { kind: "line", from: [-sx, -az], to: [sx, -az], normal: [0, -1] },
    { kind: "arc", cx: sx, cz: -sz, a0: Math.PI * 1.5, a1: Math.PI * 2 },
    { kind: "line", from: [ax, -sz], to: [ax, 0], normal: [1, 0] },
  ];
}

function segmentLength(segment: Segment, r: number) {
  if (segment.kind === "line") {
    return Math.hypot(segment.to[0] - segment.from[0], segment.to[1] - segment.from[1]);
  }
  return (segment.a1 - segment.a0) * r;
}

function segmentPoint(
  segment: Segment,
  r: number,
  u: number
): { x: number; z: number; nx: number; nz: number } {
  if (segment.kind === "line") {
    return {
      x: segment.from[0] + (segment.to[0] - segment.from[0]) * u,
      z: segment.from[1] + (segment.to[1] - segment.from[1]) * u,
      nx: segment.normal[0],
      nz: segment.normal[1],
    };
  }
  const a = segment.a0 + (segment.a1 - segment.a0) * u;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: segment.cx + c * r, z: segment.cz + s * r, nx: c, nz: s };
}

export type SkirtOptions = {
  key: string;
  hx: number;
  hz: number;
  rows: SkirtRow[];
  segments: number;
  /** Folds around the whole perimeter. */
  folds: number;
  /** Fold amplitude multiplier on corners (rect drapes gather there). */
  cornerBoost?: number;
  /** Accordion pleats instead of soft folds (stage skirting). */
  pleated?: boolean;
  /** Adds a flat top cap at rows[0] height. */
  cap?: boolean;
  uvScale?: number;
};

/**
 * Builds a skirt whose horizontal section is a rounded rectangle (a circle
 * when hx = hz = radius). Rows run top → bottom; columns stay aligned to the
 * same segment positions on every row so folds fall straight.
 */
export function buildSkirt(options: SkirtOptions) {
  return cachedGeometry(`skirt:${options.key}`, () => buildSkirtUncached(options));
}

function buildSkirtUncached({
  hx,
  hz,
  rows,
  segments,
  folds,
  cornerBoost = 1,
  pleated = false,
  cap = true,
  uvScale = 0.5,
}: SkirtOptions) {
  const ref = rows[0];
  const refAx = hx + ref.offset;
  const refAz = hz + ref.offset;
  const refR = Math.min(ref.radius, refAx, refAz);
  const refSegments = rrSegments(refAx, refAz, refR);
  const lengths = refSegments.map((segment) => segmentLength(segment, refR));
  const perimeter = lengths.reduce((sum, value) => sum + value, 0) || 1;
  const counts = refSegments.map((segment, index) => {
    const share = Math.round((lengths[index] / perimeter) * segments);
    return segment.kind === "arc" ? Math.max(3, share) : Math.max(0, share);
  });
  const columns: Array<{ segment: number; u: number; t: number; corner: number }> = [];
  let walked = 0;
  refSegments.forEach((segment, index) => {
    const n = counts[index];
    for (let c = 0; c < n; c++) {
      const u = c / n;
      let corner = 0;
      if (segment.kind === "arc") corner = 1;
      else {
        const along = Math.min(u, 1 - u) * lengths[index];
        const nearEnd = index === 0 ? (1 - u) * lengths[index] : index === 8 ? u * lengths[index] : along;
        corner = Math.max(0, 1 - nearEnd / 0.7);
      }
      columns.push({
        segment: index,
        u,
        t: (walked + u * lengths[index]) / perimeter,
        corner,
      });
    }
    walked += lengths[index];
  });
  columns.push({ ...columns[0], t: 1 });

  const cols = columns.length;
  const positions = new Float32Array(rows.length * cols * 3);
  const uvs = new Float32Array(rows.length * cols * 2);
  let vAcc = 0;
  let prevY = rows[0].y;
  let prevOffset = rows[0].offset;
  rows.forEach((row, j) => {
    if (j > 0) vAcc += Math.hypot(row.y - prevY, row.offset - prevOffset);
    prevY = row.y;
    prevOffset = row.offset;
    const ax = hx + row.offset;
    const az = hz + row.offset;
    const r = Math.min(row.radius, ax, az);
    const segs = rrSegments(ax, az, r);
    columns.forEach((column, i) => {
      const p = segmentPoint(segs[column.segment], r, column.u);
      const phase = column.t * Math.PI * 2;
      let wave: number;
      if (pleated) {
        wave = (2 / Math.PI) * Math.asin(Math.sin(phase * folds));
      } else {
        wave =
          0.62 * Math.sin(phase * folds) +
          0.28 * Math.sin(phase * (2 * folds + 1) + 1.3) +
          0.1 * Math.sin(phase * (folds + 3) + 0.4);
      }
      const amp = row.amp * (1 + (cornerBoost - 1) * column.corner);
      const d = wave * amp + (pleated ? 0 : Math.abs(amp) * 0.4);
      const k = (j * cols + i) * 3;
      positions[k] = p.x + p.nx * d;
      positions[k + 1] = row.y;
      positions[k + 2] = p.z + p.nz * d;
      const uvk = (j * cols + i) * 2;
      uvs[uvk] = (column.t * perimeter) / uvScale;
      uvs[uvk + 1] = vAcc / uvScale;
    });
  });

  const index: number[] = [];
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = (j + 1) * cols + i;
      const c = j * cols + i + 1;
      const d = (j + 1) * cols + i + 1;
      index.push(a, c, b, c, d, b);
    }
  }
  const skirt = new THREE.BufferGeometry();
  skirt.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  skirt.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  skirt.setIndex(index);
  skirt.computeVertexNormals();
  const normals = skirt.attributes.normal as THREE.BufferAttribute;
  for (let j = 0; j < rows.length; j++) {
    const first = j * cols;
    const last = j * cols + cols - 1;
    const n = new THREE.Vector3(
      normals.getX(first) + normals.getX(last),
      normals.getY(first) + normals.getY(last),
      normals.getZ(first) + normals.getZ(last)
    ).normalize();
    normals.setXYZ(first, n.x, n.y, n.z);
    normals.setXYZ(last, n.x, n.y, n.z);
  }

  if (!cap) return skirt;
  const top = new THREE.ShapeGeometry(
    roundedRectShape(refAx, refAz, refR),
    Math.max(4, Math.round(segments / 12))
  )
    .rotateX(-Math.PI / 2)
    .translate(0, rows[0].y, 0);
  const uv = top.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / uvScale, uv.getY(i) / uvScale);
  const merged = mergeGeometries([skirt, top], false);
  skirt.dispose();
  top.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/**
 * Floor-length tablecloth profile: rolls over the table edge, falls with
 * deepening folds and a slight flare, then pools a little on the floor.
 */
export function linenRows({
  height,
  radius,
  bottomRadius,
  foldDepth,
  flare = 0.08,
  pool = 0.12,
  rows = 14,
}: {
  height: number;
  radius: number;
  bottomRadius: number;
  foldDepth: number;
  flare?: number;
  pool?: number;
  rows?: number;
}): SkirtRow[] {
  const top = height + 0.018;
  const list: SkirtRow[] = [
    { y: top, offset: 0, amp: 0, radius },
    { y: top - 0.012, offset: 0.022, amp: 0, radius: radius + 0.02 },
    { y: top - 0.045, offset: 0.036, amp: foldDepth * 0.05, radius: radius + 0.03 },
  ];
  const start = top - 0.09;
  const end = 0.05;
  for (let i = 0; i <= rows; i++) {
    const s = i / rows;
    list.push({
      y: start + (end - start) * s,
      offset: 0.04 + flare * Math.pow(s, 1.6),
      amp: foldDepth * (0.15 + 0.85 * Math.pow(s, 0.75)),
      radius: radius + 0.03 + (bottomRadius - radius) * s,
    });
  }
  if (pool > 0) {
    list.push(
      { y: 0.022, offset: 0.04 + flare + pool * 0.45, amp: foldDepth * 1.05, radius: bottomRadius + 0.04 },
      { y: 0.006, offset: 0.04 + flare + pool, amp: foldDepth * 1.1, radius: bottomRadius + 0.08 }
    );
  }
  return list;
}

"use client";

import {
  getDrapeColorHex,
  type CeilingHubDecor,
  type StudioCeilingDrape,
  type StudioPoint,
} from "@/data/studio";
import {
  ceilingStyleFamily,
  pointInCeilingPolygon,
  type CeilingLayout,
  type CeilingRun,
} from "@/lib/studio-ceiling";
import { memo } from "react";

const GOLD = "var(--primary)";
/** Upper bound on light marks per design so dense rooms stay fast. */
const MAX_LIGHTS = 900;

type Vec = StudioPoint;

const fmt = (value: number) => Math.round(value * 100) / 100;

export function polygonPath(points: readonly Vec[]): string {
  if (points.length === 0) return "";
  return `M ${points.map((p) => `${fmt(p.x)} ${fmt(p.z)}`).join(" L ")} Z`;
}

function signedArea(points: readonly Vec[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

/** Inward unit normal of the edge a→b for a polygon with the given winding. */
function inwardNormal(a: Vec, b: Vec, winding: number): Vec {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return winding > 0 ? { x: -dz / len, z: dx / len } : { x: dz / len, z: -dx / len };
}

export function outlineCentroid(points: readonly Vec[]): Vec {
  const area = signedArea(points);
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

/** Where the plan label and focus ring centre for a design. */
export function ceilingAnchor(layout: CeilingLayout): Vec {
  return layout.hub ?? outlineCentroid(layout.outline);
}

/** Plan radius of the hub décor glyph, inches. */
export function hubDecorRadius(decor: CeilingHubDecor): number {
  switch (decor) {
    case "chandelier":
      return 24;
    case "floral_ring":
      return 20;
    case "medallion":
      return 16;
    case "rosette":
      return 14;
    default:
      return 5;
  }
}

function runFrame(run: CeilingRun) {
  const a = run.points[0];
  const b = run.points[run.points.length - 1];
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const u = length > 0 ? { x: (b.x - a.x) / length, z: (b.z - a.z) / length } : { x: 1, z: 0 };
  return { a, b, length, u, n: { x: -u.z, z: u.x } };
}

/** Closed band around a straight run whose half-width follows `profile(t)`. */
function bandPath(run: CeilingRun, profile: (t: number) => number, samples: number): string {
  const { a, length, u, n } = runFrame(run);
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const hw = profile(t);
    const cx = a.x + u.x * length * t;
    const cz = a.z + u.z * length * t;
    left.push({ x: cx + n.x * hw, z: cz + n.z * hw });
    right.push({ x: cx - n.x * hw, z: cz - n.z * hw });
  }
  return polygonPath([...left, ...right.reverse()]);
}

function rowProfile(drape: StudioCeilingDrape, run: CeilingRun) {
  const half = run.width / 2;
  const segments = Math.max(1, run.points.length - 1);
  switch (drape.type) {
    case "stretch_panels":
      return { profile: () => half, samples: 2 };
    case "billow_rows":
      return {
        profile: (t: number) => {
          const local = (t * segments) % 1;
          const edge = t <= 0 || t >= 1 || local === 0;
          return half * (edge ? 0.5 : 0.5 + 0.5 * Math.sin(Math.PI * local));
        },
        samples: segments * 10,
      };
    default:
      return {
        profile: (t: number) => half * (0.4 + 0.6 * Math.sin(Math.PI * t)),
        samples: 16,
      };
  }
}

/** Short fan of folds where gathered fabric meets its attach point. */
function GatherFan({ at, dir, normal, reach, spread, color }: {
  at: Vec;
  dir: Vec;
  normal: Vec;
  reach: number;
  spread: number;
  color: string;
}) {
  return (
    <path
      d={[-1, -0.33, 0.33, 1]
        .map(
          (k) =>
            `M ${fmt(at.x)} ${fmt(at.z)} L ${fmt(at.x + dir.x * reach + normal.x * spread * k)} ${fmt(
              at.z + dir.z * reach + normal.z * spread * k
            )}`
        )
        .join(" ")}
      fill="none"
      stroke={color}
      strokeOpacity={0.75}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function RowRun({ drape, run }: { drape: StudioCeilingDrape; run: CeilingRun }) {
  const hex = getDrapeColorHex(run.color);
  const { profile, samples } = rowProfile(drape, run);
  const { a, b, length, u, n } = runFrame(run);
  const half = run.width / 2;
  const sagShade = 0.12 + Math.min(0.3, drape.sag / 160);
  const gathered = drape.type !== "stretch_panels";
  const reach = Math.min(length * 0.12, Math.max(12, half * 1.4));
  return (
    <g>
      <path
        d={bandPath(run, profile, samples)}
        fill={hex}
        fillOpacity={drape.type === "stretch_panels" ? 0.32 : 0.26}
        stroke={hex}
        strokeOpacity={0.6}
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={a.x}
        y1={a.z}
        x2={b.x}
        y2={b.z}
        stroke={hex}
        strokeOpacity={sagShade}
        strokeWidth={drape.type === "stretch_panels" ? 1 : 2}
        strokeDasharray={drape.type === "stretch_panels" ? "6 6" : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {drape.type === "billow_rows"
        ? run.points.slice(1, -1).map((p, index) => (
            <g key={index}>
              <line
                x1={p.x - n.x * half * 0.85}
                y1={p.z - n.z * half * 0.85}
                x2={p.x + n.x * half * 0.85}
                y2={p.z + n.z * half * 0.85}
                stroke={hex}
                strokeOpacity={0.95}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={p.x} cy={p.z} r={Math.max(1.5, half * 0.08)} fill={GOLD} />
            </g>
          ))
        : null}
      {gathered ? (
        <>
          <GatherFan at={a} dir={u} normal={n} reach={reach} spread={half * 0.45} color={hex} />
          <GatherFan
            at={b}
            dir={{ x: -u.x, z: -u.z }}
            normal={n}
            reach={reach}
            spread={half * 0.45}
            color={hex}
          />
        </>
      ) : null}
    </g>
  );
}

function SpokeRun({ drape, run }: { drape: StudioCeilingDrape; run: CeilingRun }) {
  const hex = getDrapeColorHex(run.color);
  const taper = run.hubTaper ?? 0.08;
  const half = run.width / 2;
  const belly = 0.08 + Math.min(0.28, drape.sag / 140);
  return (
    <g>
      <path
        d={bandPath(run, (t) => half * (taper + (1 - taper) * t), 2)}
        fill={hex}
        fillOpacity={0.3}
        stroke={hex}
        strokeOpacity={0.55}
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={bandPath(run, (t) => half * 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (taper + (1 - taper) * t), 12)}
        fill={hex}
        fillOpacity={belly}
      />
    </g>
  );
}

/** Canopy / tent: fabric wedges between consecutive perimeter points with seams. */
function WedgeFan({
  drape,
  layout,
  shadeId,
}: {
  drape: StudioCeilingDrape;
  layout: CeilingLayout;
  shadeId: string;
}) {
  const hub = layout.hub;
  if (!hub || layout.perimeter.length < 2) return null;
  const scallop = drape.type === "tent" ? Math.min(drape.sag, 48) : Math.min(drape.sag * 0.5, 30);
  const wedges: Array<{ d: string; color: string; alt: boolean }> = [];
  let spoke = -1;
  for (let i = 0; i < layout.perimeter.length; i++) {
    const p = layout.perimeter[i];
    const q = layout.perimeter[(i + 1) % layout.perimeter.length];
    if (p.spoke) spoke += 1;
    const run = layout.runs[Math.max(0, spoke)];
    const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
    const toHub = { x: hub.x - mid.x, z: hub.z - mid.z };
    const reach = Math.hypot(toHub.x, toHub.z) || 1;
    const span = Math.hypot(q.x - p.x, q.z - p.z);
    const depth = Math.min(scallop, span * 0.3, reach * 0.4) * 2;
    const ctrl = { x: mid.x + (toHub.x / reach) * depth, z: mid.z + (toHub.z / reach) * depth };
    wedges.push({
      d: `M ${fmt(hub.x)} ${fmt(hub.z)} L ${fmt(p.x)} ${fmt(p.z)} Q ${fmt(ctrl.x)} ${fmt(ctrl.z)} ${fmt(q.x)} ${fmt(q.z)} Z`,
      color: getDrapeColorHex(run?.color ?? drape.color),
      alt: Math.max(0, spoke) % 2 === 1,
    });
  }
  return (
    <g>
      {wedges.map((wedge, index) => (
        <path
          key={index}
          d={wedge.d}
          fill={wedge.color}
          fillOpacity={wedge.alt ? 0.24 : 0.32}
          stroke={wedge.color}
          strokeOpacity={0.35}
          strokeWidth={0.75}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={polygonPath(layout.outline)} fill={`url(#${shadeId})`} pointerEvents="none" />
      {layout.runs.map((run) => {
        const end = run.points[run.points.length - 1];
        return (
          <line
            key={run.key}
            x1={hub.x}
            y1={hub.z}
            x2={end.x}
            y2={end.z}
            stroke={getDrapeColorHex(run.color)}
            strokeOpacity={0.85}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

function scallopPaths(
  outline: readonly Vec[],
  segments: Array<{ a: Vec; b: Vec }>,
  depthFor: (length: number) => number
) {
  const winding = signedArea(outline);
  return segments.map(({ a, b }) => {
    const n = inwardNormal(a, b, winding);
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const depth = depthFor(length) * 2;
    const ctrl = { x: (a.x + b.x) / 2 + n.x * depth, z: (a.z + b.z) / 2 + n.z * depth };
    return `M ${fmt(a.x)} ${fmt(a.z)} Q ${fmt(ctrl.x)} ${fmt(ctrl.z)} ${fmt(b.x)} ${fmt(b.z)} Z`;
  });
}

function PerimeterScallops({ drape, layout }: { drape: StudioCeilingDrape; layout: CeilingLayout }) {
  const paths = scallopPaths(
    layout.outline,
    layout.runs.map((run) => ({ a: run.points[0], b: run.points[run.points.length - 1] })),
    (length) => Math.min(length * 0.3, 6 + drape.sag * 0.6)
  );
  return (
    <g>
      {layout.runs.map((run, index) => {
        const hex = getDrapeColorHex(run.color);
        return (
          <path
            key={run.key}
            d={paths[index]}
            fill={hex}
            fillOpacity={0.3}
            stroke={hex}
            strokeOpacity={0.85}
            strokeWidth={1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {layout.runs.map((run) => (
        <circle key={`jabot-${run.key}`} cx={run.points[0].x} cy={run.points[0].z} r={3} fill={GOLD} fillOpacity={0.85} />
      ))}
    </g>
  );
}

/** Small finishing valance scallops along the outline (non-perimeter styles). */
function Valance({ drape, outline }: { drape: StudioCeilingDrape; outline: readonly Vec[] }) {
  const segments: Array<{ a: Vec; b: Vec }> = [];
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const count = Math.max(1, Math.round(length / 48));
    for (let s = 0; s < count; s++) {
      const t0 = s / count;
      const t1 = (s + 1) / count;
      segments.push({
        a: { x: a.x + (b.x - a.x) * t0, z: a.z + (b.z - a.z) * t0 },
        b: { x: a.x + (b.x - a.x) * t1, z: a.z + (b.z - a.z) * t1 },
      });
    }
  });
  const hex = getDrapeColorHex(drape.accentColor ?? drape.color);
  return (
    <path
      d={scallopPaths(outline, segments, (length) => Math.min(length * 0.25, 7)).join(" ")}
      fill={hex}
      fillOpacity={0.28}
      stroke={hex}
      strokeOpacity={0.8}
      strokeWidth={0.75}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function Cascades({ drape, layout }: { drape: StudioCeilingDrape; layout: CeilingLayout }) {
  const r = Math.max(4, drape.panelWidth / 2);
  const folds = 8;
  return (
    <g>
      {layout.drops.map((p, index) => {
        const hex = getDrapeColorHex(
          drape.accentColor && index % 2 === 1 ? drape.accentColor : drape.color
        );
        return (
          <g key={index}>
            <circle cx={p.x} cy={p.z} r={r} fill={hex} fillOpacity={0.24} stroke={hex} strokeOpacity={0.85} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path
              d={Array.from({ length: folds }, (_, k) => {
                const theta = (k / folds) * Math.PI * 2;
                const c = Math.cos(theta);
                const s = Math.sin(theta);
                return `M ${fmt(p.x + c * r * 0.3)} ${fmt(p.z + s * r * 0.3)} L ${fmt(p.x + c * r * 0.85)} ${fmt(p.z + s * r * 0.85)}`;
              }).join(" ")}
              stroke={hex}
              strokeOpacity={0.7}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={p.x} cy={p.z} r={r * 0.3} fill={hex} fillOpacity={0.6} stroke={GOLD} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </g>
  );
}

const FLORAL_COLORS = ["#f3c6d3", "#fdf6ee", "#e8a5b8", "#f7dfe6"];

/** Hub symbol by décor, centred on the hub. */
export function HubDecorGlyph({ decor, at, color }: { decor: CeilingHubDecor; at: Vec; color: string }) {
  const R = hubDecorRadius(decor);
  const stroke = { vectorEffect: "non-scaling-stroke" as const };
  let body: React.ReactNode;
  switch (decor) {
    case "chandelier":
      body = (
        <>
          <circle r={R * 1.4} fill="#f6d98c" fillOpacity={0.1} />
          {[1, 0.7, 0.42].map((scale) => (
            <circle key={scale} r={R * scale} fill="none" stroke={scale === 1 ? GOLD : "#fff4d6"} strokeWidth={1.25} strokeDasharray="5 4" {...stroke} />
          ))}
          {Array.from({ length: 12 }, (_, k) => {
            const theta = (k * Math.PI * 2) / 12;
            return <circle key={k} cx={Math.cos(theta) * R * 0.85} cy={Math.sin(theta) * R * 0.85} r={R * 0.07} fill="#fff4d6" />;
          })}
          <circle r={R * 0.16} fill={GOLD} />
        </>
      );
      break;
    case "floral_ring":
      body = (
        <>
          <circle r={R * 0.78} fill="none" stroke="#6f8f5a" strokeWidth={2} strokeOpacity={0.8} {...stroke} />
          {Array.from({ length: 14 }, (_, k) => {
            const theta = (k * Math.PI * 2) / 14;
            const leaf = theta + Math.PI / 14;
            return (
              <g key={k}>
                <ellipse
                  cx={Math.cos(leaf) * R * 0.78}
                  cy={Math.sin(leaf) * R * 0.78}
                  rx={R * 0.13}
                  ry={R * 0.06}
                  transform={`rotate(${(leaf * 180) / Math.PI + 90} ${Math.cos(leaf) * R * 0.78} ${Math.sin(leaf) * R * 0.78})`}
                  fill="#7fa36a"
                />
                <circle cx={Math.cos(theta) * R * 0.78} cy={Math.sin(theta) * R * 0.78} r={R * 0.17} fill={FLORAL_COLORS[k % FLORAL_COLORS.length]} stroke="#c98a9c" strokeWidth={0.75} {...stroke} />
              </g>
            );
          })}
          <circle r={R * 0.12} fill={GOLD} />
        </>
      );
      break;
    case "rosette":
      body = (
        <>
          {Array.from({ length: 8 }, (_, k) => (
            <ellipse
              key={k}
              cx={R * 0.42}
              rx={R * 0.55}
              ry={R * 0.26}
              transform={`rotate(${k * 45})`}
              fill={color}
              fillOpacity={0.75}
              stroke={GOLD}
              strokeOpacity={0.6}
              strokeWidth={0.75}
              {...stroke}
            />
          ))}
          <circle r={R * 0.28} fill={color} stroke={GOLD} strokeWidth={1.25} {...stroke} />
        </>
      );
      break;
    case "medallion": {
      const star = Array.from({ length: 16 }, (_, k) => {
        const theta = (k * Math.PI) / 8;
        const radius = k % 2 === 0 ? R * 0.62 : R * 0.32;
        return `${fmt(Math.cos(theta) * radius)} ${fmt(Math.sin(theta) * radius)}`;
      });
      body = (
        <>
          <circle r={R} fill={GOLD} fillOpacity={0.22} stroke={GOLD} strokeWidth={1.5} {...stroke} />
          <circle r={R * 0.8} fill="none" stroke={GOLD} strokeWidth={0.75} strokeDasharray="2 2" {...stroke} />
          <path d={`M ${star.join(" L ")} Z`} fill={GOLD} fillOpacity={0.55} />
          <circle r={R * 0.14} fill={GOLD} />
        </>
      );
      break;
    }
    default:
      body = <circle r={R} fill={color} fillOpacity={0.8} stroke={GOLD} strokeWidth={1.25} {...stroke} />;
  }
  return <g transform={`translate(${fmt(at.x)} ${fmt(at.z)})`}>{body}</g>;
}

function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function lightMarks(drape: StudioCeilingDrape, layout: CeilingLayout): Vec[] {
  if (drape.lights === "none") return [];
  if (drape.lights === "starlight") {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of layout.outline) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    const count = Math.min(260, Math.max(24, Math.round(((maxX - minX) * (maxZ - minZ)) / 1600)));
    let seed = hashSeed(drape.id);
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const points: Vec[] = [];
    for (let i = 0; i < count; i++) {
      const x = minX + next() * (maxX - minX);
      const z = minZ + next() * (maxZ - minZ);
      if (pointInCeilingPolygon(layout.outline, x, z)) points.push({ x, z });
    }
    return points;
  }
  if (layout.drops.length > 0) {
    const r = Math.max(4, drape.panelWidth / 2) * 0.85;
    return layout.drops.flatMap((p) =>
      Array.from({ length: 10 }, (_, k) => {
        const theta = (k / 10) * Math.PI * 2;
        return { x: p.x + Math.cos(theta) * r, z: p.z + Math.sin(theta) * r };
      })
    );
  }
  const total = layout.runs.reduce((sum, run) => sum + runFrame(run).length, 0);
  const base = drape.lights === "bistro" ? 30 : 10;
  const spacing = Math.max(base, total / MAX_LIGHTS);
  const points: Vec[] = [];
  for (const run of layout.runs) {
    const { a, length, u } = runFrame(run);
    const count = Math.max(1, Math.floor(length / spacing));
    for (let i = 0; i <= count; i++) {
      const t = (i + 0.5) / (count + 1);
      points.push({ x: a.x + u.x * length * t, z: a.z + u.z * length * t });
    }
  }
  return points;
}

function LightMarks({ drape, layout }: { drape: StudioCeilingDrape; layout: CeilingLayout }) {
  const points = lightMarks(drape, layout);
  if (points.length === 0) return null;
  const hex = getDrapeColorHex(drape.lightColor);
  const bistro = drape.lights === "bistro";
  const r = bistro ? 2.6 : drape.lights === "starlight" ? 1.1 : 1.2;
  const d = points
    .map((p) => `M ${fmt(p.x - r)} ${fmt(p.z)} a ${r} ${r} 0 1 0 ${fmt(r * 2)} 0 a ${r} ${r} 0 1 0 ${fmt(-r * 2)} 0`)
    .join(" ");
  return (
    <g pointerEvents="none">
      {bistro ? (
        <path
          d={points
            .map((p) => `M ${fmt(p.x - r * 2.4)} ${fmt(p.z)} a ${r * 2.4} ${r * 2.4} 0 1 0 ${fmt(r * 4.8)} 0 a ${r * 2.4} ${r * 2.4} 0 1 0 ${fmt(-r * 4.8)} 0`)
            .join(" ")}
          fill={hex}
          fillOpacity={0.18}
        />
      ) : null}
      <path d={d} fill={hex} fillOpacity={0.95} />
    </g>
  );
}

/**
 * Reflected-ceiling-plan drawing of one ceiling design: dashed gold coverage
 * outline, fabric in its colours (wedges, bands, scallops, falls), hub décor
 * and light marks. Pure — memoized on the drape + its layout.
 */
export const CeilingDesignSymbol = memo(function CeilingDesignSymbol({
  drape,
  layout,
  idPrefix,
}: {
  drape: StudioCeilingDrape;
  layout: CeilingLayout;
  idPrefix: string;
}) {
  if (layout.outline.length < 3) return null;
  const family = ceilingStyleFamily(drape.type);
  const shadeId = `${idPrefix}-shade-${drape.id}`;
  const hub = layout.hub;
  const reach = hub
    ? Math.max(1, ...layout.outline.map((p) => Math.hypot(p.x - hub.x, p.z - hub.z)))
    : 1;
  const wedges = drape.type === "canopy" || drape.type === "tent";
  return (
    <g>
      {wedges && hub ? (
        <defs>
          <radialGradient id={shadeId} gradientUnits="userSpaceOnUse" cx={hub.x} cy={hub.z} r={reach}>
            {drape.type === "canopy" ? (
              <>
                <stop offset="0%" stopColor="#000" stopOpacity={0.38} />
                <stop offset="100%" stopColor="#000" stopOpacity={0} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fff" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#000" stopOpacity={0.2} />
              </>
            )}
          </radialGradient>
        </defs>
      ) : null}
      <path
        d={polygonPath(layout.outline)}
        fill="color-mix(in oklch, var(--primary) 4%, transparent)"
        stroke={GOLD}
        strokeOpacity={0.85}
        strokeWidth={1.25}
        strokeDasharray="10 6"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {wedges ? <WedgeFan drape={drape} layout={layout} shadeId={shadeId} /> : null}
      {drape.type === "starburst"
        ? layout.runs.map((run) => <SpokeRun key={run.key} drape={drape} run={run} />)
        : null}
      {family === "rows"
        ? layout.runs.map((run) => <RowRun key={run.key} drape={drape} run={run} />)
        : null}
      {family === "perimeter" ? <PerimeterScallops drape={drape} layout={layout} /> : null}
      {family === "cascades" ? <Cascades drape={drape} layout={layout} /> : null}
      {drape.perimeterValance && family !== "perimeter" ? (
        <Valance drape={drape} outline={layout.outline} />
      ) : null}
      <LightMarks drape={drape} layout={layout} />
      {hub ? (
        <HubDecorGlyph decor={drape.hubDecor} at={hub} color={getDrapeColorHex(drape.color)} />
      ) : null}
    </g>
  );
});

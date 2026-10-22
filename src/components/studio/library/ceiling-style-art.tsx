"use client";

import {
  getDrapeColorHex,
  type CeilingDrapeStyle,
  type CeilingHubDecor,
  type CeilingLightStyle,
  type DrapeColor,
} from "@/data/studio";
import { ceilingUsesHub } from "@/lib/studio-ceiling";
import { cn } from "@/lib/utils";
import { memo, useId } from "react";

/*
 * Mini illustrations of each ceiling style, seen from below inside a
 * rectangular room. Gold line art by default; pass `color` (and optionally
 * `accentColor`, `lights`, `hubDecor`) to tint it like a real design.
 */

const X0 = 5;
const Y0 = 5;
const X1 = 95;
const Y1 = 59;
const CX = (X0 + X1) / 2;
const CY = (Y0 + Y1) / 2;
const W = X1 - X0;
const H = Y1 - Y0;

type Pt = { x: number; y: number };

function rectHit(angle: number): Pt {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx = dx > 1e-9 ? (X1 - CX) / dx : dx < -1e-9 ? (X0 - CX) / dx : Infinity;
  const ty = dy > 1e-9 ? (Y1 - CY) / dy : dy < -1e-9 ? (Y0 - CY) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: CX + dx * t, y: CY + dy * t };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: Pt) => `${r1(p.x)} ${r1(p.y)}`;

/** Deterministic 0..1 noise so light scatter is stable between renders. */
function noise(i: number, salt: number) {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

type Paint = {
  fill: (index: number) => string;
  opacity: (index: number) => number;
  stroke: string;
  strokeOpacity: number;
};

function makePaint(color?: DrapeColor, accent?: DrapeColor | null): Paint {
  if (!color) {
    return {
      fill: () => "var(--primary)",
      opacity: (i) => (i % 2 === 0 ? 0.2 : 0.32),
      stroke: "var(--primary)",
      strokeOpacity: 0.85,
    };
  }
  const base = getDrapeColorHex(color);
  const alt = accent ? getDrapeColorHex(accent) : base;
  return {
    fill: (i) => (i % 2 === 1 ? alt : base),
    opacity: (i) => (accent ? 0.82 : i % 2 === 0 ? 0.72 : 0.86),
    stroke: "var(--primary)",
    strokeOpacity: 0.5,
  };
}

function StyleShapes({
  style,
  paint,
  clipId,
}: {
  style: CeilingDrapeStyle;
  paint: Paint;
  clipId: string;
}) {
  const line = {
    stroke: paint.stroke,
    strokeOpacity: paint.strokeOpacity,
    strokeWidth: 0.5,
    fill: "none",
  } as const;
  const rim = (opacityScale: number, strokeWidth: number) => ({
    stroke: paint.stroke,
    strokeOpacity: paint.strokeOpacity * opacityScale,
    strokeWidth,
  });

  switch (style) {
    case "starburst": {
      const n = 16;
      const spread = (Math.PI / n) * 0.55;
      return (
        <>
          {Array.from({ length: n }, (_, k) => {
            const a = (k / n) * Math.PI * 2 - Math.PI / 2;
            const p1 = rectHit(a - spread);
            const p2 = rectHit(a + spread);
            const tip = rectHit(a);
            return (
              <g key={k}>
                <path
                  d={`M ${CX} ${CY} L ${pt(p1)} L ${pt(tip)} L ${pt(p2)} Z`}
                  fill={paint.fill(k)}
                  fillOpacity={paint.opacity(k)}
                />
                <path d={`M ${CX} ${CY} L ${pt(tip)}`} {...line} strokeOpacity={paint.strokeOpacity * 0.6} />
              </g>
            );
          })}
        </>
      );
    }
    case "canopy": {
      const n = 12;
      const landings = Array.from({ length: n }, (_, k) =>
        rectHit((k / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n)
      );
      return (
        <>
          {landings.map((p, k) => {
            const q = landings[(k + 1) % n];
            const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
            const ctrl = { x: mid.x + (CX - mid.x) * 0.24, y: mid.y + (CY - mid.y) * 0.24 };
            return (
              <path
                key={k}
                d={`M ${CX} ${CY} L ${pt(p)} Q ${pt(ctrl)} ${pt(q)} Z`}
                fill={paint.fill(k)}
                fillOpacity={paint.opacity(k)}
                {...rim(0.7, 0.4)}
              />
            );
          })}
        </>
      );
    }
    case "tent": {
      const n = 16;
      return (
        <>
          <rect x={X0} y={Y0} width={W} height={H} fill={paint.fill(0)} fillOpacity={paint.opacity(0) * 0.85} />
          {Array.from({ length: n }, (_, k) => {
            const a = (k / n) * Math.PI * 2;
            const next = ((k + 1) / n) * Math.PI * 2;
            return k % 2 === 1 ? (
              <path
                key={`w${k}`}
                d={`M ${CX} ${CY} L ${pt(rectHit(a))} L ${pt(rectHit(next))} Z`}
                fill={paint.fill(1)}
                fillOpacity={paint.opacity(1) * 0.35}
              />
            ) : null;
          })}
          {Array.from({ length: n }, (_, k) => (
            <path key={`s${k}`} d={`M ${CX} ${CY} L ${pt(rectHit((k / n) * Math.PI * 2))}`} {...line} />
          ))}
          {[0.66, 0.36].map((s) => (
            <rect
              key={s}
              x={CX - (W / 2) * s}
              y={CY - (H / 2) * s}
              width={W * s}
              height={H * s}
              rx={2 * s}
              {...line}
              strokeDasharray="1.2 1.4"
            />
          ))}
        </>
      );
    }
    case "swag_rows": {
      const rows = 5;
      const spacing = H / rows;
      const h = spacing * 0.34;
      return (
        <>
          {Array.from({ length: rows }, (_, r) => {
            const yc = Y0 + spacing * (r + 0.5);
            return (
              <g key={r}>
                <path
                  d={`M ${X0} ${r1(yc - h)} Q ${CX} ${r1(yc - h + 2.6)} ${X1} ${r1(yc - h)} L ${X1} ${r1(yc + h)} Q ${CX} ${r1(yc + h + 2.6)} ${X0} ${r1(yc + h)} Z`}
                  fill={paint.fill(r)}
                  fillOpacity={paint.opacity(r)}
                />
                <path d={`M ${X0} ${r1(yc)} Q ${CX} ${r1(yc + 3.2)} ${X1} ${r1(yc)}`} {...line} strokeDasharray="1.5 1.2" />
              </g>
            );
          })}
        </>
      );
    }
    case "billow_rows": {
      const rows = 4;
      const puffs = 4;
      const spacing = H / rows;
      const h = spacing * 0.3;
      return (
        <>
          {Array.from({ length: rows }, (_, r) => {
            const yc = Y0 + spacing * (r + 0.5);
            const xs = Array.from({ length: puffs + 1 }, (_, i) => X0 + (W * i) / puffs);
            let d = `M ${X0} ${r1(yc - 0.8)}`;
            for (let i = 0; i < puffs; i++) {
              const mid = (xs[i] + xs[i + 1]) / 2;
              d += ` Q ${r1(mid)} ${r1(yc - h * 2)} ${r1(xs[i + 1])} ${r1(yc - 0.8)}`;
            }
            d += ` L ${X1} ${r1(yc + 0.8)}`;
            for (let i = puffs; i > 0; i--) {
              const mid = (xs[i] + xs[i - 1]) / 2;
              d += ` Q ${r1(mid)} ${r1(yc + h * 2)} ${r1(xs[i - 1])} ${r1(yc + 0.8)}`;
            }
            d += " Z";
            return (
              <g key={r}>
                <path d={d} fill={paint.fill(r)} fillOpacity={paint.opacity(r)} />
                {xs.slice(1, -1).map((x) => (
                  <path
                    key={x}
                    d={`M ${r1(x)} ${r1(yc - 2.2)} L ${r1(x)} ${r1(yc + 2.2)}`}
                    {...line}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            );
          })}
        </>
      );
    }
    case "stretch_panels": {
      const rows = 4;
      const spacing = H / rows;
      const h = spacing * 0.36;
      return (
        <>
          {Array.from({ length: rows }, (_, r) => {
            const yc = Y0 + spacing * (r + 0.5);
            return (
              <g key={r}>
                <rect
                  x={X0 + 1.5}
                  y={r1(yc - h)}
                  width={W - 3}
                  height={r1(h * 2)}
                  rx={0.8}
                  fill={paint.fill(r)}
                  fillOpacity={paint.opacity(r)}
                  {...rim(0.8, 0.4)}
                />
                <path d={`M ${X0 + 3} ${r1(yc - h * 0.45)} L ${X1 - 3} ${r1(yc - h * 0.45)}`} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.6} />
              </g>
            );
          })}
        </>
      );
    }
    case "crisscross": {
      const families = [32, -32];
      return (
        <g clipPath={`url(#${clipId})`}>
          {families.map((angle, f) => (
            <g key={angle} transform={`rotate(${angle} ${CX} ${CY})`}>
              {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
                <rect
                  key={k}
                  x={-30}
                  y={CY + k * 12.5 - 3}
                  width={160}
                  height={6}
                  fill={paint.fill(f)}
                  fillOpacity={paint.opacity(f) * 0.85}
                  {...rim(0.6, 0.35)}
                />
              ))}
            </g>
          ))}
        </g>
      );
    }
    case "perimeter_swag": {
      const edges: Array<{ a: Pt; b: Pt; n: number; inward: Pt }> = [
        { a: { x: X0, y: Y0 }, b: { x: X1, y: Y0 }, n: 6, inward: { x: 0, y: 1 } },
        { a: { x: X1, y: Y0 }, b: { x: X1, y: Y1 }, n: 4, inward: { x: -1, y: 0 } },
        { a: { x: X1, y: Y1 }, b: { x: X0, y: Y1 }, n: 6, inward: { x: 0, y: -1 } },
        { a: { x: X0, y: Y1 }, b: { x: X0, y: Y0 }, n: 4, inward: { x: 1, y: 0 } },
      ];
      let index = 0;
      return (
        <>
          {edges.flatMap((edge) =>
            Array.from({ length: edge.n }, (_, s) => {
              const t0 = s / edge.n;
              const t1 = (s + 1) / edge.n;
              const p = { x: edge.a.x + (edge.b.x - edge.a.x) * t0, y: edge.a.y + (edge.b.y - edge.a.y) * t0 };
              const q = { x: edge.a.x + (edge.b.x - edge.a.x) * t1, y: edge.a.y + (edge.b.y - edge.a.y) * t1 };
              const ctrl = {
                x: (p.x + q.x) / 2 + edge.inward.x * 12,
                y: (p.y + q.y) / 2 + edge.inward.y * 12,
              };
              const i = index++;
              return (
                <g key={`${edge.a.x}-${edge.a.y}-${s}`}>
                  <path
                    d={`M ${pt(p)} Q ${pt(ctrl)} ${pt(q)} Z`}
                    fill={paint.fill(i)}
                    fillOpacity={paint.opacity(i)}
                    {...rim(0.7, 0.4)}
                  />
                  <circle cx={r1(p.x)} cy={r1(p.y)} r={0.9} fill={paint.stroke} fillOpacity={0.9} />
                </g>
              );
            })
          )}
        </>
      );
    }
    case "cascades": {
      const cols = 4;
      const rows = 3;
      return (
        <>
          {Array.from({ length: rows * cols }, (_, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = X0 + (W * (c + 0.5)) / cols;
            const y = Y0 + (H * (r + 0.5)) / rows;
            return (
              <g key={i}>
                <circle cx={r1(x)} cy={r1(y)} r={6} fill={paint.fill(i)} fillOpacity={paint.opacity(i) * 0.55} />
                <circle cx={r1(x)} cy={r1(y)} r={3.6} fill={paint.fill(i)} fillOpacity={paint.opacity(i)} />
                {[0, 1, 2, 3, 4, 5].map((k) => {
                  const a = (k / 6) * Math.PI * 2;
                  return (
                    <path
                      key={k}
                      d={`M ${r1(x + Math.cos(a) * 1.2)} ${r1(y + Math.sin(a) * 1.2)} L ${r1(x + Math.cos(a) * 5.4)} ${r1(y + Math.sin(a) * 5.4)}`}
                      {...line}
                      strokeWidth={0.35}
                    />
                  );
                })}
                <circle cx={r1(x)} cy={r1(y)} r={1.1} fill={paint.stroke} />
              </g>
            );
          })}
        </>
      );
    }
  }
}

function LightsOverlay({ lights, hex }: { lights: CeilingLightStyle; hex: string }) {
  if (lights === "none") return null;
  if (lights === "bistro") {
    const strands = [0.28, 0.56, 0.84];
    return (
      <>
        {strands.map((f) => {
          const y = Y0 + H * f - 4;
          const bulbs = 9;
          // Quadratic strand from wall to wall, dipping 6 units at mid-span.
          const at = (t: number) => ({
            x: X0 + W * t,
            y: y + 6 * 4 * t * (1 - t),
          });
          return (
            <g key={f}>
              <path d={`M ${X0} ${r1(y)} Q ${CX} ${r1(y + 12)} ${X1} ${r1(y)}`} fill="none" stroke="#2b2620" strokeWidth={0.5} />
              {Array.from({ length: bulbs }, (_, i) => {
                const p = at((i + 0.5) / bulbs);
                return (
                  <g key={i}>
                    <circle cx={r1(p.x)} cy={r1(p.y)} r={2.2} fill={hex} fillOpacity={0.18} />
                    <circle cx={r1(p.x)} cy={r1(p.y)} r={0.95} fill={hex} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </>
    );
  }
  const count = lights === "fairy" ? 48 : 40;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = X0 + 2 + noise(i, 1) * (W - 4);
        const y = Y0 + 2 + noise(i, 2) * (H - 4);
        const glow = noise(i, 3);
        if (lights === "starlight") {
          const r = 0.25 + glow * 0.45;
          return (
            <circle key={i} cx={r1(x)} cy={r1(y)} r={r1(r * 10) / 10} fill={hex} fillOpacity={0.45 + glow * 0.55} />
          );
        }
        return (
          <g key={i}>
            <circle cx={r1(x)} cy={r1(y)} r={1.3} fill={hex} fillOpacity={0.14} />
            <circle cx={r1(x)} cy={r1(y)} r={0.45} fill={hex} fillOpacity={0.7 + glow * 0.3} />
          </g>
        );
      })}
    </>
  );
}

function HubDecorMark({ decor }: { decor: CeilingHubDecor }) {
  switch (decor) {
    case "chandelier":
      return (
        <g>
          <circle cx={CX} cy={CY} r={6} fill="#fff4cf" fillOpacity={0.16} />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * Math.PI * 2;
            return (
              <path
                key={k}
                d={`M ${r1(CX + Math.cos(a) * 1.4)} ${r1(CY + Math.sin(a) * 1.4)} L ${r1(CX + Math.cos(a) * 4.2)} ${r1(CY + Math.sin(a) * 4.2)}`}
                stroke="#fff4cf"
                strokeWidth={0.6}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={CX} cy={CY} r={2} fill="#fff8e1" stroke="var(--primary)" strokeWidth={0.5} />
        </g>
      );
    case "floral_ring":
      return (
        <g>
          {Array.from({ length: 9 }, (_, k) => {
            const a = (k / 9) * Math.PI * 2;
            return (
              <circle
                key={k}
                cx={r1(CX + Math.cos(a) * 3.2)}
                cy={r1(CY + Math.sin(a) * 3.2)}
                r={1.25}
                fill={k % 3 === 0 ? "#9caf88" : k % 3 === 1 ? "#f4f2ed" : "#c99b9e"}
              />
            );
          })}
        </g>
      );
    case "rosette":
      return (
        <g fill="none" stroke="var(--primary)" strokeWidth={0.5}>
          <circle cx={CX} cy={CY} r={3.6} fill="#f4f2ed" fillOpacity={0.35} />
          <circle cx={CX} cy={CY} r={2.3} />
          <circle cx={CX} cy={CY} r={1} fill="var(--primary)" />
        </g>
      );
    case "medallion":
      return (
        <g>
          <circle cx={CX} cy={CY} r={3.8} fill="#b98b3d" stroke="#f6dc8f" strokeWidth={0.6} />
          <circle cx={CX} cy={CY} r={2.2} fill="none" stroke="#f6dc8f" strokeWidth={0.4} />
        </g>
      );
    default:
      return (
        <circle cx={CX} cy={CY} r={2.4} fill="var(--background)" stroke="var(--primary)" strokeWidth={0.7} />
      );
  }
}

/** Memoized: props are primitives, so library grids skip unchanged art. */
export const CeilingStyleArt = memo(function CeilingStyleArt({
  style,
  color,
  accentColor,
  lights = "none",
  lightColor = "gold",
  hubDecor,
  title,
  className,
}: {
  style: CeilingDrapeStyle;
  /** Tints the fabric; omit for gold line art. */
  color?: DrapeColor;
  accentColor?: DrapeColor | null;
  lights?: CeilingLightStyle;
  lightColor?: DrapeColor;
  /** Radial styles only; omit for a bare hub. */
  hubDecor?: CeilingHubDecor;
  /** Accessible name; decorative when omitted. */
  title?: string;
  className?: string;
}) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const paint = makePaint(color, accentColor);
  const tinted = Boolean(color);
  return (
    <svg
      viewBox="0 0 100 64"
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-full w-full", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={tinted ? 0.14 : 0.22} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}-room`}>
          <rect x={X0} y={Y0} width={W} height={H} rx={1.5} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={100} height={64} fill="#0c0a08" />
      <rect x={0} y={0} width={100} height={64} fill={`url(#${id}-glow)`} />
      <g clipPath={`url(#${id}-room)`}>
        <StyleShapes style={style} paint={paint} clipId={`${id}-room`} />
        <LightsOverlay lights={lights} hex={getDrapeColorHex(lightColor)} />
      </g>
      {ceilingUsesHub(style) ? <HubDecorMark decor={hubDecor ?? "none"} /> : null}
      <rect
        x={X0}
        y={Y0}
        width={W}
        height={H}
        rx={1.5}
        fill="none"
        stroke="var(--primary)"
        strokeOpacity={0.55}
        strokeWidth={0.7}
      />
    </svg>
  );
});

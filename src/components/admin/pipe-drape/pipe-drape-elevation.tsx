"use client";

import { useId } from "react";
import { formatFeetInches, type PipeDrapeRunResult } from "@/lib/pipe-drape";
import { svgSafeId, useElementWidth } from "@/components/admin/pipe-drape/use-element-width";

const MAX_HEIGHT_PX = 380;
const MIN_PX_PER_FT = 7;
const LEFT = 52;
const TOP = 40;
const BOTTOM = 70;
const PERSON_FT = 5.75;

type PipeDrapeElevationProps = {
  run: PipeDrapeRunResult;
  heightFt: number;
  colorHex: string;
  fullness: number;
  panelWidthIn: number;
  puddleIn: number;
  baseWidthIn: number;
};

/** Front elevation of one straight run, drawn to scale. */
export function PipeDrapeElevation({
  run,
  heightFt,
  colorHex,
  fullness,
  panelWidthIn,
  puddleIn,
  baseWidthIn,
}: PipeDrapeElevationProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const uid = svgSafeId(useId());
  const H = Math.max(1, heightFt);
  const len = run.lengthFt;

  const fitWidth = (width - LEFT - 28) / (len + 2.2);
  const fitHeight = (MAX_HEIGHT_PX - TOP - BOTTOM) / Math.max(H, PERSON_FT);
  const px = Math.max(MIN_PX_PER_FT, Math.min(fitWidth, fitHeight));
  const right = 28 + 2.2 * px;
  const svgWidth = Math.ceil(LEFT + len * px + right);
  const svgHeight = Math.ceil(TOP + H * px + BOTTOM);

  const X = (ft: number) => LEFT + ft * px;
  const floorY = TOP + H * px;
  const Y = (ftAboveFloor: number) => floorY - ftAboveFloor * px;

  const pipe = Math.max(2.5, (1.9 / 12) * px);
  const barThick = Math.max(2, (1.25 / 12) * px);
  const plateW = (baseWidthIn / 12) * px;
  const plateH = Math.max(2.5, (0.6 / 12) * px);
  const crossbarY = Y(H);
  const drapeTop = crossbarY + barThick * 0.6;
  const puddlePx = Math.min(18, (puddleIn / 12) * px * 0.35);
  const foldsPerFt = fullness <= 1 ? 0 : (fullness - 0.5) * 1.35;
  const foldW = foldsPerFt > 0 ? px / foldsPerFt : (panelWidthIn / 12) * px;
  const hemAmp = fullness <= 1 ? 0 : Math.min(6, 1 + fullness * 1.2);
  const uprightXs = Array.from({ length: run.bays + 1 }, (_, i) => X(i * run.bayFt));
  const showBayLabels = run.bayFt * px >= 38;

  function drapePath(x0: number, x1: number) {
    const bottom = floorY + puddlePx * 0.5;
    if (hemAmp === 0) return `M${x0},${drapeTop} L${x1},${drapeTop} L${x1},${bottom} L${x0},${bottom} Z`;
    const n = Math.max(1, Math.round((x1 - x0) / foldW));
    const step = (x1 - x0) / n;
    const flare = puddlePx;
    let d = `M${x0},${drapeTop} L${x1},${drapeTop} L${x1 + flare * 0.25},${bottom}`;
    for (let k = n; k > 0; k -= 1) {
      const a = x0 + k * step;
      const b = a - step;
      d += ` Q${(a + b) / 2},${bottom + hemAmp * (k % 2 ? 1 : 0.4)} ${b},${bottom}`;
    }
    return `${d} L${x0 - flare * 0.25},${bottom} Z`;
  }

  const person = {
    x: X(len) + 18 + 0.6 * px,
    head: 0.42 * px,
  };

  return (
    <div ref={ref} className="w-full overflow-x-auto overscroll-x-contain">
      {width > 0 ? (
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label={`${run.label}: ${formatFeetInches(len)} long, ${run.bays} bays, ${formatFeetInches(H)} high`}
          className="block"
        >
          <defs>
            <linearGradient id={`${uid}-steel-v`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#7d858d" />
              <stop offset="0.45" stopColor="#eef1f4" />
              <stop offset="1" stopColor="#8a9299" />
            </linearGradient>
            <linearGradient id={`${uid}-steel-h`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f2f4f6" />
              <stop offset="1" stopColor="#80888f" />
            </linearGradient>
            <linearGradient id={`${uid}-fold`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.42" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#000" stopOpacity="0.42" />
            </linearGradient>
            <pattern id={`${uid}-folds`} patternUnits="userSpaceOnUse" width={foldW} height={svgHeight}>
              {foldsPerFt > 0 ? (
                <rect width={foldW} height={svgHeight} fill={`url(#${uid}-fold)`} />
              ) : (
                <rect width={Math.max(1, px * 0.04)} height={svgHeight} fill="#000" fillOpacity="0.22" />
              )}
            </pattern>
            <linearGradient id={`${uid}-shade`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
              <stop offset="0.7" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.28" />
            </linearGradient>
            <radialGradient id={`${uid}-floor`} cx="0.5" cy="0" r="0.6">
              <stop offset="0" stopColor="#000" stopOpacity="0.22" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse
            cx={X(len / 2)}
            cy={floorY + 3}
            rx={(len * px) / 2 + 20}
            ry={10}
            fill={`url(#${uid}-floor)`}
          />
          <line x1={8} x2={svgWidth - 8} y1={floorY} y2={floorY} className="stroke-border" strokeWidth={1.5} />

          {uprightXs.slice(0, -1).map((x0, i) => {
            const x1 = uprightXs[i + 1];
            const path = drapePath(x0 + pipe * 0.6, x1 - pipe * 0.6);
            return (
              <g key={`bay-${i}`}>
                <path d={path} fill={colorHex} />
                <path d={path} fill={`url(#${uid}-folds)`} />
                <path d={path} fill={`url(#${uid}-shade)`} />
                <path d={path} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth={0.75} />
              </g>
            );
          })}

          <rect
            x={X(0) - pipe / 2}
            y={crossbarY}
            width={len * px + pipe}
            height={barThick}
            rx={barThick / 2}
            fill={`url(#${uid}-steel-h)`}
            stroke="#5f666d"
            strokeOpacity="0.45"
            strokeWidth={0.6}
          />

          {uprightXs.map((x, i) => {
            const shared = (i === 0 && run.sharesStart) || (i === run.bays && run.sharesEnd);
            const capTop = crossbarY - Math.max(5, 0.35 * px);
            return (
              <g key={`up-${i}`}>
                <rect
                  x={x - plateW / 2}
                  y={floorY - plateH}
                  width={plateW}
                  height={plateH}
                  rx={1}
                  fill={`url(#${uid}-steel-h)`}
                  stroke="#5f666d"
                  strokeOpacity="0.5"
                  strokeWidth={0.6}
                />
                <rect
                  x={x - pipe / 2}
                  y={capTop}
                  width={pipe}
                  height={floorY - plateH - capTop}
                  rx={pipe / 2}
                  fill={`url(#${uid}-steel-v)`}
                  stroke="#5f666d"
                  strokeOpacity="0.45"
                  strokeWidth={0.6}
                />
                {shared ? (
                  <g>
                    <circle cx={x} cy={capTop - 9} r={5} className="fill-primary" />
                    <circle cx={x} cy={capTop - 9} r={8.5} className="fill-none stroke-primary/40" strokeWidth={1.5} />
                    <text
                      x={x}
                      y={capTop - 21}
                      textAnchor={i === 0 ? "start" : "end"}
                      className="fill-primary text-[10px] font-semibold tracking-[0.14em] uppercase"
                    >
                      Corner
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          <g className="text-muted-foreground" opacity={0.45}>
            <circle cx={person.x} cy={Y(PERSON_FT) + person.head} r={person.head} fill="currentColor" />
            <path
              d={`M${person.x - 0.55 * px},${Y(PERSON_FT) + person.head * 2.3}
                  h${1.1 * px} l${0.12 * px},${2.3 * px} h${-0.32 * px} l${-0.06 * px},${2.55 * px}
                  h${-0.3 * px} l${-0.04 * px},${-2.3 * px} l${-0.04 * px},${2.3 * px} h${-0.3 * px}
                  l${-0.06 * px},${-2.55 * px} h${-0.32 * px} Z`}
              fill="currentColor"
            />
            <title>Person for scale (5′9″)</title>
          </g>

          <g className="stroke-muted-foreground/70" strokeWidth={1}>
            <line x1={LEFT - 24} x2={LEFT - 24} y1={crossbarY} y2={floorY} />
            <line x1={LEFT - 30} x2={LEFT - 18} y1={crossbarY} y2={crossbarY} />
            <line x1={LEFT - 30} x2={LEFT - 18} y1={floorY} y2={floorY} />
          </g>
          <text
            x={LEFT - 30}
            y={(crossbarY + floorY) / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${LEFT - 30} ${(crossbarY + floorY) / 2})`}
            className="fill-foreground text-[11px] font-semibold tabular-nums"
          >
            {formatFeetInches(H)} high
          </text>

          {showBayLabels
            ? uprightXs.slice(0, -1).map((x0, i) => {
                const x1 = uprightXs[i + 1];
                const y = floorY + 22;
                return (
                  <g key={`dim-${i}`}>
                    <line x1={x0} x2={x1} y1={y} y2={y} className="stroke-muted-foreground/50" strokeWidth={1} />
                    <line x1={x0} x2={x0} y1={y - 4} y2={y + 4} className="stroke-muted-foreground/50" strokeWidth={1} />
                    <line x1={x1} x2={x1} y1={y - 4} y2={y + 4} className="stroke-muted-foreground/50" strokeWidth={1} />
                    <text
                      x={(x0 + x1) / 2}
                      y={y - 5}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] tabular-nums"
                    >
                      {formatFeetInches(run.bayFt)}
                    </text>
                  </g>
                );
              })
            : null}

          <g>
            <line x1={X(0)} x2={X(len)} y1={floorY + 50} y2={floorY + 50} className="stroke-primary/70" strokeWidth={1.25} />
            <line x1={X(0)} x2={X(0)} y1={floorY + 44} y2={floorY + 56} className="stroke-primary/70" strokeWidth={1.25} />
            <line x1={X(len)} x2={X(len)} y1={floorY + 44} y2={floorY + 56} className="stroke-primary/70" strokeWidth={1.25} />
            <rect
              x={X(len / 2) - 64}
              y={floorY + 41}
              width={128}
              height={18}
              rx={9}
              className="fill-card stroke-primary/40"
              strokeWidth={1}
            />
            <text
              x={X(len / 2)}
              y={floorY + 54}
              textAnchor="middle"
              className="fill-primary text-[11px] font-semibold tabular-nums"
            >
              {formatFeetInches(len)} · {run.bays} {run.bays === 1 ? "bay" : "bays"}
            </text>
          </g>
        </svg>
      ) : (
        <div style={{ height: 260 }} />
      )}
    </div>
  );
}

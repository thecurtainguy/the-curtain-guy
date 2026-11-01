"use client";

import { useId } from "react";
import { formatFeetInches, type PipeDrapeRunResult } from "@/lib/pipe-drape";
import { svgSafeId, useElementWidth } from "@/components/pipe-drape/use-element-width";

const MAX_HEIGHT_PX = 380;
const PAD = 56;
const CHAIN_GAP_FT = 8;
/** Clockwise turns in screen space (y grows downward). */
const HEADINGS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

type PlacedRun = {
  run: PipeDrapeRunResult;
  index: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  dir: { x: number; y: number };
};

function layoutRuns(runs: PipeDrapeRunResult[]): PlacedRun[] {
  const placed: PlacedRun[] = [];
  let chain: PlacedRun[] = [];
  let heading = 0;
  let cursor = { x: 0, y: 0 };
  let offsetX = 0;

  function closeChain() {
    if (chain.length === 0) return;
    const minX = Math.min(...chain.flatMap((p) => [p.start.x, p.end.x]));
    const maxX = Math.max(...chain.flatMap((p) => [p.start.x, p.end.x]));
    const minY = Math.min(...chain.flatMap((p) => [p.start.y, p.end.y]));
    const shift = offsetX - minX;
    for (const p of chain) {
      p.start = { x: p.start.x + shift, y: p.start.y - minY };
      p.end = { x: p.end.x + shift, y: p.end.y - minY };
    }
    offsetX += maxX - minX + CHAIN_GAP_FT;
    chain = [];
  }

  runs.forEach((run, index) => {
    if (index === 0 || !run.sharesStart) {
      closeChain();
      const joined = runs[index + 1]?.sharesStart ?? false;
      // Corner layouts start up the left wall so U-shapes read as ⊓ and rooms as rectangles.
      heading = joined ? 3 : 0;
      cursor = { x: 0, y: 0 };
    } else {
      heading = (heading + 1) % 4;
    }
    const dir = HEADINGS[heading];
    const start = { ...cursor };
    const end = { x: start.x + dir.x * run.lengthFt, y: start.y + dir.y * run.lengthFt };
    const item = { run, index, start, end, dir };
    chain.push(item);
    placed.push(item);
    cursor = end;
  });
  closeChain();
  return placed;
}

type PipeDrapePlanProps = {
  runs: PipeDrapeRunResult[];
  colorHex: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Feet unit for the scale bar ("ft", "pi"). */
  feetUnit?: string;
  showRunLabel?: (label: string) => string;
};

/** Top-down layout, to scale. Connected runs turn 90° at their shared corner. */
export function PipeDrapePlan({
  runs,
  colorHex,
  selectedId,
  onSelect,
  feetUnit = "ft",
  showRunLabel = (label) => `Show ${label} elevation`,
}: PipeDrapePlanProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const uid = svgSafeId(useId());
  const placed = layoutRuns(runs);

  const xs = placed.flatMap((p) => [p.start.x, p.end.x]);
  const ys = placed.flatMap((p) => [p.start.y, p.end.y]);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(1, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(0.01, maxY - minY);
  const scale = Math.max(
    2,
    Math.min((width - PAD * 2) / spanX, spanY > 0.5 ? (MAX_HEIGHT_PX - PAD * 2) / spanY : Infinity, 40)
  );
  const svgWidth = Math.max(width, Math.ceil(spanX * scale + PAD * 2));
  const svgHeight = Math.ceil(spanY * scale + PAD * 2);
  const ox = (svgWidth - spanX * scale) / 2;
  const P = (pt: { x: number; y: number }) => ({ x: ox + (pt.x - minX) * scale, y: PAD + (pt.y - minY) * scale });
  const gridFt = spanX > 120 ? 20 : spanX > 50 ? 10 : 5;
  const scaleBarFt = gridFt;
  const drapeWidth = Math.max(5, Math.min(12, scale * 0.9));

  return (
    <div ref={ref} className="w-full overflow-x-auto overscroll-x-contain">
      {width > 0 ? (
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} role="img" aria-label="Floor plan of the drape runs" className="block">
          <defs>
            <pattern id={`${uid}-grid`} patternUnits="userSpaceOnUse" width={gridFt * scale} height={gridFt * scale} x={ox} y={PAD}>
              <path
                d={`M${gridFt * scale},0 L0,0 L0,${gridFt * scale}`}
                fill="none"
                className="stroke-border"
                strokeOpacity={0.55}
                strokeWidth={1}
              />
            </pattern>
          </defs>
          <rect width={svgWidth} height={svgHeight} fill={`url(#${uid}-grid)`} />

          {placed.map(({ run, index, start, end, dir }) => {
            const a = P(start);
            const b = P(end);
            const selected = run.id === selectedId;
            const normal = { x: dir.y, y: -dir.x };
            const label = `${run.label} · ${formatFeetInches(run.lengthFt)}`;
            const labelW = label.length * 6.4 + 20;
            const offset = dir.x === 0 ? labelW / 2 + drapeWidth + 8 : drapeWidth + 16;
            const mid = { x: (a.x + b.x) / 2 + normal.x * offset, y: (a.y + b.y) / 2 + normal.y * offset };
            return (
              <g
                key={run.id}
                role="button"
                tabIndex={0}
                aria-label={showRunLabel(run.label)}
                className="cursor-pointer outline-none"
                onClick={() => onSelect(run.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(run.id);
                  }
                }}
              >
                {selected ? (
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="stroke-primary/35"
                    strokeWidth={drapeWidth + 10}
                    strokeLinecap="round"
                  />
                ) : null}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorHex} strokeWidth={drapeWidth} strokeLinecap="butt" />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#000"
                  strokeOpacity={0.25}
                  strokeWidth={drapeWidth}
                  strokeDasharray={`${Math.max(2, scale * 0.25)} ${Math.max(2, scale * 0.25)}`}
                />
                {Array.from({ length: run.bays + 1 }, (_, i) => {
                  const t = (i * run.bayFt) / run.lengthFt;
                  const x = a.x + (b.x - a.x) * t;
                  const y = a.y + (b.y - a.y) * t;
                  const corner = (i === 0 && run.sharesStart) || (i === run.bays && run.sharesEnd);
                  if (i === 0 && run.sharesStart) return null;
                  return corner ? (
                    <g key={i}>
                      <circle cx={x} cy={y} r={drapeWidth * 0.75 + 3} className="fill-primary/25" />
                      <circle cx={x} cy={y} r={drapeWidth * 0.5 + 1.5} className="fill-primary stroke-card" strokeWidth={1.5} />
                    </g>
                  ) : (
                    <circle key={i} cx={x} cy={y} r={drapeWidth * 0.45 + 1} className="fill-card stroke-foreground/70" strokeWidth={1.5} />
                  );
                })}
                <g>
                  <rect
                    x={mid.x - labelW / 2}
                    y={mid.y - 10}
                    width={labelW}
                    height={20}
                    rx={10}
                    className={selected ? "fill-primary stroke-primary" : "fill-card stroke-border"}
                    strokeWidth={1}
                  />
                  <text
                    x={mid.x}
                    y={mid.y + 4}
                    textAnchor="middle"
                    className={selected ? "fill-primary-foreground text-[11px] font-semibold" : "fill-foreground text-[11px] font-medium"}
                  >
                    {label}
                  </text>
                  <circle cx={mid.x - labelW / 2 + 1} cy={mid.y - 9} r={7} className="fill-primary" />
                  <text x={mid.x - labelW / 2 + 1} y={mid.y - 6} textAnchor="middle" className="fill-primary-foreground text-[9px] font-bold">
                    {index + 1}
                  </text>
                </g>
              </g>
            );
          })}

          <g transform={`translate(${16}, ${svgHeight - 18})`}>
            <line x1={0} x2={scaleBarFt * scale} y1={0} y2={0} className="stroke-foreground/70" strokeWidth={2} />
            <line x1={0} x2={0} y1={-4} y2={4} className="stroke-foreground/70" strokeWidth={2} />
            <line x1={scaleBarFt * scale} x2={scaleBarFt * scale} y1={-4} y2={4} className="stroke-foreground/70" strokeWidth={2} />
            <text x={scaleBarFt * scale + 8} y={4} className="fill-muted-foreground text-[10px]">
              {scaleBarFt} {feetUnit}
            </text>
          </g>
        </svg>
      ) : (
        <div style={{ height: 240 }} />
      )}
    </div>
  );
}

"use client";

import {
  getDrapeColorHex,
  type StudioDrapeRun,
  type StudioOpening,
  type StudioTreatment,
} from "@/data/studio";

/*
 * Plan symbols for wall-anchored items, drawn in a local wall frame:
 * x runs along the wall (inches from the wall start), +y points INTO the room,
 * the wall band occupies y ∈ [-wallThickness, 0].
 */

/** Inches from the wall face to the drape line. */
export const DRAPE_PLAN_INSET = 5;
/** Inches from the wall face to a treatment's base line. */
export const TREATMENT_PLAN_BASE = 12;

function pleatPath(start: number, end: number, y: number, fullness: number): string {
  const span = Math.max(0, end - start);
  let wavelength = Math.min(12, Math.max(6, 14 - fullness * 2.5));
  if (span / (wavelength / 2) > 600) wavelength = span / 300;
  const amplitude = 1.4 + Math.min(4, Math.max(1, fullness)) * 0.55;
  const halfWaves = Math.max(1, Math.round(span / (wavelength / 2)));
  const step = span / halfWaves;
  let d = `M${start} ${y}`;
  for (let index = 0; index < halfWaves; index += 1) {
    const x0 = start + index * step;
    const direction = index % 2 === 0 ? 1 : -1;
    d += ` Q${x0 + step / 2} ${y + amplitude * direction} ${x0 + step} ${y}`;
  }
  return d;
}

/** Evenly spaced upright positions (≤ 10 ft apart), including both ends. */
export function getUprightOffsets(start: number, end: number, maxSpacing = 120): number[] {
  const span = Math.max(0, end - start);
  const segments = Math.max(1, Math.ceil(span / maxSpacing));
  return Array.from({ length: segments + 1 }, (_, index) => start + (span * index) / segments);
}

export function DrapeSymbol({
  run,
  pixelsPerInch,
  uplightGradientId,
}: {
  run: StudioDrapeRun;
  pixelsPerInch: number;
  uplightGradientId?: string;
}) {
  const color = getDrapeColorHex(run.color);
  const start = run.startOffset;
  const end = run.endOffset;
  const span = Math.max(1, end - start);
  const y = DRAPE_PLAN_INSET;
  const px = (value: number) => value / Math.max(pixelsPerInch, 1e-6);
  const fabricWidth = Math.max(2.2, px(2.5));
  const path = pleatPath(start, end, y, run.fullness);
  const hardware = run.hardware ?? "pipe_and_drape";
  const dash = run.type === "divider" ? `${Math.max(10, px(10))} ${Math.max(6, px(6))}` : undefined;
  const uprights = hardware === "pipe_and_drape" ? getUprightOffsets(start, end) : [];
  const uplights = run.uplightColor
    ? (uprights.length > 1
        ? uprights.slice(0, -1).map((offset, index) => (offset + uprights[index + 1]) / 2)
        : getUprightOffsets(start, end, 84)
            .slice(0, -1)
            .map((offset, index, list) => (offset + (list[index + 1] ?? end)) / 2)
      ).filter((offset) => offset > start && offset < end)
    : [];
  const uplightHex = run.uplightColor ? getDrapeColorHex(run.uplightColor) : null;

  return (
    <g>
      {uplightHex && uplightGradientId
        ? uplights.map((offset) => (
            <ellipse
              key={`glow-${offset}`}
              cx={offset}
              cy={y + 8}
              rx={Math.min(30, span / 2)}
              ry={20}
              fill={`url(#${uplightGradientId})`}
            />
          ))
        : null}
      <rect
        x={start}
        y={1}
        width={span}
        height={y + 4}
        fill={color}
        fillOpacity={0.16}
      />
      {run.puddle ? (
        <path
          d={pleatPath(start, end, y + 3.5, run.fullness * 0.6)}
          fill="none"
          stroke={color}
          strokeOpacity={0.35}
          strokeWidth={fabricWidth * 1.4}
          strokeDasharray={dash}
        />
      ) : null}
      <path
        d={path}
        fill="none"
        stroke="color-mix(in oklch, var(--background) 70%, black)"
        strokeOpacity={0.85}
        strokeWidth={fabricWidth + Math.max(1.2, px(1.6))}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={fabricWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
      {hardware === "ceiling_track" ? (
        <line
          x1={start}
          y1={1}
          x2={end}
          y2={1}
          stroke="var(--muted-foreground)"
          strokeWidth={1}
          strokeDasharray="6 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {hardware === "wall_mount"
        ? [start, end].map((offset) => (
            <line
              key={`mount-${offset}`}
              x1={offset}
              y1={0}
              x2={offset}
              y2={y}
              stroke="var(--muted-foreground)"
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
      {uprights.map((offset) => (
        <g key={`upright-${offset}`}>
          <rect
            x={offset - 4}
            y={y - 4}
            width={8}
            height={8}
            rx={1}
            fill="color-mix(in oklch, var(--foreground) 40%, transparent)"
            fillOpacity={0.35}
          />
          <circle
            cx={offset}
            cy={y}
            r={Math.max(1.8, px(2.6))}
            fill="#c9c4ba"
            stroke="color-mix(in oklch, var(--background) 60%, black)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {uplightHex
        ? uplights.map((offset) => (
            <circle
              key={`uplight-${offset}`}
              cx={offset}
              cy={y + 7}
              r={Math.max(1.6, px(2.4))}
              fill={uplightHex}
              stroke="var(--background)"
              strokeWidth={0.75}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
    </g>
  );
}

function SwagPath({
  span,
  baseY,
  depth,
  color,
  count = 1,
}: {
  span: number;
  baseY: number;
  depth: number;
  color: string;
  count?: number;
}) {
  const scallops = Math.max(1, Math.min(8, Math.round(count)));
  const width = span / scallops;
  return (
    <g>
      {Array.from({ length: scallops }, (_, index) => {
        const left = -span / 2 + index * width;
        const right = left + width;
        const middle = (left + right) / 2;
        return (
          <g key={index}>
            <path
              d={`M ${left} ${baseY} Q ${middle} ${baseY + depth * 0.18} ${right} ${baseY} Q ${middle} ${baseY + depth} ${left} ${baseY} Z`}
              fill={color}
              fillOpacity={0.78}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {[-0.28, 0, 0.28].map((offset) => (
              <path
                key={offset}
                d={`M ${middle + width * offset} ${baseY + 2} Q ${middle + width * offset * 0.55} ${baseY + depth * 0.62} ${middle} ${baseY + depth * 0.9}`}
                fill="none"
                stroke="var(--background)"
                strokeOpacity={0.28}
                strokeWidth={1.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Treatment glyph centred at x = 0 (span runs −span/2…span/2), +y inward. */
export function TreatmentGlyph({ treatment }: { treatment: StudioTreatment }) {
  const span = Math.max(1, treatment.anchor.endOffset - treatment.anchor.startOffset);
  const primary = getDrapeColorHex(treatment.color);
  const accent = getDrapeColorHex(treatment.secondaryColor);
  const opening = Math.min(span * 0.8, Math.max(12, treatment.openingWidth));
  const sideWidth = Math.max(6, (span - opening) / 2);
  const depth = Math.min(36, Math.max(10, treatment.swagDrop * 0.45));
  const baseY = TREATMENT_PLAN_BASE;
  const uplight = treatment.uplightColor ? getDrapeColorHex(treatment.uplightColor) : null;

  return (
    <g>
      {treatment.hasTopPipe ? (
        <line
          x1={-span / 2}
          y1={baseY - 6}
          x2={span / 2}
          y2={baseY - 6}
          stroke="#c9c4ba"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {treatment.type === "full_pleated_backdrop" ? (
        <>
          <line
            x1={-span / 2}
            y1={baseY}
            x2={span / 2}
            y2={baseY}
            stroke={primary}
            strokeWidth={10}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {Array.from({ length: Math.min(18, Math.max(4, Math.round(span / 30))) }).map(
            (_, index, folds) => {
              const x = -span / 2 + ((index + 0.5) / folds.length) * span;
              return (
                <line
                  key={index}
                  x1={x}
                  y1={baseY - 5}
                  x2={x}
                  y2={baseY + 5}
                  stroke="#000000"
                  strokeOpacity={0.28}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              );
            }
          )}
        </>
      ) : null}

      {treatment.type === "side_tieback_panels" ? (
        <>
          {treatment.hasBackdrop ? (
            <line
              x1={-span / 2}
              y1={baseY}
              x2={span / 2}
              y2={baseY}
              stroke={accent}
              strokeWidth={7}
              strokeOpacity={0.72}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <line
            x1={-span / 2}
            y1={baseY}
            x2={-span / 2 + sideWidth}
            y2={baseY + 3}
            stroke={primary}
            strokeWidth={11}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={span / 2 - sideWidth}
            y1={baseY + 3}
            x2={span / 2}
            y2={baseY}
            stroke={primary}
            strokeWidth={11}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={-opening / 2}
            y1={baseY + 3}
            x2={opening / 2}
            y2={baseY + 3}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.6}
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          {treatment.hasTiebacks ? (
            <>
              {[-opening / 2, opening / 2].map((x) => (
                <circle
                  key={x}
                  cx={x}
                  cy={baseY + 3}
                  r={4}
                  fill={accent}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </>
          ) : null}
          {treatment.hasTopSwag ? (
            <SwagPath span={span} baseY={baseY} depth={depth} color={accent} count={treatment.swagCount} />
          ) : null}
        </>
      ) : null}

      {treatment.type === "top_swag_valance" ? (
        <SwagPath span={span} baseY={baseY} depth={depth} color={primary} count={treatment.swagCount} />
      ) : null}

      {treatment.type === "layered_swag" ? (
        <>
          <SwagPath
            span={span}
            baseY={baseY}
            depth={depth}
            color={accent}
            count={treatment.swagCount ?? 3}
          />
          <SwagPath
            span={span * 0.92}
            baseY={baseY + 2}
            depth={depth * 0.7}
            color={primary}
            count={Math.max(1, (treatment.swagCount ?? 3) - 1)}
          />
        </>
      ) : null}

      {treatment.type === "ceremony_arch" ? (
        <>
          <path
            d={`M ${-span / 2} ${baseY + 18} V ${baseY} H ${span / 2} V ${baseY + 18}`}
            fill="none"
            stroke={accent}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={-span / 2 + 7}
            y1={baseY + 2}
            x2={-span / 2 + Math.max(18, sideWidth)}
            y2={baseY + 5}
            stroke={primary}
            strokeWidth={9}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={span / 2 - Math.max(18, sideWidth)}
            y1={baseY + 5}
            x2={span / 2 - 7}
            y2={baseY + 2}
            stroke={primary}
            strokeWidth={9}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {treatment.hasTopSwag ? (
            <SwagPath span={span * 0.88} baseY={baseY} depth={depth} color={primary} count={treatment.swagCount} />
          ) : null}
        </>
      ) : null}

      {treatment.hasFloralHeader ? (
        <g>
          {Array.from({ length: Math.min(9, Math.max(3, Math.round(span / 24))) }).map(
            (_, index, list) => {
              const x = -span / 2 + ((index + 0.5) / list.length) * span;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={baseY - 2}
                  r={3}
                  fill={index % 2 === 0 ? "#e9c7c9" : "#f4f1e9"}
                  stroke="#6d8a5b"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            }
          )}
        </g>
      ) : null}

      {uplight
        ? [-span / 2 + 8, span / 2 - 8].map((x) => (
            <circle
              key={`uplight-${x}`}
              cx={x}
              cy={baseY + 14}
              r={3}
              fill={uplight}
              stroke="var(--background)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
    </g>
  );
}

/** Opening symbol from x = 0 to x = width on the wall line. */
export function OpeningSymbol({
  opening,
  width,
  wallThickness,
  floorFill,
  selected,
}: {
  opening: StudioOpening;
  width: number;
  wallThickness: number;
  floorFill: string;
  selected: boolean;
}) {
  const t = wallThickness;
  const frame = selected
    ? "var(--primary)"
    : "color-mix(in oklch, var(--foreground) 78%, var(--background))";
  const jambs = (
    <>
      <line x1={0} y1={-t} x2={0} y2={0} stroke={frame} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
      <line x1={width} y1={-t} x2={width} y2={0} stroke={frame} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
    </>
  );

  if (opening.type === "window") {
    return (
      <g>
        <rect x={0} y={-t} width={width} height={t} fill="var(--background)" />
        <line x1={0} y1={-t} x2={width} y2={-t} stroke={frame} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-t / 2} x2={width} y2={-t / 2} stroke="#9cc7e0" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={0} x2={width} y2={0} stroke={frame} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        <line
          x1={-1.5}
          y1={1.5}
          x2={width + 1.5}
          y2={1.5}
          stroke={frame}
          strokeOpacity={0.5}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {jambs}
      </g>
    );
  }

  const cut = <rect x={0} y={-t - 0.6} width={width} height={t + 1.2} fill={floorFill} />;

  if (opening.type === "entrance") {
    const mid = width / 2;
    const arrow = Math.min(18, Math.max(8, width * 0.2));
    return (
      <g>
        {cut}
        {jambs}
        <line
          x1={0}
          y1={-t / 2}
          x2={width}
          y2={-t / 2}
          stroke={frame}
          strokeOpacity={0.55}
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M${mid} ${-t} L${mid} ${arrow + 4} M${mid - arrow * 0.35} ${arrow * 0.62 + 4} L${mid} ${arrow + 4} L${mid + arrow * 0.35} ${arrow * 0.62 + 4}`}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const double = width >= 60;
  const leaf = double ? width / 2 : width;
  const leafStroke = { stroke: frame, strokeWidth: 1.75, vectorEffect: "non-scaling-stroke" as const };
  const arcStroke = {
    stroke: frame,
    strokeOpacity: 0.55,
    strokeWidth: 1,
    strokeDasharray: "3 2",
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <g>
      {cut}
      {jambs}
      <line x1={0} y1={0} x2={0} y2={leaf} {...leafStroke} />
      <path d={`M 0 ${leaf} A ${leaf} ${leaf} 0 0 0 ${leaf} 0`} {...arcStroke} />
      {double ? (
        <>
          <line x1={width} y1={0} x2={width} y2={leaf} {...leafStroke} />
          <path d={`M ${width} ${leaf} A ${leaf} ${leaf} 0 0 1 ${width - leaf} 0`} {...arcStroke} />
        </>
      ) : null}
    </g>
  );
}

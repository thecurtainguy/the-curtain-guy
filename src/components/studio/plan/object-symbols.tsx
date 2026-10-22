"use client";

import {
  getDrapeColorHex,
  getStudioObjectOption,
  type StudioChairStyle,
  type StudioObject,
} from "@/data/studio";
import { memo, type ReactNode } from "react";

/**
 * Top-down CAD symbols for every Studio object type. Symbols draw in local
 * inches centred on (0, 0); the caller applies translate + rotate. They never
 * depend on zoom, so they stay memoized while the camera moves.
 */

const STROKE = "color-mix(in oklch, var(--foreground) 58%, transparent)";
const STROKE_SOFT = "color-mix(in oklch, var(--foreground) 32%, transparent)";
const ZONE_FILL = "color-mix(in oklch, var(--primary) 11%, transparent)";
const ZONE_STROKE = "color-mix(in oklch, var(--primary) 70%, transparent)";
const GOLD = "var(--primary)";

const FINISH_HEX: Record<string, string> = {
  natural_wood: "#a57a4c",
  painted_white: "#ece8df",
  painted_black: "#232120",
  metal: "#8f9396",
  upholstered: "#6f6257",
  gold: "#c9a24a",
  acrylic: "#d9e6ee",
  marble: "#eeeae4",
};

const DANCE_FLOOR_FILL: Record<string, string> = {
  checkerboard: "url(#studio-checkerboard)",
  warm_parquet: "url(#studio-parquet)",
  oak: "url(#studio-oak)",
  dark_wood: "url(#studio-dark-wood)",
  led_starlit: "url(#studio-starlit)",
  custom_wrap_monogram: "url(#studio-custom-wrap)",
  black_gloss: "#181818",
  neutral_event_carpet: "#8b8273",
  white_gloss: "#f1eee7",
};

const CHAIR_COLORS: Record<StudioChairStyle, { fill: string; back: string; opacity?: number }> = {
  chiavari_gold: { fill: "#d6b25e", back: "#9c7a2e" },
  chiavari_silver: { fill: "#c4c6c8", back: "#86898c" },
  chiavari_white: { fill: "#f3f0ea", back: "#b7b2a8" },
  ghost: { fill: "#dbe9f1", back: "#9fb8c6", opacity: 0.55 },
  cross_back: { fill: "#9b6b3e", back: "#5f3f22" },
  folding_white: { fill: "#ebe9e4", back: "#a9a59d" },
  banquet: { fill: "#6b5a4b", back: "#3f342a" },
  none: { fill: "transparent", back: "transparent" },
};

const CHAIR = 17;
/** Below this on-screen chair size (px) seats collapse to one flat path per table. */
const SEAT_DETAIL_MIN_PX = 6;

export type PlanSymbolDetail = "full" | "low";

/** Level of detail for seat glyphs at a zoom (screen px per inch). */
export function planSymbolDetail(zoom: number): PlanSymbolDetail {
  return zoom * CHAIR >= SEAT_DETAIL_MIN_PX ? "full" : "low";
}

function finishHex(object: StudioObject, fallback: string): string {
  if (object.color) return object.color;
  const finish = object.finish as string | undefined;
  return (finish && FINISH_HEX[finish]) || fallback;
}

function linenHex(object: StudioObject): string | null {
  if (object.linenColor === null) return null;
  const color =
    object.linenColor ?? getStudioObjectOption(object.type)?.linenColor ?? "ivory";
  return color ? getDrapeColorHex(color) : null;
}

function chairStyleOf(object: StudioObject): StudioChairStyle {
  return object.chairStyle ?? getStudioObjectOption(object.type)?.chairStyle ?? "chiavari_gold";
}

type ChairSpec = { x: number; z: number; angle: number };

const fmt = (value: number) => Math.round(value * 100) / 100;

/**
 * Path for a (rounded) rect in chair-local space, rotated by the chair angle
 * and translated to its seat centre — the same geometry `<rect rx>` inside a
 * `translate() rotate()` group would draw.
 */
function chairRectPath(
  chair: ChairSpec,
  x0: number,
  y0: number,
  width: number,
  height: number,
  radius: number
): string {
  const radians = (chair.angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const at = (px: number, py: number) =>
    `${fmt(chair.x + px * cos - py * sin)} ${fmt(chair.z + px * sin + py * cos)}`;
  const x1 = x0 + width;
  const y1 = y0 + height;
  const r = fmt(Math.max(0, Math.min(radius, width / 2, height / 2)));
  if (r <= 0) return `M${at(x0, y0)}L${at(x1, y0)}L${at(x1, y1)}L${at(x0, y1)}Z`;
  const arc = (px: number, py: number) => `A${r} ${r} 0 0 1 ${at(px, py)}`;
  return (
    `M${at(x0 + r, y0)}L${at(x1 - r, y0)}${arc(x1, y0 + r)}` +
    `L${at(x1, y1 - r)}${arc(x1 - r, y1)}L${at(x0 + r, y1)}${arc(x0, y1 - r)}` +
    `L${at(x0, y0 + r)}${arc(x0 + r, y0)}Z`
  );
}

function ringChairs(rx: number, rz: number, count: number, gap = 10): ChairSpec[] {
  const chairs: ChairSpec[] = [];
  const n = Math.min(count, 64);
  for (let index = 0; index < n; index += 1) {
    const theta = -Math.PI / 2 + (index * Math.PI * 2) / n;
    chairs.push({
      x: (rx + gap) * Math.cos(theta),
      z: (rz + gap) * Math.sin(theta),
      angle: (theta * 180) / Math.PI - 90,
    });
  }
  return chairs;
}

function sideChairs(
  count: number,
  length: number,
  z: number,
  angle: number
): ChairSpec[] {
  const chairs: ChairSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    chairs.push({ x: -length / 2 + (length * (index + 0.5)) / count, z, angle });
  }
  return chairs;
}

function banquetChairs(width: number, depth: number, count: number): ChairSpec[] {
  const capacity = Math.max(1, Math.floor(width / 24));
  const ends = count > capacity * 2 ? Math.min(2, count - capacity * 2) : 0;
  const remaining = Math.min(count - ends, 80);
  const top = Math.ceil(remaining / 2);
  const bottom = Math.floor(remaining / 2);
  const offset = CHAIR / 2 + 3;
  return [
    ...sideChairs(top, width, -depth / 2 - offset, 180),
    ...sideChairs(bottom, width, depth / 2 + offset, 0),
    ...(ends >= 1 ? [{ x: -width / 2 - offset, z: 0, angle: 90 }] : []),
    ...(ends >= 2 ? [{ x: width / 2 + offset, z: 0, angle: -90 }] : []),
  ];
}

/**
 * Every chair around a table as two paths (seats + backrests) instead of a
 * group per chair. Zoomed out ("low"), seats collapse to one flat path.
 */
function renderChairs(
  chairs: ChairSpec[],
  style: StudioChairStyle,
  detail: PlanSymbolDetail,
  size = CHAIR
) {
  if (style === "none" || chairs.length === 0) return null;
  const colors = CHAIR_COLORS[style];
  const half = size / 2;
  if (detail === "low") {
    const seats = chairs.map((chair) => chairRectPath(chair, -half, -half, size, size, 0)).join("");
    return <path d={seats} fill={colors.fill} opacity={colors.opacity} />;
  }
  const backDepth = size * 0.22;
  let seats = "";
  let backs = "";
  for (const chair of chairs) {
    seats += chairRectPath(chair, -half, -half, size, size, size * 0.22);
    backs += chairRectPath(chair, -half, half - backDepth, size, backDepth, size * 0.1);
  }
  return (
    <g opacity={colors.opacity}>
      <path
        d={seats}
        fill={colors.fill}
        stroke={colors.back}
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
      />
      <path d={backs} fill={colors.back} />
    </g>
  );
}

function seatsOf(object: StudioObject): number {
  return Math.max(0, Math.round(object.seatingCount ?? 0));
}

function wavePath(length: number, amplitude: number, wavelength: number): string {
  const steps = Math.max(2, Math.min(240, Math.round(length / (wavelength / 2))));
  const step = length / steps;
  let path = `M ${-length / 2} 0`;
  for (let index = 0; index < steps; index += 1) {
    const x = -length / 2 + step * (index + 1);
    const control = -length / 2 + step * (index + 0.5);
    path += ` Q ${control} ${index % 2 === 0 ? -amplitude : amplitude} ${x} 0`;
  }
  return path;
}

function gridLines(width: number, depth: number, step: number): string {
  let path = "";
  const hw = width / 2;
  const hd = depth / 2;
  const columns = Math.min(40, Math.floor(width / step));
  const rows = Math.min(40, Math.floor(depth / step));
  for (let index = 1; index < columns + (width % step === 0 ? 0 : 1); index += 1) {
    const x = -hw + index * step;
    if (x >= hw) break;
    path += `M ${x} ${-hd} V ${hd} `;
  }
  for (let index = 1; index < rows + (depth % step === 0 ? 0 : 1); index += 1) {
    const z = -hd + index * step;
    if (z >= hd) break;
    path += `M ${-hw} ${z} H ${hw} `;
  }
  return path;
}

function Outline({
  w,
  d,
  rx = 2,
  fill,
  dashed,
  stroke = STROKE,
  opacity,
}: {
  w: number;
  d: number;
  rx?: number;
  fill: string;
  dashed?: boolean;
  stroke?: string;
  opacity?: number;
}) {
  return (
    <rect
      x={-w / 2}
      y={-d / 2}
      width={w}
      height={d}
      rx={rx}
      fill={fill}
      fillOpacity={opacity}
      stroke={stroke}
      strokeWidth={1.25}
      strokeDasharray={dashed ? "6 4" : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function RoundTable({ object, showSeating, detail }: SymbolProps) {
  const hw = object.width / 2;
  const hd = object.depth / 2;
  const linen = linenHex(object);
  const seats = seatsOf(object);
  const style = chairStyleOf(object);
  return (
    <>
      {showSeating && seats > 0 ? renderChairs(ringChairs(hw, hd, seats), style, detail) : null}
      <ellipse
        rx={hw}
        ry={hd}
        fill={linen ?? "#8a6440"}
        stroke={STROKE}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        rx={hw * 0.8}
        ry={hd * 0.8}
        fill="none"
        stroke={linen ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)"}
        strokeDasharray="3 3"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {object.type === "round_table" ? (
        <circle r={Math.min(hw, hd) * 0.16} fill={GOLD} fillOpacity={0.75} />
      ) : null}
    </>
  );
}

function CakeTable({ object }: SymbolProps) {
  const hw = object.width / 2;
  const hd = object.depth / 2;
  const linen = linenHex(object);
  const r = Math.min(hw, hd);
  return (
    <>
      <ellipse rx={hw} ry={hd} fill={linen ?? "#8a6440"} stroke={STROKE} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      {[0.55, 0.4, 0.25].map((scale) => (
        <circle
          key={scale}
          r={r * scale}
          fill="#fbf7ef"
          stroke="#c9b48a"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle r={r * 0.08} fill={GOLD} />
    </>
  );
}

function RectTable({ object, showSeating, detail }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const linen = linenHex(object);
  const seats = seatsOf(object);
  const style = chairStyleOf(object);
  const oneSided = object.type === "head_table" || object.type === "sweetheart_table";
  const chairs = oneSided
    ? sideChairs(Math.min(seats, 60), w, -d / 2 - CHAIR / 2 - 3, 180)
    : banquetChairs(w, d, seats);
  const garland = oneSided ? Math.max(3, Math.round(w / 14)) : 0;
  return (
    <>
      {showSeating && seats > 0 ? renderChairs(chairs, style, detail) : null}
      <Outline w={w} d={d} rx={2} fill={linen ?? "#8a6440"} />
      <rect
        x={-w / 2 + 3}
        y={-d / 2 + 3}
        width={Math.max(0, w - 6)}
        height={Math.max(0, d - 6)}
        rx={1.5}
        fill="none"
        stroke={linen ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.18)"}
        strokeDasharray="3 3"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {oneSided
        ? Array.from({ length: garland }, (_, index) => (
            <circle
              key={index}
              cx={-w / 2 + (w * (index + 0.5)) / garland}
              cy={d / 2 - 2}
              r={Math.min(3.2, d * 0.12)}
              fill={index % 2 === 0 ? "#c99b9e" : "#9caf88"}
            />
          ))
        : null}
      {object.type === "sweetheart_table" ? (
        <path
          d={`M 0 ${d * 0.12} c -3 -4 -8 -2 -6 2 c 1 2 6 5 6 5 c 0 0 5 -3 6 -5 c 2 -4 -3 -6 -6 -2 z`}
          fill={GOLD}
          fillOpacity={0.85}
        />
      ) : null}
    </>
  );
}

function BuffetTable({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const linen = linenHex(object);
  const count = Math.max(1, Math.floor(w / 30));
  const dishW = Math.min(20, (w / count) * 0.75);
  return (
    <>
      <Outline w={w} d={d} fill={linen ?? "#8a6440"} />
      {Array.from({ length: count }, (_, index) => (
        <rect
          key={index}
          x={-w / 2 + (w * (index + 0.5)) / count - dishW / 2}
          y={-d * 0.22}
          width={dishW}
          height={d * 0.44}
          rx={3}
          fill="#cfd1d3"
          stroke="#8f9396"
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <line x1={-w / 2} x2={w / 2} y1={d / 2 + 4} y2={d / 2 + 4} stroke={GOLD} strokeOpacity={0.6} strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function ZoneArea({ object, showSeating, detail }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const seats = seatsOf(object);
  const style: StudioChairStyle = object.chairStyle ?? "chiavari_gold";
  if (object.type === "table_area") {
    const r = Math.min(w, d) * 0.22;
    return (
      <>
        <Outline w={w} d={d} rx={6} fill={ZONE_FILL} stroke={ZONE_STROKE} dashed />
        {showSeating && seats > 0 ? renderChairs(ringChairs(r, r, seats, 9), style, detail, 15) : null}
        <circle r={r} fill="color-mix(in oklch, var(--primary) 18%, transparent)" stroke={ZONE_STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </>
    );
  }
  // Lounge cluster: two sofas facing over a coffee table, armchairs at the ends.
  const sofaW = w * 0.55;
  const sofaD = Math.min(30, d * 0.22);
  const arm = Math.min(30, w * 0.2, d * 0.26);
  const fabric = finishHex(object, "#7b6a5c");
  return (
    <>
      <Outline w={w} d={d} rx={6} fill={ZONE_FILL} stroke={ZONE_STROKE} dashed />
      <rect x={-w * 0.32} y={-d * 0.36} width={w * 0.64} height={d * 0.72} rx={8} fill="#8b7d6b" fillOpacity={0.25} />
      {showSeating ? (
        <>
          <SofaShape cx={0} cz={-d * 0.22} w={sofaW} d={sofaD} angle={0} fill={fabric} />
          <SofaShape cx={0} cz={d * 0.22} w={sofaW} d={sofaD} angle={180} fill={fabric} />
          <SofaShape cx={-w * 0.36} cz={0} w={arm} d={arm} angle={-90} fill={fabric} seats={1} />
          <SofaShape cx={w * 0.36} cz={0} w={arm} d={arm} angle={90} fill={fabric} seats={1} />
        </>
      ) : null}
      <rect x={-w * 0.14} y={-d * 0.08} width={w * 0.28} height={d * 0.16} rx={3} fill="#c9ab78" stroke={STROKE_SOFT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

/** Sofa with back on local −z, arms on both ends; faces +z. */
function SofaShape({
  cx,
  cz,
  w,
  d,
  angle,
  fill,
  seats,
}: {
  cx: number;
  cz: number;
  w: number;
  d: number;
  angle: number;
  fill: string;
  seats?: number;
}) {
  const armW = Math.min(8, w * 0.12);
  const backD = d * 0.28;
  const cushions = seats ?? Math.max(1, Math.round((w - armW * 2) / 26));
  const inner = w - armW * 2;
  return (
    <g transform={`translate(${cx} ${cz}) rotate(${angle})`}>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={Math.min(6, d * 0.2)} fill={fill} stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={-w / 2} y={-d / 2} width={w} height={backD} rx={Math.min(5, backD / 2)} fill="rgba(0,0,0,0.22)" />
      <rect x={-w / 2} y={-d / 2} width={armW} height={d} rx={armW / 2} fill="rgba(0,0,0,0.16)" />
      <rect x={w / 2 - armW} y={-d / 2} width={armW} height={d} rx={armW / 2} fill="rgba(0,0,0,0.16)" />
      {Array.from({ length: Math.max(0, cushions - 1) }, (_, index) => {
        const x = -inner / 2 + (inner * (index + 1)) / cushions;
        return (
          <line key={index} x1={x} x2={x} y1={-d / 2 + backD} y2={d / 2 - 1} stroke="rgba(0,0,0,0.25)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        );
      })}
    </g>
  );
}

function CeremonySeating({ object, showSeating, detail }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const style = chairStyleOf(object);
  const seats = seatsOf(object);
  const aisle = Math.min(72, Math.max(36, w * 0.18));
  const pitch = 21;
  const sideWidth = Math.max(0, (w - aisle) / 2);
  const perSide = Math.max(1, Math.floor(sideWidth / pitch));
  const rowsNeeded = Math.max(1, Math.ceil(seats / (perSide * 2)));
  const rowPitch = Math.max(20, Math.min(36, d / rowsNeeded));
  const rows = Math.min(rowsNeeded, Math.max(1, Math.floor(d / rowPitch + 1e-6)), 120);
  const chairs: ChairSpec[] = [];
  let placed = 0;
  for (let row = 0; row < rows && placed < seats; row += 1) {
    const z = -d / 2 + rowPitch * (row + 0.5);
    for (let side = 0; side < 2 && placed < seats; side += 1) {
      for (let seat = 0; seat < perSide && placed < seats; seat += 1) {
        const x =
          side === 0
            ? -aisle / 2 - pitch * (seat + 0.5)
            : aisle / 2 + pitch * (seat + 0.5);
        chairs.push({ x, z, angle: 0 });
        placed += 1;
      }
    }
  }
  return (
    <>
      <Outline w={w} d={d} rx={4} fill="transparent" stroke={STROKE_SOFT} dashed />
      <rect x={-aisle / 2 + 6} y={-d / 2} width={Math.max(0, aisle - 12)} height={d} fill="#f4f1e9" fillOpacity={0.55} />
      <line x1={0} x2={0} y1={-d / 2} y2={d / 2} stroke={GOLD} strokeOpacity={0.7} strokeDasharray="6 5" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {showSeating && style !== "none" ? (
        renderChairs(chairs, style, detail, 16)
      ) : (
        <>
          <rect x={-w / 2} y={-d / 2} width={sideWidth} height={d} fill="url(#studio-hatch)" />
          <rect x={aisle / 2} y={-d / 2} width={sideWidth} height={d} fill="url(#studio-hatch)" />
        </>
      )}
    </>
  );
}

function SingleChair({ object }: SymbolProps) {
  const colors = CHAIR_COLORS[chairStyleOf(object) === "none" ? "chiavari_gold" : chairStyleOf(object)];
  const w = object.width;
  const d = object.depth;
  return (
    <g opacity={colors.opacity}>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={Math.min(w, d) * 0.22} fill={colors.fill} stroke={colors.back} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={-w / 2} y={d / 2 - d * 0.22} width={w} height={d * 0.22} rx={2} fill={colors.back} />
    </g>
  );
}

function Stage({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const deck = finishHex(object, "#232120");
  const skirt = Math.min(6, w * 0.06, d * 0.06);
  const stairW = Math.min(48, w * 0.35);
  const stepCount = 3;
  return (
    <>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={2} fill="url(#studio-hatch)" stroke={STROKE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <rect x={-w / 2 + skirt} y={-d / 2 + skirt} width={Math.max(0, w - skirt * 2)} height={Math.max(0, d - skirt * 2)} fill={deck} />
      <path
        d={gridLines(w - skirt * 2, d - skirt * 2, 48)}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        fill="none"
      />
      <g transform={`translate(0 ${d / 2})`}>
        <rect x={-stairW / 2} y={0} width={stairW} height={stepCount * 8} fill={deck} stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {Array.from({ length: stepCount - 1 }, (_, index) => (
          <line key={index} x1={-stairW / 2} x2={stairW / 2} y1={(index + 1) * 8} y2={(index + 1) * 8} stroke={STROKE_SOFT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <line x1={-w * 0.3} x2={w * 0.3} y1={d / 2 - skirt - 4} y2={d / 2 - skirt - 4} stroke={GOLD} strokeOpacity={0.5} strokeDasharray="2 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function DanceFloor({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const fill = DANCE_FLOOR_FILL[(object.finish as string) ?? "white_gloss"] ?? "#f1eee7";
  const dark = ["black_gloss", "dark_wood", "led_starlit"].includes((object.finish as string) ?? "");
  return (
    <>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={object.color ?? fill} stroke={STROKE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <path d={gridLines(w, d, 36)} stroke={dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" />
      <rect x={-w / 2 + 2} y={-d / 2 + 2} width={Math.max(0, w - 4)} height={Math.max(0, d - 4)} fill="none" stroke={GOLD} strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function DjBooth({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const facade = finishHex(object, "#ece8df");
  const deckR = Math.min(w * 0.14, d * 0.28);
  return (
    <>
      <Outline w={w} d={d} rx={3} fill="#1f1d1c" />
      <rect x={-w / 2} y={d / 2 - d * 0.22} width={w} height={d * 0.22} rx={2} fill={facade} />
      <circle cx={-w * 0.28} cy={-d * 0.1} r={deckR} fill="#2e2b29" stroke="#8f9396" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={w * 0.28} cy={-d * 0.1} r={deckR} fill="#2e2b29" stroke="#8f9396" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={-w * 0.28} cy={-d * 0.1} r={deckR * 0.18} fill={GOLD} />
      <circle cx={w * 0.28} cy={-d * 0.1} r={deckR * 0.18} fill={GOLD} />
      <rect x={-w * 0.08} y={-d * 0.3} width={w * 0.16} height={d * 0.4} rx={1.5} fill="#3a3633" stroke="#8f9396" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function Bar({ object, showSeating }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const wood = finishHex(object, "#a57a4c");
  const stools = Math.max(1, Math.floor(w / 30));
  const bottles = Math.max(2, Math.floor(w / 10));
  return (
    <>
      {showSeating
        ? Array.from({ length: stools }, (_, index) => (
            <circle
              key={index}
              cx={-w / 2 + (w * (index + 0.5)) / stools}
              cy={d / 2 + 11}
              r={7}
              fill="#3a3633"
              stroke={STROKE_SOFT}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
      <Outline w={w} d={d} rx={3} fill={wood} />
      <rect x={-w / 2 + 3} y={-d / 2 + 3} width={Math.max(0, w - 6)} height={d * 0.32} rx={2} fill="rgba(0,0,0,0.28)" />
      {Array.from({ length: bottles }, (_, index) => (
        <circle key={index} cx={-w / 2 + 6 + ((w - 12) * index) / (bottles - 1)} cy={-d / 2 + 3 + d * 0.16} r={1.6} fill={index % 3 === 0 ? GOLD : "#cfe0d6"} />
      ))}
      <line x1={-w / 2 + 3} x2={w / 2 - 3} y1={d / 2 - 4} y2={d / 2 - 4} stroke="rgba(255,255,255,0.35)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function Sofa({ object }: SymbolProps) {
  return (
    <SofaShape cx={0} cz={0} w={object.width} d={object.depth} angle={0} fill={finishHex(object, "#6f6257")} />
  );
}

function PhotoBooth({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const backdrop = object.drapeColor ? getDrapeColorHex(object.drapeColor) : "#c9ab78";
  const camZ = d / 2 - 10;
  return (
    <>
      <Outline w={w} d={d} rx={4} fill={ZONE_FILL} stroke={ZONE_STROKE} dashed />
      <rect x={-w / 2 + 4} y={-d / 2 + 2} width={Math.max(0, w - 8)} height={6} rx={2} fill={backdrop} stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d={`M 0 ${camZ} L ${-w / 2 + 6} ${-d / 2 + 10} M 0 ${camZ} L ${w / 2 - 6} ${-d / 2 + 10}`} stroke={GOLD} strokeOpacity={0.6} strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={-8} y={camZ - 4} width={16} height={10} rx={2} fill="#1f1d1c" stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={0} cy={camZ - 4} r={3.5} fill="#3a3633" stroke={GOLD} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function Plant({ object }: SymbolProps) {
  const r = Math.min(object.width, object.depth) / 2;
  const lobes = 7;
  return (
    <>
      <circle r={r} fill="#2f4a32" stroke="#1d2f20" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {Array.from({ length: lobes }, (_, index) => {
        const theta = (index * Math.PI * 2) / lobes;
        return (
          <circle key={index} cx={Math.cos(theta) * r * 0.5} cy={Math.sin(theta) * r * 0.5} r={r * 0.45} fill={index % 2 === 0 ? "#4f7a4c" : "#3f6a3f"} />
        );
      })}
      <circle r={r * 0.35} fill="#6b9a5e" />
      <circle r={r} fill="none" stroke="#8b6038" strokeOpacity={0.6} strokeDasharray="2 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function Column({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const fill = finishHex(object, "#ece8df");
  if (Math.abs(w - d) < 0.5) {
    return (
      <>
        <circle r={w / 2} fill={fill} stroke={STROKE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <circle r={w * 0.36} fill="none" stroke={STROKE_SOFT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </>
    );
  }
  return (
    <>
      <Outline w={w} d={d} rx={1} fill={fill} />
      <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="url(#studio-hatch)" opacity={0.6} />
    </>
  );
}

function Uplight({ object }: SymbolProps) {
  const r = Math.min(object.width, object.depth) / 2;
  const hex = getDrapeColorHex(object.lightColor ?? "gold");
  const glow = Math.max(r * 4, 30);
  const gradientId = `studio-glow-${object.id}`;
  return (
    <>
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={hex} stopOpacity={0.75} />
          <stop offset="100%" stopColor={hex} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={glow} fill={`url(#${gradientId})`} pointerEvents="none" />
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={r * 0.3} fill="#1f1d1c" stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle r={r * 0.55} fill={hex} />
    </>
  );
}

function Chandelier({ object }: SymbolProps) {
  const hw = object.width / 2;
  const hd = object.depth / 2;
  const hex = getDrapeColorHex(object.lightColor ?? "champagne");
  const crystals = 12;
  return (
    <g opacity={0.92}>
      <ellipse rx={hw * 1.35} ry={hd * 1.35} fill={hex} fillOpacity={0.08} />
      {[1, 0.7, 0.42].map((scale) => (
        <ellipse
          key={scale}
          rx={hw * scale}
          ry={hd * scale}
          fill="none"
          stroke={scale === 1 ? GOLD : hex}
          strokeWidth={1.25}
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {Array.from({ length: crystals }, (_, index) => {
        const theta = (index * Math.PI * 2) / crystals;
        return <circle key={index} cx={Math.cos(theta) * hw * 0.85} cy={Math.sin(theta) * hd * 0.85} r={Math.max(1, Math.min(hw, hd) * 0.07)} fill={hex} />;
      })}
      <circle r={Math.min(hw, hd) * 0.16} fill={GOLD} />
    </g>
  );
}

function Piano({ object, showSeating }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const hw = w / 2;
  const hd = d / 2;
  const body = finishHex(object, "#1d1c1b");
  const keysD = Math.min(7, d * 0.12);
  const path = [
    `M ${-hw} ${-hd}`,
    `L ${hw} ${-hd}`,
    `L ${hw} ${-hd + d * 0.3}`,
    `C ${hw} ${-hd + d * 0.55} ${w * 0.2} ${-hd + d * 0.5} ${w * 0.12} ${hd - d * 0.22}`,
    `C ${w * 0.06} ${hd - d * 0.04} ${-hw * 0.35} ${hd} ${-hw * 0.62} ${hd}`,
    `C ${-hw * 0.92} ${hd} ${-hw} ${hd - d * 0.06} ${-hw} ${hd - d * 0.2}`,
    "Z",
  ].join(" ");
  return (
    <>
      {showSeating ? (
        <rect x={-w * 0.22} y={-hd - 18} width={w * 0.44} height={12} rx={2} fill="#2e2b29" stroke={STROKE_SOFT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ) : null}
      <path d={path} fill={body} stroke={STROKE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={1} vectorEffect="non-scaling-stroke" transform="scale(0.86)" />
      <rect x={-hw + 2} y={-hd} width={w - 4} height={keysD} fill="#f6f3ec" stroke="#8f9396" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
      <path d={`M ${-hw * 0.7} ${-hd + d * 0.2} Q ${-hw * 0.2} ${hd * 0.4} ${-hw * 0.6} ${hd * 0.75}`} fill="none" stroke={GOLD} strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function Podium({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const wood = finishHex(object, "#a57a4c");
  return (
    <>
      <path d={`M ${-w / 2} ${d / 2} L ${w / 2} ${d / 2} L ${w * 0.4} ${-d / 2} L ${-w * 0.4} ${-d / 2} Z`} fill={wood} stroke={STROKE} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      <rect x={-w * 0.3} y={-d * 0.3} width={w * 0.6} height={d * 0.32} rx={1} fill="rgba(0,0,0,0.25)" />
      <circle cx={0} cy={d * 0.22} r={Math.min(2, w * 0.08)} fill={GOLD} />
    </>
  );
}

function AvScreen({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const screenD = Math.min(5, d * 0.3);
  return (
    <>
      <Outline w={w} d={d} rx={2} fill="transparent" stroke={STROKE_SOFT} dashed />
      <path d={`M ${-w / 2} ${-d / 2 + screenD} L ${-w * 0.7} ${d / 2 + w * 0.25} M ${w / 2} ${-d / 2 + screenD} L ${w * 0.7} ${d / 2 + w * 0.25}`} stroke="#8ec5ff" strokeOpacity={0.45} strokeDasharray="5 5" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={-w / 2} y={-d / 2} width={w} height={screenD} rx={1} fill="#e9edf2" stroke="#8f9396" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={-w / 2 - 2} y={-d / 2 - 1} width={4} height={screenD + 2} fill="#3a3633" />
      <rect x={w / 2 - 2} y={-d / 2 - 1} width={4} height={screenD + 2} fill="#3a3633" />
    </>
  );
}

function DrapeBackdrop({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const hex = getDrapeColorHex(object.drapeColor ?? "ivory");
  const fullness = object.fullness ?? 2;
  const wavelength = Math.max(4, 12 / fullness);
  const amplitude = Math.min(d * 0.3, 2 + fullness);
  const spans = Math.max(1, Math.round(w / 96));
  const uprights = Array.from({ length: spans + 1 }, (_, index) => -w / 2 + (w * index) / spans);
  return (
    <>
      <Outline w={w} d={d} rx={2} fill="transparent" stroke={STROKE_SOFT} dashed />
      {uprights.map((x) => (
        <rect key={`base-${x}`} x={x - Math.min(6, d / 2)} y={-Math.min(6, d / 2)} width={Math.min(12, d)} height={Math.min(12, d)} fill="none" stroke={STROKE_SOFT} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <path d={wavePath(w, amplitude, wavelength)} fill="none" stroke={hex} strokeWidth={Math.max(1.5, Math.min(3, d * 0.15))} strokeLinecap="round" />
      <path d={wavePath(w, amplitude, wavelength)} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
      {uprights.map((x) => (
        <circle key={`pole-${x}`} cx={x} cy={0} r={2.2} fill="#cfd1d3" stroke="#5f5f5f" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
      ))}
    </>
  );
}

function CeilingDrape({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const hex = getDrapeColorHex(object.drapeColor ?? "white");
  const swags = 16;
  const points: Array<{ x: number; z: number }> = [];
  for (let index = 0; index < swags; index += 1) {
    const theta = (index * Math.PI * 2) / swags;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const scale = Math.min(
      Math.abs(cos) > 1e-6 ? w / 2 / Math.abs(cos) : Infinity,
      Math.abs(sin) > 1e-6 ? d / 2 / Math.abs(sin) : Infinity
    );
    points.push({ x: cos * scale, z: sin * scale });
  }
  return (
    <g opacity={0.9}>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={4} fill={hex} fillOpacity={0.16} stroke={hex} strokeOpacity={0.8} strokeDasharray="8 5" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => (
        <path
          key={index}
          d={`M 0 0 Q ${point.x * 0.5 + point.z * 0.06} ${point.z * 0.5 - point.x * 0.06} ${point.x} ${point.z}`}
          fill="none"
          stroke={hex}
          strokeOpacity={0.75}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle r={Math.min(w, d) * 0.06} fill={hex} fillOpacity={0.7} stroke={GOLD} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function EntranceMarker({ object }: SymbolProps) {
  const w = object.width;
  const d = object.depth;
  const post = Math.min(10, w * 0.14, d);
  const fill = finishHex(object, "#c9a24a");
  return (
    <>
      <path d={`M ${-w / 2 + post / 2} 0 Q 0 ${-d * 0.9} ${w / 2 - post / 2} 0`} fill="none" stroke={fill} strokeWidth={1.5} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
      <rect x={-w / 2} y={-post / 2} width={post} height={post} rx={1.5} fill={fill} stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={w / 2 - post} y={-post / 2} width={post} height={post} rx={1.5} fill={fill} stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d={`M 0 ${-d * 0.1} L 0 ${d / 2 + 14} M -6 ${d / 2 + 7} L 0 ${d / 2 + 14} L 6 ${d / 2 + 7}`} fill="none" stroke={GOLD} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </>
  );
}

type SymbolProps = { object: StudioObject; showSeating: boolean; detail: PlanSymbolDetail };

function renderSymbol(props: SymbolProps): ReactNode {
  switch (props.object.type) {
    case "round_table":
    case "cocktail_table":
      return <RoundTable {...props} />;
    case "cake_table":
      return <CakeTable {...props} />;
    case "rectangle_table":
    case "head_table":
    case "sweetheart_table":
      return <RectTable {...props} />;
    case "buffet_table":
      return <BuffetTable {...props} />;
    case "table_area":
    case "lounge_area":
      return <ZoneArea {...props} />;
    case "ceremony_seating":
      return <CeremonySeating {...props} />;
    case "chair":
      return <SingleChair {...props} />;
    case "sofa":
      return <Sofa {...props} />;
    case "stage":
      return <Stage {...props} />;
    case "dance_floor":
      return <DanceFloor {...props} />;
    case "dj_booth":
      return <DjBooth {...props} />;
    case "bar":
      return <Bar {...props} />;
    case "photo_booth":
      return <PhotoBooth {...props} />;
    case "plant":
      return <Plant {...props} />;
    case "column":
      return <Column {...props} />;
    case "uplight":
      return <Uplight {...props} />;
    case "chandelier":
      return <Chandelier {...props} />;
    case "piano":
      return <Piano {...props} />;
    case "podium":
      return <Podium {...props} />;
    case "av_screen":
      return <AvScreen {...props} />;
    case "drape_backdrop":
      return <DrapeBackdrop {...props} />;
    case "ceiling_drape":
      return <CeilingDrape {...props} />;
    case "entrance_marker":
      return <EntranceMarker {...props} />;
    default:
      return (
        <Outline
          w={(props.object as StudioObject).width}
          d={(props.object as StudioObject).depth}
          fill="color-mix(in oklch, var(--muted) 75%, var(--card))"
        />
      );
  }
}

const POSE_KEYS: ReadonlySet<string> = new Set(["x", "z", "rotation"]);

/** Same drawing apart from position/rotation (which the outer transform applies). */
function sameShape(a: StudioObject, b: StudioObject): boolean {
  if (a === b) return true;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  for (const key of leftKeys) {
    if (!POSE_KEYS.has(key) && !Object.is(left[key], right[key])) return false;
  }
  return true;
}

/** Local-space drawing; skips re-rendering while an object is only moved or rotated. */
const SymbolBody = memo(
  function SymbolBody(props: SymbolProps) {
    return renderSymbol(props);
  },
  (previous, next) =>
    previous.showSeating === next.showSeating &&
    previous.detail === next.detail &&
    sameShape(previous.object, next.object)
);

/** Memoized symbol for one object, positioned and rotated in plan space. */
export const PlanObjectSymbol = memo(function PlanObjectSymbol({
  object,
  showSeating,
  detail = "full",
}: {
  object: StudioObject;
  showSeating: boolean;
  detail?: PlanSymbolDetail;
}) {
  return (
    <g transform={`translate(${object.x} ${object.z}) rotate(${object.rotation})`}>
      <SymbolBody object={object} showSeating={showSeating} detail={detail} />
    </g>
  );
});

/** Shared SVG patterns used by plan symbols (dance floor finishes, hatches). */
export const PlanSymbolDefs = memo(function PlanSymbolDefs() {
  return (
    <>
      <pattern id="studio-checkerboard" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#f4f1e9" />
        <path d="M0 0h12v12H0zM12 12h12v12H12z" fill="#171717" />
      </pattern>
      <pattern id="studio-parquet" width="32" height="16" patternUnits="userSpaceOnUse">
        <rect width="32" height="16" fill="#9b6b3e" />
        <path d="M0 0v16M16 0v16M32 0v16M0 8h32" stroke="#d2a26c" strokeWidth="2" />
      </pattern>
      <pattern id="studio-oak" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#bd9360" />
        <path d="M5 0v20M15 0v20" stroke="#8b6038" strokeWidth="1.5" />
      </pattern>
      <pattern id="studio-dark-wood" width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="#4b3429" />
        <path d="M6 0v18M12 0v18" stroke="#8b6850" strokeWidth="1" />
      </pattern>
      <pattern id="studio-starlit" width="28" height="28" patternUnits="userSpaceOnUse">
        <rect width="28" height="28" fill="#101522" />
        <circle cx="5" cy="7" r="1.5" fill="#f7d675" />
        <circle cx="21" cy="18" r="1" fill="#dbe9ff" />
        <circle cx="13" cy="25" r="0.8" fill="#8ec5ff" />
      </pattern>
      <pattern id="studio-custom-wrap" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="48" height="48" fill="#e9dfcb" />
        <path d="M0 0v48M16 0v48M32 0v48M48 0v48" stroke="#b68b3f" strokeWidth="5" opacity=".7" />
      </pattern>
      <pattern id="studio-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#2a2724" />
        <path d="M0 0v6" stroke="#8b7d6b" strokeWidth="1.6" />
      </pattern>
    </>
  );
});

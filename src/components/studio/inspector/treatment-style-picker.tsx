"use client";

import {
  STUDIO_TREATMENT_TYPES,
  getDrapeColorHex,
  type DrapeColor,
  type StudioTreatmentType,
} from "@/data/studio";
import { cn } from "@/lib/utils";
import { useId } from "react";
import { shade } from "../three/color-utils";
import { SelectionRing } from "./inspector-ui";

const STYLE_COPY: Record<StudioTreatmentType, { label: string; description: string }> = {
  full_pleated_backdrop: { label: "Pleated backdrop", description: "Full fabric wall" },
  side_tieback_panels: { label: "Side panels", description: "Tied-back reveal" },
  top_swag_valance: { label: "Top swag", description: "Scalloped valance & tails" },
  ceremony_arch: { label: "Ceremony arch", description: "Frame, panels & swag" },
  layered_swag: { label: "Layered swag", description: "Two-tone scallops & tails" },
};

/** Arrangement tiles, each drawn in the treatment's own fabric and accent colours. */
export function TreatmentStylePicker({
  value,
  color,
  accent,
  onSelect,
}: {
  value: StudioTreatmentType;
  color: DrapeColor;
  accent: DrapeColor;
  onSelect: (type: StudioTreatmentType) => void;
}) {
  const fabricHex = getDrapeColorHex(color);
  const accentHex = getDrapeColorHex(accent);
  const lastAlone = STUDIO_TREATMENT_TYPES.length % 2 === 1;
  return (
    <div role="radiogroup" aria-label="Treatment type" className="grid grid-cols-2 gap-2">
      {STUDIO_TREATMENT_TYPES.map((type, index) => {
        const selected = type === value;
        const copy = STYLE_COPY[type];
        const wide = lastAlone && index === STUDIO_TREATMENT_TYPES.length - 1;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(type)}
            className={cn(
              "group relative flex min-w-0 flex-col items-stretch gap-1.5 rounded-2xl border p-1.5 text-left transition-all duration-200 motion-reduce:transition-none",
              "border-border/40 bg-card/35 hover:-translate-y-px hover:border-primary/30 hover:bg-card/60 active:scale-[0.99] motion-reduce:hover:translate-y-0",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              selected &&
                "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
              wide && "col-span-2"
            )}
          >
            <span
              className={cn(
                "relative block h-[4.5rem] overflow-hidden rounded-xl border transition-colors",
                selected ? "border-primary/40" : "border-border/30 group-hover:border-primary/25"
              )}
            >
              <TreatmentStyleArt type={type} fabric={fabricHex} accent={accentHex} />
            </span>
            <span className="min-w-0 px-0.5 pb-0.5">
              <span className="block truncate text-[0.72rem] font-medium leading-tight text-foreground">
                {copy.label}
              </span>
              <span className="block truncate text-[0.62rem] leading-tight text-muted-foreground">
                {copy.description}
              </span>
            </span>
            <SelectionRing
              selected={selected}
              className="absolute top-2.5 right-2.5 shadow-sm shadow-black/40"
            />
          </button>
        );
      })}
    </div>
  );
}

const METAL = "#d4b06a";
const PIPE = "#a9adb2";
const FLOOR_Y = 62;

/** Backdrop outline whose weighted hem lifts slightly on every fold. */
const BACKDROP_PATH = (() => {
  const hem = FLOOR_Y - 0.5;
  let d = `M12 10H108V${hem}`;
  for (let x = 108; x > 12; x -= 8) d += `Q${x - 4} ${hem + 1.5} ${x - 8} ${hem}`;
  return `${d}Z`;
})();

/**
 * Miniature front elevation of a treatment on a warm venue wall. Fabric is
 * filled with repeating fold gradients — vertical pleats for hanging panels,
 * horizontal folds for swags — so colour and texture read at thumbnail size.
 */
function TreatmentStyleArt({
  type,
  fabric,
  accent,
}: {
  type: StudioTreatmentType;
  fabric: string;
  accent: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pleat = `${id}-pleat`;
  const fold = `${id}-fold`;
  const accentFold = `${id}-afold`;
  const edge = shade(fabric, 0.5);
  const crease = shade(fabric, 0.62);
  return (
    <svg
      viewBox="0 0 120 72"
      preserveAspectRatio="xMidYMid slice"
      className="block size-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d4c3d" />
          <stop offset="1" stopColor="#3a2f26" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.15" r="0.75">
          <stop offset="0" stopColor="#f3d79c" stopOpacity="0.28" />
          <stop offset="1" stopColor="#f3d79c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={pleat} x1="0" y1="0" x2="5" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
          <stop offset="0" stopColor={shade(fabric, 0.7)} />
          <stop offset="0.45" stopColor={fabric} />
          <stop offset="0.7" stopColor={shade(fabric, 1.08)} />
          <stop offset="1" stopColor={shade(fabric, 0.7)} />
        </linearGradient>
        <linearGradient id={fold} x1="0" y1="0" x2="0" y2="4" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
          <stop offset="0" stopColor={shade(fabric, 1.08)} />
          <stop offset="0.55" stopColor={fabric} />
          <stop offset="1" stopColor={shade(fabric, 0.66)} />
        </linearGradient>
        <linearGradient id={accentFold} x1="0" y1="0" x2="0" y2="4" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
          <stop offset="0" stopColor={shade(accent, 1.08)} />
          <stop offset="0.55" stopColor={accent} />
          <stop offset="1" stopColor={shade(accent, 0.66)} />
        </linearGradient>
      </defs>
      <rect width="120" height="72" fill={`url(#${id}-wall)`} />
      <rect width="120" height="72" fill={`url(#${id}-glow)`} />
      <rect y={FLOOR_Y} width="120" height={72 - FLOOR_Y} fill="#2a1d14" />
      <line x1="0" y1={FLOOR_Y} x2="120" y2={FLOOR_Y} stroke="#7a5c40" strokeWidth="0.6" />

      {type === "full_pleated_backdrop" ? (
        <g>
          <path
            d={BACKDROP_PATH}
            fill={`url(#${pleat})`}
            stroke={edge}
            strokeWidth="0.5"
          />
          <PipeHeader x0={10} x1={110} uprights={[12, 60, 108]} />
        </g>
      ) : null}

      {type === "side_tieback_panels" ? (
        <g>
          <rect x="40" y="12" width="40" height={FLOOR_Y - 12} fill="#120d0a" opacity="0.45" />
          <TiedPanel
            d={`M12 10H46C44 22 30 31 22 37C30 44 37 53 40 ${FLOOR_Y}H12Z`}
            tie={[22, 37]}
            top={[16, 23, 30, 37, 43]}
            bottom={[16, 24, 31, 37]}
            pleat={pleat}
            edge={edge}
            crease={crease}
          />
          <TiedPanel
            d={`M108 10H74C76 22 90 31 98 37C90 44 83 53 80 ${FLOOR_Y}H108Z`}
            tie={[98, 37]}
            top={[104, 97, 90, 83, 77]}
            bottom={[104, 96, 89, 83]}
            pleat={pleat}
            edge={edge}
            crease={crease}
          />
          <TieBand x={14} y={35.4} width={11} accent={accent} />
          <TieBand x={95} y={35.4} width={11} accent={accent} />
          <PipeHeader x0={10} x1={110} uprights={[12, 108]} />
        </g>
      ) : null}

      {type === "top_swag_valance" ? (
        <g>
          <Jabot side={-1} x={14} width={11} long={34} short={14} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <Jabot side={1} x={106} width={11} long={34} short={14} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <SwagRow x0={22} x1={98} count={3} y={12} drop={20} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <Rod x0={12} x1={108} y={12} />
          <Rosettes x0={22} x1={98} count={3} y={12} accent={accent} />
        </g>
      ) : null}

      {type === "ceremony_arch" ? (
        <g>
          <path
            d={`M33 ${FLOOR_Y}V21Q33 13 41 13H79Q87 13 87 21V${FLOOR_Y}`}
            fill="none"
            stroke={METAL}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <rect x="29" y={FLOOR_Y - 1} width="8" height="1.6" rx="0.5" fill="#1d1c1b" />
          <rect x="83" y={FLOOR_Y - 1} width="8" height="1.6" rx="0.5" fill="#1d1c1b" />
          <TiedPanel
            d={`M30 12H45C43 22 39 30 35 36C39 44 42 53 43 ${FLOOR_Y}H31Z`}
            tie={[35, 36]}
            top={[33, 37, 41]}
            bottom={[33, 37, 40]}
            pleat={pleat}
            edge={edge}
            crease={crease}
          />
          <TiedPanel
            d={`M90 12H75C77 22 81 30 85 36C81 44 78 53 77 ${FLOOR_Y}H89Z`}
            tie={[85, 36]}
            top={[87, 83, 79]}
            bottom={[87, 83, 80]}
            pleat={pleat}
            edge={edge}
            crease={crease}
          />
          <TieBand x={30.5} y={34.4} width={8} accent={accent} />
          <TieBand x={81.5} y={34.4} width={8} accent={accent} />
          <Jabot side={-1} x={29} width={7} long={24} short={9} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <Jabot side={1} x={91} width={7} long={24} short={9} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <SwagRow x0={31} x1={89} count={1} y={12} drop={15} fill={`url(#${fold})`} edge={edge} crease={crease} />
        </g>
      ) : null}

      {type === "layered_swag" ? (
        <g>
          <Jabot side={-1} x={13} width={12} long={40} short={16} fill={`url(#${accentFold})`} edge={shade(accent, 0.5)} crease={shade(accent, 0.62)} />
          <Jabot side={1} x={107} width={12} long={40} short={16} fill={`url(#${accentFold})`} edge={shade(accent, 0.5)} crease={shade(accent, 0.62)} />
          <Jabot side={-1} x={16} width={9} long={30} short={12} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <Jabot side={1} x={104} width={9} long={30} short={12} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <SwagRow x0={35} x1={85} count={2} y={12} drop={25} fill={`url(#${accentFold})`} edge={shade(accent, 0.5)} crease={shade(accent, 0.62)} />
          <SwagRow x0={22} x1={98} count={3} y={12} drop={19} fill={`url(#${fold})`} edge={edge} crease={crease} />
          <Rod x0={12} x1={108} y={12} />
          <Rosettes x0={22} x1={98} count={3} y={12} accent={accent} />
        </g>
      ) : null}
    </svg>
  );
}

function PipeHeader({ x0, x1, uprights }: { x0: number; x1: number; uprights: number[] }) {
  return (
    <g>
      {uprights.map((x) => (
        <g key={x}>
          <line x1={x} y1={9} x2={x} y2={FLOOR_Y} stroke={PIPE} strokeWidth="0.9" />
          <rect x={x - 3} y={FLOOR_Y - 0.9} width="6" height="1.4" rx="0.4" fill="#1d1c1b" />
        </g>
      ))}
      <line x1={x0} y1={9.5} x2={x1} y2={9.5} stroke={PIPE} strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

function Rod({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={METAL} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={x0 - 1.5} cy={y} r="2" fill={METAL} />
      <circle cx={x1 + 1.5} cy={y} r="2" fill={METAL} />
    </g>
  );
}

/** Panel gathered to a tie point, with creases radiating from it. */
function TiedPanel({
  d,
  tie,
  top,
  bottom,
  pleat,
  edge,
  crease,
}: {
  d: string;
  tie: [number, number];
  top: number[];
  bottom: number[];
  pleat: string;
  edge: string;
  crease: string;
}) {
  const [tx, ty] = tie;
  return (
    <g>
      <path d={d} fill={`url(#${pleat})`} stroke={edge} strokeWidth="0.5" />
      <g stroke={crease} strokeWidth="0.55" strokeOpacity="0.75" fill="none">
        {top.map((x) => (
          <path key={`t${x}`} d={`M${x} 11Q${(x + tx) / 2} ${(11 + ty) / 2 + 2} ${tx} ${ty}`} />
        ))}
        {bottom.map((x) => (
          <path key={`b${x}`} d={`M${tx} ${ty + 1}Q${(x + tx) / 2} ${(ty + FLOOR_Y) / 2} ${x} ${FLOOR_Y - 0.5}`} />
        ))}
      </g>
    </g>
  );
}

function TieBand({ x, y, width, accent }: { x: number; y: number; width: number; accent: string }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height="3.2" rx="1.4" fill={accent} stroke={shade(accent, 0.55)} strokeWidth="0.4" />
      <line x1={x + width / 2} y1={y + 3.2} x2={x + width / 2} y2={y + 7} stroke={shade(accent, 0.8)} strokeWidth="0.8" />
      <path d={`M${x + width / 2 - 1.3} ${y + 6.4}h2.6l0.6 3.6h-3.8z`} fill={accent} stroke={shade(accent, 0.55)} strokeWidth="0.3" />
    </g>
  );
}

/** Row of crescent scallops hanging from `y` between x0 and x1. */
function SwagRow({
  x0,
  x1,
  count,
  y,
  drop,
  fill,
  edge,
  crease,
}: {
  x0: number;
  x1: number;
  count: number;
  y: number;
  drop: number;
  fill: string;
  edge: string;
  crease: string;
}) {
  const step = (x1 - x0) / count;
  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const a = x0 + index * step;
        const b = a + step;
        const m = (a + b) / 2;
        return (
          <g key={index}>
            <path
              d={`M${a} ${y}Q${m} ${y + drop * 2} ${b} ${y}Q${m} ${y + drop * 0.7} ${a} ${y}Z`}
              fill={fill}
              stroke={edge}
              strokeWidth="0.5"
            />
            <g stroke={crease} strokeWidth="0.5" strokeOpacity="0.8" fill="none">
              <path d={`M${a + 0.5} ${y}Q${m} ${y + drop * 1.15} ${b - 0.5} ${y}`} />
              <path d={`M${a + 0.5} ${y}Q${m} ${y + drop * 1.55} ${b - 0.5} ${y}`} />
            </g>
          </g>
        );
      })}
    </g>
  );
}

function Rosettes({ x0, x1, count, y, accent }: { x0: number; x1: number; count: number; y: number; accent: string }) {
  const step = (x1 - x0) / count;
  return (
    <g>
      {Array.from({ length: count + 1 }, (_, index) => (
        <g key={index}>
          <circle cx={x0 + index * step} cy={y + 0.5} r="2.6" fill={accent} stroke={shade(accent, 0.5)} strokeWidth="0.4" />
          <circle cx={x0 + index * step} cy={y + 0.5} r="1.1" fill="none" stroke={shade(accent, 0.6)} strokeWidth="0.5" />
        </g>
      ))}
    </g>
  );
}

/** Cascading tail: long outer edge, diagonal hem toward the swag. */
function Jabot({
  side,
  x,
  width,
  long,
  short,
  fill,
  edge,
  crease,
}: {
  side: -1 | 1;
  x: number;
  width: number;
  long: number;
  short: number;
  fill: string;
  edge: string;
  crease: string;
}) {
  const inner = x - side * width;
  const outerHem = 12 + long;
  const innerHem = 12 + short;
  const lines = [0.33, 0.66].map((t) => {
    const lx = x + (inner - x) * t;
    return { lx, hem: outerHem + (innerHem - outerHem) * t };
  });
  return (
    <g>
      <path
        d={`M${x} 12L${x} ${outerHem}L${inner} ${innerHem}L${inner} 12Z`}
        fill={fill}
        stroke={edge}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <g stroke={crease} strokeWidth="0.5" strokeOpacity="0.8">
        {lines.map(({ lx, hem }) => (
          <line key={lx} x1={lx} y1={12.5} x2={lx} y2={hem - 0.5} />
        ))}
      </g>
    </g>
  );
}

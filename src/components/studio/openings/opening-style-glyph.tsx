import type { StudioOpeningStyle } from "@/data/studio";
import { getOpeningPreset } from "@/data/studio-openings";
import { cn } from "@/lib/utils";

const VIEW = 40;
const FLOOR_Y = 36;
/** Wall height (inches) the glyph frame represents. */
const REF_WALL = 132;
const SCALE = 30 / REF_WALL;

/**
 * Miniature elevation of an opening style — floor line, frame, leaves or
 * panes — drawn to a shared scale so sizes read relative to each other.
 */
export function OpeningStyleGlyph({
  style,
  className,
}: {
  style: StudioOpeningStyle;
  className?: string;
}) {
  const preset = getOpeningPreset(style);
  const height = preset.height === "fill" ? REF_WALL - preset.sill - 12 : preset.height;
  const w = Math.min(34, preset.width * SCALE * 1.15);
  const h = Math.min(32, height * SCALE);
  const x = (VIEW - w) / 2;
  const bottom = FLOOR_Y - preset.sill * SCALE;
  const top = bottom - h;
  const rise = preset.arched ? Math.min(w / 2, h * 0.45) : 0;
  const outline = preset.arched
    ? `M${x} ${bottom} V${top + rise} A${w / 2} ${rise} 0 0 1 ${x + w} ${top + rise} V${bottom} Z`
    : `M${x} ${bottom} V${top} H${x + w} V${bottom} Z`;
  const cx = x + w / 2;
  const isDouble = preset.width >= 60 && preset.type === "entrance";

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={cn("size-10", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1={2} y1={FLOOR_Y} x2={38} y2={FLOOR_Y} strokeOpacity={0.35} />
      <path
        d={outline}
        fill="currentColor"
        fillOpacity={preset.glass || preset.type === "window" ? 0.14 : 0.08}
      />
      {preset.type === "window" ? (
        <WindowPanes x={x} w={w} top={top} bottom={bottom} rise={rise} transom={style === "transom"} />
      ) : preset.glass ? (
        <>
          <line x1={cx} y1={top + 1} x2={cx} y2={bottom} />
          <line x1={x + 3} y1={top + h * 0.35} x2={x + w * 0.3} y2={top + h * 0.15} strokeOpacity={0.5} />
          <line x1={cx + 3} y1={top + h * 0.45} x2={cx + w * 0.25} y2={top + h * 0.25} strokeOpacity={0.5} />
        </>
      ) : isDouble ? (
        <>
          <line x1={cx} y1={top + rise * 0.4} x2={cx} y2={bottom} />
          <circle cx={cx - 1.6} cy={bottom - h * 0.45} r={0.6} fill="currentColor" />
          <circle cx={cx + 1.6} cy={bottom - h * 0.45} r={0.6} fill="currentColor" />
          {preset.arched ? null : (
            <>
              <rect x={x + 2} y={top + 2.5} width={w / 2 - 4} height={h * 0.38} strokeOpacity={0.4} />
              <rect x={cx + 2} y={top + 2.5} width={w / 2 - 4} height={h * 0.38} strokeOpacity={0.4} />
            </>
          )}
        </>
      ) : (
        <>
          <circle cx={x + w - 2.2} cy={bottom - h * 0.45} r={0.7} fill="currentColor" />
          {style === "service_door" ? (
            <>
              <circle cx={cx} cy={top + h * 0.3} r={Math.min(2.4, w * 0.22)} />
              <line x1={x + 1.5} y1={bottom - 3} x2={x + w - 1.5} y2={bottom - 3} strokeOpacity={0.55} />
            </>
          ) : (
            <rect x={x + 2} y={top + 2.5} width={w - 4} height={h * 0.38} strokeOpacity={0.4} />
          )}
        </>
      )}
    </svg>
  );
}

function WindowPanes({
  x,
  w,
  top,
  bottom,
  rise,
  transom,
}: {
  x: number;
  w: number;
  top: number;
  bottom: number;
  rise: number;
  transom: boolean;
}) {
  const cx = x + w / 2;
  const mid = top + rise + (bottom - top - rise) / 2;
  if (transom) {
    return (
      <>
        <line x1={x + w / 3} y1={top} x2={x + w / 3} y2={bottom} />
        <line x1={x + (2 * w) / 3} y1={top} x2={x + (2 * w) / 3} y2={bottom} />
      </>
    );
  }
  return (
    <>
      <line x1={cx} y1={top} x2={cx} y2={bottom} />
      <line x1={x} y1={rise > 0 ? top + rise : mid} x2={x + w} y2={rise > 0 ? top + rise : mid} />
      {rise === 0 && w > 20 ? (
        <>
          <line x1={x + w / 4} y1={top} x2={x + w / 4} y2={bottom} strokeOpacity={0.45} />
          <line x1={x + (3 * w) / 4} y1={top} x2={x + (3 * w) / 4} y2={bottom} strokeOpacity={0.45} />
        </>
      ) : null}
    </>
  );
}

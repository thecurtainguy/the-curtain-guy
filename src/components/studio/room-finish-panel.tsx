"use client";

import {
  DRAPE_COLORS,
  STUDIO_CEILING_FINISHES,
  STUDIO_FLOOR_FINISHES,
  STUDIO_LIGHTING_MOODS,
  STUDIO_WALL_DISPLAYS,
  STUDIO_WALL_FINISHES,
  getStudioMaterials,
  getStudioWallDisplay,
  type StudioCeilingFinish,
  type StudioDesignJson,
  type StudioFloorFinish,
  type StudioLightingMood,
  type StudioMaterials,
  type StudioWallDisplay,
  type StudioWallFinish,
} from "@/data/studio";
import { cn } from "@/lib/utils";
import {
  Ban,
  Box,
  Eye,
  Grid3x3,
  Fence,
  Layers3,
  Lightbulb,
  PanelTop,
  Paintbrush,
  Square,
  SunMedium,
  type LucideIcon,
} from "lucide-react";
import { ChoiceTile } from "./library/studio-library-ui";
import { StudioTip } from "./studio-tip";

type RoomFinishPanelProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
};

const FLOOR_SWATCHES: Record<StudioFloorFinish, { label: string; background: string }> = {
  warm_wood: {
    label: "Ballroom wood",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 60%), repeating-linear-gradient(90deg, #9c6a3d 0 9px, #7d4f2b 9px 10px, #8a5a32 10px 19px, #6f4425 19px 20px)",
  },
  event_carpet: {
    label: "Event carpet",
    background:
      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0) 0 0 / 4px 4px, linear-gradient(135deg, #756b5f, #554d44)",
  },
  polished_concrete: {
    label: "Concrete",
    background:
      "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.35), transparent 55%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.15), transparent 40%), linear-gradient(135deg, #9a9893, #74726d)",
  },
  black_event: {
    label: "Black floor",
    background:
      "linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%), linear-gradient(135deg, #1f1f22, #0a0a0b)",
  },
  light_neutral: {
    label: "Light neutral",
    background:
      "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4), transparent 60%), linear-gradient(135deg, #ddd5c7, #bdb4a4)",
  },
  white_marble: {
    label: "White marble",
    background:
      "linear-gradient(118deg, transparent 38%, rgba(140,140,140,0.45) 40%, transparent 43%), linear-gradient(62deg, transparent 58%, rgba(170,160,150,0.35) 60%, transparent 63%), linear-gradient(135deg, #f4f3ef, #dcdad4)",
  },
  dark_oak: {
    label: "Dark oak",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08), transparent 60%), repeating-linear-gradient(90deg, #4a3220 0 11px, #2b1c12 11px 12px, #3f2a1b 12px 23px, #2b1c12 23px 24px)",
  },
  herringbone: {
    label: "Herringbone",
    background:
      "linear-gradient(45deg, #8a5d33 25%, transparent 25%, transparent 75%, #8a5d33 75%) 0 0 / 10px 10px, linear-gradient(-45deg, #b07d45 25%, transparent 25%, transparent 75%, #b07d45 75%) 0 0 / 10px 10px, #9c6c3a",
  },
  lawn: {
    label: "Garden lawn",
    background:
      "repeating-linear-gradient(100deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 4px), radial-gradient(circle at 30% 30%, #6c9a40, #3a6122)",
  },
};

const WALL_SWATCHES: Record<StudioWallFinish, { label: string; background: string }> = {
  warm_ivory: { label: "Ivory", background: "linear-gradient(180deg, #f2e8d4, #d6c8ac)" },
  soft_grey: { label: "Soft grey", background: "linear-gradient(180deg, #bebdb9, #8f8e8a)" },
  black_box: { label: "Black box", background: "linear-gradient(180deg, #222225, #0b0b0c)" },
  neutral_beige: { label: "Beige", background: "linear-gradient(180deg, #d8c6a8, #b4a07d)" },
  white_plaster: {
    label: "Plaster",
    background:
      "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.05), transparent 30%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.04), transparent 25%), linear-gradient(180deg, #f6f4ef, #e2dfd7)",
  },
  exposed_brick: {
    label: "Brick",
    background:
      "repeating-linear-gradient(0deg, #cdbfae 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, #cdbfae 0 1px, transparent 1px 13px), linear-gradient(135deg, #9a4730, #6e2f1f)",
  },
  wood_panel: {
    label: "Wood panel",
    background:
      "repeating-linear-gradient(90deg, #6e4829 0 13px, #4a2f1b 13px 15px), linear-gradient(180deg, rgba(255,255,255,0.1), transparent)",
  },
  tent_canvas: {
    label: "Tent canvas",
    background:
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 16px), linear-gradient(180deg, #faf7ef, #ddd5c4)",
  },
};

const LIGHTING_SWATCHES: Record<StudioLightingMood, string> = {
  neutral: "linear-gradient(160deg, #e2dfd8, #8e8a82)",
  warm_gala:
    "radial-gradient(circle at 50% 0%, #ffd58a, #b0651e 45%, #2a1406 85%)",
  dark_venue:
    "radial-gradient(circle at 50% 30%, #6b4a92, #20152b 50%, #050407 90%)",
  bright_setup: "linear-gradient(180deg, #ffffff, #e3e3e0)",
  candlelight:
    "radial-gradient(circle at 50% 75%, #ffbf5a, #85400d 45%, #170902 85%)",
  twilight_blue: "linear-gradient(180deg, #1f2d6b, #6d5594 55%, #e0a27a)",
  daylight: "linear-gradient(180deg, #b9ddff, #fff8e6)",
};

const WALL_DISPLAY_META: Record<
  StudioWallDisplay,
  { label: string; icon: LucideIcon }
> = {
  full: { label: "Full", icon: Square },
  cutaway: { label: "Cutaway", icon: Box },
  low: { label: "Low", icon: Fence },
  glass: { label: "Glass", icon: Eye },
};

const CEILING_TILE_LABELS: Record<StudioCeilingFinish, string> = {
  auto: "Venue",
  flat: "Flat",
  tray: "Tray",
  coffered: "Coffered",
  beams: "Beams",
  truss: "Industrial",
  black: "Black-out",
};

const PLASTER_BG = "linear-gradient(180deg, #ebe6dc, #cfc8bb)";

function CanDot({ x, y, dim = false }: { x: number; y: number; dim?: boolean }) {
  return (
    <>
      <circle cx={x} cy={y} r={dim ? 2.6 : 3.8} fill="rgba(255,226,160,0.32)" />
      <circle cx={x} cy={y} r={dim ? 0.9 : 1.4} fill={dim ? "#f3d9a4" : "#fffbea"} />
    </>
  );
}

/** Looking-up thumbnail of each ceiling architecture. */
function CeilingPreview({ finish }: { finish: StudioCeilingFinish }) {
  const backgrounds: Record<StudioCeilingFinish, string> = {
    auto: PLASTER_BG,
    flat: PLASTER_BG,
    tray: "linear-gradient(180deg, #c4bcae, #a9a092)",
    coffered: "linear-gradient(180deg, #d6cfc2, #b9b1a3)",
    beams:
      "repeating-linear-gradient(180deg, #e6e0d4 0 3px, #cfc6b6 3px 3.6px), linear-gradient(180deg, #e6e0d4, #d2c9b8)",
    truss: "repeating-linear-gradient(180deg, #2b2c30 0 2px, #1f2023 2px 4px)",
    black: "radial-gradient(ellipse at 50% 30%, #1d1d20, #0a0a0b 75%)",
  };
  return (
    <span
      className="relative block h-8 overflow-hidden rounded-lg border border-white/10 shadow-inner"
      style={{ background: backgrounds[finish] }}
    >
      <svg viewBox="0 0 64 32" className="absolute inset-0 size-full" aria-hidden>
        {finish === "auto" ? (
          <>
            <rect x="9" y="6" width="46" height="20" rx="2" fill="none" stroke="oklch(0.76 0.15 88)" strokeWidth="1" strokeDasharray="3 2" opacity="0.85" />
            <path d="M32 10 L33.6 14.4 L38 16 L33.6 17.6 L32 22 L30.4 17.6 L26 16 L30.4 14.4 Z" fill="oklch(0.76 0.15 88)" />
          </>
        ) : null}
        {finish === "flat" ? (
          <>
            <rect x="0.5" y="0.5" width="63" height="31" fill="none" stroke="rgba(0,0,0,0.12)" />
            {[14, 32, 50].map((x) => (
              <g key={x}>
                <CanDot x={x} y={10} />
                <CanDot x={x} y={22} />
              </g>
            ))}
          </>
        ) : null}
        {finish === "tray" ? (
          <>
            <rect x="9" y="6" width="46" height="20" fill="#ece7dd" />
            <rect x="9" y="6" width="46" height="20" fill="none" stroke="oklch(0.82 0.13 80)" strokeWidth="2.2" opacity="0.75" />
            <CanDot x={22} y={16} />
            <CanDot x={42} y={16} />
          </>
        ) : null}
        {finish === "coffered" ? (
          <>
            {[0, 1, 2, 3].map((i) =>
              [0, 1].map((j) => (
                <g key={`${i}-${j}`}>
                  <rect x={4 + i * 14.5} y={4 + j * 13} width="12" height="11" fill="#efeae1" stroke="rgba(60,50,40,0.28)" strokeWidth="1.4" />
                  <CanDot x={10 + i * 14.5} y={9.5 + j * 13} dim />
                </g>
              ))
            )}
          </>
        ) : null}
        {finish === "beams" ? (
          <>
            {[8, 22, 36, 50].map((x) => (
              <g key={x}>
                <rect x={x} y="0" width="5" height="32" fill="#5b3d26" />
                <rect x={x} y="0" width="1.2" height="32" fill="rgba(0,0,0,0.3)" />
              </g>
            ))}
          </>
        ) : null}
        {finish === "truss" ? (
          <>
            <rect x="0" y="3" width="64" height="5" rx="2.5" fill="#a3a8ad" />
            <rect x="0" y="4" width="64" height="1" fill="rgba(255,255,255,0.35)" />
            <line x1="0" y1="13" x2="64" y2="13" stroke="#c9ccd0" strokeWidth="1" />
            <line x1="0" y1="19" x2="64" y2="19" stroke="#c9ccd0" strokeWidth="1" />
            <polyline
              points={Array.from({ length: 17 }, (_, i) => `${i * 4},${i % 2 ? 19 : 13}`).join(" ")}
              fill="none"
              stroke="#c9ccd0"
              strokeWidth="0.6"
            />
            {[12, 32, 52].map((x) => (
              <CanDot key={x} x={x} y={26} />
            ))}
          </>
        ) : null}
        {finish === "black" ? (
          <>
            <CanDot x={20} y={16} dim />
            <CanDot x={44} y={16} dim />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function FinishGroup({
  icon: Icon,
  label,
  value,
  id,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" aria-hidden />
        <p
          id={id}
          className="text-[0.6rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
        >
          {label}
        </p>
        <span className="ml-auto truncate text-[0.62rem] text-foreground/80">
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}

export function RoomFinishPanel({
  design,
  onChange,
  idPrefix,
}: RoomFinishPanelProps) {
  const materials = getStudioMaterials(design);
  const ceiling = materials.ceiling ?? "auto";
  const wallDisplay = getStudioWallDisplay(design.view);
  const showCeiling = Boolean(design.view.showCeiling);
  const uplight = materials.uplightColor ?? null;
  const uplightLabel = uplight
    ? (DRAPE_COLORS.find((color) => color.value === uplight)?.label ?? uplight)
    : "Off";
  const gid = (name: string) => `${idPrefix}-${name}`;

  function updateMaterials(patch: Partial<StudioMaterials>) {
    onChange({ ...design, materials: { ...materials, ...patch } });
  }

  function setWallDisplay(value: StudioWallDisplay) {
    onChange({
      ...design,
      view: {
        ...design.view,
        wallDisplay: value,
        transparentWalls: value === "glass",
      },
    });
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/40 bg-card/25"
      aria-labelledby={`${idPrefix}-heading`}
    >
      <div className="relative border-b border-border/40 bg-gradient-to-br from-primary/12 via-card/40 to-transparent p-3.5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-primary shadow-sm">
            <Paintbrush className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Atmosphere
            </p>
            <h3 id={`${idPrefix}-heading`} className="font-heading text-base leading-tight">
              Scene &amp; finishes
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-3.5">
        <FinishGroup
          icon={Layers3}
          label="Floor"
          value={FLOOR_SWATCHES[materials.floor].label}
          id={gid("floor")}
        >
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-labelledby={gid("floor")}>
            {STUDIO_FLOOR_FINISHES.map((option) => (
              <ChoiceTile
                key={option.value}
                compact
                selected={materials.floor === option.value}
                onSelect={() => updateMaterials({ floor: option.value })}
                label={FLOOR_SWATCHES[option.value].label}
                preview={
                  <span
                    className="block h-8 rounded-lg border border-white/10 shadow-inner"
                    style={{ background: FLOOR_SWATCHES[option.value].background }}
                  />
                }
              />
            ))}
          </div>
        </FinishGroup>

        <FinishGroup
          icon={PanelTop}
          label="Walls"
          value={WALL_SWATCHES[materials.walls].label}
          id={gid("walls")}
        >
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-labelledby={gid("walls")}>
            {STUDIO_WALL_FINISHES.map((option) => (
              <ChoiceTile
                key={option.value}
                compact
                selected={materials.walls === option.value}
                onSelect={() => updateMaterials({ walls: option.value })}
                label={WALL_SWATCHES[option.value].label}
                preview={
                  <span
                    className="block h-8 rounded-lg border border-white/10 shadow-inner"
                    style={{ background: WALL_SWATCHES[option.value].background }}
                  />
                }
              />
            ))}
          </div>
        </FinishGroup>

        <FinishGroup
          icon={Grid3x3}
          label="Ceiling"
          value={
            STUDIO_CEILING_FINISHES.find((option) => option.value === ceiling)?.label ?? ""
          }
          id={gid("ceiling")}
        >
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-labelledby={gid("ceiling")}>
            {STUDIO_CEILING_FINISHES.map((option) => (
              <ChoiceTile
                key={option.value}
                compact
                selected={ceiling === option.value}
                onSelect={() => updateMaterials({ ceiling: option.value })}
                label={CEILING_TILE_LABELS[option.value]}
                tip={option.label}
                preview={<CeilingPreview finish={option.value} />}
              />
            ))}
          </div>
        </FinishGroup>

        <FinishGroup
          icon={SunMedium}
          label="Lighting mood"
          value={
            STUDIO_LIGHTING_MOODS.find((option) => option.value === materials.lighting)
              ?.label ?? ""
          }
          id={gid("lighting")}
        >
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-labelledby={gid("lighting")}>
            {STUDIO_LIGHTING_MOODS.map((option) => (
              <ChoiceTile
                key={option.value}
                compact
                selected={materials.lighting === option.value}
                onSelect={() => updateMaterials({ lighting: option.value })}
                label={option.label}
                preview={
                  <span
                    className="block h-8 rounded-lg border border-white/10"
                    style={{ background: LIGHTING_SWATCHES[option.value] }}
                  />
                }
              />
            ))}
          </div>
        </FinishGroup>

        <FinishGroup
          icon={Lightbulb}
          label="Perimeter uplighting"
          value={uplightLabel}
          id={gid("uplight")}
        >
          <div
            className="grid grid-cols-7 gap-1.5 @lg:grid-cols-[repeat(auto-fill,1.75rem)] @lg:gap-2.5"
            role="radiogroup"
            aria-labelledby={gid("uplight")}
          >
            <StudioTip label="No uplighting">
              <button
                type="button"
                role="radio"
                aria-checked={uplight === null}
                aria-label="No uplighting"
                onClick={() => updateMaterials({ uplightColor: null })}
                className={cn(
                  "relative flex aspect-square w-full items-center justify-center rounded-full border border-border/60 bg-background/50 text-muted-foreground transition-transform hover:z-10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:hover:scale-100",
                  uplight === null && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <Ban className="size-3.5" aria-hidden />
              </button>
            </StudioTip>
            {DRAPE_COLORS.map((color) => {
              const selected = uplight === color.value;
              return (
                <StudioTip key={color.value} label={`${color.label} uplighting`}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${color.label} uplighting`}
                    onClick={() => updateMaterials({ uplightColor: color.value })}
                    className={cn(
                      "relative aspect-square w-full rounded-full border border-white/15 transition-transform hover:z-10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:hover:scale-100",
                      selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={{
                      background: `radial-gradient(circle at 50% 100%, ${color.hex}, ${color.hex}cc 45%, ${color.hex}55)`,
                      boxShadow: selected ? `0 0 12px ${color.hex}` : undefined,
                    }}
                  />
                </StudioTip>
              );
            })}
          </div>
        </FinishGroup>

        <FinishGroup
          icon={Box}
          label="Wall display"
          value={WALL_DISPLAY_META[wallDisplay].label}
          id={gid("display")}
        >
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-labelledby={gid("display")}>
            {STUDIO_WALL_DISPLAYS.map((option) => (
              <ChoiceTile
                key={option.value}
                compact
                selected={wallDisplay === option.value}
                onSelect={() => setWallDisplay(option.value)}
                icon={WALL_DISPLAY_META[option.value].icon}
                label={WALL_DISPLAY_META[option.value].label}
                tip={option.label}
              />
            ))}
          </div>
        </FinishGroup>

        <button
          type="button"
          role="switch"
          aria-checked={showCeiling}
          onClick={() =>
            onChange({
              ...design,
              view: { ...design.view, showCeiling: !showCeiling },
            })
          }
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
            showCeiling
              ? "border-primary/45 bg-primary/10"
              : "border-border/40 bg-background/30 hover:border-primary/30"
          )}
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PanelTop className="size-3.5 rotate-180" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-foreground">Show ceiling</span>
            <span className="block text-[0.6rem] text-muted-foreground">
              Close the room overhead in 3D
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative h-4.5 w-8 shrink-0 rounded-full border transition-colors",
              showCeiling ? "border-primary bg-primary" : "border-border/60 bg-muted/60"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-3 rounded-full bg-background shadow transition-[left] motion-reduce:transition-none",
                showCeiling ? "left-4" : "left-0.5"
              )}
            />
          </span>
        </button>
      </div>
    </section>
  );
}

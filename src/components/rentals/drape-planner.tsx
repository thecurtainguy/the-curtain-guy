"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Box, Check, Columns3, Info, Plus, Ruler, ShoppingBag, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { buildProductColorOptions, resolveColorUnitPriceCents, type ProductColorVariantRow } from "@/data/product-colors";
import { formatCadFromCents, type PublicRentalProduct, type RentalCartLine } from "@/data/rentals";
import { buildLinearFtCartLines, cartSubtotalCents } from "@/lib/rentals";
import {
  DEFAULT_PIPE_DRAPE_SETTINGS,
  PIPE_DRAPE_HEIGHT_PRESETS,
  calculatePipeDrape,
  formatFeetInches,
  hardwareKeyForProductName,
  normalizePipeDrapePlan,
  pipeDrapeHardwareTotals,
  type PipeDrapeRun,
} from "@/lib/pipe-drape";
import { PipeDrapeElevation } from "@/components/pipe-drape/pipe-drape-elevation";
import { PipeDrapePlan } from "@/components/pipe-drape/pipe-drape-plan";
import { useRentalsCart } from "@/components/rentals/rentals-cart-provider";
import { QuantityStepper } from "@/components/rentals/quantity-stepper";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tcg-drape-planner-v1";
const NOT_LOADED = "\u0000";
const MIN_HEIGHT_FT = 4;
const MAX_HEIGHT_FT = 20;
const noopSubscribe = () => () => {};

type PlannerState = {
  runs: PipeDrapeRun[];
  heightFt: number;
  drapeId: string | null;
  colorId: string | null;
};

type RunName = "backdrop" | "left" | "back" | "right" | "stageLeft" | "upstage" | "stageRight" | "front";
type PresetId = "backdrop" | "booth" | "stage" | "room";

const PRESETS: Array<{ id: PresetId; points: string; runs: Array<[RunName, number, boolean]> }> = [
  { id: "backdrop", points: "4,14 28,14", runs: [["backdrop", 20, false]] },
  { id: "booth", points: "6,22 6,6 26,6 26,22", runs: [["left", 10, false], ["back", 10, true], ["right", 10, true]] },
  {
    id: "stage",
    points: "3,22 3,8 29,8 29,22",
    runs: [["stageLeft", 12, false], ["upstage", 24, true], ["stageRight", 12, true]],
  },
  {
    id: "room",
    points: "3,6 29,6 29,22 3,22 3,6",
    runs: [["left", 20, true], ["back", 30, true], ["right", 20, true], ["front", 30, true]],
  },
];

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseStored(raw: string): PlannerState | null {
  if (!raw || raw === NOT_LOADED) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlannerState>;
    const plan = normalizePipeDrapePlan({ runs: value.runs, settings: { heightFt: value.heightFt } });
    if (!plan) return null;
    return {
      runs: plan.runs,
      heightFt: Math.min(MAX_HEIGHT_FT, Math.max(MIN_HEIGHT_FT, plan.settings.heightFt)),
      drapeId: typeof value.drapeId === "string" ? value.drapeId : null,
      colorId: typeof value.colorId === "string" ? value.colorId : null,
    };
  } catch {
    return null;
  }
}

function newRun(label: string, lengthFt: number, joinsPrevious = false): PipeDrapeRun {
  return { id: crypto.randomUUID(), label, lengthFt, joinsPrevious };
}

function rangeLabel(sizeId: string | null) {
  const [min, max] = (sizeId ?? "").split("-");
  return min && max ? `${min}′–${max}′` : "";
}

export function DrapePlanner({ drapes }: { drapes: PublicRentalProduct[] }) {
  const t = useTranslations("rentals.planner");
  const stored = useSyncExternalStore(noopSubscribe, readStored, () => NOT_LOADED);
  const initial = useMemo(() => parseStored(stored), [stored]);

  if (stored === NOT_LOADED) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]" aria-busy>
        <div className="h-[32rem] animate-pulse rounded-4xl border border-border/40 bg-card/30" />
        <div className="h-[32rem] animate-pulse rounded-4xl border border-border/40 bg-card/30">
          <span className="sr-only">{t("loading")}</span>
        </div>
      </div>
    );
  }
  return <PlannerBody drapes={drapes} initial={initial} />;
}

function PlannerBody({ drapes, initial }: { drapes: PublicRentalProduct[]; initial: PlannerState | null }) {
  const t = useTranslations("rentals.planner");
  const { addLines } = useRentalsCart();
  const [state, setState] = useState<PlannerState>(
    () =>
      initial ?? {
        runs: [newRun(t("runNames.backdrop"), 20)],
        heightFt: 10,
        drapeId: null,
        colorId: null,
      }
  );
  const [view, setView] = useState<"front" | "plan">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function update(next: PlannerState | ((prev: PlannerState) => PlannerState)) {
    setState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Storage blocked; the planner still works for this visit.
      }
      return value;
    });
  }

  const { runs, heightFt } = state;
  const settings = useMemo(() => ({ ...DEFAULT_PIPE_DRAPE_SETTINGS, heightFt }), [heightFt]);
  const result = useMemo(() => calculatePipeDrape(runs, settings), [runs, settings]);
  const totals = useMemo(() => pipeDrapeHardwareTotals(result), [result]);
  const selectedRun = result.runs.find((run) => run.id === selectedId) ?? result.runs[0] ?? null;
  const crossbarItems = result.items.filter((item) => item.key === "crossbar");

  const drape = drapes.find((product) => product.id === state.drapeId) ?? drapes[0] ?? null;
  const colors = useMemo(() => (drape ? buildProductColorOptions(drape) : []), [drape]);
  const color: ProductColorVariantRow | null = colors.find((option) => option.id === state.colorId) ?? colors[0] ?? null;
  const colorHex = color?.hex ?? drape?.default_color_hex ?? "#1c1c1c";
  const colorName = color?.name ?? drape?.default_color_name ?? "";
  const feet = Math.ceil(result.totalFt - 1e-6);
  const unitPriceCents = drape
    ? resolveColorUnitPriceCents({ productPriceCents: drape.default_unit_price_cents, color })
    : 0;

  const cartLines = useMemo<RentalCartLine[]>(() => {
    if (!drape || !(feet > 0)) return [];
    const layout = t("cartLayout", {
      walls: runs
        .filter((run) => run.lengthFt > 0)
        .map((run) => formatFeetInches(run.lengthFt))
        .join(" + "),
      height: formatFeetInches(heightFt),
    });
    return buildLinearFtCartLines({
      product: drape,
      linearFeet: feet,
      fullServiceEnabled: false,
      transportOnlyEnabled: false,
      addonSelections: [],
      color,
    }).map((line) => {
      if (line.lineKind === "main") return { ...line, description: `${line.description} · ${layout}` };
      if (line.lineKind !== "include") return line;
      const key = hardwareKeyForProductName(line.name);
      return key ? { ...line, quantity: totals[key] } : line;
    });
  }, [drape, feet, color, runs, heightFt, totals, t]);

  const subtotalCents = cartSubtotalCents(cartLines);
  const includeLines = cartLines.filter((line) => line.lineKind === "include" && line.quantity > 0);

  function patchRun(id: string, next: Partial<PipeDrapeRun>) {
    update((prev) => ({ ...prev, runs: prev.runs.map((run) => (run.id === id ? { ...run, ...next } : run)) }));
  }
  function removeRun(id: string) {
    update((prev) => {
      const remaining = prev.runs.filter((run) => run.id !== id);
      return { ...prev, runs: remaining.length > 0 ? remaining : [newRun(t("wallDefault", { n: 1 }), 10)] };
    });
  }
  function addRun() {
    update((prev) => ({
      ...prev,
      runs: [...prev.runs, newRun(t("wallDefault", { n: prev.runs.length + 1 }), 10, prev.runs.length > 0)],
    }));
  }
  function applyPreset(id: PresetId) {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    update((prev) => ({
      ...prev,
      runs: preset.runs.map(([name, length, join]) => newRun(t(`runNames.${name}`), length, join)),
    }));
    setSelectedId(null);
  }
  function setHeight(value: number) {
    update((prev) => ({ ...prev, heightFt: Math.min(MAX_HEIGHT_FT, Math.max(MIN_HEIGHT_FT, value)) }));
  }

  function addToCart() {
    if (cartLines.length === 0) return;
    addLines(cartLines);
    toast.success(t("added"));
  }

  const elevationLabels = {
    corner: t("drawing.corner"),
    high: (height: string) => t("drawing.high", { height }),
    person: t("drawing.person"),
    summary: (run: { label: string; length: string; bays: number; height: string }) => t("drawing.summary", run),
  };

  const visual = (
    <div className="space-y-4 lg:col-start-2 lg:row-start-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>{t("chips.feet", { feet })}</Chip>
        <Chip>{t("chips.walls", { count: result.runs.length })}</Chip>
        <Chip>{t("chips.height", { height: formatFeetInches(heightFt) })}</Chip>
        {result.corners > 0 ? <Chip>{t("chips.corners", { count: result.corners })}</Chip> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Columns3} title={t("tiles.uprights")} value={totals.upright} detail={t("specs.upright", { range: rangeLabel(result.uprightSize.id) })} />
        <StatTile icon={Box} title={t("tiles.bases")} value={totals.base} detail={t("specs.base", { size: `${result.base.id}″ × ${result.base.id}″` })} />
        <StatTile
          icon={Ruler}
          title={t("tiles.crossbars")}
          value={totals.crossbar}
          detail={
            crossbarItems.length > 1
              ? t("specs.crossbarMixed", { count: crossbarItems.length })
              : t("specs.crossbar", { range: rangeLabel(crossbarItems[0]?.sizeId ?? null) })
          }
        />
        <StatTile icon={Sparkles} title={t("tiles.drape")} value={feet} detail={t("specs.drape")} />
      </div>

      <div className="overflow-hidden rounded-4xl border border-border/40 bg-card/30">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-3">
          <div className="flex gap-1 rounded-xl border border-border/40 bg-background/40 p-1" role="radiogroup" aria-label={t("drawing.front")}>
            {(["front", "plan"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={view === option}
                onClick={() => setView(option)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs transition-colors",
                  view === option
                    ? "bg-primary/15 font-medium text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option === "front" ? t("drawing.front") : t("drawing.plan")}
              </button>
            ))}
          </div>
          {view === "front" && result.runs.length > 1 ? (
            <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("wallsTitle")}>
              {result.runs.map((run, index) => (
                <button
                  key={run.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedRun?.id === run.id}
                  onClick={() => setSelectedId(run.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selectedRun?.id === run.id
                      ? "border-primary/50 bg-primary/12 font-medium text-primary"
                      : "border-border/40 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {index + 1}. {run.label}
                </button>
              ))}
            </div>
          ) : null}
          <span className="ml-auto text-[11px] text-muted-foreground">{t("drawing.toScale")}</span>
        </div>
        <div className="p-4">
          {!selectedRun ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("drawing.empty")}</p>
          ) : view === "front" ? (
            <PipeDrapeElevation
              key={selectedRun.id}
              run={selectedRun}
              heightFt={heightFt}
              colorHex={colorHex}
              fullness={settings.fullness}
              panelWidthIn={settings.panelWidthIn}
              puddleIn={settings.puddleIn}
              baseWidthIn={result.base.id === "24" ? 24 : 18}
              labels={elevationLabels}
            />
          ) : (
            <PipeDrapePlan
              runs={result.runs}
              colorHex={colorHex}
              selectedId={selectedRun.id}
              feetUnit={t("feetUnit")}
              showRunLabel={(label) => t("drawing.showWall", { label })}
              onSelect={(id) => {
                setSelectedId(id);
                setView("front");
              }}
            />
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <Legend className="bg-gradient-to-r from-zinc-400 via-zinc-100 to-zinc-400" label={t("drawing.frame")} />
            <Legend className="rounded-full bg-primary" label={t("drawing.cornerPost")} />
            <Legend color={colorHex} label={t("drawing.drape", { color: colorName || drape?.name || "" })} />
            {view === "plan" ? <span>{t("drawing.tapPlan")}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );

  const steps = (
    <div className="space-y-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
      <StepCard eyebrow={t("presetsEyebrow")} title={t("presetsTitle")}>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="group flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card/40 p-2.5 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-primary/[0.05]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg viewBox="0 0 32 28" className="size-7" aria-hidden>
                  <polyline points={preset.points} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{t(`presets.${preset.id}.label`)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{t(`presets.${preset.id}.detail`)}</span>
              </span>
            </button>
          ))}
        </div>
      </StepCard>

      <StepCard
        eyebrow={t("wallsEyebrow")}
        title={t("wallsTitle")}
        aside={
          <Button type="button" size="sm" variant="outline" onClick={addRun} className="h-8 gap-1">
            <Plus className="size-3.5" /> {t("addWall")}
          </Button>
        }
      >
        <div className="space-y-2.5">
          {runs.map((run, index) => {
            const computed = result.runs.find((item) => item.id === run.id);
            const canJoin = index > 0 || runs.length >= 3;
            return (
              <div
                key={run.id}
                className={cn(
                  "rounded-2xl border p-3 transition-colors",
                  selectedRun?.id === run.id ? "border-primary/45 bg-primary/[0.06]" : "border-border/40 bg-background/30"
                )}
                onFocusCapture={() => setSelectedId(run.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <input
                    value={run.label}
                    onChange={(event) => patchRun(run.id, { label: event.target.value.slice(0, 40) })}
                    aria-label={t("wallName", { n: index + 1 })}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:bg-input/40 focus-visible:border-primary/40 focus-visible:bg-input/50"
                  />
                  <button
                    type="button"
                    aria-label={t("removeWall", { name: run.label || t("wallDefault", { n: index + 1 }) })}
                    onClick={() => removeRun(run.id)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <QuantityStepper
                    value={run.lengthFt}
                    min={1}
                    max={300}
                    unit={t("feetUnit")}
                    size="sm"
                    aria-label={t("wallLength", { n: index + 1 })}
                    onChange={(lengthFt) => patchRun(run.id, { lengthFt })}
                  />
                  {computed ? (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {t("sections", { count: computed.bays, width: formatFeetInches(computed.bayFt) })}
                    </span>
                  ) : null}
                </div>
                {canJoin ? (
                  <Toggle
                    checked={run.joinsPrevious}
                    onChange={(checked) => patchRun(run.id, { joinsPrevious: checked })}
                    label={index === 0 ? t("closesRoom", { n: runs.length }) : t("cornerWith", { n: index })}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </StepCard>

      <StepCard eyebrow={t("heightEyebrow")} title={t("heightTitle")}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <QuantityStepper
              value={heightFt}
              min={MIN_HEIGHT_FT}
              max={MAX_HEIGHT_FT}
              size="sm"
              aria-label={t("heightTitle")}
              onChange={setHeight}
            />
            <span className="text-xs text-muted-foreground">{t("heightUnit")}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t("heightTitle")}>
            {PIPE_DRAPE_HEIGHT_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={heightFt === value}
                onClick={() => setHeight(value)}
                className={cn(
                  "rounded-xl border py-2 text-sm font-medium tabular-nums transition-colors",
                  heightFt === value
                    ? "border-primary/50 bg-primary/12 text-primary"
                    : "border-border/40 bg-card/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {value}′
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("heightHint")}</p>
        </div>
      </StepCard>

      <StepCard eyebrow={t("drapeEyebrow")} title={t("drapeTitle")}>
        {drapes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/50 px-3 py-4 text-sm text-muted-foreground">{t("noDrapes")}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2" role="radiogroup" aria-label={t("drapeTitle")}>
              {drapes.map((product) => {
                const selected = product.id === drape?.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update((prev) => ({ ...prev, drapeId: product.id, colorId: null }))}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-all hover:-translate-y-px",
                      selected
                        ? "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                        : "border-border/40 bg-card/40 hover:border-primary/30"
                    )}
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.image_alt || product.name} fill sizes="56px" className="object-cover" unoptimized />
                      ) : (
                        <span className="flex size-full items-center justify-center text-primary/80">
                          <Sparkles className="size-4" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block text-[11px] text-muted-foreground tabular-nums">
                        {t("perFoot", { price: formatCadFromCents(product.default_unit_price_cents) })}
                      </span>
                    </span>
                    <SelectRing selected={selected} />
                  </button>
                );
              })}
            </div>
            {colors.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                  {t("colorTitle")} · <span className="text-foreground">{colorName}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("colorTitle")}>
                  {colors.map((option) => {
                    const selected = option.id === color?.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update((prev) => ({ ...prev, colorId: option.id }))}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-colors",
                          selected ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card/30 hover:border-primary/30"
                        )}
                      >
                        <span className="size-6 shrink-0 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: option.hex }} />
                        <span className="min-w-0 flex-1 truncate">{option.name}</span>
                        {selected ? <Check className="size-3.5 shrink-0 text-primary" strokeWidth={3} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </StepCard>
    </div>
  );

  const rental = (
    <section className="overflow-hidden rounded-4xl border border-primary/30 bg-gradient-to-br from-primary/[0.09] via-card/40 to-transparent lg:sticky lg:top-24 lg:col-start-2 lg:row-start-2">
      <div className="flex items-center gap-3 border-b border-primary/20 px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <ShoppingBag className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">{t("rentalEyebrow")}</p>
          <h2 className="font-heading text-xl font-semibold">{t("rentalTitle")}</h2>
        </div>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.75fr)]">
        <div className="min-w-0 space-y-4">
          {drape ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/40 p-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                {cartLines[0]?.imageUrl ? (
                  <Image src={cartLines[0].imageUrl} alt={cartLines[0].imageAlt || drape.name} fill sizes="56px" className="object-cover" unoptimized />
                ) : (
                  <span className="absolute inset-0" style={{ backgroundColor: colorHex }} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{cartLines[0]?.name ?? drape.name}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {t("drapeLine", { feet })} × {formatCadFromCents(unitPriceCents)}
                </p>
              </div>
              <p className="shrink-0 font-heading text-lg font-semibold tabular-nums">
                {formatCadFromCents(unitPriceCents * feet)}
              </p>
            </div>
          ) : null}
          {includeLines.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">{t("includedTitle")}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {includeLines.map((line) => (
                  <li key={line.key} className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/30 p-2">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/30">
                      {line.imageUrl ? (
                        <Image src={line.imageUrl} alt={line.imageAlt || line.name} fill sizes="40px" className="object-cover" unoptimized />
                      ) : (
                        <span className="flex size-full items-center justify-center text-primary/80">
                          <Box className="size-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-xs leading-snug font-medium">{line.name}</span>
                      <span className="block text-[11px] text-primary">{t("included")}</span>
                    </span>
                    <span className="shrink-0 font-heading text-base font-semibold tabular-nums">×{line.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col rounded-2xl border border-border/40 bg-background/50 p-4">
          <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{t("subtotal")}</p>
          <p className="font-heading text-3xl font-semibold text-primary tabular-nums">{formatCadFromCents(subtotalCents)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t("subtotalHint")}</p>
          <Button type="button" size="lg" className="mt-4 w-full gap-2" disabled={cartLines.length === 0} onClick={addToCart}>
            <ShoppingBag className="size-4" /> {t("addToCart")}
          </Button>
          <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
            {heightFt > 16 ? <Note>{t("tallNote")}</Note> : null}
            <Note>{t("minNote")}</Note>
            <Note>{t("disclaimer")}</Note>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
      {visual}
      {steps}
      {rental}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary tabular-nums">
      {children}
    </span>
  );
}

function StatTile({ icon: Icon, title, value, detail }: { icon: LucideIcon; title: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">{title}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <p className="font-heading text-3xl leading-tight font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function StepCard({ eyebrow, title, aside, children }: { eyebrow: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-4xl border border-border/40 bg-card/25 p-4 sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SelectRing({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-background/50 text-transparent"
      )}
      aria-hidden
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "mt-2 flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors",
        checked ? "border-primary/40 bg-primary/[0.07] text-foreground" : "border-border/40 text-muted-foreground hover:border-primary/30"
      )}
    >
      <span className={cn("relative h-4 w-7 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform", checked ? "translate-x-3.5" : "translate-x-0.5")} />
      </span>
      {label}
    </button>
  );
}

function Legend({ className, color, label }: { className?: string; color?: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-2.5 rounded-sm border border-black/10", className)} style={color ? { backgroundColor: color } : undefined} />
      {label}
    </span>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-1.5">
      <Info className="mt-0.5 size-3 shrink-0 text-primary/80" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

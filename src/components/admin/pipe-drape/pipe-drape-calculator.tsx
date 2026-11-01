"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Box,
  Calculator,
  Check,
  ClipboardCopy,
  Cloud,
  CloudOff,
  Columns3,
  Loader2,
  Minus,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Ruler,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NumericInput } from "@/components/ui/numeric-input";
import { toast } from "@/components/ui/sonner";
import { PipeDrapeElevation } from "@/components/admin/pipe-drape/pipe-drape-elevation";
import { PipeDrapePlan as PipeDrapePlanView } from "@/components/admin/pipe-drape/pipe-drape-plan";
import { getProductCategoryLabel, type ProductRow } from "@/data/products";
import { formatMoneyFromCents } from "@/data/quotes";
import { DRAPE_COLORS } from "@/data/studio";
import {
  DEFAULT_PIPE_DRAPE_SETTINGS,
  PIPE_DRAPE_BAY_OPTIONS,
  PIPE_DRAPE_FULLNESS_OPTIONS,
  PIPE_DRAPE_HEIGHT_PRESETS,
  PIPE_DRAPE_PANEL_WIDTHS,
  PIPE_DRAPE_PUDDLE_OPTIONS,
  baseSpecForHeight,
  calculatePipeDrape,
  formatFeet,
  formatFeetInches,
  formatPipeDrapePullList,
  isLinearFootUnit,
  matchHardwareProduct,
  normalizePipeDrapePlan,
  type PipeDrapeHardwareItem,
  type PipeDrapeHardwareKey,
  type PipeDrapePlan,
  type PipeDrapePriceMode,
  type PipeDrapeRun,
  type PipeDrapeSettings,
} from "@/lib/pipe-drape";
import { cn } from "@/lib/utils";

export type PipeDrapeLinearSource = { key: string; label: string; feet: number };

export type PipeDrapeLinePick = {
  hardware: Exclude<PipeDrapeHardwareKey, "panel">;
  description: string;
  quantity: number;
  unitLabel: string;
  unitPriceCents: number;
  included: boolean;
  needsPricing: boolean;
  isTaxable: boolean;
  productId: string | null;
  category: string;
  categoryLabel: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

type HardwareKey = PipeDrapeLinePick["hardware"];
type BillableItem = PipeDrapeHardwareItem & { key: HardwareKey };

const HARDWARE_ICONS: Record<PipeDrapeHardwareKey, LucideIcon> = {
  upright: Columns3,
  base: Box,
  crossbar: Ruler,
  panel: Sparkles,
};

const TILE_TITLES: Record<PipeDrapeHardwareKey, string> = {
  upright: "Uprights",
  base: "Bases",
  crossbar: "Crossbars",
  panel: "Panels",
};

const DEFAULT_TITLES: Record<HardwareKey, string> = {
  upright: "Pipe & drape upright",
  base: "Pipe & drape base plate",
  crossbar: "Pipe & drape crossbar",
};

const SWATCH_IDS = ["black", "white", "ivory", "champagne", "gold", "navy", "burgundy", "blush", "charcoal", "silver", "emerald", "sage"];

type Preset = { id: string; label: string; detail: string; points: string; runs: Array<[string, number, boolean]> };

const PRESETS: Preset[] = [
  { id: "straight", label: "Backdrop", detail: "One 20′ run", points: "4,14 28,14", runs: [["Backdrop", 20, false]] },
  {
    id: "booth",
    label: "10×10 booth",
    detail: "3 sides, 2 corners",
    points: "6,22 6,6 26,6 26,22",
    runs: [
      ["Left side", 10, false],
      ["Back wall", 10, true],
      ["Right side", 10, true],
    ],
  },
  {
    id: "stage",
    label: "U-shape stage",
    detail: "12′ + 24′ + 12′",
    points: "3,22 3,8 29,8 29,22",
    runs: [
      ["Stage left", 12, false],
      ["Upstage", 24, true],
      ["Stage right", 12, true],
    ],
  },
  {
    id: "room",
    label: "Closed room",
    detail: "30′ × 20′ perimeter",
    points: "3,6 29,6 29,22 3,22 3,6",
    runs: [
      ["Left", 20, true],
      ["Back", 30, true],
      ["Right", 20, true],
      ["Front", 30, true],
    ],
  },
];

function newRun(label: string, lengthFt: number, joinsPrevious = false): PipeDrapeRun {
  return { id: crypto.randomUUID(), label, lengthFt, joinsPrevious };
}

function runsFromSources(sources: PipeDrapeLinearSource[]): PipeDrapeRun[] {
  return sources.map((source, index) =>
    newRun(source.label.slice(0, 40) || `Run ${index + 1}`, Math.round(source.feet * 10) / 10)
  );
}

const COLOR_WORDS: Array<[RegExp, string]> = [
  [/rose\s*gold|or\s*rose/i, "rose_gold"],
  [/champagne/i, "champagne"],
  [/ivory|ivoire|cream|crème/i, "ivory"],
  [/white|blanc/i, "white"],
  [/black|noir/i, "black"],
  [/navy|marine/i, "navy"],
  [/burgundy|bordeaux|wine|red|rouge/i, "burgundy"],
  [/blush|pink|rose/i, "blush"],
  [/charcoal|anthracite|grey|gray|gris/i, "charcoal"],
  [/silver|argent/i, "silver"],
  [/emerald|émeraude|green|vert/i, "emerald"],
  [/sage/i, "sage"],
  [/gold|\bor\b|doré/i, "gold"],
];

function colorFromText(text: string) {
  return COLOR_WORDS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function defaultPlan(sources: PipeDrapeLinearSource[], standalone: boolean): PipeDrapePlan {
  return {
    runs: sources.length > 0 ? runsFromSources(sources) : [newRun("Run 1", 20)],
    settings: {
      ...DEFAULT_PIPE_DRAPE_SETTINGS,
      colorId: colorFromText(sources.map((source) => source.label).join(" ")) ?? DEFAULT_PIPE_DRAPE_SETTINGS.colorId,
    },
    priceMode: standalone || sources.length > 0 ? "included" : "charge",
    drapeProductId: null,
  };
}

const planCache = new Map<string, PipeDrapePlan | null>();
let productsRequest: Promise<ProductRow[]> | null = null;

function loadProducts() {
  productsRequest ??= fetch("/api/admin/products?activeOnly=1", { cache: "no-store" })
    .then((response) => response.json())
    .then((payload: { ok?: boolean; products?: ProductRow[] }) => (payload.ok ? payload.products ?? [] : []))
    .catch(() => {
      productsRequest = null;
      return [];
    });
  return productsRequest;
}

async function putPlan(key: string, json: string, keepalive = false) {
  try {
    const response = await fetch("/api/admin/pipe-drape-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: `{"key":${JSON.stringify(key)},"plan":${json}}`,
      keepalive,
    });
    return response.ok;
  } catch {
    return false;
  }
}

type LoadedPlan = { key: string; plan: PipeDrapePlan | null; failed: boolean };

function useSavedPlan(planKey: string) {
  const [loaded, setLoaded] = useState<LoadedPlan | null>(() =>
    planCache.has(planKey) ? { key: planKey, plan: planCache.get(planKey) ?? null, failed: false } : null
  );
  const ready = loaded?.key === planKey;

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    fetch(`/api/admin/pipe-drape-plans?key=${encodeURIComponent(planKey)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { ok?: boolean; plan?: unknown }) => {
        if (!payload.ok) throw new Error("load failed");
        const plan = normalizePipeDrapePlan(payload.plan);
        planCache.set(planKey, plan);
        if (!cancelled) setLoaded({ key: planKey, plan, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Couldn't load the saved layout. Changes won't be saved this time.");
        setLoaded({ key: planKey, plan: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [planKey, ready]);

  return ready ? loaded : null;
}

type CalculatorContext = {
  planKey: string;
  documentRef: string;
  currency: string;
  linearSources: PipeDrapeLinearSource[];
};

type PipeDrapeCalculatorProps = CalculatorContext & {
  documentLabel: "quote" | "invoice";
  /** Omit to open the calculator read-only (saved view, locked invoice). */
  onAddLines?: (lines: PipeDrapeLinePick[]) => void;
  /** Footer note when read-only. */
  readOnlyHint?: string;
  trigger?: "button" | "compact";
  className?: string;
};

export function PipeDrapeCalculatorButton({ trigger = "button", className, ...props }: PipeDrapeCalculatorProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary", className)}
      >
        <Calculator className="size-4" />
        {trigger === "compact" ? "Hardware" : "Hardware calculator"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[94dvh] w-[97vw] max-w-[97vw] flex-col gap-0 overflow-hidden rounded-4xl border border-border/50 bg-card p-0 text-foreground sm:max-w-[97vw] 2xl:max-w-[1680px]"
        >
          <DialogCalculator {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DialogCalculator(props: Omit<PipeDrapeCalculatorProps, "trigger" | "className"> & { onDone: () => void }) {
  const loaded = useSavedPlan(props.planKey);
  if (!loaded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <DialogTitle className="sr-only">Hardware calculator</DialogTitle>
        <DialogDescription className="sr-only">Loading the saved layout.</DialogDescription>
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading layout…</p>
      </div>
    );
  }
  return <CalculatorBody variant="dialog" {...props} initialPlan={loaded.plan} persist={!loaded.failed} />;
}

/** Standalone page: one scratch layout per owner, synced across devices. */
export function PipeDrapeCalculatorPage({ initialPlan, currency }: { initialPlan: PipeDrapePlan | null; currency: string }) {
  return (
    <CalculatorBody
      variant="page"
      planKey="scratch"
      documentRef="Quick estimate"
      currency={currency}
      linearSources={[]}
      initialPlan={initialPlan}
      persist
    />
  );
}

type CalculatorBodyProps = CalculatorContext & {
  variant: "dialog" | "page";
  documentLabel?: "quote" | "invoice";
  initialPlan: PipeDrapePlan | null;
  persist: boolean;
  onAddLines?: (lines: PipeDrapeLinePick[]) => void;
  readOnlyHint?: string;
  onDone?: () => void;
};

function CalculatorBody({
  variant,
  planKey,
  documentLabel,
  documentRef,
  currency,
  linearSources,
  initialPlan,
  persist,
  onAddLines,
  readOnlyHint,
  onDone,
}: CalculatorBodyProps) {
  const standalone = variant === "page";
  const [state, setState] = useState<PipeDrapePlan>(() => initialPlan ?? defaultPlan(linearSources, standalone));
  const [view, setView] = useState<"elevation" | "plan">("elevation");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const { runs, settings, priceMode } = state;

  const stateJson = useMemo(() => JSON.stringify(state), [state]);
  const [savedJson, setSavedJson] = useState(stateJson);
  const [saveFailed, setSaveFailed] = useState(false);
  const pendingSave = useRef<string | null>(null);

  useEffect(() => {
    if (!persist || stateJson === savedJson) {
      pendingSave.current = null;
      return;
    }
    pendingSave.current = stateJson;
    planCache.set(planKey, JSON.parse(stateJson) as PipeDrapePlan);
    const timer = window.setTimeout(() => {
      pendingSave.current = null;
      void putPlan(planKey, stateJson).then((ok) => {
        setSaveFailed(!ok);
        if (ok) setSavedJson(stateJson);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [persist, planKey, stateJson, savedJson]);

  useEffect(() => {
    const pending = pendingSave;
    return () => {
      if (pending.current) void putPlan(planKey, pending.current, true);
    };
  }, [planKey]);

  const syncState = useRef({ stateJson, savedJson });
  useEffect(() => {
    syncState.current = { stateJson, savedJson };
  });

  useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    async function pullRemote() {
      if (document.visibilityState !== "visible") return;
      const before = syncState.current;
      if (before.stateJson !== before.savedJson) return;
      try {
        const response = await fetch(`/api/admin/pipe-drape-plans?key=${encodeURIComponent(planKey)}`, { cache: "no-store" });
        const payload = (await response.json()) as { ok?: boolean; plan?: unknown };
        const remote = payload.ok ? normalizePipeDrapePlan(payload.plan) : null;
        const now = syncState.current;
        if (!remote || cancelled || now.stateJson !== now.savedJson || now.savedJson !== before.savedJson) return;
        const remoteJson = JSON.stringify(remote);
        if (remoteJson === JSON.stringify(normalizePipeDrapePlan(JSON.parse(now.savedJson)))) return;
        planCache.set(planKey, remote);
        setState(remote);
        setSavedJson(remoteJson);
        toast("Layout updated from another device");
      } catch {
        // Offline or signed out; keep the local layout.
      }
    }
    const onVisible = () => void pullRemote();
    const timer = window.setInterval(onVisible, 20_000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [persist, planKey]);

  useEffect(() => {
    let cancelled = false;
    void loadProducts().then((rows) => {
      if (!cancelled) setProducts(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => calculatePipeDrape(runs, settings), [runs, settings]);
  const color = DRAPE_COLORS.find((option) => option.value === settings.colorId) ?? DRAPE_COLORS[2];
  const selectedRun = result.runs.find((run) => run.id === selectedId) ?? result.runs[0] ?? null;
  const sourceFeet = linearSources.reduce((sum, source) => sum + source.feet, 0);
  const feetGap = Math.round((result.totalFt - sourceFeet) * 10) / 10;
  const baseWidthIn = baseSpecForHeight(settings.heightFt).id === "24" ? 24 : 18;

  const hardware = useMemo(() => {
    const lines = result.items
      .filter((item): item is BillableItem => item.key !== "panel")
      .map((item) => ({ item, product: matchHardwareProduct(products, item.key, item.sizeId) }));
    const needByProduct = new Map<string, number>();
    for (const { item, product } of lines) {
      if (product) needByProduct.set(product.id, (needByProduct.get(product.id) ?? 0) + item.quantity + item.spare);
    }
    const shortProducts = new Set(
      lines
        .filter(({ product }) => product && (needByProduct.get(product.id) ?? 0) > product.quantity_on_hand)
        .map(({ product }) => product!.id)
    );
    const missing = lines.filter(({ product }) => !product).length;
    const valueCents = lines.reduce((sum, { item, product }) => sum + (product?.default_unit_price_cents ?? 0) * item.quantity, 0);
    return { lines, needByProduct, shortCount: shortProducts.size, missing, valueCents };
  }, [result.items, products]);

  const drapeProducts = useMemo(
    () => products.filter((product) => product.configurator_mode === "linear_ft" || isLinearFootUnit(product.unit_label)),
    [products]
  );
  const drapeProduct =
    drapeProducts.find((product) => product.id === state.drapeProductId) ?? drapeProducts[0] ?? null;
  const drapeCents = drapeProduct ? Math.round(drapeProduct.default_unit_price_cents * result.totalFt) : 0;
  const hardwareChargeCents = priceMode === "charge" ? hardware.valueCents : 0;
  const estimateCents = drapeCents + hardwareChargeCents;
  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);

  function patch(next: Partial<PipeDrapePlan>) {
    setState((prev) => ({ ...prev, ...next }));
  }
  function patchSettings(next: Partial<PipeDrapeSettings>) {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...next } }));
  }
  function patchRun(id: string, next: Partial<PipeDrapeRun>) {
    setState((prev) => ({ ...prev, runs: prev.runs.map((run) => (run.id === id ? { ...run, ...next } : run)) }));
  }
  function removeRun(id: string) {
    setState((prev) => {
      const runs = prev.runs.filter((run) => run.id !== id);
      return { ...prev, runs: runs.length > 0 ? runs : [newRun("Run 1", 0)] };
    });
  }
  function addRun() {
    setState((prev) => ({
      ...prev,
      runs: [...prev.runs, newRun(`Run ${prev.runs.length + 1}`, 10, prev.runs.length > 0)],
    }));
  }
  function applyPreset(preset: Preset) {
    patch({ runs: preset.runs.map(([label, length, join]) => newRun(label, length, join)) });
    setSelectedId(null);
  }
  function pickDrape(product: ProductRow) {
    const colorId = colorFromText(`${product.default_color_name ?? ""} ${product.name}`);
    setState((prev) => ({
      ...prev,
      drapeProductId: product.id,
      settings: colorId ? { ...prev.settings, colorId } : prev.settings,
    }));
  }

  async function copyText(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success);
    } catch {
      toast.error("Could not copy. Your browser blocked clipboard access.");
    }
  }

  function quoteSummaryText() {
    const lines = [`Pipe & drape estimate — ${formatFeet(result.totalFt)} at ${formatFeetInches(settings.heightFt)} high`];
    if (drapeProduct) {
      lines.push(
        `${drapeProduct.name}: ${formatFeet(result.totalFt)} × ${money(drapeProduct.default_unit_price_cents)}/ft = ${money(drapeCents)}`
      );
    }
    lines.push(
      priceMode === "included"
        ? "Hardware: included with drape"
        : `Hardware: ${money(hardware.valueCents)}`
    );
    lines.push(`Estimate before tax and delivery: ${money(estimateCents)}`, "");
    return lines.join("\n") + formatPipeDrapePullList(result, settings, documentRef);
  }

  function addLines() {
    if (!onAddLines || !documentLabel) return;
    const included = priceMode === "included";
    const picks: PipeDrapeLinePick[] = hardware.lines.map(({ item, product }) => ({
      hardware: item.key,
      description: `${product?.name ?? DEFAULT_TITLES[item.key]} — ${item.spec}`,
      quantity: item.quantity,
      unitLabel: "each",
      unitPriceCents: included ? 0 : product?.default_unit_price_cents ?? 0,
      included,
      needsPricing: !included && !product,
      isTaxable: product?.is_taxable ?? true,
      productId: product?.id ?? null,
      category: product?.category ?? "hardware",
      categoryLabel: product ? getProductCategoryLabel(product.category) : "Hardware",
      imageUrl: product?.image_url ?? null,
      imageAlt: product?.image_alt ?? product?.name ?? null,
    }));
    onAddLines(picks);
    toast.success(`Added ${picks.length} hardware ${picks.length === 1 ? "line" : "lines"} to the ${documentLabel}`);
    onDone?.();
  }

  const TitleTag = variant === "dialog" ? DialogTitle : "h1";
  const saveStatus = !persist ? null : saveFailed ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
      <CloudOff className="size-3.5" /> Not saved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Cloud className="size-3.5" /> {stateJson === savedJson ? "Layout saved" : "Saving…"}
    </span>
  );

  return (
    <div
      className={cn(
        "flex flex-col",
        variant === "dialog"
          ? "min-h-0 flex-1"
          : "overflow-clip rounded-4xl border border-border/50 bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]"
      )}
    >
      <header className="relative shrink-0 overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/50 to-transparent px-4 pt-4 pb-4 sm:px-7 sm:pt-5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_60%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Calculator className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold tracking-[0.22em] text-primary uppercase">
                Pipe & drape · {documentRef}
              </p>
              <TitleTag className="font-heading text-2xl leading-tight font-semibold">
                {standalone ? "Drape calculator" : "Hardware calculator"}
              </TitleTag>
              {variant === "dialog" ? (
                <DialogDescription className="sr-only">
                  Enter each straight run to get uprights, base plates, crossbars and drape panels, with to-scale drawings.
                </DialogDescription>
              ) : null}
            </div>
          </div>
          <div className="order-last flex w-full flex-wrap items-center gap-1.5 sm:order-none sm:w-auto">
            <HeaderChip>{formatFeet(result.totalFt)}</HeaderChip>
            <HeaderChip>
              {result.runs.length} {result.runs.length === 1 ? "run" : "runs"}
            </HeaderChip>
            <HeaderChip>{formatFeetInches(settings.heightFt)} high</HeaderChip>
            {result.corners > 0 ? (
              <HeaderChip>
                {result.corners} {result.corners === 1 ? "corner" : "corners"}
                {result.closedLoop ? " · closed" : ""}
              </HeaderChip>
            ) : null}
          </div>
          {variant === "dialog" ? (
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close calculator"
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            </DialogClose>
          ) : null}
        </div>
        {linearSources.length > 0 ? (
          <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3 py-2">
            <Ruler className="size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              This {documentLabel} has <span className="font-semibold tabular-nums">{formatFeet(sourceFeet)}</span> on{" "}
              {linearSources.length} linear-ft {linearSources.length === 1 ? "line" : "lines"}
            </p>
            {Math.abs(feetGap) < 0.05 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Check className="size-3" /> Runs match
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                Runs are {formatFeet(Math.abs(feetGap))} {feetGap > 0 ? "over" : "short"}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                patch({ runs: runsFromSources(linearSources) });
                setSelectedId(null);
              }}
            >
              Use as runs
            </Button>
          </div>
        ) : null}
      </header>

      <div
        className={cn(
          "lg:grid lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]",
          variant === "dialog" && "min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-hidden"
        )}
      >
        <div
          className={cn(
            "space-y-6 border-border/40 p-4 sm:p-6 lg:border-r",
            variant === "dialog" && "lg:overflow-y-auto lg:overscroll-contain"
          )}
        >
          <Section eyebrow="Start from" title="Quick layouts">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="group flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card/40 p-2.5 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-primary/[0.05]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg viewBox="0 0 32 28" className="size-7" aria-hidden>
                      <polyline points={preset.points} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{preset.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{preset.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            eyebrow="Layout"
            title="Straight runs"
            aside={
              <Button type="button" size="sm" variant="outline" onClick={addRun} className="h-8 gap-1">
                <Plus className="size-3.5" /> Add run
              </Button>
            }
          >
            <div className="space-y-2.5">
              {runs.map((run, index) => {
                const computed = result.runs.find((item) => item.id === run.id);
                const selected = selectedRun?.id === run.id;
                const canJoin = index > 0 || runs.length >= 3;
                return (
                  <div
                    key={run.id}
                    className={cn(
                      "rounded-2xl border p-3 transition-colors",
                      selected ? "border-primary/45 bg-primary/[0.06]" : "border-border/40 bg-background/30"
                    )}
                    onFocusCapture={() => setSelectedId(run.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <input
                        value={run.label}
                        onChange={(event) => patchRun(run.id, { label: event.target.value })}
                        aria-label={`Run ${index + 1} name`}
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:bg-input/40 focus-visible:border-primary/40 focus-visible:bg-input/50"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${run.label || `run ${index + 1}`}`}
                        onClick={() => removeRun(run.id)}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-xl border border-border/50 bg-background/60">
                        <StepButton label="Shorter" onClick={() => patchRun(run.id, { lengthFt: Math.max(0, run.lengthFt - 1) })}>
                          <Minus className="size-3.5" />
                        </StepButton>
                        <NumericInput
                          decimal
                          value={run.lengthFt}
                          onValueChange={(value) => patchRun(run.id, { lengthFt: Math.max(0, value) })}
                          aria-label={`Run ${index + 1} length in feet`}
                          className="h-9 w-16 border-0 bg-transparent px-1 text-center text-base font-semibold tabular-nums shadow-none focus-visible:ring-0"
                        />
                        <StepButton label="Longer" onClick={() => patchRun(run.id, { lengthFt: run.lengthFt + 1 })}>
                          <Plus className="size-3.5" />
                        </StepButton>
                      </div>
                      <span className="text-xs text-muted-foreground">ft</span>
                      {computed ? (
                        <span className="ml-auto text-right text-[11px] leading-tight text-muted-foreground tabular-nums">
                          {computed.bays} × {formatFeetInches(computed.bayFt)}
                          <span className="block">
                            {computed.uprights} up · {computed.crossbars} bars
                          </span>
                        </span>
                      ) : null}
                    </div>
                    {canJoin ? (
                      <MiniSwitch
                        checked={run.joinsPrevious}
                        onChange={(checked) => patchRun(run.id, { joinsPrevious: checked })}
                        label={
                          index === 0
                            ? `Closes the room with run ${runs.length}`
                            : `Corner with run ${index} · shares an upright`
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section eyebrow="Hardware" title="Height & spacing">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-border/50 bg-background/60">
                  <StepButton label="Lower" onClick={() => patchSettings({ heightFt: Math.max(1, settings.heightFt - 0.5) })}>
                    <Minus className="size-3.5" />
                  </StepButton>
                  <NumericInput
                    decimal
                    value={settings.heightFt}
                    onValueChange={(value) => patchSettings({ heightFt: Math.max(0, value) })}
                    aria-label="Drape height in feet"
                    className="h-9 w-16 border-0 bg-transparent px-1 text-center text-base font-semibold tabular-nums shadow-none focus-visible:ring-0"
                  />
                  <StepButton label="Higher" onClick={() => patchSettings({ heightFt: settings.heightFt + 0.5 })}>
                    <Plus className="size-3.5" />
                  </StepButton>
                </div>
                <span className="text-xs text-muted-foreground">ft high</span>
              </div>
              <Segmented
                label="Height presets"
                value={settings.heightFt}
                options={PIPE_DRAPE_HEIGHT_PRESETS.map((value) => ({ value, label: `${value}′` }))}
                onChange={(heightFt) => patchSettings({ heightFt })}
              />
              <Segmented
                label="Max bay width"
                value={settings.maxBayFt}
                options={PIPE_DRAPE_BAY_OPTIONS.map((value) => ({ value, label: `${value}′ bays` }))}
                onChange={(maxBayFt) => patchSettings({ maxBayFt })}
              />
            </div>
          </Section>

          <Section eyebrow="Fabric" title="Drape">
            <div className="space-y-3">
              <Segmented
                label="Fullness"
                value={settings.fullness}
                options={PIPE_DRAPE_FULLNESS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  hint: option.hint,
                }))}
                onChange={(fullness) => patchSettings({ fullness })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Segmented
                  label="Panel width"
                  value={settings.panelWidthIn}
                  options={PIPE_DRAPE_PANEL_WIDTHS.map((value) => ({ value, label: `${value}″` }))}
                  onChange={(panelWidthIn) => patchSettings({ panelWidthIn })}
                />
                <Segmented
                  label="Puddle"
                  value={settings.puddleIn}
                  options={PIPE_DRAPE_PUDDLE_OPTIONS.map((value) => ({ value, label: value ? `${value}″` : "None" }))}
                  onChange={(puddleIn) => patchSettings({ puddleIn })}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  Preview colour · <span className="text-foreground">{color.label}</span>
                </p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Preview colour">
                  {SWATCH_IDS.map((id) => {
                    const option = DRAPE_COLORS.find((item) => item.value === id);
                    if (!option) return null;
                    const active = settings.colorId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={option.label}
                        title={option.label}
                        onClick={() => patchSettings({ colorId: id })}
                        className={cn(
                          "size-8 rounded-full border-2 shadow-sm transition-transform hover:scale-110",
                          active ? "border-primary ring-2 ring-primary/30" : "border-border/60"
                        )}
                        style={{ backgroundColor: option.hex }}
                      />
                    );
                  })}
                </div>
              </div>
              <MiniSwitch
                checked={settings.sparePercent > 0}
                onChange={(checked) => patchSettings({ sparePercent: checked ? 10 : 0 })}
                label="Pack 10% spares on the truck"
              />
            </div>
          </Section>
        </div>

        <div
          className={cn(
            "@container space-y-5 p-4 sm:p-6",
            variant === "dialog" && "lg:overflow-y-auto lg:overscroll-contain"
          )}
        >
          <div className="grid grid-cols-2 gap-3 @[40rem]:grid-cols-4">
            {(["upright", "base", "crossbar", "panel"] as const).map((key) => {
              const items = result.items.filter((item) => item.key === key);
              if (items.length === 0) return null;
              const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
              const spare = items.reduce((sum, item) => sum + item.spare, 0);
              const Icon = HARDWARE_ICONS[key];
              return (
                <div key={key} className="rounded-2xl border border-border/40 bg-background/30 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                      {TILE_TITLES[key]}
                    </span>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                  <p className="font-heading text-3xl leading-tight font-semibold tabular-nums">{quantity}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {spare > 0 ? <span className="font-medium text-primary">+{spare} spare · </span> : null}
                    {key === "crossbar" && items.length > 1
                      ? `${items.length} sizes`
                      : items[0].spec.split(" · ")[0].replace(" steel base plate", "")}
                  </p>
                </div>
              );
            })}
          </div>

          {standalone ? (
            <QuickQuoteCard
              drapeProducts={drapeProducts}
              drapeProduct={drapeProduct}
              onPickDrape={pickDrape}
              totalFt={result.totalFt}
              drapeCents={drapeCents}
              priceMode={priceMode}
              onPriceMode={(next) => patch({ priceMode: next })}
              hardwareValueCents={hardware.valueCents}
              estimateCents={estimateCents}
              money={money}
              loading={products.length === 0}
              onCopy={() => void copyText(quoteSummaryText(), "Estimate copied")}
            />
          ) : null}

          <div className="overflow-hidden rounded-3xl border border-border/40 bg-background/20">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-3">
              <Segmented
                label="Drawing"
                hideLabel
                value={view}
                options={[
                  { value: "elevation", label: "Front elevation" },
                  { value: "plan", label: "Floor plan" },
                ]}
                onChange={setView}
                className="w-auto"
              />
              {view === "elevation" && result.runs.length > 1 ? (
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Run">
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
              <span className="ml-auto text-[11px] text-muted-foreground">To scale</span>
            </div>
            <div className="p-4">
              {result.runs.length === 0 || !selectedRun ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Enter a run length to see the drawing.</p>
              ) : view === "elevation" ? (
                <PipeDrapeElevation
                  key={selectedRun.id}
                  run={selectedRun}
                  heightFt={settings.heightFt}
                  colorHex={color.hex}
                  fullness={settings.fullness}
                  panelWidthIn={settings.panelWidthIn}
                  puddleIn={settings.puddleIn}
                  baseWidthIn={baseWidthIn}
                />
              ) : (
                <PipeDrapePlanView
                  runs={result.runs}
                  colorHex={color.hex}
                  selectedId={selectedRun.id}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setView("elevation");
                  }}
                />
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <Legend swatch="bg-gradient-to-r from-zinc-400 via-zinc-100 to-zinc-400" label="Upright & crossbar" />
                <Legend swatch="bg-primary" round label="Shared corner upright" />
                <Legend swatch="" style={{ backgroundColor: color.hex }} label={`${color.label} drape · ${settings.fullness}× fullness`} />
                {view === "plan" ? <span>Tap a run to see its elevation</span> : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 @[56rem]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="min-w-0 rounded-3xl border border-border/40 bg-background/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
                <div>
                  <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">Pull list</p>
                  <p className="font-heading text-lg font-semibold">Hardware to load</p>
                </div>
                {products.length > 0 ? (
                  hardware.shortCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="size-3" /> {hardware.shortCount} short on stock
                    </span>
                  ) : hardware.missing > 0 ? (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      {hardware.missing} not in inventory
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary">
                      <Check className="size-3" /> All in stock
                    </span>
                  )
                ) : null}
              </div>
              <ul className="divide-y divide-border/40">
                {result.items.map((item, index) => {
                  const product =
                    item.key === "panel" ? null : hardware.lines.find((line) => line.item === item)?.product ?? null;
                  const need = product ? hardware.needByProduct.get(product.id) ?? 0 : 0;
                  const short = product ? Math.max(0, need - product.quantity_on_hand) : 0;
                  const Icon = HARDWARE_ICONS[item.key];
                  return (
                    <li key={`${item.key}-${index}`} className="flex items-center gap-3 px-4 py-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                        {product?.image_url ? (
                          <Image src={product.image_url} alt={product.image_alt || product.name} fill sizes="48px" className="object-cover" unoptimized />
                        ) : (
                          <div className="flex size-full items-center justify-center text-primary/80">
                            <Icon className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground" title={item.spec}>
                          {item.spec}
                        </p>
                        {item.key === "panel" ? null : product ? (
                          <p className="flex flex-wrap items-center gap-x-1.5 text-[11px]">
                            <span className="max-w-full truncate text-primary">
                              {product.name} · {money(product.default_unit_price_cents)} ea
                            </span>
                            {short > 0 ? (
                              <span className="font-medium text-amber-700 dark:text-amber-300">
                                Short {short} · {product.quantity_on_hand} on hand
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{product.quantity_on_hand} on hand</span>
                            )}
                          </p>
                        ) : products.length > 0 ? (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">Not in inventory yet</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-heading text-2xl font-semibold tabular-nums">×{item.quantity}</p>
                        {item.spare > 0 ? <p className="text-[11px] font-medium text-primary">+{item.spare} spare</p> : null}
                      </div>
                    </li>
                  );
                })}
                {result.items.length === 0 ? (
                  <li className="px-4 py-10 text-center text-sm text-muted-foreground">No hardware yet.</li>
                ) : null}
              </ul>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-3xl border border-border/40 bg-background/20 p-4">
                <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">By run</p>
                <ul className="mt-2 space-y-2">
                  {result.runs.map((run, index) => (
                    <li key={run.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(run.id);
                          setView("elevation");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                          selectedRun?.id === run.id ? "border-primary/40 bg-primary/[0.06]" : "border-border/30 hover:border-primary/30"
                        )}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary tabular-nums">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{run.label}</span>
                          <span className="block text-[11px] text-muted-foreground tabular-nums">
                            {formatFeet(run.lengthFt)} · {run.bays} × {formatFeetInches(run.bayFt)} · {run.crossbarSize.label.split(" ")[0]} bars
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[11px] leading-tight text-muted-foreground tabular-nums">
                          {run.uprights} up
                          {run.sharesStart ? <span className="block text-primary">corner</span> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {result.warnings.length > 0 ? (
                <div className="space-y-2 rounded-3xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
                  {result.warnings.map((warning) => (
                    <p key={warning} className="flex gap-2 text-xs text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
              <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                The smallest setup is one section: 2 uprights, 2 bases and 1 crossbar. Bays are spaced evenly so no crossbar
                spans more than {settings.maxBayFt}′, and corners share an upright. Panels assume {settings.panelWidthIn}″
                widths at {settings.fullness}× fullness.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-2 border-t border-border/40 bg-card/90 px-4 py-3 backdrop-blur sm:gap-3 sm:px-7",
          standalone && "sticky bottom-0 z-10"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyText(formatPipeDrapePullList(result, settings, documentRef), "Pull list copied")}
          className="gap-1.5"
          disabled={result.items.length === 0}
        >
          <ClipboardCopy className="size-4" /> Copy pull list
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => {
            setState(defaultPlan(linearSources, standalone));
            setSelectedId(null);
          }}
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
        {saveStatus}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {standalone ? null : onAddLines ? (
            <>
              <Segmented
                label="Hardware pricing"
                hideLabel
                value={priceMode}
                options={[
                  {
                    value: "charge",
                    label: "Charge per piece",
                    hint: hardware.valueCents > 0 ? money(hardware.valueCents) : undefined,
                  },
                  { value: "included", label: "Included with drape" },
                ]}
                onChange={(next) => patch({ priceMode: next })}
                className="w-auto"
              />
              <Button type="button" size="sm" onClick={addLines} disabled={hardware.lines.length === 0} className="gap-1.5">
                <Package className="size-4" />
                Add {hardware.lines.length} {hardware.lines.length === 1 ? "line" : "lines"} to {documentLabel}
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {readOnlyHint ?? `Open edit mode to add these to the ${documentLabel ?? "document"}.`}
              </span>
              <Button type="button" size="sm" onClick={onDone}>
                Done
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function QuickQuoteCard({
  drapeProducts,
  drapeProduct,
  onPickDrape,
  totalFt,
  drapeCents,
  priceMode,
  onPriceMode,
  hardwareValueCents,
  estimateCents,
  money,
  loading,
  onCopy,
}: {
  drapeProducts: ProductRow[];
  drapeProduct: ProductRow | null;
  onPickDrape: (product: ProductRow) => void;
  totalFt: number;
  drapeCents: number;
  priceMode: PipeDrapePriceMode;
  onPriceMode: (mode: PipeDrapePriceMode) => void;
  hardwareValueCents: number;
  estimateCents: number;
  money: (cents: number) => string;
  loading: boolean;
  onCopy: () => void;
}) {
  const drapeShort = drapeProduct ? Math.max(0, Math.ceil(totalFt) - drapeProduct.quantity_on_hand) : 0;
  return (
    <section className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.09] via-background/30 to-transparent">
      <div className="flex flex-wrap items-center gap-3 border-b border-primary/20 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Receipt className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">Quick quote</p>
          <p className="font-heading text-lg font-semibold">Phone estimate</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onCopy} className="gap-1.5 border-primary/30">
          <ClipboardCopy className="size-4" /> Copy estimate
        </Button>
      </div>
      <div className="grid gap-4 p-4 @[44rem]:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground">Drape</p>
          {loading ? (
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-muted/30" />
          ) : drapeProducts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/50 px-3 py-4 text-xs text-muted-foreground">
              No linear-ft drapes in inventory yet.
            </p>
          ) : (
            <div className="grid gap-2 @[30rem]:grid-cols-2" role="radiogroup" aria-label="Drape">
              {drapeProducts.map((product) => {
                const selected = product.id === drapeProduct?.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onPickDrape(product)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-all hover:-translate-y-px",
                      selected
                        ? "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                        : "border-border/40 bg-card/40 hover:border-primary/30"
                    )}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.image_alt || product.name} fill sizes="48px" className="object-cover" unoptimized />
                      ) : (
                        <span className="flex size-full items-center justify-center text-primary/80">
                          <Sparkles className="size-4" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block text-[11px] text-muted-foreground tabular-nums">
                        {money(product.default_unit_price_cents)} / ft · {product.quantity_on_hand.toLocaleString()} ft on hand
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-background/50 text-transparent"
                      )}
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <Segmented
            label="Hardware"
            value={priceMode}
            options={[
              { value: "included", label: "Included with drape" },
              {
                value: "charge",
                label: "Charge per piece",
                hint: hardwareValueCents > 0 ? money(hardwareValueCents) : undefined,
              },
            ]}
            onChange={onPriceMode}
          />
        </div>
        <div className="flex flex-col rounded-2xl border border-border/40 bg-background/40 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Drape · {formatFeet(totalFt)}
                {drapeProduct ? <span className="block text-[11px]">× {money(drapeProduct.default_unit_price_cents)}/ft</span> : null}
              </dt>
              <dd className="font-medium tabular-nums">{money(drapeCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Hardware</dt>
              <dd className="font-medium tabular-nums">
                {priceMode === "included" ? <span className="text-primary">Included</span> : money(hardwareValueCents)}
              </dd>
            </div>
          </dl>
          <div className="mt-auto border-t border-border/40 pt-3">
            <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Estimate</p>
            <p className="font-heading text-3xl font-semibold text-primary tabular-nums">{money(estimateCents)}</p>
            <p className="text-[11px] text-muted-foreground">Before tax and delivery</p>
            {drapeShort > 0 ? (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-3" /> {drapeShort} ft more than on hand
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeaderChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary tabular-nums">
      {children}
    </span>
  );
}

function Section({
  eyebrow,
  title,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
          <h3 className="font-heading text-base font-semibold">{title}</h3>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
    </button>
  );
}

function MiniSwitch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
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
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}

function Segmented<T extends string | number>({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  hideLabel?: boolean;
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {hideLabel ? null : <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-xl border border-border/40 bg-background/40 p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-xs whitespace-nowrap transition-colors",
                active ? "bg-primary/15 font-medium text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.hint ? <span className="text-[10px] opacity-70 tabular-nums">{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  round = false,
  style,
}: {
  swatch: string;
  label: string;
  round?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-2.5 border border-black/10", round ? "rounded-full" : "rounded-sm", swatch)} style={style} />
      {label}
    </span>
  );
}

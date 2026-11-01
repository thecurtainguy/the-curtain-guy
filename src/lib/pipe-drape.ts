/**
 * Pipe & drape hardware math shared by the admin hardware calculator.
 *
 * Every straight run is split into evenly spaced bays no wider than the max
 * crossbar span. N bays need N crossbars and N + 1 uprights; a run that turns a
 * corner from the previous run shares that upright (and its base).
 */

export type PipeDrapeRun = {
  id: string;
  label: string;
  lengthFt: number;
  /**
   * Shares its first upright with the previous run's last upright. On the first
   * run of a layout with 3+ runs, it closes the room with the last run.
   */
  joinsPrevious: boolean;
};

export type PipeDrapeSettings = {
  heightFt: number;
  maxBayFt: number;
  /** 1 = flat panels, 2 = twice the run width in fabric. */
  fullness: number;
  panelWidthIn: number;
  puddleIn: number;
  sparePercent: number;
  colorId: string;
};

export const DEFAULT_PIPE_DRAPE_SETTINGS: PipeDrapeSettings = {
  heightFt: 10,
  maxBayFt: 10,
  fullness: 2,
  panelWidthIn: 60,
  puddleIn: 0,
  sparePercent: 0,
  colorId: "black",
};

export const PIPE_DRAPE_HEIGHT_PRESETS = [8, 10, 12, 14, 16] as const;
export const PIPE_DRAPE_BAY_OPTIONS = [8, 10, 12] as const;
export const PIPE_DRAPE_FULLNESS_OPTIONS = [
  { value: 1, label: "Flat", hint: "1×" },
  { value: 1.5, label: "Light", hint: "1.5×" },
  { value: 2, label: "Standard", hint: "2×" },
  { value: 2.5, label: "Full", hint: "2.5×" },
  { value: 3, label: "Luxe", hint: "3×" },
] as const;
export const PIPE_DRAPE_PANEL_WIDTHS = [54, 60] as const;
export const PIPE_DRAPE_PUDDLE_OPTIONS = [0, 6, 12] as const;

type SizeRange = { id: string; label: string; minFt: number; maxFt: number };

/** Adjustable uprights, smallest range first. */
export const UPRIGHT_SIZES: SizeRange[] = [
  { id: "4-7", label: "4′–7′ adjustable", minFt: 4, maxFt: 7 },
  { id: "7-12", label: "7′–12′ adjustable", minFt: 7, maxFt: 12 },
  { id: "10-16", label: "10′–16′ adjustable", minFt: 10, maxFt: 16 },
  { id: "12-20", label: "12′–20′ adjustable", minFt: 12, maxFt: 20 },
];

/** Telescopic drape supports (crossbars). */
export const CROSSBAR_SIZES: SizeRange[] = [
  { id: "4-7", label: "4′–7′ telescopic", minFt: 4, maxFt: 7 },
  { id: "6-10", label: "6′–10′ telescopic", minFt: 6, maxFt: 10 },
  { id: "7-12", label: "7′–12′ telescopic", minFt: 7, maxFt: 12 },
];

/** Stock drape lengths in feet. */
const PANEL_STOCK_LENGTHS_FT = [8, 10, 12, 14, 16, 18, 20, 24];

const EPSILON = 1e-6;

export function pickUprightSize(heightFt: number): SizeRange {
  return (
    UPRIGHT_SIZES.find((size) => heightFt >= size.minFt - EPSILON && heightFt <= size.maxFt + EPSILON) ??
    (heightFt < UPRIGHT_SIZES[0].minFt ? UPRIGHT_SIZES[0] : UPRIGHT_SIZES[UPRIGHT_SIZES.length - 1])
  );
}

export function pickCrossbarSize(bayFt: number): SizeRange {
  const [short, standard, long] = CROSSBAR_SIZES;
  if (bayFt > standard.maxFt + EPSILON) return long;
  if (bayFt >= standard.minFt - EPSILON) return standard;
  return short;
}

export function baseSpecForHeight(heightFt: number) {
  return heightFt > 12 + EPSILON
    ? { id: "24", label: "24″ × 24″ steel base plate" }
    : { id: "18", label: "18″ × 18″ steel base plate" };
}

export function bayCount(lengthFt: number, maxBayFt: number) {
  if (!(lengthFt > 0) || !(maxBayFt > 0)) return 0;
  return Math.max(1, Math.ceil(lengthFt / maxBayFt - EPSILON));
}

export function panelsPerBay(bayFt: number, fullness: number, panelWidthIn: number) {
  if (!(bayFt > 0) || !(panelWidthIn > 0)) return 0;
  return Math.max(1, Math.ceil((bayFt * 12 * Math.max(1, fullness)) / panelWidthIn - EPSILON));
}

/** Formats feet as 9′ 6″ (rounded to the nearest inch). */
export function formatFeetInches(feet: number) {
  if (!Number.isFinite(feet) || feet <= 0) return "0′";
  const totalInches = Math.round(feet * 12);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  if (ft === 0) return `${inches}″`;
  return inches ? `${ft}′ ${inches}″` : `${ft}′`;
}

export function formatFeet(feet: number) {
  return Number.isInteger(feet) ? `${feet} ft` : `${feet.toFixed(1)} ft`;
}

export type PipeDrapeRunResult = {
  id: string;
  label: string;
  lengthFt: number;
  bays: number;
  bayFt: number;
  crossbars: number;
  /** Uprights this run adds (shared corner uprights are counted once). */
  uprights: number;
  panels: number;
  panelsPerBay: number;
  crossbarSize: SizeRange;
  sharesStart: boolean;
  sharesEnd: boolean;
};

export type PipeDrapeHardwareKey = "upright" | "base" | "crossbar" | "panel";

export type PipeDrapeHardwareItem = {
  key: PipeDrapeHardwareKey;
  title: string;
  spec: string;
  /** Size range id (uprights, crossbars) or plate size (bases), used to match size-specific inventory. */
  sizeId: string | null;
  quantity: number;
  spare: number;
};

export type PipeDrapeResult = {
  runs: PipeDrapeRunResult[];
  totalFt: number;
  bays: number;
  corners: number;
  closedLoop: boolean;
  uprightSize: SizeRange;
  base: { id: string; label: string };
  panelLengthFt: number | null;
  panelDropIn: number;
  items: PipeDrapeHardwareItem[];
  warnings: string[];
};

function spareFor(quantity: number, percent: number) {
  if (!(percent > 0) || quantity <= 0) return 0;
  return Math.max(1, Math.ceil((quantity * percent) / 100 - EPSILON));
}

export function calculatePipeDrape(
  runs: PipeDrapeRun[],
  settings: PipeDrapeSettings
): PipeDrapeResult {
  const valid = runs.filter((run) => run.lengthFt > 0);
  const closedLoop = valid.length >= 3 && Boolean(valid[0]?.joinsPrevious);
  const heightFt = Math.max(0, settings.heightFt);
  const maxBayFt = Math.max(1, settings.maxBayFt);

  const results: PipeDrapeRunResult[] = valid.map((run, index) => {
    const bays = bayCount(run.lengthFt, maxBayFt);
    const bayFt = run.lengthFt / bays;
    const perBay = panelsPerBay(bayFt, settings.fullness, settings.panelWidthIn);
    const sharesStart = index > 0 ? run.joinsPrevious : closedLoop;
    const next = valid[index + 1];
    const sharesEnd = next ? next.joinsPrevious : closedLoop;
    return {
      id: run.id,
      label: run.label.trim() || `Run ${index + 1}`,
      lengthFt: run.lengthFt,
      bays,
      bayFt,
      crossbars: bays,
      uprights: bays + 1 - (sharesStart ? 1 : 0),
      panels: perBay * bays,
      panelsPerBay: perBay,
      crossbarSize: pickCrossbarSize(bayFt),
      sharesStart,
      sharesEnd,
    };
  });

  const uprights = results.reduce((sum, run) => sum + run.uprights, 0);
  const panels = results.reduce((sum, run) => sum + run.panels, 0);
  const uprightSize = pickUprightSize(heightFt);
  const base = baseSpecForHeight(heightFt);
  const panelDropIn = Math.round(heightFt * 12 + Math.max(0, settings.puddleIn));
  const panelLengthFt =
    PANEL_STOCK_LENGTHS_FT.find((length) => length * 12 >= panelDropIn - EPSILON) ?? null;

  const crossbarGroups = new Map<string, { size: SizeRange; quantity: number }>();
  for (const run of results) {
    const group = crossbarGroups.get(run.crossbarSize.id);
    if (group) group.quantity += run.crossbars;
    else crossbarGroups.set(run.crossbarSize.id, { size: run.crossbarSize, quantity: run.crossbars });
  }

  const pct = settings.sparePercent;
  const items: PipeDrapeHardwareItem[] = [];
  if (uprights > 0) {
    items.push({
      key: "upright",
      title: "Uprights",
      spec: `${uprightSize.label} · set at ${formatFeetInches(heightFt)}`,
      sizeId: uprightSize.id,
      quantity: uprights,
      spare: spareFor(uprights, pct),
    });
    items.push({
      key: "base",
      title: "Base plates",
      spec: base.label,
      sizeId: base.id,
      quantity: uprights,
      spare: spareFor(uprights, pct),
    });
  }
  for (const size of CROSSBAR_SIZES) {
    const group = crossbarGroups.get(size.id);
    if (!group) continue;
    items.push({
      key: "crossbar",
      title: "Crossbars",
      spec: group.size.label,
      sizeId: group.size.id,
      quantity: group.quantity,
      spare: spareFor(group.quantity, pct),
    });
  }
  if (panels > 0) {
    items.push({
      key: "panel",
      title: "Drape panels",
      spec: `${settings.panelWidthIn}″ wide · ${
        panelLengthFt ? `${panelLengthFt}′ stock` : "custom length"
      } · ${formatFeetInches(panelDropIn / 12)} drop`,
      sizeId: null,
      quantity: panels,
      spare: spareFor(panels, pct),
    });
  }

  const warnings: string[] = [];
  if (heightFt > UPRIGHT_SIZES[UPRIGHT_SIZES.length - 1].maxFt) {
    warnings.push(`${formatFeetInches(heightFt)} is taller than our tallest upright (20′). Plan truss or ceiling rigging.`);
  } else if (heightFt > 0 && heightFt < UPRIGHT_SIZES[0].minFt) {
    warnings.push(`${formatFeetInches(heightFt)} is shorter than the smallest upright (4′); uprights will be cut down or swapped for fixed posts.`);
  }
  for (const run of results) {
    if (run.bayFt < CROSSBAR_SIZES[0].minFt - EPSILON) {
      warnings.push(`${run.label} is only ${formatFeetInches(run.bayFt)} wide; use a short fixed crossbar.`);
    }
  }
  if (!panelLengthFt && panels > 0) {
    warnings.push(`A ${formatFeetInches(panelDropIn / 12)} drop is longer than stock panels (24′). Order custom lengths.`);
  }
  if (heightFt > 12 && results.some((run) => run.bayFt > 10 + EPSILON)) {
    warnings.push("Above 12′, keep bays at 10′ or less so the crossbars don’t sag.");
  }

  return {
    runs: results,
    totalFt: valid.reduce((sum, run) => sum + run.lengthFt, 0),
    bays: results.reduce((sum, run) => sum + run.bays, 0),
    corners: results.filter((run) => run.sharesStart).length,
    closedLoop,
    uprightSize,
    base,
    panelLengthFt,
    panelDropIn,
    items,
    warnings,
  };
}

export type PipeDrapePriceMode = "charge" | "included";

/** What the calculator saves per quote or invoice (and the standalone page keeps locally). */
export type PipeDrapePlan = {
  runs: PipeDrapeRun[];
  settings: PipeDrapeSettings;
  priceMode: PipeDrapePriceMode;
  drapeProductId?: string | null;
};

export const PIPE_DRAPE_PLAN_KEY = /^(quote|invoice):[0-9a-f-]{36}$/;
const MAX_RUNS = 60;

function finite(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function normalizePipeDrapePlan(raw: unknown): PipeDrapePlan | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  if (!Array.isArray(input.runs) || input.runs.length === 0) return null;
  const settings = (input.settings && typeof input.settings === "object" ? input.settings : {}) as Record<string, unknown>;
  const d = DEFAULT_PIPE_DRAPE_SETTINGS;
  return {
    runs: input.runs.slice(0, MAX_RUNS).map((value, index) => {
      const run = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
      return {
        id: typeof run.id === "string" && run.id ? run.id.slice(0, 64) : `run-${index}`,
        label: typeof run.label === "string" ? run.label.slice(0, 80) : `Run ${index + 1}`,
        lengthFt: finite(run.lengthFt, 0, 0, 2000),
        joinsPrevious: Boolean(run.joinsPrevious),
      };
    }),
    settings: {
      heightFt: finite(settings.heightFt, d.heightFt, 0, 60),
      maxBayFt: finite(settings.maxBayFt, d.maxBayFt, 4, 12),
      fullness: finite(settings.fullness, d.fullness, 1, 4),
      panelWidthIn: finite(settings.panelWidthIn, d.panelWidthIn, 24, 120),
      puddleIn: finite(settings.puddleIn, d.puddleIn, 0, 36),
      sparePercent: finite(settings.sparePercent, d.sparePercent, 0, 50),
      colorId: typeof settings.colorId === "string" ? settings.colorId.slice(0, 32) : d.colorId,
    },
    priceMode: input.priceMode === "included" ? "included" : "charge",
    drapeProductId: typeof input.drapeProductId === "string" ? input.drapeProductId.slice(0, 64) : null,
  };
}

type HardwareProductLike = { name: string; sku?: string | null; kind: string };

const HARDWARE_TYPE: Record<Exclude<PipeDrapeHardwareKey, "panel">, RegExp> = {
  upright: /upright/i,
  base: /base\s*plate|\bbase\b/i,
  crossbar: /cross\s*bar|drape support/i,
};

const RANGE_IN_NAME = /\d+\s*[′'’]?\s*(?:-|–|to|à)\s*\d+/;

function sizePattern(key: PipeDrapeHardwareKey, sizeId: string): RegExp {
  if (key === "base") return new RegExp(`\\b${sizeId}\\s*(?:["″]|in\\b|po\\b)?\\s*(?:x|×)\\s*${sizeId}\\b`, "i");
  const [min, max] = sizeId.split("-");
  return new RegExp(`\\b${min}\\s*[′'’]?\\s*(?:-|–|to|à)\\s*${max}\\b`, "i");
}

/**
 * Picks the inventory product for a hardware line: the size-specific product
 * (e.g. "Upright 10′–16′", "Base plate 24×24") when one exists, otherwise the
 * generic product of that type.
 */
export function matchHardwareProduct<T extends HardwareProductLike>(
  products: T[],
  key: PipeDrapeHardwareKey,
  sizeId: string | null
): T | null {
  if (key === "panel") return null;
  const candidates = products.filter((product) => product.kind === "product" && HARDWARE_TYPE[key].test(product.name));
  if (candidates.length === 0) return null;
  if (sizeId) {
    const pattern = sizePattern(key, sizeId);
    const sized = candidates.find((product) => pattern.test(`${product.name} ${product.sku ?? ""}`));
    if (sized) return sized;
  }
  const generic = candidates.filter((product) =>
    key === "base" ? !/\d+\s*(?:x|×)\s*\d+/i.test(product.name) : !RANGE_IN_NAME.test(product.name)
  );
  return generic[0] ?? (sizeId ? null : candidates[0]);
}

const LINEAR_FOOT_UNIT = /^(linear\s*(ft|feet|foot)|lin\.?\s*ft|lf|l\.f\.|pi\s*lin(éaire)?s?|pieds?\s*lin(éaires?)?)$/i;

export function isLinearFootUnit(unit: string | null | undefined) {
  return LINEAR_FOOT_UNIT.test((unit ?? "").trim());
}

/** Linear-foot document lines, as calculator run suggestions. */
export function linearFootSources(
  lines: Array<{ key: string; description: string; quantity: number; unit: string | null | undefined }>
) {
  return lines
    .filter((line) => line.quantity > 0 && isLinearFootUnit(line.unit))
    .map((line) => ({
      key: line.key,
      label: line.description.split("\n")[0].trim() || "Drape run",
      feet: line.quantity,
    }));
}

export function formatPipeDrapePullList(
  result: PipeDrapeResult,
  settings: PipeDrapeSettings,
  title: string
) {
  const lines = [
    `PIPE & DRAPE HARDWARE · ${title}`,
    `${formatFeet(result.totalFt)} across ${result.runs.length} run${result.runs.length === 1 ? "" : "s"} · ${formatFeetInches(settings.heightFt)} high · ${result.bays} bays`,
    "",
    ...result.items.map(
      (item) =>
        `${item.quantity}× ${item.title} — ${item.spec}${item.spare ? ` (+${item.spare} spare)` : ""}`
    ),
    "",
    "Runs:",
    ...result.runs.map(
      (run) =>
        `${run.label}: ${formatFeet(run.lengthFt)} = ${run.bays} bay${run.bays === 1 ? "" : "s"} of ${formatFeetInches(run.bayFt)} · ${run.panels} panels${run.sharesStart ? " · shares corner upright" : ""}`
    ),
  ];
  if (result.warnings.length > 0) lines.push("", "Notes:", ...result.warnings.map((warning) => `- ${warning}`));
  return lines.join("\n");
}

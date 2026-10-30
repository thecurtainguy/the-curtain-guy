/**
 * Studio design → draft quote lines.
 *
 * `buildStudioBillOfMaterials` says *what* the design needs; this module prices
 * it from the product catalog through `studio_product_mappings`. Nothing is
 * guessed: a line with no active mapped product (or whose product is priced in
 * a unit the design can't measure) becomes `not_priced_yet` at $0.
 *
 * `convertStudioBomToQuoteLines` is pure so previews and scripts can run it
 * with a hand-built pricing context; the loaders below fetch the live one.
 */
import {
  computeLineTotalCents,
  isValidQuoteLineCategorySlug,
  type QuoteLineStatus,
  type QuoteTaxCategory,
} from "@/data/quotes";
import {
  customerLocaleTag,
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import type { EventPlanSubmissionRow } from "@/data/event-plans";
import { getEventTypeLabel } from "@/data/event-types";
import {
  buildProductColorOptions,
  resolveColorUnitPriceCents,
  resolveProductDisplayImage,
  resolveProductDisplayTitle,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import {
  resolveProductCategoryLabel,
  type ProductCategoryRow,
} from "@/data/product-categories";
import type { ProductRow } from "@/data/products";
import {
  segmentsForLinearFeet,
  type ProductFormulaIncludeRow,
  type ProductFormulaIncludeWithProduct,
} from "@/data/rentals";
import {
  LOGISTICS_SERVICE_PRODUCT_SLUGS,
  type LogisticsServiceKey,
  type RentalDeliveryZone,
} from "@/data/rentals-logistics";
import { normalizeStudioDesign, type StudioDesignJson } from "@/data/studio";
import type { LineItemInput } from "@/lib/quotes";
import { fetchLogisticsServiceProducts, type LogisticsServiceProduct } from "@/lib/logistics-products";
import { listProductCategories } from "@/lib/product-categories";
import { listColorVariantsForProducts } from "@/lib/product-colors";
import { listRentalDeliveryZones } from "@/lib/rental-delivery-zones";
import {
  STUDIO_BOM_SECTIONS,
  buildStudioBillOfMaterials,
  studioBomLineSwatch,
  type PipeAndDrapeComponents,
  type StudioBillOfMaterials,
  type StudioBomLine,
  type StudioBomSection,
  type StudioBomUnit,
} from "@/lib/studio-bom";
import {
  resolveMappings,
  type StudioProductMappingRow,
} from "@/lib/studio-product-mappings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type StudioPricingProduct = ProductRow & {
  colors: ProductColorVariantRow[];
  includes: ProductFormulaIncludeWithProduct[];
};

export type StudioPricingContext = {
  /** Active mappings with a product, by mapping key. */
  mappings: Map<string, StudioProductMappingRow>;
  /** Mapped products (active or not) by id. */
  products: Map<string, StudioPricingProduct>;
  zones: RentalDeliveryZone[];
  logisticsProducts: Partial<Record<LogisticsServiceKey, LogisticsServiceProduct>>;
  categories: ProductCategoryRow[];
};

export type StudioQuoteLineState = "priced" | "included" | "not_priced" | "flagged";

export type StudioQuoteLine = {
  /** Stable within one conversion. */
  key: string;
  section: StudioBomSection;
  state: StudioQuoteLineState;
  /** Key the owner maps on the pricing page (null for formula-included parts). */
  catalogKey: string | null;
  /** Key whose product priced this line. */
  mappingKey: string | null;
  productName: string | null;
  /** Why it isn't priced, or what to double-check. */
  note: string | null;
  swatchHex: string | null;
  lineTotalCents: number;
  item: LineItemInput;
};

export type StudioQuoteConversionSummary = {
  lineCount: number;
  pricedCount: number;
  includedCount: number;
  notPricedCount: number;
  flaggedCount: number;
  /** Sum of `priced` lines — what the quote subtotal will start at. */
  pricedSubtotalCents: number;
  /** Lines with a price but held for measurement / venue confirmation. */
  flaggedSubtotalCents: number;
  /** Catalog keys with no usable product (deduped, in line order). */
  unmappedKeys: string[];
  /** Coverage decisions worth showing the owner. */
  notes: string[];
};

export type StudioQuoteConversion = {
  lines: StudioQuoteLine[];
  summary: StudioQuoteConversionSummary;
};

export type StudioQuoteEventInfo = {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  eventName: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  venueName: string | null;
  cityArea: string | null;
  language: CustomerLanguage;
};

/* ------------------------------------------------------------------ */
/* Units & categories                                                  */
/* ------------------------------------------------------------------ */

const UNIT_SYNONYMS: Record<string, StudioBomUnit> = {
  "linear ft": "linear ft",
  "linear feet": "linear ft",
  "linear foot": "linear ft",
  "lin ft": "linear ft",
  lf: "linear ft",
  ft: "linear ft",
  feet: "linear ft",
  foot: "linear ft",
  each: "each",
  ea: "each",
  item: "each",
  piece: "each",
  pc: "each",
  pcs: "each",
  unit: "each",
  panel: "panel",
  panels: "panel",
  set: "set",
  sets: "set",
  event: "event",
  flat: "event",
  "flat rate": "event",
  "per event": "event",
};

export function normalizeStudioUnit(label: string | null | undefined): StudioBomUnit | null {
  const key = (label ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return UNIT_SYNONYMS[key] ?? null;
}

function quantityInProductUnit(line: StudioBomLine, unitLabel: string): number | null {
  const unit = normalizeStudioUnit(unitLabel);
  if (!unit) return null;
  const quantity = line.altQuantities[unit];
  return typeof quantity === "number" && quantity > 0 ? quantity : null;
}

function fallbackCategory(
  line: Pick<StudioBomLine, "section" | "mappingKey">,
  categories: readonly ProductCategoryRow[]
): string {
  switch (line.mappingKey) {
    case "service:delivery":
      return "delivery";
    case "service:installation":
      return "installation";
    case "service:teardown":
      return "teardown";
    case "service:ceiling_rigging":
      return "labor";
    default:
      break;
  }
  switch (line.section) {
    case "drapery":
    case "ceiling":
      return "drape_rental";
    case "hardware":
      return "hardware";
    case "treatments":
      return "backdrop";
    case "lighting":
      return categories.some((row) => row.slug === "lighting") ? "lighting" : "custom";
    case "services":
      return "labor";
    default:
      return "custom";
  }
}

function productCategory(
  product: Pick<ProductRow, "category">,
  fallback: string
): string {
  const slug = String(product.category ?? "").trim();
  return slug && isValidQuoteLineCategorySlug(slug) ? slug : fallback;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/* ------------------------------------------------------------------ */
/* Line builders                                                       */
/* ------------------------------------------------------------------ */

type Draft = Omit<StudioQuoteLine, "item" | "lineTotalCents" | "key"> & {
  key?: string;
  item: Omit<LineItemInput, "sort_order">;
};

function unpricedDraft(
  line: StudioBomLine,
  ctx: StudioPricingContext,
  note: string,
  overrides?: {
    product?: StudioPricingProduct | null;
    description?: string;
    quantity?: number;
    unit?: string;
  }
): Draft {
  const category = fallbackCategory(line, ctx.categories);
  const product = overrides?.product ?? null;
  return {
    key: line.id,
    section: line.section,
    state: "not_priced",
    catalogKey: line.mappingKey,
    mappingKey: null,
    productName: product?.name ?? null,
    note,
    swatchHex: studioBomLineSwatch(line),
    item: {
      category: product ? productCategory(product, category) : category,
      category_label: resolveProductCategoryLabel(
        product ? productCategory(product, category) : category,
        ctx.categories
      ),
      description: overrides?.description ?? line.description,
      quantity: overrides?.quantity ?? line.quantity,
      unit_label: overrides?.unit ?? line.unit,
      unit_price_cents: 0,
      status: "not_priced_yet",
      customer_visible: true,
      is_taxable: product ? product.is_taxable : true,
      tax_category: product && !product.is_taxable ? "exempt" : "standard",
      product_id: product?.id ?? null,
      image_url: product?.image_url ?? null,
      image_alt: product?.image_alt ?? null,
    },
  };
}

type Resolved =
  | { ok: true; key: string; product: StudioPricingProduct }
  | { ok: false; note: string; product: StudioPricingProduct | null };

function resolveLineProduct(
  keys: readonly string[],
  ctx: StudioPricingContext
): Resolved {
  let inactive: StudioPricingProduct | null = null;
  for (const key of keys) {
    const mapping = ctx.mappings.get(key);
    if (!mapping?.product_id) continue;
    const product = ctx.products.get(mapping.product_id);
    if (!product) continue;
    if (!product.is_active) {
      inactive ??= product;
      continue;
    }
    return { ok: true, key, product };
  }
  if (inactive) {
    return {
      ok: false,
      product: inactive,
      note: `Mapped product “${inactive.name}” is inactive — pick an active product.`,
    };
  }
  return { ok: false, product: null, note: "No product mapped to this option yet." };
}

function matchColor(
  product: StudioPricingProduct,
  colorLabel: string | undefined
): { color: ProductColorVariantRow | null; missing: boolean } {
  if (!colorLabel) return { color: null, missing: false };
  const options = buildProductColorOptions(product);
  if (!options.length) return { color: null, missing: false };
  const wanted = normalizeName(colorLabel);
  const match = options.find((option) => normalizeName(option.name) === wanted);
  return match ? { color: match, missing: false } : { color: null, missing: true };
}

function pricedDraft(
  line: StudioBomLine,
  product: StudioPricingProduct,
  mappingKey: string,
  ctx: StudioPricingContext,
  overrides?: { quantity?: number; details?: string[] }
): Draft {
  const quantity = overrides?.quantity ?? quantityInProductUnit(line, product.unit_label);
  if (quantity == null) {
    return unpricedDraft(
      line,
      ctx,
      `“${product.name}” is priced per ${product.unit_label}; the design measures this in ${line.unit}. Map a per-${line.unit} product or price it by hand.`,
      { product }
    );
  }

  const { color, missing } = matchColor(product, line.metadata.colorLabel);
  const unitPrice = resolveColorUnitPriceCents({
    productPriceCents: product.default_unit_price_cents,
    color,
  });
  if (!(unitPrice > 0)) {
    return unpricedDraft(
      line,
      ctx,
      `“${product.name}” has no price set — add one on the product.`,
      { product }
    );
  }

  const title = resolveProductDisplayTitle({
    productName: product.name,
    color,
    defaultColorName: product.default_color_name,
  });
  const image = resolveProductDisplayImage({
    productImageUrl: product.image_url,
    productImageAlt: product.image_alt,
    color,
  });
  const details = overrides?.details ?? line.details;
  const category = productCategory(product, fallbackCategory(line, ctx.categories));
  const status: QuoteLineStatus = line.flag ?? "priced";
  const notes = [
    missing
      ? `No “${line.metadata.colorLabel}” colour on “${product.name}” — priced at its base colour.`
      : null,
    line.flagReason,
  ].filter(Boolean);

  return {
    key: line.id,
    section: line.section,
    state: line.flag ? "flagged" : "priced",
    catalogKey: line.mappingKey,
    mappingKey,
    productName: product.name,
    note: notes.length ? notes.join(" ") : null,
    swatchHex: studioBomLineSwatch(line),
    item: {
      category,
      category_label: resolveProductCategoryLabel(category, ctx.categories),
      description: [title, ...details].join(" · "),
      quantity,
      unit_label: product.unit_label,
      unit_price_cents: unitPrice,
      status,
      customer_visible: true,
      is_taxable: product.is_taxable,
      tax_category: (product.is_taxable ? "standard" : "exempt") satisfies QuoteTaxCategory,
      product_id: product.id,
      image_url: image.imageUrl,
      image_alt: image.imageAlt ?? title,
    },
  };
}

function includedDraft(input: {
  key: string;
  section: StudioBomSection;
  included: ProductFormulaIncludeWithProduct["included"];
  quantity: number;
  parentName: string;
  ctx: StudioPricingContext;
}): Draft {
  const { included, ctx } = input;
  const category = productCategory(
    included,
    included.kind === "service" ? "installation" : "hardware"
  );
  return {
    key: input.key,
    section: input.section,
    state: "included",
    catalogKey: null,
    mappingKey: null,
    productName: included.name,
    note: `Included in the “${input.parentName}” price.`,
    swatchHex: null,
    item: {
      category,
      category_label: resolveProductCategoryLabel(category, ctx.categories),
      description: `Included · ${included.name}`,
      quantity: input.quantity,
      unit_label: included.unit_label || "each",
      unit_price_cents: 0,
      status: "included",
      customer_visible: true,
      is_taxable: false,
      tax_category: "exempt",
      product_id: included.id,
      image_url: included.image_url,
      image_alt: included.image_alt ?? included.name,
    },
  };
}

function isLinearFtFormula(product: StudioPricingProduct): boolean {
  return (
    product.configurator_mode === "linear_ft" &&
    normalizeStudioUnit(product.unit_label) === "linear ft" &&
    Number(product.formula_segment_feet) > 0 &&
    product.includes.length > 0
  );
}

function formatComponents(components: PipeAndDrapeComponents): string[] {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  return [
    plural(components.uprights, "upright"),
    plural(components.bases, "base plate"),
    plural(components.crossbars, "crossbar"),
  ];
}

/* ------------------------------------------------------------------ */
/* Delivery zones                                                      */
/* ------------------------------------------------------------------ */

export function resolveDeliveryZoneForCity(
  cityArea: string | null | undefined,
  zones: readonly RentalDeliveryZone[]
): RentalDeliveryZone | null {
  const city = normalizeName(cityArea?.split(",")[0]);
  if (!city) return null;
  const priced = zones.filter((zone) => zone.isActive && zone.priced && zone.fullServiceCents > 0);
  const exact = priced.find((zone) =>
    [zone.id, zone.label, zone.shortLabel].some((value) => normalizeName(value) === city)
  );
  if (exact) return exact;
  const contained = priced.filter((zone) => {
    const short = normalizeName(zone.shortLabel);
    return short.length >= 4 && city.includes(short);
  });
  if (contained.length === 1) return contained[0];
  if (contained.length > 1) return null;
  // "Montréal" → "Montreal Island": the zone name starts with the city, and only one does.
  const prefixed = priced.filter(
    (zone) => city.length >= 5 && normalizeName(zone.shortLabel).startsWith(city)
  );
  return prefixed.length === 1 ? prefixed[0] : null;
}

/* ------------------------------------------------------------------ */
/* Conversion                                                          */
/* ------------------------------------------------------------------ */

const SECTION_ORDER = new Map<StudioBomSection, number>(
  STUDIO_BOM_SECTIONS.map((section, index) => [section, index])
);

export function convertStudioBomToQuoteLines(
  bom: StudioBillOfMaterials,
  ctx: StudioPricingContext,
  options?: { cityArea?: string | null }
): StudioQuoteConversion {
  const drafts: Draft[] = [];
  const notes: string[] = [];
  const bomLines = bom.lines;

  /* Drapery: price first so formula-included hardware can be netted out. */
  const coveredDrapeLineIds = new Set<string>();
  const includedTotals = new Map<
    string,
    { include: ProductFormulaIncludeWithProduct; quantity: number; parents: Set<string> }
  >();

  for (const line of bomLines.filter((entry) => entry.section === "drapery")) {
    const resolved = resolveLineProduct(line.mappingKeys, ctx);
    if (!resolved.ok) {
      drafts.push(unpricedDraft(line, ctx, resolved.note, { product: resolved.product }));
      continue;
    }
    const draft = pricedDraft(line, resolved.product, resolved.key, ctx);
    drafts.push(draft);
    if (draft.state === "not_priced" || !isLinearFtFormula(resolved.product)) continue;

    coveredDrapeLineIds.add(line.id);
    const segments = segmentsForLinearFeet(
      line.quantity,
      Number(resolved.product.formula_segment_feet)
    );
    for (const include of resolved.product.includes) {
      const quantity = segments * (Number(include.qty_per_segment) || 0);
      if (!(quantity > 0)) continue;
      const entry = includedTotals.get(include.included.id) ?? {
        include,
        quantity: 0,
        parents: new Set<string>(),
      };
      entry.quantity += quantity;
      entry.parents.add(resolved.product.name);
      includedTotals.set(include.included.id, entry);
    }
  }

  const includedProductIds = new Set(includedTotals.keys());
  const includedSlugs = new Set(
    [...includedTotals.values()].map((entry) => entry.include.included.slug)
  );
  for (const [productId, entry] of includedTotals) {
    drafts.push(
      includedDraft({
        key: `included:${productId}`,
        section: entry.include.included.kind === "service" ? "services" : "hardware",
        included: entry.include.included,
        quantity: entry.quantity,
        parentName: [...entry.parents].join(" / "),
        ctx,
      })
    );
  }

  const installationCovered =
    includedSlugs.has(LOGISTICS_SERVICE_PRODUCT_SLUGS.installation_only) ||
    includedSlugs.has(LOGISTICS_SERVICE_PRODUCT_SLUGS.full_service);
  let fullServiceZone: RentalDeliveryZone | null = null;

  for (const line of bomLines) {
    if (line.section === "drapery") continue;

    /* Pipe & drape hardware: only the part no drape formula already includes. */
    if (line.mappingKey === "drape_hardware:pipe_and_drape") {
      const groups = line.metadata.hardwareGroups ?? [];
      const open = groups.filter((group) => !coveredDrapeLineIds.has(group.drapeLineId));
      if (!open.length) {
        notes.push("Pipe & drape hardware is included in the drapery formula price.");
        continue;
      }
      const feet = open.reduce((sum, group) => sum + group.linearFeet, 0);
      const components: PipeAndDrapeComponents = {
        spans: open.reduce((sum, group) => sum + group.spans, 0),
        uprights: open.reduce((sum, group) => sum + group.uprights, 0),
        bases: open.reduce((sum, group) => sum + group.bases, 0),
        crossbars: open.reduce((sum, group) => sum + group.crossbars, 0),
      };
      if (open.length < groups.length) {
        notes.push("Some pipe & drape hardware is already included in a drapery formula price.");
      }
      const details = [
        ...formatComponents(components),
        ...line.details.filter((detail) => detail.startsWith("up to")),
      ];
      const scoped: StudioBomLine = {
        ...line,
        details,
        description: [line.title, ...details].join(" · "),
        quantity: feet,
        altQuantities: { "linear ft": feet },
        metadata: { ...line.metadata, components, hardwareGroups: open },
      };

      const whole = resolveLineProduct([line.mappingKey], ctx);
      if (whole.ok) {
        drafts.push(pricedDraft(scoped, whole.product, whole.key, ctx));
        continue;
      }

      const parts: { key: string; title: string; count: number }[] = [
        { key: "hardware_part:upright", title: "Pipe & drape upright", count: components.uprights },
        { key: "hardware_part:base_plate", title: "Pipe & drape base plate", count: components.bases },
        { key: "hardware_part:crossbar", title: "Pipe & drape crossbar", count: components.crossbars },
      ];
      const anyPartMapped = parts.some((part) => resolveLineProduct([part.key], ctx).ok);
      if (!anyPartMapped) {
        drafts.push(unpricedDraft(scoped, ctx, whole.note, { product: whole.product }));
        continue;
      }
      for (const part of parts) {
        if (part.count <= 0) continue;
        const partLine: StudioBomLine = {
          ...scoped,
          id: `${line.id}:${part.key}`,
          mappingKey: part.key,
          mappingKeys: [part.key],
          title: part.title,
          details: [],
          description: part.title,
          quantity: part.count,
          unit: "each",
          altQuantities: { each: part.count },
        };
        const resolved = resolveLineProduct([part.key], ctx);
        drafts.push(
          resolved.ok
            ? pricedDraft(partLine, resolved.product, resolved.key, ctx)
            : unpricedDraft(partLine, ctx, resolved.note, { product: resolved.product })
        );
      }
      continue;
    }

    if (line.mappingKey === "service:delivery") {
      const resolved = resolveLineProduct(line.mappingKeys, ctx);
      if (resolved.ok) {
        drafts.push(pricedDraft(line, resolved.product, resolved.key, ctx));
        continue;
      }
      const zone = resolveDeliveryZoneForCity(options?.cityArea, ctx.zones);
      if (!zone) {
        drafts.push(
          unpricedDraft(
            line,
            ctx,
            options?.cityArea?.trim()
              ? `“${options.cityArea.trim()}” doesn't match a priced delivery zone.`
              : "No city on the design — delivery zone unknown."
          )
        );
        continue;
      }
      fullServiceZone = zone;
      const product = ctx.logisticsProducts.full_service ?? null;
      drafts.push({
        key: line.id,
        section: line.section,
        state: "priced",
        catalogKey: line.mappingKey,
        mappingKey: null,
        productName: product?.name ?? "Full service",
        note: `Priced from the ${zone.label} delivery zone (full service).`,
        swatchHex: null,
        item: {
          category: "delivery",
          category_label: resolveProductCategoryLabel("delivery", ctx.categories),
          description: `Full service — transport, installation & teardown · ${zone.shortLabel}`,
          quantity: 1,
          unit_label: "event",
          unit_price_cents: zone.fullServiceCents,
          status: "priced",
          customer_visible: true,
          is_taxable: true,
          tax_category: "standard",
          product_id: product?.id ?? null,
          image_url: product?.image_url ?? null,
          image_alt: product?.image_alt ?? product?.name ?? null,
        },
      });
      continue;
    }

    if (line.mappingKey === "service:installation" || line.mappingKey === "service:teardown") {
      const resolved = resolveLineProduct(line.mappingKeys, ctx);
      const coveredByFormula =
        installationCovered || (resolved.ok && includedProductIds.has(resolved.product.id));
      if (coveredByFormula || fullServiceZone) {
        notes.push(
          `${line.title} is covered by ${
            fullServiceZone ? "the full-service delivery price" : "the drapery formula price"
          }.`
        );
        continue;
      }
      drafts.push(
        resolved.ok
          ? pricedDraft(line, resolved.product, resolved.key, ctx)
          : unpricedDraft(line, ctx, resolved.note, { product: resolved.product })
      );
      continue;
    }

    const resolved = resolveLineProduct(line.mappingKeys, ctx);
    drafts.push(
      resolved.ok
        ? pricedDraft(line, resolved.product, resolved.key, ctx)
        : unpricedDraft(line, ctx, resolved.note, { product: resolved.product })
    );
  }

  const ordered = drafts
    .map((draft, index) => ({ draft, index }))
    .sort(
      (a, b) =>
        (SECTION_ORDER.get(a.draft.section) ?? 99) - (SECTION_ORDER.get(b.draft.section) ?? 99) ||
        a.index - b.index
    )
    .map(({ draft }) => draft);

  const lines: StudioQuoteLine[] = ordered.map((draft, index) => {
    const lineTotalCents =
      draft.state === "priced" || draft.state === "flagged"
        ? computeLineTotalCents(draft.item.quantity, draft.item.unit_price_cents)
        : 0;
    return {
      ...draft,
      key: draft.key ?? `line-${index}`,
      lineTotalCents,
      item: { ...draft.item, sort_order: index },
    };
  });

  const unmappedKeys = [
    ...new Set(
      lines
        .filter((line) => line.state === "not_priced" && line.catalogKey)
        .map((line) => line.catalogKey as string)
    ),
  ];

  return {
    lines,
    summary: {
      lineCount: lines.length,
      pricedCount: lines.filter((line) => line.state === "priced").length,
      includedCount: lines.filter((line) => line.state === "included").length,
      notPricedCount: lines.filter((line) => line.state === "not_priced").length,
      flaggedCount: lines.filter((line) => line.state === "flagged").length,
      pricedSubtotalCents: lines
        .filter((line) => line.state === "priced")
        .reduce((sum, line) => sum + line.lineTotalCents, 0),
      flaggedSubtotalCents: lines
        .filter((line) => line.state === "flagged")
        .reduce((sum, line) => sum + line.lineTotalCents, 0),
      unmappedKeys,
      notes: [...new Set(notes)],
    },
  };
}

/** Every key the converter may look up for this BOM. */
export function collectStudioMappingKeys(bom: StudioBillOfMaterials): string[] {
  const keys = new Set<string>();
  for (const line of bom.lines) {
    for (const key of line.mappingKeys) keys.add(key);
    if (line.mappingKey === "drape_hardware:pipe_and_drape") {
      keys.add("hardware_part:upright");
      keys.add("hardware_part:base_plate");
      keys.add("hardware_part:crossbar");
    }
  }
  return [...keys];
}

/* ------------------------------------------------------------------ */
/* Live pricing context                                                */
/* ------------------------------------------------------------------ */

export async function loadStudioPricingContext(keys: string[]): Promise<StudioPricingContext> {
  const [mappings, zones, logisticsProducts, categories] = await Promise.all([
    resolveMappings(keys),
    listRentalDeliveryZones(),
    fetchLogisticsServiceProducts(),
    listProductCategories(),
  ]);

  const productIds = [
    ...new Set(
      [...mappings.values()]
        .map((row) => row.product_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const products = new Map<string, StudioPricingProduct>();
  if (!productIds.length) {
    return { mappings, products, zones, logisticsProducts, categories };
  }

  const admin = createAdminSupabaseClient();
  const [productResult, colors, includeResult] = await Promise.all([
    admin.from("products").select("*").in("id", productIds),
    listColorVariantsForProducts(productIds, { activeOnly: true }),
    admin
      .from("product_formula_includes")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
  ]);
  if (productResult.error) {
    console.error("[studio-quote] load products", productResult.error.message);
  }
  if (includeResult.error) {
    console.error("[studio-quote] load formula includes", includeResult.error.message);
  }

  const includeRows = (includeResult.data ?? []) as ProductFormulaIncludeRow[];
  const includedIds = [...new Set(includeRows.map((row) => row.included_product_id))];
  const includedById = new Map<string, ProductFormulaIncludeWithProduct["included"]>();
  if (includedIds.length) {
    const { data, error } = await admin
      .from("products")
      .select(
        "id, name, slug, kind, category, unit_label, default_unit_price_cents, is_taxable, image_url, image_alt, is_active"
      )
      .in("id", includedIds);
    if (error) console.error("[studio-quote] load included products", error.message);
    for (const row of (data ?? []) as ProductFormulaIncludeWithProduct["included"][]) {
      includedById.set(row.id, row);
    }
  }

  for (const row of (productResult.data ?? []) as ProductRow[]) {
    products.set(row.id, {
      ...row,
      colors: colors.filter((color) => color.product_id === row.id),
      includes: includeRows
        .filter((include) => include.product_id === row.id)
        .map((include) => {
          const included = includedById.get(include.included_product_id);
          return included ? { ...include, included } : null;
        })
        .filter((include): include is ProductFormulaIncludeWithProduct => include !== null),
    });
  }

  return { mappings, products, zones, logisticsProducts, categories };
}

/* ------------------------------------------------------------------ */
/* Source loading (studio design or event plan)                        */
/* ------------------------------------------------------------------ */

/** `studio_designs` row including the sales-pipeline columns. */
export type StudioQuoteDesignRow = {
  id: string;
  title: string;
  status: string;
  owner_user_id: string | null;
  created_by_user_id: string | null;
  estimate_request_id: string | null;
  quote_id: string | null;
  opportunity_ref: string | null;
  design_json: StudioDesignJson;
  thumbnail_data_url: string | null;
  preview_image_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  event_name: string | null;
  event_type: string | null;
  event_date: string | null;
  guest_count: number | null;
  venue_name: string | null;
  city_area: string | null;
  language: string | null;
  updated_at: string;
};

export type StudioQuoteSource = {
  design: StudioDesignJson;
  designRow: StudioQuoteDesignRow | null;
  plan: EventPlanSubmissionRow | null;
  event: StudioQuoteEventInfo;
  title: string;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function parseDesign(value: unknown): StudioDesignJson | null {
  if (!value || typeof value !== "object") return null;
  const design = value as StudioDesignJson;
  if (!design.room || !Array.isArray(design.room.floor) || design.room.floor.length < 3) {
    return null;
  }
  try {
    return normalizeStudioDesign(design);
  } catch {
    return null;
  }
}

async function fetchDesignRow(id: string): Promise<StudioQuoteDesignRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("[studio-quote] load design", error.message);
  return (data as StudioQuoteDesignRow | null) ?? null;
}

async function fetchPlanRow(
  column: "id" | "studio_design_id",
  value: string
): Promise<EventPlanSubmissionRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_plan_submissions")
    .select("*")
    .eq(column, value)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[studio-quote] load event plan", error.message);
  return (data as EventPlanSubmissionRow | null) ?? null;
}

export async function loadStudioQuoteSource(input: {
  designId?: string | null;
  eventPlanId?: string | null;
}): Promise<StudioQuoteSource | { error: string; status: number }> {
  let designRow: StudioQuoteDesignRow | null = null;
  let plan: EventPlanSubmissionRow | null = null;

  if (input.eventPlanId) {
    plan = await fetchPlanRow("id", input.eventPlanId);
    if (!plan) return { error: "Event plan not found.", status: 404 };
    if (plan.studio_design_id) designRow = await fetchDesignRow(plan.studio_design_id);
  } else if (input.designId) {
    designRow = await fetchDesignRow(input.designId);
    if (!designRow) return { error: "Studio design not found.", status: 404 };
    plan = await fetchPlanRow("studio_design_id", designRow.id);
  } else {
    return { error: "A design or event plan is required.", status: 400 };
  }

  const design = parseDesign(designRow?.design_json) ?? parseDesign(plan?.design_json);
  if (!design) {
    return { error: "This design has no room layout to quote yet.", status: 422 };
  }

  const planExtra = (plan ?? {}) as Record<string, unknown>;
  const brief = (plan?.brief_json ?? {}) as Record<string, unknown>;
  const event: StudioQuoteEventInfo = {
    contactName: text(designRow?.contact_name) ?? text(plan?.contact_name),
    contactEmail: text(designRow?.contact_email) ?? text(plan?.contact_email),
    contactPhone: text(designRow?.contact_phone) ?? text(plan?.contact_phone),
    eventName: text(designRow?.event_name) ?? text(planExtra.event_name),
    eventType: text(designRow?.event_type) ?? text(plan?.event_type),
    eventDate: text(designRow?.event_date) ?? text(plan?.event_date),
    guestCount:
      positiveInt(designRow?.guest_count) ??
      positiveInt(planExtra.guest_count) ??
      positiveInt(brief.guestCount),
    venueName: text(designRow?.venue_name) ?? text(plan?.venue_name),
    cityArea: text(designRow?.city_area) ?? text(plan?.city_area),
    language: normalizeCustomerLanguage(designRow?.language ?? plan?.language),
  };

  return {
    design,
    designRow,
    plan,
    event,
    title: designRow?.title?.trim() || design.room.name?.trim() || "Room design",
  };
}

export type StudioQuotePreview = {
  bom: StudioBillOfMaterials;
  conversion: StudioQuoteConversion;
};

export async function buildStudioQuotePreview(
  source: Pick<StudioQuoteSource, "design" | "event">
): Promise<StudioQuotePreview> {
  const bom = buildStudioBillOfMaterials(source.design, {
    cityArea: source.event.cityArea,
  });
  const ctx = await loadStudioPricingContext(collectStudioMappingKeys(bom));
  const conversion = convertStudioBomToQuoteLines(bom, ctx, {
    cityArea: source.event.cityArea,
  });
  return { bom, conversion };
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

function formatEventDate(value: string | null, language: CustomerLanguage): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(customerLocaleTag(language), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function eventTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return (
    getEventTypeLabel(value) ??
    value.replaceAll("_", " ").replace(/^\w/, (char) => char.toUpperCase())
  );
}

/** Customer-facing event summary for `quotes.customer_notes`. */
export function buildStudioQuoteCustomerNotes(
  event: StudioQuoteEventInfo,
  designTitle: string
): string {
  const fr = event.language === "fr";
  const eventLine = [
    event.eventName ?? eventTypeLabel(event.eventType),
    formatEventDate(event.eventDate, event.language),
    event.guestCount ? `${event.guestCount} ${fr ? "invités" : "guests"}` : null,
  ].filter(Boolean);
  const venueLine = [event.venueName, event.cityArea].filter(Boolean);

  return [
    eventLine.length ? `${fr ? "Événement :" : "Event:"} ${eventLine.join(" · ")}` : null,
    venueLine.length ? `${fr ? "Lieu :" : "Venue:"} ${venueLine.join(", ")}` : null,
    fr
      ? `Cette soumission a été préparée à partir de votre plan de salle « ${designTitle} ». Les lignes « Prix à venir » seront confirmées après la vérification des détails du lieu.`
      : `This proposal was prepared from your room design “${designTitle}”. Lines marked “Not priced yet” will be confirmed once we review the venue details.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Owner-only conversion summary for `quotes.owner_notes`. */
export function buildStudioQuoteOwnerNotes(
  conversion: StudioQuoteConversion,
  designTitle: string
): string {
  const { summary } = conversion;
  return [
    `Built from Studio design “${designTitle}”: ${summary.pricedCount} priced, ${summary.includedCount} included, ${summary.flaggedCount} to confirm, ${summary.notPricedCount} not priced yet.`,
    summary.unmappedKeys.length
      ? `Unmapped options (map them in Admin → Studio pricing): ${summary.unmappedKeys.join(", ")}.`
      : null,
    ...summary.notes,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Quote → design summary                                              */
/* ------------------------------------------------------------------ */

export type StudioQuoteDesignSummary = {
  kind: "studio_design" | "event_plan";
  id: string;
  title: string;
  thumbnailUrl: string | null;
  updatedAt: string;
  totals: StudioBillOfMaterials["totals"];
  roomName: string | null;
  widthFeet: number;
  lengthFeet: number;
};

function summarizeDesign(design: StudioDesignJson) {
  const xs = design.room.floor.map((point) => point.x);
  const zs = design.room.floor.map((point) => point.z);
  const bom = buildStudioBillOfMaterials(design, { omitServices: true });
  return {
    totals: bom.totals,
    roomName: design.room.name?.trim() || null,
    widthFeet: Math.round((Math.max(...xs) - Math.min(...xs)) / 12),
    lengthFeet: Math.round((Math.max(...zs) - Math.min(...zs)) / 12),
  };
}

/** The studio design (or event plan layout) a quote was built from, if any. */
export async function fetchStudioDesignSummaryForQuote(quote: {
  id: string;
  estimate_request_id: string;
}): Promise<StudioQuoteDesignSummary | null> {
  const admin = createAdminSupabaseClient();
  const columns =
    "id, title, status, design_json, thumbnail_data_url, preview_image_url, updated_at";

  const byQuote = await admin
    .from("studio_designs")
    .select(columns)
    .eq("quote_id", quote.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let row = byQuote.data as Partial<StudioQuoteDesignRow> | null;

  if (!row) {
    const byEstimate = await admin
      .from("studio_designs")
      .select(columns)
      .eq("estimate_request_id", quote.estimate_request_id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    row = byEstimate.data as Partial<StudioQuoteDesignRow> | null;
  }

  if (row?.id) {
    const design = parseDesign(row.design_json);
    if (design) {
      return {
        kind: "studio_design",
        id: row.id,
        title: row.title?.trim() || design.room.name || "Room design",
        thumbnailUrl: row.preview_image_url || row.thumbnail_data_url || null,
        updatedAt: row.updated_at ?? "",
        ...summarizeDesign(design),
      };
    }
  }

  const { data: planData } = await admin
    .from("event_plan_submissions")
    .select("id, reference, design_json, updated_at, studio_design_id")
    .eq("estimate_request_id", quote.estimate_request_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = planData as
    | Pick<EventPlanSubmissionRow, "id" | "reference" | "design_json" | "updated_at">
    | null;
  const planDesign = plan ? parseDesign(plan.design_json) : null;
  if (!plan || !planDesign) return null;
  const planSummary = summarizeDesign(planDesign);
  const hasContent = Object.entries(planSummary.totals).some(([, value]) => value > 0);
  if (!hasContent) return null;
  return {
    kind: "event_plan",
    id: plan.id,
    title: planDesign.room.name?.trim() || "Event plan layout",
    thumbnailUrl: null,
    updatedAt: plan.updated_at,
    ...planSummary,
  };
}

/* ------------------------------------------------------------------ */
/* API payloads                                                        */
/* ------------------------------------------------------------------ */

export type StudioQuotePreviewPayload = {
  title: string;
  source: { designId: string | null; eventPlanId: string | null };
  event: StudioQuoteEventInfo;
  totals: StudioBillOfMaterials["totals"];
  lines: StudioQuoteLine[];
  summary: StudioQuoteConversionSummary;
  existingQuote: {
    id: string;
    displayRef: string;
    status: string;
    lineCount: number;
    /** Empty drafts get filled instead of needing a revision. */
    fillable: boolean;
  } | null;
};

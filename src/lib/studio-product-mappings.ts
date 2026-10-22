/**
 * Studio option → catalog product links (`studio_product_mappings`).
 *
 * Every option a Studio design can contain has a mapping key
 * (`<kind>:<value>`). The catalog below is generated from the Studio enums so
 * the pricing page can list every option, mapped or not. Prices always come
 * from the linked product — a mapping never stores a price.
 *
 * Writes go through the service-role client; callers must check owner access.
 */
import {
  CEILING_DRAPE_STYLES,
  CEILING_HUB_DECOR,
  CEILING_LIGHT_STYLES,
  DANCE_FLOOR_FINISHES,
  DRAPE_COLORS,
  DRAPE_FABRICS,
  DRAPE_HARDWARE,
  LINEN_OBJECT_TYPES,
  STUDIO_CHAIR_STYLES,
  STUDIO_OBJECT_OPTIONS,
  STUDIO_OBJECT_TYPES,
  STUDIO_TREATMENT_TYPES,
  type StudioObjectType,
} from "@/data/studio";
import type { StudioBomSection, StudioBomUnit } from "@/lib/studio-bom";
import { STUDIO_TREATMENT_TYPE_LABELS } from "@/lib/studio-treatments";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const STUDIO_MAPPING_KEY_PATTERN = /^[a-z_]+:[a-z0-9_]+$/;
export const STUDIO_MAPPING_NOTES_MAX = 500;

export type StudioProductMappingRow = {
  id: string;
  created_at: string;
  updated_at: string;
  mapping_key: string;
  product_id: string | null;
  notes: string | null;
  is_active: boolean;
};

export type StudioMappingCatalogEntry = {
  key: string;
  section: StudioBomSection;
  /** Sub-heading inside the section. */
  group: string;
  label: string;
  description: string;
  /** How the design measures this option (the product should use the same unit). */
  defaultUnit: StudioBomUnit;
  swatchHex: string | null;
  /** Optional, more specific override of a broader key. */
  override: boolean;
};

export function isStudioMappingKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 120 &&
    STUDIO_MAPPING_KEY_PATTERN.test(value)
  );
}

/** Object types priced as their own `object:<type>` line (see `studio-bom`). */
const NON_OBJECT_LINE_TYPES = new Set<StudioObjectType>([
  "drape_backdrop",
  "uplight",
  "chandelier",
  "ceremony_seating",
  "chair",
  "column",
  "ceiling_drape",
]);
const OBJECT_KEY_TYPES: StudioObjectType[] = STUDIO_OBJECT_TYPES.filter(
  (type) => !NON_OBJECT_LINE_TYPES.has(type)
);

function objectOptionLabel(type: StudioObjectType): string {
  return (
    STUDIO_OBJECT_OPTIONS.find((option) => option.type === type)?.label ??
    type.replaceAll("_", " ")
  );
}

function buildCatalog(): StudioMappingCatalogEntry[] {
  const entries: StudioMappingCatalogEntry[] = [];
  const add = (entry: Omit<StudioMappingCatalogEntry, "swatchHex" | "override"> &
    Partial<Pick<StudioMappingCatalogEntry, "swatchHex" | "override">>) =>
    entries.push({ swatchHex: null, override: false, ...entry });

  for (const fabric of DRAPE_FABRICS) {
    add({
      key: `drape_fabric:${fabric.value}`,
      section: "drapery",
      group: "Wall drapery by fabric",
      label: `${fabric.label} drape`,
      description:
        "Priced per linear ft of hung drape. Colour variants on the product set the price per colour.",
      defaultUnit: "linear ft",
    });
  }
  for (const fabric of DRAPE_FABRICS) {
    for (const color of DRAPE_COLORS) {
      add({
        key: `drape:${fabric.value}_${color.value}`,
        section: "drapery",
        group: `${fabric.label} colour overrides`,
        label: `${color.label} ${fabric.label.toLowerCase()}`,
        description: `Use a different product for ${color.label.toLowerCase()} ${fabric.label.toLowerCase()} only.`,
        defaultUnit: "linear ft",
        swatchHex: color.hex,
        override: true,
      });
    }
  }

  for (const hardware of DRAPE_HARDWARE) {
    add({
      key: `drape_hardware:${hardware.value}`,
      section: "hardware",
      group: "Drape hardware",
      label: hardware.label,
      description:
        hardware.value === "pipe_and_drape"
          ? "Only used when the drape product does not already include hardware in its formula."
          : "Priced per linear ft of track or mount.",
      defaultUnit: "linear ft",
    });
  }
  for (const [value, label] of [
    ["upright", "Pipe & drape upright"],
    ["base_plate", "Pipe & drape base plate"],
    ["crossbar", "Pipe & drape crossbar"],
  ] as const) {
    add({
      key: `hardware_part:${value}`,
      section: "hardware",
      group: "Pipe & drape parts",
      label,
      description:
        "Itemised when pipe & drape hardware is not mapped as a whole and not included by the drape product.",
      defaultUnit: "each",
    });
  }

  for (const type of STUDIO_TREATMENT_TYPES) {
    add({
      key: `treatment:${type}`,
      section: "treatments",
      group: "Treatments",
      label: STUDIO_TREATMENT_TYPE_LABELS[type],
      description: "One per treatment, or per linear ft of width if the product is priced that way.",
      defaultUnit: "each",
    });
  }
  add({
    key: "treatment_addon:floral_header",
    section: "treatments",
    group: "Treatment add-ons",
    label: "Floral header",
    description: "Floral garland crowning a backdrop.",
    defaultUnit: "each",
  });

  for (const style of CEILING_DRAPE_STYLES) {
    add({
      key: `ceiling_style:${style.value}`,
      section: "ceiling",
      group: "Ceiling styles",
      label: `${style.label} ceiling`,
      description: `${style.description}. One per design, or per panel / linear ft of fabric.`,
      defaultUnit: "each",
    });
  }
  add({
    key: "object:ceiling_drape",
    section: "ceiling",
    group: "Ceiling styles",
    label: "Ceiling canopy (placed object)",
    description: "Swagged canopy placed as a room object.",
    defaultUnit: "each",
  });
  for (const lights of CEILING_LIGHT_STYLES) {
    if (lights.value === "none") continue;
    add({
      key: `ceiling_lights:${lights.value}`,
      section: "ceiling",
      group: "Ceiling lights & hub decor",
      label: `${lights.label} in ceiling`,
      description: "One per ceiling design.",
      defaultUnit: "each",
    });
  }
  for (const decor of CEILING_HUB_DECOR) {
    if (decor.value === "none") continue;
    add({
      key: `ceiling_hub:${decor.value}`,
      section: "ceiling",
      group: "Ceiling lights & hub decor",
      label: `${decor.label} at hub`,
      description: "Centre-piece on radial ceiling styles.",
      defaultUnit: "each",
    });
  }
  add({
    key: "service:ceiling_rigging",
    section: "ceiling",
    group: "Rigging",
    label: "Ceiling rigging",
    description: "Per rigging point (or per event). Always flagged for a site visit.",
    defaultUnit: "each",
  });

  add({
    key: "lighting:uplight",
    section: "lighting",
    group: "Lighting",
    label: "LED uplight",
    description: "Per fixture — perimeter, drape, treatment and freestanding uplights combined.",
    defaultUnit: "each",
  });
  add({
    key: "lighting:ceiling_wash",
    section: "lighting",
    group: "Lighting",
    label: "Ceiling uplight wash",
    description: "One per ceiling design washed in colour.",
    defaultUnit: "each",
  });
  add({
    key: "object:chandelier",
    section: "lighting",
    group: "Lighting",
    label: "Chandelier",
    description: "Per chandelier placed in the room.",
    defaultUnit: "each",
  });

  for (const type of OBJECT_KEY_TYPES) {
    add({
      key: `object:${type}`,
      section: "furniture",
      group: "Tables, furniture & production",
      label: objectOptionLabel(type),
      description:
        type === "table_area"
          ? "Per round table in a seating zone (falls back to the round table mapping)."
          : "Per item placed in the room.",
      defaultUnit: "each",
    });
  }
  for (const finish of DANCE_FLOOR_FINISHES) {
    add({
      key: `dance_floor:${finish.value}`,
      section: "furniture",
      group: "Dance floor finish overrides",
      label: `Dance floor · ${finish.label}`,
      description: "Use a different product for this finish only.",
      defaultUnit: "each",
      override: true,
    });
  }
  for (const type of LINEN_OBJECT_TYPES) {
    add({
      key: `linen:${type}`,
      section: "furniture",
      group: "Linens",
      label: `Linen for ${objectOptionLabel(type).toLowerCase()}`,
      description: "Per dressed table. Colour variants on the product set the price per colour.",
      defaultUnit: "each",
    });
  }
  for (const style of STUDIO_CHAIR_STYLES) {
    if (style.value === "none") continue;
    add({
      key: `chair:${style.value}`,
      section: "furniture",
      group: "Chairs",
      label: `${style.label} chair`,
      description: "Per chair placed by the seating layout.",
      defaultUnit: "each",
    });
  }

  for (const [value, label, description] of [
    ["delivery", "Delivery & pickup", "Falls back to the delivery-zone full-service price when the city matches a zone."],
    ["installation", "Installation", "Skipped when the drape product or full service already includes it."],
    ["teardown", "Teardown", "Skipped when the drape product or full service already includes it."],
  ] as const) {
    add({
      key: `service:${value}`,
      section: "services",
      group: "Services",
      label,
      description,
      defaultUnit: "event",
    });
  }

  return entries;
}

export const STUDIO_MAPPING_CATALOG: readonly StudioMappingCatalogEntry[] = buildCatalog();

const CATALOG_BY_KEY = new Map(STUDIO_MAPPING_CATALOG.map((entry) => [entry.key, entry]));

export function getStudioMappingCatalogEntry(
  key: string
): StudioMappingCatalogEntry | null {
  return CATALOG_BY_KEY.get(key) ?? null;
}

/* ------------------------------------------------------------------ */
/* Data access                                                         */
/* ------------------------------------------------------------------ */

export async function listStudioProductMappings(): Promise<StudioProductMappingRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_product_mappings")
    .select("*")
    .order("mapping_key", { ascending: true });
  if (error) {
    console.error("[studio-product-mappings] list", error.message);
    return [];
  }
  return (data ?? []) as StudioProductMappingRow[];
}

/** Active mappings with a product, keyed by mapping_key. Unknown keys are ignored. */
export async function resolveMappings(
  keys: readonly string[]
): Promise<Map<string, StudioProductMappingRow>> {
  const wanted = [...new Set(keys.filter(isStudioMappingKey))];
  const result = new Map<string, StudioProductMappingRow>();
  if (wanted.length === 0) return result;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_product_mappings")
    .select("*")
    .in("mapping_key", wanted)
    .eq("is_active", true)
    .not("product_id", "is", null);
  if (error) {
    console.error("[studio-product-mappings] resolve", error.message);
    return result;
  }
  for (const row of (data ?? []) as StudioProductMappingRow[]) {
    result.set(row.mapping_key, row);
  }
  return result;
}

export type StudioProductMappingInput = {
  mappingKey: string;
  productId: string | null;
  notes?: string | null;
  isActive?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function upsertStudioProductMapping(
  input: StudioProductMappingInput
): Promise<{ ok: true; mapping: StudioProductMappingRow } | { ok: false; message: string }> {
  const key = input.mappingKey.trim();
  if (!isStudioMappingKey(key)) {
    return { ok: false, message: "Invalid mapping key." };
  }
  if (!CATALOG_BY_KEY.has(key)) {
    return { ok: false, message: "Unknown Studio option." };
  }
  if (input.productId !== null && !UUID_PATTERN.test(input.productId)) {
    return { ok: false, message: "Invalid product." };
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > STUDIO_MAPPING_NOTES_MAX) {
    return { ok: false, message: `Notes must be under ${STUDIO_MAPPING_NOTES_MAX} characters.` };
  }

  const admin = createAdminSupabaseClient();
  if (input.productId) {
    const { data: product } = await admin
      .from("products")
      .select("id")
      .eq("id", input.productId)
      .maybeSingle();
    if (!product) return { ok: false, message: "Product not found." };
  }

  const { data, error } = await admin
    .from("studio_product_mappings")
    .upsert(
      {
        mapping_key: key,
        product_id: input.productId,
        notes,
        is_active: input.isActive ?? true,
      },
      { onConflict: "mapping_key" }
    )
    .select("*")
    .single();
  if (error || !data) {
    console.error("[studio-product-mappings] upsert", error?.message);
    return { ok: false, message: error?.message || "Could not save mapping." };
  }
  return { ok: true, mapping: data as StudioProductMappingRow };
}

export async function deleteStudioProductMapping(
  mappingKey: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isStudioMappingKey(mappingKey)) {
    return { ok: false, message: "Invalid mapping key." };
  }
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("studio_product_mappings")
    .delete()
    .eq("mapping_key", mappingKey);
  if (error) {
    console.error("[studio-product-mappings] delete", error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

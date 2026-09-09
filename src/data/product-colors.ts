import type { ProductAvailabilityStatus } from "@/data/products";
import { slugifyProductName } from "@/data/products";

/** Curated brand palette — admins can also add custom colors. */
export const PRODUCT_COLOR_PALETTE = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#F7F5F0" },
  { name: "Ivory", hex: "#F3EAD8" },
  { name: "Champagne", hex: "#E8D5A3" },
  { name: "Gold", hex: "#C4A035" },
  { name: "Blush", hex: "#E8C4C0" },
  { name: "Navy", hex: "#1B2A4A" },
  { name: "Burgundy", hex: "#6B1E2E" },
  { name: "Emerald", hex: "#1F4D3A" },
  { name: "Silver", hex: "#C0C4CA" },
  { name: "Charcoal", hex: "#3A3F46" },
  { name: "Dusty Blue", hex: "#7A92A8" },
] as const;

export type ProductColorVariantRow = {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  name: string;
  slug: string;
  hex: string;
  sort_order: number;
  is_active: boolean;
  /** Optional public listing title when this color is selected (e.g. "Navy drapes"). */
  display_title: string | null;
  image_url: string | null;
  image_alt: string | null;
  has_own_pricing: boolean;
  unit_price_cents: number | null;
  quantity_on_hand: number | null;
  availability_status: ProductAvailabilityStatus | null;
};

export type ProductColorVariantInput = {
  id?: string;
  name: string;
  hex: string;
  sort_order?: number;
  is_active?: boolean;
  display_title?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  has_own_pricing?: boolean;
  unit_price_cents?: number | null;
  quantity_on_hand?: number | null;
  availability_status?: ProductAvailabilityStatus | null;
};

export function normalizeHexColor(value: string): string {
  const raw = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#8B909A";
}

export function slugifyColorName(name: string): string {
  return slugifyProductName(name) || "color";
}

export const PRODUCT_BASE_COLOR_ID = "__base__";

export function isProductBaseColorId(
  id: string | null | undefined
): boolean {
  return id === PRODUCT_BASE_COLOR_ID;
}

/**
 * When a product has color variants, the parent listing is also a selectable
 * color (e.g. Black) using the main product photo/price/title.
 */
export function inferBaseColorName(
  productName: string,
  explicit?: string | null
): string {
  const named = explicit?.trim();
  if (named) return named;
  const firstWord = productName.trim().split(/\s+/)[0] || "";
  const known = PRODUCT_COLOR_PALETTE.find(
    (swatch) => swatch.name.toLowerCase() === firstWord.toLowerCase()
  );
  if (known) return known.name;
  return firstWord || "Standard";
}

export function buildProductColorOptions(product: {
  id: string;
  name: string;
  image_url: string | null;
  image_alt: string | null;
  default_color_name?: string | null;
  default_color_hex?: string | null;
  colors: ProductColorVariantRow[];
}): ProductColorVariantRow[] {
  const variants = product.colors.filter((color) => color.is_active !== false);
  if (!variants.length) return [];

  const baseName = inferBaseColorName(
    product.name,
    product.default_color_name
  );
  const paletteMatch = PRODUCT_COLOR_PALETTE.find(
    (swatch) => swatch.name.toLowerCase() === baseName.toLowerCase()
  );
  const baseHex = normalizeHexColor(
    product.default_color_hex || paletteMatch?.hex || "#111111"
  );
  const base: ProductColorVariantRow = {
    id: PRODUCT_BASE_COLOR_ID,
    created_at: "",
    updated_at: "",
    product_id: product.id,
    name: baseName,
    slug: "base",
    hex: baseHex,
    sort_order: -1,
    is_active: true,
    display_title: product.name,
    image_url: product.image_url,
    image_alt: product.image_alt,
    has_own_pricing: false,
    unit_price_cents: null,
    quantity_on_hand: null,
    availability_status: null,
  };

  const filtered = variants.filter(
    (variant) =>
      variant.name.trim().toLowerCase() !== baseName.toLowerCase()
  );
  return [base, ...filtered];
}

export function resolveProductDisplayTitle(input: {
  productName: string;
  color?: Pick<ProductColorVariantRow, "display_title" | "name"> | null;
}): string {
  const override = input.color?.display_title?.trim();
  if (override) return override;
  return input.productName;
}

export function resolveProductDisplayImage(input: {
  productImageUrl: string | null;
  productImageAlt: string | null;
  color?: Pick<
    ProductColorVariantRow,
    "image_url" | "image_alt" | "name"
  > | null;
}): { imageUrl: string | null; imageAlt: string | null } {
  const colorUrl = input.color?.image_url?.trim() || null;
  if (colorUrl) {
    return {
      imageUrl: colorUrl,
      imageAlt:
        input.color?.image_alt?.trim() ||
        input.color?.name ||
        input.productImageAlt,
    };
  }
  return {
    imageUrl: input.productImageUrl,
    imageAlt: input.productImageAlt,
  };
}

export function resolveColorUnitPriceCents(input: {
  productPriceCents: number;
  color?: Pick<
    ProductColorVariantRow,
    "has_own_pricing" | "unit_price_cents"
  > | null;
}): number {
  if (
    input.color?.has_own_pricing &&
    typeof input.color.unit_price_cents === "number"
  ) {
    return Math.max(0, input.color.unit_price_cents);
  }
  return Math.max(0, input.productPriceCents);
}

export const PRODUCT_EVENT_TYPE_IDS = [
  "wedding",
  "corporate",
  "gala",
  "mitzvah",
  "stage-show",
  "trade-show",
  "private",
  "other",
] as const;

export type ProductEventTypeId = (typeof PRODUCT_EVENT_TYPE_IDS)[number];

export const PRODUCT_EVENT_TYPE_LABELS: Record<ProductEventTypeId, string> = {
  wedding: "Wedding",
  corporate: "Corporate Event",
  gala: "Gala",
  mitzvah: "Bar/Bat Mitzvah",
  "stage-show": "Stage/Show",
  "trade-show": "Trade Show",
  private: "Private Event",
  other: "Other",
};

export function isProductEventTypeId(
  value: string
): value is ProductEventTypeId {
  return (PRODUCT_EVENT_TYPE_IDS as readonly string[]).includes(value);
}

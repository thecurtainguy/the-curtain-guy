import {
  QUOTE_CATEGORY_LABELS,
  type QuoteLineCategory,
  isQuoteLineCategory,
} from "@/data/quotes";

export const PRODUCT_KINDS = ["product", "service", "package"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const PRODUCT_AVAILABILITY_STATUSES = [
  "available",
  "low_stock",
  "out_of_stock",
  "unavailable",
] as const;
export type ProductAvailabilityStatus =
  (typeof PRODUCT_AVAILABILITY_STATUSES)[number];

export const PRODUCT_UNIT_LABELS = [
  "each",
  "panel",
  "linear ft",
  "set",
  "hour",
  "day",
  "event",
] as const;

export type ProductRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  sku: string | null;
  slug: string;
  kind: ProductKind;
  category: QuoteLineCategory | string;
  short_description: string | null;
  description: string | null;
  unit_label: string;
  default_unit_price_cents: number;
  is_taxable: boolean;
  image_url: string | null;
  image_alt: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  availability_status: ProductAvailabilityStatus;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  event_type_ids?: string[];
  /** Parent listing color shown alongside variants (e.g. "Black"). */
  default_color_name?: string | null;
  default_color_hex?: string | null;
  configurator_mode?: "simple" | "linear_ft";
  formula_segment_feet?: number | null;
  full_service_product_id?: string | null;
  transport_only_product_id?: string | null;
};

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  product: "Product",
  service: "Service",
  package: "Package",
};

export const PRODUCT_AVAILABILITY_LABELS: Record<
  ProductAvailabilityStatus,
  string
> = {
  available: "Available",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  unavailable: "Unavailable",
};

export function isProductKind(value: string): value is ProductKind {
  return (PRODUCT_KINDS as readonly string[]).includes(value);
}

export function isProductAvailabilityStatus(
  value: string
): value is ProductAvailabilityStatus {
  return (PRODUCT_AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

export function slugifyProductName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "item";
}

export function suggestAvailabilityFromQty(input: {
  kind: ProductKind;
  quantityOnHand: number;
  lowStockThreshold: number;
  isActive: boolean;
}): ProductAvailabilityStatus {
  if (!input.isActive) return "unavailable";
  if (input.kind === "service") return "available";
  if (input.quantityOnHand <= 0) return "out_of_stock";
  if (input.quantityOnHand <= input.lowStockThreshold) return "low_stock";
  return "available";
}

export function getProductCategoryLabel(category: string): string {
  if (isQuoteLineCategory(category)) {
    return QUOTE_CATEGORY_LABELS[category];
  }
  return category.replaceAll("_", " ");
}

export function formatProductPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format((Number(cents) || 0) / 100);
}

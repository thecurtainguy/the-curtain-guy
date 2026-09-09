import {
  PRODUCT_EVENT_TYPE_IDS,
  type ProductColorVariantRow,
  type ProductEventTypeId,
} from "@/data/product-colors";
import type { ProductAvailabilityStatus } from "@/data/products";
import type { PublicRentalProduct } from "@/data/rentals";
import { QUOTE_LINE_CATEGORIES, type QuoteLineCategory } from "@/data/quotes";

export type RentalsSortId =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "newest";

export type RentalsCatalogFilters = {
  search: string;
  categories: string[];
  colors: string[];
  eventTypes: string[];
  availability: ProductAvailabilityStatus[];
  priceMinCents: number | null;
  priceMaxCents: number | null;
  sort: RentalsSortId;
};

export const DEFAULT_RENTALS_FILTERS: RentalsCatalogFilters = {
  search: "",
  categories: [],
  colors: [],
  eventTypes: [],
  availability: [],
  priceMinCents: null,
  priceMaxCents: null,
  sort: "featured",
};

export function productDisplayPriceCents(product: PublicRentalProduct): number {
  if (!product.colors.length) return product.default_unit_price_cents;
  const prices = product.colors.map((color) =>
    color.has_own_pricing && typeof color.unit_price_cents === "number"
      ? color.unit_price_cents
      : product.default_unit_price_cents
  );
  return Math.min(...prices, product.default_unit_price_cents);
}

export function collectCatalogFacets(products: PublicRentalProduct[]) {
  const categorySet = new Set<string>();
  const colorMap = new Map<string, { name: string; hex: string }>();
  const eventSet = new Set<string>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  for (const product of products) {
    categorySet.add(String(product.category));
    for (const id of product.event_type_ids || []) {
      if ((PRODUCT_EVENT_TYPE_IDS as readonly string[]).includes(id)) {
        eventSet.add(id);
      }
    }
    const baseName = product.default_color_name?.trim();
    if (baseName && product.colors.length > 0) {
      const key = baseName.toLowerCase();
      if (!colorMap.has(key)) {
        colorMap.set(key, {
          name: baseName,
          hex: product.default_color_hex || "#111111",
        });
      }
    }
    for (const color of product.colors) {
      const key = color.name.trim().toLowerCase();
      if (!key) continue;
      if (!colorMap.has(key)) {
        colorMap.set(key, { name: color.name, hex: color.hex });
      }
    }
    const price = productDisplayPriceCents(product);
    minPrice = Math.min(minPrice, price);
    maxPrice = Math.max(maxPrice, price);
  }

  const categories = QUOTE_LINE_CATEGORIES.filter((id) =>
    categorySet.has(id)
  ) as QuoteLineCategory[];

  const eventTypes = PRODUCT_EVENT_TYPE_IDS.filter((id) =>
    eventSet.has(id)
  ) as ProductEventTypeId[];

  const colors = [...colorMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    categories,
    colors,
    eventTypes,
    priceMinCents: Number.isFinite(minPrice) ? minPrice : 0,
    priceMaxCents: maxPrice,
  };
}

function productMatchesAvailability(
  product: PublicRentalProduct,
  selected: ProductAvailabilityStatus[]
): boolean {
  if (!selected.length) return true;
  if (selected.includes(product.availability_status)) return true;
  return product.colors.some(
    (color) =>
      color.availability_status &&
      selected.includes(color.availability_status)
  );
}

function productMatchesColors(
  product: PublicRentalProduct,
  selected: string[]
): boolean {
  if (!selected.length) return true;
  const keys = new Set(
    product.colors.map((color) => color.name.trim().toLowerCase())
  );
  return selected.some((name) => keys.has(name.toLowerCase()));
}

function productMatchesEventTypes(
  product: PublicRentalProduct,
  selected: string[]
): boolean {
  if (!selected.length) return true;
  const ids = new Set(product.event_type_ids || []);
  return selected.some((id) => ids.has(id));
}

export function filterAndSortRentalsCatalog(
  products: PublicRentalProduct[],
  filters: RentalsCatalogFilters
): PublicRentalProduct[] {
  const search = filters.search.trim().toLowerCase();
  let list = products.filter((product) => {
    if (
      filters.categories.length &&
      !filters.categories.includes(String(product.category))
    ) {
      return false;
    }
    if (!productMatchesColors(product, filters.colors)) return false;
    if (!productMatchesEventTypes(product, filters.eventTypes)) return false;
    if (!productMatchesAvailability(product, filters.availability)) {
      return false;
    }

    const price = productDisplayPriceCents(product);
    if (
      filters.priceMinCents != null &&
      price < filters.priceMinCents
    ) {
      return false;
    }
    if (
      filters.priceMaxCents != null &&
      price > filters.priceMaxCents
    ) {
      return false;
    }

    if (search) {
      const haystack = [
        product.name,
        product.short_description,
        product.description,
        product.sku,
        ...(product.event_type_ids || []),
        ...product.colors.map((c) => c.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  list = [...list];
  switch (filters.sort) {
    case "price-asc":
      list.sort(
        (a, b) => productDisplayPriceCents(a) - productDisplayPriceCents(b)
      );
      break;
    case "price-desc":
      list.sort(
        (a, b) => productDisplayPriceCents(b) - productDisplayPriceCents(a)
      );
      break;
    case "name-asc":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
    case "featured":
    default:
      list.sort(
        (a, b) =>
          a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      );
      break;
  }

  return list;
}

export function activeFilterCount(filters: RentalsCatalogFilters): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  count += filters.categories.length;
  count += filters.colors.length;
  count += filters.eventTypes.length;
  count += filters.availability.length;
  if (filters.priceMinCents != null) count += 1;
  if (filters.priceMaxCents != null) count += 1;
  return count;
}

export function colorSwatchesForProduct(
  product: PublicRentalProduct
): ProductColorVariantRow[] {
  return product.colors.filter((color) => color.is_active !== false);
}

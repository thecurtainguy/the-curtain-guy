import {
  PRODUCT_EVENT_TYPE_IDS,
  buildProductColorOptions,
  galleryPrimary,
  isProductBaseColorId,
  resolveColorUnitPriceCents,
  resolveProductDisplayTitle,
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

/** One shoppable catalog card — parent product, or one color of a multi-color product. */
export type RentalsCatalogEntry = {
  key: string;
  product: PublicRentalProduct;
  color: ProductColorVariantRow | null;
  href: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string | null;
  unitPriceCents: number;
  colorName: string | null;
  colorHex: string | null;
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

function entryImage(input: {
  product: PublicRentalProduct;
  color: ProductColorVariantRow | null;
}): { imageUrl: string | null; imageAlt: string | null } {
  if (input.color && !isProductBaseColorId(input.color.id)) {
    const fromGallery = galleryPrimary(input.color.images || []);
    if (fromGallery.imageUrl) return fromGallery;
    if (input.color.image_url?.trim()) {
      return {
        imageUrl: input.color.image_url.trim(),
        imageAlt:
          input.color.image_alt?.trim() ||
          input.color.name ||
          input.product.image_alt,
      };
    }
  }

  const parentGallery = galleryPrimary(input.product.images || []);
  if (parentGallery.imageUrl) return parentGallery;

  return {
    imageUrl: input.product.image_url,
    imageAlt: input.product.image_alt,
  };
}

export function expandRentalsCatalogEntries(
  products: PublicRentalProduct[]
): RentalsCatalogEntry[] {
  const entries: RentalsCatalogEntry[] = [];

  for (const product of products) {
    const options = buildProductColorOptions(product);

    if (!options.length) {
      const image = entryImage({ product, color: null });
      entries.push({
        key: product.id,
        product,
        color: null,
        href: `/rentals/${product.slug}`,
        title: product.name,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
        unitPriceCents: product.default_unit_price_cents,
        colorName: null,
        colorHex: null,
      });
      continue;
    }

    for (const color of options) {
      const image = entryImage({ product, color });
      const title = resolveProductDisplayTitle({
        productName: product.name,
        color,
        defaultColorName: product.default_color_name,
      });
      const href = isProductBaseColorId(color.id)
        ? `/rentals/${product.slug}`
        : `/rentals/${product.slug}?color=${encodeURIComponent(color.slug)}`;

      entries.push({
        key: `${product.id}:${color.id}`,
        product,
        color,
        href,
        title,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt || title,
        unitPriceCents: resolveColorUnitPriceCents({
          productPriceCents: product.default_unit_price_cents,
          color,
        }),
        colorName: color.name,
        colorHex: color.hex,
      });
    }
  }

  return entries;
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

    const options = buildProductColorOptions(product);
    if (options.length) {
      for (const color of options) {
        const key = color.name.trim().toLowerCase();
        if (!key) continue;
        if (!colorMap.has(key)) {
          colorMap.set(key, { name: color.name, hex: color.hex });
        }
        const price = resolveColorUnitPriceCents({
          productPriceCents: product.default_unit_price_cents,
          color,
        });
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    } else {
      const price = product.default_unit_price_cents;
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    }
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

function entryMatchesAvailability(
  entry: RentalsCatalogEntry,
  selected: ProductAvailabilityStatus[]
): boolean {
  if (!selected.length) return true;
  if (entry.color?.availability_status) {
    return selected.includes(entry.color.availability_status);
  }
  return selected.includes(entry.product.availability_status);
}

function entryMatchesColors(
  entry: RentalsCatalogEntry,
  selected: string[]
): boolean {
  if (!selected.length) return true;
  if (!entry.colorName) return false;
  const key = entry.colorName.trim().toLowerCase();
  return selected.some((name) => name.toLowerCase() === key);
}

function entryMatchesEventTypes(
  entry: RentalsCatalogEntry,
  selected: string[]
): boolean {
  if (!selected.length) return true;
  const ids = new Set(entry.product.event_type_ids || []);
  return selected.some((id) => ids.has(id));
}

export function filterAndSortRentalsCatalog(
  products: PublicRentalProduct[],
  filters: RentalsCatalogFilters
): RentalsCatalogEntry[] {
  const search = filters.search.trim().toLowerCase();
  let list = expandRentalsCatalogEntries(products).filter((entry) => {
    const product = entry.product;

    if (
      filters.categories.length &&
      !filters.categories.includes(String(product.category))
    ) {
      return false;
    }
    if (!entryMatchesColors(entry, filters.colors)) return false;
    if (!entryMatchesEventTypes(entry, filters.eventTypes)) return false;
    if (!entryMatchesAvailability(entry, filters.availability)) {
      return false;
    }

    if (
      filters.priceMinCents != null &&
      entry.unitPriceCents < filters.priceMinCents
    ) {
      return false;
    }
    if (
      filters.priceMaxCents != null &&
      entry.unitPriceCents > filters.priceMaxCents
    ) {
      return false;
    }

    if (search) {
      const haystack = [
        entry.title,
        product.name,
        product.short_description,
        product.description,
        product.sku,
        entry.colorName,
        ...(product.event_type_ids || []),
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
      list.sort((a, b) => a.unitPriceCents - b.unitPriceCents);
      break;
    case "price-desc":
      list.sort((a, b) => b.unitPriceCents - a.unitPriceCents);
      break;
    case "name-asc":
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "newest":
      list.sort(
        (a, b) =>
          new Date(b.product.created_at).getTime() -
          new Date(a.product.created_at).getTime()
      );
      break;
    case "featured":
    default:
      list.sort(
        (a, b) =>
          a.product.sort_order - b.product.sort_order ||
          (a.color?.sort_order ?? -1) - (b.color?.sort_order ?? -1) ||
          a.title.localeCompare(b.title)
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

export function findCatalogColorOption(
  product: PublicRentalProduct,
  colorParam: string | null | undefined
): ProductColorVariantRow | null {
  const options = buildProductColorOptions(product);
  if (!options.length) return null;
  const raw = colorParam?.trim();
  if (!raw) return options[0] ?? null;

  const needle = raw.toLowerCase();
  return (
    options.find(
      (color) =>
        color.slug.toLowerCase() === needle ||
        color.name.toLowerCase() === needle ||
        color.id.toLowerCase() === needle
    ) ??
    options[0] ??
    null
  );
}

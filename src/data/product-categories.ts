import {
  QUOTE_CATEGORY_LABELS,
  QUOTE_LINE_CATEGORIES,
  isQuoteLineCategory,
} from "@/data/quotes";

/** Owner-managed inventory category. `slug` is what products.category stores. */
export type ProductCategoryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  label: string;
  /** French name for French customers (proposal, PDF, email, /fr pages). */
  label_fr: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProductCategoryWithCount = ProductCategoryRow & {
  product_count: number;
};

export type QuoteCategoryOption = { value: string; label: string };

export const PRODUCT_CATEGORY_LABEL_MAX = 60;

export function slugifyCategoryLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "category";
}

/** Display label for a products.category slug. */
export function resolveProductCategoryLabel(
  slug: string,
  categories?: readonly Pick<ProductCategoryRow, "slug" | "label">[] | null
): string {
  const match = categories?.find((row) => row.slug === slug);
  if (match) return match.label;
  if (isQuoteLineCategory(slug)) return QUOTE_CATEGORY_LABELS[slug];
  const pretty = slug.replaceAll("_", " ").trim();
  return pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : "Uncategorized";
}

/** Customer-facing category name in the visitor's language (English fallback). */
export function localizedProductCategoryLabel(
  row: Pick<ProductCategoryRow, "label" | "label_fr">,
  language: string
): string {
  return language === "fr" ? row.label_fr?.trim() || row.label : row.label;
}

/** French name for a slug, or null when the category has none yet. */
export function resolveProductCategoryLabelFr(
  slug: string,
  categories?: readonly Pick<ProductCategoryRow, "slug" | "label_fr">[] | null
): string | null {
  return (
    categories?.find((row) => row.slug === slug)?.label_fr?.trim() || null
  );
}

export function sortProductCategories<
  T extends Pick<ProductCategoryRow, "sort_order" | "label">,
>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)
  );
}

/**
 * Choices for a quote line: active inventory categories first (your names),
 * then built-in service types (Delivery, Labor…) not already covered.
 */
export function buildQuoteCategoryOptions(
  categories: readonly Pick<
    ProductCategoryRow,
    "slug" | "label" | "sort_order" | "is_active"
  >[]
): QuoteCategoryOption[] {
  const inventory = sortProductCategories(
    categories.filter((row) => row.is_active)
  ).map((row) => ({ value: row.slug, label: row.label }));
  const taken = new Set(categories.map((row) => row.slug));
  const builtIn = QUOTE_LINE_CATEGORIES.filter((slug) => !taken.has(slug)).map(
    (slug) => ({ value: slug, label: QUOTE_CATEGORY_LABELS[slug] })
  );
  return [...inventory, ...builtIn];
}

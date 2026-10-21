import {
  PRODUCT_CATEGORY_LABEL_MAX,
  slugifyCategoryLabel,
  sortProductCategories,
  type ProductCategoryRow,
  type ProductCategoryWithCount,
} from "@/data/product-categories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const TABLE = "product_categories";

export async function listProductCategories(options?: {
  activeOnly?: boolean;
}): Promise<ProductCategoryRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (options?.activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    console.error("[product-categories] list", error);
    return [];
  }
  return (data || []) as ProductCategoryRow[];
}

export async function listProductCategoriesWithCounts(): Promise<
  ProductCategoryWithCount[]
> {
  const admin = createAdminSupabaseClient();
  const [categories, { data: products, error }] = await Promise.all([
    listProductCategories(),
    admin.from("products").select("category"),
  ]);
  if (error) console.error("[product-categories] counts", error);

  const counts = new Map<string, number>();
  for (const row of (products || []) as Array<{ category: string }>) {
    counts.set(row.category, (counts.get(row.category) || 0) + 1);
  }
  return categories.map((row) => ({
    ...row,
    product_count: counts.get(row.slug) || 0,
  }));
}

async function fetchCategoryById(id: string): Promise<ProductCategoryRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductCategoryRow;
}

/**
 * Products may only be saved into an active category, except when keeping the
 * category they already have (so archiving never blocks editing old items).
 */
export async function validateProductCategorySlug(
  slug: string,
  options?: { currentSlug?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const trimmed = slug.trim();
  if (!trimmed) return { error: "Pick a category." };
  if (options?.currentSlug && trimmed === options.currentSlug) {
    return { ok: true };
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(TABLE)
    .select("is_active")
    .eq("slug", trimmed)
    .maybeSingle();
  if (error) {
    console.error("[product-categories] validate", error);
    return { error: "Could not verify category." };
  }
  if (!data) return { error: "That category no longer exists." };
  if (!data.is_active) return { error: "That category is archived." };
  return { ok: true };
}

async function ensureUniqueCategorySlug(base: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  let candidate = base;
  for (let i = 0; i < 40; i++) {
    const { data } = await admin
      .from(TABLE)
      .select("id")
      .eq("slug", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}_${i + 2}`;
  }
  return `${base}_${Date.now().toString(36)}`;
}

function normalizeLabel(raw: unknown): string | { error: string } {
  const label = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!label) return { error: "Category name is required." };
  if (label.length > PRODUCT_CATEGORY_LABEL_MAX) {
    return {
      error: `Keep category names under ${PRODUCT_CATEGORY_LABEL_MAX} characters.`,
    };
  }
  return label;
}

function normalizeLabelFr(raw: unknown): string | { error: string } {
  const label = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!label) {
    return { error: "French name is required (shown to French customers)." };
  }
  if (label.length > PRODUCT_CATEGORY_LABEL_MAX) {
    return {
      error: `Keep French names under ${PRODUCT_CATEGORY_LABEL_MAX} characters.`,
    };
  }
  return label;
}

async function labelTaken(label: string, excludeId?: string): Promise<boolean> {
  const needle = label.toLowerCase();
  const rows = await listProductCategories();
  return rows.some(
    (row) => row.id !== excludeId && row.label.toLowerCase() === needle
  );
}

export async function createProductCategory(input: {
  label: unknown;
  label_fr?: unknown;
  description?: unknown;
}): Promise<{ category: ProductCategoryRow } | { error: string }> {
  const label = normalizeLabel(input.label);
  if (typeof label !== "string") return label;
  const labelFr = normalizeLabelFr(input.label_fr);
  if (typeof labelFr !== "string") return labelFr;
  if (await labelTaken(label)) {
    return { error: `A category named “${label}” already exists.` };
  }

  const existing = await listProductCategories();
  const nextSort =
    existing.reduce((max, row) => Math.max(max, row.sort_order), 0) + 10;
  const slug = await ensureUniqueCategorySlug(slugifyCategoryLabel(label));

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      slug,
      label,
      label_fr: labelFr,
      description:
        typeof input.description === "string" && input.description.trim()
          ? input.description.trim()
          : null,
      sort_order: nextSort,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[product-categories] create", error);
    return { error: error?.message || "Could not create category." };
  }
  return { category: data as ProductCategoryRow };
}

export async function updateProductCategory(
  id: string,
  input: {
    label?: unknown;
    label_fr?: unknown;
    description?: unknown;
    is_active?: unknown;
  }
): Promise<{ category: ProductCategoryRow } | { error: string }> {
  const existing = await fetchCategoryById(id);
  if (!existing) return { error: "Category not found." };

  const patch: Partial<ProductCategoryRow> = {};

  if (input.label !== undefined) {
    const label = normalizeLabel(input.label);
    if (typeof label !== "string") return label;
    if (label.toLowerCase() !== existing.label.toLowerCase()) {
      if (await labelTaken(label, id)) {
        return { error: `A category named “${label}” already exists.` };
      }
    }
    patch.label = label;
  }

  if (input.label_fr !== undefined) {
    const labelFr = normalizeLabelFr(input.label_fr);
    if (typeof labelFr !== "string") return labelFr;
    patch.label_fr = labelFr;
  }

  if (input.description !== undefined) {
    patch.description =
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim()
        : null;
  }

  if (input.is_active !== undefined) {
    patch.is_active = input.is_active === true;
  }

  if (!Object.keys(patch).length) return { category: existing };

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[product-categories] update", error);
    return { error: error?.message || "Could not update category." };
  }
  return { category: data as ProductCategoryRow };
}

export async function reorderProductCategories(
  orderedIds: string[]
): Promise<{ categories: ProductCategoryRow[] } | { error: string }> {
  const existing = await listProductCategories();
  const known = new Set(existing.map((row) => row.id));
  const ids = [...new Set(orderedIds)].filter((id) => known.has(id));
  for (const row of sortProductCategories(existing)) {
    if (!ids.includes(row.id)) ids.push(row.id);
  }

  const admin = createAdminSupabaseClient();
  const results = await Promise.all(
    ids.map((id, index) =>
      admin
        .from(TABLE)
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", id)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[product-categories] reorder", failed.error);
    return { error: failed.error.message || "Could not save order." };
  }
  return { categories: await listProductCategories() };
}

export async function deleteProductCategory(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const existing = await fetchCategoryById(id);
  if (!existing) return { error: "Category not found." };

  const admin = createAdminSupabaseClient();
  const { count, error: countError } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", existing.slug);
  if (countError) {
    console.error("[product-categories] delete count", countError);
    return { error: "Could not check items in this category." };
  }
  if ((count || 0) > 0) {
    return {
      error: `${count} item${count === 1 ? " uses" : "s use"} this category. Move them first, or archive it instead.`,
    };
  }

  const { error } = await admin.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[product-categories] delete", error);
    return { error: error.message || "Could not delete category." };
  }
  return { ok: true };
}

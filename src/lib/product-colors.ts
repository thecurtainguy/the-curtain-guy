import {
  normalizeHexColor,
  slugifyColorName,
  type ProductColorVariantInput,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import {
  isProductAvailabilityStatus,
  type ProductAvailabilityStatus,
} from "@/data/products";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function ensureUniqueSlug(desired: string, used: Set<string>): string {
  let candidate = desired;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${desired}-${i}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

type PreparedVariantRow = {
  id?: string;
  product_id: string;
  name: string;
  slug: string;
  hex: string;
  sort_order: number;
  is_active: boolean;
  display_title: string | null;
  image_url: string | null;
  image_alt: string | null;
  has_own_pricing: boolean;
  unit_price_cents: number | null;
  quantity_on_hand: number | null;
  availability_status: ProductAvailabilityStatus | null;
};

function prepareVariantRows(input: {
  productId: string;
  variants: ProductColorVariantInput[];
  existingById: Map<string, ProductColorVariantRow>;
}): PreparedVariantRow[] {
  const usedSlugs = new Set<string>();
  const rows: PreparedVariantRow[] = [];

  input.variants.forEach((variant, index) => {
    const name = variant.name.trim();
    if (!name) return;

    const existing =
      variant.id && input.existingById.has(variant.id)
        ? input.existingById.get(variant.id)!
        : null;

    // Keep stable public color slugs when updating an existing row.
    const slug = existing
      ? (() => {
          usedSlugs.add(existing.slug);
          return existing.slug;
        })()
      : ensureUniqueSlug(slugifyColorName(name), usedSlugs);

    const hasOwn = Boolean(variant.has_own_pricing);
    let availability: ProductAvailabilityStatus | null = null;
    if (
      variant.availability_status &&
      isProductAvailabilityStatus(variant.availability_status)
    ) {
      availability = variant.availability_status;
    }

    const row: PreparedVariantRow = {
      product_id: input.productId,
      name,
      slug,
      hex: normalizeHexColor(variant.hex || "#8B909A"),
      sort_order: variant.sort_order ?? index,
      is_active: variant.is_active !== false,
      display_title: variant.display_title?.trim() || null,
      image_url: variant.image_url?.trim() || null,
      image_alt: variant.image_alt?.trim() || null,
      has_own_pricing: hasOwn,
      unit_price_cents: hasOwn
        ? Math.max(0, Math.round(Number(variant.unit_price_cents) || 0))
        : null,
      quantity_on_hand: hasOwn
        ? Math.max(0, Math.round(Number(variant.quantity_on_hand) || 0))
        : null,
      availability_status: hasOwn ? availability : null,
    };
    if (existing?.id) row.id = existing.id;
    rows.push(row);
  });

  return rows;
}

/** If a variant has a primary URL but no gallery rows, seed one (repair + safety). */
async function ensureVariantGalleryRows(
  variants: ProductColorVariantRow[]
): Promise<void> {
  const needing = variants.filter(
    (row) => typeof row.image_url === "string" && row.image_url.trim()
  );
  if (!needing.length) return;

  const admin = createAdminSupabaseClient();
  const ids = needing.map((row) => row.id);
  const { data: existing } = await admin
    .from("product_images")
    .select("color_variant_id")
    .in("color_variant_id", ids);

  const hasGallery = new Set(
    (existing || [])
      .map((row) => row.color_variant_id as string | null)
      .filter(Boolean)
  );

  const inserts = needing
    .filter((row) => !hasGallery.has(row.id))
    .map((row) => ({
      product_id: row.product_id,
      color_variant_id: row.id,
      image_url: row.image_url!.trim(),
      image_alt: row.image_alt?.trim() || null,
      sort_order: 0,
    }));

  if (!inserts.length) return;
  const { error } = await admin.from("product_images").insert(inserts);
  if (error) {
    console.error("[product-colors] ensureVariantGalleryRows", error.message);
  }
}

export async function listProductColorVariants(
  productId: string,
  options?: { activeOnly?: boolean }
): Promise<ProductColorVariantRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("product_color_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (options?.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) {
    console.error("[product-colors] list", error.message);
    return [];
  }
  return (data || []) as ProductColorVariantRow[];
}

export async function listColorVariantsForProducts(
  productIds: string[],
  options?: { activeOnly?: boolean }
): Promise<ProductColorVariantRow[]> {
  if (productIds.length === 0) return [];
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("product_color_variants")
    .select("*")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[product-colors] listForProducts", error.message);
    return [];
  }
  return (data || []) as ProductColorVariantRow[];
}

/**
 * Upsert color variants in place.
 * IMPORTANT: Do not delete-all/reinsert — that cascades and wipes product_images galleries.
 */
export async function replaceProductColorVariants(input: {
  productId: string;
  variants: ProductColorVariantInput[];
}): Promise<{ ok: true; variants: ProductColorVariantRow[] } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const existing = await listProductColorVariants(input.productId);
  const existingById = new Map(existing.map((row) => [row.id, row]));

  const prepared = prepareVariantRows({
    productId: input.productId,
    variants: input.variants,
    existingById,
  });

  const keepIds = new Set(
    prepared.map((row) => row.id).filter((id): id is string => Boolean(id))
  );
  const toDelete = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id);

  if (toDelete.length) {
    const { error: deleteError } = await admin
      .from("product_color_variants")
      .delete()
      .eq("product_id", input.productId)
      .in("id", toDelete);
    if (deleteError) return { error: deleteError.message };
  }

  for (const row of prepared) {
    if (!row.id) continue;
    const { id, ...fields } = row;
    const { error } = await admin
      .from("product_color_variants")
      .update(fields)
      .eq("id", id)
      .eq("product_id", input.productId);
    if (error) return { error: error.message };
  }

  const toInsert = prepared
    .filter((row) => !row.id)
    .map(({ id: _id, ...fields }) => fields);

  if (toInsert.length) {
    const { error } = await admin.from("product_color_variants").insert(toInsert);
    if (error) return { error: error.message };
  }

  const variants = await listProductColorVariants(input.productId);
  await ensureVariantGalleryRows(variants);

  return { ok: true, variants };
}

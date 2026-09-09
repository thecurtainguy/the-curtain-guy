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

function ensureUniqueSlug(
  desired: string,
  used: Set<string>
): string {
  let candidate = desired;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${desired}-${i}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
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

export async function replaceProductColorVariants(input: {
  productId: string;
  variants: ProductColorVariantInput[];
}): Promise<{ ok: true; variants: ProductColorVariantRow[] } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const usedSlugs = new Set<string>();

  const rows = input.variants
    .map((variant, index) => {
      const name = variant.name.trim();
      if (!name) return null;
      const slug = ensureUniqueSlug(slugifyColorName(name), usedSlugs);
      const hasOwn = Boolean(variant.has_own_pricing);
      let availability: ProductAvailabilityStatus | null = null;
      if (
        variant.availability_status &&
        isProductAvailabilityStatus(variant.availability_status)
      ) {
        availability = variant.availability_status;
      }
      return {
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
    })
    .filter(
      (row): row is NonNullable<typeof row> => row != null
    );

  const { error: deleteError } = await admin
    .from("product_color_variants")
    .delete()
    .eq("product_id", input.productId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  if (rows.length === 0) {
    return { ok: true, variants: [] };
  }

  const { data, error } = await admin
    .from("product_color_variants")
    .insert(rows)
    .select("*");

  if (error) {
    return { error: error.message };
  }

  const variants = ((data || []) as ProductColorVariantRow[]).slice().sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );

  return { ok: true, variants };
}

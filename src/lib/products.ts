import {
  isProductAvailabilityStatus,
  isProductKind,
  slugifyProductName,
  suggestAvailabilityFromQty,
  type ProductAvailabilityStatus,
  type ProductKind,
  type ProductRow,
} from "@/data/products";
import { isQuoteLineCategory } from "@/data/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";

export const PRODUCT_IMAGES_BUCKET = "product-images";

export type ProductWriteInput = {
  name: string;
  sku?: string | null;
  slug?: string | null;
  kind: ProductKind;
  category: string;
  short_description?: string | null;
  description?: string | null;
  unit_label?: string;
  default_unit_price_cents?: number;
  is_taxable?: boolean;
  image_url?: string | null;
  image_alt?: string | null;
  quantity_on_hand?: number;
  low_stock_threshold?: number;
  availability_status?: ProductAvailabilityStatus;
  availability_manual?: boolean;
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
  event_type_ids?: string[];
  default_color_name?: string | null;
  default_color_hex?: string | null;
  configurator_mode?: "simple" | "linear_ft";
  formula_segment_feet?: number | null;
  full_service_product_id?: string | null;
  transport_only_product_id?: string | null;
};

function normalizeSku(sku: string | null | undefined): string | null {
  const trimmed = sku?.trim() || "";
  return trimmed ? trimmed : null;
}

async function ensureUniqueSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const admin = createAdminSupabaseClient();
  let candidate = baseSlug;
  for (let i = 0; i < 40; i++) {
    let query = admin.from("products").select("id").eq("slug", candidate).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}-${i + 2}`;
  }
  return `${baseSlug}-${Date.now().toString(36)}`;
}

export function buildProductPublicUrl(objectPath: string): string | null {
  const config = getSupabaseServerConfig();
  if (!config) return null;
  const base = config.url.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${objectPath.replace(/^\//, "")}`;
}

export async function listProducts(options?: {
  kind?: ProductKind | null;
  availability?: ProductAvailabilityStatus | null;
  activeOnly?: boolean;
  limit?: number;
}): Promise<ProductRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(options?.limit ?? 500);

  if (options?.kind) query = query.eq("kind", options.kind);
  if (options?.availability) {
    query = query.eq("availability_status", options.availability);
  }
  if (options?.activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    console.error("[products] listProducts", error);
    return [];
  }
  return (data || []) as ProductRow[];
}

export async function fetchProductById(
  id: string
): Promise<ProductRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductRow;
}

export async function createProduct(
  input: ProductWriteInput
): Promise<{ product: ProductRow } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!isProductKind(input.kind)) return { error: "Invalid kind." };
  if (!isQuoteLineCategory(input.category)) {
    return { error: "Invalid category." };
  }

  const quantity =
    input.kind === "service"
      ? 0
      : Math.max(0, Math.round(Number(input.quantity_on_hand) || 0));
  const lowStock = Math.max(
    0,
    Math.round(Number(input.low_stock_threshold ?? 2) || 0)
  );
  const isActive = input.is_active ?? true;
  const availability =
    input.kind === "service"
      ? "available"
      : input.availability_manual &&
          input.availability_status &&
          isProductAvailabilityStatus(input.availability_status)
        ? input.availability_status
        : suggestAvailabilityFromQty({
            kind: input.kind,
            quantityOnHand: quantity,
            lowStockThreshold: lowStock,
            isActive,
          });

  const slug = await ensureUniqueSlug(
    slugifyProductName(input.slug?.trim() || name)
  );

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .insert({
      name,
      sku: normalizeSku(input.sku),
      slug,
      kind: input.kind,
      category: input.category,
      short_description: input.short_description?.trim() || null,
      description: input.description?.trim() || null,
      unit_label: input.unit_label?.trim() || "each",
      default_unit_price_cents: Math.max(
        0,
        Math.round(Number(input.default_unit_price_cents) || 0)
      ),
      is_taxable: input.is_taxable ?? true,
      image_url: input.image_url?.trim() || null,
      image_alt: input.image_alt?.trim() || null,
      quantity_on_hand: quantity,
      low_stock_threshold: lowStock,
      availability_status: availability,
      is_active: isActive,
      is_public: input.is_public ?? false,
      sort_order: Math.round(Number(input.sort_order) || 0),
      event_type_ids: Array.isArray(input.event_type_ids)
        ? input.event_type_ids.filter((id) => typeof id === "string" && id.trim())
        : [],
      default_color_name: input.default_color_name?.trim() || null,
      default_color_hex: input.default_color_hex
        ? input.default_color_hex.trim()
        : null,
      configurator_mode:
        input.kind === "package"
          ? "simple"
          : input.configurator_mode === "linear_ft"
            ? "linear_ft"
            : "simple",
      formula_segment_feet:
        input.kind === "package"
          ? null
          : input.configurator_mode === "linear_ft" &&
              Number(input.formula_segment_feet) > 0
            ? Number(input.formula_segment_feet)
            : null,
      full_service_product_id: input.full_service_product_id || null,
      transport_only_product_id: input.transport_only_product_id || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[products] createProduct", error);
    return { error: error?.message || "Failed to create product." };
  }
  return { product: data as ProductRow };
}

export async function updateProduct(
  id: string,
  input: ProductWriteInput
): Promise<{ product: ProductRow } | { error: string }> {
  const existing = await fetchProductById(id);
  if (!existing) return { error: "Product not found." };

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!isProductKind(input.kind)) return { error: "Invalid kind." };
  if (!isQuoteLineCategory(input.category)) {
    return { error: "Invalid category." };
  }

  const quantity =
    input.kind === "service"
      ? 0
      : Math.max(0, Math.round(Number(input.quantity_on_hand) || 0));
  const lowStock = Math.max(
    0,
    Math.round(Number(input.low_stock_threshold ?? existing.low_stock_threshold) || 0)
  );
  const isActive = input.is_active ?? existing.is_active;
  const availability =
    input.kind === "service"
      ? "available"
      : input.availability_manual &&
          input.availability_status &&
          isProductAvailabilityStatus(input.availability_status)
        ? input.availability_status
        : suggestAvailabilityFromQty({
            kind: input.kind,
            quantityOnHand: quantity,
            lowStockThreshold: lowStock,
            isActive,
          });

  const slugBase = slugifyProductName(input.slug?.trim() || name);
  const slug =
    slugBase === existing.slug
      ? existing.slug
      : await ensureUniqueSlug(slugBase, id);

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .update({
      name,
      sku: normalizeSku(input.sku),
      slug,
      kind: input.kind,
      category: input.category,
      short_description: input.short_description?.trim() || null,
      description: input.description?.trim() || null,
      unit_label: input.unit_label?.trim() || "each",
      default_unit_price_cents: Math.max(
        0,
        Math.round(Number(input.default_unit_price_cents) || 0)
      ),
      is_taxable: input.is_taxable ?? true,
      image_url:
        input.image_url === undefined
          ? existing.image_url
          : input.image_url?.trim() || null,
      image_alt:
        input.image_alt === undefined
          ? existing.image_alt
          : input.image_alt?.trim() || null,
      quantity_on_hand: quantity,
      low_stock_threshold: lowStock,
      availability_status: availability,
      is_active: isActive,
      is_public: input.is_public ?? existing.is_public,
      sort_order: Math.round(
        Number(input.sort_order ?? existing.sort_order) || 0
      ),
      event_type_ids:
        input.event_type_ids === undefined
          ? existing.event_type_ids ?? []
          : input.event_type_ids.filter(
              (id) => typeof id === "string" && id.trim()
            ),
      default_color_name:
        input.default_color_name === undefined
          ? existing.default_color_name ?? null
          : input.default_color_name?.trim() || null,
      default_color_hex:
        input.default_color_hex === undefined
          ? existing.default_color_hex ?? null
          : input.default_color_hex?.trim() || null,
      configurator_mode:
        input.kind === "package"
          ? "simple"
          : input.configurator_mode === "linear_ft"
            ? "linear_ft"
            : input.configurator_mode === "simple"
              ? "simple"
              : existing.configurator_mode === "linear_ft"
                ? "linear_ft"
                : "simple",
      formula_segment_feet:
        input.kind === "package"
          ? null
          : input.formula_segment_feet === undefined
            ? existing.formula_segment_feet ?? null
            : Number(input.formula_segment_feet) > 0
              ? Number(input.formula_segment_feet)
              : null,
      full_service_product_id:
        input.full_service_product_id === undefined
          ? existing.full_service_product_id ?? null
          : input.full_service_product_id || null,
      transport_only_product_id:
        input.transport_only_product_id === undefined
          ? existing.transport_only_product_id ?? null
          : input.transport_only_product_id || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[products] updateProduct", error);
    return { error: error?.message || "Failed to update product." };
  }
  return { product: data as ProductRow };
}

export async function uploadProductImage(input: {
  productId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
  /** When false, only uploads to storage (e.g. color variant photos). */
  bindToProduct?: boolean;
  folder?: string;
}): Promise<{ imageUrl: string } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const safeName = input.fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const ext =
    safeName.includes(".")
      ? safeName.slice(safeName.lastIndexOf("."))
      : input.contentType === "image/png"
        ? ".png"
        : input.contentType === "image/webp"
          ? ".webp"
          : ".jpg";
  const folder = (input.folder || "")
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]+/g, ""))
    .filter(Boolean)
    .join("/");
  const objectPath = folder
    ? `${input.productId}/${folder}/${Date.now().toString(36)}${ext}`
    : `${input.productId}/${Date.now().toString(36)}${ext}`;

  const { error: uploadError } = await admin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, new Uint8Array(input.bytes), {
      contentType: input.contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[products] uploadProductImage", uploadError);
    return { error: uploadError.message || "Upload failed." };
  }

  const imageUrl = buildProductPublicUrl(objectPath);
  if (!imageUrl) return { error: "Could not build image URL." };

  if (input.bindToProduct === false) {
    return { imageUrl };
  }

  const { error: updateError } = await admin
    .from("products")
    .update({
      image_url: imageUrl,
      image_alt: safeName.replace(ext, "") || "Product photo",
    })
    .eq("id", input.productId);

  if (updateError) {
    console.error("[products] uploadProductImage update", updateError);
    return { error: updateError.message || "Could not save image URL." };
  }

  return { imageUrl };
}

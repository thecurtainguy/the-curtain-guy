import {
  PRODUCT_GALLERY_MAX,
  type ProductImageRow,
} from "@/data/product-images";
import {
  buildProductPublicUrl,
  PRODUCT_IMAGES_BUCKET,
  uploadProductImage,
} from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function listProductImages(input: {
  productId: string;
  colorVariantId?: string | null;
}): Promise<ProductImageRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("product_images")
    .select("*")
    .eq("product_id", input.productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (input.colorVariantId) {
    query = query.eq("color_variant_id", input.colorVariantId);
  } else {
    query = query.is("color_variant_id", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[product-images] list", error.message);
    return [];
  }
  return (data || []) as ProductImageRow[];
}

export async function listAllProductImages(
  productId: string
): Promise<ProductImageRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[product-images] listAll", error.message);
    return [];
  }
  return (data || []) as ProductImageRow[];
}

export async function listImagesForProducts(
  productIds: string[]
): Promise<ProductImageRow[]> {
  if (!productIds.length) return [];
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("product_images")
    .select("*")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[product-images] listForProducts", error.message);
    return [];
  }
  return (data || []) as ProductImageRow[];
}

async function syncPrimaryImage(input: {
  productId: string;
  colorVariantId?: string | null;
}): Promise<void> {
  const images = await listProductImages(input);
  const primary = images[0] || null;
  const admin = createAdminSupabaseClient();

  if (input.colorVariantId) {
    await admin
      .from("product_color_variants")
      .update({
        image_url: primary?.image_url ?? null,
        image_alt: primary?.image_alt ?? null,
      })
      .eq("id", input.colorVariantId)
      .eq("product_id", input.productId);
    return;
  }

  await admin
    .from("products")
    .update({
      image_url: primary?.image_url ?? null,
      image_alt: primary?.image_alt ?? null,
    })
    .eq("id", input.productId);
}

async function renumberGallery(input: {
  productId: string;
  colorVariantId?: string | null;
}): Promise<ProductImageRow[]> {
  const images = await listProductImages(input);
  const admin = createAdminSupabaseClient();
  await Promise.all(
    images.map((row, index) =>
      admin
        .from("product_images")
        .update({ sort_order: index })
        .eq("id", row.id)
    )
  );
  return listProductImages(input);
}

export async function addProductImage(input: {
  productId: string;
  colorVariantId?: string | null;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
  imageAlt?: string | null;
}): Promise<{ image: ProductImageRow } | { error: string }> {
  const existing = await listProductImages({
    productId: input.productId,
    colorVariantId: input.colorVariantId,
  });
  if (existing.length >= PRODUCT_GALLERY_MAX) {
    return {
      error: `Galleries can have at most ${PRODUCT_GALLERY_MAX} photos.`,
    };
  }

  const folder = input.colorVariantId
    ? `gallery/colors/${input.colorVariantId}`
    : "gallery";

  const uploaded = await uploadProductImage({
    productId: input.productId,
    fileName: input.fileName,
    contentType: input.contentType,
    bytes: input.bytes,
    bindToProduct: false,
    folder,
  });
  if ("error" in uploaded) return uploaded;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("product_images")
    .insert({
      product_id: input.productId,
      color_variant_id: input.colorVariantId || null,
      image_url: uploaded.imageUrl,
      image_alt: input.imageAlt?.trim() || null,
      sort_order: existing.length,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message || "Could not save gallery image." };
  }

  await syncPrimaryImage({
    productId: input.productId,
    colorVariantId: input.colorVariantId,
  });

  return { image: data as ProductImageRow };
}

export async function deleteProductImage(input: {
  productId: string;
  imageId: string;
}): Promise<{ ok: true; images: ProductImageRow[] } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: fetchError } = await admin
    .from("product_images")
    .select("*")
    .eq("id", input.imageId)
    .eq("product_id", input.productId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: fetchError?.message || "Image not found." };
  }

  const { error } = await admin
    .from("product_images")
    .delete()
    .eq("id", input.imageId)
    .eq("product_id", input.productId);

  if (error) return { error: error.message };

  const colorVariantId = (existing as ProductImageRow).color_variant_id;
  const images = await renumberGallery({
    productId: input.productId,
    colorVariantId,
  });
  await syncPrimaryImage({
    productId: input.productId,
    colorVariantId,
  });

  return { ok: true, images };
}

export async function reorderProductImages(input: {
  productId: string;
  colorVariantId?: string | null;
  imageIds: string[];
}): Promise<{ ok: true; images: ProductImageRow[] } | { error: string }> {
  const current = await listProductImages({
    productId: input.productId,
    colorVariantId: input.colorVariantId,
  });
  const allowed = new Set(current.map((row) => row.id));
  const nextIds = input.imageIds.filter((id) => allowed.has(id));
  if (nextIds.length !== current.length) {
    return { error: "Invalid gallery order." };
  }

  const admin = createAdminSupabaseClient();
  for (let index = 0; index < nextIds.length; index += 1) {
    const { error } = await admin
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", nextIds[index])
      .eq("product_id", input.productId);
    if (error) return { error: error.message };
  }

  const images = await listProductImages({
    productId: input.productId,
    colorVariantId: input.colorVariantId,
  });
  await syncPrimaryImage({
    productId: input.productId,
    colorVariantId: input.colorVariantId,
  });

  return { ok: true, images };
}

/** Ensure a remote URL exists (used only for typing/build helpers). */
export function productGalleryPublicUrl(objectPath: string): string | null {
  return buildProductPublicUrl(objectPath);
}

export { PRODUCT_IMAGES_BUCKET };

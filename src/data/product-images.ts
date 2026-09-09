export const PRODUCT_GALLERY_MAX = 8;

export type ProductImageRow = {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  color_variant_id: string | null;
  image_url: string;
  image_alt: string | null;
  sort_order: number;
};

export type ProductImageInput = {
  id?: string;
  image_url: string;
  image_alt?: string | null;
  sort_order?: number;
};

export function resolveProductGallery(input: {
  parentImages: ProductImageRow[];
  variantImages?: ProductImageRow[] | null;
  /** Legacy single URLs when gallery rows are empty. */
  fallback?: {
    imageUrl: string | null;
    imageAlt: string | null;
  } | null;
}): ProductImageRow[] {
  const variant = (input.variantImages || []).filter((row) =>
    Boolean(row.image_url?.trim())
  );
  if (variant.length) {
    return [...variant].sort((a, b) => a.sort_order - b.sort_order);
  }

  const parent = (input.parentImages || []).filter((row) =>
    Boolean(row.image_url?.trim())
  );
  if (parent.length) {
    return [...parent].sort((a, b) => a.sort_order - b.sort_order);
  }

  const fallbackUrl = input.fallback?.imageUrl?.trim() || null;
  if (!fallbackUrl) return [];

  return [
    {
      id: "fallback",
      created_at: "",
      updated_at: "",
      product_id: "",
      color_variant_id: null,
      image_url: fallbackUrl,
      image_alt: input.fallback?.imageAlt ?? null,
      sort_order: 0,
    },
  ];
}

export function galleryPrimary(
  images: ProductImageRow[]
): { imageUrl: string | null; imageAlt: string | null } {
  const first = images[0];
  if (!first?.image_url?.trim()) {
    return { imageUrl: null, imageAlt: null };
  }
  return {
    imageUrl: first.image_url.trim(),
    imageAlt: first.image_alt?.trim() || null,
  };
}

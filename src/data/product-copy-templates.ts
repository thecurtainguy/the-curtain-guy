import type { ProductColorVariantRow } from "@/data/product-colors";
import { inferBaseColorName } from "@/data/product-colors";

export type ProductCopyTag = {
  tag: string;
  label: string;
  description: string;
  example: string;
};

/** Insertable tags for short/full product copy. Clickable in admin helper. */
export const PRODUCT_COPY_TAGS: ProductCopyTag[] = [
  {
    tag: "{color}",
    label: "Color name",
    description: "Selected color (or base color on catalog cards).",
    example: "Navy",
  },
  {
    tag: "{product}",
    label: "Product name",
    description: "Parent product name as saved in Details.",
    example: "Black Velvet Drapes",
  },
];

export type ProductCopyTemplateVars = {
  color?: string | null;
  product?: string | null;
};

export function applyProductCopyTemplate(
  text: string | null | undefined,
  vars: ProductCopyTemplateVars
): string {
  if (!text) return "";
  const color = vars.color?.trim() || "";
  const product = vars.product?.trim() || "";
  return text
    .split("{color}")
    .join(color)
    .split("{product}")
    .join(product);
}

/** Resolve copy for a public product view with an optional selected color. */
export function resolveProductCopy(input: {
  text: string | null | undefined;
  productName: string;
  color?: Pick<ProductColorVariantRow, "name"> | null;
  /** When no color selected, use base color name for {color}. */
  defaultColorName?: string | null;
}): string {
  const colorName =
    input.color?.name?.trim() ||
    inferBaseColorName(input.productName, input.defaultColorName);
  return applyProductCopyTemplate(input.text, {
    color: colorName,
    product: input.productName,
  });
}

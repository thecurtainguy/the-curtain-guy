import type { ProductRow } from "@/data/products";
import {
  resolveColorUnitPriceCents,
  resolveProductDisplayImage,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import {
  evaluateProductCompleteness,
  isProductConfiguratorMode,
  segmentsForLinearFeet,
  type ProductAddonRow,
  type ProductAddonWithProduct,
  type ProductCatalogRow,
  type ProductCompleteness,
  type ProductConfiguratorMode,
  type ProductFormulaIncludeRow,
  type ProductFormulaIncludeWithProduct,
  type PublicRentalProduct,
  type RentalCartLine,
} from "@/data/rentals";
import {
  listColorVariantsForProducts,
  listProductColorVariants,
} from "@/lib/product-colors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export { evaluateProductCompleteness };

function asCatalog(row: ProductRow): ProductCatalogRow {
  const mode = row.configurator_mode;
  const configurator_mode: ProductConfiguratorMode =
    mode && isProductConfiguratorMode(mode) ? mode : "simple";
  return {
    ...row,
    configurator_mode,
    formula_segment_feet:
      typeof row.formula_segment_feet === "number"
        ? row.formula_segment_feet
        : row.formula_segment_feet
          ? Number(row.formula_segment_feet)
          : null,
    full_service_product_id: row.full_service_product_id ?? null,
    transport_only_product_id: row.transport_only_product_id ?? null,
  };
}

function productSnippet(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    category: row.category,
    unit_label: row.unit_label,
    default_unit_price_cents: row.default_unit_price_cents,
    is_taxable: row.is_taxable,
    image_url: row.image_url,
    image_alt: row.image_alt,
    is_active: row.is_active,
  };
}

export async function listFormulaIncludes(
  productId: string
): Promise<ProductFormulaIncludeWithProduct[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("product_formula_includes")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return [];

  const ids = data.map((row) => row.included_product_id as string);
  const { data: products } = await admin
    .from("products")
    .select("*")
    .in("id", ids);
  const byId = new Map(
    ((products || []) as ProductRow[]).map((p) => [p.id, p])
  );

  return (data as ProductFormulaIncludeRow[])
    .map((row) => {
      const included = byId.get(row.included_product_id);
      if (!included) return null;
      return { ...row, included: productSnippet(included) };
    })
    .filter(Boolean) as ProductFormulaIncludeWithProduct[];
}

export async function listProductAddons(
  productId: string
): Promise<ProductAddonWithProduct[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("product_addons")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return [];

  const ids = data.map((row) => row.addon_product_id as string);
  const { data: products } = await admin
    .from("products")
    .select("*")
    .in("id", ids);
  const byId = new Map(
    ((products || []) as ProductRow[]).map((p) => [p.id, p])
  );

  return (data as ProductAddonRow[])
    .map((row) => {
      const addon = byId.get(row.addon_product_id);
      if (!addon) return null;
      return { ...row, addon: productSnippet(addon) };
    })
    .filter(Boolean) as ProductAddonWithProduct[];
}

export async function replaceFormulaIncludes(input: {
  productId: string;
  includes: Array<{ includedProductId: string; qtyPerSegment: number }>;
}): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  await admin
    .from("product_formula_includes")
    .delete()
    .eq("product_id", input.productId);

  if (input.includes.length === 0) return { ok: true };

  const { error } = await admin.from("product_formula_includes").insert(
    input.includes.map((row, index) => ({
      product_id: input.productId,
      included_product_id: row.includedProductId,
      qty_per_segment: Math.max(0.01, Number(row.qtyPerSegment) || 1),
      sort_order: index,
    }))
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function replaceProductAddons(input: {
  productId: string;
  addons: Array<{ addonProductId: string; isActive?: boolean }>;
}): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  await admin.from("product_addons").delete().eq("product_id", input.productId);

  if (input.addons.length === 0) return { ok: true };

  const { error } = await admin.from("product_addons").insert(
    input.addons.map((row, index) => ({
      product_id: input.productId,
      addon_product_id: row.addonProductId,
      is_active: row.isActive !== false,
      sort_order: index,
    }))
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function fetchProductCatalogById(
  id: string
): Promise<ProductCatalogRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return asCatalog(data as ProductRow);
}

export async function fetchProductCatalogBySlug(
  slug: string
): Promise<ProductCatalogRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return asCatalog(data as ProductRow);
}

export async function loadPublicRentalProduct(
  slug: string
): Promise<PublicRentalProduct | null> {
  const product = await fetchProductCatalogBySlug(slug);
  if (!product || !product.is_active || !product.is_public) return null;

  const [includes, addons] = await Promise.all([
    listFormulaIncludes(product.id),
    listProductAddons(product.id),
  ]);

  const fullService = product.full_service_product_id
    ? await fetchProductCatalogById(product.full_service_product_id)
    : null;
  const transportOnly = product.transport_only_product_id
    ? await fetchProductCatalogById(product.transport_only_product_id)
    : null;

  const completeness = evaluateProductCompleteness({
    product,
    includes,
    addons: addons.filter((a) => a.is_active),
    fullService,
    transportOnly,
  });

  if (!completeness.readyForPublic) return null;

  const colors = await listProductColorVariants(product.id, { activeOnly: true });

  return {
    ...product,
    includes,
    addons: addons.filter((a) => a.is_active && a.addon.is_active),
    fullService,
    transportOnly,
    colors,
  };
}

export async function listPublicRentalProducts(): Promise<PublicRentalProduct[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);

  if (error || !data?.length) return [];

  const productRows = data as ProductRow[];
  const allColors = await listColorVariantsForProducts(
    productRows.map((row) => row.id)
  );
  const colorsByProduct = new Map<string, ProductColorVariantRow[]>();
  for (const color of allColors) {
    const list = colorsByProduct.get(color.product_id) || [];
    list.push(color);
    colorsByProduct.set(color.product_id, list);
  }

  const results: PublicRentalProduct[] = [];
  for (const row of productRows) {
    const product = asCatalog(row);
    const [includes, addons] = await Promise.all([
      listFormulaIncludes(product.id),
      listProductAddons(product.id),
    ]);
    const fullService = product.full_service_product_id
      ? await fetchProductCatalogById(product.full_service_product_id)
      : null;
    const transportOnly = product.transport_only_product_id
      ? await fetchProductCatalogById(product.transport_only_product_id)
      : null;
    const completeness = evaluateProductCompleteness({
      product,
      includes,
      addons,
      fullService,
      transportOnly,
    });
    if (!completeness.readyForPublic) continue;
    results.push({
      ...product,
      includes,
      addons: addons.filter((a) => a.is_active && a.addon.is_active),
      fullService,
      transportOnly,
      colors: colorsByProduct.get(product.id) || [],
    });
  }
  return results;
}

export async function getAdminProductRentalsBundle(productId: string) {
  const product = await fetchProductCatalogById(productId);
  if (!product) return null;
  const [includes, addons, colors] = await Promise.all([
    listFormulaIncludes(productId),
    listProductAddons(productId),
    listProductColorVariants(productId),
  ]);
  const fullService = product.full_service_product_id
    ? await fetchProductCatalogById(product.full_service_product_id)
    : null;
  const transportOnly = product.transport_only_product_id
    ? await fetchProductCatalogById(product.transport_only_product_id)
    : null;
  const completeness = evaluateProductCompleteness({
    product,
    includes,
    addons,
    fullService,
    transportOnly,
  });
  return {
    product,
    includes,
    addons,
    colors,
    fullService,
    transportOnly,
    completeness,
  };
}

export type AdminProductRentalsBundle = NonNullable<
  Awaited<ReturnType<typeof getAdminProductRentalsBundle>>
>;

/** Batch completeness for admin inventory list (< ~500 products). */
export async function mapProductsCompleteness(
  products: ProductRow[]
): Promise<Map<string, ProductCompleteness>> {
  const result = new Map<string, ProductCompleteness>();
  if (!products.length) return result;

  const admin = createAdminSupabaseClient();
  const ids = products.map((p) => p.id);
  const byId = new Map(products.map((p) => [p.id, asCatalog(p)]));

  const [{ data: includesData }, { data: addonsData }] = await Promise.all([
    admin.from("product_formula_includes").select("*").in("product_id", ids),
    admin.from("product_addons").select("*").in("product_id", ids),
  ]);

  const includesByProduct = new Map<string, ProductFormulaIncludeWithProduct[]>();
  const addonsByProduct = new Map<string, ProductAddonWithProduct[]>();

  for (const raw of (includesData || []) as ProductFormulaIncludeRow[]) {
    const included = byId.get(raw.included_product_id);
    if (!included) continue;
    const list = includesByProduct.get(raw.product_id) || [];
    list.push({ ...raw, included: productSnippet(included) });
    includesByProduct.set(raw.product_id, list);
  }

  for (const raw of (addonsData || []) as ProductAddonRow[]) {
    const addon = byId.get(raw.addon_product_id);
    if (!addon) continue;
    const list = addonsByProduct.get(raw.product_id) || [];
    list.push({ ...raw, addon: productSnippet(addon) });
    addonsByProduct.set(raw.product_id, list);
  }

  for (const row of products) {
    const product = byId.get(row.id)!;
    const includes = (includesByProduct.get(row.id) || []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const addons = (addonsByProduct.get(row.id) || []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const fullService = product.full_service_product_id
      ? byId.get(product.full_service_product_id) || null
      : null;
    const transportOnly = product.transport_only_product_id
      ? byId.get(product.transport_only_product_id) || null
      : null;
    result.set(
      row.id,
      evaluateProductCompleteness({
        product,
        includes,
        addons,
        fullService,
        transportOnly,
      })
    );
  }

  return result;
}

export function buildLinearFtCartLines(input: {
  product: PublicRentalProduct;
  linearFeet: number;
  fullServiceEnabled: boolean;
  transportOnlyEnabled: boolean;
  addonSelections: Array<{ addonProductId: string; quantity: number }>;
  color?: ProductColorVariantRow | null;
}): RentalCartLine[] {
  const feet = Math.max(0, Number(input.linearFeet) || 0);
  const segment = Number(input.product.formula_segment_feet) || 0;
  const segments = segmentsForLinearFeet(feet, segment);
  const color = input.color || null;
  const display = resolveProductDisplayImage({
    productImageUrl: input.product.image_url,
    productImageAlt: input.product.image_alt,
    color,
  });
  const unitPriceCents = resolveColorUnitPriceCents({
    productPriceCents: input.product.default_unit_price_cents,
    color,
  });
  const parentKey = color
    ? `main:${input.product.id}:${color.id}:${feet}`
    : `main:${input.product.id}:${feet}`;
  const lines: RentalCartLine[] = [
    {
      key: parentKey,
      productId: input.product.id,
      slug: input.product.slug,
      name: input.product.name,
      description: color
        ? `${feet} linear ft · ${input.product.name} · ${color.name}`
        : `${feet} linear ft · ${input.product.name}`,
      category: String(input.product.category),
      kind: input.product.kind,
      lineKind: "main",
      imageUrl: display.imageUrl,
      imageAlt: display.imageAlt,
      quantity: feet,
      unitPriceCents,
      unitLabel: "linear ft",
      isTaxable: input.product.is_taxable,
      linearFeet: feet,
      colorId: color?.id ?? null,
      colorName: color?.name ?? null,
      colorHex: color?.hex ?? null,
    },
  ];

  for (const include of input.product.includes) {
    const qty = segments * Number(include.qty_per_segment || 0);
    if (!(qty > 0)) continue;
    lines.push({
      key: `include:${parentKey}:${include.included_product_id}`,
      productId: include.included_product_id,
      slug: include.included.slug,
      name: include.included.name,
      description: `Included · ${include.included.name}`,
      category: String(include.included.category),
      kind: include.included.kind,
      lineKind: "include",
      imageUrl: include.included.image_url,
      imageAlt: include.included.image_alt,
      quantity: qty,
      unitPriceCents: 0,
      unitLabel: include.included.unit_label,
      isTaxable: false,
      parentKey,
    });
  }

  for (const selection of input.addonSelections) {
    if (!(selection.quantity > 0)) continue;
    const addon = input.product.addons.find(
      (row) => row.addon_product_id === selection.addonProductId
    );
    if (!addon) continue;
    lines.push({
      key: `addon:${parentKey}:${addon.addon_product_id}`,
      productId: addon.addon_product_id,
      slug: addon.addon.slug,
      name: addon.addon.name,
      description: `Add-on · ${addon.addon.name}`,
      category: String(addon.addon.category),
      kind: addon.addon.kind,
      lineKind: "addon",
      imageUrl: addon.addon.image_url,
      imageAlt: addon.addon.image_alt,
      quantity: selection.quantity,
      unitPriceCents: addon.addon.default_unit_price_cents,
      unitLabel: addon.addon.unit_label,
      isTaxable: addon.addon.is_taxable,
      parentKey,
    });
  }

  if (input.fullServiceEnabled && input.product.fullService) {
    const service = input.product.fullService;
    lines.push({
      key: `service:full:${parentKey}`,
      productId: service.id,
      slug: service.slug,
      name: service.name,
      description: service.name,
      category: String(service.category),
      kind: service.kind,
      lineKind: "service",
      imageUrl: service.image_url,
      imageAlt: service.image_alt,
      quantity: 1,
      unitPriceCents: service.default_unit_price_cents,
      unitLabel: service.unit_label,
      isTaxable: service.is_taxable,
      parentKey,
    });
  } else if (input.transportOnlyEnabled && input.product.transportOnly) {
    const service = input.product.transportOnly;
    lines.push({
      key: `service:transport:${parentKey}`,
      productId: service.id,
      slug: service.slug,
      name: service.name,
      description: service.name,
      category: String(service.category),
      kind: service.kind,
      lineKind: "service",
      imageUrl: service.image_url,
      imageAlt: service.image_alt,
      quantity: 1,
      unitPriceCents: service.default_unit_price_cents,
      unitLabel: service.unit_label,
      isTaxable: service.is_taxable,
      parentKey,
    });
  }

  return lines;
}

export function buildSimpleCartLines(input: {
  product: PublicRentalProduct;
  quantity: number;
  fullServiceEnabled: boolean;
  transportOnlyEnabled: boolean;
  addonSelections: Array<{ addonProductId: string; quantity: number }>;
  color?: ProductColorVariantRow | null;
}): RentalCartLine[] {
  const qty = Math.max(1, Math.round(Number(input.quantity) || 1));
  const color = input.color || null;
  const display = resolveProductDisplayImage({
    productImageUrl: input.product.image_url,
    productImageAlt: input.product.image_alt,
    color,
  });
  const unitPriceCents = resolveColorUnitPriceCents({
    productPriceCents: input.product.default_unit_price_cents,
    color,
  });
  const parentKey = color
    ? `main:${input.product.id}:${color.id}:qty:${qty}:${Date.now().toString(36)}`
    : `main:${input.product.id}:qty:${qty}:${Date.now().toString(36)}`;
  const lines: RentalCartLine[] = [
    {
      key: parentKey,
      productId: input.product.id,
      slug: input.product.slug,
      name: input.product.name,
      description: color
        ? `${input.product.name} · ${color.name}`
        : input.product.name,
      category: String(input.product.category),
      kind: input.product.kind,
      lineKind: "main",
      imageUrl: display.imageUrl,
      imageAlt: display.imageAlt,
      quantity: qty,
      unitPriceCents,
      unitLabel: input.product.unit_label,
      isTaxable: input.product.is_taxable,
      colorId: color?.id ?? null,
      colorName: color?.name ?? null,
      colorHex: color?.hex ?? null,
    },
  ];

  for (const selection of input.addonSelections) {
    if (!(selection.quantity > 0)) continue;
    const addon = input.product.addons.find(
      (row) => row.addon_product_id === selection.addonProductId
    );
    if (!addon) continue;
    lines.push({
      key: `addon:${parentKey}:${addon.addon_product_id}`,
      productId: addon.addon_product_id,
      slug: addon.addon.slug,
      name: addon.addon.name,
      description: `Add-on · ${addon.addon.name}`,
      category: String(addon.addon.category),
      kind: addon.addon.kind,
      lineKind: "addon",
      imageUrl: addon.addon.image_url,
      imageAlt: addon.addon.image_alt,
      quantity: selection.quantity,
      unitPriceCents: addon.addon.default_unit_price_cents,
      unitLabel: addon.addon.unit_label,
      isTaxable: addon.addon.is_taxable,
      parentKey,
    });
  }

  if (
    input.product.fullService &&
    input.product.transportOnly &&
    (input.fullServiceEnabled || input.transportOnlyEnabled)
  ) {
    if (input.fullServiceEnabled) {
      const service = input.product.fullService;
      lines.push({
        key: `service:full:${parentKey}`,
        productId: service.id,
        slug: service.slug,
        name: service.name,
        description: service.name,
        category: String(service.category),
        kind: service.kind,
        lineKind: "service",
        imageUrl: service.image_url,
        imageAlt: service.image_alt,
        quantity: 1,
        unitPriceCents: service.default_unit_price_cents,
        unitLabel: service.unit_label,
        isTaxable: service.is_taxable,
        parentKey,
      });
    } else if (input.transportOnlyEnabled) {
      const service = input.product.transportOnly;
      lines.push({
        key: `service:transport:${parentKey}`,
        productId: service.id,
        slug: service.slug,
        name: service.name,
        description: service.name,
        category: String(service.category),
        kind: service.kind,
        lineKind: "service",
        imageUrl: service.image_url,
        imageAlt: service.image_alt,
        quantity: 1,
        unitPriceCents: service.default_unit_price_cents,
        unitLabel: service.unit_label,
        isTaxable: service.is_taxable,
        parentKey,
      });
    }
  }

  return lines;
}

export function cartSubtotalCents(lines: RentalCartLine[]): number {
  return lines.reduce(
    (sum, line) => sum + Math.round(line.quantity * line.unitPriceCents),
    0
  );
}

export type { ProductConfiguratorMode };

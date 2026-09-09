import type { ProductRow } from "@/data/products";
import {
  resolveColorUnitPriceCents,
  resolveProductDisplayImage,
  resolveProductDisplayTitle,
  isProductBaseColorId,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import {
  compareProductsBeforeServices,
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
  type ProductPackageComponentRow,
  type ProductPackageComponentWithProduct,
  type PublicRentalProduct,
  type RentalCartLine,
} from "@/data/rentals";
import {
  listAllProductImages,
  listImagesForProducts,
} from "@/lib/product-images";
import {
  listColorVariantsForProducts,
  listProductColorVariants,
} from "@/lib/product-colors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ProductImageRow } from "@/data/product-images";
import {
  DEFAULT_PACKAGE_LOGISTICS_ZONE_ID,
  isPackageIncludedLogisticsMode,
} from "@/data/rentals-logistics";

export { evaluateProductCompleteness };

function attachColorImages(
  colors: ProductColorVariantRow[],
  allImages: ProductImageRow[]
): ProductColorVariantRow[] {
  return colors.map((color) => ({
    ...color,
    images: allImages.filter((row) => row.color_variant_id === color.id),
  }));
}

function parentImagesOnly(allImages: ProductImageRow[]): ProductImageRow[] {
  return allImages.filter((row) => !row.color_variant_id);
}

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
    included_logistics_mode:
      row.included_logistics_mode === "full_service" ||
      row.included_logistics_mode === "transport_only"
        ? row.included_logistics_mode
        : null,
    included_logistics_zone_id: row.included_logistics_zone_id ?? null,
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

export async function listPackageComponents(
  packageProductId: string
): Promise<ProductPackageComponentWithProduct[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("product_package_components")
    .select("*")
    .eq("package_product_id", packageProductId)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return [];

  const ids = data.map((row) => row.component_product_id as string);
  const { data: products } = await admin
    .from("products")
    .select("*")
    .in("id", ids);
  const byId = new Map(
    ((products || []) as ProductRow[]).map((p) => [p.id, p])
  );

  return (data as ProductPackageComponentRow[])
    .map((row) => {
      const component = byId.get(row.component_product_id);
      if (!component) return null;
      return { ...row, component: productSnippet(component) };
    })
    .filter(Boolean) as ProductPackageComponentWithProduct[];
}

export async function replacePackageComponents(input: {
  packageProductId: string;
  components: Array<{ componentProductId: string; quantity: number }>;
}): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();

  const componentIds = input.components.map((row) => row.componentProductId);
  if (componentIds.includes(input.packageProductId)) {
    return { error: "A package cannot include itself." };
  }

  if (componentIds.length > 0) {
    const { data: components, error: lookupError } = await admin
      .from("products")
      .select("id, kind")
      .in("id", componentIds);
    if (lookupError) return { error: lookupError.message };
    const byId = new Map(
      ((components || []) as Array<{ id: string; kind: string }>).map((row) => [
        row.id,
        row.kind,
      ])
    );
    for (const id of componentIds) {
      const kind = byId.get(id);
      if (!kind) return { error: "One or more package components were not found." };
      if (kind === "package") {
        return { error: "Packages cannot include other packages." };
      }
      if (kind !== "product" && kind !== "service") {
        return { error: "Package components must be products or services." };
      }
    }
  }

  await admin
    .from("product_package_components")
    .delete()
    .eq("package_product_id", input.packageProductId);

  if (input.components.length === 0) return { ok: true };

  const { error } = await admin.from("product_package_components").insert(
    input.components.map((row, index) => ({
      package_product_id: input.packageProductId,
      component_product_id: row.componentProductId,
      quantity: Math.max(0.01, Number(row.quantity) || 1),
      sort_order: index,
    }))
  );
  if (error) return { error: error.message };
  return { ok: true };
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

  const [includes, packageComponents, addons, allImages] = await Promise.all([
    listFormulaIncludes(product.id),
    listPackageComponents(product.id),
    listProductAddons(product.id),
    listAllProductImages(product.id),
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
    packageComponents,
    addons: addons.filter((a) => a.is_active),
    fullService,
    transportOnly,
  });

  if (!completeness.readyForPublic) return null;

  const colors = await listProductColorVariants(product.id, { activeOnly: true });

  return {
    ...product,
    includes,
    packageComponents,
    addons: addons.filter((a) => a.is_active && a.addon.is_active),
    fullService,
    transportOnly,
    colors: attachColorImages(colors, allImages),
    images: parentImagesOnly(allImages),
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
  const productIds = productRows.map((row) => row.id);
  const [allColors, allImages] = await Promise.all([
    listColorVariantsForProducts(productIds),
    listImagesForProducts(productIds),
  ]);
  const colorsByProduct = new Map<string, ProductColorVariantRow[]>();
  for (const color of allColors) {
    const list = colorsByProduct.get(color.product_id) || [];
    list.push(color);
    colorsByProduct.set(color.product_id, list);
  }
  const imagesByProduct = new Map<string, ProductImageRow[]>();
  for (const image of allImages) {
    const list = imagesByProduct.get(image.product_id) || [];
    list.push(image);
    imagesByProduct.set(image.product_id, list);
  }

  const results: PublicRentalProduct[] = [];
  for (const row of productRows) {
    // Services are logistics SKUs — not catalog listings.
    if (row.kind === "service") continue;
    const product = asCatalog(row);
    const [includes, packageComponents, addons] = await Promise.all([
      listFormulaIncludes(product.id),
      listPackageComponents(product.id),
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
      packageComponents,
      addons,
      fullService,
      transportOnly,
    });
    if (!completeness.readyForPublic) continue;
    const productImages = imagesByProduct.get(product.id) || [];
    results.push({
      ...product,
      includes,
      packageComponents,
      addons: addons.filter((a) => a.is_active && a.addon.is_active),
      fullService,
      transportOnly,
      colors: attachColorImages(
        colorsByProduct.get(product.id) || [],
        productImages
      ),
      images: parentImagesOnly(productImages),
    });
  }
  return results;
}

export async function getAdminProductRentalsBundle(productId: string) {
  const product = await fetchProductCatalogById(productId);
  if (!product) return null;
  const [includes, packageComponents, addons, colors] = await Promise.all([
    listFormulaIncludes(productId),
    listPackageComponents(productId),
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
    packageComponents,
    addons,
    fullService,
    transportOnly,
  });
  return {
    product,
    includes,
    packageComponents,
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

  const [{ data: includesData }, { data: addonsData }, { data: packageData }] =
    await Promise.all([
      admin.from("product_formula_includes").select("*").in("product_id", ids),
      admin.from("product_addons").select("*").in("product_id", ids),
      admin
        .from("product_package_components")
        .select("*")
        .in("package_product_id", ids),
    ]);

  const includesByProduct = new Map<string, ProductFormulaIncludeWithProduct[]>();
  const addonsByProduct = new Map<string, ProductAddonWithProduct[]>();
  const packageByProduct = new Map<
    string,
    ProductPackageComponentWithProduct[]
  >();

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

  for (const raw of (packageData || []) as ProductPackageComponentRow[]) {
    const component = byId.get(raw.component_product_id);
    if (!component) continue;
    const list = packageByProduct.get(raw.package_product_id) || [];
    list.push({ ...raw, component: productSnippet(component) });
    packageByProduct.set(raw.package_product_id, list);
  }

  for (const row of products) {
    const product = byId.get(row.id)!;
    const includes = (includesByProduct.get(row.id) || []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const addons = (addonsByProduct.get(row.id) || []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const packageComponents = (packageByProduct.get(row.id) || []).sort(
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
        packageComponents,
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
  const displayTitle = resolveProductDisplayTitle({
    productName: input.product.name,
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
      name: displayTitle,
      description: color
        ? `${feet} linear ft · ${displayTitle}`
        : `${feet} linear ft · ${displayTitle}`,
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
      colorId:
        color && !isProductBaseColorId(color.id) ? color.id : null,
      colorName: color?.name ?? null,
      colorHex: color?.hex ?? null,
    },
  ];

  const orderedIncludes = [...input.product.includes].sort((a, b) => {
    const byKind = compareProductsBeforeServices(
      a.included.kind,
      b.included.kind
    );
    if (byKind !== 0) return byKind;
    return a.sort_order - b.sort_order;
  });
  for (const include of orderedIncludes) {
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
  const displayTitle = resolveProductDisplayTitle({
    productName: input.product.name,
    color,
  });
  const parentKey = color
    ? `main:${input.product.id}:${color.id}:qty:${qty}:${Date.now().toString(36)}`
    : `main:${input.product.id}:qty:${qty}:${Date.now().toString(36)}`;
  const includedLogisticsMode =
    input.product.kind === "package" &&
    isPackageIncludedLogisticsMode(input.product.included_logistics_mode)
      ? input.product.included_logistics_mode
      : null;
  const includedLogisticsZoneId = includedLogisticsMode
    ? input.product.included_logistics_zone_id?.trim() ||
      DEFAULT_PACKAGE_LOGISTICS_ZONE_ID
    : null;
  const lines: RentalCartLine[] = [
    {
      key: parentKey,
      productId: input.product.id,
      slug: input.product.slug,
      name: displayTitle,
      description: displayTitle,
      category: String(input.product.category),
      kind: input.product.kind,
      lineKind: "main",
      imageUrl: display.imageUrl,
      imageAlt: display.imageAlt,
      quantity: qty,
      unitPriceCents,
      unitLabel: input.product.unit_label,
      isTaxable: input.product.is_taxable,
      colorId:
        color && !isProductBaseColorId(color.id) ? color.id : null,
      colorName: color?.name ?? null,
      colorHex: color?.hex ?? null,
      includedLogisticsMode,
      includedLogisticsZoneId,
    },
  ];

  if (input.product.kind === "package") {
    const orderedComponents = [...input.product.packageComponents]
      .filter((row) => row.component.kind !== "service")
      .sort((a, b) => {
        const byKind = compareProductsBeforeServices(
          a.component.kind,
          b.component.kind
        );
        if (byKind !== 0) return byKind;
        return a.sort_order - b.sort_order;
      });
    for (const row of orderedComponents) {
      const componentQty = qty * Number(row.quantity || 0);
      if (!(componentQty > 0)) continue;
      lines.push({
        key: `include:${parentKey}:${row.component_product_id}`,
        productId: row.component_product_id,
        slug: row.component.slug,
        name: row.component.name,
        description: `Included · ${row.component.name}`,
        category: String(row.component.category),
        kind: row.component.kind,
        lineKind: "include",
        imageUrl: row.component.image_url,
        imageAlt: row.component.image_alt,
        quantity: componentQty,
        unitPriceCents: 0,
        unitLabel: row.component.unit_label,
        isTaxable: false,
        parentKey,
      });
    }
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

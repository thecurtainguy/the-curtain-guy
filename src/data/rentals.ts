import type { ProductColorVariantRow } from "@/data/product-colors";
import type { ProductImageRow } from "@/data/product-images";
import type { ProductKind, ProductRow } from "@/data/products";

export const PRODUCT_CONFIGURATOR_MODES = ["simple", "linear_ft"] as const;
export type ProductConfiguratorMode =
  (typeof PRODUCT_CONFIGURATOR_MODES)[number];

export const PRODUCT_CONFIGURATOR_MODE_LABELS: Record<
  ProductConfiguratorMode,
  string
> = {
  simple: "Simple (qty only)",
  linear_ft: "Wall-to-wall (linear ft formula)",
};

export function isProductConfiguratorMode(
  value: string
): value is ProductConfiguratorMode {
  return (PRODUCT_CONFIGURATOR_MODES as readonly string[]).includes(value);
}

export type ProductFormulaIncludeRow = {
  id: string;
  created_at: string;
  product_id: string;
  included_product_id: string;
  qty_per_segment: number;
  sort_order: number;
};

export type ProductAddonRow = {
  id: string;
  created_at: string;
  product_id: string;
  addon_product_id: string;
  sort_order: number;
  is_active: boolean;
};

export type ProductFormulaIncludeWithProduct = ProductFormulaIncludeRow & {
  included: Pick<
    ProductRow,
    | "id"
    | "name"
    | "slug"
    | "kind"
    | "category"
    | "unit_label"
    | "default_unit_price_cents"
    | "is_taxable"
    | "image_url"
    | "image_alt"
    | "is_active"
  >;
};

export type ProductAddonWithProduct = ProductAddonRow & {
  addon: Pick<
    ProductRow,
    | "id"
    | "name"
    | "slug"
    | "kind"
    | "category"
    | "unit_label"
    | "default_unit_price_cents"
    | "is_taxable"
    | "image_url"
    | "image_alt"
    | "is_active"
  >;
};

export type ProductPackageComponentRow = {
  id: string;
  created_at: string;
  package_product_id: string;
  component_product_id: string;
  quantity: number;
  sort_order: number;
};

export type ProductPackageComponentWithProduct = ProductPackageComponentRow & {
  component: Pick<
    ProductRow,
    | "id"
    | "name"
    | "slug"
    | "kind"
    | "category"
    | "unit_label"
    | "default_unit_price_cents"
    | "is_taxable"
    | "image_url"
    | "image_alt"
    | "is_active"
  >;
};

/** Product row extended with rentals configurator columns. */
export type ProductCatalogRow = ProductRow & {
  configurator_mode: ProductConfiguratorMode;
  formula_segment_feet: number | null;
  full_service_product_id: string | null;
  transport_only_product_id: string | null;
  included_logistics_mode: "full_service" | "transport_only" | null;
  included_logistics_zone_id: string | null;
};

export type ProductCompletenessIssue = {
  code:
    | "inactive"
    | "missing_photo"
    | "missing_price"
    | "missing_segment"
    | "missing_includes"
    | "missing_package_components"
    | "missing_full_service"
    | "missing_transport_only"
    | "broken_full_service"
    | "broken_transport_only"
    | "inactive_include"
    | "inactive_package_component"
    | "inactive_addon";
  message: string;
  severity: "error" | "warning";
};

export type ProductCompleteness = {
  readyForPublic: boolean;
  issues: ProductCompletenessIssue[];
};

export function evaluateProductCompleteness(input: {
  product: ProductCatalogRow;
  includes: ProductFormulaIncludeWithProduct[];
  packageComponents?: ProductPackageComponentWithProduct[];
  addons?: ProductAddonWithProduct[];
  fullService: ProductCatalogRow | null;
  transportOnly: ProductCatalogRow | null;
}): ProductCompleteness {
  const issues: ProductCompletenessIssue[] = [];

  if (!input.product.is_active) {
    issues.push({
      code: "inactive",
      message: "Item is inactive.",
      severity: "error",
    });
  }

  if (!input.product.image_url?.trim()) {
    issues.push({
      code: "missing_photo",
      message: "Photo is required for public Rentals.",
      severity: "error",
    });
  }

  if (!(input.product.default_unit_price_cents > 0)) {
    issues.push({
      code: "missing_price",
      message: "Default price must be greater than $0.",
      severity: "error",
    });
  }

  if (input.product.kind === "package") {
    const components = input.packageComponents || [];
    if (components.length === 0) {
      issues.push({
        code: "missing_package_components",
        message: "Add at least one package component from inventory.",
        severity: "error",
      });
    }
    for (const row of components) {
      if (!row.component.is_active) {
        issues.push({
          code: "inactive_package_component",
          message: `Package component “${row.component.name}” is inactive.`,
          severity: "warning",
        });
      }
    }
  } else if (input.product.configurator_mode === "linear_ft") {
    if (!(Number(input.product.formula_segment_feet) > 0)) {
      issues.push({
        code: "missing_segment",
        message: "Formula segment (feet) is required.",
        severity: "error",
      });
    }
    if (input.includes.length === 0) {
      issues.push({
        code: "missing_includes",
        message: "Add at least one included component (bases, poles, etc.).",
        severity: "error",
      });
    }
    for (const include of input.includes) {
      if (!include.included.is_active) {
        issues.push({
          code: "inactive_include",
          message: `Included item “${include.included.name}” is inactive.`,
          severity: "warning",
        });
      }
    }
    // Product-linked full/transport services are optional — public logistics
    // is cart-level by delivery zone (see rentals-logistics.ts).
    if (!input.product.full_service_product_id) {
      issues.push({
        code: "missing_full_service",
        message:
          "Optional: link a Full service SKU for admin reference (public cart uses zone pricing).",
        severity: "warning",
      });
    } else if (!input.fullService) {
      issues.push({
        code: "broken_full_service",
        message: "Full service link is broken.",
        severity: "warning",
      });
    } else if (!input.fullService.is_active) {
      issues.push({
        code: "broken_full_service",
        message: "Linked Full service item is inactive.",
        severity: "warning",
      });
    }

    if (!input.product.transport_only_product_id) {
      issues.push({
        code: "missing_transport_only",
        message:
          "Optional: link a Transport only SKU for admin reference (public cart uses zone pricing).",
        severity: "warning",
      });
    } else if (!input.transportOnly) {
      issues.push({
        code: "broken_transport_only",
        message: "Transport only link is broken.",
        severity: "warning",
      });
    } else if (!input.transportOnly.is_active) {
      issues.push({
        code: "broken_transport_only",
        message: "Linked Transport only item is inactive.",
        severity: "warning",
      });
    }
  }

  for (const addon of input.addons || []) {
    if (addon.is_active && !addon.addon.is_active) {
      issues.push({
        code: "inactive_addon",
        message: `Addon “${addon.addon.name}” is inactive.`,
        severity: "warning",
      });
    }
  }

  const readyForPublic = !issues.some((issue) => issue.severity === "error");

  return { readyForPublic, issues };
}

export type PublicRentalProduct = ProductCatalogRow & {
  includes: ProductFormulaIncludeWithProduct[];
  packageComponents: ProductPackageComponentWithProduct[];
  addons: ProductAddonWithProduct[];
  fullService: ProductCatalogRow | null;
  transportOnly: ProductCatalogRow | null;
  colors: ProductColorVariantRow[];
  /** Parent/base gallery (color_variant_id null). */
  images: ProductImageRow[];
};

export type RentalCartLineKind = "main" | "include" | "addon" | "service";

export type RentalCartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  kind: ProductKind;
  lineKind: RentalCartLineKind;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  unitPriceCents: number;
  unitLabel: string;
  isTaxable: boolean;
  parentKey?: string;
  linearFeet?: number;
  colorId?: string | null;
  colorName?: string | null;
  colorHex?: string | null;
  /** Package main lines: logistics mode prepaid in package price. */
  includedLogisticsMode?: "full_service" | "transport_only" | null;
  includedLogisticsZoneId?: string | null;
};

export type RentalCartSnapshot = {
  version: 1;
  lines: RentalCartLine[];
  fullServiceEnabled: boolean;
  transportOnlyEnabled: boolean;
  updatedAt: string;
};

/** Products first; transport/install services last. */
export function compareProductsBeforeServices(
  aKind: string,
  bKind: string
): number {
  const aService = aKind === "service" ? 1 : 0;
  const bService = bKind === "service" ? 1 : 0;
  return aService - bService;
}

export function groupRentalCartLines(lines: RentalCartLine[]) {
  const mains = lines.filter((line) => line.lineKind === "main");
  return mains.map((main) => ({
    main,
    children: lines
      .filter((line) => line.parentKey === main.key)
      .sort((a, b) => compareProductsBeforeServices(a.kind, b.kind)),
  }));
}

export function segmentsForLinearFeet(
  linearFeet: number,
  segmentFeet: number
): number {
  if (!(linearFeet > 0) || !(segmentFeet > 0)) return 0;
  return Math.ceil(linearFeet / segmentFeet);
}

export function formatCadFromCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format((Number(cents) || 0) / 100);
}

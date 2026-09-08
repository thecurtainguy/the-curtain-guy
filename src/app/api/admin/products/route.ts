import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createProduct, listProducts } from "@/lib/products";
import {
  isProductAvailabilityStatus,
  isProductKind,
} from "@/data/products";
import { isQuoteLineCategory } from "@/data/quotes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const kindRaw = url.searchParams.get("kind");
  const availabilityRaw = url.searchParams.get("availability");
  const activeOnly = url.searchParams.get("activeOnly") === "1";

  const products = await listProducts({
    kind: kindRaw && isProductKind(kindRaw) ? kindRaw : null,
    availability:
      availabilityRaw && isProductAvailabilityStatus(availabilityRaw)
        ? availabilityRaw
        : null,
    activeOnly,
  });

  return NextResponse.json({ ok: true, products });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const kind = String(body.kind || "product");
  const category = String(body.category || "custom");
  if (!isProductKind(kind)) {
    return NextResponse.json(
      { ok: false, message: "Invalid kind." },
      { status: 400 }
    );
  }
  if (!isQuoteLineCategory(category)) {
    return NextResponse.json(
      { ok: false, message: "Invalid category." },
      { status: 400 }
    );
  }

  const result = await createProduct({
    name: String(body.name || ""),
    sku: typeof body.sku === "string" ? body.sku : null,
    slug: typeof body.slug === "string" ? body.slug : null,
    kind,
    category,
    short_description:
      typeof body.short_description === "string"
        ? body.short_description
        : null,
    description:
      typeof body.description === "string" ? body.description : null,
    unit_label:
      typeof body.unit_label === "string" ? body.unit_label : "each",
    default_unit_price_cents: Math.round(
      Number(body.default_unit_price_cents) || 0
    ),
    is_taxable:
      typeof body.is_taxable === "boolean" ? body.is_taxable : true,
    image_url: typeof body.image_url === "string" ? body.image_url : null,
    image_alt: typeof body.image_alt === "string" ? body.image_alt : null,
    quantity_on_hand: Math.round(Number(body.quantity_on_hand) || 0),
    low_stock_threshold: Math.round(Number(body.low_stock_threshold) || 2),
    availability_status:
      typeof body.availability_status === "string" &&
      isProductAvailabilityStatus(body.availability_status)
        ? body.availability_status
        : undefined,
    availability_manual: body.availability_manual === true,
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    is_public: typeof body.is_public === "boolean" ? body.is_public : false,
    sort_order: Math.round(Number(body.sort_order) || 0),
    configurator_mode:
      body.configurator_mode === "linear_ft" || body.configurator_mode === "simple"
        ? body.configurator_mode
        : "simple",
    formula_segment_feet:
      body.formula_segment_feet === null
        ? null
        : body.formula_segment_feet !== undefined
          ? Number(body.formula_segment_feet)
          : null,
    full_service_product_id:
      body.full_service_product_id === null
        ? null
        : typeof body.full_service_product_id === "string"
          ? body.full_service_product_id
          : null,
    transport_only_product_id:
      body.transport_only_product_id === null
        ? null
        : typeof body.transport_only_product_id === "string"
          ? body.transport_only_product_id
          : null,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  if (Array.isArray(body.formula_includes) || Array.isArray(body.addons)) {
    const { replaceFormulaIncludes, replaceProductAddons } = await import(
      "@/lib/rentals"
    );
    if (Array.isArray(body.formula_includes)) {
      const includes = body.formula_includes as Array<Record<string, unknown>>;
      await replaceFormulaIncludes({
        productId: result.product.id,
        includes: includes
          .map((row) => ({
            includedProductId: String(
              row.includedProductId || row.included_product_id || ""
            ),
            qtyPerSegment:
              Number(row.qtyPerSegment ?? row.qty_per_segment) || 1,
          }))
          .filter((row) => row.includedProductId),
      });
    }
    if (Array.isArray(body.addons)) {
      const addons = body.addons as Array<Record<string, unknown>>;
      await replaceProductAddons({
        productId: result.product.id,
        addons: addons
          .map((row) => ({
            addonProductId: String(
              row.addonProductId || row.addon_product_id || ""
            ),
            isActive: row.isActive !== false && row.is_active !== false,
          }))
          .filter((row) => row.addonProductId),
      });
    }
  }

  return NextResponse.json({ ok: true, product: result.product });
}

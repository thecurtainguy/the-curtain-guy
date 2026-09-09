import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchProductById } from "@/lib/products";
import {
  listProductColorVariants,
  replaceProductColorVariants,
} from "@/lib/product-colors";
import type { ProductColorVariantInput } from "@/data/product-colors";
import { isProductAvailabilityStatus } from "@/data/products";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseVariants(raw: unknown): ProductColorVariantInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const name = String(item.name || "").trim();
      if (!name) return null;
      const availability =
        typeof item.availability_status === "string" &&
        isProductAvailabilityStatus(item.availability_status)
          ? item.availability_status
          : null;
      return {
        id: typeof item.id === "string" ? item.id : undefined,
        name,
        hex: String(item.hex || "#8B909A"),
        sort_order: Math.round(Number(item.sort_order) || 0),
        is_active: item.is_active !== false,
        image_url:
          item.image_url === null
            ? null
            : typeof item.image_url === "string"
              ? item.image_url
              : null,
        image_alt:
          item.image_alt === null
            ? null
            : typeof item.image_alt === "string"
              ? item.image_alt
              : null,
        has_own_pricing: item.has_own_pricing === true,
        unit_price_cents:
          item.unit_price_cents === null || item.unit_price_cents === undefined
            ? null
            : Math.round(Number(item.unit_price_cents) || 0),
        quantity_on_hand:
          item.quantity_on_hand === null || item.quantity_on_hand === undefined
            ? null
            : Math.round(Number(item.quantity_on_hand) || 0),
        availability_status: availability,
      } satisfies ProductColorVariantInput;
    })
    .filter(Boolean) as ProductColorVariantInput[];
}

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const product = await fetchProductById(id);
  if (!product) {
    return NextResponse.json(
      { ok: false, message: "Product not found." },
      { status: 404 }
    );
  }

  const variants = await listProductColorVariants(id);
  return NextResponse.json({ ok: true, variants });
}

export async function PUT(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const product = await fetchProductById(id);
  if (!product) {
    return NextResponse.json(
      { ok: false, message: "Product not found." },
      { status: 404 }
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

  const result = await replaceProductColorVariants({
    productId: id,
    variants: parseVariants(body.variants),
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, variants: result.variants });
}

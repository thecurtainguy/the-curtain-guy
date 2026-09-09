import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchProductById } from "@/lib/products";
import {
  addProductImage,
  listProductImages,
  reorderProductImages,
} from "@/lib/product-images";
import { PRODUCT_GALLERY_MAX } from "@/data/product-images";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function GET(request: Request, context: RouteContext) {
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

  const url = new URL(request.url);
  const colorVariantId = url.searchParams.get("colorVariantId");
  const images = await listProductImages({
    productId: id,
    colorVariantId: colorVariantId || null,
  });

  return NextResponse.json({
    ok: true,
    images,
    max: PRODUCT_GALLERY_MAX,
  });
}

export async function POST(request: Request, context: RouteContext) {
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

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "file is required." },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, message: "Use JPG, PNG, WEBP, or GIF." },
      { status: 400 }
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, message: "Image must be 5MB or smaller." },
      { status: 400 }
    );
  }

  const colorRaw = form.get("colorVariantId");
  const colorVariantId =
    typeof colorRaw === "string" && colorRaw.trim() ? colorRaw.trim() : null;
  const altRaw = form.get("imageAlt");
  const imageAlt =
    typeof altRaw === "string" && altRaw.trim() ? altRaw.trim() : null;

  const bytes = await file.arrayBuffer();
  const result = await addProductImage({
    productId: id,
    colorVariantId,
    fileName: file.name || "photo.jpg",
    contentType: file.type,
    bytes,
    imageAlt,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  const images = await listProductImages({
    productId: id,
    colorVariantId,
  });
  const refreshed = await fetchProductById(id);

  return NextResponse.json({
    ok: true,
    image: result.image,
    images,
    product: refreshed,
  });
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

  const colorVariantId =
    typeof body.colorVariantId === "string" && body.colorVariantId.trim()
      ? body.colorVariantId.trim()
      : null;
  const imageIds = Array.isArray(body.imageIds)
    ? body.imageIds.map((value) => String(value || "")).filter(Boolean)
    : [];

  const result = await reorderProductImages({
    productId: id,
    colorVariantId,
    imageIds,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  const refreshed = await fetchProductById(id);
  return NextResponse.json({
    ok: true,
    images: result.images,
    product: refreshed,
  });
}

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchProductById, uploadProductImage } from "@/lib/products";

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

  const bytes = await file.arrayBuffer();
  const result = await uploadProductImage({
    productId: id,
    fileName: file.name || "photo.jpg",
    contentType: file.type,
    bytes,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 500 }
    );
  }

  const refreshed = await fetchProductById(id);
  return NextResponse.json({
    ok: true,
    imageUrl: result.imageUrl,
    product: refreshed,
  });
}

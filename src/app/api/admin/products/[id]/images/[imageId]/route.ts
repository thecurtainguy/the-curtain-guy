import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchProductById } from "@/lib/products";
import { deleteProductImage } from "@/lib/product-images";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id, imageId } = await context.params;
  const product = await fetchProductById(id);
  if (!product) {
    return NextResponse.json(
      { ok: false, message: "Product not found." },
      { status: 404 }
    );
  }

  const result = await deleteProductImage({
    productId: id,
    imageId,
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

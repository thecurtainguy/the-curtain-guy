import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  createProductCategory,
  listProductCategoriesWithCounts,
} from "@/lib/product-categories";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const categories = await listProductCategoriesWithCounts();
  return NextResponse.json({ ok: true, categories });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const result = await createProductCategory({
    label: body.label,
    label_fr: body.label_fr,
    description: body.description,
  });
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    category: { ...result.category, product_count: 0 },
  });
}

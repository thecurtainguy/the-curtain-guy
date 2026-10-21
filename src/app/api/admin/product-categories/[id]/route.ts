import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  deleteProductCategory,
  updateProductCategory,
} from "@/lib/product-categories";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const result = await updateProductCategory(id, {
    label: body.label,
    label_fr: body.label_fr,
    description: body.description,
    is_active: body.is_active,
  });
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, category: result.category });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const { id } = await context.params;
  const result = await deleteProductCategory(id);
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

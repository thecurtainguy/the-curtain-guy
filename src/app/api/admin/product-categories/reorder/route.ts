import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { reorderProductCategories } from "@/lib/product-categories";

export const runtime = "nodejs";

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

  if (!Array.isArray(body.ids)) {
    return NextResponse.json(
      { ok: false, message: "ids must be an array." },
      { status: 400 }
    );
  }

  const result = await reorderProductCategories(
    body.ids.map((id) => String(id || "")).filter(Boolean)
  );
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, categories: result.categories });
}

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  STUDIO_MAPPING_CATALOG,
  deleteStudioProductMapping,
  listStudioProductMappings,
  upsertStudioProductMapping,
} from "@/lib/studio-product-mappings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const mappings = await listStudioProductMappings();
  return NextResponse.json({ ok: true, mappings, catalog: STUDIO_MAPPING_CATALOG });
}

/** Body: `{ mappingKey, productId | null, notes?, isActive? }`. */
export async function PUT(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const result = await upsertStudioProductMapping({
    mappingKey: typeof body.mappingKey === "string" ? body.mappingKey : "",
    productId:
      typeof body.productId === "string" && body.productId.trim()
        ? body.productId.trim()
        : null,
    notes: typeof body.notes === "string" ? body.notes : null,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, mapping: result.mapping });
}

/** `?key=<mapping_key>` */
export async function DELETE(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const result = await deleteStudioProductMapping(key);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

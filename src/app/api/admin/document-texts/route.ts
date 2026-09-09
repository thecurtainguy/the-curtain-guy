import { NextResponse } from "next/server";
import { DOCUMENT_TEXT_DEFS, isDocumentTextSlug } from "@/data/document-texts";
import { requireOwner } from "@/lib/auth";
import { listDocumentTexts, upsertDocumentText } from "@/lib/document-texts";

export const runtime = "nodejs";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const rows = await listDocumentTexts();
  const texts = DOCUMENT_TEXT_DEFS.map((def) => {
    const row = rows.find((item) => item.slug === def.slug);
    return {
      ...def,
      body: row?.body ?? def.defaultBody,
      updated_at: row?.updated_at ?? null,
      isCustomized: row?.isCustomized ?? false,
    };
  });

  return NextResponse.json({ ok: true, texts });
}

export async function PUT(request: Request) {
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

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!isDocumentTextSlug(slug)) {
    return NextResponse.json(
      { ok: false, message: "Unknown document text." },
      { status: 404 }
    );
  }

  const result = await upsertDocumentText({
    slug,
    body: typeof body.body === "string" ? body.body : "",
    updatedBy: owner.user.id,
    restoreDefault: body.restoreDefault === true,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, text: result.row });
}

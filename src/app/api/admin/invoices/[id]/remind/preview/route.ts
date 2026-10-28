import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { previewInvoiceReminder } from "@/lib/invoice-notices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Renders the reminder email exactly as it would go out, without sending anything. */
export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const preview = await previewInvoiceReminder(
    id,
    owner.user.id,
    typeof body.note === "string" ? body.note.slice(0, 2000) : null
  );
  if ("error" in preview) {
    return NextResponse.json({ ok: false, message: preview.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...preview });
}

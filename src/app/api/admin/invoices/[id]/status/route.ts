import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  fetchInvoiceById,
  setInvoiceStatus,
  type InvoiceStatusAction,
} from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const ACTIONS: InvoiceStatusAction[] = ["mark_sent", "revert_draft", "void", "unvoid"];

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = ACTIONS.find((value) => value === body.action);
  if (!action) {
    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  }
  const result = await setInvoiceStatus(id, action, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  const invoice = await fetchInvoiceById(id, { includeEvents: true });
  return NextResponse.json({ ok: true, invoice });
}

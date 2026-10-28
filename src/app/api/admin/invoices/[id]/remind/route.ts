import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { sendInvoiceReminderNow } from "@/lib/invoice-notices";
import { fetchInvoiceById } from "@/lib/invoices";
import { isValidEmailAddress, parseEmailList } from "@/lib/quote-email-compose";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Sends one payment reminder now, even when automatic reminders are paused. */
export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    cc?: string;
    note?: string;
    saveForAutomatic?: boolean;
  };
  const to = parseEmailList(body.to ?? "");
  const cc = parseEmailList(body.cc ?? "");
  const invalid = [...to, ...cc].find((email) => !isValidEmailAddress(email));
  if (invalid) {
    return NextResponse.json({ ok: false, message: `Invalid email: ${invalid}` }, { status: 400 });
  }
  if (body.to !== undefined && to.length === 0) {
    return NextResponse.json({ ok: false, message: "Add at least one recipient." }, { status: 400 });
  }

  const result = await sendInvoiceReminderNow(id, owner.user.id, {
    to: to.length ? to : undefined,
    cc,
    note: typeof body.note === "string" ? body.note.slice(0, 2000) : null,
    saveForAutomatic: body.saveForAutomatic === true,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  const people = result.to.length + result.cc.length;
  return NextResponse.json({
    ok: true,
    invoice: await fetchInvoiceById(id, { includeEvents: true }),
    message: `Payment reminder emailed to ${people > 1 ? `${people} people` : result.to[0]}.`,
  });
}

import { after, NextResponse } from "next/server";
import { isPaymentKind } from "@/data/invoices";
import { requireOwner } from "@/lib/auth";
import { sendPaymentReceipt } from "@/lib/invoice-notices";
import {
  addInvoicePayment,
  clearInvoicePayments,
  fetchInvoiceById,
  quickPaymentAmount,
} from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

/**
 * Record a payment. `quick: "deposit" | "full"` fills the amount from the
 * outstanding deposit or remaining balance.
 */
export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    quick?: "deposit" | "full";
    kind?: string;
    amount_cents?: number;
    paid_on?: string;
    method?: string;
    reference?: string;
    note?: string;
    /** Email the client a receipt (default on). */
    send_receipt?: boolean;
  };

  if (!body.method?.trim()) {
    return NextResponse.json({ ok: false, message: "Choose how the client paid." }, { status: 400 });
  }

  const invoice = await fetchInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }

  let amount = Math.round(Number(body.amount_cents) || 0);
  let kind = isPaymentKind(body.kind) ? body.kind : "payment";
  if (body.quick === "deposit" || body.quick === "full") {
    amount = quickPaymentAmount(invoice, body.quick);
    kind = body.quick === "deposit" ? "deposit" : "payment";
    if (amount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            body.quick === "deposit"
              ? "The deposit is already covered."
              : "Nothing left to pay on this invoice.",
        },
        { status: 400 }
      );
    }
  }

  const result = await addInvoicePayment(
    id,
    {
      kind,
      amountCents: amount,
      paidOn: body.paid_on,
      method: body.method,
      reference: body.reference,
      note: body.note,
    },
    owner.user.id
  );
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  const receiptTo = body.send_receipt !== false ? invoice.customer_email?.trim() || null : null;
  if (receiptTo) {
    after(() => sendPaymentReceipt({ invoiceId: id, paymentId: result.paymentId, actorUserId: owner.user.id }));
  }
  return NextResponse.json({
    ok: true,
    receiptTo,
    invoice: await fetchInvoiceById(id, { includeEvents: true }),
  });
}

/** Mark unpaid — removes every recorded payment. */
export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const result = await clearInvoicePayments(id, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    invoice: await fetchInvoiceById(id, { includeEvents: true }),
  });
}

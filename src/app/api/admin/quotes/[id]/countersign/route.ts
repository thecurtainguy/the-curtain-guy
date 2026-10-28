import { after, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getResendApiKey } from "@/lib/env";
import { renderSignedAgreementPdf } from "@/lib/quote-agreement-pdf";
import {
  SigningError,
  countersignQuote,
  toAgreementAudit,
  type QuoteSignatureRow,
} from "@/lib/quote-signing";
import { sendAgreementExecutedEmail } from "@/lib/quote-signing-email";
import { fetchQuoteById } from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function sendExecutedCopy(signature: QuoteSignatureRow) {
  const apiKey = getResendApiKey();
  const quote = await fetchQuoteById(signature.quote_id);
  if (!apiKey || !quote) return;
  try {
    const pdf = await renderSignedAgreementPdf(signature);
    const to = [signature.signer_email, quote.customer_email]
      .map((email) => email.trim().toLowerCase())
      .filter((email, index, list) => email && list.indexOf(email) === index);
    await sendAgreementExecutedEmail({
      apiKey,
      quote,
      language: signature.language,
      countersignerName: signature.countersigner_name ?? "The Curtain Guy",
      pdf,
      to,
    });
  } catch (err) {
    console.error("[signing] executed email failed", err);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const signature = await countersignQuote({
      quoteId: id,
      ownerUserId: owner.user.id,
      name: body.name,
      title: body.title,
      method: body.method,
      signatureImage: body.signatureImage,
    });
    if (body.sendCopy !== false) after(() => sendExecutedCopy(signature));
    return NextResponse.json({ ok: true, agreement: toAgreementAudit(signature) });
  } catch (err) {
    if (err instanceof SigningError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
    }
    console.error("[signing] countersign failed", err);
    return NextResponse.json({ ok: false, message: "Could not countersign." }, { status: 500 });
  }
}

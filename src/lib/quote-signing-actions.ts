import { after, NextResponse } from "next/server";
import {
  isCustomerLanguage,
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import { maskEmail } from "@/data/quote-signing";
import { getResendApiKey } from "@/lib/env";
import { ensureDraftJobAfterQuoteAccepted } from "@/lib/jobs";
import { renderSignedAgreementPdf } from "@/lib/quote-agreement-pdf";
import {
  sendQuoteAcceptedCustomerEmail,
  sendQuoteOwnerActionNotification,
} from "@/lib/quote-email";
import {
  SigningError,
  issueSigningCode,
  signQuote,
  toAgreementSummary,
  verifySigningCode,
  type QuoteSignatureRow,
  type SigningChannel,
} from "@/lib/quote-signing";
import { sendSigningCodeEmail } from "@/lib/quote-signing-email";
import { fetchQuoteById, type QuoteWithRelations } from "@/lib/quotes";

export const SIGNING_ACTIONS = ["signing_send_code", "signing_verify_code", "sign"] as const;

export function isSigningAction(action: string | undefined): boolean {
  return (SIGNING_ACTIONS as readonly string[]).includes(action ?? "");
}

async function sendSignedFollowUps(input: {
  signature: QuoteSignatureRow;
  proposalUrl: string;
  alsoTo: string | null;
}) {
  const apiKey = getResendApiKey();
  const quote = await fetchQuoteById(input.signature.quote_id);
  if (!apiKey || !quote) return;
  const { signature } = input;
  let pdf: { buffer: Buffer; filename: string } | null = null;
  try {
    pdf = await renderSignedAgreementPdf(signature);
  } catch (err) {
    console.error("[signing] agreement PDF failed", err);
  }
  try {
    await sendQuoteAcceptedCustomerEmail({
      apiKey,
      quote,
      proposalUrl: input.proposalUrl,
      acceptedByName: signature.signer_name ?? "",
      alsoTo: input.alsoTo,
      language: signature.language,
      signedAgreement: pdf ? { ...pdf, documentHash: signature.document_hash ?? "" } : null,
    });
  } catch (err) {
    console.error("[signing] signed confirmation email failed", err);
  }
  try {
    await sendQuoteOwnerActionNotification({
      apiKey,
      quote,
      actionLabel: "Customer e-signed — countersignature needed",
      details: `Signed by ${signature.signer_name}${signature.signer_title ? ` (${signature.signer_title})` : ""} · ${signature.signer_email} · fingerprint ${signature.document_hash?.slice(0, 16)}…`,
    });
  } catch (err) {
    console.error("[signing] owner notify failed", err);
  }
}

/**
 * Runs one step of the e-signature ceremony (send code → verify code → sign)
 * for the public link or the customer account. Returns the JSON response.
 */
export async function handleSigningAction(input: {
  quote: QuoteWithRelations;
  action: string;
  body: Record<string, unknown>;
  channel: SigningChannel;
  userId?: string | null;
  alsoTo?: string | null;
  proposalUrl: string;
}): Promise<NextResponse> {
  const { quote, body } = input;
  const language: CustomerLanguage = isCustomerLanguage(body.language)
    ? body.language
    : normalizeCustomerLanguage(quote.language);
  const signatureId = typeof body.signatureId === "string" ? body.signatureId : null;

  try {
    if (input.action === "signing_send_code") {
      const apiKey = getResendApiKey();
      if (!apiKey) throw new SigningError("Email is not configured. Please contact us to sign.", 503);
      const issued = await issueSigningCode({
        quote,
        channel: input.channel,
        language,
        userId: input.userId,
        signatureId,
      });
      await sendSigningCodeEmail({ apiKey, quote, email: issued.email, code: issued.code, language });
      return NextResponse.json({
        ok: true,
        signatureId: issued.signatureId,
        maskedEmail: maskEmail(issued.email),
      });
    }

    if (!signatureId) throw new SigningError("Signing session not found. Please start again.", 404);

    if (input.action === "signing_verify_code") {
      const { signingToken } = await verifySigningCode({
        quote,
        signatureId,
        code: typeof body.code === "string" ? body.code : "",
      });
      return NextResponse.json({ ok: true, signingToken });
    }

    const signature = await signQuote({
      quote,
      signatureId,
      signingToken: typeof body.signingToken === "string" ? body.signingToken : "",
      language: body.language,
      signerName: body.signerName,
      signerTitle: body.signerTitle,
      method: body.method,
      signatureImage: body.signatureImage,
      initials: body.initials,
      initialsImage: body.initialsImage,
      initialedAt: body.initialedAt,
      agreeAll: body.agreeAll,
      consent: body.consent,
      userId: input.userId,
    });
    const jobResult = await ensureDraftJobAfterQuoteAccepted({
      quoteId: quote.id,
      actorUserId: input.userId ?? null,
    });
    after(() =>
      sendSignedFollowUps({
        signature,
        proposalUrl: input.proposalUrl,
        alsoTo: input.alsoTo ?? null,
      })
    );
    return NextResponse.json({
      ok: true,
      status: "accepted",
      agreement: toAgreementSummary(signature),
      jobId: jobResult.jobId,
      jobCreated: jobResult.created,
    });
  } catch (err) {
    if (err instanceof SigningError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
    }
    console.error("[signing] action failed", err);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

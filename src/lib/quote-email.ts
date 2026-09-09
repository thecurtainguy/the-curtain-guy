import {
  formatCadFromCents,
  resolveQuoteDisplayRef,
  type QuoteRow,
} from "@/data/quotes";
import {
  getEstimateNotifyTo,
  getQuoteFrom,
  getSiteUrl,
} from "@/lib/env";
import { getDocumentTextsMap } from "@/lib/document-texts";
import {
  brandQuoteEmailShell,
  buildDefaultQuoteEmailBodyText,
  buildDefaultQuoteEmailSubject,
  buildQuoteReadyEmailParts,
  escapeEmailHtml,
  quotePdfAttachmentName,
} from "@/lib/quote-email-compose";
import { renderQuotePdfBuffer } from "@/lib/quote-pdf";
import {
  toCustomerSafeQuote,
  type QuoteWithRelations,
} from "@/lib/quotes";
import {
  sendResendEmail,
  type ResendEmailAttachment,
} from "@/lib/resend";

export type QuoteReadyComposeOptions = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  attachPdf?: boolean;
  extraAttachments?: ResendEmailAttachment[];
  /** When false, do not auto-BCC admin (compose Bcc field is source of truth). */
  copyOutbound?: boolean;
};

export async function sendQuoteReadyEmail(input: {
  apiKey: string;
  quote: QuoteWithRelations;
  publicQuoteUrl: string;
  compose?: QuoteReadyComposeOptions;
}): Promise<void> {
  const { quote, publicQuoteUrl, apiKey, compose } = input;
  const copy = await getDocumentTextsMap();
  const emailNote = copy["quote.email_note"];
  const emailFooter = copy["quote.email_footer"];
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const pdfFilename = quotePdfAttachmentName(quote);
  const attachPdf = compose?.attachPdf !== false;

  const bodyText =
    compose?.bodyText?.trim() ||
    buildDefaultQuoteEmailBodyText({ quote, emailNote });
  const subject =
    compose?.subject?.trim() || buildDefaultQuoteEmailSubject(quote);
  const to = (compose?.to?.length ? compose.to : [quote.customer_email]).filter(
    Boolean
  );
  if (to.length === 0) {
    throw new Error("Recipient email is required.");
  }

  const attachments: ResendEmailAttachment[] = [
    ...(compose?.extraAttachments ?? []),
  ];

  let resolvedPdfName: string | null = null;
  if (attachPdf) {
    try {
      const safe = toCustomerSafeQuote(quote, { shareUrl: publicQuoteUrl });
      const pdfBuffer = await renderQuotePdfBuffer({
        quote: safe,
        publicUrl: publicQuoteUrl,
        siteUrl,
      });
      attachments.unshift({
        filename: pdfFilename,
        content: pdfBuffer.toString("base64"),
        contentType: "application/pdf",
      });
      resolvedPdfName = pdfFilename;
    } catch (err) {
      console.error("[quotes] PDF attach failed; sending email without PDF", err);
    }
  }

  const { text, html } = buildQuoteReadyEmailParts({
    quote,
    publicQuoteUrl,
    bodyText,
    emailFooter,
    pdfFilename: resolvedPdfName,
  });

  await sendResendEmail({
    apiKey,
    from: getQuoteFrom(),
    to,
    cc: compose?.cc?.filter(Boolean),
    bcc: compose?.bcc?.filter(Boolean),
    replyTo: getEstimateNotifyTo(),
    subject,
    text,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
    copyOutbound: compose?.copyOutbound,
    logLabel: "quotes",
  });
}

export async function sendQuoteOwnerActionNotification(input: {
  apiKey: string;
  quote: QuoteRow;
  actionLabel: string;
  details?: string | null;
}): Promise<void> {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const adminUrl = `${siteUrl}/admin/quotes/${input.quote.id}`;
  const displayRef = resolveQuoteDisplayRef(input.quote);
  const text = [
    `Customer action on ${displayRef}`,
    `Action: ${input.actionLabel}`,
    input.details || "",
    `Customer: ${input.quote.customer_name || "—"} <${input.quote.customer_email}>`,
    `Total: ${formatCadFromCents(input.quote.total_cents)} CAD`,
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = await getDocumentTextsMap();
  const html = brandQuoteEmailShell(
    "Quote activity",
    `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#d7d2c6;">
      ${escapeEmailHtml(input.actionLabel)} on <strong style="color:#f8f5ec;">${escapeEmailHtml(displayRef)}</strong>
    </p>
    ${
      input.details
        ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#cfc8b8;">${escapeEmailHtml(input.details)}</p>`
        : ""
    }
    <p style="margin:0 0 16px;font-size:14px;color:#cfc8b8;">
      ${escapeEmailHtml(input.quote.customer_name || "Customer")} · ${escapeEmailHtml(input.quote.customer_email)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;color:#d4af37;">
      ${escapeEmailHtml(formatCadFromCents(input.quote.total_cents))}
    </p>
    <a href="${escapeEmailHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
      Open in admin
    </a>
  `,
    copy["quote.email_footer"]
  );

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    to: [getEstimateNotifyTo()],
    replyTo: input.quote.customer_email,
    subject: `${input.actionLabel} — ${displayRef}`,
    text,
    html,
    logLabel: "quotes",
  });
}

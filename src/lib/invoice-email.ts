import {
  computeAmountDue,
  getInvoiceCopy,
  invoicePaymentSchedule,
  type BusinessSettings,
  type InvoiceRow,
  type InvoiceWithRelations,
} from "@/data/invoices";
import { formatMoneyFromCents } from "@/data/quotes";
import { formatQuoteDate } from "@/data/quote-copy";
import { getEstimateNotifyTo, getQuoteFrom } from "@/lib/env";
import { getLocalizedDocumentText } from "@/lib/document-texts";
import { withOwnerCopySource } from "@/lib/document-views";
import { recordEmailMessage } from "@/lib/email-tracking";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { toCustomerSafeInvoice } from "@/lib/invoices";
import {
  bodyTextToEmailHtml,
  brandQuoteEmailShell,
  escapeEmailHtml,
} from "@/lib/quote-email-compose";
import { sendResendEmail } from "@/lib/resend";

export function buildDefaultInvoiceEmailSubject(
  invoice: Pick<InvoiceRow, "invoice_number" | "language">,
  settings: Pick<BusinessSettings, "trade_name">
): string {
  return getInvoiceCopy(invoice.language).emailSubject(
    invoice.invoice_number,
    settings.trade_name
  );
}

export function buildDefaultInvoiceEmailBody(
  invoice: Pick<InvoiceRow, "customer_name" | "language">
): string {
  const t = getInvoiceCopy(invoice.language);
  return [t.emailGreeting(invoice.customer_name?.trim() || null), "", t.emailBody].join("\n");
}

export function buildInvoiceEmailParts(input: {
  invoice: InvoiceRow;
  publicUrl: string;
  bodyText: string;
  footer: string;
  pdfFilename?: string | null;
}): { text: string; html: string } {
  const { invoice } = input;
  const language = invoice.language;
  const t = getInvoiceCopy(language);
  const money = (cents: number) => formatMoneyFromCents(cents, language, invoice.currency);
  const totalLabel = t.totalIn(invoice.currency === "USD" ? "USD" : "CAD");
  const due = computeAmountDue(invoice);
  const dueLabel =
    due.dueNowKind === "deposit" ? t.depositDue : t.balanceDue;
  const dueDate = due.dueNowDate
    ? `${t.dueBy} ${formatQuoteDate(due.dueNowDate, language, "")}`
    : due.dueNowKind === "none"
      ? t.paidInFull
      : t.dueOnReceipt;

  const balanceRow = invoicePaymentSchedule(invoice).find((row) => row.kind === "balance");
  const remainingLine =
    due.dueNowKind === "deposit" && balanceRow?.dueDate
      ? t.remainingAfterDeposit(
          money(balanceRow.amountCents),
          `${formatQuoteDate(balanceRow.dueDate, language, "")}${balanceRow.isEventDay ? ` (${t.scheduleEventDay})` : ""}`
        )
      : null;

  const text = [
    input.bodyText.trim(),
    "",
    `${t.invoice} ${invoice.invoice_number}`,
    `${totalLabel}: ${money(invoice.total_cents)}`,
    invoice.po_number ? `${t.poNumber} ${invoice.po_number}` : "",
    `${dueLabel}: ${money(due.dueNowCents)} (${dueDate})`,
    remainingLine ?? "",
    "",
    input.publicUrl,
  ].join("\n");

  const html = brandQuoteEmailShell(
    t.emailHeadline,
    `
    ${bodyTextToEmailHtml(input.bodyText)}
    <div style="margin:0 0 18px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.2);">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">${escapeEmailHtml(t.invoice)}</p>
      <p style="margin:0 0 10px;font-size:20px;color:#f8f5ec;">${escapeEmailHtml(invoice.invoice_number)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#cfc8b8;">${escapeEmailHtml(totalLabel)}: ${escapeEmailHtml(money(invoice.total_cents))}</p>
      ${invoice.po_number ? `<p style="margin:0 0 4px;font-size:13px;color:#cfc8b8;">${escapeEmailHtml(t.poNumber)} ${escapeEmailHtml(invoice.po_number)}</p>` : ""}
      <p style="margin:10px 0 0;font-size:18px;color:#d4af37;">${escapeEmailHtml(dueLabel)}: ${escapeEmailHtml(money(due.dueNowCents))}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#8b909a;">${escapeEmailHtml(dueDate)}</p>
      ${remainingLine ? `<p style="margin:10px 0 0;padding-top:10px;border-top:1px solid rgba(212,175,55,0.2);font-size:13px;color:#f8f5ec;">${escapeEmailHtml(remainingLine)}</p>` : ""}
    </div>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(input.publicUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
        ${escapeEmailHtml(t.emailButton)}
      </a>
    </p>
    ${
      input.pdfFilename
        ? `<p style="margin:14px 0 0;font-size:12px;color:#8b909a;">PDF: ${escapeEmailHtml(input.pdfFilename)}</p>`
        : ""
    }
  `,
    input.footer,
    language
  );

  return { text, html };
}

/** Client replies go to the billing contact email shown on the invoice. */
export function invoiceReplyTo(settings: Pick<BusinessSettings, "email">): string {
  return settings.email?.trim() || getEstimateNotifyTo();
}

export function invoiceEmailFrom(): string {
  return getQuoteFrom();
}

export async function buildInvoiceEmailPreview(input: {
  invoice: InvoiceWithRelations;
  settings: BusinessSettings;
  publicUrl: string;
  subject?: string;
  bodyText?: string;
  attachPdf?: boolean;
}): Promise<{ subject: string; html: string; from: string; replyTo: string; attachment: string | null }> {
  const { invoice, settings } = input;
  const footer = await getLocalizedDocumentText("quote.email_footer", invoice.language);
  const attachment = input.attachPdf !== false ? invoicePdfFilename(invoice.invoice_number) : null;
  const { html } = buildInvoiceEmailParts({
    invoice,
    publicUrl: input.publicUrl,
    bodyText: input.bodyText?.trim() || buildDefaultInvoiceEmailBody(invoice),
    footer,
    pdfFilename: attachment,
  });
  return {
    subject: input.subject?.trim() || buildDefaultInvoiceEmailSubject(invoice, settings),
    html,
    from: invoiceEmailFrom(),
    replyTo: invoiceReplyTo(settings),
    attachment,
  };
}

export async function sendInvoiceEmail(input: {
  apiKey: string;
  invoice: InvoiceWithRelations;
  settings: BusinessSettings;
  publicUrl: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  bodyText?: string;
  attachPdf?: boolean;
  /** Archive inboxes that get their own copy, so their clicks are not counted as customer views. */
  ownerCopyTo?: string[];
}): Promise<void> {
  const { invoice, settings } = input;
  const footer = await getLocalizedDocumentText("quote.email_footer", invoice.language);
  const bodyText = input.bodyText?.trim() || buildDefaultInvoiceEmailBody(invoice);
  const subject =
    input.subject?.trim() || buildDefaultInvoiceEmailSubject(invoice, settings);
  const filename = invoicePdfFilename(invoice.invoice_number);

  const attachments = [];
  let attachedName: string | null = null;
  if (input.attachPdf !== false) {
    try {
      const buffer = await renderInvoicePdfBuffer({
        invoice: toCustomerSafeInvoice(invoice),
        settings,
        publicUrl: input.publicUrl,
      });
      attachments.push({
        filename,
        content: buffer.toString("base64"),
        contentType: "application/pdf",
      });
      attachedName = filename;
    } catch (error) {
      console.error("[invoices] PDF attach failed; sending without PDF", error);
    }
  }

  const buildParts = (url: string) => {
    const { text, html } = buildInvoiceEmailParts({
      invoice,
      publicUrl: url,
      bodyText,
      footer,
      pdfFilename: attachedName,
    });
    return { text, html };
  };
  const cc = input.cc?.filter(Boolean) ?? [];
  const bcc = input.bcc?.filter(Boolean) ?? [];

  const sent = await sendResendEmail({
    apiKey: input.apiKey,
    from: invoiceEmailFrom(),
    to: input.to,
    cc,
    bcc,
    replyTo: invoiceReplyTo(settings),
    subject,
    ...buildParts(input.publicUrl),
    attachments: attachments.length ? attachments : undefined,
    copyOutbound: false,
    logLabel: "invoices",
  });
  await recordEmailMessage({
    resendId: sent.id,
    target: { invoiceId: invoice.id },
    audience: "customer",
    to: input.to,
    cc,
    bcc,
    subject,
  });

  const ownerCopyTo = input.ownerCopyTo?.filter(Boolean) ?? [];
  if (ownerCopyTo.length === 0) return;
  try {
    const copy = await sendResendEmail({
      apiKey: input.apiKey,
      from: invoiceEmailFrom(),
      to: ownerCopyTo,
      replyTo: invoiceReplyTo(settings),
      subject,
      ...buildParts(withOwnerCopySource(input.publicUrl)),
      attachments: attachments.length ? attachments : undefined,
      copyOutbound: false,
      logLabel: "invoices",
    });
    await recordEmailMessage({
      resendId: copy.id,
      target: { invoiceId: invoice.id },
      audience: "owner_copy",
      to: ownerCopyTo,
      subject,
    });
  } catch (error) {
    console.error("[invoices] owner archive copy failed", error);
  }
}

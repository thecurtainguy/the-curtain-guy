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
import { localizeInvoice, toCustomerSafeInvoice } from "@/lib/invoices";
import {
  bodyTextToEmailHtml,
  brandQuoteEmailShell,
  escapeEmailHtml,
  quoteUrlInLanguage,
} from "@/lib/quote-email-compose";
import type { CustomerLanguage } from "@/data/customer-language";
import { sendResendEmail } from "@/lib/resend";

export function buildDefaultInvoiceEmailSubject(
  invoice: Pick<InvoiceRow, "invoice_number" | "language">,
  settings: Pick<BusinessSettings, "trade_name">
): string {
  if (invoice.language === "en") {
    return `Facture / Invoice ${invoice.invoice_number} · ${settings.trade_name}`;
  }
  return getInvoiceCopy(invoice.language).emailSubject(
    invoice.invoice_number,
    settings.trade_name
  );
}

/** English invoices also go out with the French version, offered first. */
function frenchVersionFor(invoice: Pick<InvoiceRow, "language">): boolean {
  return invoice.language === "en";
}

function frenchVersionBlock(input: { customerName: string | null; url: string }): { text: string; html: string } {
  const fr = getInvoiceCopy("fr");
  const greeting = fr.emailGreeting(input.customerName);
  const text = [greeting, "", fr.emailBody, "", `Version française : ${input.url}`, "", "———", ""].join("\n");
  const html = `
    <div lang="fr" style="margin:0 0 20px;padding:16px;border-radius:14px;border:1px solid rgba(212,175,55,0.35);background:rgba(212,175,55,0.06);">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">Version française</p>
      <p style="margin:0 0 8px;color:#f8f5ec;">${escapeEmailHtml(greeting)}</p>
      <p style="margin:0 0 12px;color:#cfc8b8;font-size:14px;">${escapeEmailHtml(fr.emailBody)}</p>
      <a href="${escapeEmailHtml(input.url)}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:600;">
        ${escapeEmailHtml(fr.emailButton)}
      </a>
    </div>
    <p lang="en" style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8b909a;">English version</p>
  `;
  return { text, html };
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
  const french = frenchVersionFor(invoice)
    ? frenchVersionBlock({
        customerName: invoice.customer_name?.trim() || null,
        url: quoteUrlInLanguage(input.publicUrl, "fr"),
      })
    : null;
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
    french?.text ?? "",
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
    french ? `${getInvoiceCopy("fr").emailHeadline} · ${t.emailHeadline}` : t.emailHeadline,
    `
    ${french?.html ?? ""}
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
    french ? "fr" : language
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

async function invoiceEmailFooter(invoice: Pick<InvoiceRow, "language">): Promise<string> {
  if (!frenchVersionFor(invoice)) return getLocalizedDocumentText("quote.email_footer", invoice.language);
  const [fr, en] = await Promise.all([
    getLocalizedDocumentText("quote.email_footer", "fr"),
    getLocalizedDocumentText("quote.email_footer", "en"),
  ]);
  return fr === en ? fr : `${fr} · ${en}`;
}

/** French first when the invoice is in English; one PDF otherwise. */
function invoicePdfNames(
  invoice: Pick<InvoiceRow, "invoice_number" | "language">
): Array<{ language: CustomerLanguage; filename: string }> {
  if (!frenchVersionFor(invoice)) {
    return [{ language: invoice.language, filename: invoicePdfFilename(invoice.invoice_number) }];
  }
  return (["fr", "en"] as const).map((language) => ({
    language,
    filename: invoicePdfFilename(invoice.invoice_number, language),
  }));
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
  const footer = await invoiceEmailFooter(invoice);
  const attachment =
    input.attachPdf !== false ? invoicePdfNames(invoice).map((pdf) => pdf.filename).join(" + ") : null;
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
  const footer = await invoiceEmailFooter(invoice);
  const bodyText = input.bodyText?.trim() || buildDefaultInvoiceEmailBody(invoice);
  const subject =
    input.subject?.trim() || buildDefaultInvoiceEmailSubject(invoice, settings);

  const attachments = [];
  const attachedNames: string[] = [];
  if (input.attachPdf !== false) {
    for (const pdf of invoicePdfNames(invoice)) {
      try {
        const buffer = await renderInvoicePdfBuffer({
          invoice: await localizeInvoice(toCustomerSafeInvoice(invoice), pdf.language),
          settings,
          publicUrl: input.publicUrl,
        });
        attachments.push({
          filename: pdf.filename,
          content: buffer.toString("base64"),
          contentType: "application/pdf",
        });
        attachedNames.push(pdf.filename);
      } catch (error) {
        console.error("[invoices] PDF attach failed; sending without it", pdf.filename, error);
      }
    }
  }
  const attachedName = attachedNames.length ? attachedNames.join(" + ") : null;

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

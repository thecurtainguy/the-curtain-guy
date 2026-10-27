import {
  customerQuoteDisplayRef,
  customerQuoteLineStatus,
  formatMoneyFromCents,
  formatQuoteFilenameStem,
  formatQuoteQuantity,
  getQuoteTaxBreakdownRows,
  type QuoteLineItemRow,
  type QuoteRow,
} from "@/data/quotes";
import {
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import {
  formatQuoteDate,
  getQuoteCopy,
  labelWithColon,
  quoteEventTypeLabel,
} from "@/data/quote-copy";
import { emailDarkBrandHeaderHtml } from "@/lib/email-brand";

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function brandQuoteEmailShell(
  title: string,
  innerHtml: string,
  footer: string,
  language: CustomerLanguage = "en"
): string {
  return `<!DOCTYPE html>
<html lang="${language}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0b0d12;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
    <div style="padding:28px 24px;border-radius:20px;background:linear-gradient(160deg,#151922,#0f1218);border:1px solid rgba(212,175,55,0.28);">
      ${emailDarkBrandHeaderHtml()}
      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#f8f5ec;">${escapeEmailHtml(title)}</h1>
      ${innerHtml}
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#8b909a;">${escapeEmailHtml(footer)}</p>
  </div>
</body>
</html>`;
}

export function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type QuoteEmailComposeDefaultsInput = {
  quote: Pick<
    QuoteRow,
    | "customer_name"
    | "customer_email"
    | "opportunity_ref"
    | "revision_number"
    | "language"
    | "event_type"
    | "event_date"
    | "city_area"
    | "venue_name"
    | "subtotal_cents"
    | "total_cents"
    | "tax_mode"
    | "gst_rate"
    | "qst_rate"
    | "taxable_subtotal_cents"
    | "nontaxable_subtotal_cents"
    | "gst_cents"
    | "qst_cents"
    | "manual_tax_label"
    | "manual_tax_cents"
    | "manual_tax_lines"
    | "total_before_tax_cents"
    | "total_tax_cents"
    | "currency"
  >;
  emailNote?: string;
  defaultBcc?: string;
};

function quoteLanguage(
  quote: QuoteEmailComposeDefaultsInput["quote"]
): CustomerLanguage {
  return normalizeCustomerLanguage(quote.language);
}

export function getQuoteEmailEventBits(
  quote: QuoteEmailComposeDefaultsInput["quote"]
): string {
  const eventDate = quote.event_date
    ? formatQuoteDate(quote.event_date, quoteLanguage(quote), "")
    : null;
  return [
    quoteEventTypeLabel(quote.event_type, quoteLanguage(quote)),
    eventDate,
    quote.city_area || quote.venue_name,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildDefaultQuoteEmailSubject(
  quote: QuoteEmailComposeDefaultsInput["quote"]
): string {
  return getQuoteCopy(quoteLanguage(quote)).mail.subject(
    customerQuoteDisplayRef(quote)
  );
}

export function buildDefaultQuoteEmailBodyText(input: {
  quote: QuoteEmailComposeDefaultsInput["quote"];
  emailNote?: string;
}): string {
  const e = getQuoteCopy(quoteLanguage(input.quote)).mail;
  const lines = [
    e.ready(input.quote.customer_name?.trim() || null),
    "",
    e.instructions,
  ];
  if (input.emailNote?.trim()) {
    lines.push("", input.emailNote.trim());
  }
  return lines.join("\n");
}

export function bodyTextToEmailHtml(bodyText: string): string {
  const paragraphs = bodyText
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#d7d2c6;"></p>`;
  }

  return paragraphs
    .map((block) => {
      const withBreaks = escapeEmailHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#d7d2c6;">${withBreaks}</p>`;
    })
    .join("");
}

const EMAIL_INCLUDED_LIMIT = 4;
const EMAIL_LINE_NAME_MAX = 70;

/** Routes a line photo through the PNG thumbnail endpoint (no WebP in inboxes). */
export function emailThumbnailUrl(
  src: string | null | undefined,
  assetBaseUrl: string | null | undefined
): string | null {
  if (!src || !assetBaseUrl) return null;
  return `${assetBaseUrl.replace(/\/$/, "")}/api/email-image?src=${encodeURIComponent(src)}`;
}

function emailLineName(description: string): string {
  const name = description.trim().replace(/\s+/g, " ");
  return name.length > EMAIL_LINE_NAME_MAX
    ? `${name.slice(0, EMAIL_LINE_NAME_MAX - 1).trimEnd()}…`
    : name;
}

function emailIncludedLines(lineItems: QuoteLineItemRow[] | undefined) {
  return (lineItems ?? [])
    .filter((item) => item.customer_visible)
    .map((item) => ({ ...item, status: customerQuoteLineStatus(item) }))
    .filter(
      (item) =>
        item.status === "priced" ||
        item.status === "included" ||
        item.status === "approved"
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

function buildIncludedBlock(input: {
  lineItems: QuoteLineItemRow[] | undefined;
  assetBaseUrl: string | null | undefined;
  language: CustomerLanguage;
}): { text: string[]; html: string } {
  const lines = emailIncludedLines(input.lineItems);
  if (lines.length === 0) return { text: [], html: "" };

  const e = getQuoteCopy(input.language).mail;
  const shown = lines.slice(0, EMAIL_INCLUDED_LIMIT);
  const remaining = lines.length - shown.length;
  const qty = (item: QuoteLineItemRow) =>
    formatQuoteQuantity(item.quantity, item.unit_label, input.language);

  const text = [
    e.includedHeading,
    ...shown.map((item) => `- ${emailLineName(item.description)} · ${qty(item)}`),
    remaining > 0 ? e.moreItems(remaining) : "",
  ];

  const rows = shown
    .map((item) => {
      const thumb = emailThumbnailUrl(item.image_url, input.assetBaseUrl);
      const thumbHtml = thumb
        ? `<img src="${escapeEmailHtml(thumb)}" width="56" height="56" alt="${escapeEmailHtml(item.image_alt || "")}" style="display:block;width:56px;height:56px;border-radius:10px;border:1px solid rgba(212,175,55,0.25);" />`
        : `<div style="width:56px;height:56px;border-radius:10px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.25);"></div>`;
      return `<tr>
        <td width="56" style="width:56px;padding:6px 12px 6px 0;vertical-align:middle;">${thumbHtml}</td>
        <td style="padding:6px 0;vertical-align:middle;">
          <p style="margin:0;font-size:14px;line-height:1.4;color:#f8f5ec;">${escapeEmailHtml(emailLineName(item.description))}</p>
          <p style="margin:2px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#8b909a;">${escapeEmailHtml(qty(item))}</p>
        </td>
      </tr>`;
    })
    .join("");

  const html = `<div style="margin:14px 0 0;padding:14px 0 0;border-top:1px solid rgba(212,175,55,0.16);">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">${escapeEmailHtml(e.includedHeading)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rows}</table>
      ${remaining > 0 ? `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#cfc8b8;">${escapeEmailHtml(e.moreItems(remaining))}</p>` : ""}
    </div>`;

  return { text, html };
}

export function buildQuoteReadyEmailParts(input: {
  quote: QuoteEmailComposeDefaultsInput["quote"];
  publicQuoteUrl: string;
  bodyText: string;
  emailFooter: string;
  pdfFilename?: string | null;
  headline?: string;
  /** Saved line items for the "What's included" block (no per-line prices). */
  lineItems?: QuoteLineItemRow[];
  /** Site origin serving `/api/email-image` thumbnails. */
  assetBaseUrl?: string | null;
}): { text: string; html: string; displayRef: string } {
  const { quote, publicQuoteUrl, bodyText, emailFooter } = input;
  const language = quoteLanguage(quote);
  const e = getQuoteCopy(language).mail;
  const money = (cents: number) =>
    formatMoneyFromCents(cents, language, quote.currency);
  const displayRef = customerQuoteDisplayRef(quote);
  const eventBits = getQuoteEmailEventBits(quote);
  const taxRows = getQuoteTaxBreakdownRows(quote, {
    variant: "customer",
    language,
    currency: quote.currency,
  });
  const colon = (label: string) => labelWithColon(label, language);
  const showOpportunity = !displayRef.includes(quote.opportunity_ref);
  const taxText = taxRows.map(
    (row) => `${colon(row.label)} ${money(row.amountCents)}`
  );
  const included = buildIncludedBlock({
    lineItems: input.lineItems,
    assetBaseUrl: input.assetBaseUrl,
    language,
  });
  const taxHtml = taxRows
    .map((row) => {
      const isTotal = row.emphasis === "total";
      return `<p style="margin:${isTotal ? "10px" : "0"} 0 ${isTotal ? "0" : "4px"};font-size:${isTotal ? "18px" : "13px"};color:${isTotal ? "#d4af37" : "#cfc8b8"};">
        ${escapeEmailHtml(colon(row.label))} ${escapeEmailHtml(money(row.amountCents))}
      </p>`;
    })
    .join("");

  const text = [
    bodyText.trim(),
    "",
    displayRef,
    showOpportunity ? `${colon(e.opportunity)} ${quote.opportunity_ref}` : "",
    eventBits ? `${colon(e.event)} ${eventBits}` : "",
    ...included.text,
    ...taxText,
    "",
    e.reviewLink,
    publicQuoteUrl,
    input.pdfFilename ? `\n${e.pdfAttachedText(input.pdfFilename)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = brandQuoteEmailShell(
    input.headline || e.headline,
    `
    ${bodyTextToEmailHtml(bodyText)}
    <div style="margin:0 0 18px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.2);">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">${escapeEmailHtml(e.quoteLabel)}</p>
      <p style="margin:0 0 10px;font-size:20px;color:#f8f5ec;">${escapeEmailHtml(displayRef)}</p>
      ${showOpportunity ? `<p style="margin:0;font-size:14px;color:#cfc8b8;">${escapeEmailHtml(e.opportunity)} ${escapeEmailHtml(quote.opportunity_ref)}</p>` : ""}
      ${eventBits ? `<p style="margin:8px 0 0;font-size:14px;color:#cfc8b8;">${escapeEmailHtml(eventBits)}</p>` : ""}
      ${included.html}
      <div style="margin:12px 0 0;${included.html ? "padding:12px 0 0;border-top:1px solid rgba(212,175,55,0.16);" : ""}">${taxHtml}</div>
    </div>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(publicQuoteUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
        ${escapeEmailHtml(e.reviewButton)}
      </a>
    </p>
    ${
      input.pdfFilename
        ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#8b909a;">${escapeEmailHtml(e.pdfAttachedHtml(input.pdfFilename))}</p>`
        : ""
    }
  `,
    emailFooter,
    language
  );

  return { text, html, displayRef };
}

export function quotePdfAttachmentName(
  quote: Pick<QuoteRow, "opportunity_ref" | "revision_number">
): string {
  return `${formatQuoteFilenameStem(quote.opportunity_ref, quote.revision_number)}.pdf`;
}

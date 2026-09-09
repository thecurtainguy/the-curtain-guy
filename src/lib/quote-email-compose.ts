import {
  formatCadFromCents,
  formatQuoteFilenameStem,
  getQuoteTaxBreakdownRows,
  resolveQuoteDisplayRef,
  type QuoteRow,
} from "@/data/quotes";
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
  footer: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
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
  >;
  emailNote?: string;
  defaultBcc?: string;
};

export function getQuoteEmailEventBits(
  quote: QuoteEmailComposeDefaultsInput["quote"]
): string {
  return [quote.event_type, quote.event_date, quote.city_area || quote.venue_name]
    .filter(Boolean)
    .join(" · ");
}

export function buildDefaultQuoteEmailSubject(
  quote: QuoteEmailComposeDefaultsInput["quote"]
): string {
  const displayRef = resolveQuoteDisplayRef(quote);
  return `Your Curtain Guy quote is ready — ${displayRef}`;
}

export function buildDefaultQuoteEmailBodyText(input: {
  quote: QuoteEmailComposeDefaultsInput["quote"];
  emailNote?: string;
}): string {
  const name = input.quote.customer_name?.trim() || "Hello";
  const lines = [
    `${name}, your Curtain Guy quote is ready to review.`,
    "",
    "Open your proposal to accept, request changes, or add options for owner review. No payment is collected on this page.",
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

export function buildQuoteReadyEmailParts(input: {
  quote: QuoteEmailComposeDefaultsInput["quote"];
  publicQuoteUrl: string;
  bodyText: string;
  emailFooter: string;
  pdfFilename?: string | null;
  headline?: string;
}): { text: string; html: string; displayRef: string } {
  const { quote, publicQuoteUrl, bodyText, emailFooter } = input;
  const displayRef = resolveQuoteDisplayRef(quote);
  const eventBits = getQuoteEmailEventBits(quote);
  const taxRows = getQuoteTaxBreakdownRows(quote, { variant: "customer" });
  const taxText = taxRows.map(
    (row) => `${row.label}: ${formatCadFromCents(row.amountCents)}`
  );
  const taxHtml = taxRows
    .map((row) => {
      const isTotal = row.emphasis === "total";
      return `<p style="margin:${isTotal ? "10px" : "0"} 0 ${isTotal ? "0" : "4px"};font-size:${isTotal ? "18px" : "13px"};color:${isTotal ? "#d4af37" : "#cfc8b8"};">
        ${escapeEmailHtml(row.label)}: ${escapeEmailHtml(formatCadFromCents(row.amountCents))}
      </p>`;
    })
    .join("");

  const text = [
    bodyText.trim(),
    "",
    `Quote: ${displayRef}`,
    `Opportunity: ${quote.opportunity_ref}`,
    eventBits ? `Event: ${eventBits}` : "",
    ...taxText,
    "",
    "Review your proposal:",
    publicQuoteUrl,
    input.pdfFilename
      ? `\nA PDF copy is attached (${input.pdfFilename}).`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = brandQuoteEmailShell(
    input.headline || "Your proposal is ready",
    `
    ${bodyTextToEmailHtml(bodyText)}
    <div style="margin:0 0 18px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.2);">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">Quote</p>
      <p style="margin:0 0 10px;font-size:20px;color:#f8f5ec;">${escapeEmailHtml(displayRef)}</p>
      <p style="margin:0;font-size:14px;color:#cfc8b8;">Opportunity ${escapeEmailHtml(quote.opportunity_ref)}</p>
      ${eventBits ? `<p style="margin:8px 0 0;font-size:14px;color:#cfc8b8;">${escapeEmailHtml(eventBits)}</p>` : ""}
      <div style="margin:12px 0 0;">${taxHtml}</div>
    </div>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(publicQuoteUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
        Review your quote
      </a>
    </p>
    ${
      input.pdfFilename
        ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#8b909a;">A PDF copy of this proposal is attached (${escapeEmailHtml(input.pdfFilename)}).</p>`
        : ""
    }
  `,
    emailFooter
  );

  return { text, html, displayRef };
}

export function quotePdfAttachmentName(
  quote: Pick<QuoteRow, "opportunity_ref" | "revision_number">
): string {
  return `${formatQuoteFilenameStem(quote.opportunity_ref, quote.revision_number)}.pdf`;
}

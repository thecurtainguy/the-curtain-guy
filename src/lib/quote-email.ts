import { formatCadFromCents, type QuoteRow } from "@/data/quotes";
import {
  getEstimateNotifyTo,
  getQuoteFrom,
  getSiteUrl,
} from "@/lib/env";

type ResendEmailPayload = {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendResendEmail(payload: ResendEmailPayload): Promise<void> {
  const body: Record<string, unknown> = {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };
  if (payload.replyTo) {
    body.reply_to = payload.replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[quotes] Resend send failed:", response.status, errorBody);
    throw new Error("Failed to send email via Resend");
  }
}

function brandShell(title: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0b0d12;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
    <div style="padding:28px 24px;border-radius:20px;background:linear-gradient(160deg,#151922,#0f1218);border:1px solid rgba(212,175,55,0.28);">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af37;">The Curtain Guy</p>
      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#f8f5ec;">${escapeHtml(title)}</h1>
      ${innerHtml}
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#8b909a;">Montreal event drape rental · thecurtainguy.com</p>
  </div>
</body>
</html>`;
}

export async function sendQuoteReadyEmail(input: {
  apiKey: string;
  quote: QuoteRow;
  publicQuoteUrl: string;
}): Promise<void> {
  const { quote, publicQuoteUrl, apiKey } = input;
  const total = formatCadFromCents(quote.total_cents);
  const eventBits = [
    quote.event_type,
    quote.event_date,
    quote.city_area || quote.venue_name,
  ]
    .filter(Boolean)
    .join(" · ");

  const text = [
    `Your Curtain Guy quote is ready — ${quote.quote_display_ref}`,
    "",
    `Opportunity: ${quote.opportunity_ref}`,
    eventBits ? `Event: ${eventBits}` : "",
    `Total: ${total} CAD`,
    "",
    "Review your proposal, request options, or ask for changes:",
    publicQuoteUrl,
    "",
    "Availability is confirmed only after The Curtain Guy follows up.",
    "No payment is requested in this email.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = brandShell("Your proposal is ready", `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#d7d2c6;">
      ${escapeHtml(quote.customer_name || "Hello")}, your Curtain Guy quote is ready to review.
    </p>
    <div style="margin:0 0 18px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.2);">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">Quote</p>
      <p style="margin:0 0 10px;font-size:20px;color:#f8f5ec;">${escapeHtml(quote.quote_display_ref)}</p>
      <p style="margin:0;font-size:14px;color:#cfc8b8;">Opportunity ${escapeHtml(quote.opportunity_ref)}</p>
      ${eventBits ? `<p style="margin:8px 0 0;font-size:14px;color:#cfc8b8;">${escapeHtml(eventBits)}</p>` : ""}
      <p style="margin:12px 0 0;font-size:18px;color:#d4af37;">${escapeHtml(total)}</p>
    </div>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#d7d2c6;">
      Open your proposal to accept, request changes, or add options for owner review. No payment is collected on this page.
    </p>
    <p style="margin:0 0 8px;">
      <a href="${escapeHtml(publicQuoteUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
        Review your quote
      </a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#8b909a;">
      Availability is not guaranteed until confirmed. Setup, installation, and teardown are planned around your event timeline.
    </p>
  `);

  await sendResendEmail({
    apiKey,
    from: getQuoteFrom(),
    to: [quote.customer_email],
    replyTo: getEstimateNotifyTo(),
    subject: `Your Curtain Guy quote is ready — ${quote.quote_display_ref}`,
    text,
    html,
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
  const text = [
    `Customer action on ${input.quote.quote_display_ref}`,
    `Action: ${input.actionLabel}`,
    input.details || "",
    `Customer: ${input.quote.customer_name || "—"} <${input.quote.customer_email}>`,
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = brandShell("Quote activity", `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#d7d2c6;">
      ${escapeHtml(input.actionLabel)} on <strong style="color:#f8f5ec;">${escapeHtml(input.quote.quote_display_ref)}</strong>
    </p>
    ${
      input.details
        ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#cfc8b8;">${escapeHtml(input.details)}</p>`
        : ""
    }
    <p style="margin:0 0 16px;font-size:14px;color:#cfc8b8;">
      ${escapeHtml(input.quote.customer_name || "Customer")} · ${escapeHtml(input.quote.customer_email)}
    </p>
    <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
      Open in admin
    </a>
  `);

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    to: [getEstimateNotifyTo()],
    replyTo: input.quote.customer_email,
    subject: `${input.actionLabel} — ${input.quote.quote_display_ref}`,
    text,
    html,
  });
}

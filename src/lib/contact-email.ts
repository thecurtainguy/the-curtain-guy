import { getEnglishOptionLabel } from "@/data/estimate";
import { getContactFrom, getContactNotifyTo } from "@/lib/env";
import type { ContactFormData } from "@/lib/contact-schema";

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

function displayValue(value: string): string {
  return value.trim() || "—";
}

function formatEventType(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  return getEnglishOptionLabel("eventTypes", trimmed) ?? trimmed;
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
    console.error("[contact] Resend send failed:", response.status, errorBody);
    throw new Error("Failed to send email via Resend");
  }
}

function buildContactNotificationText(data: ContactFormData): string {
  const lines = [
    "New contact request from thecurtainguy.com",
    "",
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    `Phone: ${displayValue(data.phone)}`,
    `Event type: ${formatEventType(data.eventType)}`,
    `Event date: ${displayValue(data.eventDate)}`,
    `Venue / location: ${displayValue(data.venue)}`,
    `Message: ${data.message.trim()}`,
    "",
    "Source page: /contact",
  ];

  return lines.join("\n");
}

function buildContactNotificationHtml(data: ContactFormData): string {
  const rows = [
    { label: "Name", value: data.name.trim() },
    { label: "Email", value: data.email.trim() },
    { label: "Phone", value: displayValue(data.phone) },
    { label: "Event type", value: formatEventType(data.eventType) },
    { label: "Event date", value: displayValue(data.eventDate) },
    { label: "Venue / location", value: displayValue(data.venue) },
    { label: "Message", value: data.message.trim() },
    { label: "Source page", value: "/contact" },
  ];

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap;width:140px;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;line-height:1.5;vertical-align:top;">${escapeHtml(row.value).replace(/\n/g, "<br>")}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;">The Curtain Guy</p>
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">New contact request</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">Reply to this email to reach the customer directly.</p>
    </div>
  </body>
</html>`;
}

export async function sendContactNotificationEmail(input: {
  data: ContactFormData;
  apiKey: string;
}): Promise<void> {
  const { data, apiKey } = input;
  const customerEmail = data.email.trim();

  await sendResendEmail({
    apiKey,
    from: getContactFrom(),
    to: [getContactNotifyTo()],
    replyTo: customerEmail || undefined,
    subject: "New contact request — The Curtain Guy",
    text: buildContactNotificationText(data),
    html: buildContactNotificationHtml(data),
  });
}

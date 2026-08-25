import { getReviewCategoryLabel } from "@/data/reviews";
import { getContactFrom, getContactNotifyTo } from "@/lib/env";
import type { ReviewSubmissionData } from "@/lib/review-submission-schema";

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

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
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
    console.error("[reviews] Resend send failed:", response.status, errorBody);
    throw new Error("Failed to send email via Resend");
  }
}

function buildReviewNotificationText(data: ReviewSubmissionData): string {
  return [
    "New client review submission from thecurtainguy.com",
    "",
    "--- CONTACT ---",
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    `Phone: ${displayValue(data.phone)}`,
    `Role / title: ${displayValue(data.role)}`,
    `Organization: ${displayValue(data.organization)}`,
    "",
    "--- EVENT ---",
    `Category: ${data.eventCategory ? getReviewCategoryLabel(data.eventCategory) : "—"}`,
    `Event label: ${displayValue(data.eventLabel)}`,
    `Event date: ${displayValue(data.eventDate)}`,
    `Venue: ${displayValue(data.venue)}`,
    `Location: ${displayValue(data.location)}`,
    "",
    "--- REVIEW ---",
    `Rating: ${data.rating}/5`,
    `Would recommend: ${data.wouldRecommend}`,
    `Services used: ${displayValue(data.servicesUsed)}`,
    `Highlights: ${displayValue(data.highlights)}`,
    "",
    "Experience:",
    data.experience.trim(),
    "",
    "--- PERMISSIONS ---",
    `OK to publish on website: ${yesNo(data.publishOnWebsite)}`,
    `OK to contact for follow-up: ${yesNo(data.okToContact)}`,
    "",
    "Source page: /reviews",
  ].join("\n");
}

function buildReviewNotificationHtml(data: ReviewSubmissionData): string {
  const rows = [
    { label: "Name", value: data.name.trim() },
    { label: "Email", value: data.email.trim() },
    { label: "Phone", value: displayValue(data.phone) },
    { label: "Role / title", value: displayValue(data.role) },
    { label: "Organization", value: displayValue(data.organization) },
    {
      label: "Event category",
      value: data.eventCategory
        ? getReviewCategoryLabel(data.eventCategory)
        : "—",
    },
    { label: "Event label", value: displayValue(data.eventLabel) },
    { label: "Event date", value: displayValue(data.eventDate) },
    { label: "Venue", value: displayValue(data.venue) },
    { label: "Location", value: displayValue(data.location) },
    { label: "Rating", value: `${data.rating}/5` },
    { label: "Would recommend", value: data.wouldRecommend },
    { label: "Services used", value: displayValue(data.servicesUsed) },
    { label: "Highlights", value: displayValue(data.highlights) },
    { label: "Experience", value: data.experience.trim() },
    { label: "Publish on website", value: yesNo(data.publishOnWebsite) },
    { label: "OK to contact", value: yesNo(data.okToContact) },
    { label: "Source page", value: "/reviews" },
  ];

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap;width:150px;">${escapeHtml(row.label)}</td>
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
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">New client review submission</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendReviewSubmissionEmail(input: {
  data: ReviewSubmissionData;
  apiKey: string;
}): Promise<void> {
  const { data, apiKey } = input;

  await sendResendEmail({
    apiKey,
    from: getContactFrom(),
    to: [getContactNotifyTo()],
    replyTo: data.email.trim() || undefined,
    subject: `New review submission (${data.rating}/5) — The Curtain Guy`,
    text: buildReviewNotificationText(data),
    html: buildReviewNotificationHtml(data),
  });
}

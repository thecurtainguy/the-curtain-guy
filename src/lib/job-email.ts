import { formatJobRef, type EventJobRow } from "@/data/jobs";
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
    console.error("[jobs] Resend send failed:", response.status, errorBody);
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

export async function sendJobConfirmedEmail(input: {
  apiKey: string;
  job: EventJobRow;
}): Promise<void> {
  const { job, apiKey } = input;
  const to = job.customer_email?.trim();
  if (!to) return;

  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const accountUrl = `${siteUrl}/account/events/${job.id}`;
  const ref = formatJobRef(job.opportunity_ref);

  const text = [
    `Your Curtain Guy event is confirmed — ${job.opportunity_ref}`,
    "",
    ref,
    job.event_date ? `Event date: ${job.event_date}` : "",
    job.venue_name ? `Venue: ${job.venue_name}` : "",
    "",
    "View your event details and send updates in your account:",
    accountUrl,
    "",
    "We will follow up with install and teardown scheduling as planning continues.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = brandShell(
    `Your event is confirmed — ${escapeHtml(job.opportunity_ref)}`,
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d8dce3;">
      Your booked event is now available in your Curtain Guy account.
    </p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#aeb4bf;">
      ${job.event_date ? `Event date: <strong style="color:#f8f5ec;">${escapeHtml(job.event_date)}</strong><br/>` : ""}
      ${job.venue_name ? `Venue: ${escapeHtml(job.venue_name)}` : ""}
    </p>
    <p style="margin:0 0 18px;">
      <a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#d4af37;color:#0b0d12;font-size:14px;font-weight:600;text-decoration:none;">View your event</a>
    </p>`
  );

  await sendResendEmail({
    apiKey,
    from: getQuoteFrom(),
    to: [to],
    subject: `Your Curtain Guy event is confirmed — ${job.opportunity_ref}`,
    text,
    html,
  });
}

export async function sendJobMessageNotifyOwner(input: {
  apiKey: string;
  job: EventJobRow;
  senderName?: string | null;
  messagePreview: string;
}): Promise<void> {
  const notifyTo = getEstimateNotifyTo();
  if (!notifyTo) return;

  const adminUrl = `${getSiteUrl().replace(/\/$/, "")}/admin/jobs/${input.job.id}`;
  const sender = input.senderName?.trim() || "Customer";

  const text = [
    `New event message — ${input.job.opportunity_ref}`,
    "",
    `From: ${sender}`,
    "",
    input.messagePreview.slice(0, 500),
    "",
    `Open job: ${adminUrl}`,
  ].join("\n");

  const html = brandShell(
    `New event message — ${escapeHtml(input.job.opportunity_ref)}`,
    `<p style="margin:0 0 10px;font-size:14px;color:#aeb4bf;">From ${escapeHtml(sender)}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#f8f5ec;white-space:pre-wrap;">${escapeHtml(input.messagePreview.slice(0, 500))}</p>
    <p style="margin:0;"><a href="${escapeHtml(adminUrl)}" style="color:#d4af37;">Open job in admin</a></p>`
  );

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    to: [notifyTo],
    subject: `New event message — ${input.job.opportunity_ref}`,
    text,
    html,
    replyTo: input.job.customer_email ?? undefined,
  });
}

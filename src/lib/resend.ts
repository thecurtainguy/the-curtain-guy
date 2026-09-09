import { getOutboundEmailCopyTo } from "@/lib/env";

export type ResendEmailAttachment = {
  filename: string;
  /** Base64-encoded file contents (Resend API). */
  content: string;
  contentType?: string;
};

export type ResendEmailPayload = {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  bcc?: string[];
  attachments?: ResendEmailAttachment[];
  /** When true (default), BCC admin@ so outbound customer mail is archived. */
  copyOutbound?: boolean;
  logLabel?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function recipientsInclude(list: string[], email: string): boolean {
  const target = normalizeEmail(email);
  return list.some((entry) => normalizeEmail(entry) === target);
}

/**
 * Sends via Resend. By default BCC's admin@thecurtainguy.com on any message
 * that is not already addressed to that inbox, so customer-facing mail is archived.
 */
export async function sendResendEmail(
  payload: ResendEmailPayload
): Promise<void> {
  const copyOutbound = payload.copyOutbound !== false;
  const bcc = [...(payload.bcc ?? [])];

  if (copyOutbound) {
    const copyTo = getOutboundEmailCopyTo().trim();
    if (
      copyTo &&
      !recipientsInclude(payload.to, copyTo) &&
      !recipientsInclude(bcc, copyTo)
    ) {
      bcc.push(copyTo);
    }
  }

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
  if (bcc.length > 0) {
    body.bcc = bcc;
  }
  if (payload.attachments && payload.attachments.length > 0) {
    body.attachments = payload.attachments.map((file) => ({
      filename: file.filename,
      content: file.content,
      ...(file.contentType ? { content_type: file.contentType } : {}),
    }));
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
    const label = payload.logLabel || "email";
    console.error(`[${label}] Resend send failed:`, response.status, errorBody);
    throw new Error("Failed to send email via Resend");
  }
}

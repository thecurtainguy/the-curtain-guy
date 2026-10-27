import { createHmac, timingSafeEqual } from "node:crypto";
import { getEstimateNotifyTo, getOutboundEmailCopyTo } from "@/lib/env";
import type { DocumentTarget } from "@/lib/document-views";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type EmailMessageRow = {
  id: string;
  resend_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  audience: "customer" | "owner_copy";
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string | null;
  sent_at: string;
  delivered_at: string | null;
  delayed_at: string | null;
  bounced_at: string | null;
  bounce_message: string | null;
  complained_at: string | null;
  failed_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  first_clicked_at: string | null;
  click_count: number;
  last_event: string | null;
  last_event_at: string | null;
};

const norm = (email: string) => email.trim().toLowerCase();

/** Archive inboxes of The Curtain Guy; these get a separate copy so their clicks never count as customer views. */
export function ownerArchiveAddresses(extra: Array<string | null | undefined> = []): string[] {
  return [getOutboundEmailCopyTo(), getEstimateNotifyTo(), ...extra]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(norm);
}

/** Moves owner archive addresses out of Bcc into a separate owner copy. */
export function splitOwnerCopy(
  bcc: string[],
  ownerAddresses: string[]
): { bcc: string[]; ownerCopyTo: string[] } {
  const owners = new Set(ownerAddresses.map(norm));
  const ownerCopyTo: string[] = [];
  const rest: string[] = [];
  for (const email of bcc) {
    if (owners.has(norm(email))) {
      if (!ownerCopyTo.some((item) => norm(item) === norm(email))) ownerCopyTo.push(email);
    } else {
      rest.push(email);
    }
  }
  return { bcc: rest, ownerCopyTo };
}

export function isEmailTrackingConfigured(): boolean {
  return Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
}

export async function recordEmailMessage(input: {
  resendId: string | null;
  target: DocumentTarget;
  audience: "customer" | "owner_copy";
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("email_messages").insert({
    resend_id: input.resendId,
    quote_id: "quoteId" in input.target ? input.target.quoteId : null,
    invoice_id: "invoiceId" in input.target ? input.target.invoiceId : null,
    audience: input.audience,
    to_emails: input.to,
    cc_emails: input.cc ?? [],
    bcc_emails: input.bcc ?? [],
    subject: input.subject,
  });
  if (error) {
    console.error("[email-tracking] record message", error);
    return;
  }
  if (input.resendId) await replayOrphanEvents(input.resendId);
}

/** Webhooks can arrive before the message row exists; re-apply those events now that it does. */
async function replayOrphanEvents(resendId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("email_message_events")
    .select("id, webhook_id, event_type, occurred_at, payload")
    .eq("resend_id", resendId)
    .is("email_message_id", null);
  for (const event of data ?? []) {
    await admin.from("email_message_events").delete().eq("id", event.id);
    await admin.rpc("tcg_record_email_event", {
      p_webhook_id: event.webhook_id,
      p_resend_id: resendId,
      p_event_type: event.event_type,
      p_occurred_at: event.occurred_at,
      p_payload: event.payload,
    });
  }
}

export async function listEmailMessages(target: DocumentTarget): Promise<EmailMessageRow[]> {
  const admin = createAdminSupabaseClient();
  const column = "quoteId" in target ? "quote_id" : "invoice_id";
  const value = "quoteId" in target ? target.quoteId : target.invoiceId;
  const { data, error } = await admin
    .from("email_messages")
    .select("*")
    .eq(column, value)
    .order("sent_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("[email-tracking] list messages", error);
    return [];
  }
  return (data ?? []) as EmailMessageRow[];
}

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/** Svix signature check used by Resend webhooks (`whsec_` secret, `v1,<base64>` signatures). */
export function verifyResendWebhook(input: {
  payload: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
}): boolean {
  const { payload, id, timestamp, signature, secret } = input;
  if (!id || !timestamp || !signature) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export async function recordEmailWebhookEvent(input: {
  webhookId: string;
  resendId: string;
  type: string;
  occurredAt: string | null;
  payload: unknown;
}): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("tcg_record_email_event", {
    p_webhook_id: input.webhookId,
    p_resend_id: input.resendId,
    p_event_type: input.type,
    p_occurred_at: input.occurredAt,
    p_payload: input.payload,
  });
  if (error) {
    console.error("[email-tracking] webhook event", error);
    return null;
  }
  return data as string;
}

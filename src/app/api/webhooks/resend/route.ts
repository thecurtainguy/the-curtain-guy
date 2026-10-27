import { NextResponse } from "next/server";
import { recordEmailWebhookEvent, verifyResendWebhook } from "@/lib/email-tracking";

export const runtime = "nodejs";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: { email_id?: string; created_at?: string };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, message: "Webhook secret not configured." }, { status: 503 });
  }

  const payload = await request.text();
  const webhookId = request.headers.get("svix-id");
  const valid = verifyResendWebhook({
    payload,
    id: webhookId,
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    secret,
  });
  if (!valid || !webhookId) {
    return NextResponse.json({ ok: false, message: "Invalid signature." }, { status: 400 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const resendId = event.data?.email_id;
  if (!event.type?.startsWith("email.") || !resendId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await recordEmailWebhookEvent({
    webhookId,
    resendId,
    type: event.type,
    occurredAt: event.created_at ?? null,
    payload: event,
  });
  if (result === null) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result });
}

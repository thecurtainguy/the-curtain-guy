import { NextRequest, NextResponse } from "next/server";
import { sendContactNotificationEmail } from "@/lib/contact-email";
import {
  CONTACT_MAX_PAYLOAD_BYTES,
  isContactHoneypotTriggered,
  parseContactFormPayload,
  validateContactSubmission,
} from "@/lib/contact-schema";
import { getResendApiKey } from "@/lib/env";

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10);

    if (Number.isFinite(bytes) && bytes > CONTACT_MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Request payload is too large." },
        { status: 413 }
      );
    }
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  if (rawBody.length > CONTACT_MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Request payload is too large." },
      { status: 413 }
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (isContactHoneypotTriggered(payload)) {
    return NextResponse.json({
      ok: true,
      message: "Thanks — your message was sent. We’ll get back to you shortly.",
    });
  }

  const data = parseContactFormPayload(payload);

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Invalid contact submission payload." },
      { status: 400 }
    );
  }

  const validation = validateContactSubmission(data);

  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        message: validation.message ?? "Validation failed.",
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 }
    );
  }

  const resendApiKey = getResendApiKey();

  if (!resendApiKey) {
    console.warn("[contact] RESEND_API_KEY missing; cannot send contact email.");
    return NextResponse.json(
      {
        ok: false,
        message:
          "Something went wrong. Please email info@thecurtainguy.com directly.",
      },
      { status: 503 }
    );
  }

  try {
    await sendContactNotificationEmail({ data, apiKey: resendApiKey });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Something went wrong. Please email info@thecurtainguy.com directly.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Thanks — your message was sent. We’ll get back to you shortly.",
  });
}

export function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}

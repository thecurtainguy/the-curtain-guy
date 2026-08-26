import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  sendEventPlanCustomerConfirmationEmail,
  sendEventPlanNotificationEmail,
} from "@/lib/email";
import {
  EVENT_PLAN_MAX_PAYLOAD_BYTES,
  insertEventPlanSubmission,
  isEventPlanHoneypotTriggered,
  parseEventPlanPayload,
  validateEventPlanSubmission,
} from "@/lib/event-builder/event-plan-server";
import { normalizeStudioDesign } from "@/data/studio";
import { getResendApiKey, getSupabaseServerConfig } from "@/lib/env";

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(bytes) && bytes > EVENT_PLAN_MAX_PAYLOAD_BYTES) {
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

  if (rawBody.length > EVENT_PLAN_MAX_PAYLOAD_BYTES) {
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

  if (isEventPlanHoneypotTriggered(payload)) {
    return NextResponse.json({
      ok: true,
      reference: "EP-HONEYPOT",
      message: "Your event plan was submitted successfully.",
    });
  }

  const parsed = parseEventPlanPayload(payload);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, message: "Invalid event plan submission payload." },
      { status: 400 }
    );
  }

  const validation = validateEventPlanSubmission(parsed);
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

  const config = getSupabaseServerConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, message: "Server configuration error." },
      { status: 503 }
    );
  }

  const normalizedDesign = normalizeStudioDesign(parsed.design);

  const submissionPayload = {
    ...parsed,
    design: normalizedDesign,
  };

  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);
  const userId =
    user && profile?.profile.role === "customer" ? user.id : user?.id ?? null;

  const insertResult = await insertEventPlanSubmission(config, submissionPayload, {
    submittedFromUrl: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    userId: profile?.profile.role === "owner" ? null : userId,
  });

  if (!insertResult.ok) {
    return NextResponse.json(
      { ok: false, message: insertResult.message },
      { status: 500 }
    );
  }

  const apiKey = getResendApiKey();
  if (apiKey) {
    try {
      await sendEventPlanNotificationEmail({
        reference: insertResult.reference,
        brief: parsed.brief,
        design: normalizedDesign,
        contact: parsed.contact,
        apiKey,
      });
      await sendEventPlanCustomerConfirmationEmail({
        reference: insertResult.reference,
        brief: parsed.brief,
        design: normalizedDesign,
        contact: parsed.contact,
        apiKey,
      });
    } catch (error) {
      console.error("[event-plan] Email send failed:", error);
    }
  } else {
    console.warn("[event-plan] RESEND_API_KEY not set — emails skipped.");
  }

  return NextResponse.json({
    ok: true,
    reference: insertResult.reference,
    id: insertResult.id,
    message: "Your event plan was submitted successfully.",
  });
}

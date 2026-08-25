import { NextRequest, NextResponse } from "next/server";
import { getResendApiKey } from "@/lib/env";
import { insertReviewSubmission } from "@/lib/review-submissions";
import { sendReviewSubmissionEmail } from "@/lib/review-submission-email";
import {
  REVIEW_MAX_PAYLOAD_BYTES,
  isReviewHoneypotTriggered,
  parseReviewSubmissionPayload,
  validateReviewSubmission,
} from "@/lib/review-submission-schema";

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(bytes) && bytes > REVIEW_MAX_PAYLOAD_BYTES) {
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

  if (rawBody.length > REVIEW_MAX_PAYLOAD_BYTES) {
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

  if (isReviewHoneypotTriggered(payload)) {
    return NextResponse.json({
      ok: true,
      message: "Thanks — your review was sent. We appreciate you taking the time.",
    });
  }

  const data = parseReviewSubmissionPayload(payload);

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Invalid review submission payload." },
      { status: 400 }
    );
  }

  const validation = validateReviewSubmission(data);

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

  const insertResult = await insertReviewSubmission(data, {
    submittedFromUrl: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!insertResult.ok) {
    return NextResponse.json(
      { ok: false, message: insertResult.message },
      { status: 500 }
    );
  }

  if (!resendApiKey) {
    console.warn("[reviews] RESEND_API_KEY missing; saved submission without email.");
    return NextResponse.json({
      ok: true,
      message:
        "Thanks — your review was saved. We'll review it and may follow up before publishing.",
    });
  }

  try {
    await sendReviewSubmissionEmail({ data, apiKey: resendApiKey });
  } catch {
    console.warn(
      "[reviews] Email failed after DB save; submission id:",
      insertResult.id
    );
    return NextResponse.json({
      ok: true,
      message:
        "Thanks — your review was saved. We'll review it and may follow up before publishing.",
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Thanks — your review was sent. We'll review it and may follow up before publishing.",
  });
}

export function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}

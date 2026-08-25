import { NextRequest, NextResponse } from "next/server";
import { sendEstimateNotificationEmail } from "@/lib/email";
import {
  insertEstimateRequest,
  parseEstimateFormPayload,
  validateEstimateSubmission,
} from "@/lib/estimate-server";
import { getResendApiKey, getSupabaseServerConfig } from "@/lib/env";

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const data = parseEstimateFormPayload(payload);

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Invalid estimate submission payload." },
      { status: 400 }
    );
  }

  const validation = validateEstimateSubmission(data);

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

  const supabaseConfig = getSupabaseServerConfig();

  if (!supabaseConfig) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Online estimate submission is not configured yet. Please use the email option.",
      },
      { status: 503 }
    );
  }

  const insertResult = await insertEstimateRequest(
    supabaseConfig,
    data,
    {
      submittedFromUrl:
        request.headers.get("referer") ?? request.headers.get("origin"),
      userAgent: request.headers.get("user-agent"),
    }
  );

  if (!insertResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: insertResult.message,
      },
      { status: 500 }
    );
  }

  const resendApiKey = getResendApiKey();

  if (resendApiKey) {
    try {
      await sendEstimateNotificationEmail({
        requestId: insertResult.id,
        data,
        apiKey: resendApiKey,
      });
    } catch {
      console.warn(
        "[estimate] Request saved but notification email failed:",
        insertResult.id
      );
    }
  } else {
    console.warn(
      "[estimate] RESEND_API_KEY missing; skipped notification email for:",
      insertResult.id
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: insertResult.id,
    message: "Your estimate brief was submitted successfully.",
  });
}

export function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}

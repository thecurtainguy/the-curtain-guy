import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  sendEstimateCustomerConfirmationEmail,
  sendEstimateNotificationEmail,
} from "@/lib/email";
import {
  ESTIMATE_MAX_PAYLOAD_BYTES,
  insertEstimateRequest,
  isHoneypotTriggered,
  parseEstimateFormPayload,
  validateEstimateSubmission,
} from "@/lib/estimate-server";
import {
  createUploadToken,
  ESTIMATE_MAX_FILES,
} from "@/lib/estimate-files";
import { getResendApiKey, getSupabaseServerConfig } from "@/lib/env";

type EstimateViewerRole = "guest" | "customer" | "owner";

function resolveViewerRole(
  authenticated: boolean,
  role: string | null | undefined
): EstimateViewerRole {
  if (!authenticated) return "guest";
  if (role === "owner") return "owner";
  return "customer";
}

function parseExpectedFileCount(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const raw = (payload as Record<string, unknown>).expectedFileCount;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(ESTIMATE_MAX_FILES, Math.floor(raw)));
}

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10);

    if (Number.isFinite(bytes) && bytes > ESTIMATE_MAX_PAYLOAD_BYTES) {
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

  if (rawBody.length > ESTIMATE_MAX_PAYLOAD_BYTES) {
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

  if (isHoneypotTriggered(payload)) {
    return NextResponse.json({
      ok: true,
      message: "Your estimate brief was submitted successfully.",
    });
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

  const expectedFileCount = parseExpectedFileCount(payload);
  const uploadBundle =
    expectedFileCount > 0 ? createUploadToken() : null;

  // Server-side session only — never trust a client-provided user_id.
  const authUser = await getCurrentUser();
  const currentProfile = authUser ? await getCurrentProfile() : null;
  const viewerRole = resolveViewerRole(
    Boolean(authUser),
    currentProfile?.profile.role
  );

  const insertResult = await insertEstimateRequest(
    supabaseConfig,
    data,
    {
      submittedFromUrl:
        request.headers.get("referer") ?? request.headers.get("origin"),
      userAgent: request.headers.get("user-agent"),
      userId: authUser?.id ?? null,
      uploadTokenHash: uploadBundle?.hash ?? null,
      uploadTokenExpiresAt: uploadBundle?.expiresAt ?? null,
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
  let adminEmailFailed = false;
  let customerEmailFailed = false;

  if (resendApiKey) {
    try {
      await sendEstimateNotificationEmail({
        requestId: insertResult.id,
        opportunityRef: insertResult.opportunity_ref,
        data,
        apiKey: resendApiKey,
        fileCount: expectedFileCount,
      });
    } catch {
      adminEmailFailed = true;
      console.warn(
        "[estimate] Request saved but admin notification email failed:",
        insertResult.id
      );
    }

    try {
      await sendEstimateCustomerConfirmationEmail({
        requestId: insertResult.id,
        opportunityRef: insertResult.opportunity_ref,
        data,
        apiKey: resendApiKey,
        fileCount: expectedFileCount,
      });
    } catch {
      customerEmailFailed = true;
      console.warn(
        "[estimate] Request saved but customer confirmation email failed:",
        insertResult.id
      );
    }

    if (adminEmailFailed && customerEmailFailed) {
      console.warn(
        "[estimate] Both notification emails failed for saved request:",
        insertResult.id
      );
    }
  } else {
    console.warn(
      "[estimate] RESEND_API_KEY missing; skipped notification emails for:",
      insertResult.id
    );
  }

  const requestId = insertResult.id;
  const isAuthenticated = Boolean(authUser);
  const accountEstimateHref = isAuthenticated
    ? `/account/estimates/${requestId}`
    : null;
  const adminEstimateHref =
    viewerRole === "owner" ? `/admin/estimates/${requestId}` : null;

  return NextResponse.json({
    ok: true,
    requestId,
    opportunity_ref: insertResult.opportunity_ref,
    opportunity_number: insertResult.opportunity_number,
    uploadToken: uploadBundle?.token ?? null,
    expectedFileCount,
    isAuthenticated,
    viewerRole,
    accountEstimateHref,
    adminEstimateHref,
    message: "Your estimate brief was submitted successfully.",
  });
}

export function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}

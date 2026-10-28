import { after, NextRequest, NextResponse } from "next/server";
import type { EstimateFormData } from "@/data/estimate";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { checkEmailDeliverability } from "@/lib/email-deliverability";
import { fetchEstimateById, type EstimateFileRow } from "@/lib/estimate-access";
import {
  buildTeamEmailFiles,
  linkOnlyTeamEmailFiles,
  waitForSubmissionUploads,
} from "@/lib/estimate-team-files";
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
import {
  detectRequestLanguage,
  rememberPreferredLanguage,
} from "@/lib/request-language";

type EstimateViewerRole = "guest" | "customer" | "owner";

function resolveViewerRole(
  authenticated: boolean,
  role: string | null | undefined
): EstimateViewerRole {
  if (!authenticated) return "guest";
  if (role === "owner") return "owner";
  return "customer";
}

/** Covers the upload wait plus downloading and sending the attachments. */
export const maxDuration = 60;

/**
 * The browser uploads files only after this route responds, so the team email
 * waits for them and attaches what arrived. Falls back to links, then to a
 * plain email, so the lead is never lost.
 */
async function notifyTeamWithUploads(input: {
  requestId: string;
  opportunityRef: string | null;
  data: EstimateFormData;
  apiKey: string;
  expectedFileCount: number;
}): Promise<void> {
  const base = {
    requestId: input.requestId,
    opportunityRef: input.opportunityRef,
    data: input.data,
    apiKey: input.apiKey,
    fileCount: input.expectedFileCount,
  };
  let rows: EstimateFileRow[] = [];
  try {
    const estimate = await fetchEstimateById(input.requestId);
    rows = await waitForSubmissionUploads({
      estimateRequestId: input.requestId,
      estimateCreatedAt: estimate?.created_at ?? new Date().toISOString(),
      expectedCount: input.expectedFileCount,
    });
    await sendEstimateNotificationEmail({
      ...base,
      files: await buildTeamEmailFiles(rows, input.expectedFileCount),
    });
    return;
  } catch (error) {
    console.warn("[estimate] Team email with attachments failed:", input.requestId, error);
  }
  try {
    await sendEstimateNotificationEmail({
      ...base,
      files: await linkOnlyTeamEmailFiles(rows, input.expectedFileCount),
    });
    return;
  } catch (error) {
    console.warn("[estimate] Team email with file links failed:", input.requestId, error);
  }
  try {
    await sendEstimateNotificationEmail(base);
  } catch {
    console.warn("[estimate] Request saved but admin notification email failed:", input.requestId);
  }
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

  // Server-side session only — never trust a client-provided user_id.
  const authUser = await getCurrentUser();
  const currentProfile = authUser ? await getCurrentProfile() : null;
  const viewerRole = resolveViewerRole(
    Boolean(authUser),
    currentProfile?.profile.role
  );
  const language = detectRequestLanguage(request);

  const validation = validateEstimateSubmission(data, {
    phoneOptional: viewerRole === "owner",
  });

  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        message:
          validation.fieldErrors?.phone && Object.keys(validation.fieldErrors).length === 1
            ? validation.fieldErrors.phone
            : (validation.message ?? "Validation failed."),
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 }
    );
  }

  const deliverable = await checkEmailDeliverability(data.email, language);
  if (!deliverable.ok) {
    return NextResponse.json(
      { ok: false, message: deliverable.message, fieldErrors: { email: deliverable.message } },
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

  const insertResult = await insertEstimateRequest(
    supabaseConfig,
    data,
    {
      language,
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

  if (viewerRole === "customer") {
    await rememberPreferredLanguage(authUser?.id, language);
  }

  const resendApiKey = getResendApiKey();
  let adminEmailFailed = false;
  let customerEmailFailed = false;

  if (resendApiKey && expectedFileCount > 0) {
    const savedId = insertResult.id;
    const opportunityRef = insertResult.opportunity_ref;
    after(() =>
      notifyTeamWithUploads({
        requestId: savedId,
        opportunityRef,
        data,
        apiKey: resendApiKey,
        expectedFileCount,
      })
    );
  } else if (resendApiKey) {
    try {
      await sendEstimateNotificationEmail({
        requestId: insertResult.id,
        opportunityRef: insertResult.opportunity_ref,
        data,
        apiKey: resendApiKey,
      });
    } catch {
      adminEmailFailed = true;
      console.warn(
        "[estimate] Request saved but admin notification email failed:",
        insertResult.id
      );
    }
  }

  if (resendApiKey) {
    try {
      await sendEstimateCustomerConfirmationEmail({
        requestId: insertResult.id,
        opportunityRef: insertResult.opportunity_ref,
        data,
        apiKey: resendApiKey,
        fileCount: expectedFileCount,
        language,
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

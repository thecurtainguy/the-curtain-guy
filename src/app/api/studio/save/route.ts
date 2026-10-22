import { NextResponse, type NextRequest } from "next/server";
import { getResendApiKey, getSiteUrl } from "@/lib/env";
import {
  parseStudioRequestBody,
  studioErrorHttpStatus,
  studioEventDetailsFromRow,
} from "@/lib/studio";
import {
  sendStudioDesignSavedEmail,
  sendStudioLeadOwnerNotification,
} from "@/lib/studio-lead-email";
import {
  applyStudioVisitorCookie,
  consumeStudioRateLimit,
  getStudioClientIp,
  getStudioLeadRequestMeta,
  resolveStudioVisitorId,
  saveVisitorLead,
} from "@/lib/studio-leads-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rateLimited() {
  return NextResponse.json(
    {
      ok: false,
      code: "rate_limited",
      message: "Too many save attempts. Please wait a few minutes and try again.",
    },
    { status: 429 }
  );
}

/** Contact-captured save for visitors without an account. */
export async function POST(request: NextRequest) {
  const ip = getStudioClientIp(request);
  if (!consumeStudioRateLimit(`lead-save:${ip}`, 8, 15 * 60_000)) {
    return rateLimited();
  }

  const parsed = await parseStudioRequestBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, code: "validation", message: parsed.message },
      { status: parsed.status }
    );
  }

  const honeypot = parsed.body.website;
  if (typeof honeypot === "string" && honeypot.trim()) {
    return NextResponse.json({ ok: true, id: null, emailed: true });
  }

  const contact = parsed.body.contact as { email?: unknown } | undefined;
  const emailKey =
    typeof contact?.email === "string" ? contact.email.trim().toLowerCase() : "";
  if (emailKey && !consumeStudioRateLimit(`lead-email:${emailKey}`, 4, 60 * 60_000)) {
    return rateLimited();
  }

  const { visitorId, issued } = resolveStudioVisitorId(request.cookies);
  const meta = getStudioLeadRequestMeta(request, parsed.body.language);
  const result = await saveVisitorLead(visitorId, parsed.body, meta);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
        fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      },
      { status: studioErrorHttpStatus(result.code) }
    );
  }

  const resumePath = `/studio/d/${result.token}`;
  const details = studioEventDetailsFromRow(result.row);
  let emailed = false;
  const apiKey = getResendApiKey();
  if (apiKey) {
    try {
      await sendStudioDesignSavedEmail({
        apiKey,
        to: result.contact.email,
        name: result.contact.name,
        title: result.row.title,
        resumeUrl: `${getSiteUrl()}${resumePath}`,
        details,
        language: result.row.language,
      });
      emailed = true;
    } catch {
      console.error("[studio-leads] customer email failed");
    }
    if (result.newLead) {
      try {
        await sendStudioLeadOwnerNotification({
          apiKey,
          designId: result.row.id,
          title: result.row.title,
          contact: result.contact,
          details,
          language: result.row.language,
          source: result.row.source,
        });
      } catch {
        console.error("[studio-leads] owner notification failed");
      }
    }
  } else {
    console.warn("[studio-leads] RESEND_API_KEY not set — emails skipped.");
  }

  const response = NextResponse.json({
    ok: true,
    id: result.row.id,
    updatedAt: result.row.updated_at,
    resumePath,
    emailed,
  });
  if (issued) applyStudioVisitorCookie(response, visitorId);
  return response;
}

import { NextResponse, type NextRequest } from "next/server";
import {
  parseStudioRequestBody,
  studioErrorHttpStatus,
  type StudioFailure,
} from "@/lib/studio";
import {
  applyStudioVisitorCookie,
  autosaveVisitorDesign,
  consumeStudioRateLimit,
  getStudioClientIp,
  getStudioLeadRequestMeta,
  getVisitorDraft,
  readStudioVisitorId,
  resolveStudioVisitorId,
  toStudioVisitorDraft,
} from "@/lib/studio-leads-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: StudioFailure) {
  return NextResponse.json(
    { ok: false, code: error.code, message: error.message },
    { status: studioErrorHttpStatus(error.code) }
  );
}

function rateLimited() {
  return NextResponse.json(
    { ok: false, code: "rate_limited", message: "Too many saves — please slow down." },
    { status: 429 }
  );
}

/** Anonymous autosave: creates or updates the visitor's row for this room. */
export async function POST(request: NextRequest) {
  const ip = getStudioClientIp(request);
  if (!consumeStudioRateLimit(`autosave:${ip}`, 120, 10 * 60_000)) {
    return rateLimited();
  }

  const parsed = await parseStudioRequestBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, code: "validation", message: parsed.message },
      { status: parsed.status }
    );
  }
  if (
    !parsed.body.id &&
    !consumeStudioRateLimit(`autosave-create:${ip}`, 12, 60 * 60_000)
  ) {
    return rateLimited();
  }

  const { visitorId, issued } = resolveStudioVisitorId(request.cookies);
  const meta = getStudioLeadRequestMeta(request, parsed.body.language);
  const result = await autosaveVisitorDesign(visitorId, parsed.body, meta);
  if (!result.ok) return errorResponse(result);

  const response = NextResponse.json({
    ok: true,
    id: result.row.id,
    updatedAt: result.row.updated_at,
    lastActivityAt: result.row.last_activity_at,
  });
  if (issued) applyStudioVisitorCookie(response, visitorId);
  return response;
}

/** Reads back one of this browser's own drafts (for "pick up where you left off"). */
export async function GET(request: NextRequest) {
  const ip = getStudioClientIp(request);
  if (!consumeStudioRateLimit(`autosave-read:${ip}`, 60, 10 * 60_000)) {
    return rateLimited();
  }
  const visitorId = readStudioVisitorId(request.cookies);
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!visitorId) {
    return NextResponse.json(
      { ok: false, code: "not_found", message: "No saved design for this browser." },
      { status: 404 }
    );
  }
  const result = await getVisitorDraft(id, visitorId);
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, draft: toStudioVisitorDraft(result.row) });
}

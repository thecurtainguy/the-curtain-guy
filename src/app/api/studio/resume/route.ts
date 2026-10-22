import { NextResponse, type NextRequest } from "next/server";
import { studioErrorHttpStatus } from "@/lib/studio";
import {
  applyStudioVisitorCookie,
  bindStudioResumeToken,
  consumeStudioRateLimit,
  getStudioClientIp,
  resolveStudioVisitorId,
  toStudioVisitorDraft,
} from "@/lib/studio-leads-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Binds an emailed resume link to this browser so autosave can continue. */
export async function POST(request: NextRequest) {
  const ip = getStudioClientIp(request);
  if (!consumeStudioRateLimit(`resume:${ip}`, 20, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, code: "rate_limited", message: "Too many attempts. Try again shortly." },
      { status: 429 }
    );
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return NextResponse.json(
      { ok: false, code: "validation", message: "Invalid request." },
      { status: 400 }
    );
  }

  const { visitorId, issued } = resolveStudioVisitorId(request.cookies);
  const result = await bindStudioResumeToken(token, visitorId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: studioErrorHttpStatus(result.code) }
    );
  }

  const response = NextResponse.json({
    ok: true,
    draft: toStudioVisitorDraft(result.row),
  });
  if (issued) applyStudioVisitorCookie(response, visitorId);
  return response;
}

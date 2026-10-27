import { NextResponse } from "next/server";
import { confirmDocumentView } from "@/lib/document-views";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

/** Beacon from the quote / invoice page once a real person is reading it. */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID.test(id)) return new NextResponse(null, { status: 204 });

  const body = (await request.json().catch(() => ({}))) as {
    activeSeconds?: unknown;
    visitorId?: unknown;
  };
  const activeSeconds = Number(body.activeSeconds);
  await confirmDocumentView({
    viewId: id,
    activeSeconds: Number.isFinite(activeSeconds) ? activeSeconds : 0,
    visitorId: typeof body.visitorId === "string" && /^[\w-]{8,64}$/.test(body.visitorId) ? body.visitorId : null,
  });
  return new NextResponse(null, { status: 204 });
}

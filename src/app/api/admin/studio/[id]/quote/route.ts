import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  createQuoteFromStudioDesign,
  findExistingStudioQuote,
} from "@/lib/quotes";
import {
  buildStudioQuotePreview,
  loadStudioQuoteSource,
  type StudioQuotePreviewPayload,
} from "@/lib/studio-quote-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

/** `?kind=event_plan` means the id is an event plan submission id. */
function sourceIds(request: Request, id: string) {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "event_plan"
    ? { designId: null, eventPlanId: id }
    : { designId: id, eventPlanId: null };
}

async function previewResponse(request: Request, id: string) {
  const ids = sourceIds(request, id);
  const source = await loadStudioQuoteSource(ids);
  if ("error" in source) {
    return NextResponse.json(
      { ok: false, message: source.error },
      { status: source.status }
    );
  }

  const [preview, existing] = await Promise.all([
    buildStudioQuotePreview(source),
    findExistingStudioQuote(source),
  ]);

  const payload: StudioQuotePreviewPayload = {
    title: source.title,
    source: {
      designId: source.designRow?.id ?? null,
      eventPlanId: source.plan?.id ?? null,
    },
    event: source.event,
    totals: preview.bom.totals,
    lines: preview.conversion.lines,
    summary: preview.conversion.summary,
    existingQuote: existing
      ? {
          id: existing.id,
          displayRef: existing.quote_display_ref,
          status: existing.status,
          lineCount: existing.line_items.length,
          fillable: existing.status === "draft" && existing.line_items.length === 0,
        }
      : null,
  };
  return NextResponse.json({ ok: true, preview: payload });
}

export async function GET(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }
  return previewResponse(request, id);
}

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  if (new URL(request.url).searchParams.get("preview") === "1") {
    return previewResponse(request, id);
  }

  let body: { mode?: unknown } = {};
  try {
    body = (await request.json()) as { mode?: unknown };
  } catch {
    body = {};
  }
  const mode = body.mode === "revision" ? "revision" : "create";

  const result = await createQuoteFromStudioDesign({
    ...sourceIds(request, id),
    createdByUserId: owner.user.id,
    mode,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
        existingQuoteId: result.existingQuoteId ?? null,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    quoteId: result.quote.id,
    outcome: result.outcome,
    summary: result.preview.conversion.summary,
  });
}

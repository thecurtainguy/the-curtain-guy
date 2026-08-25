import { NextResponse } from "next/server";
import type { StudioDesignStatus } from "@/data/studio";
import { requireOwner } from "@/lib/auth";
import {
  createStudioDesign,
  listAdminStudioDesigns,
  parseStudioRequestBody,
  studioErrorHttpStatus,
  type StudioActor,
  type StudioFailure,
} from "@/lib/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: StudioFailure) {
  return NextResponse.json(
    { ok: false, message: error.message },
    { status: studioErrorHttpStatus(error.code) }
  );
}

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const result = await listAdminStudioDesigns(actor, {
    status: (status || null) as StudioDesignStatus | null,
    search,
    limit: limitParam === null ? undefined : Number(limitParam),
    estimateRequestId: url.searchParams.get("estimateId") ?? undefined,
    quoteId: url.searchParams.get("quoteId") ?? undefined,
    jobId: url.searchParams.get("jobId") ?? undefined,
  });

  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, designs: result.designs });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const parsed = await parseStudioRequestBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: parsed.status }
    );
  }

  const result = await createStudioDesign(
    {
      userId: owner.user.id,
      role: "owner",
      user: owner.user,
    },
    parsed.body
  );
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, design: result.design }, { status: 201 });
}

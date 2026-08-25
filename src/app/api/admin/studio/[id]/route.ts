import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  archiveStudioDesign,
  getAdminStudioDesign,
  parseStudioRequestBody,
  studioErrorHttpStatus,
  updateStudioDesign,
  type StudioActor,
  type StudioFailure,
} from "@/lib/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: StudioFailure) {
  return NextResponse.json(
    { ok: false, message: error.message },
    { status: studioErrorHttpStatus(error.code) }
  );
}

function ownerActor(owner: NonNullable<Awaited<ReturnType<typeof requireOwner>>>) {
  return {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  } satisfies StudioActor;
}

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const result = await getAdminStudioDesign(ownerActor(owner), id);
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, design: result.design });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const result = await updateStudioDesign(ownerActor(owner), id, parsed.body);
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, design: result.design });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const result = await archiveStudioDesign(ownerActor(owner), id);
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({
    ok: true,
    design: result.design,
    message: "Studio design archived.",
  });
}

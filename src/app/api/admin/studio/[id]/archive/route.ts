import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  archiveStudioDesign,
  studioErrorHttpStatus,
  type StudioFailure,
} from "@/lib/studio";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: StudioFailure) {
  return NextResponse.json(
    { ok: false, message: error.message },
    { status: studioErrorHttpStatus(error.code) }
  );
}

export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const result = await archiveStudioDesign(
    {
      userId: owner.user.id,
      role: "owner",
      user: owner.user,
    },
    id
  );
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({
    ok: true,
    design: result.design,
    message: "Studio design archived.",
  });
}

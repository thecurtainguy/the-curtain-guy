import { NextResponse } from "next/server";
import { requireCustomerOrOwner } from "@/lib/auth";
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
  const current = await requireCustomerOrOwner();
  if (!current) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }
  if (current.profile.role === "owner") {
    return NextResponse.json(
      { ok: false, message: "Use admin routes for owner access." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const result = await archiveStudioDesign(
    {
      userId: current.user.id,
      role: "customer",
      user: current.user,
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

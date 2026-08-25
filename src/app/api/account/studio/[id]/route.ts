import { NextResponse } from "next/server";
import { requireCustomerOrOwner } from "@/lib/auth";
import {
  archiveStudioDesign,
  getCustomerStudioDesign,
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

function customerActor(
  current: NonNullable<Awaited<ReturnType<typeof requireCustomerOrOwner>>>
) {
  return {
    userId: current.user.id,
    role: "customer",
    user: current.user,
  } satisfies StudioActor;
}

async function requireCustomer() {
  const current = await requireCustomerOrOwner();
  if (!current) {
    return {
      response: NextResponse.json(
        { ok: false, message: "Authentication required." },
        { status: 401 }
      ),
    } as const;
  }
  if (current.profile.role === "owner") {
    return {
      response: NextResponse.json(
        { ok: false, message: "Use admin routes for owner access." },
        { status: 403 }
      ),
    } as const;
  }
  return { current } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireCustomer();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const result = await getCustomerStudioDesign(
    customerActor(access.current),
    id
  );
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, design: result.design });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireCustomer();
  if ("response" in access) return access.response;

  const parsed = await parseStudioRequestBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: parsed.status }
    );
  }

  const { id } = await context.params;
  const result = await updateStudioDesign(
    customerActor(access.current),
    id,
    parsed.body
  );
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, design: result.design });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireCustomer();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  const result = await archiveStudioDesign(
    customerActor(access.current),
    id
  );
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({
    ok: true,
    design: result.design,
    message: "Studio design archived.",
  });
}

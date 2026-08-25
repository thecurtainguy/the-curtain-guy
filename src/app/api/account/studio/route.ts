import { NextResponse } from "next/server";
import type { StudioDesignStatus } from "@/data/studio";
import { requireCustomerOrOwner } from "@/lib/auth";
import {
  createStudioDesign,
  listCustomerStudioDesigns,
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

export async function GET(request: Request) {
  const access = await requireCustomer();
  if ("response" in access) return access.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const result = await listCustomerStudioDesigns(
    customerActor(access.current),
    {
      status: (status || null) as StudioDesignStatus | null,
      search,
      limit: limitParam === null ? undefined : Number(limitParam),
      estimateRequestId: url.searchParams.get("estimateId") ?? undefined,
      quoteId: url.searchParams.get("quoteId") ?? undefined,
      jobId: url.searchParams.get("jobId") ?? undefined,
    }
  );

  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, designs: result.designs });
}

export async function POST(request: Request) {
  const access = await requireCustomer();
  if ("response" in access) return access.response;

  const parsed = await parseStudioRequestBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: parsed.status }
    );
  }

  const result = await createStudioDesign(
    customerActor(access.current),
    parsed.body
  );
  if (!result.ok) return errorResponse(result);
  return NextResponse.json({ ok: true, design: result.design }, { status: 201 });
}

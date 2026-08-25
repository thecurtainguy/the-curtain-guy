import { NextResponse } from "next/server";
import { requireCustomerOrOwner } from "@/lib/auth";
import { getCustomerJob, toCustomerSafeJob } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
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
  const job = await getCustomerJob(id, current.user);
  if (!job) {
    return NextResponse.json(
      { ok: false, message: "Event not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, job: toCustomerSafeJob(job) });
}

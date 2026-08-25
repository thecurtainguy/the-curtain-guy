import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getAdminJob, updateJob, type JobUpdatePayload } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const job = await getAdminJob(id);
  if (!job) {
    return NextResponse.json(
      { ok: false, message: "Job not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, job });
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: JobUpdatePayload;
  try {
    body = (await request.json()) as JobUpdatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const job = await updateJob(id, body, owner.user.id);
  if (!job) {
    return NextResponse.json(
      { ok: false, message: "Could not update job." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, job });
}

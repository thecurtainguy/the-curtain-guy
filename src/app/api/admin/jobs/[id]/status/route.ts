import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { isJobStatus } from "@/data/jobs";
import { updateJobStatus } from "@/lib/jobs";
import { listJobEvents } from "@/lib/job-events";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.status || !isJobStatus(body.status)) {
    return NextResponse.json(
      { ok: false, message: "Valid status required." },
      { status: 400 }
    );
  }

  const job = await updateJobStatus(id, body.status, owner.user.id);
  if (!job) {
    return NextResponse.json(
      { ok: false, message: "Could not update status." },
      { status: 500 }
    );
  }

  const events = await listJobEvents(id);
  return NextResponse.json({ ok: true, job, events });
}

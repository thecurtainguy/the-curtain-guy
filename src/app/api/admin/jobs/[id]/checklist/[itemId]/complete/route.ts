import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { completeChecklistItem } from "@/lib/job-checklist";
import { getAdminJob } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id, itemId } = await context.params;
  const item = await completeChecklistItem(itemId, owner.user.id);
  if (!item || item.job_id !== id) {
    return NextResponse.json(
      { ok: false, message: "Checklist item not found." },
      { status: 404 }
    );
  }

  const job = await getAdminJob(id);
  return NextResponse.json({ ok: true, item, job });
}

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { isJobStatus } from "@/data/jobs";
import { listAdminJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const upcoming = url.searchParams.get("upcoming") === "1";
  const past = url.searchParams.get("past") === "1";

  const statusFilter =
    statusParam && isJobStatus(statusParam) ? statusParam : null;

  const jobs = await listAdminJobs({
    status: statusFilter,
    search: q || undefined,
    upcoming: upcoming || undefined,
    past: past || undefined,
  });

  return NextResponse.json({ ok: true, jobs });
}

import { NextResponse } from "next/server";
import { requireCustomerOrOwner } from "@/lib/auth";
import { listCustomerJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET() {
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

  const jobs = await listCustomerJobs(current.user);
  return NextResponse.json({ ok: true, jobs });
}

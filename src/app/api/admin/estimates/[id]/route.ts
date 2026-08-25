import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchEstimateById } from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = new Set([
  "new",
  "reviewed",
  "quoted",
  "closed",
  "spam",
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const existing = await fetchEstimateById(id);
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  let body: { status?: string; internalNotes?: string; markViewed?: boolean };

  try {
    body = (await request.json()) as {
      status?: string;
      internalNotes?: string;
      markViewed?: boolean;
    };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json(
        { ok: false, message: "Invalid status." },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }

  if (typeof body.internalNotes === "string") {
    updates.internal_notes = body.internalNotes.slice(0, 10000);
  }

  if (body.markViewed) {
    updates.last_viewed_by_owner_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, message: "No updates provided." },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("estimate_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[admin] Estimate update failed:", error?.message);
    return NextResponse.json(
      { ok: false, message: "Could not update estimate." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, estimate: data });
}

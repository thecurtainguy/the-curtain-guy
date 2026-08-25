import { NextRequest, NextResponse } from "next/server";
import { isEmailVerified, requireCustomerOrOwner } from "@/lib/auth";
import { fetchEstimateById } from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function claimLinkedStudioDesigns(
  estimateId: string,
  userId: string
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("studio_designs")
    .update({ owner_user_id: userId })
    .eq("estimate_request_id", estimateId);
  if (error) {
    // Best effort keeps the existing estimate claim flow available while the
    // additive Studio migration is pending or temporarily unavailable.
    console.error("[account] Linked Studio design claim failed:", error.message);
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const current = await requireCustomerOrOwner();
  if (!current) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!isEmailVerified(current.user)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Verify your email before saving estimates to your account.",
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const estimate = await fetchEstimateById(id);

  if (!estimate) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  const userEmail = current.user.email?.trim().toLowerCase() ?? "";
  const estimateEmail = estimate.customer_email.trim().toLowerCase();

  if (!userEmail || userEmail !== estimateEmail) {
    return NextResponse.json(
      { ok: false, message: "Not authorized to claim this estimate." },
      { status: 403 }
    );
  }

  if (estimate.user_id === current.user.id) {
    await claimLinkedStudioDesigns(id, current.user.id);
    return NextResponse.json({ ok: true, alreadyOwned: true });
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("estimate_requests")
    .update({ user_id: current.user.id })
    .eq("id", id);

  if (error) {
    console.error("[account] Claim failed:", error.message);
    return NextResponse.json(
      { ok: false, message: "Could not save estimate to your account." },
      { status: 500 }
    );
  }

  await claimLinkedStudioDesigns(id, current.user.id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireCustomerOrOwner } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  const current = await requireCustomerOrOwner();
  if (!current) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  let body: { fullName?: string; phone?: string };

  try {
    body = (await request.json()) as { fullName?: string; phone?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
  const phone =
    typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("user_profiles")
    .update({
      full_name: fullName || null,
      phone: phone || null,
    })
    .eq("id", current.user.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[account] Profile update failed:", error?.message);
    return NextResponse.json(
      { ok: false, message: "Could not update profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, profile: data });
}

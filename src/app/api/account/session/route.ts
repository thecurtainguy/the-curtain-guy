import { NextResponse } from "next/server";
import { getCurrentProfile, isEmailVerified } from "@/lib/auth";

export async function GET() {
  const current = await getCurrentProfile();

  if (!current) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      role: null,
      email: null,
      emailVerified: false,
    });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    role: current.profile.role,
    email: current.profile.email,
    emailVerified: isEmailVerified(current.user),
  });
}

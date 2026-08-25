import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        authorized: false,
        message: "This account is not authorized for owner access.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, authorized: true });
}

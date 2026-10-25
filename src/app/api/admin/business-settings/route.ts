import { NextResponse } from "next/server";
import type { BusinessSettings } from "@/data/invoices";
import { requireOwner } from "@/lib/auth";
import {
  getBusinessSettings,
  updateBusinessSettings,
} from "@/lib/business-settings";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

export async function GET() {
  if (!(await requireOwner())) return forbidden();
  return NextResponse.json({ ok: true, settings: await getBusinessSettings() });
}

export async function PUT(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const body = (await request.json().catch(() => null)) as Partial<BusinessSettings> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await updateBusinessSettings(body, owner.user.id, owner.profile.email);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, settings: result.settings });
}

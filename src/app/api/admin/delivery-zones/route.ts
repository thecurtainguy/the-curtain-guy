import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  deleteRentalDeliveryZone,
  listRentalDeliveryZones,
  restoreDefaultRentalDeliveryZones,
  upsertRentalDeliveryZone,
} from "@/lib/rental-delivery-zones";

export const runtime = "nodejs";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const zones = await listRentalDeliveryZones({ includeInactive: true });
  return NextResponse.json({ ok: true, zones });
}

export async function DELETE(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Zone id is required." },
      { status: 400 }
    );
  }

  const result = await deleteRentalDeliveryZone({ id });
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  const zones = await listRentalDeliveryZones({ includeInactive: true });
  return NextResponse.json({ ok: true, zones });
}

export async function PUT(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (body.restoreDefaults === true) {
    const restored = await restoreDefaultRentalDeliveryZones({
      updatedBy: owner.user.id,
    });
    if ("error" in restored) {
      return NextResponse.json(
        { ok: false, message: restored.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, zones: restored.zones });
  }

  const result = await upsertRentalDeliveryZone({
    zone: {
      id: String(body.id || ""),
      label: String(body.label || ""),
      shortLabel: String(body.shortLabel || body.short_label || ""),
      priced: body.priced !== false,
      fullServiceCents: Math.round(
        Number(body.fullServiceCents ?? body.full_service_cents) || 0
      ),
      transportOnlyCents: Math.round(
        Number(body.transportOnlyCents ?? body.transport_only_cents) || 0
      ),
      sortOrder: Math.round(Number(body.sortOrder ?? body.sort_order) || 0),
      isActive: body.isActive !== false && body.is_active !== false,
    },
    updatedBy: owner.user.id,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, zone: result.zone });
}

import { NextResponse } from "next/server";
import { listRentalDeliveryZones } from "@/lib/rental-delivery-zones";

export const runtime = "nodejs";

/** Public zone list for rentals cart / checkout pricing. */
export async function GET() {
  const zones = await listRentalDeliveryZones({ includeInactive: false });
  return NextResponse.json(
    { ok: true, zones },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

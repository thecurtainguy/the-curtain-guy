import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { searchAllVenues } from "@/lib/customers";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const url = new URL(request.url);
  const exclude = url.searchParams.get("exclude");
  const venues = await searchAllVenues({
    query: url.searchParams.get("q") ?? "",
    excludeCustomerId: exclude && UUID_RE.test(exclude) ? exclude : null,
    limit: Number(url.searchParams.get("limit")) || undefined,
  });
  return NextResponse.json({ ok: true, venues });
}

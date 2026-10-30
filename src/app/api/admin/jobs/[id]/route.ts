import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { ensureCustomerVenue, listCustomerVenues } from "@/lib/customers";
import { syncInvoicesFromJob } from "@/lib/invoices";
import { getAdminJob, updateJob, type JobUpdatePayload } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const job = await getAdminJob(id);
  if (!job) {
    return NextResponse.json(
      { ok: false, message: "Job not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, job });
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: JobUpdatePayload;
  try {
    body = (await request.json()) as JobUpdatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const result = await updateJob(id, body, owner.user.id);
  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Could not update job." },
      { status: 500 }
    );
  }

  const synced = await syncInvoicesFromJob({
    before: result.before,
    after: result.job,
    actorUserId: owner.user.id,
  });

  const { job, before } = result;
  const venueChanged = (["venue_name", "venue_address"] as const).some(
    (field) => (before[field] ?? null) !== (job[field] ?? null)
  );
  let venueSavedTo: string | null = null;
  const venueName = job.venue_name?.trim().toLowerCase();
  const isNewVenue =
    venueChanged &&
    Boolean(job.customer_id && venueName) &&
    !(await listCustomerVenues(job.customer_id!)).some((venue) => venue.name.trim().toLowerCase() === venueName);
  if (isNewVenue && job.customer_id) {
    const venue = await ensureCustomerVenue({
      customerId: job.customer_id,
      venueName: job.venue_name,
      venueAddress: job.venue_address,
      actor: { userId: owner.user.id },
      fromJobId: id,
      details: {
        city: job.venue_city,
        region: job.venue_region,
        postal_code: job.venue_postal_code,
        country: job.venue_country,
        access_notes: job.access_notes,
        loading_notes: job.loading_notes,
        parking_notes: job.parking_notes,
        elevator_notes: job.elevator_notes,
        room_notes: job.room_notes,
      },
    });
    if (venue) venueSavedTo = venue.name;
  }

  return NextResponse.json({ ok: true, job, invoicesUpdated: synced.updated, venueSavedTo });
}

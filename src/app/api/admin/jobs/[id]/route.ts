import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { ensureCustomerVenue, listCustomerVenues } from "@/lib/customers";
import { syncInvoicesFromJob } from "@/lib/invoices";
import { listJobEvents } from "@/lib/job-events";
import { fetchJobRow, getAdminJob, updateJob, type JobUpdatePayload } from "@/lib/jobs";
import type { EventJobRow } from "@/data/jobs";

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
  const { id } = await context.params;
  const [owner, current] = await Promise.all([requireOwner(), fetchJobRow(id)]);
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  if (!current) {
    return NextResponse.json(
      { ok: false, message: "Job not found." },
      { status: 404 }
    );
  }

  let body: JobUpdatePayload;
  try {
    body = (await request.json()) as JobUpdatePayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const result = await updateJob(id, body, owner.user.id, current);
  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Could not update job." },
      { status: 500 }
    );
  }

  const { job, before } = result;
  const [synced, venueSavedTo, events] = await Promise.all([
    syncInvoicesFromJob({ before, after: job, actorUserId: owner.user.id }),
    saveNewVenue(id, before, job, owner.user.id),
    listJobEvents(id),
  ]);

  return NextResponse.json({ ok: true, job, events, invoicesUpdated: synced.updated, venueSavedTo });
}

async function saveNewVenue(
  id: string,
  before: EventJobRow,
  job: EventJobRow,
  userId: string
): Promise<string | null> {
  const venueChanged = (["venue_name", "venue_address"] as const).some(
    (field) => (before[field] ?? null) !== (job[field] ?? null)
  );
  const venueName = job.venue_name?.trim().toLowerCase();
  if (!venueChanged || !job.customer_id || !venueName) return null;
  const existing = await listCustomerVenues(job.customer_id);
  if (existing.some((venue) => venue.name.trim().toLowerCase() === venueName)) return null;
  const venue = await ensureCustomerVenue({
    customerId: job.customer_id,
    venueName: job.venue_name,
    venueAddress: job.venue_address,
    actor: { userId },
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
  return venue?.name ?? null;
}

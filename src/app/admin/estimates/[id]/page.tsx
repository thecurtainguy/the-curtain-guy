import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  fetchEstimateById,
  fetchEstimateFiles,
} from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchJobByEstimateId } from "@/lib/jobs";
import { AdminEstimateActions } from "@/components/admin/admin-estimate-actions";
import { AdminEstimateQuotesSection } from "@/components/admin/admin-estimate-quotes-section";
import { EstimateFilesList } from "@/components/estimates/estimate-files-list";
import { formatEstimateReference, getOptionLabel, eventTypes } from "@/data/estimate";
import {
  buildAdminLookAndFabricRows,
  buildAdminMeasurementRows,
  formatAddOns,
  formatDrapeGoals,
  formatVenueSetting,
} from "@/lib/estimate-display";
import {
  listQuotesForEstimate,
} from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Estimate detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function jsonPreview(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminEstimateDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const estimate = await fetchEstimateById(id);
  if (!estimate) notFound();

  const files = await fetchEstimateFiles(id, ["uploaded", "pending"]);
  const quotes = await listQuotesForEstimate(id);
  const linkedJob = await fetchJobByEstimateId(id);

  const admin = createAdminSupabaseClient();
  await admin
    .from("estimate_requests")
    .update({ last_viewed_by_owner_at: new Date().toISOString() })
    .eq("id", id);

  const reference = formatEstimateReference(
    estimate.id,
    estimate.opportunity_ref
  );

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/30 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/admin/estimates"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              ← All estimates
            </Link>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Estimate detail
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {reference}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted {new Date(estimate.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
              <h2 className="font-heading text-lg font-semibold">Customer</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{estimate.customer_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium break-all">
                    {estimate.customer_email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">
                    {estimate.customer_phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account user</dt>
                  <dd className="font-medium">
                    {estimate.user_id ? "Linked" : "Guest"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
              <h2 className="font-heading text-lg font-semibold">Event</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">
                    {estimate.event_type
                      ? (getOptionLabel(eventTypes, estimate.event_type) ??
                        estimate.event_type)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">{estimate.event_date || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Venue</dt>
                  <dd className="font-medium">{estimate.venue_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">City / area</dt>
                  <dd className="font-medium">{estimate.city_area || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Setting</dt>
                  <dd className="font-medium">
                    {formatVenueSetting(estimate.venue_setting)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Guests</dt>
                  <dd className="font-medium">
                    {estimate.guest_count ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border/40 bg-card/25 p-5 space-y-6">
              <h2 className="font-heading text-lg font-semibold">Brief</h2>

              <div className="text-sm">
                <p className="text-muted-foreground">Drape goals</p>
                <p className="mt-1 font-medium">
                  {formatDrapeGoals(estimate.drape_goals)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">Look & fabric</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  {buildAdminLookAndFabricRows(estimate.look_and_fabric).map(
                    (row) => (
                      <div key={row.label}>
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="mt-0.5 font-medium">{row.value}</dd>
                      </div>
                    )
                  )}
                </dl>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">Measurements</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  {buildAdminMeasurementRows(estimate.measurements).map((row) => (
                    <div key={row.label}>
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="mt-0.5 font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground">Add-ons</p>
                <p className="mt-1 font-medium">
                  {formatAddOns(estimate.add_ons)}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Customer notes</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {estimate.notes || "—"}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Full estimate brief</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl border border-border/40 bg-background/50 p-4 text-xs leading-relaxed">
                  {estimate.estimate_brief}
                </pre>
              </div>
            </section>

            <details className="rounded-3xl border border-border/40 bg-card/15 p-5">
              <summary className="cursor-pointer font-heading text-lg font-semibold">
                Raw payload
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-background/50 p-4 text-xs">
                {jsonPreview(estimate.raw_payload)}
              </pre>
            </details>
          </div>

          <div className="space-y-6 xl:sticky xl:top-20">
            <AdminEstimateActions
              estimateId={estimate.id}
              initialStatus={estimate.status}
              initialNotes={estimate.internal_notes ?? ""}
              customerEmail={estimate.customer_email}
              customerName={estimate.customer_name}
            />

            <AdminEstimateQuotesSection
              estimateId={estimate.id}
              quotes={quotes}
              linkedJobId={linkedJob?.id}
              linkedJobRef={linkedJob?.opportunity_ref}
            />

            <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
              <h2 className="font-heading text-lg font-semibold">Files</h2>
              <div className="mt-4">
                <EstimateFilesList files={files} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminPageFrame>
  );
}

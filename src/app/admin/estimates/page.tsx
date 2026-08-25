import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { formatEstimateReference } from "@/data/estimate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "All estimates",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

export default async function AdminEstimatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const owner = await requireAdminPage();
  const params = await searchParams;
  const status = params.status?.trim() || "";
  const q = params.q?.trim() || "";

  const admin = createAdminSupabaseClient();
  let query = admin
    .from("estimate_requests")
    .select(
      "id, status, customer_name, customer_email, customer_phone, event_type, event_date, venue_name, city_area, created_at, opportunity_ref"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && ["new", "reviewed", "quoted", "closed", "spam"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: rows } = await query;

  const ids = (rows ?? []).map((row) => row.id);
  const fileCounts = new Map<string, number>();

  if (ids.length > 0) {
    const { data: files } = await admin
      .from("estimate_files")
      .select("estimate_request_id")
      .in("estimate_request_id", ids)
      .eq("upload_status", "uploaded");

    for (const file of files ?? []) {
      const key = file.estimate_request_id as string;
      fileCounts.set(key, (fileCounts.get(key) ?? 0) + 1);
    }
  }

  // Reference search: opportunity_ref (TCG-10000) or legacy TCG-{uuid8}
  const filtered = (rows ?? []).filter((row) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    const ref = formatEstimateReference(row.id, row.opportunity_ref).toLowerCase();
    return (
      ref.includes(needle) ||
      (row.opportunity_ref || "").toLowerCase().includes(needle) ||
      row.customer_name.toLowerCase().includes(needle) ||
      row.customer_email.toLowerCase().includes(needle) ||
      (row.customer_phone ?? "").toLowerCase().includes(needle) ||
      row.id.toLowerCase().includes(needle)
    );
  });

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Estimates
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold text-foreground">
            All requests
          </h1>
        </div>

        <form className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/20 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="q" className="text-xs text-muted-foreground">
              Search reference, name, email, phone
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="TCG-… or customer details"
            />
          </div>
          <div className="space-y-2 sm:w-44">
            <label htmlFor="status" className="text-xs text-muted-foreground">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="quoted">Quoted</option>
              <option value="closed">Closed</option>
              <option value="spam">Spam</option>
            </select>
          </div>
          <Button type="submit">Filter</Button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Venue / city</th>
                  <th className="px-4 py-3 font-medium">Files</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No estimates match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/30 hover:bg-muted/10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/estimates/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatEstimateReference(row.id, row.opportunity_ref)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <EstimateStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.customer_phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.event_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.event_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[row.venue_name, row.city_area]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fileCounts.get(row.id) ?? 0}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPageFrame>
  );
}

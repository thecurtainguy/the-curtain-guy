import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import {
  QUOTE_STATUSES,
  formatCadFromCents,
  formatQuoteRevisionLabel,
  isQuoteStatus,
  resolveQuoteDisplayRef,
  type QuoteStatus,
} from "@/data/quotes";
import { listQuotes } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Quotes",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

function formatStamp(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const owner = await requireAdminPage();
  const params = await searchParams;
  const statusParam = params.status?.trim() || "";
  const q = params.q?.trim() || "";
  const statusFilter: QuoteStatus | null =
    statusParam && isQuoteStatus(statusParam) ? statusParam : null;

  const quotes = await listQuotes({
    status: statusFilter,
    limit: 200,
  });

  const filtered = quotes.filter((row) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      row.quote_display_ref.toLowerCase().includes(needle) ||
      resolveQuoteDisplayRef(row).toLowerCase().includes(needle) ||
      row.opportunity_ref.toLowerCase().includes(needle) ||
      (row.customer_name || "").toLowerCase().includes(needle) ||
      row.customer_email.toLowerCase().includes(needle) ||
      row.id.toLowerCase().includes(needle)
    );
  });

  const admin = createAdminSupabaseClient();
  const quoteIds = filtered.map((row) => row.id);
  const jobByQuoteId = new Map<string, string>();
  if (quoteIds.length > 0) {
    const { data: linkedJobs } = await admin
      .from("event_jobs")
      .select("id, quote_id")
      .in("quote_id", quoteIds);
    for (const row of linkedJobs || []) {
      if (row.quote_id) jobByQuoteId.set(row.quote_id as string, row.id as string);
    }
  }

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <div className="border-b border-border/30 pb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            Quotes
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Quotes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Build, send, revise, and track customer proposals.
          </p>
        </div>

        <form className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/20 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="q" className="text-xs text-muted-foreground">
              Search ref, customer, email
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Quote TCG-… or customer"
            />
          </div>
          <div className="space-y-2 sm:w-48">
            <label htmlFor="status" className="text-xs text-muted-foreground">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter ?? ""}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">All</option>
              {QUOTE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Filter</Button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 font-medium">Opportunity</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Rev</th>
                  <th className="px-4 py-3 font-medium">Sent / viewed / accepted</th>
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
                      No quotes match these filters.
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
                          href={`/admin/quotes/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {resolveQuoteDisplayRef(row)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.opportunity_ref}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {row.customer_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <QuoteStatusBadge status={row.status} />
                        {row.status === "accepted" && jobByQuoteId.has(row.id) ? (
                          <Link
                            href={`/admin/jobs/${jobByQuoteId.get(row.id)}`}
                            className="mt-1 block text-[10px] uppercase tracking-wide text-primary hover:underline"
                          >
                            Job linked
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatCadFromCents(row.total_cents)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.event_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatQuoteRevisionLabel(row.revision_number) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>S {formatStamp(row.sent_at)}</div>
                        <div>V {formatStamp(row.viewed_at)}</div>
                        <div>A {formatStamp(row.accepted_at)}</div>
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

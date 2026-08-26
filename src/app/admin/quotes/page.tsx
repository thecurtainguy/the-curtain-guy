import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminQuotesList,
  type AdminQuoteListRow,
} from "@/components/admin/lists/admin-quotes-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listQuotes } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Quotes",
  robots: { index: false, follow: false },
};

export default async function AdminQuotesPage() {
  const owner = await requireAdminPage();
  const quotes = await listQuotes({ limit: 500 });

  const admin = createAdminSupabaseClient();
  const quoteIds = quotes.map((row) => row.id);
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

  const listRows: AdminQuoteListRow[] = quotes.map((row) => ({
    id: row.id,
    status: row.status,
    quote_display_ref: row.quote_display_ref,
    opportunity_ref: row.opportunity_ref,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    total_cents: row.total_cents,
    event_date: row.event_date,
    revision_number: row.revision_number,
    sent_at: row.sent_at,
    viewed_at: row.viewed_at,
    accepted_at: row.accepted_at,
    created_at: row.created_at,
    linked_job_id: jobByQuoteId.get(row.id) ?? null,
  }));

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Quotes"
          title="Quotes"
          description="Build, send, revise, and track customer proposals."
          icon={FileText}
        />
        <AdminQuotesList rows={listRows} />
      </div>
    </AdminPageFrame>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminQuoteBuilder } from "@/components/admin/admin-quote-builder";
import { AdminQuoteJobActions } from "@/components/admin/admin-quote-job-actions";
import { fetchJobByQuoteId } from "@/lib/jobs";
import { fetchQuoteById } from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Quote detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminQuoteDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const quote = await fetchQuoteById(id, { includeEvents: true });
  if (!quote) notFound();

  const linkedJob = await fetchJobByQuoteId(id);

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <AdminQuoteJobActions
          quoteId={quote.id}
          quoteStatus={quote.status}
          existingJobId={linkedJob?.id}
        />
        <AdminQuoteBuilder quote={quote} />
      </div>
    </AdminPageFrame>
  );
}

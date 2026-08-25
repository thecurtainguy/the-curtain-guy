import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminQuoteBuilder } from "@/components/admin/admin-quote-builder";
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

  return (
    <AdminPageFrame email={owner.profile.email}>
      <AdminQuoteBuilder quote={quote} />
    </AdminPageFrame>
  );
}

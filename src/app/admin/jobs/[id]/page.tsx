import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminJobDetail } from "@/components/admin/admin-job-detail";
import { AdminJobInvoices } from "@/components/admin/admin-job-invoices";
import { fetchEstimateFiles } from "@/lib/estimate-access";
import { listInvoicesForJob } from "@/lib/invoices";
import { getAdminJob } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Job detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminJobDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const job = await getAdminJob(id);
  if (!job) notFound();

  const [files, invoices] = await Promise.all([
    job.estimate_request_id
      ? fetchEstimateFiles(job.estimate_request_id, ["uploaded", "pending"])
      : Promise.resolve([]),
    listInvoicesForJob(id),
  ]);

  return (
    <AdminPageFrame email={owner.profile.email}>
      <AdminJobDetail
        job={job}
        billingSlot={<AdminJobInvoices jobId={job.id} invoices={invoices} />}
        estimateFiles={files.map((f) => ({
          id: f.id,
          original_file_name: f.original_file_name,
          content_type: f.content_type,
          file_size_bytes: f.file_size_bytes,
          uploaded_at: f.uploaded_at,
          upload_status: f.upload_status,
          customer_visible: f.customer_visible !== false,
        }))}
      />
    </AdminPageFrame>
  );
}

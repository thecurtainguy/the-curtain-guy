import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminJobDetail } from "@/components/admin/admin-job-detail";
import { fetchEstimateFiles } from "@/lib/estimate-access";
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

  const files = job.estimate_request_id
    ? await fetchEstimateFiles(job.estimate_request_id, ["uploaded", "pending"])
    : [];

  return (
    <AdminPageFrame email={owner.profile.email}>
      <AdminJobDetail
        job={job}
        estimateFiles={files.map((f) => ({
          id: f.id,
          original_file_name: f.original_file_name,
          content_type: f.content_type,
          file_size_bytes: f.file_size_bytes,
          uploaded_at: f.uploaded_at,
          upload_status: f.upload_status,
        }))}
      />
    </AdminPageFrame>
  );
}

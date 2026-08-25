import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { CustomerEventDetail } from "@/components/account/customer-event-detail";
import { fetchEstimateFiles } from "@/lib/estimate-access";
import { getCustomerJob } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Event detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountEventDetailPage({ params }: PageProps) {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const { id } = await params;

  const job = await getCustomerJob(id, current.user);
  if (!job) notFound();

  const files = job.estimate_request_id
    ? await fetchEstimateFiles(job.estimate_request_id, ["uploaded"])
    : [];

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <CustomerEventDetail
        job={job}
        quoteLineItems={job.quote_line_items}
        estimateFiles={files.map((f) => ({
          id: f.id,
          original_file_name: f.original_file_name,
          content_type: f.content_type,
          file_size_bytes: f.file_size_bytes,
          uploaded_at: f.uploaded_at,
          upload_status: f.upload_status,
        }))}
      />
    </AccountPageFrame>
  );
}

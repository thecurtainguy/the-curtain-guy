import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminReviewsList,
  type AdminReviewListRow,
} from "@/components/admin/lists/admin-reviews-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listAdminReviewSubmissions } from "@/lib/review-submissions";

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

export default async function AdminReviewsPage() {
  const owner = await requireAdminPage();
  const reviews = await listAdminReviewSubmissions({ limit: 500 });

  const listRows: AdminReviewListRow[] = reviews.map((row) => ({
    id: row.id,
    status: row.status,
    name: row.name,
    email: row.email,
    event_category: row.event_category,
    event_label: row.event_label,
    event_date: row.event_date,
    venue: row.venue,
    location: row.location,
    rating: row.rating,
    would_recommend: row.would_recommend,
    publish_on_website: row.publish_on_website,
    ok_to_contact: row.ok_to_contact,
    created_at: row.created_at,
  }));

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Reviews"
          title="Review submissions"
          description="Every field from the Share Your Experience form — triage, follow up, and approve for publishing."
          icon={Star}
        />
        <AdminReviewsList rows={listRows} />
      </div>
    </AdminPageFrame>
  );
}

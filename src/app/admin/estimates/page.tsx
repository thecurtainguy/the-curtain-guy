import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminEstimatesList,
  type AdminEstimateListRow,
} from "@/components/admin/lists/admin-estimates-list";
import { PortalStartEstimateButton } from "@/components/estimates/portal-start-estimate-button";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "All estimates",
  robots: { index: false, follow: false },
};

export default async function AdminEstimatesPage() {
  const owner = await requireAdminPage();
  const admin = createAdminSupabaseClient();

  const { data: rows } = await admin
    .from("estimate_requests")
    .select(
      "id, status, customer_name, customer_email, customer_phone, event_type, event_date, venue_name, city_area, created_at, opportunity_ref"
    )
    .order("created_at", { ascending: false })
    .limit(500);

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

  const listRows: AdminEstimateListRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    event_type: row.event_type,
    event_date: row.event_date,
    venue_name: row.venue_name,
    city_area: row.city_area,
    created_at: row.created_at,
    opportunity_ref: row.opportunity_ref,
    file_count: fileCounts.get(row.id) ?? 0,
  }));

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Estimates"
          title="Estimates"
          description="Review new estimate briefs and create proposals."
          icon={ClipboardList}
          actions={<PortalStartEstimateButton />}
        />
        <AdminEstimatesList rows={listRows} />
      </div>
    </AdminPageFrame>
  );
}

import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminEventPlansList,
  type AdminEventPlanListRow,
} from "@/components/admin/lists/admin-event-plans-list";
import { EventPlanPortalListShell } from "@/components/event-plans/event-plan-portal-list-shell";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Event plans",
  robots: { index: false, follow: false },
};

export default async function AdminEventPlansPage() {
  const owner = await requireAdminPage();
  const admin = createAdminSupabaseClient();

  const { data: rows } = await admin
    .from("event_plan_submissions")
    .select(
      "id, reference, status, contact_name, contact_email, contact_phone, event_type, event_date, venue_name, city_area, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const listRows: AdminEventPlanListRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    event_type: row.event_type,
    event_date: row.event_date,
    venue_name: row.venue_name,
    city_area: row.city_area,
    created_at: row.created_at,
  }));

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <EventPlanPortalListShell
        audience="admin"
        description="Review event builder submissions and create new plans from the portal."
        contactDefaults={{
          name: owner.profile.full_name ?? "",
          email: owner.profile.email,
          phone: owner.profile.phone ?? "",
          notes: "",
        }}
      >
        <AdminEventPlansList rows={listRows} />
      </EventPlanPortalListShell>
    </AdminPageFrame>
  );
}

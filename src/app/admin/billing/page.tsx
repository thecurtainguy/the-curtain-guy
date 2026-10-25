import type { Metadata } from "next";
import { History, Landmark } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminBusinessSettings } from "@/components/admin/admin-business-settings";
import { AdminInvoiceAuditLog } from "@/components/admin/admin-invoice-audit-log";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { getBusinessSettings, listBusinessSettingsEvents } from "@/lib/business-settings";

export const metadata: Metadata = {
  title: "Billing settings",
  robots: { index: false, follow: false },
};

export default async function AdminBillingPage() {
  const owner = await requireAdminPage();
  const [settings, history] = await Promise.all([
    getBusinessSettings(),
    listBusinessSettingsEvents(50),
  ]);

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Billing"
          title="Billing settings"
          description="Company details, tax numbers, invoice defaults, and the payment options clients see."
          icon={Landmark}
          backHref="/admin/invoices"
          backLabel="Invoices"
        />
        <AdminBusinessSettings initial={settings} />
        <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
          <div className="flex items-start gap-3 border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <History className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Audit trail</p>
              <h2 className="font-heading text-base font-semibold">Settings change history</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Invoices always show the current settings, so every change is recorded here with who made it.
              </p>
            </div>
          </div>
          <div className="p-5">
            <AdminInvoiceAuditLog
              events={history.map((row) => ({
                id: row.id,
                invoice_id: null,
                invoice_number: null,
                actor_type: "owner",
                actor_user_id: row.actor_user_id,
                actor_email: row.actor_email,
                event_type: "settings_updated",
                summary: row.summary,
                metadata: { changes: row.changes },
                created_at: row.created_at,
              }))}
              hideFilters
              emptyText="No changes recorded yet."
            />
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}

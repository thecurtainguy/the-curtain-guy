import type { Metadata } from "next";
import Link from "next/link";
import { History, Landmark, Receipt } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminInvoicesList,
  type AdminInvoiceListRow,
} from "@/components/admin/lists/admin-invoices-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import { isInvoiceOverdue } from "@/data/invoices";
import { formatCadFromCents } from "@/data/quotes";
import { listInvoices, listRecentInvoiceEvents } from "@/lib/invoices";
import { AdminInvoiceAuditLog } from "@/components/admin/admin-invoice-audit-log";
import { AdminNewInvoiceButton } from "@/components/admin/customers/admin-new-invoice-dialog";

export const metadata: Metadata = {
  title: "Invoices",
  robots: { index: false, follow: false },
};

export default async function AdminInvoicesPage() {
  const owner = await requireAdminPage();
  const [invoices, activity] = await Promise.all([
    listInvoices({ limit: 500 }),
    listRecentInvoiceEvents(100),
  ]);

  const open = invoices.filter((inv) => inv.status === "sent" || inv.status === "partially_paid");
  const outstanding = open.reduce((sum, inv) => sum + Math.max(0, inv.balance_due_cents), 0);
  const overdue = invoices.filter((inv) => isInvoiceOverdue(inv));
  const collected = invoices
    .filter((inv) => inv.status !== "void")
    .reduce((sum, inv) => sum + inv.amount_paid_cents, 0);

  const rows: AdminInvoiceListRow[] = invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    opportunity_ref: inv.opportunity_ref,
    status: inv.status,
    customer_name: inv.customer_name,
    customer_email: inv.customer_email,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    event_date: inv.event_date,
    total_cents: inv.total_cents,
    currency: inv.currency,
    amount_paid_cents: inv.amount_paid_cents,
    balance_due_cents: inv.balance_due_cents,
    view_count: inv.view_count ?? 0,
    last_viewed_at: inv.last_viewed_at ?? null,
  }));

  const tiles = [
    { label: "Outstanding", value: formatCadFromCents(outstanding), hint: `${open.length} open invoice${open.length === 1 ? "" : "s"}`, accent: true },
    { label: "Overdue", value: String(overdue.length), hint: overdue.length ? "Past the due date" : "All on time" },
    { label: "Collected", value: formatCadFromCents(collected), hint: "All recorded payments" },
  ];

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Billing"
          title="Invoices"
          description="Deposits, payments, and balances for every booked event."
          icon={Receipt}
          actions={
            <>
              <Button asChild variant="outline">
                <Link href="/admin/billing">
                  <Landmark className="size-4" />
                  Billing settings
                </Link>
              </Button>
              <AdminNewInvoiceButton />
            </>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className={
                tile.accent
                  ? "rounded-2xl border border-primary/40 bg-primary/10 p-4"
                  : "rounded-2xl border border-border/40 bg-card/30 p-4"
              }
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary">{tile.label}</p>
              <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums">{tile.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
            </div>
          ))}
        </div>
        <AdminInvoicesList rows={rows} />
        <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
          <div className="flex items-start gap-3 border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <History className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Audit trail</p>
              <h2 className="font-heading text-base font-semibold">Recent invoice activity</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Every change across all invoices, including deleted drafts. Click an entry for the before/after details.
              </p>
            </div>
          </div>
          <div className="p-5">
            <AdminInvoiceAuditLog events={activity} showInvoice emptyText="No invoice activity yet." />
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}

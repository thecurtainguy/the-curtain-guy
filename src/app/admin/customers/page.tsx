import type { Metadata } from "next";
import { AlertTriangle, BadgeDollarSign, Crown, Users } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminCustomerCreateButton } from "@/components/admin/customers/admin-customer-create-dialog";
import {
  AdminCustomersList,
  type AdminCustomerListRow,
} from "@/components/admin/lists/admin-customers-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { formatCadFromCents } from "@/data/quotes";
import { listCustomersWithStats } from "@/lib/customers";

export const metadata: Metadata = {
  title: "Customers",
  robots: { index: false, follow: false },
};

export default async function AdminCustomersPage() {
  const owner = await requireAdminPage();
  const customers = await listCustomersWithStats();

  const active = customers.filter((c) => c.status === "active");
  const clients = active.filter((c) => c.stats.isClient);
  const owing = active.filter((c) => c.stats.outstandingCents > 0);
  const overdue = active.filter((c) => c.stats.overdueCents > 0);
  const outstanding = owing.reduce((sum, c) => sum + c.stats.outstandingCents, 0);
  const overdueTotal = overdue.reduce((sum, c) => sum + c.stats.overdueCents, 0);

  const rows: AdminCustomerListRow[] = customers.map((c) => ({
    id: c.id,
    customer_number: c.customer_number,
    kind: c.kind,
    status: c.status,
    display_name: c.display_name,
    company_name: c.company_name,
    primary_email: c.primary_email,
    phone: c.phone,
    preferred_language: c.preferred_language,
    has_portal: Boolean(c.user_id),
    tags: c.tags,
    contact_count: c.contact_count,
    stats: c.stats,
  }));

  const tiles = [
    {
      label: "Customers",
      value: String(active.length),
      hint: `${active.length - clients.length} lead${active.length - clients.length === 1 ? "" : "s"} not booked yet`,
      icon: Users,
    },
    {
      label: "Booked clients",
      value: String(clients.length),
      hint: "With at least one job",
      icon: Crown,
    },
    {
      label: "Outstanding",
      value: formatCadFromCents(outstanding),
      hint: `${owing.length} customer${owing.length === 1 ? "" : "s"} with a balance`,
      icon: BadgeDollarSign,
      accent: true,
    },
    {
      label: "Overdue",
      value: formatCadFromCents(overdueTotal),
      hint: overdue.length
        ? `${overdue.length} customer${overdue.length === 1 ? "" : "s"} past due — filter “Overdue”`
        : "Nobody is past due",
      icon: AlertTriangle,
      warn: overdue.length > 0,
    },
  ];

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Relationships"
          title="Customers"
          description="One profile per client: contacts, language, billing defaults, venues and full history."
          icon={Users}
          actions={<AdminCustomerCreateButton />}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                className={
                  tile.accent
                    ? "rounded-2xl border border-primary/40 bg-primary/10 p-4"
                    : tile.warn
                      ? "rounded-2xl border border-destructive/40 bg-destructive/10 p-4"
                      : "rounded-2xl border border-border/40 bg-card/30 p-4"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-primary">{tile.label}</p>
                  <Icon className={tile.warn ? "size-4 text-destructive" : "size-4 text-primary/70"} />
                </div>
                <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums">{tile.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
              </div>
            );
          })}
        </div>
        <AdminCustomersList rows={rows} />
      </div>
    </AdminPageFrame>
  );
}

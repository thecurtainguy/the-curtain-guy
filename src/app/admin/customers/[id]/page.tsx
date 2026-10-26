import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  FileText,
  Mail,
  Phone,
  Tag,
  TrendingUp,
} from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import { AdminCustomerProfileForm } from "@/components/admin/customers/admin-customer-profile-form";
import { AdminCustomerContacts } from "@/components/admin/customers/admin-customer-contacts";
import { AdminCustomerVenues } from "@/components/admin/customers/admin-customer-venues";
import { AdminCustomerHistory } from "@/components/admin/customers/admin-customer-history";
import {
  AdminCustomerAccountActions,
  AdminCustomerActivity,
  AdminCustomerPortalCard,
  AdminCustomerStatementCard,
} from "@/components/admin/customers/admin-customer-sidebar";
import { AdminNewInvoiceButton } from "@/components/admin/customers/admin-new-invoice-dialog";
import { CUSTOMER_KIND_ICONS } from "@/components/admin/customers/customer-ui";
import {
  CUSTOMER_KIND_LABELS,
  EMPTY_CUSTOMER_STATS,
  formatCustomerNumber,
} from "@/data/customers";
import { CUSTOMER_LANGUAGE_LABELS } from "@/data/customer-language";
import { formatCadFromCents } from "@/data/quotes";
import { getBusinessSettings } from "@/lib/business-settings";
import {
  computeCustomerStats,
  fetchCustomerById,
  fetchCustomerHistory,
  getCustomerPortalStatus,
  listCustomerContacts,
  listCustomerEvents,
  listCustomerVenues,
} from "@/lib/customers";

export const metadata: Metadata = {
  title: "Customer",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

const OPEN_QUOTE = new Set(["draft", "sent", "viewed", "revision_requested", "accepted"]);
const OPEN_INVOICE = new Set(["draft", "sent", "partially_paid"]);

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminCustomerPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const customer = await fetchCustomerById(id);
  if (!customer) notFound();

  const [contacts, venues, history, statsMap, portal, events, settings] = await Promise.all([
    listCustomerContacts(id),
    listCustomerVenues(id),
    fetchCustomerHistory(id),
    computeCustomerStats([id]),
    getCustomerPortalStatus(customer),
    listCustomerEvents(id),
    getBusinessSettings(),
  ]);
  const stats = statsMap.get(id) ?? EMPTY_CUSTOMER_STATS;
  const KindIcon = CUSTOMER_KIND_ICONS[customer.kind];

  const lang = customer.preferred_language;
  const openDocuments = {
    quotes: history.quotes.filter((q) => OPEN_QUOTE.has(q.status) && q.language === lang).length,
    invoices: history.invoices.filter((i) => OPEN_INVOICE.has(i.status) && i.language === lang).length,
    estimates: 0,
  };
  const invoicedJobIds = new Set(history.invoices.filter((i) => i.status !== "void").map((i) => i.job_id));
  const jobs = history.jobs.map((job) => ({
    id: job.id,
    label: `${job.event_type || "Event"} · ${formatDate(job.event_date)}`,
    hasInvoice: invoicedJobIds.has(job.id),
  }));
  const linkedRecordCount =
    history.estimates.length +
    history.quotes.length +
    history.jobs.length +
    history.invoices.length +
    history.studioDesigns.length +
    history.eventPlans.length;

  const picked = {
    id: customer.id,
    customer_number: customer.customer_number,
    display_name: customer.display_name,
    company_name: customer.company_name,
    primary_email: customer.primary_email,
    phone: customer.phone,
    kind: customer.kind,
    preferred_language: customer.preferred_language,
  };

  const tiles = [
    {
      label: "Lifetime paid",
      value: formatCadFromCents(stats.lifetimePaidCents),
      hint: `${stats.invoices} invoice${stats.invoices === 1 ? "" : "s"}`,
      icon: TrendingUp,
    },
    {
      label: "Outstanding",
      value: formatCadFromCents(stats.outstandingCents),
      hint: stats.outstandingCents > 0 ? "Across open invoices" : "Nothing owing",
      icon: BadgeDollarSign,
      accent: stats.outstandingCents > 0,
    },
    {
      label: "Overdue",
      value: formatCadFromCents(stats.overdueCents),
      hint: stats.overdueInvoices
        ? `${stats.overdueInvoices} invoice${stats.overdueInvoices === 1 ? "" : "s"} past due`
        : "All on time",
      icon: AlertTriangle,
      warn: stats.overdueCents > 0,
    },
    {
      label: stats.nextEventDate ? "Next event" : "Last event",
      value: formatDate(stats.nextEventDate ?? stats.lastEventDate),
      hint: `${stats.jobs} job${stats.jobs === 1 ? "" : "s"} · ${stats.quotes} quote${stats.quotes === 1 ? "" : "s"}`,
      icon: CalendarDays,
    },
  ];

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow={`${formatCustomerNumber(customer.customer_number)} · ${CUSTOMER_KIND_LABELS[customer.kind]}${customer.status === "archived" ? " · Archived" : ""}`}
          title={customer.display_name}
          description={customer.company_name ?? undefined}
          icon={KindIcon}
          backHref="/admin/customers"
          backLabel="All customers"
          actions={
            <>
              <Button asChild variant="outline">
                <Link href={`/admin/quotes/new?customer=${customer.id}`}>
                  <FileText className="size-4" />
                  New quote
                </Link>
              </Button>
              <AdminNewInvoiceButton
                customer={picked}
                billing={{ po_required: customer.po_required, default_po_number: customer.default_po_number }}
                jobs={jobs}
              />
            </>
          }
        />

        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={`mailto:${customer.primary_email}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1 hover:border-primary/40"
          >
            <Mail className="size-3.5 text-primary" />
            {customer.primary_email}
          </a>
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1 hover:border-primary/40"
            >
              <Phone className="size-3.5 text-primary" />
              {customer.phone}
            </a>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            {CUSTOMER_LANGUAGE_LABELS[customer.preferred_language]}
          </span>
          {customer.currency !== "CAD" ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1">{customer.currency}</span>
          ) : null}
          {customer.tax_exempt ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1">Tax exempt</span>
          ) : null}
          {customer.po_required ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1">PO required</span>
          ) : null}
          {customer.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/40 px-3 py-1"
            >
              <Tag className="size-3 text-primary" />
              {tag}
            </span>
          ))}
        </div>

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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-6">
            <AdminCustomerHistory history={history} />
            <AdminCustomerContacts customerId={customer.id} contacts={contacts} />
            <AdminCustomerVenues customerId={customer.id} venues={venues} />
            <AdminCustomerProfileForm
              customer={customer}
              paymentMethods={settings.payment_methods
                .filter((m) => m.enabled)
                .map((m) => ({ id: m.id, label: m.label }))}
              businessDefaults={{
                depositPercent: settings.default_deposit_percent,
                dueDays: settings.default_due_days,
              }}
              openDocuments={openDocuments}
            />
          </div>
          <aside className="space-y-6">
            <AdminCustomerPortalCard customer={customer} portal={portal} />
            <AdminCustomerStatementCard customer={customer} invoiceCount={history.invoices.length} />
            <AdminCustomerActivity events={events} />
            <AdminCustomerAccountActions customer={customer} linkedRecordCount={linkedRecordCount} />
          </aside>
        </div>
      </div>
    </AdminPageFrame>
  );
}

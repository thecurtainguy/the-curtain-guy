"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  History,
  Palette,
  Receipt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { CustomerPanel } from "@/components/admin/customers/customer-panel";
import { JOB_STATUS_LABELS, type JobStatus } from "@/data/jobs";
import { QUOTE_STATUS_LABELS, formatMoneyFromCents, type QuoteStatus } from "@/data/quotes";
import { STUDIO_STATUS_LABELS, type StudioDesignStatus } from "@/data/studio";
import type { CustomerHistory } from "@/lib/customers";
import { cn } from "@/lib/utils";

type TabId = "invoices" | "jobs" | "quotes" | "requests" | "payments" | "designs" | "plans";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Row({
  href,
  title,
  subtitle,
  meta,
  badge,
}: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/30 bg-card/30 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-card/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {badge}
      {meta ? <div className="text-right text-sm tabular-nums">{meta}</div> : null}
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

export function AdminCustomerHistory({ history }: { history: CustomerHistory }) {
  const tabs: Array<{ id: TabId; label: string; icon: LucideIcon; count: number }> = [
    { id: "invoices", label: "Invoices", icon: Receipt, count: history.invoices.length },
    { id: "jobs", label: "Jobs", icon: CalendarDays, count: history.jobs.length },
    { id: "quotes", label: "Quotes", icon: FileText, count: history.quotes.length },
    { id: "requests", label: "Requests", icon: ClipboardList, count: history.estimates.length },
    { id: "payments", label: "Payments", icon: CreditCard, count: history.payments.length },
    { id: "designs", label: "Studio", icon: Palette, count: history.studioDesigns.length },
    { id: "plans", label: "Event plans", icon: Sparkles, count: history.eventPlans.length },
  ];
  const firstWithData = tabs.find((t) => t.count > 0)?.id ?? "invoices";
  const [tab, setTab] = useState<TabId>(firstWithData);

  return (
    <CustomerPanel
      id="history"
      icon={History}
      eyebrow="History"
      title="Everything with this customer"
      description="Every request, quote, job, invoice and payment linked to this profile."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-3.5", active ? "text-primary" : "")} />
                {t.label}
                <span className="tabular-nums text-muted-foreground">{t.count}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {tab === "invoices" &&
            (history.invoices.length ? (
              history.invoices.map((inv) => (
                <Row
                  key={inv.id}
                  href={`/admin/invoices/${inv.id}`}
                  title={inv.invoice_number}
                  subtitle={`Issued ${formatDate(inv.issue_date)}${inv.event_date ? ` · Event ${formatDate(inv.event_date)}` : ""}${inv.job_id ? "" : " · Direct invoice"}`}
                  badge={<InvoiceStatusBadge invoice={inv} />}
                  meta={
                    <>
                      <div>{formatMoneyFromCents(inv.total_cents, "en", inv.currency)}</div>
                      {inv.status !== "void" && inv.status !== "draft" && inv.balance_due_cents > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {formatMoneyFromCents(inv.balance_due_cents, "en", inv.currency)} due
                        </div>
                      ) : null}
                    </>
                  }
                />
              ))
            ) : (
              <Empty text="No invoices yet." />
            ))}

          {tab === "jobs" &&
            (history.jobs.length ? (
              history.jobs.map((job) => (
                <Row
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  title={`${job.event_type || "Event"} · ${formatDate(job.event_date)}`}
                  subtitle={[job.opportunity_ref, job.venue_name].filter(Boolean).join(" · ")}
                  badge={<Pill>{JOB_STATUS_LABELS[job.status as JobStatus] ?? humanize(job.status)}</Pill>}
                />
              ))
            ) : (
              <Empty text="No booked jobs yet." />
            ))}

          {tab === "quotes" &&
            (history.quotes.length ? (
              history.quotes.map((quote) => (
                <Row
                  key={quote.id}
                  href={`/admin/quotes/${quote.id}`}
                  title={quote.quote_display_ref}
                  subtitle={`Created ${formatDate(quote.created_at)}${quote.event_date ? ` · Event ${formatDate(quote.event_date)}` : ""} · ${(quote.language ?? "en").toUpperCase()}`}
                  badge={<Pill>{QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? humanize(quote.status)}</Pill>}
                  meta={formatMoneyFromCents(quote.total_cents, "en", "CAD")}
                />
              ))
            ) : (
              <Empty text="No quotes yet." />
            ))}

          {tab === "requests" &&
            (history.estimates.length ? (
              history.estimates.map((est) => (
                <Row
                  key={est.id}
                  href={`/admin/estimates/${est.id}`}
                  title={`${est.opportunity_ref ?? "Request"} · ${est.event_type || "Event"}`}
                  subtitle={`Received ${formatDate(est.created_at)}${est.event_date ? ` · Event ${formatDate(est.event_date)}` : ""}`}
                  badge={<Pill>{humanize(est.status)}</Pill>}
                />
              ))
            ) : (
              <Empty text="No website requests." />
            ))}

          {tab === "payments" &&
            (history.payments.length ? (
              history.payments.map((p) => (
                <Row
                  key={p.id}
                  href={`/admin/invoices/${p.invoice_id}`}
                  title={`${humanize(p.kind)} · ${p.invoice_number}`}
                  subtitle={`${formatDate(p.paid_on)}${p.method ? ` · ${p.method}` : ""}${p.reference ? ` · ${p.reference}` : ""}`}
                  meta={
                    <span className={p.kind === "refund" ? "text-destructive" : "text-primary"}>
                      {p.kind === "refund" ? "−" : ""}
                      {formatMoneyFromCents(p.amount_cents, "en", "CAD")}
                    </span>
                  }
                />
              ))
            ) : (
              <Empty text="No payments recorded." />
            ))}

          {tab === "designs" &&
            (history.studioDesigns.length ? (
              history.studioDesigns.map((d) => (
                <Row
                  key={d.id}
                  href={`/admin/studio/${d.id}`}
                  title={d.title || "Studio design"}
                  subtitle={`Created ${formatDate(d.created_at)}${d.event_date ? ` · Event ${formatDate(d.event_date)}` : ""}`}
                  badge={<Pill>{STUDIO_STATUS_LABELS[d.status as StudioDesignStatus] ?? humanize(d.status)}</Pill>}
                />
              ))
            ) : (
              <Empty text="No studio designs." />
            ))}

          {tab === "plans" &&
            (history.eventPlans.length ? (
              history.eventPlans.map((plan) => (
                <Row
                  key={plan.id}
                  href={`/admin/event-plans/${plan.id}`}
                  title={plan.reference}
                  subtitle={`Submitted ${formatDate(plan.created_at)}${plan.event_date ? ` · Event ${formatDate(plan.event_date)}` : ""}`}
                  badge={<Pill>{humanize(plan.status)}</Pill>}
                />
              ))
            ) : (
              <Empty text="No event plans." />
            ))}
        </div>
      </div>
    </CustomerPanel>
  );
}

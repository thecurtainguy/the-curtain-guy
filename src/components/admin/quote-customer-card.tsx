import Link from "next/link";
import { ArrowUpRight, Building2, Mail, UserRound } from "lucide-react";
import { formatCustomerNumber, type CustomerLinkSummary } from "@/data/customers";

const chipClass =
  "rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary";

/** Right-rail customer card on the admin quote page. */
export function QuoteCustomerCard({
  customer,
  contactName,
  contactEmail,
}: {
  customer: CustomerLinkSummary;
  contactName: string;
  contactEmail: string;
}) {
  const title = customer.company_name || customer.display_name;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/25 p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(212,175,55,0.08),transparent_55%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Customer · {formatCustomerNumber(customer.customer_number)}
            </p>
            <h2 className="truncate font-heading text-base font-semibold leading-tight">{title}</h2>
          </div>
          <Link
            href={`/admin/customers/${customer.id}`}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            Profile
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-3 space-y-1.5 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 text-xs">
          <p className="flex items-center gap-2 text-foreground">
            <UserRound className="size-3.5 shrink-0 text-primary" />
            <span className="truncate font-medium">{contactName || "No contact"}</span>
            <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Quote contact
            </span>
          </p>
          {contactEmail ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3.5 shrink-0 text-primary/70" />
              <span className="truncate">{contactEmail}</span>
            </p>
          ) : null}
          {customer.quoteCc.length > 0 ? (
            <p className="truncate pl-5.5 text-muted-foreground">Cc {customer.quoteCc.join(", ")}</p>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={chipClass}>{customer.currency}</span>
          {customer.tax_exempt ? <span className={chipClass}>Tax exempt</span> : null}
          {customer.po_required ? <span className={chipClass}>PO required</span> : null}
          {customer.contactOptions.length > 1 ? (
            <span className="rounded-full border border-border/50 bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {customer.contactOptions.length} contacts
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

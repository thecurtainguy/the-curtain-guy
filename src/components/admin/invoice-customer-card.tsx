import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { formatCustomerNumber, type CustomerLinkSummary } from "@/data/customers";

/** Compact right-rail card: who this invoice is for, and which currency it uses. */
export function InvoiceCustomerCard({
  customer,
  contactName,
  companyName,
  email,
  currency,
  poNumber,
}: {
  customer?: CustomerLinkSummary | null;
  contactName: string;
  companyName: string;
  email: string;
  currency: string;
  poNumber: string;
}) {
  const title = companyName.trim() || customer?.company_name || customer?.display_name || contactName.trim() || "No customer";
  const person = contactName.trim();
  const showPerson = person.length > 0 && person !== title;
  const profileCurrency = customer?.currency ?? null;
  const currencyDiffers = Boolean(profileCurrency && profileCurrency !== currency);
  const chips = [
    customer?.tax_exempt ? "Tax exempt" : null,
    customer?.po_required && !poNumber.trim() ? "PO required" : null,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/25 p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(212,175,55,0.08),transparent_55%)]"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Building2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {customer ? `Customer · ${formatCustomerNumber(customer.customer_number)}` : "Customer"}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <h2 className="min-w-0 truncate font-heading text-base font-semibold leading-tight">{title}</h2>
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {currency}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {[showPerson ? person : null, email.trim() || null].filter(Boolean).join(" · ") || "No contact on this invoice"}
          </p>
          {currencyDiffers ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Profile bills in {profileCurrency}</p>
          ) : null}
          {chips.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border/50 bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {customer ? (
          <Link
            href={`/admin/customers/${customer.id}`}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            Profile
            <ArrowUpRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

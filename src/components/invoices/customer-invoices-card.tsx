import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import type { CustomerLanguage } from "@/data/customer-language";
import { computeAmountDue, getInvoiceCopy, type InvoiceRow } from "@/data/invoices";
import { formatCadFromCents } from "@/data/quotes";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";

export function CustomerInvoicesCard({
  invoices,
  language = "en",
}: {
  invoices: InvoiceRow[];
  language?: CustomerLanguage;
}) {
  if (invoices.length === 0) return null;
  const t = getInvoiceCopy(language);

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card/30">
      <div className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Receipt className="size-5" />
        </span>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {language === "fr" ? "Facturation" : "Billing"}
          </p>
          <h2 className="font-heading text-lg font-semibold">
            {language === "fr" ? "Vos factures" : "Your invoices"}
          </h2>
        </div>
      </div>
      <ul className="divide-y divide-border/40">
        {invoices.map((invoice) => {
          const due = computeAmountDue(invoice);
          return (
            <li key={invoice.id}>
              <Link
                href={`/account/invoices/${invoice.id}`}
                className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-semibold">{invoice.invoice_number}</span>
                    <InvoiceStatusBadge invoice={invoice} language={language} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.total}: {formatCadFromCents(invoice.total_cents, language)}
                  </p>
                </div>
                {due.dueNowKind !== "none" ? (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-primary">
                      {due.dueNowKind === "deposit" ? t.depositDue : t.balanceDue}
                    </p>
                    <p className="font-heading text-lg font-semibold tabular-nums">
                      {formatCadFromCents(due.dueNowCents, language)}
                    </p>
                  </div>
                ) : null}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

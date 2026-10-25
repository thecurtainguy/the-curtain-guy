import type { CustomerLanguage } from "@/data/customer-language";
import {
  INVOICE_STATUS_LABELS,
  invoiceDisplayStatus,
  type InvoiceRow,
  type InvoiceStatus,
} from "@/data/invoices";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<InvoiceStatus | "overdue", string> = {
  draft:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
  sent:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-transparent",
  partially_paid:
    "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-transparent",
  paid:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  void:
    "bg-stone-100 text-stone-500 ring-stone-400/40 line-through dark:bg-muted/30 dark:text-muted-foreground dark:ring-transparent",
  overdue:
    "bg-rose-100 text-rose-900 ring-rose-700/25 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-transparent",
};

export function InvoiceStatusBadge({
  invoice,
  language = "en",
  className,
}: {
  invoice: Pick<InvoiceRow, "status" | "due_date" | "balance_due_cents">;
  language?: CustomerLanguage;
  className?: string;
}) {
  const status = invoiceDisplayStatus(invoice);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1",
        STATUS_STYLES[status],
        className
      )}
    >
      {INVOICE_STATUS_LABELS[language][status]}
    </span>
  );
}

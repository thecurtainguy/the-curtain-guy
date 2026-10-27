import {
  formatMoneyFromCents,
  getQuoteTaxBreakdownRows,
  type QuoteRow,
} from "@/data/quotes";
import type { CustomerLanguage } from "@/data/customer-language";
import { cn } from "@/lib/utils";

type QuoteTaxFields = Pick<
  QuoteRow,
  | "tax_mode"
  | "subtotal_cents"
  | "taxable_subtotal_cents"
  | "nontaxable_subtotal_cents"
  | "gst_cents"
  | "qst_cents"
  | "gst_rate"
  | "qst_rate"
  | "manual_tax_label"
  | "manual_tax_cents"
  | "manual_tax_lines"
  | "total_cents"
>;

export function QuoteTaxBreakdown({
  quote,
  variant = "customer",
  language = "en",
  currency = "CAD",
  className,
}: {
  quote: QuoteTaxFields;
  variant?: "admin" | "customer";
  language?: CustomerLanguage;
  currency?: string | null;
  className?: string;
}) {
  const rows = getQuoteTaxBreakdownRows(quote, { variant, language, currency });

  return (
    <dl className={cn("space-y-2", className)}>
      {rows.map((row) => {
        const isTotal = row.emphasis === "total";
        const isMuted = row.emphasis === "muted";
        return (
          <div
            key={row.key}
            className={cn(
              "flex items-baseline justify-between gap-4",
              isTotal &&
                "mt-2 border-t border-border/40 pt-3 font-heading text-base font-semibold"
            )}
          >
            <dt
              className={cn(
                "text-sm",
                isTotal
                  ? "text-foreground"
                  : isMuted
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
              )}
            >
              {row.label}
            </dt>
            <dd
              className={cn(
                "tabular-nums",
                isTotal
                  ? "text-lg text-primary sm:text-xl"
                  : isMuted
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-medium text-foreground"
              )}
            >
              {formatMoneyFromCents(row.amountCents, language, currency)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

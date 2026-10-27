import type { CustomerLanguage } from "@/data/customer-language";
import { formatQuoteUnitPrice, formatQuoteUnitSuffix } from "@/data/quotes";
import { cn } from "@/lib/utils";

/** Unit price on a single line, with the unit ("/ event", "ea") set smaller beside it. */
export function UnitPriceCell({
  cents,
  unit,
  language,
  currency,
  className,
}: {
  cents: number;
  unit: string | null | undefined;
  language: CustomerLanguage;
  currency: string | null | undefined;
  className?: string;
}) {
  const suffix = formatQuoteUnitSuffix(unit, language);
  return (
    <span className={cn("whitespace-nowrap text-sm tabular-nums text-foreground/80", className)}>
      {formatQuoteUnitPrice(cents, null, language, currency)}
      {suffix ? <span className="ml-1 text-xs text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

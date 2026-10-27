"use client";

import { Banknote } from "lucide-react";
import {
  COMPACT_OPTION_CARD,
  COMPACT_OPTION_GRID,
  OptionCard,
} from "@/components/estimate/option-card";
import { CUSTOMER_CURRENCIES, type CustomerCurrency } from "@/data/customers";
import { cn } from "@/lib/utils";

const DESCRIPTIONS: Record<CustomerCurrency, string> = {
  CAD: "Canadian dollars. Prices show as $.",
  USD: "US dollars. Prices show as US$.",
};

export function CustomerCurrencyPicker({
  value,
  onChange,
  disabled,
  customerDefault,
  compact = false,
  className,
}: {
  value: CustomerCurrency;
  onChange: (currency: CustomerCurrency) => void;
  disabled?: boolean;
  customerDefault?: CustomerCurrency | null;
  /** Label only, tighter padding. */
  compact?: boolean;
  className?: string;
}) {
  const picker = (
    <div
      role="radiogroup"
      className={cn(
        compact ? COMPACT_OPTION_GRID : "grid gap-3 sm:grid-cols-2",
        disabled && "pointer-events-none opacity-60",
        className
      )}
      aria-disabled={disabled}
    >
      {CUSTOMER_CURRENCIES.map((currency) => (
        <OptionCard
          key={currency}
          option={{
            id: currency,
            label: currency,
            description: compact
              ? undefined
              : customerDefault === currency
                ? `${DESCRIPTIONS[currency]} Customer default.`
                : DESCRIPTIONS[currency],
            icon: Banknote,
          }}
          selected={value === currency}
          onSelect={() => onChange(currency)}
          className={compact ? COMPACT_OPTION_CARD : undefined}
        />
      ))}
    </div>
  );
  return compact ? <div className="@container">{picker}</div> : picker;
}

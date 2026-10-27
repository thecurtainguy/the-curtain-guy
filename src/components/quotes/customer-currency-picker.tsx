"use client";

import { Banknote } from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
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
  className,
}: {
  value: CustomerCurrency;
  onChange: (currency: CustomerCurrency) => void;
  disabled?: boolean;
  customerDefault?: CustomerCurrency | null;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-3 sm:grid-cols-2",
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
            description:
              customerDefault === currency
                ? `${DESCRIPTIONS[currency]} Customer default.`
                : DESCRIPTIONS[currency],
            icon: Banknote,
          }}
          selected={value === currency}
          onSelect={() => onChange(currency)}
        />
      ))}
    </div>
  );
}

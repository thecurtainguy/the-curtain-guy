"use client";

import { Languages } from "lucide-react";
import {
  COMPACT_OPTION_CARD,
  COMPACT_OPTION_GRID,
  OptionCard,
} from "@/components/estimate/option-card";
import {
  CUSTOMER_LANGUAGES,
  CUSTOMER_LANGUAGE_LABELS,
  type CustomerLanguage,
} from "@/data/customer-language";
import { cn } from "@/lib/utils";

const DEFAULT_DESCRIPTIONS: Record<CustomerLanguage, string> = {
  en: "Proposal page, PDF, and emails in English.",
  fr: "Page, PDF et courriels en français.",
};

export function CustomerLanguagePicker({
  value,
  onChange,
  disabled,
  descriptions = DEFAULT_DESCRIPTIONS,
  compact = false,
  className,
}: {
  value: CustomerLanguage | null;
  onChange: (language: CustomerLanguage) => void;
  disabled?: boolean;
  descriptions?: Record<CustomerLanguage, string>;
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
      {CUSTOMER_LANGUAGES.map((language) => (
        <OptionCard
          key={language}
          option={{
            id: language,
            label: CUSTOMER_LANGUAGE_LABELS[language],
            description: compact ? undefined : descriptions[language],
            icon: Languages,
          }}
          selected={value === language}
          onSelect={() => onChange(language)}
          className={compact ? COMPACT_OPTION_CARD : undefined}
        />
      ))}
    </div>
  );
  return compact ? <div className="@container">{picker}</div> : picker;
}

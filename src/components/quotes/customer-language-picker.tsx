"use client";

import { Languages } from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
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
  className,
}: {
  value: CustomerLanguage | null;
  onChange: (language: CustomerLanguage) => void;
  disabled?: boolean;
  descriptions?: Record<CustomerLanguage, string>;
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
      {CUSTOMER_LANGUAGES.map((language) => (
        <OptionCard
          key={language}
          option={{
            id: language,
            label: CUSTOMER_LANGUAGE_LABELS[language],
            description: descriptions[language],
            icon: Languages,
          }}
          selected={value === language}
          onSelect={() => onChange(language)}
        />
      ))}
    </div>
  );
}

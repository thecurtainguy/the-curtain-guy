import { Languages } from "lucide-react";
import {
  CUSTOMER_LANGUAGE_LABELS,
  normalizeCustomerLanguage,
} from "@/data/customer-language";
import { cn } from "@/lib/utils";

export function CustomerLanguageBadge({
  language,
  className,
}: {
  language: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary",
        className
      )}
    >
      <Languages className="size-3" aria-hidden />
      {CUSTOMER_LANGUAGE_LABELS[normalizeCustomerLanguage(language)]}
    </span>
  );
}

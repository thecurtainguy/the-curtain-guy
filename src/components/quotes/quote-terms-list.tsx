import { splitQuoteTerms } from "@/data/quotes";
import { cn } from "@/lib/utils";

export function QuoteTermsList({
  terms,
  fallback,
  className,
  compact,
  tone = "ui",
}: {
  terms?: string | null;
  fallback?: string | null;
  className?: string;
  compact?: boolean;
  tone?: "ui" | "paper";
}) {
  const items = splitQuoteTerms(terms, fallback);

  if (items.length === 0) {
    return (
      <p
        className={cn(
          "text-sm",
          tone === "paper" ? "text-[#6b635a]" : "text-muted-foreground",
          className
        )}
      >
        No terms on this proposal yet.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-2.5", compact && "space-y-2", className)}>
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-3">
          <span
            className={cn(
              "mt-0.5 shrink-0 font-heading font-semibold tabular-nums",
              compact ? "w-4 text-[11px]" : "w-5 text-xs",
              tone === "paper" ? "text-[#8a6d1d]" : "text-primary"
            )}
          >
            {index + 1}.
          </span>
          <span
            className={cn(
              "min-w-0 leading-relaxed",
              compact ? "text-xs" : "text-sm",
              tone === "paper" ? "text-[#6b635a]" : "text-muted-foreground"
            )}
          >
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

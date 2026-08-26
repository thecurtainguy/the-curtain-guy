import { cn } from "@/lib/utils";
import { getEventPlanStatusLabel, type EventPlanStatus } from "@/data/event-plans";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  reviewed:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
  quoted:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  archived:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted dark:text-muted-foreground dark:ring-border/50",
};

export function EventPlanStatusBadge({
  status,
  className,
}: {
  status: EventPlanStatus | string;
  className?: string;
}) {
  const label = getEventPlanStatusLabel(status as EventPlanStatus);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        STATUS_STYLES[status] ?? STATUS_STYLES.new,
        className
      )}
    >
      {label}
    </span>
  );
}

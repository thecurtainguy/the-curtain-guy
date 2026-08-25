import {
  JOB_STATUS_LABELS,
  type JobStatus,
} from "@/data/jobs";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<JobStatus, string> = {
  draft:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
  confirmed:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  details_needed:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-transparent",
  venue_confirmed:
    "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-transparent",
  production_planning:
    "bg-violet-100 text-violet-900 ring-violet-700/25 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-transparent",
  install_scheduled:
    "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-transparent",
  installed:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  event_completed:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  teardown_scheduled:
    "bg-orange-100 text-orange-950 ring-orange-700/25 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-transparent",
  teardown_completed:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  closed:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
  cancelled:
    "bg-rose-100 text-rose-900 ring-rose-700/25 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-transparent",
};

const pillBase =
  "inline-flex rounded-full font-semibold uppercase tracking-[0.08em] ring-1";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        pillBase,
        "px-2.5 py-1 text-[11px]",
        STATUS_STYLES[status]
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

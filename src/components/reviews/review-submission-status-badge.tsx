import { cn } from "@/lib/utils";
import {
  getReviewSubmissionStatusLabel,
  type ReviewSubmissionStatus,
} from "@/data/review-submissions";

const STATUS_STYLES: Record<ReviewSubmissionStatus, string> = {
  new: "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  reviewed:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
  approved:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  published:
    "bg-primary/15 text-primary ring-primary/25 dark:bg-primary/20 dark:text-primary dark:ring-primary/30",
  declined:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted dark:text-muted-foreground dark:ring-border/50",
  spam: "bg-rose-100 text-rose-900 ring-rose-700/25 dark:bg-destructive/15 dark:text-destructive dark:ring-destructive/30",
};

export function ReviewSubmissionStatusBadge({
  status,
  className,
}: {
  status: ReviewSubmissionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        STATUS_STYLES[status] ?? STATUS_STYLES.new,
        className
      )}
    >
      {getReviewSubmissionStatusLabel(status)}
    </span>
  );
}

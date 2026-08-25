import {
  QUOTE_LINE_STATUS_LABELS,
  QUOTE_REQUEST_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
  type QuoteLineStatus,
  type QuoteRequestStatus,
  type QuoteStatus,
} from "@/data/quotes";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
  sent: "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-transparent",
  viewed:
    "bg-violet-100 text-violet-900 ring-violet-700/25 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-transparent",
  accepted:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  declined:
    "bg-rose-100 text-rose-900 ring-rose-700/25 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-transparent",
  revision_requested:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-transparent",
  expired:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
  cancelled:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
};

const LINE_STYLES: Record<QuoteLineStatus, string> = {
  priced:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  included:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-primary/15 dark:text-primary dark:ring-transparent",
  pending_owner_review:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-transparent",
  not_priced_yet:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted/40 dark:text-muted-foreground dark:ring-transparent",
  requested_change:
    "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-transparent",
  approved:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
  declined:
    "bg-rose-100 text-rose-900 ring-rose-700/25 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-transparent",
  needs_measurement:
    "bg-orange-100 text-orange-950 ring-orange-700/25 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-transparent",
  needs_venue_confirmation:
    "bg-orange-100 text-orange-950 ring-orange-700/25 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-transparent",
};

const pillBase =
  "inline-flex rounded-full font-semibold uppercase tracking-[0.08em] ring-1";

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cn(
        pillBase,
        "px-2.5 py-1 text-[11px]",
        STATUS_STYLES[status]
      )}
    >
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

export function QuoteLineStatusBadge({ status }: { status: QuoteLineStatus }) {
  return (
    <span
      className={cn(
        pillBase,
        "px-2 py-0.5 text-[10px]",
        LINE_STYLES[status]
      )}
    >
      {QUOTE_LINE_STATUS_LABELS[status]}
    </span>
  );
}

export function QuoteRequestStatusBadge({
  status,
}: {
  status: QuoteRequestStatus;
}) {
  const style =
    status === "pending_owner_review"
      ? LINE_STYLES.pending_owner_review
      : status === "declined"
        ? LINE_STYLES.declined
        : status === "converted_to_line_item" || status === "approved"
          ? LINE_STYLES.priced
          : LINE_STYLES.not_priced_yet;

  return (
    <span
      className={cn(
        pillBase,
        "px-2 py-0.5 text-[10px]",
        style
      )}
    >
      {QUOTE_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

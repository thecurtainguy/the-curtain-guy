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
  draft: "bg-muted/40 text-muted-foreground",
  sent: "bg-sky-500/15 text-sky-300",
  viewed: "bg-violet-500/15 text-violet-300",
  accepted: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-rose-500/15 text-rose-300",
  revision_requested: "bg-amber-500/15 text-amber-300",
  expired: "bg-muted/40 text-muted-foreground",
  cancelled: "bg-muted/40 text-muted-foreground",
};

const LINE_STYLES: Record<QuoteLineStatus, string> = {
  priced: "bg-emerald-500/15 text-emerald-300",
  included: "bg-primary/15 text-primary",
  pending_owner_review: "bg-amber-500/15 text-amber-300",
  not_priced_yet: "bg-muted/40 text-muted-foreground",
  requested_change: "bg-sky-500/15 text-sky-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-rose-500/15 text-rose-300",
  needs_measurement: "bg-orange-500/15 text-orange-300",
  needs_venue_confirmation: "bg-orange-500/15 text-orange-300",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
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
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
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
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        style
      )}
    >
      {QUOTE_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

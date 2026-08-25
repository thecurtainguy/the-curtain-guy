import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  reviewed: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  quoted: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  closed: "bg-muted text-muted-foreground ring-border/50",
  spam: "bg-destructive/15 text-destructive ring-destructive/30",
};

export function EstimateStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1",
        STATUS_STYLES[status] ?? STATUS_STYLES.new,
        className
      )}
    >
      {status}
    </span>
  );
}

import { cn } from "@/lib/utils";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_KIND_LABELS,
  type ProductAvailabilityStatus,
  type ProductKind,
} from "@/data/products";

const AVAILABILITY_STYLES: Record<ProductAvailabilityStatus, string> = {
  available:
    "bg-emerald-100 text-emerald-900 ring-emerald-700/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  low_stock:
    "bg-amber-100 text-amber-950 ring-amber-700/25 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
  out_of_stock:
    "bg-rose-100 text-rose-900 ring-rose-700/25 dark:bg-destructive/15 dark:text-destructive dark:ring-destructive/30",
  unavailable:
    "bg-stone-100 text-stone-700 ring-stone-400/40 dark:bg-muted dark:text-muted-foreground dark:ring-border/50",
};

const KIND_STYLES: Record<ProductKind, string> = {
  product:
    "bg-primary/10 text-primary ring-primary/25",
  service:
    "bg-sky-100 text-sky-900 ring-sky-700/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
};

export function ProductAvailabilityBadge({
  status,
  className,
}: {
  status: ProductAvailabilityStatus | string;
  className?: string;
}) {
  const key = (status in AVAILABILITY_STYLES
    ? status
    : "available") as ProductAvailabilityStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        AVAILABILITY_STYLES[key],
        className
      )}
    >
      {PRODUCT_AVAILABILITY_LABELS[key] ?? status}
    </span>
  );
}

export function ProductKindBadge({
  kind,
  className,
}: {
  kind: ProductKind | string;
  className?: string;
}) {
  const key = (kind in KIND_STYLES ? kind : "product") as ProductKind;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        KIND_STYLES[key],
        className
      )}
    >
      {PRODUCT_KIND_LABELS[key] ?? kind}
    </span>
  );
}

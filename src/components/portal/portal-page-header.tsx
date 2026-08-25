import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel,
  meta,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/30 pb-6 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-4" />
            {backLabel ?? "Back"}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

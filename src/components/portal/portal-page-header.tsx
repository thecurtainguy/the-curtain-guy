import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalBackLink } from "@/components/portal/portal-back-link";

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  backHref,
  backLabel,
  meta,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {backHref ? (
        <PortalBackLink href={backHref}>
          {backLabel ?? "Back"}
        </PortalBackLink>
      ) : null}

      <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative bg-gradient-to-br from-primary/10 via-card to-card px-5 py-5 sm:px-6 sm:py-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.12),transparent_55%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
              {Icon ? (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 sm:size-12">
                  <Icon className="size-5" />
                </span>
              ) : null}
              <div className="min-w-0 space-y-1.5">
                {eyebrow ? (
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
                {meta ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
                    {meta}
                  </div>
                ) : null}
              </div>
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </div>
  );
}

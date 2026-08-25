"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PortalTopbar({
  title,
  subtitle,
  badge,
  actions,
  onMenuClick,
  className,
}: {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8",
        className
      )}
    >
      {onMenuClick ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>
      ) : null}

      <div className="min-w-0 flex-1">
        {title ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            {badge}
          </div>
        ) : null}
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

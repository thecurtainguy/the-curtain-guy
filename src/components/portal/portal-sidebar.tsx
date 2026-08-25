"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { usePortalSidebar } from "@/components/portal/portal-sidebar-context";
import { PortalTooltip } from "@/components/portal/portal-tooltip";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
  badge?: string;
  external?: boolean;
};

export function PortalSidebarBrand({
  href,
  portalLabel,
}: {
  href: string;
  /** Centered label under the logo (e.g. Customer Portal / Admin Portal). */
  portalLabel: string;
}) {
  const { isRail } = usePortalSidebar();

  return (
    <div
      className={cn(
        "flex flex-col items-center border-b border-border",
        isRail ? "px-2 py-4" : "gap-2 px-3 py-4"
      )}
    >
      {isRail ? (
        <PortalTooltip label={portalLabel} enabled>
          <span className="inline-flex">
            <BrandLogo href={href} size="sm" className="size-10" />
          </span>
        </PortalTooltip>
      ) : (
        <>
          <BrandLogo
            href={href}
            size="header"
            compact
            className="mx-auto h-10 w-[12rem] max-w-full"
            imageClassName="object-center"
          />
          <p className="flex w-full max-w-[12rem] items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            <span
              className="h-px min-w-3 flex-1 bg-gradient-to-r from-transparent via-primary/55 to-primary/80"
              aria-hidden
            />
            <span className="shrink-0 whitespace-nowrap">{portalLabel}</span>
            <span
              className="h-px min-w-3 flex-1 bg-gradient-to-l from-transparent via-primary/55 to-primary/80"
              aria-hidden
            />
          </p>
        </>
      )}
    </div>
  );
}

export function PortalSidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: PortalNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const { isRail } = usePortalSidebar();

  return (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-0.5 py-4",
        isRail ? "px-2" : "px-3"
      )}
      aria-label="Portal"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (item.disabled) {
          const disabledNode = (
            <span
              className={cn(
                "inline-flex cursor-not-allowed items-center rounded-xl text-sm text-muted-foreground/50",
                isRail
                  ? "justify-center px-2 py-2.5"
                  : "gap-3 px-3 py-2.5"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!isRail ? (
                <>
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {item.badge ?? "Soon"}
                  </span>
                </>
              ) : null}
            </span>
          );

          return (
            <PortalTooltip key={item.href} label={item.label} enabled={isRail}>
              {disabledNode}
            </PortalTooltip>
          );
        }

        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-label={item.label}
            className={cn(
              "inline-flex items-center rounded-xl text-sm font-medium transition-[color,background-color,transform] duration-150 motion-reduce:transition-none active:scale-[0.98]",
              isRail ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              active
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/0.25)]"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!isRail ? (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.badge}
                  </span>
                ) : null}
              </>
            ) : null}
          </Link>
        );

        return (
          <PortalTooltip key={item.href} label={item.label} enabled={isRail}>
            {link}
          </PortalTooltip>
        );
      })}
    </nav>
  );
}

export function PortalSidebarFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRail } = usePortalSidebar();

  return (
    <div
      className={cn(
        "space-y-1 border-t border-border py-3",
        isRail ? "px-2" : "px-3"
      )}
    >
      {children}
    </div>
  );
}

export function PortalSidebarAction({
  href,
  onClick,
  icon: Icon,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  const { isRail } = usePortalSidebar();
  const label = typeof children === "string" ? children : undefined;

  const classes = cn(
    "inline-flex items-center rounded-xl text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
    isRail ? "w-full justify-center px-2 py-2.5" : "w-full gap-3 px-3 py-2.5",
    className
  );

  const control = href ? (
    <Link href={href} className={classes} onClick={onClick} aria-label={label}>
      <Icon className="size-4 shrink-0" />
      {!isRail ? children : null}
    </Link>
  ) : (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="size-4 shrink-0" />
      {!isRail ? children : null}
    </button>
  );

  return (
    <PortalTooltip label={label ?? ""} enabled={isRail && Boolean(label)}>
      {control}
    </PortalTooltip>
  );
}

export function PortalSidebarThemeRow({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isRail } = usePortalSidebar();

  if (isRail) {
    return (
      <div className="mb-1 flex justify-center">
        <PortalTooltip label="Theme" enabled>
          <span className="inline-flex">{children}</span>
        </PortalTooltip>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center justify-between px-3">
      <span className="text-xs text-muted-foreground">Theme</span>
      {children}
    </div>
  );
}

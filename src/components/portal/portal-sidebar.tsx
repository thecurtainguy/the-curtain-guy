"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

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
  email,
}: {
  href: string;
  portalLabel: string;
  email?: string | null;
}) {
  return (
    <div className="border-b border-border/40 px-4 py-5">
      <div className="flex items-center gap-3">
        <BrandLogo href={href} size="sm" />
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {portalLabel}
          </p>
          <Link
            href={href}
            className="truncate font-heading text-sm font-semibold text-foreground hover:text-primary"
          >
            The Curtain Guy
          </Link>
          {email ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {email}
            </p>
          ) : null}
        </div>
      </div>
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
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4" aria-label="Portal">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="inline-flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/50"
              title="Coming soon"
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                {item.badge ?? "Soon"}
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,transform] duration-150 motion-reduce:transition-none active:scale-[0.98]",
              active
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/0.25)]"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {item.badge}
              </span>
            ) : null}
          </Link>
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
  return (
    <div className="mt-auto space-y-1 border-t border-border/40 px-3 py-4">
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
  const classes = cn(
    "inline-flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        <Icon className="size-4 shrink-0" />
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}

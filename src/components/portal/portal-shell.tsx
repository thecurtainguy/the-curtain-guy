"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PortalTopbar } from "@/components/portal/portal-topbar";
import { Reveal } from "@/components/animation/reveal";
import { cn } from "@/lib/utils";

export function PortalShell({
  sidebar,
  topbarTitle,
  topbarSubtitle,
  topbarBadge,
  topbarActions,
  children,
  contentClassName,
  fillViewport = false,
}: {
  sidebar: React.ReactNode;
  topbarTitle?: string;
  topbarSubtitle?: string;
  topbarBadge?: React.ReactNode;
  topbarActions?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  /** App-like editor routes: full remaining width, fixed viewport height, no page scroll */
  fillViewport?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex bg-background",
        fillViewport ? "h-svh max-h-svh overflow-hidden" : "min-h-screen"
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(0.76_0.15_88/0.06),transparent_50%)]" />

      <aside className="hidden w-[260px] shrink-0 border-r border-border/40 bg-card/20 lg:flex lg:flex-col">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
          {sidebar}
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] max-w-[85vw] gap-0 p-0"
          showCloseButton
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div
            className="flex h-full flex-col overflow-y-auto"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("a")) setMobileOpen(false);
            }}
          >
            {sidebar}
          </div>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          fillViewport && "min-h-0 overflow-hidden"
        )}
      >
        <PortalTopbar
          title={topbarTitle}
          subtitle={topbarSubtitle}
          badge={topbarBadge}
          actions={topbarActions}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main
          className={cn(
            "flex-1",
            fillViewport && "min-h-0 overflow-hidden"
          )}
        >
          <div
            className={cn(
              "mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
              fillViewport &&
                "h-full max-w-none overflow-hidden px-2 py-2 sm:px-3 sm:py-2 lg:px-3",
              contentClassName
            )}
          >
            <Reveal
              variant="fade-up"
              immediate
              duration={0.28}
              className={fillViewport ? "h-full min-h-0" : undefined}
            >
              {children}
            </Reveal>
          </div>
        </main>
      </div>
    </div>
  );
}

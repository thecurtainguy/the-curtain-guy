"use client";

import { useEffect, useState } from "react";
import { Menu, PanelLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BackToTop } from "@/components/layout/back-to-top";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PORTAL_SIDEBAR_WIDTH_COLLAPSED,
  PORTAL_SIDEBAR_WIDTH_EXPANDED,
  PortalSidebarProvider,
  usePortalSidebar,
} from "@/components/portal/portal-sidebar-context";
import { PortalTooltip } from "@/components/portal/portal-tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";

function DesktopAside({ children }: { children: React.ReactNode }) {
  const { isRail, toggleCollapsed } = usePortalSidebar();
  const collapseLabel = isRail ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 shrink-0 flex-col border-r border-border bg-card transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex",
        isRail
          ? "w-[var(--portal-sidebar-collapsed)]"
          : "w-[var(--portal-sidebar-expanded)]"
      )}
      style={
        {
          "--portal-sidebar-expanded": `${PORTAL_SIDEBAR_WIDTH_EXPANDED}px`,
          "--portal-sidebar-collapsed": `${PORTAL_SIDEBAR_WIDTH_COLLAPSED}px`,
        } as React.CSSProperties
      }
      data-collapsed={isRail ? "true" : "false"}
      aria-label="Portal navigation"
    >
      <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
        {children}
        <div
          className={cn(
            "mt-auto shrink-0 border-t border-border py-2",
            isRail ? "flex justify-center px-2" : "px-3"
          )}
        >
          <PortalTooltip label={collapseLabel} enabled={isRail}>
            <Button
              type="button"
              variant="ghost"
              size={isRail ? "icon-sm" : "sm"}
              onClick={toggleCollapsed}
              aria-label={collapseLabel}
              aria-expanded={!isRail}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                !isRail && "w-full justify-start gap-2"
              )}
            >
              <PanelLeft
                className={cn(
                  "size-4 shrink-0 transition-transform duration-300",
                  !isRail && "scale-x-[-1]"
                )}
              />
              {!isRail ? <span>Collapse</span> : null}
            </Button>
          </PortalTooltip>
        </div>
      </div>
    </aside>
  );
}

export function PortalShell({
  sidebar,
  children,
  contentClassName,
  fillViewport = false,
  sidebarStorageKey = "tcg-portal-sidebar-collapsed",
  mobileBrandHref = "/",
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  /** App-like editor routes: content fills remaining height with no inner page scroll */
  fillViewport?: boolean;
  /** localStorage key for collapse preference (admin vs account). */
  sidebarStorageKey?: string;
  /** Logo target in the mobile top bar (portal home). */
  mobileBrandHref?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mainScrollEl, setMainScrollEl] = useState<HTMLElement | null>(null);

  // Prevent document scroll so the menu never rides with the page.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  return (
    <PortalSidebarProvider storageKey={sidebarStorageKey}>
      <TooltipProvider delayDuration={320}>
        {/* Self-sized to the viewport — do not rely on % height from parents */}
        <div className="flex h-svh max-h-svh w-full overflow-hidden bg-background">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(0.76_0.15_88/0.06),transparent_50%)]" />

          <DesktopAside>{sidebar}</DesktopAside>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="right"
              className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
              showCloseButton
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <PortalSidebarProvider
                storageKey={sidebarStorageKey}
                forceExpanded
              >
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)]"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a")) setMobileOpen(false);
                  }}
                >
                  <div className="luxury-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                    {sidebar}
                  </div>
                </div>
              </PortalSidebarProvider>
            </SheetContent>
          </Sheet>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="z-30 shrink-0 border-b border-border/40 bg-background pt-[env(safe-area-inset-top,0px)] lg:hidden">
              <div className="flex h-16 items-center justify-between gap-3 px-4">
                <BrandLogo href={mobileBrandHref} size="header" compact priority />
                <div className="flex items-center gap-2">
                  <ThemeToggle className="size-9 shrink-0" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <main
              ref={setMainScrollEl}
              data-portal-scroll-root=""
              className={cn(
                "min-h-0 min-w-0 flex-1 overscroll-contain",
                fillViewport ? "overflow-hidden" : "overflow-x-hidden overflow-y-auto"
              )}
            >
              <div
                className={cn(
                  "mx-auto w-full min-w-0 max-w-none px-4 py-5 sm:px-5 sm:py-6 lg:px-6 xl:px-8",
                  fillViewport &&
                    "h-full min-h-0 overflow-hidden px-2 py-2 sm:px-3 sm:py-2 lg:px-3",
                  contentClassName
                )}
              >
                {children}
              </div>
            </main>
            {!fillViewport ? <BackToTop scrollElement={mainScrollEl} /> : null}
          </div>
        </div>
      </TooltipProvider>
    </PortalSidebarProvider>
  );
}

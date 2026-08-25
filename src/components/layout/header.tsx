"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { navLinks, siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  HeaderAccountMenu,
  type HeaderSession,
} from "@/components/layout/header-account-menu";
import { headerActionClassName, headerActionGoldClassName } from "@/components/layout/header-actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/ui/guarded-link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [session, setSession] = useState<HeaderSession>({
    authenticated: false,
    role: null,
    email: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/session", { cache: "no-store" });
        const payload = (await res.json()) as {
          authenticated?: boolean;
          role?: "owner" | "customer" | null;
          email?: string | null;
        };
        if (!cancelled) {
          setSession({
            authenticated: Boolean(payload.authenticated),
            role: payload.role ?? null,
            email: payload.email ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setSession({ authenticated: false, role: null, email: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const threshold = 28;
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = window.scrollY > threshold;
      setCompact((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl supports-backdrop-filter:bg-background/60",
        "transition-[background-color,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        compact &&
          "border-border/50 bg-background/88 shadow-[0_10px_28px_-18px_oklch(0_0_0/0.45)]"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8",
          "transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "motion-reduce:transition-none",
          compact ? "h-14 sm:h-16" : "h-20 sm:h-24"
        )}
      >
        <BrandLogo href="/" size="header" compact={compact} priority />

        <nav
          className={cn(
            "hidden items-center lg:flex",
            compact ? "gap-0.5" : "gap-1"
          )}
          aria-label="Main"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <GuardedLink
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl text-sm font-medium transition-[color,background-color,box-shadow,transform,padding] duration-200 xl:px-3 motion-reduce:transition-none",
                  compact ? "px-2 py-1.5" : "px-2.5 py-2",
                  link.special
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isActive &&
                    "bg-muted/60 text-foreground shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                )}
              >
                {Icon && <Icon className="size-3.5" />}
                {link.label}
              </GuardedLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="size-9 shrink-0" />
          <HeaderAccountMenu session={session} />
          <Button
            asChild
            variant="outline"
            size="lg"
            className={cn(headerActionClassName, headerActionGoldClassName)}
          >
            <GuardedLink href="/get-estimate">Get Estimate</GuardedLink>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-border/50 bg-background">
              <SheetHeader className="items-start">
                <SheetTitle className="sr-only">{siteConfig.name}</SheetTitle>
                <BrandLogo
                  href="/"
                  size="xl"
                  onClick={() => setMobileOpen(false)}
                />
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname === link.href ||
                        pathname.startsWith(`${link.href}/`);

                  return (
                    <GuardedLink
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                        link.special
                          ? "text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        isActive && "bg-muted/60 text-foreground"
                      )}
                    >
                      {Icon && <Icon className="size-4" />}
                      {link.label}
                    </GuardedLink>
                  );
                })}

                <HeaderAccountMenu
                  session={session}
                  variant="mobile"
                  onNavigate={() => setMobileOpen(false)}
                />

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <Button asChild className="mt-2 w-full">
                  <GuardedLink
                    href="/get-estimate"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Estimate
                  </GuardedLink>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

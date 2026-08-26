"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Menu } from "lucide-react";
import { navLinks, siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  HeaderAccountMenu,
  type HeaderSession,
} from "@/components/layout/header-account-menu";
import { headerActionClassName, headerActionGoldClassName } from "@/components/layout/header-actions";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
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

const navKeyByHref: Record<string, string> = {
  "/": "home",
  "/services": "services",
  "/gallery": "gallery",
  "/about": "about",
  "/contact": "contact",
  "/studio": "studio",
};

export function Header() {
  const pathname = usePathname();
  const t = useTranslations("nav.links");
  const tc = useTranslations("common");
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
    const COMPACT_ON = 48;
    const COMPACT_OFF = 8;
    let frame = 0;
    let lockedUntil = 0;

    const update = () => {
      frame = 0;
      if (Date.now() < lockedUntil) return;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setCompact((prev) => {
        const next = prev ? y > COMPACT_OFF : y > COMPACT_ON;
        if (next !== prev) {
          lockedUntil = Date.now() + 320;
        }
        return next;
      });
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

  function navLabel(href: string, fallback: string) {
    const key = navKeyByHref[href];
    return key ? t(key) : fallback;
  }

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 w-full overflow-anchor-none border-b border-border/40 lg:sticky lg:left-auto lg:right-auto",
        "pt-[env(safe-area-inset-top,0px)]",
        "bg-background lg:bg-background/70 lg:backdrop-blur-xl lg:supports-backdrop-filter:bg-background/60",
        "transition-[background-color,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        compact &&
          "border-border/50 shadow-[0_10px_28px_-18px_oklch(0_0_0/0.45)] lg:bg-background/88"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:gap-4 sm:px-6 lg:px-8"
        )}
      >
        <BrandLogo href="/" size="header" compact={compact} priority />

        <nav
          className="hidden items-center gap-1 lg:flex"
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
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 xl:px-3 motion-reduce:transition-none",
                  link.special
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isActive &&
                    "bg-muted/60 text-foreground shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                )}
              >
                {Icon && <Icon className="size-3.5" />}
                {navLabel(link.href, link.label)}
              </GuardedLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle className="size-9 shrink-0" />
          <HeaderAccountMenu session={session} />
          <Button
            asChild
            variant="outline"
            size="lg"
            className={cn(headerActionClassName, headerActionGoldClassName, "hidden sm:inline-flex")}
          >
            <GuardedLink href="/get-estimate">{tc("getEstimate")}</GuardedLink>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="lg:hidden"
                aria-label={tc("openMenu")}
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden border-border/50 bg-background p-0 sm:max-w-sm"
            >
              <SheetHeader className="shrink-0 items-start px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
                <SheetTitle className="sr-only">{siteConfig.name}</SheetTitle>
                <BrandLogo
                  href="/"
                  size="header"
                  compact
                  onClick={() => setMobileOpen(false)}
                />
              </SheetHeader>
              <div className="luxury-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                <nav className="flex flex-col gap-0.5" aria-label="Mobile">
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
                          "flex min-h-10 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          link.special
                            ? "text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          isActive && "bg-muted/60 text-foreground"
                        )}
                      >
                        {Icon && <Icon className="size-4 shrink-0" />}
                        {navLabel(link.href, link.label)}
                      </GuardedLink>
                    );
                  })}

                  <HeaderAccountMenu
                    session={session}
                    variant="mobile"
                    onNavigate={() => setMobileOpen(false)}
                  />

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                    <span className="text-sm text-muted-foreground">{tc("theme")}</span>
                    <ThemeToggle />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                    <span className="text-sm text-muted-foreground">{tc("languageSwitcher")}</span>
                    <LanguageSwitcher />
                  </div>
                  <Button asChild className="mt-3 w-full min-h-10">
                    <GuardedLink
                      href="/get-estimate"
                      onClick={() => setMobileOpen(false)}
                    >
                      {tc("getEstimate")}
                    </GuardedLink>
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

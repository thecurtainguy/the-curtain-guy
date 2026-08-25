"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { navLinks, siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SessionState = {
  authenticated: boolean;
  role: "owner" | "customer" | null;
};

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<SessionState>({
    authenticated: false,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/session", { cache: "no-store" });
        const payload = (await res.json()) as {
          authenticated?: boolean;
          role?: "owner" | "customer" | null;
        };
        if (!cancelled) {
          setSession({
            authenticated: Boolean(payload.authenticated),
            role: payload.role ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setSession({ authenticated: false, role: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const accountHref =
    session.role === "owner"
      ? "/admin"
      : session.authenticated
        ? "/account"
        : "/account/login";
  const accountLabel =
    session.role === "owner"
      ? "Admin"
      : session.authenticated
        ? "Account"
        : "Sign in";

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:h-24 sm:px-6 lg:px-8">
        <BrandLogo href="/" size="header" priority />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors xl:px-3",
                  link.special
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isActive && "bg-muted/60 text-foreground"
                )}
              >
                {Icon && <Icon className="size-3.5" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href={accountHref}>{accountLabel}</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/get-estimate">Get Estimate</Link>
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
                    <Link
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
                    </Link>
                  );
                })}
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link
                    href={accountHref}
                    onClick={() => setMobileOpen(false)}
                  >
                    {accountLabel}
                  </Link>
                </Button>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <Button asChild className="mt-2 w-full">
                  <Link
                    href="/get-estimate"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Estimate
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

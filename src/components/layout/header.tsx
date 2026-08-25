"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { navLinks } from "@/data/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/data/site";

type SessionState = {
  authenticated: boolean;
  role: "owner" | "customer" | null;
};

export function Header() {
  const pathname = usePathname();
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 flex-col">
          <span className="font-heading text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {siteConfig.name}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-[11px]">
            {siteConfig.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
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

          <Sheet>
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
              <SheetHeader>
                <SheetTitle className="text-left font-heading">
                  {siteConfig.name}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
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
                  <Link href={accountHref}>{accountLabel}</Link>
                </Button>
                <Button asChild className="mt-2 w-full">
                  <Link href="/get-estimate">Get Estimate</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

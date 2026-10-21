"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { NavigationMenu } from "radix-ui";
import { usePathname } from "@/i18n/navigation";
import {
  ArrowRight,
  Box,
  ChevronDown,
  CircleHelp,
  Home,
  Images,
  Mail,
  Menu,
  Package,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { imagePaths, siteConfig } from "@/data/site";
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

const MEGA_CARD_PHOTO = `${imagePaths.gallery}/gala-ballroom-draping-01.jpg`;

type MegaGroup = "inspire" | "company";

type NavItem = {
  key:
    | "home"
    | "services"
    | "rentals"
    | "studio"
    | "gallery"
    | "reviews"
    | "about"
    | "faq"
    | "contact";
  href: string;
  icon: LucideIcon;
  /** Desktop bar: before the Explore menu, inside one of its columns, after it, or mobile only. */
  slot: "lead" | MegaGroup | "tail" | "mobile";
  special?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { key: "home", href: "/", icon: Home, slot: "mobile" },
  { key: "services", href: "/services", icon: Sparkles, slot: "lead" },
  { key: "rentals", href: "/rentals", icon: Package, slot: "lead" },
  { key: "studio", href: "/studio", icon: Box, slot: "lead", special: true },
  { key: "gallery", href: "/gallery", icon: Images, slot: "inspire" },
  { key: "reviews", href: "/reviews", icon: Star, slot: "inspire" },
  { key: "about", href: "/about", icon: Users, slot: "company" },
  { key: "faq", href: "/faq", icon: CircleHelp, slot: "company" },
  { key: "contact", href: "/contact", icon: Mail, slot: "tail" },
];

const MEGA_GROUPS: readonly MegaGroup[] = ["inspire", "company"];

const desktopLinkClassName =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring xl:px-3 motion-reduce:transition-none";

const desktopActiveClassName =
  "bg-muted/60 text-foreground shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopBarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("nav.links");
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;
  return (
    <NavigationMenu.Item>
      <NavigationMenu.Link asChild active={active}>
        <GuardedLink
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            desktopLinkClassName,
            item.special
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            active && desktopActiveClassName
          )}
        >
          {item.special ? <Icon className="size-3.5" aria-hidden /> : null}
          {t(item.key)}
        </GuardedLink>
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  );
}

function ExploreMegaPanel({ pathname }: { pathname: string }) {
  const t = useTranslations("nav");
  return (
    <div className="grid grid-cols-[15rem_1fr] gap-2 rounded-4xl border border-border/40 bg-popover/95 p-2 text-popover-foreground shadow-[0_24px_60px_-24px_oklch(0_0_0/0.6)] backdrop-blur-xl">
      <NavigationMenu.Link asChild>
        <GuardedLink
          href="/get-estimate"
          className="group/card relative flex min-h-[17rem] flex-col justify-end overflow-hidden rounded-2xl p-4 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={MEGA_CARD_PHOTO}
            alt=""
            fill
            sizes="240px"
            className="object-cover transition-transform duration-500 group-hover/card:scale-105 motion-reduce:transition-none"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
          />
          <span className="relative text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("mega.card.eyebrow")}
          </span>
          <span className="relative mt-1.5 font-heading text-lg leading-snug">
            {t("mega.card.title")}
          </span>
          <span className="relative mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            {t("mega.card.cta")}
            <ArrowRight
              className="size-3.5 transition-transform group-hover/card:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </span>
        </GuardedLink>
      </NavigationMenu.Link>

      <div className="grid grid-cols-2 gap-x-2 p-2">
        {MEGA_GROUPS.map((group) => (
          <div key={group}>
            <p className="px-3 pb-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t(`mega.${group}`)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {NAV_ITEMS.filter((item) => item.slot === group).map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <NavigationMenu.Link asChild active={active}>
                      <GuardedLink
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group/item flex items-start gap-3 rounded-2xl p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "bg-muted/60" : "hover:bg-muted/50"
                        )}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover/item:bg-primary group-hover/item:text-primary-foreground">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">
                            {t(`links.${item.key}`)}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {t(`mega.desc.${item.key}`)}
                          </span>
                        </span>
                      </GuardedLink>
                    </NavigationMenu.Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  const t = useTranslations("nav");
  const megaActive = NAV_ITEMS.some(
    (item) =>
      (item.slot === "inspire" || item.slot === "company") &&
      isActivePath(pathname, item.href)
  );

  return (
    <NavigationMenu.Root
      aria-label="Main"
      delayDuration={120}
      className="relative hidden lg:block"
    >
      <NavigationMenu.List className="flex items-center gap-1">
        {NAV_ITEMS.filter((item) => item.slot === "lead").map((item) => (
          <DesktopBarLink key={item.key} item={item} pathname={pathname} />
        ))}

        <NavigationMenu.Item>
          <NavigationMenu.Trigger
            className={cn(
              desktopLinkClassName,
              "group data-open:bg-muted/50 data-open:text-foreground",
              megaActive
                ? desktopActiveClassName
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {t("explore")}
            <ChevronDown
              className="size-3.5 transition-transform duration-200 group-data-open:rotate-180 motion-reduce:transition-none"
              aria-hidden
            />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="absolute left-1/2 top-full z-50 w-[46rem] -translate-x-1/2 pt-3 duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none">
            <ExploreMegaPanel pathname={pathname} />
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        {NAV_ITEMS.filter((item) => item.slot === "tail").map((item) => (
          <DesktopBarLink key={item.key} item={item} pathname={pathname} />
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

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
    // Owner "preview as customer" pages render the header as a signed-out guest.
    if (pathname.startsWith("/quote/preview/")) return;
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

        <DesktopNav pathname={pathname} />

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
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);

                    return (
                      <GuardedLink
                        key={item.key}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          item.special
                            ? "text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          isActive && "bg-muted/60 text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                        {t(item.key)}
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

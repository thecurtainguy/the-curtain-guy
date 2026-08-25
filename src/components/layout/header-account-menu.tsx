"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  Shield,
  Star,
  UserRound,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/ui/guarded-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { headerActionClassName } from "@/components/layout/header-actions";
import { cn } from "@/lib/utils";

export type HeaderSession = {
  authenticated: boolean;
  role: "owner" | "customer" | null;
  email: string | null;
};

type MenuLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const customerLinks: MenuLink[] = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/estimates", label: "My estimates", icon: ClipboardList },
  { href: "/account/quotes", label: "Quotes", icon: FileText },
  { href: "/account/events", label: "Events", icon: CalendarDays },
  { href: "/account/studio", label: "Studio", icon: PanelsTopLeft },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

const ownerLinks: MenuLink[] = [
  { href: "/admin", label: "Admin dashboard", icon: Shield },
  { href: "/admin/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/jobs", label: "Jobs", icon: CalendarDays },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/studio", label: "Studio", icon: PanelsTopLeft },
];

type HeaderAccountMenuProps = {
  session: HeaderSession;
  /** Desktop dropdown vs stacked mobile sheet links */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  className?: string;
};

export function HeaderAccountMenu({
  session,
  variant = "desktop",
  onNavigate,
  className,
}: HeaderAccountMenuProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (!session.authenticated) {
    if (variant === "mobile") {
      return (
        <div
          className={cn(
            "mt-3 border-t border-border/40 pt-3",
            className
          )}
        >
          <Button asChild variant="outline" className="w-full min-h-10">
            <GuardedLink href="/account/login" onClick={onNavigate}>
              Sign in
            </GuardedLink>
          </Button>
        </div>
      );
    }

    return (
      <Button
        asChild
        variant="outline"
        size="lg"
        className={cn(
          headerActionClassName,
          "bg-background dark:bg-background",
          className
        )}
      >
        <GuardedLink href="/account/login">Sign in</GuardedLink>
      </Button>
    );
  }

  const links = session.role === "owner" ? ownerLinks : customerLinks;
  const triggerLabel = session.role === "owner" ? "Admin" : "Account";
  const TriggerIcon = session.role === "owner" ? Shield : UserRound;

  if (variant === "mobile") {
    return (
      <div
        className={cn(
          "mt-3 flex flex-col gap-0.5 border-t border-border/40 pt-3",
          className
        )}
      >
        <p className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
          {session.role === "owner" ? "Owner portal" : "Your account"}
        </p>
        {session.email ? (
          <p className="truncate px-3 pb-0.5 text-xs text-muted-foreground">
            {session.email}
          </p>
        ) : null}
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <GuardedLink
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
              {link.label}
            </GuardedLink>
          );
        })}
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className={cn(
            headerActionClassName,
            "bg-background dark:bg-background",
            className
          )}
        >
          <TriggerIcon className="size-3.5 text-primary" strokeWidth={1.75} />
          {triggerLabel}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 border border-border/50 p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2">
          <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            {session.role === "owner" ? "Owner" : "Signed in"}
          </span>
          {session.email ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {session.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href} className="cursor-pointer">
                  <Icon className="size-4 text-primary" strokeWidth={1.75} />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

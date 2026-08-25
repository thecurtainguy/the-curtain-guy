"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  PenLine,
  UserRound,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSidebarAction,
  PortalSidebarBrand,
  PortalSidebarFooter,
  PortalSidebarNav,
  type PortalNavItem,
} from "@/components/portal/portal-sidebar";

const links: PortalNavItem[] = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/account/quotes", label: "Quotes", icon: FileText },
  { href: "/account/events", label: "Events", icon: CalendarDays },
  { href: "/account/studio", label: "Studio", icon: PanelsTopLeft },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

function sectionFromPath(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/account/estimates")) {
    return {
      title: "Estimates",
      subtitle: "Your estimate briefs and uploads",
    };
  }
  if (pathname.startsWith("/account/quotes")) {
    return {
      title: "Quotes",
      subtitle: "Review proposals and request changes",
    };
  }
  if (pathname.startsWith("/account/events")) {
    return {
      title: "Events",
      subtitle: "Confirmed event details and updates",
    };
  }
  if (pathname.startsWith("/account/studio")) {
    return {
      title: "Studio",
      subtitle: "Your room drawings and 3D previews",
    };
  }
  if (pathname.startsWith("/account/profile")) {
    return {
      title: "Profile",
      subtitle: "Your contact details",
    };
  }
  return {
    title: "Overview",
    subtitle: "Your Curtain Guy account",
  };
}

export function AccountShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionFromPath(pathname);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/account/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <PortalSidebarBrand
        href="/account"
        portalLabel="Account Portal"
        email={email}
      />
      <PortalSidebarNav items={links} pathname={pathname} />
      <PortalSidebarFooter>
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <PortalSidebarAction href="/get-estimate" icon={PenLine}>
          Get Estimate
        </PortalSidebarAction>
        <PortalSidebarAction href="/" icon={Globe}>
          Back to site
        </PortalSidebarAction>
        <PortalSidebarAction icon={LogOut} onClick={() => void signOut()}>
          Sign out
        </PortalSidebarAction>
      </PortalSidebarFooter>
    </>
  );

  return (
    <PortalShell
      sidebar={sidebar}
      topbarTitle={section.title}
      topbarSubtitle={section.subtitle}
      topbarActions={
        <>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/get-estimate">Get Estimate</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            className="hidden sm:inline-flex"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </>
      }
    >
      {children}
    </PortalShell>
  );
}

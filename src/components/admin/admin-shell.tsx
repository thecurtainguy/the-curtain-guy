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
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/jobs", label: "Jobs", icon: CalendarDays },
  { href: "/admin/studio", label: "Studio", icon: PanelsTopLeft },
  { href: "/", label: "Site", icon: Globe, exact: true },
];

function sectionFromPath(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/admin/estimates")) {
    return {
      title: "Estimates",
      subtitle: "Review briefs and create proposals",
    };
  }
  if (pathname.startsWith("/admin/quotes")) {
    return {
      title: "Quotes",
      subtitle: "Build, send, and track proposals",
    };
  }
  if (pathname.startsWith("/admin/jobs")) {
    return {
      title: "Jobs",
      subtitle: "Booked events, install, and teardown",
    };
  }
  if (pathname.startsWith("/admin/studio")) {
    return {
      title: "Studio",
      subtitle: "Room drawings and generated 3D previews",
    };
  }
  return {
    title: "Dashboard",
    subtitle: "Owner operations overview",
  };
}

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionFromPath(pathname);
  const isStudioEditor = /^\/admin\/studio\/[^/]+\/?$/.test(pathname);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <PortalSidebarBrand
        href="/admin"
        portalLabel="Owner Portal"
        email={email}
      />
      <PortalSidebarNav items={links} pathname={pathname} />
      <PortalSidebarFooter>
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
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
      fillViewport={isStudioEditor}
      topbarBadge={
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          Owner
        </span>
      }
      topbarActions={
        <>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/">Site</Link>
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

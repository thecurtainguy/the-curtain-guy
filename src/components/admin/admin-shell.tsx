"use client";

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
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSidebarAction,
  PortalSidebarBrand,
  PortalSidebarFooter,
  PortalSidebarNav,
  PortalSidebarThemeRow,
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

export function AdminShell({
  children,
  email: _email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isStudioEditor = /^\/admin\/studio\/[^/]+\/?$/.test(pathname);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <PortalSidebarBrand href="/admin" portalLabel="Admin Portal" />
      <PortalSidebarNav items={links} pathname={pathname} />
      <PortalSidebarFooter>
        <PortalSidebarThemeRow>
          <ThemeToggle />
        </PortalSidebarThemeRow>
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
      fillViewport={isStudioEditor}
      sidebarStorageKey="tcg-admin-sidebar-collapsed"
    >
      {children}
    </PortalShell>
  );
}

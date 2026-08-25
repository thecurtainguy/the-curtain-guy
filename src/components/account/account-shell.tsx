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
  PenLine,
  UserRound,
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
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/account/quotes", label: "Quotes", icon: FileText },
  { href: "/account/events", label: "Events", icon: CalendarDays },
  { href: "/account/studio", label: "Studio", icon: PanelsTopLeft },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

export function AccountShell({
  children,
  email: _email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isStudioEditor = /^\/account\/studio\/[^/]+\/?$/.test(pathname);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/account/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <PortalSidebarBrand href="/account" portalLabel="Customer Portal" />
      <PortalSidebarNav items={links} pathname={pathname} />
      <PortalSidebarFooter>
        <PortalSidebarThemeRow>
          <ThemeToggle />
        </PortalSidebarThemeRow>
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
      fillViewport={isStudioEditor}
      sidebarStorageKey="tcg-account-sidebar-collapsed"
    >
      {children}
    </PortalShell>
  );
}

"use client";

import { Suspense, use } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Globe,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  PanelsTopLeft,
  PenLine,
  Receipt,
  ScrollText,
  Sparkles,
  Star,
  Truck,
  Users,
} from "lucide-react";
import type { UserProfile } from "@/lib/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { toast } from "@/components/ui/sonner";
import {
  PortalEstimateEmbedProvider,
  PortalEstimateEmbedSlot,
  usePortalStartEstimate,
} from "@/components/estimates/portal-estimate-embed";
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
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/products", label: "Inventory", icon: Package },
  { href: "/admin/logistics", label: "Logistics", icon: Truck },
  { href: "/admin/jobs", label: "Jobs", icon: CalendarDays },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/event-plans", label: "Event plans", icon: Sparkles },
  { href: "/admin/studio", label: "Studio leads", icon: PanelsTopLeft },
  { href: "/admin/documents", label: "Documents", icon: ScrollText },
  { href: "/admin/billing", label: "Billing settings", icon: Landmark },
  { href: "/", label: "Site", icon: Globe, exact: true },
];

export function AdminShell({
  children,
  email: _email,
  profile,
  studioLeadsBadge,
}: {
  children: React.ReactNode;
  email?: string | null;
  profile?: Pick<UserProfile, "full_name" | "email" | "phone"> | null;
  /** New contact-captured studio leads (last 7 days); streamed so it never blocks the page. */
  studioLeadsBadge?: Promise<number | null>;
}) {
  return (
    <PortalEstimateEmbedProvider audience="admin" profile={profile}>
      <AdminShellFrame studioLeadsBadge={studioLeadsBadge}>{children}</AdminShellFrame>
    </PortalEstimateEmbedProvider>
  );
}

function withStudioBadge(count: number | null): PortalNavItem[] {
  if (!count) return links;
  return links.map((item) =>
    item.href === "/admin/studio"
      ? { ...item, badge: `${count > 99 ? "99+" : count} new` }
      : item
  );
}

function BadgedSidebarNav({
  pathname,
  studioLeadsBadge,
}: {
  pathname: string;
  studioLeadsBadge: Promise<number | null>;
}) {
  const count = use(studioLeadsBadge);
  return <PortalSidebarNav items={withStudioBadge(count)} pathname={pathname} />;
}

function AdminShellFrame({
  children,
  studioLeadsBadge,
}: {
  children: React.ReactNode;
  studioLeadsBadge?: Promise<number | null>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const startEstimate = usePortalStartEstimate();
  const isStudioEditor = /^\/admin\/studio\/[^/]+\/edit\/?$/.test(pathname);

  async function signOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Could not sign out. Please try again.");
        return;
      }
    } catch {
      toast.error("Could not sign out. Please try again.");
      return;
    }
    router.push("/admin/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <PortalSidebarBrand href="/admin" portalLabel="Admin Portal" />
      {studioLeadsBadge ? (
        <Suspense fallback={<PortalSidebarNav items={links} pathname={pathname} />}>
          <BadgedSidebarNav pathname={pathname} studioLeadsBadge={studioLeadsBadge} />
        </Suspense>
      ) : (
        <PortalSidebarNav items={links} pathname={pathname} />
      )}
      <PortalSidebarFooter>
        <PortalSidebarThemeRow>
          <ThemeToggle />
        </PortalSidebarThemeRow>
        <PortalSidebarAction icon={PenLine} onClick={startEstimate}>
          New estimate
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
      sidebarStorageKey="tcg-admin-sidebar-collapsed"
      mobileBrandHref="/admin"
    >
      <PortalEstimateEmbedSlot>{children}</PortalEstimateEmbedSlot>
    </PortalShell>
  );
}

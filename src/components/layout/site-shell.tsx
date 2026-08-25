"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

function isStudioWorkspace(pathname: string) {
  if (pathname === "/studio/new") return true;
  if (/^\/studio\/[^/]+$/.test(pathname) && pathname !== "/studio/saved") {
    return true;
  }
  return /^\/(admin|account)\/studio\/[^/]+$/.test(pathname);
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppShell =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    (pathname.startsWith("/studio/") && pathname !== "/studio");
  const studioWorkspace = isStudioWorkspace(pathname);

  if (isAppShell) {
    // PortalShell owns its own h-svh lock — don't nest competing viewport shells.
    return (
      <div
        className={cn(
          "flex-1",
          studioWorkspace && "h-svh min-h-0 overflow-hidden"
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

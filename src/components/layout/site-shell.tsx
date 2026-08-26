"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "@/components/layout/back-to-top";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { isAccountAuthPath } from "@/lib/i18n/path-locale";
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
  const authPage = isAccountAuthPath(pathname);
  const isAppShell =
    !authPage &&
    (pathname.startsWith("/admin") ||
      pathname.startsWith("/account") ||
      (pathname.startsWith("/studio/") && pathname !== "/studio"));

  const studioWorkspace = isStudioWorkspace(pathname);

  if (isAppShell) {
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
      <BackToTop />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <div
          className="shrink-0 lg:hidden"
          style={{ height: "calc(4rem + env(safe-area-inset-top, 0px))" }}
          aria-hidden
        />
        <main className={cn("flex-1", authPage && "flex min-h-0 flex-col")}>{children}</main>
        {!authPage && <Footer />}
      </div>
    </>
  );
}

"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BackToTop } from "@/components/layout/back-to-top";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { isAuthEntryPath } from "@/lib/i18n/path-locale";
import { cn } from "@/lib/utils";

function isStudioWorkspace(pathname: string) {
  if (pathname === "/studio/new") return true;
  if (/^\/studio\/[^/]+$/.test(pathname) && pathname !== "/studio/saved") {
    return true;
  }
  return /^\/(admin|account)\/studio\/[^/]+$/.test(pathname);
}

/** Guided flows (event builder, plan success) — site header, no footer. */
function isStudioBuilderFlow(pathname: string) {
  return pathname === "/studio/build" || pathname === "/studio/plan/success";
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authPage = isAuthEntryPath(pathname);
  const builderFlow = isStudioBuilderFlow(pathname);
  const isAppShell =
    !authPage &&
    !builderFlow &&
    (pathname.startsWith("/admin") ||
      pathname.startsWith("/account") ||
      (pathname.startsWith("/studio/") && pathname !== "/studio"));

  const studioWorkspace = isStudioWorkspace(pathname);

  const progress = (
    <Suspense fallback={null}>
      <NavigationProgress />
    </Suspense>
  );

  if (builderFlow) {
    return (
      <>
        {progress}
        <Header />
        <BackToTop />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <div
            className="shrink-0 lg:hidden"
            style={{ height: "calc(4rem + env(safe-area-inset-top, 0px))" }}
            aria-hidden
          />
          <main className="flex-1">{children}</main>
        </div>
      </>
    );
  }

  if (isAppShell) {
    return (
      <div
        className={cn(
          "flex-1",
          studioWorkspace && "h-svh min-h-0 overflow-hidden"
        )}
      >
        {progress}
        {children}
      </div>
    );
  }

  return (
    <>
      {progress}
      <Header />
      <BackToTop />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <div
          className="shrink-0 lg:hidden"
          style={{ height: "calc(4rem + env(safe-area-inset-top, 0px))" }}
          aria-hidden
        />
        <main className={cn("flex-1", authPage && "flex min-h-0 flex-col")}>
          {children}
        </main>
        {!authPage && <Footer />}
      </div>
    </>
  );
}

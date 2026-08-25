"use client";

import { Suspense } from "react";
import { PortalListView } from "./portal-list-view";

/** Wraps PortalListView in Suspense for Next.js useSearchParams. */
export function PortalListSuspense({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        fallback ?? (
          <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
            Loading list…
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}

export { PortalListView };

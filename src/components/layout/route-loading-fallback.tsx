import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-muted/50 dark:bg-muted/30",
        className
      )}
      aria-hidden
    />
  );
}

/** Branded route fallback used by loading.tsx across public + portals. */
export function RouteLoadingFallback({
  variant = "public",
}: {
  variant?: "public" | "portal";
}) {
  if (variant === "portal") {
    return (
      <div
        className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div className="space-y-3">
          <Shimmer className="h-3 w-24 rounded-full" />
          <Shimmer className="h-9 w-56 max-w-full" />
          <Shimmer className="h-4 w-full max-w-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Shimmer key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Shimmer className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="space-y-4">
            <Shimmer className="h-3 w-28 rounded-full" />
            <Shimmer className="h-12 w-full max-w-lg" />
            <Shimmer className="h-4 w-full max-w-md" />
            <Shimmer className="h-4 w-3/4 max-w-sm" />
            <div className="flex flex-wrap gap-3 pt-2">
              <Shimmer className="h-11 w-36 rounded-2xl" />
              <Shimmer className="h-11 w-36 rounded-2xl" />
            </div>
          </div>
          <Shimmer className="aspect-[4/5] w-full rounded-[2rem] sm:aspect-[5/4] lg:aspect-[4/5]" />
        </div>

        <div className="mt-16 space-y-6">
          <div className="space-y-3">
            <Shimmer className="h-3 w-24 rounded-full" />
            <Shimmer className="h-8 w-64 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/40 bg-card/20"
              >
                <Shimmer className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Shimmer className="h-5 w-3/4" />
                  <Shimmer className="h-3 w-full" />
                  <Shimmer className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact catalog-only skeleton for Rentals Suspense stream. */
export function RentalsCatalogSkeleton() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]"
      role="status"
      aria-live="polite"
      aria-label="Loading catalog"
    >
      <div className="hidden lg:block">
        <Shimmer className="h-[28rem] w-full rounded-3xl" />
      </div>
      <div className="space-y-10">
        <div className="space-y-4">
          <Shimmer className="h-3 w-28 rounded-full" />
          <Shimmer className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/40 bg-card/20"
              >
                <Shimmer className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Shimmer className="h-5 w-3/4" />
                  <Shimmer className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

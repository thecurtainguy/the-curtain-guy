import {
  trustProcessItems,
  trustEventTypes,
} from "@/data/site";
import { SectionShell } from "@/components/section-shell";
import { cn } from "@/lib/utils";

export function TrustStrip() {
  return (
    <SectionShell divider="both" variant="fabric" className="bg-card/25">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col items-center gap-8">
          {/* Full-service process row */}
          <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {trustProcessItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={cn(
                    "group relative flex flex-col items-center gap-2.5 rounded-xl border border-white/[0.06] bg-background/40 px-4 py-4 text-center",
                    "shadow-[0_2px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]",
                    "transition-colors hover:border-primary/20 hover:bg-background/55"
                  )}
                >
                  {index < trustProcessItems.length - 1 && (
                    <span
                      className="absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-gradient-to-r from-primary/30 to-transparent sm:block"
                      aria-hidden
                    />
                  )}
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground sm:text-xs">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Event type chips */}
          <div className="flex w-full max-w-4xl flex-col items-center gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/80">
              Event draping for
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {trustEventTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <span
                    key={type.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground sm:px-4 sm:text-xs"
                  >
                    <Icon
                      className="size-3.5 shrink-0 text-primary/80"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {type.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

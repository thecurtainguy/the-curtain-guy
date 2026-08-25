import { trustCapabilityLabels } from "@/data/services";
import { trustProcessItems } from "@/data/site";
import { SectionShell } from "@/components/section-shell";
import { Reveal } from "@/components/animation/reveal";
import { Stagger, StaggerItem } from "@/components/animation/stagger";
import { cn } from "@/lib/utils";

export function TrustStrip() {
  return (
    <SectionShell divider="both" variant="fabric" className="bg-card/25">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.76_0.15_88/6%),transparent_55%)]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col items-center gap-8">
          <Reveal variant="fade-up" className="flex w-full max-w-5xl flex-col items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40 sm:w-16" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm">
                Capability
              </p>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40 sm:w-16" aria-hidden />
            </div>

            <Stagger
              className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
              stagger={0.05}
            >
              {trustCapabilityLabels.map((type) => {
                const Icon = type.icon;
                return (
                  <StaggerItem key={type.label}>
                  <span
                    className={cn(
                      "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full",
                      "border border-border/50 bg-card/55 px-3.5 py-2 shadow-[0_2px_12px_oklch(0_0_0/6%)] backdrop-blur-sm",
                      "transition-all duration-300 ease-out motion-reduce:transition-none",
                      "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.07]",
                      "hover:shadow-[0_12px_32px_oklch(0.76_0.15_88/16%),0_0_0_1px_oklch(0.76_0.15_88/12%)]",
                      "motion-reduce:hover:translate-y-0",
                      "sm:px-4 sm:py-2.5"
                    )}
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                        "bg-primary/10 text-primary ring-1 ring-primary/20",
                        "transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/18 group-hover:ring-primary/35"
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span
                      className={cn(
                        "relative z-10 text-[11px] font-semibold uppercase tracking-[0.12em]",
                        "text-muted-foreground transition-colors duration-300 group-hover:text-foreground",
                        "sm:text-xs"
                      )}
                    >
                      {type.label}
                    </span>
                    <span
                      className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-all duration-500 group-hover:translate-x-[120%] group-hover:opacity-100 motion-reduce:hidden"
                      aria-hidden
                    />
                  </span>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </Reveal>

          <Stagger className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {trustProcessItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={item.label}>
                <div
                  className={cn(
                    "surface-tile group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl px-3 py-4 text-center sm:px-4",
                    "transition-all duration-300 ease-out motion-reduce:transition-none",
                    "hover:-translate-y-1 hover:border-primary/25 hover:bg-background/70",
                    "hover:shadow-[0_14px_36px_oklch(0_0_0/10%),0_0_24px_oklch(0.76_0.15_88/10%)]",
                    "motion-reduce:hover:translate-y-0"
                  )}
                >
                  {index < trustProcessItems.length - 1 && (
                    <span
                      className="absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-gradient-to-r from-primary/30 to-transparent transition-all duration-300 group-hover:w-5 group-hover:from-primary/50 sm:block"
                      aria-hidden
                    />
                  )}

                  <div
                    className={cn(
                      "relative flex size-11 items-center justify-center rounded-2xl",
                      "bg-primary/10 text-primary ring-1 ring-primary/15",
                      "transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/16 group-hover:ring-primary/30",
                      "group-hover:shadow-[0_0_20px_oklch(0.76_0.15_88/22%)]"
                    )}
                  >
                    <Icon
                      className="size-4 transition-transform duration-300 group-hover:-translate-y-px"
                      strokeWidth={1.75}
                    />
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors duration-300 group-hover:text-primary sm:text-xs">
                    {item.label}
                  </p>

                  <span
                    className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-300 group-hover:via-primary/35"
                    aria-hidden
                  />
                </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </SectionShell>
  );
}

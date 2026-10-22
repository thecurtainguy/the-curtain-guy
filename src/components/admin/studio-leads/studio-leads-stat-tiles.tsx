import Link from "next/link";
import { Activity } from "lucide-react";
import {
  STUDIO_LEAD_STAGES,
  STUDIO_LEAD_STAGE_LABELS,
  type StudioLeadStage,
} from "@/data/studio-leads";
import { cn } from "@/lib/utils";
import { STUDIO_LEAD_STAGE_ICONS } from "./lead-badges";
import type { StudioLeadStats } from "./studio-leads-shared";

/** Funnel stat tiles (last N days) + "Active today". Each stage tile filters the list. */
export function StudioLeadsStatTiles({
  stats,
  activeStage,
  className,
}: {
  stats: StudioLeadStats;
  activeStage?: StudioLeadStage | null;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/18 via-card to-card p-4 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(212,175,55,0.2),transparent_60%)]"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-2">
          <p className="text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
            Active today
          </p>
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Activity className="size-4" aria-hidden />
          </span>
        </div>
        <p className="relative mt-1 font-heading text-3xl font-semibold text-foreground">
          {stats.activeToday}
        </p>
        <p className="relative mt-1 text-[11px] text-muted-foreground">
          {stats.total} leads in {stats.windowDays} days
        </p>
      </div>
      {STUDIO_LEAD_STAGES.map((stage) => {
        const Icon = STUDIO_LEAD_STAGE_ICONS[stage];
        const active = activeStage === stage;
        return (
          <Link
            key={stage}
            href={active ? "/admin/studio" : `/admin/studio?stage=${stage}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "group rounded-2xl border bg-card/60 p-4 shadow-sm transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              active ? "border-primary/60 bg-primary/[0.08]" : "border-border/50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {STUDIO_LEAD_STAGE_LABELS[stage]}
              </p>
              <span className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
            <p className="mt-1 font-heading text-3xl font-semibold text-foreground">
              {stats.counts[stage]}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Last {stats.windowDays} days
            </p>
          </Link>
        );
      })}
    </div>
  );
}

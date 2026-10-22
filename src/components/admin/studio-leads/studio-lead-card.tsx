import Link from "next/link";
import {
  ArrowUpRight,
  Box,
  CalendarDays,
  Clock3,
  FileText,
  LampCeiling,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ScissorsLineDashed,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DesignPlanThumb } from "./design-plan-thumb";
import {
  EventCountdownChip,
  StudioLeadSourceBadge,
  StudioLeadStageBadge,
} from "./lead-badges";
import type { StudioLeadListItem } from "./studio-leads-shared";

function MetricChip({
  icon: Icon,
  children,
}: {
  icon: typeof Ruler;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[0.7rem] text-muted-foreground">
      <Icon className="size-3 text-primary" aria-hidden />
      {children}
    </span>
  );
}

export function StudioLeadCard({ lead }: { lead: StudioLeadListItem }) {
  const href = `/admin/studio/${lead.id}`;
  const displayName =
    lead.contactName ?? (lead.contactEmail ? lead.contactEmail : "Anonymous visitor");
  const anonymous = !lead.contactName && !lead.contactEmail;
  const eventLine = [lead.eventName, lead.eventTypeLabel].filter(Boolean).join(" · ");
  const place = [lead.venueName, lead.cityArea].filter(Boolean).join(", ");

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 shrink-0 overflow-hidden border-b border-border/40 bg-[radial-gradient(circle_at_50%_25%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_65%)] sm:h-auto sm:w-52 sm:border-r sm:border-b-0">
          {lead.thumbnailDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.thumbnailDataUrl}
              alt={`${lead.title} preview`}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : lead.plan ? (
            <div className="size-full p-4">
              <DesignPlanThumb plan={lead.plan} label={`${lead.title} floor plan`} />
            </div>
          ) : (
            <div className="flex size-full items-center justify-center text-primary/60">
              <Box className="size-8" aria-hidden />
            </div>
          )}
          <StudioLeadSourceBadge
            source={lead.source}
            className="absolute bottom-3 left-3 backdrop-blur"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
                {lead.title}
              </p>
              <h3 className="mt-0.5 flex min-w-0 items-center gap-2 font-heading text-lg leading-tight text-foreground">
                <UserRound className="size-4 shrink-0 text-primary" aria-hidden />
                <Link
                  href={href}
                  className={cn(
                    "truncate after:absolute after:inset-0 focus-visible:outline-none",
                    anonymous && "text-muted-foreground"
                  )}
                >
                  {displayName}
                </Link>
                {anonymous && lead.visitorShort ? (
                  <span className="shrink-0 rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {lead.visitorShort}
                  </span>
                ) : null}
              </h3>
              {lead.contactEmail || lead.contactPhone ? (
                <div className="relative z-10 mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {lead.contactEmail ? (
                    <a href={`mailto:${lead.contactEmail}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Mail className="size-3" aria-hidden />
                      {lead.contactEmail}
                    </a>
                  ) : null}
                  {lead.contactPhone ? (
                    <a href={`tel:${lead.contactPhone}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Phone className="size-3" aria-hidden />
                      {lead.contactPhone}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            <StudioLeadStageBadge stage={lead.stage} />
          </div>

          {eventLine || lead.eventDateLabel || lead.guestCount || place ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                {eventLine ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Sparkles className="size-3.5 text-primary" aria-hidden />
                    {eventLine}
                  </span>
                ) : null}
                {lead.eventDateLabel ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="size-3.5 text-primary" aria-hidden />
                    {lead.eventDateLabel}
                    <EventCountdownChip days={lead.daysUntilEvent} />
                  </span>
                ) : null}
                {lead.guestCount ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5 text-primary" aria-hidden />
                    {lead.guestCount.toLocaleString()} guests
                  </span>
                ) : null}
                {place ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">{place}</span>
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No event details yet.</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {lead.roomWidthFt && lead.roomDepthFt ? (
              <MetricChip icon={Ruler}>
                {lead.roomWidthFt}′ × {lead.roomDepthFt}′ · {lead.areaSqFt.toLocaleString()} ft²
              </MetricChip>
            ) : null}
            <MetricChip icon={ScissorsLineDashed}>
              {lead.drapeLinearFt.toLocaleString()} lin ft drapery
            </MetricChip>
            {lead.ceilingCount > 0 ? (
              <MetricChip icon={LampCeiling}>
                {lead.ceilingCount} ceiling {lead.ceilingCount === 1 ? "design" : "designs"}
              </MetricChip>
            ) : null}
            {lead.treatmentCount > 0 ? (
              <MetricChip icon={Sparkles}>
                {lead.treatmentCount} {lead.treatmentCount === 1 ? "treatment" : "treatments"}
              </MetricChip>
            ) : null}
            {lead.objectCount > 0 ? (
              <MetricChip icon={Box}>
                {lead.objectCount} {lead.objectCount === 1 ? "object" : "objects"}
              </MetricChip>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-primary" aria-hidden />
              Last active · {lead.lastActivityLabel}
            </span>
            <span className="flex items-center gap-2">
              {lead.quoteId ? (
                <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
                  <FileText className="size-3.5" aria-hidden />
                  Quote
                </span>
              ) : null}
              {lead.jobId ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <Trophy className="size-3.5" aria-hidden />
                  Job
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                Review
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

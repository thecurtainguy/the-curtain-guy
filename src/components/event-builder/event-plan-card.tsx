"use client";

import { useId, useState } from "react";
import {
  Armchair,
  ChevronDown,
  CloudSun,
  LayoutGrid,
  Mail,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import {
  getBriefCeilingPreset,
  getBriefFabric,
  getBriefGuestCount,
  getBriefLayout,
  getBriefLightingMood,
  getBriefUplightColor,
  getBriefVenuePreset,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import { getEventCatalogItem } from "@/data/event-builder/catalog";
import { getDrapeColorHex, type DrapeColor, type StudioDesignJson } from "@/data/studio";
import {
  calculateDrapeLength,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { getOptionLabel, useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { useLocalizedDrapeColors } from "@/lib/i18n/event-builder";
import { Button } from "@/components/ui/button";
import { EventPlanSubmitDialog } from "@/components/event-builder/event-plan-submit-dialog";
import { countDesignSeats } from "@/components/event-builder/live-plan-sidebar";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { cn } from "@/lib/utils";

/** Event-builder context the studio pins above its inspector. */
export type EventPlanContext = {
  brief: EventBuilderBrief;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

type EventPlanCardProps = EventPlanContext & { design: StudioDesignJson };

/** Compact event summary + submit, pinned to the top of the studio's right rail. */
export function EventPlanCard({
  brief,
  design,
  defaultName,
  defaultEmail,
  defaultPhone,
}: EventPlanCardProps) {
  const copy = useWizardCopy();
  const catalog = useWizardCatalog();
  const eventTypes = useLocalizedEventTypes({ includeHidden: true });
  const drapeColors = useLocalizedDrapeColors();
  const detailsId = useId();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const colorLabel = (value: DrapeColor) =>
    drapeColors.find((color) => color.value === value)?.label ?? value;
  const eventLabel = getOptionLabel(eventTypes, brief.eventType) ?? brief.eventType;
  const venuePreset = getBriefVenuePreset(brief);
  const ceilingPreset = getBriefCeilingPreset(brief);
  const layout = getBriefLayout(brief);
  const uplight = getBriefUplightColor(brief);
  const accent = brief.look.accentColor ?? null;
  const setups = brief.catalogSelections.filter((id) => {
    const item = getEventCatalogItem(id);
    return item && !item.hidden;
  });
  const place = [brief.venueName?.trim(), brief.cityArea?.trim()].filter(Boolean).join(", ");

  return (
    <section
      aria-label={copy.studio.plan}
      className="shrink-0 space-y-2.5 border-b border-border/40 bg-[radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)] px-4 py-3"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
            {copy.studio.plan}
          </p>
          <p className="truncate font-heading text-sm font-semibold">
            {brief.eventName?.trim() || eventLabel || copy.studio.briefFallback}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          aria-label={copy.studio.details}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", detailsOpen && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Stat icon={Users} label={copy.review.guests} value={String(getBriefGuestCount(brief))} />
        <Stat icon={Armchair} label={copy.review.seats} value={String(countDesignSeats(design))} />
        <Stat icon={Ruler} label={copy.review.drape} value={inchesToFeetLabel(calculateDrapeLength(design))} />
      </div>

      {detailsOpen ? (
        <div id={detailsId} className="space-y-2.5">
          {(eventLabel && brief.eventName?.trim()) || brief.eventDate || place || venuePreset ? (
            <div className="flex flex-wrap gap-1">
              {eventLabel && brief.eventName?.trim() ? <Chip>{eventLabel}</Chip> : null}
              {brief.eventDate ? <Chip>{brief.eventDate}</Chip> : null}
              {place ? <Chip>{place}</Chip> : null}
              {venuePreset ? <Chip>{venuePreset.label}</Chip> : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-border/40 bg-card/25 p-2.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {copy.studio.look}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Swatch color={brief.look.primaryColor} />
              {accent ? <Swatch color={accent} /> : null}
              <p className="min-w-0 truncate text-xs font-medium">
                {copy.fabrics[getBriefFabric(brief)][0]} · {colorLabel(brief.look.primaryColor)}
                {accent ? ` + ${colorLabel(accent)}` : ""}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Chip>
                <Sparkles className="size-3 text-primary" aria-hidden />
                {copy.lighting[getBriefLightingMood(brief)]}
              </Chip>
              {uplight ? (
                <Chip>
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: getDrapeColorHex(uplight),
                      boxShadow: `0 0 6px ${getDrapeColorHex(uplight)}`,
                    }}
                    aria-hidden
                  />
                  {copy.look.uplights}
                </Chip>
              ) : null}
              {layout.id !== "none" ? (
                <Chip>
                  <LayoutGrid className="size-3 text-primary" aria-hidden />
                  {copy.layouts[layout.id][0]}
                </Chip>
              ) : null}
              {ceilingPreset ? (
                <Chip>
                  <CloudSun className="size-3 text-primary" aria-hidden />
                  {ceilingPreset.label}
                </Chip>
              ) : null}
            </div>
          </div>

          {setups.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {copy.studio.setups}
              </p>
              <div className="flex flex-wrap gap-1">
                {setups.map((id) => (
                  <Chip key={id}>{catalog.getItemLabel(id)}</Chip>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-[10px] leading-relaxed text-muted-foreground">{copy.studio.disclaimer}</p>
        </div>
      ) : null}

      <Button type="button" size="sm" className="w-full" onClick={() => setSubmitOpen(true)}>
        <Mail className="size-4" />
        {copy.studio.submit}
      </Button>

      <EventPlanSubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        brief={brief}
        design={design}
        defaultName={defaultName}
        defaultEmail={defaultEmail}
        defaultPhone={defaultPhone}
      />
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/40 px-2 py-0.5 text-[10px] font-medium">
      {children}
    </span>
  );
}

function Swatch({ color }: { color: DrapeColor }) {
  return (
    <span
      className="size-5 shrink-0 rounded-full ring-1 ring-border/60"
      style={{ backgroundColor: getDrapeColorHex(color) }}
      aria-hidden
    />
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/35 bg-background/40 px-2 py-1.5">
      <p className="flex items-center gap-1 text-sm font-semibold tabular-nums">
        <Icon className="size-3 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{value}</span>
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Armchair,
  CloudSun,
  LayoutGrid,
  Mail,
  PanelsTopLeft,
  Ruler,
  Settings2,
  Sparkles,
  Square,
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
  calculateRoomAreaSquareFeet,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { getOptionLabel, useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { useLocalizedDrapeColors } from "@/lib/i18n/event-builder";
import type { StudioSaveState, StudioSelection } from "@/components/studio/studio-types";
import { StudioRightRail } from "@/components/studio/studio-right-rail";
import { Button } from "@/components/ui/button";
import { EventPlanSubmitDialog } from "@/components/event-builder/event-plan-submit-dialog";
import { countDesignSeats } from "@/components/event-builder/live-plan-sidebar";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { cn } from "@/lib/utils";

type EventBriefPanelProps = {
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  saveState: StudioSaveState;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  idPrefix?: string;
};

export function EventBriefPanel({
  brief,
  design,
  onChange,
  selection,
  onSelect,
  saveState,
  defaultName,
  defaultEmail,
  defaultPhone,
  idPrefix = "event-brief",
}: EventBriefPanelProps) {
  const copy = useWizardCopy();
  const catalog = useWizardCatalog();
  const eventTypes = useLocalizedEventTypes();
  const drapeColors = useLocalizedDrapeColors();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const colorLabel = (value: DrapeColor) =>
    drapeColors.find((color) => color.value === value)?.label ?? value;
  const eventLabel = getOptionLabel(eventTypes, brief.eventType) ?? brief.eventType;
  const guests = getBriefGuestCount(brief);
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

  const hasSelection =
    selection?.kind === "drape" ||
    selection?.kind === "treatment" ||
    selection?.kind === "object" ||
    selection?.kind === "opening" ||
    selection?.kind === "ceiling";

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
        <div className="rounded-2xl border border-primary/25 bg-[radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)] p-3">
          <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
            {copy.studio.plan}
          </p>
          <p className="mt-1 font-heading text-sm font-semibold">
            {brief.eventName?.trim() || eventLabel || copy.studio.briefFallback}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {eventLabel && brief.eventName?.trim() ? <Chip>{eventLabel}</Chip> : null}
            {brief.eventDate ? <Chip>{brief.eventDate}</Chip> : null}
            {place ? <Chip>{place}</Chip> : null}
            {venuePreset ? <Chip>{venuePreset.label}</Chip> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat icon={Users} label={copy.review.guests} value={String(guests)} />
          <Stat icon={Armchair} label={copy.review.seats} value={String(countDesignSeats(design))} />
          <Stat
            icon={Square}
            label={copy.review.area}
            value={`${Math.round(calculateRoomAreaSquareFeet(design.room.floor)).toLocaleString()} ft²`}
          />
          <Stat icon={Ruler} label={copy.review.drape} value={inchesToFeetLabel(calculateDrapeLength(design))} />
          <Stat icon={PanelsTopLeft} label={copy.review.treatments} value={String(design.treatments.length)} />
          <Stat icon={CloudSun} label={copy.review.ceiling} value={String(design.ceilingDrapes?.length ?? 0)} />
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/25 p-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {copy.studio.look}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Swatch color={brief.look.primaryColor} />
            {accent ? <Swatch color={accent} /> : null}
            <p className="min-w-0 truncate text-sm font-medium">
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
            <div className="flex flex-wrap gap-1.5">
              {setups.map((id) => (
                <span
                  key={id}
                  className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-medium"
                >
                  {catalog.getItemLabel(id)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-[10px] leading-relaxed text-muted-foreground">{copy.studio.disclaimer}</p>

        <Button type="button" className="w-full" onClick={() => setSubmitOpen(true)}>
          <Mail className="size-4" />
          {copy.studio.submit}
        </Button>

        <button
          type="button"
          onClick={() => setShowInspector((v) => !v)}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            showInspector && "border-primary/40 text-foreground"
          )}
        >
          <Settings2 className="size-3.5" />
          {showInspector ? copy.studio.hideTools : copy.studio.showTools}
        </button>

        {showInspector || hasSelection ? (
          <div className="min-h-[24rem] flex-1 overflow-hidden rounded-2xl border border-border/40">
            <StudioRightRail
              design={design}
              onChange={onChange}
              selection={selection}
              onSelect={onSelect}
              saveState={saveState}
              idPrefix={idPrefix}
            />
          </div>
        ) : null}
      </div>

      <EventPlanSubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        brief={brief}
        design={design}
        defaultName={defaultName}
        defaultEmail={defaultEmail}
        defaultPhone={defaultPhone}
      />
    </>
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
    <div className="rounded-xl border border-border/35 bg-background/40 px-3 py-2">
      <p className="flex items-center gap-1 text-[9px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="size-3 text-primary" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

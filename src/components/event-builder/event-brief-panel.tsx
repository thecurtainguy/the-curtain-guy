"use client";

import { useState } from "react";
import { Mail, Settings2 } from "lucide-react";
import { getEnglishOptionLabel } from "@/data/estimate";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { getEventCatalogLabel } from "@/data/event-builder/catalog";
import { DRAPE_COLORS, type StudioDesignJson } from "@/data/studio";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import type { StudioSelection } from "@/components/studio/studio-types";
import { StudioRightRail } from "@/components/studio/studio-right-rail";
import type { StudioSaveState } from "@/components/studio/studio-types";
import { Button } from "@/components/ui/button";
import { EventPlanSubmitDialog } from "@/components/event-builder/event-plan-submit-dialog";
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
  const [submitOpen, setSubmitOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const areaSqFt = Math.round(
    calculateRoomAreaSquareFeet(design.room.floor)
  );
  const linearDrape = inchesToFeetLabel(calculateDrapeLength(design));
  const eventLabel =
    getEnglishOptionLabel("eventTypes", brief.eventType) ?? brief.eventType;
  const colorLabel =
    DRAPE_COLORS.find((c) => c.value === brief.look.primaryColor)?.label ??
    brief.look.primaryColor;

  const hasSelection =
    selection?.kind === "drape" ||
    selection?.kind === "treatment" ||
    selection?.kind === "object" ||
    selection?.kind === "opening";

  return (
    <>
      <div className="flex h-full flex-col gap-4 p-3">
        <div>
          <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
            Your event plan
          </p>
          <p className="mt-1 font-heading text-sm font-semibold">
            {eventLabel || "Event brief"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Floor area" value={`${areaSqFt.toLocaleString()} ft²`} />
          <Stat label="Linear drape" value={linearDrape} />
          <Stat label="Treatments" value={String(design.treatments.length)} />
          <Stat label="Drape runs" value={String(design.drapeRuns.length)} />
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Look
          </p>
          <p className="mt-1 text-sm font-medium">{colorLabel}</p>
          <p className="text-xs text-muted-foreground">
            Fullness {brief.look.fullness}
          </p>
        </div>

        {brief.catalogSelections.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {brief.catalogSelections.map((id) => (
              <span
                key={id}
                className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-medium"
              >
                {getEventCatalogLabel(id)}
              </span>
            ))}
          </div>
        ) : null}

        {brief.addOns.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {brief.addOns.map((id) => (
              <span
                key={id}
                className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {id.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        ) : null}

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Planning brief only — not final pricing. We confirm after venue review.
        </p>

        <Button
          type="button"
          className="w-full"
          onClick={() => setSubmitOpen(true)}
        >
          <Mail className="size-4" />
          Submit event plan
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
          {showInspector ? "Hide design tools" : "Show all design tools"}
        </button>

        {showInspector || hasSelection ? (
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/40">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/35 bg-background/40 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  STUDIO_NOTES_MAX_LENGTH,
  getCeilingDrapes,
  type StudioDesignJson,
} from "@/data/studio";
import { estimateCeilingFabric } from "@/lib/studio-ceiling";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import {
  Box,
  LampCeiling,
  MoveVertical,
  NotebookPen,
  Ruler,
  ScissorsLineDashed,
  Sparkles,
  SquareDashed,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { RoomFinishPanel } from "../room-finish-panel";
import { StudioEmptyState } from "../studio-empty-state";
import { InspectorSection, StatTile } from "./inspector-ui";

export function DesignBrief({
  design,
  onChange,
  idPrefix,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
}) {
  const guests = design.objects.reduce(
    (sum, object) => sum + (object.seatingCount ?? 0),
    0
  );
  const ceilings = getCeilingDrapes(design);
  const floor = design.room.floor;
  const ceilingYards = useMemo(
    () =>
      ceilings.reduce(
        (sum, drape) => sum + estimateCeilingFabric(drape, floor).linearYards,
        0
      ),
    [ceilings, floor]
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={SquareDashed}
          label="Floor area"
          value={`${Math.round(calculateRoomAreaSquareFeet(design.room.floor)).toLocaleString()} ft²`}
        />
        <StatTile
          icon={MoveVertical}
          label="Wall height"
          value={inchesToFeetLabel(design.room.wallHeight)}
        />
        <StatTile
          icon={ScissorsLineDashed}
          label="Drape total"
          value={inchesToFeetLabel(calculateDrapeLength(design))}
        />
        <StatTile
          icon={Sparkles}
          label="Treatments"
          value={design.treatments.length}
        />
        <StatTile
          icon={Users}
          label="Guest seats"
          value={guests.toLocaleString()}
        />
        <StatTile icon={Box} label="Objects" value={design.objects.length} />
        {ceilings.length > 0 ? (
          <>
            <StatTile icon={LampCeiling} label="Ceiling designs" value={ceilings.length} />
            <StatTile
              icon={Ruler}
              label="Ceiling fabric"
              value={`${(Math.round(ceilingYards * 10) / 10).toLocaleString()} yd`}
            />
          </>
        ) : null}
      </div>

      <StudioEmptyState />

      <InspectorSection icon={NotebookPen} eyebrow="Crew brief" title="Design notes">
        <Textarea
          id={`${idPrefix}-design-notes`}
          rows={4}
          maxLength={STUDIO_NOTES_MAX_LENGTH}
          value={design.notes}
          aria-label="Design notes"
          placeholder="Add access, setup, or venue notes…"
          onChange={(event) => onChange({ ...design, notes: event.target.value })}
          className="rounded-xl bg-background/50 text-sm"
        />
      </InspectorSection>

      <RoomFinishPanel
        design={design}
        onChange={onChange}
        idPrefix={`${idPrefix}-finish`}
      />
    </div>
  );
}

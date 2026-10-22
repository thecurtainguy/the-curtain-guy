"use client";

import { useState } from "react";
import { DoorOpen, PencilLine, Plus, Ruler, Square, X } from "lucide-react";
import {
  EVENT_WALL_ROLES,
  getBriefOpenings,
  type EventBuilderBrief,
  type EventBuilderOpening,
  type EventWallRole,
} from "@/data/event-builder/brief";
import { EVENT_OPENING_QUICK_ADD } from "@/data/event-builder/wizard-options";
import { getOpeningPreset } from "@/data/studio-openings";
import { createStudioItemId } from "@/data/studio";
import { roomPreviewStats } from "@/data/event-builder/catalog";
import {
  ROOM_MAX_FT,
  ROOM_MIN_FT,
  WALL_HEIGHT_MAX_FT,
  WALL_HEIGHT_MIN_FT,
} from "@/lib/event-builder/brief-room";
import { OpeningStyleGlyph } from "@/components/studio/openings/opening-style-glyph";
import { ChoiceCard } from "@/components/event-builder/choice-card";
import { EventRoomShapeCanvas } from "@/components/event-builder/event-room-shape-canvas";
import { RoomShapeCard } from "@/components/event-builder/room-shape-card";
import { SelectionCheck } from "@/components/event-builder/selection-check";
import { WizardSection, WizardStepHeader } from "@/components/event-builder/wizard-ui";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_OPENINGS = 12;

type EventStepRoomProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
  headingId: string;
};

/** Mini plan with the chosen wall highlighted — front is the top edge. */
function WallRoleDiagram({ role }: { role: EventWallRole }) {
  const edges: Record<EventWallRole, [number, number, number, number]> = {
    front: [6, 6, 54, 6],
    back: [6, 38, 54, 38],
    left: [6, 6, 6, 38],
    right: [54, 6, 54, 38],
  };
  const [x1, y1, x2, y2] = edges[role];
  return (
    <svg viewBox="0 0 60 44" className="h-10 w-14" aria-hidden>
      <rect x="6" y="6" width="48" height="32" rx="2" className="fill-primary/10 stroke-border" strokeWidth="1.5" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onValue,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onValue: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={Number.isFinite(value) && value > 0 ? value : ""}
        onChange={(e) => onValue(Number(e.target.value) || 0)}
      />
    </div>
  );
}

export function EventStepRoom({ brief, onChange, headingId }: EventStepRoomProps) {
  const copy = useWizardCopy();
  const [drawMode, setDrawMode] = useState(false);
  const [targetWall, setTargetWall] = useState<EventWallRole>("back");
  const openings = getBriefOpenings(brief);
  const stats = roomPreviewStats(brief);
  const isCustom = brief.room.shape === "custom";
  const canDraw = !isCustom;
  const showDraw = drawMode && canDraw;

  function updateRoom(patch: Partial<EventBuilderBrief["room"]>): void {
    onChange({ ...brief, room: { ...brief.room, ...patch } });
  }

  function setOpenings(next: EventBuilderOpening[]): void {
    onChange({ ...brief, openings: next });
  }

  function addOpening(style: EventBuilderOpening["style"]): void {
    if (openings.length >= MAX_OPENINGS) return;
    setOpenings([...openings, { id: createStudioItemId("opening"), style, wall: targetWall }]);
  }

  const wallLabel = (role: EventWallRole) => copy.walls[role];

  return (
    <div className="space-y-6">
      <WizardStepHeader
        id={headingId}
        icon={Square}
        eyebrow={copy.room.eyebrow}
        title={copy.room.title}
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium tabular-nums">
            {brief.room.widthFt}′ × {brief.room.lengthFt}′ · {brief.room.wallHeightFt}′
          </span>
          <span className="rounded-full border border-border/40 bg-background/40 px-3 py-1 text-xs tabular-nums text-muted-foreground">
            {stats.areaSqFt.toLocaleString()} ft²
          </span>
        </div>
      </WizardStepHeader>

      <WizardSection icon={Square} label={copy.room.shape} labelId="room-shape-label">
        <div
          role="radiogroup"
          aria-labelledby="room-shape-label"
          className={cn("grid gap-3", brief.room.outline ? "grid-cols-3" : "grid-cols-2")}
        >
          <RoomShapeCard
            shape="rectangle"
            label={copy.room.rectangle}
            selected={brief.room.shape === "rectangle"}
            onSelect={() => updateRoom({ shape: "rectangle" })}
          />
          <RoomShapeCard
            shape="l_shape"
            label={copy.room.lShape}
            selected={brief.room.shape === "l_shape"}
            onSelect={() => updateRoom({ shape: "l_shape" })}
          />
          {brief.room.outline ? (
            <RoomShapeCard
              shape="custom"
              outline={brief.room.outline}
              label={copy.room.custom}
              selected={isCustom}
              onSelect={() => updateRoom({ shape: "custom" })}
            />
          ) : null}
        </div>

        {canDraw ? (
          <div role="radiogroup" aria-label={copy.room.fields} className="mt-4 grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              label={copy.room.fields}
              description={copy.room.fieldsHint}
              icon={Ruler}
              selected={!showDraw}
              onSelect={() => setDrawMode(false)}
            />
            <ChoiceCard
              label={copy.room.draw}
              description={copy.room.drawHint}
              icon={PencilLine}
              selected={showDraw}
              onSelect={() => setDrawMode(true)}
            />
          </div>
        ) : null}

        {showDraw ? (
          <div className="mt-4">
            <EventRoomShapeCanvas
              room={brief.room}
              interactive
              ariaLabel={copy.room.draw}
              onRoomChange={updateRoom}
              className="min-h-[min(380px,48vh)]"
            />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {!showDraw ? (
            <>
              <NumberField
                id="room-width"
                label={copy.room.width}
                value={brief.room.widthFt}
                min={ROOM_MIN_FT}
                max={ROOM_MAX_FT}
                onValue={(widthFt) => updateRoom({ widthFt })}
              />
              <NumberField
                id="room-length"
                label={copy.room.length}
                value={brief.room.lengthFt}
                min={ROOM_MIN_FT}
                max={ROOM_MAX_FT}
                onValue={(lengthFt) => updateRoom({ lengthFt })}
              />
            </>
          ) : null}
          <NumberField
            id="room-height"
            label={copy.room.height}
            value={brief.room.wallHeightFt}
            min={WALL_HEIGHT_MIN_FT}
            max={WALL_HEIGHT_MAX_FT}
            onValue={(wallHeightFt) => updateRoom({ wallHeightFt })}
          />
          {brief.room.shape === "l_shape" && !showDraw ? (
            <>
              <NumberField
                id="cutout-width"
                label={copy.room.cutoutWidth}
                value={brief.room.cutoutWidthFt ?? 20}
                min={1}
                max={ROOM_MAX_FT}
                onValue={(cutoutWidthFt) => updateRoom({ cutoutWidthFt })}
              />
              <NumberField
                id="cutout-depth"
                label={copy.room.cutoutDepth}
                value={brief.room.cutoutDepthFt ?? 20}
                min={1}
                max={ROOM_MAX_FT}
                onValue={(cutoutDepthFt) => updateRoom({ cutoutDepthFt })}
              />
            </>
          ) : null}
        </div>
      </WizardSection>

      <WizardSection
        icon={DoorOpen}
        label={copy.room.openings}
        hint={brief.openings === undefined ? copy.room.defaultEntrance : copy.room.openingsHint}
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground" id="opening-wall-label">
          {copy.room.addTo}
        </p>
        <div role="radiogroup" aria-labelledby="opening-wall-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EVENT_WALL_ROLES.map((role) => {
            const selected = targetWall === role;
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTargetWall(role)}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 motion-reduce:transition-none",
                  "border-border/40 bg-card/35 hover:border-primary/30 hover:bg-card/55",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected && "border-primary/50 bg-primary/10"
                )}
              >
                <WallRoleDiagram role={role} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{wallLabel(role)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {copy.walls[`${role}Hint`]}
                  </span>
                </span>
                <SelectionCheck selected={selected} size="sm" className="absolute right-2 top-2 size-4" />
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-5 text-xs font-medium text-muted-foreground">{copy.room.quickAdd}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EVENT_OPENING_QUICK_ADD.map((style) => {
            const preset = getOpeningPreset(style);
            return (
              <button
                key={style}
                type="button"
                onClick={() => addOpening(style)}
                disabled={openings.length >= MAX_OPENINGS}
                aria-label={`${preset.label} → ${wallLabel(targetWall)}`}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-card/35 p-3 text-center transition-all duration-200 motion-reduce:transition-none",
                  "hover:-translate-y-px hover:border-primary/35 hover:bg-primary/8 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                )}
              >
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full border border-primary/40 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Plus className="size-3" aria-hidden />
                </span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-background/50 text-primary">
                  <OpeningStyleGlyph style={style} />
                </span>
                <span className="text-xs font-medium">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground">{preset.description}</span>
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-5 text-xs font-medium text-muted-foreground">{copy.room.inRoom}</p>
        {openings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
            {copy.room.noOpenings}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {openings.map((opening) => {
              const preset = getOpeningPreset(opening.style);
              return (
                <li
                  key={opening.id}
                  className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-2.5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/50 text-primary">
                    <OpeningStyleGlyph style={opening.style} className="size-8" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{preset.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {wallLabel(opening.wall)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenings(openings.filter((entry) => entry.id !== opening.id))}
                    aria-label={copy.room.remove(`${preset.label} (${wallLabel(opening.wall)})`)}
                    className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </WizardSection>
    </div>
  );
}

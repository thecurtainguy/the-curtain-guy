"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cloneStudioTemplate,
  type StudioDesignJson,
  type StudioRoomShape,
} from "@/data/studio";
import {
  updateTemplateRoomDimensions,
} from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import { Box, CornerDownRight, RectangleHorizontal } from "lucide-react";
import { feetInput, feetValue } from "./studio-types";

type RoomSetupPanelProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
};

const shapes: Array<{
  value: StudioRoomShape;
  label: string;
  icon: typeof Box;
}> = [
  { value: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { value: "l_shape", label: "L-shape", icon: CornerDownRight },
  { value: "custom", label: "Custom", icon: Box },
];

function DimensionField({
  id,
  label,
  value,
  min = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  onChange: (inches: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          step="0.5"
          value={feetValue(value)}
          onChange={(event) => onChange(feetInput(event.target.value, value))}
          className="input-no-spin pr-9"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          ft
        </span>
      </div>
    </div>
  );
}

export function RoomSetupPanel({
  design,
  onChange,
  idPrefix,
}: RoomSetupPanelProps) {
  const dimensions = design.room.templateDimensions;
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  function setShape(shape: StudioRoomShape) {
    if (shape === design.room.shape) return;
    const hasWallItems =
      design.drapeRuns.length > 0 ||
      design.treatments.length > 0 ||
      design.openings.length > 0;
    if (
      hasWallItems &&
      !window.confirm(
        "Changing the room shape will remove all drape runs, treatments, and opening markers. Continue?"
      )
    ) {
      return;
    }
    if (shape === "custom") {
      onChange({
        ...design,
        room: {
          ...design.room,
          shape,
          name: "Custom room",
          templateDimensions: undefined,
        },
        drapeRuns: [],
        treatments: [],
        openings: [],
      });
      return;
    }

    const template = cloneStudioTemplate(shape);
    onChange({
      ...design,
      room: {
        ...template.room,
        wallHeight: design.room.wallHeight,
      },
      drapeRuns: [],
      treatments: [],
      openings: [],
    });
  }

  function setDimensions(patch: {
    width?: number;
    length?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
    wallHeight?: number;
  }) {
    const current = design.room.templateDimensions;
    const minimumSide = design.room.shape === "l_shape" ? 24 : 12;
    const width = Math.max(
      minimumSide,
      patch.width ?? current?.width ?? 720
    );
    const length = Math.max(
      minimumSide,
      patch.length ?? current?.length ?? 480
    );
    const cutoutWidth = Math.min(
      width - 12,
      Math.max(12, patch.cutoutWidth ?? current?.cutoutWidth ?? width / 3)
    );
    const cutoutDepth = Math.min(
      length - 12,
      Math.max(12, patch.cutoutDepth ?? current?.cutoutDepth ?? length / 2)
    );
    onChange(
      updateTemplateRoomDimensions(design, {
        width,
        length,
        cutoutWidth,
        cutoutDepth,
        wallHeight: patch.wallHeight ?? design.room.wallHeight,
      })
    );
  }

  return (
    <section
      className="space-y-4"
      aria-labelledby={fieldId("room-setup-heading")}
    >
      <div>
        <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
          Foundation
        </p>
        <h2 id={fieldId("room-setup-heading")} className="font-heading text-lg">
          Room setup
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Room shape">
        {shapes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={design.room.shape === value}
            onClick={() => setShape(value)}
            className={cn(
              "relative flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 text-[0.68rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              design.room.shape === value
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/50 bg-background/35 text-muted-foreground hover:bg-muted/60"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="truncate">{label}</span>
            {value === "custom" && (
              <Badge className="absolute -top-2 -right-1 px-1.5 py-0 text-[0.55rem]">
                Beta
              </Badge>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor={fieldId("room-name")}
          className="text-xs text-muted-foreground"
        >
          Room name
        </Label>
        <Input
          id={fieldId("room-name")}
          value={design.room.name}
          maxLength={160}
          onChange={(event) =>
            onChange({
              ...design,
              room: { ...design.room, name: event.target.value },
            })
          }
        />
      </div>

      {design.room.shape === "custom" ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium">Basic polygon retained</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Custom mode preserves the current {design.room.floor.length}-point
            outline. Direct point and edge editing is unavailable in Beta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <DimensionField
            id={fieldId("room-width")}
            label="Width"
            value={dimensions?.width ?? 720}
            onChange={(width) => setDimensions({ width })}
          />
          <DimensionField
            id={fieldId("room-length")}
            label="Length"
            value={dimensions?.length ?? 480}
            onChange={(length) => setDimensions({ length })}
          />
          {design.room.shape === "l_shape" && (
            <>
              <DimensionField
                id={fieldId("cutout-width")}
                label="Cutout width"
                value={dimensions?.cutoutWidth ?? 240}
                onChange={(cutoutWidth) => setDimensions({ cutoutWidth })}
              />
              <DimensionField
                id={fieldId("cutout-depth")}
                label="Cutout depth"
                value={dimensions?.cutoutDepth ?? 240}
                onChange={(cutoutDepth) => setDimensions({ cutoutDepth })}
              />
            </>
          )}
          {design.room.shape === "l_shape" ? (
            <p className="col-span-2 rounded-2xl border border-primary/15 bg-primary/5 p-2.5 text-[0.68rem] leading-relaxed text-muted-foreground">
              Guarded Beta: use these dimensions for reliable L-shape changes.
              Direct edge editing is unavailable.
            </p>
          ) : null}
        </div>
      )}

      <DimensionField
        id={fieldId("wall-height")}
        label="Wall height"
        value={design.room.wallHeight}
        min={6}
        onChange={(wallHeight) => {
          const clamped = Math.min(600, Math.max(72, wallHeight));
          onChange({
            ...design,
            room: { ...design.room, wallHeight: clamped },
          });
        }}
      />
    </section>
  );
}

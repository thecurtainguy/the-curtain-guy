"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  STUDIO_FLOOR_FINISHES,
  STUDIO_LIGHTING_MOODS,
  STUDIO_WALL_FINISHES,
  getStudioMaterials,
  type StudioDesignJson,
  type StudioFloorFinish,
  type StudioLightingMood,
  type StudioWallFinish,
} from "@/data/studio";
import { Eye, EyeOff, Layers3, Lightbulb, Paintbrush } from "lucide-react";

type RoomFinishPanelProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
};

const selectClassName =
  "h-9 w-full rounded-2xl border border-border/60 bg-background/65 px-3 text-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/15";

export function RoomFinishPanel({
  design,
  onChange,
  idPrefix,
}: RoomFinishPanelProps) {
  const materials = getStudioMaterials(design);
  const transparentWalls = Boolean(design.view.transparentWalls);

  function updateMaterials(patch: Partial<typeof materials>) {
    onChange({
      ...design,
      materials: { ...materials, ...patch },
    });
  }

  return (
    <section
      className="overflow-hidden rounded-3xl border border-primary/15 bg-background/45"
      aria-labelledby={`${idPrefix}-heading`}
    >
      <div className="relative border-b border-border/50 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_62%)] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Paintbrush className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.62rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Atmosphere
            </p>
            <h3 id={`${idPrefix}-heading`} className="font-heading text-base">
              Room finish
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <FinishField
          icon={Layers3}
          label="Floor material"
          htmlFor={`${idPrefix}-floor`}
        >
          <select
            id={`${idPrefix}-floor`}
            value={materials.floor}
            onChange={(event) =>
              updateMaterials({
                floor: event.target.value as StudioFloorFinish,
              })
            }
            className={selectClassName}
          >
            {STUDIO_FLOOR_FINISHES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FinishField>

        <FinishField
          icon={Paintbrush}
          label="Wall finish"
          htmlFor={`${idPrefix}-walls`}
        >
          <select
            id={`${idPrefix}-walls`}
            value={materials.walls}
            onChange={(event) =>
              updateMaterials({
                walls: event.target.value as StudioWallFinish,
              })
            }
            className={selectClassName}
          >
            {STUDIO_WALL_FINISHES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FinishField>

        <FinishField
          icon={Lightbulb}
          label="Lighting mood"
          htmlFor={`${idPrefix}-lighting`}
        >
          <select
            id={`${idPrefix}-lighting`}
            value={materials.lighting}
            onChange={(event) =>
              updateMaterials({
                lighting: event.target.value as StudioLightingMood,
              })
            }
            className={selectClassName}
          >
            {STUDIO_LIGHTING_MOODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FinishField>

        <Button
          type="button"
          variant={transparentWalls ? "secondary" : "outline"}
          aria-pressed={transparentWalls}
          onClick={() =>
            onChange({
              ...design,
              view: {
                ...design.view,
                transparentWalls: !transparentWalls,
              },
            })
          }
          className="h-auto w-full justify-between rounded-2xl px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-xs">
            {transparentWalls ? (
              <Eye className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <EyeOff className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            Glass-wall view
          </span>
          <span className="text-[0.62rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {transparentWalls ? "On" : "Off"}
          </span>
        </Button>
      </div>
    </section>
  );
}

function FinishField({
  icon: Icon,
  label,
  htmlFor,
  children,
}: {
  icon: typeof Layers3;
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {label}
      </Label>
      {children}
    </div>
  );
}

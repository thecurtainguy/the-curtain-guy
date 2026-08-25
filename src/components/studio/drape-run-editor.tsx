"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DRAPE_COLORS,
  DRAPE_FABRICS,
  DRAPE_RUN_TYPES,
  type StudioDesignJson,
  type StudioDrapeRun,
} from "@/data/studio";
import {
  clampDrapeRunToWall,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { feetInput, feetValue, parseNumber } from "./studio-types";

type DrapeRunEditorProps = {
  design: StudioDesignJson;
  run: StudioDrapeRun;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
};

const runLabels: Record<StudioDrapeRun["type"], string> = {
  wall_drape: "Full wall drape",
  partial_drape: "Partial wall drape",
  backdrop: "Backdrop",
  divider: "Divider",
};

export function DrapeRunEditor({
  design,
  run,
  onChange,
  idPrefix,
}: DrapeRunEditorProps) {
  const walls = getWallSegments(design.room.floor);
  const fieldId = (name: string) => `${idPrefix}-${name}-${run.id}`;

  function update(patch: Partial<StudioDrapeRun>) {
    const nextRun = clampDrapeRunToWall(
      { ...run, ...patch },
      design.room.floor
    );
    onChange({
      ...design,
      drapeRuns: design.drapeRuns.map((item) =>
        item.id === run.id ? nextRun : item
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={fieldId("label")}>Label</Label>
        <Input
          id={fieldId("label")}
          value={run.label}
          onChange={(event) => update({ label: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("type")}>Drape type</Label>
        <select
          id={fieldId("type")}
          value={run.type}
          onChange={(event) =>
            update({ type: event.target.value as StudioDrapeRun["type"] })
          }
          className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {DRAPE_RUN_TYPES.map((type) => (
            <option key={type} value={type}>
              {runLabels[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("wall")}>Wall</Label>
        <select
          id={fieldId("wall")}
          value={run.wallIndex}
          onChange={(event) => {
            const wallIndex = Number(event.target.value);
            const wall = walls[wallIndex];
            update({
              wallIndex,
              startOffset: 0,
              endOffset: Math.max(1, wall?.length ?? 1),
            });
          }}
          className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {walls.map((wall) => (
            <option key={wall.index} value={wall.index}>
              Wall {wall.index + 1} · {inchesToFeetLabel(wall.length)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("start")} className="text-xs">
            Start (ft)
          </Label>
          <Input
            id={fieldId("start")}
            type="number"
            min={0}
            step="0.5"
            value={feetValue(run.startOffset)}
            onChange={(event) =>
              update({
                startOffset: feetInput(event.target.value, run.startOffset),
              })
            }
            className="input-no-spin"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("end")} className="text-xs">
            End (ft)
          </Label>
          <Input
            id={fieldId("end")}
            type="number"
            min={0}
            step="0.5"
            value={feetValue(run.endOffset)}
            onChange={(event) =>
              update({ endOffset: feetInput(event.target.value, run.endOffset) })
            }
            className="input-no-spin"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("height")} className="text-xs">
            Height (ft)
          </Label>
          <Input
            id={fieldId("height")}
            type="number"
            min={1}
            step="0.5"
            value={feetValue(run.height)}
            onChange={(event) =>
              update({ height: feetInput(event.target.value, run.height) })
            }
            className="input-no-spin"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("fullness")} className="text-xs">
            Fullness
          </Label>
          <Input
            id={fieldId("fullness")}
            type="number"
            min={1}
            max={4}
            step="0.25"
            value={run.fullness}
            onChange={(event) =>
              update({
                fullness: Math.min(
                  4,
                  Math.max(1, parseNumber(event.target.value, run.fullness))
                ),
              })
            }
            className="input-no-spin"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("fabric")} className="text-xs">
            Fabric
          </Label>
          <select
            id={fieldId("fabric")}
            value={run.fabric}
            onChange={(event) =>
              update({ fabric: event.target.value as StudioDrapeRun["fabric"] })
            }
            className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DRAPE_FABRICS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("color")} className="text-xs">
            Color
          </Label>
          <select
            id={fieldId("color")}
            value={run.color}
            onChange={(event) =>
              update({ color: event.target.value as StudioDrapeRun["color"] })
            }
            className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DRAPE_COLORS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("notes")}>Notes</Label>
        <Textarea
          id={fieldId("notes")}
          rows={3}
          value={run.notes ?? ""}
          placeholder="Hardware, pleating, access notes…"
          onChange={(event) => update({ notes: event.target.value })}
        />
      </div>
    </div>
  );
}

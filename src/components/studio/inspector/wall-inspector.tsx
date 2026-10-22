"use client";

import { getDrapeColorHex, type StudioDesignJson } from "@/data/studio";
import type { StudioItemKind } from "@/lib/studio-commands";
import {
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Compass,
  EyeOff,
  Layers,
  Lock,
  MousePointerClick,
  PanelsTopLeft,
  Ruler,
} from "lucide-react";
import {
  useStudioEditorActions,
  useStudioSelection,
} from "../editor/studio-editor-context";
import { useMemo } from "react";
import { StudioTip } from "../studio-tip";
import { InspectorSection, StatTile } from "./inspector-ui";
import { STUDIO_KIND_ICONS, STUDIO_KIND_LABELS } from "./studio-item-meta";

type WallItem = {
  kind: Exclude<StudioItemKind, "object">;
  id: string;
  label: string;
  start: number;
  end: number;
  fill: string;
  locked?: boolean;
  hidden?: boolean;
};

export function WallInspector({
  design,
  wallIndex,
}: {
  design: StudioDesignJson;
  wallIndex: number;
}) {
  const { select, setHoveredId } = useStudioEditorActions();
  const { isSelected } = useStudioSelection();
  const floor = design.room.floor;
  const wall = useMemo(() => getWallSegments(floor), [floor])[wallIndex];
  if (!wall) return null;

  const items: WallItem[] = [
    ...design.drapeRuns
      .filter((run) => run.wallIndex === wallIndex)
      .map((run) => ({
        kind: "drape" as const,
        id: run.id,
        label: run.label,
        start: run.startOffset,
        end: run.endOffset,
        fill: getDrapeColorHex(run.color),
        locked: run.locked,
        hidden: run.hidden,
      })),
    ...design.treatments
      .filter((treatment) => treatment.anchor.wallIndex === wallIndex)
      .map((treatment) => ({
        kind: "treatment" as const,
        id: treatment.id,
        label: treatment.label,
        start: treatment.anchor.startOffset,
        end: treatment.anchor.endOffset,
        fill: getDrapeColorHex(treatment.color),
        locked: treatment.locked,
        hidden: treatment.hidden,
      })),
    ...design.openings
      .filter((opening) => opening.wallIndex === wallIndex)
      .map((opening) => ({
        kind: "opening" as const,
        id: opening.id,
        label: opening.label,
        start: opening.offset,
        end: opening.offset + opening.width,
        fill: "transparent",
        locked: opening.locked,
        hidden: opening.hidden,
      })),
  ].sort((a, b) => a.start - b.start);

  const covered = items
    .filter((item) => item.kind !== "opening")
    .reduce((sum, item) => sum + (item.end - item.start), 0);
  const heading = Math.round(((wall.angle * 180) / Math.PI + 360) % 360);
  const length = Math.max(1, wall.length);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/40 to-card/20 p-3">
        <div
          className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-primary/15 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
            <PanelsTopLeft className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Structural wall
            </p>
            <p className="font-heading text-2xl leading-none">
              {inchesToFeetLabel(wall.length)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={Ruler} label="Height" value={inchesToFeetLabel(design.room.wallHeight)} />
        <StatTile icon={Layers} label="Dressed" value={`${Math.min(100, Math.round((covered / length) * 100))}%`} />
        <StatTile icon={Compass} label="Heading" value={`${heading}°`} />
      </div>

      <InspectorSection
        icon={Layers}
        eyebrow="On this wall"
        title={`${items.length} item${items.length === 1 ? "" : "s"}`}
      >
        <div className="space-y-1.5">
          <div className="relative h-10 overflow-hidden rounded-xl border border-border/40 bg-[repeating-linear-gradient(90deg,transparent_0_11px,color-mix(in_oklch,var(--border)_50%,transparent)_11px_12px)]">
            {items.map((item) => (
              <StudioTip
                key={item.id}
                label={`${item.label} · ${inchesToFeetLabel(item.start)}–${inchesToFeetLabel(item.end)}`}
              >
                <button
                  type="button"
                  aria-label={`Select ${item.label}`}
                  onClick={() => select({ kind: item.kind, id: item.id })}
                  onPointerEnter={() => setHoveredId(item.id)}
                  onPointerLeave={() => setHoveredId(null)}
                  className={cn(
                    "absolute rounded-md border transition-[box-shadow,opacity] hover:ring-2 hover:ring-primary/50",
                    item.kind === "opening"
                      ? "inset-y-0 border-dashed border-foreground/50 bg-background/70"
                      : item.kind === "treatment"
                        ? "top-0 bottom-3 border-primary/60"
                        : "inset-y-1 border-border/60",
                    item.hidden && "opacity-40",
                    isSelected(item.id) && "ring-2 ring-primary"
                  )}
                  style={{
                    left: `${(item.start / length) * 100}%`,
                    width: `${Math.max(1.5, ((item.end - item.start) / length) * 100)}%`,
                    ...(item.kind === "opening" ? {} : { backgroundColor: item.fill }),
                  }}
                />
              </StudioTip>
            ))}
          </div>
          <div className="flex justify-between text-[0.58rem] text-muted-foreground">
            <span>0′</span>
            <span>{inchesToFeetLabel(wall.length)}</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 p-3 text-[0.7rem] text-muted-foreground">
            <MousePointerClick className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            Bare wall — add a drape run or treatment from the tools rail and it
            will land here.
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = STUDIO_KIND_ICONS[item.kind];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select({ kind: item.kind, id: item.id })}
                    onPointerEnter={() => setHoveredId(item.id)}
                    onPointerLeave={() => setHoveredId(null)}
                    className="group flex w-full items-center gap-2 rounded-xl border border-border/40 bg-card/30 px-2 py-1.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-primary ring-1 ring-border/40"
                      style={
                        item.kind === "opening"
                          ? undefined
                          : {
                              background: `linear-gradient(135deg, ${item.fill}, color-mix(in oklch, ${item.fill} 70%, black))`,
                            }
                      }
                    >
                      <Icon
                        className={cn(
                          "size-3.5",
                          item.kind !== "opening" && "text-white mix-blend-difference"
                        )}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {item.label}
                      </span>
                      <span className="block text-[0.6rem] text-muted-foreground">
                        {STUDIO_KIND_LABELS[item.kind]} ·{" "}
                        {inchesToFeetLabel(item.start)}–{inchesToFeetLabel(item.end)}
                      </span>
                    </span>
                    {item.locked ? (
                      <Lock
                        className="size-3 text-muted-foreground"
                        aria-label="Locked"
                        data-studio-tip="Locked"
                      />
                    ) : null}
                    {item.hidden ? (
                      <EyeOff
                        className="size-3 text-muted-foreground"
                        aria-label="Hidden"
                        data-studio-tip="Hidden"
                      />
                    ) : null}
                    <ArrowRight
                      className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </InspectorSection>
    </div>
  );
}

"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { StudioDesignJson } from "@/data/studio";
import { getWallSegments, inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock3,
  Layers,
  LoaderCircle,
  ScissorsLineDashed,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { DrapeRunEditor } from "./drape-run-editor";
import { useStudioEditor } from "./editor/studio-editor-context";
import { DesignBrief } from "./inspector/design-brief";
import { ItemHeader, StatusChip } from "./inspector/item-header";
import { MultiInspector } from "./inspector/multi-inspector";
import { ObjectInspector } from "./inspector/object-inspector";
import { OpeningInspector } from "./inspector/opening-inspector";
import { WallInspector } from "./inspector/wall-inspector";
import { StudioLayersPanel } from "./studio-layers-panel";
import { TreatmentEditor } from "./treatment-editor";
import type { StudioSaveState, StudioSelection } from "./studio-types";

type StudioRightRailProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  saveState: StudioSaveState;
  idPrefix: string;
};

type RailTab = "inspect" | "layers";

const saveCopy: Record<StudioSaveState, string> = {
  idle: "Ready",
  dirty: "Unsaved",
  saving: "Saving…",
  saved: "Saved",
  error: "Needs attention",
};

export function StudioRightRail({
  design,
  onChange,
  selection,
  onSelect,
  saveState,
  idPrefix,
}: StudioRightRailProps) {
  const { selectedIds } = useStudioEditor();
  const [tab, setTab] = useState<RailTab>("inspect");
  const walls = getWallSegments(design.room.floor);
  const multi = selectedIds.length > 1;
  const selectedDrape =
    !multi && selection?.kind === "drape"
      ? design.drapeRuns.find((run) => run.id === selection.id)
      : undefined;
  const selectedTreatment =
    !multi && selection?.kind === "treatment"
      ? design.treatments.find((treatment) => treatment.id === selection.id)
      : undefined;
  const selectedObject =
    !multi && selection?.kind === "object"
      ? design.objects.find((object) => object.id === selection.id)
      : undefined;
  const selectedOpening =
    !multi && selection?.kind === "opening"
      ? design.openings.find((opening) => opening.id === selection.id)
      : undefined;
  const selectedWall =
    !multi && selection?.kind === "wall" ? walls[selection.index] : undefined;
  const itemCount =
    design.objects.length +
    design.drapeRuns.length +
    design.treatments.length +
    design.openings.length;

  const title = multi
    ? `${selectedIds.length} selected`
    : selectedDrape
      ? "Drape run"
      : selectedTreatment
        ? "Drape treatment"
        : selectedObject
          ? "Room object"
          : selectedOpening
            ? "Opening"
            : selectedWall
              ? `Wall ${selectedWall.index + 1}`
              : "Design brief";

  return (
    <TooltipProvider delayDuration={250}>
      <aside className="flex h-full min-h-0 flex-col bg-card/35">
        <div className="shrink-0 space-y-3 border-b border-border/40 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_70%)] px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold tracking-[0.22em] text-primary uppercase">
                {tab === "layers" ? "Outliner" : "Inspector"}
              </p>
              <h2 className="truncate font-heading text-lg leading-tight">
                {tab === "layers" ? "Layers" : title}
              </h2>
            </div>
            <SavePill state={saveState} />
          </div>
          <div
            role="tablist"
            aria-label="Right rail"
            className="grid grid-cols-2 gap-1 rounded-2xl border border-border/40 bg-background/40 p-1"
          >
            <RailTabButton
              active={tab === "inspect"}
              icon={SlidersHorizontal}
              label="Inspect"
              onClick={() => setTab("inspect")}
            />
            <RailTabButton
              active={tab === "layers"}
              icon={Layers}
              label="Layers"
              count={itemCount}
              onClick={() => setTab("layers")}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {tab === "layers" ? (
            <StudioLayersPanel design={design} onChange={onChange} />
          ) : multi ? (
            <MultiInspector design={design} onChange={onChange} />
          ) : selectedDrape ? (
            <div className="space-y-3">
              <ItemHeader
                icon={ScissorsLineDashed}
                eyebrow={`Drape run · Wall ${selectedDrape.wallIndex + 1}`}
                label={selectedDrape.label}
                locked={selectedDrape.locked}
                hidden={selectedDrape.hidden}
                meta={
                  <StatusChip>
                    {inchesToFeetLabel(
                      selectedDrape.endOffset - selectedDrape.startOffset
                    )}{" "}
                    run
                  </StatusChip>
                }
              />
              <DrapeRunEditor
                design={design}
                run={selectedDrape}
                onChange={onChange}
                idPrefix={`${idPrefix}-drape`}
              />
            </div>
          ) : selectedTreatment ? (
            <div className="space-y-3">
              <ItemHeader
                icon={Sparkles}
                eyebrow={`Treatment · Wall ${selectedTreatment.anchor.wallIndex + 1}`}
                label={selectedTreatment.label}
                locked={selectedTreatment.locked}
                hidden={selectedTreatment.hidden}
                meta={
                  <StatusChip>
                    {inchesToFeetLabel(
                      selectedTreatment.anchor.endOffset -
                        selectedTreatment.anchor.startOffset
                    )}{" "}
                    wide
                  </StatusChip>
                }
              />
              <TreatmentEditor
                design={design}
                treatment={selectedTreatment}
                onChange={onChange}
                onSelect={onSelect}
                idPrefix={`${idPrefix}-treatment`}
              />
            </div>
          ) : selectedObject ? (
            <ObjectInspector
              design={design}
              object={selectedObject}
              onChange={onChange}
            />
          ) : selectedOpening ? (
            <OpeningInspector
              design={design}
              opening={selectedOpening}
              onChange={onChange}
            />
          ) : selectedWall ? (
            <WallInspector design={design} wallIndex={selectedWall.index} />
          ) : (
            <DesignBrief design={design} onChange={onChange} idPrefix={idPrefix} />
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

function RailTabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: typeof Layers;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        active
          ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-[0.6rem] tabular-nums",
            active ? "bg-primary/20" : "bg-muted/60"
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SavePill({ state }: { state: StudioSaveState }) {
  const Icon =
    state === "saved"
      ? CheckCircle2
      : state === "error"
        ? TriangleAlert
        : state === "saving"
          ? LoaderCircle
          : Clock3;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-1 text-[0.62rem] text-muted-foreground",
        state === "error" && "border-destructive/40 text-destructive"
      )}
      role="status"
    >
      <Icon
        className={cn(
          "size-3 text-primary",
          state === "saving" && "animate-spin motion-reduce:animate-none"
        )}
        aria-hidden="true"
      />
      {saveCopy[state]}
    </span>
  );
}

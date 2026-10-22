"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";
import {
  ArrowUpFromLine,
  Cctv,
  Crosshair,
  Footprints,
  Grid2x2,
  House,
  Maximize,
  MicVocal,
  Mouse,
  MousePointer2,
  Orbit,
  PersonStanding,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import {
  isInteriorMode,
  mouseLookAvailable,
  setStudioMouseLook,
  useStudioMouseLook,
  useStudioPointerLocked,
  type StudioCameraMode,
} from "./camera-view-store";

type ChipMode = Exclude<StudioCameraMode, "showcase" | "front">;

const VIEW_CHIPS: Array<{ mode: ChipMode; label: string; hint: string; icon: LucideIcon }> = [
  { mode: "guest", label: "Guest view", hint: "Stand where your guests will", icon: PersonStanding },
  { mode: "stage", label: "Stage", hint: "Look back from the focal point", icon: MicVocal },
  { mode: "corner", label: "Corner", hint: "High corner across the room", icon: Cctv },
  { mode: "ceiling", label: "Ceiling", hint: "Look up at the ceiling", icon: ArrowUpFromLine },
  { mode: "walk", label: "Walk", hint: "Walk the room in first person", icon: Footprints },
  { mode: "top", label: "Top", hint: "Bird's-eye floor plan", icon: Grid2x2 },
  { mode: "dollhouse", label: "Dollhouse", hint: "Outside, cut-away overview", icon: House },
];

const IN_ROOM_HINTS = [
  "Drag to look",
  "Right-drag to orbit",
  "WASD to walk",
  "Q/E eye height",
  "Scroll to step",
];

const MODE_HINTS: Record<StudioCameraMode, string[]> = {
  guest: IN_ROOM_HINTS,
  stage: IN_ROOM_HINTS,
  corner: IN_ROOM_HINTS,
  front: IN_ROOM_HINTS,
  ceiling: ["Drag to look up & around", "WASD to walk under it", "Q/E eye height", "Scroll to step"],
  walk: ["Drag to look", "WASD to walk · Shift to run", "Q/E eye height", "Double-click floor to go there"],
  showcase: ["Drag to look around", "Scroll to step closer", "Double-click floor to go there"],
  top: ["Drag to orbit", "Right-drag to pan", "Scroll to zoom"],
  dollhouse: ["Drag to orbit", "Right-drag to pan", "Scroll to zoom"],
};

const LOCKED_HINTS = [
  "Mouse look",
  "Click selects at the crosshair",
  "WASD to walk · Shift to run",
  "Q/E eye height",
  "Esc to release",
];

function hintsFor(mode: StudioCameraMode, spinning: boolean, mouseLook: boolean, locked: boolean) {
  if (spinning) return ["Showcase spin · drag to take over"];
  if (locked) return LOCKED_HINTS;
  const hints = MODE_HINTS[mode];
  return mouseLookAvailable(mode, mouseLook) ? ["Click to look with the mouse", ...hints] : hints;
}

function ChipButton({
  icon: Icon,
  label,
  hint,
  active,
  disabled = false,
  iconOnly = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${label} — ${hint}`}
      title={hint}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium whitespace-nowrap transition-all duration-200 motion-reduce:transition-none",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_18px_oklch(0.76_0.15_88/35%)]"
          : "text-foreground/70 hover:bg-card/60 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-primary-foreground" : "text-primary/85 group-hover:text-primary"
        )}
        aria-hidden
      />
      {iconOnly ? null : <span className="hidden @3xl:inline">{label}</span>}
    </button>
  );
}

/**
 * Floating glass segmented control for the 3D camera: interior presets,
 * plan / dollhouse, the showcase spin toggle, plus fit and focus.
 */
export const StudioViewChips = memo(function StudioViewChips({
  mode,
  spinning,
  hasSelection,
  onSelect,
  onToggleShowcase,
  onFit,
  onFocus,
}: {
  mode: StudioCameraMode;
  spinning: boolean;
  hasSelection: boolean;
  onSelect: (mode: ChipMode) => void;
  onToggleShowcase: () => void;
  onFit: () => void;
  onFocus: () => void;
}) {
  const mouseLook = useStudioMouseLook();
  const locked = useStudioPointerLocked();
  const hints = hintsFor(mode, spinning, mouseLook, locked);
  const offersMouseLook = isInteriorMode(mode) && mode !== "walk";
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col items-center gap-2">
      <p
        className={cn(
          "hidden items-center gap-2 rounded-full border bg-background/55 px-3 py-1 text-[0.62rem] shadow-md backdrop-blur-xl @2xl:inline-flex",
          locked ? "border-primary/40 text-foreground/85" : "border-border/40 text-muted-foreground"
        )}
      >
        {locked ? (
          <Crosshair className="size-3 text-primary" aria-hidden />
        ) : (
          <Mouse className="size-3 text-primary/80" aria-hidden />
        )}
        {hints.join(" · ")}
      </p>
      <nav
        aria-label="Camera views"
        className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-border/40 bg-background/65 p-1 shadow-2xl backdrop-blur-xl [scrollbar-width:none]"
      >
        {VIEW_CHIPS.map((chip) => (
          <ChipButton
            key={chip.mode}
            icon={chip.icon}
            label={chip.label}
            hint={chip.hint}
            active={!spinning && mode === chip.mode}
            onClick={() => onSelect(chip.mode)}
          />
        ))}
        <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border/50" />
        <ChipButton
          icon={Orbit}
          label="Showcase"
          hint={spinning ? "Stop the showcase spin" : "Slow cinematic spin inside the room"}
          active={spinning}
          onClick={onToggleShowcase}
        />
        {offersMouseLook ? (
          <ChipButton
            icon={MousePointer2}
            label="Mouse look"
            hint={
              mouseLook
                ? "Back to drag-to-look"
                : "Click the room to look with the mouse · Esc to release"
            }
            active={mouseLook}
            iconOnly
            onClick={() => setStudioMouseLook(!mouseLook)}
          />
        ) : null}
        <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border/50" />
        <ChipButton
          icon={Maximize}
          label="Fit"
          hint="Re-frame the current view"
          active={false}
          iconOnly
          onClick={onFit}
        />
        <ChipButton
          icon={ScanSearch}
          label="Focus"
          hint="Frame the selection"
          active={false}
          iconOnly
          disabled={!hasSelection}
          onClick={onFocus}
        />
      </nav>
    </div>
  );
});

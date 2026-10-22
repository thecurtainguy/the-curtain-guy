"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Armchair,
  Box,
  CalendarHeart,
  Camera,
  Check,
  ChevronDown,
  Columns2,
  Ellipsis,
  Gauge,
  Grid3x3,
  Hand,
  Keyboard,
  LoaderCircle,
  Magnet,
  Map as PlanIcon,
  Maximize2,
  Menu,
  Minimize2,
  MonitorPlay,
  Moon,
  MousePointer2,
  PanelRight,
  Redo2,
  Rotate3d,
  Ruler,
  RulerDimensionLine,
  Save,
  Scan,
  Spline,
  Sun,
  Tag,
  TriangleAlert,
  Undo2,
  View,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { memo, useSyncExternalStore } from "react";
import {
  STUDIO_SNAP_INCREMENTS,
  useStudioEditorActions,
  useStudioHistory,
  useStudioSettings,
  useStudioView,
  type StudioEditorSettings,
  type StudioQuality,
  type StudioTool,
} from "./editor/studio-editor-context";
import { preloadStudio3D } from "./studio-3d-lazy";
import { StudioShortcutsDialog } from "./studio-shortcuts-dialog";
import { StudioTip } from "./studio-tip";
import type {
  StudioAccessMode,
  StudioSaveState,
  StudioViewMode,
} from "./studio-types";

type StudioToolbarProps = {
  title: string;
  onTitleChange: (title: string) => void;
  viewMode: StudioViewMode;
  onViewModeChange: (mode: StudioViewMode) => void;
  saveState: StudioSaveState;
  saveMessage?: string;
  accessMode: StudioAccessMode;
  onSave: () => void;
  onOpenTools: () => void;
  onOpenProperties: () => void;
  titleEditable?: boolean;
  eventTypeLabel?: string;
  saveHidden?: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  presenting?: boolean;
  onTogglePresent?: () => void;
  /** "Smith Wedding · Jun 14 · 180 guests" once event details exist. */
  eventSummary?: string | null;
  onOpenEventDetails?: () => void;
};

const VIEW_MODES: Array<{
  value: StudioViewMode;
  label: string;
  icon: LucideIcon;
  key: string;
}> = [
  { value: "2d", label: "2D", icon: PlanIcon, key: "1" },
  { value: "3d", label: "3D", icon: Box, key: "2" },
  { value: "split", label: "Split", icon: Columns2, key: "3" },
];

const warm3D = () => void preloadStudio3D();

const TOOLS: Array<{
  value: StudioTool;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  { value: "select", label: "Select", icon: MousePointer2, hint: "Click, drag, Shift-click" },
  { value: "pan", label: "Pan", icon: Hand, hint: "Or hold Space" },
  { value: "measure", label: "Measure", icon: Ruler, hint: "Drag between two points" },
];

const QUALITIES: Array<{ value: StudioQuality; label: string; hint: string }> = [
  { value: "draft", label: "Draft", hint: "Fastest" },
  { value: "high", label: "High", hint: "Balanced" },
  { value: "ultra", label: "Ultra", hint: "Soft shadows" },
];

const ROTATION_SNAPS = [5, 15, 45] as const;

type ViewToggleKey = keyof Pick<
  StudioEditorSettings,
  "showGrid" | "showDimensions" | "showLabels" | "showSeating"
>;

const VIEW_TOGGLES: Array<{ key: ViewToggleKey; label: string; icon: LucideIcon }> = [
  { key: "showGrid", label: "Grid", icon: Grid3x3 },
  { key: "showDimensions", label: "Dimensions", icon: RulerDimensionLine },
  { key: "showLabels", label: "Labels", icon: Tag },
  { key: "showSeating", label: "Seating", icon: Armchair },
];

export function formatSnapIncrement(inches: number): string {
  return inches >= 12 && inches % 12 === 0 ? `${inches / 12}′` : `${inches}″`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Memoized: re-renders on toolbar props, settings, history or view changes — not on drag frames. */
export const StudioToolbar = memo(function StudioToolbar({
  title,
  onTitleChange,
  viewMode,
  onViewModeChange,
  saveState,
  saveMessage,
  accessMode,
  onSave,
  onOpenTools,
  onOpenProperties,
  titleEditable = true,
  eventTypeLabel,
  saveHidden = false,
  fullscreen = false,
  onToggleFullscreen,
  presenting = false,
  onTogglePresent,
  eventSummary,
  onOpenEventDetails,
}: StudioToolbarProps) {
  const { undo, redo, updateSettings, sendCanvasCommand, takeSnapshot, setShortcutsOpen } =
    useStudioEditorActions();
  const { canUndo, canRedo } = useStudioHistory();
  const settings = useStudioSettings();
  const { canSnapshot } = useStudioView();
  const saving = saveState === "saving";
  const threeVisible = viewMode !== "2d";
  const snapshotReady = threeVisible && canSnapshot;

  function captureSnapshot() {
    const url = takeSnapshot();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(title) || "studio-design"}-3d.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header className="relative flex min-h-16 flex-wrap items-center gap-2 border-b border-border/60 bg-card/75 px-3 py-2 backdrop-blur-xl sm:px-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_45%)]"
          aria-hidden="true"
        />
        <div className="relative mr-1 flex shrink-0 items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <View className="size-4" aria-hidden="true" />
          </div>
          <div className="hidden 2xl:block">
            <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
              Curtain Guy
            </p>
            <p className="font-heading text-sm leading-none">Studio</p>
          </div>
        </div>

        <div className="relative min-w-0 flex-1 lg:max-w-64 xl:max-w-xs">
          {titleEditable ? (
            <>
              <label htmlFor="studio-design-title" className="sr-only">
                Design title
              </label>
              <Input
                id="studio-design-title"
                value={title}
                maxLength={160}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Untitled room design"
                className="h-9 bg-background/55 font-heading text-base"
              />
            </>
          ) : (
            <div className="flex min-h-9 items-center gap-2 px-1">
              <p className="truncate font-heading text-base font-semibold">{title}</p>
              {eventTypeLabel ? (
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {eventTypeLabel}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="relative order-3 flex w-full min-w-0 items-center gap-1.5 lg:order-none lg:w-auto">
          <ToolbarGroup label="Editor view">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              const active = viewMode === mode.value;
              return (
                <Tooltip key={mode.value}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onViewModeChange(mode.value)}
                      onPointerEnter={mode.value === "2d" ? undefined : warm3D}
                      onFocus={mode.value === "2d" ? undefined : warm3D}
                      className={cn(
                        "flex h-7 items-center gap-1 rounded-xl px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                        active
                          ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                      {mode.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {mode.value === "split" ? "Plan + 3D side by side" : `${mode.label} view`}
                    <Kbd>{mode.key}</Kbd>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </ToolbarGroup>

          <ToolbarGroup label="History">
            <ToolButton icon={Undo2} label="Undo" shortcut="Ctrl Z" disabled={!canUndo} onClick={undo} />
            <ToolButton icon={Redo2} label="Redo" shortcut="Ctrl ⇧ Z" disabled={!canRedo} onClick={redo} />
          </ToolbarGroup>

          <ToolbarGroup label="Tool" className="hidden md:flex">
            {TOOLS.map((tool) => (
              <ToolButton
                key={tool.value}
                icon={tool.icon}
                label={`${tool.label} — ${tool.hint}`}
                active={settings.tool === tool.value}
                onClick={() => updateSettings({ tool: tool.value })}
              />
            ))}
          </ToolbarGroup>

          <div className="hidden items-center gap-1.5 lg:flex">
            <SnapPopover />
            <ToolbarGroup label="Framing">
              <ToolButton
                icon={Scan}
                label="Fit room to view"
                shortcut="F"
                onClick={() => sendCanvasCommand({ type: "fit" })}
              />
            </ToolbarGroup>
          </div>

          <ToolbarGroup label="View overlays" className="hidden 2xl:flex">
            {VIEW_TOGGLES.map((toggle) => (
              <ToolButton
                key={toggle.key}
                icon={toggle.icon}
                label={`${settings[toggle.key] ? "Hide" : "Show"} ${toggle.label.toLowerCase()}`}
                active={settings[toggle.key]}
                onClick={() => updateSettings({ [toggle.key]: !settings[toggle.key] })}
              />
            ))}
          </ToolbarGroup>

          {threeVisible ? (
            <ToolbarGroup label="3D render" className="hidden xl:flex">
              <QualityMenu />
              <ToolButton
                icon={Rotate3d}
                label={settings.autoRotate ? "Stop showcase spin" : "Showcase spin"}
                active={settings.autoRotate}
                onClick={() => updateSettings({ autoRotate: !settings.autoRotate })}
              />
              <ToolButton
                icon={Camera}
                label={snapshotReady ? "Save 3D snapshot (PNG)" : "3D view is loading…"}
                disabled={!snapshotReady}
                onClick={captureSnapshot}
              />
            </ToolbarGroup>
          ) : null}

          {onTogglePresent || onToggleFullscreen ? (
            <ToolbarGroup label="Display" className="hidden sm:flex">
              {onTogglePresent ? (
                <ToolButton
                  icon={MonitorPlay}
                  label={presenting ? "Exit present" : "Present"}
                  shortcut="P"
                  active={presenting}
                  onClick={onTogglePresent}
                />
              ) : null}
              {onToggleFullscreen ? (
                <ToolButton
                  icon={fullscreen ? Minimize2 : Maximize2}
                  label={fullscreen ? "Exit full screen" : "Full screen"}
                  shortcut="Ctrl ⇧ F"
                  active={fullscreen}
                  onClick={onToggleFullscreen}
                />
              ) : null}
            </ToolbarGroup>
          ) : null}

          <ToolButton
            icon={Keyboard}
            label="Keyboard shortcuts"
            shortcut="?"
            onClick={() => setShortcutsOpen(true)}
            className="hidden xl:flex"
            bare
          />

          <ThemeButton />

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More studio controls"
                    className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background/45 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-expanded:text-primary 2xl:hidden"
                  >
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">More controls</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64">
              {onTogglePresent || onToggleFullscreen ? (
                <DropdownMenuGroup className="sm:hidden">
                  <DropdownMenuLabel>Display</DropdownMenuLabel>
                  {onTogglePresent ? (
                    <DropdownMenuItem onSelect={onTogglePresent}>
                      <MonitorPlay aria-hidden="true" />
                      {presenting ? "Exit present" : "Present"}
                      <DropdownMenuShortcut>P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ) : null}
                  {onToggleFullscreen ? (
                    <DropdownMenuItem onSelect={onToggleFullscreen}>
                      {fullscreen ? (
                        <Minimize2 aria-hidden="true" />
                      ) : (
                        <Maximize2 aria-hidden="true" />
                      )}
                      {fullscreen ? "Exit full screen" : "Full screen"}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                </DropdownMenuGroup>
              ) : null}
              <DropdownMenuGroup className="md:hidden">
                <DropdownMenuLabel>Tool</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={settings.tool}
                  onValueChange={(value) => updateSettings({ tool: value as StudioTool })}
                >
                  {TOOLS.map((tool) => (
                    <DropdownMenuRadioItem key={tool.value} value={tool.value}>
                      <tool.icon aria-hidden="true" />
                      {tool.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
              </DropdownMenuGroup>

              <DropdownMenuGroup className="lg:hidden">
                <DropdownMenuLabel>Snapping</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={settings.snapEnabled}
                  onCheckedChange={(checked) => updateSettings({ snapEnabled: checked })}
                  onSelect={(event) => event.preventDefault()}
                >
                  <Magnet aria-hidden="true" />
                  Snap to grid
                  <DropdownMenuShortcut>G</DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Grid3x3 aria-hidden="true" />
                    Step
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatSnapIncrement(settings.snapIncrement)}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={String(settings.snapIncrement)}
                      onValueChange={(value) => updateSettings({ snapIncrement: Number(value) })}
                    >
                      {STUDIO_SNAP_INCREMENTS.map((increment) => (
                        <DropdownMenuRadioItem key={increment} value={String(increment)}>
                          {formatSnapIncrement(increment)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Rotate3d aria-hidden="true" />
                    Rotation snap
                    <span className="ml-auto text-xs text-muted-foreground">
                      {settings.rotationSnap}°
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={String(settings.rotationSnap)}
                      onValueChange={(value) => updateSettings({ rotationSnap: Number(value) })}
                    >
                      {ROTATION_SNAPS.map((step) => (
                        <DropdownMenuRadioItem key={step} value={String(step)}>
                          {step}°
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuCheckboxItem
                  checked={settings.smartGuides}
                  onCheckedChange={(checked) => updateSettings({ smartGuides: checked })}
                  onSelect={(event) => event.preventDefault()}
                >
                  <Spline aria-hidden="true" />
                  Smart guides
                </DropdownMenuCheckboxItem>
                <DropdownMenuItem onSelect={() => sendCanvasCommand({ type: "fit" })}>
                  <Scan aria-hidden="true" />
                  Fit room to view
                  <DropdownMenuShortcut>F</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </DropdownMenuGroup>

              <DropdownMenuLabel>Overlays</DropdownMenuLabel>
              {VIEW_TOGGLES.map((toggle) => (
                <DropdownMenuCheckboxItem
                  key={toggle.key}
                  checked={settings[toggle.key]}
                  onCheckedChange={(checked) => updateSettings({ [toggle.key]: checked })}
                  onSelect={(event) => event.preventDefault()}
                >
                  <toggle.icon aria-hidden="true" />
                  {toggle.label}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuGroup className="xl:hidden">
                <DropdownMenuSeparator />
                <DropdownMenuLabel>3D render</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={settings.quality}
                  onValueChange={(value) => updateSettings({ quality: value as StudioQuality })}
                >
                  {QUALITIES.map((quality) => (
                    <DropdownMenuRadioItem key={quality.value} value={quality.value}>
                      <Gauge aria-hidden="true" />
                      {quality.label}
                      <span className="ml-auto pr-4 text-xs text-muted-foreground">{quality.hint}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuCheckboxItem
                  checked={settings.autoRotate}
                  disabled={!threeVisible}
                  onCheckedChange={(checked) => updateSettings({ autoRotate: checked })}
                >
                  <Rotate3d aria-hidden="true" />
                  Showcase spin
                </DropdownMenuCheckboxItem>
                <DropdownMenuItem disabled={!snapshotReady} onSelect={captureSnapshot}>
                  <Camera aria-hidden="true" />
                  {threeVisible ? "Save 3D snapshot" : "Snapshot (switch to 3D)"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
                  <Keyboard aria-hidden="true" />
                  Keyboard shortcuts
                  <DropdownMenuShortcut>?</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex gap-1.5 lg:hidden">
            <StudioTip label="Open design tools" side="bottom">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onOpenTools}
                aria-label="Open design tools"
              >
                <Menu aria-hidden="true" />
              </Button>
            </StudioTip>
            <StudioTip label="Open properties" side="bottom">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onOpenProperties}
                aria-label="Open properties"
              >
                <PanelRight aria-hidden="true" />
              </Button>
            </StudioTip>
          </div>
        </div>

        <div className="relative ml-auto flex shrink-0 items-center gap-2">
          {onOpenEventDetails ? (
            <StudioTip
              side="bottom"
              label={
                eventSummary
                  ? "Edit your event details"
                  : "Add your event date, guests and venue"
              }
            >
              <button
                type="button"
                onClick={onOpenEventDetails}
                aria-label={eventSummary ? `Your event: ${eventSummary}` : "Your event"}
                className={cn(
                  "flex h-9 max-w-56 min-w-0 items-center gap-2 rounded-2xl border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  eventSummary
                    ? "border-primary/35 bg-primary/10 text-foreground hover:border-primary/60"
                    : "border-primary/45 bg-gradient-to-br from-primary/20 to-primary/5 text-primary hover:from-primary/30"
                )}
              >
                <CalendarHeart className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className={cn("truncate", eventSummary && "hidden sm:inline")}>
                  {eventSummary || "Your event"}
                </span>
              </button>
            </StudioTip>
          ) : null}
          <span
            className={cn(
              "flex max-w-28 items-center gap-1.5 truncate text-[0.68rem] sm:max-w-44",
              saveState === "error" ? "text-destructive" : "text-muted-foreground"
            )}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-studio-tip={saveMessage || undefined}
          >
            {saving ? (
              <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" />
            ) : saveState === "saved" ? (
              <Check className="size-3 text-emerald-600" />
            ) : saveState === "error" ? (
              <TriangleAlert className="size-3" />
            ) : null}
            {saveMessage ??
              (saveState === "dirty"
                ? "Unsaved"
                : saveState === "saved"
                  ? "Saved"
                  : accessMode === "guest"
                    ? "Guest design"
                    : "Ready")}
          </span>
          <Button type="button" onClick={onSave} disabled={saving} className={saveHidden ? "hidden" : undefined}>
            {saving ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      </header>
      <StudioShortcutsDialog />
    </TooltipProvider>
  );
});

function ToolbarGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-2xl border border-border/60 bg-background/45 p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  active,
  disabled,
  className,
  bare,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  /** Standalone (not inside a ToolbarGroup). */
  bare?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Span keeps the tooltip working while the button is disabled. */}
        <span className={cn("inline-flex", className)}>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-35",
              bare
                ? "size-9 rounded-2xl border border-border/60 bg-background/45"
                : "size-7 rounded-xl",
              active
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

const subscribeNoop = () => () => {};

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only knows the resolved theme on the client.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <ToolButton
      icon={isDark ? Sun : Moon}
      label={!mounted ? "Toggle color theme" : isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      bare
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      data-slot="kbd"
      className="ml-1 inline-flex h-5 items-center rounded-md border border-background/25 bg-background/15 px-1.5 font-mono text-[0.6rem] leading-none"
    >
      {children}
    </kbd>
  );
}

function SnapPopover() {
  const settings = useStudioSettings();
  const { updateSettings } = useStudioEditorActions();
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Snapping options"
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                settings.snapEnabled
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-background/45 text-muted-foreground hover:text-foreground"
              )}
            >
              <Magnet className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">
                {settings.snapEnabled ? formatSnapIncrement(settings.snapIncrement) : "Off"}
              </span>
              <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Snapping
          <Kbd>G</Kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-80 space-y-3 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Magnet className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Precision
            </p>
            <p className="font-heading text-sm leading-tight">Snapping</p>
          </div>
          <SwitchButton
            checked={settings.snapEnabled}
            label="Snap to grid"
            shortcut="G"
            onChange={(snapEnabled) => updateSettings({ snapEnabled })}
          />
        </div>
        <SnapTiles
          label="Grid step"
          disabled={!settings.snapEnabled}
          options={STUDIO_SNAP_INCREMENTS.map((value) => ({
            value,
            label: formatSnapIncrement(value),
          }))}
          value={settings.snapIncrement}
          onChange={(snapIncrement) => updateSettings({ snapIncrement })}
        />
        <SnapTiles
          label="Rotation step"
          disabled={!settings.snapEnabled}
          options={ROTATION_SNAPS.map((value) => ({ value, label: `${value}°` }))}
          value={settings.rotationSnap}
          onChange={(rotationSnap) => updateSettings({ rotationSnap })}
        />
        <button
          type="button"
          role="switch"
          aria-checked={settings.smartGuides}
          onClick={() => updateSettings({ smartGuides: !settings.smartGuides })}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
            settings.smartGuides
              ? "border-primary/40 bg-primary/10"
              : "border-border/40 bg-card/30 hover:border-primary/25"
          )}
        >
          <Spline className={cn("size-4", settings.smartGuides ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium">Smart guides</span>
            <span className="block text-[0.62rem] text-muted-foreground">
              Align to edges & centres of nearby pieces
            </span>
          </span>
          <SwitchTrack checked={settings.smartGuides} />
        </button>
        <p className="text-[0.62rem] text-muted-foreground">
          Hold <span className="font-medium text-foreground">Shift</span> while
          dragging or rotating for free movement.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function SnapTiles({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Array<{ value: number; label: string }>;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-50")}>
      <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex h-11 flex-col items-center justify-center rounded-xl border font-heading text-sm tabular-nums transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                selected
                  ? "border-primary/50 bg-primary/10 text-primary shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                  : "border-border/40 bg-card/35 text-foreground/80 hover:border-primary/30"
              )}
            >
              {option.label}
              {selected ? (
                <span className="absolute top-1 right-1 flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwitchButton({
  checked,
  label,
  shortcut,
  onChange,
}: {
  checked: boolean;
  label: string;
  shortcut?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <StudioTip label={label} shortcut={shortcut}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SwitchTrack checked={checked} />
      </button>
    </StudioTip>
  );
}

function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "relative block h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted"
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left] duration-200",
          checked ? "left-4.5" : "left-0.5"
        )}
      />
    </span>
  );
}

function QualityMenu() {
  const settings = useStudioSettings();
  const { updateSettings } = useStudioEditorActions();
  const current = QUALITIES.find((quality) => quality.value === settings.quality);
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Render quality"
              className="flex h-7 items-center gap-1 rounded-xl px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-expanded:text-primary"
            >
              <Gauge className="size-3.5" aria-hidden="true" />
              {current?.label ?? "High"}
              <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Render quality</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Render quality</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.quality}
          onValueChange={(value) => updateSettings({ quality: value as StudioQuality })}
        >
          {QUALITIES.map((quality) => (
            <DropdownMenuRadioItem key={quality.value} value={quality.value}>
              {quality.label}
              <span className="ml-auto pr-4 text-xs text-muted-foreground">{quality.hint}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

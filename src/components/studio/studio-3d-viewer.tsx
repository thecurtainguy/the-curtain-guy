"use client";

import {
  getDrapeColorHex,
  getStudioMaterials,
  getStudioWallDisplay,
  type StudioWallDisplay,
} from "@/data/studio";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BoxSelect,
  Camera,
  Check,
  Crown,
  Feather,
  Gem,
  GlassWater,
  LampCeiling,
  Lightbulb,
  RectangleHorizontal,
  SlidersHorizontal,
  Sparkles,
  Square,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  useOptionalStudioEditor,
  type StudioQuality,
} from "./editor/studio-editor-context";
import type { StudioEditorProps } from "./studio-types";
import { useStudioCameraMode } from "./three/camera/camera-view-store";
import { StudioViewChips } from "./three/camera/view-chips";
import { StudioWalkHud } from "./three/camera/walk-hud";
import { STUDIO_QUALITY_PRESETS, getStudioQualityPreset } from "./three/engine-quality";
import { STUDIO_LIGHTING_MOOD_LABELS } from "./three/lighting-moods";
import { RoomScene } from "./three/room-scene";

const CANVAS_CAMERA = {
  position: [0, 5.5, 20] as [number, number, number],
  fov: 50,
  near: 0.1,
  far: 1000,
};
const CANVAS_GL = {
  antialias: true,
  alpha: false,
  stencil: false,
  powerPreference: "high-performance" as const,
};
const CANVAS_SHADOWS = { enabled: true, type: THREE.PCFShadowMap };
const SNAPSHOT_FILENAME = "curtain-guy-studio.png";

const QUALITY_OPTIONS: Array<{ value: StudioQuality; icon: LucideIcon }> = [
  { value: "draft", icon: Feather },
  { value: "high", icon: Gem },
  { value: "ultra", icon: Crown },
];

const WALL_OPTIONS: Array<{
  value: StudioWallDisplay;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: "full", label: "Full", description: "Enclosed room", icon: Square },
  { value: "cutaway", label: "Cutaway", description: "Dollhouse view", icon: BoxSelect },
  { value: "low", label: "Low", description: "Half-height", icon: RectangleHorizontal },
  { value: "glass", label: "Glass", description: "See-through", icon: GlassWater },
];

/** Registers a render-on-capture PNG snapshot for the editor. */
function SnapshotBridge({
  onRegister,
}: {
  onRegister: (capture: (() => string | null) | null) => void;
}) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    onRegister(() => {
      try {
        const state = get();
        state.advance(performance.now(), true);
        return state.gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    });
    return () => onRegister(null);
  }, [get, onRegister]);
  return null;
}

function FirstFrameSignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    window.requestAnimationFrame(() => onReady());
  });
  return null;
}

function SelectionRing({ selected, size = "md" }: { selected: boolean; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-all duration-200 motion-reduce:transition-none",
        size === "sm" ? "size-3.5" : "size-4",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/50 text-transparent"
      )}
    >
      <Check className={size === "sm" ? "size-2" : "size-2.5"} strokeWidth={3} />
    </span>
  );
}

function SceneOptionTile({
  icon: Icon,
  label,
  description,
  selected,
  onSelect,
  stacked = false,
  role = "radio",
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  stacked?: boolean;
  role?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full rounded-xl border text-left transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/30 hover:-translate-y-px hover:border-primary/30 hover:bg-card/60 motion-reduce:hover:translate-y-0",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        stacked ? "flex-col gap-2 p-2.5" : "items-center gap-2.5 p-2",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span className={cn("flex items-center", stacked ? "justify-between" : "")}>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-primary/10 text-primary/80 group-hover:text-primary"
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        {stacked ? <SelectionRing selected={selected} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-[0.65rem] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {stacked ? null : <SelectionRing selected={selected} />}
    </button>
  );
}

function PanelEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
      {children}
    </p>
  );
}

function LoadingVeil({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_38%,oklch(0.76_0.15_88/14%),transparent_62%),linear-gradient(180deg,oklch(0.17_0.01_70),oklch(0.11_0.005_70))] transition-opacity duration-700 motion-reduce:transition-none",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary shadow-[0_0_40px_oklch(0.76_0.15_88/25%)]">
          <Sparkles className="size-5 animate-pulse motion-reduce:animate-none" />
        </span>
        <p className="mt-4 text-[0.62rem] font-semibold tracking-[0.24em] text-primary uppercase">
          Studio render
        </p>
        <p className="mt-1 font-heading text-xl text-white/90">Setting the room</p>
        <p className="mt-1 text-xs text-white/55">
          Hanging drapes and warming the lights…
        </p>
        <span className="mt-4 block h-px w-40 overflow-hidden bg-white/10">
          <span className="block h-full w-1/3 animate-[studio-veil_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent motion-reduce:animate-none" />
        </span>
      </div>
      <style>{`@keyframes studio-veil{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

export function Studio3DViewer({
  design,
  onChange,
  selection,
  onSelect,
}: StudioEditorProps) {
  const editor = useOptionalStudioEditor();
  const { resolvedTheme } = useTheme();
  const darkTheme = resolvedTheme !== "light";
  const materials = getStudioMaterials(design);
  const quality = editor?.settings.quality ?? "high";
  const preset = getStudioQualityPreset(quality);
  const wallDisplay = getStudioWallDisplay(design.view);
  const showCeiling = Boolean(design.view.showCeiling);
  const autoRotate = editor?.settings.autoRotate ?? false;
  const hasSelection = Boolean(selection) || (editor?.selectedIds.length ?? 0) > 0;
  const isEmpty =
    design.drapeRuns.length === 0 && design.treatments.length === 0;

  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const cameraMode = useStudioCameraMode();
  const [captured, setCaptured] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);
  const capturedTimer = useRef<number | null>(null);

  const registerEditorSnapshot = editor?.registerSnapshot;
  const sendCanvasCommand = editor?.sendCanvasCommand;
  const updateSettings = editor?.updateSettings;

  const handleRegister = useCallback(
    (capture: (() => string | null) | null) => {
      captureRef.current = capture;
      registerEditorSnapshot?.(capture);
    },
    [registerEditorSnapshot]
  );
  const handleReady = useCallback(() => setReady(true), []);

  useEffect(
    () => () => {
      if (capturedTimer.current) window.clearTimeout(capturedTimer.current);
    },
    []
  );

  const toggleShowcase = () => {
    if (autoRotate) {
      updateSettings?.({ autoRotate: false });
      return;
    }
    sendCanvasCommand?.({ type: "camera", view: "showcase" });
  };

  const downloadSnapshot = () => {
    const url = captureRef.current?.();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = SNAPSHOT_FILENAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setCaptured(true);
    if (capturedTimer.current) window.clearTimeout(capturedTimer.current);
    capturedTimer.current = window.setTimeout(() => setCaptured(false), 1800);
  };

  const setWallDisplay = (value: StudioWallDisplay) => {
    if (value === wallDisplay) return;
    onChange({
      ...design,
      view: {
        ...design.view,
        wallDisplay: value,
        transparentWalls: value === "glass",
      },
    });
  };

  const toggleCeiling = () =>
    onChange({
      ...design,
      view: { ...design.view, showCeiling: !showCeiling },
    });

  const uplightHex = materials.uplightColor
    ? getDrapeColorHex(materials.uplightColor)
    : null;

  return (
    <div
      className="@container relative h-full min-h-[420px] overflow-hidden bg-[oklch(0.13_0.006_70)]"
      aria-label={`Interactive 3D view of ${design.room.name}`}
    >
      <Canvas
        frameloop="demand"
        dpr={preset.dpr}
        shadows={CANVAS_SHADOWS}
        camera={CANVAS_CAMERA}
        gl={CANVAS_GL}
        className="touch-none"
        onPointerMissed={() => onSelect(null)}
      >
        <RoomScene
          design={design}
          selection={selection}
          onSelect={onSelect}
          darkTheme={darkTheme}
        />
        <SnapshotBridge onRegister={handleRegister} />
        <FirstFrameSignal onReady={handleReady} />
      </Canvas>

      <LoadingVeil visible={!ready} />

      {/* Scene summary / empty-state callout */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[min(19rem,calc(100%-12rem))]">
        {isEmpty ? (
          <div className="rounded-2xl border border-primary/25 bg-background/80 p-3 shadow-lg backdrop-blur-md">
            <div className="flex gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-primary uppercase">
                  Preview ready
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                  Select a wall and add a drape treatment to preview the setup.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden items-center gap-2.5 rounded-2xl border border-border/40 bg-background/65 py-2 pr-3 pl-2 shadow-lg backdrop-blur-xl @md:flex">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Lightbulb className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
                {STUDIO_QUALITY_PRESETS[quality].label} render
              </p>
              <p className="truncate font-heading text-sm leading-tight text-foreground">
                {STUDIO_LIGHTING_MOOD_LABELS[materials.lighting]}
              </p>
            </div>
            {uplightHex ? (
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-2 py-0.5 text-[0.6rem] text-foreground/75">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: uplightHex,
                    boxShadow: `0 0 8px ${uplightHex}`,
                  }}
                />
                Uplit
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Top-right actions */}
      <div className="absolute top-3 right-3 z-20 flex items-start gap-1.5">
        <button
          type="button"
          onClick={downloadSnapshot}
          className="flex h-9 items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-2.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-xl transition-colors hover:border-primary/35 hover:bg-background/85 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Download a PNG snapshot of this view"
        >
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/12 text-primary">
            {captured ? <Check className="size-3.5" /> : <Camera className="size-3.5" />}
          </span>
          <span className="hidden @xl:inline">{captured ? "Saved" : "Snapshot"}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls="studio-3d-scene-panel"
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl border bg-background/70 px-2.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-xl transition-colors hover:border-primary/35 hover:bg-background/85 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
            panelOpen ? "border-primary/45" : "border-border/40"
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <SlidersHorizontal className="size-3.5" aria-hidden />
          </span>
          <span className="hidden @xl:inline">Scene</span>
        </button>
      </div>

      {panelOpen ? (
        <section
          id="studio-3d-scene-panel"
          aria-label="Scene settings"
          className="absolute top-14 right-3 z-20 flex max-h-[calc(100%-8.5rem)] w-[20rem] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border/40 bg-background/80 shadow-2xl backdrop-blur-xl"
        >
          <header className="flex items-center gap-2.5 border-b border-border/40 bg-[linear-gradient(135deg,oklch(0.76_0.15_88/12%),transparent_70%)] px-3.5 py-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <SlidersHorizontal className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
                Scene
              </p>
              <p className="font-heading text-sm leading-tight text-foreground">
                Render &amp; display
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              aria-label="Close scene settings"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="space-y-4 overflow-y-auto p-3.5">
            {updateSettings ? (
              <div>
                <PanelEyebrow>Render quality</PanelEyebrow>
                <div role="radiogroup" aria-label="Render quality" className="grid grid-cols-3 gap-1.5">
                  {QUALITY_OPTIONS.map((option) => (
                    <SceneOptionTile
                      key={option.value}
                      icon={option.icon}
                      label={STUDIO_QUALITY_PRESETS[option.value].label}
                      description={STUDIO_QUALITY_PRESETS[option.value].description}
                      selected={quality === option.value}
                      onSelect={() => updateSettings({ quality: option.value })}
                      stacked
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <PanelEyebrow>Walls</PanelEyebrow>
              <div role="radiogroup" aria-label="Wall display" className="grid grid-cols-2 gap-1.5">
                {WALL_OPTIONS.map((option) => (
                  <SceneOptionTile
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    selected={wallDisplay === option.value}
                    onSelect={() => setWallDisplay(option.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <PanelEyebrow>Ceiling</PanelEyebrow>
              <SceneOptionTile
                icon={LampCeiling}
                label="Show ceiling"
                description="Close the room overhead"
                selected={showCeiling}
                onSelect={toggleCeiling}
                role="checkbox"
              />
            </div>
          </div>
        </section>
      ) : null}

      {cameraMode === "walk" && ready ? <StudioWalkHud /> : null}

      {sendCanvasCommand ? (
        <StudioViewChips
          mode={cameraMode}
          spinning={autoRotate}
          hasSelection={hasSelection}
          onSelect={(view) => sendCanvasCommand({ type: "camera", view })}
          onToggleShowcase={toggleShowcase}
          onFit={() => sendCanvasCommand({ type: "fit" })}
          onFocus={() => sendCanvasCommand({ type: "focus_selection" })}
        />
      ) : null}
    </div>
  );
}

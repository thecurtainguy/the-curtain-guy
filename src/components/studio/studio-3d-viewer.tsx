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
  Cpu,
  Crown,
  Feather,
  Gauge,
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  useOptionalStudioEditorActions,
  useOptionalStudioSelection,
  useOptionalStudioSettings,
  type StudioCameraView,
  type StudioQuality,
} from "./editor/studio-editor-context";
import type { StudioEditorProps } from "./studio-types";
import { useStudioCameraMode } from "./three/camera/camera-view-store";
import { StudioTip } from "./studio-tip";
import { StudioViewChips } from "./three/camera/view-chips";
import { StudioWalkHud, showsWalkHud } from "./three/camera/walk-hud";
import { getRecommendedStudioQuality, getStudioDeviceProfile } from "./three/device-tier";
import {
  STUDIO_QUALITY_PRESETS,
  computeStudioDpr,
  getStudioQualityPreset,
  usesStudioComposer,
} from "./three/engine-quality";
import { STUDIO_LIGHTING_MOOD_LABELS } from "./three/lighting-moods";
import {
  configureStudioGovernor,
  recordStudioFrame,
  resetStudioGovernorLevel,
  resetStudioGovernorSamples,
  useStudioGovernor,
  type StudioGovernorStep,
} from "./three/perf-governor";
import { setStudioSnapshotRendering } from "./three/post-processing";
import { RoomScene } from "./three/room-scene";
import {
  registerStudioShadowRenderer,
  requestStudioShadowUpdate,
} from "./three/shadow-refresh";

const CANVAS_CAMERA = {
  position: [0, 5.5, 20] as [number, number, number],
  fov: 50,
  near: 0.1,
  far: 1000,
};
/* Shadow maps re-render only on request (see three/shadow-refresh.ts); R3F re-applies this each configure. */
const CANVAS_SHADOWS = { enabled: true, type: THREE.PCFShadowMap, autoUpdate: false };
const CANVAS_NO_SHADOWS = { enabled: false, type: THREE.PCFShadowMap, autoUpdate: false };
/** Never hold the veil longer than this on drivers that stall shader compiles. */
const SHADER_WARMUP_TIMEOUT_MS = 5000;
const SNAPSHOT_FILENAME = "curtain-guy-studio.png";
const SOFTWARE_HINT_KEY = "tcg-studio-software-hint-dismissed";

const GOVERNOR_STEP_LABELS: Record<StudioGovernorStep, string> = {
  ao: "soft shadows",
  dpr: "resolution",
  bloom: "glow",
  shadow: "shadow detail",
};

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

/** Temporarily raises shadow-casting lights to `size` (same softness); returns a restore. */
function boostShadowMaps(scene: THREE.Scene, size: number) {
  const boosted: Array<{ shadow: THREE.LightShadow; size: number; radius: number }> = [];
  scene.traverse((object) => {
    const light = object as THREE.DirectionalLight;
    if (!light.isLight || !light.castShadow || !light.shadow) return;
    const shadow = light.shadow;
    const current = shadow.mapSize.x;
    if (current >= size) return;
    boosted.push({ shadow, size: current, radius: shadow.radius });
    shadow.mapSize.set(size, size);
    shadow.radius *= size / current;
    shadow.map?.dispose();
    shadow.map = null;
  });
  return () => {
    for (const entry of boosted) {
      entry.shadow.mapSize.set(entry.size, entry.size);
      entry.shadow.radius = entry.radius;
      entry.shadow.map?.dispose();
      entry.shadow.map = null;
    }
  };
}

/**
 * Registers a render-on-capture PNG snapshot for the editor. Stills render
 * with every pass the preset has (AO even if governed off) and the preset's
 * snapshot shadow-map size, then drop back to interactive settings.
 */
const SnapshotBridge = memo(function SnapshotBridge({
  onRegister,
  shadowMapSize,
}: {
  onRegister: (capture: (() => string | null) | null) => void;
  shadowMapSize: number;
}) {
  const get = useThree((state) => state.get);
  const shadowSize = useRef(shadowMapSize);
  useEffect(() => {
    shadowSize.current = shadowMapSize;
  }, [shadowMapSize]);

  useEffect(() => {
    onRegister(() => {
      const state = get();
      const maxSize = state.gl.capabilities.maxTextureSize || 4096;
      const restoreShadows = boostShadowMaps(state.scene, Math.min(maxSize, shadowSize.current));
      setStudioSnapshotRendering(true);
      try {
        requestStudioShadowUpdate(state.gl);
        state.advance(performance.now(), true);
        return state.gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      } finally {
        setStudioSnapshotRendering(false);
        restoreShadows();
        requestStudioShadowUpdate(state.gl);
        state.invalidate();
      }
    });
    return () => onRegister(null);
  }, [get, onRegister]);
  return null;
});

/**
 * Registers the renderer for on-demand shadow refreshes and feeds frame
 * pacing to the adaptive-quality governor.
 */
const RenderPipelineBridge = memo(function RenderPipelineBridge() {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => registerStudioShadowRenderer(gl, invalidate), [gl, invalidate]);
  useFrame(() => recordStudioFrame(performance.now()));
  return null;
});

/**
 * Compiles every shader in the mounted scene (in parallel where the driver
 * supports KHR_parallel_shader_compile) while the canvas is paused behind the
 * loading veil, then starts the demand frameloop — no first-orbit hitch.
 */
const ShaderWarmup = memo(function ShaderWarmup({ onDone }: { onDone: () => void }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      const state = get();
      state.setFrameloop("demand");
      requestStudioShadowUpdate(state.gl);
      state.invalidate();
      onDone();
    };
    const timer = window.setTimeout(finish, SHADER_WARMUP_TIMEOUT_MS);
    try {
      const { gl, scene, camera } = get();
      gl.compileAsync(scene, camera).then(finish, finish);
    } catch {
      finish();
    }
    return () => {
      settled = true;
      window.clearTimeout(timer);
    };
  }, [get, onDone]);
  return null;
});

const FirstFrameSignal = memo(function FirstFrameSignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    window.requestAnimationFrame(() => onReady());
  });
  return null;
});

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
  badge,
  badgeTitle,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  stacked?: boolean;
  role?: "radio" | "checkbox";
  /** Tiny gold tag under the description (e.g. "Auto" for the device's suggestion). */
  badge?: string;
  badgeTitle?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      aria-description={badgeTitle}
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
        {badge ? (
          <StudioTip label={badgeTitle} side="bottom">
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-px text-[0.55rem] font-semibold tracking-[0.14em] text-primary uppercase">
              <span aria-hidden className="size-1 rounded-full bg-primary" />
              {badge}
            </span>
          </StudioTip>
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
  presenting = false,
}: StudioEditorProps & {
  /** Present mode: the floating present bar takes the top-left corner. */
  presenting?: boolean;
}) {
  const actions = useOptionalStudioEditorActions();
  const settings = useOptionalStudioSettings();
  const selectedCount = useOptionalStudioSelection()?.selectedIds.length ?? 0;
  const { resolvedTheme } = useTheme();
  const darkTheme = resolvedTheme !== "light";
  const materials = getStudioMaterials(design);
  const quality = settings?.quality ?? "high";
  const preset = getStudioQualityPreset(quality);
  const wallDisplay = getStudioWallDisplay(design.view);
  const showCeiling = Boolean(design.view.showCeiling);
  const autoRotate = settings?.autoRotate ?? false;
  const hasSelection = Boolean(selection) || selectedCount > 0;
  const isEmpty =
    design.drapeRuns.length === 0 && design.treatments.length === 0;

  const [deviceProfile] = useState(getStudioDeviceProfile);
  const [recommendedQuality] = useState(getRecommendedStudioQuality);
  /* Context MSAA only when nothing post-processes (Draft) and the GPU is real hardware.
     It's a context-creation attribute, so flipping it remounts the canvas (rare; the camera view is kept). */
  const contextAntialias =
    preset.contextAntialias && !usesStudioComposer(preset) && !deviceProfile.software;
  const canvasKey = contextAntialias ? "msaa" : "post";
  const glOptions = useMemo(
    () => ({
      antialias: contextAntialias,
      alpha: false,
      stencil: false,
      powerPreference: preset.powerPreference,
    }),
    [contextAntialias, preset.powerPreference]
  );

  const governor = useStudioGovernor();
  const governed = governor.quality === quality;
  useEffect(() => configureStudioGovernor(quality, preset), [preset, quality]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, deviceDpr: 1 });
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        deviceDpr: window.devicePixelRatio || 1,
      };
      setViewport((previous) =>
        previous.width === next.width &&
        previous.height === next.height &&
        previous.deviceDpr === next.deviceDpr
          ? previous
          : next
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const dpr = viewport.width
    ? computeStudioDpr(
        preset,
        viewport.width,
        viewport.height,
        viewport.deviceDpr,
        governed ? governor.dprScale : 1
      )
    : 1;

  /* Keyed by canvas so a context swap shows the veil (and re-warms shaders) again. */
  const [warmKey, setWarmKey] = useState<string | null>(null);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const ready = readyKey === canvasKey;
  const [softwareHintDismissed, setSoftwareHintDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(SOFTWARE_HINT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const cameraMode = useStudioCameraMode();
  const [captured, setCaptured] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);
  const capturedTimer = useRef<number | null>(null);

  const registerEditorSnapshot = actions?.registerSnapshot;
  const sendCanvasCommand = actions?.sendCanvasCommand;
  const updateSettings = actions?.updateSettings;

  const handleRegister = useCallback(
    (capture: (() => string | null) | null) => {
      captureRef.current = capture;
      registerEditorSnapshot?.(capture);
    },
    [registerEditorSnapshot]
  );
  const handleWarm = useCallback(() => setWarmKey(canvasKey), [canvasKey]);
  const handleReady = useCallback(() => {
    resetStudioGovernorSamples();
    setReadyKey(canvasKey);
  }, [canvasKey]);
  const dismissSoftwareHint = () => {
    setSoftwareHintDismissed(true);
    try {
      window.sessionStorage.setItem(SOFTWARE_HINT_KEY, "1");
    } catch {
      // Dismissal is best-effort.
    }
  };
  const easedSteps =
    governed && governor.level > 0
      ? governor.steps.slice(0, governor.level).map((step) => GOVERNOR_STEP_LABELS[step])
      : [];

  useEffect(
    () => () => {
      if (capturedTimer.current) window.clearTimeout(capturedTimer.current);
    },
    []
  );

  /* Stable so the memoized view chips skip the per-frame renders of a drag. */
  const toggleShowcase = useCallback(() => {
    if (autoRotate) {
      updateSettings?.({ autoRotate: false });
      return;
    }
    sendCanvasCommand?.({ type: "camera", view: "showcase" });
  }, [autoRotate, sendCanvasCommand, updateSettings]);
  const selectView = useCallback(
    (view: StudioCameraView) => sendCanvasCommand?.({ type: "camera", view }),
    [sendCanvasCommand]
  );
  const fitView = useCallback(() => sendCanvasCommand?.({ type: "fit" }), [sendCanvasCommand]);
  const focusView = useCallback(
    () => sendCanvasCommand?.({ type: "focus_selection" }),
    [sendCanvasCommand]
  );

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
      ref={containerRef}
      className="@container relative h-full min-h-[420px] overflow-hidden bg-[oklch(0.13_0.006_70)]"
      aria-label={`Interactive 3D view of ${design.room.name}`}
    >
      <Canvas
        key={canvasKey}
        frameloop={warmKey === canvasKey ? "demand" : "never"}
        dpr={dpr}
        shadows={preset.shadows ? CANVAS_SHADOWS : CANVAS_NO_SHADOWS}
        camera={CANVAS_CAMERA}
        gl={glOptions}
        className="touch-none"
        onPointerMissed={() => onSelect(null)}
      >
        <RoomScene
          design={design}
          selection={selection}
          onSelect={onSelect}
          darkTheme={darkTheme}
        />
        <RenderPipelineBridge />
        <SnapshotBridge
          onRegister={handleRegister}
          shadowMapSize={preset.snapshotShadowMapSize}
        />
        <ShaderWarmup onDone={handleWarm} />
        <FirstFrameSignal onReady={handleReady} />
      </Canvas>

      <LoadingVeil visible={!ready} />

      {/* Scene summary / empty-state callout */}
      <div
        className={cn(
          "pointer-events-none absolute top-3 left-3 z-10 max-w-[min(19rem,calc(100%-12rem))]",
          presenting && "hidden"
        )}
      >
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
        {deviceProfile.software && !softwareHintDismissed ? (
          <div
            role="note"
            className="pointer-events-auto mt-2 flex gap-2.5 rounded-2xl border border-primary/25 bg-background/80 p-3 shadow-lg backdrop-blur-md"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Cpu className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-primary uppercase">
                Smoother 3D
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                Your browser is drawing 3D without the graphics card. Turn on hardware
                acceleration in its settings for a fluid preview.
              </p>
            </div>
            <StudioTip label="Dismiss">
              <button
                type="button"
                onClick={dismissSoftwareHint}
                className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                aria-label="Dismiss hardware acceleration tip"
              >
                <X className="size-3.5" />
              </button>
            </StudioTip>
          </div>
        ) : null}
      </div>

      {/* Top-right actions */}
      <div className="absolute top-3 right-3 z-20 flex items-start gap-1.5">
        <StudioTip label={captured ? "Snapshot saved" : "Download a PNG snapshot"} side="bottom">
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
        </StudioTip>
        <StudioTip label={panelOpen ? "Hide scene settings" : "Scene settings"} side="bottom">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="studio-3d-scene-panel"
            aria-label="Scene settings"
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
        </StudioTip>
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
            <StudioTip label="Close">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                aria-label="Close scene settings"
              >
                <X className="size-4" />
              </button>
            </StudioTip>
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
                      badge={option.value === recommendedQuality ? "Auto" : undefined}
                      badgeTitle={
                        option.value === recommendedQuality
                          ? "Suggested for this device"
                          : undefined
                      }
                    />
                  ))}
                </div>
                {easedSteps.length > 0 ? (
                  <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Gauge className="size-3.5" aria-hidden />
                    </span>
                    <p className="min-w-0 flex-1 text-[0.65rem] leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground">Adaptive smoothing</span>{" "}
                      eased {easedSteps.join(", ")} to keep motion fluid.
                    </p>
                    <button
                      type="button"
                      onClick={resetStudioGovernorLevel}
                      className="shrink-0 rounded-lg border border-primary/30 px-2 py-1 text-[0.62rem] font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                    >
                      Restore
                    </button>
                  </div>
                ) : null}
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

      {showsWalkHud(cameraMode) && ready ? <StudioWalkHud /> : null}

      {sendCanvasCommand ? (
        <StudioViewChips
          mode={cameraMode}
          spinning={autoRotate}
          hasSelection={hasSelection}
          onSelect={selectView}
          onToggleShowcase={toggleShowcase}
          onFit={fitView}
          onFocus={focusView}
        />
      ) : null}
    </div>
  );
}

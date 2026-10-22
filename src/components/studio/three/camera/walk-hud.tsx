"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";
import {
  Activity,
  Armchair,
  ArrowUpFromLine,
  Bed,
  Check,
  Crosshair,
  Eye,
  Gauge,
  Minus,
  MousePointer2,
  PersonStanding,
  Plus,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { StudioTip } from "../../studio-tip";
import {
  MOUSE_LOOK_SPEED_DEFAULT,
  MOUSE_LOOK_SPEED_MAX,
  MOUSE_LOOK_SPEED_MIN,
  setMouseLookSpeed,
  useMouseLookSpeed,
} from "./mouse-look-speed";
import {
  sendCameraRigCommand,
  setStudioHeadBob,
  setStudioMouseLook,
  useStudioCameraRig,
  type StudioCameraMode,
} from "./camera-view-store";

const EYE_STEP = 0.5;

function formatFeet(feet: number) {
  const inches = Math.round(feet * 12);
  const whole = Math.floor(inches / 12);
  const rest = inches % 12;
  return rest ? `${whole}′${rest}″` : `${whole}′`;
}

function PresetTile({
  icon: Icon,
  label,
  value,
  active,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-1 rounded-xl border p-2 text-left transition-all duration-200 motion-reduce:transition-none",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        active
          ? "border-primary/50 bg-primary/12 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
          : "border-border/40 bg-card/30 hover:border-primary/30 hover:bg-card/60"
      )}
    >
      <span className="flex w-full items-center justify-between">
        <Icon className={cn("size-3.5", active ? "text-primary" : "text-primary/75")} aria-hidden />
        <span
          aria-hidden
          className={cn(
            "flex size-3.5 items-center justify-center rounded-full border",
            active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60 bg-background/50 text-transparent"
          )}
        >
          <Check className="size-2" strokeWidth={3} />
        </span>
      </span>
      <span className="text-[0.65rem] leading-tight font-medium text-foreground">{label}</span>
      <span className="text-[0.6rem] leading-none text-muted-foreground">{value}</span>
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  active,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={cn(
        "flex w-full flex-1 items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[0.65rem] font-medium whitespace-nowrap transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        active
          ? "border-primary/50 bg-primary/12 text-foreground"
          : "border-border/40 bg-card/30 text-foreground/70 hover:border-primary/30 hover:text-foreground"
      )}
    >
      <Icon className="size-3.5 text-primary" aria-hidden />
      {label}
      <span
        aria-hidden
        className={cn(
          "ml-auto h-3 w-5 rounded-full p-px transition-colors",
          active ? "bg-primary" : "bg-border/60"
        )}
      >
        <span
          className={cn(
            "block size-2.5 rounded-full bg-background transition-transform motion-reduce:transition-none",
            active && "translate-x-2"
          )}
        />
      </span>
    </button>
  );
}

const LOOK_SPEED_STEP = 0.05;

function LookSpeedRow() {
  const speed = useMouseLookSpeed();
  const percent =
    ((speed - MOUSE_LOOK_SPEED_MIN) / (MOUSE_LOOK_SPEED_MAX - MOUSE_LOOK_SPEED_MIN)) * 100;
  const isDefault = Math.abs(speed - MOUSE_LOOK_SPEED_DEFAULT) < LOOK_SPEED_STEP / 2;
  return (
    <div className="rounded-xl border border-border/40 bg-card/30 px-2 py-1.5">
      <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-medium text-foreground/80">
        <Gauge className="size-3.5 text-primary" aria-hidden />
        Look speed
        <span className="ml-auto font-mono text-[0.6rem] text-muted-foreground tabular-nums">
          {speed.toFixed(2)}×
        </span>
        <StudioTip label="Reset look speed" side="right">
          <button
            type="button"
            aria-label="Reset look speed"
            disabled={isDefault}
            onClick={() => setMouseLookSpeed(MOUSE_LOOK_SPEED_DEFAULT)}
            className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-30"
          >
            <RotateCcw className="size-3" aria-hidden />
          </button>
        </StudioTip>
      </div>
      <StudioTip label="How far the view turns per mouse movement" side="right">
        <input
          type="range"
          aria-label="Mouse look speed"
          aria-valuetext={`${speed.toFixed(2)} times`}
          min={MOUSE_LOOK_SPEED_MIN}
          max={MOUSE_LOOK_SPEED_MAX}
          step={LOOK_SPEED_STEP}
          value={speed}
          onChange={(event) => setMouseLookSpeed(Number(event.target.value))}
          style={{
            background: `linear-gradient(to right, var(--primary) ${percent}%, color-mix(in oklch, var(--border) 70%, transparent) ${percent}%)`,
          }}
          className="block h-1.5 w-full cursor-pointer appearance-none rounded-full accent-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
        />
      </StudioTip>
    </div>
  );
}

/** Camera modes that show the eye-height / look HUD. */
export function showsWalkHud(mode: StudioCameraMode) {
  return mode === "walk" || mode === "ceiling";
}

function MouseLookRow({
  walk,
  mouseLook,
  locked,
}: {
  walk: boolean;
  mouseLook: boolean;
  locked: boolean;
}) {
  const offered = walk || mouseLook;
  return (
    <div className="space-y-1">
      {walk ? null : (
        <ToggleRow
          icon={MousePointer2}
          label="Mouse look"
          active={mouseLook}
          onToggle={() => setStudioMouseLook(!mouseLook)}
        />
      )}
      {offered ? <LookSpeedRow /> : null}
      {offered ? (
        <p
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[0.6rem] leading-tight",
            locked
              ? "border-primary/45 bg-primary/10 text-foreground"
              : "border-border/40 bg-card/20 text-muted-foreground"
          )}
          aria-live="polite"
        >
          <Crosshair className="size-3.5 shrink-0 text-primary" aria-hidden />
          {locked
            ? "Mouse look on · click selects at the crosshair · Esc to release"
            : "Click to look with the mouse · Esc to release"}
        </p>
      ) : null}
    </div>
  );
}

/** Walk / Ceiling view eye-height and look controls, floating over the 3D canvas. */
export const StudioWalkHud = memo(function StudioWalkHud() {
  const rig = useStudioCameraRig();
  const walk = rig.mode === "walk";
  const top = rig.maxEyeHeight;
  const presets = [
    { icon: Armchair, label: "Seated", feet: 4 },
    { icon: PersonStanding, label: "Standing", feet: 5.5 },
    { icon: ArrowUpFromLine, label: "Ceiling", feet: Math.min(8, top) },
  ];
  const setEye = (feet: number) => sendCameraRigCommand({ type: "eye", feet });

  return (
    <section
      aria-label="Walk controls"
      className="absolute top-[4.25rem] left-3 z-20 w-[15rem] overflow-hidden rounded-2xl border border-border/40 bg-background/75 shadow-2xl backdrop-blur-xl"
    >
      <header className="flex items-center gap-2 border-b border-border/40 bg-[linear-gradient(135deg,oklch(0.76_0.15_88/12%),transparent_70%)] px-2.5 py-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Eye className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.55rem] font-semibold tracking-[0.2em] text-primary uppercase">
            Eye height
          </p>
          <p className="font-heading text-sm leading-tight text-foreground" aria-live="polite">
            Eye {formatFeet(rig.eyeHeight)}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <StudioTip label="Lower eye height" shortcut="Q" side="bottom">
            <button
              type="button"
              aria-label="Lower eye height (Q)"
              onClick={() => sendCameraRigCommand({ type: "eye_step", feet: -EYE_STEP })}
              className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-card/40 text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
          </StudioTip>
          <StudioTip label="Raise eye height" shortcut="E" side="bottom">
            <button
              type="button"
              aria-label="Raise eye height (E)"
              onClick={() => sendCameraRigCommand({ type: "eye_step", feet: EYE_STEP })}
              className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-card/40 text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </StudioTip>
        </div>
      </header>
      <div className="space-y-1.5 p-2">
        <div role="radiogroup" aria-label="Eye height presets" className="grid grid-cols-3 gap-1">
          {presets.map((preset) => (
            <PresetTile
              key={preset.label}
              icon={preset.icon}
              label={preset.label}
              value={formatFeet(preset.feet)}
              active={Math.abs(rig.eyeHeight - preset.feet) < 1 / 24}
              onSelect={() => setEye(preset.feet)}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <ToggleRow
            icon={ArrowUpFromLine}
            label="Look up"
            active={rig.lookingUp}
            onToggle={() => sendCameraRigCommand({ type: "look_up", up: !rig.lookingUp })}
          />
          {walk ? (
            <ToggleRow
              icon={Activity}
              label="Bob"
              active={rig.headBob}
              onToggle={() => setStudioHeadBob(!rig.headBob)}
            />
          ) : null}
        </div>
        <ToggleRow
          icon={Bed}
          label="Lie back · gaze up"
          active={rig.lyingBack}
          onToggle={() => sendCameraRigCommand({ type: "lie_back", on: !rig.lyingBack })}
        />
        <MouseLookRow walk={walk} mouseLook={rig.mouseLook} locked={rig.pointerLocked} />
      </div>
    </section>
  );
});

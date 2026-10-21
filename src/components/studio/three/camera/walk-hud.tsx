"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  Armchair,
  ArrowUpFromLine,
  Check,
  Eye,
  Minus,
  PersonStanding,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  sendCameraRigCommand,
  setStudioHeadBob,
  useStudioCameraRig,
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
        "flex flex-1 items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[0.65rem] font-medium whitespace-nowrap transition-colors",
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

/** Walk-mode eye-height and look controls, floating over the 3D canvas. */
export function StudioWalkHud() {
  const rig = useStudioCameraRig();
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
          <button
            type="button"
            aria-label="Lower eye height (Q)"
            title="Lower (Q)"
            onClick={() => sendCameraRigCommand({ type: "eye_step", feet: -EYE_STEP })}
            className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-card/40 text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Raise eye height (E)"
            title="Raise (E)"
            onClick={() => sendCameraRigCommand({ type: "eye_step", feet: EYE_STEP })}
            className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-card/40 text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
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
          <ToggleRow
            icon={Activity}
            label="Bob"
            active={rig.headBob}
            onToggle={() => setStudioHeadBob(!rig.headBob)}
          />
        </div>
      </div>
    </section>
  );
}

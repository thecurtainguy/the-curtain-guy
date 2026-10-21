"use client";

import { normalizeRotation } from "@/lib/studio-commands";
import { cn } from "@/lib/utils";
import { useId, useRef, useState } from "react";
import { FieldLabel, SliderField } from "./inspector-ui";

const QUICK_TURNS = [
  { label: "−90°", delta: -90 },
  { label: "−15°", delta: -15 },
  { label: "0°", delta: null },
  { label: "+15°", delta: 15 },
  { label: "+90°", delta: 90 },
] as const;

const DIAL_SIZE = 88;
const TICKS = Array.from({ length: 24 }, (_, index) => index * 15);

/**
 * Rotation dial (drag, 0° = up, clockwise like the plan), numeric entry,
 * slider and quick turns. Dragging runs as one undoable gesture.
 */
export function RotationControl({
  value,
  snapStep,
  disabled,
  onChange,
  onGestureStart,
  onGesturePreview,
  onGestureEnd,
}: {
  value: number;
  /** Degrees to snap to while dragging; 0 = free. Shift always frees. */
  snapStep: number;
  disabled?: boolean;
  onChange: (degrees: number) => void;
  onGestureStart: () => void;
  onGesturePreview: (degrees: number) => void;
  onGestureEnd: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const dragging = useRef(false);
  const angle = normalizeRotation(value);
  const radians = (angle * Math.PI) / 180;
  const center = DIAL_SIZE / 2;
  const knobRadius = center - 12;
  const knob = {
    x: center + Math.sin(radians) * knobRadius,
    y: center - Math.cos(radians) * knobRadius,
  };

  function angleFromPointer(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    let degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (snapStep > 0 && !event.shiftKey) {
      degrees = Math.round(degrees / snapStep) * snapStep;
    }
    return normalizeRotation(degrees);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <svg
          width={DIAL_SIZE}
          height={DIAL_SIZE}
          viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="Rotation dial"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(angle)}
          aria-disabled={disabled || undefined}
          className={cn(
            "shrink-0 touch-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
            disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing"
          )}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragging.current = true;
            onGestureStart();
            onGesturePreview(angleFromPointer(event));
          }}
          onPointerMove={(event) => {
            if (!dragging.current) return;
            onGesturePreview(angleFromPointer(event));
          }}
          onPointerUp={(event) => {
            if (!dragging.current) return;
            dragging.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            onGestureEnd();
          }}
          onPointerCancel={() => {
            if (!dragging.current) return;
            dragging.current = false;
            onGestureEnd();
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            const step = event.shiftKey ? 15 : 1;
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              event.stopPropagation();
              onChange(normalizeRotation(angle + step));
            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              event.stopPropagation();
              onChange(normalizeRotation(angle - step));
            }
          }}
        >
          <defs>
            <radialGradient id={`${id}-face`} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--card)" stopOpacity="0.4" />
            </radialGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={center - 2}
            fill={`url(#${id}-face)`}
            stroke="var(--border)"
            strokeOpacity="0.6"
          />
          {TICKS.map((tick) => {
            const major = tick % 90 === 0;
            const r1 = center - 4;
            const r2 = center - (major ? 10 : 7);
            const t = (tick * Math.PI) / 180;
            return (
              <line
                key={tick}
                x1={center + Math.sin(t) * r1}
                y1={center - Math.cos(t) * r1}
                x2={center + Math.sin(t) * r2}
                y2={center - Math.cos(t) * r2}
                stroke={major ? "var(--primary)" : "var(--muted-foreground)"}
                strokeOpacity={major ? 0.9 : 0.45}
                strokeWidth={major ? 1.6 : 1}
                strokeLinecap="round"
              />
            );
          })}
          <path
            d={describeArc(center, center, center - 16, 0, angle)}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.35"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1={center}
            y1={center}
            x2={knob.x}
            y2={knob.y}
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={center} cy={center} r="3" fill="var(--primary)" />
          <circle
            cx={knob.x}
            cy={knob.y}
            r="5.5"
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth="2"
          />
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <FieldLabel htmlFor={`${id}-deg`}>Angle</FieldLabel>
            <div className="flex h-8 items-center rounded-xl border border-border/50 bg-background/50 pr-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              <input
                id={`${id}-deg`}
                type="number"
                min={0}
                max={359}
                step={1}
                disabled={disabled}
                value={draft ?? Math.round(angle * 100) / 100}
                onBlur={() => setDraft(null)}
                onChange={(event) => {
                  setDraft(event.target.value);
                  const parsed = Number(event.target.value);
                  if (event.target.value !== "" && Number.isFinite(parsed)) {
                    onChange(normalizeRotation(parsed));
                  }
                }}
                className="input-no-spin h-full min-w-0 flex-1 bg-transparent px-2.5 font-heading text-base tabular-nums outline-none"
              />
              <span className="text-xs text-primary">°</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {QUICK_TURNS.map((turn) => (
              <button
                key={turn.label}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    turn.delta === null ? 0 : normalizeRotation(angle + turn.delta)
                  )
                }
                className={cn(
                  "h-7 rounded-lg border text-[0.6rem] font-semibold tabular-nums transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-40",
                  turn.delta === null
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border/40 bg-card/35 text-muted-foreground hover:border-primary/30 hover:text-primary"
                )}
                aria-label={
                  turn.delta === null ? "Reset rotation" : `Rotate ${turn.label}`
                }
              >
                {turn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <SliderField
        label="Fine rotation"
        value={Math.round(angle)}
        min={0}
        max={359}
        step={1}
        disabled={disabled}
        format={(degrees) => `${degrees}°`}
        onChange={onChange}
      />
    </div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number
): string {
  if (end <= 0.5) return "";
  const sweep = Math.min(end, 359.9);
  const toPoint = (degrees: number) => {
    const t = (degrees * Math.PI) / 180;
    return { x: cx + Math.sin(t) * radius, y: cy - Math.cos(t) * radius };
  };
  const a = toPoint(start);
  const b = toPoint(sweep);
  const large = sweep - start > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

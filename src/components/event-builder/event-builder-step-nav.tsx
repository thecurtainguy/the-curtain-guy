"use client";

import {
  CalendarHeart,
  Check,
  ClipboardCheck,
  CloudSun,
  Palette,
  PanelsTopLeft,
  Square,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { cn } from "@/lib/utils";

export const EVENT_BUILDER_STEPS = ["event", "room", "setups", "ceiling", "look", "review"] as const;

export type EventBuilderStepId = (typeof EVENT_BUILDER_STEPS)[number];

const STEP_ICONS: Record<EventBuilderStepId, LucideIcon> = {
  event: CalendarHeart,
  room: Square,
  setups: PanelsTopLeft,
  ceiling: CloudSun,
  look: Palette,
  review: ClipboardCheck,
};

type EventBuilderStepNavProps = {
  currentIndex: number;
  onStepSelect: (index: number) => void;
};

/** Six-step rail with a gold progress bar; every step is reachable. */
export function EventBuilderStepNav({ currentIndex, onStepSelect }: EventBuilderStepNavProps) {
  const t = useTranslations("eventBuilder");
  const copy = useWizardCopy();
  const total = EVENT_BUILDER_STEPS.length;
  const percent = Math.round(((currentIndex + 1) / total) * 100);
  const current = EVENT_BUILDER_STEPS[currentIndex] ?? EVENT_BUILDER_STEPS[0];

  return (
    <nav aria-label={t("flow.progressAria")} className="space-y-3 pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          <span className="text-primary">{copy.flow.stepOf(currentIndex + 1, total)}</span>
          <span className="sm:hidden"> · {copy.steps[current].label}</span>
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground">{copy.flow.progressLabel(percent)}</p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted/50"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={copy.flow.progressLabel(percent)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-amber-200 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {EVENT_BUILDER_STEPS.map((stepId, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          const Icon = STEP_ICONS[stepId];
          const step = copy.steps[stepId];
          return (
            <li key={stepId} className="min-w-0">
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${index + 1}. ${step.label}`}
                onClick={() => onStepSelect(index)}
                className={cn(
                  "group flex w-full flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition-all duration-200 motion-reduce:transition-none sm:flex-row sm:items-start sm:gap-2.5 sm:p-3 sm:text-left",
                  "hover:border-primary/30 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  isCurrent &&
                    "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
                  isComplete && !isCurrent && "border-primary/25 bg-primary/5",
                  !isCurrent && !isComplete && "border-border/40 bg-card/30"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isCurrent && "bg-primary text-primary-foreground",
                    isComplete && !isCurrent && "bg-primary/20 text-primary",
                    !isCurrent && !isComplete && "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  ) : (
                    <Icon className="size-4" aria-hidden />
                  )}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-xs font-medium text-foreground lg:text-sm">
                    {step.label}
                  </span>
                  <span className="hidden truncate text-[11px] text-muted-foreground lg:block">
                    {step.desc}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

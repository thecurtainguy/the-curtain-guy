"use client";

import {
  Check,
  ClipboardCheck,
  LayoutGrid,
  Palette,
  PanelsTopLeft,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const EVENT_BUILDER_STEPS = ["event", "catalog", "look", "review"] as const;

export type EventBuilderStepId = (typeof EVENT_BUILDER_STEPS)[number];

const STEP_ICONS: Record<EventBuilderStepId, LucideIcon> = {
  event: LayoutGrid,
  catalog: PanelsTopLeft,
  look: Palette,
  review: ClipboardCheck,
};

type EventBuilderStepNavProps = {
  currentIndex: number;
  onStepSelect: (index: number) => void;
};

export function EventBuilderStepNav({
  currentIndex,
  onStepSelect,
}: EventBuilderStepNavProps) {
  const t = useTranslations("eventBuilder");

  return (
    <ol
      className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4"
      aria-label={t("flow.progressAria")}
    >
      {EVENT_BUILDER_STEPS.map((stepId, index) => {
        const isCurrent = index === currentIndex;
        const isComplete = index < currentIndex;
        const isClickable = index <= currentIndex;
        const Icon = STEP_ICONS[stepId];
        const stepNumber = index + 1;

        return (
          <li key={stepId} className="min-w-0">
            <button
              type="button"
              disabled={!isClickable}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => {
                if (isClickable) onStepSelect(index);
              }}
              className={cn(
                "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                isClickable &&
                  "hover:border-primary/30 hover:bg-card/60 hover:-translate-y-px active:scale-[0.99]",
                !isClickable && "cursor-not-allowed opacity-55",
                isCurrent &&
                  "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
                isComplete &&
                  !isCurrent &&
                  "border-primary/30 bg-primary/5",
                !isCurrent &&
                  !isComplete &&
                  "border-border/40 bg-card/35"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors",
                  isCurrent && "bg-primary text-primary-foreground",
                  isComplete && !isCurrent && "bg-primary/20 text-primary",
                  !isCurrent &&
                    !isComplete &&
                    "bg-muted/50 text-muted-foreground"
                )}
              >
                {isComplete && !isCurrent ? (
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                ) : (
                  stepNumber
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      isCurrent || isComplete
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground">
                    {t(`steps.${stepId}`)}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {t(`steps.${stepId}Desc`)}
                </span>
              </span>

              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isComplete &&
                    !isCurrent &&
                    "border-primary bg-primary text-primary-foreground",
                  !isCurrent &&
                    !isComplete &&
                    "border-border/60 bg-background/50 text-transparent"
                )}
                aria-hidden
              >
                {isComplete || isCurrent ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

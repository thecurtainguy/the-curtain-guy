"use client";

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioTip } from "@/components/studio/studio-tip";

type LeadNudgeCardProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
};

/** Non-blocking floating prompt; the canvas stays fully usable behind it. */
export function LeadNudgeCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: LeadNudgeCardProps) {
  return (
    <section
      aria-label={title}
      className="fixed right-3 bottom-3 z-50 w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-3xl border border-primary/25 bg-card/90 shadow-2xl shadow-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 motion-reduce:animate-none sm:right-5 sm:bottom-5"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_60%)]"
        aria-hidden
      />
      <div className="relative flex gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            {eyebrow}
          </p>
          <p className="font-heading text-base leading-snug">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" size="sm" onClick={onPrimary}>
              {primaryLabel}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          </div>
        </div>
        <StudioTip label="Dismiss" side="left">
          <button
            type="button"
            onClick={onSecondary}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </StudioTip>
      </div>
    </section>
  );
}

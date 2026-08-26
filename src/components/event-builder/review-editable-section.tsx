"use client";

import { PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ReviewEditableSectionProps = {
  title: string;
  editLabel: string;
  stepIndex: number;
  onEditStep: (stepIndex: number) => void;
  className?: string;
  children: React.ReactNode;
};

export function ReviewEditableSection({
  title,
  editLabel,
  stepIndex,
  onEditStep,
  className,
  children,
}: ReviewEditableSectionProps) {
  const t = useTranslations("eventBuilder");

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        <button
          type="button"
          onClick={() => onEditStep(stepIndex)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors",
            "hover:border-primary/35 hover:bg-primary/10 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          )}
          aria-label={editLabel}
        >
          <PencilLine className="size-3.5 text-primary" aria-hidden />
          {t("step4.edit")}
        </button>
      </div>
      {children}
    </section>
  );
}

type ReviewStatTileProps = {
  label: string;
  value: string;
};

export function ReviewStatTile({ label, value }: ReviewStatTileProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/30 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-lg font-semibold">{value}</p>
    </div>
  );
}

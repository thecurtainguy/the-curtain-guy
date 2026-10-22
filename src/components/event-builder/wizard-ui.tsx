"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StepHeaderProps = {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  image?: { image?: string; alt?: string };
  children?: ReactNode;
};

/** Branded step header: gold icon badge, eyebrow, headline, optional photo panel. */
export function WizardStepHeader({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  image,
  children,
}: StepHeaderProps) {
  const photo = image?.image;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_12%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_55%)]">
      <div className={cn("grid", photo && "sm:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]")}>
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          </div>
          <h2
            id={id}
            tabIndex={-1}
            className="mt-4 font-heading text-2xl font-semibold outline-none sm:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
          ) : null}
          {children}
        </div>
        {photo ? (
          <div className="relative hidden min-h-40 sm:block">
            <Image
              src={photo}
              alt={image?.alt ?? ""}
              fill
              sizes="(min-width: 1024px) 320px, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type FieldSectionProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  labelId?: string;
};

/** Card-wrapped group of related inputs with a gold icon label. */
export function WizardSection({
  icon: Icon,
  label,
  hint,
  action,
  children,
  className,
  labelId,
}: FieldSectionProps) {
  return (
    <section
      className={cn("rounded-3xl border border-border/40 bg-card/25 p-4 sm:p-6", className)}
      aria-labelledby={labelId}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 id={labelId} className="font-heading text-base font-semibold">
              {label}
            </h3>
            {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-background/35 p-3 sm:p-4",
        tone === "warning" ? "border-amber-500/40" : "border-border/40"
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 text-primary" aria-hidden />
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-1.5 font-heading text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

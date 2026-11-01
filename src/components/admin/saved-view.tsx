"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the dense read-only "saved" view shown on detail pages
 * when they are not in edit mode. Empty values should be hidden by the caller.
 */

export function SavedCard({
  icon: Icon,
  eyebrow,
  title,
  aside,
  children,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/40 bg-card/25", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h2 className="font-heading text-lg font-semibold leading-tight">{title}</h2>
          </div>
        </div>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function SavedFact({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-border/40 bg-background/30 px-3 py-2.5", className)}>
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {Icon ? <Icon className="size-3 text-primary" /> : null}
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

export function SavedChip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "gold" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "gold" && "border-primary/30 bg-primary/10 text-primary",
        tone === "amber" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "muted" && "border-border/50 bg-background/40 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function SavedShowMore({
  expanded,
  onClick,
  more,
}: {
  expanded: boolean;
  onClick: () => void;
  more: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {expanded ? "Show less" : more}
      <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
    </button>
  );
}

/** Long text clamped to 3 lines with a "Show all" toggle. */
export function SavedClampedText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 220 || text.split("\n").length > 3;
  return (
    <div>
      <p
        className={cn(
          "whitespace-pre-line text-sm leading-relaxed",
          long && !expanded && "line-clamp-3",
          className
        )}
      >
        {text}
      </p>
      {long ? (
        <SavedShowMore expanded={expanded} onClick={() => setExpanded((v) => !v)} more="Show all" />
      ) : null}
    </div>
  );
}

/** Numbered list showing the first few items on one line each until expanded. */
export function SavedNumberedList({
  items,
  preview = 4,
  noun = "terms",
}: {
  items: string[];
  preview?: number;
  noun?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, preview);
  return (
    <div>
      <ol className="space-y-1.5">
        {shown.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-2.5">
            <span className="w-5 shrink-0 font-heading text-xs font-semibold tabular-nums text-primary">
              {index + 1}.
            </span>
            <span
              className={cn(
                "min-w-0 text-sm leading-relaxed text-muted-foreground",
                !expanded && "line-clamp-1"
              )}
              title={expanded ? undefined : item}
            >
              {item}
            </span>
          </li>
        ))}
      </ol>
      <SavedShowMore
        expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        more={items.length > preview ? `Show all ${items.length} ${noun}` : "Show full text"}
      />
    </div>
  );
}

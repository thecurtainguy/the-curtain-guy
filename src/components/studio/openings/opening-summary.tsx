"use client";

import { STUDIO_OPENING_TYPES, type StudioDesignJson, type StudioOpeningType } from "@/data/studio";
import { cn } from "@/lib/utils";
import { STUDIO_OPENING_META } from "../inspector/studio-item-meta";
import { StudioTip } from "../studio-tip";

const PLURALS: Record<StudioOpeningType, [string, string]> = {
  door: ["door", "doors"],
  entrance: ["entrance", "entrances"],
  window: ["window", "windows"],
};

export function formatOpeningCount(type: StudioOpeningType, count: number): string {
  return `${count} ${PLURALS[type][count === 1 ? 0 : 1]}`;
}

/**
 * Stat chips counting placed openings per type. With `onSelectIds`, a chip
 * selects every unlocked, visible opening of that type.
 */
export function OpeningSummary({
  design,
  onSelectIds,
  className,
}: {
  design: StudioDesignJson;
  onSelectIds?: (ids: string[]) => void;
  className?: string;
}) {
  const byType = STUDIO_OPENING_TYPES.map((type) => {
    const items = design.openings.filter((opening) => opening.type === type);
    return {
      type,
      count: items.length,
      selectable: items
        .filter((opening) => !opening.locked && !opening.hidden)
        .map((opening) => opening.id),
    };
  });

  if (design.openings.length === 0) {
    return (
      <p
        className={cn(
          "rounded-xl border border-dashed border-primary/25 bg-primary/5 px-2.5 py-2 text-[0.64rem] leading-relaxed text-muted-foreground",
          className
        )}
      >
        <span className="font-medium text-foreground">No openings yet.</span>{" "}
        Mark doors and windows so drapes leave guest paths and views clear.
      </p>
    );
  }

  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)} role="group" aria-label="Openings placed">
      {byType.map(({ type, count, selectable }) => {
        const meta = STUDIO_OPENING_META[type];
        const Icon = meta.icon;
        const text = formatOpeningCount(type, count);
        const interactive = Boolean(onSelectIds) && selectable.length > 0;
        const body = (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md",
                  count > 0 ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"
                )}
              >
                <Icon className="size-3" aria-hidden />
              </span>
              <span className="font-heading text-sm leading-none text-foreground tabular-nums">
                {count}
              </span>
            </span>
            <span className="block w-full truncate text-[0.58rem] text-muted-foreground">
              {PLURALS[type][count === 1 ? 0 : 1]}
            </span>
          </>
        );
        const tileClass = cn(
          "flex min-w-0 flex-col items-start gap-1 rounded-xl border border-border/40 bg-background/35 p-1.5 text-left",
          count === 0 && "opacity-60"
        );
        if (!interactive) {
          return (
            <div key={type} className={tileClass}>
              {body}
            </div>
          );
        }
        return (
          <StudioTip key={type} label={`Select ${count === 1 ? "the" : "all"} ${text.replace(/^\d+ /, "")}`}>
            <button
              type="button"
              onClick={() => onSelectIds?.(selectable)}
              aria-label={`Select ${text}`}
              className={cn(
                tileClass,
                "transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              )}
            >
              {body}
            </button>
          </StudioTip>
        );
      })}
    </div>
  );
}

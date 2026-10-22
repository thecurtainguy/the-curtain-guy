"use client";

import { Armchair, Map as MapIcon, Ruler, X } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { getEventCatalogItem } from "@/data/event-builder/catalog";
import { SEATED_OBJECT_TYPES, type StudioDesignJson } from "@/data/studio";
import { calculateDrapeLength, calculateRoomAreaSquareFeet, inchesToFeetLabel } from "@/lib/studio-geometry";
import { EventPlanThumbnail } from "@/components/event-builder/event-plan-thumbnail";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { cn } from "@/lib/utils";

const SEATED = new Set<string>(SEATED_OBJECT_TYPES);

/** Chairs in the plan: `seatingCount` of seated objects plus loose chairs. */
export function countDesignSeats(design: StudioDesignJson): number {
  let seats = 0;
  for (const object of design.objects) {
    if (object.hidden) continue;
    if (object.type === "chair") seats += 1;
    else if (SEATED.has(object.type)) seats += object.seatingCount ?? 0;
  }
  return seats;
}

type LivePlanSidebarProps = {
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  frontWall: number;
  className?: string;
  onRemoveSelection?: (id: string) => void;
  onClearAll?: () => void;
};

/** Sticky preview: live 2D plan, key numbers and removable setup tags. */
export function LivePlanSidebar({
  brief,
  design,
  frontWall,
  className,
  onRemoveSelection,
  onClearAll,
}: LivePlanSidebarProps) {
  const copy = useWizardCopy();
  const catalog = useWizardCatalog();
  const selections = brief.catalogSelections.filter((id) => {
    const item = getEventCatalogItem(id);
    return item && !item.hidden;
  });
  const seats = countDesignSeats(design);
  const area = Math.round(calculateRoomAreaSquareFeet(design.room.floor));

  return (
    <aside
      className={cn("overflow-hidden rounded-3xl border border-border/40 bg-card/30", className)}
      aria-label={copy.review.plan}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-[radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <MapIcon className="size-3.5" aria-hidden />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {copy.review.plan}
          </p>
        </div>
        <span className="rounded-md border border-border/40 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {brief.room.widthFt}′ × {brief.room.lengthFt}′
        </span>
      </div>

      <div className="aspect-square bg-background/40 p-3">
        <EventPlanThumbnail
          design={design}
          frontWall={frontWall}
          frontLabel={copy.walls.front.toUpperCase()}
          ariaLabel={copy.review.plan}
        />
      </div>

      <div className="grid grid-cols-3 gap-px border-y border-border/30 bg-border/30 text-center">
        {[
          { icon: MapIcon, value: `${area.toLocaleString()} ft²`, label: copy.review.area },
          { icon: Ruler, value: inchesToFeetLabel(calculateDrapeLength(design)), label: copy.review.drape },
          { icon: Armchair, value: String(seats), label: copy.review.seats },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-card/60 px-2 py-2.5">
            <Icon className="mx-auto size-3.5 text-primary" aria-hidden />
            <p className="mt-1 truncate font-heading text-sm font-semibold tabular-nums">{value}</p>
            <p className="truncate text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{copy.setups.selected(selections.length)}</p>
          {selections.length > 0 && onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {copy.setups.clearAll}
            </button>
          ) : null}
        </div>
        {selections.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">{copy.setups.empty}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {selections.map((id) => (
              <li key={id}>
                {onRemoveSelection ? (
                  <button
                    type="button"
                    onClick={() => onRemoveSelection(id)}
                    aria-label={copy.room.remove(catalog.getItemLabel(id))}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-primary/15"
                  >
                    {catalog.getItemLabel(id)}
                    <X className="size-3 text-muted-foreground" aria-hidden />
                  </button>
                ) : (
                  <span className="inline-flex rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-[11px] font-medium">
                    {catalog.getItemLabel(id)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import {
  STUDIO_MAX_OBJECTS,
  STUDIO_OBJECT_CATEGORIES,
  STUDIO_OBJECT_OPTIONS,
  createStudioObject,
  type StudioDesignJson,
  type StudioObjectCategory,
  type StudioObjectOption,
} from "@/data/studio";
import { cn } from "@/lib/utils";
import type { StudioSelection } from "../studio-types";
import { STUDIO_CATEGORY_ICONS, STUDIO_OBJECT_ICONS } from "./studio-library-icons";
import {
  findFreeStudioSpot,
  formatStudioFootprint,
  startStudioObjectDrag,
} from "./studio-library-placement";
import {
  LibraryCard,
  LibrarySectionHeading,
  LibraryTile,
  matchesLibraryQuery,
} from "./studio-library-ui";

const FURNITURE_CATEGORIES = STUDIO_OBJECT_CATEGORIES.filter(
  (category) => category.value !== "drapery"
);

function filterOptions(query: string, category: StudioObjectCategory | "all") {
  return STUDIO_OBJECT_OPTIONS.filter((option) => {
    if (option.category === "drapery") return false;
    if (!query.trim() && category !== "all" && option.category !== category) {
      return false;
    }
    const categoryLabel =
      STUDIO_OBJECT_CATEGORIES.find((item) => item.value === option.category)?.label ?? "";
    return matchesLibraryQuery(
      query,
      option.label,
      option.description,
      option.type,
      categoryLabel
    );
  });
}

export function countFurnitureMatches(query: string): number {
  return filterOptions(query, "all").length;
}

function optionMeta(option: StudioObjectOption) {
  const footprint = formatStudioFootprint(option.width, option.depth);
  return option.seatingCount ? `${footprint} · ${option.seatingCount} seats` : footprint;
}

export function LibraryFurnitureTab({
  design,
  onChange,
  onSelect,
  query,
  idPrefix,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  onSelect: (selection: StudioSelection) => void;
  query: string;
  idPrefix: string;
}) {
  const [category, setCategory] = useState<StudioObjectCategory | "all">("all");
  const searching = query.trim().length > 0;
  const options = filterOptions(query, category);
  const atLimit = design.objects.length >= STUDIO_MAX_OBJECTS;

  function addObject(option: StudioObjectOption) {
    if (atLimit) return;
    const spot = findFreeStudioSpot(design, option.width, option.depth);
    const object = createStudioObject(option.type, spot);
    onChange({ ...design, objects: [...design.objects, object] });
    onSelect({ kind: "object", id: object.id });
  }

  const groups = FURNITURE_CATEGORIES.map((item) => ({
    ...item,
    options: options.filter((option) => option.category === item.value),
  })).filter((group) => group.options.length > 0);

  return (
    <div className="space-y-3">
      {!searching ? (
        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
          role="toolbar"
          aria-label="Filter by category"
        >
          {[{ value: "all" as const, label: "All" }, ...FURNITURE_CATEGORIES].map(
            (item) => {
              const active = category === item.value;
              const Icon =
                item.value === "all" ? null : STUDIO_CATEGORY_ICONS[item.value];
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(item.value)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[0.62rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    active
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-border/40 bg-background/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {Icon ? <Icon className="size-3 text-primary" aria-hidden /> : null}
                  {item.label.replace(" & lighting", "").replace(" & flow", "")}
                </button>
              );
            }
          )}
        </div>
      ) : null}

      {atLimit ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-[0.62rem] text-destructive">
          This design has reached the {STUDIO_MAX_OBJECTS}-object limit.
        </p>
      ) : null}

      {groups.map((group) => (
        <LibraryCard
          key={group.value}
          aria-labelledby={`${idPrefix}-${group.value}-heading`}
        >
          <LibrarySectionHeading
            icon={STUDIO_CATEGORY_ICONS[group.value]}
            eyebrow={`${group.options.length} item${group.options.length === 1 ? "" : "s"}`}
            title={group.label}
            id={`${idPrefix}-${group.value}-heading`}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {group.options.map((option) => (
              <LibraryTile
                key={option.type}
                icon={STUDIO_OBJECT_ICONS[option.type]}
                label={option.label}
                description={option.description}
                meta={optionMeta(option)}
                disabled={atLimit}
                onClick={() => addObject(option)}
                onDragStart={(event) => startStudioObjectDrag(event, option.type)}
              />
            ))}
          </div>
        </LibraryCard>
      ))}
    </div>
  );
}

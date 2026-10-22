"use client";

import { cn } from "@/lib/utils";
import {
  Armchair,
  GalleryVerticalEnd,
  LampCeiling,
  LayoutGrid,
  Ruler,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { StudioTip } from "../studio-tip";
import type { LibraryTab } from "./library-browser-store";

export const LIBRARY_TABS: Array<{
  value: LibraryTab;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  { value: "room", label: "Room", icon: Ruler, hint: "Venue, shape & size" },
  { value: "drapery", label: "Drapery", icon: GalleryVerticalEnd, hint: "Walls & treatments" },
  { value: "ceiling", label: "Ceiling", icon: LampCeiling, hint: "Swags & canopies" },
  { value: "furniture", label: "Furniture", icon: Armchair, hint: "Tables, stage & decor" },
  { value: "layouts", label: "Layouts", icon: LayoutGrid, hint: "Generate a floor plan" },
];

type Size = "rail" | "wide";

export function LibrarySearchField({
  query,
  onQueryChange,
  size = "rail",
  autoFocus,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  size?: Size;
  autoFocus?: boolean;
}) {
  const wide = size === "wide";
  return (
    <div className="relative">
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          wide ? "left-3.5 size-4" : "left-2.5 size-3.5"
        )}
        aria-hidden
      />
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query) {
            event.preventDefault();
            onQueryChange("");
          }
        }}
        placeholder="Search tables, drapes, ceilings…"
        aria-label="Search the studio library"
        className={cn(
          "w-full border border-border/50 bg-background/55 text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden",
          wide
            ? "h-10 rounded-2xl pr-10 pl-10 text-sm"
            : "h-8 rounded-xl pr-8 pl-8 text-xs"
        )}
      />
      {query.trim() ? (
        <StudioTip label="Clear search" shortcut="Esc">
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className={cn(
              "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              wide ? "right-2 size-6" : "right-1.5 size-5"
            )}
          >
            <X className={wide ? "size-3.5" : "size-3"} aria-hidden />
          </button>
        </StudioTip>
      ) : null}
    </div>
  );
}

export function LibraryTabBar({
  tab,
  onTabChange,
  idPrefix,
  panelId,
  size = "rail",
}: {
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  idPrefix: string;
  panelId: string;
  size?: Size;
}) {
  const wide = size === "wide";
  return (
    <div
      className={cn(
        "grid grid-cols-5 border border-border/40 bg-background/40",
        wide ? "gap-1.5 rounded-2xl p-1.5" : "gap-1 rounded-xl p-1"
      )}
      role="tablist"
      aria-label="Library sections"
    >
      {LIBRARY_TABS.map((item) => {
        const active = tab === item.value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.value}`}
            aria-selected={active}
            aria-controls={panelId}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "flex min-w-0 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              wide
                ? "items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm"
                : "flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[0.6rem]",
              active
                ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/30%)]"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {wide ? (
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  active
                    ? "border-primary/30 bg-primary/20 text-primary"
                    : "border-border/40 bg-background/40"
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
            ) : (
              <Icon className={cn("size-3.5", active ? "text-primary" : "")} aria-hidden />
            )}
            {wide ? (
              <span className="min-w-0">
                <span className="block truncate font-heading text-sm leading-tight">
                  {item.label}
                </span>
                <span className="hidden truncate text-[0.66rem] font-normal text-muted-foreground xl:block">
                  {item.hint}
                </span>
              </span>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

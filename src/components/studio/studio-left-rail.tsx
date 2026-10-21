"use client";

import { useState } from "react";
import type { StudioDesignJson } from "@/data/studio";
import { findStudioItem } from "@/lib/studio-commands";
import { cn } from "@/lib/utils";
import {
  Armchair,
  Building2,
  GalleryVerticalEnd,
  LayoutGrid,
  Ruler,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import { useOptionalStudioEditor } from "./editor/studio-editor-context";
import {
  DEFAULT_DRAPE_STYLE,
  LibraryDraperyTab,
  countDraperyMatches,
  type StudioDrapeStyle,
} from "./library/library-drapery-tab";
import {
  LibraryFurnitureTab,
  countFurnitureMatches,
} from "./library/library-furniture-tab";
import {
  LibraryLayoutsTab,
  countLayoutMatches,
} from "./library/library-layouts-tab";
import { LibraryCard, LibrarySectionHeading } from "./library/studio-library-ui";
import {
  VenuePresetGrid,
  filterVenuePresets,
} from "./library/venue-preset-grid";
import { RoomSetupPanel } from "./room-setup-panel";
import type { StudioSelection } from "./studio-types";

type StudioLeftRailProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  idPrefix: string;
};

type LibraryTab = "room" | "drapery" | "furniture" | "layouts";

const TABS: Array<{ value: LibraryTab; label: string; icon: LucideIcon }> = [
  { value: "room", label: "Room", icon: Ruler },
  { value: "drapery", label: "Drapery", icon: GalleryVerticalEnd },
  { value: "furniture", label: "Furniture", icon: Armchair },
  { value: "layouts", label: "Layouts", icon: LayoutGrid },
];

function SearchGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 px-1 text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
        {label}
        <span className="h-px flex-1 bg-border/50" />
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </p>
      {children}
    </div>
  );
}

export function StudioLeftRail({
  design,
  onChange,
  selection,
  onSelect,
  idPrefix,
}: StudioLeftRailProps) {
  const editor = useOptionalStudioEditor();
  const [tab, setTab] = useState<LibraryTab>("room");
  const [query, setQuery] = useState("");
  const [drapeStyle, setDrapeStyle] = useState<StudioDrapeStyle>(DEFAULT_DRAPE_STYLE);
  const searching = query.trim().length > 0;

  function selectMany(ids: string[]) {
    if (ids.length === 0) return;
    if (editor) {
      editor.selectIds(ids);
      return;
    }
    const last = ids[ids.length - 1];
    const found = findStudioItem(design, last);
    onSelect(found ? ({ kind: found.kind, id: last } as StudioSelection) : null);
  }

  const fit = editor ? () => editor.sendCanvasCommand({ type: "fit" }) : undefined;

  const counts = searching
    ? {
        room: filterVenuePresets(query).length,
        drapery: countDraperyMatches(query),
        furniture: countFurnitureMatches(query),
        layouts: countLayoutMatches(query),
      }
    : null;
  const total = counts
    ? counts.room + counts.drapery + counts.furniture + counts.layouts
    : 0;

  const drapery = (
    <LibraryDraperyTab
      design={design}
      onChange={onChange}
      selection={selection}
      onSelect={onSelect}
      onSelectMany={selectMany}
      style={drapeStyle}
      onStyleChange={setDrapeStyle}
      query={query}
      idPrefix={`${idPrefix}-drapery`}
    />
  );
  const furniture = (
    <LibraryFurnitureTab
      design={design}
      onChange={onChange}
      onSelect={onSelect}
      query={query}
      idPrefix={`${idPrefix}-furniture`}
    />
  );
  const layouts = (
    <LibraryLayoutsTab
      design={design}
      onChange={onChange}
      onSelectMany={selectMany}
      onFit={fit}
      query={query}
      idPrefix={`${idPrefix}-layouts`}
    />
  );

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/35">
      <div className="relative shrink-0 overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 px-3 pt-3 pb-2.5 backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_60%)]"
          aria-hidden
        />
        <div className="relative space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-primary">
              <Building2 className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
                Studio library
              </p>
              <h2 className="font-heading text-base leading-tight">
                Build the room
              </h2>
            </div>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Search tables, drapes, venues…"
              aria-label="Search the studio library"
              className="h-8 w-full rounded-xl border border-border/50 bg-background/55 pr-8 pl-8 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {searching ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </div>

          {!searching ? (
            <div
              className="grid grid-cols-4 gap-1 rounded-xl border border-border/40 bg-background/40 p-1"
              role="tablist"
              aria-label="Library sections"
            >
              {TABS.map((item) => {
                const active = tab === item.value;
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    id={`${idPrefix}-tab-${item.value}`}
                    aria-selected={active}
                    aria-controls={`${idPrefix}-panel`}
                    onClick={() => setTab(item.value)}
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[0.6rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      active
                        ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/30%)]"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn("size-3.5", active ? "text-primary" : "")}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[0.62rem] text-muted-foreground" role="status">
              {total} result{total === 1 ? "" : "s"} for “{query.trim()}”
            </p>
          )}
        </div>
      </div>

      <div
        id={`${idPrefix}-panel`}
        role={searching ? "region" : "tabpanel"}
        aria-labelledby={searching ? undefined : `${idPrefix}-tab-${tab}`}
        aria-label={searching ? "Search results" : undefined}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3"
      >
        {searching && counts ? (
          total === 0 ? (
            <LibraryCard className="text-center">
              <span className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SearchX className="size-5" aria-hidden />
              </span>
              <p className="font-heading text-sm">Nothing matches</p>
              <p className="text-[0.66rem] text-muted-foreground">
                Try “round”, “velvet”, “stage” or “ballroom”.
              </p>
            </LibraryCard>
          ) : (
            <div className="space-y-4">
              <SearchGroup label="Venues" count={counts.room}>
                <LibraryCard>
                  <LibrarySectionHeading
                    icon={Building2}
                    eyebrow="Room"
                    title="Venue presets"
                  />
                  <VenuePresetGrid design={design} onChange={onChange} query={query} />
                </LibraryCard>
              </SearchGroup>
              <SearchGroup label="Drapery" count={counts.drapery}>
                {drapery}
              </SearchGroup>
              <SearchGroup label="Furniture" count={counts.furniture}>
                {furniture}
              </SearchGroup>
              <SearchGroup label="Layouts" count={counts.layouts}>
                {layouts}
              </SearchGroup>
            </div>
          )
        ) : tab === "room" ? (
          <RoomSetupPanel
            design={design}
            onChange={onChange}
            idPrefix={`${idPrefix}-room`}
          />
        ) : tab === "drapery" ? (
          drapery
        ) : tab === "furniture" ? (
          furniture
        ) : (
          layouts
        )}
      </div>
    </aside>
  );
}

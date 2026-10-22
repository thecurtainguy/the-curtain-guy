"use client";

import { useState } from "react";
import type { StudioDesignJson } from "@/data/studio";
import { findStudioItem } from "@/lib/studio-commands";
import { Building2, Maximize2, SearchX } from "lucide-react";
import { useOptionalStudioEditorActions } from "./editor/studio-editor-context";
import {
  DEFAULT_DRAPE_STYLE,
  LibraryDraperyTab,
  countDraperyMatches,
  type StudioDrapeStyle,
} from "./library/library-drapery-tab";
import {
  LibraryCeilingTab,
  countCeilingMatches,
} from "./library/library-ceiling-tab";
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
import { LibraryBrowserDialog } from "./rails/library-browser-dialog";
import {
  setLibraryBrowserOpen,
  setLibraryQuery,
  setLibraryTab,
  useLibraryBrowser,
} from "./rails/library-browser-store";
import { LibrarySearchField, LibraryTabBar } from "./rails/library-controls";
import { useIsDesktopRail } from "./rails/rail-chrome-context";
import { RoomSetupPanel } from "./room-setup-panel";
import { StudioTip } from "./studio-tip";
import type { StudioSelection } from "./studio-types";

type StudioLeftRailProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  idPrefix: string;
};

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
  const editor = useOptionalStudioEditorActions();
  const desktopRail = useIsDesktopRail();
  const { open: expanded, tab, query } = useLibraryBrowser();
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
        ceiling: countCeilingMatches(query),
        furniture: countFurnitureMatches(query),
        layouts: countLayoutMatches(query),
      }
    : null;
  const total = counts
    ? counts.room + counts.drapery + counts.ceiling + counts.furniture + counts.layouts
    : 0;
  const searchSummary = searching
    ? `${total} result${total === 1 ? "" : "s"} for “${query.trim()}”`
    : null;

  /** Same tab content for the rail and the expanded dialog (distinct id prefixes). */
  function renderBody(prefix: string, change: (design: StudioDesignJson) => void) {
    const drapery = (
      <LibraryDraperyTab
        design={design}
        onChange={change}
        selection={selection}
        onSelect={onSelect}
        onSelectMany={selectMany}
        style={drapeStyle}
        onStyleChange={setDrapeStyle}
        query={query}
        idPrefix={`${prefix}-drapery`}
        onOpenCeiling={() => {
          setLibraryQuery("");
          setLibraryTab("ceiling");
        }}
      />
    );
    const ceiling = (
      <LibraryCeilingTab
        design={design}
        onChange={change}
        selection={selection}
        onSelect={onSelect}
        query={query}
        idPrefix={`${prefix}-ceiling`}
      />
    );
    const furniture = (
      <LibraryFurnitureTab
        design={design}
        onChange={change}
        onSelect={onSelect}
        query={query}
        idPrefix={`${prefix}-furniture`}
      />
    );
    const layouts = (
      <LibraryLayoutsTab
        design={design}
        onChange={change}
        onSelectMany={selectMany}
        onFit={fit}
        query={query}
        idPrefix={`${prefix}-layouts`}
      />
    );

    if (searching && counts) {
      if (total === 0) {
        return (
          <LibraryCard className="text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SearchX className="size-5" aria-hidden />
            </span>
            <p className="font-heading text-sm">Nothing matches</p>
            <p className="text-[0.66rem] text-muted-foreground">
              Try “round”, “velvet”, “stage” or “ballroom”.
            </p>
          </LibraryCard>
        );
      }
      return (
        <div className="space-y-4">
          <SearchGroup label="Venues" count={counts.room}>
            <LibraryCard>
              <LibrarySectionHeading icon={Building2} eyebrow="Room" title="Venue presets" />
              <VenuePresetGrid design={design} onChange={change} query={query} />
            </LibraryCard>
          </SearchGroup>
          <SearchGroup label="Drapery" count={counts.drapery}>
            {drapery}
          </SearchGroup>
          <SearchGroup label="Ceiling" count={counts.ceiling}>
            {ceiling}
          </SearchGroup>
          <SearchGroup label="Furniture" count={counts.furniture}>
            {furniture}
          </SearchGroup>
          <SearchGroup label="Layouts" count={counts.layouts}>
            {layouts}
          </SearchGroup>
        </div>
      );
    }
    if (tab === "room") {
      return <RoomSetupPanel design={design} onChange={change} idPrefix={`${prefix}-room`} />;
    }
    if (tab === "drapery") return drapery;
    if (tab === "ceiling") return ceiling;
    if (tab === "furniture") return furniture;
    return layouts;
  }

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
            <div className="min-w-0 flex-1">
              <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
                Studio library
              </p>
              <h2 className="font-heading text-base leading-tight">
                Build the room
              </h2>
            </div>
            {desktopRail ? (
              <StudioTip label="Expand library" shortcut="Shift L" side="bottom">
                <button
                  type="button"
                  onClick={() => setLibraryBrowserOpen(true)}
                  aria-label="Expand library"
                  aria-haspopup="dialog"
                  aria-expanded={expanded}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <Maximize2 className="size-3.5" aria-hidden />
                </button>
              </StudioTip>
            ) : null}
          </div>

          <LibrarySearchField query={query} onQueryChange={setLibraryQuery} />

          {!searching ? (
            <LibraryTabBar
              tab={tab}
              onTabChange={setLibraryTab}
              idPrefix={idPrefix}
              panelId={`${idPrefix}-panel`}
            />
          ) : (
            <p className="text-[0.62rem] text-muted-foreground" role="status">
              {searchSummary}
            </p>
          )}
        </div>
      </div>

      <div
        id={`${idPrefix}-panel`}
        role={searching ? "region" : "tabpanel"}
        aria-labelledby={searching ? undefined : `${idPrefix}-tab-${tab}`}
        aria-label={searching ? "Search results" : undefined}
        className="@container min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3"
      >
        {renderBody(idPrefix, onChange)}
      </div>

      {desktopRail ? (
        <LibraryBrowserDialog
          open={expanded}
          onOpenChange={setLibraryBrowserOpen}
          design={design}
          onChange={onChange}
          tab={tab}
          onTabChange={setLibraryTab}
          query={query}
          onQueryChange={setLibraryQuery}
          searchSummary={searchSummary}
          idPrefix={`${idPrefix}-expanded`}
          renderBody={(change) => renderBody(`${idPrefix}-expanded`, change)}
        />
      ) : null}
    </aside>
  );
}

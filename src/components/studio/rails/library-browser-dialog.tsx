"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StudioDesignJson } from "@/data/studio";
import { findStudioItem, getAllStudioItemIds } from "@/lib/studio-commands";
import { Building2, CheckCircle2, Layers, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCeilingPlacement } from "../editor/ceiling-placement-store";
import { StudioTip } from "../studio-tip";
import type { LibraryTab } from "./library-browser-store";
import { LibrarySearchField, LibraryTabBar, type LibraryTabOption } from "./library-controls";

const NOTICE_MS = 2600;

function allItemIds(design: StudioDesignJson) {
  return getAllStudioItemIds(design, { includeLocked: true, includeHidden: true });
}

function describeChange(before: StudioDesignJson, after: StudioDesignJson): string {
  const previous = new Set(allItemIds(before));
  const added = allItemIds(after).filter((id) => !previous.has(id));
  if (added.length === 0) return "Room updated";
  if (added.length > 1) return `Added ${added.length} pieces to the room`;
  const ref = findStudioItem(after, added[0]);
  const label =
    ref && "label" in ref.item && typeof ref.item.label === "string" ? ref.item.label : "";
  return label ? `Added ${label}` : "Added to the room";
}

/**
 * Full-screen library browser. Renders the same tab content as the rail
 * (via `renderBody`) in a wide `@container`, so the tab grids spread out.
 * Stays open while adding; changes surface as a short notice.
 */
export function LibraryBrowserDialog({
  open,
  onOpenChange,
  design,
  onChange,
  tab,
  onTabChange,
  query,
  onQueryChange,
  searchSummary,
  idPrefix,
  renderBody,
  tabs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** Result count line while searching; `null` shows the tab row. */
  searchSummary: React.ReactNode | null;
  idPrefix: string;
  renderBody: (onChange: (design: StudioDesignJson) => void) => React.ReactNode;
  tabs?: LibraryTabOption[];
}) {
  const [notice, setNotice] = useState<{ key: number; text: string } | null>(null);
  const placement = useCeilingPlacement();
  const panelId = `${idPrefix}-panel`;
  const itemCount = allItemIds(design).length;

  // "Place" arms a click-to-place on the canvas, which the modal would cover.
  useEffect(() => {
    if (open && placement) onOpenChange(false);
  }, [open, placement, onOpenChange]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleChange = useCallback(
    (next: StudioDesignJson) => {
      setNotice({ key: Date.now(), text: describeChange(design, next) });
      onChange(next);
    },
    [design, onChange]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNotice(null);
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement && target.type === "search" && target.value) {
            event.preventDefault();
            onQueryChange("");
          }
        }}
        onKeyDown={(event) => {
          if (
            event.shiftKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            event.key.toLowerCase() === "l" &&
            !(event.target instanceof HTMLElement && event.target.matches("input, textarea, select"))
          ) {
            event.preventDefault();
            onOpenChange(false);
          }
        }}
        className="flex h-[92dvh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden rounded-4xl border border-border/50 bg-card p-0 text-foreground sm:max-w-[96vw]"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/50 to-transparent px-5 pt-5 pb-4 sm:px-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_60%)]"
            aria-hidden
          />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-semibold tracking-[0.22em] text-primary uppercase">
                    Studio library
                  </p>
                  <DialogTitle className="font-heading text-2xl leading-tight font-semibold">
                    Browse the full collection
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Add drapery, ceiling designs, furniture and layouts. The dialog stays
                    open so you can add several pieces.
                  </DialogDescription>
                </div>
              </div>
              <div className="w-full sm:w-80">
                <LibrarySearchField query={query} onQueryChange={onQueryChange} size="wide" />
              </div>
              <StudioTip label="Close library" shortcut="Esc" side="left">
                <DialogClose asChild>
                  <button
                    type="button"
                    aria-label="Close library"
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </DialogClose>
              </StudioTip>
            </div>
            {searchSummary === null ? (
              <LibraryTabBar
                tab={tab}
                onTabChange={onTabChange}
                idPrefix={idPrefix}
                panelId={panelId}
                size="wide"
                tabs={tabs}
              />
            ) : (
              <p className="text-xs text-muted-foreground" role="status">
                {searchSummary}
              </p>
            )}
          </div>
        </header>

        <div
          id={panelId}
          role={searchSummary === null ? "tabpanel" : "region"}
          aria-labelledby={searchSummary === null ? `${idPrefix}-tab-${tab}` : undefined}
          aria-label={searchSummary === null ? undefined : "Search results"}
          className="@container min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 sm:px-7"
        >
          <div className="mx-auto w-full max-w-[90rem]">{renderBody(handleChange)}</div>
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-border/40 bg-card/80 px-5 py-3 sm:px-7">
          <div className="min-w-0 flex-1" role="status" aria-live="polite">
            {notice ? (
              <span
                key={notice.key}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-foreground animate-in fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{notice.text}</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Click a piece to add it — the library stays open so you can add several.
              </span>
            )}
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[0.66rem] text-muted-foreground tabular-nums sm:inline-flex">
            <Layers className="size-3 text-primary" aria-hidden />
            {itemCount} in room
          </span>
          <DialogClose asChild>
            <Button type="button">Done</Button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

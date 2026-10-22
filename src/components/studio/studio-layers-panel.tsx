"use client";

import {
  STUDIO_LABEL_MAX_LENGTH,
  STUDIO_OBJECT_CATEGORIES,
  getCeilingDrapes,
  getDrapeColorHex,
  getStudioObjectOption,
  type StudioDesignJson,
} from "@/data/studio";
import {
  getObjectPaintBand,
  mapIfChanged,
  orderStudioItems,
  removeStudioItems,
  setStudioItemsFlag,
  type StudioItemKind,
} from "@/lib/studio-commands";
import { getDrapeRunHungLength } from "@/lib/studio-door-gaps";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import {
  BoxSelect,
  ChevronRight,
  DoorOpen,
  Eye,
  EyeOff,
  GripVertical,
  Info,
  LampCeiling,
  Lock,
  LockOpen,
  ScissorsLineDashed,
  Search,
  Sofa,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useIsStudioHovered } from "./editor/hover-store";
import {
  useStudioEditorActions,
  useStudioSelection,
  useStudioSettings,
  type StudioLayerKey,
} from "./editor/studio-editor-context";
import {
  STUDIO_OBJECT_ICONS,
  STUDIO_OPENING_META,
  getCeilingStyleLabel,
  getOpeningDisplay,
} from "./inspector/studio-item-meta";
import { StudioTip } from "./studio-tip";

type LayerRow = {
  kind: StudioItemKind;
  id: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  swatch?: string;
  locked: boolean;
  hidden: boolean;
  search: string;
  /** Rows only reorder among rows of the same paint band. */
  band: number;
};

type LayerGroup = {
  key: string;
  layer: StudioLayerKey;
  label: string;
  icon: LucideIcon;
  rows: LayerRow[];
  subgroups?: Array<{ key: string; label: string; rows: LayerRow[] }>;
};

function renameStudioItem(
  design: StudioDesignJson,
  id: string,
  label: string
): StudioDesignJson {
  const apply = <T extends { id: string; label: string }>(item: T): T =>
    item.id === id ? { ...item, label } : item;
  const ceilings = getCeilingDrapes(design);
  const next = {
    objects: mapIfChanged(design.objects, apply),
    drapeRuns: mapIfChanged(design.drapeRuns, apply),
    treatments: mapIfChanged(design.treatments, apply),
    openings: mapIfChanged(design.openings, apply),
    ceilingDrapes: mapIfChanged(ceilings, apply),
  };
  const unchanged =
    next.objects === design.objects &&
    next.drapeRuns === design.drapeRuns &&
    next.treatments === design.treatments &&
    next.openings === design.openings &&
    next.ceilingDrapes === ceilings;
  return unchanged ? design : { ...design, ...next };
}

/** Lists run front-most first: the top row paints over the rows below it. */
function buildGroups(design: StudioDesignJson): LayerGroup[] {
  const drapes: LayerRow[] = design.drapeRuns.map((run) => ({
    kind: "drape",
    id: run.id,
    label: run.label,
    meta: `Wall ${run.wallIndex + 1} · ${inchesToFeetLabel(
      getDrapeRunHungLength(run, design.openings)
    )}`,
    icon: ScissorsLineDashed,
    swatch: getDrapeColorHex(run.color),
    locked: Boolean(run.locked),
    hidden: Boolean(run.hidden),
    search: `${run.label} ${run.color} ${run.fabric} drape`,
    band: 0,
  }));
  const treatments: LayerRow[] = design.treatments.map((treatment) => ({
    kind: "treatment",
    id: treatment.id,
    label: treatment.label,
    meta: `Wall ${treatment.anchor.wallIndex + 1} · ${inchesToFeetLabel(
      treatment.anchor.endOffset - treatment.anchor.startOffset
    )}`,
    icon: Sparkles,
    swatch: getDrapeColorHex(treatment.color),
    locked: Boolean(treatment.locked),
    hidden: Boolean(treatment.hidden),
    search: `${treatment.label} ${treatment.type} ${treatment.color} treatment`,
    band: 0,
  }));
  const ceilings: LayerRow[] = getCeilingDrapes(design).map((drape) => ({
    kind: "ceiling",
    id: drape.id,
    label: drape.label,
    meta: `${getCeilingStyleLabel(drape.type)} · ${
      drape.coverage === "room"
        ? "Whole room"
        : `${inchesToFeetLabel(drape.width)} × ${inchesToFeetLabel(drape.depth)}`
    }`,
    icon: LampCeiling,
    swatch: getDrapeColorHex(drape.color),
    locked: Boolean(drape.locked),
    hidden: Boolean(drape.hidden),
    search: `${drape.label} ${drape.type} ${drape.color} ${drape.fabric} ceiling`,
    band: 0,
  }));
  const openings: LayerRow[] = design.openings.map((opening) => {
    const display = getOpeningDisplay(opening);
    return {
      kind: "opening",
      id: opening.id,
      label: opening.label,
      meta: `${display.label} · Wall ${opening.wallIndex + 1}`,
      icon: STUDIO_OPENING_META[opening.type].icon,
      locked: Boolean(opening.locked),
      hidden: Boolean(opening.hidden),
      search: `${opening.label} ${display.label} ${opening.type} opening`,
      band: 0,
    };
  });
  const objectRows = design.objects
    .map((object) => {
      const option = getStudioObjectOption(object.type);
      const row: LayerRow = {
        kind: "object",
        id: object.id,
        label: object.label,
        meta: `${option?.label ?? object.type} · ${inchesToFeetLabel(object.width)} × ${inchesToFeetLabel(object.depth)}`,
        icon: STUDIO_OBJECT_ICONS[object.type],
        swatch: object.color,
        locked: Boolean(object.locked),
        hidden: Boolean(object.hidden),
        search: `${object.label} ${object.type} ${option?.label ?? ""} ${option?.category ?? ""}`,
        band: getObjectPaintBand(object.type),
      };
      return { category: option?.category ?? "zones", row };
    })
    .reverse()
    .sort((a, b) => b.row.band - a.row.band);
  const subgroups = STUDIO_OBJECT_CATEGORIES.map((category) => ({
    key: category.value,
    label: category.label,
    rows: objectRows
      .filter((entry) => entry.category === category.value)
      .map((entry) => entry.row),
  }));
  return [
    {
      key: "objects",
      layer: "objects",
      label: "Furniture & decor",
      icon: Sofa,
      rows: objectRows.map((entry) => entry.row),
      subgroups,
    },
    {
      key: "drapes",
      layer: "drapes",
      label: "Drapery runs",
      icon: ScissorsLineDashed,
      rows: drapes.reverse(),
    },
    {
      key: "treatments",
      layer: "treatments",
      label: "Treatments",
      icon: Sparkles,
      rows: treatments.reverse(),
    },
    {
      key: "ceiling",
      layer: "ceiling",
      label: "Ceiling drapery",
      icon: LampCeiling,
      rows: ceilings.reverse(),
    },
    {
      key: "openings",
      layer: "openings",
      label: "Openings",
      icon: DoorOpen,
      rows: openings.reverse(),
    },
  ];
}

export function StudioLayersPanel({
  design,
  onChange,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
}) {
  const settings = useStudioSettings();
  const { toggleLayer, selectIds, getDesign } = useStudioEditorActions();
  const { selectedIds } = useStudioSelection();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const needle = query.trim().toLowerCase();
  const matches = (row: LayerRow) =>
    !needle || row.search.toLowerCase().includes(needle);
  const groups = useMemo(() => buildGroups(design), [design]);
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const visibleTotal = groups.reduce(
    (sum, group) => sum + group.rows.filter(matches).length,
    0
  );

  const toggleCollapsed = (key: string) =>
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));

  const onRename = useCallback(
    (id: string, label: string) =>
      onChange(renameStudioItem(getDesign(), id, label)),
    [getDesign, onChange]
  );
  const onToggleFlag = useCallback(
    (id: string, flag: "locked" | "hidden", value: boolean) =>
      onChange(setStudioItemsFlag(getDesign(), [id], flag, value)),
    [getDesign, onChange]
  );
  const onRemove = useCallback(
    (ids: readonly string[]) => onChange(removeStudioItems(getDesign(), ids)),
    [getDesign, onChange]
  );
  const onRemoveRow = useCallback((id: string) => onRemove([id]), [onRemove]);
  const [announcement, setAnnouncement] = useState("");
  const onReorder = useCallback(
    (backToFront: readonly string[], message: string) => {
      onChange(orderStudioItems(getDesign(), backToFront));
      setAnnouncement(message);
    },
    [getDesign, onChange]
  );
  const rowProps = { onRename, onToggleFlag, onRemove: onRemoveRow };
  const listProps = {
    selectedSet,
    reorderable: !needle,
    onReorder,
    rowProps,
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${total} items…`}
          aria-label="Search layers"
          className="h-9 w-full rounded-xl border border-border/50 bg-background/50 pr-8 pl-8 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <StudioTip label="Clear search">
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </StudioTip>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[0.62rem] text-muted-foreground">
        <span>
          {needle ? `${visibleTotal} of ${total} match` : `${total} items`}
          {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ""}
        </span>
        <StudioTip label="Top of each list draws in front · Shift/Ctrl-click to multi-select · double-click to rename">
          <span className="inline-flex items-center gap-1" tabIndex={0}>
            <GripVertical className="size-3 text-primary/70" aria-hidden="true" />
            Drag to reorder
            <Info className="size-3" aria-hidden="true" />
          </span>
        </StudioTip>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-4 text-center">
          <BoxSelect className="mx-auto size-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-heading text-sm">Nothing placed yet</p>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">
            Add drapes, ceilings and furniture from the library — they
            will be listed here.
          </p>
        </div>
      ) : null}

      {groups.map((group) => {
        const rows = group.rows.filter(matches);
        if (needle && rows.length === 0) return null;
        const layerVisible = settings.layers[group.layer];
        const isCollapsed = Boolean(collapsed[group.key]) && !needle;
        const GroupIcon = group.icon;
        return (
          <section
            key={group.key}
            className="overflow-hidden rounded-2xl border border-border/40 bg-card/25"
          >
            <div className="group/header flex items-center gap-1 border-b border-border/30 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_65%)] px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggleCollapsed(group.key)}
                aria-expanded={!isCollapsed}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform",
                    !isCollapsed && "rotate-90"
                  )}
                  aria-hidden="true"
                />
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GroupIcon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="truncate text-xs font-semibold">{group.label}</span>
                <span className="rounded-full bg-muted/60 px-1.5 text-[0.6rem] text-muted-foreground tabular-nums">
                  {rows.length}
                </span>
              </button>
              <HeaderButton
                label={`Select all ${group.label.toLowerCase()}`}
                icon={BoxSelect}
                disabled={rows.length === 0}
                onClick={() =>
                  selectIds(
                    rows.filter((row) => !row.locked && !row.hidden).map((row) => row.id)
                  )
                }
              />
              <HeaderButton
                label={layerVisible ? `Hide ${group.label} layer` : `Show ${group.label} layer`}
                icon={layerVisible ? Eye : EyeOff}
                active={!layerVisible}
                onClick={() => toggleLayer(group.layer)}
              />
              <GroupDeleteButton
                label={group.label}
                rows={rows}
                onDelete={(ids) => onRemove(ids)}
              />
            </div>
            {!isCollapsed ? (
              <div className={cn("p-1", !layerVisible && "opacity-55")}>
                {!layerVisible ? (
                  <p className="px-2 py-1 text-[0.6rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Layer hidden in views
                  </p>
                ) : null}
                {rows.length === 0 ? (
                  <p className="px-2 py-2 text-[0.68rem] text-muted-foreground">
                    None yet.
                  </p>
                ) : group.subgroups ? (
                  group.subgroups.map((subgroup) => {
                    const subRows = subgroup.rows.filter(matches);
                    if (subRows.length === 0) return null;
                    const subKey = `${group.key}:${subgroup.key}`;
                    const subCollapsed = Boolean(collapsed[subKey]) && !needle;
                    return (
                      <div key={subgroup.key}>
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(subKey)}
                          aria-expanded={!subCollapsed}
                          className="flex w-full items-center gap-1.5 px-2 pt-1.5 pb-1 text-[0.6rem] font-semibold tracking-[0.14em] text-primary/80 uppercase"
                        >
                          <ChevronRight
                            className={cn(
                              "size-3 transition-transform",
                              !subCollapsed && "rotate-90"
                            )}
                            aria-hidden="true"
                          />
                          {subgroup.label}
                          <span className="text-muted-foreground">· {subRows.length}</span>
                        </button>
                        {!subCollapsed ? (
                          <LayerList rows={subRows} indent {...listProps} />
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <LayerList rows={rows} {...listProps} />
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function HeaderButton({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <StudioTip label={label}>
      <span className="inline-flex">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    </StudioTip>
  );
}

const DELETE_ARM_MS = 3000;

function GroupDeleteButton({
  label,
  rows,
  onDelete,
}: {
  label: string;
  rows: LayerRow[];
  onDelete: (ids: string[]) => void;
}) {
  const [armed, setArmed] = useState(false);
  const deletable = rows.filter((row) => !row.locked);
  const lockedCount = rows.length - deletable.length;
  const count = deletable.length;

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), DELETE_ARM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (rows.length === 0) return null;

  const tip =
    count === 0
      ? lockedCount > 0
        ? "Unlock items to delete"
        : `No ${label.toLowerCase()} to delete`
      : armed
        ? `Click again to delete ${count} item${count === 1 ? "" : "s"}`
        : `Delete all ${label.toLowerCase()}${lockedCount > 0 ? ` (${lockedCount} locked kept)` : ""}`;

  return (
    <StudioTip label={tip}>
      <span
        className={cn(
          armed
            ? "inline-flex"
            : "hidden group-hover/header:inline-flex group-focus-within/header:inline-flex"
        )}
      >
        <button
          type="button"
          disabled={count === 0}
          aria-label={tip}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            setArmed(false);
            onDelete(deletable.map((row) => row.id));
          }}
          onBlur={() => setArmed(false)}
          className={cn(
            "flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg transition-colors disabled:opacity-30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            armed
              ? "bg-destructive/15 px-2 text-destructive"
              : "w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          {armed ? (
            <span className="text-[0.62rem] font-semibold tabular-nums">
              {count}?
            </span>
          ) : null}
        </button>
      </span>
    </StudioTip>
  );
}

const DRAG_THRESHOLD_PX = 4;
const AUTOSCROLL_EDGE_PX = 40;
const AUTOSCROLL_MAX_PX = 14;

type RowCallbacks = {
  onRename: (id: string, label: string) => void;
  onToggleFlag: (id: string, flag: "locked" | "hidden", value: boolean) => void;
  onRemove: (id: string) => void;
};

type DragState = { ids: ReadonlySet<string>; slot: number; lineY: number };

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

/** Rebuilds the display order with `moving` dropped in at `slot`. */
function dropRows(rows: readonly LayerRow[], moving: ReadonlySet<string>, slot: number) {
  const rest = rows.filter((row) => !moving.has(row.id));
  const before = rows.slice(0, slot).filter((row) => !moving.has(row.id)).length;
  return [
    ...rest.slice(0, before),
    ...rows.filter((row) => moving.has(row.id)),
    ...rest.slice(before),
  ];
}

function bandRange(rows: readonly LayerRow[], band: number): [number, number] {
  const first = rows.findIndex((row) => row.band === band);
  return [first, first + rows.filter((row) => row.band === band).length];
}

/**
 * One reorderable list. Rows drag by their body (mouse/pen) or grip (any
 * pointer, plus arrow keys when focused), and only among rows of the same
 * paint band so the list always matches what draws on top.
 */
function LayerList({
  rows,
  indent,
  selectedSet,
  reorderable,
  onReorder,
  rowProps,
}: {
  rows: LayerRow[];
  indent?: boolean;
  selectedSet: ReadonlySet<string>;
  reorderable: boolean;
  onReorder: (backToFront: readonly string[], message: string) => void;
  rowProps: RowCallbacks;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const latest = useRef({ rows, selectedSet, reorderable, onReorder });
  const endDragRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);

  useLayoutEffect(() => {
    latest.current = { rows, selectedSet, reorderable, onReorder };
  });
  useEffect(() => () => endDragRef.current?.(), []);

  const commitOrder = useCallback((next: readonly LayerRow[], band: number, message: string) => {
    const { rows: current, onReorder: reorder } = latest.current;
    const before = current.filter((row) => row.band === band).map((row) => row.id);
    const after = next.filter((row) => row.band === band).map((row) => row.id);
    if (before.every((id, index) => id === after[index])) return;
    reorder([...after].reverse(), message);
  }, []);

  const startDrag = useCallback(
    (rowId: string, event: ReactPointerEvent<HTMLElement>, fromGrip: boolean) => {
      const { rows: current, selectedSet: selected, reorderable: enabled } = latest.current;
      if (!enabled || event.button !== 0 || endDragRef.current) return;
      if (!fromGrip && event.pointerType === "touch") return;
      const row = current.find((item) => item.id === rowId);
      if (!row || row.locked) return;
      const [lo, hi] = bandRange(current, row.band);
      if (hi - lo < 2) return;
      if (fromGrip) event.preventDefault();

      const moving = selected.has(rowId)
        ? current.filter((item) => selected.has(item.id) && !item.locked && item.band === row.band)
        : [row];
      const ids: ReadonlySet<string> = new Set(moving.map((item) => item.id));
      const pointerId = event.pointerId;
      const startY = event.clientY;
      let pointerY = startY;
      let active = false;
      let slot = -1;
      let lastLineY = Number.NaN;
      let frame = 0;
      let scroller: HTMLElement | null = null;

      const measure = () => {
        const list = listRef.current;
        if (!list) return;
        const listTop = list.getBoundingClientRect().top;
        const rects = new Map<string, DOMRect>();
        list.querySelectorAll<HTMLElement>("[data-layer-row]").forEach((element) => {
          rects.set(element.dataset.layerRow ?? "", element.getBoundingClientRect());
        });
        let next = lo;
        for (let index = lo; index < hi; index += 1) {
          const rect = rects.get(current[index].id);
          if (rect && pointerY > rect.top + rect.height / 2) next = index + 1;
        }
        const edge =
          next < hi ? rects.get(current[next].id)?.top : rects.get(current[hi - 1].id)?.bottom;
        if (edge === undefined) return;
        const lineY = Math.round(edge - listTop);
        if (next === slot && lineY === lastLineY) return;
        slot = next;
        lastLineY = lineY;
        setDrag({ ids, slot, lineY });
      };

      const tick = () => {
        if (scroller) {
          const bounds = scroller.getBoundingClientRect();
          const fromTop = pointerY - bounds.top;
          const fromBottom = bounds.bottom - pointerY;
          const speed = (distance: number) =>
            Math.ceil(AUTOSCROLL_MAX_PX * (1 - Math.max(0, distance) / AUTOSCROLL_EDGE_PX));
          if (fromTop < AUTOSCROLL_EDGE_PX) scroller.scrollTop -= speed(fromTop);
          else if (fromBottom < AUTOSCROLL_EDGE_PX) scroller.scrollTop += speed(fromBottom);
        }
        measure();
        frame = requestAnimationFrame(tick);
      };

      const finish = (apply: boolean) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("blur", onCancel);
        cancelAnimationFrame(frame);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        endDragRef.current = null;
        if (!active) return;
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        setDrag(null);
        if (!apply || slot < 0) return;
        const next = dropRows(current, ids, slot);
        const block = next.filter((item) => item.band === row.band);
        const position = block.findIndex((item) => ids.has(item.id)) + 1;
        commitOrder(
          next,
          row.band,
          ids.size === 1
            ? `Moved ${row.label} to position ${position} of ${block.length}`
            : `Moved ${ids.size} layers to position ${position} of ${block.length}`
        );
      };
      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== pointerId) return;
        pointerY = move.clientY;
        if (active || Math.abs(pointerY - startY) < DRAG_THRESHOLD_PX) return;
        active = true;
        scroller = findScrollParent(listRef.current);
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        frame = requestAnimationFrame(tick);
      };
      const onUp = (up: PointerEvent) => {
        if (up.pointerId === pointerId) finish(true);
      };
      const onCancel = () => finish(false);
      const onKey = (key: KeyboardEvent) => {
        if (key.key !== "Escape" || !active) return;
        key.preventDefault();
        key.stopPropagation();
        finish(false);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey, true);
      window.addEventListener("blur", onCancel);
      endDragRef.current = () => finish(false);
    },
    [commitOrder]
  );

  const stepRow = useCallback(
    (rowId: string, delta: -1 | 1) => {
      const { rows: current, reorderable: enabled } = latest.current;
      const index = current.findIndex((item) => item.id === rowId);
      const row = current[index];
      if (!enabled || !row || row.locked) return;
      const [lo, hi] = bandRange(current, row.band);
      const target = index + delta;
      if (target < lo || target >= hi) return;
      const next = [...current];
      next[index] = current[target];
      next[target] = row;
      commitOrder(next, row.band, `Moved ${row.label} to position ${target - lo + 1} of ${hi - lo}`);
    },
    [commitOrder]
  );

  const bandSizes = new Map<number, number>();
  for (const row of rows) bandSizes.set(row.band, (bandSizes.get(row.band) ?? 0) + 1);

  return (
    <div
      ref={listRef}
      className="relative"
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {rows.map((row) => {
        const solo = (bandSizes.get(row.band) ?? 0) < 2;
        return (
          <LayerRowItem
            key={row.id}
            row={row}
            indent={indent}
            selected={selectedSet.has(row.id)}
            dragging={drag?.ids.has(row.id) ?? false}
            grip={
              solo
                ? null
                : !reorderable
                  ? "Clear the search to reorder"
                  : row.locked
                    ? "Unlock to reorder"
                    : ""
            }
            onDragStart={startDrag}
            onStep={stepRow}
            {...rowProps}
          />
        );
      })}
      {drag ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 left-2 z-10 h-0.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_color-mix(in_oklch,var(--primary)_70%,transparent)]"
          style={{ top: drag.lineY }}
        >
          <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" />
        </span>
      ) : null}
    </div>
  );
}

const LayerRowItem = memo(function LayerRowItem({
  row,
  indent,
  selected,
  dragging,
  grip,
  onDragStart,
  onStep,
  onRename,
  onToggleFlag,
  onRemove,
}: RowCallbacks & {
  row: LayerRow;
  indent?: boolean;
  selected: boolean;
  dragging: boolean;
  /** `null` hides the grip; a non-empty string is why reordering is off. */
  grip: string | null;
  onDragStart: (id: string, event: ReactPointerEvent<HTMLElement>, fromGrip: boolean) => void;
  onStep: (id: string, delta: -1 | 1) => void;
}) {
  const { select, setHoveredId } = useStudioEditorActions();
  const hovered = useIsStudioHovered(row.id);
  const [draft, setDraft] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const Icon = row.icon;

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function finishRename(save: boolean) {
    const next = draft?.trim() ?? "";
    if (save && next && next !== row.label) onRename(row.id, next);
    setDraft(null);
  }

  const canReorder = grip === "";

  function onGripKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    event.stopPropagation();
    if (canReorder) onStep(row.id, event.key === "ArrowUp" ? -1 : 1);
  }

  return (
    <div
      ref={rowRef}
      data-layer-row={row.id}
      onPointerEnter={() => setHoveredId(row.id)}
      onPointerLeave={() => setHoveredId(null)}
      className={cn(
        "group relative flex items-center gap-0.5 rounded-xl pr-1 transition-[background-color,opacity]",
        indent ? "pl-3" : "pl-1",
        dragging && "opacity-40",
        selected
          ? "bg-primary/15 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
          : hovered
            ? "bg-primary/5"
            : "hover:bg-muted/30"
      )}
    >
      {selected ? (
        <span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      ) : null}
      {grip === null ? (
        <span className="w-4 shrink-0" aria-hidden="true" />
      ) : (
        <button
          type="button"
          aria-label={canReorder ? `Reorder ${row.label}` : grip}
          aria-disabled={!canReorder}
          aria-keyshortcuts="ArrowUp ArrowDown"
          data-studio-tip={canReorder ? "Drag to reorder · ↑ ↓ to move" : grip}
          onPointerDown={(event) => onDragStart(row.id, event, true)}
          onKeyDown={onGripKeyDown}
          className={cn(
            "flex h-7 w-4 shrink-0 touch-none items-center justify-center rounded-md transition-opacity",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            canReorder
              ? "cursor-grab text-muted-foreground opacity-0 group-hover:opacity-70 hover:text-primary hover:opacity-100! active:cursor-grabbing [@media(hover:none)]:opacity-60"
              : "cursor-not-allowed text-muted-foreground opacity-0 group-hover:opacity-25"
          )}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
      )}
      {draft !== null ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-1">
          <RowIcon icon={Icon} swatch={row.swatch} selected={selected} />
          <input
            autoFocus
            value={draft}
            maxLength={STUDIO_LABEL_MAX_LENGTH}
            aria-label={`Rename ${row.label}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => finishRename(true)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") finishRename(true);
              if (event.key === "Escape") finishRename(false);
            }}
            className="h-7 min-w-0 flex-1 rounded-lg border border-primary/40 bg-background/70 px-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={(event) =>
            select(
              { kind: row.kind, id: row.id },
              { additive: event.shiftKey || event.metaKey || event.ctrlKey }
            )
          }
          onDoubleClick={() => setDraft(row.label)}
          onPointerDown={canReorder ? (event) => onDragStart(row.id, event, false) : undefined}
          onKeyDown={(event) => {
            if (event.key === "F2") {
              event.preventDefault();
              setDraft(row.label);
            }
          }}
          aria-pressed={selected}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pl-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <RowIcon icon={Icon} swatch={row.swatch} selected={selected} />
          <span className={cn("min-w-0 flex-1", row.hidden && "opacity-50")}>
            <span
              className={cn(
                "block truncate text-xs font-medium",
                selected ? "text-primary" : "text-foreground"
              )}
            >
              {row.label}
            </span>
            <span className="block truncate text-[0.6rem] text-muted-foreground">
              {row.meta}
            </span>
          </span>
        </button>
      )}
      <RowToggle
        label={row.hidden ? `Show ${row.label}` : `Hide ${row.label}`}
        icon={row.hidden ? EyeOff : Eye}
        active={row.hidden}
        onClick={() => onToggleFlag(row.id, "hidden", !row.hidden)}
      />
      <RowToggle
        label={row.locked ? `Unlock ${row.label}` : `Lock ${row.label}`}
        icon={row.locked ? Lock : LockOpen}
        active={row.locked}
        onClick={() => onToggleFlag(row.id, "locked", !row.locked)}
      />
      <RowDelete
        label={row.locked ? "Unlock to delete" : `Delete ${row.label}`}
        locked={row.locked}
        onClick={() => onRemove(row.id)}
      />
    </div>
  );
});

function RowDelete({
  label,
  locked,
  onClick,
}: {
  label: string;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      aria-label={label}
      aria-disabled={locked}
      data-studio-tip={label}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md transition-[color,opacity]",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        locked
          ? "cursor-not-allowed text-muted-foreground opacity-20 group-hover:opacity-35"
          : "text-muted-foreground opacity-40 group-hover:opacity-100 hover:text-destructive"
      )}
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function RowIcon({
  icon: Icon,
  swatch,
  selected,
}: {
  icon: LucideIcon;
  swatch?: string;
  selected: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-lg",
        selected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {swatch ? (
        <span
          className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card"
          style={{ backgroundColor: swatch }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

function RowToggle({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-studio-tip={label}
      aria-pressed={active}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md transition-[color,opacity]",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        active
          ? "text-primary opacity-100"
          : "text-muted-foreground opacity-40 group-hover:opacity-100 hover:text-primary"
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

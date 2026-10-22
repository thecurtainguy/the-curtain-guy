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
  mapIfChanged,
  setStudioItemsFlag,
  type StudioItemKind,
} from "@/lib/studio-commands";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import {
  BoxSelect,
  ChevronRight,
  DoorOpen,
  Eye,
  EyeOff,
  LampCeiling,
  Lock,
  LockOpen,
  ScissorsLineDashed,
  Search,
  Sofa,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "./inspector/studio-item-meta";

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

function buildGroups(design: StudioDesignJson): LayerGroup[] {
  const drapes: LayerRow[] = design.drapeRuns.map((run) => ({
    kind: "drape",
    id: run.id,
    label: run.label,
    meta: `Wall ${run.wallIndex + 1} · ${inchesToFeetLabel(run.endOffset - run.startOffset)}`,
    icon: ScissorsLineDashed,
    swatch: getDrapeColorHex(run.color),
    locked: Boolean(run.locked),
    hidden: Boolean(run.hidden),
    search: `${run.label} ${run.color} ${run.fabric} drape`,
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
  }));
  const openings: LayerRow[] = design.openings.map((opening) => ({
    kind: "opening",
    id: opening.id,
    label: opening.label,
    meta: `${STUDIO_OPENING_META[opening.type].label} · Wall ${opening.wallIndex + 1}`,
    icon: STUDIO_OPENING_META[opening.type].icon,
    locked: Boolean(opening.locked),
    hidden: Boolean(opening.hidden),
    search: `${opening.label} ${opening.type} opening`,
  }));
  const objectRows = design.objects.map((object) => {
    const option = getStudioObjectOption(object.type);
    return {
      category: option?.category ?? "zones",
      row: {
        kind: "object" as const,
        id: object.id,
        label: object.label,
        meta: `${option?.label ?? object.type} · ${inchesToFeetLabel(object.width)} × ${inchesToFeetLabel(object.depth)}`,
        icon: STUDIO_OBJECT_ICONS[object.type],
        swatch: object.color,
        locked: Boolean(object.locked),
        hidden: Boolean(object.hidden),
        search: `${object.label} ${object.type} ${option?.label ?? ""} ${option?.category ?? ""}`,
      },
    };
  });
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
    { key: "drapes", layer: "drapes", label: "Drapery runs", icon: ScissorsLineDashed, rows: drapes },
    { key: "treatments", layer: "treatments", label: "Treatments", icon: Sparkles, rows: treatments },
    { key: "ceiling", layer: "ceiling", label: "Ceiling drapery", icon: LampCeiling, rows: ceilings },
    { key: "openings", layer: "openings", label: "Openings", icon: DoorOpen, rows: openings },
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
  const rowProps = { onRename, onToggleFlag };

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
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[0.62rem] text-muted-foreground">
        <span>
          {needle ? `${visibleTotal} of ${total} match` : `${total} items`}
          {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ""}
        </span>
        <span>Shift/Ctrl-click to multi-select · double-click to rename</span>
      </div>

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
            <div className="flex items-center gap-1 border-b border-border/30 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_65%)] px-2 py-1.5">
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
                        {!subCollapsed
                          ? subRows.map((row) => (
                              <LayerRowItem
                                key={row.id}
                                row={row}
                                indent
                                selected={selectedSet.has(row.id)}
                                {...rowProps}
                              />
                            ))
                          : null}
                      </div>
                    );
                  })
                ) : (
                  rows.map((row) => (
                    <LayerRowItem
                      key={row.id}
                      row={row}
                      selected={selectedSet.has(row.id)}
                      {...rowProps}
                    />
                  ))
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
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
  );
}

const LayerRowItem = memo(function LayerRowItem({
  row,
  indent,
  selected,
  onRename,
  onToggleFlag,
}: {
  row: LayerRow;
  indent?: boolean;
  selected: boolean;
  onRename: (id: string, label: string) => void;
  onToggleFlag: (id: string, flag: "locked" | "hidden", value: boolean) => void;
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

  return (
    <div
      ref={rowRef}
      onPointerEnter={() => setHoveredId(row.id)}
      onPointerLeave={() => setHoveredId(null)}
      className={cn(
        "group relative flex items-center gap-1 rounded-xl pr-1 transition-colors",
        indent ? "pl-4" : "pl-1",
        selected
          ? "bg-primary/15 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
          : hovered
            ? "bg-primary/5"
            : "hover:bg-muted/30"
      )}
    >
      {selected ? (
        <span
          className="absolute inset-y-1.5 left-0.5 w-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      ) : null}
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
    </div>
  );
});

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
      title={label}
      aria-label={label}
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

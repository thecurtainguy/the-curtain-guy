"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  SEATED_OBJECT_TYPES,
  STUDIO_MAX_OBJECTS,
  type StudioDesignJson,
  type StudioObject,
} from "@/data/studio";
import { getStudioBounds } from "@/lib/studio-geometry";
import {
  Church,
  Crown,
  LayoutGrid,
  Martini,
  Presentation,
  Rows3,
  Sparkles,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import {
  STUDIO_LAYOUTS,
  clearFurnitureForLayout,
  generateStudioLayout,
  getStudioLayoutConfig,
  type StudioLayoutKey,
} from "./studio-layout-generators";
import { formatStudioFeet } from "./studio-library-placement";
import {
  ChoiceTile,
  LibraryCard,
  LibrarySectionHeading,
  RangeSlider,
  StatTile,
  matchesLibraryQuery,
} from "./studio-library-ui";

const LAYOUT_ICONS: Record<StudioLayoutKey, LucideIcon> = {
  banquet_grid: LayoutGrid,
  banquet_rows: Rows3,
  classroom: Presentation,
  ceremony: Church,
  cocktail: Martini,
  gala: Crown,
};

function filterLayouts(query: string) {
  return STUDIO_LAYOUTS.filter((layout) =>
    matchesLibraryQuery(query, layout.label, layout.description, "layout generator seating plan")
  );
}

export function countLayoutMatches(query: string): number {
  return filterLayouts(query).length;
}

const ROUND_TYPES = new Set(["round_table", "cocktail_table", "cake_table", "plant", "column", "uplight", "chandelier"]);

function LayoutPreview({
  design,
  objects,
  dimExisting,
}: {
  design: StudioDesignJson;
  objects: StudioObject[];
  dimExisting: boolean;
}) {
  const bounds = getStudioBounds(design.room.floor);
  const pad = Math.max(bounds.width, bounds.depth) * 0.06;
  const stroke = Math.max(bounds.width, bounds.depth) * 0.008;
  const renderObject = (object: StudioObject, className: string) =>
    ROUND_TYPES.has(object.type) ? (
      <circle
        key={object.id}
        cx={object.x}
        cy={object.z}
        r={Math.max(object.width, object.depth) / 2}
        className={className}
      />
    ) : (
      <rect
        key={object.id}
        x={object.x - object.width / 2}
        y={object.z - object.depth / 2}
        width={object.width}
        height={object.depth}
        rx={Math.min(object.width, object.depth) * 0.08}
        transform={`rotate(${object.rotation} ${object.x} ${object.z})`}
        className={className}
      />
    );
  return (
    <svg
      viewBox={`${bounds.minX - pad} ${bounds.minZ - pad} ${bounds.width + pad * 2} ${bounds.depth + pad * 2}`}
      className="h-32 w-full"
      role="img"
      aria-label="Layout preview"
    >
      <polygon
        points={design.room.floor.map((point) => `${point.x},${point.z}`).join(" ")}
        className="fill-background/60 stroke-primary/60"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <text
        x={bounds.centerX}
        y={bounds.minZ + pad * 0.2}
        textAnchor="middle"
        fontSize={pad * 0.9}
        className="fill-muted-foreground"
      >
        FRONT
      </text>
      {dimExisting
        ? design.objects.map((object) =>
            renderObject(object, "fill-muted-foreground/25")
          )
        : null}
      {objects.map((object) =>
        renderObject(object, "fill-primary/70 stroke-primary")
      )}
    </svg>
  );
}

export function LibraryLayoutsTab({
  design,
  onChange,
  onSelectMany,
  onFit,
  query,
  idPrefix,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  onSelectMany: (ids: string[]) => void;
  onFit?: () => void;
  query: string;
  idPrefix: string;
}) {
  const [params, setParams] = useState(() => {
    const config = STUDIO_LAYOUTS[0];
    return { key: config.key, count: config.count.default, spacing: config.spacing.default };
  });
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const config = getStudioLayoutConfig(params.key);
  const layouts = filterLayouts(query);

  const floor = design.room.floor;
  const preview = useMemo(
    () => generateStudioLayout({ room: { floor } }, params.key, params.count, params.spacing),
    [floor, params]
  );
  const seats = preview.objects.reduce(
    (total, object) =>
      total +
      (SEATED_OBJECT_TYPES.includes(object.type) ? (object.seatingCount ?? 0) : 0),
    0
  );
  const removable = design.objects.length - clearFurnitureForLayout(design.objects).length;
  const partial = preview.placed < preview.requested;
  const primaryNoun = config.countLabel.toLowerCase();

  function selectLayout(key: StudioLayoutKey) {
    const next = getStudioLayoutConfig(key);
    setNotice(null);
    setParams({ key, count: next.count.default, spacing: next.spacing.default });
  }

  function apply(mode: "add" | "replace") {
    setChoiceOpen(false);
    const result = generateStudioLayout(design, params.key, params.count, params.spacing);
    const base = mode === "replace" ? clearFurnitureForLayout(design.objects) : design.objects;
    const capacity = Math.max(0, STUDIO_MAX_OBJECTS - base.length);
    const objects = result.objects.slice(0, capacity);
    if (objects.length === 0) {
      setNotice("Nothing fits — enlarge the room or tighten the spacing.");
      return;
    }
    onChange({ ...design, objects: [...base, ...objects] });
    onSelectMany(objects.map((object) => object.id));
    onFit?.();
    setNotice(
      objects.length < result.objects.length
        ? `Placed ${objects.length} items — the design hit the ${STUDIO_MAX_OBJECTS}-object limit.`
        : `${config.label} placed: ${objects.length} items selected — drag to fine-tune.`
    );
  }

  function generate() {
    if (removable > 0) {
      setChoiceOpen(true);
      return;
    }
    apply("add");
  }

  return (
    <div className="space-y-3">
      {layouts.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-layouts-heading`}>
          <LibrarySectionHeading
            icon={Wand2}
            eyebrow="Master layouts"
            title="Generate a floor plan"
            id={`${idPrefix}-layouts-heading`}
          />
          <div
            className="grid grid-cols-2 gap-1.5"
            role="radiogroup"
            aria-labelledby={`${idPrefix}-layouts-heading`}
          >
            {layouts.map((layout) => (
              <ChoiceTile
                key={layout.key}
                selected={params.key === layout.key}
                onSelect={() => selectLayout(layout.key)}
                icon={LAYOUT_ICONS[layout.key]}
                label={layout.label}
                description={layout.description}
              />
            ))}
          </div>
        </LibraryCard>
      ) : null}

      {layouts.some((layout) => layout.key === params.key) ? (
        <LibraryCard aria-labelledby={`${idPrefix}-layout-config-heading`}>
          <LibrarySectionHeading
            icon={LAYOUT_ICONS[params.key]}
            eyebrow="Fitted to your room"
            title={config.label}
            id={`${idPrefix}-layout-config-heading`}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[0.68rem]">
              <label htmlFor={`${idPrefix}-layout-count`} className="font-medium text-muted-foreground">
                {config.countLabel}
              </label>
              <span className="font-heading text-sm text-foreground tabular-nums">
                {params.count}
              </span>
            </div>
            <RangeSlider
              id={`${idPrefix}-layout-count`}
              value={params.count}
              min={config.count.min}
              max={config.count.max}
              step={config.count.step}
              onChange={(count) => setParams((current) => ({ ...current, count }))}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[0.68rem]">
              <label htmlFor={`${idPrefix}-layout-spacing`} className="font-medium text-muted-foreground">
                {config.spacingLabel}
              </label>
              <span className="font-heading text-sm text-foreground tabular-nums">
                {params.key === "ceremony" ? `${params.spacing}″` : formatStudioFeet(params.spacing)}
              </span>
            </div>
            <RangeSlider
              id={`${idPrefix}-layout-spacing`}
              value={params.spacing}
              min={config.spacing.min}
              max={config.spacing.max}
              step={config.spacing.step}
              onChange={(spacing) => setParams((current) => ({ ...current, spacing }))}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border/30 bg-background/40 p-1.5">
            <LayoutPreview design={design} objects={preview.objects} dimExisting />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <StatTile
              icon={Sparkles}
              label="Fits"
              value={`${preview.placed} / ${preview.requested}`}
              hint={primaryNoun}
            />
            <StatTile
              icon={Users}
              label="Seats"
              value={seats > 0 ? seats.toLocaleString("en-US") : "Standing"}
              hint={`${preview.objects.length} items`}
            />
          </div>
          {partial ? (
            <p className="rounded-xl border border-primary/25 bg-primary/5 p-2 text-[0.62rem] leading-relaxed text-muted-foreground">
              The room fits {preview.placed} of {preview.requested} {primaryNoun}. Tighten spacing or enlarge the room.
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={generate}
            disabled={preview.objects.length === 0}
          >
            <Wand2 className="size-4" aria-hidden />
            Generate {config.label.toLowerCase()}
          </Button>
          {notice ? (
            <p role="status" className="text-center text-[0.62rem] text-primary/90">
              {notice}
            </p>
          ) : null}
        </LibraryCard>
      ) : null}

      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <BrandDialogContent
          size="sm"
          icon={LayoutGrid}
          eyebrow="Layout generator"
          title="Replace the current furniture?"
          description={`${removable} furniture item${removable === 1 ? " is" : "s are"} already in the room. Locked items, columns, chandeliers and drapery always stay.`}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setChoiceOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => apply("add")}>
                Add alongside
              </Button>
              <Button type="button" onClick={() => apply("replace")}>
                Replace furniture
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}

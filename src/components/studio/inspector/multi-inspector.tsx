"use client";

import {
  LINEN_OBJECT_TYPES,
  SEATED_OBJECT_TYPES,
  STUDIO_CHAIR_STYLES,
  type DrapeColor,
  type StudioDesignJson,
  type StudioObject,
} from "@/data/studio";
import { findStudioItem, type StudioItemKind } from "@/lib/studio-commands";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Armchair,
  BoxSelect,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Palette,
  RotateCcw,
  RotateCw,
  Shirt,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useStudioEditor } from "../editor/studio-editor-context";
import {
  ChoiceTile,
  IconAction,
  InspectorSection,
  StatTile,
  SwatchGrid,
} from "./inspector-ui";
import { CHAIR_STYLE_SWATCHES, STUDIO_KIND_ICONS } from "./studio-item-meta";
import { TintField } from "./tint-field";

const KIND_PLURALS: Record<StudioItemKind, string> = {
  object: "Objects",
  drape: "Drapes",
  treatment: "Treatments",
  opening: "Openings",
};

function shared<T>(values: T[]): { value: T | undefined; mixed: boolean } {
  if (values.length === 0) return { value: undefined, mixed: false };
  const first = values[0];
  return {
    value: first,
    mixed: values.some((value) => value !== first),
  };
}

export function MultiInspector({
  design,
  onChange,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
}) {
  const { selectedIds, commands, select } = useStudioEditor();
  const refs = selectedIds
    .map((id) => findStudioItem(design, id))
    .filter((ref) => ref !== null);
  const counts = refs.reduce<Record<StudioItemKind, number>>(
    (acc, ref) => ({ ...acc, [ref.kind]: acc[ref.kind] + 1 }),
    { object: 0, drape: 0, treatment: 0, opening: 0 }
  );
  const objects = refs
    .filter((ref) => ref.kind === "object")
    .map((ref) => ref.item as StudioObject);
  const movable = objects.filter((object) => !object.locked);
  const allLocked = refs.length > 0 && refs.every((ref) => ref.item.locked);
  const allHidden = refs.length > 0 && refs.every((ref) => ref.item.hidden);
  const seatedObjects = objects.filter((object) =>
    SEATED_OBJECT_TYPES.includes(object.type)
  );
  const linenObjects = objects.filter((object) =>
    LINEN_OBJECT_TYPES.includes(object.type)
  );
  const seats = objects.reduce((sum, object) => sum + (object.seatingCount ?? 0), 0);
  const chair = shared(seatedObjects.map((object) => object.chairStyle));
  const linen = shared(linenObjects.map((object) => object.linenColor ?? null));
  const tint = shared(objects.map((object) => object.color));

  function patchObjects(
    filter: (object: StudioObject) => boolean,
    patch: Partial<StudioObject>
  ) {
    const ids = new Set(selectedIds);
    onChange({
      ...design,
      objects: design.objects.map((object) =>
        ids.has(object.id) && filter(object)
          ? ({ ...object, ...patch } as StudioObject)
          : object
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/40 to-card/20 p-3">
        <div
          className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-primary/15 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
            <BoxSelect className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Multi-selection
            </p>
            <p className="font-heading text-xl leading-tight">
              {refs.length} items selected
            </p>
          </div>
          <button
            type="button"
            onClick={() => select(null)}
            className="flex size-8 items-center justify-center rounded-xl border border-border/40 bg-background/40 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative mt-3 grid grid-cols-4 gap-1.5">
          {(Object.keys(counts) as StudioItemKind[]).map((kind) => {
            const Icon = STUDIO_KIND_ICONS[kind];
            return (
              <div
                key={kind}
                className="rounded-xl border border-border/40 bg-background/35 px-1.5 py-2 text-center"
              >
                <Icon className="mx-auto size-3.5 text-primary" aria-hidden="true" />
                <p className="mt-1 font-heading text-base leading-none tabular-nums">
                  {counts[kind]}
                </p>
                <p className="mt-0.5 text-[0.55rem] tracking-wide text-muted-foreground uppercase">
                  {KIND_PLURALS[kind]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5">
        <IconAction icon={Copy} label="Duplicate all" shortcut="Ctrl D" onClick={commands.duplicate} />
        <IconAction
          icon={allLocked ? Lock : LockOpen}
          label={allLocked ? "Unlock all" : "Lock all"}
          shortcut="L"
          active={allLocked}
          onClick={() => commands.setLocked(!allLocked)}
        />
        <IconAction
          icon={allHidden ? EyeOff : Eye}
          label={allHidden ? "Show all" : "Hide all"}
          shortcut="H"
          active={allHidden}
          onClick={() => commands.setHidden(!allHidden)}
        />
        <IconAction
          icon={Trash2}
          label="Delete unlocked items"
          shortcut="Del"
          destructive
          disabled={allLocked}
          onClick={commands.remove}
        />
      </div>

      <InspectorSection
        icon={AlignCenterVertical}
        eyebrow="Arrange"
        title="Align & distribute"
        action={
          <span className="text-[0.6rem] text-muted-foreground">
            {movable.length} movable
          </span>
        }
      >
        <div className="grid grid-cols-6 gap-1.5">
          <IconAction icon={AlignStartVertical} label="Align left edges" disabled={movable.length < 2} onClick={() => commands.align("left")} />
          <IconAction icon={AlignCenterVertical} label="Align centres (X)" disabled={movable.length < 2} onClick={() => commands.align("center_x")} />
          <IconAction icon={AlignEndVertical} label="Align right edges" disabled={movable.length < 2} onClick={() => commands.align("right")} />
          <IconAction icon={AlignStartHorizontal} label="Align top edges" disabled={movable.length < 2} onClick={() => commands.align("top")} />
          <IconAction icon={AlignCenterHorizontal} label="Align centres (Z)" disabled={movable.length < 2} onClick={() => commands.align("center_z")} />
          <IconAction icon={AlignEndHorizontal} label="Align bottom edges" disabled={movable.length < 2} onClick={() => commands.align("bottom")} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <ArrangeButton
            icon={AlignHorizontalDistributeCenter}
            label="Distribute across"
            disabled={movable.length < 3}
            onClick={() => commands.distribute("x")}
          />
          <ArrangeButton
            icon={AlignVerticalDistributeCenter}
            label="Distribute down"
            disabled={movable.length < 3}
            onClick={() => commands.distribute("z")}
          />
        </div>
        {movable.length < 3 ? (
          <p className="text-[0.62rem] text-muted-foreground">
            Align needs 2+ unlocked objects; distribute needs 3+.
          </p>
        ) : null}
      </InspectorSection>

      <InspectorSection icon={RotateCw} eyebrow="Arrange" title="Rotate as a group">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: "−90°", value: -90, icon: RotateCcw },
            { label: "−15°", value: -15, icon: RotateCcw },
            { label: "+15°", value: 15, icon: RotateCw },
            { label: "+90°", value: 90, icon: RotateCw },
          ].map((turn) => (
            <ArrangeButton
              key={turn.label}
              icon={turn.icon}
              label={turn.label}
              disabled={movable.length === 0}
              onClick={() => commands.rotate(turn.value)}
            />
          ))}
        </div>
      </InspectorSection>

      {objects.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Users} label="Seats in selection" value={seats.toLocaleString()} />
          <StatTile icon={Armchair} label="Seated pieces" value={seatedObjects.length} />
        </div>
      ) : null}

      {seatedObjects.length > 0 ? (
        <InspectorSection
          icon={Armchair}
          eyebrow={`Bulk edit · ${seatedObjects.length} seated`}
          title="Chair style"
          action={chair.mixed ? <MixedBadge /> : null}
        >
          <div role="radiogroup" aria-label="Chair style" className="grid grid-cols-2 gap-1.5">
            {STUDIO_CHAIR_STYLES.map((style) => (
              <ChoiceTile
                key={style.value}
                label={style.label}
                swatch={CHAIR_STYLE_SWATCHES[style.value]}
                selected={!chair.mixed && chair.value === style.value}
                onSelect={() =>
                  patchObjects(
                    (object) => SEATED_OBJECT_TYPES.includes(object.type),
                    { chairStyle: style.value }
                  )
                }
              />
            ))}
          </div>
        </InspectorSection>
      ) : null}

      {linenObjects.length > 0 ? (
        <InspectorSection
          icon={Shirt}
          eyebrow={`Bulk edit · ${linenObjects.length} tables`}
          title="Table linen"
        >
          <SwatchGrid
            label="Linen colour"
            noneLabel="Bare"
            mixed={linen.mixed}
            value={linen.value as DrapeColor | null | undefined}
            onChange={(linenColor) =>
              patchObjects(
                (object) => LINEN_OBJECT_TYPES.includes(object.type),
                { linenColor }
              )
            }
          />
        </InspectorSection>
      ) : null}

      {objects.length > 0 ? (
        <InspectorSection
          icon={Palette}
          eyebrow={`Bulk edit · ${objects.length} objects`}
          title="Custom tint"
        >
          <TintField
            value={tint.mixed ? undefined : tint.value}
            mixed={tint.mixed}
            onChange={(color) => patchObjects(() => true, { color })}
          />
        </InspectorSection>
      ) : null}
    </div>
  );
}

function ArrangeButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof RotateCw;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-card/35 px-2 text-[0.68rem] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function MixedBadge() {
  return (
    <span className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[0.58rem] text-muted-foreground">
      Mixed
    </span>
  );
}

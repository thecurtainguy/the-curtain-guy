"use client";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STUDIO_MAX_DRAPE_RUNS,
  STUDIO_MAX_TREATMENTS,
  getCeilingDrapes,
  getStudioObjectOption,
  type StudioDesignJson,
  type StudioOpening,
} from "@/data/studio";
import {
  STUDIO_OPENING_PRESETS,
  createOpeningFromPreset,
  getOpeningPreset,
  getOpeningStyle,
  type StudioOpeningPresetGroup,
} from "@/data/studio-openings";
import {
  arrangeStudioItems,
  findStudioItem,
  getAllStudioItemIds,
  type StudioAlignMode,
  type StudioArrangeMode,
  type StudioItemKind,
  type StudioItemRef,
} from "@/lib/studio-commands";
import { drapeRunUsesDoorGaps } from "@/lib/studio-door-gaps";
import { getWallSegments } from "@/lib/studio-geometry";
import {
  createTreatmentForOpening,
  getOpeningTreatmentOptions,
  treatmentDressesOpening,
} from "@/lib/studio-treatments";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  AppWindow,
  Armchair,
  ArrowDown,
  ArrowUp,
  BoxSelect,
  BringToFront,
  Check,
  ClipboardPaste,
  Copy,
  CopyPlus,
  DoorOpen,
  Eye,
  EyeOff,
  Focus,
  Grid3x3,
  Keyboard,
  LampCeiling,
  Layers,
  LayoutGrid,
  Lock,
  LockOpen,
  Magnet,
  PanelsTopLeft,
  Redo2,
  RotateCcw,
  RotateCw,
  RulerDimensionLine,
  Scan,
  ScissorsLineDashed,
  SendToBack,
  SlidersHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  Tag,
  Theater,
  Trash2,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useStudioDesign,
  useStudioEditorActions,
  useStudioHistory,
  useStudioSelection,
  useStudioSettings,
  type StudioEditorSettings,
} from "../editor/studio-editor-context";
import {
  DEFAULT_DRAPE_STYLE,
  createFullWallDrape,
  isWallDraped,
} from "../library/library-drapery-tab";
import { STUDIO_OBJECT_ICONS } from "../library/studio-library-icons";
import { formatStudioFeet } from "../library/studio-library-placement";
import { STUDIO_MAX_OPENINGS } from "../openings/opening-preset-grid";
import { OpeningStyleGlyph } from "../openings/opening-style-glyph";
import {
  registerStudioContextMenuHost,
  type StudioContextRequest,
} from "./context-menu-store";

type OpenRequest = StudioContextRequest & { key: number };

/**
 * Right-click menu for the 2D plan and 3D view. Canvases report what is under
 * the pointer through `requestStudioContextMenu`; this selects it (keeping a
 * multi-selection it belongs to) and opens the menu at the pointer.
 */
export function StudioContextMenu({ disabled = false }: { disabled?: boolean }) {
  const actions = useStudioEditorActions();
  const { selectedIds } = useStudioSelection();
  const selectedRef = useRef(selectedIds);
  const keyRef = useRef(0);
  const [request, setRequest] = useState<OpenRequest | null>(null);

  useEffect(() => {
    selectedRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (disabled) return;
    return registerStudioContextMenuHost((next) => {
      const { target } = next;
      if (target?.kind === "wall") actions.select(target);
      else if (target && !selectedRef.current.includes(target.id)) actions.select(target);
      keyRef.current += 1;
      setRequest({ ...next, key: keyRef.current });
    });
  }, [actions, disabled]);

  if (!request || disabled) return null;

  return (
    <DropdownMenu
      key={request.key}
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) setRequest(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed size-px"
          style={{ left: request.x, top: request.y }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={2}
        collisionPadding={10}
        className="w-64 border border-border/50"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <StudioContextMenuBody request={request} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type FoundItem = StudioItemRef & { id: string };

const KIND_META: Record<
  StudioItemKind,
  { label: string; singular: string; plural: string; icon: LucideIcon }
> = {
  object: { label: "Furniture & decor", singular: "piece", plural: "pieces", icon: Armchair },
  drape: { label: "Drape run", singular: "drape", plural: "drapes", icon: ScissorsLineDashed },
  treatment: { label: "Treatment", singular: "treatment", plural: "treatments", icon: Sparkles },
  opening: { label: "Opening", singular: "opening", plural: "openings", icon: DoorOpen },
  ceiling: { label: "Ceiling drape", singular: "ceiling drape", plural: "ceiling drapes", icon: LampCeiling },
};

const ALIGN_OPTIONS: Array<{ mode: StudioAlignMode; label: string; icon: LucideIcon }> = [
  { mode: "left", label: "Left", icon: AlignStartVertical },
  { mode: "center_x", label: "Centre", icon: AlignCenterVertical },
  { mode: "right", label: "Right", icon: AlignEndVertical },
  { mode: "top", label: "Top", icon: AlignStartHorizontal },
  { mode: "center_z", label: "Middle", icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Bottom", icon: AlignEndHorizontal },
];

const ARRANGE_OPTIONS: Array<{
  mode: StudioArrangeMode;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}> = [
  { mode: "front", label: "Bring to front", shortcut: "Ctrl ⇧ ]", icon: BringToFront },
  { mode: "forward", label: "Bring forward", shortcut: "Ctrl ]", icon: ArrowUp },
  { mode: "backward", label: "Send backward", shortcut: "Ctrl [", icon: ArrowDown },
  { mode: "back", label: "Send to back", shortcut: "Ctrl ⇧ [", icon: SendToBack },
];

type PlanToggleKey = keyof Pick<
  StudioEditorSettings,
  "snapEnabled" | "showGrid" | "showDimensions" | "showLabels" | "showSeating"
>;

const PLAN_TOGGLES: Array<{
  key: PlanToggleKey;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  planOnly?: boolean;
}> = [
  { key: "snapEnabled", label: "Snap to grid", icon: Magnet, shortcut: "G", planOnly: true },
  { key: "showGrid", label: "Grid", icon: Grid3x3, planOnly: true },
  { key: "showDimensions", label: "Dimensions", icon: RulerDimensionLine, planOnly: true },
  { key: "showLabels", label: "Labels", icon: Tag, planOnly: true },
  { key: "showSeating", label: "Seating", icon: Armchair },
];

const OPENING_GROUPS: Array<{ group: StudioOpeningPresetGroup; label: string; icon: LucideIcon }> = [
  { group: "doors", label: "Add a door", icon: DoorOpen },
  { group: "windows", label: "Add a window", icon: AppWindow },
];

function itemWallIndex(found: FoundItem): number | null {
  if (found.kind === "drape" || found.kind === "opening") return found.item.wallIndex;
  if (found.kind === "treatment") return found.item.anchor.wallIndex;
  return null;
}

function itemIcon(found: FoundItem): LucideIcon {
  if (found.kind === "object") return STUDIO_OBJECT_ICONS[found.item.type] ?? Armchair;
  if (found.kind === "opening" && found.item.type === "window") return AppWindow;
  return KIND_META[found.kind].icon;
}

function itemDetail(found: FoundItem): string {
  const wall = itemWallIndex(found);
  const parts: string[] = [];
  if (found.kind === "object") {
    parts.push(getStudioObjectOption(found.item.type)?.label ?? KIND_META.object.label);
  } else if (found.kind === "drape") {
    parts.push(formatStudioFeet(found.item.endOffset - found.item.startOffset));
  } else if (found.kind === "opening") {
    parts.push(getOpeningPreset(getOpeningStyle(found.item)).label);
  } else {
    parts.push(KIND_META[found.kind].label);
  }
  if (wall !== null) parts.push(`Wall ${wall + 1}`);
  if (found.item.locked) parts.push("Locked");
  if (found.item.hidden) parts.push("Hidden");
  return parts.join(" · ");
}

function summarizeKinds(items: readonly FoundItem[]): string {
  const counts = new Map<StudioItemKind, number>();
  for (const found of items) counts.set(found.kind, (counts.get(found.kind) ?? 0) + 1);
  return [...counts]
    .map(([kind, count]) => {
      const meta = KIND_META[kind];
      return `${count} ${count === 1 ? meta.singular : meta.plural}`;
    })
    .join(" · ");
}

/** Items of the same kind (and same furniture / opening type). */
function findSimilarIds(design: StudioDesignJson, found: FoundItem): string[] {
  switch (found.kind) {
    case "object":
      return design.objects
        .filter((object) => object.type === found.item.type)
        .map((object) => object.id);
    case "opening":
      return design.openings
        .filter((opening) => opening.type === found.item.type)
        .map((opening) => opening.id);
    case "drape":
      return design.drapeRuns.map((run) => run.id);
    case "treatment":
      return design.treatments.map((treatment) => treatment.id);
    case "ceiling":
      return getCeilingDrapes(design).map((drape) => drape.id);
  }
}

function similarLabel(found: FoundItem, count: number): string {
  if (found.kind === "object") {
    const label = getStudioObjectOption(found.item.type)?.label ?? "pieces";
    return `Select all ${count} × ${label.toLowerCase()}`;
  }
  if (found.kind === "opening") {
    const noun = found.item.type === "window" ? "windows" : found.item.type === "door" ? "doors" : "entrances";
    return `Select all ${count} ${noun}`;
  }
  return `Select all ${count} ${KIND_META[found.kind].plural}`;
}

function wallItemIds(design: StudioDesignJson, wallIndex: number): string[] {
  return [
    ...design.drapeRuns.filter((run) => run.wallIndex === wallIndex).map((run) => run.id),
    ...design.treatments
      .filter((treatment) => treatment.anchor.wallIndex === wallIndex)
      .map((treatment) => treatment.id),
    ...design.openings.filter((opening) => opening.wallIndex === wallIndex).map((opening) => opening.id),
  ];
}

/** Portalled so a submenu is never clipped by the scrollable parent menu. */
function SubMenuContent(props: React.ComponentProps<typeof DropdownMenuSubContent>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuSubContent collisionPadding={10} {...props} />
    </DropdownMenuPortal>
  );
}

function MenuHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <DropdownMenuLabel className="flex items-center gap-2.5 px-2 pt-1.5 pb-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-heading text-sm leading-tight text-foreground">
          {title}
        </span>
        <span className="block truncate text-[0.66rem] font-normal text-muted-foreground">
          {detail}
        </span>
      </span>
    </DropdownMenuLabel>
  );
}

function StudioContextMenuBody({ request }: { request: OpenRequest }) {
  const design = useStudioDesign();
  const { selectedIds } = useStudioSelection();
  const actions = useStudioEditorActions();

  const items: FoundItem[] = selectedIds.flatMap((id) => {
    const found = findStudioItem(design, id);
    return found ? [{ ...found, id }] : [];
  });
  const wall =
    request.target?.kind === "wall"
      ? getWallSegments(design.room.floor)[request.target.index]
      : undefined;

  if (wall) return <WallMenu design={design} wall={wall} />;
  if (request.target && items.length > 0) return <ItemsMenu design={design} items={items} />;
  return (
    <CanvasMenu
      design={design}
      surface={request.surface}
      hasSelection={selectedIds.length > 0}
      onClearSelection={() => actions.select(null)}
    />
  );
}

function PasteItem() {
  const { commands } = useStudioEditorActions();
  return (
    <DropdownMenuItem disabled={!commands.canPaste()} onSelect={commands.paste}>
      <ClipboardPaste aria-hidden />
      Paste
      <DropdownMenuShortcut>Ctrl V</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}

function ItemsMenu({ design, items }: { design: StudioDesignJson; items: FoundItem[] }) {
  const actions = useStudioEditorActions();
  const settings = useStudioSettings();
  const { commands } = actions;

  const single = items.length === 1 ? items[0] : null;
  const unlocked = items.filter((found) => !found.item.locked);
  const rotatable = unlocked.some((found) => found.kind === "object" || found.kind === "ceiling");
  const arrangeable = unlocked.filter((found) => found.kind === "object").length;
  const allLocked = items.every((found) => found.item.locked);
  const allHidden = items.every((found) => found.item.hidden);
  const similarIds = single ? findSimilarIds(design, single) : [];
  const singleWall = single ? itemWallIndex(single) : null;
  const step = settings.rotationSnap || 15;
  const itemIds = items.map((found) => found.id);
  const arrangeModes = new Set(
    ARRANGE_OPTIONS.filter(
      (option) => arrangeStudioItems(design, itemIds, option.mode) !== design
    ).map((option) => option.mode)
  );

  return (
    <>
      {single ? (
        <MenuHeader
          icon={itemIcon(single)}
          title={single.item.label || KIND_META[single.kind].label}
          detail={itemDetail(single)}
        />
      ) : (
        <MenuHeader icon={BoxSelect} title={`${items.length} selected`} detail={summarizeKinds(items)} />
      )}
      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={commands.duplicate}>
          <CopyPlus aria-hidden />
          Duplicate
          <DropdownMenuShortcut>Ctrl D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={commands.copy}>
          <Copy aria-hidden />
          Copy
          <DropdownMenuShortcut>Ctrl C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <PasteItem />
      </DropdownMenuGroup>

      {rotatable || arrangeable >= 2 || arrangeModes.size > 0 ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {rotatable ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RotateCw aria-hidden />
                  Rotate
                </DropdownMenuSubTrigger>
                <SubMenuContent className="w-48">
                  <DropdownMenuItem onSelect={() => commands.rotate(step)}>
                    <RotateCw aria-hidden />
                    {step}° clockwise
                    <DropdownMenuShortcut>R</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => commands.rotate(-step)}>
                    <RotateCcw aria-hidden />
                    {step}° counter
                    <DropdownMenuShortcut>⇧R</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => commands.rotate(90)}>
                    <RotateCw aria-hidden />
                    90° clockwise
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => commands.rotate(-90)}>
                    <RotateCcw aria-hidden />
                    90° counter
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => commands.rotate(180)}>
                    <RotateCw aria-hidden />
                    Turn around (180°)
                  </DropdownMenuItem>
                </SubMenuContent>
              </DropdownMenuSub>
            ) : null}
            {arrangeable >= 2 ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <AlignStartVertical aria-hidden />
                  Align
                </DropdownMenuSubTrigger>
                <SubMenuContent className="w-44">
                  {ALIGN_OPTIONS.map((option) => (
                    <DropdownMenuItem key={option.mode} onSelect={() => commands.align(option.mode)}>
                      <option.icon aria-hidden />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                  {arrangeable >= 3 ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => commands.distribute("x")}>
                        <AlignHorizontalSpaceAround aria-hidden />
                        Space evenly across
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => commands.distribute("z")}>
                        <AlignVerticalSpaceAround aria-hidden />
                        Space evenly down
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </SubMenuContent>
              </DropdownMenuSub>
            ) : null}
            {arrangeModes.size > 0 ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Layers aria-hidden />
                  Arrange
                </DropdownMenuSubTrigger>
                <SubMenuContent className="w-56">
                  {ARRANGE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.mode}
                      disabled={!arrangeModes.has(option.mode)}
                      onSelect={() => commands.arrange(option.mode)}
                    >
                      <option.icon aria-hidden />
                      {option.label}
                      <DropdownMenuShortcut>{option.shortcut}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ))}
                </SubMenuContent>
              </DropdownMenuSub>
            ) : null}
          </DropdownMenuGroup>
        </>
      ) : null}

      {single?.kind === "opening" ? <DressOpeningSub design={design} opening={single.item} /> : null}
      {single?.kind === "drape" ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={drapeRunUsesDoorGaps(single.item)}
            onCheckedChange={(on) => {
              const run = { ...single.item };
              if (on) delete run.doorGaps;
              else run.doorGaps = false;
              actions.commit({
                ...design,
                drapeRuns: design.drapeRuns.map((item) => (item.id === run.id ? run : item)),
              });
            }}
          >
            <DoorOpen aria-hidden />
            Keep doors clear
          </DropdownMenuCheckboxItem>
        </>
      ) : null}

      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        {single && similarIds.length > 1 ? (
          <DropdownMenuItem onSelect={() => actions.selectIds(similarIds)}>
            <SquareDashedMousePointer aria-hidden />
            <span className="truncate">{similarLabel(single, similarIds.length)}</span>
          </DropdownMenuItem>
        ) : null}
        {singleWall !== null ? (
          <DropdownMenuItem onSelect={() => actions.select({ kind: "wall", index: singleWall })}>
            <PanelsTopLeft aria-hidden />
            Select Wall {singleWall + 1}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => actions.sendCanvasCommand({ type: "focus_selection" })}>
          <Focus aria-hidden />
          Frame in view
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => commands.setLocked()}>
          {allLocked ? <LockOpen aria-hidden /> : <Lock aria-hidden />}
          {allLocked ? "Unlock" : "Lock"}
          <DropdownMenuShortcut>L</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => commands.setHidden()}>
          {allHidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
          {allHidden ? "Show" : "Hide"}
          <DropdownMenuShortcut>H</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={commands.remove}>
        <Trash2 aria-hidden />
        {items.length > 1 ? `Delete ${items.length} items` : "Delete"}
        <DropdownMenuShortcut>Del</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}

function DressOpeningSub({ design, opening }: { design: StudioDesignJson; opening: StudioOpening }) {
  const actions = useStudioEditorActions();
  const full = design.treatments.length >= STUDIO_MAX_TREATMENTS;
  const isWindow = opening.type === "window";
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Theater aria-hidden />
          Dress this {isWindow ? "window" : "doorway"}
        </DropdownMenuSubTrigger>
        <SubMenuContent className="w-60">
          {getOpeningTreatmentOptions(opening).map((option) => {
            const existing = design.treatments.find((treatment) =>
              treatmentDressesOpening(treatment, opening, option.key)
            );
            return (
              <DropdownMenuItem
                key={option.key}
                disabled={!existing && full}
                onSelect={() => {
                  if (existing) {
                    actions.select({ kind: "treatment", id: existing.id });
                    return;
                  }
                  const treatment = createTreatmentForOpening(design, opening.id, option.key);
                  if (!treatment) return;
                  actions.commit({ ...design, treatments: [...design.treatments, treatment] });
                  actions.select({ kind: "treatment", id: treatment.id });
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  <span className="block truncate text-[0.66rem] text-muted-foreground">
                    {existing ? "Added — select it" : option.description}
                  </span>
                </span>
                {existing ? <Check className="text-primary" aria-hidden /> : null}
              </DropdownMenuItem>
            );
          })}
        </SubMenuContent>
      </DropdownMenuSub>
    </>
  );
}

function WallMenu({
  design,
  wall,
}: {
  design: StudioDesignJson;
  wall: { index: number; length: number };
}) {
  const actions = useStudioEditorActions();
  const draped = isWallDraped(design, wall);
  const runsFull = design.drapeRuns.length >= STUDIO_MAX_DRAPE_RUNS;
  const openingsFull = design.openings.length >= STUDIO_MAX_OPENINGS;
  const onWall = wallItemIds(design, wall.index);
  const latestRun = design.drapeRuns[design.drapeRuns.length - 1];
  const style = latestRun
    ? { fabric: latestRun.fabric, color: latestRun.color }
    : DEFAULT_DRAPE_STYLE;

  return (
    <>
      <MenuHeader
        icon={PanelsTopLeft}
        title={`Wall ${wall.index + 1}`}
        detail={`${formatStudioFeet(wall.length)} long · ${onWall.length} item${onWall.length === 1 ? "" : "s"} on it`}
      />
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          disabled={draped || runsFull}
          onSelect={() => {
            const run = createFullWallDrape(design, wall, style);
            actions.commit({ ...design, drapeRuns: [...design.drapeRuns, run] });
            actions.select({ kind: "drape", id: run.id });
          }}
        >
          <ScissorsLineDashed aria-hidden />
          {draped ? "Already draped" : "Drape this wall"}
        </DropdownMenuItem>
        {OPENING_GROUPS.map(({ group, label, icon: Icon }) => (
          <DropdownMenuSub key={group}>
            <DropdownMenuSubTrigger disabled={openingsFull}>
              <Icon aria-hidden />
              {label}
            </DropdownMenuSubTrigger>
            <SubMenuContent className="w-64">
              {STUDIO_OPENING_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                <DropdownMenuItem
                  key={preset.style}
                  onSelect={() => {
                    const opening = createOpeningFromPreset(design, preset.style, wall.index, wall.length);
                    actions.commit({ ...design, openings: [...design.openings, opening] });
                    actions.select({ kind: "opening", id: opening.id });
                  }}
                >
                  <OpeningStyleGlyph style={preset.style} className="size-7 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{preset.label}</span>
                    <span className="block truncate text-[0.66rem] text-muted-foreground">
                      {preset.description}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </SubMenuContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={onWall.length === 0} onSelect={() => actions.selectIds(onWall)}>
        <SquareDashedMousePointer aria-hidden />
        Select everything on this wall
      </DropdownMenuItem>
      <PasteItem />
    </>
  );
}

function CanvasMenu({
  design,
  surface,
  hasSelection,
  onClearSelection,
}: {
  design: StudioDesignJson;
  surface: StudioContextRequest["surface"];
  hasSelection: boolean;
  onClearSelection: () => void;
}) {
  const actions = useStudioEditorActions();
  const settings = useStudioSettings();
  const { canUndo, canRedo } = useStudioHistory();
  const total = getAllStudioItemIds(design).length;
  const toggles = PLAN_TOGGLES.filter((toggle) => surface === "2d" || !toggle.planOnly);

  return (
    <>
      <MenuHeader
        icon={surface === "2d" ? LayoutGrid : Scan}
        title={design.room.name || "Room"}
        detail={`${surface === "2d" ? "Floor plan" : "3D view"} · ${total} item${total === 1 ? "" : "s"}`}
      />
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <PasteItem />
        <DropdownMenuItem disabled={total === 0} onSelect={actions.commands.selectAll}>
          <SquareDashedMousePointer aria-hidden />
          Select all
          <DropdownMenuShortcut>Ctrl A</DropdownMenuShortcut>
        </DropdownMenuItem>
        {hasSelection ? (
          <DropdownMenuItem onSelect={onClearSelection}>
            <X aria-hidden />
            Clear selection
            <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem disabled={!canUndo} onSelect={actions.undo}>
          <Undo2 aria-hidden />
          Undo
          <DropdownMenuShortcut>Ctrl Z</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canRedo} onSelect={actions.redo}>
          <Redo2 aria-hidden />
          Redo
          <DropdownMenuShortcut>Ctrl ⇧ Z</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => actions.sendCanvasCommand({ type: "fit" })}>
        <Scan aria-hidden />
        Fit room to view
        <DropdownMenuShortcut>F</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <SlidersHorizontal aria-hidden />
          View options
        </DropdownMenuSubTrigger>
        <SubMenuContent className="w-48">
          {toggles.map((toggle) => (
            <DropdownMenuCheckboxItem
              key={toggle.key}
              checked={settings[toggle.key]}
              onCheckedChange={(checked) => actions.updateSettings({ [toggle.key]: checked })}
              onSelect={(event) => event.preventDefault()}
            >
              <toggle.icon aria-hidden />
              {toggle.label}
              {toggle.shortcut ? <DropdownMenuShortcut>{toggle.shortcut}</DropdownMenuShortcut> : null}
            </DropdownMenuCheckboxItem>
          ))}
        </SubMenuContent>
      </DropdownMenuSub>
      <DropdownMenuItem onSelect={() => actions.setShortcutsOpen(true)}>
        <Keyboard aria-hidden />
        Keyboard shortcuts
        <DropdownMenuShortcut>?</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}

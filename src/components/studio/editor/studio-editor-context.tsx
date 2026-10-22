"use client";

import type {
  CeilingDrapeStyle,
  StudioCeilingDrape,
  StudioDesignJson,
} from "@/data/studio";
import { addCeilingDrape, createCeilingDrape } from "@/lib/studio-ceiling";
import {
  alignStudioObjects,
  copyStudioItems,
  distributeStudioObjects,
  duplicateStudioItems,
  findStudioItem,
  getAllStudioItemIds,
  nudgeStudioItems,
  pasteStudioItems,
  removeStudioItems,
  rotateStudioItems,
  rotateStudioItemsAsGroup,
  setStudioItemsFlag,
  type StudioAlignMode,
  type StudioClipboard,
  type StudioDistributeAxis,
  type StudioItemKind,
} from "@/lib/studio-commands";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StudioSelection, StudioViewMode } from "../studio-types";

export type StudioQuality = "draft" | "high" | "ultra";
export type StudioTool = "select" | "pan" | "measure";
export type StudioCameraView =
  | "perspective"
  | "top"
  | "front"
  | "guest"
  | "showcase"
  | "stage"
  | "corner"
  | "walk"
  | "ceiling"
  | "dollhouse";

export type StudioLayerKey =
  | "drapes"
  | "treatments"
  | "objects"
  | "openings"
  | "ceiling";

export type StudioEditorSettings = {
  snapEnabled: boolean;
  /** Grid / snap step in inches (1, 3, 6, 12, 24). */
  snapIncrement: number;
  /** Rotation snap step in degrees when snapping. */
  rotationSnap: number;
  smartGuides: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  showLabels: boolean;
  /** Render chairs around seated objects (2D + 3D). */
  showSeating: boolean;
  layers: Record<StudioLayerKey, boolean>;
  quality: StudioQuality;
  tool: StudioTool;
  /** 3D: slowly orbit the room. */
  autoRotate: boolean;
};

export const DEFAULT_STUDIO_EDITOR_SETTINGS: StudioEditorSettings = {
  snapEnabled: true,
  snapIncrement: 12,
  rotationSnap: 15,
  smartGuides: true,
  showGrid: true,
  showDimensions: true,
  showLabels: true,
  showSeating: true,
  layers: {
    drapes: true,
    treatments: true,
    objects: true,
    openings: true,
    ceiling: true,
  },
  quality: "high",
  tool: "select",
  autoRotate: false,
};

export const STUDIO_SNAP_INCREMENTS = [1, 3, 6, 12, 24] as const;

export type StudioCanvasCommand =
  | { type: "fit"; nonce: number }
  | { type: "reset"; nonce: number }
  | { type: "zoom"; direction: "in" | "out"; nonce: number }
  | { type: "camera"; view: StudioCameraView; nonce: number }
  | { type: "focus_selection"; nonce: number };

type CanvasCommandInput =
  | { type: "fit" }
  | { type: "reset" }
  | { type: "zoom"; direction: "in" | "out" }
  | { type: "camera"; view: StudioCameraView }
  | { type: "focus_selection" };

export type StudioSelectOptions = {
  /** Shift/Ctrl-click: toggle the item in the multi-selection. */
  additive?: boolean;
};

export type StudioEditorCommands = {
  duplicate: () => void;
  remove: () => void;
  /** Inches. Objects move; wall items slide along their wall. */
  nudge: (dx: number, dz: number) => void;
  /** Degrees. Multi-selection rotates as a group. */
  rotate: (degrees: number) => void;
  align: (mode: StudioAlignMode) => void;
  distribute: (axis: StudioDistributeAxis) => void;
  /** Toggles when `value` is omitted. */
  setLocked: (value?: boolean) => void;
  setHidden: (value?: boolean) => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
};

export type StudioEditorContextValue = {
  design: StudioDesignJson;
  /** Records an undoable change. Rapid successive commits coalesce. */
  commit: (next: StudioDesignJson, options?: { coalesceKey?: string }) => void;
  /** Start a gesture (drag). Use `preview` during it, then `endTransaction`. */
  beginTransaction: () => void;
  /** Applies a change without creating history (during a transaction). */
  preview: (next: StudioDesignJson) => void;
  /** Closes the gesture as one undo step. */
  endTransaction: () => void;
  /** Restores the design from before `beginTransaction`. */
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  /** Primary selection — drives the inspector. */
  selection: StudioSelection;
  /** Every selected item id (objects, drapes, treatments, openings). */
  selectedIds: string[];
  select: (selection: StudioSelection, options?: StudioSelectOptions) => void;
  selectIds: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;

  settings: StudioEditorSettings;
  updateSettings: (patch: Partial<StudioEditorSettings>) => void;
  toggleLayer: (layer: StudioLayerKey) => void;

  viewMode: StudioViewMode;
  setViewMode: (mode: StudioViewMode) => void;

  canvasCommand: StudioCanvasCommand | null;
  sendCanvasCommand: (command: CanvasCommandInput) => void;

  /** The 3D viewer registers a capture function; returns a PNG data URL. */
  registerSnapshot: (capture: (() => string | null) | null) => void;
  takeSnapshot: () => string | null;
  canSnapshot: boolean;

  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  commands: StudioEditorCommands;
};

const StudioEditorContext = createContext<StudioEditorContextValue | null>(
  null
);

export function useStudioEditor(): StudioEditorContextValue {
  const value = useContext(StudioEditorContext);
  if (!value) {
    throw new Error("useStudioEditor must be used inside StudioEditorProvider");
  }
  return value;
}

/** For components that also render outside the Studio (e.g. event builder). */
export function useOptionalStudioEditor(): StudioEditorContextValue | null {
  return useContext(StudioEditorContext);
}

export const StudioEditorProvider = StudioEditorContext.Provider;

const SETTINGS_STORAGE_KEY = "tcg-studio-editor-settings-v1";
const HISTORY_LIMIT = 120;
const COALESCE_MS = 450;

function loadSettings(): StudioEditorSettings {
  if (typeof window === "undefined") return DEFAULT_STUDIO_EDITOR_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_STUDIO_EDITOR_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StudioEditorSettings>;
    return {
      ...DEFAULT_STUDIO_EDITOR_SETTINGS,
      ...parsed,
      layers: {
        ...DEFAULT_STUDIO_EDITOR_SETTINGS.layers,
        ...(parsed.layers ?? {}),
      },
      tool: "select",
      autoRotate: false,
    };
  } catch {
    return DEFAULT_STUDIO_EDITOR_SETTINGS;
  }
}

function selectionId(selection: StudioSelection): string | null {
  if (!selection || selection.kind === "wall") return null;
  return selection.id;
}

function selectionForId(
  design: StudioDesignJson,
  id: string
): StudioSelection {
  const found = findStudioItem(design, id);
  if (!found) return null;
  return { kind: found.kind, id } as { kind: StudioItemKind; id: string };
}

/**
 * Owns undo/redo, selection, settings and canvas signals for one Studio.
 * `onDesignChange` must be the designer's raw state setter (marks dirty).
 */
export function useStudioEditorState({
  design,
  onDesignChange,
  initialViewMode = "3d",
}: {
  design: StudioDesignJson;
  onDesignChange: (next: StudioDesignJson) => void;
  initialViewMode?: StudioViewMode;
}): StudioEditorContextValue {
  const designRef = useRef(design);
  useLayoutEffect(() => {
    designRef.current = design;
  }, [design]);
  const past = useRef<StudioDesignJson[]>([]);
  const future = useRef<StudioDesignJson[]>([]);
  const lastCommit = useRef<{ at: number; key: string }>({ at: 0, key: "" });
  const transactionBase = useRef<StudioDesignJson | null>(null);
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });
  const bumpHistory = useCallback(
    () =>
      setHistoryState({
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
      }),
    []
  );

  const [selection, setSelection] = useState<StudioSelection>(null);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const setSelectedIds = useCallback(
    (next: string[] | ((current: string[]) => string[])) => {
      const value =
        typeof next === "function" ? next(selectedIdsRef.current) : next;
      selectedIdsRef.current = value;
      setSelectedIdsState(value);
    },
    []
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudioEditorSettings>(
    DEFAULT_STUDIO_EDITOR_SETTINGS
  );
  const [viewMode, setViewMode] = useState<StudioViewMode>(initialViewMode);
  const [canvasCommand, setCanvasCommand] =
    useState<StudioCanvasCommand | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const [canSnapshot, setCanSnapshot] = useState(false);
  const clipboard = useRef<StudioClipboard | null>(null);
  const pasteCount = useRef(0);
  const settingsLoaded = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSettings(loadSettings());
      settingsLoaded.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!settingsLoaded.current) return;
    try {
      const persisted: Partial<StudioEditorSettings> = { ...settings };
      delete persisted.tool;
      delete persisted.autoRotate;
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Settings persistence is best-effort.
    }
  }, [settings]);

  const pushPast = useCallback((snapshot: StudioDesignJson) => {
    past.current.push(snapshot);
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
  }, []);

  const commitRef = useRef<StudioEditorContextValue["commit"] | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hook = {
      design: () => designRef.current,
      commit: (next: StudioDesignJson) => commitRef.current?.(next),
      addCeiling: (
        style: CeilingDrapeStyle,
        overrides: Partial<Omit<StudioCeilingDrape, "id" | "type">> = {}
      ) => {
        const drape = createCeilingDrape(style, designRef.current.room.floor, overrides);
        commitRef.current?.(addCeilingDrape(designRef.current, drape));
        return drape.id;
      },
    };
    (window as unknown as { __tcgStudio?: typeof hook }).__tcgStudio = hook;
    return () => {
      delete (window as unknown as { __tcgStudio?: typeof hook }).__tcgStudio;
    };
  }, []);

  const commit = useCallback<StudioEditorContextValue["commit"]>(
    (next, options) => {
      const current = designRef.current;
      if (next === current) return;
      if (transactionBase.current) {
        designRef.current = next;
        onDesignChange(next);
        return;
      }
      const now = Date.now();
      const key = options?.coalesceKey ?? "";
      const coalesce =
        now - lastCommit.current.at < COALESCE_MS &&
        lastCommit.current.key === key &&
        past.current.length > 0;
      if (!coalesce) pushPast(current);
      else future.current = [];
      lastCommit.current = { at: now, key };
      designRef.current = next;
      onDesignChange(next);
      bumpHistory();
    },
    [bumpHistory, onDesignChange, pushPast]
  );
  useLayoutEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const beginTransaction = useCallback(() => {
    if (!transactionBase.current) transactionBase.current = designRef.current;
  }, []);

  const preview = useCallback(
    (next: StudioDesignJson) => {
      if (!transactionBase.current) transactionBase.current = designRef.current;
      designRef.current = next;
      onDesignChange(next);
    },
    [onDesignChange]
  );

  const endTransaction = useCallback(() => {
    const base = transactionBase.current;
    transactionBase.current = null;
    if (base && base !== designRef.current) {
      pushPast(base);
      lastCommit.current = { at: 0, key: "" };
      bumpHistory();
    }
  }, [bumpHistory, pushPast]);

  const cancelTransaction = useCallback(() => {
    const base = transactionBase.current;
    transactionBase.current = null;
    if (base && base !== designRef.current) {
      designRef.current = base;
      onDesignChange(base);
    }
  }, [onDesignChange]);

  const undo = useCallback(() => {
    if (transactionBase.current) return;
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(designRef.current);
    lastCommit.current = { at: 0, key: "" };
    designRef.current = previous;
    onDesignChange(previous);
    bumpHistory();
  }, [bumpHistory, onDesignChange]);

  const redo = useCallback(() => {
    if (transactionBase.current) return;
    const next = future.current.pop();
    if (!next) return;
    past.current.push(designRef.current);
    lastCommit.current = { at: 0, key: "" };
    designRef.current = next;
    onDesignChange(next);
    bumpHistory();
  }, [bumpHistory, onDesignChange]);

  const select = useCallback<StudioEditorContextValue["select"]>(
    (next, options) => {
      if (!next) {
        setSelection(null);
        setSelectedIds([]);
        return;
      }
      if (next.kind === "wall") {
        setSelection(next);
        setSelectedIds([]);
        return;
      }
      if (options?.additive) {
        const current = selectedIdsRef.current;
        if (current.includes(next.id)) {
          const remaining = current.filter((id) => id !== next.id);
          const last = remaining[remaining.length - 1];
          setSelectedIds(remaining);
          setSelection(last ? selectionForId(designRef.current, last) : null);
          return;
        }
        setSelectedIds([...current, next.id]);
        setSelection(next);
        return;
      }
      setSelection(next);
      setSelectedIds([next.id]);
    },
    [setSelectedIds]
  );

  const selectIds = useCallback((ids: string[]) => {
    const unique = [...new Set(ids)].filter((id) =>
      Boolean(findStudioItem(designRef.current, id))
    );
    setSelectedIds(unique);
    const last = unique[unique.length - 1];
    setSelection(last ? selectionForId(designRef.current, last) : null);
  }, [setSelectedIds]);

  // Keep the selection consistent when items disappear (undo, delete, rails).
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedIds((current) => {
        const filtered = current.filter((id) =>
          Boolean(findStudioItem(design, id))
        );
        return filtered.length === current.length ? current : filtered;
      });
      setSelection((current) => {
        const id = selectionId(current);
        if (id && !findStudioItem(design, id)) return null;
        if (
          current?.kind === "wall" &&
          current.index >= design.room.floor.length
        ) {
          return null;
        }
        return current;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [design, setSelectedIds]);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  const updateSettings = useCallback(
    (patch: Partial<StudioEditorSettings>) =>
      setSettings((current) => ({ ...current, ...patch })),
    []
  );

  const toggleLayer = useCallback(
    (layer: StudioLayerKey) =>
      setSettings((current) => ({
        ...current,
        layers: { ...current.layers, [layer]: !current.layers[layer] },
      })),
    []
  );

  const nonce = useRef(0);
  const sendCanvasCommand = useCallback((command: CanvasCommandInput) => {
    nonce.current += 1;
    setCanvasCommand({ ...command, nonce: nonce.current } as StudioCanvasCommand);
  }, []);

  const registerSnapshot = useCallback(
    (capture: (() => string | null) | null) => {
      snapshotRef.current = capture;
      setCanSnapshot(Boolean(capture));
    },
    []
  );
  const takeSnapshot = useCallback(() => snapshotRef.current?.() ?? null, []);

  const selectionRef = useRef<StudioSelection>(null);
  useLayoutEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  const activeIds = useCallback((): string[] => {
    if (selectedIdsRef.current.length > 0) return selectedIdsRef.current;
    const id = selectionId(selectionRef.current);
    return id ? [id] : [];
  }, []);

  const commands = useMemo<StudioEditorCommands>(
    () => ({
      duplicate() {
        const ids = activeIds();
        if (ids.length === 0) return;
        const result = duplicateStudioItems(designRef.current, ids);
        commit(result.design);
        selectIds(result.ids);
      },
      remove() {
        const ids = activeIds();
        if (ids.length === 0) return;
        commit(removeStudioItems(designRef.current, ids));
        setSelection(null);
        setSelectedIds([]);
      },
      nudge(dx, dz) {
        const ids = activeIds();
        if (ids.length === 0) return;
        commit(nudgeStudioItems(designRef.current, ids, dx, dz), {
          coalesceKey: "nudge",
        });
      },
      rotate(degrees) {
        const ids = activeIds();
        if (ids.length === 0) return;
        commit(
          ids.length > 1
            ? rotateStudioItemsAsGroup(designRef.current, ids, degrees)
            : rotateStudioItems(designRef.current, ids, degrees),
          { coalesceKey: "rotate" }
        );
      },
      align(mode) {
        commit(alignStudioObjects(designRef.current, activeIds(), mode));
      },
      distribute(axis) {
        commit(distributeStudioObjects(designRef.current, activeIds(), axis));
      },
      setLocked(value) {
        const ids = activeIds();
        if (ids.length === 0) return;
        const next =
          value ??
          !ids.every((id) => findStudioItem(designRef.current, id)?.item.locked);
        commit(setStudioItemsFlag(designRef.current, ids, "locked", next));
      },
      setHidden(value) {
        const ids = activeIds();
        if (ids.length === 0) return;
        const next =
          value ??
          !ids.every((id) => findStudioItem(designRef.current, id)?.item.hidden);
        commit(setStudioItemsFlag(designRef.current, ids, "hidden", next));
      },
      copy() {
        const ids = activeIds();
        if (ids.length === 0) return;
        clipboard.current = copyStudioItems(designRef.current, ids);
        pasteCount.current = 0;
      },
      paste() {
        if (!clipboard.current) return;
        pasteCount.current += 1;
        const result = pasteStudioItems(
          designRef.current,
          clipboard.current,
          24 * pasteCount.current
        );
        commit(result.design);
        selectIds(result.ids);
      },
      selectAll() {
        selectIds(getAllStudioItemIds(designRef.current));
      },
    }),
    [activeIds, commit, selectIds, setSelectedIds]
  );

  return useMemo<StudioEditorContextValue>(
    () => ({
      design,
      commit,
      beginTransaction,
      preview,
      endTransaction,
      cancelTransaction,
      undo,
      redo,
      canUndo: historyState.canUndo,
      canRedo: historyState.canRedo,
      selection,
      selectedIds,
      select,
      selectIds,
      isSelected,
      hoveredId,
      setHoveredId,
      settings,
      updateSettings,
      toggleLayer,
      viewMode,
      setViewMode,
      canvasCommand,
      sendCanvasCommand,
      registerSnapshot,
      takeSnapshot,
      canSnapshot,
      shortcutsOpen,
      setShortcutsOpen,
      commands,
    }),
    [
      beginTransaction,
      cancelTransaction,
      canSnapshot,
      canvasCommand,
      commands,
      commit,
      design,
      endTransaction,
      historyState,
      hoveredId,
      isSelected,
      preview,
      redo,
      registerSnapshot,
      select,
      selectIds,
      selectedIds,
      selection,
      sendCanvasCommand,
      settings,
      shortcutsOpen,
      takeSnapshot,
      toggleLayer,
      undo,
      updateSettings,
      viewMode,
    ]
  );
}

export const STUDIO_SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["Ctrl", "Z"], label: "Undo" },
  { keys: ["Ctrl", "Shift", "Z"], label: "Redo (also Ctrl+Y)" },
  { keys: ["Ctrl", "S"], label: "Save design" },
  { keys: ["Ctrl", "D"], label: "Duplicate selection" },
  { keys: ["Ctrl", "C"], label: "Copy selection" },
  { keys: ["Ctrl", "V"], label: "Paste" },
  { keys: ["Ctrl", "A"], label: "Select everything" },
  { keys: ["Delete"], label: "Remove selection" },
  { keys: ["Arrows"], label: "Nudge by snap step (Shift = 1″)" },
  { keys: ["R"], label: "Rotate +15° (Shift+R = −15°)" },
  { keys: ["L"], label: "Lock / unlock selection" },
  { keys: ["H"], label: "Hide / show selection" },
  { keys: ["G"], label: "Toggle grid snapping" },
  { keys: ["F"], label: "Fit view to room" },
  { keys: ["1"], label: "2D plan" },
  { keys: ["2"], label: "3D visualizer" },
  { keys: ["3"], label: "Split view" },
  { keys: ["Space", "Drag"], label: "Pan the 2D plan" },
  { keys: ["Shift", "Click"], label: "Add to selection" },
  { keys: ["Esc"], label: "Clear selection" },
  { keys: ["?"], label: "Show shortcuts" },
  { keys: ["Drag"], label: "3D in-room: look around (right-drag orbits the subject)" },
  { keys: ["W", "A", "S", "D"], label: "3D in-room: walk (Shift = run)" },
  { keys: ["Arrows"], label: "3D walk mode: walk instead of nudging" },
  { keys: ["Q", "E"], label: "3D in-room: lower / raise eye height" },
  { keys: ["Scroll"], label: "3D in-room: step forward / back" },
  { keys: ["Double-click"], label: "3D in-room: glide to a floor spot" },
];

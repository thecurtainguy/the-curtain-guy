"use client";

import type {
  CeilingDrapeStyle,
  StudioCeilingDrape,
  StudioDesignJson,
} from "@/data/studio";
import { addCeilingDrape, createCeilingDrape } from "@/lib/studio-ceiling";
import {
  alignStudioObjects,
  arrangeStudioItems,
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
  type StudioArrangeMode,
  type StudioClipboard,
  type StudioDistributeAxis,
  type StudioItemKind,
} from "@/lib/studio-commands";
import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StudioSelection, StudioViewMode } from "../studio-types";
import { getRecommendedStudioQuality } from "../three/device-tier";
import { setStudioHoveredId } from "./hover-store";

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
  /**
   * True once the user picked a quality. Until then `quality` follows the
   * device tier on every load. `updateSettings({ quality })` sets it unless
   * the patch passes `qualityExplicit: false` (automatic adjustments).
   */
  qualityExplicit?: boolean;
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

const STUDIO_QUALITIES: readonly StudioQuality[] = ["draft", "high", "ultra"];

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
  /** Paint order within each item's own collection. */
  arrange: (mode: StudioArrangeMode) => void;
  /** Toggles when `value` is omitted. */
  setLocked: (value?: boolean) => void;
  setHidden: (value?: boolean) => void;
  copy: () => void;
  paste: () => void;
  /** True once something was copied this session. */
  canPaste: () => boolean;
  selectAll: () => void;
};

export type StudioCommitOptions = {
  /** Commits with the same key within 450 ms merge into one undo step. */
  coalesceKey?: string;
};

/** Every callback is identity-stable for the lifetime of the Studio. */
export type StudioEditorActions = {
  /** Records an undoable change. Rapid successive commits coalesce. */
  commit: (next: StudioDesignJson, options?: StudioCommitOptions) => void;
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
  select: (selection: StudioSelection, options?: StudioSelectOptions) => void;
  selectIds: (ids: string[]) => void;
  /** Writes the hover store (`editor/hover-store.ts`); read hover via its hooks. */
  setHoveredId: (id: string | null) => void;
  updateSettings: (patch: Partial<StudioEditorSettings>) => void;
  toggleLayer: (layer: StudioLayerKey) => void;
  setViewMode: (mode: StudioViewMode) => void;
  sendCanvasCommand: (command: CanvasCommandInput) => void;
  /** The 3D viewer registers a capture function; returns a PNG data URL. */
  registerSnapshot: (capture: (() => string | null) | null) => void;
  takeSnapshot: () => string | null;
  setShortcutsOpen: (open: boolean) => void;
  commands: StudioEditorCommands;
  /** Latest design, including in-flight previews. For handlers only — not render. */
  getDesign: () => StudioDesignJson;
};

export type StudioSelectionState = {
  /** Primary selection — drives the inspector. */
  selection: StudioSelection;
  /** Every selected item id (objects, drapes, treatments, openings). */
  selectedIds: string[];
  /** Changes identity with `selectedIds`. */
  isSelected: (id: string) => boolean;
};

export type StudioHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
};

export type StudioViewState = {
  viewMode: StudioViewMode;
  canSnapshot: boolean;
  shortcutsOpen: boolean;
};

/** Everything at once. Changes identity on every design/selection/settings change. */
export type StudioEditorContextValue = StudioEditorActions &
  StudioSelectionState &
  StudioHistoryState &
  StudioViewState & {
    /** A gesture (drag/dial) is in flight: `beginTransaction`/`preview` until end/cancel. */
    transacting: boolean;
    design: StudioDesignJson;
    settings: StudioEditorSettings;
    canvasCommand: StudioCanvasCommand | null;
  };

/** Returned by `useStudioEditorState`; pass to `StudioEditorProvider`. */
export type StudioEditorState = {
  full: StudioEditorContextValue;
  actions: StudioEditorActions;
  design: StudioDesignJson;
  selection: StudioSelectionState;
  settings: StudioEditorSettings;
  history: StudioHistoryState;
  transacting: boolean;
  view: StudioViewState;
  canvasCommand: StudioCanvasCommand | null;
};

const StudioEditorContext = createContext<StudioEditorContextValue | null>(
  null
);
const StudioActionsContext = createContext<StudioEditorActions | null>(null);
const StudioDesignContext = createContext<StudioDesignJson | null>(null);
const StudioSelectionContext = createContext<StudioSelectionState | null>(null);
const StudioSettingsContext = createContext<StudioEditorSettings | null>(null);
const StudioHistoryContext = createContext<StudioHistoryState | null>(null);
const StudioTransactingContext = createContext(false);
const StudioViewContext = createContext<StudioViewState | null>(null);
const StudioCanvasCommandContext = createContext<StudioCanvasCommand | null>(
  null
);

function required<T>(value: T | null, hook: string): T {
  if (value === null) {
    throw new Error(`${hook} must be used inside StudioEditorProvider`);
  }
  return value;
}

/**
 * The whole editor. Re-renders on every design preview (each drag frame) —
 * prefer the narrow hooks below in anything that is not the canvas.
 */
export function useStudioEditor(): StudioEditorContextValue {
  return required(useContext(StudioEditorContext), "useStudioEditor");
}

/** For components that also render outside the Studio (e.g. event builder). */
export function useOptionalStudioEditor(): StudioEditorContextValue | null {
  return useContext(StudioEditorContext);
}

/** Stable callbacks only — never re-renders the caller. */
export function useStudioEditorActions(): StudioEditorActions {
  return required(useContext(StudioActionsContext), "useStudioEditorActions");
}

export function useOptionalStudioEditorActions(): StudioEditorActions | null {
  return useContext(StudioActionsContext);
}

/** Live design; re-renders on every drag frame. */
export function useStudioDesign(): StudioDesignJson {
  return required(useContext(StudioDesignContext), "useStudioDesign");
}

/** Re-renders only when the selection changes. */
export function useStudioSelection(): StudioSelectionState {
  return required(useContext(StudioSelectionContext), "useStudioSelection");
}

export function useOptionalStudioSelection(): StudioSelectionState | null {
  return useContext(StudioSelectionContext);
}

/** Re-renders only when settings change. */
export function useStudioSettings(): StudioEditorSettings {
  return required(useContext(StudioSettingsContext), "useStudioSettings");
}

export function useOptionalStudioSettings(): StudioEditorSettings | null {
  return useContext(StudioSettingsContext);
}

/** Undo/redo availability. */
export function useStudioHistory(): StudioHistoryState {
  return required(useContext(StudioHistoryContext), "useStudioHistory");
}

/** True while a gesture (drag, dial) is in flight; false outside the Studio. */
export function useStudioTransacting(): boolean {
  return useContext(StudioTransactingContext);
}

/** View mode, snapshot availability, shortcuts dialog. */
export function useStudioView(): StudioViewState {
  return required(useContext(StudioViewContext), "useStudioView");
}

export function useOptionalStudioView(): StudioViewState | null {
  return useContext(StudioViewContext);
}

/** Latest canvas command (fit, zoom, camera…); null until one is sent. */
export function useStudioCanvasCommand(): StudioCanvasCommand | null {
  return useContext(StudioCanvasCommandContext);
}

const RAIL_SAMPLE_MS = 125;

/**
 * Design for side panels. Live normally; while a gesture is in flight it is
 * sampled ~8×/s and deferred, so drags never wait on rails/inspectors yet
 * their readouts keep moving. Call in a thin wrapper and pass the result to a
 * memoized child — the wrapper itself still renders every frame.
 */
export function useStudioRailDesign(design: StudioDesignJson): StudioDesignJson {
  const transacting = useContext(StudioTransactingContext);
  const latest = useRef(design);
  useEffect(() => {
    latest.current = design;
  }, [design]);
  const [sampled, setSampled] = useState(design);
  const [sampling, setSampling] = useState(transacting);
  if (sampling !== transacting) {
    setSampling(transacting);
    if (transacting) setSampled(design);
  }
  useEffect(() => {
    if (!transacting) return;
    const timer = window.setInterval(
      () => setSampled(latest.current),
      RAIL_SAMPLE_MS
    );
    return () => window.clearInterval(timer);
  }, [transacting]);
  const deferred = useDeferredValue(transacting ? sampled : design);
  return transacting ? deferred : design;
}

const NO_IDS: string[] = [];
const ignore = () => {};
const PRESENT_SELECTION: StudioSelectionState = {
  selection: null,
  selectedIds: NO_IDS,
  isSelected: () => false,
};

/**
 * Provides the full context plus the narrow slices. `presenting` turns the
 * Studio into a read-only walkthrough: no selection, hover or drag tool.
 */
export function StudioEditorProvider({
  state,
  presenting = false,
  children,
}: {
  state: StudioEditorState;
  presenting?: boolean;
  children: React.ReactNode;
}) {
  const full = useMemo<StudioEditorContextValue>(
    () =>
      presenting
        ? {
            ...state.full,
            ...PRESENT_SELECTION,
            select: ignore,
            selectIds: ignore,
            setHoveredId: ignore,
            settings: { ...state.full.settings, tool: "pan" },
          }
        : state.full,
    [presenting, state.full]
  );
  const actions = useMemo<StudioEditorActions>(
    () =>
      presenting
        ? {
            ...state.actions,
            select: ignore,
            selectIds: ignore,
            setHoveredId: ignore,
          }
        : state.actions,
    [presenting, state.actions]
  );
  const settings = useMemo<StudioEditorSettings>(
    () => (presenting ? { ...state.settings, tool: "pan" } : state.settings),
    [presenting, state.settings]
  );
  const selection = presenting ? PRESENT_SELECTION : state.selection;

  return (
    <StudioActionsContext value={actions}>
      <StudioSettingsContext value={settings}>
        <StudioViewContext value={state.view}>
          <StudioHistoryContext value={state.history}>
            <StudioTransactingContext value={state.transacting}>
              <StudioSelectionContext value={selection}>
                <StudioCanvasCommandContext value={state.canvasCommand}>
                  <StudioDesignContext value={state.design}>
                    <StudioEditorContext value={full}>{children}</StudioEditorContext>
                  </StudioDesignContext>
                </StudioCanvasCommandContext>
              </StudioSelectionContext>
            </StudioTransactingContext>
          </StudioHistoryContext>
        </StudioViewContext>
      </StudioSettingsContext>
    </StudioActionsContext>
  );
}

const SETTINGS_STORAGE_KEY = "tcg-studio-editor-settings-v1";
const HISTORY_LIMIT = 120;
const COALESCE_MS = 450;

function loadSettings(): StudioEditorSettings {
  if (typeof window === "undefined") return DEFAULT_STUDIO_EDITOR_SETTINGS;
  const recommended = (): StudioEditorSettings => ({
    ...DEFAULT_STUDIO_EDITOR_SETTINGS,
    quality: getRecommendedStudioQuality(),
    qualityExplicit: false,
  });
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return recommended();
    const parsed = JSON.parse(raw) as Partial<StudioEditorSettings>;
    const storedQuality =
      parsed.quality && STUDIO_QUALITIES.includes(parsed.quality)
        ? parsed.quality
        : undefined;
    // Settings saved before `qualityExplicit` existed always held "high" by
    // default, so only a non-default stored quality proves a user choice.
    const explicit =
      storedQuality !== undefined &&
      (parsed.qualityExplicit ?? storedQuality !== "high");
    return {
      ...DEFAULT_STUDIO_EDITOR_SETTINGS,
      ...parsed,
      layers: {
        ...DEFAULT_STUDIO_EDITOR_SETTINGS.layers,
        ...(parsed.layers ?? {}),
      },
      quality: explicit ? storedQuality : getRecommendedStudioQuality(),
      qualityExplicit: explicit,
      tool: "select",
      autoRotate: false,
    };
  } catch {
    return recommended();
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
 * `onDesignChange` must be the designer's raw state setter (marks dirty) and
 * should be identity-stable so the actions stay stable.
 */
export function useStudioEditorState({
  design,
  onDesignChange,
  initialViewMode = "2d",
}: {
  design: StudioDesignJson;
  onDesignChange: (next: StudioDesignJson) => void;
  initialViewMode?: StudioViewMode;
}): StudioEditorState {
  const designRef = useRef(design);
  useLayoutEffect(() => {
    designRef.current = design;
  }, [design]);
  const past = useRef<StudioDesignJson[]>([]);
  const future = useRef<StudioDesignJson[]>([]);
  const lastCommit = useRef<{ at: number; key: string }>({ at: 0, key: "" });
  const transactionBase = useRef<StudioDesignJson | null>(null);
  const [history, setHistoryState] = useState<StudioHistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [transacting, setTransacting] = useState(false);
  const bumpHistory = useCallback(
    () =>
      setHistoryState((current) => {
        const canUndo = past.current.length > 0;
        const canRedo = future.current.length > 0;
        return current.canUndo === canUndo && current.canRedo === canRedo
          ? current
          : { canUndo, canRedo };
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

  const commitRef = useRef<StudioEditorActions["commit"] | null>(null);
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

  const commit = useCallback<StudioEditorActions["commit"]>(
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
    if (transactionBase.current) return;
    transactionBase.current = designRef.current;
    setTransacting(true);
  }, []);

  const preview = useCallback(
    (next: StudioDesignJson) => {
      if (!transactionBase.current) {
        transactionBase.current = designRef.current;
        setTransacting(true);
      }
      if (next === designRef.current) return;
      designRef.current = next;
      onDesignChange(next);
    },
    [onDesignChange]
  );

  const endTransaction = useCallback(() => {
    const base = transactionBase.current;
    transactionBase.current = null;
    setTransacting(false);
    if (base && base !== designRef.current) {
      pushPast(base);
      lastCommit.current = { at: 0, key: "" };
      bumpHistory();
    }
  }, [bumpHistory, pushPast]);

  const cancelTransaction = useCallback(() => {
    const base = transactionBase.current;
    transactionBase.current = null;
    setTransacting(false);
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

  const select = useCallback<StudioEditorActions["select"]>(
    (next, options) => {
      if (!next) {
        setSelection(null);
        setSelectedIds(NO_IDS);
        return;
      }
      if (next.kind === "wall") {
        setSelection(next);
        setSelectedIds(NO_IDS);
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
      setSelection((current) =>
        current && current.kind === next.kind && selectionId(current) === next.id
          ? current
          : next
      );
      setSelectedIds((current) =>
        current.length === 1 && current[0] === next.id ? current : [next.id]
      );
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
        if (current.length === 0) return current;
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
      setSettings((current) => {
        const next = { ...current, ...patch };
        if (patch.quality !== undefined && patch.qualityExplicit === undefined) {
          next.qualityExplicit = true;
        }
        return next;
      }),
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
  const getDesign = useCallback(() => designRef.current, []);

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
        setSelectedIds(NO_IDS);
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
      arrange(mode) {
        const ids = activeIds();
        if (ids.length === 0) return;
        commit(arrangeStudioItems(designRef.current, ids, mode), {
          coalesceKey: `arrange-${mode}`,
        });
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
      canPaste() {
        return clipboard.current !== null;
      },
      selectAll() {
        selectIds(getAllStudioItemIds(designRef.current));
      },
    }),
    [activeIds, commit, selectIds, setSelectedIds]
  );

  const actions = useMemo<StudioEditorActions>(
    () => ({
      commit,
      beginTransaction,
      preview,
      endTransaction,
      cancelTransaction,
      undo,
      redo,
      select,
      selectIds,
      setHoveredId: setStudioHoveredId,
      updateSettings,
      toggleLayer,
      setViewMode,
      sendCanvasCommand,
      registerSnapshot,
      takeSnapshot,
      setShortcutsOpen,
      commands,
      getDesign,
    }),
    [
      beginTransaction,
      cancelTransaction,
      commands,
      commit,
      endTransaction,
      getDesign,
      preview,
      redo,
      registerSnapshot,
      select,
      selectIds,
      sendCanvasCommand,
      takeSnapshot,
      toggleLayer,
      undo,
      updateSettings,
    ]
  );

  const selectionState = useMemo<StudioSelectionState>(
    () => ({ selection, selectedIds, isSelected }),
    [isSelected, selectedIds, selection]
  );
  const view = useMemo<StudioViewState>(
    () => ({ viewMode, canSnapshot, shortcutsOpen }),
    [canSnapshot, shortcutsOpen, viewMode]
  );

  const full = useMemo<StudioEditorContextValue>(
    () => ({
      ...actions,
      ...selectionState,
      ...history,
      ...view,
      transacting,
      design,
      settings,
      canvasCommand,
    }),
    [actions, canvasCommand, design, history, selectionState, settings, transacting, view]
  );

  return useMemo<StudioEditorState>(
    () => ({
      full,
      actions,
      design,
      selection: selectionState,
      settings,
      history,
      transacting,
      view,
      canvasCommand,
    }),
    [actions, canvasCommand, design, full, history, selectionState, settings, transacting, view]
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
  { keys: ["Ctrl", "]"], label: "Bring forward (Shift = bring to front)" },
  { keys: ["Ctrl", "["], label: "Send backward (Shift = send to back)" },
  { keys: ["L"], label: "Lock / unlock selection" },
  { keys: ["Shift", "L"], label: "Expand / close the full library" },
  { keys: ["H"], label: "Hide / show selection" },
  { keys: ["G"], label: "Toggle grid snapping" },
  { keys: ["F"], label: "Fit view to room" },
  { keys: ["1"], label: "2D plan" },
  { keys: ["2"], label: "3D visualizer" },
  { keys: ["3"], label: "Split view" },
  { keys: ["Space", "Drag"], label: "Pan the 2D plan" },
  { keys: ["Shift", "Click"], label: "Add to selection" },
  { keys: ["Right-click"], label: "Actions for the item or wall under the pointer" },
  { keys: ["Esc"], label: "Clear selection" },
  { keys: ["?"], label: "Show shortcuts" },
  { keys: ["Drag"], label: "3D in-room: look around (right-drag orbits the subject)" },
  { keys: ["W", "A", "S", "D"], label: "3D in-room: walk (Shift = run)" },
  { keys: ["Arrows"], label: "3D walk mode: walk instead of nudging" },
  { keys: ["Q", "E"], label: "3D in-room: lower / raise eye height" },
  { keys: ["Scroll"], label: "3D in-room: step forward / back" },
  { keys: ["Double-click"], label: "3D in-room: glide to a floor spot" },
];

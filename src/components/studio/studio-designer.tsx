"use client";

import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import { CalendarHeart, History } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  STUDIO_TITLE_MAX_LENGTH,
  cloneStudioTemplate,
  normalizeStudioDesign,
  validateStudioDesign,
  type StudioDesignJson,
  type StudioDesignRow,
} from "@/data/studio";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Studio2DEditor } from "./studio-2d-editor";
import { Studio3DViewer } from "./studio-3d-lazy";
import { StudioHoverTip } from "./studio-hover-tip";
import { StudioLeftRail } from "./studio-left-rail";
import { StudioPresentBar } from "./studio-present-bar";
import { StudioRightRail } from "./studio-right-rail";
import { StudioShell } from "./studio-shell";
import { StudioToolbar } from "./studio-toolbar";
import type {
  StudioAccessMode,
  StudioLinkContext,
  StudioSaveResponse,
  StudioSaveState,
  StudioViewMode,
} from "./studio-types";
import { StudioContextMenu } from "./context-menu/studio-context-menu";
import { setStudioHoveredId } from "./editor/hover-store";
import {
  StudioEditorProvider,
  useStudioEditorState,
  useStudioRailDesign,
} from "./editor/studio-editor-context";
import {
  enterStudioFullscreen,
  exitStudioFullscreen,
  getStudioFullscreenMode,
  toggleStudioFullscreen,
  useStudioFullscreenMode,
  type StudioFullscreenMode,
} from "./editor/studio-display-store";
import { useStudioKeyboardShortcuts } from "./editor/use-studio-shortcuts";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { EventPresetLibrary } from "@/components/event-builder/event-preset-library";
import { EventBriefPanel } from "@/components/event-builder/event-brief-panel";
import { getEnglishOptionLabel } from "@/data/estimate";
import {
  EMPTY_STUDIO_EVENT_DETAILS,
  type StudioEventDetails,
  type StudioLeadContact,
} from "@/data/studio-leads";
import { EventDetailsDialog } from "./lead/event-details-dialog";
import {
  formatStudioEventSummary,
  hasStudioEventDetails,
} from "./lead/event-details-format";
import {
  bindStudioResume,
  fetchStudioDraft,
  saveStudioLead,
  type StudioLeadDraft,
} from "./lead/lead-client";
import { LeadNudgeCard } from "./lead/lead-nudge-card";
import {
  mergeBriefIntoDetails,
  readStoredStudioLead,
  rememberStudioRoom,
  sanitizeStudioEventDetails,
  studioEventDetailsFromRecord,
  updateStoredStudioLead,
  type StudioRoomKind,
} from "./lead/lead-storage";
import {
  SaveDesignDialog,
  type SaveDesignResult,
} from "./lead/save-design-dialog";
import { StudioLeadProvider } from "./lead/studio-lead-context";
import { useStudioLeadAutosave } from "./lead/use-studio-lead-autosave";

export type StudioDesignerMode = "designer" | "event";

/** Opened from an emailed private link (`/studio/d/[token]`). */
export type StudioLeadResume = {
  token: string;
  details: StudioEventDetails;
  contact: StudioLeadContact | null;
};

export type StudioDesignerProps = {
  initialDesign?: StudioDesignJson;
  initialDesignRecord?: Partial<StudioDesignRow>;
  initialDesignId?: string;
  initialTitle?: string;
  mode?: StudioDesignerMode;
  eventBrief?: EventBuilderBrief;
  eventContactDefaults?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  accessMode?: StudioAccessMode;
  apiBase?: string;
  saveEndpoint?: string;
  linkContext?: StudioLinkContext;
  signInHref?: string;
  createAccountHref?: string;
  savedDesignPathBase?: string;
  resumeSessionDraft?: boolean;
  leadResume?: StudioLeadResume;
  className?: string;
  onSaved?: (record: StudioDesignRow, response: StudioSaveResponse) => void;
  onDesignIdChange?: (id: string) => void;
};

const STUDIO_SESSION_DRAFT_KEY = "tcg-studio-guest-draft-v1";
const ignoreSelection = () => {};
/** Active designing time before the one-time "Your event" prompt. */
const EVENT_NUDGE_AFTER_MS = 2 * 60_000;
/** Older autosaved rooms are not offered back on a fresh visit. */
const RESTORE_MAX_AGE_MS = 30 * 24 * 60 * 60_000;

type LeadNudge = { kind: "details" } | { kind: "restore"; draft: StudioLeadDraft };

function initialEventDetails(props: StudioDesignerProps): StudioEventDetails {
  if (props.leadResume) return sanitizeStudioEventDetails(props.leadResume.details);
  const fromRecord = props.initialDesignRecord
    ? studioEventDetailsFromRecord(props.initialDesignRecord)
    : { ...EMPTY_STUDIO_EVENT_DETAILS };
  return props.mode === "event"
    ? mergeBriefIntoDetails(fromRecord, props.eventBrief)
    : fromRecord;
}

function fillEmptyDetails(
  current: StudioEventDetails,
  fallback: StudioEventDetails
): StudioEventDetails {
  return {
    eventName: current.eventName ?? fallback.eventName,
    eventType: current.eventType ?? fallback.eventType,
    eventDate: current.eventDate ?? fallback.eventDate,
    guestCount: current.guestCount ?? fallback.guestCount,
    venueName: current.venueName ?? fallback.venueName,
    cityArea: current.cityArea ?? fallback.cityArea,
  };
}

function lastEditedLabel(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const MemoStudioLeftRail = memo(StudioLeftRail);
const MemoStudioRightRail = memo(StudioRightRail);
const MemoEventPresetLibrary = memo(EventPresetLibrary);
const MemoEventBriefPanel = memo(EventBriefPanel);

/**
 * Feeds a memoized rail the rail design (deferred during drags) so canvas
 * gestures never wait on side panels.
 */
function StudioRailSlot({
  design,
  children,
}: {
  design: StudioDesignJson;
  children: (design: StudioDesignJson) => React.ReactNode;
}) {
  const railDesign = useStudioRailDesign(design);
  return children(railDesign);
}

function initialJson(props: StudioDesignerProps): StudioDesignJson {
  const design =
    props.initialDesign ??
    props.initialDesignRecord?.design_json ??
    cloneStudioTemplate("rectangle");
  return structuredClone(normalizeStudioDesign(design));
}

export function StudioDesigner(props: StudioDesignerProps) {
  const router = useRouter();
  const { setDirty: setGlobalDirty, clearDirty } =
    useOptionalUnsavedChanges();
  const {
    mode = "designer",
    eventBrief,
    eventContactDefaults,
    accessMode = "guest",
    apiBase = "/api/studio/designs",
    saveEndpoint,
    linkContext,
    signInHref = "/sign-in",
    createAccountHref = "/sign-up",
    savedDesignPathBase,
    resumeSessionDraft = false,
    className,
    onSaved,
    onDesignIdChange,
  } = props;
  const [design, setDesign] = useState<StudioDesignJson>(() => initialJson(props));
  const [title, setTitle] = useState(
    props.initialTitle ??
      props.initialDesignRecord?.title ??
      "Untitled room design"
  );
  const [designId, setDesignId] = useState(
    props.initialDesignId ?? props.initialDesignRecord?.id
  );
  const [savedUpdatedAt, setSavedUpdatedAt] = useState(
    props.initialDesignRecord?.updated_at
  );
  const [saveState, setSaveState] = useState<StudioSaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string>();
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [authReturnTo, setAuthReturnTo] = useState("/studio/new?resume=1");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const revision = useRef(0);
  const saving = useRef(false);
  const pendingDestination = useRef<string | null>(null);

  const isGuest = accessMode === "guest";
  const leadKind: StudioRoomKind = mode === "event" ? "event" : "designer";
  const [eventDetails, setEventDetails] = useState<StudioEventDetails>(() =>
    initialEventDetails(props)
  );
  const [leadContact, setLeadContact] = useState<StudioLeadContact | null>(
    props.leadResume?.contact ?? null
  );
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDialogIntent, setEventDialogIntent] = useState<"edit" | "before-save">("edit");
  const [nudge, setNudge] = useState<LeadNudge | null>(null);
  const [baselineDesign] = useState(design);
  const eventDetailsRef = useRef(eventDetails);
  const nudgeShown = useRef(accessMode === "admin");
  const firstEditAt = useRef<number | null>(null);
  const restorePending = useRef(false);
  const continueSaveAfterDetails = useRef(false);

  useLayoutEffect(() => {
    eventDetailsRef.current = eventDetails;
  }, [eventDetails]);

  const leadAutosave = useStudioLeadAutosave({
    enabled: isGuest,
    kind: leadKind,
    initialDesignId: null,
    baselineDesign,
    snapshot: { design, title, details: eventDetails },
    getRevision: () => revision.current,
    onAutosaved: (revisionAtStart) => {
      if (revisionAtStart !== revision.current) return;
      setSaveState("saved");
      setSaveMessage("Draft autosaved");
    },
    onBlocked: (message) => setSaveMessage(message),
  });
  const {
    setDesignId: setLeadDesignId,
    notifyChange: notifyLeadChange,
    ensureDesignId: ensureLeadDesignId,
    startFresh: startFreshLead,
  } = leadAutosave;

  useEffect(() => {
    const hasUnsavedChanges =
      saveState === "dirty" ||
      saveState === "error" ||
      saveState === "saving";
    setGlobalDirty(hasUnsavedChanges);
    return () => clearDirty();
  }, [clearDirty, saveState, setGlobalDirty]);

  useEffect(() => {
    if (!resumeSessionDraft || accessMode === "guest") return;
    try {
      const raw = window.sessionStorage.getItem(STUDIO_SESSION_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { design?: unknown; title?: unknown };
      const validation = validateStudioDesign(parsed.design);
      if (!validation.valid || typeof parsed.title !== "string") return;
      const restoredTitle = parsed.title.trim().slice(0, STUDIO_TITLE_MAX_LENGTH);
      if (!restoredTitle) return;
      window.setTimeout(() => {
        revision.current += 1;
        setDesign(validation.design);
        setTitle(restoredTitle);
        setSaveState("dirty");
        setSaveMessage("Recovered your room from before sign-in.");
      }, 0);
    } catch {
      // Session drafts are best-effort and never replace server validation.
    }
  }, [accessMode, resumeSessionDraft]);

  useEffect(() => {
    if (accessMode === "admin") return;
    const stored = readStoredStudioLead();
    nudgeShown.current = stored.nudgeShown;
    const fresh = !props.initialDesignRecord && !props.leadResume;
    const timer = window.setTimeout(() => {
      if (fresh) setEventDetails((current) => fillEmptyDetails(current, stored.details));
      if (isGuest) setLeadContact((current) => current ?? stored.contact);
    }, 0);
    return () => window.clearTimeout(timer);
    // Mount-only: later prop changes never re-merge stored details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isGuest) return;
    let cancelled = false;
    const resume = props.leadResume;
    if (resume) {
      void bindStudioResume(resume.token).then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setLeadDesignId(result.draft.id);
          if (result.draft.contact) setLeadContact(result.draft.contact);
          setSaveState("saved");
          setSaveMessage("Welcome back — your design is open");
        } else {
          setSaveMessage(result.message);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const storedRoom = readStoredStudioLead().rooms[leadKind];
    if (!storedRoom) return;
    restorePending.current = true;
    void fetchStudioDraft(storedRoom.designId).then((result) => {
      if (cancelled || !restorePending.current) return;
      if (!result.ok) {
        restorePending.current = false;
        if (result.status === 403 || result.status === 404) {
          rememberStudioRoom(leadKind, null);
        }
        return;
      }
      const age = Date.now() - Date.parse(result.draft.last_activity_at);
      const validation = validateStudioDesign(result.draft.design_json);
      if (!validation.valid || !(age < RESTORE_MAX_AGE_MS)) {
        restorePending.current = false;
        rememberStudioRoom(leadKind, null);
        return;
      }
      setNudge({ kind: "restore", draft: result.draft });
    });
    return () => {
      cancelled = true;
    };
    // Mount-only: resume binding and restore offers run once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissRestore = useCallback(() => {
    if (!restorePending.current) return;
    restorePending.current = false;
    startFreshLead();
    setNudge((current) => (current?.kind === "restore" ? null : current));
  }, [startFreshLead]);

  const restoreDraft = useCallback(
    (draft: StudioLeadDraft) => {
      restorePending.current = false;
      const validation = validateStudioDesign(draft.design_json);
      if (!validation.valid) {
        dismissRestore();
        return;
      }
      revision.current += 1;
      setDesign(validation.design);
      if (mode !== "event") setTitle(draft.title);
      setLeadDesignId(draft.id);
      if (hasStudioEventDetails(draft.details)) {
        setEventDetails(sanitizeStudioEventDetails(draft.details));
      }
      if (draft.contact) setLeadContact(draft.contact);
      setNudge(null);
      setSaveState("saved");
      setSaveMessage("Restored your autosaved design");
    },
    [dismissRestore, mode, setLeadDesignId]
  );

  const markNudgeShown = useCallback(() => {
    nudgeShown.current = true;
    updateStoredStudioLead((current) => ({ ...current, nudgeShown: true }));
  }, []);

  /** Counts active designing; after ~2 minutes, offers the event card once. */
  const trackEdit = useCallback(() => {
    if (restorePending.current) dismissRestore();
    notifyLeadChange();
    if (nudgeShown.current) return;
    const now = Date.now();
    if (firstEditAt.current === null) firstEditAt.current = now;
    if (
      now - firstEditAt.current >= EVENT_NUDGE_AFTER_MS &&
      !hasStudioEventDetails(eventDetailsRef.current)
    ) {
      markNudgeShown();
      setNudge({ kind: "details" });
    }
  }, [dismissRestore, markNudgeShown, notifyLeadChange]);

  const changeDesign = useCallback((next: StudioDesignJson) => {
    revision.current += 1;
    setDesign(next);
    setSaveState("dirty");
    setSaveMessage(undefined);
    trackEdit();
  }, [trackEdit]);

  const changeEventDetails = useCallback(
    (next: StudioEventDetails) => {
      revision.current += 1;
      setEventDetails(next);
      setSaveState("dirty");
      setSaveMessage(undefined);
      if (accessMode !== "admin") {
        updateStoredStudioLead((current) => ({ ...current, details: next }));
      }
      if (restorePending.current) dismissRestore();
      notifyLeadChange();
    },
    [accessMode, dismissRestore, notifyLeadChange]
  );

  const openEventDetails = useCallback(() => {
    setEventDialogIntent("edit");
    setEventDialogOpen(true);
    setNudge((current) => (current?.kind === "details" ? null : current));
  }, []);

  const editor = useStudioEditorState({
    design,
    onDesignChange: changeDesign,
  });
  const { select: setSelection, commit, setViewMode } = editor.actions;
  const { selection } = editor.selection;
  const { viewMode } = editor.view;

  const fullscreenMode = useStudioFullscreenMode();
  const fullscreen = fullscreenMode !== "off";
  const [presenting, setPresenting] = useState(false);
  const presentRestore = useRef<{
    viewMode: StudioViewMode;
    fullscreen: StudioFullscreenMode;
  } | null>(null);

  const togglePresent = useCallback(() => {
    const restore = presentRestore.current;
    if (restore) {
      presentRestore.current = null;
      setPresenting(false);
      if (restore.viewMode !== "3d") setViewMode(restore.viewMode);
      if (restore.fullscreen === "off") exitStudioFullscreen();
      return;
    }
    const currentFullscreen = getStudioFullscreenMode();
    presentRestore.current = { viewMode, fullscreen: currentFullscreen };
    setPresenting(true);
    if (viewMode !== "3d") setViewMode("3d");
    if (currentFullscreen === "off") void enterStudioFullscreen();
  }, [setViewMode, viewMode]);

  /* Present is a read-only walkthrough: the canvas sees no selection, hover or drag tool. */
  const canvasSelection = presenting ? null : selection;
  const canvasSelect = presenting ? ignoreSelection : setSelection;

  useEffect(() => {
    if (presenting) setStudioHoveredId(null);
  }, [presenting]);

  useEffect(() => {
    if (fullscreenMode === "off") return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.dataset.studioFullscreen = fullscreenMode;
    root.style.overflow = "hidden";
    return () => {
      delete root.dataset.studioFullscreen;
      root.style.overflow = previousOverflow;
    };
  }, [fullscreenMode]);

  useEffect(() => () => exitStudioFullscreen(), []);

  const changeTitle = useCallback((next: string) => {
    revision.current += 1;
    setTitle(next);
    setSaveState("dirty");
    setSaveMessage(undefined);
    trackEdit();
  }, [trackEdit]);

  const save = useCallback(async () => {
    if (saving.current) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setSaveState("error");
      setSaveMessage("Add a title before saving.");
      return;
    }
    if (cleanTitle.length > STUDIO_TITLE_MAX_LENGTH) {
      setSaveState("error");
      setSaveMessage(
        `Keep the title under ${STUDIO_TITLE_MAX_LENGTH} characters.`
      );
      return;
    }

    const validation = validateStudioDesign(design);
    if (!validation.valid) {
      setSaveState("error");
      setSaveMessage(validation.errors[0] ?? "Review the design before saving.");
      return;
    }

    if (!nudgeShown.current && !hasStudioEventDetails(eventDetailsRef.current)) {
      markNudgeShown();
      setNudge((current) => (current?.kind === "details" ? null : current));
      continueSaveAfterDetails.current = true;
      setEventDialogIntent("before-save");
      setEventDialogOpen(true);
      return;
    }

    if (accessMode === "guest") {
      try {
        window.sessionStorage.setItem(
          STUDIO_SESSION_DRAFT_KEY,
          JSON.stringify({
            design: validation.design,
            title: cleanTitle,
            savedAt: new Date().toISOString(),
          })
        );
        const returnUrl = new URL(window.location.href);
        returnUrl.searchParams.set("resume", "1");
        setAuthReturnTo(
          `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`
        );
      } catch {
        setAuthReturnTo("/studio/new?resume=1");
      }
      setGuestDialogOpen(true);
      return;
    }

    saving.current = true;
    const savingRevision = revision.current;
    setSaveState("saving");
    setSaveMessage("Saving your room design…");

    try {
      const endpoint = saveEndpoint
        ? saveEndpoint
        : `${apiBase.replace(/\/$/, "")}${designId ? `/${designId}` : ""}`;
      const response = await fetch(endpoint, {
        method: designId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          design_json: validation.design,
          event_details: eventDetailsRef.current,
          ...(designId ? {} : { source: mode === "event" ? "event_builder" : "studio" }),
          ...(linkContext?.estimateRequestId
            ? { estimate_request_id: linkContext.estimateRequestId }
            : {}),
          ...(linkContext?.quoteId ? { quote_id: linkContext.quoteId } : {}),
          ...(linkContext?.jobId ? { job_id: linkContext.jobId } : {}),
          ...(linkContext?.opportunityRef
            ? { opportunity_ref: linkContext.opportunityRef }
            : {}),
          ...(designId && savedUpdatedAt
            ? { expected_updated_at: savedUpdatedAt }
            : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | StudioSaveResponse
        | null;

      if (!response.ok || !body?.ok || !body.design) {
        throw new Error(
          body?.message ?? "We couldn’t save this design. Please try again."
        );
      }

      const nextId = body.design.id;
      setSavedUpdatedAt(body.design.updated_at);
      try {
        window.sessionStorage.removeItem(STUDIO_SESSION_DRAFT_KEY);
      } catch {
        // Saving succeeded; unavailable session storage must not mask it.
      }
      if (!designId && nextId) {
        setDesignId(nextId);
        onDesignIdChange?.(nextId);
        if (savedDesignPathBase) {
          pendingDestination.current = `${savedDesignPathBase.replace(/\/$/, "")}/${nextId}`;
        } else if (accessMode === "admin") {
          pendingDestination.current = `/admin/studio/${nextId}/edit`;
        } else if (accessMode === "customer") {
          pendingDestination.current = `/account/studio/${nextId}`;
        }
      }
      if (
        pendingDestination.current &&
        savingRevision === revision.current
      ) {
        const destination = pendingDestination.current;
        pendingDestination.current = null;
        clearDirty();
        router.replace(destination);
      }
      setSaveState(savingRevision === revision.current ? "saved" : "dirty");
      setSaveMessage(
        savingRevision === revision.current
          ? "Saved just now"
          : "Saved, with newer changes pending"
      );
      onSaved?.(body.design, body);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t save this design. Please try again."
      );
    } finally {
      saving.current = false;
    }
  }, [
    accessMode,
    apiBase,
    clearDirty,
    design,
    designId,
    linkContext,
    markNudgeShown,
    mode,
    onDesignIdChange,
    onSaved,
    router,
    saveEndpoint,
    savedUpdatedAt,
    savedDesignPathBase,
    title,
  ]);

  const signInWithReturn = `${signInHref}${signInHref.includes("?") ? "&" : "?"}next=${encodeURIComponent(authReturnTo)}`;
  const createAccountWithReturn = `${createAccountHref}${createAccountHref.includes("?") ? "&" : "?"}next=${encodeURIComponent(authReturnTo)}`;

  const saveRef = useRef(save);
  useLayoutEffect(() => {
    saveRef.current = save;
  }, [save]);
  const onSave = useCallback(() => void saveRef.current(), []);

  const handleEventDialogOpenChange = useCallback((open: boolean) => {
    setEventDialogOpen(open);
    if (!open && continueSaveAfterDetails.current) {
      continueSaveAfterDetails.current = false;
      // Let the dialog close (and new details commit) before the save runs.
      window.setTimeout(() => void saveRef.current(), 0);
    }
  }, []);

  const submitLead = useCallback(
    async (contact: StudioLeadContact, website: string): Promise<SaveDesignResult> => {
      const cleanTitle = title.trim() || "Untitled room design";
      const validation = validateStudioDesign(design);
      if (!validation.valid) {
        return {
          ok: false,
          message: validation.errors[0] ?? "Review the design before saving.",
        };
      }
      const savingRevision = revision.current;
      const existingId = await ensureLeadDesignId();
      const result = await saveStudioLead({
        id: existingId,
        title: cleanTitle,
        design_json: validation.design,
        event_details: eventDetailsRef.current,
        mode: leadKind,
        contact,
        website,
      });
      if (!result.ok) {
        if (result.status === 403 || result.status === 404) startFreshLead();
        return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
      }
      if (result.id) setLeadDesignId(result.id);
      setLeadContact(contact);
      updateStoredStudioLead((current) => ({ ...current, contact }));
      try {
        window.sessionStorage.removeItem(STUDIO_SESSION_DRAFT_KEY);
      } catch {
        // The server copy is saved; session cleanup is best-effort.
      }
      if (savingRevision === revision.current) {
        setSaveState("saved");
        setSaveMessage(result.emailed ? "Saved — link emailed" : "Saved");
      }
      return { ok: true, emailed: result.emailed, resumePath: result.resumePath };
    },
    [design, ensureLeadDesignId, leadKind, setLeadDesignId, startFreshLead, title]
  );

  const leadContextValue = useMemo(
    () => ({
      details: eventDetails,
      contact: leadContact,
      ensureDesignId: isGuest
        ? ensureLeadDesignId
        : async () => designId ?? null,
      openEventDetails,
    }),
    [designId, ensureLeadDesignId, eventDetails, isGuest, leadContact, openEventDetails]
  );
  const eventSummary = hasStudioEventDetails(eventDetails)
    ? formatStudioEventSummary(eventDetails) || "Event details added"
    : null;
  const openTools = useCallback(() => setToolsOpen(true), []);
  const openProperties = useCallback(() => setPropertiesOpen(true), []);

  useStudioKeyboardShortcuts(editor, {
    onSave,
    presenting,
    onTogglePresent: togglePresent,
  });

  const isEventMode = mode === "event" && eventBrief;
  const eventTypeLabel = eventBrief
    ? getEnglishOptionLabel("eventTypes", eventBrief.eventType) ??
      eventBrief.eventType
    : undefined;

  const renderLeftRail = (idPrefix: string) => (
    <StudioRailSlot design={design}>
      {(railDesign) =>
        isEventMode ? (
          <MemoEventPresetLibrary
            design={railDesign}
            onChange={commit}
            selection={selection}
            onSelect={setSelection}
            brief={eventBrief}
          />
        ) : (
          <MemoStudioLeftRail
            design={railDesign}
            onChange={commit}
            selection={selection}
            onSelect={setSelection}
            idPrefix={idPrefix}
          />
        )
      }
    </StudioRailSlot>
  );
  const renderRightRail = (idPrefix: string) => (
    <StudioRailSlot design={design}>
      {(railDesign) =>
        isEventMode ? (
          <MemoEventBriefPanel
            brief={eventBrief}
            design={railDesign}
            onChange={commit}
            selection={selection}
            onSelect={setSelection}
            saveState={saveState}
            defaultName={eventContactDefaults?.name}
            defaultEmail={eventContactDefaults?.email}
            defaultPhone={eventContactDefaults?.phone}
            idPrefix={idPrefix}
          />
        ) : (
          <MemoStudioRightRail
            design={railDesign}
            onChange={commit}
            selection={selection}
            onSelect={setSelection}
            saveState={saveState}
            idPrefix={idPrefix}
          />
        )
      }
    </StudioRailSlot>
  );
  const split = viewMode === "split";

  return (
    <StudioEditorProvider state={editor} presenting={presenting}>
      <StudioLeadProvider value={leadContextValue}>
      <TooltipProvider delayDuration={300} skipDelayDuration={400}>
        <StudioHoverTip />
        <StudioContextMenu disabled={presenting} />
        <StudioShell
          className={className}
          toolsOpen={toolsOpen}
          onToolsOpenChange={setToolsOpen}
          propertiesOpen={propertiesOpen}
          onPropertiesOpenChange={setPropertiesOpen}
          leftRail={renderLeftRail("studio-desktop-tools")}
          rightRail={renderRightRail("studio-desktop-properties")}
          mobileLeftRail={renderLeftRail("studio-mobile-tools")}
          mobileRightRail={renderRightRail("studio-mobile-properties")}
          fullscreen={fullscreen}
          presenting={presenting}
          presentBar={
            <StudioPresentBar
              title={title}
              fullscreen={fullscreen}
              onToggleFullscreen={toggleStudioFullscreen}
              onExit={togglePresent}
            />
          }
          toolbar={
            <StudioToolbar
              title={title}
              onTitleChange={changeTitle}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              saveState={saveState}
              saveMessage={saveMessage}
              accessMode={accessMode}
              onSave={onSave}
              onOpenTools={openTools}
              onOpenProperties={openProperties}
              titleEditable={!isEventMode}
              eventTypeLabel={isEventMode ? eventTypeLabel : undefined}
              saveHidden={isEventMode && accessMode === "guest"}
              fullscreen={fullscreen}
              onToggleFullscreen={toggleStudioFullscreen}
              presenting={presenting}
              onTogglePresent={togglePresent}
              eventSummary={eventSummary}
              onOpenEventDetails={openEventDetails}
            />
          }
        >
          {/* One stable tree for 2D / 3D / Split / Present: switching modes only
              changes the grid, so the WebGL context and camera survive. */}
          <div
            className={cn(
              "grid h-full min-h-0 min-w-0",
              split
                ? "grid-rows-2 lg:grid-cols-2 lg:grid-rows-1"
                : "grid-cols-1 grid-rows-1"
            )}
          >
            {viewMode !== "3d" ? (
              <div
                key="plan"
                className={cn(
                  "min-h-0 min-w-0",
                  split && "border-b border-border/60 lg:border-r lg:border-b-0"
                )}
              >
                <Studio2DEditor
                  design={design}
                  onChange={commit}
                  selection={canvasSelection}
                  onSelect={canvasSelect}
                />
              </div>
            ) : null}
            {viewMode !== "2d" ? (
              <div key="viewer" className="min-h-0 min-w-0">
                <Studio3DViewer
                  design={design}
                  onChange={commit}
                  selection={canvasSelection}
                  onSelect={canvasSelect}
                  presenting={presenting}
                />
              </div>
            ) : null}
          </div>
        </StudioShell>

        {nudge && !presenting && !eventDialogOpen && !guestDialogOpen ? (
          nudge.kind === "restore" ? (
            <LeadNudgeCard
              icon={History}
              eyebrow="Welcome back"
              title="Pick up where you left off?"
              body={`“${nudge.draft.title}” was autosaved ${lastEditedLabel(nudge.draft.last_activity_at)}.`}
              primaryLabel="Restore design"
              onPrimary={() => restoreDraft(nudge.draft)}
              secondaryLabel="Start fresh"
              onSecondary={dismissRestore}
            />
          ) : (
            <LeadNudgeCard
              icon={CalendarHeart}
              eyebrow="Your event"
              title="Planning an event?"
              body="Add your date and guest count so our team can check availability and size your drapes."
              primaryLabel="Add event details"
              onPrimary={openEventDetails}
              secondaryLabel="Not now"
              onSecondary={() => setNudge(null)}
            />
          )
        ) : null}
      </TooltipProvider>

      <EventDetailsDialog
        open={eventDialogOpen}
        onOpenChange={handleEventDialogOpenChange}
        details={eventDetails}
        onSave={changeEventDetails}
        description={
          eventDialogIntent === "before-save"
            ? "Before we save — tell us about the event this room is for. It helps our team check availability. Every field is optional."
            : undefined
        }
        saveLabel={eventDialogIntent === "before-save" ? "Save & continue" : undefined}
      />

      {isGuest ? (
        <SaveDesignDialog
          open={guestDialogOpen}
          onOpenChange={setGuestDialogOpen}
          details={eventDetails}
          initialContact={leadContact}
          onEditDetails={openEventDetails}
          onSubmit={submitLead}
          signInHref={signInWithReturn}
          createAccountHref={createAccountWithReturn}
        />
      ) : null}
      </StudioLeadProvider>
    </StudioEditorProvider>
  );
}

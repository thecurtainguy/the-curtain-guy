"use client";

import { Button } from "@/components/ui/button";
import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import { UserPlus } from "lucide-react";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Dialog } from "@/components/ui/dialog";
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
  useRef,
  useState,
} from "react";
import { Studio2DEditor } from "./studio-2d-editor";
import { Studio3DViewer } from "./studio-3d-lazy";
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

export type StudioDesignerMode = "designer" | "event";

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
  className?: string;
  onSaved?: (record: StudioDesignRow, response: StudioSaveResponse) => void;
  onDesignIdChange?: (id: string) => void;
};

const STUDIO_SESSION_DRAFT_KEY = "tcg-studio-guest-draft-v1";
const ignoreSelection = () => {};

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

  const changeDesign = useCallback((next: StudioDesignJson) => {
    revision.current += 1;
    setDesign(next);
    setSaveState("dirty");
    setSaveMessage(undefined);
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
  }, []);

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
        const destinationBase =
          savedDesignPathBase ??
          (accessMode === "admin"
            ? "/admin/studio"
            : accessMode === "customer"
              ? "/account/studio"
              : undefined);
        if (destinationBase) {
          pendingDestination.current = `${destinationBase.replace(/\/$/, "")}/${nextId}`;
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

      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <BrandDialogContent
          size="sm"
          icon={UserPlus}
          eyebrow="Keep your design"
          title="Save your room to an account"
          description="This draft is kept temporarily in this browser tab. Keep the tab open; if email verification opens another tab, return to this one and use the Return to Studio button."
          footer={
            <>
              <Button asChild variant="outline">
                <a href={signInWithReturn}>Sign in</a>
              </Button>
              <Button asChild>
                <a href={createAccountWithReturn}>Create account</a>
              </Button>
            </>
          }
        />
      </Dialog>
    </StudioEditorProvider>
  );
}

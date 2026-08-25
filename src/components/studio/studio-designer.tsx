"use client";

import { Button } from "@/components/ui/button";
import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STUDIO_TITLE_MAX_LENGTH,
  cloneStudioTemplate,
  validateStudioDesign,
  type StudioDesignJson,
  type StudioDesignRow,
} from "@/data/studio";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Studio2DEditor } from "./studio-2d-editor";
import { Studio3DViewer } from "./studio-3d-viewer";
import { StudioLeftRail } from "./studio-left-rail";
import { StudioRightRail } from "./studio-right-rail";
import { StudioShell } from "./studio-shell";
import { StudioToolbar } from "./studio-toolbar";
import type {
  StudioAccessMode,
  StudioLinkContext,
  StudioSaveResponse,
  StudioSaveState,
  StudioSelection,
  StudioViewMode,
} from "./studio-types";

export type StudioDesignerProps = {
  initialDesign?: StudioDesignJson;
  initialDesignRecord?: Partial<StudioDesignRow>;
  initialDesignId?: string;
  initialTitle?: string;
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

function initialJson(props: StudioDesignerProps): StudioDesignJson {
  const design =
    props.initialDesign ??
    props.initialDesignRecord?.design_json ??
    cloneStudioTemplate("rectangle");
  return structuredClone(design);
}

export function StudioDesigner(props: StudioDesignerProps) {
  const router = useRouter();
  const { setDirty: setGlobalDirty, clearDirty } =
    useOptionalUnsavedChanges();
  const {
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
  const [selection, setSelection] = useState<StudioSelection>(null);
  const [viewMode, setViewMode] = useState<StudioViewMode>("2d");
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (event.key === "Escape") setSelection(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  const leftRail = (
    <StudioLeftRail
      design={design}
      onChange={changeDesign}
      selection={selection}
      onSelect={setSelection}
      idPrefix="studio-desktop-tools"
    />
  );
  const rightRail = (
    <StudioRightRail
      design={design}
      onChange={changeDesign}
      selection={selection}
      onSelect={setSelection}
      saveState={saveState}
      idPrefix="studio-desktop-properties"
    />
  );
  const mobileLeftRail = (
    <StudioLeftRail
      design={design}
      onChange={changeDesign}
      selection={selection}
      onSelect={setSelection}
      idPrefix="studio-mobile-tools"
    />
  );
  const mobileRightRail = (
    <StudioRightRail
      design={design}
      onChange={changeDesign}
      selection={selection}
      onSelect={setSelection}
      saveState={saveState}
      idPrefix="studio-mobile-properties"
    />
  );

  return (
    <>
      <StudioShell
        className={className}
        toolsOpen={toolsOpen}
        onToolsOpenChange={setToolsOpen}
        propertiesOpen={propertiesOpen}
        onPropertiesOpenChange={setPropertiesOpen}
        leftRail={leftRail}
        rightRail={rightRail}
        mobileLeftRail={mobileLeftRail}
        mobileRightRail={mobileRightRail}
        toolbar={
          <StudioToolbar
            title={title}
            onTitleChange={changeTitle}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            saveState={saveState}
            saveMessage={saveMessage}
            accessMode={accessMode}
            onSave={() => void save()}
            onOpenTools={() => setToolsOpen(true)}
            onOpenProperties={() => setPropertiesOpen(true)}
          />
        }
      >
        {viewMode === "2d" ? (
          <Studio2DEditor
            design={design}
            onChange={changeDesign}
            selection={selection}
            onSelect={setSelection}
          />
        ) : (
          <Studio3DViewer
            design={design}
            onChange={changeDesign}
            selection={selection}
            onSelect={setSelection}
          />
        )}
      </StudioShell>

      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent className="overflow-hidden border-primary/20 bg-card">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_72%)]" />
          <DialogHeader className="relative">
            <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
              Keep your design
            </p>
            <DialogTitle className="font-heading text-2xl">
              Save your room to an account
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              This draft is kept temporarily in this browser tab. Keep the tab
              open; if email verification opens another tab, return to this one
              and use the Return to Studio button.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="relative sm:justify-start">
            <Button asChild>
              <a href={createAccountWithReturn}>Create account</a>
            </Button>
            <Button asChild variant="outline">
              <a href={signInWithReturn}>Sign in</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

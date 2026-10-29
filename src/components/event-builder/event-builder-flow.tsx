"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ChevronDown, CornerDownLeft, Mail, Save, SkipForward } from "lucide-react";
import {
  DEFAULT_EVENT_BUILDER_BRIEF,
  EVENT_BUILDER_FALLBACK_EVENT_TYPE,
  clearEventBuilderBrief,
  readEventBuilderBriefBackup,
  readEventBuilderBriefSession,
  readEventBuilderStep,
  saveEventBuilderBrief,
  saveEventBuilderStep,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import {
  EVENT_BUILDER_STEPS,
  EventBuilderStepNav,
} from "@/components/event-builder/event-builder-step-nav";
import { EventStepEvent } from "@/components/event-builder/event-step-event";
import { EventStepRoom } from "@/components/event-builder/event-step-room";
import { EventStepCatalog } from "@/components/event-builder/event-step-catalog";
import { EventStepCeiling } from "@/components/event-builder/event-step-ceiling";
import { EventStepLook } from "@/components/event-builder/event-step-look";
import { EventStepReview } from "@/components/event-builder/event-step-review";
import { EventPlanSubmitDialog } from "@/components/event-builder/event-plan-submit-dialog";
import { LivePlanSidebar } from "@/components/event-builder/live-plan-sidebar";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { ROOM_MIN_FT } from "@/lib/event-builder/brief-room";
import { computeEventWallRoles } from "@/lib/event-builder/wall-roles";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";
import {
  EventPlanRequestError,
  patchEventPlanSubmission,
  postEventPlanSubmission,
} from "@/lib/event-builder/event-plan-client";
import { normalizeStudioDesign } from "@/data/studio";

const STEPS = EVENT_BUILDER_STEPS;
const REVIEW_INDEX = STEPS.length - 1;
const ROOM_INDEX = 1;
/** Steps that show the live plan beside the form. */
const PLAN_ASIDE_STEPS = new Set([1, 2, 3, 4]);

const stepHeadingId = (index: number) => `event-builder-step-${STEPS[index]}`;

/** Fills the only required answers so any step can be skipped. */
function withRequiredDefaults(brief: EventBuilderBrief): EventBuilderBrief {
  const room = brief.room;
  const roomOk = room.widthFt >= ROOM_MIN_FT && room.lengthFt >= ROOM_MIN_FT && room.wallHeightFt > 0;
  if (brief.eventType && roomOk) return brief;
  return {
    ...brief,
    eventType: brief.eventType || EVENT_BUILDER_FALLBACK_EVENT_TYPE,
    room: roomOk
      ? room
      : {
          ...room,
          widthFt: Math.max(ROOM_MIN_FT, room.widthFt || DEFAULT_EVENT_BUILDER_BRIEF.room.widthFt),
          lengthFt: Math.max(ROOM_MIN_FT, room.lengthFt || DEFAULT_EVENT_BUILDER_BRIEF.room.lengthFt),
          wallHeightFt: room.wallHeightFt > 0 ? room.wallHeightFt : DEFAULT_EVENT_BUILDER_BRIEF.room.wallHeightFt,
        },
  };
}

type EventBuilderContactDefaults = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type EventBuilderFlowProps = {
  editPlanId?: string;
  portal?: "admin" | "customer";
  startFresh?: boolean;
  embedded?: boolean;
  initialEditBrief?: EventBuilderBrief;
  initialEditContact?: EventBuilderContactDefaults;
  initialPortalContact?: EventBuilderContactDefaults;
  onEditSaved?: () => void;
  onSubmitSaved?: (planId: string) => void;
  onCancelEdit?: () => void;
};

export function EventBuilderFlow({
  editPlanId,
  portal = "customer",
  startFresh = false,
  embedded = false,
  initialEditBrief,
  initialEditContact,
  initialPortalContact,
  onEditSaved,
  onSubmitSaved,
  onCancelEdit,
}: EventBuilderFlowProps) {
  const t = useTranslations("eventBuilder");
  const copy = useWizardCopy();
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const focusStepOnChange = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [brief, setBrief] = useState<EventBuilderBrief>(
    DEFAULT_EVENT_BUILDER_BRIEF
  );
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backupDraft, setBackupDraft] = useState<EventBuilderBrief | null>(null);
  const [contactDefaults, setContactDefaults] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const isEditMode = Boolean(editPlanId);
  const isNewBuild = !isEditMode;

  const successHref = editPlanId
    ? portal === "admin"
      ? `/admin/event-plans/${editPlanId}`
      : `/account/event-plans/${editPlanId}`
    : undefined;

  const cancelHref = editPlanId
    ? successHref ?? "/account/event-plans"
    : "/studio";

  const deferredBrief = useDeferredValue(brief);
  const design = useMemo(
    () => normalizeStudioDesign(buildStarterDesignFromBrief(deferredBrief)),
    [deferredBrief]
  );
  const frontWall = useMemo(
    () => computeEventWallRoles(design.room.floor).front,
    [design.room.floor]
  );

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = "6rem";
    return () => {
      root.style.scrollPaddingBottom = previous;
    };
  }, []);

  useEffect(() => {
    if (!focusStepOnChange.current) return;
    focusStepOnChange.current = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shellRef.current?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    document.getElementById(stepHeadingId(stepIndex))?.focus({ preventScroll: true });
  }, [stepIndex]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (editPlanId && initialEditBrief) {
        setBrief(initialEditBrief);
        setContactDefaults(
          initialEditContact ?? {
            name: "",
            email: "",
            phone: "",
            notes: "",
          }
        );
        setStepIndex(embedded ? 0 : REVIEW_INDEX);
        setHydrated(true);
        return;
      }

      if (editPlanId) {
        try {
          const response = await fetch(`/api/event-plan/${editPlanId}`);
          const body = (await response.json().catch(() => null)) as {
            ok?: boolean;
            brief?: EventBuilderBrief;
            plan?: {
              contact_name: string;
              contact_email: string;
              contact_phone: string | null;
              notes: string | null;
            };
            message?: string;
          } | null;

          if (!response.ok || !body?.ok || !body.brief) {
            throw new Error(body?.message ?? "Could not load this event plan.");
          }

          if (cancelled) return;
          setBrief(body.brief);
          setContactDefaults({
            name: body.plan?.contact_name ?? "",
            email: body.plan?.contact_email ?? "",
            phone: body.plan?.contact_phone ?? "",
            notes: body.plan?.notes ?? "",
          });
          setStepIndex(REVIEW_INDEX);
          setHydrated(true);
          return;
        } catch (err) {
          if (!cancelled) {
            setLoadError(
              err instanceof Error ? err.message : "Could not load this event plan."
            );
            setHydrated(true);
          }
          return;
        }
      }

      if (startFresh) {
        clearEventBuilderBrief();
        setBrief(DEFAULT_EVENT_BUILDER_BRIEF);
        if (initialPortalContact) {
          setContactDefaults(initialPortalContact);
        }
        setStepIndex(0);
        setBackupDraft(null);
        setHydrated(true);
        return;
      }

      if (embedded) {
        setBrief(DEFAULT_EVENT_BUILDER_BRIEF);
        if (initialPortalContact) {
          setContactDefaults(initialPortalContact);
        }
        setStepIndex(0);
        setBackupDraft(null);
        setHydrated(true);
        return;
      }

      const sessionDraft = readEventBuilderBriefSession();
      if (sessionDraft) {
        setBrief(sessionDraft);
        setStepIndex(readEventBuilderStep(STEPS.length - 1));
        setHydrated(true);
        return;
      }

      const backup = readEventBuilderBriefBackup();
      if (backup?.eventType) {
        setBackupDraft(backup);
        setBrief(DEFAULT_EVENT_BUILDER_BRIEF);
        setStepIndex(0);
        setHydrated(true);
        return;
      }

      setBrief(DEFAULT_EVENT_BUILDER_BRIEF);
      setStepIndex(0);
      setHydrated(true);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [
    editPlanId,
    startFresh,
    initialEditBrief,
    initialEditContact,
    initialPortalContact,
    embedded,
  ]);

  const persistBrief = useCallback(
    (next: EventBuilderBrief) => {
      setBrief(next);
      if (isNewBuild) {
        saveEventBuilderBrief(next);
      }
    },
    [isNewBuild]
  );

  useEffect(() => {
    if (!hydrated || !isNewBuild || backupDraft) return;
    saveEventBuilderBrief(brief);
  }, [brief, hydrated, isNewBuild, backupDraft]);

  useEffect(() => {
    if (!hydrated || !isNewBuild || backupDraft) return;
    saveEventBuilderStep(stepIndex);
  }, [stepIndex, hydrated, isNewBuild, backupDraft]);

  function continueBackupDraft() {
    if (!backupDraft) return;
    setBrief(backupDraft);
    saveEventBuilderBrief(backupDraft);
    setStepIndex(readEventBuilderStep(STEPS.length - 1));
    setBackupDraft(null);
  }

  function dismissBackupDraft() {
    clearEventBuilderBrief();
    setBrief(DEFAULT_EVENT_BUILDER_BRIEF);
    setStepIndex(0);
    setBackupDraft(null);
  }

  function validateStep(index: number): boolean {
    if (index === 0 && !brief.eventType) {
      setStepError(t("validation.eventType"));
      return false;
    }
    if (
      index === ROOM_INDEX &&
      (brief.room.widthFt < ROOM_MIN_FT || brief.room.lengthFt < ROOM_MIN_FT)
    ) {
      setStepError(t("validation.roomSize"));
      return false;
    }
    setStepError(null);
    return true;
  }

  function moveTo(index: number) {
    focusStepOnChange.current = true;
    setStepError(null);
    setStepIndex(Math.min(Math.max(index, 0), REVIEW_INDEX));
  }

  function goNext() {
    if (!validateStep(stepIndex)) return;
    moveTo(stepIndex + 1);
  }

  function skipStep() {
    const next = withRequiredDefaults(brief);
    if (next !== brief) persistBrief(next);
    moveTo(stepIndex + 1);
  }

  function goBack() {
    moveTo(stepIndex - 1);
  }

  function goToStep(index: number) {
    if (index > stepIndex) {
      const next = withRequiredDefaults(brief);
      if (next !== brief) persistBrief(next);
    }
    moveTo(index);
  }

  function handleStepKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement) || stepIndex >= REVIEW_INDEX) return;
    event.preventDefault();
    goNext();
  }

  const handleSubmitPlan = useCallback(async () => {
    const canDirectSubmit =
      embedded &&
      contactDefaults.name.trim().length > 0 &&
      contactDefaults.email.trim().length > 0;

    if (!canDirectSubmit) {
      setSubmitOpen(true);
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const body = await postEventPlanSubmission(
        brief,
        normalizeStudioDesign(buildStarterDesignFromBrief(brief)),
        contactDefaults
      );

      clearEventBuilderBrief();
      toast.success(t("submit.toasts.submitted"));

      if (onSubmitSaved && body.id) {
        onSubmitSaved(body.id);
        return;
      }

      const successParams = new URLSearchParams();
      if (body.reference) successParams.set("ref", body.reference);
      if (body.id) successParams.set("id", body.id);
      if (contactDefaults.email.trim()) {
        successParams.set("email", contactDefaults.email.trim());
      }
      router.push(`/studio/plan/success?${successParams.toString()}`);
    } catch (err) {
      const errorMessage =
        err instanceof EventPlanRequestError && err.message
          ? err.message
          : t("submit.errorGeneric");
      setSaveError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [
    embedded,
    contactDefaults,
    brief,
    onSubmitSaved,
    router,
    t,
  ]);

  const handleSaveChanges = useCallback(async () => {
    if (!editPlanId) return;

    setSaveError(null);
    setSaving(true);
    try {
      await patchEventPlanSubmission(
        editPlanId,
        brief,
        normalizeStudioDesign(buildStarterDesignFromBrief(brief)),
        contactDefaults
      );
      toast.success(t("submit.toasts.updated"));

      if (onEditSaved) {
        onEditSaved();
        return;
      }

      if (successHref) {
        router.push(successHref);
      }
    } catch (err) {
      const errorMessage =
        err instanceof EventPlanRequestError && err.message
          ? err.message
          : t("submit.errorGeneric");
      setSaveError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [
    editPlanId,
    brief,
    contactDefaults,
    onEditSaved,
    successHref,
    router,
    t,
  ]);

  const shellClass = embedded
    ? ""
    : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12";

  if (!hydrated) {
    return (
      <div
        className={
          embedded
            ? "py-12 text-center text-sm text-muted-foreground"
            : "mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted-foreground"
        }
      >
        Loading event builder…
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={
          embedded
            ? "py-12 text-center"
            : "mx-auto max-w-2xl px-4 py-16 text-center"
        }
      >
        <p className="text-sm text-destructive" role="alert">{loadError}</p>
        {onCancelEdit ? (
          <Button className="mt-4" variant="outline" onClick={onCancelEdit}>
            {t("flow.cancelEdit")}
          </Button>
        ) : (
          <Button asChild className="mt-4" variant="outline">
            <Link href={cancelHref}>Go back</Link>
          </Button>
        )}
      </div>
    );
  }

  const showPlanAside = PLAN_ASIDE_STEPS.has(stepIndex);
  const planSidebar = (
    <LivePlanSidebar
      brief={deferredBrief}
      design={design}
      frontWall={frontWall}
      onRemoveSelection={(id) =>
        persistBrief({
          ...brief,
          catalogSelections: brief.catalogSelections.filter((value) => value !== id),
        })
      }
      onClearAll={() => persistBrief({ ...brief, catalogSelections: [] })}
    />
  );
  const stepProps = {
    brief,
    onChange: persistBrief,
    headingId: stepHeadingId(stepIndex),
  };

  return (
    <div ref={shellRef} className={`scroll-mt-24 ${shellClass}`}>
      {backupDraft && !embedded ? (
        <div
          className="mb-6 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 sm:p-5"
          role="region"
          aria-label={t("draftBanner.aria")}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("draftBanner.eyebrow")}
          </p>
          <h2 className="mt-1 font-heading text-lg font-semibold">
            {t("draftBanner.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("draftBanner.description")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={continueBackupDraft}>
              {t("draftBanner.continue")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={dismissBackupDraft}
            >
              {t("draftBanner.startNew")}
            </Button>
          </div>
        </div>
      ) : null}

      {editPlanId && !embedded ? (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {t("flow.editingSavedPlan")}
        </p>
      ) : null}

      {embedded ? (
        <div className="mb-6">
          <EventBuilderStepNav
            currentIndex={stepIndex}
            onStepSelect={goToStep}
          />
        </div>
      ) : (
        <div className="mb-8 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {t("flow.eyebrow")}
          </p>
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
            {editPlanId ? t("flow.editTitle") : t("flow.title")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            {editPlanId ? t("flow.editDescription") : t("flow.description")}
          </p>

          <EventBuilderStepNav
            currentIndex={stepIndex}
            onStepSelect={goToStep}
          />
        </div>
      )}

      <div
        onKeyDown={handleStepKeyDown}
        className={
          showPlanAside
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
            : undefined
        }
      >
        <div className="min-w-0">
          {stepIndex === 0 ? <EventStepEvent {...stepProps} /> : null}
          {stepIndex === 1 ? <EventStepRoom {...stepProps} /> : null}
          {stepIndex === 2 ? <EventStepCatalog {...stepProps} /> : null}
          {stepIndex === 3 ? <EventStepCeiling {...stepProps} /> : null}
          {stepIndex === 4 ? <EventStepLook {...stepProps} /> : null}
          {stepIndex === REVIEW_INDEX ? (
            <EventStepReview
              {...stepProps}
              design={design}
              frontWall={frontWall}
              onEditStep={goToStep}
            />
          ) : null}
        </div>
        {showPlanAside ? (
          <>
            <div className="hidden lg:sticky lg:top-24 lg:block">{planSidebar}</div>
            <details className="group rounded-3xl border border-border/40 bg-card/25 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {copy.review.plan}
                <ChevronDown className="size-4 text-primary transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="px-2 pb-2">{planSidebar}</div>
            </details>
          </>
        ) : null}
      </div>

      {stepError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {stepError}
        </p>
      ) : null}

      {saveError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      {stepIndex < REVIEW_INDEX ? (
        <div className="sticky bottom-0 z-30 -mx-4 mt-8 flex items-center justify-between gap-2 border-t border-border/40 bg-background/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          {stepIndex === 0 ? (
            onCancelEdit ? (
              <Button type="button" variant="ghost" onClick={onCancelEdit}>
                {editPlanId ? t("flow.cancelEdit") : t("flow.cancelBuild")}
              </Button>
            ) : (
              <Button type="button" variant="ghost" asChild>
                <Link href={cancelHref}>{t("flow.cancel")}</Link>
              </Button>
            )
          ) : (
            <Button type="button" variant="ghost" onClick={goBack}>
              <ArrowLeft className="size-4" />
              {t("flow.back")}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground xl:inline-flex">
              <CornerDownLeft className="size-3" aria-hidden />
              {copy.flow.enterHint}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={skipStep}
              disabled={Boolean(backupDraft)}
              className="text-muted-foreground"
            >
              <SkipForward className="size-4" aria-hidden />
              <span className="hidden sm:inline">{copy.flow.skip}</span>
              <span className="sr-only sm:hidden">{copy.flow.skip}</span>
            </Button>
            <Button type="button" onClick={goNext} disabled={Boolean(backupDraft)}>
              {t("flow.next")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 z-30 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-border/40 bg-background/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <Button type="button" variant="ghost" onClick={goBack}>
            <ArrowLeft className="size-4" />
            {t("flow.back")}
          </Button>
          {editPlanId ? (
            <LoadingButton
              type="button"
              size="lg"
              className="min-w-[12rem] shadow-sm"
              isLoading={saving}
              icon={<Save className="size-4" />}
              onClick={() => void handleSaveChanges()}
              disabled={Boolean(backupDraft)}
            >
              {t("flow.saveChanges")}
            </LoadingButton>
          ) : (
            <LoadingButton
              type="button"
              size="lg"
              className="min-w-[12rem] shadow-sm"
              isLoading={saving}
              icon={<Mail className="size-4" />}
              onClick={() => void handleSubmitPlan()}
              disabled={Boolean(backupDraft)}
            >
              {t("flow.submitPlan")}
            </LoadingButton>
          )}
        </div>
      )}

      {!editPlanId ? (
        <EventPlanSubmitDialog
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          brief={brief}
          design={design}
          defaultName={contactDefaults.name}
          defaultEmail={contactDefaults.email}
          defaultPhone={contactDefaults.phone}
          defaultNotes={contactDefaults.notes}
          onSubmitSuccess={
            onSubmitSaved
              ? (result) => {
                  if (result.id) onSubmitSaved(result.id);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

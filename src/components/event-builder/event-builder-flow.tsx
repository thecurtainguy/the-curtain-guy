"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Mail, Save } from "lucide-react";
import {
  DEFAULT_EVENT_BUILDER_BRIEF,
  clearEventBuilderBrief,
  readEventBuilderBriefBackup,
  readEventBuilderBriefSession,
  readEventBuilderStep,
  saveEventBuilderBrief,
  saveEventBuilderStep,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import { EventBuilderStepNav } from "@/components/event-builder/event-builder-step-nav";
import { EventStepEventRoom } from "@/components/event-builder/event-step-event-room";
import { EventStepCatalog } from "@/components/event-builder/event-step-catalog";
import { EventStepLook } from "@/components/event-builder/event-step-look";
import { EventStepReview } from "@/components/event-builder/event-step-review";
import { EventPlanSubmitDialog } from "@/components/event-builder/event-plan-submit-dialog";
import { LivePlanBottomBar } from "@/components/event-builder/live-plan-sidebar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";
import { patchEventPlanSubmission, postEventPlanSubmission } from "@/lib/event-builder/event-plan-client";
import { normalizeStudioDesign } from "@/data/studio";

const STEPS = ["event", "catalog", "look", "review"] as const;

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
  const router = useRouter();
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
        setStepIndex(embedded ? 0 : 3);
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
          setStepIndex(3);
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
    if (index === 0) {
      if (!brief.eventType) {
        setStepError(t("validation.eventType"));
        return false;
      }
      if (brief.room.widthFt < 10 || brief.room.lengthFt < 10) {
        setStepError(t("validation.roomSize"));
        return false;
      }
    }
    setStepError(null);
    return true;
  }

  function goNext() {
    if (!validateStep(stepIndex)) return;
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function goToStep(index: number) {
    setStepError(null);
    setStepIndex(index);
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
      setSaveError(
        err instanceof Error ? err.message : t("submit.errorGeneric")
      );
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

      if (onEditSaved) {
        onEditSaved();
        return;
      }

      if (successHref) {
        router.push(successHref);
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t("submit.errorGeneric")
      );
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

  const design = normalizeStudioDesign(buildStarterDesignFromBrief(brief));

  return (
    <div className={shellClass}>
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

      {stepIndex === 0 ? (
        <EventStepEventRoom brief={brief} onChange={persistBrief} />
      ) : null}
      {stepIndex === 1 ? (
        <EventStepCatalog brief={brief} onChange={persistBrief} />
      ) : null}
      {stepIndex === 2 ? (
        <EventStepLook brief={brief} onChange={persistBrief} />
      ) : null}
      {stepIndex === 3 ? (
        <EventStepReview brief={brief} onEditStep={goToStep} />
      ) : null}

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

      {stepIndex < 3 ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-6">
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
          <Button type="button" onClick={goNext} disabled={Boolean(backupDraft)}>
            {t("flow.next")}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-6">
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

      {stepIndex === 1 && !backupDraft ? (
        <LivePlanBottomBar brief={brief} onOpenReview={() => setStepIndex(3)} />
      ) : null}

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

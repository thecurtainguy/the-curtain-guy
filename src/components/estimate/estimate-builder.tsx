"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Mail,
} from "lucide-react";
import {
  buildEstimateMailto,
  canSubmitEstimate,
  estimateBuilderSteps,
  formatEstimateReference,
  initialEstimateFormData,
  type EstimateFormData,
  validateEstimateStep,
} from "@/data/estimate";
import { DateInput } from "@/components/ui/date-input";
import { OptionCard } from "@/components/estimate/option-card";
import { EstimateContactCard } from "@/components/estimate/estimate-contact-card";
import {
  EstimateSubmitSuccess,
  type EstimateSuccessViewerRole,
} from "@/components/estimate/estimate-submit-success";
import { EstimateSummary } from "@/components/estimate/estimate-summary";
import {
  EstimateFilePicker,
  uploadEstimateFiles,
  type FileUploadProgress,
  type SelectedEstimateFile,
} from "@/components/estimates/estimate-file-picker";
import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StepTransition } from "@/components/animation/step-transition";
import { Reveal } from "@/components/animation/reveal";
import {
  useEstimateLabelSource,
  useLocalizedEstimateOptions,
  useLocalizedEstimateSteps,
} from "@/lib/i18n/estimate";
import {
  clearEstimatePrefillFromEventBuilder,
  readEstimatePrefillFromEventBuilder,
} from "@/data/event-builder/brief";
import {
  mergeEstimatePrefill,
} from "@/lib/event-builder/map-brief-to-estimate";

function toggleSelection(values: string[], id: string): string[] {
  return values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];
}

function toggleFabricDirection(current: string[], id: string): string[] {
  if (id === "recommend") {
    return current.includes("recommend") ? [] : ["recommend"];
  }
  const withoutRecommend = current.filter((value) => value !== "recommend");
  return toggleSelection(withoutRecommend, id);
}

export function EstimateBuilder() {
  const { setDirty, clearDirty } = useOptionalUnsavedChanges();
  const tBuilder = useTranslations("estimate.builder");
  const tValidation = useTranslations("estimate.validation");
  const tEstimate = useTranslations("estimate");
  const steps = useLocalizedEstimateSteps();
  const options = useLocalizedEstimateOptions();
  const labelSource = useEstimateLabelSource();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [formData, setFormData] = useState<EstimateFormData>(
    initialEstimateFormData
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [showContactHint, setShowContactHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedEstimateFile[]>(
    []
  );
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>(
    []
  );
  const [submitSuccess, setSubmitSuccess] = useState<{
    requestId?: string;
    reference?: string;
    uploadFailed?: number;
    uploadUploaded?: number;
    viewerRole: EstimateSuccessViewerRole;
    accountEstimateHref?: string | null;
    adminEstimateHref?: string | null;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const skipStepScrollRef = useRef(true);

  useEffect(() => {
    const raw = readEstimatePrefillFromEventBuilder();
    if (!raw) return;
    clearEstimatePrefillFromEventBuilder();
    setFormData((prev) =>
      mergeEstimatePrefill(prev, raw as Partial<EstimateFormData>)
    );
  }, []);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === estimateBuilderSteps.length - 1;
  const progress = ((currentStep + 1) / estimateBuilderSteps.length) * 100;
  const canSubmit = canSubmitEstimate(formData);

  const mailtoHref = useMemo(
    () => buildEstimateMailto(formData, labelSource),
    [formData, labelSource]
  );

  useEffect(() => {
    if (submitSuccess) {
      clearDirty();
      return;
    }

    const formDirty =
      JSON.stringify(formData) !== JSON.stringify(initialEstimateFormData);
    const stepDirty = currentStep > 0;
    const filesDirty = selectedFiles.length > 0;
    setDirty(formDirty || stepDirty || filesDirty);
  }, [
    formData,
    currentStep,
    selectedFiles,
    submitSuccess,
    setDirty,
    clearDirty,
  ]);

  useEffect(() => {
    return () => {
      clearDirty();
    };
  }, [clearDirty]);

  useEffect(() => {
    if (skipStepScrollRef.current) {
      skipStepScrollRef.current = false;
      return;
    }

    // Success screen handles its own confetti + scroll — this effect only runs in the builder.
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!mobile) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const node = formTopRef.current;
    if (!node) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      node.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep]);

  function updateField<K extends keyof EstimateFormData>(
    field: K,
    value: EstimateFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setStepError(null);
    if (field === "name" || field === "email") {
      setShowContactHint(false);
    }
  }

  function goNext() {
    const result = validateEstimateStep(step.id, formData);
    if (!result.valid) {
      setStepError(
        result.messageKey
          ? tValidation(result.messageKey)
          : tBuilder("requiredFields")
      );
      return;
    }

    setStepError(null);
    if (!isLastStep) {
      setStepDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }

  function goBack() {
    if (!isFirstStep) {
      setStepError(null);
      setStepDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }

  function handleStepJump(index: number) {
    if (index <= currentStep) {
      setStepError(null);
      setStepDirection(index < currentStep ? -1 : 1);
      setCurrentStep(index);
      return;
    }

    for (let i = currentStep; i < index; i++) {
      const result = validateEstimateStep(estimateBuilderSteps[i].id, formData);
      if (!result.valid) {
        setStepDirection(i < currentStep ? -1 : 1);
        setCurrentStep(i);
        setStepError(
          result.messageKey
            ? tValidation(result.messageKey)
            : tBuilder("requiredFields")
        );
        return;
      }
    }

    setStepError(null);
    setStepDirection(1);
    setCurrentStep(index);
  }

  function handleRequestClick() {
    if (isSubmitting || submitSuccess) return;

    const result = validateEstimateStep("contact-summary", formData);
    if (!result.valid) {
      setShowContactHint(true);
      setStepError(
        result.messageKey
          ? tValidation(result.messageKey)
          : tBuilder("contactRequired")
      );
      return;
    }

    setShowContactHint(false);
    setStepError(null);
    setSubmitError(null);
    setUploadProgress([]);
    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            website: honeypot,
            expectedFileCount: selectedFiles.length,
          }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          requestId?: string;
          opportunity_ref?: string | null;
          opportunity_number?: number | null;
          uploadToken?: string | null;
          isAuthenticated?: boolean;
          viewerRole?: EstimateSuccessViewerRole;
          accountEstimateHref?: string | null;
          adminEstimateHref?: string | null;
        };

        if (!response.ok || !payload.ok) {
          setSubmitError(payload.message ?? tBuilder("submitError"));
          return;
        }

        let uploadFailed = 0;
        let uploadUploaded = 0;
        if (payload.requestId && selectedFiles.length > 0) {
          const uploadResult = await uploadEstimateFiles({
            estimateRequestId: payload.requestId,
            uploadToken: payload.uploadToken ?? null,
            files: selectedFiles,
            onProgress: setUploadProgress,
          });
          uploadFailed = uploadResult.failed;
          uploadUploaded = uploadResult.uploaded;
        }

        const viewerRole: EstimateSuccessViewerRole =
          payload.viewerRole === "owner" ||
          payload.viewerRole === "customer" ||
          payload.viewerRole === "guest"
            ? payload.viewerRole
            : payload.isAuthenticated
              ? "customer"
              : "guest";

        setSubmitSuccess({
          requestId: payload.requestId,
          reference: payload.requestId
            ? formatEstimateReference(
                payload.requestId,
                payload.opportunity_ref
              )
            : undefined,
          uploadFailed,
          uploadUploaded,
          viewerRole,
          accountEstimateHref: payload.accountEstimateHref,
          adminEstimateHref: payload.adminEstimateHref,
        });
        clearDirty();
      } catch {
        setSubmitError(tBuilder("submitErrorNetwork"));
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  if (submitSuccess) {
    return (
      <Reveal variant="reveal-soft" immediate className="space-y-4">
        <EstimateSubmitSuccess
          reference={submitSuccess.reference}
          uploadUploaded={submitSuccess.uploadUploaded}
          uploadFailed={submitSuccess.uploadFailed}
          viewerRole={submitSuccess.viewerRole}
          email={formData.email}
          accountEstimateHref={submitSuccess.accountEstimateHref}
          adminEstimateHref={submitSuccess.adminEstimateHref}
          uploadProgress={uploadProgress}
          onSubmitAnother={() => {
            setSubmitSuccess(null);
            setUploadProgress([]);
            setSelectedFiles([]);
            setSubmitError(null);
            setCurrentStep(0);
          }}
        />
      </Reveal>
    );
  }

  return (
    <div ref={formTopRef} className="space-y-8 scroll-mt-[calc(4rem+env(safe-area-inset-top,0px))]">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />

      {/* Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {tBuilder("stepOf", {
                current: currentStep + 1,
                total: estimateBuilderSteps.length,
              })}
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {tBuilder("percentComplete", { percent: Math.round(progress) })}
          </p>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-border/40"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={tBuilder("stepOf", {
            current: currentStep + 1,
            total: estimateBuilderSteps.length,
          })}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="hidden gap-2 sm:grid sm:grid-cols-6">
          {estimateBuilderSteps.map((builderStep, index) => {
            const localizedStep = steps[index];
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <button
                key={builderStep.id}
                type="button"
                onClick={() => handleStepJump(index)}
                className={cn(
                  "rounded-xl px-2 py-2 text-center text-xs transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : isComplete
                      ? "text-foreground hover:bg-card/60"
                      : "text-muted-foreground hover:bg-card/40"
                )}
              >
                <span className="block font-medium">
                  {localizedStep.shortTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <StepTransition stepKey={step.id} direction={stepDirection}>
        {step.id === "event-basics" && (
          <div className="space-y-8">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("eventBasics.eventType")}{" "}
                <span className="text-primary">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {options.eventTypes.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.eventType === option.id}
                    onSelect={() => updateField("eventType", option.id)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-date">{tBuilder("eventBasics.eventDate")}</Label>
                <DateInput
                  id="event-date"
                  value={formData.eventDate}
                  onChange={(date) => updateField("eventDate", date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-count">{tBuilder("eventBasics.guestCount")}</Label>
                <Input
                  id="guest-count"
                  type="number"
                  min={1}
                  className="input-no-spin"
                  value={formData.guestCount}
                  onChange={(e) => updateField("guestCount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-name">{tBuilder("eventBasics.venueName")}</Label>
                <Input
                  id="venue-name"
                  value={formData.venueName}
                  onChange={(e) => updateField("venueName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city-area">
                  {tBuilder("eventBasics.cityArea")}{" "}
                  <span className="text-primary">*</span>
                </Label>
                <Input
                  id="city-area"
                  placeholder="Montreal, Laval, South Shore..."
                  value={formData.cityArea}
                  onChange={(e) => updateField("cityArea", e.target.value)}
                  aria-invalid={stepError && !formData.cityArea.trim() ? true : undefined}
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("eventBasics.venueSetting")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {options.venueSettings.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.venueSetting === option.id}
                    onSelect={() => updateField("venueSetting", option.id)}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step.id === "drape-goal" && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">
              {tBuilder("drapeGoal.title")}{" "}
              <span className="text-primary">*</span>
            </legend>
            <p className="text-sm text-muted-foreground">
              {tBuilder("drapeGoal.subtitle")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.drapeGoals.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  mode="multi"
                  selected={formData.drapeGoals.includes(option.id)}
                  onSelect={() =>
                    updateField(
                      "drapeGoals",
                      toggleSelection(formData.drapeGoals, option.id)
                    )
                  }
                />
              ))}
            </div>
          </fieldset>
        )}

        {step.id === "measurements" && (
          <div className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("measurements.measurementsKnown")}{" "}
                <span className="text-primary">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {options.measurementsKnownOptions.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.measurementsKnown === option.id}
                    onSelect={() => updateField("measurementsKnown", option.id)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="linear-feet">{tBuilder("measurements.wallLength")}</Label>
                <Input
                  id="linear-feet"
                  placeholder={tBuilder("measurements.wallLengthPlaceholder")}
                  value={formData.linearFeet}
                  onChange={(e) => updateField("linearFeet", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wall-sections">{tBuilder("measurements.runLayout")}</Label>
                <Input
                  id="wall-sections"
                  value={formData.wallSections}
                  onChange={(e) => updateField("wallSections", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doors-openings">{tBuilder("measurements.floorPlan")}</Label>
                <Input
                  id="doors-openings"
                  value={formData.doorsOpenings}
                  onChange={(e) =>
                    updateField("doorsOpenings", e.target.value)
                  }
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("measurements.ceilingHeight")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {options.heightOptions.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.heightNeeded === option.id}
                    onSelect={() => updateField("heightNeeded", option.id)}
                  />
                ))}
              </div>
              <div className="space-y-2 pt-1">
                <Label htmlFor="height-custom">{tBuilder("measurements.ceilingHeight")}</Label>
                <Input
                  id="height-custom"
                  value={
                    options.heightOptions.some((o) => o.id === formData.heightNeeded)
                      ? ""
                      : formData.heightNeeded
                  }
                  onChange={(e) => updateField("heightNeeded", e.target.value)}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("measurements.runLayout")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {options.runLayouts.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.runLayout === option.id}
                    onSelect={() => updateField("runLayout", option.id)}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("measurements.floorPlan")}{" "}
                <span className="text-primary">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {options.floorPlanOptions.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.floorPlanAvailable === option.id}
                    onSelect={() =>
                      updateField("floorPlanAvailable", option.id)
                    }
                  />
                ))}
              </div>
            </fieldset>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {tEstimate("measurementsReassurance")}
              </p>
            </div>
          </div>
        )}

        {step.id === "look-fabric" && (
          <div className="space-y-8">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("lookFabric.fabric")}{" "}
                <span className="text-primary">*</span>
              </legend>
              <p className="text-sm text-muted-foreground">
                {tBuilder("drapeGoal.subtitle")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {options.fabricDirections.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    mode="multi"
                    selected={formData.fabricDirections.includes(option.id)}
                    onSelect={() =>
                      updateField(
                        "fabricDirections",
                        toggleFabricDirection(formData.fabricDirections, option.id)
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {tBuilder("lookFabric.fullness")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {options.fullnessOptions.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={formData.fullnessPreference === option.id}
                    onSelect={() =>
                      updateField("fullnessPreference", option.id)
                    }
                  />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step.id === "add-ons" && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">
              {tBuilder("addOns.title")}
            </legend>
            <p className="text-sm text-muted-foreground">
              {tBuilder("addOns.subtitle")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {options.addOns.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  mode="multi"
                  selected={formData.addOns.includes(option.id)}
                  onSelect={() =>
                    updateField(
                      "addOns",
                      toggleSelection(formData.addOns, option.id)
                    )
                  }
                />
              ))}
            </div>
          </fieldset>
        )}

        {step.id === "contact-summary" && (
          <div className="w-full space-y-8">
            <EstimateFilePicker
              files={selectedFiles}
              onChange={setSelectedFiles}
              disabled={isSubmitting}
              uploadProgress={isSubmitting ? uploadProgress : undefined}
            />

            <EstimateContactCard
              data={formData}
              onFieldChange={updateField}
              showValidationHint={showContactHint}
              canSubmit={canSubmit}
            />

            <EstimateSummary data={formData} />
          </div>
        )}
      </StepTransition>

      {submitError && isLastStep && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-3">
              <p className="text-sm text-foreground">{submitError}</p>
              <Button asChild variant="outline" size="sm">
                <a href={mailtoHref}>
                  <Mail className="size-4" />
                  {tBuilder("emailFallback")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {stepError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{stepError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col-reverse gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={isFirstStep}
          className="sm:min-w-28"
        >
          <ArrowLeft className="size-4" />
          {tBuilder("back")}
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          {!isLastStep ? (
            <Button type="button" onClick={goNext} className="sm:min-w-32">
              {tBuilder("next")}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <LoadingButton
              type="button"
              onClick={handleRequestClick}
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingText={tBuilder("submitting")}
              icon={<Mail className="size-4" />}
              className={cn(!canSubmit && "opacity-60")}
            >
              {tBuilder("submit")}
            </LoadingButton>
          )}
        </div>
      </div>

      {isLastStep && (
        <p className="text-center text-xs text-muted-foreground">
          {canSubmit ? tBuilder("emailFallback") : tBuilder("contactRequired")}
        </p>
      )}
    </div>
  );
}

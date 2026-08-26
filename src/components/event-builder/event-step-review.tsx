"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Box, ExternalLink } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  openGetEstimateFromEventBuilder,
  openStudioDesignerMode,
  openStudioEventMode,
  saveEventBuilderBrief,
  saveEstimatePrefillFromEventBuilder,
} from "@/data/event-builder/brief";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";
import { mapEventBuilderBriefToEstimate } from "@/lib/event-builder/map-brief-to-estimate";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { Button } from "@/components/ui/button";
import {
  ReviewEditableSection,
  ReviewStatTile,
} from "@/components/event-builder/review-editable-section";
import {
  useLocalizedEventCatalog,
  useLocalizedDrapeColors,
} from "@/lib/i18n/event-builder";
import { fullnessIdFromValue } from "@/data/event-builder/look";
import {
  getOptionLabel,
  useLocalizedEventTypes,
} from "@/lib/i18n/estimate";

const STEP_EVENT = 0;
const STEP_CATALOG = 1;
const STEP_LOOK = 2;

type EventStepReviewProps = {
  brief: EventBuilderBrief;
  onEditStep: (stepIndex: number) => void;
};

export function EventStepReview({
  brief,
  onEditStep,
}: EventStepReviewProps) {
  const t = useTranslations("eventBuilder");
  const catalog = useLocalizedEventCatalog();
  const eventTypes = useLocalizedEventTypes();
  const tFullness = useTranslations("eventBuilder.fullnessOptions");
  const drapeColors = useLocalizedDrapeColors();

  const previewDesign = useMemo(
    () => buildStarterDesignFromBrief(brief),
    [brief]
  );

  const areaSqFt = Math.round(
    calculateRoomAreaSquareFeet(previewDesign.room.floor)
  );
  const linearDrape = inchesToFeetLabel(calculateDrapeLength(previewDesign));
  const eventLabel =
    getOptionLabel(eventTypes, brief.eventType) ?? brief.eventType;
  const colorLabel =
    drapeColors.find((color) => color.value === brief.look.primaryColor)?.label ??
    brief.look.primaryColor;
  const fullnessLabel = tFullness(
    `${fullnessIdFromValue(brief.look.fullness)}.label`
  );
  const ceilingLabel = t("review.ceilingLabel", {
    height: brief.room.wallHeightFt,
  });

  function openInStudio() {
    saveEventBuilderBrief(brief);
    openStudioEventMode();
  }

  function openAdvancedStudio() {
    saveEventBuilderBrief(brief);
    openStudioDesignerMode();
  }

  function handoffToEstimate() {
    saveEventBuilderBrief(brief);
    saveEstimatePrefillFromEventBuilder(
      mapEventBuilderBriefToEstimate(brief) as Record<string, unknown>
    );
    openGetEstimateFromEventBuilder();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_12%_20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_45%)] p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {t("step4.eyebrow")}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
          {t("step4.title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("step4.description")}
        </p>

        <div className="mt-6 space-y-4">
          <ReviewEditableSection
            title={t("step4.sectionEventRoom")}
            editLabel={t("step4.editEventRoom")}
            stepIndex={STEP_EVENT}
            onEditStep={onEditStep}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReviewStatTile label={t("step4.event")} value={eventLabel || "—"} />
              <ReviewStatTile
                label={t("step4.room")}
                value={`${brief.room.widthFt}′ × ${brief.room.lengthFt}′`}
              />
              <ReviewStatTile label={t("step4.area")} value={`${areaSqFt} ft²`} />
              <ReviewStatTile label={t("step4.linearDrape")} value={linearDrape} />
            </div>
          </ReviewEditableSection>

          <ReviewEditableSection
            title={t("step4.setups")}
            editLabel={t("step4.editSetups")}
            stepIndex={STEP_CATALOG}
            onEditStep={onEditStep}
          >
            {brief.catalogSelections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("step4.noSetups")}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {brief.catalogSelections.map((id) => (
                  <li
                    key={id}
                    className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium"
                  >
                    {catalog.getItemLabel(id)}
                  </li>
                ))}
              </ul>
            )}
          </ReviewEditableSection>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewEditableSection
              title={t("step4.fabric")}
              editLabel={t("step4.editLook")}
              stepIndex={STEP_LOOK}
              onEditStep={onEditStep}
            >
              <p className="font-medium">{colorLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("review.fullnessLabel", { value: fullnessLabel })}
              </p>
            </ReviewEditableSection>

            <ReviewEditableSection
              title={t("step4.venue")}
              editLabel={t("step4.editVenue")}
              stepIndex={STEP_EVENT}
              onEditStep={onEditStep}
            >
              <p className="font-medium">{brief.venueName?.trim() || "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {brief.eventDate || t("review.dateNotSet")} · {ceilingLabel}
              </p>
            </ReviewEditableSection>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          {t("step4.disclaimer")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" size="lg" onClick={openInStudio}>
            <Box className="size-4" />
            {t("step4.ctaStudio")}
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={openAdvancedStudio}>
            {t("step4.ctaAdvanced")}
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-10"
            onClick={handoffToEstimate}
          >
            {t("step4.ctaEstimate")}
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("step4.keepTabHint")}
        </p>
      </div>
    </div>
  );
}

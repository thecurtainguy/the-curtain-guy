"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  addOnOptions,
  drapeGoals,
  estimateBuilderSteps,
  eventTypes,
  fabricDirections,
  floorPlanOptions,
  fullnessOptions,
  heightOptions,
  measurementsKnownOptions,
  NOT_SURE_IDS,
  runLayouts,
  venueSettings,
  createLabelSourceFromOptions,
  type EstimateFormData,
  type EstimateOptionDef,
} from "@/data/estimate";

export type LocalizedEstimateOption = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

export type LocalizedEstimateStep = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
};

type OptionTranslator = ReturnType<typeof useTranslations>;

function localizeOptionGroup(
  defs: EstimateOptionDef[],
  t: OptionTranslator,
  withDescription = false
): LocalizedEstimateOption[] {
  return defs.map((def) => ({
    id: def.id,
    icon: def.icon,
    label: t(`${def.id}.label`),
    description: withDescription ? t(`${def.id}.description`) : undefined,
  }));
}

export function useLocalizedEstimateSteps(): LocalizedEstimateStep[] {
  const t = useTranslations("estimate.steps");
  return estimateBuilderSteps.map((step) => ({
    id: step.id,
    title: t(`${step.id}.title`),
    shortTitle: t(`${step.id}.shortTitle`),
    description: t(`${step.id}.description`),
  }));
}

export function useLocalizedEventTypes() {
  const t = useTranslations("estimate.options.eventTypes");
  return localizeOptionGroup(eventTypes, t);
}

export function useLocalizedVenueSettings() {
  const t = useTranslations("estimate.options.venueSettings");
  return localizeOptionGroup(venueSettings, t, true);
}

export function useLocalizedDrapeGoals() {
  const t = useTranslations("estimate.options.drapeGoals");
  return localizeOptionGroup(drapeGoals, t, true);
}

export function useLocalizedRunLayouts() {
  const t = useTranslations("estimate.options.runLayouts");
  return localizeOptionGroup(runLayouts, t, true);
}

export function useLocalizedFloorPlanOptions() {
  const t = useTranslations("estimate.options.floorPlanOptions");
  return localizeOptionGroup(floorPlanOptions, t, true);
}

export function useLocalizedMeasurementsKnownOptions() {
  const t = useTranslations("estimate.options.measurementsKnown");
  return localizeOptionGroup(measurementsKnownOptions, t, true);
}

export function useLocalizedHeightOptions() {
  const t = useTranslations("estimate.options.heightOptions");
  return localizeOptionGroup(heightOptions, t, true);
}

export function useLocalizedFabricDirections() {
  const t = useTranslations("estimate.options.fabricDirections");
  return localizeOptionGroup(fabricDirections, t, true);
}

export function useLocalizedFullnessOptions() {
  const t = useTranslations("estimate.options.fullnessOptions");
  return localizeOptionGroup(fullnessOptions, t, true);
}

export function useLocalizedAddOnOptions() {
  const t = useTranslations("estimate.options.addOns");
  return localizeOptionGroup(addOnOptions, t);
}

export function useLocalizedEstimateOptions() {
  const eventTypeOptions = useLocalizedEventTypes();
  const venueSettingOptions = useLocalizedVenueSettings();
  const drapeGoalOptions = useLocalizedDrapeGoals();
  const runLayoutOptions = useLocalizedRunLayouts();
  const floorPlanOptionList = useLocalizedFloorPlanOptions();
  const measurementsKnownOptionList = useLocalizedMeasurementsKnownOptions();
  const heightOptionList = useLocalizedHeightOptions();
  const fabricDirectionOptions = useLocalizedFabricDirections();
  const fullnessOptionList = useLocalizedFullnessOptions();
  const addOnOptionList = useLocalizedAddOnOptions();

  return {
    eventTypes: eventTypeOptions,
    venueSettings: venueSettingOptions,
    drapeGoals: drapeGoalOptions,
    runLayouts: runLayoutOptions,
    floorPlanOptions: floorPlanOptionList,
    measurementsKnownOptions: measurementsKnownOptionList,
    heightOptions: heightOptionList,
    fabricDirections: fabricDirectionOptions,
    fullnessOptions: fullnessOptionList,
    addOns: addOnOptionList,
  };
}

export function getOptionLabel(
  options: LocalizedEstimateOption[],
  id: string
): string | undefined {
  return options.find((option) => option.id === id)?.label;
}

export function getOptionLabels(
  options: LocalizedEstimateOption[],
  ids: string[]
): string[] {
  return ids
    .map((id) => getOptionLabel(options, id))
    .filter((label): label is string => Boolean(label));
}

export function useEstimateSummaryFormatters(
  options: ReturnType<typeof useLocalizedEstimateOptions>
) {
  const t = useTranslations("estimate.summary");

  const notSure = t("notSure");
  const notProvided = t("notProvided");

  return useMemo(
    () => ({
      notSure,
      notProvided,
      formatSummaryValue: (value: string | undefined) => {
        if (!value?.trim()) return notProvided;
        return value.trim();
      },
      formatMeasurementSummaryValue: (value: string | undefined) => {
        if (!value?.trim()) return notSure;
        if (NOT_SURE_IDS.has(value.trim())) return notSure;
        return value.trim();
      },
      formatOptionSummaryValue: (
        optionList: LocalizedEstimateOption[],
        id: string | undefined
      ) => {
        if (!id?.trim()) return notSure;
        if (NOT_SURE_IDS.has(id)) return notSure;
        return getOptionLabel(optionList, id) ?? id;
      },
      formatHeightSummaryValue: (data: EstimateFormData) => {
        if (!data.heightNeeded?.trim()) return notSure;
        if (NOT_SURE_IDS.has(data.heightNeeded)) return notSure;
        const fromOption = getOptionLabel(options.heightOptions, data.heightNeeded);
        if (fromOption) return fromOption;
        return data.heightNeeded.trim();
      },
    }),
    [notSure, notProvided, options.heightOptions]
  );
}

export function useEstimateLabelSource() {
  const options = useLocalizedEstimateOptions();
  const t = useTranslations("estimate");

  return useMemo(
    () =>
      createLabelSourceFromOptions(options, {
        notSure: t("summary.notSure"),
        notProvided: t("summary.notProvided"),
        disclaimer: t("disclaimer"),
      }),
    [options, t]
  );
}

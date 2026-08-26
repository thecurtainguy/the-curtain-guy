"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { type DrapeColor } from "@/data/studio";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  EVENT_BUILDER_FULLNESS,
  fullnessIdFromValue,
} from "@/data/event-builder/look";
import { OptionCard } from "@/components/estimate/option-card";
import { DrapeColorCard } from "@/components/event-builder/drape-color-card";
import { useLocalizedDrapeColors } from "@/lib/i18n/event-builder";
import {
  useLocalizedAddOnOptions,
  useLocalizedFabricDirections,
} from "@/lib/i18n/estimate";
import { Label } from "@/components/ui/label";

const EVENT_BUILDER_ADD_ON_IDS = [
  "uplighting",
  "star-drape",
  "ceiling-draping",
  "premium-hardware",
  "rush-setup",
] as const;

type EventStepLookProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
};

function toggleFabricDirection(current: string[], id: string): string[] {
  if (id === "recommend") {
    return current.includes("recommend") ? [] : ["recommend"];
  }
  const without = current.filter((value) => value !== "recommend");
  return without.includes(id)
    ? without.filter((value) => value !== id)
    : [...without, id];
}

function toggleAddOn(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id];
}

export function EventStepLook({ brief, onChange }: EventStepLookProps) {
  const t = useTranslations("eventBuilder");
  const tFullness = useTranslations("eventBuilder.fullnessOptions");
  const fabricDirections = useLocalizedFabricDirections();
  const addOnOptions = useLocalizedAddOnOptions().filter((option) =>
    EVENT_BUILDER_ADD_ON_IDS.includes(
      option.id as (typeof EVENT_BUILDER_ADD_ON_IDS)[number]
    )
  );
  const drapeColors = useLocalizedDrapeColors();

  const fullnessOptions = useMemo(
    () =>
      EVENT_BUILDER_FULLNESS.map((option) => ({
        id: option.id,
        label: tFullness(`${option.id}.label`),
        description: tFullness(`${option.id}.description`),
      })),
    [tFullness]
  );

  const selectedFullnessId = fullnessIdFromValue(brief.look.fullness);

  return (
    <div className="space-y-8 rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {t("step3.eyebrow")}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold">
          {t("step3.title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("step3.description")}
        </p>
      </div>

      <div className="space-y-3">
        <Label>{t("step3.fabricDirection")}</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {fabricDirections.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              mode="multi"
              selected={brief.look.fabricDirections.includes(option.id)}
              onSelect={() =>
                onChange({
                  ...brief,
                  look: {
                    ...brief.look,
                    fabricDirections: toggleFabricDirection(
                      brief.look.fabricDirections,
                      option.id
                    ),
                  },
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("step3.primaryColor")}</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {drapeColors.map((color) => (
            <DrapeColorCard
              key={color.value}
              value={color.value}
              label={color.label}
              hex={color.hex}
              selected={brief.look.primaryColor === color.value}
              onSelect={() =>
                onChange({
                  ...brief,
                  look: {
                    ...brief.look,
                    primaryColor: color.value as DrapeColor,
                  },
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("step3.fullness")}</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {fullnessOptions.map((option) => {
            const fullnessValue =
              EVENT_BUILDER_FULLNESS.find((entry) => entry.id === option.id)
                ?.value ?? 2;

            return (
              <OptionCard
                key={option.id}
                option={option}
                selected={selectedFullnessId === option.id}
                onSelect={() =>
                  onChange({
                    ...brief,
                    look: { ...brief.look, fullness: fullnessValue },
                  })
                }
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("step3.addOns")}</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {addOnOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              mode="multi"
              selected={brief.addOns.includes(option.id)}
              onSelect={() =>
                onChange({
                  ...brief,
                  addOns: toggleAddOn(brief.addOns, option.id),
                })
              }
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("step3.noPricing")}</p>
    </div>
  );
}

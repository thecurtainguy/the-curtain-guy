"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Blend, Lamp, Palette, Plus, Scissors, Sparkles, Waves } from "lucide-react";
import { getDrapeColorHex, type DrapeColor, type DrapeFabric } from "@/data/studio";
import {
  EVENT_ACCENT_TARGETS,
  fabricDirectionsFor,
  getBriefFabric,
  getBriefLightingMood,
  getBriefUplightColor,
  type EventBuilderBrief,
  type EventBuilderLook,
} from "@/data/event-builder/brief";
import { EVENT_BUILDER_FULLNESS, fullnessIdFromValue } from "@/data/event-builder/look";
import {
  EVENT_COLOR_PICKS,
  EVENT_FABRIC_IDS,
  EVENT_FABRIC_TEXTURES,
  EVENT_LIGHTING_IDS,
  EVENT_LIGHTING_SWATCHES,
  EVENT_UPLIGHT_PICKS,
} from "@/data/event-builder/wizard-options";
import { OptionCard } from "@/components/estimate/option-card";
import { useLocalizedAddOnOptions } from "@/lib/i18n/estimate";
import { ColorSwatchGrid } from "@/components/event-builder/color-swatch-grid";
import { VisualOptionCard } from "@/components/event-builder/visual-option-card";
import { WizardSection, WizardStepHeader } from "@/components/event-builder/wizard-ui";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";

/** Uplighting and ceiling draping are chosen as real design layers instead. */
const EXTRA_ADD_ON_IDS = ["star-drape", "premium-hardware", "rush-setup"] as const;

type EventStepLookProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
  headingId: string;
};

export function EventStepLook({ brief, onChange, headingId }: EventStepLookProps) {
  const copy = useWizardCopy();
  const tFullness = useTranslations("eventBuilder.fullnessOptions");
  const extras = useLocalizedAddOnOptions().filter((option) =>
    EXTRA_ADD_ON_IDS.includes(option.id as (typeof EXTRA_ADD_ON_IDS)[number])
  );
  const fabric = getBriefFabric(brief);
  const primaryHex = getDrapeColorHex(brief.look.primaryColor);
  const accent = brief.look.accentColor ?? null;
  const lighting = getBriefLightingMood(brief);
  const uplight = getBriefUplightColor(brief);

  const fullnessOptions = useMemo(
    () =>
      EVENT_BUILDER_FULLNESS.map((option) => ({
        id: option.id,
        label: tFullness(`${option.id}.label`),
        description: tFullness(`${option.id}.description`),
      })),
    [tFullness]
  );

  function updateLook(patch: Partial<EventBuilderLook>) {
    const nextFabric = patch.fabric ?? fabric;
    const nextColor = patch.primaryColor ?? brief.look.primaryColor;
    onChange({
      ...brief,
      look: {
        ...brief.look,
        ...patch,
        fabric: nextFabric,
        fabricDirections: fabricDirectionsFor(nextFabric, nextColor),
      },
    });
  }

  return (
    <div className="space-y-6">
      <WizardStepHeader
        id={headingId}
        icon={Palette}
        eyebrow={copy.look.eyebrow}
        title={copy.look.title}
      />

      <WizardSection icon={Scissors} label={copy.look.fabric} labelId="look-fabric-label">
        <div
          role="radiogroup"
          aria-labelledby="look-fabric-label"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7"
        >
          {EVENT_FABRIC_IDS.map((id: DrapeFabric) => (
            <VisualOptionCard
              key={id}
              title={copy.fabrics[id][0]}
              description={copy.fabrics[id][1]}
              mediaClassName="h-16"
              media={
                <span
                  className="absolute inset-0"
                  style={{ background: `${EVENT_FABRIC_TEXTURES[id]}, ${primaryHex}` }}
                />
              }
              selected={fabric === id}
              onSelect={() => updateLook({ fabric: id })}
            />
          ))}
        </div>
      </WizardSection>

      <WizardSection icon={Palette} label={copy.look.primary}>
        <ColorSwatchGrid
          colors={EVENT_COLOR_PICKS}
          value={brief.look.primaryColor}
          onChange={(color) => {
            if (color) updateLook({ primaryColor: color });
          }}
          ariaLabel={copy.look.primary}
        />
      </WizardSection>

      <WizardSection icon={Blend} label={copy.look.accent}>
        <ColorSwatchGrid
          colors={EVENT_COLOR_PICKS.filter((color) => color !== brief.look.primaryColor)}
          value={accent}
          noneLabel={copy.look.accentNone}
          onChange={(color: DrapeColor | null) =>
            updateLook({
              accentColor: color,
              accentTarget: color ? brief.look.accentTarget ?? "both" : brief.look.accentTarget,
            })
          }
          ariaLabel={copy.look.accent}
        />
        {accent ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground" id="accent-target-label">
              {copy.look.accentTarget}
            </p>
            <div
              role="radiogroup"
              aria-labelledby="accent-target-label"
              className="grid gap-3 sm:grid-cols-3"
            >
              {EVENT_ACCENT_TARGETS.map((target) => (
                <OptionCard
                  key={target}
                  option={{ id: target, label: copy.accentTargets[target] }}
                  selected={(brief.look.accentTarget ?? "both") === target}
                  onSelect={() => updateLook({ accentTarget: target })}
                />
              ))}
            </div>
          </div>
        ) : null}
      </WizardSection>

      <WizardSection icon={Waves} label={copy.look.fullness} labelId="look-fullness-label">
        <div role="radiogroup" aria-labelledby="look-fullness-label" className="grid gap-3 sm:grid-cols-3">
          {fullnessOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={fullnessIdFromValue(brief.look.fullness) === option.id}
              onSelect={() =>
                updateLook({
                  fullness:
                    EVENT_BUILDER_FULLNESS.find((entry) => entry.id === option.id)?.value ?? 2,
                })
              }
            />
          ))}
        </div>
      </WizardSection>

      <WizardSection icon={Lamp} label={copy.look.lighting} labelId="look-lighting-label">
        <div
          role="radiogroup"
          aria-labelledby="look-lighting-label"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7"
        >
          {EVENT_LIGHTING_IDS.map((mood) => (
            <VisualOptionCard
              key={mood}
              title={copy.lighting[mood]}
              mediaClassName="h-16"
              media={
                <span
                  className="absolute inset-0"
                  style={{ background: EVENT_LIGHTING_SWATCHES[mood] }}
                />
              }
              selected={lighting === mood}
              onSelect={() => updateLook({ lightingMood: mood })}
            />
          ))}
        </div>
      </WizardSection>

      <WizardSection icon={Sparkles} label={copy.look.uplights}>
        <ColorSwatchGrid
          colors={EVENT_UPLIGHT_PICKS}
          value={uplight}
          noneLabel={copy.look.uplightsOff}
          onChange={(color) => updateLook({ uplightColor: color })}
          ariaLabel={copy.look.uplights}
          glow
        />
      </WizardSection>

      {extras.length > 0 ? (
        <WizardSection icon={Plus} label={copy.look.extras}>
          <div className="grid gap-3 sm:grid-cols-3">
            {extras.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                mode="multi"
                selected={brief.addOns.includes(option.id)}
                onSelect={() =>
                  onChange({
                    ...brief,
                    addOns: brief.addOns.includes(option.id)
                      ? brief.addOns.filter((value) => value !== option.id)
                      : [...brief.addOns, option.id],
                  })
                }
              />
            ))}
          </div>
        </WizardSection>
      ) : null}
    </div>
  );
}

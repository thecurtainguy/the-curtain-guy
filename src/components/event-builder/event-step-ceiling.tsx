"use client";

import { Ban, CloudSun } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { STUDIO_CEILING_PRESETS } from "@/data/studio-ceiling-presets";
import { CeilingStyleArt } from "@/components/studio/library/ceiling-style-art";
import { VisualOptionCard } from "@/components/event-builder/visual-option-card";
import { WizardStepHeader } from "@/components/event-builder/wizard-ui";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";

type EventStepCeilingProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
  headingId: string;
};

export function EventStepCeiling({ brief, onChange, headingId }: EventStepCeilingProps) {
  const copy = useWizardCopy();
  const selectedId = brief.ceiling?.presetId ?? null;
  const accent = brief.look.accentColor ?? null;
  const accentOnCeiling = accent && brief.look.accentTarget !== "treatments";

  function select(presetId: string | null) {
    onChange({ ...brief, ceiling: { presetId } });
  }

  return (
    <div className="space-y-6">
      <WizardStepHeader
        id={headingId}
        icon={CloudSun}
        eyebrow={copy.ceiling.eyebrow}
        title={copy.ceiling.title}
        description={copy.ceiling.description}
      />

      <div
        role="radiogroup"
        aria-labelledby={headingId}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
      >
        <VisualOptionCard
          title={copy.ceiling.none}
          description={copy.ceiling.noneDesc}
          mediaClassName="h-28"
          media={
            <span className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,color-mix(in_oklch,var(--foreground)_6%,transparent),transparent)]">
              <Ban className="size-8 text-muted-foreground/70" aria-hidden />
            </span>
          }
          selected={selectedId === null}
          onSelect={() => select(null)}
        />
        {STUDIO_CEILING_PRESETS.map((preset) => (
          <VisualOptionCard
            key={preset.id}
            title={preset.label}
            description={preset.description}
            mediaClassName="h-28 bg-background/60"
            media={
              <CeilingStyleArt
                style={preset.style}
                color={accentOnCeiling ? accent : preset.overrides.color}
                accentColor={preset.overrides.accentColor}
                lights={preset.overrides.lights}
                lightColor={preset.overrides.lightColor}
                hubDecor={preset.overrides.hubDecor}
                className="absolute inset-0 h-full w-full"
              />
            }
            selected={selectedId === preset.id}
            onSelect={() => select(preset.id)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{copy.ceiling.accentNote}</p>
    </div>
  );
}

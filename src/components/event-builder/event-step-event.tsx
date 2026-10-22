"use client";

import { Building2, CalendarHeart, PencilRuler, Sparkles } from "lucide-react";
import {
  EVENT_BUILDER_MAX_GUESTS,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import { STUDIO_VENUE_PRESETS } from "@/data/studio-venue-presets";
import { heroImage } from "@/data/site";
import { roomFromVenuePreset } from "@/lib/event-builder/brief-room";
import { OptionCard } from "@/components/estimate/option-card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { VisualOptionCard } from "@/components/event-builder/visual-option-card";
import { FloorOutlineArt, VenuePlanArt } from "@/components/event-builder/venue-plan-art";
import { WizardSection, WizardStepHeader } from "@/components/event-builder/wizard-ui";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { createRectangleRoom } from "@/lib/studio-geometry";

type EventStepEventProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
  headingId: string;
};

const CUSTOM_TILE_FLOOR = createRectangleRoom(40, 30);

export function EventStepEvent({ brief, onChange, headingId }: EventStepEventProps) {
  const copy = useWizardCopy();
  const eventTypes = useLocalizedEventTypes();
  const presetKey = brief.venuePreset ?? null;

  function selectPreset(key: string | null): void {
    if (key === null) {
      onChange({
        ...brief,
        venuePreset: null,
        room:
          brief.room.shape === "custom"
            ? { ...brief.room, shape: "rectangle", outline: undefined }
            : brief.room,
      });
      return;
    }
    const preset = STUDIO_VENUE_PRESETS.find((entry) => entry.key === key);
    if (!preset) return;
    onChange({
      ...brief,
      venuePreset: preset.key,
      room: roomFromVenuePreset(preset, brief.room),
      finishes: { floor: preset.floorFinish, walls: preset.wallFinish },
      look: { ...brief.look, lightingMood: preset.lighting },
    });
  }

  function setGuests(raw: string): void {
    const parsed = Number.parseInt(raw, 10);
    onChange({
      ...brief,
      guestCount:
        Number.isFinite(parsed) && parsed > 0
          ? Math.min(parsed, EVENT_BUILDER_MAX_GUESTS)
          : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <WizardStepHeader
        id={headingId}
        icon={CalendarHeart}
        eyebrow={copy.event.eyebrow}
        title={copy.event.title}
        image={heroImage}
      />

      <WizardSection icon={Sparkles} label={copy.event.eventType} labelId="event-type-label">
        <div
          role="radiogroup"
          aria-labelledby="event-type-label"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {eventTypes.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={brief.eventType === option.id}
              onSelect={() => onChange({ ...brief, eventType: option.id })}
            />
          ))}
        </div>
      </WizardSection>

      <WizardSection icon={CalendarHeart} label={copy.event.details}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="event-name">{copy.event.eventName}</Label>
            <Input
              id="event-name"
              value={brief.eventName ?? ""}
              maxLength={160}
              placeholder={copy.event.eventNamePlaceholder}
              onChange={(e) => onChange({ ...brief, eventName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-guests">{copy.event.guests}</Label>
            <Input
              id="event-guests"
              type="number"
              inputMode="numeric"
              min={1}
              max={EVENT_BUILDER_MAX_GUESTS}
              placeholder={copy.event.guestsPlaceholder}
              value={brief.guestCount ?? ""}
              onChange={(e) => setGuests(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-date">{copy.event.date}</Label>
            <DateInput
              id="event-date"
              value={brief.eventDate ?? ""}
              onChange={(value) => onChange({ ...brief, eventDate: value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-name">{copy.event.venueName}</Label>
            <Input
              id="venue-name"
              value={brief.venueName ?? ""}
              maxLength={160}
              placeholder={copy.event.venuePlaceholder}
              onChange={(e) => onChange({ ...brief, venueName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city-area">{copy.event.city}</Label>
            <Input
              id="city-area"
              value={brief.cityArea ?? ""}
              maxLength={160}
              placeholder={copy.event.cityPlaceholder}
              onChange={(e) => onChange({ ...brief, cityArea: e.target.value })}
            />
          </div>
        </div>
      </WizardSection>

      <WizardSection
        icon={Building2}
        label={copy.event.venueStyle}
        hint={copy.event.venueStyleHint}
        labelId="venue-style-label"
      >
        <div
          role="radiogroup"
          aria-labelledby="venue-style-label"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
        >
          {STUDIO_VENUE_PRESETS.map((preset) => (
            <VisualOptionCard
              key={preset.key}
              title={preset.label}
              description={preset.description}
              media={<VenuePlanArt preset={preset} />}
              badge={`${Math.round(preset.width / 12)}×${Math.round(preset.length / 12)} ft`}
              selected={presetKey === preset.key}
              onSelect={() => selectPreset(preset.key)}
            />
          ))}
          <VisualOptionCard
            title={copy.event.customSize}
            description={copy.event.customSizeDesc}
            media={
              <span className="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(0deg,transparent_0_15px,color-mix(in_oklch,var(--primary)_10%,transparent)_15px_16px),repeating-linear-gradient(90deg,transparent_0_15px,color-mix(in_oklch,var(--primary)_10%,transparent)_15px_16px)]">
                <span className="relative block h-16 w-20">
                  <FloorOutlineArt floor={CUSTOM_TILE_FLOOR} />
                  <PencilRuler className="absolute -right-2 -top-1 size-5 text-primary" aria-hidden />
                </span>
              </span>
            }
            selected={presetKey === null}
            onSelect={() => selectPreset(null)}
          />
        </div>
      </WizardSection>
    </div>
  );
}

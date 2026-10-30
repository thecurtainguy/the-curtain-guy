"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarHeart,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import {
  BrandDialogContent,
  BrandDialogSection,
} from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalizedEventTypes } from "@/lib/i18n/estimate";
import {
  STUDIO_GUEST_COUNT_MAX,
  STUDIO_LEAD_TEXT_MAX,
  type StudioEventDetails,
} from "@/data/studio-leads";
import { formatStudioEventSummary } from "./event-details-format";

type EventDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: StudioEventDetails;
  onSave: (details: StudioEventDetails) => void;
  /** Shown under the title, e.g. when prompting before a save. */
  description?: string;
  saveLabel?: string;
};

type FormState = {
  eventName: string;
  eventType: StudioEventDetails["eventType"];
  eventDate: string;
  guestCount: string;
  venueName: string;
  cityArea: string;
};

function toForm(details: StudioEventDetails): FormState {
  return {
    eventName: details.eventName ?? "",
    eventType: details.eventType,
    eventDate: details.eventDate ?? "",
    guestCount: details.guestCount ? String(details.guestCount) : "",
    venueName: details.venueName ?? "",
    cityArea: details.cityArea ?? "",
  };
}

function clean(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, STUDIO_LEAD_TEXT_MAX);
  return trimmed || null;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** "Your event" card — what, when, how many and where, attached to the room. */
export function EventDetailsDialog({
  open,
  onOpenChange,
  ...bodyProps
}: EventDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Content unmounts while closed, so the form re-reads `details` on every open. */}
      {open ? <EventDetailsDialogBody onOpenChange={onOpenChange} {...bodyProps} /> : null}
    </Dialog>
  );
}

function EventDetailsDialogBody({
  onOpenChange,
  details,
  onSave,
  description = "Tell us about the event this room is for. It helps our team check availability and size the drape order — every field is optional.",
  saveLabel = "Save event details",
}: Omit<EventDetailsDialogProps, "open">) {
  const [form, setForm] = useState<FormState>(() => toForm(details));
  const [error, setError] = useState<string | null>(null);
  const eventTypeOptions = useLocalizedEventTypes();

  const preview = useMemo(() => {
    const guests = Number(form.guestCount);
    return formatStudioEventSummary({
      eventName: clean(form.eventName),
      eventType: form.eventType,
      eventDate: form.eventDate || null,
      guestCount: Number.isInteger(guests) && guests > 0 ? guests : null,
      venueName: null,
      cityArea: null,
    });
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    let guestCount: number | null = null;
    if (form.guestCount.trim()) {
      const parsed = Number(form.guestCount);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > STUDIO_GUEST_COUNT_MAX) {
        setError(
          `Guest count must be a whole number between 1 and ${STUDIO_GUEST_COUNT_MAX.toLocaleString("en-CA")}.`
        );
        return;
      }
      guestCount = parsed;
    }
    onSave({
      eventName: clean(form.eventName),
      eventType: form.eventType,
      eventDate: form.eventDate || null,
      guestCount,
      venueName: clean(form.venueName),
      cityArea: clean(form.cityArea),
    });
    onOpenChange(false);
  }

  return (
    <BrandDialogContent
      size="lg"
      icon={CalendarHeart}
      eyebrow="Your event"
      title="What are we dressing?"
      description={description}
      footer={
        <>
          <p className="mr-auto hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
            {preview ? (
              <>
                <Sparkles className="mr-1 inline size-3 text-primary" aria-hidden />
                {preview}
              </>
            ) : null}
          </p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button type="button" onClick={submit}>
            {saveLabel}
          </Button>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="studio-event-name">Event name</Label>
          <Input
            id="studio-event-name"
            value={form.eventName}
            maxLength={STUDIO_LEAD_TEXT_MAX}
            placeholder="e.g. Smith Wedding, Annual Gala 2027"
            onChange={(event) => update("eventName", event.target.value)}
          />
        </div>

        <BrandDialogSection label="Event type">
          <div
            role="radiogroup"
            aria-label="Event type"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {eventTypeOptions.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={form.eventType === option.id}
                onSelect={() =>
                  update("eventType", form.eventType === option.id ? null : option.id)
                }
                className="p-3"
              />
            ))}
          </div>
        </BrandDialogSection>

        <BrandDialogSection label="When & how many">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldTile icon={CalendarDays} htmlFor="studio-event-date" label="Event date">
              <DateInput
                id="studio-event-date"
                value={form.eventDate}
                placeholder="Pick a date"
                onChange={(value) => update("eventDate", value)}
              />
            </FieldTile>
            <FieldTile icon={Users} htmlFor="studio-event-guests" label="Guest count">
              <Input
                id="studio-event-guests"
                type="number"
                inputMode="numeric"
                min={1}
                max={STUDIO_GUEST_COUNT_MAX}
                step={1}
                value={form.guestCount}
                placeholder="e.g. 180"
                onChange={(event) => update("guestCount", event.target.value)}
              />
            </FieldTile>
          </div>
          {form.eventDate && form.eventDate < todayIso() ? (
            <p className="text-xs text-muted-foreground">
              That date is in the past — double-check if this is an upcoming event.
            </p>
          ) : null}
        </BrandDialogSection>

        <BrandDialogSection label="Where">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldTile icon={MapPin} htmlFor="studio-event-venue" label="Venue">
              <Input
                id="studio-event-venue"
                value={form.venueName}
                maxLength={STUDIO_LEAD_TEXT_MAX}
                placeholder="Venue or hall name"
                onChange={(event) => update("venueName", event.target.value)}
              />
            </FieldTile>
            <FieldTile icon={MapPin} htmlFor="studio-event-city" label="City / area">
              <Input
                id="studio-event-city"
                value={form.cityArea}
                maxLength={STUDIO_LEAD_TEXT_MAX}
                placeholder="e.g. Montréal, Laval"
                onChange={(event) => update("cityArea", event.target.value)}
              />
            </FieldTile>
          </div>
        </BrandDialogSection>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </BrandDialogContent>
  );
}

function FieldTile({
  icon: Icon,
  htmlFor,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/40 bg-card/25 p-3">
      <Label htmlFor={htmlFor} className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
        {label}
      </Label>
      {children}
    </div>
  );
}

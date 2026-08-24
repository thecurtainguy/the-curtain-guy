"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  Layers,
  MapPin,
  MessageSquare,
  Palette,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import {
  addOnOptions,
  drapeGoals,
  estimateDisclaimer,
  eventTypes,
  fabricDirections,
  floorPlanOptions,
  formatHeightSummaryValue,
  formatMeasurementSummaryValue,
  formatOptionSummaryValue,
  formatSummaryValue,
  fullnessOptions,
  getOptionLabel,
  getOptionLabels,
  measurementsKnownOptions,
  runLayouts,
  SUMMARY_NOT_PROVIDED,
  SUMMARY_NOT_SURE,
  type EstimateFormData,
  type EstimateOption,
  venueSettings,
} from "@/data/estimate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDisplayDate, parseISODate } from "@/lib/date";

function isPendingValue(value: string): boolean {
  return value === SUMMARY_NOT_SURE || value === SUMMARY_NOT_PROVIDED;
}

function SummaryBlock({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-3.5" />
        </span>
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {title}
        </h3>
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4">
        {children}
      </div>
    </section>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  const pending = isPendingValue(value);

  return (
    <div className="rounded-xl border border-border/30 bg-background/40 p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm leading-snug",
              pending ? "italic text-muted-foreground" : "text-foreground"
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function OptionChips({
  options,
  selectedIds,
  emptyLabel,
}: {
  options: EstimateOption[];
  selectedIds: string[];
  emptyLabel: string;
}) {
  const labels = getOptionLabels(options, selectedIds);

  if (labels.length === 0) {
    return (
      <Badge
        variant="outline"
        className="border-border/50 bg-background/30 text-muted-foreground italic"
      >
        {emptyLabel}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedIds.map((id) => {
        const option = options.find((item) => item.id === id);
        const Icon = option?.icon;
        const label = getOptionLabel(options, id) ?? id;

        return (
          <Badge
            key={id}
            variant="outline"
            className="h-auto gap-1.5 border-primary/25 bg-primary/10 py-1.5 pr-3 pl-2 text-foreground"
          >
            {Icon && <Icon className="size-3.5 text-primary" />}
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

function MeasurementGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const pending = isPendingValue(item.value);
        return (
          <div
            key={item.label}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              pending
                ? "border-border/30 bg-background/20"
                : "border-primary/15 bg-primary/5"
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </p>
            <p
              className={cn(
                "mt-1 text-sm",
                pending ? "italic text-muted-foreground" : "text-foreground"
              )}
            >
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

type EstimateSummaryProps = {
  data: EstimateFormData;
  className?: string;
};

export function EstimateSummary({ data, className }: EstimateSummaryProps) {
  const eventTypeLabel = data.eventType
    ? (getOptionLabel(eventTypes, data.eventType) ?? data.eventType)
    : SUMMARY_NOT_SURE;
  const eventTypeOption = eventTypes.find((item) => item.id === data.eventType);
  const EventIcon = eventTypeOption?.icon ?? Sparkles;

  const parsedDate = parseISODate(data.eventDate);
  const dateLabel = parsedDate
    ? formatDisplayDate(parsedDate)
    : SUMMARY_NOT_PROVIDED;

  const venueSettingLabel = data.venueSetting
    ? formatOptionSummaryValue(venueSettings, data.venueSetting)
    : SUMMARY_NOT_PROVIDED;
  const measurementsKnownLabel = data.measurementsKnown
    ? formatOptionSummaryValue(measurementsKnownOptions, data.measurementsKnown)
    : SUMMARY_NOT_SURE;
  const runLayoutLabel = data.runLayout
    ? formatOptionSummaryValue(runLayouts, data.runLayout)
    : SUMMARY_NOT_SURE;
  const floorPlanLabel = data.floorPlanAvailable
    ? formatOptionSummaryValue(floorPlanOptions, data.floorPlanAvailable)
    : SUMMARY_NOT_SURE;
  const fullnessLabel = data.fullnessPreference
    ? formatOptionSummaryValue(fullnessOptions, data.fullnessPreference)
    : SUMMARY_NOT_PROVIDED;

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-border/40 bg-card/40 py-0 shadow-[0_8px_32px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      <div className="relative border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/40 to-transparent px-5 py-5 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(212,175,55,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <EventIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
              Estimate Brief
            </p>
            <CardTitle className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">
              {eventTypeLabel}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateLabel !== SUMMARY_NOT_PROVIDED
                ? dateLabel
                : "Event date to be confirmed"}
              {data.cityArea.trim() ? ` · ${data.cityArea.trim()}` : ""}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 p-5 sm:p-6">
        <SummaryBlock icon={Calendar} title="Event Basics">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile icon={Sparkles} label="Event type" value={eventTypeLabel} />
            <StatTile icon={Calendar} label="Date" value={dateLabel} />
            <StatTile
              icon={MapPin}
              label="Venue"
              value={
                data.venueName.trim()
                  ? formatSummaryValue(data.venueName)
                  : SUMMARY_NOT_PROVIDED
              }
            />
            <StatTile
              icon={MapPin}
              label="City / area"
              value={
                data.cityArea.trim()
                  ? formatSummaryValue(data.cityArea)
                  : SUMMARY_NOT_SURE
              }
            />
            <StatTile icon={Layers} label="Setting" value={venueSettingLabel} />
            <StatTile
              icon={Users}
              label="Guests"
              value={
                data.guestCount.trim()
                  ? formatSummaryValue(data.guestCount)
                  : SUMMARY_NOT_PROVIDED
              }
            />
          </div>
        </SummaryBlock>

        <SummaryBlock icon={Layers} title="Drape Goals">
          <OptionChips
            options={drapeGoals}
            selectedIds={data.drapeGoals}
            emptyLabel={SUMMARY_NOT_SURE}
          />
        </SummaryBlock>

        <SummaryBlock icon={Ruler} title="Measurements">
          <div className="mb-3">
            <Badge
              variant="outline"
              className={cn(
                "h-auto py-1.5",
                isPendingValue(measurementsKnownLabel)
                  ? "border-border/50 italic text-muted-foreground"
                  : "border-primary/30 bg-primary/10 text-foreground"
              )}
            >
              {measurementsKnownLabel}
            </Badge>
          </div>
          <MeasurementGrid
            items={[
              {
                label: "Linear feet",
                value: formatMeasurementSummaryValue(data.linearFeet),
              },
              {
                label: "Height",
                value: formatHeightSummaryValue(data),
              },
              {
                label: "Walls / sections",
                value: formatMeasurementSummaryValue(data.wallSections),
              },
              { label: "Run layout", value: runLayoutLabel },
              {
                label: "Doors / openings",
                value: formatMeasurementSummaryValue(data.doorsOpenings),
              },
              { label: "Floor plan", value: floorPlanLabel },
            ]}
          />
        </SummaryBlock>

        <SummaryBlock icon={Palette} title="Look & Fabric">
          <OptionChips
            options={fabricDirections}
            selectedIds={data.fabricDirections}
            emptyLabel={SUMMARY_NOT_SURE}
          />
          <div className="mt-3 flex items-center gap-2 border-t border-border/30 pt-3">
            <span className="text-xs text-muted-foreground">Fullness</span>
            <Badge
              variant="outline"
              className={cn(
                "h-auto py-1",
                isPendingValue(fullnessLabel)
                  ? "italic text-muted-foreground"
                  : "border-primary/25 bg-primary/10 text-foreground"
              )}
            >
              {fullnessLabel}
            </Badge>
          </div>
        </SummaryBlock>

        <SummaryBlock icon={Sparkles} title="Add-ons">
          <OptionChips
            options={addOnOptions}
            selectedIds={data.addOns}
            emptyLabel="None selected"
          />
        </SummaryBlock>

        {(data.name || data.email || data.phone || data.message) && (
          <SummaryBlock icon={MessageSquare} title="Notes & Contact">
            <div className="grid gap-2 sm:grid-cols-2">
              {data.name && (
                <StatTile icon={Users} label="Name" value={data.name} />
              )}
              {data.email && (
                <StatTile
                  icon={MessageSquare}
                  label="Email"
                  value={data.email}
                />
              )}
              {data.phone && (
                <StatTile icon={MessageSquare} label="Phone" value={data.phone} />
              )}
            </div>
            {data.message && (
              <p className="mt-3 rounded-xl border border-border/30 bg-background/30 p-3 text-sm leading-relaxed text-muted-foreground">
                {data.message}
              </p>
            )}
          </SummaryBlock>
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {estimateDisclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

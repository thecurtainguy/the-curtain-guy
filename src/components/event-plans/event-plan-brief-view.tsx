"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Layers,
  MessageSquare,
  Palette,
  PanelsTopLeft,
  Ruler,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { EventPlanSubmissionRow } from "@/data/event-plans";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  getEventCatalogItem,
  roomPreviewStats,
} from "@/data/event-builder/catalog";
import { fullnessIdFromValue, type EventBuilderFullnessId } from "@/data/event-builder/look";
import {
  eventTypes,
  fabricDirections,
  getEnglishOptionLabel,
  getEnglishOptionLabels,
} from "@/data/estimate";
import { DRAPE_COLORS, type StudioDesignJson } from "@/data/studio";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

export type EventPlanBriefViewData = Pick<
  EventPlanSubmissionRow,
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "event_type"
  | "event_date"
  | "venue_name"
  | "city_area"
  | "notes"
  | "owner_user_id"
>;

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Icon className="size-4" />
          </span>
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FactTile({ label, value }: { label: string; value: string }) {
  const pending = value === "—";
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        pending
          ? "border-border bg-background/40"
          : "border-primary/20 bg-primary/[0.06]"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-words text-sm",
          pending
            ? "italic text-muted-foreground"
            : "font-medium text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISODate(value);
  if (parsed) return formatDisplayDate(parsed);
  return value;
}

export function EventPlanBriefView({
  plan,
  brief,
  design,
  audience,
  className,
}: {
  plan: EventPlanBriefViewData;
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  audience: "admin" | "customer";
  className?: string;
}) {
  const eventTypeLabel =
    getEnglishOptionLabel("eventTypes", brief.eventType) ??
    plan.event_type ??
    "—";
  const eventTypeOption = eventTypes.find((item) => item.id === brief.eventType);
  const EventIcon = eventTypeOption?.icon ?? Sparkles;

  const stats = roomPreviewStats(brief);
  const setupItems = brief.catalogSelections
    .map((id) => getEventCatalogItem(id))
    .filter(Boolean);

  const colorOption = DRAPE_COLORS.find(
    (c) => c.value === brief.look.primaryColor
  );
  const fabricLabels = getEnglishOptionLabels(
    "fabricDirections",
    brief.look.fabricDirections
  );
  const addOnLabels = getEnglishOptionLabels("addOns", brief.addOns);
function formatEventBuilderFullness(value: number): string {
  const id: EventBuilderFullnessId = fullnessIdFromValue(value);
  const labels: Record<EventBuilderFullnessId, string> = {
    standard: "Standard (2× fullness)",
    full: "Full (2.5× fullness)",
    extra: "Extra full (3× fullness)",
  };
  return labels[id];
}

  return (
    <div className={cn("space-y-5", className)}>
      <SectionCard
        icon={UserRound}
        title={audience === "admin" ? "Contact" : "Your contact"}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <FactTile label="Name" value={plan.contact_name || "—"} />
          <FactTile label="Email" value={plan.contact_email || "—"} />
          <FactTile label="Phone" value={plan.contact_phone?.trim() || "—"} />
          {audience === "admin" ? (
            <FactTile
              label="Account"
              value={plan.owner_user_id ? "Linked" : "Guest"}
            />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard icon={EventIcon} title="Event">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <FactTile label="Type" value={eventTypeLabel} />
          <FactTile label="Date" value={formatEventDate(plan.event_date)} />
          <FactTile label="Venue" value={plan.venue_name?.trim() || "—"} />
          <FactTile label="City / area" value={plan.city_area?.trim() || "—"} />
        </div>
      </SectionCard>

      <SectionCard icon={Ruler} title="Room">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FactTile
            label="Shape"
            value={brief.room.shape === "l_shape" ? "L-shape" : "Rectangle"}
          />
          <FactTile
            label="Dimensions"
            value={`${brief.room.widthFt}′ × ${brief.room.lengthFt}′`}
          />
          <FactTile label="Ceiling" value={`${brief.room.wallHeightFt}′`} />
          <FactTile
            label="Floor area"
            value={`${stats.areaSqFt.toLocaleString()} ft²`}
          />
        </div>
      </SectionCard>

      <SectionCard icon={PanelsTopLeft} title="Selected setups">
        {setupItems.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No setups selected.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {setupItems.map((item) => {
              if (!item) return null;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          {design.treatments.length} treatments · {design.drapeRuns.length} drape
          runs in design snapshot
        </p>
      </SectionCard>

      <SectionCard icon={Palette} title="Look & fabric">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Fabric direction
            </p>
            {fabricLabels.length === 0 ? (
              <span className="text-sm italic text-muted-foreground">
                Not specified
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {brief.look.fabricDirections.map((id) => {
                  const option = fabricDirections.find((o) => o.id === id);
                  const Icon = option?.icon;
                  const label =
                    getEnglishOptionLabel("fabricDirections", id) ?? id;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium"
                    >
                      {Icon ? <Icon className="size-3.5 text-primary" /> : null}
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Primary color
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="size-8 rounded-lg border border-border/50 shadow-inner"
                  style={{ backgroundColor: colorOption?.hex ?? "#eee6d7" }}
                  aria-hidden
                />
                <span className="text-sm font-medium">
                  {colorOption?.label ?? brief.look.primaryColor}
                </span>
              </div>
            </div>
            <FactTile label="Fullness" value={formatEventBuilderFullness(brief.look.fullness)} />
          </div>
        </div>
      </SectionCard>

      {addOnLabels.length > 0 ? (
        <SectionCard icon={Sparkles} title="Add-ons">
          <div className="flex flex-wrap gap-2">
            {addOnLabels.map((label) => (
              <span
                key={label}
                className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        icon={MessageSquare}
        title={audience === "admin" ? "Customer notes" : "Your notes"}
      >
        {plan.notes?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {plan.notes}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No notes provided.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

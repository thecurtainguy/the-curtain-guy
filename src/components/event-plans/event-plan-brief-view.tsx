"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronDown,
  CloudSun,
  DoorOpen,
  LayoutGrid,
  Link2,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Palette,
  PanelsTopLeft,
  Ruler,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import type { EventPlanSubmissionRow } from "@/data/event-plans";
import {
  getBriefCeilingPreset,
  getBriefFabric,
  getBriefLayout,
  getBriefLightingMood,
  getBriefOpenings,
  getBriefUplightColor,
  getBriefVenuePreset,
  type EventBuilderBrief,
  type EventLayoutId,
} from "@/data/event-builder/brief";
import { getEventCatalogItem, roomPreviewStats } from "@/data/event-builder/catalog";
import { fullnessIdFromValue } from "@/data/event-builder/look";
import { getEventTypeIcon } from "@/data/event-types";
import { getOpeningPreset } from "@/data/studio-openings";
import { getDrapeColorHex, type StudioDesignJson } from "@/data/studio";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import {
  getOptionLabel,
  getOptionLabels,
  useLocalizedAddOnOptions,
  useLocalizedEventTypes,
  useLocalizedFabricDirections,
} from "@/lib/i18n/estimate";
import { useLocalizedDrapeColors } from "@/lib/i18n/event-builder";
import { cn } from "@/lib/utils";
import { SavedCard, SavedChip, SavedFact } from "@/components/admin/saved-view";
import { EventPlanThumbnail } from "@/components/event-builder/event-plan-thumbnail";
import { countDesignSeats } from "@/components/event-builder/live-plan-sidebar";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { useEventPlanSavedCopy } from "@/components/event-plans/event-plan-saved-copy";

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

const SETUP_PREVIEW = 6;
const CHAIRLESS_LAYOUTS = new Set<EventLayoutId>(["none", "cocktail", "trade_show"]);

function Swatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-3.5 shrink-0 rounded-full ring-1 ring-border/60", className)}
      style={{ backgroundColor: getDrapeColorHex(color) }}
      aria-hidden
    />
  );
}

function SubLine({ children }: { children: React.ReactNode }) {
  return <p className="truncate text-xs font-normal text-muted-foreground">{children}</p>;
}

function ToggleMore({
  expanded,
  onClick,
  more,
  less,
}: {
  expanded: boolean;
  onClick: () => void;
  more: string;
  less: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {expanded ? less : more}
      <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
    </button>
  );
}

function ClampedNotes({ text, more, less }: { text: string; more: string; less: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 220 || text.split("\n").length > 3;
  return (
    <div>
      <p
        className={cn(
          "whitespace-pre-line text-sm font-normal leading-relaxed",
          long && !expanded && "line-clamp-3"
        )}
      >
        {text}
      </p>
      {long ? (
        <ToggleMore expanded={expanded} onClick={() => setExpanded((v) => !v)} more={more} less={less} />
      ) : null}
    </div>
  );
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
  const locale = useLocale();
  const copy = useWizardCopy();
  const text = useEventPlanSavedCopy();
  const catalog = useWizardCatalog();
  const tFullness = useTranslations("eventBuilder.fullnessOptions");
  const eventTypes = useLocalizedEventTypes({ includeHidden: true });
  const addOnOptions = useLocalizedAddOnOptions();
  const fabricDirectionOptions = useLocalizedFabricDirections();
  const drapeColors = useLocalizedDrapeColors();
  const [showAllSetups, setShowAllSetups] = useState(false);

  const colorLabel = (value: string) =>
    drapeColors.find((color) => color.value === value)?.label ?? value;

  const eventTypeLabel =
    getOptionLabel(eventTypes, brief.eventType) ?? plan.event_type?.trim() ?? "";
  const EventIcon = getEventTypeIcon(brief.eventType) ?? Sparkles;
  const title = brief.eventName?.trim() || eventTypeLabel || copy.studio.briefFallback;

  const rawDate = plan.event_date ?? brief.eventDate ?? "";
  const parsedDate = parseISODate(rawDate);
  const dateLabel = parsedDate
    ? formatDisplayDate(parsedDate, locale.startsWith("fr") ? "fr-CA" : "en-CA")
    : rawDate;
  const venueName = plan.venue_name?.trim() || brief.venueName?.trim() || "";
  const cityArea = plan.city_area?.trim() || brief.cityArea?.trim() || "";
  const venuePreset = getBriefVenuePreset(brief);
  const guests = brief.guestCount && brief.guestCount > 0 ? brief.guestCount : null;
  const contactName = plan.contact_name?.trim() ?? "";
  const contactEmail = plan.contact_email?.trim() ?? "";
  const contactPhone = plan.contact_phone?.trim() ?? "";
  const notes = plan.notes?.trim() ?? "";

  const stats = roomPreviewStats(brief);
  const shapeLabel =
    brief.room.shape === "l_shape"
      ? copy.room.lShape
      : brief.room.shape === "custom"
        ? copy.room.custom
        : copy.room.rectangle;
  const layout = getBriefLayout(brief);
  const seats = countDesignSeats(design);
  const layoutDetails = [
    !CHAIRLESS_LAYOUTS.has(layout.id) ? copy.chairs[layout.chairStyle ?? "chiavari_gold"] : null,
    layout.id !== "none"
      ? `${copy.review.linen}: ${
          layout.linenColor === null ? copy.review.bare : colorLabel(layout.linenColor ?? "ivory")
        }`
      : null,
  ].filter(Boolean);

  const openingCounts = new Map<string, number>();
  for (const opening of getBriefOpenings(brief)) {
    const key = `${getOpeningPreset(opening.style).label} · ${copy.walls[opening.wall]}`;
    openingCounts.set(key, (openingCounts.get(key) ?? 0) + 1);
  }

  const fabric = getBriefFabric(brief);
  const accent = brief.look.accentColor ?? null;
  const uplight = getBriefUplightColor(brief);
  const legacyDirections = brief.look.fabric
    ? []
    : getOptionLabels(fabricDirectionOptions, brief.look.fabricDirections);

  const ceilingPreset = getBriefCeilingPreset(brief);
  const setupItems = brief.catalogSelections
    .map((id) => getEventCatalogItem(id))
    .filter((item) => item !== undefined);
  const visibleSetups = showAllSetups ? setupItems : setupItems.slice(0, SETUP_PREVIEW);
  const categoryLabel = (id: string) =>
    catalog.categories.find((category) => category.id === id)?.label ?? id;
  const addOnLabels = getOptionLabels(addOnOptions, brief.addOns);

  const isAdmin = audience === "admin";

  return (
    <div className={cn("space-y-4", className)}>
      <SavedCard
        icon={EventIcon}
        eyebrow={eventTypeLabel && eventTypeLabel !== title ? eventTypeLabel : text.briefEyebrow}
        title={title}
        aside={
          <div className="flex flex-wrap items-center gap-1.5">
            {venuePreset ? <SavedChip tone="gold">{venuePreset.label}</SavedChip> : null}
            {isAdmin ? (
              plan.owner_user_id ? (
                <SavedChip tone="gold">
                  <Link2 className="size-3" />
                  {text.linkedAccount}
                </SavedChip>
              ) : (
                <SavedChip>{text.guestCheckout}</SavedChip>
              )
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem] lg:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {dateLabel ? (
                <SavedFact icon={CalendarDays} label={text.date}>
                  {dateLabel}
                </SavedFact>
              ) : null}
              {guests ? (
                <SavedFact icon={Users} label={copy.review.guests}>
                  <span className="tabular-nums">{guests.toLocaleString(locale)}</span>
                </SavedFact>
              ) : null}
              {venueName || cityArea ? (
                <SavedFact icon={MapPin} label={text.venue}>
                  <p className="truncate" title={venueName || cityArea}>
                    {venueName || cityArea}
                  </p>
                  {venueName && cityArea ? <SubLine>{cityArea}</SubLine> : null}
                </SavedFact>
              ) : null}
              {contactName || contactEmail || contactPhone ? (
                <SavedFact
                  icon={UserRound}
                  label={isAdmin ? text.contact : text.yourContact}
                  className="sm:col-span-2 xl:col-span-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    {contactName ? <span>{contactName}</span> : null}
                    {contactEmail ? (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="min-w-0 truncate text-xs font-normal text-primary hover:underline"
                      >
                        {contactEmail}
                      </a>
                    ) : null}
                    {contactPhone ? (
                      <a
                        href={`tel:${contactPhone}`}
                        className="text-xs font-normal tabular-nums text-muted-foreground hover:text-foreground"
                      >
                        {contactPhone}
                      </a>
                    ) : null}
                  </div>
                </SavedFact>
              ) : null}
            </div>
            {notes ? (
              <SavedFact icon={MessageSquare} label={isAdmin ? text.notes : text.yourNotes}>
                <ClampedNotes text={notes} more={text.showMore} less={text.showLess} />
              </SavedFact>
            ) : null}
          </div>

          <figure className="space-y-1.5">
            <div className="aspect-square rounded-xl border border-border/40 bg-background/40 p-2">
              <EventPlanThumbnail
                design={design}
                frontLabel={copy.walls.front.toUpperCase()}
                ariaLabel={copy.review.plan}
              />
            </div>
            <figcaption className="text-center text-[10px] text-muted-foreground">
              {copy.review.planHint}
            </figcaption>
          </figure>
        </div>
      </SavedCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SavedCard
          icon={Ruler}
          eyebrow={`${shapeLabel} · ${stats.areaSqFt.toLocaleString(locale)} ft²`}
          title={copy.review.room}
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <SavedFact label={text.dimensions}>
              <span className="tabular-nums">
                {brief.room.widthFt}′ × {brief.room.lengthFt}′
              </span>
              {brief.room.shape === "l_shape" && brief.room.cutoutWidthFt && brief.room.cutoutDepthFt ? (
                <SubLine>
                  {text.cutout} {brief.room.cutoutWidthFt}′ × {brief.room.cutoutDepthFt}′
                </SubLine>
              ) : null}
            </SavedFact>
            <SavedFact label={text.ceilingHeight}>
              <span className="tabular-nums">{brief.room.wallHeightFt}′</span>
            </SavedFact>
            <SavedFact icon={MapIcon} label={copy.review.area}>
              <span className="tabular-nums">{stats.areaSqFt.toLocaleString(locale)} ft²</span>
            </SavedFact>
            <SavedFact
              icon={LayoutGrid}
              label={copy.review.layout}
              className={cn("col-span-2", seats === 0 && "sm:col-span-3")}
            >
              <p className="truncate">{copy.layouts[layout.id][0]}</p>
              {layoutDetails.length > 0 ? <SubLine>{layoutDetails.join(" · ")}</SubLine> : null}
            </SavedFact>
            {seats > 0 ? (
              <SavedFact label={copy.review.seats}>
                <span className="tabular-nums">
                  {guests ? `${seats} / ${guests}` : seats}
                </span>
              </SavedFact>
            ) : null}
          </div>

          {openingCounts.size > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <DoorOpen className="size-3 text-primary" />
                {copy.room.openings}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...openingCounts].map(([label, count]) => (
                  <SavedChip key={label}>
                    {label}
                    {count > 1 ? ` ×${count}` : ""}
                  </SavedChip>
                ))}
              </div>
            </div>
          ) : null}
        </SavedCard>

        <SavedCard
          icon={Palette}
          eyebrow={copy.fabrics[fabric][0]}
          title={copy.review.look}
          aside={
            <div className="flex items-center -space-x-1" aria-hidden>
              <Swatch color={brief.look.primaryColor} className="size-5 ring-2 ring-card" />
              {accent ? <Swatch color={accent} className="size-5 ring-2 ring-card" /> : null}
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <SavedFact label={copy.look.primary}>
              <span className="flex min-w-0 items-center gap-2">
                <Swatch color={brief.look.primaryColor} />
                <span className="truncate">{colorLabel(brief.look.primaryColor)}</span>
              </span>
              <SubLine>{copy.fabrics[fabric][0]}</SubLine>
            </SavedFact>
            {accent ? (
              <SavedFact label={copy.look.accent}>
                <span className="flex min-w-0 items-center gap-2">
                  <Swatch color={accent} />
                  <span className="truncate">{colorLabel(accent)}</span>
                </span>
                <SubLine>{copy.accentTargets[brief.look.accentTarget ?? "both"]}</SubLine>
              </SavedFact>
            ) : null}
            <SavedFact label={copy.look.fullness}>
              {tFullness(`${fullnessIdFromValue(brief.look.fullness)}.label`)}
              <SubLine>{brief.look.fullness}×</SubLine>
            </SavedFact>
            <SavedFact icon={Sparkles} label={copy.look.lighting}>
              {copy.lighting[getBriefLightingMood(brief)]}
            </SavedFact>
            <SavedFact label={copy.look.uplights}>
              {uplight ? (
                <span className="flex min-w-0 items-center gap-2">
                  <Swatch color={uplight} />
                  <span className="truncate">{colorLabel(uplight)}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{copy.look.uplightsOff}</span>
              )}
            </SavedFact>
          </div>

          {legacyDirections.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {text.fabricDirection}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {legacyDirections.map((label) => (
                  <SavedChip key={label} tone="gold">
                    {label}
                  </SavedChip>
                ))}
              </div>
            </div>
          ) : null}
        </SavedCard>
      </div>

      <SavedCard
        icon={PanelsTopLeft}
        eyebrow={`${copy.setups.selected(setupItems.length)} · ${text.designCounts(
          design.treatments.length,
          design.drapeRuns.length
        )}`}
        title={copy.review.walls}
        aside={
          ceilingPreset ? (
            <SavedChip tone="gold">
              <CloudSun className="size-3" />
              {ceilingPreset.label}
            </SavedChip>
          ) : null
        }
      >
        {setupItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/40 px-4 py-4 text-center text-sm text-muted-foreground">
            {text.noSetups}
          </p>
        ) : (
          <div>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSetups.map((item) => {
                const placement = catalog.placementLabel(item);
                return (
                  <li
                    key={item.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-border/40 bg-background/30 p-2"
                  >
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/30">
                      <Image
                        src={item.image}
                        alt={catalog.localizeItem(item).imageAlt}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={catalog.getItemLabel(item.id)}>
                        {catalog.getItemLabel(item.id)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {categoryLabel(item.category)}
                        {placement ? ` · ${placement}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {setupItems.length > SETUP_PREVIEW ? (
              <ToggleMore
                expanded={showAllSetups}
                onClick={() => setShowAllSetups((v) => !v)}
                more={text.showAll(setupItems.length)}
                less={text.showLess}
              />
            ) : null}
          </div>
        )}

        {addOnLabels.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {copy.look.extras}
            </span>
            {addOnLabels.map((label) => (
              <SavedChip key={label} tone="gold">
                {label}
              </SavedChip>
            ))}
          </div>
        ) : null}
      </SavedCard>
    </div>
  );
}

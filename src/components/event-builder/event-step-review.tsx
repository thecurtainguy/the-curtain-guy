"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Armchair,
  Box,
  CloudSun,
  ExternalLink,
  LayoutGrid,
  Map as MapIcon,
  PanelsTopLeft,
  Ruler,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  DANCE_FLOOR_FINISHES,
  getDrapeColorHex,
  type DrapeColor,
  type StudioDesignJson,
} from "@/data/studio";
import {
  getBriefCeilingPreset,
  getBriefFabric,
  getBriefGuestCount,
  getBriefLayout,
  getBriefLightingMood,
  getBriefOpenings,
  getBriefUplightColor,
  getBriefVenuePreset,
  openGetEstimateFromEventBuilder,
  openStudioDesignerMode,
  openStudioEventMode,
  saveEstimatePrefillFromEventBuilder,
  saveEventBuilderBrief,
  type EventBuilderBrief,
  type EventBuilderLayout,
  type EventLayoutId,
} from "@/data/event-builder/brief";
import {
  EVENT_CHAIR_PICKS,
  EVENT_DANCE_FLOOR_PICKS,
  EVENT_LAYOUT_OPTIONS,
  EVENT_LINEN_PICKS,
  isStudioLayoutKey,
  layoutCountForGuests,
} from "@/data/event-builder/wizard-options";
import { getOpeningPreset } from "@/data/studio-openings";
import { getEventCatalogItem } from "@/data/event-builder/catalog";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";
import { mapEventBuilderBriefToEstimate } from "@/lib/event-builder/map-brief-to-estimate";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { getOptionLabel, useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { OptionCard } from "@/components/estimate/option-card";
import { Button } from "@/components/ui/button";
import { ReviewEditableSection } from "@/components/event-builder/review-editable-section";
import { ColorSwatchGrid } from "@/components/event-builder/color-swatch-grid";
import { EventPlanThumbnail } from "@/components/event-builder/event-plan-thumbnail";
import { countDesignSeats } from "@/components/event-builder/live-plan-sidebar";
import { VisualOptionCard } from "@/components/event-builder/visual-option-card";
import { StatTile, WizardSection, WizardStepHeader } from "@/components/event-builder/wizard-ui";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { useLocalizedDrapeColors } from "@/lib/i18n/event-builder";

export const REVIEW_STEP = {
  event: 0,
  room: 1,
  walls: 2,
  ceiling: 3,
  look: 4,
} as const;

/** Seated layouts warn when fewer seats fit than guests invited. */
const SEATED_LAYOUTS = new Set<EventLayoutId>([
  "banquet_grid",
  "banquet_rows",
  "family_style",
  "buffet",
  "gala",
  "wedding",
  "ceremony",
  "theater",
  "classroom",
  "runway",
]);
/** Layouts whose generator count is the guest list itself, so a "×N" item badge would mislead. */
const PER_GUEST_LAYOUTS = new Set<EventLayoutId>([
  "buffet",
  "gala",
  "wedding",
  "ceremony",
  "theater",
  "runway",
]);
/** Layouts with no chairs to style. */
const CHAIRLESS_LAYOUTS = new Set<EventLayoutId>(["cocktail", "trade_show"]);
const DANCE_FLOOR_LAYOUTS = new Set<EventLayoutId>(["gala", "wedding"]);

type EventStepReviewProps = {
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  frontWall: number;
  onChange: (brief: EventBuilderBrief) => void;
  onEditStep: (stepIndex: number) => void;
  headingId: string;
};

function Swatch({ color }: { color: DrapeColor }) {
  return (
    <span
      className="inline-block size-3.5 shrink-0 rounded-full ring-1 ring-border/60"
      style={{ backgroundColor: getDrapeColorHex(color) }}
      aria-hidden
    />
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

export function EventStepReview({
  brief,
  design,
  frontWall,
  onChange,
  onEditStep,
  headingId,
}: EventStepReviewProps) {
  const t = useTranslations("eventBuilder");
  const copy = useWizardCopy();
  const catalog = useWizardCatalog();
  const eventTypes = useLocalizedEventTypes();
  const drapeColors = useLocalizedDrapeColors();
  const colorLabel = (value: string) =>
    drapeColors.find((color) => color.value === value)?.label ?? value;

  const layout = getBriefLayout(brief);
  const guests = getBriefGuestCount(brief);
  const seats = countDesignSeats(design);
  const showFitWarning =
    SEATED_LAYOUTS.has(layout.id) && guests > 0 && seats < Math.floor(guests * 0.9);

  const layoutPreviews = useMemo(() => {
    const current = getBriefLayout(brief);
    const base: EventBuilderBrief = {
      ...brief,
      catalogSelections: [],
      ceiling: { presetId: null },
    };
    return Object.fromEntries(
      EVENT_LAYOUT_OPTIONS.map((option) => [
        option.id,
        buildStarterDesignFromBrief({ ...base, layout: { ...current, id: option.id } }),
      ])
    ) as Record<EventLayoutId, StudioDesignJson>;
  }, [brief]);

  function setLayout(patch: Partial<EventBuilderLayout>) {
    onChange({ ...brief, layout: { ...layout, ...patch } });
  }

  function persistAnd(open: () => void) {
    saveEventBuilderBrief(brief);
    open();
  }

  function handoffToEstimate() {
    saveEventBuilderBrief(brief);
    saveEstimatePrefillFromEventBuilder(
      mapEventBuilderBriefToEstimate(brief) as Record<string, unknown>
    );
    openGetEstimateFromEventBuilder();
  }

  const eventLabel = getOptionLabel(eventTypes, brief.eventType) ?? brief.eventType;
  const venuePreset = getBriefVenuePreset(brief);
  const ceilingPreset = getBriefCeilingPreset(brief);
  const openings = getBriefOpenings(brief);
  const uplight = getBriefUplightColor(brief);
  const fabric = getBriefFabric(brief);
  const setupIds = brief.catalogSelections.filter((id) => {
    const item = getEventCatalogItem(id);
    return item && !item.hidden;
  });
  const area = Math.round(calculateRoomAreaSquareFeet(design.room.floor));
  const layoutCopy = copy.layouts[layout.id];
  const seatedLabel =
    guests > 0 && SEATED_LAYOUTS.has(layout.id) ? `${seats} / ${guests}` : String(seats);

  return (
    <div className="space-y-6">
      <WizardStepHeader
        id={headingId}
        icon={LayoutGrid}
        eyebrow={copy.review.eyebrow}
        title={copy.review.title}
      />

      <WizardSection
        icon={LayoutGrid}
        label={copy.review.layout}
        hint={copy.review.sizedFor(guests)}
        labelId="layout-label"
      >
        <div
          role="radiogroup"
          aria-labelledby="layout-label"
          className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7"
        >
          {EVENT_LAYOUT_OPTIONS.map((option) => {
            const [label, description] = copy.layouts[option.id];
            const count =
              isStudioLayoutKey(option.id) && !PER_GUEST_LAYOUTS.has(option.id)
                ? layoutCountForGuests(option.id, guests)
                : null;
            return (
              <VisualOptionCard
                key={option.id}
                title={label}
                description={description}
                badge={count !== null ? `×${count}` : undefined}
                mediaClassName="h-28 bg-background/50 p-1.5"
                media={
                  <EventPlanThumbnail
                    design={layoutPreviews[option.id]}
                    ariaLabel={label}
                  />
                }
                selected={layout.id === option.id}
                onSelect={() => setLayout({ id: option.id })}
              />
            );
          })}
        </div>

        {layout.id !== "none" ? (
          <div className="mt-6 space-y-5">
            {!CHAIRLESS_LAYOUTS.has(layout.id) ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground" id="chair-label">
                  <Armchair className="size-3.5 text-primary" aria-hidden />
                  {copy.review.chairs}
                </p>
                <div role="radiogroup" aria-labelledby="chair-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                  {EVENT_CHAIR_PICKS.map((style) => (
                    <OptionCard
                      key={style}
                      option={{ id: style, label: copy.chairs[style] }}
                      selected={(layout.chairStyle ?? "chiavari_gold") === style}
                      onSelect={() => setLayout({ chairStyle: style })}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UtensilsCrossed className="size-3.5 text-primary" aria-hidden />
                {copy.review.linen}
              </p>
              <ColorSwatchGrid
                colors={EVENT_LINEN_PICKS}
                value={layout.linenColor === undefined ? "ivory" : layout.linenColor}
                noneLabel={copy.review.bare}
                onChange={(linenColor) => setLayout({ linenColor })}
                ariaLabel={copy.review.linen}
              />
            </div>
            {DANCE_FLOOR_LAYOUTS.has(layout.id) ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground" id="dance-floor-label">
                  {copy.review.danceFloor}
                </p>
                <div role="radiogroup" aria-labelledby="dance-floor-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {EVENT_DANCE_FLOOR_PICKS.map((finish) => (
                    <OptionCard
                      key={finish}
                      option={{
                        id: finish,
                        label:
                          DANCE_FLOOR_FINISHES.find((entry) => entry.value === finish)?.label ?? finish,
                      }}
                      selected={(layout.danceFloor ?? "white_gloss") === finish}
                      onSelect={() => setLayout({ danceFloor: finish })}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </WizardSection>

      <section
        aria-label={copy.review.yourDesign}
        className="overflow-hidden rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_12%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_50%)]"
      >
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {copy.review.yourDesign}
              </p>
              <h3 className="mt-2 font-heading text-2xl font-semibold">
                {brief.eventName?.trim() || eventLabel || copy.review.yourDesign}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {eventLabel ? <Tag>{eventLabel}</Tag> : null}
                {brief.eventDate ? <Tag>{brief.eventDate}</Tag> : null}
                {brief.venueName?.trim() ? <Tag>{brief.venueName.trim()}</Tag> : null}
                {brief.cityArea?.trim() ? <Tag>{brief.cityArea.trim()}</Tag> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile icon={Users} label={copy.review.guests} value={String(guests)} />
              <StatTile
                icon={Armchair}
                label={copy.review.seats}
                value={seatedLabel}
                tone={showFitWarning ? "warning" : "default"}
              />
              <StatTile icon={MapIcon} label={copy.review.area} value={`${area.toLocaleString()} ft²`} />
              <StatTile icon={Ruler} label={copy.review.drape} value={inchesToFeetLabel(calculateDrapeLength(design))} />
              <StatTile icon={PanelsTopLeft} label={copy.review.treatments} value={String(design.treatments.length)} />
              <StatTile
                icon={CloudSun}
                label={copy.review.ceiling}
                value={ceilingPreset?.label ?? copy.review.none}
              />
            </div>

            {showFitWarning ? (
              <p className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100" role="status">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
                {copy.review.fitWarning(seats)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="aspect-square rounded-2xl border border-border/40 bg-background/50 p-3">
              <EventPlanThumbnail
                design={design}
                frontWall={frontWall}
                frontLabel={copy.walls.front.toUpperCase()}
                ariaLabel={copy.review.plan}
              />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">{copy.review.planHint}</p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-border/30 p-5 sm:grid-cols-2 sm:p-7">
          <ReviewEditableSection
            title={copy.review.event}
            editLabel={`${copy.review.edit} — ${copy.review.event}`}
            stepIndex={REVIEW_STEP.event}
            onEditStep={onEditStep}
          >
            <div className="flex flex-wrap gap-2">
              <Tag>
                <Users className="size-3 text-primary" aria-hidden />
                {guests}
              </Tag>
              {venuePreset ? <Tag>{venuePreset.label}</Tag> : null}
            </div>
          </ReviewEditableSection>

          <ReviewEditableSection
            title={copy.review.room}
            editLabel={`${copy.review.edit} — ${copy.review.room}`}
            stepIndex={REVIEW_STEP.room}
            onEditStep={onEditStep}
          >
            <div className="flex flex-wrap gap-2">
              <Tag>
                {brief.room.widthFt}′ × {brief.room.lengthFt}′ · {brief.room.wallHeightFt}′
              </Tag>
              {openings.map((opening) => (
                <Tag key={opening.id}>
                  {getOpeningPreset(opening.style).label} · {copy.walls[opening.wall]}
                </Tag>
              ))}
            </div>
          </ReviewEditableSection>

          <ReviewEditableSection
            title={copy.review.walls}
            editLabel={`${copy.review.edit} — ${copy.review.walls}`}
            stepIndex={REVIEW_STEP.walls}
            onEditStep={onEditStep}
          >
            {setupIds.length === 0 && !ceilingPreset ? (
              <p className="text-xs text-muted-foreground">{copy.review.noSetups}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {setupIds.map((id) => (
                  <Tag key={id}>{catalog.getItemLabel(id)}</Tag>
                ))}
                {ceilingPreset ? (
                  <Tag>
                    <CloudSun className="size-3 text-primary" aria-hidden />
                    {ceilingPreset.label}
                  </Tag>
                ) : null}
              </div>
            )}
          </ReviewEditableSection>

          <ReviewEditableSection
            title={copy.review.look}
            editLabel={`${copy.review.edit} — ${copy.review.look}`}
            stepIndex={REVIEW_STEP.look}
            onEditStep={onEditStep}
          >
            <div className="flex flex-wrap gap-2">
              <Tag>
                <Swatch color={brief.look.primaryColor} />
                {copy.fabrics[fabric][0]} · {colorLabel(brief.look.primaryColor)}
              </Tag>
              {brief.look.accentColor ? (
                <Tag>
                  <Swatch color={brief.look.accentColor} />
                  {copy.look.accent}: {colorLabel(brief.look.accentColor)}
                </Tag>
              ) : null}
              <Tag>
                <Sparkles className="size-3 text-primary" aria-hidden />
                {copy.lighting[getBriefLightingMood(brief)]}
              </Tag>
              {uplight ? (
                <Tag>
                  <Swatch color={uplight} />
                  {copy.look.uplights}
                </Tag>
              ) : null}
              <Tag>
                <LayoutGrid className="size-3 text-primary" aria-hidden />
                {layoutCopy[0]}
              </Tag>
            </div>
          </ReviewEditableSection>
        </div>

        <div className="border-t border-border/30 p-5 sm:p-7">
          <p className="text-xs leading-relaxed text-muted-foreground">{t("step4.disclaimer")}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" size="lg" onClick={() => persistAnd(openStudioEventMode)}>
              <Box className="size-4" />
              {t("step4.ctaStudio")}
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => persistAnd(openStudioDesignerMode)}
            >
              {t("step4.ctaAdvanced")}
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </Button>
            <Button type="button" variant="ghost" className="min-h-10" onClick={handoffToEstimate}>
              {t("step4.ctaEstimate")}
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("step4.keepTabHint")}</p>
        </div>
      </section>
    </div>
  );
}

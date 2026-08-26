"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilLine, Ruler } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { roomPreviewStats } from "@/data/event-builder/catalog";
import { ChoiceCard } from "@/components/event-builder/choice-card";
import { EventRoomShapeCanvas } from "@/components/event-builder/event-room-shape-canvas";
import { RoomShapeCard } from "@/components/event-builder/room-shape-card";
import { OptionCard } from "@/components/estimate/option-card";
import { useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RoomInputMode = "fields" | "draw";

type EventStepEventRoomProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
};

export function EventStepEventRoom({ brief, onChange }: EventStepEventRoomProps) {
  const t = useTranslations("eventBuilder");
  const localizedEventTypes = useLocalizedEventTypes();
  const stats = roomPreviewStats(brief);
  const ceilingLabel = t("review.ceilingLabel", {
    height: brief.room.wallHeightFt,
  });
  const [inputMode, setInputMode] = useState<RoomInputMode>("fields");
  const isDrawMode = inputMode === "draw";

  function updateRoom(patch: Partial<EventBuilderBrief["room"]>): void {
    onChange({ ...brief, room: { ...brief.room, ...patch } });
  }

  const upsell =
    brief.eventType === "wedding"
      ? t("step1.upsellWedding")
      : brief.eventType === "corporate"
        ? t("step1.upsellCorporate")
        : t("step1.upsellDefault");

  return (
    <div
      className={cn(
        "grid gap-8 lg:items-start",
        isDrawMode
          ? "lg:grid-cols-1"
          : "lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
      )}
    >
      <div className="space-y-6 rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("step1.eyebrow")}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">
            {t("step1.title")}
          </h2>
        </div>

        <div className="space-y-3">
          <Label>{t("step1.eventType")}</Label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localizedEventTypes.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={brief.eventType === option.id}
                onSelect={() => onChange({ ...brief, eventType: option.id })}
              />
            ))}
          </div>
          {brief.eventType ? (
            <p className="text-xs text-muted-foreground">{upsell}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Label>{t("step1.roomShape")}</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <RoomShapeCard
              shape="rectangle"
              label={t("step1.rectangle")}
              selected={brief.room.shape === "rectangle"}
              onSelect={() => updateRoom({ shape: "rectangle" })}
            />
            <RoomShapeCard
              shape="l_shape"
              label={t("step1.lShape")}
              selected={brief.room.shape === "l_shape"}
              onSelect={() => updateRoom({ shape: "l_shape" })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("step1.previewLabel")}</Label>
          <div
            className="grid gap-3 sm:grid-cols-2"
            role="radiogroup"
            aria-label={t("step1.previewLabel")}
          >
            <ChoiceCard
              label={t("step1.inputModeFields")}
              description={t("step1.inputModeFieldsHint")}
              icon={Ruler}
              selected={inputMode === "fields"}
              onSelect={() => setInputMode("fields")}
            />
            <ChoiceCard
              label={t("step1.inputModeDraw")}
              description={t("step1.inputModeDrawHint")}
              icon={PencilLine}
              selected={isDrawMode}
              onSelect={() => setInputMode("draw")}
            />
          </div>
        </div>

        {isDrawMode ? (
          <div className="space-y-4 rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_12%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_50%)] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("step1.drawCanvasTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("step1.drawHint")}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("step1.previewLabel")}
                </p>
                <p className="font-heading text-lg font-semibold tabular-nums">
                  {stats.areaSqFt.toLocaleString()} ft²
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("step1.roomDimensions", {
                    width: brief.room.widthFt,
                    length: brief.room.lengthFt,
                  })}
                </p>
              </div>
            </div>

            <EventRoomShapeCanvas
              room={brief.room}
              interactive
              ariaLabel={t("step1.drawCanvasTitle")}
              onRoomChange={updateRoom}
              className="min-h-[min(420px,52vh)]"
            />

            <div className="space-y-2">
              <Label htmlFor="room-height-draw">{t("step1.ceiling")}</Label>
              <Input
                id="room-height-draw"
                type="number"
                min={8}
                max={30}
                value={brief.room.wallHeightFt}
                onChange={(e) =>
                  updateRoom({ wallHeightFt: Number(e.target.value) || 12 })
                }
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="room-width">{t("step1.width")}</Label>
                <Input
                  id="room-width"
                  type="number"
                  min={10}
                  max={200}
                  value={brief.room.widthFt}
                  onChange={(e) =>
                    updateRoom({ widthFt: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-length">{t("step1.length")}</Label>
                <Input
                  id="room-length"
                  type="number"
                  min={10}
                  max={300}
                  value={brief.room.lengthFt}
                  onChange={(e) =>
                    updateRoom({ lengthFt: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-height">{t("step1.ceiling")}</Label>
                <Input
                  id="room-height"
                  type="number"
                  min={8}
                  max={30}
                  value={brief.room.wallHeightFt}
                  onChange={(e) =>
                    updateRoom({ wallHeightFt: Number(e.target.value) || 12 })
                  }
                />
              </div>
            </div>

            {brief.room.shape === "l_shape" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cutout-width">{t("step1.cutoutWidth")}</Label>
                  <Input
                    id="cutout-width"
                    type="number"
                    min={8}
                    value={brief.room.cutoutWidthFt ?? 20}
                    onChange={(e) =>
                      updateRoom({ cutoutWidthFt: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutout-depth">{t("step1.cutoutDepth")}</Label>
                  <Input
                    id="cutout-depth"
                    type="number"
                    min={8}
                    value={brief.room.cutoutDepthFt ?? 20}
                    onChange={(e) =>
                      updateRoom({ cutoutDepthFt: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-date">{t("step1.eventDate")}</Label>
            <DateInput
              id="event-date"
              value={brief.eventDate ?? ""}
              onChange={(value) => onChange({ ...brief, eventDate: value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-name">{t("step1.venue")}</Label>
            <Input
              id="venue-name"
              value={brief.venueName ?? ""}
              onChange={(e) =>
                onChange({ ...brief, venueName: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city-area">{t("step1.city")}</Label>
          <Input
            id="city-area"
            value={brief.cityArea ?? ""}
            onChange={(e) => onChange({ ...brief, cityArea: e.target.value })}
          />
        </div>
      </div>

      {!isDrawMode ? (
        <div className="space-y-4">
          <EventRoomShapeCanvas
            room={brief.room}
            interactive={false}
            ariaLabel={t("step1.previewLabel")}
            className="min-h-[240px] lg:min-h-[300px]"
          />
          <div className="rounded-2xl border border-border/40 bg-card/30 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("step1.previewLabel")}
            </p>
            <p className="mt-2 font-heading text-2xl font-semibold">
              {stats.areaSqFt.toLocaleString()} ft²
            </p>
            <p className="text-sm text-muted-foreground">{ceilingLabel}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("step1.roomDimensions", {
                width: brief.room.widthFt,
                length: brief.room.lengthFt,
              })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

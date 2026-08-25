"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  STUDIO_STATUS_LABELS,
  type StudioDesignRow,
} from "@/data/studio";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  getStudioBounds,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import {
  ArrowUpRight,
  Clock3,
  Ruler,
  ScissorsLineDashed,
} from "lucide-react";

type StudioDesignCardProps = {
  design: StudioDesignRow;
  href?: string;
  onOpen?: (design: StudioDesignRow) => void;
};

function formatWholeNumber(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatIsoDate(value: string): string {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "recently";
}

export function StudioDesignCard({
  design,
  href,
  onOpen,
}: StudioDesignCardProps) {
  const json = design.design_json;
  const bounds = getStudioBounds(json.room.floor);
  const padding = Math.max(bounds.width, bounds.depth) * 0.08;
  const viewBox = `${bounds.minX - padding} ${bounds.minZ - padding} ${bounds.width + padding * 2} ${bounds.depth + padding * 2}`;

  return (
    <article className="group overflow-hidden rounded-4xl border border-border/60 bg-card/55 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative h-40 overflow-hidden bg-[radial-gradient(circle_at_50%_20%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)] p-5">
        <svg
          viewBox={viewBox}
          className="size-full text-primary"
          role="img"
          aria-label={`${json.room.name} floor plan preview`}
        >
          <polygon
            points={json.room.floor.map((point) => `${point.x},${point.z}`).join(" ")}
            fill="currentColor"
            fillOpacity="0.08"
            stroke="currentColor"
            strokeWidth={Math.max(2, Math.max(bounds.width, bounds.depth) / 120)}
            strokeLinejoin="round"
          />
        </svg>
        <Badge className="absolute top-4 left-4 border-primary/20 bg-background/75 text-foreground backdrop-blur">
          {STUDIO_STATUS_LABELS[design.status]}
        </Badge>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
            {json.room.shape.replace("_", " ")}
          </p>
          <h3 className="mt-1 truncate font-heading text-xl">{design.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {json.room.name}
          </p>
          {design.opportunity_ref ? (
            <p className="mt-2 text-xs font-medium text-primary">
              {design.opportunity_ref}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-2.5 py-1">
            <Ruler className="size-3 text-primary" aria-hidden="true" />
            {formatWholeNumber(calculateRoomAreaSquareFeet(json.room.floor))} ft²
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-2.5 py-1">
            <ScissorsLineDashed className="size-3 text-primary" aria-hidden="true" />
            {inchesToFeetLabel(calculateDrapeLength(json))}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-2.5 py-1">
            <Clock3 className="size-3 text-primary" aria-hidden="true" />
            Updated {formatIsoDate(design.updated_at)}
          </span>
        </div>

        {href ? (
          <Button asChild variant="outline" className="w-full justify-between">
            <Link href={href}>
              Open design
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => onOpen?.(design)}
          >
            Open design
            <ArrowUpRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
}

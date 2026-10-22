"use client";

import {
  STUDIO_MAX_TREATMENTS,
  type StudioDesignJson,
  type StudioOpening,
} from "@/data/studio";
import {
  createTreatmentForOpening,
  getOpeningTreatmentOptions,
  treatmentDressesOpening,
  type StudioOpeningTreatmentKey,
  type StudioOpeningTreatmentOption,
} from "@/lib/studio-treatments";
import { cn } from "@/lib/utils";
import { Check, Plus, Theater } from "lucide-react";
import {
  useStudioEditorActions,
  type StudioCommitOptions,
} from "../editor/studio-editor-context";
import { StudioTip } from "../studio-tip";
import { InspectorSection } from "./inspector-ui";

/** One-click drape treatments fitted to the selected opening. */
export function OpeningDressSection({
  design,
  opening,
  onChange,
}: {
  design: StudioDesignJson;
  opening: StudioOpening;
  onChange: (design: StudioDesignJson, options?: StudioCommitOptions) => void;
}) {
  const { select } = useStudioEditorActions();
  const options = getOpeningTreatmentOptions(opening);
  const full = design.treatments.length >= STUDIO_MAX_TREATMENTS;
  const isWindow = opening.type === "window";

  function dress(option: StudioOpeningTreatmentOption, existingId: string | null) {
    if (existingId) {
      select({ kind: "treatment", id: existingId });
      return;
    }
    const treatment = createTreatmentForOpening(design, opening.id, option.key);
    if (!treatment) return;
    onChange({ ...design, treatments: [...design.treatments, treatment] });
    select({ kind: "treatment", id: treatment.id });
  }

  return (
    <InspectorSection icon={Theater} eyebrow="Drapery" title="Dress this opening">
      <div className="grid gap-1.5">
        {options.map((option) => {
          const existing = design.treatments.find((treatment) =>
            treatmentDressesOpening(treatment, opening, option.key)
          );
          const added = Boolean(existing);
          const blocked = !added && full;
          return (
            <StudioTip
              key={option.key}
              label={
                added
                  ? "Already added — click to edit it"
                  : blocked
                    ? "This design has the maximum number of treatments"
                    : `Add ${option.label.toLowerCase()} sized to this ${isWindow ? "window" : "doorway"}`
              }
              side="left"
            >
              <span className="flex">
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => dress(option, existing?.id ?? null)}
                  className={cn(
                    "group relative flex w-full min-w-0 items-center gap-2.5 rounded-2xl border p-2 text-left transition-all duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
                    added
                      ? "border-primary/45 bg-primary/10"
                      : "border-border/40 bg-card/35 hover:border-primary/30 hover:bg-card/60 active:scale-[0.99]"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-xl border bg-[radial-gradient(circle_at_50%_25%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_70%)]",
                      added
                        ? "border-primary/35 text-primary"
                        : "border-border/30 text-primary/75 group-hover:text-primary"
                    )}
                  >
                    <TreatmentFitGlyph treatment={option.key} isWindow={isWindow} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.72rem] font-medium leading-tight">
                      {option.label}
                    </span>
                    <span className="line-clamp-2 text-[0.62rem] leading-tight text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {added ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[0.58rem] font-semibold text-primary">
                      <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                      Added
                    </span>
                  ) : (
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/50 text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-primary"
                      aria-hidden="true"
                    >
                      <Plus className="size-3" />
                    </span>
                  )}
                </button>
              </span>
            </StudioTip>
          );
        })}
      </div>
    </InspectorSection>
  );
}

const PANEL_LEFT =
  "M5 6H14C14 13 12.5 19 12 23C12 27 10.5 31 9.5 36H4C4.5 30 6 26 6.5 23C6 18 5 12 5 6Z";
const PANEL_RIGHT =
  "M35 6H26C26 13 27.5 19 28 23C28 27 29.5 31 30.5 36H36C35.5 30 34 26 33.5 23C34 18 35 12 35 6Z";

/** Miniature elevation of a treatment dressed around a door or window. */
function TreatmentFitGlyph({
  treatment,
  isWindow,
}: {
  treatment: StudioOpeningTreatmentKey;
  isWindow: boolean;
}) {
  const panels = treatment !== "top_swag";
  const swag = treatment === "top_swag" || treatment.endsWith("_surround");
  const top = isWindow ? 14 : 11;
  const bottom = isWindow ? 28 : 36;
  return (
    <svg
      viewBox="0 0 40 40"
      className="size-10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1={2} y1={36} x2={38} y2={36} strokeOpacity={0.35} />
      <rect
        x={14}
        y={top}
        width={12}
        height={bottom - top}
        strokeOpacity={0.45}
        fill="currentColor"
        fillOpacity={isWindow ? 0.08 : 0.05}
      />
      {panels ? (
        <>
          <path d={PANEL_LEFT} fill="currentColor" fillOpacity={0.22} />
          <path d={PANEL_RIGHT} fill="currentColor" fillOpacity={0.22} />
          {treatment === "side_tiebacks" || treatment === "entrance_reveal" ? (
            <>
              <line x1={5.5} y1={23} x2={12.5} y2={23} strokeWidth={1.6} />
              <line x1={27.5} y1={23} x2={34.5} y2={23} strokeWidth={1.6} />
            </>
          ) : null}
        </>
      ) : null}
      {swag ? (
        treatment === "top_swag" ? (
          <>
            <path
              d="M8 6Q14 14 20 6Q26 14 32 6Z"
              fill="currentColor"
              fillOpacity={0.3}
            />
            <path d="M8 6L6.5 15L9.5 13Z" fill="currentColor" fillOpacity={0.3} />
            <path d="M32 6L33.5 15L30.5 13Z" fill="currentColor" fillOpacity={0.3} />
          </>
        ) : (
          <path d="M5 6H35Q20 17 5 6Z" fill="currentColor" fillOpacity={0.32} />
        )
      ) : null}
      <line x1={3} y1={6} x2={37} y2={6} strokeWidth={1.4} />
    </svg>
  );
}

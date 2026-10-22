import {
  Armchair,
  DoorOpen,
  LampCeiling,
  Lightbulb,
  MoveVertical,
  NotebookPen,
  Ruler,
  ScissorsLineDashed,
  Sparkles,
  SquareDashed,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioDesignSummary } from "./design-summary";

function WantsSection({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: LucideIcon;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_65%)] px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 truncate font-heading text-sm leading-tight">{title}</h3>
        {meta ? (
          <span className="shrink-0 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="space-y-2.5 p-3">{children}</div>
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.05] px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="size-3 text-primary" aria-hidden />
        {label}
      </p>
      <p className="mt-0.5 font-heading text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem]",
        tone === "gold"
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border/50 bg-background/60 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

function Swatch({ swatch, size = "md" }: { swatch: { hex: string; label: string } | null; size?: "sm" | "md" }) {
  if (!swatch) return null;
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-md border border-border/60 shadow-inner",
        size === "sm" ? "size-3" : "size-6"
      )}
      style={{ backgroundColor: swatch.hex }}
      title={swatch.label}
      aria-hidden
    />
  );
}

function Row({
  swatch,
  title,
  subtitle,
  children,
}: {
  swatch?: { hex: string; label: string } | null;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
      <div className="flex items-start gap-2.5">
        {swatch !== undefined ? <Swatch swatch={swatch} /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-2 flex flex-wrap gap-1">{children}</div> : null}
    </div>
  );
}

/** "What they want" — a read-only, quote-ready breakdown of a studio design. */
export function StudioDesignWants({
  summary,
  className,
}: {
  summary: StudioDesignSummary;
  className?: string;
}) {
  const runCount = summary.walls.reduce((sum, wall) => sum + wall.runs.length, 0);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2">
        <Tile icon={Ruler} label="Room" value={`${summary.widthFt}′ × ${summary.depthFt}′`} />
        <Tile icon={SquareDashed} label="Floor area" value={`${summary.areaSqFt.toLocaleString()} ft²`} />
        <Tile icon={MoveVertical} label="Ceiling" value={summary.wallHeightLabel} />
        <Tile icon={ScissorsLineDashed} label="Drapery" value={`${summary.drapeLinearFt.toLocaleString()} lin ft`} />
        <Tile icon={Users} label="Seats" value={summary.seats.toLocaleString()} />
        <Tile icon={Armchair} label="Objects" value={summary.objectCount.toLocaleString()} />
      </div>

      <WantsSection
        icon={ScissorsLineDashed}
        title="Drapery by wall"
        meta={runCount ? `${runCount} ${runCount === 1 ? "run" : "runs"}` : undefined}
      >
        {summary.walls.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No wall drapery yet.</p>
        ) : (
          summary.walls.map((wall) => (
            <div key={wall.wallIndex} className="space-y-1.5">
              <p className="text-[10px] font-medium tracking-[0.14em] text-primary uppercase">
                {wall.label} · {wall.lengthLabel} wall
              </p>
              {wall.runs.map((run) => (
                <Row
                  key={run.id}
                  swatch={run.color}
                  title={`${run.fabric} · ${run.color?.label ?? "—"}`}
                  subtitle={`${run.typeLabel} · ${run.label}`}
                >
                  <Chip tone="gold">{run.hungLabel} hung</Chip>
                  <Chip>{run.heightLabel} tall</Chip>
                  <Chip>{run.hardware}</Chip>
                  <Chip>{run.fullness}</Chip>
                  {run.puddle ? <Chip>Puddled</Chip> : null}
                  {run.doorGaps && run.gapCount > 0 ? (
                    <Chip>
                      {run.gapCount} door {run.gapCount === 1 ? "gap" : "gaps"}
                    </Chip>
                  ) : null}
                  {!run.doorGaps ? <Chip>Covers doors</Chip> : null}
                  {run.uplight ? (
                    <Chip>
                      <Swatch swatch={run.uplight} size="sm" />
                      {run.uplight.label} uplight
                    </Chip>
                  ) : null}
                </Row>
              ))}
            </div>
          ))
        )}
      </WantsSection>

      {summary.treatments.length > 0 ? (
        <WantsSection icon={Sparkles} title="Treatments" meta={String(summary.treatments.length)}>
          {summary.treatments.map((treatment) => (
            <Row
              key={treatment.id}
              swatch={treatment.color}
              title={treatment.typeLabel}
              subtitle={`${treatment.wallLabel} · ${treatment.fabric} · ${treatment.color?.label ?? "—"}${treatment.secondary ? ` + ${treatment.secondary.label}` : ""}`}
            >
              <Chip tone="gold">{treatment.widthLabel} wide</Chip>
              <Chip>{treatment.heightLabel} tall</Chip>
              <Chip>{treatment.frame} frame</Chip>
              {treatment.extras.map((extra) => (
                <Chip key={extra}>{extra}</Chip>
              ))}
            </Row>
          ))}
        </WantsSection>
      ) : null}

      {summary.ceilings.length > 0 ? (
        <WantsSection icon={LampCeiling} title="Ceiling designs" meta={String(summary.ceilings.length)}>
          {summary.ceilings.map((ceiling) => (
            <Row
              key={ceiling.id}
              swatch={ceiling.color}
              title={ceiling.styleLabel}
              subtitle={`${ceiling.fabric} · ${ceiling.color?.label ?? "—"}${ceiling.accent ? ` / ${ceiling.accent.label}` : ""}`}
            >
              <Chip tone="gold">{ceiling.yards.toLocaleString()} yd fabric</Chip>
              <Chip>{ceiling.lights}</Chip>
              <Chip>{ceiling.hub}</Chip>
            </Row>
          ))}
        </WantsSection>
      ) : null}

      {summary.openings.length > 0 ? (
        <WantsSection icon={DoorOpen} title="Doors & windows" meta={String(summary.openings.length)}>
          <div className="grid gap-1.5">
            {summary.openings.map((opening) => (
              <div
                key={opening.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 px-2.5 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-foreground">{opening.styleLabel}</span>
                  <span className="text-muted-foreground"> · {opening.wallLabel}</span>
                </span>
                <Chip>{opening.sizeLabel}</Chip>
              </div>
            ))}
          </div>
        </WantsSection>
      ) : null}

      {summary.objectGroups.length > 0 ? (
        <WantsSection icon={Armchair} title="Furniture & layout" meta={`${summary.objectCount} items`}>
          <div className="flex flex-wrap gap-1.5">
            {summary.objectGroups.map((group) => (
              <span
                key={group.type}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/40 px-2.5 py-1.5 text-xs"
              >
                <span className="font-heading font-semibold text-primary">{group.count}×</span>
                <span className="text-foreground">{group.label}</span>
                {group.seats > 0 ? (
                  <span className="text-muted-foreground">· {group.seats} seats</span>
                ) : null}
              </span>
            ))}
          </div>
        </WantsSection>
      ) : null}

      <WantsSection icon={Lightbulb} title="Lighting & finishes">
        <div className="flex flex-wrap gap-1">
          <Chip tone="gold">{summary.lighting.mood} mood</Chip>
          {summary.lighting.perimeterUplight ? (
            <Chip>
              <Swatch swatch={summary.lighting.perimeterUplight} size="sm" />
              {summary.lighting.perimeterUplight.label} perimeter uplight
            </Chip>
          ) : null}
          {summary.lighting.uplightFixtures > 0 ? (
            <Chip>{summary.lighting.uplightFixtures} uplight fixtures</Chip>
          ) : null}
          {summary.lighting.chandeliers > 0 ? (
            <Chip>{summary.lighting.chandeliers} chandeliers</Chip>
          ) : null}
          {summary.lighting.litRuns > 0 ? (
            <Chip>{summary.lighting.litRuns} uplit drape runs</Chip>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {(
            [
              ["Floor", summary.finishes.floor],
              ["Walls", summary.finishes.walls],
              ["Ceiling", summary.finishes.ceiling],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border/40 bg-background/40 px-2 py-1.5">
              <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
              <p className="truncate text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </WantsSection>

      <WantsSection icon={NotebookPen} title="Their notes">
        {summary.notes ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{summary.notes}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">No notes added.</p>
        )}
      </WantsSection>
    </div>
  );
}

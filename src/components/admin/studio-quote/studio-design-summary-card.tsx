import Link from "next/link";
import {
  Armchair,
  Blinds,
  CloudSun,
  Flower2,
  Lightbulb,
  PanelsTopLeft,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerLanguage } from "@/data/customer-language";
import type { StudioQuoteDesignSummary } from "@/lib/studio-quote-converter";
import { cn } from "@/lib/utils";

const COPY = {
  en: {
    adminEyebrow: "From studio design",
    customerEyebrow: "Your design",
    adminPlanEyebrow: "From event plan layout",
    room: "Room",
    drapery: "ft of drapery",
    treatments: "treatments",
    ceiling: "ceiling designs",
    uplights: "uplights",
    chairs: "chairs",
    tables: "tables",
    open: "Open design",
    customerBody: "This proposal was prepared from your room design.",
  },
  fr: {
    adminEyebrow: "Plan studio",
    customerEyebrow: "Votre plan",
    adminPlanEyebrow: "Plan d’événement",
    room: "Salle",
    drapery: "pi de draperie",
    treatments: "décors",
    ceiling: "plafonds",
    uplights: "projecteurs",
    chairs: "chaises",
    tables: "tables",
    open: "Ouvrir le plan",
    customerBody: "Cette soumission a été préparée à partir de votre plan de salle.",
  },
} as const;

export function StudioDesignSummaryCard({
  summary,
  variant,
  language = "en",
  href,
  actions,
  layout = "row",
  className,
}: {
  summary: StudioQuoteDesignSummary;
  variant: "admin" | "customer";
  language?: CustomerLanguage;
  /** Where "Open design" goes; omit to hide the link. */
  href?: string | null;
  /** Extra admin actions (e.g. rebuild quote). */
  actions?: React.ReactNode;
  /** `stack` for narrow sidebars. */
  layout?: "row" | "stack";
  className?: string;
}) {
  const copy = COPY[language];
  const { totals } = summary;
  const stats: { icon: LucideIcon; value: number; label: string }[] = [
    { icon: Blinds, value: totals.drapeLinearFeet, label: copy.drapery },
    { icon: Flower2, value: totals.treatmentCount, label: copy.treatments },
    { icon: CloudSun, value: totals.ceilingCount, label: copy.ceiling },
    { icon: Lightbulb, value: totals.uplightCount, label: copy.uplights },
    { icon: Armchair, value: totals.chairCount, label: copy.chairs },
    { icon: Armchair, value: totals.tableCount, label: copy.tables },
  ].filter((stat) => stat.value > 0);
  const eyebrow =
    variant === "customer"
      ? copy.customerEyebrow
      : summary.kind === "event_plan"
        ? copy.adminPlanEyebrow
        : copy.adminEyebrow;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-primary/25 bg-card/30",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div
        className={cn(
          "relative flex flex-col gap-4 p-4 sm:p-5",
          layout === "row" && "sm:flex-row sm:items-center"
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-background/50",
            layout === "row" ? "aspect-[4/3] w-full sm:w-44" : "aspect-[16/9] w-full"
          )}
        >
          {summary.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnails are data URLs or storage URLs
            <img
              src={summary.thumbnailUrl}
              alt={summary.title}
              className="size-full object-cover"
            />
          ) : (
            <PanelsTopLeft className="size-8 text-primary/60" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
              {eyebrow}
            </p>
            <h2 className="mt-1 font-heading text-lg leading-tight font-semibold">
              {summary.title}
            </h2>
            {variant === "customer" ? (
              <p className="mt-1 text-sm text-muted-foreground">{copy.customerBody}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.widthFeet > 0 && summary.lengthFeet > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground">
                <Ruler className="size-3 text-primary" aria-hidden />
                {copy.room} {summary.widthFeet}′ × {summary.lengthFeet}′
              </span>
            ) : null}
            {stats.map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground"
              >
                <stat.icon className="size-3 text-primary" aria-hidden />
                <span className="font-medium text-foreground tabular-nums">
                  {stat.value.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")}
                </span>
                {stat.label}
              </span>
            ))}
          </div>
        </div>

        {href || actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {href ? (
              <Button asChild variant="outline">
                <Link href={href}>
                  <PanelsTopLeft className="size-4" aria-hidden />
                  {copy.open}
                </Link>
              </Button>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

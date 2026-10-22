import Link from "next/link";
import { ArrowUpRight, PanelsTopLeft } from "lucide-react";
import { normalizeStudioDesign, type StudioDesignJson } from "@/data/studio";
import { BuildQuoteFromDesignButton } from "@/components/admin/studio-quote/build-quote-from-design-button";
import { Button } from "@/components/ui/button";
import { summarizeStudioDesign, toPlanThumbData } from "./design-summary";
import { StudioDesignViewer } from "./studio-design-viewer";
import { StudioDesignWants } from "./studio-design-wants";

/** Design review (viewer + "What they want") for a submitted event plan. */
export function StudioDesignReviewSection({
  design: rawDesign,
  designId,
  eventPlanId,
  existingQuoteId,
}: {
  design: StudioDesignJson;
  designId: string | null;
  eventPlanId: string;
  existingQuoteId: string | null;
}) {
  const design = normalizeStudioDesign(rawDesign);
  const summary = summarizeStudioDesign(design);
  const plan = toPlanThumbData({
    floor: design.room.floor,
    drapeRuns: design.drapeRuns,
    openings: design.openings,
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <PanelsTopLeft className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
              Studio design
            </p>
            <h2 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Design review
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {designId ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/studio/${designId}`}>
                  Studio lead
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            ) : null}
            <BuildQuoteFromDesignButton
              eventPlanId={eventPlanId}
              designId={designId ?? undefined}
              existingQuoteId={existingQuoteId}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <StudioDesignViewer
          design={design}
          plan={plan}
          editHref={designId ? `/admin/studio/${designId}/edit` : undefined}
          className="xl:sticky xl:top-4 xl:self-start"
        />
        <StudioDesignWants summary={summary} />
      </div>
    </section>
  );
}

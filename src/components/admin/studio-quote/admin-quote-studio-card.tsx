import Link from "next/link";
import { PanelsTopLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildQuoteFromDesignButton } from "@/components/admin/studio-quote/build-quote-from-design-button";
import { StudioDesignSummaryCard } from "@/components/admin/studio-quote/studio-design-summary-card";
import type { StudioQuoteDesignSummary } from "@/lib/studio-quote-converter";

/** Right-rail Studio card on the admin quote page. */
export function AdminQuoteStudioCard({
  summary,
  quoteId,
  estimateRequestId,
  opportunityRef,
}: {
  summary: StudioQuoteDesignSummary | null;
  quoteId: string;
  estimateRequestId: string;
  opportunityRef: string;
}) {
  if (summary) {
    return (
      <StudioDesignSummaryCard
        summary={summary}
        variant="admin"
        layout="stack"
        className="rounded-2xl"
        href={
          summary.kind === "studio_design"
            ? `/admin/studio/${summary.id}`
            : `/admin/event-plans/${summary.id}`
        }
        actions={
          <BuildQuoteFromDesignButton
            designId={summary.kind === "studio_design" ? summary.id : undefined}
            eventPlanId={summary.kind === "event_plan" ? summary.id : undefined}
          />
        }
      />
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(212,175,55,0.12),transparent_55%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <PanelsTopLeft className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Studio
            </p>
            <h2 className="font-heading text-base font-semibold leading-tight">
              Room design
            </h2>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild size="sm">
            <Link
              href={`/studio/new?quoteId=${quoteId}&estimateId=${estimateRequestId}&opportunityRef=${encodeURIComponent(opportunityRef)}`}
            >
              <Plus className="size-3.5" />
              Create
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/studio?quoteId=${quoteId}`}>Linked designs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

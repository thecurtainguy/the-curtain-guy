"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  CopyPlus,
  ExternalLink,
  FileText,
  Loader2,
  PackageCheck,
  Ruler,
  Sparkles,
  Tags,
} from "lucide-react";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  formatCadFromCents,
  formatQuoteQuantity,
  formatQuoteUnitPrice,
} from "@/data/quotes";
import {
  STUDIO_BOM_SECTIONS,
  STUDIO_BOM_SECTION_LABELS,
  type StudioBomSection,
} from "@/lib/studio-bom";
import type {
  StudioQuoteLine,
  StudioQuotePreviewPayload,
} from "@/lib/studio-quote-converter";
import { cn } from "@/lib/utils";
import { STUDIO_QUOTE_SECTION_ICONS } from "./studio-quote-section-meta";

export type BuildQuoteFromDesignButtonProps = {
  /** studio_designs.id to convert. */
  designId?: string;
  /** event_plan_submissions.id when converting a submitted plan. */
  eventPlanId?: string;
  /** Existing linked quote; the button then offers to open / rebuild it. */
  existingQuoteId?: string | null;
  className?: string;
};

type CreateResponse = {
  ok?: boolean;
  message?: string;
  quoteId?: string;
  existingQuoteId?: string | null;
};

function endpointFor(props: BuildQuoteFromDesignButtonProps): string | null {
  if (props.designId) return `/api/admin/studio/${props.designId}/quote`;
  if (props.eventPlanId) return `/api/admin/studio/${props.eventPlanId}/quote?kind=event_plan`;
  return null;
}

export function BuildQuoteFromDesignButton(props: BuildQuoteFromDesignButtonProps) {
  const { existingQuoteId, className } = props;
  const router = useRouter();
  const endpoint = endpointFor(props);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<"create" | "revision" | null>(null);
  const [preview, setPreview] = useState<StudioQuotePreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        preview?: StudioQuotePreviewPayload;
      };
      if (!response.ok || !payload.ok || !payload.preview) {
        setPreview(null);
        setError(payload.message ?? "Could not price this design.");
        return;
      }
      setPreview(payload.preview);
    } catch {
      setError("Could not price this design.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void loadPreview();
  }

  async function submit(mode: "create" | "revision") {
    if (!endpoint) return;
    setSubmitting(mode);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = (await response.json()) as CreateResponse;
      if (!response.ok || !payload.ok || !payload.quoteId) {
        const failure = payload.message ?? "Could not create the quote.";
        setError(failure);
        toast.error(failure);
        if (payload.existingQuoteId) void loadPreview();
        return;
      }
      toast.success(
        mode === "revision"
          ? "Revision created from design."
          : preview?.existingQuote?.fillable
            ? `${preview.existingQuote.displayRef} filled from design.`
            : "Draft quote created from design."
      );
      router.push(`/admin/quotes/${payload.quoteId}`);
    } catch {
      setError("Could not create the quote.");
      toast.error("Could not create the quote.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!endpoint) return null;

  const existing = preview?.existingQuote ?? null;
  const linkedQuoteId = existing?.id ?? existingQuoteId ?? null;
  const needsRevision = Boolean(existing && !existing.fillable);
  const busy = submitting !== null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button type="button" onClick={() => handleOpenChange(true)}>
        <Sparkles className="size-4" aria-hidden />
        Build quote
      </Button>
      {existingQuoteId ? (
        <Button asChild variant="outline">
          <Link href={`/admin/quotes/${existingQuoteId}`}>
            <FileText className="size-4" aria-hidden />
            Open quote
          </Link>
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <BrandDialogContent
          size="xl"
          icon={Sparkles}
          eyebrow="Studio → draft quote"
          title={preview ? `Build quote from “${preview.title}”` : "Build quote from design"}
          description="Every drape, treatment, light and piece of furniture becomes a line. Mapped options use catalog prices; everything else is added as “Not priced yet”."
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/studio/pricing">
                  <Tags className="size-4" aria-hidden />
                  Studio pricing
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {linkedQuoteId && (needsRevision || !preview) ? (
                  <Button asChild variant="outline">
                    <Link href={`/admin/quotes/${linkedQuoteId}`}>
                      <ExternalLink className="size-4" aria-hidden />
                      Open {existing?.displayRef ?? "quote"}
                    </Link>
                  </Button>
                ) : null}
                {needsRevision ? (
                  <Button
                    type="button"
                    disabled={!preview || busy}
                    onClick={() => void submit("revision")}
                  >
                    {submitting === "revision" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <CopyPlus className="size-4" aria-hidden />
                    )}
                    Create revision from design
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={!preview || busy}
                    onClick={() => void submit("create")}
                  >
                    {submitting === "create" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <FileText className="size-4" aria-hidden />
                    )}
                    {existing?.fillable ? `Fill ${existing.displayRef}` : "Create draft quote"}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {loading && !preview ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Pricing the design…
            </div>
          ) : null}

          {error ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}

          {preview ? <PreviewBody preview={preview} /> : null}
        </BrandDialogContent>
      </Dialog>
    </div>
  );
}

function PreviewBody({ preview }: { preview: StudioQuotePreviewPayload }) {
  const { summary, existingQuote } = preview;
  const bySection = new Map<StudioBomSection, StudioQuoteLine[]>();
  for (const line of preview.lines) {
    const list = bySection.get(line.section) ?? [];
    list.push(line);
    bySection.set(line.section, list);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Priced subtotal"
          value={formatCadFromCents(summary.pricedSubtotalCents)}
          tone="gold"
        />
        <StatTile label="Lines" value={String(summary.lineCount)} />
        <StatTile
          label="Priced · included"
          value={`${summary.pricedCount} · ${summary.includedCount}`}
        />
        <StatTile
          label="Need pricing"
          value={String(summary.notPricedCount + summary.flaggedCount)}
          tone={summary.notPricedCount + summary.flaggedCount > 0 ? "warn" : undefined}
        />
      </div>

      {existingQuote ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <FileText className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {existingQuote.displayRef} already exists
              </p>
              <p className="text-xs text-muted-foreground">
                {existingQuote.fillable
                  ? "It's an empty draft — these lines will be added to it."
                  : `${existingQuote.lineCount} lines · ${existingQuote.status}. Open it, or create a new revision rebuilt from this design.`}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {summary.notPricedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <Tags className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {summary.notPricedCount} line{summary.notPricedCount === 1 ? "" : "s"} not priced yet
              </p>
              <p className="text-xs text-muted-foreground">
                They&apos;ll be on the quote at $0 until you price them, or map the options to products first.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/studio/pricing">
              Map options
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}

      {STUDIO_BOM_SECTIONS.filter((section) => bySection.has(section)).map((section) => {
        const Icon = STUDIO_QUOTE_SECTION_ICONS[section];
        const lines = bySection.get(section) ?? [];
        return (
          <section
            key={section}
            className="overflow-hidden rounded-2xl border border-border/40 bg-card/25"
          >
            <header className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <h3 className="font-heading text-base font-semibold">
                {STUDIO_BOM_SECTION_LABELS[section]}
              </h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {lines.length} line{lines.length === 1 ? "" : "s"}
              </span>
            </header>
            <ul className="divide-y divide-border/30">
              {lines.map((line) => (
                <PreviewLine key={line.key} line={line} />
              ))}
            </ul>
          </section>
        );
      })}

      {summary.notes.length ? (
        <ul className="space-y-1.5 rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
          {summary.notes.map((note) => (
            <li key={note} className="flex items-start gap-2">
              <PackageCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        tone === "gold"
          ? "border-primary/40 bg-primary/10"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-border/40 bg-card/30"
      )}
    >
      <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-xl font-semibold tabular-nums",
          tone === "gold" ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

const STATE_BADGES: Record<
  StudioQuoteLine["state"],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  priced: {
    label: "Priced",
    className: "border-primary/40 bg-primary/10 text-primary",
    icon: CheckCircle2,
  },
  included: {
    label: "Included",
    className: "border-border/50 bg-muted/40 text-muted-foreground",
    icon: PackageCheck,
  },
  not_priced: {
    label: "Not priced yet",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    icon: CircleDashed,
  },
  flagged: {
    label: "To confirm",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    icon: Ruler,
  },
};

function PreviewLine({ line }: { line: StudioQuoteLine }) {
  const badge = STATE_BADGES[line.state];
  const BadgeIcon = badge.icon;
  const { item } = line;
  const statusLabel =
    line.state === "flagged" && item.status === "needs_venue_confirmation"
      ? "Venue to confirm"
      : line.state === "flagged"
        ? "Needs measurement"
        : badge.label;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-background/60">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary storage hosts
          <img src={item.image_url} alt="" className="size-full object-cover" />
        ) : line.swatchHex ? (
          <span
            className="size-6 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: line.swatchHex }}
            aria-hidden
          />
        ) : (
          <span className="size-2 rounded-full bg-primary/50" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground">{item.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatQuoteQuantity(item.quantity, item.unit_label)}
          </span>
          {line.state === "priced" || line.state === "flagged" ? (
            <span className="tabular-nums">
              {formatQuoteUnitPrice(item.unit_price_cents, item.unit_label)}
            </span>
          ) : null}
          {line.productName && line.state !== "included" ? (
            <span className="truncate">→ {line.productName}</span>
          ) : null}
        </div>
        {line.note ? (
          <p className="mt-1 text-xs text-muted-foreground/90">{line.note}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            badge.className
          )}
        >
          <BadgeIcon className="size-3" aria-hidden />
          {statusLabel}
        </span>
        {line.state === "priced" || line.state === "flagged" ? (
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatCadFromCents(line.lineTotalCents)}
          </span>
        ) : null}
      </div>
    </li>
  );
}

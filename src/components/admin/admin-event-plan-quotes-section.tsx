"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Link2, Loader2 } from "lucide-react";
import {
  formatMoneyFromCents,
  formatQuoteRevisionLabel,
  resolveQuoteDisplayRef,
  type QuoteRow,
} from "@/data/quotes";
import { SavedCard, SavedChip } from "@/components/admin/saved-view";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export function AdminEventPlanQuotesSection({
  eventPlanId,
  estimateId,
  quotes,
}: {
  eventPlanId: string;
  estimateId?: string | null;
  quotes: QuoteRow[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = quotes[0] ?? null;

  async function createQuote() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/quotes/create-from-event-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventPlanId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        quoteId?: string;
      };
      if (!response.ok || !payload.ok || !payload.quoteId) {
        const failure = payload.message ?? "Could not create quote.";
        setError(failure);
        toast.error(failure);
        return;
      }
      toast.success("Draft quote created.");
      router.push(`/admin/quotes/${payload.quoteId}`);
    } catch {
      setError("Could not create quote.");
      toast.error("Could not create quote.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <SavedCard
      icon={FileText}
      eyebrow={
        quotes.length === 0
          ? "No quote yet"
          : `${quotes.length} ${quotes.length === 1 ? "quote" : "quotes"}`
      }
      title="Quotes"
      aside={
        <div className="flex flex-wrap items-center gap-2">
          {estimateId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/estimates/${estimateId}`}>
                <Link2 className="size-3.5" />
                Linked estimate
              </Link>
            </Button>
          ) : null}
          {quotes.length === 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void createQuote()}
              disabled={creating}
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              Create Quote
            </Button>
          ) : null}
        </div>
      }
    >
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Turn this event plan into a draft quote with line items and tax.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
            {quotes.map((quote) => {
              const revLabel = formatQuoteRevisionLabel(quote.revision_number, {
                hideOriginal: true,
              });
              return (
                <li
                  key={quote.id}
                  className={cn(
                    "flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5",
                    quote.id === latest?.id && "bg-primary/[0.04]"
                  )}
                >
                  <Link
                    href={`/admin/quotes/${quote.id}`}
                    className="min-w-0 truncate text-sm font-medium text-primary hover:underline"
                  >
                    {resolveQuoteDisplayRef(quote)}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <QuoteStatusBadge status={quote.status} validUntil={quote.valid_until} />
                    {revLabel ? <SavedChip>{revLabel}</SavedChip> : null}
                    {quote.id === latest?.id && quotes.length > 1 ? (
                      <SavedChip tone="gold">Latest</SavedChip>
                    ) : null}
                  </div>
                  <span className="ml-auto text-sm font-semibold tabular-nums">
                    {formatMoneyFromCents(quote.total_cents, "en", quote.currency)}
                  </span>
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                    <Link href={`/admin/quotes/${quote.id}`}>Open</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            New revisions are created from the quote detail page.
          </p>
        </>
      )}
    </SavedCard>
  );
}

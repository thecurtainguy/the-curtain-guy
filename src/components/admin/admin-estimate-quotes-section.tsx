"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import {
  formatCadFromCents,
  formatQuoteRevisionLabel,
  resolveQuoteDisplayRef,
  type QuoteRow,
} from "@/data/quotes";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { Button } from "@/components/ui/button";

export function AdminEstimateQuotesSection({
  estimateId,
  quotes,
  linkedJobId,
  linkedJobRef,
}: {
  estimateId: string;
  quotes: QuoteRow[];
  linkedJobId?: string | null;
  linkedJobRef?: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = quotes[0] ?? null;

  async function createQuote() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/quotes/create-from-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateRequestId: estimateId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        quoteId?: string;
      };
      if (!response.ok || !payload.ok || !payload.quoteId) {
        setError(payload.message ?? "Could not create quote.");
        return;
      }
      router.push(`/admin/quotes/${payload.quoteId}`);
    } catch {
      setError("Could not create quote.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <FileText className="size-4" />
            </span>
            <h2 className="font-heading text-lg font-semibold">Quotes</h2>
          </div>
          {latest ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Latest</span>
              <QuoteStatusBadge status={latest.status} />
              <span className="tabular-nums text-foreground">
                {formatCadFromCents(latest.total_cents)}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No quote yet for this estimate.
            </p>
          )}
        </div>
        {quotes.length === 0 ? (
          <Button
            type="button"
            onClick={() => void createQuote()}
            disabled={creating}
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : null}
            Create Quote
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {linkedJobId ? (
        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-primary">Linked job</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Event {linkedJobRef ?? linkedJobId.slice(0, 8)}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/jobs/${linkedJobId}`}>Open job</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {quotes.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {quotes.map((quote) => (
            <li
              key={quote.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/40 px-3 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/quotes/${quote.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {resolveQuoteDisplayRef(quote)}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <QuoteStatusBadge status={quote.status} />
                  {(() => {
                    const revLabel = formatQuoteRevisionLabel(
                      quote.revision_number,
                      { hideOriginal: true }
                    );
                    return revLabel ? <span>{revLabel}</span> : null;
                  })()}
                  <span className="tabular-nums text-foreground">
                    {formatCadFromCents(quote.total_cents)}
                  </span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/quotes/${quote.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {quotes.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          New revisions are created from the quote detail page.
        </p>
      ) : null}
    </section>
  );
}

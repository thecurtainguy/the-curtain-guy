"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import type { QuoteStatus } from "@/data/quotes";
import { Button } from "@/components/ui/button";

export function AdminQuoteJobActions({
  quoteId,
  quoteStatus,
  existingJobId,
}: {
  quoteId: string;
  quoteStatus: QuoteStatus;
  existingJobId?: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (quoteStatus !== "accepted" && !existingJobId) {
    return null;
  }

  async function createJob() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/create-job`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        jobId?: string;
      };
      if (!response.ok || !payload.ok || !payload.jobId) {
        setError(payload.message ?? "Could not create job.");
        return;
      }
      router.push(`/admin/jobs/${payload.jobId}`);
    } catch {
      setError("Could not create job.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/30 to-card/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Booked event
            </p>
            <h2 className="mt-1 font-heading text-lg font-semibold text-foreground">
              {existingJobId ? "Job linked" : "Ready to create job"}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              {existingJobId
                ? "This accepted quote already has a booked event workflow."
                : "A draft job is usually created automatically on accept. Use this if one is missing."}
            </p>
          </div>
        </div>
        {existingJobId ? (
          <Button asChild>
            <Link href={`/admin/jobs/${existingJobId}`}>Open Job</Link>
          </Button>
        ) : (
          <Button type="button" onClick={() => void createJob()} disabled={creating}>
            {creating ? <Loader2 className="size-4 animate-spin" /> : null}
            Create Job
          </Button>
        )}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  MapPin,
  MessageSquare,
  PanelsTopLeft,
  Truck,
} from "lucide-react";
import {
  formatJobRef,
  getJobStatusLabel,
  JOB_STATUSES,
  type JobStatus,
} from "@/data/jobs";
import type { EventJobMessageRow } from "@/data/jobs";
import { QUOTE_CATEGORY_LABELS, formatCadFromCents } from "@/data/quotes";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { EstimateFilesList } from "@/components/estimates/estimate-files-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import type { JobWithRelations } from "@/lib/jobs";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FileListItem = {
  id: string;
  original_file_name: string;
  content_type: string;
  file_size_bytes: number;
  uploaded_at: string | null;
  upload_status: string;
};

export function CustomerEventDetail({
  job,
  quoteLineItems = [],
  estimateFiles = [],
}: {
  job: JobWithRelations;
  quoteLineItems?: JobWithRelations["quote_line_items"];
  estimateFiles?: FileListItem[];
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState(job.messages);

  const statusIndex = JOB_STATUSES.indexOf(job.status);

  async function sendMessage() {
    if (!message.trim()) return;
    setSending(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/account/jobs/${job.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: EventJobMessageRow;
      };
      if (!response.ok || !payload.ok || !payload.message) {
        setError("Could not send message. Please try again.");
        return;
      }
      setMessages((prev) => [...prev, payload.message!]);
      setMessage("");
      setFeedback("Message sent. Our team will follow up.");
    } catch {
      setError("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Your event"
        title={formatJobRef(job.opportunity_ref)}
        icon={CalendarDays}
        backHref="/account/events"
        backLabel="Your events"
        meta={<JobStatusBadge status={job.status} />}
      />

      <div className="grid gap-4 rounded-2xl border border-border/40 bg-card/20 p-5 sm:grid-cols-3">
          <div className="flex gap-3 rounded-2xl border border-border/40 bg-background/40 p-4">
            <Calendar className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Event date</p>
              <p className="mt-1 font-medium">{job.event_date || "To be confirmed"}</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-border/40 bg-background/40 p-4">
            <MapPin className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Venue</p>
              <p className="mt-1 font-medium">{job.venue_name || "To be confirmed"}</p>
              {job.venue_city ? (
                <p className="text-xs text-muted-foreground">{job.venue_city}</p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-border/40 bg-background/40 p-4">
            <Truck className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Install</p>
              <p className="mt-1 font-medium">
                {job.install_date
                  ? `${job.install_date}${job.install_start_time ? ` · ${job.install_start_time}` : ""}`
                  : "Scheduling in progress"}
              </p>
            </div>
          </div>
        </div>

      <section className="rounded-2xl border border-border/40 bg-card/20 p-5">
        <h2 className="font-heading text-lg font-semibold">Event progress</h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {(
            [
              "confirmed",
              "install_scheduled",
              "installed",
              "event_completed",
              "teardown_scheduled",
              "teardown_completed",
              "closed",
            ] as JobStatus[]
          ).map((step) => {
            const stepIdx = JOB_STATUSES.indexOf(step);
            const reached = statusIndex >= stepIdx && job.status !== "cancelled";
            return (
              <li
                key={step}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium ring-1",
                  reached
                    ? "bg-primary/15 text-primary ring-primary/30"
                    : "bg-muted/20 text-muted-foreground ring-border/40"
                )}
              >
                {getJobStatusLabel(step)}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-3xl border border-primary/25 bg-primary/[0.06] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <PanelsTopLeft className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                Studio
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold">
                Room design for production planning
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open your saved room designs or create one for this event.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link
                href={`/studio/new?jobId=${job.id}&opportunityRef=${encodeURIComponent(job.opportunity_ref)}${job.estimate_request_id ? `&estimateId=${job.estimate_request_id}` : ""}${job.quote_id ? `&quoteId=${job.quote_id}` : ""}`}
              >
                Draw your room
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/account/studio?jobId=${job.id}`}>
                Open room designs
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border/40 bg-card/20 p-5">
          <h2 className="font-heading text-lg font-semibold">Event details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Event type</dt>
              <dd className="font-medium">{job.event_type || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Guest count</dt>
              <dd className="font-medium">{job.guest_count ?? "—"}</dd>
            </div>
            {job.customer_visible_notes ? (
              <div>
                <dt className="text-muted-foreground">Notes from our team</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-2xl border border-border/40 bg-background/40 p-3">
                  {job.customer_visible_notes}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-3xl border border-border/40 bg-card/20 p-5">
          <h2 className="font-heading text-lg font-semibold">Teardown schedule</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Teardown date</dt>
              <dd className="font-medium">{job.teardown_date || "To be confirmed"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Window</dt>
              <dd className="font-medium">
                {[job.teardown_start_time, job.teardown_end_time].filter(Boolean).join(" – ") || "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {quoteLineItems && quoteLineItems.length > 0 ? (
        <section className="rounded-3xl border border-border/40 bg-card/20 p-5">
          <h2 className="font-heading text-lg font-semibold">What&apos;s included</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accepted proposal total{" "}
            {formatCadFromCents(job.accepted_quote_total_cents ?? 0)}
          </p>
          <ul className="mt-4 divide-y divide-border/40 rounded-2xl border border-border/40">
            {quoteLineItems
              .filter((item) => item.customer_visible)
              .map((item) => (
                <li key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {QUOTE_CATEGORY_LABELS[item.category]}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatCadFromCents(item.line_total_cents)}</p>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {estimateFiles.length > 0 ? (
        <section className="rounded-3xl border border-border/40 bg-card/20 p-5">
          <h2 className="font-heading text-lg font-semibold">Your uploads</h2>
          <div className="mt-4">
            <EstimateFilesList files={estimateFiles} />
          </div>
        </section>
      ) : null}

      {job.events.length > 0 ? (
        <section className="rounded-3xl border border-border/40 bg-card/20 p-5">
          <h2 className="font-heading text-lg font-semibold">Updates</h2>
          <ul className="mt-4 space-y-3">
            {job.events.map((event) => (
              <li key={event.id} className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm">
                <p className="font-medium">{event.title}</p>
                {event.body ? (
                  <p className="mt-1 text-muted-foreground">{event.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-3xl border border-border/40 bg-card/20 p-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Questions & updates</h2>
        </div>
        {messages.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border/40 bg-background/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {m.sender_role === "customer" ? "You" : "The Curtain Guy"} ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Share venue updates, timing questions, or detail changes…"
          />
          {feedback ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{feedback}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <LoadingButton
            type="button"
            onClick={() => void sendMessage()}
            isLoading={sending}
            loadingText="Sending..."
          >
            Send message
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  PanelsTopLeft,
  RotateCcw,
} from "lucide-react";
import {
  JOB_CHECKLIST_CATEGORY_LABELS,
  JOB_STATUSES,
  buildJobSummaryText,
  formatJobRef,
  getChecklistProgress,
  getJobStatusLabel,
  getNextJobStatuses,
  type JobStatus,
} from "@/data/jobs";
import { QUOTE_CATEGORY_LABELS, formatCadFromCents, resolveQuoteDisplayRef } from "@/data/quotes";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { EstimateFilesList } from "@/components/estimates/estimate-files-list";
import type { JobWithRelations } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

type FileListItem = {
  id: string;
  original_file_name: string;
  content_type: string;
  file_size_bytes: number;
  uploaded_at: string | null;
  upload_status: string;
};

export function AdminJobDetail({
  job: initialJob,
  estimateFiles = [],
}: {
  job: JobWithRelations;
  estimateFiles?: FileListItem[];
}) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);

  const [eventName, setEventName] = useState(job.event_name ?? "");
  const [eventType, setEventType] = useState(job.event_type ?? "");
  const [eventDate, setEventDate] = useState(toDateInput(job.event_date));
  const [eventStart, setEventStart] = useState(job.event_start_time ?? "");
  const [eventEnd, setEventEnd] = useState(job.event_end_time ?? "");
  const [guestCount, setGuestCount] = useState(
    job.guest_count != null ? String(job.guest_count) : ""
  );
  const [venueName, setVenueName] = useState(job.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(job.venue_address ?? "");
  const [venueCity, setVenueCity] = useState(job.venue_city ?? "");
  const [venueRegion, setVenueRegion] = useState(job.venue_region ?? "");
  const [venuePostal, setVenuePostal] = useState(job.venue_postal_code ?? "");
  const [venueCountry, setVenueCountry] = useState(job.venue_country ?? "Canada");

  const [installDate, setInstallDate] = useState(toDateInput(job.install_date));
  const [installStart, setInstallStart] = useState(job.install_start_time ?? "");
  const [installEnd, setInstallEnd] = useState(job.install_end_time ?? "");
  const [teardownDate, setTeardownDate] = useState(toDateInput(job.teardown_date));
  const [teardownStart, setTeardownStart] = useState(job.teardown_start_time ?? "");
  const [teardownEnd, setTeardownEnd] = useState(job.teardown_end_time ?? "");

  const [accessNotes, setAccessNotes] = useState(job.access_notes ?? "");
  const [loadingNotes, setLoadingNotes] = useState(job.loading_notes ?? "");
  const [parkingNotes, setParkingNotes] = useState(job.parking_notes ?? "");
  const [elevatorNotes, setElevatorNotes] = useState(job.elevator_notes ?? "");
  const [roomNotes, setRoomNotes] = useState(job.room_notes ?? "");
  const [productionNotes, setProductionNotes] = useState(job.production_notes ?? "");
  const [customerNotes, setCustomerNotes] = useState(job.customer_visible_notes ?? "");
  const [internalNotes, setInternalNotes] = useState(job.internal_notes ?? "");

  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [checklistBusy, setChecklistBusy] = useState<string | null>(null);
  const [messageBusy, setMessageBusy] = useState(false);
  const [ownerMessage, setOwnerMessage] = useState("");
  const [ownerMessageInternal, setOwnerMessageInternal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const checklistProgress = useMemo(
    () => getChecklistProgress(job.checklist_items),
    [job.checklist_items]
  );

  const nextStatuses = getNextJobStatuses(job.status);

  const groupedChecklist = useMemo(() => {
    const groups = new Map<string, JobWithRelations["checklist_items"]>();
    for (const item of job.checklist_items) {
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    }
    return [...groups.entries()];
  }, [job.checklist_items]);

  function flash(ok?: string, err?: string) {
    setMessage(ok ?? null);
    setError(err ?? null);
  }

  function buildPayload() {
    return {
      event_name: eventName || null,
      event_type: eventType || null,
      event_date: eventDate || null,
      event_start_time: eventStart || null,
      event_end_time: eventEnd || null,
      guest_count: guestCount ? Number.parseInt(guestCount, 10) : null,
      venue_name: venueName || null,
      venue_address: venueAddress || null,
      venue_city: venueCity || null,
      venue_region: venueRegion || null,
      venue_postal_code: venuePostal || null,
      venue_country: venueCountry || "Canada",
      install_date: installDate || null,
      install_start_time: installStart || null,
      install_end_time: installEnd || null,
      teardown_date: teardownDate || null,
      teardown_start_time: teardownStart || null,
      teardown_end_time: teardownEnd || null,
      access_notes: accessNotes || null,
      loading_notes: loadingNotes || null,
      parking_notes: parkingNotes || null,
      elevator_notes: elevatorNotes || null,
      room_notes: roomNotes || null,
      production_notes: productionNotes || null,
      customer_visible_notes: customerNotes || null,
      internal_notes: internalNotes || null,
    };
  }

  async function saveJob() {
    setSaving(true);
    flash();
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        job?: JobWithRelations;
      };
      if (!response.ok || !payload.ok) {
        flash(undefined, payload.message ?? "Could not save job.");
        return;
      }
      flash("Job saved.");
      router.refresh();
    } catch {
      flash(undefined, "Could not save job.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: JobStatus) {
    setStatusBusy(true);
    flash();
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        job?: JobWithRelations;
      };
      if (!response.ok || !payload.ok || !payload.job) {
        flash(undefined, payload.message ?? "Could not update status.");
        return;
      }
      setJob(payload.job);
      flash(`Status updated to ${getJobStatusLabel(status)}.`);
      router.refresh();
    } catch {
      flash(undefined, "Could not update status.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function toggleChecklist(itemId: string, complete: boolean) {
    setChecklistBusy(itemId);
    flash();
    try {
      const path = complete ? "complete" : "reopen";
      const response = await fetch(
        `/api/admin/jobs/${job.id}/checklist/${itemId}/${path}`,
        { method: "POST" }
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        job?: JobWithRelations;
      };
      if (!response.ok || !payload.ok || !payload.job) {
        flash(undefined, "Could not update checklist.");
        return;
      }
      setJob(payload.job);
    } catch {
      flash(undefined, "Could not update checklist.");
    } finally {
      setChecklistBusy(null);
    }
  }

  async function sendOwnerMessage() {
    if (!ownerMessage.trim()) return;
    setMessageBusy(true);
    flash();
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: ownerMessage,
          isInternal: ownerMessageInternal,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        job?: JobWithRelations;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.job) {
        flash(undefined, payload.message ?? "Could not send message.");
        return;
      }
      setJob(payload.job);
      setOwnerMessage("");
      flash("Message saved.");
    } catch {
      flash(undefined, "Could not send message.");
    } finally {
      setMessageBusy(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildJobSummaryText(job));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      flash(undefined, "Could not copy summary.");
    }
  }

  const customerMessages = job.messages.filter((m) => !m.is_internal);
  const internalMessages = job.messages.filter((m) => m.is_internal);
  const mailto = job.customer_email
    ? `mailto:${encodeURIComponent(job.customer_email)}?subject=${encodeURIComponent(`Your Curtain Guy event — ${job.opportunity_ref}`)}`
    : null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <Link
          href="/admin/jobs"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← All jobs
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Job detail
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {formatJobRef(job.opportunity_ref)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <JobStatusBadge status={job.status} />
              {job.event_date ? <span>{job.event_date}</span> : null}
              {job.venue_name ? <span>· {job.venue_name}</span> : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {job.customer_name || "—"} · {job.customer_email || "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveJob()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
            {job.quote_id ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/quotes/${job.quote_id}`}>Open quote</Link>
              </Button>
            ) : null}
            {job.estimate_request_id ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/estimates/${job.estimate_request_id}`}>
                  Open estimate
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/studio/new?jobId=${job.id}&opportunityRef=${encodeURIComponent(job.opportunity_ref)}${job.estimate_request_id ? `&estimateId=${job.estimate_request_id}` : ""}${job.quote_id ? `&quoteId=${job.quote_id}` : ""}`}
              >
                <PanelsTopLeft className="size-4" />
                Create room design
              </Link>
            </Button>
            {mailto ? (
              <Button asChild variant="outline" size="sm">
                <a href={mailto}>
                  <Mail className="size-4" />
                  Email
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void copySummary()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              Copy summary
            </Button>
          </div>
        </div>
      </header>

      {(message || error) && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
          <h2 className="font-heading text-lg font-semibold">Event details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="event_name">Event name</Label>
              <Input id="event_name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type">Event type</Label>
              <Input id="event_type" value={eventType} onChange={(e) => setEventType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Event date</Label>
              <Input id="event_date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_start">Start time</Label>
              <Input id="event_start" value={eventStart} onChange={(e) => setEventStart(e.target.value)} placeholder="e.g. 6:00 PM" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_end">End time</Label>
              <Input id="event_end" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} placeholder="e.g. 11:00 PM" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest_count">Guest count</Label>
              <Input id="guest_count" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
          <h2 className="font-heading text-lg font-semibold">Venue</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="venue_name">Venue name</Label>
              <Input id="venue_name" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="venue_address">Address</Label>
              <Input id="venue_address" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue_city">City</Label>
              <Input id="venue_city" value={venueCity} onChange={(e) => setVenueCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue_region">Region</Label>
              <Input id="venue_region" value={venueRegion} onChange={(e) => setVenueRegion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue_postal">Postal code</Label>
              <Input id="venue_postal" value={venuePostal} onChange={(e) => setVenuePostal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue_country">Country</Label>
              <Input id="venue_country" value={venueCountry} onChange={(e) => setVenueCountry(e.target.value)} />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Install & teardown schedule</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label>Install date</Label>
              <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Install start</Label>
              <Input value={installStart} onChange={(e) => setInstallStart(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Install end</Label>
              <Input value={installEnd} onChange={(e) => setInstallEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label>Teardown date</Label>
              <Input type="date" value={teardownDate} onChange={(e) => setTeardownDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teardown start</Label>
              <Input value={teardownStart} onChange={(e) => setTeardownStart(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Teardown end</Label>
              <Input value={teardownEnd} onChange={(e) => setTeardownEnd(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Venue & access notes</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[
            ["Access", accessNotes, setAccessNotes],
            ["Loading", loadingNotes, setLoadingNotes],
            ["Parking", parkingNotes, setParkingNotes],
            ["Elevator", elevatorNotes, setElevatorNotes],
            ["Room / areas", roomNotes, setRoomNotes],
          ].map(([label, value, setter]) => (
            <div key={label as string} className="space-y-2">
              <Label>{label as string}</Label>
              <Textarea
                value={value as string}
                onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                rows={3}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Production & notes</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Production notes (internal)</Label>
            <Textarea value={productionNotes} onChange={(e) => setProductionNotes(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Customer-visible notes</Label>
            <Textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Internal notes</Label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={4} />
          </div>
        </div>
      </section>

      {job.quote ? (
        <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">Accepted quote</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {resolveQuoteDisplayRef(job.quote)} ·{" "}
                {formatCadFromCents(job.accepted_quote_total_cents ?? job.quote.total_cents)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/quotes/${job.quote_id}`}>
                <ExternalLink className="size-4" />
                Open quote
              </Link>
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-border/40 rounded-2xl border border-border/40">
            {(job.quote_line_items || []).map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {QUOTE_CATEGORY_LABELS[item.category]}
                  </p>
                </div>
                <p className="tabular-nums text-foreground">
                  {formatCadFromCents(item.line_total_cents)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {estimateFiles.length > 0 ? (
        <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
          <h2 className="font-heading text-lg font-semibold">Estimate uploads</h2>
          <div className="mt-4">
            <EstimateFilesList files={estimateFiles} />
          </div>
        </section>
      ) : null}


      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Messages</h2>
        <div className="mt-4 space-y-4">
          {customerMessages.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
              <ul className="mt-2 space-y-2">
                {customerMessages.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-border/40 bg-background/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {m.sender_name || m.sender_role} · {new Date(m.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {internalMessages.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal</p>
              <ul className="mt-2 space-y-2">
                {internalMessages.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {m.sender_name || "Owner"} · {new Date(m.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="owner_message">Add message</Label>
            <Textarea
              id="owner_message"
              value={ownerMessage}
              onChange={(e) => setOwnerMessage(e.target.value)}
              rows={3}
              placeholder="Customer-visible update or internal note…"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={ownerMessageInternal}
                onChange={(e) => setOwnerMessageInternal(e.target.checked)}
              />
              Internal only (not visible to customer)
            </label>
            <Button type="button" onClick={() => void sendOwnerMessage()} disabled={messageBusy}>
              {messageBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Send message
            </Button>
          </div>
        </div>
      </section>


      </div>

      <aside className="space-y-6 xl:sticky xl:top-20">
<section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Status workflow</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current: {getJobStatusLabel(job.status)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === "cancelled" ? "outline" : "default"}
              disabled={statusBusy}
              onClick={() => void changeStatus(status)}
            >
              {statusBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {status === "cancelled" ? "Cancel job" : `Mark ${getJobStatusLabel(status)}`}
            </Button>
          ))}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Set status manually
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {JOB_STATUSES.map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={job.status === status ? "default" : "outline"}
                disabled={statusBusy || job.status === status}
                onClick={() => void changeStatus(status)}
              >
                {getJobStatusLabel(status)}
              </Button>
            ))}
          </div>
        </details>
      </section>


      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Links</h2>
        <div className="mt-3 flex flex-col gap-2">
          {job.quote_id ? (
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href={`/admin/quotes/${job.quote_id}`}>Open quote</Link>
            </Button>
          ) : null}
          {job.estimate_request_id ? (
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href={`/admin/estimates/${job.estimate_request_id}`}>
                Open estimate
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`/admin/studio?jobId=${job.id}`}>
              <PanelsTopLeft className="size-4" />
              Open Studio designs
            </Link>
          </Button>
          <div className="rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Checklist</p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {checklistProgress.completed}/{checklistProgress.total}
            </p>
          </div>
        </div>
      </section>


<section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Planning checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {checklistProgress.completed} of {checklistProgress.total} complete
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-6">
          {groupedChecklist.map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                {JOB_CHECKLIST_CATEGORY_LABELS[category as keyof typeof JOB_CHECKLIST_CATEGORY_LABELS] ?? category}
              </p>
              <ul className="mt-2 space-y-2">
                {[...items]
                  .sort((a, b) => Number(b.is_required) - Number(a.is_required) || a.sort_order - b.sort_order)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-background/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {item.is_completed ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <span className="size-4 rounded-full border border-border" />
                        )}
                        <span className={cn("text-sm", item.is_completed && "text-muted-foreground line-through")}>
                          {item.label}
                          {item.is_required ? (
                            <span className="ml-2 text-[10px] uppercase text-primary">Required</span>
                          ) : null}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={checklistBusy === item.id}
                        onClick={() =>
                          void toggleChecklist(item.id, !item.is_completed)
                        }
                      >
                        {checklistBusy === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : item.is_completed ? (
                          <RotateCcw className="size-4" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {item.is_completed ? "Reopen" : "Complete"}
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

<section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Activity timeline</h2>
        <ul className="mt-4 space-y-3">
          {job.events.length === 0 ? (
            <li className="text-sm text-muted-foreground">No activity yet.</li>
          ) : (
            job.events.map((event) => (
              <li key={event.id} className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">{event.title}</p>
                  {event.customer_visible ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
                      Customer visible
                    </span>
                  ) : null}
                </div>
                {event.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{event.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
      </aside>
      </div>

    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Handshake,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Users,
} from "lucide-react";
import type { QuoteStatus } from "@/data/quotes";
import { Button } from "@/components/ui/button";
import { BrandDialogContent, BrandDialogSection } from "@/components/ui/brand-dialog";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate } from "@/data/invoices";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "in_person", label: "In person", icon: Users },
  { id: "other", label: "Other", icon: MessageSquare },
] as const;

type ChannelId = (typeof CHANNELS)[number]["id"];

export function AdminQuoteJobActions({
  quoteId,
  quoteStatus,
  existingJobId,
  customerName,
}: {
  quoteId: string;
  quoteStatus: QuoteStatus;
  existingJobId?: string | null;
  customerName?: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const accepted = quoteStatus === "accepted";
  const canMarkAccepted = !accepted && quoteStatus !== "cancelled";

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

  async function createInvoice() {
    if (!existingJobId) return;
    setCreatingInvoice(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/jobs/${existingJobId}/invoices`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        invoiceId?: string;
      };
      if (!response.ok || !payload.ok || !payload.invoiceId) {
        setError(payload.message ?? "Could not create invoice.");
        return;
      }
      router.push(`/admin/invoices/${payload.invoiceId}`);
    } catch {
      setError("Could not create invoice.");
    } finally {
      setCreatingInvoice(false);
    }
  }

  if (!accepted && !existingJobId && !canMarkAccepted) return null;

  return (
    <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/30 to-card/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            {existingJobId || accepted ? (
              <CalendarDays className="size-5" />
            ) : (
              <Handshake className="size-5" />
            )}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Booked event
            </p>
            <h2 className="mt-1 font-heading text-lg font-semibold text-foreground">
              {existingJobId
                ? "Job linked"
                : accepted
                  ? "Ready to create job"
                  : "Client said yes outside the portal?"}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              {existingJobId
                ? "Open the job to schedule install, then issue the invoice and track the deposit."
                : accepted
                  ? "A draft job is usually created automatically on accept. Use this if one is missing."
                  : "Record an acceptance received by email, phone, or in person. The quote becomes accepted and a job is created."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {existingJobId ? (
            <>
              <LoadingButton
                type="button"
                variant="outline"
                isLoading={creatingInvoice}
                loadingText="Creating"
                icon={<Receipt className="size-4" />}
                onClick={() => void createInvoice()}
              >
                Create invoice
              </LoadingButton>
              <Button asChild>
                <Link href={`/admin/jobs/${existingJobId}`}>Open Job</Link>
              </Button>
            </>
          ) : accepted ? (
            <Button type="button" onClick={() => void createJob()} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              Create Job
            </Button>
          ) : (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Check className="size-4" />
              Mark accepted
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {dialogOpen ? (
        <MarkAcceptedDialog
          quoteId={quoteId}
          defaultName={customerName ?? ""}
          onOpenChange={setDialogOpen}
          onDone={(jobId) => {
            setDialogOpen(false);
            if (jobId) router.push(`/admin/jobs/${jobId}`);
            else router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function MarkAcceptedDialog({
  quoteId,
  defaultName,
  onOpenChange,
  onDone,
}: {
  quoteId: string;
  defaultName: string;
  onOpenChange: (open: boolean) => void;
  onDone: (jobId: string | null) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [acceptedOn, setAcceptedOn] = useState(todayIsoDate());
  const [channel, setChannel] = useState<ChannelId>("email");
  const [note, setNote] = useState("");
  const [createJob, setCreateJob] = useState(true);
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/mark-accepted`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptedByName: name,
          acceptedOn,
          channel,
          note,
          createJob,
          sendConfirmation,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        jobId?: string | null;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not mark accepted.");
        return;
      }
      onDone(payload.jobId ?? null);
    } catch {
      setError("Could not mark accepted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="md"
        icon={Handshake}
        eyebrow="Offline acceptance"
        title="Mark quote accepted"
        description="Logged on the quote timeline as recorded by you."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              isLoading={busy}
              loadingText="Saving"
              icon={<Check className="size-4" />}
              onClick={() => void submit()}
            >
              {createJob ? "Accept & create job" : "Mark accepted"}
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-5">
          <BrandDialogSection label="How did they accept?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CHANNELS.map((option) => {
                const Icon = option.icon;
                const selected = channel === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setChannel(option.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-sm transition-colors",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-2 right-2 flex size-4 items-center justify-center rounded-full border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70"
                      )}
                    >
                      {selected ? <Check className="size-2.5" /> : null}
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </BrandDialogSection>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="accepted-name">Accepted by</Label>
              <Input id="accepted-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accepted-on">Date accepted</Label>
              <DateInput id="accepted-on" value={acceptedOn} onChange={setAcceptedOn} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accepted-note">Note (optional)</Label>
            <Textarea
              id="accepted-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Confirmed by reply email on Oct 25"
            />
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={createJob}
                onChange={(e) => setCreateJob(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Create the job now</span>
                <span className="block text-xs text-muted-foreground">
                  Opens the booked-event workflow where you issue the invoice.
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5",
                !createJob && "opacity-50"
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={sendConfirmation && createJob}
                disabled={!createJob}
                onChange={(e) => setSendConfirmation(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Email the client a booking confirmation</span>
                <span className="block text-xs text-muted-foreground">
                  Off by default since you already confirmed by email.
                </span>
              </span>
            </label>
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}

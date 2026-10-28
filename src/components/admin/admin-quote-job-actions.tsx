"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Handshake,
  Languages,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Send,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canMarkQuoteAccepted, type QuoteStatus } from "@/data/quotes";
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

type ChannelOption = { id: string; label: string; icon: LucideIcon };

const ACCEPT_CHANNELS = [
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "in_person", label: "In person", icon: Users },
  { id: "other", label: "Other", icon: MessageSquare },
] as const satisfies readonly ChannelOption[];

const AGREEMENT_LANGUAGES = [
  { id: "fr", label: "Français", icon: Languages },
  { id: "en", label: "English", icon: Languages },
] as const satisfies readonly ChannelOption[];

const SENT_CHANNELS = [
  { id: "email", label: "Email", icon: Mail },
  { id: "text", label: "Text", icon: Smartphone },
  { id: "in_person", label: "In person", icon: Users },
  { id: "other", label: "Other", icon: MessageSquare },
] as const satisfies readonly ChannelOption[];

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
  const [sentDialogOpen, setSentDialogOpen] = useState(false);

  const accepted = quoteStatus === "accepted";
  const isDraft = quoteStatus === "draft";
  const canMarkAccepted = canMarkQuoteAccepted(quoteStatus);

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

  if (!accepted && !existingJobId && !canMarkAccepted && !isDraft) return null;

  return (
    <>
      {existingJobId ? (
        <>
          <Button asChild size="sm">
            <Link href={`/admin/jobs/${existingJobId}`}>
              <CalendarDays className="size-4" />
              Open job
            </Link>
          </Button>
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            isLoading={creatingInvoice}
            loadingText="Creating"
            icon={<Receipt className="size-4" />}
            onClick={() => void createInvoice()}
          >
            Invoice
          </LoadingButton>
        </>
      ) : accepted ? (
        <Button
          type="button"
          className="col-span-2"
          onClick={() => void createJob()}
          disabled={creating}
          title="A job is usually created on accept. Use this if one is missing."
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
          Create job
        </Button>
      ) : isDraft ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSentDialogOpen(true)}
            title="You delivered the quote yourself (own email, text, in person)"
          >
            <Send className="size-4" />
            Mark sent
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            <Handshake className="size-4" />
            Mark accepted
          </Button>
          <p className="col-span-2 text-[11px] leading-snug text-muted-foreground">
            Mark accepted unlocks once the customer has the quote: send it, or mark it sent if you
            delivered it yourself.
          </p>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="col-span-2"
          onClick={() => setDialogOpen(true)}
          title="Client said yes by email, phone, or in person"
        >
          <Handshake className="size-4" />
          Mark accepted
        </Button>
      )}
      {error ? (
        <p className="col-span-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {sentDialogOpen ? (
        <MarkSentDialog
          quoteId={quoteId}
          onOpenChange={setSentDialogOpen}
          onDone={() => {
            setSentDialogOpen(false);
            router.refresh();
          }}
        />
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
    </>
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
  const [channel, setChannel] = useState<string>("email");
  const [note, setNote] = useState("");
  const [language, setLanguage] = useState<string>("fr");
  const [frenchVersionSent, setFrenchVersionSent] = useState(false);
  const [createJob, setCreateJob] = useState(true);
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (language === "en" && !frenchVersionSent) {
      setError("Confirm the French version was sent before recording English.");
      return;
    }
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
          language,
          frenchVersionSent: language === "en" ? frenchVersionSent : undefined,
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
            <ChannelPicker options={ACCEPT_CHANNELS} value={channel} onChange={setChannel} />
          </BrandDialogSection>

          <BrandDialogSection label="Agreement language">
            <ChannelPicker
              options={AGREEMENT_LANGUAGES}
              value={language}
              onChange={setLanguage}
              className="sm:grid-cols-2"
            />
            {language === "en" ? (
              <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={frenchVersionSent}
                  onChange={(e) => setFrenchVersionSent(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-medium">The French version was sent first</span>
                  <span className="block text-xs text-muted-foreground">
                    Both versions reached the client, and they expressly chose English.
                  </span>
                </span>
              </label>
            ) : null}
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

function ChannelPicker({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly ChannelOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
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
  );
}

function MarkSentDialog({
  quoteId,
  onOpenChange,
  onDone,
}: {
  quoteId: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [sentOn, setSentOn] = useState(todayIsoDate());
  const [channel, setChannel] = useState<string>("email");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/mark-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentOn, channel, note }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not mark the quote as sent.");
        return;
      }
      onDone();
    } catch {
      setError("Could not mark the quote as sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="md"
        icon={Send}
        eyebrow="Sent outside the system"
        title="Mark quote as sent"
        description="No email goes out. The quote moves to Sent and the timeline notes how you delivered it."
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
              Mark sent
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-5">
          <BrandDialogSection label="How did you send it?">
            <ChannelPicker options={SENT_CHANNELS} value={channel} onChange={setChannel} />
          </BrandDialogSection>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sent-on">Date sent</Label>
              <DateInput id="sent-on" value={sentOn} onChange={setSentOn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sent-note">Note (optional)</Label>
              <Input
                id="sent-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. PDF emailed from Gmail"
              />
            </div>
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

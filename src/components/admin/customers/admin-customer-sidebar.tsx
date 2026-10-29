"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  History,
  KeyRound,
  Languages,
  ListChecks,
  ListFilter,
  MailPlus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { useBrandConfirm } from "@/components/ui/brand-dialog";
import { CUSTOMER_LANGUAGE_LABELS, type CustomerLanguage } from "@/data/customer-language";
import type { CustomerEventRow, CustomerRow } from "@/data/customers";
import type { CustomerPortalStatus } from "@/lib/customers";
import { CustomerPanel } from "@/components/admin/customers/customer-panel";
import { readJson } from "@/components/admin/customers/customer-ui";
import { cn } from "@/lib/utils";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminCustomerPortalCard({
  customer,
  portal,
}: {
  customer: CustomerRow;
  portal: CustomerPortalStatus;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [confirm, confirmDialog] = useBrandConfirm();

  async function invite() {
    const ok = await confirm({
      eyebrow: "Client portal",
      title: portal.hasAccount ? "Send a sign-in reminder?" : "Invite to the client portal?",
      description: `We'll email ${customer.primary_email} in ${CUSTOMER_LANGUAGE_LABELS[customer.preferred_language]} with a link to ${portal.hasAccount ? "sign in" : "create their account"}. Their quotes, jobs and invoices appear automatically once they're in.`,
      icon: MailPlus,
      confirmLabel: "Send invitation",
    });
    if (!ok) return;
    setSending(true);
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/invite`, { method: "POST" });
      const json = await readJson(response);
      if (!response.ok || !json.ok) {
        toast.error(json.message ?? "Could not send the invitation.");
        return;
      }
      toast.success(json.message ?? `Invitation sent to ${customer.primary_email}.`);
      router.refresh();
    } catch {
      toast.error("Could not send the invitation.");
    } finally {
      setSending(false);
    }
  }

  return (
    <CustomerPanel icon={KeyRound} eyebrow="Portal" title="Client portal access">
      {confirmDialog}
      <div className="space-y-4">
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4",
            portal.hasAccount ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card/40"
          )}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              portal.hasAccount ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
            )}
          >
            {portal.hasAccount ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-medium">{portal.hasAccount ? "Has a portal account" : "No portal account yet"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {portal.hasAccount
                ? `Last sign-in ${formatDateTime(portal.lastSignInAt)}${portal.emailConfirmed ? "" : " · email not confirmed"}`
                : portal.invitedAt
                  ? `Invited ${formatDateTime(portal.invitedAt)}`
                  : "They can see quotes, jobs and invoices once they sign up."}
            </p>
            {portal.hasAccount && portal.email && portal.email !== customer.primary_email ? (
              <p className="mt-1 text-xs text-muted-foreground">Signs in as {portal.email}</p>
            ) : null}
          </div>
        </div>
        <LoadingButton
          variant="outline"
          className="w-full"
          onClick={() => void invite()}
          isLoading={sending}
          loadingText="Sending…"
          icon={<MailPlus className="size-4" />}
        >
          {portal.hasAccount ? "Send sign-in link" : portal.invitedAt ? "Resend invitation" : "Invite to portal"}
        </LoadingButton>
      </div>
    </CustomerPanel>
  );
}

export function AdminCustomerStatementCard({
  customer,
  invoiceCount,
}: {
  customer: CustomerRow;
  invoiceCount: number;
}) {
  const [scope, setScope] = useState<"open" | "all">("open");
  const [language, setLanguage] = useState<CustomerLanguage>(customer.preferred_language);
  const base = `/api/admin/customers/${customer.id}/statement?lang=${language}&scope=${scope}`;

  return (
    <CustomerPanel
      icon={FileSpreadsheet}
      eyebrow="Statement"
      title="Statement of account"
      description="One PDF with every invoice, payment and balance — handy for AP departments."
    >
      <div className="space-y-3">
        <div className="grid gap-2">
          <OptionCard
            option={{ id: "open", label: "Open balance", description: "Only invoices with money owing", icon: ListFilter }}
            selected={scope === "open"}
            onSelect={() => setScope("open")}
          />
          <OptionCard
            option={{ id: "all", label: "Full history", description: "All invoices and payments", icon: ListChecks }}
            selected={scope === "all"}
            onSelect={() => setScope("all")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["en", "fr"] as const).map((lang) => (
            <OptionCard
              key={lang}
              option={{ id: lang, label: CUSTOMER_LANGUAGE_LABELS[lang], icon: Languages }}
              selected={language === lang}
              onSelect={() => setLanguage(lang)}
            />
          ))}
        </div>
        {invoiceCount === 0 ? (
          <p className="text-xs text-muted-foreground">No invoices yet — the statement will be empty.</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a href={base} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Preview
            </a>
          </Button>
          <Button asChild>
            <a href={`${base}&download=1`}>
              <Download className="size-4" />
              Download
            </a>
          </Button>
        </div>
      </div>
    </CustomerPanel>
  );
}

export function AdminCustomerAccountActions({
  customer,
  linkedRecordCount,
}: {
  customer: CustomerRow;
  linkedRecordCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useBrandConfirm();
  const archived = customer.status === "archived";

  function fail(message: string) {
    setError(message);
    toast.error(message);
  }

  async function toggleArchive() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: archived ? "active" : "archived" }),
      });
      const json = await readJson(response);
      if (!response.ok || !json.ok) {
        fail(json.message ?? "Could not update.");
        return;
      }
      toast.success(archived ? `${customer.display_name} restored.` : `${customer.display_name} archived.`);
      router.refresh();
    } catch {
      fail("Could not update.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete ${customer.display_name}?`,
      description: "This removes the profile, contacts and venues. It can't be undone.",
      confirmLabel: "Delete customer",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, { method: "DELETE" });
      const json = await readJson(response);
      if (!response.ok || !json.ok) {
        fail(json.message ?? "Could not delete.");
        return;
      }
      toast.success(`${customer.display_name} deleted.`);
      router.push("/admin/customers");
      router.refresh();
    } catch {
      fail("Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {confirmDialog}
      <Button variant="outline" className="w-full" disabled={busy} onClick={() => void toggleArchive()}>
        {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
        {archived ? "Restore customer" : "Archive customer"}
      </Button>
      {linkedRecordCount === 0 ? (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-destructive"
          disabled={busy}
          onClick={() => void remove()}
        >
          <Trash2 className="size-4" />
          Delete customer
        </Button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Customers with history can be archived, not deleted.
        </p>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function AdminCustomerActivity({ events }: { events: CustomerEventRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? events : events.slice(0, 8);
  return (
    <CustomerPanel icon={History} eyebrow="Audit trail" title="Activity">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border/50 pl-4">
          {visible.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 flex size-2.5 items-center justify-center rounded-full bg-primary/60 ring-4 ring-background" />
              <p className="text-sm">{event.summary}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(event.created_at)}
                {event.actor_email ? ` · ${event.actor_email}` : event.actor_type !== "owner" ? ` · ${event.actor_type}` : ""}
              </p>
              <ChangeList metadata={event.metadata} />
            </li>
          ))}
        </ol>
      )}
      {events.length > 8 ? (
        <button
          type="button"
          className="mt-4 text-xs text-primary hover:underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show less" : `Show all ${events.length}`}
        </button>
      ) : null}
    </CustomerPanel>
  );
}

function ChangeList({ metadata }: { metadata: Record<string, unknown> }) {
  const changes = Array.isArray(metadata?.changes)
    ? (metadata.changes as Array<{ label?: string; field?: string; from?: unknown; to?: unknown }>)
    : [];
  if (!changes.length) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
      {changes.slice(0, 6).map((change, i) => (
        <li key={i} className="flex flex-wrap items-center gap-1">
          <CheckCircle2 className="size-3 text-primary/70" />
          <span className="text-foreground/80">{change.label ?? change.field}:</span>
          <span className="line-through opacity-70">{String(change.from ?? "—") || "—"}</span>
          <span>→</span>
          <span>{String(change.to ?? "—") || "—"}</span>
        </li>
      ))}
    </ul>
  );
}

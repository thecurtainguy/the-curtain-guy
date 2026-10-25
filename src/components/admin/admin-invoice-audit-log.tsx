"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown,
  Eye,
  FilePlus2,
  Link2,
  PencilLine,
  RefreshCcw,
  Send,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  INVOICE_ACTOR_LABELS,
  readInvoiceFieldChanges,
  type InvoiceEventRow,
} from "@/data/invoices";
import { formatCadFromCents } from "@/data/quotes";
import { cn } from "@/lib/utils";

type FilterId = "all" | "edits" | "money" | "client" | "status";

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "edits", label: "Edits" },
  { id: "money", label: "Payments" },
  { id: "client", label: "Sent & viewed" },
  { id: "status", label: "Status" },
];

function eventGroup(type: string): Exclude<FilterId, "all"> {
  if (type === "invoice_edited" || type === "synced_from_job" || type === "invoice_created" || type === "invoice_deleted") return "edits";
  if (type.includes("payment") || type.includes("refund") || type === "marked_unpaid") return "money";
  if (type === "invoice_sent" || type === "invoice_viewed" || type === "pdf_downloaded" || type === "link_issued") return "client";
  return "status";
}

function eventIcon(type: string): LucideIcon {
  if (type === "invoice_created") return FilePlus2;
  if (type === "invoice_deleted") return Trash2;
  if (type === "invoice_edited") return PencilLine;
  if (type === "synced_from_job") return RefreshCcw;
  if (type === "invoice_sent") return Send;
  if (type === "invoice_viewed" || type === "pdf_downloaded") return Eye;
  if (type === "link_issued") return Link2;
  if (eventGroup(type) === "money") return Banknote;
  return ShieldCheck;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function PaymentDetails({ payment }: { payment: Record<string, unknown> }) {
  const rows: Array<[string, string]> = [];
  if (typeof payment.amount_cents === "number") rows.push(["Amount", formatCadFromCents(payment.amount_cents)]);
  if (payment.kind) rows.push(["Type", String(payment.kind)]);
  if (payment.paid_on) rows.push(["Paid on", String(payment.paid_on)]);
  if (payment.method) rows.push(["Method", String(payment.method)]);
  if (payment.reference) rows.push(["Reference", String(payment.reference)]);
  if (payment.note) rows.push(["Note", String(payment.note)]);
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EventDetails({ event }: { event: InvoiceEventRow }) {
  const meta = event.metadata ?? {};
  const changes = [...readInvoiceFieldChanges(meta)];
  const kept = readInvoiceFieldChanges({ changes: meta.kept_invoice_values });
  const added = asStrings(meta.lines_added);
  const removed = asStrings(meta.lines_removed);
  const recipients = asStrings(meta.to);
  const cc = asStrings(meta.cc);
  const bcc = asStrings(meta.bcc);
  const removedPayments = Array.isArray(meta.payments) ? (meta.payments as Array<Record<string, unknown>>) : [];
  const snapshotLines = event.event_type === "invoice_deleted" ? asStrings(meta.line_items) : [];
  const isPayment = typeof meta.amount_cents === "number" && "payment_id" in meta;

  const hasDetails =
    changes.length || kept.length || added.length || removed.length || recipients.length ||
    removedPayments.length || snapshotLines.length || isPayment ||
    (typeof meta.from === "string" && typeof meta.to === "string");
  if (!hasDetails) return <p className="text-muted-foreground">No extra details recorded.</p>;

  return (
    <div className="space-y-3">
      {changes.length > 0 ? (
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="pb-1 pr-3 font-medium">Field</th>
              <th className="pb-1 pr-3 font-medium">Before</th>
              <th className="pb-1 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c, index) => (
              <tr key={`${c.field}-${index}`} className="border-t border-border/30 align-top">
                <td className="py-1 pr-3 font-medium">{c.label}</td>
                <td className="py-1 pr-3 text-muted-foreground line-through decoration-destructive/50 whitespace-pre-line break-words">{c.from ?? "—"}</td>
                <td className="py-1 whitespace-pre-line break-words">{c.to ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {kept.length > 0 ? (
        <div>
          <p className="mb-1 font-medium">Not applied (invoice has its own value)</p>
          {kept.map((c) => (
            <p key={c.field} className="text-muted-foreground">
              {c.label}: invoice keeps “{c.from ?? "—"}”, job now “{c.to ?? "—"}”
            </p>
          ))}
        </div>
      ) : null}
      {added.length > 0 ? (
        <div>
          <p className="mb-1 font-medium text-emerald-400">Lines added</p>
          {added.map((line, i) => <p key={`a-${i}`}>+ {line}</p>)}
        </div>
      ) : null}
      {removed.length > 0 ? (
        <div>
          <p className="mb-1 font-medium text-destructive">Lines removed</p>
          {removed.map((line, i) => <p key={`r-${i}`} className="text-muted-foreground">− {line}</p>)}
        </div>
      ) : null}
      {snapshotLines.length > 0 ? (
        <div>
          <p className="mb-1 font-medium">Lines at deletion</p>
          {snapshotLines.map((line, i) => <p key={`s-${i}`} className="text-muted-foreground">{line}</p>)}
        </div>
      ) : null}
      {isPayment ? <PaymentDetails payment={meta} /> : null}
      {removedPayments.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium">Payments removed</p>
          {removedPayments.map((p, i) => (
            <div key={`p-${i}`} className="rounded-lg border border-border/30 p-2">
              <PaymentDetails payment={p} />
            </div>
          ))}
        </div>
      ) : null}
      {recipients.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt className="text-muted-foreground">To</dt>
          <dd className="break-words">{recipients.join(", ")}</dd>
          {cc.length ? (<><dt className="text-muted-foreground">Cc</dt><dd className="break-words">{cc.join(", ")}</dd></>) : null}
          {bcc.length ? (<><dt className="text-muted-foreground">Bcc</dt><dd className="break-words">{bcc.join(", ")}</dd></>) : null}
          {meta.subject ? (<><dt className="text-muted-foreground">Subject</dt><dd className="break-words">{String(meta.subject)}</dd></>) : null}
          <dt className="text-muted-foreground">PDF</dt>
          <dd>{meta.attach_pdf === false ? "Not attached" : "Attached"}</dd>
        </dl>
      ) : null}
      {typeof meta.from === "string" && typeof meta.to === "string" ? (
        <p className="text-muted-foreground">
          {meta.from.replaceAll("_", " ")} → {meta.to.replaceAll("_", " ")}
        </p>
      ) : null}
    </div>
  );
}

export function AdminInvoiceAuditLog({
  events,
  showInvoice = false,
  hideFilters = false,
  emptyText = "No activity yet.",
  maxHeightClass = "max-h-[32rem]",
}: {
  events: InvoiceEventRow[];
  showInvoice?: boolean;
  hideFilters?: boolean;
  emptyText?: string;
  maxHeightClass?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = useMemo(
    () => (filter === "all" ? events : events.filter((e) => eventGroup(e.event_type) === filter)),
    [events, filter]
  );

  return (
    <div className="space-y-3">
      <div className={cn("flex flex-wrap gap-1.5", hideFilters && "hidden")}>
        {FILTERS.map((f) => {
          const count = f.id === "all" ? events.length : events.filter((e) => eventGroup(e.event_type) === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                filter === f.id ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"
              )}
            >
              {f.label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className={cn("space-y-2 overflow-y-auto pr-1", maxHeightClass)}>
          {visible.map((event) => {
            const Icon = eventIcon(event.event_type);
            const open = openId === event.id;
            return (
              <li key={event.id} className="rounded-xl border border-border/30 bg-background/30">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : event.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">{event.summary}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                      {" · "}
                      {INVOICE_ACTOR_LABELS[event.actor_type] ?? event.actor_type}
                      {event.actor_email ? ` · ${event.actor_email}` : ""}
                      {showInvoice && event.invoice_number ? ` · ${event.invoice_number}` : ""}
                    </span>
                  </span>
                  <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>
                {open ? (
                  <div className="border-t border-border/30 px-3 py-2.5 pl-13 text-xs">
                    <EventDetails event={event} />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {event.event_type.replaceAll("_", " ")}
                      {showInvoice && event.invoice_id ? (
                        <>
                          {" · "}
                          <Link href={`/admin/invoices/${event.invoice_id}`} className="text-primary hover:underline">
                            Open invoice
                          </Link>
                        </>
                      ) : showInvoice && !event.invoice_id ? " · invoice deleted" : null}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

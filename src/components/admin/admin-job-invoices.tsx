"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Receipt } from "lucide-react";
import {
  computeAmountDue,
  type InvoiceRow,
} from "@/data/invoices";
import { formatMoneyFromCents } from "@/data/quotes";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";

export function AdminJobInvoices({
  jobId,
  invoices,
}: {
  jobId: string;
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createInvoice() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/invoices`, { method: "POST" });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        invoiceId?: string;
      };
      if (!response.ok || !payload.ok || !payload.invoiceId) {
        const message = payload.message ?? "Could not create invoice.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Draft invoice created.");
      router.push(`/admin/invoices/${payload.invoiceId}`);
    } catch {
      setError("Could not create invoice.");
      toast.error("Could not create invoice.");
    } finally {
      setBusy(false);
    }
  }

  const hasActive = invoices.some((inv) => inv.status !== "void");

  return (
    <section className="overflow-hidden rounded-3xl border border-border/40 bg-card/25">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 py-4">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Receipt className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Billing</p>
            <h2 className="mt-1 font-heading text-lg font-semibold">Invoices & deposits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActive
                ? "Track deposits and payments, or add a follow-up invoice for extras."
                : "Create the invoice from the accepted quote — lines, tax, and the default deposit are filled in."}
            </p>
          </div>
        </div>
        <LoadingButton
          type="button"
          variant={hasActive ? "outline" : "default"}
          isLoading={busy}
          loadingText="Creating"
          icon={<Plus className="size-4" />}
          onClick={() => void createInvoice()}
        >
          {hasActive ? "Add invoice" : "Create invoice"}
        </LoadingButton>
      </div>

      {invoices.length > 0 ? (
        <ul className="divide-y divide-border/40">
          {invoices.map((invoice) => {
            const due = computeAmountDue(invoice);
            return (
              <li key={invoice.id}>
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-base font-semibold">
                        {invoice.invoice_number}
                      </span>
                      <InvoiceStatusBadge invoice={invoice} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Issued {invoice.issue_date}
                      {invoice.due_date ? ` · due ${invoice.due_date}` : ""}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-right text-sm tabular-nums">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                      <p>{formatMoneyFromCents(invoice.total_cents, "en", invoice.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Paid</p>
                      <p>{formatMoneyFromCents(invoice.amount_paid_cents, "en", invoice.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-primary">
                        {due.dueNowKind === "deposit" ? "Deposit due" : "Balance"}
                      </p>
                      <p className="font-semibold">{formatMoneyFromCents(due.dueNowCents, "en", invoice.currency)}</p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p className="px-5 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

import {
  formatMoneyFromCents,
  type QuoteEventRow,
  type QuoteRow,
  type QuoteStatus,
} from "@/data/quotes";
import { recordJobEvent } from "@/lib/job-events";
import { listInvoicesForJob, refreshDraftInvoiceFromQuote } from "@/lib/invoices";
import { fetchQuoteById, listQuotesForEstimate, logQuoteEvent } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RevisionActor = {
  type: QuoteEventRow["actor_type"];
  userId?: string | null;
  email?: string | null;
};

/** Customer-facing versions a newly sent revision closes. */
const OPEN_STATUSES: readonly QuoteStatus[] = ["sent", "viewed", "revision_requested", "expired"];

/**
 * Marks the other versions of this opportunity as replaced and voids their open
 * signing sessions. On send, open versions close (a signed one stays in force
 * until the revision is signed); on acceptance, the signed one is replaced too.
 * Signatures on replaced versions stay untouched as the historical record.
 */
export async function supersedeOtherRevisions(input: {
  quote: Pick<QuoteRow, "id" | "estimate_request_id" | "quote_display_ref">;
  trigger: "sent" | "accepted";
  actor: RevisionActor;
}): Promise<QuoteRow[]> {
  const { quote, trigger } = input;
  const statuses: readonly QuoteStatus[] =
    trigger === "accepted" ? [...OPEN_STATUSES, "accepted"] : OPEN_STATUSES;
  const siblings = (await listQuotesForEstimate(quote.estimate_request_id)).filter(
    (row) => row.id !== quote.id && statuses.includes(row.status)
  );
  if (siblings.length === 0) return [];

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const ids = siblings.map((row) => row.id);
  const { error } = await admin
    .from("quotes")
    .update({ status: "superseded", superseded_by_quote_id: quote.id, superseded_at: now })
    .in("id", ids);
  if (error) {
    console.error("[revisions] supersede", error);
    return [];
  }
  const { error: voidError } = await admin
    .from("quote_signatures")
    .update({ status: "void", session_token_hash: null, otp_hash: null, updated_at: now })
    .in("quote_id", ids)
    .eq("status", "pending");
  if (voidError) console.error("[revisions] void pending signatures", voidError);

  for (const row of siblings) {
    await logQuoteEvent({
      quoteId: row.id,
      actorType: input.actor.type,
      actorUserId: input.actor.userId ?? null,
      actorEmail: input.actor.email ?? null,
      eventType: "quote_superseded",
      summary:
        trigger === "accepted"
          ? `Replaced by ${quote.quote_display_ref} (accepted)${row.status === "accepted" ? " — earlier agreement kept on file" : ""}`
          : `Replaced by ${quote.quote_display_ref} (sent) — signing closed on this version`,
      metadata: { superseded_by_quote_id: quote.id, previous_status: row.status, trigger },
    });
  }
  return siblings;
}

/**
 * Points the opportunity's existing job at the newly accepted revision instead
 * of creating a second job. Draft invoices are rebuilt from the revision; issued
 * invoices are left as-is and flagged for an adjustment.
 */
export async function moveJobToRevision(input: {
  quoteId: string;
  actorUserId: string | null;
}): Promise<{ jobId: string } | null> {
  const quote = await fetchQuoteById(input.quoteId);
  if (!quote || quote.status !== "accepted") return null;

  const admin = createAdminSupabaseClient();
  const siblings = await listQuotesForEstimate(quote.estimate_request_id);
  const siblingIds = siblings.map((row) => row.id).filter((id) => id !== quote.id);
  if (siblingIds.length === 0) return null;
  const { data: jobs, error } = await admin
    .from("event_jobs")
    .select("id, quote_id, accepted_quote_total_cents")
    .in("quote_id", siblingIds)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[revisions] find job", error);
    return null;
  }
  const job = jobs?.[0] as { id: string; quote_id: string; accepted_quote_total_cents: number | null } | undefined;
  if (!job) return null;

  const previous = siblings.find((row) => row.id === job.quote_id);
  const { error: updateError } = await admin
    .from("event_jobs")
    .update({
      quote_id: quote.id,
      currency: quote.currency,
      accepted_quote_total_cents: quote.total_cents,
      accepted_quote_subtotal_cents: quote.subtotal_cents,
    })
    .eq("id", job.id);
  if (updateError) {
    console.error("[revisions] move job", updateError);
    return null;
  }

  const actorRole = input.actorUserId ? "owner" : "customer";
  const money = (cents: number | null | undefined) => formatMoneyFromCents(cents ?? 0, "en", quote.currency);
  await recordJobEvent({
    jobId: job.id,
    actorUserId: input.actorUserId,
    actorRole,
    eventType: "quote_linked",
    title: "Agreement revised",
    body: `Now based on ${quote.quote_display_ref}${previous ? ` (replaces ${previous.quote_display_ref})` : ""}.`,
    customerVisible: true,
    metadata: { quote_id: quote.id, previous_quote_id: job.quote_id },
  });

  const invoices = await listInvoicesForJob(job.id);
  const issued = invoices.filter((inv) => inv.status !== "draft" && inv.status !== "void");
  for (const invoice of invoices) {
    if (invoice.status === "draft") {
      await refreshDraftInvoiceFromQuote({ invoice, quote, actorUserId: input.actorUserId });
    }
  }
  if (issued.length > 0) {
    await recordJobEvent({
      jobId: job.id,
      actorUserId: input.actorUserId,
      actorRole,
      eventType: "quote_linked",
      title: "Invoice adjustment needed",
      body: `${issued.map((inv) => inv.invoice_number).join(", ")} ${issued.length > 1 ? "were" : "was"} issued from the earlier version. Accepted total ${money(job.accepted_quote_total_cents)} → ${money(quote.total_cents)} — create an invoice for the difference.`,
      customerVisible: false,
      metadata: { quote_id: quote.id, invoice_ids: issued.map((inv) => inv.id) },
    });
  }
  return { jobId: job.id };
}

/** Run right after a revision is accepted, before the job lookup. */
export async function finalizeAcceptedRevision(input: {
  quote: Pick<QuoteRow, "id" | "estimate_request_id" | "quote_display_ref">;
  actor: RevisionActor;
}): Promise<void> {
  try {
    await supersedeOtherRevisions({ quote: input.quote, trigger: "accepted", actor: input.actor });
    await moveJobToRevision({ quoteId: input.quote.id, actorUserId: input.actor.userId ?? null });
  } catch (error) {
    console.error("[revisions] finalize accepted revision", error);
  }
}

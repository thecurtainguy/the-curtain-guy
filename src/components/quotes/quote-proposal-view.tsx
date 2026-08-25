"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  MessageSquarePlus,
  PartyPopper,
  Sparkles,
  XCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  QuoteLineStatusBadge,
  QuoteRequestStatusBadge,
  QuoteStatusBadge,
} from "@/components/quotes/quote-status-badge";
import { QuoteShareBar } from "@/components/quotes/quote-share-bar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Reveal } from "@/components/animation/reveal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCadFromCents,
  getCustomerRevisionNumber,
  QUOTE_CATEGORY_LABELS,
  type CustomerSafeQuote,
  type QuoteLineCategory,
} from "@/data/quotes";
import { QuoteTaxBreakdown } from "@/components/quotes/quote-tax-breakdown";
import {
  getAddOnUpsells,
  getServiceUpsells,
  type QuoteUpsellItem,
} from "@/data/quote-upsells";
import { siteConfig } from "@/data/site";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

type Props = {
  quote: CustomerSafeQuote;
  mode: "account" | "public";
  actionEndpoint: string;
  pdfUrl: string;
  shareUrl: string;
  heroImageSrc?: string;
};

type ActionPanel = "accept" | "decline" | "request_changes" | "ask_question" | null;

type ActionPayload = {
  action: string;
  message?: string;
  reason?: string;
  sourceKey?: string;
  title?: string;
};

function formatQuoteDate(value: string | null): string {
  if (!value) return "TBD";
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed);
  try {
    return formatDisplayDate(new Date(value));
  } catch {
    return value;
  }
}

function categoryLabel(category: string): string {
  return (
    QUOTE_CATEGORY_LABELS[category as QuoteLineCategory] ||
    category.replaceAll("_", " ")
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/40 p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function QuoteProposalView({
  quote,
  mode,
  actionEndpoint,
  pdfUrl,
  shareUrl,
  heroImageSrc,
}: Props) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState<
    CustomerSafeQuote["status"] | null
  >(null);
  const [extraPendingKeys, setExtraPendingKeys] = useState<string[]>([]);
  const [panel, setPanel] = useState<ActionPanel>(null);
  const [message, setMessage] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestingKey, setRequestingKey] = useState<string | null>(null);

  const status = optimisticStatus ?? quote.status;
  const pendingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const req of quote.requests) {
      if (req.status === "pending_owner_review" && req.source_key) {
        keys.add(req.source_key);
      }
    }
    for (const key of extraPendingKeys) {
      keys.add(key);
    }
    return keys;
  }, [quote.requests, extraPendingKeys]);

  const isFinal = status === "accepted" || status === "declined";
  const canAct =
    !isFinal &&
    status !== "cancelled" &&
    status !== "expired" &&
    status !== "draft";

  const visibleAddOns = getAddOnUpsells().filter(
    (item) => !pendingKeys.has(item.key)
  );
  const visibleServices = getServiceUpsells().filter(
    (item) => !pendingKeys.has(item.key)
  );

  async function postAction(payload: ActionPayload): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(actionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        status?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.message || "Something went wrong. Please try again.");
        return false;
      }

      if (data.status === "accepted" || payload.action === "accept") {
        setOptimisticStatus("accepted");
        setConfirmNote("Thank you — we’ve noted your acceptance.");
      } else if (data.status === "declined" || payload.action === "decline") {
        setOptimisticStatus("declined");
        setConfirmNote("We’ve recorded your response.");
      } else if (payload.action === "request_changes") {
        setOptimisticStatus("revision_requested");
        setConfirmNote("Change request sent — pending owner review.");
      } else if (payload.action === "request_add_on" && payload.sourceKey) {
        setExtraPendingKeys((prev) =>
          prev.includes(payload.sourceKey!)
            ? prev
            : [...prev, payload.sourceKey!]
        );
        setConfirmNote("Added to quote for review — pending owner review.");
      } else if (payload.action === "custom_request") {
        setConfirmNote("Custom request sent — pending owner review.");
      } else if (payload.action === "ask_question") {
        setConfirmNote("Question sent — we’ll follow up shortly.");
      } else {
        setConfirmNote("Request received.");
      }

      setPanel(null);
      setMessage("");
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setBusy(false);
      setRequestingKey(null);
    }
  }

  async function requestUpsell(item: QuoteUpsellItem) {
    setRequestingKey(item.key);
    await postAction({
      action: "request_add_on",
      sourceKey: item.key,
    });
  }

  return (
    <Reveal variant="fade-up" immediate className="relative mx-auto max-w-4xl space-y-8 pb-16">
      {/* Header */}
      <header
        className={cn(
          "relative overflow-hidden rounded-[min(var(--radius-4xl),24px)]",
          "border border-border/40 bg-card/25 shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-foreground/5"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.12),transparent_55%)]"
          aria-hidden
        />

        <div
          className={cn(
            "relative",
            heroImageSrc && "md:grid md:grid-cols-[minmax(0,1fr)_38%]"
          )}
        >
          <div className="flex min-w-0 flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <BrandLogo
                  href={mode === "account" ? "/account" : "/"}
                  size="md"
                  priority
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                    Proposal
                  </p>
                  <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {quote.quote_display_ref}
                  </h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quote.opportunity_ref}
                    {(() => {
                      const rev = getCustomerRevisionNumber(
                        quote.revision_number
                      );
                      return rev ? ` · Revision ${rev}` : "";
                    })()}
                  </p>
                </div>
              </div>
              <QuoteStatusBadge status={status} />
            </div>

            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              A tailored draping plan from {siteConfig.name} for your event —
              reviewed and refined with our team.
            </p>
          </div>

          {heroImageSrc ? (
            <div className="relative hidden min-h-[200px] md:block">
              <Image
                src={heroImageSrc}
                alt=""
                fill
                className="object-cover"
                sizes="38vw"
                priority
              />
              <div
                className="absolute inset-0 bg-gradient-to-l from-transparent via-card/50 to-card"
                aria-hidden
              />
            </div>
          ) : null}
        </div>
      </header>

      {/* Status banners */}
      {status === "accepted" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                Proposal accepted
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thank you. Our team will confirm next steps for delivery,
                installation, and teardown.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {status === "declined" ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 size-5 shrink-0 text-rose-300" />
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                Proposal declined
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’ve recorded your response. Reach out anytime if you’d like
                to revisit the plan.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {confirmNote ? (
        <div
          className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
          role="status"
        >
          {confirmNote}
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {/* Event summary */}
      <section>
        <SectionHeader
          icon={PartyPopper}
          title="Event summary"
          description="The details this proposal is built around."
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            icon={Sparkles}
            label="Event"
            value={quote.event_type || "TBD"}
          />
          <StatTile
            icon={Calendar}
            label="Date"
            value={formatQuoteDate(quote.event_date)}
          />
          <StatTile
            icon={MapPin}
            label="Venue"
            value={quote.venue_name || "TBD"}
          />
          <StatTile
            icon={MapPin}
            label="City"
            value={quote.city_area || "TBD"}
          />
          <StatTile
            icon={Calendar}
            label="Valid until"
            value={formatQuoteDate(quote.valid_until)}
          />
        </div>
      </section>

      {/* Total hero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border border-primary/25 bg-card/30 p-6 sm:p-8",
          "shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(212,175,55,0.14),transparent_50%)]"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
              Proposal total · CAD
            </p>
            <p className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {formatCadFromCents(quote.total_cents)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on priced and included line items. Final figures may adjust
              after venue confirmation.
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-background/40 p-4 sm:p-5">
            <QuoteTaxBreakdown quote={quote} variant="customer" />
          </div>
        </div>
      </section>

      {/* Line items */}
      <section>
        <SectionHeader
          icon={FileText}
          title="What’s included"
          description="Priced and included items in this proposal."
        />
        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          {quote.line_items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Line items will appear here once the proposal is finalized.
            </p>
          ) : (
            <ul className="divide-y divide-border/30">
              {quote.line_items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium text-foreground">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                        {categoryLabel(item.category)}
                      </span>
                      <QuoteLineStatusBadge status={item.status} />
                      {item.quantity > 1 ? (
                        <span className="text-xs text-muted-foreground">
                          Qty {item.quantity}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    {item.status === "included" ? (
                      <p className="text-sm font-medium text-primary">Included</p>
                    ) : item.status === "priced" ||
                      item.status === "approved" ? (
                      <p className="font-heading text-lg font-semibold text-foreground">
                        {formatCadFromCents(item.line_total_cents)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Pending requests */}
      {quote.requests.length > 0 ? (
        <section>
          <SectionHeader
            icon={MessageSquarePlus}
            title="Your requests"
            description="Options and questions you’ve shared for review."
          />
          <div className="space-y-2">
            {quote.requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-border/40 bg-card/25 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{req.title}</p>
                    {req.message ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {req.message}
                      </p>
                    ) : null}
                  </div>
                  <QuoteRequestStatusBadge status={req.status} />
                </div>
                {req.owner_response ? (
                  <p className="mt-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                    {req.owner_response}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Notes + terms */}
      <div className="grid gap-4 md:grid-cols-2">
        {quote.customer_notes ? (
          <div className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Notes for you
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {quote.customer_notes}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Notes for you
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              No additional notes on this proposal.
            </p>
          </div>
        )}
        <div className="rounded-3xl border border-border/40 bg-card/25 p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Terms
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {quote.terms ||
              "This proposal is a planning quote based on the details shared so far."}
          </p>
        </div>
      </div>

      {/* Actions */}
      {canAct ? (
        <section className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
          <SectionHeader
            icon={CheckCircle2}
            title="Respond to this proposal"
            description="Accept as outlined, request changes, or decline."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => setPanel(panel === "accept" ? null : "accept")}
            >
              Accept proposal
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                setPanel(panel === "request_changes" ? null : "request_changes")
              }
            >
              Request changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setPanel(panel === "decline" ? null : "decline")}
            >
              Decline
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                setPanel(panel === "ask_question" ? null : "ask_question")
              }
            >
              Ask a question
            </Button>
          </div>

          {panel === "accept" ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <p className="text-sm text-muted-foreground">
                Confirm you’d like to move forward with this proposal as
                outlined. Our team will follow up on scheduling.
              </p>
              <LoadingButton
                type="button"
                isLoading={busy}
                loadingText="Sending…"
                onClick={() => void postAction({ action: "accept" })}
              >
                Confirm acceptance
              </LoadingButton>
            </div>
          ) : null}

          {panel === "request_changes" ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
              <Label htmlFor="quote-changes">What would you like adjusted?</Label>
              <Textarea
                id="quote-changes"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="I’d like to adjust the backdrop height and add masking near the entrance…"
              />
              <LoadingButton
                type="button"
                disabled={!message.trim()}
                isLoading={busy}
                loadingText="Sending…"
                onClick={() =>
                  void postAction({
                    action: "request_changes",
                    message: message.trim(),
                  })
                }
              >
                Send change request
              </LoadingButton>
            </div>
          ) : null}

          {panel === "decline" ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
              <Label htmlFor="quote-decline">
                Optional note (helps us improve)
              </Label>
              <Textarea
                id="quote-decline"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Timing no longer works for our venue…"
              />
              <LoadingButton
                type="button"
                variant="destructive"
                isLoading={busy}
                loadingText="Sending…"
                onClick={() =>
                  void postAction({
                    action: "decline",
                    reason: message.trim() || undefined,
                  })
                }
              >
                Confirm decline
              </LoadingButton>
            </div>
          ) : null}

          {panel === "ask_question" ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
              <Label htmlFor="quote-question">Your question</Label>
              <Textarea
                id="quote-question"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Can teardown happen the morning after the event?"
              />
              <LoadingButton
                type="button"
                disabled={!message.trim()}
                isLoading={busy}
                loadingText="Sending…"
                onClick={() =>
                  void postAction({
                    action: "ask_question",
                    message: message.trim(),
                  })
                }
              >
                Send question
              </LoadingButton>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Review options / upsells */}
      {canAct && (visibleAddOns.length > 0 || visibleServices.length > 0) ? (
        <section>
          <SectionHeader
            icon={Sparkles}
            title="Review options"
            description="Add enhancements for our team to price into your proposal."
          />

          {visibleAddOns.length > 0 ? (
            <div className="mb-6">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                Add-ons
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleAddOns.map((item) => (
                  <UpsellCard
                    key={item.key}
                    item={item}
                    busy={busy && requestingKey === item.key}
                    disabled={busy}
                    onRequest={() => void requestUpsell(item)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {visibleServices.length > 0 ? (
            <div>
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                Related services
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleServices.map((item) => (
                  <UpsellCard
                    key={item.key}
                    item={item}
                    busy={busy && requestingKey === item.key}
                    disabled={busy}
                    onRequest={() => void requestUpsell(item)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Custom request */}
      {canAct ? (
        <section className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
          <SectionHeader
            icon={MessageSquarePlus}
            title="Something else in mind?"
            description="Describe a custom detail and we’ll review it with the proposal."
          />
          <div className="space-y-3">
            <Label htmlFor="quote-custom">Custom request</Label>
            <Textarea
              id="quote-custom"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              placeholder="Can you also add draping around the DJ area?"
            />
            <LoadingButton
              type="button"
              variant="outline"
              disabled={!customMessage.trim()}
              isLoading={busy}
              loadingText="Sending…"
              onClick={() =>
                void postAction({
                  action: "custom_request",
                  message: customMessage.trim(),
                }).then((ok) => {
                  if (ok) setCustomMessage("");
                })
              }
            >
              Add to quote for review
            </LoadingButton>
          </div>
        </section>
      ) : null}

      {/* Share + PDF */}
      <section className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Share & PDF
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send this proposal or open the PDF in your browser.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-3.5" />
              View PDF
            </a>
          </Button>
        </div>
        <div className="mt-4 border-t border-border/30 pt-4">
          <QuoteShareBar shareUrl={shareUrl} quoteRef={quote.quote_display_ref} />
        </div>
      </section>
    </Reveal>
  );
}

function UpsellCard({
  item,
  busy,
  disabled,
  onRequest,
}: {
  item: QuoteUpsellItem;
  busy: boolean;
  disabled: boolean;
  onRequest: () => void;
}) {
  const Icon = item.icon ?? Sparkles;

  return (
    <div className="flex flex-col rounded-2xl border border-border/40 bg-card/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {item.description}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-300/90">
            Pending owner review after request
          </p>
        </div>
      </div>
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 w-full sm:w-auto"
        disabled={disabled && !busy}
        isLoading={busy}
        loadingText="Sending…"
        onClick={onRequest}
      >
        Add to quote for review
      </LoadingButton>
    </div>
  );
}

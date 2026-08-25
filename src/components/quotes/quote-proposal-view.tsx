"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  HelpCircle,
  MapPin,
  MessageSquarePlus,
  PartyPopper,
  PencilLine,
  Plus,
  Send,
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

type ActionPanel =
  | "accept"
  | "decline"
  | "request_changes"
  | "ask_question"
  | null;

type ActionPayload = {
  action: string;
  message?: string;
  reason?: string;
  sourceKey?: string;
  title?: string;
};

const FEATURED_UPSELL_COUNT = 3;

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
    <div className="rounded-xl border border-border/35 bg-background/35 p-3 backdrop-blur-sm">
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

const glassCardClass =
  "relative overflow-hidden rounded-3xl border border-border/45 bg-card/50 shadow-[0_10px_36px_rgba(0,0,0,0.07)] ring-1 ring-primary/10 backdrop-blur-md dark:bg-card/40 dark:shadow-[0_10px_36px_rgba(0,0,0,0.28)]";

/** Premium rail / proposal action buttons */
const railBtnPrimary =
  "h-10 gap-2 rounded-2xl px-4 text-sm font-medium shadow-[0_6px_20px_-6px_rgba(212,175,55,0.5)]";
const railBtnOutline =
  "h-10 gap-2 rounded-2xl border-border/50 bg-background/75 px-3.5 text-sm font-medium text-foreground shadow-[0_3px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:border-primary/35 hover:bg-primary/[0.07] hover:text-foreground dark:bg-background/45 dark:shadow-[0_3px_12px_rgba(0,0,0,0.2)]";
const railBtnMuted =
  "h-10 gap-2 rounded-2xl border border-border/45 bg-background/50 px-3.5 text-sm font-medium text-muted-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-sm hover:border-rose-500/35 hover:bg-rose-500/[0.06] hover:text-rose-800 dark:hover:text-rose-300";
const railBtnActive =
  "border-primary/40 bg-primary/10 text-foreground ring-1 ring-primary/25";

function GlassSection({
  icon,
  title,
  description,
  compact,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        glassCardClass,
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="relative">
        <SectionHeader
          icon={icon}
          title={title}
          description={description}
          compact={compact}
          embedded
        />
        {children}
      </div>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  compact,
  embedded,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        embedded
          ? compact
            ? "mb-3 border-b border-border/35 pb-3"
            : "mb-4 border-b border-border/35 pb-4"
          : compact
            ? "mb-3"
            : "mb-4"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20",
          compact ? "size-8" : "size-9"
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-4"} />
      </span>
      <div className="min-w-0">
        <h2
          className={cn(
            "font-heading font-semibold tracking-tight text-foreground",
            compact ? "text-base" : "text-xl"
          )}
        >
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
  const allUpsells = [...visibleAddOns, ...visibleServices];
  const featuredUpsells = allUpsells.slice(0, FEATURED_UPSELL_COUNT);
  const moreAddOns = visibleAddOns.filter(
    (item) => !featuredUpsells.some((f) => f.key === item.key)
  );
  const moreServices = visibleServices.filter(
    (item) => !featuredUpsells.some((f) => f.key === item.key)
  );
  const hasMoreUpsells = moreAddOns.length > 0 || moreServices.length > 0;

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

  const totalCard = (
    <TotalCard quote={quote} compact />
  );

  const respondCard = canAct ? (
    <RespondCard
      panel={panel}
      setPanel={setPanel}
      message={message}
      setMessage={setMessage}
      busy={busy}
      onAction={(payload) => void postAction(payload)}
    />
  ) : null;

  const customCard = canAct ? (
    <CustomRequestCard
      value={customMessage}
      onChange={setCustomMessage}
      busy={busy}
      onSubmit={() =>
        void postAction({
          action: "custom_request",
          message: customMessage.trim(),
        }).then((ok) => {
          if (ok) setCustomMessage("");
        })
      }
    />
  ) : null;

  const shareCard = (
    <ShareCard
      pdfUrl={pdfUrl}
      shareUrl={shareUrl}
      quoteRef={quote.quote_display_ref}
    />
  );

  return (
    <Reveal
      variant="fade-up"
      immediate
      className="relative w-full space-y-6 pb-16 sm:space-y-8"
    >
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <GlassSection
            icon={PartyPopper}
            title="Event summary"
            description="The details this proposal is built around."
          >
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
          </GlassSection>

          {/* Mobile / tablet: total + respond early */}
          <div className="space-y-3 lg:hidden">
            {totalCard}
            {respondCard}
          </div>

          <GlassSection
            icon={FileText}
            title="What’s included"
            description="Priced and included items in this proposal."
          >
            <div className="overflow-hidden rounded-2xl border border-border/35 bg-background/25">
              {quote.line_items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Line items will appear here once the proposal is finalized.
                </p>
              ) : (
                <>
                  <div className="hidden border-b border-border/30 px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.6fr)_72px_100px_110px] sm:gap-3">
                    <span>Item</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <ul className="divide-y divide-border/30">
                    {quote.line_items.map((item) => {
                      const showMoney =
                        item.status === "priced" || item.status === "approved";
                      const included = item.status === "included";
                      return (
                        <li
                          key={item.id}
                          className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.6fr)_72px_100px_110px] sm:items-center sm:gap-3 sm:px-5"
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
                              {item.is_taxable !== false ? (
                                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                                  Taxable
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                                  Non-taxable
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              Qty {item.quantity}
                              {showMoney
                                ? ` · ${formatCadFromCents(item.unit_price_cents)} each`
                                : ""}
                            </p>
                          </div>
                          <p className="hidden text-right text-sm tabular-nums text-foreground sm:block">
                            {item.quantity}
                          </p>
                          <p className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
                            {showMoney
                              ? formatCadFromCents(item.unit_price_cents)
                              : "—"}
                          </p>
                          <div className="text-left sm:text-right">
                            {included ? (
                              <p className="text-sm font-medium text-primary">
                                Included
                              </p>
                            ) : showMoney ? (
                              <p className="font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg">
                                {formatCadFromCents(item.line_total_cents)}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-border/40 bg-background/25 px-4 py-4 sm:px-5">
                    <div className="ml-auto w-full max-w-sm">
                      <QuoteTaxBreakdown quote={quote} variant="customer" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassSection>

          {quote.requests.length > 0 ? (
            <GlassSection
              icon={MessageSquarePlus}
              title="Your requests"
              description="Options and questions you’ve shared for review."
            >
              <div className="space-y-2">
                {quote.requests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-border/35 bg-background/30 p-4 backdrop-blur-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {req.title}
                        </p>
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
            </GlassSection>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className={cn(glassCardClass, "p-5")}>
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.08),transparent_50%)]"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  Notes for you
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {quote.customer_notes ||
                    "No additional notes on this proposal."}
                </p>
              </div>
            </div>
            <div className={cn(glassCardClass, "p-5")}>
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.08),transparent_50%)]"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  Terms
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {quote.terms ||
                    "This proposal is a planning quote based on the details shared so far."}
                </p>
              </div>
            </div>
          </div>

          {canAct && featuredUpsells.length > 0 ? (
            <GlassSection
              icon={Sparkles}
              title="Review options"
              description="A few enhancements we can price into this proposal."
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featuredUpsells.map((item) => (
                  <UpsellCard
                    key={item.key}
                    item={item}
                    busy={busy && requestingKey === item.key}
                    disabled={busy}
                    onRequest={() => void requestUpsell(item)}
                    compact
                  />
                ))}
              </div>

              {hasMoreUpsells ? (
                <details className="group mt-4 rounded-2xl border border-border/35 bg-background/25 open:bg-background/35">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    <span>
                      Browse more options
                      <span className="ml-2 text-muted-foreground">
                        ({moreAddOns.length + moreServices.length})
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-5 border-t border-border/30 px-4 py-4">
                    {moreAddOns.length > 0 ? (
                      <div>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                          Add-ons
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {moreAddOns.map((item) => (
                            <UpsellCard
                              key={item.key}
                              item={item}
                              busy={busy && requestingKey === item.key}
                              disabled={busy}
                              onRequest={() => void requestUpsell(item)}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {moreServices.length > 0 ? (
                      <div>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                          Related services
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {moreServices.map((item) => (
                            <UpsellCard
                              key={item.key}
                              item={item}
                              busy={busy && requestingKey === item.key}
                              disabled={busy}
                              onRequest={() => void requestUpsell(item)}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </GlassSection>
          ) : null}

          {/* Mobile: custom + share after content */}
          <div className="space-y-3 lg:hidden">
            {customCard}
            {shareCard}
          </div>
        </div>

        <aside className="hidden space-y-3 lg:sticky lg:top-4 lg:block">
          {totalCard}
          {respondCard}
          {customCard}
          {shareCard}
        </aside>
      </div>
    </Reveal>
  );
}

function TotalCard({
  quote,
  compact,
}: {
  quote: CustomerSafeQuote;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        glassCardClass,
        "ring-primary/20",
        compact ? "p-5" : "p-5 sm:p-6"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(212,175,55,0.16),transparent_55%)]"
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="border-b border-border/35 pb-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            Proposal total · CAD
          </p>
          <p
            className={cn(
              "mt-2 font-heading font-semibold tracking-tight text-foreground",
              compact ? "text-3xl" : "text-4xl"
            )}
          >
            {formatCadFromCents(quote.total_cents)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Based on priced and included line items.
          </p>
        </div>
        <div className="rounded-2xl border border-border/35 bg-background/30 p-3.5 backdrop-blur-sm">
          <QuoteTaxBreakdown quote={quote} variant="customer" />
        </div>
      </div>
    </section>
  );
}

function RespondCard({
  panel,
  setPanel,
  message,
  setMessage,
  busy,
  onAction,
}: {
  panel: ActionPanel;
  setPanel: (panel: ActionPanel) => void;
  message: string;
  setMessage: (value: string) => void;
  busy: boolean;
  onAction: (payload: ActionPayload) => void;
}) {
  return (
    <section className={cn(glassCardClass, "p-4 sm:p-5")}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="relative">
        <SectionHeader
          icon={CheckCircle2}
          title="Respond"
          description="Accept, request changes, decline, or ask a question."
          compact
          embedded
        />
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            className={cn(railBtnPrimary, "col-span-2")}
            disabled={busy}
            aria-expanded={panel === "accept"}
            onClick={() => setPanel(panel === "accept" ? null : "accept")}
          >
            <CheckCircle2 className="size-4" />
            Accept proposal
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              railBtnOutline,
              panel === "request_changes" && railBtnActive
            )}
            disabled={busy}
            aria-expanded={panel === "request_changes"}
            onClick={() =>
              setPanel(panel === "request_changes" ? null : "request_changes")
            }
          >
            <PencilLine className="size-4" />
            Request changes
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              railBtnOutline,
              panel === "ask_question" && railBtnActive
            )}
            disabled={busy}
            aria-expanded={panel === "ask_question"}
            onClick={() =>
              setPanel(panel === "ask_question" ? null : "ask_question")
            }
          >
            <HelpCircle className="size-4" />
            Ask a question
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              railBtnMuted,
              "col-span-2",
              panel === "decline" &&
                "border-rose-500/40 bg-rose-500/10 text-rose-800 ring-1 ring-rose-500/20 dark:text-rose-300"
            )}
            disabled={busy}
            aria-expanded={panel === "decline"}
            onClick={() => setPanel(panel === "decline" ? null : "decline")}
          >
            <XCircle className="size-4" />
            Decline
          </Button>
        </div>

        {panel === "accept" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
            <p className="text-xs text-muted-foreground">
              Confirm you’d like to move forward as outlined.
            </p>
            <LoadingButton
              type="button"
              className={cn(railBtnPrimary, "w-full")}
              isLoading={busy}
              loadingText="Sending…"
              icon={<CheckCircle2 className="size-4" />}
              onClick={() => onAction({ action: "accept" })}
            >
              Confirm acceptance
            </LoadingButton>
          </div>
        ) : null}

        {panel === "request_changes" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-3.5">
            <Label htmlFor="quote-changes">What would you like adjusted?</Label>
            <Textarea
              id="quote-changes"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="I’d like to adjust the backdrop height…"
            />
            <LoadingButton
              type="button"
              className={cn(railBtnPrimary, "w-full")}
              disabled={!message.trim()}
              isLoading={busy}
              loadingText="Sending…"
              icon={<Send className="size-4" />}
              onClick={() =>
                onAction({
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
          <div className="mt-3 space-y-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3.5">
            <Label htmlFor="quote-decline">Optional note</Label>
            <Textarea
              id="quote-decline"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Timing no longer works…"
            />
            <LoadingButton
              type="button"
              variant="destructive"
              className="h-10 w-full gap-2 rounded-2xl px-4 text-sm font-medium shadow-[0_4px_14px_-4px_rgba(225,29,72,0.35)]"
              isLoading={busy}
              loadingText="Sending…"
              icon={<XCircle className="size-4" />}
              onClick={() =>
                onAction({
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
          <div className="mt-3 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-3.5">
            <Label htmlFor="quote-question">Your question</Label>
            <Textarea
              id="quote-question"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Can teardown happen the morning after?"
            />
            <LoadingButton
              type="button"
              className={cn(railBtnPrimary, "w-full")}
              disabled={!message.trim()}
              isLoading={busy}
              loadingText="Sending…"
              icon={<Send className="size-4" />}
              onClick={() =>
                onAction({
                  action: "ask_question",
                  message: message.trim(),
                })
              }
            >
              Send question
            </LoadingButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CustomRequestCard({
  value,
  onChange,
  busy,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <section className={cn(glassCardClass, "p-4 sm:p-5")}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="relative">
        <SectionHeader
          icon={MessageSquarePlus}
          title="Something else?"
          description="Describe a custom detail for review."
          compact
          embedded
        />
        <div className="space-y-3">
          <Label htmlFor="quote-custom">Custom request</Label>
          <Textarea
            id="quote-custom"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder="Can you also add draping around the DJ area?"
          />
          <LoadingButton
            type="button"
            variant="outline"
            className={cn(railBtnOutline, "w-full")}
            disabled={!value.trim()}
            isLoading={busy}
            loadingText="Sending…"
            icon={<Plus className="size-4" />}
            onClick={onSubmit}
          >
            Add for review
          </LoadingButton>
        </div>
      </div>
    </section>
  );
}

function ShareCard({
  pdfUrl,
  shareUrl,
  quoteRef,
}: {
  pdfUrl: string;
  shareUrl: string;
  quoteRef: string;
}) {
  return (
    <section className={cn(glassCardClass, "p-4 sm:p-5")}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="relative">
        <SectionHeader
          icon={Download}
          title="Share & PDF"
          description="Send this proposal or open the PDF."
          compact
          embedded
        />
        <Button asChild className={cn(railBtnPrimary, "w-full")}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="size-4" />
            View PDF
          </a>
        </Button>
        <div className="mt-3 border-t border-border/30 pt-3">
          <QuoteShareBar shareUrl={shareUrl} quoteRef={quoteRef} elevated />
        </div>
      </div>
    </section>
  );
}

function UpsellCard({
  item,
  busy,
  disabled,
  onRequest,
  compact,
}: {
  item: QuoteUpsellItem;
  busy: boolean;
  disabled: boolean;
  onRequest: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon ?? Sparkles;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/35 bg-background/30 backdrop-blur-sm",
        compact ? "p-3.5" : "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {item.description}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-800/90 dark:text-amber-300/90">
            Pending owner review after request
          </p>
        </div>
      </div>
      <LoadingButton
        type="button"
        variant="outline"
        className={cn(railBtnOutline, "mt-3 w-full")}
        disabled={disabled && !busy}
        isLoading={busy}
        loadingText="Sending…"
        icon={<Plus className="size-4" />}
        onClick={onRequest}
      >
        Add for review
      </LoadingButton>
    </div>
  );
}

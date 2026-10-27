"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Hammer,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  MessageSquarePlus,
  PackageOpen,
  PartyPopper,
  PencilLine,
  Plus,
  Send,
  Sparkles,
  Wallet,
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
import { CelebrationConfetti } from "@/components/ui/celebration-confetti";
import { Reveal } from "@/components/animation/reveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMoneyFromCents,
  formatQuoteQuantity,
  formatQuoteUnitPrice,
  getCustomerRevisionNumber,
  quoteLineCategoryLabel,
  type CustomerSafeQuote,
} from "@/data/quotes";
import { QuoteTermsList } from "@/components/quotes/quote-terms-list";
import { QuoteAttachmentGallery } from "@/components/quotes/quote-attachment-gallery";
import {
  getAttachmentCopy,
  type AttachmentViewItem,
} from "@/data/estimate-file-kinds";
import { QuoteTaxBreakdown } from "@/components/quotes/quote-tax-breakdown";
import { UnitPriceCell } from "@/components/quotes/unit-price-cell";
import { LineItemThumb } from "@/components/quotes/line-item-thumb";
import { QUOTE_PAYMENT_COPY, quotePaymentRows } from "@/data/quote-payment-terms";
import {
  getAddOnUpsells,
  getServiceUpsells,
  type QuoteUpsellItem,
} from "@/data/quote-upsells";
import type { CustomerLanguage } from "@/data/customer-language";
import {
  formatQuoteDate,
  getQuoteCopy,
  localizeQuoteApiError,
  quoteEventTypeLabel,
  type QuoteCopy,
} from "@/data/quote-copy";
import {
  QUOTE_SCHEDULE_COPY,
  quoteScheduleRows,
  type QuoteScheduleKey,
} from "@/data/quote-schedule";
import { siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";

type Props = {
  quote: CustomerSafeQuote;
  mode: "account" | "public";
  actionEndpoint: string;
  pdfUrl: string;
  shareUrl: string;
  heroImageSrc?: string;
  /** Owner preview: renders the customer view but never posts actions. */
  preview?: boolean;
  /** Shared files the owner attached to this quote. */
  attachments?: AttachmentViewItem[];
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
  acceptedByName?: string;
  acceptedTerms?: boolean;
  acceptedTermsLanguage?: CustomerLanguage;
  declinedByName?: string;
};

const FEATURED_UPSELL_COUNT = 3;

const SCHEDULE_ICONS: Record<QuoteScheduleKey, LucideIcon> = {
  install: Hammer,
  event: PartyPopper,
  teardown: PackageOpen,
};

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
/** Half-width rail buttons: French labels are long, so let them wrap inside. */
const railBtnHalf =
  "h-auto min-h-10 min-w-0 whitespace-normal px-2.5 py-2 text-center leading-tight";
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
  preview = false,
  attachments = [],
}: Props) {
  const router = useRouter();
  const language = quote.language;
  const t = getQuoteCopy(language);
  const attachmentCopy = getAttachmentCopy(language);
  const scheduleCopy = QUOTE_SCHEDULE_COPY[language];
  const scheduleRows = quoteScheduleRows(quote, language);
  const [optimisticStatus, setOptimisticStatus] = useState<
    CustomerSafeQuote["status"] | null
  >(null);
  const [extraPendingKeys, setExtraPendingKeys] = useState<string[]>([]);
  const [panel, setPanel] = useState<ActionPanel>(null);
  const [message, setMessage] = useState("");
  const [acceptName, setAcceptName] = useState(quote.customer_name || "");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestingKey, setRequestingKey] = useState<string | null>(null);
  const [celebrateAccept, setCelebrateAccept] = useState(false);

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

  const visibleAddOns = getAddOnUpsells(language).filter(
    (item) => !pendingKeys.has(item.key)
  );
  const visibleServices = getServiceUpsells(language).filter(
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
    if (preview) {
      setError(null);
      setConfirmNote(
        "Preview only — nothing was sent. The customer's buttons work on the live link."
      );
      setPanel(null);
      setRequestingKey(null);
      requestAnimationFrame(() =>
        document
          .getElementById("quote-confirm-note")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
      return false;
    }
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
        setError(
          localizeQuoteApiError(data?.message, language) || t.errorGeneric
        );
        return false;
      }

      if (data.status === "accepted" || payload.action === "accept") {
        setOptimisticStatus("accepted");
        setConfirmNote(t.confirmAccepted);
        setCelebrateAccept(true);
      } else if (data.status === "declined" || payload.action === "decline") {
        setOptimisticStatus("declined");
        setConfirmNote(t.confirmDeclined);
      } else if (payload.action === "request_changes") {
        setOptimisticStatus("revision_requested");
        setConfirmNote(t.confirmChanges);
      } else if (payload.action === "request_add_on" && payload.sourceKey) {
        setExtraPendingKeys((prev) =>
          prev.includes(payload.sourceKey!)
            ? prev
            : [...prev, payload.sourceKey!]
        );
        setConfirmNote(t.confirmAddOn);
      } else if (payload.action === "custom_request") {
        setConfirmNote(t.confirmCustom);
      } else if (payload.action === "ask_question") {
        setConfirmNote(t.confirmQuestion);
      } else {
        setConfirmNote(t.confirmGeneric);
      }

      setPanel(null);
      setMessage("");
      setAcceptName(quote.customer_name || "");
      setAcceptedTerms(false);
      router.refresh();
      return true;
    } catch {
      setError(t.errorNetwork);
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
    <TotalCard quote={quote} t={t} compact />
  );

  const respondCard = canAct ? (
    <RespondCard
      panel={panel}
      setPanel={setPanel}
      message={message}
      setMessage={setMessage}
      acceptName={acceptName}
      setAcceptName={setAcceptName}
      acceptedTerms={acceptedTerms}
      setAcceptedTerms={setAcceptedTerms}
      busy={busy}
      t={t}
      onAction={(payload) =>
        void postAction({
          ...payload,
          ...(payload.action === "accept"
            ? { acceptedTermsLanguage: language }
            : {}),
        })
      }
    />
  ) : null;

  const customCard = canAct ? (
    <CustomRequestCard
      value={customMessage}
      onChange={setCustomMessage}
      busy={busy}
      t={t}
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
      t={t}
      language={language}
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
                    {t.proposal}
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
                      return rev ? ` · ${t.revision(rev)}` : "";
                    })()}
                  </p>
                </div>
              </div>
              <QuoteStatusBadge status={status} language={language} />
            </div>

            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {t.tagline(siteConfig.name)}
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

      {celebrateAccept ? <CelebrationConfetti /> : null}

      {status === "accepted" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                {t.acceptedTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.acceptedThanks}
                {quote.accepted_by_name || acceptName.trim() ? (
                  <>
                    {" "}
                    — {t.acceptedBy}{" "}
                    <span className="font-medium text-foreground">
                      {quote.accepted_by_name || acceptName.trim()}
                    </span>
                  </>
                ) : null}
                {t.acceptedNext}
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
                {t.declinedTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.declinedRecorded}
                {quote.declined_by_name ? (
                  <>
                    {" "}
                    — {t.declinedBy}{" "}
                    <span className="font-medium text-foreground">
                      {quote.declined_by_name}
                    </span>
                  </>
                ) : null}
                {t.declinedNext}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {confirmNote ? (
        <div
          id="quote-confirm-note"
          className="scroll-mt-24 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
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
            title={t.eventSummaryTitle}
            description={t.eventSummaryDescription}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile
                icon={Sparkles}
                label={t.statEvent}
                value={quoteEventTypeLabel(quote.event_type, language) || t.tbd}
              />
              <StatTile
                icon={Calendar}
                label={t.statDate}
                value={formatQuoteDate(quote.event_date, language, t.tbd)}
              />
              <StatTile
                icon={MapPin}
                label={t.statVenue}
                value={quote.venue_name || t.tbd}
              />
              <StatTile
                icon={MapPin}
                label={t.statCity}
                value={quote.city_area || t.tbd}
              />
              <StatTile
                icon={Calendar}
                label={t.statValidUntil}
                value={formatQuoteDate(quote.valid_until, language, t.tbd)}
              />
            </div>
            {scheduleRows.length > 0 ? (
              <div className="mt-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                  {scheduleCopy.title}
                </p>
                <div
                  className={cn(
                    "mt-2 grid gap-2",
                    scheduleRows.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
                  )}
                >
                  {scheduleRows.map((row) => {
                    const Icon = SCHEDULE_ICONS[row.key];
                    return (
                      <div
                        key={row.key}
                        className="flex items-start gap-2.5 rounded-lg border border-border/35 bg-background/40 p-2.5"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {row.label}
                          </p>
                          <p className="mt-0.5 text-sm leading-snug text-foreground">
                            {formatQuoteDate(row.date, language, t.tbd)}
                          </p>
                          {row.window ? (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3" aria-hidden />
                              {row.window}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {quote.venue_address ? (
              <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-border/35 bg-background/35 p-3 backdrop-blur-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {t.statVenue}
                  </p>
                  {quote.venue_name ? (
                    <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                      {quote.venue_name}
                    </p>
                  ) : null}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      [quote.venue_name, quote.venue_address].filter(Boolean).join(", ")
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm leading-snug text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {quote.venue_address}
                  </a>
                </div>
              </div>
            ) : null}
            {quote.bill_to ? (
              <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-border/35 bg-background/35 p-3 backdrop-blur-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {t.billedTo}
                  </p>
                  {quote.bill_to.company_name ? (
                    <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                      {quote.bill_to.company_name}
                    </p>
                  ) : null}
                  {quote.customer_name ? (
                    <p
                      className={cn(
                        "leading-snug",
                        quote.bill_to.company_name
                          ? "mt-0.5 text-xs text-muted-foreground"
                          : "mt-0.5 text-sm font-medium text-foreground"
                      )}
                    >
                      {quote.customer_name}
                    </p>
                  ) : null}
                  {quote.bill_to.address ? (
                    <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                      {quote.bill_to.address}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </GlassSection>

          {/* Mobile / tablet: total + respond early */}
          <div className="space-y-3 lg:hidden">
            {totalCard}
            {respondCard}
          </div>

          <GlassSection
            icon={FileText}
            title={t.includedTitle}
            description={t.includedDescription}
          >
            <div className="@container overflow-hidden rounded-2xl border border-border/35 bg-background/25">
              {quote.line_items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {t.noLineItems}
                </p>
              ) : (
                <>
                  <div className="@2xl:grid @2xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] @2xl:gap-x-6">
                  <div className="hidden border-b border-border/30 px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground @2xl:col-span-4 @2xl:grid @2xl:grid-cols-subgrid @2xl:gap-x-6">
                    <span>{t.colItem}</span>
                    <span className="text-right">{t.colQty}</span>
                    <span className="text-right">{t.colPrice}</span>
                    <span className="text-right">{t.colAmount}</span>
                  </div>
                  <ul className="divide-y divide-border/30 @2xl:col-span-4 @2xl:grid @2xl:grid-cols-subgrid @2xl:gap-x-6">
                    {quote.line_items.map((item) => {
                      const showMoney =
                        item.status === "priced" || item.status === "approved";
                      const included = item.status === "included";
                      return (
                        <li
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 px-4 py-4 sm:px-5 @2xl:col-span-4 @2xl:grid-cols-subgrid @2xl:items-center @2xl:gap-x-6"
                        >
                          <div className="flex min-w-0 gap-3">
                            <LineItemThumb
                              src={item.image_url}
                              alt={item.image_alt || item.description}
                              sizes="64px"
                              className="size-14 rounded-xl @2xl:size-16"
                            />
                            <div className="min-w-0 space-y-2">
                              <p className="font-medium text-foreground">
                                {item.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                                  {quoteLineCategoryLabel(item, language)}
                                </span>
                                <QuoteLineStatusBadge
                                  status={item.status}
                                  language={language}
                                />
                                {item.is_taxable !== false ? (
                                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                                    {t.taxable}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                                    {t.nonTaxable}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground @2xl:hidden">
                                {t.qtyShort}{" "}
                                {formatQuoteQuantity(item.quantity, item.unit_label, language)}
                                {showMoney ? (
                                  <>
                                    {" · "}
                                    <span className="whitespace-nowrap">
                                      {formatQuoteUnitPrice(item.unit_price_cents, item.unit_label || "each", language, quote.currency)}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>
                          <p className="hidden whitespace-nowrap text-right text-sm tabular-nums text-foreground @2xl:block">
                            {formatQuoteQuantity(item.quantity, item.unit_label, language)}
                          </p>
                          <div className="hidden text-right @2xl:block">
                            {showMoney ? (
                              <UnitPriceCell
                                cents={item.unit_price_cents}
                                unit={item.unit_label}
                                language={language}
                                currency={quote.currency}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </div>
                          <div className="text-right">
                            {included ? (
                              <p className="text-sm font-medium text-primary">
                                {t.included}
                              </p>
                            ) : showMoney ? (
                              <p className="whitespace-nowrap font-heading text-base font-semibold tabular-nums text-foreground @2xl:text-lg">
                                {formatMoneyFromCents(item.line_total_cents, language, quote.currency)}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                  <div className="border-t border-border/40 bg-background/25 px-4 py-4 sm:px-5">
                    <div className="ml-auto w-full max-w-sm">
                      <QuoteTaxBreakdown
                        quote={quote}
                        variant="customer"
                        language={language}
                        currency={quote.currency}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassSection>

          {attachments.length > 0 ? (
            <GlassSection
              icon={ImageIcon}
              title={attachmentCopy.title}
              description={attachmentCopy.subtitle}
            >
              <QuoteAttachmentGallery items={attachments} language={language} />
            </GlassSection>
          ) : null}

          {quote.requests.length > 0 ? (
            <GlassSection
              icon={MessageSquarePlus}
              title={t.requestsTitle}
              description={t.requestsDescription}
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
                      <QuoteRequestStatusBadge
                        status={req.status}
                        language={language}
                      />
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

          <div className="space-y-4">
            <div className={cn(glassCardClass, "p-5")}>
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(212,175,55,0.08),transparent_50%)]"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  {t.notesForYou}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {quote.customer_notes || t.noNotes}
                </p>
              </div>
            </div>
            <GlassSection
              icon={FileText}
              title={t.termsTitle}
              description={t.termsDescription}
            >
              <QuoteTermsList terms={quote.terms} emptyText={t.noTerms} />
            </GlassSection>
          </div>

          {canAct && featuredUpsells.length > 0 ? (
            <GlassSection
              icon={Sparkles}
              title={t.optionsTitle}
              description={t.optionsDescription}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featuredUpsells.map((item) => (
                  <UpsellCard
                    key={item.key}
                    item={item}
                    busy={busy && requestingKey === item.key}
                    disabled={busy}
                    onRequest={() => void requestUpsell(item)}
                    t={t}
                    compact
                  />
                ))}
              </div>

              {hasMoreUpsells ? (
                <details className="group mt-4 rounded-2xl border border-border/35 bg-background/25 open:bg-background/35">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    <span>
                      {t.browseMore}
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
                          {t.addOns}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {moreAddOns.map((item) => (
                            <UpsellCard
                              key={item.key}
                              item={item}
                              busy={busy && requestingKey === item.key}
                              disabled={busy}
                              onRequest={() => void requestUpsell(item)}
                              t={t}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {moreServices.length > 0 ? (
                      <div>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                          {t.relatedServices}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {moreServices.map((item) => (
                            <UpsellCard
                              key={item.key}
                              item={item}
                              busy={busy && requestingKey === item.key}
                              disabled={busy}
                              onRequest={() => void requestUpsell(item)}
                              t={t}
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

        <aside className="hidden space-y-3 lg:sticky lg:top-[calc(4.25rem+0.75rem)] lg:block">
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
  t,
  compact,
}: {
  quote: CustomerSafeQuote;
  t: QuoteCopy;
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
            {t.totalTitle(quote.currency)}
          </p>
          <p
            className={cn(
              "mt-2 font-heading font-semibold tracking-tight text-foreground",
              compact ? "text-3xl" : "text-4xl"
            )}
          >
            {formatMoneyFromCents(quote.total_cents, quote.language, quote.currency)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t.totalHint}
          </p>
        </div>
        <div className="rounded-2xl border border-border/35 bg-background/30 p-3.5 backdrop-blur-sm">
          <QuoteTaxBreakdown
            quote={quote}
            variant="customer"
            language={quote.language}
            currency={quote.currency}
          />
        </div>
        <PaymentSchedule quote={quote} />
      </div>
    </section>
  );
}

function PaymentSchedule({ quote }: { quote: CustomerSafeQuote }) {
  const rows = quotePaymentRows(quote, quote.language);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
        {QUOTE_PAYMENT_COPY[quote.language].title}
      </p>
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {row.key === "deposit" ? <Wallet className="size-3.5" /> : <CalendarCheck className="size-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium text-foreground">{row.label}</p>
              <p className="font-heading text-base font-semibold tabular-nums text-foreground">
                {formatMoneyFromCents(row.amountCents, quote.language, quote.currency)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {row.due}
              {row.detail ? ` · ${row.detail}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RespondCard({
  panel,
  setPanel,
  message,
  setMessage,
  acceptName,
  setAcceptName,
  acceptedTerms,
  setAcceptedTerms,
  busy,
  t,
  onAction,
}: {
  panel: ActionPanel;
  setPanel: (panel: ActionPanel) => void;
  message: string;
  setMessage: (value: string) => void;
  acceptName: string;
  setAcceptName: (value: string) => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (value: boolean) => void;
  busy: boolean;
  t: QuoteCopy;
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
          title={t.respondTitle}
          description={t.respondDescription}
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
            {t.accept}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              railBtnOutline,
              railBtnHalf,
              panel === "request_changes" && railBtnActive
            )}
            disabled={busy}
            aria-expanded={panel === "request_changes"}
            onClick={() =>
              setPanel(panel === "request_changes" ? null : "request_changes")
            }
          >
            <PencilLine className="size-4" />
            {t.requestChanges}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              railBtnOutline,
              railBtnHalf,
              panel === "ask_question" && railBtnActive
            )}
            disabled={busy}
            aria-expanded={panel === "ask_question"}
            onClick={() =>
              setPanel(panel === "ask_question" ? null : "ask_question")
            }
          >
            <HelpCircle className="size-4" />
            {t.askQuestion}
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
            {t.decline}
          </Button>
        </div>

        {panel === "accept" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
            <p className="text-xs text-muted-foreground">
              {t.acceptConfirmHint}
            </p>
            <div className="space-y-2">
              <Label htmlFor="quote-accept-name">{t.fullName}</Label>
              <Input
                id="quote-accept-name"
                value={acceptName}
                onChange={(e) => setAcceptName(e.target.value)}
                autoComplete="name"
                placeholder={t.fullNamePlaceholder}
                disabled={busy}
              />
              <p className="text-[11px] text-muted-foreground">
                {t.acceptRecordHint}
              </p>
            </div>
            <label
              htmlFor="quote-accept-terms"
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/45 bg-background/45 p-3 text-xs leading-relaxed text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/5"
            >
              <input
                id="quote-accept-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                disabled={busy}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
              />
              <span>{t.acceptTermsAcknowledgement}</span>
            </label>
            <LoadingButton
              type="button"
              className={cn(railBtnPrimary, "w-full")}
              disabled={acceptName.trim().length < 2 || !acceptedTerms}
              isLoading={busy}
              loadingText={t.sending}
              icon={<CheckCircle2 className="size-4" />}
              onClick={() =>
                onAction({
                  action: "accept",
                  acceptedByName: acceptName.trim(),
                  acceptedTerms,
                })
              }
            >
              {t.confirmAcceptance}
            </LoadingButton>
          </div>
        ) : null}

        {panel === "request_changes" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-3.5">
            <Label htmlFor="quote-changes">{t.changesLabel}</Label>
            <Textarea
              id="quote-changes"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t.changesPlaceholder}
            />
            <LoadingButton
              type="button"
              className={cn(railBtnPrimary, "w-full")}
              disabled={!message.trim()}
              isLoading={busy}
              loadingText={t.sending}
              icon={<Send className="size-4" />}
              onClick={() =>
                onAction({
                  action: "request_changes",
                  message: message.trim(),
                })
              }
            >
              {t.sendChangeRequest}
            </LoadingButton>
          </div>
        ) : null}

        {panel === "decline" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3.5">
            <div className="space-y-2">
              <Label htmlFor="quote-decline-name">{t.fullName}</Label>
              <Input
                id="quote-decline-name"
                value={acceptName}
                onChange={(e) => setAcceptName(e.target.value)}
                autoComplete="name"
                placeholder={t.fullNamePlaceholder}
                disabled={busy}
              />
              <p className="text-[11px] text-muted-foreground">
                {t.declineRecordHint}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-decline">{t.optionalNote}</Label>
              <Textarea
                id="quote-decline"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder={t.declinePlaceholder}
                disabled={busy}
              />
            </div>
            <LoadingButton
              type="button"
              variant="destructive"
              className="h-10 w-full gap-2 rounded-2xl px-4 text-sm font-medium shadow-[0_4px_14px_-4px_rgba(225,29,72,0.35)]"
              disabled={acceptName.trim().length < 2}
              isLoading={busy}
              loadingText={t.sending}
              icon={<XCircle className="size-4" />}
              onClick={() =>
                onAction({
                  action: "decline",
                  declinedByName: acceptName.trim(),
                  reason: message.trim() || undefined,
                })
              }
            >
              {t.confirmDecline}
            </LoadingButton>
          </div>
        ) : null}

        {panel === "ask_question" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-3.5">
            <Label htmlFor="quote-question">{t.questionLabel}</Label>
            <Textarea
              id="quote-question"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder={t.questionPlaceholder}
            />
            <LoadingButton
              type="button"
              className={cn(railBtnPrimary, "w-full")}
              disabled={!message.trim()}
              isLoading={busy}
              loadingText={t.sending}
              icon={<Send className="size-4" />}
              onClick={() =>
                onAction({
                  action: "ask_question",
                  message: message.trim(),
                })
              }
            >
              {t.sendQuestion}
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
  t,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  t: QuoteCopy;
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
          title={t.customTitle}
          description={t.customDescription}
          compact
          embedded
        />
        <div className="space-y-3">
          <Label htmlFor="quote-custom">{t.customLabel}</Label>
          <Textarea
            id="quote-custom"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={t.customPlaceholder}
          />
          <LoadingButton
            type="button"
            variant="outline"
            className={cn(railBtnOutline, "w-full")}
            disabled={!value.trim()}
            isLoading={busy}
            loadingText={t.sending}
            icon={<Plus className="size-4" />}
            onClick={onSubmit}
          >
            {t.addForReview}
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
  t,
  language,
}: {
  pdfUrl: string;
  shareUrl: string;
  quoteRef: string;
  t: QuoteCopy;
  language: CustomerLanguage;
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
          title={t.shareTitle}
          description={t.shareDescription}
          compact
          embedded
        />
        <Button asChild className={cn(railBtnPrimary, "w-full")}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="size-4" />
            {t.viewPdf}
          </a>
        </Button>
        <div className="mt-3 border-t border-border/30 pt-3">
          <QuoteShareBar
            shareUrl={shareUrl}
            quoteRef={quoteRef}
            language={language}
            elevated
          />
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
  t,
  compact,
}: {
  item: QuoteUpsellItem;
  busy: boolean;
  disabled: boolean;
  onRequest: () => void;
  t: QuoteCopy;
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
            {t.pendingAfterRequest}
          </p>
        </div>
      </div>
      <LoadingButton
        type="button"
        variant="outline"
        className={cn(railBtnOutline, "mt-3 w-full")}
        disabled={disabled && !busy}
        isLoading={busy}
        loadingText={t.sending}
        icon={<Plus className="size-4" />}
        onClick={onRequest}
      >
        {t.addForReview}
      </LoadingButton>
    </div>
  );
}

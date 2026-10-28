"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ClipboardList,
  Download,
  FileSignature,
  ExternalLink,
  Fingerprint,
  Hammer,
  Languages,
  Lock,
  Mail,
  MapPin,
  PackageOpen,
  PartyPopper,
  PenLine,
  ScrollText,
  ShieldCheck,
  Stamp,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { CelebrationConfetti } from "@/components/ui/celebration-confetti";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  SignatureAdopter,
  adoptedSignatureImage,
} from "@/components/signing/signature-adopter";
import { renderScriptToPng, signatureFont } from "@/components/signing/signature-font";
import { QuoteTermsList } from "@/components/quotes/quote-terms-list";
import { formatQuoteDate, localizeQuoteApiError, getQuoteCopy } from "@/data/quote-copy";
import { quotePaymentRows } from "@/data/quote-payment-terms";
import {
  QUOTE_SCHEDULE_COPY,
  quoteScheduleRows,
  type QuoteScheduleKey,
} from "@/data/quote-schedule";
import { OptionCard } from "@/components/estimate/option-card";
import {
  QUOTE_SIGNING_COPY,
  SIGNING_CLAUSE_KEYS,
  SIGNING_CODE_LENGTH,
  SIGNING_LANGUAGE_CHOICE,
  SIGNING_RESEND_COOLDOWN_SECONDS,
  buildSigningClauses,
  initialsFromName,
  maskEmail,
  signingConsentText,
  type QuoteAgreementSummary,
  type SignatureMethod,
  type SigningClause,
  type SigningClauseKey,
} from "@/data/quote-signing";
import {
  DEFAULT_QUOTE_TERMS,
  DEFAULT_QUOTE_TERMS_FR,
  formatMoneyFromCents,
  formatQuoteQuantity,
  getQuoteTaxBreakdownRows,
  type CustomerSafeQuote,
} from "@/data/quotes";
import { customerLocaleTag, type CustomerLanguage } from "@/data/customer-language";
import { siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";

type Step = "verify" | "review" | "terms" | "sign" | "done";
const STEPS: Array<{ key: Exclude<Step, "done">; icon: LucideIcon }> = [
  { key: "verify", icon: ShieldCheck },
  { key: "review", icon: ClipboardList },
  { key: "terms", icon: Stamp },
  { key: "sign", icon: PenLine },
];

const SCHEDULE_ICONS: Record<QuoteScheduleKey, LucideIcon> = {
  install: Hammer,
  event: PartyPopper,
  teardown: PackageOpen,
};

const cardClass =
  "relative overflow-hidden rounded-2xl border border-border/40 bg-card/25 ring-1 ring-foreground/5";

function StepHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {body ? <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p> : null}
    </div>
  );
}

function IconBadge({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20",
        className
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function SelectCircle({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60"
      )}
    >
      {selected ? <Check className="size-3" strokeWidth={3} /> : null}
    </span>
  );
}

function CheckTile({
  checked,
  onToggle,
  icon,
  title,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  icon: LucideIcon;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        checked && "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <IconBadge icon={icon} />
      <span className="min-w-0 flex-1">
        {title ? <span className="block text-sm font-semibold text-foreground">{title}</span> : null}
        <span className={cn("block text-sm leading-relaxed text-muted-foreground", title && "mt-1")}>
          {children}
        </span>
      </span>
      <SelectCircle selected={checked} />
    </button>
  );
}

function CodeBoxes({
  value,
  onChange,
  onComplete,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        aria-label={label}
        value={value}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={SIGNING_CODE_LENGTH}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, SIGNING_CODE_LENGTH);
          onChange(next);
          if (next.length === SIGNING_CODE_LENGTH) onComplete(next);
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="grid grid-cols-6 gap-2 sm:gap-3" aria-hidden>
        {Array.from({ length: SIGNING_CODE_LENGTH }, (_, index) => {
          const char = value[index] ?? "";
          const active = focused && index === Math.min(value.length, SIGNING_CODE_LENGTH - 1);
          return (
            <div
              key={index}
              className={cn(
                "flex h-14 items-center justify-center rounded-xl border bg-background/50 font-mono text-2xl font-semibold text-foreground transition sm:h-16",
                char ? "border-primary/50" : "border-border/50",
                active && "border-primary ring-3 ring-primary/25"
              )}
            >
              {char}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InitialStamp({
  initials,
  stampedAt,
  onToggle,
  labels,
  locale,
}: {
  initials: string;
  stampedAt: string | null;
  onToggle: () => void;
  labels: { initialHere: string; initialed: string };
  locale: string;
}) {
  const stamped = Boolean(stampedAt);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={stamped}
      className={cn(
        "flex w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 transition-all sm:w-32",
        stamped
          ? "border-primary/50 bg-[#fbf8f1] shadow-[0_10px_30px_-18px_rgba(212,175,55,0.8)]"
          : "border-dashed border-primary/45 bg-primary/5 text-primary hover:bg-primary/10"
      )}
    >
      {stamped ? (
        <>
          <span className={cn(signatureFont.className, "text-3xl leading-none text-[#14121a]")}>
            {initials}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium text-[#14121a]/60">
            <Check className="size-3" strokeWidth={3} />
            {labels.initialed} ·{" "}
            {new Date(stampedAt!).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
          </span>
        </>
      ) : (
        <>
          <Stamp className="size-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">{labels.initialHere}</span>
        </>
      )}
    </button>
  );
}

function ClauseCard({
  clause,
  index,
  initials,
  stampedAt,
  onToggle,
  labels,
  locale,
}: {
  clause: SigningClause;
  index: number;
  initials: string;
  stampedAt: string | null;
  onToggle: () => void;
  labels: { initialHere: string; initialed: string };
  locale: string;
}) {
  return (
    <div className={cn(cardClass, "p-4 sm:p-5", stampedAt && "border-primary/35")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
              {index + 1}
            </span>
            <h3 className="font-heading text-base font-semibold text-foreground">{clause.title}</h3>
          </div>
          {clause.facts.length ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              {clause.facts.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-border/35 bg-background/40 px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{fact.label}</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="text-sm leading-relaxed text-muted-foreground">{clause.statement}</p>
        </div>
        <InitialStamp
          initials={initials}
          stampedAt={stampedAt}
          onToggle={onToggle}
          labels={labels}
          locale={locale}
        />
      </div>
    </div>
  );
}

export function QuoteSigningCeremony({
  open,
  onOpenChange,
  quotes,
  frenchVersionProvided,
  actionEndpoint,
  agreementPdfUrl,
  frenchPdfUrl,
  preview = false,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The same quote in French and English; the signer picks which one binds them. */
  quotes: Record<CustomerLanguage, CustomerSafeQuote>;
  /** The French version already reached the customer (emailed PDF or opened PDF). */
  frenchVersionProvided: boolean;
  actionEndpoint: string;
  agreementPdfUrl: string | null;
  /** French PDF of the proposal; opening it provides the French version before choosing English. */
  frenchPdfUrl: string;
  preview?: boolean;
  onSigned: (agreement: QuoteAgreementSummary) => void;
}) {
  const [language, setLanguage] = useState<CustomerLanguage>("fr");
  const [frenchOpened, setFrenchOpened] = useState(frenchVersionProvided);
  const quote = quotes[language];
  const englishNeedsFrench = language === "en" && !frenchOpened;
  const L = SIGNING_LANGUAGE_CHOICE;
  const s = QUOTE_SIGNING_COPY[language];
  const t = getQuoteCopy(language);
  const locale = customerLocaleTag(language);
  const currency = quote.currency === "USD" ? "USD" : "CAD";
  const money = (cents: number) => formatMoneyFromCents(cents, language, currency);
  const clauses = useMemo(() => buildSigningClauses(quote, language), [quote, language]);
  const scheduleRows = quoteScheduleRows(quote, language);
  const paymentRows = quotePaymentRows(quote, language);
  const taxRows = getQuoteTaxBreakdownRows(quote, { variant: "customer", language, currency });
  const items = quote.line_items.filter((item) => item.status === "priced" || item.status === "included");
  const venue = [quote.venue_name, quote.venue_address].filter(Boolean).join(", ") || quote.city_area;

  const [step, setStep] = useState<Step>("verify");
  const [signerName, setSignerName] = useState(quote.customer_name || "");
  const [signerTitle, setSignerTitle] = useState("");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [signingToken, setSigningToken] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [initialsOverride, setInitialsOverride] = useState<string | null>(null);
  const [initialedAt, setInitialedAt] = useState<Partial<Record<SigningClauseKey, string>>>({});
  const [agreeAll, setAgreeAll] = useState(false);
  const [method, setMethod] = useState<SignatureMethod>("typed");
  const [drawnImage, setDrawnImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [agreement, setAgreement] = useState<QuoteAgreementSummary | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const initials = (initialsOverride ?? initialsFromName(signerName)).slice(0, 4);
  const allInitialed = SIGNING_CLAUSE_KEYS.every((key) => Boolean(initialedAt[key]));
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const stepIndex = STEPS.findIndex((item) => item.key === step);
  const today = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  function goTo(next: Step) {
    setError(null);
    setStep(next);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function call(payload: Record<string, unknown>) {
    const res = await fetch(actionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, language }),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data?.ok) {
      throw new Error(localizeQuoteApiError(data?.message as string | undefined, language) || t.errorGeneric);
    }
    return data;
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  function chooseLanguage(next: CustomerLanguage) {
    setError(null);
    setLanguage(next);
  }

  function sendCode() {
    if (englishNeedsFrench) {
      setError(L.errors.frenchFirst);
      return;
    }
    if (signerName.trim().length < 2) {
      setError(s.errors.name);
      return;
    }
    void run(async () => {
      if (preview) {
        setSignatureId("preview");
        setMaskedEmail(maskEmail(quote.customer_email));
        setNote(s.previewNote);
      } else {
        const data = await call({ action: "signing_send_code", signatureId });
        setSignatureId(data.signatureId as string);
        setMaskedEmail(data.maskedEmail as string);
      }
      setCode("");
      const at = Date.now();
      setNow(at);
      setResendAt(at + SIGNING_RESEND_COOLDOWN_SECONDS * 1000);
    });
  }

  function verifyCode(value = code) {
    if (value.length !== SIGNING_CODE_LENGTH) {
      setError(s.errors.code);
      return;
    }
    void run(async () => {
      if (preview) {
        setSigningToken("preview");
      } else {
        const data = await call({ action: "signing_verify_code", signatureId, code: value });
        setSigningToken(data.signingToken as string);
      }
      goTo("review");
    });
  }

  function continueFromTerms() {
    if (!allInitialed || !initials) return setError(s.errors.initials);
    if (!agreeAll) return setError(s.errors.agreeAll);
    goTo("sign");
  }

  function toggleInitial(key: SigningClauseKey) {
    setError(null);
    setInitialedAt((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = new Date().toISOString();
      return next;
    });
  }

  function sign() {
    if (method === "drawn" && !drawnImage) return setError(s.errors.signature);
    if (!consent) return setError(s.errors.consent);
    void run(async () => {
      const signatureImage = await adoptedSignatureImage({ method, name: signerName, drawnImage });
      if (!signatureImage) throw new Error(s.errors.signature);
      if (preview) {
        setNote(s.previewNote);
        goTo("done");
        return;
      }
      const initialsImage = await renderScriptToPng(initials, { width: 220, height: 96, maxFontSize: 64 });
      const data = await call({
        action: "sign",
        signatureId,
        signingToken,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim() || null,
        method,
        signatureImage,
        initials,
        initialsImage,
        initialedAt,
        agreeAll,
        consent,
      });
      const signed = data.agreement as QuoteAgreementSummary;
      setAgreement(signed);
      onSigned(signed);
      goTo("done");
    });
  }

  const footer = (() => {
    switch (step) {
      case "verify":
        return signatureId ? (
          <LoadingButton
            type="button"
            className="h-11 flex-1 rounded-full sm:flex-none sm:px-8"
            isLoading={busy}
            loadingText={s.verifyCode}
            disabled={code.length !== SIGNING_CODE_LENGTH}
            icon={<BadgeCheck className="size-4" />}
            onClick={() => verifyCode()}
          >
            {s.verifyCode}
          </LoadingButton>
        ) : (
          <LoadingButton
            type="button"
            className="h-11 flex-1 rounded-full sm:flex-none sm:px-8"
            isLoading={busy}
            loadingText={s.sendCode}
            disabled={signerName.trim().length < 2 || englishNeedsFrench}
            icon={<Mail className="size-4" />}
            onClick={sendCode}
          >
            {s.sendCode}
          </LoadingButton>
        );
      case "review":
        return (
          <Button type="button" className="h-11 flex-1 rounded-full sm:flex-none sm:px-8" onClick={() => goTo("terms")}>
            {s.next}
            <ArrowRight className="size-4" />
          </Button>
        );
      case "terms":
        return (
          <>
            <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => goTo("review")}>
              <ArrowLeft className="size-4" />
              {s.back}
            </Button>
            <Button type="button" className="h-11 flex-1 rounded-full sm:flex-none sm:px-8" onClick={continueFromTerms}>
              {s.next}
              <ArrowRight className="size-4" />
            </Button>
          </>
        );
      case "sign":
        return (
          <>
            <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => goTo("terms")} disabled={busy}>
              <ArrowLeft className="size-4" />
              {s.back}
            </Button>
            <LoadingButton
              type="button"
              className="h-11 flex-1 rounded-full sm:flex-none sm:px-8"
              isLoading={busy}
              loadingText={s.signing}
              icon={<FileSignature className="size-4" />}
              onClick={sign}
            >
              {s.signAndAccept}
            </LoadingButton>
          </>
        );
      case "done":
        return (
          <>
            {agreement && agreementPdfUrl ? (
              <Button asChild variant="outline" className="h-11 rounded-full">
                <a href={agreementPdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  {s.downloadSigned}
                </a>
              </Button>
            ) : null}
            <Button type="button" className="h-11 flex-1 rounded-full sm:flex-none sm:px-8" onClick={() => onOpenChange(false)}>
              {s.finish}
            </Button>
          </>
        );
    }
  })();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-0 z-[210] flex flex-col bg-background text-foreground outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 sm:inset-4 sm:rounded-[28px] sm:border sm:border-primary/20 sm:shadow-[0_40px_120px_-40px_rgba(212,175,55,0.45)]"
        >
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden sm:rounded-[28px]"
            aria-hidden
          >
            <div className="absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.16),transparent_65%)]" />
          </div>

          <header className="relative flex items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
            <IconBadge icon={FileSignature} className="size-8" />
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-heading text-base font-semibold leading-tight text-foreground">
                <span className="hidden sm:inline">{s.ceremonyTitle} · </span>
                {quote.quote_display_ref}
              </DialogPrimitive.Title>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="size-3 text-primary" aria-hidden />
                {s.secureBadge} · {siteConfig.name}
              </p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" className="rounded-full" disabled={busy}>
                <X className="size-4" />
                <span className="sr-only">{s.close}</span>
              </Button>
            </DialogPrimitive.Close>
          </header>

          {step !== "done" ? (
            <nav aria-label={s.ceremonyTitle} className="relative border-b border-border/30 px-4 py-3 sm:px-6">
              <ol className="mx-auto flex max-w-3xl items-center gap-2">
                {STEPS.map((item, index) => {
                  const Icon = item.icon;
                  const complete = index < stepIndex;
                  const current = index === stepIndex;
                  return (
                    <li key={item.key} className="flex flex-1 items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs transition",
                          complete && "border-primary bg-primary text-primary-foreground",
                          current && "border-primary bg-primary/15 text-primary ring-3 ring-primary/20",
                          !complete && !current && "border-border/50 text-muted-foreground"
                        )}
                        aria-current={current ? "step" : undefined}
                      >
                        {complete ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
                      </span>
                      <span
                        className={cn(
                          "hidden text-xs font-medium sm:inline",
                          current ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {s.steps[item.key]}
                      </span>
                      {index < STEPS.length - 1 ? (
                        <span
                          className={cn(
                            "h-px flex-1 rounded-full",
                            index < stepIndex ? "bg-primary/60" : "bg-border/50"
                          )}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}

          <div ref={bodyRef} className="relative flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
              {note ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">
                  {note}
                </div>
              ) : null}

              {step === "verify" ? (
                <>
                  <StepHeading
                    eyebrow={s.verifyEyebrow}
                    title={s.verifyTitle}
                    body={s.verifyBody(maskedEmail ?? maskEmail(quote.customer_email))}
                  />
                  <div className={cn(cardClass, "space-y-4 p-4 sm:p-5")}>
                    <div
                      className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.16),transparent_70%)]"
                      aria-hidden
                    />
                    <div className="flex items-start gap-3">
                      <IconBadge icon={Languages} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-heading text-base font-semibold text-foreground">{L.heading}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{L.body}</p>
                      </div>
                    </div>
                    <div role="radiogroup" aria-label={L.heading} className="grid gap-3 sm:grid-cols-2">
                      {(["fr", "en"] as const).map((lang) => (
                        <OptionCard
                          key={lang}
                          option={{
                            id: lang,
                            label: L.options[lang].label,
                            description: L.options[lang].description,
                            icon: Languages,
                          }}
                          selected={language === lang}
                          onSelect={() => chooseLanguage(lang)}
                        />
                      ))}
                    </div>
                    {language === "en" ? (
                      frenchOpened ? (
                        <p className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                          <BadgeCheck className="size-3.5" aria-hidden />
                          {L.frenchFirst.opened}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-sm font-medium text-foreground">{L.frenchFirst.title}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">{L.frenchFirst.body}</p>
                          </div>
                          <Button asChild variant="outline" className="h-10 shrink-0 rounded-full">
                            <a
                              href={frenchPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              lang="fr"
                              onClick={() => setFrenchOpened(true)}
                            >
                              <ExternalLink className="size-4" aria-hidden />
                              {L.frenchFirst.open}
                            </a>
                          </Button>
                        </div>
                      )
                    ) : null}
                  </div>
                  <div className={cn(cardClass, "space-y-4 p-5")}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="sign-name">{s.fullName}</Label>
                        <Input
                          id="sign-name"
                          value={signerName}
                          onChange={(event) => setSignerName(event.target.value)}
                          autoComplete="name"
                          placeholder={s.fullNamePlaceholder}
                          disabled={Boolean(signatureId) || busy}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sign-title">{s.titleLabel}</Label>
                        <Input
                          id="sign-title"
                          value={signerTitle}
                          onChange={(event) => setSignerTitle(event.target.value)}
                          autoComplete="organization-title"
                          placeholder={s.titlePlaceholder}
                          disabled={busy}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-border/35 bg-background/40 px-3 py-2.5">
                      <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {maskedEmail ?? maskEmail(quote.customer_email)}
                      </span>
                      <ShieldCheck className="size-4 text-primary/70" aria-hidden />
                    </div>
                  </div>

                  {signatureId ? (
                    <div className={cn(cardClass, "space-y-4 p-5")}>
                      <p className="text-sm text-muted-foreground">
                        {s.codeSent(maskedEmail ?? "")}
                      </p>
                      <CodeBoxes
                        value={code}
                        onChange={(value) => {
                          setError(null);
                          setCode(value);
                        }}
                        onComplete={(value) => verifyCode(value)}
                        label={s.codeLabel}
                        disabled={busy}
                      />
                      <button
                        type="button"
                        onClick={sendCode}
                        disabled={resendIn > 0 || busy}
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                      >
                        {resendIn > 0 ? s.resendIn(resendIn) : s.resendCode}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {step === "review" ? (
                <>
                  <StepHeading eyebrow={s.reviewEyebrow} title={s.reviewTitle} body={s.reviewBody} />
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 w-fit">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {s.verified} · {signerName.trim()}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(scheduleRows.length
                      ? scheduleRows
                      : [{ key: "event" as const, label: QUOTE_SCHEDULE_COPY[language].event, date: quote.event_date, window: null }]
                    ).map((row) => {
                      const Icon = SCHEDULE_ICONS[row.key];
                      return (
                        <div key={row.key} className={cn(cardClass, "flex items-start gap-3 p-4")}>
                          <IconBadge icon={Icon} />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{row.label}</p>
                            <p className="mt-0.5 font-heading text-base font-semibold text-foreground">
                              {formatQuoteDate(row.date, language, "—")}
                            </p>
                            {row.window ? <p className="text-xs text-muted-foreground">{row.window}</p> : null}
                          </div>
                        </div>
                      );
                    })}
                    {venue ? (
                      <div className={cn(cardClass, "flex items-start gap-3 p-4")}>
                        <IconBadge icon={MapPin} />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t.pdf.venue}</p>
                          <p className="mt-0.5 text-sm font-medium text-foreground">{venue}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={cn(cardClass, "flex items-start gap-3 p-4")}>
                      <IconBadge icon={UserRound} />
                      <div className="min-w-0 text-sm">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t.pdf.client}</p>
                        <p className="mt-0.5 font-medium text-foreground">
                          {quote.bill_to?.company_name || quote.customer_name || signerName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{quote.customer_email}</p>
                      </div>
                    </div>
                    <div className={cn(cardClass, "flex items-start gap-3 p-4")}>
                      <IconBadge icon={Building2} />
                      <div className="min-w-0 text-sm">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{siteConfig.name}</p>
                        <p className="mt-0.5 font-medium text-foreground">9395-2521 Québec Inc.</p>
                        <p className="truncate text-xs text-muted-foreground">{siteConfig.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className={cardClass}>
                    <div className="flex items-center gap-3 border-b border-border/30 bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
                      <IconBadge icon={ClipboardList} className="size-8" />
                      <p className="flex-1 font-heading text-base font-semibold text-foreground">{s.scopeTitle}</p>
                      <span className="rounded-full border border-border/40 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        {s.itemsCount(items.length)}
                      </span>
                    </div>
                    <ul className="max-h-72 divide-y divide-border/25 overflow-y-auto">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                          <span className="min-w-0 flex-1 text-foreground">{item.description}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatQuoteQuantity(item.quantity, item.unit_label, language)}
                          </span>
                          <span className="w-24 shrink-0 text-right font-medium text-foreground">
                            {item.status === "included" ? t.included : money(item.line_total_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-1.5 border-t border-border/30 bg-background/30 px-4 py-3 text-sm">
                      {taxRows.map((row) => (
                        <div
                          key={row.key}
                          className={cn(
                            "flex justify-between gap-3",
                            row.emphasis === "total"
                              ? "pt-1 font-heading text-lg font-semibold text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          <span>{row.emphasis === "total" ? s.totalLabel : row.label}</span>
                          <span>{money(row.amountCents)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {paymentRows.length ? (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                        <Wallet className="size-3.5" aria-hidden />
                        {s.paymentTitle}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {paymentRows.map((row) => (
                          <div key={row.key} className={cn(cardClass, "p-4")}>
                            <p className="text-xs text-muted-foreground">{row.label}</p>
                            <p className="mt-1 font-heading text-xl font-semibold text-foreground">
                              {money(row.amountCents)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {row.due}
                              {row.detail ? ` · ${row.detail}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {quote.valid_until ? (
                    <p className="text-xs text-muted-foreground">
                      {s.validUntil} {formatQuoteDate(quote.valid_until, language, "")}
                    </p>
                  ) : null}
                </>
              ) : null}

              {step === "terms" ? (
                <>
                  <StepHeading eyebrow={s.termsEyebrow} title={s.termsTitle} body={s.termsBody} />
                  <div className={cn(cardClass, "flex flex-wrap items-center gap-4 p-4")}>
                    <IconBadge icon={Stamp} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Label htmlFor="sign-initials">{s.initialsLabel}</Label>
                      <Input
                        id="sign-initials"
                        value={initials}
                        maxLength={4}
                        className="w-28 uppercase"
                        onChange={(event) => {
                          setInitialsOverride(event.target.value.toLocaleUpperCase());
                          setInitialedAt({});
                        }}
                      />
                    </div>
                    <div className="flex h-16 w-28 items-center justify-center rounded-xl border border-primary/40 bg-[#fbf8f1]">
                      <span className={cn(signatureFont.className, "text-4xl leading-none text-[#14121a]")}>
                        {initials || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {clauses.map((clause, index) => (
                      <ClauseCard
                        key={clause.key}
                        clause={clause}
                        index={index}
                        initials={initials}
                        stampedAt={initialedAt[clause.key] ?? null}
                        onToggle={() => (initials ? toggleInitial(clause.key) : setError(s.errors.initials))}
                        labels={s}
                        locale={locale}
                      />
                    ))}
                  </div>

                  <details className={cn(cardClass, "group")}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                      <IconBadge icon={ScrollText} className="size-8" />
                      <span className="flex-1 font-heading text-base font-semibold text-foreground">
                        {s.fullTermsTitle}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground transition group-open:rotate-90" />
                    </summary>
                    <div className="max-h-80 overflow-y-auto border-t border-border/30 px-4 py-4">
                      <QuoteTermsList
                        terms={quote.terms}
                        fallback={language === "fr" ? DEFAULT_QUOTE_TERMS_FR : DEFAULT_QUOTE_TERMS}
                        compact
                      />
                    </div>
                  </details>

                  <CheckTile checked={agreeAll} onToggle={() => setAgreeAll((value) => !value)} icon={ScrollText}>
                    {s.agreeAll}
                  </CheckTile>
                </>
              ) : null}

              {step === "sign" ? (
                <>
                  <StepHeading eyebrow={s.signEyebrow} title={s.signTitle} body={s.signBody} />
                  <SignatureAdopter
                    name={signerName}
                    method={method}
                    onMethodChange={(next) => {
                      setError(null);
                      setMethod(next);
                      setDrawnImage(null);
                    }}
                    drawnImage={drawnImage}
                    onDrawnChange={setDrawnImage}
                    labels={{
                      typeTab: s.typeTab,
                      drawTab: s.drawTab,
                      drawHint: s.drawHint,
                      clear: s.clear,
                      caption: `${s.signatureOf(signerName.trim())}${signerTitle.trim() ? `, ${signerTitle.trim()}` : ""} · ${today}`,
                    }}
                  />
                  <CheckTile
                    checked={consent}
                    onToggle={() => setConsent((value) => !value)}
                    icon={ShieldCheck}
                    title={s.consentTitle}
                  >
                    {signingConsentText(language, signerName.trim(), quote.quote_display_ref)}
                  </CheckTile>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    {s.legalNote}
                  </p>
                </>
              ) : null}

              {step === "done" ? (
                <div className="space-y-6 text-center">
                  {agreement ? <CelebrationConfetti /> : null}
                  <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_60px_-10px_rgba(212,175,55,0.7)]">
                    <FileSignature className="size-9 text-primary" aria-hidden />
                  </div>
                  <StepHeading eyebrow={s.doneEyebrow} title={s.doneTitle} />
                  <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">{s.doneBody}</p>
                  {agreement ? (
                    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-[#fbf8f1] text-left shadow-[0_30px_80px_-40px_rgba(212,175,55,0.7)]">
                      <div className="flex h-32 items-center justify-center border-b border-dashed border-[#14121a]/20 px-6">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL signature */}
                        <img src={agreement.signatureImage} alt={s.signatureOf(agreement.signerName)} className="max-h-24 max-w-full object-contain" />
                      </div>
                      <div className="space-y-1 px-5 py-4 text-[#14121a]">
                        <p className="text-sm font-semibold">{agreement.signerName}</p>
                        <p className="text-xs text-[#14121a]/60">
                          {s.signedOn} {new Date(agreement.signedAt).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" })}
                        </p>
                        <p className="flex items-center gap-1.5 pt-1 font-mono text-[10px] text-[#14121a]/50">
                          <Fingerprint className="size-3" aria-hidden />
                          {agreement.documentHash.slice(0, 32)}…
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                    <Stamp className="size-3.5" aria-hidden />
                    {s.awaitingCountersign}
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200" role="alert">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <footer className="relative flex items-center justify-end gap-2 border-t border-border/40 bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
            {footer}
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { eventTypes } from "@/data/estimate";
import { formatCadFromCents } from "@/data/rentals";
import { siteConfig } from "@/data/site";
import { useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { Link } from "@/i18n/navigation";
import { useRentalsCart } from "@/components/rentals/rentals-cart-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { GuardedLink } from "@/components/ui/guarded-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { CurtainReveal } from "@/components/ui/curtain-reveal";
import { CelebrationConfetti } from "@/components/ui/celebration-confetti";
import { cn } from "@/lib/utils";

export type RentalsCheckoutDefaultContact = {
  name: string;
  email: string;
  phone: string;
};

type RentalsCheckoutFormProps = {
  defaultContact?: RentalsCheckoutDefaultContact;
  /** When true, skip guest signup CTA (signed-in customer/owner). */
  isAuthenticated?: boolean;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  eventType: string;
  venueName: string;
  cityArea: string;
  message: string;
};

export function RentalsCheckoutForm({
  defaultContact,
  isAuthenticated = false,
}: RentalsCheckoutFormProps) {
  const t = useTranslations("rentals.checkout");
  const eventTypeOptions = useLocalizedEventTypes();
  const { lines, subtotalCents, clear, itemCount } = useRentalsCart();

  const [form, setForm] = useState<FormState>({
    name: defaultContact?.name ?? "",
    email: defaultContact?.email ?? "",
    phone: defaultContact?.phone ?? "",
    eventDate: "",
    eventType: eventTypes[0]?.id ?? "other",
    venueName: "",
    cityArea: "",
    message: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    opportunityRef: string | null;
    estimateTotalCents: number;
  } | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || success) return;
    if (!lines.length) {
      setSubmitError(t("emptyCart"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/rentals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          website: honeypot,
          lines,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string>;
        opportunityRef?: string | null;
        estimateTotalCents?: number;
      };

      if (!response.ok || !payload.ok) {
        if (payload.fieldErrors) setFieldErrors(payload.fieldErrors);
        setSubmitError(payload.message ?? t("errors.generic"));
        return;
      }

      clear();
      setSuccess({
        opportunityRef: payload.opportunityRef ?? null,
        estimateTotalCents: payload.estimateTotalCents ?? subtotalCents,
      });
    } catch {
      setSubmitError(t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <CurtainReveal contentClassName="min-h-[min(20rem,50vh)] space-y-4 text-center">
        <CelebrationConfetti />
        <span
          className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25"
          aria-hidden
        >
          <CheckCircle2 className="size-7" />
        </span>
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
          {t("success.eyebrow")}
        </p>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          {t("success.title")}
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
          {t("success.description")}
        </p>
        {success.opportunityRef ? (
          <div className="mx-auto w-full max-w-sm rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("success.reference")}
            </p>
            <p className="mt-1 font-heading text-xl font-semibold">
              {success.opportunityRef}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 text-primary" aria-hidden />
            {t("success.responseTime")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden />
            {siteConfig.location}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
        {!isAuthenticated ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4">
            <p className="text-sm font-medium text-foreground">
              {t("success.guestCta")}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <GuardedLink
                  href={`/account/signup?email=${encodeURIComponent(form.email.trim())}`}
                >
                  <UserPlus className="size-4" />
                  {t("success.createAccount")}
                </GuardedLink>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <GuardedLink href="/account/login">
                  {t("success.signIn")}
                </GuardedLink>
              </Button>
            </div>
          </div>
        ) : (
          <Button asChild className="min-h-10">
            <Link href="/account/estimates">{t("success.viewAccount")}</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="min-h-10">
          <Link href="/rentals">{t("success.backToRentals")}</Link>
        </Button>
      </CurtainReveal>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <Card className="gap-0 overflow-hidden border-border/40 bg-card/40 py-0">
        <div className="relative border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/40 to-transparent px-5 py-5 sm:px-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.12),transparent_55%)]"
            aria-hidden
          />
          <div className="relative">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
              {t("formEyebrow")}
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold sm:text-2xl">
              {t("formTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("formDescription")}
            </p>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6">
          {itemCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t("emptyCart")}</p>
              <Button asChild className="mt-4 min-h-10">
                <Link href="/rentals">{t("browse")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rentals-name">
                    {t("fields.name")} <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="rentals-name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    required
                  />
                  {fieldErrors.name ? (
                    <p className="text-xs text-destructive">{fieldErrors.name}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentals-email">
                    {t("fields.email")} <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="rentals-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    required
                  />
                  {fieldErrors.email ? (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rentals-phone">{t("fields.phone")}</Label>
                <Input
                  id="rentals-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rentals-event-date">
                    {t("fields.eventDate")}
                  </Label>
                  <DateInput
                    id="rentals-event-date"
                    value={form.eventDate}
                    onChange={(value) => updateField("eventDate", value)}
                    placeholder={t("fields.eventDatePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentals-event-type">
                    {t("fields.eventType")}
                  </Label>
                  <div className="relative">
                    <select
                      id="rentals-event-type"
                      value={form.eventType}
                      onChange={(e) => updateField("eventType", e.target.value)}
                      className={cn(
                        "flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 pr-8 text-sm outline-none",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                      )}
                    >
                      {eventTypeOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rentals-venue">{t("fields.venue")}</Label>
                  <Input
                    id="rentals-venue"
                    value={form.venueName}
                    onChange={(e) => updateField("venueName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentals-city">
                    {t("fields.city")} <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="rentals-city"
                    value={form.cityArea}
                    onChange={(e) => updateField("cityArea", e.target.value)}
                    aria-invalid={fieldErrors.cityArea ? true : undefined}
                    required
                  />
                  {fieldErrors.cityArea ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.cityArea}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rentals-message">{t("fields.message")}</Label>
                <Textarea
                  id="rentals-message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>

              {/* Honeypot */}
              <div className="absolute -left-[9999px] opacity-0" aria-hidden>
                <Label htmlFor="rentals-website">Website</Label>
                <Input
                  id="rentals-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {submitError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              ) : null}

              <p className="rounded-xl border border-border/30 bg-background/30 px-3 py-2.5 text-xs text-muted-foreground">
                {t("disclaimer")}
              </p>

              <LoadingButton
                type="submit"
                className="min-h-11 w-full sm:w-auto"
                isLoading={isSubmitting}
              >
                {t("submit")}
              </LoadingButton>
            </form>
          )}
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border/40 bg-card/30 p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            {t("summaryEyebrow")}
          </p>
          <h3 className="mt-1 font-heading text-lg font-semibold">
            {t("summaryTitle")}
          </h3>
          <p className="mt-3 font-heading text-2xl font-semibold text-foreground">
            {formatCadFromCents(subtotalCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("summaryItems", { count: itemCount })}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {t("disclaimer")}
          </p>
        </div>
      </aside>
    </div>
  );
}

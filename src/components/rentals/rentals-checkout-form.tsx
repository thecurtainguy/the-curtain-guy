"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { eventTypes } from "@/data/estimate";
import { formatCadFromCents } from "@/data/rentals";
import {
  formatLogisticsEstimateLabel,
  getRentalDeliveryZone,
  isRentalDeliveryZoneId,
  type RentalDeliveryZoneId,
} from "@/data/rentals-logistics";
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
  venueAddress: string;
  message: string;
};

export function RentalsCheckoutForm({
  defaultContact,
  isAuthenticated = false,
}: RentalsCheckoutFormProps) {
  const t = useTranslations("rentals.checkout");
  const eventTypeOptions = useLocalizedEventTypes();
  const {
    lines,
    checkoutLines,
    subtotalCents,
    clear,
    itemCount,
    logisticsMode,
    deliveryZoneId,
    setDeliveryZoneId,
    deliveryZones,
    logisticsLine,
    merchandiseSubtotalCents,
  } = useRentalsCart();

  const [form, setForm] = useState<FormState>({
    name: defaultContact?.name ?? "",
    email: defaultContact?.email ?? "",
    phone: defaultContact?.phone ?? "",
    eventDate: "",
    eventType: eventTypes[0]?.id ?? "other",
    venueName: "",
    venueAddress: "",
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
    if (!deliveryZoneId) {
      setFieldErrors((prev) => ({
        ...prev,
        deliveryZoneId: t("errors.zoneRequired"),
      }));
      setSubmitError(t("errors.zoneRequired"));
      return;
    }
    if (!form.venueName.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        venueName: t("errors.venueRequired"),
      }));
      setSubmitError(t("errors.venueRequired"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const zone = getRentalDeliveryZone(deliveryZoneId, deliveryZones);

    try {
      const response = await fetch("/api/rentals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          eventDate: form.eventDate,
          eventType: form.eventType,
          venueName: form.venueName,
          venueAddress: form.venueAddress,
          cityArea: zone?.label || deliveryZoneId,
          deliveryZoneId,
          logisticsMode,
          message: form.message,
          website: honeypot,
          lines: checkoutLines,
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

              <div className="space-y-2">
                <Label htmlFor="rentals-venue">
                  {t("fields.venue")} <span className="text-primary">*</span>
                </Label>
                <Input
                  id="rentals-venue"
                  value={form.venueName}
                  onChange={(e) => updateField("venueName", e.target.value)}
                  aria-invalid={fieldErrors.venueName ? true : undefined}
                  required
                />
                {fieldErrors.venueName ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.venueName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rentals-address">{t("fields.address")}</Label>
                <Input
                  id="rentals-address"
                  value={form.venueAddress}
                  onChange={(e) => updateField("venueAddress", e.target.value)}
                  placeholder={t("fields.addressPlaceholder")}
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("fields.addressHint")}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>
                    {t("fields.deliveryZone")}{" "}
                    <span className="text-primary">*</span>
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("fields.deliveryZoneHint")}
                  </p>
                </div>
                <div className="grid gap-2" role="radiogroup">
                  {deliveryZones.map((zone) => {
                    const selected = deliveryZoneId === zone.id;
                    const priceLabel =
                      logisticsMode === "diy"
                        ? t("zoneDiy")
                        : !zone.priced
                          ? t("zoneQuoteOnly")
                          : formatLogisticsEstimateLabel({
                              mode: logisticsMode,
                              zoneId: zone.id,
                              zones: deliveryZones,
                            });
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          if (isRentalDeliveryZoneId(zone.id, deliveryZones)) {
                            setDeliveryZoneId(zone.id as RentalDeliveryZoneId);
                          }
                          if (fieldErrors.deliveryZoneId) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.deliveryZoneId;
                              return next;
                            });
                          }
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                          "border-border/40 bg-background/40 hover:border-primary/30",
                          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                          selected &&
                            "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {zone.label}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-primary">
                            {priceLabel}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-background/50 text-transparent"
                          )}
                          aria-hidden
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.deliveryZoneId ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.deliveryZoneId}
                  </p>
                ) : null}
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
          <p className="mt-3 text-xs text-muted-foreground">
            {t("summaryPackages", {
              amount: formatCadFromCents(merchandiseSubtotalCents),
            })}
          </p>
          {logisticsLine ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("summaryLogistics", {
                label: logisticsLine.name,
                amount:
                  logisticsLine.unitPriceCents > 0
                    ? formatCadFromCents(logisticsLine.unitPriceCents)
                    : t("zoneQuoteOnly"),
              })}
            </p>
          ) : logisticsMode !== "diy" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("summaryLogisticsPending")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("summaryLogisticsDiy")}
            </p>
          )}
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

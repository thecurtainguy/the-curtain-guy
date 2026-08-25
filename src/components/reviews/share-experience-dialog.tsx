"use client";

import { useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  MapPin,
  MessageSquareQuote,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import {
  reviewCategories,
  type ReviewCategory,
} from "@/data/reviews";
import { siteConfig } from "@/data/site";
import { StarRatingInput } from "@/components/reviews/star-rating-input";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ReviewSubmissionData } from "@/lib/review-submission-schema";

const emptyForm: ReviewSubmissionData = {
  name: "",
  email: "",
  phone: "",
  role: "",
  organization: "",
  eventCategory: "",
  eventLabel: "",
  eventDate: "",
  venue: "",
  location: "",
  rating: 0,
  experience: "",
  servicesUsed: "",
  highlights: "",
  wouldRecommend: "",
  publishOnWebsite: false,
  okToContact: true,
};

const categoryOptions = reviewCategories.filter(
  (category) => category.id !== "all"
);

const selectClassName = cn(
  "h-8 w-full min-w-0 appearance-none rounded-2xl border border-transparent bg-input/50 px-2.5 py-1 pr-8 text-base transition-[color,box-shadow] duration-200 outline-none md:text-sm",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
);

type ShareExperienceDialogProps = {
  children: React.ReactNode;
};

function SectionCard({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/45 bg-card/30 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-heading text-base font-semibold text-foreground">
            {title}
          </h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldError({
  show,
  message,
  id,
}: {
  show: boolean;
  message?: string;
  id: string;
}) {
  if (!show || !message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function ShareExperienceDialog({ children }: ShareExperienceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ReviewSubmissionData>(emptyForm);
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  function updateField<K extends keyof ReviewSubmissionData>(
    field: K,
    value: ReviewSubmissionData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  }

  function resetForm() {
    setFormData(emptyForm);
    setHoneypot("");
    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowValidation(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || submitSuccess) return;

    setShowValidation(true);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          website: honeypot,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok || !payload.ok) {
        if (payload.fieldErrors) setFieldErrors(payload.fieldErrors);
        setSubmitError(
          payload.message ??
            "Something went wrong. Please email info@thecurtainguy.com directly."
        );
        return;
      }

      setSubmitSuccess(true);
      setFieldErrors({});
      setShowValidation(false);
    } catch {
      setSubmitError(
        "Something went wrong. Please email info@thecurtainguy.com directly."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-[min(94vh,960px)] max-h-[min(94vh,960px)] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0 sm:max-w-2xl">
        <div className="shrink-0 border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/40 to-transparent px-6 py-5 sm:px-7">
          <DialogHeader className="gap-2 text-left">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Share your experience
            </p>
            <DialogTitle className="font-heading text-2xl font-semibold text-foreground">
              Tell us about your event drape experience
            </DialogTitle>
            <DialogDescription className="max-w-xl text-sm leading-relaxed">
              Worked with us on a wedding, corporate event, gala, or production?
              Share the details — we use this to improve and may publish your
              feedback with permission.
            </DialogDescription>
          </DialogHeader>
        </div>

        {submitSuccess ? (
          <div className="luxury-scroll flex-1 overflow-y-auto px-6 py-8 sm:px-7">
            <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">
                Thank you — we got your review
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Our team will read it soon. If you opted in to publish, we may
                reach out before adding it to the site.
              </p>
              <Button
                type="button"
                className="mt-6"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            <div className="luxury-scroll flex-1 overflow-y-auto px-6 py-5 sm:px-7">
              <div className="space-y-4">
            <SectionCard icon={UserRound} eyebrow="About you" title="Who should we credit?">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="review-name">
                    Full name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="review-name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Your name"
                  />
                  <FieldError
                    show={showValidation}
                    message={fieldErrors.name}
                    id="review-name-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-email">
                    Email <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="review-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="you@example.com"
                  />
                  <FieldError
                    show={showValidation}
                    message={fieldErrors.email}
                    id="review-email-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-phone">Phone (optional)</Label>
                  <Input
                    id="review-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    disabled={isSubmitting}
                    placeholder={siteConfig.phone}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-role">Role / title</Label>
                  <Input
                    id="review-role"
                    value={formData.role}
                    onChange={(e) => updateField("role", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Bride, planner, venue manager…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-org">Company / organization</Label>
                  <Input
                    id="review-org"
                    value={formData.organization}
                    onChange={(e) => updateField("organization", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={CalendarDays} eyebrow="Your event" title="What did we drape?">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Event type <span className="text-primary">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((category) => {
                      const Icon = category.icon;
                      const active = formData.eventCategory === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            updateField("eventCategory", category.id as ReviewCategory)
                          }
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border/45 bg-background/40 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                          )}
                        >
                          {Icon ? <Icon className="size-3.5 text-primary/80" /> : null}
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError
                    show={showValidation}
                    message={fieldErrors.eventCategory}
                    id="review-category-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-event-label">Event name / label</Label>
                  <Input
                    id="review-event-label"
                    value={formData.eventLabel}
                    onChange={(e) => updateField("eventLabel", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Winter wedding, gala, launch…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-event-date">Event date</Label>
                  <DateInput
                    id="review-event-date"
                    value={formData.eventDate}
                    onChange={(value) => updateField("eventDate", value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-venue" className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary/80" />
                    Venue
                  </Label>
                  <Input
                    id="review-venue"
                    value={formData.venue}
                    onChange={(e) => updateField("venue", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Venue name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-location" className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary/80" />
                    City / area
                  </Label>
                  <Input
                    id="review-location"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Montréal, Westmount…"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={MessageSquareQuote} eyebrow="Your review" title="How did it go?">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Overall rating <span className="text-primary">*</span>
                  </Label>
                  <StarRatingInput
                    value={formData.rating}
                    onChange={(value) => updateField("rating", value)}
                    disabled={isSubmitting}
                  />
                  <FieldError
                    show={showValidation}
                    message={fieldErrors.rating}
                    id="review-rating-error"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-experience">
                    Your experience <span className="text-primary">*</span>
                  </Label>
                  <Textarea
                    id="review-experience"
                    value={formData.experience}
                    onChange={(e) => updateField("experience", e.target.value)}
                    disabled={isSubmitting}
                    rows={5}
                    placeholder="What did we install, how did the crew do, what stood out to you or your guests?"
                  />
                  <FieldError
                    show={showValidation}
                    message={fieldErrors.experience}
                    id="review-experience-error"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-services">Draping / services used</Label>
                  <Textarea
                    id="review-services"
                    value={formData.servicesUsed}
                    onChange={(e) => updateField("servicesUsed", e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder="Pipe and drape, backdrop, perimeter, blackout…"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-highlights">Anything else worth mentioning?</Label>
                  <Textarea
                    id="review-highlights"
                    value={formData.highlights}
                    onChange={(e) => updateField("highlights", e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder="Timeline, communication, venue coordination…"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-recommend">
                    Would you recommend us? <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="review-recommend"
                      value={formData.wouldRecommend}
                      onChange={(e) =>
                        updateField(
                          "wouldRecommend",
                          e.target.value as ReviewSubmissionData["wouldRecommend"]
                        )
                      }
                      disabled={isSubmitting}
                      className={cn(
                        selectClassName,
                        !formData.wouldRecommend && "text-muted-foreground"
                      )}
                    >
                      <option value="">Select one</option>
                      <option value="yes">Yes, definitely</option>
                      <option value="maybe">Maybe / depends on the project</option>
                      <option value="no">No</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <FieldError
                    show={showValidation}
                    message={fieldErrors.wouldRecommend}
                    id="review-recommend-error"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Sparkles} eyebrow="Permissions" title="How can we use this?">
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/40 p-3">
                  <input
                    type="checkbox"
                    checked={formData.publishOnWebsite}
                    onChange={(e) =>
                      updateField("publishOnWebsite", e.target.checked)
                    }
                    disabled={isSubmitting}
                    className="mt-1 size-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      OK to publish on our website
                    </span>
                    <br />
                    We may edit lightly for length and contact you before posting.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/40 p-3">
                  <input
                    type="checkbox"
                    checked={formData.okToContact}
                    onChange={(e) => updateField("okToContact", e.target.checked)}
                    disabled={isSubmitting}
                    className="mt-1 size-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      OK to contact me for follow-up
                    </span>
                    <br />
                    For clarifications, photos, or Google review invites.
                  </span>
                </label>
              </div>
            </SectionCard>

            {submitError ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border/40 bg-background/95 px-6 py-4 backdrop-blur sm:px-7">
              <LoadingButton
                type="submit"
                className="w-full min-h-11 gap-2"
                isLoading={isSubmitting}
                loadingText="Sending review…"
              >
                <Star className="size-4" />
                Submit your experience
              </LoadingButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

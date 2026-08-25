"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  MapPin,
  MessageSquare,
  Send,
} from "lucide-react";
import { eventTypes } from "@/data/estimate";
import { siteConfig } from "@/data/site";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ContactFormSuccess } from "@/components/contact/contact-form-success";
import type { ContactFormData } from "@/lib/contact-schema";

const emptyForm: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  eventType: "",
  eventDate: "",
  venue: "",
  message: "",
};

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  function updateField<K extends keyof ContactFormData>(
    field: K,
    value: ContactFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    if (isSubmitting || submitSuccess) return;

    setShowValidation(true);
    setSubmitError(null);

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
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
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        setSubmitError(
          payload.message ??
            "Something went wrong. Please email info@thecurtainguy.com directly."
        );
        return;
      }

      setSubmitSuccess(true);
      setFieldErrors({});
      setFormData(emptyForm);
      setHoneypot("");
      setShowValidation(false);
    } catch {
      setSubmitError(
        "Something went wrong. Please email info@thecurtainguy.com directly."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitSuccess) {
    return (
      <ContactFormSuccess
        onSendAnother={() => {
          setSubmitSuccess(false);
          setSubmitError(null);
          setShowValidation(false);
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
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

      <div className="space-y-2">
        <Label htmlFor="contact-name">
          Name <span className="text-primary">*</span>
        </Label>
        <Input
          id="contact-name"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
        />
        {showValidation && fieldErrors.name ? (
          <p id="contact-name-error" className="text-xs text-destructive">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email">
          Email <span className="text-primary">*</span>
        </Label>
        <Input
          id="contact-email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
        />
        {showValidation && fieldErrors.email ? (
          <p id="contact-email-error" className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-phone">Phone (optional)</Label>
        <Input
          id="contact-phone"
          type="tel"
          placeholder={siteConfig.phone}
          value={formData.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? "contact-phone-error" : undefined}
        />
        {showValidation && fieldErrors.phone ? (
          <p id="contact-phone-error" className="text-xs text-destructive">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-event-type" className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary/80" />
            Event type (optional)
          </Label>
          <div className="relative">
            <select
              id="contact-event-type"
              value={formData.eventType}
              onChange={(e) => updateField("eventType", e.target.value)}
              disabled={isSubmitting}
              className={cn(
                "h-8 w-full min-w-0 appearance-none rounded-2xl border border-transparent bg-input/50 px-2.5 py-1 pr-8 text-base transition-[color,box-shadow] duration-200 outline-none md:text-sm",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                !formData.eventType && "text-muted-foreground"
              )}
              aria-invalid={fieldErrors.eventType ? true : undefined}
            >
              <option value="">Select event type</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id} className="text-foreground">
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
          </div>
          {showValidation && fieldErrors.eventType ? (
            <p className="text-xs text-destructive">{fieldErrors.eventType}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-event-date">Event date (optional)</Label>
          <DateInput
            id="contact-event-date"
            value={formData.eventDate}
            onChange={(date) => updateField("eventDate", date)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-venue" className="flex items-center gap-1.5">
          <MapPin className="size-3.5 text-primary/80" />
          Venue / location (optional)
        </Label>
        <Input
          id="contact-venue"
          placeholder="Venue name or Montreal area"
          value={formData.venue}
          onChange={(e) => updateField("venue", e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.venue ? true : undefined}
          aria-describedby={fieldErrors.venue ? "contact-venue-error" : undefined}
        />
        {showValidation && fieldErrors.venue ? (
          <p id="contact-venue-error" className="text-xs text-destructive">
            {fieldErrors.venue}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message" className="flex items-center gap-1.5">
          <MessageSquare className="size-3.5 text-primary/80" />
          Message <span className="text-primary">*</span>
        </Label>
        <Textarea
          id="contact-message"
          placeholder="Event type, venue, date, and draping needs..."
          rows={4}
          value={formData.message}
          onChange={(e) => updateField("message", e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
        />
        {showValidation && fieldErrors.message ? (
          <p id="contact-message-error" className="text-xs text-destructive">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full min-h-11"
        disabled={isSubmitting}
      >
        <Send className="size-4" />
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioDesignJson } from "@/data/studio";
import { clearEventBuilderBrief } from "@/data/event-builder/brief";
import { postEventPlanSubmission } from "@/lib/event-builder/event-plan-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";

type EventPlanSubmitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  defaultNotes?: string;
  onSubmitSuccess?: (result: { id: string; reference?: string }) => void;
};

export function EventPlanSubmitDialog({
  open,
  onOpenChange,
  brief,
  design,
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  defaultNotes = "",
  onSubmitSuccess,
}: EventPlanSubmitDialogProps) {
  const t = useTranslations("eventBuilder.submit");
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState(defaultNotes);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setEmail(defaultEmail);
      setPhone(defaultPhone);
      setNotes(defaultNotes);
      setError(null);
    }
  }, [open, defaultName, defaultEmail, defaultPhone, defaultNotes]);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const body = await postEventPlanSubmission(
        brief,
        design,
        {
          name,
          email,
          phone,
          notes,
        },
        honeypot
      );

      clearEventBuilderBrief();
      onOpenChange(false);

      if (onSubmitSuccess && body.id) {
        onSubmitSuccess({ id: body.id, reference: body.reference });
        return;
      }

      const successParams = new URLSearchParams();
      if (body.reference) successParams.set("ref", body.reference);
      if (body.id) successParams.set("id", body.id);
      if (email.trim()) successParams.set("email", email.trim());
      router.push(`/studio/plan/success?${successParams.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-primary/20 bg-card sm:max-w-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_72%)]" />
        <DialogHeader className="relative">
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <DialogTitle className="font-heading text-2xl">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-4">
          <div className="hidden" aria-hidden>
            <Label htmlFor="event-plan-website">Website</Label>
            <Input
              id="event-plan-website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-plan-name">{t("name")}</Label>
            <Input
              id="event-plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-plan-email">{t("email")}</Label>
            <Input
              id="event-plan-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-plan-phone">{t("phone")}</Label>
            <Input
              id="event-plan-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-plan-notes">{t("notes")}</Label>
            <Input
              id="event-plan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{t("noPricing")}</p>
        </div>

        <DialogFooter className="relative sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <LoadingButton
            type="button"
            isLoading={submitting}
            icon={<Mail className="size-4" />}
            onClick={() => void handleSubmit()}
          >
            {t("submit")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioDesignJson } from "@/data/studio";
import { clearEventBuilderBrief } from "@/data/event-builder/brief";
import { postEventPlanSubmission } from "@/lib/event-builder/event-plan-client";
import { readStoredStudioLead } from "@/components/studio/lead/lead-storage";
import { useOptionalStudioLead } from "@/components/studio/lead/studio-lead-context";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Dialog } from "@/components/ui/dialog";
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
  ...bodyProps
}: EventPlanSubmitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted only while open so the form re-reads its defaults each time. */}
      {open ? <EventPlanSubmitDialogBody onOpenChange={onOpenChange} {...bodyProps} /> : null}
    </Dialog>
  );
}

function EventPlanSubmitDialogBody({
  onOpenChange,
  brief,
  design,
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  defaultNotes = "",
  onSubmitSuccess,
}: Omit<EventPlanSubmitDialogProps, "open">) {
  const t = useTranslations("eventBuilder.submit");
  const router = useRouter();
  const studioLead = useOptionalStudioLead();
  // Signed-in profile values win; otherwise reuse the contact the visitor
  // already gave when saving their studio design.
  const [savedContact] = useState(
    () => studioLead?.contact ?? readStoredStudioLead().contact
  );
  const [name, setName] = useState(defaultName || savedContact?.name || "");
  const [email, setEmail] = useState(defaultEmail || savedContact?.email || "");
  const [phone, setPhone] = useState(defaultPhone || savedContact?.phone || "");
  const [notes, setNotes] = useState(defaultNotes);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const studioDesignId = studioLead
        ? await studioLead.ensureDesignId().catch(() => null)
        : null;
      const body = await postEventPlanSubmission(
        brief,
        design,
        {
          name,
          email,
          phone,
          notes,
        },
        honeypot,
        {
          studioDesignId,
          eventName: studioLead?.details.eventName,
          guestCount: studioLead?.details.guestCount,
        }
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
    <BrandDialogContent
      size="sm"
      icon={Mail}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      footer={
        <>
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
        </>
      }
    >
      <div className="space-y-4">
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
    </BrandDialogContent>
  );
}

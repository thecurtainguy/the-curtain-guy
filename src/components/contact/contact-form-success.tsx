"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurtainReveal } from "@/components/ui/curtain-reveal";
import { siteConfig } from "@/data/site";

type ContactFormSuccessProps = {
  onSendAnother?: () => void;
};

export function ContactFormSuccess({ onSendAnother }: ContactFormSuccessProps) {
  return (
    <CurtainReveal className="mt-6">
      <span
        className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 shadow-[0_8px_32px_oklch(0.62_0.14_80/0.18)]"
        aria-hidden
      >
        <CheckCircle2 className="size-7" />
      </span>

      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
        Message received
      </p>
      <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-[1.65rem]">
        The curtains are opening on your request
      </h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Thanks — your message was sent. Our Montreal team will review your
        event details and get back to you shortly.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5 text-primary" aria-hidden />
          Usually within one business day
        </span>
        <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 text-primary" aria-hidden />
          {siteConfig.location}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild className="min-h-10">
          <Link href="/get-estimate">Plan your draping</Link>
        </Button>
        {onSendAnother ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            onClick={onSendAnother}
          >
            <Sparkles className="size-4" />
            Send another message
          </Button>
        ) : null}
      </div>
    </CurtainReveal>
  );
}

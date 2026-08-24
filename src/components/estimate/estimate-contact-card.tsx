"use client";

import { Mail, UserRound } from "lucide-react";
import type { EstimateFormData } from "@/data/estimate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EstimateContactCardProps = {
  data: EstimateFormData;
  onFieldChange: <K extends keyof EstimateFormData>(
    field: K,
    value: EstimateFormData[K]
  ) => void;
  showValidationHint?: boolean;
  canSubmit?: boolean;
  className?: string;
};

export function EstimateContactCard({
  data,
  onFieldChange,
  showValidationHint = false,
  canSubmit = false,
  className,
}: EstimateContactCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-border/40 bg-card/40 py-0 shadow-[0_8px_32px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      <div className="relative border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/40 to-transparent px-5 py-5 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
              Contact Details
            </p>
            <h3 className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">
              Your information
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll include these details in your estimate brief when you
              request a follow-up from our team.
            </p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name" className="flex items-center gap-1.5">
              <UserRound className="size-3.5 text-primary/80" />
              Name <span className="text-primary">*</span>
            </Label>
            <Input
              id="contact-name"
              placeholder="Your name"
              value={data.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              aria-invalid={showValidationHint && !data.name.trim() ? true : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-primary/80" />
              Email <span className="text-primary">*</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="you@example.com"
              value={data.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              aria-invalid={
                showValidationHint && (!data.email.trim() || !canSubmit)
                  ? true
                  : undefined
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone (optional)</Label>
          <Input
            id="contact-phone"
            type="tel"
            placeholder="(514) 555-0100"
            value={data.phone}
            onChange={(e) => onFieldChange("phone", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">Message / notes</Label>
          <Textarea
            id="contact-message"
            placeholder="Share timeline, load-in constraints, inspiration, or anything else we should know..."
            rows={5}
            value={data.message}
            onChange={(e) => onFieldChange("message", e.target.value)}
            className="min-h-[120px] resize-y"
          />
        </div>

        <p className="rounded-xl border border-border/30 bg-background/30 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="text-primary">*</span> Required to enable{" "}
          <span className="font-medium text-foreground">Request Final Estimate</span>
        </p>
      </CardContent>
    </Card>
  );
}

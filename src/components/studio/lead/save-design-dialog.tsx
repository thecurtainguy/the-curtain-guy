"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkCheck,
  CalendarHeart,
  Check,
  Copy,
  KeyRound,
  LogIn,
  Mail,
  MonitorSmartphone,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import {
  BrandDialogContent,
  BrandDialogSection,
} from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import type {
  StudioEventDetails,
  StudioLeadContact,
} from "@/data/studio-leads";
import { cn } from "@/lib/utils";
import {
  formatStudioEventSummary,
  hasStudioEventDetails,
} from "./event-details-format";
import {
  validateStudioLeadContact,
  type StudioLeadContactErrors,
} from "./lead-contact";

export type SaveDesignResult =
  | { ok: true; emailed: boolean; resumePath?: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: StudioLeadContactErrors;
    };

/** On success the page moves to the saved design, so the dialog just keeps waiting. */
export type SaveDesignSignInResult = { ok: true } | { ok: false; message: string };

type SaveDesignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: StudioEventDetails;
  initialContact: StudioLeadContact | null;
  onEditDetails: () => void;
  onSubmit: (contact: StudioLeadContact, website: string) => Promise<SaveDesignResult>;
  onSignIn: (email: string, password: string) => Promise<SaveDesignSignInResult>;
  createAccountHref: string;
};

/** Save for visitors without an account: contact capture + private resume link. */
export function SaveDesignDialog({ open, onOpenChange, ...props }: SaveDesignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <SaveDesignDialogBody onOpenChange={onOpenChange} {...props} /> : null}
    </Dialog>
  );
}

function SaveDesignDialogBody({
  onOpenChange,
  details,
  initialContact,
  onEditDetails,
  onSubmit,
  onSignIn,
  createAccountHref,
}: Omit<SaveDesignDialogProps, "open">) {
  const [step, setStep] = useState<"contact" | "sign-in">("contact");
  const [name, setName] = useState(initialContact?.name ?? "");
  const [email, setEmail] = useState(initialContact?.email ?? "");
  const [phone, setPhone] = useState(initialContact?.phone ?? "");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<StudioLeadContactErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    email: string;
    emailed: boolean;
    resumePath?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const summary = formatStudioEventSummary(details);
  const hasDetails = hasStudioEventDetails(details);

  async function submit() {
    setFormError(null);
    const validation = validateStudioLeadContact({ name, email, phone });
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await onSubmit(validation.contact, website);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }
      setSuccess({
        email: validation.contact.email,
        emailed: result.emailed,
        resumePath: result.resumePath,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!success?.resumePath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${success.resumePath}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (step === "sign-in") {
    return (
      <SignInStep
        initialEmail={email}
        onBack={() => setStep("contact")}
        onSignIn={onSignIn}
      />
    );
  }

  if (success) {
    return (
      <BrandDialogContent
        size="md"
        icon={BookmarkCheck}
        eyebrow="Design saved"
        title={success.emailed ? "We emailed you a link" : "Your design is saved"}
        description={
          success.emailed
            ? "Open it any time from any device — your private link works for 90 days."
            : "We couldn’t send the email just now. Copy your private link below to come back any time."
        }
        footer={
          <>
            <Button asChild variant="outline">
              <a href={createAccountHref}>
                <UserPlus aria-hidden />
                Create an account
              </a>
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Keep designing
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Mail className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                {success.emailed ? "Sent to" : "Saved for"}
              </p>
              <p className="truncate font-heading text-base">{success.email}</p>
            </div>
          </div>
          {success.resumePath ? (
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/25 p-3 text-left transition-colors hover:border-primary/30"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {copied ? "Link copied" : "Copy my private link"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Keep it to yourself — anyone with the link can open this design.
                </span>
              </span>
            </button>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Our team will follow up about your event. An account is optional — create one
            to keep all your rooms, quotes and event plans in one place.
          </p>
        </div>
      </BrandDialogContent>
    );
  }

  return (
    <BrandDialogContent
      size="md"
      icon={BookmarkCheck}
      eyebrow="Save your design"
      title="Keep this room"
      description="We’ll save it and email you a private link so you can pick up on any device. No account needed."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            isLoading={submitting}
            loadingText="Saving…"
            icon={<BookmarkCheck className="size-4" aria-hidden />}
            onClick={() => void submit()}
          >
            Save design
          </LoadingButton>
        </>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <button
          type="button"
          onClick={onEditDetails}
          className="group flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-gradient-to-br from-primary/8 via-card/30 to-transparent p-4 text-left transition-colors hover:border-primary/35"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <CalendarHeart className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              Your event
            </span>
            <span className="block truncate font-heading text-base">
              {hasDetails ? summary || "Event details added" : "Add your date & guest count"}
            </span>
          </span>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">
            {hasDetails ? "Edit" : "Add"}
          </span>
        </button>

        <BrandDialogSection label="Your contact details">
          <div className="hidden" aria-hidden>
            <Label htmlFor="studio-save-website">Website</Label>
            <Input
              id="studio-save-website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <div className="space-y-3">
            <ContactField
              id="studio-save-name"
              label="Full name"
              icon={User}
              error={errors.name}
            >
              <Input
                id="studio-save-name"
                autoComplete="name"
                value={name}
                maxLength={160}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "studio-save-name-error" : undefined}
                onChange={(event) => setName(event.target.value)}
              />
            </ContactField>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactField
                id="studio-save-email"
                label="Email"
                icon={Mail}
                error={errors.email}
              >
                <Input
                  id="studio-save-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={254}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "studio-save-email-error" : undefined}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </ContactField>
              <ContactField
                id="studio-save-phone"
                label="Phone"
                icon={Phone}
                error={errors.phone}
              >
                <Input
                  id="studio-save-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  maxLength={40}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "studio-save-phone-error" : undefined}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </ContactField>
            </div>
          </div>
        </BrandDialogSection>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex items-start gap-2.5 rounded-2xl border border-border/40 bg-card/25 p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            We save your design and contact details so our team can follow up about your
            event. See our{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => setStep("sign-in")}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in to save it there
          </button>
        </p>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </BrandDialogContent>
  );
}

function SignInStep({
  initialEmail,
  onBack,
  onSignIn,
}: {
  initialEmail: string;
  onBack: () => void;
  onSignIn: SaveDesignDialogProps["onSignIn"];
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"idle" | "signing-in" | "opening">("idle");
  const busy = pending !== "idle";

  async function submit() {
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setPending("signing-in");
    const result = await onSignIn(email, password);
    if (result.ok) {
      setPending("opening");
      return;
    }
    setError(result.message);
    setPending("idle");
  }

  return (
    <BrandDialogContent
      size="md"
      icon={LogIn}
      eyebrow="Welcome back"
      title="Sign in to save"
      description="We’ll save this room to your account and open it there. Your layout and event details come with it."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
          <LoadingButton
            type="button"
            isLoading={busy}
            loadingText={pending === "opening" ? "Opening your design…" : "Signing in…"}
            icon={<LogIn className="size-4" aria-hidden />}
            onClick={() => void submit()}
          >
            Sign in & save
          </LoadingButton>
        </>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {SIGN_IN_PERKS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/25 px-3 py-2.5"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="text-xs leading-tight font-medium">{label}</span>
            </div>
          ))}
        </div>

        <BrandDialogSection label="Your account">
          <div className="space-y-3">
            <ContactField id="studio-sign-in-email" label="Email" icon={Mail}>
              <Input
                id="studio-sign-in-email"
                type="email"
                autoComplete="email"
                value={email}
                maxLength={254}
                disabled={busy}
                autoFocus={!initialEmail}
                onChange={(event) => setEmail(event.target.value)}
              />
            </ContactField>
            <ContactField id="studio-sign-in-password" label="Password" icon={KeyRound}>
              <Input
                id="studio-sign-in-password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                autoFocus={Boolean(initialEmail)}
                onChange={(event) => setPassword(event.target.value)}
              />
            </ContactField>
          </div>
        </BrandDialogSection>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </BrandDialogContent>
  );
}

const SIGN_IN_PERKS = [
  { icon: BookmarkCheck, label: "Saved to your account" },
  { icon: CalendarHeart, label: "Event details kept" },
  { icon: MonitorSmartphone, label: "Open it on any device" },
] as const;

function ContactField({
  id,
  label,
  icon: Icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: typeof User;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" aria-hidden />
        {label}
        <span className="text-primary" aria-hidden>
          *
        </span>
        <span className="sr-only">(required)</span>
      </Label>
      <div className={cn(error && "[&_input]:ring-1 [&_input]:ring-destructive/60")}>
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

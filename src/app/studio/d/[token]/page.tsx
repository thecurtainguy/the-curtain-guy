import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioDesigner } from "@/components/studio/studio-designer";
import { normalizeStudioDesign, validateStudioDesign } from "@/data/studio";
import { aiStudioImage } from "@/data/site";
import { getCurrentProfile, isEmailVerified } from "@/lib/auth";
import {
  studioEventDetailsFromRow,
  studioLeadContactFromRow,
} from "@/lib/studio";
import {
  linkStudioLeadsToAccount,
  resolveStudioResumeToken,
} from "@/lib/studio-leads-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your saved room design",
  robots: { index: false, follow: false },
  // The path carries a private token; never leak it to other origins.
  referrer: "no-referrer",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function StudioResumePage({ params }: PageProps) {
  const [{ token }, current] = await Promise.all([params, getCurrentProfile()]);
  const lookup = await resolveStudioResumeToken(token);

  if (lookup.status !== "ok") {
    return <ResumeUnavailable reason={lookup.status} />;
  }
  const row = lookup.row;

  if (current?.profile.role === "owner") {
    redirect(`/admin/studio/${row.id}`);
  }

  if (row.owner_user_id) {
    if (current && current.user.id === row.owner_user_id) {
      redirect(`/studio/${row.id}`);
    }
    return <ResumeUnavailable reason="claimed" />;
  }

  if (
    current?.profile.role === "customer" &&
    isEmailVerified(current.user) &&
    row.contact_email &&
    current.user.email?.trim().toLowerCase() === row.contact_email.toLowerCase()
  ) {
    await linkStudioLeadsToAccount({
      userId: current.user.id,
      email: current.user.email,
      visitorId: null,
    });
    redirect(`/studio/${row.id}`);
  }

  const validation = validateStudioDesign(row.design_json);
  if (!validation.valid) {
    return <ResumeUnavailable reason="invalid" />;
  }

  return (
    <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background p-1.5 sm:p-2">
      <div className="mx-auto mb-1.5 flex w-full max-w-[1920px] shrink-0 items-center justify-between gap-3 px-1">
        <Link
          href="/studio"
          className="inline-flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Studio
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <LockKeyhole className="size-3" aria-hidden />
          Private design link
        </span>
      </div>
      <StudioDesigner
        initialDesign={normalizeStudioDesign(validation.design)}
        initialTitle={row.title}
        accessMode="guest"
        createAccountHref="/account/signup"
        leadResume={{
          token,
          details: studioEventDetailsFromRow(row),
          contact: studioLeadContactFromRow(row),
        }}
        className="mx-auto min-h-0 w-full max-w-[1920px] flex-1"
      />
    </div>
  );
}

const UNAVAILABLE_COPY = {
  expired: {
    icon: Clock,
    eyebrow: "Link expired",
    title: "This design link has expired",
    body: "Private links stay active for 90 days. Our team still has your design on file — reach out and we’ll send a fresh link, or start a new room.",
  },
  invalid: {
    icon: KeyRound,
    eyebrow: "Design link",
    title: "We couldn’t open that design",
    body: "The link may be incomplete or replaced by a newer one. Check your latest email from The Curtain Guy, or start a new room.",
  },
  claimed: {
    icon: LockKeyhole,
    eyebrow: "Saved to an account",
    title: "This design now lives in an account",
    body: "Sign in with the email you saved it under to keep designing — all your rooms, quotes and event plans are in one place.",
  },
} as const;

function ResumeUnavailable({
  reason,
}: {
  reason: keyof typeof UNAVAILABLE_COPY;
}) {
  const copy = UNAVAILABLE_COPY[reason];
  const Icon = copy.icon;
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-4xl border border-border/40 bg-card/25 shadow-2xl shadow-black/30 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6 p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">
              {copy.eyebrow}
            </p>
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">
              {copy.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {reason === "claimed" ? (
              <Button asChild>
                <Link href="/account/login?next=/account/studio">
                  Sign in
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/studio/new">
                  <Sparkles aria-hidden />
                  Start a new room
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/contact">
                <MessageCircle aria-hidden />
                Contact our team
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative hidden min-h-72 md:block">
          {aiStudioImage.image ? (
            <Image
              src={aiStudioImage.image}
              alt={aiStudioImage.alt ?? ""}
              fill
              sizes="(min-width: 768px) 420px, 0px"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
          <div className="absolute right-5 bottom-5 left-5 rounded-2xl border border-border/40 bg-background/60 p-4 backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
              The Curtain Guy Studio
            </p>
            <p className="mt-1 font-heading text-base">
              Design your room in 2D and 3D, then send it to our team.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

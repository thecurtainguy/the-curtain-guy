"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock3,
  Home,
  LayoutDashboard,
  MapPin,
  Plus,
  Shield,
  UserPlus,
} from "lucide-react";
import { siteConfig } from "@/data/site";
import { Link } from "@/i18n/navigation";
import { studioBuildHref } from "@/data/event-builder/brief";
import { RootLink } from "@/components/ui/root-link";
import { GuardedLink } from "@/components/ui/guarded-link";
import { Button } from "@/components/ui/button";
import { CurtainReveal } from "@/components/ui/curtain-reveal";
import { CelebrationConfetti } from "@/components/ui/celebration-confetti";

export type EventPlanSuccessViewerRole = "guest" | "customer" | "owner";

type EventPlanSubmitSuccessProps = {
  reference?: string;
  viewerRole?: EventPlanSuccessViewerRole;
  email?: string;
  accountEventPlanHref?: string | null;
  adminEventPlanHref?: string | null;
};

export function EventPlanSubmitSuccess({
  reference,
  viewerRole = "guest",
  email = "",
  accountEventPlanHref,
  adminEventPlanHref,
}: EventPlanSubmitSuccessProps) {
  const t = useTranslations("eventBuilder.success");
  const stageRef = useRef<HTMLDivElement>(null);

  const accountHref = accountEventPlanHref ?? "/account/event-plans";
  const adminHref = adminEventPlanHref ?? "/admin/event-plans";

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const frame = window.requestAnimationFrame(() => {
      node.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={stageRef} className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <CurtainReveal contentClassName="min-h-[min(24rem,58vh)] space-y-4">
        <CelebrationConfetti />
        <span
          className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25"
          aria-hidden
        >
          <CheckCircle2 className="size-7" />
        </span>

        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {t("description")}
        </p>

        {reference ? (
          <div className="surface-tile mx-auto w-full max-w-sm rounded-2xl px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("reference")}
            </p>
            <p className="mt-1 font-heading text-xl font-semibold">{reference}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 text-primary" aria-hidden />
            {t("timeline")}
          </span>
          <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden />
            {siteConfig.location}
          </span>
        </div>

        <ol className="mx-auto max-w-md space-y-3 text-sm text-muted-foreground">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>

        <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>

        {viewerRole === "guest" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("guestCta")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <GuardedLink
                  href={`/account/signup?email=${encodeURIComponent(email.trim())}`}
                >
                  <UserPlus className="size-4" />
                  {t("createAccount")}
                </GuardedLink>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <GuardedLink href="/account/login">{t("signIn")}</GuardedLink>
              </Button>
            </div>
          </div>
        ) : null}

        {viewerRole === "customer" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("customerCta")}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <Link href={accountHref}>{t("viewInAccount")}</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/account">
                  <LayoutDashboard className="size-4" />
                  {t("accountDashboard")}
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {viewerRole === "owner" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("ownerCta")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <Link href={adminHref}>
                  <Shield className="size-4" />
                  {t("viewInAccount")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/admin">
                  <LayoutDashboard className="size-4" />
                  {t("adminDashboard")}
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button asChild>
            <RootLink href="/">
              <Home className="size-4" />
              {t("home")}
            </RootLink>
          </Button>
          <Button asChild variant="outline">
            <RootLink href={studioBuildHref({ newPlan: true })}>
              <Plus className="size-4" />
              {t("another")}
            </RootLink>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/get-estimate">{t("estimate")}</Link>
          </Button>
        </div>
      </CurtainReveal>
    </div>
  );
}

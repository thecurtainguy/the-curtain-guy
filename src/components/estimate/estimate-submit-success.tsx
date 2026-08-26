"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  MapPin,
  Plus,
  Shield,
  UserPlus,
} from "lucide-react";
import { siteConfig } from "@/data/site";
import { Link } from "@/i18n/navigation";
import { GuardedLink } from "@/components/ui/guarded-link";
import { Button } from "@/components/ui/button";
import { CurtainReveal } from "@/components/ui/curtain-reveal";
import { CelebrationConfetti } from "@/components/ui/celebration-confetti";
import {
  EstimateFilePicker,
  type FileUploadProgress,
} from "@/components/estimates/estimate-file-picker";

export type EstimateSuccessViewerRole = "guest" | "customer" | "owner";

type EstimateSubmitSuccessProps = {
  reference?: string;
  uploadUploaded?: number;
  uploadFailed?: number;
  viewerRole?: EstimateSuccessViewerRole;
  email: string;
  accountEstimateHref?: string | null;
  adminEstimateHref?: string | null;
  uploadProgress: FileUploadProgress[];
  onSubmitAnother?: () => void;
};

export function EstimateSubmitSuccess({
  reference,
  uploadUploaded,
  uploadFailed,
  viewerRole = "guest",
  email,
  accountEstimateHref,
  adminEstimateHref,
  uploadProgress,
  onSubmitAnother,
}: EstimateSubmitSuccessProps) {
  const t = useTranslations("estimate.success");
  const tDisclaimer = useTranslations("estimate");
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Bring the curtain success card into vertical center after submit.
    const frame = window.requestAnimationFrame(() => {
      node.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const accountHref = accountEstimateHref ?? "/account/estimates";
  const adminHref = adminEstimateHref ?? "/admin/estimates";

  return (
    <div ref={stageRef}>
      <CurtainReveal contentClassName="min-h-[min(24rem,58vh)] space-y-4">
        <CelebrationConfetti />
        <span
          className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 shadow-[0_8px_32px_oklch(0.62_0.14_80/0.18)]"
          aria-hidden
        >
          <CheckCircle2 className="size-7" />
        </span>

        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
          {t("title")}
        </p>
        <h3 className="font-heading text-2xl font-semibold text-foreground sm:text-[1.65rem]">
          {t("title")}
        </h3>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {t("description")}
        </p>

        {reference ? (
          <div className="surface-tile mx-auto w-full max-w-sm rounded-2xl px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("reference")}
            </p>
            <p className="mt-1 font-heading text-xl font-semibold text-foreground">
              {reference}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 text-primary" aria-hidden />
            Usually within one business day
          </span>
          <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden />
            {siteConfig.location}
          </span>
        </div>

        <div className="mx-auto w-full max-w-lg space-y-2 text-sm leading-relaxed text-muted-foreground">
          {typeof uploadUploaded === "number" && uploadUploaded > 0 ? (
            <p className="text-emerald-700 dark:text-emerald-300">
              {t("uploadPartial", {
                uploaded: uploadUploaded,
                failed: 0,
              })}
            </p>
          ) : null}
          {uploadFailed && uploadFailed > 0 ? (
            <p className="text-amber-800 dark:text-amber-200">
              {t("uploadPartial", {
                uploaded: uploadUploaded ?? 0,
                failed: uploadFailed,
              })}
            </p>
          ) : null}
          <p className="text-xs">{tDisclaimer("disclaimer")}</p>
        </div>

        {uploadProgress.length > 0 ? (
          <div className="mx-auto w-full max-w-lg">
            <EstimateFilePicker
              files={[]}
              onChange={() => {}}
              disabled
              uploadProgress={uploadProgress}
            />
          </div>
        ) : null}

        {viewerRole === "guest" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("guestCta")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <GuardedLink
                  href={`/account/signup?email=${encodeURIComponent(email.trim())}`}
                >
                  <UserPlus className="size-4" />
                  Create an account
                </GuardedLink>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <GuardedLink href="/account/login">Sign in</GuardedLink>
              </Button>
            </div>
          </div>
        ) : null}

        {viewerRole === "customer" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("customerCta")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <Link href={accountHref}>View estimate in account</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/account">
                  <LayoutDashboard className="size-4" />
                  Account dashboard
                </Link>
              </Button>
              {onSubmitAnother ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-10"
                  onClick={onSubmitAnother}
                >
                  <Plus className="size-4" />
                  {t("newEstimate")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {viewerRole === "owner" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("title")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <Link href={adminHref}>
                  <Shield className="size-4" />
                  {t("ownerCta")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/admin">
                  <LayoutDashboard className="size-4" />
                  Admin dashboard
                </Link>
              </Button>
              {onSubmitAnother ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-10"
                  onClick={onSubmitAnother}
                >
                  <Plus className="size-4" />
                  {t("newEstimate")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CurtainReveal>
    </div>
  );
}

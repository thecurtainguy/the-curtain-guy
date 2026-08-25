"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, MapPin, UserPlus } from "lucide-react";
import { estimateDisclaimer } from "@/data/estimate";
import { siteConfig } from "@/data/site";
import { Button } from "@/components/ui/button";
import { CurtainReveal } from "@/components/ui/curtain-reveal";
import { CelebrationConfetti } from "@/components/ui/celebration-confetti";
import {
  EstimateFilePicker,
  type FileUploadProgress,
} from "@/components/estimates/estimate-file-picker";

type EstimateSubmitSuccessProps = {
  reference?: string;
  uploadUploaded?: number;
  uploadFailed?: number;
  isLoggedIn?: boolean;
  email: string;
  uploadProgress: FileUploadProgress[];
};

export function EstimateSubmitSuccess({
  reference,
  uploadUploaded,
  uploadFailed,
  isLoggedIn,
  email,
  uploadProgress,
}: EstimateSubmitSuccessProps) {
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
          Estimate received
        </p>
        <h3 className="font-heading text-2xl font-semibold text-foreground sm:text-[1.65rem]">
          The curtains are opening on your brief
        </h3>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Your estimate brief was sent. The Curtain Guy team will review your
          event details, measurements, and availability — then follow up by
          email.
        </p>

        {reference ? (
          <div className="surface-tile mx-auto w-full max-w-sm rounded-2xl px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Reference
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
          <p>
            A confirmation email has been sent if the email address was entered
            correctly.
          </p>
          {typeof uploadUploaded === "number" && uploadUploaded > 0 ? (
            <p className="text-emerald-700 dark:text-emerald-300">
              {uploadUploaded} file{uploadUploaded === 1 ? "" : "s"} uploaded and
              attached to your estimate.
            </p>
          ) : null}
          {uploadFailed && uploadFailed > 0 ? (
            <p className="text-amber-800 dark:text-amber-200">
              Your estimate was received, but {uploadFailed} file
              {uploadFailed === 1 ? "" : "s"} failed to upload. You can add files
              later from your account.
            </p>
          ) : null}
          <p className="text-xs">{estimateDisclaimer}</p>
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

        {isLoggedIn ? (
          <Button asChild className="min-h-10">
            <Link href="/account/estimates">View your estimates</Link>
          </Button>
        ) : (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              Create an account to view this estimate, upload more files, and
              track updates.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="min-h-10">
                <Link
                  href={`/account/signup?email=${encodeURIComponent(email.trim())}`}
                >
                  <UserPlus className="size-4" />
                  Create an account
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/account/login">Sign in</Link>
              </Button>
            </div>
          </div>
        )}
      </CurtainReveal>
    </div>
  );
}

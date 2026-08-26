"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SiteMediaImage } from "@/components/media/site-media-image";
import type { SiteMediaKey } from "@/data/site-media";
import { Reveal } from "@/components/animation/reveal";
import { cn } from "@/lib/utils";

type CtaBandProps = {
  eyebrow?: string;
  headline?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
  mediaKey?: SiteMediaKey;
};

export function CtaBand({
  eyebrow,
  headline,
  description,
  primaryHref = "/get-estimate",
  primaryLabel,
  secondaryHref = "/contact",
  secondaryLabel,
  className,
  mediaKey,
}: CtaBandProps) {
  const tc = useTranslations("common");
  const resolvedHeadline = headline ?? tc("ctaBand.headline");
  const resolvedDescription = description ?? tc("ctaBand.description");
  const resolvedPrimaryLabel = primaryLabel ?? tc("requestEstimate");
  const resolvedSecondaryLabel = secondaryLabel ?? tc("contactBrand");

  return (
    <section
      className={cn(
        "relative overflow-hidden border-t border-border/40 section-divider-top",
        className
      )}
    >
      {mediaKey && (
        <>
          <SiteMediaImage
            mediaKey={mediaKey}
            sizes="100vw"
            className="absolute inset-0 opacity-30"
            imageClassName="object-cover"
          />
          <div className="absolute inset-0 bg-background/80" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(212,175,55,0.06),transparent_50%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal variant="fade-up" className="mx-auto max-w-2xl text-center">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {resolvedHeadline}
          </h2>
          {resolvedDescription && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {resolvedDescription}
            </p>
          )}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
              <Link href={primaryHref}>{resolvedPrimaryLabel}</Link>
            </Button>
            {secondaryHref && resolvedSecondaryLabel && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-h-11 w-full sm:w-auto"
              >
                <Link href={secondaryHref}>{resolvedSecondaryLabel}</Link>
              </Button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

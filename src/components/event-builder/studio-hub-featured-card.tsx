"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { RootLink } from "@/components/ui/root-link";
import { Button } from "@/components/ui/button";

export function StudioHubFeaturedCard() {
  const t = useTranslations("eventBuilder.hub");

  return (
    <div className="relative overflow-hidden rounded-4xl border border-primary/25 bg-[radial-gradient(circle_at_12%_50%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_48%)] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Sparkles className="size-6" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold sm:text-3xl">
              {t("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <RootLink href="/studio/build">
            {t("cta")}
            <ArrowRight className="size-4" />
          </RootLink>
        </Button>
      </div>
    </div>
  );
}

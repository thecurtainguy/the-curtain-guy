"use client";

import {
  ClipboardList,
  FileCheck,
  MessageSquare,
  Palette,
  Plus,
  Ruler,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

const stepIcons = [
  ClipboardList,
  MessageSquare,
  Ruler,
  Palette,
  Plus,
  FileCheck,
] as const;

type StepTranslation = {
  title: string;
  description: string;
};

export function HowItWorksSection() {
  const t = useTranslations("home.howItWorks");
  const steps = t.raw("steps") as StepTranslation[];

  return (
    <SectionShell variant="elevated" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal variant="slide-left" className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/40 sm:aspect-[5/4] lg:aspect-[4/5]">
            <SiteMediaImage
              mediaKey="home.how_it_works.visual"
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="absolute inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          </Reveal>

          <Reveal variant="slide-right">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
            />

            <Stagger className="mt-8 grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => {
                const Icon = stepIcons[index] ?? ClipboardList;
                return (
                  <AnimatedCard key={step.title} hover={false}>
                    <Card className="border-border/40 bg-background/50">
                      <CardContent className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            <Icon className="size-4" />
                          </div>
                          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary/70">
                            {index + 1}
                          </span>
                        </div>
                        <h3 className="font-heading text-sm font-medium text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </CardContent>
                    </Card>
                  </AnimatedCard>
                );
              })}
            </Stagger>

            <div className="mt-8">
              <Button asChild className="min-h-11">
                <Link href="/get-estimate">{t("cta")}</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}

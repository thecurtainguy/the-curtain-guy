"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RootLink } from "@/components/ui/root-link";
import { aiPaths } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

type PathTranslation = {
  title: string;
  description: string;
};

export function AiTeaserSection() {
  const t = useTranslations("home.aiTeaser");
  const paths = t.raw("paths") as PathTranslation[];

  return (
    <SectionShell variant="glow" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal variant="blur-in">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
            align="center"
            className="mx-auto"
          />
        </Reveal>

        <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
          {aiPaths.map((path, index) => {
            const Icon = path.icon;
            const translated = paths[index];
            const isFinal = index === aiPaths.length - 1;

            return (
              <AnimatedCard key={path.title} variant="fade-up">
                <Card
                  className={`relative h-full border-border/40 bg-card/40 shadow-[0_4px_20px_rgba(0,0,0,0.2)] ${
                    isFinal
                      ? "border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
                      : ""
                  }`}
                >
                  <CardContent className="pt-6">
                    {isFinal && (
                      <Badge className="mb-3 bg-primary/20 text-primary">
                        {t("badge")}
                      </Badge>
                    )}
                    <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-heading text-base font-medium text-foreground">
                      {translated?.title ?? path.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {translated?.description ?? path.description}
                    </p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            );
          })}
        </Stagger>

        <Reveal variant="fade-up" delay={0.1} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/get-estimate">
              {t("cta")}
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <RootLink href="/ai">
              <Sparkles className="size-4" />
              {t("secondary")}
            </RootLink>
          </Button>
        </Reveal>
      </div>
    </SectionShell>
  );
}

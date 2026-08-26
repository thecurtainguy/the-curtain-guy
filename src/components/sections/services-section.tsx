"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { services } from "@/data/services";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { ServiceCard } from "@/components/marketing/service-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

export function ServicesSection() {
  const t = useTranslations("home.services");
  const tc = useTranslations("common");

  return (
    <SectionShell variant="fabric" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal variant="fade-up">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
            />
            <Button asChild variant="outline" className="min-h-11 shrink-0">
              <Link href="/services">
                {tc("viewServices")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <AnimatedCard key={service.slug}>
              <ServiceCard slug={service.slug} />
            </AnimatedCard>
          ))}
        </Stagger>
      </div>
    </SectionShell>
  );
}

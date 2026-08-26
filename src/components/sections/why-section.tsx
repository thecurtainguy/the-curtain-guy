"use client";

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { Card, CardContent } from "@/components/ui/card";

type CardTranslation = {
  title: string;
  description: string;
};

export function WhySection() {
  const t = useTranslations("home.why");
  const cards = t.raw("cards") as CardTranslation[];

  return (
    <SectionShell variant="elevated" divider="top" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="border-border/40 bg-background/50 shadow-[0_2px_16px_rgba(0,0,0,0.12)]"
            >
              <CardContent className="pt-6">
                <h3 className="font-heading text-sm font-medium text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

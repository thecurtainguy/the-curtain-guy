import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Box,
  ClipboardList,
  HelpCircle,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FaqItem } from "@/data/faq";
import {
  createBreadcrumbJsonLd,
  createFaqPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

const faqCategoryIds = [
  "about",
  "estimates",
  "venue",
  "studio",
  "services",
] as const;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/faq",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function FaqPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const appLocale = locale as AppLocale;
  const t = await getTranslations("faq");
  const tCommon = await getTranslations("common");

  const faqCategories = faqCategoryIds.map((id) => ({
    id,
    label: t(`categories.${id}.label`),
    description: t(`categories.${id}.description`),
    items: t.raw(`items.${id}`) as FaqItem[],
  }));

  const allFaqItems = faqCategoryIds.flatMap(
    (id) => t.raw(`items.${id}`) as FaqItem[]
  );
  const faqTopicChips = t.raw("topicChips") as string[];

  const quickLinks = [
    {
      href: "/get-estimate" as const,
      label: t("quickLinks.estimate.label"),
      description: t("quickLinks.estimate.description"),
      icon: ClipboardList,
    },
    {
      href: "/studio" as const,
      label: t("quickLinks.studio.label"),
      description: t("quickLinks.studio.description"),
      icon: Box,
    },
    {
      href: "/services" as const,
      label: t("quickLinks.services.label"),
      description: t("quickLinks.services.description"),
      icon: Sparkles,
    },
    {
      href: "/contact" as const,
      label: t("quickLinks.contact.label"),
      description: t("quickLinks.contact.description"),
      icon: MessageCircle,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          createBreadcrumbJsonLd(
            [
              { name: tCommon("home"), path: "/" },
              { name: tCommon("faq"), path: "/faq" },
            ],
            appLocale
          ),
          createFaqPageJsonLd(allFaqItems),
        ]}
      />

      <PageHero
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      />

      <section className="border-b border-border/40 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up">
            <div className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <HelpCircle className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                    {t("page.popularTopics")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {faqTopicChips.map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="rounded-full border-border/50 bg-background/50 px-3 py-1 text-xs font-medium"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {faqCategories.map((category) => (
              <Reveal key={category.id} variant="fade-up">
                <div className="space-y-5">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                      {category.label}
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground">
                      {category.description}
                    </h2>
                  </div>

                  <Stagger className="grid gap-3 lg:grid-cols-2">
                    {category.items.map((item) => (
                      <AnimatedCard
                        key={item.question}
                        hover={false}
                        className="h-full border-border/40 bg-card/25"
                      >
                        <Card className="h-full border-0 bg-transparent shadow-none">
                          <CardContent className="p-5 sm:p-6">
                            <h3 className="font-heading text-base font-medium text-foreground">
                              {item.question}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {item.answer}
                            </p>
                          </CardContent>
                        </Card>
                      </AnimatedCard>
                    ))}
                  </Stagger>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-card/20 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up" className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("page.nextSteps")}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {t("cta.headline")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("cta.description")}
            </p>
          </Reveal>

          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <AnimatedCard
                  key={link.href}
                  className="border-border/40 bg-card/30"
                >
                  <Card className="h-full border-0 bg-transparent shadow-none">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
                        {link.label}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {link.description}
                      </p>
                      <Button
                        asChild
                        variant="ghost"
                        className="mt-4 h-9 justify-start px-0 text-primary hover:bg-transparent hover:text-primary/80"
                      >
                        <Link href={link.href}>
                          {t("page.open")}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              );
            })}
          </Stagger>
        </div>
      </section>

      <CtaBand
        headline={t("cta.headline")}
        description={t("cta.description")}
        primaryLabel={tCommon("requestEstimate")}
        secondaryLabel={tCommon("contact")}
      />
    </>
  );
}

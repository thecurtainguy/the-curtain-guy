import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Ruler, Sparkles, Truck, type LucideIcon } from "lucide-react";
import { DrapePlanner } from "@/components/rentals/drape-planner";
import { Link } from "@/i18n/navigation";
import { aiStudioImage } from "@/data/site";
import { listPublicRentalProducts } from "@/lib/rentals";
import { createPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rentals.planner" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/rentals/drape-calculator",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function PlannerSection({ locale }: { locale: string }) {
  setRequestLocale(locale);
  const products = await listPublicRentalProducts();
  const drapes = products.filter(
    (product) => product.configurator_mode === "linear_ft" && product.kind !== "package"
  );
  return <DrapePlanner drapes={drapes} />;
}

export default async function DrapePlannerPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rentals.planner");

  const trust: Array<{ icon: LucideIcon; label: string }> = [
    { icon: Ruler, label: t("trust.scale") },
    { icon: Sparkles, label: t("trust.hardware") },
    { icon: Truck, label: t("trust.service") },
  ];

  return (
    <section className="relative py-10 sm:py-14">
      <div className="fabric-section-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="relative grid overflow-hidden rounded-4xl border border-border/40 bg-card/25 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div
            className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[radial-gradient(circle,oklch(0.76_0.15_88/18%),transparent_70%)]"
            aria-hidden
          />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <Link
              href="/rentals"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> {t("back")}
            </Link>
            <p className="mt-5 text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">{t("eyebrow")}</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{t("title")}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("description")}
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-3">
              {trust.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-background/40 px-3 py-2.5 text-xs font-medium"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden min-h-64 md:block">
            {aiStudioImage.image ? (
              <Image
                src={aiStudioImage.image}
                alt={aiStudioImage.alt ?? ""}
                fill
                sizes="(min-width: 1280px) 520px, 40vw"
                className="object-cover"
                priority
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-transparent to-transparent" aria-hidden />
            <div className="absolute right-4 bottom-4 left-4 rounded-2xl border border-white/15 bg-black/45 p-4 text-white backdrop-blur-md">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">{t("photoCaption")}</p>
              <p className="mt-1 font-heading text-lg font-semibold">{t("photoTitle")}</p>
            </div>
          </div>
        </div>

        <Suspense
          fallback={<div className="h-[32rem] animate-pulse rounded-4xl border border-border/40 bg-card/30" />}
        >
          <PlannerSection locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}

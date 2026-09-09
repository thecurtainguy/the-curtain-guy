import { ArrowRight, Package, Ruler, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/animation/reveal";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { SectionShell } from "@/components/section-shell";
import { Button } from "@/components/ui/button";

export async function RentalsHero() {
  const t = await getTranslations("rentals.page");
  const tc = await getTranslations("common");

  const highlights = [
    { icon: Package, label: t("heroHighlightBrowse") },
    { icon: Ruler, label: t("heroHighlightConfigure") },
    { icon: Truck, label: t("heroHighlightService") },
  ] as const;

  return (
    <SectionShell
      variant="glow"
      divider="bottom"
      className="overflow-hidden max-lg:overflow-anchor-none"
    >
      <SiteMediaImage
        mediaKey="services.pipe-and-drape-rental.aside"
        sizes="100vw"
        className="pointer-events-none absolute inset-0 opacity-[0.14] saturate-[0.85]"
        priority
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/55"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(212,175,55,0.14),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-24 xl:gap-16 xl:py-28">
        <Reveal variant="fade-up" immediate className="order-2 lg:order-1">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("description")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
              <a href="#catalog">
                {t("heroBrowseCta")}
                <ArrowRight className="ml-1 size-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-11 w-full sm:w-auto"
            >
              <Link href="/get-estimate">{tc("requestEstimate")}</Link>
            </Button>
          </div>

          <ul className="mt-8 grid gap-2.5 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card/35 px-3 py-2.5"
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className="text-xs font-medium leading-snug text-foreground">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          variant="scale-in"
          immediate
          delay={0.12}
          duration={0.75}
          className="order-1 lg:order-2"
        >
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div
              className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22),transparent_65%)] blur-3xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/40 bg-card/20 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] sm:rounded-[2rem]">
              <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/4]">
                <SiteMediaImage
                  mediaKey="services.pipe-and-drape-rental.hero"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="absolute inset-0"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                      {t("heroVisualEyebrow")}
                    </p>
                    <p className="mt-1 font-heading text-base text-white sm:text-lg">
                      {t("heroVisualTitle")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

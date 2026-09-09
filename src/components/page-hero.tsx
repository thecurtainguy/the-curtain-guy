import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { SectionShell } from "@/components/section-shell";
import { Reveal } from "@/components/animation/reveal";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  back?: {
    href: string;
    label: string;
  };
};

export function PageHero({
  eyebrow,
  title,
  description,
  className,
  children,
  back,
}: PageHeroProps) {
  return (
    <SectionShell
      variant="glow"
      divider="bottom"
      className={cn("overflow-hidden", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(212,175,55,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Reveal variant="fade-up" immediate>
          {back ? (
            <Link
              href={back.href}
              className={cn(
                "mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors",
                "hover:text-primary",
                "focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden />
              {back.label}
            </Link>
          ) : null}
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "max-w-3xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl",
              eyebrow || back ? "mt-3" : "mt-0"
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          )}
          {children}
        </Reveal>
      </div>
    </SectionShell>
  );
}

type QuoteCTAProps = {
  headline?: string;
  description?: string;
  className?: string;
};

export function QuoteCTA({
  headline = "Ready to transform your Montreal venue?",
  description = "Tell us your event type, venue, date, and the look you want. We'll help shape the right event drape rental setup — with full-service delivery, installation, and teardown.",
  className,
}: QuoteCTAProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-t border-border/40 section-divider-top",
        className
      )}
    >
      <SiteMediaImage
        mediaKey="home.cta.atmosphere"
        sizes="100vw"
        className="absolute inset-0 opacity-25"
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(212,175,55,0.06),transparent_50%)]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal variant="fade-up" className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {headline}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
              <Link href="/get-estimate">Get Estimate</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-11 w-full sm:w-auto">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

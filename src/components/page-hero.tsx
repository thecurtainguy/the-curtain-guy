import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  className,
  children,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border/40 bg-card/20",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,106,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(10,9,8,0.4)_100%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(212,175,106,0.06),transparent_50%)]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {headline}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/get-estimate">Get Estimate</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

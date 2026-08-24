import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { galleryPageCategories } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GalleryCategoriesSection() {
  return (
    <SectionShell variant="elevated" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Categories"
          title="Event draping categories we serve."
          description="From wedding draping and gala drape rentals to stage backdrops, blackout masking, and photo moments — each category is scoped, installed, and torn down by our Montreal team."
          align="center"
          className="mx-auto"
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {galleryPageCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.label}
                className={cn(
                  "group overflow-hidden border-border/40 bg-background/50 p-0",
                  "shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]",
                  "transition-all duration-500 hover:border-primary/25 hover:bg-background/70",
                  "hover:shadow-[0_12px_36px_rgba(0,0,0,0.35),0_0_24px_rgba(212,175,55,0.06)]"
                )}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  {category.image && (
                    <Image
                      src={category.image}
                      alt={category.alt ?? category.label}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.2),transparent_55%)]" />

                  {Icon && (
                    <div className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-primary backdrop-blur-sm ring-1 ring-primary/20 transition-colors group-hover:bg-black/60 group-hover:ring-primary/35">
                      <Icon className="size-4" strokeWidth={1.75} />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/90">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="font-heading text-sm font-medium text-foreground">
                      {category.label}
                    </h3>
                  </div>
                </div>

                <CardContent className="px-4 pb-5 pt-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="relative mt-14 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background/40 to-background/20 p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(212,175,55,0.12),transparent_55%)]"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-xl">
              <p className="font-heading text-lg font-medium text-foreground sm:text-xl">
                Ready to plan your own venue transformation drape rental?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Share your event type, venue, and draping goals — we&apos;ll help
                shape the right Montreal event drape rental setup.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/get-estimate">
                  Get Estimate
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

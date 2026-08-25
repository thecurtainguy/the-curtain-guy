import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  BoxSelect,
  Layers3,
  PanelTop,
  PenTool,
  MousePointer2,
  Ruler,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Draw Your Room in 2D & 3D",
  description:
    "Draw your event room, place drape runs and a stage, then preview the same room design in an interactive 3D Studio.",
  path: "/studio",
});

const features = [
  {
    icon: Ruler,
    title: "Draw to scale",
    body: "Start with room dimensions in feet and inches, then refine each wall.",
  },
  {
    icon: Layers3,
    title: "Place event draping",
    body: "Add full-wall treatments, partial runs, backdrops, and dividers.",
  },
  {
    icon: Box,
    title: "Preview in 3D",
    body: "The 3D room is generated directly from the same drawing data.",
  },
  {
    icon: Save,
    title: "Save to your account",
    body: "Keep designs with your estimates and event planning when signed in.",
  },
] as const;

export default function StudioLandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-24">
          <div className="relative z-10">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              <MousePointer2 className="size-3.5" />
              The Curtain Guy Studio
            </Badge>
            <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Draw your room and preview your event draping in 3D.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Build a practical top-down room plan, place drape runs and a
              stage, then move into a fast interactive 3D view—without losing
              the precision of your original drawing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/studio/new">
                  Start drawing
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/studio/saved">View saved designs</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/get-estimate">Get estimate</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-4xl border border-primary/20 bg-card/35 shadow-2xl shadow-black/25">
            <Image
              src="/images/services/mitzvah-hero.jpg"
              alt="Luxury draped event space representing the room design Studio"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 52vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 rounded-3xl border border-white/15 bg-background/80 p-5 shadow-xl backdrop-blur-xl sm:inset-x-8 sm:bottom-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                One design, two views
              </p>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                <span className="rounded-xl border border-border/50 bg-card/70 px-3 py-2 text-center font-medium">
                  2D room plan
                </span>
                <ArrowRight className="size-4 text-primary" />
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center font-medium">
                  Generated 3D
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Choose a starting point
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
              Start with the room shape you know.
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: PanelTop,
                  title: "Rectangle room",
                  body: "The most precise V1 workflow for ballrooms, halls, and event spaces.",
                  href: "/studio/new?template=rectangle",
                  badge: "Recommended",
                },
                {
                  icon: BoxSelect,
                  title: "L-shape room",
                  body: "Set the overall room and a practical rectangular cutout.",
                  href: "/studio/new?template=l_shape",
                  badge: "Functional",
                },
                {
                  icon: PenTool,
                  title: "Blank / custom",
                  body: "Begin with a basic custom outline. Point editing expands in a later release.",
                  href: "/studio/new?template=custom",
                  badge: "Beta",
                },
              ].map(({ icon: Icon, title, body, href, badge }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-3xl border border-border/40 bg-card/25 p-5 transition-colors hover:border-primary/35 hover:bg-card/45"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {badge}
                    </Badge>
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-semibold">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Start this room
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-3xl border border-border/40 bg-card/25 p-5"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-5 font-heading text-lg font-semibold">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-5 rounded-4xl border border-primary/20 bg-[radial-gradient(circle_at_15%_50%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_45%)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Built first for precise planning
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold">
                  AI design assistance is coming next.
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Today&apos;s Studio is manual by design. Floor-plan upload and
                  AI-assisted suggestions are not part of this first release.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/ai">See what&apos;s next</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import {
  Building2,
  ClipboardList,
  Home,
  Images,
  Layers,
  LayoutDashboard,
  LogIn,
  Mail,
  Shield,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { BrandLogo } from "@/components/brand-logo";
import { NotFoundGoBack } from "@/components/marketing/not-found-go-back";
import { Reveal } from "@/components/animation/reveal";
import { Stagger, StaggerItem } from "@/components/animation/stagger";
import { Button } from "@/components/ui/button";
import { ViewportCurtainOpen } from "@/components/ui/curtain-reveal";
import {
  motionDurations,
  premiumEase,
  staggerDelay,
} from "@/lib/animation";
import { cn } from "@/lib/utils";

export type NotFoundPortalCta = {
  href: string;
  label: string;
  kind: "signin" | "account" | "admin";
};

type NotFoundStageProps = {
  portal: NotFoundPortalCta;
};

const secondaryCtas = [
  { href: "/get-estimate", label: "Get Estimate", icon: ClipboardList },
  { href: "/services", label: "Browse Services", icon: Layers },
  { href: "/contact", label: "Contact Us", icon: Mail },
] as const;

const quickLinksBase = [
  {
    href: "/get-estimate",
    label: "Get Estimate",
    description: "Start a draping brief",
    icon: ClipboardList,
  },
  {
    href: "/services/wedding-draping",
    label: "Wedding Draping",
    description: "Ceremony & reception",
    icon: Layers,
  },
  {
    href: "/services/corporate-event-draping",
    label: "Corporate Events",
    description: "Stages & brand moments",
    icon: Building2,
  },
  {
    href: "/gallery",
    label: "Gallery",
    description: "Recent transforms",
    icon: Images,
  },
] as const;

const portalIcons = {
  admin: Shield,
  account: LayoutDashboard,
  signin: LogIn,
} as const;

const portalDescriptions = {
  admin: "Owner workspace",
  account: "Quotes & events",
  signin: "Quotes, estimates & account",
} as const;

function PortalGlyph({
  kind,
  className,
}: {
  kind: NotFoundPortalCta["kind"];
  className?: string;
}) {
  const Icon = portalIcons[kind];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

export function NotFoundStage({ portal }: NotFoundStageProps) {
  const prefersReducedMotion = useReducedMotion();

  const quickLinks = [
    ...quickLinksBase,
    {
      href: portal.href,
      label: portal.label,
      description: portalDescriptions[portal.kind],
      icon: portalIcons[portal.kind],
    },
  ];

  return (
    <ViewportCurtainOpen>
      <section
        className="relative isolate min-h-[calc(100dvh-8rem)]"
        aria-labelledby="not-found-heading"
      >
      {/* Stage atmosphere — no side silhouettes (they read as leftover velvet) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_45%)]" />
        <div className="absolute inset-0 fabric-section opacity-80" />
      </div>

      {/* Oversized 404 watermark */}
      <motion.p
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-[8%] z-0 text-center",
          "font-heading text-[clamp(7rem,28vw,16rem)] font-semibold leading-none tracking-tight",
          "text-foreground/[0.04] dark:text-foreground/[0.055] select-none"
        )}
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, filter: "blur(12px)", scale: 1.04 }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, filter: "blur(0px)", scale: 1 }
        }
        transition={{
          duration: motionDurations.hero,
          ease: premiumEase,
          delay: 0.05,
        }}
      >
        404
      </motion.p>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:py-24">
        <Reveal variant="fade-down" immediate delay={1.05}>
          <BrandLogo size="md" priority className="mx-auto" />
        </Reveal>

        <Reveal variant="blur-in" immediate delay={1.15} className="mt-8 sm:mt-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
            Page not found
          </p>
          <p
            className={cn(
              "mt-3 font-heading text-[clamp(4.5rem,18vw,7.5rem)] font-semibold leading-none tracking-tight",
              "bg-gradient-to-b from-primary via-primary to-primary/50 bg-clip-text text-transparent"
            )}
            aria-hidden
          >
            404
          </p>
        </Reveal>

        <Reveal variant="fade-up" immediate delay={1.3} className="mt-5 max-w-2xl sm:mt-6">
          <h1
            id="not-found-heading"
            className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
          >
            The curtains opened, but this scene isn&apos;t here.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The page you&apos;re looking for may have moved, been removed, or
            never made it to the final setup. Let&apos;s get you back to
            something useful.
          </p>
        </Reveal>

        <Reveal variant="scale-in" immediate delay={1.45} className="mt-6 sm:mt-7">
          <div
            className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            aria-hidden
          />
          <p className="mt-4 font-heading text-sm italic text-muted-foreground sm:text-base">
            Let&apos;s get your event back on stage.
          </p>
        </Reveal>

        <Stagger
          immediate
          className="mt-8 flex w-full max-w-lg flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
          stagger={staggerDelay.tight}
          delayChildren={1.55}
        >
          <StaggerItem className="w-full sm:w-auto">
            <Button asChild size="lg" className="min-h-11 w-full px-6 sm:w-auto">
              <Link href="/">
                <Home className="size-4" strokeWidth={1.75} aria-hidden />
                Back home
              </Link>
            </Button>
          </StaggerItem>
          {secondaryCtas.map((cta) => {
            const Icon = cta.icon;
            return (
              <StaggerItem key={cta.href} className="w-full sm:w-auto">
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-h-11 w-full border-border/60 bg-card/40 px-5 backdrop-blur-sm sm:w-auto"
                >
                  <Link href={cta.href}>
                    <Icon className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
                    {cta.label}
                  </Link>
                </Button>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal variant="fade-up" immediate delay={1.75} className="mt-5">
          <NotFoundGoBack />
        </Reveal>

        {/* Missing-scene card + portal helper */}
        <Reveal
          variant="reveal-soft"
          immediate
          delay={1.85}
          className="mt-12 w-full max-w-2xl sm:mt-14"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[min(var(--radius-4xl),1.5rem)]",
              "border border-border/40 bg-card/35 p-5 shadow-[0_8px_32px_oklch(0_0_0/0.12)]",
              "ring-1 ring-foreground/5 backdrop-blur-sm sm:p-6"
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%)]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="text-left">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                  Missing scene
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Looking for your quote, estimate, or account details? Head to
                  your portal below.
                </p>
              </div>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="min-h-11 shrink-0"
              >
                <Link href={portal.href}>
                  <PortalGlyph kind={portal.kind} className="size-4 text-primary" />
                  {portal.label}
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Quick links */}
        <div className="mt-10 w-full max-w-3xl sm:mt-12">
          <Reveal variant="fade-up" immediate delay={1.95}>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Popular destinations
            </h2>
          </Reveal>
          <Stagger
            immediate
            className="mt-4 grid gap-2.5 sm:grid-cols-2"
            stagger={staggerDelay.tight}
            delayChildren={2.05}
          >
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <StaggerItem key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border border-border/40 bg-card/25 p-3.5 text-left",
                      "transition-[transform,border-color,background-color,box-shadow] duration-200",
                      "hover:-translate-y-px hover:border-primary/30 hover:bg-card/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-sm font-medium text-foreground">
                        {link.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
    </ViewportCurtainOpen>
  );
}

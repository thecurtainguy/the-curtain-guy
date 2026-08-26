"use client";

import {
  ArrowRight,
  Box,
  Building2,
  CalendarDays,
  ClipboardList,
  Crown,
  FileText,
  Layers,
  Layers3,
  LayoutDashboard,
  MousePointer2,
  Package,
  PanelsTopLeft,
  PenLine,
  PenTool,
  RotateCcw,
  Ruler,
  Save,
  Sparkles,
  Theater,
  Truck,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { cn } from "@/lib/utils";

const studioFeatureIcons = [Ruler, Layers3, Box, Save] as const;
const processIcons = [Package, Truck, Wrench, RotateCcw] as const;
const portalStatKeys = ["estimates", "quotes", "designs"] as const;
const portalStatValues = ["3", "1", "2"] as const;
const portalNavIcons = [
  LayoutDashboard,
  ClipboardList,
  FileText,
  PanelsTopLeft,
] as const;
const studioToolIcons = [Ruler, Layers3, PenTool, Save] as const;
const eventTypeIcons = [Layers, Building2, Crown, Theater] as const;
const estimateFlowIcons = [PenLine, FileText, CalendarDays] as const;

const showcaseGlass =
  "relative overflow-hidden rounded-2xl border border-white/18 bg-gradient-to-br from-black/58 via-black/50 to-black/55 shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-xl";

const showcaseGlassMuted =
  "relative overflow-hidden rounded-2xl border border-white/18 bg-gradient-to-br from-black/55 via-black/48 to-black/52 shadow-[0_12px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/10 backdrop-blur-lg";

/** Fixed luxury gold — avoids light-theme primary washing out on glass. */
const showcaseGoldText =
  "text-[oklch(0.84_0.14_88)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]";

const showcaseGoldIcon =
  "text-[oklch(0.86_0.12_88)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]";

const showcaseGoldIconBadge =
  "bg-[oklch(0.76_0.15_88/0.24)] text-[oklch(0.9_0.11_88)] ring-1 ring-[oklch(0.76_0.15_88/0.5)] shadow-[0_0_18px_rgba(212,175,55,0.3)]";

const showcaseGoldChip =
  "border-[oklch(0.76_0.15_88/0.38)] bg-[oklch(0.76_0.15_88/0.14)]";

const showcaseGoldChipActive =
  "border-[oklch(0.76_0.15_88/0.48)] bg-[oklch(0.76_0.15_88/0.22)]";

const showcaseGoldPill =
  "inline-flex items-center gap-1 rounded-full border border-[oklch(0.76_0.15_88/0.42)] bg-[oklch(0.76_0.15_88/0.14)] px-2 py-0.5 text-[9px] font-medium text-[oklch(0.88_0.11_88)]";

const showcaseGoldStep =
  "flex size-8 items-center justify-center rounded-full border border-[oklch(0.76_0.15_88/0.42)] bg-[oklch(0.76_0.15_88/0.16)] text-[oklch(0.88_0.11_88)] shadow-[0_0_12px_rgba(212,175,55,0.18)]";

const showcaseEyebrow =
  "text-[9px] font-semibold uppercase tracking-[0.18em]";

function AuthShowcaseStudioPreview() {
  const t = useTranslations("account-auth.showcase.studioPreview");

  return (
    <div className={cn(showcaseGlassMuted, "p-3 sm:p-3.5")}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <p className={cn(showcaseEyebrow, showcaseGoldText)}>
            {t("eyebrow")}
          </p>
          <p className="mt-0.5 font-heading text-xs font-medium text-white sm:text-sm">
            {t("title")}
          </p>
        </div>
        <span className={showcaseGoldPill}>
          <MousePointer2 className="size-2.5" />
          Live
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/12 bg-[#0c0c0c]/90 shadow-inner">
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/50 px-2 py-1.5">
          <span
            className="size-1.5 rounded-full bg-[oklch(0.76_0.15_88/0.85)]"
            aria-hidden
          />
          <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-white/55">
            {t("toolbar")}
          </span>
          <div className="ml-auto flex gap-1">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[8px] font-semibold",
                showcaseGoldChipActive,
                showcaseGoldIcon
              )}
            >
              {t("view2d")}
            </span>
            <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[8px] text-white/45">
              {t("view3d")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[52px_minmax(0,1fr)_58px]">
          <div
            className="space-y-1 border-r border-white/10 p-1.5"
            aria-label={t("tools")}
          >
            {studioToolIcons.map((Icon, index) => (
              <div
                key={index}
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg border",
                  index === 0
                    ? cn("border", showcaseGoldChipActive, showcaseGoldIcon)
                    : "border-white/8 bg-white/[0.04] text-white/45"
                )}
              >
                <Icon className="size-3" strokeWidth={1.75} />
              </div>
            ))}
          </div>

          <div className="relative min-h-[148px] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:14px_14px] sm:min-h-[168px] lg:min-h-[192px]">
            <div className="absolute inset-[18%] rounded-sm border border-[oklch(0.76_0.15_88/0.38)] bg-[oklch(0.76_0.15_88/0.08)]" />
            <div className="absolute left-[18%] top-[18%] h-[64%] w-0.5 bg-[oklch(0.76_0.15_88/0.5)]" />
            <div className="absolute right-[18%] top-[18%] h-[64%] w-0.5 bg-[oklch(0.76_0.15_88/0.35)]" />
            <div className="absolute bottom-[22%] left-1/2 h-0.5 w-[28%] -translate-x-1/2 bg-[oklch(0.76_0.15_88/0.28)]" />
            <div className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/45 px-1 py-0.5 text-[7px] text-white/50">
              42&apos; × 28&apos;
            </div>
          </div>

          <div
            className="space-y-1.5 border-l border-white/10 p-1.5"
            aria-label={t("properties")}
          >
            <div className="h-1.5 w-full rounded bg-white/12" />
            <div className="h-1.5 w-4/5 rounded bg-white/10" />
            <div className="h-1.5 w-full rounded bg-[oklch(0.76_0.15_88/0.22)]" />
            <div className="mt-2 rounded-md border border-white/10 bg-white/[0.04] p-1">
              <div className="h-1 w-2/3 rounded bg-white/15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthShowcasePortalPreview() {
  const t = useTranslations("account-auth.showcase.portal");
  const navLabels = t.raw("nav") as string[];

  return (
    <div className={cn(showcaseGlassMuted, "flex h-full flex-col p-3 sm:p-3.5")}>
      <p className={cn(showcaseEyebrow, showcaseGoldText)}>{t("eyebrow")}</p>
      <p className="mt-0.5 font-heading text-xs font-medium text-white sm:text-sm">
        {t("title")}
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {portalStatKeys.map((key, index) => (
          <div
            key={key}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-center"
          >
            <p className="font-heading text-lg font-semibold leading-none text-white">
              {portalStatValues[index]}
            </p>
            <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.08em] text-white/60">
              {t(`stats.${key}`)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {navLabels.map((label, index) => {
          const Icon = portalNavIcons[index] ?? LayoutDashboard;
          return (
            <div
              key={label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center",
                index === 0
                  ? cn("border", showcaseGoldChipActive)
                  : "border-white/10 bg-white/[0.03]"
              )}
            >
              <Icon
                className={cn(
                  "size-3",
                  index === 0 ? showcaseGoldIcon : "text-white/55"
                )}
                strokeWidth={1.75}
              />
              <span className="text-[7px] font-semibold uppercase tracking-[0.04em] text-white/75 leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuthShowcaseEventTypes() {
  const t = useTranslations("account-auth.showcase.eventTypes");
  const items = t.raw("items") as string[];

  return (
    <div className={cn(showcaseGlassMuted, "flex h-full flex-col p-3 sm:p-3.5")}>
      <p className={cn(showcaseEyebrow, showcaseGoldText)}>{t("eyebrow")}</p>
      <p className="mt-0.5 font-heading text-xs font-medium text-white sm:text-sm">
        {t("title")}
      </p>
      <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5 content-start">
        {items.map((label, index) => {
          const Icon = eventTypeIcons[index] ?? Layers;
          return (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5"
            >
              <Icon className={cn("size-3 shrink-0", showcaseGoldIcon)} strokeWidth={1.75} />
              <span className="text-[9px] font-medium leading-tight text-white/85">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuthShowcaseEstimateFlow() {
  const t = useTranslations("account-auth.showcase.estimateFlow");
  const steps = t.raw("steps") as string[];

  return (
    <div className={cn(showcaseGlassMuted, "p-3 sm:col-span-2 sm:p-3.5")}>
      <p className={cn(showcaseEyebrow, showcaseGoldText)}>{t("eyebrow")}</p>
      <p className="mt-0.5 font-heading text-xs font-medium text-white sm:text-sm">
        {t("title")}
      </p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {steps.map((label, index) => {
          const Icon = estimateFlowIcons[index] ?? PenLine;
          return (
            <div key={label} className="relative flex flex-col items-center text-center">
              {index < steps.length - 1 && (
                <span
                  className="pointer-events-none absolute left-[calc(50%+14px)] top-4 hidden h-px w-[calc(100%-28px)] bg-gradient-to-r from-[oklch(0.76_0.15_88/0.45)] to-[oklch(0.76_0.15_88/0.08)] sm:block"
                  aria-hidden
                />
              )}
              <span className={showcaseGoldStep}>
                <Icon className="size-3.5" strokeWidth={1.75} />
              </span>
              <span className="mt-1.5 text-[8px] font-medium leading-tight text-white/80 sm:text-[9px]">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AccountAuthShowcase() {
  const t = useTranslations("account-auth.showcase");
  const studioFeatures = t.raw("features") as string[];
  const processLabels = t.raw("company.process") as string[];

  return (
    <div
      className={cn(
        "relative h-full min-h-[22rem] w-full overflow-hidden",
        "rounded-[1.75rem] border border-border/45 shadow-[0_20px_60px_oklch(0_0_0/20%)] sm:min-h-[26rem] sm:rounded-[2rem]",
        "lg:min-h-full lg:rounded-none lg:border-0 lg:shadow-none"
      )}
    >
      <SiteMediaImage
        mediaKey="home.hero.primary"
        priority
        sizes="(max-width: 1024px) 92vw, 50vw"
        className="absolute inset-0"
        imageClassName="object-cover object-[center_42%] scale-[1.06]"
      />

      <div
        className="absolute inset-0 bg-black/35"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black/20"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(212,175,55,0.14),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-0 items-center justify-center overflow-y-auto px-2 py-8 sm:px-3 sm:py-10 lg:px-4 lg:py-12 xl:px-5 luxury-scroll">
        <div className="my-auto flex w-full max-w-3xl flex-col gap-2.5 sm:gap-3">
        {/* Studio features — compact */}
        <div className={cn(showcaseGlass, "shrink-0 p-3 sm:p-3.5")}>
          <div className="relative flex items-start gap-2.5">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                showcaseGoldIconBadge
              )}
            >
              <Sparkles className="size-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-[0.2em]",
                  showcaseGoldText
                )}
              >
                {t("studio.eyebrow")}
              </p>
              <h2 className="mt-0.5 font-heading text-sm font-semibold leading-snug text-white sm:text-base">
                {t("studio.title")}
              </h2>
            </div>
          </div>

          <div className="relative mt-2.5 grid grid-cols-2 gap-1.5">
            {studioFeatures.map((label, index) => {
              const Icon = studioFeatureIcons[index] ?? Ruler;
              return (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-black/25 px-2 py-1.5"
                >
                  <Icon
                    className={cn("size-3 shrink-0", showcaseGoldIcon)}
                    strokeWidth={1.75}
                  />
                  <span className="text-[10px] font-medium leading-tight text-white/90">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="relative mt-2.5 rounded-lg border border-white/12 bg-black/25 p-2">
            <p
              className={cn(
                "text-[8px] font-semibold uppercase tracking-[0.14em]",
                showcaseGoldText
              )}
            >
              {t("studio.viewsLabel")}
            </p>
            <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-[10px]">
              <span className="rounded-md border border-white/15 bg-white/8 px-1.5 py-1 text-center font-medium text-white/85">
                {t("studio.view2d")}
              </span>
              <ArrowRight className={cn("size-3", showcaseGoldIcon)} aria-hidden />
              <span
                className={cn(
                  "rounded-md px-1.5 py-1 text-center font-medium text-white",
                  showcaseGoldChipActive
                )}
              >
                {t("studio.view3d")}
              </span>
            </div>
          </div>
        </div>

        <AuthShowcaseStudioPreview />

        <div className="grid shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          <AuthShowcasePortalPreview />
          <AuthShowcaseEventTypes />
          <AuthShowcaseEstimateFlow />
        </div>

        {/* Trust strip */}
        <div className={cn(showcaseGlassMuted, "shrink-0 p-3 sm:p-3.5")}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 shrink-0">
              <p className={cn(showcaseEyebrow, showcaseGoldText)}>
                {t("company.eyebrow")}
              </p>
              <p className="mt-0.5 font-heading text-[11px] font-medium text-white sm:text-xs">
                {t("company.tagline")}
              </p>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-1 sm:gap-1.5 lg:max-w-[72%]">
              {processLabels.map((label, index) => {
                const Icon = processIcons[index] ?? Package;
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] px-1 py-1.5 text-center"
                  >
                    <Icon className={cn("size-3", showcaseGoldIcon)} strokeWidth={1.75} />
                    <span className="text-[7px] font-semibold uppercase tracking-[0.05em] text-white/75 sm:text-[8px]">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

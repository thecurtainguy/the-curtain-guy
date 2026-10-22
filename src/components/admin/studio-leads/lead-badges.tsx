import {
  Building2,
  CalendarClock,
  Eye,
  FileText,
  type LucideIcon,
  PanelsTopLeft,
  Send,
  Sparkles,
  Trophy,
  UserRoundCheck,
  Wand2,
} from "lucide-react";
import {
  STUDIO_LEAD_STAGE_LABELS,
  type StudioDesignSource,
  type StudioLeadStage,
} from "@/data/studio-leads";
import { cn } from "@/lib/utils";
import { STUDIO_LEAD_SOURCE_LABELS } from "./studio-leads-shared";

export const STUDIO_LEAD_STAGE_ICONS: Record<StudioLeadStage, LucideIcon> = {
  browsing: Eye,
  details: CalendarClock,
  contact: UserRoundCheck,
  submitted: Send,
  quoted: FileText,
  won: Trophy,
};

const STAGE_TONES: Record<StudioLeadStage, string> = {
  browsing: "border-border/60 bg-muted/40 text-muted-foreground",
  details: "border-primary/25 bg-primary/[0.07] text-foreground",
  contact: "border-primary/40 bg-primary/12 text-primary",
  submitted: "border-primary/50 bg-primary/18 text-primary",
  quoted: "border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  won: "border-emerald-400/45 bg-emerald-400/12 text-emerald-700 dark:text-emerald-300",
};

const SOURCE_ICONS: Record<StudioDesignSource, LucideIcon> = {
  studio: PanelsTopLeft,
  event_builder: Wand2,
  admin: Building2,
};

export function StudioLeadStageBadge({
  stage,
  className,
}: {
  stage: StudioLeadStage;
  className?: string;
}) {
  const Icon = STUDIO_LEAD_STAGE_ICONS[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide whitespace-nowrap",
        STAGE_TONES[stage],
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {STUDIO_LEAD_STAGE_LABELS[stage]}
    </span>
  );
}

export function StudioLeadSourceBadge({
  source,
  className,
}: {
  source: StudioDesignSource;
  className?: string;
}) {
  const Icon = SOURCE_ICONS[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[0.68rem] font-medium whitespace-nowrap text-muted-foreground",
        className
      )}
    >
      <Icon className="size-3 text-primary" aria-hidden />
      {STUDIO_LEAD_SOURCE_LABELS[source]}
    </span>
  );
}

/** "In 12 days" chip; red-gold urgency inside two weeks, muted once past. */
export function EventCountdownChip({
  days,
  className,
}: {
  days: number | null;
  className?: string;
}) {
  if (days === null) return null;
  const label =
    days === 0
      ? "Today"
      : days === 1
        ? "Tomorrow"
        : days > 1
          ? `In ${days} days`
          : days === -1
            ? "Yesterday"
            : `${Math.abs(days)} days ago`;
  const tone =
    days < 0
      ? "border-border/50 bg-muted/30 text-muted-foreground"
      : days <= 14
        ? "border-rose-400/45 bg-rose-400/12 text-rose-700 dark:text-rose-300"
        : days <= 45
          ? "border-primary/45 bg-primary/12 text-primary"
          : "border-border/50 bg-background/60 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap",
        tone,
        className
      )}
    >
      <Sparkles className="size-2.5" aria-hidden />
      {label}
    </span>
  );
}

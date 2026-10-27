"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpenCheck,
  Clock,
  Download,
  Eye,
  History,
  Laptop,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  Tablet,
  UserRound,
  Users,
} from "lucide-react";
import type {
  DocumentEngagement,
  EngagementActivity,
  EngagementEmail,
} from "@/lib/document-engagement";
import { cn } from "@/lib/utils";

const ACTIVITY_PREVIEW = 8;

function formatStamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function Stamp({ value, className }: { value: string; className?: string }) {
  return (
    <time dateTime={value} className={className} suppressHydrationWarning>
      {formatStamp(value)}
    </time>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-heading text-xl font-semibold leading-none text-foreground">{value}</p>
    </div>
  );
}

type Tone = "gold" | "good" | "warn" | "bad" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  gold: "border-primary/40 bg-primary/10 text-primary",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  bad: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  muted: "border-border/50 bg-background/40 text-muted-foreground",
};

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", TONE_CLASS[tone])}>
      {children}
    </span>
  );
}

function emailChips(email: EngagementEmail, trackingConfigured: boolean): Array<{ tone: Tone; label: string }> {
  if (!email.tracked) return [{ tone: "muted", label: "Sent · before delivery tracking" }];
  if (email.bouncedAt) return [{ tone: "bad", label: "Bounced" }];
  if (email.failedAt) return [{ tone: "bad", label: "Failed" }];
  const chips: Array<{ tone: Tone; label: string }> = [];
  if (email.complainedAt) chips.push({ tone: "bad", label: "Marked as spam" });
  if (email.deliveredAt) chips.push({ tone: "good", label: "Delivered" });
  else if (email.delayedAt) chips.push({ tone: "warn", label: "Delivery delayed" });
  if (email.openCount > 0) {
    chips.push({ tone: "gold", label: email.openCount === 1 ? "Email opened" : `Email opened ${email.openCount}×` });
  }
  if (chips.length === 0) {
    chips.push({ tone: "muted", label: trackingConfigured ? "Sent · waiting for report" : "Sent" });
  }
  return chips;
}

const DEVICE_LABEL: Record<string, string> = { mobile: "Phone", tablet: "Tablet", desktop: "Computer" };

function DeviceIcon({ device }: { device: string | null }) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Laptop;
  return <Icon className="size-3.5" />;
}

function describeActivity(item: EngagementActivity): { title: string; muted: boolean; icon: LucideIcon } {
  const owner = item.source === "owner_copy" || item.source === "admin_session";
  switch (item.kind) {
    case "view":
      return {
        title: item.returning ? "Read again" : "Read",
        muted: false,
        icon: BookOpenCheck,
      };
    case "pdf":
      return { title: owner ? "PDF opened by you" : "PDF downloaded", muted: owner || item.isBot, icon: Download };
    case "owner":
      return { title: "Opened by you", muted: true, icon: UserRound };
    case "legacy_open":
      return { title: "Link opened · before tracking", muted: true, icon: History };
    case "legacy_pdf":
      return { title: "PDF opened · before tracking", muted: true, icon: History };
    default:
      return {
        title: item.isBot ? "Checked by email security" : "Link opened, not read",
        muted: true,
        icon: ShieldCheck,
      };
  }
}

function ActivityRow({ item }: { item: EngagementActivity }) {
  const { title, muted, icon: Icon } = describeActivity(item);
  const device = [item.device ? (DEVICE_LABEL[item.device] ?? item.device) : null, item.browser, item.os]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className={cn("flex gap-3 py-2.5", muted && "opacity-55")}>
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          muted ? "bg-muted/40 text-muted-foreground" : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {title}
            {item.kind === "view" && item.activeSeconds > 0 ? (
              <span className="font-normal text-muted-foreground"> · {formatDuration(item.activeSeconds)}</span>
            ) : null}
          </p>
          <Stamp value={item.at} className="shrink-0 text-[11px] text-muted-foreground" />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {device ? (
            <span className="inline-flex items-center gap-1">
              <DeviceIcon device={item.device} />
              {device}
            </span>
          ) : null}
          {item.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {item.location}
            </span>
          ) : null}
          {item.source === "account" ? <span>Portal</span> : null}
          {item.kind === "legacy_open" || item.kind === "legacy_pdf" ? (
            <span>Unverified: could be a scanner or your own copy</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function DocumentEngagementCard({
  engagement,
  documentLabel,
}: {
  engagement: DocumentEngagement;
  documentLabel: "quote" | "invoice";
}) {
  const [showAll, setShowAll] = useState(false);
  const activity = showAll ? engagement.activity : engagement.activity.slice(0, ACTIVITY_PREVIEW);
  const hidden = engagement.activity.length - activity.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div className="relative border-b border-border/40 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.14),transparent_65%)] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Activity className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Engagement</p>
            <h2 className="font-heading text-lg font-semibold leading-tight">Who opened this {documentLabel}</h2>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {engagement.lastViewedAt ? (
            <>
              Last read <Stamp value={engagement.lastViewedAt} className="text-foreground" />
              {engagement.firstViewedAt &&
              formatStamp(engagement.firstViewedAt) !== formatStamp(engagement.lastViewedAt) ? (
                <>
                  {" "}· first <Stamp value={engagement.firstViewedAt} />
                </>
              ) : null}
            </>
          ) : engagement.legacyLastOpenedAt ? (
            <>
              No verified reads yet · link last opened{" "}
              <Stamp value={engagement.legacyLastOpenedAt} className="text-foreground" /> before tracking
            </>
          ) : (
            "Not read by the customer yet."
          )}
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Eye} label="Views" value={String(engagement.views)} />
          <StatTile icon={Users} label="Devices" value={String(engagement.readers)} />
          <StatTile icon={Clock} label="Read time" value={formatDuration(engagement.activeSeconds)} />
          <StatTile icon={Download} label="PDF" value={String(engagement.pdfDownloads)} />
        </div>

        {engagement.emails.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 text-primary" />
              <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Emails sent</h3>
            </div>
            <ul className="space-y-2">
              {engagement.emails.map((email) => (
                <li key={email.id} className="rounded-xl border border-border/30 bg-background/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-medium text-foreground">
                      {[...email.to, ...email.cc].join(", ")}
                    </p>
                    <Stamp value={email.sentAt} className="shrink-0 text-[11px] text-muted-foreground" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {emailChips(email, engagement.trackingConfigured).map((chip) => (
                      <Chip key={chip.label} tone={chip.tone}>
                        {chip.label}
                      </Chip>
                    ))}
                  </div>
                  {email.bounceMessage ? (
                    <p className="mt-1.5 text-[11px] text-red-700 dark:text-red-300/80">{email.bounceMessage}</p>
                  ) : null}
                  {email.lastOpenedAt && email.openCount > 1 ? (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Last opened <Stamp value={email.lastOpenedAt} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {activity.length > 0 ? (
          <div>
            <div className="flex items-center gap-2">
              <Activity className="size-3.5 text-primary" />
              <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Activity</h3>
            </div>
            <ul className="mt-1 divide-y divide-border/30">
              {activity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
            {hidden > 0 || showAll ? (
              <button
                type="button"
                className="mt-1 text-xs font-medium text-primary hover:underline"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? "Show less" : `Show ${hidden} more`}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/40 p-3 text-center text-xs text-muted-foreground">
            No activity since tracking started.
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          Views count only real people reading the page; your own opens and email security link checks are
          listed but not counted. Email opens are approximate: some mail apps load images automatically, others
          block them.
          {engagement.trackingConfigured ? "" : " Delivery reports start once the Resend webhook is connected."}
        </p>
      </div>
    </section>
  );
}

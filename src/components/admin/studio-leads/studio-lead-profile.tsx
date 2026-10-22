import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  Link2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { STUDIO_LEAD_STAGE_ICONS, EventCountdownChip, StudioLeadStageBadge } from "./lead-badges";
import type { StudioLeadDetail, StudioLeadTimelineKey } from "@/lib/studio-leads-admin";
import { formatEventPlanReference } from "@/data/event-plans";
import { cn } from "@/lib/utils";

function Card({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_60%)] px-3.5 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
          <h2 className="truncate font-heading text-sm leading-tight">{title}</h2>
        </div>
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2",
        value ? "border-primary/20 bg-primary/[0.05]" : "border-border/40 bg-background/30"
      )}
    >
      <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-0.5 text-sm break-words", value ? "font-medium text-foreground" : "text-muted-foreground italic")}>
        {value ?? "—"}
      </p>
    </div>
  );
}

const TIMELINE_ICONS: Record<StudioLeadTimelineKey, LucideIcon> = {
  created: Sparkles,
  details: STUDIO_LEAD_STAGE_ICONS.details,
  contact: STUDIO_LEAD_STAGE_ICONS.contact,
  submitted: STUDIO_LEAD_STAGE_ICONS.submitted,
  quoted: STUDIO_LEAD_STAGE_ICONS.quoted,
  won: STUDIO_LEAD_STAGE_ICONS.won,
};

function initials(name: string | null, email: string | null): string {
  const source = name ?? email ?? "";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function formatMoney(cents: number | null): string | null {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function RecordLink({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  detail?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/40 px-2.5 py-2 transition-colors hover:border-primary/40"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {detail ? <span className="block truncate text-xs text-muted-foreground">{detail}</span> : null}
      </span>
      <ArrowUpRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
    </Link>
  );
}

/** Left column of the lead review: who, what event, how far along, and linked records. */
export function StudioLeadProfile({ lead }: { lead: StudioLeadDetail }) {
  const { contact, event, links } = lead;
  const anonymous = !contact.name && !contact.email;
  const place = [event.venueName, event.cityArea].filter(Boolean).join(", ") || null;
  const hasLinks = Boolean(links.estimate || links.quote || links.job || links.eventPlans.length);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/14 via-card to-card shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.18),transparent_60%)]"
          aria-hidden
        />
        <div className="relative space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 font-heading text-lg font-semibold text-primary ring-1 ring-primary/30">
              {anonymous ? <UserRound className="size-5" aria-hidden /> : initials(contact.name, contact.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
                {contact.hasAccount ? "Customer account" : anonymous ? "Anonymous visitor" : "Studio lead"}
              </p>
              <p className="truncate font-heading text-lg leading-tight text-foreground">
                {contact.name ?? contact.email ?? "Not shared yet"}
              </p>
              {anonymous && contact.visitorShort ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  Visitor {contact.visitorShort}
                </p>
              ) : null}
            </div>
          </div>
          <StudioLeadStageBadge stage={lead.stage} />
          {contact.email || contact.phone ? (
            <div className="grid gap-1.5">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2.5 rounded-xl border border-primary/25 bg-background/50 px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  <Phone className="size-4 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{contact.phone}</span>
                  <span className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">Call</span>
                </a>
              ) : null}
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}?subject=${encodeURIComponent(`Your ${event.name ?? "event"} design — The Curtain Guy`)}`}
                  className="flex items-center gap-2.5 rounded-xl border border-primary/25 bg-background/50 px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  <Mail className="size-4 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{contact.email}</span>
                  <span className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">Email</span>
                </a>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              No contact yet — they’ll appear here once they save with their details.
            </p>
          )}
        </div>
      </section>

      <Card icon={CalendarDays} eyebrow="Event" title={event.name ?? "Event details"}>
        <div className="grid grid-cols-2 gap-2">
          <Fact label="Type" value={event.typeLabel} />
          <div
            className={cn(
              "rounded-xl border px-2.5 py-2",
              event.dateLabel ? "border-primary/20 bg-primary/[0.05]" : "border-border/40 bg-background/30"
            )}
          >
            <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Date</p>
            <p className={cn("mt-0.5 text-sm", event.dateLabel ? "font-medium text-foreground" : "text-muted-foreground italic")}>
              {event.dateLabel ?? "—"}
            </p>
            <EventCountdownChip days={event.daysUntil} className="mt-1" />
          </div>
          <Fact label="Guests" value={event.guestCount ? event.guestCount.toLocaleString() : null} />
          <Fact label="Language" value={contact.language ? contact.language.toUpperCase() : null} />
        </div>
        {place ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden />
            {place}
          </p>
        ) : null}
      </Card>

      <Card icon={Trophy} eyebrow="Pipeline" title="Stage timeline">
        <ol className="relative space-y-3">
          {lead.timeline.map((step, index) => {
            const Icon = TIMELINE_ICONS[step.key];
            const last = index === lead.timeline.length - 1;
            return (
              <li key={step.key} className="relative flex gap-3">
                {!last ? (
                  <span
                    className={cn(
                      "absolute top-8 left-[0.9rem] h-[calc(100%-1.25rem)] w-px",
                      step.reached && lead.timeline[index + 1]?.reached ? "bg-primary/50" : "bg-border/60"
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full border",
                    step.reached
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/60 bg-background/40 text-muted-foreground/60"
                  )}
                >
                  {step.reached ? <Check className="size-3.5" aria-hidden /> : <Icon className="size-3.5" aria-hidden />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={cn("text-sm", step.reached ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {step.atLabel ?? (step.reached ? "Reached" : "Not yet")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card icon={Link2} eyebrow="Records" title="Linked work">
        {hasLinks ? (
          <div className="grid gap-1.5">
            {links.eventPlans.map((plan) => (
              <RecordLink
                key={plan.id}
                href={`/admin/event-plans/${plan.id}`}
                icon={Sparkles}
                label={`Event plan ${formatEventPlanReference(plan.id, plan.reference)}`}
                detail={[plan.status, plan.createdLabel].filter(Boolean).join(" · ")}
              />
            ))}
            {links.estimate ? (
              <RecordLink
                href={`/admin/estimates/${links.estimate.id}`}
                icon={ClipboardList}
                label="Estimate request"
                detail={links.estimate.ref}
              />
            ) : null}
            {links.quote ? (
              <RecordLink
                href={`/admin/quotes/${links.quote.id}`}
                icon={FileText}
                label={`Quote ${links.quote.ref ?? ""}`.trim()}
                detail={[
                  links.quote.status,
                  formatMoney(links.quote.totalCents),
                  links.quote.acceptedAt ? "Accepted" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ) : null}
            {links.job ? (
              <RecordLink
                href={`/admin/jobs/${links.job.id}`}
                icon={Trophy}
                label={links.job.name ?? "Booked job"}
                detail={links.job.status?.replaceAll("_", " ")}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Not linked to an event plan, estimate, quote, or job yet.
          </p>
        )}
      </Card>
    </div>
  );
}

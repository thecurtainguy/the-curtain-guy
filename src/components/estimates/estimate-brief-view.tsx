import type { LucideIcon } from "lucide-react";
import {
  Layers,
  MessageSquare,
  Palette,
  Ruler,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  SUMMARY_NOT_PROVIDED,
  SUMMARY_NOT_SURE,
  getOptionLabel,
  type EstimateOption,
} from "@/data/estimate";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import {
  addOnOptions,
  asOptionIds,
  buildAdminMeasurementRows,
  drapeGoals,
  eventTypes,
  fabricDirections,
  formatEventType,
  formatVenueSetting,
  fullnessOptions,
  getLookAndFabricIds,
} from "@/lib/estimate-display";
import { cn } from "@/lib/utils";

export type EstimateBriefViewData = {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  city_area: string | null;
  venue_setting: string | null;
  guest_count: number | null;
  drape_goals: unknown;
  measurements: unknown;
  look_and_fabric: unknown;
  add_ons: unknown;
  notes: string | null;
  user_id?: string | null;
};

function isPendingValue(value: string): boolean {
  return (
    value === "—" ||
    value === SUMMARY_NOT_SURE ||
    value === SUMMARY_NOT_PROVIDED ||
    value === "None selected"
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Icon className="size-4" />
          </span>
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FactTile({ label, value }: { label: string; value: string }) {
  const pending = isPendingValue(value);
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        pending
          ? "border-border bg-background/40"
          : "border-primary/20 bg-primary/[0.06]"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-words text-sm",
          pending
            ? "italic text-muted-foreground"
            : "font-medium text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function OptionChips({
  options,
  selectedIds,
  emptyLabel,
}: {
  options: EstimateOption[];
  selectedIds: string[];
  emptyLabel: string;
}) {
  if (selectedIds.length === 0) {
    return (
      <span className="inline-flex rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs italic text-muted-foreground">
        {emptyLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedIds.map((id) => {
        const option = options.find((item) => item.id === id);
        const Icon = option?.icon;
        const label = getOptionLabel(options, id) ?? id;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {Icon ? <Icon className="size-3.5 text-primary" /> : null}
            {label}
          </span>
        );
      })}
    </div>
  );
}

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISODate(value);
  if (parsed) return formatDisplayDate(parsed);
  return value;
}

export function EstimateBriefView({
  estimate,
  audience,
  className,
}: {
  estimate: EstimateBriefViewData;
  audience: "admin" | "customer";
  className?: string;
}) {
  const goalIds = asOptionIds(estimate.drape_goals);
  const addOnIds = asOptionIds(estimate.add_ons);
  const look = getLookAndFabricIds(estimate.look_and_fabric);
  const measurementRows = buildAdminMeasurementRows(estimate.measurements);
  const eventTypeLabel = formatEventType(estimate.event_type);
  const eventTypeOption = eventTypes.find(
    (item) => item.id === estimate.event_type
  );
  const EventIcon = eventTypeOption?.icon ?? Sparkles;

  return (
    <div className={cn("space-y-5", className)}>
      <SectionCard
        icon={UserRound}
        title={audience === "admin" ? "Customer" : "Your contact"}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <FactTile label="Name" value={estimate.customer_name || "—"} />
          <FactTile label="Email" value={estimate.customer_email || "—"} />
          <FactTile
            label="Phone"
            value={estimate.customer_phone?.trim() || "—"}
          />
          {audience === "admin" ? (
            <FactTile
              label="Account"
              value={estimate.user_id ? "Linked" : "Guest"}
            />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard icon={EventIcon} title="Event">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <FactTile label="Type" value={eventTypeLabel} />
          <FactTile label="Date" value={formatEventDate(estimate.event_date)} />
          <FactTile label="Venue" value={estimate.venue_name?.trim() || "—"} />
          <FactTile
            label="City / area"
            value={estimate.city_area?.trim() || "—"}
          />
          <FactTile
            label="Setting"
            value={formatVenueSetting(estimate.venue_setting)}
          />
          <FactTile
            label="Guests"
            value={
              estimate.guest_count != null ? String(estimate.guest_count) : "—"
            }
          />
        </div>
      </SectionCard>

      <SectionCard icon={Layers} title="Drape goals">
        <OptionChips
          options={drapeGoals}
          selectedIds={goalIds}
          emptyLabel="No goals selected"
        />
      </SectionCard>

      <SectionCard icon={Ruler} title="Measurements">
        <div className="grid gap-2 sm:grid-cols-2">
          {measurementRows.map((row) => (
            <FactTile key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Palette} title="Look & fabric">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Fabric direction
            </p>
            <OptionChips
              options={fabricDirections}
              selectedIds={look.fabricDirections}
              emptyLabel="Not specified"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <FactTile
              label="Fullness"
              value={
                look.fullnessPreference
                  ? (getOptionLabel(
                      fullnessOptions,
                      look.fullnessPreference
                    ) ?? look.fullnessPreference)
                  : "—"
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Sparkles} title="Add-ons">
        <OptionChips
          options={addOnOptions}
          selectedIds={addOnIds}
          emptyLabel="None selected"
        />
      </SectionCard>

      <SectionCard
        icon={MessageSquare}
        title={audience === "admin" ? "Customer notes" : "Your notes"}
      >
        {estimate.notes?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {estimate.notes}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No notes provided.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

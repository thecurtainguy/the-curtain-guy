"use client";

import type { ReactNode } from "react";
import {
  ArrowUpDown,
  Building2,
  CalendarDays,
  Car,
  Clapperboard,
  DoorOpen,
  Eye,
  Hammer,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  Navigation,
  PackageOpen,
  Phone,
  StickyNote,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatQuoteDate, quoteEventTypeLabel } from "@/data/quote-copy";
import { formatTimeWindow } from "@/data/quote-schedule";
import { SavedCard, SavedChip, SavedClampedText, SavedFact } from "@/components/admin/saved-view";
import { cn } from "@/lib/utils";

/** Editable job-detail fields as held in the form (strings, "" when empty). */
export type JobSavedFields = {
  eventName: string;
  eventType: string;
  eventDate: string;
  eventStart: string;
  eventEnd: string;
  guestCount: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueRegion: string;
  venuePostal: string;
  venueCountry: string;
  installDate: string;
  installStart: string;
  installEnd: string;
  teardownDate: string;
  teardownStart: string;
  teardownEnd: string;
  accessNotes: string;
  loadingNotes: string;
  parkingNotes: string;
  elevatorNotes: string;
  roomNotes: string;
  productionNotes: string;
  customerNotes: string;
  internalNotes: string;
};

type JobSavedViewProps = {
  values: JobSavedFields;
  contact: {
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
  };
  /** Venue actions that work without editing (e.g. save venue to customer). */
  venueActions?: ReactNode;
  /** Shown under the address, e.g. a link to the customer's saved venues. */
  venueFooter?: ReactNode;
};

function NoteTile({
  icon,
  label,
  text,
  internal = false,
  customerVisible = false,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
  internal?: boolean;
  customerVisible?: boolean;
}) {
  return (
    <SavedFact
      icon={icon}
      label={label}
      className={cn(internal && "border-amber-500/25 bg-amber-500/[0.04]")}
    >
      {internal || customerVisible ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {internal ? (
            <SavedChip tone="amber">
              <Lock className="size-3" />
              Internal
            </SavedChip>
          ) : null}
          {customerVisible ? (
            <SavedChip tone="gold">
              <Eye className="size-3" />
              Customer sees this
            </SavedChip>
          ) : null}
        </div>
      ) : null}
      <div className="font-normal">
        <SavedClampedText text={text} />
      </div>
    </SavedFact>
  );
}

export function JobSavedView({ values, contact, venueActions, venueFooter }: JobSavedViewProps) {
  const date = (value: string) => formatQuoteDate(value, "en", value);
  const eventTypeLabel = quoteEventTypeLabel(values.eventType, "en");
  const guestCount = values.guestCount.trim();

  const scheduleTiles = [
    {
      key: "install",
      icon: Hammer,
      title: "Install",
      date: values.installDate,
      window: formatTimeWindow(values.installStart, values.installEnd, "en"),
    },
    {
      key: "event",
      icon: CalendarDays,
      title: "Event",
      date: values.eventDate,
      window: formatTimeWindow(values.eventStart, values.eventEnd, "en"),
    },
    {
      key: "teardown",
      icon: PackageOpen,
      title: "Teardown",
      date: values.teardownDate,
      window: formatTimeWindow(values.teardownStart, values.teardownEnd, "en"),
    },
  ].filter((tile) => tile.date || tile.window);

  const contactName = contact.name?.trim() ?? "";
  const contactCompany = contact.company?.trim() ?? "";
  const contactEmail = contact.email?.trim() ?? "";
  const contactPhone = contact.phone?.trim() ?? "";
  const hasContact = Boolean(contactName || contactCompany || contactEmail || contactPhone);

  const cityLine = [
    [values.venueCity, values.venueRegion].map((part) => part.trim()).filter(Boolean).join(", "),
    values.venuePostal.trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const addressLines = [values.venueAddress.trim(), cityLine].filter(Boolean);
  // Country defaults to "Canada", so it alone doesn't make a venue worth showing.
  const hasVenue = Boolean(values.venueName.trim() || addressLines.length > 0);
  const country = values.venueCountry.trim();
  const directionsQuery = [values.venueName, values.venueAddress, cityLine, country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const directionsHref =
    addressLines.length > 0
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`
      : null;

  const logistics = [
    { key: "access", icon: DoorOpen, label: "Access", text: values.accessNotes },
    { key: "loading", icon: Truck, label: "Loading", text: values.loadingNotes },
    { key: "parking", icon: Car, label: "Parking", text: values.parkingNotes },
    { key: "elevator", icon: ArrowUpDown, label: "Elevator", text: values.elevatorNotes },
    { key: "room", icon: LayoutGrid, label: "Room / areas", text: values.roomNotes },
    {
      key: "production",
      icon: Clapperboard,
      label: "Production",
      text: values.productionNotes,
      internal: true,
    },
  ].filter((note) => note.text.trim());

  const customerNotes = values.customerNotes.trim();
  const internalNotes = values.internalNotes.trim();

  const hasEventCard = Boolean(
    values.eventName.trim() || eventTypeLabel || guestCount || scheduleTiles.length > 0 || hasContact
  );
  const hasVenueCard = hasVenue || logistics.length > 0 || Boolean(venueActions);
  const hasNotesCard = Boolean(customerNotes || internalNotes);

  if (!hasEventCard && !hasVenueCard && !hasNotesCard) {
    return (
      <p className="rounded-2xl border border-dashed border-border/40 bg-card/25 px-4 py-8 text-center text-sm text-muted-foreground">
        No event details saved yet. Use Edit to add the date, venue and logistics.
      </p>
    );
  }

  return (
    <>
      {hasEventCard ? (
        <SavedCard
          icon={CalendarDays}
          eyebrow="Event day"
          title={values.eventName.trim() || "Event details"}
          aside={
            eventTypeLabel || guestCount ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {eventTypeLabel ? <SavedChip tone="gold">{eventTypeLabel}</SavedChip> : null}
                {guestCount ? (
                  <SavedChip>
                    <Users className="size-3" />
                    {guestCount} guests
                  </SavedChip>
                ) : null}
              </div>
            ) : null
          }
        >
          {scheduleTiles.length > 0 ? (
            <div
              className={cn(
                "grid gap-2.5",
                scheduleTiles.length === 2 && "sm:grid-cols-2",
                scheduleTiles.length === 3 && "sm:grid-cols-3"
              )}
            >
              {scheduleTiles.map((tile) => (
                <div
                  key={tile.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    tile.key === "event"
                      ? "border-primary/35 bg-primary/[0.06]"
                      : "border-border/40 bg-background/30"
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <tile.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {tile.title}
                    </p>
                    <p className="truncate text-sm font-medium">{tile.date ? date(tile.date) : "Date TBC"}</p>
                    {tile.window ? <p className="text-xs text-muted-foreground">{tile.window}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {hasContact ? (
            <div className={cn("grid gap-2.5 sm:grid-cols-2", scheduleTiles.length > 0 && "mt-2.5")}>
              {contactName || contactCompany ? (
                <SavedFact icon={UserRound} label="Contact">
                  <p className="truncate" title={contactName || contactCompany}>
                    {contactName || contactCompany}
                  </p>
                  {contactName && contactCompany ? (
                    <p className="flex items-center gap-1 truncate text-xs font-normal text-muted-foreground">
                      <Building2 className="size-3 shrink-0" />
                      {contactCompany}
                    </p>
                  ) : null}
                </SavedFact>
              ) : null}
              {contactPhone || contactEmail ? (
                <SavedFact icon={Phone} label="Reach">
                  {contactPhone ? (
                    <a
                      href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-1.5 truncate hover:text-primary"
                    >
                      <Phone className="size-3 shrink-0 text-primary" />
                      {contactPhone}
                    </a>
                  ) : null}
                  {contactEmail ? (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-center gap-1.5 truncate text-xs font-normal text-muted-foreground hover:text-primary"
                      title={contactEmail}
                    >
                      <Mail className="size-3 shrink-0 text-primary" />
                      <span className="truncate">{contactEmail}</span>
                    </a>
                  ) : null}
                </SavedFact>
              ) : null}
            </div>
          ) : null}
        </SavedCard>
      ) : null}

      {hasVenueCard ? (
        <SavedCard
          icon={MapPin}
          eyebrow={logistics.length > 0 ? `Venue · ${logistics.length} logistics notes` : "Venue"}
          title={values.venueName.trim() || "Venue & logistics"}
          aside={venueActions}
        >
          {hasVenue ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/40 bg-background/30 px-3 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <MapPin className="size-3 text-primary" />
                  Address
                </p>
                {addressLines.length > 0 ? (
                  <div className="mt-1 text-sm font-medium">
                    {addressLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {country ? <p className="text-xs font-normal text-muted-foreground">{country}</p> : null}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No address saved.</p>
                )}
                {venueFooter ? <div className="mt-1.5">{venueFooter}</div> : null}
              </div>
              {directionsHref ? (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  <Navigation className="size-3.5" />
                  Directions
                </a>
              ) : null}
            </div>
          ) : venueFooter ? (
            <div>{venueFooter}</div>
          ) : null}

          {logistics.length > 0 ? (
            <div className={cn("grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3", (hasVenue || venueFooter) && "mt-2.5")}>
              {logistics.map((note) => (
                <NoteTile
                  key={note.key}
                  icon={note.icon}
                  label={note.label}
                  text={note.text}
                  internal={note.internal}
                />
              ))}
            </div>
          ) : null}
        </SavedCard>
      ) : null}

      {hasNotesCard ? (
        <SavedCard icon={StickyNote} eyebrow="Notes" title="Customer & internal notes">
          <div className={cn("grid gap-2.5", customerNotes && internalNotes && "md:grid-cols-2")}>
            {customerNotes ? (
              <NoteTile icon={Eye} label="Customer-visible" text={customerNotes} customerVisible />
            ) : null}
            {internalNotes ? <NoteTile icon={Lock} label="Internal notes" text={internalNotes} internal /> : null}
          </div>
        </SavedCard>
      ) : null}
    </>
  );
}

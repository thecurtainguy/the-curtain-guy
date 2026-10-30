"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building, Check, Globe2, Loader2, Search, UserRound } from "lucide-react";
import {
  formatCustomerNumber,
  formatVenueAddress,
  type CustomerVenueRow,
  type VenueSearchResult,
} from "@/data/customers";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PickerCustomer = { id: string; display_name: string; venues: CustomerVenueRow[] };

/** Loads a picked customer's saved venues for forms that only know the customer id. */
export function useCustomerVenues(customerId: string | null | undefined): CustomerVenueRow[] {
  const [loaded, setLoaded] = useState<{ id: string; venues: CustomerVenueRow[] } | null>(null);
  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    fetch(`/api/admin/customers/${customerId}/venues`)
      .then((response) => response.json())
      .then((json: { venues?: CustomerVenueRow[] }) => {
        if (!cancelled) setLoaded({ id: customerId, venues: json.venues ?? [] });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id: customerId, venues: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);
  return customerId && loaded?.id === customerId ? loaded.venues : [];
}

/**
 * Saved venues for the document's customer, with an "All venues" mode that searches
 * every customer's saved venues. `linked` is false when the venue belongs to someone else.
 */
export function SavedVenuePicker({
  customer,
  selectedVenueId,
  venueName,
  onPick,
  gridClassName = "sm:grid-cols-2 lg:grid-cols-3",
  className,
}: {
  customer: PickerCustomer | null;
  selectedVenueId: string | null;
  venueName: string;
  onPick: (venue: CustomerVenueRow, linked: boolean) => void;
  gridClassName?: string;
  className?: string;
}) {
  const [showAll, setShowAll] = useState(!customer);
  const [query, setQuery] = useState("");
  const [others, setOthers] = useState<VenueSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const allMode = showAll || !customer;
  const customerId = customer?.id ?? null;
  const [lastCustomerId, setLastCustomerId] = useState(customerId);
  if (customerId !== lastCustomerId) {
    setLastCustomerId(customerId);
    setShowAll(!customerId);
  }

  useEffect(() => {
    if (!allMode) return;
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "30" });
        if (customerId) params.set("exclude", customerId);
        const response = await fetch(`/api/admin/venues?${params}`);
        const json = (await response.json().catch(() => ({}))) as { venues?: VenueSearchResult[] };
        if (requestId === requestRef.current) setOthers(json.venues ?? []);
      } catch {
        if (requestId === requestRef.current) setOthers([]);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [allMode, query, customerId]);

  const needle = query.trim().toLowerCase();
  const ownVenues = useMemo(() => {
    const venues = customer?.venues ?? [];
    if (!allMode || !needle) return venues;
    return venues.filter((venue) =>
      [venue.name, venue.address, venue.city, venue.postal_code].some((field) =>
        field?.toLowerCase().includes(needle)
      )
    );
  }, [customer, allMode, needle]);

  const otherVenues = useMemo(() => {
    const ownNames = new Set((customer?.venues ?? []).map((venue) => venue.name.trim().toLowerCase()));
    const seen = new Set<string>();
    return others.filter((venue) => {
      const key = `${venue.name.trim().toLowerCase()}|${formatVenueAddress(venue).toLowerCase()}`;
      if (ownNames.has(venue.name.trim().toLowerCase()) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [others, customer]);

  const typedName = venueName.trim().toLowerCase();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {customer ? `Saved venues for ${customer.display_name}` : "Saved venues"}
        </p>
        {customer ? (
          <div className="inline-flex rounded-xl border border-border/40 bg-card/40 p-0.5 text-xs">
            {[
              { all: false, label: "This customer", icon: UserRound },
              { all: true, label: "All venues", icon: Globe2 },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setShowAll(option.all)}
                aria-pressed={showAll === option.all}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors",
                  showAll === option.all
                    ? "bg-primary/15 font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <option.icon className="size-3.5 text-primary" aria-hidden />
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {allMode ? (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search every saved venue by name, address or city"
            className="pl-8"
            aria-label="Search saved venues"
          />
        </div>
      ) : null}

      {customer ? (
        ownVenues.length ? (
          <div className="space-y-2">
            {allMode ? <GroupLabel>{customer.display_name}</GroupLabel> : null}
            <div className={cn("grid gap-2", gridClassName)}>
              {ownVenues.map((venue) => (
                <VenueTile
                  key={venue.id}
                  venue={venue}
                  active={venue.id === selectedVenueId}
                  onClick={() => onPick(venue, true)}
                />
              ))}
            </div>
          </div>
        ) : !allMode ? (
          <p className="rounded-xl border border-dashed border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
            No saved venues yet. A new venue is saved to {customer.display_name} when you save, or switch
            to All venues to reuse one from another customer.
          </p>
        ) : null
      ) : null}

      {allMode ? (
        <div className="space-y-2">
          <GroupLabel>
            {customer ? "Other customers" : "All customers"}
            {loading ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
          </GroupLabel>
          {otherVenues.length ? (
            <div className={cn("grid gap-2", gridClassName)}>
              {otherVenues.map((venue) => (
                <VenueTile
                  key={venue.id}
                  venue={venue}
                  owner={venue.customer}
                  active={!selectedVenueId && venue.name.trim().toLowerCase() === typedName}
                  onClick={() => onPick(venue, false)}
                />
              ))}
            </div>
          ) : !loading ? (
            <p className="text-xs text-muted-foreground">
              {needle ? "No other venues match." : "No other saved venues yet."}
            </p>
          ) : null}
          {customer && otherVenues.length ? (
            <p className="text-[11px] text-muted-foreground">
              Picking one fills in the details and adds a copy to {customer.display_name}’s venues when you save.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
      {children}
    </p>
  );
}

function VenueTile({
  venue,
  owner,
  active,
  onClick,
}: {
  venue: CustomerVenueRow;
  owner?: VenueSearchResult["customer"];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-left text-sm transition-colors",
        active ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card/40 hover:border-primary/30"
      )}
    >
      <Building className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{venue.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {formatVenueAddress(venue) || "No address"}
        </span>
        {owner !== undefined ? (
          <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground/90">
            <UserRound className="size-3 shrink-0 text-primary/80" aria-hidden />
            {owner ? `${formatCustomerNumber(owner.customer_number)} · ${owner.display_name}` : "Unknown customer"}
          </span>
        ) : null}
      </span>
      {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

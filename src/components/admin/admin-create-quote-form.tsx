"use client";

import { SavedVenuePicker, useCustomerVenues } from "@/components/admin/saved-venue-picker";
import { formatVenueAddress } from "@/data/customers";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Languages,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { CustomerLanguagePicker } from "@/components/quotes/customer-language-picker";
import { CustomerPicker, type PickedCustomer } from "@/components/admin/customers/customer-picker";
import type { CustomerLanguage } from "@/data/customer-language";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { EventTypeInput } from "@/components/ui/event-type-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";

export function AdminCreateQuoteForm({ initialCustomer = null }: { initialCustomer?: PickedCustomer | null }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<PickedCustomer | null>(initialCustomer);
  const [customerName, setCustomerName] = useState(initialCustomer?.display_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.primary_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone ?? "");

  function pickCustomer(next: PickedCustomer | null) {
    setCustomer(next);
    if (next) {
      setCustomerName(next.display_name);
      setCustomerEmail(next.primary_email);
      setCustomerPhone(next.phone ?? "");
    }
  }
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const customerVenues = useCustomerVenues(customer?.id);
  const [cityArea, setCityArea] = useState("Montreal area");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [language, setLanguage] = useState<CustomerLanguage | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/quotes/create-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          eventDate,
          eventType,
          venueName,
          venueAddress,
          cityArea,
          ownerNotes,
          ...(customer ? { customerId: customer.id } : {}),
          ...(language ? { language } : {}),
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        quoteId?: string;
      };
      if (!response.ok || !payload.ok || !payload.quoteId) {
        const failure = payload.message || "Could not create quote.";
        setError(failure);
        toast.error(failure);
        return;
      }
      toast.success("Draft quote created.");
      router.push(`/admin/quotes/${payload.quoteId}`);
      router.refresh();
    } catch {
      setError("Could not create quote.");
      toast.error("Could not create quote.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <section className="relative overflow-hidden rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card/25">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.1),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Direct quote
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              Skip the estimate when you already know the brief
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Enter customer and event basics. We open a draft quote so you can
              add line items and send — no website estimate required.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Name + email", "Optional event details", "Draft quote"].map(
                (label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="h-auto border-primary/20 bg-primary/5 py-1.5 text-foreground"
                  >
                    {label}
                  </Badge>
                )
              )}
            </div>
          </div>
          <div className="relative min-h-[180px]">
            <SiteMediaImage
              mediaKey="home.estimate.promo"
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="absolute inset-0"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            <div className="absolute inset-4 flex items-end">
              <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  Admin only
                </p>
                <p className="mt-1 font-heading text-sm text-white">
                  Goes straight into the quote builder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25">
        <div className="overflow-hidden rounded-t-2xl border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserRound className="size-4" />
            </span>
            <div>
              <h3 className="font-heading text-base font-semibold">Customer</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick an existing customer, or type new details and we&apos;ll create their profile.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <CustomerPicker value={customer} onChange={pickCustomer} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="direct-name">
                Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="direct-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direct-email" className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary/80" />
                Email <span className="text-primary">*</span>
              </Label>
              <Input
                id="direct-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5 text-primary/80" />
              Phone
            </Label>
            <Input
              id="direct-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25">
        <div className="overflow-hidden rounded-t-2xl border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <CalendarDays className="size-4" />
            </span>
            <div>
              <h3 className="font-heading text-base font-semibold">Event</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional now — you can refine on the quote.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="direct-event-date">Event date</Label>
            <DateInput
              id="direct-event-date"
              value={eventDate}
              onChange={setEventDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-event-type">Event type</Label>
            <EventTypeInput
              id="direct-event-type"
              value={eventType}
              onChange={setEventType}
              allowCreate
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-venue">Venue</Label>
            <Input
              id="direct-venue"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-city" className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary/80" />
              City / area
            </Label>
            <Input
              id="direct-city"
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="direct-venue-address">Venue address</Label>
            <Input
              id="direct-venue-address"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Street, city, province, postal code — shown on the proposal and PDF"
              maxLength={400}
            />
          </div>
          <SavedVenuePicker
            className="sm:col-span-2"
            customer={customer ? { id: customer.id, display_name: customer.display_name, venues: customerVenues } : null}
            selectedVenueId={
              customerVenues.find((venue) => venue.name.trim().toLowerCase() === venueName.trim().toLowerCase())?.id ?? null
            }
            venueName={venueName}
            onPick={(venue) => {
              setVenueName(venue.name);
              setVenueAddress(formatVenueAddress(venue));
              if (venue.city) setCityArea(venue.city);
            }}
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="direct-notes">Owner notes</Label>
            <Textarea
              id="direct-notes"
              rows={3}
              value={ownerNotes}
              onChange={(e) => setOwnerNotes(e.target.value)}
              placeholder="Setup windows, teardown, call notes…"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25">
        <div className="overflow-hidden rounded-t-2xl border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Languages className="size-4" />
            </span>
            <div>
              <h3 className="font-heading text-base font-semibold">
                Customer language
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Proposal page, PDF, and emails. Leave unselected to use the
                customer&apos;s account preference (English if none).
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <CustomerLanguagePicker
            value={language}
            onChange={(next) =>
              setLanguage((current) => (current === next ? null : next))
            }
          />
        </div>
      </section>

      {error ? (
        <p
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <LoadingButton
          type="submit"
          isLoading={creating}
          loadingText="Creating"
          icon={<FileText className="size-4" />}
        >
          Create draft quote
        </LoadingButton>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Building,
  Car,
  DoorOpen,
  MapPin,
  PenLine,
  Plus,
  Ruler,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { BrandDialogContent, useBrandConfirm } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerVenueRow } from "@/data/customers";
import { CustomerPanel } from "@/components/admin/customers/customer-panel";
import { readJson } from "@/components/admin/customers/customer-ui";

type VenueDraft = Record<
  | "name"
  | "address"
  | "city"
  | "region"
  | "postal_code"
  | "country"
  | "access_notes"
  | "loading_notes"
  | "parking_notes"
  | "elevator_notes"
  | "room_notes"
  | "notes",
  string
>;

const EMPTY: VenueDraft = {
  name: "",
  address: "",
  city: "",
  region: "QC",
  postal_code: "",
  country: "Canada",
  access_notes: "",
  loading_notes: "",
  parking_notes: "",
  elevator_notes: "",
  room_notes: "",
  notes: "",
};

const NOTE_FIELDS: Array<{ key: keyof VenueDraft; label: string; icon: LucideIcon; placeholder: string }> = [
  { key: "access_notes", label: "Access", icon: DoorOpen, placeholder: "Which door, who has the key, earliest access time" },
  { key: "loading_notes", label: "Loading dock", icon: Truck, placeholder: "Dock location, height, booking rules" },
  { key: "parking_notes", label: "Parking", icon: Car, placeholder: "Where the van goes, permits, fees" },
  { key: "elevator_notes", label: "Elevator / stairs", icon: ArrowUpDown, placeholder: "Freight elevator size, stairs count" },
  { key: "room_notes", label: "Room", icon: Ruler, placeholder: "Ceiling height, rigging points, wall lengths" },
];

function toDraft(v: CustomerVenueRow): VenueDraft {
  const out = { ...EMPTY };
  for (const key of Object.keys(EMPTY) as Array<keyof VenueDraft>) {
    out[key] = (v[key] as string | null) ?? "";
  }
  return out;
}

export function AdminCustomerVenues({
  customerId,
  venues,
}: {
  customerId: string;
  venues: CustomerVenueRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CustomerVenueRow | "new" | null>(null);
  const [draft, setDraft] = useState<VenueDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useBrandConfirm();

  function open(target: CustomerVenueRow | "new") {
    setDraft(target === "new" ? EMPTY : toDraft(target));
    setError(null);
    setEditing(target);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const isNew = editing === "new";
      const url = isNew
        ? `/api/admin/customers/${customerId}/venues`
        : `/api/admin/customers/${customerId}/venues/${(editing as CustomerVenueRow).id}`;
      const response = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await readJson(response);
      if (!response.ok || !json.ok) {
        const message = json.message ?? "Could not save venue.";
        setError(message);
        toast.error(message);
        return;
      }
      const label = draft.name.trim();
      setEditing(null);
      toast.success(
        isNew ? (label ? `${label} added to venues.` : "Venue added.") : label ? `${label} updated.` : "Venue updated."
      );
      router.refresh();
    } catch {
      setError("Could not save venue.");
      toast.error("Could not save venue.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(venue: CustomerVenueRow) {
    const ok = await confirm({
      title: `Remove ${venue.name}?`,
      description: "Existing jobs keep their own copy of the venue details.",
      confirmLabel: "Remove venue",
      destructive: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/venues/${venue.id}`, { method: "DELETE" });
      const json = await readJson(response);
      if (!response.ok || json.ok === false) {
        toast.error(json.message ?? "Could not remove venue.");
        return;
      }
      toast.success(`${venue.name} removed.`);
      router.refresh();
    } catch {
      toast.error("Could not remove venue.");
    }
  }

  return (
    <CustomerPanel
      id="venues"
      icon={Building}
      eyebrow="Venues"
      title="Saved venues"
      description="Halls and homes you install at for this customer, with access notes the crew needs."
      actions={
        <Button size="sm" variant="outline" onClick={() => open("new")}>
          <Plus className="size-4" />
          Add venue
        </Button>
      }
    >
      {confirmDialog}
      {venues.length === 0 ? (
        <button
          type="button"
          onClick={() => open("new")}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center hover:border-primary/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-4" />
          </span>
          <span className="text-sm font-medium">No saved venues</span>
          <span className="max-w-sm text-xs text-muted-foreground">
            Save a venue once and reuse it on every job, with loading dock, parking and ceiling notes.
          </span>
        </button>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {venues.map((venue) => {
            const address = [venue.address, venue.city, venue.region, venue.postal_code].filter(Boolean).join(", ");
            const notes = NOTE_FIELDS.filter((f) => venue[f.key as keyof CustomerVenueRow]);
            return (
              <div key={venue.id} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{venue.name}</p>
                    {address ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        {address}
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8" aria-label="Edit venue" onClick={() => open(venue)}>
                      <PenLine className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remove venue"
                      onClick={() => void remove(venue)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {notes.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {notes.map((note) => {
                      const Icon = note.icon;
                      return (
                        <span
                          key={note.key}
                          title={String(venue[note.key as keyof CustomerVenueRow] ?? "")}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px]"
                        >
                          <Icon className="size-3 text-primary" />
                          {note.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <BrandDialogContent
          eyebrow="Venues"
          title={editing === "new" ? "Add venue" : "Edit venue"}
          description="These notes copy onto a job when you pick this venue."
          icon={Building}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <LoadingButton onClick={() => void save()} isLoading={saving} loadingText="Saving…">
                Save venue
              </LoadingButton>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="venue-name">Venue name</Label>
                <Input
                  id="venue-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Château Vaudreuil — Grand Ballroom"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="venue-address">Street address</Label>
                <Input
                  id="venue-address"
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venue-city">City</Label>
                <Input id="venue-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="venue-region">Province</Label>
                  <Input
                    id="venue-region"
                    value={draft.region}
                    onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="venue-postal">Postal code</Label>
                  <Input
                    id="venue-postal"
                    value={draft.postal_code}
                    onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {NOTE_FIELDS.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`venue-${field.key}`} className="flex items-center gap-1.5">
                      <Icon className="size-3.5 text-primary/80" />
                      {field.label}
                    </Label>
                    <Textarea
                      id={`venue-${field.key}`}
                      rows={2}
                      value={draft[field.key]}
                      onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                    />
                  </div>
                );
              })}
              <div className="space-y-1.5">
                <Label htmlFor="venue-notes">Other notes</Label>
                <Textarea
                  id="venue-notes"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
            </div>
            {error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        </BrandDialogContent>
      </Dialog>
    </CustomerPanel>
  );
}

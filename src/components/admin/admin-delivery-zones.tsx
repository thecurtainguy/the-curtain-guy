"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  RotateCcw,
  Truck,
} from "lucide-react";
import { formatCadFromCents } from "@/data/rentals";
import {
  dollarsToLogisticsCents,
  logisticsCentsToDollarInput,
  type RentalDeliveryZone,
} from "@/data/rentals-logistics";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";

type ZoneDraft = {
  id: string;
  label: string;
  shortLabel: string;
  priced: boolean;
  fullServiceDollars: string;
  transportOnlyDollars: string;
  sortOrder: string;
  isActive: boolean;
};

function toDraft(zone: RentalDeliveryZone): ZoneDraft {
  return {
    id: zone.id,
    label: zone.label,
    shortLabel: zone.shortLabel,
    priced: zone.priced,
    fullServiceDollars: logisticsCentsToDollarInput(zone.fullServiceCents),
    transportOnlyDollars: logisticsCentsToDollarInput(zone.transportOnlyCents),
    sortOrder: String(zone.sortOrder),
    isActive: zone.isActive,
  };
}

function draftsEqual(a: ZoneDraft, b: ZoneDraft): boolean {
  return (
    a.label === b.label &&
    a.shortLabel === b.shortLabel &&
    a.priced === b.priced &&
    a.fullServiceDollars === b.fullServiceDollars &&
    a.transportOnlyDollars === b.transportOnlyDollars &&
    a.sortOrder === b.sortOrder &&
    a.isActive === b.isActive
  );
}

export function AdminDeliveryZonesEditor({
  initialZones,
}: {
  initialZones: RentalDeliveryZone[];
}) {
  const [zones, setZones] = useState(initialZones);
  const [drafts, setDrafts] = useState<Record<string, ZoneDraft>>(() =>
    Object.fromEntries(initialZones.map((zone) => [zone.id, toDraft(zone)]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, patch: Partial<ZoneDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  async function saveZone(id: string): Promise<boolean> {
    const draft = drafts[id];
    if (!draft) return false;
    setSavingId(id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/delivery-zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          label: draft.label,
          shortLabel: draft.shortLabel,
          priced: draft.priced,
          fullServiceCents: dollarsToLogisticsCents(draft.fullServiceDollars),
          transportOnlyCents: dollarsToLogisticsCents(
            draft.transportOnlyDollars
          ),
          sortOrder: Math.round(Number(draft.sortOrder) || 0),
          isActive: draft.isActive,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        zone?: RentalDeliveryZone;
      };
      if (!response.ok || !json.ok || !json.zone) {
        setError(json.message || "Could not save zone.");
        return false;
      }
      setZones((prev) =>
        prev
          .map((zone) => (zone.id === id ? json.zone! : zone))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      );
      setDrafts((prev) => ({ ...prev, [id]: toDraft(json.zone!) }));
      setMessage(`Saved ${json.zone.shortLabel}. Rentals checkout will use the new rates.`);
      return true;
    } catch {
      setError("Could not save zone.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  const dirtyZoneIds = useMemo(() => {
    return zones
      .map((zone) => zone.id)
      .filter((id) => {
        const draft = drafts[id];
        const saved = toDraft(zones.find((zone) => zone.id === id)!);
        return draft ? !draftsEqual(draft, saved) : false;
      });
  }, [drafts, zones]);

  async function saveAllDirty() {
    const ids = dirtyZoneIds;
    if (ids.length === 0) return;
    for (const id of ids) {
      const ok = await saveZone(id);
      if (!ok) return;
    }
    setMessage(
      ids.length === 1
        ? "Saved zone. Rentals checkout will use the new rates."
        : `Saved ${ids.length} zones. Rentals checkout will use the new rates.`
    );
  }

  async function restoreDefaults() {
    setRestoring(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/delivery-zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreDefaults: true }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        zones?: RentalDeliveryZone[];
      };
      if (!response.ok || !json.ok || !json.zones) {
        setError(json.message || "Could not restore defaults.");
        return;
      }
      setZones(json.zones);
      setDrafts(
        Object.fromEntries(json.zones.map((zone) => [zone.id, toDraft(zone)]))
      );
      setMessage("Restored factory zone prices.");
    } catch {
      setError("Could not restore defaults.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card/25">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.1),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Rentals logistics
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              Delivery & install fees by zone
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              These flat rates power the public Rentals cart and checkout.
              Full service includes transport, install, and teardown. Transport
              only is delivery without install labor.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Full service", "Transport only", "Quote-only zones"].map(
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
            <Button
              type="button"
              variant="outline"
              onClick={() => void restoreDefaults()}
              disabled={restoring}
            >
              <RotateCcw className="size-3.5" />
              {restoring ? "Restoring…" : "Restore factory defaults"}
            </Button>
          </div>
          <div className="relative min-h-[180px]">
            <SiteMediaImage
              mediaKey="home.services.pipe_drape"
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="absolute inset-0"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            <div className="absolute inset-4 flex items-end">
              <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  Live on rentals
                </p>
                <p className="mt-1 font-heading text-sm text-white">
                  Changes apply to new cart pricing within about a minute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/25 bg-primary/10 text-foreground"
          )}
        >
          {error || message}
        </p>
      )}

      <div className="space-y-4">
        {zones.map((zone) => {
          const draft = drafts[zone.id] ?? toDraft(zone);
          const saved = toDraft(zone);
          const dirty = !draftsEqual(draft, saved);
          const busy = savingId === zone.id;
          return (
            <section
              key={zone.id}
              className="overflow-hidden rounded-2xl border border-border/40 bg-card/25"
            >
              <div className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <MapPin className="size-4" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-semibold">
                          {zone.shortLabel}
                        </h3>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {zone.id}
                        </Badge>
                        {draft.priced ? (
                          <Badge variant="outline" className="border-primary/30">
                            Priced
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Quote only</Badge>
                        )}
                        {!draft.isActive ? (
                          <Badge variant="destructive">Inactive</Badge>
                        ) : null}
                        {dirty ? <Badge variant="secondary">Unsaved</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Full service{" "}
                        {draft.priced
                          ? formatCadFromCents(
                              dollarsToLogisticsCents(draft.fullServiceDollars)
                            )
                          : "quote"}{" "}
                        · Transport{" "}
                        {draft.priced
                          ? formatCadFromCents(
                              dollarsToLogisticsCents(draft.transportOnlyDollars)
                            )
                          : "quote"}
                      </p>
                    </div>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="size-4" />
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${zone.id}-label`}>Checkout label</Label>
                    <Input
                      id={`${zone.id}-label`}
                      value={draft.label}
                      onChange={(e) =>
                        updateDraft(zone.id, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${zone.id}-short`}>Short label</Label>
                    <Input
                      id={`${zone.id}-short`}
                      value={draft.shortLabel}
                      onChange={(e) =>
                        updateDraft(zone.id, { shortLabel: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${zone.id}-sort`}>Sort order</Label>
                    <Input
                      id={`${zone.id}-sort`}
                      inputMode="numeric"
                      value={draft.sortOrder}
                      onChange={(e) =>
                        updateDraft(zone.id, { sortOrder: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${zone.id}-full`}>
                      Full service (CAD)
                    </Label>
                    <Input
                      id={`${zone.id}-full`}
                      inputMode="decimal"
                      value={draft.fullServiceDollars}
                      disabled={!draft.priced}
                      onChange={(e) =>
                        updateDraft(zone.id, {
                          fullServiceDollars: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${zone.id}-transport`}>
                      Transport only (CAD)
                    </Label>
                    <Input
                      id={`${zone.id}-transport`}
                      inputMode="decimal"
                      value={draft.transportOnlyDollars}
                      disabled={!draft.priced}
                      onChange={(e) =>
                        updateDraft(zone.id, {
                          transportOnlyDollars: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border accent-primary"
                      checked={draft.priced}
                      onChange={(e) =>
                        updateDraft(zone.id, { priced: e.target.checked })
                      }
                    />
                    Show fixed price (off = quote only)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border accent-primary"
                      checked={draft.isActive}
                      onChange={(e) =>
                        updateDraft(zone.id, { isActive: e.target.checked })
                      }
                    />
                    Active on rentals checkout
                  </label>
                </div>

                <div className="flex justify-end">
                  <LoadingButton
                    type="button"
                    isLoading={busy}
                    loadingText="Saving"
                    disabled={!dirty && !busy}
                    onClick={() => void saveZone(zone.id)}
                  >
                    Save zone
                  </LoadingButton>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <AdminFloatingSaveButton
        active={dirtyZoneIds.length > 0}
        saving={savingId !== null}
        label={
          dirtyZoneIds.length > 1
            ? `Save ${dirtyZoneIds.length} zones`
            : "Save zone"
        }
        onSave={() => void saveAllDirty()}
      />
    </div>
  );
}

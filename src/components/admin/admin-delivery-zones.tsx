"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
} from "lucide-react";
import { formatCadFromCents } from "@/data/rentals";
import {
  DEFAULT_PACKAGE_LOGISTICS_ZONE_ID,
  dollarsToLogisticsCents,
  logisticsCentsToDollarInput,
  type PackageIncludedLogisticsMode,
  type RentalDeliveryZone,
} from "@/data/rentals-logistics";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { SelectInput } from "@/components/ui/select-input";
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

function draftToZone(draft: ZoneDraft): RentalDeliveryZone {
  return {
    id: draft.id,
    label: draft.label,
    shortLabel: draft.shortLabel,
    priced: draft.priced,
    fullServiceCents: dollarsToLogisticsCents(draft.fullServiceDollars),
    transportOnlyCents: dollarsToLogisticsCents(draft.transportOnlyDollars),
    sortOrder: Math.round(Number(draft.sortOrder) || 0),
    isActive: draft.isActive,
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

function slugifyZoneId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function modeCents(zone: RentalDeliveryZone, mode: PackageIncludedLogisticsMode) {
  return mode === "full_service"
    ? zone.fullServiceCents
    : zone.transportOnlyCents;
}

function emptyNewDraft(sortOrder: number): ZoneDraft {
  return {
    id: "",
    label: "",
    shortLabel: "",
    priced: true,
    fullServiceDollars: "0.00",
    transportOnlyDollars: "0.00",
    sortOrder: String(sortOrder),
    isActive: true,
  };
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newDraft, setNewDraft] = useState(() =>
    emptyNewDraft(
      Math.max(0, ...initialZones.map((zone) => zone.sortOrder)) + 10
    )
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewHomeZoneId, setPreviewHomeZoneId] = useState(
    () =>
      initialZones.find((zone) => zone.id === DEFAULT_PACKAGE_LOGISTICS_ZONE_ID)
        ?.id ||
      initialZones.find((zone) => zone.priced && zone.isActive)?.id ||
      initialZones[0]?.id ||
      DEFAULT_PACKAGE_LOGISTICS_ZONE_ID
  );
  const [previewMode, setPreviewMode] =
    useState<PackageIncludedLogisticsMode>("full_service");

  const liveZones = useMemo(() => {
    return zones
      .map((zone) => draftToZone(drafts[zone.id] ?? toDraft(zone)))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }, [drafts, zones]);

  const previewRows = useMemo(() => {
    const home = liveZones.find((zone) => zone.id === previewHomeZoneId);
    if (!home || !home.priced) {
      return [] as Array<{
        zone: RentalDeliveryZone;
        zoneCents: number;
        creditCents: number;
        chargeCents: number;
        label: string;
      }>;
    }
    const creditCents = modeCents(home, previewMode);
    return liveZones
      .filter((zone) => zone.isActive)
      .map((zone) => {
        if (!zone.priced) {
          return {
            zone,
            zoneCents: 0,
            creditCents,
            chargeCents: 0,
            label: "Subject to quote",
          };
        }
        const zoneCents = modeCents(zone, previewMode);
        const chargeCents = Math.max(0, zoneCents - creditCents);
        const label =
          chargeCents === 0
            ? "Included in package"
            : `+${formatCadFromCents(chargeCents)} beyond ${home.shortLabel}`;
        return { zone, zoneCents, creditCents, chargeCents, label };
      });
  }, [liveZones, previewHomeZoneId, previewMode]);

  const pricedActiveOptions = liveZones
    .filter((zone) => zone.priced && zone.isActive)
    .map((zone) => ({
      value: zone.id,
      label: `${zone.shortLabel} · ${formatCadFromCents(modeCents(zone, previewMode))}`,
    }));

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
      setMessage(
        `Saved ${json.zone.shortLabel}. Rentals checkout will use the new rates.`
      );
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

  async function createZone() {
    const id = slugifyZoneId(newDraft.id || newDraft.shortLabel || newDraft.label);
    if (!id) {
      setError("Zone id or short label is required.");
      return;
    }
    if (zones.some((zone) => zone.id === id)) {
      setError(`Zone “${id}” already exists.`);
      return;
    }
    if (!newDraft.label.trim()) {
      setError("Checkout label is required.");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/delivery-zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          label: newDraft.label.trim(),
          shortLabel: newDraft.shortLabel.trim() || newDraft.label.trim(),
          priced: newDraft.priced,
          fullServiceCents: dollarsToLogisticsCents(newDraft.fullServiceDollars),
          transportOnlyCents: dollarsToLogisticsCents(
            newDraft.transportOnlyDollars
          ),
          sortOrder: Math.round(Number(newDraft.sortOrder) || 0),
          isActive: newDraft.isActive,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        zone?: RentalDeliveryZone;
      };
      if (!response.ok || !json.ok || !json.zone) {
        setError(json.message || "Could not create zone.");
        return;
      }
      setZones((prev) =>
        [...prev, json.zone!].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
        )
      );
      setDrafts((prev) => ({ ...prev, [json.zone!.id]: toDraft(json.zone!) }));
      setShowCreate(false);
      setNewDraft(
        emptyNewDraft(
          Math.max(0, ...zones.map((zone) => zone.sortOrder), json.zone!.sortOrder) +
            10
        )
      );
      setMessage(`Created ${json.zone.shortLabel}.`);
    } catch {
      setError("Could not create zone.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteZone(id: string) {
    const zone = zones.find((row) => row.id === id);
    const label = zone?.shortLabel || id;
    const confirmed = window.confirm(
      `Delete delivery zone “${label}”? This cannot be undone. Packages that use it as included logistics home zone must be updated first.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/delivery-zones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        zones?: RentalDeliveryZone[];
      };
      if (!response.ok || !json.ok) {
        setError(json.message || "Could not delete zone.");
        return;
      }
      const nextZones = json.zones || zones.filter((row) => row.id !== id);
      setZones(nextZones);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (previewHomeZoneId === id) {
        setPreviewHomeZoneId(
          nextZones.find((row) => row.priced && row.isActive)?.id ||
            nextZones[0]?.id ||
            DEFAULT_PACKAGE_LOGISTICS_ZONE_ID
        );
      }
      setMessage(`Deleted ${label}.`);
    } catch {
      setError("Could not delete zone.");
    } finally {
      setDeletingId(null);
    }
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
              only is delivery without install labor. Package “included”
              logistics uses a home zone credit — farther zones only add the
              surcharge shown in the preview.
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setShowCreate(true)}
                disabled={showCreate}
              >
                <Plus className="size-3.5" />
                Add zone
              </Button>
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

      <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
        <div className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Eye className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                Package surcharge preview
              </p>
              <h3 className="mt-1 font-heading text-base font-semibold">
                What customers pay when logistics is included
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Uses your current draft prices (including unsaved edits). Pick
                the package home zone and mode, then read the surcharge column.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Package includes logistics</Label>
              <SelectInput
                value={previewMode}
                onChange={(value) =>
                  setPreviewMode(
                    value === "transport_only"
                      ? "transport_only"
                      : "full_service"
                  )
                }
                options={[
                  { value: "full_service", label: "Full service" },
                  { value: "transport_only", label: "Transport only" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Home zone (prepaid in package)</Label>
              <SelectInput
                value={previewHomeZoneId}
                onChange={setPreviewHomeZoneId}
                options={
                  pricedActiveOptions.length
                    ? pricedActiveOptions
                    : [{ value: previewHomeZoneId, label: "No priced zones" }]
                }
              />
            </div>
          </div>

          {previewRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/50 px-4 py-6 text-center text-sm text-muted-foreground">
              Choose an active priced home zone to preview surcharges.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/40">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-border/40 bg-background/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Delivery area</th>
                    <th className="px-3 py-2.5 font-medium">Zone fee</th>
                    <th className="px-3 py-2.5 font-medium">Home credit</th>
                    <th className="px-3 py-2.5 font-medium">Customer pays</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={row.zone.id}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground">
                          {row.zone.shortLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.zone.id}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {row.zone.priced
                          ? formatCadFromCents(row.zoneCents)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {row.zone.priced
                          ? formatCadFromCents(row.creditCents)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "font-medium",
                            row.chargeCents > 0
                              ? "text-primary"
                              : "text-foreground"
                          )}
                        >
                          {row.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showCreate ? (
        <section className="overflow-hidden rounded-2xl border border-primary/35 bg-card/25">
          <div className="border-b border-border/40 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Plus className="size-4" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-semibold">
                    New delivery zone
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Creates a new checkout option with its own full-service and
                    transport prices.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-zone-id">Zone id</Label>
                <Input
                  id="new-zone-id"
                  value={newDraft.id}
                  placeholder="e.g. north-shore"
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      id: slugifyZoneId(e.target.value),
                    }))
                  }
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Lowercase letters, numbers, and dashes. Used in cart storage.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-zone-sort">Sort order</Label>
                <Input
                  id="new-zone-sort"
                  inputMode="numeric"
                  value={newDraft.sortOrder}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      sortOrder: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="new-zone-label">Checkout label</Label>
                <Input
                  id="new-zone-label"
                  value={newDraft.label}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      label: e.target.value,
                      shortLabel:
                        prev.shortLabel ||
                        e.target.value.slice(0, 40),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-zone-short">Short label</Label>
                <Input
                  id="new-zone-short"
                  value={newDraft.shortLabel}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      shortLabel: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-zone-full">Full service (CAD)</Label>
                <Input
                  id="new-zone-full"
                  inputMode="decimal"
                  value={newDraft.fullServiceDollars}
                  disabled={!newDraft.priced}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      fullServiceDollars: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-zone-transport">
                  Transport only (CAD)
                </Label>
                <Input
                  id="new-zone-transport"
                  inputMode="decimal"
                  value={newDraft.transportOnlyDollars}
                  disabled={!newDraft.priced}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      transportOnlyDollars: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-primary"
                  checked={newDraft.priced}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      priced: e.target.checked,
                    }))
                  }
                />
                Show fixed price (off = quote only)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-primary"
                  checked={newDraft.isActive}
                  onChange={(e) =>
                    setNewDraft((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Active on rentals checkout
              </label>
            </div>
            <div className="flex justify-end">
              <LoadingButton
                type="button"
                isLoading={creating}
                loadingText="Creating"
                onClick={() => void createZone()}
              >
                Create zone
              </LoadingButton>
            </div>
          </div>
        </section>
      ) : null}

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
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {zone.id}
                        </Badge>
                        {draft.priced ? (
                          <Badge
                            variant="outline"
                            className="border-primary/30"
                          >
                            Priced
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Quote only</Badge>
                        )}
                        {!draft.isActive ? (
                          <Badge variant="destructive">Inactive</Badge>
                        ) : null}
                        {dirty ? (
                          <Badge variant="secondary">Unsaved</Badge>
                        ) : null}
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
                              dollarsToLogisticsCents(
                                draft.transportOnlyDollars
                              )
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

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingId === zone.id || savingId === zone.id}
                    onClick={() => void deleteZone(zone.id)}
                  >
                    <Trash2 className="size-3.5" />
                    {deletingId === zone.id ? "Deleting…" : "Delete zone"}
                  </Button>
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

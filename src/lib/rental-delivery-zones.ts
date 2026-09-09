import {
  DEFAULT_RENTAL_DELIVERY_ZONES,
  type RentalDeliveryZone,
} from "@/data/rentals-logistics";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type StoredZoneRow = {
  id: string;
  label: string;
  short_label: string;
  priced: boolean;
  full_service_cents: number;
  transport_only_cents: number;
  sort_order: number;
  is_active: boolean;
  updated_at?: string | null;
};

function mapStoredZone(row: StoredZoneRow): RentalDeliveryZone {
  return {
    id: row.id,
    label: row.label,
    shortLabel: row.short_label,
    priced: Boolean(row.priced),
    fullServiceCents: Math.max(0, Math.round(Number(row.full_service_cents) || 0)),
    transportOnlyCents: Math.max(
      0,
      Math.round(Number(row.transport_only_cents) || 0)
    ),
    sortOrder: Math.round(Number(row.sort_order) || 0),
    isActive: row.is_active !== false,
  };
}

function sortZones(zones: RentalDeliveryZone[]): RentalDeliveryZone[] {
  return [...zones].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  );
}

export async function listRentalDeliveryZones(options?: {
  includeInactive?: boolean;
}): Promise<RentalDeliveryZone[]> {
  try {
    const admin = createAdminSupabaseClient();
    let query = admin
      .from("rental_delivery_zones")
      .select(
        "id, label, short_label, priced, full_service_cents, transport_only_cents, sort_order, is_active, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (!options?.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[rental-delivery-zones] list", error);
      return sortZones(
        DEFAULT_RENTAL_DELIVERY_ZONES.filter((zone) =>
          options?.includeInactive ? true : zone.isActive
        )
      );
    }

    if (!data?.length) {
      return sortZones(
        DEFAULT_RENTAL_DELIVERY_ZONES.filter((zone) =>
          options?.includeInactive ? true : zone.isActive
        )
      );
    }

    return sortZones(data.map((row) => mapStoredZone(row as StoredZoneRow)));
  } catch (error) {
    console.error("[rental-delivery-zones] list failed", error);
    return sortZones(
      DEFAULT_RENTAL_DELIVERY_ZONES.filter((zone) =>
        options?.includeInactive ? true : zone.isActive
      )
    );
  }
}

export type RentalDeliveryZoneWriteInput = {
  id: string;
  label: string;
  shortLabel: string;
  priced: boolean;
  fullServiceCents: number;
  transportOnlyCents: number;
  sortOrder: number;
  isActive: boolean;
};

export async function upsertRentalDeliveryZone(input: {
  zone: RentalDeliveryZoneWriteInput;
  updatedBy?: string | null;
}): Promise<{ zone: RentalDeliveryZone } | { error: string }> {
  const id = input.zone.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!id || id.length < 2) {
    return { error: "Zone id is required." };
  }
  const label = input.zone.label.trim();
  const shortLabel = input.zone.shortLabel.trim() || label;
  if (!label) {
    return { error: "Zone label is required." };
  }

  const fullServiceCents = Math.max(
    0,
    Math.round(Number(input.zone.fullServiceCents) || 0)
  );
  const transportOnlyCents = Math.max(
    0,
    Math.round(Number(input.zone.transportOnlyCents) || 0)
  );

  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("rental_delivery_zones")
      .upsert(
        {
          id,
          label,
          short_label: shortLabel,
          priced: Boolean(input.zone.priced),
          full_service_cents: fullServiceCents,
          transport_only_cents: transportOnlyCents,
          sort_order: Math.round(Number(input.zone.sortOrder) || 0),
          is_active: input.zone.isActive !== false,
          updated_by: input.updatedBy || null,
        },
        { onConflict: "id" }
      )
      .select(
        "id, label, short_label, priced, full_service_cents, transport_only_cents, sort_order, is_active"
      )
      .single();

    if (error || !data) {
      console.error("[rental-delivery-zones] upsert", error);
      return { error: error?.message || "Failed to save zone." };
    }

    return { zone: mapStoredZone(data as StoredZoneRow) };
  } catch (error) {
    console.error("[rental-delivery-zones] upsert failed", error);
    return { error: "Failed to save zone." };
  }
}

export async function restoreDefaultRentalDeliveryZones(input?: {
  updatedBy?: string | null;
}): Promise<{ zones: RentalDeliveryZone[] } | { error: string }> {
  try {
    const admin = createAdminSupabaseClient();
    const rows = DEFAULT_RENTAL_DELIVERY_ZONES.map((zone) => ({
      id: zone.id,
      label: zone.label,
      short_label: zone.shortLabel,
      priced: zone.priced,
      full_service_cents: zone.fullServiceCents,
      transport_only_cents: zone.transportOnlyCents,
      sort_order: zone.sortOrder,
      is_active: zone.isActive,
      updated_by: input?.updatedBy || null,
    }));

    const { error } = await admin
      .from("rental_delivery_zones")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("[rental-delivery-zones] restore defaults", error);
      return { error: error.message || "Failed to restore defaults." };
    }

    const zones = await listRentalDeliveryZones({ includeInactive: true });
    return { zones };
  } catch (error) {
    console.error("[rental-delivery-zones] restore failed", error);
    return { error: "Failed to restore defaults." };
  }
}

"use client";

import Image from "next/image";
import {
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  PRODUCT_COLOR_PALETTE,
  PRODUCT_EVENT_TYPE_IDS,
  PRODUCT_EVENT_TYPE_LABELS,
  normalizeHexColor,
  type ProductColorVariantInput,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_AVAILABILITY_STATUSES,
  type ProductAvailabilityStatus,
} from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput, dollarsToCents } from "@/lib/quote-tokens";
import { cn } from "@/lib/utils";

export type ColorDraft = {
  clientKey: string;
  id?: string;
  name: string;
  hex: string;
  is_active: boolean;
  image_url: string | null;
  image_alt: string;
  has_own_pricing: boolean;
  priceDollars: string;
  quantity_on_hand: string;
  availability_status: ProductAvailabilityStatus;
};

export function colorDraftsFromRows(
  rows: ProductColorVariantRow[] | undefined
): ColorDraft[] {
  return (rows || []).map((row, index) => ({
    clientKey: row.id || `existing-${index}`,
    id: row.id,
    name: row.name,
    hex: row.hex,
    is_active: row.is_active,
    image_url: row.image_url,
    image_alt: row.image_alt || "",
    has_own_pricing: row.has_own_pricing,
    priceDollars: centsToDollarInput(row.unit_price_cents ?? 0),
    quantity_on_hand: String(row.quantity_on_hand ?? 0),
    availability_status: row.availability_status || "available",
  }));
}

export function colorDraftsToPayload(
  drafts: ColorDraft[]
): ProductColorVariantInput[] {
  return drafts
    .filter((draft) => draft.name.trim())
    .map((draft, index) => ({
      id: draft.id,
      name: draft.name.trim(),
      hex: normalizeHexColor(draft.hex),
      sort_order: index,
      is_active: draft.is_active,
      image_url: draft.image_url,
      image_alt: draft.image_alt.trim() || null,
      has_own_pricing: draft.has_own_pricing,
      unit_price_cents: draft.has_own_pricing
        ? dollarsToCents(draft.priceDollars)
        : null,
      quantity_on_hand: draft.has_own_pricing
        ? Number.parseInt(draft.quantity_on_hand, 10) || 0
        : null,
      availability_status: draft.has_own_pricing
        ? draft.availability_status
        : null,
    }));
}

function emptyDraft(partial?: Partial<ColorDraft>): ColorDraft {
  return {
    clientKey: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    hex: "#8B909A",
    is_active: true,
    image_url: null,
    image_alt: "",
    has_own_pricing: false,
    priceDollars: "0",
    quantity_on_hand: "0",
    availability_status: "available",
    ...partial,
  };
}

type AdminProductColorsSectionProps = {
  productId: string | null;
  eventTypeIds: string[];
  onEventTypeIdsChange: (ids: string[]) => void;
  drafts: ColorDraft[];
  onDraftsChange: (drafts: ColorDraft[]) => void;
  onEnsureSaved: () => Promise<string | null>;
  onError: (message: string | null) => void;
};

export function AdminProductColorsSection({
  productId,
  eventTypeIds,
  onEventTypeIdsChange,
  drafts,
  onDraftsChange,
  onEnsureSaved,
  onError,
}: AdminProductColorsSectionProps) {
  function patchDraft(clientKey: string, partial: Partial<ColorDraft>) {
    onDraftsChange(
      drafts.map((draft) =>
        draft.clientKey === clientKey ? { ...draft, ...partial } : draft
      )
    );
  }

  function removeDraft(clientKey: string) {
    onDraftsChange(drafts.filter((draft) => draft.clientKey !== clientKey));
  }

  function addFromPalette(name: string, hex: string) {
    if (
      drafts.some(
        (draft) => draft.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return;
    }
    onDraftsChange([...drafts, emptyDraft({ name, hex })]);
  }

  function toggleEventType(id: string) {
    if (eventTypeIds.includes(id)) {
      onEventTypeIdsChange(eventTypeIds.filter((value) => value !== id));
    } else {
      onEventTypeIdsChange([...eventTypeIds, id]);
    }
  }

  async function uploadColorPhoto(clientKey: string, file: File | null) {
    if (!file) return;
    let id = productId;
    if (!id) {
      id = await onEnsureSaved();
      if (!id) return;
    }
    onError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("bind", "none");
      body.append("folder", "colors");
      const response = await fetch(`/api/admin/products/${id}/image`, {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        imageUrl?: string;
      };
      if (!response.ok || !data.ok || !data.imageUrl) {
        onError(data.message ?? "Color photo upload failed.");
        return;
      }
      patchDraft(clientKey, {
        image_url: data.imageUrl,
        image_alt: file.name.replace(/\.[^.]+$/, "") || "Color photo",
      });
    } catch {
      onError("Color photo upload failed.");
    }
  }

  return (
    <section className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Palette className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Colors & event tags
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated palette plus custom colors. Optional per-color photo,
            price, and stock. Event tags power rentals filters.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Label>Event type tags</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRODUCT_EVENT_TYPE_IDS.map((id) => {
            const selected = eventTypeIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleEventType(id)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                  selected
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/40 bg-background/40 text-muted-foreground hover:border-primary/30"
                )}
              >
                {PRODUCT_EVENT_TYPE_LABELS[id]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Label>Add from palette</Label>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_COLOR_PALETTE.map((swatch) => (
            <button
              key={swatch.name}
              type="button"
              title={swatch.name}
              onClick={() => addFromPalette(swatch.name, swatch.hex)}
              className="group flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40"
            >
              <span
                className="size-4 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: swatch.hex }}
                aria-hidden
              />
              {swatch.name}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onDraftsChange([...drafts, emptyDraft()])}
          >
            <Plus className="size-3.5" aria-hidden />
            Custom color
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {drafts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/50 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No color variants yet. Add from the palette or create a custom
            color.
          </p>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.clientKey}
              className="rounded-2xl border border-border/40 bg-background/35 p-4"
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                  {draft.image_url ? (
                    <Image
                      src={draft.image_url}
                      alt={draft.image_alt || draft.name || "Color"}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="size-full"
                      style={{ backgroundColor: draft.hex }}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={draft.name}
                        onChange={(e) =>
                          patchDraft(draft.clientKey, { name: e.target.value })
                        }
                        placeholder="Ivory"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hex</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(draft.hex).toLowerCase()}
                          onChange={(e) =>
                            patchDraft(draft.clientKey, {
                              hex: e.target.value.toUpperCase(),
                            })
                          }
                          className="size-9 cursor-pointer rounded-lg border border-border/40 bg-transparent p-0.5"
                          aria-label="Color picker"
                        />
                        <Input
                          value={draft.hex}
                          onChange={(e) =>
                            patchDraft(draft.clientKey, {
                              hex: e.target.value,
                            })
                          }
                          className="w-28 font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border/40 bg-card/40 px-3 py-2 text-xs">
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(e) =>
                            patchDraft(draft.clientKey, {
                              is_active: e.target.checked,
                            })
                          }
                        />
                        Active
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeDraft(draft.clientKey)}
                        aria-label="Remove color"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border/40 bg-card/40 px-3 py-2 text-xs hover:border-primary/35">
                      <Upload className="size-3.5 text-primary" aria-hidden />
                      {draft.image_url ? "Replace photo" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => {
                          void uploadColorPhoto(
                            draft.clientKey,
                            e.target.files?.[0] || null
                          );
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {draft.image_url ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() =>
                          patchDraft(draft.clientKey, {
                            image_url: null,
                            image_alt: "",
                          })
                        }
                      >
                        Use product photo
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                        <ImagePlus className="size-3.5" aria-hidden />
                        Falls back to main product photo
                      </span>
                    )}
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card/30 p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={draft.has_own_pricing}
                      onChange={(e) =>
                        patchDraft(draft.clientKey, {
                          has_own_pricing: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        Own price & stock
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Off = inherit product price and inventory.
                      </span>
                    </span>
                  </label>

                  {draft.has_own_pricing ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Price (CAD)</Label>
                        <Input
                          inputMode="decimal"
                          value={draft.priceDollars}
                          onChange={(e) =>
                            patchDraft(draft.clientKey, {
                              priceDollars: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Qty on hand</Label>
                        <Input
                          inputMode="numeric"
                          value={draft.quantity_on_hand}
                          onChange={(e) =>
                            patchDraft(draft.clientKey, {
                              quantity_on_hand: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Availability</Label>
                        <select
                          className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                          value={draft.availability_status}
                          onChange={(e) =>
                            patchDraft(draft.clientKey, {
                              availability_status:
                                e.target.value as ProductAvailabilityStatus,
                            })
                          }
                        >
                          {PRODUCT_AVAILABILITY_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {PRODUCT_AVAILABILITY_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/** Tiny spinner helper kept for future async save indicators. */
export function ColorsSavingHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Saving colors…
    </span>
  );
}

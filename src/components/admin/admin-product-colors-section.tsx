"use client";

import { useRef, useState } from "react";
import {
  Check,
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
  isProductAvailabilityStatus,
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
  display_title: string;
  image_url: string | null;
  image_alt: string;
  has_own_pricing: boolean;
  priceDollars: string;
  quantity_on_hand: string;
  availability_status: ProductAvailabilityStatus;
};

export function colorDraftsFromRows(
  rows: ProductColorVariantRow[] | ProductColorVariantRow | null | undefined
): ColorDraft[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list.map((row, index) => ({
    clientKey: String(row.id || `existing-${index}`),
    id: row.id,
    name: String(row.name || ""),
    hex: String(row.hex || "#8B909A"),
    is_active: row.is_active !== false,
    display_title: String(row.display_title || ""),
    image_url:
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url.trim()
        : null,
    image_alt: String(row.image_alt || ""),
    has_own_pricing: Boolean(row.has_own_pricing),
    priceDollars: centsToDollarInput(
      typeof row.unit_price_cents === "number" ? row.unit_price_cents : 0
    ),
    quantity_on_hand: String(
      typeof row.quantity_on_hand === "number" ? row.quantity_on_hand : 0
    ),
    availability_status: isProductAvailabilityStatus(
      String(row.availability_status || "")
    )
      ? row.availability_status!
      : "available",
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
      display_title: draft.display_title.trim() || null,
      image_url:
        draft.image_url && !draft.image_url.startsWith("blob:")
          ? draft.image_url
          : null,
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
    display_title: "",
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
  defaultColorName: string;
  defaultColorHex: string;
  onDefaultColorChange: (next: {
    default_color_name?: string;
    default_color_hex?: string;
  }) => void;
  drafts: ColorDraft[];
  onDraftsChange: (
    next: ColorDraft[] | ((prev: ColorDraft[]) => ColorDraft[])
  ) => void;
  onEnsureSaved: () => Promise<string | null>;
  onError: (message: string | null) => void;
};

export function AdminProductColorsSection({
  productId,
  eventTypeIds,
  onEventTypeIdsChange,
  defaultColorName,
  defaultColorHex,
  onDefaultColorChange,
  drafts,
  onDraftsChange,
  onEnsureSaved,
  onError,
}: AdminProductColorsSectionProps) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  function patchDraft(clientKey: string, partial: Partial<ColorDraft>) {
    onDraftsChange((prev) =>
      prev.map((draft) =>
        draft.clientKey === clientKey ? { ...draft, ...partial } : draft
      )
    );
  }

  function removeDraft(clientKey: string) {
    onDraftsChange((prev) =>
      prev.filter((draft) => draft.clientKey !== clientKey)
    );
  }

  function addFromPalette(name: string, hex: string) {
    if (
      draftsRef.current.some(
        (draft) => draft.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return;
    }
    onDraftsChange((prev) => [...prev, emptyDraft({ name, hex })]);
  }

  function toggleEventType(id: string) {
    if (eventTypeIds.includes(id)) {
      onEventTypeIdsChange(eventTypeIds.filter((value) => value !== id));
    } else {
      onEventTypeIdsChange([...eventTypeIds, id]);
    }
  }

  async function persistColors(id: string, nextDrafts: ColorDraft[]) {
    const response = await fetch(`/api/admin/products/${id}/colors`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variants: colorDraftsToPayload(nextDrafts),
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      message?: string;
      variants?: ProductColorVariantRow[] | ProductColorVariantRow | null;
    };
    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Could not save color photos.");
    }
    // Merge server ids back onto matching drafts by name/hex — do not wipe UI.
    const serverRows = Array.isArray(data.variants)
      ? data.variants
      : data.variants
        ? [data.variants]
        : [];
    if (!serverRows.length) return;

    onDraftsChange((prev) =>
      prev.map((draft) => {
        const match =
          serverRows.find(
            (row) =>
              draft.id && row.id === draft.id
          ) ||
          serverRows.find(
            (row) =>
              row.name.trim().toLowerCase() === draft.name.trim().toLowerCase()
          );
        if (!match) return draft;
        return {
          ...draft,
          id: match.id,
          clientKey: draft.clientKey,
          image_url:
            typeof match.image_url === "string" && match.image_url.trim()
              ? match.image_url.trim()
              : draft.image_url,
          hex: String(match.hex || draft.hex || "#8B909A"),
          display_title: String(
            match.display_title || draft.display_title || ""
          ),
        };
      })
    );
  }

  async function uploadColorPhoto(clientKey: string, file: File | null) {
    if (!file) return;

    const current = draftsRef.current.find(
      (draft) => draft.clientKey === clientKey
    );
    if (!current?.name.trim()) {
      onError("Name the color before uploading a photo.");
      return;
    }

    setUploadingKey(clientKey);
    onError(null);

    try {
      let id = productId;
      if (!id) {
        id = await onEnsureSaved();
        if (!id) return;
      }

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

      const imageUrl = data.imageUrl;
      const imageAlt = file.name.replace(/\.[^.]+$/, "") || "Color photo";
      const nextDrafts = draftsRef.current.map((draft) =>
        draft.clientKey === clientKey
          ? { ...draft, image_url: imageUrl, image_alt: imageAlt }
          : draft
      );
      draftsRef.current = nextDrafts;
      onDraftsChange(nextDrafts);

      await persistColors(id, nextDrafts);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Color photo upload failed."
      );
    } finally {
      setUploadingKey(null);
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
        <Label>Base color (parent listing)</Label>
        <p className="text-xs text-muted-foreground">
          This is the parent product’s own color (not “Original”). Example: for
          “Black Velvet Drapes”, set this to Black so shoppers can pick Black or
          Navy. Uses the main product photo, price, and title.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="default-color-name">Color name</Label>
            <Input
              id="default-color-name"
              value={defaultColorName}
              onChange={(e) =>
                onDefaultColorChange({ default_color_name: e.target.value })
              }
              placeholder="Black"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hex</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeHexColor(
                  defaultColorHex || "#111111"
                ).toLowerCase()}
                onChange={(e) =>
                  onDefaultColorChange({
                    default_color_hex: e.target.value.toUpperCase(),
                  })
                }
                className="size-9 cursor-pointer rounded-lg border border-border/40 bg-transparent p-0.5"
                aria-label="Base color picker"
              />
              <Input
                value={defaultColorHex}
                onChange={(e) =>
                  onDefaultColorChange({ default_color_hex: e.target.value })
                }
                className="w-28 font-mono text-xs uppercase"
              />
            </div>
          </div>
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
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggleEventType(id)}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                  "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected &&
                    "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                )}
              >
                <span className="min-w-0 flex-1 pr-1">
                  <span className="block text-sm font-medium text-foreground">
                    {PRODUCT_EVENT_TYPE_LABELS[id]}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background/50 text-transparent"
                  )}
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
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
                        onClick={() =>
                          onDraftsChange((prev) => [...prev, emptyDraft()])
                        }
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
                    // Native img: Next/Image crashes on blob: previews during upload.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={draft.image_url}
                      src={draft.image_url}
                      alt={draft.image_alt || draft.name || "Color"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div
                      className="size-full"
                      style={{ backgroundColor: draft.hex || "#8B909A" }}
                      aria-hidden
                    />
                  )}
                  {uploadingKey === draft.clientKey ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2
                        className="size-5 animate-spin text-primary"
                        aria-hidden
                      />
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <div className="space-y-1.5">
                      <Label>Color name</Label>
                      <Input
                        value={draft.name}
                        onChange={(e) =>
                          patchDraft(draft.clientKey, { name: e.target.value })
                        }
                        placeholder="Navy"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hex</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(draft.hex || "#8B909A").toLowerCase()}
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

                  <div className="space-y-1.5">
                    <Label>Listing title</Label>
                    <Input
                      value={draft.display_title}
                      onChange={(e) =>
                        patchDraft(draft.clientKey, {
                          display_title: e.target.value,
                        })
                      }
                      placeholder="Navy drapes (optional — overrides product title)"
                    />
                    <p className="text-xs text-muted-foreground">
                      When shoppers select this color, the product page and cart
                      use this title. Leave blank to keep the parent product
                      name.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border/40 bg-card/40 px-3 py-2 text-xs hover:border-primary/35",
                        uploadingKey === draft.clientKey &&
                          "pointer-events-none opacity-70"
                      )}
                    >
                      {uploadingKey === draft.clientKey ? (
                        <Loader2
                          className="size-3.5 animate-spin text-primary"
                          aria-hidden
                        />
                      ) : (
                        <Upload className="size-3.5 text-primary" aria-hidden />
                      )}
                      {uploadingKey === draft.clientKey
                        ? "Uploading…"
                        : draft.image_url
                          ? "Replace photo"
                          : "Upload photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={uploadingKey === draft.clientKey}
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
                        disabled={uploadingKey === draft.clientKey}
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

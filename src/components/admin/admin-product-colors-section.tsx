"use client";

import { useRef } from "react";
import { Check, Images, Palette, Plus, Trash2 } from "lucide-react";
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
import { SelectInput } from "@/components/ui/select-input";
import { AdminProductGallery } from "@/components/admin/admin-product-gallery";
import { centsToDollarInput, dollarsToCents } from "@/lib/quote-tokens";
import { cn } from "@/lib/utils";
import { galleryPrimary } from "@/data/product-images";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  drafts,
  onDraftsChange,
  onEnsureSaved,
  onError,
}: AdminProductColorsSectionProps) {
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

  const namedDrafts = drafts.filter((draft) => draft.name.trim());

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Palette className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Color variants
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Extra colors shoppers can switch to. The main listing color lives
              under Parent gallery above.
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
            {PRODUCT_COLOR_PALETTE.map((swatch) => {
              const alreadyAdded = drafts.some(
                (draft) =>
                  draft.name.trim().toLowerCase() === swatch.name.toLowerCase()
              );
              return (
                <button
                  key={swatch.name}
                  type="button"
                  title={
                    alreadyAdded
                      ? `${swatch.name} already added`
                      : `Add ${swatch.name}`
                  }
                  disabled={alreadyAdded}
                  onClick={() => addFromPalette(swatch.name, swatch.hex)}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors",
                    alreadyAdded
                      ? "cursor-default border-primary/30 bg-primary/10 text-foreground"
                      : "border-border/40 bg-background/40 hover:border-primary/40"
                  )}
                >
                  <span
                    className="size-4 rounded-full border border-border/50 shadow-sm"
                    style={{ backgroundColor: swatch.hex }}
                    aria-hidden
                  />
                  {swatch.name}
                  {alreadyAdded ? (
                    <Check className="size-3 text-primary" aria-hidden />
                  ) : null}
                </button>
              );
            })}
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

        <div className="mt-6 space-y-3">
          <Label>Added variants</Label>
          {drafts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/50 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
              No color variants yet. Pick from the palette or add a custom
              color.
            </p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((draft) => (
                <li
                  key={draft.clientKey}
                  className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/40 bg-background/35 p-3"
                >
                  <div
                    className="size-10 shrink-0 overflow-hidden rounded-xl border border-border/40"
                    style={{ backgroundColor: draft.hex || "#8B909A" }}
                    aria-hidden
                  />
                  <div className="min-w-[8rem] flex-1 space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) =>
                        patchDraft(draft.clientKey, { name: e.target.value })
                      }
                      placeholder="Navy"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hex</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHexColor(
                          draft.hex || "#8B909A"
                        ).toLowerCase()}
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
                          patchDraft(draft.clientKey, { hex: e.target.value })
                        }
                        className="w-24 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                  <label className="mb-0.5 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border/40 bg-card/40 px-3 py-2 text-xs">
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
                    className="mb-0.5 text-destructive"
                    onClick={() => removeDraft(draft.clientKey)}
                    aria-label="Remove color"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {namedDrafts.length > 0 ? (
        <section className="rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Images className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Variant details
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional listing title, gallery, and own price for each color.
                Empty gallery falls back to parent photos.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {namedDrafts.map((draft) => (
              <div
                key={draft.clientKey}
                className="rounded-2xl border border-border/40 bg-background/35 p-4"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="size-8 rounded-lg border border-border/40"
                    style={{ backgroundColor: draft.hex || "#8B909A" }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-heading text-base font-semibold">
                      {draft.name.trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {draft.hex.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Listing title</Label>
                    <Input
                      value={draft.display_title}
                      onChange={(e) =>
                        patchDraft(draft.clientKey, {
                          display_title: e.target.value,
                        })
                      }
                      placeholder={`${draft.name.trim()} drapes (optional)`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Product page and cart title for this color. Blank keeps
                      the parent product name.
                    </p>
                  </div>

                  {draft.id && UUID_RE.test(draft.id) ? (
                    <AdminProductGallery
                      productId={productId}
                      colorVariantId={draft.id}
                      onEnsureSaved={onEnsureSaved}
                      onError={onError}
                      title={`${draft.name.trim()} gallery`}
                      description="Optional. Empty gallery falls back to parent photos."
                      onImagesChange={(images) => {
                        const primary = galleryPrimary(images);
                        patchDraft(draft.clientKey, {
                          image_url: primary.imageUrl,
                          image_alt: primary.imageAlt || "",
                        });
                      }}
                    />
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/50 bg-background/25 px-3 py-3 text-xs text-muted-foreground">
                      Save the product to unlock a multi-photo gallery for{" "}
                      {draft.name.trim()}. Until then it falls back to the
                      parent gallery.
                    </p>
                  )}

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
                        <SelectInput
                          value={draft.availability_status}
                          onChange={(value) =>
                            patchDraft(draft.clientKey, {
                              availability_status:
                                value as ProductAvailabilityStatus,
                            })
                          }
                          options={PRODUCT_AVAILABILITY_STATUSES.map(
                            (status) => ({
                              value: status,
                              label: PRODUCT_AVAILABILITY_LABELS[status],
                            })
                          )}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

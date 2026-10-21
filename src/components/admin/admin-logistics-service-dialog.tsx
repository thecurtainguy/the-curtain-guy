"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Hammer,
  ImageOff,
  Loader2,
  MapPin,
  Package,
  Sparkles,
  Truck,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  BrandDialogContent,
  BrandDialogSection,
} from "@/components/ui/brand-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductRow } from "@/data/products";
import { formatCadFromCents } from "@/data/quotes";
import {
  LOGISTICS_SERVICE_PRODUCT_SLUGS,
  resolveDeliveryZones,
  type RentalDeliveryZone,
} from "@/data/rentals-logistics";
import { centsToDollarInput, dollarsToCents } from "@/lib/quote-tokens";
import type { EstimateOption } from "@/data/estimate";
import { cn } from "@/lib/utils";

export const LOGISTICS_SERVICE_TYPES = [
  "full_service",
  "transport_only",
  "installation_only",
] as const;

export type LogisticsServiceType = (typeof LOGISTICS_SERVICE_TYPES)[number];

export type LogisticsServicePick = {
  category: "installation" | "delivery";
  categoryLabel: string;
  description: string;
  unitLabel: string;
  unitPriceCents: number;
  isTaxable: boolean;
  needsPricing: boolean;
  included: boolean;
  productId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

const TRANSPORT_PATTERN = /transport|delivery|livraison|pickup/i;
const INSTALL_PATTERN = /install|teardown|setup|montage|démontage/i;

function isTransportProduct(row: ProductRow): boolean {
  return row.category === "delivery" || TRANSPORT_PATTERN.test(row.name);
}

function isInstallProduct(row: ProductRow): boolean {
  return (
    !isTransportProduct(row) &&
    (row.category === "installation" || INSTALL_PATTERN.test(row.name))
  );
}

function defaultProductFor(
  service: LogisticsServiceType,
  products: ProductRow[]
): ProductRow | null {
  const linked = products.find(
    (row) => row.slug === LOGISTICS_SERVICE_PRODUCT_SLUGS[service]
  );
  if (linked) return linked;
  const matches = products.filter((row) =>
    service === "transport_only" ? isTransportProduct(row) : isInstallProduct(row)
  );
  return (
    matches.find((row) => row.is_active && row.image_url) ??
    matches.find((row) => row.image_url) ??
    matches[0] ??
    null
  );
}

const SERVICE_OPTIONS: Record<LogisticsServiceType, EstimateOption> = {
  full_service: {
    id: "full_service",
    label: "Full service",
    description: "Transport, on-site installation and teardown.",
    icon: Sparkles,
  },
  transport_only: {
    id: "transport_only",
    label: "Transport only",
    description: "Delivery and pickup. Client handles setup.",
    icon: Truck,
  },
  installation_only: {
    id: "installation_only",
    label: "Installation only",
    description: "Install and teardown labour. Client handles transport.",
    icon: Hammer,
  },
};

function zonePriceCents(
  service: LogisticsServiceType,
  zone: RentalDeliveryZone
): number {
  if (!zone.priced) return 0;
  if (service === "full_service") return zone.fullServiceCents;
  if (service === "transport_only") return zone.transportOnlyCents;
  return Math.max(0, zone.fullServiceCents - zone.transportOnlyCents);
}

function serviceDescription(
  service: LogisticsServiceType,
  zone: RentalDeliveryZone | null
): string {
  const area = zone?.shortLabel || "Venue area TBD";
  if (service === "full_service") {
    return `Full service (transport + install + teardown) · ${area}`;
  }
  if (service === "transport_only") {
    return `Transport / delivery and pickup · ${area}`;
  }
  return `On-site installation and teardown · ${area}`;
}

export function AdminLogisticsServiceDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (item: LogisticsServicePick) => void;
}) {
  const [zones, setZones] = useState<RentalDeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<LogisticsServiceType>("full_service");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [priceDollars, setPriceDollars] = useState("0.00");
  const [isTaxable, setIsTaxable] = useState(true);
  const [included, setIncluded] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [response, productsResponse] = await Promise.all([
          fetch("/api/admin/delivery-zones", { cache: "no-store" }),
          fetch("/api/admin/products?kind=service", { cache: "no-store" }),
        ]);
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          zones?: RentalDeliveryZone[];
        };
        if (!response.ok || !payload.ok) {
          if (!cancelled) {
            setError(payload.message ?? "Could not load delivery zones.");
          }
          return;
        }
        const productsPayload = (await productsResponse
          .json()
          .catch(() => null)) as { ok?: boolean; products?: ProductRow[] } | null;
        if (!cancelled) {
          const active = resolveDeliveryZones(payload.zones ?? []);
          const first = active[0] ?? null;
          const services = productsPayload?.products ?? [];
          setZones(active);
          setProducts(services);
          setService("full_service");
          setZoneId(first?.id ?? null);
          setPriceDollars(
            centsToDollarInput(first ? zonePriceCents("full_service", first) : 0)
          );
          setIsTaxable(true);
          setIncluded(false);
          setProductId(defaultProductFor("full_service", services)?.id ?? null);
        }
      } catch {
        if (!cancelled) setError("Could not load delivery zones.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const zone = useMemo(
    () => zones.find((row) => row.id === zoneId) ?? null,
    [zones, zoneId]
  );

  const product = useMemo(
    () => products.find((row) => row.id === productId) ?? null,
    [products, productId]
  );

  function selectService(next: LogisticsServiceType) {
    setService(next);
    if (zone) setPriceDollars(centsToDollarInput(zonePriceCents(next, zone)));
    setProductId(defaultProductFor(next, products)?.id ?? null);
  }

  function selectZone(next: RentalDeliveryZone) {
    setZoneId(next.id);
    setPriceDollars(centsToDollarInput(zonePriceCents(service, next)));
  }

  function handleAdd() {
    const unitPriceCents = included ? 0 : dollarsToCents(priceDollars);
    const category = service === "transport_only" ? "delivery" : "installation";
    onPick({
      category,
      categoryLabel: category === "delivery" ? "Delivery" : "Installation",
      description: serviceDescription(service, zone),
      unitLabel: "event",
      unitPriceCents,
      isTaxable: included ? false : isTaxable,
      needsPricing:
        !included && unitPriceCents === 0 && zone?.priced === false,
      included,
      productId: product?.id ?? null,
      imageUrl: product?.image_url ?? null,
      imageAlt: product?.image_alt || product?.name || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        icon={Truck}
        eyebrow="Logistics"
        title="Add installation / transport"
        description={
          <>
            Prices come from the delivery zones on the{" "}
            <Link
              href="/admin/logistics"
              className="font-medium text-primary hover:underline"
            >
              Logistics
            </Link>{" "}
            page. You can adjust the price before adding.
          </>
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || !zone}
              onClick={handleAdd}
            >
              Add to quote
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <BrandDialogSection label="Service">
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
              {LOGISTICS_SERVICE_TYPES.map((type) => (
                <OptionCard
                  key={type}
                  option={SERVICE_OPTIONS[type]}
                  selected={service === type}
                  onSelect={() => selectService(type)}
                />
              ))}
            </div>
          </BrandDialogSection>

          <BrandDialogSection label="Delivery zone">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading zones…
              </p>
            ) : error ? (
              <p className="py-4 text-center text-sm text-destructive">
                {error}
              </p>
            ) : (
              <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                {zones.map((row) => (
                  <OptionCard
                    key={row.id}
                    option={{
                      id: row.id,
                      label: row.shortLabel || row.label,
                      description: row.priced
                        ? formatCadFromCents(zonePriceCents(service, row))
                        : "Quote only, set the price manually",
                      icon: MapPin,
                    }}
                    selected={zoneId === row.id}
                    onSelect={() => selectZone(row)}
                  />
                ))}
              </div>
            )}
          </BrandDialogSection>

          {!loading && !error ? (
            <BrandDialogSection label="Photo from inventory">
              <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {products.map((row) => {
                  const selected = productId === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setProductId(row.id)}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
                        "border-border/40 bg-card/40 hover:-translate-y-px hover:border-primary/30 motion-reduce:hover:translate-y-0",
                        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                        selected &&
                          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full bg-muted/40">
                        {row.image_url ? (
                          <Image
                            src={row.image_url}
                            alt={row.image_alt || row.name}
                            fill
                            className="object-cover"
                            sizes="160px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Package className="size-5" />
                          </div>
                        )}
                        <span
                          className={cn(
                            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-200",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 bg-background/85 text-transparent group-hover:border-primary/45"
                          )}
                          aria-hidden
                        >
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      </div>
                      <p className="line-clamp-2 p-2.5 text-xs font-medium text-foreground">
                        {row.name}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={productId === null}
                  onClick={() => setProductId(null)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-3 text-xs text-muted-foreground transition-colors",
                    productId === null
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/50 hover:border-primary/30"
                  )}
                >
                  <ImageOff className="size-5" />
                  No photo
                </button>
              </div>
              {products.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add a service item with a photo in{" "}
                  <Link
                    href="/admin/products"
                    className="font-medium text-primary hover:underline"
                  >
                    Inventory
                  </Link>{" "}
                  to show it on quotes.
                </p>
              ) : null}
            </BrandDialogSection>
          ) : null}

          <div className="grid gap-4 rounded-2xl border border-border/40 bg-background/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="logistics_price" className="text-xs text-muted-foreground">
                Price CAD / event
              </Label>
              <Input
                id="logistics_price"
                inputMode="decimal"
                value={included ? "0.00" : priceDollars}
                disabled={included}
                onChange={(e) => setPriceDollars(e.target.value)}
              />
              {included ? (
                <p className="text-xs text-muted-foreground">
                  Shown as “Included” on the proposal and PDF. Adds $0 to the
                  total.
                </p>
              ) : service === "installation_only" && zone?.priced ? (
                <p className="text-xs text-muted-foreground">
                  Suggested: full service minus transport for this zone.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex h-9 items-center gap-2 rounded-2xl border border-primary/30 bg-primary/[0.08] px-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-border accent-primary"
                  checked={included}
                  onChange={(e) => setIncluded(e.target.checked)}
                />
                Included free
              </label>
              <label className="flex h-9 items-center gap-2 rounded-2xl border border-transparent bg-input/50 px-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-border accent-primary"
                  checked={included ? false : isTaxable}
                  disabled={included}
                  onChange={(e) => setIsTaxable(e.target.checked)}
                />
                Taxable
              </label>
            </div>
          </div>
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}

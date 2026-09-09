"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Loader2,
  Package,
  Ruler,
  ShoppingBag,
  Trash2,
  Upload,
} from "lucide-react";
import {
  ProductAvailabilityBadge,
  ProductKindBadge,
} from "@/components/products/product-status-badges";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_AVAILABILITY_STATUSES,
  PRODUCT_KINDS,
  PRODUCT_KIND_LABELS,
  PRODUCT_UNIT_LABELS,
  type ProductAvailabilityStatus,
  type ProductKind,
  type ProductRow,
} from "@/data/products";
import {
  PRODUCT_CONFIGURATOR_MODE_LABELS,
  PRODUCT_CONFIGURATOR_MODES,
  evaluateProductCompleteness,
  type ProductAddonWithProduct,
  type ProductCompleteness,
  type ProductConfiguratorMode,
  type ProductFormulaIncludeWithProduct,
} from "@/data/rentals";
import {
  QUOTE_CATEGORY_LABELS,
  QUOTE_LINE_CATEGORIES,
  type QuoteLineCategory,
} from "@/data/quotes";
import { centsToDollarInput, dollarsToCents } from "@/lib/quote-tokens";
import { cn } from "@/lib/utils";

type AdminProductRentalsBundleProp = {
  includes: ProductFormulaIncludeWithProduct[];
  addons: ProductAddonWithProduct[];
  completeness: ProductCompleteness;
};

const selectClass =
  "flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-70";

function ThemedCheck({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        checked &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span className="min-w-0 flex-1 pr-1">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/60 bg-background/50 text-transparent"
        )}
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </button>
  );
}

function ModeOptionCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span className="min-w-0 flex-1 pr-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
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
}

function MultiSelectProductCard({
  selected,
  title,
  description,
  onToggle,
  children,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        "border-border/40 bg-card/40",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className="group flex w-full items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span className="min-w-0 flex-1 pr-1">
          <span className="block text-sm font-medium text-foreground">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
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
      {selected && children ? (
        <div className="border-t border-border/30 px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </div>
  );
}

type FormulaIncludeForm = {
  includedProductId: string;
  qtyPerSegment: string;
};

type FormState = {
  name: string;
  sku: string;
  kind: ProductKind;
  category: QuoteLineCategory;
  short_description: string;
  description: string;
  unit_label: string;
  priceDollars: string;
  is_taxable: boolean;
  quantity_on_hand: string;
  low_stock_threshold: string;
  availability_status: ProductAvailabilityStatus;
  availability_manual: boolean;
  is_active: boolean;
  image_url: string | null;
  image_alt: string;
  is_public: boolean;
  configurator_mode: ProductConfiguratorMode;
  formula_segment_feet: string;
  full_service_product_id: string;
  transport_only_product_id: string;
  formulaIncludes: FormulaIncludeForm[];
  addons: Array<{ addonProductId: string }>;
};

function formFromProduct(
  product?: ProductRow | null,
  rentalsBundle?: AdminProductRentalsBundleProp | null
): FormState {
  const mode =
    product?.configurator_mode === "linear_ft" ? "linear_ft" : "simple";
  const includesSource: ProductFormulaIncludeWithProduct[] =
    rentalsBundle?.includes ?? [];
  const addonsSource: ProductAddonWithProduct[] = rentalsBundle?.addons ?? [];

  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    kind: product?.kind ?? "product",
    category: (product?.category as QuoteLineCategory) || "drape_rental",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    unit_label: product?.unit_label ?? "each",
    priceDollars: centsToDollarInput(product?.default_unit_price_cents ?? 0),
    is_taxable: product?.is_taxable ?? true,
    quantity_on_hand: String(product?.quantity_on_hand ?? 0),
    low_stock_threshold: String(product?.low_stock_threshold ?? 2),
    availability_status: product?.availability_status ?? "available",
    availability_manual: false,
    is_active: product?.is_active ?? true,
    image_url: product?.image_url ?? null,
    image_alt: product?.image_alt ?? "",
    is_public: product?.is_public ?? false,
    configurator_mode: mode,
    formula_segment_feet:
      product?.formula_segment_feet != null &&
      Number(product.formula_segment_feet) > 0
        ? String(product.formula_segment_feet)
        : "",
    full_service_product_id: product?.full_service_product_id ?? "",
    transport_only_product_id: product?.transport_only_product_id ?? "",
    formulaIncludes: includesSource.map((row) => ({
      includedProductId: row.included_product_id,
      qtyPerSegment: String(row.qty_per_segment ?? 1),
    })),
    addons: addonsSource.map((row) => ({
      addonProductId: row.addon_product_id,
    })),
  };
}

function snippetFromProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    category: row.category,
    unit_label: row.unit_label,
    default_unit_price_cents: row.default_unit_price_cents,
    is_taxable: row.is_taxable,
    image_url: row.image_url,
    image_alt: row.image_alt,
    is_active: row.is_active,
  };
}

function computeLiveCompleteness(
  form: FormState,
  allProducts: ProductRow[],
  selfId: string | null
): ProductCompleteness {
  const byId = new Map(allProducts.map((p) => [p.id, p]));
  const product = {
    id: selfId || "new",
    created_at: "",
    updated_at: "",
    name: form.name || "Item",
    sku: form.sku || null,
    slug: "draft",
    kind: form.kind,
    category: form.category,
    short_description: form.short_description || null,
    description: form.description || null,
    unit_label: form.unit_label,
    default_unit_price_cents: dollarsToCents(form.priceDollars),
    is_taxable: form.is_taxable,
    image_url: form.image_url,
    image_alt: form.image_alt || null,
    quantity_on_hand: Number.parseInt(form.quantity_on_hand, 10) || 0,
    low_stock_threshold: Number.parseInt(form.low_stock_threshold, 10) || 0,
    availability_status: form.availability_status,
    is_active: form.is_active,
    is_public: form.is_public,
    sort_order: 0,
    configurator_mode: form.configurator_mode,
    formula_segment_feet:
      Number(form.formula_segment_feet) > 0
        ? Number(form.formula_segment_feet)
        : null,
    full_service_product_id: form.full_service_product_id || null,
    transport_only_product_id: form.transport_only_product_id || null,
  };

  const includes = form.formulaIncludes
    .map((row, index) => {
      const included = byId.get(row.includedProductId);
      if (!included) return null;
      return {
        id: `live-include-${index}`,
        created_at: "",
        product_id: selfId || "new",
        included_product_id: row.includedProductId,
        qty_per_segment: Number(row.qtyPerSegment) || 1,
        sort_order: index,
        included: snippetFromProduct(included),
      };
    })
    .filter(Boolean) as ProductFormulaIncludeWithProduct[];

  const addons = form.addons
    .map((row, index) => {
      const addon = byId.get(row.addonProductId);
      if (!addon) return null;
      return {
        id: `live-addon-${index}`,
        created_at: "",
        product_id: selfId || "new",
        addon_product_id: row.addonProductId,
        sort_order: index,
        is_active: true,
        addon: snippetFromProduct(addon),
      };
    })
    .filter(Boolean) as ProductAddonWithProduct[];

  const fullServiceRow = form.full_service_product_id
    ? byId.get(form.full_service_product_id)
    : null;
  const transportOnlyRow = form.transport_only_product_id
    ? byId.get(form.transport_only_product_id)
    : null;

  return evaluateProductCompleteness({
    product,
    includes,
    addons,
    fullService: fullServiceRow
      ? {
          ...fullServiceRow,
          configurator_mode:
            fullServiceRow.configurator_mode === "linear_ft"
              ? "linear_ft"
              : "simple",
          formula_segment_feet: fullServiceRow.formula_segment_feet ?? null,
          full_service_product_id:
            fullServiceRow.full_service_product_id ?? null,
          transport_only_product_id:
            fullServiceRow.transport_only_product_id ?? null,
        }
      : null,
    transportOnly: transportOnlyRow
      ? {
          ...transportOnlyRow,
          configurator_mode:
            transportOnlyRow.configurator_mode === "linear_ft"
              ? "linear_ft"
              : "simple",
          formula_segment_feet: transportOnlyRow.formula_segment_feet ?? null,
          full_service_product_id:
            transportOnlyRow.full_service_product_id ?? null,
          transport_only_product_id:
            transportOnlyRow.transport_only_product_id ?? null,
        }
      : null,
  });
}

function rentalsPayload(form: FormState) {
  return {
    is_public: form.is_public,
    configurator_mode: form.configurator_mode,
    formula_segment_feet:
      form.configurator_mode === "linear_ft" &&
      Number(form.formula_segment_feet) > 0
        ? Number(form.formula_segment_feet)
        : null,
    full_service_product_id: form.full_service_product_id || null,
    transport_only_product_id: form.transport_only_product_id || null,
    formula_includes: form.formulaIncludes
      .filter((row) => row.includedProductId)
      .map((row) => ({
        includedProductId: row.includedProductId,
        qtyPerSegment: Number(row.qtyPerSegment) || 1,
      })),
    addons: form.addons
      .filter((row) => row.addonProductId)
      .map((row) => ({
        addonProductId: row.addonProductId,
      })),
  };
}

export function AdminProductEditor({
  product = null,
  allProducts = [],
  rentalsBundle = null,
}: {
  product?: ProductRow | null;
  allProducts?: ProductRow[];
  rentalsBundle?: AdminProductRentalsBundleProp | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNew = !product;
  const [form, setForm] = useState<FormState>(() =>
    formFromProduct(product, rentalsBundle)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(product?.id ?? null);
  const [dragOver, setDragOver] = useState(false);

  const otherProducts = useMemo(
    () => allProducts.filter((row) => row.id !== productId),
    [allProducts, productId]
  );
  const serviceProducts = useMemo(
    () => otherProducts.filter((row) => row.kind === "service"),
    [otherProducts]
  );

  const completeness = useMemo(
    () => computeLiveCompleteness(form, allProducts, productId),
    [form, allProducts, productId]
  );

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function mergeProductIntoForm(next: ProductRow, keepRentals = true) {
    setForm((prev) => {
      const base = formFromProduct(next, null);
      if (!keepRentals) return base;
      return {
        ...base,
        is_public: prev.is_public,
        configurator_mode: prev.configurator_mode,
        formula_segment_feet: prev.formula_segment_feet,
        full_service_product_id: prev.full_service_product_id,
        transport_only_product_id: prev.transport_only_product_id,
        formulaIncludes: prev.formulaIncludes,
        addons: prev.addons,
      };
    });
  }

  function buildCorePayload() {
    return {
      name: form.name,
      sku: form.sku,
      kind: form.kind,
      category: form.category,
      short_description: form.short_description,
      description: form.description,
      unit_label: form.unit_label,
      default_unit_price_cents: dollarsToCents(form.priceDollars),
      is_taxable: form.is_taxable,
      quantity_on_hand: Number.parseInt(form.quantity_on_hand, 10) || 0,
      low_stock_threshold: Number.parseInt(form.low_stock_threshold, 10) || 0,
      availability_status: form.availability_status,
      availability_manual: form.availability_manual,
      is_active: form.is_active,
      image_url: form.image_url,
      image_alt: form.image_alt,
      ...rentalsPayload(form),
    };
  }

  async function save(): Promise<string | null> {
    setSaving(true);
    setError(null);
    try {
      const payload = buildCorePayload();
      const endpoint = productId
        ? `/api/admin/products/${productId}`
        : "/api/admin/products";
      const response = await fetch(endpoint, {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        product?: ProductRow;
      };
      if (!response.ok || !data.ok || !data.product) {
        setError(data.message ?? "Could not save item.");
        return null;
      }
      setProductId(data.product.id);
      mergeProductIntoForm(data.product, true);
      if (isNew) {
        router.replace(`/admin/products/${data.product.id}`);
      } else {
        router.refresh();
      }
      return data.product.id;
    } catch {
      setError("Could not save item.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    let id = productId;
    if (!id) {
      id = await save();
      if (!id) return;
    }
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/products/${id}/image`, {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        product?: ProductRow;
      };
      if (!response.ok || !data.ok || !data.product) {
        setError(data.message ?? "Upload failed.");
        return;
      }
      mergeProductIntoForm(data.product, true);
      router.refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    if (!productId || !form.image_url) return;
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildCorePayload(),
          image_url: null,
          image_alt: null,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        product?: ProductRow;
      };
      if (!response.ok || !data.ok || !data.product) {
        setError(data.message ?? "Could not remove photo.");
        return;
      }
      mergeProductIntoForm(data.product, true);
      router.refresh();
    } catch {
      setError("Could not remove photo.");
    } finally {
      setUploading(false);
    }
  }

  function toggleInclude(productOptionId: string) {
    setForm((prev) => {
      const exists = prev.formulaIncludes.some(
        (row) => row.includedProductId === productOptionId
      );
      if (exists) {
        return {
          ...prev,
          formulaIncludes: prev.formulaIncludes.filter(
            (row) => row.includedProductId !== productOptionId
          ),
        };
      }
      return {
        ...prev,
        formulaIncludes: [
          ...prev.formulaIncludes,
          { includedProductId: productOptionId, qtyPerSegment: "1" },
        ],
      };
    });
  }

  function setIncludeQty(productOptionId: string, qty: string) {
    setForm((prev) => ({
      ...prev,
      formulaIncludes: prev.formulaIncludes.map((row) =>
        row.includedProductId === productOptionId
          ? { ...row, qtyPerSegment: qty }
          : row
      ),
    }));
  }

  function toggleAddon(productOptionId: string) {
    setForm((prev) => {
      const exists = prev.addons.some(
        (row) => row.addonProductId === productOptionId
      );
      if (exists) {
        return {
          ...prev,
          addons: prev.addons.filter(
            (row) => row.addonProductId !== productOptionId
          ),
        };
      }
      return {
        ...prev,
        addons: [...prev.addons, { addonProductId: productOptionId }],
      };
    });
  }

  const showPublicWarning = form.is_public && !completeness.readyForPublic;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Inventory"
        title={isNew ? "New inventory item" : form.name || "Inventory item"}
        description={
          isNew
            ? "Add a product or service you can quote from."
            : "Edit catalog details, photo, and stock."
        }
        icon={Package}
        backHref="/admin/products"
        backLabel="All inventory"
        meta={
          <>
            <ProductKindBadge kind={form.kind} />
            {form.kind === "product" ? (
              <ProductAvailabilityBadge status={form.availability_status} />
            ) : null}
          </>
        }
        actions={
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isNew ? "Create item" : "Save changes"}
          </Button>
        }
      />

      {error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {showPublicWarning ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Marked public, but not ready for Rentals
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                Incomplete items stay hidden on the public Rentals catalog until
                every error below is fixed.
              </p>
              <ul className="mt-3 space-y-1.5">
                {completeness.issues
                  .filter((issue) => issue.severity === "error")
                  .map((issue) => (
                    <li
                      key={issue.code + issue.message}
                      className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100"
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                      {issue.message}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Upload className="size-4" />
                </span>
                <div>
                  <h2 className="font-heading text-lg font-semibold">Photo</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Shows on guest proposals, Rentals, and quote PDFs.
                  </p>
                </div>
              </div>
              {form.image_url ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading || saving}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading || saving}
                    className="text-destructive hover:text-destructive"
                    onClick={() => void removePhoto()}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={uploading || saving}
              onChange={(e) => {
                void onUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              disabled={uploading || saving}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0] ?? null;
                void onUpload(file);
              }}
              className={cn(
                "group relative mt-4 flex w-full max-w-md overflow-hidden rounded-2xl border border-dashed text-left transition-colors",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-70",
                dragOver
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-background/30 hover:border-primary/40 hover:bg-primary/[0.04]"
              )}
            >
              <div className="relative aspect-[4/3] w-full">
                {form.image_url ? (
                  <>
                    <Image
                      src={form.image_url}
                      alt={form.image_alt || form.name || "Product photo"}
                      fill
                      className="object-cover"
                      sizes="448px"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-xs font-medium text-white sm:text-sm">
                        Drop or click to replace
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                        <ImagePlus className="size-3.5" />
                        Update
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2.5 px-5 py-8 text-center">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                      {uploading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <ImagePlus className="size-5" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {uploading
                          ? "Uploading photo…"
                          : "Drop an image, or click to browse"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPG, PNG, WEBP, or GIF · max 5MB
                        {isNew ? " · saves first if needed" : ""}
                      </p>
                    </div>
                    <span className="inline-flex min-h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm">
                      Choose photo
                    </span>
                  </div>
                )}
              </div>
            </button>
          </section>

          <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Package className="size-4" />
              </span>
              <h2 className="font-heading text-lg font-semibold">Details</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Kind</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_KINDS.map((kind) => {
                    const selected = form.kind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          patch({
                            kind,
                            ...(kind === "service"
                              ? {
                                  quantity_on_hand: "0",
                                  availability_status: "available",
                                  availability_manual: false,
                                }
                              : {}),
                          })
                        }
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
                            {PRODUCT_KIND_LABELS[kind]}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {kind === "product"
                              ? "Stock tracked"
                              : "No stock tracking"}
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

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Ivory velvet panel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => patch({ sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className={selectClass}
                  value={form.category}
                  onChange={(e) =>
                    patch({ category: e.target.value as QuoteLineCategory })
                  }
                >
                  {QUOTE_LINE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {QUOTE_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <select
                  id="unit"
                  className={selectClass}
                  value={form.unit_label}
                  onChange={(e) => patch({ unit_label: e.target.value })}
                >
                  {PRODUCT_UNIT_LABELS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Default price (CAD)</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={form.priceDollars}
                  onChange={(e) => patch({ priceDollars: e.target.value })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="short">Short description</Label>
                <Input
                  id="short"
                  value={form.short_description}
                  onChange={(e) =>
                    patch({ short_description: e.target.value })
                  }
                  placeholder="Shown in pickers and summaries"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Full details</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Fabric, size, install notes, inclusions…"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Ruler className="size-4" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Rentals configurator
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  How this item behaves on the public Rentals page.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PRODUCT_CONFIGURATOR_MODES.map((mode) => (
                    <ModeOptionCard
                      key={mode}
                      selected={form.configurator_mode === mode}
                      title={
                        mode === "simple"
                          ? "Simple"
                          : "Wall-to-wall linear ft"
                      }
                      description={
                        mode === "simple"
                          ? PRODUCT_CONFIGURATOR_MODE_LABELS.simple
                          : "Formula segments, includes, and service links"
                      }
                      onSelect={() => patch({ configurator_mode: mode })}
                    />
                  ))}
                </div>
              </div>

              {form.configurator_mode === "linear_ft" ? (
                <>
                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="segment-feet">Segment length (feet)</Label>
                    <Input
                      id="segment-feet"
                      inputMode="decimal"
                      value={form.formula_segment_feet}
                      onChange={(e) =>
                        patch({ formula_segment_feet: e.target.value })
                      }
                      placeholder="e.g. 10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Included components scale by ceil(linear ft ÷ segment).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Formula includes</Label>
                    <p className="text-xs text-muted-foreground">
                      Bases, poles, and other components included per segment.
                    </p>
                    {otherProducts.length === 0 ? (
                      <p className="rounded-2xl border border-border/40 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                        Add other inventory items first to link includes.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {otherProducts.map((option) => {
                          const selected = form.formulaIncludes.some(
                            (row) => row.includedProductId === option.id
                          );
                          const qty =
                            form.formulaIncludes.find(
                              (row) => row.includedProductId === option.id
                            )?.qtyPerSegment ?? "1";
                          return (
                            <MultiSelectProductCard
                              key={option.id}
                              selected={selected}
                              title={option.name}
                              description={`${PRODUCT_KIND_LABELS[option.kind]} · ${option.unit_label}`}
                              onToggle={() => toggleInclude(option.id)}
                            >
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor={`qty-${option.id}`}
                                  className="text-xs"
                                >
                                  Qty per segment
                                </Label>
                                <Input
                                  id={`qty-${option.id}`}
                                  inputMode="decimal"
                                  value={qty}
                                  onChange={(e) =>
                                    setIncludeQty(option.id, e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                            </MultiSelectProductCard>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full-service">Full service</Label>
                      <select
                        id="full-service"
                        className={selectClass}
                        value={form.full_service_product_id}
                        onChange={(e) =>
                          patch({ full_service_product_id: e.target.value })
                        }
                      >
                        <option value="">Select service…</option>
                        {serviceProducts.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Transport + install + teardown.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transport-only">Transport only</Label>
                      <select
                        id="transport-only"
                        className={selectClass}
                        value={form.transport_only_product_id}
                        onChange={(e) =>
                          patch({ transport_only_product_id: e.target.value })
                        }
                      >
                        <option value="">Select service…</option>
                        {serviceProducts.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Delivery without install crew.
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label>Add-ons</Label>
                <p className="text-xs text-muted-foreground">
                  Optional extras guests can add on Rentals (any mode).
                </p>
                {otherProducts.length === 0 ? (
                  <p className="rounded-2xl border border-border/40 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                    Add other inventory items first to offer add-ons.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {otherProducts.map((option) => {
                      const selected = form.addons.some(
                        (row) => row.addonProductId === option.id
                      );
                      return (
                        <MultiSelectProductCard
                          key={option.id}
                          selected={selected}
                          title={option.name}
                          description={`${PRODUCT_KIND_LABELS[option.kind]} · ${option.unit_label}`}
                          onToggle={() => toggleAddon(option.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-4">
          <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <h2 className="font-heading text-lg font-semibold">Inventory</h2>
            {form.kind === "service" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Services are not stock-tracked. Availability follows active
                status only.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity on hand</Label>
                  <Input
                    id="qty"
                    inputMode="numeric"
                    value={form.quantity_on_hand}
                    onChange={(e) =>
                      patch({
                        quantity_on_hand: e.target.value,
                        availability_manual: false,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low">Low-stock threshold</Label>
                  <Input
                    id="low"
                    inputMode="numeric"
                    value={form.low_stock_threshold}
                    onChange={(e) =>
                      patch({
                        low_stock_threshold: e.target.value,
                        availability_manual: false,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <select
                    id="availability"
                    className={selectClass}
                    value={form.availability_status}
                    onChange={(e) =>
                      patch({
                        availability_status: e.target
                          .value as ProductAvailabilityStatus,
                        availability_manual: true,
                      })
                    }
                  >
                    {PRODUCT_AVAILABILITY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {PRODUCT_AVAILABILITY_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Changing availability locks a manual override until qty
                    changes again.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <ThemedCheck
                checked={form.is_active}
                onCheckedChange={(next) => patch({ is_active: next })}
                label="Active in quote picker"
                description="Inactive items stay in inventory but hide from new quotes."
              />
              <ThemedCheck
                checked={form.is_taxable}
                onCheckedChange={(next) => patch({ is_taxable: next })}
                label="Taxable by default"
                description="Applied when this item is added to a quote."
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ShoppingBag className="size-4" />
              </span>
              <h2 className="font-heading text-lg font-semibold">
                Public catalog
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <ThemedCheck
                checked={form.is_public}
                onCheckedChange={(next) => patch({ is_public: next })}
                label="Show on public Rentals"
                description="Incomplete items stay hidden even when this is on."
              />

              <div
                className={cn(
                  "rounded-2xl border px-3 py-3",
                  completeness.readyForPublic
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border/40 bg-background/40"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Catalog readiness
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    completeness.readyForPublic
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-foreground"
                  )}
                >
                  {completeness.readyForPublic
                    ? "Ready for Rentals"
                    : "Missing setup"}
                </p>
                {completeness.issues.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {completeness.issues.map((issue) => (
                      <li
                        key={issue.code + issue.message}
                        className={cn(
                          "flex items-start gap-2 text-xs",
                          issue.severity === "error"
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 size-1.5 shrink-0 rounded-full",
                            issue.severity === "error"
                              ? "bg-amber-500"
                              : "bg-muted-foreground/50"
                          )}
                        />
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Photo, price, and configurator setup look complete.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      <AdminFloatingSaveButton
        active
        saving={saving}
        label={isNew ? "Create item" : "Save changes"}
        onSave={() => void save()}
      />
    </div>
  );
}

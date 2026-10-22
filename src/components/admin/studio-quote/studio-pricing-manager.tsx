"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Link2,
  Loader2,
  Package,
  Search,
  Tags,
  X,
} from "lucide-react";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatQuoteUnitPrice } from "@/data/quotes";
import {
  STUDIO_BOM_SECTIONS,
  STUDIO_BOM_SECTION_LABELS,
  type StudioBomSection,
} from "@/lib/studio-bom";
import type {
  StudioMappingCatalogEntry,
  StudioProductMappingRow,
} from "@/lib/studio-product-mappings";
import { cn } from "@/lib/utils";
import { STUDIO_QUOTE_SECTION_ICONS } from "./studio-quote-section-meta";

export type StudioPricingProductOption = {
  id: string;
  name: string;
  sku: string | null;
  kind: string;
  categoryLabel: string;
  unitLabel: string;
  priceCents: number;
  imageUrl: string | null;
  isActive: boolean;
  linearFt: boolean;
};

type Saved = { productId: string | null; notes: string };
type Filter = "all" | "unmapped" | "mapped";

/** Overrides and itemised parts only apply when set — never "missing". */
function isOptional(entry: StudioMappingCatalogEntry): boolean {
  return entry.override || entry.key.startsWith("hardware_part:");
}

export function StudioPricingManager({
  catalog,
  mappings,
  products,
}: {
  catalog: StudioMappingCatalogEntry[];
  mappings: StudioProductMappingRow[];
  products: StudioPricingProductOption[];
}) {
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const [saved, setSaved] = useState<Record<string, Saved>>(() =>
    Object.fromEntries(
      mappings.map((row) => [
        row.mapping_key,
        { productId: row.is_active ? row.product_id : null, notes: row.notes ?? "" },
      ])
    )
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [pickerChoice, setPickerChoice] = useState<string | null>(null);

  const isMapped = (key: string) => {
    const productId = saved[key]?.productId;
    return Boolean(productId && productsById.get(productId)?.isActive);
  };

  const required = catalog.filter((entry) => !isOptional(entry));
  const mappedRequired = required.filter((entry) => isMapped(entry.key)).length;
  const overridesSet = catalog.filter(
    (entry) => isOptional(entry) && isMapped(entry.key)
  ).length;

  const needle = query.trim().toLowerCase();
  const visible = catalog.filter((entry) => {
    if (filter === "unmapped" && (isOptional(entry) || isMapped(entry.key))) return false;
    if (filter === "mapped" && !isMapped(entry.key)) return false;
    if (!needle) return true;
    const productName = saved[entry.key]?.productId
      ? productsById.get(saved[entry.key].productId as string)?.name ?? ""
      : "";
    return [entry.label, entry.key, entry.group, productName]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const pickerEntry = pickerKey ? catalog.find((entry) => entry.key === pickerKey) ?? null : null;

  function openPicker(key: string) {
    setPickerKey(key);
    setPickerChoice(saved[key]?.productId ?? null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={Link2}
          label="Core options linked"
          value={`${mappedRequired} / ${required.length}`}
          tone="gold"
        />
        <SummaryTile
          icon={AlertTriangle}
          label="Still unpriced"
          value={String(required.length - mappedRequired)}
          tone={required.length - mappedRequired > 0 ? "warn" : undefined}
        />
        <SummaryTile icon={Tags} label="Overrides set" value={String(overridesSet)} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-card/25 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search options or products"
            className="pl-9"
            aria-label="Search Studio options"
          />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filter options">
          {(
            [
              ["all", "All"],
              ["unmapped", "Unpriced"],
              ["mapped", "Linked"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === value
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {STUDIO_BOM_SECTIONS.map((section) => {
        const entries = visible.filter((entry) => entry.section === section);
        if (!entries.length) return null;
        return (
          <SectionCard
            key={section}
            section={section}
            entries={entries}
            allEntries={catalog.filter((entry) => entry.section === section)}
            isMapped={isMapped}
            forceOpen={Boolean(needle) || filter !== "all"}
            renderRow={(entry) => (
              <MappingRow
                key={entry.key}
                entry={entry}
                saved={saved[entry.key] ?? { productId: null, notes: "" }}
                product={
                  saved[entry.key]?.productId
                    ? productsById.get(saved[entry.key].productId as string) ?? null
                    : null
                }
                onPick={() => openPicker(entry.key)}
                onSaved={(next) => setSaved((current) => ({ ...current, [entry.key]: next }))}
              />
            )}
          />
        );
      })}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 px-6 py-10 text-center text-sm text-muted-foreground">
          No options match this filter.
        </div>
      ) : null}

      <Dialog open={pickerKey !== null} onOpenChange={(open) => !open && setPickerKey(null)}>
        {pickerEntry ? (
          <ProductPickerDialog
            entry={pickerEntry}
            products={products}
            selectedId={pickerChoice}
            onSelect={setPickerChoice}
            onCancel={() => setPickerKey(null)}
            onConfirm={async () => {
              const result = await saveMapping(pickerEntry.key, {
                productId: pickerChoice,
                notes: saved[pickerEntry.key]?.notes ?? "",
              });
              if (result === true) {
                setSaved((current) => ({
                  ...current,
                  [pickerEntry.key]: {
                    productId: pickerChoice,
                    notes: current[pickerEntry.key]?.notes ?? "",
                  },
                }));
                setPickerKey(null);
              }
              return result;
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

async function saveMapping(key: string, value: Saved): Promise<true | string> {
  try {
    const response = await fetch("/api/admin/studio-mappings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mappingKey: key,
        productId: value.productId,
        notes: value.notes,
        isActive: true,
      }),
    });
    const payload = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !payload.ok) return payload.message ?? "Could not save.";
    return true;
  } catch {
    return "Could not save.";
  }
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Link2;
  label: string;
  value: string;
  tone?: "gold" | "warn";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        tone === "gold"
          ? "border-primary/40 bg-primary/10"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-border/40 bg-card/30"
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          tone === "warn" ? "bg-amber-500/15 text-amber-300" : "bg-primary/15 text-primary"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  entries,
  allEntries,
  isMapped,
  forceOpen,
  renderRow,
}: {
  section: StudioBomSection;
  entries: StudioMappingCatalogEntry[];
  allEntries: StudioMappingCatalogEntry[];
  isMapped: (key: string) => boolean;
  forceOpen: boolean;
  renderRow: (entry: StudioMappingCatalogEntry) => React.ReactNode;
}) {
  const Icon = STUDIO_QUOTE_SECTION_ICONS[section];
  const groups = new Map<string, StudioMappingCatalogEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.group) ?? [];
    list.push(entry);
    groups.set(entry.group, list);
  }
  const required = allEntries.filter((entry) => !isOptional(entry));
  const linked = required.filter((entry) => isMapped(entry.key)).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-border/40 bg-card/25">
      <header className="relative flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold">
            {STUDIO_BOM_SECTION_LABELS[section]}
          </h2>
          <p className="text-xs text-muted-foreground">
            {linked} of {required.length} options linked
          </p>
        </div>
      </header>
      <div className="space-y-5 p-4 sm:p-5">
        {[...groups.entries()].map(([group, list]) => {
          const optional = list.every(isOptional);
          const rows = <div className="grid gap-2.5">{list.map(renderRow)}</div>;
          if (!optional) {
            return (
              <div key={group} className="space-y-2.5">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                  {group}
                </p>
                {rows}
              </div>
            );
          }
          const setCount = list.filter((entry) => isMapped(entry.key)).length;
          return (
            <details
              key={`${group}-${forceOpen ? "open" : "closed"}`}
              open={forceOpen || undefined}
              className="group/details rounded-2xl border border-border/30 bg-background/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-foreground">{group}</span>
                  <span className="block text-xs text-muted-foreground">
                    Optional — only when this option is priced differently.
                  </span>
                </span>
                <span className="rounded-full border border-border/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                  {setCount} set · {list.length}
                </span>
              </summary>
              <div className="border-t border-border/30 p-3">{rows}</div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function MappingRow({
  entry,
  saved,
  product,
  onPick,
  onSaved,
}: {
  entry: StudioMappingCatalogEntry;
  saved: Saved;
  product: StudioPricingProductOption | null;
  onPick: () => void;
  onSaved: (next: Saved) => void;
}) {
  const [notes, setNotes] = useState(saved.notes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const optional = isOptional(entry);
  const inactive = Boolean(product && !product.isActive);
  const missing = !optional && (!product || inactive);
  const dirty = notes.trim() !== saved.notes.trim();

  async function persist(next: Saved) {
    setSaving(true);
    setMessage(null);
    const result = await saveMapping(entry.key, next);
    setSaving(false);
    if (result === true) {
      onSaved(next);
      setMessage({ tone: "ok", text: "Saved" });
    } else {
      setMessage({ tone: "error", text: result });
    }
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border p-3 sm:p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center",
        missing ? "border-amber-500/35 bg-amber-500/[0.06]" : "border-border/40 bg-card/30"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {entry.swatchHex ? (
            <span
              className="size-5 rounded-full ring-1 ring-white/25"
              style={{ backgroundColor: entry.swatchHex }}
              aria-hidden
            />
          ) : missing ? (
            <CircleDashed className="size-4 text-amber-300" aria-hidden />
          ) : (
            <Check className="size-4 text-primary" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{entry.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{entry.key}</p>
        </div>
      </div>

      <div className="min-w-0">
        {product ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-2">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- catalog images come from arbitrary storage hosts
                <img src={product.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <Package className="size-4 text-muted-foreground" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatQuoteUnitPrice(product.priceCents, product.unitLabel)}
                {inactive ? <span className="ml-2 text-amber-300">Inactive</span> : null}
                {normalizedUnitMismatch(entry.defaultUnit, product.unitLabel) ? (
                  <span className="ml-2 text-amber-300">
                    Design measures {entry.defaultUnit}
                  </span>
                ) : null}
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={onPick} disabled={saving}>
              Change
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Unlink ${entry.label}`}
              disabled={saving}
              onClick={() => void persist({ productId: null, notes })}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPick}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm transition-colors",
              optional
                ? "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                : "border-amber-500/45 text-amber-200 hover:border-primary/50 hover:text-foreground"
            )}
          >
            <Link2 className="size-4 shrink-0" aria-hidden />
            {optional ? "Uses the general mapping — set an override" : "Not priced — choose a product"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          placeholder="Notes (owner only)"
          aria-label={`Notes for ${entry.label}`}
        />
        <Button
          type="button"
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty || saving}
          onClick={() => void persist({ productId: saved.productId, notes })}
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Save"}
        </Button>
        {message ? (
          <span
            className={cn(
              "text-xs whitespace-nowrap",
              message.tone === "ok" ? "text-primary" : "text-destructive"
            )}
            role={message.tone === "error" ? "alert" : undefined}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const UNIT_ALIASES: Record<string, string> = {
  "linear ft": "linear ft",
  "linear feet": "linear ft",
  lf: "linear ft",
  ft: "linear ft",
  feet: "linear ft",
  each: "each",
  ea: "each",
  item: "each",
  piece: "each",
  unit: "each",
  event: "event",
  flat: "event",
  "flat rate": "event",
  panel: "panel",
  set: "set",
};

/** Soft hint only — the converter also accepts a product unit that matches an alternate quantity. */
function normalizedUnitMismatch(designUnit: string, productUnit: string): boolean {
  const product = UNIT_ALIASES[productUnit.trim().toLowerCase()];
  if (!product) return true;
  if (product === designUnit) return false;
  if (designUnit === "each" && product === "linear ft") return false;
  if (designUnit === "event" && (product === "each" || product === "set")) return false;
  if (designUnit === "each" && product === "event") return false;
  return true;
}

function ProductPickerDialog({
  entry,
  products,
  selectedId,
  onSelect,
  onCancel,
  onConfirm,
}: {
  entry: StudioMappingCatalogEntry;
  products: StudioPricingProductOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCancel: () => void;
  onConfirm: () => Promise<true | string>;
}) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const list = products.filter(
    (product) =>
      (showInactive || product.isActive || product.id === selectedId) &&
      (!needle ||
        [product.name, product.sku ?? "", product.categoryLabel]
          .join(" ")
          .toLowerCase()
          .includes(needle))
  );

  return (
    <BrandDialogContent
      size="xl"
      icon={Link2}
      eyebrow="Studio pricing"
      title={entry.label}
      description={`Pick the catalog product that prices this option. The design measures it in ${entry.defaultUnit}.`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="accent-[var(--primary)]"
            />
            Show inactive products
          </label>
          <div className="flex items-center gap-2">
            {error ? (
              <span className="text-xs text-destructive" role="alert">
                {error}
              </span>
            ) : null}
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                const result = await onConfirm();
                setSaving(false);
                if (result !== true) setError(result);
              }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {selectedId ? "Link product" : "Save as unpriced"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="pl-9"
            aria-label="Search products"
            autoFocus
          />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Products">
          {list.map((product) => {
            const selected = product.id === selectedId;
            return (
              <button
                key={product.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(selected ? null : product.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 motion-reduce:transition-none",
                  "border-border/40 bg-card/40 hover:-translate-y-px hover:border-primary/30 hover:bg-card/60 motion-reduce:hover:translate-y-0",
                  selected &&
                    "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                )}
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- catalog images come from arbitrary storage hosts
                    <img src={product.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Package className="size-4 text-muted-foreground" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {product.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                    {formatQuoteUnitPrice(product.priceCents, product.unitLabel)} ·{" "}
                    {product.categoryLabel}
                    {product.linearFt ? " · linear-ft formula" : ""}
                    {!product.isActive ? " · inactive" : ""}
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
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
            No products match.
          </p>
        ) : null}
      </div>
    </BrandDialogContent>
  );
}

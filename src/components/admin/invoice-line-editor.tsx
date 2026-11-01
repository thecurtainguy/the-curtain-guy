"use client";

import Image from "next/image";
import { Check, Minus, Package, Trash2, Truck, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ghostField, stripControl, UnitPriceInput } from "@/components/admin/quote-line-editor";
import type { CustomerLanguage } from "@/data/customer-language";
import { formatQuoteUnitSuffix } from "@/data/quotes";
import { cn } from "@/lib/utils";

export type InvoiceLineEditorValue = {
  description: string;
  description_translated?: string | null;
  quantity: string;
  unit_label: string;
  unit_price: string;
  is_taxable: boolean;
  product_id: string | null;
  category: string | null;
  category_label: string | null;
  image_url: string | null;
  image_alt: string | null;
};

type InvoiceLineEditorProps = {
  line: InvoiceLineEditorValue;
  index: number;
  currency: string;
  language: CustomerLanguage;
  amountLabel: string;
  onChange: (patch: Partial<InvoiceLineEditorValue>) => void;
  onRemove: () => void;
};

export function InvoiceLineEditor({
  line,
  index,
  currency,
  language,
  amountLabel,
  onChange,
  onRemove,
}: InvoiceLineEditorProps) {
  const translated = line.description_translated ?? "";
  const missingTranslation = Boolean(line.description.trim()) && !translated.trim();
  const otherLanguageLabel = language === "fr" ? "English" : "French";
  const isLogistics = line.category === "delivery" || line.category === "installation";
  const unitSuffix = formatQuoteUnitSuffix(line.unit_label);

  return (
    <div className="flex gap-3">
      <div className="relative size-12 shrink-0">
        <div className="relative size-12 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
          {line.image_url ? (
            <Image
              src={line.image_url}
              alt={line.image_alt || line.description}
              fill
              className="object-cover"
              sizes="48px"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              {isLogistics ? <Truck className="size-4" /> : <Package className="size-4" />}
            </div>
          )}
        </div>
        <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-sm tabular-nums">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Textarea
              rows={1}
              value={line.description}
              onChange={(e) => onChange({ description: e.target.value })}
              aria-label="Description"
              placeholder="Description"
              className={cn(ghostField, "rounded-xl px-2 py-1 text-[15px] font-medium leading-snug md:text-[15px]")}
            />
            <div className="mt-0.5 flex items-start gap-1.5 pl-2">
              <span
                className={cn(
                  "mt-1 shrink-0 rounded-md border px-1 py-px text-[9px] font-semibold uppercase tracking-wider",
                  missingTranslation
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-border/50 text-muted-foreground"
                )}
                title={missingTranslation ? `${otherLanguageLabel} version missing` : `${otherLanguageLabel} version`}
              >
                {language === "fr" ? "EN" : "FR"}
              </span>
              <Textarea
                rows={1}
                value={translated}
                onChange={(e) => onChange({ description_translated: e.target.value })}
                aria-label={`${otherLanguageLabel} description`}
                placeholder={language === "fr" ? "English version" : "Version française"}
                className={cn(ghostField, "rounded-lg px-1.5 py-0.5 text-xs text-muted-foreground md:text-xs")}
              />
            </div>
          </div>

          <div className="w-32 shrink-0 text-right">
            <p className="flex h-9 items-center justify-end px-2 font-heading text-lg font-semibold tabular-nums">
              {amountLabel}
            </p>
            <button
              type="button"
              aria-pressed={line.is_taxable}
              onClick={() => onChange({ is_taxable: !line.is_taxable })}
              title={line.is_taxable ? "Taxes apply to this line — click to make it non-taxable" : "No tax on this line — click to make it taxable"}
              className={cn(
                "mt-1 mr-1 inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                line.is_taxable
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-background/50 text-muted-foreground"
              )}
            >
              {line.is_taxable ? <Check className="size-3" /> : <Minus className="size-3" />}
              {line.is_taxable ? "Taxable" : "Non-tax"}
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove line"
            title="Remove line"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pl-2">
          <div className={cn(stripControl, "flex items-center pl-1")}>
            <input
              inputMode="decimal"
              aria-label="Quantity"
              value={line.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              className="h-7 w-12 rounded-lg bg-transparent px-1.5 text-center text-sm font-medium tabular-nums outline-none hover:bg-input/40 focus-visible:bg-input/60"
            />
            <input
              aria-label="Unit"
              value={line.unit_label}
              onChange={(e) => onChange({ unit_label: e.target.value })}
              placeholder="unit"
              className="h-7 w-16 rounded-lg bg-transparent px-1.5 text-xs outline-none placeholder:text-muted-foreground hover:bg-input/40 focus-visible:bg-input/60"
            />
            <span className="px-1 text-muted-foreground" aria-hidden>
              ×
            </span>
            <UnitPriceInput
              value={line.unit_price}
              onChange={(value) => onChange({ unit_price: value })}
              label={`Unit price · ${currency}`}
            />
            <span className="pr-2.5 pl-0.5 text-xs whitespace-nowrap text-muted-foreground">
              {currency} {unitSuffix}
            </span>
          </div>

          {line.category ? (
            <span className="inline-flex h-8 items-center rounded-xl border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {line.category_label || line.category.replaceAll("_", " ")}
            </span>
          ) : null}
          {line.product_id ? (
            <button
              type="button"
              onClick={() => onChange({ product_id: null })}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/40 bg-background/50 px-2.5 text-xs text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              title="Keep the text but stop tracking this line against inventory"
            >
              <Package className="size-3.5" />
              Inventory item
              <Unlink className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

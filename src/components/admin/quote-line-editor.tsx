"use client";

import { useState, type KeyboardEvent } from "react";
import { Check, Minus, Trash2 } from "lucide-react";
import type { DraftLine } from "@/components/admin/admin-quote-builder";
import { LineThumb, isLogisticsCategory } from "@/components/admin/line-thumb";
import { Button } from "@/components/ui/button";
import { SelectInput, type SelectOption } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerLanguage } from "@/data/customer-language";
import {
  QUOTE_LINE_STATUS_LABELS,
  QUOTE_LINE_STATUSES,
  computeLineTotalCents,
  formatQuoteUnitSuffix,
  isZeroPricedQuoteLine,
  unitPriceDollarsToCents,
  type QuoteLineStatus,
} from "@/data/quotes";
import { onlyOneFilled } from "@/lib/translate-draft";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = QUOTE_LINE_STATUSES.map((status) => ({
  value: status,
  label: QUOTE_LINE_STATUS_LABELS[status],
}));

const CALM_STATUSES: QuoteLineStatus[] = ["priced", "included", "approved"];

/** Descriptions stay single-paragraph, like the proposal and PDF render them. */
function blockEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === "Enter") event.preventDefault();
}

export const ghostField =
  "min-h-0 border-transparent bg-transparent hover:bg-input/40 focus-visible:bg-input/50";

export const stripControl =
  "h-8 rounded-xl border border-border/40 bg-background/50 text-xs md:text-xs";

type QuoteLineEditorProps = {
  line: DraftLine;
  index: number;
  currency: string;
  language: CustomerLanguage;
  languageLabel: string;
  otherLanguageLabel: string;
  categoryOptions: SelectOption[];
  unitOptions: SelectOption[];
  onChange: (patch: Partial<DraftLine>) => void;
  onLineTotal: (text: string) => void;
  onRemove: () => void;
};

export function QuoteLineEditor({
  line,
  index,
  currency,
  language,
  languageLabel,
  otherLanguageLabel,
  categoryOptions,
  unitOptions,
  onChange,
  onLineTotal,
  onRemove,
}: QuoteLineEditorProps) {
  const unitPriceCents = unitPriceDollarsToCents(line.unitPriceDollars);
  const lineTotal = computeLineTotalCents(line.quantity, unitPriceCents);
  const included =
    line.status === "included" ||
    isZeroPricedQuoteLine({ status: line.status, unit_price_cents: unitPriceCents });
  const missingTranslation = Boolean(onlyOneFilled(line.description, line.descriptionTranslated));
  const flagged = !CALM_STATUSES.includes(line.status);
  const unitSuffix = formatQuoteUnitSuffix(line.unitLabel);

  return (
    <div className="flex gap-3">
      <LineThumb
        imageUrl={line.imageUrl}
        imageAlt={line.imageAlt || line.description}
        index={index}
        logistics={isLogisticsCategory(line.category)}
      />

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Textarea
              rows={1}
              value={line.description}
              onChange={(e) => onChange({ description: e.target.value })}
              onKeyDown={blockEnter}
              aria-label={`Description · ${languageLabel}`}
              placeholder="What is included"
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
                value={line.descriptionTranslated}
                onChange={(e) => onChange({ descriptionTranslated: e.target.value })}
                onKeyDown={blockEnter}
                aria-label={`${otherLanguageLabel} description`}
                placeholder={language === "fr" ? "English version" : "Version française"}
                className={cn(ghostField, "rounded-lg px-1.5 py-0.5 text-xs text-muted-foreground md:text-xs")}
              />
            </div>
          </div>

          <div className="w-32 shrink-0 text-right">
            {included ? (
              <span
                className="inline-flex h-9 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary"
                title="$0 lines show as Included / Inclus to the customer"
              >
                Included
              </span>
            ) : (
              <LineTotalInput
                id={`line-total-${line.key}`}
                cents={lineTotal}
                draft={line.lineTotalDraft}
                onChange={onLineTotal}
                onBlur={() => onChange({ lineTotalDraft: undefined })}
              />
            )}
            <button
              type="button"
              aria-pressed={line.isTaxable}
              onClick={() => onChange({ isTaxable: !line.isTaxable })}
              title={line.isTaxable ? "Taxes apply to this line — click to make it non-taxable" : "No tax on this line — click to make it taxable"}
              className={cn(
                "mt-1 mr-1 inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                line.isTaxable
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-background/50 text-muted-foreground"
              )}
            >
              {line.isTaxable ? <Check className="size-3" /> : <Minus className="size-3" />}
              {line.isTaxable ? "Taxable" : "Non-tax"}
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
              value={line.quantityDraft ?? String(line.quantity)}
              className="h-7 w-12 rounded-lg bg-transparent px-1.5 text-center text-sm font-medium tabular-nums outline-none hover:bg-input/40 focus-visible:bg-input/60"
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value.replace(",", "."));
                onChange({
                  quantityDraft: e.target.value,
                  quantity: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                  lineTotalDraft: undefined,
                });
              }}
              onBlur={() => onChange({ quantityDraft: undefined })}
            />
            <SelectInput
              aria-label="Unit"
              value={line.unitLabel}
              onChange={(next) => onChange({ unitLabel: next })}
              options={unitOptions}
              className="h-7 w-[6.75rem] rounded-lg bg-transparent px-2 pr-7 text-xs hover:bg-input/40 md:text-xs"
            />
            <span className="px-1 text-muted-foreground" aria-hidden>
              ×
            </span>
            <UnitPriceInput
              value={line.unitPriceDollars}
              onChange={(value) => onChange({ unitPriceDollars: value, lineTotalDraft: undefined })}
              label={`Unit price · ${currency}`}
            />
            <span className="pr-2.5 pl-0.5 text-xs whitespace-nowrap text-muted-foreground">
              {currency} {unitSuffix}
            </span>
          </div>

          <SelectInput
            aria-label="Category"
            value={line.category}
            onChange={(next) => onChange({ category: next })}
            options={categoryOptions}
            className={cn(stripControl, "w-36 pr-8")}
          />

          <SelectInput
            aria-label="Status"
            value={line.status}
            onChange={(next) => onChange({ status: next as QuoteLineStatus })}
            options={STATUS_OPTIONS}
            className={cn(
              stripControl,
              "w-36 pr-8",
              flagged && "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"
            )}
          />
        </div>
      </div>
    </div>
  );
}

/** Shows 2 decimals while idle; focusing reveals the exact back-solved price. */
export function UnitPriceInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  const parsed = Number.parseFloat(value.replace(",", "."));
  const rounded = !focused && Number.isFinite(parsed) && /[.,]\d{3,}/.test(value);
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      value={rounded ? parsed.toFixed(2) : value}
      title={rounded ? `Exact: ${value}` : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-20 rounded-lg bg-transparent px-1.5 text-right text-sm font-medium tabular-nums outline-none hover:bg-input/40 focus-visible:bg-input/60"
    />
  );
}

function LineTotalInput({
  id,
  cents,
  draft,
  onChange,
  onBlur,
}: {
  id: string;
  cents: number;
  draft: string | undefined;
  onChange: (text: string) => void;
  onBlur: () => void;
}) {
  return (
    <input
      id={id}
      inputMode="decimal"
      aria-label="Line total"
      value={draft ?? (cents / 100).toFixed(2)}
      title="Type a total — the unit price is worked out so the total is exact"
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-xl border border-transparent bg-transparent px-2 text-right font-heading text-lg font-semibold tabular-nums outline-none transition-colors hover:bg-input/40 focus-visible:border-ring focus-visible:bg-input/50 focus-visible:ring-3 focus-visible:ring-ring/30"
    />
  );
}

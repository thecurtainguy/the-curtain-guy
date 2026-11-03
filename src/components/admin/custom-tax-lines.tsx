"use client";

import { BadgePercent, Ban, Plus, Receipt, Trash2 } from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  percentInputToRate,
  type QuoteManualTaxLine,
  type QuoteTaxMode,
} from "@/data/quotes";

export const TAX_MODE_OPTIONS: Array<{
  id: QuoteTaxMode;
  label: string;
  description: string;
  icon: typeof Receipt;
}> = [
  {
    id: "quebec_gst_qst",
    label: "Québec GST + QST",
    description: "5% and 9.975% on taxable lines",
    icon: Receipt,
  },
  {
    id: "manual",
    label: "Custom tax",
    description: "One line you name, like HST 13%",
    icon: BadgePercent,
  },
  {
    id: "none",
    label: "No tax",
    description: "Exempt, or tax already included",
    icon: Ban,
  },
];

export type ManualTaxDraft = {
  key: string;
  label: string;
  ratePercent: string;
};

export function newManualTaxDraft(): ManualTaxDraft {
  return {
    key: `tax-${crypto.randomUUID()}`,
    label: "",
    ratePercent: "",
  };
}

/** Drops a blank row so an untouched custom-tax field does not save as 0%. */
export function storedManualTaxLines(drafts: ManualTaxDraft[]): QuoteManualTaxLine[] {
  return drafts.flatMap((line) => {
    const label = line.label.trim();
    const rate = percentInputToRate(line.ratePercent);
    if (!label && rate <= 0) return [];
    return [{ label: label || "Tax", rate }];
  });
}

export function TaxModePicker({
  value,
  disabled,
  onChange,
}: {
  value: QuoteTaxMode;
  disabled?: boolean;
  onChange: (mode: QuoteTaxMode) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tax">
      {TAX_MODE_OPTIONS.map((option) => (
        <OptionCard
          key={option.id}
          option={option}
          selected={value === option.id}
          onSelect={() => {
            if (!disabled) onChange(option.id);
          }}
          className={disabled ? "pointer-events-none opacity-60" : "p-3"}
        />
      ))}
    </div>
  );
}

export function CustomTaxLinesEditor({
  lines,
  disabled,
  onChange,
}: {
  lines: ManualTaxDraft[];
  disabled?: boolean;
  onChange: (lines: ManualTaxDraft[]) => void;
}) {
  const shown = lines.length > 0 ? lines : [newManualTaxDraft()];

  function update(key: string, patch: Partial<ManualTaxDraft>) {
    onChange(shown.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Each line is a percentage of the taxable subtotal. For Toronto, use HST at 13%.
      </p>
      {shown.map((line) => (
        <div key={line.key} className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_110px_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tax name</Label>
            <Input
              value={line.label}
              disabled={disabled}
              placeholder="HST"
              onChange={(event) => update(line.key, { label: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Rate %</Label>
            <Input
              inputMode="decimal"
              value={line.ratePercent}
              disabled={disabled}
              placeholder="13"
              onChange={(event) => update(line.key, { ratePercent: event.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove tax line"
              disabled={disabled || shown.length <= 1}
              onClick={() => onChange(shown.filter((row) => row.key !== line.key))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      {disabled ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...shown, newManualTaxDraft()])}
        >
          <Plus className="size-4" />
          Add tax line
        </Button>
      )}
    </div>
  );
}

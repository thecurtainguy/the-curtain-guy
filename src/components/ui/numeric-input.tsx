"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type NumericInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  /** Allow decimals; a comma is read as the decimal point. */
  decimal?: boolean;
};

function parse(text: string, decimal: boolean): number {
  const n = decimal
    ? Number.parseFloat(text.replace(",", "."))
    : Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Number field that keeps the typed text (e.g. "12." or empty) while reporting the parsed value. */
export function NumericInput({ value, onValueChange, decimal = false, ...props }: NumericInputProps) {
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (parse(text, decimal) !== value) setText(String(value));
  }

  return (
    <Input
      inputMode={decimal ? "decimal" : "numeric"}
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const next = parse(event.target.value, decimal);
        setSynced(next);
        onValueChange(next);
      }}
    />
  );
}

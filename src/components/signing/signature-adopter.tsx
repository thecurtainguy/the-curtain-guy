"use client";

import { Check, PenLine, Type } from "lucide-react";
import type { SignatureMethod } from "@/data/quote-signing";
import { cn } from "@/lib/utils";
import { renderScriptToPng, signatureFont } from "./signature-font";
import { SignaturePad } from "./signature-pad";

export type SignatureAdopterLabels = {
  typeTab: string;
  drawTab: string;
  drawHint: string;
  clear: string;
  caption: string;
};

const TYPED_SIZE = { width: 640, height: 180, maxFontSize: 96 };

/** PNG for the adopted signature: typed names are rendered in the script font at submit time. */
export async function adoptedSignatureImage(input: {
  method: SignatureMethod;
  name: string;
  drawnImage: string | null;
}): Promise<string | null> {
  return input.method === "drawn"
    ? input.drawnImage
    : renderScriptToPng(input.name, TYPED_SIZE);
}

function MethodTile({
  icon: Icon,
  label,
  selected,
  onSelect,
}: {
  icon: typeof Type;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex flex-1 items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected && "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full border transition",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60"
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function SignatureAdopter({
  name,
  method,
  onMethodChange,
  drawnImage,
  onDrawnChange,
  labels,
}: {
  name: string;
  method: SignatureMethod;
  onMethodChange: (method: SignatureMethod) => void;
  drawnImage: string | null;
  onDrawnChange: (image: string | null) => void;
  labels: SignatureAdopterLabels;
}) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" className="flex gap-2">
        <MethodTile
          icon={Type}
          label={labels.typeTab}
          selected={method === "typed"}
          onSelect={() => onMethodChange("typed")}
        />
        <MethodTile
          icon={PenLine}
          label={labels.drawTab}
          selected={method === "drawn"}
          onSelect={() => onMethodChange("drawn")}
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-[#fbf8f1] shadow-[0_18px_50px_-30px_rgba(212,175,55,0.6)]">
        <div className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-dashed border-[#14121a]/25" />
        <span className="pointer-events-none absolute bottom-[3.2rem] left-6 font-heading text-lg text-[#14121a]/40">
          ✕
        </span>
        {method === "typed" ? (
          <div className="flex h-44 items-center justify-center px-6 pb-6">
            <span
              className={cn(
                signatureFont.className,
                "max-w-full truncate px-3 py-2 text-5xl leading-[1.4] text-[#14121a] sm:text-6xl"
              )}
            >
              {name.trim() || "—"}
            </span>
          </div>
        ) : (
          <SignaturePad
            className="h-44"
            onChange={onDrawnChange}
            hasValue={Boolean(drawnImage)}
            hint={labels.drawHint}
            clearLabel={labels.clear}
          />
        )}
        <p className="pointer-events-none absolute inset-x-6 bottom-3 truncate text-xs text-[#14121a]/55">
          {labels.caption}
        </p>
      </div>
    </div>
  );
}

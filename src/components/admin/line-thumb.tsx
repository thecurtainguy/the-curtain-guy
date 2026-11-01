import Image from "next/image";
import { Package, Truck } from "lucide-react";

export function isLogisticsCategory(category: string | null | undefined) {
  return category === "delivery" || category === "installation";
}

/** Numbered line photo used by the line editors and the saved views. */
export function LineThumb({
  imageUrl,
  imageAlt,
  index,
  logistics = false,
}: {
  imageUrl: string | null | undefined;
  imageAlt?: string | null;
  index?: number;
  logistics?: boolean;
}) {
  return (
    <div className="relative size-12 shrink-0">
      <div className="relative size-12 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
        {imageUrl ? (
          <Image src={imageUrl} alt={imageAlt || ""} fill className="object-cover" sizes="48px" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            {logistics ? <Truck className="size-4" /> : <Package className="size-4" />}
          </div>
        )}
      </div>
      {index === undefined ? null : (
        <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-sm tabular-nums">
          {index + 1}
        </span>
      )}
    </div>
  );
}

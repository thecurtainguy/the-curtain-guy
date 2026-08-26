"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LocalizedCatalogItem } from "@/lib/i18n/event-builder";

type CatalogCardProps = {
  item: LocalizedCatalogItem;
  selected: boolean;
  onToggle: () => void;
};

export function CatalogCard({ item, selected, onToggle }: CatalogCardProps) {
  const t = useTranslations("eventBuilder.catalog.badges");
  const disabled = item.comingSoon;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        disabled && "cursor-not-allowed opacity-60",
        selected
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
          : "border-border/40 bg-card/25 hover:border-primary/35 hover:bg-card/45"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={item.image}
          alt={item.imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
          sizes="(max-width: 640px) 50vw, 240px"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
          aria-hidden
        />
        {!disabled ? (
          <span
            className={cn(
              "absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-200",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background/85 text-transparent group-hover:border-primary/45"
            )}
            aria-hidden
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
        ) : null}
        {item.comingSoon ? (
          <Badge
            className="absolute left-3 top-3 border-border/50 bg-background/80 text-[10px]"
            variant="outline"
          >
            {t("comingSoon")}
          </Badge>
        ) : null}
        {item.consultRequired ? (
          <Badge
            className="absolute left-3 top-3 border-amber-500/40 bg-amber-500/15 text-[10px] text-amber-200"
            variant="outline"
          >
            {t("consultRequired")}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <item.icon className="size-4" />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold leading-snug">
              {item.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

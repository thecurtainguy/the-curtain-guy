import Image from "next/image";
import {
  Building2,
  Layers,
  Moon,
  Package,
  RotateCcw,
  Theater,
  Truck,
  Wrench,
} from "lucide-react";
import { imagePaths, trustProcessItems } from "@/data/site";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const estimateFocusAreas = [
  { label: "Wedding draping", icon: Layers },
  { label: "Corporate events", icon: Building2 },
  { label: "Stage backdrops", icon: Theater },
  { label: "Room dividers", icon: Layers },
  { label: "Blackout drape", icon: Moon },
] as const;

const estimateImage = {
  src: `${imagePaths.gallery}/event-room-transformation-draping-01.jpg`,
  alt: "Grand ballroom transformed with luxury event draping for a Montreal rental estimate",
};

export function EstimateIntroSection() {
  return (
    <div
      className={cn(
        "relative mb-8 overflow-hidden rounded-[min(var(--radius-4xl),24px)]",
        "border border-border/40 bg-card/25 shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-foreground/5 sm:mb-10"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_50%,rgba(212,175,55,0.1),transparent_55%)]"
        aria-hidden
      />

      <div className="relative grid lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col justify-center gap-6 p-6 sm:p-8 lg:p-10">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
              Guided estimate · Montreal
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Tell us your vision. We&apos;ll shape the drape plan.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Walk through six quick steps — event details, drape goals,
              measurements, fabric direction, and add-ons — and we&apos;ll build
              a thoughtful pipe and drape rental brief for our team. No final
              pricing yet; just clarity before your Montreal event.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {estimateFocusAreas.map(({ label, icon: Icon }) => (
              <Badge
                key={label}
                variant="outline"
                className="h-auto gap-1.5 border-primary/20 bg-primary/5 py-1.5 pr-3 pl-2 text-foreground"
              >
                <Icon className="size-3.5 text-primary" />
                {label}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-5 sm:grid-cols-4">
            {trustProcessItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-background/30 px-2 py-3 text-center"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="size-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:text-[11px]">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[240px] lg:min-h-full">
          <div className="absolute inset-0 lg:inset-y-0 lg:left-6 lg:right-0">
            <Image
              src={estimateImage.src}
              alt={estimateImage.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20 lg:bg-gradient-to-r lg:from-card/95 lg:via-black/50 lg:to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(212,175,55,0.18),transparent_55%)]" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
          </div>

          <div className="relative flex h-full min-h-[240px] flex-col justify-end p-6 sm:p-8 lg:absolute lg:inset-0 lg:justify-end lg:p-10">
            <div className="max-w-sm rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md sm:p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                Full-service rental
              </p>
              <p className="mt-2 font-heading text-lg font-medium text-foreground">
                Delivery, installation, and strike included
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                When you book with The Curtain Guy, your estimate covers the
                complete event drape experience — not just fabric on a rack.
              </p>
              <div className="mt-4 flex items-center gap-3 text-primary/90">
                <Package className="size-4 shrink-0" />
                <Truck className="size-4 shrink-0" />
                <Wrench className="size-4 shrink-0" />
                <RotateCcw className="size-4 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

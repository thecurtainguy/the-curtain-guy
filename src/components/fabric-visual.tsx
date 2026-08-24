import { cn } from "@/lib/utils";

const FOLD_COUNT = 11;

type FabricVisualProps = {
  className?: string;
  variant?: "default" | "hero";
};

export function FabricVisual({
  className,
  variant = "default",
}: FabricVisualProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl",
        isHero
          ? "aspect-[4/5] min-h-[320px] sm:min-h-[380px] lg:min-h-[440px] lg:max-w-lg"
          : "aspect-[4/5] max-w-md",
        "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]",
        className
      )}
      aria-hidden
    >
      {/* Ambient stage glow */}
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,rgba(212,175,106,0.28),transparent_48%)]",
          isHero && "opacity-100"
        )}
      />

      {/* Primary spotlight — stronger on hero */}
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_35%_12%,rgba(212,175,106,0.55),transparent_40%)]",
          isHero && "opacity-100"
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_22%,rgba(255,230,180,0.18),transparent_38%)]" />

      {/* Base velvet depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060504] via-[#100e0c] to-[#1e1916]" />

      {/* Fabric fold panels — visible vertical pleats */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: FOLD_COUNT }).map((_, i) => (
          <div
            key={i}
            className="relative h-full flex-1"
            style={{
              background: `linear-gradient(90deg,
                rgba(6,5,4,0.98) 0%,
                rgba(32,26,22,${0.65 + (i % 3) * 0.1}) 20%,
                rgba(212,175,106,${0.12 + (i % 2) * 0.08}) 48%,
                rgba(24,20,17,0.9) 75%,
                rgba(5,4,3,0.99) 100%)`,
            }}
          >
            <div
              className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-white/[0.09] to-transparent"
              style={{ opacity: i % 2 === 0 ? 1 : 0.55 }}
            />
          </div>
        ))}
      </div>

      {/* Diagonal sheen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />

      {/* Stage floor */}
      <div className="absolute inset-x-0 bottom-[22%] h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-[rgba(212,175,106,0.14)] via-[rgba(12,10,9,0.7)] to-transparent" />

      {/* Champagne lower glow */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[rgba(212,175,106,0.28)] via-[rgba(212,175,106,0.08)] to-transparent" />

      {/* Venue transformation card */}
      <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-white/15 bg-black/55 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:bottom-6 sm:left-5 sm:right-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
          Venue Transformation
        </p>
        <p className="mt-1.5 text-sm font-medium text-foreground">
          Full perimeter draping
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Champagne velvet • Stage backdrop • Room dividers
        </p>
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full bg-primary/30"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* Edge vignette — lighter on hero so folds stay visible */}
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.5)_100%)]",
          isHero && "bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.42)_100%)]"
        )}
      />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
    </div>
  );
}

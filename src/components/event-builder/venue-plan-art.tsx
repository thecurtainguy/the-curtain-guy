import type { StudioPoint } from "@/data/studio";
import type { StudioVenuePreset } from "@/data/studio-venue-presets";
import { createLShapeRoom, createRectangleRoom, getStudioBounds } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";

export function venuePresetFloor(preset: StudioVenuePreset): StudioPoint[] {
  if (preset.shape === "custom" && preset.floor) return preset.floor;
  if (preset.shape === "l_shape") {
    return createLShapeRoom(
      preset.width,
      preset.length,
      preset.cutoutWidth ?? preset.width / 2,
      preset.cutoutDepth ?? preset.length / 2
    );
  }
  return createRectangleRoom(preset.width, preset.length);
}

/** Gold floor-outline sketch used on room / venue tiles. */
export function FloorOutlineArt({
  floor,
  className,
}: {
  floor: readonly StudioPoint[];
  className?: string;
}) {
  const bounds = getStudioBounds(floor as StudioPoint[]);
  const size = Math.max(bounds.width, bounds.depth);
  const pad = size * 0.12;
  const d =
    floor.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.z}`).join(" ") +
    " Z";
  return (
    <svg
      viewBox={`${bounds.minX - pad} ${bounds.minZ - pad} ${bounds.width + pad * 2} ${bounds.depth + pad * 2}`}
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <path
        d={d}
        fill="color-mix(in oklch, var(--primary) 12%, transparent)"
        stroke="var(--primary)"
        strokeOpacity={0.85}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Venue preset tile art: the preset's atmospheric backdrop plus its floor outline. */
export function VenuePlanArt({ preset }: { preset: StudioVenuePreset }) {
  return (
    <span className="absolute inset-0 block" style={{ background: preset.backdrop }}>
      <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
      <span className="absolute inset-y-3 left-1/2 block w-24 -translate-x-1/2">
        <FloorOutlineArt floor={venuePresetFloor(preset)} />
      </span>
    </span>
  );
}

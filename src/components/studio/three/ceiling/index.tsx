"use client";

import type { StudioDesignJson } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { CeilingFabricLayer } from "./fabric-layer";
import { CeilingLightsLayer } from "./lights-layer";

/** Ceiling drape designs: fabric plus their string lights and washes. */
export function StudioCeilingDrapes({
  design,
  bounds,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
}) {
  return (
    <>
      <CeilingFabricLayer design={design} bounds={bounds} />
      <CeilingLightsLayer design={design} bounds={bounds} />
    </>
  );
}

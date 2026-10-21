"use client";

import type { StudioDesignJson } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";

/**
 * Invisible pick proxies + gizmos for selecting, dragging, rotating and
 * sliding items directly in the 3D scene.
 */
export function StudioManipulationLayer(props: {
  design: StudioDesignJson;
  bounds: StudioBounds;
}) {
  void props;
  return null;
}

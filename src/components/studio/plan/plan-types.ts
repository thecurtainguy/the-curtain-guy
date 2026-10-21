import type { StudioDesignJson, StudioPoint } from "@/data/studio";

/**
 * Props every 2D plan layer receives from the plan canvas. Layers render SVG
 * in plan inches (x → right, z → down) inside the zoomed/panned viewport and
 * use `useStudioEditor()` for commit/preview/transactions/selection/settings.
 */
export type PlanLayerProps = {
  design: StudioDesignJson;
  /** Converts a client pointer position to plan inches (zoom/pan aware). */
  toPlanPoint: (event: { clientX: number; clientY: number }) => StudioPoint | null;
  /** Screen pixels per plan inch at the current zoom. */
  pixelsPerInch: number;
  /** Handle radius in plan inches, already compensated for zoom. */
  handleRadius: number;
  /** Base label font size in plan inches, already compensated for zoom. */
  labelSize: number;
};

import type { StudioDesignJson, StudioPoint } from "@/data/studio";
import type { SmartGuide } from "./smart-guides";
import type { PlanRect } from "./viewport";

/** Live readout shown while dragging (pill, smart guides, wall distances). */
export type PlanDragFeedback = {
  label: string;
  mode: string;
  guides: SmartGuide[];
  /** Box to measure wall distances from; null hides them. */
  box: PlanRect | null;
  angleLabel: string | null;
};

/**
 * Props every 2D plan layer receives from the plan canvas. Layers render SVG
 * in plan inches (x → right, z → down) inside the zoomed/panned viewport and
 * use the narrow editor hooks (`useStudioEditorActions`, `useStudioSelection`,
 * `useStudioSettings`) — never the full `useStudioEditor()`, which re-renders
 * on every drag frame.
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

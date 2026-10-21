import {
  getStudioObjectOption,
  type DrapeColor,
  type GenericStudioObjectFinish,
  type StudioObject,
} from "@/data/studio";
import type { StudioQuality } from "../../editor/studio-editor-context";

/** Every model renders in object-local FEET; the parent group positions it. */
export type ModelProps = {
  object: StudioObject;
  /** Footprint width (local X), feet. */
  w: number;
  /** Footprint depth (local Z), feet. */
  d: number;
  /** Object height, feet. */
  h: number;
  quality: StudioQuality;
};

export function resolveLinen(object: StudioObject): DrapeColor | null {
  if (object.linenColor === null) return null;
  return object.linenColor ?? getStudioObjectOption(object.type)?.linenColor ?? null;
}

export function genericFinish(
  object: StudioObject
): GenericStudioObjectFinish | undefined {
  if (object.type === "dance_floor") return undefined;
  return (object.finish ??
    getStudioObjectOption(object.type)?.finish) as GenericStudioObjectFinish | undefined;
}

export const isDetailed = (quality: StudioQuality) => quality !== "draft";

"use client";

import { useThree } from "@react-three/fiber";
import { getStudioMaterials, type StudioDesignJson } from "@/data/studio";
import { getStudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import {
  DEFAULT_STUDIO_EDITOR_SETTINGS,
  useOptionalStudioEditor,
} from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import { StudioCameraControls } from "./camera-controls";
import { StudioCeilingDrapes } from "./ceiling";
import { StudioDrapes } from "./drapes";
import { getStudioQualityPreset } from "./engine-quality";
import { LIGHTING_MOODS } from "./lighting-moods";
import { StudioManipulationLayer } from "./manipulation-layer";
import { StudioObjects } from "./objects";
import { StudioPostProcessing } from "./post-processing";
import { StudioSceneEnvironment } from "./scene-environment";
import { StudioSceneLighting } from "./scene-lighting";
import { StudioTreatments } from "./treatments";
import { StudioVenue } from "./venue";
import { useCameraInsideRoom } from "./venue/camera-inside-store";

export function RoomScene({
  design,
  selection,
  onSelect,
  darkTheme,
}: {
  design: StudioDesignJson;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  darkTheme: boolean;
}) {
  const bounds = useMemo(
    () => getStudioBounds(design.room.floor),
    [design.room.floor]
  );
  const editor = useOptionalStudioEditor();
  const settings = editor?.settings ?? DEFAULT_STUDIO_EDITOR_SETTINGS;
  const preset = getStudioQualityPreset(settings.quality);
  const materials = getStudioMaterials(design);
  const mood = materials.lighting;
  const invalidate = useThree((state) => state.invalidate);
  const inside = useCameraInsideRoom();
  const moodBloom = LIGHTING_MOODS[mood].bloom;
  /* Eye level sits close to the lenses and practicals: let them glow a touch more. */
  const bloom = useMemo(
    () =>
      inside
        ? {
            strength: moodBloom.strength * 1.2,
            radius: Math.min(0.9, moodBloom.radius * 1.08),
            threshold: moodBloom.threshold,
          }
        : moodBloom,
    [inside, moodBloom]
  );

  useEffect(() => {
    invalidate();
  }, [darkTheme, design, invalidate, selection, settings]);

  return (
    <>
      <StudioSceneEnvironment
        mood={mood}
        darkTheme={darkTheme}
        bounds={bounds}
        wallHeight={design.room.wallHeight}
      />
      <StudioSceneLighting
        design={design}
        bounds={bounds}
        mood={mood}
        preset={preset}
        layers={settings.layers}
      />

      <StudioVenue
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
      />
      <StudioDrapes
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
      />
      <StudioTreatments
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
      />
      <StudioCeilingDrapes design={design} bounds={bounds} />
      <StudioObjects
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
        darkTheme={darkTheme}
      />
      <StudioManipulationLayer design={design} bounds={bounds} />
      <StudioCameraControls design={design} bounds={bounds} />
      {preset.bloom || preset.ao || preset.smaa ? (
        <StudioPostProcessing
          preset={preset}
          bloom={bloom}
        />
      ) : null}
    </>
  );
}

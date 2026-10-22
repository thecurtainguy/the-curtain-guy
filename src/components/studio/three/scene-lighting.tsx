"use client";

import {
  getStudioMaterials,
  type StudioDesignJson,
  type StudioLightingMood,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { StudioLayerKey } from "../editor/studio-editor-context";
import {
  allocateStudioSpots,
  buildStudioLightRig,
  getLightPoolSize,
  getSceneLightBudgets,
  getStudioLightObjectsKey,
  parseStudioLightObjectsKey,
  type StudioPracticalLight,
  type StudioSpotAssignment,
} from "./engine-light-rig";
import type { StudioQualityPreset } from "./engine-quality";
import {
  buildFixtureBatches,
  getPracticalColor,
  StudioFixtureInstances,
} from "./lighting/fixture-instances";
import { additiveOptions, getGlowTexture } from "./lighting/fixture-textures";
import { fitKeyShadowCamera } from "./lighting/key-shadow";
import { LIGHTING_MOODS, type StudioLightingRig } from "./lighting-moods";
import { requestStudioShadowUpdate } from "./shadow-refresh";
import { useCameraInsideRoom } from "./venue/camera-inside-store";

const SCALE = 1 / 12;
/** Candela for one uplight fixture at uplightBoost 1. */
const UPLIGHT_CANDELA = 115;
/** Candela for a 3 ft chandelier at practicalBoost 1. */
const CHANDELIER_CANDELA = 60;
const NO_RAYCAST = () => null;
const NO_AO_USER_DATA = { noAO: true };
/* At eye level the overhead key reads as a sun glint on glossy floors; the hemisphere fill carries the room instead. */
const INTERIOR_KEY_SCALE = 0.5;
/* Light bounced off the floor; without it a closed ceiling reads pitch black from below. */
const INTERIOR_BOUNCE_SCALE = 0.16;
/* Draft keeps one per-pixel directional: fill folds into the hemisphere sky, bounce into its ground. */
const FILL_TO_SKY = 0.8;
const BOUNCE_TO_GROUND = 0.7;
/** Feet of shadow coverage beyond the room box. */
const SHADOW_MARGIN = 2;
/** World-space (feet) depth bias; the normalised bias is derived from the fitted depth range. */
const SHADOW_DEPTH_BIAS = 0.042;

function useDisposable<T extends { dispose: () => void }>(value: T) {
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Base rig: key (shadowed, fitted to the room), fill, bounce, ambient */
/* ------------------------------------------------------------------ */

function StudioBaseLights({
  rig,
  bounds,
  wallHeight,
  preset,
}: {
  rig: StudioLightingRig;
  bounds: StudioBounds;
  wallHeight: number;
  preset: StudioQualityPreset;
}) {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  /* Walls and ceiling cast no shadows, so the key still reaches the room when it is closed. */
  const inside = useCameraInsideRoom();
  const compact = preset.directionalLights === 1;
  const castShadow = preset.shadows;
  const halfWidth = (bounds.width * SCALE) / 2;
  const halfDepth = (bounds.depth * SCALE) / 2;
  const height = wallHeight * SCALE;
  const distance = Math.hypot(halfWidth, halfDepth) + height + 30;
  const keyPosition = useMemo(() => {
    const azimuth = THREE.MathUtils.degToRad(rig.key.azimuth);
    const elevation = THREE.MathUtils.degToRad(rig.key.elevation);
    return new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation)
    ).multiplyScalar(distance);
  }, [distance, rig.key.azimuth, rig.key.elevation]);

  const hemisphere = useMemo(() => {
    const scale = rig.hemisphere.intensity * (inside ? rig.interior.fill : 1);
    const sky = new THREE.Color(rig.hemisphere.sky).multiplyScalar(scale);
    const ground = new THREE.Color(rig.hemisphere.ground).multiplyScalar(scale);
    if (compact) {
      sky.add(
        new THREE.Color(rig.fill.color).multiplyScalar(
          rig.fill.intensity * FILL_TO_SKY
        )
      );
      if (inside) {
        ground.add(
          new THREE.Color(rig.key.color).multiplyScalar(
            rig.key.intensity * INTERIOR_BOUNCE_SCALE * BOUNCE_TO_GROUND
          )
        );
      }
    }
    return { sky, ground };
  }, [compact, inside, rig]);

  useEffect(() => {
    const light = keyRef.current;
    if (!light) return;
    const shadow = light.shadow;
    if (castShadow) {
      const shadowCamera = shadow.camera;
      fitKeyShadowCamera(
        shadowCamera,
        keyPosition,
        { halfWidth, halfDepth, height },
        SHADOW_MARGIN
      );
      if (shadow.mapSize.x !== preset.shadowMapSize) {
        shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
        shadow.map?.dispose();
        shadow.map = null;
      }
      shadow.radius = preset.shadowRadius;
      shadow.bias = -SHADOW_DEPTH_BIAS / (shadowCamera.far - shadowCamera.near);
      shadow.normalBias = 0.035;
      shadow.intensity = rig.key.shadowIntensity;
    } else if (shadow.map) {
      shadow.map.dispose();
      shadow.map = null;
    }
    requestStudioShadowUpdate(gl);
    invalidate();
  }, [
    castShadow,
    gl,
    halfDepth,
    halfWidth,
    height,
    invalidate,
    keyPosition,
    preset.shadowMapSize,
    preset.shadowRadius,
    rig.key.shadowIntensity,
  ]);

  return (
    <>
      <ambientLight color={rig.ambient.color} intensity={rig.ambient.intensity} />
      <hemisphereLight
        color={hemisphere.sky}
        groundColor={hemisphere.ground}
        intensity={1}
      />
      <directionalLight
        ref={keyRef}
        position={keyPosition}
        color={rig.key.color}
        intensity={rig.key.intensity * (inside ? INTERIOR_KEY_SCALE : 1)}
        castShadow={castShadow}
      />
      {compact ? null : (
        <>
          <directionalLight
            position={[
              -keyPosition.x * 0.8,
              keyPosition.y * 0.55,
              -keyPosition.z * 0.8,
            ]}
            color={rig.fill.color}
            intensity={rig.fill.intensity}
          />
          {/* Always mounted (0 outside) so entering the room never changes the light count. */}
          <directionalLight
            position={[keyPosition.x * 0.15, -distance, keyPosition.z * 0.15]}
            color={rig.key.color}
            intensity={inside ? rig.key.intensity * INTERIOR_BOUNCE_SCALE : 0}
          />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pooled real lights (fixed count per bucket → few shader recompiles) */
/* ------------------------------------------------------------------ */

function PooledSpot({
  assignment,
  candela,
  reach,
}: {
  assignment: StudioSpotAssignment | null;
  candela: number;
  reach: number;
}) {
  const [target] = useState(() => new THREE.Object3D());
  return (
    <>
      <primitive object={target} position={assignment?.target ?? [0, 0, 0]} />
      <spotLight
        target={target}
        position={assignment?.position ?? [0, -10, 0]}
        color={assignment?.color ?? "#ffffff"}
        intensity={assignment ? assignment.strength * candela : 0}
        angle={assignment?.angle ?? 0.5}
        penumbra={assignment?.penumbra ?? 0.8}
        decay={2}
        distance={reach}
      />
    </>
  );
}

function PooledPoint({
  light,
  rig,
  reach,
}: {
  light: StudioPracticalLight | null;
  rig: StudioLightingRig;
  reach: number;
}) {
  const color = light ? getPracticalColor(light, rig) : "#ffffff";
  const size = light ? Math.max(1, light.size / 3) : 1;
  return (
    <pointLight
      position={light?.position ?? [0, -10, 0]}
      color={color}
      intensity={
        light ? CHANDELIER_CANDELA * rig.practicalBoost * Math.pow(size, 1.2) : 0
      }
      decay={2}
      distance={reach}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Chandelier glow (cans, washes and floor pools are instanced)        */
/* ------------------------------------------------------------------ */

function ChandelierGlow({
  light,
  rig,
}: {
  light: StudioPracticalLight;
  rig: StudioLightingRig;
}) {
  const color = getPracticalColor(light, rig);
  const strength = 0.7 * rig.practicalBoost;
  const material = useDisposable(
    useMemo(
      () =>
        new THREE.SpriteMaterial(
          additiveOptions(getGlowTexture(), color, strength)
        ),
      [color, strength]
    )
  );
  const glowSize = Math.max(2.4, light.size * 2.3);
  return (
    <sprite
      material={material}
      position={light.position}
      scale={[glowSize, glowSize, 1]}
      raycast={NO_RAYCAST}
      userData={NO_AO_USER_DATA}
      renderOrder={3}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Public composition                                                  */
/* ------------------------------------------------------------------ */

/**
 * Mood rig plus every dynamic light source in the design: perimeter
 * uplighting, drape / treatment uplights, uplight objects and chandeliers.
 * Real lights are capped by the scene share of the quality budget; everything
 * else is drawn with instanced additive washes, floor pools and glows.
 */
export function StudioSceneLighting({
  design,
  bounds,
  mood,
  preset,
  layers,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  mood: StudioLightingMood;
  preset: StudioQualityPreset;
  layers: Record<StudioLayerKey, boolean>;
}) {
  /* Only light-source objects feed the rig: dragging a chair keeps this key (and the rig) stable. */
  return (
    <SceneLightingRig
      floor={design.room.floor}
      wallHeight={design.room.wallHeight}
      drapeRuns={design.drapeRuns}
      treatments={design.treatments}
      openings={design.openings}
      uplightColor={getStudioMaterials(design).uplightColor}
      lightObjectsKey={getStudioLightObjectsKey(design.objects)}
      bounds={bounds}
      mood={mood}
      preset={preset}
      layers={layers}
    />
  );
}

/** Memoized on the design slices that affect lighting; skips renders for unrelated edits. */
const SceneLightingRig = memo(function SceneLightingRig({
  floor,
  wallHeight,
  drapeRuns,
  treatments,
  openings,
  uplightColor,
  lightObjectsKey,
  bounds,
  mood,
  preset,
  layers,
}: {
  floor: StudioDesignJson["room"]["floor"];
  wallHeight: number;
  drapeRuns: StudioDesignJson["drapeRuns"];
  treatments: StudioDesignJson["treatments"];
  openings: StudioDesignJson["openings"];
  uplightColor: ReturnType<typeof getStudioMaterials>["uplightColor"];
  lightObjectsKey: string;
  bounds: StudioBounds;
  mood: StudioLightingMood;
  preset: StudioQualityPreset;
  layers: Record<StudioLayerKey, boolean>;
}) {
  const rig = LIGHTING_MOODS[mood];
  const lightObjects = useMemo(
    () => parseStudioLightObjectsKey(lightObjectsKey),
    [lightObjectsKey]
  );
  const showDrapes = layers.drapes;
  const showTreatments = layers.treatments;
  const showObjects = layers.objects;
  const lightRig = useMemo(
    () =>
      buildStudioLightRig({
        floor,
        wallHeight,
        drapeRuns,
        treatments,
        openings,
        uplightColor,
        lightObjects,
        bounds,
        layers: {
          drapes: showDrapes,
          treatments: showTreatments,
          objects: showObjects,
        },
      }),
    [
      bounds,
      drapeRuns,
      floor,
      lightObjects,
      openings,
      showDrapes,
      showObjects,
      showTreatments,
      treatments,
      uplightColor,
      wallHeight,
    ]
  );
  const budgets = getSceneLightBudgets(preset);
  const spots = useMemo(
    () => allocateStudioSpots(lightRig.fixtures, budgets.spots),
    [lightRig.fixtures, budgets.spots]
  );
  const litPracticals = useMemo(
    () =>
      [...lightRig.practicals]
        .sort((a, b) => b.size - a.size)
        .slice(0, budgets.points),
    [lightRig.practicals, budgets.points]
  );
  const fixtureBatches = useMemo(
    () => buildFixtureBatches(lightRig.fixtures, lightRig.practicals, rig),
    [lightRig, rig]
  );
  const spotPool = getLightPoolSize(spots.length, budgets.spots);
  const pointPool = getLightPoolSize(litPracticals.length, budgets.points);
  const height = wallHeight * SCALE;
  const spotReach = Math.max(28, height * 2.6);
  const pointReach = Math.max(26, height * 2.6);

  return (
    <>
      <StudioBaseLights
        rig={rig}
        bounds={bounds}
        wallHeight={wallHeight}
        preset={preset}
      />
      {Array.from({ length: spotPool }, (_, index) => (
        <PooledSpot
          key={`spot-${index}`}
          assignment={spots[index] ?? null}
          candela={UPLIGHT_CANDELA * rig.uplightBoost}
          reach={spotReach}
        />
      ))}
      {Array.from({ length: pointPool }, (_, index) => (
        <PooledPoint
          key={`point-${index}`}
          light={litPracticals[index] ?? null}
          rig={rig}
          reach={pointReach}
        />
      ))}
      <StudioFixtureInstances batches={fixtureBatches} />
      {lightRig.practicals.map((light) => (
        <ChandelierGlow key={light.key} light={light} rig={rig} />
      ))}
    </>
  );
});

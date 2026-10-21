"use client";

import type { StudioDesignJson, StudioLightingMood } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { StudioLayerKey } from "../editor/studio-editor-context";
import {
  allocateStudioSpots,
  bucketLightCount,
  buildStudioLightRig,
  type StudioPracticalLight,
  type StudioSpotAssignment,
  type StudioUplightFixture,
  type StudioWash,
} from "./engine-light-rig";
import type { StudioQualityPreset } from "./engine-quality";
import { LIGHTING_MOODS, type StudioLightingRig } from "./lighting-moods";
import { mix } from "./texture-utils";
import { useCameraInsideRoom } from "./venue/camera-inside-store";

const SCALE = 1 / 12;
/** Candela for one uplight fixture at uplightBoost 1. */
const UPLIGHT_CANDELA = 115;
/** Candela for a 3 ft chandelier at practicalBoost 1. */
const CHANDELIER_CANDELA = 60;
const NO_RAYCAST = () => null;
/* At eye level the overhead key reads as a sun glint on glossy floors; the hemisphere fill carries the room instead. */
const INTERIOR_KEY_SCALE = 0.5;
/* Light bounced off the floor; without it a closed ceiling reads pitch black from below. */
const INTERIOR_BOUNCE_SCALE = 0.16;

/* ------------------------------------------------------------------ */
/* Shared procedural textures + materials (browser-only singletons)    */
/* ------------------------------------------------------------------ */

let washTexture: THREE.CanvasTexture | null = null;
let poolTexture: THREE.CanvasTexture | null = null;
let glowTexture: THREE.CanvasTexture | null = null;

/** Uplight scallop: hot just above the can, fanning out and fading upward. */
function getWashTexture() {
  if (washTexture) return washTexture;
  const width = 128;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(width, height);
    for (let py = 0; py < height; py += 1) {
      const v = 1 - py / (height - 1);
      const spread = 0.1 + 0.9 * Math.pow(v, 0.62);
      const rise = THREE.MathUtils.smoothstep(v, 0.0, 0.07);
      const fade = Math.pow(1 - v, 0.9);
      for (let px = 0; px < width; px += 1) {
        const u = (px / (width - 1)) * 2 - 1;
        const across = Math.exp(-((u / spread) ** 2) * 2.2);
        const edge = THREE.MathUtils.smoothstep(1 - Math.abs(u), 0, 0.18);
        const value = Math.min(1, across * edge * rise * (0.18 + 0.82 * fade));
        const index = (py * width + px) * 4;
        const level = Math.round(value * 255);
        image.data[index] = level;
        image.data[index + 1] = level;
        image.data[index + 2] = level;
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  washTexture = new THREE.CanvasTexture(canvas);
  return washTexture;
}

function radialTexture(stops: Array<[number, number]>) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    for (const [offset, level] of stops) {
      const channel = Math.round(level * 255);
      gradient.addColorStop(offset, `rgb(${channel},${channel},${channel})`);
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

function getPoolTexture() {
  poolTexture ??= radialTexture([
    [0, 1],
    [0.25, 0.55],
    [0.6, 0.14],
    [1, 0],
  ]);
  return poolTexture;
}

function getGlowTexture() {
  glowTexture ??= radialTexture([
    [0, 1],
    [0.08, 0.85],
    [0.22, 0.32],
    [0.5, 0.08],
    [1, 0],
  ]);
  return glowTexture;
}

let fixtureBodyMaterial: THREE.MeshStandardMaterial | null = null;
function getFixtureBodyMaterial() {
  fixtureBodyMaterial ??= new THREE.MeshStandardMaterial({
    color: "#17171a",
    metalness: 0.65,
    roughness: 0.38,
  });
  return fixtureBodyMaterial;
}

const fixtureGeometries = {
  body: new THREE.CylinderGeometry(0.15, 0.17, 0.42, 20),
  lens: new THREE.CircleGeometry(0.125, 24),
  yoke: new THREE.BoxGeometry(0.4, 0.05, 0.32),
  pool: new THREE.PlaneGeometry(1, 1),
  wash: new THREE.PlaneGeometry(1, 1),
};

function additiveOptions(map: THREE.Texture, color: string, strength: number) {
  return {
    map,
    color: new THREE.Color(color).multiplyScalar(strength),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  };
}

function additiveMaterial(map: THREE.Texture, color: string, strength: number) {
  return new THREE.MeshBasicMaterial({
    ...additiveOptions(map, color, strength),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

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
  const invalidate = useThree((state) => state.invalidate);
  /* Walls and ceiling cast no shadows, so the key still reaches the room when it is closed. */
  const inside = useCameraInsideRoom();
  const halfDiagonal = (Math.hypot(bounds.width, bounds.depth) * SCALE) / 2;
  const height = wallHeight * SCALE;
  const span = halfDiagonal + 3;
  const distance = halfDiagonal + height + 30;
  const keyPosition = useMemo(() => {
    const azimuth = THREE.MathUtils.degToRad(rig.key.azimuth);
    const elevation = THREE.MathUtils.degToRad(rig.key.elevation);
    return new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation)
    ).multiplyScalar(distance);
  }, [distance, rig.key.azimuth, rig.key.elevation]);

  useEffect(() => {
    const light = keyRef.current;
    if (!light) return;
    const shadow = light.shadow;
    const shadowCamera = shadow.camera;
    shadowCamera.left = -span;
    shadowCamera.right = span;
    shadowCamera.top = span;
    shadowCamera.bottom = -span;
    shadowCamera.near = Math.max(0.5, distance - span - height - 6);
    shadowCamera.far = distance + span + height + 6;
    shadowCamera.updateProjectionMatrix();
    if (shadow.mapSize.x !== preset.shadowMapSize) {
      shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      shadow.map?.dispose();
      shadow.map = null;
    }
    shadow.radius = preset.shadowRadius;
    shadow.bias = -0.00035;
    shadow.normalBias = 0.035;
    shadow.intensity = rig.key.shadowIntensity;
    invalidate();
  }, [
    distance,
    height,
    invalidate,
    preset.shadowMapSize,
    preset.shadowRadius,
    rig.key.shadowIntensity,
    span,
  ]);

  return (
    <>
      <ambientLight color={rig.ambient.color} intensity={rig.ambient.intensity} />
      <hemisphereLight
        color={rig.hemisphere.sky}
        groundColor={rig.hemisphere.ground}
        intensity={rig.hemisphere.intensity * (inside ? rig.interior.fill : 1)}
      />
      <directionalLight
        ref={keyRef}
        position={keyPosition}
        color={rig.key.color}
        intensity={rig.key.intensity * (inside ? INTERIOR_KEY_SCALE : 1)}
        castShadow
      />
      <directionalLight
        position={[-keyPosition.x * 0.8, keyPosition.y * 0.55, -keyPosition.z * 0.8]}
        color={rig.fill.color}
        intensity={rig.fill.intensity}
      />
      <directionalLight
        position={[keyPosition.x * 0.15, -distance, keyPosition.z * 0.15]}
        color={rig.key.color}
        intensity={inside ? rig.key.intensity * INTERIOR_BOUNCE_SCALE : 0}
      />
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
  const color = light ? mix(light.color, rig.practicalWarmth, 0.45) : "#ffffff";
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
/* Visual fixtures: cans, wall washes, floor pools, chandelier glow    */
/* ------------------------------------------------------------------ */

function WashPlane({
  wash,
  color,
  strength,
}: {
  wash: StudioWash;
  color: string;
  strength: number;
}) {
  const material = useDisposable(
    useMemo(
      () => additiveMaterial(getWashTexture(), color, strength),
      [color, strength]
    )
  );
  return (
    <mesh
      geometry={fixtureGeometries.wash}
      material={material}
      position={wash.position}
      rotation={[0, wash.rotationY, 0]}
      scale={[wash.width, wash.height, 1]}
      raycast={NO_RAYCAST}
      userData={{ noAO: true }}
      renderOrder={2}
    />
  );
}

function FloorPool({
  position,
  radius,
  color,
  strength,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
  strength: number;
}) {
  const material = useDisposable(
    useMemo(
      () => additiveMaterial(getPoolTexture(), color, strength),
      [color, strength]
    )
  );
  return (
    <mesh
      geometry={fixtureGeometries.pool}
      material={material}
      position={[position[0], position[1] + 0.02, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[radius * 2, radius * 2, 1]}
      raycast={NO_RAYCAST}
      userData={{ noAO: true }}
      renderOrder={2}
    />
  );
}

function UplightCan({
  fixture,
  boost,
}: {
  fixture: StudioUplightFixture;
  boost: number;
}) {
  const lensMaterial = useDisposable(
    useMemo(
      () =>
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(fixture.color).multiplyScalar(3.2 + boost * 2.4),
        }),
      [boost, fixture.color]
    )
  );
  return (
    <group position={fixture.position} rotation={[0, fixture.yaw, 0]}>
      <mesh
        geometry={fixtureGeometries.yoke}
        material={getFixtureBodyMaterial()}
        position={[0, 0.025, 0]}
        raycast={NO_RAYCAST}
        receiveShadow
      />
      <group position={[0, 0.2, 0]} rotation={[0.52, 0, 0]}>
        <mesh
          geometry={fixtureGeometries.body}
          material={getFixtureBodyMaterial()}
          raycast={NO_RAYCAST}
          castShadow
        />
        <mesh
          geometry={fixtureGeometries.lens}
          material={lensMaterial}
          position={[0, 0.212, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={NO_RAYCAST}
        />
      </group>
    </group>
  );
}

function UplightFixture({
  fixture,
  rig,
}: {
  fixture: StudioUplightFixture;
  rig: StudioLightingRig;
}) {
  const boost = rig.uplightBoost;
  return (
    <>
      {fixture.renderCan ? <UplightCan fixture={fixture} boost={boost} /> : null}
      {fixture.wash ? (
        <WashPlane
          wash={fixture.wash}
          color={fixture.color}
          strength={0.58 * boost}
        />
      ) : null}
      <FloorPool
        position={fixture.position}
        radius={1.4}
        color={fixture.color}
        strength={0.24 * boost}
      />
    </>
  );
}

function ChandelierGlow({
  light,
  rig,
}: {
  light: StudioPracticalLight;
  rig: StudioLightingRig;
}) {
  const color = mix(light.color, rig.practicalWarmth, 0.45);
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
    <>
      <sprite
        material={material}
        position={light.position}
        scale={[glowSize, glowSize, 1]}
        raycast={NO_RAYCAST}
        userData={{ noAO: true }}
        renderOrder={3}
      />
      <FloorPool
        position={[light.position[0], 0, light.position[2]]}
        radius={Math.max(3, light.size * 2.2)}
        color={color}
        strength={0.16 * rig.practicalBoost}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Public composition                                                  */
/* ------------------------------------------------------------------ */

/**
 * Mood rig plus every dynamic light source in the design: perimeter
 * uplighting, drape / treatment uplights, uplight objects and chandeliers.
 * Real lights are capped by the quality budget; everything else is drawn
 * with additive washes, floor pools and bloom-friendly glows.
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
  const rig = LIGHTING_MOODS[mood];
  const wallHeight = design.room.wallHeight;
  const lightRig = useMemo(
    () => buildStudioLightRig({ design, bounds, layers }),
    [bounds, design, layers]
  );
  const spots = useMemo(
    () => allocateStudioSpots(lightRig.fixtures, preset.spotBudget),
    [lightRig.fixtures, preset.spotBudget]
  );
  const litPracticals = useMemo(
    () =>
      [...lightRig.practicals]
        .sort((a, b) => b.size - a.size)
        .slice(0, preset.pointBudget),
    [lightRig.practicals, preset.pointBudget]
  );
  const spotPool = bucketLightCount(spots.length, 4, preset.spotBudget);
  const pointPool = bucketLightCount(litPracticals.length, 2, preset.pointBudget);
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
      {lightRig.fixtures.map((fixture) => (
        <UplightFixture key={fixture.key} fixture={fixture} rig={rig} />
      ))}
      {lightRig.practicals.map((light) => (
        <ChandelierGlow key={light.key} light={light} rig={rig} />
      ))}
    </>
  );
}

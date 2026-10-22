"use client";

import type { StudioLightingMood } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { LIGHTING_MOODS, type StudioLightingRig } from "./lighting-moods";
import { mix, rng } from "./texture-utils";
import { useCameraInsideRoom } from "./venue/camera-inside-store";

const SCALE = 1 / 12;
/** Light + dark backdrop for the current mood, plus room for a mood switch. */
const BACKDROP_CACHE_SIZE = 4;

/** RoomEnvironment with its softboxes and shell tinted for the mood. */
function createVenueEnvironment(tints: StudioLightingRig["environment"]) {
  const environment = new RoomEnvironment();
  const room = new THREE.Color(tints.room);
  const key = new THREE.Color(tints.key);
  const accent = new THREE.Color(tints.accent);
  const accentAlt = new THREE.Color(tints.accentAlt);
  environment.traverse((object) => {
    if (object instanceof THREE.PointLight) {
      object.color.copy(key);
      return;
    }
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material;
    if (material instanceof THREE.MeshLambertMaterial) {
      const { x, y } = object.position;
      material.emissive.copy(y >= 19 ? key : Math.abs(x) > 14 ? accent : accentAlt);
    } else if (material instanceof THREE.MeshStandardMaterial) {
      material.color.copy(room);
    }
  });
  return environment;
}

function createBackdropTexture(center: string, edge: string) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size * 0.5,
      size * 0.4,
      0,
      size * 0.5,
      size * 0.52,
      size * 0.8
    );
    gradient.addColorStop(0, center);
    gradient.addColorStop(0.5, mix(center, edge, 0.5));
    gradient.addColorStop(1, edge);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const image = context.getImageData(0, 0, size, size);
    const random = rng(1337);
    for (let index = 0; index < image.data.length; index += 4) {
      const grain = (random() - 0.5) * 3;
      image.data[index] += grain;
      image.data[index + 1] += grain;
      image.data[index + 2] += grain;
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRadialAlpha() {
  const size = 256;
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
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.35, "#bdbdbd");
    gradient.addColorStop(0.7, "#3a3a3a");
    gradient.addColorStop(1, "#000000");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Image-based lighting (PMREM of a tinted RoomEnvironment — no network
 * HDRs), the gradient backdrop, mood haze and a soft ground plane that keeps
 * the room from floating in a void. Also owns tone-mapping exposure.
 */
export const StudioSceneEnvironment = memo(function StudioSceneEnvironment({
  mood,
  darkTheme,
  bounds,
  wallHeight,
}: {
  mood: StudioLightingMood;
  darkTheme: boolean;
  bounds: StudioBounds;
  /** Inches. */
  wallHeight: number;
}) {
  const getState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const inside = useCameraInsideRoom();
  const rig = LIGHTING_MOODS[mood];
  /* From inside, windows and doors look out on a night exterior, never a grey studio sweep. */
  const palette = darkTheme || inside ? rig.background.dark : rig.background.light;
  const floorDiagonal = Math.hypot(bounds.width, bounds.depth) * SCALE;
  const diagonal = floorDiagonal + wallHeight * SCALE;

  useEffect(() => {
    const { gl, scene } = getState();
    const pmrem = new THREE.PMREMGenerator(gl);
    const environment = createVenueEnvironment(rig.environment);
    const target = pmrem.fromScene(environment, 0.035);
    environment.dispose();
    pmrem.dispose();
    scene.environment = target.texture;
    invalidate();
    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
    };
  }, [getState, invalidate, rig.environment]);

  /* The softbox studio reads as a giant glare in glossy floors from eye level. */
  const environmentIntensity = rig.environment.intensity * (inside ? 0.4 : 1);
  useEffect(() => {
    getState().scene.environmentIntensity = environmentIntensity;
    invalidate();
  }, [environmentIntensity, getState, invalidate]);

  /* Walking through a doorway flips the palette; keep the few backdrops we've painted. */
  const backdrops = useRef<Map<string, THREE.Texture> | null>(null);
  useEffect(() => {
    const cache = (backdrops.current ??= new Map());
    return () => {
      for (const texture of cache.values()) texture.dispose();
      cache.clear();
    };
  }, []);

  useEffect(() => {
    const { scene } = getState();
    const cache = (backdrops.current ??= new Map());
    const key = `${palette.center}|${palette.edge}`;
    let texture = cache.get(key);
    if (texture) {
      cache.delete(key);
    } else {
      texture = createBackdropTexture(palette.center, palette.edge);
    }
    cache.set(key, texture);
    for (const [staleKey, stale] of cache) {
      if (cache.size <= BACKDROP_CACHE_SIZE) break;
      cache.delete(staleKey);
      stale.dispose();
    }
    scene.background = texture;
    invalidate();
    return () => {
      if (scene.background === texture) scene.background = null;
    };
  }, [getState, invalidate, palette.center, palette.edge]);

  const exposure = inside ? rig.interior.exposure : rig.exposure;
  useEffect(() => {
    const { gl } = getState();
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    invalidate();
  }, [exposure, getState, invalidate]);

  const haze = darkTheme ? rig.haze : rig.haze * 0.45;
  const { fog: interiorFog, falloff } = rig.interior;
  useEffect(() => {
    /* Inside: a gentle depth fade sized to the room, so far walls recede. */
    const near = inside
      ? Math.max(8, floorDiagonal * (0.55 - falloff * 0.3))
      : diagonal * (1.3 - haze * 0.4) + 12;
    const far = inside
      ? near + Math.max(40, floorDiagonal * (6.5 - falloff * 4.5))
      : near + diagonal * (5.4 - haze * 3.4) + 40;
    const { scene } = getState();
    const fog = new THREE.Fog(inside ? interiorFog : palette.edge, near, far);
    scene.fog = fog;
    invalidate();
    return () => {
      if (scene.fog === fog) scene.fog = null;
    };
  }, [
    diagonal,
    falloff,
    floorDiagonal,
    getState,
    haze,
    inside,
    interiorFog,
    invalidate,
    palette.edge,
  ]);

  const alphaMap = useMemo(() => createRadialAlpha(), []);
  useEffect(() => () => alphaMap.dispose(), [alphaMap]);
  const groundColor = useMemo(
    () =>
      darkTheme || inside
        ? mix(palette.center, palette.edge, 0.62)
        : mix(palette.edge, "#2b241d", 0.2),
    [darkTheme, inside, palette.center, palette.edge]
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.04, 0]}
      receiveShadow
      raycast={() => null}
      userData={{ noAO: true }}
    >
      <circleGeometry args={[Math.max(40, diagonal * 2.4), 96]} />
      <meshStandardMaterial
        color={groundColor}
        roughness={0.92}
        metalness={0}
        transparent
        alphaMap={alphaMap}
        depthWrite={false}
        envMapIntensity={0.4}
      />
    </mesh>
  );
});

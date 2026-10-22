"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Pass } from "three/addons/postprocessing/Pass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { StudioQualityPreset } from "./engine-quality";
import { isStudioInteracting, subscribeStudioInteraction } from "./interaction-store";
import type { StudioLightingRig } from "./lighting-moods";
import { getStudioGovernor, subscribeStudioGovernor } from "./perf-governor";

type AnyMaterial = THREE.Material & { opacity: number };

function isExcludedFromAO(object: THREE.Object3D): boolean {
  if (object.userData.noAO) return true;
  if ((object as THREE.Sprite).isSprite) return true;
  const material = (object as THREE.Mesh).material as
    | AnyMaterial
    | AnyMaterial[]
    | undefined;
  if (!material) return false;
  const first = Array.isArray(material) ? material[0] : material;
  if (!first) return false;
  return (
    (first.transparent && first.opacity < 0.9) ||
    first.blending === THREE.AdditiveBlending ||
    first.colorWrite === false ||
    !first.depthWrite
  );
}

/**
 * GTAO that skips glass, glows, washes and invisible pick proxies (they would
 * otherwise write depth into the normal buffer), and can run at a fraction of
 * the canvas resolution.
 */
class StudioAOPass extends GTAOPass {
  resolutionScale = 1;
  private hiddenForAO: THREE.Object3D[] = [];

  setSize(width: number, height: number) {
    super.setSize(
      Math.max(1, Math.round(width * this.resolutionScale)),
      Math.max(1, Math.round(height * this.resolutionScale))
    );
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean
  ) {
    const hidden = this.hiddenForAO;
    this.scene.traverseVisible((object) => {
      if (object !== this.scene && isExcludedFromAO(object)) {
        object.visible = false;
        hidden.push(object);
      }
    });
    try {
      super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    } finally {
      for (const object of hidden) object.visible = true;
      hidden.length = 0;
    }
  }
}

/** Delay after the last orbit/drag/walk input before AO refines the frame. */
const AO_SETTLE_MS = 180;

let snapshotRendering = false;

/**
 * While on, the next rendered frames use every pass the preset has (AO even
 * mid-interaction or governed off) — for print-grade snapshots. Pair with
 * `false` right after the capture.
 */
export function setStudioSnapshotRendering(on: boolean) {
  snapshotRendering = on;
}

/**
 * EffectComposer chain — render → GTAO → bloom → output (tone map + sRGB) →
 * SMAA — that takes over rendering via a priority-1 frame callback. Works
 * with `frameloop="demand"`: it only renders when R3F schedules a frame.
 *
 * AO pauses while the user moves (`preset.aoIdleOnly`) and the governor may
 * switch AO / bloom off; both only flip `pass.enabled`, never reallocate.
 */
export const StudioPostProcessing = memo(function StudioPostProcessing({
  preset,
  bloom,
}: {
  preset: StudioQualityPreset;
  bloom: StudioLightingRig["bloom"];
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const dpr = useThree((state) => state.viewport.dpr);
  const invalidate = useThree((state) => state.invalidate);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const aoRef = useRef<StudioAOPass | null>(null);
  const bloomSettings = useRef(bloom);
  /* False while moving (and AO_SETTLE_MS after); AO renders only when settled. */
  const aoSettled = useRef(!isStudioInteracting());

  useEffect(() => {
    if (!preset.aoIdleOnly) {
      aoSettled.current = true;
      return;
    }
    let timer = 0;
    const sync = () => {
      window.clearTimeout(timer);
      if (isStudioInteracting()) {
        aoSettled.current = false;
        return;
      }
      timer = window.setTimeout(() => {
        aoSettled.current = true;
        invalidate();
      }, AO_SETTLE_MS);
    };
    aoSettled.current = !isStudioInteracting();
    const unsubscribe = subscribeStudioInteraction(sync);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [invalidate, preset.aoIdleOnly]);

  useEffect(() => subscribeStudioGovernor(() => invalidate()), [invalidate]);

  useEffect(() => {
    bloomSettings.current = bloom;
    const pass = bloomRef.current;
    if (!pass) return;
    pass.strength = bloom.strength;
    pass.radius = bloom.radius;
    pass.threshold = bloom.threshold;
    invalidate();
  }, [bloom, invalidate]);

  useEffect(() => {
    const drawingSize = gl.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(drawingSize.x, drawingSize.y, {
      type: THREE.HalfFloatType,
      samples: preset.msaaSamples,
    });
    const composer = new EffectComposer(gl, target);
    const passes: Pass[] = [];
    const add = <T extends Pass>(pass: T) => {
      composer.addPass(pass);
      passes.push(pass);
      return pass;
    };

    add(new RenderPass(scene, camera));
    if (preset.ao) {
      const ao = new StudioAOPass(scene, camera, 1, 1);
      ao.resolutionScale = preset.ao.resolutionScale;
      ao.updateGtaoMaterial({
        radius: 1.6,
        distanceExponent: 1.6,
        thickness: 1.4,
        distanceFallOff: 1,
        scale: 1.05,
        samples: preset.ao.samples,
      });
      ao.updatePdMaterial({
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 6,
        radiusExponent: 1.4,
        rings: 2,
        samples: preset.ao.denoiseSamples,
      });
      ao.blendIntensity = 0.9;
      aoRef.current = add(ao);
    }
    if (preset.bloom) {
      const { strength, radius, threshold } = bloomSettings.current;
      bloomRef.current = add(
        new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold)
      );
    }
    add(new OutputPass());
    if (preset.smaa) add(new SMAAPass());

    composer.setPixelRatio(gl.getPixelRatio());
    const size = gl.getSize(new THREE.Vector2());
    composer.setSize(size.x, size.y);
    composerRef.current = composer;
    invalidate();

    return () => {
      composerRef.current = null;
      bloomRef.current = null;
      aoRef.current = null;
      for (const pass of passes) pass.dispose();
      composer.dispose();
      invalidate();
    };
  }, [camera, gl, invalidate, preset, scene]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    invalidate();
  }, [dpr, height, invalidate, width]);

  useFrame((_, delta) => {
    const composer = composerRef.current;
    if (!composer) {
      gl.render(scene, camera);
      return;
    }
    const governor = getStudioGovernor();
    const ao = aoRef.current;
    if (ao) {
      ao.enabled = snapshotRendering || (aoSettled.current && !governor.aoOff);
    }
    const bloomPass = bloomRef.current;
    if (bloomPass) bloomPass.enabled = snapshotRendering || !governor.bloomOff;
    composer.render(delta);
  }, 1);

  return null;
});

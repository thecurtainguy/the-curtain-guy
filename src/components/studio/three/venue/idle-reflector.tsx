"use client";

import { BlurPass } from "@react-three/drei/materials/BlurPass.js";
import { MeshReflectorMaterial } from "@react-three/drei/materials/MeshReflectorMaterial.js";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { isStudioInteracting, subscribeStudioInteraction } from "../interaction-store";

/** Settled frames re-render the reflection at most this often (twinkle, AO refine). */
const IDLE_REFRESH_MS = 500;

export type IdleReflectorProps = {
  /** The floor mesh this material is attached to. */
  target: RefObject<THREE.Mesh | null>;
  map: THREE.Texture;
  normalMap: THREE.Texture;
  normalScale: THREE.Vector2;
  roughnessMap: THREE.Texture;
  envMap: THREE.Texture;
  envMapIntensity: number;
  resolution: number;
  blur: [number, number];
  mixBlur: number;
  mixStrength: number;
  mixContrast: number;
  depthScale: number;
  minDepthThreshold: number;
  maxDepthThreshold: number;
};

type Rig = {
  fbo1: THREE.WebGLRenderTarget;
  fbo2: THREE.WebGLRenderTarget;
  blurPass: BlurPass;
  material: MeshReflectorMaterial;
  textureMatrix: THREE.Matrix4;
  virtualCamera: THREE.PerspectiveCamera;
  lastCamera: THREE.Matrix4;
  lastProjection: THREE.Matrix4;
  hasReflection: boolean;
  lastRefresh: number;
  trailing: ReturnType<typeof setTimeout> | undefined;
};

function createRig(
  gl: THREE.WebGLRenderer,
  resolution: number,
  blurX: number,
  blurY: number,
  minDepthThreshold: number,
  maxDepthThreshold: number,
  depthScale: number
): Rig {
  const params = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
  };
  const fbo1 = new THREE.WebGLRenderTarget(resolution, resolution, params);
  fbo1.depthBuffer = true;
  fbo1.depthTexture = new THREE.DepthTexture(resolution, resolution);
  fbo1.depthTexture.format = THREE.DepthFormat;
  fbo1.depthTexture.type = THREE.UnsignedShortType;
  const fbo2 = new THREE.WebGLRenderTarget(resolution, resolution, params);
  const blurPass = new BlurPass({
    gl,
    resolution,
    width: blurX,
    height: blurY,
    minDepthThreshold,
    maxDepthThreshold,
    depthScale,
    depthToBlurRatioBias: 0.25,
  });
  const textureMatrix = new THREE.Matrix4();
  const material = new MeshReflectorMaterial({ roughness: 1, metalness: 0 });
  material.defines = depthScale > 0 ? { USE_BLUR: "", USE_DEPTH: "" } : { USE_BLUR: "" };
  material.tDiffuse = fbo1.texture;
  material.tDepth = fbo1.depthTexture;
  material.tDiffuseBlur = fbo2.texture;
  material.textureMatrix = textureMatrix;
  material.hasBlur = true;
  material.mixStrength = 0;
  return {
    fbo1,
    fbo2,
    blurPass,
    material,
    textureMatrix,
    virtualCamera: new THREE.PerspectiveCamera(),
    lastCamera: new THREE.Matrix4(),
    lastProjection: new THREE.Matrix4(),
    hasReflection: false,
    lastRefresh: -Infinity,
    trailing: undefined,
  };
}

const _normal = new THREE.Vector3();
const _reflectorPos = new THREE.Vector3();
const _cameraPos = new THREE.Vector3();
const _rotation = new THREE.Matrix4();
const _lookAt = new THREE.Vector3();
const _view = new THREE.Vector3();
const _target = new THREE.Vector3();
const _plane = new THREE.Plane();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();

/** Mirrors the camera about the floor plane (oblique near clip) — same math as drei. */
function placeVirtualCamera(rig: Rig, camera: THREE.Camera, mesh: THREE.Object3D): boolean {
  const { virtualCamera, textureMatrix } = rig;
  _reflectorPos.setFromMatrixPosition(mesh.matrixWorld);
  _cameraPos.setFromMatrixPosition(camera.matrixWorld);
  _rotation.extractRotation(mesh.matrixWorld);
  _normal.set(0, 0, 1).applyMatrix4(_rotation);
  _view.subVectors(_reflectorPos, _cameraPos);
  if (_view.dot(_normal) > 0) return false;
  _view.reflect(_normal).negate().add(_reflectorPos);
  _rotation.extractRotation(camera.matrixWorld);
  _lookAt.set(0, 0, -1).applyMatrix4(_rotation).add(_cameraPos);
  _target.subVectors(_reflectorPos, _lookAt).reflect(_normal).negate().add(_reflectorPos);
  virtualCamera.position.copy(_view);
  virtualCamera.up.set(0, 1, 0).applyMatrix4(_rotation).reflect(_normal);
  virtualCamera.lookAt(_target);
  virtualCamera.far = (camera as THREE.PerspectiveCamera).far ?? virtualCamera.far;
  virtualCamera.updateMatrixWorld();
  virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
  textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  textureMatrix.multiply(virtualCamera.projectionMatrix);
  textureMatrix.multiply(virtualCamera.matrixWorldInverse);
  textureMatrix.multiply(mesh.matrixWorld);
  _plane.setFromNormalAndCoplanarPoint(_normal, _reflectorPos);
  _plane.applyMatrix4(virtualCamera.matrixWorldInverse);
  _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
  const e = virtualCamera.projectionMatrix.elements;
  _q.x = (Math.sign(_clip.x) + e[8]) / e[0];
  _q.y = (Math.sign(_clip.y) + e[9]) / e[5];
  _q.z = -1;
  _q.w = (1 + e[10]) / e[14];
  _clip.multiplyScalar(2 / _clip.dot(_q));
  e[2] = _clip.x;
  e[6] = _clip.y;
  e[10] = _clip.z + 1;
  e[14] = _clip.w;
  return true;
}

function renderReflection(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  mesh: THREE.Object3D,
  rig: Rig
) {
  if (!placeVirtualCamera(rig, camera, mesh)) return;
  const xr = gl.xr.enabled;
  const shadowAuto = gl.shadowMap.autoUpdate;
  const previousTarget = gl.getRenderTarget();
  mesh.visible = false;
  gl.xr.enabled = false;
  gl.shadowMap.autoUpdate = false;
  gl.setRenderTarget(rig.fbo1);
  gl.state.buffers.depth.setMask(true);
  if (!gl.autoClear) gl.clear();
  gl.render(scene, rig.virtualCamera);
  rig.blurPass.render(gl, rig.fbo1, rig.fbo2);
  gl.xr.enabled = xr;
  gl.shadowMap.autoUpdate = shadowAuto;
  mesh.visible = true;
  gl.setRenderTarget(previousTarget);
}

/**
 * Floor reflection (drei's MeshReflectorMaterial shader) whose mirrored scene
 * pass only runs on settled frames. While orbiting / dragging, the last
 * reflection stays if the camera hasn't moved (object drags) and is hidden if
 * it has, so interactive frames never pay for a second scene render.
 */
export function IdleReflectorMaterial({
  target,
  map,
  normalMap,
  normalScale,
  roughnessMap,
  envMap,
  envMapIntensity,
  resolution,
  blur,
  mixBlur,
  mixStrength,
  mixContrast,
  depthScale,
  minDepthThreshold,
  maxDepthThreshold,
}: IdleReflectorProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const [blurX, blurY] = blur;

  const rig = useMemo(
    () => createRig(gl, resolution, blurX, blurY, minDepthThreshold, maxDepthThreshold, depthScale),
    [gl, resolution, blurX, blurY, minDepthThreshold, maxDepthThreshold, depthScale]
  );

  useEffect(
    () => () => {
      clearTimeout(rig.trailing);
      rig.fbo1.depthTexture?.dispose();
      rig.fbo1.dispose();
      rig.fbo2.dispose();
      rig.blurPass.renderTargetA.dispose();
      rig.blurPass.renderTargetB.dispose();
      rig.blurPass.convolutionMaterial.dispose();
      rig.blurPass.screen.geometry.dispose();
      rig.material.dispose();
    },
    [rig]
  );

  useEffect(
    () =>
      subscribeStudioInteraction(() => {
        if (!isStudioInteracting()) invalidate();
      }),
    [invalidate]
  );

  useFrame(({ camera }) => stepReflection(rig, gl, scene, camera, target.current, mixStrength, invalidate));

  return (
    <primitive
      object={rig.material}
      attach="material"
      map={map}
      normalMap={normalMap}
      normalScale={normalScale}
      roughnessMap={roughnessMap}
      envMap={envMap}
      envMapIntensity={envMapIntensity}
      mixBlur={mixBlur}
      mixContrast={mixContrast}
      depthScale={depthScale}
      minDepthThreshold={minDepthThreshold}
      maxDepthThreshold={maxDepthThreshold}
    />
  );
}

function stepReflection(
  rig: Rig,
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  mesh: THREE.Mesh | null,
  mixStrength: number,
  invalidate: () => void
) {
  if (!mesh) return;
  const material = rig.material;
  const cameraMoved =
    !rig.lastCamera.equals(camera.matrixWorld) ||
    !rig.lastProjection.equals(camera.projectionMatrix);
  if (isStudioInteracting()) {
    material.mixStrength = rig.hasReflection && !cameraMoved ? mixStrength : 0;
    return;
  }
  const t = performance.now();
  if (rig.hasReflection && !cameraMoved && t - rig.lastRefresh < IDLE_REFRESH_MS) {
    material.mixStrength = mixStrength;
    clearTimeout(rig.trailing);
    rig.trailing = setTimeout(invalidate, IDLE_REFRESH_MS - (t - rig.lastRefresh) + 16);
    return;
  }
  clearTimeout(rig.trailing);
  renderReflection(gl, scene, camera, mesh, rig);
  rig.lastCamera.copy(camera.matrixWorld);
  rig.lastProjection.copy(camera.projectionMatrix);
  rig.lastRefresh = t;
  rig.hasReflection = true;
  material.mixStrength = mixStrength;
}

/**
 * Tiny emissive light points (fairy LEDs, starlight pinpoints, bistro
 * filament cores) drawn as one `THREE.Points` per cloud. Each point has a
 * real world size; below `uMinPx` it is drawn at the minimum size with its
 * energy scaled down, so distant bulbs fade smoothly instead of shimmering.
 * Output is HDR and additive so bloom turns dense clouds into a soft glow.
 */
import * as THREE from "three";
import { syncTwinkleTime, twinkleTime } from "./twinkle-clock";

/** How far toward the eye points are drawn, feet. */
const SPARKLE_PULL_FEET = 0.28;
/**
 * Smallest drawn diameter, px. Under ~2px a moving point lands on one pixel
 * one frame and straddles four the next, which flickers; energy is scaled
 * down to compensate.
 */
const MIN_POINT_PX = 2.2;

const vertexShader = /* glsl */ `
  #include <common>
  attribute float aSeed;
  uniform float uSize;
  uniform float uHalfHeight;
  uniform float uMinPx;
  uniform float uTime;
  uniform float uTwinkle;
  varying float vEnergy;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    /* Points sit on an approximation of the fabric; drawing them a few
       inches toward the eye keeps real folds from swallowing them as the
       view moves (which reads as flicker). Size uses the true depth. */
    float eyeDistance = length(mvPosition.xyz);
    vec3 pulled = mvPosition.xyz * max(0.0, 1.0 - ${SPARKLE_PULL_FEET.toFixed(3)} / max(eyeDistance, 1e-3));
    gl_Position = projectionMatrix * vec4(pulled, 1.0);
    float scale = projectionMatrix[1][1] * uHalfHeight;
    float px = uSize * scale;
    if (isPerspectiveMatrix(projectionMatrix)) px /= max(0.05, -mvPosition.z);
    float drawn = max(px, uMinPx);
    gl_PointSize = drawn;
    float energy = (px * px) / (drawn * drawn);
    float level = 0.5 + 0.5 * fract(aSeed * 7.137);
    float twinkle = 1.0;
    if (uTwinkle > 0.0 && fract(aSeed * 11.31) > 0.55) {
      float speed = 0.7 + 1.9 * fract(aSeed * 3.71);
      float wave = 0.5 + 0.5 * sin(uTime * speed + aSeed * 81.7);
      twinkle = 1.0 - uTwinkle * wave * wave;
    }
    vEnergy = level * twinkle * energy;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vEnergy;

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    if (r2 > 1.0) discard;
    float core = exp(-r2 * 5.0) * (1.0 - r2);
    gl_FragColor = vec4(uColor * (vEnergy * core), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type SparkleUniforms = {
  uColor: { value: THREE.Color };
  uSize: { value: number };
  uHalfHeight: { value: number };
  uMinPx: { value: number };
  uTime: { value: number };
  uTwinkle: { value: number };
};

export type SparklePoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> & {
  material: THREE.ShaderMaterial & { uniforms: SparkleUniforms };
};

const NO_RAYCAST = () => {};
const viewport = new THREE.Vector4();

/**
 * `positions` xyz world feet, `seeds` 0..1 per point; `size` is the glowing
 * diameter in feet. Caller disposes geometry and material.
 */
export function createSparklePoints(
  positions: Float32Array,
  seeds: Float32Array,
  size: number
): SparklePoints {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  const uniforms: SparkleUniforms = {
    uColor: { value: new THREE.Color("#ffffff") },
    uSize: { value: size },
    uHalfHeight: { value: 540 },
    uMinPx: { value: MIN_POINT_PX },
    /* Shared across every cloud (see twinkle-clock). */
    uTime: twinkleTime,
    uTwinkle: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
  const points = new THREE.Points(geometry, material) as SparklePoints;
  points.raycast = NO_RAYCAST;
  /* After the ceiling fabric (2), hub décor (3) and glow pools (4). */
  points.renderOrder = 5;
  points.userData.noAO = true;
  /* Size against whatever target is being drawn (canvas or composer buffer). */
  points.onBeforeRender = (renderer) => {
    renderer.getCurrentViewport(viewport);
    uniforms.uHalfHeight.value = Math.max(1, viewport.w / 2);
    uniforms.uMinPx.value = MIN_POINT_PX * Math.max(1, renderer.getPixelRatio() * 0.75);
    if (uniforms.uTwinkle.value > 0) syncTwinkleTime();
  };
  return points;
}

/** HDR tint: `color` × `emission`. */
export function setSparkleColor(points: SparklePoints, color: string, emission: number) {
  points.material.uniforms.uColor.value.set(color).multiplyScalar(emission);
}

/** 0 = steady; > 0 = fraction of brightness twinkling points dip by. */
export function setSparkleTwinkle(points: SparklePoints, depth: number) {
  points.material.uniforms.uTwinkle.value = depth;
}

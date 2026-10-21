import * as THREE from "three";
import { makeCanvas, rng } from "../texture-utils";

const cache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/**
 * A dim, warm ballroom panorama (chandeliers + tall windows) prefiltered for
 * PBR. Used as a local envMap on glossy floors and glass so reflections read
 * as a venue regardless of the scene's global environment.
 */
export function getVenueEnvironment(gl: THREE.WebGLRenderer): THREE.Texture {
  const cached = cache.get(gl);
  if (cached) return cached;
  const rand = rng(509);
  const canvas = makeCanvas(1024, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1c1712");
    sky.addColorStop(0.32, "#3b3025");
    sky.addColorStop(0.5, "#6a5642");
    sky.addColorStop(0.56, "#3a2f25");
    sky.addColorStop(1, "#120f0c");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * (w / 8);
      g.fillStyle = "rgba(190,205,230,0.16)";
      g.fillRect(x - 12, h * 0.32, 24, h * 0.17);
    }
    for (let i = 0; i < 14; i++) {
      const x = rand() * w;
      const y = h * (0.08 + rand() * 0.18);
      const r = 14 + rand() * 22;
      const glow = g.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, "rgba(255,236,196,1)");
      glow.addColorStop(0.25, "rgba(255,210,150,0.7)");
      glow.addColorStop(1, "rgba(255,190,120,0)");
      g.fillStyle = glow;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  const source = new THREE.CanvasTexture(canvas);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(gl);
  const target = pmrem.fromEquirectangular(source);
  pmrem.dispose();
  source.dispose();
  cache.set(gl, target.texture);
  return target.texture;
}

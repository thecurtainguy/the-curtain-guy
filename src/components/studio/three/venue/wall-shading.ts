import type * as THREE from "three";
import { WALL_SHADING_ATTRIBUTE } from "./wall-geometry";

/**
 * Cheap baked-light look for wall faces: the upper wall falls off into
 * shadow toward the ceiling, inside corners and the floor line pick up soft
 * occlusion. Works on any Standard/Physical material whose geometry carries
 * the `venueWall` attribute (corner term is skipped without it). Heights are
 * world feet (wall meshes are built in world space).
 */
export function applyWallShading(
  material: THREE.MeshStandardMaterial,
  { topFt, strength }: { topFt: number; strength: number }
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVenueTop = { value: topFt };
    shader.uniforms.uVenueShade = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nattribute vec2 ${WALL_SHADING_ATTRIBUTE};\nvarying vec3 vVenueWall;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\nvVenueWall = vec3(${WALL_SHADING_ATTRIBUTE}, position.y);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uVenueTop;\nuniform float uVenueShade;\nvarying vec3 vVenueWall;"
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          float vh = clamp(vVenueWall.z / max(uVenueTop, 0.01), 0.0, 1.0);
          float topShade = smoothstep(0.45, 1.0, vh);
          float floorShade = 1.0 - smoothstep(0.0, 1.1, vVenueWall.z);
          float cornerShade = 0.0;
          if (vVenueWall.y > 0.01) {
            float cd = max(min(vVenueWall.x, vVenueWall.y - vVenueWall.x), 0.0);
            cornerShade = 1.0 - smoothstep(0.0, 3.2, cd);
            cornerShade *= cornerShade;
          }
          float shade = 1.0 - uVenueShade * (0.5 * topShade * topShade + 0.16 * floorShade + 0.32 * cornerShade);
          diffuseColor.rgb *= max(shade, 0.3);
        }`
      );
  };
  material.customProgramCacheKey = () => "venue-wall-shading";
  return material;
}

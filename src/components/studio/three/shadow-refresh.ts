/**
 * The Studio renders shadow maps on demand (`shadowMap.autoUpdate = false`):
 * the key light is fixed to the room, so orbiting never needs a new map.
 * Anything that moves, adds or removes a shadow caster calls
 * `requestStudioShadowUpdate()` and the next frame re-renders the map once.
 */
type ShadowRenderer = { shadowMap: { needsUpdate: boolean } };

let current: { gl: ShadowRenderer; invalidate: () => void } | null = null;

/** Called once by the viewer for the live renderer; returns an unregister. */
export function registerStudioShadowRenderer(gl: ShadowRenderer, invalidate: () => void) {
  const entry = { gl, invalidate };
  current = entry;
  gl.shadowMap.needsUpdate = true;
  invalidate();
  return () => {
    if (current === entry) current = null;
  };
}

/**
 * Re-render the shadow map on the next frame (and schedule that frame).
 * Safe to call from anywhere, any number of times per frame. Pass `gl` when
 * holding a specific renderer (e.g. inside an R3F component).
 */
export function requestStudioShadowUpdate(gl?: ShadowRenderer) {
  const target = gl ?? current?.gl;
  if (!target) return;
  target.shadowMap.needsUpdate = true;
  if (current && current.gl === target) current.invalidate();
}

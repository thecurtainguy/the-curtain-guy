# Studio Classic Drape Treatments — MVP Design

## Understanding

- Add classic multi-part drape treatments without replacing basic drape runs.
- Persist treatments in `design_json` and render the same data in 2D and 3D.
- Keep existing designs compatible by normalizing a missing `treatments` field to `[]`.
- Store dimensions in inches and present editing controls in feet.
- Preserve existing room, drape, opening, object, save, and reload behavior.
- Avoid cloth physics, AI, photoreal assets, database changes, and expensive lighting.

## MVP scope

Fully implement:

1. Full Pleated Backdrop
2. Side Panels with Tiebacks / Entrance Reveal
3. Top Swag / Valance
4. Ceremony Arch / Frame

Show Door/Window Surround, Layered Swag Backdrop, Floral Header, Uplights, and advanced variants as disabled “Coming soon” entries.

## Architecture

`StudioDesignJson` gains a wall-anchored `treatments` array. A dedicated treatment module owns preset metadata, defaults, normalization, clamping, labels, and shared helpers. The existing Studio designer remains the state owner. Selection gains a treatment variant, and the right inspector edits treatment data directly.

The 2D SVG renderer and Three.js treatment renderer independently derive their visual parts from the same `StudioTreatment` object. No secondary scene graph is persisted.

## Rendering

- Backdrop: bounded procedural pleated surface.
- Side tiebacks / entrance reveal: tapered side-panel surfaces with small tie bands and an optional simple backdrop.
- Top swag: a low-segment curved fabric band.
- Ceremony arch: a simple frame, side drape panels, and top swag.

2D treatments use wall-aligned SVG marks, center gaps, curved swag symbols, portal outlines, and gold selection treatment. Positioning is inspector-driven in this pass.

## Performance and reliability

- Preserve the demand-rendered Three.js scene.
- Memoize and dispose custom geometry.
- Cap geometry segments and avoid real uplights or complex floral meshes.
- Clamp treatments when room dimensions or wall assignments change.
- Keep the existing payload limit and validate all treatment fields.

## Verification

- Validate legacy designs with no treatment array.
- Exercise creation, selection, editing, duplication, deletion, and room-resize clamping.
- Confirm all four MVP treatments appear in both 2D and 3D.
- Confirm save payload validation and reload normalization.
- Run `git diff --check`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.
- Run a local browser smoke test when the app can start with available environment configuration.

## Decision log

- Use a dedicated treatment domain instead of extending basic drape runs.
- Use wall anchors only for V1; opening effects occupy a span on a wall.
- Timebox this pass to four working presets and five non-functional placeholders.
- Defer direct treatment dragging and resize handles.
- Prefer lightweight, believable approximations over detailed realism.
- Make no database migration, database push, auth/API-security change, commit, or deployment.

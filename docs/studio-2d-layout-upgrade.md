# Studio 2D Layout Upgrade

## Understanding

- `StudioDesignJson` remains the only persisted design document and the source for both 2D and 3D.
- Rectangle rooms receive polished corner and edge resizing.
- L-shape room handles are included only where the existing template dimensions can remain valid and wall-indexed items can be reclamped.
- Custom rooms remain Beta and form-driven; polygon point editing is out of scope.
- Event objects support visual selection, movement, resizing, rotation controls, deletion, and duplication.
- The implementation remains dependency-free and does not change the database, API, authentication, or authorization.
- Stability and geometry reliability take precedence over decorative interaction.

## Assumptions

- Design coordinates and dimensions remain inches.
- Grid snapping defaults to 12 inches; Shift temporarily bypasses snapping.
- Drag metadata is transient component state and is never persisted.
- Normal object deletion does not require confirmation.
- Room and object interactions target smooth 60 FPS, with simple geometry favored when needed.
- Objects may show an out-of-room warning instead of using expensive rotated-polygon collision enforcement.

## Architecture

`StudioDesigner` continues to own the canonical `StudioDesignJson`. `Studio2DEditor` renders the SVG and owns pointer capture and the transient drag lifecycle. Pure helpers convert, snap, clamp, and apply room/object interactions. Every accepted pointer update produces a new `StudioDesignJson` through the existing `onChange` callback.

Rectangle room handles update template dimensions through the existing room geometry path so floor points, drapes, and openings remain synchronized. L-shape handles use the same guarded template dimensions. Custom room floor points are not directly edited.

The existing object array is extended with optional type-specific properties that preserve compatibility with saved V1 objects. The right rail edits those same object records. The 3D scene remains passive and renders clean type-specific geometry and procedural finishes directly from the document.

## Interaction behavior

- Pointer events use SVG coordinates derived from the current `viewBox`.
- Pointer capture prevents interrupted drags when the pointer leaves a handle.
- Object movement selects on pointer down and updates `x`/`z`.
- Rectangular objects expose four corner resize handles; circular tables expose a diameter handle.
- Rotation uses reliable ±15° and reset controls in the inspector.
- Rectangle rooms expose four corners and four edge handles.
- L-shape exposes guarded outer dimensions and cutout controls only.
- Dimensions update continuously while dragging and use the same formatter as existing wall labels.
- Keyboard Escape clears selection; Delete/Backspace removes a selected object only when focus is not in an editable control.

## Object model

The library includes stage, dance floor, entrance marker, round table, rectangle table, cocktail table, table area, DJ/tech booth, bar, and lounge area. Common persisted fields remain label, position, width, depth, height, and rotation. Optional fields include notes, finish, and seating count.

Dance floor finishes are white gloss, black gloss, checkerboard, warm parquet, oak, dark wood, neutral event carpet, LED/starlit placeholder, and custom wrap/monogram placeholder.

## Performance and reliability

- No canvas/editor dependency.
- Pure helpers avoid DOM reads beyond SVG coordinate conversion.
- Derived walls, bounds, and handle geometry are memoized.
- 3D keeps demand rendering.
- Pointer updates use React state as the canonical live design, avoiding a second synchronized model.
- Geometry minimums and existing validators prevent negative or inverted dimensions.

## Validation

Manual acceptance covers rectangle resizing, object add/move/resize/rotate, dance-floor finishes, 2D/3D synchronization, drape preservation, and save/reload. Final gates are:

1. `git diff --check`
2. `pnpm lint`
3. `pnpm exec tsc --noEmit`
4. `pnpm build`

No commit is created before Benny approves.

## Decision log

1. Manual SVG interactions were chosen over Konva/Fabric/React Flow to preserve bundle size and the current architecture.
2. Interaction math is extracted from rendering so geometry remains testable and maintainable.
3. Drag state stays transient; only resulting design values enter `StudioDesignJson`.
4. Custom polygon editing is deferred to protect polygon validity and wall-indexed drapes/openings.
5. L-shape direct manipulation is conditional on stable template-dimension updates.
6. Rotation uses inspector controls for V1 reliability instead of a freehand rotation gesture.

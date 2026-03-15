# CAD Georeferencer

## Current State
Full-stack DXF georeferencing tool with split-screen CAD viewer (left) and MapLibre GL JS map (right). MapViewer.tsx (1389 lines) contains all map logic including Move/Rotate/Scale manual tools, rubber-sheeting via TPS, GeoJSON overlay via dxf-source/dxf-layer, color picker, basemap selector, and orange SVG markers with white halos. The toolbar in the map panel has Move, Rotate, and Scale buttons but lacks a Lock Scale toggle. The Rotate tool uses raw angle math without a degrees wheel UI. The Scale tool has no bounding box visualization.

## Requested Changes (Diff)

### Add
- **Lock Scale toggle** in the map panel top toolbar (starts ON). When ON: disable rubber-sheeting/TPS logic entirely, enforce uniform affine transformation only (scale W and H by same ratio). State stored in React state and a ref for access inside event handlers.
- **Degrees Wheel UI** rendered as a Canvas overlay (or SVG) centered on the yellow pivot point when the Rotate tool is active. The wheel is a circle with tick marks. Drag right = clockwise rotation, drag left = counter-clockwise. Show a small tooltip near the cursor displaying the current angle like "45.2°" while dragging.
- **Scale Bounding Box** rendered as an SVG overlay over the map container when the Scale tool is active. Orange (#FF8C00) outline around the DXF geometry extents (computed from currentGeojsonRef). Eight square handles: 4 corners (NW, NE, SE, SW) + 4 mid-points (N, S, E, W). Dragging a handle scales from the opposite corner/edge. Box syncs with every move/rotate update via requestAnimationFrame.
- **requestAnimationFrame loop** for bounding box and rotation wheel rendering updates during active tool interactions.

### Modify
- **MapViewer toolbar** - add Lock Scale toggle button (lock icon, starts active/ON) alongside Move/Rotate/Scale buttons.
- **Rubber-sheeting logic** (marker drag and map mousedown "point-rubber" mode) - check lockScale ref before applying TPS; if locked, skip TPS and use affine-only buildBaseGeoJson with computeAffine.
- **buildRubberSheetGeoJson** - accept a `lockScale: boolean` param; if true, use affine only.
- **Scale drag logic** - currently uses a pivot-based uniform scale. With the bounding box, dragging a corner handle scales from the opposite corner. Mid-point handles scale only one axis (but still uniform if lockScale is ON).
- **Rotate drag** - show degrees wheel SVG when rotate tool is active + dragging. Update tooltip position to follow cursor.
- **All transformation render updates** - wrap pushGeojson calls inside requestAnimationFrame where they occur in mousemove handlers.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `lockScale` state + ref to MapViewer. Add Lock icon button to the map toolbar panel.
2. Thread `lockScale` through rubber-sheeting calls: when ON, call `buildBaseGeoJson(dxf, makeAffineTransformFn(computeAffine(pts)))` instead of TPS.
3. Implement `ScaleBoundingBox` component: SVG absolutely positioned over the map container, rendered only when scale tool is active. Computes bbox from currentGeojsonRef (project geo coords to screen via map.project). Eight drag handles. Dragging a corner sets scale pivot to opposite corner and applies turf.transformScale. Uses requestAnimationFrame for smooth updates.
4. Implement `RotationWheel` component: SVG circle centered on pivot screen position, with 36 tick marks, rendered only when rotate tool is active. Captures mousedown on the wheel to initiate rotation drag. Tooltip div tracks cursor with current angle.
5. Ensure all mousemove pushGeojson calls use requestAnimationFrame (rAF-throttle the push).
6. All markers remain orange (#FF8C00) with white halo stroke - already correct, no change needed.

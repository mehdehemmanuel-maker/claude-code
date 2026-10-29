# Rebuilding the user's own object from photographs

What the user asked (2026-10-29, kept in CLAUDE.md): reconstruct the actual object, not a plausible one; a closed loop of
image → geometry → CAD → render → compare → correct; observed, measured, inferred and unknown kept apart; discrepancies
and ambiguities reported, never claimed away; everything as nodes; audit and reuse before building.

## The audit (what was there, what was missing)

| Needed | Was there | Done |
| --- | --- | --- |
| Images as data | nothing (no decoder in the dependencies) | `decodePng` on `fflate`'s inflate (already a dependency); photographs in `view/public/photos/` (palette PNGs, 2.5 MB for five) |
| Features | nothing; lines had been read off photographs by hand (by eye, on a grid, outside the app) | marks kept as data (`photo-marks.ts`, who marked them and how); Sobel gradient; each mark snapped to its strongest nearby edge, said measured only where an edge was found |
| A camera | nothing outside the viewer's | a pinhole camera; resection from points the published figures fix (wheel centres, tyre edges), solved by a new `minimize` (Nelder–Mead) in `numeric.ts`; from several starts, and the spread of cameras that fit as well reported |
| Render from the photograph's camera | the viewer (WebGL, a page) | `silhouette`: the viewer's own triangles (`kit3d.ts` `geometry`, now exported) projected and filled in software, so it runs in a node and under the tests |
| Compare | nothing | IoU, and signed outline error at each traced point by region (pixels and mm at the thing's distance), by a chamfer distance transform |
| Correct | the body maker drives everything from its line figures (`Lines`, `panels.ts`): reused as the parametric model | `fitFigures`: the figures moved to close the outline error, each with its ± from the error's curvature; one the view does not move is kept and said estimated |
| Evidence | `evidence.ts` kinds (measured, specified, estimated …) | each row says measured, given, estimated, not fixed (the camera is not), conflict, unknown |
| Ask | nothing | `askNext`: what is open, weighed, and the one photograph or measurement that settles the most |

## The nodes (all on the board "Rebuilt from a photograph")

Photograph → Edge-snapped image features → Camera resection from known points → Photogrammetric dimensions → Silhouette
rendering → Silhouette comparison (before) → Body lines fitted to a photograph → Silhouette rendering → Silhouette
comparison (after) → Next best view or measurement.

## First result: the user's side photograph (mc-side), measured 2026-10-29

- Marks: 40 (10 on the wheels, 30 round the outline by region), by eye; 31 snapped to an edge (moved at most 5 px), 9 kept
  as observed (the wheel centres, and where no clear edge was near).
- Camera: 5.0 px rms over 11 known points. **Not fixed**: cameras from 4.2 to 54.6 m away (focal length 786–12,318 px) fit
  within a pixel of the best. The wheels lie in one plane, and the roof's height (on the middle plane) adds too little
  parallax to choose between a near wide lens and a far long one. The photographs carry no EXIF (stripped on upload),
  which would have fixed the focal length.
- Dimensions through every camera that fits: length 4.59 ± 0.48 m against the published 5.027 m; front overhang
  0.83 ± 0.24 m (the record's 1.029 m is an estimate); rear 0.96 ± 0.28 m. All **not fixed**. Height is given (it placed
  the camera), not a check.
- Silhouette against the photograph, before → after fitting (60 evaluations at half size, 130 s): IoU 0.831 → 0.841, mean
  outline error 68 → 62 mm. By region after: hood −20 mm, roof −13 mm, windscreen −57 mm, rocker +18 mm; nose −113 mm and
  tail −133 mm (the model runs longer than the photograph at both ends: unresolved, as the length is).
- Figures: cowl 0.274 → 0.293 ± 0.029, deck 0.760 → 0.757 ± 0.026, cowlH 0.720 → 0.711 ± 0.044 and others moved, but
  all **not fixed** until the camera is; roofF, roofR and tail not moved by this view at all (estimated, kept).
- Asked for: the photograph's original file (its EXIF focal length), or the phone's make, model and lens.
- Never seen in one side view, and so unknown: the width along the car (its plan, its haunches, its tumblehome), its face,
  its tail's face.

## Not done yet (said plainly)

- Multi-view: each photograph gets its own camera (the nodes are per photograph), but nothing yet joins them into one
  solution, and the garage photographs (the real car) are not yet marked.
- Outlines and marks are traced by eye (Claude's, then snapped): no segmentation finds the car in the photograph by itself.
- Feature extraction beyond edges (holes, joints, symmetry, part boundaries) is not built.
- The fit moves only the body's line figures; the overhangs, the width and the kit's pieces are not fitted.
- The fit is slow (about 2 s an evaluation: the body built and rendered each time).

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
| Compare | nothing | IoU, and signed outline error at each traced point by region (pixels and mm at the thing's distance), by a chamfer distance transform; and both ways (`twoSided`: the outline to the model's edge and the model's edge to the outline, so a piece standing past it counts), against a dense outline laid on the picture's own edges (`denseOutline`, node Dense outline) |
| Correct | the body maker drives everything from its line figures (`Lines`, `panels.ts`): reused as the parametric model; the kit fitted to its skin (`bodyKit`, now exported) | `fitBy`: figures moved to close the error, each with its ± from the error's curvature; one the view does not move is kept and said estimated. `Rig`: the vehicle seen many times over: its body made quickly (`bodyPanels`' `quick`), its kit held as made on a coarse stage, its wheels made once or drawn as their tyres' discs; its lines, overhangs, stance (tyre size, ride height) and camera (a dolly zoom along the cameras its wheels cannot tell apart, its lens, its aim) free |
| Evidence | `evidence.ts` kinds (measured, specified, estimated …) | each row says measured, given, estimated, not fixed (the camera is not), conflict, unknown |
| Ask | nothing | `askNext`: what is open, weighed, and the one photograph or measurement that settles the most |

## The nodes

Folded into one, **Picture to model** (`seed.image-to-model`, on the board "Picture to model"; open it for its steps):
Photograph → Edge-snapped image features → Dense outline on the image's edges → Vehicle (the record the picture is of) →
Camera resection from known points → Body fitted to a picture (by the recipe kept) → Silhouette rendering → Silhouette
comparison → Next best view or measurement. **Pipelines tried** (`recon.search`, its own board) runs every recipe on one
picture and judges them alike; the best is what Body fitted to a picture uses (`BEST_RECIPE`).

## The side picture is a goal, not a photograph (the user, 2026-10-29)

"that was an ai generated version that is the goal of what I wanna get my Monte carlo too". So `mc-side` is marked
`concept` (`photo-marks.ts`): it is matched as the goal, and nothing read off it is a measurement of the car. The first
round's "conflict" with the published length was the AI's drawing, not a camera error: by its own wheels (wheelbase
2.807 m over 640 px between the wheel centres as marked, 4.39 mm a pixel), the picture's car is about 1,040 px, 4.56 m,
long, where a Monte Carlo is 5.027 m. A camera distance cannot be asked of a picture no camera took: the ask is now for a
photograph of the real car from the same side, to set beside the goal.

**Corrected in the second round:** that 4.56 m was wrong, and so was "the AI drew it short". Scaling the whole picture by
its wheels' 4.39 mm a pixel takes it as seen from far off; seen from about 5 m (a phone's distance), the car's ends, half
its width nearer and further than its wheels, are seen smaller and larger than that. With the camera's distance free
(and the dolly zoom fixed, below), the fit puts its length at 5.020 m, the published 5.027 m to 7 mm.

## First round: the side picture (mc-side), measured 2026-10-29 (read then as a photograph)

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

## Second round: matching it better (2026-10-29)

New tools, each a node or in one: **Dense outline on the image's edges** (`photo.outline`: the trace made a point every
3 px, each laid on the strongest edge across it, 799 points, 728 of them on a clear edge); the error **both ways**
(`twoSided`); the fit freed of the record where the picture differs from it (overhangs, tyre size and ride height, the
camera's distance, lens and aim, the roof's height, the wing and lip); the camera's distance **scanned** before it is
fitted; a **coarse to fine** schedule; and **Pipelines tried** (`recon.search`) to run each way of fitting on the same
picture and judge them alike: both ways against the dense outline at half size, the skins drawn fine, the wheels as their
tyres' discs. Times are as measured on this machine (one run each; the same recipe run twice gave the same result).

| Recipe | What it does | IoU | Error both ways | Time | Trials |
| --- | --- | --- | --- | --- | --- |
| before any fit | the record as made, through the solved camera | 0.833 | 19.26 px | | |
| A | the first round's: 30 traced points one way, lines only | 0.852 | 17.24 px (75.6 mm) | 257 s | 80 |
| B | the dense outline one way, lines only | 0.855 | 17.26 px | 261 s | 79 |
| C | dense, both ways, lines only | 0.854 | 17.36 px | 247 s | 79 |
| D | + its overhangs | 0.863 | 16.92 px | 329 s | 103 |
| E | + the camera's distance, one stage | 0.839 | 18.38 px | 328 s | 111 |
| F | E coarse to fine (a quarter size, coarse skins, kit held, then half size) | 0.895 | 11.44 px (50.2 mm) | 490 s | 324 |
| G | F's coarse stage only | 0.861 | 15.45 px | 258 s | 238 |
| H | + stance and the whole camera, its distance scanned first | 0.894 | 9.57 px (42.0 mm) | 582–595 s | 528 |
| **I** | H, then its details and lines again at half size, its kit made each trial | **0.898** | **9.23 px (40.5 mm)** | 932 s | 652 |

Kept: **I** (`BEST_RECIPE`), the closest; H is within 0.34 px of it in 62 % of the time, and is there to choose on the
node. mm are at the scale the picture's wheelbase sets (4.39 mm a pixel).

What made the difference, found on the way:
- **The camera's distance.** Its wheels fit any of the cameras from 4 to 55 m away; the solve picked 40 m (focal
  9,002 px). The silhouette is not indifferent: scanned, the error falls steadily as the camera comes nearer, 17.3 px at
  40 m to 13.1 px at 10 m with nothing else moved. Nelder–Mead from 40 m never got there (E is worse than D): scanning
  first is what found it. The fit ends about 5.4 m away (0.135 of the solve's distance), a phone's distance.
- **A bug found and fixed.** The first dolly zoom moved the camera along the line to the wheels' middle, not along its own
  axis, so the picture slid as it moved (the wheels' middle 110 px across and 173 px down at four times the distance); the first search's
  E and F were run with it, and are replaced by these.
- **The kit is most of the time.** Fitting the kit to the skin takes 1.2 s of the 1.9 s a trial took (measured); held
  as made and slid with the overhangs on the coarse stage, a trial there takes about 0.5 s.
- **The overhangs were not wrong**; the camera was. Through a near camera the published length fits.

## Not done yet (said plainly)

- Multi-view: each photograph gets its own camera (the nodes are per photograph), but nothing yet joins them into one
  solution, and the garage photographs (the real car) are not yet marked.
- Outlines and marks are traced by eye (Claude's, then snapped): no segmentation finds the car in the photograph by itself.
- Feature extraction beyond edges (holes, joints, symmetry, part boundaries) is not built.
- The fit moves the body's lines, overhangs, stance, roof height, wing and lip; not its width or plan (a side view does
  not show them), not the flares, skirts or scoop.
- It is slow: the kept recipe takes about 15 minutes on this machine.
- It is fitted to one picture, and it is the goal: no photograph of the car as it is is marked yet to set beside it.

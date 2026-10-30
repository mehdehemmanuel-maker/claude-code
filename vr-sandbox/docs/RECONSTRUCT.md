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

## Third round: judged from the picture's own camera, four ways apart (2026-10-29)

An expert's critique, passed on by the user: a closer outline does not prove the car is right; silhouette, features and
3D are separate objectives; compare from the same camera, find the mismatched regions, correct the geometry, report
silhouette, landmarks, surface and dimensions apart. (The orientation it saw reversed was the 3D viewer's shot from the
car's other side; every comparison here is from the picture's own camera, and the check says which way it faces.)

New tools, each a node:
- **Same-camera view** (`render.view`): the model z-buffered from the fitted camera: which part is at each pixel, how
  far, its shade. The fitted camera: 5.5 m from the car, 1.27 m up, a focal length of 1,031 px (about a 59° view across
  the 1,152 px: a phone's main lens).
- **Accuracy, four ways** (`check.accuracy`): silhouette (both ways, IoU); features (each traced feature, `traces` in
  `photo-marks.ts`, 18 of them, against the model's own part of that name: overlap, offset of their middles and which way,
  edge error both ways; a missing part said missing); surface (the model's edges inside the outline against the
  picture's, the six worst cells of a 6 × 3 grid and the parts there; and depth, curvature, thickness, the far side, the
  top and the plan said **unknown**: one side view does not show them); dimensions (the model's, the published, and the
  picture's read through the camera, each ±); and which way it faces.
- **Geometry fitted to its features** (`fit.features`): each group of features moves the figures that own it (its
  windows and door its body lines, its flares, wing, lamps, skirts, lip and valance their own), by those features and
  the outline together; the intake and its vent not fitted but **taken off the picture** onto the model's own surface.
- **Side by side from the same camera** (`view.compare`): the picture, the model, and the picture with each feature's
  edge traced (green) and the model's (red), as a PNG.

What they found, and what was done about it:
- A coupe's one door was held to 1.15 m (a typical figure) whatever its record said: the door stood 31 px forward of the
  picture's. Now a one-door car's door ends where its record puts its top rear corner (`panels.ts`): the door's overlap
  0.74 → 0.92, its handle 38 → 8 px off.
- The kit's lip and valance were plates under the bumpers only, hidden from the side; the picture's are side pieces down
  the bumpers' corners. Lips and valances may now have side pieces (`Plate` in `machines.ts`), ending where the skin
  ends at the side (the first try ran them to the middle's end, and they hung in the air past the corners).
- The model has no wing mirror (mirrors come only from the detail pass, not the vehicle node) and no fuel door: said
  "the model has no such part", not hidden.
- The fitted figures are stored on the kit record (`montecarlo04-kit`), so the next fit starts from them.

Measured: the folded node run end to end, before the feature fit and door and kit fixes (the outline fit alone), and
after them, from the stored record (899 s, this machine):

| Objective | Measure | Before | After |
| --- | --- | --- | --- |
| silhouette | outline error both ways | 8.73 px, IoU 0.882 | 7.05 px (37 mm), IoU 0.918 |
| features | mean edge error of those found | 11.0 px | 6.5 px |
| features | mean offset of their middles | 19.2 px | 7.5 px |
| features | mean overlap | 0.41 | 0.56 |
| surface | model edges to the picture's | 4.1 px (56 % within 3 px) | 4.15 px (55 %) |
| surface | depth, curvature, thickness, far side, top, plan | unknown | unknown |
| dimensions | model against published, largest | 21 mm | 35 mm (its roof, the picture's 1.437 m) |
| orientation | | agrees | agrees |

By feature, after: door 0.92 overlap; side glass 0.84; intake and vent 0.96 and 0.97 (taken off the picture, so a match
by making, not a check); front lip 0.69; side skirt 0.70; quarter glass 0.69; the rest under 0.45: the wing 0.39 (its
end plates and blade not the picture's shape), the rims 0.39–0.44 (their spokes not the picture's star with red
inserts), the flares 0.21–0.28 (bands where the picture has wide arches), the tail lamp 0.20 (a block where it is a
thin strip), the headlamp 0.44. Mirror and fuel door: none in the model. The surface measure did not move: what it
counts (the panels' own edges and creases) the fits do not change. Blind check of the same-camera render: "a black
two-door coupe … facing left", a Charger or a Monaro at 15–25 %: no longer a sedan, still not a Monte Carlo.

- Reading the picture's length off one plane is wrong through a near camera (its ends are seen at its corners: 5.566 m
  read where 5.047 m fits); its ends and roof are now read as the model's own and how far the outline stands past it, at
  the model's own depth there.

## Fourth round: the shapes the check found missing (2026-10-30)

- **Made whole** (`make.whole`, new node): the make pipeline (its details by rule and its critic) as a node; Picture to
  model now judges the car made whole, so it has its wing mirrors and number plates as the viewer's finished car does.
  Its critic found the front lip's side pieces, fitted 0.6 m long last round, in the front wheels' room: side pieces now
  stop 30 mm short of each arch (a rule, `machines.ts`).
- **Flares** may reach in over the arch's opening (`inset`), as a wide flare does: the front flare's overlap with the
  picture's 0.24 → 0.75.
- **Wing end plates** sized apart from the blade (`plate`, `plateH`); **rims** fitted by size, the tyres keeping their
  diameter: the picture's are 21 in (245/30R21), not 20.
- Not moved: the rear flare, the tail lamp (the fit pushed it taller and further round, the wrong way: not stored), the
  mirror (the detail pass's typical mirror, 36 px from the picture's and smaller; nothing fits its size yet), the fuel
  door (no rule makes one).

## Not done yet (said plainly)

- Multi-view: each photograph gets its own camera (the nodes are per photograph), but nothing yet joins them into one
  solution, and the garage photographs (the real car) are not yet marked.
- Outlines and marks are traced by eye (Claude's, then snapped): no segmentation finds the car in the photograph by itself.
- Feature extraction beyond edges (holes, joints, symmetry, part boundaries) is not built.
- The fit moves the body's lines, overhangs, stance, roof height, wing and lip; not its width or plan (a side view does
  not show them), not the flares, skirts or scoop.
- It is slow: Picture to model took 899 s end to end on this machine.
- The wing's end plates, the rims' spokes, the flares' wide arches, the lamps' shapes, the mirror and the fuel door
  are shapes the model does not have yet: the check finds them; making them is next.
- It is fitted to one picture, and it is the goal: no photograph of the car as it is is marked yet to set beside it.

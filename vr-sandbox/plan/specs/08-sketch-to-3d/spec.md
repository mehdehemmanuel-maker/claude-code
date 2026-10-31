# Spec 08, a picture to a 3D profile: the AI draws, a parser with no AI copies

The user's words (2026-10-31): "with 2d sketches this can be an ai image generator with a specific prompt like generate
and his part outlined in a 3d engineering with labeled dimensions … that image passes to a image parser it's scan the
black lines an put it into the environment setup in 3d this part should use no ai so just so it don't hallucinate if you
tell it specifically outline this in black then we only have to copy black paste it do also add in the prompt don't use
black on any thing else or even better just tell it specifically what ui should look like leaving no room for failure".

## Starts from (checked 2026-10-31)

`seed.image-to-model` and `docs/RECONSTRUCT.md`: a photo's outline traced densely, joints fitted, the model's lines
measured against the picture's (same-camera verification). `api.fal.draw` (fal's cheapest image model) and
`api.gemini.draw` as nodes. So the parsing half partly exists; this spec makes the drawing half exact and the parsing
half free of AI.

## The idea, made into a pipeline

1. **The drawing brief (AI, tightly specified).** The image model is told exactly what the picture must be, leaving no
   room: a white background; one view, orthographic, square to the profile; the part's outline in pure black
   (#000000), 3 px, closed; nothing else black (dimension lines and their numbers in one other pure colour, say pure
   red #FF0000; no shading, no text but the dimensions, no frame); a scale bar of known length in pure blue. The brief
   is a versioned prompt node (spec 07's prompts as nodes), measured against variants (research `11`).
2. **The gate on the picture (no AI).** Count the pixels by colour: black forms one closed loop (or loops for holes);
   nothing but black, red, blue and white beyond a tolerance; the scale bar found. A picture that fails is redrawn
   with the reason, at most a few times, then refused with the reason.
3. **The parser (no AI).** Black pixels to a contour (marching squares, then simplified by Douglas–Peucker to a set
   tolerance), holes as inner loops; the scale bar gives metres per pixel; straight runs fitted as lines and round runs
   as arcs (least squares), each fit's residual kept.
4. **The dimensions (decided by the user's rule: no AI here).** The numbers the model wrote in red are not read by a
   model. Two ways, to be chosen by research (`11`): (a) the numbers come from the request itself (the person said "80
   by 40 with a 10 mm hole"), and the parser checks the drawing against them; or (b) the red numbers are read by a fixed
   character reader limited to digits, whose every reading is checked against the scale bar's measurement, and any
   disagreement refused.
5. **Into 3D.** The profile becomes an extrusion or a turned part (the shapes we have: prism, lathe), its sizes from
   step 4, its fit to the picture said (the largest gap in mm); it gains interfaces where its holes are (spec 01).

## Requirements

- **K-R1.** WHEN a profile is asked for in words, THE SYSTEM SHALL ask the image model with a brief that fixes every
  colour, view and mark, and SHALL refuse any picture that breaks the brief, saying how.
- **K-R2.** THE SYSTEM SHALL turn the black outline into a profile with no AI in the path, and say how closely the
  profile follows the picture.
- **K-R3.** THE SYSTEM SHALL never take a size from the picture that the request or a check does not confirm.
- **K-R4.** THE SYSTEM SHALL keep each brief as a versioned prompt node with its measured success rate.

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| K1 | The brief, versioned; three variants measured on ten profiles each | the share of pictures passing the gate, per variant | research 11 |
| K2 | The colour gate | a picture with a stray black mark is refused, and says where | — |
| K3 | The parser: contour, simplify, lines and arcs, scale | a known profile drawn by us (not a model) parses back within 0.5 % of its sizes | — |
| K4 | Sizes: from the request, or digits read and checked against the scale | a drawing whose numbers disagree with its scale is refused | research 11 |
| K5 | Into 3D with interfaces at the holes | "a bracket 80 × 40 with two 6 mm holes" becomes a part with two clearance interfaces | spec 01 |

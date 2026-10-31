# Research: prompts as engineered parts, reviewer panels, and a picture to exact geometry

One research pass, 2026-10-31. Marks: [D-fetched] read in that pass; [D-recall] a well-known paper or tool cited from memory (check its figures before quoting); [I] the agent's inference or design. Nothing here was run.

## Findings, in short
- **Prompt optimisers**: DSPy (signatures and modules compiled against a metric) [D-recall]; **GEPA** [D-fetched] (reads traces and feedback, keeps a Pareto pool; reported up to ~20 % better than GRPO with up to 35× fewer rollouts; production needs a test-driven harness); TextGrad, OPRO, APE [D-recall]. [I] Only for narrow calls with an exact metric and a frozen regression set; else they overfit the judge.
- **Self-correction has limits** [D-fetched] (Huang et al., arXiv 2310.01798): checking itself with no outside information did not help and often hurt. [I] Every check in a pipeline must bring new information: code, sources, another model, a re-solve from the raw task.
- **Verification** [D]: Chain-of-Verification; SelfCheckGPT; **semantic entropy** (Farquhar et al., Nature 630:625, 2024) flags confabulation by sampling answers and clustering them by meaning.
- **Structured output** [D-recall]: schemas guarantee parsing, but strict formats can lower reasoning ("Let Me Speak Freely?"): [I] reason in free text, then extract.
- **Context** [D-recall]: "Lost in the Middle": put the task and constraints at the end, next to the output.
- **Prompt injection** [D-fetched]: CaMeL (arXiv 2503.18813): a privileged model plans from the trusted request alone; a quarantined model reads untrusted data with no tools and returns only a schema; an interpreter tracks where data came from. [I] Web pages and uploaded files reach the agent only through a schema-only extractor.
- **Validating validators** [D-fetched]: EvalGen (UIST 2024): people's grading criteria drift as they grade; the rubric and the labelled set are versioned.
- **Judges' biases** [D-fetched]: CALM (ICLR 2025): twelve biases (position, verbosity, self-preference, bandwagon, authority…) persist in strong models; "Judging the Judges": judges are lenient, fooled by "Yes" or "Sure", and can agree 80 % with people yet score 20 points apart: report Cohen's kappa.
- **Panels** [D-fetched]: PoLL (arXiv 2404.18796): a jury of smaller judges from different model families beat a single GPT-4 judge, with less self-preference, at a seventh of the cost. [I] At least one judge from a different family than the builder.
- **Grounding** [I]: the cheapest strong check: every claim carries a source id and a verbatim quote, and code checks the quote is in the source.
- **Images** [D-fetched]: the IMG.LY benchmark (23 models, 2,550 images, 10 Sep 2026): "no model reliably hits an exact hex" (CIEDE2000); StructBench (ICLR 2026): image models remain far from satisfactory on charts and diagrams; model churn (GPT Image 1 retired 23 Oct 2026; FLUX.2 recommended). Recraft V4 on fal draws real SVG paths. StarVector, OmniSVG for SVG. **Img2CAD** (SIGGRAPH Asia 2025): vision-language models "struggle with the precision required for 3D coordinates", so they predict only structure and another model the numbers. **eDOCr2** (2025): 93.75 % text recall on drawings; TU Wien cross-checks read values against the dimension lines' pixel length.
- **Standards** [D]: ISO 128 line types and widths (wide to narrow 2:1); ISO 129-1:2018 dimensioning.

## The central conclusion for the user's picture idea [I]
An image model has no metric: its colours are not exact and its proportions approximate. So **the picture carries shape and topology (which lines, which arcs, which holes, tangencies, symmetry), and the request carries the numbers.** Do not read dimensions back from digits in the picture: leave them out, or draw letters (A, B, C) that name values the request holds. Use colour classes with tolerance bands, never an exact hex. Where the request already defines the part, the AI writes the profile directly (exact by construction) and no image model is needed; the image earns its place when only the look is known.

## Designs

### A prompt node (one tagged task per call)
```yaml
node: prompt
id: profile.extract_topology      # one task, a dotted name
version: 3.2.0                    # major: the output's schema changed; minor: the template; patch: wording
template_sha256: <hash>
model: {id: <pinned>, temperature: 0, max_tokens: 1200}
task_tag: EXTRACT                 # PLAN | EXTRACT | GENERATE | CLASSIFY | JUDGE | REPAIR
inputs:  {schema: …, sources: [request, gate_report]}   # only what this task reads
output:  {schema: …, reasoning_field: notes, constrained: true}
context_budget_tokens: 4000
untrusted_inputs: [user_image_caption]   # through a quarantined extractor; never into a PLAN call
pre_gates:  [schema_valid(inputs), size_under(budget)]
post_gates: [schema_valid(output), code_check, judge_panel]
on_fail: {retry: 2, retry_with: gate_message, then: abstain}   # abstaining is a valid answer
failure_codes: [F-SCHEMA, F-UNGROUNDED, F-NUMERIC, F-OMISSION, F-EXTRA, F-INJECTION, F-ABSTAIN-WRONG, F-OVERCONFIDENT]
metrics: {suite: frozen per version, pass_rate, per_failure_code_rate, abstain_rate, judge_kappa, cost, latency, tokens}
release: {shadow | canary | live; paired test on the same cases; ship only if no failure code worsens}
```
Rules: one task a call; any change makes a version; the regression suite is frozen per version and grows only from real failures; optimisers may only propose a minor version; every run is recorded so it can be replayed.

### A reviewer panel
| Judge | Checks | AI? | Tested by |
| --- | --- | --- | --- |
| Schema and invariants | parses; units; ids exist; no dangling ports | no | unit and mutation tests |
| Numeric verifier | recomputes every derived number | no | planted arithmetic and unit errors: must catch all |
| Source fact-checker | each claim's quote found in its source; then whether the quote supports it | code, then AI | planted false quotes; a labelled set for support |
| Blind re-solver | solves the task without seeing the answer; code compares | yes, another family or prompt | agreement with gold answers |
| Rubric grader | one criterion a call, with pass and fail examples | yes | kappa against people; bias probes |
| Pairwise comparer | old against new, both orders | yes | flip rate when the order is swapped |
| Adversary | edge inputs, injections, contradictions | yes | seeded known weaknesses found |
| Consistency sampler | disagreement among samples (semantic entropy) | yes | how well it predicts wrong answers |
| Abstention auditor | was "I don't know" right, or lazy | yes and code | answerable and unanswerable items |

Code judges have a veto; AI judges vote; a split goes to a person or ends in abstaining, never a silent pass; the builder's model family never makes the majority. **Testing a judge**: a labelled gold set; planted defects, one per failure code; a bias battery (swap the order, pad the answer, relabel the author, confident tone, a bare "Yes" or empty answer); five paraphrases of the judge's prompt (high variance means the rubric is vague); calibration of its stated confidence. Judges are prompt nodes too, versioned and tested the same way.

**Context- and hallucination-aware hand-offs** (the user's rule, decision 0008): each pass emits `{output, claims with source ids, unknowns, confidence, inputs read}`; the gate between passes checks the schema, that every claim is grounded or marked an assumption, recomputes the numbers, blocks anything ungrounded from the next pass, and lets an abstention through as a value; untrusted text becomes schema output first; free text never passes between passes as an instruction.

### The picture-to-profile brief and its gate
**Path 1** (the request defines the part): the AI writes the parametric profile; no image model. **Path 2** (only the shape is known): the image model draws the outline under this brief:

> Technical 2D profile drawing, orthographic, straight on (no perspective, no 3D, no shading). Square canvas, 2048 × 2048 px, pure white background everywhere except the lines. Draw ONLY the outer outline and the holes of ONE flat part: <shape described>. Outline: one closed continuous line, pure black, uniform 8 px, sharp, no gaps, no overlaps, no sketchy or doubled strokes. Holes: closed black circles, the same line. The part centred, filling 70 % of the width, its long edges exactly horizontal. Proportions: width to height <W:H>; hole centres at <fractions>. Labels (optional): a capital letter beside each feature, solid pure blue, 60 px, outside the outline, never touching a black line. Nothing else: no title, border, grid, hatching, centre lines, shadow, texture, gradient, numbers or arrows; no colour but black, white and (with labels) blue.

Plus a negative prompt where supported. **No wording removes failure**; what makes it safe: ask for the least (the outline), sample several pictures and keep only those that pass the gate, take the shape most of them agree on; if none pass, fall back to Path 1 or ask.

**The gate** (no AI; every threshold logged): size and format; colour classes in CIELAB with bands (black L* < 30, white L* > 90, blue by hue band; anti-aliasing only next to black; unclassified under 0.3 %); one closed outer contour and the expected number of holes, no self-crossing; stroke width from the distance transform, steady; no black in label areas; centred, filling as asked, axis-aligned within 1°; proportions within ±3 % of the request; a plausible count of lines and arcs. Each rejection carries a code (F-COLOUR, F-OPEN, F-HOLES, F-STROKE, F-PROPORTION, F-EXTRA); each model's failure rates choose the model.

**Parsing** (no AI): colour classes, contours with holes (OpenCV `findContours`), Douglas–Peucker, lines and arcs (RANSAC with a Taubin circle fit), constraints inferred (horizontal, tangent, concentric, mirror), then a constraint solver snaps the sketch to the request's numbers; a proportion check against the request; letters mapped to the request's values. If digits must be read: a digit-only reader on cropped regions, each value checked against the dimension line's length.

## Questions
The 88 questions of this pass are chapter 7 of `../BOOK-OF-QUESTIONS.md`.

# Research: mathematics as a source of ideas (fractals, π, precision, proof, composition, explorables)

One research pass, 2026-10-31. Marks: [D] read in that pass, with its link; [D*] a well-known published source cited from memory, to be checked before a figure is quoted; [I] the agent's inference.

## Two findings in our own code
- `src/data/constants.ts` holds **CODATA 2018** values; **CODATA 2022** is published (Mohr et al., Rev. Mod. Phys. 97, 025002, 2025) [D], with a correlation matrix between constants.
- Our ± along wires is first order (`evidence.ts`, `spreadOf`): the GUM's linear method, which the GUM itself limits (JCGM 101, §5.8) [D].

## Findings, in short
- **Fractals** [D]: Mandelbrot 1967 (Britain's coast, D ≈ 1.25: a length means nothing without the ruler it was measured with); IFS and the collage theorem; L-systems (The Algorithmic Beauty of Plants); airways (sources disagree: 23 generations or 11 orders); fractal antennas (Cohen; Puente, 1995); Fractal Cities (Batty and Longley 1994). Real objects are fractal only between an inner and an outer cutoff.
- **Deep zoom** [D] (mathr.co.uk; philthompson.me; synapticspiral.nz): float64 runs out at ~10⁻¹⁵; **perturbation**: one high-precision reference orbit, every pixel a small low-precision offset; extended exponents; **glitch detection** (Pauldelbrot) and **rebasing** (Zhuoran 2021); series and linear approximation to skip work, with no complete proof of its error; escalation tiers, undecided pixels said to be undecided. [I] For km to µm: a float64 anchor per frame and part, camera-relative float32 on the GPU, rebase when an offset grows, a detector for when the cheap form lies, a level of detail with an error budget, a scale band on every model.
- **π** [D]: the record is 314 trillion digits (StorageReview, y-cruncher, 19 Nov 2025; 110 days, verified in 4.37 h); Chudnovsky with binary splitting; BBP extracts a hex digit without the others (found by PSLQ: compute, guess the exact form, prove); NASA JPL navigates with 15 decimals, and 37 would measure the observable universe to a hydrogen atom. [I] Digits are never the bottleneck; cancellation, ill-conditioning, accumulation and chaos are.
- **Arithmetic you can trust** [D]: MPFR; Arb (ball arithmetic, now in FLINT 3); interval arithmetic standardised as IEEE 1788-2015 with decorations (com, dac, def, trv, ill); the dependency problem and wrapping effect; GUM (JCGM 100) first-order with covariances, JCGM 101 Monte Carlo; floating-point disasters: Patriot 1991 (0.1 in 24-bit fixed point, 0.34 s after 100 h, 687 m), Ariane 5.
- **Proof and checking** [D]: Mathlib 291,825 theorems (2026-10-30); a complete Lean 4 formalisation of Fermat's Last Theorem published 4 Sep 2026, largely by Claude agents (per Kevin Buzzard's blog); PhysLean/physlib with units and dimensions; dimensional analysis formalised in Lean (arXiv 2509.13142); Z3 as an official WebAssembly npm package (`z3-solver`); dReal for nonlinear real formulas ("δ-sat").
- **Optimisation and structure** [D*]: disciplined convex programming certifies convexity by composition rules; HiGHS (MIT, has a WASM build) for integer problems; max-flow min-cut (the min cut is the explanation of what limits); chaos (Lorenz; largest Lyapunov exponent ≈ 0.9; horizon t ≈ (1/λ)·ln(tolerance/initial error)); Rule 110 universal (Cook 2004); Kolmogorov complexity [I]: the library law is description-length minimisation.
- **Composition** [D*/D]: Fong and Spivak, *Seven Sketches in Compositionality*; operads of wiring diagrams (a box filled by a wiring of smaller boxes, composing associatively: our fold); decorated cospans; lenses (values forward, requirements backward); Catlab.jl. [I] Fold is a functor: computing a folded node must equal computing its inside, a test for every saved block.
- **Topology of solids** [D*]: V − E + F = χ = 2 − 2g; Betti numbers; manifold edges and orientation: the standard check after booleans.
- **Explorables** [D]: Bret Victor's "Up and Down the Ladder of Abstraction" (concrete → over time → over parameters, and back down by hovering) and "Explorable Explanations" (drag a number in prose and everything updates); manim; Desmos (a free parameter becomes a slider); GeoGebra; Observable (cells as a reactive dataflow graph: the nearest thing to our engine); Distill.

## What to take, ranked [I]
1. Constants to CODATA 2022, with their correlations (a cheap, factual fix).
2. Interval or ball mode on wires with IEEE 1788 decorations mapped to our evidence kinds; a `check.bound` node ("provably within [a, b]").
3. GUM's validity checked on our ±; a Monte Carlo node where linear propagation fails, and said so.
4. Automatic differentiation through the board (exact sensitivities, GUM coefficients, gradients).
5. Fold as a functor (tested on every saved block); port types as dimension, frame, evidence and direction; wires that are shared variables (acausal) beside directed ones.
6. A zoom built like a deep-zoom renderer (anchors, rebasing, a glitch detector, error-budgeted detail, scale bands).
7. `check.smt` (z3-solver in a worker): rules proved for every input in a range, or a counterexample, or the conflicting set; δ-sat for transcendental physics.
8. `check.topology` (χ, genus, Betti numbers, manifold edges) after every boolean.
9. Convexity certified on optimisation nodes; never "optimal" without saying which kind.
10. Chaos aware ODEs: a Lyapunov probe and a predictability horizon; bifurcation sweeps.
11. A ladder-of-abstraction view for any node (`explore.sweep`).
12. Explanations as reactive documents (drag a number in the AI's explanation; the board reruns).
13. Fractal generators and a box-dimension measure, with cutoffs.
14. Flow nodes on the board's graph (the min cut as the bottleneck's explanation).
15. A symbolic node (solve for any variable, prove two laws the same).
16. Precision tiers, escalating only what is undecided.
17. Information measures (entropy, capacity, Landauer) and description length after folding.
18. Elementary and 2D cellular automata as a substrate.
19. Dimensional homogeneity as a proved invariant, mirrored in Lean later.
20. Floating-point lint (cancellation, accumulated non-representable steps, float32 world coordinates, narrowing), each with its historical case.

## Questions
The 96 questions of this pass are chapter 4 of `../BOOK-OF-QUESTIONS.md`.

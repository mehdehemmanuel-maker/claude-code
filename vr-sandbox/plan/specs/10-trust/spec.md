# Spec 10, trust in numbers: uncertainty, status, sensitivity, and what cannot be simulated

Accepted 2026-10-31 (U11, U13). From the synthesis, round 2 findings 4, 5 and 11 and round 3 findings 14 and 15.

## Starts from (checked 2026-10-31)

Uncertainty rides wires to first order (`evidence.ts`, `spreadOf`): the GUM's linear method, whose validity the GUM
itself limits. Constants in `src/data/constants.ts` moved to CODATA 2022 on 2026-10-31 (T1's values done; their correlations not yet). Numbers carry a source
or a label (typical, estimate) by rule, not by check. Sensitivities come from repeated runs (`what.matters`).

## Requirements

- **T-R1.** THE SYSTEM SHALL use CODATA 2022 constants, with their correlations, and say which outputs moved and by how
  much.
- **T-R2.** THE SYSTEM SHALL carry uncertainty in the mode a question needs: first-order (today's), intervals with
  decorations (IEEE 1788), or Monte Carlo (JCGM 101); and SHALL say when the first-order mode is not valid for a model.
- **T-R3.** THE SYSTEM SHALL give every value a **claim status**: measured, calibrated (against what, valid for what),
  derived, typical, estimate, inspired only, disputed, myth, target; estimates keep their spread and who made them;
  numbers worked back from targets are "target", never "estimate".
- **T-R4.** THE SYSTEM SHALL tell quantities by their kind as well as their unit (toughness in J/m² is not fracture
  toughness in MPa·m½; energy is not torque though both are N·m).
- **T-R5.** WHERE inputs are uncertain or the dynamics chaotic, THE SYSTEM SHALL run ensembles by default and show bands,
  spread and the chance of crossing a threshold; one run SHALL be called "one member"; a predictability horizon SHALL
  be shown for chaotic boards.
- **T-R6.** THE SYSTEM SHALL fit a simulation to real measurements where they exist (assimilation), keeping the analysis
  apart from the forecast.
- **T-R7.** THE SYSTEM SHALL compute sensitivities exactly by automatic differentiation where nodes are differentiable,
  and say where they are not.
- **T-R8.** THE SYSTEM SHALL keep a register of what it cannot simulate, each with the reason and the nearest honest
  stand-in; the AI SHALL read it before promising anything.
- **T-R9.** THE SYSTEM SHALL flag any sourced number used outside the range it was measured over.

## Design

- **Constants**: CODATA 2022 in `data/constants.ts`, with a test listing the outputs that moved.
- **Wire modes** (`evidence.ts`, `dataflow.ts`): point, ±first order, interval (with decorations mapped to our evidence
  kinds), ensemble; a GUM-validity probe comparing first order with a small sample.
- **Claim status and quantity kind** on every value (`quantities.ts`, the data files): the provenance check of spec 00
  extended to them.
- **Ensembles** (a node and a view): members run in the pool; bands, spaghetti, threshold probabilities; a spread-skill
  check where reference data exist; twin runs for the error-doubling time.
- **Assimilation** (a node): an ensemble Kalman filter first.
- **Automatic differentiation** (`numeric.ts`): forward mode through the board.
- **The register** (`data/cannot-simulate.ts`, read by `docs/FOR-AI.md`).
- **Lint**: catastrophic cancellation, accumulated non-representable steps, float32 world coordinates, integer
  narrowing, each with its historical case (Patriot, Ariane 5).

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| T1 | CODATA 2022 with correlations | the outputs that moved listed with their change | 00 |
| T2 | Interval and ensemble modes; GUM validity probe | a strongly nonlinear node says "first order not valid here" and its Monte Carlo band differs as expected | 00 |
| T3 | Claim status on every value (C21) | the provenance check fails a value with no status | 00 S4 |
| T5 | Envelopes on sourced numbers (C22) | a figure used 15 °C below its tested range is flagged | T3 |
| T6 | Ensembles by default where chaos or uncertainty rule; horizon badge | the Lorenz board shows its horizon from twin runs; a single run is labelled one member | T2 |
| T7 | Assimilation node | a simulated pendulum fitted to noisy "measurements" recovers its length within its stated band | T6 |
| T8 | Forward-mode differentiation through boards | sensitivities equal finite differences within tolerance and are faster, measured | 00 |
| T9 | The "cannot simulate" register, read by the AI | asked to "simulate a person's mind", the AI cites the register | 00 |
| T10 | Floating-point lint | each planted pattern is flagged with its case | 00 |
| T11 | **First**: quantity kinds on every wire (research 18, 24; faults D1–D4): every number port gets `quantity`, proposed by `quantityOf` and confirmed; `fits` checks kind, then point or difference, then unit (dimension follows); rpm a rotational frequency, 2π only through a named bridge; a temperature difference a kind of its own; dB a level with a reference and a power-or-field flag; `krad` no longer read as the radian; kinds that share a unit kept apart (torque and energy, toughness and fracture toughness); kinds seeded from QUDT (CC BY 4.0); decision 0009 | failing tests first: 60 rpm → Hz gives 1 or is refused; 10 °C difference → 10 K; 3 dB power ratio → 1.995; torque → energy, Gy → Sv and toughness → fracture toughness refused; a port with neither unit nor kind refused | — |
| T12 | Retraction check: source DOIs against Crossref's open Retraction Watch data; everything derived marked | a planted retracted DOI marks its descendants | T3 |
| T13 | AI-written values beside sourced ones, never replacing them (C27); the share of AI-made inputs on every derived value | an AI-written value cannot overwrite a sourced one; a derived value shows its AI share | T3 |
| T14 | Values linked to the decisions they bear on; a new estimate reopens them; two readings of one quantity that disagree stop the line (C28) | a revised figure reopens its linked decision; two disagreeing readings raise an andon | T3, 00 S10 |
| T15 | The AI's stated confidence Brier-scored as forecasts resolve; labelled "uncalibrated" until it is | the score shown with its count of resolved forecasts | 00 S5 |
| T17 | Imports declare each value's kind at the boundary (Mars Climate Orbiter, the Gimli Glider) | a CSV column with no kind is refused on import | T11 |
| T18 | Propose, then certify: every AI change returns the diff and a certificate a small checker verifies; each certificate names what it trusts (C29) | a planted wrong certificate is refused; a correct one passes without the second model | T3 |
| T19 | The AI's formal requirements shown in plain words and run against known-bad designs before use | a weakened requirement that passes a known-bad design is caught | T18 |
| T20 | Rigour class per node, computed from the worst harm downstream (IEC 62304, V&V 40); the class sets the mandatory checks | a node feeding a load-bearing check is class C; lowered only by a named outside control | T3 |
| T21 | GRADE-shaped certainty per use, with indirectness computed from metadata (another alloy, population, temperature); acceptance criteria frozen before a run | a dry-wood value in a wet beam flagged indirect; a criterion changed after the run without a stated reason fails | T3, T5 |
| T22 | Base rates on every alarm: prior, sensitivity, specificity, shown as natural frequencies | an alarm shows "of 1,000 boards like this, N really fail" | T15 |
| T23 | The kernel (`src/kernel/`, research 31): exact rationals and outward-rounded intervals; refuses when it cannot decide; imports nothing outside itself; certificate kinds dims, witness, cover, farkas, lrat, model, gap, sweep, rewrite, refines, table, sample, judged; a second independent checker for the commonest kinds | each kind accepts a correct certificate and refuses three planted wrong ones; the kernel's import list is checked | T18 |
| T24 | Interference as a gate: no exemption by name; a fastener excused only where its interface says it sits (its hole, its thread engagement); the 0.5 mm skip replaced by the interface's stated fit | a bolt crossing a wall it does not pass through is caught | T23, 01 |

# Spec 10, trust in numbers: uncertainty, status, sensitivity, and what cannot be simulated

Accepted 2026-10-31 (U11, U13). From the synthesis, round 2 findings 4, 5 and 11 and round 3 findings 14 and 15.

## Starts from (checked 2026-10-31)

Uncertainty rides wires to first order (`evidence.ts`, `spreadOf`): the GUM's linear method, whose validity the GUM
itself limits. Constants in `src/data/constants.ts` are CODATA 2018; CODATA 2022 is published. Numbers carry a source
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
| T4 | Quantity kinds beyond units | comparing toughness with fracture toughness is refused | T3 |
| T5 | Envelopes on sourced numbers (C22) | a figure used 15 °C below its tested range is flagged | T3 |
| T6 | Ensembles by default where chaos or uncertainty rule; horizon badge | the Lorenz board shows its horizon from twin runs; a single run is labelled one member | T2 |
| T7 | Assimilation node | a simulated pendulum fitted to noisy "measurements" recovers its length within its stated band | T6 |
| T8 | Forward-mode differentiation through boards | sensitivities equal finite differences within tolerance and are faster, measured | 00 |
| T9 | The "cannot simulate" register, read by the AI | asked to "simulate a person's mind", the AI cites the register | 00 |
| T10 | Floating-point lint | each planted pattern is flagged with its case | 00 |

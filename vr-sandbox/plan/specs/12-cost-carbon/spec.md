# Spec 12, cost and carbon: what a thing costs and emits, with where and when

From research 29 (2026-10-31). Not yet accepted: it waits on the user's yes (`QUESTIONS.md` U14).

## Starts from (checked 2026-10-31)

`madeof.ts` gives mass by material for any thing, rolled up through every depth. Nothing carries cost or carbon.

## Requirements

- **CC-R1.** THE SYSTEM SHALL carry money and CO₂e as quantities: money with currency, date and region; CO₂e with its
  scope (cradle to gate, to grave), system model and GWP set.
- **CC-R2.** THE SYSTEM SHALL roll embodied carbon up as mass by material times a sourced, versioned factor (ICE v4.1
  first), and say the factor's origin, since origin alone can triple it.
- **CC-R3.** THE SYSTEM SHALL give a part's cost as a function of quantity, region and process (Ashby's material,
  tooling, capital and overhead terms; assembly time × rate after Boothroyd–Dewhurst), never as one number.
- **CC-R4.** THE SYSTEM SHALL roll supply risk with its own rules (lead time as the longest, sole source as any),
  walked below the parts list.
- **CC-R5.** THE SYSTEM SHALL never invent a price or a factor (C30), and SHALL rank price sources by what may be
  republished (USGS Mineral Commodity Summaries, CC0, first).

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| CC1 | Money and CO₂e as quantities with their context; the AI's estimates labelled (C30) | an unlabelled price is refused | 10 T16 |
| CC2 | Carbon rolled up from `madeof.ts` with ICE factors | a steel bracket's carbon equals its mass × the cited factor, with the factor's origin shown | CC1 |
| CC3 | `cost.process` (Ashby) with its envelope; `dfa.check` (the three Boothroyd–Dewhurst questions) | a part's unit cost falls with batch size as the tooling term predicts; parts that need not be separate are named | CC1 |
| CC4 | Learning curves with their fitted window named; inflation and exchange as visible dated nodes | a cost carried across years shows the deflator used | CC3 |
| CC5 | Supply-risk rollup below the BOM | a sole-sourced pigment deep in a paint marks the car | CC1 |

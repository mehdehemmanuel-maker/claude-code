# Spec 05, civil engineering, populated

The user's words (2026-10-31): "4 populate the civil engineering".

## Starts from (checked 2026-10-31)

The field "Structural & civil" has about 59 nodes; the disciplines tree has 11 civil branches, almost none with nodes
of their own; a 3D frame analysis (`bend`); seeds for roads, crossings, a house and a city; laws for beams and columns.

## Requirements

- **V-R1.** THE SYSTEM SHALL hold civil parts from sources that may be used (`research/04-civil-names.md`), each figure
  with its source, or labelled derived (a bar's area from its diameter), and nothing copied from a standard's tables.
- **V-R2.** THE SYSTEM SHALL build civil things from those parts: a beam sized for its span and load, a column, a
  footing, a culvert under a road, a bolted steel connection (by spec 01's interfaces), a bridge span from its parts.
- **V-R3.** WHEN a real IFC 4.3 model (a bridge, a road, a building) is opened, THE SYSTEM SHALL read it and take it
  apart into nodes and parts.
- **V-R4.** WHERE no open source gives a value (design loads), THE SYSTEM SHALL take it as an input a person gives and
  say so.
- **V-R5.** THE SYSTEM SHALL give every civil branch of the disciplines tree at least one node.

## Design

- **Sources first** (licences in `research/04-civil-names.md`): EN steel sections from `ulmewix/Steel_Section_Database`
  (MIT), checked against `timskovjacobsen/steelprofiles_api` (MIT) and, where its terms allow, ArcelorMittal's tables; a
  disagreement checked against the source, never tuned. Bar sizes, concrete and timber classes as names; areas
  derived. Soil groups (USCS, AASHTO) as names, their rules from the US Bureau of Reclamation's public text. Culverts
  and the controlling criteria of road design from FHWA's public documents. Timber from the USDA Wood Handbook (public
  domain). The AISC shapes only from a person's own copy, imported locally, never committed.
- **The IFC reader**: `web-ifc` (MPL-2.0) in the browser; IFC entities mapped to our kinds through the names index
  (spec 02).
- **Builds**: the frame analysis we have for beams and frames; the interfaces of spec 01 for bolted connections (holes,
  edge distances by EN 1993-1-8, bolts by `fastenerFor`).

**Owners**: `src/data/` (sections, classes), `kinds/` (bought structural parts), `blocks.ts` (nodes), `seeds.ts`
(roads, bridges), `graph.ts` (the frame analysis), the IFC reader as a new module with its row (a decision record).

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| V1 | Import EN sections with source and licence; cross-check against the second source | every row sourced; disagreements listed, each checked | 02 N2 |
| V2 | Bars, concrete, timber, soils: names with derived or public values | each value's label; spot checks by the evaluator | 02 N3 |
| V3 | A beam sized for span and load; a column; a footing (nodes, own tests) | against worked examples in a public source | V1 |
| V4 | A bolted steel connection by interfaces | edge and spacing refused when too close; the bolts chosen | 01 I10, V1 |
| V5 | Culvert under a road; road cross-section by FHWA's criteria | the starter board runs; figures sourced | V2 |
| V6 | The IFC reader; a real IFC 4.3 bridge opened and taken apart | an open sample file opens; its parts listed with their IFC types | 02 N3 |
| V7 | Every civil branch has a node | a test over the disciplines tree | V3 to V6 |

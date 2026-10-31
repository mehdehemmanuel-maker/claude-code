# Research (round 4): Parts that say what they need (self-describing interfaces in industry)
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

## (A) Findings

### A0. Nexus itself, checked in the code this pass (the most urgent finding)

- [C] (code: `src/ganglia/units.ts`, `src/nexus/blocks.ts` lines 268 to 282, `src/nexus/dataflow.ts` `convert`) Nexus's
  units carry six base-dimension exponents and a scale (plus an offset for °C and °F). A wire between two numeric
  ports is refused only when the dimensions differ (`blocks.ts`: "not the same kind of quantity"); when they agree it
  converts by scale. There is **no quantity kind**: anything sharing a dimension wires and converts silently.
- [C] (run this pass against a scratch copy of `units.ts`, no code changed) Concrete consequences:
  - `60 rpm` read in `Hz` gives **6.283 Hz**, not 1 Hz: `rpm` is defined as rad/s (scale 2π/60), `Hz` as 1/s, and
    radians are dimensionless, so a 2π error passes with no warning.
  - `1 Gy` converts to `1 Sv` (absorbed dose to dose equivalent with no radiation weighting factor).
  - `N m` (torque) and `J` (energy) are the same dimension and wire to each other.
  - `1 rad` converts to `100 %`.
  - `10 degC` converts to `283.15 K`: right for a temperature, wrong for a temperature *difference*; there is no
    `delta_degC`, so a ΔT port in °C fed to a ΔT port in K would be off by 273.15.
- [C] (same code) A port with no unit on either side wires to anything (`out.unit && inp.unit` must both be set before
  the dimension is checked). [I] A unitless port is therefore a hole in the key.
- [C] (code: `src/nexus/quantities.ts`) Nexus *does* already have quantity kinds, for laws: each law port maps to a
  `QuantityDef` (by dimension, then by the words of its name), and its header says "two quantities of one dimension (a
  torque and an energy, a stress and a pressure) are kept apart by what they are"; it lists `angular-speed` (rad/s)
  apart from `frequency` (Hz). But the wire check `canWire` in `blocks.ts` reads only units and dimensions, so the
  kinds that keep laws apart do not key the wires between nodes. [I] The fix is to extend this owner to the wire, not
  to write a second kind system.
- [I] This is exactly round 3's finding 12 ("make a wrong connection impossible") failing *inside* the dimension
  check: dimension is necessary, not sufficient. mp-units and ISO 80000 name the missing layer: the quantity kind.
  No block was found in this pass that wires rpm to Hz today; the hazard is latent, and grows as the AI wires boards.

### A1. Unit and dimension type systems

- [C] mp-units (C++20, MIT, candidate for C++29 as P3045) adds **quantity kind safety** on top of dimensional analysis:
  frequency (Hz) ≠ activity (Bq), absorbed dose (Gy) ≠ dose equivalent (Sv), plane angle (rad) ≠ solid angle (sr);
  built on the ISO 80000 International System of Quantities as a *hierarchy* (`isq::height` is a kind of
  `isq::length`). https://github.com/mpusz/mp-units
- [C] In P3045, `isq::height` is not implicitly or explicitly convertible to `isq::width`, only castable by a visible
  `quantity_cast`; yet width and height are of the same kind (length), so per ISO/IEC Guide 99 they may be compared,
  added and subtracted, the sum being plain `isq::length`. https://isocpp.org/files/papers/P3045R4.html
  [I] So there are three levels: dimension (L), kind (length), and specific quantity (height, width, wall thickness,
  thread pitch). Ports should key on the specific quantity, wires convert within a kind only through a visible node,
  and arithmetic falls back to the common parent.
- [C] mp-units' own history (ACCU 2023 talk): its first design (`quantity_kind` as separate tags) "was not
  composable"; the redesign used a quantity hierarchy. https://accu.org/conf-docs/PDFs_2023/XmpunitsLessonslearnedandanewlibrarydesign.pdf
  [I] A flat list of kinds will fail the same way; Nexus should start from a tree.
- [C] F# units of measure are checked at compile time and **erased** at run time: no `ToString` of the unit is
  possible, and nothing depending on run-time unit checks can be written.
  https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/units-of-measure
  [I] Nexus's graphs are built at run time (by people and by the agent), so compile-time systems (F#, mp-units,
  Boost.Units, nholthaus/units) give it the *model*, not the mechanism. The mechanism must be Pint-like: units as data
  carried on every wire and checked at connection time.
- [C] Pint (Python) checks at run time and raises `DimensionalityError` on incompatible conversion and
  `OffsetUnitCalculusError` on ambiguous operations with offset units (°C); it has *contexts* that allow named,
  explicit cross-dimension conversions (e.g. spectroscopy wavelength to frequency).
  https://pint.readthedocs.io/en/0.12/developers_reference.html
  [I] A Pint "context" is the textbook form of "conversion only in a visible node" (round 3, finding 12).
- [M] Boost.Units (C++, 2008) was the first widely used zero-overhead dimension library; it models dimension and unit
  system, not kind. [M] UnitsML / IEC TS 62720 give units stable machine identifiers.
- [C] ECLASS unit IRDIs map 1:1 to IEC TS 62720 units published in the IEC CDD, and both rest on UnitsML.
  https://www.unitsml.org/adopters/iec-cdd

### A2. Property dictionaries as interface vocabularies (IEC 61360, IEC CDD, ECLASS)

- [C] IEC 61360 ("standard data element types with associated classification scheme") defines a general vocabulary
  as a reference dictionary; IEC 61360-4 is the IEC CDD; ECLASS and Industrie 4.0's property descriptions build on it.
  https://en.wikipedia.org/wiki/IEC_61360 ; https://tc3.iec.ch/tc-activity/common-data-dictionary-cdd
- [C] An ECLASS IRDI (ISO 29002) looks like `0173-1#02-AAB325#008`: issuer, type code (01 class, 02 property,
  05 unit, 07 value), item code, and **a version number in the identifier itself**.
  https://www.rastro.ai/resources/glossary/what-is-an-eclass-irdi
  [I] A versioned identifier per property is round 3's finding 13 (never change a published interface) made concrete.
- [C] IEC 61360 data types distinguish `INTEGER_MEASURE`, `INTEGER_COUNT` and `INTEGER_CURRENCY` (and REAL
  equivalents): a count is not a measure, even when both are integers.
  https://github.com/admin-shell-io/aas-specs-iec61360/blob/main/documentation/IDTA-01003-a/modules/ROOT/pages/specification.adoc
  [I] Nexus's `integer` type already exists; it should split count from measure (a bolt count is not a length in mm).
- [C] Using ECLASS needs a licence (free or paid by use case); BASIC is flat, ADVANCED has structured
  (multidimensional) properties and JSON. https://eclass.eu/en/eclass-standard/terms-of-use ;
  https://lemonmind.com/en/blog/what-is-eclass-system  [I] Nexus can *reference* IRDIs as `semanticId`s; whether it may
  ship ECLASS definitions is a licence question (see C).

### A3. Asset Administration Shell (AAS) and IDTA submodels

- [C] AAS metamodel: IDTA-01001; version 3.1 published May 2025 as open-source HTML; a v3.2 is online; the concept is
  standardised as IEC 63278-1:2023. https://industrialdigitaltwin.io/aas-specifications/IDTA-01001/v3.2/part-1-metamodel.pdf
- [C] Every submodel element is recommended to carry a `semanticId` pointing at a concept definition (ECLASS or IEC
  CDD IRDI, or an IRI); where none exists, a data specification can mirror IEC 61360 attributes (preferredName, unit).
  https://industrialdigitaltwin.org/wp-content/uploads/2024/06/IDTA-01001-3-0-1_SpecificationAssetAdministrationShell_Part1_Metamodel.pdf ;
  https://github.com/admin-shell-io/questions-and-answers
- [C] Two submodels with the same `semanticId` but administrative information that is not backward compatible **must
  have different ids**; the idShort typically stays. (Same IDTA-01001 v3.0.1 source.)
- [C] Templates versus instances: a submodel template (IDTA number, 02000 to 09999) is the schema (elements, semantic
  IDs, cardinalities); an instance is the populated data on one asset; tools validate instances against the template
  AASX. https://iotdigitaltwinplm.com/asset-administration-shell-submodels-2026 ; https://industrialdigitaltwin.org/en/content-hub/submodels
- [C] The IDTA template registry keeps deprecated versions listed beside the current ones (e.g. Hierarchical
  Structures enabling BoM 1.0 deprecated, 1.1.4 published; an IEC 81346 extension). It also lists Capability
  Description (02020), Sizing of Power Drive Trains (02021), Provision of 3D Models (02026), Asset Interfaces Mapping
  Configuration (02027). https://github.com/admin-shell-io/submodel-templates/blob/main/README.md
- [C] IDTA 02011 models hierarchy with Entities and RelationshipElements, including a `SameAs` relation between
  entities across submodels. https://industrialdigitaltwin.org/wp-content/uploads/2024/06/IDTA-02011-1-1_Submodel_HierarchicalStructuresEnablingBoM.pdf
  [I] `SameAs` is Nexus's "stored once, reused" across boards; a bolt in two assemblies is one entity referenced twice.
- [M] AAS has no first-class notion of a *mating* interface: a part's "needs from neighbours" can be written as
  properties, but no submodel template derives a hole from a bolt. [I] Nexus's interface record would be new content,
  publishable as a submodel template candidate.

### A4. OPC UA information models and companion specifications

- [C] OPC UA (IEC 62541) has a typed address space: nodes are instances of reusable `ObjectType`/`VariableType`s;
  companion specifications (e.g. OPC 40010 Robotics) define domain types plus a NodeSet XML; vendors **subtype**
  (`HasSubtype`) and add children without breaking a client that browses for the base type.
  https://iotdigitaltwinplm.com/opc-ua-companion-specifications-robotics-machinery-opc-40010-interoperability-2026
- [C] 2026-04-20: the OPC Foundation announced converting all 430+ companion specifications into RAG-, MCP- and
  REST-ready forms (Markdown, token-optimised chunks, embeddings), building on a UA-for-AI-Prototype repository.
  https://www.automation.com/article/opc-foundation-advances-opc-ua-ai-era-companion-specifications-optimized-agentic-ai
  [I] An industry consortium is shaping its interface vocabulary for agents: Nexus's in-app Claude could read these.
- [C] A formal mapping from OPC UA to RDF/OWL exists (Stuttgart, 2019), treating `HasTypeDefinition`, `HasComponent`,
  `HasProperty` as graph relations. https://www.ias.uni-stuttgart.de/dokumente/publikationen/2019_A_formal_mapping_between_OPC_UA_and_the_Semantic_Web.pdf
- [I] Subtyping-with-extension is the right rule for Nexus's interface kinds: a vendor's `motor.shaft.keyed` is a
  `shaft`, and anything that mates a `shaft` still mates it.

### A5. IO-Link IODD

- [C] An IODD is an XML file (zipped with pictures) describing the device's identity, parameters, process data,
  diagnostics and communication; masters can expose it as JSON over REST, MQTT or OPC UA.
  https://www.ifm.com/de/en/shared/io-link/technology/io-link-in-detail
- [C] Process data records carry a bit offset, and variables carry `gradient`, `offset`, `unitCode` and
  `displayFormat`; the IO-Link test specification checks these match across conditional process-data variants, and
  that `displayFormat` matches the datatype. https://io-link.com/fileadmin/user_upload/Downloads/Package_2015/IOL-Test-Spec_10032_V112_Jul14.pdf
  [I] The device ships its raw-to-physical conversion *and a conformance checker for its own description*. Nexus's
  interface records want the same: a validator that rejects a malformed record before any part uses it.
- [C] Profiles (e.g. Smart Sensor Profile, Common Profile 1.2, Jan 2024) standardise layouts across vendors.
  https://io-link.com/fileadmin/user_upload/Downloads/Package_2024/IO-Link_CommonProfile_V1.2_Jan2024.pdf

### A6. USB descriptors and device classes

- [C] A USB device describes itself by descriptors; class/subclass/protocol triples come from the USB-IF; 0xFF is
  vendor-specific; device class 0 means "defined at interface level"; many class codes "can only be used in Interface
  Descriptors". https://www.usb.org/defined-class-codes ; https://github.com/tmk/tmk_keyboard/wiki/USB:-Descriptor/7aec7fc30a54e27c3ef206b90e6e344bc364ba81
- [C] The Interface Association Descriptor groups several interfaces into one function (class EFh/02h/01h).
  https://www.usb.org/sites/default/files/iadclasscode_r10.pdf
- [I] Lessons: (1) a part declares *per interface*, not per part (a motor is a mechanical shaft, a flange, a power
  input and an encoder output); (2) a standard class lets a generic driver serve any vendor's device (a generic
  `ISO 4762 M8` hole serves every vendor's M8 cap screw); (3) a vendor-specific escape hatch (0xFF) is always present,
  and must be visibly so.

### A7. MIDI 2.0: MIDI-CI, Profiles, Property Exchange

- [C] MIDI-CI is bidirectional negotiation for autoconfiguration; devices **default to MIDI 1.0** and only use extended
  features after both agree; three areas: protocol negotiation, profile configuration, property exchange (JSON in SysEx).
  https://midi.org/details-about-midi-2-0-midi-ci-profiles-and-property-exchange-updated-june-2023 ;
  https://datahacker.blog/files/86/MIDI-20-Specifications/92/MIDI-20-Specification-Overview.pdf
- [C] Property Exchange starts with a `ResourceList` the initiator reads first, then gets/sets resources in full or
  in part; initiator and responder roles. https://atsushieno.github.io/2024/01/26/midi-ci-tools.html ;
  https://developer.apple.com/documentation/coremidi/midi-capability-inquiry
- [I] "Fall back to the old form until both sides agree" is the mating rule for versioned interfaces: two parts mate
  on the highest interface version both declare, and an old part with no record still mates by its old `Port`
  (spec 01's R2 already reads old forms; MIDI-CI says how to *negotiate* between them).

### A8. STEP AP242 (PMI, kinematics, holes)

- [C] ISO 10303-242 edition 2 (April 2020) adds semantic PMI, kinematics, electrical harness; edition 1 (2014) had
  ~533 new definitions for kinematics, assembly constraints and PMI; edition 2 ~400 more, including **new types of hole
  features**; edition 3 published Dec 2022. https://www.prostep.org/mediathek/fact-sheets/iso-10303-242 ;
  https://steptools.com/docs/stp_aim/notes_ap242e2.html ; https://www.steptools.com/docs/stp_aim/notes_ap242e3.html
- [C] STEP Part 113 hole features include `counterbore_hole_definition`, `counterdrill_hole_definition`,
  `countersink_hole_definition`, each with `_occurrence` and `_occurrence_in_assembly`.
  http://www.steptools.com/docs/stp_aim/news_exp.html
  [I] A *definition* versus *occurrence* split is the same as Nexus's interface (standard-derived) versus its imprint
  on one host. Exporting Nexus's negatives as Part 113 holes would let other CAD read them as holes, not as faces.
- [C, conflicting] prostep ivip (fact sheet v15, Dec 2023) says edition 4 is *in development* (assembly PMI among its
  proposals); one secondary source says edition 4 was released in 2025 (https://dac.digital/step-ap242-and-pmi-explained-the-file-format-behind-model-based-manufacturing).
  Not resolved this pass.
- [C] STEP's rule is that changes should not break existing data files (steptools AP242e2 notes, above).

### A9. GD&T as the language of fit

- [M] ASME Y14.5-2018 and ISO 1101 / ISO 5459 express a feature's allowed variation relative to datums; ISO 286 sets
  fit grades (H7/h6); ISO 14405-1 defines what "size" means (two-point, envelope). [M] At maximum material condition a
  pin's *virtual condition* is its MMC size plus its position tolerance, and a hole's is its MMC size minus it: the
  functional gauge that guarantees assembly. [I] Virtual condition is the honest "negative" of a toleranced feature:
  a bolt's clearance hole should be sized so that hole virtual condition ≥ bolt virtual condition, which turns ISO 273's
  table into a check Nexus can explain ("why 9 mm for M8 medium: here is the position tolerance it allows").
- [M] The "fixed fastener" and "floating fastener" formulas (H = F + T and H = F + 2T, with H hole MMC, F fastener
  MMC, T position tolerance) are the textbook link between clearance-hole tables and positional tolerance.

### A10. Design for assembly (Boothroyd–Dewhurst)

- [C] Handling depends on α symmetry (about the insertion axis: the rotation after which the part looks the same) and
  β symmetry (about an axis perpendicular to it); a strap insertable one way has α = 360°, β = 180°, total 540°; the
  manual handling and insertion tables are coded by these and by size, grasp, access and vision.
  https://bpb-eu-w2.wpmucdn.com/blogs.brighton.ac.uk/dist/c/8330/files/2022/03/design_for_manual_assembly.pdf
- [C] DFA index = (N_min × t_a) / t_total, with t_a about 3 s (2.93 s); a worked example scores 7 %.
  https://www.wevolver.com/article/dfma-design-for-manufacturing-and-assembly-explained ; Brighton PDF above.
- [C, secondary] Penalty magnitudes quoted by a secondary guide (e.g. +4 s for no α symmetry) are not the original
  tables; use the handbook tables (Copyright Boothroyd Dewhurst, Inc.) only as sourced, licence permitting.
  https://www.fabflow.app/blog/design-for-assembly-dfa-complete-engineering-guide
- [I] DFA reads two ways for Nexus: (1) *make symmetric* where orientation does not matter (an interface with α = 90°
  mates in 4 ways and the solver should not care which); (2) *make decisively asymmetric* where it does (a key, a flat
  on a shaft, a pin offset off the bolt circle) so wrong orientation cannot assemble. Symmetry should be a declared
  field of each interface, and the solver's count of valid mating poses should equal it.
- [M] DFA's three questions for a part to stay separate (does it move relative to its neighbours? must it be a
  different material? must it be separate for assembly or service?) are a rule an agent can apply to an assembly.

### A11. Tsugite (Larsson, Yoshida, Umetani, Igarashi; UIST 2020)

- [C] Authors are four, not three: Maria Larsson, Hironori Yoshida, **Nobuyuki Umetani**, Takeo Igarashi; UIST 2020,
  pp. 317–327, DOI 10.1145/3379337.3415899. https://dl.acm.org/doi/10.1145/3379337.3415899 ; https://bk-wood.nl/tsugite-interactive-design-and-fabrication-of-wood-joints
- [C] The design space is a regular 3D voxel grid, each voxel owned by one timber, which allows real-time feedback and
  exhaustive combinatorial search; eight metrics: (a) connectivity, (b) bridging, (c) milling direction (fabricable from
  one direction), (d) checkerboard patterns, (e) slidability, (f) durability are binary, (g) contact area and
  (h) friction area are numerical. **A joint is valid if it passes the binary checks; valid joints are ranked by the
  numerical ones.** https://www.ma-la.com/tsugite/Tsugite_UIST20.pdf
- [C] Exhaustive counts for 3×3×3 joints: of 262,144 candidates per type, e.g. I-axial keeps 88,508 valid,
  L-perp only 54; each filter's rejections are tabulated. Friction is measured as *area*, not force ("would require
  physical testing"). (Same PDF.)
- [C] Designs are restricted to what a 3-axis mill can make, accounting for the cutter's size and freedom.
  https://www.techbriefs.com/component/content/article/38021-want-to-build-and-design-with-wood-new-software-simplifies-the-job
- [I] Tsugite's split, *gates then ranks*, is the pattern spec 01's checks want: a mate is refused on any failed gate
  and only then scored. Its honest note (area, not force) is a "cannot simulate" entry in spec 10's register.

### A12. LDraw snap metas (LDCad)

- [C] LDCad's `!LDCAD SNAP_CYL` describes holes and pens as a sequence of cylinder sections (`secs=R 8 2 R 6 16 R 8 2`:
  shape, radius, length), with `gender` (M pen, F hole), `caps`, `center`, `slide`, `pos`, `ori`, `grid` (e.g.
  `4 8 20 20`, optionally centred), `scale` and `mirror` handling. `SNAP_CLP` (clips, always female, tested against male
  cylinders), `SNAP_SPH` (ball joints; to be folded into `SNAP_GEN` in 1.5), a generic meta with a `bounding` shape
  for best-pair candidates. https://www.melkert.net/LDCad/tech/meta ; https://wiki.ldraw.org/wiki/Part_Snapping_Language_Extension
- [C] `slide=true` on either side lets a matched pair slide, and the docs warn it "can cause unwanted sliding of e.g. a
  stud inside an anti stud". (melkert.net, above.)
- [C] Snap data lives in a **shadow library**: separate files merged into official parts at load, not in the official
  parts; the goal is snap info for every official part (over 18,000). https://www.melkert.net/LDCad/tech/shadowLib ;
  https://github.com/RolandMelkert/LDCadShadowLibrary
- [C] The LDraw wiki now documents a "Part Snapping Language Extension" with the same metas without the `LDCAD` prefix
  (`0 !SNAP_CYL ...`), i.e. moving from one tool's metas toward a library standard. https://wiki.ldraw.org/wiki/Part_Snapping_Language_Extension
- [I] Three ideas Nexus lacks: (1) a profile *along the axis* (sections) as the key, so an axle hole and a round hole
  differ by shape code, not by a name; (2) mirroring rules declared with the interface; (3) interfaces kept in a
  shadow layer so a part from someone else's library can be given interfaces without editing it.

### A13. Patterns across all of these

- [I] Every mature system separates **vocabulary** (what a property means: IEC CDD, ECLASS, ISQ, USB class codes),
  **template** (which properties a kind must have: IDTA templates, companion specs, IO-Link profiles, MIDI profiles)
  and **instance** (this device's values). Spec 01's `Interface` record mixes the three; `kind`, `std` and `size` are
  instance fields with no template saying which sizes a `hole.clearance` must carry.
- [I] Every one identifies concepts by a **global, versioned id** (IRDI with version, IRI, NodeId with namespace,
  USB class triple) and never by display name. Spec 01's `kind` strings are local.
- [I] Every one has an **explicit vendor escape** (USB 0xFF, OPC UA subtypes, ECLASS free properties, IO-Link
  vendor-specific indices) that is visibly marked; none forbids extension, all make it visible.
- [I] Every one validates descriptions **before use** (IO-Link test spec, AASX template validation, USB-IF
  compliance). None trusts a device's self-description unchecked.
- [I] None of them (AAS, OPC UA, IODD, USB, MIDI) derives a physical negative; geometry-aware ones (AP242, LDCad,
  Tsugite) describe or check fit but do not derive the receiving feature from the standard. The plan's "advantage"
  claim (README) survives this pass.

## (B) What Nexus should take

1. **Rule (01, 09, 10): ports key on quantity kind, not dimension alone.** Extend the owner that already has kinds
   (`nexus/quantities.ts`) into an ISQ-style tree (dimension, then kind, then specific quantity), give every numeric
   port a quantity (not only law ports), and make `canWire` in `blocks.ts` refuse different kinds even when
   dimensions agree. No second kind system. Test cases from A0: rpm into Hz refused (or converted with 2π only through a visible
   "angular to cyclic" node); Gy into Sv refused; torque into energy refused; rad into % refused.
2. **Fix (10, small and factual): the rpm/Hz 2π.** Whatever the kind model, `60 rpm → Hz` must give 1 or be refused;
   add it as a failing test first. Same for `rev`, `deg`, `rad`, `%` being freely interconvertible.
3. **Rule (09, 10): affine versus difference temperatures.** Split `degC` (a point) from `delta_degC` (an interval),
   as Pint does; arithmetic on offset units refuses ambiguous forms (OffsetUnitCalculusError).
4. **Rule (01, 09): a unitless numeric port does not wire to a united one** except through a visible node; "no unit"
   must mean "dimensionless count or ratio, declared", not "anything".
5. **Data model (01, 10): count versus measure.** IEC 61360's INTEGER_COUNT versus INTEGER_MEASURE: a bolt count and
   a length in mm are both integers but never one kind.
6. **Node (09): a context node.** Pint's contexts as a node: an explicit, named, sourced conversion between kinds or
   dimensions (wavelength to frequency, rpm to rad/s, mass to weight at a stated g). The only way across a key.
7. **Data model (01): split vocabulary, template, instance.** An interface *kind definition* (template) lists the
   sizes it must carry, their quantities and units, its symmetry and its allowed mates; an interface *instance* fills
   them. `negativeOf` reads the template. Validated before any part uses it (IO-Link, AASX validation).
8. **Data model (01, 00): global, versioned ids for every interface kind and property.** `nexus:iface/hole.clearance#2`;
   a breaking change makes a new id (AAS rule), never edits the old; adapters between versions (round 3 finding 13).
   Where an IRDI exists (ECLASS, IEC CDD), carry it as `semanticId` beside our id.
9. **Rule (01): negotiate the highest common version, fall back to the old `Port`** (MIDI-CI). Spec 01's R2 (read old
   forms) becomes a negotiation with a recorded outcome on the mate.
10. **Rule (01): subtyping with extension** (OPC UA `HasSubtype`): a vendor kind derives from a standard one and
    mates wherever the base mates; extra fields are ignored by those who do not know them.
11. **Data model (01): per-interface declaration, not per-part** (USB): a motor is a shaft, a flange, a power port and
    a signal port, each its own record with its own key. A visible vendor escape (`kind: 'vendor:...'`) marked in the UI.
12. **Data model (01): declared symmetry on each interface** (Boothroyd α, β; LDCad grid). The solver counts valid
    mating poses and checks the count against the declared symmetry; a mismatch is a bug in the record.
13. **Check (01, 07): a DFA node** for assemblies: part count against N_min by the three questions, handling and
    insertion difficulty from symmetry, access and tool reach (already in `Keep`), the DFA index; sourced tables only.
14. **Check (01): keying as a design act.** When a mate is symmetric but the assembly needs one orientation, the agent
    proposes a key (offset pin, flat, keyway) and proves the wrong orientation no longer mates.
15. **Check (01, 10): gates then ranks** (Tsugite). Every mate check splits into binary gates (refuse) and numerical
    scores (rank); a joint, a fit or a placement is valid only if all gates pass.
16. **Node (01, joinery task in `tasks.json`): a voxel joint node** after Tsugite: grid, ownership per timber, the six
    gates (connectivity, bridging, single milling direction, checkerboard, slidability, durability) and the two scores;
    milling-tool radius as a host rule; friction recorded as "area only, not force" in spec 10's register.
17. **Data model (01): an axial profile key** (LDCad `secs`): a round, axle-cross or square section sequence along an
    interface's axis, so a cross-axle and a round pin differ by shape, and partial engagement (a pin half-inserted) is
    computable.
18. **Data model (01): mirroring rules on the interface** (LDCad `mirror`): what a mirrored part's interface becomes
    (a left-hand thread stays left-hand only if declared so).
19. **Way of working (01, 00): a shadow layer for interfaces** (LDCad shadow library): interfaces for parts we did not
    author (imported STEP, catalogue parts) live in a separate overlay keyed by part id, merged at load, never editing
    the source part.
20. **Rule (01): slide is declared and dangerous** (LDCad warning): a sliding joint only where at least one side says
    so, and the solver flags a slide that would let a stud travel through an anti-stud.
21. **Data model (01, 10): virtual condition for every toleranced interface** (GD&T). Clearance from fixed or floating
    fastener formula with the position tolerance stated; the ISO 273 table becomes a check with an explanation.
22. **Export (01, 03): negatives as STEP Part 113 hole features** (counterbore/countersink definition and occurrence)
    and kinematic pairs as AP242 kinematics, so Nexus's interfaces survive round trips into other CAD.
23. **Export (11, 07): an AAS view of a Nexus part**: Technical Data, Hierarchical Structures (BoM, with `SameAs` for
    reused parts), Provision of 3D Models; a Nexus "Interfaces" submodel as a candidate IDTA template (new content).
24. **Agent tool (00, 07): read OPC UA companion specs and IDTA templates** in their new RAG/MCP form as a sourced
    vocabulary the in-app Claude may cite, never invent.
25. **Constitution clause (00, 10): every self-description is validated before it is trusted** (IO-Link, USB-IF): an
    interface record, an imported IODD or AAS, or an agent-written part passes a schema and a consistency check first.

## (C) Questions

### Units and kinds (spec 09, 10)
1. Should Nexus adopt the ISQ (ISO 80000) quantity tree as data, or start with a smaller hand-built tree for the kinds its blocks use?
2. Is the angle a base dimension in Nexus (as some proposals for SI suggest) or a kind of dimensionless quantity?
3. Should rpm be cyclic (rev/min) or angular (rad/s) by definition, and which blocks today assume which?
4. Does any existing board wire an rpm output into a Hz input today, and would its result move by 2π if fixed?
5. Which existing ports carry temperature differences in °C, and do any convert to K through `convert`?
6. Should a ΔT port be a separate quantity, a flag on the port, or inferred from the block's law?
7. How should a unitless port be declared: `1`, `-`, a named ratio, or a count?
8. Should width + height give length (mp-units), or should Nexus refuse adding different specific quantities?
9. Where does a quantity cast live in a board: a node, a wire annotation, or a field on the receiving port?
10. Are money units a kind in the tree, and are currencies convertible only through a sourced, dated rate node?
11. How should kinds be shown on a wire so a person sees "torque" versus "energy" at a glance?
12. Should the AI be allowed to insert a context (conversion) node without the person's approval?
13. Do laws in `lawgraph.ts` declare specific quantities (wall thickness, not length) for their inputs?
14. How many units in `units.ts` share a dimension but differ in kind, and is the list complete?
15. Should Gy and Sv conversion be refused outright or allowed only through a weighting-factor node with a source?
16. What is the cost of a kind check per wire on a large board, and does it need caching?

### Interface records and vocabularies (spec 01)
17. What sizes must each interface kind carry (the template), and who writes the first fifteen templates?
18. Should interface kind ids be IRIs, IRDI-like codes, or plain strings with a version suffix?
19. Can Nexus legally ship ECLASS property definitions, or only reference their IRDIs?
20. Does the IEC CDD give free access to the ISO 273 or ISO 4762 properties as data elements?
21. Which ECLASS or IEC CDD properties already exist for thread size, clearance hole and counterbore depth?
22. How is a breaking change to an interface template detected automatically?
23. Should an adapter between interface versions be a node, a function in the template, or a stored part?
24. How does a part declare a vendor-specific interface, and how is it shown as such in the UI?
25. When a vendor subtype mates a base kind, which fields are dropped, and is the person told?
26. Should a motor's mechanical, electrical and signal interfaces live in one record list or in separate ones per medium?
27. How do interface records relate to the effort-and-flow ports of spec 09: one record, or two linked?
28. Is "per-interface declaration" enough, or do some parts need a USB-style association grouping interfaces into a function?
29. What validator runs on an interface record, and when (on save, on load, on mate)?
30. Should every interface carry a `semanticId` list (ours plus external) like AAS?

### Mating, symmetry, keys (spec 01, 09)
31. How is α and β symmetry computed from an interface's pattern, and does it match a person's intuition?
32. When a pattern's symmetry allows several poses, which does the solver pick, and is it stable across runs?
33. How does the agent decide that an orientation matters and a key is needed?
34. Which keying features does Nexus offer: offset pin, flat, keyway, D-shaft, unequal bolt circle?
35. How does the solver prove a wrong orientation cannot mate after a key is added?
36. How does mating negotiate interface versions, and where is the outcome recorded?
37. Should a half-inserted pin (partial engagement) be a state the solver can hold?
38. How are LDCad-style axial profiles (sections) represented for threads, splines and tapers?
39. What happens to an interface when its part is mirrored: which kinds flip handedness?
40. Where do "slide" declarations come from for bearings, linear rails and dovetails?
41. Can the solver detect a slide that passes one feature through another (stud through anti-stud)?

### Fit and tolerance (spec 01, 10)
42. Which GD&T concepts does Nexus need first: position, MMC, virtual condition, datums?
43. Should clearance holes be computed from the floating-fastener formula or read from ISO 273 and checked against it?
44. What position tolerance does Nexus assume when a person states none?
45. How does a fit grade (H7/h6) become an interval on the interface sizes (spec 10's interval mode)?
46. Does ISO 14405-1's notion of size (two-point versus envelope) matter for any mate Nexus makes?
47. How are tolerance stacks across a chain of mates computed and shown?

### Joinery and fabrication (spec 01 joinery task)
48. Should the voxel joint node reuse Tsugite's open code, if its licence allows, or reimplement it?
49. What voxel resolution suits Nexus's timber joints, and does exhaustive search stay fast enough in the browser?
50. How is Tsugite's durability check (short grain) represented when the material is not wood?
51. How does the milling-tool radius become a host rule in `negativeOf`?
52. Can Tsugite's "single milling direction" gate be generalised to any tool access check in `Keep`?
53. Should friction area be passed to Jolt's contact model, and with what honest limits?

### Assembly (DFA) (spec 01, 07)
54. Can the Boothroyd–Dewhurst handling and insertion tables be used, given their copyright?
55. Is there an open, sourced set of assembly time standards (MTM, MOST) Nexus could use instead?
56. How does the agent answer DFA's three questions for a part automatically?
57. Should the DFA index be shown on every assembly node, or only on request?
58. How does tool access for fastening (wrench room) feed DFA's insertion difficulty?

### Exchange and standards (spec 01, 03, 11)
59. Can replicad/OpenCascade write STEP Part 113 hole features, or only plain faces?
60. Is AP242 edition 4 published, and what does its assembly PMI add?
61. Which AAS submodel templates are worth emitting first for a Nexus part?
62. Is a Nexus "Interfaces" submodel a plausible IDTA template candidate, and what is the review process?
63. Can the in-app Claude read the OPC Foundation's RAG/MCP companion specifications, and under what licence?
64. Should Nexus import IODD files to make sensor parts with real process data and units?
65. Should Nexus import LDraw parts with their snap metas as a test set for interface mating?
66. How does a shadow layer of interfaces stay in step when the source part changes?
67. How does Nexus map its interface kinds to AP242 kinematic pairs (revolute, prismatic, cylindrical)?

### Trust (spec 10)
68. Which self-descriptions does Nexus trust without validation today, and which should it stop trusting?
69. Should an imported device description (IODD, AAS) carry "manufacturer-stated" status until checked?
70. How is a malformed interface record reported to the person and to the agent?

## (D) New branches

- ISO 80000 parts 1 to 13 as a data file: is there an open machine-readable ISQ (mp-units' ISQ definitions, QUDT quantity kinds)?
- QUDT (Quantities, Units, Dimensions and Types) ontology: quantity kinds as RDF, a ready-made kind tree with licence to check.
- The SI Digital Framework (BIPM) and D-SI: machine-readable SI and measurement metadata.
- W3C Web of Things Thing Description, and IDTA 02017 Asset Interfaces Description that wraps it.
- AutomationML (IEC 62714) interface classes and its "ExternalInterface" concept: CAEX ports that link plant objects.
- Modelica connectors (`flow`, `stream`) as the oldest typed physical port standard, and the Modelica Standard Library's SIunits.
- FMI 3.0 terminals and icons: how co-simulation units declare grouped connectors.
- SysML v2 ports, interfaces and quantity kinds (ISQ library inside SysML v2).
- IEC 81346 reference designations: structural ids for parts in a plant, and the IDTA BoM extension built on it.
- GS1 and the EU Digital Product Passport: product self-description reaching consumers.
- LeoCAD and BrickLink Studio connection data, compared with LDCad's snap metas (still open from round 3).
- The Tsugite source code (released on GitHub?) and Larsson's later work on joints (e.g. curved or non-orthogonal joinery).
- Assembly sequence planning from interface data (disassembly graphs, AND/OR graphs; Homem de Mello and Sanderson).
- Poka-yoke catalogues (Shingo) as a library of keying features for the agent to propose.
- ISO 2768 general tolerances as the default when a person states none.
- Bluetooth GATT and the assigned numbers registry: another self-describing device vocabulary with UUIDs.
- CANopen EDS / device profiles (CiA 402) and EtherCAT ESI: drive self-description beside IO-Link.
- Units checking in TypeScript (branded types, template-literal types) for Nexus's own code, distinct from the run-time check on wires.
- The 2π problem in the SI (proposals to make the radian a base unit; Quincey, Mohr): a sourced basis for decision B2.
- MTM (Methods-Time Measurement) as an openly described alternative to proprietary DFA time tables.

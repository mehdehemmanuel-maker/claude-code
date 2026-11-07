# Research (round 5): Quantity kinds done right
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Scope: the wire defect found in round 4 (synthesis finding 20, spec 10 task T11). Round 18 already established the
defect, named mp-units, F#, Pint, Boost.Units and IEC 61360 count-versus-measure, and proposed rules 1 to 6 (kind on
ports, the 2π fix, affine temperatures, unitless ports, count versus measure, a context node). This pass does not
repeat those. It goes to the primary texts (SI Brochure, VIM, Modelica spec, QUDT, UCUM, mp-units' affine space and
safety levels), the radian debate through 2026, logarithmic units, spreadsheets and the two classic accidents, then
reads Nexus's code again and says how the fix should be built.

## (A) Findings

### A0. What Nexus's code does today (read again this pass, no code changed)

- [C] (code: `src/ganglia/units.ts`) A `UnitDef` is `{ dim, scale, offset? }` over six exponents (M, L, T, I, Θ, N).
  `rad`, `rev` (2π), `deg` (π/180), `%` (0.01), `dB` (scale 1) and `'1'`/`'-'` are all `DIMLESS`. `rpm` is
  `T⁻¹` with scale 2π/60, so it is defined as *radians* per second; `Hz` is `T⁻¹` with scale 1. `Gy` and `Sv` are the
  same entry. `degC`/`degF` carry an offset; `parseUnit` keeps the offset only for a single factor with power 1, so
  `degC/min` is silently a difference (the same rule as Pint's delta-in-multiplicative-context, A6).
- [C] (code) `rad` is the radian, but `krad` is the kilo-*rad* of dose (scale 10 J/kg). One symbol root, two
  quantities: "500 rad" said of a dose is read as 500 radians. UCUM avoids exactly this by spelling the dose unit `RAD`
  (A3).
- [C] (code) `dB` with scale 1 means 20 dB converts to the plain number 20 and 50 % converts to 0.5 dB. A level is a
  logarithm, not a linear ratio (A8); every conversion involving `dB` today is wrong.
- [C] (code: `src/nexus/blocks.ts`, `fits`) A number-to-number wire is checked only when both units are set *and the
  strings differ*; then only `sameDim`. A missing unit on either side passes. A unit the parser does not know (`°`,
  `px`, `AWG`, `NEMA` all appear in part axes and records today) makes `dimOf` return null and the wire is refused
  unless the strings are identical: `°` cannot feed `rad`, though it should with a conversion.
- [C] (code: `src/nexus/dataflow.ts`, `convert`) Conversion on the wire is `fromSI(toSI(x, from), to)`, which always
  applies the offset: a ΔT of 10 °C becomes 283.15 K.
- [C] (code: `src/nexus/quantities.ts`) The kinds exist, for law ports only: `angle` beside `ratio`, `angular-speed`
  (rad/s) beside `frequency` (Hz), `torque` beside `energy`, `temperature-difference` beside `temperature`, `stress`
  beside `pressure` beside `modulus`. Each `QuantityDef` has an id, a unit, a dimension, words and a `general` flag;
  the order "narrow before general" stands in for a hierarchy. Missing: no dose equivalent (a port named "dose" in Sv
  maps to `absorbed-dose` by its words), no rotational frequency, no level (dB), no point-versus-difference flag, no
  list of units that apply, no parent. `PortDef` in `blocks.ts` has no `quantity` field at all.
- [C] (code) Pre-existing unitless numeric ports that are really counts: gear `teeth` and spring `body coils` axes
  carry unit `''` in `kinds/motion.ts`.

### A1. The standards say dimension is not kind

- [C] VIM (JCGM 200:2008, 1.2 Note 2): "quantities of the same dimension are not necessarily of the same kind.
  EXAMPLE The quantities moment of force and energy are, by convention, not regarded as being of the same kind,
  although they have the same dimension. Similarly for heat capacity and entropy, as well as for number of entities,
  relative permeability, and mass fraction." https://www.iso.org/sites/JCGM/VIM/JCGM_200e_FILES/MAIN_JCGM_200e/01_e.html
  ISO 80000-1:2009 carries the same text (clause 3.2). https://standards.iteh.ai/catalog/standards/iso/3621acd9-0931-4825-961f-cd9b1772e90f/iso-80000-1-2009
  [I] The VIM's own examples include three *dimensionless* quantities of different kinds (a count, a relative
  permeability, a mass fraction). So "unit 1" is not one kind; a unitless port must still declare which.
- [C] ISO 80000-1 (quoted in mp-units' docs): "Two or more quantities cannot be added or subtracted unless they belong
  to the same category of mutually comparable quantities." https://mpusz.github.io/mp-units/2.0/users_guide/framework_basics/systems_of_quantities
- [C] SI Brochure, 9th ed. (v4.01): "the joule is never used for expressing torque"; "The hertz shall only be used
  for periodic phenomena and the becquerel shall only be used for stochastic processes"; frequency and angular
  frequency "by definition ... differ by a factor of 2π ... Ignoring this fact may cause an error of 2π"; "cycle",
  "cps", "revolution" and "rev" "are not units in the SI"; quantities called frequency, angular frequency and angular
  velocity should "always be given explicit units of Hz or rad/s and not s⁻¹"; gray and sievert were "specifically
  introduced because of the dangers to human health that might arise from mistakes" between the quantities sharing
  J/kg; "The numerical value of a temperature difference ... is the same when expressed in either degrees Celsius or
  in kelvins". https://www.bipm.org/documents/20126/41483022/SI-Brochure-9-EN.pdf
- [C] Same brochure (draft text, kept in the 9th ed.): "It is therefore important not to use the unit alone to
  specify the quantity. This applies ... to measuring instruments (i.e. the instrument read-out needs to indicate
  both the unit and the quantity measured)." https://web.phys.ntnu.no/~stovneng/si-brochure-draft-2016b.pdf
  [I] That sentence is the spec for Nexus's port label: every numeric value is shown with its quantity and its unit,
  and the wire check reads the quantity, not the unit.
- [C] SI Brochure 8th ed. (still the reasoning behind the 9th): radian and steradian "are special names for the
  number one that may be used to convey information about the quantity concerned"; neper, bel and decibel are the
  special names of one for logarithmic ratio quantities. https://pierre.ag.gerard.web.ulb.be/fichiers_vrac/si_brochure_8_en.pdf

### A2. QUDT: kinds as data, with units attached to kinds

- [C] QUDT is CC BY 4.0 (attribution to QUDT.org); UCUM codes inside it are under UCUM's own licence.
  https://github.com/qudt/qudt-public-repo ; last updated 2026-09-15 per https://qudt.org
- [C] Its core pattern: a `QuantityKind` has a `QuantityKindDimensionVector` (e.g. `A0E0L1I0M0H0T-2D0`, eight
  exponents: amount, current, length, luminous intensity, mass, temperature, time, and D for "dimensionless ratio")
  and a list of `qudt:applicableUnit`s; kinds form trees by `skos:broader` / `qudt:specializationOf`, browsable in a
  Subtree Viewer. https://www.semanticarts.com/the-abcs-of-qudt ; https://qudt.org
- [C] `quantitykind:Torque` is its own kind, `exactMatch` `MomentOfForce`, dimension `A0E0L2I0M1H0T-2D0` (same as
  Energy), 17 applicable units (N·m, lbf·in, kgf·m, ... and a unit `FT-LB_F_Torque` kept apart from the energy
  foot-pound), with an ECLASS code and an IEC 61360 code; its definition is τ = M·e_Q (the moment's component along an
  axis). https://qudt.org/vocab/quantitykind/Torque
  [I] QUDT solves torque/energy by putting units under kinds, and even duplicating a unit (ft·lbf) per kind where the
  world uses one symbol for two kinds. That is the pattern Nexus needs: the kind owns the list of units it may be
  written in, and a unit's symbol alone never decides the kind.
  [I] QUDT's "D" exponent is a flag for "this is a ratio of like quantities" (rad = m/m), a cheap trick Nexus could
  copy to keep angle and plain number apart without making the radian a base unit.

### A3. UCUM: the radian *is* a base unit, and special units are functions

- [C] UCUM's seven base units are metre, second, gram, coulomb, kelvin, candela and **radian**; UCUM is "compatible
  with, but not isomorphic with, SI"; steradian is `rad2`. https://en.wikipedia.org/wiki/Unified_Code_for_Units_of_Measure
- [C] UCUM's table: `Cel` (degree Celsius) is defined as `cel(1 K)`, a function, not a scale; "special units" are
  those on non-ratio scales (bel, degree Celsius); `Gy` and `Sv` both `J/kg`; the dose rad is `RAD`/`[RAD]` (100 erg/g)
  and rem `REM`, kept apart from `rad`. https://ucum.org/ucum
- [C] UCUM has logarithmic units with their reference in the symbol: `B[W]`, `B[kW]`, `B[V]`, `B[mV]`, `B[SPL]`, and
  `Np`. https://build.fhir.org/ig/HL7/UTG/en/ValueSet-ucum-common.html
- [C] UCUM has procedure-defined units: `[arb'U]`, `[IU]`, `[CFU]`, allergy units. https://www.fda.gov/industry/structured-product-labeling-resources/units-measure
  [M] UCUM states that arbitrary units are not commensurable with any other unit, including others of their own name.
  [I] That is the right semantics for Nexus's `px`, `AWG`, `NEMA` sizes: a label that matches only itself, never
  silently convertible, but known (so `px` is not "unknown unit").
- [M] UCUM is the unit code in HL7 FHIR and LOINC, so medical data Nexus imports will arrive in UCUM codes.

### A4. Modelica: the `quantity` attribute constrains connections, and empty means "anything"

- [C] Modelica 3.8-dev §4: `Real` has `quantity`, `unit` and `displayUnit` attributes; "The quantity-attribute is
  used to impose a constraint on connection sets"; an empty `unit` in a function lets calls use different units, and
  for a non-function component "allows the unit ... to be inferred by the tool". https://specification.modelica.org/master/class-predefined-types-and-declarations.html
- [C] Modelica §9.3: "In a connection set, all variables having non-empty quantity-attribute must have the same
  quantity-attribute. [Note that variables with different quantities may be unit-compatible, as seen in the example
  of work and torque. It is also possible to include medium-information in the quantity to detect connections between
  different liquids.]" https://specification.modelica.org/master/connectors-and-connections.html
- [C] The library declares `type Torque = Real(final quantity = "Torque", final unit = "N.m")`, and `MomentOfForce`
  extends it. https://doc.modelica.org/om/Modelica.SIunits.Torque.html ; https://git.openmodelica.org/Documentation/Modelica@master.Units.SI.Torque.html
  [I] Two lessons. (1) Modelica keys connections on a quantity string beside the unit: the same split Nexus needs.
  (2) Modelica's empty quantity is a wildcard, which is the same hole Nexus has with an empty unit. Nexus should take
  the first and refuse the second: a number with no declared quantity is an error in the block, not a free pass.
  (3) "Medium in the quantity" is a hint that kinds can carry a material or a fluid (water versus oil pressure), which
  is spec 01's interface key, not only spec 10's.

### A5. mp-units: kinds in a tree, points apart from deltas, six levels of safety

- [C] mp-units lists the ISQ quantities of dimension T⁻¹ as separate specifications: angular_velocity [rad/s],
  frequency [Hz], rotational_frequency (rotation / duration) [1/s], angular_frequency (phase_angle / duration)
  [rad/s], damping_coefficient, activity [Bq], transfer_rate, bit rate, call intensity, modulation_rate [Bd]. Units
  name the kind they are for: `radian : named_unit<"rad", metre/metre, kind_of<isq::angular_measure>>`,
  `hertz : named_unit<"Hz", 1/second, kind_of<isq::frequency>>`; the joule and newton carry no kind. Its first
  design, separate kind tags, "was not composable"; the redesign is a hierarchy with `kind_of<QS>` for "any quantity
  of this tree". https://accu.org/conf-docs/PDFs_2023/XmpunitsLessonslearnedandanewlibrarydesign.pdf
- [C] The kind hierarchy of length in ISO 80000 as mp-units draws it: length → width (→ thickness, diameter, radius
  → radius of curvature), height/depth/altitude, path length → distance → radial distance, wavelength, position
  vector, displacement. https://mpusz.github.io/mp-units/2.0/users_guide/framework_basics/systems_of_quantities
  [I] Nexus's ports already speak at the leaf level ("wall thickness", "pitch diameter", "radius"); the tree gives the
  rule for which may feed which without a list of special cases.
- [C] Affine space: `quantity_point` (a point from an origin) is a different type from `quantity` (a displacement);
  units with a point origin (K, °C, °F) refuse the multiply syntax, so `42 * deg_C` does not compile and the author
  must write `point<deg_C>(42)` or `delta<deg_C>(42)`; points measured from different named origins cannot be mixed;
  `zeroth_degree_Celsius` is a relative origin 273.15 K above `absolute_zero`; a user can define their own origin
  (a room reference temperature). https://mpusz.github.io/mp-units/latest/users_guide/framework_basics/the_affine_space ;
  https://mpusz.github.io/mp-units/2.3/blog/2024/06/14/mp-units-220-released
- [C] mp-units' 2026-03-23 essay names six safety levels: dimension, unit, representation, quantity kind, quantity
  (hierarchy and equations), and mathematical space (point/absolute/delta). Unit safety alone cannot stop rad/sr,
  Hz/Bq, Gy/Sv mixing "despite being physically meaningless"; V3 adds a third space, **absolute** quantities on a ratio
  scale (a mass cannot go negative), with `(total - used).absolute()` checked at run time. Its comparison table rates
  Pint as having no kind safety and only temperature-specific deltas, Unitful as no kind safety and an `AffineQuantity`
  for °C/°F with `@affineunit` for custom ones. https://mpusz.github.io/mp-units/HEAD/blog/2026/03/23/understanding-safety-levels-in-physical-units-libraries
  [I] Nexus today has level 1 only (dimension), plus a scale. The fix in T11 is levels 4 and 6; level 5 (a radius may
  feed a length, not the other way) and the V3 "absolute" space (a non-negative mass) are the next layer and cheap to
  add once ports carry a quantity id.
- [C] mp-units is the basis of the C++29 standardisation proposal P3045. https://isocpp.org/files/papers/P3045R4.html

### A6. Pint, Unitful.jl, Frink, Boost.Units, F#: what run-time and compile-time libraries do

- [C] **Pint has Nexus's exact bug and documents it**: "Since pint treats angle quantities as dimensionless, it allows
  conversions between frequencies and angular frequencies ... `ureg('60rpm').to('Hz')` → 6.28318531 hertz".
  https://pint.readthedocs.io/en/0.25.2/user/angular_frequency.html
  [I] Nexus's `units.ts` follows Pint's model (dimensionless radian, rpm as rad/s), and inherited the flaw Pint warns
  about in its own docs. Copying a library's model means copying its known failures; the fix must add what Pint lacks.
- [C] Pint's offset rules: `degC` alone is an offset unit, but in a multiplicative context the parser reads
  `delta_degree_Celsius` (`degC/meter`); adding a heating rate in K/min to a °C point raises
  `OffsetUnitCalculusError` unless one side is converted; `autoconvert_offset_to_baseunit=True` relaxes this.
  https://pint.readthedocs.io/en/stable/user/nonmult.html
- [C] Pint's log units (dB, dBm, octave, decade) are "in Beta"; "the dB unit is defined for power quantities
  (10 log(p/p0)) not field (amplitude) quantities (20 log(v/v0))"; they need the autoconvert flag.
  https://pint.readthedocs.io/en/stable/user/log_units.html
- [C] Unitful.jl: "the units °C and °F cannot be used in Unitful to represent temperature differences ... 1°C − 0°C
  == 1K"; invalid operations raise `AffineError: ... Use K for temperature differences`.
  http://juliaphysics.github.io/Unitful.jl/stable ; https://github.com/PainterQubits/Unitful.jl/issues/200
  [C] Users push back: summing daily °C for growing degree-days raises AffineError; the community answer is "measured
  temperature in °C or K, differences in K". https://discourse.julialang.org/t/sum-of-temperature-values-with-unitful-jl/104714
  [I] Degree-days are a real engineering quantity (heating loads), and they are a sum of *differences* from a base
  temperature. The affine rule is right; Nexus needs a "subtract a base" node so the user is never stuck.
- [C] Frink: radians are dimensionless in the standard data file, so "1.2" passes as an angle; "make the minor change
  in your units file to make radians a fundamental dimension". https://frinklang.org
- [C] Boost.Units has `plane_angle_base_dimension`: a plane angle is a base dimension, with radian, degree and gradian
  systems. http://boost.cowic.de/rc/pdf/units.pdf
  [I] So three of the oldest systems (UCUM, Boost.Units, Frink as an option) make angle a dimension; the SI, Pint,
  Unitful and Nexus do not. That choice decides whether rpm→Hz is a dimension error or a kind error.
- [M] F# units of measure: `float<N m>` and `float<J>` are the same type when J is defined as kg m²/s², so F# has no
  kind safety; units are erased at run time (round 18 [C]). Andrew Kennedy's dimension types (1990s thesis) are the
  theory under it.

### A7. The radian question, through 2026

- [C] Mohr and Phillips, "Dimensionless units in the SI", Metrologia 52 (2015) 40; Mohr's proposal: "Hz, i.e.
  cycles/second, explicitly includes the non-SI unit cycle and is therefore not a coherent SI unit. Instead,
  radians/second is the coherent SI unit for frequency"; the dropping of rad and cycle "may be omitted leading to an
  inconsistent result". https://ar5iv.labs.arxiv.org/html/1604.06774
- [C] Quincey, "Angles in the SI: a detailed proposal for solving the problem", Metrologia 2021/22: two classes of
  proposal; making radius "metres per radian" breaks πr²; introducing a dimensional angle constant is "logically
  rigorous" but requires "the modification of many familiar mathematical and physical equations".
  https://en.wikipedia.org/wiki/Radian ; https://www.semanticscholar.org/paper/Angles-in-the-SI%3A-a-detailed-proposal-for-solving-Quincey/27c330a44aba21e7251eecd8b7a44a95c5a6c1fe
- [C] Mohr, Shirley, Phillips, Trott, "On the dimension of angles and their units", Metrologia 59 (2022) 053001;
  Leonard 2021 (Metrologia 58 052001); Kalinin 2019 (Metrologia 56 065009); and a counter-view that "radian is just
  an alias for the number one ... the radian cannot be a base unit". https://en.wikipedia.org/wiki/Angle ;
  https://www.zib.de/userpage/groetschel/pubnew/geometry-opinion-comment.pdf
- [C] CCU 2021 reached no consensus (a few members argued for a base unit, the majority for the status quo); the CCU
  Task Group on angle and dimensionless quantities in the SI Brochure (chair R. J. C. Brown, NPL) had a focus group on
  "counting and number quantities", and was dissolved in May 2024 having completed its task.
  https://www.bipm.org/en/committees/cc/ccu/wg/ccu-tg-adqsib ; https://en.wikipedia.org/wiki/Radian
- [C] Lewis and Coveney (NPL), Metrologia 63 (2026) 023002, "Angles in the SI—a practical dimensional metrologist
  viewpoint": propose "The SI base unit for plane angle is the radian. There are 2π radians in a full rotation", with
  2π as its defining constant; argue rotation is physically distinct and "one can measure an angle as a ratio of
  lengths, but not all length ratios are angles". https://eprintspublications.npl.co.uk/10540/1/eid10540.pdf
  [I] The SI will not change soon and the debate is live. Nexus must not wait for it: a kind layer gives every safety
  the base-unit proposals give (rpm≠Hz, rad≠%) without rewriting any law (Quincey's cost), and can be swapped for an
  angle dimension later if the SI moves.

### A8. Logarithmic units

- [C] NIST SP 811 (after IEC 60027-3): level of a field quantity L_F = ln(F/F₀) Np; level of a power quantity
  L_P = ½ ln(P/P₀) Np; 1 B is the level when P/P₀ = 10; "it is important that the nature of the quantity be
  specified, and that any reference value used be specified"; neper and bel are accepted for use with the SI, not SI
  units. https://web.ist.utl.pt/~mcasquilho/acad/errors/NIST_sp811-1.pdf
- [C] 1 dB = 0.11513 Np; 1 Np = 8.68589 dB; 1 dB is a power ratio of 1.25893 but a root-power ratio of 1.12202.
  https://en.wikipedia.org/wiki/Decibel
  [I] A level is a (kind, reference, power-or-field) triple. "dB" alone is incomplete; "dB re 1 mW" (dBm),
  "dB re 20 µPa" (SPL), "dB(A)" (weighted) are different quantities. A level never adds to a level linearly
  (two 60 dB sources make 63 dB, not 120), so `sum` blocks must refuse levels.

### A9. Spreadsheets: the largest unit-checked programming population, and why checking needs inference

- [C] Chambers and Erwig's dimension inference add-in for Excel found dimension errors "in almost 50% of the
  investigated spreadsheets". https://web.engr.oregonstate.edu/~erwig/papers/DimensionInference_VLHCC08.pdf
- [C] UCheck (Abraham and Erwig) infers headers and units automatically and reports cells whose units do not reduce
  to a well-formed unit; XeLda needs every cell annotated. https://web.engr.oregonstate.edu/~erwig/papers/UCheck_JVLC07.pdf
- [C] Williams et al. 2020 ("Understanding and Inferring Units in Spreadsheets"): in a hand-labelled subset of EUSES,
  456 of 823 workbooks with formulas contained a unit tag; units are often only indirect ("Credit Card Charges"
  means currency); word embeddings raised unit-inference recall by 30 % at some cost in precision.
  https://advait.org/files/williams_2020_inferring_units.pdf
  [I] The annotation burden is what defeats unit checking in practice. Nexus already infers kinds from port words for
  laws (`quantityOf`); the same inference should *propose* a quantity for every unlabelled block port and the test
  should fail until it is confirmed, never silently default.

### A10. Studies of unit libraries and kinds in code

- [C] McKeever and colleagues survey unit-of-measurement libraries (MODELSWARD 2019; Software: Practice and
  Experience 2020) and propose "named quantity" rules: multiplication creates a new quantity so "information is lost
  in intermediate stages", recovered by "functions, whose return KOQ are known"; "None of the current methodologies
  for managing quantities perform this kind of quantity checking" (adding torque to work). A user quoted: "our users
  may very well have one file whose units are 'kg · m3', another ... 'g cc' and a third ... 'degrees Celsius'. We
  therefore need to be able to operate on units at run-time". https://www.diva-portal.org/smash/get/diva2:1724056/FULLTEXT01.pdf
  [I] "Functions whose return kind is known" are Nexus's blocks: a block's output declares its quantity, so kinds are
  regained at every node, not inferred through arithmetic. This is why per-port declaration is enough and Nexus does
  not need McKeever's full calculus.
- [C] SysML v2 ships ISO/IEC 80000 parts 3 to 12 as model libraries ("700+ quantities, few hundred units") and NIST
  SP 811 US customary units (300+ conversion factors); attributes *subset* an ISQ quantity (`antlerLength` subsets
  length) and the unit belongs to the value, not the type. The same keynote notes most systems "do not support
  interval | ordinal | logarithmic | cyclic measurement scales". https://www.insticc.org/Primoris/InvitedSpeakers/MODELSWARD_2022/Keynotes/MODELSWARD_2022_KS_3_Presentation.pdf ;
  https://sensmetry.com/advent-of-sysml-v2-lesson-11-attributes-and-quantities
  [I] SysML v2's "subset" is mp-units' hierarchy expressed as modelling, and gives Nexus a second open machine-readable
  ISQ beside QUDT.

### A11. What unit errors cost

- [C] Mars Climate Orbiter (MIB Phase I report): root cause "the failure to use metric units in the coding of a
  ground software file, 'Small Forces'"; the Software Interface Specification required the AMD file's impulse bits in
  N·s, the ground software wrote lbf·s; navigation "underestimated the effect of the thruster firings by a factor of
  4.45"; the spacecraft's own software was correct. https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf
  [C] Later analyses put the periapsis near 57 km and stress that "the same bare number meant different physical
  quantities on opposite sides of a software and organisational boundary". https://ronutz.com/en/learn/mars-climate-orbiter-and-the-boundary
  [M] The mission cost was about USD 327.6 million (orbiter and lander together, often quoted).
  [I] Nexus's equivalent boundary is not the wire (which carries its unit) but every *file* crossing in: a CSV, a
  STEP property, an imported board, an agent-written value. The unit was in the spec and not in the file.
- [C] Gimli Glider (Air Canada 143, 23 July 1983): 7,682 L on board × 1.77 (lb/L, given by the fueller) = 13,597
  read as kg; the aircraft left with about 22,300 lb (10,100 kg) instead of 22,300 kg; the correct density was
  0.803 kg/L; the 767 was the fleet's first metric aircraft during Canada's metric conversion, and the fuel gauge
  system was unserviceable. https://en.wikipedia.org/wiki/Gimli_Glider
  [C] "No step in the process required them to verify which unit system they were applying"; captain, first officer
  and dispatcher all reviewed and accepted the calculation. https://aviationrisklab.com/air-canada-143
  [I] A density written as a bare "1.77" is the unitless-port hole in a human pipeline. Several reviewers did not
  catch it because they checked the arithmetic, not the units: a second judge does not help unless it checks kinds.

## (B) What Nexus should take

1. **Data model (10, 01; owner `nexus/quantities.ts`): grow `QuantityDef` into a kind record, QUDT-shaped.** Add
   `parent?: string` (the `skos:broader` / `kind_of` link: `radius` → `width` → `length`), `units: string[]` (the
   applicable units, as QUDT's `applicableUnit`, so `N m` lists under torque and `J` under energy), `space:
   'point' | 'difference' | 'absolute' | 'level'` (mp-units' three spaces plus logarithmic levels), and for levels
   `{ ref: string; power: boolean }`. Add the missing kinds: `dose-equivalent` (Sv) apart from `absorbed-dose`;
   `rotational-frequency` (rev/s, rpm) apart from `frequency` and `angular-speed`; `activity` (Bq); `level`; `count`
   split from `ratio` (already there for laws). Kinds stay in this one file; nothing in `ganglia/units.ts` names a kind.
2. **Data model (`ganglia/units.ts`): units stay dimension + scale + offset, with three corrections.** (a) `rpm` and
   `rev/s` are counts of turns per time: scale 1/60 and 1 on `T⁻¹`, not 2π/60; the 2π lives only in a named bridge
   (item 5). (b) `dB`, `Np`, `B` leave the linear table: a level is not a scale (item 8). (c) Add `delta_degC`,
   `delta_degF`, and the symbols the code already uses (`°`, `°C`); add `px` and wire gauges as arbitrary units that
   match only themselves (UCUM `[arb'U]`). Rename the dose rad (`krad` → `kRAD` or spelled out) so `rad` means one
   thing. A test asserts every unit symbol in `UNITS` appears in some `QuantityDef.units`.
3. **Data model (`blocks.ts` `PortDef`): every number port carries `quantity?: string`, and inference proposes it.**
   Reuse `quantityOf` (unit → dimension → words of the port's name and label) for block ports exactly as for law
   ports; one function for both. A test lists every numeric block port whose quantity is inferred rather than declared
   and fails on any that infers to nothing or to a `general` kind where the dimension holds several (the spreadsheet
   lesson: inference proposes, a person confirms). `teeth` and `body coils` become `count`.
4. **Rule (01, 10): `fits` checks kind, then space, then unit, in that order; dimension becomes a consequence.**
   Same quantity, or the out's quantity is a descendant of the in's (a radius feeds a length; a length does not feed
   a radius without a node): pass, convert by scale. Different kinds of one dimension (torque/energy, Gy/Sv,
   Hz/Bq, angle/ratio, count/fraction): refuse, and say both kinds and why ("a torque is not an energy: the SI never
   writes torque in joules"). A number with no unit *and* no quantity: refuse, both ways. Unknown unit symbol: refuse
   with "unknown unit", never "not the same kind".
5. **Node and rule (09, 10): bridges, the only way across kinds.** A small table in `quantities.ts` of exact,
   definitional bridges: `rotational-frequency → angular-speed` (× 2π rad/rev), `rotational-frequency ↔ frequency`
   (× 1, a turn is a cycle), `angle (rev) ↔ angle (rad)` is not a bridge but a scale within one kind. A wire may apply
   an exact bridge itself and says so on the wire ("× 2π rad per turn"), as it already toasts `convert`. Bridges that
   need a value (Gy → Sv needs a radiation weighting factor; mass → weight needs g; ΔT → T needs a base) are nodes with
   that value as an input, sourced (spec 10). This is round 18's Pint context, split into "exact" and "needs data".
6. **Rule (09, 10): points, differences and absolutes.** A `temperature` port in °C or K is a point; a
   `temperature-difference` is a difference; `convert` applies the offset only point → point (fixing `dataflow.ts`).
   Point → difference and difference → point refuse; a "difference of two points" node and a "point plus a
   difference" node give the only routes (mp-units' affine rules). Mass, length, absolute pressure are `absolute`
   (non-negative), so a value below zero on such a port is a warning at run time (mp-units V3), which spec 10's
   validity checks can read. Gauge pressure versus absolute pressure is the next pair of the same shape.
7. **Rule (09): a law's output inherits the declared kind of its output port, never the arithmetic's.** McKeever's
   lesson: multiplication loses kind; Nexus regains it at every block boundary because each output declares one.
   `unitFrom: 'a*b'` outputs must also say their quantity (a force by a length is a torque *or* an energy: the block
   must say which).
8. **Data model and node (09, 11): levels.** A level is `{ quantity: 'level', of: <kind>, ref: <value with unit>,
   power: boolean }`, shown as "dB re 1 mW". A `to level` node and a `from level` node convert with 10 or 20 log; a
   `sum` block refuses levels and a "combine levels" node adds them as powers. Sound (spec 11's living world), RF links
   and amplifier chains all need it.
9. **Rule (10, constitution): show the quantity with the unit on every value.** The SI Brochure's instrument rule:
   the inspector, the wire tooltip and the agent's sentences say "angular speed 6.28 rad/s", not "6.28 rad/s".
   `meaning()` already writes this for laws; extend it to every port. This is also the agent's guard: it reasons in
   kinds, so a prompt like "wire the motor rpm into the frequency input" is answered with the bridge, not a wire.
10. **Check (10, T11's test cases, as failing tests first).** 60 rpm → Hz gives 1 (bridge) or is refused; 60 rpm →
    rad/s gives 6.283 with the bridge shown; 1 Gy → Sv refused; N m → J refused; 1 rad → % refused; 10 ΔK in °C →
    ΔK gives 10; a 10 °C point → K gives 283.15; `teeth` (count) → length refused; unitless number → any refused;
    20 dB → 1 refused; `°` → `rad` converts; `px` → `mm` refused. Each with the SI Brochure or VIM sentence it rests
    on in the test name.
11. **Way of working (00, 10): imports declare kinds at the boundary.** MCO's lesson: every importer (CSV, STEP
    properties, a pasted table, an agent-written value) maps each column to a quantity and unit *in the file's
    record*, shown and confirmed; a column without one is held, never defaulted to SI. A density without its unit is
    refused (Gimli).
12. **Data (10): seed the kind tree from QUDT (CC BY 4.0) and cross-check against SysML v2's ISQ library.** Import only
    the kinds Nexus uses, keep the QUDT IRI and the IEC 61360 / ECLASS code as `semanticId` (round 18's item 8), and
    attribute. Do not import QUDT wholesale: thousands of kinds would make inference ambiguous.
13. **Decision (decisions/): angle stays dimensionless in `Dim`, kept apart by kind.** Record the options (UCUM and
    Boost: angle a base dimension; SI and Pint: dimensionless; mp-units: dimensionless plus kind) and the choice, with
    the assumption ("no law needs rewriting") and a re-test date tied to the CCU's next move on angles. Laws keep
    passing the homogeneity test unchanged.
14. **Idea (07): a "units audit" node for any board.** It lists every wire by kind, every bridge applied, every port
    whose kind was inferred, and every value crossing a boundary (import, agent, folded group). Perrow-style (round 4
    finding 23): an audit of the places a bare number could change meaning.

## (C) Questions

The 69 questions of this pass were chapter 20 of the book; 9 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q20.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches

- Measurement scale types (Stevens: nominal, ordinal, interval, ratio; plus logarithmic and cyclic) as a field on every quantity, and what operations each allows.
- Cyclic quantities (angles that wrap at 360°, time of day, compass bearings): averaging and differencing on a circle.
- Vector and tensor character of quantities (ISO 80000), and coordinate frames on ports, as SysML v2's next work item.
- Uncertainty carried with kind: GUM uncertainty on a point versus on a difference (a temperature difference's uncertainty is not the difference of uncertainties).
- Kennedy's dimension types and type inference: can Nexus infer kinds through a whole board, not only per port?
- Hart's "Multidimensional Analysis" (1995), dimensional analysis with matrices of quantities, for Nexus's matrix and table types.
- Natural units and systems where c = 1 or ħ = 1, and whether Nexus's physics core ever needs them.
- Medication dosing errors and the "do not use" abbreviation lists (µg versus mg, U versus 0), as a source of unit rules for spoken input.
- Engineering standards that define kinds by procedure (Rockwell hardness, Shore durometer, Charpy energy): units that are numbers only within a test method.
- Currency as a kind with time-varying bridges (exchange rates, inflation), and money as a point (a price at a date) versus a difference.
- The CCU's 2026 to 2035 strategy and any planned SI Brochure appendix on angles and counting quantities.
- The CCU focus group on counting and number quantities: whether "number of entities" gets its own unit or dimension.
- QUDT's "D" dimension exponent: how it is used, and whether it could carry angle without a base unit.
- LOINC and FHIR's use of UCUM for imported health and lab data in the living world.
- GIS and survey units (US survey foot retired 2022, geoid height versus ellipsoid height) as an affine-origin case.
- Unit handling in other node-graph tools (Grasshopper, Houdini, Blender geometry nodes, LabVIEW's unit labels) and how their users work around it.
- Units in LLM tool calls: how often agents drop or invent units when writing values, and a benchmark Nexus could run on its own agent.
- Photometric versus radiometric kinds (lumen versus watt) and the luminous efficacy bridge, which needs a spectrum.

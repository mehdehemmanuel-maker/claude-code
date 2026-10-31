# Research (round 5): The body as an engineered system, and medicine's ways of being safe
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here (already in earlier passes): the surgical checklist's evidence (Haynes 2009, Urbach 2014, Leape's
"performance of the actions") and READ-DO / DO-CONFIRM (`16-safety-failures.md`); FMEA with Action Priority, the
medical gas pin index and keyed ports (`16`); SBML, CellML, BioModels and OpenSim Moco named as exchange standards and
tools (`07-life-and-equations.md`, `06-engineering-languages.md`); Bodylight.js, Modelica physiology in the browser
(`19-physics-core-browser.md`); NIST's three-level grade for consensus values and Dawid–Skene contributor weighting
(`23-truth-at-scale.md`). This pass reads the body as a part with interfaces, and medicine's safety and evidence
machinery as working methods Nexus can copy.

## (A) Findings

### A1. Whole-body physiology is already built as composable circuits

- [C] Guyton's 1972 circulation model described the interactions of **about 150 variables** in one block diagram;
  HumMod, its descendant, has **more than 5,000 variables** (cardiovascular, respiratory, renal, neural, endocrine,
  skeletal muscle, metabolic), written in XML so it can be changed without recompiling. A static block diagram became
  impractical, so the authors built a "Model Navigator" to explore relations
  (Hester et al., *Front Physiol* 2011, https://pmc.ncbi.nlm.nih.gov/articles/PMC3082131).
- [C] The HumMod source is "thousands of XML files in more than a thousand directories"; its structure and links "are
  not easily identifiable", which is why the SAPHIR project rebuilt the 1972 Guyton and 1979 Ikeda models in Modelica
  instead (Kofránek et al., Modelica Conference 2011, https://ep.liu.se/ecp/063/079/ecp11063079.pdf).
  [I] The lesson for Nexus: a model of 5,000 variables is not usable without a navigator that answers "what drives
  this, what does this drive". Folding (spec 00) and a "why this value" trace (spec 10) are that navigator.
- [C] BioGears is a closed-loop whole-body model of **lumped-parameter models using electrical circuit analogues**
  plus control feedback; validation combines peer-reviewed publications and subject-matter expert judgement
  (https://www.biogearsengine.com/documentation/_f_a_q.html). Apache 2.0 licence (https://www.biogearsengine.com).
- [C] Pulse (Kitware) forked BioGears. **Every system, action and condition is validated** at two levels: clinical
  outputs (heart rate, respiration rate, SpO2, glomerular filtration rate) and compartment data (flow and pressure to
  organs). All validation results ship in the documentation; **the verification suite runs on every change submitted**
  so the models stay validated
  (https://www.kitware.com/introducing-the-pulse-physiology-engine-open-source-computational-models-for-human-medical-simulation).
  [I] This is the strongest existing example of what spec 00 asks for: a validation matrix as a CI gate, per system,
  per action, against literature data.
- [M] Pulse and BioGears build the circulation, respiration and anatomy as **compartments joined by circuit links**
  (pressure as effort, flow as flow), and couple different circuits (cardiovascular, respiratory, anaesthesia machine)
  through shared nodes. [I] This is the acausal effort-and-flow model of synthesis finding 1, already proven at whole-body
  scale; a body in Nexus can be a fold of such compartments.
- [C] CellML 2.0: every `variable` **must** carry a `units` attribute; variables carry an `interface` of `public`,
  `private`, `public_and_private` or `none`; components can be **imported** from other models, and an import may not be
  (directly or indirectly) the model itself (https://www.cellml.org/specifications/cellml_2.0/cellml_2_0_normative_specification.pdf).
  CellML 2.0 removed the `offset` on units and the built-in `celsius` (release notes,
  https://www.cellml.org/specifications/cellml_2.0/cellml_2.0_release_notes).
  [I] Three ready rules: units mandatory on every port; a port's visibility (public to the parent, private to the
  children) is a typed attribute, which is exactly folding's "what crosses the boundary"; no import cycles.
  Removing affine units (°C) from the core and keeping them only in conversion is the same choice as Nexus's
  "conversion only in a visible node" (round 3).
- [C] The Physiome Model Repository holds more than 500 published CellML models (https://physiomeproject.org/data-repositories);
  models carry a **star system for curation status**, the goal being "level 2", that the model **replicates the
  results in the published paper**; "over half have been curated to some degree", with separate stars per simulation
  environment (https://www.cellml.org/getting-started/tutorials/cellml-model-curation).
  [I] A curation ladder for every imported model: encoded, runs, reproduces the paper's figure, in each solver. The
  last rung per solver is a check Nexus can run automatically.
- [C] Open Systems Pharmacology (PK-Sim, MoBi) is open source since 2017, after ~25 years of development; PK-Sim holds
  anatomical and physiological parameters for humans and seven laboratory species, and builds whole-body PBPK models
  with blood flow and enzyme-mediated processes added automatically (https://www.open-systems-pharmacology.org/faq);
  the community runs **automated qualification** of the platform against clinical data as a release step
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC6930856).
- [M] Pharmacokinetics as compartments: one- and two-compartment models with first-order elimination; C(t) = (Dose/V)
  e^(−kt); half-life = ln 2 / k; PBPK makes each compartment a real organ with real volume and blood flow, so a
  compartment model is a fold of a PBPK model. [I] The same "a coarse model is a fold of a fine one" pattern as
  synthesis finding 2; the fold must state what it loses (distribution phase, organ-specific concentrations).

### A2. The musculoskeletal body as a part with ports

- [C] Rajagopal et al. 2016 (*IEEE TBME* 63(10):2068–2079): full-body bone geometry, **37 degrees of freedom**, **80
  Hill-type muscle-tendon units** in the legs (40 per leg) and **17 ideal torque actuators** for the upper body;
  musculotendon parameters from **21 cadaver specimens** (https://nmbl.stanford.edu/wp-content/uploads/07505900.pdf).
  A later variant calibrated passive forces against Silder et al. 2007 and corrected hip abductor paths against MRI
  (Uhlrich et al. 2022, https://simtk.org/projects/fbmodpassivecal).
  [I] Two lessons. A standard model is "healthy young adults, legs detailed, arms as torque motors": its validity
  envelope is explicit in its design. And models are versioned by named corrections, each with its evidence: the right
  shape for any shared Nexus part.

### A3. Anthropometry: there is no average person, and percentiles do not add

- [C] ANSUR II (US Army, measured Oct 2010 to Apr 2012): the public working database has **93 directly measured
  dimensions** on **4,082 men and 1,986 women**, plus demographics; 3D whole-body, head and foot scans exist but are
  **not public**, for privacy (https://www.openlab.psu.edu/datasets/ansur2; https://github.com/senihberkay/US-Army-ANSUR-II;
  https://www.army.mil/article/188601). The technical report (Gordon et al. 2014, NATICK/TR-15/007) gives 94 direct and
  39 derived dimensions and a full sample of **7,435 men and 3,922 women** (https://hero.epa.gov/reference/8211558).
  [I] Two different numbers for "ANSUR II's sample", both true: the working (weighted to the Army's make-up) subset and
  the full measured sample. A value's source must name which subset.
- [C] ISO 7250-1:2017 defines basic body measurements, landmarks and methods (e.g. body mass "subject stands on a
  weighing scale") as a basis for comparing populations and building databases per ISO 15535; ISO 20685-1:2018 and
  -2:2023 cover 3D scanning protocols and scanner testing with calibrated test objects
  (https://3dmeasureup.ai/blog/iso-standards-related-to-body-measurements; ISO 7250-1 text,
  https://platform.ict-tex.eu/pluginfile.php/1233/mod_folder/content/0/Basic%20human%20body%20measurements%20for%20technological%20design_ISO7250.pdf).
  [I] ISO 7250 is to a body what ISO 4762 is to a bolt: a named dimension set with a defined measuring method. A body
  part in Nexus can carry ISO 7250 dimension names as its parameters.
- [C] Daniels (1952) measured **4,063 pilots** on ten dimensions; **none** fell within the middle 30 % on all ten; on
  just three, under 3.5 % did (secondary accounts only:
  https://dlm-econometrics.blogspot.com/2020/04/the-average-man.html; https://readingbyeugene.com/2016/05/15/there-is-no-such-thing-as-average-body-size).
  [M] The original is a WADC technical note, "The 'Average Man'?" (TN-WCRD-53-7); not opened this pass.
- [C] HFES's *Guidelines for Using Anthropometric Data*: applying a 10th-percentile-female to 90th-percentile-male range
  of hip breadth to ANSUR captures **63 %**, not 90 %; even 5th female to 95th male captures only **79 %**, because the
  female distribution of hip breadth is the larger one. In a multi-dimension example, setting each of several
  dimensions to its 5th–95th range accommodates 90 %, then 82, 78, 71 and 67 % as dimensions are added
  (https://www.hfes.org/Portals/0/Publications/Guidelines_AnthropometricData.pdf). The USAF multivariate accommodation
  method (Hudson, Zehner, Meindl 1998) chooses **boundary cases** on a multivariate ellipse instead
  (cited in https://www.transport.nsw.gov.au/system/files/media/documents/2023/iMOVE%206-002%20-%20M4%20report%20final%20-%20WACG.pdf).
  [I] **Percentiles are not additive and not multivariate.** A "fits 95 %" claim is only true when checked person by
  person against a sample, or against boundary cases. Nexus's human-fit check must test individuals (or a boundary
  family), never a "95th percentile man".

### A4. Prosthetics and implants: the body as a host surface with demands

- [C] ISO 10328:2016 (structural testing of lower-limb prostheses): static proof, ultimate and cyclic tests on a rig
  aligned to heel strike and toe-off; cyclic tests to **3 million cycles** (https://step-lab.com/iso/iso-10328;
  https://limberprosthetics.com/3d-printed-prosthesis-structural-testing-and-durability). Loading levels by body mass:
  **P3 60 kg, P4 80, P5 100, P6 125, P7 150, P8 175 kg** (https://pmc.ncbi.nlm.nih.gov/articles/PMC12710985; P7–P8 as
  reported by that review [I: may be from an amendment, not checked against the standard]).
- [C] The FDA's recognition entry quotes the standard's warning: it **"is not suitable to serve as a guide for the
  selection of a specific lower limb prosthetic device ... in the prescription of an individual"**; "any disregard of
  this warning can result in a safety risk for amputees"
  (https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfStandards/detail.cfm?standard__identification_no=42373).
  [I] A passed test is a statement about the part under the test's loads, never about fitness for a person. Nexus must
  keep "passes ISO 10328 P5" and "suits this user" as two separate claims.
- [C] Socket fit is a map of the residual limb: **pressure-tolerant** areas (patellar ligament, medial tibial flare,
  medial tibial shaft, lateral fibular shaft, anterior and posterior compartments) are loaded by inward contours;
  **relief** is given over sensitive areas (tibial crest, tibial tubercle, lateral tibial flare, distal tibia, fibular
  head, peroneal nerve, hamstring tendons, patella) (*Atlas of Limb Prosthetics*, https://www.oandplibrary.org/alp/chap18-02.asp).
  Measured interface pressures in one case study: fibular head average 74 kPa in a rigid socket, 60 kPa in a compliant
  one; distal tibia peak 103 kPa falling to 57 kPa (https://sites.utexas.edu/neptune/wp-content/uploads/sites/6031/2020/07/jbme1276.pdf).
  [I] **This is the bolt's interface model with the roles reversed**: the body is the host that carries what it
  demands of anything pressed onto it (load here, relieve there), and the socket is the part that must take the
  negative of that demand map. A body surface is a Nexus interface surface with a pressure-tolerance field.
- [C] Osseointegration (OPRA, transfemoral): implant survival **83 % at ten years**, superficial and deep infections at
  **1.88 per 10 person-years** (Hagberg et al. 2023, https://www.sciencedirect.com/science/article/pii/S2214031X22000894);
  implant-associated osteomyelitis 10-year cumulative risk **20 %** (95 % CI 12–33 %), extraction 9 % (Tillander 2017,
  as summarised at https://www.anthem.com/medpolicies/abc/active/gl_pw_e003563.html); higher activity (K3/K4) correlates
  with more mechanical complications (https://www.aetna.com/cpb/medical/data/1000_1099/1045.html).
  [I] A direct bone interface removes the soft-tissue layer (no socket pressure) and opens a permanent skin breach: an
  interface trade that moves the failure mode from one place to another. Every interface choice should list the
  failure modes it removes and the ones it creates.

### A5. Medical-device safety as a process: the risk file

- [C] ISO 14971:2019: identify hazards from intended use **and reasonably foreseeable misuse**; trace hazard →
  sequence of events → hazardous situation → harm; estimate and evaluate; control; evaluate residual risk; weigh
  **overall residual risk against benefit**; keep the file current from production and post-market data. The standard
  requires objective acceptability criteria but **does not set acceptable levels**
  (https://www.iso.org/standard/72704.html; https://www.complizen.ai/post/iso-14971-medical-device-risk-management).
- [C] Clause 7's **fixed order of risk controls**: (1) inherent safety by design, (2) protective measures in the device
  or process, (3) information for safety (labels, instructions, training); controls must be verified for
  implementation **and effectiveness**, and checked for new risks they introduce. Auditors challenge files where
  warnings in the instructions are the main control
  (https://simplerqms.com/iso-14971; https://zechmeister-solutions.com/en/blog/mdr-risk-control-three-step-iso-14971).
- [C] IEC 62304 (2006, Amendment 1 2015): software safety classes A, B, C. Since the amendment, a system is Class A if
  it cannot contribute to a hazardous situation, **or if the risk is acceptable after risk controls external to the
  software**; otherwise B (non-serious injury possible) or C (death or serious injury). The highest class of any item
  sets the system's class; documentation grows by class (A: requirements and release; B adds architecture and
  verification; C adds detailed design); system tests mandatory even for A since 2015; SOUP (software of unknown
  provenance) has its own obligations (https://blog.johner-institute.com/iec-62304-medical-software/safety-class-iec-62304;
  https://casrai.org/guides/iec-62304).
  [I] A rigour class per node, set by what the node's failure could cause downstream, lowered only by a named external
  control, and inherited upward to the board: exactly a graph property Nexus can compute.
- [C] The FDA's QMSR took effect **2 February 2026**: 21 CFR 820 now incorporates ISO 13485:2016 by reference; design
  controls are met through ISO 13485 clause 7 (https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr;
  https://intuitionlabs.ai/articles/fda-qmsr-iso-13485-changes-2026).
  [M] Design controls' chain: user needs → design inputs → design outputs → verification (outputs meet inputs) →
  validation (device meets user needs, with real users) → design transfer; a design history file; design reviews.
  [I] "Verification against inputs, validation against needs" is the distinction Nexus's checks must keep: a part can
  pass every numeric check and still fail the person.
- [C] Human factors: a **critical task** is one that, done wrongly or not at all, could cause serious harm; critical
  tasks come from the **use-related risk analysis (URRA)**, a living document over all tasks; summative validation uses
  **at least 15 participants per distinct user group** on the final design and labelling, without coaching; every use
  error on a critical task is root-caused. FDA issued a final guidance on the *content* of human factors information
  on **29 May 2026**, with three submission categories, only the third including validation results
  (https://www.complizen.ai/post/human-factors-engineering-medical-devices-fda-guide; https://www.fda.gov/media/193938/download;
  https://casrai.org/guides/fda-human-factors-usability-engineering-guidance). IEC 62366-1 calls the same things
  "hazard-related use scenarios" and "summative evaluation" (https://mdxcro.com/fda-human-factors-guidance-2026).
- [C] ASME V&V 40 (2018): model credibility is judged against a **context of use** (the question the model answers, and
  its role beside other evidence); **model risk = model influence × decision consequence**; credibility goals scale with
  model risk. The FDA's guidance on computational model credibility adopts this, with a 3×3 grid as one possible scheme
  (https://www.fda.gov/media/154985/download; https://www.virtonomy.io/asme-vv40-compliance-guide).
  [I] This is the single most portable idea of the pass: **how much checking a model needs depends on how much the
  decision leans on it and how bad a wrong decision is**. It gives spec 10's validity envelope a rigour dial.

### A6. Diagnostic reasoning: base rates, and how often it goes wrong

- [C] Manrai et al. 2014 (*JAMA Intern Med* 174(6):991–993) repeated Casscells 1978: "a disease of prevalence 1/1000,
  a test with false positive rate 5 %, what is the chance a positive person has it?" Answers ranged from 0.005 % to
  96 %, **median 66 %, 33 times the true answer** (≈2 %); one attending wrote "PPV does not depend on prevalence"
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC4955674).
  [I] Experts reliably drop the prior. An AI or a user reading a check's "alarm" without its base rate will overreact
  the same way.
- [C] Newman-Toker et al., *BMJ Qual Saf* 2024;33:109–120: in the "Big Three" (vascular events, infections, cancers),
  weighted mean diagnostic error rate **11.1 %** and serious harm rate **4.4 %** per case; extrapolated US total
  **795,000 serious harms a year** (plausible range 598,000–1,023,000; 371,000 deaths, 424,000 disabilities); five
  conditions (stroke, sepsis, pneumonia, VTE, lung cancer) give 38.7 % of harms; the range comes from a Monte Carlo
  analysis (https://qualitysafety.bmj.com/content/33/2/109).
  [I] Note the form: an estimate with a stated plausible range and a more conservative sensitivity estimate (549,000)
  beside it. That is how a contested number should be stored.
- [M] Differential diagnosis as a working method: list every candidate that could explain the findings, each with a
  pre-test probability; order tests by how much they shift the ranking (likelihood ratios: post-test odds = pre-test
  odds × LR); keep "can't-miss" dangerous diagnoses on the list even when unlikely; premature closure (stopping at the
  first fit) is the commonest cognitive error. [I] Nexus's "why does this board fail?" agent should keep a differential
  with priors, and pick the next check by expected information, not by habit.

### A7. Evidence hierarchies and pre-registration

- [C] GRADE rates certainty per **outcome** as high, moderate, low or very low; randomised trials start high,
  observational studies low. Five domains downgrade (risk of bias, inconsistency, indirectness, imprecision,
  publication bias), each by one or two levels; three upgrade observational evidence (large effect, dose-response,
  plausible confounding that would shrink the effect); evidence already downgraded for bias is not upgraded
  (https://www.cdc.gov/acip-grade-handbook/hcp/chapter-7-grade-criteria-determining-certainty-of-evidence/index.html;
  https://www.medwave.cl/revisiones/metodinvestreport/8109.html?lang=en).
  [I] GRADE is a **start level by study design, then named moves with reasons**. That is the right shape for a grade
  on a Nexus value: "measured in a standard test (start high), but indirect (different alloy temper): moderate". It
  complements research 23's NIST grade (how hard bias was sought) and the claim status (where the value came from).
- [C] COMPare (CEBM; Goldacre et al., *Trials* 2019) checked every trial in five top journals over six weeks against
  its registry or protocol: 67 trials; **76 % of pre-specified primary outcomes reported correctly** (journal range
  25–96 %), secondary 55 %, a mean of **5.4 undeclared new outcomes per trial**; 58 trials (87 %) needed a correction
  letter, and only 40 % of letters were published. Switching that is **declared and explained** is not counted as
  misreporting, following CONSORT 6b (https://link.springer.com/article/10.1186/s13063-019-3173-2;
  https://www.compare-trials.org/project.html).
  [I] Pre-registration does not forbid change; it forbids **undeclared** change. For Nexus: a test or acceptance
  criterion written before the run, frozen, and any change shown as a change, with its reason.
- [M] ICMJE has required registration before enrolment as a condition of publication since 2005; FDAAA 801 (2007) and
  the 2016 final rule require results reporting on ClinicalTrials.gov for applicable trials; Registered Reports
  (journals accept the protocol before results exist). [M] Cochrane's Risk of Bias 2 tool rates five domains per
  outcome (randomisation, deviations, missing data, measurement, selective reporting).

## (B) What Nexus should take

1. **`body` as a part family with ports** (01 interfaces, 09 physics core). A body is a fold of sub-parts (segments,
   joints, muscles, compartments), each a node with typed ports: mechanical (joint frames, force and velocity),
   fluid (pressure and flow, the Pulse/BioGears circuit form), thermal, and surface. Parameters named by ISO 7250-1
   dimensions. Start from cited data: ANSUR II (working DB, sample named), Rajagopal 2016 (named validity: healthy young
   adults, legs only muscle-driven).
2. **Body surfaces as host interfaces with demand fields** (01). A body region carries what it demands of anything
   pressed onto it: pressure-tolerant and relief zones, maximum interface pressure (sourced or labelled), shear and
   temperature limits, reach and clearance envelopes. A socket, seat, handle, strap or headset is generated as the
   negative of that demand map: the bolt's "carries its hole" model with the body as the bolt.
3. **`check.humanfit` node** (07 ideas, 10 trust). Any built thing declares its users (population, task, posture) and
   its human contact points; the check runs **person by person over a sample** (ANSUR II rows) or a multivariate
   boundary family, reporting the fraction accommodated and who is not. Rule: **no percentile arithmetic**; a
   "95th percentile man" is not a valid input. Reach, clearance, eye point, grip and force each as a measure.
4. **A risk file on every board** (10 trust; with 16's failure-mode record). Fields: hazard → sequence → hazardous
   situation → harm, severity, probability (with source or "unknown"), controls, residual risk, benefit, and
   **reasonably foreseeable misuse** as a required section. Rule: **controls are tried in ISO 14971 order**; a
   warning label (information for safety) may not be the only control when a design or protective control exists, and
   the AI must say why one does not. Each control carries "verified implemented" and "verified effective" as two checks.
5. **Rigour class per node** (00 structure, 10). IEC 62304's A/B/C computed from the graph: the worst harm a node's
   wrong output can reach downstream; lowered only by a named external control node; inherited upward (a board takes
   its highest class). The class sets which checks are mandatory (A: requirements and a system test; C: everything).
6. **Model risk dial from V&V 40** (09, 10). Every model node states its context of use (the question, its role beside
   other evidence). Model risk = influence × consequence; the required validation evidence scales with it. The AI
   must not rely on a model in a high-risk decision whose credibility was established only for a low-risk use.
7. **Validation matrix as a CI gate** (00, 09). Copy Pulse: every model, action and condition carries its validation
   targets (literature values, at system and compartment level), and the whole verification suite runs on every
   change. A model whose matrix regresses cannot merge.
8. **Curation ladder for imported models** (10). From the Physiome repository's stars: (0) imported, (1) runs, (2)
   reproduces the source paper's figure, per solver. Shown as a badge; level 2 checked automatically where the paper's
   data are digitised.
9. **GRADE-shaped grade on values** (10 trust, extending research 23's T-R3/T5). A value's certainty = a start level
   from its kind of source (standard test, peer-reviewed measurement, handbook typical, vendor sheet, AI estimate),
   then named downgrades (bias, inconsistency across sources, **indirectness**: other alloy, other population, other
   temperature; imprecision; selective reporting) and upgrades, each with a reason. Graded **per use** (per outcome),
   since a value can be direct for one question and indirect for another.
10. **Indirectness as a computed flag** (10, 01). When a value is used outside the population, material state or
    regime it was measured in (a female-hip value from a male sample; a dry-wood strength in a wet beam), the wire
    carries an indirectness flag. This is the GRADE domain most often missed by machines and the easiest to compute
    from tagged metadata.
11. **Pre-registered checks** (00 structure). A check's acceptance criterion is written and frozen before the run
    (a hash in the decision record); changing it afterwards is allowed but shown as a declared switch with a reason
    (CONSORT 6b). An undeclared change to a criterion after seeing results fails the board's audit. Applies to the AI's
    own evaluation suites.
12. **Base rates on every alarm** (10, 11 living world). A check that raises an alarm states its prior (how often this
    alarm is true on boards like this), sensitivity and specificity where known, and shows the post-test probability,
    not only "FAIL". Natural frequencies in the display ("of 1,000 boards like this, 2 really fail; this check flags 50").
13. **The differential as an agent method** (07 ideas; the in-app agent). When diagnosing a failing board, the agent
    keeps a ranked list of candidate causes with priors, always includes the dangerous ones, and chooses the next check
    by expected information gain; premature closure is a named failure the reviewer panel looks for.
14. **Verification against inputs, validation against needs** (00). Two separate statuses on every artefact: "meets its
    stated numbers" and "serves the person it was for". Validation needs a use scenario with a person (or a body model
    with a task), never only numbers.
15. **Use-related risk analysis for Nexus itself** (00, 06 phone, 04 being in it). The URRA form: every user task in
    Nexus (connecting, deleting, publishing, trusting a value), which are critical (a wrong action would mislead someone
    or destroy work), and test critical tasks with real users; at least a handful per user group.
16. **Test standards are not selection guides** (01, 10). From ISO 10328's own warning: a part's "passes P5" is a
    statement about loads, stored apart from "fits this person or this use". The AI may not turn a test pass into a
    suitability claim.
17. **Interface trades listed both ways** (01; with 16's failure modes). Every interface option records which failure
    modes it removes and which it creates (osseointegration removes socket pressure, adds a permanent skin breach and
    osteomyelitis risk). The comparison of options is a table of moved risks, not a single score.
18. **Contested numbers stored as estimate, plausible range, conservative alternative and method** (10). Newman-Toker's
    795,000 (598,000–1,023,000; conservative 549,000; Monte Carlo) is the template.
19. **Compartment folds that state what they lose** (09). A PK one-compartment node is a fold of a PBPK board; the fold
    declares what it drops and where it fails (early distribution, organ concentrations); the functor test (synthesis
    finding 2) runs against the unfolded board inside the envelope.
20. **Units on every variable, no affine units in the core, no import cycles** (09; from CellML 2.0). Already Nexus's
    direction; CellML is an outside proof that a physiology community chose the same three rules.
21. **SOUP register** (00). Every external library and dataset Nexus loads (Jolt, OCCT, a model from a repository) as
    "software or data of unknown provenance": version, known anomalies, the risk it could contribute, the control.
22. **A post-market loop** (10, 11). Like ISO 14971's production and post-production information: reports from users
    that a built thing did not fit or failed feed back into the risk file and the parts it uses, and reopen decisions
    (synthesis finding 21).

## (C) Questions

The 72 questions of this pass are chapter 24 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Pulse Physiology Engine's source and circuit solver, read for a WebAssembly port and its exact validation-matrix format
- CAESAR (Civilian American and European Surface Anthropometry Resource) and national civilian surveys, for a non-military default body
- The USAF multivariate accommodation method (Hudson, Zehner, Meindl 1998) and PCA boundary manikins, read in full
- Daniels' original 1952 WADC note "The 'Average Man'?", to replace the secondary accounts
- ISO 10328's full test geometry and its P7–P8 levels, and ISO 22675 for ankle-foot devices
- Pressure ulcer science: time-at-pressure damage curves (Reswick and Rogers 1976; later Gefen), as a time-dependent interface limit
- Digital human modelling tools (RAMSIS, JACK, Siemens Process Simulate Human) and their fit methods
- Statistical shape models of the body (SMPL, STAR) driven from a few measurements, and their bias by population
- ISO 11228 (manual handling) and the NIOSH lifting equation as human-load checks
- ISO 7730 and the PMV/PPD thermal comfort model, and Fiala/UTCI thermoregulation models, for the living world
- IEC 60601-1 (basic safety and essential performance of medical electrical equipment) and its "essential performance" idea
- STPA applied to medical devices (Leveson's work on infusion pumps), beside ISO 14971
- FDA MAUDE adverse event database and recall data as a post-market feed linked to interface keys
- The 2026 FDA final guidance on human factors content, read in full for its three categories and decision questions
- GRADE for diagnostic tests and for modelled evidence (GRADE's 2020s guidance on models), as a direct template for model nodes
- Cochrane's RoB 2 and ROBINS-I tools as per-source bias checklists for engineering papers
- Registered Reports and the Center for Open Science's pre-registration templates, for frozen checks
- Clinical decision rules (Wells score, Ottawa ankle rules) as small sourced decision nodes with known sensitivity
- FMI co-simulation of physiology models (Bodylight, Modelica Physiolibrary) beside Nexus's own solver
- Implant standards: ISO 5832 (implant metals), ISO 7206 (hip stems), ASTM F2996 (FE analysis of hip stems), as interface-with-bone cases
- Ergonomic standards for VR headsets (IEC 63145, ISO 9241-392 on stereoscopic comfort) for Nexus's own hardware use
- Medical gas, connector and luer misconnection standards (ISO 80369 small-bore connectors), extending 16's keyed ports

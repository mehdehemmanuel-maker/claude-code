# Research (round 4): organisations that do not fail, and the deepest accidents
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

This pass follows leads that `16-safety-failures.md` listed and did not follow (Perrow, HROs, Safety-II and FRAM, Dekker,
blameless post-mortems, the Comet, Ariane 501, Fukushima, AF447, Deepwater Horizon, Chernobyl). It does not repeat 16's
checklist, CRM, ASRS, just culture, STPA, poka-yoke, FMEA or its case list; where this pass corrects 16, it says so.

## (A) Findings

### A1. Perrow, *Normal Accidents* (1984): two axes, and can they be measured?
- [C] Perrow places systems on two axes: interactions from linear to complex (horizontal), coupling from loose to tight
  (vertical). Where both are high, accidents are "normal": inherent in the structure, not in a broken part or a bad
  operator. He also argues that safety additions (redundancy, more layers) can themselves add complexity and new paths
  to failure. Sources: https://people.ohio.edu/piccard/entropy/perrow.html ; https://psychsafety.com/normal-accidents ;
  https://enipedia.org/wiki/Normal_Accidents
- [C] Interactive complexity is described as "the number of ways in which parts and relationships of the system can"
  interact in unplanned or unexpected sequences that "may not be immediately visible or comprehensible"; tight
  coupling as "the speed at which one variable cascades through the system", with sparse or loose links absorbing
  perturbations. Complexity triggers; coupling propagates. Source: https://www.high-reliability.org/PerrowComplex
- [C] A 2026 paper (MDPI Applied Sciences 16(17) 8834) still calls Normal Accident Theory "a qualitative paradigm"
  that offers no metric; it proposes barrier "maximum-vulnerability diagrams" where one threat can activate several
  hazards and one barrier can be shared. A CDC/NIOSH report exists titled "a normal accident theory-based complexity
  assessment" that defines graph-based complexity attributes (not read in full). Sources:
  https://www.mdpi.com/2076-3417/16/17/8834 ; https://stacks.cdc.gov/view/cdc/8538/cdc_8538_DS1.pdf
- [M] Perrow's markers of complex interaction: common-mode connections (one part serving two functions), unplanned
  feedback loops, many control parameters with interactions, indirect or inferred information, proximity of unrelated
  parts, limited understanding of some processes. Markers of tight coupling: delays not possible, invariant sequences,
  only one way to reach the goal, little slack in supplies or equipment, buffers and redundancies designed in rather
  than available by chance, substitutions limited.
- [I] Nearly every one of Perrow's markers is a property a node graph can compute: common-mode = a node (or a
  physical space, a power bus, a sensor) on which two independent functions both depend; unplanned loops = cycles
  that cross subsystem boundaries and were not declared; indirect information = a displayed value that is derived,
  not sensed (see TMI in 16, and Chernobyl's ORM below); slack = margins, buffer capacities and time constants;
  invariant sequence = a process board with no alternative ordering; "one way to the goal" = min-cut of size one on a
  function's success graph. Coupling is a ratio: how fast a disturbance propagates against how fast it is seen and
  answered. Nexus can therefore place any board on Perrow's chart from its structure, which no tool found here does.

### A2. High-reliability organisations (Weick and Sutcliffe, *Managing the Unexpected*, 2001)
- [C] Five principles: preoccupation with failure, reluctance to simplify, sensitivity to operations (the first three
  anticipate trouble while it is small), commitment to resilience, deference to expertise (the last two contain it).
  Held together by "collective mindfulness". Sources: https://www.theleansuite.com/learn/high-reliability-organization ;
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10291486 ; https://riskpublishing.com/weick-and-sutcliffe-principles-the-5-pillars
- [C] The book's index has "migrating decisions" (decisions move to whoever knows most, regardless of rank); an
  excerpt describes wildland dispatchers deferring to a supervisor's rank instead of the fire boss's expertise.
  Source: https://www.pbookshop.com/media/filetype/4/4f/4fb/978-0-7879-9649-9Index.pdf (index only; argument not read)
- [M] The original HRO studies (Rochlin, La Porte, Roberts, Berkeley, late 1980s) were of aircraft-carrier flight
  decks, air-traffic control and a nuclear plant; on the carrier, the most junior sailor could halt flight operations
  for a dropped tool. Not checked in this pass.
- [I] "Reluctance to simplify" is the opposite of a single summary score; "preoccupation with failure" treats a near
  miss as information, not as proof of safety; "deference to expertise" for an AI pipeline means the gate that holds
  the relevant evidence (a solver, a source, a test) outranks the orchestrator on that question.

### A3. Hollnagel: Safety-II and FRAM
- [C] Safety-I: "as few things as possible go wrong"; Safety-II: "as many things as possible go right", the
  ability to succeed under varying conditions. Everyday performance variability is why things go right; people are a
  resource for flexibility, not only a hazard. Work-As-Imagined (the formal task under nominal conditions) differs
  from Work-As-Done (adjusted to real conditions); the efficiency-thoroughness trade-off (ETTO). Source:
  https://skybrary.aero/sites/default/files/bookshelf/2437.pdf (EUROCONTROL white paper, 2013) ; also
  https://www.england.nhs.uk/signuptosafety/wp-content/uploads/sites/16/2015/10/safety-1-safety-2-whte-papr.pdf
- [C] FRAM models a system as functions (hexagons), each with six aspects: Input, Output, Precondition, Resource,
  Control, Time. One function's output can become another's input, precondition, resource, control or time
  constraint; "functional resonance" is variability in couplings combining into an outcome no single function
  produced. Sources: https://functionalresonance.com/a-fram-glossary ;
  https://www.icao.int/sites/default/files/SMI/TrainingDocs/Chapter%202%20Safety%20Management%20Fundamentals/2.6-06.%20SRM-Methodology%20FRAM.pdf
- [I] A FRAM hexagon is already a node with six typed port kinds. Nexus's nodes have inputs and outputs; FRAM says a
  safety-relevant model also needs preconditions (gated on state), resources (consumed), controls (procedures,
  plans, the AI's instructions) and time (deadlines, ordering) as distinct port kinds, and each coupling carries a
  variability (on time, early, late, omitted; precise, acceptable, imprecise). That is a direct extension of spec 09's
  typed ports and spec 11's process boards.
- [I] Safety-II for the AI: learn from the runs that went right as well as the near misses: which checks caught
  something, which adaptations (a re-plan, a unit conversion inserted) made a run succeed.

### A4. Dekker: "human error" and hindsight
- [C] Old view: human error is a cause of accidents. New view: it is a symptom of trouble deeper inside the system;
  "to explain failure, do not try to find where people went wrong". Local rationality: actions made sense to the
  people given their goals, knowledge and attention at the moment. Sharp end (operators) and blunt end (organisation,
  design, resources). Sources: https://www.leonardo-in-flight.nl/PDF/FieldGuide%20to%20Human%20Error.PDF ;
  https://sobrief.com/books/the-field-guide-to-understanding-human-error
- [C] Dekker, quoted in the VOID report: "Cause is not something you find. Cause is something you construct."
  Source: https://static.isthisit.nz/artifacts/blog/2022_Void_Report.pdf
- [M] Hindsight bias: knowing the outcome makes the path look obvious and the cues look louder than they were;
  counterfactuals ("they should have") describe what did not happen and explain nothing. Dekker urges reconstructing
  what the person could see at each moment, ordered by time.
- [I] For Nexus the AI is a sharp-end operator: when it errs, the post-mortem asks what its context window held, what
  the tools returned, what the prompt rewarded, not "the model was wrong".

### A5. Blameless post-mortems in software (Google SRE; Learning from Incidents)
- [C] Google SRE: a blameless post-mortem "assumes that everyone involved in an incident had good intentions and did
  the right thing with the information they had"; post-mortem criteria defined in advance; any stakeholder may request
  one; frequent writers are not stigmatised; reward the practice visibly; ask for feedback on post-mortem
  effectiveness. Source: https://sre.google/sre-book/postmortem-culture
- [C] Allspaw, "The Infinite Hows" (2014): the Five Whys is "tunnel-visioned into a linear and simplistic explanation";
  "Learning is the goal. Any prevention depends on that learning."; use "how" questions and Dekker's debriefing
  prompts. Source: https://www.kitchensoap.com/2014/11/14/the-infinite-hows-or-the-dangers-of-the-five-whys
  **This corrects `16-safety-failures.md` item 17, which proposed five whys.**
- [C] The VOID (Verica Open Incident Database): nearly 2,000 public reports from 660 organisations; about 25 % name a
  root cause; incident durations are positively skewed, so MTTR and other means are unreliable (shown with empirical
  data and Monte Carlo); recommends SLOs or cost-of-coordination instead. Sources:
  https://www.infoq.com/articles/analyzing-incident-data ; https://www.usenix.org/conference/srecon22americas/presentation/nash
- [I] A metric for Nexus's own reliability must not be a mean of a skewed distribution; report medians, tails and
  the distribution itself.

### A6. The de Havilland Comet (1953 to 1954): fatigue, the test article that lied
- [C] Three Comet 1 losses in under twelve months (Calcutta May 1953, Elba January 1954 G-ALYP, Naples April 1954).
  G-ALYU in the Farnborough water tank failed after 1,230 real pressurised flights plus 1,830 tank cycles (3,060
  total) at the corner of the forward escape hatch window; the Elba origin was the ADF aerial window in the roof; the
  Naples origin was never found. **Not the square passenger windows**, a common misconception. Sources:
  https://aerossurance.com/safety-management/comet-misconceptions ;
  https://www.faa.gov/lessons_learned/transport_airplane/accidents/G-ALYV
- [C] De Havilland had tested a prototype fuselage to 2P (twice working pressure, P about 8.25 psi), then ran the
  fatigue test on **the same fuselage**: the overload had cold-worked the stress concentrations and improved their
  fatigue life, so it lasted 16,000 cycles; production aircraft never overloaded reached about 1,000. Source: FAA
  lessons learned (above).
- [C] Modern analysis: a crack began at a bolt hole about 90 mm from the ADF window, grew under a doubler plate where it
  could not be seen, and accelerated into rising stress; critical crack length about 165 mm. Regulations then were the
  same for pressurised and unpressurised aircraft for fatigue. Sources:
  https://www.fzt.haw-hamburg.de/pers/Scholz/dglr/hh/text_2019_01_24_Comet.pdf ; Aerossurance (above)
- [M] The lineage that followed: safe-life (a part retired before its tested life with a scatter factor), then
  fail-safe (multiple load paths, crack stoppers, so one failure does not lose the structure), then damage tolerance
  (assume a flaw exists, show it is found by inspection before it grows critical; FAA rules around 1978 after the
  Lusaka 707 tailplane failure, and ageing-aircraft rules after Aloha 243 in 1988). Not checked in this pass.
- [I] Lessons: a test specimen carries a history, and the history changes the result; a crack where no one can see it
  must be assumed; a rule written for one regime (unpressurised) silently governs a new one (pressurised).

### A7. Ariane 5 flight 501 (4 June 1996): reuse outside its envelope
- [C] The inertial reference (SRI) alignment function, meaningful only before lift-off, kept running about 40 s into
  flight (a requirement kept from Ariane 4 to allow a countdown hold). The horizontal bias BH was far higher on Ariane
  5's trajectory than Ariane 4's; a 64-bit float to 16-bit signed integer conversion raised an Operand Error.
  Sources: https://people.computing.clemson.edu/~steve/Spiro/arianesiam.htm ; https://en.wikipedia.org/wiki/Ariane_flight_V88
- [C] Of seven variables at risk, four were protected; three left unprotected because of an 80 % maximum workload
  target on the SRI computer; "no direct reference to justification for this decision was found in the source code".
  "It was jointly agreed not to include the Ariane 5 trajectory data in the SRI requirements and specifications."
  Source: Clemson copy of the inquiry summary (above)
- [C] On any exception, the specification said to report on the bus, store context, and **shut the processor down**.
  The active SRI 2 then sent a diagnostic bit pattern, which the on-board computer **interpreted as flight data**,
  commanding full nozzle deflection; angle of attack over 20°, break-up at about 39 s. Source: same.
- [C] Recommendation R1: switch off the alignment function after lift-off; "more generally, no software function
  should run during flight unless it is needed". Source: https://rebelsky.cs.grinnell.edu/Courses/223/97F/Studies/ariane5.html
- [M] The back-up SRI 1 had failed the same way about 72 ms earlier: identical hardware and software, so the
  redundancy covered random hardware faults only, not a design fault (common mode). The board also recommended
  closed-loop system tests with realistic inputs.
- [I] Four lessons: (1) a reused part carries the envelope it was validated for, and reuse outside it must be flagged;
  (2) a decision to leave a check out must be written down with its reason, where the check would be; (3) a failure
  response that is "safe" locally (shut down) can be fatal at system level; (4) an error message must never be
  readable as data: types must separate status from value.

### A8. Fukushima Daiichi (11 March 2011): a common cause from outside, and a record too short
- [C] Design-basis tsunami 3.1 m (3.122 m), from the 1960 Chile tsunami at Onahama port; seawater pumps at 4 m, main
  buildings at 10 m. Revised to 5.7 m in 2002 by the JSCE method. In 2008 TEPCO itself calculated 15.7 m; managers
  asked the JSCE to review the model, and nothing was built. The regulator neither commissioned nor reviewed run-up
  studies, and did not update the licence when the basis rose to 5.7 m. Actual inundation 14 to 15 m. Sources:
  https://world-nuclear.org/information-library/safety-and-security/safety-of-plants/fukushima-daiichi-accident ;
  https://carnegieendowment.org/russia-eurasia/research/2012/03/why-fukushima-was-preventable ;
  https://www.nrc.gov/docs/ml1134/ml11347a454.pdf
- [C] TEPCO reviewed the paper on the Jogan tsunami of 869 (Satake 2008) and judged its source "unverified"
  pending further deposit surveys. Source: https://www.tepco.co.jp/en/nu/fukushima-np/info/12042401-e
- [C] The design basis considered only inundation and static pressure, not wave impact or debris (NRC). The
  emergency diesel generators, switchgear and batteries were in turbine-building basements; the flood took 12 of 13
  generators; the one air-cooled generator placed higher survived but its switchgear was below grade. The NAIIC
  found TEPCO knew since 2006 that flooding could cause station blackout; the regulator told operators station
  blackout need not be planned for. Sources: NRC special report (above); World Nuclear Association (above);
  https://en.wikipedia.org/wiki/Fukushima_nuclear_accident
- [C] Onagawa, closer to the epicentre and hit by a comparable or larger wave (about 13 to 14.3 m), was sited at
  14.8 m and survived; credited to Yanosuke Hirai, who insisted on exceeding requirements. Sources:
  https://www.iaea.org/sites/default/files/iaeamissiononagawa.pdf ;
  https://thebulletin.org/2014/03/onagawa-the-japanese-nuclear-power-plant-that-didnt-melt-down-on-3-11 ;
  https://en.wikipedia.org/wiki/Onagawa_Nuclear_Power_Plant
- [C] Unit 1's isolation condenser: its isolation valves were designed to close on loss of power (fail-safe for
  containment), so loss of power stopped the cooling; operators could not confirm valve positions; sources disagree
  on exactly which power loss closed which valve. Sources: https://www.tepco.co.jp/en/nu/fukushima-np/images/handouts_111122_03-e.pdf ;
  https://www.nra.go.jp/data/000067237.pdf (results summary seen; documents not read in full)
- [I] Lessons: (1) a design value fitted to a short record is a sample, not a bound; the record's length and the
  return period it can support belong with the number; (2) redundancy that shares a place (a basement) shares a
  fate; (3) "fail-safe" has a direction, and the safe state for one hazard (containment) is the unsafe state for
  another (cooling); (4) a known higher estimate referred to a committee is a decision, and should be recorded as one.

### A9. Air France 447 (1 June 2009): automation surprise and the hand-over
- [C] Pitot icing gave temporary airspeed inconsistencies; autopilot and autothrust disconnected; flight-control law
  went from Normal to Alternate (2B), losing stall protection. The crew never understood they were stalling and never
  applied a recovery; the flying pilot's sidestick was held back for almost the whole descent. Sources:
  https://www.faa.gov/sites/faa.gov/files/AirFrance447_BEA.pdf ; https://en.wikipedia.org/wiki/Air_France_Flight_447 ;
  https://aviationsafetymagazine.com/?p=10688
- [C] When all measured airspeeds fell below 60 kt the angle-of-attack values were treated as invalid and the stall
  warning **stopped**; it returned when a nose-down input raised speed, so the correct action seemed to cause the
  alarm. BEA recommendation FRAN-2012-051 asked EASA to review stall warning at very low measured speeds. Angle of
  attack was not displayed. Sources: BEA report (FAA copy above); https://v1prep.com/crash-investigations/air-france-flight-447.html
- [C] BEA factors include "the lack of a clear display in the cockpit of the airspeed inconsistencies identified by
  the computers", early transient warnings that could seem spurious, flight-director commands that seemed to confirm
  the inputs, and difficulty understanding alternate law. Sources: as above.
- [C] Bainbridge, "Ironies of Automation" (Automatica, 1983): "By taking away the easy parts of the task, automation
  can make the difficult parts of the human operator's task more difficult"; the operator asked to take over is
  handed a process already in trouble, with skills unpractised. Sources: https://humanfactors101.com/2020/05/24/the-ironies-of-automation ;
  https://en.wikipedia.org/wiki/Ironies_of_Automation
- [I] Lessons for an AI that hands control to a person: (1) announce the hand-over and the mode change explicitly,
  with what protections are now gone; (2) say what the automation knew and why it let go; (3) never let a warning go
  silent because its own inputs became invalid: "invalid" must be its own loud state; (4) never show guidance computed
  from the failed input (the flight director) as if it were sound; (5) keep the person practised.

### A10. Deepwater Horizon (20 April 2010): a test passed by explaining away
- [C] In the negative-pressure test the drill pipe held 1,400 psi while the kill line read zero; in a sealed system
  they must agree. The crew reran the test on the kill line, got no flow, and judged it a success; the "bladder
  effect" was offered to explain the drill-pipe pressure. The National Commission: there is "no such thing as a
  bladder effect"; the 1,400 psi had no explanation "other than that the well was flowing"; the two readings were
  never reconciled. Sources: https://www.govinfo.gov/content/pkg/GPO-OILCOMMISSION/pdf/GPO-OILCOMMISSION.pdf ;
  https://www.thechemicalengineer.com/features/deepwater-horizon-as-it-happened
- [C] CSB: excess bleed-back volume (about 15 bbl against 3.5 expected, per a secondary source) signalled a problem;
  two BOP pressure transducers the driller could read would have shown pressure consistent with the drill pipe and
  were not used. Sources: https://www.csb.gov/assets/1/20/appendix_2_a__deepwater_horizon_blowout_preventer_failure_analysis1.pdf ;
  LinkedIn summary (secondary) for the volumes.
- [C] A 2018 PSAM paper models negative-pressure-test reading as signal detection and names confirmation bias.
  Source: https://www.iapsam.org/psam14/proceedings/paper/paper_420_1.pdf
- [M] The blowout preventer's blind shear rams failed to seal, in part because the drill pipe had buckled off-centre;
  the cement was a nitrogen-foamed slurry whose lab tests were unstable. Not checked here.
- [I] Lessons: two measurements of one quantity that disagree are a stop, not a choice between them; an explanation
  invented to pass a test (a mechanism nobody can name) is a red flag the system can detect: the explanation has no
  model, no source, and appeared only after the result.

### A11. Chernobyl (26 April 1986): the scram that first added reactivity
- [C] RBMK control rods carried a 4.5 m graphite displacer below the absorber; fully withdrawn, the displacer sat
  mid-core with 1.25 m water columns above and below. On scram, the graphite first displaced water at the bottom of
  the channel, adding reactivity there (the "positive scram" effect), discovered in 1983 at Ignalina (and Chernobyl 4).
  Sources: https://en.wikipedia.org/wiki/RBMK ; https://world-nuclear.org/information-library/appendices/rbmk-reactors
- [C] The operating reactivity margin (ORM, "equivalent" rods in the core) had a lower limit of 15; it was about 8 at
  01:22:30. It was calculated by the SKALA computer, which became unreliable during the test; INSAG-7: "The magnitude of
  the ORM was not conveniently available to the operator, nor was it incorporated into the reactor's protection
  system"; its importance for the void coefficient was "poorly understood by the operators". Sources:
  https://www-pub.iaea.org/MTcd/publications/PDF/Pub913e_web.pdf ;
  https://world-nuclear.org/information-library/appendices/chernobyl-accident-appendix-1-sequence-of-events
- [C] INSAG-7's account is disputed by some Russian sources (Kurchatov history, a designer's book) about when and
  how the displacers were changed. Source: https://www.neimagazine.com/advanced-reactorsfusion/why-insag-has-still-got-it-wrong ;
  a video summary (secondary). [I] The record of a famous accident is itself contested; Nexus should hold several
  accounts, each with its source.
- [I] Lessons: (1) a safety action has a transient, and its first effect can be the opposite of its last; a check
  must simulate the path, not only the end state; (2) a limit that protects against something must be a live,
  displayed, interlocked quantity, not a printout; (3) a known defect (1983) that was not pushed to the operators
  became a trap three years later (compare 16's NASA lessons finding).

### A12. Across the cases (inference)
- [I] Every case has a number that was known and not acted on: Comet (no fatigue rule for pressure cabins), Ariane
  (trajectory data agreed out of the spec), Fukushima (15.7 m in 2008), AF447 (pitot icing incidents before), DWH
  (1,400 psi), Chernobyl (positive scram in 1983). The failure is less often ignorance than a known value without a
  path to the decision.
- [I] Every case has a protection that worked against its designed threat and created the accident path: the 2P proof
  test, the processor shutdown, the closing isolation valves, the stall warning's validity gate, the graphite
  displacer. This is Perrow's claim that safety devices add complexity, made concrete.
- [I] Every case has a hand-off across a boundary: test rig to production, Ariane 4 to 5, regulator to operator,
  automation to pilot, contractor to operator, designer to operator.

## (B) What Nexus should take

1. **Perrow chart for every board** (node `analyse.perrow`; spec 09 and spec 10). From structure alone compute an
   interactive-complexity score and a coupling score, each a vector, not one number (reluctance to simplify):
   complexity = shared dependencies of independent functions (common-mode fan-in, including shared *space*, bus,
   sensor or source), undeclared cycles crossing subsystem boundaries, displayed values that are derived not sensed,
   nodes with more than one function; coupling = propagation time over detection-plus-response time, slack (margins,
   buffers, time constants), alternative paths (min-cut size), fixed order. Place the board on Perrow's chart with the
   evidence for each axis; flag the high-high quadrant. [I]
2. **Common-mode check over place, not only over wiring** (spec 01, spec 05 civil): two redundant parts sharing a
   room, elevation, cable route, supplier, software build or data source are flagged as one barrier, not two
   (Fukushima basements; Ariane's identical SRIs). Parts carry an elevation and location; a flood or fire zone node
   intersects them. [I]
3. **Every design value carries its record** (spec 10 trust): a "design basis" type holding the record length, the
   events in it, the return period it can honestly support, the method, and any known higher estimate with its date
   and what was decided. A value fitted to 50 years used for a 10,000-year demand is flagged (Fukushima's 3.1 m from
   one 1960 event). Higher estimates are never dropped; "referred for review" is recorded as a decision with an
   owner and a date. [I]
4. **Reuse carries its envelope** (spec 01 interfaces, spec 10): a part or block copied into a new board brings the
   envelope it was validated in (load spectrum, trajectory, temperature, rates); the new board's demand is compared
   with it automatically; a reuse outside is red until re-validated (Ariane 501). Extends round 3's finding 15 from
   "validity checked at run" to "validity checked at reuse". [I]
5. **Omitted checks are written where the check would be** (constitution rule; spec 00): if the AI or a person decides
   not to protect a conversion or not to check a case, the omission is a node in the board with its reason, its
   author and its assumption (the three unprotected Ariane variables had no recorded justification). [I]
6. **Status is never data** (spec 09 port types): a port carrying a value carries a separate status channel; a
   failed node emits a typed failure, which no consumer may read as a value (the SRI diagnostic pattern read as
   attitude). Wiring a status into a value port cannot connect (round 3's poka-yoke, applied to errors). [I]
7. **Failure responses checked at system level** (spec 09; STPA from 16): every node's "on failure" behaviour
   (shut down, hold last, go to default, close valve) is simulated in the whole board; a locally safe response that
   removes a function the system needs is flagged (SRI shutdown; IC valves closing). The safe state is declared per
   hazard, and conflicts between hazards are shown. [I]
8. **Transient checks for safety actions** (spec 09 physics core): a protective action is checked along its path
   in time, not only at its end state; if any interval moves the guarded quantity the wrong way, flag it (the graphite
   tips). [I]
9. **Live, displayed, interlocked limits** (spec 04 being in it, spec 10): any limit a procedure depends on is a
   live quantity in the view and wired into the protection, never only a computed report (Chernobyl's ORM). The view
   shows when a limit's own computation is unavailable. [I]
10. **"Invalid" is loud** (spec 04, spec 10): when a check's inputs become invalid, the check enters a visible
    invalid state, never silence; silence is reserved for "checked and fine" (AF447's stall warning below 60 kt). [I]
11. **Disagreeing measurements stop the line** (spec 10; andon from 16): two sensors, two solvers or two sources for one
    quantity that disagree beyond their stated uncertainty halt the branch until reconciled; the record shows both
    readings and the reconciliation (Deepwater's 1,400 psi against 0). [I]
12. **Explanations must have a model** (spec 00 reviewer panel; spec 10): an explanation the AI offers for an anomaly
    must name a mechanism with a model or a source; an explanation that appears only after a result, with no model,
    is labelled "ad hoc" and cannot clear a gate (the "bladder effect"). [I]
13. **Test specimens carry history** (spec 10 evidence): a test result records the specimen's prior loading, treatment
    and age; a result from a specimen not representative of production cannot validate production (the Comet's
    cold-worked prototype). [I]
14. **Hidden-crack assumption** (spec 01 failure modes; spec 05): a structural part's failure-mode record includes
    damage tolerance: the flaw assumed present, the inspection that would find it, the growth to critical; places no
    inspection can see (under a doubler) are flagged. Design philosophy declared per part: safe-life, fail-safe,
    damage-tolerant. [M]/[I]
15. **Regime change flags the rulebook** (spec 10 rules): when a board enters a regime its rules were not written for
    (pressurised when the rules were for unpressurised), the rules in force say so (Comet). Each rule node carries the
    regime it was written for. [I]
16. **The hand-over protocol** (spec 00 the AI; spec 04): when the AI hands control or a decision to a person it says,
    in a fixed form: what changed, what it no longer does (protections lost), what it knew and what it did not, why it
    let go, what to look at first, and what it recommends; guidance derived from a failed input is withheld or marked
    (AF447's flight director). The person's takeover is logged and the AI's model is kept running as a second opinion
    unless told to stop. [I]
17. **Keep the person practised** (spec 00; Bainbridge): the app offers drills (a board with a seeded fault for the
    person to find); the AI periodically shows its work rather than only results so the person's model stays current.
    [I]
18. **Mode is always visible** (spec 04 and spec 06 phone): the app and the agent state their mode (which law, which
    solver tier, which checks are on); a mode change is announced and logged; no silent degradation. [I]
19. **Blameless post-mortem node** (spec 00; replaces 16's five whys): a timeline reconstructed from the chronicle (spec
    11) showing what the AI or the person could see at each moment (its context, tool outputs), contributing factors
    rather than a root cause, "how" questions, what went right, and actions with owners; written for every failed gate
    above a severity threshold defined in advance; any person may request one. [C]/[I]
20. **Hindsight guard** (spec 00 reviewers): a reviewer judging a past decision is first shown only what was known then
    (from the chronicle at that time) and must state its judgement before seeing the outcome. [I]
21. **Safety-II log** (spec 00): record why runs went right: which check caught what, which adaptation saved a run;
    count saves, not only failures; review the "work as done" of the AI against the "work as imagined" in its prompts
    and specs. [C]/[I]
22. **FRAM port kinds** (spec 09, spec 11 process boards): beyond input and output, ports for precondition, resource,
    control and time, each coupling carrying a variability (on time, early, late, omitted; precise, imprecise); a
    `analyse.fram` node propagates variability and shows resonance paths. [C]/[I]
23. **Deference to expertise in the pipeline** (spec 00): on a question of fact the gate holding the evidence (the
    solver, the sourced table, the test) outranks the orchestrator; the orchestrator may not overrule a solver result
    with prose. Decisions "migrate" to the node with the knowledge. [I]
24. **Preoccupation with failure as a metric** (spec 00): near misses (a check that almost failed, a margin that shrank)
    are surfaced as weak signals; a run that passed by a smaller margin than last time is shown. Extends 16's drift
    monitor. [I]
25. **No means of skewed distributions** (spec 10; the VOID): the app's own reliability metrics report medians, tails
    and distributions; never MTTR-style means. [C]
26. **Known-value-to-decision path** (spec 10; lesson A12): every sourced value that bears on a safety decision is
    linked to the decisions it touches; when a new estimate arrives (higher tsunami, new failure data), the decisions
    it touches are reopened and their owners told (pushed, per 16). [I]
27. **Contested accident records** (spec 10, `research` agents): incident cases stored as several accounts with sources
    (INSAG-1, INSAG-7, the Russian dissent), never one merged story. [C]/[I]
28. **The Onagawa rule** (way of working for the AI): when the AI's own estimate exceeds the requirement, it says so
    and proposes the margin, with cost; a requirement is a floor, not a target. [I]
29. **Incident library as parts** (spec 01 failure modes, spec 07): the eleven cases here become linked lessons on part
    classes and interface keys: pressure-cabin cut-outs (Comet), float-to-int conversions and reused navigation
    software (Ariane), backup power by elevation (Fukushima), validity-gated alarms (AF447), redundant pressure
    readings (DWH), protective actions with transients (Chernobyl). [I]

## (C) Questions

The 70 questions of this pass are chapter 16 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches
- The NIOSH/CDC "normal accident theory-based complexity assessment": its graph attributes, read in full
- Rochlin, La Porte and Roberts (1987) on carrier flight decks: the original HRO evidence
- Vaughan's normalisation of deviance and the Columbia board, for the AI's drift
- Rasmussen's AcciMap as a post-mortem diagram across levels (operator to regulator)
- Extreme value statistics (GEV, peaks over threshold) and how long a record must be: a node for design bases
- Paleotsunami and paleoflood evidence as data with claim status (Jogan 869, Cascadia 1700)
- Damage-tolerance rules after Lusaka (1977) and Aloha 243 (1988); widespread fatigue damage; FAA AC 25.571
- Paris-law crack growth and NASGRO data as a sourced kind in Nexus
- Ariane 501 recommendation list in full, and Leveson's critique of the inquiry
- Fukushima Unit 1 isolation condenser: which valve closed and why (TEPCO, NRA, Diet commission disagree)
- Air France 447 human-factors annex: startle, dual input, the flight director's role
- Mode confusion research (Sarter and Woods, "How in the world did we ever get into that mode?") for the AI's modes
- Endsley's situation awareness levels and the Automation Transparency literature, for the hand-over schema
- Deepwater Horizon blowout preventer forensics (DNV): buckled pipe and shear-ram geometry as an interface failure
- INSAG-1 against INSAG-7 against the Russian accounts: holding contested records
- Woods' "theory of graceful extensibility" and resilience engineering metrics
- Cook's "How Complex Systems Fail" (1998), eighteen points, as a checklist for Nexus's own architecture
- Chaos engineering (Netflix Chaos Monkey, game days) as a Safety-II practice for Nexus's runtime
- The Learning from Incidents community's facilitation guides (Etsy debriefing guide) for the post-mortem node
- Signal detection theory for reading tests (the PSAM negative-pressure paper) as a reviewer-calibration method
- Boeing 737 MAX and AF447 together: what the AI should tell a person about automation they did not know existed

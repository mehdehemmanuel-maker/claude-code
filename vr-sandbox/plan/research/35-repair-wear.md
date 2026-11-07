# Research (round 6): Repair, wear and the long life of things
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here: FMEA's seven AIAG-VDA steps and Action Priority (`research/16-safety-failures.md`), the "number known
and never reached the decision" lesson including the Comet's fatigue (`00-synthesis.md`), DFA and Ashby cost
(`research/29-cost-markets.md`), evidence kinds (spec 10), effort-and-flow ports (spec 09), chronicle and replay
(spec 11). What the code holds today, checked in this pass: `src/nexus/assembly.ts` `exploded(t, f, levels, focus)`
moves each item out from the middle of what holds it by a fraction `f`, lifts what a container holds out of it, and
keeps pieces made in one (`one`) whole; it is a **picture** of coming apart, with no order, no direction of removal,
no fastener undone and no tool. `src/nexus/components.ts` `explodeAudit` checks that a thing comes apart to single,
weighed parts (the gauntlet's `explodes` gate in `gauntlet.ts`). `src/nexus/kits.ts` `Iface` has kinds
`shaft | studs | drive | chain | mount` with `provides | requires`, a diameter, a count and a torque; `Keep` zones carry
clearances "why, with the figures" (the wrench room). Nothing in `src/nexus` carries a failure rate, a life, a wear
rate, a damage sum or a repair step (grep for weibull, mtbf, fatigue, wear, repair finds no model of them) [C, the code].

## (A) Findings

### A1. Lifetimes are distributions, not numbers: Weibull, the bathtub, MTBF

- [M] The two-parameter Weibull, R(t) = exp(−(t/η)^β): β < 1 falling hazard (infant mortality), β = 1 constant hazard
  (the exponential), β > 1 rising hazard (wear-out); η is the life by which 63.2 % have failed. A three-parameter form
  adds a failure-free time γ. Rolling bearings are rated by L10 (the life 90 % reach), ISO 281, with a Weibull slope
  often taken near 1.1 to 1.5 [M, the slope range not checked].
- [C] MTBF assumes a constant hazard; under it R(MTBF) = e^−1 ≈ 0.368, so 63 % of units have failed by the MTBF; a
  100 000 h MTBF is about an 8.4 % annual failure rate, and "the product's design life is determined by wear-out, not
  MTBF" (https://engicalchub.com/guides/mtbf-guide; also https://en.wikipedia.org/wiki/Mean_time_between_failures,
  which adds that many engineers wrongly assume 50 % have failed at t = MTBF).
- [I] So a part in Nexus must carry a **life law** (a distribution with its parameters and the stress it was measured
  at), never a bare "MTBF" field; an MTBF is only a view of a constant-hazard law, and the view should refuse to be
  shown when β is far from 1.

### A2. Most things do not wear out on a schedule: Nowlan and Heap's six patterns

- [C] Nowlan and Heap, *Reliability-Centered Maintenance*, United Airlines for the US DoD, Dec 1978 (AD/A066-579),
  six age-reliability patterns: A bathtub, B constant then wear-out, C slowly rising, D rising then constant, E
  constant, F infant mortality then constant. Accendo's table gives the UAL 1968 split A 4 %, B 2 %, C 5 %, D 7 %,
  E 14 %, F 68 %, and other studies differing widely (Broberg 1973, NAVAIR 1982, SSMD 1993, SUBMEP 2001: pattern F
  from 6 % to 66 %) (https://accendoreliability.com/failure-rate-classification-for-rcm).
- [C] The report's line: "only curves A and B show wear-out characteristics … some 89 % of the items analyzed showed
  no wear-out zone" (same source). Reliamag warns these percentages are of United Airlines items in one exhibit, "not
  a plant-wide average … not a number you can drop into your own asset register"; NASA's summary of three studies
  gives random failures 77 to 92 % (https://reliamag.com/topics/guides/six-failure-patterns-nowlan-heap).
- [C] Note: the two sources disagree on which column is "Nowlan-Heap 1978" versus "UAL 1968" (Accendo's table shows
  E 34 % / F 48 % under one heading and 14 % / 68 % under the other). Not resolved this pass; the original report
  should be read before Nexus quotes any split.
- [C] The consequence drawn by practitioners: unless a dominant age-related mode exists (metal fatigue is the named
  example), scheduled overhaul "does little or nothing", and for patterns A and F it can increase failures, since it
  restarts infant mortality (https://www.savvyaviation.com/reliability-centered-maintenance-part-1).

### A3. RCM, SAE JA1011 and MSG-3: maintenance as a decision on consequences

- [C] SAE JA1011 (1999, rev. 2009) says a process may be called RCM only if it answers seven questions in order:
  functions and performance standards in the operating context; functional failures; failure modes; failure effects;
  failure consequences; proactive tasks; default actions when no proactive task fits
  (https://reliamag.com/topics/guides/how-to-perform-rcm; https://tractian.com/en/glossary/sae-ja1011, which adds
  JA1012 as the guide to it, and Moubray as the author of the seven questions).
- [C] A proactive task must be technically feasible and worth doing; the defaults are failure-finding (for hidden
  failures) or a one-time redesign, or run-to-failure where consequences allow
  (https://www.cryotos.com/blog/7-questions-of-reliability-centered-maintenance-rcm).
- [C] MSG-3 (first issued 1980, from Nowlan and Heap) sorts each functional failure by **evident or hidden**, then
  **safety, operational or economic**; tasks are chosen from a ladder of rising cost, lubrication/servicing,
  operational/visual check, inspection/functional check, restoration, discard; for safety consequences with no task
  applicable, redesign is mandatory (https://www.aviationpros.com/aircraft-maintenance-technology/engines-parts/article/10388498/msg-3-the-intelligent-maintenance;
  https://sassofia.com/blog/the-msg-3-philosophy-an-aviation-maintenance-story-in-six-chapters;
  https://reliabilityweb.com/articles/entry/the_case_against_streamlined_reliability_centered_maintanance for the 1980 date).
- [C] MSG-3 recognised damage-tolerance rules and supplemental structural inspection programs, which MSG-2 lacked
  (https://blog.sourceonespares.com/understanding-the-msg-3-aviation-maintenance-approach, citing Skybrary).
- [M] Condition-based maintenance rests on the P-F interval: the time from when a failure becomes detectable (P) to
  functional failure (F); an inspection interval must be shorter than P-F, typically taken as half of it.
- [I] The RCM questions are a graph walk: function → failure → mode → effect → consequence → task. Nexus already has
  functions (what a part provides) on interfaces; the rest is a typed chain hung off them.

### A4. Handbook failure rates and their critics: MIL-HDBK-217, FIDES, physics of failure

- [C] MIL-HDBK-217F (last revised 1995, Notice 2) gives part failure rates as a base rate times π factors
  (temperature, quality, environment, …), in failures per 10^6 hours; the NAVSEA copy shows e.g. elapsed-time meters
  λp = λb·πT·πE with environment factors from GB 1.0 to CL "N/A"
  (https://www.navsea.navy.mil/Portals/103/Documents/NSWC_Crane/SD-18/Test%20Methods/MILHDBK217.pdf).
- [C] A 2020 CALCE report for NASA NEPP (Pecht, Das, Gaonkar) argues the handbooks "failed to acknowledge that the
  degradation and failure of a component cannot be condensed into a single unique 'constant failure rate' metric",
  and cites Bowles, "Caution: Constant Failure-Rate Models May Be Hazardous to Your Design", IEEE Trans. Rel. 51(3),
  2002 (https://nepp.nasa.gov/docs/papers/2020-NASA-FIDES-CALCE-Report-Univ-MD-Pecht-Das-Gaonkar.pdf).
- [C] Pandian, Das, Li, Zio, Pecht, "A critique of reliability prediction techniques for avionics applications",
  Chinese J. Aeronautics: the US National Academy of Sciences has judged MIL-HDBK-217 "and its progeny as invalid and
  inaccurate"; alternatives named: similarity analysis, testing, physics-of-failure, prognostics and health
  management (https://www.sciencedirect.com/science/article/pii/S100093611730239X).
- [C] Reliabilityweb reports field comparisons where the 217 prediction matched field rates only after the quality
  factor πQ was chosen to fit (2 for one board, 3 for another), i.e. the knob was tuned afterwards
  (https://reliabilityweb.com/mtbf-misinterpreted-and-misused).
- [C] FIDES (French DGA-led, guide 2009, used by Airbus and pushed through its supply chain to ESA): λ = λPhysical ×
  ΠPM × ΠProcess, with λPhysical built from a mission profile of phases (thermal cycling, humidity, vibration, …);
  CALCE criticises treating manufacturing and process as independent multipliers when they interact
  (NASA NEPP report above; https://www.fides-reliability.org).
- [I] For Nexus: a handbook rate is a **claim of kind "handbook"**, weak evidence, with its environment factor named;
  a physics-of-failure life is a model with a validity envelope; the two must not be added together silently.

### A5. Physics of failure: the laws that turn load history into damage

- [M] S-N (Wöhler) curve, Basquin's form σa = σf′·(2N)^b; a fatigue (endurance) limit for many steels near 10^6 to
  10^7 cycles, none for aluminium alloys. Low-cycle fatigue by Coffin-Manson in strain. Rainflow counting
  (ASTM E1049) turns a load history into cycles.
- [C] Palmgren (1924, ball bearings) and Miner (1945): D = Σ nᵢ/Nᵢ, failure at D = 1. It ignores sequence and
  interaction; measured damage sums at failure are "typically" 0.7 to 2.2, and codes prescribe allowables below 1,
  e.g. D ≤ 0.5 for some welded steel standards, or 0.3
  (https://www.quadco.engineering/en/know-how/an-overview-of-the-palmgren-miner-rule.htm;
  https://metricgate.com/docs/palmgren-miner-cumulative-damage).
- [C] Variants: Miner "original/consequent" (cycles below the fatigue limit do no damage: optimistic), "elementary"
  (S-N extended below the limit at the same slope: conservative), Haibach's "modified" (a shallower slope below the
  limit, LBF TM 50, 1970); the FKM guideline gives recommended critical damage sums by material and spectrum
  (https://www.fatec-engineering.com/wp-content/uploads/2026/03/Some-Thoughts-About-The-Miner-Rule-Fatec-Engineering-White-Paper.pdf;
  https://pylife.readthedocs.io/en/latest/demos/lifetime_calc.html, an open Python implementation of the variants).
- [C] "A damage value is therefore not a precise remaining-life measurement; it is a model-based index"
  (https://atlasofengineering.com/materials-engineering/miner-rule).
- [M] Paris law for crack growth: da/dN = C·(ΔK)^m, ΔK = Y·Δσ·√(πa); for steels m ≈ 3, C of order 10^−12 to 10^−11
  in m/cycle with MPa√m; valid between the threshold ΔKth and fast fracture at K_IC. This is what damage-tolerant
  design (and MSG-3's structural inspections) integrates to set inspection intervals.
- [C] Archard: V = K·W·L/H (wear volume, dimensionless coefficient K, normal load W, sliding distance L, hardness H of
  the softer surface); K ≈ 10^−8 for mild wear, ≈ 10^−2 for severe (https://en.wikipedia.org/wiki/Archard_equation).
  Meng and Ludema counted 182 wear equations; Archard is used beyond adhesive wear, for abrasive and fretting, often
  with K fitted (https://www.tribonet.org/wiki/archard-wear-equation). A 2025 review of its foundations and critiques:
  https://www.mdpi.com/2673-8392/5/3/124.
- [I] Six orders of magnitude in K means Archard alone predicts nothing; K is a measured property of a **pair** of
  materials and a lubrication state, not of one material. It belongs on the interface between two parts.
- [C] ISO 9223:2012 corrosivity categories with first-year rates (carbon steel / zinc, µm per year): C1 ≤ 1.3 / ≤ 0.1;
  C2 1.3–25 / 0.1–0.7; C3 25–50 / 0.7–2.1; C4 50–80 / 2.1–4.2; C5 80–200 / 4.2–8.4; CX 200–700 / 8.4–25
  (https://jeffandsimon.com/corrosion-protection/corrosivity-categories-bc). The standard gives dose-response
  functions from SO2 deposition, chloride, relative humidity and temperature, and warns that first-year rates
  "cannot be simply extrapolated"; long-term models are in ISO 9224
  (https://www.eskom.co.za/wp-content/uploads/2024/04/Appendix_5.8.E_SO_9223_2012en.pdf).
- [M] Long-term atmospheric corrosion is usually taken as a power law, loss = r_corr·t^b with b near 0.5 to 0.6
  (ISO 9224's form). Creep: Larson-Miller P = T·(C + log t_r) with C ≈ 20 for many steels; Norton's law for the
  secondary rate ε̇ = A·σ^n.
- [I] Every one of these is the same shape: a rate law driven by a load on a place (a stress cycle at a fillet, a
  normal load times sliding at a contact, wetness and chloride on a surface, temperature on a hot section), integrated
  over a history. Nexus's interfaces are exactly the places; spec 11's chronicle is exactly the history.

### A6. Analyses that structure failure: FMECA, fault trees, reliability block diagrams

- [M] FMECA (MIL-STD-1629A, 1980) adds criticality to FMEA: Cm = β·α·λp·t (probability of the effect, mode ratio,
  part failure rate, time). Fault trees (IEC 61025; NUREG-0492, the 1981 Fault Tree Handbook) go top-down from an
  undesired event through AND/OR gates; minimal cut sets name the smallest sets of failures that cause it. Reliability
  block diagrams (IEC 61078) compose series (R = ΠRᵢ) and parallel (1 − Π(1 − Rᵢ)) blocks, k-out-of-n.
- [I] An assembly in Nexus is already a tree of parts joined at interfaces; a reliability block diagram is a
  **reading** of that tree under a function ("the wheel turns" needs the bearing AND the axle AND either bolt pattern
  half). Folding (the functor rule of the synthesis) must hold for it too: a folded block's reliability must equal what
  its inside computes.

### A7. Repairability scores: EN 45554, the EU phone label, France, iFixit

- [C] EN 45554:2020 is the general method for assessing ability to repair, reuse and upgrade energy-related products,
  in the EN 4555x material-efficiency series; parameters include disassembly depth, fasteners (reusable, removable),
  tools, skill level, diagnosis, spare parts, information
  (https://complymarket.com/en/blogs/repairability-scores; https://susproc.jrc.ec.europa.eu/product-bureau/sites/default/files/2021-12/JRC_Report_Repair_Score_Smartphone_Tablets_v2.pdf).
- [C] The JRC scheme for phones and tablets scores disassembly depth, fasteners and tools **per priority part**, each
  1 to 5, weighted by that part's weight ωᵢ, and spare parts, software updates and repair information at product
  level; R = Σ Sⱼ·Wⱼ over six parameters (JRC report above). Weights: disassembly depth 25 %, fasteners 15 %, tools
  15 %, the other three 15 % each; one step to the part scores 5, more than 15 steps scores 1; reusable fasteners 5,
  removable only 1; tools from "none" (5) to "commercially available" (1)
  (https://www.ifixit.com/News/82023/ifixit-vs-jrc-repairability-score; https://www.gsmarena.com/glossary.php3?term=eu-repairability-class).
- [C] Delegated Regulation (EU) 2023/1669 classes from R: A R ≥ 4.00; B 3.35–4.00; C 2.55–3.35; D 1.75–2.55;
  E 1.00–1.75 (https://www.product-compliance-services.eu/suppliers/product-specific-guidelines/electronic-devices/smartphones-slate-tablets-cordless-phones-and-other-mobile-phones/energy-labelling-regulation/the-repairability-class).
  EUR-Lex itself could not be fetched this pass.
- [C] The label applies from 20 June 2025 (with battery endurance, drop class, IP rating); ecodesign 2023/1670 requires
  spare parts for professional repairers for 7 years after the model leaves the market, OS updates for 5 years, and
  80 % battery capacity after 800 cycles (https://www.circuleid.com/resources/learn/smartphone-ecodesign;
  https://research.hktdc.com/en/article/MjAyNzAzMzUyOQ). One site's count of registered models: smartphones A 5 %,
  B 49 %, C 42 %, D 3 %, E under 1 % (https://www.repairinfo.app/en/guide/repairability-class, unverified secondary).
- [C] France's indice de réparabilité (decree 2020-1757, from January 2021): five criteria of 20 points each
  (documentation; disassembly, tools and fasteners; spare-part availability; spare-part price relative to the
  product; product-specific), summed and divided by 10
  (https://www.productipedia.com/kb/productipedia/compliance-resources/indice-de-r%C3%A9parabilit%C3%A9). HOP's
  critique: equal weights let documentation buy points; it proposed 15/25/25/25/10
  (https://www.halteobsolescence.org/wp-content/uploads/2022/02/Rapport-indice-de-reparabilite.pdf). The **durability
  index** (decree 2024-316) replaced it for televisions (January 2025) and washing machines (April 2025), adding
  reliability and robustness (https://entreprendre.service-public.gouv.fr/vosdroits/F38092?lang=en); the French index
  no longer applies to smartphones since July 2025, the EU class replacing it (repairinfo.app above).
- [C] iFixit's score: a teardown traces the path to each critical component, recording every disassembly and
  reassembly action at a **proxy time** from a fixed table, multiplied by a **tool scaling factor** (cost,
  availability, skill, safety: a pentalobe costs more than a Phillips though it takes as long); the path sums fall into
  bands, weighted by component importance, and make 80 % of the score; parts availability 10 %, documentation the rest
  (no free manual caps the score at 9.0/10) (https://www.ifixit.com/News/75533/how-ifixit-scores-repairability).
- [I] Both the JRC and iFixit scores are **functions of a disassembly path to a named part**. Nexus can compute the path
  if it knows the order and the fasteners; the documentation and parts terms are facts about the world, not the model,
  and must be sourced claims.

### A8. Right-to-repair law

- [C] Directive (EU) 2024/1799 (adopted 13 June 2024, in force 30 July 2024, applied from 31 July 2026): manufacturers
  must repair goods listed in Annex II (those with EU repairability requirements: washing machines, dishwashers,
  fridges, displays, vacuum cleaners, servers, phones, tablets, light-transport-vehicle batteries, …) at a reasonable
  price and time beyond the guarantee; 12 months' extra seller liability when the consumer chooses repair; a European
  Repair Information Form; national penalties differ (Germany's Reparaturgesetz passed five weeks before the deadline)
  (https://www.cleolabs.co/en/blog/eu-right-to-repair-transposition-2026;
  https://www.eltoma-global.com/knowledge-base/eu-right-to-repair-2026-new-repair-duties-eltoma).
- [C] US: California SB 244 (effective 1 July 2024): parts, tools and documentation for products with wholesale price
  ≥ $50, for 7 years if ≥ $100 (https://www.crowell.com/en/insights/client-alerts/right-to-repair-a-growing-trend-for-states-creating-compliance-challenges-for-manufacturers;
  https://bhgs.dca.ca.gov/forms_pubs/sb_244_industry_advisory_english.pdf). Oregon was first to ban **parts pairing**
  (software that ties a part's serial to the device) for devices made after 1 January 2025; Colorado's ban applies
  from 1 January 2026; Minnesota's Digital Fair Repair Act covers digital electronics sold after 1 July 2021
  (https://www.reinhartlaw.com/news-insights/oregon-passes-right-to-repair-law-first-to-ban-parts-pairing;
  https://h2compliance.com/a-tough-consumer-electronics-right-to-repair-law-goes-live-in-the-us). [C] Common exclusions:
  consoles, medical devices, cars, farm equipment (h2compliance above).
- [I] Parts pairing is an interface fact: the part's identity is part of what it demands of its host. Nexus's interface
  model can show it as a requirement that a third-party part cannot meet, which is what the law targets.

### A9. Disassembly sequence planning and its graphs

- [C] Homem de Mello and Sanderson represented all assembly (and so disassembly) plans as an AND/OR graph, from which a
  near-optimal sequence is searched (cited in https://asmedigitalcollection.asme.org/computingengineering/article/2/1/28/449175/A-Hybrid-Disassembly-Sequence-Planning-Approach;
  survey: https://www.academia.edu/49207956/Disassembly_Sequence_Planning_A_Survey). **Selective** disassembly asks
  for the shortest removal of one target, the repair case (https://journals.sagepub.com/doi/10.1177/09544054231201873).
- [C] State-Based Disassembly Planning (arXiv 2501.05156, Jan 2025) uses physics simulation as the transition
  function, tries translations before rotations, records motion states to avoid re-simulating them, and builds
  **Directional Blocking Graphs** enriched with state, beating prior planners on thousands of physically valid
  industrial assemblies (https://arxiv.org/html/2501.05156v1).
- [M] A directional blocking graph (Wilson and Latombe's non-directional blocking graph, 1994) records, for each
  direction d, which part blocks which when moved along d; a part with no blocker in some d is free to come out. With
  liaisons (fasteners, mates) as extra precedences, a disassembly precedence graph follows.
- [C] Mandolini and colleagues' time-based method scores sequences by summed operation times from tables, like iFixit's
  proxy times (https://air.unipr.it/retrieve/e177fbc8-1427-50b0-e053-d805fe0adaee/2017-09-26%20-Manuscript_IJAMT_DfD_method_CF.pdf).
- [C] A CEN workshop draft applying EN 45554 to automobiles notes the standard scores reusability of fasteners and of
  priority parts but **not of the parts removed only to reach them** ("removing parts for access"), and proposes a
  0-to-10 disassembly index from fastener type and modularity
  (https://www.cencenelec.eu/media/CEN-CENELEC/News/Workshops/2025/2025-08-08_Automotive/draft_ws_cwa_usc.pdf).
- [I] Nexus's `exploded()` already has the geometry (boxes, a container that holds others) but radiates from the middle;
  a blocking graph from the exact solids (replicad) plus fasteners from the interfaces would give an ordered,
  directional explode that is also a repair sequence.

### A10. Design for disassembly, remanufacturing, circular metrics

- [C] Cat Reman: an exchange business; the customer pays a price well below new plus a **core deposit** refunded on
  return of the old part; the core is "disassembled down to the smallest part, losing its original identity", cleaned,
  inspected against specification, salvaged, and sold with the same warranty as new
  (https://www.caterpillar.com/en/company/sustainability/remanufacturing/benefits.html;
  https://www.caterpillar.com/en/company/sustainability/remanufacturing/process.html). Caterpillar says it recycles
  more than 150 million pounds of end-of-life iron a year (benefits page); a secondary case study quotes Cat claims of
  85 % less raw material and energy, 61 % less greenhouse gas than new (https://www.circularx.eu/en/cases/90/caterpillar-reman-ufacturing-hub,
  Cat's own figures, not independent).
- [I] "Losing its original identity" is the Ship of Theseus answered by industry: identity is in the **type and
  specification**, not the atoms; the part's serial ends at disassembly.
- [C] Ellen MacArthur Material Circularity Indicator: MCI = 1 − LFI·F(X), F(X) = 0.9/X, X = (L/Lav)·(U/Uav); a fully
  linear product of average utility scores 0.1, a fully circular one 1; LFI is the share of virgin input and
  unrecovered waste in the mass flow; said to comply with ISO 59020 on circularity metrics
  (https://support.etool.app/index.php/knowledgebase/circular-economy-material-circularity-indicator).
- [I] MCI rewards longer life L and more intense use U directly; a Nexus life law feeds L, so the reliability and
  circularity work share one input. `madeof.ts`'s mass-by-material walk (research 29) feeds the mass flows.

### A11. Long-life precedents: Ise and Theseus

- [C] Ise Jingu's Shikinen Sengu rebuilds the sanctuaries every 20 years on the adjacent plot, identical in every
  joint; the 62nd was completed in 2013, the 63rd's rites began in 2025 (33 rituals over eight years) and culminate in
  2033; about 125 structures in the shrine complex are renewed, needing about 10 000 to 11 000 hinoki cypress trees
  (https://www.nationalgeographic.com/travel/article/this-japanese-shrine-is-torn-down-every-20-years;
  https://visitmie-japan.travel/en/articles/20260316143107; https://www.ap.org/news-highlights/spotlights/2025/photos-show-historic-japanese-shrine-that-is-torn-down-and-rebuilt-every-20-years).
  "What it hands down is not a building but the complete knowledge of how to make one", and each cycle trains the next
  generation of carpenters before the old one is gone (https://www.confinity.com/landmarks/ise-grand-shrine).
- [M] Old timbers from the dismantled halls go on to other shrines (the Uji bridge torii are commonly cited).
- [M] Plutarch's Ship of Theseus: planks replaced one by one; Hobbes added the second ship built from the old planks.
  [I] Nexus's model of "a thing stored once and reused" already says what Theseus answers: the **recipe** is the
  identity; an instance's history (which planks, when) is the chronicle. Ise is the proof that keeping the recipe
  live, by rebuilding, keeps a thing longer than keeping its material.

## (B) What Nexus should take

1. **Rule (spec 10 trust): a life is a law, never a number.** A part's reliability is stored as a distribution (Weibull
   β, η, γ; or exponential λ only when evidence shows a constant hazard), with the stress and environment it was
   measured at, its evidence kind (field data, test, handbook, physics-of-failure model, inferred) and its source.
   MTBF is a derived view, shown with "63 % fail before this" and refused or badged when β ≠ 1. (A1, A4)
2. **Data model (spec 01 interfaces): wear and damage are quantities on interfaces.** Each interface gains optional
   `wear` fields: the mechanism (fatigue, sliding wear, fretting, corrosion, creep), the governing law, its
   parameters, and a **state** (damage sum D, wear depth, crack length a, section loss). An Archard K lives on the
   pair of mating surfaces (both materials and the lubricant), not on one part. A bolted joint's interface carries its
   fatigue class; a bearing's carries its L10 and the load it was rated at. (A5)
3. **Node (spec 09 physics core): `wear.integrate`.** Takes a load history (from live physics, or a declared duty cycle)
   and the interface laws; rainflow-counts stresses and sums Miner damage (variant named: original, elementary,
   Haibach; allowable D named with its code), integrates Paris from a stated initial flaw, Archard over sliding
   distance, ISO 9223/9224 for an exposure category. Output: state per interface, and the time to each limit, each
   with its validity envelope (Paris between ΔKth and K_IC; first-year corrosion not extrapolated without 9224).
4. **Node: `reliability.blocks`.** Reads an assembly under a named function and produces a reliability block diagram
   (series, parallel, k-of-n) from the interfaces the function passes through; computes system R(t) by composing the
   life laws, Monte Carlo where they are not exponential (spec 10's sampling mode). Folding law tested: a folded
   block's R(t) equals its inside's. (A6)
5. **Node: `faults.tree`.** The same assembly read top-down from an undesired event to minimal cut sets; each leaf is an
   interface failure mode. The AI is not allowed to type a fault tree by hand where the model can derive it. (A6)
6. **Way of working (spec 07 ideas, later spec): the RCM chain on the graph.** Function (already on interfaces as
   `provides`) → functional failure → mode (the wear mechanism) → effect (what the RBD says stops) → consequence
   (MSG-3's evident/hidden × safety/operational/economic) → task from the ladder (servicing, check, inspection,
   restoration, discard) or redesign. Each answer is a node output with its evidence; "redesign mandatory" is a
   gauntlet failure for safety consequences with no task. (A3)
7. **Node: `inspect.interval` from P-F.** Where a mechanism has a detectable precursor (crack length a detectable at
   a_det; wear depth at a gauge), the interval is computed from the integrated law between detectable and critical,
   with its safety factor shown. This is damage-tolerant design as a node. (A3, A5)
8. **Node (spec 00 structure, extends `assembly.ts`): `disassemble`, the ordered explode.** From the exact solids,
   build a directional blocking graph (which part blocks which along ±x, ±y, ±z, and the fastener axes); add
   fasteners and mates from interfaces as precedences (a bolt must leave before what it clamps); search for the
   sequence to a **target** part (selective disassembly), preferring translations. Output: the ordered steps, each
   with its direction, the fastener undone and the tool. `exploded()` then animates that sequence instead of
   radiating from the middle. `explodeAudit` gains a gate: "every part can be removed by some sequence". (A9)
9. **Data model: fasteners say how they come undone.** The interface a bolt pastes already derives clearance and
   wrench room from its standard; add: tool (from a tool table: hex key size, Torx, pentalobe, none), whether it is
   reusable, removable only, or destroyed (adhesive, rivet, weld, snap that breaks), and a proxy time per action. This
   is what both EN 45554 scoring and iFixit's method need, and it comes for free from the standard. (A7)
10. **Node: `repair.score`, computed from the model.** Given priority parts (each with a weight, sourced, e.g. from the
    regulation's list for phones, or from the RBD's most likely failures), run `disassemble` to each; score disassembly
    depth (steps), fasteners and tools per the 2023/1669 grid, and an iFixit-like time path (proxy time × tool
    factor). The world-facts terms (spare-part availability years, price ratio, documentation, software updates) are
    sourced claims the user supplies, marked if absent. The output shows both schemes side by side, never one blended
    number, and names the "parts removed for access" EN 45554 misses. (A7, A9)
11. **Rule: a score is a function of a path, and the path is shown.** No repairability number without the sequence that
    produced it; clicking the number plays the sequence in 3D/VR. (A7)
12. **Node: `rebuild.cycle` (spec 11 living world).** Ise and Cat Reman as one pattern: a thing at time t is its
    recipe plus a chronicle of replacements; a scheduled renewal (Ise every 20 years), a core return (Reman), or
    plank-by-plank (Theseus) are policies run over the chronicle; the outputs are material flows for MCI and cost.
    Identity questions are answered by the store: the recipe is the type, the instance's history the chronicle. (A10, A11)
13. **Node (spec 12 cost-carbon): `circularity.mci`.** From the mass-by-material walk, virgin and recycled fractions
    (sourced), recovery routes, and L and U from the life law and duty cycle; ISO 59020 named. (A10)
14. **Rule: handbook rates are weak evidence and stay separate.** A MIL-HDBK-217 or FIDES rate is tagged "handbook"
    with its π factors shown, never summed with a physics-of-failure life without saying so; the AI must say which it
    used. (A4)
15. **Rule: never quote Nowlan-Heap percentages as a prior.** The six patterns are a vocabulary for a life law's
    shape, not a distribution to assume. (A2)
16. **Data model: parts pairing as an interface requirement.** An interface may require an identity (a serial match);
    a third-party part then fails the mate visibly; the repair score marks it. (A8)
17. **Node: `law.repair` (spec 07 ideas).** The legal duties by jurisdiction (EU 2024/1799 Annex II, 2023/1670's 7 and
    5 years, California SB 244's price tiers, Oregon and Colorado pairing bans) as sourced, dated rules checked against
    a product node: "this phone, sold in the EU, must have its battery available until …". (A8)

## (C) Questions

The 67 questions of this pass were chapter 31 of the book; 0 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q31.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches

- The original Nowlan-Heap report (NTIS ADA066579), to settle the six-pattern percentages and read its exhibits.
- SAE JA1012 (the guide to JA1011) and Moubray's RCM II text, for the decision diagrams as data.
- ISO 9224 long-term corrosion models and ISO 9223 dose-response functions as nodes, tied to a world map of climate.
- FKM guideline tables of critical damage sums, and pyLife as a reference implementation to test against.
- Wilson and Latombe's non-directional blocking graph (1994) and its use in ASAP or Fusion 360 Assembly datasets for
  benchmarking `disassemble`.
- The "thousands of physically valid industrial assemblies" benchmark used in arXiv 2501.05156: its name and licence.
- iFixit's proxy-time table and tool scaling factors: whether published, and under what licence.
- EN 45554's full parameter tables and its Annex on fasteners, and EN 45552 (durability) and EN 45553 (remanufacture).
- The JRC repairability methods for laptops and other product groups now in preparation under ESPR.
- Digital Product Passports under ESPR (Regulation 2024/1781) as the format a Nexus product could export.
- Damage-tolerant design rules (FAA AC 25.571, widespread fatigue damage) as a worked case for `inspect.interval`.
- Prognostics and health management (remaining useful life estimation, particle filters) as the live counterpart.
- Wöhler's railway axle tests (1850s-60s) and the Comet as historical cases for the gallery.
- Solder-joint fatigue models (Engelmaier) and IPC-9701 for electronics mission profiles.
- Japanese wooden-joint (sashimono, tsugite) carpentry as design for disassembly without fasteners.
- Repair cafés and Restart Project fault data (Open Repair Data Standard) as real failure-mode statistics.
- Fairphone and Framework laptop teardown data as sources of priority-part weights and module designs.
- Bicycle and car service manuals (torque tables, service intervals) as sourced maintenance tasks to import.
- Availability and spares optimisation (METRIC, Sherbrooke) for fleets in the living world.
- Wabi-sabi and kintsugi: visible repair as a value, for how Nexus draws repaired parts.

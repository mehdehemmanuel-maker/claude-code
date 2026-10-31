# Research (round 4): Growth and self-organisation as design methods

One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Scope: the far branch "grow where needed". It follows the leads that `12-nature-collective.md` listed and did not
follow (lines 42 to 61 there). It does not repeat TERMES, Seeley's bee quorum, or the flocking rules covered in 12.
Note: arxiv.org cannot be reached from this session, and Tavily hit its rate limit partway through. Some abstracts
were therefore read from mirrors (uvm.edu, PMC) and some details stay [M].

## (A) Findings

### 1. Loops in transport networks: damage and fluctuating load (Katifori; Ronellenfitsch and Katifori)

- [C] Katifori, Szöllősi and Magnasco, "Damage and fluctuations induce loops in optimal transport networks", PRL 104,
  048704 (2010) (https://link.aps.org/doi/10.1103/PhysRevLett.104.048704; abstract text read at
  https://pdodds.w3.uvm.edu/files/papers/others/2010/katifori2010a.pdf). Networks optimised only for efficiency are
  trees, with no loops. Leaf venation has many closed loops, and these still carry fluid when any vein is damaged,
  including the primary veins. The paper tests two objectives. (a) Damage: average the transport cost over the cutting
  of each link. (b) Fluctuating load: a single moving sink, so at any time most sinks are closed, and the objective is
  the summed power loss over sink positions, F = Σₐ Pₐ. **Both objectives give loops in the optimum.**
- [M] The cost constraint in that model is Σ Kᵢ^γ = const, with γ < 1. Without damage or fluctuation, the optimum for
  γ < 1 is a tree. The share of loops rises with fluctuation strength. (The exact γ thresholds are not checked here.)
- [C] Ronellenfitsch and Katifori, "Global optimization, local adaptation, and the role of growth in distribution
  networks", PRL 117, 138301 (2016) (https://link.aps.org/accepted/10.1103/PhysRevLett.117.138301; arXiv 1606.00331).
  Flow networks whose vessels adapt by local positive feedback usually get stuck in low-efficiency local minima.
  **Growth of the tissue itself, entering as local deterministic terms, lets the network escape those traps** and reach
  near-globally-optimal networks that resemble real veins.
- [C] Hu and Cai, "Adaptation and optimization of biological transport networks", PRL (2013), PMID 24116821
  (https://pubmed.ncbi.nlm.nih.gov/24116821). This is a local adaptation rule (conductance grows with flow and decays
  with a metabolic cost) that reaches the energy optimum. [M] Its loops-versus-tree transition depends on the cost
  exponent and on noise in the flow.
- [C] Tero et al., "Rules for biologically inspired adaptive network design", Science 327:439–442 (2010)
  (https://scispace.com/pdf/rules-for-biologically-inspired-adaptive-network-design-5fajyacscy.pdf). The model picks a
  random source–sink pair each step, conserves flux at each node and adapts each edge by its flux. Physarum's networks
  measured TL/MST = 1.75 ± 0.30 (n = 21), against about 1.8 for the Tokyo rail network. Physarum also matched the rail
  network on efficiency (MD) and fault tolerance (FT).
- [I] These papers share one method: **a local rule (thicken what carries flow, thin what does not), plus an ensemble of
  loads or damages, plus growth of the domain, gives networks that are cheap, efficient and fault tolerant.** The
  objective is stated, so the result can be checked.

### 2. Murray's law: a sizing rule with a validity envelope

- [C] Murray (1926), PNAS 12:207–214, "The physiological principle of minimum work" (https://en.wikipedia.org/wiki/Murray%27s_law).
  Pumping power (Poiseuille) is traded against the cost of blood volume. The optimum gives r₀³ = Σ rᵢ³, and the flow
  in each vessel is proportional to r³.
- [C] Sherman (1981), J Gen Physiol 78:431–453 (https://pdfs.semanticscholar.org/70aa/025ae7bb6a9f9654b249655fce6ebd7840e3.pdf).
  Large parts of the mammalian circulatory and respiratory trees obey the law, and it can also be derived for non-living
  optimal systems. Murray's 1926 paper is the general derivation, after Hess (1917).
- [C] Large human vessels such as the aorta and trachea fit an exponent near 2, not 3. Partly turbulent flow predicts
  about 7/3 (Wikipedia, same URL). [M] Area-preserving branching (exponent 2) is also what WBE assumes for large
  pulsatile vessels.
- [C] Zheng et al., "Bio-inspired Murray materials for mass transfer and activity", Nat Commun 8:14921 (2017). The
  pore diameters of a three-level ZnO material are set by Murray ratios. The "up to 25×" battery gain comes from a
  press release (https://www.eng.cam.ac.uk/node/3942) and is **not checked against the paper**.
- [I] Murray's law holds where its assumptions hold: laminar, steady Poiseuille flow, a cost proportional to volume,
  and rigid tubes. Outside them the exponent changes (turbulent flow about 7/3, pulsatile flow about 2, diffusion-dominated
  transport differs). This is exactly the kind of law the synthesis (#4) says must carry a validity envelope.

### 3. West–Brown–Enquist scaling and its critiques

- [M] WBE, Science 276:122–126 (1997). A space-filling, hierarchically branching network with size-invariant terminal
  units (capillaries) that minimises transport cost predicts metabolic rate B ∝ M^¾.
- [C] Kozłowski and Konarzewski, Funct Ecol 18:283–289 (2004) (https://pdodds.w3.uvm.edu/research/papers/others/2004/kozlowski2004a.pdf)
  call WBE "mathematically incorrect" and its assumptions "biologically unjustified". They report measured exponents
  between 2/3 and 3/4 for broad taxa. Brown, West and Enquist answer in 2005 that K&K misread the model
  (https://pdodds.w3.uvm.edu/files/papers/others/2005/brown2005a.pdf).
- [C] Savage, Deeds and Fontana, "Sizing up allometric scaling theory", PLoS Comput Biol 4:e1000171 (2008)
  (https://journals.plos.org/ploscompbiol/article?id=10.1371%2Fjournal.pcbi.1000171). The ¾ value holds only in the
  infinite-size limit. With finite-size corrections WBE predicts about 0.81. The measured curvature in log B against
  log M runs **opposite** to the model's, so the model needs amending or the data analysis needs reassessing.
- [C] Earlier critiques (Dodds et al. 2001) argue the data do not reject the 2/3 null. Maximal metabolic rate scales
  up to about 0.92 (summary at https://www.tbi.univie.ac.at/~pks/Preprints/pks_350.pdf).
- [I] In Nexus WBE is a **contested model**, not a law. Its useful core is narrower: a space-filling branching network
  with invariant terminals gives scaling relations whose exponents depend on stated assumptions. This makes it a good
  test case for the "every claim carries its status" rule (round 3, #14).

### 4. Bejan's constructal law: an audit

- [C] The statement (Bejan, 1996): "For a finite-size flow system to persist in time (to live), it must evolve in such
  a way that it provides easier access to the imposed currents that flow through it" (https://pmc.ncbi.nlm.nih.gov/articles/PMC2871904,
  Phil Trans R Soc B 365:1335, 2010). Bejan presents it as a self-standing law that covers "all the ad hoc (and
  contradictory) statements of optimality": minimum and maximum entropy generation, minimum and maximum flow
  resistance, and others.
- [C] **Contested**:
  - "Access" and "currents" are not defined as physical quantities. Kleidon wrote that it "is as yet unclear how the
    term 'access' ... can be quantified". The quote appears on the constructal advocates' own site
    (https://constructal.wordpress.com/constructal-law), which also says that "no criticism has been published in the
    peer reviewed literature against the constructal law as a law of physics". That claim is not neutral.
  - A HESS discussion referee (2006) found the author's own river cross-section examples did not match the predicted
    best configurations, and called that a falsification (https://hess.copernicus.org/preprints/3/S769/2006/hessd-3-S769-2006.pdf).
  - XueTao Cheng's *Critique of Constructal Theory* (Cambridge Scholars) argues that applications to streets, economics,
    heat transfer and flow were often wrongly applied, with details unchecked (https://www.cambridgescholars.com/product/978-1-5275-3839-9).
  - Skeptic asks whether it adds anything to natural selection (https://old.skeptic.com/tag/constructal-law/).
  - A 2018 defence by Errera argues the law meets falsifiability criteria. It appeared in conference proceedings
    edited within the constructal community (https://acad.ro/sectii2002/proceedings/doc2018-1s/continut/111-116.pdf).
- [M] **Evidenced**: the concrete engineering constructions hold up. These are point-to-area and point-to-volume
  conduction trees (high-conductivity inserts), tree-shaped cooling channels and multi-scale fin packing. Each one
  states an objective (peak temperature, pressure drop) and is solved, and in each one the result could equally come
  from topology optimisation.
- [I] Verdict for Nexus: **the constructions are reproducible design recipes, and the "law" is a contested
  interpretation.** A constructal tree enters Nexus as an optimiser run with a named objective and a stated constraint.
  It is never a law node, and no output is ever justified by "the constructal law predicts".

### 5. Growing trees and vessels: space colonisation and L-systems; growing to stress (Mattheck)

- [C] Runions, Lane and Prusinkiewicz, "Modeling trees with a space colonization algorithm", Eurographics Workshop on
  Natural Phenomena 2007, pp. 63–70 (https://algorithmicbotany.org/papers/colonization.egwnp2007.pdf). It extends
  their leaf-venation model (ACM TOG 24(3):702–711, 2005) to 3D:
  - attraction points sample the space to be served;
  - each point pulls the nearest tree node within a radius of influence;
  - a node grows a step toward the mean direction of its points;
  - points are removed once a node is within the kill distance d_k.
  The parameters (N points, d_k, step D) control density and smoothness: more points and a small d_k give dense
  branching, a large d_k gives smooth branches. Points can be added continuously.
- [I] Space colonisation is "grow where needed" in its plainest form. **The demand is a point set; growth stops when
  the demand is met.** The same algorithm grows veins, roots, ducts, cable trays and drainage. Its demand points can
  carry weights (flow) and sizes can be assigned afterwards by Murray.
- [M] L-systems (Lindenmayer, 1968) are parallel rewriting grammars, extended with parameters, context and
  environment queries (Prusinkiewicz and Lindenmayer, *The Algorithmic Beauty of Plants*, 1990). An L-system describes
  recursive structure and fits young or regular plants. Space colonisation fits mature, competition-limited forms. A
  Williams College course report says the same (https://www.cs.williams.edu/~morgan/cs371-f16/gallery/4-midterm/tree/report.md.html).
- [C] Mattheck's CAO (Computer Aided Optimisation, KIT Karlsruhe) copies how trees and bones grow. Material is added
  only where stress is high, until the surface stress is uniform (the "axiom of uniform stress"). Notch stresses fell
  in T-joints, and fatigue tests backed it. SKO (Soft Kill Option) is the bone-like sibling: it removes material where
  stress is low (https://trid.trb.org/View/437734; https://www.witpress.com/elibrary/wit-transactions-on-the-built-environment/54/3038).
  [C] A 2003 reinterpretation of notch stresses as bending stresses simplified CAO (KIT summary, same search).
- [I] CAO and SKO are the solid-mechanics twins of vascular adaptation. In both, a local field (stress, flow) drives
  local growth or loss toward a uniform state. One loop, "measure the field, grow or shrink locally, repeat until
  uniform or the budget is spent", covers bone, wood, veins, Physarum and topology optimisation.

### 6. Shape by local rules: Kilobots (1,024 robots)

- [C] Rubenstein, Cornejo and Nagpal, "Programmable self-assembly in a thousand-robot swarm", Science 345(6198):795–799
  (2014) (https://seas.harvard.edu/news/self-organizing-thousand-robot-swarm). There are 1,024 robots:
  - four seed robots mark the origin of a coordinate system, and every other robot receives the same 2D image;
  - the robots use three primitives: edge-following, a gradient (hop distance from the seeds) and localisation by
    trilateration from already-placed robots;
  - they move one at a time along the edge until they enter the shape and are blocked;
  - the authors prove that the local behaviours give the right global result, and nearby robots detect and repair
    traffic jams and drift.
- [C] Localisation reads distance from infrared brightness, with no bearing, so robots need the seeds to localise
  (IEEE Spectrum, https://spectrum.ieee.org/a-thousand-kilobots-self-assemble).
- [C] Limits (arXiv 1708.03341, "Problems with 'Programmable self-assembly...'", a critical note of uncertain weight):
  seeds are placed by hand, leftover robots are removed by hand, the robots are very slow, and some runs take 11+ hours.
- [C] Self-disassembly (subtractive) with 725 Kilobots: each robot decides whether it is in the shape and non-members
  leave by phototaxis. Subtractive assembly is **much more accurate**, additive assembly makes larger shapes for a
  given number of robots, and a U shape finished in about 90 min (https://users.eecs.northwestern.edu/~mrubenst/dars2016.pdf).
- [I] Two lessons for design. **A global shape needs a shared frame (the seeds) and a shared target (the image), and
  everything else can be local.** Carving away from a surplus is more accurate than accreting, the same lesson as SKO
  against CAO.

### 7. Agents that become structure: army-ant bridges, fire-ant rafts

- [C] Reid, Lutz, Powell, Kao, Couzin and Garnier, PNAS 112(49):15113–15118 (2015) (https://pmc.ncbi.nlm.nih.gov/articles/PMC4679032).
  Eciton hamatum ants build bridges from their bodies:
  - bridges start where the path bends, then lengthen, widen and migrate over time;
  - **they stop before the maximum shortcut**, because the benefit (distance saved, B = 2d·cos(θ/2)(1 − sin(θ/2)))
    is traded against the cost (workers held in the bridge, proportional to its area);
  - the colony-level trade-off emerges from local rules that depend on traffic.
  [M] An ant joins or stays in the bridge while it is walked on and leaves when traffic drops (Garnier et al.).
- [C] Graham et al., J Theor Biol (2017), "Optimal construction of army ant living bridges", models the same
  trade-off (https://www.thekaolab.com/papers/Graham_JTB_2017.pdf).
- [C] Mlot, Tovey and Hu, PNAS 108(19):7669–7673 (2011) (https://pmc.ncbi.nlm.nih.gov/articles/PMC3093451). Fire ants
  link bodies into a waterproof raft, and the water repellency is self-assembled, not a static material property:
  - balls of 1,000 to 8,000 ants spread into a pancake in minutes, and a raft forms in under 100 s (https://www.newswise.com/articles/how-fire-ants-build-waterproof-rafts);
  - the raft self-heals when an ant is removed;
  - construction relies on ants being trapped at the edge by their neighbours, which the authors call coercion rather
    than cooperation.
- [I] **Structure as a standing population.** Each member is both load path and worker, and the structure's size
  follows traffic and cost. In Nexus this means a structure can be a *steady state of a process*, not a fixed geometry.

### 8. Bacterial quorum sensing as a consensus protocol

- [C] In Vibrio fischeri, LuxI synthesises an acyl-homoserine lactone (3OC6-HSL) that diffuses in and out of cells.
  LuxR binds it and activates the lux operon (light), and luxI is itself induced, so the loop is positive feedback.
  The NSF-archived primer warns that **"a sufficient concentration of the cognate AHL ... is a trigger" is a
  misconception**: response also depends on other regulation and growth phase (https://par.nsf.gov/servlets/purl/10530821).
- [C] In swarm robotics, quorum sensing has mostly been used for collective decisions. Estimating the quorum level
  itself on minimal robots is newer (Oddi, Reina and Trianni, ANTS 2024). Density can be estimated from encounter
  rates (Musco et al. 2016, arXiv 1603.02981; title only, seen through search, https://arxiv.org/abs/1603.02981v1).
  A BYU thesis reports quorum sensing gives an adjustable threshold on the swarm's vulnerability to agent failures
  (https://scholarsarchive.byu.edu/etd/3776).
- [I] As a protocol, quorum sensing works like this:
  - every agent emits a signal at a rate;
  - the shared medium sums the signals and lets them decay or diffuse;
  - each agent compares the local level against a threshold, so commitment needs no message to anyone;
  - positive feedback (autoinduction) makes the switch sharp and hysteretic.

  Its failure modes are known from biology: cheaters (receiving without emitting), signal interference ("quorum
  quenching"), and diffusion limits that confuse density with confinement. Seeley's bee quorum (12) adds cross-inhibition
  between options. Quorum sensing is the cheaper single-option version: **commit once enough independent evidence has
  accumulated, with leakage, so stale evidence fades.**

### 9. Bioelectric morphogenesis and xenobots: demonstrated against claimed

- [C] **Demonstrated (planaria)**: Durant et al., Biophys J 112(10):2231–2243 (2017) (https://pmc.ncbi.nlm.nih.gov/articles/PMC5443973).
  A brief disruption of bioelectric networks (gap-junction communication) in amputated trunk fragments gives a stable
  ratio of two-headed regenerates. The change is a hidden alteration that persists through later rounds of amputation
  without any genome edit, which the authors call "pattern memory".
- [C] **Demonstrated (frogs, partially)**: Murugan et al., Sci Adv (Jan 2022). There were 115 adult Xenopus with
  amputated hindlimbs. A five-drug cocktail in a wearable dome for 24 h gave regrowth over about 18 months. The limbs
  were incomplete (no digits or webbing in some reports) but usable for swimming. The authors call it preliminary
  (https://www.aaas.org/news/frogs-regrow-amputated-limbs-after-new-multidrug-treatment; reports disagree on the dome material).
- [C] **Demonstrated (xenobots)**: Kriegman, Blackiston, Levin and Bongard, PNAS 117:1853–1859 (2020)
  (https://www.pnas.org/doi/10.1073/pnas.1910837117):
  - an evolutionary algorithm designs shapes of passive and contractile voxels in a physics simulator (code at
    github.com/skriegman/reconfigurable_organisms);
  - the shapes are built by hand from frog skin and heart cells and move as predicted;
  - behaviour of the built organisms is fed back to update the simulator's constraints.
  2021, PNAS, "Kinematic self-replication in reconfigurable organisms" (https://www.pnas.org/doi/10.1073/pnas.2112672118):
  C-shaped clusters push loose cells into piles that become new mobile clusters.
- [C] **Contested or claimed**:
  - Ars Technica's John Timmer: "self-replication" overstates it, since the offspring are not copies. The team
    "optimized a way of getting mobile clusters of cells to organize other cells into smaller clusters".
  - Developmental biologists note that excised frog tissue balls ("animal caps") have been studied for decades.
  - Blackiston asked a journalist to avoid cognitive terms such as "think", "goal" and "intelligence" (https://pioneerworks.org/broadcast/xenobots-2-claire-evans).
  - Levin's TAME framework (Front Syst Neurosci 2022) says cognition is a matter of degree in any substrate. The paper
    itself says its empirical claims stand apart from the philosophical "mind everywhere" claim (https://frontiersin.org/articles/10.3389/fnsys.2022.768201/pdf).
  I found no peer-reviewed rebuttal of the bioelectric data in this pass, which is not evidence that none exists.
- [I] What holds up for design is **anatomical homeostasis**: a stored target shape, sensed error, and local action
  that reduces the error after damage. That is a control loop, and it needs no claim about minds.

### 10. Morphogenetic engineering (Doursat)

- [C] Doursat, Sayama and Michel, "A review of morphogenetic engineering", Natural Computing 12(2):517–535 (2013)
  (https://dl.acm.org/doi/10.1007/S11047-013-9398-1; http://doursat.free.fr/research_morpheng_full.html). It sets out
  "self-architecturing" systems. Complex-systems science underrates programmability, and systems engineering
  underrates self-organisation. Doursat's EmbEng ("embryomorphic engineering") models self-patterning and
  self-assembly as in embryos.
- [M] In Doursat's model, cells divide and move under mechanical forces. Gradients set by boundary cells give
  positional information, and a gene-regulatory network reads the gradients to define identity regions. The rules are
  modular, so one gene module can be reused for a limb. Architecture comes from the genome; detail comes from
  self-organisation.
- [I] A Nexus board already resembles a genome: reusable modules (folded blocks), parameters and wiring. Morphogenetic
  engineering suggests that **where** a module applies can be set by a field (a gradient from anchors), not by
  coordinates.

### 11. 4D printing of hygromorphs (pine cones, wheat awns)

- [C] Elbaum, Zaltzman, Burgert and Fratzl, "The role of wheat awns in the seed dispersal unit", Science (11 May 2007),
  PMID 17495170 (https://pubmed.ncbi.nlm.nih.gov/17495170; https://www.mpg.de/551648/wild-wheat-shows-its-muscles):
  - the arrangement of cellulose fibrils makes the awns bend with humidity;
  - the daily cycle of wet and dry drives the seed across and into soil;
  - silica hairs act as a ratchet, so the seed can only move down.
- [C] Reyssat and Mahadevan, "Hygromorphs: from pine cones to biomimetic bilayers", J R Soc Interface 6(39):951–957
  (2009) (cited at https://link.springer.com/article/10.1007/s44223-025-00103-5). [M] Bilayer bending follows
  Timoshenko's bimetal formula, with the hygroexpansion mismatch in place of the thermal one.
- [C] Correa et al., "3D-printed wood: programming hygroscopic material transformations", 3D Printing and Additive
  Manufacturing 2(3):106–116 (2015), and Correa and Menges, MRS Proceedings 1800 (2015). Correa et al., "4D pine
  scale", Phil Trans R Soc A 378:20190445 (2020): multi-phase movement of the Bhutan pine scale
  (https://www.agathon.it/agathon/article/view/389). Most printed hygromorphs are thin bilayers printed flat that curve
  on moisture uptake (Springer 2025, URL above).
- [I] A hygromorph is an actuator with no power supply whose **program is its layering**: fibre orientation, layer
  thickness ratio and stiffness ratio. Its "energy source" is the environment's humidity cycle. It is the purest case
  of "the part carries its own behaviour". For Nexus this means a coupled moisture–mechanics port and a material that
  carries its hygroexpansion coefficients, sourced.

### 12. What runs through all of them [I]

Every method here has the same parts:

- **a demand field**: stress, flow, attraction points, a target image, a stored pattern, humidity;
- **a local rule** that responds to it;
- **a budget or cost**: volume, workers sequestered, metabolic cost;
- **an ensemble** the design must survive (damage, fluctuating load);
- **a stop condition**: uniform field, demand consumed, error below a threshold, a quorum.

The methods differ only in what is grown (material, vessels, agents, layers) and in whether growth also adds space
(Ronellenfitsch). That is general enough to be one family of Nexus nodes.

## (B) What Nexus should take

1. **`grow` node (a family, one contract)** [I]. Spec 09 physics core, spec 07 ideas.
   - Inputs: a domain, a demand field (any field port), a local rule (chosen from a library), a budget, an ensemble,
     a stop condition and a seed.
   - Outputs: the grown geometry or network, the history of each step (for the chronicle), and residuals (field
     uniformity, demand met, budget used).
   - Rule library to start: space colonisation, CAO, SKO, flow-adaptive conductance (Hu–Cai, Tero), and the
     damage-and-fluctuation objective (Katifori).
   - Folding: a folded `grow` must equal the unfolded one (synthesis #2).
2. **Demand as a first-class port** [I]. Spec 01 interfaces. A part already carries what it demands of neighbours (a
   bolt carries its hole). Extend this so a part can also emit a **demand field**: a pump demands supply points, a
   heat source demands conduction paths, a seat demands load paths. `grow` reads the field. This is "a part says what
   it needs" generalised from geometry to fields: the interface model's negative becomes a field the growth fills.
3. **Murray sizing node with validity envelope** [C law, I node]. Specs 09 and 10.
   - `size.murray(exponent)`: exponent 3 by default for laminar Poiseuille flow, 7/3 for turbulent flow, 2 for
     area-preserving or pulsatile flow.
   - Each exponent carries its assumptions and a Reynolds-number band, with a badge outside it.
   - Its source rows are Murray 1926, Sherman 1981, and the Wikipedia exponent note marked secondary.
   - It is applied after a topology is grown, never instead of solving the flow.
4. **Resilience as an ensemble objective, not an afterthought** [C Katifori, I node]. Specs 10 and 09.
   - Every network optimiser accepts a damage ensemble (cut each link) and a load ensemble (moving or random sinks).
   - It reports the worst and mean cost over the ensemble, which reuses spec 10's Monte Carlo mode.
   - `check.n-1` (cut any one link: does every sink still get flow above a threshold?) is a standard check on any
     grown network: pipes, wiring, roads, structure.
5. **Growth order is part of the design; record it** [C Ronellenfitsch, I rule]. Spec 11 living world.
   - Grown results depend on the sequence: domain growth, the order demand appears, and the seed.
   - The chronicle stores the growth history, and a seed plus inputs replays it exactly (synthesis #6).
   - Allow "grow with the domain" as an option, since the paper shows it escapes local traps.
6. **Claim-status labels, with WBE and constructal as reference cases** [C critiques]. Spec 10 trust.
   - WBE ¾: label *contested model*. Show the exponents its critics measured (2/3 to 3/4, finite-size 0.81, maximal
     metabolic rate about 0.92) beside it.
   - Constructal law: label *contested interpretation*. Allow the constructions only as optimiser runs with a stated
     objective. The AI may never cite "the constructal law" as the reason for a number.
   - Add both to the "cannot simulate / do not claim" register the AI reads.
7. **Carve before you accrete, where accuracy matters** [C Kilobot disassembly, CAO/SKO; I rule]. Spec 07 ideas.
   Subtractive growth (SKO; self-disassembly) is more accurate in both robots and structures. Additive growth reaches
   further for a given budget. `grow` offers both, and the AI states which it chose and why.
8. **Anchors and a shared target are all a local-rule system needs** [C Kilobots]. Spec 11 living world.
   Self-assembly of agents (robots, crowds, construction swarms) uses seeds (anchors) plus a shared target plus three
   primitives: gradient, edge-follow and localise. Nexus's scale anchors (synthesis #7) double as the seeds. The
   Kilobot limits (manual seeds, hours to run, leftovers removed by hand) go in the model card as known costs.
9. **Structures made of agents** [C Reid, Mlot; I node]. Spec 11 living world.
   - `structure.living`: a structure whose members are agents. Its size follows traffic, and its cost is the members
     taken away from other work.
   - The bridge's own benefit and cost formulas (Reid 2015) are the first sourced instance.
   - It covers scaffolds of robots, human chains and temporary bridges. Physics: members are joints with a holding
     force limit (spec 09). The holding force is not sourced in this pass.
10. **A quorum gate for checks and for the AI** [C Lux primer, swarm literature; I design]. Spec 00 structure, spec 10.
    - `gate.quorum`: each independent check (a reviewer, a solver, a source) adds signal with a weight.
    - The total decays with time or with change to the board, and the gate commits when the threshold is crossed.
    - Hysteresis (autoinduction) stops it flickering.
    - Rules taken from biology:
      - signals from the same family count once (cheater and echo resistance);
      - the threshold is shown, not hidden;
      - "enough signal" is not the only condition (the Lux primer's warning).
    - It is cheaper than the full Seeley panel (12) for single-option go/no-go decisions.
11. **Homeostatic repair to a stored target** [C Durant, Kriegman; I node]. Spec 11, spec 04 being in it.
    - `repair.toTarget`: a board stores its target shape or state.
    - After damage (a part removed or failed in simulation), local rules act to reduce the error to the target, and
      the residual is reported.
    - This is Levin's demonstrated core, anatomical homeostasis, taken without the cognitive claims.
    - The same node runs "what if this beam fails" drills on a built design.
12. **Design–build–measure loop with simulator update** [C Kriegman 2020 pipeline]. Spec 10 trust, spec 09.
    The xenobot pipeline (design in simulation, build, measure, feed the gap back into the simulator's constraints) is
    the right model for every Nexus prediction that meets reality. Each measured gap updates a validity envelope
    with a source row.
13. **Morphogenetic placement: modules placed by fields** [C Doursat review, M details; I rule]. Spec 01 interfaces.
    A folded module can bind to a region defined by gradients from anchors, not to fixed coordinates. Example: "a rib
    wherever distance from the hinge is under 40 mm and stress is above x". The placement stays correct when the host
    changes, the same "changes that follow" property spec 01 wants for imprints.
14. **Hygromorph bilayer node and coupled moisture–mechanics port** [C Reyssat, Elbaum, Correa; M Timoshenko].
    Spec 09, spec 01.
    - `actuator.bilayer(layers, fibre angle, thickness ratio, stiffness ratio, Δmoisture)` gives curvature by
      Timoshenko's formula with a validity note (thin, linear elastic, small strain).
    - Materials carry hygroexpansion coefficients (sourced or labelled unknown).
    - The ratchet (awn hairs) is an interface rule: one-way friction.
    - Export as a print plan with layer orientations.
15. **"Grow where needed" as an AI way of working** [I]. Spec 00. The in-app agent should not draw networks or
    reinforcement by hand. It declares the demand, the rule, the budget and the ensemble, runs `grow`, and reports the
    residuals. This fits "numbers before pictures" (synthesis #3) and "placement by mating" (README): the agent's job
    is stating demands, not placing every branch.
16. **Evaluation set for growth** [I]. Spec 00. Frozen problems with known answers:
    - a Murray tree where the exponent can be checked;
    - Tero's 36-city layout, with TL/MST about 1.75 as the target band;
    - a Katifori damage case where loops must appear;
    - a CAO fillet with its known notch-stress reduction;
    - a space-colonisation case with a fixed seed.
    Each one is the check of its task in `tasks.json`.

## (C) Questions

The 70 questions of this pass are chapter 18 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Topology optimisation (SIMP, level-set, BESO) compared head to head with CAO/SKO and constructal trees
- Wolff's law and bone remodelling models (Huiskes, Carter) as sourced adaptive-growth rules
- Root architecture models (OpenSimRoot, CRootBox) for growing under soil demand fields
- Plant phototropism and auxin canalisation (Sachs) as the biology under space colonisation
- Physarum solvers for Steiner and shortest-path problems, with their proofs (Bonifaci et al.)
- Ant colony optimisation with damage ensembles for robust routing
- River network self-organisation (optimal channel networks, Rodríguez-Iturbe and Rinaldo)
- Banavar–Maritan–Rinaldo network allometry as a cleaner alternative to WBE
- Maximum entropy production (Kleidon, Dewar) and its own contested status
- Modular self-reconfiguring robots (M-TRAN, ATRON, Roombots) as physical grow-where-needed
- Programmable matter and claytronics (Goldstein) and their scaling limits
- Turing reaction–diffusion patterns as placement fields for modules (Kondo's fish stripes)
- Gene-regulatory-network evolution for shape (Bongard's evo-devo robots, CPPN/HyperNEAT encodings)
- Neural cellular automata for regenerating images (Mordvintsev et al., Distill 2020) as a repair model
- Self-healing materials (microcapsules, vascular healing networks, White and Sottos) with vascular layouts from Murray
- Shape-memory polymer and liquid-crystal-elastomer 4D printing as powered counterparts to hygromorphs
- Hygromorphic building skins in service (HygroSkin, ICD Stuttgart pavilions) and their weathering data
- Spider silk and web repair as local-rule structural maintenance
- Biofilm architecture and channels as quorum-driven construction
- Termite mound ventilation (Turner; King, Ocko and Mahadevan) as grow-where-needed for airflow
- The 2017 critical note on Kilobot self-assembly: its authorship and standing

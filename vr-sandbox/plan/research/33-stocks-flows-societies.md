# Research (round 6): Stocks, flows and simulated societies
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here: effort-and-flow ports and the equation compiler (spec 09, research 06 and 19); determinism, replay,
the chronicle and the umpire (spec 11, research 25); the ODD card, seed and collector as agent hygiene and SIR /
Lotka–Volterra known answers (research 07, items 10, 11, 23); ensembles not single runs for social models (research 10,
item 7); the Beer Game board and EVE's sinks and faucets as an economy example (research 29, A9 and item 10); claim
status and evidence kinds (spec 10, research 23); quantity kinds (research 24). This pass adds what stocks and flows are
as a *notation and a check*, how social and economic simulations have been caught wrong, and what a world must say about
itself.

## (A) Findings

### A1. System dynamics: the notation and its standard

- [M] Jay Forrester, *Industrial Dynamics* (MIT Press, 1961), founded system dynamics: a firm or economy is levels
  (stocks) changed only by rates (flows), with information feedback and delays; the amplification of orders up a supply
  chain ("Forrester effect", later "bullwhip") came from the structure, not from outside shocks.
- [C] XMILE 1.0 is an OASIS Standard of 14 December 2015 (TC chaired by Karim Chichakly, isee systems, and Steven
  Adler, IBM). Its model is "systems of integral (or differential) equations": **stocks** (also called levels or
  states), **flows** (rates or derivatives) and everything else as **auxiliaries** (constants, initialisations, data,
  graphical functions); all three are "variables". It has macros, and a stock inside a macro MUST have its own instance
  per use that persists through the run (a SMOOTH1 used five times makes five stocks)
  (http://docs.oasis-open.org/xmile/xmile/v1.0/os/xmile-v1.0-os.pdf,
  http://docs.oasis-open.org/xmile/xmile/v1.0/os/xmile-v1.0-os.html).
- [C] In XMILE a flow runs both ways unless marked `non_negative`; Stella's default flow is the **uniflow** (one
  direction) with the **biflow** as the option (https://bptk.transentis.com/xmile/xmile_in_the_sd_dsl/model_structure.html,
  https://www.iseesystems.com/resources/help/v4/Content/08-Reference/01-ObjectsAndProperties/01-BuildingBlocks/Flows.htm).
- [M] Stella also offers **non-negative stocks**: when outflows would drain a stock below zero, they are cut back for
  that step. This keeps the books balanced, but it silently changes the model's equations; Vensim has no such default and
  lets a stock go negative unless the modeller writes a MIN/MAX. [I] Either way, what happens at an empty stock is a
  modelling decision that must be stated, not a solver detail.
- [M] The "cloud" at the end of a flow is a source or sink outside the boundary: material that appears from nowhere or
  leaves to nowhere. It is where conservation is deliberately suspended, drawn as a symbol so a reader sees it.
- [C] Vensim has a units check and **Reality Check**: *Constraints* (statements of what must follow from conditions,
  e.g. "if forest = 0 then animals = 0") and *Test Inputs* (the conditions, possibly extreme); a violated constraint is
  reported with the time it broke (https://www.bobm.net.au/teaching/SSS/VENPLE.PDF,
  https://web.mit.edu/12.000/www/m2006/teams/r9/vensim.html, https://www.vensim.com/documentation/21005.html).
- [C] Tooling for the browser exists: **SDEverywhere** (Climate Interactive) translates Vensim and Stella/XMILE models to
  C, JavaScript and WebAssembly, including subscripts and subscript mapping (https://github.com/climateinteractive/SDEverywhere,
  https://vensim.com/workbench). **PySD** (2014, J. P. Houghton) translates Vensim and, since 2017, XMILE to Python;
  restructured through an abstract syntax in 2022 (https://pysd.readthedocs.io/en/master/about.html). **Insight Maker**
  runs system dynamics and agent-based models together in the browser, with units, loop identification and folding of
  diagram portions (https://insightmaker.com/docs/features).
- [M] Integration in SD tools is Euler by default with a fixed DT; RK4 is offered. The standard practice test is to halve
  DT and see the behaviour does not change (Sterman, *Business Dynamics*, 2000). [I] It is the time-step analogue of
  research 19's determinism checks, and cheap to automate.

### A2. Meadows: leverage points, World3 and its re-checks

- [C] Meadows' "Leverage Points: Places to Intervene in a System" (1997) began as a nine-point list and grew to twelve;
  the later list runs from constants and parameters (least leverage), buffers, stock-and-flow structure, delays,
  balancing and reinforcing loops, information flows, rules, the power to self-organise, goals, the paradigm, up to the
  power to transcend paradigms (https://en.wikipedia.org/wiki/Twelve_leverage_points, https://www.heartoftheart.org?p=1568).
  [C] Two published orderings differ in numbering (the nine-point original puts material flows at 6, information at 5),
  so any use must name the version.
- [M] World3 (Meadows et al., *The Limits to Growth*, 1972) is a system dynamics world model of five sectors
  (population, capital, agriculture, non-renewable resources, pollution); revised for *Beyond the Limits* (1992) and
  World3-03 (2004).
- [C] Herrington (2021, *J. Industrial Ecology* 25(3):614–626, doi:10.1111/jiec.13084) compared empirical data for ten
  variables (population, birth and death rate, industrial output, food and services per capita, non-renewables,
  persistent pollution, human welfare, ecological footprint) against four World3-03 scenarios (BAU, BAU2, CT, SW); the
  data fit BAU2 and CT closest, and "the scenario with the smallest declines aligned least"; some empirical series were
  rescaled (e.g. by 1.106) to line up with the model at 2000 (https://ideas.repec.org/a/bla/inecol/v25y2021i3p614-626.html,
  https://mahb.stanford.edu/wp-content/uploads/2021/07/yale-publication-1.pdf).
- [C] Nebel, Kling, Willamowski and Schell (2024, *J. Industrial Ecology* 28(1):87–99) **recalibrated** 35 World3-03
  parameters against eight empirical datasets; the recalibrated run sits between BAU and BAU2 and still shows overshoot
  and collapse (https://arxiv.org/html/2510.07634, https://ideas.repec.org/a/bla/inecol/v25y2021i3p614-626.html).
- [I] The two re-checks are different acts: one *compares* a frozen model to data, the other *refits* the model to the
  data. A refit that still shows collapse says the structure drives it; a comparison says the old forecast held so far.
  Nexus must record which was done, because "the model agrees with data" means very different things in each.

### A3. Inventory theory and the Beer Game

- [M] EOQ (Harris 1913): Q* = √(2DK/h) for demand D, order cost K, holding cost h per unit-time. Newsvendor: order to
  the critical fractile F(Q*) = c_u / (c_u + c_o). (s,S): when inventory position falls to s, order up to S; Scarf (1960)
  proved it optimal for a fixed order cost with linear holding and shortage costs.
- [C] Sterman (1989, *Management Science* 35(3):321–339) fitted the Beer Game players' orders with an
  **anchoring-and-adjustment** rule: order = expected demand + α_s (desired stock − stock) + α_SL (desired supply line −
  supply line); players under-weight the supply line (orders in transit), which causes the oscillation and amplification
  (http://econspace.net/teaching/MGT-528/Sterman-MS-1989.pdf, https://web.mit.edu/jsterman/www/SDG/beer.pdf,
  https://cordis.europa.eu/docs/results/268/268272/final1-two-draft-papers.pdf).
- [I] An (s,S) or base-stock policy is the *rational* agent for the same board; the Beer Game with both policies side by
  side shows that the stock-and-flow structure plus a policy (not the people) gives the bullwhip.

### A4. Agent-based computational economics and its corrections

- [M] Epstein and Axtell, *Growing Artificial Societies: Social Science from the Bottom Up* (Brookings/MIT, 1996):
  Sugarscape, agents on a grid of regrowing sugar (later spice) with vision, metabolism, trade, combat and disease;
  skewed wealth distributions emerge.
- [C] Epstein's motto: "If you didn't grow it, you didn't explain it", "but not conversely": generative sufficiency is
  necessary, not sufficient, for explanation; several generators may produce the same pattern
  (http://www.cs.unibo.it/babaoglu/courses/cas/papers/Epstein%20-%202006%20-%20Generative%20Social%20Science%20Studies%20in%20Agent-Based%20Computational%20Modeling.pdf,
  https://www.jasss.org/26/2/9.html, the 2023 "inverse generative social science" paper that uses AI to search for
  multiple generators).
- [C] **Docking** (Axtell, Axelrod, Epstein and Cohen 1996): aligning two different models to see whether one can
  reproduce the other's results. Docking Sugarscape to Axelrod's culture model found a hidden difference: the culture
  model changed the *active* agent on cultural borrowing, Sugarscape changed its *neighbour*, which matters at the edges
  where agents have fewer neighbours; it was found two months in, while writing up
  (https://www-personal.umich.edu/~axe/research/Aligning_Sim.pdf). The paper defines levels of equivalence (numerical
  identity, distributional, relational) [M for the level names].
- [C] Santa Fe Artificial Stock Market (Arthur, Holland, LeBaron, Palmer, Tayler, 1996/97): agents with classifier
  rules evolved by a genetic algorithm; it reproduced excess kurtosis, little linear autocorrelation, persistent
  volatility and volume–volatility correlation (https://sites.santafe.edu/~wbarthur/Papers/Arthur-HollandStockMarket.pdf,
  https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/blake.sfisum.pdf).
- [C] Ehrentreich (2002 working paper; JEBO 61(4), 2006) found **a faulty mutation operator** biased the bit
  distribution upward, "suggesting increased levels of technical trading"; corrected, agents always find the correct
  non-bit-usage solution, partly supporting the rational-expectations hypothesis, though two regimes by learning speed
  remain (https://ideas.repec.org/p/wpa/wuwpco/0209001.html). [I] A celebrated finding of an ABM was partly an operator
  bug, found by someone reimplementing it: this is the strongest single argument for docking and invariant tests.

### A5. Schelling

- [C] Schelling (1971): two groups on a grid, agents move when the fraction of like neighbours (3×3 Moore neighbourhood)
  is below a threshold F; a critical F ≈ 1/3 separates random-like from segregated outcomes; the 2-D version uses empty
  cells as destinations (https://www.jasss.org/15/1/6.html, https://jasss.soc.surrey.ac.uk/18/4/15.html,
  https://en.wikipedia.org/wiki/Schelling%27s_model_of_segregation). [C] The threshold depends on neighbourhood size and
  movement rule (the JASSS 15/1/6 paper used a 5×5 neighbourhood to get 25 thresholds instead of 9).
- [I] It is a *mechanism demonstration*, not a model of any city: an honest label is "shows that mild preferences can
  suffice", never "explains segregation in X".

### A6. Epidemics and the reproducibility fight

- [C] CovidSim (Imperial, MRC Centre): Report 9 of 16 March 2020 used it. The code released on GitHub was, per John
  Carmack, "a single 15k line C file that had been worked on for a decade" before the GitHub team helped. Stephen Eglen's
  CODECHECK certificate 2020-010 (29 May 2020, doi:10.5281/zenodo.3865491) reproduced Report 9's key results; Nature
  editorialised in June 2020 that it met reproducibility requirements (https://en.wikipedia.org/wiki/CovidSim,
  https://www.imperial.ac.uk/news/197875/codecheck-confirms-reproducibility-covid-19-model-results).
- [C] The repository's own README: "The model is stochastic. Multiple runs with different seeds should be undertaken…
  The model code behaves deterministically if run with the same number of threads enabled and run with the same random
  number seeds", and "the Imperial College COVID-19 team only endorses outputs it has itself generated"
  (https://github.com/mrc-ide/covid-sim). [M] The public row was over a GitHub issue where runs with the same seed gave
  different results; the team's answer was the thread-count condition and that the model is stochastic anyway.
- [C] Jin et al. (2020, via PMC9252536) found ICL's model reproducible and IHME's not, for lack of method transparency
  despite open code (https://pmc.ncbi.nlm.nih.gov/articles/PMC9252536).
- [C] Covasim (IDM; Kerr et al., PLOS Comp Bio 17(7):e1009149, 2021): Python, open source, layered contact networks
  (households, schools, work, community) from SynthPops; now under starsimhub
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC8341708, https://github.com/institutefordiseasemodeling/covasim).
- [I] Lesson: the controversy was less "the code was wrong" than "nobody could tell which result was the claim": a
  stochastic model needs its ensemble, its seed and its thread count stated, and a third party able to rerun it.

### A7. Traffic

- [C] Nagel–Schreckenberg (1992, *J. Physique I* 2:2221): a cellular automaton for one-lane traffic (accelerate, brake
  to the gap, randomly slow with probability p, move) that reproduces jams out of nowhere; with v_max = 1 and p = 0 it is
  Wolfram's rule 184; velocity-dependent p gives metastable states and hysteresis
  (https://en.wikipedia.org/wiki/Nagel%E2%80%93Schreckenberg_model,
  https://web2.qatar.cmu.edu/~gdicaro/15382/additional/metastable-states-for-ca-traffic-models.pdf).
- [C] Eclipse SUMO (DLR, open since 2001, Eclipse project since 2017, EPL 2.0; stable 1.27.1 of 25 June 2026):
  microscopic, continuous, multi-modal, with TraCI remote control and emission tools
  (https://en.wikipedia.org/wiki/Simulation_of_Urban_MObility, https://sumo.dlr.de/docs/index.html).
- [M] The validation target for traffic models is the **fundamental diagram** (flow against density), measured on real
  roads; NaSch matches its shape, not a particular road's numbers without calibration.

### A8. Ecology

- [C] The Hudson's Bay Company lynx and hare series is **pelts traded**, not population (Hewitt; Elton and Nicholson
  1942); Lotka–Volterra fits to 1900–1920 are textbook (the Stan case study fits it with posterior checks), but other
  studies find the regression fit poor and a plant–hare interaction is an alternative hypothesis
  (https://mc-stan.org/learn-stan/case-studies/lotka-volterra-predator-prey.html,
  https://fionadubay.com/images/fulls/ecology_confpaper.pdf, https://jmahaffy.sdsu.edu/courses/f17/math636/beamer/lotvol-04.pdf).
  [I] It is the cleanest example of a proxy dataset that must carry the label "pelts, a proxy".
- [M] NetLogo (Wilensky 1999) ships a Models Library (Wolf Sheep Predation, Segregation, Virus, Traffic Basic,
  Sugarscape variants) with an "Info" tab per model; NetLogo Web runs many in a browser.

### A9. Game economies with published data

- [C] CCP's **Monthly Economic Report** continues in 2026 (e.g. March 2026: "Total ISK Faucets increased by 17%",
  "All indices continue to decline"; May 2026: faucets +26%), each with downloadable raw data
  (https://www.eveonline.com/news/view/monthly-economic-report-march-2026,
  https://www.eveonline.com/news/view/monthly-economic-report-may-2026); February 2026 reports velocity of ISK falling,
  the Mineral Price Index down about 52 % in a year (https://nosygamer.blogspot.com/2026/03/eve-onlines-monthly-economic-report-for.html).
  [I] ISK in circulation is a stock; faucets and sinks are its flows; the MER is a published stock-and-flow ledger of a
  real economy of people, the only one with monthly closure of a whole money supply.
- [C] The RuneScape and OSRS wikis run a **Real-time Prices** API (latest, mapping, 5-minute and 1-hour averages of high
  and low prices with volume, timeseries); v1 may be removed in favour of v2 (adds avgLowPrice, avgHighPrice, lookback);
  prices can exceed the signed 32-bit limit; the only ask is a descriptive User-Agent with contact
  (https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices, https://runescape.wiki/w/RuneScape:Real-time_Prices).
  [I] The 2³¹ note is a concrete reason Nexus quantities must not assume int32.

### A10. Describing and validating simulations

- [C] ODD (Overview, Design concepts, Details), second update: Grimm et al. 2020, JASSS 23(2) 7, doi:10.18564/jasss.4259.
  Element 1 is now "Purpose and patterns" (the patterns are the evaluation criteria); element 2 "Entities, state
  variables and scales"; it adds guidance for an ODD summary, pointers from ODD to code, model rationale, and
  **delta-ODD** for a changed version (valid only when the original ODD is available); only Design concepts are specific
  to ABMs, so ODD now describes matrix and difference-equation models too (https://www.jasss.org/23/2/7.html,
  https://bio.uib.no/te/papers/Grimm_2020_The_ODD_protocol_for_describing_agent-based.pdf, https://www.jasss.org/27/4/1.html).
- [C] Extensions: ODD+D (human decisions, Müller et al. 2013), ODD+2D (data use, Laatabi et al. 2018); **Visual ODD**
  (JASSS 27(4) 1, 2024), a pictorial standard (https://www.jasss.org/23/2/7.html, https://www.jasss.org/27/4/1.html).
- [C] TRACE (Grimm et al. 2014, Ecol. Modelling 280:129–139): "TRAnsparent and Comprehensive model Evaludation" (a
  merge of validation and evaluation, Augusiak et al. 2014), documenting the whole cycle: problem formulation, data,
  conceptual model, implementation verification, output verification, analysis, corroboration
  (https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/TRACE.ModFramework.GrimmEtAl2014.pdf) [M for the exact
  element list].
- [I] Across A4–A8, the failures were of four kinds: (1) a bug in an operator (SF-ASM); (2) an unstated update order
  (Sugarscape/ACM docking); (3) an unstated condition for determinism (CovidSim threads); (4) a proxy taken for the thing
  (pelts for hares). Each has a cheap mechanical check.

## (B) What Nexus should take

1. **Stock, flow, auxiliary and cloud as node kinds** (spec 09 core; spec 11). A `stock` node holds a quantity of one
   quantity kind (research 24) and has only flow inputs; a `flow` node is a rate whose unit is the stock's unit per time,
   checked; an `aux` node is anything else; a `cloud` node is an explicit source or sink, labelled "outside the boundary".
   The XMILE vocabulary, so a model imports and exports without renaming. *Data model.*
2. **The conservation check on every stock group** (spec 09, spec 10). For each quantity kind:
   Σ stocks(t) − Σ stocks(0) = ∫ (inflows from clouds) − ∫ (outflows to clouds), to a stated tolerance, every step.
   A flow that leaves one stock must enter another or a cloud; a flow with only one end that is not a cloud is an error.
   The residual is shown like a mate's residual (spec 01). *Rule, with a check.*
3. **An empty-stock policy stated per stock** (spec 09): `may go negative` (Vensim default), `clip outflows` (Stella
   non-negative, logged in the chronicle each time it acts, because it changes the equations) or `error`. Never silent.
   Flows declared `uniflow` or `biflow`. *Data model.*
4. **The DT-halving test as a standard check** (spec 10 trust; spec 11 LW2): every SD board can be rerun at DT/2 and
   with RK4; if behaviour class changes, the result is labelled "step-sensitive". *Check.*
5. **Reality-check nodes** (spec 10): a `constraint` node ("if forest = 0 then animals = 0") with `test input` nodes
   for extremes; violations reported with the time and the stock. These are the SD form of research 07's known-answer
   suites. *Node.*
6. **XMILE import and export, via SDEverywhere's approach** (spec 09; 07 ideas): read `.xmile`/`.stmx` and Vensim `.mdl`,
   compile to the same equation graph; macros make one stock per use (XMILE's rule). Export so a Nexus board opens in
   Stella or PySD: the external dock (B10). *Node family and a test: World3-03 imported runs its BAU to the published
   curves.*
7. **An ODD card on every simulated world, filled by the system where it can** (spec 11; spec 10). Required fields: purpose
   and patterns; entities, state variables and scales (generated from the board's node kinds and quantity kinds);
   process overview and **scheduling** (generated from the run order, including who updates whom: the Sugarscape lesson);
   design concepts (for agent boards); initialisation (seed, data sources); input data; submodels (links into the
   nodes). A fork carries a delta-ODD linked to its parent. The AI cannot publish a world whose card has empty required
   fields. *Data model and rule.*
8. **Honest labels for every simulated world** (spec 10 claim status): one of `mechanism demo` (Schelling, NaSch,
   Sugarscape), `illustrative`, `calibrated to <data>` (with the fit and the data range), `compared to <data>` (frozen
   model vs data, Herrington-style), `docked with <model>` (with the equivalence level), `forecast` (only with an
   ensemble and an out-of-sample check). The label sits on the world's title in VR as well as in the panel. *Rule.*
9. **Proxy labels on data series** (spec 10): a series loaded into a stock says what it measures and what it stands for
   ("hare pelts traded, a proxy for hare population"; "ISK faucet, CCP MER, reported"). *Data model.*
10. **Docking as a test kind** (spec 00 evaluation sets; spec 10): two implementations of one model (a Nexus board and a
    PySD or NetLogo reference, or two Nexus boards at different levels: SD and agent-based) run on the same inputs, compared
    at a stated equivalence level (numerical, distributional, relational). Seed docking pairs: SIR ODE vs agent SIR;
    NaSch v_max = 1, p = 0 vs rule 184; Beer Game SD vs agent version. *Check.*
11. **Invariant and metamorphic tests on stochastic operators** (spec 10): mutation, selection, random-move nodes carry
    tests of their own distribution (the SF-ASM bug was a mutation operator biased upward; a test of the bit frequency
    after many mutations would have caught it). *Rule: no stochastic operator without a distribution test.*
12. **Determinism includes the thread and worker count** (spec 11 LW2, LW9): the run record holds worker count and
    partitioning; replay with a different count must still hash equal, or the record says it does not (CovidSim's
    condition). *Check.*
13. **Ensemble by default, endorsement by rerun** (spec 10, spec 11): a stochastic world's headline is the ensemble
    band, never one run; anyone can rerun from the run record and see the same band ("codecheck" built in). *Way of working.*
14. **Leverage-point tags on board elements** (07 ideas; spec 11): each node of a world can be tagged with Meadows'
    level (parameter, buffer, structure, delay, loop, information flow, rule, goal…), so the AI, asked "what would change
    this", proposes structural levers, not only parameter sweeps; the version of the list is named. *Node annotation.*
15. **Policy nodes for inventory** (spec 12 cost; spec 11): `eoq`, `newsvendor`, `(s,S)`, `base-stock`, and
    `anchor-and-adjust` (Sterman's rule with α_s, α_SL as sourced defaults from the 1989 fits) as interchangeable agent
    policies on the same stock-and-flow supply chain. *Node family.*
16. **Traffic as the scale ladder** (spec 05 civil; spec 11): a `nasch` lane node (cells, v_max, p) for crowds of cars
    cheap enough for a city; SUMO network import (or TraCI) as the reference at the next level; both validated against a
    fundamental diagram labelled with its source road. *Node and check.*
17. **Game-economy datasets as validation fixtures** (spec 10; spec 12): EVE MER CSVs (money supply as a stock, faucets
    and sinks as flows; the closure of that ledger is a public conservation test with real data) and the OSRS wiki
    price API (live, with a descriptive User-Agent, 64-bit prices). *Data source with licence and label.*
18. **Quantities wider than int32 everywhere** (spec 09, research 24): the OSRS API warns of prices above 2³¹; Nexus
    stock values are float64 or bigint by quantity kind, never int32. *Rule.*
19. **A world's boundary drawn** (spec 11; VR): the clouds and every exogenous input shown as a ring around the world,
    so a viewer sees what the model does not explain. *View.*
20. **"Grown, not explained" caution in the AI's replies** (spec 10; agent): when an agent world reproduces a pattern,
    the AI says "this is one generator that suffices" and, where possible, runs a second (Epstein's "not conversely";
    iGSS). *Rule for the agent.*

## (C) Questions

The 64 questions of this pass are chapter 29 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Sterman's "bathtub dynamics" studies (Sweeney and Sterman 2000): people misjudge stocks from flows; a Nexus teaching view.
- Loop dominance analysis (eigenvalue elasticity, pathway participation metrics) for showing which loop drives a run.
- System dynamics model validation tests (Barlas 1996; Forrester and Senge 1980 "Tests for building confidence").
- The Vensim and Stella conveyor and queue semantics, and their exact XMILE definitions.
- Inverse generative social science (Vu, Epstein et al., JASSS 26(2) 9, 2023): AI search for multiple generators.
- Artificial Anasazi (Axtell et al. 2002) as a calibrated historical ABM and its later critiques.
- Pattern-oriented modelling (Grimm et al. 2005, Science) as the validation method behind ODD's "patterns".
- MASON's Sugarscape reimplementation (Bigbee, Cioffi-Revilla, Luke 2005) and what it found.
- Agent-based macroeconomics (Eurace, the Mark-0/Mark-I models, the CRISIS project) and stock-flow consistent (SFC) models in post-Keynesian economics (Godley and Lavoie): a balance-sheet conservation discipline for money.
- The SFC "transactions flow matrix" (every row and column sums to zero) as a ready-made conservation check for money.
- MATSim (agent-based transport, day-plans and replanning) beside SUMO.
- The Intelligent Driver Model and the kinematic-wave (LWR) model as continuous counterparts docked to NaSch.
- The GAMA platform and its GAML language (spatial ABM with GIS) as an alternative to NetLogo.
- Starsim (IDM's successor framework to Covasim) and its multi-disease design.
- The RAMP/SPI-M model consensus process in the UK (several models compared before advice): docking as policy practice.
- Second Life's and Ultima Online's economies (UO's early resource collapse) as cautionary game-economy cases.
- Path of Exile and World of Warcraft gold sinks; Valve's Steam Market data and Yanis Varoufakis's work at Valve.
- The CoMSES Net model library and its ODD-required code release (computational model library and peer review badge).
- Reproducibility badges (ACM artifact badges, CODECHECK certificates) as a pattern for a Nexus "rerun" badge.
- Ecopath with Ecosim: mass-balanced food webs, a conservation-checked ecology model in wide use.

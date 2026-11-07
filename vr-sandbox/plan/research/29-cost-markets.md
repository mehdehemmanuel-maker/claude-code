# Research (round 5): what things cost, and how markets and supply chains behave
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here: the evidence kinds and claim status (spec 10, `research/23-truth-at-scale.md`), effort-and-flow ports
(spec 09), determinism and the chronicle (spec 11). What the code holds today, checked: `src/nexus/madeof.ts` walks any
part or assembly once through `flatten` and returns mass, centre of mass, inertia and the mass **by material**; a
`Prop` in `src/nexus/matter.ts` already carries `value, unit, source, evidence`. There is no cost, price or carbon field
anywhere in `src/nexus` (grep for cost, price, carbon, co2 finds only unrelated hits). The mass-by-material walk is
exactly the hook embodied carbon needs; cost needs more than a walk (see B1). Network note: `WebFetch` could not reach
`ansys.com` or `pmc.ncbi.nlm.nih.gov` in this session; the same pages were read through Tavily instead.

## (A) Findings

### A1. Should-cost from first principles: Ashby's process cost model

- [C] Ashby's generic cost per part, as taught in the Ansys Granta EduPack lecture (2025 R1) built on his textbook:
  inputs are material price C_m ($/kg), part mass m, fraction lost f (scrap), tooling cost C_t ($), capital cost of
  equipment C_c ($), overhead rate including labour C_oh ($/h), batch size n, production rate ṅ, capital write-off time
  t_wo, load factor L, discount rate d; energy and R&D/royalties are "lumped into the overhead rate". The text of the
  equation comes out garbled from the PDF, but its terms are labelled "materials, tools, capital, overhead"
  (https://ansys.com/content/dam/web/academic/education-resources/2025r1/manufacturing-processes-cost-models-lecture-pptprcen25.pdf,
  read via Tavily extract).
- [M] The published form (Ashby, *Materials Selection in Mechanical Design*, cost chapter):
  C = m·C_m/(1−f) + C_t/n + (1/ṅ)·(C_c/(L·t_wo) + C_oh). [I] The garbled extract is consistent with this, term for term.
- [C] The lecture's worked default: C_m = 8 USD/kg, m = 1 kg, n = 1000, C_oh = 150 USD/h, d = 5 %, t_wo = 5 years,
  L = 0.5, giving a "relative cost index (per unit) 15.8–47.3 USD" (same source). Note the output is a **range**, because
  each process's C_t, C_c and ṅ are stored as ranges.
- [C] The model's lesson: at small batches the fixed terms (tooling, capital) dominate, at large batches material and
  overhead do; die casting against sand casting for a con-rod is the textbook picture of the crossing
  (same source; also https://www.globalspec.com/reference/45176/203279/18-7-estimating-cost-for-shaping-processes).
  The Scribd copy of a lecture adds that the model assumes equipment is **shared** (not dedicated), which is what the
  load factor stands for (https://www.scribd.com/document/649167127/cost-slides).
- [I] So a part's cost is not a number; it is a function of how many are made, where, and by which process. A scalar
  "cost" on a bolt is only true at one quantity break.

### A2. Design for assembly, and commercial should-cost tools

- [C] Boothroyd–Dewhurst DFA: each part is tested by three questions (does it move relative to parts already assembled;
  must it be a different material; must it be separate for assembly or disassembly). A part that answers no to all three
  is a candidate to merge. Manual assembly efficiency E_m = 3·N_m/T_m, N_m the theoretical minimum part count, T_m the
  total assembly time; the "3" is the rounded ideal time of about 2.93 s per part, so the index is for comparing
  designs, not an absolute (secondary sources: https://www.wevolver.com/article/dfma-design-for-manufacturing-and-assembly-explained,
  https://www.scribd.com/doc/4354891/Lecture-5-DFA-Boothro, https://cecas.clemson.edu/cedar/wp-content/uploads/2017/03/DETC2011-47530.pdf).
  IBM's ProPrinter against the Epson MX80 is the classic case (the MX80 had 111 parts above the theoretical minimum, the
  ProPrinter 3), as repeated by iConnect007 (https://iconnect007.com/article/98483/happys-essential-skills-design-for-manufacturing-and-assembly-part-1/98486/pcb).
- [C] Boothroyd Dewhurst's own site, by its page banners only: "DFMA 2025B ... Global Costing Data (200,000+ data points
  across 22 countries)" and "DFMA 2026A: cost the same part across 37 manufacturing regions"
  (https://www.dfma.com/resources/manufacturing-cost-guide.asp, https://www.dfma.com/software/dfa.asp). [I] Region is a
  first-class input in commercial should-cost: the same part has as many costs as places to make it.
- [C] aPriori, from vendor and listing pages: "digital factories" combine cost models with about 90 Regional Data
  Libraries; "Geometric Cost Drivers" pulls process-specific features from 3D CAD; a routing engine chooses the process
  route within a factory; "over 300 automated cost models"; Carrier runs "80+ digital factories". One reviewer reports
  discrepancies between estimated and actual cost (https://platform.softwareone.com/product/ap-pro/PCP-6270-7298,
  https://softwareconnect.com/reviews/apriori-software/). Vendor claims, not independently checked.
- [I] aPriori's architecture is the same shape as Nexus's: geometry → features → process route → cost, per place. The
  difference Nexus can make is that every rate (machine hour, labour, scrap) is a sourced, dated `Prop`, not a closed
  library.

### A3. Activity-based costing and its time-driven form

- [C] ABC was developed by Robert Kaplan and Robin Cooper in the 1980s; Kaplan and Steven Anderson's time-driven ABC
  (HBR, November 2004, 131–138; working paper November 2003) needs only two parameters per activity: the unit cost of
  supplying capacity, and the time a transaction or activity takes; a worked example: $560,000 ÷ 700,000 minutes =
  $0.80 per minute (https://hbswk.hbs.edu/item/adding-time-to-activity-based-costing,
  https://maaw.info/ArticleSummaries/ArtSumKaplanAnderson2004.htm). Kaplan wrote that classic ABC was hard to adopt at
  scale because of its interview-based upkeep (https://hbswk.hbs.edu/item/rethinking-activity-based-costing).
- [I] TDABC is the natural form for Nexus because Nexus already knows times: DFA handling and insertion seconds, a
  process's ṅ, a physics run's duration. Cost = Σ (time per activity × rate per minute of the resource). Overhead
  becomes a resource with a capacity, not a percentage smeared on.

### A4. Learning curves: Wright, Moore, Swanson, and forgetting

- [C] T. P. Wright, "Factors Affecting the Costs of Airplanes", 1936: unit labour falls by a fixed fraction each time
  cumulative output doubles. The fraction is quoted as 20 % by most secondary sources and 10–15 % by others; the
  disagreement is in the secondary literature itself (https://en.wikipedia.org/wiki/Experience_curve_effect,
  https://www.globalsecurity.org/military/intro/reference/calc/learn.htm). Bruce Henderson (BCG) generalised it to total
  cost as the "experience curve" in the 1960s (http://www.strategosinc.com/downloads/learning-curves-dl1.pdf).
- [C] Nagy, Farmer, Bui & Trancik, "Statistical Basis for Predicting Technological Progress", *PLoS ONE* 8(2): e52669,
  2013 (arXiv:1207.1463): six laws tested by hindcasting on a database of 62 technologies; Wright's law forecasts best,
  generalised Moore's law close behind; the two coincide when production grows exponentially (Sahal's point); forecast
  error grows with horizon at a typical rate (https://arxiv.org/abs/1207.1463,
  https://web.mit.edu/mitssrc/nsf/papers/Nagy_Farmer_Bui_Trancik_2013.pdf, as summarised in search results; the full
  text was not opened).
- [C] Swanson's law: PV module price falls about 20 % per doubling of cumulative shipments; a fit to Swanson's data gives
  exponent ≈ 0.322 (2^−0.322 ≈ 0.80). Later series disagree sharply (one study gives 39 % for 2011–2019; others steeper)
  (https://ourworldindata.org/learning-curve, https://www.wikiwand.com/en/articles/Swanson's_law). [I] A learning rate is
  a fitted parameter of a window of data, not a constant of nature; it needs its window and its price series named.
- [C] Way, Ives, Mealy & Farmer, "Empirically grounded technology forecasts and the energy transition", *Joule* 6,
  2022, DOI 10.1016/j.joule.2022.08.009: probabilistic cost forecasts for solar, wind, batteries and electrolysers,
  validated by backtesting on more than 50 technologies; most energy-economy models had underestimated deployment and
  overestimated costs (https://ui.adsabs.harvard.edu/abs/2022Joule...6.2057W,
  https://www.oxfordmartin.ox.ac.uk/publications/empirically-grounded-technology-forecasts-and-the-energy-transition-2).
- [C] Learning is not permanent: Argote, Beckman & Epple introduced "organizational forgetting"; Lockheed's L-1011
  TriStar, with wide swings in output rate, showed costs rising when the rate fell; production breaks cost more than
  traditional curves predict (https://pmc.ncbi.nlm.nih.gov/articles/PMC5619757 via search result,
  https://dair.nps.edu/bitstream/123456789/4291/1/AFIT-AM-20-161.pdf).

### A5. Open (and not so open) price sources

- [C] **McMaster-Carr Product Information API**: approved customers only; a client certificate and password per
  customer; log in for a bearer token that expires after 24 h; you must *subscribe* to a part (PUT /v1/products) before
  reading it; GET /v1/products/{part}/price returns e.g. `[{"Amount": 3.46, "MinimumQuantity": 1, "UnitOfMeasure":
  "Each"}]` (https://www.mcmaster.com/help/api). [I] Even the best catalogue price is a list of quantity breaks, not a
  number; and an approved-customer API is not a public source Nexus can quote for everyone.
- [C] **Nexar (Octopart's API)**: GraphQL; each `sup` query counts the part objects returned against a part limit. The
  FAQ says, in two answers on one page, both that a new sign-up gets "one Evaluation app with a lifetime part limit of
  1000" and that "usage resets automatically on the 1st day of each month". It also says Octopart.com now shows data from
  an additional source **not** available through the API, so site and API may differ
  (https://support.nexar.com/support/solutions/articles/101000497890-frequently-asked-questions, modified 7 Aug).
  A reseller page claims the Pro tier omits lead time and lifecycle fields (https://www.ki-syndikat.de/tools/octopart/,
  unverified).
- [C] **LME**: a limited free set of data on a next-day delayed basis; distributing real-time or 30-minute delayed data
  costs a $25,000 annual licence; next-day distribution a one-off $4,000; the LME began charging for formerly free
  end-of-day data in 2025 (https://www.lme.com/en-GB/Market-Data/Market-data-licensing/Data-distribution,
  https://www.lme.com/about/faqs/market-data-faqs, as summarised in search; fee schedules dated up to 27 October 2026 at
  https://www.lme.com/-/media/files/trading/access-the-market/fees-and-charges/lme-group-fees-and-charges-27-october-2026.pdf,
  not opened). [I] Nexus cannot republish LME prices; it can link to them, or use a public-domain proxy.
- [C] **USGS Mineral Commodity Summaries 2026**: published 6 February 2026 (versions 1.0 to 1.3, February to May 2026),
  DOI 10.3133/mcs2026; each commodity chapter has 5-year salient statistics (including prices), tariffs, world
  production, reserves and resources; the data release (DOI 10.5066/P1WKQ63T) is CSV tables with metadata, marked
  **CC0 1.0** (https://pubs.usgs.gov/publication/mcs2026,
  https://www.usgs.gov/data/mineral-commodity-summaries-2026-data-release). The US was 100 % net import reliant for 13
  critical minerals in 2025, and 50–99 % for 20 more; China the primary import source for 8 of those 33
  (https://pubs.usgs.gov/periodicals/mcs2026/mcs2026.pdf). [I] This is the one metals source that is open, annual,
  sourced and redistributable: the default price and supply-risk layer for raw materials.

### A6. Carbon and life-cycle assessment

- [C] ISO 14040/44: four phases (goal and scope, inventory, impact assessment, interpretation). The functional unit is
  "quantified performance of a product system for use as a reference unit". Leaving out a stage or flow is allowed only
  if it does not significantly change the conclusions, and must be justified; the standards set **no fixed numeric
  cut-off**; a flow tiny by mass can be large by impact. Allocation hierarchy: avoid it (subdivide, or expand the
  system), else partition by physical relationship (mass, energy), economic value last
  (https://greencalculus.com/standards/iso-14040-14044-lca/,
  https://faculty.cnr.ncsu.edu/richardvenditti/wp-content/uploads/sites/24/2018/08/2016Lecture5Goalandscope.pdf;
  secondary, the standard text not read).
- [C] ecoinvent v3 ships several **system models** of the same data: "Allocation, cut-off by classification",
  "Allocation at the point of substitution" (APOS), "Consequential", and (since about 2024) "cut-off EN15804". Cut-off
  and APOS differ only in waste and recycling; consequential results differ notably; ecoinvent suggests cut-off as base
  and the others for sensitivity (https://support.ecoinvent.org/system-models,
  https://link.springer.com/article/10.1007/s11367-016-1109-6). [I] A carbon number without its system model is as
  ambiguous as a mass without its unit.
- [C] openLCA is open-source LCA software by GreenDelta; ecoinvent through openLCA Nexus starts at a basic yearly
  licence of €300 per user per industrial sector (https://www.openlca.org/?p=83775). ecoinvent itself is licensed, not
  redistributable [M].
- [C] **ICE (Inventory of Carbon & Energy)**, Circular Ecology (begun at the University of Bath): free with registration
  (registration lasts 12 months); v4.0 launched 28 November 2024; v4.1 changed only GGBS (now economically allocated a
  share of steelmaking, in line with EN 15804) and bitumen, plus asphalt mixing energy; the oldest v2.0 (January 2011)
  data points are being removed (https://circularecology.com/?p=7059, https://circularecology.com/?p=5706).
  Units are kgCO2e per kg of material, cradle to gate. Steel section 1.55, rebar 1.99 kgCO2e/kg are ICE v3 figures
  (https://www.buildingsandcities.org/insights/commentaries/lca-databases.html); a calculator site gives v4.1 steel
  section ~1.55, primary aluminium ~13.1, softwood ~0.31 (https://tradecalculator.co.uk/sustainability/embodied-carbon-calculator,
  secondary, not checked against ICE itself).
- [C] The spread by origin is large: IStructE gives UK-made rebar at 0.684 kgCO2e/kg A1–A3 against a UAE bar with no
  recycled content near 2.1 (a factor of three), and biogenic carbon in timber (−1.64 kgCO2e/kg) reported **separately**
  for A1–A5 (https://www.istructe.org/IStructE/media/Public/TSE-Archive/2020/A-brief-guide-to-calculating-embodied-carbon.pdf).
- [C] GWP100 from IPCC AR6, per the GHG Protocol table of 7 August 2024: CO2 1, CH4 fossil 29.8, CH4 non-fossil 27.0,
  N2O 273, NF3 17,400 (AR5: 28/30, 265) (https://ghgprotocol.org/sites/default/files/2024-08/Global-Warming-Potential-Values%20%28August%202024%29.pdf).
  The GHG Management Institute argues 27.0 should not be used and recommends 27.9 for combustion and non-fossil methane
  (https://ghginstitute.org/2024/10/17/which-methane-gwp-value-do-i-use). [I] Even the conversion factor to CO2e is a
  versioned, contested constant: CO2e needs its GWP set named, like CODATA.
- [C] **PACT** (WBCSD): Methodology v3 for cradle-to-gate product carbon footprints released 30 April 2025 (page dated
  2 June 2026); v2 footprints stay valid for three years from calculation; recalculation required on a >10 % process
  change (https://www.wbcsd.org/resources/pact-methodology-version-3). The data exchange spec (v2.3.3) has
  `primaryDataShare`, mandatory for reference periods from 2025 (https://wbcsd.github.io/data-exchange-protocol/v2).
  [I] PACT is the existing open schema for "a part's carbon, with its period, its share of primary data and its
  assurance": the closest thing to a ready-made data model.
- [C] EU Battery Regulation 2023/1542: from 18 February 2027 EV, LMT and >2 kWh industrial batteries need a digital
  battery passport (QR code, ~90 Annex XIII attributes); one law-firm summary says Commission guidance of August 2026
  marks the carbon footprint fields as not yet filled in February 2027 because the format rules are pending
  (https://www.bdemerson.com/article/eu-battery-passport, https://tracextech.com/battery-dpp-compliance-requirements;
  secondary).

### A7. Supply-chain dynamics

- [C] Lee, Padmanabhan & Whang, "Information Distortion in a Supply Chain: The Bullwhip Effect", *Management Science*
  43(4):546–558, 1997: four causes, demand signal processing (forecast updating), the rationing game (shortage gaming),
  order batching, and price variations; the effect follows from **rational** behaviour inside the chain's structure, so
  the fix is structural (shared demand data, allocation by past usage rather than present orders)
  (https://econpapers.repec.org/RePEc:inm:ormnsc:v:43:y:1997:i:4:p:546-558,
  https://courses.ischool.berkeley.edu/i290-4/s03/readings/bullwhip.htm).
- [C] Sterman, "Modeling Managerial Behavior: Misperceptions of Feedback in a Dynamic Decision Making Experiment",
  *Management Science* 35(3):321–339, 1989: an anchoring-and-adjustment rule explains players' orders; players
  under-weight the supply line (what is already ordered) and blame outside events for oscillations they cause
  (https://econpapers.repec.org/RePEc:inm:ormnsc:v:35:y:1989:i:3:p:321-339). Sterman's teaching note: optimal cost
  about $200, average cost ten times greater; orders and stocks oscillate with a period of about 20 weeks, amplify
  upstream, and lag in phase (https://web.mit.edu/jsterman/www/SDG/beer.pdf). Backlog costs $1.00 and stock $0.50 per
  case-week (https://cordis.europa.eu/docs/results/268/268272/final1-two-draft-papers.pdf); an exact mathematical model
  reproduces Sterman's benchmark costs (https://www.jasss.org/17/4/2.html).
- [C] Single points of failure, two cases. Renesas Naka, 19 March 2021: a fire from plating equipment on the 300 mm
  line; about two-thirds of that building's output went to cars; Renesas held roughly 30 % of the automotive MCU
  market; damaged machines revised from 11 to 23; foundries could absorb only part of it because spare capacity was
  scarce (https://www.trendforce.com/presscenter/news/20210323-10726.html,
  https://propakistani.pk/2021/03/29/japanese-chip-factory-fire-to-massively-worsen-global-chip-shortage/amp/).
  Merck's Onahama plant, March 2011: the only factory in the world making the Xirallic effect pigment; Ford, Chrysler,
  Toyota and GM restricted colours (not output) for about two months
  (https://www.gulf-times.com/story/56533/carmakers-face-xirallic-paint-shortage-after-japanese-quake,
  https://www.autoblog.com/2011/05/10/quake-damaged-paint-plant-comes-back-online-in-japan/).
- [I] Both failures sat **below** the level a bill of materials shows: the carmaker's BOM listed a paint and an ECU,
  not the pigment plant or the fab line. A rollup of supply risk has to walk the same tree as mass, but further down,
  and its combination rule is not a sum (one sole source anywhere makes the whole sole-sourced).

### A8. Mechanism design and auctions

- [C] Vickrey (1961): in a sealed second-price auction the highest bidder wins and pays the second bid; truthful bidding
  is a dominant strategy; Vickrey won the 1996 Nobel; Milgrom and Wilson the 2020 prize "for improvements to auction
  theory and invention of new auction formats", including the simultaneous multiple-round auction the FCC adopted in
  1994, with an activity rule against late sniping (https://knowledge.essec.edu/en/economy-finance/how-2020s-nobel-prize-economics-applies-real-world.html,
  https://cepr.org/voxeu/columns/paul-milgrom-price-discoverer-and-nobel-laureate). The first auction's revenue is
  reported inconsistently ($617 million for ten licences vs. "over seven billion"); probably different auctions.
- [C] Ausubel & Milgrom, "The Lovely but Lonely Vickrey Auction" (2006): VCG's weaknesses are low or zero revenue,
  revenue that can fall when bidders are added, collusion by losing bidders, and profit from bidding under several
  identities (shills); these vanish only when goods are substitutes, i.e. exactly not in the complementary-goods case
  package bidding was meant for (https://milgrom.people.stanford.edu/wp-content/uploads/2005/12/Lovely-but-Lonely-Vickrey-Auction-072404a.pdf).
- [I] For Nexus the relevant lesson is not selling spectrum; it is **truthful reporting when reports are rewarded**. Any
  scheme that pays contributors (reputation, credits) for prices or carbon factors invites shill identities and loser
  collusion; the Vickrey literature says which designs resist them.

### A9. How games model economies

- [C] EVE Online: CCP hired the economist Eyjólfur Guðmundsson in 2007, described as the first in the industry; the
  Quarterly Economic Newsletter began in late 2007 (https://games.slashdot.org/story/07/09/13/156240/a-chat-with-eves-economist,
  https://www.tentonhammer.com/news/first-quarterly-economic-newsletter-published-for-eve-online). Today CCP publishes a
  **Monthly Economic Report** with downloadable CSV data: ISK faucets (bounties, mission rewards, incursions, insurance)
  and sinks (broker fees, transaction tax, skill purchases, manufacturing), production, mining and destruction value,
  regional trade (https://www.adam4eve.eu/mer_sinks_faucets.php?avg=7,
  https://forums.eveonline.com/t/monthly-economic-report-march-2026/509891). The MER format was revamped from
  September 2025 (https://nosygamer.blogspot.com/2025/09/changes-are-coming-to-eve-onlines.html).
- [C] Factorio's arithmetic: output per second = recipe output × crafting speed ÷ recipe time; machines = target ÷ that,
  rounded up; assembler speeds 0.5 / 0.75 / 1.25; a yellow belt carries 15 items/s (7.5 per lane), red 30, blue 45
  (https://factorio-wiki.pages.dev/en/production/ratio-calculation, https://wiki.factorio.com/Yellow_belt).
- [I] Two different lessons: EVE shows a world economy that is *measured* and published like a central bank's (money
  in, money out, by mechanism); Factorio shows that a production chain is a linear system of rates whose bottleneck is
  computed, not guessed. Both are the "living world" (spec 11) side of cost.

## (B) What Nexus should take

1. **Data model: `Money` and `CO2e` as quantities, not numbers** (spec 10, spec 01 keys). Each carries value, unit
   (currency ISO 4217 / kgCO2e), **date** (as-of), **region**, **basis** (quantity break, or "per kg"), **scope**
   (cradle-to-gate A1–A3, or to site, or life cycle), **method** (for carbon: ecoinvent system model or ICE version, GWP
   set AR5/AR6), source and evidence kind. Two values with different currency, year, scope or GWP set cannot be added;
   conversion only in a visible node (the unit-key rule of synthesis #12, extended to money and carbon).
2. **Embodied carbon rolls up exactly like mass** (owner `madeof.ts`). `madeof` already gives mass by material; carbon
   = Σ mass_material × factor_material (kgCO2e/kg). A new `Prop` key per material (`co2e.a1a3`) with source and version
   (ICE v4.1, dated). Nothing counted twice because the same `flatten` walk is used. Biogenic carbon kept as a separate
   line, never netted (A6, IStructE / EN 15804).
3. **Cost does not roll up like mass; it rolls up as a function** (rule). A part's cost is C(n, region, process): Ashby's
   four terms for made parts, a quantity-break table for bought parts, plus assembly cost = DFA time × rate (TDABC).
   The rollup node evaluates at a stated quantity and place, and says so on the result: "£4.12 each at 1,000, UK, 2026".
4. **A `cost.process` node implementing Ashby's model** (spec 09 style law node with a validity envelope): inputs m,
   C_m, f, C_t, C_c, C_oh, ṅ, L, t_wo, n; output cost per part as an interval (process data are ranges, A1); a
   crossover chart over n for two or more processes. Validity: shared equipment, steady production.
5. **A `dfa.check` node**: the three Boothroyd–Dewhurst questions asked of every part in an assembly from what Nexus
   already knows (does it move: joints from `mate.ts`; different material: `mat`; separate for service: an interface
   flag). Output N_m, a list of merge candidates, and E_m = 2.93·N_m/T_m with T_m from handling and insertion times.
   This is the interface model (spec 01) used for economy: a fastener whose only job is to join two parts of the same
   material that never move apart is a merge candidate.
6. **Learning curves as a node with its window named** (spec 10): `cost.learning` takes a first-unit cost, a learning
   rate *with its fitted window and series*, and cumulative output; it returns a distribution, not a line (Way et al.
   2022), and supports forgetting after a production break (Argote, L-1011). Never a constant "20 %".
7. **Price sources ranked by what may be republished** (spec 10 provenance): USGS MCS CSV (CC0) as the default raw
   material layer; ICE as the default carbon layer (free, but check its licence for redistribution); McMaster, Nexar and
   LME only as *links* or per-user fetches with the user's own key, never stored into the shared library. Every price
   shows its age; past a staleness horizon per kind (metals: weeks; fasteners: a year) it gets a badge.
8. **Inflation and exchange as visible nodes** (rule): `money.deflate` (CPI or PPI series, dated) and `money.fx` (a
   dated rate). A 2019 price shown in 2026 money says which index it went through.
9. **Supply risk as a rollup with its own algebra** (spec 01 interface metadata; spec 11): each sourced part or
   material carries sources (count, country), lead time, lifecycle state. Rollup rules: lead time = critical path
   (max along the tree, not sum); sole source = OR over the tree; concentration = HHI or USGS net import reliance for
   raw materials. A "single points of failure" view that walks below the BOM to the material (A7: Xirallic, Naka).
10. **A Beer Game board as a living-world demo** (spec 11, determinism): four echelons, delays, Sterman's
    anchoring-and-adjustment rule as the default agent, seedable; the chronicle records the oscillation. It is a test
    of the delay and feedback machinery of spec 09/11, and a teaching piece for "the dynamics come from the structure".
11. **A Factorio-style rate solver** (spec 09 core, 07 ideas): any production graph (recipes as nodes, rates on wires)
    solved as a linear system for machines needed and the bottleneck; belts and pipes as capacities; the same solver
    serves a factory, a kitchen, a city's water.
12. **An economy report for the living world, EVE-style** (spec 11): any simulated world with money publishes faucets
    and sinks by mechanism, per period, as CSV; a world whose money supply drifts says so.
13. **Mechanism design for contributions** (spec 10, research 23): if contributors are ever rewarded for prices or
    factors, use designs that resist shill identities and loser collusion; prefer proper scoring rules tied to later
    verification (a contributed price scored when a receipt or catalogue confirms it) over volume-based rewards.
14. **Adopt PACT's footprint fields rather than inventing them** (spec 10): period, primaryDataShare, data quality,
    assurance, cross-sectoral standards used; export a part's carbon as a PACT-shaped record. Battery parts carry the
    Annex XIII fields as an interface, ready for the 2027 passport.
15. **The AI never invents a price** (constitution rule, research 23's accumulate rule): an AI-estimated cost is an
    `estimated` value with its method (Ashby with which rates), kept beside sourced ones, flagged through every
    derivation, and never written into the shared library as a price.
16. **Cost and carbon as design targets** (spec 01 solvers): a mate that chooses a fastener can minimise cost or
    carbon among those that pass the strength check; the result says what it traded.
17. **Way of working**: every cost result states its quantity, place, date and currency in its label; every carbon
    result its scope, method and GWP set. A number missing any of these renders as incomplete, like a mass with a
    missing density in `madeof`.

## (C) Questions

The 66 questions of this pass were chapter 25 of the book; 3 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q25.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches

- The full text of Ashby's cost chapter and Granta's process attribute ranges: what is open, what is licensed.
- Open machine-hour and labour-rate data by country (BLS OEWS, Eurostat, ILOSTAT) as the regional layer for should-cost.
- Feature-based machining cost from B-rep (setups, removed volume, tool access) on replicad solids.
- 3D-printing cost models (slicer time estimates, material, machine amortisation) as the first should-cost node.
- Total cost of ownership (Ellram) and life-cycle cost (maintenance, energy, disposal) beside purchase cost.
- Target costing and value engineering (Japanese genka kikaku): cost as a design input rather than an output.
- EN 15804 modules A–D and EPD registries (EC3 by Building Transparency, ÖKOBAUDAT) as open carbon sources.
- The Product Environmental Footprint (PEF) and its EF database, and the EU Digital Product Passport beyond batteries.
- Grid carbon intensity data (Electricity Maps, Ember) for converting process energy to carbon by place and hour.
- Material criticality methods (EU CRM list, Graedel's criticality space) as a richer supply-risk layer than import reliance.
- Herfindahl–Hirschman concentration from USGS world production tables, computed per element.
- Inventory theory (EOQ, newsvendor, (s,S) policies) as nodes, and their relation to the Beer Game.
- Forrester's *Industrial Dynamics* (1961) and the system dynamics stock-and-flow notation as a board language.
- Proper scoring rules (Brier, logarithmic) and prediction markets for contributed estimates.
- Combinatorial clock auctions and the FCC incentive auction (2016–17) as models for allocating scarce simulated resources.
- Agent-based computational economics (Santa Fe artificial stock market, Sugarscape trade) for the living world.
- EVE's PLEX and real-money exchange, and other game economies with published data (RuneScape Grand Exchange).
- Parametric cost estimating in aerospace and defence (NASA cost models, DoD should-cost reviews) and their open handbooks.
- Commodity price indices that are public-domain (World Bank Pink Sheet, IMF primary commodity prices) as LME substitutes.
- Kitting and BOM formats (IPC-2581, KiCad BOM, OpenBOM) for importing priced bills of materials.

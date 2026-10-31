# Research (round 4): grammars of space, for rooms, buildings and cities

One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

What Nexus holds today, checked in the code this pass [C] (`src/nexus/blocks.ts`, `src/nexus/seeds.ts`): one node,
`plan.rooms`, lays rooms out from a text plan ("bedroom 4x4, bathroom 2.5x3 / kitchen 4x3.5", rows split by "/"), with
an optional hall between rows, and gives a table of rooms (type, w, d, x, z) to a spawner; `seed.city` is "a city of
neighbourhoods, n by n, each its own streets, houses and cars from its own seed". There are no adjacencies, no doors as
relations, no measures of a plan, and no grammar: a plan is one pass of rows. Research 09 already noted Townscaper's
wave function collapse; `TREE.md` and research 14 left Lynch as an open lead. This pass takes that lead and its
neighbours.

## (A) Findings

### 1. Lynch: the five elements of the image of a city
- [C] *The Image of the City* (Kevin Lynch, MIT Press, 1960) came from a five-year study of Boston, Jersey City and Los
  Angeles: people form mental maps from five elements, **paths, edges, districts, nodes and landmarks**; "imageability"
  is how easily a place forms a strong image (https://en.wikipedia.org/wiki/The_Image_of_the_City).
- [C] The book's own method: a trained observer covers the area on foot, maps the presence, visibility and
  interrelations of the five elements and marks each one's image strength or weakness, followed by long "problem trips"
  across the area to test the grasp of the whole; this was set beside interviews and sketch maps by residents. Lynch's
  composition rule: paths link the nodes, nodes join and mark off the paths, edges bound the districts, landmarks
  indicate their cores (Lynch's text, https://www.cooldavis.org/wp-content/uploads/2022/03/THE_IMAGE_OF_THE_CITY_Kevin_Lynch.pdf).
- [M] Lynch measured an image by what people drew and named, not by geometry; the elements are perceptual roles, so one
  thing can be a path to a driver and an edge to a pedestrian (an elevated motorway). [I] So a Lynch element is a role
  a thing plays for an observer of a given mode, not a type a thing has: it belongs on a relation (thing, observer,
  role), which fits the interface model (a part carries what it demands of neighbours; a city element carries what it
  offers to a viewer).

### 2. Space syntax: layouts as measurable graphs
- [C] Space syntax (Bill Hillier, Julienne Hanson and colleagues, The Bartlett, UCL, late 1970s to early 1980s): the
  main proposition is that social life in a space depends on its position in the fabric; integrated spaces are livelier
  and more frequented, segregated ones less (https://iastate.pressbooks.pub/visualgraphiccomm2/chapter/chapter-5-data-visualization-depthmap).
- [C] Measures: depth d_ij is the number of steps between two spaces in the graph; total depth is their sum from an
  origin; mean depth is total depth over n − 1; **integration** is relativised asymmetry, mean depth adapted for
  architectural layouts; connectivity is degree; depth can be computed globally or at a radius (e.g. radius 2)
  (Space Syntax Methodology handbook, https://helios.ntua.gr/pluginfile.php/302328/mod_folder/content/0/SpaceSyntax_Handbook.pdf).
  [M] RA = 2(MD − 1)/(n − 2); RRA divides by the D-value of a diamond-shaped graph of the same n so that layouts of
  different sizes compare; integration is often reported as 1/RRA. [C] The 1993 data notes give integration as "the
  reciprocal of relativised RA" (https://discovery-pp.ucl.ac.uk/1398/3/Hillier1993data_notes.pdf).
- [C] depthmapX is open source and multi-platform (originally Depthmap by Alasdair Turner); it imports plans or line
  maps, derives axial maps (a reduced straight-line network of the open space), segment maps and visibility graph
  analysis (VGA), and runs graph measures on them (https://spacegroupucl.github.io/depthmapX). [M] It is GPL-licensed C++;
  the axial-map derivation (the fewest longest lines that cover all convex spaces) is the hard step.
- [C] "Natural movement" (Hillier, Penn, Hanson, Grajewski, Xu, *Environment and Planning B* 20, 1993, 29–66): the
  configurational correlates of pedestrian movement are global properties of the grid, with integration the most
  important; attractors (and termini as negative attractors, at King's Cross) modify it rather than generate it
  (https://ui.adsabs.harvard.edu/abs/1993EnPlB..20...29H/abstract; https://discovery-pp.ucl.ac.uk/1398/3/Hillier1993data_notes.pdf).
  The correlation values I remember (r around 0.7 to 0.8 for some areas) [M] I could not confirm this pass; the raw
  King's Cross counts (adults per 100 m per hour, 8 a.m. to 6 p.m.) are published as a data file [C, same notes].
- [C] The critique: Carlo Ratti, "Urban texture and space syntax: some inconsistencies" (*EPB* 31, 2004, 487–499):
  the axial map discards metric and all 3D information (building heights never appear); a small deformation of a grid
  can produce a topological discontinuity so that "one single urban configuration produces two conflicting outcomes"
  (https://econpapers.repec.org/RePEc:sae:envirb:v:31:y:2004:i:4:p:487-499;
  https://www.audentia-gestion.fr/MIT/20040901_Ratti_SpaceSyntax_EnvironmentPlanning.pdf). Hillier and Penn's
  rejoinder: the two maps are syntactically different and axial analysis is exactly and only about such differences;
  the line graph internalises geometry (https://discovery.ucl.ac.uk/1061/1/hillier-2004-ratti.pdf). [I] A measure that
  can flip under a small edit is a measure whose stability must itself be reported (a sensitivity check, spec 10).
- [C] Julienne Hanson, *Decoding Homes and Houses* (1998): computer-based techniques that read the social and symbolic
  information in domestic layouts; houses are "intricate patterns of organised space, governed by rules and conventions"
  (https://books.google.com/books/about/Decoding_Homes_and_Houses.html?id=Hn_yL1QV4FgC). [M] Its tool is the
  **justified access graph**: rooms as nodes, doors as edges, drawn in layers by depth from the outside; a "genotype"
  is the ordering of rooms by integration that recurs across a group of houses; rings (more than one route) versus trees
  (one route) is the first thing read.
- [C] Isovists: Michael Benedikt, "To take hold of space: isovists and isovist fields" (*EPB* 6, 1979, 47–65): an isovist
  is the set of points visible from a station point; its measures are area, perimeter and occlusivity (the share of its
  boundary that is not a solid surface), computed on a grid and interpolated into fields
  (https://econpapers.repec.org/RePEc:sae:envirb:v:6:y:1979:i:1:p:47-65; https://t4su.readthedocs.io/en/latest/2d-visibility-studies.html).
  [M] Turner's VGA (2001) makes a graph of mutually visible grid cells and runs the same depth measures on it, which is
  what depthmapX's VGA does.

### 3. Shape grammars: rules that compute with shapes
- [M] Stiny and Gips, "Shape grammars and the generative specification of painting and sculpture" (1972): rules
  A → B on shapes, applied wherever A is found under a Euclidean transformation, with labelled points to steer them.
- [C] The **Palladian grammar** (Stiny and Mitchell, *EPB* 1978): a parametric grammar generating the ground plans of
  Palladio's villas as a definition of the style; 69 rules in eight stages: grid definition, exterior-wall definition,
  room layout, interior-wall realignment, principal entrances (porticos, wall inflections), exterior ornament
  (columns), windows and doors, termination; it reconstructs all but two of the villas in the *Quattro libri*
  (Gooren, TU/e, summarising Stiny and Mitchell, https://pure.tue.nl/ws/portalfiles/portal/58416877/Gooren_0675173.pdf;
  https://www.semanticscholar.org/paper/The-Palladian-Grammar-Stiny-Mitchell/049adf4453ffeb8e5c971a71e51b3aab81004e05).
- [C] The **prairie house grammar** (Koning and Eizenberg, *EPB* 8, 1981, "The language of the prairie"): parametric,
  generating the compositional forms and specifying the function zones of Wright's prairie houses
  (https://journals.sagepub.com/doi/10.1068/b080295). It is additive around a focal point, **the fireplace**: four rules
  add the living zone, one adds the service zone (kitchen, pantry) to make the core unit, four apply obligatory
  additions, six assign functions to undefined spaces; 89 compositions in the style are generated before ornament
  rules (Gooren, above). [C] Three kinds of grammar named there: grid (Palladio), subdivision (Duarte's Malagueira,
  which splits a given plot by proportions), additive (prairie) (Gooren).
- [C] Emergence: rules may act on shapes that were never placed as such but appear from parts of generated shapes;
  parametric subshape recognition is NP-hard (secondary sources found for Stiny's *Shape: Talking about Seeing and
  Doing*, MIT Press 2006, whose claim is that designing is calculating with shapes by rules, without equations;
  https://repositorio-iul.iscte.pt/bitstream/10071/29246/1/conferenceobject_97459.pdf). [M] Stiny's point is that a
  shape is not a fixed set of symbols: after a rule runs, the result may be re-seen with parts that no rule made.
  [I] This is the one place where a node graph (symbols wired explicitly) and a shape grammar truly differ; Nexus can
  take the rule form and the stages, and treat emergence as an optional detector, not a foundation.
- [C] Later work joins plan graphs with massing grammars to re-derive Wright (Lee et al., *Nexus Network Journal* 2017,
  https://link.springer.com/article/10.1007/s00004-017-0333-0); a Song-style dougong bracket grammar parametrised by the
  cai-fen grades exists (Wu 2003, cited in eCAADe 2023, https://papers.cumincad.org/data/works/att/ecaade2023_142.pdf).

### 4. Alexander: a pattern language as a network, and transformations
- [C] *A Pattern Language* (1977): 253 patterns, a network from regions and towns to construction details, each a
  problem and a documented solution, cross-referenced by number; the authors call every pattern a hypothesis and mark
  their confidence with asterisks (https://en.wikipedia.org/wiki/A_Pattern_Language).
- [C] Pattern 127, **Intimacy Gradient**: "Lay out the spaces of a building so that they create a sequence which begins
  with the entrance and the most public parts of the building, then leads into the slightly more private areas, and
  finally to the most private domains" (https://patternlanguage.cc/Patterns/Intimacy-Gradient-(127)). [I] This is
  directly checkable on a justified access graph: privacy rank should rise with depth from the entrance; a violation is
  a bedroom shallower than the living room on the only route.
- [C] 2025: an LLM plus pattern-language tool (MDPI *Buildings* 15(14) 2400) notes the language's 1,166 pages make it
  unwieldy and treats the patterns as empirically derived proxies for wellbeing
  (https://www.mdpi.com/2075-5309/15/14/2400).
- [C] *The Nature of Order* (2002–2004): fifteen geometric properties, later recast as fifteen **structure-preserving
  transformations**, each introducing or strengthening a property in a growing field of centres; a "living process"
  generates structure step by step through them (https://en.wikipedia.org/wiki/The_Nature_of_Order;
  https://nature-of-order.stefan-lesser.com/b2-c2-fifteen-transformations). [I] That is a grammar of edits, not of
  generation: each step must keep what already works; it matches Nexus's "changes that follow" and "never break old
  parts".

### 5. Building codes of proportion: the Yingzao Fashi and kiwari
- [C] The *Yingzao Fashi* (Li Jie, presented 1100, published 1103): standard measures for all structural carpentry
  components; an eight-grade timber system, **cai-fen** (https://en.wikipedia.org/wiki/Yingzao_Fashi). Li introduced the
  cai partly so construction cost could be calculated and local corruption controlled
  (https://www.archdaily.com/949479/from-ancient-to-modern-modular-construction-in-chinese-timber-architecture).
- [C] A cai is a section of height to width 3:2; its height is 15 fen and width 10 fen; the fen is therefore a relative
  unit whose length depends on the grade (eCAADe 2023 above; https://www.mdpi.com/2075-5309/14/5/1472 via search).
  Grade follows building rank: palace halls may use grades 1 to 8, lesser halls may not use grades 1 or 2
  (https://baike.baidu.com/en/item/Yingzao%20Fashi/1518086). [M] The first grade is commonly given as 9 cun by 6 cun
  (0.6 cun per fen); I did not confirm it in a primary table this pass.
- [C] **Kiwari** (wood allotment): set a standard column spacing L, choose a factor α by the building's scale, column
  diameter C = αL, then derive every other member from C; the best-known manual is the *Shōmei* (1605–1608, the
  Heinouchi family) (https://pdfs.semanticscholar.org/f254/d2cfedd7463e4269d42be3dd706f394a63f9.pdf). The ken, the bay
  between column centres, became a standard unit, six shaku, 20/11 m ≈ 1.818 m by the 1891 act [C, secondary
  encyclopedia, https://grokipedia.com/page/Ken_(unit); treat as unverified].
- [C] A 2023 survey comparing kiwari manuals with measured buildings found column diameters at 0.1D, 0.11D, 0.12D and
  0.15D (in line with the manuals) but also 0.08D and 0.09D (not in them), and spacings not consistent within one
  method (*Sustainability* 15(7) 5800, https://www.mdpi.com/2071-1050/15/7/5800). [I] **The rulebook and the built
  stock disagree**; a grammar learned from books and a grammar learned from measured buildings are two sources and
  must be kept apart, each labelled.
- [I] Both systems are what Nexus already does for bolts: one governing dimension (a thread size; a cai grade; a column
  spacing) from which every other dimension is derived by a sourced table. A building module is an interface standard.

### 6. CityEngine's CGA and procedural cities
- [C] Parish and Müller, "Procedural modeling of cities" (SIGGRAPH 2001, 301–308): an L-system, extended with
  self-sensitivity, grows the street network; buildings composed by L-systems and texture elements
  (https://history.siggraph.org/?p=116923); a secondary account says segments snap to nearby streets and shorten or turn
  at water or parks, and lots come from recursively splitting blocks along their longest edges
  (https://phiresky.github.io/procedural-cities/presentation.html; not checked against the paper).
- [C] Müller, Wonka, Haegler, Ulmer, Van Gool, "Procedural modeling of buildings" (ACM TOG 25(3), 2006, 614–623)
  introduced **CGA shape**; CGA++ (Schwarz and Müller, SIGGRAPH 2015) extends it
  (https://michael-schwarz.com/research/publ/files/cgapp-sig15.pdf). CGA today: rules on shapes with a scope; operations
  `extrude`, `split`, `comp` (component split into front, side, top faces), `setback`, `offset`, roof operators, `i()`
  (insert an asset), relative sizes (`~1` floating, `'0.5` relative), `attr` (user parameters), `case` conditions and
  recursion with a stop (https://doc.arcgis.com/en/cityengine/latest/cga/cityengine-cga-introduction.htm;
  https://doc.arcgis.com/en/cityengine/latest/tutorials/tutorial-9-advanced-shape-grammar.htm;
  https://proceedings.esri.com/library/userconf/devsummit12/papers/developing_with_esri_cityengine.pdf).
  Example [C]: `Lot --> extrude(height) Mass`; `Mass --> comp(f){ top: Roof | front: Frontfacade | side: Facade }`;
  `Facade --> split(y){ groundfloor_height: Groundfloor | ~1: UpperFloors }`.
- [M] CGA has occlusion queries (`inside`, `overlaps`, `touches`) so a rule can ask whether a window would hit a
  neighbour; rules are run top-down per lot, deterministic from a seed per shape.
  [I] CGA's split with floating parts (`~1`) is a one-dimensional constraint solve: fixed sizes kept, floating ones share
  the rest. Nexus's `plan.rooms` already does a crude version (the last room in a row takes the slack).

### 7. Wave function collapse and its relatives
- [C] WFC (Maxim Gumin, 2016) generates from a single example: the simple tiled model (adjacency constraints between
  tiles) and the overlapping model (every N×N window in the output must occur in the sample); it works the same in 3D
  with performance the issue; Kleineberg's infinite city (2018) discusses adjacencies, backtracking and an online
  variant; Boris the Brave's library supports hex grids, extra constraints and backtracking, and applied "chiseling"
  to force connected structures (https://github.com/mxgmn/WaveFunctionCollapse). Gumin found backtracking rarely needed
  with a sensible tile set (https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained).
- [C] A 2024 thesis on WFC for buildings restarts on contradiction instead of backtracking because its constraints
  rarely conflict (https://reposit.haw-hamburg.de/bitstream/20.500.12738/15709/1/BA_Procedural%20Generation%20of%20Buildings_geschw%C3%A4rzt.pdf);
  non-uniform tile WFC (TU Delft) lifts the one-cell-tile restriction
  (https://publications.graphics.tudelft.nl/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBaElVIiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--fa2d0b83cd53ffaf64a88d4b4ff959b79f92a81a/NUTWFC.pdf).
- [C] **MarkovJunior** (Gumin): a program is an ordered list of rewrite rules applied in random order; it supports
  inference that constrains a future state and only generates runs that reach it; any model runs in any dimension; MIT
  licence, 153 examples (https://github.com/mxgmn/MarkovJunior). [I] It is the nearest existing thing to "a grammar of
  space as a node": small, readable rules, deterministic from a seed, with a goal.
- [M] WFC's adjacency rules are a local constraint satisfaction problem (arc consistency plus a minimum-entropy choice);
  it cannot by itself enforce global properties (one connected circulation, an intimacy gradient) without extra
  constraints or chiseling. [I] So WFC fills texture (facades, street furniture, ruins); graph and grammar methods carry
  structure.

### 8. Generative floor plans, 2010 to 2026
- [C] Merrell, Schkufza, Koltun, "Computer-generated residential building layouts" (ACM TOG 29(6), 2010): a Bayesian
  network trained on real plans proposes an **architectural program** (rooms, sizes, adjacencies), then
  Metropolis–Hastings optimisation slides walls and swaps rooms to fit it under a cost function
  (https://dl.acm.org/doi/10.1145/1882261.1866203; summary in https://www.politesi.polimi.it/retrieve/a81cb05d-7b46-616b-e053-1605fe0a889a/2019_12_Carideo.pdf).
  [I] Program first, geometry second: the same two steps as a bubble diagram then a plan.
- [C] **Graph2Plan** (Hu et al., ACM TOG 39(4) 2020): a layout graph plus a building boundary → a raster plan → room
  boxes; trained on **RPLAN** (80k annotated plans); retrieves similar layout graphs from the database for the user to
  edit (https://arxiv.org/abs/2004.13204; https://github.com/HanHan55/Graph2plan). RPLAN's records hold the boundary
  with the front door, room types, room boundaries, boxes and edges (u, v, relative position) [C, same repo].
- [C] **House-GAN** (Nauata et al., ECCV 2020): a relational GAN conditioned on a bubble diagram (rooms as nodes,
  adjacencies as edges); 117,587 plans vectorised from LIFULL HOME's database; with a user study by architects
  (https://github.com/ennauata/housegan; https://arxiv.org/abs/2003.06988).
- [C] **HouseDiffusion** (Shabani, Hosseini, Furukawa, CVPR 2023): diffuses room and door polygons as corner
  coordinates, with a Transformer whose attention masks follow the input graph; a discrete final coordinate enforces
  shared corners, parallel and perpendicular walls; pure discrete diffusion trained poorly; can make non-Manhattan
  plans and fix each room's corner count; on RPLAN
  (https://openaccess.thecvf.com/content/CVPR2023/html/Shabani_HouseDiffusion_Vector_Floorplan_Generation_via_a_Diffusion_Model_With_Discrete_CVPR_2023_paper.html).
- [C] GenPlan (OpenReview) criticises RPLAN: most plans have one bathroom; three bathrooms or more than three bedrooms
  are rare; some room connections are wrong (https://openreview.net/pdf/458370c9557e6821ae5ab9eab157bce86fa6493a.pdf).
  [C] The RLVR paper's limitation names RPLAN as single-floor residential plans "from Asia" (below). [I] The dominant
  data set is one culture's apartments; a "learned" plan inherits its genotype.
- [C] **LLM + reinforcement learning with verifiable rewards** (arXiv 2605.14117, NeurIPS 2025 listing): fine-tune an
  LLM on real plans as JSON, then RLVR on numerical (areas, dimensions) and topological constraints; averaged over five
  to eight rooms, RLVR cut overlap by 65 % and compatibility error by 56 % against fine-tuning alone; natural-language
  input in place of JSON raised compatibility error from 0.15 to 0.37 on eight rooms; future work names **circulation
  and daylight proxies** as rewards still missing (https://arxiv.org/html/2605.14117v1;
  https://neurips.cc/virtual/2025/136642). [I] Structured input beat prose; the constraint check is the reward: the
  same lesson as research 01 ("numbers check better than pictures").
- [C] **FloorPlan-LLaMa** (Yin et al., ACL 2025): argues FID, GED and PSNR are statistical and blind to domain
  knowledge; builds ArchiMetricsNet with architects' scores on **functionality, flow, and overall**; trains a
  multi-dimensional preference score as an RLHF reward (https://aclanthology.org/2025.acl-long.331). Also 2024–2025:
  HouseLLM/HouseTune two-phase text-to-plan (arXiv 2411.12279), DStruct2Design benchmark (arXiv 2407.15723), diffusion
  with area constraints, accessible multi-occupancy plans (*Autom. Constr.* 177, 2025), "Comprehensive and dedicated
  metrics for evaluating AI-generated residential floor plans" (*Buildings* 15(10) 1674, 2025) [C, as citations in
  https://aclanthology.org/2025.acl-long.331.pdf and https://mgv.sggw.edu.pl/article/view/10294; contents not read].

### 9. How a plan is judged
- [C] Daylight, as a number: **spatial daylight autonomy** sDA300/50 % is the share of floor area reaching 300 lux for
  at least half the analysis hours (10 h a day, all year); **annual sunlight exposure** ASE1000,250 is the share of area
  getting over 1000 lux direct sun for over 250 h a year, a proxy for glare and heat; both from IES LM-83; LEED awards
  1, 2, 3 points at sDA 40, 55, 75 % (https://www.kalwall.com/daylight-modeling/daylighting-metrics). The UK schools
  guide sets daylight autonomy 50 % of time over 50 % of the working plane at 300 lux and warns that a mean can pass
  with poor distribution, so uniformity needs its own metric (useful daylight illuminance 300–3000 lux)
  (https://assets.publishing.service.gov.uk/media/5a7dc925e5274a5eaea66529/EFA_Daylight_design_guide.pdf).
- [C] Egress, as a number: IBC Table 1017.2 limits exit access travel distance (e.g. 200 ft unsprinklered, 250 ft
  sprinklered for some occupancies); common path of egress travel is in Table 1006.2.1 (often 75 ft, 100 ft in some
  sprinklered cases); values vary by occupancy and edition and the secondary sources conflict
  (https://open-exam-prep.com/study-guides/icc-fire-plans-examiner/egress-safety/exit-access-travel-distance;
  https://idighardware.com/2015/01/decoded-egress-terminology/). [I] Travel distance and common path are shortest-path
  measures on the same graph space syntax uses, with metres instead of steps.
- [M] Architects' plan critique (studio and practice): circulation (how much area is corridor; whether routes cross
  served spaces; dead ends), served and servant spaces (Kahn), privacy gradient and acoustic separation (bedrooms off
  living rooms, wet rooms stacked), daylight and aspect (dual aspect, orientation), views and thresholds, structure
  regular enough to span, furniture that fits (a bed with 600 to 700 mm each side), and the entrance sequence. Many
  national space standards (England's Nationally Described Space Standard, 2015) give minimum floor areas by bedrooms
  and bed spaces [M; not checked this pass].
- [I] Every one of these but "delight" is a measure on two structures Nexus can hold: the **access graph** (rooms,
  doors) and the **geometry** (walls, openings, sun). Generators score themselves on graph topology; architects judge on
  flow, light and privacy; the research gap named by the 2025 papers (circulation and daylight as rewards) is exactly
  where Nexus's checkable nodes would sit.

## (B) What Nexus should take

A "space grammar" in Nexus is not one big generator node. It is four layers of small nodes, each with numbers out, so
that the agent (and a person) composes them as it composes a bolt and its hole: **program** (what rooms, how big, what
must touch), **graph** (access and adjacency), **geometry** (walls, openings, massing), **measures** (what the plan
does), with **rules** that rewrite between layers and **modules** that fix the dimensions.

### Data model
1. **A spatial graph value** (`space.graph`) [00 structure, 01 interfaces]: nodes are spaces (room, corridor, court,
   street segment, district) with type, area, privacy rank, height; edges are relations with a kind: `door`, `opening`,
   `adjacent` (shares a wall, no passage), `visible`, `above`. One type for a flat, a building and a city, so folding
   works across scales (a building folds into one node of the street graph, keeping its entrances as ports).
2. **Spaces as parts with interfaces** [01]: a room carries what it demands of its neighbours exactly as a bolt does:
   a bedroom demands "not opening onto the living room", a bathroom "a wet wall stacked within 2 m of a stack", a
   kitchen "adjacent to dining", a stair "a clear landing of its width". These are interface keys (round 3's finding
   12): a wrong adjacency cannot connect, or connects with a visible exception.
3. **A module (the cai, the ken, a structural grid) as an interface standard** [01, 10]: one governing dimension per
   building, a table that derives the rest; the grade chosen by rank or span; the derived sizes carry the table as
   their source. Two sources kept apart: the rulebook (Shōmei, Yingzao Fashi, a modern grid) and the measured stock
   (the 2023 survey), each labelled.
4. **Lynch roles as relations, not types** [11 living world]: (thing, observer mode, role ∈ path, edge, district, node,
   landmark, strength). A motorway can be a path to a car and an edge to a walker.
5. **Provenance on every generated plan** [10]: grammar and version, rule sequence, seed, which data set a learned model
   came from (RPLAN: single-floor Asian apartments), and the measures it passed.

### Nodes
6. **`space.program`** (brief to program): rooms, minimum areas (from a sourced space standard, or an input the person
   gives, V-R4 style), required adjacencies and their strength, privacy rank. Output a bubble diagram as a `space.graph`.
7. **`space.depth`**: total depth, mean depth, RA, RRA, integration (global and at radius r) and connectivity for every
   node of a graph; the justified graph drawn from a chosen root. Tested against hand-worked small graphs and, where the
   licence allows, against depthmapX outputs on the same input (GPL: run, not copied).
8. **`space.isovist`** and **`space.vga`**: isovist area, perimeter, occlusivity from a point; a visibility graph on a
   grid and its integration. Runs in three.js space, so it works in VR: stand in the room and see your isovist.
9. **`space.axial`** (city scale): an axial or segment map from street centrelines (segment angular analysis rather than
   the fewest-lines derivation first, since Ratti's inconsistency is about the axial step) [I].
10. **`space.gradient`**: checks Alexander's intimacy gradient on the access graph from the entrance: privacy rank should
    not fall with depth along any route; names the violating rooms.
11. **`space.circulation`**: corridor share of area, dead ends, rings versus trees, routes that pass through served
    rooms, and the longest walk to an exit and the common path (metres on the same graph); the code limits as inputs
    with their edition and occupancy, never as fixed constants.
12. **`space.daylight`**: sDA300/50 and ASE1000,250 over the year from geometry, site latitude and a weather file;
    uniformity beside the mean; labelled "simulated, method X" (and the validity band: a ray method, not a lab measure)
    [10, 09]. A first tier by rule of thumb (window-to-floor ratio, depth ≤ 2 to 2.5 × head height [M]) labelled as such.
13. **`space.fit`**: furniture and clearances from the parts themselves (a bed demands its side clearances; a door its
    swing): the interface model checking a room is usable, not only sized.
14. **`space.lynch`**: proposes Lynch elements from the graph and geometry (high-integration segments as candidate
    paths; boundaries of low permeability as edges; clusters as districts; high-degree junctions as nodes; tall or
    isovist-dominant objects as landmarks) and reports a legibility score; labelled as a proxy, since Lynch measured
    images in people, not layouts [16 "indicator is not event", round 3].
15. **`grammar.rules`** (the executable grammar): an ordered list of rewrite rules over `space.graph` and over shapes,
    with stages (Palladio's eight: grid, walls, rooms, realign, entrances, ornament, openings, terminate), conditions,
    a seed, and a log of which rule fired where. MarkovJunior's form (rules plus random order plus a goal) and CGA's
    operations (`extrude`, `split` with fixed and floating parts, `comp`, `setback`, `insert`, occlusion queries) are the
    two vocabularies to copy; the rule set is data, saved and versioned like any board.
16. **`grammar.wfc`**: wave function collapse for texture only (facades, paving, ruins, interiors' finishes), on
    regular and irregular grids, with a declared contradiction policy (restart or backtrack) and a count of restarts.
17. **`plan.layout`** (graph to geometry): a constrained solver that turns a `space.graph` plus a boundary into walls,
    in two engines: a deterministic one (subdivision and slicing, then wall sliding as in Merrell 2010, every step
    logged), and an optional learned one (Graph2Plan or HouseDiffusion class) whose output is only a proposal, checked
    by the measures before it is accepted. `plan.rooms` becomes this node's simplest mode.
18. **`plan.critic`**: the reviewer panel (research 11) for plans: each judge a measure node (circulation, gradient,
    daylight, fit, egress, area against program) plus one learned preference judge (FloorPlan-LLaMa's three axes:
    function, flow, overall), each with its own pass mark and source.
19. **`city.streets`** and **`city.lots`**: a street network grown by a rule set (Parish and Müller's self-sensitive
    L-system first), lots by recursive splitting, buildings by `grammar.rules` per lot; every street segment a
    `space.graph` edge so space syntax runs on the result. Extends `seed.city`.

### Rules and ways of working
20. **Program before geometry** (Merrell, Graph2Plan, House-GAN all agree): the agent writes the bubble diagram and the
    numbers first, then lays it out; it never draws a plan it cannot state as a graph.
21. **Generators propose, measures decide** (RLVR's lesson): any generated plan passes the measure nodes or is shown
    failing; the measures are the agent's reward, and the agent says which ones it did not run.
22. **Structured input to generators**: JSON-like programs, not prose (prose doubled the compatibility error in the
    RLVR paper).
23. **Edits as structure-preserving transformations** (Alexander): a change to a plan reruns the measures and reports
    which got worse; a change that breaks a passing measure is flagged like a broken interface (round 3's "never break
    old parts", applied to places).
24. **Measures report their stability** [10]: run each measure under small geometric perturbations; a measure that
    flips (Ratti's case) is shown as unstable, not as a result.
25. **Styles as named, versioned grammars with their corpus**: "Palladian (Stiny and Mitchell 1978, 69 rules,
    reconstructs all but two villas)", "prairie (Koning and Eizenberg 1981, 89 compositions)", each with what it was
    tested on and what it fails on. A learned style names its data set and its biases.
26. **Being in it** [04, 11]: walk the plan in VR with the isovist, the depth from the door and the daylight shown on
    the floor; "problem trips" (Lynch's method) as an agent task: route across the city with only what is visible, and
    report where it got lost.
27. **Living world** [11]: agents moving through a city by natural movement (integration plus attractors), so the
    space syntax prediction and the simulated movement can be compared, and both against real counts where they exist
    (Hillier's King's Cross data file) [10's "hand calculation beside the simulation"].
28. **Ideas (07)**: a game of grammars (give a rule set, guess the style); "decode a house" (draw a justified graph of
    your own home); cities from Lynch sketches drawn in VR, turned into a graph and laid out.

## (C) Questions

The 66 questions of this pass are chapter 17 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Hillier's *Space is the Machine* (1996) and the "generic function" argument: why integration predicts co-presence.
- Angular segment analysis and choice (betweenness) at metric radii, as used in modern space syntax practice.
- Turner's visibility graph analysis and agent-based "exosomatic visual architecture" (agents that walk by isovists).
- Peponis's convex and s-partitions and the formal definition of axial maps (Turner, Penn, Hillier 2005 "an algorithmic definition of the axial map").
- Duarte's Malagueira grammar and his "discursive grammar" for mass customised housing.
- Shape grammar interpreters (GRAPE, SortalGI, Shaper2D) and their licences.
- Tensor-field street modelling (Chen, Esch, Wonka, Müller, Zhang 2008) as an alternative to L-systems.
- Inverse procedural modelling: fitting a grammar's parameters to a target city or building (Talton et al. 2011, Metropolis procedural modelling).
- Space standards as sourced data: England's Nationally Described Space Standard, Neufert's tables, and what may be stored.
- Daylight in the browser: Radiance ports to WebAssembly, Ladybug/Honeybee's open methods, EN 17037's metrics.
- Fire egress simulation (Pathfinder, open JuPedSim) as the dynamic check beside static travel distance.
- Japanese room modules: tatami counts (jō) as an area unit and kiwari for interiors (shoin style).
- The Roman castrum and Laws of the Indies (1573) as city grammars written as law.
- Islamic courtyard house grammars and Hanson's genotypes across cultures (to counter RPLAN's single culture).
- Kahn's served and servant spaces and Hertzberger's thresholds as checkable relations.
- Lynch's *Good City Form* (1981): performance dimensions (vitality, sense, fit, access, control) as city measures.
- Computational legibility studies that compare sketch maps with space syntax measures.
- Building information as graphs: IFC's IfcRelSpaceBoundary and IfcSpace as the import route for `space.graph` (spec 05's IFC reader).
- Townscaper's irregular quad grid and dual-grid tile deformation, in detail.
- Model synthesis (Merrell 2007), WFC's predecessor, for 3D buildings with exact constraints.

# Research (round 3, far branch): construction toys, folding, textiles and ancient engineering as interface systems

One research pass, 2026-10-31. Marks: [C] checked in that pass with its source; [M] from memory; [I] inference.

## (A) Findings, in short
- **LEGO** [C]: the stud-and-tube patent filed 28 Jan 1958 because hollow bricks made unstable models; "clutch power"; six 2×4 bricks of one colour combine 915,103,765 ways. **Tolerances, sources disagree**: LEGO's history says ABS (1963) allowed 1/200 mm; Forbes via Brick Architect says moulds hold 0.002 mm and 18 parts per million are discarded; proprietary rigs measure attach and remove force. [I] Clutch is not one number: it emerges from material, geometry and process, and accumulated tolerance over many studs matters more than one feature. **Duplo** [C]: 2:1 in every dimension, hollow studs that take a standard brick's tubes (patented 1967, launched 1969): "all LEGO elements, old or new, are compatible". **Technic** [C] 1977; studless from ~1996–2003; [M] studded beams' vertical pitch (9.6 mm) only met the horizontal at "one brick and two plates = two studs", a mismatch that helped the studless system win. [M] After the patents expired, courts refused to protect the brick's functional shape (Canada 2005; EU 2010): the interface became a de facto open standard.
- **LDraw** [C]: plain text; line types 0 (comments and meta), 1 (a sub-part with colour, position and a 3 × 3 matrix), 2–5 (lines, triangles, quads, conditional lines); 1 LDU ≈ 0.4 mm (a brick 20 × 24 LDU, a plate 8, a stud 12 across); strict authoring rules. [M] No connection meaning in the core format (snap data lives in tools' extensions). [I] Geometry and hierarchy, no interfaces.
- **Meccano** [C] (1901): holes at a ½-inch (12.7 mm) pitch, 4.1 mm across, 8-gauge axles, 5/32 Whitworth threads, unchanged for over a century; parts a hundred years old mix with new ones; some modern parts halve the pitch; clones kept the pitch but changed the thread.
- **Zometool** [C]: hole shapes on the ball match symmetry axes (rectangles on 2-fold, triangles on 3-fold, pentagons on 5-fold); a strut fits only its shape; every node sits in the golden field, so models close exactly.
- **Lincoln Logs** [C]: one interface, a square notch, from the Imperial Hotel's foundations; customers rejected plastic.
- [I] **What makes an interface system last**: one small frozen primitive; backward compatibility as policy; scaled families that still mate; interfaces enforced by shape; manufacturing measured, not only specified; an interface that becomes a commons; geometry that closes.
- **Folding** [C]: the seven Huzita–Justin axioms (the sixth solves cubics); Maekawa (mountains minus valleys = ±2) and Kawasaki (alternate angles sum to π) at each vertex, while global flat-foldability is NP-hard; Lang's TreeMaker (a stick figure in, a crease pattern out: inverse design); Miura-ori flown on the Space Flyer Unit (1995); the starshade's petals must deploy to a shape accurate enough for 10⁻¹² contrast; Hoberman's angulated scissors; kirigami's cut patterns with auxetic and multistable states.
- **Textiles** [C]: Knitout (CMU): a machine-independent assembly language for knitting, translated to vendors' formats; Lovelace (1843): "the Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves"; Flyknit (2012) knits the upper to shape.
- **Ancient engineering** [C]: Roman concrete's lime clasts from hot mixing heal cracks (Science Advances 2023), and a Pompeian building site shows hot mixing in practice (Nature Communications, Dec 2025), against the usual reading of Vitruvius. Inca masonry: each stone fitted to its neighbours by trial; polygonal masonry forgives (a chipped corner becomes the next stone's face), against Tiahuanaco's standard blocks. **Heyman's safe theorem**: if any line of thrust stays inside the masonry, it stands: geometry, not stress; an arch thinner than ~1/18 of its span cannot stand. Roriczer (1486) derives a whole pinnacle from one square. **Japanese joinery**: tsugite and shiguchi, no nails; a Kyoto paper classifies joints for CNC; [M] *Tsugite* (UIST 2020) designs joints in voxels and checks they can slide together, last and be milled: the nearest prior art to our interfaces. Qanats (UNESCO), windcatchers, stepwells following the water table; Damascus steel's nanostructure (Nature 2006) depended on its ore.

## (B) What Nexus should take
1. **A grid primitive per part family** (LEGO, Meccano, LDraw units); interfaces valid at lattice points; a closure check (do the pitches meet at small integers?).
2. **Interfaces that accept other scales of themselves, in one direction** (Duplo takes LEGO).
3. **Interfaces keyed by shape**, so a wrong connection cannot be made before any solver runs.
4. **An exact number field per system** (integer LDU; the golden field for Zome): loops close with no drift.
5. **LDraw import**, adding the interfaces it lacks; LDraw's library governance as a model.
6. **Never break old parts**: a new interface version mates with the old one or declares an adapter.
7. **A tolerance-stack node**: accumulated fit along a path as a fit class.
8. **Joinery as an interface**: a boolean pair, a slide axis, a locking element, how it is cut (tool access); pasted onto a beam it cuts both halves: "both ways" with no fastener.
9. **An assembly-order check**: some order exists along every slide axis.
10. **Two interface modes**: standard (interchangeable) and fitted (derived from the neighbour's actual shape: the Inca way), each interface marked.
11. **A fold-pattern node** with local checks and a plain warning that global flat-foldability is NP-hard; a rigid-folding simulation.
12. **TreeMaker as the pattern of inverse-design nodes**: requirement in, part out.
13. **A Huzita–Justin construction kernel** for exact folded sheet parts.
14. **Deployable linkages** with stowed and deployed shapes and a shape-accuracy check.
15. **Kirigami sheets** with their stable states listed.
16. **A Knitout exporter**, and Knitout's layering copied: graph → neutral process format → vendor formats.
17. **Rules of thumb as rule nodes that cite their source** (Roriczer; arch ≥ span/18); a thrust-line node for masonry (Heyman).
18. **Materials carry their process and source** (hot-mixed concrete; Damascus ore) and the mechanisms they enable (self-healing with its trigger).
19. **The environment as a neighbour**: a qanat's gradient, a stepwell's water table, a windcatcher's wind are interface demands on the site.
20. **Interfaces as a commons**: open, versioned definitions others may implement.

## (C) Questions

The 64 questions of this pass are chapter 9 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches
- *Tsugite* (UIST 2020): its voxel joints and slidability, durability and millability checks
- LDCad and LeoCAD snap extensions: the nearest thing to a connection standard
- BrickLink Studio's connectivity data and its licence
- Chinese bracket sets and the *Yingzao Fashi* (1103): a modular unit as a national building code
- Japanese *kiwari*: every timber sized from the column spacing
- Tiahuanaco's poured metal cramps: an ancient cast-in-place interface
- CNC timber joinery (Gramazio Kohler, Hundegger, integral plate joints)
- Rigid-origami simulators (Tachi; Ghassaei's Origami Simulator) as fold nodes
- Thick-panel origami (Lang and Magleby)
- Knitting compilers beyond Knitout (KnitScript, autoknit, vendor formats)
- Quipu: knotted-cord records as textile data
- Froebel gifts and the Bauhaus: toys that shaped modernism
- Fischertechnik's dovetail (1965) and Merkur's metric Meccano
- Hot-mixed concrete companies and standards for self-healing claims
- The Antikythera mechanism's gear teeth: an ancient gear interface?
- Funicular masonry design today (Block Research Group; thrust network analysis)
- Yakhchal ice houses: qanat and windcatcher as one thermal system
- Wootz steel's reconstruction and its vanadium
- LEGO's bio-based and recycled plastics: does clutch survive a change of material?
- Quasicrystals and Penrose tilings: an interface system on a non-periodic grid

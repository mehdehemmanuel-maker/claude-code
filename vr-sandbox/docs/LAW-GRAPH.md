# The structure between the laws, and its projection

3 October 2026. `src/ganglia/lawgraph.ts`, tests/unit/lawgraph.test.ts. The laws stay laws; what changed is how their
complete relational structure is represented, and that the visible layout is a projection of it, derived, never
curated. Answers to the twelve questions, each from the code and the measurements.

1. **What the current law graph lost.** There was no law graph: the tree (`tree/nodes.ts`) names realisations of the
   physics and none of the 144 book laws; `graph.ts` keeps one shortest chain and drops the rest; law-to-law relations
   existed only inside workflows, principles and processes as lists, and inside the shapes and the substrate as
   separate stores. Lost: the relation type on an edge, the path between two laws, multi-parent ancestry, shared
   descendants, limiting cases, indirect connection, strength, and any notion of depth that was not a folder.

2. **What S must preserve.** Not a scalar. For each law: its typed relations, each with what carries it (`via`: a
   quantity, a workflow, a constant, a shape key, the other law of a composition) and where it came from (`source`);
   the derivations with both parents and the quantity composed through; every path within a depth with the relations
   that compose it; and per law the computed standing (what rests on it, what it rests on, chain lengths, dependency
   reach). S is the typed multigraph plus its path index, nothing collapsed.

3. **Whether Nex/Ganglia already held enough.** Partly. Shapes (forms.ts) give shared structure and specialisation;
   the substrate gives `is-a`, `governed-by`, `requires` with provenance; the registries give co-use; the quantities
   give feeding. What did not exist anywhere: derivations between book laws. They are now found, not typed: composing
   two laws through a shared quantity and testing the composite against every law of the same output on random
   points. Five found (Joule heating is electrical power through Ohm's law; potential energy is kinetic energy through
   the speed of a fall; a bolt's torque is a wheel's torque through three friction laws). Composition proves
   functional identity; whether a textbook calls it a derivation is a reading. Specialisation by a held constant: zero
   in the book today, computed honestly.

4. **Multi-parent and many-to-many.** Edges are typed and directed; a law has any number of each kind; a derivation
   has two parents and is stored as two `derives-from` edges each carrying the other parent and the quantity in `via`.
   Nothing is a tree.

5. **Indirect paths retained.** `paths(a, b, depth)` enumerates every simple path within the depth over the chosen
   kinds, each with its steps, the edge on each step and its direction; A→B→D and A→C→E→D both survive (tested).
   `between(a, b)` counts the paths through each intermediate law.

6. **Depth without destroying paths.** Distances are reported per kind: derivational (shortest over derivation
   edges), dependency (shortest over co-use and feeding), common-ancestor depth, shape level, human domains (a view),
   and path counts, structural and of use separately, the dense layer capped and said as "at least". No single number
   is formed.

7. **Foundational depth from the topology.** `standing()`: reach (laws resting on it through derivation), depthBelow
   (longest chain below), heightAbove, dependencyReach (laws its output reaches through quantities), and foundational
   = nothing above it and something below. `deepest()` ranks by reach. Today the derivation layer is sparse (10 edges)
   because derivations were never data in the book, so the ranking is nearly flat; the substrate's arrows change it:
   the process-time scaling result, above five laws, becomes the deepest (tested).

8. **Kinds coexist.** Seven kinds, each a layer with its own weight in the layout only; queries never add weights
   across kinds. Measured: derives-from 10, shares-shape 53, co-used 223, feeds 433, shares-constant 40.

9. **The projection.** `projection()`: height from the derivation topology (depthBelow, normalised), the plane from
   the spectral embedding of the whole weighted structure (the two smallest non-trivial eigenvectors of the normalised
   Laplacian; deterministic, signs fixed), groups as the components of the derivation and shape layers. 144 placed,
   109 groups. The layout is derived; nothing is positioned by hand.

10. **Automatic reorganisation.** The projection is a pure function of the structure: one parent put above five laws
    moves 131 laws in the plane and lifts the parent to the top (tested). The structure the app uses takes the
    substrate's `is-a` arrows, so a research result that enters the substrate reshapes the graph.

11. **Zoom without losing cross-links.** `roots()`: every foundational node with its cone as a super-node, laws in no
    cone as their own, and every edge between cones aggregated by kind and counted; `branch(root)`: the cone opened,
    its inner edges and each edge leaving it one by one (the aggregate equals the sum, tested); the law level is
    `edgesOf`; the sub-law level is `cone` one step down; the derivation path level is `paths`.

12. **Ego over the full structure.** "how are the laws ohm and joule connected", "what lies between the laws …",
    "how close are the laws … and …", "what rests on the law …", "what does the law … rest on", "which laws are
    deepest", "describe your law graph": each answered from S, with the paths and the per-kind distances, while the
    human would see only the 3D projection.

Not done here, by instruction: no change to what a law is, to Nex, to the substrate's records, or to the S theory.
The 3D rendering in the headset is not built yet; the projection it would draw is.

# Ego's language of form

Flows, ways and blocks (`docs/GANGLIA.md`) say what a thing *does*. A form says what *shape* it is. Before this, Ego could only choose among the world's fixed shapes; the geometry challenge (`docs/CHALLENGES.md`) found that her language had function but no form. Now any shape is one small tree away, and she can invent shapes no one drew, grown by the loads they carry.

| File | What it is |
|---|---|
| `src/forms/form.ts` | The language: primitives, sections, operations; the signed distance field; bounds; parsing untrusted forms; a form said in words |
| `src/forms/mesh.ts` | A form made solid: its mesh, exact mass properties, overhangs, its solid as boxes for the physics world |
| `src/forms/make.ts` | What can make a form, in which materials, and why not |
| `src/forms/topopt.ts` | Shapes grown by their loads (topology optimisation), checked as the real part |
| `src/forms/say.ts` | Forms from words, and parts invented for a job said in words |

## The language

A form is a tree, its genome, stored as JSON on the part (`params.form`):

- **Primitives:** sphere, box (optionally rounded), cylinder, torus, capsule, cone.
- **Sections in a plane,** extruded or revolved:
  - circle, rectangle, ring, any polygon;
  - a NACA four-digit aerofoil;
  - a sampled density field (a grown shape).
- **Operations:**
  - union, intersection, subtraction;
  - smooth blend (as tissue flows into tissue);
  - shell to a wall, offset;
  - lattice;
  - move and rotate, scale, mirror, array.
- **Lattices:** the triply periodic minimal surfaces that printers fill parts with (gyroid, Schwarz P, diamond). A sheet of nominal wall *t* is at least *t* thick, because each surface's value is divided by the most it can change per unit length.

Each form is evaluated as a signed distance field: negative inside, its value never more than the distance to the surface. From that it gets:

- its bounds;
- its mesh;
- its mass;
- what can make it;
- a description in words (`describe`).

A form read from a file is untrusted. `parseForm` checks every node kind, every number's range, the depth (24), the node count (256) and the size before anything evaluates it, and the save codec runs it on every form part it decodes.

## Made solid

- **Mesh.** Surface nets on a sampled grid, evaluated finely only near the surface (far blocks are filled from their corners). The cell is small enough for about 48 cells along the longest side, 8 across the thinnest, and 2.5 across the thinnest wall, within a cap on cells; `resolved` says whether it got there.
- **Mass properties** are integrated exactly over the mesh by the divergence theorem (Eberly's polyhedral mass properties): volume, centroid, the inertia tensor, area. Test results:
  - A hand-built unit cube gives volume 1 and inertia 1/6 exactly.
  - A Ø100 mm sphere at 64 cells is within 0.11% in volume and 0.2% in inertia.
  - Every primitive converges on its exact volume as the grid is refined.
- **Overhangs:** for each of the six axes up, the share of the surface facing down within 45° of vertical (leaving out what rests on the bed). That says which way up to print with the least support.
- **Collision** in the physics world: inside cells merged greedily into boxes, so a ring keeps its hole. A lattice collides as the body it fills, since its sheets reach that body's faces.

## What can make it (rule R11)

Every form is read for the processes that could make it, in which materials, and why not:

| Process | Makes |
|---|---|
| saw | a standard section (bar, tube, flat) cut to length |
| weld | stock pieces joined |
| turn | a shape round about one axis |
| mill | profiles, faces and holes square to its sides; not lattices, not blends |
| print (CFF composite, metal FFF) | anything that fits the printer's 375 × 300 × 300 mm, with walls of at least 0.8 mm (two extrusion widths); with its best orientation and overhang share |

Ego places a form only if something can make it in its material. A gyroid in aluminium is refused: only printing makes a gyroid, and the printers here print nylon composite and steel.

## Grown by their loads

Bone lays material where it is stressed and removes it where it isn't (Wolff's law). Topology optimisation does the same by mathematics. Ego uses SIMP, after Bendsøe, Sigmund's 99-line and Andreassen et al.'s 88-line codes:

- four-node plane-stress elements;
- penalised densities;
- a density filter;
- optimality-criteria updates;
- a direct banded Cholesky solve.

Its solver is exact on a bar pulled evenly: stress P/A, stretch PL/EA. A cantilever grows a symmetric Michell-like truss, about four times stiffer for the same material.

The grown shape is then checked as the real part, in its material, under the real loads: its largest deflection and its von Mises stress against yield.

Its thickness is set for the safety factor wanted, in one step rather than by trial. In plane stress the stress goes exactly as one over the plate's thickness, and the grown topology doesn't depend on it. A plate thinner than about a fortieth of its span carries a caution to check for buckling sideways, which a plane model can't see.

*"Invent a bracket that holds 500 N at 120 mm from the wall"* grows a 120 × 60 mm plate:
- 60% of the material removed;
- 17 mm thick for a safety factor of 2.5 in printed carbon-filled nylon;
- deflects 1.2 mm;
- 58 g;
- can be milled from plate or printed flat with nothing overhanging;
- placed in front of you, where the physics world holds it on the floor.

## Ask her

- *"Make a 40 mm sphere"*, *"make a 100 x 50 x 20 mm block rounded 5 mm with a 10 mm hole"*, *"print a 60 mm cube filled with a gyroid lattice of 12 mm cells"*, *"make a naca 2412 wing 300 mm long with a 100 mm chord"*, *"make a 25 mm tube 2 mm wall 500 mm long"*.
- *"Invent a bracket that holds 500 N at 120 mm from the wall"*, *"a steel beam spanning 400 mm that carries 2 kN in the middle"*.
- *`form {"f":"torus","R":0.05,"r":0.01}`*: any form, as its genome.

## Not yet

- **Grown shapes are flat.** They are grown in a plane and extruded. Three-dimensional growth, a stress constraint and load cases beyond one are next.
- **Fixed sizes.** A form part is placed at its size; there is no stretch handle on it yet.
- **Speed.** Growing runs on the main thread (about 2 s for a bracket). It belongs in a worker.
- **Printed strength.** The printed material is taken as in-plane strong. The weaker layer-to-layer direction is a principle (`print-loads-in-plane`), not yet a number in the check.

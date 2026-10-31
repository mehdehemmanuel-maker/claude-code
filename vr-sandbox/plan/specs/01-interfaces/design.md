# Spec 01, interfaces: the design

How the requirements (`requirements.md`) are met, starting from what the code holds today, extending its owners.

## 1. What exists today (checked in the code, 2026-10-31)

| Piece | Where | What it does | What it lacks |
| --- | --- | --- | --- |
| `Port` | `src/nexus/kits.ts` | a mating face: a pattern of holes, threads or pins (or a bare frame) at `at`, facing `n`, laid along `u`; its thread, its ply `t`, a pilot, its standard | no negative of its own; holes are drawn by each maker; no fit class |
| `Iface` | `src/nexus/kits.ts` | what a part offers or asks (shaft, studs, drive, chain, mount), checked where parts meet (`make/critic.ts`, `contracts`) | no frame, no geometry, no negative |
| `Cut` | `src/nexus/kits.ts` | a round (or n-sided) hole: radius, depth, start, direction; cut in every view and taken from the mass | one cylinder only: no counterbore, countersink, cone, slot or pocket |
| `Keep` | `src/nexus/kits.ts` | a zone kept clear: a box or a swept sector, with why | no cylinder (a socket's reach) |
| `fit`, `mate`, `assemble` | `src/nexus/mate.ts` | two ports mate when one's pattern is the other's mirror; the second part is placed and cap screws (ISO 4762) laid | the holes must already exist; placement is one port at a time, no joint solving, no residuals |
| `boreOf`, `shaftOf`, `onto` | `src/nexus/mate.ts` | a part's bore and shaft found from its geometry; one slid onto the other, the fit said | no tolerance grade (ISO 286) |
| `boreThrough` | `src/nexus/mate.ts` | bores a host wherever a guest passes | its clearance is a fixed 0.5 mm, not a standard's |
| `rayOnto` | `src/nexus/mate.ts` | where a ray meets a thing's surface, and the normal there | (enough for placing on a surface) |
| thread tables | `src/nexus/threads.ts` | ISO 261 pitches; ISO 4762 heads; ISO 4032 nuts; ISO 7089 washers; ISO 7045, 7380, 4029 | tap drills; counterbores; countersinks |
| clearance holes | `src/nexus/kinds/motion.ts` (`CLEAR`) | ISO 273 medium, M2 to M20 | the fine and coarse columns; M24 |
| lengths | `src/nexus/catalogue.ts` | the lengths ISO 4762, 4017, 4029 and 8734 are sold in | (enough to choose a fastener's length) |
| exact solids | `src/nexus/brep.ts` | every piece made a B-rep, its holes cut by booleans, valid, measured; OpenCascade's shape history is exposed by the build | holes only as cylinders |
| placement | `src/nexus/placement/proximity.ts` | mates as measures held in ranges; one solver | no frame-to-frame joints, no freedom count |

## 2. The model

### 2.1 The interface record

One record, carried by any part (`Part.interfaces`), and read from the old forms where a part has none (R2):

```ts
interface Interface {
  id: string;                 // a stable path: "bolt M8x30/shank", "housing/bearing seat" (R3)
  kind: InterfaceKind;        // what it is (below)
  size: Record<string, number | string>;  // its sizes as its standard names them: { thread: 'M8', d: 0.008, l: 0.03 }
  std?: string;               // the standard it is made to: "ISO 4762", "ISO 15 6205", "NEMA ICS 16 size 17"
  fit?: string;               // the fit asked of its partner: "ISO 273 medium", "H7/h6", "insert"
  frame: { at: V3; n: V3; u: V3 };        // where, in the part's own frame; n points out of the part, into the partner
  pattern?: Pattern;          // one frame made many: { circle: { n, r, phase } } | { grid: { nx, ny, dx, dy } } | { at: [x, y][] }
  joint: JointKind;           // what meeting it makes: fixed, revolute (axis, range), slider, cylindrical, planar, ball
  mates: string[];            // the kinds that may meet it ("hole.clearance", "hole.tapped", "insert")
  shared?: string;            // the id of a shared quantity it reads (a joint's bolt circle) rather than owning (R15)
  source: Source;             // where its sizes came from
}
type InterfaceKind =
  | 'thread.external' | 'thread.internal' | 'hole.clearance' | 'hole.tapped' | 'hole.insert' | 'hole.pilot'
  | 'shaft' | 'bore' | 'pin' | 'key' | 'keyway' | 'face' | 'spigot' | 'pilot.bore' | 'cutout' | 'frame';
```

Kinds name what a feature *is*, never what thing it is on: a bolt's shank, a motor's shaft and an axle are all
`shaft` or `thread.external`. That is what makes it general (R18).

### 2.2 The negative

`negativeOf(it: Interface, host: { material: string; thickness?: number }): Negative | Refusal` (R4 to R6):

```ts
interface Negative {
  mirror: Interface;          // the interface the receiving part gains (a clearance hole, a bore, a keyway) (R9)
  tools: ToolBody[];          // in the interface's frame
  rules: Rule[];              // conditions on the host, checked before anything is cut (R8)
  why: string[];              // each size and where it came from
}
interface ToolBody {
  role: 'remove' | 'keep' | 'add' | 'contact';
  shape: Shape;               // a lathe profile for any round hole (below), a box, a prism for a slot or keyway
  why: string;                // "ISO 273 medium clearance for M8: 9.0 mm"
}
```

- **remove**: what is cut out. Every round negative is one **lathe profile** (a list of radius and depth spun about the
  axis): a counterbored clearance hole is `[(r_cb, 0), (r_cb, depth_cb), (r_hole, depth_cb), (r_hole, t)]` (its numbers from §2.3); a countersink is a cone step;
  a tapped hole is the tap drill to its depth with the drill's 118° point. `kits.ts` already has the `lathe` shape, so a
  hole of any section is one tool body, cut in one boolean.
- **keep**: room kept clear: the hex key's or socket's reach along the axis, the nut's turning circle; becomes a
  `Keep` on the host, checked by the rules we have (`make/rules.ts`, `placement/proximity.ts`).
- **add**: a condition, never grown: the wall the host must have round the hole, its edge distance; checked, and failed
  with a reason (R8).
- **contact**: the face that must bear (under a head, a bearing's shoulder); its area is checked against the load where
  one is given.

**Material decides the negative (R6).** The negative of `thread.external M4` meeting steel or aluminium is a tapped hole;
meeting a plastic it is a hole for a heat-set insert (the insert's maker's hole table), and the insert becomes a part;
meeting wood, a pilot hole. The host's material comes from `matter.ts`, its class (metal, polymer, wood, ceramic) from
there too. Each choice says why.

### 2.3 The sources (R5)

Every size in a negative comes from a table with its source, or a formula with its source, or is labelled typical:

| Value | Source | Have it? |
| --- | --- | --- |
| clearance hole, fine / medium / coarse | ISO 273 | medium (`kinds/motion.ts`); fine, coarse and M24 to add |
| tap drill | ISO 2306 (drills for tapping); or d − P, labelled derived | to add |
| counterbore for ISO 4762 heads | DIN 974-1 | to add |
| countersink for ISO 10642 heads | ISO 15065 | to add |
| thread engagement in a tapped hole | VDI 2230 gives it by material; else 1.0 d steel, 1.25 d cast iron, 2.0 d aluminium, labelled typical | to add |
| edge and spacing distances (bolted steel) | EN 1993-1-8, table 3.3 (as remembered: e₁, e₂ ≥ 1.2 d₀; p₁ ≥ 2.2 d₀; p₂ ≥ 2.4 d₀; to be checked against the standard before use) | to add |
| shaft and hole tolerances | ISO 286-1's formulas for the tolerance unit and grades, derived and said so (the standard's tables are not copied) | to add |
| heat-set insert holes | the insert maker's table, per maker | to add, one maker first |
| bearing shoulders | the bearing maker's catalogue (abutment diameters) | to add, one series first |
| fastener lengths, heads, nuts, washers | ISO 4762, 4017, 4032, 7089 (`threads.ts`, `catalogue.ts`) | have |

Where a standard's table cannot be copied (licences, `research/04-civil-names.md` §legal), its values are derived from
the standard's public formula and labelled derived, or taken from a source that may be quoted.

### 2.4 Imprint: pasting onto any surface (R7 to R11)

`imprint(host: Part, it: Interface | Part, where: { point: V3; face?: FaceQuery; turn?: number }): Imprinted | Refusal`

1. **Stand it on the surface.** `rayOnto` gives the surface point and its normal; the interface's `n` is set against
   the normal (pointing into the host), its `u` by a rule: the nearest straight edge, the host's own axis, or a pattern's
   centre; `turn` turns it about the normal.
2. **Make the negative** for the host's material (§2.2).
3. **Check before cutting** (R8), each check its rule and its numbers:
   - *wall*: from the hole's axis, rays across the hole at its top, middle and bottom find the host's outer surface;
     the least distance is held to the edge rule (§2.3) or the `add` wall;
   - *depth*: a ray along the axis finds the host's thickness there: a through hole needs the fastener's grip to cover
     it; a tapped hole needs the engagement and the drill's point inside it;
   - *spacing*: from every cut already in the host, the pitch rule;
   - *room*: the `keep` bodies against every other part (the rules we have);
   - *breaking in*: the `remove` bodies against the host's other cuts and hollows.
   A refusal names the check, the measured value, the rule's value and the rule's source: "wall 3.1 mm round the M8
   hole; EN 1993-1-8 asks e₂ ≥ 1.2 d₀ = 10.8 mm".
4. **Cut**: the `remove` bodies become cuts (as lathe solids in `brep.ts` and the views' `drill`); the `keep` bodies
   become the host's `Keep`; the host gains the mirrored interface (R9) and an imprint record:

```ts
interface Imprint { of: string /* the interface id, or the part's */; face: FaceQuery; at: V3; turn: number; negative: Negative }
type FaceQuery = { madeBy?: string /* the feature that made the face */; normal?: V3; extreme?: 'max' | 'min'; near?: V3 };
```

5. **Stay on the face (R10).** The imprint holds a *query* for its face, not a face number: the face made by a named
   feature (OpenCascade's history, exposed by our replicad build), else the face whose normal is `normal` and which
   lies farthest along it, else the face nearest `near`. When the host is rebuilt, the query finds the face again and
   the imprint is re-applied; if no face answers, the imprint is said to be lost, never moved silently.
6. **Copy and paste (R11)**: an interface is data; pasting it onto another part is `imprint` with the same interface,
   bound to the same shared quantity where it has one (§2.6).

### 2.5 Fasteners (R12)

`fastenerFor(stack: Imprint[], kind: 'through' | 'tapped' | 'insert')`: the thread from the interfaces; the grip from the
plies they pass (the depth checks measured them); the length the shortest the catalogue sells that covers the grip,
the washer, the nut and two pitches beyond it (labelled typical), or the engagement for a tapped hole; the head by the
interface's standard. `mate()` lays its fasteners through this, so every fastener it lays is chosen the same way.

### 2.6 Shared quantities and changes that follow (R14, R15)

In a node system a change that follows is a wire. A **pattern node** (a bolt circle: count, radius, phase, thread)
feeds the imprint nodes of both the flange and the cover, so they read one pattern, never two copies (R15). A
**relation node** holds a rule between sizes (`r ≥ bore / 2 + k · d`, k sourced or labelled typical) and gives the
smallest size that keeps it. Widening the bore re-runs, in the engine's own order: the relation → the pattern → the
negatives → the imprints → the solids touched → the placement → the checks; the run log already says what ran and why
(R14). Where rules depend on each other in a ring (the bore sets the bolt circle sets the flange's outside sets…), the
relation node solves them together by `numeric.ts` and says so.

Who owns a shared pattern (asked of the user, `QUESTIONS.md` U7): proposed, the **joint** between the two parts, as
Fusion and build123d have it, because neither part alone is its natural owner.

### 2.7 Placing by joints (R13)

A joint holds two interfaces and the kind of joint they make. Solving: each body's pose is unknown (six numbers); each
joint is a set of residuals (frames coincident, axes aligned, patterns turned onto each other); least squares over all
poses (`numeric.ts`), rigid clusters split out first. Each joint reports its residual (mm, degrees), whether a part is
flipped end for end (its `n` against its partner's), and the freedom left (the rank of the joint system's Jacobian, not
a count of joints). When joints fight, the fewest that fight are found by leaving each out in turn and named. This
extends `placement/proximity.ts`, still the one solver.

### 2.8 The AI (R16)

- `docs/FOR-AI.md` gains one rule: put parts together by `joint` and `imprint` nodes, never by typed positions where an
  interface exists.
- **Assertion nodes**: `assert` (a measured quantity, a target, a tolerance) over volume, mass, centre of mass, box,
  least wall, clearance, interference, joint residual. The agent's `build` and `change` replies lead with the
  assertions that fail.
- **A shadow board**: `change` builds into a copy; the open board is replaced only when the copy's checks pass; a failed
  copy stays readable (`read` can open it) without replacing the accepted one.

### 2.9 The person (R17)

In the 3D view: drag a part from the library onto a face; while held, its negative is drawn in place (remove in red,
keep in amber, contact in green, the frame's axes) with the checks' verdict beside it ("fits: wall 14 mm ≥ 10.8 mm");
release to cut it, Esc to cancel. A face's menu offers "copy its interface" and "paste an interface here". The same on a
phone through `view/pad.ts`'s controls.

## 3. Where the code goes (owners)

| Concern | Owner | Change |
| --- | --- | --- |
| The interface record, the negative, the sources' tables for negatives | `src/nexus/interfaces.ts` (new; a new concern: decision `../../decisions/0004-interfaces-owner.md`) | added, with a row in `CLAUDE.md` and `docs/OWNERS.md` |
| `Interface`, `ToolBody`, `Imprint`; `Cut` as a lathe solid; `Keep` as a cylinder | `src/nexus/kits.ts` | extended |
| imprint, face queries, fastener choice, `boreThrough` from the standard | `src/nexus/mate.ts` | extended |
| joints, residuals, freedom | `src/nexus/placement/proximity.ts` | extended |
| relation solving | `src/nexus/numeric.ts` | used |
| cuts as solids | `src/nexus/brep.ts`; the views' drill in `src/nexus/view/kit3d.ts` | extended |
| the nodes (`interfaces`, `negative`, `imprint`, `pattern`, `relation`, `joint`, `assert`) | `src/nexus/blocks.ts` | added |
| the AI's rule and the shadow board | `docs/FOR-AI.md`, `src/nexus/agent.ts` | extended |
| drag-to-imprint | `src/nexus/view/dock3d.ts`, `space.ts`, `pad.ts` | extended |
| starter boards ("Paste a bolt onto anything"; "The cover follows the bore") | `src/nexus/starters.ts` | added |

## 4. How we will know (the evaluation set, `evals/interfaces`)

Each case gives its inputs and the numbers expected, from the sources in §2.3, worked out by hand before the code:

| Case | Expected |
| --- | --- |
| an M8 socket cap screw through a 10 mm steel plate, medium fit | hole 9.0 mm (ISO 273); counterbore from DIN 974-1; a hex-key keep along the axis |
| an M6 screw into 6061 aluminium, plate 8 mm | tapped: drill from ISO 2306; engagement 2.0 d = 12 mm (typical) > 8 mm: **refused**, said why |
| an M4 screw into a PLA part | an insert's hole from its maker's table; the insert placed as a part |
| an M8 hole 4 mm from a plate's edge | **refused**: e₂ ≥ 1.2 d₀ (EN 1993-1-8) not met, by how much |
| two M8 holes 15 mm apart | **refused**: p ≥ 2.2 d₀ not met |
| a 6205 bearing into a housing and onto a shaft | the housing bore and the shaft each with its ISO 286 deviations (derived), shoulders from the maker |
| a NEMA 17 motor onto a 5 mm plate | four M3 clearance holes, the pilot's bore, from the NEMA face we have |
| two plates (10 and 6 mm) bolted, M8 | the bolt ISO 4017, its length the shortest sold covering grip, washer, nut and two pitches |
| a flange's bore widened 40 → 50 mm | the bolt circle, the bolts and the cover's holes follow; the run log says each step |
| a box made 10 mm taller after an imprint on its top | the imprint stays on the top face |
| a dowel 6 m6 into two plates | H7 holes (derived); a fixed joint |
| a key 8 × 7 in a 30 mm shaft and its hub | keyways from the key's standard |

Scored on placement as well as shape (BenchCAD 2.0's lesson). Later, licences permitting, the public assembly datasets
(AutoMate's Onshape mates, Fusion 360 Gallery's joints) as a larger set for the joint finder (`QUESTIONS.md` R4).

## 5. What could go wrong, and what then

- **Curved and thin hosts.** First version: a negative on a curved face is cut along the frame's normal at the point;
  where the face curves away under the head, the contact check fails and says so. Projection onto curved faces later.
- **Tables we may not copy.** Derive from public formulas and say so, or take the values from a source that may be
  quoted; never type a value from memory.
- **The solver on large assemblies.** Rigid clusters first; measure on the engine (1,512 solids) before trusting it.
- **Face naming when the topology changes a lot.** The query falls back step by step and says when it is lost; it never
  guesses.
- **Scope.** Bolts first (cases 1 to 5, 8, 9, 10), then the rest of R18. Each case is a task; nothing is built for one
  kind of thing.

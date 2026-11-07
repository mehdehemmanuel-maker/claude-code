# 0024. Turned blocks, bends and runs: a whole block turns rigidly, a bend is a solid of its own, a run lays itself

Date: 2026-11-05. State: accepted (the user, 2026-11-05: "Next in this direction: pipe bends and elbows, and parts that
can turn to any angle; right now round parts only stand upright").

## Context

The space where nothing can overlap (decision 0021, `src/nexus/room.ts`) held every solid upright: round solids and
lines along y only, no turned blocks. A pipe could not lie across, a plate could not tilt, and nothing could bend: the
user's plumbing, frames and brackets could not be made. Every test of the space (the inside test, the bounds, the reach
from a line, the sweep of a joint) read a solid as standing on y, and `through` and `over` worked on lines along y.

## Options

1. A rotation as an input to every operation (stack at an angle, through at an angle)
2. A Turn operation of its own: a whole block turned rigidly about its bound's middle, each solid then carrying its
   frame, and every test of the space reading that frame; a bend as a solid of its own (a torus segment); a run that
   lays straights and bends end to end from their lengths and angles alone
3. A general solid (a mesh or a B-rep) with a boolean overlap test at each operation

## Choice

The second. `turn(b, axis, degrees)` turns a block about x, y, z or any axis: a rigid turn of a valid block is valid,
so it cannot write an overlap, and no place is an input. Each prim carries `frame` (a 3×3 rotation; a quarter turn
written exactly, the identity none); the inside test reads a point in the solid's own frame; the bound of a turned
round solid is exact (|u_k| h/2 + r √(1 − u_k²)), of a turned box or bend the box round its own box turned (a superset);
the reach from a line is the farther axis end plus the radius, or the farthest corner (supersets). Lines carry a
direction; `through` and `over` along a turned line are done in that line's own frame (the host turned so the line runs
along +y, the operation done, all turned back). A turned or bent passer or sleeve, a bolted joint on a turned hole and a
block with a moving joint are refused, each in one sentence (not made yet). Rooms are kept under a turn about y and
closed under any other.

A bend (`made(..., { bend: [R, ro, deg, ri] })`, the prim `bend`) is a torus segment: its middle line from (R, 0, 0)
heading +y round z through its angle (at most 180°), its inside test exact, drawn as the torus shape's new `arc`.
`run(name, segs)` lays straights and bends, each from where the last ended in the last one's frame (which turns with
it); a straight may carry sleeves round it (an elbow's sockets). Each segment lies between its start's plane and its
end's, so two that follow one another meet only on their shared plane; two that do not are compared by their bounds
(comparison (3)) and refused where they meet. A bend radius not above the tube's outside radius is refused. In
`common.ts`: socket elbows for the EN 1057 copper sizes after EN 1254-1, 90° and 45° (their sizes typical, labelled so),
a bent length of pipe (its bend radius 3.5 × its outside diameter, an estimate), and a pipe run of straights, bends and
elbows (`pipeRun`, `pathOf` for its steps written out). Nodes: Turn (`room.turn`), Pipe elbow (`piece.elbow`), Bent pipe
(`piece.bend`), Run of pipe (`piece.run`); a starter board, "Pipes that turn". The tee was cut for time, and came the
same day with one operation more: `branch(host, port, b, toward)` joins a block that starts with a hollow straight (a
run) square into the side of a straight the host offers, at its middle, its start on that straight's axis; the straight's
wall is opened by the branch's bore (a rod of that radius from the axis out, taken out of it) and the branch's first
straight has the straight's outside taken out of it, so (B − S) ∩ (A − H) ⊆ (B − S) ∩ S = ∅; refused where the branch is
as wide as half the straight or more, its first straight does not reach past the straight's outside, or any other pair's
bounds meet. With it, in `common.ts`: an equal tee (`piece.tee`), and, made upright and turned, a DIP IC (`piece.dip`),
a DC barrel jack and its plug (`piece.jack`, `piece.plug`), holes in an L bracket's upright bolted to a wall plate, and a
hinge's leaves with their screw holes; a starter board, "Turned pieces".

## The assumption it rests on

That supersets are enough: a turned box's bound and a bend's are larger than the solid, so `stack`, `onto` and the run's
check leave more room than they need, never less; and that what a person makes with turned parts is mostly turned whole
(a plate tilted, a pipe laid across, a run of pipe) rather than put together piece by piece at angles, where the boxes'
slack would show as gaps.

## When to test it again

When a build needs pieces put together at an angle to each other inside one block (a bracket's leaf at 30° bolted to its
base, a joint on a turned piece), or when the slack of the supersets shows as a gap a person sees: then the operations
need faces at an angle (a stack along a turned axis, joints in a frame), not only a turn of the whole.

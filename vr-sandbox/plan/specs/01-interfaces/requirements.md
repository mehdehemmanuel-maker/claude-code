# Spec 01, interfaces: what it shall do

Each line: an id, the requirement in EARS form ("WHEN … THE SYSTEM SHALL …"), and the user's words it serves
(`../../../docs/WANTED.md`). A requirement is met when the task that holds its check passes (`tasks.json`).

The user's words (2026-10-31): "we need advanced topology that don't just apply specifically to a thing we can have
geometry mating or inverting for example if you make a bolt you can past it's input geometry into a surface of anything
easily like we need very advanced smart stuff". And earlier (2026-10-08, in `../../../CLAUDE.md`): "mating parts, a bolt
pattern finding its reverse and connecting"; "no manual work, no guessing"; "parts say what they need".

## What a part carries

- **R1.** THE SYSTEM SHALL let any part carry interfaces: where it meets another part (a frame, a pattern), what may meet
  it, the joint that meeting makes, and what it demands of the part it meets. *(general, "don't just apply specifically
  to a thing")*
- **R2.** WHEN a part already has ports, interfaces in the old form (shaft, studs, drive, chain, mount), a bore or a
  shaft, THE SYSTEM SHALL read them as interfaces without the part being changed, so every part made today has
  interfaces from the first day.
- **R3.** THE SYSTEM SHALL name every interface by a stable path (`bolt M8x30/shank`), never by an index or an order.

## The negative ("inverting")

- **R4.** WHEN asked for an interface's negative, THE SYSTEM SHALL give the mirrored interface (a bolt's shank → a
  clearance hole; a shaft → a bore; studs → holes) and its tool bodies: what to remove, what to keep clear, what wall
  to leave, and which face must bear. *("inverting")*
- **R5.** THE SYSTEM SHALL work out every size in a negative from the interface's standard and its fit (clearance class,
  tap drill, counterbore, countersink, tolerance grade), each value carrying its source, or labelled typical or derived.
  *("no guessing")*
- **R6.** WHEN the part that receives the negative is of a material a thread cannot be cut into well (a plastic, a soft
  wood), THE SYSTEM SHALL give the negative such a material takes (a hole for a heat-set insert, a pilot hole for a
  wood screw), and say why. *("smart")*

## Pasting onto anything ("imprint")

- **R7.** WHEN a part (or one of its interfaces) is put onto a point of any surface of any thing, THE SYSTEM SHALL stand
  the interface on that surface (its frame square to the surface there), and cut its negative into that thing.
  *("past it's input geometry into a surface of anything easily")*
- **R8.** BEFORE cutting, THE SYSTEM SHALL check that the thing can take it: wall enough round it, depth enough for it,
  far enough from edges and from other holes, its keep-clear room free; and WHEN it cannot, THE SYSTEM SHALL cut
  nothing and say which check failed, by how much, and by what rule.
- **R9.** WHEN a negative is cut, THE SYSTEM SHALL give the thing the mirrored interface too, so the hole can find its
  bolt as the bolt found its hole. *("a bolt pattern finding its reverse and connecting")*
- **R10.** WHEN the thing a negative was cut into is changed (made bigger, thicker, re-shaped), THE SYSTEM SHALL keep
  the negative on the same face it was put on, found by what that face is, not by its number.
- **R11.** THE SYSTEM SHALL let an interface be copied from one part and pasted onto another (a flange's bolt circle onto
  a cover).

## Fasteners and mating

- **R12.** WHEN two parts meet through interfaces that take a fastener, THE SYSTEM SHALL choose the fastener from the
  catalogue (its length from the stack it passes, with its washer and nut where they are needed) and say why that one.
- **R13.** WHEN parts are put together by their interfaces, THE SYSTEM SHALL place them by solving their joints
  together, and say for each joint how far off it is (distance, angle), whether a part is flipped, how much freedom is
  left, and which joints fight when they cannot all hold.

## Changes that follow

- **R14.** WHEN a size that others depend on is changed (a bore widened), THE SYSTEM SHALL carry the change to everything
  that depends on it (the bolt circle, the bolts, the cover's holes), in order, and say what changed at each step.
  *("no manual work")*
- **R15.** THE SYSTEM SHALL keep a shared pattern (a bolt circle two parts share) in one place both read, never in two
  copies that can disagree.

## The AI and the person

- **R16.** WHEN the AI in the app puts parts together, THE SYSTEM SHALL have it place them by their interfaces and check
  each joint's residual and the numbers (volume, mass, clearance, interference) before it answers.
- **R17.** WHEN a person drags a part onto a surface in the 3D view, THE SYSTEM SHALL show its negative before it is cut
  (what is removed, what is kept clear, whether it fits) and cut it only when the person accepts.

## Generality (the proof it is not about bolts)

- **R18.** THE SYSTEM SHALL do all of the above, by the same model and no code written for one kind of thing, for at
  least: a bolt through plates; a screw into a tapped hole; a screw into a plastic part (an insert); a ball bearing into
  a housing and onto a shaft; a NEMA motor onto a plate; a dowel pin; a key and its keyways; a pipe thread; a panel
  connector's cut-out.

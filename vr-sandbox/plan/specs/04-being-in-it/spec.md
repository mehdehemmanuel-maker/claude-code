# Spec 04, being in it: physics, ghost, scale, time, sight

The user's words (2026-10-31): "2(but variants I can choose weather I'm ghost mode or whatever also I can change my
perception change time Change my sight or whatever that would be good". Earlier: "make it so user can be in the
environment … buttons or like mobile controls or computer control".

## Starts from (checked 2026-10-31)

Button, Stick and Slider nodes (`controls.ts`) worked by keys, a gamepad, drawn controls and buttons on things; walking
at eye height (`view/pad.ts`), placed, not physical (the cart passes through crates; the walker through walls). Jolt
physics (`sim.ts`) steps at a fixed 1/240 s and records a track. The views draw fields, bending, cutaways and explodes.

## Requirements

- **P-R1.** WHEN a stick drives a thing, THE SYSTEM SHALL drive it through the physics (its wheels' friction, its motor's
  torque from its curve, its mass), so it collides and is stopped.
- **P-R2.** WHEN walking, THE SYSTEM SHALL give the walker a body: gravity, walls, stairs; doors open by the agents' door
  logic.
- **P-R3.** THE SYSTEM SHALL let the person choose how they are in it: walk, ghost (no collisions, flight, teleport by
  default), scale (ant to giant), time (slow, fast, pause, rewind), sight (normal, x-ray, edges, heat, stress, night,
  cut, exploded); from keys, the drawn controls and a headset's menu.
- **P-R4.** WHEN the scale changes, THE SYSTEM SHALL scale the world about the person's feet, with speed and the near
  plane, eased, and show the scale ("1:50") and a thing of known size.
- **P-R5.** WHEN time is rewound, THE SYSTEM SHALL restore the physics to the state it had, and the person's own head and
  hands SHALL stay on real time.
- **P-R6.** WHEN a sight shows a value by colour, THE SYSTEM SHALL show its legend, its range and its unit, and a look
  that is only a look (a "thermal" palette) SHALL be said to be one.
- **P-R7.** WHEN a motion is asked of a machine or body, THE SYSTEM SHALL show the motion its parts can make beside it,
  the timeline coloured by where it fails (a motor saturates, the centre of mass leaves its feet), and take it only when
  chosen.
- **P-R8.** THE SYSTEM SHALL keep moving comfortable in a headset: constant speeds, snap turns, the view's edges darkened
  while moving.

## Design

- **Physics live**: a Jolt world kept running beside the board (`sim.ts` gains a live mode); controls write forces and
  motor targets; the board reads poses back each frame. Saved states every half second in a ring (Jolt's state
  recorder) for rewind; replay is the same fixed steps.
- **Perception ring** (`view/pad.ts`): the modes as one state `{ move: walk | ghost, scale, timeScale, sight }`; one
  hue per mode (the same as Moosky's); the headset's menu on the wrist.
- **Sights**: one effect pass per mode (x-ray by rim-lit transparency; edges by `EdgesGeometry`; heat and stress by a
  value per piece through a colour map, viridis for truth; night; section planes with capping; explode by the explode
  we have).
- **The corrector**: Cascadeur's ghost: the asked motion and the feasible one drawn together; the feasibility band.

**Owners**: `sim.ts`, `controls.ts`, `view/pad.ts`, `view/space3d.ts`, `view/dock3d.ts`, `view/space.ts`, `motion.ts`.

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| P1 | Live physics with controls (the cart a body with wheels) | the cart pushes a crate and stops at the tower; numbers logged | 01 (crates as parts with interfaces optional) |
| P2 | The walker's body | walks up stairs, stopped by a wall, opens a door | P1 |
| P3 | Ghost, with teleport and smooth flight | passes through the tower; teleport by pointing | P2 |
| P4 | Scale, ant to giant | at 1:100, walking a bolt's thread; the readout and the reference shown | P2 |
| P5 | Time: slow, fast, pause, rewind | rewind 10 s and the crates stand again, poses equal to the saved ones within 1 mm | P1 |
| P6 | Sights, each with its legend | a screenshot of each on the engine; the blind check names each | — |
| P7 | The corrector's ghost and band | an arm asked past its motor's torque shows where it saturates | P1 |
| P8 | Comfort in a headset | on a Quest (after spec 03): snap turn, vignette, constant speed | spec 03 |

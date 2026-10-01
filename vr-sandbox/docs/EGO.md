# Ego: the mind of this world

Ego (short for evolution) was first called Ada. She grows as you build together.

Ego needs no outside AI service and no API key. The workshop is a simulation she can read completely: every part,
material, joint, load, failure and physical law in it. So the hard part of an assistant, knowing what is going on
and what would work, is exact here. A camera would only show her less than she already knows.

## How she works

```
   senses                  thinks                          acts                      learns
   ──────                  ──────                          ────                      ──────
   the build document  →   connector capacities        →   Forge statements      →   the habit graph
   live joint loads        the join planner                (same commands as         (what follows what,
   physics events          the fix search                   your tools: undoable)     on this headset)
   what you hold/select    the physics' own numbers        one-tap fixes
```

- **Senses** (`src/assistant/ego.ts`). She reads the document (parts, joints, materials) and the live load on every
  joint as a share of its capacity. She hears every physics event (breaks, slips, fractures) and knows what you hold
  and what you've selected.
- **Thinks** (`src/assistant/fixes.ts`, `src/connectors/plan.ts`). When a joint breaks or passes 85 % of its
  capacity, she searches for changes that carry 1.5× the load. She tries more of the same first (more screws, a
  bigger bolt, a longer weld leg), then other processes. She judges each with the connector's own capacity formulas,
  the numbers the physics runs on, so her advice is never a guess.
- **Acts** (`src/forge/`). She speaks **Forge**, the build language, and her actions go through the same code paths
  as your tools. So they undo, obey the same physics, and use Best join.
- **Learns** (`src/assistant/habits.ts`). Every build action becomes a token (`place:lumber`, `join:auto`). The
  habit graph counts what follows what, one and two steps back. It suggests your likely next tool on her page and
  gets better the more you build. It lives only on this headset.

## Forge, the build language

One line is one thing a builder does, in a builder's words and units:

```
place lumber size=2x4 length=1.2m mat douglas-fir at 0 0.9 0 as rail
place block x=10cm y=10cm z=10cm at 0 0.05 0 as post
join rail post                     # Best join: the real process for the materials, sized to them
join post floor with bolted
set rail length=1.5m mat oak
repeat 4 { place lumber size=2x2 length=0.7m at (i*0.4) 0.35 -1 rot z 90 as leg }   # leg0..leg3
play · build · undo · redo · save · new · switch on · gravity moon
```

- **Units:** mm, cm, m; g, kg; N, kN; %, deg. Arithmetic uses `i`, the repeat counter, with no `eval`.
- **Words:** builders' words resolve to the catalog (`pipe` → round tube, `oak` → red oak). Anything unknown gets
  a helpful error.
- **Limits:** a script stops after 2000 steps or 400 parts, so a loop can't run away with the headset.
- **Transcript:** every build action is recorded as Forge. "Copy for Claude" puts that transcript, plus the build's
  share code, on the clipboard, so Claude (or anyone) sees exactly what you built.

## Designing

Ask for a thing, not a part: "build a table that holds 60 kg", "design an oak desk 90 cm tall", "make a shelf with 5
shelves out of steel", "build a brick wall 2 m long", "a bench that holds 300 lbs". She works it out the way an
engineer would (`src/assistant/designer.ts`):

- **Stock from standard sizes.** Sheets come in standard thicknesses, legs in 2x2 / 2x4 / 4x4 lumber or square tube,
  bricks in the UK standard 215 × 102.5 × 65 mm.
- **Every member checked against its load, at 3× margin.** A top or shelf has to carry its load without breaking and
  sag less than span / 300. A leg has to carry its share without crushing or buckling (as a cantilever, K = 2).
- **Built for real.** The design is Forge, run through the same commands as your tools, in front of you. The joints
  are Best join, sized to the stock. Bricks are bedded in masonry mortar, in running bond. Then physics decides: if a
  design can't stand, it falls. Her notes say what she chose and why, and she warns of any joint near its limit.

## What comes next

The bar is a Jarvis-grade partner who can see, reason, act and build in the world. Each phase stands on the one
before and is tested the same way (contracts, not screenshots).

## How she grows

She starts able only to see and explain. Everything you do together earns experience, and each level unlocks an
ability she really gains. The code for it runs only once she has it (`src/assistant/growth.ts`):

| Level | Experience | Ability | What it means |
|---|---|---|---|
| 1 | 0 | Sight | She sees every part, joint and load, and explains failures with the numbers |
| 2 | 25 | Habits | She learns what you do next and suggests it |
| 3 | 70 | Skills | When you repeat something (parts placed and joined), she offers to learn it. A learned skill builds the same thing wherever you are |
| 4 | 150 | Foresight | Before Play, she traces every joint's load path to the ground and names the joints that will fail, with fixes |
| 5 | 280 | Initiative | As you make a joint, she checks it will hold, and says so at once |
| 6 | 450 | Memory | She remembers the joints you choose for each pair of materials, and Best join tries yours first (it must still hold) |

Her light at your shoulder grows larger and brighter with each level. What she has grown carries across sessions on
the headset.

## The watchdog

The watchdog checks physical invariants on every tick (`src/diagnostics/watchdog.ts`). Ego acts on what it finds
without being asked, since each finding is something no real world does, a flaw in this one's physics, not in your
build:

| Finding | What she does |
|---|---|
| A part fell out of the world or went through a wall | Puts it back on the floor where it went through (or where you built it, if it has left the room) |
| A pose or speed stopped being a number | Puts the part back where you built it |
| A part flung faster than anything could throw it | Stops it where it is |
| A part shaking in place | Settles it |
| The world running slow (a frame over budget, or one subsystem taking over 50 ms at once) | Names what took the time (her own foresight, the physics and which part of it, the tablet...) and writes it up |
| A save the browser didn't keep, or storage over 70% full | Says why, plainly, and writes it up; "it won't save" makes her save again and say how it went |

She tells you what she did and writes each one up for Claude with the build as it was (at most five a session: past
that, one flaw is already written up many times over). If you complain about it afterwards, she tells you she
already put it right.

## Showing her

Tap 👁 at the end of the tablet's tabs, point at something and pull the trigger, or just say "Ego, look at this".
Her light flies over to it. She says what she sees there, from the world's own state: what it is and what it's made
of, its mass, whether it's still or moving and how fast, what holds it and how hard each joint is working, how warm
it is, and anything the watchdog saw on it. She keeps watching it for five seconds. Then tell her what's wrong, with
a tap (shaking, went through, flew off, came apart, not realistic, laggy, won't save) or in your own words. The
report carries what she saw and what it did while she watched.

## Complaints and reports

Tell her what's wrong in your own words while you play: "it's shaking", "the crate fell through the floor", "that
exploded", "so laggy", "that wouldn't happen in real life".

- **She looks.** She records the watchdog's findings from the last ten seconds, recent failures, what you were
  holding, the frame rate and the size of the build.
- **She fixes what she can.**
  - Something that fell through the floor goes back on it.
  - A part that's shaking is settled.
  - A build that flew apart goes back to the build, or to your last checkpoint.
  - A broken joint gets the fix that holds.
  - A slow scene loses its shadows and particles.
  - A stuck grab is let go.
- **She writes it up for Claude.** The report holds your words, what she saw, what she did, the version, and the
  build as it was at that moment (its share code).
- **Sending.** 📨 Reports on her page, or the launch page when you leave VR, opens it as a GitHub issue on the
  repository. Claude reads those issues and fixes the rest.

**Phase 1: the mind (done).**
- Forge.
- Senses, advice and one-tap fixes.
- The habit graph.
- Her page on the tablet.
- Her light at your shoulder.

**Phase 2: her hands.**
- **Programmable robot arm part:** a servo chain with real torque limits, a gripper with real grip force, and
  inverse kinematics, driven by Forge (`arm a1 reach rail`, `grip close`).
- **Ego's body:** a small drone or arm rig that physically carries out her fixes. She moves the part, holds it and
  fastens it, with every force obeying the same physics as yours. When she can't lift something, she says so.
- **Learned macros:** a sequence you repeat becomes one tap, generalised by the habit graph.

**Phase 3: her workshop.**
- **3D printer:** prints Forge-described parts layer by layer at real FDM speeds, in real filament (PLA, PETG, ABS)
  with printed-part strength by infill and layer direction.
- **CNC and saw:** cutting stock to length with real kerf and offcuts.
- **Open-source designs:** browse public GitHub repositories (their API allows browser access) for Forge scripts and
  designs, preview them on the tablet, and build them.

**Phase 4: her language.**
- **An on-device language model:** a small open model run locally through WebGPU, downloaded once and never calling
  out. It turns free speech or text into Forge ("make me a bench that holds 100 kg"). Ego then checks the Forge
  against the physics before building. The model proposes; the engineering decides.
- **Voice**, where the Quest browser offers speech recognition. Otherwise, the tablet keyboard.

**Always:**
- Nothing Ego does breaks the house rule: it must work the way it would in real life.
- Her advice cites the numbers.
- Everything she does can be undone.

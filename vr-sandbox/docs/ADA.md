# Ada: the assistant who lives in the workshop

Ada needs no outside AI service and no API key. The workshop is a simulation she can read completely: every part,
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

- **Senses** (`src/assistant/ada.ts`). She reads the document (parts, joints, materials) and the live load on every
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

## What comes next

The bar is a Jarvis-grade partner who can see, reason, act and build in the world. Each phase stands on the one
before and is tested the same way (contracts, not screenshots).

**Phase 1: the mind (done).**
- Forge.
- Senses, advice and one-tap fixes.
- The habit graph.
- Her page on the tablet.
- Her light at your shoulder.

**Phase 2: her hands.**
- **Programmable robot arm part:** a servo chain with real torque limits, a gripper with real grip force, and
  inverse kinematics, driven by Forge (`arm a1 reach rail`, `grip close`).
- **Ada's body:** a small drone or arm rig that physically carries out her fixes. She moves the part, holds it and
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
  out. It turns free speech or text into Forge ("make me a bench that holds 100 kg"). Ada then checks the Forge
  against the physics before building. The model proposes; the engineering decides.
- **Voice**, where the Quest browser offers speech recognition. Otherwise, the tablet keyboard.

**Always:**
- Nothing Ada does breaks the house rule: it must work the way it would in real life.
- Her advice cites the numbers.
- Everything she does can be undone.

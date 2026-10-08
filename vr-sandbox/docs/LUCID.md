# Lucid: do whatever you want, whenever, by real physics

The aim: a room in VR where anything said is made, anyone asked for is there, and what happens in it happens by the
laws the rest of Nexus is built on. Every part of it is a pipeline you can open on the board, see run and change.

What is true now is marked **works**; what is half there, **partial**; what is not yet, **next**.

## 1. Saying it: one directive, carried out in one place

- **works**: whatever you say is read into one directive: make it, bring people in, set them fighting, take it away, or
  pass it on as talk (src/nexus/directive.ts). Where Claude can be asked (the forge in claude.ai), one call reads it,
  asks only what it must, and folds your answer in; elsewhere the same directive is read here by rule. "generate a car",
  "spawn a kettle", "I want a house", "remove it", "get rid of the chair", "undo", "throw it away" all work.
- **works**: a make goes to the intent pipeline when it can read what the thing must do into it, else to the inventory's
  own (a drill: the cordless drill, every part down to its materials).
- **next**: things the pipeline cannot yet read into wants (a guitar, a sword, a dog): Claude, where it can be asked,
  writes them as an ask the pipeline can make (an ask as data, src/nexus/spec.ts); here, more kinds of want.
- **next**: every directive a node on a board, so what was said, what it was read as and what was done can be seen and
  changed (the pipeline engine already runs boards of IF and THEN).

## 2. People: anatomical, physical and behavioural models

- **works (anatomical)**: a body grown from a genome, male or female, every organ, tissue and cell down to molecules;
  its proportions from measured anthropometry; hair, skin and eyes from its genes (src/nexus/life, src/nexus/anatomy.ts).
- **works (physical, not yet in the room)**: sixteen rigid segments with de Leva's (1996) masses for its sex, fifteen
  joints moving only through the AAOS ranges, each turned by a motor that is its muscles (stiff enough for what the
  joint carries, never more torque than the muscles give). It stands on its joints alone, falls when slack, a fighter
  holds its guard, and a jab and a cross reach 7 and 9 m/s (src/nexus/life/segments.ts, src/nexus/person.ts).
- **works (behavioural, as facts)**: what a body senses (reach to its target, how hard its head was jolted in g, down,
  balance, stamina) is read out as facts a rules board reads.
- **next**: people in the room: their skin drawn on the moving segments, "spawn a fighter", "spawn 5 random people",
  "set her height to 1.70", male or female, adjusted by slider; each one's rules a board (IF kai_open THEN attack, IF
  kai_hurt > 15 THEN cover) that runs while they do and that you can edit.
- **next**: stepping: a body that steps to catch itself (a capture step), walks and moves its feet in a fight; getting
  up by its own muscles.

## 3. Simulators that make you better at what you do

Each is a place in the room with its own physics, a coach that measures you, and drills that get harder as you do.

- **Fighting** (next): a sparring partner by the physics above. Your controllers are your fists: your punch speed, its
  reach, your guard height and your reaction time measured every round against what fighters are measured at (a jab
  6–9 m/s, a cross 8–11); its rules board sets how it comes at you, from pads held still to a southpaw who counters.
- **Money** (next): a business and money simulator: a budget, a shop or a trade run by its numbers (prices, costs,
  demand, interest compounding), its decisions yours, what they come to shown month by month; drills in pricing,
  saving and reading a balance sheet.
- **Cooking** (next): a kitchen by the heat laws already here: how long a steak takes to reach 57 °C at its middle by
  conduction (its thickness squared over its diffusivity), when the outside browns (the Maillard reaction above about
  140 °C), food safe by its core temperature; you cook in VR and it tells you what the heat did.
- **Boating** (next): water by the laws already here (buoyancy, drag on the wetted area, waves on the beach place): a
  boat that floats by its displacement, a sail and a motor that push it, wind and current that push back; drills in
  steering, docking and man-overboard.
- **Your relationship** (next): conversation practice and planning (listening, saying what you need, planning time
  together); not sexual simulation.

## 4. The world

- **works**: places (a beach, terrain, sea, sky, sun), weather, flying and walking, a warehouse with robots, a workshop.
- **next**: summon a place by saying it ("a boxing gym", "a lake at dawn"), the room's physics shared by everything in it
  (people, builds, boats), and anything made kept to come back to.

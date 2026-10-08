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
- **works**: "surprise me" (or "make something random", "you pick", the 🎲 chip, or a board's `surprise` step): Claude
  picks where it can be asked, and its pick is used only if it reads as something the forge can do; elsewhere it is
  picked here from 22 kinds of design the pipeline is tested to read (a bridge over so far, a raft that floats so much,
  a cabin for so cold a winter), the inventory's real products, people or a fight. It goes ahead on what I would take
  for anything not said (src/nexus/surprise.ts).
- **next**: things the pipeline cannot yet read into wants (a guitar, a sword, a dog): Claude, where it can be asked,
  writes them as an ask the pipeline can make (an ask as data, src/nexus/spec.ts); here, more kinds of want.
- **next**: every directive a node on a board, so what was said, what it was read as and what was done can be seen and
  changed (the pipeline engine already runs boards of IF and THEN).

## 2. People: anatomical, physical and behavioural models

- **works (anatomical)**: a body grown from a genome, male or female, every organ, tissue and cell down to molecules;
  its proportions from measured anthropometry; hair, skin and eyes from its genes (src/nexus/life, src/nexus/anatomy.ts).
- **works (physical)**: sixteen rigid segments with de Leva's (1996) masses for its sex, fifteen
  joints moving only through the AAOS ranges, each turned by a motor that is its muscles (stiff enough for what the
  joint carries, never more torque than the muscles give). It stands on its joints alone, falls when slack, a fighter
  holds its guard, and a jab and a cross reach 7 and 9 m/s (src/nexus/life/segments.ts, src/nexus/person.ts).
- **works (behavioural, as facts)**: what a body senses (reach to its target, how hard its head was jolted in g, down,
  balance, stamina) is read out as facts a rules board reads.
- **works**: people in the room: "spawn a man", "spawn a fighter", "generate 5 random people", male or female, each
  one's skin drawn on its moving segments (each arm its own surface, so lifting it does not pull the chest with it);
  they stand clear of the pedestal, which they meet as a solid. Each one's rules are a board (IF kai_open THEN attack,
  IF kai_hurt > 15 THEN cover) that runs while they do and that you can edit; "fight" sets two on each other.
- **works (the grappling sandbox)**: grab anyone with either grip (or the mouse): the segment nearest your hand is held
  to it by a soft spring, so its joints and weight answer your pull. "Kai on his back", "Kai face down" lay it down
  soft (a quarter of its strength); "Kai stronger", "Kai weaker", "Kai strength 150%"; "Kai height 1.9", "Kai mass
  70", "make Kai taller / heavier / more muscular / leaner / a woman / bald / blond" rebuild it in place; "get up"
  sets it back on its feet.
- **next**: a slider panel for every body setting, and positions by name (mount, side control, guard).
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

- **works (places, src/nexus/places.ts)**: say where you want to be and you are there:
  - outdoors: a beach, the surface of Mars, the Moon, a canyon rim (flying on), a snowfield, a desert, a forest, a garden, under the sea, space, a volcano, the late Cretaceous, the mountains;
  - rooms: a cabin (fire, snow at the window), a bar (a WPA 9-foot pool table, racked, and a WDF dartboard at 1.73 m with its throw line at 2.37 m), a haunted mansion (a torch in your hand), a stadium stage.
  - Change it as you stand in it: the time ("sunset", "night"), the weather ("make it rain", a blizzard, "raindrops of gummy bears", each falling at its own terminal speed), gravity ("turn gravity off", the Moon's 1.62, Mars's 3.71 m/s², which the people feel too), your size ("shrink me to an ant", 340 times smaller).
  - The sea's waves go by ω² = g k. What was asked and is not there yet (dinosaurs, whales, a crowd) is said.
- **works (kits, src/nexus/kits.ts)**: makers of things whose kinds multiply. Each is a tree of parts you can take apart level by level ("take it apart") and ask "what is the tyre made of" down to its elements:
  - things: trees (trunk thickness by D ∝ H^1.5, palms excepted), plants, houses, cars (real dimensions by body type, tyres by their size code), roads (FHWA lanes), lamp posts (lumens by lamp), beds (named mattress sizes), swords, prop blasters, a light sword prop, sandwiches (USDA energy), toy bricks (LEGO's brick dimensions, a house-sized heap counted in millions), a solar system (NASA sizes, Kepler years), a galaxy (logarithmic arms, a flat rotation curve), terrain, a treehouse;
  - scenes that are kits of kits: a street, a village, a park, a forest, a car park, a flower garden, a sword rack.
  - Every choice multiplies: 23 kits make about 10^384 different things, counted exactly ("how many things can you make").
  - Masses come from shapes and densities, with what is hollow counted as hollow. They are checked against real ones: a car 1.1–1.4 t, a tyre about 10 kg, a brick house about 90 t.
- **works (edges, src/nexus/finish.ts)**: no edge is perfectly sharp; each is rounded as its material is made:
  - machined edges broken by 0.5 mm, moulded plastic rounded by its wall, castings filleted, wood eased by 2 mm, concrete chamfered by 20 mm, glass arrissed, pressed car panels as round as they are styled.
  - It applies to the forge's own builds too. The rules are a board ("edges") whose steps can be changed and run.
- **works (the bar's games, src/nexus/games.ts)**:
  - **pool** by its own physics:
    - balls of 57.15 mm and 170 g, bouncing off each other at 0.93 and off the cushions at 0.8;
    - a struck ball slides (friction 0.2) until it rolls at 5/7 of its speed, then the cloth's rolling resistance (0.01) stops it;
    - pockets with WPA mouths.
    - Say "break", "shoot at the 3", "rack"; in a headset, strike the cue ball with your hand.
  - **darts**:
    - flown from the throw line under gravity and scored by the WDF board's rings;
    - a casual hand's spread: median miss 4.4 cm, about one in eleven off the board when aimed at treble 20.
    - Say "throw 3 darts at treble 20"; in a headset, hold the trigger at the line and let go to throw with your hand's own speed.
  - Spin (follow, draw, side) is not modelled yet.
- **works**: a warehouse with robots, a workshop, flying and walking.
- **next**: the people in a place standing on its ground everywhere (it is flat for 12 m round you), spin on the pool balls,
  a go-kart track, creatures (a dog that follows you, a dragon, penguins, whales), old cities, games (ping pong), music.

## 5. Tested blind

A fresh AI with no context wrote 25 things it would say to the app (a beach at sunset, a puppy, the Grand Canyon by air,
a lightsaber, gummy-bear rain, Mars, ping pong with a robot, a dragon, a cabin in a snowstorm, an orchestra, Rome, a
sandwich…). First run: 0 of 25 did what was asked. After places: 13 of 25. After kits: 14 done, 5 partly (the Cretaceous
without dinosaurs, the aquarium without whales, the snowfield without penguins, the beach without a surfboard, and "a car
that turns into a boat" made as a car only), 6 not at all (a puppy, a dragon, ping pong, an orchestra, Rome, a roller
coaster).

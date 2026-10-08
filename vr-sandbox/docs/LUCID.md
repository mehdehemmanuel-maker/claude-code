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

## 2b. How living things make more of themselves (src/nexus/life/reproduce.ts)

- **works**: "how do ants reproduce", "the life cycle of a pig", "how does mycelium reproduce", "how are babies made":
  - the species' way stands round you as its life cycle, each stage on a stand at a stated magnification, egg and sperm
    side by side at the same one;
  - its card says its sex system, chromosomes, gametes, where its eggs are fertilised, its young, and why evolution
    favoured it. Eight species: humans, humpback whales, pigs, fruit flies, ants, earthworms, water bears, a mushroom's
    mycelium.
- **works (the genetics run, not told)**: each system crossed by its own rules and its offspring measured:
  - full sisters share 0.5 of their genes, ant sisters 0.75 (haplodiploidy, why sterile workers pay: Hamilton's rule);
  - a parthenogenetic water bear's daughters are clones and every one can lay (twice a sexual line's growth: the twofold
    cost of sex);
  - a hermaphrodite worm's young all lay;
  - almost any two strains of the mushroom can mate (two mating loci of many types: 98 %).
- **works**: "breed Kai and Mia": their own genomes crossed by meiosis (each chromosome pair crossed over at random), an X
  from her and an X or a Y from him, and their child brought in grown up, every trait from what they passed on.
- Human reproduction is shown as a textbook does (gametes, fertilisation, the stages of development), not depicted otherwise.

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
- **works (the go-kart track, src/nexus/karting.ts)**: "take me to a go-kart track", and you are in a kart on the grid.
  - The track is a 546 m loop, 7 m wide (the CIK-FIA asks 6–8 m by circuit grade), with 9 corners, the tightest a hairpin
    8 m in radius. Red-and-white kerbs mark the corners, grass beyond them grips about half as well, tyre walls stand 3 m
    out, and a gantry over the line carries five start lights and a timing board.
  - The kart is a rental kart: a Honda GX270 (6.3 kW at 3,600 rpm and 19.1 N·m at 2,500 rpm, Honda's figures), governed
    to about 59 km/h, with a brake on the rear axle only (so about 0.5 g). It handles as two tyres, front and rear, each
    slipping at its own angle; their grip saturates at about 1.1 g and the rear shares its grip between drive and
    cornering. Brake or accelerate too hard mid-corner and it slides or spins; once spinning, all four tyres slide until
    it stops.
  - The other drivers follow the line at the speed each corner allows, √(μ g R), braking in time for the next. The
    quickest laps in about 42 s, against about 40 s for a perfect lap at the grip's limit; the others use 91–97 % of the grip.
  - Drive it: in a headset, the right trigger is the throttle, the left the brake, and a stick steers; on a keyboard,
    W/S and A/D or the arrow keys. Say "go" (five lights, then out), "restart", "practice" (alone), "race 5 karts",
    "lap times", "get out" or "get in", "behind view", or "why did I spin" for the physics.
  - Not yet: engine sound, the karts' weight shifting onto the outer tyres, kerbs as bumps.
- **works (the roller coaster, src/nexus/coaster.ts)**: "ride a roller coaster" or "build a roller coaster that goes
  through a volcano", and you are in the front seat with the lap bar down.
  - The track is about a kilometre of steel, laid piece by piece as a designer lays it, each piece a straight or an arc
    of a stated radius:
    - a chain lift to 40 m at 2 m/s (chain lifts run about 1–3 m/s);
    - a 38 m first drop at 62°;
    - a teardrop loop, 8 m in radius at the top and 24 m at the bottom, so the top is fast enough to hold you in and the
      bottom gentle enough to bear;
    - a camelback hill for airtime;
    - a banked helix, three low hills home, a banked turn, and the brakes.
  - Each turn eases its bend in and out, and is banked for the speed the train actually takes it at. That speed is found
    by running the train once over the first laying, then laying the track again.
  - The train is six cars as one rigid body: gravity pulls it by the mean slope under its cars, its wheels lose about
    1.5 % of the force the track presses on them, and the air holds it back. The chain carries it over the crest, the
    brakes stop it, and the station's tyres send it out.
  - What you feel is the track's push in your seat, as the train's acceleration less gravity:
    - 94 km/h at the foot of the first drop (95 % of a free fall);
    - 3.8 g at the bottom of the loop;
    - +0.4 g into your seat upside down at its top (10.7 m/s round 8 m: v²/R is 14 m/s², more than g);
    - −0.8 g of airtime over the camelback;
    - about 0.2 g sideways at most.
    - These stay inside the commonly cited limits (about +6 g, −1.5 to −2 g, ±1.5 g sideways). ASTM F2291 §7.1 sets the
      official limits by how long a force lasts and how riders are held; its tables were not read here.
  - Through a volcano, the helix runs round inside a breached crater over a lava lake, under rising smoke.
  - Say "go" (or squeeze a trigger, or press space), "wait", "get off" (in the station, to watch from the platform),
    "get on", "stats", or "why don't I fall out at the top".
  - Not yet: wind and sound, cars that sway, a coaster you lay yourself piece by piece.
- **works (table tennis against a robot, src/nexus/pingpong.ts)**: "I want to play ping pong against a robot that's way
  better than me", and you are at the table, the robot at the other end.
  - The table, ball and net follow the ITTF's Laws: 2.74 by 1.525 m, the top 76 cm up, a 15.25 cm net, a 40 mm ball of
    2.7 g. Dropped from 30 cm, the ball comes back to about 23 cm.
  - In the air the ball is held back by drag (falling, it reaches no more than 8.3 m/s) and pushed by its spin (the
    Magnus force). The robot's topspin pushes it down at about 1.7 g, on top of gravity.
  - Off the table and the bats, spin and speed trade through friction until the ball rolls. Topspin kicks forwards off
    the table; backspin checks.
  - The rules: a serve bounces on the server's own half, then the receiver's. Your serve may go straight over (a friendly
    serve). Then come one bounce each, the net, two bounces, hitting your own side; games to 11 by two, the serve
    changing every two points, and every point from 10–10.
  - The robot reads your shot's whole flight at once and meets the ball at the top of its bounce. It sends it back with
    topspin to the corner farthest from your bat, wider the better it is: at full skill, 14 m/s with 100 rev/s, its aim
    off by about 3 cm. Against a bat that never moves, it wins 11–0.
  - In a headset your bat is in your right hand and hits by its own motion. On a screen the bat follows the ball: press
    space (or click) to swing, best about 0.12 s before the ball arrives, and aim with the mouse.
  - Say "easier", "harder", "score", "new game", or "why does it dip".
  - Measured, not assumed: a 6 m/s ball with heavy topspin cannot reach 1 m deep on the far side (the air takes too
    much). The robot then plays slower or shorter.
  - Not yet: the lift dip at low spin found in free-flight measurements (Miyazaki et al., 2017), sound, a person to play.
- **works (creatures, src/nexus/creatures.ts)**:
  - a dog (a golden retriever, by age), penguins (emperor, king, Adélie), a humpback whale, a T. rex, and a dragon;
  - each at the size and mass its sources give, moving as its size lets it: walkers at the Froude number their gait keeps
    (a puppy trots at 1.3 m/s), a whale's flukes at a Strouhal number of 0.3, a flier flapping at Pennycuick's rate;
  - the dragon is fiction, sized as a real flier would have to be: 500 kg and a rider need 26 m² of wing, 12.4 m across;
  - what each does: the dog follows you ("stay", "follow me"), penguins wander, whales swim round you, the dragon keeps
    near you in the air ("ride the dragon": it flies where you look);
  - places bring the animals they were asked with: whales under the sea, a T. rex in the Cretaceous, penguins on the snow.
  - Next: their legs and bodies by physics, as the people's are (now their gait is a stride timed by their size).
- **works**: a warehouse with robots, a workshop, flying and walking.
- **next**: the people in a place standing on its ground everywhere (it is flat for 12 m round you), spin on the pool balls,
  old cities, music, a coaster you lay yourself.

## 5. Tested blind

A fresh AI with no context wrote 25 things it would say to the app (a beach at sunset, a puppy, the Grand Canyon by air,
a lightsaber, gummy-bear rain, Mars, ping pong with a robot, a dragon, a cabin in a snowstorm, an orchestra, Rome, a
sandwich…). First run: 0 of 25 did what was asked. After places: 13 of 25. After kits: 14 done, 5 partly (the Cretaceous
without dinosaurs, the aquarium without whales, the snowfield without penguins, the beach without a surfboard, and "a car
that turns into a boat" made as a car only), 6 not at all (a puppy, a dragon, ping pong, an orchestra, Rome, a roller
coaster). Since, creatures: the puppy that follows you, the dragon you can ride, the penguins, the whales and the dinosaurs
are there. Then the roller coaster through a volcano, and ping pong against a robot far better than you. The orchestra,
Rome and "a car that turns into a boat" are still not.

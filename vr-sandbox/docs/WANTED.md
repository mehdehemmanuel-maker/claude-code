# What is wanted: the user's own words, kept

Moved here word for word from `CLAUDE.md` on 2026-10-31 (the user: "we need targeted context … if you need extra context beyond this go x.xx in context glossary"). `CLAUDE.md` keeps the summary and the standing rules; this is the full record, oldest first. Add each new instruction here, in the user's words, with its date and what was done about it.

- "don't make templates for individual generation paths that's mock, make it have a pipeline where it can generate
  trillions of different combination of just anything based on any condition improve realism … there needs to be an
  attention to detail part of the pipeline"
- "merge them don't discard one or just not incorporate it, they may complement each other … why are there two different
  generators"
- "parts need to have more rules on them like if there a moving part like a tire an auger … then it's recommended it has a
  given amount of space"
- "I'm not sure how the car or go karts you made are such low qualities when you have so many parts mapped out and
  interconnectable and can expand any part for its sub parts"
- "generate every single vehicle, every vehicle type, make, model … forklift, semi, crane … plane, jet, with real parts …
  every go kart, four wheeler, dirt bike … every mower, every power tool, really buildable … click it and it is a 1-1
  exact model of the real product, expandable"
- "ask yourself what aren't you asking yourself; don't just think of math, think of emotion: how would they think about
  this, what would they say is bad about this, and then recursively fix it"
- "there's a lot of missing pieces … you haven't configured an environment that makes it easy for you to do certain
  things … handling texture and complicated shells … looking at how you got through the math, what could be better …
  recursively upgrade every process and sub-process: the car's fenders and panels, unibody, hoods" (the roadmap with it:
  Bezier/NURBS, proportional falloff, symmetry; a creator and a critic that changes the creator's rules; wireframe boxing
  then skinning; zebra stripes; G2/G3; practise on a front fender first)
- the CAD toolset list (2026-10-08): automatic constraints (tangency, coincidence, symmetry), a parametric feature tree,
  G2/G3 smoothing, clean quads, SubD cages, zebra and reflection maps, draft-angle analysis, wall-thickness checks,
  generative design, command prediction
- "don't just adopt all these tools: improve them, expand, find flaws, find a branch it opens that no one thought of; try
  to be the system that future systems reference"
- "Create every car there is you don't just design the outside … design each sub component the motor and other parts
  but also you first need to design the sub components of that and so on and then you can save that component under its
  name and category and now every other build using any of them is already ready screws nuts bolts, radios, buttons,
  wires … mix and match and make emergent builds like a semi truck-atv hybrid, 3d printer with robot arms on it, a new most
  efficient motor, a whole industrial plant … start small and work your way up … the most common parts" (2026-10-08:
  the component library, `components.ts`)
- "do the same thing for every 3d printer, metal filament and everything and robotic arms even the most advanced, all
  versions of filament makers, even metal filament makers, study all bots even filabot … futuristic manufacturing … tony
  stark level engineering" (2026-10-08: manufacturing built from the library)
- "money manager / business agent with employees on computers and a board room with a giant screen I can edit, basically
  a node tree that maps things in my situation out; don't lose context, find time for it" (2026-10-08: queued)
- "go through every part and make sure that every other part is inside and every part that's in those parts … almost
  100% visually accurate … scaling build up from tiny parts to full builds has 100 realistic shape and complexity; delete
  all the old build things off the app, they're old and low quality … upgrade the whole app's UI and abilities"
  (2026-10-08: `missingIn` in `components.ts`; old builds to be listed before they are removed)
- "don't forget bearings have sub components as well" (2026-10-08: rings, balls, cage, shields drawn)
- "for each new part stored it has to be queued for a break down just in case it has sub components, and then if it does
  it's the same for any new parts added … look for even more components in the sub component … some kind of table lookup;
  if the very specific part doesn't exist in the table queue it too, but first it has to be broken down" (2026-10-08:
  `breakdown.ts`, `npm run breakdown`)
- "build a universal card engine that spans across all domains … a node graph that gets smarter meaning a node can be
  a tree that can branch more trees and even delete branches and it should become the most efficient system" (a
  challenge against another AI); "it should be colourful … mainly node pipeline but nodes can be blocks of code, can be
  artifacts like different types of calculators and yes you can make new ones and they act like efficiency building
  blocks like programming" (2026-10-25: plan drafted in `docs/NODE-ENGINE.md`, grown from `boards.ts` and `flows.ts`)
- "delete the environment the robot the factory all of that … make it just floating structured ui and you need a 3d
  renderer the space needs to become a x,y,z,s(scale),t(time) environment with grid cells … the main thing is nodes …
  collapse a whole nodded generation into one node and save that node into the node library as a reusable node
  permanently … create a motor … save it … put multiple of those nodes in and assign them different locations … create a
  drone out of those motors … save the drone … a drone swarm … generate cities just from 10 nodes … variant nodes that
  allow the change of a colour a material a size a shape an axis a hole a cut anything and mating logic and geometry and
  position for compatible parts like a bolt and a bolt hole or an input and output … advanced physics nodes … precise
  material values down to the element table densities and behaviours" (2026-10-26: the forge and its room deleted; the
  space, `assembly.ts` and its nodes built; mating, then physics and the periodic table, are next: the plan in
  `docs/NODE-ENGINE.md`)
- "the point of the city is not for you to just build a city no build a car out of nodes collapse it into one node save
  it the library as car build a window do the same build a door … a room … a toilet … the things that can change what
  type of room so you can just plug it in to the house node and change houses layout rooms layout by simply just clicking
  things on a node build a square foot patch of grass generate a whole terrain build a road and stop light generate a
  whole road system, build a sink … generate house with a few nodes … make them adjustable and generate a neighbourhood
  … a whole city" (2026-10-26, with the Seed Node System document: the boundary rule, the ten-level ladder, seeds as
  cached stand-ins placed by pointer, variants as overlays, spawners; `seeds.ts`)
- "I want the ui to look like this kind of like colorful … but real don't mock it don't build it without being usable
  fake pages no parts of the page that you try to copy the picture but don't have any meaning or connection to
  everything also the 3d viewer can be entered or just remained a normal sized tab … this city is just an example … to
  show you what tools the nodes will need to be able to build complexity … the point is to have the ability to generate
  such complexity and you trying to generate complexity and being honest with yourself where it's hard will allow you to
  be like one well then nodes need this ability mating ability proximity ability deletion abilities moving ability
  movement needs and all types of stuff" (2026-10-26: the dashboard, every panel read from the board; frames and Mate,
  what touches what, rules over rows, Clear away, Clashes, Onto the ground, the Clock, signal cycles, Follow a path; what
  is still missing listed in `docs/NODE-ENGINE.md`)
- "Could traffic board be under a board category in the library there's circuit boards and all types of stuff also how
  do we handle realism at scale like right now you're just like stress testing to find flaws and making things more and
  more powerful but yea keep reading the file and executing" (2026-10-26: Boards in the library, by field, yours saved
  beside them; stand-ins with error bounds and a frame governor, the Seed document's 3.12; cars that speed up and brake)
- "try to break rendering at some point once you finish up try to break rendering try to render tons of stuff make this
  space infinite in all axes and scale and time try to break rendering find the cause and find a trick" (2026-10-26: the
  breaks and their tricks in `docs/NODE-ENGINE.md`; culling, lazy groups, largest first, a stand-in pyramid, a governor,
  a floating origin, Forever, a horizon, folded time)
- "Okay now what next in the doc maybe realism or motion or physics" (2026-10-26: motion and physics as nodes, the
  document's 3.5 to 3.7: Let it go over the Jolt engine already here, Hinge, Push, Turn as a servo drives a joint, Sweep
  and Clashes for the room a motion needs; the next in `docs/NODE-ENGINE.md`)
- "build something complex like a car but you need it explode or down to its bolts … reuse things to make the build
  faster … batteries lots of cars use the same batteries or tires design realistic tires … geometry and sizing settings
  on the tires … build truck from the ground up develop a logic that would allow you to build different kind of vehicle
  easily … then a computer … the tiniest individual functional component is the transistor … test yourself with realism
  and physics … texture lighting physics" (2026-10-26: tyres as made, batteries by their standards, Fit in and Take
  apart, vehicles from their axles, wheels that roll in the physics, `computer.ts` from FinFET to PC; shadows)
- "that semi … very low quality and fake parts that probably couldn't be exploded to accurate parts … the fact that parts
  can be exploded down to the bottom is what makes designs more accurate upgrade the design logic for things so it's easy
  to make things look realistic and detailed and accurate" (2026-10-26: recipes in the inventory held by `explodeAudit`;
  the truck's fittings drawn whole in `fittings.ts`; every build's lumps said by mass)
- "you can't build anything by designing what it looks like … you gotta build each part each sub part each subsubpart
  and make it easier to generate new parts and assemble new parts … the build of a battery can fall into a lot of
  categories … follows a lot of the same processes and geometries of many things that's what I mean by node efficiency
  and versatility" and "parts exploded that have their own assemblies should be able to be exploded as well … showing
  screen shot of it on the node graph and it's small parts on the node graph" (2026-10-26: makers by process in
  `makers.ts`; the battery built from them node by node; explode inside an explode with focus; batteries in the vehicles)
- "the problem is you built the outer layer before the first parts every single piece need to be able to be exploded"
  (2026-10-27: the engine and the gearbox built from their first parts, sized and weighed by them; every vehicle's tyres
  built in depth; doors, hood and deck lid built round their skins; the audit now says what is only said, not built (a
  stated mass, "the rest of it") and what nothing identifies, so the outer-layer-first fault is measured, not hidden)
- "more attention to detail you can zoom in like you did to the computer chip make it easy to do that create more tools
  for yourself in the nodes … the engine looks all sorts of fucked up … make sure nothing intersects, touches, that
  shouldn't certain nodes need to define their parameters like shit that can't intersect touch or anything or like heat
  things it has a proximity gate for which certain materials can't exist stably … a bolt one node can be any size bolt
  screw or whatever assign the base geometry like a octagon for bolt circle for screw … then have a smaller circle
  protrude given the parameters of the length … then assign its rivets [threads] … one node that covers so much ground"
  (2026-10-27: the rules checker `make/rules.ts` (interference, clearance, heat gate) and node Nothing runs into
  anything?; every engine the machines use comes back clean of it; the one fastener node; zoom to a piece; take out a
  piece; turned parts with sharp edges)
- "what does the node setups look like and all of the sub parts setups and all of the sub sub parts … everything needs
  to be a node calculator nodes can be stress testers don't just rely on the nodes you have see if you need another node
  that would make things more efficient … what determines texture do you have advanced textures", then "Ok execute"
  (2026-10-27: parts placed by their round faces and bored where others pass (`mate.ts` `onto`, `boreThrough`; nodes
  Onto a shaft, Bore where it passes); the engine board made of its parts, each wired into what it is in (Engine piece,
  the head's and the engine's part inputs); load cases on drawn parts (`loads.ts`; Spring under load, Engine under load)
  and a stress test of any block over a range (Sweep (stress test)); parts sized from their loads (a valve spring by its
  redline, a rod's big end by its firing force); the rules through a turn of the crank (Turn it over and check); a
  cutaway in the 3D view; each finish's grain drawn in the shader. The checker was found blind to anything thinner than
  6 mm and was fixed)
- (with a photoreal cutaway of an inline four: fuel rail and regulator, coil packs, harness and ECU, alternators, A/C
  compressor, clutch, heat-wrapped header, dipstick) "you need to ask why it's not at this level of detail and define the
  gap map the bridge to getting this level of detail across different builds and execute create node pipelines for
  researching create a pipeline for compiling research create a pipeline for looking for sub components and sub sub
  components and then defining what's all missing and more pipelines to take stress out of your hands this nodes will
  make your life more advanced use them right" (2026-10-27: `docs/GAP-MAP.md`; research as sourced notes compiled into a
  reference (`research.ts`, `data/references.ts`; nodes Research notes, Researched reference, Compile research, Into
  the inventory, Its parts and theirs, What is missing?, How finely is it made?); the Corolla's engine held against
  Toyota's M20A-FKS went from 42 % to 82 % of the parts its sources name, its rules still clean; the maker's choices a
  `fit` (`FITS` in `engines.ts`). In-app research cannot reach the web or Claude (the relay is gone): the research is
  done by Claude with web search and kept as sourced data)
- "I want a separate node space where nodes have to go through gauntlets before they get approved like if there's any
  component that have sub components that aren't explodable and if them sub components have components or stress tests
  or even versatility … universal nodes all types of nodes real search nodes input output read nodes pass nodes task
  nodes event listeners … a unknown library queue a tester node a deletion node get creative", "make that unknown node
  research and gauntlets flow more advanced like have sorter … sorts them by things they have in common so a lot more of
  them can be made a lot faster … make sure that it's recursive … looks for components sub components sub sub components
  and it keeps going through gates until there's no more and even more advanced", and "the detail ain't there textures
  are too smooth … the copper is too smooth when it's supposed to be wire that's geometry don't half do stuff or no
  mocking because that ruins this app's integrity" (2026-10-27: the gauntlet (`gauntlet.ts`, page `view/gauntlet.html`,
  nodes `gauntlet.*`, `read.*`, `pass`, `task`, `on.event`, `unknown.*`, `research.loop`, `search.*`, `test.block`,
  `delete`, `make.sensor`); windings drawn as their wire (`makers.ts` `wound`, node Winding). Put through it, the
  library's 318 blocks first came back with 25 that gave NaN without a word, engine nodes that crashed on an 80 m bore,
  brake pads and zirconia that weighed nothing, a starter solenoid listed only as its materials, and the Rancher's
  engine with 6 collisions: each fixed)
- "Cables, hoses, circuits, wires, roads, piping all fall into the same category you can literally take a cylinder node
  make the material changeable make the inside either hollow or of a material like copper … and for routing logic you can
  have various different routing logics make sure to be thinking smart" (2026-10-27: `placement/line.ts`, nodes `line`,
  `route`, `size.line`; the autopilot's `reroute`)
- "switch to large scale operation like actually building and running 36 million transistors resistors actually running a
  real engine that actually will move thing like actually giving things life energy time meaning people driving cars
  walking dogs opening doors grabbing things … maybe there's a node system like proximity nodes where based off of its
  material or size you can automatically calculate its field of view proximity and tag it … wayyyy more advanced"
  (2026-10-27: the plan is `docs/LIFE.md`: signatures and affordances read from what things are, awareness by sensory
  reach, agents, characterise-once logic, an engine that drives; each step shown before the next)
- "smell isn't just a smell it's more like a chemical thing … a gas thing … there's more logic to it than smell but it
  can be tagged to smell" (2026-10-27: `aware/gas.ts`: substances with what they do at each concentration, sources by
  their physics, carried by the air; smell one sense's reading of it)
- "the point is to eliminate the need for manual stuff while maintaining the same results as a high level engineer from
  houses too environments too mechanical too software nodes need to be max capable eliminate the need for guessing and
  manual", "think outside the box … think about the pinnacle of it" (2026-10-27: hours had gone into hand-typed positions
  for single parts; the plan is `docs/PLACEMENT.md`: parts say what they need, a solver places, routes, sizes and explains,
  nothing placed by hand; each step shown to the user before the next)
- "sort everything every node ever node flow every type of flow every library every library type just organize
  everything make it so easy to navigate and use that it puts shame to other structures … how well everything can be
  reached and seen when needed even when you didn't know you needed it the navigation showed you that you need it", and
  before it "how does this node … apply to various other things … don't make anything too specific too the subject …
  ask yourself what already exists" (2026-10-28: `navigate.ts`; steps 6 to 8 of `docs/LIFE.md` made universal: a mate
  with force, a goal to any thing, any body from its segment table, sense wired into goal)
- "be careful with the library if there's a library of something that wasn't created from the node setup then it's
  outdated and not to be merged with this like old builds before nodes need to be deleted anything taken up space that
  is outdated needs to be permanently terminated and deleted" (2026-10-28: every file no page of the node app reaches
  was deleted (138 source files, 26,300 lines: the words-to-build pipeline, the old embodiment, the census and manifold,
  places and games, the old physics client), with their tests, their command-line programs, 43 docs about systems
  before nodes and `spikes/`; then every export nothing used; what is kept is what the node app reaches. Commit
  `e70944a` holds the last of it, if any of it is ever wanted back)
- "analyze everything what all is retired … merged, connected down the line … did you update the whole system or does
  that come later if so put it in system population and take all previous builds as before the update", and "the way
  nodes are categorized and named is bad it needs to be more technical, scientifically specified" (2026-10-29: steps J
  and K in `docs/REALITY.md`; builds dated from git like nodes, those before the update marked in the library)
- "I would rather get textures stunning and different tools that govern how something looks maybe math can determine
  something color like why is metal silvery grey why is copper its color … a auto texture that is editable like paint
  jobs or design", and "thing built before the update just throw it away it's gonna be too buggy … you can rebuild it
  way faster and way better now" (2026-10-29: phases 3 and 5 of the plan in `docs/REALITY.md`)
- "Make sure every peice built is stored correctly in node librarie every sub component stored every sub sub component
  make that a law you either use what's in the library or create something and store in the library" (2026-10-29: the
  built-parts library, `stock.ts`, and law 4 below)
- "Look everything your doing needs to be done in nodes or if missing a tool make it and put it in nodes Upgrade CAD
  Visual Reconstruction Accuracy … The system generates plausible geometry instead of faithfully reconstructing the actual
  object … Multi-view analysis … Feature extraction … Geometric constraints … Uncertainty tracking: Separate observed,
  measured, inferred, and unknown geometry. Never silently treat guesses as facts … Parametric reconstruction … Visual
  verification loop: Render the model from the original camera angles, compare silhouettes and feature positions against
  the reference images, identify errors, and iteratively correct them … Targeted clarification … Build a closed-loop image
  → geometry → CAD → render → compare → correct pipeline … Audit the existing implementation first. Reuse working
  components … Report measurable discrepancies and unresolved ambiguities instead of claiming unverified accuracy"
  (2026-10-29: the plan in `docs/RECONSTRUCT.md`)
- "try to think outside the box you where getting close all you gotta do is match it and find a way to really match it
  better and better create node tools for this see what pipeline works optimize it and store it for this exact problem
  make a image to modal node that was folded", and "that was an ai generated version that is the goal of what I wanna get
  my Monte carlo too you seen mine it's not too pretty right now" (2026-10-29: the side picture is the goal, not a
  photograph; recipes tried and judged alike by Pipelines tried, the best kept; node Picture to model, folded; results in
  `docs/RECONSTRUCT.md`)
- "once you make something once you won't need to again so what's something that you would use a lot … complexity is
  right around the corner with a system like this and a lot of things can be reused across different types of categories
  that you wouldn't normally expect a lot of the tools you have you know can be more advanced" (2026-10-30: tools built
  once for every category; first, Fit to a target (`fit.target`, `dataflow.ts`): any block or folded pipeline fitted to
  its goals, each value with its ±; the minimiser and the fit with ± in `numeric.ts`, driven at once or by a board's run)
- "Okay yes but I need ss updates frequently" (2026-10-30): screenshots of what was made, sent as each piece of work
  lands (the board in the app, the thing in 3D), not only at the end of a round
- "I'm gonna give you zenrows for the nodes … superior access to the web … report to me where you at what you've done
  and updated road map thoroughly check code and context for bloat and unnecessary or outdated things" (2026-10-30: keys
  the user gives go in the environment's secrets, never in the repo or the page; accounts and keys are the user's to make,
  not Claude's; the road map is `docs/ROADMAP.md`)
- "a layer where you rout image prompts to an ai image generator for ideas and then model them and maybe even rout that
  image to a blind instance that judges it on criteria … multiple images that need generated and judged … the ai image
  generators are genius on accident they'll really invent a new technology … create a prompt engineer test what prompts
  work best for activating its genius have some type of confidence rating" (2026-10-30: `genai.ts`: Blind judge, Picture
  from words, Prompt trial, Views round a thing; the key's image quota is the user's to enable)
- "Intelligence or Ai engineering needs to be a main category of engineering as well Prompt engineering to be a sub
  category of it and agentic flow or whatever pipeline engineering or maybe pipeline engineering should be its own type of
  engineering idk you think on that" (2026-10-30: two main disciplines in `data/disciplines.ts`: Intelligence (AI)
  engineering (models, prompt, evaluation, agents, perception, generative, retrieval, safety) and Pipeline and flow
  engineering (its own: pipelines run engines and springs as much as AI); library fields Intelligence (AI) and Pipelines &
  flow)
- "whenever your making an ai in the loop flow explain it to me like this ai waits for this then reads and writes too x
  and then x writes too z" (2026-10-30): every flow with a model in it is explained step by step: who waits for what,
  what it reads, what it writes and to whom, and where a step can fail
- the 30-stage "Industrial-grade autonomous CAD engineering compiler" (2026-10-30), with "turn this into a node pipeline
  somehow": its data contract, statuses and release gate as `compiler.ts` and nodes Compile: start, bill of materials,
  verify, release; each of its stages mapped to what does it here or what it waits on (`docs/COMPILER.md`)
- "Hurry up with these" (2026-10-31), then, after a cross-check on the whole Monte Carlo ran over 20 minutes: "why are you
  focusing on a rear axle … that's taking way too long why are you letting things get to that point". So: every check is
  tried on a small case first and a whole vehicle only once that is fast; anything past about two minutes is stopped,
  not waited on, and said
- "go through and update your context and navigation get rid of any outdated context or flawed navigation" (2026-10-31)
- "So the questions are you accurately building the Corolla or are you accidentally making it more efficient potentially
  spotting planned obsolescence", then "stop focusing on the cars what should we really be focusing on" (2026-10-31): a
  real product's own data is held fixed; a finding on it is checked against the real product first, and never tuned
  away to please our checker. The focus is the machinery that makes and fixes anything (constraints, changes that
  follow, the repair loop as nodes), not one car
- "Okay do that also here a burner Higgs field api … put all apis as nodes with outputs and inputs" (2026-10-31): every
  service a node; keys kept out of the repo (the environment's secrets, or this session's private scratchpad file)
- Always: no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly.
- "don't lie again it hurt my feelings" (2026-10-29, after times and claims were stated as facts that were never
  measured): never state a time, a speed, a count or a result that was not measured or checked. Measure it first, or say
  plainly "I don't know" or "a guess". A headline number says what it counts (not "371 current" when 332 are laws), and
  "nothing contradicts it" is said only where something was there to contradict it.
- "Okay so would divide it into eight fundamental systems" (2026-10-31): spatial construction, material construction,
  physical laws, time and change, interaction and causality, composition, multiscale understanding, rendering and
  observation ("appearance becomes the output, not the foundation"); each scored out of 100 on request
- "you could make plenty of node boards and make them route and just feed these routes … you got a Claude api and all of
  that you could be doing way more", then (2026-10-31): an in-app AI that works through nodes, not the whole app edited
  every move; "an ai image generator tool with a very specific prompt on showing where parts are in known cars"; "prompt
  engineering needs to be studied as well advancedly … job an ai one tasks with tags it will perfect it give 100
  unspecific tasks with tags with only one response it's gonna hallucinate that what detailed failure aware pipelines
  are for … prompt engineering is just like any other engineering … it's all a passing data thing"; "advanced pipelines
  that simplify this … passes through a series of ai gates that just get it done"; "targeted context … if you need extra
  context beyond this go x.xx in context glossary … you should [not] have to watch a whole crowd's movement when
  fighting in the octagon with your opponent"; "a lot of stuff that gets tested don't need tested also money isn't the
  problem also we need a time threshold … step back and say this isn't a population issue this is a missing detailed
  pipelines issue" (done: `CLAUDE.md` cut to a summary and a router, this file, route maps atop the large modules, the
  step-back rule; the in-app AI and the AI-gate pipelines next)

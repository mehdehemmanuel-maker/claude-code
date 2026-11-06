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
- 2026-10-31: "Make it's so an ai don't have to use barely any tokens or anything to build also start explain this app to
  me like im the ai" (done: five compact tools, whole-board plans, `docs/FOR-AI.md` as the cached instruction); "Next
  give it full abilities" (done: open, change, fold into saved blocks, a second model's check, the board open); "Okay
  make it so user can be in the environment add a friend intractable node it basically is buttons or like mobile
  controls or computer control you know or you can put button on things that's intractable" (done: Button, Stick,
  Slider nodes worked by keys, a gamepad, drawn controls on a phone, a hand's ray, or a button put on a thing and
  pressed in 3D; walking in the world at your own height. Read as "a fully interactable node"; another person joining
  the same world is not built)
- 2026-10-31: "Okay go through and make navigation absolute and also propose full system upgrades" (done: search
  finds every node by name and id, every board, every app feature, misspelt and plain words; every source file and every
  document routed from CLAUDE.md, both held by the gate; the proposal, since folded into `plan/`)
- 2026-10-31: "Okay 1-2(but variants I can choose weather I'm ghost mode or whatever also I can change my perception
  change time Change my sight or whatever that would be good skip 3 for now 4 populate the civil engineering 5. Yes we
  need advanced topology that don't just apply specifically to a thing we can have geometry mating or inverting for
  example if you make a bolt you can past it's input geometry into a surface of anything easily like we need very
  advanced smart stuff stop playing and we especially need faster searches advanced names populate the library with
  just names and stuff like words specific too it like subcategory's … but don't make those count as there only real
  nodes count for faster searches advanced names index phone layout colorful iron man Jarvis phone app but named
  moosky typ of thing just advance everything but before you do anything I want you to take what I just said and
  research I'm finding new emerging ais new frameworks new tools that we can pick from. For example there's
  implicit.build it's like a topology cad machine, they got Roblox vibe coding now similar to this but where going way
  more advanced for the complexity of this project how do we structure this so we don't mess shit up forget shit or you
  know start doing circles or just tripping, there's vibe scad beta, there's so many VIBE CADS like vibe cad studio, and
  cascadeur, google deep mind, Motorola, geometric deep learning go through for the next 1 hour I want you to create the
  most amazing structure reverse engineer each of these stitch them together then make them plan even better highly
  detailed clear plan well thought out context aware on current situation as well and yea steal go through and steal dig
  dig everywhere take your time and just research for now think of all the right questions to ask ask all of them keep
  asking questions and conceptually scraping until you can't anymore" (research first; the plan in `plan/`)
- 2026-10-31: "Okay wait don't rush you said we have a competitive advantage with my logic using the bolt as an example I
  appreciate that also I want you to compile a deeper plan create a file or doc or whatever to keep it structured" (done:
  `plan/`, the interfaces spec the deepest; `docs/PLAN-NEXT.md` folded into it)
- 2026-10-31: "This app is gonna be the next wav in humanity it's for the world where everyone can be a genius from just an
  idea or Anton can simulate anything life civil or anything design rooms or anything no we can use nexus as the name
  okay and task size is this for you or the in app ai because in app a task can be however big as long as it's context
  and hallucination aware before piping forward. To another pass or just branching in the first place no create a new
  test a simple one that actually capture everything just throw something together just think outside the box as for 7
  I'm unsure what you mean but it's ok also with 2d sketches this can be an ai image generator with a specific prompt like
  generate and his part outlined in a 3d engineering with labeled dimensions or something like that that was probably
  way off but yea that image passes to a a image parser it's scan the black lines an put it into the environment setup in
  3d this part should use no ai so just so it don't hallucinate if you tell it specifically outline this in black then we
  only have to copy black paste it do also add in the prompt don't use black on any thing else or even better just tell it
  specifically what ui should look like leaving no room for failure also for the reviewer you need different kinds test
  different prompts and or add this to advanced research prompt engineering also where still in research mode research
  all engineering every single language every frame work everything keep see what others are doing look for complexly
  irrelevant thing that are genius visualization maybe a random game has behaviors we need maybe things ain't what they
  seem search deep think about everything that ain't been covered yet and needs advanced research I want you to research
  life,engineering,philosophy, astronomy, contests game of life,Mandelbrot, math like pie, universal equations create a list
  of questions that's a book in itself" (answers recorded in `plan/QUESTIONS.md`; the research wave in `plan/research/`;
  the book of questions in `plan/BOOK-OF-QUESTIONS.md`)
- 2026-10-31: "Okay compile and branch research so we can keep finding things we may have overlooked or genius thing that
  are unrelated" (the research tree, `plan/research/TREE.md`, with its method; round 3 into far branches)
- 2026-10-31: "Yes add everything useful to the plan or research folder or whatever it's called then continue research"
  (specs 09, 10, 11 written; specs 00, 01, 08 amended; rules C19 to C26; research round 4)
- 2026-11-01: "Okay no pause research compile and organize data" (research paused; `plan/INDEX.md` compiled by
  `plan/compile.py`; `plan/DEFECTS.md`)
- 2026-11-01: "Okay find the best questions get rid of all the others also compile and optimize everything before we
  start" (the book cut to its best 171; tasks and rules merged; a start queue; decision 0010)
- 2026-11-01: "Okay so where are we" and "What the plan" (the state and the plan, told plainly)
- 2026-11-01: "1 idk 2 I didn't mean to say Motorola idk what that was maybe I was saying motor something idk 4 a it's only
  for me so I have a computer a phone and a oculus 14 idk what that means 15 idk know what those terms mean there
  undefined" (Nexus is for the user alone on three devices; Motorola dropped; questions asked in plain words from now on,
  technical choices made by the builder; decision 0011)
- 2026-11-01: "Later but keep it in mind I need you to clean up context and get to work and don't drift go take out all
  the bloat and whatever out of the app or your context or things you would read and bloat or outdated stuff and then
  start building" (cost and carbon later; docs/NODE-ENGINE.md and docs/ROADMAP.md removed as outdated; unused packages
  removed; the start queue begun)
- 2026-11-02: "Yes continue but that motor is extremely unrealistic and looks horrible looks blocky not real wires thing
  going through each other I hope that something that doesn't allow that is in the plan I mean what happens where you
  render it in motion will it work =fake,if it fails because it's broken then good" (the engine fails visibly where it
  is broken; faults D25, D26)
- 2026-11-02: "Create a node creator agent that can see what everyone is doing manually and learns how to make nodes,node
  types, node boards collapsed into one node to make everything more efficient" (the node creator: what is done by hand,
  recorded and mined, made into nodes and node types, proved equal before it is offered; its spec written from it)
- 2026-11-02: "Okay now add an efficiency agent buts it's more of an orchestrator type but not where it breaks it should
  see what's taking too long it's flags negative repetition it can catch thing being counter intuitive it can see token
  usage how long each and everything is taking   We may also need a context agent we need more eyes and more structure
  more effeciency more failures made impossible and more successes made faster" (an efficiency agent that watches and
  flags, never breaks: time, tokens, repetition, the counter-intuitive; a context agent; more structure)
- 2026-11-02: "So for the motor and the contact disk we need to zoom out a bit and ask ourselves why was that possible and
  how can this system be more advanced to look at things outside of human perspective of engine and disk and look at it as
  different of energy and laws in which they interact kind of like how reality works the environment itself doesn't allow
  things that shouldn't be going through each other or interacting to do so you can't simply put a metal pipe through a
  wall things need to be smart if I asked this app to make z me a completely new machine it should be able too in less then
  a minute don't over complicate things something needs to be asking is all this really necessary kind of like the finding
  of collapsing nodes boards into one node imagine building a city that reuses the same house 100 times but you decide to
  build it from scratch 100 time and manually route pipes and wiring and ventilation and everything instead of
  generalizing like road=circuits=railways- fiber optic networks=gas networks= river systems= blood vessels moral of the
  story everything is a network of effeciency specifically conditional effecfiency environmental feedback optimization"
  (the space itself refuses what may not pass through or touch, from energy and laws, not from names; a new machine in
  under a minute; something always asking whether each thing is necessary; one network for roads, circuits, rails, fibre,
  gas, rivers and vessels, made efficient under its conditions by feedback from its surroundings)
- 2026-11-02, the same ask written out in full, word for word:

  > Universal Network Intelligence & Conditional Efficiency
  >
  > For the motor and contact disk, zoom out and question the underlying principles: Why was this interaction possible,
  > what physical laws allowed it, and how could the system discover more advanced solutions beyond conventional
  > human-defined components?
  >
  > Stop thinking exclusively in terms of engines, disks, pipes, wires, and other predefined objects. Think in terms of
  > matter, energy, forces, fields, constraints, interactions, and environmental conditions.
  >
  > Reality itself enforces physical compatibility. Objects cannot simply occupy the same physical space, materials
  > cannot behave outside their physical properties, and energy must obey conservation laws. The environment
  > continuously determines which interactions are possible, impossible, stable, or unstable. Nexus should operate with
  > this same intelligence.
  >
  > If I ask Nexus to invent a completely new machine, it should be capable of generating a physically coherent design
  > in under a minute whenever the problem permits. It should discover possible configurations rather than limit itself
  > to familiar human inventions.
  >
  > 1. Universal Network Recognition
  >
  > Recognize that seemingly unrelated systems often share the same underlying mathematical structures:
  >
  > * Roads = electrical circuits = railway networks.
  > * Fiber-optic networks = nervous systems = communication networks.
  > * Gas pipelines = blood vessels = water distribution.
  > * River systems = mycelium = tree roots.
  >
  > These are different physical systems implementing similar principles of connectivity, distribution, routing,
  > capacity, resistance, and flow.
  >
  > Develop generalized network architectures instead of repeatedly rebuilding equivalent systems from scratch.
  >
  > 2. Conditional Efficiency
  >
  > Every operation should continuously ask:
  >
  > * Is this component actually necessary?
  > * Can multiple components be represented by one generalized node?
  > * Does an existing solution already perform this function?
  > * Can the same architecture be reused at another scale?
  > * Is there a more efficient physical interaction?
  > * Does the environment permit this configuration?
  > * What happens when conditions change?
  >
  > Efficiency must be conditional, not absolute. The optimal solution depends on environmental conditions, available
  > materials, scale, energy, forces, constraints, and intended function.
  >
  > 3. Environmental Feedback & Physical Intelligence
  >
  > The environment must actively participate in design and simulation.
  >
  > If a component intersects an incompatible physical object, detect the conflict. If a material cannot withstand a
  > force, identify the failure. If an alternative arrangement reduces energy consumption or improves performance,
  > evaluate it.
  >
  > Use continuous feedback between geometry, materials, physics, energy, and environmental conditions.
  >
  > 4. Generalization Instead of Repetition
  >
  > Imagine constructing a city with 100 identical houses. You should not independently reinvent every house, manually
  > recreate every pipe, and individually design every electrical and ventilation connection.
  >
  > Create one validated house architecture, generalize its connections, and instantiate it 100 times while adapting
  > only what differs.
  >
  > Apply this principle everywhere. Collapse unnecessarily complex node boards into reusable higher-level nodes. Reuse
  > validated systems, interfaces, equations, and network structures.
  >
  > 5. The Core Principle
  >
  > Everything should be evaluated through conditional efficiency, environmental feedback, physical compatibility, and
  > optimization.
  >
  > Nexus should not merely assemble objects. It should understand the underlying interactions that make objects
  > possible, discover alternative configurations, reuse universal structures, and continuously search for simpler and
  > more efficient solutions.
  >
  > The objective is not to simulate human engineering more complicatedly. It is to discover how much of engineering can
  > be generalized, automated, and ultimately reduced to a small number of powerful universal principles.
  >
  > Think beyond the object. Understand the interactions that produce it.

  (the space and its laws decide what may meet, not the names of things; one network architecture for every flow; seven
  questions asked of every operation, their answers conditional on the surroundings; feedback from geometry, materials,
  physics and energy; one validated thing placed many times, adapting only what differs; a new machine discovered, not
  only assembled, in under a minute where the problem permits)
- 2026-11-02: "No nothing should be checked for overlap it shouldn't be possible" (an overlap of solids is never
  checked or found after the fact: making and placing pieces leaves no way to express one; this governs over "detect
  the conflict" above)
- 2026-11-02: asked whether, while the engines move onto the placer that cannot write an overlap, the old overlap
  checker goes at once or is kept for a while only as a list of where hand-typed positions still overlap, answered "Gone
  now (Recommended)" (nothing checks for overlap; each builder still on hand-typed positions is listed as not yet moved,
  with its count)
- 2026-11-02: "I wanna see ss every now and then of what’s actually going on in app" (screenshots of the app itself, as
  it runs, sent every so often)
- 2026-11-02: "What is taking so long"
- 2026-11-02: "I’m approaching limit I need to see some major results"
- 2026-11-02: "Yes and get rid of the old builds and clean up context so it don’t start using old stuff" (yes to moving
  the builds onto the operations; asked which old builds go, answered "All hand-placed builds (Recommended)": the
  builders, their nodes, starter boards and stored parts deleted; materials, laws, standard parts, physics and the space
  of operations kept; the docs and CLAUDE.md pointing only at the operations)
- 2026-11-02: "Also we need an agent who really make this app functional like everything I’m saying I shouldn’t have to
  say why would I have to tell you to get rid of broken code that would cause problems in the future why would I have to
  tell you the engine that was generated had intersections and was blocky an unrealistic why would I have to say you
  need a node generator wasn’t there a whole research why do I have to say all of this wtuff"
- 2026-11-03: "Okay but I want mostly dmaller peices built not whole engines yet just every common peice with all there
  matings or whatever else screws bolts plates boxes hollows inverts inputs wires copper wraps copper wires aluminum and
  tubes pipes leds lights allth lil stuff and everything"
- 2026-11-03: "Continue I feel this is finally the right direction it allows speedy in law breaking builds" (the common
  pieces made by the operations, and things built from them, are the way on)
- 2026-11-03: "Continue / Also make this app easily accessible right away for me on mobile with a vibe engineer
  interface kind of like typical vibe spaces but for cad and yea" (the phone page, `view/vibe.html`: say what to build
  in a chat, Claude builds it from the pieces with the nodes, the 3D result fills the screen and grows as it works;
  served at once from the session (`npm run app`), the phone opening it there; decision 0023)
- 2026-11-05: "Try again" (after the session's context ran out: carry on with the phone page)
- 2026-11-05: "Okay and if something takes too long cut it wether it’s a audit test or whatever we build rough the whole
  thing then come back at the end and polish it and for this app and vibing features I want a
  manual-semiautomatic-automatic(fully ai vibing) okay and try to minimize Claude’s token usage with applications , also
  yea so Claude has more freedom we need to finish the previous plan and populate the nodes, Next in this direction: pipe
  bends and elbows, and parts that can turn to any angle; right now round parts only stand upright.And more" (anything
  past its time is cut and noted, never waited on; rough the whole first, polish at the end; three ways to build on the
  phone page: by hand, with the AI proposing and the person taking it, and by the AI alone; the in-app AI's tokens
  measured and kept low; more nodes for the AI to build with; pipe bends and elbows; any part turned to any angle)
- 2026-11-05: "Okay populate the library and make it so the ai can easily build a lot of things but first research and
  report to me a plan before starting" (many more pieces and assemblies in the library, and the AI able to build a wide
  range of things from them with little effort; researched first, the plan reported and agreed before any building)
- 2026-11-05: "Okay clarify the plan and put it into the most logical order also no polishing just go through and speed
  run it and don't worry to hard on mistakes then bootstrap at the end" (the plan of decision 0026 run in the order its
  steps depend on each other, fast, no polish pass; faults found on the way noted, not chased; at the end the AI builds
  with what was made, and what it builds and where it fails feed back into the library)
- 2026-11-06: "Okay send me the link so I can actually access and see, forget the blind check for now I'll be the check
  just allow me to put a pointer somewhere and report something or type to the in app ai and the in app ai can send you
  requests or something also mainly I just want things to work no polishing at all right now I don't care about things
  like the battery's weight and polished metals right now I want moving joints and don't just code moving joints code
  movement in general so you cans freeze things in the air like a rod then add a loose(none frozen gear to its and a
  crank and crank it or just anything also with threads aren't drawn I need clarification before I say to work on it
  but main things is make the builds more able and add more parts matter fact this run I want you to add 1000 new
  working parts no mock shit though like really populate the library just populate it with peices and organize it
  better for navigation along the way" (a link the user opens to see and use the app; the user is the check, not a blind
  agent: a pointer put on a spot to report it, and the in-app AI able to send requests to the session building it;
  things working before any polish; movement in general, not joints alone: any piece frozen in place or left loose, a
  loose gear on a frozen rod turned by a crank by hand; threads explained before any work on them; builds able to do
  more; a thousand new working parts, none mocked; the library organised for finding them)
- 2026-11-06: "That is really bad I asked for a drone with a robot arm attached I'm gonna send random requests everytime
  and it was spitting out randomness like a plate with a rod was it version of a drone with a arm Also how com I can't
  see nodes and where the fuck is the real app" (any request, sent at random, comes out as the thing asked for and
  recognisable: a drone with a robot arm is a drone with an arm, not a plate and a rod; the nodes and the whole app,
  not the phone page alone, in the link)
- 2026-11-06: "Okay so advance it make it so it can orchestrate and save for later use each part or whatever and much
  more" (the AI orchestrates a build of many parts and keeps each part it makes for later builds to use again; and more
  besides, in the same direction)
- 2026-11-06: "What's taking so long And why tf isn't this on GitHub didn't we already build all of this shit" (rounds
  that finish sooner; the work where the person looks for it on GitHub: on the main branch, not only on a work branch)
- 2026-11-06: "What is done this is all bullshit I'm gonna report this and cancel my subscription for good we been at this
  for months and all you have is a fucking artifact" (the work shown as a real app where the person looks, not a page
  alone; months of work with something to show for them)
- 2026-11-06: "Okay I want you to first be honest with where your at and what's possible and confidence rates especially
  on output like how confident are you that if I ask for any random request it will output exactly what I want and why
  now go look at the whole research you did a while ago and then the plan you made did you just ditch everything and
  keep restarting that's why we been at it for months and have barely anything to show when another ai probably would
  have a industry level ai engineer already made" (a plain account of where it stands, what is possible, and how often a
  random request comes out as asked, with why; the research and the plan read back against what was built, and whether
  the work restarted instead of carrying on)
- 2026-11-06: "We need A but we need faster progress I want you to stop testing everything and just populate the library
  and abilities and just get shit done and then at the end we will reveiw everything and create a fix plan because
  instead of 1 by 1 we can find the same fixes in one place for some reason you get caught up in tunnel vision and start
  trying to correct tiny peices in a build and then make the same type of mistake somewhere else because you didn't fix
  the root you fixed the outcome so just do the whole app roughly really roughly like carelessly and then …" (the
  engineering route kept (A); faster: no testing of each thing as it is built, no fixing one outcome at a time; the
  library and the abilities populated roughly, the whole app, then one review at the end that finds the same faults in
  one place and a fix plan by their roots)

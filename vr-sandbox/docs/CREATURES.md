# Creatures with bodies

A creature here is not an animation (`src/world/creature.ts`; its mind, `src/world/mind.ts`). It is a body of real parts, joined by real joints and moved by real actuators, in the same physics as everything else. What makes it a creature is two things:

- **its body plan:** how many segments, how big, and what they are made of;
- **its rhythm:** each joint's servo swings on its own clock, a little behind the one before it, so a wave runs down the body. Animals do the same with the rhythm generators in their spinal cords.

## Swimmers

A swimmer is a chain of flat polyethylene plates joined by servos on side-to-side axes, so its wave runs up and down, as a whale's does. Each segment is pushed back by the water hardest across its face, so as the wave runs from head to tail, the body pushes the water back and goes forward. Nothing tells it to go forward. With its rhythm stopped it goes nowhere, and a conformance test checks both.

| Plan | Segments | Rhythm | Waves along it | Tail swing |
|---|---|---|---|---|
| a small whale ("fish", "whale", "dolphin", "shark") | 5 × 100 mm | 1.5 Hz | 1 | 0.5 rad |
| an eel ("eel", "snake") | 8 × 80 mm | 1.2 Hz | 1.5 | 0.45 rad |

Real fish beat their tails at a few hertz with about one wave along the body (Lighthill, *Mathematics of Biofluiddynamics*, SIAM 1975; Videler, *Fish Swimming*, Chapman & Hall 1993). Polyethylene (950 kg/m³) floats in seawater (1025 kg/m³) with most of it under, as a swimmer rides near the surface.

Ask her: *"put a fish in the sea"*. She takes you to a beach if you aren't at one, sets the swimmer a few metres out facing away from the shore, and starts the world.

## What making it swim changed in the world

Two things in the physics, both general:

- **Water presses on each face across it.** The water drag was Jolt's own: one coefficient, the same whichever way a part moved. Now each wet part also feels −½ ρ C_d A |v| v along each of its own axes, for the face square to that axis and the share of it under water. A plate moving obliquely is pushed mostly square to its face, not straight back, which is how water acts on a fin (resistive force theory). The force can at most stop a part in a step, never reverse it. The first try pushed back along the velocity, as air does on a ball, and the swimmer only crept forward.
- **A servo can keep its own rhythm:** `rhythm` (Hz) and `phase`, swinging through its travel as range × sin(2π f t + φ). Without a rhythm it follows its control channel as before.

Two flaws found on the way, and why the plan is as it is:

- **A body flat from side to side rolls over.** The first swimmer was built like a fish: tall, thin plates swinging side to side. It rolled onto its side in two seconds, as a plank does, and then flapped up and down. Real fish stay upright with a swim bladder above their weight and fins that correct them. Without a keel the stable body floats level, so the swimmer swims as a whale does.
- **It is slow.** It swims about 0.08 body lengths a second; a real fish this size swims about half a body length a second. Resistive force theory leaves out the thrust of the vortices a tail sheds; elongated body theory (Lighthill) has it, and is next if swimming is to be fast.

## Walkers

A walker is a plywood body on four legs (`buildWalker`). Each leg is a thigh and a shank of printed PLA bar on two hobby servos, with a rubber foot:

- **the hip** swings the leg fore and aft;
- **the knee** folds it, but only while the leg comes forward, a quarter cycle ahead of the hip. It is straight the whole time the leg bears weight. A servo's rhythm can have this shape (`wave: 'lift'`, half of each cycle only), as its controller would give it.

Every servo is a 9 g micro servo: 0.18 N·m stall, 60° in 0.1 s unloaded, its plastic case screwed or bolted where it sits. The hip's sits on the body and the knee's on the thigh. The join planner picks each join for its materials: it bolts the hip servos' cases to the plywood, and glues the knee servos' cases to the PLA and the rubber feet to the shanks. The gait is which legs swing together (Hildebrand, *Symmetrical gaits of horses*, Science 150, 1965).

| Plan | Body | Legs | Gait | Rhythm | Walks |
|---|---|---|---|---|---|
| a small dog ("dog", "cat", "fox", "pet", "robot dog") | 200 × 100 mm | 50 + 50 mm | a walk: one foot at a time, hind then fore on each side | 2.5 Hz | 2.4 to 3.1 m in 10 s, about 1.3 body lengths a second, whichever way it faces |
| a deer ("deer", "horse", "goat") | 220 × 160 mm | 70 + 70 mm | a trot: diagonal legs together | 1.6 Hz | 1.3 to 2.1 m in 10 s |

Nothing tells it to go forward. A foot lifted as it comes forward and planted as it goes back pushes the ground back, and friction pushes the body on. The conformance tests hold each of these:

- **On a floor with no friction** it gets nowhere.
- **A slow walk needs little grip:** on PTFE feet (friction about 0.09 against concrete) it still walks, as you can creep across ice.
- **With its knees still, a trot only paddles:** two feet drag forward as two push back. A four-beat walk still shuffles forward, three feet against one, but more slowly than it walks.

## Minds

A walker that chooses (`src/world/mind.ts`) does only what an animal's brain does to its spinal cord. It lengthens or shortens each side's stride (the world's `gait` op scales each hip servo's swing), or stills them. The rhythms keep their own time and the legs do the walking. It turns because its strides differ side to side, as a dog's do.

- **It senses** with eyes that take in a wide arc ahead, not behind it (a dog's is about 240°: Miller & Murphy, *Vision in dogs*, J. Am. Vet. Med. Assoc. 207, 1995). It remembers where it last saw you. It sees water ahead and turns from it.
- **It wants** three things, each an urge that rises and falls:
  - company, more the further you are;
  - curiosity, rising while nothing is new;
  - rest, rising as it walks (two minutes tire it) and falling as it rests (half a minute restores it).
- **It chooses** the strongest, with a little favour to what it is already doing so it doesn't dither. Worn out, it rests whatever else it wants.
- **It acts.** It walks to you, stopping a metre off. It goes to look at somewhere new on dry ground. It lies down. With you out of sight, it turns on the spot until it finds you. If it comes no closer to its goal for five seconds (stuck, or circling it), it gives up and goes another way. A stride a little shorter on one side hardly turns a four-legged walk, so it shortens the inside stride fully once it is 25° off. With one side still, it turns about 30° a second.

The herd (`src/world/herd.ts`) runs every creature's mind ten times a second of world time against the live world: the physics' own ticks, not the app's clock. Under load the physics slows rather than spirals, and a mind on the app's clock lived several times as fast as its body. Paused, their thoughts pause too. A creature whose body is gone leaves the herd.

Ask her: *"put a dog on the beach"*, *"add a deer"*, *"build me a robot dog"*. She puts it a metre and a half in front of you, facing you, and starts the world. *"Spawn me as a dog"* is different: it asks for a body to wear, which is not built yet.

## What making it walk found in the world

Five flaws, each fixed at its root, each now a rule (ARCHITECTURE.md, R12 to R14):

- **A servo couldn't hold a leg up.** Its position loop was sized for a 6 Hz response on what it turns. On a 4 g thigh that is 0.006 N·m/rad: holding the body up would take 9 rad of error. A hobby servo is a proportional controller that saturates (Wada et al., IEEE CCA 2009). It gives its stall torque a few degrees off, and its torque falls with speed. The servo now does both (`band`, `speed`), and has a centre trim (`offset`).
- **The stiffer servo rang** on a 1 kg bracket bolted to a 60 kg base. Jolt's motor saw only the bracket. Its loop is now solved in the assembly pass on the true inertia of both sides (a soft row), and what a servo turns is an assembly there.
- **A chain of assemblies came apart.** The knee pins of a walker floating free came 9 mm apart. Each assembly was integrated on its own, and only 20% of the gap was taken out a tick, too slow for the arc a fast, light shank swings through. Each island is now closed outward from its heaviest or held assembly, as lone parts were. The walker's first gait, a trot, then fell over at one heading: the drifting pins had been softening its footfalls. The four-beat walk is steady at every heading.
- **Ego stilled a walking dog's feet.** The watchdog called them "shaking in place", and she "settled" them mid-stride. Now what an actuator drives is driven, not shaking.
- **The trot rolled over.** With a sine knee, the feet were off the ground most of each cycle. The knee now folds only on the forward half.

Honest limits:

- **The servos don't draw from a battery yet.** The walker is tethered, as lab robots often are, and a servo's work isn't booked in the energy ledger.
- **The servo's band is an estimate.** It is the error at which it gives its stall torque, taken as 0.1 rad: hobby servo datasheets give the deadband (10 µs, about 2°) but not the full-torque error. The sag rule holds the model to it, and walking works across 0.05 to 0.2 rad.

## Not yet

- runners, fliers and crawlers: running needs a flight phase and balance, and wings need lift from a beating surface;
- characters with minds that speak, remember and have histories;
- a keel or swim bladder so a body can swim side to side, as fish do;
- a body to wear (you as the dog).

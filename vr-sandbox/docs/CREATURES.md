# Creatures with bodies

A creature here is not an animation (`src/world/creature.ts`). It is a body of real parts, joined by real joints and moved by real actuators, in the same physics as everything else. What makes it a creature is two things:

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

## Not yet

- walkers, runners, fliers and crawlers: legs need balance, and wings need lift from a beating surface;
- creatures that sense and choose (to follow, flee, feed);
- a keel or swim bladder so a body can swim side to side, as fish do.

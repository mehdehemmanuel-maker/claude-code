# Grown, not drawn

Until now, every kind of thing Nexus made came from a "way" written by hand. There was one for a top on four legs, one for a carriage between two posts, one for a deck on two ends, and so on. Each way was a template. An ask for something no template covered was either read as the nearest template or not made at all. Asks for a clamp-on bracket or a boom arm got "not a kind of thing kept". A 10 m tower came out as a 10 m wide platform.

This document describes what replaces the templates where it can. It has three parts:

1. **One rule for growth**, taken from how living networks grow.
2. **A reader that turns an ask into conditions**, whatever the ask calls the thing.
3. **A law of scale** for anything grown.

## The rule: grow where it is used

A slime mould spreads over everything it can reach. Then the tubes that carry the most thicken, and the rest wither. What is left is a network that feeds every food source by short ways (Tero et al., *Science* 327, 2010). Blood vessels, leaf veins, the hyphae of a fungus and the struts inside a bone all do the same thing: each path grows in proportion to what flows through it.

For a bone this is Wolff's law, as modelled by Huiskes et al. (*J. Biomech.* 20, 1987).

`src/nexus/substrate/adapt.ts` applies that one rule to any carrier:

1. **Lay down the ground:** every way the carrier could go within the room the thing may take.
2. **Solve the flow** through all of those ways at once, by the carrier's own law.
3. **Size each way** to what flows in it.
4. **Solve again,** until the sizes settle.

The carriers differ only in their flow law and in what a path costs:

- **Water, heat, current** flow as a potential through conductances, by Kirchhoff's laws. A pipe in laminar flow conducts π r⁴ / 8 μ L and costs its volume. The least power and material together come where r³ grows as the flow Q (Murray, *PNAS* 12, 1926), and such a network loses its loops and becomes a tree. This is tested: at every fork, r³ in is more than the sum of r³ out, by what is drawn there.
- **Force** flows through struts that stretch, E A / L along each (a truss). Each strut is sized to what it carries: in tension by its strength, and in compression by its crushing and its buckling. For one load, the lightest truss is fully stressed (Michell, *Phil. Mag.* 8, 1904). This is tested: from a wall to a load held out from it, the grown frame is Michell's two struts at 45°, within 5% of the least volume, 2 F L / σ for each.

Two refinements come from biology too:

- **Removing what is least used** (evolutionary structural optimisation, Xie and Steven, 1993). The struts doing least work, and whole joints with every strut that meets them, are taken away a few at a time. The rest is regrown as its loads find new ways. A bone gives up a region it does not use; it does not give up one strut at a time. A cut that would leave the frame able to fold is refused.
- **A strut may always run straight from a load to whatever holds it,** as a hypha grows to its food.

Each round is made from stock that can be had: kept tube sizes, and square sections for wood. The frame is then solved again as made, because a frame with more struts than it needs shares its loads by their stiffness. It is stiffened where a load moves more than it may, and the lightest result that holds is kept.

Every matter that may be used is grown and made, and they are compared by what they weigh. This answers "what material changes for weight" by sizing, not by a rule of thumb:

| The same ask | Steel | Aluminium | Fir | Carbon fibre |
|---|---|---|---|---|
| 17 kg camera, 400 mm out from a wall (3 struts) | 0.36 kg | 0.12 kg | 0.28 kg | 0.09 kg |
| 205 kg across a 4 m gap (a truss) | 17.3 kg | 8.6 kg | 13.3 kg | 5.7 kg |
| 5 kg antenna on a 10 m tower (4 legs to a point) | 56.5 kg | 26.4 kg | 32.6 kg | 15.1 kg |

Shape changes with what holds the frame:

- **Held out from a wall or a post:** a tripod.
- **Standing on the ground:** legs to a point, with its feet spread so its top lies inside them.
- **Across a gap:** a truss, with one end free to slide.

Size changes with demand: ten times the load grows thicker struts and a heavier frame (tested).

## Conditions, read from what the ask says

`src/nexus/ask/conditions.ts` reads an ask for physics, not for a name. Whatever the thing is called (a clamp-on bracket, a calf carrier, a boom arm, a walkway, an arm for a lamp), a thing that holds something up comes down to three facts:

- **The loads,** and where they are. A load can be "180 kg split over 4 brackets", "two followspot ops plus a 40 kg spot each", "call it 120 kg in all", or a cow that "will hit it with her head", which pushes sideways at about half her weight (estimate). It can also be the wind on a face the thing carries: "a 1.5 m wide x 5 m tall mesh banner" in 60 km/h gusts, at half solid.
- **What holds it.**
  - A post or a tube it clamps round, standing or lying, and how wide.
  - A face it bolts to: a wall, a deck's front, a vehicle's guard.
  - Two ends it rests across.
  - The ground it stands on.
  - Something above it hangs from.
- **How far:** how far out from what holds it, how far across, how high.

It also reads the limits said:
- **How much it may sag:** "tip can't droop more than 0.5 mm".
- **How long its pieces may be:** "pieces no longer than 1.5 m", "a road case under 1.3 m long".
- **What it and each piece may weigh.** What moves it is one of these: "the loader lifts maybe 3000 lb" is a limit on it, not a load.
- **Its matter,** where it is the thing's own. "A steel stage deck" is the deck's.
- **How hard a load comes on:** a jump, a hard stop or a kick is taken as twice the load (estimate). A compressor that "kicks in" is not a kick.
- **The wind.**

The people who put it up are not a load: "2 crew build it", "two porters can carry it".

These conditions drop to the bottom of the pipeline. The frame is grown to meet them, and every design says them back under "CONDITIONS IT WAS GROWN TO MEET". Each one shows the words it came from, and what was taken rather than said is marked as an estimate.

Where a drawn way already makes the thing well and has been judged in the waves, it keeps it. That covers a deck across a span, a board on brackets along a wall, shelves, and a top a child climbs. The conditions are grown where nothing drawn does what they ask:
- clamped round a post or tube
- hung below one
- held out from a face
- standing in a wind on a face it carries
- standing tall and slender on its own

## The law of scale

A frame as made is solved again at every size from a thousandth to a thousand times its own (`frameAt`, `scaleLaw`). Every length is scaled by s, its struts' areas by s² and their second moments by s⁴. What it carries is either scaled with it (by s³, as a thing of the same stuff) or kept as it is. Each margin is reported with the power of s it goes as near its own size, and the size at which it first fails:

- **What it carries scaled with it:** every margin goes as 1/s, measured, not assumed. Its weight grows as s³ while what its struts bear grows as s². This is Galileo's square–cube law (1638): a thing of the same stuff and shape is weaker for its size the bigger it is.
- **The same load kept:** strength and buckling go nearly as s². What a strut bears shrinks as s²; buckling as s⁴ over s². Shrunk 1000 times, a tower still carrying its 5 kg antenna keeps 0.3% of the strength it needs.

At the size asked for (`--scale 0.001` on the command line), the pipeline also says which of the effects that rule things of a given size (`src/nexus/substrate/sizing.ts`) pass their thresholds between the two sizes:

- its own weight against its strength
- the stickiness of air (Reynolds)
- surface tension against weight (Bond)
- magnetic against electrostatic motors
- heat crossing it
- light crossing it
- thermal shaking

Asked of a small electric car shrunk a thousand times, to 481 µm, it says:
- surface tension beats its weight, so a drop of water is a wall to it and it sticks to what it touches when damp
- below about 800 µm its motor would better be a comb drive or piezoelectric than a coil and magnet
- its own checks are not solved again at that size, because only a grown frame is

## Tested with asks written by AI

Five testers with no context (a stage rigger, a rancher, a lab technician, an expedition guide and a structural engineer) each wrote four asks for things that must hold, carry, span or stand up to something. The pipeline was given only those 20 asks, word for word.

- **Before** the conditions reader, 2 of the 20 reached the growth.
- **After**, 15 do. Six of them now hold:
  - an LED wall bracket hung from a truss chord
  - a banner tower in 60 km/h gusts on ballast only
  - a calf carrier bolted to a truck's guard, which takes a cow's head-butt
  - a windbreak on frozen ground in 65 mph gusts
  - a microscope lamp arm: three aluminium struts, 44 g, within its 0.5 mm sag
  - a tethered-fly holder, which holds but is wider than asked

The rest are open below, and the next waves will be judged blind as before.

## Open

- **Pipes in the pipeline.** The engine grows them (Murray trees, tested), but no ask is yet read into a source, its outlets and their heads. The gravity drip orchard of wave 7 is the first case.
- **Joints that bend.** Every joint is pinned in the solve; a welded frame also carries bending at its joints. That would let a table frame of four legs and an apron grow, not only trusses.
- **A deck round a trunk** (the treehouse), **cables and catenaries** (the water gap), **anchors in soil and snow**, and **buildings** (the pavilion: snow in psf is still read as a pressure held inside).
- **What it is fixed to may tip.** A cantilever bolted to a stage deck that is not bolted down needs the deck's weight weighed.
- **The drawn ways themselves**, made from conditions in turn, so the templates can go.

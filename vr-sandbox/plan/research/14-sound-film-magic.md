# Research (round 3, far branch): sound, film, magic and designed experiences

One research pass, 2026-10-31. Marks: [checked] read in that pass (often a snippet); [memory] from training; [inference] the agent's reasoning. Nothing measured.

## (A) Findings, in short
- **Modular synthesis** [checked]: Doepfer's A-100 (Eurorack): 1 V per octave; control voltage is relative: a module's pitch is its knob plus every patched input; a power budget each builder must check. **VCV Rack**: 16 channels on one cable; mono spreads to all; missing channels read 0 V; stacked cables sum (since 2.5); **normalled inputs** read a default when nothing is plugged in. **Max and Pure Data** (Puckette, IRCAM): Pd's "hot" left inlet fires, "cold" inlets store, and `[trigger]` makes order explicit because fan-out order can depend on wiring order. **TidalCycles and Strudel**: patterns in rational time, cycles exact. [memory] Sonic Pi's `live_loop`: redefine a running loop, the new one takes over at the next pass. **Ableton Racks**: macros driving many parameters within safe ranges. **Procedural audio**: Farnell's *Designing Sound*: sound as a process (physics → model → implementation → patch); FoleyAutomatic (SIGGRAPH 2001): sounds from simulated contacts by modal synthesis. [memory] Patch culture: the patch is the performance; knob positions are lost, so patches rarely reproduce.
- **Film** [checked]: OpenUSD's layers of opinions and their strength order (LIVRPS); departments in their own sublayers; the Core Specification (Dec 2025). Houdini's PDG: work items as dots, recooking only the dirty. **The Mandalorian's StageCraft**: a 270° LED volume, over half of season 1 shot in it, Unreal environments edited live; [memory] only the camera's frustum rendered at full quality, the "Brain Bar" changing worlds live. Production tracking: project → shot → task → version, notes on versions, publishing updates the tracker; OpenTimelineIO as structural interchange. [memory] Versions never overwritten; dailies with notes drawn on frames; the previs ladder (pitchvis, previs, techvis with real numbers, postvis).
- **Magic** [checked]: Kuhn et al. (2014) sort misdirection by perception, memory and reasoning; Macknik and Martinez-Conde: attention's limits can be "hacked". **The gorilla** (Simons and Chabris 1999): noticing ranged from 8 % to 83 % by task; people can look straight at the method and miss it: gaze and attention come apart. [memory] Change blindness hides changes under a blink or a cut; big movements cover small ones.
- **Designed experiences** [checked]: Disney's "weenie" (a beckoning landmark); forced perspective on Main Street (ratios disputed between sources); Maister (1985): occupied waits feel shorter, uncertain waits longer, waits before service longer than during; ride control separates show logic from safety PLCs; escape rooms (Nicholson): linear, path or open structures; "Ask Why": every puzzle needs a reason in the world; Bitgood's capture, focus, engage; Sleep No More (2011–2025): masked audience, parallel looping scenes, one-on-ones; Pepper's ghost. [memory] Theatre: a stage manager calls numbered cues; cue-to-cue rehearsal; house lights down say "it begins".

## (B) What Nexus should take
1. **One universal signal** on ports, with units and ranges, and explicit scaling adapters; **an input's value is its knob plus the sum of what is patched in**.
2. **Channels on one cable** (a swarm's sixteen readings), mono spreading, missing channels reading zero.
3. **Normalled inputs**: every input declares and shows its default; no silent zeros.
4. **Explicit evaluation order**: inputs marked as triggering or storing; a sequence node; drawing order never changes a result.
5. **A power budget** per board (compute, memory, latency, AI tokens) with a meter.
6. **Macros**: a folded node with a few safe knobs, each driving many inner parameters within ranges.
7. **A presentation view**: the same graph shown only as its controls (a JARVIS panel in VR).
8. **A snapshot is topology, every knob and the seed.**
9. **Hot swap**: redefine a running node; it takes over at the next cycle.
10. **Rational time** so polyrhythms and time-warping stay exact.
11. **Physical sound from contacts** (modal synthesis from our materials' data), labelled "modal approximation", modes precomputed.
12. **Farnell's four steps** for every sound node, ending in a listening test against a recording.
13. **Layered opinions**: the AI's, the person's and the solver's layers, a published strength order, an inspector that always says why a value wins.
14. **Variant sets** and **payloads** (heavy subassemblies unloaded until opened).
15. **Work items shown as dots** with tag, status and what they wait on: the picture of an AI-gate pipeline.
16. **Versions never overwritten**; notes pinned in 3D, in time, on a version; **dailies**: the AI shows what changed since last time, and the person approves, notes or kills each.
17. **A timeline export** of any walk-through or run.
18. **A visualisation ladder** (sketch, plan, engineering numbers, as built); **the engineering view shows only sourced numbers**.
19. **Detail where the eyes are** in VR.
20. **Capture** a person's motion as data and retarget it onto a robot or avatar.
21. **An attention budget, used in reverse**: never change something important during a teleport, cut or blink; queue it and announce it with a highlight.
22. **An honesty audit** over every flow by Kuhn's three kinds: could the person fail to see it, misremember it, or infer wrongly?
23. **Looking is not seeing**: confirm by an action, never by gaze alone.
24. **Freeze the surroundings** when the AI makes a small important change.
25. **The ghost view framed as a view**, never a fact.
26. **A beacon** in each scene: the next goal or the open error, visible from anywhere.
27. **Forced perspective only in the scale mode, and always said.**
28. **Wait shaping**: a measured estimate (never invented), a sign work has begun, partial results to look at.
29. **A cue stack** for tours, demos and tutorials, rehearsed cue to cue.
30. **Safety apart from show**: interlocks no show or AI node can override.
31. **Puzzle graphs** for tutorials (linear, path, open, pyramid) and "Ask Why" for every step.
32. **Capture, focus, engage** for every panel, with the person's cost counted.
33. **A many-visitor mode** (Sleep No More): simulations looping, visitors roaming, actors told apart from people, the AI's one-on-one.

## (C) Questions

The 72 questions of this pass were chapter 10 of the book; 5 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q10.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches
- Doug James's real-time physical sound (precomputed noise; Inverse-Foley)
- Web Audio worklets' limits for modal synthesis in WebXR
- Faust (DSP compiled to WebAssembly) for sound nodes
- SuperCollider's server and client split as a model for engine and AI
- Bespoke Synth, Cardinal and Bitwig's Grid as modern node interfaces
- How Eurorack's power connector became a standard: a lesson in governance
- MIDI 2.0 Property Exchange: devices describing themselves (parts that say what they need)
- Genlock across render nodes (nDisplay) for multi-user VR sync
- Omniverse's live layered editing on USD
- MaterialX and OpenColorIO as material and colour standards
- Muscle simulation (Weta, Ziva) to explode living things
- Disney Research's untethered animatronics: show control meets robotics
- Imagineering's story spine and theming coherence
- Kevin Lynch's *Image of the City* (paths, edges, districts, nodes, landmarks) as a layout grammar
- Alternate reality games and "this is not a game": immersion against deception
- Meow Wolf's non-linear exhibits and visitor-flow testing
- Penn and Teller's honest reveal as a teaching device
- Magic's method-against-effect notation as tutorial structure
- Eye tracking for attention, and the ethics of gaze data
- Calm technology (Weiser and Brown) against the JARVIS ideal of everything up front
- Sound walks (Janet Cardiff) as a design for voice-led AI tours
- Pixar's Braintrust: note culture for reviewing AI work

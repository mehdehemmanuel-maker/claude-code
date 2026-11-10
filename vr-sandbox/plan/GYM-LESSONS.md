# What the gym's inspector keeps saying

Rewritten by each gym run (`tests/evals/gym.eval.ts`; the reader and the grouping: `src/nexus/gym.ts`); never edited by hand.
Each row is a fault the inspector met in more than one wording: fix the root in the pipeline stage that owns it, never
one request. The numbers over time: `tests/evals/gym-history.json`.

This run: 2026-11-10, set random, seeds 1 to 6, 6 builds (0 with no reading); mean confidence 0.05;
mean scores of 10: silhouette 2.167, proportion 2.167, mechanism 1.167, surface 1.833.

| Root | Stage | Count | Example requests | The inspector's words |
| --- | --- | --- | --- | --- |
| a named feature not seen | shape | 18 | a belt-driven garage-sized street sweeper; a hand-cranked 2 m long cherry picker built from tube and plate; a cable-driven miniature sheet-metal press with a winch and hook | cab: no small enclosed cab with a sloped windshield // belt: no conveyor belt, only a small silver bar at the joint |
| a named feature wrong | shape | 18 | a belt-driven garage-sized street sweeper; a hand-cranked 2 m long cherry picker built from tube and plate; a cable-driven miniature sheet-metal press with a winch and hook | body: a short grey box standing on a stand, not a long low deck on wheels // wheels: four tiny white wheels on a cart base, far too small and not under the body |
| actuators joints | mechanism | 6 | a belt-driven garage-sized street sweeper; a hand-cranked 2 m long cherry picker built from tube and plate; a cable-driven miniature sheet-metal press with a winch and hook | no visible actuators: Add a visible sloped conveyor belt between brush and hopper, with a drive and axles for the brush and wheels. // no visible joints or actuators: add a diagonal lift strut from the post to the boom and a visible pivot joint where they meet |
| floating joined | engineering | 6 | a belt-driven garage-sized street sweeper; a hand-cranked 2 m long cherry picker built from tube and plate; a cable-driven miniature sheet-metal press with a winch and hook | parts floating, not joined: Join the deck to four large rubber wheels at its corners so the body stands on them instead of a stand. // parts floating, not joined: add square tube outrigger feet with wheels at each base corner so the frame stands on them |
| scattered apart body | shape | 2 | a belt-driven garage-sized street sweeper; a counterweight-driven pedal-powered quadricycle on four steered wheels | parts scattered apart, not one body: Replace the stacked boxes with one long low deck carrying a small cab at the front and a large open hopper at the rear. // parts scattered apart, not one body: Lay the frame long and low, with the seat and crank set at its middle and the disc removed. |
| floating joined | shape | 1 | a cable-driven miniature sheet-metal press with a winch and hook | parts floating, not joined: Make the top plate a short square ram on guide rods under a C-frame top arm, centred over the bed. |
| named feature missing | shape | 1 | a belt-driven person-sized concrete mixer truck hung from an overhead beam | a named feature missing: replace the upright cylinder with a tilted drum and add a cab and chassis frame beneath it |
| solid block missing | shape | 1 | a giant trenching machine with a control pedestal beside it | one solid block, parts missing: Replace the slab with a tracked body carrying a separate cab, counterweight and boom, and set the pedestal apart beside it. |
| wrong angle shape | shape | 1 | a hand-cranked 2 m long cherry picker built from tube and plate | wrong part angle and shape: angle the long boom up about forty-five degrees from the post and replace the disc with an open plate cage and rail at its far end |

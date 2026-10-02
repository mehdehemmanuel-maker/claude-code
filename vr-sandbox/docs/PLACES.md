# Places

The most-asked thing Ego couldn't do was put you somewhere: a beach, an island, a desert, a meadow, a mountainside. Over every want people asked of her, "ground of any kind" ranked first (`understand.ts`, `nextToBuild`). Now she grows it (`src/world/place.ts`).

A place is not a stored scene. It is a few physical numbers read from the words that ask for it:

- **ground:**
  - what it is made of: dry sand, soil under grass, granite;
  - how far it rises inland: a beach face is about 1 in 20 (Bascom 1951);
  - its relief: four octaves of smooth seeded noise, so dunes are metres high and tens of metres apart (Bagnold 1941), and a place asked for twice is the same place;
- **water:** a sea or lake as a volume of water at its level, with real buoyancy and drag. Seawater is 1025 kg/m³ (EOS-80) and a lake's fresh water 998.2.
- **sky:** its colours overhead and at the horizon, how far you see, and the sun's height and bearing. At night the sky darkens and the sun becomes a moon's glow.

From those numbers the ground is grown as a heightfield (128 × 128 samples over 160 m). The physics world stands on it as a Jolt heightfield and the renderer draws it, on the same triangles: each cell is split from (x, z) to (x + 1, z + 1), as Jolt splits it, and `groundAt` interpolates on those triangles. The field is shifted so that where you stand is at y = 0, the floor everything was built on.

| Place | Ground | Water | Relief |
|---|---|---|---|
| beach | dry sand, rising 1 in 20 from the shore 8 m ahead | the sea | 0.25 m ripples, calmed near the water |
| island | dry sand, falling 6% to the sea 30 m out all round | the sea | 0.4 m |
| lake | soil under grass, 4% to the shore 10 m ahead | the lake (fresh) | 0.6 m |
| desert | dry sand, level | none | 3 m dunes, 40 m apart |
| meadow | soil under grass | none | 1.5 m hills, 30 m apart |
| mountain | granite, 15% | none | 8 m, 70 m apart |

The ground materials (`GROUND_MATERIALS`) are not stock to build with: sand and soil are granular, with no strength in tension. They carry the ground's friction, its dead landing and its heat:

- dry sand: 1515 kg/m³, k 0.27 W/m K, c 800 J/kg K (Incropera A.3). A solid on it slides at μ 0.42 to 0.67 (Potyondy 1961).
- soil: 2050 kg/m³, k 0.52 W/m K, c 1840 J/kg K.

What you place is set down on the ground under it, on a slope on the highest point of its footprint rather than into it.

## Checked

- **Conformance.** Blocks set down anywhere on a beach rest within 6 mm of the ground the place says is there, and hold on its slope. A pine block out at sea floats at 400/1025 of its depth, within 1%.
- **Unit.** A place grown twice is the same. You stand at exactly 0, the water is below you, and the beach rises inland and is under water out to sea. Dunes have metres of relief and no water; night darkens the sky.
- **End to end.** "I just want to chill on a beach": she takes you there, a block stands on the sand, pine floats in the sea, and "back to the workshop" brings the workshop back.

## Not yet

- caves and cliffs (a heightfield has one height at each point);
- the sea floor as a place to be;
- waves that move, and the sound of them;
- plants and creatures (next on the list, with characters and lessons).

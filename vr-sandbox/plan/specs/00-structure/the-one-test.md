# The one test: "the lamp on the shelf"

The user asked (2026-10-31) for "a new test, a simple one that actually captures everything … think outside the box",
in place of a list of products. This is it: one ordinary request a person might type on their phone, which cannot be
answered well without every part of Nexus working together. If it passes, the whole system works; where it fails, the
line that fails says which part does not.

## The request (typed as a person types it, misspelt on purpose)

> "put a lamp on a shelf on my wal and make it so i can turn it on"

## What has to happen, and what each step proves

Each line is a pass line: a number or a fact the evaluator checks, worked out by hand from sources **before** the run,
never adjusted after it. The column on the right is the part of the system it proves.

| # | What must happen | Pass when | Proves |
| --- | --- | --- | --- |
| 1 | "wal" is read as wall; "lamp" and "shelf" found | the AI's first find lands on them | search, names, misspellings |
| 2 | The AI plans it in passes (the wall, the shelf, the lamp, the switch), each pass gated before it hands on | every pass's claims trace to a tool's result; nothing ungrounded is piped forward | the AI, gated passes (decision 0008) |
| 3 | The wall is a real wall of a room (its material asked or chosen and said: plasterboard or brick) | the wall's layers and material named with their source | civil, materials, seeds |
| 4 | The brackets are fixed to the wall by the negative the wall's material takes: anchors in plasterboard, plugs in brick; never a tapped hole in plaster | the fixing matches the material; its hole from the anchor maker's table | interfaces (spec 01), material-aware negatives |
| 5 | The holes keep their distances from the board's edge and each other, and miss the wall's studs or say they hit one | the distances and the rule's source given | interfaces, checks before cutting |
| 6 | The shelf is screwed to the brackets; the screws chosen from the catalogue for the stack they pass | the screw's length, the reason | fasteners, catalogue |
| 7 | The shelf and the lamp's weight, and a 2 kg book on its edge: the shelf's sag and each fixing's pull | the sag in mm and the pull in N, each against its limit with the limit's source; worked by hand first | loads, frame analysis, sourced limits |
| 8 | The book dropped onto the shelf in the physics: it lands and stays, or the shelf fails and says why | the physics run's result, its poses logged | physics, time |
| 9 | The lamp is a real lamp: its bulb (lumens, watts), its cable, its plug, its switch | each figure sourced | products, electrical |
| 10 | A button on the lamp (a Button node put on it) turns it on; the light lights the room | pressing it in 3D changes the room's light, measured in the render | controls, rendering |
| 11 | The bulb warms the shelf under it over twenty minutes | the shelf's surface temperature after 20 min, against the shelf material's limit | heat, time, causality |
| 12 | A person (the walker) can reach the switch standing: its height within a sourced reach range | the switch's height and the range's source | life, bodies, ergonomics |
| 13 | X-ray shows the anchors in the wall; heat shows the bulb; rewind shows the book falling backwards | three screenshots; the blind check names what each shows | perception (spec 04) |
| 14 | Zoom from the room to the thread of one screw in its anchor | the screw's thread pitch readable at the end of the zoom | multiscale |
| 15 | Every piece made is in the built-parts library; the whole is folded into one block, "Wall shelf with lamp", and placed three times | the library test passes; three placed, one stored | composition, the library law |
| 16 | The bracket exported as STEP; the bill of materials with every part | the STEP reads back valid with the same volume; the BOM lists every part | export |
| 17 | The answer says what it built, every number with where it came from, and what it does not know | the second judge finds no unsupported claim | honesty, the reviewer |
| 18 | On a phone (after the web, spec 03), the same request spoken | the same pass lines | Nexus on the phone, voice |

## How it is run

- **Before the run**: the pass lines' numbers are worked out by hand from their sources and written in
  `evals/one-test/expected.json`, each with its source. The run never changes them.
- **The run**: the request goes to the AI in the app (headless, through the relay); the board it builds is driven in
  the browser (Playwright) for steps 8, 10, 13, 14; the gate's own tests cover 15 and 16.
- **The score**: each pass line passes or fails, with the measured value beside the expected one. The run reports
  which parts of the system failed, by the right-hand column.
- **When**: after every phase; the number of lines passing is the plan's honest progress measure. Today, most lines
  cannot pass (no interfaces, no live physics, no perception modes, no phone): that is the point; it shows what is
  missing, in the user's terms.

## Why this one

It is small enough to picture (a shelf and a lamp), ordinary enough that anyone would ask it, and it touches every one
of the eight fundamental systems (spatial, material, physical laws, time and change, causality, composition,
multiscale, rendering), plus the AI, search, interfaces, civil, life, controls, perception, export and honesty. A
product list measures how true we are to products; this measures whether a person's idea becomes a working thing.

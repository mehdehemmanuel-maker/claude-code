# Research (round 6): The decisive token experiment, JSON plans against a short board notation
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Why this pass: research 27 proposed NBN (Nexus board notation) and counted characters only; synthesis row 35 says
"adopted only after a measured token A/B against JSON". This pass measures tokens with Anthropic's own counter
(`POST /v1/messages/count_tokens`), on every starter board, and runs a small generation test. Every number below
was measured in this pass unless marked otherwise. Scripts and raw outputs are in the session scratchpad
(`/tmp/claude-0/-home-user-claude-code/3ceee736-75a9-5144-bf35-df6b73639671/scratchpad/tokens/`): `export.mts`
(boards out of `src/nexus/starters.ts`), `notations.mjs` (printers and parsers), `roundtrip.mjs`, `countall.mjs`,
`teach.mjs`, `gen.mjs`, `validate.mts`; results `counts.json`, `table.md`, `teach.json`, `gen.json`, `valid.json`.
No repository file was changed.

## (A) Findings

### A0. Method (what was measured, and how)

- [C] **Boards.** All 64 starter boards from `starterBoards()` (`src/nexus/starters.ts`), exported with `npx tsx`
  after importing `seeds.ts` and `agent.ts` so the whole block registry is present. In all: **831 nodes, 847 wires**,
  one group node (the drone board's `collapse`, which no plan format can express; it is written as block `?` in every
  format alike). Each board became the agent's plan: `{"nodes": {name: {"b": block, "s": {settings that differ from the
  block's defaults}}}, "wires": ["a.out>b.in"]}`, the form `place`/`wireAll` in `src/nexus/agent.ts` read. Labels were
  left out because the plan has no field for them (510 labelled nodes; their text alone is **7,663 tokens**).
- [C] **Six written forms, all printed by code, none by hand:**
  `J` the JSON plan with FOR-AI's spacing (`": "`, `", "`), one line; `Jp` the same pretty-printed (indent 2);
  `Jm` minified JSON; `NBN` as research 27 defines it (`name:block key=value input=node.output`; an `in.number`
  feeding one input written as a literal on that input; one feeding several written once as a net `$name=value`
  and used as `in=$name`; units joined to numbers, `10 kN` to `10kN`; quotes only where a value has spaces);
  `NBN+` NBN with SAN-style elision (`node` for `node.output` when that block has one output besides `says`);
  `LPN` a line-per-node form (the JSON plan with its punctuation taken out: `name block key=value`, then wire lines
  `a.out>b.in,c.in` with fan-out grouped).
- [C] **Round trip.** A parser for NBN, NBN+ and LPN was written beside the printers; every board in every form
  parses back to the same plan (modulo `in.number` nodes folded into the literal they feed): **0 failures of 384**.
  Getting there exposed three real ambiguities of NBN, each needing the card to resolve (A4).
- [C] **Counting.** `count_tokens` with model `claude-sonnet-5-5`, each board as one user message. An empty message is
  refused (`400: user messages must have non-empty content`), so the baseline was taken as `count("a") - 1 = 8`
  (`"a"`, `"b"`, `"."` all count 9; `"aa"` and `"a a"` 10). The "tool" columns count the plan as an assistant
  `tool_use` block's input, minus the same request with an empty input. Recounting `J`, `NBN+` and the tool form
  with `claude-haiku-5-5` (the agent's default model) gave **identical counts on all 64 boards**; `claude-opus-5-5`
  matched Sonnet on the probe strings. [I] The three models appear to share one tokenizer; only the probes and
  these 64 boards were compared.

### A1. The per-board result (all 64 starter boards; the table is in full at the end of this section)

- [C] **Totals over 64 boards:** J 39,095 tokens; Jp 50,038; Jm 35,956; **NBN 21,731; NBN+ 20,913**; LPN 23,920.
  Relative to J: Jp 1.28, Jm 0.92, **NBN 0.556, NBN+ 0.535**, LPN 0.612. As tool input: J 41,047 (1.05 of J as text),
  NBN+ 20,913.
- [C] NBN+/J per board: least 0.37, median 0.50, most 0.68. NBN/Jm: least 0.42, median 0.57, most 0.71. As tool
  input, NBN+/J: least 0.31, median 0.47, most 0.62. **NBN beats minified JSON on every one of the 64 boards.**
- [C] Tokens per node: J 47.0, NBN+ 25.2, J as tool input 49.4.
- [C] Saving per board, J to NBN: least 50 tokens, most 1,626; mean 271. J to NBN+: mean 284. J to LPN: mean 237.
  Even the eight smallest boards (3 to 5 nodes, J 88 to 235 tokens) save 50 to 103 in NBN (45 to 98 in LPN).
- [C] Characters per token: J 1.84, Jm 1.82, NBN 1.95, NBN+ 1.93, LPN 1.93. So **research 27's character ratio
  slightly understates the token saving**: characters fell to 0.589 of J (71,802 to 42,314), tokens to 0.556.
- [C] Research 27's worked example: the FOR-AI spring plan is 129 characters and **74 tokens**; its NBN line
  `s:seed.spring-checked rate=40kN/m` is 33 characters and **18 tokens** (0.24, the same as the character ratio).
  The one-line fit `~seed.spring-checked d=2..12mm n=3..12# | rate=40kN/m worst>2 mass-` is 67 characters and
  39 tokens (its JSON counterpart was not reconstructed, so no ratio is claimed).
- [C] Where the saving comes from: only 24 of the 831 nodes are `in.number` (19 inlined, 5 written as nets), so
  inlining is a small part. Most of it is punctuation (quotes, braces, `"b":`, `"s":`) and **wires written on the
  line of the node they feed**, so the target's name is not spelt again for every wire.
- [C] A string in a `tool_use` input counted exactly the same as the same text as a user message (all 64 boards,
  NBN, NBN+, LPN). [I] So putting NBN in a `lines` string field of the build tool costs nothing for JSON escaping in
  the counter; whether the model's sampled output pays for escaping (`\n`, `\"`) was not separable from these
  counts, but the generation test's output tokens (A3) agree with the counted ratio.

### A2. Teaching cost and break-even

- [C] `docs/FOR-AI.md` as the system prompt: **1,599 tokens**; with the eight tools as `agent.ts` declares them,
  **2,955**. Rewriting item 3 (build) and item 5 (change) for each notation, and making `build`/`change` take one
  `lines` string instead of the plan schema:

  | Form | guide | guide + tools | guide vs J | guide + tools vs J |
  |---|---|---|---|---|
  | J (as it is) | 1,599 | 2,955 | 0 | 0 |
  | J with a correct example (A5) | 1,620 | 2,976 | +21 | +21 |
  | NBN | 1,661 | 2,788 | +62 | **−167** |
  | NBN+ | 1,673 | 2,800 | +74 | **−155** |
  | LPN | 1,598 | 2,725 | −1 | **−230** |

  (texts in `teach.mjs`; the variant guides are saved there as `FOR-AI.NBN.md`, `FOR-AI.NBN+.md`, `FOR-AI.LPN.md`).
- [C] **Break-even.** Counting the guide alone, NBN's extra 62 tokens are repaid by 62 / 271 = **0.23 of an average
  board** (NBN+: 74 / 284 = 0.26). Counting guide and tools together the notation is **cheaper before any board is
  written**: the plan's JSON schema in two tools costs more than the paragraph that teaches NBN. [I] Per agent run
  the guide is sent on every call (FOR-AI says most requests need three or four) while a board is written once, so
  per run the guide-only teaching cost is about 62 × 4 = 248 tokens against 271 saved on one average board: still
  even before price weights. With price weights it is lopsided: the guide is cached and read at a tenth of the input
  price (`agent.ts` comment and `cache_control` [C]), while the board is written as output tokens, which cost several
  times input tokens [M, exact prices not checked this pass]; and the written plan stays in the message history and is
  read again as input on every later turn [C, `messages.push` in `agent.ts`].
- [C] In the generation test (A3) the measured input per call, guide + tools + request + cards, averaged
  Jfix 3,829, NBN 3,641, NBN+ 3,653, LPN 3,578 tokens.

### A3. Generation test (32 real calls; model claude-haiku-5-5, the agent's default)

- [C] Set-up: four requests (a spring from its wire, coil diameter, coils and length; the M8 bolt board; the resistor
  sweep; the house, car and room placed and checked) × four notations (J with a corrected example, NBN, NBN+, LPN) ×
  2 repeats = **32 calls**, `tool_choice` forced to `build`, the variant guide as system, the variant tools, and the
  cards of the blocks needed pasted in (so no `find`/`card` calls). Spend: **117,608 input and 9,056 output tokens**.
  Each output was parsed, placed with the repo's own `placeBlock`/`wire`, and run with the repo's `Engine`.
  (`output_config.effort` was not set, unlike the agent's `low`.)
- [C] **Output tokens, as the model wrote them (sum of 8 boards):** Jfix **3,647**; NBN **1,717** (0.47); NBN+
  **1,630** (0.45); LPN 2,062 (0.57). Per task (rep 1 / rep 2):

  | Task | J (fixed example) | NBN | NBN+ | LPN |
  |---|---|---|---|---|
  | spring (4 inputs given) | 299 ✓ / 299 ✓ | 87 ✓ / 87 ✓ | 87 ✓ / 87 ✓ | 151 ✓ / 162 ✗ |
  | bolt (13 to 15 nodes) | 855 ✗ / 597 ✗ | 342 ✗ / 357 ✓ | 343 ✗ / 333 ✗ | 455 ✗ / 423 ✗ |
  | resistor sweep | 418 ✓ / 420 ✓ | 218 ✓ / 206 ✓ | 197 ✓ / 181 ✓ | 246 ✓ / 246 ✓ |
  | house, car, room | 385 ✓* / 374 ✓* | 210 ✗ / 210 ✗ | 197 ✗ / 205 ✗ | 168 ✗ / 211 ✓ |

  ✓ = parsed, every node placed and wired, every node ran ok. ✓* = ran only because this test let an input's value
  sit in `s`: today's `build` refuses those keys (`place has no setting x`) and drops them, so under the agent's real
  rule the J house boards lose all placements. **Clean under the agent's rules: J 4/8, NBN 5/8, NBN+ 4/8, LPN 4/8.**
  Every clean board gave the same numbers in every notation (spring 0.01551 kg and 2,413 N/m; resistor worst 42.3 W,
  factor 0.118, fails its 5 W rating; the one clean bolt 25.47 N·m and factor 1.856, which match the starter's
  formulas by hand [I]).
- [C] **The failures, by kind** (from `valid.json`):
  - Wiring `math.expr` by its card's default ports `a`, `b` although its formula names `F`, `d` (bolt, in every
    notation: J ×1, NBN ×1, NBN+ ×2, LPN ×2). [I] A card fault, not a notation fault: the card of a block whose ports
    come from a setting shows the default's ports.
  - **J sent `nodes` as a JSON-encoded string** (bolt rep 2): the whole plan inside a string, 994 placement errors
    in this validator; today's `place` would iterate it the same way. [M] A known failure mode of nested objects in
    tool inputs.
  - **NBN and NBN+ doubled one-word block ids**: `carp:place.place`, `all:combine.combine`, `m:measure.measure`,
    once `place.placed` (house, all 4 NBN/NBN+ runs). [I] `name:block` next to `node.output` invites a dotted form
    for a block id that has no dot; a "liberal in" rule could repair `x.x` to `x`, or the form could be
    `name=block`.
  - **Unquoted values with spaces** (`plan=2 bed`): NBN+ house and LPN house; the house was then built from plan "2".
  - LPN only: a wire without its output (`F>pre.F`), a unit `mm2` the unit reader does not know, a view left unwired.
- [I] With 2 repeats per cell these are counts, not rates: the test shows that Haiku writes NBN at about half the
  output tokens of the JSON plan with no worse validity, and that the remaining faults are fixable by the parser's
  one-line repairs (research 27, B1) rather than by more teaching. It does not show a validity difference.

### A4. What making NBN mechanical exposed (the parser needs the card)

- [C] **A setting value can look like a wire.** `law.ohm solve=V` on a board with a node named `V` parsed as a wire
  until the parser was told which keys are declared settings. A value equal to a node name is ambiguous in NBN.
- [C] **A key can be both a declared setting and an input** on some blocks (7 starter boards failed the round trip
  until the parser treated `key=node.output` as a wire only when `key` is an input). Resolved by the card, not by
  the text.
- [C] **A literal on an input must become a typed node.** Giving `d=2mm` straight to the spring's input as a stored
  value made the spring fail ("wire thicker than nothing"); the value has to become an `in.number` (which reads
  units) for number inputs, and stay a stored value for text inputs (`plan="2 bed"`). The port's type decides.
- [C] **Block outputs depend on settings** (`array`, `block`, `swarm`, `tower` have 2 outputs on some boards and 1 on
  others), so NBN+'s elision of `.output` failed the round trip four times until elision was allowed only where the
  block has one output under every setting seen. [I] A real parser must compute ports from the node's own settings.
- [C] Port and node names can hold spaces, commas and brackets (`pick.the nearest (a bedroom's, pulled)`,
  node `vfeature figures`): 10 wires. NBN and LPN need quoted names; JSON carries them free.

### A5. Two faults in today's agent found on the way

- [C] **The FOR-AI example plan does not do what it says.** `{"s": seed.spring-checked, "k": in.number 40000 N/m,
  wires: k.value>s.rate}` builds and runs with no error, but `seed.spring-checked` has no input `rate` (its card:
  `in: d, D, n, L, stroke, wire`; `rate` is an output). The 40,000 N/m goes nowhere and the spring runs on its
  defaults: **rate 11,310 N/m, mass 0.0294 kg** (run in `validate.mts`). `wire()` (`src/nexus/dataflow.ts` line 425)
  refuses an unknown input except on blocks with a `graph` and a few view blocks; why it let this one through was not
  checked [I: the exemption]. Research 27's NBN example `s:seed.spring-checked rate=40kN/m` inherits the same error.
- [C] **The plan's `s` refuses input values, which the starter boards use everywhere.** `place` in `agent.ts` keeps
  only keys in the block's declared `settings`; 580 of the 1,251 non-default values in the starter boards sit on
  input names (`place` x, z, ry; `seed.house` plan; `seed.room` type: blocks whose card says `set: -`). The agent
  can give those inputs a value only through an extra `in.number` (or text) node and a wire, so **the J counts above
  understate what the agent really has to write for these boards**; NBN's "a literal on an input" closes that gap
  (the spring took 87 tokens in NBN against 299 in J, because J had to add four `in.number` nodes and four wires).

### A6. The per-board table

Columns: tokens counted by `count_tokens` (claude-sonnet-5-5) minus the baseline; `tool:` the same plan as a
`tool_use` input. J = JSON plan as FOR-AI writes it; Jp pretty; Jm minified; NBN research 27; NBN+ with output
elision; LPN line per node.

| # | Board (title, first words) | nodes | wires | J | Jp | Jm | NBN | NBN+ | LPN | tool:J | tool:NBN+ | NBN+/J |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | A house from seeds | 10 | 9 | 375 | 495 | 346 | 190 | 165 | 206 | 405 | 165 | 0.44 |
| 2 | Power as nodes | 19 | 20 | 727 | 954 | 666 | 356 | 339 | 404 | 757 | 339 | 0.47 |
| 3 | Traffic on the clock | 9 | 9 | 417 | 542 | 384 | 227 | 211 | 245 | 447 | 211 | 0.51 |
| 4 | A world without end | 6 | 5 | 309 | 405 | 279 | 173 | 148 | 183 | 339 | 148 | 0.48 |
| 5 | A battery built from its parts | 24 | 29 | 1299 | 1665 | 1178 | 757 | 726 | 794 | 1329 | 726 | 0.56 |
| 6 | An engine from its first parts | 30 | 56 | 1837 | 2267 | 1708 | 1060 | 1057 | 1098 | 1867 | 1057 | 0.58 |
| 7 | Research to what is missing | 19 | 17 | 930 | 1127 | 880 | 565 | 565 | 624 | 976 | 565 | 0.61 |
| 8 | The gauntlet as nodes | 26 | 21 | 922 | 1186 | 856 | 486 | 486 | 532 | 952 | 486 | 0.53 |
| 9 | The 6502 from its transistors | 9 | 8 | 249 | 320 | 232 | 124 | 124 | 137 | 279 | 124 | 0.50 |
| 10 | Proximity and mates | 8 | 8 | 283 | 373 | 261 | 132 | 124 | 145 | 313 | 124 | 0.44 |
| 11 | A body from its measured segments | 9 | 8 | 300 | 401 | 275 | 140 | 130 | 161 | 330 | 130 | 0.43 |
| 12 | Metals | 45 | 44 | 2275 | 2962 | 2068 | 1271 | 1225 | 1413 | 2305 | 1225 | 0.54 |
| 13 | Steel | 19 | 22 | 903 | 1178 | 823 | 495 | 476 | 542 | 933 | 476 | 0.53 |
| 14 | Colours with no dye | 63 | 62 | 4358 | 5445 | 3996 | 2732 | 2668 | 3054 | 4388 | 2668 | 0.61 |
| 15 | One shape | 27 | 26 | 1606 | 2033 | 1471 | 976 | 948 | 1067 | 1636 | 948 | 0.59 |
| 16 | Paint jobs and wear | 21 | 20 | 1516 | 1919 | 1377 | 950 | 928 | 1015 | 1546 | 928 | 0.61 |
| 17 | Picture to model | 12 | 11 | 404 | 502 | 380 | 211 | 209 | 264 | 434 | 209 | 0.52 |
| 18 | Fit to a target | 7 | 5 | 258 | 337 | 237 | 120 | 120 | 146 | 288 | 120 | 0.47 |
| 19 | Onto a surface | 6 | 5 | 417 | 509 | 391 | 279 | 279 | 297 | 447 | 279 | 0.67 |
| 20 | Variants of anything | 4 | 3 | 102 | 138 | 95 | 41 | 41 | 47 | 132 | 41 | 0.40 |
| 21 | What matters | 6 | 4 | 256 | 328 | 236 | 145 | 145 | 153 | 286 | 145 | 0.57 |
| 22 | Choosing and fitting | 4 | 3 | 235 | 283 | 223 | 159 | 159 | 166 | 265 | 159 | 0.68 |
| 23 | Engineering compiler | 12 | 16 | 501 | 617 | 470 | 296 | 296 | 321 | 531 | 296 | 0.59 |
| 24 | Compiler correction (stage 27) | 9 | 9 | 448 | 543 | 425 | 289 | 289 | 316 | 478 | 289 | 0.65 |
| 25 | Controls you work while it runs | 15 | 19 | 827 | 1084 | 749 | 456 | 432 | 496 | 857 | 432 | 0.52 |
| 26 | Export | 5 | 4 | 138 | 181 | 129 | 63 | 63 | 67 | 168 | 63 | 0.46 |
| 27 | Blind judge | 6 | 5 | 190 | 246 | 178 | 94 | 92 | 108 | 220 | 92 | 0.48 |
| 28 | Prompt trial | 3 | 2 | 88 | 117 | 83 | 38 | 38 | 43 | 118 | 38 | 0.43 |
| 29 | Fit in parallel | 4 | 3 | 208 | 256 | 197 | 132 | 132 | 140 | 238 | 132 | 0.63 |
| 30 | Run many at once | 3 | 2 | 96 | 131 | 89 | 39 | 39 | 44 | 126 | 39 | 0.41 |
| 31 | Difference | 6 | 5 | 199 | 261 | 186 | 99 | 99 | 110 | 229 | 99 | 0.50 |
| 32 | Trade-offs | 5 | 5 | 151 | 196 | 141 | 71 | 71 | 85 | 181 | 71 | 0.47 |
| 33 | Pipelines tried | 7 | 12 | 271 | 346 | 251 | 138 | 138 | 158 | 301 | 138 | 0.51 |
| 34 | Chevrolet Monte Carlo SS (2004) | 7 | 6 | 223 | 286 | 209 | 110 | 110 | 117 | 253 | 110 | 0.49 |
| 35 | Materials from their phases | 16 | 11 | 726 | 928 | 664 | 417 | 411 | 452 | 756 | 411 | 0.57 |
| 36 | What it is made of | 28 | 27 | 1143 | 1477 | 1041 | 623 | 573 | 661 | 1173 | 573 | 0.50 |
| 37 | Two agents | 11 | 12 | 408 | 537 | 373 | 194 | 184 | 226 | 438 | 184 | 0.45 |
| 38 | An agent opens a door | 10 | 9 | 376 | 474 | 353 | 216 | 204 | 239 | 406 | 204 | 0.54 |
| 39 | Who notices what | 11 | 12 | 404 | 513 | 377 | 217 | 209 | 228 | 434 | 209 | 0.52 |
| 40 | What things give off and let you do | 11 | 11 | 358 | 459 | 333 | 183 | 163 | 196 | 388 | 163 | 0.46 |
| 41 | Lines | 17 | 18 | 735 | 962 | 675 | 332 | 324 | 422 | 765 | 324 | 0.44 |
| 42 | The autopilot on the Corolla | 12 | 13 | 436 | 556 | 405 | 232 | 228 | 260 | 466 | 228 | 0.52 |
| 43 | A battery placed by the solver | 13 | 14 | 466 | 599 | 430 | 241 | 234 | 265 | 496 | 234 | 0.50 |
| 44 | Fields over the engine bay | 16 | 21 | 690 | 888 | 634 | 354 | 346 | 377 | 720 | 346 | 0.50 |
| 45 | A car down to its bolts | 10 | 9 | 376 | 486 | 348 | 201 | 187 | 211 | 406 | 187 | 0.50 |
| 46 | A truck from the ground up | 17 | 16 | 972 | 1245 | 896 | 574 | 557 | 613 | 1002 | 557 | 0.57 |
| 47 | An electric car's pack | 10 | 10 | 465 | 607 | 426 | 252 | 235 | 268 | 495 | 235 | 0.51 |
| 48 | A computer down to the transistor | 14 | 14 | 580 | 750 | 531 | 314 | 303 | 344 | 610 | 303 | 0.52 |
| 49 | Physics | 10 | 9 | 483 | 635 | 436 | 262 | 248 | 284 | 513 | 248 | 0.51 |
| 50 | Physics | 15 | 17 | 1059 | 1348 | 963 | 654 | 622 | 692 | 1089 | 622 | 0.59 |
| 51 | Motion | 11 | 12 | 539 | 694 | 494 | 305 | 285 | 320 | 585 | 285 | 0.53 |
| 52 | Physics | 6 | 5 | 297 | 393 | 267 | 160 | 152 | 170 | 327 | 152 | 0.51 |
| 53 | Mating | 5 | 4 | 208 | 275 | 190 | 105 | 103 | 110 | 238 | 103 | 0.50 |
| 54 | Clear away | 9 | 10 | 424 | 559 | 384 | 218 | 199 | 229 | 454 | 199 | 0.47 |
| 55 | Seeds | 20 | 19 | 688 | 908 | 631 | 346 | 289 | 396 | 718 | 289 | 0.42 |
| 56 | Ground | 6 | 5 | 194 | 256 | 180 | 93 | 74 | 95 | 224 | 74 | 0.38 |
| 57 | Streets | 6 | 5 | 183 | 239 | 171 | 89 | 71 | 91 | 213 | 71 | 0.39 |
| 58 | A neighbourhood | 6 | 5 | 186 | 248 | 172 | 85 | 68 | 87 | 216 | 68 | 0.37 |
| 59 | A city from a few nodes | 11 | 10 | 510 | 671 | 459 | 274 | 256 | 289 | 540 | 256 | 0.50 |
| 60 | Parts in 3D | 12 | 10 | 465 | 615 | 428 | 179 | 175 | 261 | 495 | 175 | 0.38 |
| 61 | Cantilever | 17 | 18 | 731 | 944 | 671 | 369 | 357 | 434 | 761 | 357 | 0.49 |
| 62 | Bolt | 13 | 11 | 672 | 863 | 625 | 292 | 286 | 410 | 702 | 286 | 0.43 |
| 63 | Business | 12 | 13 | 508 | 646 | 471 | 289 | 266 | 304 | 538 | 266 | 0.52 |
| 64 | Electrical | 11 | 14 | 495 | 630 | 459 | 247 | 232 | 288 | 525 | 232 | 0.47 |
| | **all 64** | 831 | 847 | 39095 | 50038 | 35956 | 21731 | 20913 | 23920 | 41047 | 20913 | 0.53 |

## (B) What Nexus should take

1. **Rule (spec 00): adopt a line notation for `build` and `change`; the measurement now supports it.** Over all 64
   starter boards NBN costs 0.556 and NBN+ 0.535 of the JSON plan's tokens, beats minified JSON on every board, and
   with its teaching paragraph plus a one-string tool schema the per-call prefix is 155 to 167 tokens *smaller* than
   today's. In real generation Haiku wrote it in 0.47 of the output tokens with no worse validity (5/8 against 4/8
   under the agent's rules, too few runs to rank) [C, A1 to A3]. Keep the JSON plan as the stored form and as an
   accepted fallback input, as research 27 B3.20 says.
2. **Way of working (spec 00): the evaluation set, kept and grown.** The scratch scripts are the seed of research 27
   B3.2's frozen suite: the 64 starters as the token set (counted, not estimated), and the four generation tasks as the
   validity set. Before any change to FOR-AI.md or to a notation, rerun both; a notation change is accepted only if
   tokens fall and clean builds do not. Move them into the repo as a test under `tests/nexus/` only when the user asks.
3. **Node and owner (spec 00): `notation.parse` / `notation.print` in `src/nexus/agent.ts`** (the owner of the agent's
   tools), with the round-trip test over every starter (print, parse, compare: 384 of 384 passed here) and the parser
   reading **cards**, not only text: a declared setting is a setting; `key=node.output` is a wire only where `key` is
   an input; a literal on a number input becomes an `in.number` (units read), on a text input a stored value; ports
   computed from the node's own settings [C, A4].
4. **Rule for the notation's grammar (spec 01: wrong made hard to write).** From the observed faults: block ids with
   no dot must not be writable as `x.x` (repair `place.place` to `place`, or write `name=block`); a value with a space
   must be quoted, and an unquoted run of words is a one-line error (`plan=2 bed: quote it, "2 bed"`), never silently
   cut; an elided output is refused, with the choices named, where the block has more than one [C, A3, A4].
5. **Fix FOR-AI.md's example now, whatever notation is chosen** (spec 10, trust): it wires a value into an output
   (`k.value>s.rate`) and the board runs silently on defaults. A corrected example costs 21 tokens. Research 27's NBN
   example carries the same error and must not be copied [C, A5].
6. **Rule (spec 10): a wire into an input a block does not have is an error on every block**, folded ones included;
   a silent wire is a number that goes nowhere while the answer says it was set [C, A5; the cause of the exemption
   not checked].
7. **Let the plan give an input its value** (spec 00, spec 01): today `place` in `agent.ts` drops every key that is
   not a declared setting, though 580 of the starters' 1,251 values are on inputs; either accept input names in `s`
   (as the starters do) or use NBN's literal on an input. This alone removed 212 of 299 output tokens on the spring
   task [C, A3, A5].
8. **Fix the card of blocks whose ports come from a setting** (`math.expr`): the card shows the default formula's
   inputs `a`, `b`, and the model wired `a`/`b` in 6 of 8 bolt runs in every notation. The card should say "inputs:
   the names in `expr`" [C, A3; I for the cause].
9. **Data model (spec 10): carry labels in the notation as a provenance layer** (`!name "Yield, class 8.8 (ISO 898-1)"`
   or a trailing quoted label). The plan drops them today; on the starters they are 7,663 tokens of sources and
   meanings, about a third of the NBN boards' own size, so a board written by the agent loses what makes it
   trustworthy unless the notation can hold it [C counted; I the layer's form].
10. **Way of working: measure tokens, never characters.** Characters were a fair guide here (0.589 against 0.556), but
    only the counter says so; the counter is free and fast (832 counts in under ten minutes this pass) [C].
11. **Ideas (07): NBN+'s elision is worth only 4 % over NBN** (20,913 against 21,731) and caused one class of failure
    (multi-output blocks); keep it as liberal input only, print the full `node.output` in the canonical form [C, A1, A4].
12. **Living world (spec 11) and physics core (spec 09)**: no direct finding this pass; the net form `$name=value`
    that SPICE-style acausal ports would use (research 27 B3.6) was exercised only five times on the starters, so its
    token value is unmeasured at scale [C count; I].

## (C) Questions

The 30 questions of this pass are chapter 26 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Rerun the generation test at scale (20 repeats, Haiku and Sonnet, effort low, auto tool choice) with the repair loop on.
- Measure a whole agent run's token budget by phase (guide, find, card, build, results, answer, second judge).
- Cards printed as NBN template lines (`s:seed.spring-checked d= D= n= L=`): fewer tokens and fewer wiring faults?
- The `math.expr` card and every other block whose ports follow its settings: an audit of what the card shows.
- Why `wire()` accepted `k.value>s.rate` on `seed.spring-checked`: the graph exemption, and every block it covers.
- Strict tool schemas (`strict: true`) against the "nodes as a string" failure, and against invented keys.
- A provenance layer for labels in NBN, measured against the 7,663 label tokens of the starters.
- The house board's measured mass, 226,300 kg for a house, a car and a room: is `measure` counting something twice?
- Token counts for `change` diffs in NBN against JSON `change` objects, on real edit sequences.
- Prompt caching in practice: the guide's cache hit rate across agent calls, from `usage` in the agent's runs.
- Constrained decoding with a published grammar (llguidance, XGrammar) for local models, where the API cannot.
- A frequency-matched short alias table for the commonest blocks (`view.show`, `in.number`, `place`), measured.

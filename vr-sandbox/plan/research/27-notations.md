# Research (round 5): Notations, how humans compress whole worlds into a few marks
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Why this pass: the user wants the in-app AI to build with very few tokens. Today the agent writes boards as JSON plans
(`src/nexus/agent.ts`, the `plan` schema; `docs/FOR-AI.md`, item 3) [C, read in the code this pass]. People have spent
centuries making notations that pack a whole world (a game, a molecule, a dance, a circuit) into a line, and that can
still be **checked** by someone who did not write them. Each one below is read for three things: what it compresses,
how it is checked, how it is learned. The proposal at the end turns what they share into a notation for Nexus boards.

Not repeated here: SPICE as an exchange format and a browser SPICE node (`06-engineering-languages.md`), GD&T as the
language of fit and MIDI 2.0 Property Exchange (`18-self-describing-interfaces.md`), Knitout as a knitting assembly
language (`13-crafts-toys-ancient.md`), shape grammars and L-system street layouts (`21-space-city-grammars.md`). This
pass looks at those only as notations: how few marks, and how they are checked.

## (A) Findings

### A0. Where Nexus stands (checked in the code this pass)

- [C] The agent's `build` tool takes `{"nodes": {name: {"b": blockId, "s": {settings}}}, "wires": ["a.out>b.in"]}`;
  `change` takes `add`, `set`, `remove`, `wires`, `unwire`; cards come back as one line each
  (`id: name | in: name:type(unit) | out: … | set: key=default [choices]`) (`src/nexus/agent.ts` lines 37 to 52).
  So the **reading** side is already compact (one line a block, one line a node back); the **writing** side is JSON.
- [C] `docs/FOR-AI.md` already uses two small notations inside strings: the wire `from.output>to.input`, and
  `fit.target`'s lines (`d 0.002..0.012`, `n 3..12 int`, `rate = 40000`, `worst > 2`, `mass min`). Nexus has started
  a notation without naming it.
- [C, measured with `${#s}` in bash this pass] The FOR-AI example plan (a spring with its rate set) is 129 characters
  as JSON; the same board in the notation proposed in section B is 33 characters. A spring fitted to a target is 258
  characters as compact JSON and 67 in the proposal. [I] Tokens were **not** measured (no tokenizer was run); BPE
  tokenizers spend extra tokens on JSON's quotes and braces, so the token ratio is likely of the same order as the
  character ratio, but that is a guess until counted with the API's token counter.

### A1. Staff notation and MIDI (music)

- Compresses [M]: pitch as height on five lines, time as left-to-right position, duration as the note's shape (filled,
  hollow, flags), loudness and articulation as small marks; a key signature written once replaces every sharp after it;
  repeats and da capo fold whole sections into a sign. **Context written once, then implied** is the main trick.
- Checked [M]: every bar must add up to the time signature (a 4/4 bar holds four crotchets' worth); this is a
  **checksum built into the notation**, and copyists and engravers check it bar by bar.
- Learned [M]: years of drill, from a small core (treble clef, crotchets) outwards; sight-reading is pattern
  recognition of chunks (scales, chords), not symbol-by-symbol decoding.
- [C] ABC notation writes the same in plain text: a header of one-letter fields, `X:` (reference), `T:` (title), then
  `M:` meter, `L:` unit note length, ending with `K:` key, then the tune body; it is "designed to be comprehensible by
  both people and computers" (https://abcnotation.com/wiki/abc:standard:v2.1). [I] `L:` is a **default unit** set once
  so every note can omit its length: the same move Nexus needs for SI defaults.
- [C] MIDI compresses a performance to events: Note On is three bytes, a status byte 0x90 to 0x9F (the low nibble is
  the channel), then note number 0 to 127 (middle C is 60) and velocity (http://midi.teragonaudio.com/tech/midispec/noteon.htm).
  [C] **Running status** lets a stream drop the repeated status byte, so three Note Ons on one channel go from nine bytes
  to seven (https://people.ece.cornell.edu/land/courses/ece4760/FinalProjects/s2000/selan/midi.html). [I] Running
  status is "the last verb is still in force": a notation can let the AI omit a repeated block id or target node.

### A2. Labanotation and Benesh movement notation (dance)

- [C] Labanotation: a vertical three-line staff read bottom to top; **each direction symbol carries four factors at
  once**: its shape is the direction, its shading the level, its length the duration, its column the body part
  (https://www.britannica.com/art/labanotation; https://www.dancenotation.org/labanotation-fundamentals). [I] One mark,
  four typed fields, each field in a different visual channel: the densest of all the notations here.
- [C] Benesh Movement Notation (Rudolf and Joan Benesh, published 1956): a five-line stave plotting the body head to
  foot, seen from behind, read left to right so it can sit under the music score (https://en.wikipedia.org/wiki/Benesh_Movement_Notation;
  https://www.britannica.com/biography/Rudolf-Benesh). [I] Benesh records **positions** (keyframes) and lets the
  movement between be inferred; Labanotation records **movements**. The same split as "states vs transitions" (FEN vs
  PGN below).
- Checked [M]: by restaging: a notator's score is checked by having dancers who never saw the work perform it; the
  Dance Notation Bureau and the Royal Ballet employ trained notators (choreologists). The check is **re-execution by
  someone else**.
- Learned [M]: formal courses and certification over years; few people read either fluently, which is the cost of a
  notation that does not map onto an existing habit.

### A3. Chess: PGN, SAN and FEN

- [C] FEN: one ASCII line, **six space-separated fields**: piece placement, side to move, castling rights, en passant
  square, halfmove clock, fullmove number; the start position is
  `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1` (https://chessprogramming.org/Forsyth-Edwards_Notation;
  https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation). Runs of empty squares are a digit (run-length coding).
  Its purpose is "all the necessary information to restart a game from a particular position".
- [C] PGN (Steven J. Edwards, 1993) has an **import format** (liberal, for hand-written input) and an **export format**
  (strict: different programs' output "expected to be exactly equivalent, byte for byte"); seven required tags in a fixed
  order (https://en.wikipedia.org/wiki/Portable_Game_Notation; https://github.com/fsmosca/PGN-Standard/blob/master/PGN-Standard.txt).
- [M] SAN (the move text) is **relative to the position**: `Nf3` names only the piece type and the target square; the
  origin is added only when two pieces could go there (`Nbd2`). It writes exactly what is ambiguous and nothing more.
- Checked [M]: replaying moves on a board; an illegal move is caught at once because every move is checked against the
  state. [I] The notation is cheap because the checker (the rules) is strong.
- [C] LLMs and PGN: gpt-3.5-turbo-instruct still made an illegal move in 16 % of games and 0.3 % of moves
  (https://blog.mathieuacher.com/GPTsChessEloRatingLegalMoves). [C] A small model trained on PGN characters learned an
  internal board that linear probes can read (https://adamkarvonen.github.io/machine_learning/2024/03/20/chess-gpt-interventions.html).
  [I] A compact relative notation works for a model, but **only with a checker beside it**: the legal-move rule is
  what Nexus's run-and-report must be.
- Learned [M]: in an afternoon; algebraic notation replaced descriptive notation (P-K4) because coordinates do not
  depend on whose side you are on.

### A4. Go: SGF

- [C] SGF writes a game as a tree of nodes `(;B[pd];W[dp]…)`, each property an upper-case identifier and values in
  brackets; in Go a point is two lower-case letters `a` to `s`; variations are nested parentheses
  (https://www.red-bean.com/sgf/ff1_3/ff3.html; https://en.wikipedia.org/wiki/Smart_Game_Format). [C] SGF does **not**
  enforce alternation or legality (https://www.hexwiki.net/index.php/Smart_Game_Format): the file is a record; the
  rules are the reader's.
- [I] Two lessons: a **tree of variations** in the notation itself (SGF's `(` `)`) is how to keep alternative designs
  side by side; and a notation that does not check legality relies on viewers that do.
- Learned [M]: nobody writes SGF by hand; it is learned by tools. A notation can be for machines only, if a human view
  is always one click away.

### A5. Molecules: SMILES, InChI, SELFIES

- [C] SMILES: atoms as element letters, bonds implied between neighbours, branches in parentheses, rings closed by
  matching digits; many strings mean one molecule (`CCO`, `OCC`, `C(O)C` are all ethanol); a **canonical** SMILES always
  writes a molecule's atoms in the same order (http://opensmiles.org/opensmiles.html). [I] Ring-closure digits are
  named nets: the same digit at two places is a wire.
- [C] InChI: layers in a fixed order (formula, `/c` connectivity, `/h` hydrogens, charge, `/b` `/t` `/m` `/s`
  stereo, `/i` isotopes); "layers may not be … excised and reused. However, bottom layers may be 'pruned', leaving a
  valid, though less constraining InChI" (https://www.inchi-trust.org/technical-faq). The InChIKey is a fixed-length
  hash for lookup (https://pmc.ncbi.nlm.nih.gov/articles/PMC4486400). [I] **A prunable layered notation**: the first
  layer alone is a valid but looser description; that is exactly a board's topology without its settings.
- [C] SELFIES (Krenn et al., *Mach. Learn.: Sci. Technol.* 1:045024, 2020): **every string, even a random one, is a
  valid molecule**, and every molecule has a string; a GAN produced 78.9 % diverse valid molecules with SELFIES against
  18.6 % with SMILES (https://iopscience.iop.org/article/10.1088/2632-2153/aba947;
  https://hunterheidenreich.com/notes/chemistry/molecular-representations/notations/selfies). [I] The strongest idea in
  this pass for an AI writer: design the grammar so that wrong is hard to write (each symbol's meaning depends on what
  is still allowed), rather than catching wrong after.
- Checked: valence rules on parse [M]; canonical form and InChIKey for identity [C above].
- Learned [M]: chemists learn SMILES in an hour from examples; InChI is not meant to be read by people.

### A6. Feynman diagrams

- [C] Each internal line is a propagator factor, each vertex a factor from an interaction term of the Lagrangian;
  energy and momentum are conserved at every vertex; each diagram is one term of the perturbation series
  (https://en.wikipedia.org/wiki/Feynman_diagram; https://web2.ph.utexas.edu/~vadim/Classes/2022f/dyson.pdf). [I] A
  picture that **is** a formula: a fixed set of rules turns the drawing into an integral, mechanically. Conservation
  at each vertex is the built-in check (like a bar's beat count, or Kirchhoff at a node).
- [C] Learned by apprenticeship, not from papers: Kaiser's *Drawing Theories Apart* (Chicago, 2005) traces how the
  diagrams spread through postdocs at the Institute for Advanced Study, who "learned more from each other than from the
  permanent faculty", and how users adapted the diagrams as they took them up
  (https://press.uchicago.edu/ucp/books/book/chicago/D/bo3534300.html; https://dokumen.pub/drawing-theories-apart-the-dispersion-of-feynman-diagrams-in-postwar-physics-9780226422657.html).
  [I] For an AI the analogue of the postdoc cascade is **worked examples** (starter boards in the notation), not a
  grammar document.

### A7. Circuit schematics and SPICE netlists

- [C] A netlist line is `R1 n1 n2 1K`: the **first letter is the element type**, then its nodes, then its value with
  an engineering suffix (`1K`, `100p`, `.5μ`); node `0` is ground; nodes are arbitrary strings
  (https://ltwiki.org/LTspiceHelp/LTspiceHelp/A_General_Structure_and_Conventions.htm;
  http://ahkab.readthedocs.io/en/latest/help/Netlist-Syntax.html). LTspice accepts `6K34` for 6.34 k [C, same page].
- [I] The key move: **there are no wires in a netlist, only named nets**. Two parts are connected because they name
  the same node. A wire list (`a.out>b.in`) grows with the number of connections and needs both ends spelled; a net
  name is written once per pin. Fan-out (one output to five inputs) costs five short names, not five full wire strings.
- Checked [M]: ERC (electrical rule check: unconnected pins, two outputs on one net), then simulation; a node with only
  one connection is flagged. Schematics checked by eye against the netlist (LVS, layout versus schematic, in chips).
- Learned [M]: schematic symbols in a first course (IEC 60617 or ANSI); netlists by reading generated ones.

### A8. P&ID and ISA-5.1

- [C] An instrument bubble's tag: **first letter the measured variable** (F flow, P pressure, L level, T temperature),
  **succeeding letters the functions** (I indicate, T transmit, C control, A alarm, H high, L low), then the loop number;
  `FT-101`, `FIC-101`, `FV-101` read as one closed loop (https://pathnovo.com/standards/isa-5-1;
  https://www.merobix.com/blog/what-is-isa-5-1). [C] Some letters (B, C, D, G, M, N, O, by one source) are "user's
  choice", defined in the project's own legend (https://tagsight.io/blog/isa-5-1-instrument-identification-guide).
- [I] Two compressions: a **positional letter code** (the same letter means different things in first and later
  position, so 26 letters do double duty), and the **shared loop number** as a net name binding sensor, controller and
  valve. Plus a legend for project-local letters: a notation with a declared extension point.
- Checked [M]: instrument index against the P&ID; HAZOP reviews the drawing line by line.

### A9. GD&T feature control frames

- [C] A feature control frame is a rectangle of compartments, read left to right: the geometric characteristic
  symbol, the tolerance (a ⌀ prefix means a cylindrical zone), a material condition modifier (circled M or L; neither
  means RFS), then datum references in order of precedence, primary, secondary, tertiary
  (https://support.ptc.com/help/creo/creo_pma/r12/usascii/model-based_definition/glossary_for_gdt.html;
  https://www.makerstage.com/resources/gdt-symbols-chart). [C] It reads aloud as one sentence: "the [symbol] of this
  feature shall be within [value] [zone] [at condition], referenced to datum A, B, C" (makerstage, same page).
- [I] **Fixed slot order** removes all keywords: position tells you what each field is. A notation whose fields are
  positional is short and unambiguous, but brittle to extend; GD&T copes by allowing empty trailing slots.
- Checked [M]: by inspection with gauges and CMMs against the frame; the frame is a contract between designer and
  inspector, so it must mean one thing.

### A10. Knitting and crochet

- [C] The Craft Yarn Council publishes standard abbreviations (`k2tog`: knit 2 together, a right-leaning decrease;
  `ssk`: a left-leaning decrease; `yo`: yarn over) and chart symbols, each chart symbol defined for both right and
  wrong side (https://www.craftyarncouncil.com/standards/knitting-abbreviations;
  https://www.craftyarncouncil.com/standards/knit-chart-symbols). [C] Crochet charts draw each stitch as it looks on the
  right side (the chain as an oval); charts carry a key because symbols vary between designers
  (https://craftyarncouncil.com/standards/crochet-chart-symbols, as summarised by search; the full table was not
  retrieved this pass).
- [M] Written patterns compress with **repeats**: `*k2, p2; rep from * to end` and `(k1, yo) 3 times`. They are checked
  by **stitch counts** printed at the end of a row ("— 64 sts"), the knitter's checksum: each decrease removes one, each
  yo adds one, and the count must match.
- [C] Chart tools (Stitch Fiddle, KnitBird) generate written rows from the chart and check stitch counts as charts are
  edited (https://worldmetrics.org/best/knitting-pattern-design-software; https://gitnux.org/best/crochet-chart-software;
  both are review sites of uncertain quality).
- Learned [M]: by doing, from a few stitches up; the chart is learned after the abbreviations, because it is a picture
  of the result rather than of the action.

### A11. Juggling siteswap

- [C] A pattern is a sequence of throw heights (`3`, `441`, `531`); **the number of balls is the average of the
  numbers** (441 → 3; 86 → 7); a sequence whose average is not an integer is not a pattern, but an integer average is
  not enough (`543` averages 4 yet all three land at once); the full test is that `(aᵢ + i) mod n` are all different
  (https://en.wikipedia.org/wiki/Siteswap; https://sharmaeklavya2.github.io/blog/juggling-theory.html).
- [C] Brute-force enumeration through the validity test finds new patterns ("rumors say that 441 was invented like
  this", sharmaeklavya2, same page). [C] The number of period-n patterns with b balls is (b+1)ⁿ − bⁿ
  (http://www.archive.bridgesmathart.org/2008/bridges2008-219.pdf). [C] Siteswap was developed by Bengt Magnusson and
  Bruce Tiemann in 1985; Shannon drew ladder diagrams around 1981 (https://en.wikipedia.org/wiki/Juggling_notation).
- [I] The finest example of a **notation with a cheap necessary check (the average) and a cheap sufficient check (the
  permutation)**, and of a notation that is **generative**: people found new tricks by writing strings and testing them.

### A12. Hangul and Chinese characters as compositional writing

- [C] Hangul (published with the Haerye commentary, 1446): five basic consonants drawn after the speech organs (ㄱ the
  tongue root blocking the throat, ㄴ the tongue touching the gum ridge, ㅁ the mouth, ㅅ the teeth, ㅇ the throat);
  further consonants made by **adding strokes for stronger sounds** (ㄴ n → ㄷ d → ㅌ t), 17 consonants in all
  (https://www.koreanculture.org/gallery-korea/2024/04/07/hangeul; https://www.korea.net/K-InfoHub/SubMainDetail/view?articleId=4024&pageIndex=1&headwordCd=52&headwordGroupCd=23).
  [I] A featural script: the shape carries the features, so related sounds look related.
- [C] Syllables are composed blocks: Unicode encodes 11,172 modern syllables at U+AC00 to U+D7AF, and a syllable's
  code is pure arithmetic from its lead, vowel and tail jamo (SBase + (L·NCount) + (V·TCount) + T, NCount = 588)
  (https://learn.microsoft.com/en-us/typography/script-development/hangul;
  https://www.unicode.org/L2/L2006/06310-hangul-decompose9.pdf). [I] A **closed composition rule** turns 11,172
  "parts" into three small lists and a formula: the library law at the level of a script.
- [C] Chinese characters: Ideographic Description Sequences use prefix operators ⿰ (left to right), ⿱ (above to
  below), ⿴ (surround) and others, nestable: 相 = ⿰木目; 能 = ⿰⿱厶月⿱匕匕 (https://en.wikipedia.org/wiki/Ideographic_Description_Characters;
  https://ansuz.sooke.bc.ca/entry/228). Unicode 15.1 defines eighteen IDCs, twelve commonly used
  (https://aclanthology.org/2024.cawl-1.8.pdf). [C] Full IDS data exist for CJK Unified Ideographs
  (https://github.com/cjkvi/cjkvi-ids). [I] IDS is a **layout grammar of a dozen spatial operators**, exactly what a
  "place these parts relative to each other" notation needs.
- Learned [M]: Hangul in hours (its design goal); Chinese over years, with radicals as the learned shortcut.

### A13. APL and its descendants (Iverson)

- [C] Iverson's 1979 Turing lecture names the characteristics of a good notation: ease of expressing constructs that
  arise in problems, **suggestivity**, **ability to subordinate detail**, **economy**, and amenability to formal proofs,
  besides executability and universality (https://www.eecg.utoronto.ca/~jzhu/csc326/readings/iverson.pdf;
  https://www.sigapl.org/KenIverson/KenIversonTuringAwardACMWebPage.html). A notation is suggestive "if the forms of the
  expressions arising in one set of problems suggest related expressions which find application in other problems".
- [C] BQN (Marshall Lochbaum) continues the array paradigm, self-hosted, with a JavaScript VM for its online REPL
  (https://github.com/mlochbaum/BQN; https://mlochbaum.github.io/BQN/doc). [M] J and K/q moved APL to ASCII.
- [I] Iverson's "operators" (reduce `+/`, outer product `∘.×`) are functions that take functions: the notation's
  power comes from a few **higher-order combinators applied to any block**. In Nexus the analogues are `fit.target`
  (any block, searched), fold (any board, one block), and replication (any part, n times on a pattern).
- [I] Caution for an AI: APL's single glyphs are not single tokens in a BPE vocabulary (likely several bytes each);
  for a model, short ASCII words may be cheaper than rare symbols. Unmeasured.

### A14. Penrose tensor diagrams

- [C] A tensor is a shape with lines up and down for its indices; joining lines is contraction; "one does not have to
  invent new letters for new indices", and the notation is basis-independent (https://en.wikipedia.org/wiki/Penrose_graphical_notation;
  https://tensornetwork.org/diagrams). [C] A long index sum such as Σ AᵢⱼVᵢᵣBⱼₖₗ… "is tedious to parse", while the
  diagram shows at once which tensors contract and what kind of result comes out
  (https://math.stackexchange.com/questions/433662/a-users-guide-to-penrose-graphical-notation).
- [I] Penrose and Einstein are the two answers to the same problem: **lines without names** (good for eyes) or
  **names without lines** (einsum, SPICE nets; good for text). An AI writes text, so it should write names; the app
  should draw the lines.

### A15. L-systems

- [C] A string of symbols rewritten in parallel by productions; a turtle reads the result: `F` forward drawing, `f`
  forward without drawing, `+` `-` turn by δ, `&` `^` pitch, `\` `/` roll, `[` push state, `]` pop
  (https://jsantell.com/l-systems; https://github.com/ranrandy/L-system, both following *The Algorithmic Beauty of
  Plants*, Fig. 1.24). [C] `[`/`]` is a LIFO stack of position and heading (https://en.wikipedia.org/wiki/L-system).
- [I] A few characters (an axiom and one or two rules) make a whole tree: **compression by generation**, the highest
  ratio of any notation here, at the price that small changes have large effects. Checked only by rendering.

### A16. Regular expressions

- [C] Kleene's regular events (1951) became program notation when Thompson built them into the QED editor, compiling
  each expression to IBM 7094 code (https://en.wikipedia.org/wiki/Regular_expression; Thompson, *CACM* 11(6):419–422,
  1968, doi 10.1145/363347.363387). [C] Thompson's construction gives an automaton linear in the expression's size and
  O(m·n) matching (https://ohyoukillkenny.github.io/source/BVA.pdf).
- [I] The lesson is the reverse of economy: regexes are famously **write-only**. Their density outran their
  readability, and checking is by test strings. A Nexus notation must be **printable back** in a canonical, readable
  form so a human (and a second judge) can read what the AI wrote.

### A17. Conway notation for polyhedra

- [C] A seed is an upper-case letter (C cube, O octahedron, …); lower-case operators are applied **right to left like
  functions**: `aC` (ambo cube) is the cuboctahedron, `taC` the truncated cuboctahedron; operators are not commutative;
  `j² = o`; the notation fixes topology, not the geometric realisation (https://en.wikipedia.org/wiki/Conway_polyhedron_notation;
  https://www.georgehart.com/virtual-polyhedra/conway_notation.html). [C] Identities hold between strings
  (`aX = adX`, `jX = daX`), so two strings can be checked equal (Hart, same page).
- [I] **Seed plus operators** is the right model for "a part, then things done to it" (mirrored, arrayed, scaled,
  folded); identities let the app canonicalise.

### A18. Origami: the Yoshizawa–Randlett system

- [C] Yoshizawa (1954) used dashed and dash-dot lines for valley and mountain folds and a few symbols; Randlett and
  Harbin added more (rotate, zoom), and Randlett's *Art of Origami* (1961) made it the international standard
  (https://en.wikipedia.org/wiki/Yoshizawa%E2%80%93Randlett_system). [C] Dashed is valley (toward you), dash-dot is
  mountain (away); an arrow that returns means fold and unfold; tick marks on an arrow mean repeat
  (https://origamidiagrams.com/guides/origami-symbols-guide).
- [I] Origami diagrams are **step sequences with a picture of the state after each step**: the reader checks
  themselves against the picture before going on. The analogue: the app returns one line per node after each change,
  and the AI compares it to what it meant. [M] Crease patterns (the flat sheet's creases only) are the far denser
  alternative, readable only by experts: the FEN to the diagrams' PGN.

### A19. AI writers and compact notations (what is measured)

- [C] TOON (a compact notation for passing data to LLMs) used 32.7 % fewer tokens than formatted JSON over its
  benchmark but only 1.6 % more than compact JSON, at similar accuracy (https://toonformat.dev/guide/benchmarks.html).
  [C] An independent benchmark found plain JSON generation had the best one-shot accuracy, and that TOON's saving is
  eaten by "the prompt tax of instructional overhead in shorter contexts" (https://arxiv.org/html/2603.03306v1).
  [I] **A new notation must be taught in the prompt, and that costs tokens on every call** (FOR-AI.md is sent with
  every call). The saving has to beat the teaching.
- [C] Grammar prompting (Wang et al., NeurIPS 2023): giving the LLM a specialised BNF grammar with each example, and
  constrained decoding, improves few-shot generation of DSLs (semantic parsing, PDDL plans, SMILES) and guarantees
  syntactic validity (https://proceedings.neurips.cc/paper_files/paper/2023/file/cd40d0d65bfebb894ccc9ea822b47fa8-Paper-Conference.pdf).
  [C] Grammar-constrained decoding raised validity to 100 % for Llama models of 1B to 70B in one ACL 2025 study
  (https://aclanthology.org/2025.findings-acl.177.pdf).
- [I] Through a hosted API Nexus probably cannot constrain decoding token by token; it can (a) keep the grammar tiny,
  (b) parse leniently and return the canonical form (PGN's import vs export), and (c) return one-line repairs.

### A20. What all of them share (inference across A1 to A19)

1. **Context written once, then implied** (key signature, ABC's `L:`, MIDI running status, SAN relative to the board).
2. **Names instead of lines** for connection (SPICE nets, ring-closure digits, ISA loop numbers, einsum indices).
3. **Positional fields** remove keywords (FEN's six fields, the feature control frame, ISA's first letter).
4. **A seed and operators** (Conway, IDS, L-systems, APL operators, knitting repeats).
5. **A built-in checksum** that a reader can verify without the full model (bar sums, stitch counts, siteswap
   average, momentum conservation, InChIKey).
6. **Prunable layers** (InChI): the first layer alone is valid and looser.
7. **Liberal in, strict out** (PGN import and export; canonical SMILES): many ways to write, one way it is printed.
8. **A checker beside the notation** makes a terse notation safe (chess rules, SGF viewers, ERC).
9. **Learned from examples and apprenticeship**, not from grammars (Feynman diagrams, SMILES, knitting).
10. **Wrong made hard to write** (SELFIES), the strongest form of the constitution's "a wrong connection impossible".

## (B) What Nexus should take

The proposal: **Nexus board notation (NBN)**, a line-based notation the agent writes and the app prints back. It does
not replace the board's stored JSON; it is a second surface over the same plan, parsed by one owner and printed by the
same owner (the agent tools in `src/nexus/agent.ts`). Every item names the plan spec it fits.

### B1. The notation (a sketch, for the user to accept or not)

One statement per line (or `;`). Five forms, each from a notation above:

| Form | Meaning | From |
| --- | --- | --- |
| `s:seed.spring-checked` | a node `s` of that block | SPICE's element line |
| `s rate=40kN/m` | set an input to a literal; an `in.number` is made implicitly and wired | SPICE values on the element; ABC's defaults |
| `s rate=k.value` | wire: the input pulls from an output (no separate wire list) | SPICE nets |
| `$L=0.2m` then `a len=$L; b len=$L` | a named net: set once, used anywhere (fan-out at one name each) | einsum, ring digits, ISA loop numbers |
| `?s.worst>2 s.mass<0.1kg` | a check the run must pass; each comes back pass or fail with its number | bar sums, stitch counts, siteswap average |
| `~seed.spring-checked d=2..12mm n=3..12# \| rate=40kN/m worst>2 mass-` | fit a block: ranges left of `\|`, goals right; `-` minimise, `+` maximise, `#` integer | FOR-AI's `fit.target` lines, made one line |
| `4*m:make.wound @f.corners` | replicate a node over a pattern | Conway operators, knitting repeats |
| `@s on f.top` | a placement layer, by relation, not coordinates | IDS operators, interface mating (spec 01) |
| `fold Spring(s) out=s.mass,s.rate "a checked spring"` | fold | APL operators |

Rules:
- **Running status** (MIDI): a line that begins with a setting continues the last named node (`s:seed.spring-checked`
  then `rate=40kN/m` on the next line).
- **Units inline**, SI or with an engineering suffix (`40kN/m`, `2mm`); the parser converts once, as `in.number`
  already does ("200 mm" kept as 0.2 m, `docs/NODES.md` line 57) [C].
- **Defaults omitted**: only what differs from a card's default is written (SAN writes only what is ambiguous).
- **Layers in a fixed order** (InChI): topology (nodes and wires), then settings, then `@` placement, then `?` checks,
  then `!` provenance notes. A board with only its first layer is valid and runs with defaults.
- **Liberal in, strict out** (PGN): the parser accepts spacing, either wire direction (`a.out>b.in` stays legal, so the
  current form keeps working), unique-prefix block ids; it returns the **canonical line** (exact ids, sorted, defaults
  dropped, units normalised) so the agent and the second judge read one form.
- **Errors as one-line repairs**: `line 2, col 9: s has no input "rte"; did you mean rate (N/m)?` (SELFIES' spirit,
  done by repair since decoding cannot be constrained through the API [I]).

### B2. Worked examples (the first is runnable by today's tools if NBN is translated; the second is illustrative)

1. The FOR-AI spring: today `{"nodes": {"s": {"b": "seed.spring-checked"}, "k": {"b": "in.number", "s": {"value": "40000 N/m"}}}, "wires": ["k.value>s.rate"]}`
   (129 characters); in NBN `s:seed.spring-checked rate=40kN/m` (33 characters) [C, counted]. Fitting it:
   `~seed.spring-checked d=2..12mm n=3..12# | rate=40kN/m worst>2 mass-` (67 characters, against 258 for the compact
   JSON with a `fit.target` node and its line settings) [C, counted]. Port names `rate`, `worst`, `mass`, `d`, `n` are
   those used in `docs/FOR-AI.md` [C]; their exact spelling on the card was not checked this pass.
2. A pack on a bracket, checked (illustrative: `make.bracket` does not exist, and port names are guesses):
   ```
   $V=48V
   p:battery.pack series=13 parallel=4 volts?=$V
   b:make.bracket load=p.mass
   @p on b.top
   ?verify.interference(p,b)=0 mass.properties(p,b).mass<6kg
   ```
   [I] About 140 characters for five nodes, a net, a placement and two checks; the JSON equivalent would need two
   `in.*` nodes, five wires and two check nodes.

### B3. Rules, nodes and ways of working, mapped to specs

1. **Spec 00 (structure), a rule**: the notation has one owner (parser and printer in the agent module), one grammar
   file, and a round-trip test: for every starter board, `print(parse(print(board))) == print(board)` and the parsed
   plan equals the stored plan. Canonical form is the PGN export format: byte-identical across runs.
2. **Spec 00, an evaluation set**: a frozen suite of requests answered twice, once in JSON plans and once in NBN, scored
   for tokens (counted by the API's token counter, not estimated), validity on first try, repairs needed, and the
   second judge's verdict. NBN is adopted only if it wins net of its teaching text in FOR-AI.md (TOON's prompt tax, A19).
3. **Spec 00, a way of working**: teach by worked examples (Feynman's postdocs, SMILES): FOR-AI.md carries six short NBN
   examples and a ten-line grammar, not a long description.
4. **Spec 01 (interfaces)**: placement in NBN is by relation (`@p on b.top`, `@bolt in plate.h1`), a dozen operators
   like IDS's twelve, each one an interface mate; coordinates only as a last resort. This writes BenchCAD's lesson
   (placement fails, shape does not) into the notation.
5. **Spec 01**: interface keys in short positional codes, ISA-style: first letter the medium (M mechanical, E
   electrical, F fluid, T thermal, S signal), later letters the function and pattern; a project legend for extra
   letters. A wire between mismatched keys does not parse (SELFIES: wrong is hard to write).
6. **Spec 09 (physics core)**: acausal ports written as SPICE nets: `$n1` names a node where efforts are equal and
   flows sum to zero; parts list the nets their pins touch. A net with one pin is an ERC warning. This is the text form
   of effort-and-flow connectors.
7. **Spec 09**: conservation checks as the notation's checksum: every net's flows sum to zero (Kirchhoff, Feynman's
   vertex rule), every fold's outputs equal its inside's (the functor law).
8. **Spec 10 (trust)**: `!` provenance layer: `!s.rate src=ISO-10243` or `!typ`; the printer always shows a value's
   status letter (measured, catalogue, typical, estimate), as FEN always shows side-to-move.
9. **Spec 10**: a **board key** like InChIKey: a short hash of the canonical line, so two boards are known identical
   without diffing, and a library entry can cite the exact board version it came from.
10. **Spec 11 (living world)**: a board plus seed plus inputs in one canonical line is a replay record (PGN for a run);
    a FEN-like **state line** of a running world (positions, clocks) restarts it, as FEN restarts a game.
11. **Spec 11**: variations as in SGF: `(…|…)` keeps alternative designs in one record, each runnable, so a trade study
    is one artifact.
12. **Node `notation.parse` and `notation.print`** (owner: the agent module): the parse and print as blocks too, so a
    user can paste a line onto a board.
13. **Node `notation.diff`**: two canonical lines, the changes as `+`/`-` statements (the `change` tool's input in NBN).
14. **Node `gen.lsystem`** (spec 11, 07): axiom, rules, turtle mapping to parts (`F` a strut, `[` a branch joint), for
    trees, trusses, antennas; already proposed for streets in research 21, here as a general maker.
15. **Node `poly.conway`** (07): a Conway string to a polyhedron (topology from the operators, geometry by
    canonicalisation), for domes, lattices and toy kits; identities as tests.
16. **Node `seq.siteswap`** (07): a siteswap string to throws checked by the average and the permutation test, then
    animated with physics (Jolt) as a fun showcase of "a few marks, checked, then run".
17. **Ideas (07)**: import formats as nodes where a public notation already holds a world: `io.fen`/`io.pgn` (a chess
    board as parts), `io.smiles` (a molecule as atoms and bonds, the elements already in the material system),
    `io.abc`/`io.midi` (sound), `io.knit` (rows and stitch counts to a fabric surface), `io.ids` (a character's layout as
    a placement plan).
18. **A way of working for the agent**: read the board as its canonical line first (one line, like FEN), write a change
    as a few statements, and read back only the lines that changed; never ask for the whole board as JSON.
19. **A rule of design for the notation itself** (Iverson): every new symbol must earn its place by being suggestive
    (it means the same thing everywhere) and must subordinate detail (defaults); any symbol that only saves a character
    is refused. ASCII words over rare glyphs, until token counts say otherwise.
20. **Keep the JSON**: NBN is a front; the JSON plan stays the stored form and the fallback when parsing fails, so no
    old board breaks (the "never break old parts" rule).

## (C) Questions

The 65 questions of this pass are chapter 23 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Measure Claude's tokenizer on JSON plans vs NBN vs compact JSON across all starter boards (the decisive experiment).
- Grammar-constrained decoding through hosted APIs: what strict tool schemas allow, and llguidance / XGrammar for local models.
- SELFIES-style construction for boards: a derivation grammar where every string is a well-typed board.
- Canonical labelling of graphs (nauty, the algorithm behind canonical SMILES) for a board key that ignores node names.
- Shannon's juggling theorem and ladder diagrams as a model of timed resource use (machines, robots, traffic).
- Benesh vs Labanotation for recording robot and avatar motion in Nexus's bodies (`docs/LIFE.md`).
- LilyPond and MusicXML: how a text music notation handles layers, voices and engraving rules.
- Notation for kinematic chains: Denavit–Hartenberg parameters as a four-number-per-joint notation.
- Crease patterns and flat-foldability checks (Maekawa's and Kawasaki's theorems) as notation checksums.
- Hangul's featural design as a model for naming interface keys so related keys look related.
- Systematic chemical names (IUPAC nomenclature) as a long-form notation vs SMILES: when the long form is safer.
- Bond graph notation (power bonds, causal strokes) as a text notation for spec 09.
- Petri net and BPMN notations for processes and assembly sequences.
- Morse code, Braille and Huffman: frequency-matched code lengths, so the commonest blocks get the shortest names.
- APL's tacit (point-free) style and its readability debate, for whether boards should name intermediate nodes at all.
- Electrical one-line diagrams and IEC 61850 SCL as compact notations for power systems (spec 05).
- Stenography (Pitman, Gregg, steno chords) as a human answer to "write fast, read later".
- Diff and patch notations (unified diff, JSON Patch, operational transforms) for the `change` tool and shared boards.
- Dance and juggling "trick dictionaries" as libraries of named, composable fragments (the library law in performance).
- How engravers and choreologists check each other's work: second-reader practices as a model for the reviewer panel.

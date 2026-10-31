# Research (round 6): A small trusted kernel for Nexus
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Starting point: research 26 established that sound outside checkers, not self-critique, must gate the AI (constitution
C29, still **unenforced**: spec 10, task T18). This pass asks the next question: what is the smallest body of code that
must be correct for a Nexus result to be trusted? It reads how proof assistants, compilers, SAT/SMT solvers and safety
standards answer that question, then reads the three Nexus checkers that exist, and proposes a kernel, file by file.

## (A) Findings

### A1. Two ways to keep the trusted part small: de Bruijn and LCF

- [C] Barendregt and Wiedijk (2005, "The challenge of computer mathematics", Phil. Trans. R. Soc. A 363, p. 2362) name
  the **de Bruijn criterion**: a system meets it when its proofs can be checked independently by a small program, one
  that a sceptic could write or check. The proof may be megabytes; the checker stays small.
  (https://lawrencecpaulson.github.io/2022/01/05/LCF.html; https://www.pls-lab.org/en/de_Bruijn_criterion)
- [C] Paulson (2022) sets the **LCF architecture** against it. Milner's idea was to keep theorems, not proofs: `thm`
  is an abstract type whose only constructors are the axioms and the inference rules, so strict typing makes every
  `thm` value a theorem. Paulson writes that "the LCF architecture is an alternative to the de Bruijn criterion, not an
  implementation of it". (same Paulson URL)
- [I] For Nexus the two give two different rules. LCF means only kernel functions can make a `Checked` value, enforced
  by the type system (in TypeScript, a branded type whose constructor is not exported). De Bruijn means the
  certificate is stored and can be checked again by another program later, on another machine. Nexus needs both. LCF
  protects the running app from its own code (the agent, nodes, plugins). De Bruijn lets a shared board be re-checked
  on load (26 B3.19, proof-carrying code). TypeScript types are erased at run time, so the LCF half can be broken by
  any `as` cast. A type alone is not enough; an import-boundary check and a run-time token are also needed.

### A2. How small "small" has been

- [C] HOL Light: "a logical kernel consisting of about 400 lines of mostly functional OCaml, whose complete formal
  verification seems to be quite feasible". Harrison verified much of it in HOL itself, "significant though imperfect
  progress" (https://www.cl.cam.ac.uk/~jrh13/papers/holhol.pdf). In a lecture, Myreen counts the core (`fusion.ml`) at
  548 lines, depending on the counting rule (https://www.youtube.com/watch?v=uvMjgKcZDec, 37:30).
- [C] HOL Light's README warns that building with `HOLLIGHT_USE_MODULE=1` "extends the trusted base of HOL Light to
  include the inliner script". Even a 400-line kernel grows a trusted base through its build
  (https://github.com/jrh13/hol-light).
- [C] cake_lpr, the LRAT/LPR checker used to validate SAT Competition unsat claims, is "formally verified down to the
  level of its x64 machine code implementation". It is compiled by the verified CakeML compiler, so neither extraction
  nor an unverified compiler is in its trusted base (https://satcompetition.github.io/2025/downloads/checkers/cakelpr.pdf).
- [C] seL4: 8,700 lines of C and 600 of assembler. The proof was about 200,000 lines of Isabelle and about 20
  person-years (9 on frameworks and tools, 11 on the seL4 proof itself), against 2.2 person-years to build the kernel
  (https://web.eecs.umich.edu/~ryanph/jhu/cs718/spring18/readings/seL4.pdf;
  https://cacm.acm.org/research/sel4-formal-verification-of-an-operating-system-kernel). Klein said in 2023 that the
  proof is now "a good deal over a million" lines (https://www.youtube.com/watch?v=lcyNH37qQyg, 1:46:38).
- [I] So full end-to-end verification cost about nine times the code it verified, and keeps costing as the code
  changes. A checker is cheap where verified code is dear. Nexus should spend its correctness budget on a checker of
  about 2,000 lines, not on the solvers.

### A3. Lean in 2026: the checker was attacked, by AI, and diversity caught most of it

- [C] On 25 July 2026 a repository was published with a `sorry`-free "disproof" of the Collatz conjecture, made with AI
  help. It exploited a missing check in the kernel's handling of nested inductive types (phantom parameters escaped
  type checking). It "also passed a week-old version of nanoda", the independent Rust checker, through a second,
  unrelated bug (a projection's type name was not verified). "The proof was built so that the expression the kernel
  never inspects is one that the old nanoda accepted."
  (https://leodemoura.github.io/blog/2026-8-1-postmortem-for-kernel-soundness-bug-14576)
- [C] In the bug hunt that followed, an OpenAI internal model got the official kernel to accept proofs of `False`
  several ways. Two of them were in the runtime, not the logic: it overflowed a reference counter to corrupt memory,
  and it exploited a known bug in GMP 6.1.2, which the Linux build still linked instead of 6.3.0. Other bugs found by
  a security-specialised AI "were caught by nanoda"
  (https://leodemoura.github.io/blog/2026-8-24-postmortem-for-the-kernel-soundness-bug-hunt; the 8-1 URL above).
- [C] Lean's response (15 October 2026): `lake check` exports a development and re-checks it with `leanchecker` in a
  sandbox. `lake check --paranoid` re-checks with four more kernels (nanoda, lean4lean, con-leche, con-ron) and with a
  build using a hardened allocator, which "turns memory corruption into a checked abort instead of a silently wrong
  answer" (https://leodemoura.github.io/blog/2026-10-15-lean-now-ships-with-verified-kernels).
- [C] Lean's reference manual names the gold standard as `comparator` with external checkers. Proofs that use native
  evaluation carry the axiom `Lean.trustCompiler`, and external checkers cannot check them
  (https://lean-lang.org/doc/reference/latest/ValidatingProofs).
- [C] lean4lean is an external checker written in Lean, 20 to 50 % slower than the C++ kernel (Mathlib: 58.79 min
  against 44.54 min). It is derived from the C++ code, "and as such likely shares some implementation bugs with it"
  (https://arxiv.org/html/2403.14064v3; https://github.com/digama0/lean4lean).
- [I] Three lessons for Nexus. (1) **The AI is an adversarial optimiser against the checker, even when nobody means it
  to be**: given pressure to pass, a model will find what the checker does not inspect. Nexus's checker must be
  written as if it will be attacked. (2) **The trusted base includes the runtime and the number library**: for Nexus,
  the JavaScript engine, `BigInt` and IEEE floats, and any WASM build. (3) **Two independent checkers catch most
  bugs, not all**, and a checker derived from the first one is not independent. Failures can be correlated by
  construction.

### A4. Translation validation: check each run, not the translator

- [C] Pnueli, Siegel and Singerman (TACAS 1998) defined translation validation as checking each run of a translator,
  "instead of proving the correctness of the compiler beforehand" (https://slebok.github.io/proverb/alive2.html).
- [C] Necula (PLDI 2000, pp. 83–95) built a validator for GNU C that compares the intermediate form before and after
  each pass. It handled branch optimisation, CSE, register allocation and scheduling on programs as large as gcc and
  the Linux kernel. Where it had to assume something (two distinct globals do not alias), it made the same assumption
  gcc makes (https://people.eecs.berkeley.edu/~necula/Papers/tv_pldi00.pdf).
- [C] Alive2 (Lopes, Lee, Hur, Liu, Regehr, PLDI 2021) is **bounded** translation validation for LLVM IR. It unrolls
  loops to a bound, so it can miss bugs, and it is "designed to avoid false alarms". Run over LLVM's unit tests it
  found 47 bugs (28 fixed) and led to eight patches to the LLVM Language Reference
  (https://users.cs.utah.edu/~regehr/alive2-pldi21.pdf). Running the transforms tests took about 40 minutes on 8 cores
  with validation, against 2 without (https://llvm.org/devmtg/2019-10/slides/Lopes-Regehr-Alive2.pdf).
- [I] Two lessons. A validator that is honest about its bound ("checked to depth k") is still very valuable. And
  validating finds faults in the **specification** (the LangRef), not only in the code. Nexus's fold and its AI board
  edits are translations. Each should be validated per run, with the bound stated, and the disagreements will show
  where Nexus's own semantics are vague.

### A5. Certifying algorithms: the witness and its checker

- [C] McConnell, Mehlhorn, Näher and Schweitzer, "Certifying algorithms", Computer Science Review 5(2):119–161, 2011,
  doi 10.1016/j.cosrev.2010.09.009 (https://researchportalplus.anu.edu.au/en/publications/certifying-algorithms).
- [C] Why LEDA adopted it: the library was built from 1989 with assertion checks and extensive testing, yet "at least
  two major programs were incorrect when first released: the planarity test … and the convex hull algorithm in
  arbitrary dimensional spaces". Many LEDA graph and geometry algorithms were then reimplemented as certifying
  (https://www.cs.colostate.edu/~rmm/cert11.pdf).
- [C] Alkassar, Böhme, Mehlhorn and Rizkallah formally verified certifying computations, checkers included (J.
  Automated Reasoning 52(3), 2013, arXiv 1301.7462) (https://en.wikipedia.org/wiki/Certifying_algorithm).
- [M] The survey's standard examples: a planar embedding, or a Kuratowski subgraph for non-planarity; a 2-colouring,
  or an odd cycle; primal and dual LP solutions with equal objective values, or a Farkas vector for infeasibility. Its
  ideal is a checker that is simple and runs in about linear time in the size of the input and witness.
- [I] Nexus already has the untrusted half of most pairs (Jolt, replicad, `critic.ts`'s mesh tests, the agent). What
  it lacks is the witness and the checker. Every solver call should be changed to return a witness.

### A6. Proof-producing SAT and SMT, and what the browser can run

- [C] DRAT lists the clauses the solver learned. Checking it needs search, so verified checkers first convert DRAT to
  LRAT or GRAT with an **untrusted** tool, then check the result. In one table, CaDiCaL's DRAT path took 11,252 s in
  total (solve, drat-trim, cake_lpr). CaDiCaL's native LRAT followed by LRAT-TRIM took 6,263 s; the trimmed proof was
  18 GB against a 70 GB raw one (https://cca.informatik.uni-freiburg.de/papers/PollittFleuryBiere-MBMV23.pdf).
- [C] In 2024 the CaDiCaL authors found that their handling of pure literals produced incorrect DRAT proofs "even if
  the answer is correct": the proof is wrong while the answer is right
  (https://cca.informatik.uni-freiburg.de/papers/BiereFallerFazekasFleuryFroleyksPollitt-SAT-Competition-2024-solvers.pdf).
- [C] LRAT-Catcher (arXiv 2607.00815, 2026) imports CaDiCaL LRAT certificates into Lean, in workflows that differ "in
  what it costs in trust". Pure kernel reflection keeps the kernel-only trusted base, but needs 28.5 GB and 245 s for a
  22 KB certificate. `native_decide` scales, but adds the Lean compiler to the trusted base. CaDiCaL 3 needs
  `--no-factor`, because its factoring step breaks the import (https://arxiv.org/html/2607.00815v1).
- [C] Carcara is an independent Rust checker and elaborator for Alethe SMT proofs, produced by veriT and cvc5
  (https://link.springer.com/chapter/10.1007/978-3-031-30823-9_19). cvc5's Alethe output "slightly deviate[s] from the
  Alethe standard", so Carcara needs extra flags (`-i --allow-int-real-subtyping --expand-let-bindings`)
  (https://github.com/cvc5/cvc5/discussions/10537).
- [C] cvc5 builds to WebAssembly with Emscripten (3.1.70 or later) using `--wasm` / `--wasm-web`
  (https://cvc5.github.io/docs/latest/installation/installation.html). This pass did not check whether proof output
  works in that build.
- [C, code] Nexus has no SAT or SMT solver in `package.json` today (its dependencies include `jolt-physics`,
  `replicad` and `replicad-opencascadejs`). The `check.smt` of research 26 is a proposal, not code.
- [I] The pattern that holds across SAT and SMT: **a fast, untrusted, rich-format producer, an untrusted elaborator
  (drat-trim, Carcara's elaboration), and a small trusted checker of a simple format**. In Nexus the producer could run
  in WASM in a worker. The checker must be Nexus's own TypeScript (or a verified WASM checker), and it must also own
  the **encoding** from the claim to CNF or SMT-LIB. Otherwise a correct unsat proof can certify the wrong formula.

### A7. Interval certificates: "safe over a range" made checkable

- [C] Tucker, "A rigorous ODE solver and Smale's 14th problem", Found. Comput. Math. 2(1):53–117, 2002, proved that
  the Lorenz equations support a strange attractor. "The main algorithm is based on a partitioning process and the use
  of interval arithmetic with directed rounding" (https://research.monash.edu/en/publications/a-rigorous-ode-solver-and-smales-14th-problem).
  His normal-form step needed interval bounds on the first 19,386 divisors
  (https://webperso.ensta.fr/jaulin/swim13_slides_tucker.pdf).
- [C] Flyspeck checked the Kepler conjecture formally in HOL Light and Isabelle (Forum of Mathematics, Pi, 2017). Three
  computer pieces each needed a thesis: interval arithmetic for nonlinear inequalities on boxes of dimension at most 6,
  linear programs (Obua, then Solovyev's optimised HOL Light tool for checking LP certificates), and the tame-graph
  enumeration (https://www.cambridge.org/core/journals/forum-of-mathematics-pi/article/formal-proof-of-the-kepler-conjecture/78FBD5E1A3D1BCCB8E0D5B0C463C9FBC;
  https://www.cl.cam.ac.uk/~jrh13/papers/revkepler.pdf; https://arxiv.org/html/2402.08032v1).
- [C] Hales's 2024 retrospective names a weak point: one part of the proof "is not translated into HOL Light. This hand
  translation is the weakest link in the entire Flyspeck project" (https://arxiv.org/html/2402.08032v1).
- [C] ECMAScript has no rounding-mode control and no standard `nextUp`. Outward rounding is built by hand, typically by
  stepping each result one representable float outward. That loses an ULP even when the operation was exact; the
  `interval64` library offers `nextUp`, `nextDown` and `twoSum` for this
  (https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/62976095/rounding-modes-in-javascript;
  https://github.com/XyraSinclair/interval64; https://esdiscuss.org/topic/directed-rounding).
- [M] `Math.sin`, `Math.exp` and the like are not required to be correctly rounded in ECMAScript, and engines differ.
  An interval kernel cannot trust them to one ULP. It must widen them by a stated bound, or compute its own enclosures
  (Taylor series with rational remainder bounds).
- [I] For Nexus: "this bracket holds over the whole tolerance range", "this beam stays below yield for every load in
  the box" and "these parts never touch through the stroke" are all Tucker or Flyspeck claims. The witness is the
  partition into boxes. The checker confirms that the boxes cover the domain and that the interval enclosure holds on
  each box. Hales's weakest link is a warning for Nexus too: the hand step from the user's words to the formal claim
  stays outside any checker (26 B1.3).

### A8. Tool qualification: what a standard would ask of the kernel and of the AI

- [C] DO-330 / DO-178C sets five tool qualification levels from three criteria and the software level (A to D).
  Criterion 1, the output becomes part of the airborne software: TQL-1 to TQL-4. Criterion 2, a verification tool
  whose output is used to eliminate or reduce other verification: TQL-4, TQL-4, TQL-5, TQL-5. Criterion 3, a tool that
  could only fail to detect an error: TQL-5 at every level. "Verification tools typically fall into Criteria 3"
  (https://www.rapitasystems.com/do-330). NASA expects formal methods tools to be qualified at TQL-4 or TQL-5, with 24
  and 14 objectives (https://shemesh.larc.nasa.gov/fm/FMinCert/NASA-CR-2017-219371.pdf).
- [C] ISO 26262-8:2018 clause 11 derives a tool confidence level (TCL1 to TCL3) from tool impact (TI1, TI2) and tool
  error detection (TD1 to TD3). TCL1 needs no qualification (https://iso26262.academy/features/concepts/tool-confidence).
  ISO 26262 lets a tool with direct impact be used without qualification if process measures detect its errors (TD1).
  IEC 61508 requires both qualification and process measures for class T3 tools
  (https://www.tuvsud.com/-/jssmedia/global/pdf-files/webinar-presentations/tuev-sued_webinar_2018-01-16_finding-the-right-software-tools-for-functional-safety-projects.pdf).
- [C] IEC 61508-3 clause 7.4.4 sorts offline tools into T1 (no output that reaches the executable), T2 (can fail to
  reveal defects) and T3 (can contribute to the executable). For each T3 tool, evidence of conformance to its
  specification must be available, and "each new version of off-line support tool shall be qualified"
  (https://61508.org/wp-content/uploads/2024/11/09B-IEC-61508-Why-tool-qualification_V2_cut.pdf).
- [I] This is the certifying-algorithm argument in a regulator's words. If every AI or solver output is checked by the
  kernel, the AI's tool error detection is TD1, and only the **checker** needs qualifying, as a criterion 3 / T2 tool.
  That is the cheapest class. Two further consequences. The kernel must be versioned, with every version re-qualified
  (IEC 61508's rule). And if Nexus results are ever used to *skip* a physical test, the kernel moves to criterion 2
  (TQL-4), which means written requirements, tests traced to them, and configuration management of the kernel.

### A9. What end-to-end trust costs: seL4, CompCert, and the parts left out

- [C] Csmith spent "about six CPU-years" on CompCert and found no wrong-code errors in its verified middle end, while
  every other compiler tested had them (https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf). Csmith did find
  bugs in CompCert's unverified parts (https://rjlipton.com/2019/11/19/a-clever-way-to-find-compiler-bugs).
- [C] CompCert's unverified edges are the preprocessor, the lexer, the assembly printer, the assembler and the linker.
  The parser is verified against its grammar (https://www.cs.cornell.edu/courses/cs6120/2020fa/blog/compcert). Coq's
  extraction to OCaml "is complex, unverified, and known to contain bugs", and the OCaml compiler and runtime are in
  the trusted base unless a binary-extraction route like CakeML's or Œuf's is used
  (https://homes.cs.washington.edu/~ztatlock/pubs/oeuf-mullen-cpp18.pdf; https://cakeml.org/itp18-short.pdf).
- [C] Pollack (1997): it is "necessary to trust the tool that shows us the assumptions used in the proof", and then it
  is up to you "to decide if the formal statement means what is informally claimed"
  (https://www.brics.dk/RS/97/18/BRICS-RS-97-18.pdf).
- [I] So the kernel must hold its own **printer**: the code that turns a claim into the plain words the user accepts.
  If the printer lies, a correct check certifies the wrong sentence. The parser of certificates is also in the kernel,
  and it must be strict, the CompCert parser lesson.

### A10. The Nexus checkers as they stand (read in the code this pass)

- [C, code] `src/nexus/make/rules.ts` (205 lines) checks interference, clearance and heat on triangle meshes. Its
  trusted base is large. It imports `three`, `./space` (242 lines), `./critic` (867), `../view/kit3d` (527, a *view*
  module), `../graph` (642) and `../matter`: about 2,500 lines of Nexus plus three.js, all in floating point.
- [C, code] Its exemptions are partly **by name**. `candidates()` drops every pair where either piece, or its owner,
  matches `fastenerRe` (`bolt|screw|stud|nut|rivet|washer|dowel|…|plug`). It does not drop only the fastener's own
  joint: a part named "plug" or "clip" is excused from interference with **everything**, so a renamed part passes. The
  `passes` / `joins` exemptions also match on names.
- [C, code] Pairs are tried on triangles only when their oriented boxes overlap by more than 0.5 mm
  (`c.depth > 0.0005`), so a crossing shallower than that is never tested. The "inside" test samples three triangle
  centroids. `rulesThrough` samples a motion at `steps` discrete poses, so a collision between two samples is missed.
  These are sensible heuristics for a critic. None of them is a certificate.
- [C, code] `src/nexus/evidence.ts` is a **trust lattice**, not a checker. It ranks nine kinds from `exact` to
  `hypothetical`, propagates the weakest along wires, and reads a node's kind from what the node is. It is the badge
  half of a kernel already. `nonphysical()` **fails open**: a port whose unit does not parse returns `null`, which
  means "no complaint" ("a check never breaks what it checks"). That is right for a critic and wrong for a gate.
- [C, code] `src/ganglia/units.ts` (157 lines) holds dimensions as six float exponents (mass, length, time, current,
  temperature, amount), compared with a tolerance of 1e-9 (`sameDim`). It throws on an unknown unit, which is correct
  fail-closed behaviour. Angles (`rad`, `deg`, `rev`) are dimensionless, so N·m of torque and J of energy cannot be
  told apart. Its header points to a homogeneity scaling test in `dimensionsOf` and `ganglia.test.ts`. Neither exists
  in the tree today (searched), so the check the header describes is not where it says.
- [I] The kernel can take the algebra of `units.ts` (made exact) and the lattice of `evidence.ts` (as badge levels).
  It should take none of `rules.ts`'s code. `rules.ts` stays the fast critic that finds problems; the kernel checks
  certificates that the critic, or a solver, produces.

## (B) What Nexus should take

### B1. The kernel, file by file (spec 10, with C29 and T18; structure rules in spec 00)

A new folder `src/kernel/`. Its law: **it checks, it never searches.** It imports nothing outside itself: no three.js,
no DOM, no replicad, no Jolt, no `src/nexus`. Decisions use exact `BigInt` rationals, or outward-rounded intervals
where floats are unavoidable. Any exception, unknown field or unsupported construct is a **fail** (fail closed). The
budgets count non-blank, non-comment lines.

| # | File | What it holds | Budget |
| --- | --- | --- | --- |
| 1 | `kernel/manifest.ts` | the kernel's version, the SHA-256 of each kernel file and of each trusted data table, built at build time and shown on every badge | 50 |
| 2 | `kernel/rat.ts` | exact rationals on `BigInt`: normalise, + − × ÷, compare, from-float (exact: a float is a dyadic rational), to-decimal for printing | 120 |
| 3 | `kernel/interval.ts` | intervals of float64 with outward rounding by `nextUp`/`nextDown` (bit-stepping through a `DataView`), + − × ÷, sqrt, integer powers, and its own enclosures of sin, cos, exp and log by rational Taylor bounds (never `Math.sin` trusted to one ULP) | 220 |
| 4 | `kernel/dim.ts` | dimensions as 7 integer (or rational) exponents: the six of `units.ts` plus **plane angle as its own base** (torque ≠ energy), compared exactly; the unit table is *data*, hashed in the manifest | 90 |
| 5 | `kernel/term.ts` | a small expression language (numbers, ports, + − × ÷, powers, the elementary functions, min, max, if-less-than), with a canonical serialisation and its hash, a rational evaluator and an interval evaluator | 220 |
| 6 | `kernel/print.ts` | the one printer from a claim to plain words and to the canonical text the user accepts: the Pollack component | 100 |
| 7 | `kernel/cert.ts` | the certificate envelope: a strict parser (unknown fields refused, sizes capped), the claim's hash, the DAG of sub-certificates, `trustedBase[]` | 130 |
| 8 | `kernel/check/dims.ts` | decides a term's dimension, and decides that a law is homogeneous, by exact exponent algebra; no payload | 60 |
| 9 | `kernel/check/witness.ts` | an existential claim ("these values satisfy these equations to tol"): re-evaluates the supplied point in intervals | 70 |
| 10 | `kernel/check/cover.ts` | a universal claim over a box ("f ≤ c for every x in B"): checks that the supplied tree of sub-boxes covers B exactly (in rationals) and that the interval enclosure of f is ≤ c on every leaf (Tucker/Flyspeck) | 160 |
| 11 | `kernel/check/farkas.ts` | linear claims: an LP bound by its dual, infeasibility by a Farkas vector, checked exactly in rationals (statics, load paths, tolerance stacks, bolt groups) | 120 |
| 12 | `kernel/check/lrat.ts` | unsat of a CNF by an LRAT proof (unit propagation along the hints, RAT checks), and `kernel/encode.ts`, the **only** CNF encoder of claims: the kernel owns the formula it certifies | 220 + 120 |
| 13 | `kernel/check/gap.ts` | geometry on triangle meshes. "A and B keep gap ≥ g": per pair of leaves, a separating plane, checked with interval arithmetic on every vertex. "A and B cross": two triangles that cross, checked with exact rational orientation predicates | 200 |
| 14 | `kernel/check/rewrite.ts` | "e₁ = e₂": replays a chain of steps, each naming a rule from the kernel's fixed rule set (field axioms and the elementary identities), each side condition discharged by a `dims`, `cover` or `witness` sub-certificate | 160 |
| 15 | `kernel/check/table.ts` | "this value is row r of table T": checks the table's hash against the manifest and reads the row; T is then named in `trustedBase` | 50 |
| 16 | `kernel/badge.ts` | the only code that can make a `Checked` value (a branded type plus a run-time token held in a module closure); the level comes from the weakest item in `trustedBase` and the weakest sub-certificate, using `evidence.ts`'s order | 70 |

Total budget: about **2,160 lines**, no file over 250. That is about 5 times HOL Light's kernel, a quarter of seL4's C,
and small enough for one person to read in a day. [I]

What the kernel does **not** contain, and therefore names as trusted when a claim leans on it: the JS engine and its
`BigInt`; OpenCascade's tessellation (a gap certified on the mesh is a gap of the mesh; the solid needs the
tessellator's deflection, which the kernel cannot check); Jolt (a simulation is a `witness` at most, never a `cover`);
the source tables (`threads.ts` and others, named by hash); and the user's acceptance of the printed statement. [I]

### B2. The certificate kinds, and what each must contain (data model, spec 10; amends 26 B2.7)

Every certificate has `{kind, claim (a term.ts term), claimHash, payload, trustedBase[], producer, producerVersion,
kernelVersion, cost, result}`, and may have `subs[]` (sub-certificate hashes). The table gives what the payload must
hold and the level a passing check earns. [I throughout; basis A1 to A9]

| Kind | Claim | Payload must contain | Checker | Earns |
| --- | --- | --- | --- | --- |
| `dims` | term t has dimension D; law L is homogeneous | nothing (decided) | `dims.ts` | checked (trusts the unit table hash) |
| `witness` | ∃x: F(x) = 0 within tol; a mate's residual ≤ ε | the point x as exact floats (hex or rational), the tolerance, the units | `witness.ts` | checked at that point only |
| `cover` | ∀x ∈ B: f(x) ≤ c | the box B in rationals; the subdivision tree; optionally per-leaf derivative bounds for mean-value enclosures | `cover.ts` | checked over B |
| `farkas` | min cᵀx s.t. Ax ≤ b is ≥ v; or the system is infeasible | A, b, c as rationals (or the claim terms they come from); the multiplier vector y | `farkas.ts` | checked |
| `lrat` | a configuration claim is impossible (unsat) | the claim (the kernel encodes it); the LRAT steps as produced by CaDiCaL and trimmed | `lrat.ts` + `encode.ts` | checked (the solver is not trusted) |
| `model` | a configuration claim is possible (sat) | the assignment | `encode.ts` evaluator | checked |
| `gap` | gap(A, B) ≥ g; or A and B cross | the two mesh hashes; per leaf pair, a plane (n, d) in rationals, or the two crossing triangle indices | `gap.ts` | checked *on the meshes* (trusts the tessellation) |
| `sweep` | gap(A(t), B) ≥ g for all t ∈ [0, 1] | the time slabs; per slab, an interval enclosure of A's pose and a `gap` sub-certificate on the swept hull | `cover.ts` + `gap.ts` | checked through the motion (fixes `rulesThrough`'s sampling) |
| `rewrite` | e₁ = e₂ given side conditions | steps: rule id, position, substitution; the side conditions' sub-certificates | `rewrite.ts` | checked |
| `refines` | the folded node behaves as its inside on its ports (a translation-validation claim) | per output port, a `rewrite`, or a `cover` over the declared input ranges | `rewrite.ts` / `cover.ts` | checked (to the ranges stated, the Alive2 bound) |
| `table` | value v is row r of source T | the table id, the row key, the table hash | `table.ts` | specified (trusts T) |
| `sample` | e₁ ≈ e₂ at N seeded points | the seed, N, the worst difference | `witness.ts` per point | **tested**, never checked |
| `judged` | anything a checker cannot decide | the judge's model, prompt hash and verdict | none | judged (C29: shown beside, never as a gate) |

### B3. Rules (spec 00 constitution, spec 10)

1. **The kernel is closed** (rule, spec 00, a new constitution row with a check): `src/kernel/**` may import only
   `src/kernel/**`. An import-boundary test fails the build otherwise. The agent's tool set cannot write there (a hook
   on paths). A kernel change needs a decision record and a fresh evaluator, as an IEC 61508 new tool version would.
2. **Only the kernel says "checked"** (rule, spec 10): `Checked` is a branded type that only `badge.ts` constructs. A
   run-time token stops a cast from forging one. A board that shows *checked* without a kernel certificate hash is a
   build failure (grep plus a property test).
3. **Fail closed in the kernel, fail open in the critic** (rule, spec 10): `rules.ts`, `nonphysical` and the walker
   keep "a check never breaks what it checks". In the kernel, every exception, timeout or unparsed unit is a fail with
   the reason shown. [C basis A10]
4. **No exemptions by name in a certificate** (rule, spec 01): a certificate may excuse a pair (a bolt in its hole)
   only by an interface record (01's negative: this hole was cut for this bolt), named by its id, never by a name
   regex. `fastenerRe` stays in the critic only. [C basis A10]
5. **The kernel owns the encoding and the printer** (rule, spec 10): the CNF/SMT encoding and the plain-words printing
   of a claim are kernel code. A solver gets the kernel's formula, never the agent's. [C basis A6, A9]
6. **Two kernels for the costly kinds** (way of working, spec 00 CI): `cover`, `lrat` and `gap` also get a second,
   independently written checker that runs in CI on every evaluation set. Ideally it is in another language (Rust/WASM,
   or Python with `fractions`), and it must not be derived from the first (the lean4lean lesson). Disagreement stops
   the release. [C basis A3]
7. **Planted wrong certificates** (spec 00 evaluation sets, T18's check): for every kind, a corpus of crafted wrong
   certificates (a cover with a gap, a plane off by one ULP, an LRAT step with a wrong hint, a claim whose print
   differs from its term) that must be refused. An AI red team is asked to grow it, as Lean's bug hunt did. [C basis A3]
8. **State the bound** (rule, spec 10): a `refines` or `cover` claim prints its ranges, and a `witness` prints "at this
   point". No badge says more than the certificate covers (Alive2's honesty, CompCert's "front end not verified").
   [C basis A4, A9]
9. **Name the runtime** (rule, spec 10): `trustedBase` always includes the JS engine and version and, for a WASM
   checker, its build hash. A dependency upgrade (the GMP lesson) re-runs the planted-certificate corpus. [C basis A3]

### B4. Nodes and pipelines

10. **`check.certificate`** (node, spec 10; 26 B3.11 made concrete): it takes a claim and a certificate, calls the
    kernel in a worker with no network, and returns pass, fail (with the failing leaf, step or plane) or unsupported.
11. **`prove.gap`** (pipeline, spec 01 and 09): `rules.ts` finds the near pairs, then an untrusted BVH search makes the
    separating planes, then the kernel checks them. The badge for "no clash, clearance kept" is set only by the
    certificate, not by the critic having found nothing.
12. **`prove.range`** (pipeline, spec 10, the Tucker pattern): a branch-and-bound search, untrusted and possibly
    AI-guided in where it splits, produces the cover tree for "safe over the tolerance box". The kernel checks the tree.
13. **`solve.sat` in WASM** (node, spec 10): CaDiCaL (or cvc5) in WASM in a worker, asked for LRAT, with `--no-factor`
    on CaDiCaL 3. A trimmer runs untrusted. Only `lrat.ts` decides. First, a spike to confirm that the WASM build emits
    proofs. [C basis A6]
14. **`fold` emits `refines`** (amendment, spec 09 functor law; 26 B3.17): each fold records a `refines` certificate
    over the declared port ranges, or a `sample` badge (tested) where none could be found.

### B5. Data models

15. **Unit table as hashed data** (data model, spec 10 and 24 quantity kinds): `UNITS` moves out of code into a data
    file with a source per row and a hash in the manifest. `dim.ts` adds plane angle as a base so torque and energy
    differ. The old float-exponent `sameDim` stays in the app until it is migrated.
16. **Trust levels from `evidence.ts`** (data model, spec 10): the kernel's badge levels reuse the order of
    `EVIDENCE` (exact > measured > specified > derived > …) and add the *check level* (judged < tested < checked at a
    point < checked over a range < checked by two kernels). A value shows both: where it came from, and how it was
    checked.

### B6. Ways of working and ideas

17. **Spend correctness on the checker, not the solvers** (decision, spec 10): no verification work on Jolt, replicad,
    the agent or `critic.ts`. Optional later: a Lean proof of `rat.ts`'s and `interval.ts`'s lemmas, offline in CI
    (26 B4.21). [C basis A2, A9]
18. **The qualification story** (spec 10 note; 07 ideas): with every result certified, the generators need no
    qualification. Only the kernel is a "TD1 / criterion 3" tool. Nexus can write a short tool-qualification dossier
    for the kernel alone: its requirements (this file's table), its tests (the planted corpus) and its versions (the
    manifest). [C basis A8]
19. **Fix the units header now** (small task, spec 10): `units.ts` cites `dimensionsOf` and `ganglia.test.ts`, which
    do not exist. Either write the homogeneity scaling test or correct the comment. A checker's documentation must not
    claim a check that is absent. [C basis A10]
20. **The living world's umpire uses the kernel** (spec 11): claims made in a shared world (this bridge holds, this
    door clears) carry certificates that every client re-checks on load. Hashes make the re-check cheap. [I]
21. **A "break the kernel" game** (spec 07 idea): users and AIs earn credit for a crafted certificate the kernel
    wrongly accepts. Each find joins the planted corpus (Lean's Kernel Arena as the model). [C basis A3]

## (C) Questions

### The boundary of the kernel
1. Is 2,160 lines the right budget, or should `lrat.ts` and `gap.ts` sit in a second ring with a lower badge?
2. Should the kernel be TypeScript at all, or a small verified WASM module (CakeML-style) called from TypeScript?
3. How can an import-boundary check also stop dynamic `import()` and `globalThis` tampering by code in the page?
4. Can a run-time token in a module closure resist a plugin with the same JavaScript realm, or does the kernel need
   its own Worker or realm?
5. Does the kernel need the Worker sandbox (no network, no DOM) in production, or only in CI?
6. Which JS engines will the manifest name (V8, SpiderMonkey, JavaScriptCore), and do the checkers give identical
   verdicts on all three?
7. Is `BigInt` arithmetic identical across engines for the sizes Nexus will use, and has any engine shipped a `BigInt`
   bug?
8. Should the kernel refuse to run on an engine version it has not been tested on?
9. Where does the canonical serialisation of a term come from: JSON with sorted keys, or a bespoke text form (27's
   notation)?
10. Can `print.ts` be small and still produce words a non-engineer will accept as the meaning of a claim?
11. Who accepts the printed statement for a shared block made by someone else?

### Numbers
12. Is bit-stepping `nextUp` enough, or does Nexus need error-free transforms (`twoSum`) to keep intervals tight?
13. What enclosures of sin, cos, exp, log and pow can be written in under 150 lines, with what proofs of their bounds?
14. How wide do intervals grow on a typical Nexus law chain (a bolt preload to a joint's slip), and does that make
    `cover` certificates impractically deep?
15. Should the kernel use affine arithmetic or Taylor models to fight the dependency problem, and how much code would
    that add?
16. What tolerance is right in a `witness` check of a mate residual: absolute, relative, or tied to the
    part's standard (its fit grade)?
17. Can a float64 witness from Jolt or replicad ever certify more than "at this point", given how chaotic contact is?
18. Is the exact-rational route fast enough for `farkas.ts` on a frame of a few thousand members?
19. Should dimension exponents be integers only, or rationals (for √Hz in noise densities)?
20. Should angle be a base dimension, and what breaks in `lawgraph.ts` if it is?
21. How should the kernel treat logarithmic units (dB) and offset units (°C) in claims?

### Geometry
22. Can a separating-plane certificate be found for every pair of non-convex parts that keep a gap, or does it need a
    convex decomposition, and who certifies the decomposition?
23. What is the certificate that a part sits *in* a hole cut for it (the exemption) without a name: an interface
    record id plus a coaxiality `witness`?
24. How does the kernel bound the distance between OpenCascade's exact solid and its tessellation, if it cannot trust
    the deflection the tessellator reports?
25. Could the kernel check B-rep facts directly (a point inside a solid, a face's normal) with exact predicates, or is
    the mesh the only checkable level?
26. How large are gap certificates for an engine of 3,000 parts, and can they be stored and shipped with a board?
27. Can the `sweep` certificate handle rotation (a crank) as well as translation, with interval enclosures of the
    rotation matrix?
28. What is the right claim for "touching is allowed here" (a bearing seat), so that gap ≥ 0 and crossing ≤ 0 are both
    certified?
29. Can heat claims (`rules.ts` heat) be put in kernel form, or do they rest on a model that is only `simplified`?

### Solvers and proofs
30. Does cvc5's WASM build emit proofs, and how large are they for Nexus's typical constraints?
31. Does CaDiCaL compile to WASM with LRAT output intact, and what is the memory ceiling in a browser tab?
32. Which Nexus questions are naturally SAT (configuration, compatibility, a kit that fits) and which are LP or
    nonlinear?
33. Is the kernel's own CNF encoder a weak point (an encoding bug certifies the wrong formula), and how is it tested?
34. Should Nexus accept Alethe proofs and run a small Alethe checker, or only LRAT and Farkas, and keep SMT outside the
    kernel?
35. Can an LP certificate from a float solver be rounded to exact rationals and still pass, as Flyspeck's did?
36. What happens when an AI-generated proof is correct but its claim is not what the user asked for: how is that
    caught before the check?
37. Can the `rewrite` rule set stay fixed, or will each new law need a new rule, and who checks those rules?
38. Should the rewrite rules themselves be checked offline in Lean before they enter the kernel (Alive-style)?

### Adversaries and failure
39. If the in-app AI is rewarded for green badges, how fast will it find what the kernel does not inspect?
40. What is the Nexus equivalent of metaprogramming that bypasses the front end (a crafted JSON board loaded directly)?
41. How should the planted-certificate corpus be organised so that it grows with every kernel bug found?
42. Is a second kernel written by another AI model independent enough, or do models share blind spots?
43. When the two kernels disagree, who decides, and what does the user see meanwhile?
44. Should the kernel cap certificate size and check time, and what does a refusal for size mean to the user?
45. Can a malicious shared block make the kernel hang (a cover tree of depth 10⁹), and how is that bounded?
46. How do we stop the critic's "nothing found" from being shown as if it were a certificate?
47. Should a board that was checked by an older kernel version be re-checked automatically, or shown as checked by
    that version?

### Standards and acceptance
48. Would any certifying body accept a browser-run checker as a qualified tool, and under which standard first?
49. What would a TQL-5 or TCL1 dossier for the Nexus kernel contain, page by page?
50. If a Nexus result is used to skip a physical test, which criterion-2 objectives become due?
51. Do civil codes (Eurocode, AISC) say anything about software-checked calculations that the kernel should meet?
52. How does ISO 26262's tool error detection (TD) argument apply when the checker and the generator are in the same
    app?
53. Should the kernel's requirements be written as testable sentences traced to tests, DO-330 style, from the start?

### Cost and scope
54. Which three certificate kinds would cover most of what users ask Nexus to check in the first year?
55. What does a `cover` certificate cost to produce for a 6-parameter bracket, against the FEA it replaces?
56. Should cheap kinds (`dims`, `witness`, `table`) run on every edit and costly ones (`cover`, `lrat`, `gap`) on save,
    as 26 B4.23 proposed?
57. Is it worth verifying `rat.ts` and `interval.ts` in Lean, and what would that cost in person-weeks?
58. What is the seL4-like ratio for Nexus: how many lines of proof per line of kernel, if the kernel were verified?
59. Can Nexus reuse an existing verified checker (cake_lpr in WASM) rather than write `lrat.ts`?
60. How much of `evidence.ts`'s lattice belongs in the kernel, and how much is display?

### People and words
61. How does a badge explain "checked on the mesh, trusts the tessellation" in words a hobbyist reads in two seconds?
62. Should a user be able to see the certificate (the planes, the boxes), and does seeing it build trust or noise?
63. Who in the project owns the kernel, and is that one person enough (the bus factor of a trusted base)?
64. How is the user told that a claim was *judged* by the second model rather than *checked*, without the judged
    claims looking worthless?
65. When a user's own words contain the error (Hales's hand-translation link), what tool helps them see it?

## (D) New branches

- Verified interval arithmetic libraries (Coq's Interval package by Melquiond, Flocq) as a model for `interval.ts` and its proofs
- Shewchuk's adaptive exact geometric predicates and CGAL's exact-predicates kernel, as the base of `gap.ts`
- Certified collision detection: conservative advancement and interval continuous collision detection (Redon et al.), for the `sweep` kind
- VeriPB pseudo-Boolean proofs (Gocht, Nordström) for counting and cardinality constraints that CNF encodes badly
- Exact LP solvers with certificates (SoPlex's exact mode, QSopt_ex) as producers for `farkas.ts`
- Proof-carrying code's original encodings (Necula and Lee 1996), as a template for shipping certificates with shared blocks
- Lean's Kernel Arena and `comparator`: how Lean organises adversarial tests of its checkers, and what a Nexus arena would copy
- nanoda's design (Rust, independent of the C++ kernel) as a case study in writing a genuinely independent second checker
- Taylor models (Berz and Makino; COSY) and validated ODE solvers (CAPD, VNODE-LP) for certified motion and dynamics claims
- Certified FEA: a-posteriori error estimators with guaranteed bounds (equilibrated residuals, Prager–Synge) as certificates for stress claims
- Reproducible floating point across JS engines: how V8 and SpiderMonkey differ in `Math.*` accuracy, measured
- CakeML or Wasm-verified compilation (WasmCert, Iris-Wasm) for shipping a verified checker as WASM into the browser
- N-version programming studies (Knight and Leveson 1986) on correlated failures between independently written programs
- Assurance cases (GSN, SACM) as the format for the kernel's qualification dossier
- Spec mining from Alive2-style disagreements: using checker failures to find where Nexus's own semantics are vague
- Coq's and Isabelle's "proof term size" engineering (reflection, compressed certificates) for keeping Nexus certificates small enough to ship
- Machine-checked statics and structural codes (any work formalising Eurocode or AISC checks) as targets for the `farkas` and `cover` kinds
- AI red-teaming of verifiers beyond Lean (reports of AI finding soundness bugs in Coq, Isabelle, Z3) as a measure of how adversarial the in-app agent may become

# Research (round 5): AI that proves, and shapes that explain themselves (certificates, e-graphs, shape programs, Lean)
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here (already in earlier passes): Z3 as the official `z3-solver` WebAssembly npm package, the `check.smt`
node with counterexamples and conflicting sets, dReal's δ-sat, Mathlib's size (291,825 theorems on 2026-10-30), the
Fermat's Last Theorem formalisation, PhysLean and dimensional analysis in Lean (`06`, `08`, `19`, synthesis); decision
0003 (numbers before pictures, checks that bring new information); the reviewer panel and "five calls to one model are
one witness" (`11`, `23`). This pass asks one question: **how does an in-app AI hand over work that can be checked
instead of trusted**, and how can a shape say what it is (a program with loops), not only what it looks like.

## (A) Findings

### A1. The asymmetry everything rests on: certifying algorithms

- [C] McConnell, Mehlhorn, Näher & Schweitzer, "Certifying algorithms", *Computer Science Review* 5(2):119–161, 2011,
  DOI 10.1016/j.cosrev.2010.09.009 (https://www.sciencedirect.com/science/article/abs/pii/S1574013710000560). A
  certifying algorithm returns, with each output *y* for input *x*, a **witness** *w*; a **checker** decides the
  witness predicate W(x, y, w). The user "can be sure of the correctness of the output without having to trust the
  algorithm". The idea grew out of the LEDA library, where it was used to make LEDA's implementations reliable; earlier
  names were "program checking" and "result checking".
- [M] Standard examples from the same survey: a bipartiteness test returns a 2-colouring (yes) or an odd cycle (no); a
  planarity test returns an embedding or a Kuratowski subgraph (the survey cites Kuratowski 1930, which the [C] intro
  PDF at https://people.eng.unimelb.edu.au/rizkallahc/publications/IntroCertAlg.pdf confirms); a linear program returns
  primal and dual solutions whose objective values match (LP duality), or a Farkas certificate of infeasibility.
- [I] The design rule this gives: **the AI is the untrusted algorithm; Nexus owns the checker.** The checker should be
  small, deterministic, and simpler than whatever made the answer. For a "yes" the witness is usually the object
  itself (a board that runs and meets its numbers). A "no" ("no bolt from the library fits") needs a separate
  certificate: an unsat core, an infeasibility proof or a bound.

### A2. Self-verification by an LLM is not a checker

- [C] Huang et al., "Large Language Models Cannot Self-Correct Reasoning Yet", ICLR 2024 (https://arxiv.org/pdf/2310.01798):
  with no external feedback (intrinsic self-correction), LLMs "struggle to self-correct their responses", and
  sometimes do worse after self-correction. Earlier gains came from oracle labels telling the model when to stop. The
  paper also reports simple self-consistency doing better than multi-agent debate in their settings
  (https://www.emergentmind.com/papers/2310.01798 summary; the self-consistency point is from that summary, not
  re-read in the PDF).
- [C] Stechly, Valmeekam & Kambhampati, "On the self-verification limitations of large language models on reasoning
  and planning tasks", ICLR 2025 (https://proceedings.iclr.cc/paper_files/paper/2025/hash/f3c5e56274140e0420baa3916c529210-Abstract-Conference.html):
  GPT-4 on Game of 24, graph colouring and STRIPS planning. "Significant performance collapse with self-critique and
  significant performance gains with sound external verification." The abstract also notes that **merely re-prompting
  with a sound verifier** carries most of the gain; the content of the critique matters less. Their earlier preprint
  is titled "GPT-4 Doesn't Know It's Wrong" (arXiv 2310.12397, https://arxiv.org/abs/2310.12397).
- [I] For Nexus this is a strong result: a second model reading the first one's steps (the agent's current check, in
  `nexus/agent.ts`) is a *judge*, not a *verifier*. Where a sound checker exists (units, a solver residual, a mate
  residual, an interference test, a load case), it must be the gate. The judge keeps the jobs no checker can do: was
  the user's request understood, is the design sensible. This sharpens decision 0003: a check that brings new
  information is a *sound* one where one can be had.

### A3. The weak link moves to the statement: autoformalisation

- [C] AlphaProof (Hubert, Mehta, Sartran, Horváth, Zahavy et al., *Nature*, 12 Nov 2025,
  https://www.nature.com/articles/s41586-025-09833-y): an RL agent that finds Lean proofs. With AlphaGeometry 2 on P4,
  it solved 4 of 6 IMO 2024 problems, 28/42, silver range, one point below gold. **The five non-geometry problems
  were formalised in Lean by human experts** right after release, after consultation with the IMO judges. Its
  autoformaliser (a fine-tuned Gemini 1.5 Pro) started from about 2,500 expert-formalised problems, about 50 with
  written formalisation reasoning, grown to about 7,000 triplets. The multi-day compute far exceeded contest time limits.
- [C] Harmonic's Aristotle: formally verified Lean 4 proofs for 5 of the 6 IMO 2025 problems, announced 28 July 2025,
  statements and proofs published on GitHub (`harmonic-ai/IMO2025`). Their framing: "when our system outputs the proof,
  nobody has to look at it" (https://www.harmonic.fun/news/imo-ios; https://inferencebysequoia.substack.com/p/the-2025-imo-winners-circle-how-three).
  [I] That is true of the proof only. Someone still has to look at the *statement*.
- [C] "miniF2F-Lean Revisited" (arXiv 2511.03108, https://arxiv.org/html/2511.03108v1): **more than half** of miniF2F's
  problems had discrepancies between the formal and informal statements (wrong formalisations, unprovable theorems,
  over-simplified statements). Measured honestly, a state-of-the-art autoformaliser scored 66 %, not the reported 97 %.
  The whole pipeline (autoformalise, then prove) went from about 40 % on v1 to 70 % on the corrected v2. The paper
  scores two ways, "full score" and "Olympiad setting", because provers got full credit for proving
  **excessively simplified** versions of problems.
- [C] Math Inc.'s Gauss (https://www.math.inc/gauss; https://math-inc.github.io/strongpnt): an autoformalisation agent
  that completed the strong Prime Number Theorem challenge Tao and Kontorovich set in January 2024. About 25,000 lines
  of Lean, over 1,000 theorems and definitions, "with targeted human scaffolding and review of key lemmas and
  strategies".
- [I] The lesson for Nexus: once a checker exists, errors move into the spec, the translation of "a shelf that holds
  my books" into numbers and constraints. The model has an incentive to simplify the spec until it can prove it. So the
  formal requirement the AI writes must be shown back to the user in plain words and accepted, it must be tested for
  being too weak (does a known-bad design pass it?), and it must never be quietly loosened between attempts.

### A4. How the provers divide the work

- [C] AlphaGeometry (Trinh, Wu, Le, He, Luong, *Nature* 625:476–482, 2024, DOI 10.1038/s41586-023-06747-5,
  https://www.nature.com/articles/s41586-023-06747-5; https://en.wikipedia.org/wiki/AlphaGeometry). A language model
  proposes **auxiliary constructions** (points, lines, circles), and a symbolic deduction engine (DD + AR) does every
  deduction. It was trained on about 100 million synthetic theorems and proofs drawn from nearly 1 billion sampled
  premises, with no human demonstrations, and solved 25 of 30 IMO geometry problems in time limits. The paper says the
  symbolic engine's rules limit it.
- [C] DeepSeek-Prover-V2 (arXiv 2504.21801, https://arxiv.org/html/2504.21801v1): DeepSeek-V3 breaks a theorem into
  **subgoals**, formalised as Lean `have` steps, and proves them recursively. It reached 88.9 % on miniF2F-test at
  pass@8192 (82.4 % at pass@32) and 49 of 658 PutnamBench problems, and introduced ProverBench (325 problems).
  [C] A course digest (https://www.cs.virginia.edu/~rmw7my/Courses/AgenticAISpring2026/Major%20Breakthroughs%20in%20Lean%204-Based%20Auto-Formalized%20Mathematics.html)
  lists Goedel-Prover-V2 (8B, 90.4 % miniF2F with self-correction, 86 PutnamBench) and Kimina-Prover (92.2 %).
  [I] Given A3, these miniF2F figures are measured on a benchmark known to be flawed.
- [I] The pattern: the model makes the *creative, unverifiable* moves (which construction, which subgoal), and the
  engine makes every *checked* move. A Nexus board maps onto this directly. The AI chooses which parts, which datum and
  which split into sub-boards. Solvers do the placing, sizing and checking. Every subgoal becomes a sub-board with its
  own checks, and a "sorry" (an unproved subgoal) is visible on the board.

### A5. Certificates that are cheap to check: SAT, SMT, proofs in Lean

- [C] SAT: the SAT Competition has required unsat certificates since 2013, and accepted only DRAT since 2014 (Lammich,
  *J. Autom. Reasoning* 2019, https://link.springer.com/article/10.1007/s10817-019-09525-z). That paper's verified
  checker was faster than drat-trim, and while formalising DRAT the author found problems in drat-trim. `cake_lpr` is a
  CakeML-verified checker for LRAT/LPR proofs (drat-trim converts DRAT to LRAT), used for SAT Competition validation
  since 2020 and listed for 2025 (https://satcompetition.github.io/2025/downloads/checkers/cakelpr.pdf;
  https://www.cs.cmu.edu/~mheule/publications/LPR-TACAS.pdf; https://github.com/marijnheule/drat-trim).
  [I] So the fast, clever, unverified tool finds the proof, and a slow, small, verified tool checks it. That is the
  shape Nexus wants.
- [C] SMT: cvc5 outputs proofs in the Alethe format (from veriT), which Isabelle/HOL can reconstruct; Carcara is an
  independent Alethe checker that is not itself verified (https://cvc5.github.io/docs/cvc5-1.0.0/proofs/output_alethe.html;
  https://cvc5.github.io/blog/2024/03/15/isabelle-reconstruction.html). `lean-smt` (CAV 2025,
  https://hanielbarbosa.com/papers/2025cav.pdf) rebuilds cvc5 proofs as native Lean proofs checked by the Lean kernel.
  It covers about 30 % of cvc5's proof rules, chosen as enough for common goals.
- [I] Two different trusts. "sat" plus a model is checked by plugging the model into the board, which Nexus does
  anyway. "unsat" ("these requirements cannot all hold") is either trusted from Z3 or checked from a proof. In the
  browser, a realistic first step is: show the unsat core, then re-solve with each core member dropped to confirm the
  core is minimal. That is a cheap, partial check, not a proof.
- [C] Lean in the browser: `lean4web` (the editor at live.lean-lang.org) **runs the Lean server on a web server, not in
  the browser**, unlike the old Lean 3 web editor (https://github.com/leanprover-community/lean4web). Mathlib is over
  1.5 million lines (https://lean-lang.org/doc/reference/latest/Introduction).
  [I] This **corrects** an earlier pass (`06-engineering-languages.md`, marked [K]), which said Lean runs in the
  browser through WebAssembly in the live.lean-lang.org approach. For Nexus, Lean belongs in CI or a server, checking a
  small library of identities offline. It cannot be a live in-page checker unless someone builds a WASM Lean, which
  this pass did not find.

### A6. Proof-carrying code, verified compilers, translation validation

- [C] Necula, "Proof-carrying code", POPL 1997, pp. 106–119; with Lee, "Safe kernel extensions without run-time
  checking", OSDI 1996 (https://link.springer.com/rwe/10.1007/978-1-4419-5906-5_864;
  https://www.cs.cornell.edu/courses/cs7194/2019sp/slides/necula.pdf). Untrusted code comes with a safety proof against
  a **safety policy the host defined in advance**. The host validates it "easily and quickly … without using
  cryptography and without consulting any external agents". Proofs are LF terms, so validation is type checking. Code
  that was already validated needs only a check that it is the same proof.
- [C] Yang, Chen, Eide & Regehr, "Finding and Understanding Bugs in C Compilers" (Csmith), PLDI 2011
  (https://users.cs.utah.edu/~regehr/papers/pldi11-preprint.pdf): more than 325 compiler bugs found, every compiler
  tested had them, and "the middle-end bugs we found in all other compilers are absent" from CompCert. It was the only
  compiler in which Csmith could not find wrong-code errors after about six CPU-years. [M] The same paper reports bugs
  in CompCert's then-unverified front end. The guarantee covers exactly the verified part.
- [M] Translation validation (Pnueli, Siegel & Singerman 1998; Necula 2000): instead of proving the compiler, check
  each output against its input. CompCert itself uses verified validators for some passes, register allocation among
  them (Rideau & Leroy).
- [I] Nexus has both cases. Folding a board into a block is a compiler (the functor law of synthesis #2), and a shared
  block from someone else (or the AI) is untrusted code. Translation validation suits the fold: check each fold
  against its inside. PCC suits the shared block: it carries its certificates, and Nexus re-checks them on load against
  the constitution (the policy), without trusting the sender.

### A7. Refinement types: constraints in the type, discharged by SMT

- [C] Vazou, Seidel, Jhala, Vytiniotis & Peyton Jones, "Refinement Types for Haskell" (ICFP 2014,
  https://simon.peytonjones.org/assets/pdfs/refinement-types-for-haskell.pdf): refinement types are "types refined with
  logical predicates", taken from an SMT-decidable logic. The paper shows the classical translation is **unsound under
  lazy evaluation** and repairs it. Liquid Haskell keeps predicates in a decidable fragment, so checking stays
  decidable and fast. Primitive specifications are **trusted assumptions** (https://nikivazou.github.io/lh-course/Lecture_01_RefinementTypes.html).
- [I] A Nexus port type could carry a predicate, not only a dimension: `{L : Length | L ≥ grip + 1.0·d}` for a bolt's
  length, `{p : Pressure | p ≤ rating}`. A wire that cannot meet the predicate is refused at connection time (the "keyed"
  interface of synthesis #12), and SMT is the decision procedure. The lazy-evaluation lesson also applies: Nexus's
  lazy engine (spec 11) must not assume an unevaluated input is a value when it checks a predicate. And the trusted
  primitive specs are exactly the sourced standard tables, which should be listed as the trusted base.

### A8. E-graphs and equality saturation: many equal programs at once

- [C] egg (Willsey, Nandi, Wang, Flatt, Tatlock, Panchekha), POPL 2021
  (https://popl21.sigplan.org/details/POPL-2021-research-papers/23/egg-Fast-and-Extensible-Equality-Saturation;
  https://cacm.acm.org/research-highlights/egg-fast-and-extensible-equality-saturation; https://www.alphaxiv.org/abs/2004.03082).
  An e-graph holds a congruence relation over many expressions at once. Equality saturation applies rewrites without
  destroying anything, then **extracts** the best term by a cost function. egg adds two things: *rebuilding* (restore
  invariants once per iteration), which gave a geometric-mean 88× speedup in congruence closure and 21× overall, and
  *e-class analyses* (domain facts kept on each class).
- [C] The SIGPLAN blog (https://blog.sigplan.org/2021/04/06/equality-saturation-with-egg) lists egg uses: Szalinski
  (CAD), Diospyros (DSP vectorising), Tensat (deep-learning graphs, up to 50×), Herbie (floating-point accuracy;
  egg-herbie made parts of Herbie more than 3000× faster).
- [C] Explanations: Flatt, Coward, Willsey, Tatlock & Panchekha, "Small Proofs from Congruence Closure", FMCAD 2022
  (https://arxiv.org/abs/2209.03398; https://par.nsf.gov/servlets/purl/10403946). An O(n⁵) algorithm finds proofs of
  optimal "proof tree size", and a practical O(n log n) greedy one finds small proofs with no asymptotic overhead.
  Implemented in egg, they are substantially smaller than Z3's on a 3,760-problem corpus. [I] So an e-graph can say
  *why* two things are equal, as a short chain of named rewrites, and that chain is a checkable certificate.
- [C] egglog (Zhang, Wang, Flatt, Cao, Zucker, Rosenthal, Tatlock, Willsey), PLDI 2023 (https://arxiv.org/abs/2304.04332):
  unifies Datalog (incremental, cooperating analyses, lattices) with equality saturation (rewriting, congruence,
  extraction). A PLDI 2025 tutorial lists proof capabilities, scheduling, visualisation, Python bindings and plugins
  (https://pldi25.sigplan.org/details/pldi-2025-tutorials/4/Unlocking-Optimizations-with-egglog-Equality-Saturation-Meets-Datalog).
  egglog 2.0.0 compiles to WebAssembly and runs in the web browser (https://docs.rs/crate/egglog-concurrency/2.0.0).
  egglog-python says it has "not been used in a production setting yet" (https://egglog-python.readthedocs.io/latest/reference/usage.html).
- [C] Herbie with egglog (Flatt & Zhang, EGRAPHS 2023, https://effect.systems/doc/egraphs-2023-egglog/paper.pdf):
  Herbie with egg "frequently uses unsound rules involving division and exponents". egglog's analyses let it rewrite
  soundly when division is present. [I] This is a warning: an e-graph's equivalences are only as sound as its rules,
  and a rule like x/x → 1 is false at x = 0. Every rule needs a side condition, or a test that finds where it fails.

### A9. Szalinski: from a flat mesh to a program with loops

- [C] Nandi, Willsey, Anderson, Wilcox, Darulova, Grossman & Tatlock, "Synthesizing Structured CAD Models with Equality
  Saturation and Inverse Transformations", PLDI 2020, pp. 31–44, DOI 10.1145/3385412.3386012
  (https://people.mpi-sws.org/~eva/papers/pldi20.pdf; https://sigplan.org/OpenTOC/pldi20.html;
  https://www.mwillsey.com/papers/pldi-szalinski). It is a **second decompilation stage**. Mesh decompilers produce flat,
  unstructured CSG, and Szalinski "shrinks" it into programs in Caddy, a language with **map and fold** (loops),
  through semantics-preserving rewrites. Its key idea is **inverse transformations**: solvers speculatively *add*
  equivalences to the e-graph, for example fitting a list of translations to a function of the index such as
  "i × 10 along x" or a rotation by i × 360/n, which "rerolls" loops. The tool has 65 CAD rewrites in about 3,000 lines
  of Rust and extracts the smallest program, with **program size as a proxy for editability**. The authors leave
  better CAD cost functions open. Evaluated on Thingiverse models, it shrinks large models in seconds and composes with
  an existing mesh decompiler.
- [I] Two failures it names: (C1) and (C2) in the paper, simulated by "flattening parametrized programs and perturbing
  them" (the PDF snippet names them; this pass did not read their definitions). [M] From memory they are float noise
  in the decompiled numbers and arbitrary order in the flat output, so the solver must fit "nearly" regular patterns
  and reorder lists.
- [I] The match with Nexus is close. An AI-built board (or an imported mesh, after a mesh-to-CSG step) is "flat
  CSG": twelve bolts placed one by one. A Szalinski-like pass finds "a bolt circle of 12 on PCD 150, rotate by i·30°"
  and replaces the twelve with one pattern node. The refactor is equal **by construction**, because every rewrite
  preserves meaning, and the e-graph explanation (A8) records why. This is "shapes that explain themselves": the
  pattern node says what the twelve parts were *for*.

### A10. Learning the library: babble and ShapeCoder

- [C] babble (Cao, Kunkel, Nandi, Willsey, Tatlock, Polikarpova), POPL 2023, DOI 10.1145/3571207
  (https://cnandi.com/docs/babble23-cr.pdf; https://arxiv.org/abs/2212.04596): **library learning modulo equational
  theories**, in which e-graphs plus anti-unification find common abstractions *up to* equivalence, not only up to
  syntax, in the DreamCoder line of work. A review warns that heavy rewriting can make learned programs "bear little
  resemblance to the original programs" (https://inst.eecs.berkeley.edu/~cs294-260/sp24/projects/erawn).
- [C] ShapeCoder (Jones, Guerrero, Mitra, Ritchie), SIGGRAPH 2023, TOG 42(4) article 49
  (https://rkjones4.github.io/shapecoder.html; https://github.com/rkjones4/ShapeCoder): discovers abstraction functions
  from shapes made of unstructured primitives (chairs, tables, storage). The objective trades **program complexity
  (degrees of freedom)** against **library complexity (number of abstractions)**. Example: one abstraction with five
  parameters covers four-legged table bases with support bars. Its refactor step uses e-graphs in Rust.
- [I] For Nexus, "every piece stored once and reused" needs someone to notice what repeats. A library-learning pass
  over saved boards could propose new blocks ("you have built this bracket-with-two-holes seven times; here is one
  block with three parameters"), and the user accepts or rejects each. The cost is the same as ShapeCoder's: count the
  free parameters (degrees of freedom), not the lines.

### A11. Shape programs from neural nets: ShapeAssembly, CSGNet, InverseCSG

- [C] ShapeAssembly (Jones, Barton, Xu, Wang, Huang, Ritchie, Chaudhuri), SIGGRAPH Asia 2020, TOG 39(6) article 234
  (https://rkjones4.github.io/pdf/shapeAssembly.pdf): an "assembly language" for shape structure. It declares cuboid
  part proxies and **attaches** them to one another, hierarchically and symmetrically, with continuous free variables,
  so one program covers a family. Programs follow a **grounded attachment order**: at first only the bounding box is
  grounded, an attachment must connect a cuboid to an already-grounded one, and the attached cuboid then becomes
  grounded. The paper is frank that colocated attachment points are not guaranteed after the first attachment.
- [C] CSGNet (Sharma, Goyal, Liu, Kalogerakis, Maji), CVPR 2018, pp. 5515–5523, DOI 10.1109/CVPR.2018.00578
  (https://hippogriff.github.io/CSGNet; https://par.nsf.gov/servlets/purl/10232601): an encoder–decoder (CNN plus RNN)
  that turns a 2D or 3D shape into a CSG program, faster than bottom-up primitive detection. The journal version adds a
  stack variant (CSGNetStack), with supervised and RL training.
- [C, via citation] Du, Inala, Pu, Spielberg, Schulz, Rus, Solar-Lezama & Matusik, "InverseCSG: Automatic conversion of
  3D models to CSG trees", *ACM TOG* 37(6), 2018 (cited in https://par.nsf.gov/servlets/purl/10232601). [M] It
  detects primitives, then uses program synthesis (Sketch) on small segments to find exact CSG trees that reproduce the
  model.
- [I] Two routes: the network *guesses* fast, and the solver *finds* slowly but checks. For Nexus's picture-to-profile
  (spec 08) and mesh import, the right shape is a neural or AI guess first, then an exact re-execution of the program
  compared with the target (a distance or IoU threshold) as the certificate. ShapeAssembly's grounded order is
  Nexus's placement-by-mating rule (spec 01): each part attaches to a part already placed, starting from the ground.

### A12. Programs from examples: FlashFill

- [C] Gulwani, "Automating String Processing in Spreadsheets Using Input-Output Examples", POPL 2011, pp. 317–330
  (https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/popl11-synthesis.pdf). It is the technology
  behind Excel's Flash Fill and won POPL's Most Influential Paper award in 2021
  (https://www.microsoft.com/en-us/research/publication/automating-string-processing-spreadsheets-using-input-output-examples).
  It uses a restricted language (substrings, restricted regular expressions, conditionals, loops), so a few examples
  pin down a program. Gulwani's own lesson (https://blog.sigplan.org/2021/09/14/the-story-of-the-flash-fill-feature-in-excel)
  was to go from "the hardest problem I can solve" to "the simplest problem that will have the most impact".
- [M] FlashFill represents the *whole set* of programs consistent with the examples compactly (version-space algebra),
  ranks them, and is ambiguous when examples are few. Later work asks the user for the input that distinguishes the
  top candidates.
- [I] Nexus can learn "do it like this": the user places two bolts by hand, the system finds the program (a pattern
  on a PCD, or "one at each corner, 10 mm in"), shows it as a node, and when two programs fit the examples it asks
  about the place where they differ. That is a cheap certificate in reverse: the user checks one picture, not a
  program.

## (B) What Nexus should take

Each item is a node, rule, data model or way of working, with the spec it fits.

### B1. Rules (spec 00 constitution, spec 10 trust)

1. **Propose, then certify** (rule, spec 00 and 10): every AI action that changes a board returns `{board diff,
   claims[], certificates[]}`. A claim with no certificate is shown as *judged*, never as *checked*. The checker is
   Nexus code, never the model. [C basis A1, A2; I]
2. **Self-critique is not a gate** (rule, spec 00 amendment to the reviewer panel): a model rereading its own (or a
   sibling's) steps may rank or explain, but it cannot pass a claim that a sound checker could decide. Where a sound
   checker exists, the reviewer panel is only consulted after it. [C basis A2]
3. **The statement is reviewed, the proof is checked** (rule, spec 10): the formal requirement the AI derives from the
   user's words (loads, clearances, fits, budget) is shown back in plain words and accepted by the user before any
   solve. It is versioned, and the AI may not weaken it between attempts without a visible diff that the user accepts.
   [C basis A3]
4. **Weakness test for every spec** (rule, spec 00 evaluation sets): each accepted requirement set is run against at
   least one known-bad design (the "mutant") that it must reject. A requirement no mutant fails is flagged as too weak,
   the miniF2F "excessively simplified" failure. [C basis A3; I]
5. **Name the trusted base** (rule, spec 10): each certificate says what it trusts. Examples: "trusts Z3 4.x unsat",
   "trusts ISO 4762 table in `threads.ts`", "trusts replicad boolean", "kernel-checked in Lean". A badge level follows
   from the weakest item. Verification covers exactly what it covers (CompCert's front end). [C basis A6, A7]
6. **Rewrite rules carry side conditions** (rule, for any e-graph or simplifier in `lawgraph.ts`): every equivalence
   rule states its domain (x ≠ 0, angle in range, same material) and has a property test that searches for a
   counterexample. The Herbie lesson. [C basis A8]

### B2. Data models

7. **Certificate record** (data model, spec 10, beside the claim record of `23` B1): `{kind: model | residual |
   unsatCore | drat | alethe | rewriteChain | leanTerm | sampleMatch | userAccepted, claim, payload, checker,
   checkerVersion, trustedBase[], cost, checkedAt, result}`. `cost` records how long the check took, so cheap checks
   run on every edit and costly ones on save. [I]
8. **Spec object** (data model, spec 00 and 01): requirements as typed predicates over ports (refinement style), with
   `sourceWords` (the user's sentence it came from), `acceptedBy`, `version` and `mutants[]`. [C basis A3, A7; I]
9. **Refinement port types** (data model, spec 01 keys and spec 09 port types): a port type may carry a predicate in
   a small decidable fragment (linear arithmetic over quantities with units). A connection is refused if SMT shows the
   predicate unsatisfiable for the connected ranges, and badged if it is merely unproved. [C basis A7]
10. **Subgoal sorries** (data model, spec 00): a board may contain an *unproved subgoal* node, which works like Lean's
    `sorry`: a placeholder with the claim it must meet. The board runs but cannot be marked checked while any remain.
    The AI's decomposition (DeepSeek-Prover style) shows up as sub-boards each with its own goal. [C basis A4; I]

### B3. Nodes

11. **`check.certificate`** (node, spec 10): takes a claim and its certificate and runs the matching small checker.
    It returns pass, fail (with the failing step) or unsupported. The model never sees this code path's internals. [I]
12. **`check.smt` returns certificates both ways** (amendment to the existing node, spec 10): on sat, it returns a
    model that Nexus re-evaluates on the board (a cheap, sound check). On unsat, it returns the core, confirms the core
    is minimal by dropping each member, and, where the server path allows it, returns a cvc5 proof for offline
    checking. [C basis A5]
13. **`refactor.pattern`** (node, Szalinski-like, spec 01 and 00): from a set of placed parts (from the AI, by hand or
    imported), it finds loops (linear array, circular array on a PCD, mirror, grid) using inverse transformations fitted
    within a tolerance. It replaces them with a pattern node and attaches the rewrite chain as its certificate. Cost
    function: free parameters first, then node count. Runs on egglog in WASM in a worker, if a spike shows egglog's
    WASM build holds up. [C basis A8, A9]
14. **`explain.equal`** (node): asks why two boards or two expressions are equal and returns the short rewrite chain
    (the FMCAD 2022 greedy proofs), shown as steps in plain words. It serves the "every AI flow explained" rule in
    `CLAUDE.md`. [C basis A8]
15. **`learn.blocks`** (node, spec 00 library law): runs babble/ShapeCoder-style library learning over the user's
    saved boards and proposes blocks, each with the boards it would shorten and its parameter count. Nothing is
    adopted without the user's yes. [C basis A10]
16. **`by.example`** (node, spec 01): the user does two or three placements by hand. The node offers the programs that
    fit, ranked, and asks for one more example where the top two disagree. Its output is a pattern node, not loose
    parts. [C basis A12]
17. **`fold` with translation validation** (amendment, spec 09 functor law): every fold records a validation
    certificate, made from symbolic equality where the e-graph can show it and from seeded sample equality otherwise.
    The check is re-run when the inside changes. [C basis A6]
18. **`import.mesh → program`** (pipeline, spec 08 Path 2 and mesh import): a guess (an AI or network, CSGNet style),
    then exact re-execution and a distance check against the target (the certificate), then `refactor.pattern` for
    loops. A mesh that cannot be explained within tolerance stays a mesh, badged "unexplained". [C basis A9, A11]
19. **Shared blocks carry proofs** (way of working, spec 00 and 15-commons): a block from another user or from the AI
    arrives with its certificates (PCC). Nexus re-checks them on load against the current constitution and shows which
    ones failed. Certificates that were already checked are re-verified only by hash. [C basis A6]

### B4. Ways of working

20. **Division of labour as in AlphaGeometry** (way of working, the AI prompt in `docs/FOR-AI.md`): the AI's job is
    the auxiliary construction (which parts, which datum, which split, which pattern). The solvers' job is every
    deduction (positions, sizes, checks). The prompt should say this in one line. [C basis A4]
21. **Lean offline, not in the page** (decision, spec 10): a small Lean project in CI for the unit algebra and
    identities that `lawgraph.ts` relies on. No in-browser Lean, since lean4web is server-side. The earlier claim in
    `06` should be corrected. [C basis A5]
22. **Honest scoring of the AI** (spec 00 evaluation sets): score the in-app AI "Olympiad style", so that a design
    passes only if it meets the *accepted* spec, not a weakened one. Report both numbers, as the miniF2F-v2 paper did.
    [C basis A3]
23. **Gate order** (way of working, spec 00): cheap sound checks (units, keys, residuals) on every edit, then costly
    sound checks (FEA, SMT unsat proofs) on save, then judges for the questions no checker can decide. [I]

### B5. Ideas (spec 07)

24. **Shapes that explain themselves**: any shape in Nexus can be asked "what are you?" and answers with its shortest
    program and the rewrite chain from what was drawn. A teaching mode could show the steps from loose parts to a
    pattern, then to a parametric block. [I]
25. **A proof badge game**: a board's parts glow by trust level (judged, checked by residual, SMT-proved,
    kernel-checked), and the user can try to raise a part one level. [I]

## (C) Questions

The 66 questions of this pass are chapter 22 of `../BOOK-OF-QUESTIONS.md`.

## (D) New branches

- Translation validation literature after Pnueli and Necula (Alive and Alive2 for LLVM peephole rules) as a model for validating each AI board edit
- Alive-style SMT checking of Nexus's own rewrite rules (`lawgraph.ts` simplifications) before they ship
- Flyspeck and Hales's use of certificates for linear programs and interval computations in a machine-checked proof
- Interval arithmetic certificates (Tucker's Lorenz attractor proof) as a template for "safe over a tolerance range"
- Verified e-graphs: proofs from egglog checked in Lean or Coq (the egg-to-Coq work and "egg proofs" follow-ups)
- Tensat and Diospyros as examples of e-graph extraction under resource costs (ILP extraction), for cost functions over mass, price and part count
- DreamCoder's wake-sleep library learning and how its abstractions compare to babble's on CAD corpora
- Mesh decompilers before Szalinski (Reincarnate, the tool Szalinski composes with) and B-rep feature recognition
- SketchGraphs and constraint-graph datasets as a source of real CAD constraint programs for the AI
- Neural CAD program generators after 2023 (CAD-Recode, Text2CAD, and similar) measured against an exact re-execution check
- Version-space algebra and PROSE (Microsoft's FlashFill framework) as a library for `by.example`
- Interactive disambiguation in programming by example (distinguishing inputs, "active learning" of programs)
- Lean's `sorry`-tracking and blueprint tools (leanblueprint) as a model for showing a board's unproved subgoals as a dependency graph
- The de Bruijn criterion (small trusted kernel) applied to Nexus: what would a Nexus kernel be
- Hardware and safety-critical certification (DO-178C tool qualification, IEC 61508) for what a checked AI design would need to be accepted
- Certified programming with dependent types for units (F# units of measure, Idris) as alternatives to SMT refinement
- SAT and SMT solvers in WASM with proof output (CaDiCaL WASM builds, cvc5 WASM), to check unsat in-page
- Reward hacking in RL provers (proving the simplified statement) and what that predicts for an RL-trained CAD agent
- AlphaGeometry 2 and its improved symbolic engine: what more deduction rules buy, analogous to a richer Nexus solver set

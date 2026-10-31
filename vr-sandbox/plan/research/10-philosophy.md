# Research: philosophy, knowledge, invention, learning and ethics under "simulate anything"

One research pass, 2026-10-31. Kept as the agent returned it (its own marks: [D] documented by the cited source, [I] its inference).

**How this was done.** Research only; no files were changed. I confirmed the key sources with Tavily search (Firecrawl was not used). Canonical books and papers are cited by full reference from established scholarship; I did not re-fetch each one. Every finding is marked **[D]** when it is documented by the cited source, or **[I]** when it is my inference. The project already has `/home/user/claude-code/vr-sandbox/plan/BOOK-OF-QUESTIONS.md`, whose Chapter 1 holds 50-odd questions, and `/home/user/claude-code/vr-sandbox/plan/CONSTITUTION.md`, with rules C1 to C18. I read both so that Part C does not repeat them and Part B can point at existing rules.

One source to treat with care: biosecurityhandbook.com came up with claims about 2026 model system cards that I could not verify. I have **not** relied on them. Only peer-reviewed or institutional sources are cited for dual-use.

---

## (A) Findings with sources

### 1. Philosophy of models and simulation

**Box, "all models are wrong".**
- [D] George Box wrote "Since all models are wrong the scientist cannot obtain a 'correct' one by excessive elaboration" in "Science and Statistics", *JASA* 71 (1976): 791–799.
- [D] The phrase "all models are wrong but some are useful" comes from Box, "Robustness in the strategy of scientific model building" (1979), and again in Box & Draper, *Empirical Model-Building* (1987). Box adds that the practical question is "how wrong do they have to be to not be useful".
- [I] For Nexus the question is never whether a node is true. It is whether the node is useful, for which question, and at what error.

**Korzybski, "the map is not the territory".**
- [D] Alfred Korzybski, *Science and Sanity* (1933): "A map is not the territory it represents, but, if correct, it has a similar structure to the territory, which accounts for its usefulness."
- [D] Borges, "On Exactitude in Science" (1946), describes a map the size of the empire, which is useless.
- [I] "Simulate anything" has to mean "a useful map of anything", not a copy of everything. Structure is what has to be preserved. Detail beyond what the question needs is cost, not truth.

**Popper, Kuhn, Lakatos.**
- [D] Popper, *The Logic of Scientific Discovery* (1934/1959): a theory is scientific when it can be falsified. Confirmations are cheap; risky predictions count.
- [D] Kuhn, *The Structure of Scientific Revolutions* (1962): normal science works inside paradigms. Anomalies pile up until a revolution. What counts as evidence depends on the paradigm.
- [D] Lakatos, "Falsification and the Methodology of Scientific Research Programmes" (1970). A programme has a hard core and a protective belt of auxiliary hypotheses. It is *progressive* if it predicts novel facts and *degenerating* if it only patches itself after the fact.
- [I] Every tuning of a node to make a check pass is a protective-belt move. Nexus can count them. CONSTITUTION C9 ("never tuned away") is a Lakatosian rule.

**The epistemology of simulation (Winsberg; Oreskes).**
- [D] Winsberg argues that simulation is "a rich inferential process, not simply number crunching". Its justification is "downward, motley, autonomous": it draws on theory, approximations, ad hoc fixes and comparison with data together. Sources: Winsberg 1999, "Sanctioning Models" (*Science in Context* 12:275); Winsberg 2001 (*Phil. Sci.* 68); Winsberg 2010, *Science in the Age of Computer Simulation*.
- [D] The Stanford Encyclopedia entry (https://plato.stanford.edu/entries/simulations-science) defines verification as checking that the output approximates the true solutions of the model equations, and validation as checking that the model represents the target. Winsberg argues the two "are not so cleanly separable".
- [D] Oreskes, Shrader-Frechette & Belitz, "Verification, Validation, and Confirmation of Numerical Models in the Earth Sciences", *Science* 263 (1994): 641. Models of open natural systems can never be *verified*, only confirmed relative to data. The word "validated" misleads the public.

**V&V standards.**
- [D] The engineering short form, from Roache and Boehm: verification is "solving the equations right"; validation is "solving the right equations". Oberkampf & Roy, *Verification and Validation in Scientific Computing* (2010).
- [D] ASME V&V 10 covers computational solid mechanics. ASME V&V 20 covers CFD and heat transfer: validation uncertainty from numerical, input and experimental parts.
- [D] ASME V&V 40-2018 sets out risk-informed credibility. The sequence is: question of interest, then context of use (COU), then model risk (decision influence × consequence), then credibility goals, then V&V activities, then an adequacy judgement. "If the plan is not achievable, then you might need to redefine the context of use." Sources: the NIH IMAG summary (https://www.imagwiki.nibib.nih.gov/sites/default/files/asme_vv_40_model_simulation_standard.pdf) and the Springer overview (https://link.springer.com/chapter/10.1007/978-3-032-09180-2_5). The same model can be credible for one context of use and not for another.
- [D] NASA-STD-7009 (models and simulations) has a similar credibility scale.

**Emergence and reductionism.**
- [D] P. W. Anderson, "More Is Different", *Science* 177 (1972): 393. Reductionism does not imply constructionism: each level of complexity has its own laws.
- [D] Warren Weaver, "Science and Complexity" (1948), separates simple problems, disorganised complexity (statistics) and *organised complexity*, which covers life, cities and economies.
- [D] Jane Jacobs (1961) applied Weaver's organised complexity to cities.
- [D] Herbert Simon, "The Architecture of Complexity" (1962): complex systems are hierarchical and *nearly decomposable*. The parable of the watchmakers Hora and Tempus shows that stable sub-assemblies make complexity possible.
- [I] Simon is the theory behind Nexus's "fold any board into one node". It also warns where that breaks: when the parts interact strongly, the fold leaks.

**Causality (Pearl).**
- [D] Pearl & Mackenzie, *The Book of Why* (2018), and Pearl, *Causality* (2000/2009), set out a three-rung ladder: association P(y|x), "seeing"; intervention P(y|do(x)), "doing"; counterfactual, "imagining what would have happened".
- [D] Bareinboim et al. (2022), "On Pearl's Hierarchy", show that data from a lower rung generally cannot answer questions from a higher rung without causal assumptions. See also arXiv 2601.20405.
- [D] The do-calculus gives the rules for computing interventions from observational data plus a causal graph.
- [I] A node graph is close to a causal graph. Nexus can make the rung of every edge explicit.

**Digital physics and the simulation hypothesis.**
- [D] Zuse, *Rechnender Raum* (1969); Wheeler, "it from bit" (1989); Wolfram, *A New Kind of Science* (2002), which introduces *computational irreducibility*: some systems cannot be predicted faster than by running them.
- [D] Bostrom, "Are You Living in a Computer Simulation?", *Phil. Quarterly* 53 (2003): 243. At least one of three things is true: civilisations go extinct first; they lose interest in simulating ancestors; or we are almost certainly simulated.
- [D] Lorenz (1963) showed sensitive dependence on initial conditions.
- [I] Why this matters to "simulate anything". Even if the universe is computation, irreducibility and chaos mean many systems have a *prediction horizon*. Nexus can show that horizon instead of pretending there is none. The simulation hypothesis also raises an ethical question that becomes real if Nexus simulates "life": can a simulated agent matter morally?

**Gödel and limits of formal systems.**
- [D] Gödel (1931): any consistent formal system rich enough for arithmetic has true statements it cannot prove.
- [D] Turing (1936): the halting problem is undecidable.
- [D] Rice's theorem: every non-trivial semantic property of programs is undecidable.
- [I] Nexus boards are programs. No checker can decide every property of every board. Checks can be sound and useful, but never complete. "Passed all checks" must never read as "is correct".

**The frame problem.**
- [D] McCarthy & Hayes (1969). Stanford Encyclopedia: "how is it possible to write formulae that describe the effects of actions without having to write a large number of accompanying formulae that describe the mundane, obvious non-effects" (https://plato.stanford.edu/entries/frame-problem). Dennett's "Cognitive Wheels" (1984) widened it into the problem of relevance in general.
- [I] Nexus's "changes that follow" is a frame-problem engine. The dependency graph decides what can change. Everything off the graph is assumed unchanged, and that assumption should be visible.

**Further sources worth knowing.**
- [D] Hayek, "The Pretence of Knowledge" (Nobel lecture, 1974), on the limits of modelling complex social orders.
- [D] The Lucas critique (1976): policy changes the behaviour a model was fitted on.
- [D] Goodhart's and Campbell's laws.
- [D] MacKenzie, *An Engine, Not a Camera* (2006): models such as Black–Scholes reshape the markets they describe.
- [D] J. C. Scott, *Seeing Like a State* (1998), on simplified, legible models imposed on living systems.
- [I] All of these matter for "simulate civil". A social model is an intervention, not just a picture.

### 2. Knowledge representation for "everything"

**Upper ontologies.**
- [D] BFO (Basic Formal Ontology) is ISO/IEC 21838-2:2021. It is realist, splits continuants from occurrents, and is widely used in biomedicine (the OBO Foundry).
- [D] DOLCE is ISO/IEC 21838-3:2023. It is cognitive and linguistic, and models qualities, roles and descriptions more richly.
- [D] SUMO (Niles & Pease 2001, IEEE SUO) is large, written in first-order logic, and mapped to WordNet.
- [I] The distinctions all three share are exactly what Nexus's parts need: thing vs process, part vs role vs function, quality vs value. Example: a bolt (continuant) plays a fastener role in a joint, and its function is to clamp.

**Wikidata.**
- [D] Wikidata stores *statements*, not facts. A statement is a property-value claim plus *qualifiers* (for example start or end time, or conditions), *references* (sources) and a *rank* (preferred, normal or deprecated). Help:Statements: https://www.wikidata.org/wiki/Help:Statements. Vrandečić & Krötzsch, "Wikidata", *CACM* 57 (2014).
- [D] Wikidata keeps conflicting claims side by side, each with its own source, instead of deciding which is true.
- [I] Of all these, the Wikidata statement model fits Nexus's "every number sourced" rule best.

**Cyc's lessons.**
- [D] Cyc started in 1984 (Lenat and Guha). By 2002 it had cost about $60M and 600 person-years (Wikipedia, https://en.wikipedia.org/wiki/Cyc).
- [D] Lenat said one of the hardest lessons, which took about five years, was to "give up global consistency". The knowledge base is split into locally consistent *microtheories* (Lex Fridman #221, https://lexfridman.com/douglas-lenat).
- [D] Lenat held that systems "learn at the fringes of what they already know" (UMBC paper, https://iral.cs.umbc.edu/Pubs/FromCycToIntelligentAssistant-IJHCS-LNAI3864.pdf).
- [D] Machines that read text arrived by the opposite route, statistical learning (Lenat & Marcus 2023, arXiv, "Getting from Generative AI to Trustworthy AI").
- [I] Lessons for Nexus: do not hand-build all of common sense. Use *contexts*: a scale, a domain, a board. Within a context, consistency holds; across contexts, it does not have to. Pair the LLM's breadth with a curated, checkable core.

**ISO 15926.**
- [D] ISO 15926 integrates life-cycle data for process plants (oil and gas). It uses a 4D ontology of temporal parts with explicit part-whole and class models.
- [I] It is commonly reported as powerful but heavy, with slow adoption. The lesson: rigour without tools and an immediate payoff stalls.

**schema.org.**
- [D] Launched in 2011 by Google, Bing, Yahoo and later Yandex. It is a deliberately shallow vocabulary, adopted at web scale because it pays off at once in search "rich results". Guha, Brickley & Macbeth, "Schema.org: Evolution of Structured Data on the Web", *CACM* (2016).

**The Semantic Web's successes and failures.**
- [D] The vision: Berners-Lee, Hendler & Lassila, *Scientific American* (2001).
- [D] Hogan, "The Semantic Web: Two Decades On" (*Semantic Web Journal*, https://www.semantic-web-journal.net/system/files/swj2229.pdf): "publishing data independently of any application then implies higher costs for all applications". It also depended too much on reliable publishers, and its incentives were unclear.
- [D] Earlier critics: Shirky, "The Semantic Web, Syllogism, and Worldview" (2003); Karger, "The Semantic Web and End Users" (2014).
- [D] Successes: knowledge graphs, Wikidata, schema.org, and life-science ontologies.
- [I] Lesson: semantics succeed when they serve a live application. Nexus is that application. Its library should grow semantics where a check or solver uses them, and nowhere else.

**Christopher Alexander.**
- [D] *Notes on the Synthesis of Form* (1964): design as fit between form and context, with misfits decomposed.
- [D] *A Pattern Language* (1977) has 253 patterns running from regions down to construction details. Each states a problem, a context and a solution, and links to larger and smaller patterns. Room-scale examples: 159 Light on Two Sides of Every Room, 179 Alcoves, 180 Window Place.
- [D] *The Timeless Way of Building* (1979): the "quality without a name".
- [D] *The Nature of Order* (2002–2005) gives 15 properties of living structure: levels of scale, strong centres, boundaries, alternating repetition, positive space, good shape, local symmetries, deep interlock and ambiguity, contrast, gradients, roughness, echoes, the void, simplicity and inner calm, not-separateness. It also introduces *structure-preserving transformations* and *unfolding*: design as a sequence of steps, each strengthening what is already there.
- [D] Alexander shaped software: the "Gang of Four" design patterns (1994), and Ward Cunningham's first wiki (1995), built for the Portland Pattern Repository.
- [D] Some of his patterns have empirical support. Ulrich, "View through a window may influence recovery from surgery", *Science* 224 (1984): 420.
- [I] Many other patterns are reasoned judgements, not measurements, and should be labelled that way under the honesty rule.

**Systems thinking (Meadows).**
- [D] Meadows, "Leverage Points: Places to Intervene in a System" (1999, https://donellameadows.org/archives/leverage-points-places-to-intervene-in-a-system). Twelve points run from the weakest (constants, parameters, numbers) through buffers, stock-and-flow structure, delays, feedback loops, information flows, rules, self-organisation and goals, up to paradigms and the power to transcend paradigms.
- [D] She notes that people often know leverage points intuitively yet "push in the wrong direction". Also Meadows, *Thinking in Systems* (2008), and Forrester's system dynamics.

**Engelbart and Bush.**
- [D] Engelbart, "Augmenting Human Intellect: A Conceptual Framework" (SRI, 1962). The H-LAM/T system: Human using Language, Artifacts, Methodology, in which he is Trained. *Bootstrapping*: use the tools to improve the tools. Demonstrated in 1968 (the "Mother of All Demos").
- [D] Bush, "As We May Think", *The Atlantic* (July 1945). The Memex and *associative trails*, which a person can build and share.
- [I] Engelbart's aim was to augment people, not to automate them away. This decides how Nexus's AI should behave. See principle 15.

### 3. How genius and invention work

**TRIZ.**
- [D] Altshuller (USSR, from 1946) studied patents and derived 40 inventive principles, 39 engineering parameters, a 39×39 contradiction matrix, the Ideal Final Result, ARIZ and the "effects" databases. Mann's *Matrix 2003* extends it to 48 parameters.
- [I] TRIZ evidence is mostly from practitioners and case studies, with few controlled trials. Present it as a heuristic, not a law.

**Design thinking.**
- [D] Simon, *The Sciences of the Artificial* (1969): "Everyone designs who devises courses of action aimed at changing existing situations into preferred ones."
- [D] Rittel & Webber (1973): "wicked problems". Schön, *The Reflective Practitioner* (1983): design as a reflective "conversation with the situation". The UK Design Council's Double Diamond (2005).
- [D] Critics such as Vinsel (2018) say the popular form is often shallow.

**Analogy and transfer.**
- [D] Gentner, "Structure-mapping", *Cognitive Science* 7 (1983): 155. Good analogies map *relations*, not surface attributes, and are guided by systematicity.
- [D] Gick & Holyoak (1980, 1983): people rarely transfer a known analogy to a new problem on their own (the radiation/fortress problem). A hint raises transfer sharply.
- [I] Analogy is the engine of cross-domain genius, but people need a prompt. Nexus can be that prompt.

**Creativity research.**
- [D] Csikszentmihalyi, *Creativity* (1996), and his systems model: creativity happens when a person changes a *domain* and a *field* of experts accepts the change. *Flow* (1990).
- [D] Boden, *The Creative Mind* (1990/2004), names three kinds: *combinational*, *exploratory* (search within a space) and *transformational* (change the space's rules). She also separates *P-creativity* (new to the person) from *H-creativity* (new to history).
- [D] Uzzi et al., "Atypical Combinations and Scientific Impact", *Science* 342 (2013): high-impact papers mostly combine conventional prior work with a small injection of unusual pairings.
- [D] Weisberg argues creative thinking is ordinary thinking plus expertise. The famous "10,000 hours" deliberate-practice claim is disputed: Macnamara et al. 2014 found practice explains a minority of variance.

**The adjacent possible.**
- [D] Kauffman, *Investigations* (2000) and *At Home in the Universe* (1995): the adjacent possible is the bounded set of states one step from the current actual. Each realised step widens it. Steven Johnson popularised it in *Where Good Ideas Come From* (2010).
- [D] Kauffman, Thurner & Hanel formalised it as the "Theory of the Adjacent Possible" (2018).

**Combinatorial invention (Arthur).**
- [D] W. Brian Arthur, *The Nature of Technology* (2009; https://sites.santafe.edu/~wbarthur/thenatureoftechnology.htm). Technologies are combinations of earlier technologies, recursively: they are built from assemblies and modules that are themselves technologies. Each one captures and harnesses natural phenomena. The whole evolves by "combinatorial evolution", and technologies cluster into "domains".
- [I] Nexus's library law (store each piece once, fold boards into nodes) implements Arthur's recursion directly. Arthur's "phenomena" layer corresponds to Nexus's physical-law nodes.

**First-principles thinking.**
- [D] Aristotle's *archai*, first principles, as the starting points of demonstration (*Posterior Analytics*). Popularised today by engineers reasoning from physics and costs instead of from analogy to existing products. Fermi estimation is a method for it.
- [I] In engineering, first principles means conservation laws, material properties and constraints. Nexus's eight fundamental systems are a first-principles frame. Working from first principles also needs analogy, to propose solutions; first principles then checks them.

### 4. Learning and democratisation

**Constructionism.**
- [D] Papert, *Mindstorms* (1980). Logo (Feurzeig, Papert & Solomon, 1967) and the turtle, which is *body-syntonic*: a child can "play turtle". *Microworlds* are small worlds with a few laws where powerful ideas can be explored. "Objects-to-think-with". Papert & Harel, "Situating Constructionism" (1991): people learn best by making shareable artefacts.
- [D] LEGO Mindstorms (1998) is named after the book.

**Low floor, high ceiling, wide walls.**
- [D] The floor and ceiling idea is Papert's, from Logo. Resnick added *wide walls*: many paths and many kinds of project ("Designing for Wide Walls", https://mres.medium.com/designing-for-wide-walls-323bdb4e7277).
- [D] Resnick et al., "Scratch: Programming for All", *CACM* (2009). Remixing is central to Scratch.
- [D] Resnick, *Lifelong Kindergarten* (2017): projects, passion, peers, play.

**Apprenticeship and scaffolding.**
- [D] Wood, Bruner & Ross (1976) introduced scaffolding. Vygotsky's zone of proximal development.
- [D] Collins, Brown & Newman (1989), cognitive apprenticeship: modelling, coaching, scaffolding and fading, articulation, reflection, exploration.
- [D] Lave & Wenger (1991), legitimate peripheral participation.
- [D] Kirschner, Sweller & Clark (2006), "Why Minimal Guidance During Instruction Does Not Work": pure discovery fails novices. The *expertise reversal effect* (Kalyuga): guidance that helps novices hinders experts.

**Wikipedia.**
- [D] Core policies are Verifiability ("verifiability, not truth"), Neutral Point of View and No Original Research, plus cheap reverts, full history and talk pages.
- [D] Bryant, Forte & Bruckman (2005) describe newcomers growing into editors through peripheral participation.
- [D] Halfaker et al., "The Rise and Decline of an Open Collaboration System" (2013): automated quality control drove away good-faith newcomers, and editor numbers declined.
- [I] Quality control that does not protect newcomers kills the community.

**YouTube.**
- [I] YouTube made publishing nearly free and created a huge informal apprenticeship through tutorials. Its risk is engagement-driven amplification.

**Minecraft.**
- [D] Minecraft uses simple blocks, survival constraints and redstone logic, which is Turing-complete; servers and mods; and an Education Edition.
- [I] It democratised building because the floor is one block and the ceiling is computers built from blocks.

**Spreadsheets.**
- [D] VisiCalc (Bricklin & Frankston, 1979). Nardi, *A Small Matter of Programming* (1993): spreadsheets succeed because recomputation is live and intermediate values are visible.
- [D] Panko's research found errors in a large share of operational spreadsheets.
- [D] Herndon, Ash & Pollin (2013) found the Reinhart–Rogoff spreadsheet error.
- [D] In 2020 Public Health England lost about 16,000 COVID test results to Excel's .xls row limit (widely reported).
- [D] Earlier warnings about confident wrong models:
  - Mars Climate Orbiter (1999) was lost to a pound-force-seconds vs newton-seconds units mismatch.
  - Ariane 5 flight 501 (1996) reused software outside the conditions it was designed for.
  - The Sleipner A platform (1991) sank after a finite-element analysis underestimated shear forces, caused by a coarse mesh (Jakobsen & Rosendahl 1994).
  - The Hartford Civic Center roof collapsed in 1978 even though its computer analysis was trusted.
  - Each one is a context-of-use or verification failure.

**Risks: dual use.**
- [D] The Fink Report (US National Research Council, 2004) lists seven "experiments of concern".
- [D] Urbina et al., "Dual use of artificial-intelligence-powered drug discovery", *Nature Machine Intelligence* (2022). Reversing the toxicity objective of a drug-design model produced about 40,000 candidate toxic molecules, including known nerve agents, in under six hours.
- [D] Hanke, Rath, Cicero, Inglesby & Pannu, "Dual-use artificial intelligence and biology: upstream risk-benefit reviews", *Front. Microbiol.* 17 (2026), doi:10.3389/fmicb.2026.1832974. It calls for managed access and safeguards early in development.
- [D] Belfer Center, "The Dual-Use Frontier of AI-Enabled Biotechnology" (https://www.belfercenter.org/research-analysis/dual-use-frontier-ai-enabled-biotechnology-civilian-opportunities-national), on mandated safeguards and nucleotide-synthesis screening.
- [D] Export-control regimes treat technical data and design information as controlled items: US ITAR/EAR, the Wassenaar Arrangement, and the Australia Group for chemical and biological items.
- [I] A shareable Nexus board that designs a controlled item could itself count as controlled technical data. That needs legal review.
- [D] The 3D-printed gun files of Defense Distributed (2013 onwards) set a precedent: design files treated as weapons.

**Risks: confident wrong simulations.**
- [D] Automation bias: Parasuraman & Manzey (2010), people over-trust automated output.
- [D] Sketchy vs photoreal rendering: Schumann et al., CHI 1996, "Assessing the effect of non-photorealistic rendered images in CAD". Sketchy renderings invited more discussion and change, and were read as more provisional.
- [I] A photoreal render of an unvalidated simulation tells the viewer "this is real" when it is not.

**Ethics.**
- [D] Collingridge's dilemma (1980): early on, impacts are unknown; late, change is costly.
- [D] Value Sensitive Design (Friedman). The Asilomar conference (1975) is a precedent for self-governance.

**Accessibility and languages.**
- [D] WCAG 2.2 (W3C, 2023).
- [I] Node graphs are spatial and visual, so screen readers handle them poorly. Nexus needs a text and outline equivalent.
- [D] Wikidata labels are multilingual. Abstract Wikipedia / Wikifunctions (launched 2023) is building language-independent content that can be rendered into many languages.
- [I] Nexus nodes can follow the same split: semantics independent of language, labels per language.

**Also relevant.**
- [D] Bret Victor, "Inventing on Principle" (2012) and "Learnable Programming": immediate connection to what you make.
- [D] Alan Kay's Dynabook (1972).
- [D] Schelling's segregation model (1971): mild individual preferences produce strong segregation. It is the classic example of emergence in a civil simulation.

---

## (B) Principles Nexus should adopt

Each principle says what it changes in the product. "Cn" points at an existing CONSTITUTION rule; "new rule" is a candidate to add.

1. **Every board states its question and context of use** (V&V 40). *Product:* a required root node, `Question & Context of Use`, holding the question, the decision it informs and the consequence if it is wrong. A model-risk level (influence × consequence) sets how much evidence the board must show. *UI:* a risk badge on every board. *New rule.*

2. **Keep verification, validation and calibration apart** (Roache, Oberkampf, Oreskes). *Product:* three separate stamps per model node.
   - *Verified*: tests and a convergence or mesh study show the code solves its equations.
   - *Validated against [named experiment], range [x]*.
   - *Calibrated on [data]*.

   Never show "validated" for a calibrated node. *UI:* three icons. *Extends C9 and C16.*

3. **Validity envelopes travel on the wires** (Ariane 5, Sleipner). *Product:* each model declares the input ranges it was validated over. Any output computed outside that range carries an "extrapolation" flag downstream. The AI must say so when it uses that output. *New rule.*

4. **Every map lists what it leaves out** (Korzybski, Box). *Product:* a required `Assumptions / Omitted` field per model node, shown on hover and gathered into a "what this board ignores" panel. *UI:* rendering style shows credibility: low-credibility results render sketchy, and the photoreal look is earned (Schumann 1996). *Extends Q15 in Chapter 1.*

5. **Predictions must be falsifiable, and the board keeps a track record** (Popper, Lakatos). *Product:*
   - A `Reality Check` node that records a real measurement against a prediction.
   - Each board shows hits and misses.
   - A "patch counter" shows how many times parameters were tuned after a failed prediction. Many patches means a degenerating board.

6. **Label every edge with its causal rung** (Pearl). *Product:* edges are typed `correlation` (a data fit), `mechanism` (a law), or `counterfactual`. A `do()` node makes interventions explicit. *Safety boundary for the AI:* it may not answer "what happens if I do X" from correlation-only edges without saying that it is doing so.

7. **Treat emergence honestly: ensembles, not one run** (Anderson, Schelling, Weaver). *Product:* life, civil and agent nodes run an ensemble by default and show the spread. Every scale hand-off node names what it coarse-grains away. *New rule:* no single-trajectory output for stochastic or social models.

8. **Show the prediction horizon** (Lorenz, Wolfram). *Product:* chaotic or irreducible systems show a horizon estimate. Past it the UI says "scenario, not forecast". The AI explains that some answers can only come from running the system.

9. **Word checks as "sound but incomplete"** (Gödel, Turing, Rice). *Product:* never "valid" or "safe". Say "no failures found by checks A, B, C; not checked: D, E". A board's check list includes what was *not* checked. *Extends C10 (honest wording).*

10. **Make the frame visible** (McCarthy & Hayes). *Product:* when the AI or a solver changes something, it shows (a) what changed, (b) what it assumed would not change, and (c) one prompt about effects that may lie off the graph. *Node:* `Unchanged Assumptions`, attached to every change that follows.

11. **Store claims, not facts** (Wikidata). *Product:* every figure is a statement with a value, qualifiers (conditions, temperature, valid-from), references, and a rank (preferred, normal or deprecated). Conflicting sources live side by side with the preferred one marked. *Implements C7 and C18.* Map parts to Wikidata QIDs and schema.org types for interoperability.

12. **Use a thin upper ontology and local consistency** (BFO and DOLCE distinctions; Cyc's microtheories). *Product:* a small core: object, process, part-of, role, function, quality, plus *contexts* (a scale, a domain, a board). Inside a context, consistency is enforced; across contexts, contradictions are allowed but flagged. Do not try to build Cyc.

13. **Semantics grow only where an application uses them** (Hogan, schema.org). *Product:* a part needs only the fields that enable a check or solver today. A new property is added when a node consumes it. *New rule:* a property nothing reads is dead weight, like C4's library law.

14. **Rooms by pattern language and unfolding** (Alexander). *Product:*
   - `Pattern` nodes: problem, context, forces, solution, links to larger and smaller patterns, and an evidence tag (measured, as with Ulrich 1984 and daylight, or judgement).
   - A room board scores which patterns it satisfies.
   - An *Unfolding* mode: each AI step must preserve or strengthen existing centres, never wipe them.
   - A Nature of Order checklist of the 15 properties as an optional lens.

15. **Augment, don't replace; let the tools improve the tools** (Engelbart). *Product:* the AI explains every step (this already matches the "every AI flow explained" requirement in the vr-sandbox CLAUDE.md). Nexus is used to build Nexus (dogfooding), and its own development boards are visible.

16. **Exploration trails** (Bush). *Product:* a person's path through the library (what they opened, compared and folded) is saved as a shareable *trail*. Others can replay it as a lesson.

17. **Contradictions become TRIZ prompts.** *Product:* when a solver hits a trade-off (stiffer vs lighter, cheaper vs longer-lived), a `Contradiction` node names the two parameters, suggests matrix principles and states the Ideal Final Result. Label it a heuristic.

18. **An analogy engine that matches structure** (Gentner, Gick & Holyoak). *Product:* "what else in the library has this relational structure?", searched over graph shape and causal relations, not names. Offered as a hint, because people rarely transfer analogies unprompted.

19. **Show the adjacent possible** (Kauffman, Arthur, Uzzi). *Product:* a "next builds" panel listing what is one step from what the person already has: one more part, one fold, one new phenomenon. It favours mostly conventional combinations with one atypical insertion.

20. **Support Boden's three kinds of creativity.** *Product:*
   - Combinational: free remixing of nodes.
   - Exploratory: design-space sweeps and Pareto fronts.
   - Transformational: a clearly marked *counterfactual-physics* or *fiction* mode, where a law can be relaxed with a banner and never mixed into real builds.
   - Celebrate P-creativity ("new to you") and offer an optional prior-art check for H-creativity ("new to the world": patents, papers).

21. **Low floor, high ceiling, wide walls.** *Product:* three layers, each always openable from the one above.
   - (1) Say an idea.
   - (2) Boards.
   - (3) Equations and code inside a node.

   Starter projects span cooking, gardens, music, rooms, toys, bridges and cities, not only machines.

22. **Microworlds** (Papert). *Product:* curated small worlds with few laws, for example "only gravity and springs" or "only heat flow in one room". A person can add laws one at a time. *VR forge:* body-syntonic first-person modes ("be the electron", "walk the heat flow"), Papert's turtle in VR.

23. **Scaffold, then fade** (Wood, Bruner & Ross; Collins et al.; Kirschner et al.; expertise reversal). *Product:* the AI's level of help tracks what the person has shown they can do. It asks them to explain their reasoning ("why do you think the beam failed?") before telling. Novices get worked examples; experts get terse output.

24. **Wikipedia-style openness, with protected newcomers** (Halfaker). *Product:* every change can be reverted, with full history; a talk page per node; the rule "verifiable, not 'true'". Tiny first contributions, such as fixing a source. Reviews of newcomers' work must be kind, and automated rejections explain how to fix the problem.

25. **Spreadsheet virtues without spreadsheet sins.** *Product:* live recomputation and visible intermediate values on every wire. Mandatory unit algebra (Mars Climate Orbiter). Range and plausibility checks. Silent-truncation guards (PHE). An independent second check for high-risk outputs (Reinhart–Rogoff).

26. **Remix with lineage** (Scratch). *Product:* every forked board keeps a lineage graph, so credit flows to ancestors, and licences carry through (C18).

27. **A dual-use safety boundary that understands composition.** *Product:*
   - A `Hazard Gate` that is outside the user's control. It runs on stated intent *and* on how the board is composed, because harm can come from assembling harmless parts.
   - Refused classes: designing or enhancing pathogens or toxins; chemical-agent synthesis routes; nuclear-weapon design; explosive and munition design; optimisation objectives that maximise lethality or toxicity (the Urbina lesson: flipping one sign is enough).
   - Allowed: coarse-grained safety and education uses, such as structural-failure-for-safety boards.
   - Audit logs. Legal review of export-controlled technical data before boards are shared.
   - The rules are set by a written policy and a decision record, never by the AI alone.

28. **Consequence gates for real-world action.** *Product:* outputs that drive load-bearing structures, mains electricity, pressure vessels, medical devices or vehicles carry a "not certified; a licensed professional must review" boundary and an export of the full evidence package. Nexus never stamps a design as fit.

29. **Social simulations are scenarios and interventions, not oracles** (Hayek, Lucas, Scott, MacKenzie). *Product:* civil and life boards show their assumptions about human behaviour; give a range, not a single number; and refuse to model identifiable private individuals. *UI:* a "this model can change what it describes" note on policy boards.

30. **Accessible in every language.** *Product:* every board has a text outline readable by a screen reader, with edges as sentences. Full keyboard operation, WCAG 2.2 AA. Node meaning is independent of language; labels come from Wikidata-style multilingual labels. Units and number formats follow the locale. Each node has three reading levels: plain, technical, and equations.

31. **Simulated minds get a moral pause** (Bostrom, inference). *Product:* "life" boards whose agents have models of awareness carry a design note and a decision record on whether the agents could matter morally. No gratuitous suffering mechanics.

---

## (C) Questions

The questions of this pass are chapter 6 of `../BOOK-OF-QUESTIONS.md`.

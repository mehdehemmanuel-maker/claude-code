# Research (round 4): keeping knowledge true at scale (contributors, AI writers, retractions, provenance, calibration, consensus values)
One research pass, 2026-10-31. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.

Not repeated here (already in earlier passes): Wikidata's statement model with qualifiers, references and ranks, and its
habit of keeping conflicting claims side by side (`10-philosophy.md`); ClueBot NG's capped false-positive rate and
Ostrom's principles (`15-commons-citizens.md`); CODATA 2022 being published, and the claim-status list of spec 10
(T-R3). This pass looks at what keeps a shared library true as it grows past what one person can check.

## (A) Findings

### A1. Weighting contributors nobody knows: Dawid–Skene and its heirs

- [C] Dawid & Skene, "Maximum Likelihood Estimation of Observer Error-Rates Using the EM Algorithm", *J. R. Stat. Soc.
  C* 28(1):20–28, 1979, DOI 10.2307/2346806 (https://ideas.repec.org/a/bla/jorssc/v28y1979i1p20-28.html). The setting
  was patient records, where many facets are subject to measurement error. Each observer gets a **confusion matrix** (the
  chance they report class *l* when the truth is *k*). The true class of each item is a hidden variable. EM alternates:
  estimate the hidden truths from the current error rates, then re-estimate the error rates from those truths
  (paper text at https://crowdsourcing-class.org/readings/downloads/ml/EM.pdf).
- [C] The Stan User's Guide writes the same model as a marginalised likelihood with priors, so it can be hierarchical
  (raters share a population prior). That fixes the main weakness of plain maximum likelihood: a rater with few labels
  gets an extreme, overconfident error rate (https://mc-stan.org/docs/2_18/stan-users-guide/data-coding-and-diagnostic-accuracy-models.html).
- [C] Raykar et al., "Learning From Crowds", *JMLR* 11:1297–1322, 2010, extend it to continuous values: each annotator
  is the true value plus Gaussian noise with that annotator's own precision τ_j. It learns annotator precision, the hidden
  truth and a classifier together, and beats majority vote (https://jmlr.org/papers/volume11/raykar10a/raykar10a.pdf).
  [I] This is exactly the form for Nexus's numbers: a contributed mass or modulus is the true value plus noise at that
  contributor's precision.
- [C] Paun et al. (Hovy among the authors), "Comparing Bayesian Models of Annotation", TACL 2018, compare the family
  (Dawid–Skene, GLAD by Whitehill et al. 2009 with item difficulty, MACE by Hovy et al. 2013 with spamming
  annotators, and others). They find probabilistic models beat majority vote and heuristic adjudication
  (http://dirkhovy.com/publication/2018-comparing-bayesian-models-annotation/2018-comparing-bayesian-models-annotation.pdf).
- [M] Known failure modes: the model is identifiable only up to a label swap (it needs a prior that raters are better
  than chance, or a few gold items). Raters are assumed conditionally independent, so a group copying each other (or many
  instances of one LLM) gets counted as many independent witnesses. Item difficulty is not modelled in plain
  Dawid–Skene (GLAD adds it).
- [I] For Nexus the "annotators" are people, imported datasets, scrapers, and AI gates (each model and prompt version is
  one rater). The correlated-rater failure is the dangerous one: five calls to the same model are one witness, not five.

### A2. Model collapse: what an AI writing into a shared library does to it

- [C] Shumailov, Shumaylov, Zhao, Papernot, Anderson & Gal, "AI models collapse when trained on recursively generated
  data", *Nature* 631:755–759 (24 July 2024), DOI 10.1038/s41586-024-07566-y. Author correction: *Nature* 640, E6 (2025),
  DOI 10.1038/s41586-025-08905-3 (PubMed 39048682, https://pubmed.ncbi.nlm.nih.gov/39048682). When models train on what
  earlier models produced, **the tails go first**: rare events vanish and later generations converge to a narrow,
  low-variance picture. Shown for LLMs, VAEs and Gaussian mixtures.
- [C] Gerstgrasser, Schaeffer et al., "Is Model Collapse Inevitable? Breaking the Curse of Recursion by Accumulating Real
  and Synthetic Data", arXiv:2404.01413 (2024). **Replacing** data with each generation's output causes collapse in every
  setting they tested. **Accumulating** (keeping all the real data and adding the synthetic on top) keeps the test error
  bounded: for linear models they prove a finite upper bound that does not grow with the number of iterations
  (https://arxiv.org/pdf/2404.01413).
- [C] Alemohammad et al., "Self-Consuming Generative Models Go MAD", ICLR 2024 (arXiv:2307.01850): without "enough fresh
  real data in each generation", quality (precision) or diversity (recall) falls. Picking only the best synthetic
  samples (to keep quality up) speeds up the loss of diversity
  (https://proceedings.iclr.cc/paper_files/paper/2024/hash/ebc042e767de551803ccfcc45e2454f5-Abstract-Conference.html).
  A summary page says a fixed real pool only slows the decline (https://www.emergentmind.com/topics/self-consuming-generative-models).
- [I] What this means for Nexus's library. The library is not a model's training set, but it degrades the same way. If
  the in-app Claude fills gaps with "typical" values, and later builds (and later AI calls reading the library as context)
  take those values as given, the library drifts toward the typical. **The unusual real product (the light frame, the odd
  thread pitch) is the tail that disappears.** Three rules follow:
  (1) AI-written values never *replace* sourced ones, they only sit beside them (the accumulate result);
  (2) every AI-written value carries a lineage flag that propagates through derivations, so a derived value knows what
  fraction of its inputs are synthetic;
  (3) the AI may not cite AI-written library entries as evidence (no self-consumption), only as a starting guess.
- [I] The "curated best sample" finding warns against one tempting design: letting a judge pick the "best" AI value and
  dropping the rest. That keeps quality and narrows the spread. Keep the spread.

### A3. Retractions and citation health

- [C] Crossref acquired the Retraction Watch database on 12 Sept 2023 and made it open. At that time Crossref held about
  14k retractions and Retraction Watch about 43k, about 50k together after overlap. The full dataset is in a git
  repository (edit dated 2024-10-10), and retractions appear in the REST API's `update-to` field with `source` =
  `publisher` or `retraction-watch` (https://www.crossref.org/blog/news-crossref-and-retraction-watch,
  https://www.crossref.org/documentation/retrieve-metadata/retraction-watch). Expressions of concern and corrections are
  included but "not as comprehensive".
- [C] Van Noorden, *Nature* 624 (Dec 2023), DOI 10.1038/d41586-023-03974-8: more than 10,000 retractions in 2023, a
  record; over 8,000 from Hindawi (Wiley), mostly special issues; the retraction rate more than tripled in a decade and
  passed 0.2 % in 2022. (Read through search summaries of the Nature PDF, not the PDF itself.)
- [C] Retracted papers go on being cited, almost always without saying so. In biomedicine 1960–2020, only 722 of 13,252
  post-retraction citation contexts (5.4 %) mention the retraction, and retraction did not change how the papers were
  cited (Hsiao & Schneider, PMC9520488, https://pmc.ncbi.nlm.nih.gov/articles/PMC9520488). In one clinical-trial case,
  96 % of 112 post-retraction citations did not mention it, and citations rose after the retraction
  (https://news.illinois.edu/retracted-scientific-paper-persists-in-new-citations-study-finds). Retracted systematic
  reviews: 60.8 % of citations came after the retraction, 5 % noted it
  (https://www.sciencedirect.com/science/article/pii/S0895435622001354).
- [C] Retracted papers persist on Wikipedia too. A 2025 study suggests using Wikidata's WikiProject Retractions as the
  layer that carries retraction status across pages (arXiv:2509.18403, https://arxiv.org/html/2509.18403v3). English
  Wikipedia's `{{Cite Q}}` shows a "Retracted" warning automatically when the Wikidata item has *retracted by* (P5824)
  (https://en.wikipedia.org/wiki/Template:Retracted).
- [C] scite's Smart Citations: a deep-learning classifier labels each citing sentence as **supporting, contrasting or
  mentioning**, and shows the sentence (Nicholson et al., https://digitalcommons.unl.edu/scholcom/247). scite says 1.6B+
  statements (https://scite.ai/features). Its own blog's counts: of ~969M statements, ~895M mentioning, ~40M supporting,
  ~5M contrasting, ~28M unclassified (https://scite.ai/blog/characteristics-of-scite-citation-statements).
  [I] So about 92 % of citations only *mention*. A citation count is mostly not evidence, which confirms synthesis
  finding 14 ("citations are not evidence") with a number.
- [C] The replication crisis, by numbers:
  - Psychology (Open Science Collaboration, *Science* 349, aac4716, 2015): 97 % of 100 original studies were
    significant, but only 36 % of the replications (35 of 97; 95 % CI 26.6–46.2 %). Replication effects were about half
    the original size (https://langcog.stanford.edu/papers_new/osc-2015-science.pdf).
  - Preclinical cancer biology (Errington et al., *eLife* 2021): 158 effects from 50 experiments in 23 papers. The median
    replication effect size was 85 % smaller (0.43 against 2.96); 92 % of replication effects were smaller than the
    original; original positive results replicated about half as often (40 %) as original null results (80 %)
    (https://elifesciences.org/articles/71601, https://www.cos.io/rpcb).
  - [M] Begley & Ellis (*Nature* 2012): Amgen confirmed 6 of 53 "landmark" cancer papers. Not re-checked this pass.
  - [C] Ioannidis (*PLoS Med* 2005): the chance that a significant finding is true is PPV = (1−β)R / (R − βR + α). It
    falls with small studies, small effects, many tested relations, flexibility and bias
    (https://en.wikisource.org/wiki/Page:Ioannidis_(2005)_Why_Most_Published_Research_Findings_Are_False.pdf/1).
- [I] For an engineering library, the analogue of "original effect size vs replication" is a maker's headline figure
  against independent measurement (a motor's peak thrust, a battery's cycle life). The prior should expect headline
  figures to shrink when someone else measures them, and the shrinkage is itself data we could learn per source type.

### A4. Provenance standards

- [C] **W3C PROV-O** (W3C Recommendation, 30 April 2013, https://www.w3.org/TR/prov-o): three classes, **Entity**,
  **Activity**, **Agent**. The core properties are `wasGeneratedBy`, `used`, `wasDerivedFrom`, `wasAttributedTo`,
  `wasAssociatedWith`, `actedOnBehalfOf`, `wasInformedBy`, `wasInvalidatedBy`, with start and end times. Each has a
  *qualified* form (`qualifiedDerivation` → a `prov:Derivation` object) where roles and extra detail can be attached.
  [I] `actedOnBehalfOf` is how an AI agent's act is tied to the person who asked it. `wasInvalidatedBy` is how a
  retraction or a superseded value ends an entity's validity without deleting it.
- [C] The **PAV** ontology refines PROV attribution into `createdBy`, `createdWith` (the software), `contributedBy` and
  `authoredBy` (PMC4177195, https://pmc.ncbi.nlm.nih.gov/articles/PMC4177195). [I] `createdWith` is the slot for
  "which model and prompt version".
- [C] **REUSE 3.3** (FSFE, released 14 Nov 2024 with reuse-tool 5.0.0): every file carries `SPDX-FileCopyrightText` and
  `SPDX-License-Identifier` (a valid SPDX licence *expression*, e.g. `GPL-3.0-or-later OR Apache-2.0`) in a comment
  header, or the information goes in a `REUSE.toml` (added in 3.2) that maps globs to licences, with a `precedence`
  setting. `reuse lint` checks a whole project (https://reuse.software/spec-3.3,
  https://fsfe.org/news/2024/news-20241114-01.en.html).
- [C] **SPDX 3.0** (released April 2024) adds *profiles*: Security, Build, **Dataset** and **AI** among them
  (https://spdx.dev/about/overview). ISO/IEC 5962 (2021) is SPDX 2.2; the SPDX 3.0 edition is at the FDIS stage
  (50.20), with publication expected 2026-12 (https://www.iso.org/standard/93810.html). [I] A Nexus data file (a kind
  table, a material set) is a dataset in the SPDX sense: it can carry a licence expression and a Dataset-profile record.
- [C] **C2PA Content Credentials** (spec 2.4, https://spec.c2pa.org/specifications/specifications/2.4/specs/ContentCredentials.html):
  a signed **manifest** of **assertions** about an asset. **Ingredients** are the assets it was made from, each with its
  own manifest, so the history forms a tree. A **hard binding** is a cryptographic hash of the bytes (at most one per
  manifest). A **soft binding** is a fingerprint or watermark that survives re-encoding, and the guidance says a
  soft-binding match should be verified, not trusted (https://spec.c2pa.org/specifications/specifications/2.4/guidance/Guidance.html).
  An action `c2pa.created` with IPTC `digitalSourceType` = `trainedAlgorithmicMedia` and a `softwareAgent` marks
  generative-AI output (https://opensource.contentauthenticity.org/docs/manifest/writing/assertions-actions).
  [C] A key caution (mixpeek guide, https://mixpeek.com/guides/c2pa-content-credentials-media-provenance): verification
  proves the assertion is **unchanged, not that it is true**, and a missing credential means nothing, because most
  media never had one.
- [I] Taken together: PROV is the graph, PAV says who and with what, SPDX/REUSE say under what licence, and C2PA says
  how to make the record tamper-evident and how a tree of ingredients carries forward. Nexus's library is already a tree
  of ingredients (the library law), so a C2PA-like manifest per stored piece is natural: its hash, its ingredients' hashes,
  the actions (made by maker X v.N from data Y), who signed.

### A5. Wikidata: how a new kind of claim gets admitted, and how references work

- [C] Anyone can create an item, but only **property creators** and administrators can create a property. A property is
  created from a **proposal** (a template with a description, datatype and examples, pinging relevant WikiProjects).
  After about **one week** of discussion it is created if no objection stands, and the proposer should not close their own
  proposal as the only supporter (https://m.wikidata.org/wiki/Wikidata:Property_proposal;
  https://upload.wikimedia.org/wikipedia/commons/9/91/NLL2024_-_External_IDs_in_Wikidata.pdf).
- [C] References: a reference is itself property-value pairs, typically **stated in** (P248) for publications and
  databases, **reference URL** (P854) for web pages, plus *retrieved* dates (https://www.wikidata.org/wiki/Help:Sources).
  External-ID statements do not need references, but adding them for mass imports is good practice (NLL2024 slides above).
- [C] Ranks: normal by default, with preferred and deprecated. A deprecated value should carry **reason for deprecated
  rank** (P2241), with values such as conflation, possibly invalid entry, or incorrect value (Wayback copy of
  Help:Ranking, https://webcf.waybackmachine.org/web/20220322134249/https://www.wikidata.org/wiki/Special:MyLanguage/Help:Ranking).
  A 2017 Phabricator thread found only about 400 deprecated statements carried a reason
  (https://phabricator.wikimedia.org/T167653); dated.
- [I] Lessons: new *kinds* of claim (a new property, a new quantity kind, a new interface type) pass a slower, reviewed
  gate than new *values*. Deprecation keeps the value and says why. And the rule "a deprecated value carries a reason"
  was mostly not followed, because nothing enforced it. Nexus should make the reason a required field, not a convention.

### A6. Calibration: superforecasting, Brier scores and training

- [C] Brier, *Monthly Weather Review* 78(1):1–3, 1950. Murphy's decomposition: **Brier = reliability − resolution +
  uncertainty**. Reliability measures how far stated probabilities sit from observed frequencies (lower is better).
  Resolution measures how much forecasts separate cases (higher is better). Uncertainty is the outcome's own variance.
  Brier scores cannot be compared across different question sets (https://metricgate.com/blogs/brier-score-explained;
  https://www.spaceweather.gov/sites/default/files/images/u30/Ensemble%20Forecast%20Verification.pdf).
- [C] Good Judgment Open uses a multi-outcome Brier score from 0 (best) to 2 (worst) (https://www.gjopen.com/faq).
- [C] Tetlock, *Expert Political Judgment* (2005): 284 experts, Brier-scored. Foxes (many small ideas) beat hedgehogs
  (one big idea). The "dart-throwing chimp" line is narrower than its fame: on discrimination, experts did beat chance.
  (Secondary sources only, e.g. https://www.jasoncollins.blog/posts/tetlocks-expert-political-judgment-how-good-is-it-how-can-we-know.)
- [C] Mellers et al., *Psychological Science* 25(5):1106–1115, 2014: probability training (under an hour) improved Brier
  scores, and more than scenario training did. The top 2 % were placed in elite teams in year 2 and did not regress to the
  mean (https://learnmoore.org/papers/Mellers%20et%20al%202014.pdf). A summary of the study reports a 6–11 % gain from
  training (https://forum.effectivealtruism.org/posts/W94KjunX3hXAtZvXJ/evidence-on-good-forecasting-practices-from-the-good-1).
  [M] GJP's official forecasts aggregated volunteers' forecasts and then *extremized* the aggregate. That was not
  re-checked this pass beyond the same summary.
- [C] LLMs as forecasters (ForecastBench, Karger et al., ICLR 2025, arXiv:2409.19839, and FRI posts): at launch,
  superforecasters scored 0.093, the public 0.107 and the best LLM 0.111. In an early-2025 update GPT-4.5 scored 0.101
  against superforecasters' 0.081. A later leaderboard has superforecasters at 0.086 and the best LLMs near 0.103, with
  difficulty-adjusted scores (https://forecastingresearch.substack.com/p/llms-are-closing-the-gap-on-human). The numbers
  vary by version.
- [C] LLMs' *verbalised* confidence ("I am 80 % sure") is often miscalibrated and overconfident, and RLHF can make it
  worse (literature summary in arXiv:2604.01457, https://arxiv.org/html/2604.01457v1; ConfTuner, NeurIPS 2025).
- [I] So the in-app AI's stated confidence should not be shown as a probability until it has been scored. Nexus can
  score it: every AI estimate that is later measured, or checked against a sourced value, is a resolved forecast.

### A7. Prediction markets as truth mechanisms, and their failures

- [C] Dreber et al., *PNAS* 112(50):15343–15347, 2015: researchers trading on whether 41 Reproducibility Project
  studies would replicate predicted 71 % correctly (29 of 41) (https://replicationindex.com/2021/05/10/osc-pm). DARPA
  SCORE used markets and surveys on a large claim set, with a logarithmic market scoring rule (LMSR, b = 100,
  100-point endowment) (https://datadryad.org/dataset/doi:10.5061/dryad.pg4f4qrk5). In a later *decision market*, prices
  chose which studies would be replicated: the 12 highest, the 12 lowest and 2 at random
  (https://www.cos.io/blog/decision-markets-predict-replicability-of-online-experiments).
- [C] Failures: in March 2025 a Polymarket market about a US–Ukraine minerals deal resolved "yes" although no deal had
  been made. A large UMA-token holder was alleged to have swung the oracle vote; Polymarket kept the result
  (https://finance.yahoo.com/news/polymarket-faces-backlash-7m-ukraine-010306627.html). NPR (27 Oct 2026) reports that
  Polymarket has investigated "dozens" of election insider-trading and manipulation cases, and quotes Rajiv Sethi that
  election markets are "uniquely vulnerable" (https://www.npr.org/2026/10/27/nx-s1-6012304/polymarket-election-betting-surveillance).
  The 2024 "French whale" was argued by others not to be manipulation (https://finance.yahoo.com/news/no-polymarket-whales-arent-evidence-181038513.html).
- [M] Known structural failures: the favourite–longshot bias; thin markets on obscure questions; questions that never
  resolve or resolve ambiguously; the resolution oracle as the real point of trust; markets reward being right about what
  *others* will believe when the "truth" is a later vote.
- [I] Lesson: a market is only as true as its **resolution**. In Nexus the resolution can be physical (a measurement, a
  test rig, a simulation against a sourced reference), which is what makes forecasting usable here. Where resolution is a
  vote, do not use a market.

### A8. Machine-learned quality scores and fairness: ORES and Lift Wing

- [C] ORES (Halfaker & Geiger, "ORES: Lowering Barriers with Participatory Machine Learning in Wikipedia", *PACM HCI* 4,
  CSCW2, Art. 148, 2020) was Wikipedia's ML-as-a-service platform (https://stuartgeiger.com/articles). Soon after launch,
  the damage models were reported to be **biased against anonymous editors**. The team studied it by *feature
  injection*: scoring the same edit with `is_anon` flipped (an example edit fell from 91.2 % to lower confidence of being
  good). Then they changed the model (https://meta.wikimedia.org/wiki/Research:ORES:_Facilitating_re-mediation_of_Wikipedia%27s_socio-technical_problems).
- [C] A FAccT 2022 study found the flagging system lessened the bias against anonymous editors on less active and very
  active articles, but had no detectable effect on moderately active ones. It cites Teblunthuis et al.: RCFilters reduced
  bias against newcomers and anonymous editors (https://facctconference.org/static/pdfs_2022/facct22-3533147.pdf).
- [C] ORES was deprecated from late 2023 and replaced by **Lift Wing**; old models run unsupported, with a warning about
  drift (https://github.com/wikimedia/articlequality). The current **language-agnostic revert risk** model card says it
  uses user metadata and "may exhibit bias against edits from new users, temporary accounts, or IP edits". The
  multilingual model (RRML, mBERT, 47 languages) mitigates this but costs about 6× the time, so the recommendation is
  RRML for anonymous edits where available
  (https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Language-agnostic_revert_risk,
  https://meta.wikimedia.org/wiki/Research:Develop_a_ML-based_service_to_predict_reverts_on_Wikipedia).
- [C] English Wikipedia's deprecated-sources practice: edit filter 869 warns registered users citing a deprecated source,
  and edits from IP addresses citing one may be reverted automatically (https://worddisk.com/wiki/Wikipedia:DEPS, a
  mirror; the live page was not read).
- [I] The general lesson: **any score that uses who wrote something (account age, anonymity, reputation) as a feature will
  be harsher on newcomers**, and that compounds, because newcomers' good work is then reverted and never becomes
  training data. Nexus must score the claim on its evidence (does it check, does it match a measurement), and use the
  author's record only as a prior that the evidence quickly overwhelms. Audit by flipping the author fields, the way ORES
  did.

### A9. How standards bodies decide a value

- [C] **CODATA 2022** (Mohr et al., *Rev. Mod. Phys.* 97, 025002, 2025, https://physics.nist.gov/cuu/pdf/RevModPhys.97.025002.pdf;
  arXiv:2409.03787): one least-squares adjustment of 133 input data and 79 adjusted constants (ν = 54). The initial
  χ² was 109.6 (p ≈ 0.001 %), and eight inputs made up about 70 % of it. **Expansion factors** of 1.7 (some tables) and
  2.5 (data D1–D6) were applied to those inputs' uncertainties, giving χ² = 44.2 (p = 83 %). For **G**, 16 measurements
  are mutually inconsistent and need an expansion factor of **3.9**, the rule being that all normalised residuals must be
  ≤ 2. After expansion the Birge ratio R_B = √(χ²/ν) = 0.93. The next adjustment (CODATA 2026) closes for data on
  31 Dec 2026, with values early 2027 (https://codata.org/initiatives/data-science-and-stewardship/fundamental-physical-constants).
- [C] **NIST SRMs** have three value grades (SP 260-136, https://www.nist.gov/system/files/documents/srm/SP260-136.PDF):
  **Certified** (all known or suspected sources of bias investigated or accounted for), **Reference** (best estimate,
  bias not fully investigated), **Information** (of use, with not enough information to judge its uncertainty). Certified
  values come from defined "modes" of value assignment. NIST holds that a *consensus value* from an interlaboratory study
  is traceable if its inputs are, because the reduction is a GUM measurement model
  (https://www.nist.gov/metrology/metrological-traceability).
- [C] **CIPM MRA key comparisons**: a key comparison reference value (KCRV) with its uncertainty. Each lab's **degree of
  equivalence** is its deviation from the KCRV with the expanded uncertainty of that deviation (k = 2). Regional
  comparisons link to the KCRV without changing it. The KCDB holds ~970 comparisons since 1999. The CCRI(II) stopped
  computing KCRVs in 2013 for its comparisons (search summary of BIPM documents, e.g.
  https://www.bipm.org/cc/CCRI(II)/Allowed/22/37-2013_CCRI(II)_decision_on_KCRV.pdf).
- [C] **ISO consensus** (ISO/IEC Directives Part 1, from ISO/IEC Guide 2:2004): "general agreement, characterized by the
  absence of sustained opposition to substantial issues by any important part of the concerned interests ... NOTE
  Consensus need not imply unanimity". The leadership judges whether consensus exists, and registers sustained opposition.
  The approval rule is 2/3 of P-members in favour and no more than 25 % of all votes negative. Stages run 00 preliminary,
  10 proposal, 20 preparatory, 30 committee, 40 enquiry (DIS), 50 approval (FDIS), 60 publication
  (https://www.iso.org/sites/directives/current/consolidated/index.html;
  https://www.unescap.org/sites/default/files/2%20-%20ISO%20standards%20developoment%20process%20-%20In%20brief.pdf).
- [I] Three different ways to decide a value: **statistical** (CODATA: one global fit, inflate the inconsistent inputs
  until residuals ≤ 2, publish the factor), **graded** (NIST: say how much bias was looked for), **procedural** (ISO:
  agreement without sustained opposition, for things that are choices, not measurements). Nexus needs all three: a fit
  for a measured value (a material's density across sources), a grade on every value, and a procedure for conventions
  (what a port type is called, a new interface type).

## (B) What Nexus should take

Each item is a node, rule, data model or way of working, with the spec it fits.

### B1. Data models (spec 10, extending spec 00's provenance check)

1. **Claim record** (data model, spec 10 T3): every value is a *claim*: `{value, unit, kind, status, spread, sources[],
   lineage, rank, validity, deprecatedReason?, grade}`. `status` keeps T-R3's list. Add `grade` with NIST's three
   (certified-like: bias investigated; reference: best estimate; information: no uncertainty claimed). Status says
   *where the value comes from*; grade says *how hard its bias was looked for*. Two separate axes. [I]
2. **Provenance as PROV** (data model, spec 00 S4 / spec 10): store each claim's history as PROV Entity–Activity–Agent:
   `wasDerivedFrom` (inputs), `wasGeneratedBy` (the node run or import), `wasAttributedTo` (person, dataset, model),
   `actedOnBehalfOf` (the AI acting for the user who asked), `createdWith` (PAV: model id and prompt version),
   `wasInvalidatedBy` (retraction, superseded datasheet). Export as PROV-JSON or JSON-LD so others can read it. [I]
3. **Lineage fraction** (rule, spec 10): every derived value carries `synthetic` = the share of its inputs (by
   sensitivity weight, from T8's derivatives where available) that came from AI-written or "typical" claims. Shown as a
   badge; a release gate in the compiler (`compiler.ts`) can require it below a threshold. [I]
4. **Manifest per stored piece** (data model, spec 00, library law in `stock.ts`): a C2PA-like manifest: the design
   hash (a hard binding), the ingredients' manifest hashes (the sub-parts), the actions (maker, version, data file
   hashes), the signer. A piece whose ingredient was invalidated shows it at once by walking the ingredient tree. Note in
   the UI that a valid manifest proves *unchanged*, not *true*. [I]
5. **Licence on every data file** (rule, spec 00): every file under `src/data/` and every kind table carries an
   `SPDX-License-Identifier` expression and `SPDX-FileCopyrightText`, or an entry in a `REUSE.toml`. A check like `reuse
   lint` runs in the gate. A value copied from a source carries the source's licence expression. A board that mixes
   incompatible licences says so on export. [I]
6. **Deprecation with a required reason** (rule, spec 10): a value is never deleted; it is ranked deprecated with a
   reason from a fixed list (retracted, superseded by revision, conflation, wrong unit, out of measured range, failed
   check, mis-transcribed). The provenance check fails a deprecated claim without a reason (where Wikidata's convention
   was mostly ignored, ours is enforced). [C basis A5, I]

### B2. Nodes (spec 10 unless said)

7. **Retraction watch node** (node, spec 10): reads each source DOI in `data/references.ts` against the Crossref
   `update-to` field (Retraction Watch data). On a retraction, expression of concern or correction it marks every claim
   citing that DOI and walks `wasDerivedFrom` forward to everything that depends on it, as a list of affected boards and
   stored pieces. Runs on schedule (spec 11 living world: the library's own weather). [C basis A3]
8. **Citation stance per source** (node): when a value is backed by a paper, record whether *our* use is supporting
   (the paper measured it), mentioning (the paper quotes someone else) or contrasting. Follow mentions back to the
   original measurement (the "count independent measurements, not citations" rule of synthesis finding 14). Shown as
   `n independent measurements` on the claim. [C basis scite counts, I]
9. **Value fit node, CODATA style** (node, spec 10 T-R2 / T1): given several sourced measurements of one quantity,
   compute the weighted mean, χ², Birge ratio and normalised residuals. If residuals > 2, report which sources are
   inconsistent and the expansion factor needed, rather than quietly averaging. Output is a claim of status `derived`,
   with the fit as its activity. [C basis A9]
10. **Contributor model node, Dawid–Skene / Raykar** (node): for categorical claims (which standard a part follows,
    which material) a Dawid–Skene confusion matrix per source; for numbers, a Raykar-style precision per source,
    hierarchical (a Stan-like prior over sources of one type: datasheets, hobby sites, AI calls, users). Output: posterior
    value and spread plus each source's learned reliability. Correlated sources (same model, same scraped origin, same
    copied datasheet) are merged into one witness *before* fitting. [C basis A1, I]
11. **Degree of equivalence view** (node, view): for any value with a fit, show each source's deviation from the
    reference with its k = 2 band, as a key-comparison chart. A user sees at a glance which datasheet is the outlier. [C basis A9]
12. **Headline-shrinkage prior** (node, data): learn, per source type (maker datasheet, review site, independent lab),
    how far headline figures shrink when independently measured (the replication analogue). Use it as the prior in
    node 10. Sourced, small, and grown as measurements come in. [I, from A3]
13. **Calibration ledger of the AI** (node, spec 10 and `agent.ts`): every AI-produced estimate is logged as a forecast
    with a stated probability or interval. When it is later resolved (a measurement, a sourced value, a simulation
    against a reference), it is scored by Brier (categorical) or interval coverage and CRPS (numeric). The ledger shows a
    reliability diagram per task tag, the Murphy parts (reliability, resolution), and the AI's confidence is shown to the
    user **only after recalibration** from this ledger. Until enough are resolved, it says "uncalibrated". [C basis A6]
14. **Author-flip audit** (node, spec 10 and any AI gate): every scoring gate that sees author fields is run twice, with
    author fields swapped (new user ↔ long-standing; human ↔ AI), and the score difference is reported. Large
    differences fail the gate's own test. The ORES feature-injection method, made routine. [C basis A8]
15. **Physical-resolution forecasting** (node, spec 07 ideas, spec 11): forecasts on questions that resolve by a test the
    app can run (will this bracket fail under load X; will this drone hover at mass Y). Users and AI forecast; the board
    resolves; Brier per person becomes their calibration record. No money, no vote resolution, so the favourite–longshot
    and oracle failures do not arise. [I, from A7]

### B3. Rules (CONSTITUTION candidates, via decision records)

16. **Accumulate, never replace** (rule, spec 10): an AI-written value never overwrites a sourced value; it is added as
    another claim, normally ranked below. [C basis A2]
17. **No self-consumption** (rule, spec 10, `docs/FOR-AI.md`): the AI may read AI-written library claims only as marked
    guesses, never cite them as evidence, and never derive a `measured` or `calibrated` claim from them. A check walks
    the provenance graph for cycles in which an AI output is supported only by AI outputs. [C basis A2, I]
18. **Keep the tails** (rule): any "pick the best candidate" gate keeps the rejected candidates' spread in the record,
    and the library reports diversity per kind (e.g. the range of masses of stored motors of one class) over time, so a
    narrowing is seen. [C basis Alemohammad, I]
19. **Independent witnesses only** (rule): several calls to one model, one prompt family or one copied datasheet count
    as one witness in any consensus or fit. [I, from A1]
20. **Score evidence, not authors** (rule): author reputation is a prior only; no gate may revert or hide a claim from a
    newcomer on author features alone (contrast the Wikipedia IP auto-revert). [C basis A8]
21. **Kinds slower than values** (way of working, spec 00 and 01): a new property, quantity kind or interface type goes
    through a proposal with a description, datatype, three examples and at least one other approver (person or blind AI
    judge plus a person), and waits a set time, like Wikidata property proposals. Values go straight in with their
    status. [C basis A5]
22. **Conventions by consensus, measurements by fit** (way of working): naming and conventions (spec 02, spec 01's
    interface types) use the ISO rule (no sustained opposition, sustained opposition recorded); measured values use node 9.
    Never vote on a measured value. [C basis A9]
23. **Retraction reaches downstream** (rule): a claim whose source is retracted makes everything derived from it show a
    warning badge, not only the claim itself (5.4 % of post-retraction citations noticed; ours should be 100 %). [C basis A3]
24. **Confidence words are measured words** (rule, FOR-AI): the AI says "likely" or "80 %" only in a task tag whose
    ledger (node 13) shows it is calibrated; otherwise "uncalibrated estimate". This extends "never state a result that
    was not measured" to probabilities. [C basis A6]

### B4. Where it lands

| Item | Spec | Owner extended |
| --- | --- | --- |
| Claim record, grade, deprecation reason | 10 (T3, T5) | `quantities.ts`, `evidence.ts`, data files |
| PROV provenance, lineage fraction | 00 (S4), 10 | `evidence.ts`, `dataflow.ts`, `compiler.ts` |
| Manifest per stored piece, licence | 00 | `stock.ts`, `data/references.ts`, the one test |
| Retraction node, citation stance | 10, 11 | `research.ts`, `data/references.ts` |
| Value fit, degrees of equivalence, contributor model | 10 | `evidence.ts`, `numeric.ts` |
| AI calibration ledger, author-flip audit, no self-consumption | 10 | `agent.ts`, `genai.ts`, `docs/FOR-AI.md` |
| Physical-resolution forecasting | 07, 11 | a starter board (`starters.ts`) |
| Kinds slower than values | 00, 01 | `kinds/`, interface types |

## (C) Questions

### Contributors and weighting
1. What is the unit of a "rater" in Nexus: a person, a dataset, a model id, a model id plus prompt version, or a whole AI pipeline?
2. How many resolved claims does a source need before its learned reliability outweighs the prior for its type?
3. How are correlated sources detected automatically (same numbers to the last digit, same scrape origin, same model)?
4. Should a source's reliability be one number, or vary by quantity kind (a maker good on dimensions, poor on efficiency)?
5. Does Dawid–Skene's label-swap ambiguity matter for categorical claims like "which standard", and how many gold items fix it?
6. Can item difficulty (GLAD) be estimated for engineering values, e.g. "thermal conductivity of a composite" is hard, "bolt head width" easy?
7. How is a user told their contributions are being weighted, without discouraging them?
8. Should a person be able to see their own learned reliability, and challenge it?
9. Does weighting by agreement punish the one contributor who is right against a copied majority?
10. What prior should a brand-new human contributor get compared with a brand-new AI pipeline?

### AI writing into the library
11. What fraction of today's stored values are already "typical" or AI-estimated, measured, not guessed?
12. How should the lineage fraction be weighted: by count of inputs, or by sensitivity of the output to each?
13. What lineage-fraction threshold should block a release, and should it differ by field?
14. How is a cycle "AI output supported only by AI outputs" detected when a human copies an AI value by hand?
15. How is diversity of a library kind measured so that narrowing (collapse) is visible early?
16. Should the AI be shown AI-written claims at all when building, or only sourced ones plus a gap marker?
17. When the AI fills a gap, should it give a range wide enough to cover the real tail, and how wide is honest?
18. Does caching `docs/FOR-AI.md` and library context create a feedback loop where the AI's past outputs shape its future ones?
19. Should AI-written claims expire unless confirmed within some period?
20. How do we keep "fresh real data" coming in when the user is one person: scheduled scrapes, datasheet imports, measurements?

### Retractions and citation health
21. How many DOIs in `data/references.ts` today, and has any been retracted or corrected?
22. How often should the retraction check run, and should it alert or only badge?
23. What should happen to a stored piece whose data came from a later-corrected (not retracted) source?
24. How are non-DOI sources (datasheets, web pages) watched for change: hash of the page, archive copy, retrieved date?
25. Can a datasheet revision be treated as a "correction notice" for every claim drawn from the earlier revision?
26. How is "supporting vs mentioning" decided for our own use of a source: by hand, by an AI gate, or by the source's type?
27. Should Nexus use scite or a similar service, or only Crossref's open data, given cost and licence?
28. What is the engineering equivalent of the replication rate: how often do datasheet figures match independent tests?
29. Which source types (manufacturer, distributor, hobbyist review, standards table) shrink most under independent measurement?
30. How do we treat a retracted paper that is cited for a method still valid (not its result)?

### Provenance and licence
31. Is PROV-JSON or JSON-LD the export, and does anyone downstream read either?
32. How large does the provenance graph grow per board, and does it need compaction (PROV bundles)?
33. Should each stored piece's manifest be signed, and with whose key, for a single-user app?
34. What licence do user-contributed values carry by default, and is that the user's decision (QUESTIONS.md)?
35. Which current data files have unclear licences (scraped tables, datasheets)?
36. Can a CC BY-SA source value be stored in a library under a different licence, and what does export then carry?
37. Do Nexus's exports (STEP, glTF, BOM) carry provenance and licence in their own metadata fields?
38. Should rendered pictures the app makes carry C2PA credentials, marking AI-drawn ones as `trainedAlgorithmicMedia`?
39. Are pictures judged blind (genai.ts) themselves stored with provenance of which model judged them?
40. How is SPDX 3.0's Dataset profile mapped to a Nexus data file, field by field?

### Kinds and consensus
41. Who approves a new quantity kind or interface type in a one-user app: the user, a blind AI judge, or both?
42. How long should a new kind wait before it is created, and is time meaningful when the AI works in seconds?
43. When two sources disagree on a convention (thread naming, port naming), is ISO-style consensus even possible here?
44. Should "sustained opposition" be recorded from AI judges, and what counts as sustained for a model?
45. When should the value fit (node 9) refuse to give one value and instead keep two clusters (like G)?
46. Is the CODATA rule "all normalised residuals ≤ 2" right for engineering data, which is far less consistent?
47. Should an expansion factor be published on every fitted value, as CODATA does?
48. Which NIST grade can any Nexus value honestly claim; can any reach "certified-like"?
49. How is a "consensus value" kept traceable when its inputs are datasheets with no stated uncertainty?
50. When CODATA 2026 lands (early 2027), what is the plan to update and list what moved, given T1?

### Calibration and forecasting
51. What tasks does the in-app AI do that produce a resolvable forecast (estimates, fits, "will it pass")?
52. How many resolved forecasts per task tag are needed before showing calibrated confidence?
53. Brier for categorical, CRPS or interval coverage for numeric: which does the ledger show the user?
54. Can a simulation count as resolution, or only a measurement or sourced value?
55. Should recalibration be per model version, and reset when the model or prompt changes?
56. Is the user's own forecasting record worth showing, or does it feel like grading?
57. Should aggregated AI forecasts be extremized as GJP did, and does that apply to correlated model calls?
58. How are forecasts on questions that never resolve kept from flattering the score?
59. Could a short "probability training" step (like GJP's under-an-hour module) be offered to the user, and does it help engineering estimates?
60. How does the ledger stay honest if the AI also writes the resolution (e.g. picks which sourced value it is checked against)?

### Fairness and gates
61. Which existing gates in Nexus see author or origin features at all?
62. What score difference in the author-flip audit counts as a failure?
63. Does labelling claims "AI-written" make users distrust correct ones, and should the label be softer once calibrated?
64. Is a claim from a newcomer that passes every physical check ever held back, and should it be?
65. How do we stop a reputation prior from becoming permanent (the rich-get-richer of trust)?
66. Should gates be audited for drift over time, as Lift Wing warns old ORES models drift?

## (D) New branches

- Peer prediction and Bayesian truth serum (Prelec 2004): eliciting honest reports without ground truth, for claims that never resolve.
- Hierarchical Dawid–Skene in Stan or a small JS sampler: what it would cost to run in the browser per claim kind.
- Item response theory (Rasch) as the model of item difficulty for engineering values.
- Wikidata's WikiProject Retractions and the P5824 graph: could Nexus read retraction status straight from Wikidata.
- OpenAlex's `is_retracted` field and the "Retracted papers in OpenAlex" study (arXiv:2403.13339) as a second retraction feed.
- PubPeer and post-publication review as an earlier signal than retraction.
- Datasheet revision tracking: manufacturers' change notices (PCN) in electronics as a correction feed for parts.
- in-toto and SLSA (supply-chain attestations) as a model for signing each step of a build, not only the product.
- Sigstore or minisign for signing stored-piece manifests without key management pain.
- RO-Crate (research objects) as a package format for a board plus its data, provenance and licence.
- Interlaboratory comparison statistics (ISO 13528, robust means, Paule–Mandel, DerSimonian–Laird random effects) as alternatives to CODATA's expansion factor.
- The "dark uncertainty" literature (Thompson & Ellison) on unexplained between-lab spread.
- Conformal prediction for calibrated intervals on AI numeric estimates without a distributional assumption.
- Data provenance for LLM training (Data Provenance Initiative, Longpre et al.) and licence audits of popular datasets.
- Watermarking and detecting AI-generated text in contributions, and why detectors are unreliable.
- Metaculus's scoring (peer and baseline scores) and its handling of ambiguous resolution.
- Futarchy and decision markets (Hanson) applied to choosing which library gaps to measure first.
- Community Notes' bridging algorithm (matrix factorisation that rewards agreement across disagreeing groups) as a consensus rule.
- Wikipedia's Lift Wing revert-risk model as a design reference for a Nexus "claim risk" score, with its model card.
- The FAIR data principles and how they compare with REUSE and PROV for Nexus data files.

# Research (round 3, far branch): safety cultures and famous failures

One research pass, 2026-10-31. Marks: [C] checked in that pass with its source; [M] from memory; [I] inference.

## (A) Findings, in short
- **The checklist** [C]: the Boeing Model 299 crashed on 30 Oct 1935 with its new gust lock left engaged; "too complex to fly"; the pre-flight checklist came from it. [I] Complexity outgrew memory; the answer was a procedure.
- **Crew Resource Management** [C]: United 173 (1978) ran out of fuel while the crew fixed on a gear light; the first officer and engineer had said fuel was low. NASA's 1979 workshop; United's programme 1981. [I] The knowledge was in the room; authority blocked it.
- **ASRS** [C] (1976): voluntary, confidential, non-punitive, run by NASA, not the FAA that punishes; over 2 million reports. **Just culture** [C] (Marx): human error → console; at-risk behaviour → coach and remove the incentive; reckless → sanction.
- **PRA and defence in depth** [C]: WASH-1400 (1975) fault and event trees; the NRC withdrew its endorsement of the headline number. **Three Mile Island** [C] (1979): the relief valve's light showed power to the solenoid, not the valve's position; operators read "light off" as "closed". [I] **Show the measured state, never the commanded state as if it were the state.**
- **The surgical checklist** [C]: Haynes et al. 2009 (deaths 1.5 → 0.8 %, before and after, no control); Urbach et al. 2014 in Ontario (no significant change, compliance reported above 90 %); Leape: "it is not the act of ticking off a checklist … but performance of the actions it calls for". Gawande [C]: READ-DO and DO-CONFIRM, at a clear pause point.
- **Reason's Swiss cheese** [C] (BMJ 2000): active failures and latent conditions. **Rasmussen's drift** [C] (1997): effort and efficiency gradients push practice toward the boundary. **Leveson's STAMP and STPA** [C]: accidents from unsafe interactions where nothing failed; the four kinds of unsafe control action (not given; given and hazardous; too early, late or out of order; stopped too soon or applied too long); a wrong process model in the controller.
- **Poka-yoke** [C] (Shingo, 1961): contact, fixed-value and motion-step methods; warning or control. **Jidoka** [C]: Toyoda's 1924 loom stopped itself on a broken thread. **FMEA** [C] (AIAG-VDA 2019): seven steps; Action Priority replaces S × O × D, severity first. **Keyed interfaces** [C]: the medical gas Pin Index Safety System (oxygen pins 2 and 5; nitrous oxide 3 and 5): a regulator cannot seat on the wrong gas. [I] The interface carries its own identity.
- **Post-mortems** [C]: Tacoma Narrows (1940, aeroelastic flutter, not simple resonance); the **Hyatt Regency walkways** (1981, 114 dead: a continuous rod changed to two segments in the shop drawings doubled the load on one connection; the original was already short of code); **Challenger** (1986: 36 °F, engineers advised against below 53 °F; Feynman: estimates "from roughly 1 in 100 to 1 in 100,000", "nature cannot be fooled"); **Therac-25** (software reused, hardware interlocks removed; a race and a counter overflow); the **Millennium Bridge** (2000: synchronous lateral excitation; 37 viscous and 52 tuned dampers, £5 million); the **737 MAX** (MCAS on one angle-of-attack sensor); **Mars Climate Orbiter** (1999: pound-force seconds where newton-seconds were specified, a factor of 4.45); **Sampoong** (1995: a floor added, use changed, columns cut); **Surfside** (NIST's technical findings, June 2026: two column-to-deck connections failed in early June 2021, load moved to neighbours over three weeks; punching shear); the **Ever Given** (2021: loss of manoeuvrability; hard-over helm orders). **NASA's lessons system** [C]: only 23 % of managers had ever entered anything (GAO-02-195); rarely searched (OIG 2012). [I] **Lessons must be pushed at the point of use.**

## (B) What Nexus should take
1. **A failure-mode record on every part** (mode, mechanism, effect, severity, occurrence, detection, prevention against detection controls, envelope, sources, linked incidents), inherited by every board, aggregated by folding.
2. **Action Priority, not S × O × D**: severity first.
3. **Poka-yoke ports**: every port keyed by dimension, unit, frame and handedness, medium, mechanical key; mismatches cannot connect; conversion only in a visible converter node (the Mars Climate Orbiter rule). (This is spec 01's interfaces, made safe.)
4. **The Hyatt gate**: any change to a connection, load path or use re-derives the load path, compares demand and capacity with the approved version, and blocks the change without a fresh check; catches changes of use and removed or resized members.
5. **Stop the line**: a failed check halts that branch with a visible andon; nothing is "done" with one open; anyone, person or AI, can pull it.
6. **Measured against commanded state**: separate fields; the view shows what is sensed and flags disagreement; indicators say what they measure.
7. **Single points of failure**: fault trees from the part graph, minimal cut sets, a cut set of one on a safety function flagged; removing an independent barrier flagged; common causes across layers flagged.
8. **STPA** on every controller (a software one or the AI): the four unsafe-action kinds; feedback for every variable its model relies on.
9. **Dynamic checks, not only static**: flutter, crowd-coupled lateral modes, resonance; a static solver may not say "safe" without them.
10. **An out-of-envelope flag** on every sourced number used beyond its tested range ("15° below any tested condition").
11. **Estimates with their spread and their makers**, never collapsed; numbers worked back from targets labelled "target".
12. **A drift monitor**: margins across versions; the count of times one anomaly was accepted.
13. **Capacity that degrades with time**; progressive collapse; inspection intervals.
14. **The AI's own near-miss log**, non-punitive, sorted error, at-risk, reckless, each with its response.
15. **Checklists at pause points** (READ-DO or DO-CONFIRM), short, proving the action, not the tick.
16. **Lessons at the point of use**: incidents linked to part classes and interface keys; placing a hanger-rod connection shows the Hyatt lesson.
17. **Post-mortems** (A3, five whys with root and contributing causes and a "why did the controller believe it" step).
18. **Authority declared** for automation (limits, override, what the person was told); human control actions modelled as part of the system.
19. **Keep hardware interlocks** when adding software, unless justified explicitly.
20. **CRM for the AI pipeline**: any gate may raise a concern the orchestrator must answer.

## (C) Questions

The 72 questions of this pass were chapter 11 of the book; 5 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q11.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches
- Normalisation of deviance (Vaughan) and the Columbia board's foam findings
- Perrow's *Normal Accidents*: interactive complexity and tight coupling as a measurable property of graphs
- High-reliability organisations (Weick and Sutcliffe) applied to AI gates
- Safety-II and FRAM (Hollnagel): learning from what goes right
- Dekker on "human error" and hindsight bias
- NIST's full written report on Champlain Towers South, when published
- Rana Plaza and Ronan Point, and the codes for disproportionate collapse
- Ariane 5 flight 501: software reused outside its envelope
- The Quebec Bridge and the engineer's Iron Ring
- The de Havilland Comet: fatigue, damage tolerance, fail-safe design
- Fukushima Daiichi: a common-cause external event and a seawall from too short a record
- Deepwater Horizon: a misread negative pressure test
- Air France 447: automation surprise and mode confusion, for the AI's hand-over
- Unit-of-measure type systems (F# units, Boost.Units, Pint) as poka-yoke ports
- ISO 26262 and IEC 61508 integrity levels as a severity scale for parts
- FDA MAUDE and NTSB CAROL as sources of real failure modes
- FAA AC 25.1309 and ARP4761: fault-tree templates
- Design for Assembly (Boothroyd–Dewhurst): symmetry rules for parts that cannot go in wrong
- Chernobyl's control-rod tips: a safety action that first made things worse
- Blameless software post-mortems (SRE, "Learning from Incidents")

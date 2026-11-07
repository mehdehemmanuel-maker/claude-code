# A hard critique, 2026-11-06

Panel synthesis against the main session's own critique. Numbers are from `time-facts.md`, git or a named file;
anything else is marked a guess.

## 1. Time

### Today, 00:00 to 23:15 UTC (23.25 h)

| Bucket | Hours | Share | Basis |
| --- | --- | --- | --- |
| Builders building (wave 7: 81 min; wave 8 runs 1 and 2: 51 + 58 min) | 3.2 | 14% | time-facts 44–45 |
| of which lost to the two limit deaths (6/9 × 51 + 3/9 × 58 min) | −0.9 | −4% | arithmetic |
| Real-call evaluations, in a round whose rule was "no evaluations with real calls" | 1.0 | 4% | time-facts 46; 0029 line 28 |
| Gate runs (8 × 3 min), docs passes (2 × 2.5 min × 3 merges), merge bookkeeping, 3 merges failed on bookkeeping | 1.5 | 6% | time-facts 47–48 |
| Waiting on the usage limit (07:04→11:21 minus run 1; 11:50→16:10 minus run 2) | 6.7 | 29% | time-facts 29–30, 49 |
| Not resumed after the 16:10 reset until 21:14 | 5.1 | 22% | time-facts 49; git log |
| Decisions, "user's words recorded" commits, the plan, this panel | 5.6 | 24% | remainder |

Dead: 11.8 h, 51%. Product that survived: 2.3 h, 10%. Process: 2.5 h, so overhead is 78% of build time
(2.5 / 3.2). Of 29 commits today, 14 touch no product code (git log).

### The fortnight (Oct 25 to Nov 6)

- 361 commits ahead of `main`; `main` last touched 2026-10-08. 283 of them (78%) predate 2026-11-02, the day the old
  builds were deleted (CLAUDE.md 35–38).
- Under `src` since Oct 25: 86,466 lines added, 101,570 deleted (`git log --numstat`); 221 files deleted, 213 present
  (time-facts 40–41). PR #80: +68,872 / −86,808 (gh api). Half the files written this fortnight are gone.
- Prose: 19,262 lines of plan and docs against 57,272 of code and 4,289 of tests (time-facts 33–36); tests are 7.5%
  of source. 29 decision files in seven days; four (0026–0029) in sixteen hours.
- Commits per day: 77 on Nov 1, then 29, 3, 0, 17, 29. Throughput fell by two thirds after the user asked for speed.

### Unit costs

- **Per restart.** Tasks #6–#63 (tyre, batteries, engine, Monte Carlo, computer, image-to-model) are all complete and
  all deleted or "not to be built on". By commit share, about 8 of the 12 commit-days this fortnight were thrown away.
- **Per limit death.** Run 1: 34 min of builder work plus about 3.4 h waiting = about 4 h. Run 2: 19 min plus 3.3 h
  waiting plus 5.1 h nobody resumed = about 8.7 h. The ninth builder cost the day. Wave 7 cost 2.29 M tokens for six
  builders, about 380 k each (time-facts 44); nine is about 3.4 M. The pool size is written nowhere, so nobody could
  check whether a wave fits, and launched it twice.
- **Per merge.** About 15 min nominal; three merges failed on bookkeeping, so about 30 min realised (a guess).
  CLAUDE.md says the gate runs "under a minute", "46 s whole" (lines 214, 220); measured, about 3 min. The rules
  file breaks its own rule on stated times.

## 2. Where the panel agrees, and where it does not

Agreed by all five: the work is not where the user looks (`main`, 29 days stale); the restarts are real; nine builders
was the session's choice; process ate most of a "no process" day; contact by bounding boxes is the one geometry root;
the plan ends at boxes (FIX-PLAN 172–173) and is costed in a unit never measured; the main critique is process-first.

Disagreements, and who is right:

- **The limit cost.** Critique: ~6 h. Time: 7.7 h. Process: 9.7 h + 109 min. Product: 6 h + 9.4 h. The time critic is
  right to split it: 6.7 h waiting and 0.9 h lost work are the deaths; the 5.1 h after 16:10 is a separate failure.
  The process critic counts the runs' whole duration as lost, which double-counts the survivors.
- **"No PR."** The critique and time critic say open one. The product critic is right: PR #80 is open since
  2026-10-27, 349 commits, `mergeable_state: clean` (gh api). The failure is never merging it, plus 12 commits held by
  `expect(cards.length).toBeLessThan(7000)` (`domains.test.ts:1627`), the AI's own menu budget.
- **Root 1's shape.** The geometry critic says `firstContact` "sampled on the solids' surfaces with `inPiece`" cannot
  be written as specified: `inPiece` is a point-in-solid test (`room.ts:287`), no kind has a surface
  parameterisation, and `firstContact` has zero occurrences in `room.ts`. True. Its remedy, Jolt `CastShape`, is
  only free for convex kinds; cups, bends and sections need decomposition, which it admits is "the work". My
  judgement: the minimal form is a column-wise bisection on `inPiece` along the axis over the mover's footprint (a
  height-field cast): the grid's resolution stays, the bound goes. One wave, not "two days" (a guess).
- **The loft.** The critique says a lofted solid is "missing from the plan". The geometry critic is right: it is
  missing only from the room. `Loft` and `stationAt` are in `form.ts` (18, 68), `brep.ts` lofts it (49), and
  `brep.ts` is imported only by `compiler.ts`. A box hull is a choice, not a limit.
- **The builder cap.** 4 (critique), 6 (process), 3 (researcher), pool ÷ 380 k (time). The time critic has the right
  form; until the pool is measured, six is the only count with evidence (six finished, nine died twice).
- **A contact sheet per merge.** The critique and researcher want one; the process critic calls it more process. A
  picture the user judges is what "I'll be the check" means; but it costs a day to wire and there is no URL yet. The
  URL comes first.
- **The ceiling.** Product: a cold request at "10%, unmeasured"; researcher: 60–70% on a fixed 50-request set after
  roots 1–3. Both guesses; the researcher's is bounded by section 3. "Exactly as asked" is on neither's table.

## 3. What the research says the ceiling is

- Single parts are the published state: Text2CAD (NeurIPS 2024) 0.93% invalid on its own set, IoU 0.03–0.08 on human
  prompts (https://arxiv.org/html/2409.17106v1, https://arxiv.org/html/2605.18430v1); CAD-Recode <1% invalid from point
  clouds (https://cad-recode.github.io/). Frontier LLMs writing CAD code at Text2CAD-Bench level 3: GPT-5.2 68%
  invalid, Claude 4.5 Sonnet 70%, single solids only.
- The closest analogue to Nexus, ArtiCAD (2026, multi-agent, N parts with N−1 joints, Gemini-3-Pro), reports "100%
  success" meaning the code ran, a VLM judge of 3.4–3.6 on geometry, no closed loops, no catalogue parts
  (https://arxiv.org/html/2604.10992v2). Zoo: single parts, "does not yet support mating or a full assembly constraint
  solver" (https://zoo.dev/docs/faq).
- Real part libraries: bd_warehouse, 12 families in 3.4 years, one author
  (https://bd-warehouse.readthedocs.io/en/latest/); BOSL2, about 18 part files in 7.5 years, still "BETA"
  (https://github.com/BelfrySCAD/BOSL2/wiki). Nexus: 556 families in 32 days, at the standard "sizes typical, nothing
  here was looked at" (REALITY 3085–3086). The 46× speed is the standard, not the tooling.
- Kernels: OpenSCAD 16 years; build123d 3,434 commits, 100+ contributors, at 0.13; replicad one maintainer, 1.1.0 after
  five years; all on OpenCascade. Nexus runs its own contact geometry (`room.ts`, 1,375 lines) and OpenCascade both.
- Usage: every subagent counts against the same five-hour pool; teams use "approximately 7× more tokens"
  (https://code.claude.com/docs/en/costs).

Ceiling, my judgement: a schematic of catalogue parts, recognisable as such, passing a fixed 50-request set at 60–70%
by the user's eye after roots 1–3, in two to three weeks of serial work; each new request class after that costs about
a day. "Any random request comes out exactly as asked" is past the funded frontier and not on this route at any date.

## 4. The ten hardest findings

1. **29 days off `main`; PR #80 mergeable for 10 days; 12 commits held by a 7,000-char menu test.** Change: raise or skip
   the assertion, push, merge #80 today, full test in CI. Cost: one hour (a guess).
2. **Half of today dead: two limit deaths and 5.1 h unresumed.** Change: six builders, each committing every 20 min; a
   scheduled task resumes the session at the reset minute; the pool measured before a wave. Cost: one hour (a guess).
3. **The promise exceeds the frontier and the cold rate is unmeasured; the one named request (drone with arm) is a
   hand-written starter (`starters.ts:992`).** Change: the user writes 20 requests, run once, the user scores from
   pictures, the rate published in REALITY. Cost: about 10 min of calls plus the user's time.
4. **Contact is bounding boxes under 556 families and 60 assemblies; root 1 as written has no surface to sample.**
   Change: column bisection on `inPiece` (a height-field cast), one builder, one 81-minute wave, nothing else running,
   hard stop, remainder reported. Cost: one to two waves (a guess).
5. **No sculpted solid in the room while `Loft` exists in `form.ts` and `brep.ts`.** Change: a `loft` `Prim` with
   `inPrim` from `stationAt` and `primBox` from its stations. Cost: hours (a guess). A hull the user would recognise.
6. **Restart churn: 78% of commits precede the Nov 2 wipe; more deleted than added; 29 decisions in seven days.**
   Change: no new decision file until the previous one's deliverable is on `main`. Cost: none.
7. **Overhead at 78% of build: docs twice per merge, 8 gate runs, 62 min of evaluations in a no-evaluation round.**
   Change: docs once at push; gate on touched fields except before push; no evaluation until root 1 is in. Cost: about
   an hour in `gate.mjs` (a guess).
8. **No URL: hosting has sat "to confirm at phase 3" under "Waiting on the user" since Nov 1 (`PROGRESS.md:35`), never
   asked.** Change: ask the one question in one line; a Pages copy of `main`. Cost: one line and the user's answer.
9. **The plan is costed in "days" never measured; 7.2 of them at today's 3.2 product-hours is about 18 calendar days,
   root 1 alone about 5.** Change: cost in waves; each root one wave with a hard stop. Cost: none but honesty.
10. **Two geometries, the weak one is truth: `brep.ts` audits a lossy drawing (`room.ts:1369–1371`), no page reaches
    it; 564 hand places unchanged though the law says "may only fall"; CLAUDE.md still orders the blind check the user
    waived.** Change: defer brep until root 1 lands; strike the blind-check section; correct the gate time. Cost: 15
    min now; brep two waves later (a guess).

## 5. Stop tomorrow

- Stop writing decisions, "words recorded" commits and docs passes per merge; FIX-PLAN and WANTED are the plan.
- Stop launching nine builders against an unmeasured pool; six, committing often, or one on root 1.
- Stop evaluating with real calls until root 1 is in; nothing runs past two minutes without a timeout.
- Stop holding 361 commits behind a menu-size test; merge #80 and push on `tsc` green.
- Stop estimating in days; one wave, hard stop, remainder reported.

## 6. To the user, plainly

The code is not on `main` because the session never merged a pull request mergeable for ten days, and twelve more
commits are held by a test of the AI's own menu size. That is a one-hour fix and it was not done.

Half of today was waiting: nine builders drained the five-hour limit twice, and after the reset nobody resumed for
five hours. Over the fortnight the branch deleted more code than it added; the engine, battery and car work you saw
is gone by your word of Nov 2 and nothing recognisable has replaced it yet.

A cold request does not come out as asked. The best measured number is 32% on a harder set the session wrote itself,
scored on words; nobody has measured requests you type. No published system, funded or not, does "random request,
real parts, recognisable"; the best reaches a middling furniture-grade sketch. The realistic target here is a
recognisable schematic of catalogue parts at 60–70% on a fixed set you write, after two or three weeks of serial
geometry work; hulls and bodies stay boxes until a lofted solid is added to the room, which is hours and not in the
plan.

The fix plan's roots are the right roots. Its costs are guesses in a unit never measured; at today's pace they are
about three weeks, not seven days. The first thing you should see is the link, then pictures of your own twenty
requests, before any more parts are added.

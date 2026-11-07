# A hard critique, 2026-11-07

From three read-only reports (code, context, process), checked against `plan/CRITIQUE.md`. A guess is marked.

## 1. The twelve hardest findings

| # | Finding, with its evidence | The one change | Cost | Who |
|---|---|---|---|---|
| 1 | **5 h 48 min of 9 h 18 min were dead or idle.** Limit 04:08–07:34; idle 09:22–11:44 with roots 2, 4, 5 open. Zero `send_later` calls, yesterday's #2 again. | At every launch, schedule a resume at the reset minute. Leave a standing order: when idle, start the next root in FIX-PLAN order. | 5 min | session |
| 2 | **Every builder starts from a stale base.** Local `origin/main` is `1aef8ac` (Oct 8). The remote's main is `c31e8c1`, which is not even fetched here. wave9.js:7 computes `BASE` and never uses it; one builder died in 21 s on it. | Run `git fetch origin` before every launch and pass the base SHA to each worktree. | 2 min | session |
| 3 | **Context runs unbounded.** root6: 243 turns, 414k peak, 70.4M cached tokens on a one-hour job. Main session: 482k average over 20,529 turns, 31 compactions. | Cap builders at 80 turns and 200k context. End the main session at each merge; restart from PROGRESS.md and FIX-PLAN.md. | 1 h | session |
| 4 | **Merging costs as much as building:** 106 min of merging against 112 min of building. Docs pass twice by design (merge-wave.sh:23, :32); 757 s of suites in one merge. The stamp is forged: merge-wave.sh:25 `sed`s "(2026-11-06)" into PROGRESS.md and a test checks it. | One docs pass, one owner-scoped gate, push; full suite in CI. No fold. The gate writes the stamp. | 40 min | session |
| 5 | **The gate is one serial file**: domains.test.ts has 3,590 lines and 124 tests and takes 236 s. Fasteners flaky (31.4 s vs 30 s). Every builder edits this 485k-char file. | Split by owner into about 15 parallel files; each builder writes its own; gate runs changed owners; 120 s cases nightly. | 1–2 days (a guess) | builder |
| 6 | **The tests pin source text, not behaviour.** There are sha256 pins of agent.eval.ts, one.eval.ts and vibe.ts (domains.test.ts:20–24, 466, 522), and one test requires "exactly two `return ` tokens" (458–465). | Delete the pins. Test agentBuild against a scripted fake `Ask` and assert on its steps and outputs. | 1 day (a guess) | builder |
| 7 | **The session ran two lanes and reported five builders.** Loft ended 03:03:27, robots started 03:03:29. REALITY.md:3091 says "five builders". | Read the workflow's real concurrency before planning, and size waves as lanes × 30 min. | 15 min | session |
| 8 | **Briefs are written from memory and the session's own launch rules are broken.** wave10.js:20 named "assert", which the checker protects; wave10b.js:14 re-sent finished work. 9 of 13 briefs over 400 words, root 7 on sonnet, six agents after a limit death, 10 at 11:49. | A pre-launch script refuses on word count, model per root, agent count or base. Briefs quote `git log`/grep for what they name. | 20 min + 2 min per brief | session |
| 9 | **Errors are prose that callers regex-match.** 673 throws, 2 classes; agent.ts:392, :490 regex the wording. 53 of 159 catches swallow, including push-check.mjs:16 `catch { continue; }`. | Typed `Refusal { code, need, have }`, hints keyed on `code`, silent catches banned by lint; push-check refuses on any catch. | 2–3 days; push-check 15 min | builder; session for push-check |
| 10 | **The always-loaded file is a changelog.** vr-sandbox/CLAUDE.md is 34,928 chars; the owners table is 58%, rows up to 2,602 chars, 22 decision mentions. Under it, an 83.5k-token harness floor per builder (unused MCP servers, ~100 skills). | CLAUDE.md to ≤ 6k (section 3); builders spawned without MCP or skills. | 1.5 h; harness unknown | session; user if the harness needs a setting |
| 11 | **Logic is copied and models collide.** `layOut` byte-identical in 7 files (md5 73644be6); `Asm`/`Fold`/`Seed` copied 7 times; 6 mass calculators; two geometry models; `Part`, `Assembly` declared twice. | One `assemblies/board.ts`; then one mass and bounds function over room.ts, `partOfBlock` the only bridge. | 2 h; then 3–5 days (a guess) | builder |
| 12 | **The user-facing promises were dropped again.** The 20 requests were promised before more parts; wave 9 added 17 assemblies. Hosting (PROGRESS.md:35) unasked since Nov 1. Root 2 (FIX-PLAN:167) missing from REALITY and the 09:22 report. | Reports list every root: done, open or skipped, and why. Ask hosting in one line. Run the 20 before any new part. | 10 min + the user's time | session; user |

Below the line: O(pairs × 4,096) sampling in room.ts (exact box/cylinder tests, ~2 days); 1,360 dated comments and a room.ts header ("nothing checks for overlap") contradicted by six overlap loops; 8,812 lines over 200 chars (Prettier, 1 h); ~6,000 no-op `!` without `noUncheckedIndexedAccess`; probes in the main tree turning gate19 red (`isolation: 'worktree'`).

## 2. Yesterday's critique: kept and broken

**Done**
- PR #80 merged at 02:33; #81–#85 within minutes of green (`gh api`).
- Root 1 in column form: `firstContact` in wave 9, the rest in wave 10 (REALITY 3093, 3135).
- The loft is in the room (`room.ts:100`).
- No new decision file today.
- Costs in waves with hard stops, mostly.

**Promised and not done**
- Scheduled resume at the reset: none; 3 h 26 min dead.
- Measure the pool: never; concurrency was two.
- The 20 requests before more parts: not run.
- Docs once at push: still twice per merge.
- Gate on touched fields: every push pays the full suite.
- No bookkeeping-only commits: 4 of 9 today, each gated.
- Ask the URL question: not asked.
- Correct the gate time: CLAUDE.md:232, 238 still say "under a minute", "46 s"; measured 217–236 s.

Five kept, eight broken. Every broken one cost minutes.

## 3. Context architecture and the wave loop

### Context

| Tier | What goes in it | Target size |
|---|---|---|
| **Loaded every turn** | Root CLAUDE.md, plus vr-sandbox/CLAUDE.md cut to the checks, the "never" list, a module map of 69 rows of `concern \| file \| node prefix` (80 characters or less each), the live decision numbers (5 at most) and one "search, don't read" pointer each to WANTED, OWNERS, REALITY and FIX-PLAN | ≤ 6k chars, about 1.5k tokens |
| **Routed, main session and critic** | `docs/CRITIC.md`: the critic, speed and promises sections moved out of CLAUDE.md. WANTED.md is read only when holding the app to it. | 3k + 14k on demand |
| **Routed, builder** | One checked-in `scripts/brief-common.md`, the builder's own OWNERS.md row, its FIX-PLAN section, and a per-job brief | ≤ 1k + ≤ 1.5k + ≤ 1.5k |
| **Rewritten per wave** | PROGRESS.md, generated by the merge script from the wave's result schema and never hand-edited | ≤ 2k |
| **Archived** (`plan/archive/`, off the routing table) | REALITY.md split by month, `plan/research/`, INDEX.md, BOOK-OF-QUESTIONS.md, and every decision whose `Status:` line says superseded or done | unbounded, search-only |
| **Harness** | Builders spawned with no MCP servers and no skill list; stop-hook git check off in workflow sessions; the 93 completed tasks archived and the 5 stale `in_progress` ones closed | builder floor from 83.5k toward 20k (a guess) |

Every decision gets a `Status:` first line. Every builder's session is capped at 80 turns and 200k context. The main session ends at each merge to main.

### The wave loop

| Step | What happens | Budget |
|---|---|---|
| **Brief** | Each job is written from `git log` and grep output pasted into it, at 400 words or less. The pre-launch script checks word count, model per root, agent count against the measured lanes, and base, and refuses on any failure. | 10 min |
| **Base** | `git fetch origin` runs and the base SHA is passed to every worktree. Resume at the reset minute is scheduled. Probes and auditors go in worktrees only. | 2 min |
| **Build** | Jobs run as lanes × one job each, with commits every 20 min, a hard stop and the remainder returned. Each builder writes only its own test file. | 30–45 min |
| **Merge** | Branches are merged or cherry-picked onto the base, with no fold. Per-builder test files are folded in by the script. | 10 min |
| **Gate** | `tsc`, the changed owners' test files and one docs pass. The gate writes the stamp. | 5 min |
| **Push** | One commit carries code and bookkeeping together. | 1 min |
| **Merge to main** | The PR is opened, CI runs the full suite, and the PR merges on green within the hour. PROGRESS.md is regenerated and the session ends. | 5 min + CI |

One wave takes 65–80 minutes from brief to main. Merge plus gate stays at or under a third of build time. If the gate runs over 10 minutes, that is a defect to fix before the next wave.

## 4. Stop tomorrow

- Stop launching without fetching origin, measuring lanes and scheduling the resume.
- Stop running the docs pass twice and the full suite on every push. Gate on owners and let CI run the rest.
- Stop writing briefs from memory, and stop letting builders run past 80 turns or 200k context.
- Stop committing bookkeeping on its own, and stop hand-stamping PROGRESS.md.
- Stop adding parts and assemblies before the user's 20 requests are run and scored.

## 5. To the user, plainly

- Your code is now on `main`: six PRs merged today, #80–#85. That was yesterday's worst finding, and it is fixed.
- Almost six of the nine working hours today were dead. Three and a half were spent waiting out the usage limit with no resume scheduled, and two and a half were idle with open roots. Both were avoidable and both were promised yesterday.
- The "five builders in parallel" were really two at a time, and nobody noticed. Builders are cut from a copy of `main` a month old; that was diagnosed and written down, then never fixed, and one builder died on it.
- Contact now reads the solids and the loft is in. Root 2 was skipped without telling you. Your 20 requests have still not been run or shown to you as pictures.
- The test gate checks the wording of the code more than what it does, and it takes four minutes. Fixing that, and capping how much each builder reads, is about two days of work and comes before more features.

# Research (round 3, far branch): how ordinary people do extraordinary things together, and how commons stay healthy

One research pass, 2026-10-31. Marks: [checked] confirmed against a source in that pass, linked; [memory] from training,
not verified then; [inference] the agent's reasoning.

## (A) Findings, in short

**Citizen science**
- **Foldit** [checked] (Khatib et al., Nat. Struct. Mol. Biol. 2011, PMC3705907): players solved the M-PMV retroviral
  protease in about three weeks after a decade of expert failure; validated not by the game's score but by molecular
  replacement and refinement against real X-ray data; teams credited by name. Players also wrote 5,400+ "recipes"
  (scripts); one, Blue Fuse, beat the developers' Classic Relax (PNAS 2011).
- **EteRNA** [checked] (Lee et al., PNAS 2014): players' RNA designs synthesised and tested weekly in a real lab;
  strategies gathered in a "strategy market" and distilled into an algorithm (EteRNABot); in a year-long blind test
  both beat the existing algorithms; players listed as authors.
- **Galaxy Zoo** [checked]: ~900,000 galaxies classified in months; **Hanny's Voorwerp** found by a schoolteacher
  because there was a place to say "this does not fit"; the green peas [memory] came from the forum, not the buttons.
  Votes weighted by agreement with consensus and checked against professional catalogues [memory].
- **Stardust@home** [checked] (Science 2014): ~30,714 volunteers; seven probable interstellar grains; [memory] a test to
  join and hidden calibration images to measure each volunteer.
- [inference] Why non-experts won: 3D and visual judgement; willingness to accept a worse state to escape a local
  minimum; many people trying very different things; a clear score and fast feedback; **and always a check against
  reality, never the game's own score alone.**

**Commons that last**
- **Ostrom's eight principles** [checked] (*Governing the Commons*, 1990): clear boundaries; rules fitted to place,
  benefits in proportion to contribution; those affected make the rules; monitors answerable to the community;
  graduated sanctions; cheap local conflict resolution; the right to organise recognised; nested layers.
- **Wikipedia** [checked]: ClueBot NG runs at a capped false-positive rate (0.1 % catches ~40 % of vandalism) because
  the community would rather miss vandalism than brand newcomers; it never reverts the same edit twice. Halfaker et al.
  2013: newcomers kept coming, but more of their good-faith edits were reverted and the rules grew hard to change:
  **quality control too strict kills the commons it guards.** [memory] Verifiability, neutral point of view, no original
  research, three reverts at most, talk pages apart from the article, every edit kept.
- **OpenStreetMap** [checked]: free key=value tags, the wiki records what is used, "used first, documented later"; what
  gets tagged reflects who contributes (sex venues tagged while hospice and childcare stalled).
- **Linux** [memory]: maintainers by file, a final decider, signed-off lines for origin, "don't break userspace".
- **Stack Overflow** [checked]: questions peaked ~200,000 a month around 2014, fell slowly (closing and tone), then
  sharply after ChatGPT; December 2025 had 3,862, about its first month in 2008. [inference] **An AI trained on a commons
  can drain it**: if people ask the AI instead, the commons stops getting answers.

**End-user programming that won**
- **Spreadsheets** [memory]: every value visible and concrete, live recalculation, cells named by place, start with one
  cell; most audited spreadsheets have errors (Panko; the often-quoted ~88 % unverified).
- **HyperCard** [memory]: using then authoring, a script under every button. **Scratch** [checked]: users value credit
  given by a person over an automatic link ("Computers can't give credit", CHI 2011); [memory] the remixing dilemma:
  generative projects are remixed more, their remixes less original. **Roblox** [checked]: creators earned $923M in 2024
  and over $1.5B in 2025.

**Sharing without a server**
- **Local-first** [checked] (Ink & Switch, 2019): no spinners; not trapped on one device; the network optional; seamless
  collaboration; work that lasts decades; private by default; you own it. **Automerge 3** [checked]: compressed history
  in memory (one document ~700 MB → ~1.3 MB). **Figma** [checked]: a server per document as the authority; every
  property of every object its own "last writer wins" value; fractional indexes for order.

**Shared worlds** [memory]: reputation unlocking privileges; meta-moderation; fake identities break naive reputation
(defences: trust-weighted, costly identities); griefing defences: personal-space bubbles, rollback logs, permissions,
peer panels; Riot found most toxicity came from ordinary players having a bad day. Public goods collapse without
punishment and hold with peer punishment (Fehr and Gächter 2000). [inference] The best incentive is being reused and
credited, not points.

**Accessibility** [checked]: W3C's XR Accessibility User Requirements (2021, needs, not a baseline); SeeingVR (14
low-vision tools); Canetroller (a haptic cane for blind people in VR). [memory] Captions with speaker and direction;
one-handed and seated play; dwell and switch input; plain language; sign languages are languages, and signing avatars
are often rejected by deaf communities.

## (B) What Nexus should take

1. **Reality is the judge**: a community result counts only after an outside check; every check says
   `verified-against-source`, `simulated-only` or `unverified`.
2. **"This does not fit"** on every view: an anomaly goes to a human queue, never dismissed automatically.
3. **Recipes**: a person's sequence of steps saved as a shareable, ranked node.
4. **A strategy market**: people say why a design worked; the AI distils rules; a blind test before adopting them.
5. **Provenance** on every part: authors, forked from, evidence, validation, and credit written by a person.
6. **Checkers with capped false positives**, never acting twice on one item, every action reversible.
7. **Protect newcomers**: measure how often their work is reverted; a rising rate is an alarm; a person, not a bot,
   meets each first contribution.
8. **Free tags, then consensus**: open key=value attributes; the most used promoted to standards; a report of coverage
   to show bias.
9. **Ostrom's principles** for libraries and worlds: membership, rules by members, answerable monitors, graduated
   sanctions, cheap disputes, nested federation (personal, group, public).
10. **Don't break the parts**: a published interface is never changed in place; a change is a new version with a
    migration.
11. **Verifiability** (our rule already) plus a talk thread on each part for disputes, apart from the part.
12. **Sync** as a map of objects to properties, each its own last-writer-wins value; order by fractional indexes; text
    by a sequence CRDT.
13. **Local-first**: the library complete offline in the browser; sync optional; an open export as the test of
    lasting.
14. **A grid view** of any board (a row a part, a column a property, live), with a lint, since most spreadsheets hold
    errors.
15. **Progressive disclosure**: use a part, open it, edit its script, without leaving the page.
16. **Remix with credit**: one click, lineage kept; originality tracked as a health measure.
17. **Reputation from reuse and validation**, per group, trust-weighted, resistant to fake accounts.
18. **Anti-griefing**: personal bubbles, build permissions, a rollback log, peer panels, nudges before bans.
19. **The AI gives back**: it cites library parts and their authors, and invites the person to add the answer to the
    library (against the Stack Overflow drain).
20. **Describe** every part: alt text, a spatial sound, a haptic signature; a screen-reader tree of the scene; XAUR as
    a checklist; seated, one-hand and switch variants of every action.
21. **Caption and translate**: speaker and direction on captions; the interface translated with a glossary of our own
    terms; a plain-language gate.

## (C) Questions

The 65 questions of this pass were chapter 12 of the book; 0 were kept when it was cut to the best on 2026-11-01 (decision 0010), each tagged Q12.n in `../BOOK-OF-QUESTIONS.md`; the rest are in git history.

## (D) New branches

- Foldit players' de novo protein design (Koepnick et al., Nature 2019) and Foldit with AlphaFold
- EteRNA's OpenKnot and OpenVaccine challenges, and papers with only players as authors
- Zooniverse's Panoptes and Caesar: aggregation and live retirement rules
- Bayesian annotator models (Dawid–Skene) for weighting unknown contributors
- Wikidata's property proposals and bot policy as a model for part schemas
- Wikipedia's machine-learned quality scores (ORES, Lift Wing) and the fairness debate
- OpenStreetMap's 2023 tagging-governance debates and attribution guidelines
- The Debian constitution and Apache's "community over code" as governance templates
- Certificates of origin and SPDX licence tags for parts: the law of remix lineage
- Access control inside a CRDT (Ink & Switch's keyhive, Beelay)
- Eg-walker against Yjs and Automerge for merging scripts
- Peer-to-peer in the browser (Iroh, libp2p, WebRTC data channels) for worlds without a server
- Knowledge as a commons (Hess and Ostrom, 2007)
- Quadratic funding and retroactive public-goods funding to pay contributors of parts
- Riot's Tribunal and Valve's report systems: what reduces repeat griefing
- Meta Horizon's personal boundary and VRChat's trust ranks
- Sign-language recognition and the ethics of avatars (statements of deaf organisations)
- Haptic rendering of materials (CLAW, Haptic PIVOT) for blind users
- Whether readability metrics hold on technical interface text
- Model collapse when AI trains on AI output, and an AI that writes into the library
- Spreadsheet error taxonomies (Panko, EuSpRIG) as a lint checklist
- End-user programming beyond the grid (Dynamicland, Ink & Switch's Potluck)

# The brief every research pass is given

Used by each round (see `TREE.md`, "How a round works"); the pass's topic and its file path are added after it.

CONTEXT: Nexus is a browser node-graph app (TypeScript, three.js, WebXR) where anyone can build or simulate anything from real parts down to the bolt, with sourced data (every number sourced or labelled), physics (Jolt), exact solids (OpenCascade via replicad), an in-app Claude agent that works only through nodes, and an "interface" model where every part carries what it demands of its neighbours (a bolt carries its clearance hole, counterbore and wrench room, derived from its standard, pasted onto any surface, both ways). The plan is in /home/user/claude-code/vr-sandbox/plan/ (read plan/README.md and plan/research/00-synthesis.md first, briefly, so you do not repeat what is known).

RULES: research only; do not change any code; do not commit; write ONE file only, at the path given. Mark every finding [C] checked this session with its URL, [M] from memory, or [I] your inference. Never present a guess as fact.

FILE FORMAT (exactly these four headings, so a script can graft it):
# Research (round N): <title>
One research pass, <date>. Marks: [C] checked in this pass with its source; [M] from memory; [I] inference.
## (A) Findings
## (B) What Nexus should take        (each item as a node, rule, data model or way of working, mapped to plan specs where they fit: 00 structure, 01 interfaces, 09 physics core, 10 trust, 11 living world, 07 ideas)
## (C) Questions                     (at least 60, each line "N. question", grouped under ### subheadings allowed)
## (D) New branches                  (at least 15, each line "- lead", leads you noticed and did not follow)

When done, reply with only: the file path, the number of questions, the number of branches, and the three most important findings in one line each.

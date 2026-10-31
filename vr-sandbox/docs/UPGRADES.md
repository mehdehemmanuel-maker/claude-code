# Full system upgrades: a proposal (2026-10-31)

What would change Nexus most, by system, each with what holds it back today (measured, or said as not measured), what
to build, and how we would know it is done. Ordered at the end by what each unblocks. Nothing here is started; the user
chooses. The road map (`ROADMAP.md`) takes what is chosen.

## Where it stands (measured this week)

- 614 nodes, 64 starter boards, about 4,700 stored pieces, 56,064 catalogue sizes; the gate passes in 44 to 49 s of its
  one-minute limit.
- Navigation: every node found by its name and its id in the first three (all 614 checked), every board and every
  app feature too; misspelt and plain words find what is meant (20 such questions held by the gate). A search takes
  about 12 ms over 8,000 entries.
- The in-app AI builds through 8 tools; a spring request costs 5 steps and about 3,600 fresh tokens (21 steps and
  77,000 before); a second model checks its answer.
- Controls (button, stick, slider) and walking work in Chromium. They have **not** been tried on a real phone, a gamepad
  or a headset.
- Everything a person saves lives in their browser only (`localStorage`); the app runs only inside this container.

## 1. The platform: out of the container, and shared

**Held back by:** the app is served only here (`npm run app`), so no real phone or headset has ever opened it; saved
blocks and boards live in one browser; two people cannot be in one world.

- **1a. Put it on the web.** The pages as a static site; the AI relay as a small server function holding the keys
  (never the page). Done when a phone and a Quest open a link and the Controls board works on each, with screenshots
  from the devices.
- **1b. One shared library.** Saved blocks, boards and the AI's folded blocks in a database (Supabase is connected to
  this account), each with who made it, its version and what it was folded from; the browser keeps a copy to work
  offline. Done when a block saved on the laptop is placed on the phone.
- **1c. A friend in the world.** Presence over a realtime channel: each person a figure where they stand, the board
  and the control states (already kept by name, `controls.ts`) shared, edits merged per node. Done when two browsers
  walk the same yard and one presses the crate's button and the other sees the crate appear.

## 2. Spatial construction and constraints

**Held back by:** parts are placed by numbers typed or solved one at a time; nothing holds a relation when another
part moves (road map items 9 and 10).

- **2a. A constraint solver.** Mates, distances, angles, "on", "aligned", "clear of" as equations solved together
  (a sketch solver for profiles; an assembly solver for placements), reporting what is under- or over-constrained.
- **2b. Changes that follow.** A part's size moved, everything mated to it moves with it, by the solved relations, not
  by re-typed numbers. Done when a bore widened moves its bolt circle, its bolts and the cover over them.

## 3. Physics and time

**Held back by:** what the controls move is placed, not driven: the cart passes through crates, nothing falls, the
walker passes through walls.

- **3a. Controls into the physics.** The Stick drives a body in Jolt (`sim.ts`): wheels with friction, a motor's
  torque from its curve, collisions. Done when the cart pushes a crate and stops at the tower.
- **3b. A walker with a body.** Gravity, stairs, walls, doors that open by the existing agent's door logic.
- **3c. Stress on drawn parts.** Mesh any exact solid with gmsh and run CalculiX (left from item 8); heat by the same
  mesh.

## 4. Materials and matter

**Held back by:** an alloy's figures are typed per alloy where its composition could give some of them.

- **4a. Alloys from their composition** where a law allows (density by mixture, as `mixture.ts` does for mixes), and
  measured where not, each said which.

## 5. The AI, engineered

**Held back by:** judgement and research are still done by hand; the agent is measured by hand, one request at a time.

- **5a. An evaluation set.** 30 requests with checked answers (springs, bolts, a board opened and changed, a block
  folded), run after each change to the agent: steps, tokens, seconds, right or wrong. Done when every change to
  `agent.ts` or `FOR-AI.md` reports against it.
- **5b. The research pipeline** (road map II): a product by name → search and fetch → each figure taken out with its
  quote → gates (schema, units, the quote found word for word) → a queue to approve. Done when one product's published
  figures fill, each sourced, the rejects listed with why.
- **5c. Prompts as nodes** (road map III), versioned and measured against each other.
- **5d. Blind checks by a model that sees.** The screenshot-and-ask step every round asks for, run by Claude's vision
  (cheap with Haiku), as a node: a picture in, what it is and what is wrong out.
- **5e. Meaning search as the last resort.** Where `search` finds nothing, the cheapest model maps the words to
  block ids, gated (the ids must exist).

## 6. Interaction

**Held back by:** controls only at the top of a board; a hand in a headset can press but not hold.

- **6a. Controls inside folded blocks** (a car block with its own steering stick).
- **6b. Grab and move in a headset**: a part picked up by a hand, moved, let go where it mates.
- **6c. Events from presses**: a press starts a chain (open the door, then the light), with the clock.
- **6d. Sound**: what moves makes its sound from what it is (a motor's speed, an impact's materials).
- **6e. The dashboard on a phone**: the top bar overflows at 390 px wide (seen in this week's screenshot).

## 7. Rendering and observation

**Held back by:** the space draws a city by instances well, but materials are flat colours with procedural surfaces;
there is no measured frame budget for a phone or a headset.

- **7a. Frame budgets measured on devices** (after 1a): 72 frames a second on a Quest, 60 on a phone, for the city
  board; draw less where it is missed.
- **7b. Shadows and image lighting in the space** as the docked view has them.

## 8. The engineering of the code

**Held back by:** the gate is near its minute; search scans every entry each time.

- **8a. Search by an index** (words to entries, built once): from about 12 ms toward 1 ms, so the whole navigation
  sweep (every node, every library entry) can run in the gate.
- **8b. The gate split by what changed**, each part under its own budget.

## The order, by what each unblocks

1. **1a, put it on the web**: nothing about phones, headsets or friends can be tested before it.
2. **3a, controls into the physics**: what you work should push back; it is what makes it feel real.
3. **1b and 1c, a shared library and a friend in the world**.
4. **5a, the AI's evaluation set**, then **5b, the research pipeline**: so the AI is improved by measurement and the
   data stops being typed by hand.
5. **2a and 2b, constraints and changes that follow**.
6. The rest as they are needed: 6, 7, 4, 3c, 5c to 5e, 8.

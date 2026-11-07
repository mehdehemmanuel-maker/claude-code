# Spec 13, the node creator: what it shall do

Each line: an id, the requirement in EARS form ("WHEN … THE SYSTEM SHALL …"), and the user's words or the rule it serves
(`../../../docs/WANTED.md`, `../../CONSTITUTION.md`, `../../../CLAUDE.md`, decisions under `../../decisions/`). A
requirement is met when the task that holds its check passes (`tasks.json`).

The user's words (2026-11-02, `WANTED.md:342-344`): "Create a node creator agent that can see what everyone is doing
manually and learns how to make nodes,node types, node boards collapsed into one node to make everything more
efficient". The same day (`WANTED.md:355-357`, and written out in full at `:427-431`): "don't over complicate things
something needs to be asking is all this really necessary kind of like the finding of collapsing nodes boards into one
node imagine building a city that reuses the same house 100 times"; "Create one validated house architecture,
generalize its connections, and instantiate it 100 times while adapting only what differs"; "Collapse unnecessarily
complex node boards into reusable higher-level nodes". Earlier: "collapse a whole nodded generation into one node and
save that node into the node library as a reusable node permanently … variant nodes that allow the change of a colour a
material a size a shape … anything" (`:56-59`); "build a car out of nodes collapse it into one node save it" (`:64`); "a
bolt one node can be any size bolt … one node that covers so much ground" (`:114-116`); "eliminate the need for manual
stuff while maintaining the same results" (`:168`); "a lot of things can be reused across different types of categories"
(`:212-213`).

"Everyone" follows decision 0011 (Nexus is for one person, on a computer, a phone and a headset): every author of a
board on this device: the person by hand, Claude in the app through its tools, and the starters a board is opened from.
Starter and seed boards are written in code, not done by hand, so they are not searched; a starter opened is the open
board, and is. Other people's work waits for hosting.

The node creator is code (R16): the plainest answer to "is all this really necessary", and it keeps every step
checkable.

## Seeing what everyone does

- **R1.** THE SYSTEM SHALL record every change to a board as one event for each undo step: who made it ('you',
  'claude', 'starter', 'import' or 'engine'), when, on which board, and what changed, operation by operation, whoever
  made it. A whole board opened is one event by its author, with no operations. *("see what everyone is doing
  manually")*
- **R2.** WHEN a change makes nothing different, THE SYSTEM SHALL record nothing. WHEN a change is undone or redone, it
  SHALL record that, linked to the event it reverts. *("see what everyone is doing manually": what changed nothing was
  not done, and an undo is something done)*
- **R3.** THE SYSTEM SHALL keep the record on the device, apart from the board's own save, and SHALL never send it whole
  to a model. WHEN it cannot be stored, THE SYSTEM SHALL say so, and the board's own save SHALL go on working. *("see
  what everyone is doing manually", on this device: decision 0011; "failures reported honestly", `CLAUDE.md`)*
- **R4.** THE SYSTEM SHALL keep who made each block ('you', 'claude') and its tests wherever the block goes: saved,
  reloaded, and sent with a request to Claude. *(who made it: "see what everyone is doing manually"; its tests: rule
  C26, "the fold test on every saved block")*

## Learning what repeats

- **R5.** THE SYSTEM SHALL find, by code alone, the same blocks wired the same way at two places or more that share no
  node, each place feeding a sink, on the open board, the boards the person kept and the boards of saved blocks, each
  place with its board. A sink (a viewer, a check, a note, the 3D view) is never part of a repeat, nor is an in.* node,
  which feeds one; places that are twins already are left to Merge. *("learns how to make nodes"; "reuses the same house
  100 times")*
- **R6.** WHEN a repeat cannot be made one node, THE SYSTEM SHALL say why, by name: a block in it that is not pure,
  reads the clock or is live; a block that is not pure downstream of it (a proof would run it); a place that does not
  prove equal; a ± that comes into a place (a fold does not carry one yet); a search or a proof stopped at its time.
  *("failures reported honestly", `CLAUDE.md`)*
- **R7.** WHEN a node it made is in use, THE SYSTEM SHALL count it as one node when it looks again, so repeats of made
  nodes become nodes of their own. *("a lot of things can be reused across different types of categories")*

## Making nodes, node types and boards as one node

- **R8.** WHEN the places of a repeat agree in every value, THE SYSTEM SHALL make them one node. WHEN they differ, it
  SHALL make one node type: each value that differs an input, with its type, unit and choices from that setting's or
  port's own definition and its default the commonest value; each value that agrees a constant inside; two inputs of
  one value type equal at every place, at three places or more, one input. WHEN the node for a repeat is already in the
  library, it SHALL offer that node. *("node types"; "a bolt one node can be any size bolt"; "adapting only what
  differs")*
- **R9.** THE SYSTEM SHALL let the person make any constant of a made node an input, which gives a node of its own
  under a new id, and SHALL keep the values typed on a made node when it is opened to be changed. *("variant nodes that
  allow the change of a colour a material a size a shape … anything")*
- **R10.** THE SYSTEM SHALL fold a whole board into one node: its in.* nodes stay on the board as the node's inputs,
  their values its defaults; its viewers, checks and notes stay outside, reading its outputs. *("node boards collapsed
  into one node"; "build a car out of nodes collapse it into one node save it")*

## Proved before it is offered

- **R11.** BEFORE offering a node, THE SYSTEM SHALL prove it equal against the board's own last run: every place
  rewritten on a copy of the board, and on the copy only the new nodes and what they feed run, so no node above or
  beside the places runs again; at each place, every output of the new node equal by digest to what the place gave;
  below, every value equal by digest, a many-input's items in the order they were, every evidence the same, no warning,
  extrapolation or ± lost. Otherwise it SHALL refuse, naming the place, the output and both values. It SHALL keep each
  place proved as one of the node's tests. *(rule C26: "Folding preserves behaviour exactly"; "eliminate the need for
  manual stuff while maintaining the same results", `WANTED.md:168`)*
- **R12.** THE SYSTEM SHALL keep one block for one node (its shape, its constants, its inputs), SHALL refuse a different
  block under an id already taken, and a made node SHALL run wherever a saved block runs, the pool's workers among them,
  with every block it holds. *("save that node into the node library as a reusable node permanently",
  `WANTED.md:56-57`)*

## Offered to the person

- **R13.** THE SYSTEM SHALL change no board and no library without the person's yes. A repeat with three places or
  more over the boards searched, whose places on the open board prove, is shown as one card at a time, saying what it
  saves and what its proof covers. On a yes it SHALL prove again on the board as it is and then change it as one undo
  step; WHEN a place no longer proves, it SHALL change nothing and name the place. A no is remembered until the repeat
  has more places. The same page does this on the computer and on the phone. *("to make everything more efficient";
  the devices: decision 0011)*
- **R14.** THE SYSTEM SHALL count what a made node saves by the hand-action rule (decision 0019): the hand actions the
  board holds against those it holds with the node, each figure with the command that counted it.
  *("eliminate the need for manual stuff while maintaining the same results")*

## Claude, and no model

- **R15.** WHEN Claude in the app folds nodes or a whole board, THE SYSTEM SHALL fold them as the page does, the block
  by 'claude'; a whole board SHALL be folded as R10 says, its viewers, checks and notes outside. *("see what everyone is
  doing manually": Claude is one of everyone; "node boards collapsed into one node")*
- **R16.** No model SHALL find, make, prove or offer a node, and none SHALL run in the gate. A node the creator makes is
  named by code, and the person may type over it. *("is all this really necessary"; rule C27)*

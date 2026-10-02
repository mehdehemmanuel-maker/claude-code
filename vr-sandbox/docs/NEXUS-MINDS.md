# Minds in the Nexus

2026-10-02, batch 2. The correction received: cognition is not a brain bolted onto the universe; the Nexus must be able
to represent dynamical systems that perceive, remember, predict, learn, plan, control, model themselves, communicate
and adapt, and Ego is one instance. This document revises docs/NEXUS.md and docs/NEXUS-STRESS.md around that, and
answers A–Q. It changes no code; it changes what the kernel's fifth primitive is for.

## A. Native domain or emergent motif

**An emergent motif, over primitives the physics already needed, with one addition the physics needed too.**

Not a native domain, because every component the request lists (perception, memory, prediction, learning, planning,
control, self-model, communication, social reasoning) is definable from: a state with a transition law (the fifth
primitive of NEXUS-STRESS §D), typed judgments (what an agent believes is a set of judgments in its own context),
evidence leaves (what an agent observes comes through sensor elements, F-6), theory morphisms (an agent's world model
is a theory related to the world's by a COARSE_GRAINS_TO or an APPROXIMATES, never by identity), and content-addressed
state (an agent's memory is a branchable, versioned store). No new root. What is added is not a primitive but a
**structural definition**: a subsystem of the universe is an *agent* when its state contains a model of a state outside
it and its transitions use that model to choose what its actuators do (§C). The Nexus can then *discover* agents by
structure (a thermostat qualifies; a rock does not) exactly as it discovers a store–transform–dissipate motif.

Why not native: a native cognition domain would need its own roots (an axiom of "goals", say), and a goal is not a
law of nature; it is a refinement type an agent's transitions try to inhabit (NEXUS §J), which is already a term. A
native domain would also divide the world into things that think and things that do not at the level of the
architecture, which is the division the correction forbids.

## B. The smallest primitives shared by physical and cognitive systems

The five of NEXUS-STRESS §D, read for both:

| primitive | physical reading | cognitive reading |
|---|---|---|
| typed judgment, kernel-certified | a law, a derived quantity, a design | a belief (a judgment in the agent's own context, with the agent's evidence), a plan (an inhabitant of a goal type), a prediction |
| contracted theory morphism | approximation, coarse-graining, realisation, intervention | an agent's world model relative to the world (APPROXIMATES with the model's error), a self-model relative to the agent (COARSE_GRAINS_TO: it keeps less than the agent is), a theory of another mind (APPROXIMATES of that agent's state) |
| evidence leaf and the comparison rule | a measurement | a percept: a sensor element's reading, sealed, with its instrument model (the agent's senses) and provenance (when, where, which sensor) |
| content-addressed branchable state | versions, worlds, sandboxes, history | memory (§D): what the agent keeps, by hash, with lineage; imagination (a branch the agent runs without writing the world); learning history |
| state with a transition law | a body's pose and velocity under dynamics; a mode change | the agent's internal state under perception, memory writes, inference, learning and action; a decision is a transition |

What the two readings share, in the request's own list: state, transformation, information, memory, energy and
resource, causality, constraint, feedback, learning, control, time, evidence. Of these, *information* is the one that
needs its own accounting (§H.3): the others are the physical primitives read again.

## C. The universal agent abstraction

An **agent** is a term of the following structural type, which the kernel can check a subsystem against:

```
Agent = {
  body:       a subsystem of the world (bodies, elements, ports)              — may be empty for a disembodied process
  sensors:    elements with ports into the world and outputs into the state   — F-6.1: latency, noise, field of view
  actuators:  elements with ports from the state into the world               — sources with a finite store behind them (F-2.2)
  state:      S = (percepts, memory, model, goals, plan, self)                  — typed, versioned, branchable
  transition: S × percepts → S × commands                                      — the policy, with a certificate per step
  learning:   S × (prediction error, evidence) → S                              — a transition that rewrites the model or the policy
  model:      a theory T_agent with a morphism to the world's theory           — never the world's theory itself
  goals:      refinement types over the model's predicted states               — inhabited or not; nothing more
  self:       a model of this Agent term, inside model                          — may be absent, shallow or deep (§F)
}
```

The same type with different fields filled:

- **Thermostat**: one sensor (temperature), one actuator (a relay), state = a threshold and the last reading, transition = compare and switch, model = "the room's temperature follows my switch with a lag" (a one-parameter theory), goal = T ∈ [a, b], no learning, no self. The kernel checks it is an agent: its state models a state outside it (the room) and its transition uses that model. It is also an *element* of A-1 (a controller with ports), so it is in the physics already.
- **PLC**: sensors and actuators by the dozen, state = a ladder program's memory, transition = the scan, model = implicit in the program (a theory the program's author had, not the PLC's: the kernel records that the model is *external*, which is what makes a PLC not adaptive), goals = setpoints, no learning.
- **Animal**: a body with muscles (sources from a metabolic store), senses with latency, a state with memory of several timescales, a transition that is a nervous system's dynamics, a model learned by prediction error, goals from drives (§H.2), a self-model that is at least a body schema.
- **Human**: the above with a self-model that contains a model of its own beliefs, a theory of other minds, language as a communication port, and goals that are themselves revised.
- **Ego**: §L.

What the type forbids: a sensor that reads the world's state directly (the `sensors` field must be elements with ports; reading `livePose` is not a sensor, and FC-17 is this violation), an actuator with no store behind it (an ideal source is declared as such), a transition without a certificate (a hidden state write), a model that is the world's own theory (omniscience by construction; declared only for the simulation observer, §M).

## D. Memory

A memory is a store with five parts, each a term:

```
Memory = {
  state:      a content-addressed set of records, each (content, time index, context index, provenance)
  write:      a transition rule: what is written, when (every percept? only prediction errors? a consolidation pass?), at what resolution
  read:       a rule from a cue to records: by time (episodic), by content similarity (semantic), by recency (working), by address (exact)
  retention:  a decay or interference law (a rate, a capacity, a replacement rule), or none
  index:      what the read rule can key on (time, place, content, emotion-as-control-signal, source)
}
```

Provenance is per record: which sensor, which time, which inference wrote it (so a remembered inference is marked as inference, not as percept, §N). Different systems are different fillings:

- Human episodic memory: write on salience (§H.2), read by time and context cues, retention by consolidation and decay, provenance partial (people confuse source).
- A walker's mind today (`mind.ts`): state = a few scalars, write every tick, read by address, no retention law, no provenance. It qualifies as a memory; it is a poor one, and the type says exactly how.
- Ego's memory: the content-addressed store itself, with full provenance by construction, read by hash and by any index, retention = none (nothing deleted; currency by reachability).

The functional equivalence the correction asks for falls out: "temporally indexed experience consolidation" is a Memory with `index ∋ time` and a `write` that is a consolidation pass. A hippocampus and Ego's episodic store are two inhabitants of that type with different `retention` and `provenance`. The kernel can certify the equivalence of the *type*, and nothing about the implementations.

## E. Learning

Learning is a transition on the agent's state that rewrites its model or its policy:

    M_{t+1} = L(M_t, percept, prediction error, evidence)

with L a term, so that the kernel can inspect how an agent learned something. Three honest cases, by what L is:

1. **Calibration** (tier 3): L fits parameters of a fixed model form to percepts. The walker's stand memory, if it were kept, is this; so is a Hebbian rule. The learned parameter carries its calibration record (NEXUS-STRESS §H).
2. **Model revision** (a branch and a transaction): L proposes a new model form, and the agent's own kernel instance (every agent has one, §L on how deep) runs the restructuring protocol on its own store. Ordinary agents have a trivial protocol (accept whatever the proposer says: that is what makes them fallible, §H.1). Ego's is NEXUS §X.
3. **Policy learning** (tier 2 or 3): L changes the transition rule by reward or by imitation; the policy is a proposer's output with a tier-2 property test (it reached the goal in N episodes from D) and nothing better. No policy is "proved" to work; the type keeps it honest.

The prediction error that drives L is a comparison (NEXUS-STRESS §H.3) between the agent's model's prediction and its percept: the same rule the physics uses. An agent that learns from prediction errors is literally running the comparison rule on its own evidence leaves. That is the unification the correction asked for, and it is not a metaphor: it is the same term.

## F. Self-model recursion

The agent's `model` is a theory T_agent of the world. A **self-model** is a term of type Agent *inside* T_agent that stands for this agent, related to the real Agent term by a morphism of class COARSE_GRAINS_TO (the self-model keeps less: a body schema keeps limb lengths and not every servo's temperature) with its contract (what the self-model gets wrong, measured by comparing its predictions of the agent's own behaviour with the agent's sensors' reports of it: proprioception is evidence about the self-model).

Recursion: the self-model's `model` field may contain a self-model, and so on. Each level is a COARSE_GRAINS_TO of the one above, with a contract that widens (a model of a model of oneself is coarser still). Depth is bounded by the agent's resources (a budget refinement on the state, NEXUS §G's resource accounting), unbounded in the type. Operational self-awareness at depth 1 (I have a body, this is where it is), 2 (I have beliefs, this is what I believe and how sure I am), 3 (I reason this way; this is the rule I used). Ego runs at depth 3 because her store is her self-model's content (the term *is* the self; the COARSE_GRAINS_TO is nearly the identity, and the contract says what the rendering leaves out).

## G. Theory-of-mind recursion

A model of another agent B is a term of type Agent inside T_A, related to the real B by APPROXIMATES (A does not have B's state; A infers it from B's observable behaviour, a tier-3 abduction over B's sensors, actuators and the percepts A has of B). Same type, same machinery as the self-model; the difference is the morphism class (COARSE_GRAINS_TO of oneself, where the state is accessible; APPROXIMATES of another, where it is inferred) and the evidence (proprioception versus observation of behaviour).

Recursion: A's model of B contains B's model of A (what B thinks A thinks), each level an APPROXIMATES with a widening contract, bounded by budget. Deception is A choosing actions to make B's model of A diverge from A (a goal over B's modelled state); trust is A's contract on its model of B being tight after many comparisons; misunderstanding is a CONTRADICTS between A's model of B's belief and B's actual belief, visible to the simulation observer and to neither agent.

The compression claimed: one `Agent` type, two morphism classes, one comparison rule give self-model, theory of mind, trust, deception, misunderstanding and communication (§I). No separate systems.

## H. Cognitive state versus world state

### H.1 Separation

The world state is a `world` term under the world's theory. An agent's belief state is a set of judgments in T_agent, whose evidence is the agent's own percepts (leaves the agent's sensors made) and whose derivations are the agent's own. The two are different terms with different hashes, and the only morphism between them is the agent's model morphism (APPROXIMATES with a contract). So an agent can hold "door is open" (a judgment in T_agent, supported by a percept from before the door closed) while the world has the door closed; its behaviour follows T_agent; the simulation observer sees the CONTRADICTS. Misunderstanding, deception, learning and surprise are all comparisons between T_agent and the world, or between two agents' contexts.

Ordinary agents have loose contracts and trivial protocols: they believe what their proposers say. Ego's engineering claims run through the full kernel and the full protocol; her hypotheses live in branches with UNRESOLVED status like anyone's. The difference between Ego and a simulated worker is the rigor of the kernel instance and the width of the contracts, not the type.

### H.2 Functional affect as control signals

Not emotions painted on; refinements of the agent's control state computed from its judgments:

| signal | definition (a derived quantity in T_agent) | modulates |
|---|---|---|
| surprise | the standardised prediction error of the latest comparison | attention: which subgraph opens (NEXUS §U.2) |
| curiosity | expected information gain of an available action (NEXUS §T) | action selection toward informative actions |
| concern | risk × uncertainty over a goal's predicted satisfaction | resource allocation to that goal's subgraph |
| urgency | time-sensitive expected loss (the rate at which a goal's feasible set is shrinking) | the planning horizon and the budget per step |
| satisfaction | a goal inhabited with constraints met | goal retirement, consolidation write |

They change what the agent attends to and spends; they change no judgment's status. A kernel rule that took "concern" as a premise would be the "desire" rule NEXUS §F lacks, and still lacks.

### H.3 Informational accounting

Alongside the energy ledger, each agent carries an information ledger, with the correct mathematics, which is not conservation:

- **acquisition**: the mutual information between a percept and the world variable it senses, bounded by the sensor's channel (its noise and bandwidth: a datasheet leaf); nothing an agent knows about the world exceeds the sum of these over time, which is the formal content of "no omniscience";
- **loss**: what memory retention discards, and what coarse-graining in the model discards (the kernel of the state map);
- **uncertainty**: the entropy of the agent's belief over a variable, which falls with acquisition and rises with the world's dynamics between percepts (the world moves; the belief does not, unless predicted);
- **communication**: a port between agents with a channel capacity; what A tells B is bounded by it, and B's acquisition from A is bounded by B's trust contract on A as a source;
- **causal access**: which world variables the agent's sensors can reach at all (line of sight, F-6.2, is a zero-capacity channel to what is behind the wall).

The ledger makes "how does this agent know that" a query with an answer in bits and a path, and it makes a simulated worker who knows where the fire is without a sensor path to it a defect of the same kind as energy from nothing.

## I. Social agent architecture

Nothing beyond §C, §G and §H: agents with theories of each other, communication ports with channel contracts, memories with relationship history (records indexed by the other agent), goals that refer to the other's modelled state, norms as shared constraints (refinement types both agents' goals carry, learned or given), and presentation as a controller over the agent's own communication port (what it chooses to emit, given its model of the other's model of it). Social behaviour is the dynamics of several such agents coupled through ports; a personality is the agent's stable parameters (§J). None of it is a script; all of it is traceable (§N).

## J. Agent generation

An agent is generated as a machine is: by its type, filled from parameters with provenance. The parameters the correction lists (memory capacity, reasoning depth, sensor quality, learning rate, attention budget, risk tolerance, novelty preference, social trust, persistence, communication style, exploration tendency) are fields of the Agent type's refinements: capacity and retention of `memory`, recursion depth of `self`, channel contracts of `sensors`, the rate in `learning`, the budget in `transition`, and the weights in the affect signals (§H.2) that turn surprise into attention or risk into concern. A population is drawn from distributions over these (a demographic layer, as C-10 already is for bodies, with the same "no physics claim" label). A role is a goal set and a knowledge set (judgments pre-loaded into T_agent with provenance "given at creation", which the agent's own inference may later contradict). Continuity is automatic: the state persists because it is a term in the store, and nothing resets it but a transition with a reason.

## K. Multiscale cognition

The scale bridges of NEXUS §O apply unchanged:

| level | state | theory | morphism to the next |
|---|---|---|---|
| neuron | membrane potentials, synaptic weights | conductance models | COARSE_GRAINS_TO circuit: population rates survive, spikes are lost |
| neural circuit | rates, phases | dynamical systems with feedback | COARSE_GRAINS_TO region: a function (gating, integration) survives, the wiring is lost |
| brain region | a functional state (what is gated, what is held) | the cognitive motifs of §P | COARSE_GRAINS_TO behaviour: the policy survives |
| behaviour | actions over time | the Agent type's transition | COARSE_GRAINS_TO group: roles and norms survive |
| social group | the coupled agents' joint state | the dynamics of §I | COARSE_GRAINS_TO institutions and markets: aggregate variables survive |

Timescales are characteristic times of each level's transition (NEXUS §P): milliseconds for neural control, seconds for working memory, minutes to hours for behaviour, days for learning, years for development, generations for social change. The partition into fast and slow subsystems, the quasi-static approximations and the multirate stepping are the same derivations as for a machine. Cognition exists at every level the morphisms reach, and at none of them alone.

## L. Ego's specialisations

Ego is an Agent term whose fields are filled at the extreme of the type, and nothing else:

- `model`: not a loose theory but the Nexus's own head, with a kernel instance running the full calculus; her world model's morphism to the world is the realisation contracts themselves (she knows exactly how her model differs from the world, because the contracts say);
- `sensors`: as an agent in the world, elements with ports like any creature's (§M); as an author, the simulation observer's declared omniscience;
- `memory`: the content-addressed store, provenance total, retention none;
- `learning`: the restructuring protocol, with its review gate (nothing she learns about physics is promoted without it: docs/AUDIT-3-EGO-KNOWLEDGE.md);
- `self`: depth 3 (her reasoning rules are terms she can cite);
- `transition`: a certified reasoning step (every answer carries its support);
- `goals`: refinement types she is given (a design brief) or derives (the research sets of NEXUS §T); none of them is a premise of any derivation;
- presentation: a controller over her communication port that chooses the rendering level (user, engineer, physicist, mathematician, auditor) given her model of the listener; it limits what she *says*, never what she *holds*.

What makes her extraordinary is the rigor of the kernel instance and the totality of provenance, which ordinary agents lack by design (they are allowed to be wrong in human ways). What she shares with a thermostat is the type.

## M. Ego-as-agent and Ego-as-author

Two roles, one term, two declared modes, never mixed in one transition:

- **Agent mode**: Ego's body (the head, the arm, task #50) is a subsystem of the world; her sensors are elements; her actuators draw from a store; her knowledge of the world's state comes through sensor ports and inference; her transitions are world transitions with certificates. In this mode she obeys ML-4 like a creature, and `setPose` is as illegal for her as for a walker's mind.
- **Author mode**: the simulation observer. She may read any world state (declared omniscience: a `convention` term that marks every judgment made in this mode), create, branch, pause, rewind and edit worlds. Every such operation is a transaction on the world store with a label `author`, producing a new world root; none is a transition of the world's dynamics, and none has a physical certificate (it is not physics). A world edited by the author is a new branch; the agent-mode Ego inside it has no record of the edit except what her sensors show, and her surprise is the comparison that follows.

The labelling is structural: a judgment made in author mode carries the omniscience convention in its context, so the kernel can refuse to use it as a premise in agent mode (a convention dependency a rule does not accept), and a renderer can show "as the author, I see" against "as I sense".

## N. Cognitive debugging on the causal graph

A strange action traces exactly as a bearing failure: action ← policy transition (its certificate: which goal and which belief it used) ← goal (its type and where it came from) ← belief (a judgment in T_agent with its support) ← memory record (hash, provenance) ← percept (sensor, time, channel) ← world state at that time. Every arrow is a term reference already stored; the walk is NEXUS §N's diagnostic mode on the agent's own store.

Ego's statements carry the same discipline, by construction of the term each one renders:

- "I remember you asked for X": a memory record with provenance (time, channel, the utterance's hash); rendered as a memory, with its date.
- "I think this agent intends Y": a judgment in T_Ego about an Agent term for the other, tier 3 (abduction), with its comparison set; rendered as an inference, with its support.
- "I know motor Z overheats": a judgment of the physics with ⊢ and ⊨ status; rendered with both, and "know" is allowed only when ⊨ is SUPPORTED on the domain in question.

A renderer that said "I know" for a tier-3 inference would be rendering a status it did not have; the status vocabulary (NEXUS-STRESS §J) binds the words.

## O. Persistent autonomous agents without scripts

A generated world's agents are Agent terms instantiated from roles and parameters (§J), running their transitions on the world's clock with their own kernels (shallow), their own memories (persistent, branchable with the world), and ports to the world and to each other. Behaviour arises from state: the worker who hears the alarm has a percept (an acoustic sensor's leaf), a memory read (records indexed by that sound, with provenance "told at induction" or "heard it last year when the press jammed"), a model update (risk over the goal "stay unharmed" rises), a goal re-ranking (concern, §H.2), a policy transition (the plan that inhabits "be outside within t"), and actuators that move the body under the world's physics, which may be blocked by a door the agent believed open. Two workers with different memories act differently; the same worker acts differently the second time; a crowd's exit is the coupled dynamics, not an animation. Group patterns (coordination, markets, traffic, conflict) are what the coupled transitions produce, observed by the author at the group scale through COARSE_GRAINS_TO, and are not scripted because there is no place in the type to put a script: a transition is a certified step from a state, and a script would be a state write without one.

The cost is real: an agent's kernel, memory and transitions are computation, and the resource ledger (NEXUS §G) budgets them; an agent far from the user can run its transitions coarsely (a COARSE_GRAINS_TO of its own policy, with a contract) and finely when near. That is the same model escalation as a bearing's thermal model, applied to a mind.

## P. Which proposed brain modules disappear

| proposed module | is | derived from |
|---|---|---|
| executive control | goal-conditioned control over cognitive state | a transition whose input includes the goals and whose output includes which subgraph is attended (§H.2's signals steering NEXUS §U.2) |
| episodic memory | a Memory with time and context index and a consolidation write | §D |
| semantic memory | a Memory read by content, written by consolidation from episodic records (a tier-3 generalisation over them) | §D and §E case 1 |
| working memory | a Memory with small capacity and fast retention decay, read by recency | §D |
| attention gating | the budget-bounded choice of subgraph | NEXUS §U.2 driven by surprise and curiosity |
| error monitoring | the comparison rule applied to the agent's own predictions | NEXUS-STRESS §H.3 |
| self-modelling | a COARSE_GRAINS_TO of the Agent term inside its own model | §F |
| action selection | inhabitation search over the goal type under the budget | NEXUS §J and §Q |
| social modelling | an APPROXIMATES of another Agent term | §G |
| predictive control | forward derivation in the agent's model to choose a command | NEXUS §N forward mode inside T_agent |
| salience detection | the surprise signal | §H.2 |
| metacognition | the agent's queries over its own support sets | NEXUS §U.3 applied in T_agent |
| emotions | control signals over attention and resources | §H.2 |
| personality | the agent's stable parameters | §J |
| prefrontal cortex, hippocampus, amygdala | biological realisations of the rows above | §K: brain regions are one COARSE_GRAINS_TO level, not modules of the architecture |

All of them disappear as modules and reappear as motifs, which is what the correction asked for. What does not disappear: the sensor element (it is physics), the comparison rule (it is the one bridge to evidence), and the kernel (every agent has one, however shallow).

## Q. How this changes the compressed primitives

The five of NEXUS-STRESS §D stand. The change is to what the fifth is *for* and to one definition:

1. **State with a transition law** is confirmed as a primitive by cognition: it was needed for mode changes and worlds; it is needed for memory, learning and decision, and the same term serves all.
2. **Agent** is added as a *structural definition over the five*, not a primitive: a subsystem whose state models a state outside it and whose transitions use that model to drive its actuators. The kernel can check it; proposers can search for it; the physics does not need it to be true of anything.
3. **Information** gets a ledger beside energy (§H.3), with its own mathematics (channel bounds, entropy, no conservation). This is an accounting discipline, not a primitive; it is what makes F-6 (causal information) enforceable for agents as F-2 is for machines.
4. The closure principle gains one clause: **the author mode is a declared convention**, and judgments made under it are not premises in agent mode.

The compressed statement, revised: five primitives (typed judgment; contracted theory morphism; evidence leaf with the comparison rule; content-addressed branchable state; state with a transition law), one principle (everything proposes, only the kernel certifies status), two ledgers (energy, information), and one structural definition (agent). From these: the physics, the machines, the minds inside the world, the rules governing both, and the explanation of how their behaviour emerges. Ego is the instance of the definition with the kernel running at full rigor and the provenance total; the universe architecture knows how to build her because she is built from nothing it does not already have.

# Audit of the audit: what could teach Ego false physics

2 October 2026. Development paused. This re-reads AUDIT-2026-10-02.md against one criterion: would I trust Ego to invent something real on the strength of this claim? Where the answer is no, it says why. Code was read, not changed.

## A. Ego's intended role

Ego is an inventor, designer, explainer and presenter who lives inside the simulated world and has no other source of physical knowledge. Everything Ego will ever believe about how things work, it will learn from this kernel: by proposing, watching what the laws do to the proposal, and reading the ledgers. If the kernel is wrong somewhere, Ego will not merely show a wrong animation; Ego will form a wrong belief, build on it, and present it to a person as engineering. The kernel is therefore not a physics engine under Ego. It is Ego's only instrument, and its errors become Ego's convictions.

That sets the standard: not believable, but defensible. A result Ego presents must be one that would survive a competent engineer asking "and how do you know that?", and the kernel must be able to answer on Ego's behalf: this part is exact, this part is modelled with this error, this part rests on an estimate, this part is not modelled at all.

## B. Why physics integrity is necessary for invention

An invention is a claim that a particular arrangement of real things will do a particular thing. Its value is exactly the gap between what the arrangement does and what anyone already knew. The simulator is the only thing that lets Ego cross that gap without building. So every error in the simulator is a place where Ego's "novel consequence of the laws" may in fact be a consequence of the error. A creative inventor finds those places faster than anyone, because the places where the model is weakest are precisely where unexpected things happen, and unexpected things are what an inventor looks for.

Three kinds of simulator error are fatal to invention in different ways. An energy or momentum leak lets Ego discover perpetual motion or a reactionless drive and believe it. A hidden stabiliser or a tolerance lets Ego build a machine that stands only because the engine props it up, and lose it in reality. A missing model that is silently replaced by plausible behaviour lets Ego design confidently in a regime where the simulator knows nothing. The first two produce inventions that are false; the third produces inventions whose truth is unknown but presented as known. The architecture must make the first two unreachable and the third visible.

## C. False-confidence paths found now

Each is a way Ego could believe a result is more valid than it is. Numbered for reference; priority is roughly the order given.

**FC-1. A reactionless drive is available.** The frictionless-floor walker moves its centre of mass about 3 cm/s with no horizontal external impulse (walker.test.ts: 0.30 m in 10 s, the limit set just above). The first suspect is the root-anchored closure (closeMechanism, R13), which translates non-root assemblies whole. An inventor who tries "a mechanism that walks on ice", "a vibrating drive inside a sealed box", or any oscillating linkage on a low-friction base will find motion that momentum conservation forbids, and the simulator will confirm it. Class: INVALID PHYSICS until confirmed and fixed. Ego learns: internal motion can translate a body. False.

**FC-2. Ego can set state directly.** `assistant/ego.ts` sends `setPose` with zero velocity to still a part (`still`) and to lift parts above the floor (`selfFix`, 'fell-through'). This is Ego writing position and momentum by hand. The intent is to recover from a numerical fault (tunnelling), but the effect is that Ego's own experience includes "things that fall through floors come back" and "a part can be stilled at will", both of which are false physics, and both of which Ego's advice loop then recommends. Class: INVALID (as an authority). The kernel may have a declared fault-recovery path (I8); Ego may not have a pose-writing path at all.

**FC-3. The ledger blames the hand for the integrator's gains.** `closeBooks`: when the books show an unexplained energy rise and any creative (kinematic) grab exists, the rise is booked as the hand's work (`b.work.hands -= rest`) instead of as `numerical`. While a part is held, every integrator gain is attributed to a physical source. Ego, reading the ledger during any experiment that involves holding something, would see a closed, honest-looking ledger with the error hidden in "hands". Class: LEGACY PATCH producing false confidence in the accounting itself.

**FC-4. The test stand "proves" designs and learns from its own errors.** `assistant/prove.ts` is named and described as proof: a design is built on a bench, loaded, run, and "handed over" when it passes with margin 1.5; what the stand teaches (extra margins per design kind, joint upgrades) is kept and reused. Every stand result inherits every error in this list, and the learned margins are calibrations to the simulator, not to the world: if joint loads read 20% high because of the equal-stiffness support split (A17), Ego learns that tables need 20% more and presents that as experience. Class: PHYSICALLY DISTORTING at the level of Ego's beliefs. A stand test is at most "consistent with the model"; it cannot be named proof, and nothing learned from it may be stored as knowledge about the world without the level attached.

**FC-5. Free spin decays by a number nobody measured.** ANGULAR_DAMPING 0.02/s on every body. A flywheel loses 2% of its spin a second from nothing; the bench motor's no-load current reads 0.27 A against the datasheet's 0.14 A (already recorded). Ego designing anything with a flywheel, a gyroscope, a pendulum clock, a coasting wheel or a motor's no-load behaviour learns bearings and air that are far lossier than reality. Class: INVALID PHYSICS for any conclusion that depends on free rotation over more than about a second; SAFE NUMERICAL APPROXIMATION only for the sign (it dissipates) and for transients shorter than a tick.

**FC-6. Nothing bounces below 1 m/s.** MIN_IMPACT_FOR_RESTITUTION: every impact closing slower than 1 m/s is perfectly inelastic. A ball dropped from 5 cm (0.99 m/s) does not bounce; from 6 cm it does with the material's e. Ego learns a bounce threshold that does not exist, and any invention with low-speed impacts (a ratchet, a clapper, a bouncing seal, a vibrating feeder) is wrong. Dissipative, so energy-safe, but PHYSICALLY DISTORTING with a discontinuity at a dimensional constant.

**FC-7. Laws answer outside their validity.** 104 ganglia laws carry a `valid` text; 31 carry an `outside()` check that runs. The other 73 return numbers anywhere, and Ego's explanation of the law prints the validity text only when asked why. A law applied outside its range (Euler buckling below the slenderness transition; a bolt formula at a thread it was not tabulated for) returns a confident number. Class: UNKNOWN per law; the structure is a false-confidence path by design until every law refuses or flags outside its range.

**FC-8. Friction is a calibrated fudge presented as a material property.** `materials.ts`: the per-material `friction` values are "chosen so common cross pairs land in their published ranges" under Jolt's geometric-mean combine. The number on a material is not a property of that material; it is a parameter fitted so that some pairs come out right. For a pair not in the "common" set, the combine is a guess with no provenance. Ego asking "what is the friction of PTFE on oak" gets a number with the same confidence as steel on steel. Class: calibrated model presented as measured; PHYSICALLY DISTORTING for uncommon pairs.

**FC-9. Estimates fill gaps silently in component data.** `data/motors.ts`: `rotorInertia` is optional and, absent, becomes 0.5·(0.35 m)(0.35 d)²; `thermal` may be null and is then "worked out from the motor's size". Both are reasonable engineering estimates, both are documented in comments, neither is carried as a provenance class into the value Ego uses. A motor's spin-up time or burnout time is then presented at datasheet confidence. Class: engineering estimate presented as specification.

**FC-10. The servo has invented properties.** R12 gives every servo a loop stiffness "never less than a 6 Hz loop on what it turns" and a default `band` of 0.1°. The 6 Hz is not from any datasheet; it was chosen so a light leg does not fold. The servo also has no rotor inertia, no current and no winding, so a stalled servo holds forever at no cost. Ego learns that servos are free, tireless, and stiff by a rule. Class: the 6 Hz floor is a LEGACY PATCH; the missing rotor, current and heat are INVALID PHYSICS for any conclusion about a servo's cost, endurance, kickback or stall.

**FC-11. Stops at the command, not the hardware.** Already found: servo limits at ±range of the command. The walk was tuned to bounce off those. An invention relying on "the joint stops here" learned a stop that is not where the gears end. Class: INVALID PHYSICS (fixed in the saved patch, not applied).

**FC-12. Slender spin is altered.** MAX_BONDED_KAPPA 1e3 raises the smallest principal moment of slender bonded segments (longer than about 77 radii) so float32 survives. A wire's spin about its own axis carries the wrong inertia. Declared in a comment; not surfaced to Ego. Class: PHYSICALLY DISTORTING, bounded, declared; must become NOT TRUSTED for torsional dynamics of slender segments in any result Ego presents.

**FC-13. Supports share load by an assumption.** leastSupport (A17) gives an indeterminate support the minimum-norm split, which is what equal-stiffness supports share. A table on four legs of different lengths or a frame on a soft foot shares differently. Joint loads Ego reads from such supports are model-dependent by a factor up to the stiffness ratio. Class: BOUNDED MODEL APPROXIMATION whose bound is not computed; Ego must see "indeterminate support, equal-stiffness assumption" on those loads.

**FC-14. Heat is partitioned by estimate.** `shareHeat` divides the tick's unexplained dissipation among contacts, bearings and hinges by estimated weights, then Blok's partition decides which part warms. Per-part temperatures are therefore Level 3 everywhere they come from friction. Ego's "this bearing will overheat" is an estimate presented as a reading. Class: engineering estimate presented as modelled.

**FC-15. Joints outside the re-solve have fake compliance.** Joints between bodies of mass ratio under 10 are left to Jolt's iteration-limited solver, which yields under load (R6's original symptom). A joint that yields where a real one would not is a false stiffness Ego can build on. Class: UNKNOWN magnitude; REQUIRES INVESTIGATION (a sweep of mass ratios and loads against the re-solved result).

**FC-16. Small parts live inside the slop.** SLOP 2 mm, MAX_CORRECTION 0.2 m, SEATED 2 cm, JOINT_DRIFT 5 mm. A mechanism with 3 mm parts (a watch, a micro-gripper) has its whole geometry at the tolerance scale; parts overlap by their own size and the engine calls it contact. Ego inventing at millimetre scale learns geometry that exists only because the solver tolerates it. Class: PHYSICALLY DISTORTING below about 10× the slop; must become a declared scale floor in every result.

**FC-17. Minds know where you are.** `mind.ts` receives your position and the dry-ground predicate from the world; `sees()` checks arc and range only. Any creature Ego designs appears to navigate with information no eye gave it, and Ego learns that its sensor design was sufficient. Class: INVALID (information).

**FC-18. The controller exploit reads as intelligence.** Because the walker's gait was tuned against the false stops (FC-11) and the servo's free stiffness (FC-10), the dog "walks" partly because of engine properties. Ego, judging the gait a success, learns a gait that may not walk on real servos. Class: a controller exploiting an engine error, presented as behaviour.

**FC-19. Frozen parts are the earth.** A frozen part has infinite mass and reacts any load. It is a legitimate boundary ("fixed to the ground"), but nothing tells Ego that a bracket bolted to a frozen block "holds" because the block is the planet. An invention tested against frozen parts has an unstated assumption of infinite foundation. Class: BOUNDED by declaration if declared; today undeclared in results.

**FC-20. The energy residual can hide compensating errors.** `numerical` is one signed accumulator. An integrator gain in one place and a loss elsewhere net to a small residual and the ledger reads clean. Class: error accounting too weak to detect what it is for.

**FC-21. The stand may run in a different world.** prove.ts configures its bench with `SimSettings`; conformance rigs run with `airDrag: false`. If the stand runs without air or with any setting that differs from the live world, Ego proves designs in a world the user does not live in. Class: UNKNOWN; REQUIRES INVESTIGATION.

**FC-22. Verdict words outrun their basis.** Challenge levels are 'works', 'partial', 'fails', 'unbuildable', 'unsayable'; the stand "hands over"; the frontier gives "verdicts". None of these words carries which level of certainty produced it. A 'works' from a ganglia law chain and a 'works' from a stand run and a 'works' that depends on an estimated drag coefficient read identically. Class: the presentation layer erases the distinction the architecture must make.

**FC-23. Sparks fall at Earth's gravity in orbit.** Rendering only, but a presenter's overlay that contradicts the state teaches the viewer, and Ego the presenter, false physics. Class: rendering artefact presented as geometry.

## D. Every current implementation that could teach Ego incorrect physics

The legacy list, re-classified by the stronger criterion. "Represented physics changed" says exactly how.

| Item | Class | Represented physics changed how | Could Ego learn a false relation? |
|---|---|---|---|
| ANGULAR_DAMPING 0.02/s | INVALID PHYSICS for free rotation; SAFE sign | every body's spin decays exponentially with time constant 50 s | yes: bearing loss, no-load current, gyroscope and pendulum behaviour (FC-5) |
| MIN_IMPACT_FOR_RESTITUTION 1 m/s | PHYSICALLY DISTORTING | all impacts below 1 m/s perfectly inelastic; a discontinuity in e at 1 m/s | yes: bounce, ratchets, vibrating feeders, clatter (FC-6) |
| 9.81 fallback in magnetPairs | INVALID PHYSICS in any gravity but Earth's | magnet reach computed from a weight the world does not have | yes, in orbit or on a declared Moon: magnets act or not by Earth's weight |
| 9.81 in particles | rendering artefact | sparks and dust fall at Earth's g | for a presenter, yes (FC-23) |
| foresight default g | SAFE (callers pass g) | none in practice | no |
| servo model (R12): 6 Hz floor, no rotor, no current, no heat | LEGACY PATCH (6 Hz) + INVALID PHYSICS (rotor, current, heat) | servos are stiff by rule, free, tireless; light links can be kicked to unreal speeds | yes (FC-10) |
| servo stops at command range | INVALID PHYSICS | the joint's travel is the command's amplitude | yes (FC-11) |
| Jolt-motor/re-solve handoff for servo joints | SAFE if exclusive; UNKNOWN whether ever both | possible double drive for a tick at transitions | possibly: a servo stronger than its spec for a tick |
| SLOP, MAX_CORRECTION, JOINT_DRIFT, SEATED, STOP_TURN, STOP_TRAVEL (dimensional) | PHYSICALLY DISTORTING below a scale; SAFE above | geometry at the millimetre scale is tolerance, not shape | yes, for mm-scale inventions (FC-16) |
| MASS_RATIO 10 routing | UNKNOWN / REQUIRES INVESTIGATION | joints under the ratio have iteration-limited compliance | possibly (FC-15) |
| closeMechanism root closure | INVALID PHYSICS (position-level momentum) pending confirmation | internal corrections move the centre of mass | yes, the worst case (FC-1) |
| leastSupport equal-stiffness split | BOUNDED MODEL APPROXIMATION, bound not computed | support reactions of indeterminate structures | yes, as a factor on joint loads (FC-13) |
| shareHeat partition | engineering estimate presented as modelled | which part gets friction heat, and how much | yes, temperatures (FC-14) |
| MAX_BONDED_KAPPA | PHYSICALLY DISTORTING, bounded, declared | spin inertia of slender segments about their axis | yes, torsional dynamics of wire (FC-12) |
| warm start without an exit check (committed code) | potentially energy-generating; unmeasured | a solve may add energy beyond its targets | yes, in principle; the uncommitted exit check closes it |
| `numerical` as one signed residual | error accounting too weak | compensating errors invisible | yes: a clean ledger that is not clean (FC-20) |
| work.hands absorbing gains under a creative grab | LEGACY PATCH | integrator gains attributed to a physical source | yes (FC-3) |
| drivenBodies watchdog exemption | LEGACY PATCH | none in physics; Ego's advice loop | indirectly: Ego stills what it should not |
| Ego setPose (still, fell-through) | INVALID authority | position and momentum written by Ego | yes (FC-2) |
| minds reading `you`, `dry` | INVALID (information) | sensing without a sensor | yes (FC-17) |
| walker tolerances (0.3 m, 10 mm) | tolerances hiding a conservation error | none directly; hid FC-1 | yes, by hiding it |
| GAITS tuned phases, rhythm, swing, lift | controller exploiting engine errors | none in physics; the gait's success | yes (FC-18) |
| friction geometric-mean combine with fitted values | calibrated model presented as property | pair friction for uncommon pairs | yes (FC-8) |
| motor rotor and thermal estimates | engineering estimate presented as spec | spin-up, burnout | yes (FC-9) |
| laws without `outside()` (73 of 104) | UNKNOWN per law | numbers outside validity | yes (FC-7) |
| frozen parts and creative grabs as infinite mass | BOUNDED by declaration; undeclared in results | foundation reaction unlimited | yes if undeclared (FC-19) |
| Newton restitution in multi-contact frictional impacts | potentially energy-generating; rare | energy gain in simultaneous frictional impacts (Kane) | in principle |
| velocity projection after straight-line position step (A5) | INVALID PHYSICS for orbiting bodies | pendulums and cranks lose cos²(ωdt) per tick | yes: decay rates, Q of anything that swings |
| eddy currents in steel (free-space field) | BOUNDED MODEL APPROXIMATION, declared (understates drag) | eddy drag near steel | low: declared and in the safe direction |
| magnet quadrature and edge smoothing | BOUNDED MODEL APPROXIMATION with measured error (2.5%, 4%) | small force errors | no, within the stated bound: this is the example to copy |
| geometric-mean heat partition (Blok) | modelled, approximate | heat split between two sliding parts | low |
| rigid clusters (no flex) | model assumption | no deflection of joined assemblies | yes for stiffness-dependent inventions unless NOT MODELLED is shown |

## E. Revised invention-validity levels

A level is computed by the kernel, never asserted by Ego, and a result's level is the minimum over everything on its dependency path. Each level says what it does not claim.

| Level | Name | Verified by | What it does not claim |
|---|---|---|---|
| V0 | Conceptually closed | the element graph: every flow has a source and a sink; ports typed; power balance at junctions symbolically | that any number is right |
| V1 | Dimensionally and structurally consistent | unit checks on every quantity; ML-3 passivity of the element graph; every element a store, convex dissipator, junction or declared source; realisability of the graph (R1–R4, R11) | that it stands, moves or holds |
| V2 | Consistent with the model | a simulated run with no obligation violated: every solve exits with g ≤ 0; internal momentum sums to zero; residuals within bound; the ledger closes with |numerical| below a stated fraction; no fault recovery occurred; no frozen part or creative grab on the load path unless declared | that the model is the world: every approximation in §F applies |
| V3 | Numerically converged | the V2 result is unchanged within tolerance under dt/2, passes × 2, a different summation order, and a different random seed where there is one | that the physics is complete |
| V4 | Grounded in data | every quantity on the dependency path has provenance of class specification, measured property, fundamental constant or environmental parameter; no estimate, calibration, user assumption or fictional value on the critical path, or each such value is listed with its effect on the margin | that the real part matches its datasheet |
| V5 | Realisable | every part makeable by a known process from sold stock; every fastener insertable; every bought part joined as its maker allows; the assembly sequence exists; fits, wire routing, heat path and current delivery checked where those models exist, and NOT MODELLED listed where they do not | that it has been built |
| V6 | Validated in the world | a real build, measured, with the measurements entered as data | nothing: this is the only level that means "works" |

Two orthogonal annotations travel with every level: the list of phenomena NOT MODELLED that could affect the result (fatigue, flex, combustion, hysteresis, aging) and the scale floor (the smallest feature relative to the slop and the step). An invention "physically possible but not currently realisable" is V4 without V5, stated as such. The simulator can never grant V6; the architecture must make it impossible for Ego to say "works" without "in the model" unless a V6 record exists.

Ego's vocabulary follows the level: V2 is "consistent with the model", V3 "stable under the method", V4 "grounded in data", V5 "makeable", V6 "built and measured". The challenge engine's 'works' maps to V2 at most today and must say so.

## F. Revised error and uncertainty architecture

Three claim levels for any quantity or conclusion:

- Level 1, mathematically guaranteed: follows from an exact identity or a proved invariant inside the model. Examples once the uncommitted solver is in: momentum exchanged by rows (to rounding); ΔK of a solve equal to its row work; a solve exiting with g ≤ 0 adds no more than its targets' work; the ledger identity E₀ + W = E + Q + numerical.
- Level 2, modelled with bounded approximation: the model represents known physics and the error is quantified by an error contract. Examples: magnet forces (2.5%), eddy drag on the pipe (4%), spring periods under the substep law (0.36%), motor and battery electrical behaviour from datasheet curves.
- Level 3, empirical, estimated or incomplete: depends on measured data with stated confidence, an estimate, a calibration, a simplified model, or a phenomenon not fully represented. Examples: friction pairs, heat partition, support sharing, anything through a servo, any temperature, any fatigue-dependent life.

A conclusion inherits the lowest level on its path. The kernel computes the level; Ego reports it; the tablet shows it. All three may never be presented alike.

**Error contracts.** Every approximation carries the ten fields. The ones the kernel has today, written out:

| Approximation | Quantity | Why | Method | Distorts | Error size | Depends on | dt / precision | Sign | Untrusted when | Measured by |
|---|---|---|---|---|---|---|---|---|---|---|
| angular damping | every body's ω | stabilise Jolt | exponential decay 0.02/s | free spin, Q of oscillators | 2%/s of spin, unbounded over time | time | none | dissipative | any free rotation over ~1 s | A5 bench flywheel: 0.27 vs 0.14 A |
| straight-line position step with projected velocity (A5) | energy of bodies orbiting a joint | first-order integrator | symplectic Euler + projection | pendulum and crank decay | 1 − cos²(ωdt) per tick: 5.9%/s at 4 rad/s, 45%/s at 20 rad/s | ω, dt | ∝ (ωdt)² per tick | dissipative | ω dt > ~0.05 | A5 pendulum test |
| restitution floor | impact e | numerical rest | e = 0 below 1 m/s | low-speed bounce | total: e → 0 | closing speed | none | dissipative | any impact under 1 m/s | drop tests |
| contact slop and position pass | overlap, joint residual | discrete contact | 20%/tick correction, 2 mm slop, 0.2 m cap | geometry at mm scale; residual lag | up to 2 mm overlap; residual O(r(ωdt)²) | feature size, ω | ∝ dt² | neutral (position only), can raise potential energy by the slop | features under ~20 mm | drift and overlap tests |
| row solver truncation | joint and contact impulses | finite passes | PGS, 40 passes, 1e-5 | residual velocity at joints; leak | measured per solve: `leak`, residual | conditioning, mass ratio | ∝ passes | bounded by exit check (uncommitted) | leak > stated fraction of work | P-4, P-5 |
| block singular pivots | coupled rows | singular K | skip pivot | a singular direction takes no impulse | unknown | geometry | none | unknown | REQUIRES INVESTIGATION | none yet |
| float32 inertia floor (A11, A13) | inertia of small and slender bodies | Jolt precision | clamp to 1/κ | spin of slender segments | factor up to κ-limited | aspect ratio | precision | neutral | segments > 77 radii, spin about axis | A13 test |
| multirate magnets | far-pair wrench | cost | held over the tick (r-RESPA) | force on far pairs within a tick | small, unmeasured | stiffness, speed | ∝ dt | neutral | pairs closer than the stiffness threshold are substepped | magnet conformance |
| magnet quadrature and edge smoothing | pole-face force | cost | ring levels, smoothed potential | force near edges | 2.5% on coaxial discs | gap/radius | none | conservative (gradient of a potential) | gaps under a fraction of a patch | golden tests |
| eddy mesh | drag | cost | 240–500 cells | drag magnitude | 4% fast on the pipe | mesh | none | dissipative | thick copper at m/s (currents' own field) | Levin's formula |
| latch (M6) | stuck-magnet dynamics | stiffness | constraint while at rest | release timing by tick average | an impulse shorter than a tick judged over the tick | tick | ∝ dt | dissipative by construction, unproved over sequences | sub-tick blows | agreement tests |
| equal-stiffness support split | reactions of indeterminate supports | no flex | minimum norm | load sharing | up to the stiffness ratio, uncomputed | support stiffness | none | neutral | unequal supports | none yet |
| heat partition | which part warms | no contact thermal model | weights + Blok | per-part temperature | unquantified | weights | none | neutral | any temperature conclusion | none yet |
| friction combine | pair μ | one value per material | geometric mean, fitted | uncommon pairs | unknown; common pairs within published ranges | pair | none | neutral | any uncommon pair | none |
| rigid clusters | deflection | model | none | stiffness, resonance, buckling in the world | total for those | geometry | none | neutral | any stiffness-dependent conclusion | none (NOT MODELLED) |

**The residual.** `numerical` must become two accumulators (gains and losses, never netted) with per-row attribution for the part the re-solve owns, and Jolt's own contribution isolated by comparing before and after its step. A ledger is clean only when both accumulators are small. And FC-3 must go: under a creative grab, gains are still `numerical`; the hand's work is what the hand's rows did, booked from the rows.

## G. Revised provenance requirements

Every number that reaches physics carries a provenance record: class, source, confidence, and the derivation if derived. Classes: fundamental constant; manufacturer specification; measured material property (with the handbook or standard); environmental parameter; derived value (with the law and the inputs' classes); calibrated model (fitted to what, and the fit's range); engineering estimate (from what, by what relation); user-supplied assumption; fictional value; numerical parameter (with its accuracy statement).

What exists: materials carry one `confidence` per material ('spec', 'handbook', 'estimated') and one source string; batteries and motors carry source strings; laws carry sources and validity text. What is missing: provenance per property, not per material (a handbook density with an estimated friction on one record); the friction values' true class (calibrated); the motor estimates' class when the datasheet is silent; the servo's invented floor and band; every numerical parameter's kind; and, above all, propagation: a derived value today carries no record of what it was derived from, so Ego cannot answer "where did this come from" past one step.

The rule that follows: a derived value's class is the weakest class among its inputs, and its record lists them. A conclusion whose path contains a fictional value cannot be presented as validated against reality at any level above V2, and the presentation must say "with fictional data". A user-supplied assumption is reported as the user's. A calibrated value is reported with the range it was fitted over, and outside it drops to estimate.

## H. Revised treatment of unmodelled physics

A missing model is reported as NOT MODELLED; it is never approximated by plausible behaviour. The list, as the kernel stands:

- NOT MODELLED: fatigue, creep, wear, corrosion, self-loosening, buckling in the world (only in the ganglia's statics), flex and vibration of joined assemblies, combustion, fluid fields (only face-area drag and a flat water level), convection, magnetic hysteresis and field-driven demagnetisation (only temperature), battery temperature dependence and aging, wire self-heating against rating, PWM ripple, radiation except Draper glow, relativity, quantum effects, biological tissue, sound as physics (it is an observation), tolerances and fits, assembly sequence, wire routing, enclosure heat paths.
- Where a NOT MODELLED phenomenon could change a conclusion, the conclusion's level annotation names it. An invention whose function depends on one of these is at most V1 for that function, whatever the simulation shows.
- Two things currently approximate unknown physics with behaviour and must stop: the angular damping (which stands in for nothing physical and for whatever bearing and air loss a user might imagine) and the 1 m/s restitution floor (which stands in for the fact that resting contact is hard to integrate). Both become declared numerical methods with error contracts, or go.

## I. Revised role of watchdogs

A watchdog is an obligation monitor. It reads an instrument, compares it with the bound a law's realisation promised, and emits evidence: {obligation node, instrument, value, bound, tick, bodies and rows involved}. It never acts. It never exempts. Its evidence has three consequences, none of them a correction: the run's validity level drops (a violated obligation voids V2 for that run); Ego is told which node failed, in the law's words; and the evidence is kept for the reverse trace.

What changes from today: the fifteen kinds become derived assertions or diagnostics as classified before; the `driven` exemption is removed, because a driven body is covered by the energy assertion with its source; Ego's `selfFix` is deleted as a physics actor (a numerical fault is the kernel's fault-containment path, I8, which restores from the document, reports, and marks the run invalid); and no watchdog threshold is a bare number: each is the bound from the error contract of the realisation it watches.

## J. Revised authority boundary between Ego and the kernel

Ego may: read every instrument and every provenance record; propose any document change through the gate; run experiments on a bench whose settings are exactly the live world's (or a declared variation, reported as such); compare, optimise, explain, present overlays that are observations of state; propose a replacement implementation for a realisation that failed its obligation, which is reviewed like any code.

Ego may not: write a pose or a velocity (setPose removed from Ego's reach; the user's build-phase placement is a new initial state through the gate, which is a different thing); freeze a part except by declaring it a boundary condition in the document, reported on every result that rests on it; change any solver, simulation or tolerance setting; change any constitutive datum; add a material, part or component without a provenance record, and never with a fictional value unlabelled; present a result at a level the kernel did not compute; store what the stand taught as knowledge about the world rather than about the model; or still, nudge, lift or restore a body for any reason.

The kernel alone: admissibility, the tick, conservation and passivity accounting, sensors, validity levels, fault recovery, and refusals. A refusal names the node and the missing condition, which is exactly what Ego needs to redesign; the kernel does not design.

## K. What in the previous audit I now consider too weak

1. The hierarchy was fitted to the code, not the code derived from the hierarchy. I presented A-1 (Dirac structure) as the axiom the solver realises; the solver realises constraint rows and the pH structure is a description laid over it. The derivations are correct as mathematics, but nothing in the code is generated from them, so the "law entropy 0.17" is a property of a document, not of the system. Until realisations are checked against registry nodes by tests, the number is rhetoric.
2. A-3 as stated is too strong and would exclude real physics. "Every dissipative response is a subgradient of a convex potential" forbids rate-weakening friction (μ falling with speed), which is real and causes stick-slip, brake squeal and bowed strings. Passivity needs only ⟨λ, v⟩ ≤ 0 and maximum dissipation within the admissible set at the current state; convexity of a single potential is sufficient, not necessary. A-3 must be restated as passivity of constitutive response (the set may depend on state and rate), with convex potentials as the standard but not the only admitted form. Otherwise Ego could never meet stick-slip and would learn that it does not exist.
3. Level 1 claims were made for uncommitted code, and one of its tests still fails. The committed branch has no exit check; the committed solver's warm start is energy-unbounded in principle.
4. "The gate is the same for Ego and the user" was false: Ego has setPose (FC-2).
5. A-5 was treated as satisfied by "sources exist". Provenance is per material, friction is calibrated, component estimates are silent, derived values carry nothing. §G is what A-5 actually requires.
6. The error accounting was called "explicit residual"; one signed residual hides compensating errors and FC-3 corrupts it under grabs.
7. The scale and similarity model overclaimed: Froude makes a controller scale-free only if the actuators scale, and servos are components that do not. A 10× creature with 10× servos is a different machine, and Ego must not expect similarity across it.
8. Realisability was listed as checks (fits, insertion, assembly sequence, wire fit, heat path, current delivery); most do not exist. They are NOT MODELLED and must be named as such in every V5 judgement.
9. The frictionless-walker finding was stated as "suspected closure"; it is unconfirmed. Until a test isolates it, FC-1's cause is a hypothesis ranked by the hierarchy, not a result.
10. The latch was called "passive by construction"; passivity over arbitrary latch/release sequences is unproved.
11. The watchdog reclassification kept "fell" and "tunnel" as assertions and said nothing about Ego acting on them; Ego does act, by teleporting (FC-2).
12. The audit treated the stand as a strength ("a second world with the same physics"); under the new criterion it is the largest false-confidence surface, because it is where Ego forms beliefs (FC-4, FC-21).
13. Model assumption M-2 (rigid clusters) was listed and then not propagated: no result today says "assuming no flex", and stiffness-dependent inventions are evaluated as if it did not matter.

## L. What must be fixed before I would trust Ego to evaluate a genuinely novel invention

In order, each with what it closes:

1. Remove Ego's direct state writes; route fault recovery through the kernel with run invalidation (FC-2). Remove the hand attribution of gains (FC-3). Split the residual into gains and losses with attribution (FC-20).
2. Confirm or refute FC-1 with P-6 (closure preserves the centre of mass on random mechanisms); fix closure to a mass-weighted projection; drop the walker's limit to rounding.
3. Land the solver exit check with its tests passing (Level 1 for the re-solve's energy and momentum).
4. Replace angular damping and the straight-line projection with a constrained symplectic step (A5); until then, every result involving free rotation is marked Level 3 with the decay rate stated (FC-5).
5. The servo as motor + gear + controller with rotor, current and heat, from datasheet-class data; stops at hardware travel; remove the 6 Hz floor (FC-10, FC-11). Rebuild the gait from the laws, in dimensionless terms, with sensors (FC-17, FC-18).
6. Validity levels and claim levels computed by the kernel and carried through Ego's language and the tablet; the stand renamed and its learning stored as model knowledge with the level attached (FC-4, FC-22). The stand's settings verified identical to the live world's (FC-21).
7. Provenance per property with propagation (FC-8, FC-9); the friction values reclassified as calibrated with their fit range; the servo defaults labelled.
8. `outside()` on every law, or a flag on the result when the range is not checked (FC-7).
9. Dimensional tolerances rewritten as fractions of feature size, with a scale floor reported on every result (FC-16); the restitution floor replaced by a derived criterion or an energetic restitution model (FC-6); the 9.81 fallbacks removed.
10. Frozen parts and creative grabs declared on every result that rests on them (FC-19); indeterminate supports annotated (FC-13); heat partition annotated as estimate (FC-14); slender-segment torsion marked untrusted (FC-12).
11. Investigate FC-15 (Jolt-side joint compliance) and the singular-block pivot path with sweeps; publish their contracts or route around them.
12. The registry and its tests, so that none of the above can quietly return.

Until 1 to 6 are done I would not let Ego present any invention above V1 to a person without the word "model" in the sentence.

## M. What remains fundamentally uncertain

- Whether a projected Gauss-Seidel solve with friction is passive at finite iterations without the exit fallback; the fallback is exact but costs a re-solve.
- Whether the latch and continuous magnet models are jointly passive over arbitrary sequences.
- Whether Jolt's solver, which handles everything outside the re-solve, satisfies momentum and passivity to float32 in all configurations; it is tested, not proved, and its source is not under this architecture.
- How to compute a bound for the equal-stiffness support split without a flex model: the error contract may only be "model-dependent, unbounded".
- Whether Froude-based gait laws transfer across scale at all when actuators are discrete components.
- How far provenance propagation can go through the solver: a joint load depends on every body in the island; its class is the weakest in the island, which may make almost everything Level 3 in practice. That is honest, but it means Level 2 results will be rare until data improves.
- Whether any amount of simulated validation justifies words stronger than "consistent with the model" for a novel invention. My current answer is no: V6 is a different kind of evidence, and the architecture should keep it so.

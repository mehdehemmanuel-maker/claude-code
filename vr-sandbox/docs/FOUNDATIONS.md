# Foundations: a few laws the rules derive from

The rules in ARCHITECTURE.md were each written after something broke. That keeps a fix from being lost, but it builds
a list of patches, and patches leave gaps between them. This page asks a different question of every rule: *which
deeper law makes the whole class of failures impossible, and is the rule then a consequence of it?* A merge is made
only where there is a real mathematical relationship: an identity, a theorem or a shared structure. A rule that is
about something else (what can be bought, how the software behaves) stays separate.

The goal is a firewall: a structure in which a forbidden state cannot be reached, rather than a check that catches it
afterwards. Where the code already has that structure, this page says so and names the identity that guarantees it.
Where it doesn't, the page says what breaks and how to fix it. Where the guarantee needs assumptions, they are listed
in "Where the laws stop holding" below.

Notation. Bodies i have mass m_i, world inertia I_i about their centre of mass x_i, velocity v_i and angular
velocity ω_i. All velocities stacked are u; M is the block mass matrix; kinetic energy is K = ½ uᵀ M u. A *row* r
(physics/rigid.ts) is one scalar interaction between two bodies a and b, or between a body and the world. Its
Jacobian J_r gives the relative velocity along it, w_r = J_r u. Its impulse λ_r changes the velocities by
Δu = M⁻¹ J_rᵀ λ_r. With every row stacked, A = J M⁻¹ Jᵀ is the coupling matrix (positive semi-definite).

---

## 1. The fundamental laws

There are six. The first four are physics. The fifth is about information, and the sixth is about how the laws change
with scale.

### F1. Momentum: every internal interaction is an equal and opposite pair on one line

**Statement.** An interaction between two simulated bodies changes their total linear momentum by exactly zero. It
changes their total angular momentum by exactly zero. Momentum changes only through interactions with things that are
not simulated: the ground, the water, the air, your hands and gravity.

**Why it is the deeper law.** Noether's theorem: a law that does not depend on where the pair is, or on which way it
faces, conserves linear and angular momentum. In the row form this is an identity that can be checked line by line.
Take a linear row along a unit vector d, applied at p_a on a and p_b on b. Body b gets +λd at p_b and body a gets
−λd at p_a. Then

    Δp_total = λd − λd = 0                                                    (exact)
    ΔL_total = λ (p_b × d − p_a × d) = λ (p_b − p_a) × d                      (about any fixed point)

So linear momentum is always exact. Angular momentum is exact **if and only if the two application points lie on the
row's line of action**, (p_b − p_a) ∥ d. An angular row (a pure couple, +λ·axis on b and −λ·axis on a) is always
exact.

**What this means for the code today.** Contact normal rows are exact, because their two points differ along the
normal. Friction rows on the same contact are not: p_b − p_a is the penetration depth along n, which crosses the
tangent t. A joint whose two ends have drifted apart by ε makes a torque of λ ε out of nothing on every row of that
joint. Both are small, but they are loopholes, and they are not needed.

**The firewall.** Give both sides of a linear row the same lever point, p* = (p_a + p_b)/2. Use the separation only
in the row's position error, where it belongs. Then ΔL = λ (p* − p*) × d = 0 for every row. The total change over a
whole solve is the sum of the changes from each impulse applied, so it is zero for any number of rows, any order, any
iteration count and any clamping. Composition can't break it.

**Derived from F1 (no longer separate laws).**
- I3a: a free system conserves linear and angular momentum.
- I3c: no position correction adds momentum. The position pass (split impulse) runs on pseudo-velocities built from
  the same rows, so it is momentum-neutral by F1. With p* it also cannot move or turn the system's centre of mass.
- I3d and R9: a joint's load is the momentum that flows across it. Apply F1 to the branch on one side of a cut: the
  joint's impulse equals the branch's change of momentum minus the external impulses on it. "Whichever side is A"
  cannot matter, because the identity is symmetric.
- M3, magnets: the world applies −F to A with torque −T − (x_B − x_A) × F. That is F1 for a pair potential that
  depends only on the pair's relative pose. Written as a gradient of such a potential, the reaction is automatic, not
  a rule.
- The walker on a frictionless floor (walker test): the floor's rows are vertical normals, and friction rows bounded
  by μλ_n = 0. No external impulse has a horizontal part, so horizontal momentum is conserved and the centre of mass
  cannot start moving sideways. The test is a corollary of F1, not a separate fact about legs.

### F2. Energy: every impulse is either passive or paid for

**Statement.** Mechanical energy rises only by work done through a *port*: a battery, a motor's supply, your hands.
Every port draws on a finite store that it debits. Everything else stores energy (masses, springs, magnetic fields)
or dissipates it (friction, drag, eddy currents, plastic flow, electrical resistance). What is dissipated becomes heat
in the parts, so the total of mechanical, thermal, chemical and electrical energy changes only by the work of your
hands.

**The exact identity behind it.** After a solve with total row impulses Λ,

    ΔK = ½ (u⁺ + u⁻)ᵀ M (u⁺ − u⁻) = Σ_r Λ_r · (w_r⁻ + w_r⁺)/2                  (exact, no approximation)

Every joule of kinetic change is therefore attributable to a row: row r did work W_r = Λ_r ⟨w_r⟩. The ledger can
book the re-solve's energy row by row, exactly. It no longer needs a catch-all term for it.

**Theorem A (a passive solve cannot create energy, at any iteration count).** Take rows with fixed bounds
[lo_r, hi_r] containing 0, targets t_r and softness γ_r, and define

    g(Λ) = ½ Λᵀ (A + Γ) Λ + Λᵀ (w⁻ − t)

Each projected Gauss–Seidel update in `solveRows` is acc ← clamp(acc + (t − w − γ·acc)/(k + γ), lo, hi). That is
exactly the minimiser of g along that coordinate within its bounds (∂g/∂Λ_r = w_r + γ_r Λ_r − t_r, and g is convex in
Λ_r). A block update minimises g exactly over the block. So g never increases, pass after pass. Starting from Λ = 0,
where g = 0, g ≤ 0 always. Substituting:

    ΔK = g − ½ Λᵀ Γ Λ + Λᵀ t  ≤  Λᵀ t − ½ Λᵀ Γ Λ  ≤  Λᵀ t

Kinetic energy can rise only through Λᵀt, the work of rows that carry a target: a servo's drive, a motor's, a
restitution rebound. With every target zero, a solve can only remove energy, however many passes it runs and in
whatever order. Soft rows (servos) dissipate ½γλ² as well, which is their damping.

**Theorem B (passivity at convergence, with friction).** Using the same identity, ΔK = Λᵀw⁺ − ½ΛᵀAΛ. Every passive
row satisfies λ_r w_r⁺ ≤ 0 at the velocity it leaves:
- a contact: λ ≥ 0, w⁺ ≥ 0 and λw⁺ = 0;
- friction, sliding or stuck: λ_t opposes w_t⁺, or w_t⁺ = 0;
- a joint: w⁺ = 0;
- a plastic hinge: its moment opposes its turning;
- a rope: one-sided, like a contact.

So ΔK ≤ −½ΛᵀAΛ ≤ 0 from passive rows (Stewart 2000; Anitescu & Potra 1997). The work the solver does after a
truncated solve is Σ max(0, λ_r w_r⁺). It is measurable every tick, and it is the only place a solver can hide energy.

**The firewall, in three parts.**
1. Every row is either passive (target 0, or a bound that only opposes motion) or a port that names its source.
   Port work Σ λ_r t_r is debited from that source. A source that is empty gives its row zero bounds, so it cannot do
   work.
2. Warm starting is guarded. Last tick's impulses are applied first, which is what lets heavy stacks converge. That
   can start g above zero. After the warm start, g is computed exactly from the identity. If it is above zero, the
   warm impulses are scaled back along their own ray until g ≤ 0. Along that ray g(s) = a s² + b s; with
   b = Λ_wᵀ(w⁻ − t) < 0 the scale is s = min(1, −b/a). Then Theorem A holds from the first pass.
3. The re-solve's kinetic change is booked row by row with W_r. Passive work goes to heat in the bodies on the row,
   port work to its source. Only the integrator's own error is left over.

**Derived from F2.**
- I3b: an undriven, frictionless system keeps its energy. It is violated today (A5): see F3 for why.
- R10: energy comes from a source.
- R14: what an actuator drives is not jitter. A jitter check asks whether a body's energy changed without power
  through a port. A driven body has that power, so the exemption list isn't needed: the check itself becomes "energy
  without a source".
- M2: magnets are conservative (F = −∇U, so no work round a closed path).
- M4: eddy currents dissipate (drag −Dq with D positive semi-definite, P = qᵀDq ≥ 0).
- M6: the latch is inelastic, and the seat is a position move that adds no velocity.
- A14: the explicit gyroscopic step added energy; the implicit midpoint rule conserves it.
- A15: two solvers per contact added energy; now each contact has one.
- The watchdog's `energy`, `flung`, `spin`, `jitter`, `restless` and `power` checks all become one check: no energy
  without a source.

**F2 across domains: why combining valid parts can't make energy.** Every element is one of six kinds:
- a store: a mass, a spring, a magnetic pair, a battery's chemistry, a part's heat;
- a dissipator, with D ≥ 0: friction, drag, a winding's resistance, eddy currents, plastic flow;
- a power-conserving transformer: a gear, ω_out = ω_in/N and τ_out = N τ_in;
- a gyrator: a DC motor, τ = k i and e = k ω, so τω = e i;
- a junction: Kirchhoff's laws, or the force balance of the rows;
- a finite source.

Joining such elements through power-conserving junctions gives a system with dH/dt = −Σ D_k + P_external. This is
the port-Hamiltonian composition theorem (van der Schaft & Jeltsema 2014): every internal port's power cancels in the
junction. So any build assembled from valid elements is passive by construction. Nothing extra has to be checked.

**A real merge inside F2: a servo is a motor, a gear and a controller.** R12 describes a servo with its own
assumptions: stall torque, a no-load speed and a torque-speed line. All of them follow from a DC motor (R10's model:
V = iR + kω and τ = ki), a gear of ratio N, and a supply of voltage V_s:

    τ_out = N k (V − k N ω)/R   ⇒   stall torque T_s = N k V_s/R,   no-load speed ω₀ = V_s/(k N),
    and τ = T_s (1 − ω/ω₀): the torque-speed line, derived

The same composition also gives four things the separate servo law left out:
- the rotor's inertia at the horn, J_m N². Its absence let a 4 g leg be kicked to 95 rad/s.
- the current, i = τ/(N k), drawn from a battery. Its absence was the loophole between R10 and R12.
- the heat, i²R. A stalled servo warms and can burn out.
- the right inertia to size the drive by (R7). The motor acts on the true system, so no rule is needed.

What stays the servo's own is only its control law: V = clamp(K_p (θ_aim − θ), ±V_s). That is a design choice, not
physics.

### F3. Geometry: what is joined stays joined, and solids don't overlap

**Statement.** Every intact joint keeps its constraint residual small, |C(q)| ≤ ε, along any path. A contact never
overlaps by more than the slop. Stops, travels and clearances come only from the hardware's geometry, never from
what a controller commands.

**Structure.** The world works in maximal coordinates. Velocity rows make Ċ = 0 to first order, the position pass
removes what is left, and closure (R13) projects each island back onto C(q) = 0 from its root. What is left over at
the end of a tick is O(r (ω dt)²) and is removed on the next tick, so the residual is bounded and never accumulates.
Reduced coordinates (Featherstone 2008) would make C ≡ 0 identically for open chains, but closed loops need
constraints anyway.

**Derived from F3.**
- R6: an intact joint never comes apart.
- R13: a chain of assemblies holds.
- R8: a stop can't be run through, read as a unilateral geometric constraint. Its time resolution is in F6.
- A10: a ghost contact at a seam is false geometry.
- The watchdog's `drift`, `fell` and `tunnel` checks.

**What F3 corrects.** "A servo has end stops at its travel" (R8) put the stops at the command's extremes. The gait was
then tuned against those false stops, and it broke when they were moved to the gear train's real end of travel
(about ±90°). Under F3, the travel is hardware and the swing is a command inside it: the `swing` parameter.

**Where F3 collides with F2 (A5).** The velocity rows use the tick-start Jacobians, but the position moves along a
straight line. An orbiting body leaves its circle by r(ωdt)²/2, which the position pass pulls back. Its velocity is
still aimed along the old tangent, though, and the next tick projects it onto the new one. Each tick it loses a
factor cos²(ωdt) of its kinetic energy, so pendulums decay. The fix is a constrained symplectic step: RATTLE
(Andersen 1983) projects the velocity onto the tangent at the new position, and is symplectic (Leimkuhler & Skeel
1994). Its energy error is then bounded and does not drift. Equivalently, the velocity is turned with the orbit. This
is planned fix F4, and it is the one place where the current integrator breaks a fundamental law outright.

### F4. Admissible force sets: friction, stops, ropes, contact and yield are one law

**Statement.** A set-valued force lies in a convex admissible set K, and does the most dissipation K allows against
the motion:

    λ = argmax over λ' ∈ K of (−λ' · w)

This is Moreau's maximum dissipation principle (Moreau 1988). The laws differ only in K:
- Contact: K = {λ_n ≥ 0}.
- Coulomb friction: K = {|λ_t| ≤ μ λ_n}.
- A rope: tension only.
- A joint stop: one-sided at the hardware's limit.
- A plastic hinge: K = {|M| ≤ M_p}.
- A stuck magnet's contact wrench (M5): pressing, within friction, the pressure centre inside the footprint, and the
  twist within μ N r̄.

`solveRows` already does this for box-shaped sets. Clamping a row's accumulated impulse is the projection onto K, and
Theorem B's condition λ w⁺ ≤ 0 is maximum dissipation at the velocity the row leaves. So friction, plastic hinges,
stops, ropes, contacts and magnet contacts share one solver and one proof of passivity. Only their data differ.

**Derived from F4.** M5, the plastic hinge rows, joint limits, ropes and Coulomb friction. Also I4 (only load over
capacity breaks things) for the yield part: what breaks is decided by whether the force can stay inside K.

**What F4 does not decide.** The size of K is data: μ, M_p, a magnet's pull, a joint's capacity. That is the separate
constitutive layer below.

### F5. Information: a controller acts only through actuators, on what its sensors could measure

**Statement.** A controller is a function of its sensors' readings up to now, less its latency. That covers a
servo's loop, a creature's mind, a limb's ganglion and Ego's foresight. It acts only through ports (F2). A sensor is
physical: an encoder or potentiometer reads an angle, a load cell a force, an inertial sensor acceleration and turn
rate, and an eye needs a line of sight.

**The firewall.** This is a typed boundary. The controller's input type holds only sensed values, so it cannot read
the world's true state. Today `mind.ts` receives your position and the dry-ground test, and `sees()` checks only the
eyes' arc and range. That is a loophole: a dog can see through a wall. Line of sight closes it.

### F6. Similarity: every law holds in any frame, and at any size, time scale and gravity

**Statement.**
- **Frame invariance.** Rotating the whole scene about gravity, or moving it, changes nothing relative. The ground,
  the water and the air set a rest frame, which is physical.
- **Dimensional homogeneity.** Every law balances its units. The ganglia already checks this for its laws.
- **Similarity.** Every threshold is a dimensionless number, never a bare constant tied to Earth's gravity or to one
  size. So the same law holds on the Moon, in orbit, at 1 cm or at 1 m.

**The time-scale law.** Each process has its own time scale: a servo loop, a magnet's snap, heat flowing through a
part, a battery draining. The substep criteria scattered through the world are two conditions:
- **Oscillation.** Every explicitly integrated mode satisfies ω dt ≤ c. That covers springs (0.12), bands and magnets
  (0.5).
- **Transport.** No feature moves further than its resolution length in one step: |v| dt ≤ ℓ. That covers a joint
  closing on a stop (ℓ = 0.01 rad or 2 mm) and, in Jolt, continuous collision.

So dt_sub = min_k(c/ω_k, ℓ_j/|v_j|). A mode beyond the substep cap must be integrated implicitly, which is
unconditionally stable and passive under F2, and is named as numerically damped. A threshold that isn't one of these
is a crutch.

**What F6 corrects (found today).**
- The magnet cutoff ignores a pull under 0.1% of the lighter magnet's weight. With no gravity it falls back to
  9.81 m/s², so in orbit the world uses a gravity it doesn't have. The scale-free form is to drop the pull when it
  would move the magnet less than its resolution over a second: a < max(10⁻³|g|, 2·slop/(1 s)²).
- Sparks always fall at 9.81 m/s².
- The no-bounce floor is a fixed 1 m/s. Its scale-free form is a closing speed of a few g·dt, which is what one tick
  can resolve.
- The angular damping of 0.02 s⁻¹ is a time scale belonging to nothing physical.

**Dynamic similarity, the lever for creatures.** Animals of different sizes move alike at the same Froude number,
Fr = v²/(gL) (Alexander & Jayes 1983). Efficient swimmers and fliers cruise at a Strouhal number St = fA/U of 0.2 to
0.4 (Taylor, Nudds & Thomas 2003). A gait written in these numbers works for any leg length and any gravity. A gait
written in hertz and metres works for one dog.

---

## 2. The map: every existing rule and where it now comes from

| Rule | Comes from | Status after the merge |
|---|---|---|
| I3a momentum | F1 | derived (identity) |
| I3b energy | F2 | derived; **violated by F3's integrator (A5)** until RATTLE |
| I3c corrections add no momentum | F1 (split impulse, p*) | derived |
| I3d loads balance the branch | F1 (flux across a cut) | derived |
| I3e capacities from specs | constitutive data | separate (sourced data) |
| I4 only overload breaks | F4 + data | derived structure, separate data |
| I10 nothing that couldn't work | F1–F6 + realisability | the umbrella |
| R6 joints never part | F3 | derived |
| R7 drive sized by the whole group | F2 (the motor acts on the true system) | **redundant** once servos are motor + gear |
| R8 stops can't be run through | F3 + F6 (transport law) | derived; its servo clause corrected (travel ≠ command) |
| R9 load is what it carries | F1 | **redundant** (implementation of I3d) |
| R10 energy from a source | F2 | derived (ports) |
| R12 servo model | F2 (motor + gear + control law) | **reducible**: only the control law remains its own |
| R13 chains close | F3 | derived |
| R14 driven isn't jitter | F2 (energy without a source) | **redundant** once the watchdog checks power balance |
| M1 pole-face field | magnetostatics (Gilbert model) | constitutive physics, derived from Maxwell |
| M2 conservative pull | F2 (a store: F = −∇U) | derived from M1 |
| M3 momentum, integration | F1 + F6 | derived |
| M4 eddy currents | F2 (D ⪰ 0) | derived from Maxwell + Ohm |
| M5 stuck-magnet statics | F4 (admissible wrench set) | derived structure |
| M6 latch | numerical method (stiff ODE → constraint) | separate, with proof obligations: passive (F2), lets go by M5 (F4) |
| watchdog: energy, flung, spin, jitter, restless, power | F2 | one check: energy without a source |
| watchdog: drift, fell, tunnel | F3 | derived |
| walker: frictionless floor | F1 | derived |
| walker: "knees still, a trot only paddles" | none | **not a law**: it described the old model's behaviour; removed |

**Genuinely separate (no deeper law reduces them):**
- **Constitutive data.** Materials, friction pairs, motor constants, battery chemistry, a magnet's remanence, yield
  and fracture capacities (I3e, R5). The fundamental laws constrain their form (positive dissipation, symmetric
  stiffness, convex admissible sets), but the numbers are measurements. Each number carries its source.
- **Realisability.** R1–R4 and R11: joints only where parts touch, screws along real paths, stock and hardware as
  sold, and nothing made that can't be made. This is the law of making, not of motion. Internally it is one law: a
  build is what processes applied to purchasable stock can produce, joined only through surfaces that touch. The
  world refuses anything else, so the set of builds is closed under its own operations.
- **System invariants.** I1 (the document is the truth), I2 (undo, byte-exact saves), I5 (determinism), I6 (event
  revisions), I7 (bounded queues), I8 (fault containment) and R15 (tick budget). These are laws of the software.
- **Validation.** I9: a template does what its card says.
- **Numerical methods.** Substep caps, solver tolerances, the latch, and `MAX_BONDED_KAPPA`, which alters the inertia
  of very slender segments to stay inside single precision. Each must state what it trades away and how it converges.
- **Controller designs.** Gaits, minds, Ego's choices. These are not laws. They are free choices that must act
  through F2's ports on F5's sensed information.

**The constant law (a meta-law).** Every constant in the physics is one of four things:
- a physical constant with its source;
- a material or component datum with its source;
- a numerical-method parameter with its accuracy statement;
- an estimate, labelled, with its derivation.

There is no fifth kind. A crutch is a constant that is none of these, and the audit below is how this law is enforced.

---

## 3. Loopholes between rules (found)

| | Between | What it let through |
|---|---|---|
| L1 | R10 × R12 | Servos weren't covered by the energy rules: energy from nowhere. |
| L2 | R8 × R12 | Stops at the command's extremes hid the missing rotor inertia; the gait was tuned against them. |
| L3 | R14 × watchdog | The driven exemption would hide a driven part going unstable. |
| L4 | magnet cutoff × gravity | In zero g the world used Earth's g. |
| L5 | constraint projection × I3b | Pendulums decay (A5). |
| L6 | no-bounce floor × M6 | The latch's "inelastic anyway" rests on a 1 m/s floor that is itself a crutch. |
| L7 | `MAX_BONDED_KAPPA` × Euler's equations | Slender segments spin with altered inertia. |
| L8 | `sees()` × F5 | Sight through walls. |
| L9 | angular damping × R10 | A motor draws 0.27 A to run free where its datasheet says 0.14 A. |

---

## 4. Where the laws stop holding

These are the stated limits. Each invariant above is claimed only inside them.

1. **The classical regime.** At 1 m/s, relativistic corrections are (v/c)²/2 ≈ 6×10⁻¹⁸, and gravitational time
   dilation is gh/c² ≈ 1.1×10⁻¹⁶ per metre of height. Both are below double precision's resolution (2.2×10⁻¹⁶), so
   in this simulation they are not small: they are unrepresentable. Time is one global clock. Different time scales
   exist only as substeps (F6), not as different flows of time. The world is not a rotating frame: Earth's Coriolis
   acceleration at 1 m/s is 1.5×10⁻⁵ g, and is left out. Gravity is uniform: the tidal gradient of 3×10⁻⁶ s⁻² is left
   out.
2. **Rigid bodies.** Elastic waves aren't modelled. Energy that goes into vibration above the tick's Nyquist
   frequency (45 Hz) appears as dissipation, as heat and sound. Joined parts are rigid clusters, with no flex.
3. **Discrete time.** Symplectic Euler's energy error is O(dt) and bounded for bounded motion, but in free fall it
   grows by ½mg²dt² a tick. The position pass can raise potential energy when it lifts a part out of an overlap,
   bounded by the slop. A5 holds until RATTLE.
4. **Finite iterations.** Theorem A holds at any iteration count only for fixed bounds, so the guard applies to warm
   starting. Friction's bounds move with the normal impulse, so Theorem B holds at convergence. The truncation's work,
   Σ max(0, λw⁺), is measured rather than assumed to be zero.
5. **Impacts with friction.** Newton's restitution in several simultaneous frictional contacts can gain energy (Kane's
   example; Stronge 1990). An energetic coefficient, with the restitution phase's work equal to −e² times the
   compression phase's, closes this.
6. **Jolt's own solver.** Bodies outside the assembly re-solve are integrated by Jolt, whose joints and contacts have
   Jolt's own properties. The firewall covers what goes through `solveRows`. Widening it means routing more through
   it, or testing Jolt's properties, which the conformance suite does.
7. **Single precision in Jolt.** Momentum is exact only to float32 rounding, about 10⁻⁷ relative per operation. A13
   is the cost of that: slender segments.
8. **Idealised senses.** A creature knows its own pose exactly, with no inertial-sensor drift.
9. **The world beyond the simulation.** The ground, the sea and the air are not simulated bodies. Momentum and
   energy that pass into them leave the books as external work, by design.
10. **Not yet modelled.** Flex, creep, fatigue, moisture, workmanship, a wire's own heating and battery temperature
    (ARCHITECTURE.md lists them). An invariant says nothing about physics the world doesn't contain.

---

## 5. Order of work

1. **F1 firewall.** Common lever point p* for linear rows. A property test: random rows, any order and passes give
   Δp = ΔL = 0 to rounding.
2. **F2 firewall in the solver.** Exact row work W_r, the warm-start guard, and the passive/port split. A property
   test: random passive rows never raise K, at any pass count, and ports never raise it by more than their work.
3. **F2 ledger.** Servo and rotor work booked from the rows, which closes L1.
4. **F6 thresholds.** The magnet cutoff without Earth's g (L4), and sparks under the world's gravity.
5. **The constant law as a test.** Every constant in `physics/` carries its kind (source, numerical, estimate).
6. **Servo as motor + gear + controller.** Rotor inertia, current and heat derived from R10's model.
7. **F3 × F2 (A5).** RATTLE-style velocity transport in the re-solve; then Jolt-side joints.
8. **F5.** Senses as a typed boundary, with line of sight.
9. **Walkers as limbs.** A per-limb ganglion of local load feedback, from which the gait emerges (Owaki et al. 2013;
   Owaki & Ishiguro 2017), written in Froude terms so it holds at any size and gravity.

## References

Noether, *Invariante Variationsprobleme* (1918). Marsden & West, *Discrete mechanics and variational integrators*,
Acta Numerica 10 (2001). Hairer, Lubich & Wanner, *Geometric Numerical Integration*, 2nd ed., Springer (2006).
Andersen, *Rattle*, J. Comput. Phys. 52 (1983). Leimkuhler & Skeel, *Symplectic numerical integrators in constrained
Hamiltonian systems*, J. Comput. Phys. 112 (1994). van der Schaft & Jeltsema, *Port-Hamiltonian Systems Theory*,
Found. Trends Syst. Control 1 (2014). Moreau, *Unilateral contact and dry friction in finite freedom dynamics*, CISM
302 (1988). Stewart, *Rigid-body dynamics with friction and impact*, SIAM Review 42 (2000). Anitescu & Potra,
Nonlinear Dynamics 14 (1997). Stronge, *Rigid body collisions with friction*, Proc. R. Soc. A 431 (1990). Catto,
*Iterative dynamics with temporal coherence* (GDC 2005) and *Soft constraints* (GDC 2011). Featherstone, *Rigid Body
Dynamics Algorithms* (2008). Buckingham, Phys. Rev. 4 (1914). Alexander & Jayes, J. Zool. 201 (1983). Taylor, Nudds &
Thomas, Nature 425 (2003). Owaki et al., J. R. Soc. Interface 10 (2013). Owaki & Ishiguro, Sci. Rep. 7 (2017).

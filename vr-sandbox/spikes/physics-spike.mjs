// De-risking spike for PLAN.md §1. Verifies that Jolt (WASM) gives us the hooks the
// "real, not scripted" physics model depends on, and measures step cost.
//
//   npm install && npm run physics
//
// Each check prints expected vs measured. Nothing here is app code.

import initJolt from 'jolt-physics/wasm-compat';

const J = await initJolt();
const L_STATIC = 0;
const L_MOVING = 1;
const DT = 1 / 90;
const G = 9.80665;

function makeWorld(gravity = -G) {
  const s = new J.JoltSettings();
  const pairs = new J.ObjectLayerPairFilterTable(2);
  pairs.EnableCollision(L_STATIC, L_MOVING);
  pairs.EnableCollision(L_MOVING, L_MOVING);
  const bp = new J.BroadPhaseLayerInterfaceTable(2, 2);
  bp.MapObjectToBroadPhaseLayer(L_STATIC, new J.BroadPhaseLayer(0));
  bp.MapObjectToBroadPhaseLayer(L_MOVING, new J.BroadPhaseLayer(1));
  s.mObjectLayerPairFilter = pairs;
  s.mBroadPhaseLayerInterface = bp;
  s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
  const jolt = new J.JoltInterface(s);
  J.destroy(s);
  const ps = jolt.GetPhysicsSystem();
  ps.SetGravity(new J.Vec3(0, gravity, 0));
  return { jolt, ps, bi: ps.GetBodyInterface() };
}

function box(w, halfExtents, pos, { dynamic = true, density = 1000, convexRadius = 0.01, sleep = true } = {}) {
  const shape = new J.BoxShape(new J.Vec3(...halfExtents), convexRadius, null);
  shape.SetDensity(density);
  const cs = new J.BodyCreationSettings(
    shape, new J.RVec3(...pos), new J.Quat(0, 0, 0, 1),
    dynamic ? J.EMotionType_Dynamic : J.EMotionType_Static,
    dynamic ? L_MOVING : L_STATIC,
  );
  cs.mLinearDamping = 0;
  cs.mAngularDamping = 0;
  cs.mAllowSleeping = sleep;
  const body = w.bi.CreateBody(cs);
  J.destroy(cs);
  w.bi.AddBody(body.GetID(), J.EActivation_Activate);
  return body;
}

// The WASM heap is fixed-size: every world must be freed before the next one.
const freeWorld = (w) => J.destroy(w.jolt);
const massOf = (b) => 1 / b.GetMotionProperties().GetInverseMass();
const ALL_AXES = [0, 1, 2, 3, 4, 5];

// 1) Rigid joint force readback. FixedConstraint exposes no lambdas in the JS
//    bindings, so rigid joints are a SixDOF with every axis fixed.
{
  const w = makeWorld();
  const anchor = box(w, [0.05, 0.05, 0.05], [0, 2, 0], { dynamic: false });
  const cube = box(w, [0.05, 0.05, 0.05], [0, 1.9, 0], { density: 7850 }); // 10 cm steel cube
  const s = new J.SixDOFConstraintSettings();
  s.mPosition1 = new J.RVec3(0, 1.95, 0);
  s.mPosition2 = new J.RVec3(0, 1.95, 0);
  for (const a of ALL_AXES) s.MakeFixedAxis(a);
  const joint = J.castObject(s.Create(anchor, cube), J.SixDOFConstraint);
  w.ps.AddConstraint(joint);

  let force = 0;
  for (let i = 0; i < 90; i++) {
    w.jolt.Step(DT, 1);
    force = joint.GetTotalLambdaPosition().Length() / DT;
  }
  console.log(`[joint force]  expected m*g = ${(massOf(cube) * G).toFixed(2)} N   measured = ${force.toFixed(2)} N`);

  // Ramp an extra load until the joint's capacity is exceeded, then remove it.
  const capacity = 150;
  let brokeAt = -1;
  for (let i = 0; i < 180 && brokeAt < 0; i++) {
    w.bi.AddForce(cube.GetID(), new J.Vec3(0, -i * 1.5, 0), J.EActivation_Activate);
    w.jolt.Step(DT, 1);
    force = joint.GetTotalLambdaPosition().Length() / DT;
    if (force > capacity) {
      w.ps.RemoveConstraint(joint);
      brokeAt = i;
    }
  }
  w.jolt.Step(DT, 1);
  w.jolt.Step(DT, 1);
  const vy = w.bi.GetLinearVelocity(cube.GetID()).GetY();
  console.log(`[joint break]  capacity ${capacity} N exceeded at step ${brokeAt} (F = ${force.toFixed(1)} N); freed cube vy = ${vy.toFixed(3)} m/s`);
  freeWorld(w);
}

// 2) Spring (stored energy): period of m on k vs 2*pi*sqrt(m/k), by substep count.
for (const substeps of [1, 2, 4]) {
  const w = makeWorld(0);
  const anchor = box(w, [0.02, 0.02, 0.02], [0, 0, 0], { dynamic: false });
  const mass = box(w, [0.05, 0.05, 0.05], [0.6, 0, 0]); // 1 kg, pulled 0.1 m past rest length
  const k = 400;
  const s = new J.DistanceConstraintSettings();
  s.mPoint1 = new J.RVec3(0, 0, 0);
  s.mPoint2 = new J.RVec3(0.6, 0, 0);
  s.mMinDistance = 0.5;
  s.mMaxDistance = 0.5;
  s.mLimitsSpringSettings.mMode = J.ESpringMode_StiffnessAndDamping;
  s.mLimitsSpringSettings.mStiffness = k;
  s.mLimitsSpringSettings.mDamping = 0;
  w.ps.AddConstraint(s.Create(anchor, mass));

  const crossings = [];
  let prev = 0.1;
  for (let i = 0, t = 0; i < 90 * 6; i++) {
    w.jolt.Step(DT, substeps);
    t += DT;
    const x = w.bi.GetPosition(mass.GetID()).GetX() - 0.5;
    if (prev > 0 && x <= 0) crossings.push(t);
    prev = x;
  }
  const measured = (crossings.at(-1) - crossings[0]) / (crossings.length - 1);
  const expected = 2 * Math.PI * Math.sqrt(massOf(mass) / k);
  console.log(`[spring x${substeps}]    expected T = ${expected.toFixed(4)} s   measured T = ${measured.toFixed(4)} s   error ${(100 * Math.abs(measured - expected) / expected).toFixed(2)}%`);
  freeWorld(w);
}

// 3) Buoyancy: equilibrium submerged fraction must equal rho_part / rho_water.
//    Jolt's buoyancy argument is the density ratio rho_fluid / rho_body.
for (const rho of [250, 500, 800]) {
  const w = makeWorld();
  const b = box(w, [0.1, 0.1, 0.1], [0, 0, 0], { density: rho, convexRadius: 0.001, sleep: false });
  const surface = new J.RVec3(0, 0, 0);
  const up = new J.Vec3(0, 1, 0);
  const still = new J.Vec3(0, 0, 0);
  const g = w.ps.GetGravity();
  const ys = [];
  for (let i = 0; i < 90 * 20; i++) {
    w.bi.ApplyBuoyancyImpulse(b.GetID(), surface, up, 1000 / rho, 0.5, 0.05, still, g, DT);
    w.jolt.Step(DT, 1);
    if (i > 90 * 18) ys.push(w.bi.GetPosition(b.GetID()).GetY());
  }
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  console.log(`[buoyancy]     rho ${rho}: expected fraction ${(rho / 1000).toFixed(3)}   measured ${((0.1 - y) / 0.2).toFixed(3)}`);
  freeWorld(w);
}

// 4) Step cost scaling (single thread, THIS machine; not a Quest number).
function median(samples) {
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}
for (const [n, mode] of [[100, 'pile'], [250, 'pile'], [500, 'pile'], [1000, 'pile'], [250, 'rigid chain'], [1000, 'merged compound']]) {
  const w = makeWorld();
  box(w, [20, 0.5, 20], [0, -0.5, 0], { dynamic: false });
  const at = (i) => [(i % 10) * 0.12 - 0.6, 0.1 + Math.floor(i / 100) * 0.12, (Math.floor(i / 10) % 10) * 0.12 - 0.6];
  if (mode === 'merged compound') {
    // The "rigid cluster merge" optimisation: 1000 rigidly joined parts as ONE body.
    const sc = new J.StaticCompoundShapeSettings();
    for (let i = 0; i < n; i++) {
      const [x, y, z] = at(i);
      sc.AddShape(new J.Vec3(x, y, z), new J.Quat(0, 0, 0, 1), new J.BoxShapeSettings(new J.Vec3(0.05, 0.05, 0.05), 0.01), 0);
    }
    const cs = new J.BodyCreationSettings(sc.Create().Get(), new J.RVec3(0, 0.5, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_MOVING);
    cs.mAllowSleeping = false;
    w.bi.AddBody(w.bi.CreateBody(cs).GetID(), J.EActivation_Activate);
  } else {
    const bodies = [];
    for (let i = 0; i < n; i++) bodies.push(box(w, [0.05, 0.05, 0.05], at(i), { density: 2700, sleep: false }));
    if (mode === 'rigid chain') {
      for (let i = 0; i + 1 < n; i++) {
        if ((i + 1) % 10 === 0) continue;
        const s = new J.SixDOFConstraintSettings();
        const p = w.bi.GetPosition(bodies[i].GetID());
        s.mPosition1 = new J.RVec3(p.GetX() + 0.06, p.GetY(), p.GetZ());
        s.mPosition2 = s.mPosition1;
        for (const a of ALL_AXES) s.MakeFixedAxis(a);
        w.ps.AddConstraint(s.Create(bodies[i], bodies[i + 1]));
      }
    }
  }
  const samples = [];
  for (let i = 0; i < 240; i++) {
    const t0 = performance.now();
    w.jolt.Step(DT, 1);
    samples.push(performance.now() - t0);
  }
  console.log(`[step cost]    ${String(n).padStart(4)} bodies, ${mode.padEnd(15)} median ${median(samples).toFixed(2)} ms per 90 Hz step`);
  freeWorld(w);
}

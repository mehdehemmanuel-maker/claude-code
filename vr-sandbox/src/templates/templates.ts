// Ready-made builds for the template station. Each is an ordinary build document: nothing in the physics
// knows about them. They exist to open, learn from, break, and start from.

import { newDoc } from '../doc/commands';
import type { BuildDoc } from '../doc/types';
import { poolFluid, POOL } from '../physics/environment';
import { BuildBuilder, P, along, axisAngle, rotateAbout } from './builder';

export interface Template {
  id: string;
  name: string;
  blurb: string;
  tryThis: string[];
  build(): BuildDoc;
}

const deg = Math.PI / 180;
const Y90 = axisAngle([0, 1, 0], -Math.PI / 2); // local X -> world +Z
const Z90 = axisAngle([0, 0, 1], Math.PI / 2); // local X -> world +Y

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Empty workshop',
    blurb: 'A clean floor, the pool and every part in the catalog.',
    tryThis: ['Pick a part from the palette and click to place it.', 'Connect parts with the Join tools.'],
    build: () => {
      const d = newDoc('Untitled build', '2026-09-28T00:00:00.000Z');
      d.sim.fluids = [poolFluid()];
      return d;
    },
  },
  {
    id: 'newtons-cradle',
    name: "Newton's cradle",
    blurb: 'Five hardened steel balls on steel wire. Momentum and restitution, nothing scripted.',
    tryThis: ['Unfreeze the raised ball (Freeze tool) to release it.', 'Change a ball to aluminium or rubber and compare.'],
    build: () => {
      const b = new BuildBuilder("Newton's cradle", 101);
      const top = b.part('plate', P(0, 1.2, 0), { frozen: true, material: 'steel.a36', name: 'Cradle top', params: { length: 0.9, width: 0.25, thickness: 0.012 } });
      // legs clear of the raised ball's arc
      for (const x of [-0.42, 0.42]) {
        b.part('tube.square', P(x, 0.6, 0, Z90), { frozen: true, material: 'steel.a36', name: 'Leg', params: { length: 1.19, side: 0.03, wall: 0.002 } });
      }
      const pivotY = 1.194;
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.0502;
        let pose = P(x, 0.8, 0);
        if (i === 0) pose = rotateAbout(pose, [x, pivotY, 0], [0, 0, 1], -35 * deg);
        const ball = b.part('sphere', pose, { material: 'steel.52100', params: { diameter: 0.05 }, frozen: i === 0, name: `Ball ${i + 1}` });
        for (const z of [-0.08, 0.08]) b.link('rope', top, [x, pivotY, z], ball, pose.p, { grade: 'steel-wire-6x19', diameter: 0.001 });
      }
      return b.doc;
    },
  },
  {
    id: 'catapult',
    name: 'Counterweight catapult',
    blurb: 'An 80 kg counterweight on a 2 m Douglas-fir arm, on a steel axle in ball bearings, held by a steel latch wire.',
    tryThis: ['Erase the latch wire to fire.', 'Change the counterweight mass (up to 150 kg fits the frame): the arm swings faster, and the range rises, peaks near 100 kg and falls (the ball leaves the cup earlier).', 'Loosen the counterweight bolts to hand tight and fire again: they slip, and the throw falls short.'],
    build: () => {
      const b = new BuildBuilder('Counterweight catapult', 202);
      // The arm swings freely after the throw (there is no stop bar), so every part of it must clear the floor
      // and the frame on every turn: the pivot sits above the 1.6 m reach of the long arm, and the uprights
      // stand far enough apart for a counterweight of up to 150 kg (a 298 mm cylinder) to pass between them.
      const H = 1.75;
      const pivot: [number, number, number] = [0, H, 0];
      const tilt = -35 * deg;
      const R = (x: number, y: number, z: number) => rotateAbout(P(x, H + y, z), pivot, [0, 0, 1], tilt);
      const cwD = (kg: number) => Math.cbrt((4 * kg) / (Math.PI * 7200));
      const uprightZ = cwD(150) / 2 + 0.02 + 0.0445;
      const uprights = [-1, 1].map((s) =>
        b.part('lumber', P(0, (H + 0.1) / 2, s * uprightZ, Z90), { frozen: true, params: { size: '4x4', length: H + 0.1 }, name: 'Upright' }));
      const arm = b.part('lumber', R(0.6, 0, 0), { params: { size: '2x4', length: 2 }, name: 'Throwing arm' });
      // an M24 threaded-rod axle clamped through the arm by torqued nuts (a bolted joint along the axle), turning
      // in a 25 mm deep-groove bearing in each upright (6205: C0 7.8 kN)
      const axle = b.part('rod.round', { p: pivot, q: along(pivot, [0, 0, 1]).q }, { material: 'steel.1018-cd', params: { length: 2 * uprightZ + 0.06, diameter: 0.024 }, name: 'Axle (M24 rod)' });
      b.joint('bolted', arm, axle, along(pivot, [0, 0, 1]), { size: 'M24', class: '8.8', count: 1, bondW: 0.089, bondL: 0.089 });
      for (const s of [-1, 1]) b.joint('bearing', axle, uprights[s < 0 ? 0 : 1]!, along([0, H, s * uprightZ], [0, 0, 1]), { bore: 0.025, staticRating: 7800 });
      const cw = b.part('weight', R(-0.28, 0.019 + cwD(80) / 2, 0), { params: { mass: 80 }, name: 'Counterweight' });
      b.joint('bolted', arm, cw, R(-0.28, 0.019, 0), { size: 'M12', class: '8.8', count: 2, bondW: 0.089, bondL: 0.2 });
      const cup = b.part('plate', R(1.45, 0.025, 0), { material: 'wood.birch-plywood', params: { length: 0.25, width: 0.2, thickness: 0.012 }, name: 'Cup' });
      b.joint('screwed', cup, arm, R(1.45, 0.019, 0), { diameter: 0.004, length: 0.04, count: 4, bondW: 0.089, bondL: 0.25 });
      for (const x of [1.335, 1.565]) {
        const lip = b.part('block', R(x, 0.056, 0), { material: 'wood.birch-plywood', params: { x: 0.02, y: 0.05, z: 0.2 }, name: 'Lip' });
        b.joint('glued', lip, cup, R(x, 0.031, 0), { adhesive: 'epoxy-structural', bondW: 0.02, bondL: 0.2 });
      }
      b.part('sphere', R(1.45, 0.031 + 0.041, 0), { material: 'wood.hard-maple', params: { diameter: 0.08 }, name: 'Projectile' });
      const end = R(1.5, -0.019, 0).p;
      const stake = b.part('block', P(end[0], 0.06, 0), { frozen: true, material: 'steel.a36', params: { x: 0.12, y: 0.12, z: 0.12 }, name: 'Ground stake' });
      b.link('rope', stake, [end[0], 0.12, 0], arm, end, { grade: 'steel-wire-6x19', diameter: 0.003 });
      return b.doc;
    },
  },
  {
    id: 'shelf',
    name: 'Wall shelf load test',
    blurb: 'Plywood shelf on two L brackets of 2×2 fir screwed to a fir wall. Screw withdrawal from the Wood Handbook.',
    tryThis: ['Unfreeze the weights one by one.', 'Turn on the stress overlay (T) and watch the bracket screws.', 'Use fewer or thinner screws and try again.'],
    build: () => {
      const b = new BuildBuilder('Wall shelf load test', 303);
      const wall = b.part('block', P(0, 0.8, -1), { frozen: true, material: 'wood.douglas-fir', params: { x: 1.2, y: 1.6, z: 0.2 }, name: 'Fir wall panel' });
      // each bracket is an L: a 2x2 post flat against the wall, screwed through its 38 mm into the wall, and a 2x2 arm
      // out from it, screwed through the post into the arm's end grain (made up on the bench, then hung)
      const face = -0.9, post = 0.038, armZ = face + post + 0.15;
      const arms = [-0.35, 0.35].map((x) => {
        const upright = b.part('lumber', P(x, 0.87, face + post / 2, Z90), { params: { size: '2x2', length: 0.3 }, name: 'Bracket post' });
        b.joint('screwed', upright, wall, along([x, 0.87, face], [0, 0, -1]), { diameter: 0.005, length: 0.08, count: 2, bondW: 0.038, bondL: 0.3 });
        const arm = b.part('lumber', P(x, 1.0, armZ, Y90), { params: { size: '2x2', length: 0.3 }, name: 'Bracket arm' });
        b.joint('screwed', upright, arm, along([x, 1.0, face + post], [0, 0, 1]), { diameter: 0.005, length: 0.08, count: 2, bondW: 0.038, bondL: 0.038 });
        return arm;
      });
      const shelf = b.part('plate', P(0, 1.019 + 0.009, armZ), { material: 'wood.birch-plywood', params: { length: 0.9, width: 0.3, thickness: 0.018 }, name: 'Shelf' });
      for (const [i, arm] of arms.entries()) {
        const x = i === 0 ? -0.35 : 0.35;
        b.joint('screwed', shelf, arm, along([x, 1.019, armZ], [0, -1, 0]), { diameter: 0.004, length: 0.045, count: 2, bondW: 0.038, bondL: 0.3 });
      }
      const w = (kg: number) => Math.cbrt((4 * kg) / (Math.PI * 7200));
      b.part('weight', P(0.2, 1.037 + w(5) / 2, armZ), { params: { mass: 5 } });
      b.part('weight', P(-0.2, 1.5, armZ), { frozen: true, params: { mass: 20 }, name: '20 kg (unfreeze to drop)' });
      b.part('weight', P(0.05, 1.9, armZ), { frozen: true, params: { mass: 60 }, name: '60 kg (unfreeze to drop)' });
      return b.doc;
    },
  },
  {
    id: 'magnets',
    name: 'Magnet bench',
    blurb: 'N42 discs, a steel plate, an aluminium plate, and two pendulums: one free, one eddy-braked.',
    tryThis: ['Drag magnets toward each other; flip one over.', 'Magnets grab the steel plate but ignore the aluminium one.', 'Compare the two swinging copper discs.'],
    build: () => {
      const b = new BuildBuilder('Magnet bench', 404);
      b.part('plate', P(0, 0.81 - 0.009, 0), { frozen: true, material: 'wood.birch-plywood', params: { length: 1.4, width: 0.7, thickness: 0.018 }, name: 'Bench top' });
      b.part('plate', P(-0.5, 0.813, 0.1), { material: 'steel.a36', params: { length: 0.3, width: 0.2, thickness: 0.006 }, name: 'Steel plate' });
      b.part('plate', P(0.5, 0.813, 0.1), { material: 'aluminum.6061-t6', params: { length: 0.3, width: 0.2, thickness: 0.006 }, name: 'Aluminium plate' });
      for (const x of [-0.15, 0, 0.15]) for (const z of [0, 0.2]) b.part('magnet.disc', P(x, 0.815, z), { params: { diameter: 0.02, thickness: 0.01 } });
      const post = b.part('block', P(0, 1.06, -0.3), { frozen: true, material: 'steel.a36', params: { x: 0.45, y: 0.5, z: 0.1 }, name: 'Pendulum post' });
      const faceZ = -0.25;
      for (const [x, kind] of [[-0.12, 'bearing'], [0.12, 'eddy-brake']] as const) {
        const disc = b.part('disc', P(x, 1.2, faceZ + 0.004, axisAngle([1, 0, 0], Math.PI / 2)), { material: 'copper.c110', params: { diameter: 0.15, thickness: 0.004 }, name: kind === 'bearing' ? 'Free disc' : 'Eddy-braked disc' });
        const bob = b.part('block', P(x + 0.055, 1.2, faceZ + 0.006 + 0.015), { material: 'steel.a36', params: { x: 0.03, y: 0.03, z: 0.03 }, name: 'Bob' });
        b.joint('glued', bob, disc, along([x + 0.055, 1.2, faceZ + 0.006], [0, 0, -1]), { adhesive: 'epoxy-structural', bondW: 0.03, bondL: 0.03 });
        b.joint(kind, disc, post, along([x, 1.2, faceZ + 0.004], [0, 0, 1]), kind === 'bearing'
          ? { bore: 0.01 }
          : { rotor: 'copper', rotorThickness: 0.004, radius: 0.06, grade: 'N42', magnetD: 0.02, magnetL: 0.01, gap: 0.006, pairs: 2 });
      }
      return b.doc;
    },
  },
  {
    id: 'spring-launcher',
    name: 'Spring launcher',
    blurb: 'A 5 mm music-wire spring compressed 50 mm under a plate that slides on a guide rod, held by a latch wire.',
    tryThis: ['Erase the latch wire.', 'Change the wire diameter or coil count and read the new rate and surge frequency.', 'Compress it further until the spring overstresses.'],
    build: () => {
      const b = new BuildBuilder('Spring launcher', 505);
      const base = b.part('plate', P(0, 0.01, 0), { frozen: true, material: 'steel.a36', params: { length: 0.3, width: 0.3, thickness: 0.02 }, name: 'Base' });
      const plate = b.part('plate', P(0, 0.175, 0), { material: 'aluminum.6061-t6', params: { length: 0.2, width: 0.2, thickness: 0.01 }, name: 'Launch plate' });
      // the plate rides on a guide rod welded upright to the base, through a bushing in the plate
      const guide = b.part('rod.round', P(-0.08, 0.02 + 0.15, -0.08), { material: 'steel.1018-cd', params: { length: 0.3, diameter: 0.016 }, name: 'Guide rod' });
      b.joint('weld', guide, base, along([-0.08, 0.02, -0.08], [0, -1, 0]), { process: 'mig', filler: 'E70', leg: 0.004, length: 0, quality: 0.95 });
      b.joint('slider', plate, guide, along([-0.08, 0.175, -0.08], [0, 1, 0]), { limited: true, min: -0.3, max: 0.1, friction: 2 });
      b.link('spring', base, [0, 0.02, 0], plate, [0, 0.17, 0], { wire: 'music-wire-a228', d: 0.005, D: 0.04, Na: 8, L0: 0.2, zeta: 0.02 });
      b.link('rope', base, [0.08, 0.02, 0.08], plate, [0.08, 0.17, 0.08], { grade: 'steel-wire-6x19', diameter: 0.003 });
      b.part('sphere', P(0, 0.18 + 0.041, 0), { material: 'wood.hard-maple', params: { diameter: 0.08 }, name: 'Ball' });
      return b.doc;
    },
  },
  {
    id: 'raft',
    name: 'Raft and sinkers',
    blurb: 'A screwed pine raft, a steel block and material samples dropped into fresh water.',
    tryThis: ['Load the raft with test weights until it goes under.', 'Compare HDPE, balsa, PTFE and aluminium samples.'],
    build: () => {
      const b = new BuildBuilder('Raft and sinkers', 606);
      const cx = POOL.x;
      const planks = [-0.18, -0.09, 0, 0.09, 0.18].map((z) => b.part('lumber', P(cx, 1.0, z), { material: 'wood.southern-pine', params: { size: '2x4', length: 1.2 }, name: 'Plank' }));
      for (const x of [cx - 0.45, cx + 0.45]) {
        const batten = b.part('lumber', P(x, 1.0 + 0.019 + 0.019, 0, Y90), { material: 'wood.southern-pine', params: { size: '2x2', length: 0.5 }, name: 'Batten' });
        for (const [i, plank] of planks.entries()) {
          const z = [-0.18, -0.09, 0, 0.09, 0.18][i]!;
          b.joint('screwed', batten, plank, along([x, 1.019, z], [0, -1, 0]), { diameter: 0.004, length: 0.07, count: 1, bondW: 0.038, bondL: 0.089 });
        }
      }
      b.part('block', P(cx, 1.3, 1.3), { material: 'steel.a36', params: { x: 0.15, y: 0.15, z: 0.15 }, name: 'Steel block' });
      const samples: [string, string][] = [['polymer.hdpe', 'HDPE'], ['wood.balsa', 'Balsa'], ['polymer.ptfe', 'PTFE'], ['aluminum.6061-t6', 'Aluminium']];
      samples.forEach(([m, name], i) => b.part('block', P(cx - 1.2 + i * 0.8, 1.2, -1.4), { material: m, params: { x: 0.1, y: 0.1, z: 0.1 }, name }));
      return b.doc;
    },
  },
  {
    id: 'go-kart',
    name: 'Go-kart',
    blurb: 'Aluminium chassis; two coreless 24 V DC motors (Ø40 mm, 150 W) with 12:1 planetary gearheads, each driving a half-axle in its own hanger bearing, on two 12 V 7 Ah lead-acid batteries in series; servo-steered beam axle; rubber tyres.',
    tryThis: ['Drive with the arrow keys (or the left thumbstick in VR).', 'Hold full throttle against a wall: the motors stall at the controller\'s 20 A and their windings heat toward burnout.', 'Raise the controller current limit for more push, or drive until the batteries go flat.', 'Swap the tyres to PTFE.'],
    build: () => {
      const b = new BuildBuilder('Go-kart', 707);
      const wheelQ = axisAngle([1, 0, 0], Math.PI / 2);
      const Zq = along([0, 0, 0], [0, 0, 1]).q; // a rod's length (local y) along world z
      // 0.4 m wide: the pivoting beam axle swings the front wheels inward (z = 0.36 cos(lock)), so they need
      // ~4 cm of clearance to the chassis edge at full lock or they jam against it.
      const chassis = b.part('plate', P(0, 0.2, 0), { material: 'aluminum.6061-t6', params: { length: 1.2, width: 0.4, thickness: 0.02 }, name: 'Chassis' });
      const under = 0.19, hub = 0.125;
      // rear: a 30 mm steel cross-member bolted under the chassis carries a pillow-block hanger near each wheel; each
      // hanger holds a 25 mm half-axle. The two gearmotors hang on the inner ends of the half-axles, back to back on
      // the axle line, each output shaft coupled to its half-axle; a torque arm (a short steel link with a rod end at
      // each end, from a split clamp round the gearhead up to the chassis) stops each housing turning. Everything is
      // held just once: the hanger locates the axle, the shaft locates the motor, the arm only takes the reaction
      // torque, so the gearhead's shaft carries the motor's weight and the arm's push (inside its 240 N rating) and
      // nothing the wheels do. Nothing is drilled into the motor or the battery (R11): the motor is gripped, the
      // battery stands in a tray of aluminium angle bolted to the chassis
      const cross = 0.03, crossTop = under, crossBot = under - cross;
      const carrier = b.part('rod.square', P(-0.5, under - cross / 2, 0, Y90), { material: 'steel.1018-cd', params: { length: 0.64, side: cross }, name: 'Rear cross-member' });
      for (const z of [-0.12, 0.12]) b.joint('bolted', carrier, chassis, along([-0.5, crossTop, z], [0, 1, 0]), { size: 'M8', class: '8.8', count: 2, bondW: cross, bondL: 0.06 });
      const gearmotor = { model: 'motor.dc.coreless.d40-150w-24v', gearhead: 'gearhead.planetary.d42-12to1' };
      const motorLen = 0.071 + 0.0555, gap = 0.01;
      const battery = b.part('battery', P(0.2, 0.21 + 0.0975 / 2, 0), { params: { model: 'battery.sla.12v-7ah', series: 2, parallel: 1, charge: 1 }, name: 'Battery (2 × 12 V 7 Ah SLA)' });
      // the tray: 25 × 25 × 3 mm 6061 angle, a rail along each side and a stop at each end, 1 mm clear of the case,
      // each bolted down through its flat leg with two M5
      const angle = { leg: 0.025, t: 0.003 }, bx = 0.151 / 2 + 0.001, bz = 0.13 / 2 + 0.001;
      for (const sz of [-1, 1]) {
        const rail = b.part('angle', { p: [0.2, 0.21, sz * bz], q: sz < 0 ? axisAngle([0, 1, 0], Math.PI) : [0, 0, 0, 1] }, { material: 'aluminum.6061-t6', params: { length: 0.151, ...angle }, name: 'Battery tray rail' });
        b.joint('bolted', rail, chassis, along([0.2, 0.21, sz * (bz + angle.leg / 2)], [0, -1, 0]), { size: 'M5', class: '8.8', count: 2, bondW: angle.leg, bondL: 0.151 });
      }
      for (const sx of [-1, 1]) {
        const stop = b.part('angle', { p: [0.2 + sx * bx, 0.21, 0], q: axisAngle([0, 1, 0], sx * Math.PI / 2) }, { material: 'aluminum.6061-t6', params: { length: 0.13, ...angle }, name: 'Battery tray stop' });
        b.joint('bolted', stop, chassis, along([0.2 + sx * (bx + angle.leg / 2), 0.21, 0], [0, -1, 0]), { size: 'M5', class: '8.8', count: 2, bondW: angle.leg, bondL: 0.13 });
      }
      for (const side of [-1, 1]) {
        const zc = side * (gap / 2 + motorLen / 2), zOut = side * (gap / 2 + motorLen), zBack = side * (gap / 2);
        const zArm = side * (gap / 2 + motorLen - 0.0555 / 2); // over the gearhead
        // a motor's shaft (its local y) points out toward its wheel
        const motor = b.part('motor.dc', { p: [-0.5, hub, zc], q: axisAngle([1, 0, 0], side * Math.PI / 2) }, { params: gearmotor, name: side < 0 ? 'Left gearmotor' : 'Right gearmotor' });
        // the torque arm's clamp: a 6061 block bored to the gearhead's 42 mm and split, gripping it with two M5 done up
        // gently (1 N·m: a thin gearhead housing is not a shaft), with the arm's rod end at its top, 37 mm off the axis
        const cw = 0.025, cx = 0.07, cy = 0.056, cOff = 0.007;
        const clamp = b.part('block', P(-0.5 + cOff, hub, zArm), { material: 'aluminum.6061-t6', params: { x: cx, y: cy, z: cw }, name: 'Torque-arm clamp (bored Ø42)' });
        b.joint('clamp', clamp, motor, along([-0.5, hub, zArm], [0, 0, side]), { size: 'M5', class: '8.8', count: 2, bore: 0.042, width: cw, tightening: 'custom', torque: 1 });
        // the arm: an 8 mm steel tie rod with a rod end at each end, vertical from the clamp's top to the chassis
        const armX = -0.5 + cOff + cx / 2 - 0.005, armBot = hub + cy / 2;
        b.link('link', clamp, [armX, armBot, zArm], chassis, [armX, under, zArm], { diameter: 0.008, stud: 0.008 });
        const outer = side * 0.39;
        const axle = b.part('rod.round', { p: [-0.5, hub, (zOut + outer) / 2], q: Zq }, { material: 'steel.1018-cd', params: { length: Math.abs(outer - zOut), diameter: 0.025 }, name: side < 0 ? 'Left half-axle' : 'Right half-axle' });
        // mirrored motors: the right one turns the other way about its own shaft for the kart to go forward
        b.joint('motor', motor, axle, along([-0.5, hub, zOut], [0, 0, side]), { channel: 'throttle', reverse: side > 0, currentLimit: 20 });
        const hz = side * 0.3;
        const hanger = b.part('block', P(-0.5, (hub - 0.025 + crossBot) / 2, hz), { material: 'steel.a36', params: { x: 0.06, y: crossBot - (hub - 0.025), z: 0.04 }, name: 'Axle hanger' });
        b.joint('bolted', hanger, carrier, along([-0.5, crossBot, hz], [0, 1, 0]), { size: 'M6', class: '8.8', count: 2, bondW: cross, bondL: 0.04 });
        b.joint('bearing', axle, hanger, along([-0.5, hub, hz], [0, 0, 1]), { bore: 0.025, staticRating: 8000 });
        const w = b.part('wheel', P(-0.5, hub, side * 0.36, wheelQ), { params: { diameter: 0.25, width: 0.06 }, name: 'Rear wheel' });
        b.joint('bolted', w, axle, along([-0.5, hub, side * 0.36], [0, 0, 1]), { size: 'M6', class: '8.8', count: 4, bondW: 0.05, bondL: 0.05 });
        // 1 m of 14 AWG pair from the pack to the motor's terminals at its back, routed with slack
        b.link('wire', battery, [0.2 - 0.151 / 2, 0.21 + 0.0975 / 2, side * 0.03], motor, [-0.5, hub, zBack], { gauge: '14', length: 1.0 });
      }
      // front: a steering beam at hub height, turned about a vertical kingpin by the servo in a block bolted under the
      // chassis; its ends are the stub axles the front wheels spin on
      const kingpin = b.part('block', P(0.5, (under + hub + 0.025) / 2, 0), { material: 'steel.a36', params: { x: 0.06, y: under - (hub + 0.025), z: 0.06 }, name: 'Kingpin block' });
      b.joint('bolted', kingpin, chassis, along([0.5, under, 0], [0, 1, 0]), { size: 'M8', class: '8.8', count: 4, bondW: 0.06, bondL: 0.06 });
      const bar = b.part('rod.square', P(0.5, hub, 0, Y90), { material: 'steel.1018-cd', params: { length: 0.72, side: 0.05 }, name: 'Steering beam' });
      b.joint('servo', kingpin, bar, along([0.5, hub + 0.025, 0], [0, 1, 0]), { maxTorque: 80, range: 28 * deg, channel: 'steer', pin: 0.02 });
      for (const z of [-0.36, 0.36]) {
        const w = b.part('wheel', P(0.5, hub, z, wheelQ), { params: { diameter: 0.25, width: 0.06 }, name: 'Front wheel' });
        b.joint('bearing', bar, w, along([0.5, hub, z], [0, 0, 1]), { bore: 0.02, staticRating: 8000 });
      }
      // the seat: an 18 mm plywood board bolted through to the chassis; the ballast bolted up through it into tapped
      // holes in the cast iron
      const seat = b.part('plate', P(-0.2, 0.21 + 0.009, 0), { material: 'wood.birch-plywood', params: { length: 0.35, width: 0.34, thickness: 0.018 }, name: 'Seat' });
      b.joint('bolted', seat, chassis, along([-0.2, 0.21, 0], [0, -1, 0]), { size: 'M8', class: '8.8', count: 4, bondW: 0.34, bondL: 0.35 });
      const dD = Math.cbrt((4 * 50) / (Math.PI * 7200));
      const driver = b.part('weight', P(-0.2, 0.228 + dD / 2, 0), { params: { mass: 50 }, name: 'Driver ballast (50 kg)' });
      b.joint('bolted', driver, seat, along([-0.2, 0.228, 0], [0, -1, 0]), { size: 'M10', class: '8.8', count: 2, bondW: 0.2, bondL: 0.2 });
      return b.doc;
    },
  },
];

export function getTemplate(id: string) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template ${id}`);
  return t;
}

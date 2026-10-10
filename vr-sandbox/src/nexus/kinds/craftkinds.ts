// Craft that are not wheeled, each sized by what holds it up (src/nexus/craft.ts): a multirotor by momentum theory, a
// hovercraft by its cushion, a jet suit by its engines' thrust against a person's weight, a submarine by the pressure
// at the depth it is rated to. Every spec here is that arithmetic run, not a figure looked up.

import { ax, bare, type KindDef, type P } from './core';
import { HAZARDS, burn, cushion, droneKg, droneWh, endurance, hover, hovers, hoverAllUp, hoverKg, hull, jetFuelKg, jetKg, plateFor, subKg } from '../craft';


const n = (p: P, k: string): number => Number(p[k]);
/** A multirotor's rotors are as big as fit round its span with a tenth of a diameter between the discs. */
const propOf = (rotors: number, span: number): number => (span * Math.sin(Math.PI / rotors)) / 1.1;

export const CRAFT_KINDS: KindDef[] = [
  {
    id: 'drone', look: 'box', name: 'multirotor drone', path: 'Electrical/Machines/Drones',
    says: 'a craft held up by rotors alone: so many motors on arms round a body, each throwing air down, the whole thing kept level by a board reading its own gyro hundreds of times a second',
    std: 'momentum theory (Leishman, Principles of Helicopter Aerodynamics, ch. 2); its frame sizes those sold, its masses estimates',
    axes: [bare('rotors', 'rotors', [4, 6, 8]), ax('span', 'motor to motor across', 'mm', [250, 350, 450, 650, 900])],
    title: (p) => `${n(p, 'rotors')}-rotor drone, ${n(p, 'span')} mm`,
    of: (p) => `frame-quad cfrp bldc-outrunner*${n(p, 'rotors')} propeller*${n(p, 'rotors')} fr4 pe abs nylon al-6061 screw-m3*4`,
    make: 'assemble',
    how: 'carbon tubes clamped into two plates, a motor bolted at each end with its controller under the arm, the flight controller between the plates and the pack strapped underneath',
    spec: (p) => { const r = n(p, 'rotors'), span = n(p, 'span') / 1000, D = propOf(r, span), kg = droneKg(r, span), h = hover(kg, D, r);
      return `${h.says}. ${endurance(h.wattsAll, droneWh(r, span)).says}. ${HAZARDS.drone!.join('. ')}`; },
    box: (p) => { const span = n(p, 'span'), D = propOf(n(p, 'rotors'), span / 1000) * 1000; return [span + D, 150, span + D]; },
    g: (p) => droneKg(n(p, 'rotors'), n(p, 'span') / 1000) * 1000,
  },
  {
    id: 'hovercraft', look: 'box', name: 'hovercraft', path: 'Mechanical/Vehicles/Hovercraft',
    says: 'a craft that sits on air it makes itself: a lift fan blows into a plenum under the hull, a skirt holds the air in, and a thrust fan with rudders behind it is all the steering there is',
    std: 'Yun & Bliault, Theory and Design of Air Cushion Craft; its sizes those of light craft, its masses estimates',
    axes: [ax('L', 'length', 'm', [3, 4, 5, 6, 8]), bare('seats', 'seats', [1, 2, 4])],
    title: (p) => `hovercraft, ${n(p, 'L')} m, ${n(p, 'seats')} seat${n(p, 'seats') > 1 ? 's' : ''}`,
    of: (p) => `fibreglass neoprene nylon al-6061 al-a380 pu pmma rubber steel-low cast-iron {vpulley SPZ 125mm g2} {vpulley SPZ 200mm g1}`,
    make: 'assemble',
    how: 'a buoyant glass-over-foam hull, a segmented skirt hung round it, a lift fan down into the plenum and a thrust fan on a pylon at the stern',
    spec: (p) => { const L = n(p, 'L'), seats = n(p, 'seats'), W = L * 0.52, kg = hoverAllUp(L, seats);
      const c = cushion(kg, L * W * 0.82, 2 * (L + W) * 0.95, 0.02, { L });
      return `with ${seats} aboard it is ${kg} kg all up. ${c.says}. ${HAZARDS.hovercraft!.join('. ')}`; },
    box: (p) => { const L = n(p, 'L'); return [L, L * 0.62, L * 0.52 + L * 0.15]; },
    g: (p) => hoverKg(n(p, 'L'), n(p, 'seats')) * 1000,
  },
  {
    id: 'jetsuit', look: 'box', name: 'jet suit', path: 'Mechanical/Vehicles/Jet packs',
    says: 'engines a person wears: small kerosene turbines on the back and in the hands, their thrust passing through the body\'s own centre, steered by where the hands point',
    std: 'thrust against weight, and the fuel a micro-turbine burns (about 0.17 kg an hour for each newton: an estimate of the class, not of one engine)',
    // (what thrust goes with a number of engines is not free: the engines, their fuel and the person come to jetKg, and
    //  a suit whose thrust is less than 1.15 of that weight has nothing left to climb or correct with, so it is not
    //  flyable and is not a size of this kind. Two engines fly only at 800 N each; four or five from 400 N up)
    axes: [bare('engines', 'engines', [2, 4, 5]), ax('T', 'thrust an engine', 'N', (p) => [200, 400, 800].filter((T) => hovers(jetKg(n(p, 'engines'), T), T, n(p, 'engines')).ratio >= 1.15))],
    title: (p) => `jet suit, ${n(p, 'engines')} × ${n(p, 'T')} N`,
    of: (p) => `cfrp al-5052 stainless-304 al-7075 al-6061 nylon rubber abs pe {softhose nbr d6 t1.5 1m}*${n(p, 'engines')}`,
    make: 'assemble',
    how: 'a moulded back frame with the tank and pump on it, two engines over the shoulders and one in each hand, every engine fed from the same pump and run by one controller',
    spec: (p) => { const e = n(p, 'engines'), T = n(p, 'T'), kg = jetKg(e, T), h = hovers(kg, T, e);
      return `${h.says}. ${burn(T * e, 0.17, jetFuelKg(e, T)).says}. ${HAZARDS.jetpack!.join('. ')}`; },
    box: () => [900, 1700, 1100],
    g: (p) => (jetKg(n(p, 'engines'), n(p, 'T')) - 90) * 1000,
  },
  {
    id: 'submarine', look: 'box', name: 'small submarine', path: 'Mechanical/Vehicles/Submarines',
    says: 'a pressure hull with people at one atmosphere inside it and the sea outside: it floods ballast to go under, blows it to come up, and may go as deep as its plate allows',
    std: 'Archimedes, and Windenburg & Trilling (Trans. ASME 56, 1934) for the depth a cylinder buckles at',
    axes: [ax('depth', 'rated depth', 'm', [50, 100, 200, 300, 500]), ax('D', 'hull across', 'mm', [1000, 1200, 1600, 2000])],
    title: (p) => `submarine, ${n(p, 'D')} mm hull, ${n(p, 'depth')} m`,
    of: () => 'pressure-shell steel-alloy pmma fibreglass bronze stainless-316 brass abs pu steel-low',
    make: 'weld',
    how: 'a rolled and welded steel cylinder with a hemisphere at each end and ring frames inside it, an acrylic sphere at the bow, saddle tanks either side and a shrouded propeller at the stern',
    spec: (p) => { const depth = n(p, 'depth'), D = n(p, 'D') / 1000, frame = D * 1.7, t = plateFor(depth, D, frame).t;
      return `${hull(depth, D, t, frame).says}. Its ring frames are ${frame.toFixed(2)} m apart, which is what that plate was worked out over. ${HAZARDS.submarine!.join('. ')}`; },
    box: (p) => { const D = n(p, 'D'), frame = D * 1.7, body = frame * 2.4; return [body + D, D * 1.9, D + D * 0.6]; },
    g: (p) => subKg(n(p, 'depth'), n(p, 'D') / 1000) * 1000,
  },
];

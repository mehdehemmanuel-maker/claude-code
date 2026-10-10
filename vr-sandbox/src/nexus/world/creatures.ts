// Creatures as kits (src/nexus/parts/kits.ts): bodies at their real sizes, moving as their size lets them. A walker's speed is
// set by its legs, at the Froude number its gait keeps (v = √(Fr g h), h its hip height: animals of every size walk at
// Fr about 0.25 and trot about 0.6–1; Alexander 1984), its stride rate the speed over its stride. A swimmer's tail beats at
// the Strouhal number fish and whales keep (St = f A / U about 0.2–0.4; Taylor, Nudds & Thomas 2003). A flier's wings are
// as big as its weight asks (lift ½ ρ v² S C_L = weight) and flap at the rate Pennycuick's formula gives for its mass,
// span and area (f = m^(3/8) g^(1/2) b^(−23/24) S^(−1/3) ρ^(−3/8); Pennycuick 2008). A dragon is fiction: this one is
// sized as a real flier of its mass would have to be.

import { addKit, massOf, type Part, type Pick, type V3 } from '../parts/kits';
/** A body's mass as its source gives it: its simple shapes say where the mass is, scaled so the whole weighs what it should. */
function toMass(p: Part, kg: number): Part { const m = massOf(p), k = m > 0 ? kg / m : 1; const walk = (q: Part) => { if (q.mat === 'tissue') q.fill = (q.fill ?? 1) * k; q.parts?.forEach(walk); }; walk(p); return p; }

const G = 9.80665, RHO = 1.225;
const P = (name: string, shape: Part['shape'], at: V3, more: Partial<Part> = {}): Part => ({ name, ...(shape ? { shape } : {}), at, ...more });
/** A leg that swings from its top: an upper and a lower part, so long, so thick, swinging at a point in the stride. */
const leg = (name: string, at: V3, len: number, r: number, color: number, phase: number, amp = 0.45, axis: 'x' | 'z' = 'z'): Part =>
  P(name, undefined, at, { swing: { axis, amp, phase }, parts: [P('upper', { capsule: [r, len * 0.45] }, [0, -len * 0.27, 0], { color, mat: 'tissue' }), P('lower', { capsule: [r * 0.75, len * 0.42] }, [0, -len * 0.73, 0], { color, mat: 'tissue' })] });
/** Walking at a Froude number: v = √(Fr g h). */
export const froudeSpeed = (Fr: number, hip: number, g = G): number => Math.sqrt(Fr * g * hip);
/** Flapping frequency, Pennycuick (2008). */
export const flapRate = (m: number, b: number, S: number, g = G, rho = RHO): number => m ** 0.375 * g ** 0.5 * b ** (-23 / 24) * S ** (-1 / 3) * rho ** -0.375;
/** Wing area to fly level at v with lift coefficient CL: S = 2 m g / (ρ v² CL). */
export const wingArea = (m: number, v: number, CL = 1.6, g = G, rho = RHO): number => (2 * m * g) / (rho * v * v * CL);

// ---- a dog: a golden retriever's shoulder 55–61 cm grown (AKC breed standard), a 3-month puppy's about 35 cm, 30 kg
// and about 12 kg (typical) ----
addKit({
  id: 'dog', name: 'dog', words: /\b(dogs?|pupp(?:y|ies)|golden retrievers?|retrievers?|labradors?|labs?|hounds?|doggo)\b/, says: 'a dog: a golden retriever\'s build at its age, walking and trotting at the speeds its legs give (Froude number), its behaviour a board',
  choices: [{ key: 'age', name: 'age', options: ['puppy', 'young', 'adult'] }, { key: 'coat', name: 'coat', options: ['golden', 'cream', 'red', 'dark gold', 'black', 'chocolate'] }, { key: 'seed', name: 'markings', options: Array.from({ length: 100 }, (_, i) => i) }],
  does: 'follow',
  moves: (c) => { const h = { puppy: 0.3, young: 0.42, adult: 0.55 }[c.age as string]!; return { kind: 'walk', speed: froudeSpeed(0.6, h), freq: froudeSpeed(0.6, h) / (2.2 * h), height: 0, says: `trots at ${froudeSpeed(0.6, h).toFixed(1)} m/s (Froude number 0.6 at a ${(h * 100).toFixed(0)} cm hip)` }; },
  build(c) {
    const s = { puppy: 0.6, young: 0.8, adult: 1 }[c.age as string]!, col = { golden: 0xd8a24a, cream: 0xead8b0, red: 0xb0602a, 'dark gold': 0xa8782a, black: 0x1a1a1a, chocolate: 0x5a3420 }[c.coat as string]!, H = 0.58 * s, L = 0.7 * s, r = 0.14 * s;
    const legs = [[L * 0.38, r * 0.7, 0], [L * 0.38, -r * 0.7, 0.5], [-L * 0.38, r * 0.7, 0.5], [-L * 0.38, -r * 0.7, 0]].map(([x, z, ph], i) => leg(['front left leg', 'front right leg', 'back left leg', 'back right leg'][i]!, [x!, H * 0.95, z!], H * 0.95, 0.035 * s, col, ph!));
    return toMass(P(`${c.age === 'puppy' ? `${c.coat} retriever puppy` : `${c.coat} retriever`}`, undefined, [0, 0, 0], { parts: [
      P('body', { capsule: [r, L * 0.8] }, [0, H * 1.02, 0], { color: col, mat: 'tissue', rot: [0, 0, Math.PI / 2] }),
      P('head', { sphere: r * 0.9 }, [L * 0.6, H * 1.3, 0], { color: col, mat: 'tissue', parts: [P('muzzle', { capsule: [r * 0.38, r * 0.6] }, [r * 0.85, -r * 0.2, 0], { color: col, mat: 'tissue', rot: [0, 0, Math.PI / 2] }), P('nose', { sphere: r * 0.14 }, [r * 1.45, -r * 0.15, 0], { color: 0x1a1a1a, mat: 'tissue' }), ...[1, -1].map((k) => P(k > 0 ? 'left ear' : 'right ear', { box: [r * 0.5, r * 0.9, r * 0.12] }, [-r * 0.1, -r * 0.1, k * r * 0.85], { color: col, mat: 'tissue' })), ...[1, -1].map((k) => P(k > 0 ? 'left eye' : 'right eye', { sphere: r * 0.1 }, [r * 0.7, r * 0.25, k * r * 0.4], { color: 0x2a1a0a, mat: 'tissue' }))] }),
      P('tail', { capsule: [r * 0.18, L * 0.5] }, [-L * 0.62, H * 1.15, 0], { color: col, mat: 'tissue', rot: [0, 0, -0.9], swing: { axis: 'x', amp: 0.5, phase: 0.25 } }),
      ...legs,
    ], says: `${(H * 100).toFixed(0)} cm at the shoulder, about ${({ puppy: 12, young: 22, adult: 30 } as Record<string, number>)[c.age as string]} kg (typical of its age)` }), ({ puppy: 12, young: 22, adult: 30 } as Record<string, number>)[c.age as string]!);
  },
});

// ---- a penguin: an emperor about 1.15 m and 23–45 kg, a king about 0.95 m and 15 kg, an Adélie about 0.7 m and 4.5 kg;
// they waddle at 0.4–0.8 m/s (Griffin & Kram 2000) ----
addKit({
  id: 'penguin', name: 'penguin', words: /\b(penguins?|emperor penguins?|king penguins?|ad[eé]lie)\b/, says: 'a penguin: its species\' height and mass, waddling at the speeds measured (Griffin & Kram 2000)',
  choices: [{ key: 'kind', name: 'species', options: ['emperor', 'king', 'Adélie'] }, { key: 'seed', name: 'posture', options: Array.from({ length: 50 }, (_, i) => i) }],
  does: 'wander',
  moves: (c) => ({ kind: 'waddle', speed: { emperor: 0.6, king: 0.55, 'Adélie': 0.5 }[c.kind as string]!, freq: 1.6, height: 0, says: 'waddles at about 0.5–0.6 m/s, rocking side to side (Griffin & Kram 2000)' }),
  build(c) {
    const H = { emperor: 1.15, king: 0.95, 'Adélie': 0.7 }[c.kind as string]!, r = H * 0.2;
    return toMass(P(`${c.kind} penguin`, undefined, [0, 0, 0], { parts: [
      P('body', { capsule: [r, H * 0.5] }, [0, H * 0.45, 0], { color: 0x1a1c22, mat: 'tissue', swing: { axis: 'x', amp: 0.12, phase: 0 } }),
      P('white front', { capsule: [r * 0.82, H * 0.45] }, [r * 0.25, H * 0.42, 0], { color: 0xf2f2ee, mat: 'tissue' }),
      P('head', { sphere: r * 0.62 }, [0, H * 0.88, 0], { color: 0x1a1c22, mat: 'tissue', parts: [P('beak', { cone: [r * 0.12, r * 0.6] }, [r * 0.75, -r * 0.05, 0], { color: c.kind === 'Adélie' ? 0x2a2a2a : 0xe8902a, mat: 'tissue', rot: [0, 0, -Math.PI / 2] }), ...(c.kind !== 'Adélie' ? [1, -1].map((k) => P('ear patch', { sphere: r * 0.18 }, [r * 0.15, -r * 0.1, k * r * 0.5], { color: 0xf2b830, mat: 'tissue' })) : [])] }),
      ...[1, -1].map((k, i) => P(k > 0 ? 'left flipper' : 'right flipper', { box: [r * 0.3, H * 0.4, r * 0.08] }, [0, H * 0.55, k * r * 1.02], { color: 0x1a1c22, mat: 'tissue', swing: { axis: 'x', amp: 0.35, phase: i * 0.5 } })),
      ...[1, -1].map((k, i) => P(k > 0 ? 'left foot' : 'right foot', { box: [r * 0.6, r * 0.12, r * 0.35] }, [r * 0.15, r * 0.06, k * r * 0.45], { color: 0x3a3030, mat: 'tissue', swing: { axis: 'z', amp: 0.25, phase: i * 0.5 } })),
    ], says: `${(H * 100).toFixed(0)} cm tall, about ${{ emperor: 30, king: 15, 'Adélie': 4.5 }[c.kind as string]} kg` }), { emperor: 30, king: 15, 'Adélie': 4.5 }[c.kind as string]!);
  },
});

// ---- a humpback whale: about 15 m and 30 t grown, a calf 4–5 m (NOAA); cruising at about 2 m/s, its flukes beating at
// a Strouhal number of about 0.3 over a stroke about a fifth of its length ----
addKit({
  id: 'humpback', name: 'whale', words: /\b(whales?|humpbacks?|blue whales?|orcas?|killer whales?)\b/, says: 'a humpback whale: its length and long flippers, its flukes beating at the Strouhal number swimmers keep',
  choices: [{ key: 'age', name: 'age', options: ['calf', 'young', 'adult'] }, { key: 'seed', name: 'markings', options: Array.from({ length: 100 }, (_, i) => i) }],
  does: 'swim past',
  moves: (c) => { const L = { calf: 4.5, young: 9, adult: 15 }[c.age as string]!, U = 2, f = (0.3 * U) / (0.2 * L); return { kind: 'swim', speed: U, freq: f, height: 4, says: `swims at ${U} m/s, its flukes beating ${f.toFixed(2)} times a second (Strouhal 0.3)` }; },
  build(c) {
    const L = { calf: 4.5, young: 9, adult: 15 }[c.age as string]!, r = L * 0.11;
    return toMass(P(`${c.age} humpback whale`, undefined, [0, 0, 0], { parts: [
      P('body', { capsule: [r, L * 0.62] }, [0, 0, 0], { color: 0x2a3440, mat: 'tissue', rot: [0, 0, Math.PI / 2] }),
      P('throat grooves', { capsule: [r * 0.85, L * 0.35] }, [L * 0.12, -r * 0.3, 0], { color: 0xd8d8d0, mat: 'tissue', rot: [0, 0, Math.PI / 2] }),
      ...[1, -1].map((k) => P(k > 0 ? 'left flipper' : 'right flipper', { box: [L * 0.08, L * 0.012, L * 0.3] }, [L * 0.1, -r * 0.4, k * (r + L * 0.14)], { color: 0x3a4450, mat: 'tissue', rot: [0.3 * k, -0.4 * k, 0], swing: { axis: 'x', amp: 0.12, phase: 0 } })),
      P('tail stock', undefined, [-L * 0.36, 0, 0], { swing: { axis: 'z', amp: 0.25, phase: 0 }, parts: [P('flukes', { box: [L * 0.06, L * 0.012, L * 0.3] }, [-L * 0.1, 0, 0], { color: 0x2a3440, mat: 'tissue' }), P('peduncle', { capsule: [r * 0.35, L * 0.12] }, [-L * 0.03, 0, 0], { color: 0x2a3440, mat: 'tissue', rot: [0, 0, Math.PI / 2] })] }),
    ], says: `${L} m long, about ${{ calf: 1, young: 10, adult: 30 }[c.age as string]} t (NOAA)` }), 1000 * { calf: 1, young: 10, adult: 30 }[c.age as string]!);
  },
});

// ---- Tyrannosaurus rex: about 12 m long, hips about 3.1 m up, about 8 t (Hutchinson et al. 2011); walking at Fr 0.25,
// its top speed estimated near 5 m/s (Sellers et al. 2017) ----
addKit({
  id: 't rex', name: 'dinosaur', words: /\b(dinosaurs?|t-?rex|tyrannosaur(?:us)?(?: rex)?|raptors?)\b/, says: 'a Tyrannosaurus rex: its length, hips and mass as estimated from its bones, walking at the speed its legs give',
  choices: [{ key: 'age', name: 'age', options: ['juvenile', 'subadult', 'adult'] }, { key: 'skin', name: 'skin', options: ['olive', 'brown', 'grey', 'mottled'] }],
  does: 'wander',
  moves: (c) => { const h = { juvenile: 1.3, subadult: 2.2, adult: 3.1 }[c.age as string]!; return { kind: 'walk', speed: froudeSpeed(0.25, h), freq: froudeSpeed(0.25, h) / (1.6 * h), height: 0, says: `walks at ${froudeSpeed(0.25, h).toFixed(1)} m/s (Froude 0.25 at ${h} m hips); its top speed was perhaps 5 m/s (Sellers et al. 2017)` }; },
  build(c) {
    const h = { juvenile: 1.3, subadult: 2.2, adult: 3.1 }[c.age as string]!, L = h * 3.9, col = { olive: 0x5a6a3a, brown: 0x6a4a2a, grey: 0x6a6a64, mottled: 0x5a5a3a }[c.skin as string]!, r = h * 0.28;
    return toMass(P(`${c.age} T. rex`, undefined, [0, 0, 0], { parts: [
      P('body', { capsule: [r, L * 0.22] }, [0, h * 1.05, 0], { color: col, mat: 'tissue', rot: [0, 0, Math.PI / 2 + 0.15] }),
      P('neck and head', undefined, [L * 0.2, h * 1.25, 0], { parts: [P('neck', { capsule: [r * 0.45, h * 0.35] }, [0, 0, 0], { color: col, mat: 'tissue', rot: [0, 0, -0.8] }), P('skull', { box: [h * 0.5, h * 0.3, h * 0.24] }, [h * 0.35, h * 0.12, 0], { color: col, mat: 'tissue' }), P('jaw', { box: [h * 0.42, h * 0.08, h * 0.2] }, [h * 0.33, -h * 0.05, 0], { color: col, mat: 'tissue', swing: { axis: 'z', amp: 0.08, phase: 0.2 } })] }),
      P('tail', { cone: [r * 0.8, L * 0.5] }, [-L * 0.33, h * 1.05, 0], { color: col, mat: 'tissue', rot: [0, 0, Math.PI / 2 - 0.05], swing: { axis: 'x', amp: 0.08, phase: 0.25 } }),
      ...[1, -1].map((k, i) => leg(k > 0 ? 'left leg' : 'right leg', [0, h, k * r * 0.7], h, r * 0.32, col, i * 0.5, 0.35)),
      ...[1, -1].map((k) => P(k > 0 ? 'left arm' : 'right arm', { capsule: [r * 0.06, h * 0.25] }, [L * 0.16, h * 1.0, k * r * 0.7], { color: col, mat: 'tissue', rot: [0, 0, -0.6] })),
    ], says: `${L.toFixed(1)} m long, hips ${h} m up, about ${{ juvenile: 0.8, subadult: 3, adult: 8 }[c.age as string]} t (Hutchinson et al. 2011, estimates)` }), 1000 * { juvenile: 0.8, subadult: 3, adult: 8 }[c.age as string]!);
  },
});

// ---- a dragon: fiction, sized to fly. Its wings as big as its weight and a rider's need to fly level at 15 m/s with a
// lift coefficient of 1.6 (a bird's at slow flight, typical), their span six times their mean chord, flapping at
// Pennycuick's rate ----
addKit({
  id: 'dragon', name: 'dragon', words: /\b(dragons?|wyverns?|drakes?)\b/, says: 'a dragon (fiction): its wings as big as real flight would need for its weight and a rider\'s, flapping at the rate Pennycuick\'s formula gives',
  choices: [{ key: 'mass', name: 'mass', options: [150, 300, 500, 800], unit: 'kg' }, { key: 'scales', name: 'scales', options: ['red', 'green', 'black', 'gold', 'blue', 'white'] }, { key: 'rider', name: 'saddle', options: ['yes', 'no'] }],
  does: 'hover',
  moves: (c) => { const m = (c.mass as number) + (c.rider === 'yes' ? 80 : 0), S = wingArea(m, 15), b = Math.sqrt(6 * S); return { kind: 'fly', speed: 15, freq: flapRate(m, b, S), height: 4, says: `flies at 15 m/s on ${S.toFixed(0)} m² of wing, ${b.toFixed(1)} m across, flapping ${flapRate(m, b, S).toFixed(2)} times a second (Pennycuick 2008)` }; },
  build(c) {
    const m = (c.mass as number) + (c.rider === 'yes' ? 80 : 0), S = wingArea(m, 15), b = Math.sqrt(6 * S), chord = S / b, col = { red: 0x8a1a14, green: 0x2a5a2a, black: 0x1a1a1e, gold: 0xb08a2a, blue: 0x1a3a7a, white: 0xd8d8d0 }[c.scales as string]!;
    const L = Math.cbrt((c.mass as number) / 1000) * 5, r = L * 0.09;
    return toMass(P(`${c.scales} dragon (fiction, sized to fly)`, undefined, [0, 0, 0], { parts: [
      P('body', { capsule: [r, L * 0.35] }, [0, L * 0.35, 0], { color: col, mat: 'tissue', rot: [0, 0, Math.PI / 2] }),
      P('neck and head', undefined, [L * 0.3, L * 0.42, 0], { parts: [P('neck', { capsule: [r * 0.4, L * 0.25] }, [L * 0.06, L * 0.08, 0], { color: col, mat: 'tissue', rot: [0, 0, -0.9] }), P('head', { box: [L * 0.16, L * 0.08, L * 0.08] }, [L * 0.2, L * 0.17, 0], { color: col, mat: 'tissue' }), ...[1, -1].map((k) => P('horn', { cone: [L * 0.012, L * 0.07] }, [L * 0.15, L * 0.24, k * L * 0.03], { color: 0xe8e0c8, mat: 'tissue', rot: [0, 0, 0.6] }))] }),
      P('tail', { cone: [r * 0.6, L * 0.6] }, [-L * 0.48, L * 0.35, 0], { color: col, mat: 'tissue', rot: [0, 0, Math.PI / 2], swing: { axis: 'x', amp: 0.15, phase: 0.25 } }),
      ...[1, -1].map((k) => P(k > 0 ? 'left wing' : 'right wing', undefined, [L * 0.05, L * 0.45, k * r], { swing: { axis: 'x', amp: 0.6 * k, phase: 0 }, parts: [P('membrane', { box: [chord, 0.02, b / 2] }, [0, 0, k * b / 4], { color: col, mat: 'tissue', says: `${(S / 2).toFixed(1)} m² each` }), P('wing bone', { capsule: [r * 0.12, b / 2] }, [chord / 2, 0.02, k * b / 4], { color: col, mat: 'tissue', rot: [Math.PI / 2, 0, 0] })] })),
      ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z], i) => leg(['front left leg', 'front right leg', 'back left leg', 'back right leg'][i]!, [x! * L * 0.2, L * 0.32, z! * r * 0.8], L * 0.32, r * 0.25, col, i % 2 ? 0.5 : 0, 0.2)),
      ...(c.rider === 'yes' ? [P('saddle', { box: [L * 0.18, r * 0.25, r * 1.4] }, [L * 0.05, L * 0.35 + r, 0], { color: 0x5a3420, mat: 'leather' })] : []),
    ], says: `${c.mass} kg${c.rider === 'yes' ? ' and a rider of 80 kg' : ''}: wings of ${S.toFixed(0)} m², ${b.toFixed(1)} m across (the heaviest real fliers, pterosaurs like Quetzalcoatlus, were about 200–250 kg on wings about 10–11 m across, estimates)` }), c.mass as number);
  },
});

/** How far a creature's legs and wings go round in a stride (0–1), and so how each swinging part is turned now. */
export const swingAt = (s: NonNullable<Part['swing']>, t: number, freq: number): number => s.amp * Math.sin(2 * Math.PI * (freq * t + s.phase));
export type { Pick };

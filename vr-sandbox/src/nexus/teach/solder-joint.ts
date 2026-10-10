// A through-hole solder joint as it is made by hand: the iron's tip heating a pad and the pin through it, solder fed to
// them melting and flowing when they are hot enough and not when they are not, and the joint it leaves judged by what
// IPC-A-610 looks for (its hole filled, its fillet concave, wetting pad and pin) and by the faults a beginner makes: too
// little, too much, cold (fed before the joint was hot, or melted on the tip and dropped), overheated (held hot too
// long). Heat by lumped capacities and conductances (an estimate of each, said so, chosen so a 330 °C tip brings a
// header pin's joint to the solder's liquidus in about a second through a wetted contact, as the guides say it should,
// and barely ever through a dry one): what the forge's soldering lesson runs, a joint at a time.
// Owner of: the joint's heat, its solder, and its grade.

/** A solder alloy: where it starts and ends melting (°C), its density (g/cm³), its specific and latent heat. */
export interface Alloy { name: string; solidus: number; liquidus: number; rho: number; c: number; L: number; src: string }
export const ALLOYS: Record<string, Alloy> = {
  // (60/40 tin-lead: Adafruit's reel; SAC305 the lead-free one; their heats from the alloys' handbooks, typical)
  Sn60Pb40: { name: '60/40 tin-lead', solidus: 183, liquidus: 190, rho: 8.5, c: 0.18, L: 37, src: '183–190 °C (Kester\'s alloy table); 8.5 g/cm³; c 0.18 J/g·K, L 37 J/g (typical)' },
  Sn63Pb37: { name: '63/37 tin-lead (eutectic)', solidus: 183, liquidus: 183, rho: 8.4, c: 0.18, L: 37, src: '183 °C eutectic; typical heats' },
  SAC305: { name: 'SAC305 (lead-free)', solidus: 217, liquidus: 220, rho: 7.4, c: 0.23, L: 61, src: '217–220 °C; 7.4 g/cm³; c 0.23 J/g·K, L 61 J/g (typical)' },
};

/** A through-hole joint's geometry, mm: its board's thickness, its hole, its pad's diameter, its pin's side (square) or,
 *  round, its lead's diameter. */
export interface JointShape { board: number; hole: number; pad: number; pin: number; round?: boolean; src: string }
/** A Raspberry Pi Pico's pin in a 2.54 mm header: its board 1 mm thick (its datasheet), holes 1.02 mm in 1.7 mm pads
 *  (Raspberry Pi's own footprint of it), the header's pin 0.64 mm square (the 0.025" standard). */
export const PICO_PIN: JointShape = { board: 1.0, hole: 1.02, pad: 1.7, pin: 0.64, src: 'Pico datasheet: a 1 mm board; Raspberry Pi\'s Pico footprint (RPi_Pico_SMD_TH): 1.02 mm holes in 1.7 mm pads; a 0.64 mm square header pin' };

/** The solder a good joint holds, mm³: the hole round the pin filled, and a concave fillet over the pad from its rim up
 *  the pin (a cone's frustum less the pin, its height a pad's radius: IPC-A-610's "wets the pin and the pad, concave"). */
export function idealVolume(s: JointShape): number {
  const pinA = s.round ? (Math.PI / 4) * s.pin * s.pin : s.pin * s.pin, hole = (Math.PI / 4) * s.hole * s.hole * s.board - pinA * s.board;
  const R = s.pad / 2, r = s.round ? s.pin / 2 : s.pin / 2 * Math.SQRT2 * 0.8, h = R * 0.9, cone = (Math.PI * h / 3) * (R * R + R * r + r * r) - pinA * h;
  // (a concave fillet is a cone's frustum less the hollow of its curve: about 60 % of it, typical)
  return hole + cone * 0.6;
}

/** The heat model's figures: the joint's capacity, the tip-to-joint conductance wet and dry, and its loss to the
 *  board and the pin's far end (an estimate of each, see the head of the file). */
export const HEAT = { C: 0.06, gWet: 0.05, gDry: 0.015, gLoss: 0.012, ambient: 25 } as const;

/** What happened to a joint so far: its temperature, the solder in it, what was fed cold, its time over-hot. */
export interface JointState { T: number; solder: number; cold: number; dropped: number; hotFor: number; peak: number; wetted: boolean; t: number }
export const freshJoint = (ambient: number = HEAT.ambient): JointState => ({ T: ambient, solder: 0, cold: 0, dropped: 0, hotFor: 0, peak: ambient, wetted: false, t: 0 });

/** What the hands are doing this moment: whether the tip touches the joint, its temperature, whether there is molten
 *  solder on the tip between them (it carries the heat across), and how much solder (mm³) is pushed onto the joint. */
export interface Hands { touching: boolean; tip: number; tinned: boolean; feed: number }

/** One step of dt s: heat flows in from the tip and out to the board; solder fed to a joint above its liquidus melts and
 *  joins it (wetting it), fed below its solidus it does not (it sits on top, cold, or, touching the iron, melts there
 *  and drops); a joint held above 300 °C counts its seconds (the pad's adhesive and the flux suffer past 3–5 s:
 *  IPC-7711 and the guides' "a few seconds", typical). */
export function step(j: JointState, h: Hands, dt: number, a: Alloy = ALLOYS.Sn60Pb40!): JointState {
  const g = h.touching ? (h.tinned || j.wetted ? HEAT.gWet : HEAT.gDry) : 0;
  const q = g * (h.tip - j.T) - HEAT.gLoss * (j.T - HEAT.ambient), T = j.T + (q / HEAT.C) * dt;
  const n: JointState = { ...j, T, t: j.t + dt, peak: Math.max(j.peak, T) };
  if (h.feed > 0) {
    if (T >= a.liquidus) { n.solder += h.feed; n.wetted = true; }
    else if (h.touching && T < a.solidus) n.dropped += h.feed; // (onto the hot tip: it melts there and balls, the joint not hot)
    else n.cold += h.feed;
  }
  // (what sat on it unmelted, or balled on it off the iron, flows in and wets it once the iron has the joint itself past
  // the liquidus: a cold joint reheated until it flows is mended, as the guides say)
  if (h.touching && T >= a.liquidus && n.cold + n.dropped > 0) { n.solder += n.cold + n.dropped; n.cold = 0; n.dropped = 0; n.wetted = true; }
  if (T > 300) n.hotFor += dt;
  return n;
}

export type Grade = 'good' | 'too little' | 'too much' | 'cold' | 'overheated' | 'not soldered';
/** A joint judged as IPC-A-610 would a Class 2 one: its fill against the good volume (75 % up to the fillet's top: an
 *  amount under 60 % is too little, over 160 % a ball, too much), solder that never wet it (cold), its time over 300 °C
 *  past 5 s (overheated); and what to do about it. */
export function grade(j: JointState, s: JointShape = PICO_PIN): { grade: Grade; fill: number; says: string } {
  const v = idealVolume(s), fill = j.solder / v;
  if (j.solder <= 0 && j.cold + j.dropped <= 0) return { grade: 'not soldered', fill: 0, says: 'no solder on it yet: heat the pad and the pin together, then feed solder to them' };
  if (j.hotFor > 5) return { grade: 'overheated', fill, says: `held over 300 °C for ${j.hotFor.toFixed(1)} s: the flux burns off and the pad can lift; a second or two at the joint is enough` };
  if (j.cold > 0.25 * v || (j.solder < 0.3 * v && j.dropped > 0)) return { grade: 'cold', fill, says: 'the solder was fed before the joint was hot: it sat on it (dull, lumpy) or melted on the iron and dropped. Heat the pad and pin first, feed the solder to them, not to the iron' };
  if (fill < 0.6) return { grade: 'too little', fill, says: `about ${Math.round(fill * 100)} % of a full joint: feed a little more while it is hot, until the hole fills and the fillet reaches up the pin` };
  if (fill > 1.6) return { grade: 'too much', fill, says: `about ${Math.round(fill * 100)} % of a full joint: a ball, not a cone; it can hide a joint that never wet. Take the excess off with wick or a clean tip` };
  return { grade: 'good', fill, says: `filled (${Math.round(fill * 100)} %), wetting the pad and the pin in a concave cone: a good joint` };
}

/** How long a joint takes to reach its alloy's liquidus from cold with the tip held to it, s (Infinity if it never
 *  does): what the lesson tells you to wait for. */
export function timeToMelt(tip: number, tinned: boolean, a: Alloy = ALLOYS.Sn60Pb40!): number {
  const g = tinned ? HEAT.gWet : HEAT.gDry, Tss = (g * tip + HEAT.gLoss * HEAT.ambient) / (g + HEAT.gLoss), tau = HEAT.C / (g + HEAT.gLoss);
  if (Tss <= a.liquidus) return Infinity;
  return -tau * Math.log(1 - (a.liquidus - HEAT.ambient) / (Tss - HEAT.ambient));
}

// The workshop corner: a 3D printer that runs G-code, a slicer that makes the G-code, a kiln and a crucible furnace,
// the lost-PLA casting process that joins them, a rack of parts with their datasheet numbers, and recipes the arms
// put together from what is printed, cast and taken off the rack.
//
// The printer reads the commands a Marlin firmware reads (G0/G1 moves, G28 home, G90/G91, G92, M82/M83, M104/M109
// hot end, M140/M190 bed, M106/M107 fan, G4 dwell, M84, M117), moves each with a trapezoidal profile, heats its hot end
// and bed as bodies with a heat capacity, a heater and losses, and will not extrude below 170 °C (Marlin's
// EXTRUDE_MINTEMP: "cold extrusion prevented"). What it extrudes is laid down as beads, layer on layer.
// Casting is lost-PLA investment casting, as makers do it: the printed pattern, with a sprue, is set in a flask of
// gypsum investment; the kiln burns the PLA out on a standard gypsum-investment schedule (Kerr Satin Cast: 300 °F 1 h,
// 700 °F 2 h, 1350 °F 3 h, i.e. 149, 371, 732 °C); the metal is melted in a crucible and poured into the hot flask; it
// freezes by giving up its latent heat; the flask is quenched and the investment breaks away.
//
// Numbers marked "estimate" are this model's, chosen in the range such machines have; the rest are the materials'
// handbook values and the parts' datasheet values. Time can be sped up (a print takes hours, a burnout a day); the
// speed is always said.

import type { Board } from './boards';

// ==== the printer =====================================================================================================
export const FILAMENT_D = 1.75, PLA_DENSITY = 1.24, EXTRUDE_MINTEMP = 170;
export interface Heater { t: number; target: number; P: number; C: number; h: number; ki: number; i: number }
const heater = (P: number, C: number, h: number): Heater => ({ t: 20, target: 0, P, C, h, ki: 0, i: 0 });
/** dt s of a heater: its power set by a PI loop toward its target, less what it loses to the room at 20 °C. */
function heat(x: Heater, dt: number, extraLoss = 0): number {
  const steps = Math.max(1, Math.ceil(dt / 0.25)), d = dt / steps; let used = 0;
  for (let k = 0; k < steps; k++) {
    const err = x.target - x.t; if (x.target > 0) x.i = Math.max(0, Math.min(x.P, x.i + err * 0.4 * d)); else x.i = 0;
    const p = x.target > 0 ? Math.max(0, Math.min(x.P, err * x.P * 0.2 + x.i)) : 0;
    x.t += ((p - (x.h + extraLoss) * (x.t - 20)) * d) / x.C; used += p * d;
  }
  return used;
}
/** A bead laid down: from one point to another at a height (mm, on the bed, the bed's front left corner the origin). */
export interface Bead { x0: number; y0: number; x1: number; y1: number; z: number; w: number; h: number }
interface Move { from: [number, number, number, number]; to: [number, number, number, number]; len: number; v: number; T: number; t: number; extrude: boolean }
/** A trapezoidal move: how long it takes over L at top speed v and acceleration a, and how far it is at time t. */
export function trapezoid(L: number, v: number, a: number): { T: number; at(t: number): number } {
  if (L <= 0) return { T: 0, at: () => 0 };
  const tri = L < (v * v) / a, vp = tri ? Math.sqrt(L * a) : v, ta = vp / a, tc = tri ? 0 : (L - (v * v) / a) / v, T = 2 * ta + tc;
  return { T, at: (t) => { if (t <= 0) return 0; if (t >= T) return L; if (t < ta) return 0.5 * a * t * t; if (t < ta + tc) return 0.5 * a * ta * ta + vp * (t - ta); const r = T - t; return L - 0.5 * a * r * r; } };
}
export class Printer {
  /** Its build volume (mm), and its acceleration (mm/s², estimate: a common print acceleration). */
  static readonly BED = { x: 220, y: 220, z: 250 }; static readonly ACCEL = 1000;
  pos: [number, number, number, number] = [0, 0, 0, 0];
  abs = true; absE = true; f = 1800; fan = 0; homed = false;
  /** Hot end: a 40 W cartridge in a block of about 15 J/K; bed: 220 W under an aluminium plate of about 400 J/K (estimates). */
  hot = heater(40, 15, 0.075); bed = heater(220, 400, 1.5);
  beads: Bead[] = []; log: string[] = []; done = 0; total = 0; error: string | null = null; message = '';
  waiting: 'hot' | 'bed' | 'dwell' | null = null; private dwell = 0;
  private queue: string[] = []; private cur: (Move & { prof: ReturnType<typeof trapezoid> }) | null = null; private lastZ = 0;
  /** filament used (mm) and energy drawn (J) */ filament = 0; energy = 0; printTime = 0;
  get busy(): boolean { return !!this.cur || this.queue.length > 0 || this.waiting !== null; }
  /** Where the nozzle is now, mid-move. */
  nozzle(): [number, number, number] { const c = this.cur; if (!c) return [this.pos[0], this.pos[1], this.pos[2]]; const u = c.len ? c.prof.at(c.t) / c.len : 1; return [c.from[0] + (c.to[0] - c.from[0]) * u, c.from[1] + (c.to[1] - c.from[1]) * u, c.from[2] + (c.to[2] - c.from[2]) * u]; }
  /** The bead being laid now, as far as it has gone. */
  laying(): Bead | null { const c = this.cur; if (!c?.extrude) return null; const n = this.nozzle(); return { x0: c.from[0], y0: c.from[1], x1: n[0], y1: n[1], z: c.to[2], w: 0.45, h: Math.max(0.05, c.to[2] - this.lastZ || 0.2) }; }
  /** G-code to run, a line at a time, after what is queued. */
  load(gcode: string): void { const ls = gcode.split(/\r?\n/).map((l) => l.replace(/;.*$/, '').trim()).filter(Boolean); this.queue.push(...ls); this.total += ls.length; this.error = null; }
  stop(why = 'stopped'): void { this.queue = []; this.cur = null; this.waiting = null; this.hot.target = 0; this.bed.target = 0; this.fan = 0; this.say(why); }
  clearBed(): Bead[] { const b = this.beads; this.beads = []; return b; }
  private say(s: string): void { this.log.push(s); if (this.log.length > 60) this.log.shift(); }
  /** dt s on: heaters, then the moves and commands, as many as fit in dt. */
  step(dt: number): void {
    this.energy += heat(this.hot, dt, this.fan * 0.05) + heat(this.bed, dt);
    if (this.busy) this.printTime += dt;
    let left = dt;
    for (let guard = 0; left > 0 && guard < 5000; guard++) {
      if (this.waiting === 'hot') { if (Math.abs(this.hot.t - this.hot.target) <= 2) this.waiting = null; else return; }
      if (this.waiting === 'bed') { if (Math.abs(this.bed.t - this.bed.target) <= 2) this.waiting = null; else return; }
      if (this.waiting === 'dwell') { this.dwell -= left; if (this.dwell > 0) return; left = -this.dwell; this.waiting = null; }
      if (this.cur) {
        const c = this.cur, need = c.T - c.t;
        if (need > left) { c.t += left; return; }
        left -= need; this.finishMove(); continue;
      }
      const line = this.queue.shift(); if (line === undefined) return;
      this.done++; this.exec(line);
    }
  }
  private finishMove(): void {
    const c = this.cur!; this.pos = [...c.to];
    if (c.extrude) { this.beads.push({ x0: c.from[0], y0: c.from[1], x1: c.to[0], y1: c.to[1], z: c.to[2], w: 0.45, h: Math.max(0.05, Math.min(0.4, c.to[2] - this.lastZBelow(c.to[2]))) }); }
    this.cur = null;
  }
  private lastZBelow(z: number): number { if (z - this.lastZ > 1e-6) return this.lastZ; return Math.max(0, z - 0.2); }
  private exec(line: string): void {
    const w = line.toUpperCase().split(/\s+/), cmd = w[0]!, arg = (k: string) => { const t = w.find((x) => x[0] === k); return t ? Number(t.slice(1)) : undefined; };
    switch (cmd) {
      case 'G0': case 'G1': {
        if (!this.homed) { this.say(`${line}: not homed (G28 first) — skipped`); return; }
        const to: [number, number, number, number] = [...this.pos];
        (['X', 'Y', 'Z', 'E'] as const).forEach((k, i) => { const v = arg(k); if (v !== undefined && !Number.isNaN(v)) to[i] = (i === 3 ? this.absE : this.abs) ? v : this.pos[i]! + v; });
        const F = arg('F'); if (F) this.f = F;
        to[0] = Math.max(0, Math.min(Printer.BED.x, to[0])); to[1] = Math.max(0, Math.min(Printer.BED.y, to[1])); to[2] = Math.max(0, Math.min(Printer.BED.z, to[2]));
        let extrude = to[3] > this.pos[3] + 1e-9;
        if (extrude && this.hot.t < EXTRUDE_MINTEMP) { this.say(`cold extrusion prevented (${Math.round(this.hot.t)} °C < ${EXTRUDE_MINTEMP} °C)`); extrude = false; }
        if (extrude) this.filament += to[3] - this.pos[3];
        if (to[2] > this.pos[2] + 1e-6) this.lastZ = this.pos[2];
        const len = Math.hypot(to[0] - this.pos[0], to[1] - this.pos[1], to[2] - this.pos[2]), v = Math.max(1, this.f / 60);
        // a move with no travel still pushes filament: its time is the filament's at the same speed
        const L = len || Math.abs(to[3] - this.pos[3]), prof = trapezoid(L, v, Printer.ACCEL);
        this.cur = { from: [...this.pos], to, len, v, T: prof.T, t: 0, extrude: extrude && len > 0, prof }; return;
      }
      case 'G4': { const p = arg('P'), s2 = arg('S'); this.dwell = (p ?? 0) / 1000 + (s2 ?? 0); this.waiting = 'dwell'; return; }
      case 'G28': this.pos = [0, 0, 0, this.pos[3]]; this.homed = true; this.say('homed X Y Z'); return;
      case 'G90': this.abs = true; this.absE = true; return;
      case 'G91': this.abs = false; this.absE = false; return;
      case 'M82': this.absE = true; return;
      case 'M83': this.absE = false; return;
      case 'G92': (['X', 'Y', 'Z', 'E'] as const).forEach((k, i) => { const v = arg(k); if (v !== undefined) this.pos[i] = v; }); return;
      case 'M104': case 'M109': { const s2 = arg('S') ?? 0; if (s2 > 275) { this.say(`${line}: past the hot end's 275 °C limit — capped`); } this.hot.target = Math.min(275, s2); if (cmd === 'M109' && this.hot.target > 0) { this.waiting = 'hot'; this.say(`heating the hot end to ${this.hot.target} °C`); } return; }
      case 'M140': case 'M190': { const s2 = arg('S') ?? 0; this.bed.target = Math.min(110, s2); if (cmd === 'M190' && this.bed.target > 0) { this.waiting = 'bed'; this.say(`heating the bed to ${this.bed.target} °C`); } return; }
      case 'M106': this.fan = Math.max(0, Math.min(1, (arg('S') ?? 255) / 255)); return;
      case 'M107': this.fan = 0; return;
      case 'M84': case 'M18': this.homed = false; this.say('motors off'); return;
      case 'M117': this.message = line.slice(4).trim(); return;
      default: this.say(`${line}: unknown command — skipped`);
    }
  }
  /** Grams of PLA it has laid down. */
  grams(): number { return (this.filament * Math.PI * (FILAMENT_D / 2) ** 2 * PLA_DENSITY) / 1000; }
}

// ==== the slicer ======================================================================================================
export type Pt = [number, number];
/** A section of a part: an outline and its holes (mm, round the part's middle), between two heights. */
export interface Section { outline: Pt[]; holes?: Pt[][]; z0: number; z1: number }
export const shapes = {
  rect: (w: number, d: number): Pt[] => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]],
  circle: (r: number, n = 48): Pt[] => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)] as Pt),
  /** A spur gear's outline: teeth of a module m (tip m above the pitch circle, root 1.25 m below), straight-flanked. */
  gear: (teeth: number, m: number): Pt[] => { const rp = (teeth * m) / 2, ra = rp + m, rf = rp - 1.25 * m, out: Pt[] = []; for (let i = 0; i < teeth; i++) { const a = (2 * Math.PI * i) / teeth, s = Math.PI / teeth; for (const [r, da] of [[rf, -s * 0.55], [ra, -s * 0.25], [ra, s * 0.25], [rf, s * 0.55]] as const) out.push([r * Math.cos(a + da), r * Math.sin(a + da)]); } return out; },
  hexagon: (r: number): Pt[] => shapes.circle(r, 6),
};
/** A polygon moved in (d > 0) or out along each corner's bisector (good for convex outlines and gentle teeth). */
export function inset(p: Pt[], d: number): Pt[] {
  const n = p.length, area = p.reduce((a, q, i) => a + q[0] * p[(i + 1) % n]![1] - p[(i + 1) % n]![0] * q[1], 0), s = area > 0 ? 1 : -1;
  return p.map((q, i) => {
    const a = p[(i + n - 1) % n]!, b = p[(i + 1) % n]!;
    const n1 = norm([-(q[1] - a[1]) * s, (q[0] - a[0]) * s]), n2 = norm([-(b[1] - q[1]) * s, (b[0] - q[0]) * s]), m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const k = d / Math.max(0.25, m[0] * n1[0] + m[1] * n1[1]); return [q[0] + m[0] * k, q[1] + m[1] * k] as Pt;
  });
}
const norm = (v: Pt): Pt => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
/** Lines at an angle across a region (an outline less its holes), every `gap` mm: the even-odd scanline fill. */
export function fillLines(outline: Pt[], holes: Pt[][], angle: number, gap: number): [Pt, Pt][] {
  const c = Math.cos(-angle), s = Math.sin(-angle), rot = (q: Pt): Pt => [q[0] * c - q[1] * s, q[0] * s + q[1] * c], back = (q: Pt): Pt => [q[0] * c + q[1] * s, -q[0] * s + q[1] * c];
  const polys = [outline, ...holes].map((p) => p.map(rot)), ys = polys.flat().map((q) => q[1]);
  const out: [Pt, Pt][] = []; let flip = false;
  for (let y = Math.min(...ys) + gap / 2; y < Math.max(...ys); y += gap) {
    const xs: number[] = [];
    for (const p of polys) for (let i = 0; i < p.length; i++) { const a = p[i]!, b = p[(i + 1) % p.length]!; if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((u, v) => u - v);
    const segs: [Pt, Pt][] = []; for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1]! - xs[i]! > 0.3) segs.push([back([xs[i]!, y]), back([xs[i + 1]!, y])]);
    if (flip) segs.reverse().forEach((sg) => sg.reverse()); flip = !flip; out.push(...segs);
  }
  return out;
}
export interface SliceOptions { layer: number; width: number; infill: number; perimeters: number; solid: number; speed: number; travel: number; hot: number; bed: number; at: [number, number] }
export const SLICE0: SliceOptions = { layer: 0.2, width: 0.45, infill: 0.2, perimeters: 2, solid: 3, speed: 50, travel: 150, hot: 210, bed: 60, at: [110, 110] };
/** A part's sections sliced into G-code for PLA: heat, home, a purge line, then each layer's perimeters and fill
 *  (solid at the bottom and top, a fill of the given density between), then cool and park. */
export function slice(sections: Section[], o: Partial<SliceOptions> = {}): { gcode: string; layers: number; filament: number; grams: number; estimate: number } {
  const p = { ...SLICE0, ...o }, top = Math.max(...sections.map((x) => x.z1)), L: string[] = [];
  const eOf = (len: number) => (len * p.width * p.layer) / (Math.PI * (FILAMENT_D / 2) ** 2);
  let e = 0, x = 0, y = 0, time = 0;
  const travel = (q: Pt) => { const nx = q[0] + p.at[0], ny = q[1] + p.at[1]; time += Math.hypot(nx - x, ny - y) / p.travel; x = nx; y = ny; L.push(`G0 X${nx.toFixed(2)} Y${ny.toFixed(2)} F${p.travel * 60}`); };
  const draw = (q: Pt) => { const nx = q[0] + p.at[0], ny = q[1] + p.at[1], d = Math.hypot(nx - x, ny - y); e += eOf(d); time += d / p.speed; x = nx; y = ny; L.push(`G1 X${nx.toFixed(2)} Y${ny.toFixed(2)} E${e.toFixed(4)} F${p.speed * 60}`); };
  const loop = (poly: Pt[]) => { travel(poly[0]!); for (let i = 1; i <= poly.length; i++) draw(poly[i % poly.length]!); };
  L.push('; sliced by the forge: PLA', `M140 S${p.bed}`, `M104 S${p.hot}`, 'G28', `M190 S${p.bed}`, `M109 S${p.hot}`, 'G90', 'M82', 'G92 E0', 'G1 Z0.3 F600', 'G1 X5 Y5 F6000', `G1 X5 Y100 E${(e = eOf(95) * 1.5).toFixed(4)} F1200`, 'M106 S255');
  y = 100; x = 5;
  const n = Math.round(top / p.layer);
  for (let k = 1; k <= n; k++) {
    const z = +(k * p.layer).toFixed(3), sec = sections.filter((q) => z > q.z0 + 1e-6 && z <= q.z1 + 1e-6); if (!sec.length) continue;
    L.push(`; layer ${k} of ${n}`, `G1 Z${z.toFixed(2)} F600`);
    // solid where there is nothing over it within `solid` layers, or nothing under it
    const solid = k <= p.solid || k > n - p.solid || sections.some((q) => Math.abs(q.z1 - z) < p.solid * p.layer - 1e-6 || Math.abs(q.z0 + p.layer - z) < p.solid * p.layer - 1e-6);
    for (const sc of sec) {
      for (let r = 0; r < p.perimeters; r++) { loop(inset(sc.outline, p.width * (r + 0.5))); for (const h of sc.holes ?? []) loop(inset(h, -p.width * (r + 0.5))); }
      const inner = inset(sc.outline, p.width * p.perimeters), holes = (sc.holes ?? []).map((h) => inset(h, -p.width * p.perimeters));
      for (const [a, b] of fillLines(inner, holes, (k % 2 ? 1 : -1) * Math.PI / 4, solid ? p.width : p.width / p.infill)) { travel(a); draw(b); }
    }
  }
  L.push('M107', 'M104 S0', 'M140 S0', `G1 Z${Math.min(Printer.BED.z, top + 10).toFixed(1)} F600`, 'G1 X0 Y200 F6000', 'M84', 'M117 Print done');
  const filament = e, grams = (filament * Math.PI * (FILAMENT_D / 2) ** 2 * PLA_DENSITY) / 1000;
  return { gcode: L.join('\n'), layers: n, filament, grams, estimate: time };
}

// ==== heat for metal: the kiln and the crucible furnace ===============================================================
/** A metal: where it melts (°C), its heat capacities solid and liquid (J/g·K), heat of fusion (J/g), density (g/cm³),
 *  and the range it is poured at (°C). Handbook values for the pure metal (aluminium for A356's heat, tin for pewter). */
export interface Metal { id: string; name: string; melt: number; cs: number; cl: number; L: number; rho: number; pour: [number, number]; shrink: number }
export const METALS: Metal[] = [
  { id: 'aluminium', name: 'aluminium', melt: 660.3, cs: 0.897, cl: 1.18, L: 397, rho: 2.7, pour: [700, 760], shrink: 0.066 },
  { id: 'zinc', name: 'zinc', melt: 419.5, cs: 0.388, cl: 0.48, L: 112, rho: 7.14, pour: [440, 480], shrink: 0.047 },
  { id: 'tin', name: 'tin (pewter)', melt: 231.9, cs: 0.227, cl: 0.25, L: 59.2, rho: 7.29, pour: [260, 300], shrink: 0.028 },
  { id: 'bronze', name: 'tin bronze', melt: 1000, cs: 0.38, cl: 0.46, L: 190, rho: 8.8, pour: [1100, 1150], shrink: 0.05 },
];
export interface Charge { metal: Metal; g: number; H: number }
/** The temperature and how much is liquid, of a charge of metal from its heat content (J above 20 °C). */
export function stateOf(c: Charge): { T: number; liquid: number } {
  const m = c.metal, Hs = c.g * m.cs * (m.melt - 20), Hl = Hs + c.g * m.L;
  if (c.H <= Hs) return { T: 20 + c.H / (c.g * m.cs), liquid: 0 };
  if (c.H <= Hl) return { T: m.melt, liquid: (c.H - Hs) / (c.g * m.L) };
  return { T: m.melt + (c.H - Hl) / (c.g * m.cl), liquid: 1 };
}
export const heatTo = (m: Metal, g: number, T: number): number => { const c: Charge = { metal: m, g, H: 0 }; const Hs = g * m.cs * (m.melt - 20); if (T <= m.melt) return g * m.cs * (T - 20); c.H = Hs + g * m.L + g * m.cl * (T - m.melt); return c.H; };
/** A segment of a kiln's program: up (or down) to a temperature at a rate (°C/h), then held so many hours. */
export interface Segment { to: number; rate: number; hold: number }
/** The standard gypsum-investment burnout for PLA, then down to the flask temperature aluminium is poured into. */
export const BURNOUT: Segment[] = [{ to: 149, rate: 300, hold: 1 }, { to: 371, rate: 300, hold: 2 }, { to: 732, rate: 300, hold: 3 }, { to: 480, rate: 300, hold: 1 }];
/** An electric kiln: 1.8 kW in a chamber of about 12 kJ/K losing 1.4 W/K (estimates: a small burnout kiln). */
export class Kiln {
  t = 20; P = 1800; C = 12000; h = 1.4; set = 20; open = false;
  program: Segment[] = []; seg = 0; holding = 0; energy = 0; contents: string | null = null;
  run(p: Segment[]): void { this.program = p.map((s) => ({ ...s })); this.seg = 0; this.holding = 0; this.set = this.t; }
  get running(): boolean { return this.seg < this.program.length; }
  /** What it is doing, in words. */
  says(): string { const s = this.program[this.seg]; if (!s) return `${Math.round(this.t)} °C, idle`; return Math.abs(this.set - s.to) > 0.5 ? `${Math.round(this.t)} °C, ramping to ${s.to} °C at ${s.rate} °C/h` : `${Math.round(this.t)} °C, holding ${s.to} °C (${(s.hold - this.holding / 3600).toFixed(1)} h left)`; }
  step(dt: number): void {
    const s = this.program[this.seg];
    if (s) { const dir = Math.sign(s.to - this.set), d = (s.rate / 3600) * dt; this.set = dir > 0 ? Math.min(s.to, this.set + d) : Math.max(s.to, this.set - d); if (this.set === s.to && Math.abs(this.t - s.to) < 8) { this.holding += dt; if (this.holding >= s.hold * 3600) { this.seg++; this.holding = 0; } } }
    else this.set = 20;
    const steps = Math.max(1, Math.ceil(dt / 2)), d2 = dt / steps;
    for (let k = 0; k < steps; k++) { const p = this.set > 20 ? Math.max(0, Math.min(this.P, (this.set - this.t) * 60 + this.h * (this.set - 20))) : 0; this.t += ((p - (this.h + (this.open ? 6 : 0)) * (this.t - 20)) * d2) / this.C; this.energy += p * d2; }
  }
}
/** A propane crucible furnace: a burner of about 15 kW, a third of it kept in a lined chamber of about 8 kJ/K that loses
 *  3.5 W/K through its walls; the crucible takes heat from the chamber across about 8 W/K (estimates, of a small hobby
 *  furnace, which reaches 1000 °C in about 20 minutes). */
export class Furnace {
  t = 20; P = 15000; C = 8000; h = 3.5; hA = 8; burner = 0; lid = true; charge: Charge | null = null; energy = 0;
  load(m: Metal, g: number): void { this.charge = { metal: m, g, H: 0 }; }
  metal(): { T: number; liquid: number } | null { return this.charge ? stateOf(this.charge) : null; }
  step(dt: number): void {
    const steps = Math.max(1, Math.ceil(dt / 1)), d = dt / steps;
    for (let k = 0; k < steps; k++) {
      const m = this.charge ? stateOf(this.charge) : null, q = m ? this.hA * (this.t - m.T) : 0;
      const p = this.t > 1300 ? 0 : this.burner * this.P * 0.35; // what of the burner's power stays in the chamber (estimate); its controller keeps it under 1300 °C
      this.t += ((p - (this.h + (this.lid ? 0 : 25)) * (this.t - 20) - q) * d) / this.C; this.energy += this.burner * this.P * d;
      if (this.charge) this.charge.H = Math.max(0, this.charge.H + q * d);
    }
  }
}

// ==== the rack: parts with their datasheet numbers =====================================================================
export interface Component { id: string; name: string; kind: 'motor' | 'sensor' | 'camera' | 'optics' | 'controller' | 'power' | 'light' | 'hardware'; g: number; size: [number, number, number]; /** mA it draws, at its volts */ mA: number; V: number; spec: string; colour: number }
export const COMPONENTS: Component[] = [
  { id: 'nema17', name: 'NEMA 17 stepper (17HS4401)', kind: 'motor', g: 280, size: [42, 42, 40], mA: 1700, V: 12, spec: '1.8° a step, 40 N·cm holding torque, 1.7 A a phase', colour: 0x263238 },
  { id: 'mg996r', name: 'MG996R servo', kind: 'motor', g: 55, size: [40, 20, 43], mA: 500, V: 6, spec: 'stall torque 9.4 kg·cm at 4.8 V, 11 kg·cm at 6 V', colour: 0x212121 },
  { id: 'n20', name: 'N20 gear motor', kind: 'motor', g: 10, size: [12, 10, 34], mA: 120, V: 6, spec: '6 V, geared (ratio as ordered)', colour: 0xb0bec5 },
  { id: 'pi-cam3', name: 'Camera Module 3 (Sony IMX708)', kind: 'camera', g: 4, size: [25, 24, 12], mA: 250, V: 3.3, spec: '11.9 MP, autofocus', colour: 0x2e7d32 },
  { id: 'vl53l1x', name: 'VL53L1X time-of-flight', kind: 'sensor', g: 2, size: [13, 18, 2], mA: 20, V: 3.3, spec: 'distance up to 4 m', colour: 0x1565c0 },
  { id: 'mpu6050', name: 'MPU-6050 IMU', kind: 'sensor', g: 2, size: [21, 16, 2], mA: 4, V: 3.3, spec: '3-axis gyro (±250…2000 °/s) and accelerometer (±2…16 g)', colour: 0x1565c0 },
  { id: 'bme280', name: 'BME280', kind: 'sensor', g: 1, size: [13, 10, 2], mA: 1, V: 3.3, spec: 'temperature, humidity, pressure (300–1100 hPa)', colour: 0x6a1b9a },
  { id: 'hx711', name: 'HX711 + load cell', kind: 'sensor', g: 30, size: [80, 13, 13], mA: 2, V: 5, spec: '24-bit ADC for a strain-gauge bridge', colour: 0x9e9e9e },
  { id: 'thermocouple', name: 'K thermocouple + MAX31855', kind: 'sensor', g: 8, size: [20, 20, 3], mA: 2, V: 3.3, spec: 'type K, −200 to 1350 °C', colour: 0xd84315 },
  { id: 'lens', name: 'achromatic lens, f 25 mm', kind: 'optics', g: 6, size: [12.7, 12.7, 6], mA: 0, V: 0, spec: 'focal length 25 mm, 12.7 mm across', colour: 0x80deea },
  { id: 'led-ring', name: 'LED ring (12 × WS2812B)', kind: 'light', g: 6, size: [37, 37, 3], mA: 720, V: 5, spec: '12 LEDs, up to 60 mA each at full white', colour: 0xfafafa },
  { id: 'esp32', name: 'ESP32 board', kind: 'controller', g: 10, size: [52, 28, 5], mA: 240, V: 3.3, spec: 'two cores at 240 MHz, Wi-Fi and Bluetooth', colour: 0x37474f },
  { id: 'pi4', name: 'Raspberry Pi 4', kind: 'controller', g: 46, size: [85, 56, 17], mA: 1200, V: 5, spec: '4 cores at 1.5 GHz', colour: 0x2e7d32 },
  { id: 'drv8833', name: 'DRV8833 dual motor driver', kind: 'controller', g: 2, size: [18, 16, 3], mA: 0, V: 0, spec: 'two H-bridges, 1.5 A RMS each, 2.7–10.8 V', colour: 0x6a1b9a },
  { id: 'a4988', name: 'A4988 stepper driver', kind: 'controller', g: 2, size: [20, 15, 10], mA: 0, V: 0, spec: 'up to 2 A a phase with cooling, 1/16 steps', colour: 0x8e24aa },
  { id: '18650', name: '18650 cell', kind: 'power', g: 47, size: [18, 18, 65], mA: 0, V: 3.6, spec: '3.6 V nominal, about 3 Ah', colour: 0x1e88e5 },
  { id: 'leadscrew', name: 'T8 lead screw, 2 mm pitch', kind: 'hardware', g: 120, size: [8, 8, 300], mA: 0, V: 0, spec: '2 mm a turn: 0.01 mm a full step on a 1.8° stepper', colour: 0xbdbdbd },
  { id: 'bearing608', name: '608 bearing', kind: 'hardware', g: 12, size: [22, 22, 7], mA: 0, V: 0, spec: '8 mm bore, 22 mm outside, 7 mm wide', colour: 0x90a4ae },
];
export const component = (id: string) => COMPONENTS.find((c) => c.id === id)!;

// ==== recipes: what the arms put together =============================================================================
/** A printed or cast part of a recipe: its sections, and whether it is cast (in what) or printed. */
export interface MadePart { id: string; name: string; sections: Section[]; cast?: string }
export interface Recipe { id: string; name: string; does: string; printed: MadePart[]; parts: { id: string; n: number }[]; /** how the parts sit on the plate, mm, per placed piece */ layout?: [number, number, number][] }
const box = (w: number, d: number, h: number, z0 = 0): Section => ({ outline: shapes.rect(w, d), z0, z1: z0 + h });
export const RECIPES: Recipe[] = [
  { id: 'microscope', name: 'digital microscope', does: 'a camera behind a 25 mm lens, lit by a ring of LEDs, focused by a stepper on a lead screw (0.01 mm a step)', printed: [{ id: 'frame', name: 'frame', sections: [box(90, 90, 6), { outline: shapes.rect(20, 20), z0: 6, z1: 140 }] }, { id: 'stage', name: 'stage', sections: [box(70, 60, 5)] }], parts: [{ id: 'pi-cam3', n: 1 }, { id: 'lens', n: 1 }, { id: 'led-ring', n: 1 }, { id: 'nema17', n: 1 }, { id: 'leadscrew', n: 1 }, { id: 'a4988', n: 1 }, { id: 'pi4', n: 1 }] },
  { id: 'pan-tilt', name: 'pan-tilt camera', does: 'a camera turned left-right and up-down by two servos', printed: [{ id: 'base', name: 'base', sections: [{ outline: shapes.circle(35), z0: 0, z1: 8 }] }, { id: 'yoke', name: 'yoke', sections: [box(50, 12, 40)] }], parts: [{ id: 'mg996r', n: 2 }, { id: 'pi-cam3', n: 1 }, { id: 'esp32', n: 1 }] },
  { id: 'weather', name: 'weather station', does: 'temperature, humidity and pressure read every minute and sent over Wi-Fi', printed: [{ id: 'shield', name: 'radiation shield', sections: [0, 1, 2, 3].map((k) => ({ outline: shapes.circle(45), holes: [shapes.circle(30)], z0: k * 12, z1: k * 12 + 3 })) }], parts: [{ id: 'bme280', n: 1 }, { id: 'esp32', n: 1 }, { id: '18650', n: 2 }] },
  { id: 'scale', name: 'kitchen scale', does: 'weighs to the gram on a load cell read by a 24-bit converter', printed: [{ id: 'plate', name: 'plate', sections: [box(150, 150, 4)] }, { id: 'foot', name: 'foot', sections: [box(150, 150, 10)] }], parts: [{ id: 'hx711', n: 1 }, { id: 'esp32', n: 1 }, { id: '18650', n: 1 }] },
  { id: 'rover', name: 'little rover', does: 'two geared motors and a distance sensor: it drives and stops short of what is ahead', printed: [{ id: 'chassis', name: 'chassis', sections: [box(100, 70, 4), { outline: shapes.rect(100, 70), holes: [shapes.rect(92, 62)], z0: 4, z1: 24 }] }], parts: [{ id: 'n20', n: 2 }, { id: 'drv8833', n: 1 }, { id: 'vl53l1x', n: 1 }, { id: 'mpu6050', n: 1 }, { id: 'esp32', n: 1 }, { id: '18650', n: 2 }] },
  { id: 'gear', name: 'cast gear', does: 'a 20-tooth module-2 spur gear, cast in aluminium from a printed pattern', printed: [{ id: 'gear', name: 'gear', cast: 'aluminium', sections: [{ outline: shapes.gear(20, 2), holes: [shapes.circle(4)], z0: 0, z1: 8 }] }], parts: [{ id: 'bearing608', n: 1 }] },
];
/** What a recipe comes to: its mass, the current it draws at full use, and what is printed or cast for it. */
export function bill(r: Recipe): { g: number; mA: number; printedG: number; lines: string[] } {
  let g = 0, mA = 0; const lines: string[] = [];
  for (const { id, n } of r.parts) { const c = component(id); g += c.g * n; mA += c.mA * n; lines.push(`${n} × ${c.name}: ${c.spec}`); }
  let printedG = 0;
  for (const p of r.printed) { const v = volumeOf(p.sections) / 1000; const m = p.cast ? METALS.find((x) => x.id === p.cast)! : null; const gg = m ? v * m.rho : v * PLA_DENSITY * 0.45; printedG += gg; lines.push(`${p.name}: ${p.cast ? `cast in ${m!.name}` : 'printed in PLA'}, ${gg.toFixed(0)} g`); }
  return { g: g + printedG, mA, printedG, lines };
}
/** The volume of sections (mm³): each outline's area less its holes', times its height. */
export function volumeOf(sec: Section[]): number { const area = (p: Pt[]) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length]![1] - p[(i + 1) % p.length]![0] * q[1], 0)) / 2; return sec.reduce((v, s) => v + (area(s.outline) - (s.holes ?? []).reduce((a, h) => a + area(h), 0)) * (s.z1 - s.z0), 0); }
/** A part made a casting pattern: a sprue (12 mm across, 20 mm tall) and a pour cup on top of it. */
export function patternOf(p: MadePart): Section[] { const top = Math.max(...p.sections.map((s) => s.z1)); return [...p.sections, { outline: shapes.circle(6, 24), z0: top, z1: top + 20 }, { outline: shapes.circle(14, 32), z0: top + 20, z1: top + 30 }]; }

// ==== the cell: the machines, two arms, and the jobs that run them ====================================================
/** Where each station is in the room (m): the rail arm runs along z at x = RAIL_X; the stations stand west of it. */
export const RAIL_X = -3.8, RAIL_Z: [number, number] = [-3.2, 0.6];
export const STATIONS = {
  printer: { x: -4.55, y: 0.95, z: -2.8 }, invest: { x: -4.55, y: 0.9, z: -1.9 }, kiln: { x: -4.55, y: 0.95, z: -1.0 },
  furnace: { x: -4.55, y: 0.55, z: -0.1 }, pour: { x: -4.05, y: 0.75, z: 0.45 }, quench: { x: -4.55, y: 0.55, z: 0.6 },
  plate: { x: -3.1, y: 0.9, z: -3.9 }, rack: { x: -5.3, y: 1.1, z: -3.9 }, computer: { x: -4.4, y: 1.0, z: -3.95 }, shelf: { x: -3.05, y: 0.9, z: -3.1 },
} as const;
export type Station = keyof typeof STATIONS;
export const BENCH_ARM = { x: -3.75, z: -3.95 };
/** An arm's step: go to a station (its tool there, at a height over it), and do something there. */
export interface ArmStep { to: Station; up?: number; act?: 'grip' | 'release' | 'pour' | 'press' | 'wait'; item?: string; secs?: number }
export interface Arm { id: 'rail' | 'bench'; name: string; tool: [number, number, number]; railZ: number; holding: string | null; steps: ArmStep[]; doing: string; v: number; pouring: number; pressing: number; wait: number; /** steps it has finished, all told */ done: number }
const ARM_V = 0.5, ARM_A = 1.0, RAIL_V = 0.6;
export interface Job { kind: 'print' | 'cast' | 'build' | 'gcode'; name: string; stage: string; started: number; log: string[]; done: boolean; failed?: string }

export interface CellHost { said?(text: string): void; made?(what: { name: string; kind: 'printed' | 'cast' | 'device'; g: number; spec: string[] }): void; /** a device set down in the room, to run its program */ released?(r: Recipe): void }
export class Cell {
  printer = new Printer(); kiln = new Kiln(); furnace = new Furnace();
  arms: Record<'rail' | 'bench', Arm> = {
    rail: { id: 'rail', name: 'Forge arm', tool: [RAIL_X, 1.1, -1.0], railZ: -1.0, holding: null, steps: [], doing: 'resting', v: 0, pouring: 0, pressing: 0, wait: 0, done: 0 },
    bench: { id: 'bench', name: 'Bench arm', tool: [BENCH_ARM.x, 1.1, BENCH_ARM.z + 0.3], railZ: BENCH_ARM.z, holding: null, steps: [], doing: 'resting', v: 0, pouring: 0, pressing: 0, wait: 0, done: 0 },
  };
  /** How much faster than real time the cell runs (a print takes hours, a burnout a day). */
  speed = 60;
  jobs: Job[] = []; private plan: (() => boolean)[] = []; private t = 0;
  /** what stands at each place: items on the plate and shelf, the flask and its state */ plate: string[] = []; shelf: string[] = [];
  flask: { at: 'invest' | 'kiln' | 'pour' | 'quench' | 'arm' | 'none'; state: 'empty' | 'pattern' | 'invested' | 'set' | 'burnt out' | 'filled' | 'frozen' | 'broken out'; setAt: number; metal: Charge | null } = { at: 'invest', state: 'empty', setAt: 0, metal: null };
  constructor(private readonly host: CellHost = {}) {}
  private say(j: Job, s: string): void { j.log.push(s); j.stage = s; this.host.said?.(`${j.name}: ${s}`); }
  get busy(): boolean { return this.jobs.some((j) => !j.done); }
  facts(): Record<string, number> { const m = this.furnace.metal(); return { printer_temp: Math.round(this.printer.hot.t), bed_temp: Math.round(this.printer.bed.t), printing: this.printer.busy ? 1 : 0, kiln_temp: Math.round(this.kiln.t), furnace_temp: Math.round(this.furnace.t), metal_temp: m ? Math.round(m.T) : 0, metal_molten: m && m.liquid >= 1 ? 1 : 0, cell_busy: this.busy ? 1 : 0, made_parts: this.shelf.length }; }

  // ---- what you can ask of it ------------------------------------------------------------------------------------------
  /** G-code of your own, run on the printer as it is. */
  gcode(text: string): string { if (this.printer.busy) return 'The printer is busy: wait, or stop it first.'; const j: Job = { kind: 'gcode', name: 'your G-code', stage: 'sent', started: this.t, log: [], done: false }; this.jobs.push(j); this.printer.load(text); this.plan.push(() => { if (this.printer.busy) return false; this.say(j, `ran ${this.printer.done} lines`); j.done = true; return true; }); return `Sent ${text.split(/\n/).filter((l) => l.replace(/;.*/, '').trim()).length} lines to the printer.`; }
  /** A part printed: sliced, sent from the computer (the bench arm presses Print on it), printed, taken off the bed. */
  print(p: MadePart, then?: (ok: boolean) => void): string {
    if (this.printer.busy) return 'The printer is busy.';
    const s = slice(p.sections), j: Job = { kind: 'print', name: `print ${p.name}`, stage: 'slicing', started: this.t, log: [], done: false }; this.jobs.push(j);
    this.say(j, `sliced: ${s.layers} layers, ${s.grams.toFixed(1)} g of PLA, about ${(s.estimate / 60).toFixed(0)} min at full speed`);
    this.arms.bench.steps.push({ to: 'computer', up: 0.12 }, { to: 'computer', up: 0.02, act: 'press', secs: 0.6 }, { to: 'computer', up: 0.15 });
    let ph = 0;
    this.plan.push(() => {
      if (ph === 0) { if (this.arms.bench.steps.length) return false; this.printer.clearBed(); this.printer.filament = 0; this.printer.load(s.gcode); ph = 1; this.say(j, 'printing'); return false; }
      if (ph === 1) {
        if (this.printer.busy) return false;
        this.say(j, `printed: ${this.printer.grams().toFixed(1)} g laid down`);
        this.arms.rail.steps.push({ to: 'printer', up: 0.2 }, { to: 'printer', up: 0.03, act: 'grip', item: p.name }, { to: 'printer', up: 0.25 }, ...(then ? [] : [{ to: 'shelf' as Station, up: 0.1 }, { to: 'shelf' as Station, up: 0.02, act: 'release' as const, item: p.name }]));
        ph = 2; return false;
      }
      if (this.arms.rail.steps.length) return false;
      this.printer.clearBed();
      if (!then) { this.shelf.push(p.name); this.host.made?.({ name: p.name, kind: 'printed', g: this.printer.grams(), spec: [`PLA, ${s.layers} layers`] }); }
      j.done = true; then?.(true); return true;
    });
    return `Printing ${p.name}: ${s.layers} layers, ${s.grams.toFixed(1)} g of PLA.`;
  }
  /** A part cast: its pattern printed, invested, burnt out, the metal melted and poured, frozen, quenched, broken out. */
  cast(p: MadePart, metalId = p.cast ?? 'aluminium'): string {
    const metal = METALS.find((m) => m.id === metalId); if (!metal) return `No metal called ${metalId}: ${METALS.map((m) => m.id).join(', ')}.`;
    if (this.flask.state !== 'empty' || this.printer.busy) return 'The casting line is busy.';
    const g = (volumeOf(patternOf(p)) / 1000) * metal.rho * 1.25, j: Job = { kind: 'cast', name: `cast ${p.name} in ${metal.name}`, stage: 'printing the pattern', started: this.t, log: [], done: false }; this.jobs.push(j);
    const pat: MadePart = { ...p, name: `${p.name} pattern`, sections: patternOf(p) }, R = this.arms.rail;
    this.flask.state = 'pattern';
    this.say(j, `pattern with sprue and cup; ${g.toFixed(0)} g of ${metal.name} to melt (the part, its sprue, and a quarter over)`);
    this.print(pat, () => {
      let ph = 0;
      this.plan.push(() => {
        switch (ph) {
          case 0: R.steps.push({ to: 'invest', up: 0.25 }, { to: 'invest', up: 0.08, act: 'release', item: pat.name }, { to: 'invest', up: 0.35, act: 'pour', secs: 6, item: 'investment' }); ph = 1; return false;
          case 1: if (R.steps.length) return false; this.flask.state = 'invested'; this.flask.setAt = this.t; this.say(j, 'invested: gypsum investment poured round the pattern; it sets for 2 h'); ph = 2; return false;
          case 2: if (this.t - this.flask.setAt < 2 * 3600) return false; this.flask.state = 'set'; this.kiln.open = true; R.steps.push({ to: 'invest', up: 0.1, act: 'grip', item: 'flask' }, { to: 'kiln', up: 0.1 }, { to: 'kiln', up: 0.02, act: 'release', item: 'flask' }); ph = 3; return false;
          case 3: if (R.steps.length) return false; this.kiln.open = false; this.flask.at = 'kiln'; this.kiln.contents = 'flask'; this.kiln.run(BURNOUT); this.say(j, 'burnout: 149 °C 1 h, 371 °C 2 h, 732 °C 3 h, then down to 480 °C to pour into'); ph = 4; return false;
          // the metal goes in at the burnout's hottest hold, so it is molten when the flask is ready
          case 4: if (this.kiln.seg < 2) return false; this.furnace.load(metal, g); this.furnace.burner = 1; this.furnace.lid = true; this.say(j, `${g.toFixed(0)} g of ${metal.name} in the crucible, the burner lit`); ph = 5; return false;
          case 5: {
            const m = this.furnace.metal()!; if (m.T >= metal.pour[1]) this.furnace.burner = 0.3; else if (m.T < metal.pour[0] + 15) this.furnace.burner = 1;
            if (this.kiln.running || m.liquid < 1 || m.T < metal.pour[0]) return false;
            this.flask.state = 'burnt out'; this.say(j, `the flask at ${Math.round(this.kiln.t)} °C, the metal at ${Math.round(m.T)} °C: pouring`); this.kiln.open = true; this.furnace.lid = false;
            R.steps.push({ to: 'kiln', up: 0.02, act: 'grip', item: 'flask' }, { to: 'pour', up: 0.1 }, { to: 'pour', up: 0.02, act: 'release', item: 'flask' }, { to: 'furnace', up: 0.2, act: 'grip', item: 'crucible' }, { to: 'pour', up: 0.3, act: 'pour', secs: 8, item: metal.name }, { to: 'furnace', up: 0.2, act: 'release', item: 'crucible' });
            ph = 6; return false;
          }
          case 6: { if (R.steps.length) return false; this.kiln.open = false; this.kiln.contents = null; this.furnace.burner = 0; this.furnace.lid = true; const c = this.furnace.charge!; this.flask = { ...this.flask, at: 'pour', state: 'filled', metal: { ...c }, setAt: this.t }; this.furnace.charge = null; this.say(j, `poured; it freezes as it gives up its ${metal.L} J/g of latent heat into the flask`); ph = 7; return false; }
          case 7: { const st = stateOf(this.flask.metal!); if (st.liquid > 0 || this.t - this.flask.setAt < 600) return false; this.flask.state = 'frozen'; R.steps.push({ to: 'pour', up: 0.02, act: 'grip', item: 'flask' }, { to: 'quench', up: 0.3 }, { to: 'quench', up: 0.05, act: 'wait', secs: 4 }, { to: 'quench', up: 0.3 }, { to: 'shelf', up: 0.1 }, { to: 'shelf', up: 0.02, act: 'release', item: p.name }); this.say(j, `frozen solid at ${Math.round(st.T)} °C: quenching the flask, the investment breaks away`); ph = 8; return false; }
          default: {
            if (R.steps.length) return false;
            this.flask = { at: 'invest', state: 'empty', setAt: 0, metal: null }; this.shelf.push(p.name); const v = volumeOf(p.sections) / 1000;
            this.host.made?.({ name: p.name, kind: 'cast', g: v * metal.rho, spec: [`cast in ${metal.name}`, `${(metal.shrink * 100).toFixed(1)} % shrinkage as it froze, fed from the sprue`, 'sprue cut off'] });
            this.say(j, `done: ${p.name} in ${metal.name}, ${(v * metal.rho).toFixed(0)} g`); j.done = true; return true;
          }
        }
      });
    });
    return `Casting ${p.name} in ${metal.name}: the pattern prints first, then investment, burnout, melt, pour.`;
  }
  /** A recipe built: what it needs printed or cast is made, each part taken off the rack, all set on the plate. */
  build(r: Recipe): string {
    const j: Job = { kind: 'build', name: `build a ${r.name}`, stage: 'starting', started: this.t, log: [], done: false }; this.jobs.push(j);
    const todo = [...r.printed]; const B = this.arms.bench;
    const next = (): void => {
      const p = todo.shift();
      if (p) { if (p.cast) { this.cast(p); this.plan.push(() => { if (!this.shelf.includes(p.name)) return false; next(); return true; }); } else this.print(p, () => { this.arms.rail.steps.push({ to: 'shelf', up: 0.1 }, { to: 'shelf', up: 0.02, act: 'release', item: p.name }); this.plan.push(() => { if (this.arms.rail.steps.length) return false; this.shelf.push(p.name); next(); return true; }); }); return; }
      // everything printed and cast is on the shelf: the bench arm takes it, and each part off the rack, to the plate
      this.say(j, 'assembling');
      for (const pp of r.printed) B.steps.push({ to: 'shelf', up: 0.1 }, { to: 'shelf', up: 0.02, act: 'grip', item: pp.name }, { to: 'plate', up: 0.15 }, { to: 'plate', up: 0.03, act: 'release', item: pp.name });
      for (const { id, n } of r.parts) for (let k = 0; k < n; k++) B.steps.push({ to: 'rack', up: 0.1 }, { to: 'rack', up: 0.02, act: 'grip', item: id }, { to: 'plate', up: 0.15 }, { to: 'plate', up: 0.04, act: 'release', item: id }, { to: 'plate', up: 0.06, act: 'wait', secs: 1.5 });
      this.plan.push(() => { if (B.steps.length) return false; const b = bill(r); for (const pp of r.printed) { const i = this.shelf.indexOf(pp.name); if (i >= 0) this.shelf.splice(i, 1); } this.host.made?.({ name: r.name, kind: 'device', g: b.g, spec: [r.does, `${(b.g / 1000).toFixed(2)} kg, draws up to ${(b.mA / 1000).toFixed(2)} A at full use`, ...b.lines] }); this.say(j, `built: ${r.name}, ${b.g.toFixed(0)} g`); j.done = true; return true; });
    };
    next();
    return `Building a ${r.name}: ${r.does}. ${r.printed.length} part${r.printed.length === 1 ? '' : 's'} to make, ${r.parts.reduce((a, x) => a + x.n, 0)} off the rack.`;
  }
  // ---- a build step by step, as a pipeline runs it: each resolves when it is done in the room -------------------------
  private waiters: { cond: () => boolean; ok: () => void }[] = [];
  /** When a condition comes to hold, as the cell runs. */
  until(cond: () => boolean): Promise<void> { return new Promise((ok) => this.waiters.push({ cond, ok })); }
  private armDone(a: Arm, pushed: number): Promise<void> { const target = a.done + a.steps.length + pushed; return this.until(() => a.done >= target); }
  /** Which recipes are wired, and which have their program. */
  wired = new Set<string>(); programmed = new Set<string>();
  async printNow(p: MadePart): Promise<string> { const said = this.print(p); const j = this.jobs.at(-1); if (!j || j.name !== `print ${p.name}` || j.done) throw new Error(said); await this.until(() => j.done); return `${p.name} printed (${this.printer.grams().toFixed(1)} g of PLA) and on the shelf.`; }
  async castNow(p: MadePart, metal?: string): Promise<string> { const said = this.cast(p, metal); if (!/^Casting/.test(said)) throw new Error(said); await this.until(() => this.shelf.includes(p.name) && this.flask.state === 'empty'); return `${p.name} cast and on the shelf.`; }
  /** A part off the rack, or a made part off the shelf, to the plate, by the bench arm. */
  async take(id: string, n = 1): Promise<string> {
    const c = COMPONENTS.find((x) => x.id === id || x.name.toLowerCase().startsWith(id.toLowerCase()));
    const made = !c && this.shelf.includes(id);
    if (!c && !made) throw new Error(`Nothing called ${id} on the rack or the shelf. The rack: ${COMPONENTS.map((x) => x.id).join(', ')}.`);
    const B = this.arms.bench, steps: ArmStep[] = [];
    for (let k = 0; k < n; k++) steps.push({ to: made ? 'shelf' : 'rack', up: 0.1 }, { to: made ? 'shelf' : 'rack', up: 0.02, act: 'grip', item: c ? c.id : id }, { to: 'plate', up: 0.15 }, { to: 'plate', up: 0.04, act: 'release', item: c ? c.id : id });
    const wait = this.armDone(B, steps.length); B.steps.push(...steps); await wait;
    if (made) { const i = this.shelf.indexOf(id); if (i >= 0) this.shelf.splice(i, 1); }
    return c ? `${n} × ${c.name} on the plate: ${c.spec}.` : `${id} on the plate.`;
  }
  /** Wired as the recipe needs: each motor to a driver, the sensors to the controller, all on the supply; checked. */
  async wire(r: Recipe): Promise<string> {
    const on = (id: string) => this.plate.filter((x) => x === id).length, need = (id: string) => r.parts.find((x) => x.id === id)?.n ?? 0;
    const missing = r.parts.filter((x) => on(x.id) < x.n).map((x) => `${x.n - on(x.id)} × ${component(x.id).name}`);
    if (missing.length) throw new Error(`Not on the plate yet: ${missing.join(', ')}.`);
    const why: string[] = [];
    if (need('n20') && !need('drv8833')) why.push('the DC motors have no driver: a controller pin gives milliamps, a motor wants hundreds');
    if (need('nema17') && !need('a4988')) why.push('the stepper has no driver');
    const ctl = r.parts.some((x) => component(x.id).kind === 'controller' && /esp32|pi4/.test(x.id)); if (!ctl) why.push('nothing to run its program: no controller');
    if (why.length) throw new Error(`It cannot be wired: ${why.join('; ')}.`);
    const B = this.arms.bench, steps: ArmStep[] = [0, 1, 2, 3, 4, 5].map((k) => ({ to: 'plate' as Station, up: 0.03 + (k % 2) * 0.03, act: 'wait' as const, secs: 0.8 }));
    const wait = this.armDone(B, steps.length); B.steps.push(...steps); await wait;
    this.wired.add(r.id); const b = bill(r), cells = need('18650'), wh = cells * 3.6 * 3;
    return `Wired: ${r.parts.filter((x) => component(x.id).kind !== 'hardware').map((x) => component(x.id).name).join(', ')}. It draws up to ${(b.mA / 1000).toFixed(2)} A${cells ? `; ${cells} × 18650 hold about ${wh.toFixed(0)} Wh` : ''}.`;
  }
  /** Its program uploaded from the computer: the bench arm presses Upload, the controller is flashed. */
  async upload(r: Recipe): Promise<string> {
    if (!this.wired.has(r.id)) throw new Error(`Wire the ${r.name} first: its controller is not connected.`);
    const B = this.arms.bench, steps: ArmStep[] = [{ to: 'computer', up: 0.12 }, { to: 'computer', up: 0.02, act: 'press', secs: 0.6 }, { to: 'computer', up: 0.12, act: 'wait', secs: 3 }];
    const wait = this.armDone(B, steps.length); B.steps.push(...steps); await wait;
    this.programmed.add(r.id); return `Its program is on its controller: it runs the pipeline "${r.name}'s program", which you can change any time.`;
  }
  // ---- what the inventory asks of it: any part, by the way it is made ----------------------------------------------------
  /** Work at the plate by the bench arm: putting together, winding, soldering, crimping, bending, coiling (what it is
   *  doing said); what went into it taken off the plate, it put there. */
  async work(kind: string, name: string, uses: string[] = [], secs = 2.5): Promise<string> {
    const B = this.arms.bench, steps: ArmStep[] = [{ to: 'plate', up: 0.1 }, { to: 'plate', up: 0.03, act: 'wait', secs }, { to: 'plate', up: 0.06, act: 'wait', secs: secs / 2 }];
    B.doing = `${kind}: ${name}`;
    const wait = this.armDone(B, steps.length); B.steps.push(...steps); await wait;
    for (const u of uses) { const i = this.plate.indexOf(u); if (i >= 0) this.plate.splice(i, 1); }
    this.plate.push(name); if (this.plate.length > 40) this.plate.splice(0, this.plate.length - 40);
    return `${name}: ${kind}`;
  }
  /** Bought parts brought from the rack to the plate by the bench arm, in one trip. */
  async bring(...names: string[]): Promise<string> {
    const B = this.arms.bench, first = names[0] ?? 'parts', steps: ArmStep[] = [{ to: 'rack', up: 0.1 }, { to: 'rack', up: 0.02, act: 'grip', item: first }, { to: 'plate', up: 0.15 }, { to: 'plate', up: 0.04, act: 'release', item: first }];
    const wait = this.armDone(B, steps.length); B.steps.push(...steps); await wait;
    for (const n of names.slice(1)) this.plate.push(n);
    return `${names.join(', ')}: bought, off the rack`;
  }
  /** Heat-treated in the kiln: hardened and tempered (a short program: up to 200 °C, held an hour). */
  async temper(name: string): Promise<string> {
    if (this.kiln.running) await this.until(() => !this.kiln.running);
    this.kiln.run([{ to: 200, rate: 600, hold: 1 }]); await this.until(() => !this.kiln.running);
    this.plate.push(name); return `${name}: tempered in the kiln at 200 °C for an hour`;
  }
  /** Set down in the room, to run its program. */
  release(r: Recipe): string {
    if (!this.programmed.has(r.id)) throw new Error(`Upload the ${r.name}'s program first.`);
    for (const { id, n } of r.parts) for (let k = 0; k < n; k++) { const i = this.plate.indexOf(id); if (i >= 0) this.plate.splice(i, 1); }
    for (const p of r.printed) { const i = this.plate.indexOf(p.name); if (i >= 0) this.plate.splice(i, 1); }
    const b = bill(r); this.host.made?.({ name: r.name, kind: 'device', g: b.g, spec: [r.does, ...b.lines] }); this.host.released?.(r);
    return `The ${r.name} is set down in the room and running its program.`;
  }
  stopAll(): string { this.plan = []; this.printer.stop('stopped by you'); this.kiln.run([]); this.furnace.burner = 0; for (const a of Object.values(this.arms)) { a.steps = []; a.doing = 'stopped'; } for (const j of this.jobs) if (!j.done) { j.done = true; j.failed = 'stopped'; } this.flask = { at: 'invest', state: 'empty', setAt: 0, metal: null }; return 'Everything in the workshop stopped: heaters off, arms still.'; }

  // ---- time --------------------------------------------------------------------------------------------------------------
  /** dt s of real time: the machines and the process at the cell's speed; the arms at their own (they move as you watch). */
  step(dt: number): void {
    const sim = dt * this.speed; this.t += sim;
    this.printer.step(sim); this.kiln.step(sim); this.furnace.step(sim);
    // the poured metal gives its heat to the hot flask (about 25 W/K, estimate) in steps short enough to be stable
    if (this.flask.metal && (this.flask.state === 'filled' || this.flask.state === 'frozen')) { const c = this.flask.metal, sink = 300, Hs = heatTo(c.metal, c.g, sink); for (let k = 0, n = Math.ceil(sim / 0.5); k < n; k++) c.H = Math.max(Hs, c.H - 25 * (stateOf(c).T - sink) * (sim / n)); }
    for (const a of Object.values(this.arms)) this.stepArm(a, dt);
    // every job takes its next step; a job's steps run one after another inside it
    const cur = this.plan; this.plan = []; const keep = cur.filter((f) => !f()); this.plan = [...keep, ...this.plan];
    const ws = this.waiters; this.waiters = []; for (const w of ws) { if (w.cond()) w.ok(); else this.waiters.push(w); }
  }
  private stepArm(a: Arm, dt: number): void {
    a.pressing = Math.max(0, a.pressing - dt); a.v = 0;
    const s = a.steps[0]; if (!s) { a.doing = a.holding ? `holding ${a.holding}` : 'resting'; return; }
    const st = STATIONS[s.to], want: [number, number, number] = [st.x, st.y + (s.up ?? 0.1), st.z];
    // the rail arm's carriage runs first, to beside the station
    if (a.id === 'rail') { const z = Math.max(RAIL_Z[0], Math.min(RAIL_Z[1], st.z)), dz = z - a.railZ; if (Math.abs(dz) > 1e-3) { a.railZ += Math.sign(dz) * Math.min(Math.abs(dz), RAIL_V * dt); a.doing = `running along its rail to the ${s.to}`; a.tool = [a.tool[0], a.tool[1], a.tool[2] + Math.sign(dz) * Math.min(Math.abs(dz), RAIL_V * dt)]; return; } }
    const d = [want[0] - a.tool[0], want[1] - a.tool[1], want[2] - a.tool[2]], L = Math.hypot(...d);
    if (L > 1e-3) { const v = Math.min(ARM_V, Math.sqrt(2 * ARM_A * L)), stepL = Math.min(L, v * dt); a.tool = [a.tool[0] + (d[0]! / L) * stepL, a.tool[1] + (d[1]! / L) * stepL, a.tool[2] + (d[2]! / L) * stepL]; a.v = v; a.doing = `moving to the ${s.to}`; return; }
    switch (s.act) {
      case 'grip': a.holding = s.item ?? 'it'; a.doing = `took ${a.holding}`; break;
      case 'release': a.doing = `put down ${a.holding ?? s.item}`; if (s.to === 'plate' && s.item) this.plate.push(s.item); a.holding = null; break;
      case 'press': a.pressing = s.secs ?? 0.5; a.doing = 'pressing Print on the computer'; break;
      case 'pour': case 'wait': { a.wait += dt; a.pouring = s.act === 'pour' ? 1 : 0; a.doing = s.act === 'pour' ? `pouring ${s.item ?? ''}` : 'waiting'; if (a.wait < (s.secs ?? 1)) return; a.wait = 0; a.pouring = 0; break; }
    }
    a.steps.shift(); a.done++;
  }
}

// ==== a build, and a device's program, as pipelines on the boards =====================================================
/** A recipe's build as a pipeline: each part made, each part off the rack, wired, its program uploaded, set down. */
export function buildBoard(r: Recipe, at = Date.now()): Board {
  const steps: [string, string, string][] = [['t', 'Run', 'when I press run']];
  for (const p of r.printed) steps.push([`m${p.id}`, p.cast ? `Cast the ${p.name} in ${p.cast}` : `Print the ${p.name}`, p.cast ? `cell cast ${p.name} in ${p.cast}` : `cell print ${p.name}`]);
  for (const p of r.printed) steps.push([`p${p.id}`, `The ${p.name} to the plate`, `cell take ${p.name}`]);
  for (const { id, n } of r.parts) steps.push([`c${id}`, `${n > 1 ? `${n} × ` : ''}${component(id).name}`, `cell take ${id}${n > 1 ? ` ${n}` : ''}`]);
  steps.push(['w', 'Wire it', `cell wire ${r.id}`], ['u', 'Upload its program', `cell upload ${r.id}`], ['r', 'Set it down in the room', `cell release ${r.id}`]);
  const b: Board = { title: `Build a ${r.name}`, kind: 'flow', about: `${r.does}. Each step is done in the workshop before the next starts: what is printed or cast, each part off the rack, the wiring (checked), its program uploaded from the computer, and it set down in the room. Its program is the pipeline "${r.name}'s program".`, nodes: {}, edges: {}, createdAt: at, updatedAt: at };
  steps.forEach(([id, label, what], i) => { b.nodes[id] = { label, step: { kind: i ? 'action' : 'trigger', what } }; if (i) b.edges[`e${i}`] = { from: steps[i - 1]![0], to: id, rel: 'flows to' }; });
  return b;
}
/** What a device's program does, as rules: each IF its trigger, each THEN what the device does. */
export const PROGRAMS: Record<string, [string, string, string, string][]> = {
  rover: [['Something close ahead', 'when rover_distance < 300', 'Turn away', 'device rover turn 100'], ['The way is clear', 'when rover_distance > 500', 'Drive on', 'device rover forward 0.25'], ['I say go', 'when I say go rover', 'Go', 'device rover forward 0.25'], ['I say stop', 'when I say stop rover', 'Stop', 'device rover stop'], ['Battery low', 'when rover_battery < 15', 'Stop and say so', 'device rover stop']],
  'pan-tilt': [['Every 30 seconds', 'every 30 seconds', 'Look round', 'device pan-tilt sweep'], ['I say look up', 'when I say look up', 'Tilt up', 'device pan-tilt tilt 30']],
  microscope: [['I say focus', 'when I say focus', 'Focus by contrast', 'device microscope focus']],
  weather: [['Every 10 minutes', 'every 10 minutes', 'Read and send', 'device weather read']],
  scale: [['I say weigh', 'when I say weigh', 'Weigh', 'device scale read']],
};
export function programBoard(r: Recipe, at = Date.now()): Board | null {
  const rules = PROGRAMS[r.id]; if (!rules) return null;
  const b: Board = { title: `${r.name}'s program`, kind: 'flow', armed: true, quiet: true, cooldown: 1500, about: `What the ${r.name} does, as rules its controller runs: each IF starts its THEN. Change the numbers, add rules, or switch it off. It reads ${r.id === 'rover' ? 'rover_distance (mm, its time-of-flight sensor, up to 4 m), rover_speed (m/s), rover_heading (°) and rover_battery (%)' : `${r.id}_… numbers`}.`, nodes: {}, edges: {}, createdAt: at, updatedAt: at };
  rules.forEach(([il, iw, tl, tw], i) => { b.nodes[`if${i}`] = { label: `IF ${il}`, step: { kind: 'trigger', what: iw } }; b.nodes[`then${i}`] = { label: `THEN ${tl}`, step: { kind: 'action', what: tw } }; b.edges[`e${i}`] = { from: `if${i}`, to: `then${i}`, rel: 'flows to' }; });
  return b;
}

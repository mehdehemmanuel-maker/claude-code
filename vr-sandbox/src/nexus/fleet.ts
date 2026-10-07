// The warehouse's robots: each with a name you can change, abilities, a battery, and its own rules, kept as a pipeline
// on the node boards (an IF its trigger, a THEN its action) that you can open, read and change like any other. They work
// the way warehouse robots work: they drive a grid of floor markers (as the Kiva robots read 2D codes on the floor, so
// each knows exactly where it stands), stop, turn in place and go, never through a marker another robot holds (each holds
// the markers ahead of it before it moves, and lets them go as it passes); a mast robot lifts its carriage to a shelf,
// reaches in with its forks and takes or puts a tote. Left alone they choose what to do from what they can do; tired,
// they go to a charging dock; told to sleep, they park on a dock and dim.
//
// Times here are a warehouse's, sped up: a battery that lasts a working shift in a real robot lasts minutes here, so you
// see it run down and charge. Speeds and accelerations are in the range warehouse robots publish (about 1.5 m/s at most,
// gentle starts); they are estimates for these robots, not measurements of any one.

import { QServo, Servo } from './motion';
import type { Board } from './boards';

// ==== the floor: markers, lanes, shelves, docks ========================================================================
export interface Spot { id: string; x: number; z: number }
/** A shelf place: its rack row, bay and level; the marker a robot stands on to reach it; where it is; and what it holds. */
export interface Slot { id: string; row: number; bay: number; level: number; spot: string; x: number; y: number; z: number; holds: string | null }
export interface Floor { spots: Map<string, Spot>; links: Map<string, string[]>; slots: Slot[]; docks: string[]; station: string; door: string; table: string }
/** The warehouse's front edge (z, m): it stands behind you as you face the table, its open side toward you. */
export const WZ = 3.4;
export const ROWS = 3, BAYS = 4, LEVELS = [0.12, 0.72, 1.32] as const, BAY_W = 1.35, RACK_D = 0.5;
/** The lanes robots drive along (z), the rack fronts they serve (z), and the bays' middles (x). */
export const LANES = [WZ + 0.6, WZ + 1.9, WZ + 3.2], RACK_Z = LANES.map((z) => z + 0.4), BAY_X = [-2.025, -0.675, 0.675, 2.025], SIDE_X = 3.1;

export function warehouseFloor(): Floor {
  const spots = new Map<string, Spot>(), links = new Map<string, string[]>();
  const add = (id: string, x: number, z: number) => { spots.set(id, { id, x, z }); links.set(id, []); };
  const join = (a: string, b: string) => { links.get(a)!.push(b); links.get(b)!.push(a); };
  LANES.forEach((z, r) => {
    const xs = [-SIDE_X, ...BAY_X.slice(0, 2), ...(r === 0 ? [0] : []), ...BAY_X.slice(2), SIDE_X];
    xs.forEach((x, i) => { add(`L${r}:${x}`, x, z); if (i) join(`L${r}:${xs[i - 1]}`, `L${r}:${x}`); });
    if (r) for (const x of [-SIDE_X, SIDE_X]) join(`L${r - 1}:${x}`, `L${r}:${x}`);
  });
  // docks and the pick station along the front, the door out, and the way to the table
  const docks = ['dock1', 'dock2', 'dock3'];
  [[docks[0]!, BAY_X[0]!], [docks[1]!, BAY_X[1]!], [docks[2]!, BAY_X[3]!]].forEach(([id, x]) => { add(id as string, x as number, WZ + 0.18); join(id as string, `L0:${x}`); });
  add('station', BAY_X[2]!, WZ + 0.18); join('station', `L0:${BAY_X[2]}`);
  add('door', 0, WZ - 0.3); join('door', 'L0:0');
  add('out', -1.35, 1.6); join('out', 'door');
  add('aisle', -1.35, -1.25); join('aisle', 'out');
  add('table', -0.98, -1.25); join('table', 'aisle');
  const slots: Slot[] = [];
  for (let r = 0; r < ROWS; r++) for (let b = 0; b < BAYS; b++) LEVELS.forEach((y, l) => slots.push({ id: `${'ABC'[r]}${b + 1}-${l + 1}`, row: r, bay: b, level: l, spot: `L${r}:${BAY_X[b]}`, x: BAY_X[b]!, y, z: RACK_Z[r]! + RACK_D / 2, holds: null }));
  return { spots, links, slots, docks, station: 'station', door: 'door', table: 'table' };
}

/** The shortest way between two markers (Dijkstra over the lanes), round the markers to keep clear of; null if none. */
export function route(f: Floor, from: string, to: string, avoid: Set<string> = new Set()): string[] | null {
  const dist = new Map<string, number>([[from, 0]]), prev = new Map<string, string>(), open = new Set([from]);
  while (open.size) {
    let u = ''; let best = Infinity; for (const n of open) { const d = dist.get(n)!; if (d < best) { best = d; u = n; } }
    open.delete(u); if (u === to) break;
    const a = f.spots.get(u)!;
    for (const v of f.links.get(u) ?? []) {
      if (avoid.has(v) && v !== to) continue;
      const b = f.spots.get(v)!, d = best + Math.hypot(b.x - a.x, b.z - a.z);
      if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, u); open.add(v); }
    }
  }
  if (!dist.has(to)) return null;
  const out = [to]; for (let x = to; x !== from; ) { x = prev.get(x)!; out.unshift(x); }
  return out;
}

// ==== what a robot can do =============================================================================================
export type AbilityId = 'drive' | 'lift' | 'carry' | 'scan' | 'patrol' | 'tidy' | 'dance' | 'deliver';
export const ABILITIES: Record<AbilityId, string> = {
  drive: 'drives the floor markers, stopping and turning in place',
  lift: 'lifts its carriage up its mast to the top shelf (1.4 m)',
  carry: 'takes and puts totes with its forks (up to 30 kg)',
  scan: 'reads every shelf code it passes with its camera',
  patrol: 'goes round the lanes on its own, checking',
  tidy: 'moves totes to where they belong',
  dance: 'spins and flashes its lights when it is told to, or happy',
  deliver: 'takes builds between the table and the shelves',
};
export type Act =
  | { do: 'go'; to: string } | { do: 'lift'; h: number } | { do: 'reach'; out: boolean } | { do: 'take'; slot?: string } | { do: 'put'; slot?: string }
  | { do: 'wait'; s: number } | { do: 'charge' } | { do: 'sleep' } | { do: 'spin'; turns: number } | { do: 'face'; z: number; x: number } | { do: 'done'; then?: string };
export type TaskKind = 'restock' | 'tidy' | 'patrol' | 'wander' | 'dance' | 'charge' | 'sleep' | 'store' | 'fetch' | 'come';
export interface Task { kind: TaskKind; why: string; acts: Act[]; build?: string }
export type BotState = 'idle' | 'turning' | 'driving' | 'waiting' | 'lifting' | 'reaching' | 'working' | 'charging' | 'sleeping';
export interface Bot {
  id: string; name: string; colour: number; abilities: AbilityId[];
  spot: string; x: number; z: number; h: number; lift: number; reach: number; battery: number;
  state: BotState; asleep: boolean; carrying: string | null; task: Task | null; idleFor: number;
  /** the markers it holds (where it stands and the way ahead it has taken) */ holds: string[];
  /** what it did, newest last */ log: { at: number; text: string }[];
  /** its motion: speed along the way, turning, lifting, reaching */ drive: Servo; turn: QServo; lifter: Servo; forks: Servo;
  /** the straight run it is on: from where, to where, how far; and how long it has waited */ run: { path: string[]; x0: number; z0: number; len: number } | null; waited: number;
  /** how fast it went and sped up last step, for its wheels and how it pitches */ v: number; a: number; spin: number;
  /** what it is doing now, in words */ doing: string;
}
/** Each robot's top speed (m/s) and acceleration (m/s²), turning (rad/s, rad/s²), lifting and reaching (m/s, m/s²). */
export const MOTION = { v: 1.2, a: 0.6, w: 1.4, aw: 2.5, lv: 0.45, la: 0.8, rv: 0.35, ra: 1.0 } as const;
/** How fast its battery runs down and charges, %/s (sped up: see the top of this file). */
export const BATTERY = { driving: 0.35, lifting: 0.5, idle: 0.02, asleep: 0.004, charging: 1.6, low: 25, reflex: 8, full: 95 } as const;

export function newBot(id: string, name: string, colour: number, abilities: AbilityId[], spot: string, f: Floor): Bot {
  const s = f.spots.get(spot)!;
  return { id, name, colour, abilities, spot, x: s.x, z: s.z, h: Math.PI, lift: 0.1, reach: 0, battery: 70 + Math.round(Math.random() * 25), state: 'idle', asleep: false, carrying: null, task: null, idleFor: 0, holds: [spot], log: [], drive: new Servo(0, MOTION.v, MOTION.a), turn: new QServo(MOTION.w, MOTION.aw), lifter: new Servo(0.1, MOTION.lv, MOTION.la), forks: new Servo(0, MOTION.rv, MOTION.ra), run: null, waited: 0, v: 0, a: 0, spin: 0, doing: 'waiting for work' };
}
/** The robots the warehouse starts with: three, each able to do a little different. */
export function startingFleet(f: Floor): Bot[] {
  return [
    newBot('r1', 'Rex', 0xff9100, ['drive', 'lift', 'carry', 'scan', 'tidy', 'deliver'], 'dock1', f),
    newBot('r2', 'Juno', 0x00e5ff, ['drive', 'lift', 'carry', 'patrol', 'scan', 'deliver'], 'dock2', f),
    newBot('r3', 'Pip', 0xff4081, ['drive', 'lift', 'carry', 'dance', 'patrol', 'tidy'], 'dock3', f),
  ];
}
/** A name as rules read it: lower case, letters and digits, underscores between. */
export const factName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'robot';

// ==== the fleet: what each does, and how it moves ======================================================================
export interface FleetHost {
  /** a build carried from a shelf has been put on the table: build it there */ arrived?(build: string, by: Bot): void;
  /** a build has been lifted off the table to be taken in */ took?(build: string, by: Bot): void;
  /** a build taken from the table has been put on a shelf */ stored?(build: string, slot: Slot, by: Bot): void;
  /** something said by a robot, for the room's chat */ said?(text: string, by: Bot): void;
}
export class Fleet {
  readonly floor = warehouseFloor();
  bots: Bot[];
  /** who holds each marker */ private readonly held = new Map<string, string>();
  /** builds waiting at the table to be taken in */ waiting: string[] = [];
  private t = 0;
  constructor(private readonly host: FleetHost = {}, bots?: Bot[], private readonly rand: () => number = Math.random) {
    this.bots = bots ?? startingFleet(this.floor);
    for (const b of this.bots) for (const s of b.holds) this.held.set(s, b.id);
    // the shelves start part full of totes
    let k = 0; for (const s of this.floor.slots) if ((k++ * 7) % 5 < 3) s.holds = `tote-${s.id}`;
  }
  bot(nameOrId: string): Bot | null { const n = nameOrId.toLowerCase(); return this.bots.find((b) => b.id === n || b.name.toLowerCase() === n || factName(b.name) === factName(n)) ?? null; }
  private say(b: Bot, text: string): void { b.log.push({ at: this.t, text }); if (b.log.length > 30) b.log.shift(); }

  // ---- what each is told, and what it chooses -------------------------------------------------------------------------
  /** A command, in words, to a robot: what it will do, or why it cannot. */
  command(b: Bot, what: string): string {
    const w = what.trim().toLowerCase();
    if (/^(sleep|go to sleep|rest|power down)$/.test(w)) return this.give(b, this.sleepTask(b, 'you told it to sleep'));
    if (/^(wake|wake up|on)$/.test(w)) { if (!b.asleep) return `${b.name} is awake.`; b.asleep = false; b.state = 'idle'; this.say(b, 'woken'); return `${b.name} wakes up.`; }
    if (/^(charge|go charge|dock|go to (the )?(charging )?dock)$/.test(w)) return this.give(b, this.chargeTask(b, 'you sent it to charge'));
    if (/^(stop|halt|cancel)$/.test(w)) { this.drop(b, 'you stopped it'); return `${b.name} stops where it is.`; }
    if (/^(come|come here|come to me|come to (the )?table)$/.test(w)) return this.give(b, { kind: 'come', why: 'you called it', acts: [{ do: 'go', to: this.floor.table }, { do: 'wait', s: 6 }, { do: 'done' }] });
    if (/^(store|come|fetch)/.test(w) && !b.abilities.includes(w.startsWith('come') ? 'drive' : 'deliver')) return `${b.name} cannot ${w.split(' ')[0]}: it has no ${w.startsWith('come') ? 'drive' : 'deliver'} ability.`;
    if (/^(store|store (the |a )?build|take (it|the build) in)$/.test(w)) { const t = this.storeTask(b); return t ? this.give(b, t) : `There is no build waiting at the table for ${b.name} to take in.`; }
    if (/^(something|anything|choose|random|work)$/.test(w)) { const t = this.choose(b); return t ? this.give(b, t) : `${b.name} has nothing it can do.`; }
    const kinds: Record<string, TaskKind> = { restock: 'restock', tidy: 'tidy', patrol: 'patrol', wander: 'wander', dance: 'dance' };
    const k = kinds[w.split(/\s+/)[0]!]; if (k) { const t = this.taskOf(b, k, 'you told it to'); return t ? this.give(b, t) : `${b.name} cannot ${k}: it has no ${NEEDS[k]?.join(' or ') ?? k} ability.`; }
    return `${b.name} does not know "${what}". It can: sleep, wake, charge, stop, come, store, restock, tidy, patrol, wander, dance, something.`;
  }
  private give(b: Bot, t: Task): string {
    if (b.asleep && t.kind !== 'sleep') b.asleep = false;
    this.drop(b, ''); b.task = t; b.idleFor = 0; this.say(b, `${t.kind}: ${t.why}`);
    return `${b.name}: ${TASK_SAYS[t.kind]} (${t.why}).`;
  }
  private drop(b: Bot, why: string): void {
    if (b.task && why) this.say(b, `left ${b.task.kind}: ${why}`);
    b.task = null; b.run = null; b.drive.pos = 0; b.drive.vel = 0; b.state = b.asleep ? 'sleeping' : 'idle';
    this.release(b, [b.spot]);
  }
  /** What it chooses to do when no one tells it: charge when low, take in a build waiting, else something it can do, at random. */
  choose(b: Bot): Task | null {
    if (b.battery < BATTERY.low) return this.chargeTask(b, `its battery is down to ${Math.round(b.battery)}%`);
    if (b.abilities.includes('deliver') && this.waiting.length && !this.bots.some((o) => o.task?.kind === 'store')) { const t = this.storeTask(b); if (t) return t; }
    const can = (Object.keys(NEEDS) as TaskKind[]).filter((k) => NEEDS[k]!.every((a) => b.abilities.includes(a as AbilityId)));
    const weights = can.map((k) => (k === 'restock' ? 3 : k === 'wander' ? 1 : 2));
    let r = this.rand() * weights.reduce((a, x) => a + x, 0);
    for (let i = 0; i < can.length; i++) { r -= weights[i]!; if (r <= 0) return this.taskOf(b, can[i]!, 'it chose to, idle'); }
    return null;
  }
  taskOf(b: Bot, k: TaskKind, why: string): Task | null {
    if (NEEDS[k] && !NEEDS[k]!.every((a) => b.abilities.includes(a as AbilityId))) return null;
    const pick = <T>(xs: T[]): T | null => (xs.length ? xs[Math.floor(this.rand() * xs.length)]! : null);
    const f = this.floor;
    switch (k) {
      case 'restock': {
        const s = pick(f.slots.filter((x) => x.holds?.startsWith('tote-') && !this.bots.some((o) => o.task?.acts.some((a) => (a.do === 'take' || a.do === 'put') && a.slot === x.id)))); if (!s) return null;
        return { kind: k, why, acts: [...this.fetchActs(s), { do: 'go', to: f.station }, ...this.putDownActs(), { do: 'wait', s: 2.5 }, { do: 'reach', out: true }, { do: 'take' }, { do: 'reach', out: false }, ...this.putBackActs(s), { do: 'done' }] };
      }
      case 'tidy': {
        const from = pick(f.slots.filter((x) => x.holds?.startsWith('tote-'))), to = pick(f.slots.filter((x) => !x.holds)); if (!from || !to) return null;
        return { kind: k, why, acts: [...this.fetchActs(from), ...this.putBackActs(to), { do: 'done' }] };
      }
      case 'patrol': { const lanes = [...f.spots.keys()].filter((id) => id.startsWith('L')); const way = [pick(lanes)!, pick(lanes)!, pick(lanes)!]; return { kind: k, why, acts: [...way.flatMap((to): Act[] => [{ do: 'go', to }, { do: 'spin', turns: 1 }]), { do: 'done' }] }; }
      case 'wander': return { kind: k, why, acts: [{ do: 'go', to: pick([...f.spots.keys()].filter((id) => id.startsWith('L')))! }, { do: 'wait', s: 2 }, { do: 'done' }] };
      case 'dance': return { kind: k, why, acts: [{ do: 'lift', h: 0.6 }, { do: 'spin', turns: 2 }, { do: 'lift', h: 0.1 }, { do: 'spin', turns: -1 }, { do: 'done' }] };
      case 'charge': return this.chargeTask(b, why);
      case 'sleep': return this.sleepTask(b, why);
      case 'store': return this.storeTask(b);
      default: return null;
    }
  }
  private freeDock(b: Bot): string { const f = this.floor; return f.docks.find((d) => !this.held.has(d) || this.held.get(d) === b.id) ?? f.docks.find((d) => !this.bots.some((o) => o !== b && o.task?.acts.some((a) => a.do === 'go' && a.to === d))) ?? f.docks[0]!; }
  chargeTask(b: Bot, why: string): Task { return { kind: 'charge', why, acts: [{ do: 'lift', h: 0.1 }, { do: 'go', to: this.freeDock(b) }, { do: 'charge' }, { do: 'done' }] }; }
  sleepTask(b: Bot, why: string): Task { return { kind: 'sleep', why, acts: [{ do: 'lift', h: 0.1 }, { do: 'go', to: this.freeDock(b) }, { do: 'sleep' }] }; }
  /** Take a build from the table to a free shelf. */
  storeTask(b: Bot): Task | null {
    const build = this.waiting[0], slot = this.floor.slots.find((s) => !s.holds && !this.bots.some((o) => o.task?.acts.some((a) => a.do === 'put' && a.slot === s.id)));
    if (!build || !slot) return null;
    this.waiting.shift(); slot.holds = `reserved:${build}`;
    return { kind: 'store', why: 'a build is waiting at the table', build, acts: [{ do: 'lift', h: 0.1 }, { do: 'go', to: this.floor.table }, { do: 'lift', h: 0.62 }, { do: 'reach', out: true }, { do: 'take' }, { do: 'reach', out: false }, { do: 'lift', h: 0.3 }, ...this.putBackActs(slot), { do: 'done', then: `stored ${build} ${slot.id}` }] };
  }
  /** Bring a build from its shelf to the table, where the room builds it. */
  fetch(b: Bot, build: string): string {
    const slot = this.floor.slots.find((s) => s.holds === build); if (!slot) return `No shelf holds that build.`;
    return this.give(b, { kind: 'fetch', why: 'you asked for a stored build', build, acts: [...this.fetchActs(slot), { do: 'go', to: this.floor.table }, { do: 'lift', h: 0.62 }, { do: 'reach', out: true }, { do: 'put' }, { do: 'reach', out: false }, { do: 'lift', h: 0.1 }, { do: 'done', then: `arrived ${build}` }] });
  }
  private fetchActs(s: Slot): Act[] { return [{ do: 'lift', h: 0.1 }, { do: 'go', to: s.spot }, { do: 'face', x: s.x, z: s.z }, { do: 'lift', h: s.y + 0.05 }, { do: 'reach', out: true }, { do: 'take', slot: s.id }, { do: 'reach', out: false }, { do: 'lift', h: 0.3 }]; }
  private putBackActs(s: Slot): Act[] { return [{ do: 'go', to: s.spot }, { do: 'face', x: s.x, z: s.z }, { do: 'lift', h: s.y + 0.08 }, { do: 'reach', out: true }, { do: 'put', slot: s.id }, { do: 'reach', out: false }, { do: 'lift', h: 0.1 }]; }
  private putDownActs(): Act[] { return [{ do: 'lift', h: 0.55 }, { do: 'reach', out: true }, { do: 'put' }, { do: 'reach', out: false }]; }

  // ---- markers held ---------------------------------------------------------------------------------------------------
  private take(b: Bot, ids: string[]): boolean { if (ids.some((id) => (this.held.get(id) ?? b.id) !== b.id)) return false; for (const id of ids) { this.held.set(id, b.id); if (!b.holds.includes(id)) b.holds.push(id); } return true; }
  private release(b: Bot, keep: string[]): void { for (const id of b.holds) if (!keep.includes(id) && this.held.get(id) === b.id) this.held.delete(id); b.holds = b.holds.filter((id) => keep.includes(id)); for (const id of keep) this.held.set(id, b.id); }
  holder(spot: string): string | undefined { return this.held.get(spot); }

  // ---- time passing ---------------------------------------------------------------------------------------------------
  /** dt s on: each robot does the next of what it is doing, its battery runs down or charges, and an idle one chooses. */
  step(dt: number): void {
    this.t += dt;
    for (const b of this.bots) {
      const was = b.v; this.stepBot(b, dt); b.a = (b.v - was) / Math.max(1e-3, dt);
      const use = b.state === 'charging' ? -BATTERY.charging : b.state === 'sleeping' ? BATTERY.asleep : b.state === 'driving' || b.state === 'turning' ? BATTERY.driving : b.state === 'lifting' || b.state === 'reaching' ? BATTERY.lifting : BATTERY.idle;
      b.battery = Math.max(0, Math.min(100, b.battery - use * dt));
      // its own reflex, under any rule: nearly empty, it goes to charge
      if (b.battery < BATTERY.reflex && b.task?.kind !== 'charge' && b.task?.kind !== 'sleep' && !b.asleep) this.give(b, this.chargeTask(b, `nearly empty (${Math.round(b.battery)}%): its own reflex`));
      if (!b.task && !b.asleep) b.idleFor += dt; else b.idleFor = 0;
    }
  }
  private stepBot(b: Bot, dt: number): void {
    b.v = 0; b.spin = 0;
    const t = b.task; if (!t) { b.state = b.asleep ? 'sleeping' : 'idle'; b.doing = b.asleep ? 'asleep on its dock' : 'waiting for work'; return; }
    const a = t.acts[0]; if (!a) { b.task = null; return; }
    const next = () => { t.acts.shift(); b.waited = 0; };
    switch (a.do) {
      case 'go': {
        b.doing = `going to ${a.to === this.floor.table ? 'the table' : a.to.startsWith('dock') ? 'a charging dock' : a.to === 'station' ? 'the pick station' : `marker ${a.to}`}`;
        if (b.spot === a.to && !b.run) { next(); return; }
        if (!b.run) {
          // the way there, round the markers other robots hold; the straight run of it it can take now
          const way = route(this.floor, b.spot, a.to, new Set([...this.held].filter(([, o]) => o !== b.id).map(([s]) => s))) ?? route(this.floor, b.spot, a.to);
          if (!way || way.length < 2) { b.waited += dt; b.state = 'waiting'; if (b.waited > 8) { this.say(b, `no way to ${a.to}`); next(); } return; }
          const run = straight(this.floor, way);
          if (!this.take(b, run.slice(1))) { b.state = 'waiting'; b.waited += dt; b.doing = 'waiting: another robot holds the way'; if (b.waited > 5 && !b.carrying) this.yieldSpot(b); return; }
          const s0 = this.floor.spots.get(run[0]!)!, s1 = this.floor.spots.get(run.at(-1)!)!;
          b.run = { path: run, x0: s0.x, z0: s0.z, len: Math.hypot(s1.x - s0.x, s1.z - s0.z) }; b.drive.pos = 0; b.drive.vel = 0; b.waited = 0;
        }
        const r = b.run, s1 = this.floor.spots.get(r.path.at(-1)!)!, want = Math.atan2(-(s1.x - r.x0), -(s1.z - r.z0));
        // stop, turn in place to face the way, then go
        const left = wrap(want - b.h);
        if (b.drive.pos === 0 && Math.abs(left) > 0.01) { b.state = 'turning'; const d = b.turn.step(Math.abs(left), dt); b.h = wrap(b.h + Math.sign(left) * d); b.spin = (Math.sign(left) * d) / dt; return; }
        b.h = want; b.turn.vel = 0; b.state = 'driving';
        const p0 = b.drive.pos; b.drive.step(r.len, dt); b.v = (b.drive.pos - p0) / dt;
        const u = r.len ? b.drive.pos / r.len : 1; b.x = r.x0 + (s1.x - r.x0) * u; b.z = r.z0 + (s1.z - r.z0) * u;
        // the markers passed are let go
        const passed = Math.floor(u * (r.path.length - 1) + 1e-6); b.spot = r.path[passed]!; this.release(b, r.path.slice(passed));
        if (b.drive.pos >= r.len) { b.run = null; b.drive.pos = 0; b.drive.vel = 0; b.spot = r.path.at(-1)!; this.release(b, [b.spot]); }
        return;
      }
      case 'face': { const want = Math.atan2(-(a.x - b.x), -(a.z - b.z)), left = wrap(want - b.h); if (Math.abs(left) < 0.01) { b.h = want; b.turn.vel = 0; next(); return; } b.state = 'turning'; b.doing = 'turning to the shelf'; const d = b.turn.step(Math.abs(left), dt); b.h = wrap(b.h + Math.sign(left) * d); b.spin = (Math.sign(left) * d) / dt; return; }
      case 'spin': { const left = Math.abs(a.turns) * Math.PI * 2; if (left < 0.01) { b.turn.vel = 0; next(); return; } b.state = 'turning'; b.doing = t.kind === 'dance' ? 'dancing' : 'looking round, scanning'; const d = b.turn.step(left, dt); b.h = wrap(b.h + Math.sign(a.turns) * d); b.spin = (Math.sign(a.turns) * d) / dt; a.turns = Math.sign(a.turns) * (left - d) / (Math.PI * 2); return; }
      case 'lift': { b.state = 'lifting'; b.doing = a.h > b.lift ? 'lifting its carriage' : 'lowering its carriage'; b.lift = b.lifter.step(a.h, dt); if (b.lift === a.h) next(); return; }
      case 'reach': { b.state = 'reaching'; b.doing = a.out ? 'reaching in with its forks' : 'drawing its forks back'; b.reach = b.forks.step(a.out ? 0.42 : 0, dt); if (b.reach === (a.out ? 0.42 : 0)) next(); return; }
      case 'take': {
        const s = a.slot ? this.floor.slots.find((x) => x.id === a.slot) : null;
        if (s) { b.carrying = s.holds; s.holds = null; } else if (t.build) { b.carrying = t.build; this.host.took?.(t.build, b); } else b.carrying = b.carrying ?? 'tote';
        this.say(b, `took ${b.carrying}${s ? ` from ${s.id}` : ''}`); next(); return;
      }
      case 'put': {
        const s = a.slot ? this.floor.slots.find((x) => x.id === a.slot) : null;
        if (s) { s.holds = b.carrying; this.say(b, `put ${b.carrying} on ${s.id}`); if (t.kind === 'store' && t.build && b.carrying === t.build) this.host.stored?.(t.build, s, b); }
        if (!s && t.kind === 'fetch' && t.build) this.host.arrived?.(t.build, b);
        b.carrying = null; next(); return;
      }
      case 'wait': { b.state = 'working'; b.doing = t.kind === 'restock' ? 'at the pick station' : 'waiting'; a.s -= dt; if (a.s <= 0) next(); return; }
      case 'charge': { b.state = 'charging'; b.doing = `charging, ${Math.round(b.battery)}%`; if (b.battery >= BATTERY.full) { this.say(b, 'charged'); next(); } return; }
      case 'sleep': { b.asleep = true; b.state = 'sleeping'; b.doing = 'asleep on its dock'; b.task = null; this.say(b, 'asleep'); return; }
      case 'done': { this.say(b, `${t.kind} done`); b.task = null; b.state = 'idle'; return; }
    }
  }
  /** Out of the way of a robot that waits on the marker it stands on: to a free marker beside it. */
  private yieldSpot(b: Bot): void {
    const free = (this.floor.links.get(b.spot) ?? []).find((n) => !this.held.has(n) && !n.startsWith('dock') && n !== 'table');
    if (free) { this.say(b, `made way at ${b.spot}`); b.task?.acts.unshift({ do: 'go', to: free }); b.waited = 0; }
  }
  /** The numbers rules read: each robot's battery, how long it has been idle (s), whether it sleeps or carries; and the fleet's. */
  facts(): Record<string, number> {
    const f: Record<string, number> = { robots_idle: this.bots.filter((b) => !b.task && !b.asleep).length, builds_waiting: this.waiting.length, builds_stored: this.floor.slots.filter((s) => s.holds?.startsWith('build-')).length };
    for (const b of this.bots) { const n = factName(b.name); f[`${n}_battery`] = Math.round(b.battery); f[`${n}_idle`] = Math.round(b.idleFor); f[`${n}_asleep`] = b.asleep ? 1 : 0; f[`${n}_carrying`] = b.carrying ? 1 : 0; }
    return f;
  }
}
const NEEDS: Partial<Record<TaskKind, string[]>> = { restock: ['lift', 'carry'], tidy: ['tidy', 'lift', 'carry'], patrol: ['patrol'], wander: ['drive'], dance: ['dance'] };
const TASK_SAYS: Record<TaskKind, string> = { restock: 'takes a tote to the pick station and back', tidy: 'moves a tote to an empty shelf', patrol: 'goes round the lanes, scanning', wander: 'goes for a look round', dance: 'dances', charge: 'goes to charge', sleep: 'goes to sleep on its dock', store: 'takes the build in to a shelf', fetch: 'brings the build to the table', come: 'comes to the table' };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** The first straight stretch of a way: the markers from its start that lie along one line. */
function straight(f: Floor, way: string[]): string[] {
  const p = (i: number) => f.spots.get(way[i]!)!, dx = p(1).x - p(0).x, dz = p(1).z - p(0).z; let k = 1;
  while (k + 1 < way.length) { const ex = p(k + 1).x - p(k).x, ez = p(k + 1).z - p(k).z; if (Math.abs(dx * ez - dz * ex) > 1e-6 || dx * ex + dz * ez <= 0) break; k++; }
  return way.slice(0, k + 1);
}

// ==== a robot's rules, as a pipeline on the boards ======================================================================
/** The rules a robot starts with, each an IF (its trigger) and a THEN (its action), by what it can do. */
export function rulesOf(b: Bot): [string, string, string, string][] {
  const n = factName(b.name), out: [string, string, string, string][] = [
    ['Battery low', `when ${n}_battery < ${BATTERY.low}`, 'Go and charge', `robot ${n} charge`],
    ['Idle a while', `when ${n}_idle > 20`, 'Do something it can', `robot ${n} something`],
  ];
  if (b.abilities.includes('deliver')) out.push(['A build waits', 'when builds_waiting > 0', 'Take it in', `robot ${n} store`]);
  if (b.abilities.includes('patrol')) out.push(['Every 10 minutes', 'every 10 minutes', 'Patrol', `robot ${n} patrol`]);
  if (b.abilities.includes('dance')) out.push(['I say dance', 'when I say dance', 'Dance', `robot ${n} dance`]);
  out.push(['I say sleep', `when I say ${n} sleep`, 'Sleep on a dock', `robot ${n} sleep`]);
  return out;
}
/** A robot's rules as a board: a flow, armed, each rule a trigger flowing to its action; its abilities said in its about. */
export function boardOfBot(b: Bot, at = Date.now()): Board {
  const board: Board = { title: `${b.name}'s rules`, kind: 'flow', armed: true, quiet: true, about: `${b.name}, a warehouse robot. It can: ${b.abilities.map((a) => ABILITIES[a]).join('; ')}. Each IF here starts its THEN; change a step's words to change what it does ("robot ${factName(b.name)} …": sleep, wake, charge, stop, come, store, restock, tidy, patrol, wander, dance, something).`, nodes: {}, edges: {}, createdAt: at, updatedAt: at };
  rulesOf(b).forEach(([il, iw, tl, tw], i) => {
    board.nodes[`if${i}`] = { label: `IF ${il}`, step: { kind: 'trigger', what: iw } };
    board.nodes[`then${i}`] = { label: `THEN ${tl}`, step: { kind: 'action', what: tw } };
    board.edges[`e${i}`] = { from: `if${i}`, to: `then${i}`, rel: 'flows to' };
  });
  return board;
}
/** A board's words rewritten for a robot's new name. */
export function renameOnBoard(board: Board, from: string, to: string): Board {
  const a = factName(from), z = factName(to), sub = (s: string) => s.replace(new RegExp(`\\b${a}(?=_|\\b)`, 'g'), z);
  const nodes = Object.fromEntries(Object.entries(board.nodes).map(([id, n]) => [id, { ...n, ...(n.step ? { step: { ...n.step, what: sub(n.step.what) } } : {}) }]));
  return { ...board, title: board.title.replace(from, to), about: (board.about ?? '').split(from).join(to).replace(new RegExp(`robot ${a}\\b`, 'g'), `robot ${z}`), nodes };
}

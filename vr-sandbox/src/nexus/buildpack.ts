// A build pack: everything a person needs to make a thing for real, from what they ask, at the least it can cost them.
// Each thing asked for is found in the library (a board by its maker's name, any part by its words) and priced at its
// cheapest real offer (src/nexus/prices.ts). What making it calls for is worked out from what it is (a Pi boots from a
// card and needs its supply; a Pico's pins must be soldered unless it is bought with headers; an LED needs its resistor
// and a breadboard), and only the bench tools those steps need are added, what you already have taken out. A choice that
// costs less overall is taken and said: a Pico bought with its headers on costs a dollar more and saves an iron when
// nothing else needs soldering. A custom part (a plate to hold the boards) is designed, its files written and its
// cheapest way to be made chosen (src/nexus/fab.ts). Every step has its lesson (src/nexus/lessons.ts). Over a budget, it
// says what would bring it under, and by how much.
// Owner of: a build's parts list, its prices and totals, its bench, its custom parts and its lessons, as one pack.

import { strToU8, zipSync } from 'fflate';
import { component } from './components';
import type { Part, V3 } from './kits';
import { fabPack, plateFor, type Profile, type Route } from './fab';
import { lessonsFor, type Lesson } from './lessons';
import { cheapest, PRICES, priceKeyOf, usd, type Offer } from './prices';
import { BOARD_DEFS, boardDef } from './sbc';

export interface Have {
  /** price keys of what you already own (an iron, a multimeter) */ owns?: string[];
  computer?: boolean; printer?: boolean; /** a USB-C Power Delivery charger of 45 W or more */ usbcCharger?: boolean;
  /** what you would spend at most, $ */ budget?: number; solder?: 'leaded' | 'lead-free';
}
export interface Line {
  key: string; what: string; n: number; section: 'buy' | 'bench' | 'helps' | 'have';
  offer: Offer | null; packs: number; usd: number | null; why: string; others: Offer[]; needs: { key: string; offer: Offer; usd: number }[];
}
export interface Made { profile: Profile; routes: Route[]; best: Route; files: Record<string, string | Uint8Array>; faults: string[] }
export interface Pack {
  asked: string; lines: Line[]; made: Made[]; lessons: Lesson[]; noLesson: string[];
  total: { buy: number; bench: number; helps: number; make: [number, number] | null; all: [number, number] };
  budget?: number; cheaper: { say: string; saves: number }[]; notes: string[]; unknown: string[];
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, '');
const ALIASES: [string, string][] = Object.entries(BOARD_DEFS).flatMap(([id, b]) => {
  const c = compact(b.name);
  return [...new Set([id, c, c.replace(/^raspberry/, ''), c.replace(/^raspberrypi/, ''), c.replace(/^drobotics/, ''), c.replace(/^orangepi/, 'opi')])].filter((a) => a.length >= 3 && !/^\d/.test(a)).map((a): [string, string] => [a, id]);
}).concat([['pico', 'pico1'], ['picow', 'pico1w'], ['pipico', 'pico1']]).sort((a, b) => b[0].length - a[0].length);

/** A board by any of its names ("pi 5 8gb", "Raspberry Pi Pico 2 W", "rdk x5", "orange pi 5"), as the library's words;
 *  with no memory said, its cheapest priced size (said in its note). */
export function boardWords(t: string): { words: string; note?: string } | null {
  // its memory read before the words run together ("pi 5 8gb" is not "pi58gb")
  const ram = /\b(\d+(?:\.\d+)?)\s*gb\b/i.exec(t), rest = compact(t.replace(/\b(\d+(?:\.\d+)?)\s*gb\b/i, ''));
  const hit = ALIASES.find(([a]) => a === rest); if (!hit) return null;
  const id = hit[1], b = boardDef(id);
  if (b.cls === 'pico') return { words: `pico ${id}` };
  if (ram && b.ram.includes(Number(ram[1]))) return { words: `sbc ${id} ${ram[1]}GB` };
  const priced = b.ram.map((r) => ({ r, p: cheapest(`sbc-${id}-${r}gb`) })).filter((x) => x.p).sort((x, y) => x.p!.usd - y.p!.usd)[0];
  const r = priced?.r ?? b.ram[0]!;
  return { words: `sbc ${id} ${r}GB`, note: `${ram ? `${ram[1]} GB is not a size it is sold in` : 'no memory size said'}: the ${r} GB, its cheapest${priced ? ` at ${usd(priced.p!.usd)}` : ''}, taken (say "${b.name} ${b.ram.at(-1)}GB" for more)` };
}

/** What one piece of the ask is, as the library's words, its count and anything said about it. */
function read(chunk: string): { n: number; words?: string; flag?: 'plate' | 'bench' | 'computer' | 'phone'; note?: string } {
  const m = /^(\d+)\s*(?:x|×|of)?\s+(.+)$/i.exec(chunk.trim()), n = m ? Number(m[1]) : 1, t = (m ? m[2]! : chunk).trim();
  if (/\b(plate|mount(ing)?( plate)?|base ?plate|bracket for)\b/i.test(t)) return { n, flag: 'plate' };
  if (/\b(solder(ing)? (kit|iron|station|setup)|bench|tools?)\b/i.test(t)) return { n, flag: 'bench' };
  if (/^(a |my )?(computer|laptop|pc)\b/i.test(t)) return { n, flag: 'computer' };
  if (/^(a |my )?phone\b/i.test(t)) return { n, flag: 'phone' };
  if (/\bmeca\s*500\b/i.test(t)) return { n, words: `robotarm Meca500-${/r4/i.test(t) ? 'R4' : 'R3'}` };
  if (/^(an? )?(red )?leds?$/i.test(t)) return { n, words: 'led red 5mm' };
  const b = boardWords(t); if (b) return { n, words: b.words, note: b.note };
  return { n, words: t };
}

/** What the ask says you have or would spend ("I have a laptop", "I own a soldering iron", "under $150"), taken out of
 *  it and into what you have. */
export function haveOf(asked: string, have: Have = {}): { rest: string; have: Have } {
  const h: Have = { ...have, owns: [...(have.owns ?? [])] }, rest: string[] = [];
  for (const ch of asked.split(/\s*(?:,|;|\+|\bplus\b|\b(?:and|but)\b(?=\s+(?:i|we)\b))\s*/i)) {
    const b = /\b(?:budget|under|below|at most|max(?:imum)?|less than|up to)\s*(?:of\s*)?\$\s*(\d+(?:\.\d+)?)/i.exec(ch) ?? /^\s*\$\s*(\d+(?:\.\d+)?)\s*(?:budget|max)?\s*$/i.exec(ch);
    if (b) { h.budget = Number(b[1]); continue; }
    const m = /^\s*(?:and\s+)?(?:i|we)\s+(?:already\s+)?(?:have|own|got|'ve got)\s+(?:a|an|my|the|some)?\s*(.+)$/i.exec(ch);
    if (!m) { rest.push(ch); continue; }
    for (const t of m[1]!.split(/\s+and\s+(?:a|an|my)?\s*/i)) {
      if (/\b(computer|laptop|pc|desktop|mac)\b/i.test(t)) h.computer = true;
      else if (/\b3d printer|printer\b/i.test(t)) h.printer = true;
      else if (/\b(usb-?c|pd)\b.*\b(charger|supply)\b|\bcharger\b/i.test(t)) h.usbcCharger = true;
      else if (/\bsoldering iron|\biron\b/i.test(t)) h.owns!.push('soldering-iron');
      else if (/\bmulti-?meter\b/i.test(t)) h.owns!.push('multimeter');
      else if (/\bbreadboard\b/i.test(t)) h.owns!.push('breadboard');
      else if (/\bscrewdrivers?\b/i.test(t)) h.owns!.push('screwdriver');
      else if (/\b(sd card|micro ?sd)\b/i.test(t)) h.owns!.push('microsd-32gb');
    }
  }
  return { rest: rest.join(', '), have: h };
}

export function pack(asked0: string, have0: Have = {}): Pack {
  const { rest: asked, have } = haveOf(asked0, have0);
  const owns = new Set(have.owns ?? []); if (have.usbcCharger) owns.add('usbc-pd-65w');
  const has = (k: string) => owns.has(k), lines: Line[] = [], notes: string[] = [], unknown: string[] = [], processes: string[] = [];
  const add = (key: string, n: number, section: Line['section'], why: string, pick?: (o: Offer) => boolean): Line | null => {
    const p = PRICES[key]; if (!p) return null;
    const was = lines.find((l) => l.key === key); if (was) { if (!was.why.includes(why)) was.why += `; ${why}`; return was; }
    if (has(key)) { const l: Line = { key, what: p.what, n, section: 'have', offer: null, packs: 0, usd: 0, why: `${why} (you have it)`, others: [], needs: [] }; lines.push(l); return l; }
    let c = cheapest(key, n, has);
    if (c && pick) { const o = p.offers.find(pick); if (o) { const per = o.per ?? 1, packs = Math.max(Math.ceil(n / per), Math.ceil((o.min ?? 1) / per)); c = { offer: o, packs, usd: +(packs * o.usd).toFixed(4), needs: [], others: p.offers.filter((x) => x !== o) }; } }
    const l: Line = { key, what: p.what, n, section, offer: c?.offer ?? null, packs: c?.packs ?? 0, usd: c?.usd ?? null, why, others: c?.others ?? [], needs: c?.needs ?? [] };
    lines.push(l); return l;
  };
  // what was asked for
  const chunks = asked.split(/\s*(?:,|;|\+|\band\b|\bwith\b|\bplus\b)\s*/i).filter((s) => s.trim());
  const flags = new Set<string>(), boards: { id: string; n: number; line: Line | null; header?: boolean }[] = [];
  for (const ch of chunks) {
    const r = read(ch); if (r.note) notes.push(r.note);
    if (r.flag) { flags.add(r.flag); continue; }
    const c = component(r.words!);
    if (typeof c === 'string') { unknown.push(`${ch.trim()}: ${c}`); continue; }
    const key = priceKeyOf(c.item.id);
    if (!key) { unknown.push(`${c.item.name}: the library draws it (${c.item.id}) but no seller's price is kept for it yet`); continue; }
    const bm = /^(sbc|pico) (\S+)/.exec(r.words!), id = bm?.[2];
    const l = add(key, r.n, 'buy', 'you asked for it');
    if (id && BOARD_DEFS[id]) boards.push({ id, n: r.n, line: l });
    if (/^(chipresistor|mlcc|chip|regulator)\b/.test(r.words!) && !/DIP/.test(r.words!)) notes.push(`${c.item.name} is a surface-mount part: it needs a circuit board designed for it, which is not made here yet; priced for when it is`);
    if (/^led\b/.test(r.words!)) processes.push('led-circuit');
    if (/^robotarm/.test(r.words!)) notes.push('the Meca500 is sold new by quote only; its programs run here first, in the Computer app, against its controller as its manual gives it');
  }
  // what making it calls for
  // an iron had or asked for makes soldering headers on free; without one, headers bought on save the iron
  const solderIron = has('soldering-iron') || flags.has('bench');
  for (const b of boards) {
    const d = boardDef(b.id);
    if (d.cls === 'pico' || b.id === 'pizero2w') {
      // headers soldered by you, or bought on: whichever costs less with the bench it brings
      const bare = PRICES[b.line!.key]!.offers.find((o) => !/header/i.test(o.name)), withH = PRICES[b.line!.key]!.offers.find((o) => /header/i.test(o.name));
      if (bare && withH && !solderIron) {
        b.line!.offer = withH; b.line!.usd = +(withH.usd * b.n).toFixed(2); b.line!.packs = b.n; b.line!.others = [bare]; b.header = true;
        notes.push(`${d.name} bought with its headers on: ${usd(withH.usd - bare.usd)} more than bare, and nothing else here needs an iron`);
      } else processes.push('solder-headers');
      processes.push(d.cls === 'pico' ? 'flash-micropython' : 'flash-pi-os');
    } else processes.push('flash-pi-os');
    if (d.cls !== 'pico') {
      add('microsd-32gb', b.n, 'buy', `${d.name} boots from a card`);
      if (b.id === 'pi5') { add('pi-27w-psu', b.n, 'buy', 'a Pi 5 wants 5 V at 5 A over USB-C'); add('pi5-cooler', b.n, 'helps', 'a Pi 5 under load slows without a heat sink'); }
      else notes.push(`${d.name}'s supply: ${d.power}, as its maker says; not priced here yet`);
    }
  }
  if (boards.length) processes.push('program-with-claude');
  if (processes.includes('led-circuit')) {
    add('breadboard', 1, 'buy', 'to wire the LED without soldering');
    add('jumper-wires', 1, 'buy', 'to wire the breadboard');
    if (boards.some((b) => boardDef(b.id).cls !== 'pico' && boardDef(b.id).header === 'pins')) add('jumper-wires-ff', 1, 'buy', 'female ends for the Pi\'s header pins', (o) => /Extension/.test(o.name));
  }
  if (flags.has('bench')) processes.push('solder-joint');
  if (processes.some((p) => p.startsWith('solder'))) {
    add('soldering-iron', 1, 'bench', 'to solder');
    add(have.solder === 'lead-free' ? 'solder-lead-free' : 'solder-leaded', 1, 'bench', have.solder === 'lead-free' ? 'lead-free, as you asked' : 'leaded 60/40 is the easiest to learn on (Adafruit); say lead-free for none');
    add('tip-cleaner', 1, 'bench', 'a clean tip is what makes solder flow');
    if (flags.has('bench')) add('flush-cutters', 1, 'bench', 'to trim leads after soldering');
    for (const [k, why] of [['iron-stand', 'somewhere safe to put it down'], ['flux-pen', 'solder flows better with more flux'], ['solder-wick', 'to take a bad joint apart'], ['helping-hands', 'holds the work'], ['silicone-mat', 'a bench that does not burn'], ['multimeter', 'to check joints and voltages']] as const) add(k, 1, 'helps', why);
    if (!flags.has('bench')) add('flush-cutters', 1, 'helps', 'to trim leads');
    processes.push('multimeter');
  }
  // the custom part
  const made: Made[] = [];
  if (flags.has('plate')) {
    const onIt = boards.filter((b) => boardDef(b.id).hole >= 2.5).flatMap((b) => Array.from({ length: b.n }, () => b.id));
    if (!onIt.length) notes.push('a plate needs boards with mounting holes to hold: say which (a Pi 5, an RDK X5…)');
    else {
      const prof = plateFor(onIt, { fit: [100, 100] }), fp = fabPack(prof, { printer: have.printer });
      made.push({ profile: prof, ...fp });
      boards.filter((b) => boardDef(b.id).cls === 'pico').forEach((b) => notes.push(`${boardDef(b.id).name} rides on its breadboard, not on the plate`));
      add('m25-standoffs', 1, 'buy', 'the boards stand on these, screwed through the plate');
      add('screwdriver', 1, 'bench', 'to screw the standoffs');
      processes.push('mount-standoffs', fp.best.id.startsWith('pcb') ? 'order-board-plate' : fp.best.id === 'laser-scs' ? 'order-laser' : 'print-part');
    }
  }
  if (flags.has('phone')) notes.push('your phone: these lessons and photos of each step as you go; Raspberry Pi Connect runs in its browser');
  // the computer to program on: a Pi 5 in the pack is one (it needs a screen, keyboard and mouse); else a laptop you have,
  // else a Pi 5 kit
  const pi5 = boards.find((b) => b.id === 'pi5');
  if (!have.computer && pi5) notes.push('your Pi 5 is your computer too (Raspberry Pi OS has Thonny for a Pico): it needs a USB keyboard and mouse, a micro-HDMI to HDMI cable and a screen (a TV does); not priced here yet');
  else if (!have.computer && (boards.length || flags.has('computer'))) add('pi5-desktop-kit-4gb', 1, 'buy', 'a computer to write the card and program the board on; if you have a laptop, say you have a computer and it goes');
  // what it costs, and how it could cost less
  const sum = (s: Line['section']) => +lines.filter((l) => l.section === s).reduce((a, l) => a + (l.usd ?? 0) + l.needs.reduce((x, y) => x + y.usd, 0), 0).toFixed(2);
  const b0 = sum('buy'), bench = sum('bench'), helps = sum('helps');
  const make: [number, number] | null = made.length && made.every((m) => m.best.lo != null) ? [made.reduce((a, m) => a + m.best.lo!, 0), made.reduce((a, m) => a + m.best.hi!, 0)] : null;
  const all: [number, number] = [+(b0 + bench + (make?.[0] ?? 0)).toFixed(2), +(b0 + bench + (make?.[1] ?? 0)).toFixed(2)];
  const cheaper: Pack['cheaper'] = [];
  for (const b of boards) {
    const d = boardDef(b.id), l = b.line; if (!l?.usd || d.cls === 'pico') continue;
    const less = d.ram.map((r) => ({ r, p: cheapest(`sbc-${b.id}-${r}gb`) })).filter((x) => x.p && x.p.usd < l.usd! / b.n).sort((x, y) => x.p!.usd - y.p!.usd);
    if (less.length) cheaper.push({ say: `${d.name} with ${less[0]!.r} GB instead (${usd(less[0]!.p!.usd)})`, saves: +(l.usd - less[0]!.p!.usd * b.n).toFixed(2) });
  }
  // a Pico for the dearest Linux board, once, where the job may not need Linux
  const dear = boards.filter((b) => boardDef(b.id).cls !== 'pico' && b.line?.usd).sort((x, y) => y.line!.usd! - x.line!.usd!)[0], pico = cheapest('pico-pico2w');
  if (dear && pico) cheaper.push({ say: `a Pico 2 W (${usd(pico.usd)}) for the ${boardDef(dear.id).name}, if its job is pins, sensors and Wi-Fi without Linux, a camera or AI`, saves: +(dear.line!.usd! / dear.n - pico.usd).toFixed(2) });
  const comp = lines.find((l) => l.key.startsWith('pi5-desktop-kit') && l.usd);
  if (comp) cheaper.push({ say: 'any laptop or desktop you can use instead of the Pi 5 kit', saves: comp.usd! });
  // a Desktop Kit that costs less than its Pi 5, card and supply bought apart, and brings the keyboard, mouse and case
  if (pi5?.line?.usd && pi5.n === 1) {
    const gb = /(\d+)gb$/.exec(pi5.line.key)?.[1], kit = cheapest(`pi5-desktop-kit-${gb}gb`), apart = ['microsd-32gb', 'pi-27w-psu'].reduce((a, k) => a + (lines.find((l) => l.key === k)?.usd ?? 0), pi5.line.usd / pi5.n);
    if (kit && kit.usd < apart) cheaper.push({ say: `the Raspberry Pi 5 Desktop Kit ${gb}GB (${usd(kit.usd)}${kit.offer.stock === 'out' ? ', out of stock when seen' : ''}) instead of its Pi 5, card and supply apart (${usd(apart)}): with a keyboard, mouse, case and cables besides`, saves: +(apart - kit.usd).toFixed(2) });
  }
  if (have.budget != null && all[0] > have.budget) notes.push(`${usd(all[0])} is over your ${usd(have.budget)} by ${usd(all[0] - have.budget)}`);
  for (const l of lines) if (l.offer?.stock === 'out') notes.push(`${l.offer.name} was out of stock at ${l.offer.seller} when seen (${l.offer.seen})${l.others.length ? `; also: ${l.others.map((o) => `${o.name} ${usd(o.usd)}`).join(', ')}` : ''}`);
  const { lessons, none } = lessonsFor(processes);
  return { asked: asked0, lines, made, lessons, noLesson: none, total: { buy: b0, bench, helps, make, all }, budget: have.budget, cheaper: cheaper.sort((a, b) => b.saves - a.saves), notes, unknown };
}

/** What the pack makes, to stand before you: each custom plate as its cheapest maker would make it (FR-4 in solder-mask
 *  green, aluminium, or plastic), its holes cut, a standoff in each board hole (10 mm, typical of a standoff set's), and
 *  each board on them, drawn by the library. */
export function packPart(p: Pack): Part | null {
  const m = p.made[0]; if (!m) return null;
  const { profile: f, best } = m, mm = 0.001, t = best.t * mm, h = 10 * mm, L = f.L * mm, W = f.W * mm;
  // (solder mask over bare FR-4, with no copper under it, is a paler, yellower green than over a board's copper)
  const mat = best.mat === 'FR-4' ? { mat: 'fr4', color: 0x7cae52 } : best.mat.startsWith('5052') ? { mat: 'al-5052', color: 0xc9ced4 } : { mat: 'abs', color: 0xeeeeee };
  const at = (x: number, y: number, up: number): V3 => [x * mm - L / 2, up, y * mm - W / 2];
  const plate: Part = { name: f.name, shape: { box: [L, t, W] }, at: [0, -t / 2, 0], ...mat, cuts: f.holes.map((x) => ({ r: (x.d / 2) * mm, depth: t, at: [x.x * mm - L / 2, t / 2, x.y * mm - W / 2] as V3, dir: [0, -1, 0] as V3 })) };
  const parts: Part[] = [plate];
  for (const b of f.on) {
    const d = BOARD_DEFS[b.id]!, c = component(`sbc ${b.id} ${d.ram[0]}GB`);
    for (const [hx, hy] of d.holes) parts.push({ name: `${b.screw} standoff`, shape: { cyl: [2.5 * mm, h] }, facets: 6, at: at(b.x + hx, b.y + hy, h / 2), mat: 'nylon', color: 0x202124 });
    if (typeof c !== 'string') parts.push({ ...c.part, at: at(b.x + b.L / 2, b.y + b.W / 2, h + 1.6 * mm) });
  }
  return { name: `${f.on.map((b) => b.name).join(' and ')} on ${f.on.length > 1 ? 'their' : 'its'} plate`, parts };
}

/** The pack as one zip: its page, and each custom part's files (in a folder of its own when there are several). */
export function packZip(p: Pack): Uint8Array {
  const files: Record<string, Uint8Array> = { 'pack.md': strToU8(packText(p)) };
  p.made.forEach((m, i) => { for (const [n, d] of Object.entries(m.files)) files[p.made.length > 1 ? `part-${i + 1}/${n}` : n] = typeof d === 'string' ? strToU8(d) : d; });
  return zipSync(files, { level: 6 });
}

/** The pack as a page to read or print: what to buy, where, for how much; the bench; the part to have made and where;
 *  the lessons, step by step. */
export function packText(p: Pack): string {
  const row = (l: Line) => `| ${l.what}${l.n > 1 ? ` × ${l.n}` : ''} | ${l.offer ? `[${l.offer.name}](${l.offer.url})` : '—'} | ${l.offer?.seller ?? (l.section === 'have' ? 'you have it' : '')} | ${l.usd == null ? 'not priced' : usd(l.usd)}${l.needs.length ? ` + ${l.needs.map((x) => `${x.offer.name} ${usd(x.usd)}`).join(', ')}` : ''} | ${l.why} |`;
  const sec = (s: Line['section'], h: string) => { const ls = p.lines.filter((l) => l.section === s); return ls.length ? [`## ${h}`, '', '| what | buy | from | cost | why |', '| --- | --- | --- | --- | --- |', ...ls.map(row), ''] : []; };
  const range = (x: [number, number]) => (x[0] === x[1] ? usd(x[0]) : `${usd(x[0])}-${usd(x[1])}`);
  const out = [`# Build pack: ${p.asked}`, '', `Prices as seen ${[...new Set(p.lines.flatMap((l) => (l.offer ? [l.offer.seen] : [])))].join(', ')}, US dollars before tax. Total **${range(p.total.all)}**${p.made.length && !p.total.make ? ' plus the custom part its maker quotes' : ''}${p.budget != null ? `, against your ${usd(p.budget)}` : ''}${p.total.helps ? `; the nice-to-haves another ${usd(p.total.helps)}` : ''}. The total is what to buy, the bench, and the plate made (its shipping and tariff estimated); not tax, nor the shops' own shipping.${p.made.length ? ' Order the plate first: it is made, then shipped.' : ''}`, '',
    ...sec('buy', 'Buy'), ...sec('bench', 'Bench (what the steps need)'), ...sec('helps', 'Nice to have'), ...sec('have', 'You have')];
  for (const m of p.made) {
    out.push(`## Make: ${m.profile.name}`, '', `${m.profile.L.toFixed(1)} × ${m.profile.W.toFixed(1)} mm, ${m.profile.holes.length} holes. Files: ${Object.keys(m.files).join(', ')}.`, '', '| who | how | for | cost | file |', '| --- | --- | --- | --- | --- |',
      ...m.routes.map((r) => `| ${r.url ? `[${r.who}](${r.url})` : r.who} | ${r.how} | ${r.n} | ${r.lo == null ? 'its quote' : r.lo === r.hi ? usd(r.lo) : `${usd(r.lo)}-${usd(r.hi!)}`} | ${r.file} |`), '', `Cheapest: **${m.best.who}**, ${m.best.how}. ${m.best.note}.`, '', ...m.routes.map((r) => `- ${r.who}: ${r.src}`), '');
    if (m.faults.length) out.push(`Faults: ${m.faults.join('; ')}`, '');
  }
  if (p.cheaper.length) out.push('## To spend less', '', ...p.cheaper.map((c) => `- ${c.say}: saves ${usd(c.saves)}`), '');
  if (p.notes.length || p.unknown.length) out.push('## Said', '', ...[...p.notes, ...p.unknown].map((n) => `- ${n}`), '');
  out.push('## Lessons', '');
  for (const l of p.lessons) out.push(`### ${l.title}`, '', `${l.why}.${l.tools.length ? ` Tools: ${l.tools.map((k) => PRICES[k]?.what ?? k).join(', ')}.` : ''}`, '', ...(l.safety.length ? [`Safety: ${l.safety.join(' ')}`, ''] : []), ...l.steps.map((s, i) => `${i + 1}. ${s.do}${s.check ? ` *Done when: ${s.check}.*` : ''}`), '', `Source: ${l.src}.`, '');
  if (p.noLesson.length) out.push(`No lesson yet for: ${p.noLesson.join(', ')}.`, '');
  return out.join('\n');
}

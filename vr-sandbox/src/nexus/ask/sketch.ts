// The fast plan: an invention sketched as labelled blocks and pins before anything is designed, stood in the room,
// and turned straight into a bill the works can route.
//
// The user asked for it in those words: "you can do something like placing blocks or pins to describe your plan and
// see how it works, make a tool called visualize or fast plan ... for planning out a new invention". Everything else
// here needs a finished answer before it will draw anything — `machine.ts` wants an affordance and a size, `builds.ts`
// wants a bill with a volume for every line — and that is the wrong shape for the first ten minutes of an invention,
// where what you know is *this goes above that, and this drives that*.
//
// So a sketch is four kinds of line and nothing else:
//
//   head  disc 300x25     at 0,0.72,0   "the wheel head, plaster faced"   wood
//   pan   tub 520x110     at 0,0.65,0   "splash pan"                      steel-low
//   frame box 500x600x500 at 0,0.30,0   "welded frame"                    steel-low
//   motor use motor induction 180       at 0.26,0.28,0
//   belt  head -> motor   "4:1, a 1000 mm A-section"
//
// A block is a rough solid with a label. A `use` block is not rough at all: it is the component library's own part,
// drawn whole, because the library already draws hundreds of them and a plan should reach for one the moment it knows
// which. A pin is a line between two blocks that says what carries, drives or feeds what.
//
// What that buys, and why it is worth a file:
//  - it stands in the room and comes apart like anything else (`sketchParts` → the viewer's own `showPart`), so a plan
//    is looked at rather than read;
//  - it is a bill (`sketchBill`), so the same sketch can be thrown at the works the minute it is written: what could
//    be made here, what would be bought, what nothing here can do — before any of it is drawn properly;
//  - it is editable by being text: a line changed is a plan changed, and the volumes are derived, never typed.
import { component } from '../parts/components';
import { DENSITY } from '../parts/mass';
import type { Part, V3 } from '../parts/kits';

/** One rough solid of a plan, or a library part standing in for one. */
export interface Block {
  id: string;
  /** `box` l×h×d, `disc` dia×thick (lying flat), `can` dia×tall, `bar` dia×long (standing), `plate` l×d×thick,
   *  or `use`, where `words` names a part the component library draws and the sketch stands that instead */
  form: 'box' | 'disc' | 'can' | 'bar' | 'plate' | 'use';
  /** mm, as its form reads them */ size: number[];
  /** metres */ at: V3;
  label?: string; mat?: string; words?: string;
  /** how much of the block is really its material, 0–1 (a welded frame is about a twentieth of its own box) */ fill?: number;
}
/** A line between two blocks: what drives, carries or feeds what. */
export interface Pin { from: string; to: string; id?: string; label?: string }
export interface Sketch { title: string; blocks: Block[]; pins: Pin[]; faults: string[] }

const num = (s: string): number => Number(s.replace(/[^\d.-]/g, ''));
/** The words a plan reaches for, and the form each one is. A sketch is written fast, so "tub", "drum" and "pan" have
 *  to mean something: the first run of this tool refused "pan tub 520x110" as unreadable, which is the tool being
 *  precious about vocabulary in the one place where speed is the whole point. */
const FORMS: Record<string, Block['form']> = {
  box: 'box', block: 'box', frame: 'box', case: 'box', cube: 'box', slab: 'box',
  disc: 'disc', disk: 'disc', wheel: 'disc', pulley: 'disc', plateround: 'disc',
  can: 'can', tub: 'can', pan: 'can', drum: 'can', pot: 'can', tank: 'can', cyl: 'can', cylinder: 'can', tube: 'can', motor: 'can',
  bar: 'bar', rod: 'bar', shaft: 'bar', post: 'bar', leg: 'bar', pin: 'bar',
  plate: 'plate', sheet: 'plate', panel: 'plate', board: 'plate', deck: 'plate', top: 'plate',
  use: 'use',
};

/** A sketch read from its own text. Unparseable lines are kept as faults rather than dropped, because a plan that
 *  quietly loses a line is worse than one that says which line it could not read. */
export function sketchOf(text: string): Sketch {
  const out: Sketch = { title: 'a fast plan', blocks: [], pins: [], faults: [] };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { if (out.title === 'a fast plan') out.title = line.replace(/^#+\s*/, ''); continue; }
    const label = /"([^"]*)"/.exec(line)?.[1];
    const bare = line.replace(/"[^"]*"/g, '').trim();
    // a pin may carry a name of its own ("belt  big -> small"), because that is how anyone writes one down
    const pin = /^(?:(\S+)\s+)?(\S+)\s*->\s*(\S+)$/.exec(bare);
    if (pin) { out.pins.push({ from: pin[2]!, to: pin[3]!, ...(pin[1] ? { id: pin[1] } : {}), ...(label ? { label } : {}) }); continue; }
    const use = /^(\S+)\s+use\s+(.+?)(?:\s+at\s+(\S+))?$/.exec(bare);
    if (use) {
      const at = use[3] ? use[3].split(',').map(num) : [0, 0, 0];
      out.blocks.push({ id: use[1]!, form: 'use', words: use[2]!.trim(), size: [], at: [at[0] ?? 0, at[1] ?? 0, at[2] ?? 0], ...(label ? { label } : {}) });
      continue;
    }
    const m = /^(\S+)\s+(\S+)\s+(\S+)\s+at\s+(\S+)(?:\s+(\S+))?$/.exec(bare);
    if (!m) { out.faults.push(`could not read: ${line}`); continue; }
    const form = FORMS[m[2]!.toLowerCase()];
    if (!form) { out.faults.push(`"${m[2]}" is not a form I know (${[...new Set(Object.values(FORMS))].join(', ')}; and ${Object.keys(FORMS).length} words for them): ${line}`); continue; }
    const size = m[3]!.split('x').map(num), at = m[4]!.split(',').map(num);
    // a material may say how much of the block is really that material ("steel-low@0.08": a welded frame is a
    // twentieth of its own box, and a plan that weighs its placeholder as a solid billet is no use to anyone)
    const [mat, fill] = (m[5] ?? '').split('@');
    out.blocks.push({ id: m[1]!, form, size, at: [at[0] ?? 0, at[1] ?? 0, at[2] ?? 0], ...(label ? { label } : {}),
      ...(mat ? { mat } : {}), ...(fill ? { fill: Number(fill) } : {}) });
  }
  for (const p of out.pins) for (const end of [p.from, p.to]) {
    if (!out.blocks.some((b) => b.id === end)) out.faults.push(`the pin ${p.from} -> ${p.to} names "${end}", which is no block of this plan`);
  }
  return out;
}

/** What a block is, in metres: its box, and the shape to draw it as. */
export function blockShape(b: Block): { shape: Part['shape']; box: V3 } | null {
  const mm = 0.001, s = b.size.map((v) => v * mm);
  if (b.form === 'box') return { shape: { box: [s[0] ?? 0.1, s[1] ?? 0.1, s[2] ?? s[0] ?? 0.1] as V3 }, box: [s[0] ?? 0.1, s[1] ?? 0.1, s[2] ?? s[0] ?? 0.1] };
  if (b.form === 'plate') return { shape: { box: [s[0] ?? 0.1, s[2] ?? 0.01, s[1] ?? 0.1] as V3 }, box: [s[0] ?? 0.1, s[2] ?? 0.01, s[1] ?? 0.1] };
  if (b.form === 'disc' || b.form === 'can' || b.form === 'bar') {
    const d = s[0] ?? 0.1, h = s[1] ?? (b.form === 'disc' ? 0.02 : 0.1);
    return { shape: { cyl: [d / 2, h] as [number, number] }, box: [d, h, d] };
  }
  return null;
}

const PIN_COLOR = 0xd9a441;
/** A block is a placeholder and looks like one, but it takes the colour of what it says it is made of: a plan you
 *  cannot read at a glance is not worth standing up. */
const BLOCK_LOOK: [RegExp, number][] = [[/^steel|^iron|^stainless|^cast-iron/, 0x8b949c], [/^al-|aluminium/, 0xa8b0b6],
  [/^wood|^ply|^oak|^birch/, 0xbfa271], [/^copper|^brass|^bronze/, 0xb08454], [/^abs|^pla|^petg|^nylon|^pc$|^pp$/, 0x6f7b86],
  [/^rubber|^nbr|^epdm/, 0x4a4f54], [/^clay|^firebrick|^castable|^gypsum|^concrete/, 0xc9bda8], [/^glass|^quartz/, 0x9fc0c8]];
const blockColor = (mat?: string): number => (mat ? BLOCK_LOOK.find(([r]) => r.test(mat))?.[1] ?? 0x7f8c9b : 0x7f8c9b);

/** The plan as parts to stand in the room: every block where it was put, every pin a rod between the two it joins,
 *  each saying what it is. It comes apart like anything else the library draws, and a `use` block comes apart into
 *  the real part's own pieces, which is the whole reason to reach for one in a sketch. */
export function sketchParts(s: Sketch): Part {
  const kids: Part[] = [];
  for (const b of s.blocks) {
    if (b.form === 'use') {
      const g = component(b.words ?? '');
      if (typeof g === 'string') { kids.push({ name: `${b.id} (${b.words}: ${g})`, shape: { box: [0.06, 0.06, 0.06] }, at: b.at, color: 0xb04a3a, mat: 'abs', says: `${b.id}: the plan asks for "${b.words}" and the library does not make one — ${g}` } as Part); continue; }
      kids.push({ ...g.part, name: `${b.id} — ${b.words}`, at: b.at, says: `${b.id}: ${b.label ?? b.words}, drawn by the library as the part it is (${b.words}).` } as Part);
      continue;
    }
    const f = blockShape(b);
    if (!f) continue;
    // and it weighs what the plan says it weighs: drawn solid in its own material, a 500 mm "frame" put 1.2 tonnes
    // of steel in the room's own count, against the 22 kg the plan itself said on the same screen
    const solid = f.box[0] * f.box[1] * f.box[2] * (b.form === 'box' || b.form === 'plate' ? 1 : Math.PI / 4);
    const kg = b.mat && DENSITY[b.mat] ? solid * DENSITY[b.mat]! * (b.fill ?? 1) : undefined;
    kids.push({ name: `${b.id}${b.label ? ` — ${b.label}` : ''}`, shape: f.shape, at: b.at, color: blockColor(b.mat), mat: b.mat ?? 'abs', ...(kg !== undefined ? { kg } : {}),
      says: `${b.id}: ${b.label ?? 'a block of the plan'} — ${b.size.join(' × ')} mm as a ${b.form}${b.mat ? ` in ${b.mat}${b.fill !== undefined ? `, ${Math.round(b.fill * 100)} % of its box really there` : ''}` : ''}. A block is a placeholder: it says where a thing goes and how big it is, not what it is made of.` } as Part);
  }
  for (const p of s.pins) {
    const a = s.blocks.find((b) => b.id === p.from), b2 = s.blocks.find((b) => b.id === p.to);
    if (!a || !b2) continue;
    const d: V3 = [b2.at[0] - a.at[0], b2.at[1] - a.at[1], b2.at[2] - a.at[2]], L = Math.hypot(...d) || 0.001;
    const mid: V3 = [(a.at[0] + b2.at[0]) / 2, (a.at[1] + b2.at[1]) / 2, (a.at[2] + b2.at[2]) / 2];
    // a pin is drawn as a thin rod from one block's middle to the other's: the frame is built the way a lay's is
    const u: V3 = [d[0] / L, d[1] / L, d[2] / L], yaw = Math.atan2(u[0], u[2]), pitch = -Math.asin(Math.max(-1, Math.min(1, u[1])));
    kids.push({ name: `${p.from} → ${p.to}${p.label ? ` — ${p.label}` : ''}`, shape: { cyl: [0.008, L] }, at: mid, rot: [pitch + Math.PI / 2, yaw, 0] as V3,
      color: PIN_COLOR, mat: 'brass', says: `${p.from} → ${p.to}: ${p.label ?? 'a pin — what carries, drives or feeds what'}. ${Math.round(L * 1000)} mm apart in the plan.` } as Part);
  }
  return { name: s.title, parts: kids, says: `${s.title}: a fast plan — ${s.blocks.length} block${s.blocks.length === 1 ? '' : 's'} and ${s.pins.length} pin${s.pins.length === 1 ? '' : 's'}. Nothing here is designed yet; it is where things go and what joins them.` } as Part;
}

/** The plan as a bill is `billOfSketch` in src/nexus/works/builds.ts, where `machineBuild` already turns an
 *  invented machine into one: a bill line is the works' own vocabulary and the asking does not reach up for it. */

/** What the plan weighs where its blocks say what they are made of, and what is still unsaid. */
export function sketchWeighs(s: Sketch): { kg: number; unsaid: string[] } {
  let kg = 0; const unsaid: string[] = [];
  for (const b of s.blocks) {
    const f = blockShape(b);
    if (!f) { if (b.form !== 'use') unsaid.push(b.id); continue; }
    const d = b.mat ? DENSITY[b.mat] : undefined;
    if (d === undefined) { unsaid.push(b.id); continue; }
    const m3 = f.box[0] * f.box[1] * f.box[2] * (b.form === 'box' || b.form === 'plate' ? 1 : Math.PI / 4);
    kg += m3 * d * (b.fill ?? 1);
  }
  return { kg: +kg.toFixed(2), unsaid };
}

/** The envelope the whole plan stands in, metres. */
export function sketchSpan(s: Sketch): { size: V3; at: V3 } | null {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let any = false;
  for (const b of s.blocks) {
    const f = blockShape(b); if (!f) continue;
    any = true;
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, b.at[i]! - f.box[i]! / 2); hi[i] = Math.max(hi[i]!, b.at[i]! + f.box[i]! / 2); }
  }
  if (!any) return null;
  return { size: [hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!], at: [(lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2] };
}

/** The plan said for a person: what is in it, how big it comes out, what it weighs so far, and what it cannot read. */
export function sketchText(s: Sketch): string {
  const out = [s.title, ''], span = sketchSpan(s), w = sketchWeighs(s);
  for (const b of s.blocks) {
    const f = blockShape(b);
    out.push(`  ${b.id.padEnd(10)} ${b.form === 'use' ? `the library's own ${b.words}` : `${b.form} ${b.size.join(' × ')} mm`}  at ${b.at.map((v) => v.toFixed(2)).join(', ')} m${b.label ? `  — ${b.label}` : ''}${f && b.mat ? `  (${b.mat})` : ''}`);
  }
  for (const p of s.pins) out.push(`  ${p.from} → ${p.to}${p.label ? `  — ${p.label}` : ''}`);
  out.push('');
  if (span) out.push(`It stands in ${span.size.map((v) => (v * 1000).toFixed(0)).join(' × ')} mm.`);
  out.push(`${w.kg} kg of what it says it is made of (a block is solid unless it says what fraction of itself is${''
    } really there, as "steel-low@0.08")${w.unsaid.length ? `; ${w.unsaid.length} say no material yet (${w.unsaid.join(', ')})` : ''}.`);
  for (const f of s.faults) out.push(`fault: ${f}`);
  return out.join('\n');
}

/** "fast plan: …", "visualize: …", "plan: …" — a sketch written in the room and stood in front of you. The sketch's
 *  own lines are separated by `;` when it is said in one breath. */
export function planWords(text: string, r: { stand: (p: Part) => string }): string | null {
  const m = /^(?:fast ?plan|visuali[sz]e|sketch|plan)\s*[:\-]\s*([\s\S]+)$/i.exec(text.trim());
  if (!m) return null;
  const s = sketchOf(m[1]!.split(';').join('\n'));
  if (!s.blocks.length) return `Nothing in that reads as a block. A line is "name box 500x600x500 at 0,0.3,0 \\"what it is\\"", or "a -> b" for a pin.`;
  const said = r.stand(sketchParts(s));
  return `${sketchText(s)}\n${said}`;
}

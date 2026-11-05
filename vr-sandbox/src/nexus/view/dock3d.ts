// The 3D view docked in the dashboard (view/index.html): what the board's "Show in space" nodes are given, drawn as the
// space draws it (space3d.ts: one instanced mesh per distinct piece, far things as their boxes), in a panel beside the
// board. Turn it, zoom it, press a thing to choose the node that shows it. Entered, it fills the page; the immersive
// space (view/space.html: any scale, a headset) is one press further.

import * as THREE from 'three';
import { cutSolid, geometry, leafGeometry, studioScene } from './kit3d';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SpaceView, type Shown } from './space3d';
import { flatten, isAssembly, isPart, leavesOf, matrixOf, type Assembly } from '../assembly';
import type { Board } from '../boards';
import { block, defaultsOf, ownThread, portsOf } from '../blocks';
import { placeBlock, runBlock, wire } from '../dataflow';
import type { Cut, Keep, Part, V3 } from '../kits';
import { standOn, type Ring } from '../mate';
import type { PasteCard, PasteHooks } from './pad';

// ---- drag to imprint (spec 01, I16; design §2.9, decision 0016): what is pasted where, found from what is drawn --------
// The flow: a chip of the view's strip (a bolt the board makes, or an interface copied) is held over the view; each move
// casts a ray through the pointer and meets a drawn piece (its leaf and its matrix W: Dock3D.hit); hostOf walks the
// board's wires up from the view to the first part that holds that leaf at W (the host, and the wire it reaches the view
// by); dropOn stands the ray on the host as the paste node itself does (standOn, in the host's frame); planOf rounds the
// point; the preview is the board's own paste node run on it (runBlock: one run at a time, the latest point wins), and
// only what that run gives is drawn. Release pins it; accepting it is one change to the board (pasteEdit: one node
// spliced into the wire toward the view, one undo step), and the board's run then draws its own cut. Nothing here makes
// a negative, a check or a cut of its own. These functions read no page, so the one test runs them under Node.

export type Axis = '-y' | 'y' | '-x' | 'x' | '-z' | 'z';
/** A node's outputs as the board's last run left them. */
export type Outputs = (id: string) => Record<string, unknown> | undefined;
/** A drawn piece a ray met: the node that shows it, its leaf, its matrix in the world (W). */
export interface Hit { key: string; leaf: Part; m: THREE.Matrix4; name: string }
/** The part a paste goes on: the node and output that make it, the wire it reaches the view by (the one spliced), its
 *  frame in the world (F: the leaf's matrix there is F times the leaf's matrix within it), the part itself, and the
 *  other nodes that read that output (they keep it uncut). */
export interface Host { node: string; out: string; edge: string; F: THREE.Matrix4; value: Part; others: string[] }
/** Where a ray stands on the host, in the host's frame: the point, the normal, the face's u, the piece, and the axis most
 *  against the normal (the paste node's `toward`). */
export interface Drop { at: V3; n: V3; u: V3; piece: string; toward: Axis }
/** What is pasted: a block, its settings, the wires into it (the bolt's), its name; where it was copied from. */
export interface PasteRecipe { block: string; set: Record<string, unknown>; wires: { in: string; from: string; out: string }[]; name: string; copiedFrom?: string }
export interface PastePlan { recipe: PasteRecipe; host: Host; drop: Drop; set: Record<string, unknown> }

const live = (b: Board) => Object.entries(b.edges).filter(([, e]) => !e.deleted && !!e.out && !!e.in && !b.nodes[e.from]?.deleted && !b.nodes[e.to]?.deleted);
/** Two matrices the same within the view's precision (instance matrices are Float32): 1 µm in their place, scaled with
 *  how far out it is, and 1e-5 in their columns (choices). */
export function sameMatrix(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  const x = a.elements, y = b.elements, far = Math.max(1, Math.abs(x[12]!), Math.abs(x[13]!), Math.abs(x[14]!));
  for (let i = 0; i < 12; i++) if (Math.abs(x[i]! - y[i]!) > 1e-5) return false;
  for (let i = 12; i < 15; i++) if (Math.abs(x[i]! - y[i]!) > 1e-6 * far) return false;
  return true;
}
/** Where a thing sits within a value, by identity: every matrix at which `t` is placed inside `v` (placed at F). */
function placesOf(v: Part | Assembly, t: object, F: THREE.Matrix4, out: THREE.Matrix4[] = []): THREE.Matrix4[] {
  if (v === t) { out.push(F); return out; }
  if (isAssembly(v)) for (const it of v.items) placesOf(it.of, t, F.clone().multiply(matrixOf(it)), out);
  return out;
}
/** Whether a value placed at F draws the leaf at W. */
function holds(v: Part | Assembly, F: THREE.Matrix4, leaf: Part, W: THREE.Matrix4): boolean {
  if (isPart(v)) return leavesOf(v).some((l) => l.part === leaf && sameMatrix(F.clone().multiply(l.m), W));
  let found = false; flatten(v, (f) => { if (f.leaf === leaf && sameMatrix(f.m, W)) { found = true; return false; } return true; }, F.clone()); return found;
}
/** The host of a drop: from the value wired into the view's show node (placed at F0, the view group's matrix), up the
 *  board's wires, at each step the wire whose value holds the leaf at W, to the first part met. Refused, with why, inside
 *  a group, on a piece drawn as its box, and where no wire on the way holds the leaf (a node made it anew). */
export function hostOf(board: Board, outputsOf: Outputs, hit: { key: string; leaf: Part | null; m: THREE.Matrix4 }, F0 = new THREE.Matrix4()): Host | { refused: string } {
  if (!hit.leaf) return { refused: 'drawn as its box from here: come closer to paste on it' };
  const edges = live(board), into = (id: string) => edges.filter(([, e]) => e.to === id);
  const show = into(hit.key).find(([, e]) => e.in === 'thing'); if (!show) return { refused: `the view's node ${hit.key} is given nothing` };
  let [edge, e] = show, F = F0.clone(), value = outputsOf(e.from)?.[e.out!] as Part | Assembly | undefined;
  for (let step = 0; step < 256; step++) {
    if (!value || typeof value !== 'object') return { refused: `${e.from} gives nothing to paste on yet` };
    if (board.nodes[e.from]?.inner) return { refused: `it is made inside the group "${board.nodes[e.from]!.label}": open it to paste there` };
    if (isPart(value)) { if (!holds(value, F, hit.leaf, hit.m)) return { refused: `the piece is not where ${e.from} puts it` };
      const others = edges.filter(([id, x]) => x.from === e.from && x.out === e.out && id !== edge).map(([, x]) => x.to);
      return { node: e.from, out: e.out!, edge, F, value, others: [...new Set(others)] }; }
    // (an assembly: the wire into its node whose value holds the leaf, where that value is placed within it)
    let next: [string, typeof e, THREE.Matrix4, Part | Assembly] | null = null;
    for (const [id, w] of into(e.from)) { const v = outputsOf(w.from)?.[w.out!]; if (!v || typeof v !== 'object' || !(isPart(v) || isAssembly(v))) continue;
      const at = placesOf(value, v, F).find((m) => holds(v, m, hit.leaf!, hit.m)); if (at) { next = [id, w, at, v]; break; } }
    if (!next) return { refused: `the piece is made inside ${e.from} (${board.nodes[e.from]?.label ?? ''}), not passed on from a part it is given` };
    [edge, e, F, value] = next;
  }
  return { refused: 'the way to the view runs too deep' };
}
const AXES: [Axis, V3][] = [['y', [0, 1, 0]], ['-y', [0, -1, 0]], ['x', [1, 0, 0]], ['-x', [-1, 0, 0]], ['z', [0, 0, 1]], ['-z', [0, 0, -1]]];
/** The axis most against a normal: the way the paste node casts its ray onto that face. */
export const towardOf = (n: V3): Axis => AXES.reduce((a, b) => (-(b[1][0] * n[0] + b[1][1] * n[1] + b[1][2] * n[2]) > -(a[1][0] * n[0] + a[1][1] * n[1] + a[1][2] * n[2]) ? b : a))[0];
/** Where a ray (in the world) stands on the host: the paste node's own call (standOn on the host at its origin, its
 *  drawn shapes the views' own), in the host's frame. */
export function dropOn(host: Host, from: THREE.Vector3, dir: THREE.Vector3): Drop | null {
  const inv = host.F.clone().invert(), f = from.clone().applyMatrix4(inv), d = dir.clone().transformDirection(inv);
  const s = standOn({ name: 'holder', parts: [{ ...host.value, at: [0, 0, 0], rot: [0, 0, 0] }] }, f.toArray() as V3, d.toArray() as V3, { geometry: (sh) => geometry(sh, undefined) });
  return s ? { at: s.at, n: s.n, u: s.u, piece: s.piece, toward: towardOf(s.n) } : null;
}
/** Every bolt or screw the board makes, as something to paste: an output that has its own thread, from a node fed no
 *  part or assembly (a screw made from its sizes, not one already put somewhere). */
export function boltSources(board: Board, outputsOf: Outputs): PasteRecipe[] {
  const edges = live(board), out: PasteRecipe[] = [];
  for (const [id, n] of Object.entries(board.nodes)) { if (n.deleted || n.inner || !n.block) continue; const d = block(n.block); if (!d) continue;
    const ins = portsOf(d, { ...defaultsOf(d), ...(n.set ?? {}) }).inputs;
    const fed = edges.some(([, e]) => e.to === id && (['part', 'assembly'].includes(ins.find((q) => q.name === e.in)?.type ?? '') || (() => { const v = outputsOf(e.from)?.[e.out!]; return isPart(v) || isAssembly(v); })()));
    if (fed) continue;
    for (const [k, v] of Object.entries(outputsOf(id) ?? {})) if (isPart(v) && ownThread(v)) out.push({ block: 'imprint', set: {}, wires: [{ in: 'it', from: id, out: k }], name: v.name }); }
  return out;
}
const um = (x: number) => Math.round(x * 1e6) / 1e6;
/** The paste's settings: the recipe's, the point (rounded to 1 µm: a drawing choice) and the way the node's ray goes. */
export function planOf(recipe: PasteRecipe, host: Host, drop: Drop): PastePlan {
  return { recipe, host, drop, set: { ...recipe.set, x: um(drop.at[0]), y: um(drop.at[1]), z: um(drop.at[2]), toward: drop.toward } };
}
/** What the paste node is given for a preview: its settings, the host, and each of the recipe's wires' values. */
export function previewInputs(plan: PastePlan, outputsOf: Outputs): Record<string, unknown> {
  const i: Record<string, unknown> = { ...plan.set, part: plan.host.value }; for (const w of plan.recipe.wires) i[w.in] = outputsOf(w.from)?.[w.out]; return i;
}
const mmOf = (v: unknown) => +(Number(v) * 1000).toFixed(1) + 0;
/** The change that makes a paste on the board: its node placed between the host and the node after it, the recipe's
 *  wires and the host's part wired into it, and the wire that took the host toward the view re-pointed from the new
 *  node's pasted part (its id kept, so a many-input's order stays). Returns the new node's id. */
export function pasteEdit(plan: PastePlan, board: Board): (b: Board) => string {
  let k = 1; while (board.nodes[`pasted ${k}`]) k++; const id = `pasted ${k}`;
  return (b) => {
    const h = b.nodes[plan.host.node], e = b.edges[plan.host.edge]!, t = b.nodes[e.to], x = ((h?.x ?? 0) + (t?.x ?? h?.x ?? 0)) / 2, y = ((h?.y ?? 0) + (t?.y ?? h?.y ?? 0)) / 2 + 120;
    placeBlock(b, plan.recipe.block, x, y, plan.set, id);
    b.nodes[id]!.label = `Pasted in the 3D view: ${plan.recipe.name} on the ${plan.drop.piece} at (${[plan.set.x, plan.set.y, plan.set.z].map(mmOf).join(', ')}) mm`;
    for (const w of plan.recipe.wires) wire(b, w.from, w.out, id, w.in);
    wire(b, plan.host.node, plan.host.out, id, 'part');
    b.edges[plan.host.edge] = { ...b.edges[plan.host.edge]!, from: id, out: 'pasted' };
    return id;
  };
}
type Record0 = NonNullable<Part['imprints']>[number];
/** The imprint record under a point of a leaf (in the leaf's frame): the one whose hole's axis the point lies nearest,
 *  within its widest cut's radius of that axis and no deeper than its deepest cut (a millimetre's grace either way: a
 *  choice). What a right-click on a hole's wall, its counterbore's floor or its mouth finds. */
export function recordAt(leaf: Part, at: V3): Record0 | null {
  let best: Record0 | null = null, bd = Infinity; const p = new THREE.Vector3(...at);
  for (const r of leaf.imprints ?? []) { if (r.lost) continue; const cuts = (r.made?.cuts ?? []) as Cut[], reach = Math.max(0, ...cuts.map((c) => Math.max(c.r, ...(c.prof ?? []).map((q) => q[0])))), deep = Math.max(0, ...cuts.map((c) => c.depth));
    const o = new THREE.Vector3(...r.at), n = new THREE.Vector3(...r.n).normalize(), rel = p.clone().sub(o), along = rel.dot(n), radial = rel.addScaledVector(n, -along).length();
    if (radial <= reach + 1e-6 && along <= 1e-3 && along >= -deep - 1e-3 && radial < bd) { best = r; bd = radial; } }
  return best;
}
const holdsRecord = (v: unknown, rec: object) => { if (!isPart(v) && !isAssembly(v)) return false; let found = false; flatten(v, (f) => { if (f.leaf.imprints?.includes(rec as Record0)) { found = true; return false; } return true; }); return found; };
/** The node that made an imprint record: one with an output that holds it, none of whose wired-in values does. */
export function makerOf(board: Board, outputsOf: Outputs, rec: object): string | null {
  const edges = live(board);
  for (const [id, n] of Object.entries(board.nodes)) { if (n.deleted) continue; const o = outputsOf(id); if (!o || !Object.values(o).some((v) => holdsRecord(v, rec))) continue;
    if (edges.some(([, e]) => e.to === id && holdsRecord(outputsOf(e.from)?.[e.out!], rec))) continue; return id; }
  return null;
}
/** What pastes the same again: the maker's block, its settings but where, and its wires but the part it was put on.
 *  Refused unless the maker's block says what it imprinted (only those can be previewed and copied). */
export function copyRecipe(board: Board, outputsOf: Outputs, maker: string): PasteRecipe | { refused: string } {
  const n = board.nodes[maker], d = n?.block ? block(n.block) : undefined; if (!n || !d) return { refused: `no node ${maker}` };
  if (!portsOf(d, { ...defaultsOf(d), ...(n.set ?? {}) }).outputs.some((q) => q.name === 'imprinted')) return { refused: `${d.name} does not say what it imprinted, so it cannot be copied here` };
  const set = Object.fromEntries(Object.entries(n.set ?? {}).filter(([k]) => !['x', 'y', 'z', 'toward'].includes(k)));
  const wires = live(board).filter(([, e]) => e.to === maker && e.in !== 'part').map(([, e]) => ({ in: e.in!, from: e.from, out: e.out! }));
  const it = wires.find((w) => w.in === 'it'), v = it ? outputsOf(it.from)?.[it.out] : undefined;
  return { block: n.block!, set, wires, name: isPart(v) ? v.name : d.name, copiedFrom: maker };
}
/** The card's words for a preview: the paste node's own checks, each with what the rule asks and what was found, in the
 *  words mate.ts's refusal uses (the rule's own wording; nothing written here is a ≥ or a ≤), and what each colour is. */
export interface Verdict { fits: boolean; head: string; cut: string[]; lines: { mark: '✓' | '✕' | '–'; text: string }[]; legend: { role: 'remove' | 'keep' | 'contact' | 'frame' | 'ghost'; colour: string; text: string }[]; note: string }
export const ROLE_COLOUR = { remove: '#ff5252', keep: '#ffb300', contact: '#4caf50', frame: '#ffffff', ghost: '#ffffff', u: '#40c4ff' } as const;
interface Imprinted0 { frame: { at: V3; n: V3; u: V3 } | null; piece: string; path: number[]; m: number[]; cuts: Cut[]; keep: Keep[]; contact: Ring[]; tools: { role: string; why: string }[]; planned: string[]; why: string[]; mirror: string; refused: { rule: string; need: number; have: number; unit: string; source: string; why: string } | null }
interface Row0 { check: string; ok: boolean; need: number; have: number; unit: string; rule: string; source?: string; applies?: boolean }
const n2 = (x: number) => +x.toFixed(2) + 0;
export function verdictLines(out: Record<string, unknown> | Error, plan: PastePlan): Verdict {
  const legend: Verdict['legend'] = [{ role: 'remove', colour: ROLE_COLOUR.remove, text: 'red: the material it cuts away' }, { role: 'keep', colour: ROLE_COLOUR.keep, text: "amber: the room it keeps clear (the key's reach)" }, { role: 'contact', colour: ROLE_COLOUR.contact, text: 'green: where its head bears' }, { role: 'frame', colour: ROLE_COLOUR.frame, text: "white arrow: square to the face; blue tick: the face's u" }, { role: 'ghost', colour: ROLE_COLOUR.ghost, text: 'see-through: the screw as it will sit' }];
  const where = `${plan.recipe.name} on the ${plan.drop.piece} at (${[plan.set.x, plan.set.y, plan.set.z].map(mmOf).join(', ')}) mm`;
  if (out instanceof Error) return { fits: false, head: `Does not fit: ${out.message} — nothing will be cut`, cut: [], lines: [], legend, note: '' };
  const im = out.imprinted as Imprinted0 | undefined, rows = (out.checks ?? []) as Row0[];
  if (!im) return { fits: false, head: `Does not fit: the ${plan.recipe.block} node says nothing of what it imprinted — nothing will be cut`, cut: [], lines: [], legend, note: '' };
  const lines: Verdict['lines'] = rows.map((r) => (r.applies === false ? { mark: '–' as const, text: `${r.check}: not asked here` } : { mark: r.ok ? '✓' as const : '✕' as const, text: `${r.check} ${r.have} mm, ${r.rule} asks ${r.need} mm${r.source ? ` (${r.source})` : ''}` }));
  const seen = new Set(rows.map((r) => r.check));
  for (const c of im.planned) if (!seen.has(c)) lines.push({ mark: '–', text: im.refused ? `${c}: not measured (the first refusal stops the checks)` : `${c}: nothing on the piece to measure it from` });
  // (the guard: the node stands where it was dropped, within 0.1 mm, or the card says so and it does not fit)
  const off = im.frame ? new THREE.Vector3(...im.frame.at).distanceTo(new THREE.Vector3(...plan.drop.at)) : 0, astray = off > 1e-4;
  const note = astray ? `the node stood ${n2(off * 1000)} mm from the point dropped on: not cut from here` : String(out.violation ?? '') && !im.refused ? String(out.violation) : '';
  if (im.refused) { const d = im.refused.have - im.refused.need, by = d < 0 ? `short by ${n2(-d)}` : `over by ${n2(d)}`;
    return { fits: false, head: `Does not fit: ${im.refused.rule}, ${by} ${im.refused.unit || 'mm'} — nothing will be cut`, cut: rows.length ? im.why.map((w) => `would cut: ${w}`) : [im.refused.why], lines, legend, note }; }
  return { fits: !astray, head: `Fits: ${where}`, cut: im.why, lines, legend, note };
}

/** What the session needs of the board (view/nodes.ts's wall gives it). */
export interface PasteWall { board(): Board; outputsOf: Outputs; change(fn: (b: Board) => string, says?: string): string | void; settled(): boolean }
/** A paste under way in the 3D view: idle, a chip armed (tapped, waiting for a tap on a part), held over the view, or
 *  pinned (released on a part, its card with Cut it and Cancel). What it draws is the paste node's own run, placed at the
 *  host's frame F, in a group kept out of picks and out of the view's bounds. */
export class PasteSession implements PasteHooks {
  card: PasteCard | null = null;
  private st: 'idle' | 'armed' | 'held' | 'pinned' = 'idle';
  private recipe: PasteRecipe | null = null; private copied: PasteRecipe | null = null; private plan: PastePlan | null = null;
  private result: { plan: PastePlan; out: Record<string, unknown> | Error; verdict: Verdict } | null = null;
  private inflight: PastePlan | null = null; private queued: PastePlan | null = null; private screen: [number, number] = [0, 0];
  private readonly preview = new THREE.Group(); private counts = { remove: 0, keep: 0, contact: 0, ghost: 0 };
  private accepted: { id: string; checks: string } | null = null; private menuHit: { hit: Hit; point: THREE.Vector3; ray: THREE.Ray } | null = null;
  constructor(private readonly dock: Dock3D, private readonly wall: PasteWall) { this.preview.matrixAutoUpdate = false; this.preview.renderOrder = 20; dock.overlays.add(this.preview); }
  state(): 'idle' | 'armed' | 'held' | 'pinned' { return this.st; }
  active(): boolean { return this.st !== 'idle'; }
  pinned(): boolean { return this.st === 'pinned'; }
  fits(): boolean { return !!this.result && this.result.plan === this.plan && this.result.verdict.fits; }
  drawn(): { remove: number; keep: number; contact: number; ghost: number } { return { ...this.counts }; }
  /** How long the last preview took: the paste node's run, and drawing what it gave (ms). */
  timing = { run: 0, draw: 0 };
  last(): { plan: PastePlan; out: Record<string, unknown> } | null { const r = this.result; return r && !(r.out instanceof Error) ? { plan: r.plan, out: r.out } : null; }
  /** What the strip offers: the bolts the board makes, and the interface copied. */
  sources(): (PasteRecipe & { key: string })[] { const b = this.wall.board(), list = boltSources(b, this.wall.outputsOf).map((r, i) => ({ ...r, key: `bolt:${i}:${r.wires[0]?.from}.${r.wires[0]?.out}` }));
    return this.copied ? [...list, { ...this.copied, key: 'copied' }] : list; }
  /** The strip drawn again (after a run: what the board makes may have changed). */
  chips(): void { this.card?.chips(this.sources().map((r) => ({ key: r.key, name: r.key === 'copied' ? `Copied: ${r.name} (as '${r.copiedFrom}' made it)` : r.name, says: r.key === 'copied' ? `paste the interface copied from '${r.copiedFrom}'` : `drag it onto a surface of what is shown (or tap it, then tap the part)` }))); }
  begin(key: string, x: number, y: number): void { const r = this.sources().find((s) => s.key === key); if (!r) return; this.clear(); this.recipe = r; this.st = 'held'; this.screen = [x, y]; }
  move(x: number, y: number): void {
    if (this.st !== 'held' || !this.recipe) return; this.screen = [x, y];
    const at = this.dock.rayAt(x, y), hit = this.dock.hit(x, y); if (!hit) { this.clearDrawn(); this.plan = null; this.card?.note('Over nothing of what is shown: hold it over a part'); return; }
    const host = hostOf(this.wall.board(), this.wall.outputsOf, hit, this.dock.viewMatrix()); if ('refused' in host) { this.clearDrawn(); this.plan = null; this.card?.note(`Not here: ${host.refused}`, true); return; }
    const drop = dropOn(host, at.origin, at.direction); if (!drop) { this.clearDrawn(); this.plan = null; this.card?.note('The ray meets nothing of that part here', true); return; }
    this.request(planOf(this.recipe, host, drop));
  }
  release(x: number, y: number, moved: boolean): void {
    if (this.st !== 'held') return;
    // (a tap, not a drag: armed, the next tap on a part places it)
    if (!moved) { this.st = 'armed'; this.clearDrawn(); this.card?.note(`Now tap the part to paste ${this.recipe?.name ?? 'it'} on (Esc to cancel)`); return; }
    if (!this.plan || !this.dock.hit(x, y)) { this.cancel(); return; }
    this.st = 'pinned'; this.screen = [x, y]; this.showCard();
  }
  /** A tap on the view while a chip is armed: placed there, pinned. */
  placeAt(x: number, y: number): void { if (this.st !== 'armed') return; this.card?.disarm(); this.st = 'held'; this.move(x, y); if (this.plan) { this.st = 'pinned'; this.showCard(); } else { this.st = 'armed'; } }
  accept(): void {
    if (this.st !== 'pinned' || !this.plan || !this.fits()) return;
    const plan = this.plan, r = this.result!, checks = JSON.stringify((r.out as Record<string, unknown>).checks ?? []);
    const others = plan.host.others.filter((o) => o !== plan.host.edge), says = `pasted: ${plan.recipe.name} on the ${plan.drop.piece}${others.length ? `; ${others.join(', ')} still read the ${plan.host.value.name} uncut` : ''}`;
    const id = this.wall.change(pasteEdit(plan, this.wall.board()), says); this.clear(); this.card?.hide(); this.card?.disarm();
    if (id) this.accepted = { id, checks };
  }
  cancel(): void { this.clear(); this.card?.hide(); this.card?.disarm(); }
  /** After a run: a paste whose host changed is let go; an accepted paste's checks compared with what its card said. */
  refresh(): void {
    if (this.plan && this.wall.outputsOf(this.plan.host.node)?.[this.plan.host.out] !== this.plan.host.value) this.cancel();
    if (this.accepted && this.wall.settled()) { const o = this.wall.outputsOf(this.accepted.id); if (o) { const same = JSON.stringify(o.checks ?? []) === this.accepted.checks;
      if (!same) this.card?.note(`The board's cut (${this.accepted.id}) did not check as its preview did: read its checks on the board`, true); this.accepted = null; } }
    this.chips();
  }
  /** A face's menu at a point: copy the interface under it (when its maker is found), paste the one copied. */
  menuAt(x: number, y: number): void {
    const hit = this.dock.hit(x, y), ray = this.dock.rayAt(x, y); if (!this.card) return; if (!hit) { this.card.note(this.dock.pointAt(x, y) ? 'Drawn as its box from here: come closer to copy or paste on it' : 'Nothing of what is shown is under the pointer'); return; }
    const point = this.dock.pointAt(x, y) ?? ray.origin.clone(), b = this.wall.board();
    let rec = recordAt(hit.leaf, point.clone().applyMatrix4(hit.m.clone().invert()).toArray() as V3);
    // (the point on a bolt that sits in a hole: the hole's record, on another piece of the same part)
    if (!rec) { const host = hostOf(b, this.wall.outputsOf, hit, this.dock.viewMatrix()); if (!('refused' in host)) for (const l of leavesOf(host.value)) { if (!l.part.imprints?.length) continue; rec = recordAt(l.part, point.clone().applyMatrix4(host.F.clone().multiply(l.m).invert()).toArray() as V3); if (rec) break; } }
    const maker = rec ? makerOf(b, this.wall.outputsOf, rec) : null, recipe = maker ? copyRecipe(b, this.wall.outputsOf, maker) : null;
    this.menuHit = { hit, point, ray: ray.clone() };
    this.card.menu([x, y], [
      { id: 'copy', label: rec ? `Copy its interface: ${rec.of}${maker ? ` (made by '${b.nodes[maker]?.label ?? maker}')` : ''}` : 'Copy its interface', enabled: !!recipe && !('refused' in recipe), ...(!rec ? { why: 'no interface cut here' } : !maker ? { why: 'the node that made it is not found' } : recipe && 'refused' in recipe ? { why: recipe.refused } : {}) },
      { id: 'paste', label: this.copied ? `Paste the copied interface here: ${this.copied.name}` : 'Paste the copied interface here', enabled: !!this.copied, ...(!this.copied ? { why: 'nothing copied yet' } : {}) }]);
    this.pendingRecipe = recipe && !('refused' in recipe) ? recipe : null;
  }
  private pendingRecipe: PasteRecipe | null = null;
  menu(item: 'copy' | 'paste'): void {
    if (item === 'copy') { if (this.pendingRecipe) { this.copied = this.pendingRecipe; this.chips(); this.card?.note(`Copied: ${this.copied.name}, as '${this.copied.copiedFrom}' pastes it. Drag the Copied chip, or right-click a face to paste it there`); } return; }
    const m = this.menuHit; if (!this.copied || !m) return;
    const host = hostOf(this.wall.board(), this.wall.outputsOf, m.hit, this.dock.viewMatrix()); if ('refused' in host) { this.card?.note(`Not here: ${host.refused}`, true); return; }
    const drop = dropOn(host, m.ray.origin, m.ray.direction); if (!drop) return;
    this.clear(); this.recipe = this.copied; this.st = 'pinned'; this.screen = this.dock.screenOf(m.point); this.request(planOf(this.copied, host, drop));
  }

  // (one preview run in flight at a time; the latest point wins, and only its run is drawn)
  private request(plan: PastePlan): void {
    this.plan = plan; if (this.inflight) { this.queued = plan; this.card?.busy(true); return; }
    this.inflight = plan; this.card?.busy(true); const t0 = performance.now();
    const done = (out: Record<string, unknown> | Error) => { this.inflight = null; const q = this.queued; this.queued = null; const t1 = performance.now();
      if (plan === this.plan && this.st !== 'idle') { this.result = { plan, out, verdict: verdictLines(out, plan) }; this.draw(plan, out); this.showCard(); }
      this.timing = { run: t1 - t0, draw: performance.now() - t1 };
      if (q && q === this.plan && this.st !== 'idle') this.request(q); };
    runBlock(plan.recipe.block, previewInputs(plan, this.wall.outputsOf)).then(done, (e: unknown) => done(e instanceof Error ? e : new Error(String(e))));
  }
  private showCard(): void { const r = this.result; if (!this.card) return; if (!r || r.plan !== this.plan) { this.card.busy(true); return; } this.card.show(r.verdict, { pinned: this.st === 'pinned', at: this.screen }); this.card.busy(!!this.inflight); }
  private clear(): void { this.st = 'idle'; this.recipe = null; this.plan = null; this.result = null; this.queued = null; this.clearDrawn(); }
  private clearDrawn(): void { for (const c of [...this.preview.children]) { this.preview.remove(c); c.traverse((o) => { const m = o as THREE.Mesh; if (!o.userData.shared) m.geometry?.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; for (const x of Array.isArray(mt) ? mt : mt ? [mt] : []) x.dispose(); }); } this.counts = { remove: 0, keep: 0, contact: 0, ghost: 0 }; this.dock.redraw(); }
  /** What the run gives, drawn: the cut solids in red over all (seen through the part), the keep zones as amber cages,
   *  the contacts as green rings, the frame's normal as a white arrow and its u as a blue tick, the bolt seated as a ghost. */
  private draw(plan: PastePlan, out: Record<string, unknown> | Error): void {
    this.clearDrawn(); if (out instanceof Error) return; const im = out.imprinted as Imprinted0 | undefined; if (!im?.frame) return;
    this.preview.matrix.copy(plan.host.F); this.preview.matrixWorldNeedsUpdate = true;
    const M = new THREE.Matrix4().fromArray(im.m.length === 16 ? im.m : new THREE.Matrix4().toArray()), col = (c: string) => new THREE.Color(c);
    const solid = (g: THREE.BufferGeometry, c: string, fill: number, top: boolean) => { const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col(c), transparent: true, opacity: fill, depthTest: !top, depthWrite: false, side: THREE.DoubleSide }));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: col(c), transparent: true, opacity: 0.9, depthTest: !top })); mesh.renderOrder = edges.renderOrder = 30; this.preview.add(mesh, edges); };
    // (a preview's cut drawn finely round, 96 facets: it is framed close, and it is one solid, not a city's thousands)
    for (const c of im.cuts) { const g = cutSolid(c, false, true, 96); g.applyMatrix4(M); solid(g, ROLE_COLOUR.remove, 0.45, true); this.counts.remove++; }
    for (const k of im.keep) { if (!k.size) continue; const g = new THREE.BoxGeometry(...k.size); g.translate(...k.at); g.applyMatrix4(M); solid(g, ROLE_COLOUR.keep, 0.18, false); this.counts.keep++; }
    for (const r of im.contact) { const g = new THREE.RingGeometry(Math.max(1e-6, r.r0), r.r, 64); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...r.n))); g.translate(...r.at); g.applyMatrix4(M);
      const ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col(ROLE_COLOUR.contact), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false, depthWrite: false })); ring.renderOrder = 31; this.preview.add(ring); this.counts.contact++; }
    const reach = Math.max(0.01, ...im.cuts.map((c) => Math.max(c.r, ...(c.prof ?? []).map((p) => p[0])))) * 3, at = new THREE.Vector3(...im.frame.at), n = new THREE.Vector3(...im.frame.n), u = new THREE.Vector3(...im.frame.u);
    const arrow = new THREE.ArrowHelper(n, at, reach, 0xffffff, reach * 0.25, reach * 0.12); arrow.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) { m.depthTest = false; m.transparent = true; } o.renderOrder = 32; }); this.preview.add(arrow);
    const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([at, at.clone().addScaledVector(u, reach * 0.6)]), new THREE.LineBasicMaterial({ color: col(ROLE_COLOUR.u), depthTest: false })); tick.renderOrder = 32; this.preview.add(tick);
    // (the ghost: the bolt as the node seats it, the part's second piece in its pasted output, seen through the part it goes
    // into, as the legend says: it sat inside the uncut plate, drawn behind it, so it was never seen (the I16 evaluator))
    const pasted = out.pasted as Part | undefined, bolt = pasted?.parts?.[1];
    if (bolt && !im.refused) for (const l of leavesOf({ name: 'ghost', parts: [bolt] })) { const g0 = leafGeometry(l.part, true); if (!g0) continue; const mat = new THREE.MeshBasicMaterial({ color: col(ROLE_COLOUR.ghost), transparent: true, opacity: 0.35, depthTest: false, depthWrite: false }); const m = new THREE.Mesh(g0, mat); m.userData.shared = true; m.matrixAutoUpdate = false; m.matrix.copy(l.m); m.renderOrder = 29; this.preview.add(m); this.counts.ghost++; }  // (its geometry the view's own, kept: never disposed with the preview)
    this.dock.redraw();
  }
}

/** The view's backdrop and its grid's lines: drawing choices (fault D16), the grid's just lighter than the backdrop. */
const BACKDROP = 0x222935, GRID_MINOR = 0x3f4b5e, GRID_MAJOR = 0x5d6e88;
export class Dock3D {
  readonly view = new SpaceView();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2e5);
  private readonly controls: OrbitControls;
  private readonly grid = new THREE.Group();
  private gridCell = 0; private framed = '';
  private readonly ray = new THREE.Raycaster();
  private readonly sun = new THREE.DirectionalLight(0xffffff, 1.4);
  private readonly catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.24, depthWrite: false }));
  /** What is drawn over what is shown and is not of it (a paste's preview): out of picks and out of the view's bounds. */
  readonly overlays = new THREE.Group();
  /** A light from where the view stands, so the faces turned to it are never lost in the dark (fault D16). */
  private readonly fill = new THREE.DirectionalLight(0xffffff, 1.0);
  /** The paste under way, if the page made one (view/dashboard.ts). */
  paste: PasteSession | null = null;

  constructor(private readonly host: HTMLElement, private readonly picked: (key: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // (Khronos PBR Neutral, at an exposure of 1: a face turned to the view shows its own colour, a brick of 0x9c4a32 drawn
    // 0x9b472d, where ACES at 1.3 drew it 0xc56d54 and washed copper, gold and grey mortar toward white (the critic,
    // 2026-11-05; measured on the brick wall's picture). Only highlights are rolled off)
    this.renderer.toneMapping = THREE.NeutralToneMapping; this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.localClippingEnabled = true;
    // (the canvas first in its element, so the labels laid over it are painted above it (fault D16: the count was under it))
    host.prepend(this.renderer.domElement); this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    // (fault D16: what is shown read too dark on the near-black it stood on. A backdrop of its own, lit from the view as well
    // as by the studio and the sun: drawing choices, tuned until a part stands out from it by at least WCAG's 3:1)
    this.scene.background = new THREE.Color(BACKDROP);
    this.scene.environment = new THREE.PMREMGenerator(this.renderer).fromScene(studioScene(), 0.02).texture; this.scene.environmentIntensity = 2.4;
    this.scene.add(this.fill, this.fill.target);
    this.scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x101820, 0.4));
    // the sun: high and to one side, casting shadows onto what is under it and onto the ground (a plane that shows only
    // the shadows on it), both sized each frame by how far off the view is, so a bolt and a truck are each lit alike
    const sun = this.sun; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; this.scene.add(sun, sun.target);
    this.catcher.rotation.x = -Math.PI / 2; this.catcher.receiveShadow = true; this.catcher.renderOrder = -1; this.scene.add(this.catcher);
    // depth at any scale: haze that thickens with distance, set from how big what is shown is (a car and a city each fade
    // at their own far edge), toward the colour of the sky behind
    this.scene.fog = new THREE.FogExp2(BACKDROP, 0.01);
    this.scene.add(this.view.group, this.grid, this.overlays);
    this.camera.position.set(6, 5, 8);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.zoomSpeed = 1.4;
    // (the wheel zooms toward what is under the pointer, so a valve's keeper is reached by pointing at it and turning)
    this.controls.zoomToCursor = true;
    // (a double press on any piece flies the view to it, framed close: a bolt in a truck, a gate in a chip)
    this.renderer.domElement.addEventListener('dblclick', (e) => { const h = this.hitAt(e.clientX, e.clientY); if (h) { this.frameBox(h.box); this.lastPiece = h.name; } });
    // a press that did not turn the view chooses what it lands on
    // (a press on a button put on a thing works the button and nothing else: taken before the orbit sees it)
    let held = '';
    host.addEventListener('pointerdown', (e) => { const h = this.piecePress && this.hitAt(e.clientX, e.clientY); if (h && this.piecePress!(h.name, true)) { held = h.name; e.stopPropagation(); } }, true);
    window.addEventListener('pointerup', () => { if (held) { this.piecePress?.(held, false); held = ''; } });
    let down: [number, number] | null = null, long = 0;
    this.renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; clearTimeout(long);
      // (a press held still for half a second (a choice) opens the face's menu, as a right-click does: on a phone)
      if (e.pointerType === 'touch') long = window.setTimeout(() => { if (down) { this.paste?.menuAt(down[0], down[1]); down = null; } }, 500); });
    this.renderer.domElement.addEventListener('pointermove', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) >= 4) clearTimeout(long); });
    this.renderer.domElement.addEventListener('pointerup', (e) => { clearTimeout(long); const still = down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4; down = null; if (!still) return;
      // (a chip armed: this tap places it, and chooses nothing)
      if (this.paste?.state() === 'armed') { this.paste.placeAt(e.clientX, e.clientY); return; }
      this.pick(e); });
    this.renderer.domElement.addEventListener('pointercancel', () => { clearTimeout(long); down = null; });
    this.renderer.domElement.addEventListener('contextmenu', (e) => { if (!this.paste) return; e.preventDefault(); this.paste.menuAt(e.clientX, e.clientY); });
    new ResizeObserver(() => this.resize()).observe(host); this.resize();
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  /** What to draw: the board's shown things. The first time anything is shown (or a new board), it is framed. */
  show(things: Shown[], board: string): void { this.view.show(things); this.redraw(); if (board !== this.framed && things.length) { this.framed = board; requestAnimationFrame(() => this.fit()); } }
  /** A cutaway: what is shown cut by a plane square to an axis, through its middle (or `at` along that axis), the half
   *  toward the viewer taken away, so its insides show (its castings' cores, its crank in its bearings); null puts it whole
   *  again. Says the axis it cuts across, if any. */
  section(axis: 'x' | 'y' | 'z' | null, at?: number): 'x' | 'y' | 'z' | null {
    this.cut = null; if (axis) { const b = new THREE.Box3().setFromObject(this.view.group), c = b.isEmpty() ? new THREE.Vector3() : b.getCenter(new THREE.Vector3()), k = { x: 0, y: 1, z: 2 }[axis];
      const n = new THREE.Vector3().setComponent(k, -1), p = c.clone(); if (at !== undefined) p.setComponent(k, at);
      // (the half nearer the camera is the half taken away)
      if (this.camera.position.getComponent(k) < p.getComponent(k)) n.negate();
      this.cut = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p); }
    this.cutAxis = axis; this.clipAll(); this.redraw(); return axis;
  }
  /** Turns the cutaway on round its axes: none, across x, across z, across y, none. */
  nextSection(): 'x' | 'y' | 'z' | null { const order: ('x' | 'y' | 'z' | null)[] = [null, 'x', 'z', 'y']; return this.section(order[(order.indexOf(this.cutAxis) + 1) % order.length]!); }
  private cut: THREE.Plane | null = null; private cutAxis: 'x' | 'y' | 'z' | null = null;
  // (every material of what is shown clipped by it, its inside faces drawn too so a cut solid shows its wall; set again as
  // the view makes meshes anew)
  private clipAll(): void { const planes = this.cut ? [this.cut] : null; this.view.group.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; if (!m) return; for (const x of Array.isArray(m) ? m : [m]) if (x.clippingPlanes !== planes) { x.clippingPlanes = planes; x.clipShadows = true; if (planes) { x.userData.side ??= x.side; x.side = THREE.DoubleSide; } else if (x.userData.side !== undefined) x.side = x.userData.side; x.needsUpdate = true; } }); }
  /** The view turned to see everything shown, whole. */
  fit(): void {
    const b = this.view.bounds(); if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.05, b.getSize(new THREE.Vector3()).length() / 2);
    // (the sphere round the box, in the narrower of the view's two angles (a phone stands taller than wide); then nearer,
    // while every corner of the box stays within 85% of the view's half: the sphere is loose round a long or flat thing)
    const half = Math.min(THREE.MathUtils.degToRad(this.camera.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect));
    let d = r / Math.sin(half) * 1.05; const dir = this.leastHidden(c, d); const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    this.camera.near = Math.max(1e-12, d / 1e4); this.camera.far = d * 100; this.camera.updateProjectionMatrix();
    for (let k = 0; k < 6; k++) { this.camera.position.copy(c).addScaledVector(dir, d); this.camera.lookAt(c); this.camera.updateMatrixWorld();
      const m = Math.max(...corners.map((p) => { const q = p.clone().project(this.camera); return Math.max(Math.abs(q.x), Math.abs(q.y)); }));
      if (!(m > 0 && Number.isFinite(m))) break; d = Math.max(r * 1.1, d * Math.min(1.3, Math.max(0.5, m / 0.85))); }
    this.controls.target.copy(c); this.camera.position.copy(c).addScaledVector(dir, d); this.camera.near = Math.max(1e-12, d / 1e4); this.camera.far = d * 100; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  /** Which of the four corners above it to look from (front right first): the one from which the fewest pieces are hidden
   *  behind nearer ones (each piece's box as the screen sees it, covered by the boxes of those nearer), so a ball beside a
   *  tower is framed from its side, not from behind the tower (the critic, 2026-11-05). Front right unless another hides
   *  at least one piece fewer; front right for a scene of more pieces than `pieceBoxes` weighs. */
  private leastHidden(c: THREE.Vector3, d: number): THREE.Vector3 {
    const dirs = [[0.75, 1], [-0.75, 1], [0.75, -1], [-0.75, -1]].map(([x, z]) => new THREE.Vector3(x, 0.62, z).normalize()), boxes = this.view.pieceBoxes();
    if (boxes.length < 2) return dirs[0]!;
    const cam = this.camera.clone(), q = new THREE.Vector3();
    const score = (dir: THREE.Vector3): number => {
      cam.position.copy(c).addScaledVector(dir, d); cam.lookAt(c); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const seen = boxes.map((b) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (let i = 0; i < 8; i++) { q.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        return { x0, x1, y0, y1, a: Math.max(1e-12, (x1 - x0) * (y1 - y0)), z: b.getCenter(new THREE.Vector3()).distanceTo(cam.position) }; }).sort((u, v) => u.z - v.z);
      let hidden = 0, covered = 0;
      seen.forEach((s, i) => { let k = 0; for (let j = 0; j < i && k < 1; j++) { const o = seen[j]!, w = Math.min(s.x1, o.x1) - Math.max(s.x0, o.x0), h = Math.min(s.y1, o.y1) - Math.max(s.y0, o.y0); if (w > 0 && h > 0) k += (w * h) / s.a; }
        k = Math.min(1, k); covered += k; if (k > 0.9) hidden++; });
      return hidden + 0.1 * covered;
    };
    const s = dirs.map(score); let best = 0; for (let k = 1; k < 4; k++) if (s[k]! < s[best]! - 0.5) best = k;
    return dirs[best]!;
  }
  get canvas(): HTMLCanvasElement { return this.renderer.domElement; }
  /** The view put somewhere and turned to look at a point (a test's, or a bookmark's). */
  look(from: [number, number, number], at: [number, number, number]): void { this.controls.target.set(...at); this.camera.position.set(...from); this.controls.update(); }
  /** The view flown to frame the pieces named like `re` (every one that matches, together), as close as shows them
   *  whole: how a test, a bookmark or the command bar zooms into a part. Says how many it framed. */
  focus(re: RegExp): number { const { box, n } = this.view.piecesNamed(re); if (n) this.frameBox(box); return n; }
  /** The name of the piece last flown to (a double press on it). */
  lastPiece = '';
  /** The view turned and moved to see a box whole, from the side it is looked at now. */
  frameBox(b: THREE.Box3): void {
    if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(1e-6, b.getSize(new THREE.Vector3()).length() / 2), d = (r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.15;
    const dir = this.camera.position.clone().sub(this.controls.target); if (dir.lengthSq() < 1e-20) dir.set(0.75, 0.62, 1); dir.normalize();
    this.controls.target.copy(c); this.camera.position.copy(c).addScaledVector(dir, d); this.camera.near = Math.max(1e-12, d / 1e4); this.camera.far = d * 1e4; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  private hitAt(x: number, y: number): ReturnType<SpaceView['pieceAt']> {
    this.ray.ray.copy(this.rayAt(x, y)); return this.view.pieceAt(this.ray);
  }
  /** The ray from the camera through a point of the page (css px). */
  rayAt(x: number, y: number): THREE.Ray {
    const r = this.renderer.domElement.getBoundingClientRect(), ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera); return rc.ray.clone();
  }
  /** The drawn piece under a point of the page, as a paste reads it: the node that shows it, its leaf and its matrix (a
   *  piece drawn as its box, without its leaf, is none). */
  hit(x: number, y: number): Hit | null { const h = this.hitAt(x, y); return h && h.leaf ? { key: h.key, leaf: h.leaf, m: h.m, name: h.name } : null; }
  /** Where the ray through a point of the page meets what is drawn. */
  pointAt(x: number, y: number): THREE.Vector3 | null { return this.hitAt(x, y)?.point ?? null; }
  /** The name of the piece under a point of the page ('' over nothing): what a test classes pixels by. */
  pieceUnder(x: number, y: number): string { const h = this.hitAt(x, y); return h ? h.name || '(unnamed)' : ''; }
  /** A point of the world on the page (css px). */
  screenOf(p: THREE.Vector3): [number, number] { const r = this.renderer.domElement.getBoundingClientRect(), v = p.clone().project(this.camera); return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height]; }
  /** The matrix of what is shown, in the world (the frame a paste's host is walked from). */
  viewMatrix(): THREE.Matrix4 { this.view.group.updateMatrixWorld(); return this.view.group.matrixWorld.clone(); }
  /** Whether a box (in the world) is in sight of the camera, in part or whole. */
  inView(b: THREE.Box3): boolean { this.camera.updateMatrixWorld(); return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)).intersectsBox(b.clone().applyMatrix4(this.viewMatrix())); }
  /** Where the ground's grid is laid, its cell, and whether it is drawn. */
  gridAt(): { y: number; cell: number; visible: boolean } { return { y: this.grid.position.y, cell: this.gridCell, visible: this.grid.visible }; }
  /** How long the last frames took to draw, ms (a moving mean). */
  frameMs = 0;
  /** Walking in it (view/pad.ts moves the camera; the orbit leaves it be). */
  walking = false;
  /** A press on a piece, down or up: true when it was taken (a button put on a thing), and the view is not turned by it. */
  piecePress: ((name: string, down: boolean) => boolean) | null = null;
  /** What a walk moves and turns: the camera, the canvas a drag looks with, the orbit put aside. */
  get eyes(): { camera: THREE.PerspectiveCamera; canvas: HTMLCanvasElement; orbit: OrbitControls } { return { camera: this.camera, canvas: this.renderer.domElement, orbit: this.controls }; }

  /** The sun and its shadows fitted round what is looked at: its shadow's box as wide as the view, the ground under what
   *  is shown. Below a few centimetres off, no shadows: a GPU's 32-bit positions cannot place a shadow at those scales
   *  away from the world's middle, and the light there would not be a sun's anyway. */
  private light(dist: number): void {
    const t = this.controls.target, on = dist > 0.03, sh = this.sun.shadow.camera, r = dist * 1.3, b = this.view.bounds();
    this.sun.castShadow = on; this.catcher.visible = on && !b.isEmpty();
    if (!on) return;
    this.sun.position.set(t.x + dist * 0.9, t.y + dist * 2.2, t.z + dist * 0.6); this.sun.target.position.copy(t); this.sun.target.updateMatrixWorld();
    sh.left = -r; sh.right = r; sh.top = r; sh.bottom = -r; sh.near = dist * 0.05; sh.far = dist * 6; sh.updateProjectionMatrix(); this.sun.shadow.normalBias = dist * 0.002;
    if (!b.isEmpty()) { this.catcher.position.set(t.x, b.min.y + dist * 1e-4, t.z); this.catcher.scale.set(dist * 12, dist * 12, 1); }
  }
  /** The grid laid at the floor of what is shown, just over its shadows, under the point looked at (fault D16: it lay at
   *  y = 0, through whatever was shown below it, and was lost under what stood above it). */
  private layFloor(dist: number): void {
    const b = this.view.bounds(), t = this.controls.target, step = this.gridCell * 10 || 1;
    this.grid.position.set(Math.round(t.x / step) * step, b.isEmpty() ? 0 : b.min.y + dist * 2e-4, Math.round(t.z / step) * step);
  }
  private resize(): void { const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private pick(e: PointerEvent): void {
    const r = this.renderer.domElement.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera); const hit = this.view.pick(this.ray); if (hit) this.picked(hit.key);
  }
  /** The ground's grid: cells a decade at a time, by how far the view is from what it looks at. */
  private layGrid(): void {
    const dist = this.camera.position.distanceTo(this.controls.target), cell = 10 ** Math.floor(Math.log10(Math.max(1e-6, dist / 10)));  // (a decade finer than a quarter of the way off: a part a hand's width across stands on cells it can be measured by)
    if (cell === this.gridCell) return; this.gridCell = cell;
    for (const c of [...this.grid.children]) { this.grid.remove(c); ((c as THREE.LineSegments).geometry as THREE.BufferGeometry).dispose(); }
    // (just lighter than the backdrop: seen, never louder than what stands on it)
    const minor = new THREE.GridHelper(cell * 100, 100, GRID_MINOR, GRID_MINOR), major = new THREE.GridHelper(cell * 100, 10, GRID_MAJOR, GRID_MAJOR);
    for (const g of [minor, major]) { (g.material as THREE.Material).transparent = true; (g.material as THREE.Material).opacity = g === minor ? 0.55 : 0.8; (g.material as THREE.Material).depthWrite = false; this.grid.add(g); }
  }
  private frame(now: number): void {
    if (!this.host.offsetParent && this.host.clientWidth === 0) return;
    if (!this.walking) this.controls.update(); this.layGrid(); if (this.cut) this.clipAll();
    // the haze, and so the view's reach, follows how far off the view is: near, a street fades in a few hundred metres;
    // pulled back, a whole world can be seen (where it fades, nothing more is drawn: what makes no end affordable)
    const dist = this.camera.position.distanceTo(this.controls.target), fog = this.scene.fog as THREE.FogExp2;
    // and thick enough by where a world without end is cut off that its edge is never seen
    fog.density = Math.max(0.12 / Math.max(1e-6, dist), 2.6 / this.view.reach); this.view.range = 2 / fog.density; this.camera.far = Math.max(this.camera.far, this.view.range * 1.2); this.camera.near = Math.max(1e-12, dist / 5e4); this.camera.updateProjectionMatrix();
    this.light(dist); this.layFloor(dist);
    this.fill.position.copy(this.camera.position); this.fill.target.position.copy(this.controls.target); this.fill.target.updateMatrixWorld();
    this.view.update(this.camera, this.renderer.domElement.clientHeight || 300, now);
    // (drawn only when something changed: the camera, what is shown, the canvas's size, a preview or a cut (redraw), or a
    // walk; and every 3 s whatever happens, for anything that changed unseen. A view standing still costs nothing, where it
    // drew every frame before: a laptop's fan, and a test's software renderer at a second a frame)
    const c = this.camera, cv = this.renderer.domElement, sig = `${c.position.toArray().join(',')}|${c.quaternion.toArray().join(',')}|${c.near}|${c.far}|${cv.width}x${cv.height}`;
    // (how long the last drawing took shows in when the next frame comes: one over 50 ms makes the drawings while it moves
    // use fewer pixels, down to a third of them; quick ones win them back. A choice: a weak GPU, or a software one, stays
    // answering while a thing is turned or a paste dragged, and the view is drawn sharp again once it stands still)
    const gap = now - this.lastFrame; this.lastFrame = now;
    if (this.drewLast) { this.lastGap = gap; if (gap > 50) this.moving = Math.max(0.35, this.moving * 0.6); else if (gap < 20) this.moving = Math.min(1, this.moving * 1.25); }
    // (still: nothing drawn for 600 ms, or three of the last drawing's frames where those are slower: a slow drawing does not
    // make a drag look still between its moves)
    const calm = Math.max(600, 3 * this.lastGap);
    if (sig === this.lastSig && this.view.stats === this.lastStats && this.dirty <= 0 && !this.walking && now - this.lastDrawn < 3000) {
      // (still for a while: what was drawn coarse is drawn once more, sharp)
      if (this.scale < 1 && now - this.lastDrawn > calm) this.sharpness(1);
      this.drewLast = false; return;
    }
    const want = now - this.lastDrawn < calm ? this.moving : this.scale; if (want !== this.scale) this.sharpness(want);
    this.lastSig = `${c.position.toArray().join(',')}|${c.quaternion.toArray().join(',')}|${c.near}|${c.far}|${cv.width}x${cv.height}`; this.lastStats = this.view.stats; this.lastDrawn = now; this.drawn++; this.dirty--; this.drewLast = true;
    const t0 = performance.now(); this.renderer.render(this.scene, this.camera); this.frameMs = 0.9 * this.frameMs + 0.1 * (performance.now() - t0); this.view.drawMs = this.frameMs;
  }
  private lastSig = ''; private lastStats: object | null = null; private lastDrawn = 0; private dirty = 0; private lastFrame = 0; private drewLast = false; private scale = 1; private moving = 1; private lastGap = 0;
  private sharpness(k: number): void { this.scale = k; this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1) * k); this.resize(); }
  /** How many times the view has been drawn (a test waits on it, never on a fixed sleep). */
  drawn = 0;
  /** Whether the view stands drawn as it is, at full sharpness (nothing waiting to be drawn). */
  still(): boolean { return this.scale === 1 && this.dirty <= 0 && !this.drewLast; }
  /** Something changed that the camera's place does not say (a preview drawn, a cut opened): drawn again, twice. */
  redraw(frames = 2): void { this.dirty = Math.max(this.dirty, frames); }
}

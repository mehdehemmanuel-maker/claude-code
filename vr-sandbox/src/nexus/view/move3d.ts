// Move: what is shown, moving live in the 3D view (the user, 2026-11-06: "freeze things in the air like a rod then add a
// loose gear to it and a crank and crank it or just anything"). The block of the room behind what is shown is read for how
// it moves (sim.ts motionOf: its bodies from the faces the operations wrote, the lines they turn about, the gears that
// mesh); Jolt is stepped every frame with gravity on, frozen bodies held where they are, in the air too. A drag on a
// loose piece turns it about its joint (a torque toward where the pointer is round its line, so a crank is cranked by
// hand), or pulls a free one (or one that slides); a tap chooses a piece: Freeze, Loose, Motor (its joint driven at so many
// rpm), Hold (held where it is); a joint its motor holds (a servo) lets go while it is dragged and holds again where it is
// put, a pose (decision 0028, motion 2). Stop
// puts it back as it was built. Nothing here is drawn from the board's own drawing: each piece's leaves, moved with its
// body. (Rough, 2026-11-06: one block, the first shown; freezing or loosening starts it again from as built.)

import * as THREE from 'three';
import type { Dock3D } from './dock3d';
import { Block, partOfBlock } from '../room';
import { LiveMotion } from '../sim';
import type { Board } from '../boards';
import type { Jolt } from '../realize';
import { leafGeometry, leafMaterial } from './kit3d';
import { leavesOf } from '../assembly';

let joltKept: Promise<Jolt> | null = null;
const jolt = (): Promise<Jolt> => (joltKept ??= import('jolt-physics/wasm-compat').then((m) => m.default() as unknown as Promise<Jolt>));

/** The blocks of the room behind what a board shows: from each "Show in space" node back along its wires to the first
 *  node whose output is a block (with none shown, each block nothing else builds on). */
export function blocksShown(board: Board, outputsOf: (id: string) => Record<string, unknown> | undefined): Block[] {
  const edges = Object.values(board.edges ?? {}).filter((e) => !e.deleted), into = (id: string) => edges.filter((e) => e.to === id).map((e) => e.from);
  const blockOf = (id: string) => { const b = outputsOf(id)?.block; return b instanceof Block ? b : undefined; };
  const shows = Object.entries(board.nodes ?? {}).filter(([, n]) => !n.deleted && n.block === 'space.show').map(([id]) => id), out: Block[] = [];
  for (const s of shows) { const seen = new Set<string>(), q = into(s);
    while (q.length) { const id = q.shift()!; if (seen.has(id)) continue; seen.add(id); const b = blockOf(id); if (b) { out.push(b); continue; } q.push(...into(id)); } }
  if (out.length) return [...new Set(out)];
  const made = Object.keys(board.nodes ?? {}).filter((id) => blockOf(id));
  return made.filter((id) => !edges.some((e) => e.from === id && blockOf(e.to))).map((id) => blockOf(id)!);
}

const css = `#move3d{position:absolute;right:8px;top:calc(var(--over,0px) + 8px);z-index:5;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font:13px system-ui,sans-serif;color:#e8edf5;max-width:min(320px,70vw);pointer-events:none}
#move3d>*{pointer-events:auto}#move3d button{font:inherit;color:inherit;background:#2b3546;border:1px solid #4a5a73;border-radius:8px;padding:5px 10px;cursor:pointer}#move3d button.on{background:#c0582b;border-color:#e07a4a}
#move3d .card{background:rgba(24,30,40,.92);border:1px solid #3d4a5e;border-radius:10px;padding:8px 10px;line-height:1.35}#move3d .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}#move3d .dim{color:#9fb0c8}`;

/** The Move mode of a 3D view: its button, its card, and the live motion while it runs. */
export class MoveMode {
  /** Where the blocks shown come from (a page sets it; on the dashboard, its board's own). */
  source: () => Block[] = () => { const d = (globalThis as { dashboard?: { wall?: { board(): Board; outputsOf(id: string): Record<string, unknown> | undefined } } }).dashboard?.wall; return d ? blocksShown(d.board(), (id) => d.outputsOf(id)) : []; };
  live: LiveMotion | null = null;
  private block: Block | null = null; private frozen: boolean[] | undefined; private sel = -1; private spinning = new Map<number, number>(); private held = new Set<number>(); private rpm = 60;
  private readonly group = new THREE.Group(); private meshes: { mesh: THREE.Mesh; body: number; base: THREE.Matrix4 }[] = [];
  private readonly el: HTMLDivElement; private readonly btn: HTMLButtonElement; private readonly card: HTMLDivElement; private raf = 0; private last = 0;
  private drag: { body: number; made: THREE.Vector3; plane: THREE.Plane; to: THREE.Vector3; was: THREE.Vector3 | null } | null = null;
  constructor(private readonly dock: Dock3D) {
    const host = dock.canvas.parentElement ?? document.body;
    if (!document.getElementById('move3d-css')) { const st = document.createElement('style'); st.id = 'move3d-css'; st.textContent = css; document.head.append(st); }
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    this.el = document.createElement('div'); this.el.id = 'move3d'; host.append(this.el);
    this.btn = document.createElement('button'); this.btn.textContent = '▶ Move'; this.btn.title = 'Move: the physics live, gravity on; frozen pieces held where they are, loose ones turn on their joints. Drag a loose piece to turn it'; this.el.append(this.btn);
    this.card = document.createElement('div'); this.card.className = 'card'; this.card.style.display = 'none'; this.el.append(this.card);
    this.btn.onclick = () => { if (this.live) this.stop(); else void this.start(); };
    dock.overlays.add(this.group);
    // (a press on a loose piece while it moves is a drag of that piece, not a turn of the view)
    host.addEventListener('pointerdown', (e) => this.down(e), true);
    window.addEventListener('pointermove', (e) => this.moveTo(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    (globalThis as { nexusMove?: MoveMode }).nexusMove = this;
  }
  /** Moving, from the block shown as it was built. */
  async start(frozen = this.frozen): Promise<string> {
    const b = this.source()[0]; if (!b) { this.say('Nothing shown here was made by the room\'s operations, so there is nothing to move yet.'); return 'nothing'; }
    // (what was frozen by hand holds while the same block is shown; a new one starts from its own defaults)
    this.halt(); const J = await jolt(); if (b !== this.block) { frozen = undefined; this.spinning.clear(); this.held.clear(); } this.block = b;
    let live: LiveMotion; try { live = new LiveMotion(J, b, frozen); } catch (e) { this.say(`It could not move: ${(e as Error).message}`); return 'failed'; }
    this.live = live; this.frozen = live.motion.bodies.map((x) => x.frozen); this.draw(); this.dock.view.group.visible = false; this.btn.textContent = '■ Stop'; this.btn.classList.add('on');
    for (const [k, w] of this.spinning) live.spin(k, w);
    for (const k of this.held) if (!this.spinning.has(k)) live.hold(k, 0);
    this.last = performance.now(); const tick = (now: number) => { if (this.live !== live) return; this.frame(Math.min(1 / 30, (now - this.last) / 1000)); this.last = now; this.raf = requestAnimationFrame(tick); }; this.raf = requestAnimationFrame(tick);
    this.tell(); return live.motion.says;
  }
  /** Stopped: back as it was built. */
  stop(): void { this.halt(); this.frozen = undefined; this.spinning.clear(); this.held.clear(); this.sel = -1; this.card.style.display = 'none'; this.dock.redraw(); }
  private halt(): void { cancelAnimationFrame(this.raf); this.live?.destroy(); this.live = null; this.drag = null; this.dock.eyes.orbit.enabled = true; for (const m of this.meshes) this.group.remove(m.mesh); this.meshes = []; this.dock.view.group.visible = true; this.btn.textContent = '▶ Move'; this.btn.classList.remove('on'); }
  /** Each piece's leaves, where the block has them, a body's colour said by whether it is frozen. */
  private draw(): void {
    const parts = partOfBlock(this.block!).parts ?? [], bodies = this.live!.motion.bodies;
    bodies.forEach((body, k) => body.pieces.forEach((i) => { const p = parts[i]; if (!p) return;
      const own = new THREE.Matrix4().compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
      for (const l of leavesOf(p)) { const g = leafGeometry(l.part, true); if (!g) continue; const mat = leafMaterial(l.part).clone(); mat.emissive = new THREE.Color(body.frozen ? 0x0b2a55 : 0x000000);
        const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; mesh.userData.body = k; mesh.userData.name = this.block!.pieces[i]!.name; const base = own.clone().multiply(l.m); mesh.matrix.copy(base); mesh.castShadow = true; this.group.add(mesh); this.meshes.push({ mesh, body: k, base }); } }));
  }
  private frame(dt: number): void {
    const live = this.live!; if (dt <= 0) return;
    if (this.drag) { const d = this.drag, k = d.body, now = new THREE.Vector3(...live.pointOf(k, [d.made.x, d.made.y, d.made.z])), j = live.jointOf(k);
      if (j && j.kind !== 'slide') { const u = new THREE.Vector3(...j.dir), c = new THREE.Vector3(...j.point), r1 = now.clone().sub(c).projectOnPlane(u), r2 = d.to.clone().sub(c).projectOnPlane(u);
        if (r1.lengthSq() > 1e-12 && r2.lengthSq() > 1e-12) { const ang = Math.atan2(u.dot(r1.clone().cross(r2)), r1.dot(r2)), I = Math.min(live.inertiaAbout(k), 1e6); live.torque(k, I * (400 * ang - 36 * live.spinOf(k))); } }
      else { const m = live.massOf(k), v = d.was ? now.clone().sub(d.was).divideScalar(dt) : new THREE.Vector3(); const F = d.to.clone().sub(now).multiplyScalar(150 * m).addScaledVector(v, -20 * m); live.pull(k, [F.x, F.y, F.z], [now.x, now.y, now.z]); }
      d.was = now; }
    live.step(dt);
    for (const m of this.meshes) m.mesh.matrix.copy(live.moved(m.body).multiply(m.base));
    this.dock.redraw();
    if (this.sel >= 0 && Math.round(live.t * 10) % 3 === 0) this.tell();
  }
  /** Where a piece is on the page now (css px), by its name, while it moves: what a test presses and drags. */
  screenOf(name: string): [number, number] | null {
    const m = this.meshes.find((x) => x.mesh.userData.name === name); if (!m) return null; m.mesh.geometry.computeBoundingBox();
    return this.dock.screenOf(m.mesh.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(m.mesh.matrix));
  }
  /** How far each body with a joint has turned, in turns, by its name. */
  turns(): Record<string, number> { const l = this.live; if (!l) return {}; return Object.fromEntries(l.motion.bodies.map((b, k) => [b.name, +(l.angle(k) / (2 * Math.PI)).toFixed(3)])); }
  private hit(e: PointerEvent): { body: number; point: THREE.Vector3 } | null {
    const ray = this.dock.rayAt(e.clientX, e.clientY), rc = new THREE.Raycaster(ray.origin, ray.direction); this.group.updateMatrixWorld(true);
    const h = rc.intersectObjects(this.meshes.map((m) => m.mesh), false)[0]; return h ? { body: h.object.userData.body as number, point: h.point.clone() } : null;
  }
  private downAt: [number, number] | null = null; private posing = -1;
  private down(e: PointerEvent): void {
    if (!this.live || (e.target as HTMLElement).closest?.('#move3d')) return; this.downAt = [e.clientX, e.clientY];
    const h = this.hit(e); if (!h) return; const live = this.live;
    if (live.motion.bodies[h.body]!.frozen) return;
    // (the point held, as it was made; the plane it is dragged in: square to its joint's line, or facing the view)
    const made = h.point.clone().applyMatrix4(live.moved(h.body).invert()), j = live.jointOf(h.body), cam = this.dock.eyes.camera;
    const n = j ? new THREE.Vector3(...j.dir) : cam.getWorldDirection(new THREE.Vector3()).negate();
    this.drag = { body: h.body, made, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, h.point), to: h.point.clone(), was: null };
    // (a joint its motor holds lets go while it is dragged, and holds again where it is put: a pose)
    if (live.isHeld(h.body)) { live.hold(h.body, null); this.posing = h.body; }
    this.dock.eyes.orbit.enabled = false; e.stopPropagation(); e.preventDefault();
  }
  private moveTo(e: PointerEvent): void { if (!this.drag) return; const ray = this.dock.rayAt(e.clientX, e.clientY), p = ray.intersectPlane(this.drag.plane, new THREE.Vector3()); if (p) this.drag.to.copy(p); }
  private up(e: PointerEvent): void {
    const tap = this.downAt && Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) < 6; this.downAt = null;
    if (this.drag) { this.drag = null; this.dock.eyes.orbit.enabled = true; if (this.posing >= 0 && this.live) { this.live.hold(this.posing); this.held.add(this.posing); } this.posing = -1; }
    if (tap && this.live) { const h = this.hit(e); this.sel = h ? h.body : -1; this.tell(); }
  }
  private say(html: string): void { this.card.style.display = ''; this.card.innerHTML = html; }
  /** The card: what moves and how, and the piece chosen with its Freeze, Loose and Spin. */
  private tell(): void {
    const live = this.live; if (!live) return; const M = live.motion, esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const meshes = [...M.meshes.map((m) => `${esc(m.ga)} meshes ${esc(m.gb)} (${m.za}:${m.zb}, the other way)`), ...M.racks.map((r) => `${esc(r.gear)} drives ${esc(r.rack)} (${(r.r * 1000).toFixed(1)} mm a radian)`), ...M.belts.map((x) => `${esc(x.belt)} joins ${esc(x.pa)} and ${esc(x.pb)} (${x.za}:${x.zb}, the same way)`)].join('<br>');
    const s = this.sel >= 0 ? M.bodies[this.sel] : undefined, turns = s ? `${(live.angle(this.sel) / (2 * Math.PI)).toFixed(2)} turns` : '';
    this.say(`<b>Moving</b> <span class="dim">· gravity on · ${M.bodies.length} bodies, ${M.bodies.filter((b) => b.frozen).length} frozen (blue) · ${M.joints.length} joint${M.joints.length === 1 ? '' : 's'}</span>${meshes ? `<br>${meshes}` : ''}${this.live?.collideSays ? `<br><span class="dim">${this.live.collideSays}</span>` : ''}
      <div class="dim">Drag a loose piece to turn or slide it; a servo's joint stays where you put it. Tap one: Freeze, Loose, Motor (rpm), Hold.</div>
      ${s ? `<div style="margin-top:6px"><b>${esc(s.name)}</b><br><span class="dim">${esc(s.why)}${turns && live.jointOf(this.sel) ? ` · ${live.jointOf(this.sel)!.kind === 'slide' ? `${(live.slid(this.sel) * 1000).toFixed(1)} mm` : turns}` : ''}${live.motorOf(this.sel) ? ` · a ${esc(live.motorOf(this.sel)!.kind)}, ${esc(live.motorOf(this.sel)!.from)}` : ''}</span></div><div class="row"><button data-a="freeze">Freeze</button><button data-a="loose">Loose</button>${live.jointOf(this.sel)?.kind === 'hinge' ? `<button data-a="spin" class="${this.spinning.has(this.sel) ? 'on' : ''}">Motor</button><input data-a="rpm" type="number" value="${this.rpm}" style="width:56px" title="its speed, turns a minute"> rpm<button data-a="hold" class="${live.isHeld(this.sel) ? 'on' : ''}">Hold</button>` : ''}</div>` : ''}
      <div class="row"><button data-a="all-frozen">Freeze all</button><button data-a="all-loose">Loose all</button></div>`);
    for (const b of this.card.querySelectorAll<HTMLButtonElement>('button[data-a]')) b.onclick = () => this.act(b.dataset.a!);
    const r = this.card.querySelector<HTMLInputElement>('input[data-a="rpm"]'); if (r) r.onchange = () => { this.rpm = Number(r.value) || 0; const w = (this.rpm * 2 * Math.PI) / 60; if (this.spinning.has(this.sel)) { this.spinning.set(this.sel, w); live.spin(this.sel, w); } };
  }
  private act(a: string): void {
    const live = this.live; if (!live) return; const fr = live.motion.bodies.map((b) => b.frozen);
    if (a === 'spin') { const on = !this.spinning.has(this.sel), w = (this.rpm * 2 * Math.PI) / 60; if (on) this.spinning.set(this.sel, w); else this.spinning.delete(this.sel); live.spin(this.sel, on ? w : null); this.tell(); return; }
    if (a === 'hold') { const on = !live.isHeld(this.sel); this.spinning.delete(this.sel); if (on) { live.hold(this.sel); this.held.add(this.sel); } else { live.hold(this.sel, null); this.held.delete(this.sel); } this.tell(); return; }
    if (a === 'freeze' || a === 'loose') fr[this.sel] = a === 'freeze'; else fr.fill(a === 'all-frozen');
    const sel = this.sel; void this.start(fr).then(() => { this.sel = sel; this.tell(); });
  }
}

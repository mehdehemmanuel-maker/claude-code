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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  private readonly group = new THREE.Group(); private meshes: { mesh: THREE.Mesh; body: number; fine: boolean }[] = []; private bodyGroups: THREE.Group[] = []; private bodyMid: THREE.Vector3[] = []; private named = new Map<string, { body: number; at: THREE.Vector3 }>(); private fineR = 0; private drawnOnce = false;
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
  private halt(): void { cancelAnimationFrame(this.raf); this.live?.destroy(); this.live = null; this.drag = null; this.dock.eyes.orbit.enabled = true; for (const m of this.meshes) { m.mesh.geometry.dispose(); (m.mesh.material as THREE.Material).dispose(); } for (const g of this.bodyGroups) this.group.remove(g); this.meshes = []; this.bodyGroups = []; this.bodyMid = []; this.named.clear(); this.dock.view.group.visible = true; this.btn.textContent = '▶ Move'; this.btn.classList.remove('on'); }
  /** What is drawn while it moves, made light on the graphics card (the user, 2026-11-12: "super light on gpu and able to
   *  render extremely complex moving parts"). A body is rigid, so everything in it moves as one: all of a body's leaves of
   *  one material are welded into ONE mesh, already in place, and the body is one group with one matrix. A machine of ten
   *  thousand pieces in twelve bodies is then some dozens of draws a frame and twelve matrices, not ten thousand of each.
   *  The small pieces of a body (under 1/120 of the whole's size: bolts, washers, pins) are welded apart from the large,
   *  and are not drawn at all while they would be under about three pixels on the screen. Nothing is drawn again while
   *  nothing moves. A body's colour says whether it is frozen. */
  private draw(): void {
    const block = this.block!, parts = partOfBlock(block).parts ?? [], bodies = this.live!.motion.bodies;
    this.fineR = Math.max(block.hi[0] - block.lo[0], block.hi[1] - block.lo[1], block.hi[2] - block.lo[2]) / 120; this.drawnOnce = false;
    bodies.forEach((body, k) => { const grp = new THREE.Group(); grp.matrixAutoUpdate = false; const buckets = new Map<string, { src: THREE.MeshStandardMaterial; fine: boolean; geos: THREE.BufferGeometry[] }>();
      body.pieces.forEach((i) => { const p = parts[i]; if (!p) return; let at: THREE.Vector3 | undefined;
        const own = new THREE.Matrix4().compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
        for (const l of leavesOf(p)) { const g = leafGeometry(l.part, true); if (!g) continue; const base = own.clone().multiply(l.m), src = leafMaterial(l.part) as THREE.MeshStandardMaterial;
          if (!g.boundingSphere) g.computeBoundingSphere(); const fine = g.boundingSphere!.radius * base.getMaxScaleOnAxis() < this.fineR, key = `${src.uuid}|${fine ? 1 : 0}`;
          let bk = buckets.get(key); if (!bk) buckets.set(key, (bk = { src, fine, geos: [] }));
          const ng = g.index ? g.toNonIndexed() : g.clone(); if (!ng.attributes.normal) ng.computeVertexNormals(); for (const n of Object.keys(ng.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'uv') ng.deleteAttribute(n); ng.morphAttributes = {}; ng.applyMatrix4(base); bk.geos.push(ng);
          at ??= g.boundingSphere!.center.clone().applyMatrix4(base); }
        if (at) this.named.set(block.pieces[i]!.name, { body: k, at }); });
      for (const bk of buckets.values()) { if (!bk.geos.every((g) => g.attributes.uv)) for (const g of bk.geos) g.deleteAttribute('uv');
        const merged = bk.geos.length === 1 ? bk.geos[0]! : mergeGeometries(bk.geos, false); if (bk.geos.length > 1) for (const g of bk.geos) g.dispose(); if (!merged) continue;
        const mat = bk.src.clone(); mat.emissive = new THREE.Color(body.frozen ? 0x0b2a55 : 0x000000);
        const mesh = new THREE.Mesh(merged, mat); mesh.matrixAutoUpdate = false; mesh.userData.body = k; mesh.castShadow = !bk.fine; mesh.frustumCulled = true; grp.add(mesh); this.meshes.push({ mesh, body: k, fine: bk.fine }); }
      this.group.add(grp); this.bodyGroups[k] = grp; const bx = new THREE.Box3().setFromObject(grp); this.bodyMid[k] = bx.isEmpty() ? new THREE.Vector3() : bx.getCenter(new THREE.Vector3()); });
  }
  private frame(dt: number): void {
    const live = this.live!; if (dt <= 0) return;
    if (this.drag) { const d = this.drag, k = d.body, now = new THREE.Vector3(...live.pointOf(k, [d.made.x, d.made.y, d.made.z])), j = live.jointOf(k);
      if (j && j.kind !== 'slide') { const u = new THREE.Vector3(...j.dir), c = new THREE.Vector3(...j.point), r1 = now.clone().sub(c).projectOnPlane(u), r2 = d.to.clone().sub(c).projectOnPlane(u);
        if (r1.lengthSq() > 1e-12 && r2.lengthSq() > 1e-12) { const ang = Math.atan2(u.dot(r1.clone().cross(r2)), r1.dot(r2)), I = Math.min(live.inertiaAbout(k), 1e6); live.torque(k, I * (400 * ang - 36 * live.spinOf(k))); } }
      else { const m = live.massOf(k), v = d.was ? now.clone().sub(d.was).divideScalar(dt) : new THREE.Vector3(); const F = d.to.clone().sub(now).multiplyScalar(150 * m).addScaledVector(v, -20 * m); live.pull(k, [F.x, F.y, F.z], [now.x, now.y, now.z]); }
      d.was = now; }
    live.step(dt);
    // (one matrix a body; the small pieces of a body hidden while under about three pixels; nothing drawn while nothing moved)
    let changed = !this.drawnOnce || !!this.drag; this.drawnOnce = true; const cam = this.dock.eyes.camera as THREE.PerspectiveCamera, pxPerM = (this.dock.canvas.clientHeight || 600) / (2 * Math.tan((((cam.fov ?? 50) * Math.PI) / 180) / 2)), v = new THREE.Vector3(), near: boolean[] = [];
    this.bodyGroups.forEach((grp, k) => { const m = live.moved(k), a = grp.matrix.elements, e = m.elements; let d = 0; for (let i = 0; i < 16; i++) d += Math.abs(a[i]! - e[i]!); if (d > 1e-7) { grp.matrix.copy(m); grp.matrixWorldNeedsUpdate = true; changed = true; }
      near[k] = (this.fineR * pxPerM) / Math.max(1e-6, v.copy(this.bodyMid[k]!).applyMatrix4(grp.matrix).distanceTo(cam.position)) > 3; });
    for (const m of this.meshes) if (m.fine && m.mesh.visible !== near[m.body]) { m.mesh.visible = !!near[m.body]; changed = true; }
    if (changed) this.dock.redraw();
    if ((this.sel >= 0 || live.cylinders().some((c) => live.valveOf(c.body) !== 0)) && !this.testing && Math.round(live.t * 10) % 3 === 0) this.tell();
  }
  /** Where a piece is on the page now (css px), by its name, while it moves: what a test presses and drags. */
  screenOf(name: string): [number, number] | null {
    const m = this.named.get(name), g = m ? this.bodyGroups[m.body] : undefined; if (!m || !g) return null;
    return this.dock.screenOf(m.at.clone().applyMatrix4(g.matrix));
  }
  /** How far each body with a joint has turned, in turns, by its name. */
  turns(): Record<string, number> { const l = this.live; if (!l) return {}; return Object.fromEntries(l.motion.bodies.map((b, k) => [b.name, +(l.angle(k) / (2 * Math.PI)).toFixed(3)])); }
  private hit(e: PointerEvent): { body: number; point: THREE.Vector3 } | null {
    const ray = this.dock.rayAt(e.clientX, e.clientY), rc = new THREE.Raycaster(ray.origin, ray.direction); this.group.updateMatrixWorld(true);
    const h = rc.intersectObjects(this.meshes.filter((m) => m.mesh.visible).map((m) => m.mesh), false)[0]; return h ? { body: h.object.userData.body as number, point: h.point.clone() } : null;
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
    const cyls = live.cylinders(), s = this.sel >= 0 ? M.bodies[this.sel] : undefined, turns = s ? `${(live.angle(this.sel) / (2 * Math.PI)).toFixed(2)} turns` : '';
    this.say(`<b>Moving</b> <span class="dim">· gravity on · ${M.bodies.length} bodies, ${M.bodies.filter((b) => b.frozen).length} frozen (blue) · ${M.joints.length} joint${M.joints.length === 1 ? '' : 's'}</span>${meshes ? `<br>${meshes}` : ''}${this.live?.collideSays ? `<br><span class="dim">${this.live.collideSays}</span>` : ''}
      <div class="dim">Drag a loose piece to turn or slide it; a servo's joint stays where you put it; a joint on a cylinder moves only as far as you can force its cylinder. Tap one: Freeze, Loose, Motor (rpm), Hold.</div>
      ${s ? `<div style="margin-top:6px"><b>${esc(s.name)}</b><br><span class="dim">${esc(s.why)}${turns && live.jointOf(this.sel) ? ` · ${live.jointOf(this.sel)!.kind === 'slide' ? `${(live.slid(this.sel) * 1000).toFixed(1)} mm` : turns}` : ''}${live.motorOf(this.sel) ? ` · a ${esc(live.motorOf(this.sel)!.kind)}, ${esc(live.motorOf(this.sel)!.from)}` : ''}</span></div><div class="row"><button data-a="freeze">Freeze</button><button data-a="loose">Loose</button>${live.jointOf(this.sel)?.kind === 'hinge' ? `<button data-a="spin" class="${this.spinning.has(this.sel) ? 'on' : ''}">Motor</button><input data-a="rpm" type="number" value="${this.rpm}" style="width:56px" title="its speed, turns a minute"> rpm<button data-a="hold" class="${live.isHeld(this.sel) ? 'on' : ''}">Hold</button>` : ''}</div>` : ''}
      ${cyls.length ? `<div style="margin-top:6px"><b>Cylinders</b> <span class="dim">· each pushes with its own force and no more; shut, its oil holds it</span>${cyls.map((c) => { const v = live.valveOf(c.body), o = live.out(c.body); return `<div class="row"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name.split(' and ')[0]!.split(' > ').pop()!)} <span class="dim">${Math.round(o * 1000)} mm (${Math.round(c.lo * 1000)}…${Math.round(c.hi * 1000)}) · ${Math.round(c.force / 1000)} kN</span></span><button data-a="cyl:${c.body}:-1" class="${v < 0 ? 'on' : ''}" title="Draw it in">◀ In</button><button data-a="cyl:${c.body}:0" title="Shut its valve: it holds where it is">■</button><button data-a="cyl:${c.body}:1" class="${v > 0 ? 'on' : ''}" title="Push it out">Out ▶</button></div>`; }).join('')}</div>` : ''}
      <div class="row"><button data-a="all-frozen">Freeze all</button><button data-a="all-loose">Loose all</button>${this.testMode ? `<button data-a="test" class="${this.testing ? 'on' : ''}" title="Works every cylinder out and in, then every joint that is still held, here in the view, and says what each reached. About fifteen seconds a cylinder; no AI calls, nothing spent"${this.testing ? ' disabled' : ''}>${this.testing ? 'Testing…' : 'Test joints'}</button>` : ''}<button data-a="testmode" class="${this.testMode ? 'on' : ''}" title="Test mode: shows the checks you can run on what was built. Off for ordinary use">Test mode</button></div>${this.testMode && this.report ? `<div class="row"><button data-a="copy"${this.testing ? ' disabled' : ''}>${this.copied ? 'Copied' : 'Copy report'}</button></div><div class="dim" style="margin-top:6px;max-height:38vh;overflow:auto;user-select:text;-webkit-user-select:text">${this.report}</div>` : ''}`);
    for (const b of this.card.querySelectorAll<HTMLButtonElement>('button[data-a]')) b.onclick = () => this.act(b.dataset.a!);
    const r = this.card.querySelector<HTMLInputElement>('input[data-a="rpm"]'); if (r) r.onchange = () => { this.rpm = Number(r.value) || 0; const w = (this.rpm * 2 * Math.PI) / 60; if (this.spinning.has(this.sel)) { this.spinning.set(this.sel, w); live.spin(this.sel, w); } };
  }
  private testing = false; private report = ''; private copied = false;
  /** Test mode (the user, 2026-11-12: "make this a test feature only so test mode"): the checks and their report are shown
   *  only with it on; it is off until turned on, and stays as it was left. */
  private testMode = (() => { try { return localStorage.getItem('nexus.testMode') === '1'; } catch { return false; } })();
  /** The report as plain text, one line each, for pasting. */
  private reportText(): string { const d = document.createElement('div'); d.innerHTML = this.report.replace(/<br\s*\/?>/g, '\n'); return (d.textContent ?? '').trim(); }
  private async copyReport(): Promise<void> { const t = this.reportText(); let ok = false;
    try { await navigator.clipboard.writeText(t); ok = true; } catch { /* (not allowed here: the older way below) */ }
    if (!ok) { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove(); }
    this.copied = ok; if (!ok) this.report += '<br><span style="opacity:.7">It could not be copied from here: press and hold on the report to select it.</span>'; this.tell(); if (ok) setTimeout(() => { this.copied = false; if (this.live) this.tell(); }, 2000); }
  /** Test joints (the user, 2026-11-12: "make it testable to me not to you"): each joint that holds its place is driven to
   *  nine tenths of each end of its range, in the view, one after another; what it reached is said against what was asked,
   *  and for each cylinder how far its rod left its barrel's line and how much of its stroke it used. Run by the person, on
   *  what they built; it calls no model and spends nothing. A joint more than 5° short, or a rod more than a tenth of its
   *  barrel's length off its line or past its stroke, is marked as failing. */
  private async runTest(): Promise<void> {
    const live = this.live, block = this.block; if (!live || !block || this.testing) return; this.testing = true; this.report = 'Starting…'; this.tell();
    const M = live.motion, wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)), deg = (r: number) => Math.round((r * 180) / Math.PI), short = (n: string) => n.split(' and ')[0]!.split(' > ').pop()!;
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const cOf = (body: number) => block.pieces[M.bodies[body]!.pieces[0]!]!.solid.base.c as unknown as [number, number, number];
    const slides = M.joints.filter((j) => j.slide && j.range), worst = slides.map(() => ({ off: 0, lo: 0, hi: 0, lmin: Infinity, lmax: -Infinity }));
    // (each cylinder's two eye pins: the free pin its barrel turns on and the one its rod turns on; the length between them is
    // read as it moves, to set beside the closed and open lengths it was made for)
    const eyeOf = (body: number) => M.joints.find((h) => h !== undefined && h.turns && !h.slide && h.by.some((t) => t.includes('(free)')) && (h.a === body || h.b === body))?.point;
    const eyes = slides.map((j) => ({ a: eyeOf(j.a), b: eyeOf(j.b) })), dist = (p: readonly number[], q: readonly number[]) => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
    const read = () => slides.forEach((j, k) => { const cb = cOf(j.a), cr = cOf(j.b), d = j.dir, pb = live.pointOf(j.a, cb), pr = live.pointOf(j.b, cr), p2 = live.pointOf(j.b, [cr[0] + d[0] * 0.1, cr[1] + d[1] * 0.1, cr[2] + d[2] * 0.1]);
      const ax = [0, 1, 2].map((i) => (p2[i]! - pr[i]!) / 0.1), w = [0, 1, 2].map((i) => pb[i]! - pr[i]!), along = w.reduce((t, v, i) => t + v * ax[i]!, 0), off = Math.hypot(...w.map((v, i) => v - along * ax[i]!)), rest = [0, 1, 2].reduce((t, i) => t + (cb[i]! - cr[i]!) * d[i]!, 0), sl = along - rest;
      const x = worst[k]!; x.off = Math.max(x.off, off); x.lo = Math.min(x.lo, sl); x.hi = Math.max(x.hi, sl); const e = eyes[k]!; if (e.a && e.b) { const L = dist(live.pointOf(j.a, e.a), live.pointOf(j.b, e.b)); x.lmin = Math.min(x.lmin, L); x.lmax = Math.max(x.lmax, L); } });
    const joints = M.joints.filter((j) => j.motor && j.motor.kind !== 'cylinder' && j.limits && j.turns && !j.by.some((t) => t.includes('(free)'))), lines: string[] = [];
    // (the joints cylinders carry: held by nothing but them; each cylinder is worked out and in, and what turned is read)
    const carried = M.joints.filter((j) => !j.motor && j.turns && !j.slide && !j.by.some((t) => t.includes('(free)'))), cyls = live.cylinders(), mm = (x: number) => Math.round(x * 1000);
    try {
      for (const c of cyls) { const nm = short(c.name), sp = Math.max(0.01, (c.hi - c.lo) / 4), a0 = carried.map((j) => live.angle(j.a)), swing = carried.map(() => [0, 0] as [number, number]), ends: number[] = [];
        for (const way of [1, -1] as const) { if (this.live !== live) return; this.report = `${lines.join('<br>')}${lines.length ? '<br>' : ''}${way > 0 ? 'Pushing out' : 'Drawing in'} the ${esc(nm)}…`; this.tell();
          live.valve(c.body, way, sp); for (let t = 0; t < 14; t++) { await wait(500); read(); carried.forEach((j, k) => { const d = live.angle(j.a) - a0[k]!; swing[k]![0] = Math.min(swing[k]![0], d); swing[k]![1] = Math.max(swing[k]![1], d); }); } ends.push(live.out(c.body)); }
        live.valve(c.body, 0); const short1 = ends[0]! < c.hi - 0.01 - 0.05 * (c.hi - c.lo), short2 = ends[1]! > c.lo + 0.01 + 0.05 * (c.hi - c.lo), turned = carried.map((j, k) => ({ j, s: swing[k]! })).filter((x) => x.s[1] - x.s[0] > 0.02);
        lines.push(`${short1 || short2 || !turned.length ? '✕' : '✓'} <b>${esc(nm)}</b> (pushes ${Math.round(c.force / 1000)} kN, draws ${Math.round(c.pull / 1000)} kN): out to ${mm(ends[0]!)} of ${mm(c.hi)} mm${short1 ? ' (stopped short: too heavy for it, or something in its way)' : ''}; in to ${mm(ends[1]!)} of ${mm(c.lo)} mm${short2 ? ' (stopped short)' : ''}. ${turned.length ? turned.map((x) => `It turned the ${esc(short(M.bodies[x.j.a]!.name))} from ${deg(x.s[0])}° to ${deg(x.s[1])}°${x.j.limits ? ` (asked ${deg(x.j.limits.lo)}° to ${deg(x.j.limits.hi)}°)` : ''}`).join('; ') : 'It turned no joint: it moves nothing'}`); }
      for (const j of carried) if (!cyls.length) lines.push(`✕ <b>${esc(short(M.bodies[j.a]!.name))}</b>: nothing holds or moves this joint`);
      for (const j of joints) { const nm = short(M.bodies[j.a]!.name), got: string[] = []; let bad = false;
        for (const want of [j.limits!.hi * 0.9, j.limits!.lo * 0.9]) { if (this.live !== live) return; this.report = `${lines.join('<br>')}${lines.length ? '<br>' : ''}Moving the ${esc(nm)} to ${deg(want)}°…`; this.tell();
          live.hold(j.a, want); await wait(3500); read(); const g = live.angle(j.a), miss = ((((deg(g) - deg(want)) % 360) + 540) % 360) - 180; if (Math.abs(miss) > 5) bad = true; got.push(`asked ${deg(want)}°, reached ${deg(want) + miss}°`); }
        live.hold(j.a, 0); await wait(2000); read();
        lines.push(`${bad ? '✕' : '✓'} <b>${esc(nm)}</b>: ${got.join('; ')}${bad ? ' (stopped short: something is in its way, or it cannot reach)' : ''}`); }
      slides.forEach((j, k) => { const x = worst[k]!, len = Math.max(0.05, 2 * Math.max(...((block.pieces[M.bodies[j.a]!.pieces[0]!]!.solid.base as unknown as { h?: number }).h ? [(block.pieces[M.bodies[j.a]!.pieces[0]!]!.solid.base as unknown as { h: number }).h / 2] : [0.5]))), r = j.range!, out = x.lo < r[0] - 0.005 || x.hi > r[1] + 0.005, off = x.off > len / 10;
        // (pin to pin: what it was made for, from its stroke about the length it stands at, beside what the joints asked of it)
        const e = eyes[k]!, L0 = e.a && e.b ? dist(e.a, e.b) : NaN, made = Number.isFinite(L0) ? `made to work from ${Math.round((L0 - r[1]) * 1000)} to ${Math.round((L0 - r[0]) * 1000)} mm pin to pin (it stands at ${Math.round(L0 * 1000)}); the joints took its pins from ${Math.round(x.lmin * 1000)} to ${Math.round(x.lmax * 1000)} mm apart` : 'its two pins were not found';
        const asked = Number.isFinite(L0) && (x.lmin < L0 - r[1] - 0.01 || x.lmax > L0 - r[0] + 0.01);
        lines.push(`${out || off ? '✕' : '✓'} <b>${esc(short(M.bodies[j.b]!.name))}</b>: rod off its barrel's line by at most ${Math.round(x.off * 1000)} mm${off ? ' (forced out of line)' : ''}. ${made}${asked ? ' — MORE than it was made for: its stroke was worked out wrongly, or the joint was pushed past it' : ''}`); });
      if (!joints.length && !cyls.length) lines.push('No cylinder and no held joint here to test.');
      if (joints.length) lines.push(`Note: ${joints.length} joint${joints.length === 1 ? ' is' : 's are'} still held by a hold that is not a part of the machine (no cylinder spans ${joints.length === 1 ? 'it' : 'them'}).`);
      const fails = lines.filter((l) => l.startsWith('✕')).length; this.report = `<b>Joint test: ${fails ? `${fails} failing` : 'all passed'}</b><br>${lines.join('<br>')}<br><span style="opacity:.7">End of report (${lines.length} lines).</span>`;
    } finally { this.testing = false; if (this.live === live) this.tell(); }
  }
  private act(a: string): void {
    if (a === 'test') { void this.runTest(); return; }
    if (a === 'copy') { void this.copyReport(); return; }
    if (a === 'testmode') { this.testMode = !this.testMode; try { localStorage.setItem('nexus.testMode', this.testMode ? '1' : '0'); } catch { /* (not kept) */ } this.tell(); return; }
    const live = this.live; if (!live) return;
    // (a cylinder's valve: out, in, or shut. It runs at a speed that takes its whole stroke in about four seconds: the
    // pump that would set its speed is not modelled, so this is a choice for watching it, not a figure of the machine)
    if (a.startsWith('cyl:')) { const [, k, w] = a.split(':'), body = Number(k), c = live.cylinders().find((x) => x.body === body); if (c) live.valve(body, Number(w) as -1 | 0 | 1, Math.max(0.01, (c.hi - c.lo) / 4)); this.tell(); return; } const fr = live.motion.bodies.map((b) => b.frozen);
    if (a === 'spin') { const on = !this.spinning.has(this.sel), w = (this.rpm * 2 * Math.PI) / 60; if (on) this.spinning.set(this.sel, w); else this.spinning.delete(this.sel); live.spin(this.sel, on ? w : null); this.tell(); return; }
    if (a === 'hold') { const on = !live.isHeld(this.sel); this.spinning.delete(this.sel); if (on) { live.hold(this.sel); this.held.add(this.sel); } else { live.hold(this.sel, null); this.held.delete(this.sel); } this.tell(); return; }
    if (a === 'freeze' || a === 'loose') fr[this.sel] = a === 'freeze'; else fr.fill(a === 'all-frozen');
    const sel = this.sel; void this.start(fr).then(() => { this.sel = sel; this.tell(); });
  }
}

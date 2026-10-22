// WHAT A RUN MADE, SHOWN: in 3D where the pipeline made something physical, in 2D where it counted something going
// round. The user's own rule — *"if neural then 2d if physical then 3d"* — read off what the run actually produced
// rather than off a setting, because the run knows which it was and a setting would only be able to be wrong.
//
// The 3D half is three.js, loaded only when there is something to show: a page whose pipeline made no shape never
// pays for the renderer. The 2D half is an inline SVG, because a line of counts is a line.
//
// Owner of: showing a pipeline's result.

import type { Worked } from './flow2d';
import type { Made } from '../ask/generate';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** What the scene needs of a `Made`, and nothing else: a whole one carries its laws, its text and its dims, none of
 *  which the drawing reads, and all of which would cross into the page's markup for no reason. */
interface Thin { n: string; k: Made['kind']; b: number[]; at: number[]; t: number[]; c: string }

/** Which way to show it: what the run made decides, not a setting. */
export const howToShow = (w: Worked): 'solid' | 'series' | 'nothing' =>
  (w.shapes?.length ? 'solid' : w.series?.at.length ? 'series' : 'nothing');

export function showHtml(w: Worked): string {
  const how = howToShow(w);
  if (how === 'nothing') return '';
  if (how === 'series') {
    const at = w.series!.at, max = Math.max(...at, 1);
    const pts = at.map((v, i) => `${(i / Math.max(1, at.length - 1) * 300).toFixed(1)},${(90 - (v / max) * 80).toFixed(1)}`).join(' ');
    return `<div class="show flat"><h3>What it did, round by round <span>${at.length} rounds · ${w.series!.of}</span></h3>
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" class="series">
        <polyline points="${pts}" fill="none" stroke="#6fbf84" stroke-width="2" vector-effect="non-scaling-stroke"/>
        ${at.map((v, i) => `<circle cx="${(i / Math.max(1, at.length - 1) * 300).toFixed(1)}" cy="${(90 - (v / max) * 80).toFixed(1)}" r="2.5" fill="#6fbf84"/>`).join('')}
      </svg>
      <p class="hint">It went round ${at.length} time${at.length === 1 ? '' : 's'}. A loop stops when its check says
        so, or at the number of times its repeat step names.</p></div>`;
  }
  const s = w.shapes!.filter((m) => !m.unseen);
  const kg = s.reduce((t, m) => t + m.mass, 0);
  // only what the drawing needs crosses into the scene, so a Made full of laws and text does not go through JSON
  const thin = s.map((m) => ({ n: m.name, k: m.kind, b: [m.local.w, m.local.h, m.local.d], at: m.at, t: m.turn, c: m.matter?.name ?? '' }));
  return `<div class="show solid"><h3>What it made
      <span>${s.length} piece${s.length === 1 ? '' : 's'}${kg > 0 ? `, ${kg >= 1 ? `${kg.toFixed(2)} kg` : `${(kg * 1e3).toFixed(0)} g`}` : ''}</span></h3>
    <div class="scene" data-shapes="${esc(JSON.stringify(thin))}"></div>
    <ul class="made">${s.slice(0, 14).map((m) => `<li><b>${esc(m.name)}</b>
      <span>${(m.local.w * 1e3).toFixed(0)} × ${(m.local.h * 1e3).toFixed(0)} × ${(m.local.d * 1e3).toFixed(0)} mm</span>
      <span>${esc(m.matter?.name ?? 'no matter said')}</span>
      <span>${m.mass >= 1 ? `${m.mass.toFixed(2)} kg` : `${(m.mass * 1e3).toFixed(1)} g`}</span></li>`).join('')}
      ${s.length > 14 ? `<li class="more">and ${s.length - 14} more</li>` : ''}</ul>
    <p class="hint">Drag to turn it. Every size, place and mass here was worked out by the engine from what the step
      said — the mass is its volume times its matter's density, not a figure anyone typed.</p></div>`;
}

/** Put a real 3D view in every `.scene` the page just drew. three.js is fetched only now, so a page that made
 *  nothing never loads it. */
export async function mountScenes(el: ParentNode): Promise<void> {
  const holes = [...el.querySelectorAll<HTMLElement>('.scene[data-shapes]')];
  if (!holes.length) return;
  const THREE = await import('three');
  for (const hole of holes) {
    let shapes: Thin[];
    try { shapes = JSON.parse(hole.dataset.shapes!) as Thin[]; } catch { continue; }
    if (!shapes.length) continue;
    hole.textContent = '';
    const w = hole.clientWidth || 640, h = Math.max(220, Math.round(w * 0.46));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    // near 0.01 m: a 140 mm ball sits 0.3 m from the camera, and the 1 m near plane this started with clipped away
    // every single thing the engine makes, which is why the scene came back empty rather than wrong
    const cam = new THREE.PerspectiveCamera(42, w / h, 0.01, 500);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(w, h); ren.setPixelRatio(Math.min(2, devicePixelRatio));
    hole.appendChild(ren.domElement);

    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x202833, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(1, 2.1, 1.4); scene.add(sun);

    // every kind the Workshop can make, drawn as what it is; sizes are metres, as the engine keeps them
    const geomOf = ([w, h, d]: [number, number, number], k: Thin['k']) =>
      k === 'sphere' ? new THREE.SphereGeometry(Math.max(w, h, d) / 2, 40, 28)
      : k === 'cylinder' ? new THREE.CylinderGeometry(w / 2, w / 2, h, 44)
      : k === 'tube' ? new THREE.CylinderGeometry(w / 2, w / 2, h, 44, 1, true)
      : k === 'cone' ? new THREE.ConeGeometry(w / 2, h, 44)
      : k === 'torus' ? new THREE.TorusGeometry(w / 2.6, w / 9, 18, 48)
      : k === 'circle' ? new THREE.CircleGeometry(w / 2, 44)
      : k === 'plane' ? new THREE.PlaneGeometry(w, d)
      : new THREE.BoxGeometry(w, h, d);
    const group = new THREE.Group();
    // one colour per matter, so a steel part and an aluminium one are told apart without a legend
    const HUE: Record<string, number> = { steel: 0x8d98a6, stainless: 0xb6c0cb, aluminium: 0xc3ccd6, brass: 0xc9a44f, copper: 0xc07a4d, titanium: 0x9aa1a8, wood: 0xb08a5c, acrylic: 0xa8c6d8, nylon: 0xd6d2c6, rubber: 0x4a4d52, concrete: 0x9b9b95 };
    for (const s of shapes) {
      const colour = HUE[s.c.toLowerCase().split(/[ -]/)[0] ?? ''] ?? 0x9fb4cc;
      const m = new THREE.Mesh(geomOf(s.b as [number, number, number], s.k),
        new THREE.MeshStandardMaterial({ color: colour, metalness: /steel|alumin|brass|copper|titan|stainless/i.test(s.c) ? 0.6 : 0.15, roughness: 0.45 }));
      m.position.set(s.at[0], s.at[1], s.at[2]);
      m.rotation.set(s.t[0], s.t[1], s.t[2]);
      if (s.k === 'plane') m.rotation.x -= Math.PI / 2;
      group.add(m);
    }
    // the ground it stands on, so the sizes read as sizes rather than as a drawing floating in nothing
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.z, 0.08) * 2.4 + 0.25;   // metres: the engine's own unit
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(span, span), new THREE.MeshStandardMaterial({ color: 0x141a23, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(mid.x, 0, mid.z);
    scene.add(new THREE.GridHelper(span, Math.max(4, Math.min(40, Math.round(span / 0.05))), 0x24303d, 0x1a222c).translateX(mid.x).translateZ(mid.z));
    scene.add(floor, group);

    const far = Math.max(size.x, size.y, size.z, 0.06) * 2.1;
    let turn = 0.7, tilt = 0.52;
    const look = () => {
      cam.position.set(mid.x + far * Math.cos(turn) * Math.cos(tilt), far * Math.sin(tilt) + size.y * 0.4, mid.z + far * Math.sin(turn) * Math.cos(tilt));
      cam.lookAt(mid.x, size.y * 0.3, mid.z);
      ren.render(scene, cam);
    };
    look();
    ren.domElement.addEventListener('pointerdown', (e) => {
      const sx = e.clientX, sy = e.clientY, t0 = turn, p0 = tilt;
      const move = (m: PointerEvent) => {
        turn = t0 - (m.clientX - sx) * 0.009;
        tilt = Math.max(0.06, Math.min(1.45, p0 + (m.clientY - sy) * 0.006));
        look();
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  }
}

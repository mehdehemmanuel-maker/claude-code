// WHAT A RUN MADE, SHOWN: in 3D where the pipeline made something physical, in 2D where it counted something going
// round. The user's own rule — *"if neural then 2d if physical then 3d"* — read off what the run actually produced
// rather than off a setting, because the run knows which it was and a setting would only be able to be wrong.
//
// The 3D half is three.js, loaded only when there is something to show: a page whose pipeline made no shape never
// pays for the renderer. The 2D half is an inline SVG, because a line of counts is a line.
//
// Owner of: showing a pipeline's result.

import type { Placed, Worked } from './flow2d';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

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
  const s = w.shapes!;
  const kinds = [...new Set(s.map((x) => x.of))].join(', ');
  return `<div class="show solid"><h3>What it made <span>${s.length} ${kinds}${s.length === 1 ? '' : 's'}, ${s[0]!.mm[0]} mm</span></h3>
    <div class="scene" data-shapes="${esc(JSON.stringify(s))}"></div>
    <p class="hint">Drag to turn it. These are the sizes and places the step worked out — change the step's words and
      run it again to change them.</p></div>`;
}

/** Put a real 3D view in every `.scene` the page just drew. three.js is fetched only now, so a page that made
 *  nothing never loads it. */
export async function mountScenes(el: ParentNode): Promise<void> {
  const holes = [...el.querySelectorAll<HTMLElement>('.scene[data-shapes]')];
  if (!holes.length) return;
  const THREE = await import('three');
  for (const hole of holes) {
    let shapes: Placed[];
    try { shapes = JSON.parse(hole.dataset.shapes!) as Placed[]; } catch { continue; }
    if (!shapes.length) continue;
    hole.textContent = '';
    const w = hole.clientWidth || 640, h = Math.max(220, Math.round(w * 0.46));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    const cam = new THREE.PerspectiveCamera(42, w / h, 1, 20000);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(w, h); ren.setPixelRatio(Math.min(2, devicePixelRatio));
    hole.appendChild(ren.domElement);

    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x202833, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(1, 2.1, 1.4); scene.add(sun);

    const geomOf = (s: Placed) => s.of === 'sphere' ? new THREE.SphereGeometry(s.mm[0] / 2, 40, 28)
      : s.of === 'cylinder' ? new THREE.CylinderGeometry(s.mm[0] / 2, s.mm[0] / 2, s.mm[1], 40)
      : s.of === 'cone' ? new THREE.ConeGeometry(s.mm[0] / 2, s.mm[1], 40)
      : new THREE.BoxGeometry(s.mm[0], s.mm[1], s.mm[2]);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9fb4cc, metalness: 0.25, roughness: 0.42 });
    const group = new THREE.Group();
    for (const s of shapes) {
      const m = new THREE.Mesh(geomOf(s), mat);
      m.position.set(s.at[0], s.at[1] + s.mm[1] / 2, s.at[2]);
      group.add(m);
    }
    // the ground it stands on, so the sizes read as sizes rather than as a drawing floating in nothing
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.z) * 2.2 + 80;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(span, span), new THREE.MeshStandardMaterial({ color: 0x141a23, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(mid.x, 0, mid.z);
    scene.add(new THREE.GridHelper(span, Math.max(4, Math.round(span / 20)), 0x24303d, 0x1a222c).translateX(mid.x).translateZ(mid.z));
    scene.add(floor, group);

    const far = Math.max(size.x, size.y, size.z, 60) * 1.9;
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

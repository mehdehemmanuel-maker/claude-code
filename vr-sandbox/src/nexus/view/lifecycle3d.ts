// A species' life cycle drawn round you (src/nexus/life/reproduce.ts is it as data): each stage a model on a stand, made
// big enough to see, and said how many times it is magnified (or shrunk), so its real size is never lost; its egg and
// sperm, where it has both, side by side at the same magnification, so how different they are is as it is. Schematic
// models, a textbook's, not anatomy.

import * as THREE from 'three';
import type { Species, Stage } from '../life/reproduce';

const std = (c: number, r = 0.6, more: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...more });
function label(text: string, w = 0.5, size = 26): THREE.Sprite {
  const lines = text.split('\n'), cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64 + lines.length * (size + 14);
  const c = cv.getContext('2d')!; c.fillStyle = 'rgba(4,14,22,0.85)'; c.beginPath(); c.roundRect(4, 4, 1016, cv.height - 8, 24); c.fill(); c.strokeStyle = '#80deea'; c.lineWidth = 4; c.stroke();
  c.fillStyle = '#e6f7ff'; c.textBaseline = 'top'; lines.forEach((l, i) => { c.font = `${i === 0 ? 700 : 500} ${i === 0 ? size + 6 : size}px system-ui`; c.fillText(l.slice(0, 70), 24, 24 + i * (size + 14)); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(w, (w * cv.height) / 1024, 1); return s;
}
/** A stage's model, its largest size 1 (scaled after). */
function model(st: Stage, sp: Species): THREE.Object3D {
  const g = new THREE.Group(), add = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const skin = { human: 0xd8b49a, whale: 0x3a4a5a, pig: 0xf0b8b0, fly: 0x8a6a3a, ant: 0x2a1a14, earthworm: 0xb06a6a, tardigrade: 0xd8c8a0, mycelium: 0xe8e0d0 }[sp.id] ?? 0xcccccc;
  switch (st.shape) {
    case 'egg': {
      const egg = add(new THREE.SphereGeometry(0.5, 32, 24), std(0xf4ecd8, 0.4, { transparent: true, opacity: 0.9 })); egg.scale.set(sp.id === 'fly' || sp.id === 'ant' ? 0.45 : 1, 1, sp.id === 'fly' || sp.id === 'ant' ? 0.45 : 1);
      if (sp.gametes.egg && sp.gametes.sperm) { // the sperm beside it, at the same magnification
        const k = sp.gametes.sperm / sp.gametes.egg, head = 0.06 * Math.min(1, k * 4) + 0.01;
        const s = new THREE.Group(); s.add(new THREE.Mesh(new THREE.SphereGeometry(head, 12, 8), std(0xdfe8f0, 0.4)));
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(head * 0.12, head * 0.05, k, 6), std(0xdfe8f0, 0.5)); tail.rotation.z = Math.PI / 2; tail.position.x = k / 2 + head; s.add(tail);
        s.position.set(0.55 + head, -0.3, 0.2); g.add(s);
      }
      return g;
    }
    case 'spore': { add(new THREE.CapsuleGeometry(0.18, 0.5, 6, 12), std(0xe8dcc0)).rotation.z = 1.1; for (let i = 0; i < 3; i++) add(new THREE.CapsuleGeometry(0.12, 0.35, 6, 10), std(0xe0d4b8), 0.4 + i * 0.2, -0.3 + i * 0.25, -0.2).rotation.z = 0.4 * i; return g; }
    case 'ball': { const n = st.name === 'zygote' ? 1 : 40; for (let i = 0; i < n; i++) { const a = i * 2.4, b = Math.acos(1 - (2 * (i + 0.5)) / n); add(new THREE.SphereGeometry(n === 1 ? 0.5 : 0.11, 14, 10), std(0xf0d8c8, 0.5, { transparent: true, opacity: 0.85 }), n === 1 ? 0 : 0.42 * Math.sin(b) * Math.cos(a), n === 1 ? 0 : 0.42 * Math.cos(b), n === 1 ? 0 : 0.42 * Math.sin(b) * Math.sin(a)); } return g; }
    case 'embryo': { const t = add(new THREE.TorusGeometry(0.3, 0.13, 12, 24, Math.PI * 1.5), std(skin, 0.6)); t.rotation.z = 0.8; add(new THREE.SphereGeometry(0.2, 16, 12), std(skin), 0.25, 0.25, 0); return g; }
    case 'larva': { for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.11 - Math.abs(i - 4) * 0.008, 12, 8), std(sp.id === 'earthworm' ? skin : 0xf0ece0, 0.5), -0.45 + i * 0.11, 0, 0); return g; }
    case 'pupa': { add(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), std(0x8a5a2a, 0.5)).rotation.z = Math.PI / 2; return g; }
    case 'cocoon': { const c = add(new THREE.SphereGeometry(0.4, 20, 14), std(0xb08a4a, 0.5)); c.scale.set(1.3, 1, 1); add(new THREE.ConeGeometry(0.08, 0.2, 10), std(0xb08a4a), 0.56, 0, 0).rotation.z = -Math.PI / 2; add(new THREE.ConeGeometry(0.08, 0.2, 10), std(0xb08a4a), -0.56, 0, 0).rotation.z = Math.PI / 2; return g; }
    case 'hypha': { const m = std(0xf2ece0, 0.7); const branch = (x: number, y: number, a: number, len: number, d: number): void => { if (d > 4) return; const c = add(new THREE.CylinderGeometry(0.012, 0.015, len, 6), m, x + (Math.cos(a) * len) / 2, y + (Math.sin(a) * len) / 2, 0); c.rotation.z = a - Math.PI / 2; branch(x + Math.cos(a) * len, y + Math.sin(a) * len, a + 0.5, len * 0.7, d + 1); branch(x + Math.cos(a) * len, y + Math.sin(a) * len, a - 0.6, len * 0.7, d + 1); }; branch(-0.4, -0.4, 0.8, 0.35, 0); return g; }
    case 'mushroom': { add(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 14), std(0xf0e8d8), 0, -0.2, 0); const cap = add(new THREE.SphereGeometry(0.35, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd8c8b0, 0.7)); cap.position.y = 0.05; for (let i = 0; i < 16; i++) add(new THREE.BoxGeometry(0.005, 0.03, 0.3), std(0xb8a890), 0, 0.04, 0).rotation.y = (i / 16) * Math.PI; return g; }
    case 'colony': { const mound = add(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6a4a2a, 0.95)); mound.position.y = -0.4; for (let i = 0; i < 18; i++) { const a = i * 2.1, r = 0.55 + 0.1 * Math.sin(i); add(new THREE.CapsuleGeometry(0.015, 0.05, 3, 6), std(skin), Math.cos(a) * r, -0.38, Math.sin(a) * r).rotation.z = Math.PI / 2; } return g; }
    case 'adult': default: return creature(sp, skin);
  }
}
/** An adult, schematic: its body plan in a few shapes. */
function creature(sp: Species, skin: number): THREE.Object3D {
  const g = new THREE.Group(), m = std(skin, 0.6), add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, mat: THREE.Material = m) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); return o; };
  switch (sp.id) {
    case 'whale': { const b = add(new THREE.SphereGeometry(0.5, 24, 16)); b.scale.set(1, 0.3, 0.32); add(new THREE.BoxGeometry(0.35, 0.02, 0.08), -0.08, -0.1, 0.2).rotation.y = 0.5; add(new THREE.BoxGeometry(0.35, 0.02, 0.08), -0.08, -0.1, -0.2).rotation.y = -0.5; const t = add(new THREE.BoxGeometry(0.06, 0.02, 0.3), -0.52, 0, 0); t.rotation.x = 0.1; return g; }
    case 'pig': { const b = add(new THREE.SphereGeometry(0.4, 20, 14)); b.scale.set(1.2, 0.8, 0.75); add(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 14), 0.52, 0.02, 0).rotation.z = Math.PI / 2; for (const [x, z] of [[0.25, 0.2], [0.25, -0.2], [-0.25, 0.2], [-0.25, -0.2]]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), x!, -0.38, z!); return g; }
    case 'fly': { const b = add(new THREE.CapsuleGeometry(0.12, 0.35, 6, 12), 0, 0, 0); b.rotation.z = Math.PI / 2; add(new THREE.SphereGeometry(0.12, 14, 10), 0.32, 0.02, 0); add(new THREE.SphereGeometry(0.06, 10, 8), 0.38, 0.08, 0.08, std(0xc81e1e)); add(new THREE.SphereGeometry(0.06, 10, 8), 0.38, 0.08, -0.08, std(0xc81e1e)); for (const z of [0.28, -0.28]) add(new THREE.BoxGeometry(0.4, 0.005, 0.22), -0.05, 0.12, z, std(0xd8e8f0, 0.2, { transparent: true, opacity: 0.5 })); return g; }
    case 'ant': { add(new THREE.SphereGeometry(0.12, 12, 10), 0.32, 0, 0); add(new THREE.CapsuleGeometry(0.07, 0.15, 4, 8), 0.08, 0, 0).rotation.z = Math.PI / 2; const a = add(new THREE.SphereGeometry(0.2, 14, 10), -0.25, 0, 0); a.scale.set(1.3, 1, 1); for (let i = 0; i < 6; i++) { const l = add(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 5), 0.05 + (i % 3) * 0.06, -0.12, (i < 3 ? 1 : -1) * 0.15); l.rotation.x = (i < 3 ? 1 : -1) * 0.9; } return g; }
    case 'earthworm': { for (let i = 0; i < 24; i++) add(new THREE.SphereGeometry(0.05, 10, 8), -0.6 + i * 0.05, 0.02 * Math.sin(i * 0.6), 0, i >= 6 && i <= 9 ? std(0xd88a7a, 0.5) : m); return g; }
    case 'tardigrade': { const b = add(new THREE.CapsuleGeometry(0.2, 0.45, 6, 14)); b.rotation.z = Math.PI / 2; for (let i = 0; i < 4; i++) for (const z of [0.16, -0.16]) add(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8), -0.3 + i * 0.2, -0.2, z); add(new THREE.SphereGeometry(0.03, 8, 6), 0.42, 0.06, 0.06, std(0x1a1a1a)); return g; }
    case 'human': default: { add(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12), 0, 0.05, 0); add(new THREE.SphereGeometry(0.09, 14, 10), 0, 0.42, 0); for (const x of [0.06, -0.06]) add(new THREE.CapsuleGeometry(0.04, 0.36, 4, 8), x, -0.38, 0); for (const x of [0.15, -0.15]) add(new THREE.CapsuleGeometry(0.03, 0.32, 4, 8), x, 0.06, 0).rotation.z = x > 0 ? 0.15 : -0.15; return g; }
  }
}
const times = (k: number) => (k >= 1 ? `×${k >= 1000 ? k.toExponential(0).replace('e+', ' × 10^') : k >= 10 ? Math.round(k).toLocaleString('en-US') : k.toFixed(1)}` : `÷${(1 / k) >= 10 ? Math.round(1 / k) : (1 / k).toFixed(1)}`);
const metres = (m: number) => (m >= 1 ? `${+m.toPrecision(3)} m` : m >= 1e-3 ? `${+(m * 1e3).toPrecision(3)} mm` : `${+(m * 1e6).toPrecision(3)} µm`);

/** The stages on stands in an arc in front of you, each at a stated magnification, and a card of how and why. */
export function lifeCycleView(sp: Species, why: string[]): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group(), n = sp.stages.length, show = 0.4; group.name = `life cycle: ${sp.name}`;
  sp.stages.forEach((st, i) => {
    const a = ((i - (n - 1) / 2) / Math.max(1, n - 1)) * Math.PI * 0.75, x = Math.sin(a) * 2.2, z = -Math.cos(a) * 2.2, k = show / st.size;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 24), std(0x0b141c, 0.4, { metalness: 0.6 })); stand.position.set(x, 0.45, z); group.add(stand);
    const mdl = model(st, sp); mdl.scale.setScalar(show); mdl.position.set(x, 1.15, z); mdl.rotation.y = -a + Math.PI / 2; mdl.userData.spin = true; group.add(mdl);
    const l = label(`${i + 1}. ${st.name}\n${st.lasts}\n${metres(st.size)}, shown ${times(k)}\n${st.says}`, 0.62); l.position.set(x, 1.62, z); group.add(l);
    if (i < n - 1) { const b = ((i + 0.5 - (n - 1) / 2) / Math.max(1, n - 1)) * Math.PI * 0.75, ar = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 10), std(0x80deea, 0.3, { emissive: 0x2a6a7a })); ar.position.set(Math.sin(b) * 2.2, 1.0, -Math.cos(b) * 2.2); ar.rotation.z = -Math.PI / 2; ar.rotation.y = -b; group.add(ar); }
  });
  const card = label(`${sp.name} (${sp.latin})\n${sp.system === 'XY' ? 'two sexes' : sp.system}; ${sp.chromosomes}\nfertilised: ${sp.fertilisation.slice(0, 66)}\nyoung: ${sp.young.slice(0, 66)}\n${why.map((w) => w.slice(0, 68)).join('\n')}`, 1.3, 22);
  card.position.set(0, 2.25, -2.6); group.add(card);
  return { group, dispose: () => group.traverse((o) => { const mm = o as THREE.Mesh; mm.geometry?.dispose(); }) };
}

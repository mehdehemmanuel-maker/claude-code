// Living things drawn: every form of src/nexus/life by its own shape, from a molecule's lump to a whole body. Soft
// forms (organs, cells, the skull, the skin) are fields of blended capsules meshed by surface nets
// (src/nexus/anatomy.ts), each meshed once, in its own unit box, and kept: drawing another of it is a copy of the
// kept arrays, scaled. Hard ones (bones, muscles, tubes) are lathes and tubes of three. A system of the body (its
// skeleton, its muscles, its organs) is drawn where each part lies, from the body laid out by anatomy.ts, and merged
// by the view into a few draws.

import * as THREE from 'three';
import { SKULL_REGIONS, bonesOf, currentBody, currentKey, extentOf, skullBox, surfaceNets, type Body, type Placed, type Prim, type V3 } from '../anatomy';
import { INVENTORY } from '../inventory';
import type { Look } from '../pieces';

type Add = (geo: THREE.BufferGeometry, m?: THREE.Material) => THREE.Mesh;
const mats = new Map<string, THREE.Material>();
/** A shared material of a colour (never freed with a piece; the view merges by it). */
export function tint(color: number, o: { clear?: number; glow?: number; rough?: number; both?: boolean } = {}): THREE.Material {
  const key = `${color}|${o.clear ?? 1}|${o.glow ?? 0}|${o.rough ?? 0.6}|${o.both ? 2 : 1}`;
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.6, metalness: 0, transparent: (o.clear ?? 1) < 1, opacity: o.clear ?? 1, depthWrite: (o.clear ?? 1) >= 1, emissive: o.glow ? new THREE.Color(color) : new THREE.Color(0), emissiveIntensity: o.glow ?? 0, side: (o.clear ?? 1) < 1 || o.both ? THREE.DoubleSide : THREE.FrontSide }); (m as THREE.Material & { shared?: boolean }).shared = true; mats.set(key, m); }
  return m;
}
/** The colours of living things. */
export const C = {
  bone: 0xe8dcc4, marrow: 0xb8443c, muscle: 0xa8333a, tendon: 0xe6e1d2, fat: 0xf0cf72, skin: 0xd59a78, heart: 0x9e2a33, lung: 0xe39aa0, liver: 0x6b2820, gut: 0xdc9c8a, colon: 0xc4836f, kidney: 0x86352c, spleen: 0x6a2c3c, gland: 0xc98a6a, bag: 0xd6bfa0, bile: 0x6a8a32,
  brain: 0xe2b4aa, white: 0xf2ebe2, nerve: 0xf0e2a6, eye: 0xf6f4ee, iris: 0x4a6e92, blood: 0x8a0c16, artery: 0xc0202c, vein: 0x3050a8, cell: 0x9ad0ff, nucleus: 0x6a4aa8, mito: 0xe07050, er: 0x7fc4e8, protein: 0x7fc8a0, dna: 0x7c9cff, lipid: 0xf4e08a, sugar: 0xffffff,
  bacterium: 0x93d870, virus: 0xd0607c, fungus: 0xe6d6ae, leaf: 0x4a9a3a, insect: 0x5a4030, shell: 0xe8e0d0, jelly: 0xbfe8ff, neuron: 0xd4c4ff, glia: 0xb8e8c8, tooth: 0xf6f2e6, cartilage: 0xcfe4ea,
};

// ---- fields, meshed once and kept --------------------------------------------------------------------------------------
const kept = new Map<string, { pos: Float32Array; nrm: Float32Array; idx: Uint32Array }>();
/** A field's mesh, kept by its key. */
function netsOf(key: string, prims: () => Prim[], cell: number): { pos: Float32Array; nrm: Float32Array; idx: Uint32Array } {
  let k = kept.get(key);
  if (!k) { const m = surfaceNets(prims(), cell); k = { pos: m.pos, nrm: m.nrm, idx: m.idx }; kept.set(key, k); }
  return k;
}
/** A kept mesh as geometry, scaled per axis (its normals turned to match), then moved by a matrix. */
function geoOf(k: { pos: Float32Array; nrm: Float32Array; idx: Uint32Array }, s: V3 = [1, 1, 1], noise?: (p: V3) => number): THREE.BufferGeometry {
  const pos = new Float32Array(k.pos.length), nrm = new Float32Array(k.nrm.length);
  for (let i = 0; i < k.pos.length; i += 3) {
    let x = k.pos[i]!, y = k.pos[i + 1]!, z = k.pos[i + 2]!;
    if (noise) { const d = noise([x, y, z]); x += k.nrm[i]! * d; y += k.nrm[i + 1]! * d; z += k.nrm[i + 2]! * d; }
    pos[i] = x * s[0]; pos[i + 1] = y * s[1]; pos[i + 2] = z * s[2];
    const nx = k.nrm[i]! / s[0], ny = k.nrm[i + 1]! / s[1], nz = k.nrm[i + 2]! / s[2], l = Math.hypot(nx, ny, nz) || 1;
    nrm[i] = nx / l; nrm[i + 1] = ny / l; nrm[i + 2] = nz / l;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(new THREE.BufferAttribute(k.idx, 1));
  if (noise) g.computeVertexNormals();
  return g;
}
const cap = (a: V3, b: V3, r: number, r2 = r, k = 0.04): Prim => ({ a, b, r, r2, k });
const ball = (c: V3, r: number, k = 0.04): Prim => cap(c, c, r, r, k);
const cut = (p: Prim): Prim => ({ ...p, cut: true });
/** A unit form (about a unit across, length along y) meshed once at about 48 cells across. */
const unit = (key: string, prims: () => Prim[]) => netsOf(`u:${key}`, prims, 1 / 48);
/** Folds on a surface: ridged ripples for a brain's gyri or a cerebellum's folia. */
const folds = (f: number, amp: number, flat = false) => (p: V3) => { const v = Math.sin(f * p[0] + 1.7 * Math.sin(f * 0.6 * p[2])) * Math.sin(f * p[1] * (flat ? 2.2 : 1) + 1.3 * Math.sin(f * 0.7 * p[0])) + 0.5 * Math.sin(f * 1.9 * p[2] + 0.8); return -amp * Math.abs(v) + amp * 0.4; };
const lumps = (f: number, amp: number) => (p: V3) => amp * (Math.sin(f * p[0] + 1.1) * Math.sin(f * p[1] + 2.3) * Math.sin(f * p[2] + 0.4));

// ---- the forms: unit fields ------------------------------------------------------------------------------------------
const FIELDS: Record<string, () => Prim[]> = {
  blob: () => [ball([0, 0, 0], 0.32), ball([0.12, 0.1, 0.05], 0.2), ball([-0.1, -0.08, 0.08], 0.22), ball([0.05, -0.12, -0.1], 0.18)],
  ribosome: () => [ball([0, 0.12, 0], 0.3), ball([0.02, -0.18, 0.04], 0.22, 0.08)],
  egg: () => [cap([0, -0.12, 0], [0, 0.12, 0], 0.36, 0.3, 0.1)],
  almond: () => [cap([0, -0.3, 0], [0, 0.3, 0], 0.18, 0.28, 0.1)],
  bean: () => [cap([0.05, -0.32, 0], [0.05, 0.32, 0], 0.26, 0.26, 0.15), cut(ball([0.36, 0, 0], 0.16, 0.12))],
  heart: () => [ball([-0.12, 0.18, 0], 0.27, 0.12), ball([0.14, 0.15, 0.02], 0.25, 0.12), cap([0, 0.05, 0], [0.06, -0.42, 0.04], 0.3, 0.05, 0.15), cap([-0.02, 0.32, -0.05], [0.04, 0.5, -0.06], 0.1, 0.09, 0.06), cap([-0.14, 0.32, -0.02], [-0.2, 0.5, 0], 0.08, 0.07, 0.05)],
  lung: () => [cap([0, -0.35, 0.02], [0, 0.28, 0], 0.42, 0.18, 0.15), cut(cap([0.42, -0.15, 0.1], [0.42, 0.1, 0.1], 0.18, 0.12, 0.1))],
  liver: () => [cap([-0.32, 0.05, 0], [0.32, 0.12, 0], 0.32, 0.12, 0.2), ball([-0.2, -0.02, 0.05], 0.34, 0.2)],
  stomach: () => [cap([-0.15, 0.4, 0], [-0.2, 0.05, 0.02], 0.12, 0.26, 0.12), cap([-0.2, 0.05, 0.02], [0.18, -0.3, 0], 0.26, 0.12, 0.12), cap([-0.08, 0.5, 0], [-0.04, 0.62, 0], 0.07, 0.06, 0.05)],
  bag: () => [cap([0, -0.18, 0], [0, 0.25, 0], 0.4, 0.16, 0.15)],
  spleen: () => [cap([-0.1, -0.35, 0], [-0.1, 0.35, 0], 0.22, 0.22, 0.2), cut(cap([0.3, -0.3, 0], [0.3, 0.3, 0], 0.22, 0.22, 0.1))],
  gland: () => [ball([-0.22, 0, 0], 0.26, 0.12), ball([0.22, 0, 0], 0.26, 0.12), cap([-0.2, -0.05, 0.1], [0.2, -0.05, 0.1], 0.1, 0.1, 0.1)],
  node: () => [cap([0, -0.2, 0], [0, 0.2, 0], 0.32, 0.3, 0.1), cut(ball([0.42, 0, 0], 0.14, 0.08))],
  tongue: () => [cap([0, -0.42, 0], [0, 0.3, 0], 0.32, 0.26, 0.12)],
  larynx: () => [cap([0, -0.45, 0], [0, 0.4, 0], 0.26, 0.3, 0.1), cap([-0.2, 0.25, 0.25], [0.2, 0.25, 0.25], 0.12, 0.12, 0.12), cut(cap([0, -0.6, 0], [0, 0.6, 0], 0.14, 0.14, 0.02))],
  brain: () => [cap([-0.17, -0.18, 0.05], [-0.17, 0.25, 0.08], 0.32, 0.3, 0.18), cap([0.17, -0.18, 0.05], [0.17, 0.25, 0.08], 0.32, 0.3, 0.18), ball([0, -0.25, -0.22], 0.2, 0.12), cap([0, -0.1, -0.15], [0, -0.1, -0.5], 0.1, 0.07, 0.08)],
  cerebrum: () => [cap([-0.2, -0.25, 0], [-0.2, 0.3, 0.02], 0.34, 0.3, 0.2), cap([0.2, -0.25, 0], [0.2, 0.3, 0.02], 0.34, 0.3, 0.2)],
  cerebellum: () => [cap([-0.25, 0, 0], [0.25, 0, 0], 0.3, 0.3, 0.2), ball([0, -0.05, 0.1], 0.18, 0.15)],
  lobe: () => [cap([0, -0.3, 0], [0, 0.3, 0.05], 0.36, 0.3, 0.2)],
  cortex: () => [cap([-0.4, 0, 0], [0.4, 0, 0], 0.18, 0.18, 0.2), cap([0, -0.3, 0], [0, 0.3, 0], 0.18, 0.18, 0.2)],
  stem: () => [cap([0, -0.45, 0], [0, 0.3, 0.05], 0.14, 0.24, 0.12), ball([0, 0.1, 0.12], 0.18, 0.12)],
  comma: () => [cap([0, 0.35, 0.1], [0, 0.05, 0], 0.26, 0.2, 0.15), cap([0, 0.05, 0], [0, -0.2, -0.25], 0.2, 0.08, 0.15)],
  seahorse: () => [cap([0, 0.38, 0.1], [0, 0.05, 0], 0.22, 0.2, 0.15), cap([0, 0.05, 0], [0.05, -0.3, -0.15], 0.2, 0.1, 0.15)],
  arch: () => [cap([0, -0.4, -0.1], [0, -0.1, 0.12], 0.12, 0.14, 0.15), cap([0, -0.1, 0.12], [0, 0.3, 0.1], 0.14, 0.14, 0.15), cap([0, 0.3, 0.1], [0, 0.42, -0.08], 0.14, 0.12, 0.15)],
  bulb: () => [cap([0, -0.35, 0], [0, 0.25, 0], 0.16, 0.3, 0.1)],
  islet: () => Array.from({ length: 9 }, (_, i) => ball([0.22 * Math.cos(i * 2.4), 0.22 * Math.sin(i * 1.7), 0.2 * Math.sin(i * 3.1)], 0.2, 0.08)),
  fat: () => Array.from({ length: 11 }, (_, i) => ball([0.28 * Math.cos(i * 2.4), 0.25 * Math.sin(i * 1.3), 0.15 * Math.sin(i * 3.7)], 0.22, 0.06)),
  shell: () => [cap([-0.1, -0.3, 0], [0.1, 0.3, 0], 0.32, 0.22, 0.2), cut(cap([-0.1, -0.3, 0.3], [0.1, 0.3, 0.3], 0.3, 0.2, 0.1))],
  mushroom: () => [cap([0, -0.45, 0], [0, 0.1, 0], 0.12, 0.1, 0.06), cap([0, 0.15, 0], [0, 0.2, 0], 0.42, 0.3, 0.12), cut(ball([0, -0.1, 0], 0.38, 0.1))],
  cocoon: () => [cap([0, -0.3, 0], [0, 0.3, 0], 0.32, 0.32, 0.1)],
  boll: () => [ball([0.14, 0.1, 0], 0.26, 0.15), ball([-0.14, 0.1, 0], 0.26, 0.15), ball([0, -0.12, 0.08], 0.26, 0.15), ball([0, 0, -0.14], 0.26, 0.15)],
  skull: () => [
    cap([0, 0.05, -0.08], [0, 0.12, 0.06], 0.42, 0.38, 0.12), // the cranium
    cap([0, -0.22, 0.18], [0, -0.32, 0.28], 0.2, 0.17, 0.12), cap([-0.24, -0.12, 0.22], [-0.3, -0.12, 0.05], 0.09, 0.08, 0.1), cap([0.24, -0.12, 0.22], [0.3, -0.12, 0.05], 0.09, 0.08, 0.1), // maxilla, cheekbones
    cut(ball([-0.15, -0.1, 0.38], 0.12, 0.05)), cut(ball([0.15, -0.1, 0.38], 0.12, 0.05)), cut(cap([0, -0.18, 0.46], [0, -0.28, 0.44], 0.05, 0.06, 0.04)), // orbits and the nose's hole
  ],
  jaw: () => [cap([-0.3, 0.1, -0.25], [-0.32, -0.25, 0], 0.07, 0.08, 0.06), cap([0.3, 0.1, -0.25], [0.32, -0.25, 0], 0.07, 0.08, 0.06), cap([-0.32, -0.25, 0], [0, -0.32, 0.35], 0.08, 0.1, 0.08), cap([0.32, -0.25, 0], [0, -0.32, 0.35], 0.08, 0.1, 0.08)],
  vertebra: () => [cap([0, -0.25, 0.15], [0, 0.25, 0.15], 0.3, 0.3, 0.03), cap([-0.22, 0, -0.15], [0.22, 0, -0.15], 0.07, 0.07, 0.06), cap([-0.15, 0, 0.05], [-0.18, 0, -0.18], 0.07, 0.07, 0.05), cap([0.15, 0, 0.05], [0.18, 0, -0.18], 0.07, 0.07, 0.05), cap([0, 0, -0.18], [0, -0.15, -0.48], 0.07, 0.05, 0.06), cap([-0.2, 0, -0.1], [-0.48, 0.02, -0.15], 0.06, 0.05, 0.05), cap([0.2, 0, -0.1], [0.48, 0.02, -0.15], 0.06, 0.05, 0.05), cut(cap([0, -0.4, -0.07], [0, 0.4, -0.07], 0.11, 0.11, 0.03))],
  shortbone: () => [ball([0, 0, 0], 0.36, 0.1), ball([0.12, 0.12, 0.05], 0.26, 0.12), ball([-0.1, -0.12, -0.05], 0.26, 0.12)],
  tooth: () => [cap([0, 0.08, 0], [0, 0.3, 0], 0.32, 0.3, 0.12), cap([-0.12, 0.05, 0], [-0.1, -0.45, 0], 0.14, 0.04, 0.08), cap([0.12, 0.05, 0], [0.1, -0.45, 0], 0.14, 0.04, 0.08)],
  cell: () => [ball([0, 0, 0], 0.48, 0.02)],
  column: () => [cap([0, -0.32, 0], [0, 0.32, 0], 0.18, 0.18, 0.05)],
  flake: () => [cap([-0.3, 0, 0], [0.3, 0, 0], 0.18, 0.18, 0.2), cap([0, 0, -0.3], [0, 0, 0.3], 0.18, 0.18, 0.2)],
  disc: () => [ball([0, 0, 0], 0.46, 0.02), cut(ball([0, 0, 0.62], 0.36, 0.25)), cut(ball([0, 0, -0.62], 0.36, 0.25))],
  nucleus: () => [ball([0, 0, 0], 0.46, 0.02)],
  mito: () => [cap([0, -0.32, 0], [0, 0.32, 0], 0.17, 0.17, 0.02)],
  chromosome: () => [cap([0, 0, 0], [-0.18, 0.42, 0], 0.09, 0.08, 0.05), cap([0, 0, 0], [0.18, 0.42, 0], 0.09, 0.08, 0.05), cap([0, 0, 0], [-0.18, -0.42, 0], 0.09, 0.08, 0.05), cap([0, 0, 0], [0.18, -0.42, 0], 0.09, 0.08, 0.05)],
  bouton: () => [ball([0, 0.1, 0], 0.35, 0.1), cap([0, 0.1, 0], [0, 0.5, 0], 0.08, 0.06, 0.1)],
  spine: () => [ball([0, 0.22, 0], 0.26, 0.06), cap([0, 0.15, 0], [0, -0.45, 0], 0.08, 0.12, 0.08)],
  synapse: () => [ball([0, 0.22, 0], 0.26, 0.08), cap([0, 0.22, 0], [0, 0.48, 0], 0.07, 0.05, 0.08), ball([0, -0.16, 0], 0.18, 0.06), cap([0, -0.16, 0], [0, -0.48, 0], 0.07, 0.1, 0.08)],
  bacterium: () => [cap([0, -0.3, 0], [0, 0.3, 0], 0.2, 0.2, 0.02)],
  coccus: () => [ball([0, 0, 0], 0.44, 0.02)],
  diatom: () => [cap([0, -0.15, 0], [0, 0.15, 0], 0.45, 0.45, 0.05), cut(cap([0, -0.6, 0], [0, -0.32, 0], 0.5, 0.5, 0.02))],
  osteocyte: () => [cap([-0.18, 0, 0], [0.18, 0, 0], 0.16, 0.16, 0.1)],
  jelly: () => [ball([0, 0.1, 0], 0.45, 0.05), cut(ball([0, -0.25, 0], 0.4, 0.1))],
  insect: () => [ball([0, 0.35, 0], 0.11, 0.05), ball([0, 0.15, 0], 0.13, 0.06), cap([0, 0.02, 0], [0, -0.4, 0], 0.16, 0.12, 0.08)],
  spider: () => [ball([0, 0.15, 0], 0.13, 0.06), ball([0, -0.12, 0], 0.2, 0.06)],
  crab: () => [cap([0, -0.05, 0], [0, 0.2, 0], 0.4, 0.3, 0.1), cut(cap([0, -0.05, -0.3], [0, 0.2, -0.3], 0.4, 0.3, 0.1)), cap([0, -0.2, 0], [0, -0.48, 0], 0.05, 0.02, 0.04)],
  lizard: () => [ball([0, 0.38, 0], 0.08, 0.04), cap([0, 0.32, 0], [0, -0.08, 0], 0.06, 0.09, 0.06), cap([0, -0.08, 0], [0.05, -0.5, 0], 0.07, 0.01, 0.05)],
  fish: () => [cap([0, 0.38, 0], [0, -0.25, 0], 0.08, 0.13, 0.12), cap([0, -0.25, 0], [0, -0.45, 0], 0.05, 0.12, 0.05)],
  squid: () => [cap([0, 0.45, 0], [0, -0.05, 0], 0.03, 0.16, 0.1), ball([0, -0.12, 0], 0.12, 0.06), ...Array.from({ length: 6 }, (_, i) => cap([0, -0.15, 0], [0.07 * Math.cos(i), -0.48, 0.07 * Math.sin(i)], 0.025, 0.01, 0.02))],
  shrimp: () => [cap([0, 0.35, 0], [0, -0.1, 0.05], 0.09, 0.12, 0.08), cap([0, -0.1, 0.05], [0, -0.45, -0.05], 0.1, 0.04, 0.08), ball([0, 0.38, 0.06], 0.08, 0.05)],
  worm: () => [cap([0, -0.48, 0], [0, 0.48, 0], 0.05, 0.05, 0.02)],
  caterpillar: () => Array.from({ length: 11 }, (_, i) => ball([0, -0.42 + i * 0.084, 0], 0.11, 0.04)),
  mouse: () => [ball([0, 0.32, 0], 0.13, 0.08), cap([0, 0.2, 0], [0, -0.2, 0], 0.22, 0.26, 0.15), ball([-0.07, 0.42, -0.06], 0.06, 0.03), ball([0.07, 0.42, -0.06], 0.06, 0.03)],
  bear: () => [cap([0, -0.3, 0], [0, 0.3, 0], 0.28, 0.24, 0.08), ...Array.from({ length: 8 }, (_, i) => cap([(i % 2 ? 1 : -1) * 0.2, -0.26 + Math.floor(i / 2) * 0.17, 0.12], [(i % 2 ? 1 : -1) * 0.34, -0.26 + Math.floor(i / 2) * 0.17, 0.26], 0.06, 0.05, 0.05))],
  chamber: () => [cap([0, -0.3, 0], [0, 0.18, 0], 0.2, 0.4, 0.2), ball([0, 0.22, 0], 0.32, 0.15)],
  eye: () => [ball([0, 0, 0], 0.46, 0.02), ball([0, 0, 0.3], 0.26, 0.15)],
  lens: () => [ball([0, 0, 0], 0.48, 0.02), cut(ball([0, 0, 0.75], 0.5, 0.1)), cut(ball([0, 0, -0.75], 0.5, 0.1))],
  sponge: () => [cap([0, -0.45, 0], [0, 0.4, 0], 0.16, 0.24, 0.06), cut(cap([0, -0.5, 0], [0, 0.5, 0], 0.1, 0.18, 0.03))],
  phage: () => [ball([0, 0.3, 0], 0.18, 0.02), cap([0, 0.12, 0], [0, -0.3, 0], 0.045, 0.045, 0.01)],
  virus: () => [ball([0, 0, 0], 0.38, 0.02)],
};
/** What colour each form is, and how see-through. */
const LOOK: Record<string, { c: number; clear?: number; glow?: number; rough?: number }> = {
  blob: { c: C.protein }, ribosome: { c: 0x9a7cd8 }, egg: { c: C.brain }, almond: { c: C.brain }, bean: { c: C.kidney }, kidney: { c: C.kidney }, heart: { c: C.heart }, lung: { c: C.lung }, liver: { c: C.liver }, stomach: { c: C.gut }, bag: { c: C.bag },
  spleen: { c: C.spleen }, gland: { c: C.gland }, node: { c: 0xd8b0a0 }, tongue: { c: 0xd06a6a }, larynx: { c: C.cartilage }, brain: { c: C.brain }, cerebrum: { c: C.brain }, cerebellum: { c: 0xd8a49c }, lobe: { c: C.brain }, cortex: { c: C.brain },
  stem: { c: 0xead2b8 }, comma: { c: 0xd8b8b0 }, seahorse: { c: 0xd8b0a8 }, arch: { c: C.white }, bulb: { c: 0xe0c0b0 }, islet: { c: 0xe8c890 }, fat: { c: C.fat }, shell: { c: C.shell, rough: 0.3 }, mushroom: { c: C.fungus }, cocoon: { c: 0xf8f4e8 }, boll: { c: 0xffffff },
  skull: { c: C.bone, rough: 0.7 }, jaw: { c: C.bone, rough: 0.7 }, vertebra: { c: C.bone, rough: 0.7 }, shortbone: { c: C.bone, rough: 0.7 }, sesamoidbone: { c: C.bone, rough: 0.7 }, irregularbone: { c: C.bone, rough: 0.7 }, jawbone: { c: C.bone, rough: 0.7 }, tooth: { c: C.tooth, rough: 0.25 },
  cell: { c: C.cell, clear: 0.35 }, column: { c: 0xf0b4a0, clear: 0.6 }, flake: { c: 0xf0d8c8 }, disc: { c: 0xc4202c, rough: 0.45 }, nucleus: { c: C.nucleus, clear: 0.7 }, mito: { c: C.mito }, chromosome: { c: C.dna, glow: 0.15 }, bouton: { c: C.neuron, clear: 0.7 }, spine: { c: C.neuron }, synapse: { c: C.neuron, clear: 0.8 },
  bacterium: { c: C.bacterium }, coccus: { c: C.bacterium }, diatom: { c: 0xd8e8c0, clear: 0.7, rough: 0.2 }, osteocyte: { c: 0xd8c8a8 }, jelly: { c: C.jelly, clear: 0.45, glow: 0.2 }, insect: { c: C.insect }, spider: { c: 0xc8a030 }, crab: { c: 0x7a5a3a }, lizard: { c: 0x8aa868 },
  fish: { c: 0x506070 }, squid: { c: 0xd8a088, clear: 0.85 }, shrimp: { c: 0x30a070 }, worm: { c: 0xe8dcc8, clear: 0.8 }, caterpillar: { c: 0xf0ece0 }, mouse: { c: 0x9a8c80 }, bear: { c: 0xd8c4a0, clear: 0.85 }, chamber: { c: C.heart }, eye: { c: C.eye, rough: 0.2 }, lens: { c: 0xe8f4ff, clear: 0.5, rough: 0.1 },
  sponge: { c: 0xe8f0f4, clear: 0.7, rough: 0.2 }, phage: { c: 0xb8c8d8 }, virus: { c: C.virus }, muscle: { c: C.muscle }, tendon: { c: C.tendon, rough: 0.35 }, longbone: { c: C.bone, rough: 0.7 }, flatbone: { c: C.bone, rough: 0.7 }, rib: { c: C.bone, rough: 0.7 },
  tube: { c: 0xd8a090 }, intestine: { c: C.gut }, colon: { c: C.colon }, cord: { c: C.nerve }, nerve: { c: C.nerve }, rod: { c: C.protein }, helix: { c: C.dna, glow: 0.15 }, membrane: { c: C.lipid }, ring: { c: 0x9ab0c8 }, sheet: { c: C.skin }, swatch: { c: 0xe0a090 },
  fibre: { c: C.muscle }, spindle: { c: 0xd06058 }, star: { c: C.glia }, neuron: { c: C.neuron, glow: 0.12 }, sperm: { c: 0xe8e8f4 }, sphere: { c: C.fat, clear: 0.9 }, motor: { c: 0x9ab0c8 }, sarcomere: { c: C.muscle }, axon: { c: C.neuron }, nephron: { c: C.kidney },
  hair: { c: 0x3a2a1e }, cochlea: { c: C.bone }, leaf: { c: C.leaf }, spirillum: { c: C.bacterium }, mycelium: { c: C.fungus }, ball: { c: C.protein }, valve: { c: C.tendon }, gut: { c: C.gut }, vessels: { c: C.artery }, blood: { c: C.blood }, skin: { c: C.skin },
};
export const FORMS = new Set([...Object.keys(FIELDS), ...Object.keys(LOOK)]);

// ---- hard forms: lathes and tubes -----------------------------------------------------------------------------------
/** A long bone along y: shaft between two knobbly ends; a femur or humerus with its head set off on a neck. */
function longBone(L: number, W: number, id: string): THREE.BufferGeometry[] {
  const prof = [[0, -0.5], [0.3, -0.497], [0.46, -0.47], [0.5, -0.43], [0.42, -0.36], [0.28, -0.28], [0.23, -0.15], [0.21, 0], [0.23, 0.15], [0.28, 0.3], [0.42, 0.4], [0.47, 0.45], [0.36, 0.49], [0, 0.5]].map(([r, y]) => new THREE.Vector2(r! * W, y! * L));
  const out: THREE.BufferGeometry[] = [new THREE.LatheGeometry(prof, 14)];
  if (id === 'femur' || id === 'humerus') { const head = new THREE.SphereGeometry(W * 0.5, 14, 10); head.translate(W * 0.55, L * 0.47, 0); const neck = new THREE.CylinderGeometry(W * 0.22, W * 0.3, W * 0.7, 10); neck.rotateZ(Math.PI / 2.6); neck.translate(W * 0.3, L * 0.44, 0); out.push(head, neck); }
  return out;
}
/** A muscle along y: a belly tapering to a tendon each end. */
function muscleGeo(L: number, W: number, D: number): THREE.BufferGeometry {
  const prof = [[0, -0.5], [0.05, -0.49], [0.07, -0.42], [0.2, -0.33], [0.42, -0.18], [0.5, 0], [0.44, 0.16], [0.24, 0.32], [0.07, 0.42], [0.05, 0.49], [0, 0.5]].map(([r, y]) => new THREE.Vector2(r! * W, y! * L));
  const g = new THREE.LatheGeometry(prof, 12); g.scale(1, 1, D / W); return g;
}
/** A tube along points. */
const tubeAlong = (pts: V3[], r: number, seg = 48, radial = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, radial, false);
/** A curved plate: an ellipsoid flattened, bowed by its curvature. */
function plate(L: number, W: number, D: number, bow = 0.25): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.5, 20, 14); g.scale(W, L, Math.max(D, Math.min(L, W) * 0.06));
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / W, y = p.getY(i) / L; p.setZ(i, p.getZ(i) - bow * (x * x + y * y) * Math.min(L, W)); }
  g.computeVertexNormals(); return g;
}
/** A geometry turned so its y runs from a to b, set at their middle. */
function along(g: THREE.BufferGeometry, a: V3, b: V3, face?: V3): THREE.BufferGeometry {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), mid = A.clone().add(B).multiplyScalar(0.5);
  const q = new THREE.Quaternion(); if (d.lengthSq() > 1e-12) q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  if (face) { const f = new THREE.Vector3(...face).applyQuaternion(q.clone().invert()); f.y = 0; if (f.lengthSq() > 1e-9) { const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normalize()); q.multiply(q2); } }
  g.applyQuaternion(q); g.translate(mid.x, mid.y, mid.z); return g;
}

// ---- one bone, one muscle, one organ, by its placing ---------------------------------------------------------------
/** A bone as it lies in a body (or, with no body, upright at the origin). */
function boneGeos(b: Placed, look: string): THREE.BufferGeometry[] {
  const L = Math.max(b.size[0], 1) / 1000, W = Math.max(b.size[1], 1) / 1000, D = Math.max(b.size[2], 1) / 1000;
  if (b.path) return [tubeAlong(b.path, D * 0.5 + W * 0.15, 24, 6)];
  let gs: THREE.BufferGeometry[];
  if (look === 'longbone') gs = longBone(Math.max(L, Math.hypot(...sub3(b.b, b.a))), W, b.id);
  else if (look === 'vertebra') { const g = geoOf(unit('vertebra', FIELDS.vertebra!), [L, D * 1.6, L * 0.9]); gs = [g]; }
  else if (b.id === 'hip-bone') { const wing = plate(L * 0.62, W, Math.min(D, 0.012), 0.3); wing.translate(0, L * 0.2, 0); const ring = new THREE.TorusGeometry(W * 0.22, Math.min(D, 0.024) * 0.5, 8, 20); ring.translate(0, -L * 0.28, 0.01); const cup = new THREE.SphereGeometry(W * 0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); cup.rotateX(Math.PI / 2); cup.translate(0, -L * 0.05, 0.02); gs = [wing, ring, cup]; }
  else if (look === 'flatbone') gs = [plate(L, W, Math.min(D, Math.min(L, W) * 0.12), b.id === 'parietal-bone' || b.id === 'frontal-bone' || b.id === 'occipital-bone' ? 0.35 : 0.15)];
  else if (look === 'jawbone') gs = [geoOf(unit('jaw', FIELDS.jaw!), [W, L * 0.6, L])];
  else gs = [geoOf(unit('shortbone', FIELDS.shortbone!), [W, L, D])];
  if (look === 'vertebra') return gs.map((g) => { const A = new THREE.Vector3(...b.a), mid = A; g.translate(mid.x, mid.y, mid.z); return g; });
  return gs.map((g) => along(g, b.a, dist3(b.a, b.b) > 1e-6 ? b.b : add3(b.a, [0, L, 0]), b.face));
}
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], dist3 = (a: V3, b: V3) => Math.hypot(...sub3(a, b));
/** Each bone's form, from its entry's look. */
const boneLook = (id: string) => (INVENTORY.get(id)?.look ?? 'shortbone').split(' ')[0]!;
/** An organ's form in a body: its field, scaled to its box and turned along its axis. */
function organGeo(o: Placed, form: string): THREE.BufferGeometry {
  const [L, W, D] = o.size.map((x) => x / 1000) as V3;
  if (form === 'intestine') return coil(o.a, [W, L, D]);
  if (form === 'colon') return frame(o.a, [L, W, D]);
  if (form === 'tube' || form === 'cord') return along(new THREE.CylinderGeometry(W / 2, W / 2, L, 10), o.a, o.b);
  const f = FIELDS[form] ?? FIELDS.blob!, noise = form === 'brain' || form === 'cerebrum' || form === 'lobe' ? folds(28, 0.012) : form === 'cerebellum' ? folds(60, 0.006, true) : undefined;
  return along(geoOf(unit(form, f), [W, L, D], noise), o.a, o.b);
}
/** The small intestine: a tube coiled in its box. */
function coil(c: V3, box: V3): THREE.BufferGeometry {
  const pts: V3[] = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * Math.PI * 14; pts.push([c[0] + box[0] * 0.4 * Math.sin(a) * (0.6 + 0.4 * Math.sin(t * 9)), c[1] + box[1] * (0.4 - 0.8 * t), c[2] + box[2] * 0.4 * Math.cos(a * 0.9)]); }
  return tubeAlong(pts, Math.min(...box) * 0.12, 320, 8);
}
/** The colon: a frame round the belly, up the right, across, down the left. */
function frame(c: V3, box: V3): THREE.BufferGeometry {
  const [w, h, d] = box, pts: V3[] = [[c[0] - w * 0.42, c[1] - h * 0.42, c[2]], [c[0] - w * 0.45, c[1] + h * 0.35, c[2]], [c[0] - w * 0.2, c[1] + h * 0.45, c[2] + d * 0.3], [c[0] + w * 0.2, c[1] + h * 0.45, c[2] + d * 0.3], [c[0] + w * 0.45, c[1] + h * 0.35, c[2]], [c[0] + w * 0.42, c[1] - h * 0.42, c[2]], [c[0] + w * 0.1, c[1] - h * 0.55, c[2] - d * 0.2], [c[0], c[1] - h * 0.7, c[2] - d * 0.4]];
  return tubeAlong(pts, Math.min(w, h) * 0.09, 120, 10);
}
const ORGAN_FORM: Record<string, string> = { uterus: 'bag', ovary: 'egg', brain: 'brain', heart: 'heart', 'right-lung': 'lung', 'left-lung': 'lung', trachea: 'tube', larynx: 'larynx', liver: 'liver', stomach: 'stomach', gallbladder: 'bag', pancreas: 'almond', spleen: 'spleen', 'small-intestine': 'intestine', colon: 'colon', kidney: 'bean', bladder: 'bag', prostate: 'egg', thyroid: 'gland', thymus: 'gland', adrenal: 'almond', oesophagus: 'tube', 'spinal-cord': 'cord', eye: 'eye', tongue: 'tongue', testis: 'egg', pituitary: 'egg', pineal: 'egg' };
const ORGAN_COLOR: Record<string, number> = { uterus: 0xd88a8a, ovary: 0xe8c0b0, brain: C.brain, heart: C.heart, 'right-lung': C.lung, 'left-lung': C.lung, trachea: C.cartilage, larynx: C.cartilage, liver: C.liver, stomach: C.gut, gallbladder: C.bile, pancreas: 0xe2c08c, spleen: C.spleen, 'small-intestine': C.gut, colon: C.colon, kidney: C.kidney, bladder: C.bag, prostate: C.gland, thyroid: 0xb8604c, thymus: 0xd8b0a0, adrenal: 0xe0a040, oesophagus: 0xd89080, 'spinal-cord': C.nerve, eye: C.eye, tongue: 0xd06a6a, testis: 0xd8c0b0, pituitary: C.gland, pineal: C.gland };

// ---- a body's systems -----------------------------------------------------------------------------------------------
const bodyNow = currentBody;
const skinKept = new Map<string, { pos: Float32Array; nrm: Float32Array; idx: Uint32Array }[]>();
/** The skin of a body: its trunk and limbs at 1 cm, its head and face at 4 mm, meshed once a body. */
export function skinGeos(body: Body, key = currentKey()): THREE.BufferGeometry[] {
  if (skinKept.size > 8) skinKept.clear();
  let k = skinKept.get(key);
  if (!k) {
    const head = body.joints.headC!, near = (p: Prim) => dist3(p.a, head) < 0.16 * body.H / 1.76 && dist3(p.b, head) < 0.18 * body.H / 1.76;
    const trunk = body.skin.filter((p) => !near(p)), headPrims = [...body.skin.filter(near), ...body.face];
    const hs = body.H / 1.76;
    k = [surfaceNets(trunk, 0.011 * hs), surfaceNets(headPrims, 0.0042 * hs)].map((m) => ({ pos: m.pos, nrm: m.nrm, idx: m.idx }));
    skinKept.set(key, k);
  }
  return k.map((m) => geoOf(m));
}
const hairKept = new Map<string, { pos: Float32Array; nrm: Float32Array; idx: Uint32Array } | null>();
/** The hair on a body's scalp, meshed once a body at 6 mm (it is a shell over the cranium's field, cut at its hairline). */
export function hairGeo(body: Body, key = currentKey()): THREE.BufferGeometry | null {
  if (hairKept.size > 8) hairKept.clear();
  if (!hairKept.has(key)) { const m = body.hair.length ? surfaceNets(body.hair, 0.006 * body.H / 1.76) : null; hairKept.set(key, m && m.idx.length ? { pos: m.pos, nrm: m.nrm, idx: m.idx } : null); }
  const k = hairKept.get(key); return k ? geoOf(k) : null;
}
/** Colours from melanin: hair by its eumelanin (blond to black) and pheomelanin (red), skin by its melanin, the iris from
 *  blue (little melanin, scattered light) to brown. */
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (c: [number, number, number]) => (Math.round(Math.max(0, Math.min(1, c[0])) * 255) << 16) | (Math.round(Math.max(0, Math.min(1, c[1])) * 255) << 8) | Math.round(Math.max(0, Math.min(1, c[2])) * 255);
export const hairColor = (dark: number, red: number): number => hex(mix(mix([0.82, 0.68, 0.44], [0.07, 0.055, 0.045], Math.pow(dark, 0.8)), [0.58, 0.22, 0.08], red * (1 - 0.75 * dark)));
export const skinColor = (dark: number): number => hex(mix([0.96, 0.82, 0.72], [0.32, 0.21, 0.15], dark));
export const irisColor = (dark: number): number => hex(dark < 0.5 ? mix([0.36, 0.55, 0.74], [0.42, 0.5, 0.3], dark * 2) : mix([0.42, 0.5, 0.3], [0.3, 0.18, 0.1], dark * 2 - 1));
/** The skin, hair, brows and eyes of a body, in its own colours. */
function surfaceOf(body: Body, add: Add, o: { clear?: number } = {}): void {
  const P = body.params, hs = body.H / 1.76, hc = hairColor(P.hairDark, P.hairRed);
  for (const g of skinGeos(body)) add(g, tint(skinColor(P.skinDark), o.clear ? { clear: o.clear } : { rough: 0.55 }));
  if (o.clear) return;
  const hg = hairGeo(body); if (hg) add(hg, tint(hc, { rough: 0.9 }));
  for (const b of body.brows) add(tubeAlong(b, 0.0026 * hs * (P.sex >= 0.5 ? 0.8 : 1), 12, 5), tint(hex(mix([((hc >> 16) & 255) / 255, ((hc >> 8) & 255) / 255, (hc & 255) / 255], [0.05, 0.04, 0.03], 0.3)), { rough: 0.9 }));
  for (const og of body.organs) if (og.id === 'eye') { const e = new THREE.SphereGeometry(0.0115 * body.H / 1.76, 16, 12); e.translate(og.a[0], og.a[1], og.a[2] - 0.004); add(e, tint(C.eye, { rough: 0.15 })); const ir = new THREE.CircleGeometry(0.0055 * body.H / 1.76, 18); ir.translate(og.a[0], og.a[1], og.a[2] + 0.0076); add(ir, tint(irisColor(P.eyeDark), { rough: 0.2 })); const pu = new THREE.CircleGeometry(0.0022 * body.H / 1.76, 14); pu.translate(og.a[0], og.a[1], og.a[2] + 0.0077); add(pu, tint(0x0a0806, { rough: 0.1 })); }
}
/** A system of the body drawn where its parts lie, in body metres (feet at y = 0). */
function systemInto(id: string, body: Body, add: Add): boolean {
  const ghost = () => surfaceOf(body, add, { clear: 0.12 });
  const organs = (ids: string[], wire = true) => { for (const o of body.organs) if (ids.includes(o.id)) add(organGeo(o, ORGAN_FORM[o.id] ?? 'blob'), tint(ORGAN_COLOR[o.id] ?? C.gland)); if (wire) ghost(); };
  const limbsTube = (color: number, r: number, off: V3 = [0, 0, 0]) => { const J = body.joints, o = (v: V3) => add3(v, off); for (const s of ['L', 'R']) { add(tubeAlong([o(J.c7!), o(J[`shoulder${s}`]!), o(J[`elbow${s}`]!), o(J[`wrist${s}`]!), o(J[`fingertip${s}`]!)], r, 40, 6), tint(color)); add(tubeAlong([o([0, J[`hip${s}`]![1] + 0.08, -0.01]), o(J[`hip${s}`]!), o(J[`knee${s}`]!), o(J[`ankle${s}`]!), o(J[`toe${s}`]!)], r * 1.3, 40, 6), tint(color)); } };
  switch (id) {
    case 'human': case 'skin': { surfaceOf(body, add); return true; }
    case 'adipose': { for (const g of skinGeos(body)) add(g, tint(C.fat, { clear: 0.55 })); return true; }
    case 'skeleton': case 'skull': case 'cranium': case 'face-bones': case 'spine': case 'ribcage': case 'arm-bones': case 'hand-bones': case 'leg-bones': case 'foot-bones': case 'ossicles': {
      const bs = bonesOf(body, id), skullHere = ['skeleton', 'skull'].includes(id);
      for (const b of bs) { if (SKULL_REGIONS[b.id]) continue; for (const g of boneGeos(b, boneLook(b.id))) add(g, tint(C.bone, { rough: 0.7 })); }
      if (skullHere || id === 'cranium' || id === 'face-bones') { const { c, s: sk } = skullBox(body); const g = skullOf((bone) => skullHere || (id === 'face-bones') === FACE.has(bone), sk); g.translate(c[0], c[1], c[2]); add(g, tint(C.bone, { rough: 0.7, both: !skullHere })); }
      return true;
    }
    case 'muscles': { for (const m of body.muscles) { const L = dist3(m.a, m.b), W = m.size[1] / 1000, D = m.size[2] / 1000; add(along(muscleGeo(L, W, D), m.a, m.b), tint(C.muscle)); } ghost(); return true; }
    case 'connective-tissue': { const J = body.joints; for (const s of ['L', 'R']) { add(tubeAlong([J[`knee${s}`]!, J[`ankle${s}`]!, J[`heel${s}`]!].map((v, i) => add3(v, [0, 0, i === 1 ? -0.035 : -0.02])) as V3[], 0.006, 16, 6), tint(C.tendon)); add(tubeAlong([add3(J[`hip${s}`]!, [s === 'L' ? 0.06 : -0.06, 0.06, 0]), add3(J[`knee${s}`]!, [s === 'L' ? 0.05 : -0.05, 0, 0])], 0.01, 12, 6), tint(C.tendon)); add(tubeAlong([add3(J[`knee${s}`]!, [0, 0.04, 0.045]), add3(J[`knee${s}`]!, [0, -0.04, 0.04])], 0.012, 8, 6), tint(C.tendon)); } ghost(); return true; }
    case 'circulatory-system': { organs(['heart'], false); const J = body.joints; add(tubeAlong([add3(body.organs.find((o) => o.id === 'heart')!.a, [0, 0.05, 0]), [0.01, J.sternumTop![1] - 0.02, 0.02], [0.01, J.xiphoid![1], -0.03], [0, J[`hipL`]![1] + 0.05, -0.02]], 0.012, 32, 8), tint(C.artery)); limbsTube(C.artery, 0.0045, [0.006, 0, 0.012]); limbsTube(C.vein, 0.005, [-0.006, 0, -0.008]); ghost(); return true; }
    case 'respiratory-system': organs(['right-lung', 'left-lung', 'trachea', 'larynx']); return true;
    case 'digestive-system': organs(['tongue', 'oesophagus', 'stomach', 'liver', 'gallbladder', 'pancreas', 'small-intestine', 'colon']); return true;
    case 'urinary-system': { organs(['kidney', 'bladder']); const kid = body.organs.filter((o) => o.id === 'kidney'), bl = body.organs.find((o) => o.id === 'bladder')!; for (const k of kid) add(tubeAlong([k.a, lerp3(k.a, bl.a, 0.5), bl.a], 0.0025, 16, 6), tint(C.bag)); return true; }
    case 'nervous-system': { organs(['brain', 'spinal-cord', 'eye'], false); limbsTube(C.nerve, 0.0035, [0, 0, -0.004]); ghost(); return true; }
    case 'endocrine-system': organs(['thyroid', 'adrenal', 'pituitary', 'pineal', 'pancreas', 'testis', 'ovary']); return true;
    case 'immune-system': { organs(['spleen', 'thymus']); const J = body.joints; for (const p of [J.neck!, J.shoulderL!, J.shoulderR!, J.hipL!, J.hipR!]) for (let i = 0; i < 4; i++) { const g = new THREE.SphereGeometry(0.006, 8, 6); g.translate(p[0] + 0.015 * Math.cos(i), p[1] - 0.012 * i, p[2] + 0.03); add(g, tint(0xd8b0a0)); } return true; }
    case 'reproductive-system': organs(['testis', 'prostate', 'uterus', 'ovary']); return true;
    default: return false;
  }
}
/** Which skull bone a point of the unit skull is in (its left side; the right mirrors). */
function skullBoneAt(p: V3): string {
  const [x0, y, z] = p, x = Math.abs(x0);
  if (y < -0.12 && z > 0.12) return x < 0.06 && z < 0.34 ? 'vomer' : z < 0.2 ? 'palatine-bone' : 'maxilla';
  if (x < 0.07 && y < -0.04 && y > -0.2 && z > 0.38) return 'nasal-bone';
  if (x > 0.2 && y < -0.02 && y > -0.22 && z > 0.05) return 'zygomatic-bone';
  if (x > 0.08 && x < 0.18 && y > -0.12 && y < -0.02 && z > 0.32) return 'lacrimal-bone';
  if (x < 0.1 && y < 0 && y > -0.2 && z > 0.22) return x < 0.04 ? 'ethmoid-bone' : 'inferior-nasal-concha';
  if (z > 0.15 && y > -0.06) return 'frontal-bone';
  if (y < -0.08 && z > -0.2 && z <= 0.15) return 'sphenoid-bone';
  if (z < -0.28 || (z < -0.12 && y < 0.05 && x < 0.28)) return 'occipital-bone';
  if (x > 0.27 && y < 0.14) return 'temporal-bone';
  return 'parietal-bone';
}
const FACE = new Set(['nasal-bone', 'maxilla', 'lacrimal-bone', 'zygomatic-bone', 'palatine-bone', 'inferior-nasal-concha', 'vomer']);
/** The unit skull's triangles of some of its bones, as geometry (one side's, for a paired bone). */
function skullOf(keepBone: (bone: string, left: boolean) => boolean, s: V3, centre: V3 = [0, 0, 0]): THREE.BufferGeometry {
  const k = unit('skull', FIELDS.skull!), idx: number[] = [];
  for (let t = 0; t < k.idx.length; t += 3) { const a = k.idx[t]! * 3, b = k.idx[t + 1]! * 3, c = k.idx[t + 2]! * 3, p: V3 = [(k.pos[a]! + k.pos[b]! + k.pos[c]!) / 3, (k.pos[a + 1]! + k.pos[b + 1]! + k.pos[c + 1]!) / 3, (k.pos[a + 2]! + k.pos[b + 2]! + k.pos[c + 2]!) / 3]; if (keepBone(skullBoneAt(p), p[0] >= 0)) idx.push(k.idx[t]!, k.idx[t + 1]!, k.idx[t + 2]!); }
  const g = geoOf({ pos: k.pos, nrm: k.nrm, idx: new Uint32Array(idx) }, s); g.translate(-centre[0] * s[0], -centre[1] * s[1], -centre[2] * s[2]); return g;
}
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** The ids drawn as a system of the body. */
export const SYSTEMS = new Set(['human', 'skin', 'adipose', 'skeleton', 'skull', 'cranium', 'face-bones', 'spine', 'ribcage', 'arm-bones', 'hand-bones', 'leg-bones', 'foot-bones', 'ossicles', 'muscles', 'connective-tissue', 'circulatory-system', 'respiratory-system', 'digestive-system', 'urinary-system', 'nervous-system', 'endocrine-system', 'immune-system', 'reproductive-system']);

/** How a drawing of the body fits a look's box: the middle of what it reaches, and the scale (same as pieces.ts). */
export function fitOf(body: Body, ref: string, size: V3): { c: V3; k: number } { const e = extentOf(body, ref) ?? { lo: [-0.3, 0, -0.15] as V3, hi: [0.3, body.H, 0.15] as V3 }, d = [e.hi[0] - e.lo[0], e.hi[1] - e.lo[1], e.hi[2] - e.lo[2]]; return { c: [(e.lo[0] + e.hi[0]) / 2, (e.lo[1] + e.hi[1]) / 2, (e.lo[2] + e.hi[2]) / 2], k: Math.min(size[0] / Math.max(d[1]!, 1e-6), Math.max(size[1], size[2]) / Math.max(d[0]!, d[2]!, 1e-6)) }; }
/** Draw a living thing's look into a view's group: a system of the body where its parts lie, scaled into the look's
 *  box; anything else by its own form at its size. */
export function organicInto(l: Look, g: THREE.Group, add: Add): void {
  const [x, y, z] = l.size, form = l.mark ?? 'blob', ref = l.ref ?? '', look = LOOK[form] ?? { c: C.protein }, m = tint(look.c, look);
  if (SYSTEMS.has(ref)) {
    const body = bodyNow(), before = g.children.length;
    systemInto(ref, body, add);
    // the drawn body scaled into the look's box, about the middle of its reach (src/nexus/pieces.ts places its parts by the same)
    const { c, k } = fitOf(body, ref, l.size);
    for (let i = before; i < g.children.length; i++) { const me = g.children[i] as THREE.Mesh; me.geometry.translate(-c[0], -c[1], -c[2]); me.geometry.scale(k, k, k); }
    return;
  }
  const axis = (geo: THREE.BufferGeometry) => { if (l.axis) geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...l.axis).normalize())); return geo; };
  const L = x, W = y, D = z; // its length along y, width, depth
  const reg = SKULL_REGIONS[ref];
  if (reg) { const kk = Math.max(L, W, D) / 0.38 / 0.2, g2 = skullOf((bone, left) => bone === ref && left, [0.155 * kk, 0.2 * kk, 0.2 * kk], reg); add(g2, tint(C.bone, { rough: 0.7, both: true })); return; }
  switch (form) {
    case 'longbone': for (const geo of longBone(L, W, ref)) add(axis(geo), m); return;
    case 'muscle': add(axis(muscleGeo(L, W, D)), m); return;
    case 'tendon': add(axis(muscleGeo(L, W * 0.6, D * 0.5)), m); return;
    case 'flatbone': add(axis(plate(L, W, D, /parietal|frontal|occipital/.test(ref) ? 0.35 : 0.15)), m); return;
    case 'rib': { if (l.path && l.path.length > 1) { add(tubeAlong(l.path, Math.max(D, W * 0.4) * 0.5, 32, 6), m); return; } const pts: V3[] = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; pts.push([Math.sin(a) * L * 0.38, -i * L * 0.012, (1 - Math.cos(a)) * L * 0.25 - L * 0.25]); } add(tubeAlong(pts, D * 0.5, 32, 6), m); return; }
    case 'tube': case 'cord': case 'nerve': case 'axon': case 'rod': add(axis(new THREE.CylinderGeometry(W / 2, W / 2, L, 14)), m); return;
    case 'intestine': add(coil([0, 0, 0], [L, W, D]), m); return;
    case 'colon': add(frame([0, 0, 0], [L, W, D]), m); return;
    case 'helix': { for (const ph of [0, Math.PI]) { const pts: V3[] = []; for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * Math.PI * 8 + ph; pts.push([Math.cos(a) * W * 0.4, (t - 0.5) * L, Math.sin(a) * W * 0.4]); } add(tubeAlong(pts, W * 0.06, 160, 6), m); } for (let i = 0; i < 20; i++) { const t = i / 20, a = t * Math.PI * 8, r = new THREE.CylinderGeometry(W * 0.03, W * 0.03, W * 0.8, 6); r.rotateZ(Math.PI / 2); r.rotateY(-a); r.translate(0, (t - 0.5) * L, 0); add(r, tint(i % 2 ? 0xffb050 : 0x50d0ff)); } return; }
    case 'membrane': { const n = 7, s = Math.min(L, W) / n; for (const side of [1, -1]) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const h = new THREE.SphereGeometry(s * 0.42, 8, 6); h.translate((i - n / 2 + 0.5) * s, (j - n / 2 + 0.5) * s, side * D * 0.45); add(h, tint(0xe8c060)); const t = new THREE.CylinderGeometry(s * 0.08, s * 0.08, D * 0.4, 5); t.rotateX(Math.PI / 2); t.translate((i - n / 2 + 0.5) * s, (j - n / 2 + 0.5) * s, side * D * 0.2); add(t, tint(0xf8f0c8)); } return; }
    case 'ring': case 'motor': { const r = new THREE.TorusGeometry(Math.max(L, W) * 0.38, Math.min(L, W) * 0.12, 10, 32); add(r, m); if (form === 'motor') for (let i = 0; i < 11; i++) { const st = new THREE.CylinderGeometry(W * 0.06, W * 0.06, D * 0.6, 8); const a = (i / 11) * Math.PI * 2; st.translate(Math.cos(a) * L * 0.5, Math.sin(a) * L * 0.5, 0); add(st, tint(0x7fc8a0)); } return; }
    case 'sarcomere': { const zx = new THREE.BoxGeometry(W, L * 0.02, D); for (const yy of [-0.49, 0.49]) { const z2 = zx.clone(); z2.translate(0, yy * L, 0); add(z2, tint(0x404858)); } for (let i = 0; i < 25; i++) { const a = i % 5, b = Math.floor(i / 5), px = (a - 2) * W * 0.18, pz = (b - 2) * D * 0.18; const th = new THREE.CylinderGeometry(W * 0.03, W * 0.03, L * 0.64, 6); th.translate(px, 0, pz); add(th, tint(0xd04040)); for (const yy of [-0.3, 0.3]) { const tn = new THREE.CylinderGeometry(W * 0.012, W * 0.012, L * 0.38, 5); tn.translate(px + W * 0.09, yy * L, pz + D * 0.09); add(tn, tint(0xf0a0a0)); } } return; }
    case 'neuron': case 'star': {
      const soma = new THREE.SphereGeometry(Math.min(W, D) * 0.5 * (form === 'neuron' ? 0.9 : 0.7), 14, 10); add(soma, m);
      const branches = form === 'neuron' ? 6 : 14, len = form === 'neuron' ? Math.max(L, W) * 0.5 : Math.max(L, W) * 0.5, rr = Math.min(W, D) * 0.06;
      for (let i = 0; i < branches; i++) { const a = i * 2.4, e = Math.sin(i * 1.7) * 0.8, dir: V3 = [Math.cos(a) * Math.cos(e), Math.sin(e) + (form === 'neuron' && i === 0 ? 2 : 0), Math.sin(a) * Math.cos(e)], l1 = Math.hypot(...dir); const d = dir.map((v) => v / l1) as V3; const mid = d.map((v, j) => v * len * 0.5 + (j === 1 ? 0 : Math.sin(i + j) * len * 0.08)) as V3, end = d.map((v) => v * len * (form === 'neuron' && i === 0 ? 1.0 : 0.85)) as V3; add(tubeAlong([[0, 0, 0], mid, end], rr * (form === 'neuron' && i === 0 ? 1.3 : 1), 12, 5), m); if (form === 'neuron') for (const t of [0.6, 0.85]) { const p = lerp3([0, 0, 0], end, t), side: V3 = [p[0] + Math.sin(i + t * 9) * len * 0.25, p[1] + len * 0.15, p[2] + Math.cos(i + t * 7) * len * 0.25]; add(tubeAlong([p, lerp3(p, side, 0.5), side], rr * 0.6, 8, 4), m); } }
      if (form === 'neuron') add(tubeAlong([[0, 0, 0], [0, -L * 0.25, W * 0.05], [W * 0.05, -L * 0.5, 0]], rr * 0.9, 20, 5), tint(C.white)); // the axon, sheathed
      return;
    }
    case 'fibre': case 'spindle': case 'column': {
      const prof = form === 'fibre' ? [[0, -0.5], [0.45, -0.49], [0.5, -0.45], [0.5, 0.45], [0.45, 0.49], [0, 0.5]] : form === 'spindle' ? [[0, -0.5], [0.12, -0.4], [0.4, -0.15], [0.5, 0], [0.4, 0.15], [0.12, 0.4], [0, 0.5]] : [[0, -0.5], [0.45, -0.48], [0.5, -0.4], [0.5, 0.4], [0.45, 0.48], [0, 0.5]];
      add(axis(new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r! * W, yy! * L)), 16)), tint(look.c, { clear: form === 'column' ? 0.6 : 1 }));
      if (form === 'fibre') for (let i = 1; i < 30; i++) { const r = new THREE.TorusGeometry(W * 0.505, W * 0.012, 4, 20); r.rotateX(Math.PI / 2); r.translate(0, (i / 30 - 0.5) * L, 0); add(r, tint(0x701820)); }
      const n = new THREE.SphereGeometry(Math.min(W, D) * 0.28, 12, 8); n.scale(1, form === 'column' ? 1.4 : 2.2, 1); add(n, tint(C.nucleus)); return;
    }
    case 'sperm': { const h = new THREE.SphereGeometry(W * 0.5, 14, 10); h.scale(1, 1.4, 0.6); h.translate(0, L * 0.45, 0); add(h, m); const pts: V3[] = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([Math.sin(t * 12) * W * 0.3 * t, L * 0.4 - t * L * 0.9, 0]); } add(tubeAlong(pts, W * 0.08, 60, 5), m); return; }
    case 'disc': if (/blood|platelet/.test(ref)) { add(geoOf(unit('disc', FIELDS.disc!), [Math.max(L, W), Math.max(L, W), Math.max(D, Math.max(L, W) * 0.32)]), m); return; } add(axis(new THREE.CylinderGeometry(Math.max(L, W) / 2, Math.max(L, W) / 2, D, 24)), tint(C.cartilage)); return;
    case 'cell': case 'sphere': {
      const R = Math.max(L, W, D) / 2;
      add(geoOf(unit('cell', FIELDS.cell!), [2 * R, 2 * R, 2 * R]), tint(form === 'sphere' ? C.fat : C.cell, { clear: form === 'sphere' ? 0.9 : 0.3 }));
      if (form === 'cell') { const nu = new THREE.SphereGeometry(R * 0.36, 16, 12); nu.translate(R * 0.08, R * 0.05, 0); add(nu, tint(C.nucleus, { clear: 0.85 })); for (let i = 0; i < 9; i++) { const mi = new THREE.CapsuleGeometry(R * 0.05, R * 0.16, 4, 8); mi.rotateZ(i * 1.3); mi.rotateX(i * 0.7); mi.translate(R * 0.6 * Math.cos(i * 2.4), R * 0.5 * Math.sin(i * 1.9), R * 0.5 * Math.sin(i * 2.4)); add(mi, tint(C.mito)); } for (let i = 0; i < 5; i++) { const er = new THREE.TorusGeometry(R * (0.48 + i * 0.05), R * 0.015, 4, 32, Math.PI * 1.2); er.rotateY(i * 0.5); er.translate(R * 0.08, R * 0.05, 0); add(er, tint(C.er)); } }
      else { const n = new THREE.SphereGeometry(R * 0.12, 10, 8); n.scale(1, 0.5, 1); n.translate(R * 0.86, 0, 0); add(n, tint(C.nucleus)); }
      return;
    }
    case 'mito': { add(axis(geoOf(unit('mito', FIELDS.mito!), [W * 2.6, L, D * 2.6])), tint(C.mito, { clear: 0.75 })); for (let i = 0; i < 7; i++) { const cr = new THREE.BoxGeometry(W * 0.75, L * 0.025, D * 0.5); cr.translate(0, (i / 6 - 0.5) * L * 0.7, 0); add(cr, tint(0xf8b090)); } return; }
    case 'bacterium': case 'spirillum': case 'coccus': {
      if (form === 'spirillum') { const pts: V3[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([Math.sin(t * Math.PI * 4) * W * 0.6, (t - 0.5) * L, Math.cos(t * Math.PI * 4) * W * 0.3]); } add(tubeAlong(pts, W * 0.35, 80, 8), m); }
      else add(axis(geoOf(unit(form, FIELDS[form]!), form === 'coccus' ? [L, L, L] : [W * 2.5, L, D * 2.5])), m);
      if (form !== 'coccus') for (let i = 0; i < 4; i++) { const pts: V3[] = []; for (let j = 0; j <= 30; j++) { const t = j / 30; pts.push([Math.cos(i * 1.6) * W * 0.4 + Math.sin(t * 18) * W * 0.25, -L * 0.5 - t * L * 1.4, Math.sin(i * 1.6) * W * 0.4 + Math.cos(t * 18) * W * 0.25]); } add(tubeAlong(pts, W * 0.03, 60, 4), tint(0xd8f0c0)); }
      return;
    }
    case 'phage': { add(new THREE.IcosahedronGeometry(W * 0.5, 0).translate(0, L * 0.3, 0), m); add(new THREE.CylinderGeometry(W * 0.1, W * 0.1, L * 0.45, 8).translate(0, -L * 0.05, 0), m); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(tubeAlong([[0, -L * 0.28, 0], [Math.cos(a) * W * 0.5, -L * 0.34, Math.sin(a) * W * 0.5], [Math.cos(a) * W * 0.8, -L * 0.5, Math.sin(a) * W * 0.8]], W * 0.03, 8, 4), m); } return; }
    case 'virus': { const R = Math.max(L, W) / 2; add(new THREE.SphereGeometry(R * 0.75, 18, 14), m); for (let i = 0; i < 26; i++) { const t = Math.acos(1 - (2 * (i + 0.5)) / 26), p = Math.PI * (1 + Math.sqrt(5)) * i, d = new THREE.Vector3(Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)); const sp = new THREE.CylinderGeometry(R * 0.1, R * 0.03, R * 0.3, 6); sp.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); sp.translate(d.x * R * 0.88, d.y * R * 0.88, d.z * R * 0.88); add(sp, tint(0xf0a0b8)); } return; }
    case 'leaf': { const s = new THREE.Shape(); s.moveTo(0, -L / 2); s.quadraticCurveTo(W / 2, 0, 0, L / 2); s.quadraticCurveTo(-W / 2, 0, 0, -L / 2); add(new THREE.ExtrudeGeometry(s, { depth: Math.max(D, L * 0.01), bevelEnabled: false }), m); return; }
    case 'mycelium': for (let i = 0; i < 18; i++) { const pts: V3[] = []; let p: V3 = [0, 0, 0]; for (let j = 0; j < 6; j++) { pts.push(p); p = [p[0] + Math.sin(i * 1.3 + j) * L * 0.12, p[1] + Math.cos(i * 0.7 + j * 1.1) * L * 0.12, p[2] + Math.sin(i * 2.1 + j * 0.6) * L * 0.12]; } add(tubeAlong(pts, L * 0.01, 24, 4), m); } return;
    case 'hair': for (let i = 0; i < 40; i++) { const pts: V3[] = [[(i % 8 - 4) * W * 0.05, -L / 2, Math.floor(i / 8) * D * 0.08], [(i % 8 - 4) * W * 0.06 + Math.sin(i) * W * 0.1, 0, Math.floor(i / 8) * D * 0.08], [(i % 8 - 4) * W * 0.05 + Math.cos(i) * W * 0.2, L / 2, Math.floor(i / 8) * D * 0.08]]; add(tubeAlong(pts, W * 0.008, 10, 3), m); } return;
    case 'cochlea': { const pts: V3[] = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 5, r = L * 0.45 * (1 - t * 0.75); pts.push([Math.cos(a) * r, t * D * 0.6, Math.sin(a) * r]); } add(tubeAlong(pts, L * 0.08, 120, 8), m); return; }
    case 'nephron': { add(new THREE.SphereGeometry(L * 0.006, 12, 8).translate(0, L * 0.48, 0), tint(C.artery)); const pts: V3[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([Math.sin(t * 20) * L * 0.01, L * (0.47 - t * 0.9), Math.cos(t * 13) * L * 0.01]); } add(tubeAlong(pts, L * 0.0015, 80, 5), m); return; }
    case 'lipid': { const head = new THREE.SphereGeometry(W * 0.22, 12, 8); head.translate(0, L * 0.3, 0); add(head, tint(0xe8b040)); for (const sx of [-1, 1]) { const pts: V3[] = []; for (let i = 0; i <= 8; i++) pts.push([sx * W * 0.08 + Math.sin(i * 1.3) * W * 0.04, L * 0.2 - (i / 8) * L * 0.7, 0]); add(tubeAlong(pts, W * 0.045, 16, 5), tint(0xf8f0c0)); } return; }
    case 'sugar': for (let r = 0; r < 3; r++) { const ring = new THREE.TorusGeometry(W * 0.16, W * 0.04, 6, 6); ring.translate(0, (r - 1) * L * 0.32, 0); ring.rotateY(r * 0.6); add(ring, tint(0xf4f4f4)); if (r < 2) add(new THREE.CylinderGeometry(W * 0.03, W * 0.03, L * 0.16, 5).translate(0, (r - 0.5) * L * 0.32, 0), tint(0xff7070)); } return;
    case 'crystal': for (let i = 0; i < 27; i++) { const a = i % 3, b = Math.floor(i / 3) % 3, c2 = Math.floor(i / 9); const s2 = new THREE.SphereGeometry(Math.min(L, W) * ((a + b + c2) % 2 ? 0.1 : 0.14), 10, 8); s2.translate((a - 1) * L * 0.3, (b - 1) * L * 0.3, (c2 - 1) * L * 0.3); add(s2, tint((a + b + c2) % 2 ? 0x9ad0ff : 0xe0e0e0)); } return;
    case 'fluid': { const d = geoOf(unit('drop', () => [cap([0, -0.2, 0], [0, 0.25, 0], 0.32, 0.04, 0.2)]), [W, L, D]); add(d, tint(/blood|plasma/.test(ref) ? C.blood : /bile/.test(ref) ? C.bile : /fat|oil|wax|lipid/.test(ref) ? C.fat : /honey/.test(ref) ? 0xe8a020 : 0xbfe0f4, { clear: 0.75, rough: 0.15 })); return; }
    case 'molecule': { const atoms: [V3, number][] = [[[0, 0, 0], 0x404040], [[0.25, 0.15, 0], 0xff4040], [[-0.25, 0.12, 0.05], 0x4060ff], [[0.05, -0.28, 0.1], 0x404040], [[0.3, -0.25, -0.1], 0xf0f0f0], [[-0.28, -0.2, -0.1], 0xf0f0f0], [[0, 0.35, -0.15], 0xf0f0f0]]; for (const [p2, col] of atoms) { const s2 = new THREE.SphereGeometry(Math.min(L, W) * (col === 0xf0f0f0 ? 0.09 : 0.14), 12, 8); s2.translate(p2[0] * L, p2[1] * L, p2[2] * L); add(s2, tint(col)); } for (let j = 1; j < atoms.length; j++) add(tubeAlong([atoms[0]![0].map((x) => x * L) as V3, atoms[j]![0].map((x) => x * L) as V3], Math.min(L, W) * 0.03, 2, 5), tint(0xb0b0b0)); return; }
    case 'sheet': case 'skin': case 'gut': case 'vessels': case 'blood': case 'swatch': case 'valve': {
      const tissue = /bone|marrow/.test(ref) ? C.bone : /muscle|cardiac/.test(ref) ? C.muscle : /adipose|fat/.test(ref) ? C.fat : /tendon|ligament|fascia|dense/.test(ref) ? C.tendon : /cartilage/.test(ref) ? C.cartilage : /grey|cortex|brain/.test(ref) ? C.brain : /white/.test(ref) ? C.white : /liver/.test(ref) ? C.liver : /lung/.test(ref) ? C.lung : /blood|plasma/.test(ref) ? C.blood : /kidney|nephron/.test(ref) ? C.kidney : /epidermis|dermis|skin/.test(ref) ? C.skin : look.c;
      const g = new THREE.BoxGeometry(L, Math.max(W, L * (form === 'sheet' ? 0.04 : 1)), Math.max(D, L * (form === 'sheet' ? 0.04 : 1)), 6, 6, 6); add(geoNoise(g, Math.min(L, W, D) * 0.03, 40 / L), tint(tissue)); return;
    }
    default: {
      const f = FIELDS[form];
      if (f) { const noise = form === 'brain' || form === 'cerebrum' || form === 'lobe' || form === 'cortex' ? folds(28, 0.012) : form === 'cerebellum' ? folds(60, 0.006, true) : form === 'blob' || form === 'ribosome' ? lumps(9, 0.03) : undefined; add(axis(geoOf(unit(form, f), [W, L, D], noise)), m); return; }
      add(geoOf(unit('blob', FIELDS.blob!), [W, L, D], lumps(9, 0.03)), m);
    }
  }
}
/** A geometry made a little irregular, as tissue is. */
function geoNoise(g: THREE.BufferGeometry, amp: number, f: number): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = amp * Math.sin(x * f + 1.3) * Math.sin(y * f * 1.1 + 0.4) * Math.sin(z * f * 0.9 + 2.2); p.setXYZ(i, x + d, y + d, z + d); }
  g.computeVertexNormals(); return g;
}

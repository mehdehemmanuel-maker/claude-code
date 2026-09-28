// Engineering materials -> render materials (cached). Cheap PBR, small procedural textures for wood grain
// and cast surfaces so parts read as what they are.

import * as THREE from 'three';
import type { Material } from '../data/materials';

const cache = new Map<string, THREE.MeshStandardMaterial>();
const textures = new Map<string, THREE.Texture>();

function grainTexture(color: number) {
  const key = `grain:${color}`;
  let t = textures.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  const base = new THREE.Color(color);
  g.fillStyle = `#${base.getHexString()}`;
  g.fillRect(0, 0, 256, 64);
  let seed = color;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 42; i++) {
    const y = rnd() * 64;
    const dark = base.clone().multiplyScalar(0.72 + rnd() * 0.2);
    g.strokeStyle = `#${dark.getHexString()}`;
    g.globalAlpha = 0.35 + rnd() * 0.4;
    g.lineWidth = 0.6 + rnd() * 1.8;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / (18 + rnd() * 20) + i) * (1 + rnd() * 2));
    g.stroke();
  }
  t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(key, t);
  return t;
}

function speckleTexture(color: number) {
  const key = `speckle:${color}`;
  let t = textures.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const base = new THREE.Color(color);
  g.fillStyle = `#${base.getHexString()}`;
  g.fillRect(0, 0, 128, 128);
  let seed = color + 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const v = base.clone().multiplyScalar(0.8 + rnd() * 0.4);
    g.fillStyle = `#${v.getHexString()}`;
    g.globalAlpha = 0.5;
    g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, t);
  return t;
}

export function renderMaterial(m: Material): THREE.MeshStandardMaterial {
  let mat = cache.get(m.id);
  if (mat) return mat;
  const params: THREE.MeshStandardMaterialParameters = { color: m.color, metalness: m.metalness, roughness: m.roughness };
  if (typeof document !== 'undefined') {
    if (m.category === 'wood' || m.category === 'engineered-wood') {
      params.map = grainTexture(m.color);
      params.color = 0xffffff;
    } else if (m.category === 'cast-iron' || m.category === 'ceramic') {
      params.map = speckleTexture(m.color);
      params.color = 0xffffff;
    }
  }
  if (m.category === 'glass' || m.id === 'polymer.pmma' || m.id === 'polymer.pc') {
    params.transparent = true;
    params.opacity = 0.45;
  }
  mat = new THREE.MeshStandardMaterial(params);
  mat.name = m.id;
  cache.set(m.id, mat);
  return mat;
}

const tints = new Map<number, THREE.MeshStandardMaterial>();
export function tintMaterial(hex: number) {
  let t = tints.get(hex);
  if (!t) {
    t = new THREE.MeshStandardMaterial({ color: hex, metalness: 0.3, roughness: 0.5 });
    tints.set(hex, t);
  }
  return t;
}

const highlight = new Map<string, THREE.MeshStandardMaterial>();
/** Selected / hovered variant: same look with an emissive rim. */
export function highlighted(base: THREE.Material, kind: 'select' | 'hover'): THREE.Material {
  const key = `${base.uuid}:${kind}`;
  let h = highlight.get(key);
  if (!h && base instanceof THREE.MeshStandardMaterial) {
    h = base.clone();
    h.emissive = new THREE.Color(kind === 'select' ? 0x2a7fff : 0x55606a);
    h.emissiveIntensity = kind === 'select' ? 0.55 : 0.35;
    highlight.set(key, h);
  }
  return h ?? base;
}

const stress: THREE.MeshStandardMaterial[] = [];
/** Utilisation 0..1+ -> green, yellow, red. */
export function stressMaterial(u: number): THREE.MeshStandardMaterial {
  const i = Math.max(0, Math.min(10, Math.round(u * 10)));
  if (!stress[i]) {
    const c = new THREE.Color().setHSL((1 - i / 10) * 0.33, 0.85, 0.5);
    stress[i] = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.6, metalness: 0.1 });
  }
  return stress[i]!;
}

export const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x66b3ff, transparent: true, opacity: 0.35, depthWrite: false });
export const ghostBadMaterial = new THREE.MeshBasicMaterial({ color: 0xff6655, transparent: true, opacity: 0.35, depthWrite: false });

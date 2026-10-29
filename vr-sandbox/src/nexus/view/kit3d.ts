// A kit's thing drawn (src/nexus/kits.ts makes it as a tree of parts): every part its shape, its colour, its edges as its
// material is made (src/nexus/finish.ts: a moulded edge as round as its mould, a machined one broken, a wooden one
// eased), what gives light lit by its lumens, a galaxy's stars turning faster inside, a terrain's land. It can be taken
// apart: each level of parts drawn out from the middle of what holds them.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FINISH_MAKE, edgeRadius, surfaceOf } from '../finish';
import { resolveLook, type Graphic, type Look } from '../appearance';
import type { Cut, Part, Shape } from '../kits';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { massOf } from '../mass';
import { sectionPoint, tubeLegs, type Loft, type Station, type Tube } from '../form';
import { patchAt, tessellate, type Patch } from '../surface';
import { findItem, resolve } from '../inventory';
import { lookOf } from '../pieces';
import { meshOfLook } from './explode';

export interface KitView { group: THREE.Group; update(dt: number): void; explode(level: number): void; dispose(): void; lights: number; /** how fast its limbs go round, strides a second (0: still) */ gait: number }

const mats = new Map<string, THREE.MeshStandardMaterial>();
// how a surface takes the light, by how it was finished (a car's paint is lacquered over its colour, a chrome trim a
// mirror, a tyre's rubber matt, cast metal dull, brushed metal satin): roughness 0 a mirror, 1 chalk (typical of
// physically based renderers' guides for each; ground steel, a rail's or a block's, satin: it takes the room's light as
// well as mirroring it)
const FINISH: Record<string, { rough: number; metal: number; coat?: number }> = {
  paint: { rough: 0.35, metal: 0.1, coat: 1 }, enamel: { rough: 0.22, metal: 0.85, coat: 0.6 }, chrome: { rough: 0.06, metal: 1 }, brushed: { rough: 0.32, metal: 1 }, ground: { rough: 0.48, metal: 0.72 }, cast: { rough: 0.7, metal: 0.8 },
  plate: { rough: 0.4, metal: 0.9 }, weld: { rough: 0.75, metal: 0.7 }, thread: { rough: 0.62, metal: 0.85 }, tread: { rough: 0.92, metal: 0 }, leather: { rough: 0.55, metal: 0, coat: 0.2 },
  weave: { rough: 0.95, metal: 0 }, texture: { rough: 0.8, metal: 0 }, grain: { rough: 0.7, metal: 0 }, stone: { rough: 0.85, metal: 0 }, concrete: { rough: 0.95, metal: 0 },
};
FINISH.machined = { rough: 0.42, metal: 0.85 }; FINISH.forged = { rough: 0.6, metal: 0.8 }; FINISH.satin = { rough: 0.3, metal: 0.9 }; FINISH.gloss = { rough: 0.12, metal: 0, coat: 0.6 }; FINISH.matte = { rough: 0.85, metal: 0 };
// ---- the grain of a surface, as it was made: drawn from where it is, in metres, so a sand casting's grain is the same
// size on a bolt boss as on a block, and no picture is laid on it ------------------------------------------------------
/** Each finish's grain: its feature's size (m), how far it tilts the surface (0 to 1), how much it varies its gloss, and
 *  which way it runs (a turned or ground part's marks round its axis: fine along it, long round it). Every figure an
 *  estimate of how the surface reads at arm's length (sand grain about 0.3 to 1 mm; a turned finish's feed marks tenths
 *  of a millimetre; paint's orange peel a few millimetres). */
export const GRAIN: Record<string, { size: number; depth: number; rough: number; stretch?: [number, number, number]; /** marks round the piece's own axis (y): measured by radius and height, so a faced end shows rings */ radial?: boolean }> = {
  cast: { size: 0.0008, depth: 0.55, rough: 0.16 }, forged: { size: 0.004, depth: 0.3, rough: 0.1 }, machined: { size: 0.00035, depth: 0.16, rough: 0.05, radial: true },
  ground: { size: 0.00018, depth: 0.08, rough: 0.04, radial: true }, brushed: { size: 0.00025, depth: 0.14, rough: 0.07, stretch: [0.03, 1, 0.03] }, satin: { size: 0.0004, depth: 0.08, rough: 0.04 },
  paint: { size: 0.003, depth: 0.05, rough: 0.03 }, enamel: { size: 0.002, depth: 0.03, rough: 0.02 }, texture: { size: 0.0006, depth: 0.35, rough: 0.12 }, matte: { size: 0.001, depth: 0.15, rough: 0.1 }, plate: { size: 0.0005, depth: 0.05, rough: 0.03 },
  tread: { size: 0.0008, depth: 0.3, rough: 0.1 }, weld: { size: 0.002, depth: 0.6, rough: 0.2, stretch: [1, 0.25, 1] }, thread: { size: 0.0004, depth: 0.2, rough: 0.06, radial: true }, weave: { size: 0.0012, depth: 0.4, rough: 0.1, stretch: [1, 0.3, 1] },
  // (a process's own: a cut surface's marks one feed apart, round its axis; a print's layers; a blast's dimples)
  turned: { size: 0.00015, depth: 0.16, rough: 0.05, radial: true }, 'face-milled': { size: 0.0001, depth: 0.14, rough: 0.05, stretch: [0.05, 1, 0.05] }, printed: { size: 0.0002, depth: 0.45, rough: 0.08, stretch: [1, 0.06, 1] },
  lapped: { size: 0.00008, depth: 0.03, rough: 0.02 }, 'bead blasted': { size: 0.0004, depth: 0.12, rough: 0.05 }, 'sand cast': { size: 0.0008, depth: 0.55, rough: 0.16 }, 'die cast': { size: 0.0005, depth: 0.12, rough: 0.05 }, 'spark eroded': { size: 0.00025, depth: 0.35, rough: 0.1 },
  // (a metallic paint's flakes: aluminium platelets about 10 to 30 µm across, each tilted its own way: the sparkle)
  flake: { size: 0.00004, depth: 0.25, rough: 0.12 },
  leather: { size: 0.0015, depth: 0.3, rough: 0.1 }, stone: { size: 0.002, depth: 0.5, rough: 0.15 }, concrete: { size: 0.003, depth: 0.6, rough: 0.2 }, grain: { size: 0.002, depth: 0.25, rough: 0.08, stretch: [1, 0.08, 1] },
};
/** A material given its finish's grain: a bump drawn in the shader from the surface's place (value noise over its size,
 *  stretched its way), faded where a feature is smaller than a pixel so it never shimmers, its gloss varied with it. */
/** What a look lays over the grain: its graphics, and its wear (appearance.ts) drawn where the surface's own shape puts
 *  it. Each point's curvature is read from how its normal turns across the pixel against how far the surface moves
 *  (κ = (dN·dP)/(dP·dP), view space: 1/R on a ball of radius R, positive convex, negative in a hollow); a coat chips
 *  where κ passes 1/r for a radius r that grows with wear (edges first), broken up by noise a few millimetres across;
 *  bare iron rusts and everything gathers dirt where κ is negative. */
export interface Worn { wear: number; under?: { color: number; metal: number; rough: number; kind: 'chip' | 'rust' | 'sand' }; graphics?: Graphic[] }
const NO_GRAIN = { size: 0.001, depth: 0, rough: 0 };
function grained(m: THREE.MeshStandardMaterial, g: (typeof GRAIN)[string], x?: Worn): void {
  const gs = (x?.graphics ?? []).slice(0, 2), ax = { x: 0, y: 1, z: 2 }, rc = 0.001 + 0.012 * (x?.wear ?? 0);
  const u = { uGrainF: { value: 1 / g.size }, uGrainA: { value: g.depth }, uGrainR: { value: g.rough }, uGrainS: { value: new THREE.Vector3(...(g.stretch ?? [1, 1, 1])) },
    uGrainRad: { value: g.radial ? 1 : 0 }, uWear: { value: x?.wear ?? 0 }, uChipK: { value: 1 / rc }, uUnder: { value: new THREE.Color(x?.under?.color ?? 0) }, uUnderM: { value: x?.under?.metal ?? 0 }, uUnderR: { value: x?.under?.rough ?? 0.5 }, uRust: { value: x?.under?.kind === 'rust' ? 1 : 0 }, uSand: { value: x?.under?.kind === 'sand' ? 1 : 0 }, uHasUnder: { value: x?.under ? 1 : 0 },
    uG: { value: [0, 1].map((i) => { const q = gs[i]; return q ? new THREE.Vector4(ax[q.axis], q.at, q.width / 2, q.kind === 'stripe' ? 1 : q.kind === 'above' ? 2 : 3) : new THREE.Vector4(0, 0, 0, 0); }) }, uGC: { value: [0, 1].map((i) => new THREE.Color(gs[i]?.colour ?? 0)) } };
  const looked = !!x && (x.wear > 0 || gs.length > 0);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos; varying vec3 vLocalPos; varying vec3 vLocalN;' + (looked ? '\nattribute float aCurv; attribute float aEdge; varying float vCurv; varying float vEdge;' : '')).replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvLocalN = objectNormal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPos = transformed;' + (looked ? '\nvCurv = aCurv; vEdge = aEdge;' : '') + '\n#ifdef USE_INSTANCING\nvGrainPos = (instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvGrainPos = transformed;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vGrainPos; varying vec3 vLocalPos; varying vec3 vLocalN; uniform float uGrainF;
${looked ? 'varying float vCurv; varying float vEdge;' : ''}
uniform float uGrainRad; uniform float uWear; uniform float uChipK; uniform vec3 uUnder; uniform float uUnderM; uniform float uUnderR; uniform float uRust; uniform float uSand; uniform float uHasUnder; uniform vec4 uG[2]; uniform vec3 uGC[2];
float wMask = 0.0, wDirt = 0.0; uniform float uGrainA; uniform float uGrainR; uniform vec3 uGrainS;
float gHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gHash(i), gHash(i + vec3(1,0,0)), f.x), mix(gHash(i + vec3(0,1,0)), gHash(i + vec3(1,1,0)), f.x), f.y), mix(mix(gHash(i + vec3(0,0,1)), gHash(i + vec3(1,0,1)), f.x), mix(gHash(i + vec3(0,1,1)), gHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 gPos() { return uGrainRad > 0.5 ? vec3(length(vLocalPos.xz), vLocalPos.y, 0.0) : vGrainPos; }
float gHeight(vec3 p) { vec3 q = p * uGrainF * uGrainS; return 0.65 * gNoise(q) + 0.35 * gNoise(q * 2.7 + 11.0); }
vec3 gPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) { vec3 vSigmaX = normalize(dFdx(surf_pos.xyz)); vec3 vSigmaY = normalize(dFdy(surf_pos.xyz)); vec3 vN = surf_norm; vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX); float fDet = dot(vSigmaX, R1) * faceDirection; vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2); return normalize(abs(fDet) * surf_norm - vGrad); }`)
      .replace('#include <color_fragment>', looked ? `#include <color_fragment>
for (int i = 0; i < 2; i++) { vec4 q = uG[i]; if (q.w < 0.5) continue; float c = q.x < 0.5 ? vLocalPos.x : q.x < 1.5 ? vLocalPos.y : vLocalPos.z;
  float d = q.w < 1.5 ? q.z - abs(c - q.y) : q.w < 2.5 ? c - q.y : q.y - c;
  diffuseColor.rgb = mix(diffuseColor.rgb, uGC[i], clamp(d / max(fwidth(c), 1e-7) + 0.5, 0.0, 1.0)); }
if (uWear > 0.0) {
  float k = vCurv, n1 = gNoise(vGrainPos * 300.0), n3 = gNoise(vGrainPos * 1400.0 + 3.0), n2 = gNoise(vGrainPos * 90.0 + 7.0);
  // (a chip's outline is crisp and ragged: the reach from the edge varied at two scales, then cut sharply)
  float reach = vEdge * uChipK / (0.35 + 0.9 * n1 + 0.45 * n3);
  float fw = max(fwidth(reach), 0.03), convex = max(smoothstep(0.5 * uChipK, uChipK, k) * smoothstep(0.4, 0.5, n1), 1.0 - smoothstep(1.0 - fw, 1.0 + fw, reach)), hollow = smoothstep(0.0, 0.5 * uChipK, -k);
  float patches = smoothstep(uWear * 0.05, uWear * 0.05 - 0.01, n2) * smoothstep(0.6, 0.65, n3);
  // (a chip's edge shows the paint's thickness: a thin band of the lighter primer under it)
  float rim = uHasUnder * (1.0 - uRust) * (smoothstep(1.0 - fw, 1.0 + fw, reach) - smoothstep(1.12 - fw, 1.12 + fw, reach));
  wMask = uHasUnder * clamp((uRust > 0.5 ? hollow * 1.3 + patches * 1.6 : convex + patches * step(0.5, n1)) * min(1.0, uWear * 1.6), 0.0, 1.0);
  // (sanded back by hand: broad patches through to the primer, a block's reach across (tens of centimetres), mottled at
  // their edges, on the flat; the paint kept in the hollows and on the tight edges the block rode over)
  if (uSand > 0.5) { float m = 0.62 * gNoise(vGrainPos * 5.0 + 11.0) + 0.26 * gNoise(vGrainPos * 17.0 + 5.0) + 0.12 * gNoise(vGrainPos * 70.0 + 2.0), th = 1.0 - uWear * 0.85;
    // (its edges feathered, and specks of the paint left in the low spots inside a sanded patch, as a block leaves them)
    float specks = smoothstep(0.3, 0.42, gNoise(vGrainPos * 140.0 + 9.0)) * 0.6 + 0.4 * smoothstep(0.25, 0.4, gNoise(vGrainPos * 38.0 + 4.0));
    wMask = uHasUnder * smoothstep(th - 0.05, th + 0.05, m) * mix(1.0, specks, 0.55) * (1.0 - hollow) * (1.0 - smoothstep(0.5 * uChipK, uChipK, k)); rim *= 0.0; }
  wDirt = clamp(hollow * uWear * 0.8 + uWear * 0.12 * n2, 0.0, 0.85);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.53, 0.5), rim * 0.7 * (1.0 - wMask));
  diffuseColor.rgb = mix(diffuseColor.rgb, uUnder, wMask);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.065, 0.045), wDirt);
}` : '#include <color_fragment>')
      .replace('#include <metalnessmap_fragment>', looked ? '#include <metalnessmap_fragment>\nmetalnessFactor = mix(mix(metalnessFactor, uUnderM, wMask), 0.0, wDirt);' : '#include <metalnessmap_fragment>')
      // (marks round the axis stretch the highlight across them on the round side; a faced end, square to the axis, has
      // rings, not a lay one way: no anisotropy there)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_ANISOTROPY\nif (uGrainRad > 0.5) { material.anisotropy *= 1.0 - abs(normalize(vLocalN).y); material.alphaT = mix(pow2(material.roughness), 1.0, pow2(material.anisotropy)); }\n#endif' + (looked ? '\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - max(wMask, wDirt);\n#endif' : ''))
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 gP = gPos(); float gFeat = length(fwidth(gP * uGrainS)) * uGrainF, gFade = 1.0 - smoothstep(0.35, 1.0, gFeat), gH = gHeight(gP);
if (gFade > 0.0) normal = gPerturb(-vViewPosition, normal, vec2(dFdx(gH), dFdy(gH)) * uGrainA * gFade, faceDirection);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (gHeight(gPos() * 0.37) - 0.5) * uGrainR, 0.02, 1.0);' + (looked ? '\nroughnessFactor = mix(mix(roughnessFactor, uUnderR, wMask), 1.0, wDirt);' : ''));
  };
  m.customProgramCacheKey = () => (looked ? 'grain-look' : 'grain');
}
/** A studio for what the renderer reflects (its environment, prefiltered once): a dark room with softboxes (a long one
 *  overhead, strips either side, one behind), and a floor lighter than the walls, so a metal shows a horizon (its floor
 *  in its lower half, the room's dark above it) and each light as a shape, not three blobs over a square, as a product
 *  photograph does. Its size does not matter: what is reflected is taken as far off. */
export function studioScene(): THREE.Scene {
  const st = new THREE.Scene(), room = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 40), new THREE.MeshBasicMaterial({ color: 0x34373d, side: THREE.BackSide })); room.position.y = 6; st.add(room);
  const box = (w: number, h: number, at: [number, number, number], rot: [number, number, number], k: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(k), side: THREE.DoubleSide })); m.position.set(...at); m.rotation.set(...rot); st.add(m); };
  box(38, 38, [0, -1.9, 0], [-Math.PI / 2, 0, 0], 0.32);
  box(14, 4, [0, 13.5, 0], [Math.PI / 2, 0, 0], 4); for (const z of [-1, 1]) box(16, 1.2, [0, 4, z * 12], [0, 0, 0], 3); for (const x of [-1, 1]) box(1.5, 6, [x * 14, 4, 0], [0, Math.PI / 2, 0], 2.2); box(30, 0.4, [0, 0.4, -15], [0, 0, 0], 1.5);
  box(6, 6, [9, 7, 9], [0, -Math.PI / 4, 0], 1.2);
  return st;
}
const RUST = new THREE.Color(0x7a3a1a), DIRT = new THREE.Color(0x5a5040);
const matFor = (color0: number, mat: string | undefined, glow: boolean, finish?: string, wear0 = 0, open = false, look?: Look): THREE.MeshStandardMaterial => {
  // (a look's layers resolved against this piece's own material: appearance.ts)
  const lk = look ? resolveLook(look, mat, color0) : undefined, color = lk?.color ?? color0, wear = Math.max(wear0, look?.wear ?? 0);
  const w = Math.round(wear * 10) / 10, key = `${color}|${mat}|${glow}|${finish}|${w}|${open}|${lk ? `${lk.metal}|${lk.rough}|${lk.clear}|${lk.flake}|${JSON.stringify(lk.under ?? '')}|${JSON.stringify(look?.graphics ?? '')}` : ''}`; let m = mats.get(key);
  if (!m) {
    const metal = /steel|al-|copper|iron|gold|silver|titanium/.test(mat ?? ''), glass = mat === 'glass' || mat === 'pmma' || mat === 'pc', f = finish ? FINISH[finish] : undefined, rubber = mat === 'rubber';
    // worn: bare steel rusts, paint fades toward grey and gathers dirt, everything goes rougher (an estimate of how it looks)
    const c = new THREE.Color(color); if (w > 0 && !look?.wear) { if (metal && !/stainless|al-|gold|titanium/.test(mat ?? '') && finish !== 'paint') c.lerp(RUST, w * 0.7); else c.lerp(DIRT, w * 0.35).offsetHSL(0, -w * 0.3, 0); }
    // (a finish that is a process: its roughness from the surface the process leaves (finish.ts): α = r², α its facets' rms
    // slope; along its lay where it has one, the slope across it as anisotropy, as three.js takes it: α across = α along +
    // s² (1 − α along))
    const sf = finish && FINISH_MAKE[finish] ? surfaceOf(FINISH_MAKE[finish]!) : undefined;
    const rough = Math.min(1, (lk?.rough !== undefined ? lk.rough : sf ? Math.sqrt(sf.lay ? sf.alphaAlong : sf.alphaAcross) : f?.rough ?? (glass ? 0.05 : metal ? 0.35 : rubber ? 0.9 : mat === 'leaf' ? 0.8 : mat === 'cotton' || mat === 'foam' ? 0.95 : 0.6)) + w * 0.35);
    const aniso = sf?.lay && sf.alphaAcross > sf.alphaAlong ? Math.sqrt((sf.alphaAcross - sf.alphaAlong) / (1 - sf.alphaAlong)) : 0;
    // (tinted glass, a car's windows, is mostly reflection: nearly opaque, dark, glossy; clear glass and lenses are see-through)
    const tinted = glass && c.getHSL({ h: 0, s: 0, l: 0 }).l < 0.2, base = { color: c, roughness: rough, metalness: lk ? lk.metal : sf && metal ? 1 : f?.metal ?? (metal ? 0.85 : 0), transparent: glass && !glow, opacity: glass && !glow ? (tinted ? 0.86 : 0.3) : 1, ...(glow ? { emissive: color, emissiveIntensity: 1.6 } : {}) };
    // (a turned or lofted shell is open at its ends or its inside: drawn on both its faces; paint and glass take a clear
    // coat, the gloss that shows a body's shape in what it reflects)
    m = lk && lk.clear > 0 ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: lk.clear * (1 - w), clearcoatRoughness: 0.03 + w * 0.3, ...(aniso > 0 && lk.flake === 0 ? { anisotropy: aniso, anisotropyRotation: Math.PI / 2 } : {}) })
      : (f?.coat || glass) && !w && !lk ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: f?.coat ?? 1, clearcoatRoughness: 0.04 }) : aniso > 0 ? new THREE.MeshPhysicalMaterial({ ...base, anisotropy: aniso, anisotropyRotation: Math.PI / 2 }) : new THREE.MeshStandardMaterial(base); if (open) m.side = THREE.DoubleSide;
    // (its grain by its finish; a rubber or a moulding with none said takes its making's)
    const worn: Worn | undefined = look && (look.wear || look.graphics?.length) ? { wear: look.wear ?? 0, ...(lk?.under ? { under: lk.under } : {}), ...(look.graphics ? { graphics: look.graphics } : {}) } : undefined;
    const gr = lk?.flake ? GRAIN.flake : GRAIN[finish ?? (rubber ? 'tread' : /^(abs|pp|pe|nylon|pbt|pc)$/.test(mat ?? '') ? 'texture' : '')]; if ((gr || worn) && !glow && !glass) grained(m, gr ?? NO_GRAIN, worn);
    mats.set(key, m);
  }
  return m;
};
/** A loft drawn: its stations eased into each other (a cubic through them, every span split six times), each a ring
 *  of its superellipse, its two ends closed. */
function loftGeometry(l: Loft): THREE.BufferGeometry {
  // (taken from the back forward, so its faces look outward whichever way its stations were given)
  const st = [...l.st].sort((a, b) => a.x - b.x), K = 40, out: Station[] = [], at = (i: number) => st[Math.max(0, Math.min(st.length - 1, i))]!;
  const cub = (p0: number, p1: number, p2: number, p3: number, t: number) => { const m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2, t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2; };
  for (let i = 0; i < st.length - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6, f = (g: (s: Station) => number) => cub(g(at(i - 1)), g(at(i)), g(at(i + 1)), g(at(i + 2)), t); out.push({ x: f((s) => s.x), w: Math.max(0, f((s) => s.w)), lo: f((s) => s.lo), hi: f((s) => s.hi), n: Math.max(1.5, f((s) => s.n ?? 2)), wt: Math.max(0, f((s) => s.wt ?? s.w)), nt: Math.max(1.5, f((s) => s.nt ?? s.n ?? 2)), mid: f((s) => s.mid ?? (s.lo + s.hi) / 2), z: f((s) => s.z ?? 0) }); }
  out.push(st[st.length - 1]!);
  const pos: number[] = [], idx: number[] = [];
  for (const s of out) for (let j = 0; j < K; j++) { const [y, z] = sectionPoint(s, (j / K) * 2 * Math.PI); pos.push(s.x, y, z + (s.z ?? 0)); }
  for (let i = 0; i < out.length - 1; i++) for (let j = 0; j < K; j++) { const a = i * K + j, b = i * K + ((j + 1) % K), c = a + K, d = b + K; idx.push(a, c, b, b, c, d); }
  for (const [ring, flip] of [[0, true], [out.length - 1, false]] as const) { const s = out[ring]!, ci = pos.length / 3; pos.push(s.x, (s.hi + s.lo) / 2, s.z ?? 0); for (let j = 0; j < K; j++) { const a = ring * K + j, b = ring * K + ((j + 1) % K); if (flip) idx.push(ci, a, b); else idx.push(ci, b, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** A bent tube drawn along its straights and bends. */
function tubeGeometry(t: Tube): THREE.BufferGeometry {
  const path = new THREE.CurvePath<THREE.Vector3>(), v = (q: number[]) => new THREE.Vector3(q[0], q[1], q[2]), legs = tubeLegs(t);
  for (const l of legs) path.add(l.kind === 'line' ? new THREE.LineCurve3(v(l.a), v(l.b)) : new THREE.QuadraticBezierCurve3(v(l.a), v(l.c!), v(l.b)));
  // (six segments to a leg for a few long ones (a bent pipe's bends round), two for many short ones (a coil, a thread))
  return legs.length ? new THREE.TubeGeometry(path, Math.max(8, Math.min(legs.length * 6, 40 + legs.length * 2)), t.r, legs.length > 40 ? 8 : 12, false) : new THREE.BufferGeometry();
}
/** A turned profile with its corners kept sharp: the profile split where it turns by more than 30° (a pulley's flange,
 *  a piston's crown, a nut's chamfer), each run turned on its own and the runs joined, so each face keeps its own normal
 *  and a flat face is drawn flat, not rounded into its neighbour (a lathe's normals are otherwise averaged round the
 *  whole profile, and a pulley comes out a bulb). */
function sharpLathe(pts: [number, number][], facets: number): THREE.BufferGeometry {
  const v = pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), runs: THREE.Vector2[][] = [[v[0]!]];
  for (let i = 1; i < v.length; i++) {
    runs[runs.length - 1]!.push(v[i]!);
    if (i < v.length - 1) { const a = v[i]!.clone().sub(v[i - 1]!), b = v[i + 1]!.clone().sub(v[i]!); if (a.lengthSq() > 0 && b.lengthSq() > 0 && Math.abs(a.angle() - b.angle()) % (2 * Math.PI) > 0.52 && Math.abs(Math.abs(a.angle() - b.angle()) - 2 * Math.PI) > 0.52) runs.push([v[i]!]); }
  }
  const geos = runs.filter((r) => r.length >= 2).map((r) => { return new THREE.LatheGeometry(r, facets).toNonIndexed(); });
  if (geos.length === 1) return geos[0]!;
  const m = mergeGeometries(geos, false); return m ?? new THREE.LatheGeometry(v, facets);
}
/** A cylinder (or a tapered one) with its rims rounded to r: a lathed profile. */
export function filletCyl(r0: number, h: number, r1: number, f: number, seg = 24): THREE.BufferGeometry {
  if (f < 1e-4) return new THREE.CylinderGeometry(r1, r0, h, seg);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -h / 2)], arc = (cx: number, cy: number, a0: number, a1: number) => { for (let i = 0; i <= 4; i++) { const a = a0 + ((a1 - a0) * i) / 4; pts.push(new THREE.Vector2(cx + f * Math.cos(a), cy + f * Math.sin(a))); } };
  arc(r0 - f, -h / 2 + f, -Math.PI / 2, 0); arc(r1 - f, h / 2 - f, 0, Math.PI / 2); pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, seg);
}
/** A box's broad faces printed with characters (a number plate's): its face pair across its thinnest side textured,
 *  the rest plain. Drawn on a canvas where there is a document; plain where there is none. */
const printed = new Map<string, THREE.CanvasTexture>();
function printedMats(p: Part, base: THREE.Material): THREE.Material | THREE.Material[] {
  if (!p.text || !p.shape || !('box' in p.shape) || typeof document === 'undefined') return base;
  const [w, h, d] = p.shape.box, k = w <= h && w <= d ? 0 : h <= d ? 1 : 2, [a, b] = k === 0 ? [d, h] : k === 1 ? [w, d] : [w, h], key = `${p.text}|${a.toFixed(3)}|${b.toFixed(3)}`;
  let tex = printed.get(key);
  if (!tex) { const c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(64, Math.round((1024 * b) / a)); const x = c.getContext('2d')!; x.fillStyle = '#' + new THREE.Color(p.color ?? 0xffffff).getHexString(); x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#1a1a1a'; x.lineWidth = c.height * 0.05; x.strokeRect(c.height * 0.04, c.height * 0.04, c.width - c.height * 0.08, c.height - c.height * 0.08); x.fillStyle = '#141414'; x.font = `bold ${Math.round(c.height * 0.68)}px "DejaVu Sans Mono", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(p.text, c.width / 2, c.height * 0.54); tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; printed.set(key, tex); }
  // (a plate's face is a printed film, not bare metal)
  const face = (base as THREE.MeshStandardMaterial).clone(); face.map = tex; face.color = new THREE.Color(0xffffff); face.metalness = 0.05; face.roughness = 0.45;
  // (BoxGeometry's faces in order: +x, -x, +y, -y, +z, -z)
  return [0, 1, 2, 3, 4, 5].map((i) => (Math.floor(i / 2) === k ? face : base));
}
const thinnest = (s: Shape): number => ('box' in s ? Math.min(...s.box) : 'cyl' in s ? Math.min(2 * s.cyl[0], s.cyl[1]) : 'cone' in s ? s.cone[0] : 1);
/** A freeform skin as triangles: as finely as about 3 cm a step across it (between 6 and 96 steps each way), its normals
 *  the surface's own, so its highlights run as its curvature does. */
function surfGeometry(pt: Patch): THREE.BufferGeometry {
  // (a facet every 30 mm along it, and one for every 3° it turns: a tight corner is drawn round, not as a chord, so two
  // skins a few millimetres apart round it, as a lamp's lens over its housing, are drawn apart and not through each other)
  const run = (f: (t: number) => [number, number]): [number, number] => { let d = 0, turn = 0, q = patchAt(pt, ...f(0)).at, prev: number[] | null = null; for (let k = 1; k <= 32; k++) { const r = patchAt(pt, ...f(k / 32)).at, c = [r[0] - q[0], r[1] - q[1], r[2] - q[2]], l = Math.hypot(c[0]!, c[1]!, c[2]!); d += l; if (prev && l > 1e-9) { const pl = Math.hypot(prev[0]!, prev[1]!, prev[2]!); if (pl > 1e-9) turn += Math.acos(Math.max(-1, Math.min(1, (c[0]! * prev[0]! + c[1]! * prev[1]! + c[2]! * prev[2]!) / (l * pl)))); } if (l > 1e-9) prev = c; q = r; } return [d, turn]; };
  const steps = (rs: [number, number][]) => Math.max(6, Math.min(160, Math.round(Math.max(...rs.map(([d, turn]) => Math.max(d / 0.03, turn / 0.052))))));
  const t = tessellate(pt, steps([run((a) => [a, 0.5]), run((a) => [a, 0]), run((a) => [a, 1])]), steps([run((b) => [0.5, b]), run((b) => [0, b]), run((b) => [1, b])])), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nor, 3)); g.setIndex(t.idx);
  return g;
}
// ---- holes drilled in a part (Part.cuts): each a round (or n-sided) hole subtracted from its drawn shape --------------
// (a part's geometry with its holes is the same for every part shaped and drilled alike: a car's hundred M6 bolts are
// drilled once)
const drilled = new Map<string, THREE.BufferGeometry>(), csg = new Evaluator(), UP = new THREE.Vector3(0, 1, 0);
csg.attributes = ['position', 'normal']; csg.useGroups = false;
const clean = (g: THREE.BufferGeometry) => { const h = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal') h.deleteAttribute(k); if (!h.getAttribute('normal')) h.computeVertexNormals(); h.clearGroups(); return h; };
function drill(g: THREE.BufferGeometry, cuts: Cut[], key: string): THREE.BufferGeometry {
  const had = drilled.get(key); if (had) return had;
  let a = new Brush(clean(g)); a.updateMatrixWorld();
  for (const c of cuts) {
    // (a cylinder from just outside its face to its depth inside, its axis along the hole)
    const dir = new THREE.Vector3(...c.dir).normalize(), b = new Brush(clean(new THREE.CylinderGeometry(c.r, c.r, c.depth + 2e-4, c.n ?? 24)));
    b.quaternion.setFromUnitVectors(UP, dir); b.position.set(...c.at).addScaledVector(dir, c.depth / 2 - 1e-4); b.updateMatrixWorld();
    a = csg.evaluate(a, b, SUBTRACTION);
  }
  const out = a.geometry; drilled.set(key, out); return out;
}
export function geometry(s: Shape, mat: string | undefined, make?: 'pressed', facets?: number): THREE.BufferGeometry | null {
  if ('ground' in s) return groundGeometry(s.ground);
  if ('surf' in s) return surfGeometry(s.surf);
  if ('loft' in s) return loftGeometry(s.loft);
  if ('tube' in s) return tubeGeometry(s.tube);
  // (turned, or with flat sides where it has them: a nut's six, round its bore)
  if ('lathe' in s) return sharpLathe(s.lathe, facets ?? 40);
  if ('prism' in s) { const sh = new THREE.Shape(s.prism.pts.map(([x, y]) => new THREE.Vector2(x, y))); for (const h of s.prism.holes ?? []) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))); const g = new THREE.ExtrudeGeometry(sh, { depth: s.prism.L, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -s.prism.L / 2); return g; }
  // a round part with flat sides (a hex head, a nut): its flats, its edges broken
  if (facets && 'cyl' in s) return new THREE.CylinderGeometry(s.cyl[2] ?? s.cyl[0], s.cyl[0], s.cyl[1], facets);
  const f = edgeRadius(mat, thinnest(s), make);
  if ('box' in s) { const [w, h, d] = s.box; return f > 1e-4 ? new RoundedBoxGeometry(w, h, d, 2, f) : new THREE.BoxGeometry(w, h, d); }
  if ('cyl' in s) { const [r, h, r2 = r] = s.cyl; return filletCyl(r2, h, r, f); }
  if ('sphere' in s) return new THREE.SphereGeometry(s.sphere, 18, 12);
  if ('cone' in s) return new THREE.ConeGeometry(s.cone[0], s.cone[1], 16);
  if ('torus' in s) return new THREE.TorusGeometry(s.torus[0], s.torus[1], 12, 28);
  if ('capsule' in s) return new THREE.CapsuleGeometry(s.capsule[0], s.capsule[1], 4, 12);
  return null;
}
/** Ground as it lies: its top on its heights, shaded lighter where it is high, and its sides down to its soil. */
function groundGeometry(g: Extract<Shape, { ground: unknown }>['ground']): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(g.w, g.d, g.n, g.n); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position!, lo = Math.min(...g.h), hi = Math.max(...g.h), cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const ix = Math.round((p.getX(i) / g.w + 0.5) * g.n), iz = Math.round((p.getZ(i) / g.d + 0.5) * g.n), y = g.h[iz * (g.n + 1) + ix] ?? 0; p.setY(i, y);
    const t = hi > lo ? (y - lo) / (hi - lo) : 0.5, k = 0.72 + 0.4 * t; cols.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals(); return geo;
}
/** A piece's geometry as the forge draws it: its shape, its flats, standing on its base where it grows from one, its
 *  holes drilled; made once for every piece shaped and drilled alike (src/nexus/view/space3d.ts instances it). */
const leafGeos = new Map<string, THREE.BufferGeometry | null>();
/** (Each part's geometry and materials kept with the part itself: a city draws the same piece a million times a frame, and
 *  its key, the shape written out, costs more than drawing it.) */
const geoOfPart = new WeakMap<Part, THREE.BufferGeometry | null>(), matOfPart = new WeakMap<Part, Map<string, THREE.MeshStandardMaterial>>();
export function leafGeometry(p: Part): THREE.BufferGeometry | null {
  const was = geoOfPart.get(p); if (was !== undefined) return was;
  const g = leafGeometryMade(p); geoOfPart.set(p, g); return g;
}
function leafGeometryMade(p: Part): THREE.BufferGeometry | null {
  if (!p.shape || 'stars' in p.shape || 'field' in p.shape || 'heap' in p.shape) return null;
  const key = JSON.stringify([p.shape, p.mat, p.make, p.facets, p.base, p.cuts]); if (leafGeos.has(key)) return leafGeos.get(key)!;
  let g = geometry(p.shape, p.mat, p.make, p.facets);
  if (g && p.base) { const s = p.shape, h = 'cyl' in s ? s.cyl[1] : 'cone' in s ? s.cone[1] : 'capsule' in s ? s.capsule[1] : 'box' in s ? s.box[1] : 0; g = g.clone(); g.translate(0, h / 2, 0); }
  if (g && p.cuts?.length) g = drill(g, p.cuts, key);
  leafGeos.set(key, g); return g;
}
/** What wear reads from a surface's own shape, on each vertex, made once per geometry: its mean curvature (from each edge
 *  of the mesh, (n_j − n_i)·(p_j − p_i)/|p_j − p_i|², averaged where its copies meet: 1/R on a ball, negative in a
 *  hollow), and its distance to the nearest sharp feature (a crease where copies of a point disagree on its normal, or a
 *  rounded edge tighter than 4 mm): a coat chips first along that distance's smallest values. Interpolated between
 *  vertices, so it does not depend on how big the piece is on screen. */
export function surfaceShape(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.attributes.aEdge) return g;
  const P = g.attributes.position!, Nm = g.attributes.normal, N = P.count; if (!Nm) return g;
  g.computeBoundingBox(); const size = g.boundingBox!.getSize(new THREE.Vector3()).length() || 1, eps = size * 1e-5;
  const group = new Int32Array(N), seen = new Map<string, number>(), firstN: number[][] = [], crease: boolean[] = [];
  for (let i = 0; i < N; i++) {
    const k = `${Math.round(P.getX(i) / eps)},${Math.round(P.getY(i) / eps)},${Math.round(P.getZ(i) / eps)}`; let gi = seen.get(k);
    if (gi === undefined) { gi = firstN.length; seen.set(k, gi); firstN.push([Nm.getX(i), Nm.getY(i), Nm.getZ(i)]); crease.push(false); }
    else { const f = firstN[gi]!; if (f[0]! * Nm.getX(i) + f[1]! * Nm.getY(i) + f[2]! * Nm.getZ(i) < 0.9) crease[gi] = true; }
    group[i] = gi;
  }
  const G = firstN.length, kSum = new Float64Array(G), kN = new Float64Array(G), idx = g.index;
  const tri = (t: number, c: number) => (idx ? idx.getX(t * 3 + c) : t * 3 + c), T = (idx ? idx.count : N) / 3;
  const edge = (a: number, b: number) => {
    const dx = P.getX(b) - P.getX(a), dy = P.getY(b) - P.getY(a), dz = P.getZ(b) - P.getZ(a), l2 = dx * dx + dy * dy + dz * dz; if (l2 < eps * eps) return;
    const k = ((Nm.getX(b) - Nm.getX(a)) * dx + (Nm.getY(b) - Nm.getY(a)) * dy + (Nm.getZ(b) - Nm.getZ(a)) * dz) / l2;
    kSum[group[a]!] += k; kN[group[a]!]++; kSum[group[b]!] += k; kN[group[b]!]++;
  };
  for (let t = 0; t < T; t++) { const a = tri(t, 0), b = tri(t, 1), c = tri(t, 2); edge(a, b); edge(b, c); edge(c, a); }
  const kOf = (gi: number) => (kN[gi] ? kSum[gi]! / kN[gi]! : 0), feat: number[] = [];
  for (let i = 0; i < N; i++) { const gi = group[i]!; if (crease[gi] || kOf(gi) > 250) feat.push(i); }
  const curv = new Float32Array(N), dist = new Float32Array(N).fill(1e3);
  const step = Math.max(1, Math.ceil((feat.length * N) / 4e6));
  for (let i = 0; i < N; i++) {
    curv[i] = kOf(group[i]!); const x = P.getX(i), y = P.getY(i), z = P.getZ(i); let best = 1e3;
    for (let f = 0; f < feat.length; f += step) { const j = feat[f]!, dx = P.getX(j) - x, dy = P.getY(j) - y, dz = P.getZ(j) - z, d = dx * dx + dy * dy + dz * dz; if (d < best) best = d; }
    dist[i] = Math.sqrt(best);
  }
  g.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1)); g.setAttribute('aEdge', new THREE.BufferAttribute(dist, 1)); return g;
}
/** A piece's material as the forge draws it, with a colour, material or finish placed over it. */
const groundMats = new Map<string, THREE.MeshStandardMaterial>();
export function leafMaterial(p: Part, over: { color?: number; mat?: string; finish?: string; look?: Look } = {}): THREE.MeshStandardMaterial {
  const k = `${over.color ?? ''}|${over.mat ?? ''}|${over.finish ?? ''}|${over.look ? JSON.stringify(over.look) : ''}`; let byOver = matOfPart.get(p); if (!byOver) { byOver = new Map(); matOfPart.set(p, byOver); }
  const was = byOver.get(k); if (was) return was;
  const m = leafMaterialMade(p, over); byOver.set(k, m); return m;
}
function leafMaterialMade(p: Part, over: { color?: number; mat?: string; finish?: string; look?: Look }): THREE.MeshStandardMaterial {
  // ground is shaded by its height, which its vertices carry
  if (p.shape && 'ground' in p.shape) { const c = over.color ?? p.color ?? 0x5d8a3a, k = String(c); return groundMats.get(k) ?? groundMats.set(k, new THREE.MeshStandardMaterial({ color: c, vertexColors: true, roughness: 0.95 })).get(k)!; }
  return matFor(over.color ?? p.color ?? 0x999999, over.mat ?? p.mat, !!p.glow, over.finish ?? p.finish, p.wear, !!p.shape && ('lathe' in p.shape || 'loft' in p.shape || 'surf' in p.shape), over.look ?? p.look);
}
/** A galaxy's stars: on logarithmic spiral arms r = a e^(θ tan φ) (a bar across the middle if it is barred), a bulge of
 *  old stars, the disc thin; drawn as points, each going round at a flat rotation curve's speed (ω = v / r). */
function galaxy(g: Extract<Shape, { stars: unknown }>['stars']): { obj: THREE.Points; turn: (dt: number) => void } {
  let s = g.seed >>> 0 || 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }, gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const n = g.n, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), rad = new Float32Array(n), ang = new Float32Array(n), hgt = new Float32Array(n), R = g.radius, k = Math.tan((g.pitch * Math.PI) / 180), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let rr: number, a: number, y: number; const inBulge = r() < g.bulge * (g.kind === 'elliptical' ? 3 : 1);
    if (g.kind === 'elliptical' || inBulge) { rr = Math.abs(gauss()) * R * (g.kind === 'elliptical' ? 0.35 : g.bulge * 0.6); a = r() * Math.PI * 2; y = gauss() * rr * (g.kind === 'elliptical' ? 1 - g.flat / 10 : 0.6); }
    else if (g.kind === 'irregular') { rr = Math.sqrt(r()) * R * 0.7; a = r() * Math.PI * 2; y = gauss() * R * 0.04; }
    else {
      const arm = Math.floor(r() * g.arms), t = r(); rr = R * (0.08 + 0.92 * t);
      a = (arm / g.arms) * Math.PI * 2 + Math.log(rr / (R * 0.08)) / k + gauss() * (g.kind === 'lenticular' ? 3 : 0.28);
      if (g.kind === 'barred' && rr < R * 0.25) { a = (arm % 2) * Math.PI + gauss() * 0.15; }
      y = gauss() * R * 0.015;
    }
    rad[i] = rr; ang[i] = a; hgt[i] = y;
    const young = !inBulge && g.kind !== 'elliptical' ? 1 - g.tint / 2 : 0.1;
    c.setHSL(young > 0.5 ? 0.6 - 0.05 * r() : 0.08 + 0.05 * r(), 0.6, 0.55 + 0.35 * r()); col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const obj = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })); obj.frustumCulled = false;
  const turn = (dt: number) => { for (let i = 0; i < n; i++) { ang[i]! += (dt * 0.08 * R) / Math.max(rad[i]!, R * 0.05); pos[i * 3] = Math.cos(ang[i]!) * rad[i]!; pos[i * 3 + 1] = hgt[i]!; pos[i * 3 + 2] = Math.sin(ang[i]!) * rad[i]!; } geo.attributes.position!.needsUpdate = true; };
  turn(0); return { obj, turn };
}
/** Land on a table: relief by noise for its kind, water at its level. */
function land(f: Extract<Shape, { field: unknown }>['field']): THREE.Group {
  const g = new THREE.Group(), seg = 96, geo = new THREE.PlaneGeometry(f.size, f.size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position!, c = new THREE.Color(f.color), cols = new Float32Array(p.count * 3), h = (x: number, z: number) => Math.sin(x * 3.1 + f.seed) * Math.cos(z * 2.7 + f.seed * 0.7) * 0.5 + Math.sin(x * 7.3 - z * 5.1 + f.seed) * 0.25 + Math.sin(x * 15 + z * 13) * 0.08;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / f.size, z = p.getZ(i) / f.size, edge = Math.min(1, (0.5 - Math.max(Math.abs(x), Math.abs(z))) * 8);
    let y = h(x * 6, z * 6); if (f.kind === 'canyon') y -= Math.max(0, 0.6 - Math.abs(x) * 6) * 1.5; if (f.kind === 'mesa') y = Math.min(0.5, y * 2); if (f.kind === 'dunes') y = Math.abs(Math.sin(x * 20 + z * 4)) * 0.5; if (f.kind === 'islands') y -= 0.2;
    y = Math.max(-0.5, y) * f.relief * Math.max(0, edge); p.setY(i, y);
    const shade = new THREE.Color(f.color).multiplyScalar(0.8 + 0.4 * (y / (f.relief || 1))); if (f.kind === 'mountains' && y > f.relief * 0.6) shade.set(0xf2f4f8); cols.set([shade.r, shade.g, shade.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals(); void c;
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));
  if (f.water > 0) { const w = new THREE.Mesh(new THREE.PlaneGeometry(f.size, f.size), new THREE.MeshStandardMaterial({ color: 0x1f6a8a, transparent: true, opacity: 0.7, roughness: 0.1 })); w.rotation.x = -Math.PI / 2; w.position.y = f.relief * (f.water - 0.45); g.add(w); }
  return g;
}

/** A heap of like things in a cone: as many as it holds drawn, up to 20,000 (those on its surface, as you would see). */
function heap(h: Extract<Shape, { heap: unknown }>['heap']): THREE.Object3D {
  let s = h.seed >>> 0 || 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const n = Math.min(h.n, 20000), [w, hh, d] = h.size, geo = new RoundedBoxGeometry(w, hh, d, 1, edgeRadius('abs', hh)), m = new THREE.MeshStandardMaterial({ roughness: 0.35 }), inst = new THREE.InstancedMesh(geo, m, n);
  const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, u = h.n > n ? Math.sqrt(r()) : Math.cbrt(r()), y = h.h * (1 - u) * (h.n > n ? 1 : r()), rr = (h.r * (1 - y / h.h)) * (h.n > n ? 0.92 + 0.08 * r() : Math.sqrt(r()));
    e.set(r() * 6.28, r() * 6.28, r() * 6.28); q.setFromEuler(e); mat4.compose(new THREE.Vector3(Math.cos(a) * rr, y + hh / 2, Math.sin(a) * rr), q, one); inst.setMatrixAt(i, mat4);
    inst.setColorAt(i, c.set(h.colors[i % h.colors.length]!));
  }
  inst.castShadow = true; return inst;
}
/** A thing drawn from its parts; up to so many of its lights really lit (the rest glow). */
let blob: THREE.CanvasTexture | null = null;
const blobTexture = (): THREE.CanvasTexture | null => {
  if (blob) return blob; if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); if (!x) return null;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); blob = new THREE.CanvasTexture(c); return blob;
};
/** The ground's shading under a thing that rests on it: one soft patch its footprint's size, and a darker one under each
 *  part that touches the ground. Null for a thing that does not rest on the ground (or where there is no canvas). */
function contactShadow(group: THREE.Group): THREE.Group | null {
  const tex = blobTexture(); if (!tex) return null;
  group.updateMatrixWorld(true); const all = new THREE.Box3().setFromObject(group); if (all.isEmpty() || all.min.y > 0.05) return null;
  const out = new THREE.Group(); out.name = 'contact shadow'; out.userData.decor = true;
  const patch = (cx: number, cz: number, sx: number, sz: number, opacity: number, lift: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.set(cx, all.min.y + lift, cz); m.renderOrder = 1; m.userData.decor = true; out.add(m);
  };
  const size = all.getSize(new THREE.Vector3()), ctr = all.getCenter(new THREE.Vector3());
  patch(ctr.x, ctr.z, size.x * 1.15, size.z * 1.2, 0.45, 0.002);
  const b = new THREE.Box3();
  group.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; b.setFromObject(m); if (b.isEmpty() || b.min.y > all.min.y + 0.01 || b.max.y - b.min.y < 0.02) return; const s2 = b.getSize(new THREE.Vector3()), c2 = b.getCenter(new THREE.Vector3()); patch(c2.x, c2.z, Math.max(0.05, s2.x) * 1.3, Math.max(0.05, s2.z) * 1.3, 0.55, 0.003); });
  return out;
}
export function kitView(root: Part, o: { maxLights?: number } = {}): KitView {
  const swingers: ((t: number, f: number) => void)[] = []; let clockT = 0;
  const group = new THREE.Group(), turners: ((dt: number) => void)[] = [], nodes: { obj: THREE.Object3D; home: THREE.Vector3; depth: number }[] = [];
  let lights = 0; const maxL = o.maxLights ?? 6;
  const draw = (p: Part, depth: number): THREE.Object3D => {
    const g = new THREE.Group(); g.name = p.name; g.userData.part = p;
    if (p.at) g.position.set(...p.at); if (p.rot) g.rotation.set(...p.rot);
    if (p.shape) {
      if ('stars' in p.shape) { const gx = galaxy(p.shape.stars); g.add(gx.obj); turners.push(gx.turn); }
      else if ('field' in p.shape) g.add(land(p.shape.field));
      else if ('heap' in p.shape) g.add(heap(p.shape.heap));
      else { const geo = geometry(p.shape, p.mat, p.make, p.facets); if (geo) { if (p.look?.wear) surfaceShape(geo); if (p.base) { const h = 'cyl' in p.shape ? p.shape.cyl[1] : 'cone' in p.shape ? p.shape.cone[1] : 'capsule' in p.shape ? p.shape.capsule[1] : 'box' in p.shape ? p.shape.box[1] : 0; geo.translate(0, h / 2, 0); } const m = new THREE.Mesh(p.cuts?.length ? drill(geo, p.cuts, JSON.stringify([p.shape, p.mat, p.make, p.facets, p.base, p.cuts])) : geo, printedMats(p, matFor(p.color ?? 0x999999, p.mat, (!!p.light && !('surf' in p.shape)) || !!p.glow, p.finish, p.wear, 'lathe' in p.shape || 'loft' in p.shape || 'surf' in p.shape, p.look))); m.castShadow = true; m.receiveShadow = true; m.name = p.name; m.userData.part = p; g.add(m); } }
    }
    else if (p.item && !p.parts?.length) {
      // a part that is an item of the inventory and has no shape of its own: drawn as that item looks, at its size (not
      // one drawn in its own parts, as a component from the library is: its parts are what it looks like)
      const it = findItem(p.item) ?? ((r) => (r && typeof r === 'object' ? r : null))(resolve(p.item)); if (it) { try { const o = meshOfLook(lookOf(it)); o.name = p.name; o.userData.part = p; g.add(o); } catch { /* an item with no look is left undrawn */ } }
    }
    if (p.light && lights < maxL) { const l = new THREE.PointLight(p.light.color, p.light.lm / (4 * Math.PI), 0, 2); g.add(l); lights++; }
    if (p.spin) { const period = p.spin; turners.push((dt) => { g.rotation.y += (2 * Math.PI * dt) / period; }); }
    if (p.swing) { const sw = p.swing, base = sw.axis === 'x' ? g.rotation.x : g.rotation.z; swingers.push((t, f) => { const a = f > 0 ? sw.amp * Math.sin(2 * Math.PI * (f * t + sw.phase)) : 0; if (sw.axis === 'x') g.rotation.x = base + a; else g.rotation.z = base + a; }); }
    for (const q of p.parts ?? []) g.add(draw(q, depth + 1));
    nodes.push({ obj: g, home: g.position.clone(), depth });
    return g;
  };
  group.add(draw(root, 0));
  // grounded: what rests on the ground darkens the ground under it (the sky's light taken by what is over it), softly
  // under its whole footprint and more where it touches (a tyre, a foot). Drawn, not cast, so it costs nothing on a
  // headset that cannot afford shadow maps, and a thing never looks as if it floats.
  const shade = contactShadow(group); if (shade) group.add(shade);
  const box = new THREE.Box3();
  const view: KitView = {
    group, lights, gait: 0,
    update: (dt) => { for (const t of turners) t(dt); clockT += dt; for (const s of swingers) s(clockT, view.gait); },
    /** Taken apart to so many levels: each part at that depth or less drawn out from its holder's middle, by its size. */
    explode(level) {
      for (const n of nodes) n.obj.position.copy(n.home);
      if (level <= 0) return;
      // (each part out from the middle of what holds it, along the line from that middle to its own, so a motor's bells,
      // stack, rotor and bearings part along its axis and a bearing's balls go out round it; the pieces of one part, under
      // its own name, stay together)
      group.updateMatrixWorld(true); const mids = new Map<THREE.Object3D, { c: THREE.Vector3; size: number }>(), cores = new Map<THREE.Object3D, THREE.Object3D[]>(), moves: [THREE.Object3D, THREE.Vector3][] = [], q = new THREE.Quaternion(), pc = new THREE.Vector3(), cc = new THREE.Vector3();
      for (const n of nodes) {
        const par = n.obj.parent; if (n.depth === 0 || n.depth > level || !par || n.obj.name === par.name) continue;
        // (the middle of what holds it: its parts' middles weighed by their mass, so a motor's long light leads do not draw it aside)
        let mid = mids.get(par); if (!mid) { const acc = new THREE.Vector3(); let w = 0; for (const k of par.children) { box.setFromObject(k); if (box.isEmpty()) continue; const sz = box.getSize(new THREE.Vector3()), kp = k.userData.part as Part | undefined, v = Math.max(1e-12, kp ? massOf(kp) || sz.x * sz.y * sz.z : sz.x * sz.y * sz.z); acc.add(box.getCenter(new THREE.Vector3()).multiplyScalar(v)); w += v; } box.setFromObject(par); mid = { c: w ? acc.divideScalar(w) : box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() || 1 }; mids.set(par, mid); }
        pc.copy(mid.c); const size = mid.size; box.setFromObject(n.obj); if (box.isEmpty()) continue; box.getCenter(cc);
        const dir = cc.sub(pc);
        // (a part at the middle of what holds it, a rotor in its stator, is drawn out along the length of what is there: the
        // heaviest there stays, the others out one way and the next the other, each further than the last)
        if (dir.length() < 0.05 * size) { const core = cores.get(par) ?? cores.set(par, []).get(par)!; core.push(n.obj); continue; }
        par.getWorldQuaternion(q); dir.normalize().applyQuaternion(q.invert());
        // (its own vector: the middle it was found from is reused for the next part)
        moves.push([n.obj, dir.clone().multiplyScalar((size * 0.6) / n.depth)]);
      }
      // (those at the middle of what holds it go out along its length, each kind beyond the last: what it is itself, the
      // pieces under its own name (a guideway's rail), stays, else its heaviest kind (a motor's stator); then, heaviest
      // first, one kind past its one end and the next past the other, every piece of one name together (a carriage's
      // balls), each clear of the last by a quarter of its own length and a twentieth of what stays)
      const span = (os: THREE.Object3D[], a: THREE.Vector3): [number, number] => { box.makeEmpty(); for (const o of os) box.expandByObject(o); if (box.isEmpty()) return [0, 0]; let lo = Infinity, hi = -Infinity; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const t = a.x * x + a.y * y + a.z * z; lo = Math.min(lo, t); hi = Math.max(hi, t); } return [lo, hi]; };
      for (const [par, objs] of cores) {
        const own = par.children.filter((k) => k.name === par.name && k.userData.part), kg = (o: THREE.Object3D) => massOf((o.userData.part as Part | undefined) ?? { name: '' }), kinds = new Map<string, { objs: THREE.Object3D[]; kg: number }>();
        for (const o of objs) { const k = kinds.get(o.name) ?? kinds.set(o.name, { objs: [], kg: 0 }).get(o.name)!; k.objs.push(o); k.kg += kg(o); }
        const order = [...kinds.values()].sort((a, b) => b.kg - a.kg), stay = own.length ? own : order[0]!.objs, go = own.length ? order : order.slice(1);
        if (!go.length) continue;
        box.makeEmpty(); for (const o of [...stay, ...objs]) box.expandByObject(o); const sz = box.getSize(new THREE.Vector3()), ax = sz.x >= sz.y && sz.x >= sz.z ? new THREE.Vector3(1, 0, 0) : sz.y >= sz.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
        const [s0, s1] = span(stay, ax), gap0 = 0.05 * (s1 - s0); let hi = s1, lo = s0;
        par.getWorldQuaternion(q); const inv = q.clone().invert();
        go.forEach((k, i) => {
          const [k0, k1] = span(k.objs, ax), gap = gap0 + 0.25 * (k1 - k0), t = i % 2 ? lo - gap - k1 : hi + gap - k0;
          if (i % 2) lo = k0 + t; else hi = k1 + t;
          const d = ax.clone().multiplyScalar(t).applyQuaternion(inv); for (const o of k.objs) moves.push([o, d]);
        });
      }
      // (and nothing parted onto another: each out in turn, the nearest first, on along its own way until it is clear of
      // what stays and of what is already out, the pieces that move as one tested as one)
      const units = new Map<THREE.Vector3, THREE.Object3D[]>(); for (const [o, d] of moves) (units.get(d) ?? units.set(d, []).get(d)!).push(o);
      const byPar = new Map<THREE.Object3D, { d: THREE.Vector3; objs: THREE.Object3D[] }[]>();
      for (const [d, objs] of units) { const par = objs[0]!.parent; if (par) (byPar.get(par) ?? byPar.set(par, []).get(par)!).push({ d, objs }); }
      const bbOf = (os: THREE.Object3D[]) => { const b = new THREE.Box3(); for (const o of os) b.expandByObject(o); return b; };
      for (const [par, us] of byPar) {
        const moving = new Set(us.flatMap((u) => u.objs)), placed = par.children.filter((k) => !moving.has(k)).map((k) => new THREE.Box3().setFromObject(k)).filter((b) => !b.isEmpty());
        par.getWorldQuaternion(q); const back = q.clone().invert(), ws = par.getWorldScale(new THREE.Vector3()).x || 1, m = 1e-5;
        us.sort((a, b) => a.d.lengthSq() - b.d.lengthSq());
        for (const u of us) {
          const home = bbOf(u.objs); if (home.isEmpty() || u.d.lengthSq() < 1e-14) continue;
          const dw = u.d.clone().applyQuaternion(q).multiplyScalar(ws), step = dw.clone().normalize().multiplyScalar(Math.max(dw.length() * 0.15, home.getSize(new THREE.Vector3()).length() * 0.5)), at = home.clone().translate(dw);
          const hits = () => placed.some((b) => at.min.x < b.max.x - m && at.max.x > b.min.x + m && at.min.y < b.max.y - m && at.max.y > b.min.y + m && at.min.z < b.max.z - m && at.max.z > b.min.z + m);
          let k = 0; while (k < 24 && hits()) { at.translate(step); dw.add(step); k++; }
          if (k) u.d.copy(dw.divideScalar(ws).applyQuaternion(back));
          placed.push(at);
        }
      }
      for (const [o, d] of moves) o.position.add(d);
    },
    dispose: () => group.traverse((x) => { (x as THREE.Mesh).geometry?.dispose(); }),
  };
  return view;
}

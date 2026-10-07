// A human body laid out in space from its proportions: where every joint, bone, organ and muscle is, and the shape of
// the skin round them, for any height and build. Nothing is drawn here (src/nexus/view/organic.ts draws it); this is
// the body as numbers, so it can be checked and changed.
//
// The proportions are measured ones. Joint heights as fractions of stature from Drillis & Contini (1966), as Winter's
// Biomechanics and Motor Control of Human Movement tabulates them (shoulder 0.818 H, elbow 0.630, wrist 0.485, hip
// 0.530, knee 0.285, ankle 0.039; shoulder width 0.259 H, hip width 0.191, foot 0.152); the long bones' lengths from
// stature by Trotter & Gleser (1952); girths typical of men (ANSUR II-like means, typical); the face by Farkas's
// norms (its thirds equal, the eyes an eye's width apart, the mouth as wide as the pupils are apart, typical). Each is a
// parameter you can change: the body is worked out again from them.

export type V3 = [number, number, number];
/** What a body is worked out from: each a number, with its default and its range. */
export interface BodyParams {
  /** stature, m */ height: number;
  /** body mass, kg */ mass: number;
  /** shoulders' width over a typical man's */ shoulders: number;
  /** hips' width over a typical man's */ hips: number;
  /** legs' length over a typical man's share of his height */ legs: number;
  /** arms' length over a typical man's */ arms: number;
  /** head's size over a typical man's */ head: number;
  /** muscle over typical (girth of limbs and chest) */ muscle: number;
  /** fat over typical (girth of the trunk most) */ fat: number;
  /** the face: eyes apart, eye size, nose length, nose width, mouth width, lips, jaw width, chin, brow, cheekbones, ears */
  eyesApart: number; eyeSize: number; noseLength: number; noseWidth: number; mouthWidth: number; lips: number; jaw: number; chin: number; brow: number; cheeks: number; ears: number;
  /** 0 male (XY), 1 female (XX) */ sex: number;
}
export const PARAMS: { key: keyof BodyParams; name: string; def: number; min: number; max: number; step: number; says: string }[] = [
  { key: 'height', name: 'height', def: 1.76, min: 1.4, max: 2.1, step: 0.02, says: 'm: ICRP 89\'s reference man is 176 cm' },
  { key: 'mass', name: 'mass', def: 73, min: 45, max: 140, step: 1, says: 'kg: ICRP 89\'s reference man is 73 kg' },
  { key: 'shoulders', name: 'shoulders', def: 1, min: 0.8, max: 1.25, step: 0.02, says: 'width over 0.259 × height (Drillis & Contini)' },
  { key: 'hips', name: 'hips', def: 1, min: 0.8, max: 1.3, step: 0.02, says: 'width over 0.191 × height' },
  { key: 'legs', name: 'legs', def: 1, min: 0.88, max: 1.12, step: 0.01, says: 'length over a typical man\'s (hip at 0.53 × height)' },
  { key: 'arms', name: 'arms', def: 1, min: 0.88, max: 1.12, step: 0.01, says: 'length over a typical man\'s' },
  { key: 'head', name: 'head', def: 1, min: 0.85, max: 1.15, step: 0.01, says: 'size over a typical man\'s (0.13 × height chin to crown)' },
  { key: 'muscle', name: 'muscle', def: 1, min: 0.7, max: 1.5, step: 0.05, says: 'over a typical man\'s' },
  { key: 'fat', name: 'fat', def: 1, min: 0.5, max: 2.2, step: 0.05, says: 'over a typical man\'s (18 kg of fat tissue)' },
  { key: 'eyesApart', name: 'eyes apart', def: 1, min: 0.85, max: 1.15, step: 0.01, says: 'pupils 63 mm apart (typical)' },
  { key: 'eyeSize', name: 'eye size', def: 1, min: 0.85, max: 1.2, step: 0.01, says: 'eyeball 24 mm across' },
  { key: 'noseLength', name: 'nose length', def: 1, min: 0.8, max: 1.25, step: 0.01, says: 'about a third of the face' },
  { key: 'noseWidth', name: 'nose width', def: 1, min: 0.8, max: 1.3, step: 0.01, says: 'about the eyes\' gap (Farkas)' },
  { key: 'mouthWidth', name: 'mouth width', def: 1, min: 0.8, max: 1.25, step: 0.01, says: 'about the pupils\' distance apart (Farkas)' },
  { key: 'lips', name: 'lips', def: 1, min: 0.6, max: 1.6, step: 0.05, says: 'fullness' },
  { key: 'jaw', name: 'jaw width', def: 1, min: 0.85, max: 1.2, step: 0.01, says: 'about 0.75 of the cheekbones\' width (typical)' },
  { key: 'chin', name: 'chin', def: 1, min: 0.7, max: 1.4, step: 0.05, says: 'how far it comes forward' },
  { key: 'brow', name: 'brow', def: 1, min: 0.6, max: 1.5, step: 0.05, says: 'the ridge over the eyes' },
  { key: 'cheeks', name: 'cheekbones', def: 1, min: 0.8, max: 1.3, step: 0.02, says: 'width and height' },
  { key: 'ears', name: 'ears', def: 1, min: 0.8, max: 1.3, step: 0.02, says: 'about 62 mm tall (typical)' },
  { key: 'sex', name: 'sex', def: 0, min: 0, max: 1, step: 1, says: '0 male (XY: ICRP 89\'s reference man), 1 female (XX)' },
];
export const DEFAULT_BODY: BodyParams = Object.fromEntries(PARAMS.map((p) => [p.key, p.def])) as unknown as BodyParams;
export const bodyOf = (p: Partial<BodyParams> = {}): BodyParams => { const out = { ...DEFAULT_BODY }; for (const q of PARAMS) { const v = p[q.key]; if (typeof v === 'number' && Number.isFinite(v)) out[q.key] = Math.min(q.max, Math.max(q.min, v)); } return out; };
export const bodyKey = (p: BodyParams): string => PARAMS.map((q) => p[q.key].toFixed(3)).join(',');

/** A primitive of the skin's shape: a capsule from a to b, radius r at a and r2 at b (a sphere when a is b). */
export interface Prim { a: V3; b: V3; r: number; r2: number; /** how softly it blends with the rest, m */ k: number; /** cut out of the rest, not added */ cut?: boolean }
/** A bone set in the body: its id, its two ends (its long axis), its box (mm, along, across, deep) and its side. */
export interface Placed { id: string; a: V3; b: V3; size: V3; side: 'L' | 'R' | ''; /** a direction it faces (its front), for flat bones */ face?: V3; /** for a rib, the points of its curve */ path?: V3[] }
export interface Body {
  params: BodyParams; H: number;
  joints: Record<string, V3>;
  bones: Placed[];
  organs: Placed[];
  muscles: Placed[];
  skin: Prim[];
  face: Prim[];
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
export const dist = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mirror = (v: V3): V3 => [-v[0], v[1], v[2]];

/** The body worked out from its parameters. Faces +z; its left is +x; feet on y = 0. */
export function layOut(p0: Partial<BodyParams> = {}): Body {
  const p = bodyOf(p0), H = p.height;
  // girth scales: a heavier body is wider by the square root of its mass over the height-scaled reference's
  const ref = 73 * (H / 1.76) ** 2.4, wide = Math.sqrt(p.mass / ref), fat = (p.fat - 1) * 0.5 + 1, mus = (p.muscle - 1) * 0.6 + 1;
  const trunkW = wide * Math.sqrt(fat), limbW = wide * Math.cbrt(mus) * Math.cbrt(fat);
  // heights: legs stretch the lower body, the rest keeps the stature
  const legK = p.legs, hipY = 0.53 * H * legK, kneeY = 0.285 * H * legK, ankleY = 0.039 * H;
  const above = H - hipY, upK = above / (0.47 * H), Y = (f: number) => hipY + (f - 0.53) * H * upK; // a height above the hip, fractions of a typical man's
  const headH = 0.13 * H * p.head, crown = H, chin = crown - headH;
  const shY = Math.min(Y(0.818), chin - 0.05 * H), shX = 0.115 * H * p.shoulders, hipX = 0.051 * H * p.hips;
  const arm = p.arms, upper = 0.186 * H * arm, fore = 0.146 * H * arm, hand = 0.108 * H * arm;
  const J: Record<string, V3> = {};
  J.crown = [0, crown, 0]; J.chin = [0, chin, 0.04 * H * p.head]; J.headC = [0, crown - headH * 0.48, -0.004 * H];
  J.neck = [0, chin - 0.01 * H, -0.01 * H]; J.c7 = [0, shY + 0.015 * H, -0.035 * H];
  J.sternumTop = [0, shY - 0.012 * H, 0.055 * H * trunkW]; J.xiphoid = [0, Y(0.69), 0.07 * H * trunkW];
  J.navel = [0, Y(0.6), 0.075 * H * trunkW * fat]; J.pubis = [0, hipY - 0.025 * H, 0.045 * H];
  for (const [s, k] of [['L', 1], ['R', -1]] as const) {
    const sh: V3 = [k * shX, shY - 0.012 * H, 0], el: V3 = [k * (shX + 0.018 * H), shY - 0.012 * H - upper, -0.005 * H], wr: V3 = [k * (shX + 0.03 * H), el[1] - fore, 0.012 * H];
    J[`shoulder${s}`] = sh; J[`elbow${s}`] = el; J[`wrist${s}`] = wr; J[`knuckle${s}`] = [k * (shX + 0.033 * H), wr[1] - hand * 0.45, 0.018 * H]; J[`fingertip${s}`] = [k * (shX + 0.035 * H), wr[1] - hand, 0.02 * H];
    J[`acromion${s}`] = [k * (shX + 0.012 * H), shY, -0.005 * H];
    J[`hip${s}`] = [k * hipX, hipY, 0]; J[`knee${s}`] = [k * hipX * 1.02, kneeY, 0.005 * H]; J[`ankle${s}`] = [k * hipX * 1.0, ankleY, -0.005 * H];
    J[`heel${s}`] = [k * hipX, 0.012 * H, -0.03 * H]; J[`toe${s}`] = [k * (hipX + 0.01 * H), 0.008 * H, 0.118 * H];
    J[`iliac${s}`] = [k * hipX * 1.65, Y(0.605), 0.005 * H];
  }
  const P = (id: string, a: V3, b: V3, mm: V3, side: Placed['side'] = '', more: Partial<Placed> = {}): Placed => ({ id, a, b, size: mm, side, ...more });
  const bones: Placed[] = [], both = (f: (s: 'L' | 'R', k: number) => void) => { f('L', 1); f('R', -1); };
  const hs = H / 1.76; // sizes of the bones scale with stature
  const mmS = (l: number, w: number, d: number): V3 => [l * hs, w * hs, d * hs];
  // ---- skull ----
  const hc = J.headC!, hk = p.head * hs;
  bones.push(P('frontal-bone', add(hc, [0, 0.03 * hk, 0.05 * hk]), add(hc, [0, 0.09 * hk, 0.02 * hk]), mmS(140, 120, 85).map((x) => x * p.head) as V3));
  both((s, k) => bones.push(P('parietal-bone', add(hc, [k * 0.055 * hk, 0.06 * hk, -0.02 * hk]), add(hc, [k * 0.02 * hk, 0.1 * hk, -0.03 * hk]), mmS(125, 110, 10), s)));
  both((s, k) => bones.push(P('temporal-bone', add(hc, [k * 0.07 * hk, -0.005 * hk, -0.01 * hk]), add(hc, [k * 0.07 * hk, 0.03 * hk, -0.01 * hk]), mmS(90, 70, 50), s)));
  bones.push(P('occipital-bone', add(hc, [0, -0.01 * hk, -0.09 * hk]), add(hc, [0, 0.05 * hk, -0.085 * hk]), mmS(120, 110, 60)));
  bones.push(P('sphenoid-bone', add(hc, [0, -0.015 * hk, 0.01 * hk]), add(hc, [0, 0, 0.02 * hk]), mmS(110, 60, 50)));
  bones.push(P('ethmoid-bone', add(hc, [0, -0.01 * hk, 0.06 * hk]), add(hc, [0, 0.005 * hk, 0.06 * hk]), mmS(50, 30, 40)));
  both((s, k) => { bones.push(P('nasal-bone', add(hc, [k * 0.004 * hk, -0.025 * hk, 0.095 * hk]), add(hc, [k * 0.006 * hk, -0.045 * hk, 0.1 * hk]), mmS(25, 10, 3), s)); bones.push(P('maxilla', add(hc, [k * 0.02 * hk, -0.05 * hk, 0.075 * hk]), add(hc, [k * 0.02 * hk, -0.08 * hk, 0.08 * hk]), mmS(60, 45, 40), s)); bones.push(P('lacrimal-bone', add(hc, [k * 0.018 * hk, -0.02 * hk, 0.08 * hk]), add(hc, [k * 0.018 * hk, -0.03 * hk, 0.08 * hk]), mmS(13, 8, 2), s)); bones.push(P('zygomatic-bone', add(hc, [k * 0.055 * hk * p.cheeks, -0.04 * hk, 0.055 * hk]), add(hc, [k * 0.062 * hk * p.cheeks, -0.025 * hk, 0.03 * hk]), mmS(50, 40, 15), s)); bones.push(P('palatine-bone', add(hc, [k * 0.01 * hk, -0.07 * hk, 0.04 * hk]), add(hc, [k * 0.01 * hk, -0.07 * hk, 0.06 * hk]), mmS(40, 25, 10), s)); bones.push(P('inferior-nasal-concha', add(hc, [k * 0.01 * hk, -0.055 * hk, 0.06 * hk]), add(hc, [k * 0.01 * hk, -0.055 * hk, 0.085 * hk]), mmS(40, 12, 5), s)); });
  bones.push(P('vomer', add(hc, [0, -0.06 * hk, 0.06 * hk]), add(hc, [0, -0.04 * hk, 0.08 * hk]), mmS(40, 30, 2)));
  bones.push(P('mandible', add(hc, [0, -0.11 * hk, 0.075 * hk * p.chin]), add(hc, [0, -0.07 * hk, 0.02 * hk]), mmS(100, 95 * p.jaw, 65)));
  both((s, k) => { const ear = add(hc, [k * 0.06 * hk, -0.01 * hk, -0.005 * hk]); for (const [id, l] of [['malleus', 8], ['incus', 7], ['stapes', 3.2]] as const) bones.push(P(id, ear, add(ear, [k * 0.004, -0.004, 0]), mmS(l, l * 0.5, l * 0.4), s)); });
  bones.push(P('hyoid', add(J.neck!, [0, 0.01 * H, 0.045 * H]), add(J.neck!, [0, 0.01 * H, 0.055 * H]), mmS(50, 30, 10)));
  // ---- spine: 24 vertebrae, sacrum and coccyx, on its curves ----
  const spineAt = (t: number): V3 => { // t 0 at the coccyx, 1 at the atlas
    const y = lerpN(hipY - 0.03 * H, chin - 0.005 * H, t), back = -0.04 * H * trunkW;
    const z = back + 0.012 * H * Math.sin(Math.PI * clamp((t - 0.05) / 0.3)) /* lumbar lordosis */ - 0.022 * H * Math.sin(Math.PI * clamp((t - 0.33) / 0.5)) /* thoracic kyphosis */ + 0.012 * H * Math.sin(Math.PI * clamp((t - 0.83) / 0.17)) /* cervical lordosis */;
    return [0, y, z];
  };
  const verts: [string, number, V3][] = [['coccyx', 0, [30, 25, 10]], ['sacrum', 0.06, [110, 110, 50]]];
  const vs = ['l5', 'l4', 'l3', 'l2', 'l1', 't12', 't11', 't10', 't9', 't8', 't7', 't6', 't5', 't4', 't3', 't2', 't1', 'c7', 'c6', 'c5', 'c4', 'c3', 'axis', 'atlas'];
  vs.forEach((v, k) => verts.push([v, 0.16 + (k / (vs.length - 1)) * 0.82, [v.startsWith('l') ? 85 : v.startsWith('t') ? 68 : 52, 40, v.startsWith('l') ? 29 : 22]]));
  for (const [id, t, sz] of verts) { const a = spineAt(t), b = spineAt(Math.min(1, t + 0.02)); bones.push(P(id, a, b, mmS(...sz))); }
  // ---- ribcage: twelve pairs from their vertebrae round to the sternum ----
  const tY = (n: number) => spineAt(0.16 + ((4 + 13 - n) / 23) * 0.82);
  bones.push(P('sternum', J.sternumTop!, J.xiphoid!, mmS(170, 40, 12)));
  const ribLen = [120, 180, 230, 260, 275, 285, 290, 280, 260, 230, 170, 120];
  for (let n = 1; n <= 12; n++) both((s, k) => {
    const back = tY(n), half = (0.07 + 0.035 * Math.sin((Math.PI * Math.min(n, 9)) / 10)) * H * trunkW, frontY = n <= 7 ? lerpN(J.sternumTop![1], J.xiphoid![1], (n - 1) / 6) : back[1] - 0.06 * H;
    const reach = n <= 10 ? 1 : 0.55, path: V3[] = [];
    for (let j = 0; j <= 12; j++) { const u = (j / 12) * reach, ang = u * Math.PI; path.push([k * Math.sin(ang) * half * (n === 1 ? 0.6 : 1), lerpN(back[1], frontY, u) - 0.03 * H * Math.sin(ang) * (n / 12), back[2] + (1 - Math.cos(ang)) * 0.5 * (0.13 * H * trunkW * (n <= 7 ? 1 : 0.9))]); }
    bones.push(P(`rib-${n}`, path[0]!, path.at(-1)!, mmS(ribLen[n - 1]!, n === 1 ? 25 : 15, n === 1 ? 6 : 9), s, { path }));
  });
  // ---- arms ----
  both((s, k) => {
    const sh = J[`shoulder${s}`]!, el = J[`elbow${s}`]!, wr = J[`wrist${s}`]!;
    bones.push(P('clavicle', add(J.sternumTop!, [k * 0.012 * H, 0.004 * H, 0]), J[`acromion${s}`]!, mmS(150, 15, 12), s));
    bones.push(P('scapula', add(sh, [-k * 0.045 * H, -0.02 * H, -0.05 * H]), add(sh, [-k * 0.05 * H, -0.1 * H, -0.06 * H]), mmS(160, 100, 30), s, { face: [0, 0, -1] }));
    bones.push(P('humerus', sh, el, [dist(sh, el) * 1000, 50 * hs, 45 * hs], s));
    bones.push(P('radius', add(el, [k * 0.01 * H, 0, 0.004 * H]), add(wr, [k * 0.012 * H, 0, 0]), [dist(el, wr) * 1000, 30 * hs, 22 * hs], s));
    bones.push(P('ulna', add(el, [-k * 0.004 * H, 0.008 * H, -0.004 * H]), add(wr, [-k * 0.006 * H, 0, 0]), [(dist(el, wr) + 0.01 * H) * 1000, 25 * hs, 30 * hs], s));
    const handLen = 0.108 * H * p.arms, down: V3 = [0, -1, 0];
    const carp = (id: string, dx: number, dy: number) => bones.push(P(id, add(wr, [k * dx * handLen, -dy * handLen, 0.005 * H]), add(wr, [k * dx * handLen, -(dy + 0.08) * handLen, 0.005 * H]), mmS(20, 14, 12), s));
    carp('scaphoid', 0.12, 0.06); carp('lunate', 0.02, 0.06); carp('triquetrum', -0.1, 0.07); carp('pisiform', -0.16, 0.06); carp('trapezium', 0.18, 0.15); carp('trapezoid', 0.09, 0.16); carp('capitate', 0, 0.16); carp('hamate', -0.12, 0.16);
    const fingerX = [0.26, 0.13, 0.02, -0.09, -0.19], mcLen = [0.4, 0.38, 0.37, 0.34, 0.31], phal = [[0.3, 0, 0.2], [0.26, 0.17, 0.12], [0.28, 0.19, 0.12], [0.26, 0.17, 0.11], [0.2, 0.13, 0.1]];
    for (let f = 0; f < 5; f++) {
      const base = add(wr, [k * fingerX[f]! * handLen * (f === 0 ? 0.8 : 1), -0.24 * handLen, 0.005 * H]), mcDir: V3 = f === 0 ? [k * 0.55, -0.83, 0.1] : [k * fingerX[f]! * 0.25, -1, 0];
      const mEnd = add(base, mul(norm(mcDir), mcLen[f]! * handLen * (f === 0 ? 0.75 : 1)));
      bones.push(P(`metacarpal-${f + 1}`, base, mEnd, mmS(mcLen[f]! * 160, 9, 8), s));
      let at = mEnd; const dir = f === 0 ? norm([k * 0.45, -0.9, 0.15]) : norm(add(down, [k * fingerX[f]! * 0.15, 0, 0]));
      (['hand-proximal-phalanx', 'hand-middle-phalanx', 'hand-distal-phalanx'] as const).forEach((id, j) => { const L = phal[f]![j]! * handLen; if (!L) return; const end = add(at, mul(dir, L)); bones.push(P(id, at, end, [L * 1000, 8 * hs, 6 * hs], s)); at = end; });
    }
  });
  // ---- pelvis and legs ----
  both((s, k) => {
    const hip = J[`hip${s}`]!, kn = J[`knee${s}`]!, an = J[`ankle${s}`]!;
    bones.push(P('hip-bone', add(hip, [k * 0.012 * H, 0.05 * H, -0.01 * H]), add(hip, [-k * 0.03 * H, -0.035 * H, 0.02 * H]), mmS(220, 160, 110), s, { face: [k * 0.6, 0, 0.8] }));
    // the long bones end to end, as Trotter & Gleser measured them: past the joints' centres by their heads and condyles
    const fa = add(hip, [k * 0.012 * H, 0.012 * H, 0]), fb = add(kn, [0, -0.015 * H, 0]), ta = add(kn, [-k * 0.004 * H, -0.012 * H, 0.004 * H]), tb = add(an, [0, 0.015 * H, 0]);
    bones.push(P('femur', fa, fb, [dist(fa, fb) * 1000, 50 * hs, 45 * hs], s));
    bones.push(P('patella', add(kn, [0, 0.012 * H, 0.03 * H]), add(kn, [0, -0.012 * H, 0.032 * H]), mmS(50, 45, 22), s));
    bones.push(P('tibia', ta, tb, [dist(ta, tb) * 1000, 45 * hs, 40 * hs], s));
    const pa = add(kn, [k * 0.022 * H, -0.02 * H, -0.006 * H]), pb = add(an, [k * 0.022 * H, -0.006 * H, -0.004 * H]);
    bones.push(P('fibula', pa, pb, [dist(pa, pb) * 1000, 15 * hs, 15 * hs], s));
    const heel = J[`heel${s}`]!, toe = J[`toe${s}`]!, fl = dist(heel, toe);
    const foot = (id: string, u: number, dx: number, y: number, len: number) => bones.push(P(id, add(lerp(heel, toe, u), [k * dx * fl, y * H, 0]), add(lerp(heel, toe, u + len), [k * dx * fl, y * H, 0]), mmS(len * 260, 22, 20), s));
    foot('calcaneus', 0, 0, 0.012, 0.3); foot('talus', 0.15, 0, 0.032, 0.22); foot('navicular', 0.36, 0.06, 0.03, 0.08); foot('cuboid', 0.36, -0.08, 0.018, 0.1); foot('medial-cuneiform', 0.45, 0.1, 0.022, 0.09); foot('intermediate-cuneiform', 0.45, 0.03, 0.026, 0.07); foot('lateral-cuneiform', 0.45, -0.04, 0.024, 0.08);
    const toeX = [0.11, 0.04, -0.03, -0.09, -0.15], mtL = [0.24, 0.29, 0.27, 0.26, 0.25], tph = [[0.11, 0, 0.08], [0.08, 0.04, 0.035], [0.07, 0.035, 0.035], [0.065, 0.03, 0.03], [0.06, 0.025, 0.03]];
    for (let f = 0; f < 5; f++) {
      const b0 = add(lerp(heel, toe, 0.54), [k * toeX[f]! * fl, 0.012 * H, 0]), e0 = add(b0, [k * toeX[f]! * 0.06 * fl, -0.008 * H, mtL[f]! * fl]);
      bones.push(P(`metatarsal-${f + 1}`, b0, e0, mmS(mtL[f]! * 260, 11, 11), s));
      let at = e0; (['foot-proximal-phalanx', 'foot-middle-phalanx', 'foot-distal-phalanx'] as const).forEach((id, j) => { const L = tph[f]![j]! * fl; if (!L) return; const end = add(at, [0, -0.002 * H, L]); bones.push(P(id, at, end, [L * 1000, 9 * hs, 7 * hs], s)); at = end; });
    }
  });
  // ---- organs, where they lie ----
  const T = (f: number) => Y(f), wT = trunkW, organs: Placed[] = [];
  const O = (id: string, c: V3, mm: V3, side: Placed['side'] = '', up: V3 = [0, 1, 0]) => organs.push(P(id, c, add(c, mul(up, (mm[0] / 1000) * hs)), mmS(...mm), side));
  O('brain', add(hc, [0, 0.02 * hk, -0.01 * hk]), [170 * p.head, 140 * p.head, 130 * p.head]);
  O('heart', [0.018 * H, T(0.71), 0.035 * H * wT], [120, 85, 60], '', norm([-0.3, 1, 0.2]));
  O('right-lung', [-0.055 * H * wT, T(0.725), 0.005 * H], [250, 150, 100], 'R'); O('left-lung', [0.058 * H * wT, T(0.725), 0.005 * H], [240, 130, 100], 'L');
  O('trachea', [0, T(0.795), 0.025 * H], [110, 20, 20]); O('larynx', add(J.neck!, [0, -0.005 * H, 0.04 * H]), [50, 45, 40]);
  O('liver', [-0.035 * H * wT, T(0.655), 0.03 * H * wT], [210, 160, 110], '', [1, 0.15, 0]); O('stomach', [0.04 * H * wT, T(0.645), 0.04 * H * wT], [250, 150, 80], '', norm([-0.4, 1, 0]));
  O('gallbladder', [-0.03 * H, T(0.635), 0.055 * H * wT], [90, 35, 35]); O('pancreas', [0.012 * H, T(0.635), 0.01 * H], [150, 50, 25], '', [1, 0.15, 0]); O('spleen', [0.07 * H * wT, T(0.66), -0.02 * H], [120, 70, 30]);
  O('small-intestine', [0, T(0.575), 0.04 * H * wT * fat], [300, 250, 100]); O('colon', [0, T(0.585), 0.03 * H * wT], [320, 260, 80]);
  O('kidney', [0.04 * H, T(0.625), -0.03 * H], [115, 55, 35], 'L'); O('kidney', [-0.04 * H, T(0.615), -0.03 * H], [115, 55, 35], 'R');
  O('bladder', [0, hipY + 0.005 * H, 0.03 * H], [90, 80, 60]); O('prostate', [0, hipY - 0.015 * H, 0.02 * H], [40, 30, 25]);
  O('thyroid', add(J.neck!, [0, -0.02 * H, 0.04 * H]), [50, 50, 20]); O('thymus', [0, T(0.775), 0.045 * H * wT], [50, 40, 10]);
  O('adrenal', [0.04 * H, T(0.655), -0.03 * H], [50, 25, 6], 'L'); O('adrenal', [-0.04 * H, T(0.645), -0.03 * H], [50, 25, 6], 'R');
  O('oesophagus', [0, T(0.74), -0.01 * H], [250, 20, 20]); O('spinal-cord', spineAt(0.6), [450, 10, 8]);
  O('eye', add(hc, [0.0315 * hk * p.eyesApart, -0.012 * hk, 0.075 * hk]), [24 * p.eyeSize, 24, 24], 'L'); O('eye', add(hc, [-0.0315 * hk * p.eyesApart, -0.012 * hk, 0.075 * hk]), [24 * p.eyeSize, 24, 24], 'R');
  O('tongue', add(hc, [0, -0.075 * hk, 0.06 * hk]), [90, 50, 25], '', [0, 0, 1]);
  if (p.sex >= 0.5) { O('uterus', [0, hipY + 0.012 * H, 0.015 * H], [75, 50, 35]); O('ovary', [0.035 * H, hipY + 0.02 * H, 0.005 * H], [35, 20, 15], 'L'); O('ovary', [-0.035 * H, hipY + 0.02 * H, 0.005 * H], [35, 20, 15], 'R'); }
  else { O('testis', [0.012 * H, hipY - 0.045 * H, 0.05 * H], [45, 30, 25], 'L'); O('testis', [-0.012 * H, hipY - 0.047 * H, 0.05 * H], [45, 30, 25], 'R'); }
  O('pituitary', add(hc, [0, -0.01 * hk, 0.015 * hk]), [12, 9, 6]); O('pineal', add(hc, [0, 0.01 * hk, -0.02 * hk]), [8, 5, 4]);
  // ---- muscles, origin to insertion ----
  const muscles: Placed[] = [], M = (id: string, a: V3, b: V3, w: number, side: Placed['side'] = '') => muscles.push(P(id, a, b, [dist(a, b) * 1000, w * hs * limbW, w * hs * limbW * 0.7], side));
  both((s, k) => {
    const sh = J[`shoulder${s}`]!, el = J[`elbow${s}`]!, wr = J[`wrist${s}`]!, hip = J[`hip${s}`]!, kn = J[`knee${s}`]!, an = J[`ankle${s}`]!, ac = J[`acromion${s}`]!, il = J[`iliac${s}`]!;
    const f = (v: V3, dz: number, dx = 0): V3 => add(v, [k * dx, 0, dz]);
    M('deltoid', add(ac, [0, 0.01 * H, 0]), lerp(sh, el, 0.42), 55, s);
    M('biceps-brachii', f(sh, 0.025 * H), f(el, 0.02 * H), 38, s); M('brachialis', f(lerp(sh, el, 0.5), 0.012 * H), f(el, 0.01 * H), 30, s); M('triceps-brachii', f(sh, -0.03 * H), f(el, -0.025 * H), 45, s); M('coracobrachialis', f(sh, 0.015 * H, -0.01 * H), f(lerp(sh, el, 0.5), 0.008 * H), 15, s);
    M('brachioradialis', f(lerp(sh, el, 0.8), 0.006 * H, 0.012 * H), f(wr, 0.008 * H, 0.01 * H), 22, s); M('forearm-flexors', f(el, 0.015 * H, -0.01 * H), f(wr, 0.012 * H), 35, s); M('forearm-extensors', f(el, -0.012 * H, 0.012 * H), f(wr, -0.008 * H), 30, s); M('pronator-teres', f(el, 0.012 * H, -0.012 * H), f(lerp(el, wr, 0.45), 0.01 * H, 0.008 * H), 14, s); M('supinator', f(el, -0.004 * H, 0.012 * H), f(lerp(el, wr, 0.3), 0, 0.01 * H), 10, s);
    M('hand-muscles', f(wr, 0.01 * H), f(J[`knuckle${s}`]!, 0.01 * H), 18, s);
    M('pectoralis-major', [k * 0.02 * H, T(0.75), 0.07 * H * wT], f(lerp(sh, el, 0.15), 0.02 * H), 60, s); M('pectoralis-minor', [k * 0.04 * H, T(0.735), 0.07 * H * wT], f(sh, 0.035 * H, -0.02 * H), 22, s);
    M('serratus-anterior', [k * 0.09 * H * wT, T(0.7), 0.035 * H * wT], [k * 0.07 * H * wT, T(0.76), -0.04 * H], 40, s);
    M('latissimus-dorsi', [k * 0.03 * H, T(0.63), -0.065 * H * wT], f(lerp(sh, el, 0.15), -0.015 * H, -0.015 * H), 60, s);
    M('trapezius', [0, T(0.75), -0.07 * H * wT], add(ac, [0, 0.01 * H, -0.02 * H]), 60, s);
    M('rhomboids', [k * 0.01 * H, T(0.77), -0.075 * H * wT], [k * 0.05 * H, T(0.75), -0.075 * H * wT], 28, s); M('levator-scapulae', add(J.neck!, [k * 0.02 * H, 0, -0.02 * H]), add(sh, [-k * 0.04 * H, 0.01 * H, -0.05 * H]), 18, s);
    M('supraspinatus', add(sh, [-k * 0.05 * H, 0.005 * H, -0.05 * H]), add(sh, [0, 0.008 * H, 0]), 22, s); M('infraspinatus', add(sh, [-k * 0.05 * H, -0.05 * H, -0.065 * H]), add(sh, [0, -0.005 * H, -0.02 * H]), 35, s); M('teres-minor', add(sh, [-k * 0.02 * H, -0.06 * H, -0.06 * H]), add(sh, [0, -0.01 * H, -0.02 * H]), 15, s); M('teres-major', add(sh, [-k * 0.03 * H, -0.08 * H, -0.06 * H]), add(lerp(sh, el, 0.2), [0, 0, 0.01 * H]), 25, s); M('subscapularis', add(sh, [-k * 0.05 * H, -0.04 * H, -0.045 * H]), add(sh, [0, 0, 0.01 * H]), 35, s);
    M('erector-spinae', [k * 0.025 * H, hipY + 0.02 * H, -0.07 * H * wT], [k * 0.015 * H, T(0.8), -0.06 * H], 45, s); M('multifidus', [k * 0.012 * H, hipY + 0.01 * H, -0.065 * H], [k * 0.01 * H, T(0.7), -0.06 * H], 20, s); M('quadratus-lumborum', [k * 0.04 * H, hipY + 0.04 * H, -0.04 * H], [k * 0.035 * H, T(0.665), -0.04 * H], 22, s);
    M('rectus-abdominis', [k * 0.012 * H, hipY - 0.01 * H, 0.06 * H * wT], [k * 0.025 * H, T(0.695), 0.075 * H * wT], 30, s); M('external-oblique', [k * 0.08 * H * wT, T(0.68), 0.04 * H * wT], [k * 0.03 * H, T(0.565), 0.075 * H * wT * fat], 40, s); M('internal-oblique', il, [k * 0.035 * H, T(0.645), 0.07 * H * wT], 32, s); M('transversus-abdominis', [k * 0.085 * H * wT, T(0.6), -0.01 * H], [k * 0.01 * H, T(0.6), 0.07 * H * wT * fat], 26, s);
    M('sternocleidomastoid', add(J.sternumTop!, [k * 0.01 * H, 0.004 * H, 0]), add(hc, [k * 0.055 * hk, -0.05 * hk, -0.02 * hk]), 22, s); M('scalenes', add(J.neck!, [k * 0.015 * H, 0.005 * H, -0.005 * H]), [k * 0.03 * H, shY - 0.01 * H, 0.01 * H], 16, s);
    M('masseter', add(hc, [k * 0.055 * hk * p.cheeks, -0.045 * hk, 0.04 * hk]), add(hc, [k * 0.05 * hk * p.jaw, -0.1 * hk, 0.03 * hk]), 14, s); M('temporalis', add(hc, [k * 0.07 * hk, 0.03 * hk, 0.01 * hk]), add(hc, [k * 0.05 * hk, -0.05 * hk, 0.04 * hk]), 16, s);
    M('gluteus-maximus', [k * 0.035 * H, hipY + 0.06 * H, -0.075 * H * wT], f(lerp(hip, kn, 0.18), -0.015 * H, 0.02 * H), 95, s); M('gluteus-medius', il, f(hip, -0.005 * H, 0.03 * H), 55, s); M('gluteus-minimus', add(il, [-k * 0.01 * H, -0.02 * H, 0]), f(hip, 0, 0.028 * H), 35, s); M('tensor-fasciae-latae', add(il, [0, -0.01 * H, 0.03 * H]), f(lerp(hip, kn, 0.3), 0.01 * H, 0.03 * H), 22, s); M('deep-hip-rotators', [k * 0.025 * H, hipY + 0.01 * H, -0.06 * H], f(hip, -0.02 * H, 0.025 * H), 22, s);
    M('iliacus', add(il, [-k * 0.02 * H, 0, 0.01 * H]), f(lerp(hip, kn, 0.08), 0.012 * H, -0.008 * H), 32, s); M('psoas-major', [k * 0.02 * H, T(0.655), -0.02 * H], f(lerp(hip, kn, 0.08), 0.01 * H, -0.01 * H), 38, s);
    M('rectus-femoris', f(hip, 0.03 * H, 0.008 * H), f(kn, 0.04 * H), 48, s); M('vastus-lateralis', f(lerp(hip, kn, 0.12), 0.012 * H, 0.03 * H), f(kn, 0.03 * H, 0.012 * H), 62, s); M('vastus-medialis', f(lerp(hip, kn, 0.4), 0.01 * H, -0.022 * H), f(kn, 0.028 * H, -0.012 * H), 52, s); M('vastus-intermedius', f(lerp(hip, kn, 0.15), 0.02 * H), f(kn, 0.03 * H), 45, s);
    M('sartorius', add(il, [0, -0.02 * H, 0.035 * H]), f(kn, 0.0, -0.03 * H), 20, s); M('gracilis', [k * 0.012 * H, hipY - 0.03 * H, 0.03 * H], f(kn, -0.005 * H, -0.03 * H), 22, s);
    M('adductor-longus', [k * 0.015 * H, hipY - 0.025 * H, 0.04 * H], f(lerp(hip, kn, 0.55), 0.005 * H, -0.02 * H), 32, s); M('adductor-brevis', [k * 0.018 * H, hipY - 0.03 * H, 0.035 * H], f(lerp(hip, kn, 0.35), 0, -0.018 * H), 28, s); M('adductor-magnus', [k * 0.02 * H, hipY - 0.04 * H, -0.01 * H], f(lerp(hip, kn, 0.85), -0.01 * H, -0.025 * H), 60, s); M('pectineus', [k * 0.025 * H, hipY - 0.015 * H, 0.04 * H], f(lerp(hip, kn, 0.15), 0.008 * H, -0.015 * H), 22, s);
    M('biceps-femoris', [k * 0.03 * H, hipY - 0.045 * H, -0.04 * H], f(kn, -0.025 * H, 0.025 * H), 45, s); M('semitendinosus', [k * 0.025 * H, hipY - 0.045 * H, -0.04 * H], f(kn, -0.025 * H, -0.02 * H), 36, s); M('semimembranosus', [k * 0.028 * H, hipY - 0.05 * H, -0.035 * H], f(kn, -0.02 * H, -0.025 * H), 42, s);
    M('gastrocnemius', f(kn, -0.025 * H), f(lerp(kn, an, 0.55), -0.035 * H), 55, s); M('soleus', f(lerp(kn, an, 0.15), -0.022 * H), f(lerp(kn, an, 0.82), -0.03 * H), 58, s); M('popliteus', f(kn, -0.02 * H, 0.012 * H), f(lerp(kn, an, 0.12), -0.012 * H, -0.01 * H), 14, s);
    M('tibialis-anterior', f(lerp(kn, an, 0.1), 0.018 * H, 0.012 * H), f(an, 0.02 * H, -0.01 * H), 30, s); M('tibialis-posterior', f(lerp(kn, an, 0.15), -0.01 * H), f(an, -0.005 * H, -0.012 * H), 24, s); M('fibularis-longus', f(lerp(kn, an, 0.1), -0.004 * H, 0.03 * H), f(an, -0.012 * H, 0.025 * H), 22, s); M('fibularis-brevis', f(lerp(kn, an, 0.5), -0.006 * H, 0.028 * H), f(an, -0.01 * H, 0.025 * H), 16, s);
    M('extensor-digitorum-longus', f(lerp(kn, an, 0.12), 0.015 * H, 0.022 * H), f(an, 0.025 * H, 0.012 * H), 18, s); M('extensor-hallucis-longus', f(lerp(kn, an, 0.4), 0.015 * H, 0.015 * H), f(an, 0.025 * H, -0.006 * H), 12, s); M('flexor-digitorum-longus', f(lerp(kn, an, 0.3), -0.012 * H, -0.012 * H), f(an, -0.012 * H, -0.015 * H), 13, s); M('flexor-hallucis-longus', f(lerp(kn, an, 0.4), -0.018 * H, 0.012 * H), f(an, -0.015 * H, -0.01 * H), 18, s);
    M('foot-muscles', add(J[`heel${s}`]!, [0, 0.01 * H, 0.02 * H]), add(J[`toe${s}`]!, [0, 0.008 * H, -0.03 * H]), 22, s);
    M('eye-muscles', add(hc, [k * 0.03 * hk * p.eyesApart, -0.012 * hk, 0.04 * hk]), add(hc, [k * 0.032 * hk * p.eyesApart, -0.012 * hk, 0.065 * hk]), 6, s);
  });
  M('diaphragm', [-0.07 * H * wT, T(0.67), 0], [0.07 * H * wT, T(0.67), 0], 90); M('intercostals', [0, T(0.78), 0.03 * H], [0, T(0.68), 0.06 * H], 70);
  M('face-muscles', add(hc, [0, -0.02 * hk, 0.09 * hk]), add(hc, [0, -0.09 * hk, 0.085 * hk]), 40); M('pelvic-floor', [0, hipY - 0.03 * H, -0.02 * H], [0, hipY - 0.035 * H, 0.03 * H], 50);
  // ---- the skin's shape: capsules blended softly, girths typical ----
  const skin: Prim[] = [], C = (a: V3, b: V3, r: number, r2 = r, k = 0.03 * hs) => skin.push({ a, b, r, r2, k });
  const tw = trunkW, lw = limbW;
  C(add(hc, [0, 0.005 * hk, -0.005 * hk]), add(hc, [0, -0.01 * hk, 0.012 * hk]), 0.085 * hk, 0.08 * hk, 0.02 * hs); // cranium
  C(add(J.neck!, [0, 0.025 * H, -0.004 * H]), add(J.c7!, [0, -0.005 * H, 0.025 * H]), 0.057 * hs * Math.sqrt(lw), 0.062 * hs * Math.sqrt(lw)); // neck (about 380 mm round)
  const chestR = 0.155 * hs * tw * Math.sqrt(mus), waistR = 0.135 * hs * tw * fat, hipR = 0.15 * hs * Math.sqrt(tw * fat) * p.hips; // chest about 1,000 mm, waist about 850, hips about 980 round (typical)
  const kt = 0.07 * hs; // the trunk blends softly: its parts one surface
  for (const [sx, y0, y1, r0, r1, dz] of [[0.05, T(0.79), T(0.69), chestR * 0.8, chestR * 0.82, 0.002], [0.036, T(0.69), T(0.6), chestR * 0.76, waistR * 0.8, 0.008], [0.042, T(0.6), hipY - 0.01 * H, waistR * 0.8, hipR * 0.84, 0.002]] as const) { C([sx * H * tw * p.shoulders ** (y0 > T(0.7) ? 1 : 0), y0, dz * H], [sx * H * tw, y1, dz * H], r0 * 0.72, r1 * 0.72, kt); C([-sx * H * tw * p.shoulders ** (y0 > T(0.7) ? 1 : 0), y0, dz * H], [-sx * H * tw, y1, dz * H], r0 * 0.72, r1 * 0.72, kt); }
  C([0, T(0.8), -0.02 * H], [0, hipY, -0.025 * H], 0.085 * hs * tw, 0.09 * hs * tw * Math.sqrt(fat), kt); // the back
  C([0, T(0.76), 0.025 * H * tw], [0, T(0.62), 0.03 * H * tw * fat], 0.095 * hs * tw, 0.1 * hs * tw * fat, kt); // belly and chest front
  if (p.sex >= 0.5) for (const k of [1, -1]) C([k * 0.05 * H * tw, T(0.735), 0.05 * H * tw], [k * 0.052 * H * tw, T(0.722), 0.072 * H * tw], 0.055 * hs * Math.sqrt(fat), 0.045 * hs * Math.sqrt(fat), 0.035 * hs); // breasts (about 500 g of fat and gland each pair, ICRP 89)
  both((s, k) => {
    const sh = J[`shoulder${s}`]!, el = J[`elbow${s}`]!, wr = J[`wrist${s}`]!, hip = J[`hip${s}`]!, kn = J[`knee${s}`]!, an = J[`ankle${s}`]!;
    C(add(sh, [-k * 0.03 * H, 0.012 * H, 0]), sh, 0.06 * hs * lw, 0.055 * hs * lw); // shoulder (deltoid)
    C(sh, el, 0.05 * hs * lw, 0.04 * hs * lw); C(el, wr, 0.042 * hs * lw, 0.028 * hs * Math.sqrt(lw)); // upper arm about 320, forearm about 280 mm round
    C(wr, add(J[`knuckle${s}`]!, [0, 0, -0.003 * H]), 0.026 * hs, 0.024 * hs, 0.01 * hs); C(J[`knuckle${s}`]!, J[`fingertip${s}`]!, 0.02 * hs, 0.012 * hs, 0.008 * hs); // hand, fingers as a mitt
    C(add(hip, [k * 0.012 * H, 0.03 * H, -0.01 * H]), kn, 0.095 * hs * lw * Math.sqrt(fat), 0.06 * hs * lw); // thigh about 600 mm round
    C(kn, an, 0.06 * hs * lw, 0.035 * hs * lw); C(add(kn, [0, -0.06 * H, -0.02 * H]), add(kn, [0, -0.13 * H, -0.015 * H]), 0.05 * hs * lw, 0.04 * hs * lw); // shin and calf (about 380 mm round)
    C(J[`heel${s}`]!, add(J[`toe${s}`]!, [0, 0.008 * H, -0.01 * H]), 0.035 * hs, 0.026 * hs, 0.015 * hs); C(an, J[`heel${s}`]!, 0.036 * hs, 0.035 * hs, 0.015 * hs);
    C(add(hip, [k * 0.01 * H, 0.02 * H, -0.05 * H * tw]), add(hip, [k * 0.012 * H, -0.02 * H, -0.04 * H * tw]), 0.085 * hs * Math.sqrt(fat), 0.075 * hs * Math.sqrt(fat)); // buttock
  });
  // ---- the face, on the head: Farkas's thirds, the eyes, nose, mouth, jaw and ears ----
  const face: Prim[] = [], F = (a: V3, b: V3, r: number, r2 = r, k = 0.008 * hs, cut = false) => face.push({ a: add(hc, mul(a, hk)), b: add(hc, mul(b, hk)), r: r * hk, r2: r2 * hk, k: k * hk, ...(cut ? { cut } : {}) });
  const ex = 0.0315 * p.eyesApart, ey = -0.012;
  F([0, 0.035, 0.06], [0, 0.065, 0.045], 0.05, 0.05, 0.015); // forehead
  F([-0.035, 0.01, 0.07], [0.035, 0.01, 0.07], 0.012 * p.brow, 0.012 * p.brow, 0.01); // brow ridge
  for (const k of [1, -1]) {
    F([k * ex, ey + 0.002, 0.079], [k * ex, ey + 0.002, 0.079], 0.0135 * p.eyeSize, 0.0135 * p.eyeSize, 0.008, true); // the eye's socket, shallow: lids round it
    F([k * 0.05 * p.cheeks, -0.035, 0.055], [k * 0.04 * p.cheeks, -0.045, 0.065], 0.022, 0.02, 0.012); // cheekbone
    F([k * 0.048 * p.jaw, -0.06, 0.025], [k * 0.03 * p.jaw, -0.1, 0.06 * p.chin], 0.022, 0.018, 0.014); // jaw
    F([k * 0.077, -0.005, -0.005], [k * 0.08, -0.03, -0.01], 0.012 * p.ears, 0.01 * p.ears, 0.004); // ear
  }
  F([0, -0.005, 0.088], [0, -0.012 - 0.04 * p.noseLength, 0.102 + 0.01 * p.noseLength], 0.008 * p.noseWidth, 0.013 * p.noseWidth, 0.008); // nose
  F([-0.025 * p.mouthWidth, -0.075, 0.083], [0.025 * p.mouthWidth, -0.075, 0.083], 0.007 * p.lips, 0.007 * p.lips, 0.006); // lips
  F([0, -0.105, 0.072 * p.chin], [0, -0.115, 0.06 * p.chin], 0.02, 0.018, 0.012); // chin
  F([0, -0.06, 0.07], [0, -0.09, 0.075], 0.035, 0.03, 0.02); // the face below the eyes
  for (const k of [1, -1]) F([k * ex, ey, 0.066], [k * ex, ey, 0.066], 0.0122 * p.eyeSize, 0.0122 * p.eyeSize, 0.003); // the eyeball in its socket
  return { params: p, H, joints: J, bones, organs, muscles, skin, face };
}
function lerpN(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }
function norm(v: V3): V3 { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
export { mirror };

/** Smooth minimum (polynomial): blends two distances over k. */
export function smin(a: number, b: number, k: number): number { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
/** Distance from a point to a primitive's surface (negative inside). */
export function primDist(q: V3, p: Prim): number {
  const ba = sub(p.b, p.a), pa = sub(q, p.a), L2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2];
  const h = L2 > 0 ? Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / L2)) : 0;
  const d = Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h);
  return d - (p.r + (p.r2 - p.r) * h);
}
/** The skin's distance field at a point: every primitive blended, the cuts taken out. */
export function skinDist(q: V3, prims: Prim[]): number {
  let d = 1e9;
  for (const p of prims) if (!p.cut) d = smin(d, primDist(q, p), p.k);
  for (const p of prims) if (p.cut) { const c = primDist(q, p); d = -smin(-d, c, p.k); }
  return d;
}
/** A field sampled on a grid and meshed by surface nets: one vertex a cell where the surface crosses, joined into quads.
 *  Each primitive touches only the cells near it, so the cost goes with the surface, not the grid times the
 *  primitives. Positions and normals (from the field's gradient), as flat arrays, with triangle indices. */
export function surfaceNets(prims: Prim[], cell: number, pad = 0.02): { pos: Float32Array; nrm: Float32Array; idx: Uint32Array; cells: number } {
  let lo: V3 = [1e9, 1e9, 1e9], hi: V3 = [-1e9, -1e9, -1e9];
  for (const p of prims) if (!p.cut) for (const v of [p.a, p.b]) for (let i = 0; i < 3; i++) { const r = Math.max(p.r, p.r2) + p.k + pad; lo[i] = Math.min(lo[i]!, v[i]! - r); hi[i] = Math.max(hi[i]!, v[i]! + r); }
  lo = lo.map((x) => x - cell) as V3; hi = hi.map((x) => x + cell) as V3;
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1, ny = Math.ceil((hi[1] - lo[1]) / cell) + 1, nz = Math.ceil((hi[2] - lo[2]) / cell) + 1, N = nx * ny * nz;
  const f = new Float32Array(N).fill(1e9), at = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  // each primitive blends into the cells within its reach only
  const reach = (p: Prim) => Math.max(p.r, p.r2) + p.k + 2 * cell;
  for (const p of prims) {
    if (p.cut) continue;
    const r = reach(p), i0 = Math.max(0, Math.floor((Math.min(p.a[0], p.b[0]) - r - lo[0]) / cell)), i1 = Math.min(nx - 1, Math.ceil((Math.max(p.a[0], p.b[0]) + r - lo[0]) / cell)), j0 = Math.max(0, Math.floor((Math.min(p.a[1], p.b[1]) - r - lo[1]) / cell)), j1 = Math.min(ny - 1, Math.ceil((Math.max(p.a[1], p.b[1]) + r - lo[1]) / cell)), k0 = Math.max(0, Math.floor((Math.min(p.a[2], p.b[2]) - r - lo[2]) / cell)), k1 = Math.min(nz - 1, Math.ceil((Math.max(p.a[2], p.b[2]) + r - lo[2]) / cell));
    const q: V3 = [0, 0, 0];
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { q[0] = lo[0] + i * cell; q[1] = lo[1] + j * cell; q[2] = lo[2] + k * cell; const n = at(i, j, k); f[n] = smin(f[n]!, primDist(q, p), p.k); }
  }
  for (const p of prims) {
    if (!p.cut) continue;
    const r = reach(p), i0 = Math.max(0, Math.floor((Math.min(p.a[0], p.b[0]) - r - lo[0]) / cell)), i1 = Math.min(nx - 1, Math.ceil((Math.max(p.a[0], p.b[0]) + r - lo[0]) / cell)), j0 = Math.max(0, Math.floor((Math.min(p.a[1], p.b[1]) - r - lo[1]) / cell)), j1 = Math.min(ny - 1, Math.ceil((Math.max(p.a[1], p.b[1]) + r - lo[1]) / cell)), k0 = Math.max(0, Math.floor((Math.min(p.a[2], p.b[2]) - r - lo[2]) / cell)), k1 = Math.min(nz - 1, Math.ceil((Math.max(p.a[2], p.b[2]) + r - lo[2]) / cell));
    const q: V3 = [0, 0, 0];
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { q[0] = lo[0] + i * cell; q[1] = lo[1] + j * cell; q[2] = lo[2] + k * cell; const n = at(i, j, k); f[n] = -smin(-f[n]!, primDist(q, p), p.k); }
  }
  // a vertex in each cell the surface crosses: the mean of its edges' crossings
  const vid = new Int32Array(N).fill(-1), pos: number[] = [], nrm: number[] = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]] as const, C8 = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] as const;
  const v8 = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { const o = C8[c]!; const v = f[at(i + o[0], j + o[1], k + o[2])]!; v8[c] = v; if (v < 0) inside |= 1 << c; }
    if (inside === 0 || inside === 255) continue;
    let sx = 0, sy = 0, sz = 0, m = 0;
    for (const [a, b] of E) { const va = v8[a]!, vb = v8[b]!; if ((va < 0) === (vb < 0)) continue; const t = va / (va - vb), A = C8[a]!, B = C8[b]!; sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; m++; }
    vid[at(i, j, k)] = pos.length / 3;
    const x = i + sx / m, y = j + sy / m, z = k + sz / m;
    pos.push(lo[0] + x * cell, lo[1] + y * cell, lo[2] + z * cell);
    // the normal from the field's gradient, by its differences across the cell
    const g0 = (v8[1]! - v8[0]! + v8[3]! - v8[2]! + v8[5]! - v8[4]! + v8[7]! - v8[6]!), g1 = (v8[2]! - v8[0]! + v8[3]! - v8[1]! + v8[6]! - v8[4]! + v8[7]! - v8[5]!), g2 = (v8[4]! - v8[0]! + v8[5]! - v8[1]! + v8[6]! - v8[2]! + v8[7]! - v8[3]!), gl = Math.hypot(g0, g1, g2) || 1;
    nrm.push(g0 / gl, g1 / gl, g2 / gl);
  }
  // a quad across each edge where the surface crosses, between the four cells round it
  const idx: number[] = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = f[at(i, j, k)]!;
    for (let ax = 0; ax < 3; ax++) {
      const n1 = ax === 0 ? at(i + 1, j, k) : ax === 1 ? at(i, j + 1, k) : at(i, j, k + 1), v1 = f[n1]!;
      if ((v0 < 0) === (v1 < 0)) continue;
      const q = ax === 0 ? [at(i, j - 1, k - 1), at(i, j, k - 1), at(i, j, k), at(i, j - 1, k)] : ax === 1 ? [at(i - 1, j, k - 1), at(i, j, k - 1), at(i, j, k), at(i - 1, j, k)] : [at(i - 1, j - 1, k), at(i, j - 1, k), at(i, j, k), at(i - 1, j, k)];
      const a = vid[q[0]!]!, b = vid[q[1]!]!, c = vid[q[2]!]!, d = vid[q[3]!]!; if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      const flip = (v0 < 0) !== (ax === 1);
      if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx), cells: N };
}
/** The bones of a part of the skeleton, by the skeleton entry's id (skull, spine, ribcage, an arm, a leg) or all. */
export function bonesOf(body: Body, part: string): Placed[] {
  const B = body.bones, ids = (xs: string[]) => B.filter((b) => xs.includes(b.id));
  const skullIds = ['frontal-bone', 'parietal-bone', 'temporal-bone', 'occipital-bone', 'sphenoid-bone', 'ethmoid-bone', 'nasal-bone', 'maxilla', 'lacrimal-bone', 'zygomatic-bone', 'palatine-bone', 'inferior-nasal-concha', 'vomer', 'mandible'];
  switch (part) {
    case 'skeleton': return B;
    case 'skull': return ids(skullIds);
    case 'cranium': return ids(skullIds.slice(0, 6));
    case 'face-bones': return ids(skullIds.slice(6));
    case 'ossicles': return ids(['malleus', 'incus', 'stapes']).filter((b) => b.side === 'L');
    case 'spine': return B.filter((b) => /^(atlas|axis|[ctl]\d+|sacrum|coccyx)$/.test(b.id));
    case 'ribcage': return B.filter((b) => /^(rib-\d+|sternum)$/.test(b.id));
    case 'arm-bones': return B.filter((b) => b.side === 'L' && /clavicle|scapula|humerus|radius|ulna|scaphoid|lunate|triquetrum|pisiform|trapezi|capitate|hamate|metacarpal|hand-/.test(b.id));
    case 'hand-bones': return B.filter((b) => b.side === 'L' && /scaphoid|lunate|triquetrum|pisiform|trapezi|capitate|hamate|metacarpal|hand-/.test(b.id));
    case 'leg-bones': return B.filter((b) => b.side === 'L' && /hip-bone|femur|patella|tibia|fibula|calcaneus|talus|navicular|cuboid|cuneiform|metatarsal|foot-/.test(b.id));
    case 'foot-bones': return B.filter((b) => b.side === 'L' && /calcaneus|talus|navicular|cuboid|cuneiform|metatarsal|foot-/.test(b.id));
    default: return B.filter((b) => b.id === part).slice(0, 1);
  }
}

// ---- where things are, for the view -----------------------------------------------------------------------------------
/** The ids that are the whole body drawn (a system with the body's outline round it). */
export const WHOLE_BODY = new Set(['human', 'skin', 'adipose', 'skeleton', 'muscles', 'connective-tissue', 'circulatory-system', 'respiratory-system', 'digestive-system', 'urinary-system', 'nervous-system', 'endocrine-system', 'immune-system', 'reproductive-system']);
/** A box round points. */
function boxOf(pts: V3[], pad: number): { lo: V3; hi: V3 } {
  const lo: V3 = [1e9, 1e9, 1e9], hi: V3 = [-1e9, -1e9, -1e9];
  for (const p of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, p[i]! - pad); hi[i] = Math.max(hi[i]!, p[i]! + pad); }
  return { lo, hi };
}
/** How far a thing drawn from the body reaches, body metres: the whole body, a part of the skeleton, an organ. */
export function extentOf(body: Body, id: string): { lo: V3; hi: V3 } | null {
  const H = body.H, J = body.joints;
  if (WHOLE_BODY.has(id)) { const xs = Object.values(J).map((v) => Math.abs(v[0])); const w = Math.max(...xs) + 0.05 * H; return { lo: [-w, 0, -0.17 * H / 1.76], hi: [w, H, 0.17 * H / 1.76] }; }
  if (id === 'skull' || id === 'cranium' || id === 'face-bones') { const hc = J.headC!, s = 0.11 * (H / 1.76) * body.params.head; return { lo: [hc[0] - s * 0.75, hc[1] - s * 1.1, hc[2] - s], hi: [hc[0] + s * 0.75, hc[1] + s * 0.95, hc[2] + s] }; }
  const bs = bonesOf(body, id); if (bs.length > 1 || ['spine', 'ribcage', 'arm-bones', 'hand-bones', 'leg-bones', 'foot-bones', 'ossicles'].includes(id)) return boxOf(bs.flatMap((b) => [b.a, b.b, ...(b.path ?? [])]), Math.max(...bs.map((b) => b.size[1] / 2000)));
  return null;
}
/** The skull's bones as regions of the one skull (x its left, y up, z forward; about a unit across): where each is,
 *  as the view cuts it from the skull's surface (src/nexus/view/organic.ts). */
export const SKULL_REGIONS: Record<string, V3> = {
  'frontal-bone': [0, 0.14, 0.3], 'parietal-bone': [0.3, 0.3, -0.08], 'temporal-bone': [0.4, -0.02, -0.04], 'occipital-bone': [0, 0.04, -0.42], 'sphenoid-bone': [0, -0.14, 0.04], 'ethmoid-bone': [0, -0.08, 0.32],
  'nasal-bone': [0.02, -0.13, 0.45], maxilla: [0.1, -0.27, 0.3], 'lacrimal-bone': [0.13, -0.07, 0.37], 'zygomatic-bone': [0.3, -0.12, 0.18], 'palatine-bone': [0.05, -0.3, 0.14], 'inferior-nasal-concha': [0.05, -0.2, 0.32], vomer: [0, -0.22, 0.26],
};
/** The skull as drawn, metres: its box (width, height, depth) and its middle. */
export const skullBox = (body: Body): { c: V3; s: V3 } => { const hk = (body.H / 1.76) * body.params.head, hc = body.joints.headC!; return { c: [hc[0], hc[1], hc[2] + 0.004], s: [0.155 * hk, 0.2 * hk, 0.2 * hk] }; };
/** Where a part lies in a whole drawn from the body: its middle and box (body metres), the way its length points, its
 *  curve if it has one; null where the body does not place it (it is laid round the whole instead). */
export function placeIn(body: Body, parent: string, child: string): { c: V3; box: V3; axis: V3; path?: V3[] } | null {
  const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const ax = (a: V3, b: V3): V3 => { const d = sub(b, a), l = Math.hypot(...d); return l > 1e-9 ? [d[0] / l, d[1] / l, d[2] / l] : [0, 1, 0]; };
  // a part of the skeleton that is itself drawn from bones
  const sub2 = extentOf(body, child);
  if (sub2 && !WHOLE_BODY.has(child)) { const c = mid(sub2.lo, sub2.hi); return { c, box: sub(sub2.hi, sub2.lo).map((x) => Math.abs(x)) as V3, axis: [0, 1, 0] }; }
  // a bone of the skull: its region of the skull
  const reg = SKULL_REGIONS[child];
  if (reg && ['skull', 'cranium', 'face-bones', 'skeleton'].includes(parent)) { const { c, s } = skullBox(body); return { c: [c[0] + reg[0] * s[0], c[1] + reg[1] * s[1], c[2] + reg[2] * s[2]], box: [s[1] * 0.38, s[0] * 0.38, s[2] * 0.38], axis: [0, 1, 0] }; }
  // a bone (the left one, where there are two), a muscle, an organ
  const side = (xs: Placed[]) => xs.find((x) => x.side === 'L') ?? xs[0];
  const parentBones = WHOLE_BODY.has(parent) ? body.bones : bonesOf(body, parent);
  const bone = side(parentBones.filter((b) => b.id === child));
  if (bone) { const c = bone.path ? bone.path[Math.floor(bone.path.length / 2)]! : mid(bone.a, bone.b); return { c, box: bone.size.map((x) => x / 1000) as V3, axis: ax(bone.a, bone.b), ...(bone.path ? { path: bone.path.map((p) => sub(p, c)) } : {}) }; }
  const mus = parent === 'muscles' ? side(body.muscles.filter((m) => m.id === child)) : undefined;
  if (mus) return { c: mid(mus.a, mus.b), box: mus.size.map((x) => x / 1000) as V3, axis: ax(mus.a, mus.b) };
  const org = side(body.organs.filter((o) => o.id === child));
  if (org && WHOLE_BODY.has(parent)) return { c: org.a, box: org.size.map((x) => x / 1000) as V3, axis: ax(org.a, org.b) };
  return null;
}
/** The body the view draws: laid out once a set of parameters, kept until they change. */
let current: { key: string; body: Body } | null = null;
export function currentBody(): Body { if (!current) { const b = layOut(); current = { key: bodyKey(b.params), body: b }; } return current.body; }
export const currentKey = (): string => { currentBody(); return current!.key; };
/** Change the body the view draws (a new height, a wider jaw): laid out again from them. */
export function setBody(p: Partial<BodyParams>): Body { const b = layOut(p); current = { key: bodyKey(b.params), body: b }; return b; }

// Lines (docs/PLACEMENT.md, step 4): one section swept along a path, the path found by one search whose logics are costs.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Part, V3 } from '../../src/nexus/kits';
import { SECTIONS, makeLine, outer, route, sectionOf, sizeBore, sizeWire, vary } from '../../src/nexus/placement/line';
import { rulesOf } from '../../src/nexus/make/rules';
import { WIRE_GAUGES } from '../../src/data/batteries';

const box = (name: string, size: V3, at: V3, more: Partial<Part> = {}): Part => ({ name, item: name, shape: { box: size }, at, mat: 'steel-low', ...more });
// (a floor, and a wall across the middle, 0.4 m wide, the ends to either side of it)
const room = (more: Part[] = []): Part => ({ name: 'room', parts: [box('floor', [1.2, 0.02, 1.2], [0, -0.01, 0]), box('wall', [0.04, 0.3, 0.4], [0, 0.15, 0]), ...more] });
const A: V3 = [-0.4, 0.06, 0], B: V3 = [0.4, 0.06, 0];
const near = (pts: V3[], p: THREE.Vector3) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, new THREE.Line3(new THREE.Vector3(...pts[i - 1]!), new THREE.Vector3(...pts[i]!)).closestPointToPoint(p, true, new THREE.Vector3()).distanceTo(p)); return d; };

describe('sections', () => {
  it('a wire\'s copper by the AWG rule, as the gauge table has it; a hose\'s bore hollow, a cable\'s core drawn', () => {
    const w12 = sectionOf('wire-12'); expect(Math.PI * w12.layers[0]!.t ** 2).toBeCloseTo(WIRE_GAUGES['12']!.area, 7);
    const hose = makeLine(sectionOf('hose-32'), [[0, 0, 0], [0.2, 0, 0]]); expect(hose.parts!.map((p) => p.name)).toEqual(['wall']);
    const wire = makeLine(w12, [[0, 0, 0], [0.2, 0, 0]]); expect(wire.parts!.map((p) => p.mat)).toEqual(['copper', 'xlpe']);
    // (the same hose made a copper rod: its core solid and drawn; a pipe made of stainless)
    expect(makeLine(vary(sectionOf('hose-32'), { core: 'copper' }), [[0, 0, 0], [0.2, 0, 0]]).parts!.map((p) => p.mat)).toEqual(['copper', 'epdm']);
    expect(vary(sectionOf('pipe-1in'), { outer: 'stainless-304', wall: 0.002 }).layers[1]).toMatchObject({ mat: 'stainless-304', t: 0.002 });
    for (const s of SECTIONS) expect(s.source.length, s.id).toBeGreaterThan(10);
  });
  it('a wire sized by its current and the volts it may drop; a bore by its flow', () => {
    // (100 A for 1 m back through the chassis, 0.36 V allowed: 10 AWG (5.26 mm²) drops 0.33 V, 11 AWG 0.41 V)
    expect(sizeWire(100, 1, { chassisReturn: true }).awg).toBe(10);
    expect(sizeBore(0.001, 2).bore).toBeCloseTo(Math.sqrt(0.004 / (2 * Math.PI)), 9);
  });
});

describe('routing: one search, logics as its costs', () => {
  const wire = sectionOf('wire-12');
  it('clear: round the wall, clear of it, no tighter than it may bend', () => {
    const r = route(room(), A, B, { section: wire, logic: 'clear', step: 0.01 });
    expect(r.length).toBeGreaterThan(0.8); expect(r.tightest).toBeGreaterThanOrEqual(r.least - 1e-6);
    const t = room([makeLine(wire, r.pts, 'the wire')]); expect(rulesOf(t, { only: /^the wire$/ }).findings.filter((f) => f.rule === 'interference')).toHaveLength(0);
  });
  it('heat: a way past a hot pipe stays where its jacket stands it; straight through would not', () => {
    const hot = box('pipe', [0.04, 0.04, 0.6], [0, 0.06, 0], { mat: 'stainless-304', hot: 500 }), t: Part = { name: 'bay', parts: [box('floor', [1.2, 0.02, 1.2], [0, -0.01, 0]), hot] };
    const r = route(t, A, B, { section: wire, logic: 'clear', step: 0.01 }); expect(r.hottest).toBeLessThanOrEqual(r.limit); expect(r.limit).toBe(125);
  });
  it('orthogonal: square runs only', () => {
    const r = route(room(), A, B, { section: sectionOf('pipe-1in'), logic: 'orthogonal', step: 0.02 });
    for (let i = 1; i < r.pts.length; i++) { const d = new THREE.Vector3(...r.pts[i]!).sub(new THREE.Vector3(...r.pts[i - 1]!)); expect([Math.abs(d.x), Math.abs(d.y), Math.abs(d.z)].filter((x) => x > 1e-6).length, `run ${i}`).toBe(1); }
  });
  it('hug: nearer the surfaces than the clear way, where it can be clipped', () => {
    const t = room(), mean = (pts: V3[]) => { let s = 0, n = 0; for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 10; k++) { const p = new THREE.Vector3(...pts[i - 1]!).lerp(new THREE.Vector3(...pts[i]!), k / 10); s += Math.min(p.y, Math.abs(Math.abs(p.x) - 0.02)); n++; } return s / n; };
    const c = route(t, [-0.4, 0.2, 0.3], [0.4, 0.2, 0.3], { section: wire, logic: 'clear', step: 0.01 }), h = route(t, [-0.4, 0.2, 0.3], [0.4, 0.2, 0.3], { section: wire, logic: 'hug', step: 0.01 });
    expect(mean(h.pts)).toBeLessThan(mean(c.pts));
  });
  it('bundle: a second line, 100 mm off the first, runs with it most of the way; alone it would not', () => {
    const t = room(), first = route(t, [-0.4, 0.06, 0.3], [0.4, 0.06, 0.3], { section: wire, logic: 'clear', step: 0.01 });
    const alone = route(t, [-0.4, 0.06, 0.4], [0.4, 0.06, 0.4], { section: wire, logic: 'clear', step: 0.01 }), withIt = route(t, [-0.4, 0.06, 0.4], [0.4, 0.06, 0.4], { section: wire, logic: 'bundle', along: [first.pts], step: 0.01 });
    const share = (pts: V3[]) => { let n = 0, k = 0; for (let i = 1; i < pts.length; i++) for (let s = 0; s <= 20; s++) { k++; if (near(first.pts, new THREE.Vector3(...pts[i - 1]!).lerp(new THREE.Vector3(...pts[i]!), s / 20)) < 0.03) n++; } return n / k; };
    expect(share(withIt.pts)).toBeGreaterThan(share(alone.pts) + 0.2);
  });
  it('grade: a road round a cliff, never steeper than 8 %', () => {
    const land: Part = { name: 'land', parts: [box('ground', [40, 0.2, 40], [0, -0.1, 0]), box('ridge', [2, 3, 30], [0, 1.5, 0])] };
    const r = route(land, [-10, 0, 0], [10, 0, 0], { section: sectionOf('road-2'), logic: 'grade' });
    expect(Math.max(...r.pts.map((p) => Math.abs(p[2])))).toBeGreaterThan(15);
    for (let i = 1; i < r.pts.length; i++) { const [a, b] = [r.pts[i - 1]!, r.pts[i]!]; expect(Math.abs(b[1] - a[1]) / Math.max(1e-9, Math.hypot(b[0] - a[0], b[2] - a[2]))).toBeLessThanOrEqual(0.08 + 1e-9); }
    expect(outer(sectionOf('road-2'))).toBeCloseTo(0.25, 9);
  });
});

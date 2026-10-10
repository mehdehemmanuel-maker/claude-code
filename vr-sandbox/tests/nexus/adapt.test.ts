import { describe, expect, it } from 'vitest';
import { areaFor, designFrame, sectionFor, flowScalar, frameAt, ground, growFrame, growTree, lattice, scaleLaw, treeFlows, truss, type FrameMatter, type Strut, type V3 } from '../../src/nexus/substrate/adapt';
import { matterOf } from '../../src/nexus/ask/generate';

const TUBES: [number, number][] = [[12, 1], [16, 1.5], [20, 1.5], [25, 2], [30, 2], [40, 2], [50, 2.5], [60, 3], [76, 3], [89, 3.5], [114, 4], [168, 5]];
const tubes = TUBES.map(([D, w]) => { const d = D / 1e3, t = w / 1e3; return { A: (Math.PI * (d * d - (d - 2 * t) ** 2)) / 4, I: (Math.PI * (d ** 4 - (d - 2 * t) ** 4)) / 64, label: `${D} × ${w} mm tube` }; });
const squares = [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150].map((x) => { const a = x / 1e3; return { A: a * a, I: a ** 4 / 12, label: `${x} mm square` }; });
const matter = (id: string): FrameMatter => { const m = matterOf(id), wood = /^wood/.test(id), sy = wood ? 0.5 * m.ultimate : m.yield; return { id, name: m.name, strut: { E: m.E, sy, sc: sy, density: m.density }, sections: wood ? squares : tubes }; };
const MATTERS = ['steel.a36', 'aluminum.6061-t6', 'wood.douglas-fir', 'composite.cfrp'].map(matter);
const g = 9.80665;
const mount = (kg: number) => { const P: V3 = [0, 0.2, 0.4]; return designFrame({ lo: [-0.15, 0, 0], hi: [0.15, 0.4, 0.4], cells: [2, 2, 3], held: (p) => p[2] < 1e-9, cases: [[{ at: P, F: [0, -3 * kg * g, 0] }], [{ at: P, F: [kg * g, -kg * g, 0] }], [{ at: P, F: [0, -kg * g, kg * g] }], [{ at: P, F: [0, kg * g, 0] }]] }, MATTERS); };
const STIFF: Strut = { E: 1e15, sy: 250e6, sc: 250e6, density: 7850 };

describe('a network grown by what flows through it', () => {
  it('a pull and a push in two struts from a wall: F / √2 each, by the stiffness solve', () => {
    const L = 1, F = 1000, G = { nodes: [[0, L, 0], [0, -L, 0], [L, 0, 0]] as V3[], edges: [[0, 2], [1, 2]] as [number, number][], len: [Math.SQRT2, Math.SQRT2] };
    const r = truss(G, [1e-4, 1e-4], 200e9, new Set([0, 1]), [[0, 0, 0], [0, 0, 0], [0, -F, 0]]);
    expect(r.N[0]).toBeCloseTo(F / Math.SQRT2, 3); expect(r.N[1]).toBeCloseTo(-F / Math.SQRT2, 3);
  });
  it('Kirchhoff: a fed joint and two drawn off share by their conductances', () => {
    const G = { nodes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]] as V3[], edges: [[0, 1], [1, 2], [1, 3]] as [number, number][], len: [1, 1, 1] };
    const r = flowScalar(G, [2, 1, 1], new Map([[0, 10]]), [0, 0, -1, -3]);
    expect(r.Q[0]).toBeCloseTo(4, 9); expect(r.Q[1]).toBeCloseTo(1, 9); expect(r.Q[2]).toBeCloseTo(3, 9);
    expect(r.p[1]).toBeCloseTo(8, 9);
  });
  it("from a wall and a load held out from it, the frame grown is Michell's: two struts at 45°, 2 F L / σ of each (by two)", () => {
    const L = 1, F = 1000, { nodes, at } = lattice([0, -L, 0], [L, L, 0], [4, 8, 0], [[L, 0, 0]]);
    const held = new Set(nodes.map((p, i) => (p[0] === 0 ? i : -1)).filter((i) => i >= 0));
    const G = ground(nodes, 0.25 * L * 2.3, { held });
    const load: V3[] = []; load[at[0]!] = [0, -F, 0];
    const f = growFrame(G, STIFF, held, [load], { g: 0 });
    // by two in tension and pressed: 2 × 2 F L / σ of steel
    const least = (4 * F * L) / 250e6;
    expect(f.mechanisms).toBe(0);
    expect(f.mass / 7850).toBeGreaterThan(least * 0.99); expect(f.mass / 7850).toBeLessThan(least * 1.05);
  });
  it('a strut pressed buckles before it crushes when it is long: its area grows as its length', () => {
    const s: Strut = { E: 200e9, sy: 250e6, sc: 250e6, density: 7850 };
    expect(areaFor(1000, 1, s)).toBeCloseTo(8e-6, 12);
    const a1 = areaFor(-1000, 1, s), a4 = areaFor(-1000, 4, s);
    expect(a4 / a1).toBeCloseTo(4, 6); expect(a1).toBeGreaterThan(8e-6);
  });
  it('fed at one corner and drawn at every joint of a field, the ways kept are a tree, and at each fork r³ is kept (Murray)', () => {
    const { nodes } = lattice([0, 0, 0], [40, 0, 30], [4, 0, 3]);
    const G = ground(nodes, 10 * 1.5);
    const draw = new Map(nodes.map((_, i) => [i, 1] as [number, number]).filter(([i]) => i !== 0));
    const t = growTree(G, 0, draw);
    expect(t.edges.length).toBe(nodes.length - 1);
    const { Q } = treeFlows(G, t.edges, 0, draw);
    // what leaves the fed joint is all that is drawn; and at every joint what comes in is what goes on and is drawn there
    expect(t.edges.filter((e) => G.edges[e]!.includes(0)).reduce((s, e) => s + Q.get(e)!, 0)).toBe(nodes.length - 1);
    // the grown radii keep Murray's law at each fork: r³ in is the sum of r³ out (as r³ grows as Q)
    const r3 = (e: number) => t.r[e]! ** 3, at = (j: number) => t.edges.filter((e) => G.edges[e]!.includes(j));
    for (let j = 1; j < nodes.length; j++) { const es = at(j); if (es.length < 3) continue; const sorted = es.map(r3).sort((a, b) => b - a); expect(sorted[0]!).toBeGreaterThan(sorted.slice(1).reduce((a, b) => a + b, 0)); }
  });
  it('a load held out from a wall grows a tripod of three struts to it; of the matters, the one lightest when sized wins', () => {
    const r = mount(17);
    expect(r.best).not.toBeNull(); const b = r.best!;
    expect(b.struts.length).toBe(3); expect(b.held.length).toBe(3); expect(b.mechanisms).toBe(0);
    expect(b.struts.every((x) => x.margin >= 1)).toBe(true);
    const kg = Object.fromEntries(r.tried.map((f) => [f.matter.id, f.mass]));
    expect(b.mass).toBe(Math.min(...Object.values(kg)));
    expect(kg['steel.a36']!).toBeGreaterThan(kg['aluminum.6061-t6']!);
  }, 60000);
  it('the heavier what it holds, the thicker its struts grow: a tenfold load wants more than the least tube', () => {
    const light = mount(17).best!, heavy = mount(170).best!;
    const most = (f: typeof light) => Math.max(...f.struts.map((x) => x.section.A));
    expect(most(heavy)).toBeGreaterThan(most(light)); expect(heavy.mass).toBeGreaterThan(light.mass);
  }, 60000);
  it('across a 4 m gap between two banks, a truss is grown that carries 205 kg on its deck, and no strut fails', () => {
    const deck: V3[] = []; for (let i = 0; i <= 8; i++) for (const z of [-0.3, 0.3]) deck.push([i * 0.5, 0.5, z]); const per = (205 * g) / deck.length;
    const r = designFrame({ lo: [0, 0, -0.3], hi: [4, 0.5, 0.3], cells: [8, 1, 1], held: (p) => (p[0] < 1e-9 || p[0] > 4 - 1e-9) && p[1] < 1e-9, cases: [deck.map((p) => ({ at: p, F: [0, -per, 0] as V3 })), deck.map((p) => ({ at: p, F: [0, -per, 0.1 * per] as V3 }))] }, MATTERS);
    const b = r.best!; expect(b.ok).toBe(true); expect(b.held.length).toBe(4);
    expect(b.struts.some((x) => x.N.some((n) => n > 0)) && b.struts.some((x) => x.N.some((n) => n < 0))).toBe(true);
    expect(b.sag.every((x) => x.most <= x.allowed)).toBe(true);
  }, 120000);
  it('a strut carrying almost nothing is still no more slender than the code allows: L / r within 200 pressed, 300 pulled', () => {
    const s: Strut = { E: 200e9, sy: 250e6, sc: 250e6, density: 7850, slender: { push: 200, pull: 300 } };
    const tubes = TUBES.map(([D, w]) => { const d = D / 1e3, t = w / 1e3; return { A: (Math.PI * (d * d - (d - 2 * t) ** 2)) / 4, I: (Math.PI * (d ** 4 - (d - 2 * t) ** 4)) / 64, label: `${D}` }; });
    const pushed = sectionFor([-10], 4, s, tubes), pulled = sectionFor([10], 4, s, tubes);
    expect(4 / Math.sqrt(pushed.section.I / pushed.section.A)).toBeLessThanOrEqual(200); expect(pushed.mode).toBe('slender');
    expect(4 / Math.sqrt(pulled.section.I / pulled.section.A)).toBeLessThanOrEqual(300);
    expect(pulled.section.A).toBeLessThan(pushed.section.A);
  });
  it('resting with its feet tied, it slides only as a whole: weighed down for the push on all of it, less than foot by foot', () => {
    const P: V3 = [0, 1, 0], ask = (tied: boolean) => designFrame({ lo: [-0.5, 0, -0.5], hi: [0.5, 1, 0.5], cells: [2, 2, 2], held: (p) => p[1] < 1e-9, rests: true, ballast: true, tied, cases: [[{ at: P, F: [0, -1000, 0] }], [{ at: P, F: [800, -1000, 0] }]] }, [MATTERS[0]!]).best!;
    const loose = ask(false), tied = ask(true), kg = (f: typeof tied) => f.ballast.reduce((a, b) => a + b, 0);
    // 800 N along it over μ 0.5 wants 1600 N pressing it in all, of which 1000 N and its own weight press it: by 1.5, the rest
    // (or more, where a foot it would lift wants more weighing down than that)
    expect(kg(tied)).toBeGreaterThanOrEqual(1.5 * (1600 - 1000 - tied.mass * g) - 1e-6); expect(kg(tied)).toBeLessThan(kg(loose));
    expect(tied.tie).toBeGreaterThan(0);
  }, 60000);
  it('its feet cast into footings: each as heavy as what would lift it, by 1.5, and nothing for sliding', () => {
    const P: V3 = [0, 1, 0], f = designFrame({ lo: [-0.5, 0, -0.5], hi: [0.5, 1, 0.5], cells: [2, 2, 2], held: (p) => p[1] < 1e-9, footings: true, cases: [[{ at: P, F: [0, 2000, 0] }]] }, [MATTERS[0]!]).best!;
    expect(f.ballast.reduce((a, b) => a + b, 0)).toBeCloseTo(1.5 * (2000 - f.mass * g), 0);
  }, 60000);
  it("made bigger with what it carries, each margin falls as 1/s (Galileo's square-cube law); carrying the same, shrunk, it falls as s² or so", () => {
    const f = mount(17).best!, law = scaleLaw(f);
    const withIt = law.find((x) => x.withIt)!, kept = law.find((x) => !x.withIt)!;
    for (const l of withIt.laws) expect(l.power).toBeCloseTo(-1, 1);
    // its own weight is a small part of what it carries, so the same load on it shrunk goes nearly as s² (strength, buckling)
    expect(kept.laws.find((l) => l.what === 'strength')!.power).toBeGreaterThan(1.8);
    expect(kept.laws.find((l) => l.what === 'buckling')!.power).toBeGreaterThan(1.8);
    // shrunk a thousand times with its load shrunk too, it is a thousand times stronger for what it carries
    expect(frameAt(f, 1e-3, true).strength / frameAt(f, 1, true).strength).toBeCloseTo(1000, -1);
  }, 60000);
});

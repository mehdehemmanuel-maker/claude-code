// Package P4 of plan/AUDIT.md: materials as numbers, and torsion (acceptance tests 3 and 4 of the directive of
// 2026-11-07). A built shaft weighs its volume times its material's density, for any material the tables know, and
// refuses one they do not; a built shaft twisted by a torque gives the torsion laws' shear and twist from its own
// section and its material's shear modulus. The sizes and the torque are the brief's: Ø20 mm, 500 mm, 100 N m.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, defaultsOf } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, wire } from '../../src/nexus/dataflow';
import { densityKg } from '../../src/nexus/mass';
import { MATTER, matterOf } from '../../src/nexus/matter';
import { MATERIALS as HANDBOOK } from '../../src/data/materials';

const node = async (id: string, set: Record<string, unknown> = {}, inputs: Record<string, unknown> = {}) => {
  const b = LIBRARY.get(id); if (!b) throw new Error(`no block ${id}`);
  return (await b.run!(inputs, { set: { ...defaultsOf(b), ...set } } as never)) as Record<string, any>;
};
const prop = (mat: string, key: string) => matterOf(mat).props.find((p) => p.key === key);
const rel = (a: number, b: number) => Math.abs(a / b - 1);

// the grades the audit found no row reached (materials-physics/props.out)
const UNREACHED = ['steel.a36', 'steel.4140-ann', 'wood.douglas-fir', 'wood.southern-pine', 'wood.white-pine', 'wood.red-oak', 'wood.white-oak', 'wood.hard-maple', 'wood.balsa', 'wood.c24', 'polymer.abs', 'polymer.pla', 'polymer.nylon66', 'polymer.pom', 'polymer.pc', 'polymer.hdpe', 'polymer.ptfe', 'stone.slate', 'stone.granite', 'stone.marble', 'textile.baize', 'cork.agglomerated', 'magnet.n35', 'magnet.n42', 'magnet.n52', 'magnet.ferrite-c8'];

describe('P4: materials as numbers, and torsion', () => {
  it('acceptance 3', async () => {
    // a built Ø20 × 500 mm shaft weighs π r² L ρ, its density its material's own, for three materials
    const V = Math.PI * 0.01 ** 2 * 0.5;
    for (const mat of ['steel-alloy', 'al-6061', 'brass']) {
      const made = await node('piece.shaft', { size: '20', length: 500, mat });
      const m = await node('measure', {}, { thing: made.thing }), rho = prop(mat, 'density')!.value;
      expect(densityKg(mat)).toBe(rho);
      expect(rel(m.mass, V * rho), `${mat}: ${m.mass} kg against V ρ ${V * rho}`).toBeLessThan(1e-9);
    }
    // a material the tables do not know is refused, saying why; so is the matter node asked of it
    await expect(node('piece.shaft', { size: '20', length: 500, mat: 'unobtainium' })).rejects.toThrow(/"unobtainium" is not a material here: no row in matter\.ts.*no density/);
    await expect(node('matter', { mat: 'unobtainium' })).rejects.toThrow(/is not a material here/);
    // the shaft's node offers the material as a choice, from the materials that can be weighed
    const mats = LIBRARY.get('piece.shaft')!.settings!.find((s) => s.key === 'mat')!;
    expect(mats.default).toBe('steel-alloy'); expect(mats.choices).toContain('brass'); expect(mats.choices).not.toContain('unobtainium');
    // every handbook grade is reached by a material of its own (not a stand-in), its numbers the grade's
    const ids = new Set(HANDBOOK.map((m) => m.id)), missing: string[] = [];
    for (const g of UNREACHED) {
      expect(ids.has(g), g).toBe(true);
      const id = Object.keys(MATTER).find((k) => MATTER[k]!.handbook === g && MATTER[k]!.same);
      if (!id) { missing.push(g); continue; }
      const m = matterOf(id), E = m.props.find((p) => p.key === 'E')!, hb = HANDBOOK.find((x) => x.id === g)!;
      expect(m.handbook).toMatchObject({ id: g, same: true });
      expect(E.evidence, `${id} E`).not.toBe('stand-in');
      expect(prop(id, 'density'), `${id} density`).toBeTruthy();
      if (!m.props.some((p) => p.key === 'E' && /Wood Handbook|FPL/.test(p.source))) expect(E.value, `${id} E`).toBe(hb.E);
    }
    expect(missing, 'grades no material reaches').toEqual([]);
    // shear modulus: derived where no table gives it, G = E / 2 (1 + ν), and said so; none for wood (orthotropic)
    for (const id of ['steel-low', 'al-6061', 'brass', 'abs', 'steel-a36']) {
      const G = prop(id, 'G')!, E = prop(id, 'E')!.value, nu = prop(id, 'nu')!.value;
      expect(G.value).toBe(E / (2 * (1 + nu))); expect(G.source).toMatch(/^derived: G = E \/ 2 \(1 \+ ν\)/);
    }
    expect(prop('steel-low', 'G')!.evidence).toBe('derived');
    expect(prop('red-oak', 'G')).toBeUndefined();
    // the most it stands in service, where the heat gate's table gives it: typical, in kelvin
    expect(prop('abs', 'Tmax')).toMatchObject({ value: 85 + 273.15, unit: 'K', evidence: 'typical' });
    // the matter node gives its figures as numbers on ports
    const mn = await node('matter', { mat: 'al-6061' });
    for (const k of ['density', 'E', 'G', 'nu', 'yield']) expect(typeof mn[k], k).toBe('number');
    expect(mn.E).toBe(68.9e9); expect(mn.nu).toBe(0.33); expect(mn.G).toBe(68.9e9 / 2.66);
  }, 30000);

  it('acceptance 4', async () => {
    // a built Ø20 mm steel shaft 500 mm long, twisted 100 N m
    const T = 100, r = 0.01, d = 0.02, L = 0.5, mat = 'steel-alloy';
    const made = await node('piece.shaft', { size: '20', length: 500 });
    const tw = await node('bend', { load: 0, torque: T }, { thing: made.thing });
    // the laws, each as its own node, from the material's own numbers on the matter node's ports
    const mn = await node('matter', { mat });
    const G = (await node('law.shear-modulus.isotropic', {}, { E: mn.E, nu: mn.nu })).G;
    const J = (await node('law.section.circle.polar-moment', {}, { r })).J;
    const tau = (await node('law.torsion.solid', {}, { T, d })).tau;
    const theta = (await node('law.torsion.twist', {}, { T, L, G, J })).theta;
    expect(rel(G, mn.G)).toBeLessThan(1e-9);
    expect(rel(tw.tau, tau), `τ ${tw.tau} against the law's ${tau}`).toBeLessThan(1e-9);
    expect(rel(tw.theta, theta), `θ ${tw.theta} against the law's ${theta}`).toBeLessThan(1e-9);
    // and by hand: τ = T r / J, θ = T L / (G J), J = π r⁴ / 2, G = E / 2 (1 + ν)
    const Jh = (Math.PI * r ** 4) / 2, Gh = prop(mat, 'E')!.value / (2 * (1 + prop(mat, 'nu')!.value));
    expect(rel(tw.tau, (T * r) / Jh)).toBeLessThan(1e-9);
    expect(rel(tw.theta, (T * L) / (Gh * Jh))).toBeLessThan(1e-9);
    expect(String(tw.says)).toMatch(/τ = T r \/ J/);
    // a material changes the twist by its own G: aluminium twists G_steel / G_al as far
    const al = await node('bend', { load: 0, torque: T }, { thing: (await node('piece.shaft', { size: '20', length: 500, mat: 'al-6061' })).thing });
    expect(rel(al.theta / tw.theta, prop(mat, 'G')!.value / prop('al-6061', 'G')!.value)).toBeLessThan(1e-9);
    // on a board: the matter node's G wired into the twist law, the shaft's length off the measure node
    const b = emptyBoard('torsion'), dd = (id: string) => defaultsOf(LIBRARY.get(id)!);
    placeBlock(b, 'piece.shaft', 0, 0, { ...dd('piece.shaft'), size: '20', length: 500 }, 'shaft');
    placeBlock(b, 'matter', 0, 0, { ...dd('matter'), mat }, 'mat');
    placeBlock(b, 'law.section.circle.polar-moment', 0, 0, dd('law.section.circle.polar-moment'), 'J');
    placeBlock(b, 'in.number', 0, 0, { ...dd('in.number'), value: '100', unit: 'N m' }, 'T');
    placeBlock(b, 'in.number', 0, 0, { ...dd('in.number'), value: '0.01', unit: 'm' }, 'r');
    placeBlock(b, 'measure', 0, 0, {}, 'm');
    placeBlock(b, 'law.torsion.twist', 0, 0, dd('law.torsion.twist'), 'tw');
    wire(b, 'shaft', 'thing', 'm', 'thing'); wire(b, 'r', 'value', 'J', 'r'); wire(b, 'T', 'value', 'tw', 'T'); wire(b, 'm', 'h', 'tw', 'L'); wire(b, 'mat', 'G', 'tw', 'G'); wire(b, 'J', 'J', 'tw', 'J');
    const e = new Engine(b, {} as never, new Memo()); await e.run();
    const on = e.state.get('tw')?.out as Record<string, number> | undefined;
    expect(on?.theta, JSON.stringify(e.state.get('tw')).slice(0, 300)).toBeDefined();
    expect(rel(on!.theta, tw.theta)).toBeLessThan(1e-9);
    // what is not round is refused, saying so
    const box = { name: 'bar', shape: { box: [0.02, 0.5, 0.02] }, mat };
    await expect(node('bend', { load: 0, torque: T }, { thing: box })).rejects.toThrow(/only round rods are worked here/);
  }, 30000);
});

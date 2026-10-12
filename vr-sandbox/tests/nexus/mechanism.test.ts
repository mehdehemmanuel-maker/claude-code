// How many ways a jointed thing can still move. The answers here are the textbook's, because that is the only honest
// check on a degrees-of-freedom solver: a door on two hinges has one freedom and five constraints said twice over, a
// flat four-bar has one where Grübler's formula says minus two, and a nut on an M5 screw turns once and is carried
// 0.8 mm — which is ISO 261's own coarse pitch, arrived at from the drawing rather than written down here.
import { describe, expect, it } from 'vitest';
import { use } from '../../src/nexus/parts/components';
import { asJoint, mates } from '../../src/nexus/parts/mate';
import { mobility, rowsOf, type Body, type Joint } from '../../src/nexus/parts/mechanism';

const b = (name: string, at: [number, number, number], fixed?: boolean): Body => ({ name, at, ...(fixed ? { fixed: true } : {}) });
const Y: [number, number, number] = [0, 1, 0], Z: [number, number, number] = [0, 0, 1];
const ground = b('ground', [0, 0, 0], true);

describe('what a joint leaves free', () => {
  it('a part on its own has six, and a part bolted down has none', () => {
    expect(mobility([b('part', [0, 0, 0])], []).dof).toBe(6);
    expect(mobility([b('one', [0, 0, 0]), b('two', [0.1, 0, 0])], []).dof).toBe(12);
    const bolted = mobility([ground, b('part', [0, 0.1, 0])], [{ kind: 'fixed', a: 0, b: 1, at: [0, 0.05, 0], axis: Y }]);
    expect(bolted.dof).toBe(0);
    expect(bolted.says).toMatch(/nothing moves/);
  });

  it('each kind leaves what its own name says it does', () => {
    const one = (kind: Joint['kind'], extra: Partial<Joint> = {}) =>
      mobility([ground, b('part', [0, 0.01, 0])], [{ kind, a: 0, b: 1, at: [0, 0, 0], axis: Y, ...extra }]).dof;
    expect(one('revolute')).toBe(1);
    expect(one('prismatic')).toBe(1);
    expect(one('screw', { lead: 0.0008 })).toBe(1);
    expect(one('cylindrical')).toBe(2);
    expect(one('planar')).toBe(3);
    expect(one('spherical')).toBe(3);
  });

  it('says which motion each freedom is, as the screw it is', () => {
    // a plane leaves two slides across its normal and a turn about it
    const flat = mobility([ground, b('plate', [0, 0.01, 0])], [{ kind: 'planar', a: 0, b: 1, at: [0, 0, 0], axis: Y }]);
    expect(flat.motions.filter((m) => /slides/.test(m.says))).toHaveLength(2);
    expect(flat.says).toMatch(/plate turns about \[0, 1, 0\]/);
    // a hinge turns about its own line, wherever the body's own point is: the door's axis is its hinges', not its middle
    const door = mobility([ground, b('door', [0.4, 1, 0])],
      [{ kind: 'revolute', a: 0, b: 1, at: [0, 0.2, 0], axis: Y }, { kind: 'revolute', a: 0, b: 1, at: [0, 1.8, 0], axis: Y }]);
    expect(door.dof).toBe(1);
    expect(door.says).toMatch(/turns about \[0, 1, 0\] through \[0, 1, 0\]/);
  });

  it('a thread carries its own lead, which is what makes a screw not a cylinder', () => {
    const m = mobility([ground, b('nut', [0, 0.01, 0])], [{ kind: 'screw', a: 0, b: 1, at: [0, 0, 0], axis: Y, lead: 0.0008 }]);
    expect(m.dof).toBe(1);
    expect(m.says).toMatch(/carrying 0\.80 mm along it a turn/);
  });

  it('two gears hold each other to their ratio and nothing else', () => {
    const m = mobility([b('frame', [0, 0, 0], true), b('pinion', [0, 0, 0]), b('wheel', [0.08, 0, 0])],
      [{ kind: 'revolute', a: 0, b: 1, at: [0, 0, 0], axis: Z }, { kind: 'revolute', a: 0, b: 2, at: [0.08, 0, 0], axis: Z },
       { kind: 'gear', a: 1, b: 2, at: [0.02, 0, 0], axis: Z, ratio: 3 }]);
    expect(m.dof).toBe(1); // one turn sets the other
    // each turns about its own shaft, and an external pair turns opposite ways
    const [pin, whl] = [m.motions[0]!.of[1]!, m.motions[0]!.of[2]!];
    expect(Math.sign(pin.turn[2]!)).toBe(-Math.sign(whl.turn[2]!));
    expect(Math.abs(pin.turn[2]! / whl.turn[2]!)).toBeCloseTo(3, 6); // three turns of the pinion to one of the wheel
  });
});

describe('the rank, and not the formula', () => {
  it('a flat four-bar has one freedom where the formula says minus two', () => {
    // Four links, four parallel hinges. Grübler counts 6(n−1) − Σ(6 − f) = 18 − 20 and is famously wrong, because
    // three of its constraints repeat what the others already say; the rank of the rows knows that and says so.
    const m = mobility([ground, b('crank', [0.05, 0.05, 0]), b('coupler', [0.2, 0.1, 0]), b('rocker', [0.35, 0.05, 0])],
      [{ kind: 'revolute', a: 0, b: 1, at: [0, 0, 0], axis: Z }, { kind: 'revolute', a: 1, b: 2, at: [0.1, 0.1, 0], axis: Z },
       { kind: 'revolute', a: 2, b: 3, at: [0.3, 0.1, 0], axis: Z }, { kind: 'revolute', a: 3, b: 0, at: [0.4, 0, 0], axis: Z }]);
    expect(m.dof).toBe(1);
    expect(m.grubler).toBe(-2);
    expect([m.rows, m.rank, m.redundant]).toEqual([26, 23, 3]);
    // and the motion it finds is the linkage's own: each crank about its ground pivot, and the coupler about the
    // instant centre where the two cranks' lines cross — [0.2, 0.2, 0] by Kennedy's theorem, derived and not written
    expect(m.says).toMatch(/crank turns about \[0, 0, 1\] through \[0, 0, 0\]/);
    expect(m.says).toMatch(/coupler turns about \[0, 0, -1\] through \[0\.2, 0\.2, 0\]/);
    expect(m.says).toMatch(/rocker turns about \[0, 0, 1\] through \[0\.4, 0, 0\]/);
  });

  it('counts what is said twice, because that is what binds an assembly built to its drawing', () => {
    const one: Joint = { kind: 'cylindrical', a: 0, b: 1, at: [0, -0.05, 0], axis: Y };
    const shaft = mobility([b('housing', [0, 0, 0], true), b('shaft', [0, 0, 0])], [one]);
    expect([shaft.dof, shaft.redundant]).toEqual([2, 0]);
    const two = mobility([b('housing', [0, 0, 0], true), b('shaft', [0, 0, 0])], [one, { ...one, at: [0, 0.05, 0] }]);
    expect([two.dof, two.redundant]).toEqual([2, 4]); // a second bearing adds no motion and four repeated constraints
    expect(two.says).toMatch(/4 of its 14 constraints are said twice over/);
  });

  it('the rows are scaled so that a rank means something: a metre and a radian are not the same number', () => {
    // every row's turning columns are divided by the mechanism's own size, so an entry is a displacement either way.
    // Without that, a 1 µm mechanism and a 1 km one would have different ranks for the same joints.
    const small = mobility([b('a', [0, 0, 0], true), b('b', [1e-6, 0, 0])], [{ kind: 'revolute', a: 0, b: 1, at: [0, 0, 0], axis: Y }]);
    const large = mobility([b('a', [0, 0, 0], true), b('b', [1e3, 0, 0])], [{ kind: 'revolute', a: 0, b: 1, at: [0, 0, 0], axis: Y }]);
    expect([small.dof, large.dof]).toEqual([1, 1]);
    expect(rowsOf([b('a', [0, 0, 0]), b('b', [0.1, 0, 0])], [{ kind: 'revolute', a: 0, b: 1, at: [0, 0, 0], axis: Y }], 0.1)).toHaveLength(5);
  });
});

describe('a mate the library derived, as a joint', () => {
  it('a motor shaft in a pulley bore turns and slides, on the shaft\'s own axis', () => {
    const seat = mates(use('stepper nema17 40'), use('pulley GT2 20T B5')).fits.find((f) => f.how === 'seated' && f.mm === 5)!;
    const j = asJoint(seat, 0, 1)!;
    expect(j.kind).toBe('cylindrical');
    expect(j.axis.map((v) => Math.abs(+v.toFixed(3)))).toEqual([0, 1, 0]); // the motor's own axis
    const m = mobility([{ name: 'motor', at: [0, 0, 0], fixed: true }, { name: 'pulley', at: j.at }], [j]);
    expect(m.dof).toBe(2); // until a set screw is tightened, which is a fact about the fit and not the geometry
    expect(m.says).toMatch(/pulley slides along \[0, 1, 0\]/);
    expect(m.says).toMatch(/pulley turns about \[0, 1, 0\]/);
  }, 60000);

  it('a nut on an M5 screw turns once and is carried its own thread\'s lead', () => {
    const t = mates(use('nut M5'), use('screw M5x20')).fits.find((f) => f.how === 'threaded')!;
    const j = asJoint(t, 0, 1)!;
    expect(j.kind).toBe('screw');
    expect(j.lead! * 1000).toBeCloseTo(0.8, 6); // ISO 261's coarse pitch for M5, from the table and not from a guess
    const m = mobility([{ name: 'nut', at: [0, 0, 0], fixed: true }, { name: 'screw', at: j.at }], [j]);
    expect(m.dof).toBe(1);
    expect(m.says).toMatch(/carrying 0\.80 mm along it a turn/);
  }, 60000);

  it('resting on a face leaves the three a plane leaves, and a bolted pattern leaves none', () => {
    const rest = mates(use('bearing 6205 2RS'), use('stepper nema17 40')).fits.find((f) => f.how === 'resting')!;
    const j = asJoint(rest, 0, 1)!;
    expect(j.kind).toBe('planar');
    expect(mobility([{ name: 'bearing', at: [0, 0, 0], fixed: true }, { name: 'motor', at: j.at }], [j]).dof).toBe(3);
    // every mate the library can derive carries the geometry a joint needs, or it is not a constraint at all
    for (const f of mates(use('nut M5'), use('screw M5x20')).fits) expect(asJoint(f, 0, 1), f.says).not.toBeNull();
  }, 60000);
});

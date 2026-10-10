// What causes what in a machine (src/nexus/embody/causal.ts): the graph is read from any machine's parts, and a
// break in it is found where it lies, with what it hangs from and what hangs from it.

import { describe, expect, it } from 'vitest';
import { car, printer } from '../../src/nexus/ask/asked';
import { generate } from '../../src/nexus/substrate/manifold';
import { embodyAny } from '../../src/nexus/embody/any';
import { breaks, causalOf, trace } from '../../src/nexus/embody/causal';

const machineOf = (i: ReturnType<typeof car>) => embodyAny(i, generate(i))!;

describe('what causes what', () => {
  it('reads a car: each motor fed from the pack and commanded by the controller, driving its wheel; and nothing broken', () => {
    const m = machineOf(car()), c = causalOf(m);
    const motors = c.nodes.filter((n) => n.kind === 'actuator' && /\/motor$/.test(n.id));
    expect(motors.length).toBe(m.values.find((v) => v.name === 'driven wheels')!.value);
    for (const n of motors) {
      const up = trace(c, n.id, 'up', ['power', 'signal']);
      expect(up).toContain('battery/cells');
      expect(up).toContain('control/controller');
      expect(trace(c, n.id, 'down', ['drive'])).toContain(`${n.id.split('/')[0]}/wheel`);
      // every node keeps its parts: traceable to the hardware
      expect(n.parts.every((id) => m.parts.some((p) => p.id === id))).toBe(true);
    }
    expect(breaks(c)).toEqual([]);
  });

  it('reads the printer the same way, with no law written for it: every motor and the heater powered and commanded', () => {
    const c = causalOf(machineOf(printer()));
    for (const n of c.nodes.filter((x) => x.kind === 'actuator' && /motor|melt/.test(x.id))) {
      expect(c.edges.some((e) => e.to === n.id && e.carries === 'power')).toBe(true);
      expect(c.edges.some((e) => e.to === n.id && e.carries === 'signal')).toBe(true);
    }
    expect(breaks(c).filter((b) => /power|commands|holds/.test(b.says))).toEqual([]);
  });

  it('finds a cut cable as the break where it lies: the motor it fed, with the pack upstream and the wheel downstream', () => {
    const m = machineOf(car()), cut = { ...m, parts: m.parts.filter((p) => p.id !== 'wiring/wheel-rear-left motor') };
    const b = breaks(causalOf(cut)).find((x) => x.node === 'wheel-rear-left/motor')!;
    expect(b.says).toBe('no power reaches it');
    expect(b.upstream).toContain('control/controller');
    expect(b.downstream).toContain('wheel-rear-left/wheel');
  });
});

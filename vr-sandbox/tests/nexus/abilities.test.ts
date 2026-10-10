// If this, then that: every creature put to the same laws comes out as it is. Haldane's mouse walks away from a fall a
// man does not; Purcell's bacterium cannot coast; a flatworm needs no vessels because it is flat; a bee hovers, an eagle
// soars but cannot hover, a man with wings cannot lift himself; an eagle sees a mouse a man cannot.

import { describe, expect, it } from 'vitest';
import { ABILITIES, CREATURES, canDo, restingPower } from '../../src/nexus/ask/abilities';
import { valueIn } from '../../src/nexus/substrate/lawgraph';

const c = (id: string) => CREATURES.find((x) => x.id === id)!;
const can = (id: string, ability: string) => canDo(c(id)).find((v) => v.ability === ABILITIES.find((a) => a.id === ability)!.name)?.ok;

describe('what creatures can do, by the same laws', () => {
  it('burn what Kleiber\'s law with a space-filling network\'s ¾ says', () => {
    expect(valueIn(restingPower(c('human')), 'W')!).toBeCloseTo(84.7, 0);
    expect(valueIn(restingPower(c('mouse')), 'W')! / 0.025).toBeGreaterThan(valueIn(restingPower(c('elephant')), 'W')! / 3000 * 10); // a gram of mouse burns over ten times a gram of elephant
  });
  it('fall: the mouse, the sparrow and the bee walk away; the man and the elephant do not (Haldane 1926)', () => {
    for (const id of ['mouse', 'sparrow', 'honey-bee']) expect(can(id, 'survive-any-fall'), id).toBe(true);
    for (const id of ['human', 'elephant']) expect(can(id, 'survive-any-fall'), id).toBe(false);
  });
  it('vessels: what is thin enough lives by diffusion; anything thicker than a millimetre or so needs a delivery system', () => {
    for (const id of ['flatworm', 'c-elegans', 'tardigrade', 'e-coli']) expect(can(id, 'no-vessels'), id).toBe(true);
    for (const id of ['human', 'mouse', 'elephant', 'honey-bee', 'blue-whale']) expect(can(id, 'no-vessels'), id).toBe(false); // the bee by its air tubes
  });
  it('flight: a bee hovers; an eagle and a man with wings cannot', () => {
    expect(can('honey-bee', 'hover')).toBe(true); expect(can('eagle', 'hover')).toBe(false); expect(can('person-with-wings', 'hover')).toBe(false);
  });
  it('coasting: a bacterium stops dead (Purcell 1977); a whale glides on', () => {
    expect(can('e-coli', 'coast')).toBe(false); expect(can('blue-whale', 'coast')).toBe(true);
  });
  it('cold and sight: an elephant keeps warm in the arctic where a mouse and a bare man cannot; an eagle sees a mouse a man cannot', () => {
    expect(can('elephant', 'keep-warm-arctic')).toBe(true); expect(can('mouse', 'keep-warm-arctic')).toBe(false); expect(can('human', 'keep-warm-arctic')).toBe(false);
    expect(can('eagle', 'see-a-mouse')).toBe(true); expect(can('human', 'see-a-mouse')).toBe(false);
  });
  it('every verdict rests on its laws', () => {
    for (const cr of CREATURES) for (const v of canDo(cr)) { expect(v.laws.length, `${cr.id} ${v.ability}`).toBeGreaterThan(0); expect(v.ok).not.toBeNull(); }
  });
});

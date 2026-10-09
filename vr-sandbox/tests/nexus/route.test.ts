import { describe, expect, it } from 'vitest';
import { routeMake } from '../../src/nexus/route';

describe('where an ask to make something goes', () => {
  it('finds a kit by the thing it is, never by a word in what it does', () => {
    expect(routeMake('drone that plants trees').kit?.id).not.toBe('plant');
    expect(routeMake('printer that prints houses').kit?.id).not.toBe('house');
    const semi = routeMake('semi truck that is also an ATV');
    expect(semi.by).toBe('kit'); expect(semi.kit?.id).toBe('semi truck'); expect(semi.notDone).toMatch(/that is also an ATV/);
  });
  it('says what of the ask it did not do, beside what it made', () => {
    const r = routeMake('forklift that can climb stairs');
    expect(r.by).toBe('kit'); expect(r.notDone).toMatch(/climb stairs/); expect(r.notDone).not.toMatch(/a forklift \(/);
  });
  it('invents what turns one thing into another, rather than reading it as a load moved', () => {
    expect(routeMake('device that pulls water out of the air').by).toBe('invent');
    expect(routeMake('machine that turns ocean waves into drinking water').by).toBe('invent');
    expect(routeMake('lamp powered by gravity').by).toBe('invent');
  });
  it('still designs what it must do under the laws, and makes a thing named plainly by its kit', () => {
    expect(routeMake('cart that carries 150 kg at 8 km/h').by).toBe('design');
    expect(routeMake('shelf for 40 kg of books').by).toBe('design');
    expect(routeMake('red sports car').kit?.id).toBe('car');
    expect(routeMake('3D printer').item?.id).toBe('printer-fdm');
  });
});

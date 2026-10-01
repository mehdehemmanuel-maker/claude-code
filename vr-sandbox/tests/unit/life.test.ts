import { describe, expect, it } from 'vitest';
import { amountIn, categoryOf, Life, whenIn } from '../../src/assistant/life';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe('Ego and your life', () => {
  it('remembers what you tell her and gives it back when you ask, however you ask', () => {
    const store = memory();
    const life = new Life(store);
    life.remember("Remember that my sister's birthday is March 3");
    life.remember('my locker code is 4471');
    const again = new Life(store);
    expect(again.recall("When is my sister's birthday?")?.value).toBe('March 3');
    expect(again.recall("what's my locker code")?.value).toBe('4471');
    expect(again.recall('what is the capital of France')).toBeNull();
    // told again, the newer stands
    again.remember('my locker code is 9000');
    expect(again.recall('locker code')?.value).toBe('9000');
  });

  it('reminds you when it is due, once', () => {
    const now = new Date('2026-10-01T14:00:00');
    const life = new Life(memory());
    const r = life.remind('remind me to call mom in 20 minutes', now)!;
    expect(r.what).toBe('call mom');
    expect(new Date(r.due).getTime() - now.getTime()).toBe(20 * 60e3);
    expect(life.due(new Date('2026-10-01T14:10:00'))).toEqual([]);
    expect(life.due(new Date('2026-10-01T14:21:00')).map((x) => x.what)).toEqual(['call mom']);
    expect(life.due(new Date('2026-10-01T14:30:00'))).toEqual([]);
    expect(whenIn('at 5 pm', now)!.getHours()).toBe(17);
    expect(whenIn('at 9', now)!.getHours()).toBe(21); // the next 9 o'clock
    expect(whenIn('tomorrow at 9 am', now)!.getDate()).toBe(2);
  });

  it('keeps your money straight: what came in, what went out, where, and against your budget', () => {
    const life = new Life(memory());
    const t = (d: number) => new Date(`2026-10-0${d}T12:00:00`);
    expect(amountIn('I spent $40.50 on gas')).toBe(40.5);
    expect(amountIn('12 bucks for lunch')).toBe(12);
    expect(categoryOf('groceries at the store')).toBe('food');
    life.spend('I spent $40 on gas', t(1));
    life.spend('paid 12 bucks for lunch', t(2));
    life.spend('$90 groceries', t(3));
    life.spend('I got paid $500', t(3));
    life.budget('set a budget of $80 a week for food');
    const s = life.summary(t(1), t(7));
    expect(s.spent).toBe(142);
    expect(s.earned).toBe(500);
    expect(s.byCategory).toEqual({ transport: 40, food: 102 });
    expect(s.over.map((o) => o.category)).toEqual(['food']);
  });
});

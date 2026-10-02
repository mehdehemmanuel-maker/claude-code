// The live watchdog: a body shaking in place with nothing driving it is wrong; one an actuator drives (a walker's foot
// swinging on its servo) moves because something moves it. Found when Ego, told a walking dog's feet were "shaking in
// place", stilled them mid-stride and it fell.

import { describe, expect, it } from 'vitest';
import { Watchdog, type BodyInfo } from '../../src/diagnostics/watchdog';

function shake(driven: boolean) {
  const info = new Map<string, BodyInfo>([['foot', { mass: 0.001, gyration: 0.005 }]]);
  const w = new Watchdog(info, { settleTicks: 10, driven: driven ? new Set(['foot']) : new Set() });
  for (let k = 0; k < 120; k++) {
    // back and forth 2 cm at 2 Hz, going nowhere
    const t = k / 90, x = 0.01 * Math.sin(2 * Math.PI * 2 * t), v = 0.01 * 2 * Math.PI * 2 * Math.cos(2 * Math.PI * 2 * t);
    w.observe([{ id: 'foot', p: [x, 0.5, 0], v: [v, 0, 0], w: [0, 0, 0] }]);
  }
  return w.anomalies().map((a) => a.kind);
}

describe('the watchdog', () => {
  it('flags a body shaking in place, but not one an actuator drives', () => {
    expect(shake(false)).toContain('jitter');
    expect(shake(true)).toEqual([]);
  });
});

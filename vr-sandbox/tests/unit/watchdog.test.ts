// The live watchdog is an observer: a body shaking in place with nothing paying for the motion is wrong; one a drive
// does work on (a walker's foot swinging on its servo) moves because something moves it, and the drive's work says so. Found when Ego, told a walking dog's feet were "shaking in
// place", stilled them mid-stride and it fell.

import { describe, expect, it } from 'vitest';
import { Watchdog, type BodyInfo } from '../../src/diagnostics/watchdog';

function shake(driven: boolean) {
  const info = new Map<string, BodyInfo>([['foot', { mass: 0.001, gyration: 0.005 }]]);
  const w = new Watchdog(info, { settleTicks: 10 });
  for (let k = 0; k < 120; k++) {
    // back and forth 2 cm at 2 Hz, going nowhere
    const t = k / 90, x = 0.01 * Math.sin(2 * Math.PI * 2 * t), v = 0.01 * 2 * Math.PI * 2 * Math.cos(2 * Math.PI * 2 * t);
    // a servo swinging it puts in, each half cycle, the energy its swing holds: its work over the window covers what
    // the foot holds, which is what makes the motion its doing rather than nobody's
    if (driven) w.observeDrives(new Map([['foot', 0.5 * 0.001 * v * v * (4 / 90)]]));
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

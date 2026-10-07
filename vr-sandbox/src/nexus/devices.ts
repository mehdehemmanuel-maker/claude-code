// What the workshop builds, running in the room: each device set down does what its program (a pipeline on the boards)
// tells it, through its own parts. The rover drives on two N20 gear motors as a differential drive, sees ahead with
// its time-of-flight sensor (40 mm to 4 m, as the VL53L1X's datasheet gives), knows its heading from its gyro, and
// runs down its two 18650 cells; its firmware stops it short of anything within 60 mm whatever its program says (a
// bumper's job). The pan-tilt camera turns at its servos' speed (MG996R: 0.17 s for 60° at 4.8 V). The microscope
// focuses its stage a stepper's step at a time (1.8° on a 2 mm lead screw: 0.01 mm). The weather station reads the
// weather where you are when the forge knows it, else the room's. The scale reads what is on it.
//
// Speeds, accelerations and the motors' draw are estimates for these parts in this use; the sensor ranges and step
// sizes are the datasheets'.

import { wheelSpeeds } from './motion';

export interface Device {
  id: string; recipe: string; name: string;
  x: number; z: number; h: number;
  /** the speed it is told and has (m/s), turning it is told and has (rad/s), how far it still has to turn (rad) */
  want: number; v: number; turnLeft: number; w: number;
  /** a speed told while it turns, taken up when the turn is done (a turn finishes before it drives on) */ after: number | null;
  /** its readings, by name (mm, °, %, m/s, …) */ read: Record<string, number>;
  /** what it does now, in words; what it did */ doing: string; log: string[];
  /** its cells' charge (Wh) and what they hold full */ wh: number; whFull: number;
  pan: number; tilt: number; panTo: number; tiltTo: number; focus: number; focusTo: number;
}
/** The rover's limits (estimates for N20 motors at 6 V on 34 mm wheels, 80 mm apart). */
export const ROVER = { vmax: 0.45, a: 0.6, brake: 2.0, w: 2.4, track: 0.08, wheel: 0.017, stop: 60, range: [40, 4000] as const, watts: 1.8 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Devices {
  list: Device[] = [];
  /** the weather's temperature and humidity where you are, when the forge knows it */ outside: { temperature?: number; humidity?: number; pressure?: number } = {};
  /** what stands on the scale, g */ onScale = 0;
  spawn(recipe: string, name: string, x: number, z: number, h = 0): Device {
    const id = recipe.replace(/[^a-z]/g, ''), n = this.list.filter((d) => d.recipe === recipe).length;
    const d: Device = { id: n ? `${id}${n + 1}` : id, recipe, name, x, z, h, want: 0, v: 0, turnLeft: 0, w: 0, after: null, read: {}, doing: 'just set down', log: [], wh: 21.6, whFull: 21.6, pan: 0, tilt: 0, panTo: 0, tiltTo: 0, focus: 0, focusTo: 0 };
    this.list.push(d); return d;
  }
  find(name: string): Device | null { const n = name.toLowerCase().replace(/[^a-z0-9]/g, ''); return this.list.find((d) => d.id === n || d.recipe.replace(/[^a-z]/g, '') === n) ?? null; }
  private say(d: Device, s: string): void { d.log.push(s); if (d.log.length > 30) d.log.shift(); d.doing = s; }
  /** A command to a device, in words: what it does, or why it cannot. */
  command(d: Device, what: string): string {
    const w = what.trim().toLowerCase(); let m: RegExpExecArray | null;
    if (d.recipe === 'rover') {
      if ((m = /^(?:forward|go|drive)(?:\s+([\d.]+))?$/.exec(w))) { const v = Math.min(ROVER.vmax, Number(m[1] ?? 0.25)); if (Math.abs(d.turnLeft) > 1e-3) { d.after = v; return `${d.name}: forward at ${v} m/s once its turn is done.`; } d.want = v; this.say(d, `driving at ${d.want} m/s`); return `${d.name}: forward at ${d.want} m/s.`; }
      if ((m = /^(?:back|reverse)(?:\s+([\d.]+))?$/.exec(w))) { d.want = -Math.min(ROVER.vmax / 2, Number(m[1] ?? 0.15)); d.turnLeft = 0; this.say(d, 'backing'); return `${d.name}: backing at ${-d.want} m/s.`; }
      if (/^stop$/.test(w)) { d.want = 0; d.turnLeft = 0; d.after = null; this.say(d, 'stopped'); return `${d.name}: stopped.`; }
      if ((m = /^turn\s+(-?[\d.]+)$/.exec(w))) { d.want = 0; d.after = null; d.turnLeft = (Number(m[1]) * Math.PI) / 180; this.say(d, `turning ${m[1]}°`); return `${d.name}: turning ${m[1]}° in place.`; }
      if ((m = /^(?:left|right)(?:\s+([\d.]+))?$/.exec(w))) { const deg = Number(m[1] ?? 90) * (w.startsWith('left') ? 1 : -1); return this.command(d, `turn ${deg}`); }
    }
    if (d.recipe === 'pan-tilt') {
      if ((m = /^pan\s+(-?[\d.]+)$/.exec(w))) { d.panTo = Math.max(-90, Math.min(90, Number(m[1]))); return `${d.name}: panning to ${d.panTo}°.`; }
      if ((m = /^tilt\s+(-?[\d.]+)$/.exec(w))) { d.tiltTo = Math.max(-45, Math.min(60, Number(m[1]))); return `${d.name}: tilting to ${d.tiltTo}°.`; }
      if (/^sweep$/.test(w)) { d.panTo = d.panTo > 0 ? -80 : 80; return `${d.name}: sweeping to ${d.panTo}°.`; }
    }
    if (d.recipe === 'microscope') {
      if ((m = /^focus(?:\s+(-?[\d.]+))?$/.exec(w))) { d.focusTo = m[1] ? Number(m[1]) : 2.35; return m[1] ? `${d.name}: stage to ${d.focusTo} mm.` : `${d.name}: focusing by contrast: the stage stepped 0.01 mm at a time to where the camera's image is sharpest.`; }
    }
    if (/^read$|^weigh$/.test(w)) { this.sense(d, null); return `${d.name}: ${Object.entries(d.read).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing to read'}.`; }
    return `${d.name} does not know "${what}". ${d.recipe === 'rover' ? 'It can: forward [m/s], back, stop, turn <degrees>, left, right.' : d.recipe === 'pan-tilt' ? 'It can: pan <°>, tilt <°>, sweep.' : d.recipe === 'microscope' ? 'It can: focus [mm].' : 'It can: read.'}`;
  }
  /** What a device reads now. For the rover, `ahead` is what its sensor sees (m to the nearest thing ahead, or null). */
  private sense(d: Device, ahead: number | null): void {
    if (d.recipe === 'rover') { const mm = ahead === null ? ROVER.range[1] : Math.max(ROVER.range[0], Math.min(ROVER.range[1], Math.round(ahead * 1000))); d.read = { distance: mm, speed: +d.v.toFixed(2), heading: Math.round(((d.h * 180) / Math.PI + 360) % 360), battery: Math.round((100 * d.wh) / d.whFull) }; }
    else if (d.recipe === 'weather') d.read = { temperature: +(this.outside.temperature ?? 21).toFixed(1), humidity: Math.round(this.outside.humidity ?? 45), pressure: Math.round(this.outside.pressure ?? 1013) };
    else if (d.recipe === 'scale') d.read = { grams: Math.round(this.onScale) };
    else if (d.recipe === 'pan-tilt') d.read = { pan: Math.round(d.pan), tilt: Math.round(d.tilt) };
    else if (d.recipe === 'microscope') d.read = { focus: +d.focus.toFixed(2) };
  }
  /** dt s on: each device moves as its parts let it, and reads. `look` measures how far ahead a rover's sensor sees. */
  step(dt: number, look: (x: number, z: number, h: number) => number | null): void {
    for (const d of this.list) {
      if (d.recipe === 'rover') {
        const ahead = look(d.x, d.z, d.h);
        // its firmware: nothing ahead is driven into, whatever the program says: it brakes hard (its motors shorted) in
        // time to stop 60 mm short, from as fast as it is going (v² / 2a of braking)
        const brakeAt = ROVER.stop / 1000 + (d.v > 0 ? (d.v * d.v) / (2 * ROVER.brake) : 0), hard = ahead !== null && ahead < brakeAt + 0.01 && d.v >= 0;
        if (hard && d.want > 0) { d.want = 0; this.say(d, 'stopped short: something within 60 mm and its stopping distance'); }
        if (d.wh <= 0) { d.want = 0; d.turnLeft = 0; d.doing = 'flat: its cells are empty'; }
        const acc = hard ? ROVER.brake : ROVER.a, dv = Math.max(-acc * dt, Math.min(ROVER.a * dt, d.want - d.v)); d.v += dv;
        // it turns in place only once stopped, then drives on at what it was told while turning
        let w = 0; if (Math.abs(d.turnLeft) > 1e-3) { if (Math.abs(d.v) < 0.02) { w = Math.sign(d.turnLeft) * Math.min(ROVER.w, Math.abs(d.turnLeft) / dt); const step = w * dt; d.turnLeft -= step; d.h = wrap(d.h + step); } } else { d.turnLeft = 0; if (d.after !== null) { d.want = d.after; d.after = null; this.say(d, `driving at ${d.want} m/s`); } }
        d.w = w;
        d.x -= Math.sin(d.h) * d.v * dt; d.z -= Math.cos(d.h) * d.v * dt;
        const [l, r] = wheelSpeeds(d.v, w, ROVER.track, ROVER.wheel), moving = Math.abs(l) + Math.abs(r) > 0.1;
        d.wh = Math.max(0, d.wh - ((moving ? ROVER.watts : 0.8) * dt) / 3600);
        if (!moving && d.doing.startsWith('turning')) d.doing = 'waiting';
        this.sense(d, ahead);
      } else {
        const servo = (60 / 0.17) * dt; // 60° in 0.17 s, degrees this step
        d.pan += Math.max(-servo, Math.min(servo, d.panTo - d.pan)); d.tilt += Math.max(-servo, Math.min(servo, d.tiltTo - d.tilt));
        d.focus += Math.max(-0.5 * dt, Math.min(0.5 * dt, d.focusTo - d.focus));
        this.sense(d, null);
      }
    }
  }
  /** The numbers programs read: each device's readings, as <device>_<reading>. */
  facts(): Record<string, number> { const f: Record<string, number> = {}; for (const d of this.list) for (const [k, v] of Object.entries(d.read)) f[`${d.id}_${k}`] = v; return f; }
}

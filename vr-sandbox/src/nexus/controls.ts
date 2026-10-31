// Controls: blocks a person works by hand while the board runs. A button (pressed or not, how many times), a switch
// (on or off), a stick (left and right, back and forth, and where it has carried something), a slider (a value between
// two ends). Each is worked from whatever the person has: a key on a computer, a button or a stick drawn on a phone's
// screen, a hand's ray in a headset, or a button put on a thing in the 3D world and pressed there.
//
// How a press reaches the board: the page that draws the controls (src/nexus/view/pad.ts) writes the control's state
// here, by its name; it then asks the board to run its control nodes again (they read their state here, so they are
// not pure), and only what they feed runs after them. Two control nodes with one name are one control.
import * as THREE from 'three';
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import { boundsOfAll, isAssembly, place, type Assembly } from './assembly';
import type { Part } from './kits';

/** What every control is at, by its name. */
const STATE = new Map<string, unknown>();
/** A control's state, or what it is before anyone works it. */
export const controlState = <T>(name: string, dflt: T): T => (STATE.has(name) ? (STATE.get(name) as T) : dflt);
/** A control worked: its new state. */
export function setControl(name: string, v: unknown): void { STATE.set(name, v); }
/** Every control forgotten (a board opened afresh). */
export function resetControls(): void { STATE.clear(); }

/** A button's state: down or not, and how many times it has gone down. */
export interface ButtonState { on: boolean; presses: number }
/** A button pressed (down) or let go (up); a toggle's press flips it and its letting go does nothing. */
export function pressButton(name: string, down: boolean, toggle: boolean): ButtonState {
  const s = controlState<ButtonState>(name, { on: false, presses: 0 });
  const next = toggle ? (down ? { on: !s.on, presses: s.presses + 1 } : s) : { on: down, presses: s.presses + (down && !s.on ? 1 : 0) };
  setControl(name, next); return next;
}
/** A stick's state: where it is pushed (x right, y forward, each −1 to 1) and where it has carried something (m). */
export interface StickState { x: number; y: number; px: number; pz: number; turn: number }
/** A stick pushed for `dt` seconds: what it carries moves `speed` m/s at full push, turning toward where it goes (a
 *  car-like stick: forward and back drive, left and right steer while moving) or sliding (x and y move it). */
export function pushStick(name: string, x: number, y: number, dt: number, speed: number, steer: boolean): StickState {
  const s = controlState<StickState>(name, { x: 0, y: 0, px: 0, pz: 0, turn: 0 });
  let { px, pz, turn } = s;
  // (steering as a car: it turns only while it moves, the other way in reverse; forward is along its own −z, away from you)
  if (steer) { turn -= x * dt * 1.8 * Math.sign(y) * Math.min(1, Math.abs(y) * 2); px -= Math.sin(turn) * y * speed * dt; pz -= Math.cos(turn) * y * speed * dt; }
  else { px += x * speed * dt; pz -= y * speed * dt; }
  const next = { x, y, px, pz, turn }; setControl(name, next); return next;
}

const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
const spec = (gloss: string): BlockDef['spec'] => ({ gloss, discipline: 'software.interaction.controls', role: 'data source', codes: [{ scheme: 'ACM CCS 2012', code: '10003120.10003121.10003128', label: 'Human-centered computing: interaction techniques' }] });

/** A button put on a thing: a round cap on a short base, on the top of what it is given (or on the face asked), named so
 *  a press on it in the 3D world is a press of this control. */
export function withButton(t: Part | Assembly, name: string, face: string, colour: number): Assembly {
  const b = boundsOfAll(t), empty = b.isEmpty(), sz = empty ? [0.1, 0.1, 0.1] : b.getSize(new THREE.Vector3()).toArray(), c = empty ? [0, 0, 0] : b.getCenter(new THREE.Vector3()).toArray();
  // (a cap a quarter of the thing's smallest side, between 2 and 12 cm across: a finger's size on a box, a panel's on a car)
  const size = Math.max(0.02, Math.min(0.12, 0.25 * Math.min(...sz.filter((v) => v > 0), 0.4))), r = size / 2, h = r * 0.5;
  const at: [number, number, number] = empty ? [0, h, 0] : face === 'front' ? [c[0]!, c[1]!, b.max.z + h / 2] : face === 'side' ? [b.max.x + h / 2, c[1]!, c[2]!] : [c[0]!, b.max.y + h / 2, c[2]!];
  const rot: [number, number, number] = face === 'front' ? [Math.PI / 2, 0, 0] : face === 'side' ? [0, 0, -Math.PI / 2] : [0, 0, 0];
  const button: Part = { name: `button: ${name}`, parts: [{ name: `button: ${name}`, shape: { cyl: [r * 1.25, h * 0.5] }, at: [0, -h * 0.25, 0], color: 0x222831, mat: 'abs' }, { name: `button: ${name}`, shape: { cyl: [r, h] }, at: [0, h * 0.3, 0], color: colour, mat: 'abs' }] } as Part;
  return { name: `${t.name} with a button`, items: [place(t), place(button, at, rot)] };
}

const COLOURS: Record<string, number> = { red: 0xe53935, green: 0x43a047, blue: 0x1e88e5, yellow: 0xfdd835, white: 0xeceff1 };

register({ version: 1, by: 'built in', pure: false, id: 'control.button', name: 'Button', kind: 'input', ability: 'measure', domains: ['everyday', 'software', 'electrical'],
  spec: spec('A button a person presses while the board runs: down or not, and how many times.'),
  says: 'A button you press while the board runs: on a computer by its key, on a phone by the button drawn on the screen, in a headset by a hand\'s ray; given a thing, the button is put on it (on top, the front or the side) and pressed there, in the 3D world. A toggle stays on until pressed again. It gives whether it is down (or on), how many presses, and the thing with the button on it',
  settings: [{ key: 'name', label: 'Name (its label; one name, one button)', type: 'text', default: 'Go' }, { key: 'key', label: 'Key on a computer (a letter, Space, Enter)', type: 'text', default: 'E' }, { key: 'mode', label: 'Press or toggle', type: 'choice', default: 'press', choices: ['press', 'toggle'] }, { key: 'face', label: 'On the thing, where', type: 'choice', default: 'top', choices: ['top', 'front', 'side'] }, { key: 'colour', label: 'Colour', type: 'choice', default: 'red', choices: Object.keys(COLOURS) }],
  live: (set) => JSON.stringify(controlState(String(set.name || 'Go'), null)),
  ports: { inputs: [P('thing', 'assembly', { optional: true, label: 'a thing to put it on' })], outputs: [P('on', 'boolean', { label: 'down (or on)' }), P('presses', 'integer'), P('thing', 'assembly', { label: 'the thing with the button on it' })] },
  run: (i, c) => { const name = String(c.set.name || 'Go'), s = controlState<ButtonState>(name, { on: false, presses: 0 }), t = i.thing as Part | Assembly | undefined;
    return { on: s.on, presses: s.presses, thing: withButton(t && (isAssembly(t) || typeof (t as Part).name === 'string') ? t : { name: 'nothing' } as Part, name, String(c.set.face), COLOURS[String(c.set.colour)] ?? COLOURS.red!) }; },
  tests: [{ set: { name: 'test-button' }, inputs: {}, outputs: { on: false, presses: 0 } }] } as BlockDef);

register({ version: 1, by: 'built in', pure: false, id: 'control.stick', name: 'Stick (move and steer)', kind: 'input', ability: 'measure', domains: ['everyday', 'software', 'vehicles'],
  spec: spec('A stick a person pushes while the board runs: where it points, and where it has carried something.'),
  says: 'A stick you push while the board runs: on a computer the arrow keys (or W A S D when you are not walking), on a phone a stick drawn on the screen, in a headset the right hand\'s stick. It gives where it is pushed (x right, y forward, −1 to 1) and where it has carried something at its speed: wire px, pz and turn into Place to drive a thing about (steer: forward drives, left and right turn it as a car does)',
  settings: [{ key: 'name', label: 'Name', type: 'text', default: 'Move' }, { key: 'speed', label: 'Speed at full push, m/s', type: 'number', default: 2 }, { key: 'mode', label: 'Slide or steer', type: 'choice', default: 'steer', choices: ['steer', 'slide'] }],
  live: (set) => JSON.stringify(controlState(String(set.name || 'Move'), null)),
  ports: { inputs: [], outputs: [P('x', 'number'), P('y', 'number'), P('px', 'number', { unit: 'm', label: 'carried to, x' }), P('pz', 'number', { unit: 'm', label: 'carried to, z' }), P('turn', 'number', { unit: 'rad', label: 'turned to' })] },
  run: (_, c) => { const s = controlState<StickState>(String(c.set.name || 'Move'), { x: 0, y: 0, px: 0, pz: 0, turn: 0 }); return { x: s.x, y: s.y, px: s.px, pz: s.pz, turn: s.turn }; },
  tests: [{ set: { name: 'test-stick' }, inputs: {}, outputs: { x: 0, y: 0, px: 0, pz: 0 } }] } as BlockDef);

register({ version: 1, by: 'built in', pure: false, id: 'control.slider', name: 'Slider', kind: 'input', ability: 'measure', domains: ['everyday', 'software'],
  spec: spec('A slider a person drags while the board runs: a value between two ends.'),
  says: 'A slider you drag while the board runs, on the controls drawn over the 3D view (a computer or a phone): a value between its two ends, in its unit, wired into anything',
  settings: [{ key: 'name', label: 'Name', type: 'text', default: 'Level' }, { key: 'min', label: 'From', type: 'number', default: 0 }, { key: 'max', label: 'To', type: 'number', default: 1 }, { key: 'value', label: 'Starts at', type: 'number', default: 0.5 }, { key: 'unit', label: 'Unit (SI)', type: 'text', default: '' }],
  live: (set) => JSON.stringify(controlState(String(set.name || 'Level'), null)),
  ports: (s) => ({ inputs: [], outputs: [P('value', 'number', String(s.unit ?? '') ? { unit: String(s.unit) } : {})] }),
  run: (_, c) => { const lo = Number(c.set.min), hi = Number(c.set.max); return { value: Math.min(hi, Math.max(lo, Number(controlState(String(c.set.name || 'Level'), Number(c.set.value))))) }; },
  tests: [{ set: { name: 'test-slider', min: 0, max: 10, value: 4 }, inputs: {}, outputs: { value: 4 } }] } as BlockDef);

/** The controls on a board, as the page draws them: each by its node's settings. */
export interface ControlSpec { id: string; block: 'control.button' | 'control.stick' | 'control.slider'; name: string; set: Record<string, unknown> }
export const CONTROL_BLOCKS = ['control.button', 'control.stick', 'control.slider'] as const;

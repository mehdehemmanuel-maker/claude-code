// How a program reaches a real machine, and how it is watched while it runs.
//
// Everything else in this library makes a thing that exists only here. This file is the wire out: the program, the
// transport that carries it, and the handshake that makes an unreliable radio link safe enough to cut metal over.
//
// Bluetooth, honestly, because the facts decide the whole design:
//
//   - A browser reaches Bluetooth through the Web Bluetooth API, and that is **BLE only** (GATT). Bluetooth Classic
//     and its serial port profile — every HC-05 and HC-06 ever sold — cannot be reached from a browser at all. A works
//     wired with HC-05s is a works that needs a different host, so the bridge below is a BLE part, not a classic one.
//   - The whole of a BLE link is one service with two characteristics. Nordic's UART Service (NUS) is what an ESP32,
//     an nRF52 or an HM-10 exposes, and it is the de facto standard: write to one characteristic, be notified on the
//     other. Its UUIDs are below, and they are the same on every such part.
//   - A BLE write carries ATT MTU − 3 bytes, and the default MTU is 23, so **20 bytes a write** until the two ends
//     negotiate more (185 and 247 are common; a browser does not tell you which you got). A line of G-code is 20 to 60
//     bytes, so every line is two to three writes, and a streamer that ignores this silently truncates commands.
//   - Marlin answers every line with `ok`. That is the flow control: send, wait, send. With a line number and a
//     checksum it also recovers from a dropped byte, which over a radio is not a theoretical worry — `Resend: N` comes
//     back and the line goes again. A streamer without the checksum will one day drop a character out of a feedrate.
//   - Klipper does not take G-code on a serial port from a host program at all: it takes it through Moonraker, over
//     HTTP or a WebSocket. So a Klipper machine is reached over wifi and a Marlin machine over BLE, and this file
//     carries both rather than pretending one way fits.
//
// Owner of: the transports, the Nordic UART constants, the Marlin line protocol (numbering, checksum, resend), the
// streamer that drives a program down a 20-byte pipe, and the programs themselves (G-code for a cut part, a kiln's
// own segments). The browser side — `navigator.bluetooth` and its one user gesture — is a thin adapter over this in
// `view/ble.ts`; everything with a decision in it is here, where it can be tested without a radio.

import type { Profile } from './fab';

/** How a station is driven. */
export type Transport = 'ble-uart' | 'serial' | 'ws-moonraker' | 'hand';
/** What a program is written in. */
export type Lang = 'gcode' | 'kiln' | 'python' | 'hand';

/** Nordic's UART Service: the one BLE service a browser can treat as a serial port, and what every ESP32, nRF52 and
 *  HM-10 bridge exposes. `rx` is written to (host → machine); `tx` is notified on (machine → host). */
export const NUS = {
  service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  rx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  tx: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  says: 'Nordic UART Service. A browser filters on the service UUID, gets the two characteristics, writes to rx and listens on tx: that is the whole of a serial link over BLE',
} as const;
/** What one BLE write carries: ATT MTU − 3. The default MTU is 23, so 20 bytes, and a browser does not report what
 *  was negotiated — so 20 is what a streamer must assume unless the machine's own firmware says otherwise. */
export const BLE_CHUNK = 20;

/** A real machine this works can reach, and how. */
export interface Link {
  /** the station it drives */ station: string;
  transport: Transport; lang: Lang;
  /** for ble-uart: the service to filter on */ service?: string;
  /** for serial: the baud its firmware listens at */ baud?: number;
  /** for ws-moonraker: the path on the machine */ path?: string;
  /** what has to be on the machine for this to work at all */ fit: string;
  says: string;
}
export const LINKS: Link[] = [
  { station: 'printer-fff', transport: 'ble-uart', lang: 'gcode', service: NUS.service, baud: 115200,
    fit: 'a BLE-UART bridge on the board\'s serial header — a XIAO ESP32-C3 (the library draws and prices it) running a UART-to-NUS sketch, its TX to the board\'s RX, its RX to the board\'s TX through a level shifter if the board is 5 V, and grounds tied',
    says: 'Marlin takes G-code on its serial port at 115200 and answers `ok`. The bridge makes that port a BLE characteristic and nothing else changes: the printer does not know it is on a radio' },
  { station: 'printer-fff', transport: 'ws-moonraker', lang: 'gcode', path: '/websocket',
    fit: 'Klipper with Moonraker on a Pi beside the printer (the library draws every Pi it could be)',
    says: 'a Klipper machine is reached over wifi, not Bluetooth: Moonraker takes a JSON-RPC `printer.gcode.script` over a WebSocket. Faster and more reliable than BLE, and it needs a network the BLE route does not' },
  { station: 'cnc-benchtop', transport: 'ble-uart', lang: 'gcode', service: NUS.service, baud: 115200,
    fit: 'the same bridge on a GRBL controller\'s serial header',
    says: 'GRBL answers `ok` the same way Marlin does, so one streamer drives both. GRBL has no line numbers, so the checksum below is sent only to firmware that asked for it' },
  { station: 'mill-knee', transport: 'ws-moonraker', lang: 'gcode',
    fit: 'LinuxCNC on its own machine; it takes a file, not a stream',
    says: 'a real controller runs the program from its own disk: the link sends the file and starts it, rather than feeding it a line at a time' },
  { station: 'kiln', transport: 'hand', lang: 'kiln',
    fit: 'its own controller\'s keypad, and a vented room: there is no port on it to send anything to',
    says: 'a KilnMaster-class controller is programmed at the kiln: six programs of eight segments, each a rate, a target and a hold. The link writes the segments out to be keyed in, and that is honest — there is no port on it' },
  { station: 'arm', transport: 'ws-moonraker', lang: 'python', path: '/',
    fit: 'the arm\'s own controller on the network',
    says: 'the arm takes its maker\'s own commands over TCP (the Meca500\'s are modelled in meca.ts and run here already)' },
  { station: 'laser-co2', transport: 'serial', lang: 'gcode', baud: 115200,
    fit: 'a GRBL or Smoothieware controller; a Ruida one does not take G-code at all, it takes Ruida\'s own binary over its own network port, so a Ruida machine is driven by its own software and the file is handed to it',
    says: 'the cheapest enclosed machines are GRBL inside, and GRBL is G-code: the same streamer that drives the router drives the laser, with S as power instead of spindle speed' },
  { station: 'laser-fibre', transport: 'hand', lang: 'gcode',
    fit: 'its maker\'s own nest-and-cut software on its own controller',
    says: 'a sheet machine is loaded with a nest, not a part: the file is prepared here and run there. There is no stream to send' },
  { station: 'printer-msla', transport: 'hand', lang: 'hand',
    fit: 'the sliced file on a stick, or its own network share',
    says: 'a resin printer takes a sliced layer stack, not a line protocol: there is nothing to stream, and the wash and cure after it are hands' },
  { station: 'lathe', transport: 'hand', lang: 'hand', fit: 'a person with a handwheel, a dial they trust, and the chuck key out of the chuck', says: 'a manual lathe is the operator: the program is the order of the cuts and the diameter to stop at' },
  { station: 'welder', transport: 'hand', lang: 'hand', fit: 'a person in a shade-10 helmet with extraction at the work, and both faces cleaned back to bright metal', says: 'wire speed and voltage are set on the machine; the program is where the tacks go and in what order, because a weld pulls the frame as it cools' },
  { station: 'foundry', transport: 'hand', lang: 'hand', fit: 'a person, a dry mould and a clear floor', says: 'the program is the sequence and the temperature: melt, skim, degas, pour at the range for the alloy' },
  { station: 'wheel', transport: 'hand', lang: 'hand', fit: 'two hands, water, and clay wedged with no air left in it', says: 'the only station here whose program is a skill. The steps are the lesson, and the wheel does not care what you meant' },
  { station: 'forge', transport: 'hand', lang: 'hand', fit: 'a person, tongs and a quench', says: 'the program is colour and time: to non-magnetic, soak, quench, then temper at a measured temperature' },
  { station: 'spot-welder', transport: 'hand', lang: 'hand', fit: 'a person, two clean sheets in contact, and the current and time set by the thickness', says: 'current and time are set by the thickness; the program is the pitch of the spots' },
  { station: 'measuring', transport: 'hand', lang: 'hand', fit: 'a person, a calliper zeroed on closed jaws, and a part at room temperature', says: 'the program is what to measure and against what: a feature, a nominal and a tolerance' },
  { station: 'soldering', transport: 'hand', lang: 'hand', fit: 'a person, a tinned tip at 350 °C and fume taken away from the face', says: 'the lesson is the program, and the hands run it (solder-lesson.ts)' },
  { station: 'bench', transport: 'hand', lang: 'hand', fit: 'a person, the work held so it cannot move, and a way to check each step', says: 'steps, with a check you can see at each one' },
];
export const linkFor = (station: string, want?: Transport): Link | null =>
  LINKS.find((l) => l.station === station && (!want || l.transport === want)) ?? LINKS.find((l) => l.station === station) ?? null;

// ---- Marlin's line protocol ------------------------------------------------------------------------------------
// A line can be sent bare, and most people do. Over a radio it should not be: one dropped byte in `F1200` makes
// `F120`, and the machine does the whole job ten times too slowly with no error anywhere. A line number and a
// checksum turn that into a `Resend:` and a retry, which is the difference between a safe link and a lucky one.

/** Marlin's checksum: the XOR of every byte of the line as sent, before the `*`. */
export const checksum = (line: string): number => { let c = 0; for (let i = 0; i < line.length; i++) c ^= line.charCodeAt(i); return c & 0xff; };
/** A line as Marlin wants it when it is numbered: `N<n> <line>*<xor>`. */
export const numbered = (line: string, n: number): string => { const body = `N${n} ${line}`; return `${body}*${checksum(body)}`; };
/** A program as lines a machine will take: comments and blanks dropped, whitespace tidied. */
export const linesOf = (program: string): string[] =>
  program.split('\n').map((l) => l.replace(/;.*$/, '').trim()).filter(Boolean);
/** What one line becomes on the wire: chunks of at most 20 bytes, because that is what one BLE write carries. */
export const chunksOf = (line: string, size = BLE_CHUNK): string[] => {
  const s = `${line}\n`, out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
};

export type RunState = 'idle' | 'sending' | 'waiting' | 'done' | 'failed';
/** Driving a program down a line-at-a-time link: what to write next, what an answer means, and where it has got to.
 *  No radio, no browser and no timers in here — the adapter does those — so the part with the decisions in it is the
 *  part the gate runs. */
export class Streamer {
  readonly lines: string[];
  /** lines acknowledged */ done = 0;
  /** the line in flight, or null */ sent: number | null = null;
  state: RunState = 'idle';
  /** why it stopped, where it did */ fault: string | null = null;
  /** how many times a line has been sent again */ resends = 0;
  /** what the machine said, newest last (kept short) */ heard: string[] = [];
  constructor(program: string, readonly o: { numbered?: boolean; first?: number; maxResend?: number } = {}) { this.lines = linesOf(program); }
  get total(): number { return this.lines.length; }
  get progress(): number { return this.total ? +(this.done / this.total).toFixed(4) : 1; }
  /** The next thing to write, as BLE-sized chunks, or null when there is nothing to send until an answer comes. */
  next(): string[] | null {
    if (this.state === 'done' || this.state === 'failed') return null;
    if (this.sent !== null) return null; // one line in flight: `ok` is the flow control
    if (this.done >= this.total) { this.state = 'done'; return null; }
    const i = this.done, raw = this.lines[i]!;
    this.sent = i; this.state = 'waiting';
    return chunksOf(this.o.numbered ? numbered(raw, (this.o.first ?? 1) + i) : raw);
  }
  /** What came back. `ok` moves it on; `Resend: n` sends that line again; `Error`/`!!` stops it where it is. */
  heardLine(text: string): void {
    const t = text.trim(); if (!t) return;
    this.heard = [...this.heard.slice(-19), t];
    if (/^ok\b/i.test(t)) { if (this.sent !== null) { this.done = this.sent + 1; this.sent = null; } this.state = this.done >= this.total ? 'done' : 'sending'; return; }
    if (/^resend:?\s*(\d+)/i.test(t)) {
      const n = Number(/^resend:?\s*(\d+)/i.exec(t)![1]!), i = n - (this.o.first ?? 1);
      this.resends++;
      if (this.resends > (this.o.maxResend ?? 10)) { this.state = 'failed'; this.fault = `the machine asked for line ${n} again after ${this.resends} resends: the link is not carrying it`; return; }
      this.done = Math.max(0, i); this.sent = null; this.state = 'sending'; return;
    }
    if (/^(error|!!)/i.test(t)) { this.state = 'failed'; this.fault = `the machine stopped at line ${(this.sent ?? this.done) + 1} of ${this.total}: ${t}`; return; }
    // `busy: processing`, `echo:`, temperature reports: not an answer, keep waiting
  }
  /** Nothing came back in time. */
  timedOut(ms: number): void { this.state = 'failed'; this.fault = `nothing came back for ${ms} ms at line ${(this.sent ?? this.done) + 1} of ${this.total}: the link dropped, or the machine is not answering`; }
}

// ---- the programs ----------------------------------------------------------------------------------------------

/** What a cutter should be run at in a material, on a small machine. Chipload and surface speed are the trade's own
 *  figures; the depth of cut is what a light benchtop frame will take without chattering, which is the number that
 *  stops a 3018 being a mill (typical, and the first thing to raise on a stiffer machine). */
export interface Cutting { rpm: number; feed: number; plunge: number; doc: number; says: string }
export const CUTTING: Record<string, Cutting> = {
  'thermoplastic': { rpm: 12000, feed: 900, plunge: 200, doc: 1.0, says: 'acrylic and ABS: a single-flute cutter, or the chips weld back into the slot' },
  'wood': { rpm: 12000, feed: 1800, plunge: 300, doc: 2.0, says: 'plywood and hardwood: the fastest of them, and the one that wants extraction' },
  'metal-soft': { rpm: 10000, feed: 400, plunge: 80, doc: 0.3, says: 'aluminium on a light frame: 0.3 mm a pass and a 3 mm two-flute, with a drop of paraffin. Deeper than this on a 3018 and the cutter walks' },
  'metal-hard': { rpm: 2500, feed: 120, plunge: 30, doc: 0.2, says: 'steel: not on a benchtop router. These are a knee mill\'s figures with flood coolant' },
  'composite': { rpm: 14000, feed: 600, plunge: 120, doc: 0.5, says: 'carbon and glass laminate: a diamond-cut cutter, and the dust is a hazard — extraction at the cutter, not a mask' },
};

// ---- what a cut actually does ----------------------------------------------------------------------------------
// The figures above are a table. These are the arithmetic over it, and they exist because the first version of the
// works invented a cubic-centimetres-a-minute number per process and then had to be patched twice when it gave
// nine hours for a job that takes half of one. A cut's rate is not a property of a process: it is the cutter, the
// material and the machine, and it comes out of four lines of trade arithmetic that have not changed in a century.

export interface Cut {
  /** cutter diameter, mm */ d: number; /** flutes */ z: number;
  rpm: number; /** mm a minute along the path */ feed: number;
  /** mm the cutter goes down each pass */ doc: number; /** mm of the cutter's width engaged */ woc: number;
  /** surface speed at the cutter's rim, m a minute */ vc: number;
  /** what each tooth takes, mm — the number that decides whether a cutter lives or rubs itself blunt */ fz: number;
  /** material off, cm³ a minute */ mrr: number;
  /** what the spindle must put in, W */ watts: number;
  /** how deep this cutter may go before it chatters, mm */ maxDepth: number;
  /** the smallest inside corner it can leave, mm */ minCorner: number;
  warn: string[]; says: string;
}
/** The specific cutting force of a material, N/mm²: how much power a cubic millimetre a second costs. These are the
 *  trade's own kc figures, which is how a spindle is sized. A 500 W router cutting steel is not slow, it is stalled. */
export const KC: Record<keyof typeof CUTTING, number> = {
  thermoplastic: 250, wood: 200, 'metal-soft': 800, 'metal-hard': 2200, composite: 500,
};
/** What a cutter does in a material: the surface speed, the chip each tooth takes, the material off a minute, the
 *  power that needs, how deep it may go before it chatters, and the smallest inside corner it leaves behind.
 *
 *  The chip load is the one to watch. Below about 0.01 mm a tooth the cutter rubs instead of cutting and work-hardens
 *  the surface in front of itself, which is how a beginner blunts a cutter in a minute and concludes that cheap
 *  cutters are bad. Above the cutter's own limit it breaks. Both are said.
 *
 *  The depth limit is the overhang rule: a cutter chatters past about three times its diameter in metal and five in
 *  wood, whatever its length, because the deflection goes as the cube of the stickout. The corner is unarguable: a
 *  3 mm cutter cannot leave a corner sharper than 1.5 mm, so a drawing with a square internal corner is not a
 *  drawing of a milled part. That is the check no CAD package makes and every machinist makes first. */
export function cutAt(o: { d?: number; z?: number; material?: keyof typeof CUTTING; woc?: number; spindle?: number }): Cut {
  const material = o.material ?? 'thermoplastic', c = CUTTING[material]!;
  const d = o.d ?? 3, z = o.z ?? 2, rpm = c.rpm, feed = c.feed, doc = c.doc;
  const woc = o.woc ?? d * 0.4;
  const vc = +((Math.PI * d * rpm) / 1000).toFixed(1);
  const fz = +(feed / (rpm * z)).toFixed(4);
  const mrr = +((woc * doc * feed) / 1000).toFixed(3);
  const watts = Math.round((mrr * 1000 * KC[material]) / 60000);
  const maxDepth = +(d * (material === 'wood' || material === 'thermoplastic' ? 5 : 3)).toFixed(1);
  const minCorner = +(d / 2).toFixed(2);
  const warn: string[] = [];
  if (fz < 0.01) warn.push(`${fz} mm a tooth is rubbing, not cutting: it work-hardens the surface in front of itself and blunts the cutter in a minute. Feed faster or turn the spindle down`);
  if (fz > d * 0.05) warn.push(`${fz} mm a tooth is more than a twentieth of the cutter's diameter: it will break`);
  if (o.spindle && watts > o.spindle) warn.push(`this cut wants ${watts} W and the spindle has ${o.spindle}: it will stall, bog or belt-slip. Take ${(doc * (o.spindle / watts)).toFixed(2)} mm a pass instead`);
  return { d, z, rpm, feed, doc, woc, vc, fz, mrr, watts, maxDepth, minCorner, warn,
    says: `a ${d} mm ${z}-flute at ${rpm} rev/min and ${feed} mm/min in ${material}: ${vc} m/min at the rim, ${fz} mm a tooth, ${mrr} cm³/min off, ${watts} W at the spindle. It will not go deeper than ${maxDepth} mm without chattering, and it cannot leave an inside corner under ${minCorner} mm` };
}

/** What a cut cannot do to a drawing, said before the drawing is cut rather than after. Each is the trade's own rule
 *  and each is a thing a person otherwise finds out on the machine: an inside corner smaller than the cutter, a
 *  pocket deeper than the cutter may stick out, a hole deeper than five diameters drilled in one plunge, a wall
 *  thinner than it can be held. */
export function cutRefuses(o: { cut: Cut; corner?: number; depth?: number; holeDepth?: number; holeD?: number; wall?: number }): string[] {
  const no: string[] = [], c = o.cut;
  if (o.corner != null && o.corner < c.minCorner)
    no.push(`a ${o.corner} mm inside corner cannot be milled with a ${c.d} mm cutter, which leaves ${c.minCorner}: use a ${(o.corner * 2).toFixed(1)} mm cutter, or draw the corner at ${c.minCorner} and let the mating part have the relief`);
  if (o.depth != null && o.depth > c.maxDepth)
    no.push(`${o.depth} mm deep with a ${c.d} mm cutter is ${(o.depth / c.d).toFixed(1)} diameters of stickout: it chatters, because deflection goes as the cube of it. Step down in ${c.maxDepth} mm passes with a longer tool each time, or use a bigger cutter`);
  if (o.holeDepth != null && o.holeD != null && o.holeDepth > 5 * o.holeD)
    no.push(`a ⌀${o.holeD} hole ${o.holeDepth} deep is ${(o.holeDepth / o.holeD).toFixed(1)} diameters: peck it, or the flutes pack and the drill snaps in the hole, where getting it out costs more than the part`);
  if (o.wall != null && o.wall < c.d / 3)
    no.push(`a ${o.wall} mm wall beside a ${c.d} mm cutter will be pushed over by the cut itself: leave it ${(c.d / 3).toFixed(1)} mm or support it`);
  return no;
}

/** A flat part's real, runnable G-code: drill every hole and cut the outline, in passes the machine will take. The
 *  profile is the one `fab.ts` already makes for a plate — so a part the library designed is a program a machine runs,
 *  with nothing drawn by hand in between. */
export function gcodeFor(p: Profile, o: { material?: keyof typeof CUTTING; thickness: number; cutter?: number; safe?: number; tabs?: boolean }): string {
  const c = CUTTING[o.material ?? 'thermoplastic']!, tool = o.cutter ?? 3, safe = o.safe ?? 5, t = o.thickness;
  const out: string[] = [
    `; ${p.name}: ${p.L} × ${p.W} mm, ${t} mm thick, ${p.holes.length} holes`,
    `; ${c.says}`,
    `; ${tool} mm cutter at ${c.rpm} rev/min, ${c.feed} mm/min, ${c.doc} mm a pass`,
    '; zero at the bottom-left corner of the stock, Z zero on its top face',
    'G21 ; mm', 'G90 ; absolute', 'G17 ; XY plane', 'G94 ; feed per minute',
    `M3 S${c.rpm} ; spindle on`, `G4 P2 ; let it come up to speed`, `G0 Z${safe}`,
  ];
  // the holes: pecked, because a deep hole in one plunge packs its flutes and snaps the drill
  for (const h of p.holes) {
    out.push(`; ${h.why}: ⌀${h.d} at ${h.x}, ${h.y}`);
    if (h.d <= tool + 0.2) { out.push(`G0 X${h.x.toFixed(3)} Y${h.y.toFixed(3)}`, `G83 Z${(-t - 0.5).toFixed(2)} R${safe} Q${Math.max(0.5, h.d / 2).toFixed(2)} F${c.plunge}`, 'G80'); continue; }
    // bigger than the cutter: bore it out in a helix, which a drill of that size could not do on this machine anyway
    const r = (h.d - tool) / 2, turns = Math.ceil((t + 0.5) / c.doc);
    out.push(`G0 X${(h.x + r).toFixed(3)} Y${h.y.toFixed(3)}`, `G1 Z0 F${c.plunge}`);
    for (let k = 1; k <= turns; k++) out.push(`G2 X${(h.x + r).toFixed(3)} Y${h.y.toFixed(3)} I${(-r).toFixed(3)} J0 Z${(-Math.min(t + 0.5, k * c.doc)).toFixed(2)} F${c.feed}`);
    out.push(`G2 X${(h.x + r).toFixed(3)} Y${h.y.toFixed(3)} I${(-r).toFixed(3)} J0 F${c.feed} ; one flat turn to clean it`, `G0 Z${safe}`);
  }
  // the outline, cut outside the line by the cutter's radius, in passes, with tabs so the part does not fly
  const k = tool / 2, [x0, y0, x1, y1] = [-k, -k, p.L + k, p.W + k], passes = Math.ceil((t + 0.5) / c.doc);
  out.push('; the outline, cut outside the line by the cutter\'s radius');
  out.push(`G0 X${x0.toFixed(3)} Y${y0.toFixed(3)}`, `G1 Z0 F${c.plunge}`);
  for (let i = 1; i <= passes; i++) {
    const z = -Math.min(t + 0.5, i * c.doc), last = i === passes;
    out.push(`G1 Z${z.toFixed(2)} F${c.plunge}`);
    if (last && o.tabs !== false) {
      // four tabs, 5 mm wide, 0.6 mm thick, at the middle of each side: cut up to each and over it
      const up = (z + 0.6).toFixed(2);
      out.push(`G1 X${(p.L / 2 - 2.5).toFixed(3)} Y${y0.toFixed(3)} F${c.feed}`, `G1 Z${up}`, `G1 X${(p.L / 2 + 2.5).toFixed(3)}`, `G1 Z${z.toFixed(2)}`, `G1 X${x1.toFixed(3)}`,
        `G1 Y${(p.W / 2 - 2.5).toFixed(3)}`, `G1 Z${up}`, `G1 Y${(p.W / 2 + 2.5).toFixed(3)}`, `G1 Z${z.toFixed(2)}`, `G1 Y${y1.toFixed(3)}`,
        `G1 X${(p.L / 2 + 2.5).toFixed(3)}`, `G1 Z${up}`, `G1 X${(p.L / 2 - 2.5).toFixed(3)}`, `G1 Z${z.toFixed(2)}`, `G1 X${x0.toFixed(3)}`,
        `G1 Y${(p.W / 2 + 2.5).toFixed(3)}`, `G1 Z${up}`, `G1 Y${(p.W / 2 - 2.5).toFixed(3)}`, `G1 Z${z.toFixed(2)}`, `G1 Y${y0.toFixed(3)}`);
    } else out.push(`G1 X${x1.toFixed(3)} F${c.feed}`, `G1 Y${y1.toFixed(3)}`, `G1 X${x0.toFixed(3)}`, `G1 Y${y0.toFixed(3)}`);
  }
  out.push(`G0 Z${safe}`, 'M5 ; spindle off', 'G0 X0 Y0', 'M30');
  return out.join('\n');
}

/** A printer's own start and end, from the material's figures rather than from a slicer's defaults: the part a person
 *  gets wrong. The body of a print is the slicer's — this is what goes round it, and what the machine is told first. */
export function printStart(o: { nozzle: number; bed: number; fan?: number; name?: string }): { start: string; end: string } {
  return {
    start: [`; ${o.name ?? 'print'}: nozzle ${o.nozzle} °C, bed ${o.bed} °C`, 'G21', 'G90', 'M82 ; absolute extrusion',
      `M140 S${o.bed} ; bed on`, `M190 S${o.bed} ; wait for it, so the frame is at temperature before it homes`,
      `M104 S${o.nozzle}`, 'G28 ; home', 'G29 ; probe the bed, if it has a probe', `M109 S${o.nozzle} ; wait for the nozzle`,
      'G92 E0', 'G1 X5 Y20 Z0.3 F5000', 'G1 X5 Y200 E15 F1500 ; a prime line up the left edge', 'G92 E0',
      ...(o.fan != null ? [`M106 S${Math.round((o.fan / 100) * 255)} ; fan`] : [])].join('\n'),
    end: ['G91', 'G1 E-3 F2700 ; retract', 'G1 Z10 F600', 'G90', 'M104 S0', 'M140 S0', 'M107', 'G1 X0 Y200 F3000 ; present the part', 'M84 ; motors off'].join('\n'),
  };
}

/** A kiln's program as its controller takes it: segments of rate, target and hold. There is no port on the machine,
 *  so this is written out to be keyed in — which is the honest answer and not a worse one. */
export function kilnProgram(segments: { rate: number; to: number; hold: number }[], name = 'program'): string {
  return [`; ${name}: ${segments.length} segments, keyed into the controller`,
    ...segments.map((s, i) => `SEG ${i + 1}  RA ${s.rate} °C/h   °C ${s.to}   HLD ${String(Math.floor(s.hold / 60)).padStart(2, '0')}:${String(s.hold % 60).padStart(2, '0')}`),
    `; the last segment holds; end it with a controlled cool, not by opening the lid`].join('\n');
}

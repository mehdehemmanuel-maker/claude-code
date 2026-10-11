// The browser's half of the wire out: `navigator.bluetooth`, and nothing else.
//
// Everything with a decision in it — the line protocol, the checksum, the resend, what to do when nothing comes back —
// is in `link.ts`, where the gate runs it without a radio. This file is the thin part that cannot be tested here: it
// asks for a device, gets the two characteristics, and pushes bytes. It is deliberately dull, because the parts of a
// Bluetooth link that are interesting are the parts that go wrong, and those are already covered.
//
// What the browser demands, and why the shape of this file is not negotiable:
//
//   - Web Bluetooth is **BLE only**. Bluetooth Classic and its serial port profile — every HC-05 and HC-06 — cannot
//     be reached from a page at all. The bridge has to be a BLE part: an ESP32, an nRF52, an HM-10.
//   - `requestDevice` must be called from a **user gesture** (a click, a trigger pull, a controller button). It cannot
//     be called on load, cannot be called from a timer, and cannot be retried in the background. So `connect` takes
//     the gesture's own event handler as its caller and nothing in here ever reconnects by itself.
//   - It needs a **secure context**: https, or localhost. On a Quest, the page has to be served over https.
//   - The negotiated MTU is not reported to a page. So every write is 20 bytes (`BLE_CHUNK`), which is what the
//     default ATT MTU of 23 leaves after its 3 bytes of header.
//   - `writeValueWithoutResponse` is the fast one and the right one here: the acknowledgement that matters is the
//     machine's own `ok`, not the radio's. Where the characteristic refuses it, `writeValue` is used instead.
//
// Owner of: asking for the device, the two characteristics, the notification handler, and a run loop that drives a
// `Streamer`. It owns no protocol and no timing policy.

import { BLE_CHUNK, NUS, Streamer, bridgeSteps, type Link } from '../machines/link';

/** What a connected machine looks like from here. */
export interface Radio {
  name: string;
  /** write one chunk of at most 20 bytes */ write(chunk: string): Promise<void>;
  /** what the machine says, line by line, as its notifications are reassembled */ onLine(f: (line: string) => void): void;
  connected(): boolean;
  disconnect(): void;
}

/** Whether this browser can reach a machine at all. A page served over http, or a browser without Web Bluetooth
 *  (Safari and Firefox, at the time of writing), gets a reason rather than a silence. */
export function bleWhy(): string | null {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) return 'this browser has no Web Bluetooth: Chrome, Edge and the Quest browser have it; Safari and Firefox do not. The same program can be sent over a USB cable, or over wifi to Moonraker, instead';
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'Web Bluetooth needs a secure context: serve the page over https, or from localhost. On a Quest it must be https';
  return null;
}

const dec = new TextDecoder(), enc = new TextEncoder();

/** Ask the person to pick a machine, then open its Nordic UART service. Call this from a click or a controller
 *  button and nowhere else: the browser refuses it outside a user gesture, and refuses it silently enough to look
 *  like a bug in the page. */
export async function connect(o: { name?: string; service?: string } = {}): Promise<Radio> {
  const why = bleWhy(); if (why) throw new Error(why);
  const service = o.service ?? NUS.service;
  const bt = (navigator as unknown as { bluetooth: { requestDevice(f: unknown): Promise<BleDevice> } }).bluetooth;
  const device = await bt.requestDevice(o.name
    ? { filters: [{ name: o.name }], optionalServices: [service] }
    : { filters: [{ services: [service] }] });
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(service);
  const rx = await svc.getCharacteristic(NUS.rx), tx = await svc.getCharacteristic(NUS.tx);

  // a notification is not a line: it is up to 20 bytes of whatever the machine has said so far, so the lines are
  // reassembled here. A machine that answers `ok` in one packet and `Resend: 12` split across two is normal.
  let held = '', listener: ((line: string) => void) | null = null;
  tx.addEventListener('characteristicvaluechanged', (e: { target: { value: DataView } }) => {
    held += dec.decode(e.target.value);
    const parts = held.split(/\r?\n/);
    held = parts.pop() ?? '';
    for (const line of parts) if (line.trim()) listener?.(line);
  });
  await tx.startNotifications();

  let open = true;
  device.addEventListener('gattserverdisconnected', () => { open = false; });
  return {
    name: device.name ?? 'a machine',
    async write(chunk: string) {
      if (chunk.length > BLE_CHUNK) throw new Error(`a BLE write carries ${BLE_CHUNK} bytes and this is ${chunk.length}: chunk it with chunksOf() first`);
      const bytes = enc.encode(chunk);
      // without-response is the fast one and the right one: the acknowledgement that matters is the machine's `ok`
      if (rx.writeValueWithoutResponse) { try { await rx.writeValueWithoutResponse(bytes); return; } catch { /* fall through to the slow one */ } }
      await rx.writeValue(bytes);
    },
    onLine(f) { listener = f; },
    connected: () => open,
    disconnect() { open = false; try { device.gatt.disconnect(); } catch { /* already gone */ } },
  };
}

export interface RunReport { done: number; total: number; state: Streamer['state']; fault: string | null; resends: number; heard: string[] }
/** Send a program down a radio, line at a time, and report as it goes. The policy is all in `Streamer`: this waits
 *  for an answer, gives up after `quiet` milliseconds of silence, and stops the moment the streamer says it failed.
 *  Nothing here retries a connection or a line on its own — a machine cutting metal is not somewhere to be clever. */
export async function send(radio: Radio, program: string, o: { numbered?: boolean; quiet?: number; onStep?: (r: RunReport) => void } = {}): Promise<RunReport> {
  const s = new Streamer(program, { numbered: o.numbered }), quiet = o.quiet ?? 15000;
  const report = (): RunReport => ({ done: s.done, total: s.total, state: s.state, fault: s.fault, resends: s.resends, heard: [...s.heard] });
  let woke: (() => void) | null = null;
  radio.onLine((line) => { s.heardLine(line); woke?.(); });
  // read through a function: next() and heardLine() both move the state, and the compiler cannot see that
  const over = () => s.state === 'done' || s.state === 'failed';
  while (!over()) {
    if (!radio.connected()) { s.timedOut(0); s.fault = 'the link dropped: the machine is out of range, off, or its bridge has reset'; break; }
    const chunks = s.next();
    if (chunks) { for (const c of chunks) await radio.write(c); o.onStep?.(report()); }
    if (over()) break;
    const heard = await new Promise<boolean>((ok) => {
      const t = setTimeout(() => { woke = null; ok(false); }, quiet);
      woke = () => { clearTimeout(t); woke = null; ok(true); };
    });
    if (!heard) { s.timedOut(quiet); break; }
    o.onStep?.(report());
  }
  return report();
}

// the slice of the Web Bluetooth types this file uses: the DOM lib does not carry them, and pulling in a types
// package for four methods is worse than naming them here
interface BleChar {
  writeValue(b: Uint8Array): Promise<void>;
  writeValueWithoutResponse?(b: Uint8Array): Promise<void>;
  startNotifications(): Promise<unknown>;
  addEventListener(t: string, f: (e: { target: { value: DataView } }) => void): void;
}
interface BleDevice {
  name?: string;
  gatt: { connect(): Promise<{ getPrimaryService(u: string): Promise<{ getCharacteristic(u: string): Promise<BleChar> }> }>; disconnect(): void };
  addEventListener(t: string, f: () => void): void;
}

/** What a person has to do to put a machine on this link, for the station they are standing at. The steps of a BLE
 *  bridge are the lesson's own (src/nexus/teach/lessons.ts `bridge-ble`, generated from the link's figures in
 *  src/nexus/machines/link.ts), so the room and the build pack say the same thing and neither is a second copy of it.
 *  For most stations the honest answer is "nothing, there is no port", and saying that beats a Connect button that
 *  fails. */
export function wiring(l: Link): string[] {
  if (l.transport === 'hand') return [`${l.fit}.`, l.says];
  if (l.transport === 'ws-moonraker') return [`On the machine: ${l.fit}.`, `It is reached over wifi, not Bluetooth: ${l.says}`, 'Nothing is paired; the page talks to its host over the network.'];
  if (l.transport === 'serial') return [`On the machine: ${l.fit}.`, l.says, 'A cable, not a radio: Web Serial, or the same bridge board with its USB side plugged into the host.'];
  return bridgeSteps(l).map((s) => (s.check ? `${s.do} \u2014 done when ${s.check}.` : s.do));
}


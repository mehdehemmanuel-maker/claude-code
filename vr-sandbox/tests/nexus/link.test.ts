// The wire out: the Marlin line protocol over a 20-byte BLE pipe, driven without a radio. Everything here runs in the
// gate because the part with the decisions in it is the part that must not be guessed at — a dropped byte in a
// feedrate is a job cut ten times too slowly with no error anywhere.
import { describe, expect, it } from 'vitest';
import {
  BLE_CHUNK, CUTTING, LINKS, NUS, Streamer, checksum, chunksOf, gcodeFor, kilnProgram, linesOf, linkFor, numbered,
  printStart,
} from '../../src/nexus/link';
import { STATIONS } from '../../src/nexus/works';
import { plateFor } from '../../src/nexus/fab';

describe('the Nordic UART service', () => {
  it('is the standard one, and the three UUIDs differ only in their second group', () => {
    expect(NUS.service).toBe('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
    expect(NUS.rx).toBe('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
    expect(NUS.tx).toBe('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
    for (const u of [NUS.service, NUS.rx, NUS.tx]) expect(u).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(new Set([NUS.service, NUS.rx, NUS.tx]).size).toBe(3);
  });
  it('one write carries twenty bytes, because the default ATT MTU is 23 and a browser never says otherwise', () => {
    expect(BLE_CHUNK).toBe(20);
  });
  it('every link names a station that exists, says what has to be on the machine, and is BLE only where it is BLE', () => {
    for (const l of LINKS) {
      expect(STATIONS.map((s) => s.id), l.station).toContain(l.station);
      expect(l.fit.length, l.station).toBeGreaterThan(20);
      expect(l.says.length, l.station).toBeGreaterThan(40);
      if (l.transport === 'ble-uart') expect(l.service, `${l.station} over BLE with no service`).toBe(NUS.service);
      if (l.transport === 'hand') expect(l.lang === 'hand' || l.lang === 'kiln' || l.lang === 'gcode').toBe(true);
    }
  });
  it('a station with two ways to drive it answers with the one asked for', () => {
    expect(linkFor('printer-fff')!.transport).toBe('ble-uart');
    expect(linkFor('printer-fff', 'ws-moonraker')!.transport).toBe('ws-moonraker');
    expect(linkFor('kiln')!.transport, 'there is no port on a kiln').toBe('hand');
    expect(linkFor('nothing-like-this')).toBeNull();
  });
});

describe("Marlin's line protocol", () => {
  it('the checksum is the XOR of the bytes, and one changed character changes it', () => {
    expect(checksum('')).toBe(0);
    expect(checksum('A')).toBe(65);
    expect(checksum('AB')).toBe(65 ^ 66);
    expect(checksum('N1 G1 X10 F1200')).not.toBe(checksum('N1 G1 X10 F120'));
    for (const l of ['G28', 'G1 X10 Y20 F1500', 'M104 S210']) expect(checksum(l)).toBeLessThan(256);
  });
  it('a numbered line is N, the number, the line and the checksum of all of it', () => {
    const line = numbered('G1 X10 F1200', 7);
    expect(line.startsWith('N7 G1 X10 F1200*')).toBe(true);
    const [body, sum] = line.split('*');
    expect(Number(sum)).toBe(checksum(body!));
  });
  it('a program becomes the lines a machine will take: comments and blanks gone', () => {
    const lines = linesOf('; a comment\nG28\n\n  G1 X10 ; trailing\n;another\n');
    expect(lines).toEqual(['G28', 'G1 X10']);
  });
  it('a line goes down the wire in twenty-byte chunks with its newline, and comes back whole', () => {
    const line = 'G1 X123.456 Y789.012 Z1.5 E4.5 F1800';
    const chunks = chunksOf(line);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(BLE_CHUNK);
    expect(chunks.join('')).toBe(`${line}\n`);
    expect(chunksOf('G28')).toEqual(['G28\n']);
  });
});

describe('the streamer', () => {
  const run = (program: string, o = {}) => new Streamer(program, o);
  it('sends one line at a time and waits for ok, which is the flow control', () => {
    const s = run('G28\nG1 X10\nM84');
    expect(s.total).toBe(3);
    const first = s.next();
    expect(first).toEqual(['G28\n']);
    expect(s.next(), 'a second line in flight before the first was answered').toBeNull();
    s.heardLine('ok');
    expect(s.done).toBe(1);
    expect(s.next()).toEqual(['G1 X10\n']);
    s.heardLine('ok T:210 /210');
    s.heardLine('');
    expect(s.next()).toEqual(['M84\n']);
    s.heardLine('ok');
    expect(s.state).toBe('done');
    expect(s.progress).toBe(1);
    expect(s.next()).toBeNull();
  });
  it('chatter that is not an answer is kept but does not move it on', () => {
    const s = run('G28\nG1 X10');
    s.next();
    for (const noise of ['echo:busy: processing', 'T:120 /210 B:55 /60', 'echo:Unknown command']) s.heardLine(noise);
    expect(s.done).toBe(0);
    expect(s.state).toBe('waiting');
    expect(s.heard.length).toBe(3);
    s.heardLine('ok');
    expect(s.done).toBe(1);
  });
  it('a resend sends that line again, and too many resends is a dead link, not a retry forever', () => {
    const s = run('G28\nG1 X10\nG1 X20', { numbered: true, maxResend: 2 });
    expect(s.next()![0]!.startsWith('N1 G28')).toBe(true);
    s.heardLine('ok'); s.next(); s.heardLine('ok');
    expect(s.done).toBe(2);
    s.next();
    s.heardLine('Resend: 2');
    expect(s.done, 'it should go back to line 2').toBe(1);
    expect(s.resends).toBe(1);
    expect(s.state).toBe('sending');
    expect(s.next()![0]!.startsWith('N2 ')).toBe(true);
    s.heardLine('Resend: 2'); s.heardLine('Resend: 2');
    expect(s.state).toBe('failed');
    expect(s.fault).toMatch(/not carrying it/);
    expect(s.next()).toBeNull();
  });
  it('an error stops it where it is and says which line', () => {
    const s = run('G28\nG1 X10\nM84');
    s.next(); s.heardLine('ok'); s.next();
    s.heardLine('Error:Printer halted. kill() called!');
    expect(s.state).toBe('failed');
    expect(s.fault).toMatch(/line 2 of 3/);
    expect(s.fault).toMatch(/kill\(\)/);
  });
  it('a double exclamation from GRBL is an error too', () => {
    const s = run('G0 X1\nG0 X2');
    s.next();
    s.heardLine('!!');
    expect(s.state).toBe('failed');
  });
  it('silence is a failure that says how long it waited and where', () => {
    const s = run('G28\nG1 X10');
    s.next();
    s.timedOut(8000);
    expect(s.state).toBe('failed');
    expect(s.fault).toMatch(/8000 ms at line 1 of 2/);
  });
  it('an empty program is done before it starts', () => {
    const s = run('; nothing but a comment\n\n');
    expect(s.total).toBe(0);
    expect(s.next()).toBeNull();
    expect(s.state).toBe('done');
    expect(s.progress).toBe(1);
  });
  it('it keeps only the last twenty things it heard, so a long job does not grow without bound', () => {
    const s = run('G28');
    for (let i = 0; i < 60; i++) s.heardLine(`T:${i}`);
    expect(s.heard.length).toBeLessThanOrEqual(20);
    expect(s.heard[s.heard.length - 1]).toBe('T:59');
  });
  it('a whole program runs to the end over the pipe, one line at a time', () => {
    const s = run(gcodeFor(plateFor(['pico1']), { material: 'thermoplastic', thickness: 3 }), { numbered: true });
    let writes = 0;
    for (let guard = 0; guard < 20000 && s.state !== 'done' && s.state !== 'failed'; guard++) {
      const chunks = s.next();
      if (!chunks) break;
      for (const c of chunks) { expect(c.length).toBeLessThanOrEqual(BLE_CHUNK); writes++; }
      s.heardLine('ok');
    }
    expect(s.state).toBe('done');
    expect(s.done).toBe(s.total);
    expect(writes, 'a program is more writes than lines, because a line is longer than twenty bytes').toBeGreaterThan(s.total);
  });
});

describe('the programs', () => {
  it('a cutting table exists for every material class a cut process works, with figures that make sense', () => {
    for (const [id, c] of Object.entries(CUTTING)) {
      expect(c.rpm, id).toBeGreaterThan(1000);
      expect(c.feed, id).toBeGreaterThan(50);
      expect(c.plunge, id).toBeLessThan(c.feed);
      expect(c.doc, id).toBeGreaterThan(0);
      expect(c.says.length, id).toBeGreaterThan(30);
    }
    expect(CUTTING['metal-hard']!.doc).toBeLessThan(CUTTING.wood!.doc);
    expect(CUTTING['metal-soft']!.feed).toBeLessThan(CUTTING.wood!.feed);
  });
  it('a flat part becomes runnable G-code: units, spindle on, every hole, the outline, spindle off, end', () => {
    const p = plateFor(['pico1', 'pico2']);
    const g = gcodeFor(p, { material: 'wood', thickness: 6 });
    const lines = linesOf(g);
    expect(lines[0]).toBe('G21');
    expect(lines).toContain('G90');
    expect(lines.some((l) => /^M3 S\d+$/.test(l))).toBe(true);
    expect(lines.some((l) => /^M5$/.test(l))).toBe(true);
    expect(lines[lines.length - 1]).toBe('M30');
    // a hole each, at its own place: pecked on its centre where the drill fits, bored in a helix where it does not
    for (const h of p.holes) {
      const pecked = g.includes(`X${h.x.toFixed(3)} Y${h.y.toFixed(3)}`);
      const bored = g.includes(`X${(h.x + (h.d - 3) / 2).toFixed(3)} Y${h.y.toFixed(3)}`);
      expect(pecked || bored, `${h.why}: ⌀${h.d} at ${h.x}, ${h.y} is not in the program`).toBe(true);
    }
    // nothing plunges deeper than the stock plus its allowance
    for (const z of [...g.matchAll(/Z(-?\d+\.?\d*)/g)].map((m) => Number(m[1]))) expect(z).toBeGreaterThanOrEqual(-6.5 - 1e-9);
    expect(lines.every((l) => /^[GMNT]/.test(l) || /^[XYZIJFSEP]/.test(l)), 'a line that is not a command').toBe(true);
  });
  it('a cut outline runs outside the line by the cutter radius, so the part keeps its size', () => {
    const p = plateFor(['pico1']);
    const g = gcodeFor(p, { material: 'wood', thickness: 3, cutter: 4 });
    expect(g).toContain('X-2.000');
    expect(g).toContain(`X${(p.L + 2).toFixed(3)}`);
  });
  it('tabs are cut by default and can be turned off', () => {
    const p = plateFor(['pico1']);
    expect(gcodeFor(p, { material: 'wood', thickness: 3 })).toMatch(/Z-?\d+\.\d\d\n/);
    const noTabs = gcodeFor(p, { material: 'wood', thickness: 3, tabs: false });
    expect(noTabs.split('\n').length).toBeLessThan(gcodeFor(p, { material: 'wood', thickness: 3 }).split('\n').length);
  });
  it('a deeper part takes more passes than a shallow one', () => {
    const p = plateFor(['pico1']);
    const thin = gcodeFor(p, { material: 'wood', thickness: 2 }).split('\n').length;
    const thick = gcodeFor(p, { material: 'wood', thickness: 12 }).split('\n').length;
    expect(thick).toBeGreaterThan(thin);
  });
  it("a print's start waits for the bed before homing and waits for the nozzle after", () => {
    const { start, end } = printStart({ nozzle: 215, bed: 60, fan: 100, name: 'a bracket' });
    const lines = linesOf(start);
    const i = (re: RegExp) => lines.findIndex((l) => re.test(l));
    expect(i(/^M190 S60/)).toBeGreaterThanOrEqual(0);
    expect(i(/^M190 S60/), 'the frame must be at temperature before it homes').toBeLessThan(i(/^G28/));
    expect(i(/^M109 S215/)).toBeGreaterThan(i(/^G28/));
    expect(lines).toContain('G92 E0');
    expect(start).toMatch(/M106 S255/);
    expect(linesOf(end)).toContain('M84');
    expect(end).toMatch(/E-3/);
  });
  it("a kiln's program is segments a person keys in, each a rate, a target and a hold", () => {
    const g = kilnProgram([{ rate: 80, to: 600, hold: 0 }, { rate: 150, to: 1122, hold: 0 }, { rate: 60, to: 1222, hold: 10 }], 'a bisque');
    const segs = g.split('\n').filter((l) => /^SEG/.test(l));
    expect(segs.length).toBe(3);
    expect(segs[0]).toMatch(/RA 80\b/);
    expect(segs[2]).toMatch(/HLD 00:10/);
    expect(g).toMatch(/a bisque/);
    expect(g).toMatch(/controlled cool/);
  });
});

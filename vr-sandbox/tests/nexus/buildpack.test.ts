import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { catalogue } from '../../src/nexus/parts/catalogue';
import { componentOf } from '../../src/nexus/parts/components';
import { resolve } from '../../src/nexus/parts/inventory';
import { boardWords, findThing, haveOf, pack, packPart, packText, packZip } from '../../src/nexus/teach/buildpack';
import { areaOf, dxf, fabPack, gerbers, plateFor, profileFaults, stl } from '../../src/nexus/parts/fab';
import { e12AtLeast, ledResistor, LESSONS } from '../../src/nexus/teach/lessons';
import { cheapest, costBy, PRICES } from '../../src/nexus/parts/prices';

describe('prices', () => {
  it('keeps each as a sighting: a seller, its page, the day seen, a positive price; each library item one the library draws', () => {
    for (const l of catalogue()) resolve(l);
    for (const [k, p] of Object.entries(PRICES)) {
      expect(p.offers.length, k).toBeGreaterThan(0);
      for (const o of p.offers) { expect(o.url, k).toMatch(/^https:\/\//); expect(o.seen, k).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(o.usd, k).toBeGreaterThan(0); expect(o.seller, k).not.toBe(''); }
      if (p.item?.match(/^(sbc|pico|robotarm|chip|chipresistor|mlcc|regulator|led)-/)) expect(componentOf(p.item), k).not.toBeNull();
    }
  });
  it('takes the cheapest real offer: in stock before out, new before used, with what it needs that you lack counted in', () => {
    // a Pinecil wants a USB-C PD supply it does not come with: with one, $25.99; without, the mains iron at $19.95 wins
    expect(cheapest('soldering-iron')!.offer.name).toMatch(/BEST 102C/);
    const pinecil = PRICES['soldering-iron']!.offers.find((o) => /PINECIL/.test(o.name))!;
    expect(costBy(pinecil, 1).usd).toBeCloseTo(25.99 + 29.99); expect(costBy(pinecil, 1, (k) => k === 'usbc-pd-65w').usd).toBeCloseTo(25.99);
    // the Meca500 is sold new by quote only: what is kept is a used one's price, said so
    expect(cheapest('robotarm-meca500-r3')!.offer.cond).toBe('used');
    // packs and least orders: 30 jumpers are two 20-packs or one 40-pack; 10 chip resistors are bought as LCSC's 100
    expect(cheapest('jumper-wires', 30)!.usd).toBeCloseTo(3.9); expect(cheapest('chipresistor-0603-1-10000', 10)!.packs).toBe(100);
  });
});

describe('a build pack', () => {
  it('finds a board by any of its names, its cheapest memory when none is said', () => {
    expect(boardWords('pi 5 8gb')!.words).toBe('sbc pi5 8GB'); expect(boardWords('Raspberry Pi 5 16 GB')!.words).toBe('sbc pi5 16GB');
    expect(boardWords('Raspberry Pi Pico 2 W')!.words).toBe('pico pico2w'); expect(boardWords('orange pi 5 8gb')!.words).toBe('sbc opi5 8GB');
    const x5 = boardWords('rdk x5')!; expect(x5.words).toBe('sbc rdkx5 4GB'); expect(x5.note).toMatch(/cheapest at \$130/);
  });
  it('reads what you have and would spend out of the ask', () => {
    const h = haveOf('pico 2 w, led, I have a laptop and a soldering iron, under $40');
    expect(h.have).toMatchObject({ computer: true, budget: 40 }); expect(h.have.owns).toContain('soldering-iron'); expect(h.rest).toBe('pico 2 w, led');
  });
  it('buys a Pico with its headers on when nothing else needs an iron: a dollar more, and no iron', () => {
    const p = pack('pico 2 w, led, I have a laptop');
    expect(p.lines.find((l) => l.key === 'pico-pico2w')!.offer!.name).toMatch(/with Header/i);
    expect(p.lines.some((l) => l.key === 'soldering-iron')).toBe(false);
    expect(p.total.all[0]).toBeCloseTo(8 + 12.5 + 4.95 + 1.95);
    expect(p.lessons.map((l) => l.id)).toEqual(['flash-micropython', 'led-circuit', 'program-with-claude']);
  });
  it('with a soldering kit asked for, solders the headers itself, and brings only the bench the steps need', () => {
    const p = pack('pico 2 w, soldering kit, I have a computer');
    expect(p.lines.find((l) => l.key === 'pico-pico2w')!.offer!.usd).toBe(7);
    expect(p.lines.filter((l) => l.section === 'bench').map((l) => l.key).sort()).toEqual(['flush-cutters', 'soldering-iron', 'solder-leaded', 'tip-cleaner'].sort());
    expect(p.lessons.map((l) => l.id)).toEqual(expect.arrayContaining(['solder-joint', 'solder-headers', 'multimeter']));
  });
  it('boots a Pi from a card on its own supply, and makes the Pi the computer rather than buying another', () => {
    const p = pack('pi 5 8gb');
    expect(p.lines.map((l) => l.key)).toEqual(expect.arrayContaining(['sbc-pi5-8gb', 'microsd-32gb', 'pi-27w-psu']));
    expect(p.lines.some((l) => l.key.startsWith('pi5-desktop-kit'))).toBe(false); expect(p.notes.join(' ')).toMatch(/your Pi 5 is your computer too/);
    expect(pack('pico 2').lines.some((l) => l.key === 'pi5-desktop-kit-4gb')).toBe(true);
    // the Desktop Kit costs $1.95 less than its board, card and supply apart, but was out of stock: a saving, said
    expect(p.cheaper.find((c) => /Desktop Kit 8GB/.test(c.say))!.saves).toBeCloseTo(1.95);
  });
  it('over a budget, says by how much and what would bring it under, most first', () => {
    const p = pack('pi 5 16gb, under $100');
    expect(p.notes.join(' ')).toMatch(/over your \$100\.00/);
    expect(p.cheaper[0]!.saves).toBeGreaterThanOrEqual(p.cheaper.at(-1)!.saves);
    expect(p.cheaper.some((c) => /1 GB instead/.test(c.say))).toBe(true);
  });
  it('opens anything the inventory keeps one level: bought parts as lines, shaped ones to be made, and says what it cannot price', () => {
    expect(findThing('3d printer')!.id).toBe('printer-fdm'); expect(findThing('desk fan')!.name).toMatch(/desk fan/i);
    const p = pack('3d printer, I have a computer');
    expect(p.lines.map((l) => l.key)).toEqual(expect.arrayContaining(['nema17', 'hotend', 'printer-board', 'psu-24v']));
    expect(p.lines.find((l) => l.key === 'nema17')!.n).toBe(4); expect(p.notes.join(' ')).toMatch(/opened into what it is made of/);
    // a part with no seller's price kept is listed, and the total says it leaves it out
    expect(p.total.unpriced).toBe(p.lines.filter((l) => l.usd == null).length); if (p.total.unpriced) expect(p.notes.join(' ')).toMatch(/no seller's price kept yet/);
    const f = pack('desk fan, I have a computer');
    expect(f.custom.map((c) => c.name)).toEqual(expect.arrayContaining(['fan blade'])); expect(f.custom.find((c) => c.name === 'fan blade')!.process).toBe('mould');
    expect(f.lessons.map((l) => l.id)).toEqual(expect.arrayContaining(['assemble', 'order-custom']));
  });
  it('invents what the library does not keep, keeping what the ask rules out', () => {
    const p = pack('a fridge with no electricity, I have a computer');
    expect(p.invented.length).toBe(1); expect(p.invented[0]).toMatch(/^a fridge with no electricity: the sun/);
    expect(p.lines.length).toBeGreaterThan(0); expect(p.invented[0]).not.toMatch(/wall socket/);
  });
  it('says what it cannot price, never inventing a figure', () => {
    // the bolt is a part the library makes, with no seller's price kept: a line, unpriced; the flux capacitor is no part at all
    const p = pack('bolt M2.5x6, flux capacitor');
    expect(p.lines.find((l) => l.key === 'bolt-m2.5x6')!.usd).toBeNull(); expect(p.unknown).toHaveLength(1); expect(p.unknown[0]).toMatch(/flux capacitor/);
    expect(p.total.all[0]).toBe(0); expect(p.total.unpriced).toBe(1);
  });
});

describe('custom parts', () => {
  it('drills a plate to each board\'s own pattern, brought in to fit the size a board maker makes five of for $2', () => {
    const f = plateFor(['pi5'], { fit: [100, 100] });
    expect([f.L, f.W]).toEqual([99, 70]); expect(profileFaults(f)).toEqual([]);
    const pi = f.holes.filter((h) => /Raspberry Pi 5/.test(h.why)), xs = [...new Set(pi.map((h) => h.x))], ys = [...new Set(pi.map((h) => h.y))];
    expect(xs[1]! - xs[0]!).toBeCloseTo(58); expect(ys[1]! - ys[0]!).toBeCloseTo(49); expect(pi[0]!.d).toBe(2.9);
    const fp = fabPack(f); expect(fp.best.id).toBe('pcb-jlc'); expect([fp.best.lo, fp.best.hi]).toEqual([4.2, 7.35]);
  });
  it('writes files a maker reads: DXF circles for its holes, a closed STL of its volume, Gerbers and a drill file of its holes', () => {
    const f = plateFor(['pi5'], { fit: [100, 100] }), d = dxf(f);
    expect(d.match(/\nCIRCLE\n/g)!.length).toBe(f.holes.length); expect(d).toMatch(/AC1009/); expect(d.trim().endsWith('EOF')).toBe(true);
    // the STL's volume by the divergence theorem is the plate's area times its thickness
    const v = [...stl(f, 3).matchAll(/vertex (\S+) (\S+) (\S+)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    let vol = 0; for (let i = 0; i < v.length; i += 3) { const [a, b, c] = [v[i]!, v[i + 1]!, v[i + 2]!]; vol += (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) - a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6; }
    expect(vol / (areaOf(f) * 3)).toBeCloseTo(1, 3);
    const g = gerbers(f); expect(Object.keys(g)).toEqual(expect.arrayContaining(['plate-Edge_Cuts.gm1', 'plate-F_Cu.gtl', 'plate-NPTH.drl']));
    expect(g['plate-NPTH.drl']!.match(/^X[\d.]+Y[\d.]+$/gm)!.length).toBe(f.holes.length); expect(g['plate-Edge_Cuts.gm1']).toMatch(/%FSLAX46Y46\*%[\s\S]*M02\*/);
  });
  it('past 100 × 100 mm, makes no figure for the $2 offer: its quote decides', () => {
    const r = fabPack(plateFor(['rdkx5', 'pi5'], { fit: [100, 100] })).routes.find((x) => x.id === 'pcb-jlc')!;
    expect(r.lo).toBeNull(); expect(r.note).toMatch(/past the 100 × 100 mm/);
  });
  it('zips the pack with its plate\'s files, and stands the boards on their plate to be seen', () => {
    const p = pack('pi 5 8gb, mounting plate, I have a computer'), z = unzipSync(packZip(p));
    expect(Object.keys(z)).toEqual(expect.arrayContaining(['pack.md', 'plate.dxf', 'plate.stl', 'plate-gerbers.zip', 'README.txt']));
    expect(strFromU8(z['pack.md']!)).toMatch(/JLCPCB/); expect(packText(p)).toMatch(/Mount boards on the plate/);
    const a = packPart(p)!; expect(a.parts![0]!.cuts!.length).toBe(8); expect(a.parts!.filter((x) => /standoff/.test(x.name))).toHaveLength(4);
  });
});

describe('lessons', () => {
  it('works an LED\'s resistor by Ohm\'s law to the next E12 value', () => {
    expect(e12AtLeast(260)).toBe(270); expect(e12AtLeast(1000)).toBe(1000); expect(e12AtLeast(4800)).toBe(5600);
    expect(ledResistor(3.3, 2.0, 5)).toEqual({ R: 270, mA: 4.8, bands: 'red-violet-black-black-brown' });
  });
  it('has steps, a source, and tools the price table knows, in every lesson', () => {
    for (const l of Object.values(LESSONS)) { expect(l.steps.length, l.id).toBeGreaterThan(0); expect(l.src, l.id).not.toBe(''); for (const t of l.tools) expect(PRICES[t], `${l.id}: ${t}`).toBeDefined(); }
  });
});

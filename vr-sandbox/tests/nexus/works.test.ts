// The works as a job router: throw unlike builds at unlike shops and check that every line is accounted for, that
// nothing is routed to a machine that could not do it, and that the money and the hours are the ones that were paid.
import { describe, expect, it } from 'vitest';
import {
  ALWAYS_BOUGHT, BUILDS, FAMILIES, FINISH, PROCESSES, STATIONS, STOCK, TIERS, under3K, WANT_MACHINES, worksPack,
  worksPackText,
  auditJob, boundOf, bootstrapOf, buildById, canMake, classOf, emptyState, handling, holdsOf, jobForModel, jobText,
  makes, planJob, priceOfLine, processById, programsText, runMinutes, sawPart, scheduleOf, shapeOf, stationById,
  stationCost, stationUsd, throwAt, tolOf, worksOf, worksText, worksUnder, worksUnderText, worksWords, worthMaking,
  type Job, type PartLine,
} from '../../src/nexus/works';
import { linkFor, linesOf } from '../../src/nexus/machines/link';

const SHOPS = [TIERS[1]!, TIERS[2]!, TIERS[3]!, TIERS[4]!];

describe('the taxonomy', () => {
  it('every process is one of the six families, and every family has a process', () => {
    for (const p of PROCESSES) expect(FAMILIES.map((f) => f.id)).toContain(p.family);
    for (const f of FAMILIES) expect(PROCESSES.some((p) => p.family === f.id), `nothing does ${f.id}`).toBe(true);
  });
  it('every process says where its numbers come from, and every hazard is named where there is one', () => {
    for (const p of PROCESSES) {
      expect(p.src.length, p.id).toBeGreaterThan(30);
      expect(p.tol).toBeGreaterThan(0);
      expect(p.setup).toBeGreaterThanOrEqual(0);
    }
    // the ones that can take an eye, a lung or a house say so
    for (const id of ['weld-mig', 'cast', 'msla', 'pbf', 'sinter', 'laser-fibre', 'kiln', 'forge'])
      expect(processById(id).hazard, id).toBeTruthy();
  });
  it('every station does processes that exist, and says what it costs and why it is on the list', () => {
    for (const s of STATIONS) {
      for (const d of s.does) expect(() => processById(d), `${s.id} does ${d}`).not.toThrow();
      expect(s.why.length, s.id).toBeGreaterThan(30);
      expect(s.price || s.usd !== undefined || s.selfBuild, `${s.id} has no price at all`).toBeTruthy();
      if (!s.price) expect(s.from, `${s.id} carries money with no provenance`).toBeTruthy();
      expect(s.floor).toBeGreaterThan(0);
    }
  });
  it('only making processes make: prep, finishing, joining and measuring never produce a part', () => {
    for (const id of ['saw', 'drill', 'grind', 'kiln', 'sinter', 'cure', 'coat', 'heat-treat', 'weld-mig', 'fasten', 'bond', 'solder', 'calliper', 'indicate'])
      expect(makes(processById(id)), id).toBe(false);
    for (const id of ['fff', 'mill', 'turn', 'cast', 'throw', 'forge', 'laser-co2', 'bend'])
      expect(makes(processById(id)), id).toBe(true);
  });
  it('a treatment is charged per load, not per part: a kiln fires one mug in the time it fires forty', () => {
    const kiln = processById('kiln');
    expect(kiln.cycle).toBeGreaterThan(300);
    expect(runMinutes(kiln, { n: 1 })).toBe(runMinutes(kiln, { n: 40 }));
  });
  it('a part cut from sheet is charged its kerf, not its block: a drone frame is minutes, not half a day', () => {
    const mill = processById('mill'), sheet: PartLine = { name: 'plate', n: 1, mat: 'cfrp', size: [220, 180, 4], cm3: 110 };
    const block: PartLine = { name: 'lump', n: 1, mat: 'al-6061', size: [80, 70, 60], cm3: 110 };
    expect(runMinutes(mill, sheet)).toBeLessThan(runMinutes(mill, block) / 3);
  });
});

describe('what is bought and what is made', () => {
  it('the always-bought list names a process, not a difficulty', () => {
    for (const r of ALWAYS_BOUGHT) expect(r.why.length, String(r.what)).toBeGreaterThan(30);
    for (const r of STOCK) expect(r.why.length, String(r.what)).toBeGreaterThan(40);
  });
  it('a bearing is bought and a bearing housing is not; a wheel is bought and a wheel boss is not', () => {
    const hit = (name: string) => ALWAYS_BOUGHT.some((r) => r.what.test(name) && !(r.unless?.test(name) ?? false));
    for (const n of ['6204 bearing', 'MGN12H linear rail', 'NEMA 17 stepper motor', 'GT2 belt', 'M8 bolt', 'rc-receiver', 'pack-lipo-4s battery', 'wheel, 10 inch pneumatic', '40 mm fan'])
      expect(hit(n), `${n} should be bought`).toBe(true);
    for (const n of ['bearing bore, machined in the casting', 'bearing housing', 'steering wheel boss', 'motor mount plate', 'camera cradle, printed', 'fan shroud', 'long rail, 40 × 40 × 2 box section'])
      expect(hit(n), `${n} should not be read as a bought component`).toBe(false);
  });
  it('stock is bought as material and still cut here: the tube is bought, the frame is still welded', () => {
    const j = throwAt('workbench', TIERS[2]!.stations);
    expect(j.buy.some((b) => /box section \(as material\)/.test(b.line.name))).toBe(true);
    expect(j.ops.some((o) => o.process === 'weld-mig'), 'a welded bench with no welding').toBe(true);
    expect(j.ops.filter((o) => o.process === 'saw').length).toBeGreaterThanOrEqual(3);
  });
  it('a price comes from a real offer or not at all: a LiPo pack is not priced off a battery holder', () => {
    expect(priceOfLine({ name: 'pack-lipo-4s battery', n: 1, mat: 'steel-low' })?.usd).toBeGreaterThan(10);
    expect(priceOfLine({ name: 'bldc-outrunner motor 2207', n: 4, mat: 'steel-low' })?.usd).toBeGreaterThan(50);
    expect(priceOfLine({ name: 'a thing nobody sells', n: 1, mat: 'steel-low' })).toBeNull();
  });
});

describe('routing: a machine is only given what it could do', () => {
  it('measuring never makes anything', () => {
    const v = canMake(['measuring', 'bench'], { material: 'wood', size: [100, 80, 20] });
    if (v.ok) expect(v.by!.process.family, `${v.by!.process.id} on ${v.by!.station.id}`).not.toBe('measure');
    for (const shop of SHOPS) for (const b of BUILDS) for (const o of throwAt(b, shop.stations).ops)
      if (o.station === 'measuring') expect(processById(o.process).family, `${o.part} on the surface plate`).toBe('measure');
  });
  it('a lathe is only given round parts and a laser only flat ones', () => {
    for (const shop of SHOPS) for (const b of BUILDS) for (const o of throwAt(b, shop.stations).ops) {
      const p = processById(o.process);
      if (!p.shape || /: (stock|measured|bisque|glaze|sinter|cure)$/.test(o.part)) continue;
      const line = b.lines.find((l) => l.name === o.part);
      if (line) expect(shapeOf(line), `${p.id} given ${o.part}`).toBe(p.shape);
    }
  });
  it('a saw never produces a part out of a block, and no op runs on a station that lacks its process', () => {
    for (const shop of SHOPS) for (const b of BUILDS) for (const o of throwAt(b, shop.stations).ops) {
      expect(stationById(o.station).does, `${o.process} on ${o.station}`).toContain(o.process);
      if (o.process === 'saw') expect(/stock|cut to size/.test(`${o.part} ${o.says}`), o.says).toBe(true);
    }
  });
  it('the station chosen is the one that does the job in the fewest minutes', () => {
    const want = { material: 'al-6061' as never, size: [180, 120, 90] as [number, number, number], cm3: 390, n: 2 };
    const v = canMake(TIERS[2]!.stations, { ...want, material: 'metal-soft' });
    expect(v.ok).toBe(true);
    for (const id of TIERS[2]!.stations) for (const d of stationById(id).does) {
      const p = processById(d);
      if (!makes(p) || !p.on.includes('metal-soft') || p.shape) continue;
      expect(v.minutes!, `${p.id} is quicker than the one chosen`).toBeLessThanOrEqual(p.setup + runMinutes(p, { n: 2, cm3: 390 }) + 0.1);
    }
    expect(v.by!.process.id, 'a 390 cm³ housing is a casting, not a milling job').toBe('cast');
  });
  it('a material no process here works is a named gap, never a silent drop', () => {
    const j = throwAt('wall', TIERS[2]!.stations);
    expect(j.ops.length).toBe(0);
    expect(j.gaps.length).toBe(2);
    for (const g of j.gaps) { expect(g.why).toMatch(/concrete/); expect(g.why).toMatch(/\$/); }
  });
  it('a tolerance nothing holds is a gap that names the tolerance and the cheapest station that would', () => {
    const j = throwAt('gearbox', under3K().ids);
    const bore = j.gaps.find((g) => /bearing bore/.test(g.line.name));
    expect(bore, 'a $3,000 works cannot cut a bearing seat, and should say so').toBeTruthy();
    // the tolerance is derived, not written: a 6205's housing is H7, and H7 at ⌀52 is 30 µm wide
    expect(bore!.why).toMatch(/±0\.015 mm/);
    expect(bore!.why, 'it should say how badly it would do it, not just that it cannot').toMatch(/Cpk/);
    expect(bore!.why).toMatch(/made for every one kept/);
  });
});

describe('what is not finished when it is formed', () => {
  it('clay fired twice, resin cured, bound metal sintered — and each says why', () => {
    for (const f of FINISH) { expect(f.why.length).toBeGreaterThan(40); expect(() => processById(f.process)).not.toThrow(); }
  });
  it('a works that can throw but not fire has not made a mug: it has made greenware, and says so', () => {
    const j = planJob('a mug', buildById('mug').lines, ['bench', 'measuring', 'computer', 'wheel']);
    expect(j.ops.some((o) => o.process === 'kiln')).toBe(false);
    expect(j.gaps.length).toBe(2);
    for (const g of j.gaps) expect(g.why).toMatch(/dissolves in the water|finishes it/);
  });
  it('the firings are batched and in order: one bisque load, then one glaze load', () => {
    const j = throwAt('mug', under3K().ids);
    const fires = j.ops.filter((o) => o.process === 'kiln');
    expect(fires.length, 'one load each, not one firing per mug').toBe(2);
    const at = (id: string) => j.schedule.find((x) => x.op.id === id)!;
    expect(at(fires[1]!.id).start).toBeGreaterThanOrEqual(at(fires[0]!.id).end);
    for (const f of fires) expect(f.n).toBe(12);
  });
  it('a green joint happens before the firing, not after it', () => {
    const j = throwAt('mug', under3K().ids);
    const bond = j.ops.find((o) => o.process === 'bond')!, fire = j.ops.find((o) => o.process === 'kiln')!;
    const at = (id: string) => j.schedule.find((x) => x.op.id === id)!;
    expect(at(bond.id).end, 'a handle slipped onto a fired mug does not stick').toBeLessThanOrEqual(at(fire.id).start);
  });
});

describe('the schedule', () => {
  it('nothing starts before what it waits for, and no station does two things at once', () => {
    for (const shop of SHOPS) for (const b of BUILDS) {
      const j = throwAt(b, shop.stations), at = new Map(j.schedule.map((x) => [x.op.id, x]));
      for (const x of j.schedule) for (const a of x.op.after) if (at.has(a))
        expect(x.start, `${b.id}/${shop.id}: ${x.op.id} starts before ${a} ends`).toBeGreaterThanOrEqual(at.get(a)!.end - 1e-6);
      const byStation = new Map<string, { start: number; end: number }[]>();
      for (const x of j.schedule) byStation.set(x.op.station, [...(byStation.get(x.op.station) ?? []), x]);
      for (const [st, xs] of byStation) {
        const sorted = [...xs].sort((p, q) => p.start - q.start);
        for (let i = 1; i < sorted.length; i++)
          expect(sorted[i]!.start, `${b.id}/${shop.id}: ${st} is doing two things at once`).toBeGreaterThanOrEqual(sorted[i - 1]!.end - 1e-6);
      }
    }
  });
  it('the makespan is never longer than the work and never shorter than the longest chain', () => {
    for (const shop of SHOPS) for (const b of BUILDS) {
      const j = throwAt(b, shop.stations);
      expect(j.makespan).toBeLessThanOrEqual(j.minutes + 1e-6);
      if (j.ops.length) expect(j.makespan).toBeGreaterThan(0);
    }
  });
  it('every operation is scheduled exactly once, even where the dependencies make a cycle', () => {
    for (const shop of SHOPS) for (const b of BUILDS) {
      const j = throwAt(b, shop.stations);
      expect(j.schedule.length).toBe(j.ops.length);
      expect(new Set(j.schedule.map((x) => x.op.id)).size).toBe(j.ops.length);
    }
    const cyc = scheduleOf([
      { id: 'a', part: 'a', n: 1, process: 'saw', station: 'bench', setup: 1, run: 1, after: ['b'], transport: 'hand', lang: 'hand', program: '', says: '' },
      { id: 'b', part: 'b', n: 1, process: 'saw', station: 'bench', setup: 1, run: 1, after: ['a'], transport: 'hand', lang: 'hand', program: '', says: '' },
    ]);
    expect(cyc.at.length).toBe(2);
    expect(Number.isFinite(cyc.makespan)).toBe(true);
  });
});

describe('every line is accounted for', () => {
  it('a build thrown at any works: every line is made, bought or named as a gap — nothing vanishes', () => {
    const counted = (j: Job, lines: PartLine[]) => {
      for (const l of lines) {
        const made = j.ops.some((o) => o.part === l.name || o.part.startsWith(`${l.name}:`));
        const bought = j.buy.some((b) => b.line.name === l.name || b.line.name === `${l.name} (as material)`);
        const gap = j.gaps.some((g) => g.line.name === l.name);
        expect(made || bought || gap, `${j.what}: ${l.name} fell off the plan`).toBe(true);
      }
    };
    for (const shop of [...SHOPS, { id: 'bench', stations: TIERS[0]!.stations }, { id: '3k', stations: under3K().ids }])
      for (const b of BUILDS) counted(throwAt(b, shop.stations), b.lines);
  });
  it('a joint the build declares is either an operation or a named gap', () => {
    for (const shop of SHOPS) for (const b of BUILDS) {
      const j = throwAt(b, shop.stations);
      for (const join of b.joins ?? []) {
        const did = j.ops.some((o) => o.process === join.how), said = j.gaps.some((g) => new RegExp(join.how.replace('-', '.')).test(g.line.name) || g.why.includes(join.says.slice(0, 20)));
        expect(did || said, `${b.id}/${shop.id}: ${join.how} neither done nor refused`).toBe(true);
      }
    }
  });
  it('a bought line carries the reason it is bought, and a gap carries its cause', () => {
    for (const shop of SHOPS) for (const b of BUILDS) {
      const j = throwAt(b, shop.stations);
      for (const x of j.buy) expect(x.why.length, `${b.id}: ${x.line.name}`).toBeGreaterThan(20);
      for (const g of j.gaps) expect(g.why.length, `${b.id}: ${g.line.name}`).toBeGreaterThan(20);
    }
  });
  it('an unknown material is a gap and not a crash', () => {
    const j = planJob('a mystery', [{ name: 'a widget', n: 1, mat: 'unobtainium' }], TIERS[2]!.stations);
    expect(j.gaps[0]!.why).toMatch(/unobtainium/);
  });
  it('an empty build plans nothing and says nothing happened', () => {
    const j = planJob('nothing', [], TIERS[2]!.stations);
    expect(j.ops).toEqual([]); expect(j.makespan).toBe(0);
    expect(jobText(j)).toMatch(/0 operations/);
  });
});

describe('the program each operation sends', () => {
  it('every operation carries a program and the wire it goes down, and the wire matches its station', () => {
    for (const shop of SHOPS) for (const b of BUILDS) for (const o of throwAt(b, shop.stations).ops) {
      expect(o.program.length, `${o.part} on ${o.station}`).toBeGreaterThan(40);
      expect(o.transport).toBe(linkFor(o.station)?.transport ?? 'hand');
      if (o.transport === 'hand') expect(['hand', 'kiln']).toContain(o.lang);
    }
  });
  it('a milled part is sent real G-code, and a print is sent a real start and end', () => {
    const j = throwAt('quadcopter', under3K().ids);
    const mill = j.ops.find((o) => o.process === 'mill')!, print = j.ops.find((o) => o.process === 'fff')!;
    expect(mill.lang).toBe('gcode');
    const lines = linesOf(mill.program);
    expect(lines.filter((l) => /^G[0123]\b/.test(l)).length).toBeGreaterThan(8);
    expect(lines.some((l) => /^M3 S\d+/.test(l)), 'the spindle is never started').toBe(true);
    expect(lines.some((l) => /^M5\b/.test(l)), 'the spindle is never stopped').toBe(true);
    expect(lines.some((l) => /^M30\b/.test(l))).toBe(true);
    expect(print.program).toMatch(/M109 S\d+/);
    expect(print.program).toMatch(/G28/);
    expect(print.program).toMatch(/M84/);
  });
  it('a kiln is given its segments to key in, because there is no port on it', () => {
    const fire = throwAt('mug', under3K().ids).ops.find((o) => o.process === 'kiln')!;
    expect(fire.lang).toBe('kiln'); expect(fire.transport).toBe('hand');
    expect(fire.program).toMatch(/SEG 1\s+RA \d+/);
    expect(fire.program.split('\n').filter((l) => /^SEG/.test(l)).length).toBeGreaterThanOrEqual(2);
  });
  it('a hand operation is steps with a check, and names its hazard where it has one', () => {
    const weld = throwAt('workbench', under3K().ids).ops.find((o) => o.process === 'weld-mig')!;
    expect(weld.lang).toBe('hand');
    expect(weld.program).toMatch(/hazard:/);
    expect(weld.program).toMatch(/2\. Run it, then measure/);
  });
  it('the programs read out in the order they are sent', () => {
    const j = throwAt('gearbox', under3K().ids), text = programsText(j);
    for (const x of j.schedule) expect(text).toContain(`==== ${x.op.id}`);
    const at = j.schedule.map((x) => text.indexOf(`==== ${x.op.id}`));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});

describe('a works adds up', () => {
  it('a tier covers what it claims, and each is dearer and wider than the one before', () => {
    let last = -1, lastFam = 0;
    for (const t of TIERS) {
      const w = worksOf(t.stations);
      expect(w.usd).toBeGreaterThan(last); last = w.usd;
      expect(w.families.length).toBeGreaterThanOrEqual(lastFam); lastFam = w.families.length;
      expect(w.floor).toBeGreaterThan(0);
      expect(t.says.length).toBeGreaterThan(60);
    }
    // the plastic shop forms nothing and treats nothing: it prints, cuts, joins and measures
    expect(worksOf(TIERS[1]!.stations).missing, 'the plastic shop forms nothing and treats nothing').toEqual(['form', 'treat']);
    expect(worksOf(TIERS[2]!.stations).missing, 'the metal shop should cover all six').toEqual([]);
  });
  it('a works claims to work only what it can make something out of, not what it can measure', () => {
    const w = worksOf(['bench', 'measuring', 'computer']);
    expect(w.materials).not.toContain('concrete');
    expect(w.materials).not.toContain('live');
    expect(w.measureTol).toBeLessThanOrEqual(w.tol);
  });
  it('a station costs what it costs, and nothing is free because nobody sells it', () => {
    for (const s of STATIONS) {
      const c = stationCost(s, [], 'new');
      if (stationUsd(s) > 0) expect(c.usd).toBe(stationUsd(s));
      else expect(c.usd, `${s.id} reads as free`).toBe(Infinity);
    }
  });
  it('used is never dearer than new, and a self-build only counts once its needs are had', () => {
    for (const s of STATIONS) {
      if (s.used) expect(s.used.usd, s.id).toBeLessThan(stationUsd(s) || Infinity);
      if (!s.selfBuild) continue;
      expect(s.selfBuild.hours, s.id).toBeGreaterThan(0);
      expect(s.selfBuild.how.length, s.id).toBeGreaterThan(60);
      for (const n of s.selfBuild.needs) expect(() => stationById(n)).not.toThrow();
      const without = stationCost(s, [], 'build'), with_ = stationCost(s, s.selfBuild.needs, 'build');
      expect(with_.usd).toBeLessThanOrEqual(without.usd);
    }
  });
});

describe('the works a budget buys', () => {
  it('under $3,000 it covers all six families, works what the library builds with, and stays under', () => {
    const r = under3K();
    expect(r.usd).toBeLessThanOrEqual(3000);
    expect(r.left).toBeGreaterThanOrEqual(0);
    const w = worksOf(r.ids);
    expect(w.missing, 'a $3,000 works should cover all six families').toEqual([]);
    for (const c of WANT_MACHINES) expect(w.materials, `nothing here works ${c}`).toContain(c);
    expect(w.tol).toBeLessThanOrEqual(0.1);
    expect(r.ids, 'a works with hazards and no safety kit is unbuilt').toContain('safety');
    expect(r.ids).toContain('measuring');
    expect(r.ids).toContain('computer');
  });
  it('the order it is bought in is the order it can be bought in: a self-build never precedes its needs', () => {
    const had: string[] = [];
    for (const st of worksUnder(3000).steps) {
      if (st.as === 'build') for (const n of stationById(st.id).selfBuild!.needs)
        expect(had, `${st.id} is built before ${n} exists`).toContain(n);
      had.push(st.id);
    }
  });
  it('the steps add up to the total, and every step says what it bought and why', () => {
    const r = worksUnder(3000);
    expect(+r.steps.reduce((a, s) => a + s.usd, 0).toFixed(2)).toBe(r.usd);
    expect(r.hours).toBe(r.steps.reduce((a, s) => a + s.hours, 0));
    for (const s of r.steps) expect(s.gain.length, s.id).toBeGreaterThan(20);
  });
  it('cutting the price is taken even at the cost of a lot more work', () => {
    const cheap = worksUnder(3000, { prefer: 'build' }), fresh = worksUnder(3000, { prefer: 'new' });
    expect(cheap.ids.length).toBeGreaterThanOrEqual(fresh.ids.length);
    expect(cheap.hours).toBeGreaterThan(fresh.hours);
    const sameFew = cheap.ids.filter((i) => fresh.ids.includes(i));
    const cheapPaid = sameFew.reduce((a, i) => a + stationCost(stationById(i), cheap.ids, 'build').usd, 0);
    const freshPaid = sameFew.reduce((a, i) => a + stationUsd(stationById(i)), 0);
    expect(cheapPaid, 'the cheap route should actually be cheaper').toBeLessThan(freshPaid);
  });
  it('a bigger budget is never a worse works, and a budget below the floor says so', () => {
    const small = worksUnder(1200), big = worksUnder(20000);
    expect(big.ids.length).toBeGreaterThanOrEqual(small.ids.length);
    expect(worksOf(big.ids).tol).toBeLessThanOrEqual(worksOf(small.ids).tol);
    const none = worksUnder(50);
    expect(none.ids).toEqual([]);
    expect(none.says).toMatch(/does not reach the floor/);
  });
  it('asking for clay buys the wheel; asking for machines does not buy it first', () => {
    const pots = worksUnder(2000, { want: ['clay', 'glass'] });
    expect(pots.ids).toContain('wheel');
    expect(worksOf(pots.ids).materials).toContain('clay');
    const machines = worksUnder(2000);
    const order = (id: string) => machines.ids.indexOf(id);
    if (order('wheel') >= 0) expect(order('printer-fff'), 'a wheel before a printer in a machine shop').toBeLessThan(order('wheel'));
  });
  it('it reads out as something a person can work down', () => {
    const t = worksUnderText(3000);
    expect(t).toMatch(/For \$3,000/);
    expect(t).toMatch(/build/);
    expect(t.split('\n').length).toBeGreaterThan(20);
  });
});

describe('bootstrapping, handling and make-or-buy', () => {
  it('a real printer is about half makeable, and the rest is bought for stated reasons', () => {
    for (const m of ['ender3', 'voron24'] as const) {
      const b = bootstrapOf(under3K().ids, m, 'build');
      expect(b.total).toBeGreaterThan(100);
      expect(b.share).toBeGreaterThan(20);
      expect(b.share).toBeLessThan(80);
      expect(Object.keys(b.bought.why).length).toBeGreaterThan(2);
      expect(b.says).toMatch(/ground, wound, rolled or fabbed/);
    }
  });
  it('the printer job itself routes and schedules', () => {
    const j = jobForModel('ender3', under3K().ids);
    expect(j.ops.length).toBeGreaterThan(5);
    expect(j.makespan).toBeGreaterThan(0);
    expect(jobText(j)).toMatch(/operations/);
  });
  it('an arm is only worth it when the job repeats, and track buys reach before a second arm does', () => {
    expect(handling({ span: 1, cycles: 5 }).pick).toBe('hands');
    // 400 moves a day saving 20 s each is $56 of time: an arm takes 540 days to pay for itself, so hands still win.
    // It takes about 1,500 a day before the arm is the cheaper answer, which is the number worth knowing.
    expect(handling({ span: 0.5, cycles: 400 }).pick).toBe('hands');
    expect(handling({ span: 0.5, cycles: 1500 }).pick).toBe('arm');
    expect(handling({ span: 4, cycles: 1500 }).pick).toBe('arm on a rail');
    for (const o of [{ span: 1, cycles: 5 }, { span: 0.5, cycles: 1500 }, { span: 4, cycles: 1500 }])
      expect(handling(o).says.length).toBeGreaterThan(60);
  });
  it('make-or-buy weighs the time against the price, and the waiting on top', () => {
    expect(worthMaking({ usd: null, minutes: 30 }).make).toBe(true);
    expect(worthMaking({ usd: 100, minutes: 30 }).make).toBe(true);
    expect(worthMaking({ usd: 2, minutes: 120 }).make).toBe(false);
    expect(worthMaking({ usd: 40, minutes: 120, waitDays: 14 }).make).toBe(true);
  });
  it('classOf and shapeOf read the words a bill of materials actually uses', () => {
    expect(classOf('al-6061')).toBe('metal-soft');
    expect(classOf('steel-low')).toBe('metal-hard');
    expect(classOf('clay')).toBe('clay');
    expect(classOf('fr4')).toBe('board');
    expect(classOf('nonsense')).toBeNull();
    expect(shapeOf({ name: 'input shaft' })).toBe('round');
    expect(shapeOf({ name: 'cover plate' })).toBe('flat');
    expect(shapeOf({ name: 'housing casting', size: [180, 120, 90] })).toBe('solid');
    expect(shapeOf({ name: 'a thing', size: [200, 150, 3] })).toBe('flat');
  });
});

describe('words in the room', () => {
  it('a named build is routed; a budget picks a works; nothing else answers nothing', () => {
    expect(worksWords('how would the workshop build a gokart')).toMatch(/go-kart/);
    expect(worksWords('what can I make in the metal shop')).toMatch(/metal shop/);
    expect(worksWords('a works for $5000')).toMatch(/\$5,000/);
    expect(worksWords('how would you build an ender 3 in the works')).toMatch(/Ender-3/);
    expect(worksWords('what is the weather')).toBeNull();
  });
  it('a works reads out with its families, its limits and what the building must give it', () => {
    const t = worksText(under3K().ids, 'build');
    expect(t).toMatch(/stations/); expect(t).toMatch(/Covers:/);
    expect(t).toMatch(/The building must give it/);
    expect(t).toMatch(/of your own work/);
  });
  it('every build says where its own numbers come from', () => {
    for (const b of BUILDS) { expect(b.src.length).toBeGreaterThan(60); expect(b.lines.length).toBeGreaterThan(1); }
  });
});

describe('the engine checks its own answer', () => {
  it('every plan it hands back holds up, for every build in every works', () => {
    for (const shop of [...SHOPS, { id: '3k', stations: under3K().ids }]) for (const b of BUILDS) {
      const j = throwAt(b, shop.stations);
      expect(j.audit.ok, `${b.id}/${shop.id}: ${j.audit.complaints.join('; ')}`).toBe(true);
      expect(j.audit.lines).toBe(b.lines.length);
      expect(j.audit.says.length).toBeGreaterThan(40);
    }
  });
  it('it notices a line that fell off the plan', () => {
    const j = throwAt('gokart', under3K().ids);
    const a = auditJob(j, [...buildById('gokart').lines, { name: 'a part nobody planned', n: 1, mat: 'steel-low' }]);
    expect(a.ok).toBe(false);
    expect(a.complaints.join(' ')).toMatch(/nowhere in the plan/);
  });
  it('it notices an operation on a station that cannot do it, and an impossible schedule', () => {
    const j = throwAt('workbench', under3K().ids);
    const bad: Job = { ...j, ops: [...j.ops, { ...j.ops[0]!, id: 'opX', process: 'pbf', station: 'bench' }] };
    expect(auditJob(bad, buildById('workbench').lines).complaints.join(' ')).toMatch(/does not do it/);
    const wrong: Job = { ...j, minutes: j.minutes + 999 };
    expect(auditJob(wrong, buildById('workbench').lines).complaints.join(' ')).toMatch(/the plan says/);
  });
  it('it notices a station doing two things at once', () => {
    const j = throwAt('gokart', under3K().ids);
    const clash: Job = { ...j, schedule: j.schedule.map((x) => ({ ...x, start: 0, end: 10 })) };
    expect(auditJob(clash, buildById('gokart').lines).complaints.join(' ')).toMatch(/two things at once/);
  });
});

describe('how good the schedule is', () => {
  it('the makespan is never under the floor, and the floor is never under the longest chain', () => {
    for (const b of BUILDS) {
      const j = throwAt(b, under3K().ids);
      if (!j.ops.length) continue;
      expect(j.bound.makespan).toBeGreaterThanOrEqual(j.bound.floor - 1e-6);
      expect(j.bound.floor).toBeGreaterThanOrEqual(j.bound.chain - 1e-6);
      expect(j.bound.floor).toBeGreaterThanOrEqual(j.bound.busiest.minutes - 1e-6);
      expect(j.bound.slack).toBeGreaterThanOrEqual(-1e-6);
    }
  });
  it('the critical path is a real chain, each operation waiting on the next one back', () => {
    const j = throwAt('quadcopter', under3K().ids);
    const by = new Map(j.ops.map((o) => [o.id, o]));
    const path = j.bound.critical;
    expect(path.length).toBeGreaterThan(1);
    for (let i = 1; i < path.length; i++) expect(by.get(path[i]!)!.after, `${path[i]} should wait on ${path[i - 1]}`).toContain(path[i - 1]);
  });
  it('one operation is its own floor; nothing to schedule says so', () => {
    const one = boundOf([{ id: 'a', part: 'a', n: 1, process: 'saw', station: 'bench', setup: 3, run: 7, after: [], transport: 'hand', lang: 'hand', program: '', says: '' }]);
    expect(one.floor).toBe(10);
    expect(one.makespan).toBe(10);
    expect(one.slack).toBe(0);
    expect(boundOf([]).says).toMatch(/nothing to schedule/);
  });
  it('a chain cannot be shortened by another machine, and it says which it is', () => {
    const j = throwAt('mug', under3K().ids);
    expect(j.bound.says).toMatch(/floor of/);
    expect(j.bound.says).toMatch(/chain|work/);
  });
});

describe('what the works learns about itself', () => {
  it('nothing measured means the class figure, and the class figure is what the catalogue says', () => {
    const st = stationById('cnc-benchtop');
    const h = holdsOf(st, 'mill');
    expect(h.from).toBe('class');
    expect(h.tol).toBe(st.tol);
    expect(h.says).toMatch(/nothing measured/);
  });
  it('a few parts is a hint; thirty is believed over the class figure', () => {
    let s = emptyState();
    for (let i = 0; i < 5; i++) s = sawPart(s, 'cnc-benchtop', 'mill', 0.004 * ((i % 3) - 1));
    expect(holdsOf(stationById('cnc-benchtop'), 'mill', s).from).toBe('class');
    for (let i = 0; i < 30; i++) s = sawPart(s, 'cnc-benchtop', 'mill', 0.004 * ((i % 3) - 1));
    const h = holdsOf(stationById('cnc-benchtop'), 'mill', s);
    expect(h.from).toBe('measured');
    expect(h.tol).toBeLessThan(stationById('cnc-benchtop').tol!);
  });
  it('a machine measured better can then be given work it was refused before', () => {
    const line: PartLine = { name: 'a bore, bearing seat', n: 2, mat: 'al-6061', size: [30, 30, 12], feature: 30, shape: 'round' };
    const ids = under3K().ids;
    const before = planJob('a part', [line], ids);
    let s = emptyState();
    for (let i = 0; i < 40; i++) s = sawPart(s, 'lathe-mini', 'turn', 0.0008 * ((i % 3) - 1));
    const after = planJob('a part', [line], ids, [], s);
    expect(before.gaps.length + before.buy.length, 'out of reach on the class figure').toBeGreaterThan(0);
    expect(after.ops.length, 'and in reach once the machine has been measured').toBeGreaterThan(before.ops.length);
  });
  it('a measurement never changes another station or another process', () => {
    let s = emptyState();
    for (let i = 0; i < 40; i++) s = sawPart(s, 'lathe-mini', 'turn', 0.0005);
    expect(holdsOf(stationById('cnc-benchtop'), 'mill', s).from).toBe('class');
    expect(holdsOf(stationById('lathe-mini'), 'drill', s).from).toBe('class');
  });
});

describe('tolerances and spares', () => {
  it("a line's tolerance is its own if it gives one, and derived if it does not", () => {
    expect(tolOf({ name: 'anything', n: 1, mat: 'al-6061', tol: 0.03 }).tol).toBe(0.03);
    expect(tolOf({ name: 'bearing seat', n: 1, mat: 'steel-low', feature: 25 }).fit).toBe('H7/k6');
    expect(Number.isFinite(tolOf({ name: 'a frame rail', n: 1, mat: 'steel-low', size: [40, 40, 900] }).tol)).toBe(false);
  });
  it('an operation that scraps some starts spares, and says how many and why', () => {
    const line: PartLine = { name: 'a plate', n: 6, mat: 'al-6061', size: [80, 60, 6], tol: 0.06, shape: 'flat' };
    const j = planJob('spares', [line], under3K().ids);
    const made = j.ops.find((o) => o.part === 'a plate');
    expect(made, 'it should be made at all').toBeTruthy();
    if (made?.spares) {
      expect(made.n).toBeGreaterThan(line.n);
      expect(made.fit!.cpk).toBeLessThan(1.33);
      expect(jobText(j)).toMatch(/started beyond what is wanted/);
    }
  });
  it('a comfortable tolerance starts no spares', () => {
    const line: PartLine = { name: 'a plate', n: 6, mat: 'al-6061', size: [80, 60, 6], tol: 2, shape: 'flat' };
    const made = planJob('easy', [line], under3K().ids).ops.find((o) => o.part === 'a plate');
    expect(made?.spares ?? 0).toBe(0);
  });
  it('the tolerance chain is only the parts that locate something', () => {
    const j = throwAt('gearbox', TIERS[4]!.stations);
    if (j.stack) { expect(j.stack.n).toBeGreaterThan(0); expect(Number.isFinite(j.stack.worst)).toBe(true); }
    const frame = throwAt('workbench', under3K().ids);
    expect(frame.stack, 'a welded bench locates nothing to a tolerance').toBeUndefined();
  });
  it('a probe on the machine takes time off the setup and says why', () => {
    const line: PartLine = { name: 'a bore, bearing seat', n: 1, mat: 'al-6061', size: [40, 40, 20], feature: 40, shape: 'round' };
    const j = planJob('probed', [line], TIERS[4]!.stations);
    const probe = j.ops.find((o) => o.process === 'probe');
    if (probe) {
      expect(probe.says).toMatch(/off the setup/);
      const cut = j.ops.find((o) => o.part === line.name)!;
      expect(cut.after).toContain(probe.id);
      expect(cut.setup).toBeLessThan(processById(cut.process).setup);
    }
  });
});

describe('the works as a thing to go and buy', () => {
  it('is every station in the order to come by it, with what it costs and why it is there', () => {
    const w = worksPack(3000);
    expect(w.stations.length).toBeGreaterThan(10);
    expect(w.usd).toBeLessThanOrEqual(3000);
    expect(w.usd).toBeLessThan(w.ifNew);                                 // the order is what saves the money
    expect(w.saves).toBeCloseTo(+(w.ifNew - w.usd).toFixed(2), 2);
    let run = 0;
    for (const s of w.stations) { run += s.usd; expect(s.gain.length, s.id).toBeGreaterThan(20); expect(s.why.length, s.id).toBeGreaterThan(20); }
    expect(+run.toFixed(2)).toBeCloseTo(w.usd, 1);
    // the floor comes first: nothing is bought before the bench and the callipers
    expect(w.stations[0]!.id).toBe('bench');
    expect(w.stations.slice(0, 4).map((s) => s.id)).toContain('measuring');
    // a hazardous station never arrives before the kit that makes it safe
    const safety = w.stations.findIndex((s) => s.id === 'safety'), forge = w.stations.findIndex((s) => s.id === 'forge');
    expect(safety).toBeGreaterThan(-1); expect(safety).toBeLessThan(forge);
  });
  it('a station made here says what it needs first, and is never made before it', () => {
    const w = worksPack(3000);
    const made = w.stations.filter((s) => s.as === 'build');
    expect(made.length).toBeGreaterThan(0);
    for (const s of made) {
      expect(s.hours, s.id).toBeGreaterThan(0);
      expect(s.how, s.id).toBeTruthy();
      const at = w.stations.findIndex((x) => x.id === s.id);
      for (const n of s.after) expect(w.stations.findIndex((x) => x.id === n), `${s.id} needs ${n}`).toBeLessThan(at);
    }
  });
  it('a self-build with a bill of materials is routed on the works as it stood when it was made', () => {
    const w = worksPack(3000);
    const brake = w.stations.find((s) => s.id === 'brake')!;
    expect(brake.as).toBe('build');
    expect(brake.job, 'the brake has a bill, so it has a job').toBeTruthy();
    // the job runs on what had been bought by then, not on the finished works
    expect(brake.job!.works).not.toContain('brake');
    expect(brake.job!.works).toContain('welder');
    expect(brake.job!.works.length).toBeLessThan(w.stations.length);
    expect(brake.job!.ops.some((o) => o.process === 'weld-mig')).toBe(true);
    expect(brake.job!.gaps, 'a station this works is said to make must be makeable').toEqual([]);
  });
  it('the page says where every figure came from', () => {
    const txt = worksPackText(worksPack(3000));
    expect(txt).toMatch(/^# The works under \$3,000$/m);
    expect(txt).toMatch(/## In this order/);
    expect(txt).toMatch(/## What the money is/);
    expect(txt).not.toMatch(/±Infinity/);                                 // a part that locates nothing carries no tolerance
    expect(txt).not.toMatch(/at the a /);                                 // station names carry their own article
    for (const s of worksPack(3000).stations) expect(txt).toContain(s.name);
  });
  it('the furnace and the brake are made of real stock, and what cannot be made here says so', () => {
    const furnace = BUILDS.find((b) => b.id === 'furnace-crucible')!;
    const j = throwAt(furnace, under3K().ids);
    expect(j.gaps, 'everything in it is bought or made').toEqual([]);
    // the crucible and the pail are bought, and each says why rather than being quietly made
    const bought = j.buy.map((b) => b.line.name);
    expect(bought).toContain('crucible, #6 clay-graphite');
    expect(bought).toContain('shell, steel pail');
    expect(j.buy.find((b) => /crucible/.test(b.line.name))!.why).toMatch(/molten metal/);
    expect(j.buy.find((b) => /pail/.test(b.line.name))!.why).toMatch(/deep-drawn|spun/);
    // a bag of refractory is bought, not refused: it is poured by hand and no process here works it
    expect(j.buy.find((b) => /refractory/.test(b.line.name))!.why).toMatch(/bought by the bag|laid dry/);
  });
});

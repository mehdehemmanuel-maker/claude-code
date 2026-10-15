// A gear train asked for in words, drawn as parts: the kit that turns "a 9 to 1 reduction", "a rack and pinion" or
// "a planetary gearbox 5 to 1" into a plate with real gears standing on it.
//
// SEPARATE FROM `parts/gears.ts` because they are separate concerns and the size lint said so at 699 lines of 700:
// that file owns the involute and what meshes with what, and this one owns reading an ask and laying the answer
// out as a drawing. Nothing here decides a tooth count or a centre distance — it asks `designTrain`, `planetary`
// and `meshing` for those and arranges what comes back.
//
// It is NOT a stored gearbox. The tooth counts come from the ratio in the sentence, the places come from the centre
// distances those counts require, and a different ratio gives a different train. The one thing it will not do is
// quietly round the ratio: it builds what whole teeth can give and `says` what that is against what was asked.
import { addKit, type Part } from './kits';
import { designTrain, gearPart, planetaryFor, readGears, sizesOf, train, type GearCut, type Placed } from './gears';

addKit({
  id: 'gears', name: 'gear train', saidWhole: true,
  words: /\b(gears?|gear train|gearbox|reduction|rack and pinion|idler|planetary|epicyclic|sun and planets?)\b/i,
  says: 'a gear train on a plate of shaft holes: involute teeth, the centres the standard gives, and the ratio its tooth counts really come to',
  choices: [
    { key: 'ratio', name: 'reduction', options: [1, 2, 3, 4, 5, 6, 9, 12, 16, 20, 25, 36, 50, 100] },
    { key: 'module', name: 'module', options: [1, 1.5, 2, 2.5, 3], unit: 'mm' },
    { key: 'kind', name: 'kind', options: ['reduction', 'idler', 'rack', 'planetary'] },
    { key: 'matter', name: 'made of', options: ['steel-low', 'brass', 'pom', 'pla'] },
  ],
  build(c) {
    const said = (c.said as string | undefined) ?? '';
    const asked = readGears(said);
    const m = (said && /\bm\s*(\d+(?:\.\d+)?)/i.exec(said) ? Number(/\bm\s*(\d+(?:\.\d+)?)/i.exec(said)![1]) : (c.module as number)) / 1000;
    const kind = said ? asked.kind : (c.kind as 'reduction' | 'idler' | 'rack' | 'planetary');
    const ratio = said && asked.ratio ? asked.ratio : (c.ratio as number);
    const b = 0.008, matter = c.matter as string;
    let places: Placed[];
    let note: string;
    // A PLANETARY CANNOT BE NAMED BY A FIXED-AXIS SOLVE. `train()` walks sun → planet → ring with every axis held
    // still, which is one of the three things a planetary does (the carrier held, −4.000 here) and not the one
    // anybody means: with the ring held the same set is 5.000 to 1. The first drawing of it was titled "4.000 to
    // 1, reversing" over a 5 to 1 gearbox — a true number answering a question nobody asked.
    let named: string | null = null;
    if (kind === 'rack') {
      // A RACK DRIVE IS A PINION AND A BAR: the pitch line stands at the pinion's pitch radius, so that distance is
      // not a choice, and how far the rack goes per turn is 2π·r — a length, never a ratio.
      const z = 20, pin: GearCut = { m, z, b, bore: 0.006, jn: 0.04 * m, matter };
      places = [{ id: 'pinion', gear: pin, at: [0, 0] }, { id: 'rack', gear: { m, z: 24, b, kind: 'rack', matter }, at: [0, -sizesOf(pin).r] }];
      note = `a ${z}-tooth pinion on a rack: ${(2 * Math.PI * sizesOf(pin).r * 1000).toFixed(1)} mm of travel per turn`;
    } else if (kind === 'idler') {
      // AN IDLER CHANGES THE DIRECTION AND NOT THE RATIO, which is the only reason one is ever fitted.
      const mk = (z: number): GearCut => ({ m, z, b, bore: 0.006, jn: 0.04 * m, matter });
      const [z1, zi] = [20, 15];
      places = [{ id: 'in', gear: mk(z1), at: [0, 0] }, { id: 'idler', gear: mk(zi), at: [((z1 + zi) * m) / 2, 0] }, { id: 'out', gear: mk(z1), at: [((z1 + zi) * m) / 2 + ((zi + z1) * m) / 2, 0] }];
      note = `an idler between two ${z1}-tooth gears: 1 to 1, and the output turns the same way as the input`;
    } else if (kind === 'planetary') {
      // A PLANETARY IS DRAWN FLAT, all of it in one plane: a sun, its planets on their carrier circle, and the ring
      // round the lot. Unlike a compound train it needs no layers — every mesh is in the same plane, which is the
      // whole reason the arrangement is compact.
      const pl = planetaryFor(ratio, said && /\b(\d)\s*planets?\b/i.test(said) ? Number(/\b(\d)\s*planets?\b/i.exec(said)![1]) : 3, m, b);
      if ('refused' in pl) return { name: 'a planetary that will not go together', parts: [], says: pl.refused };
      places = pl.places.map((q) => ({ ...q, gear: { ...q.gear, matter } }));
      named = `planetary gearbox, ${pl.ratios.ringHeld.toFixed(3)} to 1 with the ring held`;
      note = `a planetary set: ${pl.sun.z} sun, ${pl.n} × ${pl.planet.z} planets, ${pl.ring.z} ring — ${pl.ratios.ringHeld.toFixed(3)} to 1 with the ring held, ${pl.ratios.carrierHeld.toFixed(3)} with the carrier held (reversing), ${pl.ratios.sunHeld.toFixed(3)} with the sun held. ${pl.notes.join('; ')}`;
    } else {
      const d = designTrain(ratio, m, b);
      places = d.places.map((p) => ({ ...p, gear: { ...p.gear, matter } }));
      note = d.says;
    }
    const t = train(places, places[0]!.id);
    // THE PLATE under them, big enough for what was placed, with the real centres kept
    // A PLATE REACHES PAST THE TEETH, not past the axes. Sized from the centres alone — which is what this did at
    // first — a 54-tooth wheel at module 2 hangs 56 mm over an edge drawn 30 mm from its shaft, and the picture is
    // a gearbox resting on a stamp. Every gear's tip circle is what has to fit on it.
    const reach = places.map((p) => ({ x: p.at[0], y: p.at[1], r: p.gear.kind === 'rack' ? (p.gear.z * Math.PI * m) / 2 : sizesOf(p.gear).ra }));
    const x0 = Math.min(...reach.map((q) => q.x - q.r)), x1 = Math.max(...reach.map((q) => q.x + q.r));
    const y0 = Math.min(...reach.map((q) => q.y - q.r)), y1 = Math.max(...reach.map((q) => q.y + q.r));
    const pad = 0.012, w = x1 - x0 + 2 * pad, d2 = y1 - y0 + 2 * pad;
    const cx = (x1 + x0) / 2, cy = (y1 + y0) / 2;
    // THE SHAFTS PASS THROUGH THE PLATE, declared and not left to be found. A shaft stands in a journal through
    // the plate — that is what holds it square — so the plate says what passes through it, rather than the clash
    // finder reporting three shafts driven 4.5 mm into solid steel.
    const shaftNames: string[] = [];
    const parts: Part[] = [{ name: 'the plate', shape: { box: [w, 0.01, d2] }, at: [cx, -0.005, cy], mat: 'steel-low', color: 0x3b4048, rotates: false, passes: shaftNames }];
    const layers = Math.max(1, ...places.map((p) => (p.layer ?? 0) + 1));
    const lift = (p: Placed) => 0.005 + b / 2 + (p.layer ?? 0) * (b + 0.004);
    for (const p of places) {
      // laid flat on its own plane: the section is drawn in its own plane and extruded along its own z, and each
      // stage sits a face width and a little clearance higher up its shaft than the one before it
      const g = gearPart(p.gear, p.id, [p.at[0], lift(p), p.at[1]], [-Math.PI / 2, 0, 0]);
      parts.push({ ...g, color: p.gear.kind === 'rack' ? 0x9aa7b4 : 0xb08d57 });
    }
    // one shaft per axis, tall enough for every layer it carries — a shaft per gear would have drawn two shafts
    // inside each other wherever two gears are keyed together
    const axes = new Map<string, [number, number]>();
    for (const p of places) if (p.gear.kind !== 'rack') axes.set(`${p.at[0].toFixed(6)},${p.at[1].toFixed(6)}`, p.at);
    for (const [k, at] of axes) {
      const h = 0.01 + layers * (b + 0.004);
      const name = `shaft at ${k}`;
      shaftNames.push(name);
      parts.push({ name, shape: { cyl: [0.003, h] }, at: [at[0], h / 2 - 0.005, at[1]], mat: 'steel-low', color: 0x8a8f98 });
    }
    const ratioSaid = t.ratio !== null && Math.abs(t.ratio) !== 1 ? `${Math.abs(t.ratio).toFixed(3)} to 1, ${t.ratio < 0 ? 'reversing' : 'the same way round'}` : kind === 'rack' ? 'a rack drive' : '1 to 1';
    return { name: named ?? `gear train, ${ratioSaid}`, parts, says: `${note}. ${t.meshes.length} pair${t.meshes.length === 1 ? '' : 's'} in mesh at the centres the module gives${t.refused.length ? `; ${t.refused.length} pair refused: ${t.refused[0]!.why}` : ''}` };
  },
});

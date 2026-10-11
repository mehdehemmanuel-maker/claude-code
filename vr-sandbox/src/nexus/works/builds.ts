// Builds to throw at it, and what share of a real machine a works could make for itself.
//
// The test of a job router is not the job it was written for. These are deliberately unalike — a welded steel frame,
// a machine with a ground tolerance on it, a flying thing, a fired pot, a cast housing, a wall — and each is a real
// bill with real sizes and its own joints.
//
// Owner of: the builds, throwing one at a works, a maker's own machine as a job, and the bootstrap share.

import { usd as money } from '../parts/prices';
import { ENDER3 } from '../models/ender3';
import { VORON24 } from '../models/voron24';
import { billOf, boxedAs, type MakerModel } from '../machines/makermodel';
import { processById } from './families';
import { stationById, stationCost, type Buying } from './stations';
import { worksOf } from './stations';
import type { Join, PartLine } from './lines';
import type { WorksState } from './can';
import { planJob, type Job } from './plan';

// ---- builds to throw at it -----------------------------------------------------------------------------------------
// The test of a job router is not the job it was written for. These six are deliberately unalike — a welded steel
// frame, a machine with a ground tolerance on it, a flying thing, a fired pot, a cast housing, a wall — and each is a
// real bill with real sizes and its own joints. Throw any of them at any works and it says what happens: which
// machine, in what order, what gets bought and why, and what this works cannot do at all.

// ---- builds to throw at it -----------------------------------------------------------------------------------------
// The test of a job router is not the job it was written for. These six are deliberately unalike — a welded steel
// frame, a machine with a ground tolerance on it, a flying thing, a fired pot, a cast housing, a wall — and each is a
// real bill with real sizes and its own joints. Throw any of them at any works and it says what happens: which
// machine, in what order, what gets bought and why, and what this works cannot do at all.

export interface Build { id: string; what: string; lines: PartLine[]; joins?: Join[]; src: string }
export const BUILDS: Build[] = [
  { id: 'workbench', what: 'a welded steel workbench, 1500 × 700 × 900 mm',
    src: 'sizes from a bench a person stands at: 900 mm is a working height for hands, and 40 × 40 × 2 box section carries 500 kg over 1.5 m without a mid rail (typical)',
    lines: [
      { name: 'leg, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 880], cm3: 27 },
      { name: 'long rail, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 1420], cm3: 44 },
      { name: 'short rail, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 620], cm3: 19 },
      { name: 'foot pad, 60 × 60 × 6 plate', n: 4, mat: 'steel-low', size: [60, 60, 6], cm3: 21 },
      { name: 'top, 25 mm birch ply', n: 2, mat: 'wood', size: [1500, 700, 25], cm3: 26250 },
      { name: 'M10 × 40 bolt and nut', n: 16, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 20, mm: 160, says: 'every leg-to-rail corner welded all round: four sides of a 40 mm section is 160 mm of bead' },
      { how: 'fasten', n: 16, says: 'the ply top bolted down, so it can be replaced when it is worn out' },
    ] },
  { id: 'gokart', what: 'a pedal go-kart frame with steered front wheels',
    src: 'a kart\'s own geometry: 25 mm square tube, a live rear axle in two bearings, stub axles on kingpins, a steel seat pan (typical; machines.ts holds the track kart)',
    lines: [
      { name: 'frame tube, 25 × 25 × 2', n: 8, mat: 'steel-low', size: [25, 25, 900], cm3: 16 },
      { name: 'stub axle spindle, its wheel bearing seat', n: 2, mat: 'steel-low', size: [20, 20, 90], feature: 20, cm3: 12, shape: 'round' },
      { name: 'kingpin bush housing', n: 2, mat: 'steel-low', size: [30, 30, 50], feature: 16, cm3: 18, shape: 'round' },
      { name: 'seat pan, 2 mm sheet', n: 1, mat: 'steel-low', size: [420, 380, 2], cm3: 319 },
      { name: 'steering wheel boss, located on its column', n: 1, mat: 'al-6061', size: [60, 60, 25], feature: 19, cm3: 42, shape: 'round' },
      { name: '6204 bearing', n: 2, mat: 'steel-high' },
      { name: 'wheel, 10 inch pneumatic', n: 4, mat: 'rubber' },
      { name: 'M8 bolt', n: 24, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 14, mm: 100, says: 'the frame\'s joints, welded: a kart frame is one piece or it is a hinge' },
      { how: 'fasten', n: 24, says: 'seat, pedals, steering column and axle carriers bolted, because every one of them is adjusted after the first drive' },
    ] },
  { id: 'quadcopter', what: 'a 5-inch quadcopter',
    src: 'the craft the library already sizes (craft.ts): a 4 mm carbon unibody, 2207 motors, a 4S pack — and almost all of it bought, which is the honest answer for anything that flies',
    lines: [
      { name: 'unibody frame, 4 mm carbon sheet', n: 1, mat: 'cfrp', size: [220, 180, 4], tol: 0.1, cm3: 110, shape: 'flat' },
      { name: 'top deck, 2 mm carbon sheet', n: 1, mat: 'cfrp', size: [90, 80, 2], tol: 0.1, cm3: 12, shape: 'flat' },
      { name: 'camera cradle, printed', n: 1, mat: 'abs', size: [30, 25, 22], cm3: 6 },
      { name: 'landing foot, printed', n: 4, mat: 'abs', size: [20, 14, 18], cm3: 2 },
      { name: 'bldc-outrunner motor 2207', n: 4, mat: 'steel-low' },
      { name: 'pack-lipo-4s battery', n: 1, mat: 'steel-low' },
      { name: 'rc-receiver', n: 1, mat: 'fr4' },
    ],
    joins: [
      { how: 'solder', n: 14, says: 'four motors and the pack lead onto the stack: fourteen joints, and the one that is cold is the one that lets go at full throttle' },
      { how: 'fasten', n: 20, says: 'M3 through the arms into standoffs; nothing on a quadcopter is glued, because everything on it gets replaced' },
    ] },
  { id: 'mug', what: 'a thrown stoneware mug, bisque and glaze',
    src: 'the kiln the library models (processor.ts `fire`): cone 6 stoneware, bisque at cone 04, Orton\'s last 100 °C at 60 °C an hour',
    lines: [
      { name: 'mug body, thrown', n: 6, mat: 'clay', size: [90, 90, 110], cm3: 230 },
      { name: 'handle, pulled', n: 6, mat: 'clay', size: [90, 25, 15], cm3: 22 },
    ],
    joins: [{ how: 'bond', n: 6, when: 'before-finishing', says: 'the handle joined to the body with slip while both are leather-hard, before either is fired — joined wetter and it cracks off in the firing, and fired first it cannot be joined at all' }] },
  { id: 'gearbox', what: 'an aluminium gearbox housing, cast then machined',
    src: 'a housing is the hardest easy part there is: cast roughly, then every bearing bore cut to ±0.02 mm, because a bore 0.1 mm out eats the bearing it was bought to hold (typical)',
    lines: [
      { name: 'housing pattern, printed', n: 2, mat: 'pla', size: [180, 120, 90], cm3: 120 },
      { name: 'housing casting', n: 2, mat: 'al-6061', size: [180, 120, 90], cm3: 390 },
      { name: 'bearing bore, machined in the casting', n: 4, mat: 'al-6061', size: [52, 52, 15], feature: 52, cm3: 14, shape: 'round' },
      { name: 'cover, 8 mm plate on a gasket face', n: 2, mat: 'al-6061', size: [180, 120, 8], feature: 180, cm3: 160, shape: 'flat' },
      { name: '6205 bearing', n: 4, mat: 'steel-high' },
      { name: 'input shaft, a bearing seat each end', n: 1, mat: 'steel-high', size: [25, 25, 160], feature: 25, cm3: 78, shape: 'round' },
      { name: 'M6 × 20 screw', n: 16, mat: 'steel-low' },
    ],
    joins: [{ how: 'fasten', n: 16, says: 'the cover screwed to the housing on a gasket: a gearbox is opened again, so it is never welded shut' }] },
  // the two stations this works makes for itself whose figures are given fully enough to route: a bill of materials
  // for each, so a self-build is a job on the works as it stands and not a paragraph of advice (src/nexus/works/pack.ts)
  { id: 'brake-sheet', what: 'a sheet-metal brake, 600 mm, made here',
    src: 'the station\u2019s own self-build (src/nexus/works/stations.ts): two 600 mm lengths of 50 \u00d7 50 \u00d7 6 angle on a hinge line with a bending leaf and a handle, which bends 1.6 mm steel and 2 mm aluminium over 600 mm. The volumes are the angle\u2019s own section ((50 + 50 \u2212 6) \u00d7 6 = 564 mm\u00b2) over its length',
    lines: [
      { name: 'bed angle, 50 \u00d7 50 \u00d7 6', n: 1, mat: 'steel-low', size: [50, 50, 600], cm3: 338 },
      { name: 'clamp angle, 50 \u00d7 50 \u00d7 6', n: 1, mat: 'steel-low', size: [50, 50, 600], cm3: 338 },
      { name: 'bending leaf angle, 50 \u00d7 50 \u00d7 6', n: 1, mat: 'steel-low', size: [50, 50, 600], cm3: 338 },
      { name: 'hinge lug, 60 \u00d7 40 \u00d7 6 plate', n: 4, mat: 'steel-low', size: [60, 40, 6], feature: 10, cm3: 14 },
      { name: 'hinge pin, 10 mm round bar', n: 2, mat: 'steel-low', size: [10, 10, 70], cm3: 5, shape: 'round' },
      { name: 'handle, 20 \u00d7 2 tube', n: 1, mat: 'steel-low', size: [20, 20, 400], cm3: 45 },
      { name: 'M10 \u00d7 60 bolt and nut', n: 6, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 8, mm: 60, says: 'the four hinge lugs welded to the bed and the leaf, two beads each: the hinge line is the whole accuracy of the machine, so it is welded and then the pin holes are drilled through both lugs together' },
      { how: 'fasten', n: 6, says: 'the clamp angle bolted, not welded, because its grip has to be adjustable to the thickness being bent' },
    ] },
  { id: 'furnace-crucible', what: 'a crucible furnace, made here',
    src: 'the station\u2019s own self-build: the forge\u2019s burner in a steel pail lined with 50 mm of refractory, with the tongs, the lifting ring and the flask made and the crucible bought. The lining\u2019s volume is the pail\u2019s shell less its bore (a 300 mm pail, 350 mm deep, bored 200 \u00d7 250)',
    lines: [
      { name: 'lining, 50 mm refractory castable', n: 1, mat: 'refractory', size: [300, 300, 350], cm3: 16800 },
      { name: 'shell, steel pail', n: 1, mat: 'steel-low', size: [300, 300, 350], cm3: 420 },
      { name: 'crucible, #6 clay-graphite', n: 1, mat: 'graphite' },
      { name: 'lifting ring, 10 mm round bar', n: 1, mat: 'steel-low', size: [10, 10, 900], cm3: 71, shape: 'round' },
      { name: 'tong arm, 12 mm round bar', n: 2, mat: 'steel-low', size: [12, 12, 600], cm3: 68, shape: 'round' },
      { name: 'flask, 200 \u00d7 2 tube', n: 1, mat: 'steel-low', size: [200, 200, 250], cm3: 311 },
      { name: 'M8 \u00d7 30 bolt and nut', n: 4, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 4, mm: 50, says: 'the tongs\u2019 pivot and the ring\u2019s ends welded; the lining is cast in place and held by nothing but its own shape, which is why the pail is a pail and not a sheet rolled here' },
      { how: 'fasten', n: 4, says: 'the burner\u2019s mount bolted to the shell, so the same burner goes back to the forge' },
    ] },
  { id: 'wall', what: 'a garden wall, 6 m long and 1.2 m high',
    src: 'thrown at it on purpose: nothing below the plant touches concrete, so this is where the engine has to say so rather than make something up',
    lines: [
      { name: 'wall, printed concrete', n: 1, mat: 'concrete', size: [6000, 250, 1200], cm3: 1800000 },
      { name: 'coping stone', n: 12, mat: 'concrete', size: [500, 300, 60], cm3: 9000 },
    ] },
];
export const buildById = (id: string): Build => { const b = BUILDS.find((x) => x.id === id); if (!b) throw new Error(`no build ${id}`); return b; };
/** Throw a build at a works. This is the whole engine in one call. */
export function throwAt(build: Build | string, ids: string[], state?: WorksState): Job {
  const b = typeof build === 'string' ? buildById(build) : build;
  return planJob(b.what, b.lines, ids, b.joins ?? [], state);
}

const MODELS: Record<string, MakerModel> = { ender3: ENDER3, voron24: VORON24 };
/** A maker's own machine as a job: its published bill of materials routed through this works. */
export function jobForModel(model: 'ender3' | 'voron24', ids: string[], state?: WorksState): Job {
  const m = MODELS[model]!, bill = billOf(m), lines: PartLine[] = [];
  for (const [words, n] of Object.entries(bill.words)) {
    const mat = /extrusion/.test(words) ? 'al-6061' : /bearing|screw|nut|washer|rail|pulley|belt|stepper|spring/.test(words) ? 'steel-low' : 'al-6061';
    lines.push({ name: words, n, mat });
  }
  for (const [name, n] of Object.entries(bill.boxed)) lines.push({ name, n, mat: boxedAs(name).mat });
  const fasteners = Object.entries(bill.words).filter(([w]) => /screw|nut|bolt|washer/.test(w)).reduce((a, [, n]) => a + n, 0);
  return planJob(m.name, lines, ids, [{ how: 'fasten', n: Math.max(1, fasteners), says: 'a printer is almost entirely fasteners into extrusion and printed parts: that is what makes it buildable at a kitchen table' }], state);
}

export interface Bootstrap { model: string; total: number; made: { n: number; by: Record<string, number> }; bought: { n: number; why: Record<string, number> }; share: number; hours: number; says: string }
/** What share of a real machine a works could make for itself. The bills are the makers' own, measured from their
 *  published assemblies: the Ender-3's and the Voron 2.4's. */
export function bootstrapOf(ids: string[], model: 'ender3' | 'voron24', prefer: Buying = 'new'): Bootstrap {
  const j = jobForModel(model, ids), w = worksOf(ids);
  const had: string[] = []; let paid = 0;
  for (const i of ids) { const c = stationCost(stationById(i), had, prefer); had.push(i); if (Number.isFinite(c.usd)) paid += c.usd; }
  const by: Record<string, number> = {}, why: Record<string, number> = {};
  for (const o of j.ops) { if (/: stock$|: measured$/.test(o.part) || o.part.startsWith(`${j.what}:`)) continue; const key = processById(o.process).name; by[key] = (by[key] ?? 0) + o.n; }
  for (const b of [...j.buy, ...j.gaps.map((g) => ({ line: g.line, why: g.why }))]) why[b.why] = (why[b.why] ?? 0) + b.line.n;
  const made = Object.values(by).reduce((a, x) => a + x, 0), bought = Object.values(why).reduce((a, x) => a + x, 0), total = made + bought;
  const share = total ? +((made / total) * 100).toFixed(1) : 0;
  return { model: j.what, total, made: { n: made, by }, bought: { n: bought, why }, share, hours: +(j.makespan / 60).toFixed(1),
    says: `${j.what}: of ${total} parts, ${made} (${share} %) could be made in ${w.stations.length} stations costing ${money(+paid.toFixed(2))}, and ${bought} must be bought. A works does not bootstrap by making more of the machine — it bootstraps by making the ${share} % that is shaped and buying the ${(100 - share).toFixed(1)} % that is ground, wound, rolled or fabbed` };
}

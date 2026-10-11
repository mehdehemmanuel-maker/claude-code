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
import type { Part, V3 } from '../parts/kits';
import type { WorksState } from './can';
import { planJob, type Job } from './plan';
import { component } from '../parts/components';
import { massOf, DENSITY } from '../parts/mass';
import type { Machine } from '../ask/machine';

// ---- builds to throw at it -----------------------------------------------------------------------------------------
// The test of a job router is not the job it was written for. These six are deliberately unalike — a welded steel
// frame, a machine with a ground tolerance on it, a flying thing, a fired pot, a cast housing, a wall — and each is a
// real bill with real sizes and its own joints. Throw any of them at any works and it says what happens: which
// machine, in what order, what gets bought and why, and what this works cannot do at all.

export interface Build {
  id: string; what: string; lines: PartLine[]; joins?: Join[]; src: string;
  /** where each line of it sits, when it is a thing that gets stood up rather than only planned. The sizes are not
   *  repeated here — they are the bill's own, and a drawing that carried its own copy of them would be the second
   *  owner this file exists to prevent. Only the places are new. */
  lay?: Lay[];
}
/** One line of a bill, placed: which line, where each of its copies goes, which way its length runs and how far it is
 *  rolled about that length (a bending leaf opens about the hinge line it lies along). `along` is a direction, not an
 *  angle, because an angle has to be composed in the drawing's own order and twice now a beam laid along x by its
 *  author has come out drawn along z. A line with no `along` lies the way the library draws it: a box the way its
 *  size reads (x, y, then z), a round one standing up. */
export interface Lay { line: string; at: V3[]; along?: V3; roll?: number;
  /** a length of bar bent into a ring (a lifting ring, a hoop): drawn as the ring its own length makes */ bent?: 'ring' }

/** The turn that points a part's length along `d` and rolls it by `roll` about that length, as the three angles
 *  `Part.rot` is applied with (three.js Euler XYZ). `from` is which of the part's own axes its length already runs
 *  along before it is turned: a box is drawn x, y, z so its length is its z, and a cylinder is drawn standing up so
 *  its length is its y. Composed as a frame and read back out, because adding angles slot by slot is only right when
 *  they share an axis \u2014 and getting this wrong is how twelve beams of a frame came out all lying the same way. */
export function layRot(d: V3, roll = 0, from: 'y' | 'z' = 'z'): V3 {
  const unit = (v: V3): V3 => { const m = Math.hypot(...v) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };
  const cr = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const z = unit(d);
  // any vector not along the length does to start the frame from; up, unless the part is already standing up
  const u: V3 = Math.abs(z[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
  const a0 = unit(cr(u, z)), b0 = cr(z, a0), cs = Math.cos(roll), sn = Math.sin(roll);
  const a: V3 = [a0[0] * cs + b0[0] * sn, a0[1] * cs + b0[1] * sn, a0[2] * cs + b0[2] * sn], b = cr(z, a);
  // the frame's three columns, right-handed either way: (a, b, length) for a box, (a, length, -b) for a cylinder
  const [cx, cy, cz] = from === 'z' ? [a, b, z] : [a, z, [-b[0], -b[1], -b[2]] as V3];
  const m13 = cz[0], lim = 0.9999999;                                      // read as an XYZ Euler the way three does it
  if (Math.abs(m13) < lim) return [Math.atan2(-cz[1], cz[2]), Math.asin(m13), Math.atan2(-cy[0], cx[0])];
  return [Math.atan2(cy[2], cy[1]), Math.asin(Math.max(-1, Math.min(1, m13))), 0];
}
export const BUILDS: Build[] = [
  { id: 'workbench', what: 'a welded steel workbench, 1500 × 700 × 900 mm',
    src: 'sizes from a bench a person stands at: 900 mm is a working height for hands, so the leg is what is left of it under two sheets of ply and a foot pad (844 + 6 + 2 × 25 = 900), and 40 × 40 × 2 box section carries 500 kg over 1.5 m without a mid rail (typical). The steel volumes are the section\u2019s own ((40\u00b2 \u2212 36\u00b2) = 304 mm\u00b2) over each length',
    lines: [
      { name: 'leg, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 844], cm3: 257 },
      { name: 'long rail, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 1420], cm3: 432 },
      { name: 'short rail, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 620], cm3: 188 },
      { name: 'foot pad, 60 × 60 × 6 plate', n: 4, mat: 'steel-low', size: [60, 60, 6], cm3: 21 },
      { name: 'top, 25 mm birch ply', n: 2, mat: 'wood', size: [1500, 700, 25], cm3: 26250 },
      { name: 'M10 × 40 bolt and nut', n: 16, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 20, mm: 160, says: 'every leg-to-rail corner welded all round: four sides of a 40 mm section is 160 mm of bead' },
      { how: 'fasten', n: 16, says: 'the ply top bolted down, so it can be replaced when it is worn out' },
    ],
    // four legs at the corners of the rail frame (1420 = 1500 \u2212 two legs, 620 = 700 \u2212 two legs), a rail
    // frame under the top and another low down as a stretcher, a pad under each leg and the ply in two layers on top
    lay: [
      { line: 'leg', at: [[-0.73, 0.428, -0.35], [0.73, 0.428, -0.35], [-0.73, 0.428, 0.35], [0.73, 0.428, 0.35]], along: [0, 1, 0] },
      { line: 'long rail', at: [[0, 0.83, -0.35], [0, 0.83, 0.35], [0, 0.15, -0.35], [0, 0.15, 0.35]], along: [1, 0, 0] },
      { line: 'short rail', at: [[-0.73, 0.83, 0], [0.73, 0.83, 0], [-0.73, 0.15, 0], [0.73, 0.15, 0]], along: [0, 0, 1] },
      { line: 'foot pad', at: [[-0.73, 0.003, -0.35], [0.73, 0.003, -0.35], [-0.73, 0.003, 0.35], [0.73, 0.003, 0.35]], along: [0, 1, 0] },
      { line: 'top', at: [[0, 0.8625, 0], [0, 0.8875, 0]], along: [0, 1, 0] },
    ] },
  { id: 'gokart', what: 'a pedal go-kart frame with steered front wheels',
    src: 'a kart\'s own geometry: 25 mm square tube, a live rear axle in two bearings, stub axles on kingpins, a steel seat pan (typical; machines.ts holds the track kart)',
    lines: [
      { name: 'frame tube, 25 × 25 × 2', n: 8, mat: 'steel-low', size: [25, 25, 900], cm3: 166 },
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
      { name: 'handle, 20 \u00d7 2 tube', n: 1, mat: 'steel-low', size: [20, 20, 400], cm3: 45, shape: 'round', bore: [16, 400] },
      { name: 'M10 \u00d7 60 bolt and nut', n: 6, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 8, mm: 60, says: 'the four hinge lugs welded to the bed and the leaf, two beads each: the hinge line is the whole accuracy of the machine, so it is welded and then the pin holes are drilled through both lugs together' },
      { how: 'fasten', n: 6, says: 'the clamp angle bolted, not welded, because its grip has to be adjustable to the thickness being bent' },
    ],
    // the bed lies flat along the hinge line, the clamp sits on top of it, the leaf hangs off the hinge at the back,
    // and the handle stands off the leaf: three angles, two pins and a lever, which is the whole machine
    lay: [
      { line: 'bed angle', at: [[0, 0.025, 0]], along: [1, 0, 0] },
      { line: 'clamp angle', at: [[0, 0.075, -0.012]], along: [1, 0, 0] },
      { line: 'bending leaf', at: [[0, 0.025, -0.055]], along: [1, 0, 0], roll: 0.35 },
      { line: 'hinge lug', at: [[-0.26, 0.05, -0.03], [-0.09, 0.05, -0.03], [0.09, 0.05, -0.03], [0.26, 0.05, -0.03]] },
      { line: 'hinge pin', at: [[-0.175, 0.05, -0.03], [0.175, 0.05, -0.03]], along: [1, 0, 0] },
      { line: 'handle', at: [[0.26, 0.17, -0.2]], along: [0, Math.cos(0.9), -Math.sin(0.9)] },
    ] },
  { id: 'furnace-crucible', what: 'a crucible furnace, made here',
    src: 'the station\u2019s own self-build: the forge\u2019s burner in a steel pail lined with 50 mm of refractory, with the tongs, the lifting ring and the flask made and the crucible bought. The lining is cast inside the pail, so it is the pail\u2019s bore across (298) and its volume is that cylinder less its own bore (a 300 mm pail, 350 mm deep, bored 200 \u00d7 250)',
    lines: [
      { name: 'lining, 50 mm refractory castable', n: 1, mat: 'castable', size: [298, 298, 349], cm3: 16490, shape: 'round', bore: [200, 250] },
      { name: 'shell, steel pail', n: 1, mat: 'steel-low', size: [300, 300, 350], cm3: 200, shape: 'round', bore: [299, 349.5] },
      { name: 'crucible, #6 clay-graphite', n: 1, mat: 'graphite' },
      { name: 'lifting ring, 10 mm round bar', n: 1, mat: 'steel-low', size: [10, 10, 900], cm3: 71, shape: 'round' },
      { name: 'tong arm, 12 mm round bar', n: 2, mat: 'steel-low', size: [12, 12, 600], cm3: 68, shape: 'round' },
      { name: 'flask, 200 \u00d7 2 tube', n: 1, mat: 'steel-low', size: [200, 200, 250], cm3: 311, shape: 'round', bore: [196, 250] },
      { name: 'M8 \u00d7 30 bolt and nut', n: 4, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 4, mm: 50, says: 'the tongs\u2019 pivot and the ring\u2019s ends welded; the lining is cast in place and held by nothing but its own shape, which is why the pail is a pail and not a sheet rolled here' },
      { how: 'fasten', n: 4, says: 'the burner\u2019s mount bolted to the shell, so the same burner goes back to the forge' },
    ],
    // the shell stands on the floor, the lining is cast inside it, the crucible sits in the bore, and the tongs and
    // the flask stand beside it where they are left: a furnace is a bucket you do not pick up by its sides
    lay: [
      { line: 'shell', at: [[0, 0.175, 0]], along: [0, 1, 0] },
      { line: 'lining', at: [[0, 0.175, 0]], along: [0, 1, 0] },
      { line: 'crucible', at: [[0, 0.21, 0]], along: [0, 1, 0] },
      { line: 'lifting ring', at: [[0, 0.36, 0]], bent: 'ring' },
      { line: 'tong arm', at: [[0.3, 0.018, 0.06], [0.3, 0.018, -0.06]], along: [0, 0, 1] },
      { line: 'flask', at: [[-0.34, 0.125, 0]], along: [0, 1, 0] },
    ] },
  { id: 'forge-propane', what: 'a propane forge, made here',
    src: 'the station\u2019s own self-build, and the cheapest real one: a 20 lb propane tank is free or a few dollars '
      + 'second-hand, and lined with 50 mm of ceramic fibre blanket it holds a 200 \u00d7 450 mm chamber that a single '
      + '3/4 in naturally aspirated burner takes to forging heat (typical: 1,250 \u00b0C at the chamber wall). That burner '
      + 'is the station\u2019s own words and the cheapest pattern there is: black iron fittings with a 0.035 in MIG contact '
      + 'tip as the jet, which needs no blower and no electricity and costs about $50 against $60 for one bought. The tank '
      + 'is filled with water and the valve removed before a blade goes anywhere near it \u2014 that step is a person\u2019s '
      + 'and is in the plan as one. The blanket\u2019s volume is the shell\u2019s bore less the chamber, the coating is '
      + '2 mm of rigidised refractory over the chamber wall, and the stand is the same 40 \u00d7 40 \u00d7 2 box section as '
      + 'the bench. The burner, the blanket and the firebrick are bought; everything else is cut and welded here',
    lines: [
      { name: 'shell, 20 lb propane tank, purged and cut open', n: 1, mat: 'steel-low', size: [305, 305, 450], cm3: 750, shape: 'round', bore: [302, 448] },
      { name: 'lining, 50 mm ceramic fibre blanket', n: 1, mat: 'fibre-blanket', size: [302, 302, 450], cm3: 17810, shape: 'round', bore: [202, 450] },
      { name: 'chamber coating, 2 mm rigidised refractory', n: 1, mat: 'castable', size: [202, 202, 450], cm3: 565, shape: 'round', bore: [198, 450] },
      { name: 'floor, 230 \u00d7 114 \u00d7 32 firebrick split', n: 2, mat: 'firebrick-insulating', size: [114, 32, 230], cm3: 839 },
      { name: 'burner mixing tube, 3/4 in black iron pipe', n: 1, mat: 'steel-low', size: [27, 27, 230], cm3: 51, shape: 'round', bore: [21, 230] },
      { name: 'burner tee, 3/4 in black iron', n: 1, mat: 'steel-low' },
      { name: 'burner flare, 1 1/4 \u00d7 3/4 in black iron reducer', n: 1, mat: 'steel-low' },
      { name: 'jet, 0.8 mm (0.035 in) MIG contact tip in a 1/8 in nipple', n: 1, mat: 'copper' },
      { name: 'needle valve and hose, 1/8 in brass', n: 1, mat: 'brass' },
      { name: 'regulator, 0\u201330 psi POL with its hose', n: 1, mat: 'steel-low' },
      { name: 'burner mount, 32 NB tube', n: 1, mat: 'steel-low', size: [42, 42, 120], cm3: 44, shape: 'round', bore: [36, 120] },
      { name: 'stand leg, 40 \u00d7 40 \u00d7 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 500], cm3: 152 },
      { name: 'stand rail, 40 \u00d7 40 \u00d7 2 box section', n: 8, mat: 'steel-low', size: [40, 40, 320], cm3: 97 },
      { name: 'cradle bearer, 40 \u00d7 4 flat bar', n: 2, mat: 'steel-low', size: [40, 4, 420], cm3: 67 },
      { name: 'M8 \u00d7 25 bolt and nut', n: 8, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 16, mm: 160, says: 'the stand welded at every leg-to-rail corner, and the burner mount welded into the hole cut in the shell: the mount is what holds the burner at its own angle, so it is welded and not clamped' },
      { how: 'fasten', n: 8, says: 'the cradle bearers bolted to the stand, so the shell lifts off it to be relined \u2014 a blanket lining is a consumable and gets replaced' },
    ],
    // a forge is a tube lying on its side on a stand, open at the front, with the burner down through the top: the
    // bricks are loose in the bottom of the chamber because that is the surface that gets cut by flux and replaced
    lay: [
      { line: 'stand leg', at: [[-0.14, 0.25, -0.14], [0.14, 0.25, -0.14], [-0.14, 0.25, 0.14], [0.14, 0.25, 0.14]], along: [0, 1, 0] },
      { line: 'stand rail', at: [[0, 0.48, -0.14], [0, 0.48, 0.14], [0, 0.08, -0.14], [0, 0.08, 0.14]], along: [1, 0, 0] },
      { line: 'cradle bearer', at: [[0, 0.502, -0.12], [0, 0.502, 0.12]], along: [1, 0, 0] },
      { line: 'shell', at: [[0, 0.657, 0]], along: [0, 0, 1] },
      { line: 'lining', at: [[0, 0.657, 0]], along: [0, 0, 1] },
      { line: 'chamber coating', at: [[0, 0.657, 0]], along: [0, 0, 1] },
      { line: 'floor', at: [[0, 0.572, -0.113], [0, 0.572, 0.113]] },
      { line: 'burner mount', at: [[0, 0.84, -0.09]], along: [0, 1, 0] },
      { line: 'burner mixing tube', at: [[0, 0.95, -0.09]], along: [0, 1, 0] },
    ] },
  { id: 'kiln-brick', what: 'a small test kiln, made here',
    src: 'the station\u2019s own self-build (stations.ts): a box of K23 insulating firebrick laid dry in an angle-iron '
      + 'frame, its element in a groove cut with a router bit, run by a PID controller, a solid-state relay and a '
      + 'type-K thermocouple. Every piece comes off a 229 \u00d7 114 \u00d7 64 brick or it cannot be sawn from one, and that '
      + 'is what sets the size: three bricks laid flat across and one laid long make a 342 \u00d7 343 floor, a pinwheel '
      + 'of whole bricks on edge round it leaves a 214 \u00d7 215 chamber, and two courses make it 228 high \u2014 10.5 '
      + 'litres, 0.37 ft\u00b3. The element is the one number that is not a size: 1.8 kW at 120 V is 8.0 \u03a9, and 16 AWG '
      + '(1.29 mm) Kanthal A-1 at 1.45 \u00b5\u03a9\u00b7m is 1.11 \u03a9/m, so it is 7.2 m of wire, coiled and laid in the groove. '
      + 'It is a real fire risk \u2014 1.8 kW inside a brick box \u2014 which is why the station will not be counted until the '
      + 'safety kit is in, and why the mains side of it is a person\u2019s work and not the robot\u2019s',
    lines: [
      { name: 'wall brick, 229 \u00d7 114 \u00d7 64 K23 insulating firebrick', n: 8, mat: 'firebrick-insulating', size: [229, 114, 64], cm3: 1672 },
      { name: 'wall offcut, sawn to 50 \u00d7 114 \u00d7 64', n: 8, mat: 'firebrick-insulating', size: [50, 114, 64], cm3: 365 },
      { name: 'floor and lid brick, 229 \u00d7 114 \u00d7 64 K23', n: 6, mat: 'firebrick-insulating', size: [229, 114, 64], cm3: 1672 },
      { name: 'floor and lid packer, sawn to 114 \u00d7 114 \u00d7 64', n: 6, mat: 'firebrick-insulating', size: [114, 114, 64], cm3: 832 },
      { name: 'frame upright, 25 \u00d7 25 \u00d7 3 angle', n: 4, mat: 'steel-low', size: [25, 25, 330], cm3: 47 },
      { name: 'frame rail, 25 \u00d7 25 \u00d7 3 angle', n: 8, mat: 'steel-low', size: [25, 25, 350], cm3: 49 },
      { name: 'element, 16 AWG Kanthal A-1 resistance wire, coiled', n: 1, mat: 'steel-high', size: [1.29, 1.29, 7210], cm3: 9, shape: 'round' },
      { name: 'controller, PID with a type-K input', n: 1, mat: 'abs' },
      { name: 'solid-state relay, 25 A on its heatsink', n: 1, mat: 'al-6061' },
      { name: 'thermocouple, type K mineral-insulated 300 mm', n: 1, mat: 'steel-high' },
      { name: 'control box, 1.5 mm steel sheet', n: 1, mat: 'steel-low', size: [150, 100, 80], cm3: 105 },
      { name: 'mains lead and plug, 3 core 1.5 mm\u00b2', n: 1, mat: 'copper' },
      { name: 'element terminal, M4 stainless post and nuts', n: 2, mat: 'steel-high' },
      { name: 'lid handle, 10 mm round bar', n: 1, mat: 'steel-low', size: [10, 10, 220], cm3: 17, shape: 'round' },
    ],
    joins: [
      { how: 'weld-mig', n: 12, mm: 100, says: 'the angle-iron frame welded at its corners: it carries nothing but the bricks\u2019 own weight and keeps them from spreading, which is the whole job of a frame round a dry-laid box' },
      { how: 'fasten', n: 6, says: 'the control box bolted to the frame and its two element terminals through the back wall: nothing in the box is welded, because everything in it is replaced' },
    ],
    // laid as it is built: the floor first, then two courses of whole bricks in a pinwheel (each course turned the
    // other way, so no joint runs through), then the lid. The element is not drawn: it is in a groove inside the
    // chamber wall, which is where it is.
    lay: [
      { line: 'floor and lid brick', at: [[-0.114, 0.032, -0.057], [0, 0.032, -0.057], [0.114, 0.032, -0.057], [-0.114, 0.324, -0.057], [0, 0.324, -0.057], [0.114, 0.324, -0.057]], along: [0, 1, 0] },
      { line: 'floor and lid packer', at: [[-0.114, 0.032, 0.1145], [0, 0.032, 0.1145], [0.114, 0.032, 0.1145], [-0.114, 0.324, 0.1145], [0, 0.324, 0.1145], [0.114, 0.324, 0.1145]], along: [0, 1, 0] },
      { line: 'wall brick', at: [[-0.0565, 0.121, -0.1395], [0.0565, 0.121, 0.1395], [0.0565, 0.235, -0.1395], [-0.0565, 0.235, 0.1395]] },
      { line: 'wall brick', at: [[0.1395, 0.121, 0.007], [-0.1395, 0.121, -0.007], [0.1395, 0.235, -0.007], [-0.1395, 0.235, 0.007]], along: [1, 0, 0] },
      { line: 'wall offcut', at: [[0.0825, 0.121, -0.1395], [-0.0825, 0.121, 0.1395], [-0.0825, 0.235, -0.1395], [0.0825, 0.235, 0.1395]] },
      { line: 'wall offcut', at: [[0.1395, 0.121, 0.1465], [-0.1395, 0.121, -0.1465], [0.1395, 0.235, -0.1465], [-0.1395, 0.235, 0.1465]], along: [1, 0, 0] },
      { line: 'frame upright', at: [[-0.1735, 0.165, -0.174], [0.1735, 0.165, -0.174], [-0.1735, 0.165, 0.174], [0.1735, 0.165, 0.174]], along: [0, 1, 0] },
      { line: 'frame rail', at: [[0, 0.012, -0.174], [0, 0.012, 0.174], [0, 0.345, -0.174], [0, 0.345, 0.174]], along: [1, 0, 0] },
      { line: 'frame rail', at: [[-0.1735, 0.012, 0], [0.1735, 0.012, 0], [-0.1735, 0.345, 0], [0.1735, 0.345, 0]], along: [0, 0, 1] },
      { line: 'control box', at: [[0.248, 0.18, 0]] },
      { line: 'lid handle', at: [[0, 0.361, 0]], along: [1, 0, 0] },
    ] },
  { id: 'spot-welder-mot', what: 'a resistance spot welder, made here',
    src: 'the cheapest station in the building and the one that is only ever built: a microwave oven transformer is '
      + 'free out of a dead microwave, and the whole machine is that transformer with its high-voltage secondary cut '
      + 'out and two turns of welding cable put in its place. The transformer EMF equation sizes it: V per turn is '
      + '4.44 f B A, and at 60 Hz, 1.6 T and a 30 \u00d7 50 mm core limb that is 0.64 V a turn, so two turns is 1.3 V. '
      + 'The loop is a milliohm or two of cable, arms and electrodes, which is 500\u20131,600 A \u2014 the kiloamp a spot weld '
      + 'wants, and enough for 0.8 mm steel and the nickel strip a battery pack is made of (typical: the range is wide '
      + 'because it is all loop resistance). What it is NOT is safe to improvise: the primary side is mains, a cut '
      + 'secondary leaves two live ends, and the works\u2019 own rule is that mains work is a person\u2019s, never the '
      + 'robot\u2019s. The station needs the safety kit before the engine will count it',
    lines: [
      { name: 'transformer, salvaged microwave oven transformer with its secondary cut out', n: 1, mat: 'steel-high', size: [95, 85, 75] },
      { name: 'secondary, 2 turns of 50 mm\u00b2 (1/0 AWG) welding cable', n: 1, mat: 'copper', size: [13, 13, 600], cm3: 80, shape: 'round' },
      { name: 'electrode, 10 mm copper rod', n: 2, mat: 'copper', size: [10, 10, 80], cm3: 6, shape: 'round' },
      { name: 'arm, 20 \u00d7 6 copper bar', n: 2, mat: 'copper', size: [20, 6, 180], cm3: 21.6 },
      { name: 'arm pivot, 8 mm clevis pin and split pin', n: 1, mat: 'steel-low' },
      { name: 'frame, 25 \u00d7 25 \u00d7 3 angle', n: 4, mat: 'steel-low', size: [25, 25, 220], cm3: 31 },
      { name: 'base plate, 3 mm steel sheet', n: 1, mat: 'steel-low', size: [200, 150, 3], cm3: 90 },
      { name: 'lever, 20 \u00d7 20 \u00d7 2 box section', n: 1, mat: 'steel-low', size: [20, 20, 300], cm3: 43 },
      { name: 'insulator, 6 mm phenolic sheet', n: 2, mat: 'phenolic', size: [120, 60, 6], cm3: 43 },
      { name: 'return spring, extension', n: 1, mat: 'steel-high' },
      { name: 'timer, a microcontroller board and a mains solid-state relay', n: 1, mat: 'abs' },
      { name: 'foot switch, momentary', n: 1, mat: 'abs' },
      { name: 'enclosure, 1.5 mm steel sheet', n: 1, mat: 'steel-low', size: [220, 180, 160], cm3: 311 },
      { name: 'M8 \u00d7 40 bolt and nut', n: 4, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 10, mm: 100, says: 'the frame welded, and the transformer\u2019s own core clamped to it rather than welded: a weld across the laminations shorts them together and the core heats instead of the work' },
      { how: 'fasten', n: 8, says: 'the cable ends bolted to the copper arms through the phenolic insulators, which is the joint that carries a thousand amps: it is bolted and faced flat, because a loose joint there is the whole loop resistance' },
    ],
    // a transformer on a plate with two arms over it, the top one on a pivot under a lever: the electrodes meet where
    // the work goes, and the enclosure stands behind, because the mains side is not something hands go near
    lay: [
      { line: 'base plate', at: [[0, 0.0015, 0]], along: [0, 1, 0] },
      { line: 'transformer', at: [[-0.03, 0.041, 0]] },
      { line: 'frame', at: [[-0.085, 0.113, -0.06], [-0.085, 0.113, 0.06], [0.085, 0.113, -0.06], [0.085, 0.113, 0.06]], along: [0, 1, 0] },
      { line: 'arm', at: [[0.08, 0.1, 0], [0.08, 0.16, 0]], along: [1, 0, 0] },
      { line: 'electrode', at: [[0.155, 0.11, 0], [0.155, 0.15, 0]], along: [0, 1, 0] },
      { line: 'arm pivot', at: [[0.02, 0.16, 0]], along: [0, 0, 1] },
      { line: 'lever', at: [[-0.06, 0.21, 0]], along: [1, 0, 0.35] },
      { line: 'insulator', at: [[0.02, 0.13, 0]], along: [1, 0, 0] },
      { line: 'enclosure', at: [[-0.12, 0.08, 0.16]] },
    ] },
  { id: 'wheel-potters', what: "a potter's wheel, made here",
    src: 'the station\u2019s own self-build (stations.ts): a welded frame, a plywood-and-plaster head on a bought shaft '
      + 'in two bearings, driven by a washing-machine motor through a V-belt. The ratio is the one number that '
      + 'matters: a 60 mm pulley on the motor and a 240 mm on the head is 4:1, so a 1,425 rpm motor gives 356 rpm at '
      + 'the head wide open and the board takes it down from there \u2014 centring wants 100\u2013200 rpm and throwing 60\u2013120. '
      + 'The head is 300 mm, which is what the station\u2019s own envelope says. The bearings, the motor, its board, the '
      + 'belt and the pedal are bought; the frame, the head, the shaft\u2019s pulley and the splash pan are made here',
    lines: [
      { name: 'frame leg, 40 \u00d7 40 \u00d7 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 600], cm3: 182 },
      { name: 'frame rail, 40 \u00d7 40 \u00d7 2 box section', n: 10, mat: 'steel-low', size: [40, 40, 420], cm3: 128 },
      { name: 'bearing plate, 6 mm steel sheet', n: 2, mat: 'steel-low', size: [160, 160, 6], cm3: 153 },
      { name: 'shaft, 25 mm round bar', n: 1, mat: 'steel-high', size: [25, 25, 500], cm3: 245, shape: 'round' },
      { name: 'head, 300 mm 25 mm birch ply disc', n: 1, mat: 'wood', size: [300, 300, 25], cm3: 1767, shape: 'round' },
      { name: 'head facing, 10 mm plaster', n: 1, mat: 'gypsum', size: [300, 300, 10], cm3: 707, shape: 'round' },
      { name: 'splash pan, 2 mm sheet', n: 1, mat: 'steel-low', size: [520, 520, 110], cm3: 620, shape: 'round', bore: [460, 108] },
      { name: 'bearing, 6205-2RS', n: 2, mat: 'steel-high', size: [52, 52, 15], cm3: 17, shape: 'round', bore: [25, 15] },
      { name: 'motor, washing-machine induction motor', n: 1, mat: 'steel-high', size: [180, 180, 200], cm3: 637, shape: 'round' },
      { name: 'pulley, 60 mm V on the motor', n: 1, mat: 'al-6061', size: [60, 60, 20], cm3: 45, shape: 'round' },
      { name: 'pulley, 240 mm 20 mm birch ply disc on the head shaft', n: 1, mat: 'wood', size: [240, 240, 20], cm3: 850, shape: 'round' },
      { name: 'belt, A-section V-belt 1000 mm', n: 1, mat: 'rubber', size: [13, 8, 1000], cm3: 83 },
      { name: 'speed board for the motor', n: 1, mat: 'abs' },
      { name: 'foot pedal, speed control', n: 1, mat: 'abs' },
      { name: 'M8 \u00d7 30 bolt and nut', n: 8, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 16, mm: 160, says: 'the frame welded at every corner and the two bearing plates welded in: the plates are what hold the shaft upright, and a wheel head that is not square to its shaft wobbles where the hands are' },
      { how: 'fasten', n: 8, says: 'the head bolted to its flange, the motor on slotted holes so the belt can be tensioned, and the pan dropped on last: everything that wears is bolted' },
    ],
    // a table with a shaft up the middle of it: the head and its pan on top where the hands are, the motor hung
    // under the plate beside the shaft, the belt between their pulleys
    lay: [
      { line: 'frame leg', at: [[-0.21, 0.3, -0.21], [0.21, 0.3, -0.21], [-0.21, 0.3, 0.21], [0.21, 0.3, 0.21]], along: [0, 1, 0] },
      { line: 'frame rail', at: [[0, 0.58, -0.21], [0, 0.58, 0.21], [0, 0.08, -0.21], [0, 0.08, 0.21]], along: [1, 0, 0] },
      { line: 'frame rail', at: [[-0.21, 0.58, 0], [0.21, 0.58, 0], [-0.21, 0.08, 0], [0.21, 0.08, 0]], along: [0, 0, 1] },
      // the lower bearing plate needs something to be welded to: without these two it hung in mid-air under the
      // frame, which a blind judge read as "a stray flat panel connected to nothing"
      { line: 'frame rail', at: [[0, 0.30, -0.21], [0, 0.30, 0.21]], along: [1, 0, 0] },
      { line: 'bearing plate', at: [[0, 0.58, 0], [0, 0.30, 0]], along: [0, 1, 0] },
      { line: 'shaft', at: [[0, 0.45, 0]], along: [0, 1, 0] },
      { line: 'bearing', at: [[0, 0.585, 0], [0, 0.305, 0]], along: [0, 1, 0] },
      // the belt sets the motor's place, not the other way round: a 1,000 mm A-section over a 240 and a 60 runs at
      // 260 mm centres (L = 2C + \u03c0(D+d)/2 + (D\u2212d)\u00b2/4C), and at the 150 the first lay guessed, the belt's own loop
      // passed clean through the motor's body \u2014 which read as a bucket with a handle through it
      { line: 'pulley, 240', at: [[0, 0.40, 0]], along: [0, 1, 0] },
      { line: 'motor', at: [[0.26, 0.28, 0]], along: [0, 1, 0] },
      { line: 'pulley, 60', at: [[0.26, 0.40, 0]], along: [0, 1, 0] },
      { line: 'belt', at: [[0.13, 0.40, 0]], bent: 'ring', along: [0, 1, 0] },
      // the head stands clear of the pan's rim, or the pan is a drum with a lid and not a trough you wash a hand in
      { line: 'splash pan', at: [[0, 0.645, 0]], along: [0, 1, 0] },
      { line: 'head', at: [[0, 0.7125, 0]], along: [0, 1, 0] },
      { line: 'head facing', at: [[0, 0.73, 0]], along: [0, 1, 0] },
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
    // the library knows every one of these parts by these very words, so its own size, material and volume are what
    // the line carries. Guessing the material from the spelling and leaving the size off meant the router worked on
    // an invented 60 \u00d7 60 \u00d7 30 block for all hundred-odd lines, and every "share of a printer this works could
    // make" ever printed was that fiction added up.
    const g = component(words);
    if (typeof g === 'string') { lines.push({ name: words, n, mat: /extrusion/.test(words) ? 'al-6061' : 'steel-low' }); continue; }
    const of = madeOf(g.part), size = g.item?.size;
    lines.push({ name: words, n, mat: of.mat, ...(size ? { size: [...size] as [number, number, number] } : {}), ...(of.cm3 > 0 ? { cm3: of.cm3 } : {}) });
  }
  for (const [name, n] of Object.entries(bill.boxed)) {
    // the model drew it, so its size is known even where its name is not a library word
    const s = bill.size[name], b = boxedAs(name);
    lines.push({ name, n, mat: b.mat, ...(s ? { size: s } : {}), ...(s && b.fill > 0 ? { cm3: +((s[0] * s[1] * s[2] * Math.min(1, b.fill)) / 1000).toFixed(1) } : {}) });
  }
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

// ---- a machine the inventor composed, thrown at a works -------------------------------------------------------------
// src/nexus/ask/machine.ts composes a machine out of what the library affords and says what it is made of. This turns
// that into a build, so the same router that plans a go-kart says what to do about a machine nobody drew: which lines
// are bought whole (a rail, a stepper, a belt, a board), which are stock cut to length here (every extrusion), and
// which are printed on the works' own printer. That is the order the user asked for — "whatever we have to do first or
// buy or code" — derived rather than written down.
//
// The lines are named by the component library's own names for the parts, not by the words that drew them, because the
// router matches on what a thing *is* ("M5 T-slot nut" is a fastener, "slotnut slot6 M5 hammer" is a spelling).

/** What a drawn part is mostly made of, and how many cm³ of it there are: the material carrying the most of its mass,
 *  and its mass over that material's density. A part of several materials is routed by its heaviest, which is what
 *  decides the process. */
export function madeOf(p: Part): { mat: string; cm3: number } {
  const by = new Map<string, number>();
  const walk = (q: Part) => {
    const kg = massOf({ ...q, parts: undefined });
    if (q.mat && kg > 0) by.set(q.mat, (by.get(q.mat) ?? 0) + kg);
    for (const r of q.parts ?? []) walk(r);
  };
  walk(p);
  const best = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return { mat: 'steel-low', cm3: 0 };
  const rho = DENSITY[best[0]] ?? 7850;
  return { mat: best[0], cm3: +((massOf(p) / rho) * 1e6).toFixed(2) };
}

/** A composed machine as a build to throw at a works. */
export function machineBuild(m: Machine): Build {
  const lines: PartLine[] = [];
  const add = (name: string, n: number, mat: string, size?: [number, number, number], cm3?: number) => {
    const was = lines.find((l) => l.name === name && l.mat === mat);
    if (was) { was.n += n; return; }
    lines.push({ name, n, mat, ...(size ? { size } : {}), ...(cm3 != null ? { cm3 } : {}) });
  };
  for (const s of m.stages) {
    for (const { words, n } of s.unit.of) {
      const c = component(words);
      if (typeof c === 'string') continue;
      const { mat, cm3 } = madeOf(c.part);
      add(c.item.name, n, mat, c.item.size as [number, number, number] | undefined, cm3);
    }
    // a line bought whole is named as what it is, so the router reaches the same verdict from the words alone
    for (const b of s.unit.bought ?? []) add(b.what, b.n, 'steel-low');
  }
  return {
    id: 'invented', what: m.name + `, ${m.reach.join(' × ')} mm`,
    src: `composed from what the component library affords (src/nexus/ask/machine.ts): ${m.stages.map((s) => s.unit.name).join(', ')}`,
    lines,
    joins: [{ how: 'fasten', n: lines.filter((l) => /bolt|screw|nut/i.test(l.name)).reduce((a, l) => a + l.n, 0), says: 'every bolt into a T-slot nut or a tapped plate: the whole machine comes apart again, which is what extrusion is for' }],
  };
}

// ---- a self-build drawn from its own bill ---------------------------------------------------------------------------
// The bill is the one owner of what a thing is made of, so the drawing is derived from it rather than written beside
// it: a second copy of "50 × 50 × 6 angle, 600 long" in a drawing file is exactly the fault the owners table exists to
// prevent, and it goes stale the first time the bill changes. Only the *places* are new, and they live on the build
// (`Build.lay`) beside the sizes they place.
//
// What this cannot do is make a section out of a box: an angle is drawn as its bounding prism, not as an L. That is
// said on every part it draws, because a drawing that quietly rounds a section up to a solid is how a 6 mm angle comes
// out weighing like a 50 mm bar.

/** How each material in a bill is drawn. Nothing here is a claim about the material — the bill's own `mat` is — only
 *  about how it looks, which the library's own density table does not say. */
const BILL_LOOK: Record<string, { color: number; finish: string }> = {
  'steel-low': { color: 0x8c9199, finish: 'mill' },
  refractory: { color: 0xd9cdb4, finish: 'texture' },
  graphite: { color: 0x3a3a3c, finish: 'texture' },
  wood: { color: 0xc0a378, finish: 'sanded' },
  'al-6061': { color: 0xadb2b8, finish: 'mill' },
};

/** The section a bill line states in its own name, as the library's own prism: "50 × 50 × 6" on a 600 mm angle is an
 *  L of two 50 mm legs 6 mm thick, and "40 × 40 × 2 box section" is a square tube with its bore. It is a section and
 *  not a size when the first two numbers are the line's own width and depth and the third is not its length — which
 *  is also how the bill's cm³ was worked out, so the drawing, the name and the volume now say the same thing.
 *  Anything else (a plate, a bar, a sheet) is already the box it says it is. */
export function sectionOf(line: PartLine): { prism: { pts: [number, number][]; holes?: [number, number][][]; L: number } } | null {
  if (line.shape === 'round' || !line.size) return null;
  const m = /(\d+(?:\.\d+)?) × (\d+(?:\.\d+)?) × (\d+(?:\.\d+)?)/.exec(line.name);
  if (!m) return null;
  const mm = 0.001, a = Number(m[1]), c = Number(m[2]), w = Number(m[3]), [sa, sc, L] = line.size;
  if (a !== sa || c !== sc || w === L) return null;
  const P = (x: number, y: number): [number, number] => [x * mm, y * mm];
  if (/\bangle\b/.test(line.name)) {
    // an L stood on its own corner: the leg along x, the leg up y, both w thick
    return { prism: { L: L * mm, pts: [P(-a / 2, -c / 2), P(a / 2, -c / 2), P(a / 2, -c / 2 + w), P(-a / 2 + w, -c / 2 + w), P(-a / 2 + w, c / 2), P(-a / 2, c / 2)] } };
  }
  if (/box section|\btube\b|\bbox\b/.test(line.name)) {
    const i = [a / 2 - w, c / 2 - w];
    return { prism: { L: L * mm, pts: [P(-a / 2, -c / 2), P(a / 2, -c / 2), P(a / 2, c / 2), P(-a / 2, c / 2)],
      holes: [[P(-i[0]!, -i[1]!), P(i[0]!, -i[1]!), P(i[0]!, i[1]!), P(-i[0]!, i[1]!)]] } };
  }
  return null;
}

/** The line a lay's words name: the closest match, never the first in the bill. A place called "bearing" matched the line
 *  "bearing plate, 6 mm steel sheet" because it came first in the bill, so a wheel's two bearings were drawn as two
 *  more plates. The closest is the *shortest* line the words still begin, because a lay names its line as
 *  briefly as it can — and the longest match picked the plate for the place that says only "bearing". */
export function lineFor(b: Build, words: string): PartLine | undefined {
  const w = words.toLowerCase(), names = b.lines.filter((l) => l.name.toLowerCase().startsWith(w));
  // a place that names a whole head noun means that line and not one the noun begins: "head" is the ply disc and not
  // "head facing", "bearing" is the 6205 and not "bearing plate". A place that stops mid-segment ("pulley, 240")
  // takes the shortest line it begins, which is the closest thing to what it said.
  return names.find((l) => l.name.toLowerCase() === w || l.name.toLowerCase().startsWith(`${w},`))
    ?? names.sort((x, y) => x.name.length - y.name.length)[0];
}

/** A self-build as a drawn part: every line of its bill at the place the build gives it, at the bill's own size. A
 *  line the build does not place is left out rather than dropped somewhere, and `says` names how many of each. */
export function builtParts(b: Build): Part[] {
  if (!b.lay) return [];
  const mm = 0.001, out: Part[] = [];
  for (const place of b.lay) {
    const line = lineFor(b, place.line);
    if (!line?.size) continue;
    const [a, c, L] = line.size, look = BILL_LOOK[line.mat] ?? BILL_LOOK['steel-low']!;
    place.at.forEach((at, i) => {
      const round = line.shape === 'round', cut = sectionOf(line);
      // a ring is a length of bar bent round: its own circumference says how wide it comes out
      const shape = place.bent === 'ring' ? { torus: [L * mm / (2 * Math.PI), (a / 2) * mm] as [number, number] }
        : cut ? cut
          : round ? { cyl: [(a / 2) * mm, L * mm] as [number, number] } : { box: [a * mm, c * mm, L * mm] as V3 };
      // a tube drawn solid is a bar, and a pail drawn solid hides everything cast inside it: the bore the bill states
      // is cut down the part's own length from the end it is bored from
      const cuts = line.bore
        ? [{ r: (line.bore[0] / 2) * mm, depth: line.bore[1] * mm,
            at: (round ? [0, (L / 2) * mm, 0] : [0, 0, (L / 2) * mm]) as V3, dir: (round ? [0, -1, 0] : [0, 0, -1]) as V3 }]
        : undefined;
      out.push({
        name: place.at.length > 1 ? `${line.name} (${i + 1} of ${place.at.length})` : line.name,
        shape, at, ...(place.along || place.roll ? { rot: layRot(place.along ?? (round && !cut ? [0, 1, 0] : [0, 0, 1]), place.roll ?? 0, round && !cut && place.bent !== 'ring' ? 'y' : 'z') } : {}), ...(cuts ? { cuts } : {}),
        mat: line.mat, color: look.color, finish: look.finish,
        says: `${line.name}: ${line.size!.join(' × ')} mm${line.bore ? `, bored ${line.bore[0]} mm, ${line.bore[1]} mm deep` : ''}${line.cm3 ? `, ${line.cm3} cm³ of ${line.mat}` : ''} \u2014 from this build's own bill of materials${cut ? ', drawn as the section its name states' : place.bent === 'ring' ? `, bent into a ring of ${Math.round(L / Math.PI)} mm` : line.bore ? ', bored down its length' : ''}.`,
      } as Part);
    });
  }
  return out;
}

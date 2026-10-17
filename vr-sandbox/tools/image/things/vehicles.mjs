// Vehicles from their figures: one rule draws every kind. VEHICLES holds each kind's dimensions in metres with the
// source of every figure (src/nexus/machines.ts line numbers where the project holds the machine, else 'typical' or
// an estimate, as the figures sheet says); a builder per silhouette family turns a row into parts in the vehicle's
// own frame (u metres from the nose, v across from the centre line, right positive, h up): prisms (a profile
// extruded along one axis), wheels (two circles and their hull), tubes, rings and lamps. drawVehicle() stands the
// parts in the world at the instance's position and heading ('away': the nose points down the road, the rear face
// toward the viewer; 'toward' mirrors it; 'side': the side elevation, nose to the left), projects every face through
// ctx.project, keeps the faces whose normal looks at the camera, lights each by its normal against the sun's
// direction, and paints its detail (arches, doors, windows, slats, a plate) by unprojecting each pixel back onto the
// face, so a window is a window at any depth and angle. Wheels go first (the body's arches are left transparent
// over them), then the prisms far to near, then the lamps, lit when the ambient light is low (red at the rear, white
// at the front). The colour is the instance's, else a seeded pick from a palette, so two uncoloured cars differ.
// Nothing of Node is here; the only imports are the camera's sizes, the hull and the numbers, and the registry.
import { clamp, mix } from '../math.mjs';
import { SIZES, hull } from '../draw.mjs';
import { register } from '../registry.mjs';

// ── The figures, in metres ─────────
// Every row: length, width, height, wheelbase, overhangs, wheel diameters, body height, cab, bed or trailer, axles
// (u from the nose, each with its tyre's radius r and width w, dual where the axle carries two a side), the open
// seat, the roll hoop, the mast, the roof sign, the lamps (heights, null where the machine has none). `shape` names
// the builder; `source` says what is published and what is typical. Figures sheet: scratchpad/figures/
// vehicles-figures.json (read from machines.ts whole, 2026-10-17).

/** A rental kart's track puts its tyres outside its pods: machines.ts:1030 pods at W/2 - 0.13, tyre faces at 0.65. */
const KART = {
  name: 'rental go-kart with a Honda GX270', shape: 'kart',
  // machines.ts:1278-1285: chassis typical of rental karts (1.85 x 1.35 x 0.62, wheelbase 1.04); the engine
  // published (Honda GX270 381 x 428 x 422 mm, 25 kg); tyres 10x4.50-5 and 11x7.10-5 through tyreOf (0.254, 0.279)
  source: 'typical chassis (machines.ts:1278-1285), published engine (Honda); tyres typical of rental karts',
  length: 1.85, width: 1.35, height: 0.62, wheelbase: 1.04, overhangs: { front: 0.405, rear: 0.405 },
  wheelDiameter: { front: 0.254, rear: 0.279 }, clearance: 0.035,
  bodyHeight: 0.19, // the bodywork band 0.065-0.235 m (machines.ts:1009, 1030, 1013): ankle-high
  cab: 'none', cabLength: null, bed: null, trailer: null,
  axles: [{ u: 0.405, r: 0.127, w: 0.114, track: 1.05 }, { u: 1.445, r: 0.1395, w: 0.18, track: 1.12 }],
  openSeat: true, // a fibreglass seat on the frame, cushion 0.08 m up (machines.ts:1281, 613)
  // none in machines.ts (no "hoop" in the file): a rental or racing kart has none; its seat shell rises to 0.5 m
  // (machines.ts:613), the steering wheel to 0.62. An off-road fun kart's hoop (1.2-1.4 m) is typical, not held.
  rollHoop: false, seatBack: 0.5, mast: null, roofSign: null,
  lamps: { front: null, rear: null }, // karts carry no lights (machines.ts:1283: extras nose, pods only)
  engine: { u: [1.28, 1.71], v: [0.01, 0.43], h: [0.1, 0.5] }, // the GX270 at the rear right (machines.ts:1282)
  pods: { u: [0.6, 1.5], v: [0.42, 0.545], h: [0.065, 0.225] }, nose: { h: [0.065, 0.215] },
  bumper: { u: [1.72, 1.85], h: [0.085, 0.235] },
};

/** The car's lines as machines.ts keeps them, in metres from the nose and up from the ground. */
const CAR = {
  name: 'Toyota Corolla LE (2025)', shape: 'car',
  // machines.ts:1222-1231: 182.3 x 70.1 x 56.5 in, wheelbase 106.3 in, clearance 5.3 in, tread 60.3/61.0 in
  // (Toyota, published); front overhang about 37 in (an estimate); tyre 205/55R16 (typical of its 16-in wheels)
  // through tyreOf: 0.632; its body lines measured off a third party's elevation (estimates, machines.ts:1230)
  source: 'published dimensions (machines.ts:1222-1231, Toyota); overhangs and lines estimates',
  length: 4.63, width: 1.781, height: 1.435, wheelbase: 2.7, overhangs: { front: 0.94, rear: 0.991 },
  wheelDiameter: { front: 0.632, rear: 0.632 }, clearance: 0.135, bodyHeight: 1.3,
  cab: 'mid', cabLength: 3.102, bed: null, trailer: null,
  axles: [{ u: 0.94, r: 0.316, w: 0.205, track: 1.532 }, { u: 3.64, r: 0.316, w: 0.205, track: 1.549 }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null,
  lamps: { front: 0.676, rear: 0.972 }, // panels.ts:372, 386: lamp centres under the hood edge and the deck edge
  // nose 0.52 H, cowl 0.23 L, belt 0.648 H rising 0.14 to the deck at 0.90 L, roof 0.49-0.66 L, tail 0.74 H
  lines: { nose: 0.746, cowl: 1.065, belt: 0.93, roofF: 2.269, roofR: 3.056, roof: 1.435, deck: 4.17, tail: 1.062 },
  doors: [1.4, 2.65], // the front door's leading edge 0.303 L (machines.ts:1230), the rear door's typical
};

const HATCHBACK = {
  name: 'hatchback (body style)', shape: 'car',
  // machines.ts:1292 STYLE.hatchback: 4.3 x 1.8 x 1.47, wheelbase 2.65, lines cowl 0.3, roof 0.42-0.84, deck 0.97,
  // belt 0.62 H, nose 0.53 H, tail 0.66 H (typical of its body style); tyre 185/65R15 (machines.ts:1303) 0.621;
  // overhangs 45 % / 55 % of L - wheelbase (machines.ts:1305)
  source: 'typical (machines.ts:1292 STYLE.hatchback, drawn by styledCar)',
  length: 4.3, width: 1.8, height: 1.47, wheelbase: 2.65, overhangs: { front: 0.742, rear: 0.908 },
  wheelDiameter: { front: 0.621, rear: 0.621 }, clearance: 0.14, bodyHeight: 1.33,
  cab: 'mid', cabLength: 2.881, bed: null, trailer: null,
  axles: [{ u: 0.742, r: 0.3105, w: 0.185, track: 1.555 }, { u: 3.392, r: 0.3105, w: 0.185, track: 1.555 }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.709, rear: 0.88 },
  lines: { nose: 0.779, cowl: 1.29, belt: 0.911, roofF: 1.806, roofR: 3.612, roof: 1.47, deck: 4.171, tail: 0.97 },
  doors: [1.55, 2.75],
};

const SUV = {
  name: 'SUV (body style, a crossover)', shape: 'car',
  // machines.ts:1293 STYLE.SUV: 4.8 x 1.95 x 1.75, wheelbase 2.85, clearance 0.2, cowl 0.28, roof 0.38-0.90,
  // deck 0.98, belt 0.6 H, nose 0.6 H, tail 0.64 H (typical); tyre 215/70R15 (machines.ts:1303) 0.682. A boxy
  // Jeep-type 4x4 (upright screen, flat hood, 0.8 m tyres, a spare on the tailgate) is not in machines.ts.
  source: 'typical (machines.ts:1293 STYLE.SUV, drawn by styledCar)',
  length: 4.8, width: 1.95, height: 1.75, wheelbase: 2.85, overhangs: { front: 0.878, rear: 1.072 },
  wheelDiameter: { front: 0.682, rear: 0.682 }, clearance: 0.2, bodyHeight: 1.55,
  cab: 'mid', cabLength: 3.36, bed: null, trailer: null,
  axles: [{ u: 0.878, r: 0.341, w: 0.215, track: 1.675 }, { u: 3.728, r: 0.341, w: 0.215, track: 1.675 }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.97, rear: 1.03 },
  lines: { nose: 1.05, cowl: 1.344, belt: 1.05, roofF: 1.824, roofR: 4.32, roof: 1.75, deck: 4.704, tail: 1.12 },
  doors: [1.65, 2.95], roofRails: true,
};

const PICKUP = {
  name: 'pickup, crew cab (body style)', shape: 'pickup',
  // machines.ts:1294-1295 STYLE.pickup: 5.8 x 2.0 x 1.9, wheelbase 3.6, clearance 0.23, cowl 0.27, roof 0.36-0.67,
  // deck 0.71 (the bed starts there: 4.118 m, "its bed behind about 1.7 m long, a 5.5 ft box"), belt 0.6 H, nose
  // 0.62 H (typical); tyre 245/75R15 (machines.ts:1303) 0.749. The bed is 0.5 m deep under its rail at the belt
  // (typical): the file's tail line 0.55 H would leave 0.14 m over the floor (flagged in the figures sheet).
  source: 'typical (machines.ts:1295 STYLE.pickup); bed depth typical, not the file\'s tail line',
  length: 5.8, width: 2.0, height: 1.9, wheelbase: 3.6, overhangs: { front: 0.99, rear: 1.21 },
  wheelDiameter: { front: 0.749, rear: 0.749 }, clearance: 0.23, bodyHeight: 1.67,
  cab: 'mid', cabLength: 2.552, bed: { length: 1.682, height: 0.5, startsAt: 4.118, rail: 1.14 }, trailer: null,
  axles: [{ u: 0.99, r: 0.3745, w: 0.245, track: 1.695 }, { u: 4.59, r: 0.3745, w: 0.245, track: 1.695 }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 1.078, rear: 0.955 },
  lines: { nose: 1.178, cowl: 1.566, belt: 1.14, roofF: 2.088, roofR: 3.886, roof: 1.9, deck: 4.118, tail: 1.14 },
  doors: [1.9, 3.0],
};

const VAN = {
  name: 'van (body style, 8 seats)', shape: 'car',
  // machines.ts:1297 STYLE.van: 5.3 x 2.0 x 2.0, wheelbase 3.3, clearance 0.16, cowl 0.16 (ahead of the front axle:
  // cab-forward), roof 0.24-0.97, deck 0.99, belt 0.52 H, nose 0.52 H, tail 0.6 H (typical); tyre 205/70R15 0.668
  source: 'typical (machines.ts:1297 STYLE.van, drawn by styledCar)',
  length: 5.3, width: 2.0, height: 2.0, wheelbase: 3.3, overhangs: { front: 0.9, rear: 1.1 },
  wheelDiameter: { front: 0.668, rear: 0.668 }, clearance: 0.16, bodyHeight: 1.84,
  cab: 'forward', cabLength: 4.399, bed: null, trailer: null,
  axles: [{ u: 0.9, r: 0.334, w: 0.205, track: 1.735 }, { u: 4.2, r: 0.334, w: 0.205, track: 1.735 }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.95, rear: 1.11 },
  lines: { nose: 1.04, cowl: 0.848, belt: 1.04, roofF: 1.272, roofR: 5.141, roof: 2.0, deck: 5.247, tail: 1.2 },
  doors: [1.9, 3.2, 4.4], pillarEvery: 1.1,
};

/** The Corolla with a roof light: nothing in the project holds a taxi; the sign is typical (0.4 x 0.14 x 0.1 m). */
const TAXI = {
  ...CAR, name: 'taxi: the Corolla with a roof sign', shape: 'car',
  source: 'car published (machines.ts:1222-1231); the roof sign typical, in no project file',
  roofSign: { u: [2.462, 2.862], w: 0.14, h: [1.465, 1.605] }, // 30 mm feet on the roof's flat middle, top 1.605
};

const BUS = {
  name: '12 m low-floor transit bus', shape: 'bus',
  // typical throughout, nothing in machines.ts: 12.0 x 2.55 x 3.3 (roof pods), wheelbase 5.95, front overhang 2.7
  // (the door ahead of the axle), tail 3.35 over the engine; tyres 275/70R22.5 through tyreOf 0.957; floor 0.34
  // (low floor), window sill 1.3, glass to 2.6; doors ahead of the front axle and mid-wheelbase, 1.2 m wide
  source: 'typical throughout (a standard rigid transit bus); none in machines.ts',
  length: 12, width: 2.55, height: 3.3, wheelbase: 5.95, overhangs: { front: 2.7, rear: 3.35 },
  wheelDiameter: { front: 0.957, rear: 0.957 }, clearance: 0.25, bodyHeight: 3.05,
  cab: 'forward', cabLength: 12, bed: null, trailer: null,
  axles: [{ u: 2.7, r: 0.4785, w: 0.275, track: 2.1 }, { u: 8.65, r: 0.4785, w: 0.275, track: 1.85, dual: true }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.8, rear: 1.3 },
  belt: 1.3, glassTop: 2.6, roofTop: 3.05, doors: [0.9, 5.973], doorWidth: 1.2, pillarEvery: 1.5, floor: 0.34,
};

const TRUCK = {
  name: 'medium-duty box truck, 26-ft body', shape: 'truck',
  // typical throughout, nothing in machines.ts (the Cascadia's cab heights, tyres and frame rule are reused):
  // a 7.9 m (26 ft) box 2.44 m wide with its floor at 1.15 m behind a 2.6 m BBC cab (hood 1.2 + cab 1.4, roof
  // 2.6), 3.9 m to the box roof; tyres 11R22.5 (machines.ts:1262) through tyreOf 1.06; the figures sheet's 9.5 m
  // overall does not hold its own 2.75 + 7.9 m box, so the box is kept and the overall follows (10.65 m, as a 26-ft
  // body on a 6.4 m wheelbase is, typical); frame top 0.95 (0.8 of the tyre + the rail, machines.ts:1001)
  source: 'typical throughout (a US Class 6 box truck); the cab and tyre figures after the Cascadia',
  length: 10.65, width: 2.44, height: 3.9, wheelbase: 6.4, overhangs: { front: 1.2, rear: 3.05 },
  wheelDiameter: { front: 1.06, rear: 1.06 }, clearance: 0.3, bodyHeight: 2.75,
  cab: 'forward', cabLength: 2.6, cabHeight: 2.6, hoodLength: 1.2,
  bed: { length: 7.9, height: 2.75, startsAt: 2.75, floor: 1.15 }, trailer: null,
  axles: [{ u: 1.2, r: 0.53, w: 0.3, track: 2.05 }, { u: 7.6, r: 0.53, w: 0.28, track: 1.85, dual: true }],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.95, rear: 1.0 },
};

const SEMI = {
  name: 'Freightliner Cascadia 126 day cab 6x4 with a 53-ft dry van', shape: 'semi',
  // tractor machines.ts:1260-1267 (Freightliner Australia, published): 7.166 long, 2.5 wide, cab 3.03 high, BBC
  // 3.22, wheelbase 4.425 to the tandem's centre, rear axles 1.295 apart, front overhang 1.315; tyres 315/80R22.5
  // (1.076) and 11R22.5 duals (1.06) through tyreOf; hood 1.55 at the nose to 1.95 at the cowl over 1.9 m, grille
  // 0.85, bumper 0.32, stacks to H + 0.4, tanks 0.64 x 1.3 (machines.ts:1041-1055, typical); fifth wheel 6.138 m
  // from the nose at 1.277 (machines.ts:1056). The trailer is typical, none in machines.ts: 53 ft = 16.15 m, 2.6
  // wide, 4.115 high, floor 1.22, kingpin 0.914 behind its nose (so it starts 5.224 m from the tractor's nose), a
  // tandem at 11.6 and 12.85 m behind its nose on 295/75R22.5 (1.014). Five axles a side: an 18-wheeler.
  source: 'tractor published (machines.ts:1260-1267, Freightliner); trailer typical',
  length: 21.374, tractorLength: 7.166, width: 2.6, height: 4.115, wheelbase: 4.425,
  overhangs: { front: 1.315, rear: 3.3 }, wheelDiameter: { front: 1.076, rear: 1.06 }, clearance: 0.25,
  bodyHeight: 2.895, cab: 'forward', cabLength: 3.22, cabHeight: 3.03, hoodLength: 1.9,
  bed: null, trailer: { length: 16.15, height: 4.115, startsAt: 5.224, floor: 1.22, width: 2.6 },
  axles: [
    { u: 1.315, r: 0.538, w: 0.315, track: 2.05 },
    { u: 5.093, r: 0.53, w: 0.28, track: 1.85, dual: true }, { u: 6.388, r: 0.53, w: 0.28, track: 1.85, dual: true },
    { u: 16.824, r: 0.507, w: 0.295, track: 1.85, dual: true },
    { u: 18.074, r: 0.507, w: 0.295, track: 1.85, dual: true },
  ],
  openSeat: false, rollHoop: false, mast: null, roofSign: null, lamps: { front: 1.0, rear: 1.1 },
  hood: { nose: 1.55, cowl: 1.95, floor: 0.6 }, grille: { h: [0.78, 1.63] }, bumper: { h: [0.39, 0.71] },
  stacks: { u: [3.3, 3.43], top: 3.43 }, tanks: { u: [3.6, 4.9], h: [0.53, 1.17] }, frameTop: 0.99,
};

const FORKLIFT = {
  name: 'Toyota 8FGCU25 forklift', shape: 'forklift',
  // machines.ts:1251-1258 (Toyota, published): 2,380 to the fork face, 1,065 wide, mast 2,115 lowered (4,560
  // raised), overhead guard 2,050, wheelbase 1,485, tread 890/915; press-on cushion tyres 21x7x15 and 16x6x10.5
  // (typical of a 5,000 lb truck) through tyreOf 0.533 / 0.406; 42 x 4 x 1.5 in forks (machines.ts:1070), the mast
  // 0.69 wide 0.18 behind the fork face (1061-1064), counterweight 0.36 long to 0.55 H (1057), seat 1.05 (1254),
  // hood to seat - 0.08 (1028), guard posts 0.07 inboard of the tyres (1058): typical
  source: 'published (machines.ts:1251-1258, Toyota); tyres, forks, mast section typical',
  length: 2.38, width: 1.065, height: 2.115, wheelbase: 1.485, overhangs: { front: 0.55, rear: 0.345 },
  wheelDiameter: { front: 0.533, rear: 0.406 }, clearance: 0.1, bodyHeight: 0.87,
  cab: 'none', cabLength: 1.485, bed: null, trailer: null,
  axles: [{ u: 0.55, r: 0.2665, w: 0.178, track: 0.89 }, { u: 2.035, r: 0.203, w: 0.152, track: 0.915 }],
  openSeat: true, rollHoop: false, // an overhead guard of four posts, not a hoop (machines.ts:1058)
  mast: { u: [0.18, 0.28], width: 0.69, height: 2.115 }, forks: { length: 1.067, w: 0.1, t: 0.038, at: 0.12 },
  counterweight: { u: [2.02, 2.38], top: 1.163 }, guard: { top: 2.05, posts: [0.6, 1.95] }, seat: 1.05, hood: 0.97,
  roofSign: null, lamps: { front: null, rear: null }, // none drawn: its extras are mast, guard, counterweight
};

const ATV = {
  name: 'Honda FourTrax Rancher 4x4 (2026)', shape: 'atv',
  // machines.ts:1233-1240 (Honda, published): 82.8 x 47.4 x 46.2 in, clearance 7.1 in, seat 33.6 in; axles at
  // +/-25 in (wheelbase 1.27, approximate), track about 36 in (an estimate from the width); tyres 24x8-12 and
  // 24x10-11 through tyreOf 0.61; fenders to 0.73, racks 0.79, lamps in the fender face 0.67 (typical)
  source: 'published (machines.ts:1233-1240, Honda); wheelbase and track approximate',
  length: 2.103, width: 1.204, height: 1.173, wheelbase: 1.27, overhangs: { front: 0.417, rear: 0.417 },
  wheelDiameter: { front: 0.61, rear: 0.61 }, clearance: 0.18, bodyHeight: 0.55,
  cab: 'none', cabLength: null, bed: null, trailer: null,
  axles: [{ u: 0.417, r: 0.305, w: 0.203, track: 0.914 }, { u: 1.687, r: 0.305, w: 0.254, track: 0.927 }],
  openSeat: true, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.67, rear: 0.75 },
  seat: 0.853, fenderTop: 0.73, rackTop: 0.79, barTop: 1.17,
};

const DIRTBIKE = {
  name: 'Honda CRF450R (2025)', shape: 'bike',
  // machines.ts:1242-1249 (Honda, published): wheelbase 58.3 in, seat 38.0 in, rake 27.3 deg, clearance 13.1 in,
  // rear tyre 120/80-19 (0.675); front 80/100-21 typical of a 21-in motocross front (0.693); 2.183 x 0.827 x 1.27
  // typical of a 450 motocrosser (estimates); bars 0.93 H, tank and shrouds to 0.8 H, a number board 0.2 x 0.26
  // (machines.ts:1036-1037, 1165); 49 mm fork (992); no lights (a motocrosser carries a number board)
  source: 'published wheelbase, seat, rake, rear tyre (machines.ts:1242-1249, Honda); length typical',
  length: 2.183, width: 0.827, height: 1.27, wheelbase: 1.481, overhangs: { front: 0.351, rear: 0.351 },
  wheelDiameter: { front: 0.693, rear: 0.675 }, clearance: 0.333, bodyHeight: 0.632,
  cab: 'none', cabLength: null, bed: null, trailer: null,
  axles: [{ u: 0.351, r: 0.3465, w: 0.08, track: 0 }, { u: 1.832, r: 0.3375, w: 0.12, track: 0 }],
  openSeat: true, rollHoop: false, mast: null, roofSign: null, lamps: { front: null, rear: null },
  seat: 0.965, tankTop: 1.016, barTop: 1.181, rake: 27.3, numberBoard: true, headlamp: null, fender: 0.78,
};

const MOTORCYCLE = {
  name: 'standard road motorcycle, 650-900 cc', shape: 'bike',
  // typical throughout, nothing in machines.ts (its only motorcycle is the CRF450R motocrosser): 2.1 x 0.8 x 1.15,
  // wheelbase 1.45, seat 0.81, clearance 0.14, rake 25 deg; tyres 120/70R17 and 180/55R17 through tyreOf (0.6,
  // 0.63); a round headlamp about 0.95, the tank's top 0.95, tail lamp under the seat's tail 0.8
  source: 'typical throughout (a naked road bike); none in machines.ts',
  length: 2.1, width: 0.8, height: 1.15, wheelbase: 1.45, overhangs: { front: 0.33, rear: 0.32 },
  wheelDiameter: { front: 0.6, rear: 0.63 }, clearance: 0.14, bodyHeight: 0.6,
  cab: 'none', cabLength: null, bed: null, trailer: null,
  axles: [{ u: 0.33, r: 0.3, w: 0.12, track: 0 }, { u: 1.78, r: 0.315, w: 0.18, track: 0 }],
  openSeat: true, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.95, rear: 0.8 },
  seat: 0.81, tankTop: 0.95, barTop: 1.07, rake: 25, numberBoard: false, headlamp: 0.95, fender: 0.7, exhaust: true,
};

const BICYCLE = {
  name: 'hybrid bicycle, 700x28c', shape: 'bicycle',
  // inventory.ts:861-886 (the bicycle as parts): 622 mm bead seat + 700x28c tyre = 0.678 across, a 600 mm bar,
  // about 11 kg; the frame's sizes typical (1.75 long, wheelbase 1.03, saddle 0.98, bars 1.0, bottom bracket 0.27)
  source: 'wheel and bar from inventory.ts:861-886; frame sizes typical; none in machines.ts',
  length: 1.75, width: 0.6, height: 1.0, wheelbase: 1.03, overhangs: { front: 0.36, rear: 0.36 },
  wheelDiameter: { front: 0.678, rear: 0.678 }, clearance: 0.27, bodyHeight: null,
  cab: 'none', cabLength: null, bed: null, trailer: null,
  axles: [{ u: 0.36, r: 0.339, w: 0.028, track: 0 }, { u: 1.39, r: 0.339, w: 0.028, track: 0 }],
  openSeat: true, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.95, rear: 0.85 },
  saddle: 0.98, bars: 1.0, bottomBracket: 0.27,
};

const TRACTOR = {
  name: 'John Deere X350 lawn tractor, 42-in deck', shape: 'tractor',
  // machines.ts:1269-1276: wheelbase 49.4 in, tyres 15x6.00-6 and 20x10-8 (TractorData, John Deere, published)
  // through tyreOf 0.381 / 0.508; 1.75 x 1.2 x 1.1 and clearance 0.08 typical; hood 0.55-0.64 H over the front
  // half (1038), seat 0.78 (1272), fender deck to seat - 0.08 (1028), the 42-in deck 1.19 wide at 0.18 between the
  // axles (1072-1075), lamps in the hood face 0.46 (1049-1052). A farm tractor (rear wheels 1.37, a ROPS hoop) is
  // typical and not held: the word draws what the project holds.
  source: 'published wheelbase and tyres (machines.ts:1269-1276); length, width, height typical',
  length: 1.75, width: 1.2, height: 1.1, wheelbase: 1.255, overhangs: { front: 0.198, rear: 0.297 },
  wheelDiameter: { front: 0.381, rear: 0.508 }, clearance: 0.08, bodyHeight: 0.38,
  cab: 'none', cabLength: null, bed: null, trailer: null,
  axles: [{ u: 0.198, r: 0.1905, w: 0.152, track: 0.78 }, { u: 1.453, r: 0.254, w: 0.254, track: 0.8 }],
  openSeat: true, rollHoop: false, mast: null, roofSign: null, lamps: { front: 0.463, rear: null },
  hood: { foot: 0.32, nose: 0.605, cowl: 0.704, length: 0.675 }, seat: 0.78, fenderDeck: 0.7,
  deck: { u: [0.52, 1.11], width: 1.187, h: [0.1, 0.18] },
};

/** Every kind by its id; hatchback and pickup are rows a word picks within car and truck. */
export const VEHICLES = {
  kart: KART, car: CAR, hatchback: HATCHBACK, pickup: PICKUP, truck: TRUCK, semi: SEMI, suv: SUV, van: VAN, bus: BUS,
  taxi: TAXI, forklift: FORKLIFT, motorcycle: MOTORCYCLE, dirtbike: DIRTBIKE, bicycle: BICYCLE, atv: ATV,
  tractor: TRACTOR,
};

/** The row a kind draws, by the word that named it: 'hatchback' within car, 'pickup' within truck. */
export function vehicleRow(kind, word = '') {
  if (kind === 'car' && /hatch/.test(word)) return VEHICLES.hatchback;
  if (kind === 'truck' && /pick/.test(word)) return VEHICLES.pickup;
  return VEHICLES[kind] ?? VEHICLES.car;
}

// ── Colours ────────────────────────

const TYRE = [0.07, 0.07, 0.075], SIDEWALL = [0.13, 0.13, 0.14], HUB = [0.62, 0.63, 0.66], WELL = [0.05, 0.05, 0.06];
const GLASS = [0.30, 0.40, 0.50], DARK = [0.13, 0.13, 0.14], STEEL = [0.36, 0.37, 0.39], CHROME = [0.76, 0.78, 0.81];
const PLATE = [0.9, 0.9, 0.85], TAIL = [1, 0.14, 0.08], TAIL_OFF = [0.5, 0.08, 0.06], HEAD = [1, 0.97, 0.85];
const HEAD_OFF = [0.72, 0.74, 0.76], SIGN = [0.98, 0.97, 0.9], SEAT = [0.11, 0.11, 0.12], BOX_WHITE = [0.9, 0.9, 0.88];
const JD_GREEN = [0.21, 0.49, 0.17], TOYOTA_ORANGE = [0.85, 0.64, 0.10], CAB_YELLOW = [0.91, 0.76, 0.16];
const GX_RED = [0.72, 0.1, 0.08]; // a Honda GX engine's fuel tank
/** Paintwork an uncoloured vehicle picks from, by the seed: white, silver, black, grey, red, blue, green, orange. */
export const PALETTE = [
  [0.9, 0.9, 0.9], [0.72, 0.74, 0.77], [0.1, 0.1, 0.11], [0.35, 0.36, 0.4], [0.70, 0.12, 0.16], [0.12, 0.31, 0.66],
  [0.18, 0.42, 0.23], [0.88, 0.44, 0.16],
];
/** Kinds with a colour of their own when the words gave none; the rest take the palette. */
const OWN_COLOUR = { taxi: CAB_YELLOW, forklift: TOYOTA_ORANGE, tractor: JD_GREEN };

const scaled = (c, k, out = [0, 0, 0]) => {
  out[0] = c[0] * k;
  out[1] = c[1] * k;
  out[2] = c[2] * k;
  return out;
};

// ── Parts in the vehicle's frame ───
// u from the nose, v across (right positive), h up, all in metres. A prism is a profile polygon in the plane of two
// axes extruded along the third: axis 'v' takes an (u, h) side profile (a body, a cabin, a hood), 'u' a (v, h)
// section, 'h' a plan (u, v) outline (a kart's nose, a counterweight's rounded tail). `paint` is a colour or a
// function (u, v, h, n) of the point and the face's local normal, answering a colour or null to leave the pixel.

const prism = (axis, from, to, profile, paint, flags = {}) =>
  ({ kind: 'prism', axis, from, to, profile, paint, ...flags });
const box = (u0, u1, v0, v1, h0, h1, paint, flags) =>
  prism('v', v0, v1, [[u0, h0], [u1, h0], [u1, h1], [u0, h1]], paint, flags);
const wheel = (u, v, r, w, style = 'tyre') => ({ kind: 'wheel', u, v, r, w, style });
const tube = (a, b, r, colour) => ({ kind: 'tube', a, b, r, colour });
const ring = (axis, u, v, h, r, thick, colour) => ({ kind: 'ring', axis, u, v, h, r, thick, colour });
const discPart = (axis, u, v, h, r, colour, flags = {}) => ({ kind: 'disc', axis, u, v, h, r, colour, ...flags });
/** A lamp on the rear ('rear': looking back along +u) or the front face, w wide and t tall, centred at (v, h). */
const lamp = (which, u, v, h, w, t) => ({ kind: 'lamp', which, u, v, h, w, t });

/** The wheels of a row: one or two a side per axle (duals), none across for a single-track machine. */
function wheels(V, style = 'tyre') {
  const out = [];
  for (const a of V.axles) {
    if (a.track === 0) {
      out.push(wheel(a.u, 0, a.r, a.w, style));
      continue;
    }
    for (const side of [-1, 1]) {
      if (a.dual) {
        out.push(wheel(a.u, side * (a.track / 2 + a.w * 0.55), a.r, a.w, style));
        out.push(wheel(a.u, side * (a.track / 2 - a.w * 0.55), a.r, a.w, style));
      } else out.push(wheel(a.u, side * a.track / 2, a.r, a.w, style));
    }
  }
  return out;
}

const ARCH_GAP = 0.045; // how far the arch clears the tyre, typical
const ARCH_LIP = 0.03; // the well's dark ring reaches this far in over the tyre: the body's plane is outboard of it

/** The arch cut in a side face over each axle: null (transparent) over the tyre drawn before, a dark well round it. */
function arch(V, u, h) {
  for (const a of V.axles) {
    if (a.track === 0) continue;
    const d = Math.hypot(u - a.u, h - a.r);
    if (d < a.r + ARCH_GAP) return d < a.r - ARCH_LIP ? null : WELL;
  }
  return undefined;
}

/** The side of a closed body: arches, a dark sill, shut lines at the doors. */
const bodySide = (V, c, doors = V.doors ?? []) => {
  const sill = scaled(c, 0.72), seam = scaled(c, 0.55);
  return (u, v, h, n) => {
    if (Math.abs(n[1]) > 0.5) {
      const cut = arch(V, u, h);
      if (cut !== undefined) return cut;
      if (h < V.clearance + 0.08) return sill;
      for (const d of doors) if (Math.abs(u - d) < 0.012 && h > V.clearance + 0.2) return seam;
    }
    return c;
  };
};

/** A closed cabin: glass on the screen, the back glass and the sides between pillars; the roof in paintwork. */
function cabinPaint(V, c, glass, { pillars = [], sideGlass = true, rearGlass = true, rearFrom = 0 } = {}) {
  const li = V.lines, every = V.pillarEvery;
  return (u, v, h, n) => {
    if (n[2] > 0.6) return c; // the roof
    if (n[0] < -0.3) return glass; // the windscreen
    if (n[0] > 0.3) return rearGlass && h > rearFrom ? glass : c; // the back glass, or a van's blind tailgate
    if (!sideGlass) return c;
    if (h < Math.min(li.belt, li.tail) + 0.07) return c; // the door tops
    // the A pillar along the windscreen's lean, the C pillar along the back glass's
    const lean = (li.roofF - li.cowl) / Math.max(1e-3, li.roof - li.belt), ua = li.cowl + (h - li.belt) * lean;
    if (u < ua + 0.1) return c;
    const back = (li.deck - li.roofR) / Math.max(1e-3, li.roof - li.tail), uc = li.deck - (h - li.tail) * back;
    if (u > uc - 0.12) return c;
    if (every && (u - li.cowl) % every < 0.1) return c;
    for (const p of pillars) if (Math.abs(u - p) < 0.05) return c;
    return glass;
  };
}

// ── Builders, one per silhouette ───
// Each takes a row, the paintwork colour and the glass colour and answers the parts; the wheels come first.

function carParts(V, c, glass) {
  const li = V.lines, half = V.width / 2, cabHalf = half - 0.09, cl = V.clearance;
  const profile = [[0, cl], [0, li.nose], [li.cowl, li.belt], [li.deck, li.tail], [V.length, li.tail], [V.length, cl]];
  const bodyC = bodySide(V, c);
  const plate = (u, v, h, n) => {
    if (n[0] > 0.5) { // the rear face: a dark valance, the plate
      if (h < cl + 0.17) return DARK;
      if (Math.abs(v) < 0.26 && h > 0.6 && h < 0.72) return PLATE;
    }
    if (n[0] < -0.5) { // the front face: the grille between the lamps, a dark intake
      if (h < cl + 0.17) return DARK;
      if (Math.abs(v) < 0.45 && h > li.nose - 0.2 && h < li.nose - 0.11) return DARK;
      if (Math.abs(v) < 0.6 && h > cl + 0.17 && h < cl + 0.37) return DARK;
    }
    return bodyC(u, v, h, n);
  };
  const parts = [...wheels(V), prism('v', -half, half, profile, plate)];
  const cabin = [[li.cowl, li.belt], [li.roofF, li.roof], [li.roofR, li.roof], [li.deck, li.tail]];
  parts.push(prism('v', -cabHalf, cabHalf, cabin, cabinPaint(V, c, glass, { pillars: [V.doors?.[1] ?? 0] })));
  if (V.roofRails) {
    for (const s of [-1, 1]) parts.push(box(li.roofF + 0.3, li.roofR - 0.2, s * (cabHalf - 0.1), s * (cabHalf - 0.04),
      li.roof, li.roof + 0.05, DARK));
  }
  if (V.roofSign) { // a white roof light with a dark band at its foot, lit at night
    const S = V.roofSign, mid = (S.u[0] + S.u[1]) / 2;
    const sign = (u, v, h) => (h < S.h[0] + 0.03 || Math.abs(u - mid) > (S.u[1] - S.u[0]) / 2 - 0.02 ? DARK : SIGN);
    parts.push(box(S.u[0], S.u[1], -S.w / 2, S.w / 2, S.h[0], S.h[1], sign, { emissive: true }));
  }
  lamps(V, parts, half);
  return parts;
}

/** Tail lamps at the rear corners, headlamps at the front, from the row's lamp heights. */
function lamps(V, parts, half, { w = 0.36, t = 0.12, inset = 0.33 } = {}) {
  for (const s of [-1, 1]) {
    if (V.lamps.rear !== null) parts.push(lamp('rear', V.length, s * (half - inset), V.lamps.rear, w, t));
    if (V.lamps.front !== null) parts.push(lamp('front', 0, s * (half - inset), V.lamps.front, w * 0.9, t * 0.9));
  }
}

function pickupParts(V, c, glass) {
  const li = V.lines, half = V.width / 2, cabHalf = half - 0.09, cl = V.clearance, B = V.bed, uBed = B.startsAt;
  const floor = B.rail - B.height, inner = scaled(c, 0.8);
  const front = [[0, cl], [0, li.nose], [li.cowl, li.belt], [uBed, li.belt], [uBed, cl]];
  const bodyC = bodySide(V, c), bedC = (u, v, h, n) => (n[1] * v < 0 ? inner : bodyC(u, v, h, n));
  const parts = [...wheels(V), prism('v', -half, half, front, bodyC)];
  const cabin = [[li.cowl, li.belt], [li.roofF, li.roof], [li.roofR, li.roof], [uBed, li.belt]];
  parts.push(prism('v', -cabHalf, cabHalf, cabin, cabinPaint(V, c, glass, { pillars: [V.doors[1]], rearFrom: 1.45 })));
  parts.push(box(uBed, V.length - 0.08, -0.7, 0.7, 0.3, floor, DARK)); // the chassis under the bed
  parts.push(box(uBed, V.length, -half + 0.1, half - 0.1, floor, floor + 0.04, inner)); // the bed's floor
  for (const s of [-1, 1]) parts.push(box(uBed, V.length, s * (half - 0.1), s * half, floor, B.rail, bedC)); // walls
  parts.push(box(V.length - 0.08, V.length, -half, half, floor, B.rail, (u, v, h, n) => (n[0] < 0 ? inner : c)));
  lamps(V, parts, half, { w: 0.2, t: 0.3, inset: 0.2 });
  return parts;
}

function busParts(V, c, glass) {
  const half = V.width / 2, cl = V.clearance, skirt = scaled(c, 0.7), seam = scaled(c, 0.5);
  const paint = (u, v, h, n) => {
    if (n[2] > 0.6) return c;
    if (Math.abs(n[1]) > 0.5) { // the side: arches, a skirt, the window row between pillars, two doors
      const cut = arch(V, u, h);
      if (cut !== undefined) return cut;
      for (const d of V.doors) {
        if (u > d && u < d + V.doorWidth && n[1] > 0) { // doors on the right side only (kerbside)
          if (Math.abs(u - d - V.doorWidth / 2) < 0.015) return seam;
          return h > V.belt - 0.3 && h < V.glassTop ? glass : h < V.floor + 0.05 ? skirt : c;
        }
      }
      if (h < 0.6) return skirt;
      if (h > V.belt && h < V.glassTop) return (u - 0.4) % V.pillarEvery < 0.12 ? c : glass;
      return c;
    }
    if (n[0] < -0.5) { // the front: one windscreen, a destination box over it, a dark bumper
      if (h > V.belt - 0.2 && h < V.glassTop && Math.abs(v) < half - 0.12) return glass;
      if (h > V.glassTop + 0.1 && h < V.glassTop + 0.4 && Math.abs(v) < 0.9) return DARK;
      if (h < 0.55) return skirt;
      return c;
    }
    if (h > 1.7 && h < V.glassTop && Math.abs(v) < half - 0.25) return glass; // the rear window
    if (h > 0.6 && h < 1.35 && Math.abs(v) < 0.8) return (h * 12) % 1 < 0.45 ? DARK : seam; // engine louvres
    if (h < 0.55) return skirt;
    return c;
  };
  const parts = [...wheels(V), box(0, V.length, -half, half, cl, V.roofTop, paint)];
  parts.push(box(3, 8, -0.7, 0.7, V.roofTop, V.height, scaled(c, 0.85))); // the roof pods
  lamps(V, parts, half, { w: 0.25, t: 0.4, inset: 0.3 });
  return parts;
}

/** A conventional cab: a hood, the cab's lower box with its doors, the glasshouse over it. */
function cabParts(V, c, glass, { hood, cabH, cabTop, half, grille }) {
  const u0 = hood.length, u1 = V.cabLength, floor = hood.floor;
  const hoodP = [[0, floor], [0, hood.nose], [u0, hood.cowl], [u0, floor]];
  const lower = bodySide(V, c, [u0 + 0.12]);
  const front = (u, v, h, n) => {
    if (n[0] < -0.5 && grille) {
      if (h > grille.h[0] && h < grille.h[1] && Math.abs(v) < 0.75) return (h * 16) % 1 < 0.4 ? DARK : CHROME;
      if (h > grille.bumper[0] && h < grille.bumper[1]) return CHROME;
    }
    return lower(u, v, h, n);
  };
  const house = [[u0, hood.cowl], [u0 + 0.25, cabTop], [u1, cabTop], [u1, hood.cowl]];
  const housePaint = (u, v, h, n) => {
    if (n[2] > 0.6 || n[0] > 0.3) return c;
    if (n[0] < -0.3) return glass;
    return u > u0 + 0.3 && u < u1 - 0.12 && h > hood.cowl + 0.08 && h < cabTop - 0.2 ? glass : c;
  };
  return [
    prism('v', -half + 0.15, half - 0.15, hoodP, front), box(u0, u1, -half, half, floor, cabH, lower),
    prism('v', -half, half, house, housePaint),
  ];
}

function truckParts(V, c, glass, uncoloured) {
  const half = V.width / 2, B = V.bed, boxC = uncoloured ? BOX_WHITE : c, hood = { length: V.hoodLength, nose: 1.35,
    cowl: 1.5, floor: 0.5 };
  const parts = [...wheels(V), ...cabParts(V, c, glass, { hood, cabH: 1.5, cabTop: V.cabHeight, half: half - 0.17 })];
  const slat = scaled(boxC, 0.78), rib = scaled(boxC, 0.9), uEnd = B.startsAt + B.length;
  const boxPaint = (u, v, h, n) => {
    if (n[0] > 0.5 && Math.abs(v) < half - 0.12 && h < B.floor + B.height - 0.2) { // the roll-up door
      return (h - B.floor) % 0.3 < 0.03 ? slat : boxC;
    }
    if (Math.abs(n[1]) > 0.5 && (u - B.startsAt) % 0.6 < 0.025) return rib;
    return boxC;
  };
  parts.push(box(B.startsAt, uEnd, -half, half, B.floor, B.floor + B.height, boxPaint));
  parts.push(box(V.cabLength, uEnd - 0.3, -0.45, 0.45, 0.6, B.floor, DARK)); // the frame
  parts.push(box(uEnd - 0.1, uEnd, -half + 0.15, half - 0.15, 0.45, 0.55, DARK)); // the underride bar on its legs
  for (const s of [-1, 1]) parts.push(box(uEnd - 0.1, uEnd, s * (half - 0.6), s * (half - 0.5), 0.55, B.floor, DARK));
  for (const s of [-1, 1]) parts.push(box(3.0, 4.0, s * (half - 0.55), s * (half - 0.05), 0.55, 1.0, STEEL)); // tanks
  lamps(V, parts, half, { w: 0.3, t: 0.15, inset: 0.25 });
  return parts;
}

function semiParts(V, c, glass, uncoloured) {
  const half = 1.25, T = V.trailer, trailerC = uncoloured ? BOX_WHITE : c, th = T.width / 2;
  const grille = { h: V.grille.h, bumper: V.bumper.h };
  const hood = { length: V.hoodLength, nose: V.hood.nose, cowl: V.hood.cowl, floor: V.hood.floor };
  const cab = cabParts(V, c, glass, { hood, cabH: V.hood.cowl, cabTop: V.cabHeight, half, grille });
  const parts = [...wheels(V), ...cab];
  for (const s of [-1, 1]) {
    parts.push(box(V.stacks.u[0], V.stacks.u[1], s * 0.85, s * 0.98, 1.0, V.stacks.top, CHROME)); // the stacks
    parts.push(box(V.tanks.u[0], V.tanks.u[1], s * 0.61, s * half, V.tanks.h[0], V.tanks.h[1], CHROME)); // the tanks
    parts.push(box(8.2, 8.4, s * 0.4, s * 0.5, 0.3, T.floor, DARK)); // the landing gear
    parts.push(box(18.6, 18.65, s * 0.65, s * 1.25, 0.3, 0.9, DARK)); // mud flaps
  }
  parts.push(box(1.3, V.tractorLength - 0.2, -0.45, 0.45, 0.7, V.frameTop, DARK)); // the frame rails
  const seam = scaled(trailerC, 0.5), rib = scaled(trailerC, 0.92), uEnd = T.startsAt + T.length;
  const trailerPaint = (u, v, h, n) => {
    if (n[0] > 0.5) { // swing doors: a seam down the middle, lock bars across
      if (Math.abs(v) < 0.02) return seam;
      if ((h - T.floor) % 0.9 < 0.04 && h > T.floor + 0.5) return seam;
      return trailerC;
    }
    if (Math.abs(n[1]) > 0.5 && (u - T.startsAt) % 0.6 < 0.03) return rib;
    return trailerC;
  };
  parts.push(box(T.startsAt, uEnd, -th, th, T.floor, T.height, trailerPaint));
  parts.push(box(uEnd - 0.12, uEnd, -th + 0.2, th - 0.2, 0.5, 0.6, DARK)); // the underride guard on its legs
  for (const s of [-1, 1]) parts.push(box(uEnd - 0.12, uEnd, s * (th - 0.7), s * (th - 0.6), 0.6, T.floor, DARK));
  for (const s of [-1, 1]) {
    parts.push(lamp('front', 0, s * 0.74, V.lamps.front, 0.38, 0.18));
    parts.push(lamp('rear', uEnd, s * (th - 0.25), V.lamps.rear, 0.3, 0.15));
  }
  return parts;
}

function forkliftParts(V, c) {
  const M = V.mast, F = V.forks, C = V.counterweight, G = V.guard, hw = M.width / 2, parts = wheels(V);
  for (const s of [-1, 1]) {
    parts.push(box(M.u[0], M.u[1], s * (hw - 0.1), s * hw, 0.1, M.height, DARK)); // the mast's uprights
    parts.push(box(-F.length, 0.05, s * 0.25, s * 0.35, F.at, F.at + F.t, STEEL)); // the forks
    for (const u of G.posts) parts.push(box(u, u + 0.06, s * 0.43, s * 0.49, u < 1 ? 0.42 : C.top, G.top, DARK));
  }
  parts.push(box(M.u[0], M.u[1], -hw, hw, 1.95, 2.05, DARK), box(M.u[0], M.u[1], -hw, hw, 0.4, 0.5, DARK)); // crossbars
  parts.push(box(0.22, 0.3, -0.04, 0.04, 0.3, 2.0, STEEL)); // the lift cylinder
  parts.push(box(0.05, 0.15, -0.45, 0.45, F.at, 0.52, DARK)); // the carriage
  const grid = (u, v, h) => ((v + 0.45) % 0.15 < 0.03 || (h - 0.52) % 0.38 < 0.03 ? DARK : null); // load backrest
  parts.push(box(0.05, 0.1, -0.45, 0.45, 0.52, 1.32, grid));
  parts.push(box(0.3, C.u[0], -0.5, 0.5, 0.35, V.hood, c)); // the hood over the engine
  parts.push(box(0.3, V.length, -0.53, 0.53, 0.3, 0.42, c)); // the floor plate
  const tail = [[C.u[0], -0.51], [C.u[0] + 0.26, -0.5], [V.length, -0.32], [V.length, 0.32], [C.u[0] + 0.26, 0.5],
    [C.u[0], 0.51]];
  parts.push(prism('h', 0.3, C.top, tail, scaled(c, 0.8))); // the cast counterweight, its tail rounded
  parts.push(box(1.1, 1.5, -0.25, 0.25, V.seat, V.seat + 0.07, SEAT)); // the pan seat and its back
  parts.push(box(1.45, 1.55, -0.25, 0.25, V.seat + 0.07, 1.55, SEAT));
  parts.push(tube([0.6, 0, 1.05], [0.75, 0, 1.35], 0.03, DARK), ring('u', 0.72, 0, 1.4, 0.17, 0.03, DARK));
  const grating = (u) => ((u - 0.55) % 0.2 < 0.04 ? DARK : null); // the guard's roof bars across, see-through
  parts.push(box(0.55, 2.0, -0.44, 0.44, G.top - 0.05, G.top, grating));
  for (const s of [-1, 1]) parts.push(box(0.55, 2.0, s * 0.44, s * 0.5, G.top - 0.05, G.top, DARK)); // its side rails
  return parts;
}

function atvParts(V, c) {
  const parts = wheels(V), top = V.fenderTop;
  const fender = (u0, u1) => [[u0, 0.55], [u0 + 0.05, top], [u1 - 0.05, top], [u1, 0.55]];
  const bars = (u, v) => ((v + 0.5) % 0.14 < 0.03 || (u + 0.1) % 0.18 < 0.03 ? DARK : null);
  parts.push(prism('v', -0.6, 0.6, fender(0.05, 0.8), c), prism('v', -0.6, 0.6, fender(1.3, 2.1), c));
  parts.push(box(0.1, 0.65, -0.45, 0.45, V.fenderTop + 0.03, V.rackTop, bars)); // the front rack
  parts.push(box(1.4, 2.0, -0.5, 0.5, V.fenderTop + 0.03, V.rackTop, bars)); // the rear rack
  parts.push(prism('v', -0.22, 0.22, [[0.75, 0.6], [0.78, 0.95], [1.0, 0.95], [1.05, V.seat]], c)); // the tank
  parts.push(prism('v', -0.2, 0.2, [[1.0, 0.75], [1.0, V.seat], [1.7, V.seat], [1.75, 0.75]], SEAT)); // the saddle
  parts.push(box(0.85, 1.35, -0.25, 0.25, 0.33, 0.6, DARK)); // the engine
  for (const s of [-1, 1]) parts.push(box(0.75, 1.45, s * 0.3, s * 0.52, 0.3, 0.34, DARK)); // footboards
  parts.push(box(0.62, 0.7, -0.05, 0.05, 0.9, 1.12, DARK), box(0.62, 0.66, -0.4, 0.4, 1.12, V.barTop, DARK)); // bars
  for (const s of [-1, 1]) parts.push(lamp('front', 0.05, s * 0.3, V.lamps.front, 0.14, 0.1));
  parts.push(lamp('rear', 2.1, 0, V.lamps.rear, 0.2, 0.08));
  return parts;
}

/** A motorcycle: two wheels, a fork at the rake, an engine, a tank, a seat, fenders, bars; no body. */
function bikeParts(V, c) {
  const [f, r] = V.axles, rake = Math.tan(V.rake * Math.PI / 180), parts = wheels(V);
  const top = V.tankTop + 0.03, uClamp = f.u + (top - f.r) * rake;
  for (const s of [-1, 1]) { // the fork's two tubes, leaning back by the rake
    parts.push(prism('v', s * 0.08 - 0.025, s * 0.08 + 0.025,
      [[f.u - 0.025, f.r], [f.u + 0.025, f.r], [uClamp + 0.025, top], [uClamp - 0.025, top]], STEEL));
    parts.push(prism('v', s * 0.09 - 0.03, s * 0.09 + 0.03, // the swingarm from under the seat to the rear axle
      [[r.u - 0.6, 0.45], [r.u - 0.55, 0.52], [r.u + 0.03, r.r + 0.03], [r.u, r.r - 0.03]], DARK));
  }
  parts.push(box(f.u + 0.5, f.u + 0.9, -0.15, 0.15, V.clearance + 0.05, 0.75, DARK)); // the engine
  const tank = [[f.u + 0.4, 0.75], [f.u + 0.45, V.tankTop], [f.u + 0.8, V.tankTop], [f.u + 0.95, 0.9],
    [f.u + 0.95, 0.75]];
  parts.push(prism('v', -0.2, 0.2, tank, c)); // the tank and its shrouds
  parts.push(prism('v', -0.12, 0.12, [[f.u + 0.8, V.seat - 0.07], [f.u + 0.8, V.seat], [r.u + 0.06, V.seat],
    [r.u + 0.1, V.seat - 0.07]], SEAT));
  parts.push(prism('v', -0.1, 0.1, [[r.u - 0.15, V.seat - 0.05], [r.u - 0.1, V.seat + 0.01], [V.length, V.seat + 0.13],
    [V.length, V.seat + 0.07]], c)); // the rear fender's kick
  parts.push(prism('v', -0.1, 0.1, [[f.u - 0.2, V.fender - 0.08], [f.u - 0.1, V.fender], [f.u + 0.25, V.fender],
    [f.u + 0.25, V.fender - 0.06]], c)); // the front fender
  parts.push(box(uClamp - 0.02, uClamp + 0.02, -V.width / 2, V.width / 2, V.barTop - 0.03, V.barTop, DARK)); // bars
  if (V.numberBoard) parts.push(box(uClamp - 0.02, uClamp + 0.02, -0.1, 0.1, top - 0.1, top + 0.16, PLATE));
  if (V.headlamp) parts.push(discPart('u', uClamp - 0.06, 0, V.headlamp, 0.09, HEAD, { lampLike: 'front' }));
  if (V.exhaust) parts.push(box(f.u + 0.7, r.u + 0.2, 0.12, 0.22, 0.38, 0.5, CHROME));
  for (const s of [-1, 1]) parts.push(box(f.u + 0.85, f.u + 0.93, s * 0.15, s * 0.22, 0.37, 0.4, DARK)); // footpegs
  if (V.lamps.rear !== null) parts.push(lamp('rear', V.length, 0, V.lamps.rear, 0.1, 0.06));
  return parts;
}

/** A bicycle: a diamond frame of tubes between two spoked wheels, a saddle, bars, a chainring. */
function bicycleParts(V, c) {
  const [f, r] = V.axles, bb = [0.95, 0, V.bottomBracket], htLow = [0.52, 0, 0.72], htTop = [0.46, 0, 0.92];
  const stTop = [1.15, 0, 0.88], post = [1.18, 0, V.saddle - 0.02], stem = [0.44, 0, V.bars];
  const parts = wheels(V, 'spoked'), fr = (a, b, rr = 0.014) => tube(a, b, rr, c);
  parts.push(fr(htLow, bb), fr(htTop, stTop), fr(stTop, bb), fr(htLow, htTop, 0.018));
  parts.push(fr(htLow, [f.u, 0, f.r], 0.012), fr(bb, [r.u, 0, r.r], 0.01), fr(stTop, [r.u, 0, r.r], 0.01));
  parts.push(tube(stTop, post, 0.014, STEEL), tube(htTop, stem, 0.012, STEEL));
  parts.push(tube([0.44, -0.3, V.bars], [0.44, 0.3, V.bars], 0.012, DARK)); // the bars
  parts.push(box(1.08, 1.35, -0.07, 0.07, V.saddle - 0.03, V.saddle + 0.01, SEAT)); // the saddle
  parts.push(discPart('v', bb[0], 0.06, bb[2], 0.1, DARK)); // the chainring
  return parts;
}

function kartParts(V, c) {
  const P = V.pods, E = V.engine, N = V.nose, B = V.bumper, half = V.width / 2, parts = wheels(V);
  for (const s of [-1, 1]) {
    parts.push(box(0.5, 1.5, s * 0.28, s * 0.32, V.clearance, V.clearance + 0.032, STEEL)); // the frame rails
    parts.push(box(P.u[0], P.u[1], s * P.v[0], s * P.v[1], P.h[0], P.h[1], c)); // the side pods
  }
  parts.push(box(0.5, 1.1, -0.3, 0.3, V.clearance + 0.032, V.clearance + 0.04, DARK)); // the floor pan
  const nose = [[0.45, -0.5], [0.12, -0.45], [0, -0.25], [0, 0.25], [0.12, 0.45], [0.45, 0.5]];
  parts.push(prism('h', N.h[0], N.h[1], nose, c)); // the nose cone, in plan
  parts.push(box(B.u[0], B.u[1], -half, half, B.h[0], B.h[1], c)); // the rear bumper across both rear wheels
  const back = [[1.22, 0.14], [1.3, 0.14], [1.44, V.seatBack], [1.36, V.seatBack]]; // the shell's back, leaning
  parts.push(box(1.0, 1.32, -0.38, 0.02, 0.08, 0.16, SEAT)); // the seat's cushion, offset left (machines.ts:1281)
  parts.push(prism('v', -0.38, 0.02, back, SEAT));
  for (const s of [-0.38, -0.04]) parts.push(prism('v', s, s + 0.06, [[1.0, 0.16], [1.3, 0.16], [1.36, 0.34],
    [1.0, 0.3]], SEAT)); // its side bolsters
  parts.push(tube([0.45, -0.18, 0.25], [0.7, -0.18, 0.5], 0.015, STEEL)); // the steering column and wheel
  parts.push(ring('u', 0.72, -0.18, 0.55, 0.13, 0.03, DARK));
  // the GX270 at the rear right: a dark block, its red fuel tank on top, the silver recoil cover on its outer side
  parts.push(box(E.u[0], E.u[1], E.v[0], E.v[1], E.h[0], E.h[1] - 0.12, DARK));
  parts.push(box(E.u[0] + 0.03, E.u[1] - 0.1, E.v[0] + 0.04, E.v[1] - 0.04, E.h[1] - 0.12, E.h[1], GX_RED));
  parts.push(discPart('v', (E.u[0] + E.u[1]) / 2, E.v[1] + 0.005, E.h[0] + 0.16, 0.1, CHROME));
  return parts;
}

function tractorParts(V, c) {
  const H = V.hood, D = V.deck, parts = wheels(V), deckC = scaled(c, 0.85);
  parts.push(prism('v', -0.25, 0.25, [[0, H.foot], [0, H.nose], [H.length, H.cowl], [H.length, H.foot]], c)); // hood
  parts.push(box(H.length, H.length + 0.08, -0.25, 0.25, H.foot, 0.75, c)); // the dash
  parts.push(box(H.length, 1.3, -0.4, 0.4, 0.25, H.foot, DARK)); // the frame and footboards
  parts.push(box(1.0, V.length, -0.6, 0.6, V.fenderDeck - 0.1, V.fenderDeck, c)); // the fender deck over the rear
  parts.push(box(1.0, V.length, -0.27, 0.27, 0.25, V.fenderDeck - 0.1, c)); // the body between the rear wheels
  parts.push(box(1.2, 1.55, -0.22, 0.22, V.seat, V.seat + 0.06, SEAT)); // the pan seat and its back
  parts.push(box(1.5, 1.57, -0.22, 0.22, V.seat + 0.06, 1.1, SEAT));
  parts.push(tube([0.72, 0, 0.7], [0.84, 0, 0.9], 0.02, DARK), ring('u', 0.85, 0, 0.92, 0.17, 0.03, DARK));
  parts.push(box(D.u[0], D.u[1], -D.width / 2, D.width / 2, D.h[0], D.h[1], deckC)); // the mower deck
  for (const s of [-1, 1]) parts.push(lamp('front', 0, s * 0.15, V.lamps.front, 0.1, 0.06));
  return parts;
}

const BUILDERS = {
  car: carParts, pickup: pickupParts, bus: busParts, truck: truckParts, semi: semiParts, forklift: forkliftParts,
  atv: atvParts, bike: bikeParts, bicycle: bicycleParts, kart: kartParts, tractor: tractorParts,
};

/** The parts of a row, in the vehicle's frame: exported so a test can count wheels and axles without painting. */
export function vehicleParts(V, colour, glass = GLASS, uncoloured = false) {
  return BUILDERS[V.shape](V, colour, glass, uncoloured);
}

// ── Standing the parts in the world ──

const NEAR = 0.6; // metres: a face nearer the lens than this is cut off at it, not projected through the camera
const AMBIENT_LAMPS = 0.46; // lamps light when L.ambient x gloom falls under this: dusk, dawn, night, a storm
const CIRCLE = 24; // sides of a drawn circle at most

const YAW = 12 * Math.PI / 180; // a vehicle on the road turns this much toward its near side: a rear three-quarter view
const HEADING = { away: 0, toward: Math.PI, side: -Math.PI / 2 }; // the nose's bearing from the lens axis, clockwise

/**
 * The frame's transforms: local (u from the nose, v right, h up) to world [x, z, h] for a nose bearing `theta` (0
 * down the road away from the viewer, pi toward, -pi/2 to the left), and back, and the normal's. x = xm + d sin +
 * w cos, z = zm + d cos - w sin, with d metres ahead of the centre and w to the right.
 */
function frameOf(theta, xm, zm, L, S) {
  const half = L / 2, sin = Math.sin(theta), cos = Math.cos(theta);
  return {
    to: (u, v, h) => {
      const d = (half - u) * S, w = v * S;
      return [xm + d * sin + w * cos, zm + d * cos - w * sin, h * S];
    },
    back: (x, z, h) => {
      const dx = x - xm, dz = z - zm;
      return [half - (dx * sin + dz * cos) / S, (dx * cos - dz * sin) / S, h / S];
    },
    normal: (n) => [-n[0] * sin + n[1] * cos, -n[0] * cos - n[1] * sin, n[2]],
  };
}

/** A polygon of world points [x, z, h] cut at the near plane z = NEAR (Sutherland-Hodgman against one plane). */
function clipNear(pts) {
  if (pts.every((p) => p[1] >= NEAR)) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[1] >= NEAR, bin = b[1] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, NEAR, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return out;
}

/** A segment of world points cut at the near plane, or null when it lies wholly nearer than it. */
function clipSegment(a, b) {
  if (a[1] < NEAR && b[1] < NEAR) return null;
  if (a[1] >= NEAR && b[1] >= NEAR) return [a, b];
  const t = (NEAR - a[1]) / (b[1] - a[1]), m = [a[0] + (b[0] - a[0]) * t, NEAR, a[2] + (b[2] - a[2]) * t];
  return a[1] >= NEAR ? [a, m] : [m, b];
}

/** The faces of a prism in the local frame: two caps and a band per profile edge, each with its outward normal. */
function prismFaces(p) {
  const { axis, from, to } = p, pts = [];
  for (const q of p.profile) { // drop repeated corners (a profile whose deck and tail coincide)
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last[0] - q[0]) > 1e-6 || Math.abs(last[1] - q[1]) > 1e-6) pts.push(q);
  }
  if (pts.length > 2 && Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-6 &&
    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
  if (pts.length < 3) return [];
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sgn = area >= 0 ? 1 : -1;
  const local = axis === 'v' ? (a, b, c) => [a, c, b] : axis === 'u' ? (a, b, c) => [c, a, b] : (a, b, c) => [a, b, c];
  const faces = [
    { pts: pts.map(([a, b]) => local(a, b, from)), n: local(0, 0, -1) },
    { pts: pts.map(([a, b]) => local(a, b, to)), n: local(0, 0, 1) },
  ];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dp = b[0] - a[0], dq = b[1] - a[1], len = Math.hypot(dp, dq);
    if (len < 1e-9) continue;
    faces.push({
      pts: [local(a[0], a[1], from), local(b[0], b[1], from), local(b[0], b[1], to), local(a[0], a[1], to)],
      n: local(sgn * dq / len, -sgn * dp / len, 0),
    });
  }
  return faces;
}

/** Points on a circle of radius r about (u, v, h), its axis along u or v, n of them. */
function circle(axis, u, v, h, r, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t) * r, s = Math.sin(t) * r;
    out.push(axis === 'u' ? [u, v + c, h + s] : [u + c, v, h + s]);
  }
  return out;
}

/**
 * Draws a vehicle of `kind` for an instance: at inst.xm/zm with inst.heading when placement gave them, else on the
 * road's near lane heading away (right-hand traffic) or side-on at inst.ux; coloured by inst.colour or the seeded
 * palette; sized by inst.size. Throws its shadow first. Answers its box in pixels for the layout.
 */
export function drawVehicle(ctx, inst, kind) {
  const { W, H, hy, L, gloom, scene, rand, lit, camera } = ctx, { focal, eye } = camera;
  const word = inst.instance?.word ?? inst.word ?? scene.instances?.find((i) => i.kind === KEY[kind])?.word ?? '';
  const V = vehicleRow(kind, word), S = inst.size ?? 1, len = V.length * S;
  const heading = inst.heading ?? (scene.road ? 'away' : 'side');
  const zm = inst.zm ?? Math.min(ctx.groundZ(inst.fy), 400), s = focal / zm;
  let xm = inst.xm;
  if (xm === undefined) {
    if (scene.road && heading !== 'side') { // on the road, in its lane: away in the right lane, toward in the left
      xm = (heading === 'toward' ? -1 : 1) * SIZES.lane / 2 + (rand() - 0.5) * 0.6;
    } else {
      const across = (heading === 'side' ? len : V.width * S) * s, ux = inst.ux ?? 0.5;
      xm = (clamp(ux * W, across * 0.55, W - across * 0.55) - W / 2) / s;
    }
  }
  const pick = PALETTE[Math.floor(rand() * PALETTE.length)], own = OWN_COLOUR[kind];
  const uncoloured = !inst.colour, colour = inst.colour ?? own ?? pick;
  const glass = mix(GLASS, L.horizon, 0.35), dim = L.ambient * gloom < AMBIENT_LAMPS;
  const fy = inst.fy ?? ctx.project(xm, zm).y;
  // On the road a vehicle turns a little toward its near side (away: the nose toward the road's middle; toward: away
  // from it), so the rear or the front view is a three-quarter one and its flank, wheels and cab are seen.
  const side = Math.sign(xm) || 1, turn = heading === 'side' ? 0 : -side * YAW; // either way: the near flank shows
  const theta = (HEADING[heading] ?? 0) + (inst.yaw ?? turn);
  if (fy >= hy) { // no shadow for a thing on the far bank (its ground is out of frame)
    const sn = Math.abs(Math.sin(theta)), cs = Math.abs(Math.cos(theta)), wd = V.width * S;
    ctx.shadow(xm, zm, { w: len * sn + wd * cs, d: len * cs + wd * sn }, V.height * S);
  }
  const F = frameOf(theta, xm, zm, V.length, S), parts = vehicleParts(V, colour, glass, uncoloured);
  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const seen = (p) => {
    if (p.x < bounds.x0) bounds.x0 = p.x;
    if (p.x > bounds.x1) bounds.x1 = p.x;
    if (p.y < bounds.y0) bounds.y0 = p.y;
    if (p.y > bounds.y1) bounds.y1 = p.y;
  };
  const project = (w) => {
    const p = ctx.project(w[0], w[1], w[2]);
    seen(p);
    return p;
  };
  const flat = (world) => {
    const out = [];
    for (const w of clipNear(world)) {
      const p = project(w);
      out.push(p.x, p.y);
    }
    return out;
  };
  const dir = ctx.sun.dir, out = [0, 0, 0];
  const lightOn = (nw) => clamp(0.45 + 0.55 * (nw[0] * dir[0] + nw[2] * dir[1] + nw[1] * dir[2]), 0.3, 1);
  const facing = (nw, world) => { // does a face with world normal nw at a point look at the camera?
    let cx = 0, cz = 0, ch = 0;
    for (const w of world) {
      cx += w[0];
      cz += w[1];
      ch += w[2];
    }
    const k = 1 / world.length;
    return nw[0] * (0 - cx * k) + nw[1] * (0 - cz * k) + nw[2] * (eye - ch * k) > 0;
  };
  const shadeOf = (paint, k, nw, p0, nLocal, emissive) => { // a face's colour per pixel, by unprojecting onto its plane
    if (typeof paint !== 'function') return emissive && dim ? paint : lit(paint, k);
    const nd = nw[0] * p0[0] + nw[1] * p0[1] + nw[2] * (p0[2] - eye);
    return (px, py) => {
      const dx = (px - W / 2) / focal, dh = (hy - py) / focal, den = nw[0] * dx + nw[2] * dh + nw[1];
      if (Math.abs(den) < 1e-9) return null;
      const t = nd / den, l = F.back(t * dx, t, eye + t * dh), c = paint(l[0], l[1], l[2], nLocal);
      if (!c) return null;
      return emissive && dim ? c : lit(c, k, out);
    };
  };
  const tyre = lit(TYRE, 0.55);
  const drawWheel = (wh) => {
    const rp = wh.r * S * focal / zm, n = Math.max(10, Math.min(CIRCLE, Math.round(rp / 2)));
    const rims = [-1, 1].map((side) => circle('v', wh.u, wh.v + side * wh.w / 2, wh.r, wh.r, n).map((q) => F.to(...q)));
    const all = [];
    for (const rim of rims) all.push(...flat(rim));
    if (all.length < 6) return;
    if (wh.style === 'spoked') { // a bicycle's: a stroked tyre, eight spokes, a small hub
      const pts = flat(rims[0]), width = Math.max(1, wh.w * S * focal / zm), c = lit(SIDEWALL, 0.6);
      for (let i = 0; i < pts.length; i += 2) {
        const j = (i + 2) % pts.length;
        ctx.line(pts[i], pts[i + 1], pts[j], pts[j + 1], width, c);
      }
      const hub = project(F.to(wh.u, wh.v, wh.r)), spoke = lit(STEEL, 0.9);
      for (let i = 0; i < pts.length; i += Math.max(2, Math.floor(pts.length / 8))) {
        ctx.line(hub.x, hub.y, pts[i], pts[i + 1], Math.max(0.6, width * 0.3), spoke, 0.8);
      }
      ctx.disc(hub.x, hub.y, Math.max(1, rp * 0.08), c);
      return;
    }
    ctx.poly(hull(all), tyre); // the tyre's silhouette from any angle: the hull of both sidewalls
    for (const [i, side] of [-1, 1].entries()) { // the sidewall that looks at the camera, and its hub
      const nw = F.normal([0, side, 0]);
      if (!facing(nw, rims[i])) continue;
      const k = lightOn(nw);
      ctx.poly(flat(rims[i]), lit(SIDEWALL, k));
      const hub = circle('v', wh.u, wh.v + side * wh.w / 2, wh.r, wh.r * 0.56, n).map((q) => F.to(...q));
      ctx.poly(flat(hub), lit(HUB, k));
    }
  };
  const drawPrism = (p) => {
    for (const face of prismFaces(p)) {
      const world = face.pts.map((q) => F.to(...q)), nw = F.normal(face.n);
      if (!facing(nw, world)) continue;
      const pts = flat(world);
      if (pts.length < 6) continue;
      ctx.poly(pts, shadeOf(p.paint, lightOn(nw), nw, world[0], face.n, p.emissive));
    }
  };
  const drawLamp = (lp) => {
    const nLocal = lp.which === 'rear' ? [1, 0, 0] : [-1, 0, 0], du = lp.which === 'rear' ? 0.012 : -0.012;
    const hw = lp.w / 2, ht = lp.t / 2;
    const q = [[lp.v - hw, lp.h - ht], [lp.v + hw, lp.h - ht], [lp.v + hw, lp.h + ht], [lp.v - hw, lp.h + ht]]
      .map(([v, h]) => F.to(lp.u + du, v, h));
    const nw = F.normal(nLocal);
    if (!facing(nw, q)) return;
    const pts = flat(q);
    if (pts.length < 6) return;
    const on = lp.which === 'rear' ? TAIL : HEAD, off = lp.which === 'rear' ? TAIL_OFF : HEAD_OFF;
    ctx.poly(pts, dim ? on : lit(off, lightOn(nw)));
    if (dim) { // a glow round a lit lamp
      const c = project(F.to(lp.u + du, lp.v, lp.h)), r = Math.max(2, lp.t * 2.2 * S * focal / zm);
      ctx.disc(c.x, c.y, r, on, 0.3, r);
    }
  };
  const drawTube = (t) => {
    const seg = clipSegment(F.to(...t.a), F.to(...t.b));
    if (!seg) return;
    const a = project(seg[0]), b = project(seg[1]), mid = (seg[0][1] + seg[1][1]) / 2;
    ctx.line(a.x, a.y, b.x, b.y, Math.max(0.8, 2 * t.r * S * focal / mid), lit(t.colour, 0.65));
  };
  const drawRing = (rg) => {
    const rp = rg.r * S * focal / zm, n = Math.max(10, Math.min(CIRCLE, Math.round(rp / 2)));
    const pts = flat(circle(rg.axis, rg.u, rg.v, rg.h, rg.r, n).map((q) => F.to(...q)));
    if (pts.length < 6) return;
    const width = Math.max(0.8, rg.thick * S * focal / zm), c = lit(rg.colour, 0.6);
    for (let i = 0; i < pts.length; i += 2) {
      const j = (i + 2) % pts.length;
      ctx.line(pts[i], pts[i + 1], pts[j], pts[j + 1], width, c);
    }
  };
  const drawDisc = (d) => {
    const rp = d.r * S * focal / zm, n = Math.max(8, Math.min(CIRCLE, Math.round(rp / 2)));
    const world = circle(d.axis, d.u, d.v, d.h, d.r, n).map((q) => F.to(...q)), pts = flat(world);
    if (pts.length < 6) return;
    const nw = F.normal(d.axis === 'u' ? [-1, 0, 0] : [0, 1, 0]), toward = facing(nw, world);
    const lampOn = d.lampLike && dim && (d.lampLike === 'front') === toward;
    ctx.poly(pts, lampOn ? HEAD : lit(d.colour === HEAD ? HEAD_OFF : d.colour, 0.6));
  };
  // Wheels first (the body's arches are transparent over them), then the parts far to near by their farthest
  // corner (a cabin on a body, a trailer behind a cab, a counterweight behind a mast), then the lamps.
  const farthest = (p) => {
    let far = 0;
    const take = (q) => {
      const w = F.to(...q), d = w[0] * w[0] + w[1] * w[1];
      if (d > far) far = d;
    };
    if (p.kind === 'prism') for (const f of prismFaces(p).slice(0, 2)) f.pts.forEach(take);
    else if (p.kind === 'tube') [p.a, p.b].forEach(take);
    else take([p.u, p.v, p.h ?? p.r]);
    return far;
  };
  const wheelsFar = parts.filter((p) => p.kind === 'wheel').map((p) => ({ p, far: farthest(p) }));
  wheelsFar.sort((a, b) => b.far - a.far); // the far wheels first: a near tyre covers the far hub behind it
  for (const { p } of wheelsFar) drawWheel(p);
  const solid = parts.filter((p) => p.kind !== 'wheel' && p.kind !== 'lamp').map((p) => ({ p, far: farthest(p) }));
  solid.sort((a, b) => b.far - a.far);
  for (const { p } of solid) {
    if (p.kind === 'prism') drawPrism(p);
    else if (p.kind === 'tube') drawTube(p);
    else if (p.kind === 'ring') drawRing(p);
    else if (p.kind === 'disc') drawDisc(p);
  }
  for (const p of parts) if (p.kind === 'lamp') drawLamp(p);
  if (!Number.isFinite(bounds.x0)) return { x: W / 2 + xm * s, y: fy, w: 1, h: 1 };
  return { x: bounds.x0, y: bounds.y0, w: Math.max(1, bounds.x1 - bounds.x0), h: Math.max(1, bounds.y1 - bounds.y0) };
}

// ── The registry entries ───────────

/** The key of each kind in scene.things: the plural, as the six built-ins' are (trees, houses, cars). */
const KEY = {
  kart: 'karts', car: 'cars', truck: 'trucks', semi: 'semis', suv: 'suvs', van: 'vans', bus: 'buses', taxi: 'taxis',
  forklift: 'forklifts', motorcycle: 'motorcycles', dirtbike: 'dirtbikes', bicycle: 'bicycles', atv: 'atvs',
  tractor: 'tractors',
};

/** The words each kind is read by (the reader tries every entry's match on each token). */
export const VEHICLE_WORDS = {
  kart: /^(karts?|go-?karts?|gokarts?|karting|buggy|buggies)$/,
  car: /^(cars?|sedans?|saloons?|hatchbacks?|automobiles?|coupes?|convertibles?|vehicles?)$/,
  truck: /^(trucks?|pickups?|pick-?ups?|lorry|lorries|pickup-trucks?)$/,
  semi: /^(semis?|semi-trucks?|semi-trailers?|trailers?|18-wheelers?|eighteen-wheelers?|rigs?|big-rigs?)$/,
  suv: /^(jeeps?|suvs?|4x4s?|4wd|crossovers?|land-rovers?)$/,
  van: /^(vans?|minivans?|minibus|minibuses|campervans?)$/,
  bus: /^(bus|buses|busses|coach|coaches|school-bus)$/,
  taxi: /^(taxis?|taxicabs?|cabs?)$/,
  forklift: /^(forklifts?|fork-?lifts?|forktrucks?|fork-trucks?)$/,
  motorcycle: /^(motorcycles?|motorbikes?|motor-?bikes?|choppers?)$/,
  dirtbike: /^(dirt-?bikes?|dirtbikes?|motocross|enduro)$/,
  bicycle: /^(bicycles?|bikes?|cycling|cyclists?|push-?bikes?)$/,
  atv: /^(atvs?|quads?|quad-?bikes?|four-wheelers?|4-wheelers?)$/,
  tractor: /^(tractors?|mowers?|lawn-?mowers?|lawn-?tractors?|lawnmowers?)$/,
};
/** How many a bare plural names. */
const USUAL = {
  kart: 3, car: 2, truck: 1, semi: 1, suv: 1, van: 1, bus: 1, taxi: 2, forklift: 1, motorcycle: 1, dirtbike: 1,
  bicycle: 2, atv: 1, tractor: 1,
};
/** Where each kind may stand, in metres, so it is seen whole; the older screen band beside it. */
const DEPTH = {
  kart: [9, 32], car: [14, 60], truck: [24, 90], semi: [32, 130], suv: [14, 60], van: [16, 65], bus: [26, 100],
  taxi: [14, 60], forklift: [9, 32], motorcycle: [9, 30], dirtbike: [9, 30], bicycle: [8, 28], atv: [9, 30],
  tractor: [9, 30],
};
const BAND = { near: [0.15, 0.6], mid: [0.12, 0.55], far: [0.08, 0.4], farther: [0.06, 0.35] };
const bandOf = (kind) => (DEPTH[kind][0] < 10 ? BAND.near : DEPTH[kind][0] < 20 ? BAND.mid : DEPTH[kind][0] < 30 ?
  BAND.far : BAND.farther);

/** The things registered: one per kind, with its words, its usual count, its depth band and its size. */
export const VEHICLE_THINGS = Object.keys(VEHICLE_WORDS).map((kind) => {
  const V = VEHICLES[kind];
  return {
    id: kind, word: KEY[kind], match: VEHICLE_WORDS[kind], usual: USUAL[kind], band: bandOf(kind), depth: DEPTH[kind],
    size: { w: V.length, h: V.height, d: V.width }, // d: placement's footprint across (its length as it faces)
    onRoad: true, draw: (ctx, inst) => drawVehicle(ctx, inst, kind),
  };
});
for (const entry of VEHICLE_THINGS) register('things', entry);

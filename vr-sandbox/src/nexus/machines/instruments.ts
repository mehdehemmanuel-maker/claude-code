// Instruments that see what an eye cannot: x-rays through a body, heat as light, and a laser's own echo. Each is sized
// from the law that makes it work, not from a picture of one:
//
//   an x-ray tube      electrons stopped in a target   xray.cutoff (Duane–Hunt), xray.efficiency
//   what it sees       the share of a beam that is left attenuation.exponential (Beer–Lambert)
//   a thermal camera   everything warm glows            wien.displacement, radiation (Stefan–Boltzmann)
//   a spectrometer     two paths interfering            ftir.resolution
//   a lidar            a pulse and its echo             lidar.time-of-flight, lidar.return
//
// The laws are the book's (src/nexus/book/optics.ts, thermal.ts; src/ganglia/laws.ts); what is here is the arithmetic
// over them and the figures it uses, each sourced or labelled an estimate, and the instruments drawn from it.
//
// Two of these are dangerous in a way nothing else in the library is: an x-ray tube is a radiation source that gives no
// warning and no sensation, and a lidar is a laser. Both say so in full (HAZARDS), and every kind carries it.
//
// Owner of: what an instrument of this kind can see and what that costs, and the instrument drawn from it.

import type { Part, V3 as Vec } from '../parts/kits';
import { massOf } from '../parts/mass';

const P = (name: string, shape: Part['shape'], o: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...o } as Part);
const B = (name: string, sz: Vec, at: Vec, o: Partial<Part> = {}): Part => P(name, { box: sz }, { at, ...o });
const CY = (name: string, r: number, h: number, at: Vec, o: Partial<Part> = {}): Part => P(name, { cyl: [r, h] }, { at, ...o });
const group = (name: string, at: Vec, parts: Part[], o: Partial<Part> = {}): Part => ({ name, at, parts, ...o } as Part);

/** Planck's constant, J s (SI 2019, exact). */
const H = 6.62607015e-34;
/** The speed of light in vacuum, m/s (SI 2019, exact). */
const C = 299792458;
/** The elementary charge, C (SI 2019, exact). */
const QE = 1.602176634e-19;
/** Wien's displacement constant, m K (CODATA 2018). */
const B_WIEN = 2.897771955e-3;
/** The x-ray yield of a thick target, 1/V (Bushberg, The Essential Physics of Medical Imaging: η ≈ 1.1e-9 Z V). */
const K_XRAY = 1.1e-9;
const PI = Math.PI, mm = 0.001;

// ---- an x-ray tube: what it makes, and what it mostly makes instead ------------------------------------------------

export interface Tube {
  /** the beam's power into the target, W */ beam: number;
  /** the share of it that leaves as x-rays */ eta: number;
  /** the x-ray power out, W */ xray: number;
  /** the heat the anode must take, W */ heat: number;
  /** the shortest wavelength it can make, m */ lambda: number;
  /** the hardest photon it can make, keV */ keV: number;
  says: string;
}
/**
 * What a tube of this voltage and current does. Its electrons arrive with eV of energy each; the hardest photon it can
 * make is one that takes the lot (Duane–Hunt), and the share of the beam that leaves as x-rays at all is about
 * 1.1e-9 Z V. Everything else is heat in the target, which is why an anode is tungsten on molybdenum, why it spins,
 * and why the duty cycle of a tube is measured in seconds a minute rather than per cent.
 */
export function xrayTube(kV: number, mA: number, Z = 74): Tube {
  const V = kV * 1000, beam = V * (mA / 1000), eta = K_XRAY * Z * V;
  return { beam, eta, xray: beam * eta, heat: beam * (1 - eta), lambda: (H * C) / (QE * V), keV: kV,
    says: `${kV} kV and ${mA} mA is ${(beam / 1000).toFixed(1)} kW into the target, of which ${(eta * 100).toFixed(2)} % leaves as x-rays (${(beam * eta).toFixed(0)} W) and ${((beam * (1 - eta)) / 1000).toFixed(1)} kW is heat the anode must take. Its hardest photon is ${kV} keV, ${(((H * C) / (QE * V)) * 1e12).toFixed(1)} pm` };
}
/** How long an anode of this heat capacity may be run before it is at its limit, s: its stored heat over the heat
 *  going in. A real tube's rating curve also counts how fast the heat leaves, which this does not: it is the
 *  worst case, a single exposure from cold. (Heat capacity in joules, the way tubes are rated — makers quote heat
 *  units, 1 HU = 0.71 J for a single-phase supply.) */
export const anodeSeconds = (heatW: number, capacityJ: number): number => +(capacityJ / heatW).toFixed(2);

/** What a thickness of something leaves of a beam: Beer–Lambert, the law an x-ray image is made of. */
export const through = (mu: number, x: number): number => Math.exp(-mu * x);
/** The thickness that halves a beam, m: ln2 / μ. A half-value layer is how shielding is specified and how an image's
 *  contrast is reckoned. */
export const halfValue = (mu: number): number => Math.LN2 / mu;
/** The thickness that cuts a beam to a share of itself, m — what a shield is sized by. */
export const shieldFor = (mu: number, share: number): number => Math.log(1 / share) / mu;
/** Linear attenuation coefficients at 100 keV, 1/m, from NIST XCOM's mass attenuation coefficients times each
 *  material's density (lead 5.549 cm²/g × 11.35, aluminium 0.1704 × 2.70, water 0.1707 × 1.00, bone 0.186 × 1.92,
 *  steel 0.3717 × 7.87, concrete 0.1770 × 2.30). At 100 keV, which is where a diagnostic beam's mean energy sits. */
export const MU_100KEV: Record<string, number> = { lead: 6298, 'steel-low': 2925, aluminium: 46, water: 17.07, bone: 35.7, concrete: 40.7, tungsten: 8259 };

// ---- heat as light: what a thermal camera sees ----------------------------------------------------------------------

export interface Seen {
  /** the wavelength it radiates most at, m */ peak: number;
  /** the band that peak falls in */ band: string;
  /** what it radiates over all wavelengths, W/m² */ exitance: number;
  says: string;
}
/** What a surface at this temperature gives off: where its radiation peaks (Wien) and how much of it there is
 *  (Stefan–Boltzmann). A room at 20 °C peaks at 9.9 µm, which is why a thermal camera's window is germanium and its
 *  band is 8 to 14 µm; a kiln at 1000 °C peaks at 2.3 µm, which is why it glows orange to an eye. */
export function glow(T: number, eps = 0.95): Seen {
  const peak = B_WIEN / T, um = peak * 1e6;
  const band = um < 0.75 ? 'visible' : um < 1.4 ? 'near infrared' : um < 3 ? 'short-wave infrared' : um < 8 ? 'mid-wave infrared' : um < 15 ? 'long-wave infrared' : 'far infrared';
  const exitance = eps * 5.670374419e-8 * T ** 4;
  return { peak, band, exitance, says: `at ${(T - 273.15).toFixed(0)} °C it peaks at ${um.toFixed(1)} µm (${band}) and gives off ${exitance.toFixed(0)} W/m² at an emissivity of ${eps}` };
}
export interface Camera {
  /** what one detector covers, rad */ ifov: number;
  /** how wide it sees, rad */ fov: number;
  /** what one detector covers at 10 m, mm */ spot10: number;
  /** the f-number's own limit on how fine it can see at 10 µm, rad */ diffraction: number;
  says: string;
}
/**
 * What a thermal camera of this array and lens sees. One detector covers pitch/f of angle, and the whole array that
 * times its width. A lens cannot beat diffraction, and comparing the two gives the one fact that decides how fine an
 * array is worth making: the blur is 1.22 λ f / D of length at the array, which is 1.22 λ F — the f-number alone,
 * whatever the focal length. At 10 µm and f/1 that is 12.2 µm, so a 12 µm pitch is exactly matched and a 17 µm one is
 * detector-limited; going finer than 12 µm buys nothing without a faster lens, and germanium at f/0.8 is already an
 * expensive piece of glass.
 */
export function thermalCam(px: number, pitchUm: number, fMm: number, fnum = 1.0): Camera {
  const ifov = (pitchUm * 1e-6) / (fMm * mm), fov = ifov * px;
  return { ifov, fov, spot10: ifov * 10 * 1000, diffraction: (1.22 * 10e-6) / (fMm * mm / fnum),
    says: `${px} detectors of ${pitchUm} µm behind an f/${fnum} lens of ${fMm} mm: ${(ifov * 1000).toFixed(2)} mrad each, ${((fov * 180) / PI).toFixed(0)}° across, and one detector covers ${(ifov * 10 * 1000).toFixed(0)} mm at 10 m` };
}
/** What the array costs to read, W: a microbolometer array is read like a camera sensor and is dominated by its
 *  read-out circuit — about 1.2 W for a 640 × 480 at 60 Hz, 0.6 W for a 320 × 240 (an estimate of the class, from the
 *  power budgets makers publish for their cores). A cooled photon detector is another matter: its cooler alone is
 *  several watts and it takes minutes to come down. */
export const camWatts = (px: number, cooled = false): number => +(cooled ? 6 + px / 400 : 0.3 + (px / 640) ** 2 * 0.9).toFixed(2);

// ---- an interferometer: a spectrometer with no grating -----------------------------------------------------------

export interface Spectro {
  /** how far apart two lines it can tell apart are, 1/cm */ res: number;
  /** how far the mirror must travel, mm */ travel: number;
  /** how many points one scan takes at the Nyquist rate of its laser */ points: number;
  says: string;
}
/** An FTIR's resolution is one over the path difference its mirror makes, and its mirror travels half of that. Its
 *  scan is sampled on the fringes of a helium–neon laser at 632.8 nm, so the number of points is the path difference
 *  over half a wavelength: resolution costs travel, and travel costs time. */
export function ftir(resCm: number, hiCm = 4000): Spectro {
  const opd = 1 / (resCm * 100), points = Math.round(opd / (632.8e-9 / 2));
  return { res: resCm, travel: (opd / 2) * 1000, points,
    says: `${resCm} cm⁻¹ asks ${(opd * 1000).toFixed(1)} mm of path difference, so ${((opd / 2) * 1000).toFixed(1)} mm of mirror travel and ${points} points a scan at the HeNe's fringes; ${Math.round(hiCm / resCm)} resolved points across a spectrum to ${hiCm} cm⁻¹` };
}

// ---- a lidar: a pulse, its echo, and what comes back ---------------------------------------------------------------

export interface Lidar {
  /** the power that comes back from a target at that range, W */ back: number;
  /** the range where the return falls to the detector's noise floor, m */ reach: number;
  /** how many points it makes a second */ rate: number;
  says: string;
}
/**
 * What a lidar gets back: the range equation for a diffuse target that fills the beam. The return falls as the square
 * of the range, so a lidar that reaches 100 m needs four times the power to reach 200 — and reflectance matters as
 * much: a black car at 0.05 comes back at a tenth of a road sign at 0.5, which is why makers quote range at a stated
 * reflectance and why 10 % is the honest number to compare on.
 */
export function lidar(o: { Pt: number; rho: number; apertureMm: number; eta?: number; nepW: number; R?: number; channels?: number; rpm?: number; hz?: number }): Lidar {
  const eta = o.eta ?? 0.85, A = PI * (o.apertureMm * mm / 2) ** 2, R = o.R ?? 100;
  const back = (o.Pt * o.rho * A * eta) / (PI * R * R);
  const reach = Math.sqrt((o.Pt * o.rho * A * eta) / (PI * o.nepW));
  const rate = (o.channels ?? 1) * (o.hz ?? 20000);
  return { back, reach, rate,
    says: `${o.Pt} W of peak pulse off a ${(o.rho * 100).toFixed(0)} % target comes back as ${(back * 1e9).toFixed(1)} nW at ${R} m through a ${o.apertureMm} mm aperture, and falls to the detector's ${(o.nepW * 1e9).toFixed(1)} nW floor at ${reach.toFixed(0)} m. ${(o.channels ?? 1)} channel${(o.channels ?? 1) > 1 ? 's' : ''} at ${((o.rpm ?? 600) / 60).toFixed(0)} turns a second: ${(rate / 1000).toFixed(0)}k points a second` };
}
/** How far apart two returns must be in time to be told apart, m: half the pulse's own length in space. A 5 ns pulse
 *  cannot separate anything closer than 0.75 m, which is why a lidar that reports leaves in front of a trunk reports
 *  more than one return for one shot. */
export const pulseResolution = (ns: number): number => +((C * ns * 1e-9) / 2).toFixed(3);

// ---- what each one can do to the person using it -------------------------------------------------------------------

export const HAZARDS: Record<string, string[]> = {
  xray: [
    'an x-ray tube under power is a radiation source that cannot be seen, heard, felt or smelt, and the damage it does is not felt either: there is no pain at the dose that raises a cancer risk years later, and no warning at the dose that burns skin in an hour',
    'the beam is not the only hazard: everything the beam strikes scatters, so the air beside a tube and the table under it are a source too, and the inverse-square law is the cheapest shielding there is — distance, then lead',
    'a tube is run from an enclosure with an interlock, a warning light and a key, and the law in every country says who may hold the key: this library sizes a tube and says what it would make, and that is not permission to build or run one',
    'the anode runs white hot in a vacuum envelope at tens of kilovolts: the hazards of high voltage, of hot metal and of an implosion are all there before any radiation is',
  ],
  lidar: [
    'a lidar is a laser pointed at whatever is in front of it. The class on the label is for the beam as the maker set it up: open the housing, stop the scanner turning, or defeat the interlock and the same laser that was Class 1 scanning is a beam that can take sight in the time it takes to blink',
    'an infrared beam gives no blink reflex, because nothing is seen: 905 nm is invisible and reaches the retina, and the eye focuses it to a point a hundred times smaller than the beam that entered',
    '1550 nm is absorbed in the cornea instead of reaching the retina, so a 1550 nm lidar may run far more power for the same class — which also means that what is safe for the eye there is not safe for skin at close range',
    'never look into the aperture of a lidar that is powered, with or without an instrument: a camera, a loupe or a telescope gathers the beam and makes a safe exposure dangerous',
  ],
  infrared: [
    'a thermal camera is safe to use and easy to believe: it reports a temperature for every pixel, and every one of those numbers is wrong unless the emissivity, the reflected background and the distance are right. Bare metal at 0.1 emissivity reads cold and shows you the room reflected in it',
    'it sees through nothing a window is made of: ordinary glass is opaque in the long-wave band, so a thermal camera shows the glass, not what is behind it, and a germanium window costs what it costs for that reason',
    'what it is used for can be as serious as what it is: a camera that says a breaker is at 90 °C is a reason to shut something down, and a camera whose emissivity is set wrong says that about a breaker that is fine',
  ],
  spectrometer: [
    'an FTIR\'s source runs at over 1000 °C behind its housing, and its beamsplitter is potassium bromide, which dissolves in the moisture of a breath: a purge that fails ruins it quietly, over weeks',
    'what goes in the beam is the hazard: a spectrometer is used to look at solvents, acids and unknown samples, and the fume hood is part of the instrument',
  ],
};

// ---- drawn ----------------------------------------------------------------------------------------------------------
//
// Each instrument is laid out from the arithmetic above: an x-ray tube's anode is as big as the heat it must take, its
// shield as thick as the beam it must stop; a thermal camera's lens is as wide as its f-number asks of its array; an
// interferometer's mirror travels as far as its resolution asks; a lidar's window is as tall as its channels' fan.
// Sizes are the makers' where a maker publishes them, and estimates of the class where none does, said so in each part.

/** A ring closed on itself, revolved: what a flange, a collar or a cap's rim is. */
const ring = (r0: number, r1: number, t: number): Part['shape'] => ({ lathe: [[r0, -t / 2], [r1, -t / 2], [r1, t / 2], [r0, t / 2], [r0, -t / 2]] });
/** A socket-head screw, its hex key socket drilled in its head: drawn along y unless it is turned. */
const screw = (name: string, d: number, len: number, at: Vec, o: Partial<Part> = {}): Part =>
  CY(name, d / 2, len, at, { mat: 'steel-low', color: 0x7a7e83, finish: 'ground',
    cuts: [{ r: d * 0.27, depth: Math.min(0.0025, len * 0.5), at: [0, len / 2, 0], dir: [0, -1, 0] }],
    says: 'a socket-head screw: what holds this on, and what takes it off', ...o });
/** A ring of socket-head screws about the x axis at an x, their sockets facing the way they went in. */
const screwsX = (nm: string, n: number, r: number, x: number, sx: 1 | -1, d = 0.006): Part[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * PI + PI / n;
    return CY(`${nm} screw ${i + 1}`, d / 2, 0.005, [x, r * Math.cos(a), r * Math.sin(a)], { rot: [0, 0, PI / 2] as Vec, mat: 'steel-low', color: 0x7a7e83, finish: 'ground',
      cuts: [{ r: d * 0.27, depth: 0.002, at: [0, -sx * 0.0024, 0], dir: [0, sx, 0] }], says: 'one of the ring of screws that holds the end bell on: a tube head is opened to change its oil' }); });
/** A ring of socket-head screws about the y axis, in a face at a height. */
const screwsY = (nm: string, n: number, r: number, y: number, d = 0.005, says = 'one of the ring of screws that holds the cap on'): Part[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * PI + PI / n;
    return screw(`${nm} screw ${i + 1}`, d, 0.004, [r * Math.cos(a), y, r * Math.sin(a)], { says }); });

/**
 * A rotating-anode x-ray tube, as a medical or industrial set carries it: the insert (a vacuum envelope holding the
 * cathode's filament cup and a tungsten-faced disc on a molybdenum stem in bearings), the stator that turns that disc
 * from outside the glass, and the housing round it all — lead-lined, oil-filled, its end bells bolted on, a
 * high-voltage receptacle at each end, trunnions to hang it by, and a collimator under the port where the beam leaves.
 * Drawn on its own axis along x, the beam leaving downward (−y), which is how a tube is hung over a table. kV and mA
 * size the anode: the heat worked out above is what its disc must store.
 */
export function xrayTubeParts(nm: string, kV: number, mA: number, o: { anode?: 'rotating' | 'fixed'; focusMm?: number } = {}): Part[] {
  const t = xrayTube(kV, mA), rotating = (o.anode ?? 'rotating') === 'rotating', focus = o.focusMm ?? 0.6;
  // (the disc: a target that must take 20 kW is 90 to 120 mm across in every tube that does; a fixed anode of the same
  //  power would melt, which is the whole reason it spins — an estimate of the class, in the range makers sell)
  const disc = rotating ? Math.max(0.07, Math.min(0.14, Math.cbrt(t.heat / 2e4) * 0.1)) : 0.03;
  // (a tube head is as big as the lead, the oil and the insert it holds, and those go with the heat: a dental head at
  //  half a kilowatt is a fist, a radiographic housing at twenty is a shoebox. Its linear size as the cube root of the
  //  rating, which is what makes the drawn mass follow tubeKg instead of standing still)
  const sc = Math.max(0.62, Math.min(1.22, Math.cbrt(t.heat / 20000)));
  const env = 0.062 * sc, L = 0.26 * sc, housing = 0.11 * sc, HL = 0.33 * sc;
  const col = housing * 1.7, colH = housing * 0.72, port = L * 0.1;
  const parts: Part[] = [
    // the insert: its envelope, drawn as the glass it is, with the metal centre section a modern one has
    P(`${nm} envelope`, { lathe: [[0, -L / 2], [env * 0.5, -L / 2], [env, -L * 0.28], [env, L * 0.28], [env * 0.5, L / 2], [0, L / 2]] },
      { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'glass', color: 0xb9cdd6, finish: 'polished', shell: 0.0025,
        says: 'the vacuum envelope: borosilicate, 2.5 mm, with the whole of the inside at less than a millionth of an atmosphere. A tube that lets air in is finished in a second' }),
    // the anode: the disc, its bevelled face, the stem that carries it and the bearings it turns in
    P(`${nm} anode disc`, { lathe: [[0, -0.004], [disc / 2 - 0.008, -0.004], [disc / 2, 0.004], [disc / 2, 0.008], [0, 0.008]] },
      { at: [L * 0.26, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'molybdenum', color: 0x9aa0a6, finish: 'ground', item: 'xray-anode',
        says: `${(disc * 1000).toFixed(0)} mm across, its rim bevelled ${rotating ? '12°' : '20°'} so a focal spot ${focus} mm wide on the film is ${(focus * 5).toFixed(1)} mm of track on the metal: the line-focus principle, which is how a tube takes kilowatts into a spot the size of a pinhead` }),
    CY(`${nm} anode track`, disc / 2 * 0.98, 0.0016, [L * 0.26 + 0.005, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'tungsten', color: 0xd8d4cc, finish: 'ground', says: 'tungsten with 5 to 10 % rhenium, the face the electrons land on: rhenium so it does not craze as it heats and cools' }),
    CY(`${nm} anode stem`, 0.006, L * 0.2, [L * 0.14, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'molybdenum', color: 0x8d9298, says: 'molybdenum: it holds the disc and conducts as little heat as it can back into the bearings' }),
    CY(`${nm} rotor`, 0.021, L * 0.22, [L * 0.0, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'copper', color: 0xb87333, finish: 'ground', shell: 0.004, says: 'the squirrel-cage rotor inside the glass, turned by a stator outside it: nothing passes through the envelope, because nothing can' }),
    ...[-1, 1].map((sx, i) => CY(`${nm} bearing ${i + 1}`, 0.009, 0.01, [L * (sx > 0 ? 0.09 : -0.11), 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'steel-chrome', color: 0xc2c7cb, joint: 'bearing', says: 'ball bearings running dry on a lead or silver film: no oil can be used in a vacuum, which is why a tube\'s bearings are what wear out first' })),
    // the cathode: its cup and the filament in it
    B(`${nm} cathode cup`, [0.014, 0.022, 0.03], [-L * 0.3, 0, 0], { mat: 'nickel', color: 0x8d9298, says: 'the focusing cup: it is held negative so the electrons leaving the filament are pushed into a line and not a cloud' }),
    P(`${nm} filament`, { cyl: [0.0012, 0.012] }, { at: [-L * 0.3 + 0.004, 0, 0], rot: [PI / 2, 0, 0] as Vec, mat: 'tungsten', color: 0xe8cf9a, glow: true, item: 'filament-tungsten', says: 'tungsten wire at about 2400 °C: the electrons that make the beam boil off this, and the tube\'s milliamps are set by how hot it is' }),
    // the stator, outside the envelope
    CY(`${nm} stator`, env + 0.012, L * 0.26, [0, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'steel-electrical', color: 0x5a5e63, fill: 0.55, says: 'outside the glass: it turns the rotor at 3000 or 9000 rev/min through the envelope, with no shaft through anything' }),
  ];
  // the housing: lead-lined, oil-filled, with its port and a collimator under it
  const lead = shieldFor(MU_100KEV.lead!, 0.001);
  parts.push(
    P(`${nm} housing`, { lathe: [[0, -HL / 2 + 0.014], [housing, -HL / 2 + 0.014], [housing, HL / 2 - 0.014], [0, HL / 2 - 0.014]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x2f3338, finish: 'crinkle', shell: 0.004, says: 'the barrel of the housing: 4 mm of aluminium, lined with lead, holding the insert in oil' }),
    P(`${nm} lead lining`, { lathe: [[0, -HL / 2 + 0.005], [housing - 0.005, -HL / 2 + 0.005], [housing - 0.005, HL / 2 - 0.005], [0, HL / 2 - 0.005]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'lead', color: 0x6e7279, shell: lead, item: 'lead-sheet',
      says: `${(lead * 1000).toFixed(2)} mm of lead, which is what cuts a 100 keV beam to a thousandth of itself — every way but the port. A tube radiates in every direction; only the port is meant to` }),
    CY(`${nm} oil`, housing - 0.006, HL - 0.04, [0, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'oil-transformer', color: 0xc8b06a, fill: 0.35, says: 'transformer oil: it insulates the 100 kV from the housing and carries the anode\'s heat out to the wall of it. Filled to the share the insert leaves' }),
  );
  // the two end bells, bolted to the barrel on a flange: where a head comes apart, and the first thing an eye reads as
  // hardware rather than as one moulded lump
  for (const sx of [-1, 1] as const) {
    const i = sx > 0 ? 1 : 0, xf = sx * (HL / 2 - 0.014);
    parts.push(
      P(`${nm} end flange ${i + 1}`, ring(housing * 0.62, housing + 0.005, 0.012), { at: [xf, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x3a3e43, finish: 'crinkle', says: 'the flange the end bell is bolted to, with its O-ring groove inside the bolt circle: oil, and 100 kV, must not get past it' }),
      P(`${nm} end bell ${i + 1}`, { lathe: [[0, 0], [housing * 0.62, 0], [housing * 0.9, -0.004], [housing * 0.9, -0.012], [housing * 0.52, -0.014], [0, -0.014]] },
        { at: [sx * (HL / 2 - 0.008), 0, 0], rot: [0, 0, sx > 0 ? -PI / 2 : PI / 2] as Vec, mat: 'al-6061', color: 0x2f3338, finish: 'crinkle', shell: 0.005,
          says: 'the end bell: a pressed dish, which is why the barrel is a barrel and the ends are not' }),
      ...screwsX(`${nm} end flange ${i + 1}`, 8, housing * 0.82, xf + sx * 0.0075, sx),
      // the high-voltage receptacle: a well with its pins down it and a threaded collar round its mouth, which is what a
      // cable's plug screws into. A tube head is recognised by these two, one at each end
      P(`${nm} receptacle flange ${i + 1}`, ring(0.014, 0.036, 0.008), { at: [sx * (HL / 2 + 0.002), housing * 0.3, 0], rot: [0, 0, PI / 2] as Vec, mat: 'pbt', color: 0x1b1e22, finish: 'moulded', says: 'the receptacle\'s own flange, screwed to the end bell over its oil seal' }),
      P(`${nm} receptacle ${i + 1}`, { cyl: [0.026, 0.044] }, { at: [sx * (HL / 2 + 0.028), housing * 0.3, 0], rot: [0, 0, PI / 2] as Vec, mat: 'pbt', color: 0x17191c, finish: 'moulded',
        cuts: [{ r: 0.019, depth: 0.03, at: [0, -sx * 0.022, 0], dir: [0, sx, 0] }],
        says: i === 0 ? 'the cathode\'s high-voltage receptacle: a well 19 mm across with three pins down it — half the tube voltage, negative, through a cable as thick as a thumb' : 'the anode\'s: half the tube voltage, positive. Splitting it between the two halves the insulation either end has to stand' }),
      P(`${nm} receptacle collar ${i + 1}`, ring(0.0265, 0.031, 0.009), { at: [sx * (HL / 2 + 0.0455), housing * 0.3, 0], rot: [0, 0, PI / 2] as Vec, facets: 16, mat: 'brass', color: 0xb08d57, finish: 'plate', says: 'the threaded collar the plug screws into, knurled to be done up by hand: a high-voltage plug that works loose arcs' }),
      ...[0, 1, 2].map((k) => { const a = (k / 3) * 2 * PI + PI / 6;
        return CY(`${nm} receptacle ${i + 1} pin ${k + 1}`, 0.0028, 0.022, [sx * (HL / 2 + 0.023), housing * 0.3 + 0.009 * Math.cos(a), 0.009 * Math.sin(a)], { rot: [0, 0, PI / 2] as Vec, mat: 'brass', color: 0xc9a227, finish: 'plate', says: 'one of its three: the two ends of the filament and the high tension itself' }); }),
      B(`${nm} receptacle ${i + 1} key`, [0.044, 0.004, 0.006], [sx * (HL / 2 + 0.028), housing * 0.3 + 0.0255, 0], { mat: 'pbt', color: 0x17191c, finish: 'moulded', one: true, says: 'the key: the plug goes in one way round, because the other way round would put the filament on the high tension' }),
    );
  }
  // what it hangs by: a trunnion through a collar on each side, with its washer and nut outside
  for (const sz of [-1, 1] as const) {
    const i = sz > 0 ? 1 : 0;
    parts.push(
      P(`${nm} trunnion collar ${i + 1}`, ring(0.017, 0.032, 0.01), { at: [0, housing * 0.2, sz * (housing - 0.004)], rot: [PI / 2, 0, 0] as Vec, mat: 'al-6061', color: 0x3a3e43, finish: 'crinkle', says: 'the boss welded into the housing\'s wall: the whole weight of the head goes through these two and nothing else' }),
      CY(`${nm} trunnion ${i + 1}`, 0.016, 0.034, [0, housing * 0.2, sz * (housing + 0.013)], { rot: [PI / 2, 0, 0] as Vec, mat: 'steel-low', color: 0x6f7378, finish: 'ground', says: 'what it hangs by: the head swings on these so the beam can be pointed, and they take its whole weight' }),
      P(`${nm} trunnion washer ${i + 1}`, ring(0.016, 0.024, 0.003), { at: [0, housing * 0.2, sz * (housing + 0.0315)], rot: [PI / 2, 0, 0] as Vec, mat: 'steel-low', color: 0x8b8f94, finish: 'ground', says: 'its washer, outside the yoke\'s bearing' }),
      ...screwsY(`${nm} trunnion collar ${i + 1}`, 4, 0.0245, 0, 0.005, 'one of the four that hold the trunnion collar in').map((s) => ({ ...s, at: [s.at![0], housing * 0.2 + s.at![0], sz * (housing + 0.001)] as Vec, rot: [PI / 2, 0, 0] as Vec })),
    );
  }
  // the rating plate, on a pad machined into the top of the barrel so it lies on metal and not in the air
  parts.push(
    B(`${nm} rating plate`, [HL * 0.42, 0.0016, 0.034], [0, housing - 0.0012, 0], { mat: 'pet', color: 0xd8d9db, text: `${kV} kV`, ink: 0x17191c, says: 'the rating plate: a tube is run to what is on this and no further' }),
    // the port and the collimator under it: what shuts the beam down to the part being looked at
    P(`${nm} port`, { lathe: [[0, 0], [0.028, 0], [0.028, 0.004], [0, 0.004]] }, { at: [port, -housing - 0.002, 0], mat: 'al-6061', color: 0xb9bcc0, item: 'xray-window', says: 'the window: aluminium, which also filters out the softest photons — the ones that would stop in the patient and do nothing but dose' }),
    B(`${nm} collimator flange`, [col + 0.012, 0.008, col + 0.012], [port, -housing - 0.004, 0], { mat: 'al-6061', color: 0x3a3e43, finish: 'crinkle', says: 'the collimator\'s flange, bolted up to the port: it is taken off to change it, and a tube is useless without one' }),
    ...screwsY(`${nm} collimator flange`, 4, col * 0.56, -housing - 0.0085, 0.006, 'one of the four that hold the collimator to the port').map((s) => ({ ...s, at: [port + s.at![0], s.at![1], s.at![2]] as Vec })),
    B(`${nm} collimator`, [col, colH, col], [port, -housing - 0.008 - colH / 2, 0], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.003, says: 'what shuts the beam down to the part being looked at: a beam wider than the film is dose for nothing' }),
    // its face plate with the field cut out of it, so the beam leaves by an opening and not by a flat wall
    B(`${nm} collimator face`, [col, 0.005, col], [port, -housing - 0.0105 - colH, 0], { mat: 'al-6061', color: 0x2a2d31, finish: 'crinkle',
      cuts: [{ r: (col * 0.5) / Math.SQRT2, depth: 0.006, at: [0, 0.003, 0], dir: [0, -1, 0], n: 4 }],
      says: `the face, with the field cut square out of it: ${(col * 500).toFixed(0)} mm at the face, and the leaves inside shut it down from there` }),
    ...[-1, 1].flatMap((sx) => [0, 1].map((k) => B(`${nm} collimator leaf`, k === 0 ? [0.004, colH * 0.7, col * 0.86] : [col * 0.86, colH * 0.7, 0.004], [port + (k === 0 ? sx * col * 0.3 : 0), -housing - 0.008 - colH / 2, k === 0 ? 0 : sx * col * 0.3], { mat: 'lead', color: 0x6e7279, says: 'a lead leaf, one of four: they slide to make the field' }))),
    // the two knobs that drive those leaves, and the light the field is set by
    ...[0, 1].map((k) => P(`${nm} collimator knob ${k + 1}`, { cyl: [0.014, 0.012] }, { at: [port + (k === 0 ? col / 2 + 0.006 : 0), -housing - 0.012 - colH * 0.4, k === 0 ? 0 : col / 2 + 0.006], rot: [0, 0, PI / 2] as Vec, facets: 16, mat: 'abs', color: 0x1b1e22, finish: 'moulded', says: 'the knob that drives one pair of leaves: a collimator is set by hand, by the light field, before the exposure' })),
    ...[0, 1].map((k) => CY(`${nm} collimator knob ${k + 1} shaft`, 0.004, 0.008, [port + (k === 0 ? col / 2 + 0.001 : 0), -housing - 0.012 - colH * 0.4, k === 0 ? 0 : col / 2 + 0.001], { rot: [0, 0, PI / 2] as Vec, mat: 'steel-low', color: 0x8b8f94, says: 'its shaft, through the wall on an oil-tight bush' })),
    B(`${nm} field window`, [col * 0.3, 0.05, 0.002], [port - col * 0.26, -housing - 0.012 - colH * 0.42, col / 2 + 0.0005], { mat: 'pmma', color: 0xd8d2b4, finish: 'polished', glow: true, says: 'the window the field lamp throws its light out of: the beam itself cannot be seen, so a collimator is set by a light the same size' }),
    B(`${nm} field lamp`, [0.018, 0.012, 0.018], [port - col * 0.3, -housing - 0.008 - colH * 0.35, col * 0.26], { mat: 'glass', color: 0xf4e8c0, glow: true, says: 'the field lamp: it throws a light the size of the beam, with the cross-hairs in it, because the beam itself cannot be seen' }),
    B(`${nm} collimator plate`, [0.0008, 0.02, col * 0.52], [port + col / 2 + 0.0005, -housing - 0.012 - colH * 0.5, 0], { mat: 'pet', color: 0x3c0a08, text: 'CAUTION X-RAY', says: 'the warning on it, which is all a person gets: nothing is seen, heard, felt or smelt at the dose that matters' }),
    // the cross-hairs in the light field, which is what the field is lined up by
    ...[0, 1].map((k) => B(`${nm} cross-hair ${k + 1}`, k === 0 ? [col * 0.5, 0.0006, 0.0008] : [0.0008, 0.0006, col * 0.5], [port, -housing - 0.0135 - colH, 0], { mat: 'steel-low', color: 0x26292d, one: true, says: 'one of the two wires across the field: where they cross is the middle of the beam' })),
  );
  // (what is on it but not drawn apart: its thermal switch, its expansion bellows, its earthing and its wiring)
  const drawn = parts.reduce((a, q) => a + massOf(q), 0), kg = tubeKg(kV, mA, o.anode ?? 'rotating');
  parts.push({ name: `${nm} bellows, switch and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: the oil's expansion bellows, the thermal switch that stops an exposure when the housing is too hot, its earth strap and its wiring (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${t.says}. ${HAZARDS.xray!.join('. ')}` })];
}
/** How big a tube head of this rating is, mm (x along its own axis, the collimator below it): what the drawing spans,
 *  so the catalogue's size and the drawing cannot drift apart. */
export function tubeBox(kV: number, mA: number): Vec {
  const sc = Math.max(0.62, Math.min(1.22, Math.cbrt(xrayTube(kV, mA).heat / 20000)));
  const housing = 0.11 * sc, HL = 0.33 * sc, col = housing * 1.7, colH = housing * 0.72;
  const x = Math.max(HL + 2 * 0.05, col + 0.012), y = 2 * housing + colH + 0.019, z = Math.max(2 * (housing + 0.033), col + 0.012);
  return [+(x * 1000).toFixed(0), +(y * 1000).toFixed(0), +(z * 1000).toFixed(0)] as Vec;
}
/** What an x-ray tube of this rating weighs, kg: its housing's lead and oil dominate, and both go with the power it
 *  must take. An estimate of the class — a dental head is 12 kg, a radiographic tube with its housing 25 to 45 — fitted
 *  to those two ends as 11 kg plus 1.5 kg for every kilowatt of heat the anode has to deal with. */
export const tubeKg = (kV: number, mA: number, anode: 'rotating' | 'fixed' = 'rotating'): number =>
  +(11 + (xrayTube(kV, mA).heat / 1000) * 1.5 * (anode === 'rotating' ? 1 : 0.7)).toFixed(1);

/**
 * A flat-panel x-ray detector, as radiography uses instead of film: a carbon-fibre cover the beam passes through
 * without being seen, a caesium iodide scintillator grown in needles so the light it makes stays in its own column, a
 * thin-film transistor array on glass that reads that light pixel by pixel, and its electronics and radio. Drawn flat,
 * the beam arriving from +y: a tub of four rails on a back plate, the cover sunk inside their bezel, its active area
 * marked on it as a panel's is, a handle along one edge, a battery door and a tether socket in the others, and rubber
 * at every corner, because a panel is dropped. Its size is what it is sold by: a 35 × 43 cm panel is the one that
 * replaced the 14 × 17 inch cassette.
 */
export function xrayPanelParts(nm: string, wMm: number, hMm: number, pitchUm: number): Part[] {
  const w = wMm * mm, h = hMm * mm, T = 0.015, px = Math.round(wMm * 1000 / pitchUm), py = Math.round(hMm * 1000 / pitchUm);
  // (the bezel: a panel's active area stops short of its case, and the dead band is where its rails and its boards are)
  const bez = 0.014, aw = w - 2 * bez, ah = h - 2 * bez, top = T / 2;
  const mark = (x: number, z: number, lx: number, wz: number) => ({ at: [x, z] as [number, number], lx, wz, ink: 0x8d9298 });
  const parts: Part[] = [
    B(`${nm} back plate`, [w, 0.0016, h], [0, -top + 0.0008, 0], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', says: 'the back of the tub, in one sheet: a panel is a sealed box, because it is wiped with disinfectant every day of its life' }),
    ...[-1, 1].map((sz, i) => B(`${nm} end rail ${i + 1}`, [w, T, bez], [0, 0, sz * (h / 2 - bez / 2)], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.0025, says: 'one of the four rails of the tub: the dead band round the picture, where the readout boards and the battery live' })),
    ...[-1, 1].map((sx, i) => B(`${nm} side rail ${i + 1}`, [bez, T, h - 2 * bez], [sx * (w / 2 - bez / 2), 0, 0], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.0025, says: 'one of the four rails of the tub' })),
    // the cover, sunk inside the bezel the rails make: the beam's way in, and the only face that must be flat
    B(`${nm} cover`, [aw, 0.0012, ah], [0, top - 0.0022, 0], { mat: 'cfrp', color: 0x1b1d20, finish: 'brushed',
      says: 'carbon fibre: it is strong enough to stand on and nearly invisible to the beam, which is the whole reason it is not aluminium' }),
    // the marks on it, printed: the middle and the four edges, which is how a panel is lined up with the tube
    B(`${nm} active area marks`, [aw, 0.0002, ah], [0, top - 0.0015, 0], { mat: 'pet', color: 0x1b1d20, inkOnly: true,
      prints: [
        // the centre cross and the four edge marks: how a panel is lined up with the tube, printed where every panel has them
        mark(0, 0, 0.03, 0.0012), mark(0, 0, 0.0012, 0.03),
        mark(0, ah / 2 - 0.008, 0.0015, 0.012), mark(0, -(ah / 2 - 0.008), 0.0015, 0.012),
        mark(aw / 2 - 0.008, 0, 0.012, 0.0015), mark(-(aw / 2 - 0.008), 0, 0.012, 0.0015),
        { t: `${(wMm / 10).toFixed(0)} x ${(hMm / 10).toFixed(0)} cm`, at: [-aw / 2 + 0.075, ah / 2 - 0.018], h: 0.008, ink: 0x8d9298 },
        { t: 'TUBE SIDE', at: [0, ah / 2 - 0.009], h: 0.006, ink: 0x8d9298 },
      ],
      says: 'its active area marked at the middle and at the four edges, and which edge faces the tube: a panel is lined up by these and by nothing else, because the beam cannot be seen' }),
    B(`${nm} scintillator`, [aw - 0.006, 0.0006, ah - 0.006], [0, top - 0.0038, 0], { mat: 'csi-tl', color: 0xe6e2cf, item: 'scintillator-csi', says: 'caesium iodide doped with thallium, grown as needles 0.6 mm deep: each needle pipes its light down to one pixel, so the picture stays sharp where a plain powder screen would blur it' }),
    B(`${nm} TFT array`, [aw - 0.006, 0.0007, ah - 0.006], [0, top - 0.0049, 0], { mat: 'glass', color: 0x2a3d4a, item: 'tft-array', says: `${px} × ${py} photodiodes and their transistors on glass at ${pitchUm} µm: ${((px * py) / 1e6).toFixed(1)} megapixels, read row by row` }),
    B(`${nm} backing`, [aw - 0.004, 0.0025, ah - 0.004], [0, top - 0.0068, 0], { mat: 'al-6061', color: 0x9aa0a6, finish: 'brushed', says: 'the plate the array is bonded to, which keeps it flat: a panel that bows reads a geometry that is not there' }),
    ...[-1, 1].map((sx, i) => B(`${nm} readout board ${i + 1}`, [aw * 0.9, 0.0016, 0.026], [0, top - 0.0095, sx * (ah / 2 - 0.016)], { mat: 'fr4', color: 0x14301f, item: 'pcb-bare', says: 'the gate and charge-amplifier boards along two edges: 16 channels to a chip, thousands of channels to a panel' })),
    B(`${nm} battery`, [0.096, 0.006, 0.066], [w * 0.22, top - 0.0105, 0], { mat: 'battery', color: 0x1a1a22, says: 'its cells and its protection board not drawn apart. A wireless panel carries its own power and its own radio: this is what makes it a panel and not a cassette on a cable' }),
    // the battery door in the back, with its latch: the one thing on a panel that is opened every day
    B(`${nm} battery door`, [0.1, 0.0025, 0.07], [w * 0.22, -top - 0.0008, 0], { mat: 'nylon', color: 0x3c4046, finish: 'moulded', says: 'the battery door: a panel runs a few hundred exposures to a pack, and the pack is swapped rather than charged in it' }),
    B(`${nm} battery latch`, [0.022, 0.003, 0.012], [w * 0.22 + 0.04, -top - 0.0015, 0], { mat: 'nylon', color: 0x8d9298, finish: 'moulded', says: 'its latch: slid across, and the door comes off in the hand' }),
    ...screwsY(`${nm} back plate`, 6, Math.min(w, h) * 0.42, -top - 0.0006, 0.0045, 'one of the screws round the back: a panel is opened for service, and this is where').map((s) => ({ ...s, rot: [PI, 0, 0] as Vec })),
    // the handle along one edge, in its own recess: how a panel is carried and pulled out from under a patient
    B(`${nm} handle recess`, [0.1, T * 0.6, 0.009], [0, 0, -(h / 2 - bez + 0.0045)], { mat: 'al-6061', color: 0x1e2125, finish: 'crinkle', says: 'the recess the handle lies in, so nothing stands out to catch on a sheet' }),
    CY(`${nm} handle`, 0.0055, 0.09, [0, 0, -(h / 2 - bez + 0.0055)], { rot: [0, 0, PI / 2] as Vec, mat: 'nylon', color: 0x2a2d31, finish: 'moulded', says: 'the handle: a panel weighs three or four kilograms and is moved a hundred times a day' }),
    // the tether socket in one side, under its flap: a wireless panel is still charged, and still read out on a cable
    P(`${nm} tether socket`, { cyl: [0.0068, 0.01] }, { at: [w / 2 - 0.004, 0, h * 0.3], rot: [0, 0, PI / 2] as Vec, mat: 'pbt', color: 0x17191c, finish: 'moulded',
      cuts: [{ r: 0.0048, depth: 0.007, at: [0, -0.005, 0], dir: [0, 1, 0] }], item: 'connector-housing', says: 'the tether socket: power and a wired readout for when the radio will not do, sealed with an O-ring behind its flap' }),
    ...[0, 1, 2, 3].map((k) => CY(`${nm} tether pin ${k + 1}`, 0.0007, 0.006, [w / 2 - 0.005, (k - 1.5) * 0.0024, h * 0.3], { rot: [0, 0, PI / 2] as Vec, mat: 'brass', color: 0xc9a227, finish: 'plate', says: 'one of its contacts, gold over brass' })),
    B(`${nm} socket flap`, [0.003, 0.016, 0.018], [w / 2 + 0.0015, 0, h * 0.3], { mat: 'rubber', color: 0x24262a, says: 'the rubber flap over it: the socket is the one hole in a sealed box' }),
    // the lights, where the hand holding it can see them
    ...[0, 1, 2].map((k) => CY(`${nm} light ${k + 1}`, 0.0022, 0.0014, [-w / 2 + bez / 2, top + 0.0003, h * 0.3 + (k - 1) * 0.008], { mat: 'pmma', color: [0x27c24c, 0xf0b429, 0x2d7ff9][k], glow: true, says: 'one of the three: charged, ready, and linked to its console' })),
    B(`${nm} plate`, [0.06, 0.0005, 0.024], [-w * 0.2, -top - 0.0003, -h * 0.3], { mat: 'pet', color: 0xd8d9db, text: `${(wMm / 10).toFixed(0)}x${(hMm / 10).toFixed(0)}`, ink: 0x17191c, rot: [PI, 0, 0] as Vec, says: 'its plate: format, serial and the marks it is sold under' }),
    // the rubber at the corners: what a dropped panel lands on
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].flatMap(([sx, sz], i) => [
      B(`${nm} corner bumper ${i + 1}`, [0.05, T + 0.0025, bez], [sx! * (w / 2 - 0.025), 0, sz! * (h / 2 - bez / 2)], { mat: 'rubber', color: 0x1b1d20, says: 'a moulded rubber corner, wrapped round the frame\'s own band and no further: a panel is dropped, and a corner is where it lands' }),
      B(`${nm} corner bumper ${i + 1} return`, [bez, T + 0.0025, 0.05 - bez], [sx! * (w / 2 - bez / 2), 0, sz! * (h / 2 - bez - (0.05 - bez) / 2)], { mat: 'rubber', color: 0x1b1d20, says: 'its return down the side, so the corner is covered both ways' }),
    ]),
  ];
  const kg = panelKg(wMm, hMm), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} radio, lead backing and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: its radio, the thin lead sheet behind the array that stops what comes back off the table, and its seals (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${px} × ${py} at ${pitchUm} µm over ${wMm} × ${hMm} mm. ${HAZARDS.xray![1]}` })];
}
/** How big a flat panel is, mm: its format across, 19 mm through its rubber corners, and 3 mm more where the tether
 *  socket's flap stands out of its side. */
export const panelBox = (wMm: number, hMm: number): Vec => [wMm + 3, 19, hMm];
/** What a flat panel weighs, kg: about 23 kg/m² of panel plus 1.1 kg of electronics and battery — fitted to the
 *  wireless panels makers publish (a 35 × 43 cm at about 3.4 kg, a 24 × 30 at about 2.2), an estimate of the class. */
export const panelKg = (wMm: number, hMm: number): number => +(((wMm * hMm) / 1e6) * 23 + 1.1).toFixed(2);

/**
 * A thermal camera: a germanium lens (glass is opaque in this band) standing proud of the body in its own barrel, a
 * microbolometer array in a vacuum package behind it, the board that reads it, a screen sunk into the back, a battery,
 * and a body in two shells with a grip under it. Drawn looking along +x, the lens at the front, the grip below.
 */
export function thermalCamParts(nm: string, px: number, pitchUm: number, fMm: number, fnum = 1.0): Part[] {
  const cam = thermalCam(px, pitchUm, fMm, fnum), lens = (fMm / fnum) * mm, arr = px * pitchUm * 1e-6;
  const W = 0.062, H = 0.095, L = 0.115;
  // (the body is the upper block and the grip under it; the barrel stands out of the front, which is where a camera's
  //  length actually goes)
  const bodyH = 0.058, bodyY = H / 2 - bodyH / 2, gripW = 0.05, gripH = H - bodyH, gripX = -0.012;
  const front = L / 2, barrelR = lens / 2 + 0.005, barrelL = 0.03, barrelX = front + barrelL / 2 - 0.006;
  const back = -L / 2, sc = 0.9;
  const parts: Part[] = [
    // the body in two shells, with the step between them where they meet: every moulded case has this line, and a case
    // without one reads as a solid lump
    B(`${nm} front shell`, [L * 0.42, bodyH, W], [L * 0.29, bodyY, 0], { mat: 'abs', color: 0x2f3338, finish: 'moulded', shell: 0.0022, says: 'the front half of the case, which carries the optics: it is screwed to the back half on a step, and that step is the line round every moulded instrument' }),
    B(`${nm} back shell`, [L * 0.58, bodyH - 0.0012, W - 0.0012], [-L * 0.21, bodyY, 0], { mat: 'abs', color: 0x33363b, finish: 'moulded', shell: 0.0022, says: 'the back half, a shade narrower where it goes inside the front: it carries the screen, the board and the battery' }),
    B(`${nm} grip`, [gripW, gripH, W * 0.78], [gripX, -H / 2 + gripH / 2, 0], { mat: 'abs', color: 0x2f3338, finish: 'moulded', shell: 0.0022, says: 'the grip: a thermal camera is held up at arm\'s length and pointed, so the weight is over the hand' }),
    ...[-1, 1].map((sz, i) => B(`${nm} grip pad ${i + 1}`, [gripW * 0.56, gripH * 0.6, 0.0025], [gripX, -H / 2 + gripH * 0.48, sz * (W * 0.39 + 0.0009)], { mat: 'rubber', color: 0x1b1d20, says: 'the rubber over-mould where it is held: a camera used up a ladder is dropped' })),
    // the optics: the barrel out in front, the lens down a well in it so the aperture is an opening and not a flat face
    CY(`${nm} lens barrel`, barrelR, barrelL, [barrelX, bodyY, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x33363b, finish: 'anodised', shell: 0.0015,
      cuts: [{ r: lens / 2 + 0.0012, depth: 0.009, at: [0, -barrelL / 2, 0], dir: [0, 1, 0] }],
      says: 'the barrel, threaded so the lens focuses: a thermal lens is moved, not zoomed, and it stands out of the body because germanium is thick' }),
    P(`${nm} focus ring`, ring(barrelR - 0.0005, barrelR + 0.0028, 0.009), { at: [barrelX - 0.004, bodyY, 0], rot: [0, 0, PI / 2] as Vec, facets: 24, mat: 'al-6061', color: 0x26292d, finish: 'anodised', says: 'the focus ring, knurled: it is turned with one finger while the picture is watched' }),
    CY(`${nm} lens`, lens / 2, 0.004, [barrelX + barrelL / 2 - 0.011, bodyY, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'germanium', color: 0x4a4f55, finish: 'polished', item: 'lens-germanium',
      says: `${(lens * 1000).toFixed(0)} mm clear at f/${fnum}: germanium, because ordinary glass is opaque past 2.5 µm and this camera works at 8 to 14. It is why the lens costs more than the rest of the optics put together` }),
    B(`${nm} detector package`, [0.012, 0.022, 0.022], [L * 0.26, bodyY, 0], { mat: 'kovar', color: 0x5a5e63, item: 'bolometer-array',
      says: `the array in its vacuum package: ${px} detectors of ${pitchUm} µm, ${(arr * 1000).toFixed(1)} mm across. Each is a bridge of vanadium oxide on legs so thin that the heat arriving changes its resistance; the vacuum is what stops the air carrying that heat away before it is read` }),
    B(`${nm} shutter`, [0.0012, 0.02, 0.02], [L * 0.33, bodyY, 0], { mat: 'al-6061', color: 0x8f949a, says: 'the flag that swings across the lens every few minutes: the camera photographs a surface of known temperature to take its own drift out. The click heard in use is this' }),
    B(`${nm} main board`, [0.05, 0.0016, 0.045], [-0.004, bodyY - 0.022, 0], { mat: 'fr4', color: 0x14301f, item: 'pcb-bare', says: 'the read-out and the image processing: its chips not drawn apart' }),
    // the screen, sunk behind its own bezel: a flat quad on a flat back reads as a sticker, a recess reads as a screen
    ...[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([a, b], i) => B(`${nm} screen bezel ${i + 1}`, a ? [0.0035, 0.056, 0.004] : [0.0035, 0.004, 0.05], [back - 0.0017, bodyY + (b ? b * 0.026 : 0), a ? a * 0.023 : 0], { mat: 'abs', color: 0x1b1d20, finish: 'moulded', says: 'one side of the bezel the screen sits down inside' })),
    B(`${nm} screen`, [0.0025, 0.048, 0.042], [back - 0.0008, bodyY, 0], { mat: 'glass', color: 0x1b2026, finish: 'polished', says: 'its glass, its backlight and its driver not drawn apart. A 3.5-inch screen on the back: what the camera is for is the picture, and the picture is false colour over a scale the operator sets' }),
    ...[-1, 1].flatMap((sy) => [-1, 1].map((sz, i) => screw(`${nm} case screw ${sy > 0 ? i + 3 : i + 1}`, 0.004, 0.004, [back - 0.0015, bodyY + sy * 0.026, sz * 0.026], { rot: [0, 0, -PI / 2] as Vec, says: 'one of the four that hold the two shells together, in the back where they are reached' }))),
    B(`${nm} battery`, [0.062, 0.018, 0.034], [gripX, -H / 2 + gripH * 0.5, 0], { mat: 'battery', color: 0x1a1a22, says: 'its cells not drawn apart, in the grip where the weight belongs. A few hours; a cooled camera would be minutes' }),
    B(`${nm} trigger`, [0.011, 0.016, 0.016], [gripX + gripW / 2 + 0.004, -H / 2 + gripH * 0.74, 0], { mat: 'abs', color: 0xc8512b, finish: 'moulded', says: 'the trigger, under the first finger: it takes the picture, and in most cameras it also wakes the shutter' }),
    // the ports: a thermal camera is read out and charged, and both go through one flap in the side
    B(`${nm} port well`, [0.026, 0.012, 0.003], [-L * 0.2, bodyY - 0.012, W / 2 - 0.0012], { mat: 'abs', color: 0x14161a, finish: 'moulded', says: 'the well the connectors sit in, so a plug does not stand on the case' }),
    B(`${nm} usb socket`, [0.009, 0.0033, 0.0026], [-L * 0.2 - 0.006, bodyY - 0.012, W / 2 - 0.0016], { mat: 'steel-low', color: 0xb9bcc0, finish: 'plate', says: 'USB-C: the pictures come off here, and the battery charges through it' }),
    B(`${nm} card slot`, [0.013, 0.0022, 0.0022], [-L * 0.2 + 0.007, bodyY - 0.012, W / 2 - 0.0016], { mat: 'steel-low', color: 0x8b8f94, finish: 'plate', says: 'the microSD slot: a radiometric picture is a megabyte of temperatures, not a photograph' }),
    B(`${nm} port flap`, [0.03, 0.016, 0.0022], [-L * 0.2, bodyY - 0.0012, W / 2 - 0.0005], { mat: 'rubber', color: 0x1b1d20, says: 'the rubber flap over them, which is all the sealing a handheld camera has' }),
    // the tripod boss and the lanyard lug: how it is put on a stand and how it is kept from falling
    P(`${nm} tripod boss`, { cyl: [0.008, 0.005] }, { at: [gripX, -H / 2 + 0.0025, 0], mat: 'brass', color: 0xb08d57, finish: 'plate',
      cuts: [{ r: 0.00318, depth: 0.005, at: [0, -0.0025, 0], dir: [0, 1, 0] }], says: 'a 1/4-20 brass insert in the foot: a camera left watching a switchboard is on a tripod' }),
    P(`${nm} lanyard lug`, { torus: [0.005, 0.0016] }, { at: [-L * 0.36, bodyY + bodyH / 2 - 0.0031, -W * 0.36], rot: [0, 0, PI / 2] as Vec, mat: 'steel-low', color: 0x8b8f94, says: 'the lug the strap goes through, standing out of the top: the camera is held over live gear, and a dropped one lands on the gear' }),
    B(`${nm} plate`, [0.05, 0.0006, 0.028], [-L * 0.1, bodyY + bodyH / 2 + 0.0003, 0], { mat: 'pet', color: 0x1b1d20, text: `${px} px`, ink: 0xd8d9db, says: 'its plate on the top: the array, the lens and what it is sold as' }),
  ];
  void sc;
  const kg = camKg(px, fMm), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} laser, strap and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: its aiming laser and visible camera, its strap, its keypad and the rest of its screws (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${cam.says}. ${glow(293.15).says}. ${HAZARDS.infrared!.join('. ')}` })];
}
/** How big a handheld thermal camera is, mm: its body 115 × 95 × 62, and its lens barrel standing out in front of
 *  that — which is where a camera's length really goes, and it grows with the lens. */
export function camBox(px: number, pitchUm: number, fMm: number, fnum = 1.0): Vec {
  void px; void pitchUm;
  const lens = (fMm / fnum) * mm, barrelR = lens / 2 + 0.005;
  const L = 0.115, nose = L / 2 + 0.03 - 0.006, W = 0.062, H = 0.095;
  // (its length is the body plus the barrel in front and the screen's bezel behind; its height the body plus the strap
  //  lug standing out of the top)
  return [+((nose + L / 2 + 0.004) * 1000).toFixed(0), +((H + 0.0035) * 1000).toFixed(0), +((Math.max(W, 2 * barrelR) + 0.001) * 1000).toFixed(0)] as Vec;
}
/** What a handheld thermal camera weighs, kg: an estimate of the class, fitted to what makers publish — a 160 × 120
 *  pocket camera at about 0.3 kg, a 640 × 480 with a real lens at about 0.9. Its array costs it little; its lens,
 *  battery and body are the mass. */
export const camKg = (px: number, fMm: number): number => +(0.26 + (px / 640) * 0.35 + (fMm / 13) * 0.18).toFixed(3);

/**
 * A Fourier-transform infrared spectrometer: a hot source, a Michelson interferometer (a beamsplitter that sends half
 * the light each way, a fixed mirror and one that moves), a sample compartment, and a detector. There is no grating
 * and no slit — every wavelength is measured at once, all the time, which is why an FTIR takes a spectrum in a second
 * where a scanning instrument takes minutes. Drawn on a bench, the beam going round in the x–z plane: the cast base
 * stands proud of the cover as the plinth it is, the sample compartment's lid is the hatch in the top that is opened
 * every time it is used, and the display, the switch and the purge and power inlets are where a bench instrument has
 * them.
 */
export function ftirParts(nm: string, resCm: number, detector: 'DTGS' | 'MCT' = 'DTGS'): Part[] {
  const f = ftir(resCm);
  // (the bench is as long as the mirror's travel asks: 1.25 mm each way at 4 cm⁻¹ and 20 at 0.25, and the rest of the
  //  instrument is laid round that. A routine instrument is a box a third of a metre across; a research one is twice
  //  that in every direction, and ten times the mass)
  const W = 0.34 + (f.travel / 1000) * 8, D = 0.28 + W * 0.36, H = 0.2 + W * 0.1;
  const plinth = 0.03, wall = 0.003, iW = W - 2 * wall, iD = D - 2 * wall, deck = plinth + 0.012;
  // (the cover stands on the base, 8 mm narrower, so the base shows as the plinth it is: its own faces are what
  //  anything on the outside is placed against)
  const fz = (D - 0.008) / 2, fx = (W - 0.008) / 2;
  const coverH = H - plinth, coverY = plinth + coverH / 2, topY = H;
  const travel = (f.travel / 1000) * 2; // (the mirror's stroke either side of zero path difference)
  // the sample compartment, and the hatch over it in the cover's top: the one part of an FTIR a person touches
  const sc = Math.min(0.2, iW * 0.46), scX = -iW * 0.06, scZ = iD * 0.16;
  const parts: Part[] = [
    B(`${nm} base`, [W, plinth, D], [0, plinth / 2, 0], { mat: 'cast-iron', color: 0x3c4045, finish: 'cast', fill: 0.45, says: 'a cast base, standing a little out from the cover it carries: an interferometer is a ruler made of light, and anything that moves the mirrors a fraction of a wavelength is a line in the spectrum that is not there' }),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => CY(`${nm} foot ${i + 1}`, 0.016, 0.009, [sx! * (W / 2 - 0.03), -0.0045, sz! * (D / 2 - 0.03)], { mat: 'rubber', color: 0x1b1d20, says: 'one of four rubber feet: a bench instrument is set down on a bench that is never quite flat' })),
    P(`${nm} source`, { cyl: [0.004, 0.02] }, { at: [-iW * 0.36, deck, -iD * 0.26], mat: 'silicon-carbide', color: 0xd8703a, glow: true, item: 'ir-glower',
      says: 'a silicon carbide glower at about 1200 °C: a black body, because what is wanted is every infrared wavelength at once' }),
    P(`${nm} source mirror`, { lathe: [[0, 0], [0.016, 0.002], [0.016, 0.004], [0, 0.004]] }, { at: [-iW * 0.36, deck, -iD * 0.1], rot: [PI / 2, 0, 0] as Vec, mat: 'al-6061', color: 0xd6d9dc, finish: 'chrome', says: 'gold on glass, off-axis: mirrors and not lenses, because a lens of any glass would swallow the band' }),
    B(`${nm} beamsplitter`, [0.05, 0.05, 0.004], [-iW * 0.1, deck + 0.02, -iD * 0.1], { rot: [0, PI / 4, 0] as Vec, mat: 'kbr', color: 0xcfd6dc, finish: 'polished', item: 'beamsplitter-kbr',
      says: 'potassium bromide with a germanium coating, at 45°: half the light to each mirror. KBr because it is transparent from 0.25 to 25 µm — and it dissolves in the moisture of a breath, which is why the bench is purged with dry air for its whole life' }),
    B(`${nm} fixed mirror`, [0.04, 0.04, 0.006], [-iW * 0.1, deck + 0.02, -iD * 0.3], { mat: 'al-6061', color: 0xd6d9dc, finish: 'chrome', says: 'one arm: it does not move, and it is aligned once' }),
    B(`${nm} moving mirror`, [0.04, 0.04, 0.006], [iW * 0.12, deck + 0.02, -iD * 0.1], { rot: [0, PI / 2, 0] as Vec, mat: 'al-6061', color: 0xd6d9dc, finish: 'chrome',
      travel: { slide: { dir: [1, 0, 0], from: -travel / 2, to: travel / 2 } },
      says: `the other arm: it travels ${(f.travel).toFixed(1)} mm each way on an air bearing, and that travel is the resolution. ${resCm} cm⁻¹ asks for this much and no less` }),
    CY(`${nm} air bearing`, 0.018, 0.08, [iW * 0.2, deck + 0.02, -iD * 0.1], { rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x8f949a, finish: 'anodised', joint: 'slide', says: 'the mirror floats on a film of air: nothing touches, so nothing wears and nothing sticks' }),
    P(`${nm} reference laser`, { cyl: [0.012, 0.09] }, { at: [-iW * 0.36, deck + 0.05, iD * 0.08], rot: [0, 0, PI / 2] as Vec, mat: 'glass', color: 0xc0392b, glow: true, item: 'helium-neon-laser',
      says: 'a helium–neon laser at 632.8 nm down the same path: the scan is sampled on its fringes, so the instrument measures its mirror against a wavelength and not against a scale it might have drifted from' }),
    B(`${nm} sample compartment`, [sc, 0.12, sc], [scX, deck + 0.06, scZ], { mat: 'al-6061', color: 0x2f3338, finish: 'crinkle', shell: 0.002, says: 'where what is being looked at goes: in the beam, in dry air, with nothing of its own in the way' }),
    B(`${nm} sample window`, [0.05, 0.05, 0.004], [scX - sc / 2 - 0.002, deck + 0.06, scZ], { mat: 'zinc-selenide', color: 0xd8a24a, finish: 'polished', says: 'zinc selenide: it passes the band and does not dissolve, which is what a window into a sample has to do' }),
    B(`${nm} detector`, [0.03, 0.04, 0.03], [iW * 0.34, deck + 0.04, iD * 0.14], { mat: 'kovar', color: 0x5a5e63, item: detector === 'MCT' ? 'mct-detector' : 'dtgs-detector',
      says: detector === 'MCT' ? 'mercury cadmium telluride in a dewar of liquid nitrogen: a hundred times more sensitive, and it must be filled every day' : 'deuterated triglycine sulfate at room temperature: it reads the heat of the beam through a pyroelectric crystal, and it is what most instruments carry because it needs nothing' }),
    B(`${nm} electronics`, [iW * 0.42, 0.08, iD * 0.46], [iW * 0.24, deck + 0.05, -iD * 0.2], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.0015, says: 'the amplifier, the converter and the computer that does the transform: its boards not drawn apart' }),
    // the cover, standing on the base, with the hatch cut out of its top for the sample compartment
    B(`${nm} cover`, [W - 0.008, coverH, D - 0.008], [0, coverY, 0], { mat: 'abs', color: 0xd8d9db, finish: 'moulded', shell: 0.003,
      cuts: [{ r: (sc + 0.016) / 2, depth: 0.01, at: [scX, coverH / 2, scZ], dir: [0, -1, 0], n: 4 }],
      says: 'the cover: it keeps the purge in and the room\'s air out, and the hatch in its top is cut square over the sample compartment' }),
    // the hatch: hinged at the back, latched at the front, with a window in it, because a sample is looked at as it runs
    B(`${nm} hatch`, [sc + 0.012, 0.014, sc + 0.012], [scX, topY + 0.004, scZ], { mat: 'abs', color: 0xc9cbce, finish: 'moulded', shell: 0.0025, joint: 'hinge', says: 'the lid over the sample compartment: it is lifted every time the instrument is used, which is why it is the one part of an FTIR that wears out' }),
    B(`${nm} hatch window`, [sc * 0.44, 0.003, sc * 0.44], [scX, topY + 0.012, scZ], { mat: 'pmma', color: 0x2a3138, finish: 'polished', says: 'a window in the lid: the sample is watched while it runs, and the beam is infrared, so the window can be plastic' }),
    ...[-1, 1].map((sx, i) => CY(`${nm} hatch hinge ${i + 1}`, 0.007, 0.024, [scX + sx * sc * 0.3, topY + 0.006, scZ - sc / 2 - 0.003], { rot: [0, 0, PI / 2] as Vec, mat: 'steel-low', color: 0x8b8f94, finish: 'ground', joint: 'hinge', says: 'one of its two hinge knuckles, at the back where the lid folds away from the operator' })),
    CY(`${nm} hatch handle`, 0.005, 0.07, [scX, topY + 0.015, scZ + sc / 2 - 0.004], { rot: [0, 0, PI / 2] as Vec, mat: 'abs', color: 0x3c4046, finish: 'moulded', says: 'the handle the lid is lifted by: it is opened for every sample run, which is why it is the one part of an FTIR that wears out' }),
    ...[-1, 1].map((sx, i) => B(`${nm} hatch handle post ${i + 1}`, [0.008, 0.009, 0.008], [scX + sx * 0.03, topY + 0.0105, scZ + sc / 2 - 0.004], { mat: 'abs', color: 0x3c4046, finish: 'moulded', says: 'one of its two posts' })),
    B(`${nm} hatch latch`, [0.03, 0.009, 0.012], [scX, topY + 0.006, scZ + sc / 2 + 0.006], { mat: 'nylon', color: 0x3c4046, finish: 'moulded', says: 'the latch at the front: the purge is worth keeping, so the lid is held down and not just laid on' }),
    // the front: the display sunk behind its bezel, its keys, the switch, and the name plate
    ...[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([a, b], i) => B(`${nm} display bezel ${i + 1}`, a ? [0.004, 0.05, 0.005] : [0.1, 0.005, 0.005], [-W * 0.26 + (a ? a * 0.048 : 0), coverY + 0.03 + (b ? b * 0.0225 : 0), fz + 0.0025], { mat: 'abs', color: 0x9ca0a4, finish: 'moulded', says: 'one side of the bezel the display sits down inside' })),
    B(`${nm} display`, [0.092, 0.04, 0.0035], [-W * 0.26, coverY + 0.03, fz + 0.0012], { mat: 'glass', color: 0x161b20, finish: 'polished', says: 'what the instrument says of itself when no computer is on it: the scan, the purge and whether the laser has locked' }),
    ...[0, 1, 2, 3].map((k) => CY(`${nm} key ${k + 1}`, 0.006, 0.0035, [-W * 0.26 + (k - 1.5) * 0.018, coverY - 0.004, fz + 0.0015], { rot: [PI / 2, 0, 0] as Vec, mat: 'abs', color: 0x3c4046, finish: 'moulded', says: 'one of the four keys under it: scan, background, purge and stop' })),
    B(`${nm} switch`, [0.019, 0.011, 0.004], [W * 0.38, coverY - 0.012, fz + 0.0015], { mat: 'abs', color: 0x1b1d20, finish: 'moulded', says: 'the power switch, lit when it is on: an FTIR is left on, because a cold bench drifts' }),
    B(`${nm} name plate`, [0.15, 0.018, 0.0008], [W * 0.14, coverY + 0.03, fz + 0.0004], { mat: 'pet', color: 0x1b1d20, text: 'FTIR SPECTROMETER', says: 'its name across the front, where every bench instrument carries it: an instrument no one can name from across the room is an instrument no one trusts' }),
    B(`${nm} plate`, [0.066, 0.0006, 0.02], [W * 0.17, topY + 0.0003, D * 0.38], { mat: 'pet', color: 0x2f3338, text: `${resCm} cm-1`, ink: 0xe8eaec, says: 'its plate: what it is, its resolution and its serial' }),
    // the back: the inlet, the purge fitting and the fan, and the screws that open it
    B(`${nm} inlet`, [0.05, 0.028, 0.006], [-W * 0.3, coverY - 0.02, -fz - 0.003], { mat: 'pbt', color: 0x1b1d20, finish: 'moulded',
      cuts: [{ r: 0.011, depth: 0.005, at: [0, 0, -0.003], dir: [0, 0, 1] }], item: 'connector-housing', says: 'the mains inlet with its fuse: an IEC socket, because every bench instrument in the world takes the same lead' }),
    ...[0, 1, 2].map((k) => CY(`${nm} inlet pin ${k + 1}`, 0.0009, 0.008, [-W * 0.3 + (k - 1) * 0.0071, coverY - 0.02 + (k === 1 ? 0.004 : -0.002), -fz - 0.0015], { rot: [PI / 2, 0, 0] as Vec, mat: 'brass', color: 0xc9a227, finish: 'plate', says: 'one of its three: live, neutral and the earth that is longer than the others' })),
    P(`${nm} purge fitting`, { cyl: [0.007, 0.016] }, { at: [W * 0.1, coverY - 0.02, -fz - 0.008], rot: [PI / 2, 0, 0] as Vec, facets: 6, mat: 'brass', color: 0xb08d57, finish: 'plate', says: 'the purge inlet: dry air or nitrogen, 0.5 litres a minute for the whole of the instrument\'s life, because the beamsplitter is a salt' }),
    CY(`${nm} purge nipple`, 0.0035, 0.012, [W * 0.1, coverY - 0.02, -fz - 0.021], { rot: [PI / 2, 0, 0] as Vec, mat: 'brass', color: 0xc9a227, finish: 'plate', says: 'its hose nipple, where the line from the air drier goes on' }),
    CY(`${nm} fan guard`, 0.03, 0.004, [W * 0.3, coverY + 0.02, -fz - 0.002], { rot: [PI / 2, 0, 0] as Vec, mat: 'steel-low', color: 0x3c4046, finish: 'plate', shell: 0.0008, says: 'the fan guard: the electronics are the only thing in here that wants cooling, and the bench wants to be left alone' }),
    ...[0, 1, 2, 3, 4].map((k) => B(`${nm} vent ${k + 1}`, [0.004, 0.05, 0.0025], [fx + 0.0004, coverY + 0.01, -D * 0.1 + (k - 2) * 0.012], { rot: [0, 0, 0] as Vec, mat: 'abs', color: 0x4a4e53, finish: 'moulded', says: 'one of the louvres in the side: what the fan draws through' })),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy, i) => screw(`${nm} cover screw ${sx > 0 ? i + 3 : i + 1}`, 0.005, 0.005, [sx * (W / 2 - 0.016), coverY + sy * (coverH / 2 - 0.016), -fz - 0.002], { rot: [-PI / 2, 0, 0] as Vec, says: 'one of the four that hold the cover down, in the back where an instrument is opened' }))),
    // and the lead it runs on: an instrument with no cable anywhere is the tell a blind judge named first
    P(`${nm} mains boot`, { lathe: [[0, 0], [0.009, 0], [0.009, 0.008], [0.0055, 0.03], [0, 0.03]] }, { at: [-W * 0.3, coverY - 0.02, -fz + 0.0004], rot: [PI / 2, 0, 0] as Vec, mat: 'rubber', color: 0x1b1d20, says: 'the moulded plug on its lead, in the inlet' }),
    CY(`${nm} mains lead`, 0.0045, 0.09, [-W * 0.3, coverY - 0.052, -fz - 0.044], { rot: [PI / 2 - 0.6, 0, 0] as Vec, mat: 'rubber', color: 0x24262a, says: 'its lead, down to the bench behind it: an FTIR is left on, because a cold bench drifts' }),
  ];
  const kg = ftirKg(resCm), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} purge, optics mounts and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${(kg - drawn).toFixed(1)} kg not drawn apart: its purge manifold and desiccant, the kinematic mounts under every mirror and its power supply (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${f.says}. ${HAZARDS.spectrometer!.join('. ')}` })];
}
/** How big a benchtop FTIR of this resolution is, mm: its bench is its mirror's travel, and the instrument is laid
 *  round that, so a 4 cm⁻¹ box is a third of a metre across and a 0.25 one half a metre. */
export function ftirBox(resCm: number): Vec {
  const W = 0.34 + (ftir(resCm).travel / 1000) * 8, D = 0.28 + W * 0.36, H = 0.2 + W * 0.1;
  return [+((W + 0.002) * 1000).toFixed(0), +((H + 0.029) * 1000).toFixed(0), +((D + 0.0885) * 1000).toFixed(0)] as Vec;
}
/** What a benchtop FTIR weighs, kg: an estimate of the class — a routine instrument is about 25 kg and a research one
 *  with a long bench and a cooled detector about 45. Resolution is what makes it bigger: the mirror's travel sets the
 *  bench's length, and the bench is the mass. */
export const ftirKg = (resCm: number): number => +(22 + 8 / Math.max(0.125, resCm)).toFixed(1);

/** How big a spinning lidar of this many channels is: Velodyne's own 103 × 72 mm for the 16-channel VLP-16 and
 *  103 × 87 for the 32-channel VLP-32C; above that the fan of channels will not fit a puck and the instrument is a
 *  bigger body in every direction (an estimate of the class, between the VLP-32C and the 165 × 110 mm VLS-128).
 *  Below 16 is not this instrument: a single-beam 2D scanner (Hokuyo's UST-10LX, 130 g in a 60 mm body; SICK's TiM) is
 *  a different body with a different mass law, and the kind keeps it off its grid rather than make it fit these. */
export const lidarSize = (channels: number): { D: number; H: number } =>
  channels <= 16 ? { D: 0.103, H: 0.072 } : channels <= 32 ? { D: 0.103, H: 0.087 } : { D: 0.145, H: 0.105 };

/**
 * A scanning lidar, the kind that turns: a base with its connector and motor, flanged and bolted down, a head that
 * spins on it carrying the laser diodes and their detectors in two blocks, and a window round the head those blocks
 * look out through — each channel its own lens behind the glass, which is what a lidar looks like when it is looked
 * into. Sized by Velodyne's published figures for the VLP-16: 103 mm across, 72 mm tall, 830 g. Drawn standing on its
 * base, the axis up.
 */
export function lidarParts(nm: string, channels: number, rpm: number, o: { apertureMm?: number; nm?: 905 | 1550 } = {}): Part[] {
  const { D, H } = lidarSize(channels), ap = o.apertureMm ?? 25, wave = o.nm ?? 905;
  const shown = Math.min(channels, 32), bandH = Math.min(H * 0.42, Math.max(0.018, channels * 0.0016));
  const headLo = H * 0.325, headHi = H - 0.006, bandY = (headLo + headHi) / 2, headR = D / 2 - 0.014, glass = 0.002, shroud = D / 2 - 0.001;
  const yOf = (i: number) => bandY + (i / Math.max(1, shown - 1) - 0.5) * bandH * 0.72;
  const parts: Part[] = [
    // the base: it does not turn, it is what the instrument is bolted down by, and everything that leaves leaves through it
    CY(`${nm} base`, D / 2, H * 0.3, [0, 0.006 + H * 0.15, 0], { mat: 'al-6061', color: 0x33363b, finish: 'anodised', shell: 0.003, says: 'the base: it does not turn, and everything that leaves the instrument leaves through it' }),
    P(`${nm} base flange`, { lathe: [[0, 0], [D / 2 + 0.009, 0], [D / 2 + 0.009, 0.004], [D / 2 - 0.002, 0.007], [0, 0.007]] }, { at: [0, 0, 0], mat: 'al-6061', color: 0x2a2d31, finish: 'anodised',
      cuts: [0, 1, 2, 3].map((k) => { const a = (k / 4) * 2 * PI + PI / 4; return { r: 0.0033, depth: 0.008, at: [(D / 2 + 0.0045) * Math.cos(a), 0.0075, (D / 2 + 0.0045) * Math.sin(a)] as Vec, dir: [0, -1, 0] as Vec }; }),
      says: `the flange it is bolted down by: four M6 on a ${((D + 0.009) * 1000).toFixed(0)} mm circle, clear of the body so a key can reach them, and a lidar that is not bolted down reads a world that rolls` }),
    ...[0, 1, 2, 3].map((k) => { const a = (k / 4) * 2 * PI + PI / 4; return screw(`${nm} mounting screw ${k + 1}`, 0.01, 0.006, [(D / 2 + 0.0045) * Math.cos(a), 0.007, (D / 2 + 0.0045) * Math.sin(a)], { says: 'one of the four M6 screws that hold it down, its head standing on the flange where a key reaches it' }); }),
    CY(`${nm} alignment pin`, 0.002, 0.008, [0, 0.001, -(D / 2 - 0.02)], { mat: 'steel-low', color: 0x8b8f94, finish: 'ground', says: 'the pin that fixes which way round it goes on: a lidar\'s own frame has to be known to a tenth of a degree, and a bolt circle alone does not say it' }),
    CY(`${nm} motor stator`, D * 0.3, 0.014, [0, H * 0.3, 0], { mat: 'steel-electrical', color: 0x5a5e63, fill: 0.5, item: 'lamination-stack', says: `the brushless motor that spins the head at ${rpm} rev/min: ${(rpm / 60).toFixed(0)} turns a second, which is the frame rate` }),
    CY(`${nm} slip ring`, D * 0.16, 0.016, [0, H * 0.4, 0], { mat: 'brass', color: 0xc9a227, finish: 'plate', item: 'slip-ring', says: 'power up and data down through rings and brushes, because the head turns for ever and a cable cannot' }),
    // the step where the spinning part begins: the one line on the outside that says which half turns
    P(`${nm} shroud step`, ring(D / 2 - 0.004, D / 2, 0.003), { at: [0, H * 0.31, 0], mat: 'al-6061', color: 0x24262a, finish: 'anodised', says: 'the step between the base and what turns on it: the gap is 0.4 mm, and it is the only thing on the outside that says half of this spins' }),
    // the spinning shroud, above and below the window: the outside of the head is one drum with a band of glass let
    // into it. Drawn without it, there was an open annulus between the cap and the core that could be seen down into
    P(`${nm} shroud lower`, ring(shroud - 0.0025, shroud, bandY - bandH / 2 - headLo), { at: [0, (headLo + bandY - bandH / 2) / 2, 0], mat: 'al-6061', color: 0x2f3338, finish: 'anodised', says: 'the lower half of what turns: the outside of a lidar is a drum, and the window is the band cut out of it' }),
    P(`${nm} shroud upper`, ring(shroud - 0.0025, shroud, headHi - (bandY + bandH / 2)), { at: [0, (headHi + bandY + bandH / 2) / 2, 0], mat: 'al-6061', color: 0x2f3338, finish: 'anodised', says: 'the upper half, up to the cap it carries' }),
    // what turns inside it: a core narrower than the window, so what is behind the glass is the blocks and not a wall
    P(`${nm} head`, ring(headR - 0.0025, headR, headHi - headLo), { at: [0, bandY, 0], mat: 'al-6061', color: 0x4a4e53, finish: 'anodised', says: 'what turns: the lasers, the detectors and their boards all ride round together, so every channel sees the same angle at the same time' }),
    // the emitter block and the receiver block, each with its own lenses out at the glass
    ...[1, -1].flatMap((side) => [
      B(`${nm} ${side > 0 ? 'emitter' : 'receiver'} block`, [0.014, bandH * 0.96, 0.05], [side * (D / 2 - 0.012), bandY, 0], { mat: 'pbt', color: 0x14161a, finish: 'moulded', says: side > 0 ? 'the emitter block: every laser in the instrument is potted in this one moulding, each aimed a fraction of a degree from its neighbour' : 'the receiver block: each detector behind its own lens, looking exactly where its own laser points' }),
      ...Array.from({ length: shown }, (_, i) => CY(`${nm} ${side > 0 ? 'emitter' : 'receiver'} lens ${i + 1}`, Math.max(0.0028, Math.min(0.007, bandH / (shown * 1.8))), 0.003, [side * (D / 2 - 0.0052), yOf(i), 0], { rot: [0, 0, PI / 2] as Vec, mat: 'pmma', color: 0xa8bac6, finish: 'polished', item: side > 0 ? undefined : 'lens-plastic',
        says: side > 0 ? `the lens over one laser: ${shown === channels ? channels : `${shown} of ${channels}`} of them in a column, which is what is seen looking into the window` : `${ap} mm across between them all: the whole of the return a lidar gets is what these gather, and the range equation goes as their area` })),
    ]),
    ...Array.from({ length: shown }, (_, i) => B(`${nm} laser ${i + 1}`, [0.004, 0.003, 0.004], [D * 0.22, yOf(i), 0], { mat: 'silicon', color: 0x3a3d42,
      says: `a ${wave} nm pulsed diode in its can, its chip and submount not drawn apart: one of ${channels}, aimed a little above or below its neighbours: the fan of beams is what makes a line out of a point` })),
    ...Array.from({ length: shown }, (_, i) => B(`${nm} detector ${i + 1}`, [0.004, 0.003, 0.004], [-D * 0.22, yOf(i), 0], { mat: 'silicon', color: 0x2a2d32, item: 'photodiode-apd',
      says: 'an avalanche photodiode: it multiplies the few thousand photons that come back into a pulse a circuit can time' })),
    // the baffles between the two sides, which is why a lidar does not blind itself with its own pulse
    ...[-1, 1].map((sz, i) => B(`${nm} baffle ${i + 1}`, [D * 0.44, bandH * 0.9, 0.003], [0, bandY, sz * 0.027], { mat: 'abs', color: 0x101214, finish: 'moulded', says: 'a baffle between the emitter and the receiver: a watt of pulse leaving beside a nanowatt coming back would swamp it' })),
    P(`${nm} window`, { lathe: [[D / 2 - glass, -bandH / 2], [D / 2, -bandH / 2], [D / 2, bandH / 2], [D / 2 - glass, bandH / 2], [D / 2 - glass, -bandH / 2]] }, { at: [0, bandY, 0], mat: 'pc', color: 0x33383d, finish: 'polished', says: 'the band the beams leave and return through: 2 mm of polycarbonate, tinted, because it passes the infrared and keeps daylight and curiosity out' }),
    // the cap: flush with the head, not a lid on a jar, with its screws and its marks
    CY(`${nm} cap`, shroud, 0.003, [0, H - 0.0015, 0], { mat: 'al-6061', color: 0x33363b, finish: 'anodised', says: 'the top cap, flush with the head it closes: a cap that stood out would be the first thing knocked off' }),
    ...screwsY(`${nm} cap`, 4, shroud * 0.6, H - 0.0005, 0.004, 'one of the four that hold the cap on: the head is opened to aim the channels, and nothing else is'),
    B(`${nm} cap plate`, [0.05, 0.0004, 0.02], [0, H + 0.0002, -0.016], { mat: 'pet', color: 0x26292d, text: `${channels}ch ${wave}nm`, ink: 0xd8d9db, says: 'its plate on the top: the channels, the wavelength and its serial' }),
    B(`${nm} laser label`, [0.034, 0.0004, 0.014], [0, H + 0.0002, 0.018], { mat: 'pet', color: 0xf0c419, text: 'LASER', ink: 0x17191c, says: 'the laser label every one of these carries: a Class 1 instrument is safe as its maker set it up, and is not safe once it is opened' }),
    B(`${nm} board`, [D * 0.6, 0.0016, D * 0.6], [0, H * 0.46, 0], { mat: 'fr4', color: 0x14301f, item: 'pcb-bare', says: 'the head\'s board: the drivers, the timing circuits and the processor that turns times into points' }),
    // the connector, standing out of the base where a cable can reach it, with its coupling ring and its tail
    P(`${nm} connector boss`, ring(0.009, 0.015, 0.008), { at: [D / 2 - 0.004, 0.007 + H * 0.16, 0], rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x2a2d31, finish: 'anodised', says: 'the machined boss the connector is sealed into: the one hole in the case, and the one place water gets in if it is not' }),
    CY(`${nm} connector`, 0.0085, 0.014, [D / 2 + 0.002, 0.007 + H * 0.16, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'pbt', color: 0x17191c, finish: 'moulded',
      cuts: [{ r: 0.0058, depth: 0.005, at: [0, -0.007, 0], dir: [0, 1, 0] }], item: 'connector-housing', says: 'power and Ethernet: a lidar is a camera that talks in packets, and this is the only hole in the case' }),
    P(`${nm} connector ring`, ring(0.0087, 0.0105, 0.006), { at: [D / 2 + 0.0105, 0.007 + H * 0.16, 0], rot: [0, 0, PI / 2] as Vec, facets: 14, mat: 'steel-low', color: 0x8b8f94, finish: 'plate', says: 'its knurled coupling ring: a sensor on a vehicle is shaken for its whole life, and a plug that is not screwed down comes off' }),
    ...[0, 1, 2, 3].map((k) => { const a = (k / 4) * 2 * PI + PI / 4; return CY(`${nm} connector pin ${k + 1}`, 0.0007, 0.006, [D / 2 + 0.0015, 0.007 + H * 0.16 + 0.0028 * Math.cos(a), 0.0028 * Math.sin(a)], { rot: [0, 0, PI / 2] as Vec, mat: 'brass', color: 0xc9a227, finish: 'plate', says: 'one of its contacts: two pairs for the Ethernet and two for the power' }); }),
    // and the cable in it, because a sensor with no cable is a sensor that does nothing
    P(`${nm} cable boot`, { lathe: [[0, 0], [0.009, 0], [0.009, 0.006], [0.0055, 0.022], [0, 0.022]] }, { at: [D / 2 + 0.0135, 0.007 + H * 0.16, 0], rot: [0, 0, -PI / 2] as Vec, mat: 'rubber', color: 0x1b1d20, says: 'the moulded boot over the plug: what stops the cable being bent where it leaves' }),
    CY(`${nm} cable`, 0.0048, 0.05, [D / 2 + 0.057, 0.007 + H * 0.16 - 0.008, 0], { rot: [0, 0, PI / 2 - 0.3] as Vec, mat: 'rubber', color: 0x24262a, says: 'power in and a hundred megabits of points out, down one cable' }),
  ];
  const kg = lidarKg(channels), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} wiring, bearings and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: the head's bearings, its wiring, its potting and the rest of its screws (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts)];
}
/** How big a spinning lidar is, mm: its own body, with its flange and its connector standing out of it. */
export function lidarBox(channels: number): Vec {
  const { D, H } = lidarSize(channels);
  return [+((D + 0.009 + 0.082) * 1000).toFixed(0), +((H + 0.0035) * 1000).toFixed(0), +((D + 0.018) * 1000).toFixed(0)] as Vec;
}
/** What a spinning lidar weighs, kg: two straight lines through makers' published figures, because a lidar's mass is
 *  its housing and the housing changes class at about 32 channels. To 32 it is a puck: Velodyne's 830 g for the
 *  16-channel VLP-16 and about 925 g for the 32-channel VLP-32C, which is 0.78 kg plus 4.5 g a channel. Past 32 the
 *  fan of beams no longer fits a puck and the instrument is a bigger body in every direction, so the line runs from
 *  that VLP-32C to Velodyne's 128-channel Alpha Prime (VLS-128, 165 × 110 mm, about 3.5 kg): 26.8 g a channel, which
 *  puts a 64-channel head at 1.8 kg — between Hesai's Pandar64 and the Alpha Prime, where the makers' own figures are. */
export const lidarKg = (channels: number): number =>
  +(channels <= 32 ? 0.78 + channels * 0.0045 : 0.925 + (channels - 32) * 0.0268).toFixed(3);

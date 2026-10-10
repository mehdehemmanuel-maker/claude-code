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

import type { Part, V3 as Vec } from './kits';
import { massOf } from './mass';

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

/**
 * A rotating-anode x-ray tube, as a medical or industrial set carries it: the insert (a vacuum envelope holding the
 * cathode's filament cup and a tungsten-faced disc on a molybdenum stem in bearings), the stator that turns that disc
 * from outside the glass, and the housing round it all — lead-lined, oil-filled, with a port where the beam leaves and
 * a collimator on it. Drawn on its own axis along x, the beam leaving downward (−y) through the port, which is how a
 * tube is hung over a table. kV and mA size the anode: the heat worked out above is what its disc must store.
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
    P(`${nm} housing`, { lathe: [[0, -HL / 2], [housing, -HL / 2], [housing, HL / 2], [0, HL / 2]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x2f3338, finish: 'crinkle', shell: 0.004, says: 'the housing: 4 mm of aluminium, lined with lead, holding the insert in oil' }),
    P(`${nm} lead lining`, { lathe: [[0, -HL / 2 + 0.005], [housing - 0.005, -HL / 2 + 0.005], [housing - 0.005, HL / 2 - 0.005], [0, HL / 2 - 0.005]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'lead', color: 0x6e7279, shell: lead, item: 'lead-sheet',
      says: `${(lead * 1000).toFixed(2)} mm of lead, which is what cuts a 100 keV beam to a thousandth of itself — every way but the port. A tube radiates in every direction; only the port is meant to` }),
    B(`${nm} port`, [0.05, 0.004, 0.05], [L * 0.1, -housing, 0], { mat: 'al-6061', color: 0xb9bcc0, item: 'xray-window', says: 'the window: aluminium, which also filters out the softest photons — the ones that would stop in the patient and do nothing but dose' }),
    B(`${nm} collimator`, [0.1, 0.07, 0.1], [L * 0.1, -housing - 0.04, 0], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.003, says: 'what shuts the beam down to the part being looked at: a beam wider than the film is dose for nothing' }),
    ...[-1, 1].flatMap((sx) => [0, 1].map((k) => B(`${nm} collimator leaf`, k === 0 ? [0.004, 0.05, 0.09] : [0.09, 0.05, 0.004], [L * 0.1 + (k === 0 ? sx * 0.03 : 0), -housing - 0.04, k === 0 ? 0 : sx * 0.03], { mat: 'lead', color: 0x6e7279, says: 'a lead leaf, one of four: they slide to make the field' }))),
    CY(`${nm} oil`, housing - 0.006, HL - 0.012, [0, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'oil-transformer', color: 0xc8b06a, fill: 0.35, says: 'transformer oil: it insulates the 100 kV from the housing and carries the anode\'s heat out to the wall of it. Filled to the share the insert leaves' }),
    // (the two receptacles stand out of the ends, where the cables go in: a tube head is recognised by them)
    ...[-1, 1].map((sx, i) => CY(`${nm} receptacle ${i + 1}`, 0.026, 0.05, [sx * (HL / 2 + 0.02), housing * 0.3, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'pbt', color: 0x17191c, finish: 'moulded', says: i === 0 ? 'the cathode\'s high-voltage receptacle: half the tube voltage, negative, down a cable as thick as a thumb' : 'the anode\'s: half the tube voltage, positive. Splitting it between the two halves the insulation either end has to stand' })),
    ...[-1, 1].map((sz, i) => CY(`${nm} trunnion ${i + 1}`, 0.016, 0.03, [0, housing * 0.2, sz * (housing + 0.015)], { rot: [PI / 2, 0, 0] as Vec, mat: 'steel-low', color: 0x6f7378, finish: 'ground', says: 'what it hangs by: the head swings on these so the beam can be pointed, and they take its whole weight' })),
    B(`${nm} label`, [HL * 0.4, 0.001, housing * 0.5], [0, housing + 0.0005, 0], { mat: 'pet', color: 0xd8d9db, text: `${kV} kV  ${mA} mA`, ink: 0x17191c, says: 'the rating plate: a tube is run to what is on this and no further' }),
  );
  // (what is on it but not drawn apart: its thermal switch, its expansion bellows, its earthing and its labels)
  const drawn = parts.reduce((a, q) => a + massOf(q), 0), kg = tubeKg(kV, mA, o.anode ?? 'rotating');
  parts.push({ name: `${nm} bellows, switch and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: the oil's expansion bellows, the thermal switch that stops an exposure when the housing is too hot, its earth strap and its labels (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${t.says}. ${HAZARDS.xray!.join('. ')}` })];
}
/** What an x-ray tube of this rating weighs, kg: its housing's lead and oil dominate, and both go with the power it
 *  must take. An estimate of the class — a dental head is 12 kg, a radiographic tube with its housing 25 to 45 — fitted
 *  to those two ends as 11 kg plus 1.5 kg for every kilowatt of heat the anode has to deal with. */
export const tubeKg = (kV: number, mA: number, anode: 'rotating' | 'fixed' = 'rotating'): number =>
  +(11 + (xrayTube(kV, mA).heat / 1000) * 1.5 * (anode === 'rotating' ? 1 : 0.7)).toFixed(1);

/**
 * A flat-panel x-ray detector, as radiography uses instead of film: a carbon-fibre cover the beam passes through
 * without being seen, a caesium iodide scintillator grown in needles so the light it makes stays in its own column, a
 * thin-film transistor array on glass that reads that light pixel by pixel, and its electronics, battery and frame.
 * Drawn flat, the beam arriving from +y. Its size is what it is sold by: a 35 × 43 cm panel is the one that replaced
 * the 14 × 17 inch cassette.
 */
export function xrayPanelParts(nm: string, wMm: number, hMm: number, pitchUm: number): Part[] {
  const w = wMm * mm, h = hMm * mm, T = 0.015, px = Math.round(wMm * 1000 / pitchUm), py = Math.round(hMm * 1000 / pitchUm);
  const parts: Part[] = [
    B(`${nm} cover`, [w, 0.0012, h], [0, T / 2, 0], { mat: 'cfrp', color: 0x1b1d20, finish: 'brushed', says: 'carbon fibre: it is strong enough to stand on and nearly invisible to the beam, which is the whole reason it is not aluminium' }),
    B(`${nm} scintillator`, [w - 0.02, 0.0006, h - 0.02], [0, T / 2 - 0.0016, 0], { mat: 'csi-tl', color: 0xe6e2cf, item: 'scintillator-csi', says: 'caesium iodide doped with thallium, grown as needles 0.6 mm deep: each needle pipes its light down to one pixel, so the picture stays sharp where a plain powder screen would blur it' }),
    B(`${nm} TFT array`, [w - 0.02, 0.0007, h - 0.02], [0, T / 2 - 0.0027, 0], { mat: 'glass', color: 0x2a3d4a, item: 'tft-array', says: `${px} × ${py} photodiodes and their transistors on glass at ${pitchUm} µm: ${((px * py) / 1e6).toFixed(1)} megapixels, read row by row` }),
    B(`${nm} backing`, [w - 0.02, 0.003, h - 0.02], [0, T / 2 - 0.005, 0], { mat: 'al-6061', color: 0x9aa0a6, finish: 'brushed', says: 'the plate the array is bonded to, which keeps it flat: a panel that bows reads a geometry that is not there' }),
    ...[-1, 1].map((sx, i) => B(`${nm} readout board ${i + 1}`, [w * 0.9, 0.0016, 0.03], [0, T / 2 - 0.008, sx * (h / 2 - 0.03)], { mat: 'fr4', color: 0x14301f, item: 'pcb-bare', says: 'the gate and charge-amplifier boards along two edges: 16 channels to a chip, thousands of channels to a panel' })),
    B(`${nm} battery`, [0.1, 0.006, 0.07], [w * 0.25, T / 2 - 0.009, 0], { mat: 'battery', color: 0x1a1a22, says: 'its cells and its protection board not drawn apart. A wireless panel carries its own power and its own radio: this is what makes it a panel and not a cassette on a cable' }),
    B(`${nm} frame`, [w, T, h], [0, 0, 0], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.0018, says: 'a magnesium or aluminium tub, sealed: a panel is dropped, leaned on and wiped with disinfectant every day of its life' }),
  ];
  const kg = panelKg(wMm, hMm), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} radio, lead backing and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: its radio, the thin lead sheet behind the array that stops what comes back off the table, its handles and its seals (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${px} × ${py} at ${pitchUm} µm over ${wMm} × ${hMm} mm. ${HAZARDS.xray![1]}` })];
}
/** What a flat panel weighs, kg: about 23 kg/m² of panel plus 1.1 kg of electronics and battery — fitted to the
 *  wireless panels makers publish (a 35 × 43 cm at about 3.4 kg, a 24 × 30 at about 2.2), an estimate of the class. */
export const panelKg = (wMm: number, hMm: number): number => +(((wMm * hMm) / 1e6) * 23 + 1.1).toFixed(2);

/**
 * A thermal camera: a germanium lens (glass is opaque in this band), a microbolometer array in a vacuum package behind
 * it, the board that reads it, a screen, a battery and a body. Drawn looking along +x, the lens at the front.
 */
export function thermalCamParts(nm: string, px: number, pitchUm: number, fMm: number, fnum = 1.0): Part[] {
  const cam = thermalCam(px, pitchUm, fMm, fnum), lens = (fMm / fnum) * mm, arr = px * pitchUm * 1e-6;
  const W = 0.062, H = 0.095, L = 0.115;
  const parts: Part[] = [
    CY(`${nm} lens`, lens / 2, 0.004, [L * 0.42, 0.012, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'germanium', color: 0x4a4f55, finish: 'polished', item: 'lens-germanium',
      says: `${(lens * 1000).toFixed(0)} mm clear at f/${fnum}: germanium, because ordinary glass is opaque past 2.5 µm and this camera works at 8 to 14. It is why the lens costs more than the rest of the optics put together` }),
    CY(`${nm} lens barrel`, lens / 2 + 0.004, 0.022, [L * 0.4, 0.012, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x33363b, finish: 'anodised', shell: 0.0015, says: 'the barrel, threaded so the lens focuses: a thermal lens is moved, not zoomed' }),
    B(`${nm} detector package`, [0.012, 0.022, 0.022], [L * 0.28, 0.012, 0], { mat: 'kovar', color: 0x5a5e63, item: 'bolometer-array',
      says: `the array in its vacuum package: ${px} detectors of ${pitchUm} µm, ${(arr * 1000).toFixed(1)} mm across. Each is a bridge of vanadium oxide on legs so thin that the heat arriving changes its resistance; the vacuum is what stops the air carrying that heat away before it is read` }),
    B(`${nm} shutter`, [0.0012, 0.02, 0.02], [L * 0.33, 0.012, 0], { mat: 'al-6061', color: 0x8f949a, says: 'the flag that swings across the lens every few minutes: the camera photographs a surface of known temperature to take its own drift out. The click heard in use is this' }),
    B(`${nm} main board`, [0.05, 0.0016, 0.045], [0, -0.005, 0], { mat: 'fr4', color: 0x14301f, item: 'pcb-bare', says: 'the read-out and the image processing: its chips not drawn apart' }),
    B(`${nm} screen`, [0.0045, 0.052, 0.07], [-L * 0.46, 0.012, 0], { mat: 'glass', color: 0x1b2026, finish: 'polished', says: 'its glass, its backlight and its driver not drawn apart. A 3.5-inch screen on the back: what the camera is for is the picture, and the picture is false colour over a scale the operator sets' }),
    B(`${nm} battery`, [0.07, 0.02, 0.038], [-L * 0.1, -0.03, 0], { mat: 'battery', color: 0x1a1a22, says: 'its cells not drawn apart. A few hours; a cooled camera would be minutes' }),
    P(`${nm} body`, { box: [L, H, W] }, { at: [0, 0, 0], mat: 'abs', color: 0x2f3338, finish: 'moulded', shell: 0.0022, says: 'the housing, with a rubber over-mould where it is held: a camera used up a ladder is dropped' }),
    B(`${nm} trigger`, [0.014, 0.012, 0.016], [L * 0.1, -H * 0.3, 0], { mat: 'abs', color: 0xc8512b, finish: 'moulded', says: 'the trigger: it takes the picture, and in most cameras it also wakes the shutter' }),
  ];
  const kg = camKg(px, fMm), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} grip, laser and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: its over-moulded grip, its aiming laser and visible camera, its card slot and its screws (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${cam.says}. ${glow(293.15).says}. ${HAZARDS.infrared!.join('. ')}` })];
}
/** What a handheld thermal camera weighs, kg: an estimate of the class, fitted to what makers publish — a 160 × 120
 *  pocket camera at about 0.3 kg, a 640 × 480 with a real lens at about 0.9. Its array costs it little; its lens,
 *  battery and body are the mass. */
export const camKg = (px: number, fMm: number): number => +(0.26 + (px / 640) * 0.35 + (fMm / 13) * 0.18).toFixed(3);

/**
 * A Fourier-transform infrared spectrometer: a hot source, a Michelson interferometer (a beamsplitter that sends half
 * the light each way, a fixed mirror and one that moves), a sample compartment, and a detector. There is no grating
 * and no slit — every wavelength is measured at once, all the time, which is why an FTIR takes a spectrum in a second
 * where a scanning instrument takes minutes. Drawn on a bench, the beam going round in the x–z plane.
 */
export function ftirParts(nm: string, resCm: number, detector: 'DTGS' | 'MCT' = 'DTGS'): Part[] {
  const f = ftir(resCm);
  // (the bench is as long as the mirror's travel asks: 1.25 mm each way at 4 cm⁻¹ and 20 at 0.25, and the rest of the
  //  instrument is laid round that. A routine instrument is a box a third of a metre across; a research one is twice
  //  that in every direction, and ten times the mass)
  const W = 0.34 + (f.travel / 1000) * 8, D = 0.28 + W * 0.36, H = 0.2 + W * 0.1, deck = H * 0.24;
  const travel = (f.travel / 1000) * 2; // (the mirror's stroke either side of zero path difference)
  const parts: Part[] = [
    B(`${nm} base`, [W, 0.03, D], [0, 0.015, 0], { mat: 'cast-iron', color: 0x44484d, finish: 'cast', fill: 0.45, says: 'a cast base: an interferometer is a ruler made of light, and anything that moves the mirrors a fraction of a wavelength is a line in the spectrum that is not there' }),
    P(`${nm} source`, { cyl: [0.004, 0.02] }, { at: [-W * 0.36, deck, -D * 0.28], mat: 'silicon-carbide', color: 0xd8703a, glow: true, item: 'ir-glower',
      says: 'a silicon carbide glower at about 1200 °C: a black body, because what is wanted is every infrared wavelength at once' }),
    P(`${nm} source mirror`, { lathe: [[0, 0], [0.016, 0.002], [0.016, 0.004], [0, 0.004]] }, { at: [-W * 0.36, deck, -D * 0.1], rot: [PI / 2, 0, 0] as Vec, mat: 'al-6061', color: 0xd6d9dc, finish: 'chrome', says: 'gold on glass, off-axis: mirrors and not lenses, because a lens of any glass would swallow the band' }),
    B(`${nm} beamsplitter`, [0.05, 0.05, 0.004], [-W * 0.1, deck + 0.02, -D * 0.1], { rot: [0, PI / 4, 0] as Vec, mat: 'kbr', color: 0xcfd6dc, finish: 'polished', item: 'beamsplitter-kbr',
      says: 'potassium bromide with a germanium coating, at 45°: half the light to each mirror. KBr because it is transparent from 0.25 to 25 µm — and it dissolves in the moisture of a breath, which is why the bench is purged with dry air for its whole life' }),
    B(`${nm} fixed mirror`, [0.04, 0.04, 0.006], [-W * 0.1, deck + 0.02, -D * 0.34], { mat: 'al-6061', color: 0xd6d9dc, finish: 'chrome', says: 'one arm: it does not move, and it is aligned once' }),
    B(`${nm} moving mirror`, [0.04, 0.04, 0.006], [W * 0.14, deck + 0.02, -D * 0.1], { rot: [0, PI / 2, 0] as Vec, mat: 'al-6061', color: 0xd6d9dc, finish: 'chrome',
      travel: { slide: { dir: [1, 0, 0], from: -travel / 2, to: travel / 2 } },
      says: `the other arm: it travels ${(f.travel).toFixed(1)} mm each way on an air bearing, and that travel is the resolution. ${resCm} cm⁻¹ asks for this much and no less` }),
    CY(`${nm} air bearing`, 0.018, 0.08, [W * 0.22, deck + 0.02, -D * 0.1], { rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x8f949a, finish: 'anodised', joint: 'slide', says: 'the mirror floats on a film of air: nothing touches, so nothing wears and nothing sticks' }),
    P(`${nm} reference laser`, { cyl: [0.012, 0.09] }, { at: [-W * 0.4, deck + 0.05, D * 0.1], rot: [0, 0, PI / 2] as Vec, mat: 'glass', color: 0xc0392b, glow: true, item: 'helium-neon-laser',
      says: 'a helium–neon laser at 632.8 nm down the same path: the scan is sampled on its fringes, so the instrument measures its mirror against a wavelength and not against a scale it might have drifted from' }),
    B(`${nm} sample compartment`, [0.16, 0.12, 0.16], [W * 0.1, deck + 0.06, D * 0.16], { mat: 'al-6061', color: 0x2f3338, finish: 'crinkle', shell: 0.002, says: 'where what is being looked at goes: in the beam, in dry air, with nothing of its own in the way' }),
    B(`${nm} sample window`, [0.05, 0.05, 0.004], [W * 0.1 - 0.08, deck + 0.06, D * 0.16], { mat: 'zinc-selenide', color: 0xd8a24a, finish: 'polished', says: 'zinc selenide: it passes the band and does not dissolve, which is what a window into a sample has to do' }),
    B(`${nm} detector`, [0.03, 0.04, 0.03], [W * 0.34, deck + 0.04, D * 0.16], { mat: 'kovar', color: 0x5a5e63, item: detector === 'MCT' ? 'mct-detector' : 'dtgs-detector',
      says: detector === 'MCT' ? 'mercury cadmium telluride in a dewar of liquid nitrogen: a hundred times more sensitive, and it must be filled every day' : 'deuterated triglycine sulfate at room temperature: it reads the heat of the beam through a pyroelectric crystal, and it is what most instruments carry because it needs nothing' }),
    B(`${nm} electronics`, [0.2, 0.08, 0.3], [W * 0.26, deck + 0.05, -D * 0.22], { mat: 'al-6061', color: 0x33363b, finish: 'crinkle', shell: 0.0015, says: 'the amplifier, the converter and the computer that does the transform: its boards not drawn apart' }),
    B(`${nm} cover`, [W, H, D], [0, H / 2, 0], { mat: 'abs', color: 0xd8d9db, finish: 'moulded', shell: 0.003, says: 'the cover: it keeps the purge in and the room\'s air out' }),
  ];
  const kg = ftirKg(resCm), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} purge, optics mounts and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${(kg - drawn).toFixed(1)} kg not drawn apart: its purge manifold and desiccant, the kinematic mounts under every mirror, its power supply and its feet (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${f.says}. ${HAZARDS.spectrometer!.join('. ')}` })];
}
/** What a benchtop FTIR weighs, kg: an estimate of the class — a routine instrument is about 25 kg and a research one
 *  with a long bench and a cooled detector about 45. Resolution is what makes it bigger: the mirror's travel sets the
 *  bench's length, and the bench is the mass. */
export const ftirKg = (resCm: number): number => +(22 + 8 / Math.max(0.125, resCm)).toFixed(1);

/**
 * A scanning lidar, the kind that turns: a base with its connector and motor, a head that spins on it carrying the
 * laser diodes and their detectors, and a window round the head for the beams to leave by. Sized by Velodyne's
 * published figures for the VLP-16 — 103 mm across, 72 mm tall, 830 g — which is the shape of every spinning lidar
 * since. Drawn standing on its base, the axis up.
 */
export function lidarParts(nm: string, channels: number, rpm: number, o: { apertureMm?: number; nm?: 905 | 1550 } = {}): Part[] {
  const D = 0.103, H = 0.072, ap = o.apertureMm ?? 25, wave = o.nm ?? 905;
  const bandY = H * 0.52, bandH = Math.max(0.018, channels * 0.0016);
  const parts: Part[] = [
    CY(`${nm} base`, D / 2, H * 0.34, [0, H * 0.17, 0], { mat: 'al-6061', color: 0x33363b, finish: 'anodised', shell: 0.003, says: 'the base: it does not turn, and everything that leaves the instrument leaves through it' }),
    CY(`${nm} motor stator`, D * 0.3, 0.014, [0, H * 0.3, 0], { mat: 'steel-electrical', color: 0x5a5e63, fill: 0.5, item: 'lamination-stack', says: `the brushless motor that spins the head at ${rpm} rev/min: ${(rpm / 60).toFixed(0)} turns a second, which is the frame rate` }),
    CY(`${nm} slip ring`, D * 0.16, 0.016, [0, H * 0.4, 0], { mat: 'brass', color: 0xc9a227, finish: 'plate', item: 'slip-ring', says: 'power up and data down through rings and brushes, because the head turns for ever and a cable cannot' }),
    CY(`${nm} head`, D / 2 - 0.004, H * 0.42, [0, H * 0.62, 0], { mat: 'al-6061', color: 0x8f949a, finish: 'anodised', shell: 0.0025, says: 'what turns: the lasers, the detectors and their boards all ride round together, so every channel sees the same angle at the same time' }),
    ...Array.from({ length: Math.min(channels, 32) }, (_, i) => {
      const y = bandY + (i / Math.max(1, Math.min(channels, 32) - 1) - 0.5) * bandH * 0.8;
      return B(`${nm} laser ${i + 1}`, [0.004, 0.003, 0.004], [D * 0.22, y, 0], { mat: 'silicon', color: 0x3a3d42,
        says: `a ${wave} nm pulsed diode in its can, its chip and submount not drawn apart: one of ${channels}, aimed a little above or below its neighbours: the fan of beams is what makes a line out of a point` });
    }),
    ...Array.from({ length: Math.min(channels, 32) }, (_, i) => {
      const y = bandY + (i / Math.max(1, Math.min(channels, 32) - 1) - 0.5) * bandH * 0.8;
      return B(`${nm} detector ${i + 1}`, [0.004, 0.003, 0.004], [-D * 0.22, y, 0], { mat: 'silicon', color: 0x2a2d32, item: 'photodiode-apd',
        says: 'an avalanche photodiode: it multiplies the few thousand photons that come back into a pulse a circuit can time' });
    }),
    CY(`${nm} receiver lens`, ap * mm / 2, 0.004, [-D * 0.3, bandY, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'pmma', color: 0xaebfcc, finish: 'polished', item: 'lens-plastic', says: `${ap} mm across: the whole of the return a lidar gets is what this gathers, and the range equation goes as its area` }),
    P(`${nm} window`, { lathe: [[D / 2 - 0.004, -bandH / 2], [D / 2, -bandH / 2], [D / 2, bandH / 2], [D / 2 - 0.004, bandH / 2]] }, { at: [0, bandY, 0], mat: 'pc', color: 0x2a2d32, finish: 'polished', shell: 0.002, says: 'the band the beams leave and return through: tinted, because it passes the infrared and keeps daylight and curiosity out' }),
    CY(`${nm} cap`, D / 2, 0.006, [0, H - 0.003, 0], { mat: 'al-6061', color: 0x33363b, finish: 'anodised', says: 'the top cap, with the alignment marks on it' }),
    B(`${nm} board`, [D * 0.7, 0.0016, D * 0.7], [0, H * 0.46, 0], { mat: 'fr4', color: 0x14301f, item: 'pcb-bare', says: 'the head\'s board: the drivers, the timing circuits and the processor that turns times into points' }),
    CY(`${nm} connector`, 0.009, 0.014, [D * 0.3, H * 0.1, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'pbt', color: 0x17191c, item: 'connector-housing', says: 'power and Ethernet: a lidar is a camera that talks in packets' }),
  ];
  const kg = lidarKg(channels), drawn = parts.reduce((a, q) => a + massOf(q), 0);
  parts.push({ name: `${nm} wiring, bearings and fittings`, at: [0, 0, 0] as Vec, kg: Math.max(0, kg - drawn), says: `${((kg - drawn) * 1000).toFixed(0)} g not drawn apart: the head's bearings, its wiring, its potting and the screws (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts)];
}
/** What a spinning lidar weighs, kg: Velodyne publishes 830 g for the 16-channel VLP-16 and about 925 g for the
 *  32-channel VLP-32C; this is those two, as 0.78 kg plus 4.5 g a channel. */
export const lidarKg = (channels: number): number => +(0.78 + channels * 0.0045).toFixed(3);

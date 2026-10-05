// Observers as configurations of the same fields (src/nexus/perceive.ts): a person and some instruments. Nothing in the
// projection names any of them; each is values of a carrier, a band, the least and most it registers, a window, a
// resolution and a latency. Where physics gives a resolution (diffraction, the electron's wavelength) it is computed
// here from the instrument's own quantities; every other value is a sourced figure or a labelled estimate.

import { CONST } from '../nexus/book/constants';
import type { Observer, Sense } from '../nexus/perceive';

const c = CONST.c.value!, h = CONST.h.value!;
const hz = (lambda: number) => c / lambda;

/** Abbe: the finest a lens of numerical aperture NA resolves at a wavelength, d = λ / (2 NA). */
export const abbe = (lambda: number, NA: number) => lambda / (2 * NA);
/** Rayleigh: the finest angle an aperture D resolves at a wavelength, θ = 1.22 λ / D. */
export const rayleigh = (lambda: number, D: number) => (1.22 * lambda) / D;
/** An electron's wavelength after a potential V, relativistic: λ = h / √(2 m e V (1 + e V / (2 m c²))). */
export const electronWavelength = (V: number) => { const m = 9.1093837015e-31, e = 1.602176634e-19; return h / Math.sqrt(2 * m * e * V * (1 + (e * V) / (2 * m * c * c))); };

const visible = { lo: hz(780e-9), hi: hz(380e-9) };

/** A person, by the senses they have. */
export const person: Observer = {
  name: 'a person',
  acts: 0.25,
  senses: [
    { name: 'sight', carrier: 'light', band: visible, unit: 'W/m^2 sr', least: 6e-10, most: 1.5e3, window: 1 / 60, resolution: { angle: Math.PI / (180 * 60) }, latency: 0.1,
      sources: { band: 'CIE: the visible range, 380 to 780 nm', least: 'estimate: the dark-adapted eye registers near 10⁻⁶ cd/m², about 6 × 10⁻¹⁰ W/m² sr at the scotopic 1700 lm/W', most: 'estimate: above about 10⁶ cd/m² the eye is dazzled (683 lm/W)', window: 'estimate: flicker fuses near 60 Hz in bright light', resolution: 'normal acuity resolves one minute of arc (the Snellen standard)', latency: 'estimate: about a tenth of a second for what the eye receives to be registered' } },
    { name: 'hearing', carrier: 'momentum', band: { lo: 20, hi: 20000 }, unit: 'Pa', least: 2e-5, most: 20, window: 0.003, resolution: {}, latency: 0.01,
      sources: { band: 'estimate: young adults hear about 20 Hz to 20 kHz', least: 'ISO 1683: the reference sound pressure, 20 µPa, near the threshold at 1 kHz', most: 'estimate: near 120 dB, about 20 Pa, sound becomes pain', window: 'estimate: gaps of 2 to 3 ms are heard', latency: 'estimate' } },
    { name: 'touch', carrier: 'momentum', band: { lo: 5, hi: 1000 }, unit: 'm', least: 1e-8, most: 1e-3, window: 0.001, resolution: { length: 2e-3 }, latency: 0.02,
      sources: { band: 'estimate: the skin\'s vibration receptors answer about 5 Hz to 1 kHz', least: 'estimate: about 0.01 µm of vibration near 250 Hz', resolution: 'estimate: two points about 2 mm apart are told apart on a fingertip', latency: 'estimate' } },
    { name: 'balance', carrier: 'momentum', band: { lo: 0.01, hi: 20 }, unit: 'm/s^2', least: 0.05, most: 50, window: 0.1, resolution: {}, latency: 0.01,
      sources: { band: 'estimate', least: 'estimate: linear accelerations of a few centimetres per second squared are felt', most: 'estimate', window: 'estimate', latency: 'estimate' } },
    { name: 'smell', carrier: 'amount', answers: ['amount of hydrogen sulfide', 'amount of ammonia'], unit: 'mol/m^3', least: 2e-8, most: 1, window: 0.5, resolution: {}, latency: 0.3,
      sources: { answers: 'a few of the many matters the nose has receptors for; carbon dioxide at the concentrations of air has no smell', least: 'estimate: about half a part per billion of hydrogen sulfide in air', window: 'estimate: about a breath', latency: 'estimate' } },
    { name: 'taste', carrier: 'amount', answers: ['amount of sucrose', 'amount of sodium chloride'], unit: 'mol/m^3', least: 10, most: 2000, window: 0.5, resolution: {}, latency: 0.2,
      sources: { answers: 'a few of the matters the tongue has receptors for, dissolved where it touches', least: 'estimate: about 10 mM for sucrose in water', latency: 'estimate' } },
  ],
};

/** Instruments, each a configuration of the same fields. */
export const instruments: Record<string, Sense> = {
  'an optical microscope': { name: 'an optical microscope', carrier: 'light', band: visible, unit: 'W/m^2 sr', least: 1e-6, most: 1e4, window: 1 / 30, resolution: { length: abbe(550e-9, 1.4) }, latency: 0.03, sources: { resolution: 'Abbe at 550 nm through an oil-immersion objective of numerical aperture 1.4', least: 'estimate' } },
  'an electron microscope': { name: 'an electron microscope', carrier: 'charge', unit: 'A/m^2', least: 1e-3, most: 1e6, window: 1, resolution: { length: abbe(electronWavelength(200e3), 0.01) }, latency: 0.1, sources: { resolution: 'Abbe at the wavelength of 200 keV electrons through a 10 mrad aperture', least: 'estimate' } },
  'a telescope': { name: 'a telescope', carrier: 'light', band: visible, unit: 'W/m^2 sr', least: 1e-12, most: 1e3, window: 1, resolution: { angle: rayleigh(550e-9, 0.2) }, latency: 0, sources: { resolution: 'Rayleigh at 550 nm through a 0.2 m aperture', least: 'estimate: a long exposure' } },
  'a radio telescope': { name: 'a radio telescope', carrier: 'light', band: { lo: 1e9, hi: 1e10 }, unit: 'W/m^2 sr', least: 1e-22, most: 1, window: 1, resolution: { angle: rayleigh(0.1, 100) }, latency: 0, sources: { resolution: 'Rayleigh at 10 cm through a 100 m dish', least: 'estimate' } },
  'a thermal camera': { name: 'a thermal camera', carrier: 'light', band: { lo: hz(14e-6), hi: hz(8e-6) }, unit: 'W/m^2 sr', least: 1, most: 1e4, window: 1 / 30, resolution: { angle: 1e-3 }, latency: 0.03, sources: { band: 'the 8 to 14 µm window the atmosphere is clear in', least: 'estimate: a body at room temperature gives tens of W/m² sr in the band', resolution: 'estimate' } },
  'an ultraviolet detector': { name: 'an ultraviolet detector', carrier: 'light', band: { lo: hz(380e-9), hi: hz(100e-9) }, unit: 'W/m^2 sr', least: 1e-6, most: 1e4, window: 1e-3, resolution: { angle: 1e-3 }, latency: 0, sources: { band: '100 to 380 nm', least: 'estimate' } },
  'an X-ray detector': { name: 'an X-ray detector', carrier: 'light', band: { lo: hz(10e-9), hi: hz(10e-12) }, unit: 'W/m^2 sr', least: 1e-9, most: 1e4, window: 1e-3, resolution: { length: 1e-4 }, latency: 0, sources: { band: '10 pm to 10 nm', least: 'estimate' } },
  'an infrared spectrometer': { name: 'an infrared spectrometer', carrier: 'light', band: { lo: hz(25e-6), hi: hz(2.5e-6) }, unit: 'W/m^2 sr', least: 1e-6, most: 1e4, window: 1, resolution: {}, latency: 1, sources: { band: '4000 to 400 per centimetre, the mid infrared', window: 'estimate: a scan' } },
  'a high-speed camera': { name: 'a high-speed camera', carrier: 'light', band: visible, unit: 'W/m^2 sr', least: 1e-3, most: 1e5, window: 1e-4, resolution: { angle: 2e-4 }, latency: 0, sources: { window: 'ten thousand frames a second', least: 'estimate: a short exposure needs bright light', resolution: 'estimate' } },
  'an accelerometer': { name: 'an accelerometer', carrier: 'momentum', band: { lo: 0, hi: 1000 }, unit: 'm/s^2', least: 1e-3, most: 160, window: 5e-4, resolution: {}, latency: 1e-3, sources: { least: 'estimate: a small MEMS accelerometer\'s noise', most: 'estimate: a ±16 g range' } },
  'a microphone': { name: 'a microphone', carrier: 'momentum', band: { lo: 10, hi: 40000 }, unit: 'Pa', least: 1e-4, most: 100, window: 1 / 96000, resolution: {}, latency: 0, sources: { least: 'estimate: a measurement microphone\'s self-noise', window: 'sampled at 96 kHz' } },
  'a carbon dioxide sensor': { name: 'a carbon dioxide sensor', carrier: 'amount', answers: ['amount of carbon dioxide'], unit: 'mol/m^3', least: 1.6e-3, most: 0.4, window: 2, resolution: {}, latency: 2, sources: { answers: 'absorption of infrared by carbon dioxide (non-dispersive)', least: 'estimate: about 40 ppm', window: 'estimate' } },
  'a laser rangefinder': { name: 'a laser rangefinder', carrier: 'light', band: { lo: hz(910e-9), hi: hz(900e-9) }, unit: 'W/m^2 sr', least: 1e-6, most: 1e6, window: 1e-3, resolution: { length: 1e-3 }, latency: 0, shines: 1e-3, sources: { shines: 'a 1 mW beam', resolution: 'estimate' } },
};

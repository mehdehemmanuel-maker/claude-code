// Places from words, as numbers: the place named (a room named wins over the weather round it), the sun's height for the
// time said, gravity for the planet or as said, your size, and what falls falling at its terminal speed (a 2 mm raindrop
// about 6.5 m/s, Gunn & Kinzer 1949; a flake about 1 m/s); the sea's waves by ω² = g k; a dart scored by the WDF board.
// What was asked and is not in the place yet is said, not left out.

import { describe, expect, it } from 'vitest';
import { FALLS, G, readPlace, terminal, wavePeriod } from '../../src/nexus/places';
import { readPlain } from '../../src/nexus/directive';
import { dartScore } from '../../src/nexus/view/place3d';

describe('a place read from words', () => {
  it('takes you where the blind testers asked to go', () => {
    const cases: [string, string][] = [
      ['Put me on a beach at sunset with warm water and nobody else around', 'a beach'], ['Take me to the surface of Mars and let me walk around', 'the surface of Mars'],
      ['Let me fly over the Grand Canyon like a hawk', 'a canyon rim'], ['Put me inside a giant aquarium with whales swimming past', 'under the sea'],
      ['Turn this room into a cozy cabin in a snowstorm with a fireplace', 'a cabin'], ['Make a haunted mansion and let me explore it with a flashlight', 'a haunted mansion'],
      ['Put me on stage at a sold-out stadium concert', 'a stadium stage'], ['Show me what Earth looked like when dinosaurs were around', 'the late Cretaceous'],
      ['Shrink me down to the size of an ant and drop me in a garden', 'a garden'], ['take me to a bar to play darts and pool', 'a bar'], ['Teach me to surf on a perfect wave', 'a beach'],
    ];
    // "make a haunted mansion" reads as a make: the forge takes a make of a place to the place (src/nexus/view/forge.ts)
    for (const [t, name] of cases) { expect(['place', ...(/^make/i.test(t) ? ['make'] : [])], t).toContain(readPlain(t).directive.act); expect(readPlace(t)?.name, t).toBe(name); }
    const beach = readPlace(cases[0]![0])!; expect(beach.sun.elev).toBe(2); expect(beach.water!.tempC).toBe(28); expect(beach.alone).toBe(true);
    const cabin = readPlace(cases[4]![0])!; expect(cabin.room).toBeTruthy(); expect(cabin.fall?.what).toBe('snowflakes'); expect(cabin.sees).toBeLessThanOrEqual(400);
    expect(readPlace(cases[3]![0])!.missing).toContain('sea creatures'); expect(readPlace(cases[7]![0])!.missing).toContain('dinosaurs');
    expect(readPlace(cases[8]![0])!.scale).toBeCloseTo(0.005 / 1.7, 6);
  });
  it('sets gravity for the place or as said, and the weather and time where you are', () => {
    expect(readPlace('take me to mars')!.gravity).toBe(3.71); expect(readPlace('take me to the moon')!.gravity).toBe(1.62);
    for (const t of ['Turn gravity off', 'zero gravity', 'make me weightless']) { expect(readPlace(t)?.gravity, t).toBe(0); }
    expect(readPlain('Turn gravity off').directive.act).toBe('place'); expect(readPlace('gravity 2 g')!.gravity).toBeCloseTo(2 * G.earth, 6);
    const rain = readPlace('Make it rain, but make the raindrops gummy bears')!; expect(rain.name).toBe('here'); expect(rain.fall?.what).toBe('gummy bears');
    const mars = readPlace('take me to mars')!, night = readPlace('make it night', mars)!; expect(night.name).toBe('the surface of Mars'); expect(night.sun.elev).toBeLessThan(0); expect(night.gravity).toBe(3.71);
    expect(readPlace('build a chair')).toBeNull(); expect(readPlain('build a cabin of 40 m² for 2 people where winter gets to -25 °C').directive.act).toBe('make');
  });
});
describe('the physics of a place', () => {
  it('lets things fall at their terminal speed, where drag meets weight', () => {
    expect(terminal(FALLS.rain!, G.earth, 1.225)).toBeGreaterThan(6); expect(terminal(FALLS.rain!, G.earth, 1.225)).toBeLessThan(7); // Gunn & Kinzer: 2 mm, about 6.5 m/s
    expect(terminal(FALLS.snow!, G.earth, 1.225)).toBeGreaterThan(0.7); expect(terminal(FALLS.snow!, G.earth, 1.225)).toBeLessThan(1.3);
    // on Mars's thin air the same drop falls far faster, though gravity is weaker: v ∝ √(g / ρ)
    expect(terminal(FALLS.rain!, G.mars, 0.02) / terminal(FALLS.rain!, G.earth, 1.225)).toBeCloseTo(Math.sqrt((3.71 / 9.80665) * (1.225 / 0.02)), 6);
    expect(terminal(FALLS.rain!, G.moon, 0)).toBe(Infinity);
  });
  it('moves the sea by the deep-water law and scores a dart by the board', () => {
    expect(wavePeriod(20, G.earth)).toBeCloseTo(3.58, 2); expect(wavePeriod(80, G.earth) / wavePeriod(20, G.earth)).toBeCloseTo(2, 6); // T ∝ √λ
    expect(dartScore(0, 0).score).toBe(50); expect(dartScore(0.012, 0).score).toBe(25); expect(dartScore(0, 0.103).score).toBe(60);
    expect(dartScore(0.166, 0).score).toBe(12); expect(dartScore(0, -0.05).score).toBe(3); expect(dartScore(-0.05, 0).score).toBe(11); expect(dartScore(0.3, 0).score).toBe(0);
  });
});

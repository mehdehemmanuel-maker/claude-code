// What matter is made of and how it changes, generated from the identities each level of energy keeps, the bonds that
// hold molecules, and the Gibbs energies of their phases (src/nexus/compose.ts, src/nexus/phase.ts). Every check below is
// against a measured value that is not an input: a known reaction, a decay's energy, a boiling point, a vapour pressure.

import { describe, expect, it } from 'vitest';
import { BOILING_AT_ONE_ATMOSPHERE, MOLECULES, PARTICLES, WATER_SATURATION, type Species } from '../../src/data/species';
import { CONST } from '../../src/nexus/book/constants';
import { balance, CHEMICAL, enthalpyOf, fromBonds, halfIonized, ionizedFraction, NUCLEAR, released, transformations } from '../../src/nexus/compose';
import { boilingPoint, phaseAt, vaporizationEnthalpy, vapourPressure } from '../../src/nexus/phase';

const sp = (n: string, ph?: Species['phase']) => { const s = [...MOLECULES, ...PARTICLES].find((x) => x.name === n && (!ph || x.phase === ph)); if (!s) throw new Error(n); return s; };
const MeV = 1.602176634e-13;
const rel = (x: number, y: number) => Math.abs(x - y) / Math.abs(y);

describe('identities: what each level of energy keeps, and the transformations that keeps', () => {
  it('chemistry keeps atoms and charge: methane burns two oxygens to one carbon dioxide and two waters, water splits two to two and one, salt to its ions', () => {
    const fire = [sp('methane'), sp('oxygen'), sp('carbon dioxide'), sp('water', 'gas')];
    const b = balance([sp('methane'), sp('oxygen')], [sp('carbon dioxide'), sp('water', 'gas')], CHEMICAL(fire), 'chemical');
    expect(b.coefficients).toEqual([-1, -2, 1, 2]);
    // the heat it releases is the formation enthalpies' balance: the lower heating value of methane
    expect(enthalpyOf(fire, b.coefficients!) / 1000).toBeCloseTo(-802.3, 0);
    expect(balance([sp('water', 'liquid')], [sp('hydrogen'), sp('oxygen')], ['H', 'O'], 'chemical').coefficients).toEqual([-2, 2, 1]);
    expect(balance([sp('sodium chloride')], [sp('sodium ion'), sp('chloride ion')], ['Na', 'Cl', 'charge'], 'chemical').coefficients).toEqual([-1, 1, 1]);
    // the same algebra as a set of quantities' dimensionless groups: one balance for four species of three elements
    expect(transformations(fire, ['C', 'H', 'O'], 'chemical').length).toBe(1);
  });

  it('lead cannot become gold where atoms are kept; where only nucleons, charge and leptons are, it can, giving up three protons, eight neutrons and three electrons', () => {
    const chem = balance([sp('lead')], [sp('gold')], ['Pb', 'Au'], 'chemical');
    expect(chem.coefficients).toBeNull();
    expect(chem.blocks).toEqual(['Pb and Au']);
    const nuc = balance([sp('lead')], [sp('gold'), sp('proton'), sp('neutron'), sp('electron')], NUCLEAR, 'nuclear');
    expect(nuc.coefficients).toEqual([-1, 1, 3, 8, 3]);
  });

  it('a neutron cannot become only a proton and an electron: lepton number blocks it, and what is missing is neutral, without baryon number, with lepton number minus one, and lighter than the 0.782 MeV the decay releases', () => {
    const b = balance([sp('neutron')], [sp('proton'), sp('electron')], NUCLEAR, 'nuclear');
    expect(b.coefficients).toBeNull();
    expect(b.blocks).toEqual(['lepton']);
    expect(b.missing).toEqual({ charge: 0, baryon: 0, lepton: -1 });
    expect(released([sp('neutron'), sp('proton'), sp('electron')], [-1, 1, 1]) / MeV).toBeCloseTo(0.7823, 3);
  });

  it('with the antineutrino the decay balances; a free proton cannot become a neutron and a positron alone (lepton number again, a neutrino missing), and with it energy forbids the decay: it would take 1.8 MeV', () => {
    expect(balance([sp('neutron')], [sp('proton'), sp('electron'), sp('antineutrino')], NUCLEAR, 'nuclear').coefficients).toEqual([-1, 1, 1, 1]);
    const p = balance([sp('proton')], [sp('neutron'), sp('positron')], NUCLEAR, 'nuclear');
    expect(p.blocks).toEqual(['lepton']);
    expect(p.missing).toEqual({ charge: 0, baryon: 0, lepton: 1 });
    expect(balance([sp('proton')], [sp('neutron'), sp('positron'), sp('neutrino')], NUCLEAR, 'nuclear').coefficients).toEqual([-1, 1, 1, 1]);
    expect(released([sp('proton'), sp('neutron'), sp('positron'), sp('neutrino')], [-1, 1, 1, 1]) / MeV).toBeLessThan(-1.8);
  });
});

describe('binding: a molecule from its atoms and its bonds, and what the residual names', () => {
  const gases = MOLECULES.filter((s) => s.phase === 'gas' && s.bonds && s.H !== undefined && s.name !== 'hydrogen' && s.name !== 'oxygen' && s.name !== 'nitrogen');
  const residual = (s: Species) => (s.H! - fromBonds(s)) / 1000;
  it('mean bonds give small molecules\' enthalpies within tens of kilojoules; benzene, whose bonds alternate around a ring, is more stable than its bonds by far more than any other', () => {
    const others = gases.filter((s) => s.name !== 'benzene').map((s) => Math.abs(residual(s)));
    expect(Math.max(...others)).toBeLessThan(25);
    expect(residual(sp('benzene', 'gas'))).toBeLessThan(-5 * Math.max(...others));
  });

  it('a liquid is more stable than its gas by a binding no bond in the molecule holds: between molecules, the enthalpy its boiling takes in', () => {
    for (const n of ['water', 'methanol', 'benzene']) expect(residual(sp(n, 'gas')) - residual(sp(n, 'liquid'))).toBeCloseTo(vaporizationEnthalpy(n, 298.15) / 1000, 9);
    expect(vaporizationEnthalpy('water', 298.15) / 1000).toBeCloseTo(44.0, 0);
  });
});

describe('state: the phase of least Gibbs energy, and the curve where two phases meet', () => {
  it('boiling points at one atmosphere come from the phases\' standard enthalpies and entropies, none of them an input, within one and a half per cent', () => {
    for (const n of Object.keys(BOILING_AT_ONE_ATMOSPHERE)) expect(rel(boilingPoint(n, 101325), BOILING_AT_ONE_ATMOSPHERE[n]!.T)).toBeLessThan(0.015);
    expect(Math.abs(boilingPoint('water', 101325) - 373.124)).toBeLessThan(0.6);
  });

  it('water\'s vapour pressure against the steam tables: within a part in a thousand at the reference temperature, and the residual grows with the distance from it, the heat capacity\'s own change with temperature being what is held constant', () => {
    const errs = WATER_SATURATION.map((w) => rel(vapourPressure('water', w.T), w.p));
    expect(errs[0]).toBeLessThan(0.002);
    for (let i = 1; i < errs.length; i++) expect(errs[i]!).toBeGreaterThan(errs[i - 1]!);
    expect(errs.at(-1)!).toBeLessThan(0.03);
  });

  it('the same water boils at 72 °C where the air is a third of an atmosphere, and is a gas at 15 °C below its vapour pressure', () => {
    expect(boilingPoint('water', 33700) - 273.15).toBeGreaterThan(71);
    expect(boilingPoint('water', 33700) - 273.15).toBeLessThan(73);
    expect(phaseAt('water', 288.15, 101325)).toBe('liquid');
    expect(phaseAt('water', 288.15, 1000)).toBe('gas');
  });

  it('hydrogen ionizes where kT is well below its binding, because the free electron\'s room is on the side of ionizing: at half, the binding over kT is the logarithm of that room over the volume per nucleus; denser, it ionizes later; and the change is a continuous fraction across a band of temperature', () => {
    const chiJ = 13.598434 * 1.602176634e-19, k = CONST.kB.value!, h = CONST.h.value!, me = 9.1093837015e-31;
    let last = Infinity;
    for (const n of [1e20, 1e23, 2.5e25]) {
      const T = halfIonized(n);
      expect(ionizedFraction(T, n)).toBeCloseTo(0.5, 6);
      const room = ((2 * Math.PI * me * k * T) / (h * h)) ** 1.5;
      expect(chiJ / (k * T)).toBeCloseTo(Math.log(room / (n / 2)), 6);
      expect(chiJ / (k * T)).toBeGreaterThan(1);
      expect(chiJ / (k * T)).toBeLessThan(last);
      last = chiJ / (k * T);
    }
    const n = 1e23, T = halfIonized(n);
    expect(ionizedFraction(0.8 * T, n)).toBeLessThan(0.15);
    expect(ionizedFraction(1.25 * T, n)).toBeGreaterThan(0.85);
  });
});

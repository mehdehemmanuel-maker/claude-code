import { describe, expect, it } from 'vitest';
import { METRIC_COARSE, tensileStressArea, threadFor, PROPERTY_CLASSES } from '../../src/engineering/threads';
import { boltedJoint, permissiblePreload, preloadFromTorque, tighteningTorque, assemblyStress } from '../../src/engineering/bolts';
import { SPRING_WIRES, springRate, surgeFrequency, wireUltimate, solidLength, bergstrasser, wahl, yieldForce, shearStress } from '../../src/engineering/springs';
import { roundSection, tubeSection, rectSection, iBeamStrongAxis } from '../../src/engineering/sections';
import { cantileverCollapseLoad, eulerBucklingLoad, cantileverDeflection } from '../../src/engineering/beams';
import { withdrawalUltimate, dowelBearingStrength } from '../../src/engineering/wood';
import { filletWeldCapacity, weldable, rivetShear, bondCapacities, ADHESIVES, cureFraction } from '../../src/engineering/joining';
import {
  magnetWrench, cylinderCharges, cylinderFaces, coaxialCylinderPointChargeForce, coaxialDipoleForce, dipoleMoment, imageFaces,
} from '../../src/engineering/magnets';
import { lewisFormFactor, dcMotorTorque, dcMotorSpecs, neoHookeanBandForce, capstanRatio, bearingFrictionTorque } from '../../src/engineering/mechanics';
import { MATERIALS } from '../../src/data/materials';

const within = (actual: number, expected: number, rel: number) =>
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(rel);

describe('ISO metric threads', () => {
  it('tensile stress areas match ISO 898-1 Table 4 values', () => {
    const table: Record<string, number> = { M3: 5.03, M4: 8.78, M5: 14.2, M6: 20.1, M8: 36.6, M10: 58.0, M12: 84.3, M16: 157, M20: 245, M24: 353 };
    for (const [size, mm2] of Object.entries(table)) within(tensileStressArea(METRIC_COARSE[size]!) * 1e6, mm2, 0.005);
  });
  it('property classes are ordered by strength', () => {
    expect(PROPERTY_CLASSES['12.9']!.Rm).toBeGreaterThan(PROPERTY_CLASSES['10.9']!.Rm);
    expect(PROPERTY_CLASSES['10.9']!.Rp).toBeGreaterThan(PROPERTY_CLASSES['8.8']!.Rp);
  });
});

describe('VDI 2230 tightening', () => {
  const input = { thread: threadFor('M10'), muThread: 0.12, muHead: 0.12, Dkm: (0.01463 + 0.011) / 2 };
  it('torque and preload are exact inverses', () => {
    const F = 25_000;
    within(preloadFromTorque(tighteningTorque(F, input), input), F, 1e-12);
  });
  it('M10 8.8 at mu 0.12 lands in published chart ranges at 90% yield utilisation', () => {
    const F = permissiblePreload(640e6, 0.9, input.thread, 0.12);
    expect(F).toBeGreaterThan(27_000);
    expect(F).toBeLessThan(32_000);
    // Assembly von Mises stress of that preload is 90% of Rp0.2 by construction.
    within(assemblyStress(F, input), 0.9 * 640e6, 0.01);
    const MA = tighteningTorque(F, input);
    expect(MA).toBeGreaterThan(44);
    expect(MA).toBeLessThan(55);
  });
  it('over-torquing a small bolt is detected', () => {
    const j = boltedJoint({ size: 'M6', propertyClass: '4.6', torque: 30, surface: 'zinc-plated', count: 1, muFaying: 0.3, interfaces: 1, plateThickness: 0.005, plateUltimate: 400e6, bendingArm: 0.02, torsionArm: 0.01 });
    expect(j.overTorqued).toBe(true);
    const ok = boltedJoint({ size: 'M6', propertyClass: '8.8', torque: 9, surface: 'zinc-plated', count: 1, muFaying: 0.3, interfaces: 1, plateThickness: 0.005, plateUltimate: 400e6, bendingArm: 0.02, torsionArm: 0.01 });
    expect(ok.overTorqued).toBe(false);
    expect(ok.slipShear).toBeLessThan(ok.boltShear);
  });
});

describe('helical springs (Shigley ch. 10)', () => {
  const s = { d: 0.002, D: 0.02, Na: 10, L0: 0.06, wire: SPRING_WIRES['music-wire-a228']! };
  it('rate k = d^4 G / (8 D^3 Na)', () => within(springRate(s), (0.002 ** 4 * 81.7e9) / (8 * 0.02 ** 3 * 10), 1e-12));
  it('music wire S_ut at 2 mm is ~2000 MPa', () => within(wireUltimate(s), 1999.5e6, 0.002));
  it('surge frequency ~181 Hz for this spring', () => within(surgeFrequency(s), 181.5, 0.01));
  it('curvature factors agree to within a few percent', () => within(bergstrasser(10), wahl(10), 0.03));
  it('yield force produces exactly the allowable stress', () => within(shearStress(s, yieldForce(s)), 0.45 * wireUltimate(s), 1e-9));
  it('solid length for squared-and-ground ends', () => within(solidLength(s), 0.024, 1e-12));
});

describe('sections and beams', () => {
  it('round bar I = pi d^4 / 64', () => within(roundSection(0.02).I, 7.853982e-9, 1e-6));
  it('thin tube J = 2 I', () => within(tubeSection(0.05, 0.003).J, 2 * tubeSection(0.05, 0.003).I, 1e-12));
  it('rectangle plastic/elastic shape factor is 1.5', () => within(rectSection(0.05, 0.01).Z / rectSection(0.05, 0.01).S, 1.5, 1e-9));
  it('W8x31-like I-beam strong-axis shape factor is ~1.1', () => {
    const p = iBeamStrongAxis(0.203, 0.203, 0.011, 0.0072);
    expect(p.Z / p.S).toBeGreaterThan(1.05);
    expect(p.Z / p.S).toBeLessThan(1.2);
  });
  it('cantilever results', () => {
    const sec = rectSection(0.03, 0.006);
    within(cantileverCollapseLoad(sec.Z, 276e6, 0.5), (sec.Z * 276e6) / 0.5, 1e-12);
    within(cantileverDeflection(10, 1, 200e9, 1e-8), 10 / (3 * 200e9 * 1e-8), 1e-12);
    within(eulerBucklingLoad(200e9, 1e-8, 1, 1), Math.PI ** 2 * 2000, 1e-12);
  });
});

describe('wood fasteners (Wood Handbook ch. 8)', () => {
  it('metric screw constant 108.25 matches the inch-pound 15,700 form', () => {
    const G = 0.5, D = 0.004, L = 0.025;
    const lb = 15700 * G ** 2 * (D / 0.0254) * (L / 0.0254);
    within(withdrawalUltimate('wood-screw', G, D, L), lb * 4.448222, 0.001);
  });
  it('metric nail constant 54.12 matches the inch-pound 7,850 form', () => {
    const G = 0.42, D = 0.0033, L = 0.03;
    const lb = 7850 * G ** 2.5 * (D / 0.0254) * (L / 0.0254);
    within(withdrawalUltimate('nail', G, D, L), lb * 4.448222, 0.001);
  });
  it('dowel bearing metric constant matches 16,600 psi', () => within(dowelBearingStrength(0.5, 0.004), 16600 * 6894.757 * 0.5 ** 1.84, 0.001));
  it('denser wood holds screws better', () => expect(withdrawalUltimate('wood-screw', 0.68, 0.004, 0.02)).toBeGreaterThan(withdrawalUltimate('wood-screw', 0.35, 0.004, 0.02)));
});

describe('welds, rivets, adhesives', () => {
  it('fillet weld: 6 mm leg x 100 mm E70 on A36 ~ 123 kN', () => within(filletWeldCapacity(0.006, 0.1, 483e6, 400e6), 0.7071 * 0.006 * 0.1 * 0.6 * 400e6, 1e-9));
  it('weldability matrix', () => {
    expect(weldable('steel', 'steel')).toBe(true);
    expect(weldable('steel', 'stainless')).toBe(true);
    expect(weldable('aluminum', 'steel')).toBe(false);
    expect(weldable('none', 'none')).toBe(false);
  });
  it('rivet shear', () => within(rivetShear(2, 0.004, 400e6), 2 * 240e6 * Math.PI * 4e-6, 1e-9));
  it('adhesive bonds are far weaker in peel than shear', () => {
    const a = ADHESIVES['cyanoacrylate']!;
    const c = bondCapacities(0.02, 0.02, a.lapShear, a.peel);
    // Moment that breaks the bond, expressed as an edge force at the bond length, is much less than the shear capacity.
    expect(c.bending / 0.02).toBeLessThan(c.shear / 10);
  });
  it('cure fraction ramps to 1', () => {
    const a = ADHESIVES['epoxy-5min']!;
    expect(cureFraction(a, 0)).toBe(0);
    expect(cureFraction(a, 5 * a.cureTau)).toBeGreaterThan(0.99);
  });
});

describe('magnets (Gilbert model)', () => {
  const Br = 1.3, R = 0.005, h = 0.005;
  function coaxialForce(gap: number, rings: number) {
    const zc = h + gap;
    // B stacked on A in the same orientation (N of A toward S of B) -> attraction (negative z force on B).
    const B = cylinderCharges([0, 0, zc], [0, 0, 1], R, h, Br, rings);
    return -magnetWrench(cylinderFaces([0, 0, 0], [0, 0, 1], R, h, Br), B, [0, 0, zc])[2]!;
  }
  it('agrees with the point-charge closed form far away', () => {
    const x = 30 * R;
    within(coaxialForce(x, 3), coaxialCylinderPointChargeForce(Br, R, h, x), 0.01);
  });
  it('approaches the point-dipole law in the far field', () => {
    const r = 40 * R;
    const m = dipoleMoment(Br, Math.PI * R * R * h);
    within(coaxialForce(r - h, 2), coaxialDipoleForce(m, m, r), 0.02);
  });
  it('near contact converges with quadrature refinement and stays finite', () => {
    const ref = coaxialForce(0.0002, 14);
    expect(Number.isFinite(ref)).toBe(true);
    within(coaxialForce(0.0002, 4), ref, 0.03);
    within(coaxialForce(0.003, 3), coaxialForce(0.003, 14), 0.02);
    // Bounded above by the two touching faces alone (uniform-sheet limit Br^2 A / (2 mu0) = 52.8 N here)
    // and in the range manufacturers publish for a 10 x 5 mm N42 disc pair (~20-30 N).
    expect(ref).toBeLessThan(52.8);
    expect(ref).toBeGreaterThan(15);
  });
  it('image method: a magnet attracts a steel face', () => {
    const c: [number, number, number] = [0, 0, 0.01];
    const img = imageFaces(cylinderFaces(c, [0, 0, 1], R, h, Br), [0, 0, 0], [0, 0, 1], 1);
    const f = magnetWrench(img, cylinderCharges(c, [0, 0, 1], R, h, Br, 3), c)[2]!;
    expect(f).toBeLessThan(0); // pulled toward the plate (-z)
  });
});

describe('mechanics', () => {
  it('Lewis form factor table', () => {
    within(lewisFormFactor(20), 0.322, 1e-9);
    within(lewisFormFactor(25), (0.337 + 0.346) / 2, 1e-9);
  });
  it('DC motor torque-speed line', () => {
    const m = { V: 12, Kv: 1000, R: 0.5, ratio: 1, efficiency: 1 };
    const spec = dcMotorSpecs(m);
    within(dcMotorTorque(m, 0), spec.stallTorque, 1e-12);
    expect(Math.abs(dcMotorTorque(m, spec.noLoadSpeed))).toBeLessThan(1e-9);
  });
  it('rubber band is tension only', () => {
    expect(neoHookeanBandForce(0.5e6, 1e-5, 0.9)).toBe(0);
    within(neoHookeanBandForce(0.5e6, 1e-5, 2), 0.5e6 * 1e-5 * (2 - 0.25), 1e-12);
  });
  it('capstan and bearing', () => {
    within(capstanRatio(0.3, Math.PI), Math.exp(0.3 * Math.PI), 1e-12);
    within(bearingFrictionTorque(0.0015, 1000, 0.008), 0.006, 1e-12);
  });
});

describe('material catalog', () => {
  it('every material is complete, sourced and physical', () => {
    const ids = new Set<string>();
    for (const m of MATERIALS) {
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
      expect(m.source.length).toBeGreaterThan(5);
      expect(m.density).toBeGreaterThan(50);
      expect(m.E).toBeGreaterThan(0);
      expect(m.ultimate).toBeGreaterThan(0);
      expect(m.yield).toBeLessThanOrEqual(m.ultimate);
      if (m.category === 'wood') expect(m.specificGravity).toBeGreaterThan(0);
      if (m.category === 'magnet') expect(m.remanence).toBeGreaterThan(0);
    }
  });
  it('austenitic stainless and aluminium are not magnetic; carbon steel is', () => {
    const f = (id: string) => MATERIALS.find((m) => m.id === id)!.ferromagnetic;
    expect(f('stainless.304')).toBe(false);
    expect(f('aluminum.6061-t6')).toBe(false);
    expect(f('steel.a36')).toBe(true);
  });
});

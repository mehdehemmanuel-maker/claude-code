// The fusion law (src/engineering/fusion.ts): one law for every material, from the properties every material has.
// Each verdict here is the one practice knows: like metals fuse, steel to stainless fuses, aluminium to steel and
// copper to aluminium form brittle intermetallics, brass loses its zinc before copper melts, wood and concrete never
// melt, glass fuses only hot enough not to crack, and thermoplastics fuse where they mix and neither breaks down.

import { describe, expect, it } from 'vitest';
import { getMaterial } from '../../src/data/materials';
import { fusible } from '../../src/engineering/fusion';

const f = (a: string, b: string, t0?: number) => fusible(getMaterial(a), getMaterial(b), t0);

describe('fusion, by one law for every material', () => {
  it('like metals fuse; metals of one base fuse; the cooling strain is within what they stretch', () => {
    for (const [a, b] of [['steel.a36', 'steel.a36'], ['steel.a36', 'stainless.304'], ['stainless.304', 'stainless.316'], ['aluminum.6061-t6', 'aluminum.5052-h32'], ['titanium.ti6al4v', 'titanium.ti6al4v']]) expect(f(a!, b!).fuses).toBe(true);
    // steel to stainless: |17.3 - 11.7| µm/m·K over 1400 - 20 K is 0.77 %, inside the 20 % they stretch
    expect(f('steel.a36', 'stainless.304').checks.at(-1)!.says).toMatch(/0\.77 % strain/);
  });
  it('metals that do not dissolve in each other do not fuse, by the Hume-Rothery rules', () => {
    expect(f('aluminum.6061-t6', 'steel.a36').why).toMatch(/aluminium is FCC and iron BCC, aluminium has valence 3 and iron 2; where they meet, brittle intermetallics form/);
    expect(f('copper.c110', 'aluminum.6061-t6').why).toMatch(/copper has valence 1 and aluminium 3/);
    expect(f('steel.a36', 'titanium.ti6al4v').fuses).toBe(false);
  });
  it('what is lost before the other melts, or never melts, does not fuse', () => {
    expect(f('copper.c110', 'brass.c360').why).toMatch(/Brass C360 .* is lost first: its zinc boils at 907 °C/);
    expect(f('polymer.pc', 'polymer.pom').why).toMatch(/Acetal \(POM\) is lost first: it gives off formaldehyde/);
    expect(f('wood.birch-plywood', 'wood.birch-plywood').why).toMatch(/wood never melts/);
    expect(f('concrete.c30', 'steel.a36').why).toMatch(/Concrete C30 cannot fuse/);
    expect(f('composite.cfrp', 'composite.cfrp').why).toMatch(/a thermoset, it never melts/);
  });
  it('a brittle one cracks under a local melt, unless preheated within its thermal-shock limit', () => {
    // soda-lime glass: 40 MPa (1 - 0.22) / (72 GPa · 9 µm/m·K) = 48 K; a 706 K step cracks it, a 26 K step from 700 °C does not
    expect(f('glass.soda-lime', 'glass.soda-lime').why).toMatch(/thermal-shock limit σ\(1−ν\)\/\(Eα\) = 48 K, so it cracks; preheated to 678 °C/);
    expect(f('glass.soda-lime', 'glass.soda-lime', 700).fuses).toBe(true);
    expect(f('cast-iron.gray-30', 'steel.a36').fuses).toBe(false);
  });
  it('thermoplastics fuse where they mix when molten, and not where they part like oil and water', () => {
    expect(f('polymer.abs', 'polymer.pmma').fuses).toBe(true); expect(f('polymer.abs', 'polymer.pc').fuses).toBe(true); expect(f('polymer.pla', 'polymer.pla').fuses).toBe(true);
    expect(f('polymer.hdpe', 'polymer.abs').why).toMatch(/3\.0 MPa\^½ apart \(over 2\)/);
    expect(f('polymer.abs', 'steel.a36').why).toMatch(/held by thermoplastic bonds and Structural steel ASTM A36 by metallic/);
  });
});

// What the phases of a mix are, where nothing else here says it (docs/REALITY.md phase 2.4): the figures a mixture
// (src/nexus/mixture.ts) is worked out from. Each figure says where it is from and how far it is known. "Typical" here is
// a value within the range the handbooks give for the material as commonly made, not yet checked against one cited
// table: what a supplier's datasheet (to be linked) confirms or replaces.

export interface Figure { value: number; source: string; evidence: 'specified' | 'handbook' | 'secondary' | 'typical' }
const TORAY = 'Toray Composite Materials America, TORAYCA T300 technical data sheet (rev. 2025): lot averages, for reference';
const PSLC = 'Polymer Science Learning Center, "Properties of fibers and conventional bulk materials" (pslc.ws), table';
const INCROPERA_A4 = 'Incropera, DeWitt, Bergman, Lavine, Fundamentals of Heat and Mass Transfer, 7th ed., table A.4 (air at 300 K, 1 atm)';
const TYPICAL = 'typical: within the handbooks\' range for it as commonly made; not yet checked against one cited table';
const t = (value: number): Figure => ({ value, source: TYPICAL, evidence: 'typical' });

/** By material id: what it is and its figures by property key (as matter.ts names them; SI units). */
export const CONSTITUENTS: Record<string, { is: string; family?: string; figures: Record<string, Figure> }> = {
  'carbon-fibre-t300': { is: 'carbon fibre, standard modulus (Toray T300), the bare fibre', family: 'ceramic', figures: {
    density: { value: 1760, source: TORAY, evidence: 'specified' }, E: { value: 230e9, source: `${TORAY} (along the fibre)`, evidence: 'specified' }, 'E across': t(15e9),
    ultimate: { value: 3530e6, source: TORAY, evidence: 'specified' }, nu: t(0.2), k: t(10.5), c: t(710), alpha: t(-0.4e-6), conductivity: t(5.9e4) } },
  'e-glass': { is: 'E-glass fibre', family: 'glass', figures: {
    density: { value: 2540, source: PSLC, evidence: 'secondary' }, E: { value: 72.4e9, source: PSLC, evidence: 'secondary' }, ultimate: { value: 3450e6, source: PSLC, evidence: 'secondary' },
    k: { value: 1.04, source: PSLC, evidence: 'secondary' }, nu: t(0.22), c: t(810), alpha: t(5.0e-6), conductivity: t(1e-12) } },
  epoxy: { is: 'epoxy, cured, unfilled', figures: { E: t(3.0e9), nu: t(0.35), k: t(0.2), c: t(1100), alpha: t(60e-6), ultimate: t(70e6), conductivity: t(1e-13) } },
  silicone: { is: 'silicone rubber, about 50 Shore A', figures: { E: t(2.5e6), nu: t(0.49), k: t(0.2), c: t(1460), alpha: t(300e-6), ultimate: t(7e6), conductivity: t(1e-13) } },
  alumina: { is: 'alumina, 96 %', figures: { E: t(300e9), nu: t(0.21), k: t(25), c: t(880), alpha: t(8.0e-6), ultimate: t(300e6), conductivity: t(1e-12) } },
  'silicon-carbide': { is: 'silicon carbide, sintered', family: 'ceramic', figures: { density: t(3210), E: t(410e9), nu: t(0.14), k: t(120), c: t(750), alpha: t(4.0e-6), ultimate: t(400e6) } },
  'cement-paste': { is: 'hardened portland cement paste, water to cement 0.5', family: 'concrete and mortar', figures: { density: t(1950), E: t(15e9), nu: t(0.2), k: t(0.9), c: t(1000), alpha: t(15e-6), ultimate: t(3e6) } },
  granite: { is: 'granite', figures: { E: t(50e9), nu: t(0.25), k: t(2.8), c: t(790), alpha: t(8e-6), ultimate: t(10e6) } },
  air: { is: 'air, still, at 300 K and 1 atm', family: 'fluid', figures: { density: { value: 1.1614, source: INCROPERA_A4, evidence: 'handbook' }, k: { value: 0.0263, source: INCROPERA_A4, evidence: 'handbook' }, c: { value: 1007, source: INCROPERA_A4, evidence: 'handbook' } } },
};

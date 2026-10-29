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
  // the grades the handbook here has only a stand-in for, or nothing: typical figures until a supplier's datasheet
  'steel-tool': { is: '', figures: { E: t(210000000000.0), nu: t(0.29), k: t(25), c: t(460), alpha: t(1.15e-05), conductivity: t(2500000.0), yield: t(1500000000.0), ultimate: t(1900000000.0) } },
  'stainless-440c': { is: '', figures: { E: t(200000000000.0), nu: t(0.28), k: t(24.2), c: t(460), alpha: t(1.02e-05), conductivity: t(1600000.0), yield: t(1900000000.0), ultimate: t(1970000000.0) } },
  'al-6063': { is: '', figures: { E: t(68900000000.0), nu: t(0.33), k: t(200), c: t(900), alpha: t(2.34e-05), conductivity: t(30700000.0), yield: t(214000000.0), ultimate: t(241000000.0) } },
  'al-3003': { is: '', figures: { E: t(68900000000.0), nu: t(0.33), k: t(159), c: t(893), alpha: t(2.32e-05), conductivity: t(24000000.0), yield: t(145000000.0), ultimate: t(150000000.0) } },
  'al-a380': { is: '', figures: { E: t(71000000000.0), nu: t(0.33), k: t(96.2), c: t(963), alpha: t(2.18e-05), conductivity: t(16000000.0), yield: t(160000000.0), ultimate: t(324000000.0) } },
  'magnet-wire': { is: '', figures: { E: t(115000000000.0), nu: t(0.31), c: t(385), alpha: t(1.7e-05), conductivity: t(58000000.0), yield: t(69000000.0), ultimate: t(220000000.0) } },
  'titanium': { is: '', figures: { density: t(4430) } },
  'lead': { is: '', figures: { E: t(16000000000.0), nu: t(0.44), alpha: t(2.9e-05), conductivity: t(4800000.0), yield: t(5000000.0), ultimate: t(17000000.0) } },
  'nickel-plate': { is: '', figures: { c: t(444), E: t(200000000000.0), nu: t(0.31), alpha: t(1.34e-05), conductivity: t(14300000.0), yield: t(150000000.0), ultimate: t(400000000.0) } },
  'gold': { is: '', figures: { E: t(79000000000.0), nu: t(0.44), alpha: t(1.42e-05), conductivity: t(41000000.0), ultimate: t(120000000.0) } },
  'silver': { is: '', figures: { E: t(83000000000.0), nu: t(0.37), alpha: t(1.89e-05), conductivity: t(63000000.0), ultimate: t(170000000.0) } },
  'tungsten': { is: '', figures: { E: t(411000000000.0), nu: t(0.28), k: t(173), alpha: t(4.5e-06), conductivity: t(17900000.0), ultimate: t(980000000.0) } },
  'ndfeb': { is: '', figures: { E: t(160000000000.0), nu: t(0.24), k: t(9), c: t(440), alpha: t(5e-06), conductivity: t(670000.0), ultimate: t(80000000.0) } },
  'abs': { is: '', figures: { E: t(2300000000.0), nu: t(0.35), k: t(0.17), c: t(1400), alpha: t(9e-05), conductivity: t(1e-14), yield: t(40000000.0), ultimate: t(44000000.0) } },
  'pp': { is: '', figures: { E: t(1500000000.0), nu: t(0.42), k: t(0.22), c: t(1900), alpha: t(0.00012), conductivity: t(1e-15), yield: t(32000000.0), ultimate: t(35000000.0) } },
  'pc': { is: '', figures: { E: t(2350000000.0), nu: t(0.37), k: t(0.2), c: t(1200), alpha: t(6.8e-05), conductivity: t(1e-14), yield: t(62000000.0), ultimate: t(66000000.0) } },
  'xlpe': { is: '', figures: { E: t(600000000.0), nu: t(0.45), k: t(0.3), c: t(2300), alpha: t(0.00018), conductivity: t(1e-16), ultimate: t(20000000.0) } },
  'pom': { is: '', figures: { E: t(2900000000.0), nu: t(0.35), k: t(0.31), c: t(1460), alpha: t(0.00011), conductivity: t(1e-13), yield: t(65000000.0), ultimate: t(70000000.0) } },
  'ptfe': { is: '', figures: { E: t(500000000.0), nu: t(0.46), k: t(0.25), c: t(1050), alpha: t(0.00013), conductivity: t(1e-16), ultimate: t(25000000.0) } },
  'pet': { is: '', figures: { E: t(2800000000.0), nu: t(0.37), k: t(0.24), c: t(1100), alpha: t(7e-05), conductivity: t(1e-14), yield: t(55000000.0), ultimate: t(60000000.0) } },
  'pbt': { is: '', figures: { E: t(2500000000.0), nu: t(0.38), k: t(0.21), c: t(1250), alpha: t(0.0001), conductivity: t(1e-14), ultimate: t(55000000.0) } },
  'pla': { is: '', figures: { E: t(3500000000.0), nu: t(0.36), k: t(0.13), c: t(1600), alpha: t(7e-05), conductivity: t(1e-14), ultimate: t(60000000.0) } },
  'pa66': { is: 'polyamide 66, unfilled, dry as moulded', family: 'polymer', figures: { density: t(1140), E: t(3000000000.0), nu: t(0.4), k: t(0.25), c: t(1700), alpha: t(8e-05), conductivity: t(1e-12), yield: t(80000000.0), ultimate: t(85000000.0) } },
  'nbr': { is: '', figures: { E: t(5000000.0), nu: t(0.49), k: t(0.25), c: t(1550), alpha: t(0.0002), conductivity: t(1e-10), ultimate: t(15000000.0) } },
  'epdm': { is: '', figures: { E: t(4000000.0), nu: t(0.49), k: t(0.25), c: t(2000), alpha: t(0.00016), conductivity: t(1e-13), ultimate: t(12000000.0) } },
  'fkm': { is: '', figures: { E: t(6000000.0), nu: t(0.49), k: t(0.2), c: t(1250), alpha: t(0.00016), conductivity: t(1e-12), ultimate: t(12000000.0) } },
  'zirconia': { is: '', figures: { E: t(205000000000.0), nu: t(0.31), k: t(2.5), c: t(460), alpha: t(1.05e-05), conductivity: t(1e-10), ultimate: t(900000000.0) } },
  'pzt': { is: '', figures: { E: t(63000000000.0), nu: t(0.31), k: t(1.2), c: t(350), alpha: t(4e-06), conductivity: t(1e-10), ultimate: t(75000000.0) } },
  'ntc-ceramic': { is: '', figures: { E: t(150000000000.0), nu: t(0.3), k: t(2), c: t(700), alpha: t(9e-06), ultimate: t(60000000.0) } },
  'hfo2': { is: '', figures: { E: t(200000000000.0), nu: t(0.3), k: t(1.1), c: t(290), alpha: t(6e-06), conductivity: t(1e-12) } },
  'sio2': { is: '', figures: { E: t(72000000000.0), nu: t(0.17), k: t(1.38), c: t(740), alpha: t(5.5e-07), conductivity: t(1e-16), ultimate: t(50000000.0) } },
  'silicon': { is: '', figures: { E: t(130000000000.0), nu: t(0.28), k: t(149), c: t(705), alpha: t(2.6e-06), conductivity: t(0.00043), ultimate: t(300000000.0) } },
  'graphite': { is: '', figures: { E: t(10000000000.0), nu: t(0.2), k: t(100), c: t(710), alpha: t(4e-06), conductivity: t(100000.0), ultimate: t(40000000.0) } },
  'marble': { is: '', figures: { density: t(2700), E: t(50000000000.0), nu: t(0.25), k: t(2.8), c: t(880), alpha: t(7e-06), ultimate: t(15000000.0) } },
  'sand-quartz': { is: 'quartz sand grains (as aggregate)', family: 'stone', figures: { density: t(2650), E: t(95000000000.0), nu: t(0.08), k: t(6), c: t(740), alpha: t(1.2e-05) } },
  air: { is: 'air, still, at 300 K and 1 atm', family: 'fluid', figures: { E: t(0), nu: t(0), alpha: t(0), density: { value: 1.1614, source: INCROPERA_A4, evidence: 'handbook' }, k: { value: 0.0263, source: INCROPERA_A4, evidence: 'handbook' }, c: { value: 1007, source: INCROPERA_A4, evidence: 'handbook' } } },
};

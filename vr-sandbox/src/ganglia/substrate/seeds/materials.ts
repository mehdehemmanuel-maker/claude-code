// Materials as a property manifold: families, their properties as ranges with sources, and the roles each can fill
// because of them. Copper is not in a bin: it is a conductor, a heat spreader, a winding, a collector, a feedstock.
import { MATERIALS } from '../../../data/materials';
import type { Source } from '../../types';
import { Pack, est, param } from '../dsl';
import type { Parameter, Provenance } from '../model';

const CALLISTER: Source = { cite: 'Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018 (Appendix B property tables)', kind: 'textbook' };
const IEC: Source = { cite: 'IEC 60028 International standard of resistance for copper; CRC Handbook of Chemistry and Physics, 97th ed.', kind: 'standard' };

/** The family a category word names: the stocked materials' categories, the words processes and block pieces use. */
export const FAMILY_OF_CATEGORY: Record<string, string> = {
  steel: 'material.steel', stainless: 'material.stainless', 'cast-iron': 'material.cast-iron', aluminum: 'material.aluminium-alloy', aluminium: 'material.aluminium-alloy',
  copper: 'material.copper-alloy', brass: 'material.copper-alloy', bronze: 'material.bronze', 'copper-alloy': 'material.copper-alloy', titanium: 'material.titanium-alloy',
  wood: 'material.wood', 'engineered-wood': 'material.wood', polymer: 'material.polymer', plastic: 'material.polymer', abs: 'polymer.abs', rubber: 'material.elastomer', elastomer: 'material.elastomer',
  glass: 'material.glass', concrete: 'material.concrete', ceramic: 'material.ceramic', textile: 'material.fibre', leather: 'material.natural', foam: 'material.foam', cork: 'material.natural',
  composite: 'material.composite', ground: 'material.natural', stone: 'material.natural', magnet: 'material.magnetic', lead: 'element.lead', polyolefin: 'material.thermoplastic', ptfe: 'material.thermoplastic', thermoplastic: 'material.thermoplastic', thermoset: 'material.thermoset', fibre: 'material.fibre', fiber: 'material.fibre',
};
export const familyOfWord = (word: string): string | undefined => FAMILY_OF_CATEGORY[word.trim().toLowerCase()];

// Numbers a family carries, each from a named page read on a date (S-6): ranges across the grades the page lists, SI.
const ETB = (page: string, url: string): Source => ({ cite: `The Engineering ToolBox, ${page} (read 2026-10-03)`, url, kind: 'handbook' });
const ETB_RHO = ETB('Metals and Alloys - Densities', 'https://www.engineeringtoolbox.com/metal-alloys-densities-d_50.html');
const ETB_E = ETB('Young\'s Modulus, Tensile Strength and Yield Strength Values for common Materials', 'https://www.engineeringtoolbox.com/young-modulus-d_417.html');
const ETB_K = ETB('Thermal Conductivity of Metals and Alloys', 'https://www.engineeringtoolbox.com/thermal-conductivity-metals-d_858.html');
const n = (sym: string, name: string, unit: string, low: number, high: number, of: Source): Parameter => ({ sym, name, unit, low, high, of });
export const FAMILY_NUMBERS: Record<string, Parameter[]> = {
  'material.steel': [n('rho', 'density', 'kg/m^3', 7850, 7850, ETB_RHO), n('E', 'Young\'s modulus', 'Pa', 200e9, 200e9, ETB_E), n('sigma_y', 'yield strength, structural grades', 'Pa', 205e6, 690e6, ETB_E), n('sigma_u', 'ultimate strength, structural grades', 'Pa', 330e6, 760e6, ETB_E), n('k', 'thermal conductivity', 'W/m K', 36, 54, ETB_K)],
  'material.stainless': [n('rho', 'density', 'kg/m^3', 7480, 8000, ETB_RHO), n('E', 'Young\'s modulus', 'Pa', 180e9, 180e9, ETB_E), n('sigma_y', 'yield strength, AISI 302', 'Pa', 502e6, 502e6, ETB_E), n('sigma_u', 'ultimate strength, AISI 302', 'Pa', 860e6, 860e6, ETB_E), n('k', 'thermal conductivity', 'W/m K', 14.3, 14.4, ETB_K)],
  'material.cast-iron': [n('rho', 'density', 'kg/m^3', 6800, 7800, ETB_RHO), n('sigma_u', 'ultimate strength, ASTM A-48 4.5 % C', 'Pa', 170e6, 170e6, ETB_E), n('k', 'thermal conductivity', 'W/m K', 31, 52, ETB_K)],
  'material.aluminium-alloy': [n('rho', 'density', 'kg/m^3', 2640, 2830, ETB_RHO), n('E', 'Young\'s modulus', 'Pa', 69e9, 70e9, ETB_E), n('k', 'thermal conductivity', 'W/m K', 150, 190, ETB_K)],
  'material.copper-alloy': [n('rho', 'density', 'kg/m^3', 7400, 8940, ETB_RHO), n('E', 'Young\'s modulus', 'Pa', 96e9, 125e9, ETB_E), n('sigma_u', 'ultimate strength, copper to brass', 'Pa', 220e6, 250e6, ETB_E), n('k', 'thermal conductivity', 'W/m K', 26, 401, ETB_K)],
  'material.polymer': [n('E', 'Young\'s modulus, unfilled thermoplastics', 'Pa', 0.11e9, 4.1e9, ETB_E), n('sigma_u', 'ultimate strength, unfilled thermoplastics', 'Pa', 10e6, 100e6, ETB_E)],
};

export function materials(): Pack {
  const p = new Pack('materials', CALLISTER);
  const props: [string, string, string][] = [
    ['prop.density', 'Mass per volume, kg/m³.', 'kg/m^3'], ['prop.yield-strength', 'The stress at which plastic strain begins, Pa.', 'Pa'], ['prop.tensile-strength', 'The greatest stress before fracture, Pa.', 'Pa'],
    ['prop.youngs-modulus', 'Stiffness: stress over elastic strain, Pa.', 'Pa'], ['prop.hardness', 'Resistance to indentation (Brinell, Vickers, Rockwell).', 'HV'], ['prop.toughness', 'Energy absorbed to fracture; fracture toughness K_Ic, Pa√m.', 'Pa m^0.5'],
    ['prop.fatigue-strength', 'The cyclic stress endured for a given number of cycles.', 'Pa'], ['prop.elongation', 'Plastic strain at fracture: ductility.', '-'], ['prop.thermal-conductivity', 'Heat flow per gradient, W/m K.', 'W/m K'],
    ['prop.electrical-conductivity', 'Current per field, S/m.', 'S/m'], ['prop.permeability', 'How much a field magnetises it.', '-'], ['prop.refractive-index', 'How much it slows light.', '-'], ['prop.transparency', 'How much light passes.', '-'],
    ['prop.corrosion-resistance', 'How slowly its surroundings consume it.', '-'], ['prop.melting-point', 'Where it becomes liquid, K.', 'K'], ['prop.glass-transition', 'Where a polymer softens, K.', 'K'], ['prop.thermal-expansion', 'Strain per kelvin.', '1/K'],
    ['prop.specific-heat', 'Heat per mass per kelvin.', 'J/kg K'], ['prop.machinability', 'How easily it is cut.', '-'], ['prop.weldability', 'How readily it fuses to itself.', '-'], ['prop.castability', 'How well it fills a mould.', '-'], ['prop.formability', 'How far it bends or draws without cracking.', '-'],
    ['prop.recyclability', 'How well it can be remelted or reprocessed.', '-'], ['prop.biocompatibility', 'How the body tolerates it.', '-'], ['prop.cost', 'Price per kilogram.', 'USD/kg'],
  ];
  for (const [id, says, unit] of props) p.e(id, 'property', says, { params: [param('unit', 'unit', CALLISTER, { values: [unit] })] });
  p.link('prop.yield-strength', { 'governed-by': ['stress.axial', 'hooke'], 'measured-by': ['test.tensile'] });
  p.link('prop.youngs-modulus', { 'governed-by': ['hooke'], 'measured-by': ['test.tensile'] });
  p.link('prop.electrical-conductivity', { 'governed-by': ['ohm', 'wire.resistance'] });
  p.link('prop.thermal-conductivity', { 'governed-by': ['conduction', 'fourier.law'] });
  p.link('prop.fatigue-strength', { 'governed-by': ['fatigue.endurance.steel', 'paris.law'] });
  p.link('prop.toughness', { 'governed-by': ['griffith'] });
  p.link('prop.hardness', { 'governed-by': ['hall-petch'] });

  // families
  const fam = (id: string, says: string, links: Parameters<Pack['link']>[1], src: Source = CALLISTER) => { p.e(id, ['material', 'manifold'], says, { source: src, params: FAMILY_NUMBERS[id] }); p.link(id, links, src); };
  fam('material.metal', 'Crystals of atoms sharing a sea of electrons: ductile, conductive, opaque, strong, dense.', { 'has-property': ['prop.electrical-conductivity', 'prop.thermal-conductivity', 'prop.yield-strength', 'prop.elongation'], plays: ['role.structural-member', 'role.electrical-conductor', 'role.thermal-conductor'], 'produced-by': ['process.casting.sand', 'process.forging', 'process.rolling', 'process.extrusion', 'turn', 'mill', 'weld.mig'], 'governed-by': ['hall-petch', 'hooke', 'fatigue.endurance.steel'], 'fails-by': ['failure.fatigue', 'failure.corrosion', 'failure.creep', 'failure.overload'], 'in-view': ['view.materials', 'view.chemical'] });
  fam('material.alloy', 'A metal with others dissolved or dispersed in it: stronger, harder, or more resistant than the pure element.', { 'is-a': ['material.metal'], 'governed-by': ['hall-petch', 'composite.rule-of-mixtures'], 'produced-by': ['process.melting', 'process.heat-treatment.quench-temper'] });
  fam('material.steel', 'Iron with up to 2 % carbon and alloying: the strongest cheap structural material, heat-treatable over a wide range.', { 'is-a': ['material.alloy'], 'made-of': ['element.iron', 'element.carbon', 'element.manganese', 'element.chromium'], 'produced-by': ['process.blast-furnace', 'process.basic-oxygen', 'process.electric-arc-furnace', 'process.rolling', 'process.heat-treatment.quench-temper'], 'has-property': ['prop.yield-strength', 'prop.hardness', 'prop.weldability'], 'fails-by': ['failure.corrosion', 'failure.fatigue', 'failure.hydrogen-embrittlement'], 'improved-by': [['process.heat-treatment.quench-temper', 'martensite then tempering: strength and toughness traded by temperature'], ['material.stainless', 'chromium above 11 % makes a passive oxide']] });
  fam('material.stainless', 'Steel with 11 % or more chromium: a self-healing chromium oxide skin.', { 'is-a': ['material.steel'], 'made-of': ['element.iron', 'element.chromium', 'element.nickel', 'element.molybdenum'], 'has-property': ['prop.corrosion-resistance'], 'fails-by': ['failure.galling', 'failure.pitting-corrosion', 'failure.stress-corrosion-cracking'], plays: ['role.structural-member'] });
  fam('material.cast-iron', 'Iron with 2 to 4 % carbon as graphite: cheap castings that damp vibration and resist wear, brittle in tension.', { 'is-a': ['material.alloy'], 'produced-by': ['process.casting.sand'], 'has-property': ['prop.castability', 'prop.machinability'], 'fails-by': ['failure.brittle-fracture'] });
  fam('material.aluminium-alloy', 'Aluminium with magnesium, silicon, copper or zinc: a third of steel\'s density, a third of its stiffness, heat-treatable to half its strength, an oxide skin.', { 'is-a': ['material.alloy'], 'made-of': ['element.aluminium', 'element.magnesium', 'element.silicon', 'element.copper', 'element.zinc'], 'produced-by': ['process.hall-heroult', 'process.extrusion', 'process.rolling', 'process.casting.die', 'process.heat-treatment.age-hardening'], 'has-property': ['prop.density', 'prop.corrosion-resistance', 'prop.thermal-conductivity', 'prop.electrical-conductivity'], plays: ['role.structural-member', 'role.electrical-conductor', 'role.thermal-conductor', 'role.heat-spreader'], 'fails-by': ['failure.fatigue', 'failure.galvanic-corrosion'], 'improved-by': [['process.anodizing', 'a thick oxide for wear and colour']] });
  fam('material.copper-alloy', 'Copper and its alloys (brass with zinc, bronze with tin): the best common conductors of electricity and heat, easily formed, bearing surfaces.', { 'is-a': ['material.alloy'], 'made-of': ['element.copper', 'element.zinc', 'element.tin'], 'has-property': ['prop.electrical-conductivity', 'prop.thermal-conductivity', 'prop.formability', 'prop.corrosion-resistance'], plays: ['role.electrical-conductor', 'role.thermal-conductor', 'role.current-collector', 'role.winding-material', 'role.heat-spreader', 'role.connector-material', 'role.electromagnetic-material', 'role.bearing-surface', 'role.feedstock'], 'produced-by': ['process.smelting', 'process.electrorefining', 'process.wire-drawing', 'process.rolling', 'process.casting.sand'], 'fails-by': ['failure.corrosion', 'failure.creep', 'failure.fatigue'] });
  fam('material.titanium-alloy', 'Titanium with aluminium and vanadium: steel\'s strength at 60 % of its density, inert in the body and the sea, costly to make and cut.', { 'is-a': ['material.alloy'], 'made-of': ['element.titanium', 'element.aluminium', 'element.vanadium'], 'has-property': ['prop.yield-strength', 'prop.corrosion-resistance', 'prop.biocompatibility'], plays: ['role.structural-member', 'role.implant'], 'produced-by': ['process.kroll', 'process.forging', 'mill', 'process.additive.pbf'], 'fails-by': ['failure.galling', 'failure.fatigue'] });
  fam('material.nickel-superalloy', 'Nickel with chromium, cobalt, aluminium: strength and creep resistance to 1000 °C, turbine blades.', { 'is-a': ['material.alloy'], 'made-of': ['element.nickel', 'element.chromium', 'element.cobalt'], 'has-property': ['prop.yield-strength', 'prop.melting-point'], 'produced-by': ['process.casting.investment', 'process.single-crystal-casting', 'process.forging'], 'fails-by': ['failure.creep', 'failure.oxidation'], 'interacts-with': ['turbine'] });
  fam('material.ceramic', 'Ionic or covalent crystals or glasses of metals with oxygen, nitrogen or carbon: hard, stiff, refractory, insulating, brittle.', { 'has-property': ['prop.hardness', 'prop.melting-point', 'prop.youngs-modulus'], plays: ['role.insulator', 'role.dielectric', 'role.bearing-surface', 'role.refractory', 'role.abrasive'], 'produced-by': ['process.sintering', 'process.slip-casting', 'process.pressing', 'process.grinding'], 'governed-by': ['griffith'], 'fails-by': ['failure.brittle-fracture', 'failure.thermal-shock'], 'in-view': ['view.materials'] });
  fam('material.polymer', 'Long chain molecules: light, cheap to form, insulating, soft and creeping, limited in temperature.', { 'has-property': ['prop.density', 'prop.glass-transition', 'prop.formability'], plays: ['role.insulator', 'role.dielectric', 'role.bearing-surface', 'role.seal'], 'produced-by': ['process.injection-molding', 'process.extrusion', 'process.blow-molding', 'process.fff', 'process.polymerization'], 'fails-by': ['failure.creep', 'failure.uv-degradation', 'failure.stress-cracking'], 'made-of': ['chem.monomer', 'element.carbon', 'element.hydrogen'], 'governed-by': ['arrhenius'], 'in-view': ['view.materials', 'view.chemical'] });
  fam('material.thermoplastic', 'A polymer that melts and freezes again: PE, PP, PET, nylon, PC, ABS, PLA, PEEK.', { 'is-a': ['material.polymer'], 'produced-by': ['process.injection-molding', 'process.extrusion', 'process.fff'], 'has-property': ['prop.recyclability'] });
  fam('material.thermoset', 'A polymer cross-linked on curing, never melting again: epoxy, phenolic, polyurethane, silicone.', { 'is-a': ['material.polymer'], 'produced-by': ['process.compression-molding', 'process.lamination', 'process.casting.resin'] });
  fam('material.elastomer', 'A lightly cross-linked polymer above its glass transition: stretches to several times its length and returns.', { 'is-a': ['material.polymer'], 'has-property': ['prop.elongation'], plays: ['role.seal', 'role.spring', 'role.vibration-isolator', 'role.tyre'], 'produced-by': ['process.vulcanization', 'process.compression-molding'], 'governed-by': ['hooke'], 'fails-by': ['failure.compression-set', 'failure.ozone-cracking', 'failure.fatigue'] });
  fam('material.composite', 'Fibres in a matrix: the fibres carry the load, the matrix holds them and spreads it; stiff and strong along the fibres.', { 'has-part': ['material.fibre', 'material.matrix'], 'governed-by': ['composite.rule-of-mixtures', 'composite.transverse'], 'has-property': ['prop.yield-strength', 'prop.youngs-modulus', 'prop.density'], plays: ['role.structural-member'], 'produced-by': ['process.lamination', 'process.filament-winding', 'process.pultrusion', 'cff', 'process.autoclave-cure'], 'fails-by': ['failure.delamination', 'failure.fibre-breakage', 'failure.matrix-cracking'], 'analogous-to': [['bio.wood', 'cellulose fibres in a lignin matrix'], ['bio.bone', 'collagen fibres mineralised by hydroxyapatite'], ['bio.nacre', 'aragonite platelets in protein: brick and mortar']] });
  fam('material.semiconductor', 'A crystal whose conduction doping and fields control: silicon, germanium, gallium arsenide, silicon carbide, gallium nitride.', { plays: ['role.semiconductor'], 'has-property': ['prop.electrical-conductivity', 'prop.band-gap'], 'produced-by': ['process.czochralski', 'process.epitaxy', 'process.doping', 'process.zone-refining'], 'governed-by': ['shockley.diode', 'boltzmann.distribution'], 'made-of': ['element.silicon', 'element.gallium', 'element.arsenic', 'element.germanium'], 'in-view': ['view.materials', 'view.solid-state'] });
  fam('material.glass', 'A frozen liquid of silica and modifiers: transparent, hard, brittle, chemically inert, formed hot.', { 'is-a': ['material.ceramic'], 'has-property': ['prop.transparency', 'prop.refractive-index', 'prop.hardness'], plays: ['role.insulator', 'role.window', 'role.optic'], 'produced-by': ['process.float-glass', 'process.blowing', 'process.pressing', 'process.fibre-drawing'], 'governed-by': ['snell.law', 'griffith'], 'fails-by': ['failure.brittle-fracture', 'failure.thermal-shock'] });
  fam('material.carbon', 'Carbon as graphite, diamond, fibre, nanotube, graphene: the softest and the hardest, conductor and insulator, by its bonding.', { 'made-of': ['element.carbon'], plays: ['role.electrical-conductor', 'role.electrode', 'role.lubricant', 'role.abrasive', 'role.structural-member'], 'produced-by': ['process.pyrolysis', 'process.cvd', 'process.graphitization'] });
  fam('material.foam', 'A solid with gas cells: light, insulating, cushioning; open or closed cell, polymer, metal or ceramic.', { 'has-property': ['prop.density', 'prop.thermal-conductivity'], plays: ['role.insulator', 'role.cushion', 'role.flotation', 'role.core'], 'produced-by': ['process.foaming', 'process.extrusion'], 'governed-by': ['buoyancy', 'conduction'], 'analogous-to': [['bio.cancellous-bone', 'trabecular bone is a cellular solid'], ['bio.cork', 'a natural closed-cell foam']] });
  fam('material.fibre', 'A material drawn into a filament: carbon, glass, aramid, basalt, steel wire, natural (cotton, flax, silk).', { 'has-property': ['prop.tensile-strength'], plays: ['role.reinforcement', 'role.tension-member'], 'produced-by': ['process.fibre-drawing', 'process.spinning', 'process.pyrolysis'], 'analogous-to': [['bio.spider-silk', 'protein fibre stronger per weight than steel'], ['bio.collagen-fibre', 'the tension fibre of tendon, skin and bone']] });
  fam('material.wood', 'Cellulose fibres in lignin, grown in rings: stiff and strong along the grain, weak across, cheap, renewable, moving with moisture.', { 'is-a': ['material.composite', 'material.biological'], 'has-part': ['bio.cellulose', 'bio.lignin', 'bio.cell-wall'], 'has-property': ['prop.yield-strength', 'prop.density'], plays: ['role.structural-member', 'role.insulator', 'role.fuel'], 'produced-by': ['bio.tree-growth', 'saw', 'process.drying', 'process.lamination'], 'fails-by': ['failure.rot', 'failure.splitting', 'failure.creep'], 'governed-by': ['composite.rule-of-mixtures', 'beam.simply-supported.udl'] });
  fam('material.concrete', 'Aggregate in a cement paste that hardens by hydration: strong in compression, weak in tension (so steel reinforces it), cast in place.', { 'has-part': ['material.cement', 'material.aggregate', 'element.water', 'material.rebar'], 'has-property': ['prop.yield-strength', 'prop.density', 'prop.cost'], plays: ['role.structural-member', 'role.foundation'], 'produced-by': ['process.mixing', 'process.casting.formwork', 'process.curing'], 'fails-by': ['failure.cracking', 'failure.carbonation', 'failure.freeze-thaw', 'failure.creep'], 'governed-by': ['carbonation.capacity', 'stress.axial'] });
  fam('material.natural', 'What is used as grown or dug: wood, stone, leather, wool, cotton, cork, bone, horn.', { 'has-part': ['material.wood', 'material.stone', 'material.leather', 'material.cork', 'material.bone'], 'produced-by': ['bio.growth', 'process.quarrying', 'process.tanning'] });
  fam('material.biomaterial', 'A material made to work in or with a body: titanium, cobalt-chrome, UHMWPE, hydroxyapatite, PLA, silicone, collagen.', { 'has-property': ['prop.biocompatibility', 'prop.corrosion-resistance'], plays: ['role.implant', 'role.scaffold'], 'interacts-with': ['bio.bone', 'bio.tissue', 'bio.immune-system'], 'fails-by': ['failure.rejection', 'failure.wear', 'failure.corrosion'] });
  fam('material.nanomaterial', 'Matter structured below 100 nm, where surface and quantum effects set its properties: nanotubes, graphene, quantum dots, nanoparticles.', { 'has-property': ['prop.electrical-conductivity', 'prop.tensile-strength'], 'produced-by': ['process.cvd', 'process.sol-gel', 'process.ball-milling', 'process.lithography'], 'governed-by': ['planck.energy', 'diffusion.time'], 'in-view': ['view.materials', 'view.chemical', 'view.quantum'] });
  fam('material.magnetic', 'Materials with ordered moments: soft (electrical steel, ferrite) for cores, hard (NdFeB, SmCo, alnico, hard ferrite) for magnets.', { 'has-property': ['prop.permeability', 'prop.remanence', 'prop.coercivity'], plays: ['role.magnetic-core', 'role.electromagnetic-material'], 'governed-by': ['magnetic.pull', 'ampere.law'], 'made-of': ['element.iron', 'element.neodymium', 'element.boron', 'element.cobalt', 'element.samarium'], 'produced-by': ['process.sintering', 'process.lamination', 'process.magnetizing'], 'fails-by': ['failure.demagnetization', 'failure.corrosion'] });

  // the stocked materials, each a realisation of a family, with roles derived from its numbers (bridge.ts adds the properties)
  for (const m of MATERIALS) {
    const fam = familyOfWord(m.id.split('.')[0]!);
    if (fam) p.link(m.id, { 'is-a': [fam] }, { derived: `the stocked material's category (${m.category})` });
  }
  // named materials referred to elsewhere
  const named: [string, string, string, string[]][] = [
    ['material.bronze', 'Copper with 8 to 12 % tin: a bearing and gear material against steel, cast and wear-resistant.', 'material.copper-alloy', ['role.bearing-surface']],
    ['material.phosphor-bronze', 'Bronze with phosphorus: springs and connector contacts.', 'material.copper-alloy', ['role.connector-material', 'role.spring']],
    ['material.beryllium-copper', 'Copper age-hardened by beryllium: the strongest copper, non-sparking tools, spring contacts.', 'material.copper-alloy', ['role.spring', 'role.connector-material']],
    ['material.babbitt', 'A tin or lead alloy for plain bearings: soft enough to embed grit, cast in place.', 'material.alloy', ['role.bearing-surface']],
    ['material.oil-impregnated-bronze', 'Sintered bronze with oil in its pores: a self-lubricating bushing.', 'material.bronze', ['role.bearing-surface']],
    ['material.ptfe', 'Polytetrafluoroethylene: the lowest friction solid, inert, soft, 260 °C.', 'material.thermoplastic', ['role.bearing-surface', 'role.seal', 'role.insulator']],
    ['material.acetal', 'Polyoxymethylene: a stiff, low-friction engineering plastic for gears and bushings.', 'material.thermoplastic', ['role.bearing-surface']],
    ['material.polyurethane', 'A polymer from tough elastomer to rigid foam, by its chemistry.', 'material.polymer', ['role.seal', 'role.tyre', 'role.cushion']],
    ['material.nitrile', 'NBR: the oil-resistant O-ring rubber, -30 to 100 °C.', 'material.elastomer', ['role.seal']],
    ['material.fluoroelastomer', 'FKM (Viton): seals for fuel, oil and 200 °C.', 'material.elastomer', ['role.seal']],
    ['material.silicone', 'Siloxane rubber: -60 to 200 °C, inert, weak in tear, insulating.', 'material.elastomer', ['role.seal', 'role.insulator']],
    ['material.neoprene', 'Polychloroprene: a weather-resistant belt and gasket rubber.', 'material.elastomer', ['role.seal']],
    ['material.aramid-cord', 'Kevlar fibre: belts, tyres, armour; strong in tension, weak in compression.', 'material.fibre', ['role.reinforcement']],
    ['material.ferrite', 'Iron oxide ceramic with manganese-zinc or nickel-zinc: a soft magnetic core with no eddy currents to megahertz.', 'material.magnetic', ['role.magnetic-core']],
    ['material.ferrite-hard', 'Strontium or barium ferrite: the cheap, weak, corrosion-proof permanent magnet.', 'material.magnetic', ['role.electromagnetic-material']],
    ['material.ndfeb', 'Neodymium iron boron: the strongest permanent magnet (remanence to 1.4 T), corroding without plating, losing strength above 80 to 200 °C by grade.', 'material.magnetic', ['role.electromagnetic-material']],
    ['material.smco', 'Samarium cobalt: a strong magnet to 300 °C, brittle, costly.', 'material.magnetic', ['role.electromagnetic-material']],
    ['material.alnico', 'Aluminium nickel cobalt iron: high remanence, low coercivity, stable to 500 °C.', 'material.magnetic', ['role.electromagnetic-material']],
    ['steel.electrical', 'Silicon steel in thin laminations: high permeability, low loss at 50 to 400 Hz; motor and transformer cores.', 'material.steel', ['role.magnetic-core']],
    ['material.silicon', 'The semiconductor of nearly every chip and solar cell: grown as a single crystal, doped by parts per million.', 'material.semiconductor', ['role.semiconductor', 'role.substrate']],
    ['material.silicon-carbide', 'A wide-bandgap semiconductor and a hard ceramic: power switches at 1200 V, abrasives, bearings.', 'material.semiconductor', ['role.semiconductor', 'role.abrasive']],
    ['material.gallium-nitride', 'A wide-bandgap semiconductor: blue LEDs, fast power switches.', 'material.semiconductor', ['role.semiconductor']],
    ['material.gallium-arsenide', 'A direct-bandgap semiconductor: lasers, infrared LEDs, microwave transistors.', 'material.semiconductor', ['role.semiconductor']],
    ['material.silicon-nitride', 'A ceramic for hybrid bearing balls and turbine parts: light, hard, tough for a ceramic.', 'material.ceramic', ['role.bearing-surface']],
    ['ceramic.alumina', 'Aluminium oxide: insulators, substrates, abrasives, wear parts.', 'material.ceramic', ['role.insulator', 'role.substrate', 'role.abrasive']],
    ['material.graphite', 'Layered carbon: a lubricant, an electrode, a battery anode, a crucible.', 'material.carbon', ['role.electrode', 'role.lubricant', 'role.electrical-conductor']],
    ['material.carbon-brush', 'Graphite with copper: the sliding contact of a brushed motor.', 'material.carbon', ['role.electrical-conductor', 'role.wear-part']],
    ['material.activated-carbon', 'Carbon with a vast internal surface: the electrode of a double-layer capacitor, an adsorbent.', 'material.carbon', ['role.electrode']],
    ['material.silver', 'The best electrical and thermal conductor: contacts, solar cell fingers, solder.', 'material.metal', ['role.electrical-conductor', 'role.connector-material']],
    ['material.gold-plating', 'A gold film on contacts: no oxide, so a reliable low-force contact.', 'material.metal', ['role.connector-material']],
    ['material.tin', 'A soft, low-melting metal: solder, plating that protects copper.', 'material.metal', ['role.solder']],
    ['material.lead', 'A dense, soft, toxic metal: battery plates, solder, radiation shielding.', 'material.metal', ['role.electrode']],
    ['material.tantalum', 'A refractory metal whose oxide makes a capacitor dielectric.', 'material.metal', ['role.dielectric', 'role.electrode']],
    ['material.nichrome', 'Nickel-chromium: a resistance wire that survives red heat in air.', 'material.alloy', ['role.heater']],
    ['material.enamel-insulation', 'Polyurethane or polyimide enamel a few micrometres thick on magnet wire.', 'material.polymer', ['role.insulator']],
    ['material.epoxy', 'A thermoset of resin and hardener: adhesive, matrix, encapsulant, board laminate.', 'material.thermoset', ['role.insulator', 'role.matrix']],
    ['material.pvc', 'Polyvinyl chloride: wire insulation, pipe, sheet; plasticised to flexible.', 'material.thermoplastic', ['role.insulator']],
    ['material.polypropylene', 'A tough, cheap, chemically resistant thermoplastic: film capacitors, living hinges, containers.', 'material.thermoplastic', ['role.dielectric']],
    ['material.pla', 'Polylactic acid: the easy 3D-printing plastic, stiff, brittle, softening at 60 °C, from corn.', 'material.thermoplastic', ['role.structural-member']],
    ['material.abs', 'Acrylonitrile butadiene styrene: tough, machinable, printable, the plastic of housings and bricks.', 'material.thermoplastic', ['role.structural-member']],
    ['material.peek', 'Polyether ether ketone: a thermoplastic for 250 °C, bearings, implants.', 'material.thermoplastic', ['role.bearing-surface', 'role.implant']],
    ['material.lithium-cobalt-oxide', 'LiCoO₂: the first lithium-ion cathode, high energy, costly, thermally fragile.', 'material.ceramic', ['role.electrode']],
    ['material.lithium-iron-phosphate', 'LiFePO₄: a safe, long-lived, lower-voltage cathode.', 'material.ceramic', ['role.electrode']],
    ['material.lead-dioxide', 'PbO₂: the positive plate of a lead-acid cell.', 'material.ceramic', ['role.electrode']],
    ['material.nickel-hydroxide', 'Ni(OH)₂: the positive electrode of NiMH and NiCd cells.', 'material.ceramic', ['role.electrode']],
    ['material.metal-hydride', 'An alloy (AB₅, lanthanum-nickel) that stores hydrogen in its lattice: the NiMH negative.', 'material.alloy', ['role.electrode']],
    ['material.electrolyte-liquid', 'A salt in a solvent: sulphuric acid in water, lithium hexafluorophosphate in carbonates, potassium hydroxide.', 'chem.solution', ['role.electrolyte']],
    ['material.polyethylene-separator', 'A microporous polyolefin film 20 µm thick between a cell\'s electrodes.', 'material.thermoplastic', ['role.insulator']],
    ['material.friction-lining', 'A composite of fibres, fillers and resin with a stable friction coefficient when hot: brake pads, clutch plates.', 'material.composite', ['role.wear-part']],
    ['material.cement', 'Calcium silicates that hydrate into a hard paste: the binder of concrete.', 'material.ceramic', ['role.binder']],
    ['material.rebar', 'Ribbed steel bar cast into concrete to carry its tension.', 'material.steel', ['role.reinforcement']],
    ['material.stone', 'Rock cut to shape: compression only, lasting, heavy.', 'material.natural', ['role.structural-member']],
    ['material.leather', 'Tanned animal skin: collagen made durable.', 'material.natural', ['role.cover']],
    ['material.bone', 'A mineralised collagen composite grown by cells.', 'material.biomaterial', ['role.structural-member']],
    ['material.hydroxyapatite', 'Calcium phosphate: the mineral of bone and tooth, a coating that bone grows onto.', 'material.ceramic', ['role.implant', 'role.scaffold']],
    ['material.uhmwpe', 'Ultra-high-molecular-weight polyethylene: the bearing surface of hip and knee implants.', 'material.thermoplastic', ['role.bearing-surface', 'role.implant']],
    ['material.liquid-crystal', 'Rod molecules that order like a crystal and flow like a liquid; a field turns them: displays.', 'material.polymer', ['role.optic']],
    ['material.indium-tin-oxide', 'A transparent conductor on displays and solar cells.', 'material.ceramic', ['role.electrical-conductor', 'role.window']],
    ['material.thermal-paste', 'A filled grease that fills the gap between a chip and its heatsink.', 'material.polymer', ['role.thermal-conductor']],
    ['material.solder-mask', 'The green epoxy over a board\'s copper, bare at the pads.', 'material.thermoset', ['role.insulator']],
    ['material.epoxy-molding-compound', 'The black filled epoxy a chip is moulded into.', 'material.thermoset', ['role.insulator']],
    ['material.aggregate', 'Sand and gravel: the bulk of concrete.', 'material.natural', ['role.filler']],
    ['ceramic.barium-titanate', 'Barium titanate: the ferroelectric ceramic of class 2 capacitors, permittivity in the thousands, falling with voltage and temperature.', 'material.ceramic', ['role.dielectric']],
    ['composite.carbon-ceramic', 'Carbon fibre in a silicon carbide matrix: brake discs that stand 1000 °C at a third of cast iron\'s mass.', 'material.composite', []],
    ['material.amorphous-metal', 'Metallic glass: an alloy cooled too fast to crystallise, magnetically soft with very low core loss.', 'material.magnetic', ['role.magnetic-core']],
    ['material.cork-rubber', 'Cork granules bound in rubber: a compressible gasket material for flanges and covers.', 'material.elastomer', ['role.seal']],
    ['material.eva-encapsulant', 'Ethylene vinyl acetate: the clear, soft film that laminates solar cells to their glass.', 'material.thermoplastic', []],
    ['material.granite', 'Granite: a hard, stable, dense stone, ground flat for surface plates and machine bases that neither creep nor ring.', 'material.natural', []],
    ['material.graphite-sheet', 'Flexible graphite, exfoliated and pressed: a gasket for heat and chemicals, to 450 °C in air.', 'material.carbon', ['role.seal']],
    ['material.indium-gallium-nitride', 'Indium gallium nitride: the semiconductor of blue and green LEDs, its band gap set by the indium fraction.', 'material.semiconductor', ['role.semiconductor']],
    ['material.mica', 'Mica: a silicate that cleaves into thin, heat-resisting, insulating sheets; between commutator bars and under power transistors.', 'material.ceramic', ['role.insulator']],
    ['material.organic-emitter', 'The organic molecules or polymers of an OLED that emit light when a current passes: bright, thin, and aging with use.', 'material.polymer', []],
    ['material.phosphor', 'A phosphor: a solid that absorbs blue or ultraviolet light and re-emits it longer; the yellow over a white LED\'s blue die.', 'material.ceramic', []],
    ['material.polymer-concrete', 'Aggregate in a resin binder: machine bases that damp vibration ten times better than cast iron.', 'material.composite', []],
    ['material.powdered-iron', 'Iron powder pressed with an insulating binder: a core with a distributed air gap, for inductors that carry DC.', 'material.magnetic', ['role.magnetic-core']],
    ['material.ruthenium-oxide', 'Ruthenium dioxide: the conductive oxide of thick-film resistor pastes, stable and low in tempco.', 'material.ceramic', []],
    ['material.silicon-dioxide', 'Silica: a chip\'s insulation and gate oxide, fused quartz, glass, sand.', 'material.glass', ['role.insulator', 'role.dielectric']],
    ['material.silver-alloy', 'Silver with cadmium oxide, tin oxide or nickel: switch contacts that resist welding and arc erosion.', 'material.metal', ['role.electrical-conductor']],
    ['material.sintered-steel', 'Steel pressed from powder and sintered: near-net gears and bushings, porous enough to hold oil.', 'material.steel', []],
    ['material.synthetic-rubber', 'Styrene-butadiene and its kin, made from petroleum: tyre treads, hoses, seals.', 'material.elastomer', ['role.seal', 'role.tyre']],
    ['material.tantalum-nitride', 'Tantalum nitride: a thin-film resistor material, stable and self-passivating.', 'material.ceramic', []],
    ['material.tin-alloy', 'Tin with silver, copper or lead: solders and fuse elements, melting between 180 and 230 °C.', 'material.alloy', []],
    ['material.tin-plating', 'A thin tin layer on copper: solderable and corrosion-resisting; whiskers are its failure.', 'material.metal', ['role.connector-material']],
  ];
  for (const [id, says, fam, roles] of named) { p.e(id, 'material', says); p.link(id, { 'is-a': [fam], plays: roles }); }
  // conductors with their numbers, for the tradeoff query (IEC 60028, CRC)
  const cond: [string, number, number, Provenance][] = [['material.silver', 6.30e7, 10490, IEC], ['copper.c110', 5.80e7, 8960, IEC], ['material.gold-plating', 4.10e7, 19300, IEC], ['aluminum.6061-t6', 2.5e7, 2700, IEC], ['brass.c360', 1.5e7, 8500, IEC], ['material.graphite', 1e5, 2200, { estimate: 'in-plane graphite, order of magnitude' }], ['steel.1018-cd', 5.8e6, 7870, IEC]];
  for (const [id, sigma, rho, src] of cond) { p.e(id, 'material', '', { source: src, params: [param('sigma', 'electrical conductivity', src, { unit: 'S/m', low: sigma, high: sigma }), param('rho', 'density', src, { unit: 'kg/m^3', low: rho, high: rho })] }); p.link(id, { plays: ['role.electrical-conductor'] }, src); }
  p.link('material.silver', { 'improved-by': [['copper.c110', 'copper gives 92 % of silver\'s conductivity at a hundredth of the price']] });
  p.link('aluminum.6061-t6', { plays: ['role.electrical-conductor'], 'improved-by': [['copper.c110', 'aluminium carries 61 % of copper\'s current per area but twice per kilogram']] });
  void est;
  return p;
}

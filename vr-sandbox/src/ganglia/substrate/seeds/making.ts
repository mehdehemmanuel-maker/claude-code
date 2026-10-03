// Making: the processes that produce what the packs name and the manufacturing pack does not already describe. Each
// says what happens to the material, so a produced-by arrow is a path to a process, never a label (S-6).
import type { Source } from '../../types';
import { Pack, type Links } from '../dsl';

const KALPAKJIAN: Source = { cite: 'Kalpakjian & Schmid, Manufacturing Engineering and Technology, 8th ed., Pearson 2020', kind: 'textbook' };
const CALLISTER: Source = { cite: 'Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018', kind: 'textbook' };
const JAEGER: Source = { cite: 'Jaeger, Introduction to Microelectronic Fabrication, 2nd ed., Prentice Hall 2002', kind: 'textbook' };
const NEWMAN: Source = { cite: 'Newman & Thomas-Alyea, Electrochemical Systems, 3rd ed., Wiley 2004', kind: 'textbook' };
const CAMPBELL: Source = { cite: 'Urry, Cain, Wasserman, Minorsky & Orr, Campbell Biology, 12th ed., Pearson 2020', kind: 'textbook' };
const MARSHAK: Source = { cite: 'Marshak, Earth: Portrait of a Planet, 6th ed., Norton 2019', kind: 'textbook' };

export function making(): Pack {
  const p = new Pack('making', KALPAKJIAN);
  const m = (id: string, says: string, links: Links = {}, src: Source = KALPAKJIAN, kinds: Parameters<Pack['e']>[1] = ['process', 'constructor']) => { p.e(id, kinds, says, { source: src }); p.link(id, { plays: ['role.constructor'], ...links }, src); };

  // metals from ore
  m('process.blast-furnace', 'Iron ore, coke and limestone fed at the top, hot air blown at the bottom: carbon reduces the oxide to iron, which runs out molten at 4 % carbon.', { 'governed-by': ['gibbs.energy'] }, CALLISTER);
  m('process.basic-oxygen', 'Oxygen blown through molten pig iron: the carbon burns out in minutes, and iron becomes steel.', { 'is-a': ['process.melting'] }, CALLISTER);
  m('process.electric-arc-furnace', 'Scrap steel melted by an arc of tens of megawatts between graphite electrodes: recycled steel, alloyed in the ladle.', { 'is-a': ['process.melting'], 'governed-by': ['joule'] }, CALLISTER);
  m('process.smelting', 'Ore heated with a reducing agent and a flux: the metal separates from the slag.', { 'governed-by': ['gibbs.energy'] }, CALLISTER);
  m('process.electrorefining', 'Impure copper dissolved from an anode and plated pure on a cathode: 99.99 % copper, the impurities left in the mud.', { 'governed-by': ['faraday.electrolysis'] }, CALLISTER);
  m('process.hall-heroult', 'Alumina dissolved in molten cryolite and electrolysed at 960 °C: aluminium at the cathode, about 13 kWh per kilogram.', { 'governed-by': ['faraday.electrolysis'] }, CALLISTER);
  m('process.kroll', 'Titanium tetrachloride reduced by magnesium at 900 °C: titanium sponge, then melted under vacuum.', { 'governed-by': ['gibbs.energy'] }, CALLISTER);
  m('process.melting', 'Metal heated past its melting point in a furnace, with alloying added to the melt.', { 'governed-by': ['heat.capacity'] }, CALLISTER);
  m('process.zone-refining', 'A molten zone passed along a bar: impurities travel with the melt, leaving the solid purer each pass.', { 'governed-by': ['fick.diffusion'] }, CALLISTER);
  m('process.quarrying', 'Stone cut or blasted from the ground in blocks, then sawn to size.', {}, MARSHAK);

  // forming and finishing
  m('process.hot-forging', 'Metal shaped between dies above its recrystallisation temperature: nuts, bolts, crankshafts, with the grain following the shape.', { 'is-a': ['process.forging'] });
  m('process.punching', 'A punch sheared through sheet into a die: a hole or a blank in one stroke.', { 'is-a': ['process.stamping'], 'governed-by': ['stress.von-mises'] });
  m('process.shaping', 'A single-point tool driven straight across a workpiece on a shaper: keyways, gear teeth and flats, slow and simple.');
  m('process.scraping', 'A hand scraper taking micrometre flakes from a surface against a reference: machine ways made flat and oil-holding.');
  m('process.key-stock', 'Keys cut from cold-drawn square or rectangular bar of the keyway\'s section.', { 'is-a': ['saw'] });
  m('process.thread-forming', 'A thread pressed into a hole by a fluteless tap: no chips, the grain following the thread, stronger.', { 'is-a': ['tap'] });
  m('process.turn-and-thread', 'A screw blank turned to diameter and threaded on a lathe: for the few; the many are rolled.', { 'is-a': ['turn'] });
  m('process.shrink-fitting', 'The outer part heated, or the inner chilled, slipped together and left to grip as it cools: an interference fit without a press.', { 'governed-by': ['thermal.expansion'] });
  m('process.heat-treatment.stress-relief', 'A part held below its transformation temperature and cooled slowly: residual stresses from forming or welding let go.', { 'governed-by': ['arrhenius'] });
  m('process.skiving', 'Fins sliced up from a solid block and bent out: a heatsink with fins of the base metal and no joint.');
  m('process.hard-chrome-plating', 'Chromium electroplated thick on steel: a hard, low-friction, corrosion-resisting surface for cylinder rods and dies.', { 'governed-by': ['faraday.electrolysis'] });
  m('process.plating.tin', 'A tin layer electroplated on copper: solderable and corrosion-resisting; whiskers are its failure.', { 'governed-by': ['faraday.electrolysis'], 'fails-by': ['failure.whisker'] });
  m('process.stranding', 'Many fine wires twisted into one conductor: flexible where a solid wire would fatigue.');
  m('process.enamelling', 'Magnet wire coated with a thin insulating varnish and cured in passes: a winding\'s turns kept apart by micrometres.');
  m('process.varnish-impregnation', 'A wound stator or transformer dipped or vacuum-impregnated in varnish and baked: the turns held, insulated and cooled as one.');
  m('process.drying', 'Wood dried in a kiln or in air: water leaves by diffusion and evaporation over weeks, and the wood shrinks and may check.', { 'governed-by': ['fick.diffusion'] }, CALLISTER);
  m('process.tanning', 'Hide treated with tannins or chromium salts: the collagen cross-linked so it will not rot; leather.', {}, CALLISTER);

  // casting, moulding, composites, ceramics, glass
  m('process.casting.formwork', 'Concrete poured into formwork and left to harden in place: the mould is the structure\'s negative.', { 'governed-by': ['hydrostatic'] });
  m('process.mixing', 'Cement, aggregate, water and admixtures turned together until uniform: the concrete\'s quality is set here.');
  m('process.curing', 'Concrete kept wet and warm while the cement hydrates: strength grows for weeks, most of it in the first.', { 'governed-by': ['arrhenius'] });
  m('process.casting.resin', 'A liquid thermoset poured into a mould and cured: no pressure, fine detail, slow.');
  m('process.molding', 'Transfer moulding of a package: epoxy compound forced round a chip and its leadframe in a heated die.', {}, JAEGER);
  m('process.foaming', 'Gas made or blown into a melt or a resin as it sets: a cellular solid, open or closed.', { 'governed-by': ['ideal.gas'] });
  m('process.calendering', 'A slurry or a polymer pressed between rolls to a sheet of set thickness: electrode coatings, rubber sheet, films.');
  m('process.autoclave-cure', 'A composite layup cured under pressure and heat in an autoclave, about 0.6 MPa and 180 °C for an epoxy prepreg: the plies consolidated, the voids driven out.', { 'is-a': ['process.lamination'], 'governed-by': ['arrhenius'] });
  m('process.filament-winding', 'Resin-wet fibre wound on a rotating mandrel at set angles: pressure vessels, tubes, tanks.', { 'governed-by': ['stress.hoop'] });
  m('process.pultrusion', 'Resin-wet fibres pulled through a heated die: a constant-section composite profile, continuous.');
  m('process.fibre-drawing', 'A preform or a melt pulled thin: glass fibre from a furnace, carbon from a polymer precursor, wire through a die.');
  m('process.pyrolysis', 'A material heated without oxygen: polymers to carbon, wood to charcoal; the precursor step of carbon fibre.', { 'governed-by': ['arrhenius'] }, CALLISTER);
  m('process.graphitization', 'Carbon heated past 2500 °C: amorphous carbon orders into graphite layers.', { 'governed-by': ['arrhenius'] }, CALLISTER);
  m('process.cvd', 'Chemical vapour deposition: gases reacting on a hot surface leave a solid film; carbon, silicon, diamond, nanotubes.', { 'governed-by': ['arrhenius'] }, JAEGER);
  m('process.sol-gel', 'A solution gelled into a network and dried: ceramic films, aerogels and nanoparticles at low temperature.', {}, CALLISTER);
  m('process.ball-milling', 'Powder ground between tumbling balls in a drum: particles broken to micrometres and below, alloys mixed mechanically.', { 'governed-by': ['energy.kinetic'] }, CALLISTER);
  m('process.slip-casting', 'A ceramic slurry poured into a plaster mould that drinks its water: a shell forms on the wall, and the rest is poured off.', { 'governed-by': ['fick.diffusion'] }, CALLISTER);
  m('process.single-crystal-casting', 'A turbine blade solidified from one seed through a spiral selector: no grain boundaries, so creep is resisted at 1000 °C.', { 'is-a': ['process.casting.investment'] }, CALLISTER);
  m('process.float-glass', 'Molten glass floated on a bath of molten tin: both faces flat and parallel, a continuous sheet.', { 'governed-by': ['buoyancy'] }, CALLISTER);
  m('process.blowing', 'Molten glass inflated against a mould or free in air: bottles, bulbs, vessels.', { 'governed-by': ['ideal.gas'] }, CALLISTER);

  // semiconductors and electronics
  m('process.oxidation', 'Silicon oxidised in a furnace to a controlled oxide thickness: the gate dielectric and the mask.', { 'governed-by': ['fick.diffusion'] }, JAEGER);
  m('process.diffusion', 'Dopant atoms driven into silicon by heat: a junction placed by time and temperature.', { 'governed-by': ['fick.diffusion'] }, JAEGER);
  m('process.ion-implantation', 'Dopant ions fired into silicon at kilovolts: a dose and a depth set by the beam, then annealed into place.', { 'governed-by': ['energy.kinetic'] }, JAEGER);
  m('process.sputtering', 'Atoms knocked off a target by ions and landing as a film: resistor films and metal layers on chips.', {}, JAEGER);
  m('process.cmp', 'Chemical-mechanical planarisation: a wafer polished flat by a slurry that etches and abrades, layer by layer.', {}, JAEGER);
  m('process.wafer-sawing', 'A finished wafer cut into dies by a diamond blade along its streets.', {}, JAEGER);
  m('process.die-attach', 'A chip glued or soldered to its leadframe or substrate: the heat path, and often the ground.', { 'governed-by': ['thermal.resistance.conduction'] }, JAEGER);
  m('process.encapsulation', 'A device buried in resin or silicone: light shaped, moisture kept out, mechanical protection.', {}, JAEGER);
  m('process.packaging', 'A tested chip cut from its wafer, attached, wire-bonded, moulded and marked: a component from a die.', { 'has-part': ['process.wafer-sawing', 'process.die-attach', 'process.molding'] }, JAEGER);
  m('process.thick-film-printing', 'Resistive and conductive pastes printed on ceramic and fired: resistors and circuits on one substrate.', {}, JAEGER);
  m('process.laser-trimming', 'A resistor film cut by a laser while its value is measured: trimmed to within 0.01 %.', { 'governed-by': ['wire.resistance'] }, JAEGER);
  m('process.screen-printing', 'Paste pushed through a stencil mesh onto a surface: solder paste on boards, silver fingers on solar cells.');
  m('process.wave-soldering', 'A board passed over a standing wave of molten solder: every through-hole joint made in one pass.', { 'governed-by': ['heat.capacity'] });
  m('process.electrolyte-filling', 'A sealed cell filled with its electrolyte under vacuum, so it wets every pore of the electrodes.', {}, NEWMAN);
  m('process.formation', 'A new cell\'s first slow charge cycles: the electrode interface layer forms, and its capacity is set.', { 'governed-by': ['butler-volmer'] }, NEWMAN);

  // living and geological makers
  m('bio.glycolysis', 'Glucose split to pyruvate in ten steps in the cytoplasm: two ATP net, no oxygen needed.', { 'governed-by': ['michaelis-menten', 'gibbs.energy'] }, CAMPBELL, ['process', 'biological', 'constructor']);
  m('bio.replication', 'DNA copied before a cell divides: each strand a template, one error in a billion after proofreading.', { 'governed-by': ['michaelis-menten'] }, CAMPBELL, ['process', 'biological', 'constructor']);
  m('bio.growth', 'A living thing adding mass and form by cell division and enlargement, under its genome and its environment.', { 'governed-by': ['allometry'] }, CAMPBELL, ['process', 'biological', 'constructor']);
  m('earth.hydrothermal', 'Hot water circulating through rock, dissolving metals and dropping them where it cools: ore veins.', { 'governed-by': ['clausius-clapeyron'] }, MARSHAK, ['process', 'phenomenon', 'constructor']);
  return p;
}

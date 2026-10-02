// The frontier: inventions far past what is built, asked for in plain words, as challenges to everything Ego is. Each
// is taken to the want under its words, and nothing ends at "impossible": every one is labelled for what it takes.
//
//   made        someone has made it; the path is how, and the blueprint where her own workflows can size it
//   buildable   known physics and known methods, not yet made whole; the path is the engineering
//   research    it waits on a discovery no law rules out; the path is the experiments that would make it
//   relabelled  the words ask for something a law rules out (a 100%, a zero, a forever, a mass below nothing); she
//               names the law and relabels the want as what meets it, and the path makes that
//
// Every bound is computed by her laws, every nearest real thing carries its source, and what she must take in to
// blueprint each step herself is said as the next thing she learns, not as a wall. The needs she can say in her
// language of flows are taken through her real machinery (challenges.ts), so each item also shows how far her own
// growing gets; and a few she can already size whole with her workflows (a dome, a tent, a spinning habitat).

import type { Source } from './types';
import { attempt, bound, type Attempt, type Challenge, type Need, type Note } from './challenges';
import { use } from './laws';
import { workflowById } from './workflows';

export type Label = 'made' | 'buildable' | 'research' | 'relabelled';
export type Group = 'opening' | 'consumer' | 'environment' | 'space' | 'bio' | 'architecture' | 'survival' | 'micro';

export interface Nearest { what: string; source: Source }

export interface Blueprint { summary: string; lines: string[]; parts: string[] }

export interface Frontier {
  id: string;
  name: string;
  group: Group;
  /** As asked. */
  asked: string;
  /** The want under the words. */
  wants: string;
  label: Label;
  /** Relabelled: the law the words run into, plainly, and what the want becomes. */
  law?: string;
  as?: string;
  /** Why it is labelled so: the physics, plainly. */
  why: string;
  bounds: () => Note[];
  nearest: Nearest[];
  /** How to make it, step by step. */
  path: string[];
  /** What she takes in next to blueprint every step herself. */
  learn: string[];
  /** What it does, in her language of flows, to grow. */
  needs?: Need[];
  spec?: Record<string, number>;
  /** Sized whole with her own workflows. */
  blueprint?: () => Blueprint;
}

// ---------------------------------------------------------------------------------------------------- the sources

const paper = (cite: string, url?: string): Source => ({ cite, ...(url ? { url } : {}), kind: 'paper' });
const press = (cite: string, url?: string): Source => ({ cite, ...(url ? { url } : {}), kind: 'press' });
const book = (cite: string): Source => ({ cite, kind: 'textbook' });

const SRC = {
  meat: press('Cell-cultivated chicken cleared for sale in the US by the USDA, 21 June 2023 (Washington Post)', 'https://www.washingtonpost.com/business/2023/06/21/usda-cultivated-meat-approval/'),
  mammoth: press('A meatball of cultured sheep cells carrying the mammoth\'s muscle protein (myoglobin), shown at the NEMO museum, Amsterdam, March 2023 (CBC)', 'https://www.cbc.ca/news/science/mammoth-meatball-cultivated-meat-1.6794390'),
  petunia: press('A houseplant given a glowing fungus\'s bioluminescence pathway (Neonothopanus nambi), cleared by the USDA for sale in the US', 'https://www.gardencentermag.com/news/bioluminescent-petunias-now-available-in-the-us/'),
  glacier: paper('WSL, Covering glacier ice: effective but expensive (white fleece cuts the melt under it by about half to 70%)', 'https://www.wsl.ch/en/news/covering-glacier-ice-effective-but-expensive/'),
  moxie: press('NASA\'s MOXIE made oxygen from Mars\' air, up to 12 g an hour at 98% purity, 122 g in all, 2021 to 2023 (Space.com)', 'https://www.space.com/perseverance-mars-rover-ends-moxie-oxygen-experiment'),
  black: press('Forests of vertically aligned carbon nanotubes absorbing up to 99.965% of visible light', 'https://en.wikipedia.org/wiki/Vantablack'),
  lk99: press('The 2023 room-temperature superconductor claim (LK-99) failed independent replication (Physics World)', 'https://physicsworld.com/a/room-temperature-superconductor-lk-99-fails-replication-tests/'),
  h3s: paper('Drozdov et al., Conventional superconductivity at 203 kelvin at high pressures in the sulfur hydride system, Nature 525, 73 (2015)'),
  cuprate: paper('Schilling et al., Superconductivity above 130 K in the Hg-Ba-Ca-Cu-O system, Nature 363, 56 (1993)'),
  schurig: paper('Schurig et al., Metamaterial electromagnetic cloak at microwave frequencies, Science 314, 977 (2006)', 'https://www.science.org/doi/10.1126/science.1133628'),
  cloakLimit: paper('Physical limitations on broadband invisibility based on fast-light media, Nature Communications (2021)', 'https://www.nature.com/articles/s41467-021-22972-w'),
  monticone: paper('Monticone & Alù, Do cloaked objects really scatter less?, Physical Review X 3, 041005 (2013)'),
  silk: press('Tufts University: silk "transient electronics" that dissolve in the body or the environment', 'http://now.tufts.edu/news-releases/smooth-silk-transient-electronics'),
  transient: paper('Hwang et al., A physically transient form of silicon electronics, Science 337, 1640 (2012)'),
  heart: paper('Noor et al., 3D printing of personalized thick and perfusable cardiac patches and hearts, Advanced Science 6, 1900344 (2019): a small heart printed from a patient\'s own cells', 'https://www.aftau.org/news_item/tau-scientists-print-first-3d-heart-using-patients-own-cells-and-materials/'),
  vessels: paper('Carmeliet & Jain, Angiogenesis in cancer and other diseases, Nature 407, 249 (2000): living cells lie within 100 to 200 µm of a vessel, the reach of oxygen by diffusion'),
  biosphere: paper('Severinghaus et al., Oxygen loss in Biosphere 2, Eos 75(3), 1994: its oxygen fell from 20.9% to about 14.5% in 16 months, taken by soil microbes and by its concrete', 'https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/94EO00285'),
  mineral: { cite: 'Carbon mineralization in concrete: carbon dioxide injected into fresh concrete becomes calcium carbonate', url: 'https://www.carboncure.com/carbon-mineralization-in-concrete/', kind: 'maker' } as Source,
  cement: book('Taylor, Cement Chemistry, 2nd ed., Thomas Telford 1997 (Portland cement is about 60 to 67% calcium oxide)'),
  coral: press('Southern Cross University: coral IVF, larvae reared from spawn and settled on damaged reef, grown to breeding size', 'https://www.scu.edu.au/coral-ivf/'),
  seedbox: press('Great Barrier Reef Foundation: larval seedboxes settled coral up to 56 times more than nature at Lizard Island (2024)', 'https://www.barrierreef.org/news/news/new-coral-restoration-technology-larval-seedbox'),
  kilobot: paper('Rubenstein, Cornejo & Nagpal, Programmable self-assembly in a thousand-robot swarm, Science 345, 795 (2014)'),
  glass5d: press('University of Southampton: data written into fused silica by femtosecond laser in five dimensions, 360 TB a disc, stable to 1000 °C', 'https://www.southampton.ac.uk/news/2016/02/5d-data-storage-update.page'),
  dreams: paper('Horikawa, Tamaki, Miyawaki & Kamitani, Neural decoding of visual imagery during sleep, Science 340, 639 (2013)'),
  interp: paper('Ear-voice span in simultaneous interpreting: about 2 to 4 seconds on average (PLOS ONE 2025)', 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0326527'),
  infrared: book('Rogalski, Infrared Detectors, 2nd ed., CRC Press 2010 (uncooled microbolometer cameras)'),
  slips: paper('Wong et al., Bioinspired self-repairing slippery surfaces with pressure-stable omniphobicity, Nature 477, 443 (2011)'),
  coatings: paper('Hydrophobic and superhydrophobic coatings: materials, fabrication strategies, and durability (review)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13513391/'),
  healing: paper('White et al., Autonomic healing of polymer composites, Nature 409, 794 (2001)'),
  drops: paper('Gunn & Kinzer, The terminal velocity of fall for water droplets in stagnant air, Journal of Meteorology 6, 243 (1949): the biggest raindrops fall at about 9 m/s'),
  pstar: { cite: 'NIST PSTAR, stopping powers and ranges for protons: a 1 GeV proton runs about 3.2 m of water before it stops', url: 'https://physics.nist.gov/PhysRefData/Star/Text/PSTAR.html', kind: 'standard' } as Source,
  bennu: press('NASA OSIRIS-REx brought 121.6 g of the asteroid Bennu back to Earth (2023)'),
  armstrong: book('DeHart & Davis, Fundamentals of Aerospace Medicine, 4th ed., Lippincott 2008 (the Armstrong limit: about 6.3 kPa, where water boils at body temperature)'),
  bvad: { cite: 'NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570 (a crew member breathes about 0.82 kg of oxygen a day)', kind: 'standard' } as Source,
  spin: paper('Hall, Artificial gravity and the architecture of orbital habitats, Journal of the British Interplanetary Society 52 (1999): most people adapt to spinning at up to about 2 rpm'),
  antimatter: paper('Anderson et al. (ALPHA), Observation of the effect of gravity on the motion of antimatter, Nature 621, 716 (2023): antimatter falls down'),
  negmass: paper('Khamehchi et al., Negative-mass hydrodynamics in a spin-orbit-coupled Bose-Einstein condensate, Physical Review Letters 118, 155301 (2017)'),
  gps: paper('Ashby, Relativity in the Global Positioning System, Living Reviews in Relativity 6, 1 (2003): satellite clocks run about 38 µs a day fast'),
  gallium: paper('Automatic morphology control of liquid metal using a combined electrochemical and feedback control approach (gallium\'s oxide skin)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6471279/'),
  phase: paper('Wang et al., Magnetoactive liquid-solid phase transitional matter, Matter 6, 226 (2023)'),
  sq: paper('Shockley & Queisser, Detailed balance limit of efficiency of p-n junction solar cells, Journal of Applied Physics 32, 510 (1961)'),
  photo: paper('Zhu, Long & Ort, What is the maximum efficiency with which photosynthesis can convert solar energy into biomass?, Current Opinion in Biotechnology 19 (2008): 4.6% in most plants'),
  lux: { cite: 'EN 12464-1:2021 Light and lighting: lighting of work places (500 lx for reading and writing)', kind: 'standard' } as Source,
  reprogram: paper('Ocampo et al., In vivo amelioration of age-associated hallmarks by partial reprogramming, Cell 167, 1719 (2016)'),
  muscles: paper('Haines et al., Artificial muscles from fishing line and sewing thread, Science 343, 868 (2014)'),
  apple: paper('Gilissen et al., Silencing the major apple allergen Mal d 1 by using the RNA interference approach, Journal of Allergy and Clinical Immunology 115, 364 (2005)'),
  dome: { cite: 'Fuller, Building construction (the geodesic dome), US patent 2,682,235 (1954)', kind: 'patent' } as Source,
  roots: paper('Ludwig et al., Living bridges using aerial roots of Ficus elastica, Scientific Reports 9, 12226 (2019)', 'https://www.nature.com/articles/s41598-019-48652-w'),
  porous: press('Permeable paving: porous asphalt that lets rain through it', 'https://en.wikipedia.org/wiki/Permeable_paving'),
  scent: press('Scent released in time with a film in theatres (1960)', 'https://en.wikipedia.org/wiki/Smell-O-Vision'),
  touch: book('Weinstein, Intensive and extensive aspects of tactile sensitivity as a function of body part, sex and laterality, in Kenshalo (ed.), The Skin Senses, 1968 (fingertips tell two points apart at about 2 to 3 mm)'),
  splint: paper('Lower extremity splinting: a head-to-head comparison of a novel one-step spray-on splint versus standard splinting, Military Medicine (2021): a two-part foam that hardens in under a minute', 'https://doi.org/10.1093/milmed/usab505'),
  grenade: press('Glass fire grenades of salt water, thrown at fires from the 1870s', 'https://museumcrush.org/the-beauty-and-danger-in-victorian-glass-fire-grenades/'),
  fireball: { cite: 'Self-activating fire extinguisher, US patent 4,709,763 (a dry-powder ball that bursts in a fire)', url: 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4709763', kind: 'patent' } as Source,
  chemputer: paper('Steiner et al., Organic synthesis in a modular robotic system driven by a chemical programming language, Science 363, eaav2211 (2019)'),
  reactionware: paper('Kitson et al., Digitization of multistep organic synthesis in reactionware for on-demand pharmaceuticals, Science 359, 314 (2018)'),
  aerogel: paper('Thermal conductivity in nanoporous aerogels: a critical review (silica aerogel about 0.015 W/m K)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13116663/'),
  superlube: paper('Robust microscale structural superlubricity between graphite and nanostructured surface, Nature Communications (2023)', 'https://www.nature.com/articles/s41467-023-38680-6'),
  betavoltaic: press('Betavoltaic cells: nickel-63 (half-life about 100 years) on a semiconductor junction, nanowatts to about 100 µW for decades', 'https://en.wikipedia.org/wiki/Betavoltaic_device'),
  blood: book('Hall & Hall, Guyton and Hall Textbook of Medical Physiology, 14th ed., Elsevier 2021 (about 5 L of blood pumped at about 5 L a minute at rest)'),
  water: book('Crittenden et al., MWH\'s Water Treatment: Principles and Design, 3rd ed., Wiley 2012'),
  ice: book('Cuffey & Paterson, The Physics of Glaciers, 4th ed., Academic Press 2010 (albedo: dirty glacier ice about 0.2 to 0.4, fresh snow 0.8 and more)'),
};

// ----------------------------------------------------------------------------------------------- shared numbers

const g0 = 9.80665;
const EARTH = 5.972e24;
const G = 6.6743e-11, C = 299792458;
/** Ageing at one temperature against another for one activation energy (Arrhenius; A cancels). */
const slower = (Ea: number, T: number, Tref: number) => use('arrhenius', { A: 1, Ea, T }).value / use('arrhenius', { A: 1, Ea, T: Tref }).value;
const fmt = (x: number, d = 2) => (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(d) : Number(x.toPrecision(d + 1)).toString());

// ----------------------------------------------------------------------------------------- blueprints she sizes

/** A geodesic dome: an icosahedron with each face split into four (two frequency), lifted onto its sphere and cut at the equator. */
export function geodesic(R: number): { hubs: [number, number, number][]; struts: [number, number][]; faces: [number, number, number][]; lengths: Map<string, number> } {
  const ring = (y: number, off: number) => Array.from({ length: 5 }, (_, i) => {
    const a = off + (i * 2 * Math.PI) / 5, r = Math.sqrt(1 - y * y);
    return [r * Math.cos(a), y, r * Math.sin(a)] as [number, number, number];
  });
  const y1 = 1 / Math.sqrt(5);
  const ico: [number, number, number][] = [[0, 1, 0], ...ring(y1, 0), ...ring(-y1, Math.PI / 5), [0, -1, 0]];
  const tri: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = 1 + i, b = 1 + ((i + 1) % 5), c = 6 + i, d = 6 + ((i + 1) % 5);
    tri.push([0, a, b], [a, c, b], [b, c, d], [c, 11, d]);
  }
  const verts: [number, number, number][] = [];
  const key = (p: number[]) => p.map((x) => x.toFixed(9)).join(',');
  const index = new Map<string, number>();
  const at = (p: [number, number, number]) => {
    const l = Math.hypot(...p), q: [number, number, number] = [p[0] / l, p[1] / l, p[2] / l];
    const k = key(q);
    if (!index.has(k)) { index.set(k, verts.length); verts.push(q); }
    return index.get(k)!;
  };
  const mid = (u: number[], v: number[]): [number, number, number] => [(u[0]! + v[0]!) / 2, (u[1]! + v[1]!) / 2, (u[2]! + v[2]!) / 2];
  const faces: [number, number, number][] = [];
  for (const [a, b, c] of tri) {
    const A = ico[a]!, B = ico[b]!, Cc = ico[c]!;
    const ia = at(A), ib = at(B), ic = at(Cc), ab = at(mid(A, B)), bc = at(mid(B, Cc)), ca = at(mid(Cc, A));
    faces.push([ia, ab, ca], [ab, ib, bc], [ca, bc, ic], [ab, bc, ca]);
  }
  const up = (i: number) => verts[i]![1] >= -1e-9;
  const kept = faces.filter((f) => f.every(up));
  const used = [...new Set(kept.flat())].sort((a, b) => a - b);
  const renum = new Map(used.map((v, i) => [v, i]));
  const edges = new Map<string, [number, number]>();
  for (const f of kept) for (let k = 0; k < 3; k++) {
    const u = renum.get(f[k]!)!, v = renum.get(f[(k + 1) % 3]!)!;
    edges.set(u < v ? `${u}-${v}` : `${v}-${u}`, u < v ? [u, v] : [v, u]);
  }
  const hubs = used.map((v) => verts[v]!.map((x) => x * R) as [number, number, number]);
  const struts = [...edges.values()];
  const lengths = new Map<string, number>();
  for (const [u, v] of struts) {
    const L = Math.hypot(hubs[u]![0] - hubs[v]![0], hubs[u]![1] - hubs[v]![1], hubs[u]![2] - hubs[v]![2]);
    const k = (L / R).toFixed(5);
    lengths.set(k, (lengths.get(k) ?? 0) + 1);
  }
  return { hubs, struts, faces: kept.map((f) => f.map((v) => renum.get(v)!) as [number, number, number]), lengths };
}

function domeBlueprint(R = 5, snow = 1000, pane = 0.006): Blueprint {
  const d = geodesic(R);
  const glass = 2500 * pane * g0; // N/m² of glazing (soda-lime glass, 2500 kg/m³)
  const roof = 2 * Math.PI * R * R; // the hemisphere's surface carries its glass
  const plan = Math.PI * R * R; // snow lies on its plan
  const load = snow * plan + glass * roof;
  const upper = d.hubs.filter((h) => h[1] > 1e-6).length;
  const perHub = load / upper;
  const strut = workflowById('strut.size')!;
  const lines: string[] = [];
  const parts: string[] = [];
  const classes = [...d.lengths.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  for (const [factor, count] of classes) {
    const L = Number(factor) * R;
    const r = strut.run({ length: L, load: perHub, sf: 2.5 });
    lines.push(`${count} struts of ${(L * 1000).toFixed(0)} mm (chord factor ${factor}): ${r.summary}`);
    parts.push(...r.parts);
  }
  return {
    summary: `A two-frequency geodesic dome ${R * 2} m across: ${d.hubs.length} hubs, ${d.struts.length} struts in ${classes.length} lengths, ${d.faces.length} triangular panes of ${pane * 1000} mm glass. It carries ${fmt(load / 1000)} kN (${snow} N/m² of snow on its plan, and its glass); each strut is sized for a whole hub's share, ${fmt(perHub / 1000)} kN, which is on the safe side (a dome spreads it over several struts).`,
    lines: [...lines, `Glazing: ${d.faces.length} panes, ${fmt(roof)} m², ${fmt((glass * roof) / g0)} kg of glass. Hubs: ${d.hubs.length} welded or bolted nodes, struts joined at their ends (pinned, K = 1).`, 'Snow load: check the site\'s map in EN 1991-1-3; 1000 N/m² is a lowland value.'],
    parts: [...new Set(parts)],
  };
}

function tentBlueprint(): Blueprint {
  const L = 2.1, W = 1.0, H = 1.0, A = 2 * (L * W + L * H + W * H), k = 0.015, dT = 50, P = 100, layer = 0.01;
  const need = (k * A * dT) / P;
  const layers = Math.ceil(need / layer - 1e-9);
  const loss = use('conduction', { k, A, dT, L: layers * layer }).value;
  return {
    summary: `A one-person aerogel shelter ${L} × ${W} × ${H} m (${fmt(A)} m² of wall and floor) keeps 20 °C inside at −30 °C outside on a resting body's ${P} W with ${layers} layers of 10 mm silica aerogel blanket (${layers * 10} mm, k ${k} W/m K): it loses ${fmt(loss)} W, no more than you make.`,
    lines: [
      `Wall: ${layers} × 10 mm aerogel blanket between a ripstop shell and a vapour-tight liner; the floor the same over a closed-cell pad (the ground takes heat fastest).`,
      'Breath carries water: a vapour barrier inside, or the blanket fills with frost and its conductivity climbs.',
      'Wind and the air films add resistance, so this is on the safe side; a heat leak at the door is the weak point (seal it, as the weakest link sets the whole).',
    ],
    parts: [],
  };
}

function spinBlueprint(rpm = 2, mass = 75): Blueprint {
  const w = (rpm * 2 * Math.PI) / 60, r = g0 / (w * w), v = w * r;
  const F = use('centripetal', { m: mass, v, r }).value;
  return {
    summary: `Gravity by turning: a ring of radius ${fmt(r, 3)} m turning at ${rpm} rpm (the most people adapt to) gives 1 g at its rim, which moves at ${fmt(v)} m/s; a ${mass} kg person is pressed to the floor with ${fmt(F)} N, their weight on Earth.`,
    lines: [
      `Smaller turns faster: at 4 rpm the radius is ${fmt(g0 / ((4 * 2 * Math.PI) / 60) ** 2, 3)} m, at 10 rpm ${fmt(g0 / ((10 * 2 * Math.PI) / 60) ** 2, 3)} m, and the head and feet feel different gravity (and turning the head makes you dizzy).`,
      'Cheapest: two modules on a tether, spun about their middle; the tether carries each module\'s weight in tension.',
      'Magnetic or hook soles hold the feet in a craft that doesn\'t turn, but they give no weight to the body.',
    ],
    parts: [],
  };
}

// --------------------------------------------------------------------------------------------------- the frontier

export const FRONTIER: Frontier[] = [
  // ---------------------------------------------------------------------------------------- the opening list
  {
    id: 'battery.everlasting', name: 'An everlasting battery', group: 'opening', asked: 'Everlasting batteries.',
    wants: 'power that never needs charging or replacing', label: 'relabelled',
    law: 'A store holds a finite energy (conservation of energy), and every chemistry ages: the rate falls as it cools but is never zero above absolute zero (Arrhenius).',
    as: 'a battery that runs for a century at a small draw, or one that tops itself up from what is around it',
    why: 'Power for ever from a closed box would be energy from nothing. Power for longer than the thing it runs lasts is real: a slow radioactive source, or a store with a harvester.',
    bounds: () => [
      { says: `every 10 K cooler roughly halves a battery's ageing (${fmt(slower(50e3, 288, 298))} times the rate at 15 °C against 25 °C, for 50 kJ/mol), but it never stops`, law: 'arrhenius', value: slower(50e3, 288, 298) },
      bound('pv.power', { eta: 0.2, G: 1000, A: 0.0025 }, (v) => `a 5 × 5 cm solar cell in full sun gives ${fmt(v)} W: a harvester that keeps a small store topped up for as long as it sees light`),
    ],
    nearest: [{ what: 'nickel-63 betavoltaic cells: about 100 µW for 50 years from a coin-sized cell', source: SRC.betavoltaic }],
    path: ['Ask the draw: under a milliwatt (a sensor, a clock, memory), or more.', 'Under a milliwatt: a betavoltaic cell, a nickel-63 beta source on a diamond or silicon carbide junction; half its power after 100 years, betas stopped by its own case.', 'More: a store sized for the energy, kept cool and between 20 and 80% charged, with a harvester (light, heat, motion) that refills it; it lasts as long as its harvest.', 'Test: age it hot to find its Arrhenius rate, then predict its life at use temperature.'],
    learn: ['battery calendar-ageing data for each chemistry', 'radioisotope sources: activity, dose and shielding'],
    needs: [{ does: 'top itself up from light', from: 'sunlight', to: 'electric' }],
  },
  {
    id: 'cloak.invisible', name: 'An invisibility cloak', group: 'opening', asked: 'Invisible cloaks.',
    wants: 'not to be seen', label: 'relabelled',
    law: 'A passive cloak can\'t hide something over all colours at once: causality and passivity bound how wide its band can be, and a perfectly hidden wearer can\'t see out.',
    as: 'invisible in one band (radar, heat or visible) from the directions that matter, or active camouflage that shows what is behind you',
    why: 'Bending light round an object works, at one frequency and for small things; across all of visible light it would need light to travel faster than light inside the cloak. Showing the scene behind you on your front works for any colour, for a viewer you track.',
    bounds: () => [bound('diffraction.limit', { lambda: 550e-9, D: 0.003 }, (v) => `an eye's 3 mm pupil resolves ${fmt(v * 1000)} mrad: an active cloak needs pixels finer than that at the viewer's distance, ${fmt(v * 10 * 1000)} mm at 10 m`)],
    nearest: [{ what: 'a metamaterial cloak that hid a copper cylinder from microwaves of one frequency', source: SRC.schurig }, { what: 'the bound on how wide a cloak\'s band can be', source: SRC.cloakLimit }, { what: 'why cloaked objects scatter more outside their band', source: SRC.monticone }],
    path: ['Choose the band: radar (absorbers and shaping), thermal infrared (a cooled skin at the background\'s temperature), or visible.', 'Visible, for a person: cameras on the back, a flexible display on the front, and the viewer\'s eyes tracked so the picture lines up from where they stand.', 'Match colour and brightness to the background under its light; refresh faster than the eye (60 Hz or more).', 'In this world it can be shown directly, as a simulation.'],
    learn: ['transformation optics and metamaterial design', 'display and camera colour matching'],
    needs: [{ does: 'see what is behind', from: 'light', to: 'signal' }, { does: 'show it on the front', from: 'bit', to: 'light' }],
  },
  {
    id: 'superconductor.room-temperature', name: 'A room-temperature superconductor', group: 'opening', asked: 'Room-temperature superconductors.',
    wants: 'wires with no resistance, at room temperature and pressure', label: 'research',
    why: 'No law rules it out. Hydrides superconduct near room temperature, but only crushed to over a million atmospheres; at ambient pressure the record is about 133 K. The 2023 claim failed replication.',
    bounds: () => [bound('joule', { I: 100, R: 0.01 }, (v) => `100 A through a 10 mΩ cable wastes ${fmt(v)} W as heat; a superconductor wastes none in steady current`)],
    nearest: [{ what: 'sulfur hydride superconducting at 203 K under about 155 GPa', source: SRC.h3s }, { what: 'mercury cuprates at about 133 K at ambient pressure', source: SRC.cuprate }, { what: 'the room-temperature claim that failed', source: SRC.lk99 }],
    path: ['Screen candidates by computation (electron-phonon coupling, Eliashberg theory) for a high critical temperature that survives at ambient pressure.', 'Make each, and measure both signatures: zero resistance by four probes, and the field pushed out (the Meissner effect).', 'Replicate in an independent lab before anything else is built on it.'],
    learn: ['solid-state physics: superconductivity (BCS and Eliashberg theory), density functional theory'],
  },
  {
    id: 'organs.printed', name: 'Organs printed from DNA', group: 'opening', asked: 'Printed organs from DNA.',
    wants: 'a replacement organ that is yours', label: 'buildable',
    why: 'DNA alone has no machinery to build anything; the patient\'s own cells do. Small printed hearts exist; a full-size organ needs vessels inside it, because oxygen reaches only a fraction of a millimetre by diffusion.',
    bounds: () => [
      bound('diffusion.time', { x: 200e-6, D: 2e-9 }, (v) => `oxygen diffuses 0.2 mm through tissue in ${fmt(v)} s`),
      bound('diffusion.time', { x: 2e-3, D: 2e-9 }, (v) => `but 2 mm takes ${fmt(v)} s, a hundred times longer, while the cells use it up: thick tissue starves without vessels`),
    ],
    nearest: [{ what: 'a small heart printed from a patient\'s own cells and tissue', source: SRC.heart }, { what: 'the reach of oxygen by diffusion', source: SRC.vessels }],
    path: ['Take the patient\'s cells (a skin or blood sample) and reprogram them into stem cells.', 'Grow them into the organ\'s cell types; mix with a gel made from the patient\'s own tissue (a bioink).', 'Print the organ with channels for vessels no more than 0.2 mm from any cell; line them with vessel cells.', 'Perfuse it in a bioreactor, mature it until it works (a heart beats together), then test it before any implant.'],
    learn: ['cell culture and stem-cell differentiation', 'bioink rheology and printing', 'vascular network design'],
  },
  // ---------------------------------------------------------------------------------------------- consumer
  {
    id: 'food.extinct-mythical', name: 'Extinct and mythical foods', group: 'consumer', asked: 'Extinct or mythical foods: lab steak, a mango-chocolate fruit.',
    wants: 'to taste what can\'t be had', label: 'made',
    why: 'Meat grown from cells is sold; one made with an extinct animal\'s protein has been shown. A thick steak needs vessels, as an organ does. A fruit with a new taste is the molecules of that taste made by the plant.',
    bounds: () => [bound('diffusion.time', { x: 200e-6, D: 2e-9 }, (v) => `nutrients reach cells 0.2 mm into grown meat in ${fmt(v)} s by diffusion: thicker cuts need channels, so mince comes first and steak later`)],
    nearest: [{ what: 'cell-cultivated chicken sold in the US', source: SRC.meat }, { what: 'cultured sheep cells carrying the mammoth\'s myoglobin', source: SRC.mammoth }, { what: 'a plant given another species\' pathway (the glowing petunia)', source: SRC.petunia }],
    path: ['Extinct: read the animal\'s protein genes from preserved DNA, fill gaps from its closest living relative, put them in a living species\' cells, grow them.', 'Steak: grow cells on an edible scaffold with channels for the feed, as tissue is grown.', 'A new fruit: find the molecules that make the taste, put the genes that make them into the fruit plant, grow and taste.', 'Food safety review before anyone eats it.'],
    learn: ['food chemistry: flavour molecules', 'plant genetic engineering', 'cell culture at food scale'],
  },
  {
    id: 'medicine.instant', name: 'Instant medicine', group: 'consumer', asked: 'Instant medicine.',
    wants: 'relief as soon as it is needed', label: 'relabelled',
    law: 'A medicine acts where the blood takes it, and blood goes once round the body in about a minute.',
    as: 'medicine that acts within a circulation: about a minute, by a fast route',
    why: 'Nothing given to the blood reaches every organ before the blood does. The fastest routes skip the gut: into a vein, a bone, the lungs or the nose.',
    bounds: () => [{ says: 'about 5 L of blood pumped at about 5 L a minute goes round in about 60 s: the floor for a medicine carried by the blood' }],
    nearest: [{ what: 'the circulation time', source: SRC.blood }],
    path: ['Choose the route by speed: a vein or bone (seconds to reach the heart), inhaled (the lungs reach the blood in seconds), the nose, under the tongue; swallowed is slowest.', 'An auto-injector or nasal spray puts it in without training.', 'Dose by the body\'s mass and the medicine\'s half-life.'],
    learn: ['pharmacokinetics: absorption, distribution, half-life', 'drug formulation'],
  },
  {
    id: 'drones.self-assembling', name: 'Self-assembling drones', group: 'consumer', asked: 'Self-assembling drones.',
    wants: 'a swarm that builds itself into what is needed', label: 'made',
    why: 'A thousand small robots have assembled themselves into shapes; flying modules that dock in the air are being built. Each module needs a way to fly, to dock and to tell its neighbours where it is.',
    bounds: () => [bound('thrust.ideal-static', { rho: 1.225, A: Math.PI * 0.05 ** 2, P: 10 }, (v) => `a 10 cm rotor given 10 W can at best lift ${fmt(v / g0 * 1000)} g: each module carries its own lift, so docked they fly no better a kilogram than apart`)],
    nearest: [{ what: 'a thousand-robot swarm that assembled itself into shapes', source: SRC.kilobot }],
    path: ['A module: a frame, rotors, a battery, a controller, magnets or latches on each face to dock.', 'Each module talks only to its neighbours (infrared or radio) and follows a gradient from a seed module (as the thousand-robot swarm did).', 'The shape is given as a picture; each module moves along the edge until it is in the shape, then stops.', 'Docked, the controllers share one flight controller and become one body.'],
    learn: ['swarm algorithms', 'flight control', 'propellers catalogued'],
    needs: [{ does: 'fly', from: 'electric', to: 'flight', against: 'fluid' }, { does: 'know where it is from its neighbours', from: 'signal', to: 'signal' }],
  },
  // ------------------------------------------------------------------------------------------- environment
  {
    id: 'pods.terraforming', name: 'Terraforming pods', group: 'environment', asked: 'Terraforming pods.',
    wants: 'to make a dead place living', label: 'research',
    why: 'A sealed living world has been tried: its oxygen fell by a third in 16 months, taken by soil microbes and its own fresh concrete. Pods that work start small, sealed and measured, and grow.',
    bounds: () => [bound('carbonation.capacity', { m: 1 }, (v) => `each kilogram of lime in fresh concrete can take ${fmt(v)} kg of carbon dioxide out of the air for good: in a sealed world that is breathable carbon gone, as it was in Biosphere 2`)],
    nearest: [{ what: 'Biosphere 2, its oxygen and its concrete', source: SRC.biosphere }],
    path: ['A pod: sealed, sunlit, with soil, plants and microbes chosen to balance oxygen made against oxygen used.', 'Seal its concrete and steel so they take no carbon; measure oxygen, carbon dioxide and water every hour.', 'Run it unoccupied until its gases hold steady for a year, then scale up.', 'On a planet: the pod is a seed: hardy microbes and lichens first, to make soil and oxygen over a very long time.'],
    learn: ['ecology and gas balance of closed systems', 'soil microbiology'],
    needs: [{ does: 'make food from sunlight', from: 'light', to: 'food' }],
  },
  {
    id: 'blocks.carbon-capturing', name: 'Carbon-capturing blocks', group: 'environment', asked: 'Carbon-capturing blocks.',
    wants: 'building blocks that take carbon out of the air', label: 'made',
    why: 'Concrete takes up carbon dioxide as it becomes limestone again, and carbon dioxide can be cured into it. But making lime from limestone released exactly that carbon dioxide, so a block only takes out more than it cost if its calcium came from rock that was never burnt.',
    bounds: () => [bound('carbonation.capacity', { m: 630 }, (v) => `a tonne of Portland cement (about 630 kg of lime) can hold at most ${fmt(v)} kg of carbon dioxide, exactly what burning its limestone released: lime from limestone comes out even at best, so the gain is in calcium from silicate rock or slag`)],
    nearest: [{ what: 'carbon dioxide mineralised in fresh concrete', source: SRC.mineral }, { what: 'how much lime cement holds', source: SRC.cement }],
    path: ['Take calcium or magnesium that was never calcined: crushed basalt, olivine, steel slag.', 'Mix and press into blocks; cure them in a chamber of concentrated carbon dioxide so it becomes carbonate through the block.', 'Weigh the gain to know the carbon held; test strength (EN 772-1).'],
    learn: ['cement and mineral chemistry', 'masonry testing'],
  },
  {
    id: 'coral.seeds', name: 'Coral reef seeds', group: 'environment', asked: 'Coral reef seeds.',
    wants: 'to grow reefs back', label: 'made',
    why: 'Coral larvae reared from spawn and settled on damaged reef have grown to breeding size; seedboxes settle many more than nature does.',
    bounds: () => [],
    nearest: [{ what: 'coral IVF', source: SRC.coral }, { what: 'larval seedboxes', source: SRC.seedbox }],
    path: ['Collect spawn on the night corals spawn together; fertilise and rear the larvae in floating pools.', 'Give them their symbiotic algae; settle them on seed tiles or in seedboxes over damaged reef.', 'Protect the young from grazers; survey each year; pick heat-tolerant parents for the next spawn.'],
    learn: ['coral reproduction and symbiosis', 'reef ecology'],
  },
  {
    id: 'blankets.glacier', name: 'Glacier blankets', group: 'environment', asked: 'Glacier blankets.',
    wants: 'to keep a glacier from melting', label: 'made',
    why: 'White fleece over ice reflects the sun the ice would have absorbed and insulates it from warm air: it halves the melt under it or better.',
    bounds: () => {
      const ice = use('absorbed.solar', { a: 0.3, G: 800, A: 1 }).value, cover = use('absorbed.solar', { a: 0.8, G: 800, A: 1 }).value;
      const saved = ((ice - cover) * 8 * 3600) / 334e3;
      return [{ says: `in 800 W/m² of sun, dirty ice (albedo 0.3) absorbs ${fmt(ice)} W a square metre and a cover as white as snow (0.8) ${fmt(cover)} W: over 8 hours of sun that is ${fmt(saved)} kg of ice a square metre not melted (334 kJ to melt a kilogram)`, law: 'absorbed.solar', value: saved }];
    },
    nearest: [{ what: 'white fleece on the Rhône glacier', source: SRC.glacier }, { what: 'albedo of snow and ice', source: SRC.ice }],
    path: ['UV-stable white geotextile, laid in summer over the ice that matters most (a tongue, a ski run, an ice cave).', 'Weighted and sewn together against wind; taken up in autumn.', 'It is costly a square metre, so it saves places, not whole glaciers.'],
    learn: ['glacier energy balance'],
  },
  {
    id: 'mesh.self-filtering', name: 'A mesh that filters everything from a lake', group: 'environment', asked: 'Self-filtering mesh that takes 100% of the microplastics, heavy metals and radiation out of a lake.',
    wants: 'a clean lake', label: 'relabelled',
    law: 'Taking out the very last trace costs endless work (the least work grows as the log of how little is left), and radiation isn\'t a substance: a filter takes out the radioactive atoms, not their rays.',
    as: 'a filter train that brings each contaminant below its safe limit',
    why: 'Each tenfold cleaner costs as much again; safe is a number, and every step of the train is real. Tritium is water itself and passes any filter.',
    bounds: () => [
      bound('separation.work', { T: 288, x: 1e-6 }, (v) => `the least work to take a contaminant down to one part in a million is ${fmt(v / 1000)} kJ a mole`),
      bound('separation.work', { T: 288, x: 1e-12 }, (v) => `to one in a million million, ${fmt(v / 1000)} kJ: twice as much, and to nothing at all, without end`),
    ],
    nearest: [{ what: 'membranes, ion exchange and activated carbon in water treatment', source: SRC.water }],
    path: ['Screen and settle the large pieces.', 'Microfiltration membranes (0.1 µm) for microplastics.', 'Ion exchange or zeolites for heavy metals and radioactive caesium and strontium (as used at Fukushima).', 'Activated carbon for dissolved organics; test each against its limit, and return the clean water.', 'A lake is cleaned by running it through the train for years, and by stopping what flows in.'],
    learn: ['water chemistry and treatment design', 'radionuclides in water'],
  },
  {
    id: 'memory.crystals', name: 'Memory crystals with neural links', group: 'consumer', asked: 'Memory crystals with neural links.',
    wants: 'to keep what you remember', label: 'research',
    why: 'Glass that keeps data for billions of years is made. Reading a memory out of a brain isn\'t known: implants listen to about a thousand of its many billions of neurons.',
    bounds: () => [bound('information.choices', { N: 2 ** 20 }, (v) => `one choice among a million is ${fmt(v)} bits; glass holds 360 TB: the storing is easy, the reading out of a mind is the open part`)],
    nearest: [{ what: '5D data storage in fused silica', source: SRC.glass5d }],
    path: ['Store: write data into fused silica with a femtosecond laser (five dimensions: position, and the orientation and strength of the mark).', 'Record: start from what can be read now: what you see and hear, by camera and microphone, and your notes.', 'Link: decode what the brain is attending to (fMRI or implants); research, step by step.'],
    learn: ['neuroscience of memory', 'brain-computer interfaces', 'laser data storage'],
  },
  {
    id: 'visor.dream-recording', name: 'A dream-recording visor in 4K', group: 'consumer', asked: 'Dream-recording visors in 4K.',
    wants: 'to see your dreams again', label: 'research',
    why: 'What a sleeper dreams of has been decoded from brain scans, as words for what is in it. A dream isn\'t stored as pixels, so what comes out is a picture generated from what was decoded, at any resolution, not a recording.',
    bounds: () => [],
    nearest: [{ what: 'dream contents decoded from fMRI', source: SRC.dreams }],
    path: ['Train a decoder on the sleeper\'s brain activity while awake, looking at known pictures.', 'Record during sleep; wake them at dream signs in the EEG and take their report, to check the decoder.', 'Turn what is decoded into images with a generator; any resolution is the generator\'s, not the dream\'s.', 'A visor-sized version needs a sensor far better than scalp EEG: research.'],
    learn: ['neural decoding', 'sleep physiology', 'image generation'],
  },
  {
    id: 'earpiece.translating', name: 'A zero-latency translating earpiece', group: 'consumer', asked: 'Zero-latency translating earpieces.',
    wants: 'to understand anyone as they speak', label: 'relabelled',
    law: 'Causality: a translator can\'t say what a sentence means before the word that decides it is spoken, and in many languages the verb comes last.',
    as: 'a translator that keeps up a beat behind, or ahead by predicting and correcting',
    why: 'The best human interpreters run two to four seconds behind. A machine can go nearer by predicting the ending and saying so when it was wrong.',
    bounds: () => [],
    nearest: [{ what: 'how far behind interpreters run', source: SRC.interp }],
    path: ['Recognise the speech as it comes, word by word.', 'Translate in pieces, holding back only what the next word could change; say predictions softly and correct them.', 'Speak in the listener\'s ear, in the speaker\'s voice if they agree.'],
    learn: ['speech recognition', 'languages and their word orders', 'simultaneous translation'],
    needs: [{ does: 'hear the speaker', from: 'sound', to: 'signal' }, { does: 'speak in the ear', from: 'electric', to: 'sound' }],
  },
  {
    id: 'glasses.full-spectrum', name: 'Full-spectrum sensory glasses', group: 'consumer', asked: 'Full-spectrum sensory glasses.',
    wants: 'to see what eyes can\'t', label: 'relabelled',
    law: 'A lens resolves no finer than 1.22 λ / D: the longer the wave, the bigger the lens must be to make any image at all.',
    as: 'glasses that see a few more bands (thermal infrared, ultraviolet, near infrared) through sensors and show them to the eye',
    why: 'Heat light (10 µm) makes a sharp image through a lens a centimetre across; radio a metre long through a 5 cm lens makes none.',
    bounds: () => [
      bound('diffraction.limit', { lambda: 10e-6, D: 0.01 }, (v) => `heat light through a 1 cm lens resolves ${fmt(v * 1000)} mrad, ${fmt(v * 10 * 1000)} mm at 10 m: a thermal camera works in glasses`),
      bound('diffraction.limit', { lambda: 1, D: 0.05 }, (v) => `radio a metre long through 5 cm: ${fmt(v)} rad, wider than the whole sky: no image (radio is sensed as a signal, not seen)`),
    ],
    nearest: [{ what: 'uncooled thermal cameras (microbolometers)', source: SRC.infrared }],
    path: ['Pick the bands: thermal (a microbolometer), near infrared and ultraviolet (silicon with filters).', 'Mount them on the frame, aligned with the eyes; overlay their images on a see-through display.', 'For bands that can\'t be imaged (radio, magnetic fields): sense them and show them as signs.'],
    learn: ['optics and detectors', 'see-through displays'],
    needs: [{ does: 'sense light the eye can\'t', from: 'light', to: 'signal' }, { does: 'show it to the eye', from: 'bit', to: 'light' }],
  },
  {
    id: 'tableware.ever-clean', name: 'Ever-clean tableware', group: 'consumer', asked: 'Ever-clean tableware.',
    wants: 'dishes that don\'t need washing', label: 'relabelled',
    law: 'A flat surface beads water only so far (Young), and the roughness that makes it shed everything wears away.',
    as: 'tableware that sheds food and is renewed by a rinse',
    why: 'Liquid-infused surfaces shed almost anything and heal themselves when scratched, because the liquid flows back; they still lose their liquid over time and need it renewed.',
    bounds: () => [bound('young.contact', { gsv: 0.02, gsl: 0.04, glv: 0.072 }, (v) => `water on a low-energy surface beads at ${fmt((v * 180) / Math.PI)}°: no flat surface goes much past 120°, so shedding everything takes texture or a slippery liquid layer`)],
    nearest: [{ what: 'self-repairing slippery liquid-infused surfaces', source: SRC.slips }, { what: 'how superhydrophobic coatings wear', source: SRC.coatings }],
    path: ['Glazed ceramic or steel, textured finely, infused with a food-safe oil it holds by capillarity.', 'Food slides off; a rinse renews the oil from a reservoir in the base or by wiping.', 'Test: abrasion cycles, and taste nothing of the oil.'],
    learn: ['surface chemistry', 'food-contact materials'],
  },
  {
    id: 'furniture.shape-shifting', name: 'Shape-shifting furniture', group: 'consumer', asked: 'Shape-shifting furniture.',
    wants: 'furniture that becomes what the room needs', label: 'made',
    why: 'Furniture that moves itself between forms (a bed that rises into the ceiling, a wall that becomes a desk) is built with actuators, guides and safety sensing; it is mechanism, not magic.',
    bounds: () => [bound('energy.potential', { m: 60, h: 1.5 }, (v) => `raising a 60 kg bed 1.5 m takes ${fmt(v)} J: a 100 W actuator does it in ${fmt(v / 100)} s, before its losses`)],
    nearest: [],
    path: ['Decide its forms and the path between them: hinges, slides, a lead screw or a linkage.', 'Size the actuator for the heaviest move; counterbalance with springs so it fails safe.', 'Sense people and pets in its path (pinch points stop it); guard the moving parts.', 'Build it here from frame members and an actuator; test every form under load.'],
    learn: ['linkage synthesis', 'furniture loads and safety standards'],
    needs: [{ does: 'move its panels', from: 'electric', to: 'push' }],
  },
  {
    id: 'footwear.self-repairing', name: 'Self-repairing footwear', group: 'consumer', asked: 'Self-repairing footwear.',
    wants: 'shoes that don\'t wear out', label: 'buildable',
    why: 'Polymers that heal their own cracks are made: capsules of healing agent burst at a crack and bond it, or the chains themselves re-link with warmth. Wear that rubs material away can\'t heal from nothing, so a sole carries more of itself to wear.',
    bounds: () => [],
    nearest: [{ what: 'autonomic healing of polymer composites', source: SRC.healing }],
    path: ['Upper: a self-healing elastomer that closes cuts at body warmth.', 'Sole: a reversible-bond rubber with a thicker wear layer, re-surfaced by warmth.', 'Test: flex and abrasion cycles, healing between them.'],
    learn: ['self-healing polymer chemistry', 'footwear testing'],
  },
  {
    id: 'umbrella.forcefield', name: 'A microclimate forcefield umbrella', group: 'consumer', asked: 'Microclimate forcefield umbrellas.',
    wants: 'to stay dry and comfortable without holding a canopy', label: 'relabelled',
    law: 'No field pushes on raindrops but air: water is barely magnetic and drops carry little charge. Holding rain off takes air moving up faster than drops fall.',
    as: 'an air-curtain umbrella',
    why: 'The biggest drops fall at about 9 m/s; air blown up at that speed over a square metre carries hundreds of watts.',
    bounds: () => {
      const P = use('energy.kinetic', { m: 1.225 * 1 * 9, v: 9 }).value;
      return [{ says: `air rising at 9 m/s through a square metre carries ${fmt(P)} W (half its mass a second times its speed squared), before the fan's losses: a 100 Wh battery runs it ${fmt((100 / P) * 60)} minutes`, law: 'energy.kinetic', value: P }];
    },
    nearest: [{ what: 'how fast raindrops fall', source: SRC.drops }],
    path: ['A fan in a handle or pack blowing up and out through a ring nozzle.', 'Blow sideways rather than up: turning drops aside takes far less than holding them up.', 'Size the battery for the walk; it is loud.'],
    learn: ['jets and air curtains', 'propellers catalogued'],
    needs: [{ does: 'blow air', from: 'electric', to: 'flight', against: 'fluid' }],
  },
  // ------------------------------------------------------------------------------------------------- space
  {
    id: 'suit.radiation-proof', name: 'A radiation-proof ultra-thin suit', group: 'space', asked: 'Radiation-proof ultra-thin suits.',
    wants: 'to be safe from space radiation', label: 'relabelled',
    law: 'A cosmic-ray proton of 1 GeV runs about 3 m of water before it stops (Bethe), and heavy shields make showers of secondaries: no thin layer stops it.',
    as: 'a suit that stops solar storms\' protons, and a shelter of water or plastic for the rest',
    why: 'Solar storms are mostly protons under a few hundred MeV, stopped by centimetres of hydrogen-rich plastic. Galactic cosmic rays are stopped only by metres, so they are shielded by a shelter, by spending less time out, and by magnetic shielding in research.',
    bounds: () => [],
    nearest: [{ what: 'proton ranges in water', source: SRC.pstar }],
    path: ['A suit layer of hydrogen-rich polyethylene, thickest over the blood-making organs.', 'A storm shelter: water, food and waste stored round a small room (it is shielding you carry anyway).', 'Track solar storms and go to the shelter; limit time in deep space.'],
    learn: ['space radiation transport', 'dosimetry'],
  },
  {
    id: 'drill.asteroid', name: 'An asteroid-mining diamond-graphene drill', group: 'space', asked: 'Asteroid-mining diamond-graphene drills.',
    wants: 'to take material from asteroids', label: 'buildable',
    why: 'Diamond-tipped bits cut rock on Earth every day, and asteroid samples have been brought home. With almost no gravity, a drill pushes itself away: every newton of thrust has to be held by an anchor.',
    bounds: () => [bound('newton.second', { m: 100, a: 2 }, (v) => `${fmt(v)} N of drilling push throws a 100 kg rig back at 2 m/s² unless it is anchored: on an asteroid its weight holds almost nothing`)],
    nearest: [{ what: 'material brought back from an asteroid', source: SRC.bennu }],
    path: ['Anchor first: harpoons, screws, or a net round a small body; or drill in pairs pushing against each other.', 'A rotary bit with diamond (polycrystalline diamond compact) cutters; graphene adds little to a cutter but can coat it against wear.', 'Carry the cuttings by auger into a sealed bin (there is no air to blow them).', 'Power by solar; the motor and gearhead are what this world builds.'],
    learn: ['rock cutting mechanics', 'anchoring in low gravity', 'gearmotors of tens of newton metres catalogued (a rock drill wants more than 1 N·m)'],
    needs: [{ does: 'turn the bit', from: 'electric', to: 'rotation' }],
    spec: { torque: 1, rpm: 60 },
  },
  {
    id: 'mask.atmosphere', name: 'A mask that breathes Mars or Venus', group: 'space', asked: 'Atmosphere-breathing masks for Mars or Venus.',
    wants: 'to breathe on another world', label: 'relabelled',
    law: 'Below 6.3 kPa (the Armstrong limit) water in the body boils at body temperature; Mars\' air is about 0.6 kPa and almost all carbon dioxide, and Venus\' surface is 9.2 MPa at 737 K.',
    as: 'a pressure suit with an oxygen maker',
    why: 'A mask alone can\'t hold the body\'s pressure on Mars. Oxygen can be made from Mars\' carbon dioxide, as has been done there; one person needs about three times what that first machine made.',
    bounds: () => [{ says: 'a person breathes about 0.82 kg of oxygen a day, 34 g an hour; the first machine on Mars made up to 12 g an hour: three of them a person' }],
    nearest: [{ what: 'oxygen made on Mars', source: SRC.moxie }, { what: 'how much oxygen a person needs', source: SRC.bvad }, { what: 'the Armstrong limit', source: SRC.armstrong }],
    path: ['A suit holding about 30 kPa of pure oxygen round the body (as spacesuits do), with mobile joints.', 'An oxygen maker: compress Mars air and split its carbon dioxide on a hot solid-oxide cell; store the oxygen.', 'Venus: only in the clouds about 50 km up, where pressure and temperature are near Earth\'s, against sulfuric acid.'],
    learn: ['spacesuit design', 'solid-oxide electrolysis', 'life support'],
  },
  {
    id: 'boots.gravity', name: 'Gravity-simulating boots', group: 'space', asked: 'Gravity-simulating boots.',
    wants: 'weight in space', label: 'relabelled',
    law: 'Only mass makes gravity (a planet\'s worth for 1 g), and acceleration feels the same: no device worn on the feet gives the body weight.',
    as: 'a spinning habitat (weight by turning), with magnetic soles to hold the feet where it doesn\'t turn',
    why: 'Turning presses everything to the outer wall as weight presses it to the floor; the bones and blood feel it as gravity.',
    bounds: () => {
      const w = (2 * 2 * Math.PI) / 60, r = g0 / (w * w);
      return [bound('centripetal', { m: 1, v: w * r, r }, (v) => `a ${fmt(r, 3)} m ring turning at 2 rpm presses each kilogram with ${fmt(v)} N, 1 g`)];
    },
    nearest: [{ what: 'how fast people can spin', source: SRC.spin }],
    path: ['Spin the habitat, or two modules on a tether, at no more than about 2 rpm.', 'Size the ring or tether for the weight it carries.', 'Magnetic or hook soles for the parts that don\'t spin.'],
    learn: ['vestibular physiology', 'tether dynamics'],
    blueprint: () => spinBlueprint(),
  },
  {
    id: 'alloy.negative-mass', name: 'A negative-mass alloy', group: 'space', asked: 'Negative-mass alloys.',
    wants: 'something that falls up, or moves the other way when pushed', label: 'relabelled',
    law: 'Every mass weighed so far falls down, antimatter too.',
    as: 'effective negative mass: a material or a fluid that moves against a push, within a band, by its inner structure',
    why: 'In a cooled atomic gas, and in metamaterials for sound, the whole moves against a push over a range of frequencies or speeds. It is the behaviour, not the mass.',
    bounds: () => [],
    nearest: [{ what: 'antimatter falls down', source: SRC.antimatter }, { what: 'negative effective mass in a Bose-Einstein condensate', source: SRC.negmass }],
    path: ['For sound or vibration: resonators inside a matrix, tuned so the whole moves against the push near their frequency.', 'Test: drive it and measure its acceleration against the force across frequency.', 'For lift: buoyancy, the only thing that makes a body rise.'],
    learn: ['metamaterials', 'condensed-matter physics'],
  },
  {
    id: 'container.time-dilating', name: 'A time-dilating container', group: 'space', asked: 'Time-dilating containers.',
    wants: 'to slow time for what is inside', label: 'relabelled',
    law: 'Clocks run slow deep in gravity or at speed, but halving time takes Earth\'s whole mass inside a centimetre and a half, just outside its own black hole.',
    as: 'a stasis box: one that slows its contents\' chemistry by cold until it all but stops',
    why: 'Time dilation is real (satellite clocks gain 38 µs a day) and useless for a box. What the want is, keeping what is inside unchanged, is done by cold: chemistry slows exponentially.',
    bounds: () => {
      const r = (8 * G * EARTH) / (3 * C * C);
      return [
        bound('time.dilation.gravity', { M: EARTH, r }, (v) => `to make clocks run at ${fmt(v)} of the outside rate needs Earth's mass within ${fmt(r * 1000)} mm`),
        { says: `at −196 °C chemistry runs ${fmt(slower(50e3, 77, 298))} times as fast as at 25 °C (50 kJ/mol): a stasis by cold`, law: 'arrhenius', value: slower(50e3, 77, 298) },
      ];
    },
    nearest: [{ what: 'relativity in the satellite clocks', source: SRC.gps }],
    path: ['A vacuum-insulated vessel cooled by liquid nitrogen or a cryocooler.', 'Living things: vitrify them (cool so fast, with protectants, that water becomes glass, not ice); cells, embryos and some tissues are kept so now.', 'Food and samples: freeze and seal.'],
    learn: ['cryobiology', 'cryogenic engineering'],
  },
  {
    id: 'tools.liquid-metal', name: 'Liquid metal tools', group: 'space', asked: 'Liquid metal tools.',
    wants: 'a tool that becomes whatever tool is needed', label: 'buildable',
    why: 'Gallium alloys are liquid near room temperature and can be shaped by voltage (their oxide skin) and moved by magnets. A liquid holds no shape under load, so the tool shapes itself liquid and freezes to work.',
    bounds: () => [],
    nearest: [{ what: 'liquid metal shaped by voltage', source: SRC.gallium }, { what: 'magnetic liquid metal that melts and freezes to change form', source: SRC.phase }],
    path: ['Gallium alloy with magnetic particles, held in a mould or a skin.', 'Melt it (gallium melts at about 30 °C), move it into shape by field or voltage, freeze it to work.', 'Its strength frozen is low: a tool for light work, or a shaper of moulds for strong tools.'],
    learn: ['liquid metal electrochemistry', 'magnetic actuation'],
  },
  {
    id: 'panels.light-trapping', name: 'Light-trapping panels', group: 'space', asked: 'Light-trapping panels that absorb 100% of light, near-infinite energy.',
    wants: 'as much power from light as there is', label: 'relabelled',
    law: 'Energy is conserved: a square metre of sunlight brings about 1000 W at noon, and a single-junction cell turns at most about a third into electricity.',
    as: 'a panel that absorbs nearly all the light on it and turns as much as physics allows into power',
    why: 'Absorbing nearly everything is made; turning it all into power isn\'t possible in one junction (the rest is heat). Stacked junctions and using the heat take it further.',
    bounds: () => [
      bound('absorbed.solar', { a: 0, G: 1000, A: 1 }, (v) => `absorbing every photon, a square metre takes ${fmt(v)} W: the whole of what there is`),
      bound('pv.power', { eta: 0.337, G: 1000, A: 1 }, (v) => `a perfect single junction turns ${fmt(v)} W of it into power; the rest is heat, which can warm water`),
    ],
    nearest: [{ what: 'coatings absorbing 99.965% of light', source: SRC.black }, { what: 'the single-junction limit', source: SRC.sq }],
    path: ['Textured, coated cells that trap light; two junctions stacked (perovskite on silicon).', 'Water channels behind to use the heat (a combined panel).', 'Track the sun.'],
    learn: ['photovoltaics', 'solar thermal'],
    needs: [{ does: 'turn light into power', from: 'sunlight', to: 'electric' }],
  },
  // --------------------------------------------------------------------------------------------------- bio
  {
    id: 'plants.lighting', name: 'Bioluminescent houseplants that replace lighting', group: 'bio', asked: 'Bioluminescent houseplants replacing lighting.',
    wants: 'light from living things', label: 'research',
    why: 'Glowing houseplants are sold; their glow is seen in a dark room, far below the 500 lux a desk needs. A plant can glow only with the sunlight it stored by day, at most about 4.6% of it; physics leaves room, and the gap is the plant\'s chemistry.',
    bounds: () => [bound('pv.power', { eta: 0.046, G: 1000, A: 0.2 }, (v) => `a plant with 0.2 m² of leaf in full sun stores at most about ${fmt(v)} W as sugar (4.6%): a reading lamp's light is a few watts, so the energy is there by day; to glow at that brightness it would spend much of its food on light`)],
    nearest: [{ what: 'glowing houseplants', source: SRC.petunia }, { what: 'the limit of photosynthesis', source: SRC.photo }, { what: 'light a desk needs', source: SRC.lux }],
    path: ['Start from the fungal pathway (caffeic acid to luciferin) that makes plants glow now.', 'Raise its output: more enzyme, a recycled luciferin, brighter luciferases; breed for glow.', 'Measure lux at 30 cm; for lighting, aim first at a night light, then a path light.'],
    learn: ['plant metabolic engineering', 'photometry'],
    needs: [{ does: 'glow from its food', from: 'food', to: 'light' }, { does: 'make its food from light', from: 'light', to: 'food' }],
  },
  {
    id: 'serum.age-reversing', name: 'An age-reversing serum', group: 'bio', asked: 'Age-reversing serums.',
    wants: 'to grow younger', label: 'research',
    why: 'Turning on the genes that reset cells to an embryonic state, briefly, has reversed signs of ageing in mice and extended the lives of mice that age fast. Doing it in people without causing cancer is the open part.',
    bounds: () => [],
    nearest: [{ what: 'partial reprogramming in mice', source: SRC.reprogram }],
    path: ['Deliver the reprogramming genes with a switch that turns them on briefly and in cycles.', 'Measure age by epigenetic clocks; watch for tumours.', 'Mice, then larger animals, then trials.'],
    learn: ['the biology of ageing', 'gene therapy', 'clinical trials'],
  },
  {
    id: 'muscles.synthetic', name: 'Synthetic muscles three times as strong', group: 'bio', asked: 'Synthetic hyper-muscles (triple strength).',
    wants: 'strength beyond the body\'s', label: 'made',
    why: 'Coiled polymer and carbon-nanotube fibres contract when heated and lift far more for their weight than muscle. Worn as an exoskeleton they add strength; in a body, the bones and tendons are sized for the muscle they have, so the weakest link would break.',
    bounds: () => [],
    nearest: [{ what: 'artificial muscles from fishing line and sewing thread', source: SRC.muscles }],
    path: ['Coiled nylon or nanotube fibres, heated electrically to contract, cooled to relax.', 'Bundled in parallel along the limb on an exoskeleton that carries the load to the ground, not to the bones.', 'Controlled by the wearer\'s own muscle signals (EMG).'],
    learn: ['artificial muscle materials', 'exoskeleton design', 'EMG control'],
    needs: [{ does: 'pull on electric power', from: 'electric', to: 'push' }],
  },
  {
    id: 'fruit.allergy-neutralising', name: 'Allergy-neutralising fruit', group: 'bio', asked: 'Allergy-neutralising fruit.',
    wants: 'to eat without allergy', label: 'buildable',
    why: 'An apple has been made with its main allergen silenced. Making a fruit that also trains the eater\'s immune system out of an allergy is oral immunotherapy, given as a fruit.',
    bounds: () => [],
    nearest: [{ what: 'an apple with its main allergen silenced', source: SRC.apple }],
    path: ['Silence the fruit\'s allergen genes (RNA interference or gene editing).', 'Test allergic people\'s skin and blood against it.', 'Immunotherapy: a fruit with a measured, rising dose of the allergen, under a doctor.'],
    learn: ['immunology of allergy', 'plant genetics'],
  },
  // ------------------------------------------------------------------------------------------ architecture
  {
    id: 'dome.geodesic', name: 'A silica geodesic bio-dome', group: 'architecture', asked: 'Silica geodesic bio-domes.',
    wants: 'a glass dome to live and grow in', label: 'made',
    why: 'Geodesic domes have been built since the 1950s: triangles spread the load over the sphere, so slender struts carry a large span. Glass (silica) panes on a steel frame make a greenhouse of it.',
    bounds: () => [],
    nearest: [{ what: 'the geodesic dome', source: SRC.dome }],
    path: ['Choose the span and the frequency (how finely the sphere is split); two-frequency for a small dome.', 'Size the struts for snow and the glass, cut them to their lengths, make the hubs.', 'Glaze each triangle; seal and vent it (a greenhouse overheats).'],
    learn: ['shell structures', 'glazing design'],
    blueprint: () => domeBlueprint(),
  },
  {
    id: 'bridge.self-growing', name: 'A self-growing bridge with a titanium core', group: 'architecture', asked: 'Self-growing bridges with a titanium core.',
    wants: 'a bridge that grows stronger by itself', label: 'made',
    why: 'Living bridges of rubber-fig roots are grown in Meghalaya: guided across a river, the roots fuse and thicken for decades. A metal core carries the load while the roots grow.',
    bounds: () => [],
    nearest: [{ what: 'living root bridges', source: SRC.roots }],
    path: ['Plant rubber figs on both banks; guide their aerial roots along the core.', 'The core: a frame sized for people on it now (here, steel hollow sections; titanium is not stocked yet).', 'Tie and fuse the roots each season; in decades they carry the load themselves.'],
    learn: ['tree biomechanics', 'titanium sections catalogued'],
    blueprint: () => {
      const r = workflowById('member.size')!.run({ span: 3, load: 2000, sf: 2 });
      return { summary: `The core, 3 m between banks for two people (2 kN) in the middle: ${r.summary}`, lines: ['Two such members side by side carry a deck of planks; the roots are guided along them.'], parts: r.parts };
    },
  },
  {
    id: 'paint.sound-dampening', name: 'Perfect sound-dampening paint', group: 'architecture', asked: 'Perfect sound-dampening paint.',
    wants: 'a quiet room', label: 'relabelled',
    law: 'A wall stops sound by its mass (the mass law): a coat of paint adds almost none, so it changes almost nothing that passes through.',
    as: 'a wall that stops sound (mass, a gap, a soft layer between), with a paint that only takes the echo',
    why: 'An absorbing coating softens echo inside a room; stopping sound from passing needs mass, and a double wall with a gap and absorber does better than its mass.',
    bounds: () => {
      const wall = use('acoustic.mass-law', { m: 460, f: 100 }).value, painted = use('acoustic.mass-law', { m: 461.5, f: 100 }).value;
      return [{ says: `a 200 mm concrete wall (460 kg/m²) stops ${fmt(wall)} dB at 100 Hz; a 1 mm coat of paint (1.5 kg/m²) adds ${fmt(painted - wall)} dB`, law: 'acoustic.mass-law', value: painted - wall }];
    },
    nearest: [],
    path: ['Find where sound comes in: gaps first (a gap undoes any wall).', 'Add mass: dense board on resilient mounts, a gap with mineral wool, a second leaf.', 'Inside: absorbing panels or a porous coating for the echo.'],
    learn: ['building acoustics'],
  },
  {
    id: 'asphalt.liquid-repelling', name: 'Liquid-repelling asphalt', group: 'architecture', asked: 'Liquid-repelling asphalt.',
    wants: 'roads that are never wet', label: 'relabelled',
    law: 'Shedding water takes a fine texture or a low-energy coating, and tyres wear both away.',
    as: 'asphalt that drains water through itself',
    why: 'Porous asphalt lets rain fall through to a drained layer below, so the surface stays clear and grips; a repellent coating on a road would be gone in weeks.',
    bounds: () => [],
    nearest: [{ what: 'porous asphalt', source: SRC.porous }, { what: 'how repellent coatings wear', source: SRC.coatings }],
    path: ['An open-graded asphalt with about a fifth air voids over a stone reservoir and drains.', 'Clean it by suction so the voids stay open.'],
    learn: ['pavement engineering'],
  },
  {
    id: 'instrument.aroma', name: 'A synesthetic aroma instrument', group: 'architecture', asked: 'Synesthetic (aroma) instruments.',
    wants: 'music played in scent', label: 'buildable',
    why: 'Scent drifts by diffusion alone over hours a metre, so an instrument must carry each note on a breeze to the nose and draw it away again for the next.',
    bounds: () => [bound('diffusion.time', { x: 1, D: 1e-5 }, (v) => `by diffusion alone a scent takes ${fmt(v / 3600)} hours to drift a metre: notes have to ride a breeze to be played in time`)],
    nearest: [{ what: 'scent released in time with a film', source: SRC.scent }],
    path: ['A rack of sealed scent cartridges, each a note, opened by valves.', 'A gentle stream of air carries each note to the player\'s face; an extractor clears it.', 'Keys play valves; chords mix scents; the tempo is the air\'s.'],
    learn: ['olfaction', 'fragrance chemistry'],
    needs: [{ does: 'blow each note', from: 'electric', to: 'flight', against: 'fluid' }],
  },
  {
    id: 'photos.tactile', name: 'Tactile memory photographs', group: 'architecture', asked: 'Tactile memory photographs.',
    wants: 'to feel a picture', label: 'buildable',
    why: 'A picture turned into a relief, height for brightness or the real depth of what was there, can be printed or milled; fingertips tell points apart at about 2 to 3 mm.',
    bounds: () => [],
    nearest: [{ what: 'what a fingertip resolves', source: SRC.touch }],
    path: ['Take the photo with depth (a depth camera or two views).', 'Turn the depth into a relief, features no finer than 2 mm, textures of the real things.', 'Print or mill it; colour it.'],
    learn: ['a relief form from a height map (her form language has none yet)'],
  },
  // ---------------------------------------------------------------------------------------------- survival
  {
    id: 'cast.spray-on', name: 'A spray-on medical cast', group: 'survival', asked: 'Spray-on medical casts.',
    wants: 'a cast in a minute', label: 'made',
    why: 'A two-part polyurethane foam sprayed on the limb hardens in under a minute into a splint, and has held fractures better than standard splints in trials.',
    bounds: () => [],
    nearest: [{ what: 'a one-step spray-on foam splint', source: SRC.splint }],
    path: ['A two-part can (polyol and isocyanate) mixing at the nozzle.', 'Sprayed over a liner on the limb, in traction; hard in under a minute.', 'Cut off with shears; check circulation.'],
    learn: ['polyurethane chemistry', 'fracture care'],
  },
  {
    id: 'grenade.fire-extinguishing', name: 'A fire-extinguishing grenade', group: 'survival', asked: 'Fire-extinguishing grenades.',
    wants: 'to put out a fire from a distance', label: 'made',
    why: 'Glass fire grenades were thrown at fires from the 1870s; balls of dry powder that burst in a fire are sold now. Powder breaks the flame\'s chain reaction; water takes its heat.',
    bounds: () => [bound('heat.capacity', { m: 0.5, c: 4186, dT: 80 }, (v) => `half a kilogram of water takes ${fmt(v / 1000)} kJ warming to boiling and about ${fmt(0.5 * 2257)} kJ more boiling off: a small fire's heat for seconds`)],
    nearest: [{ what: 'Victorian glass fire grenades', source: SRC.grenade }, { what: 'a self-activating dry-powder ball', source: SRC.fireball }],
    path: ['A thin shell that bursts on impact or by a heat-triggered charge.', 'Fill: monoammonium phosphate powder for most fires.', 'Thrown at the base of the flames, or mounted where a fire would start.'],
    learn: ['fire chemistry'],
  },
  {
    id: 'printer.antidote', name: 'An antidote printer', group: 'survival', asked: 'Antidote printers.',
    wants: 'the medicine you need, made where you are', label: 'buildable',
    why: 'Robots that run a chemical recipe from a file, and printed reaction vessels, have made medicines on demand. They need their starting chemicals; antidotes that are antibodies (antivenoms) are grown, not printed.',
    bounds: () => [],
    nearest: [{ what: 'a robot that runs chemical programs', source: SRC.chemputer }, { what: 'printed reactionware for medicines on demand', source: SRC.reactionware }],
    path: ['A library of recipes and a kit of starting chemicals.', 'Pumps, valves, heaters and a separator, run from the recipe; check the product (spectroscopy).', 'Antibodies: freeze-dried stock, not synthesis.'],
    learn: ['organic synthesis', 'pharmacology', 'analytical chemistry'],
  },
  {
    id: 'tent.aerogel', name: 'A sub-zero aerogel thermal tent', group: 'survival', asked: 'Sub-zero aerogel thermal tents (99% of body heat).',
    wants: 'to stay warm in deep cold', label: 'made',
    why: 'Silica aerogel conducts heat about half as well as still air; blankets of it are made. A shelter keeps you warm when it loses no more than your body makes: the thickness follows from Fourier\'s law.',
    bounds: () => [bound('conduction', { k: 0.015, A: 10.4, dT: 50, L: 0.08 }, (v) => `80 mm of aerogel over 10.4 m² with 50 K across it loses ${fmt(v)} W, a resting body's heat`)],
    nearest: [{ what: 'silica aerogel\'s conductivity', source: SRC.aerogel }],
    path: ['Size the wall for the body\'s heat at the coldest night.', 'Aerogel blanket between a shell and a vapour-tight liner; the floor insulated the same.', 'Seal the door; keep the blanket dry.'],
    learn: ['moisture in insulation', 'aerogel materials catalogued'],
    blueprint: () => tentBlueprint(),
  },
  // ------------------------------------------------------------------------------------------------- micro
  {
    id: 'electronics.silk', name: 'Biodegradable silk electronics', group: 'micro', asked: 'Biodegradable silk electronics (phones).',
    wants: 'electronics that return to the earth', label: 'buildable',
    why: 'Circuits of silicon membranes and magnesium on silk dissolve in water at a rate set by the silk. A whole phone also needs a display and battery that do, which are the open parts.',
    bounds: () => [],
    nearest: [{ what: 'silk transient electronics', source: SRC.silk }, { what: 'transient silicon electronics', source: SRC.transient }],
    path: ['Silk fibroin substrate and encapsulation, its crystallinity set for the life wanted.', 'Silicon nanomembrane transistors, magnesium traces, magnesium oxide insulation.', 'Dissolvable battery (magnesium and molybdenum); a display is the hardest part.'],
    learn: ['transient electronics', 'silk processing'],
  },
  {
    id: 'preservatives.molecular', name: 'Molecular food preservatives lasting decades', group: 'micro', asked: 'Molecular food preservatives (decades).',
    wants: 'food that keeps for decades', label: 'made',
    why: 'Food keeps when nothing lives in it and its chemistry is slow: sterilised and sealed from oxygen it keeps for years, and cold slows what chemistry is left exponentially.',
    bounds: () => [
      { says: `frozen at −18 °C, food chemistry runs ${fmt(1 / slower(50e3, 255, 298))} times slower than at 25 °C (50 kJ/mol)`, law: 'arrhenius', value: slower(50e3, 255, 298) },
      { says: `in a fridge at 4 °C, ${fmt(1 / slower(50e3, 277, 298))} times slower` },
    ],
    nearest: [],
    path: ['Kill what lives in it: heat in the sealed container (retort) or high pressure.', 'Keep oxygen and light out: a sealed can or foil pouch, an oxygen absorber.', 'Store it cool; dry foods with little water keep longest.'],
    learn: ['food microbiology', 'packaging'],
  },
  {
    id: 'gears.frictionless', name: 'Frictionless microscopic gears', group: 'micro', asked: 'Frictionless microscopic gears.',
    wants: 'gears that never wear or waste', label: 'relabelled',
    law: 'Moving surfaces always lose a little to heat at any speed (the second law); friction can be made tiny, not zero.',
    as: 'superlubric gears: friction a thousandth of oiled steel\'s',
    why: 'Graphite layers sliding out of step have friction a thousandth of oiled metal\'s and almost no wear, at the micro scale.',
    bounds: () => [
      bound('friction.coulomb', { mu: 0.1, N: 1 }, (v) => `oiled steel on a 1 N load: ${fmt(v)} N of friction`),
      bound('friction.coulomb', { mu: 1e-4, N: 1 }, (v) => `superlubric graphite: ${fmt(v)} N`),
    ],
    nearest: [{ what: 'structural superlubricity', source: SRC.superlube }],
    path: ['Micro gears etched in silicon (MEMS), their teeth and hubs coated with graphite flakes laid out of step.', 'Run them sealed from moisture and dust.'],
    learn: ['tribology at the micro scale', 'MEMS fabrication'],
  },
  {
    id: 'capsules.scent', name: 'Scent-capturing capsules releasing permanently', group: 'micro', asked: 'Scent-capturing capsules that release permanently.',
    wants: 'a scent that never fades', label: 'relabelled',
    law: 'A capsule holds a finite mass of scent, so releasing for ever means releasing ever less: it lasts its mass over its rate.',
    as: 'a capsule that releases for years at a level you can just smell',
    why: 'Noses smell some molecules at a few parts per billion, so a gram released slowly lasts a very long time.',
    bounds: () => [{ says: `a gram of scent released at a microgram an hour lasts ${fmt(1e-3 / 1e-9 / 24 / 365.25)} years` }],
    nearest: [],
    path: ['Capture: draw air over the source through an adsorbent, and analyse it (GC-MS) to recreate it.', 'Encapsulate in a polymer whose wall sets the rate; release by friction, warmth or slowly by diffusion.', 'Strong-smelling molecules first: less mass a year for the same scent.'],
    learn: ['fragrance chemistry', 'controlled release'],
  },
];

export const frontierById = (id: string) => FRONTIER.find((f) => f.id === id);

// ---------------------------------------------------------------------------------------------------- exploring

/** How far her own machinery gets: sized whole, grown in part, or a path with what she learns next. */
export type Reach = 'blueprinted' | 'grown' | 'pathed';

export interface Exploration { frontier: Frontier; attempt: Attempt; blueprint: Blueprint | null; reach: Reach; toLearn: string[] }

const asChallenge = (f: Frontier): Challenge => ({ id: f.id, name: f.name, asked: f.asked, frame: f.why, needs: f.needs ?? [], ...(f.spec ? { spec: f.spec } : {}), probe: f.bounds });

/** Take a frontier through everything she has: its bounds, her growing of what it does, her blueprint where she can size it. */
export function explore(f: Frontier): Exploration {
  const a = attempt(asChallenge(f));
  let blueprint: Blueprint | null = null;
  try { blueprint = f.blueprint?.() ?? null; } catch (e) { a.toFix.push(`its blueprint failed: ${(e as Error).message}`); }
  const grownAny = a.results.some((r) => r.level === 'works' || r.level === 'partial');
  const reach: Reach = blueprint ? 'blueprinted' : grownAny ? 'grown' : 'pathed';
  return { frontier: f, attempt: a, blueprint, reach, toLearn: [...new Set([...f.learn, ...a.toFix])] };
}

const STOP = new Set(['make', 'build', 'would', 'could', 'should', 'blueprint', 'with', 'that', 'this', 'from', 'have', 'your', 'what', 'about', 'there', 'them', 'they', 'into', 'more', 'than', 'very', 'just', 'create', 'invent', 'design', 'possible', 'able', 'show', 'give', 'need', 'want']);

/** The frontier item a request names: the one sharing the most meaningful words with it, and at least `least` of them. */
export function frontierFor(text: string, least = 2): Frontier | undefined {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, '')));
  const asked = words(text);
  let best: Frontier | undefined, score = 0;
  for (const f of FRONTIER) {
    const mine = words(`${f.name} ${f.asked} ${f.id.replace(/[.-]/g, ' ')}`);
    let s = 0;
    for (const w of asked) if (mine.has(w)) s++;
    if (s > score) { score = s; best = f; }
  }
  return score >= least ? best : undefined;
}

const LABEL_SAYS: Record<Label, string> = {
  made: 'It has been made',
  buildable: 'It can be built from known physics and methods',
  research: 'It waits on a discovery no law rules out',
  relabelled: 'As said, it runs into a law; relabelled, the want is met',
};

/** An exploration, said plainly: the want, its label, the bounds, the nearest real thing, the path, the blueprint. */
export function frontierReport(x: Exploration): string {
  const f = x.frontier;
  const parts = [`${f.name}: what you want is ${f.wants}. ${LABEL_SAYS[f.label]}${f.label === 'relabelled' ? ` (${f.law}) as ${f.as}` : ''}. ${f.why}`];
  if (x.attempt.notes.length) parts.push(`The numbers: ${x.attempt.notes.map((n) => n.says).join('; ')}.`);
  if (f.nearest.length) parts.push(`Nearest real: ${f.nearest.map((n) => n.what).join('; ')}.`);
  parts.push(`The path: ${f.path.map((s, i) => `${i + 1}. ${s}`).join(' ')}`);
  if (x.blueprint) parts.push(`Blueprint: ${x.blueprint.summary} ${x.blueprint.lines.join(' ')}`);
  const grown = x.attempt.results.filter((r) => r.level === 'works' || r.level === 'partial');
  if (grown.length) parts.push(`I can grow: ${grown.map((r) => `${r.need.does} (${r.says})`).join('; ')}.`);
  parts.push(`I learn next: ${x.toLearn.join('; ')}.`);
  return parts.join(' ');
}

/** The whole frontier at a glance, by label and by how far she reaches. */
export function frontierCensus(): { total: number; byLabel: Record<Label, number>; byReach: Record<Reach, number> } {
  const byLabel: Record<Label, number> = { made: 0, buildable: 0, research: 0, relabelled: 0 };
  const byReach: Record<Reach, number> = { blueprinted: 0, grown: 0, pathed: 0 };
  for (const f of FRONTIER) {
    byLabel[f.label]++;
    byReach[explore(f).reach]++;
  }
  return { total: FRONTIER.length, byLabel, byReach };
}


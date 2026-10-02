// Machines, broken down: what each is made of, assembly by assembly, as far as its maker publishes. A node either
// carries what was published (with where) or says plainly that the maker doesn't publish it: nothing below is a guess
// at a part number or a supplier. A machine also says which processes it runs and what it feeds them with, so it
// joins the rest of the ganglia (graph.ts: a machine runs processes, feeds materials).

import type { CatalogItem, Price, Source } from './types';

export interface AssemblyNode {
  name: string;
  /** What it is and does. */
  is: string;
  /** Published figures, SI. */
  specs?: Record<string, number | string>;
  /** True when its maker publishes it (then `source` says where); false when it is known to exist but not detailed. */
  published: boolean;
  source?: Source;
  children?: AssemblyNode[];
}

export interface Machine {
  id: string;
  label: string;
  /** The real machine its figures were taken from, when they were (provenance only: a machine is known by what it is). */
  example?: string;
  /** What it does, in a line. */
  does: string;
  specs: Record<string, number | string>;
  price?: Price;
  source: Source;
  tree: AssemblyNode[];
  /** Processes it runs (processes.ts ids) and the catalog items it is fed (printing materials). */
  runs: string[];
  feeds: string[];
  tags: string[];
}

const FX10 = { cite: 'Markforged, FX10 Industrial Metal and Composite 3D Printer (product page and specifications)', url: 'https://markforged.com/3d-printers/fx10', kind: 'maker' as const };
const FX10_METAL = { cite: 'Markforged FX10 Metal Kit announcement (Metal AM; Additive Manufacturing Media; Mark3D product page)', url: 'https://www.metal-am.com/markforgeds-fx10-metal-kit-add-on-enables-both-metal-and-composite-additive-manufacturing/', kind: 'distributor' as const };
const FX10_STORE = { cite: 'MatterHackers, Markforged FX10 listing (material drawer, list price)', url: 'https://www.matterhackers.com/store/l/markforged-fx10-industrial-metal-and-composite-3d-printer/sk/MRX7KV1M', kind: 'distributor' as const };
const COMPOSITES = { cite: 'Markforged Composites Material Datasheet (ASTM D638, D790, D3039, D648, D256)', url: 'https://static.markforged.com/downloads/composites-data-sheet.pdf', kind: 'maker' as const };

const NXE38 = { cite: 'ASML, TWINSCAN NXE:3800E product page', url: 'https://www.asml.com/en/products/euv-lithography-systems/twinscan-nxe-3800e', kind: 'maker' as const };
const NXE34 = { cite: 'ASML, TWINSCAN NXE:3400C product page (all-reflective 4× Zeiss lens, 26 × 33 mm field)', url: 'https://www.asml.com/en/products/euv-lithography-systems/twinscan-nxe3400c', kind: 'maker' as const };
const TRUMPF = { cite: 'TRUMPF, EUV drive laser: 40 kW pulsed CO₂ laser at 50 kHz, pulses amplified more than 10,000 times, a pre-pulse and a main pulse for each of 50,000 tin droplets a second', url: 'https://www.trumpf.com/en_US/solutions/applications/euv-lithography/euv-drive-laser/', kind: 'maker' as const };
const CYMER = { cite: 'Cymer, CO₂/Sn LPP EUV sources for device development and HVM, SPIE Advanced Lithography 2013 (graded multilayer, temperature-controlled collector)', url: 'https://www.cymer.com/wp-content/uploads/2018/12/Cymer_SPIE_AdvancedLithography_2013.pdf', kind: 'maker' as const };
const LFW_SOURCE = { cite: 'Laser Focus World, Photonic frontiers: EUV lithography (the pre-pulse spreads a 30 µm droplet to the main beam\'s 100 µm focus)', url: 'https://www.laserfocusworld.com/lasers-sources/article/16557008/photonic-frontiers-euv-lithography-euv-lithography-has-yet-to-find-its-way-into-the-fab', kind: 'press' as const };
const ZEISS = { cite: 'Conradi, Kuerz et al. (Carl Zeiss SMT), Optics for EUV Production, EUVL Symposium 2011 (field and pupil facet mirrors; six-mirror projection optics)', url: 'https://euvlsymposium.lbl.gov/pdf/2011/pres/Olaf%20Conradi.pdf', kind: 'maker' as const };
const MIRRORS = { cite: 'Laser Focus World, Multilayer mirrors enable next-generation EUV lithography (Mo/Si multilayers, about 70% reflectivity per mirror at near-normal incidence)', url: 'https://www.laserfocusworld.com/optics/article/16566714/optics-for-scanning-multilayer-mirrors-enable-next-generation-euv-lithography', kind: 'press' as const };
const H2 = { cite: 'US patent 11,340,532, Prolonging optical element lifetime in an EUV lithography system (hydrogen slows tin debris; EUV-made hydrogen radicals turn tin deposits into volatile stannane, pumped away)', url: 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11340532', kind: 'patent' as const };
const REVIEW = { cite: 'EUV Lithography: State-of-the-Art Review (every gas absorbs 13.5 nm, so the whole optical path is reflective and in vacuum; ~7 nm Mo/Si bilayers reflect it by Bragg reflection)', url: 'https://www.researchgate.net/publication/334136595_EUV_Lithography_State-of-the-Art_Review', kind: 'paper' as const };
const WIKI_EUV = { cite: 'Extreme ultraviolet lithography (Wikipedia, and the sources it cites): masks are reflective, as EUV is absorbed by almost every material', url: 'https://en.wikipedia.org/wiki/Extreme_ultraviolet_lithography', kind: 'press' as const };
const PELLICLE = { cite: 'US patent 6,498,685 (EUV mask making held back by, among other things, the lack of a pellicle material)', url: 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6498685', kind: 'patent' as const };
const PRICE = { cite: 'TechPowerUp, ASML High-NA EUV Twinscan EXE machines cost USD 380 million (low-NA NXE about USD 183 million)', url: 'https://www.techpowerup.com/319071/asml-high-na-euv-twinscan-exe-machines-cost-usd-380-million-10-20-units-already-booked', kind: 'press' as const };
const POWER = { cite: 'TSPA Semiconductor, ASML\'s EUV power strategy (about 532 kW of electrical power for 200 W of EUV)', url: 'https://tspasemiconductor.substack.com/p/asmls-euv-power-strategy-more-wafers', kind: 'press' as const };
const HIGHNA = { cite: 'Tom\'s Hardware and TechPowerUp on the High-NA EXE:5000 (NA 0.55, 8 nm resolution against 13 nm, about 150,000 kg, 250 crates, 250 engineers and six months to install)', url: 'https://www.tomshardware.com/tech-industry/semiconductors/asml-lithograpy-roadmap-examined-from-duv-to-hyper-na', kind: 'press' as const };

export const MACHINES: Machine[] = [
  {
    id: 'printer.cff-composite', label: 'Industrial continuous-fibre composite printer (with a metal option)',
    example: 'Markforged FX10',
    does: 'Prints nylon composite parts reinforced with continuous fibre (CFF), and with its Metal Kit, bound-metal parts that are washed and sintered to steel.',
    specs: {
      buildX: 0.375, buildY: 0.3, buildZ: 0.3, layerMin: 125e-6, layerMax: 250e-6, metalLayerAfterSinter: 127e-6, chamberMax: 333.15,
      width: 0.76, depth: 0.64, height: 1.2, massLow: 109, massHigh: 122, power: '100-120 VAC 12/15 A or 200-240 VAC 6/8 A',
      speed: 'about twice the X7 (and four times the Mark Two), per Markforged',
    },
    price: { amount: 99990, currency: 'USD', seen: '2026-10', note: 'list price (MatterHackers listing), composite configuration' },
    source: FX10,
    runs: ['cff', 'metal.fff'], feeds: ['filament.nylon-microcarbon', 'fibre.carbon-continuous', 'fibre.carbon-continuous-fr'],
    tags: ['3d printer', 'printer', 'composite', 'carbon fiber', 'metal', 'additive'],
    tree: [
      {
        name: 'Frame and enclosure', is: 'The machine\'s body: a closed cabinet that holds a heated build chamber.', published: true, source: FX10,
        specs: { width: 0.76, depth: 0.64, height: 1.2, mass: '109 to 122 kg (by configuration)' },
        children: [
          { name: 'Heated build chamber', is: 'Keeps the part warm while it prints (less warping, faster printing).', published: true, source: FX10, specs: { maxTemperature: 333.15 } },
          { name: 'Structural frame, panels and doors', is: 'Its materials and construction are not published by Markforged.', published: false },
        ],
      },
      {
        name: 'Motion system', is: 'Moves the print head and the bed; Markforged says it holds accuracy at high print speed.', published: true, source: FX10,
        children: [{ name: 'Axes, motors, guides and drives', is: 'Their types, sizes and suppliers are not published by Markforged.', published: false }],
      },
      {
        name: 'Composite print engine', is: 'Direct-drive print head with two nozzles, one for plastic and one for continuous fibre, changing between them automatically.', published: true, source: FX10,
        children: [
          { name: 'Plastic nozzle', is: 'Extrudes the matrix (Onyx, nylon) layer by layer.', published: true, source: FX10 },
          { name: 'Fibre nozzle', is: 'Lays continuous fibre (carbon, carbon FR) into chosen layers, inside the plastic.', published: true, source: FX10 },
          { name: 'Optical sensors on the print head', is: 'Two, inspecting parts while the machine runs.', published: true, source: FX10 },
          { name: 'Heaters, thermistors, drive gears', is: 'Not published by Markforged.', published: false },
        ],
      },
      {
        name: 'Metal Kit (option)', is: 'A swappable metal print engine: about 15 minutes to change between metal and composite.', published: true, source: FX10_METAL,
        children: [
          { name: 'Metal print head', is: 'Swaps with the composite head (a wiring harness and two screws).', published: true, source: FX10_METAL },
          { name: 'Metal-specific feed tubes and material guide block', is: 'Route the bound-metal filament.', published: true, source: FX10_METAL },
          { name: 'Dual pre-extruders', is: 'Push the filament from storage to the head (for composite and metal both).', published: true, source: FX10_METAL },
          { name: 'Heated bed with auto levelling and replaceable print sheets', is: 'For metal printing (composite printing uses the machined aluminium bed).', published: true, source: FX10 },
        ],
      },
      {
        name: 'Build plate', is: 'Precision-machined aluminium print bed (composite).', published: true, source: FX10,
        specs: { x: 0.375, y: 0.3 },
      },
      {
        name: 'Vision Module and laser micrometer', is: 'A camera that images calibration parts, and a laser micrometer that checks dimensions during the print and drives the machine\'s calibration.', published: true, source: FX10,
      },
      {
        name: 'Material drawer', is: 'Four individually sealed bays for 800 cc spools, keeping filament dry; it switches spools automatically during a print and an empty bay can be reloaded without stopping.', published: true, source: FX10_STORE,
        specs: { bays: 4, spool: '800 cc' },
      },
      {
        name: 'Electronics and power', is: 'Single-phase mains.', published: true, source: FX10,
        specs: { supply: '100-120 VAC 12/15 A or 200-240 VAC 6/8 A' },
        children: [{ name: 'Controller boards, drivers, power supplies', is: 'Not published by Markforged.', published: false }],
      },
      {
        name: 'Software (slicer and fleet manager)', is: 'Slices parts, routes fibre, scales metal parts for sinter shrinkage, and manages a fleet of printers.', published: true, source: FX10,
      },
    ],
  },
  {
    id: 'lithography.euv-scanner', label: 'Extreme ultraviolet (EUV) lithography scanner, 0.33 NA',
    example: 'ASML TWINSCAN NXE:3800E',
    does: 'Prints a chip layer\'s pattern onto a silicon wafer with 13.5 nm light: light made by blasting tin droplets with a laser, carried and shrunk four times by mirrors alone, in vacuum, from a reflective mask onto a scanning wafer.',
    specs: {
      wavelength: 13.5e-9, NA: 0.33, reduction: 4, fieldX: 0.026, fieldY: 0.033, resolution: 13e-9, overlay: 1.1e-9,
      throughput: 'over 195 wafers an hour at 30 mJ/cm² (220 with an upgrade)', drivelaser: 40e3, droplets: 50000,
      electric: 'about 532 kW for 200 W of EUV (reported)',
    },
    price: { amount: 183e6, currency: 'USD', seen: '2026-10', note: `reported price of a low-NA NXE system; the High-NA EXE about USD 380 million (${PRICE.cite})` },
    source: NXE38,
    runs: [], feeds: [],
    tags: ['lithography', 'euv', 'scanner', 'chip', 'semiconductor', 'asml', 'wafer', 'extreme ultraviolet'],
    tree: [
      {
        name: 'Light source (laser-produced tin plasma)', is: 'Makes the 13.5 nm light as the glow of a tin plasma, the only way it is made at production power in these machines.', published: true, source: TRUMPF,
        children: [
          { name: 'Drive laser', is: 'A pulsed CO₂ laser (10.6 µm) amplified more than 10,000 times through a chain of amplifiers: by its maker\'s account, the most powerful laser built in series production.', published: true, source: TRUMPF, specs: { power: 40e3, rate: 50e3, wavelength: 10.6e-6 } },
          { name: 'Tin droplet generator', is: 'Shoots 50,000 molten tin droplets a second, about 30 µm across, through the laser\'s focus.', published: true, source: TRUMPF, specs: { droplets: 50000, diameter: 30e-6 } },
          { name: 'Pre-pulse and main pulse', is: 'A first pulse flattens each droplet to about 100 µm, the main beam\'s focus; the main pulse heats it into a plasma that emits at 13.5 nm.', published: true, source: LFW_SOURCE },
          { name: 'Collector mirror', is: 'A temperature-controlled, graded Mo/Si multilayer mirror facing the plasma, gathering its light and focusing it into the scanner.', published: true, source: CYMER },
          { name: 'Hydrogen debris control', is: 'Hydrogen gas slows the tin flung off the plasma; hydrogen radicals the EUV makes turn tin on the collector into stannane gas, pumped away.', published: true, source: H2 },
          { name: 'Source vessel, droplet catcher, its sensors and control', is: 'Their designs and figures are not published.', published: false },
        ],
      },
      {
        name: 'Illuminator', is: 'Mirrors that shape the light and make it even across the slit: a field facet mirror and a pupil facet mirror, together setting the angles the mask is lit from.', published: true, source: ZEISS,
        children: [{ name: 'Facet mirror actuators and their settings', is: 'Not published in detail.', published: false }],
      },
      {
        name: 'Reticle (mask) and its stage', is: 'The pattern, on a mask that reflects rather than transmits: EUV is absorbed by almost every material, so a multilayer mirror carries the pattern in an absorbing layer. Its stage scans it through the light while the wafer scans the other way, four times slower.', published: true, source: WIKI_EUV,
        children: [
          { name: 'Pellicle', is: 'A thin membrane over the mask keeping particles off its pattern; long held back at EUV by the lack of a material thin and clear enough to let 13.5 nm light through.', published: true, source: PELLICLE },
          { name: 'Reticle stage motors and metrology', is: 'Not published in detail.', published: false },
        ],
      },
      {
        name: 'Projection optics', is: 'Six mirrors, M1 to M6, all reflective, that shrink the mask\'s image four times onto the wafer through a 0.33 numerical aperture over a 26 × 33 mm field. Each Mo/Si multilayer mirror reflects about 70%, so the six pass only about 12% of what reaches them (0.7⁶).', published: true, source: NXE34, specs: { mirrors: 6, NA: 0.33, reduction: 4, reflectivity: 0.7 },
        children: [
          { name: 'Mo/Si multilayer coatings', is: 'About 7 nm molybdenum-silicon bilayers, stacked, reflecting 13.5 nm by Bragg reflection.', published: true, source: REVIEW },
          { name: 'Mirror substrates, mounts and actuators', is: 'Not published in detail by Zeiss.', published: false },
        ],
      },
      {
        name: 'Wafer stages', is: 'Two: one wafer is measured while the other is exposed, so the light never waits. Each layer lands on the one below within 1.1 nm.', published: true, source: NXE38, specs: { stages: 2, overlay: 1.1e-9 },
        children: [{ name: 'Stage motors, encoders and interferometers', is: 'Not published in detail.', published: false }],
      },
      { name: 'Vacuum system', is: 'The whole light path is in vacuum: every gas absorbs 13.5 nm light.', published: true, source: REVIEW },
      {
        name: 'Power, size and installation', is: 'About 532 kW of electricity for 200 W of EUV light, by reports; the High-NA successor (0.55 NA, 8 nm) is about 150 tonnes, ships in 250 crates and takes 250 engineers six months to install.', published: true, source: POWER,
        children: [{ name: 'High-NA (EXE) successor', is: 'An anamorphic 0.55 NA version printing 8 nm against 13 nm, at about USD 380 million.', published: true, source: HIGHNA }],
      },
    ],
  },
];

/** What the FX10 prints with, from Markforged's composites datasheet (ASTM test results, SI). */
export const PRINTING_MATERIALS: CatalogItem[] = [
  {
    id: 'filament.nylon-microcarbon', family: 'printing material', label: 'Micro carbon fibre filled nylon filament (matrix)', source: COMPOSITES,
    specs: { tensileModulus: 2.4e9, tensileYield: 40e6, tensileBreak: 37e6, flexStrength: 71e6, flexModulus: 3.0e9, heatDeflection: 418.15, density: 1200, izodNotched: 330 },
    tags: ['onyx', 'nylon', 'composite', 'printing', 'filament', 'matrix'],
  },
  {
    id: 'fibre.carbon-continuous', family: 'printing material', label: 'Continuous carbon fibre (for fibre-reinforced printing)', source: COMPOSITES,
    specs: { tensileStrength: 800e6, tensileModulus: 60e9, strainAtBreak: 0.015, flexStrength: 540e6, flexModulus: 51e9, density: 1400 },
    tags: ['carbon fiber', 'continuous fiber', 'composite', 'printing', 'reinforcement'],
  },
  {
    id: 'fibre.carbon-continuous-fr', family: 'printing material', label: 'Continuous carbon fibre, flame retardant', source: COMPOSITES,
    specs: { tensileStrength: 760e6, tensileModulus: 57e9, strainAtBreak: 0.016, flexStrength: 540e6, flexModulus: 50e9 },
    tags: ['carbon fiber', 'flame retardant', 'continuous fiber', 'composite', 'printing'],
  },
];

export const machineById = (id: string) => MACHINES.find((m) => m.id === id);

/** A machine's breakdown as an indented outline, each node marked published (with its source) or not. */
export function breakdown(m: Machine): string[] {
  const out: string[] = [`${m.label}: ${m.does}`];
  const walk = (nodes: AssemblyNode[], depth: number) => {
    for (const n of nodes) {
      out.push(`${'  '.repeat(depth)}- ${n.name}: ${n.is}${n.published ? '' : ' [not published]'}`);
      if (n.children) walk(n.children, depth + 1);
    }
  };
  walk(m.tree, 1);
  return out;
}

/** Every node of a machine, flattened. */
export function nodesOf(m: Machine): AssemblyNode[] {
  const out: AssemblyNode[] = [];
  const walk = (ns: AssemblyNode[]) => { for (const n of ns) { out.push(n); if (n.children) walk(n.children); } };
  walk(m.tree);
  return out;
}

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
  maker: string;
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

export const MACHINES: Machine[] = [
  {
    id: 'markforged.fx10', label: 'Markforged FX10 industrial composite (and metal) 3D printer', maker: 'Markforged',
    does: 'Prints nylon composite parts reinforced with continuous fibre (CFF), and with its Metal Kit, bound-metal parts that are washed and sintered to steel.',
    specs: {
      buildX: 0.375, buildY: 0.3, buildZ: 0.3, layerMin: 125e-6, layerMax: 250e-6, metalLayerAfterSinter: 127e-6, chamberMax: 333.15,
      width: 0.76, depth: 0.64, height: 1.2, massLow: 109, massHigh: 122, power: '100-120 VAC 12/15 A or 200-240 VAC 6/8 A',
      speed: 'about twice the X7 (and four times the Mark Two), per Markforged',
    },
    price: { amount: 99990, currency: 'USD', seen: '2026-10', note: 'list price (MatterHackers listing), composite configuration' },
    source: FX10,
    runs: ['cff', 'metal.fff'], feeds: ['markforged.onyx', 'markforged.cf', 'markforged.cf-fr'],
    tags: ['3d printer', 'printer', 'composite', 'carbon fiber', 'metal', 'additive', 'markforged', 'fx10'],
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
        name: 'Software: Eiger and the Digital Forge', is: 'Slices parts, routes fibre, scales metal parts for sinter shrinkage, and manages a fleet of printers.', published: true, source: FX10,
      },
    ],
  },
];

/** What the FX10 prints with, from Markforged's composites datasheet (ASTM test results, SI). */
export const PRINTING_MATERIALS: CatalogItem[] = [
  {
    id: 'markforged.onyx', family: 'printing material', label: 'Markforged Onyx (micro carbon fibre filled nylon)', source: COMPOSITES,
    specs: { tensileModulus: 2.4e9, tensileYield: 40e6, tensileBreak: 37e6, flexStrength: 71e6, flexModulus: 3.0e9, heatDeflection: 418.15, density: 1200, izodNotched: 330 },
    tags: ['onyx', 'nylon', 'composite', 'printing', 'filament', 'matrix'],
  },
  {
    id: 'markforged.cf', family: 'printing material', label: 'Markforged continuous carbon fibre (CFR)', source: COMPOSITES,
    specs: { tensileStrength: 800e6, tensileModulus: 60e9, strainAtBreak: 0.015, flexStrength: 540e6, flexModulus: 51e9, density: 1400 },
    tags: ['carbon fiber', 'continuous fiber', 'composite', 'printing', 'reinforcement'],
  },
  {
    id: 'markforged.cf-fr', family: 'printing material', label: 'Markforged continuous carbon fibre FR (flame retardant)', source: COMPOSITES,
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

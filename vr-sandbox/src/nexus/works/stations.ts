// The machines, what each costs, and what a set of them adds up to.
//
// A station is a machine or a bench with the processes it does, the tolerance it holds where that differs from its
// process's class, the biggest part it takes, what it costs, the floor and power it wants, and — the line that
// earns its place on the list — what it makes possible that nothing cheaper does.
//
// Three prices, in order of increasing work and decreasing money: new, secondhand, and made here. A self-build
// carries the stations it needs first, which is what makes the order of buying matter: the welder comes before the
// forge not because it is better but because the forge is welded.
//
// Owner of: the stations, their prices, how a station is come by, the illustrative works sizes (`TIERS`), and what
// a set of stations covers. Choosing a set to fit a budget is `budget.ts`.

import { cheapest } from '../parts/prices';
import { FAMILIES, processById, type Family, type MatClass, type Need, type Process } from './families';

export interface Station {
  id: string; name: string;
  /** the processes it does */ does: string[];
  /** what it holds, ± mm, where it is better or worse than its process's class */ tol?: number;
  /** the biggest part it works, mm */ envelope?: [number, number, number];
  /** what it costs: a key in prices.ts, else the money itself with where it came from */ price?: string; usd?: number; from?: string;
  /** the floor it wants with room to stand at it, m² */ floor: number;
  /** what it draws when it is working, kW */ kw: number;
  needs: Need[];
  /** what the same capability costs secondhand: an estimate of that market, which moves */ used?: { usd: number; src: string };
  /** this works building the station itself: the material, the hours, and the stations it needs first. Where a station
   *  has one, the cheapest way to have it is to make it — at the price of weeks instead of an afternoon. */
  selfBuild?: { usd: number; hours: number; needs: string[]; how: string };
  /** what it makes possible that nothing cheaper does: why it is on the list at all */ why: string;
}
/** How a station was come by. The order is the order of increasing work and decreasing money. */
export type Buying = 'new' | 'used' | 'build';

export const STATIONS: Station[] = [
  { id: 'bench', name: 'a bench, a vice and hand tools', does: ['saw', 'drill', 'fasten', 'bond', 'calliper', 'weigh'], tol: 0.5, envelope: [1600, 800, 600], usd: 300, from: 'a solid bench, a 100 mm vice, files, taps, a hacksaw and a cordless drill (an estimate of the whole)', floor: 3, kw: 0.5, needs: ['power'],
    used: { usd: 120, src: 'a secondhand bench and a secondhand 100 mm vice with the taps and files bought new (an estimate of that market)' },
    selfBuild: { usd: 95, hours: 6, needs: ['welder'], how: 'the welded bench this engine already plans (BUILDS.workbench): about 11 m of 40 \u00d7 40 \u00d7 2 box section and a sheet of 25 mm ply, welded and bolted. The first thing a works makes is the thing it stands on, and it is the cheapest proof that the welder works' },
    why: 'everything else is held, marked, drilled and finished here. A works without a bench is a pile of machines' },
  { id: 'measuring', name: 'callipers, a micrometer, an indicator and a surface plate', does: ['calliper', 'indicate', 'weigh'], usd: 180, from: 'a 150 mm digital calliper, a 0–25 mm micrometer, a 0.01 mm indicator on a magnetic base and a small granite plate (an estimate of the set)', floor: 0.3, kw: 0, needs: [],
    used: { usd: 95, src: 'a secondhand micrometer and a secondhand granite plate with the calliper and indicator bought new (an estimate of that market; a plate is the one measuring tool that does not wear out, so used is as good as new unless it has been dropped)' },
    why: 'the loop closer. Nothing else here makes the works better over time; this does, and it is the cheapest thing on the list' },
  { id: 'printer-fff', name: 'an FFF 3D printer', does: ['fff'], envelope: [220, 220, 250], price: 'printer-fff', floor: 1.5, kw: 0.35, needs: ['power'],
    used: { usd: 100, src: 'a secondhand Ender-3 class machine, which the market is full of because people buy one, print twenty things and stop (an estimate of that market)' },
    why: 'not mainly for finished parts: for the fixtures, jigs, soft jaws, moulds, bucks and patterns every other station needs. It is the station that makes the other stations usable' },
  { id: 'printer-msla', name: 'a resin printer with its wash-and-cure', does: ['msla', 'cure'], envelope: [218, 123, 235], usd: 400, from: 'a mid-size MSLA machine with its wash-and-cure station (an estimate of the class)', floor: 1, kw: 0.2, needs: ['power', 'vent'],
    why: 'the only cheap way to 50 µm features: patterns for casting, and anything small a 0.4 mm nozzle cannot say' },
  { id: 'cnc-benchtop', name: 'a benchtop CNC', does: ['mill', 'drill', 'probe'], tol: 0.1, envelope: [300, 180, 45], price: 'cnc-benchtop', floor: 2, kw: 0.3, needs: ['power', 'extraction'],
    used: { usd: 90, src: 'a secondhand 3018 (an estimate of that market)' },
    selfBuild: { usd: 190, hours: 30, needs: ['printer-fff', 'bench'], how: 'a printed-frame router on bought rails: 3 \u00d7 SBR12 or 2 \u00d7 MGN12 (about $70), three NEMA 17s ($30), a board ($45), a 500 W spindle ($25), plates and fasteners ($20). It costs more money than the $149 kit and thirty hours on top, so the engine does not take it \u2014 it is here because knowing that is worth more than guessing it' },
    why: 'the first machine that makes a flat face, a bored hole and a true edge. A printer does none of the three, and every fit in a machine depends on them' },
  { id: 'mill-knee', name: 'a knee mill or a used machining centre', does: ['mill', 'drill', 'probe'], tol: 0.02, envelope: [600, 300, 400], usd: 4000, from: 'a used benchtop or knee mill in working order (an estimate; a working secondhand market, not a list price)', floor: 6, kw: 2.5, needs: ['3-phase', 'extraction'],
    why: 'where the benchtop machine stops: steel, depth of cut, and a tolerance that will hold a bearing' },
  { id: 'lathe', name: 'a lathe', does: ['turn', 'drill'], tol: 0.025, envelope: [300, 150, 150], usd: 1200, from: 'a 7 × 14 to 9 × 20 benchtop lathe (an estimate of the class)', floor: 4, kw: 0.75, needs: ['power'],
    why: 'anything round and anything threaded: shafts, spacers, bushes, adapters — the parts a printer gets wrong and a mill does slowly' },
  { id: 'welder', name: 'a flux-core or MIG welder', does: ['weld-mig'], price: 'welder-fluxcore', floor: 4, kw: 4, needs: ['power', 'extraction'],
    used: { usd: 80, src: 'a secondhand 120 V flux-core machine, or an old stick welder, which is the cheapest arc there is (an estimate of that market)' },
    why: 'the cheapest way to make a steel frame that is one piece. Everything structural above table size is welded' },
  { id: 'spot-welder', name: 'a resistance spot welder', does: ['spot-weld'], usd: 250, from: 'a 2 kVA bench spot welder (an estimate of the class)', floor: 1, kw: 2, needs: ['power'],
    why: 'sheet-metal boxes, brackets and battery tabs in a second a joint, with no fume and no filler' },
  { id: 'soldering', name: 'the soldering bench', does: ['solder', 'calliper'], price: 'soldering-iron', floor: 1.5, kw: 0.1, needs: ['extraction'],
    why: 'every machine here is run by a board, and a board that cannot be repaired is a machine that is thrown away. The library teaches this one by hand already' },
  { id: 'forge', name: 'a propane forge and an anvil', does: ['forge', 'heat-treat', 'braze'], usd: 350, from: 'a two-burner propane forge, a 50 kg anvil and tongs (an estimate of the set)', floor: 6, kw: 0, needs: ['gas', 'extraction'],
    used: { usd: 180, src: 'a secondhand propane forge, usually sold with the anvil (an estimate of that market)' },
    selfBuild: { usd: 130, hours: 8, needs: ['welder', 'bench'], how: 'a 200 mm steel tube or an empty 20 lb propane tank lined with 50 mm of ceramic wool, rigidized and coated with a refractory; the burner is black-iron pipe fittings with a 0.035 in MIG contact tip as the orifice \u2014 the naturally aspirated pattern every amateur forge uses, because it needs no blower and no electricity. The anvil is a length of 100 mm square bar stood on end, which works better than a cheap cast one' },
    why: 'it hardens what the mill cut, brazes what cannot be welded, and forms steel in a way no cutting matches — the grain follows the shape' },
  { id: 'foundry', name: 'a crucible furnace', does: ['cast'], envelope: [250, 250, 200], usd: 400, from: 'a propane crucible furnace, crucible, tongs and flask gear (an estimate of the set; cell.ts models the lost-PLA route it runs)', floor: 6, kw: 0, needs: ['gas', 'extraction'],
    used: { usd: 220, src: 'a secondhand crucible furnace with its crucible (an estimate of that market)' },
    selfBuild: { usd: 120, hours: 6, needs: ['forge'], how: 'the same burner in a steel pail lined with 50 mm of refractory. The crucible is bought ($35 for a #6 clay-graphite) because a home-made one fails with 3 kg of molten aluminium in it; the tongs, the lifting ring and the flask are made. This is the station that pays for the whole works: it turns printed patterns and scrap into castings' },
    why: 'it turns a printed pattern into an aluminium or brass part overnight. With the printer it is the cheapest metal part there is' },
  { id: 'wheel', name: 'a potter\'s wheel and clay tools', does: ['throw'], envelope: [350, 350, 400], usd: 500, from: 'an electric wheel with a 300 mm head, bats, ribs and a wire (an estimate of the set)', floor: 2, kw: 0.25, needs: ['power', 'water'],
    used: { usd: 180, src: 'a secondhand electric wheel (an estimate of that market)' },
    selfBuild: { usd: 90, hours: 10, needs: ['bench', 'welder'], how: 'a welded frame, a plywood-and-plaster head on a bought shaft and two bearings, driven by a washing-machine motor and its speed board. The one part that must be bought is the bearing pair, for the reason the whole file keeps giving' },
    why: 'the cheapest station in the building that makes a finished hollow form in two minutes, and the only one whose material costs nothing to try again' },
  { id: 'kiln', name: 'a kiln', does: ['kiln'], envelope: [580, 580, 680], usd: 2200, from: 'Skutt\'s KM-1027 class (its sellers\' listings; drawn as the kind `kiln Skutt-KM1027`)', floor: 2.5, kw: 11.5, needs: ['3-phase', 'vent'],
    why: 'clay, glass and every ceramic; and the same heat anneals and stress-relieves metal' },
  { id: 'laser-co2', name: 'a CO₂ laser cutter', does: ['laser-co2'], envelope: [600, 400, 10], usd: 2500, from: 'a 60 to 100 W enclosed machine with its chiller and extraction (an estimate of the class)', floor: 5, kw: 2, needs: ['power', 'extraction', 'water'],
    why: 'flat parts out of ply and acrylic in minutes: enclosures, panels, jigs and templates for everything else' },
  { id: 'laser-fibre', name: 'a fibre laser cutter', does: ['laser-fibre'], envelope: [1500, 3000, 12], usd: 60000, from: 'a 1.5 kW enclosed sheet machine with its chiller, extraction and nitrogen (an estimate of the class; makers sell by quote)', floor: 40, kw: 20, needs: ['3-phase', 'gas', 'extraction'],
    why: 'flat steel and aluminium cut accurately and fast: it replaces sawing, filing and most drilling on anything made of sheet' },
  { id: 'fuser', name: 'a laser powder-bed fuser', does: ['pbf'], envelope: [250, 250, 325], usd: 700000, from: 'an EOS M 290 class machine, installed (an estimate: EOS sells by quote; drawn as `pbf EOS-M290`)', floor: 30, kw: 12, needs: ['3-phase', 'gas', 'extraction'],
    why: 'metal parts no other process can make: internal channels, lattices, one piece where there were twenty. Also the most expensive way to be wrong' },
  { id: 'sinter-furnace', name: 'a debind-and-sinter furnace', does: ['sinter'], envelope: [200, 200, 200], usd: 120000, from: 'a catalytic debinder and a hydrogen retort furnace (an estimate; Elnik and DSH sell by quote, and both sell the same thing as a service)', floor: 12, kw: 20, needs: ['3-phase', 'gas', 'vent'],
    why: 'what turns a bound-metal print into metal. Almost always bought as a service instead, which is why bound metal is cheap and this line is here to be skipped' },
  { id: 'concrete-gantry', name: 'a concrete-printing gantry and pump', does: ['concrete-print'], envelope: [6000, 6000, 3000], usd: 180000, from: 'a gantry, a pump and a mixer at building scale (an estimate; makers sell by project)', floor: 60, kw: 25, needs: ['3-phase', 'water'],
    why: 'only if the output is buildings. The gantry is the same gantry as any other: what is new is the pump and the mix' },
  { id: 'arm', name: 'a six-axis arm', does: ['fasten', 'bond', 'vision', 'weld-mig', 'solder'], tol: 0.1, envelope: [850, 850, 850], usd: 30000, from: 'a UR5e-class collaborative arm with its controller (an estimate: Universal Robots sells through distributors; modelled in dharm.ts)', floor: 4, kw: 0.5, needs: ['power'],
    why: 'it adds no process. It repeats one, unattended, at three in the morning. Buy it when a job repeats, never to do a job once' },
  { id: 'rail', name: 'a linear track under the arm', does: [], envelope: [3000, 0, 0], usd: 6000, from: 'a 3 m seventh axis: rail, rack, servo, drag chain and drive (an estimate of the class)', floor: 6, kw: 0.4, needs: ['power'],
    why: 'reach, at a fraction of another arm. An arm reaches 0.85 m; three metres of track costs a fifth of a second arm and turns one arm into a line of stations' },
  { id: 'amr', name: 'a mobile robot', does: [], usd: 18000, from: 'a small autonomous mobile robot with its charger and map (an estimate of the class)', floor: 2, kw: 0.3, needs: ['power'],
    why: 'it moves material between cells, never work within one: it docks to about ±10 mm where an arm repeats to ±0.03, so what it carries is located again when it arrives' },
  { id: 'computer', name: 'a computer, the code and the Bluetooth bridge', does: [], usd: 155, from: 'a used business mini PC that runs a slicer, a CAM post and a Klipper or LinuxCNC host (about $150 secondhand \u2014 an estimate of that market) plus a XIAO ESP32C3 at $4.99 (Seeed\'s own price) as the BLE-UART bridge. A laptop already owned makes this line $5; a new workstation makes it $600', floor: 1, kw: 0.2, needs: ['power'],
    why: 'every station above takes G-code, a program or a recipe; the same computer writes all of them, and the $5 bridge is what carries them to the machine (link.ts). It is the cheapest line on the list and the one that makes the works remote-controllable at all' },
  { id: 'safety', name: 'the safety kit and extraction', does: [], usd: 250, from: 'a shade-10 auto-darkening welding helmet, a P100 half mask with organic-vapour cartridges, welding gloves and a leather apron, safety glasses, a 2 kg ABC extinguisher, a fire blanket, a burn kit, and a 100 mm inline fan with ducting to take fume out at the work (an estimate of the set)', floor: 1, kw: 0.1, needs: ['power'],
    why: 'it buys no capability and it is not optional. Half the processes on this list carry a hazard that takes an eye, a lung or a house, and a works that owns a welder and not a helmet is not cheaper \u2014 it is unbuilt. The engine adds this line by itself the moment a hazardous station is chosen' },
  { id: 'lathe-mini', name: 'a mini lathe', does: ['turn', 'drill'], tol: 0.05, envelope: [250, 90, 90], price: 'lathe-mini', floor: 2.5, kw: 0.37, needs: ['power'],
    used: { usd: 400, src: 'a secondhand 7 \u00d7 10 or 7 \u00d7 12, of which there are many, usually barely used and usually needing its gibs and its cross-slide nut adjusted (an estimate of that market)' },
    why: 'the cheapest machine on any shelf that makes a round part: a shaft, a bush, a spacer, a bore a bearing will sit in. It holds about \u00b10.05 mm rather than the \u00b10.025 of a bigger lathe, which is still inside a bearing\'s own fit, and its 180 mm swing is the real limit' },
  { id: 'lathe-scrap', name: 'a lathe cast and built here', does: ['turn', 'drill'], tol: 0.1, envelope: [250, 90, 90], usd: 0,
    selfBuild: { usd: 120, hours: 160, needs: ['foundry', 'bench', 'drill-press'], how: 'Gingery\'s route (Build Your Own Metal Working Shop From Scrap, 1980): the bed, headstock, tailstock and carriage cast in aluminium in oil-bonded sand from scrap, then scraped and fitted using the castings themselves as the reference surface. The material is scrap and about $120 of sand, bearings and fasteners; the cost is four to six weeks of evenings' },
    from: 'nothing sells it: it is only ever built, so its new price is zero and its real price is 160 hours',
    floor: 2.5, kw: 0.37, needs: ['power'],
    why: 'the cheapest round part in the world, and the most work. It holds about \u00b10.1 mm rather than the \u00b10.05 of a bought mini lathe \u2014 enough for a bush or a spacer, not enough for a bearing seat \u2014 and it is the only station here a works can make before it can buy' },
  { id: 'drill-press', name: 'a bench drill press', does: ['drill'], tol: 0.15, envelope: [400, 300, 200], usd: 150, from: 'a 5-speed 250 mm bench drill press (an estimate of the class)', floor: 1.5, kw: 0.37, needs: ['power'],
    used: { usd: 60, src: 'a secondhand bench drill press, of which there are more than there are buyers (an estimate of that market)' },
    why: 'a hole square to the face, which a hand drill never is and a 300 mm router cannot reach. The most-used machine in a metal shop and nearly the cheapest' },
  { id: 'brake', name: 'a sheet-metal brake and shear', does: ['bend', 'press'], tol: 0.5, envelope: [760, 400, 1.6], usd: 260, from: 'a 760 mm bench brake with a shear (an estimate of the class)', floor: 2, kw: 0, needs: [],
    selfBuild: { usd: 60, hours: 5, needs: ['welder', 'bench'], how: 'two 600 mm lengths of 50 \u00d7 50 \u00d7 6 angle bolted along a hinge line with a bending leaf and a handle: it bends 1.6 mm steel and 2 mm aluminium over 600 mm, which is everything a cheap works makes out of sheet' },
    why: 'the only station here that covers forming without heat: a bent flange is stiffer than a flat plate twice its thickness, which is why everything mass-made out of sheet is bent rather than thickened' },
  { id: 'kiln-small', name: 'a small test kiln', does: ['kiln'], envelope: [200, 200, 230], usd: 700, from: 'a 0.5 ft\u00b3 120 V test kiln reaching cone 6 (an estimate of the class; the full-size KM-1027 above is $2,200 and wants three-phase)', floor: 1, kw: 1.8, needs: ['power', 'vent'],
    used: { usd: 250, src: 'a secondhand hobby kiln, which are sold cheap because people are afraid of the wiring (an estimate of that market)' },
    selfBuild: { usd: 180, hours: 20, needs: ['bench', 'soldering', 'safety'], how: 'a box of insulating firebrick laid dry in an angle-iron frame, with Kanthal A1 element wire in grooves cut with a router bit, a PID controller, a solid-state relay on a heatsink and a type-K thermocouple (about $60 of the total). It is a real build and a real fire risk \u2014 1.8 kW inside a brick box on a wooden floor \u2014 so the engine will not count it until the safety kit is in' },
    why: 'it brings clay and glass inside a small budget at a tenth of the floor and a sixth of the power of a studio kiln. What it costs is size: a mug fits, a dinner service does not' },
];
export const stationById = (id: string): Station => { const s = STATIONS.find((q) => q.id === id); if (!s) throw new Error(`no station ${id}`); return s; };
/** What a station costs new today: its price key's cheapest real offer where it has one, else the figure it carries. */
export function stationUsd(s: Station): number { if (s.price) { const c = cheapest(s.price); if (c) return c.usd; } return s.usd ?? 0; }

/** The cheapest way to have a station, given what the works already has and how much work is acceptable. `build` takes
 *  the least of new, used and made-here; `used` the least of new and used; `new` only the new price. A self-build only
 *  counts when the stations it needs are already had, which is what makes the order of buying matter: the welder comes
 *  before the forge not because it is better but because the forge is welded. */
export function stationCost(s: Station, have: string[] = [], prefer: Buying = 'new'): { usd: number; as: Buying; hours: number; says: string } {
  // a station with no new price is not free: nobody sells it, so buying new is not one of the ways
  const ways = stationUsd(s) > 0 ? [{ usd: stationUsd(s), as: 'new' as Buying, hours: 0, says: s.from ?? 'its price key\'s cheapest offer' }] : [];
  if (prefer !== 'new' && s.used) ways.push({ usd: s.used.usd, as: 'used' as Buying, hours: 1, says: s.used.src });
  if (prefer === 'build' && s.selfBuild && s.selfBuild.needs.every((n) => have.includes(n))) ways.push({ usd: s.selfBuild.usd, as: 'build' as Buying, hours: s.selfBuild.hours, says: s.selfBuild.how });
  if (!ways.length) return { usd: Infinity, as: 'new', hours: 0, says: `nothing sells ${s.name} and this works cannot build it yet${s.selfBuild ? `: it wants ${s.selfBuild.needs.join(', ')} first` : ''}` };
  return ways.sort((a, b) => a.usd - b.usd)[0]!;
}

export interface Works { id: string; name: string; stations: string[]; says: string }
/** Works from the cheapest up, each the one before it plus a capability — so the list reads as the order to buy in.
 *  They are a convenience for saying "a works this size"; the engine itself takes any set of station ids. */
export const TIERS: Works[] = [
  { id: 'bench', name: 'the bench', stations: ['bench', 'measuring', 'soldering', 'computer'],
    says: 'joining, cutting by hand, and measuring. It makes nothing to a tolerance, but it repairs everything, and it is where every other station is worked from' },
  { id: 'shop', name: 'the plastic shop', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'cnc-benchtop'],
    says: 'adding, cutting, joining and measuring — four of the six. The printer makes the shapes and the fixtures, the CNC the flat faces and bored holes a printer cannot, the callipers close the loop. Nothing here forms metal and nothing here treats anything, so it works plastic and wood and only cuts metal; it is still the cheapest thing that can honestly be called a works' },
  { id: 'metal', name: 'the metal shop', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'cnc-benchtop', 'lathe', 'welder', 'forge', 'foundry'],
    says: 'all six families over metal as well as plastic: cast from printed patterns, turned, welded into frames, hardened in the forge. From here a works can make most of its own next machine' },
  { id: 'works', name: 'the works', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'printer-msla', 'cnc-benchtop', 'mill-knee', 'lathe', 'welder', 'spot-welder', 'forge', 'foundry', 'wheel', 'kiln', 'laser-co2', 'arm', 'rail'],
    says: 'the same six families with the tolerance raised to ±0.02, flat stock cut by light, clay thrown and fired, and one arm on a track to repeat whatever repeats' },
  { id: 'plant', name: 'the plant', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'printer-msla', 'cnc-benchtop', 'mill-knee', 'lathe', 'welder', 'spot-welder', 'forge', 'foundry', 'wheel', 'kiln', 'laser-co2', 'laser-fibre', 'fuser', 'sinter-furnace', 'concrete-gantry', 'arm', 'rail', 'amr'],
    says: 'metal printed as well as cut, sintered in-house instead of sent out, flat metal cut by light, concrete printed, material carried by a mobile robot. It adds reach no amount of hand work replaces, and a great deal of throughput' },
];


export interface WorksSum {
  stations: Station[]; usd: number; floor: number; kw: number;
  needs: Need[]; families: Family[]; missing: Family[];
  /** the classes it can actually make something out of — not the ones it can measure, which is every class a
   *  calliper touches and would make the list a lie */ materials: MatClass[];
  /** the finest a making process here holds, ± mm */ tol: number;
  /** the finest it can measure, ± mm, which is a different and usually smaller number */ measureTol: number;
  envelope: [number, number, number];
}
/** What a set of stations adds up to: money, floor, power, what it must be given, the families it covers and does not. */
export function worksOf(ids: string[]): WorksSum {
  const stations = ids.map(stationById);
  const procs = [...new Set(stations.flatMap((s) => s.does))].map(processById);
  const families = [...new Set(procs.map((p) => p.family))];
  const at = (f: (p: Process) => boolean) => stations.flatMap((s) => s.does.map(processById).filter(f).map((p) => s.tol ?? p.tol));
  const tols = at((p) => p.family !== 'measure'), mtols = at((p) => p.family === 'measure');
  const env = stations.map((s) => s.envelope).filter((e): e is [number, number, number] => !!e);
  return { stations, usd: +stations.reduce((a, s) => a + stationUsd(s), 0).toFixed(2),
    floor: +stations.reduce((a, s) => a + s.floor, 0).toFixed(1), kw: +stations.reduce((a, s) => a + s.kw, 0).toFixed(2),
    needs: [...new Set(stations.flatMap((s) => s.needs))],
    families, missing: FAMILIES.map((f) => f.id).filter((f) => !families.includes(f)),
    materials: [...new Set(procs.filter((p) => p.family !== 'measure').flatMap((p) => p.on))],
    tol: tols.length ? Math.min(...tols) : Infinity, measureTol: mtols.length ? Math.min(...mtols) : Infinity,
    envelope: env.length ? [Math.max(...env.map((e) => e[0])), Math.max(...env.map((e) => e[1])), Math.max(...env.map((e) => e[2]))] : [0, 0, 0] };
}

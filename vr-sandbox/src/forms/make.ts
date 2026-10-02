// What can make a form, and why. A shape is only real if something can make it (rule R11), so every form is read
// for the processes that could: a stock section cut to length is sawn; a shape turned about one axis is turned on a
// lathe; a profile pushed straight with holes and pockets along that direction is milled; stock pieces joined are
// welded; anything else (a lattice, a blend, an inner void, an aerofoil twisted along its span) is printed, if it
// fits the printer, its walls are thick enough for the nozzle, and its overhangs are supported. Each answer says
// which process, in which materials, and why not where it can't.

import { bounds, traits, walls, type Form } from './form';
import { overhangs, solid } from './mesh';
import { PROCESSES } from '../ganglia/processes';
import { machineById } from '../ganglia/machines';
import { getMaterial } from '../data/materials';

export interface Route { process: string; can: boolean; why: string; materials: string[] }

/** The thinnest wall a fused-filament printer lays reliably: about two extrusion widths of a 0.4 mm nozzle. */
export const PRINT_MIN_WALL = 0.8e-3;

const axisymmetric = (f: Form): boolean => {
  switch (f.f) {
    case 'sphere': case 'cylinder': case 'torus': case 'capsule': case 'cone': case 'revolve': return true;
    case 'union': case 'intersect': case 'blend': return f.of.every(axisymmetric);
    case 'subtract': return axisymmetric(f.from) && f.take.every(axisymmetric);
    case 'shell': case 'offset': case 'scale': return axisymmetric(f.of);
    case 'move': return !f.q && (f.p ?? [0, 0, 0])[0] === 0 && (f.p ?? [0, 0, 0])[2] === 0 && axisymmetric(f.of);
    case 'mirror': return f.axis === 1 && axisymmetric(f.of);
    default: return false;
  }
};

const QUARTER = (q: [number, number, number, number]) => q.every((x) => [0, 0.5, 1, Math.SQRT1_2].some((v) => Math.abs(Math.abs(x) - v) < 1e-6));

/** Prismatic along some axis: profiles, blocks and holes, turned only by quarter turns (what a 3-axis mill reaches from a side or two). */
const prismatic = (f: Form): boolean => {
  switch (f.f) {
    case 'box': case 'cylinder': case 'extrude': return true;
    case 'union': case 'intersect': return f.of.every(prismatic);
    case 'subtract': return prismatic(f.from) && f.take.every(prismatic);
    case 'offset': case 'scale': case 'mirror': case 'array': return prismatic(f.of);
    case 'move': return (!f.q || QUARTER(f.q)) && prismatic(f.of);
    default: return false;
  }
};

const STOCK_SECTIONS = new Set(['circle', 'rect', 'ring']);
/** Stock: a bar, tube or flat of a standard section, cut to length (moved or turned as a whole). */
const stock = (f: Form): boolean => (f.f === 'extrude' && STOCK_SECTIONS.has(f.sec.s)) || f.f === 'box' || f.f === 'cylinder' || (f.f === 'move' && stock(f.of));
/** Stock pieces joined: a weldment. */
const weldment = (f: Form): boolean => f.f === 'union' && f.of.every((g) => stock(g) || weldment(g));

/** Every process that could make the form, best first, with why or why not. */
export function routes(f: Form): Route[] {
  const t = traits(f);
  const [lo, hi] = bounds(f);
  const ext = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  const mats = (pid: string) => PROCESSES.find((p) => p.id === pid)?.materials ?? [];
  const out: Route[] = [];
  out.push(stock(f)
    ? { process: 'saw', can: true, why: 'a standard section cut to length', materials: mats('saw') }
    : { process: 'saw', can: false, why: 'it isn\'t a stock section cut to length', materials: [] });
  out.push(weldment(f)
    ? { process: 'weld.mig', can: true, why: 'stock pieces cut and welded together', materials: mats('weld.mig') }
    : { process: 'weld.mig', can: false, why: 'it isn\'t stock pieces joined', materials: [] });
  out.push(axisymmetric(f)
    ? { process: 'turn', can: true, why: 'every face is turned about one axis', materials: mats('turn') }
    : { process: 'turn', can: false, why: 'it isn\'t round about one axis', materials: [] });
  out.push(prismatic(f) && !t.has('lattice') && !t.has('blend')
    ? { process: 'mill', can: true, why: 'profiles, faces and holes square to its sides, reachable by a cutter', materials: mats('mill') }
    : { process: 'mill', can: false, why: t.has('lattice') ? 'a lattice is closed inside: no cutter reaches it' : t.has('blend') ? 'its blended surfaces need a 5-axis machine I don\'t have' : 'it has faces a 3-axis cutter can\'t reach', materials: [] });
  // printing: the build volume, the thinnest wall, the overhangs
  const printer = machineById('printer.cff-composite');
  const build = printer ? [Number(printer.specs['buildX']), Number(printer.specs['buildY']), Number(printer.specs['buildZ'])] : [0, 0, 0];
  const sortedExt = [...ext].sort((a, b) => b - a), sortedBuild = [...build].sort((a, b) => b - a);
  const fits = sortedExt.every((e, i) => e <= sortedBuild[i]! + 1e-9);
  const thin = Math.min(...walls(f), Infinity);
  const s = solid(f, 40, 400_000);
  const best = overhangs(s.mesh)[0]!;
  const support = best.share > 0.02 ? `, ${(best.share * 100).toFixed(0)}% of it overhanging even printed ${best.up} up (it needs supports there)` : `, printed ${best.up} up with nothing overhanging`;
  const printWhy = !fits ? `it is ${ext.map((e) => (e * 1000).toFixed(0)).join(' × ')} mm, past the printer's ${build.map((b) => (b * 1000).toFixed(0)).join(' × ')} mm`
    : thin < PRINT_MIN_WALL ? `its thinnest wall is ${(thin * 1000).toFixed(2)} mm, under the ${PRINT_MIN_WALL * 1000} mm a nozzle lays reliably`
      : `it fits the printer, its walls are thick enough${support}`;
  const printable = fits && thin >= PRINT_MIN_WALL;
  out.push({ process: 'cff', can: printable, why: printWhy, materials: printable ? mats('cff') : [] });
  out.push({ process: 'metal.fff', can: printable, why: printable ? `${printWhy}; printed about 20% oversize and sintered down to size (sinter scale-up)` : printWhy, materials: printable ? mats('metal.fff') : [] });
  // the conventional route first where there is one: cheaper and stronger than printing
  const order = ['saw', 'weld.mig', 'turn', 'mill', 'metal.fff', 'cff'];
  return out.sort((a, b) => Number(b.can) - Number(a.can) || order.indexOf(a.process) - order.indexOf(b.process));
}

/** Can this form be made in this material, and how: the first route that works it, or why none does. */
export function makeIn(f: Form, material: string): { can: boolean; process?: string; why: string } {
  const m = getMaterial(material);
  const rs = routes(f);
  const ok = rs.find((r) => r.can && r.materials.includes(m.category));
  if (ok) return { can: true, process: ok.process, why: `${PROCESSES.find((p) => p.id === ok.process)?.name ?? ok.process}: ${ok.why}` };
  const any = rs.filter((r) => r.can);
  return { can: false, why: any.length ? `${any.map((r) => r.process).join(', ')} could make the shape, but not in ${m.name.toLowerCase()}` : rs.map((r) => `${r.process}: ${r.why}`).join('; ') };
}

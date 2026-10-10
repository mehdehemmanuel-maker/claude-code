// Custom parts made from a file by someone who makes them for a living, and which way is cheapest within what you have.
// A part here is a flat profile: an outline with its corners rounded and its holes, cut from a sheet so thick. That is
// what laser cutters, board makers and printers all take, and what most custom parts a person first needs are (a plate
// to hold boards, a bracket, a panel). The first one made is a mounting plate for boards, its holes each board's own
// pattern from its maker's drawing (src/nexus/kinds/sbc.ts), cleared for its screw by ISO 273's medium series, with a hole in
// each corner to screw the plate down.
//
// The files are the ones each service asks for: DXF (R12, in millimetres) for a laser cutter, STL for a printer, and for
// a board maker Gerber RS-274X layers (its outline on the edge-cuts layer, copper and mask layers empty) with an
// Excellon drill file, zipped. A plate made as a bare circuit board is the edge here: a board maker's prototype offer
// (JLCPCB's five boards up to 100 × 100 mm for $2) makes a drilled FR-4 plate cheaper than any cutter will.
// Costs are each service's own published terms where it publishes them; where it quotes only from the file, no figure
// is made up: it says so and gives the example it publishes.
// Owner of: custom parts as files, and the cheapest way to have one made (src/nexus/teach/buildpack.ts uses it).

import * as THREE from 'three';
import { strToU8, zipSync } from 'fflate';
import { boardDef, screwFor } from '../boards/sbc';

export interface Hole { x: number; y: number; d: number; why: string }
/** A flat part, mm: its outline L × W with corners of radius r, its holes, what is laid on it and where. */
export interface Profile { name: string; L: number; W: number; r: number; holes: Hole[]; on: { id: string; name: string; x: number; y: number; L: number; W: number; screw: string }[]; why: string }

/** ISO 273's medium-series clearance hole for a metric screw, mm. */
export const CLEAR: Record<string, number> = { M2: 2.4, 'M2.5': 2.9, M3: 3.4, M4: 4.5, M5: 5.5, M6: 6.6 };

/** A plate for these boards: laid side by side along it, so far apart and in from its edges, each drilled to its own
 *  pattern, and a hole in each corner (M3) to fix the plate by. */
export function plateFor(ids: string[], o: { gap?: number; margin?: number; corner?: string; fit?: [number, number] } = {}): Profile {
  const corner = o.corner ?? 'M3', bs = ids.map((id) => ({ id, b: boardDef(id) }));
  const size = (m: number, gap: number) => [bs.reduce((a, x) => a + x.b.L, 0) + gap * (bs.length - 1) + 2 * m, Math.max(...bs.map((x) => x.b.W)) + 2 * m] as const;
  // as roomy as asked; else, to fit a size that costs less (a board maker's $2 one), in to 6 mm and no less
  let m = o.margin ?? 10, gap = o.gap ?? 10, fitted = false;
  if (o.fit && !o.margin) for (let k = 10; k >= 6; k--) { const [l, w] = size(k, Math.min(gap, k)); if (l <= o.fit[0] && w <= o.fit[1]) { m = k; gap = Math.min(gap, k); fitted = k < 10; break; } }
  const [L, W] = size(m, gap);
  const holes: Hole[] = [], on: Profile['on'] = [];
  let x0 = m;
  for (const { id, b } of bs) {
    const y0 = (W - b.W) / 2, screw = screwFor(b.hole);
    on.push({ id, name: b.name, x: x0, y: y0, L: b.L, W: b.W, screw });
    for (const [hx, hy] of b.holes) holes.push({ x: +(x0 + hx).toFixed(3), y: +(y0 + hy).toFixed(3), d: CLEAR[screw]!, why: `${b.name}: ${screw} (its ${b.hole} mm hole, ${b.src.split(',')[0]})` });
    x0 += b.L + gap;
  }
  const c = 5, cd = CLEAR[corner]!;
  for (const [x, y] of [[c, c], [L - c, c], [c, W - c], [L - c, W - c]] as const) holes.push({ x, y, d: cd, why: `the plate's own ${corner} fixing hole` });
  return { name: `plate for ${bs.map((x) => x.b.name).join(' and ')}`, L: +L.toFixed(3), W: +W.toFixed(3), r: 3, holes, on, why: `holds the boards on standoffs, off whatever it is screwed to${fitted ? `; its edges brought in to ${m} mm so it fits ${o.fit![0]} × ${o.fit![1]} mm, the size a board maker makes five of for $2` : ''}` };
}

/** What would stop it being made as drawn: a hole into another, or nearer an edge than its own diameter (a web thinner
 *  than that tears or burns through when cut). */
export function profileFaults(p: Profile): string[] {
  const out: string[] = [];
  p.holes.forEach((h, i) => {
    const edge = Math.min(h.x, h.y, p.L - h.x, p.W - h.y) - h.d / 2;
    if (edge < h.d / 2) out.push(`${h.why} at (${h.x}, ${h.y}) leaves ${edge.toFixed(1)} mm to the edge`);
    p.holes.slice(i + 1).forEach((k) => { const web = Math.hypot(h.x - k.x, h.y - k.y) - (h.d + k.d) / 2; if (web < Math.min(h.d, k.d) / 2) out.push(`holes at (${h.x}, ${h.y}) and (${k.x}, ${k.y}) leave ${web.toFixed(1)} mm between them`); });
  });
  return out;
}

/** Its area, mm², and so its volume at a thickness. */
export const areaOf = (p: Profile): number => p.L * p.W - (4 - Math.PI) * p.r * p.r - p.holes.reduce((a, h) => a + (Math.PI * h.d * h.d) / 4, 0);

// ---- the files --------------------------------------------------------------------------------------------------------
/** The outline as points, its corners rounded, mm (counter-clockwise from the lower edge). */
function outline(p: Profile, seg = 8): [number, number][] {
  const { L, W, r } = p, pts: [number, number][] = [];
  const arc = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * (Math.PI / 2); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arc(L - r, r, -Math.PI / 2); arc(L - r, W - r, 0); arc(r, W - r, Math.PI / 2); arc(r, r, Math.PI);
  return pts;
}
const f = (x: number) => x.toFixed(4).replace(/\.?0+$/, '') || '0';

/** DXF, R12, in mm: the outline as lines and arcs on layer OUTLINE, each hole a circle on layer HOLES. */
export function dxf(p: Profile): string {
  const out: string[] = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
  const line = (x1: number, y1: number, x2: number, y2: number) => out.push('0', 'LINE', '8', 'OUTLINE', '10', f(x1), '20', f(y1), '30', '0', '11', f(x2), '21', f(y2), '31', '0');
  const arc = (cx: number, cy: number, a0: number, a1: number) => out.push('0', 'ARC', '8', 'OUTLINE', '10', f(cx), '20', f(cy), '30', '0', '40', f(p.r), '50', f(a0), '51', f(a1));
  const { L, W, r } = p;
  line(r, 0, L - r, 0); arc(L - r, r, 270, 360); line(L, r, L, W - r); arc(L - r, W - r, 0, 90); line(L - r, W, r, W); arc(r, W - r, 90, 180); line(0, W - r, 0, r); arc(r, r, 180, 270);
  for (const h of p.holes) out.push('0', 'CIRCLE', '8', 'HOLES', '10', f(h.x), '20', f(h.y), '30', '0', '40', f(h.d / 2));
  out.push('0', 'ENDSEC', '0', 'EOF');
  return `${out.join('\n')}\n`;
}

/** STL (ASCII, mm): the profile drawn through its thickness, its holes through it. */
export function stl(p: Profile, t: number): string {
  const shape = new THREE.Shape(outline(p, 12).map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of p.holes) { const hole = new THREE.Path(); hole.absarc(h.x, h.y, h.d / 2, 0, Math.PI * 2, true); shape.holes.push(hole); }
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 32 }), pos = g.getAttribute('position');
  const lines = [`solid ${p.name.replace(/\s+/g, '_')}`], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    lines.push(`facet normal ${f(n.x)} ${f(n.y)} ${f(n.z)}`, 'outer loop', ...[a, b, c].map((v) => `vertex ${f(v.x)} ${f(v.y)} ${f(v.z)}`), 'endloop', 'endfacet');
  }
  g.dispose(); lines.push(`endsolid ${p.name.replace(/\s+/g, '_')}`);
  return `${lines.join('\n')}\n`;
}

/** A board maker's files: Gerber RS-274X (X2 attributes), the outline drawn with a 0.1 mm line on the edge-cuts layer,
 *  both copper layers and both masks empty (so all mask, no copper), and an Excellon drill file of its holes (plated
 *  none). Named as KiCad names them, which every board maker reads. */
export function gerbers(p: Profile, base = 'plate'): Record<string, string> {
  const um = (x: number) => Math.round(x * 1e6);
  const head = (fn: string) => ['%TF.GenerationSoftware,Nexus,fab.ts,1*%', `%TF.FileFunction,${fn}*%`, '%FSLAX46Y46*%', '%MOMM*%', '%LPD*%'];
  const empty = (fn: string) => `${[...head(fn), 'M02*'].join('\n')}\n`;
  const pts = outline(p, 8), edge = [...head('Profile,NP'), '%ADD10C,0.100000*%', 'D10*', `X${um(pts[0]![0])}Y${um(pts[0]![1])}D02*`, ...[...pts.slice(1), pts[0]!].map(([x, y]) => `X${um(x)}Y${um(y)}D01*`), 'M02*'];
  const tools = [...new Set(p.holes.map((h) => h.d))].sort((x, y) => x - y);
  const drl = ['M48', '; DRILL file Nexus fab.ts', 'FMAT,2', 'METRIC', ...tools.map((d, i) => `T${i + 1}C${d.toFixed(3)}`), '%', 'G90', 'G05',
    ...tools.flatMap((d, i) => [`T${i + 1}`, ...p.holes.filter((h) => h.d === d).map((h) => `X${h.x.toFixed(3)}Y${h.y.toFixed(3)}`)]), 'M30'];
  return {
    [`${base}-Edge_Cuts.gm1`]: `${edge.join('\n')}\n`,
    [`${base}-F_Cu.gtl`]: empty('Copper,L1,Top'), [`${base}-B_Cu.gbl`]: empty('Copper,L2,Bot'),
    [`${base}-F_Mask.gts`]: empty('Soldermask,Top'), [`${base}-B_Mask.gbs`]: empty('Soldermask,Bot'),
    [`${base}-NPTH.drl`]: `${drl.join('\n')}\n`,
  };
}

/** Files zipped, as a board maker takes its Gerbers. */
export const zipOf = (files: Record<string, string>): Uint8Array => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { level: 6 });

// ---- who makes it, and what it costs -----------------------------------------------------------------------------------
export interface Route {
  id: string; how: string; who: string; url: string; /** the file it takes */ file: 'gerbers' | 'dxf' | 'stl';
  /** its thickness, mm, and what it is made of */ t: number; mat: string;
  /** what it costs, low to high, $, for so many, where its terms say; null where only its quote can */ lo: number | null; hi: number | null; n: number;
  /** what you must have for it */ needs?: string; src: string; note: string;
}

/** Every way to have it made, the cheapest known first (an unpriced way after the priced ones). What you have decides
 *  some: a home printer prints it for the cost of its plastic. */
export function routesFor(p: Profile, has: { printer?: boolean } = {}): Route[] {
  const sqin = areaOf(p) / 645.16, small = p.L <= 100 && p.W <= 100, out: Route[] = [];
  // JLCPCB: $2 for five two-layer boards up to 100 × 100 mm; shipping as buyers report it; US tariff collected at checkout
  out.push({ id: 'pcb-jlc', how: 'a bare FR-4 circuit board (no copper, solder mask both sides), drilled', who: 'JLCPCB', url: 'https://jlcpcb.com/', file: 'gerbers', t: 1.6, mat: 'FR-4', n: 5,
    lo: small ? +(2 * 1.35 + 1.5).toFixed(2) : null, hi: small ? +(2 * 1.925 + 3.5).toFixed(2) : null,
    src: 'jlcpcb.com ("PCB prototypes starting at just $2 for 5 PCBs", two layers up to 100 × 100 mm); shipping $1.50-3.50 as buyers report it (EEVblog, Reddit r/PCB: typical, not JLCPCB\'s figure); US tariff about 35-92.5 % collected at checkout (JLCPCB, "U.S. Tariff Policy FAQ", updated 8 September 2026)',
    note: small ? 'five plates; the low end is the least tariff and shipping, the high end the most' : `${p.L.toFixed(0)} × ${p.W.toFixed(0)} mm is past the 100 × 100 mm the $2 offer covers: their instant quote prices it from the zip` });
  out.push({ id: 'pcb-osh', how: 'a bare FR-4 circuit board, drilled', who: 'OSH Park (US)', url: 'https://oshpark.com/', file: 'gerbers', t: 1.6, mat: 'FR-4', n: 3,
    lo: +(sqin * 5).toFixed(2), hi: +(sqin * 5).toFixed(2), src: 'docs.oshpark.com/services: two-layer prototype "$5 per square inch, per set of 3"', note: 'three plates; a US service, so no import tariff; shipping as its checkout says' });
  out.push({ id: 'laser-scs', how: 'laser-cut 5052 aluminium, 0.125 in', who: 'SendCutSend (US)', url: 'https://sendcutsend.com/', file: 'dxf', t: 3.175, mat: '5052-H32 aluminium', n: 1, lo: null, hi: null,
    src: 'sendcutsend.com/pricing (modified 29 September 2026): "No minimum quantities", "Free US shipping on orders of $39 or more"; its own example, a 2 × 2 in mild-steel part 0.059 in thick, $19.51 for one',
    note: 'metal, and stiffest: its price comes from its instant quote on the DXF' });
  out.push({ id: 'print-jlc', how: 'printed in 9600 resin (SLA)', who: 'JLC3DP', url: 'https://jlc3dp.com/', file: 'stl', t: 3, mat: '9600 resin', n: 1, lo: null, hi: null,
    src: 'jlc3dp.com: "Custom 3D Printed Parts from $0.30"; US tariff as for JLCPCB', note: 'its instant quote prices it from the STL; shipping and tariff on top' });
  if (has.printer) {
    const g = (areaOf(p) * 3) / 1000 * 1.24;
    out.push({ id: 'print-home', how: 'printed in PLA on your own printer, 3 mm', who: 'you', url: '', file: 'stl', t: 3, mat: 'PLA', n: 1, lo: +(g * 0.015).toFixed(2), hi: +(g * 0.03).toFixed(2), needs: 'a 3D printer and PLA',
      src: `its ${g.toFixed(0)} g of PLA (1.24 g/cm³, typical) at $15-30 a kilogram (3dprinting.com, "How Much Does 3D Printing Cost?", May 2026)`, note: 'the plastic only; solid, so a slicer\'s infill makes it lighter' });
  }
  return out.sort((a, b) => (a.lo ?? Infinity) - (b.lo ?? Infinity));
}

/** What each service is told about the part when it is uploaded, besides the file. */
export function quoteInputs(p: Profile, r: Route): string[] {
  const size = `${p.L.toFixed(1)} × ${p.W.toFixed(1)} mm`;
  if (r.file === 'gerbers') return [`upload ${'plate-gerbers.zip'}: it reads ${size} from the outline`, 'layers: 2', `thickness: ${r.t} mm, FR-4`, `quantity: ${r.n}`, 'surface finish: any (there is no copper to finish)', 'check its viewer shows the outline and every hole before paying'];
  if (r.file === 'dxf') return ['upload plate.dxf', 'units: millimetres (it should read the part as ' + size + ')', `material: ${r.mat}`, `thickness: ${r.t} mm (0.125 in)`, `quantity: ${r.n}`, 'check every hole is in its preview before paying'];
  return ['upload plate.stl (mm)', `material: ${r.mat}`, `quantity: ${r.n}`, `it should read ${size} × ${r.t} mm`];
}

/** The files and the cheapest way for a part, with what to say when it is uploaded. */
export function fabPack(p: Profile, has: { printer?: boolean } = {}): { routes: Route[]; best: Route; files: Record<string, string | Uint8Array>; faults: string[] } {
  const routes = routesFor(p, has), best = routes[0]!, g = gerbers(p);
  const readme = [`${p.name}: ${p.L.toFixed(1)} × ${p.W.toFixed(1)} mm, corners r ${p.r} mm, ${p.holes.length} holes`, '', 'holes (x, y from the lower-left corner, mm; diameter):',
    ...p.holes.map((h) => `  ${h.x.toFixed(2)}, ${h.y.toFixed(2)}  ⌀${h.d}  ${h.why}`), '', 'ways to have it made, cheapest known first:',
    ...routes.flatMap((r) => [`- ${r.who}: ${r.how}. ${r.lo == null ? 'price from its quote' : r.lo === r.hi ? `$${r.lo.toFixed(2)}` : `$${r.lo.toFixed(2)}-${r.hi!.toFixed(2)}`} for ${r.n}. ${r.note}.`, `  (${r.src})`, ...quoteInputs(p, r).map((q) => `  · ${q}`)])];
  return { routes, best, faults: profileFaults(p), files: { 'plate.dxf': dxf(p), 'plate.stl': stl(p, 3), 'plate-gerbers.zip': zipOf(g), 'README.txt': `${readme.join('\n')}\n` } };
}

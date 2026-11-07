// A chip as its transistors: each a switch between two nodes, closed while the node at its gate is high; each node a
// wire, some held high through a resistor (a pull-up: NMOS's depletion-mode load). Nothing about what the chip does is
// written here: what it does comes out of running its transistors (logic/switch.ts).
//
// The 6502 is MOS Technology's, as the Visual 6502 team photographed and traced it from a real revD die (Greg James,
// Brian Silverman, Barry Silverman, 2010: www.visual6502.org), in the compact form Michael Steil's perfect6502 keeps it:
// each transistor its gate and its two channel ends, each node whether it is pulled up. That data is under Creative
// Commons Attribution-NonCommercial-ShareAlike 3.0, so it is not kept in this repository: it is fetched from its source
// the first time it is needed and cached outside git (data/ext/, ignored).

export interface Netlist {
  name: string; nodes: number;
  /** each transistor: its gate, and the two ends of its channel */ gate: Int32Array; c1: Int32Array; c2: Int32Array;
  /** each node: held high through a load */ pullup: Uint8Array;
  vcc: number; vss: number; names: Record<string, number>;
  /** transistors as traced, and left after duplicates (the same gate across the same two nodes) are taken as one */ traced: number;
  source: string;
}

export const NETLIST_6502 = {
  url: 'https://raw.githubusercontent.com/mist64/perfect6502/master/netlist_6502.h',
  file: 'data/ext/6502/netlist_6502.h',
  source: 'MOS 6502 revD, traced from the die by the Visual 6502 team (Greg James, Brian Silverman, Barry Silverman, 2010; www.visual6502.org), as perfect6502 (Michael Steil) keeps it: CC BY-NC-SA 3.0, fetched, not kept here',
};

/** Read a netlist from perfect6502's C header: its named nodes (an enum, with those it comments out), each node's pull-up,
 *  and each transistor as {gate, c1, c2}. */
export function parseNetlistH(text: string, name = '6502', source = NETLIST_6502.source): Netlist {
  const names: Record<string, number> = {};
  const en = text.slice(text.indexOf('enum'), text.indexOf('};', text.indexOf('enum')));
  for (const m of en.matchAll(/^\s*(?:\/\/\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)/gm)) names[m[1]!] = Number(m[2]);
  const pu = text.slice(text.indexOf('node_is_pullup'), text.indexOf('};', text.indexOf('node_is_pullup')));
  const pulls = [...pu.slice(pu.indexOf('{') + 1).matchAll(/\d+/g)].map((m) => Number(m[0]));
  const td = text.slice(text.indexOf('transdefs[]'), text.indexOf('};', text.indexOf('transdefs[]')));
  const ts = [...td.matchAll(/\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\}/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
  if (!ts.length || !pulls.length || names.vcc === undefined || names.vss === undefined) throw new Error('this is not a netlist header: no transistors, pull-ups, vcc or vss in it');
  // (a transistor traced twice, or the same switch with its ends the other way round, is one switch)
  const seen = new Set<string>(), keep: (readonly [number, number, number])[] = [];
  for (const [g, a, b] of ts) { const k = `${g},${Math.min(a, b)},${Math.max(a, b)}`; if (seen.has(k)) continue; seen.add(k); keep.push([g, a, b]); }
  const nodes = Math.max(pulls.length, ...keep.flatMap((t) => [t[0], t[1], t[2]])) + 1;
  const pullup = new Uint8Array(nodes); pulls.forEach((v, i) => { pullup[i] = v ? 1 : 0; });
  return { name, nodes, gate: Int32Array.from(keep.map((t) => t[0])), c1: Int32Array.from(keep.map((t) => t[1])), c2: Int32Array.from(keep.map((t) => t[2])), pullup, vcc: names.vcc, vss: names.vss, names, traced: ts.length, source };
}

let cached: Promise<Netlist> | null = null;
/** The 6502's netlist: from the cache (in node), else fetched from its source (and cached, in node). */
export function load6502(): Promise<Netlist> {
  return (cached ??= (async () => {
    const isNode = typeof process !== 'undefined' && !!process.versions?.node;
    if (isNode) {
      const fsName = 'node:fs/promises', pathName = 'node:path', fs = (await import(/* @vite-ignore */ fsName)) as typeof import('node:fs/promises'), path = (await import(/* @vite-ignore */ pathName)) as typeof import('node:path');
      const file = path.resolve(process.cwd(), NETLIST_6502.file);
      try { return parseNetlistH(await fs.readFile(file, 'utf8')); } catch { /* not cached yet */ }
      const r = await fetch(NETLIST_6502.url); if (!r.ok) throw new Error(`could not fetch the 6502's netlist from ${NETLIST_6502.url}: ${r.status}`);
      const text = await r.text(); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); return parseNetlistH(text);
    }
    const r = await fetch(NETLIST_6502.url); if (!r.ok) throw new Error(`could not fetch the 6502's netlist from ${NETLIST_6502.url}: ${r.status}`); return parseNetlistH(await r.text());
  })().catch((e) => { cached = null; throw e; }));
}

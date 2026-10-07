// Life as the inventory holds it: the molecules things alive are made of, as materials with their formulas (so each
// comes down to its elements exactly), and every level above them (organelles, cells, tissues, organs, systems, whole
// organisms) as entries, each with what is in it by count or by mass. Written as tables, a line an entry:
//
//   molecule:  id | name | group | formula, or "blend: what %, what %…" | says [| MW in daltons, where it has no formula]
//   entry:     id | name | path | kind | what is in it | grams one weighs | size, mm (LxWxH) | 3D look | says | spec
//
// "What is in it" is "id*n" for n of a thing, "id:g" for g grams of it (how tissue and fluid are said), and "id:*" for
// the rest of its mass, whatever the others leave. Its grams are a number, or "=" for the sum of what is in it. Counts
// and masses are a typical adult's or a typical cell's, from the source each line names; where a number is an estimate
// it says so. The tables are only data: ./index.ts settles every mass, src/nexus/inventory.ts makes them entries.

/** A molecule: its formula or its blend, and its molecular weight (daltons) where it has no formula (a protein). */
export interface Molecule { id: string; name: string; group: string; spec: { formula: string } | { blend: [string, number][] }; says: string; da?: number }
/** An entry of life: what is in it by count (of) and, for tissue and fluid, by grams (mass). */
export interface LifeEntry {
  id: string; name: string; path: string; kind: 'product' | 'assembly' | 'part'; of: { id: string; n: number }[];
  /** grams of each part said by mass; the rest's part (rest) is filled in when every mass is settled */ mass: Record<string, number>;
  /** grams one weighs: NaN where it is the sum of what is in it */ g: number; rest?: string;
  /** mm */ size?: [number, number, number]; look?: string; says: string; spec?: string;
}

const cells = (line: string) => line.split(' | ').map((x) => x.trim());
/** Molecules from their table. */
export function molecules(text: string): Molecule[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((l) => {
    const [id, name, group, spec, says, da] = cells(l) as [string, string, string, string, string, string?];
    const blend = /^blend:\s*/.exec(spec);
    return { id, name, group, spec: blend ? { blend: spec.slice(blend[0].length).split(',').map((x) => { const m = /^(.*\S)\s+([\d.]+)$/.exec(x.trim()); if (!m) throw new Error(`${id}: bad blend part "${x}"`); return [m[1]!, Number(m[2])] as [string, number]; }) } : { formula: spec }, says, ...(da ? { da: Number(da) } : {}) };
  });
}
/** Entries from their table. */
export function entries(text: string): LifeEntry[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((l) => {
    const [id, name, path, kind, of, g, size, look, says, spec] = cells(l) as [string, string, string, LifeEntry['kind'], string, string, string, string, string, string?];
    const out: LifeEntry = { id, name, path, kind, of: [], mass: {}, g: g === '=' ? NaN : Number(g), says };
    for (const t of of.split(/\s+/).filter(Boolean)) {
      const mm = /^([\w.-]+):([\d.e+-]+)$/.exec(t), mc = /^([\w.-]+)\*([\d.e+-]+)$/.exec(t), mr = /^([\w.-]+):\*$/.exec(t);
      if (mr) { if (out.rest) throw new Error(`${id}: two rests`); out.rest = mr[1]!; out.of.push({ id: mr[1]!, n: 1 }); } else if (mm) { out.of.push({ id: mm[1]!, n: 1 }); out.mass[mm[1]!] = Number(mm[2]); } else if (mc) out.of.push({ id: mc[1]!, n: Number(mc[2]) }); else if (/^[\w.-]+$/.test(t)) out.of.push({ id: t, n: 1 }); else throw new Error(`${id}: cannot read "${t}"`);
    }
    if (g !== '=' && !(out.g > 0)) throw new Error(`${id}: no mass`);
    if (g === '=' && out.rest) throw new Error(`${id}: a sum of its parts has no rest`);
    if (size && size !== '-') out.size = size.split('x').map(Number) as [number, number, number];
    if (look && look !== '-') out.look = look;
    if (spec) out.spec = spec;
    return out;
  });
}

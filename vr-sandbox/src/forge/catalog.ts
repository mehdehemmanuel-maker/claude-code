// Words to catalog entries: "lumber", "pipe", "steel", "oak", len=1.2m. Forge accepts the words a builder uses and
// resolves them to exactly one part kind, material or parameter, or says what it could have meant.

import { MATERIALS, type Material } from '../data/materials';
import { getPartKind, PART_KINDS } from '../parts/registry';
import type { ParamDef } from '../schema/params';

const KIND_ALIASES: Record<string, string> = {
  wood: 'lumber', board: 'lumber', plank: 'lumber', stud: 'lumber', timber: 'lumber',
  cube: 'block', box: 'block', brick: 'block',
  sheet: 'plate', panel: 'plate', slab: 'plate',
  rod: 'rod.round', dowel: 'rod.round', shaft: 'rod.round', axle: 'rod.round',
  bar: 'rod.square', 'square-bar': 'rod.square',
  tube: 'tube.round', pipe: 'tube.round', 'square-tube': 'tube.square', 'box-section': 'tube.square',
  beam: 'beam.i', 'i-beam': 'beam.i', girder: 'beam.i',
  'angle-iron': 'angle', disk: 'disc', ball: 'sphere', ramp: 'wedge', mass: 'weight',
  magnet: 'magnet.disc', 'disc-magnet': 'magnet.disc', 'block-magnet': 'magnet.block', electromagnet: 'magnet.electro',
};

/** The builder's words for each part kind (for search): the aliases above, inverted. */
export const KIND_WORDS: Record<string, string[]> = {};
for (const [w, id] of Object.entries(KIND_ALIASES)) (KIND_WORDS[id] ??= []).push(...w.split('-'));

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');

export function resolveKind(word: string): string {
  const w = slug(word);
  const direct = PART_KINDS.find((k) => k.id === w || slug(k.label) === w);
  if (direct) return direct.id;
  if (KIND_ALIASES[w]) return KIND_ALIASES[w]!;
  const partial = PART_KINDS.filter((k) => k.id.includes(w) || slug(k.label).includes(w));
  if (partial.length === 1) return partial[0]!.id;
  throw new Error(`no part called "${word}"${partial.length ? ` (did you mean ${partial.map((k) => k.id).join(', ')}?)` : ''}`);
}

/** A material for a kind: its id, or a word from its name ("oak", "a36", "steel"), among those the kind can be. */
export function resolveMaterial(kindId: string, word: string | undefined): string {
  const kind = getPartKind(kindId);
  if (!word) return kind.defaultMaterial;
  const allowed = MATERIALS.filter((m) => !kind.materialFilter || kind.materialFilter(m));
  const w = word.toLowerCase();
  const exact = allowed.find((m) => m.id === w);
  if (exact) return exact.id;
  const words = (m: Material) => `${m.id} ${m.name}`.toLowerCase().split(/[^a-z0-9]+/);
  const byWord = allowed.filter((m) => words(m).includes(w) || m.id.split('.').includes(w));
  if (byWord.length) return byWord[0]!.id;
  const byPart = allowed.filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(w));
  if (byPart.length) return byPart[0]!.id;
  const any = MATERIALS.find((m) => `${m.id} ${m.name}`.toLowerCase().includes(w));
  throw new Error(any ? `a ${kind.label.toLowerCase()} can't be made of ${any.name}` : `no material called "${word}"`);
}

const KEY_ALIASES: Record<string, string> = {
  len: 'length', l: 'length', dia: 'diameter', d: 'diameter', t: 'thickness', thick: 'thickness', w: 'width',
  h: 'height', r: 'radius', power: 'power', strength: 'rating',
};

/** A parameter of a kind by its key or a short name for it. */
export function resolveParam(defs: ParamDef[], key: string, what: string): ParamDef {
  const k = key.toLowerCase();
  const d = defs.find((p) => p.key.toLowerCase() === k) ?? defs.find((p) => p.key === KEY_ALIASES[k]) ?? defs.find((p) => p.label.toLowerCase() === k);
  if (d) return d;
  throw new Error(`${what} has no "${key}" (it has ${defs.map((p) => p.key).join(', ')})`);
}

/** A Forge value into a parameter: numbers for numbers (already SI), words for choices, true/false for flags. */
export function paramValue(def: ParamDef, v: number | string, what: string): number | string | boolean {
  if (def.type === 'number') {
    if (typeof v !== 'number') throw new Error(`${what}: ${def.key} takes a number, not ${v}`);
    return v;
  }
  if (def.type === 'bool') {
    if (v === 'true' || v === 'on' || v === 'yes' || v === 1) return true;
    if (v === 'false' || v === 'off' || v === 'no' || v === 0) return false;
    throw new Error(`${what}: ${def.key} is on or off`);
  }
  const s = String(v).toLowerCase();
  const o = def.options.find((x) => x.value.toLowerCase() === s || x.label.toLowerCase() === s) ?? def.options.find((x) => x.label.toLowerCase().startsWith(s));
  if (!o) throw new Error(`${what}: ${def.key} is one of ${def.options.map((x) => x.value).join(', ')}`);
  return o.value;
}

// The scans the gate runs over what is written, not what runs (spec 00, task S4; constitution C7, C8, C17): every
// figure in a data file has a source or a label; no placeholder stands in a data file; no key is written anywhere in the
// repository or the built pages. Each is a function of the text or the values it is given, so the one test runs it on
// the repository and on planted cases, and a planted case must fail it.

/** A figure: a number, a list of numbers, a table of rows of numbers, or a typed array. (Figures held only in lists went
 *  unseen by both scans: all of `optics.ts` (the evaluator, judging 10.T3, 2026-11-01).) */
// (and a list of [name, number] pairs, as a mix's parts are; and a number exported alone; and, walked into, any list
// holding a number beside anything else (a text, a null), a lone pair, a Map's values (the evaluator, 2026-11-01))
export const figure = (x: unknown): boolean => typeof x === 'number' || ArrayBuffer.isView(x)
  || (Array.isArray(x) && x.length > 0 && x.every((y) => typeof y === 'number' || (Array.isArray(y) && y.length > 0 && y.some((z) => typeof z === 'number') && y.every((z) => typeof z === 'number' || typeof z === 'string'))));

/** Keys that say where a record's figures come from, or what kind of figure they are (typical, derived, an estimate). */
const SOURCED = /^(source|sources|src|ref|refs|reference|references|confidence|basis|label|cite|citation|origin|provenance|evidence)$/i;

/**
 * Records in a data module that hold numbers and say nowhere where they come from: not in themselves, not in a record
 * that holds them, and not in the module's own `…SOURCE` export (a whole file from one source says so once).
 */
export function unsourced(mod: Record<string, unknown>, file: string): string[] {
  if (Object.keys(mod).some((k) => /(^|_)SOURCES?$/.test(k) && typeof mod[k] === 'string' && (mod[k] as string).trim().length > 8)) return [];
  // (or a …_SOURCES record naming each export's source, for figures exported alone)
  const each = Object.entries(mod).find(([k, v]) => /(^|_)SOURCES?$/.test(k) && !!v && typeof v === 'object' && !Array.isArray(v)) as [string, Record<string, unknown>] | undefined;
  const named = (k: string) => !!each && typeof each[1][k] === 'string' && (each[1][k] as string).trim().length > 8;
  const out: string[] = [];
  const walk = (v: unknown, path: string, ok: boolean, depth: number) => {
    if (typeof v === 'number') { if (!ok) out.push(`${file}: ${path}`); return; }
    if (depth > 8 || !v || typeof v !== 'object') return;
    if (v instanceof Map) v = Object.fromEntries(v);
    if (figure(v)) { if (!ok) out.push(`${file}: ${path}`); return; }
    if (Array.isArray(v)) { if (v.some((x) => typeof x === 'number')) { if (!ok) out.push(`${file}: ${path}`); return; } v.forEach((x, i) => walk(x, `${path}[${i}]`, ok, depth + 1)); return; }
    const o = v as Record<string, unknown>, has = ok || Object.keys(o).some((k) => SOURCED.test(k) && o[k] !== '' && o[k] !== undefined);
    if (!has && Object.values(o).some(figure)) out.push(`${file}: ${path}`);
    for (const [k, x] of Object.entries(o)) if (x && typeof x === 'object' && !figure(x)) walk(x, `${path}.${k}`, has, depth + 1);
  };
  for (const [k, v] of Object.entries(mod)) if (k !== each?.[0]) walk(v, k, named(k), 0);
  return out;
}

/**
 * The claim status of each record (spec 10, task T3; constitution C21), in the app's one vocabulary of evidence kinds
 * (`EVIDENCE` in `src/nexus/evidence.ts`): its own `status`, or what the data files already say in their own words
 * (`confidence`, `evidence`, a constant's `exact`), read through `SAID`; or the file's `…_STATUS` export where one status
 * holds for all of it. Records holding numbers with none of these are returned.
 */
export const SAID: Record<string, Record<string, string>> = {
  confidence: { spec: 'specified', handbook: 'specified', estimated: 'estimated' },
  evidence: { specified: 'specified', handbook: 'specified', secondary: 'specified', typical: 'estimated' },
  exact: { true: 'exact', false: 'measured' },
};
export function unstated(mod: Record<string, unknown>, file: string, kinds: readonly string[]): string[] {
  const whole = Object.entries(mod).find(([k, v]) => /(^|_)STATUS$/.test(k) && typeof v === 'string');
  if (whole) return kinds.includes(whole[1] as string) ? [] : [`${file}: ${whole[0]} = ${whole[1]}, not a status`];
  // (or a …_STATUS record naming the status of each export by its name: for tables held as plain lists, which have no
  // record of their own to carry one)
  const each = Object.entries(mod).find(([k, v]) => /(^|_)STATUS$/.test(k) && !!v && typeof v === 'object' && !Array.isArray(v)) as [string, Record<string, unknown>] | undefined;
  const out: string[] = [];
  if (each) for (const [k, v] of Object.entries(each[1])) { if (!(k in mod)) out.push(`${file}: ${each[0]}.${k} names no export`); else if (!kinds.includes(String(v))) out.push(`${file}: ${each[0]}.${k} = ${v}, not a status`); }
  const statusOf = (o: Record<string, unknown>) => { if (typeof o.status === 'string' && kinds.includes(o.status)) return o.status;
    for (const [k, m] of Object.entries(SAID)) if (k in o && String(o[k]) in m) return m[String(o[k])]; return undefined; };
  const walk = (v: unknown, path: string, has: boolean, depth: number) => {
    if (typeof v === 'number') { if (!has) out.push(`${file}: ${path}`); return; }
    if (depth > 8 || !v || typeof v !== 'object') return;
    if (v instanceof Map) v = Object.fromEntries(v);
    if (figure(v)) { if (!has) out.push(`${file}: ${path}`); return; }
    if (Array.isArray(v)) { if (v.some((x) => typeof x === 'number')) { if (!has) out.push(`${file}: ${path}`); return; } v.forEach((x, i) => walk(x, `${path}[${i}]`, has, depth + 1)); return; }
    const o = v as Record<string, unknown>, own = has || !!statusOf(o);
    if (!own && Object.values(o).some(figure)) out.push(`${file}: ${path}`);
    for (const [k, x] of Object.entries(o)) if (x && typeof x === 'object' && !figure(x)) walk(x, `${path}.${k}`, own, depth + 1);
  };
  for (const [k, v] of Object.entries(mod)) if (k !== each?.[0]) walk(v, k, !!each && kinds.includes(String(each[1][k])), 0);
  return out;
}

/** Words that stand in for what is not there yet, in a data file. */
export const PLACEHOLDER = /\bTODO\b|\bFIXME\b|lorem ipsum|\bTBD\b|\bXXX\b|\bplaceholder\b/i;
export function placeholders(text: string, file: string): string[] {
  return text.split('\n').flatMap((l, i) => (PLACEHOLDER.test(l) ? [`${file}:${i + 1}: ${l.trim().slice(0, 100)}`] : []));
}

/** The shapes of keys the app uses or might: Anthropic, Google, GitHub, AWS, a private key block, a key written into a
 *  setting by name. */
export const SECRET = /sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|secret|token)["']?\s*[:=]\s*["'][A-Za-z0-9_\-]{32,}["']/i;
export function secrets(text: string, file: string): string[] {
  return text.split('\n').flatMap((l, i) => (SECRET.test(l) ? [`${file}:${i + 1}`] : []));
}

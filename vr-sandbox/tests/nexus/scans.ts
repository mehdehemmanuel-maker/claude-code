// The scans the gate runs over what is written, not what runs (spec 00, task S4; constitution C7, C8, C17): every
// figure in a data file has a source or a label; no placeholder stands in a data file; no key is written anywhere in the
// repository or the built pages. Each is a function of the text or the values it is given, so the one test runs it on
// the repository and on planted cases, and a planted case must fail it.

/** Keys that say where a record's figures come from, or what kind of figure they are (typical, derived, an estimate). */
const SOURCED = /^(source|sources|src|ref|refs|reference|references|confidence|basis|label|cite|citation|origin|provenance|evidence)$/i;

/**
 * Records in a data module that hold numbers and say nowhere where they come from: not in themselves, not in a record
 * that holds them, and not in the module's own `…SOURCE` export (a whole file from one source says so once).
 */
export function unsourced(mod: Record<string, unknown>, file: string): string[] {
  if (Object.keys(mod).some((k) => /(^|_)SOURCES?$/.test(k) && typeof mod[k] === 'string' && (mod[k] as string).trim().length > 8)) return [];
  const out: string[] = [];
  const walk = (v: unknown, path: string, ok: boolean, depth: number) => {
    if (depth > 8 || !v || typeof v !== 'object' || ArrayBuffer.isView(v)) return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, ok, depth + 1)); return; }
    const o = v as Record<string, unknown>, has = ok || Object.keys(o).some((k) => SOURCED.test(k) && o[k] !== '' && o[k] !== undefined);
    if (!has && Object.values(o).some((x) => typeof x === 'number')) out.push(`${file}: ${path}`);
    for (const [k, x] of Object.entries(o)) if (x && typeof x === 'object') walk(x, `${path}.${k}`, has, depth + 1);
  };
  for (const [k, v] of Object.entries(mod)) walk(v, k, false, 0);
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

// Code a pipeline step is written in, run off the room's thread and away from the page: JavaScript as it is, TypeScript
// compiled first (the compiler fetched once from a CDN), Python in Pyodide (fetched once from a CDN), C++ as the
// JavaScript it was turned into. It is given the facts and the step before's output; it may ask for pipeline steps
// (step("…")) and say things (say("…")); what it returns, or its last Python value or `result`, is its output. It has no
// page to touch; the forge stops it if it runs too long.

const TS_URL = 'https://cdn.jsdelivr.net/npm/typescript@5.6.3/+esm';
const PY_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
type Msg = { id: number; lang: 'js' | 'ts' | 'python' | 'cpp'; code: string; facts: Record<string, number>; input: string };
let ts: { transpile(code: string, o: object): string } | null = null;
let py: { runPythonAsync(code: string, o?: object): Promise<unknown>; toPy(x: unknown): unknown; globals: { set(k: string, v: unknown): void; get(k: string): unknown } } | null = null;

async function run(m: Msg): Promise<{ value: string; logs: string[]; steps: string[] }> {
  const logs: string[] = [], steps: string[] = [];
  const show = (x: unknown) => (typeof x === 'string' ? x : JSON.stringify(x));
  const api = { facts: m.facts, input: m.input, step: (w: string) => { steps.push(String(w)); }, say: (w: string) => { steps.push(`say ${w}`); }, log: (...xs: unknown[]) => { logs.push(xs.map(show).join(' ')); } };
  if (m.lang === 'python') {
    if (!py) { let mod: { loadPyodide(o: object): Promise<typeof py> }; try { mod = (await import(/* @vite-ignore */ `${PY_URL}pyodide.mjs`)) as typeof mod; } catch { throw new Error('Python runs in Pyodide, fetched from cdn.jsdelivr.net the first time: it could not be reached from here (offline, or blocked)'); } py = await mod.loadPyodide({ indexURL: PY_URL }); }
    const p = py!;
    p.globals.set('facts', p.toPy(m.facts)); p.globals.set('input', m.input); p.globals.set('step', api.step); p.globals.set('say', api.say); p.globals.set('log', api.log);
    p.globals.set('result', undefined);
    const out = await p.runPythonAsync(m.code), result = p.globals.get('result');
    const v = result ?? out; const plain = v && typeof v === 'object' && 'toJs' in (v as object) ? (v as { toJs(): unknown }).toJs() : v;
    return { value: plain === undefined || plain === null ? '' : show(plain instanceof Map ? Object.fromEntries(plain) : plain), logs, steps };
  }
  let js = m.code;
  if (m.lang === 'ts') {
    if (!ts) { try { const mod = (await import(/* @vite-ignore */ TS_URL)) as Record<string, unknown>; ts = (mod.default ?? mod) as unknown as NonNullable<typeof ts>; } catch { /* offline: types stripped by pattern below */ } }
    if (ts) js = ts.transpile(m.code, { target: 7 /* ES2020 */, module: 1 });
    else { js = stripTypes(m.code); logs.push('the TypeScript compiler could not be fetched (offline?): its type annotations were stripped by pattern and it ran as JavaScript'); }
  }
  // a lone expression is its own value
  const body = /\breturn\b/.test(js) || /;\s*\S/.test(js.trim().replace(/;\s*$/, '')) || /^\s*(let|const|var|if|for|while|function)\b/.test(js) ? js : `return (${js.replace(/;\s*$/, '')});`;
  const f = new Function('facts', 'input', 'step', 'say', 'log', 'forward', 'turn', 'halt', 'distance', `"use strict";\n${body}`) as (...a: unknown[]) => unknown;
  const dev = (w: string) => api.step(`device first ${w}`);
  const v = await f(api.facts, api.input, api.step, api.say, api.log, (x: number) => dev(`forward ${x}`), (d: number) => dev(`turn ${d}`), () => dev('stop'), () => m.facts.rover_distance ?? 4000);
  return { value: v === undefined ? '' : show(v), logs, steps };
}
/** TypeScript's simple type annotations taken off by pattern, where the compiler cannot be had: interfaces and type
 *  aliases, ": Type" on declarations, parameters and returns, "as Type", and the non-null "!". */
function stripTypes(src: string): string {
  return src
    .replace(/^\s*(export\s+)?(interface|type)\s+\w+[^=]*?(=[^;]*;|\{[\s\S]*?\n\s*\})/gm, '')
    .replace(/\b(let|const|var)\s+(\w+)\s*:\s*[^=;]+/g, '$1 $2 ')
    .replace(/(\(|,)\s*(\w+)\s*\??\s*:\s*[\w[\]<>|. ]+(?=\s*[,)=])/g, '$1 $2')
    .replace(/\)\s*:\s*[\w[\]<>|. ]+(?=\s*(\{|=>))/g, ')')
    .replace(/\s+as\s+[\w[\]<>|.]+/g, '')
    .replace(/(\w|\))!(?=[.)\],;\s])/g, '$1');
}
self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try { self.postMessage({ id: m.id, ...(await run(m)) }); }
  catch (err) { self.postMessage({ id: m.id, error: (err as Error).message ?? String(err) }); }
};

// The languages a pipeline step may be written in, by what they are for. A step is "<language>: <code>"; what runs here
// runs (G-code on the printer; JavaScript and TypeScript in a sandboxed worker; Python in the browser's own Python,
// Pyodide; a C++ (Arduino) subset turned into JavaScript; an OpenSCAD subset turned into the workshop's shapes; JSON and
// CSV into the inventory; maths with units in the workshop's calculator; Markdown shown); what does not is handed to
// Claude to turn into steps, or kept as it is written, and says so. Code may ask for pipeline steps (step("robot rex
// charge"), say("…")): they are done after it, in order, as any step is.

export type LangCategory = 'Machine control' | 'Programming' | 'Embedded' | 'CAD and geometry' | 'Data' | 'Maths' | 'Documents' | 'Hardware description' | 'Queries' | 'Shell' | 'Pipelines';
export interface Language { id: string; names: string[]; name: string; category: LangCategory; type: string; for: string; runs: 'here' | 'claude' | 'kept'; how: string; example: string }
export const LANGUAGES: Language[] = [
  { id: 'gcode', names: ['gcode', 'g-code', 'nc'], name: 'G-code', category: 'Machine control', type: 'numerical control', for: 'moving printers, mills and lasers', runs: 'here', how: 'sent to the workshop printer, line by line, as Marlin firmware reads it', example: 'gcode: G28; M104 S210; G1 X100 Y100 F3000' },
  { id: 'js', names: ['js', 'javascript'], name: 'JavaScript', category: 'Programming', type: 'scripting, dynamic', for: 'working things out, and deciding what to do next', runs: 'here', how: 'run in a sandboxed worker, given facts and input; what it returns is its output', example: 'js: return facts.parts > 10 ? "big" : "small"' },
  { id: 'ts', names: ['ts', 'typescript'], name: 'TypeScript', category: 'Programming', type: 'scripting, typed', for: 'the same, with types', runs: 'here', how: 'compiled by the TypeScript compiler (fetched once from a CDN) and run as JavaScript in the sandbox', example: 'ts: const n: number = facts.parts; return n * 2' },
  { id: 'python', names: ['py', 'python'], name: 'Python', category: 'Programming', type: 'scripting, dynamic', for: 'maths, data and scripts', runs: 'here', how: 'run in Pyodide, Python in the browser (fetched once from a CDN), in the sandbox; its last value, or result, is its output', example: 'python: result = sum(range(1, 11))' },
  { id: 'cpp', names: ['cpp', 'c++', 'arduino', 'ino'], name: 'C++ (Arduino)', category: 'Embedded', type: 'systems, compiled', for: 'microcontroller programs: setup() and loop()', runs: 'here', how: 'a subset (declarations, if/else, loops, functions, Serial.print) turned into JavaScript and run once through setup() and loop(); forward(v), turn(deg), halt() and distance() reach the first device out', example: 'cpp: void loop() { if (distance() < 300) turn(90); else forward(0.2); }' },
  { id: 'micropython', names: ['micropython', 'circuitpython'], name: 'MicroPython', category: 'Embedded', type: 'scripting for microcontrollers', for: 'boards that run Python', runs: 'claude', how: 'handed to Claude to turn into pipeline steps', example: 'micropython: from machine import Pin' },
  { id: 'rust', names: ['rust', 'rs'], name: 'Rust', category: 'Programming', type: 'systems, compiled', for: 'fast, safe programs', runs: 'claude', how: 'handed to Claude to turn into pipeline steps (no compiler runs in the browser here)', example: 'rust: fn main() { println!("hi"); }' },
  { id: 'scad', names: ['scad', 'openscad'], name: 'OpenSCAD', category: 'CAD and geometry', type: 'constructive solid geometry, declarative', for: 'parts from solids', runs: 'here', how: 'a subset (cube, cylinder, sphere, translate, union, variables) turned into the workshop\'s shapes; difference and rotate are said and left out', example: 'scad: cube([20, 30, 10]); translate([0, 0, 10]) cylinder(h = 20, d = 8);' },
  { id: 'kcl', names: ['kcl'], name: 'KCL (KittyCAD Language)', category: 'CAD and geometry', type: 'parametric CAD, functional', for: 'sketches extruded into parts', runs: 'claude', how: 'handed to Claude to turn into the workshop\'s shapes (KCL is not run in the forge)', example: 'kcl: startSketchOn(XY) |> circle(center = [0, 0], radius = 10) |> extrude(length = 5)' },
  { id: 'forge', names: ['forge', 'shapes', 'workshop'], name: 'the workshop\'s shape language', category: 'CAD and geometry', type: 'plain words, imperative', for: 'placing, sizing, joining shapes', runs: 'here', how: 'run by the workshop as said', example: 'forge: place plate named base size 200 x 300 x 10 mm' },
  { id: 'json', names: ['json'], name: 'JSON', category: 'Data', type: 'data', for: 'entries and numbers', runs: 'here', how: 'an array of entries is fed to the inventory; an object of numbers becomes facts checks can read', example: 'json: {"target_kg": 2.5}' },
  { id: 'csv', names: ['csv'], name: 'CSV', category: 'Data', type: 'data, tabular', for: 'many entries at once', runs: 'here', how: 'fed to the inventory, a header row naming the columns', example: 'csv: id,name,path,kind,make,of,says' },
  { id: 'yaml', names: ['yaml', 'yml'], name: 'YAML', category: 'Data', type: 'data', for: 'settings', runs: 'kept', how: 'kept as written', example: 'yaml: speed: 600' },
  { id: 'math', names: ['math', 'calc', 'maths'], name: 'maths with units', category: 'Maths', type: 'expressions', for: 'working things out with units', runs: 'here', how: 'worked out by the workshop\'s calculator, units and all', example: 'math: 3 * 200 N * 0.4 m' },
  { id: 'markdown', names: ['md', 'markdown'], name: 'Markdown', category: 'Documents', type: 'markup', for: 'notes', runs: 'here', how: 'shown as its output', example: 'md: **Check the belt tension**' },
  { id: 'verilog', names: ['verilog', 'vhdl'], name: 'Verilog / VHDL', category: 'Hardware description', type: 'hardware description', for: 'logic in chips and FPGAs', runs: 'claude', how: 'handed to Claude to explain or turn into logic-gate steps', example: 'verilog: assign y = a & b;' },
  { id: 'sql', names: ['sql'], name: 'SQL', category: 'Queries', type: 'query, declarative', for: 'asking the inventory', runs: 'here', how: 'a SELECT over the inventory (columns id, name, path, kind, make, says, spec; WHERE with =, LIKE, AND; LIMIT)', example: "sql: select name, spec from inventory where path like 'Electrical%' limit 5" },
  { id: 'bash', names: ['bash', 'sh', 'shell'], name: 'shell', category: 'Shell', type: 'commands', for: 'a computer\'s commands', runs: 'kept', how: 'kept as written: the forge runs no shell', example: 'bash: ls' },
  { id: 'pipeline', names: ['pipeline-language', 'steps'], name: 'the pipeline language', category: 'Pipelines', type: 'steps, one after another', for: 'making pipelines in a line', runs: 'here', how: '"pipeline new <title>: <step> -> <step> -> …" makes a pipeline of them', example: 'pipeline new Hot end check: when I press run -> gcode: M109 S210 -> if printer_temp > 200 -> say hot' },
];
/** The language a step is written in, from its first word ("ts:", "python:", "gcode:"), and its code. */
export function stepLanguage(what: string): { lang: Language; code: string } | null {
  const m = /^([a-z][\w+#-]*)\s*:\s*([\s\S]*)$/i.exec(what.trim()); if (!m) return null;
  const lang = LANGUAGES.find((l) => l.names.includes(m[1]!.toLowerCase())); return lang ? { lang, code: m[2]! } : null;
}
/** The languages by category, for a list to read. */
export function byCategory(): Map<LangCategory, Language[]> { const out = new Map<LangCategory, Language[]>(); for (const l of LANGUAGES) { if (!out.has(l.category)) out.set(l.category, []); out.get(l.category)!.push(l); } return out; }

// ==== OpenSCAD, a subset, into the workshop's shapes ====================================================================
/** OpenSCAD (cube, cylinder, sphere; translate; union and braces; numeric variables) as the workshop's steps: each solid
 *  placed at its size and moved to where its middle is. OpenSCAD's z is up; the workshop's y is. What it cannot do
 *  (difference, rotate, scale, modules) is said and left out. */
export function scadToSteps(src: string, prefix = 'cad'): { steps: string[]; notes: string[] } {
  const steps: string[] = [], notes: string[] = [], vars: Record<string, number> = {};
  const toks = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ' ').match(/[A-Za-z_]\w*|\d*\.?\d+(?:e[+-]?\d+)?|==|[[\](){};,=+\-*/<>]/gi) ?? [];
  let i = 0, n = 0;
  const peek = () => toks[i], next = () => toks[i++], want = (t: string) => { if (toks[i] !== t) throw new Error(`OpenSCAD: "${t}" expected, not "${toks[i] ?? 'the end'}"`); i++; };
  // expressions: numbers, variables, + − × ÷, brackets, unary minus
  const expr = (): number => { let v = term(); while (peek() === '+' || peek() === '-') { const o = next(); const r = term(); v = o === '+' ? v + r : v - r; } return v; };
  const term = (): number => { let v = atom(); while (peek() === '*' || peek() === '/') { const o = next(); const r = atom(); v = o === '*' ? v * r : v / r; } return v; };
  const atom = (): number => { const t = next(); if (t === '-') return -atom(); if (t === '(') { const v = expr(); want(')'); return v; } if (t !== undefined && /^\d|^\./.test(t)) return Number(t); if (t !== undefined && t in vars) return vars[t]!; if (t === 'true') return 1; if (t === 'false') return 0; throw new Error(`OpenSCAD: I cannot read "${t}" as a number`); };
  const vec = (): number[] => { want('['); const out: number[] = []; while (peek() !== ']') { out.push(expr()); if (peek() === ',') next(); } want(']'); return out; };
  const args = (): { pos: (number | number[])[]; named: Record<string, number | number[]> } => { want('('); const pos: (number | number[])[] = [], named: Record<string, number | number[]> = {}; while (peek() !== ')') { if (/^[A-Za-z_]/.test(peek() ?? '') && toks[i + 1] === '=') { const k = next()!; next(); named[k] = peek() === '[' ? vec() : expr(); } else pos.push(peek() === '[' ? vec() : expr()); if (peek() === ',') next(); } want(')'); return { pos, named }; };
  const solid = (kind: string, a: ReturnType<typeof args>, at: [number, number, number]) => {
    const name = `${prefix}${++n}`, centre = a.named.center === 1;
    if (kind === 'cube') { const s = a.pos[0] ?? a.named.size ?? 1, [x, y, z] = Array.isArray(s) ? [s[0] ?? 1, s[1] ?? 1, s[2] ?? 1] : [s, s, s]; const c = centre ? [0, 0, 0] : [x / 2, y / 2, z / 2]; steps.push(`place cube named ${name} size ${x} x ${y} x ${z} mm`, `move ${name} to ${at[0] + c[0]!} mm, ${at[2] + c[2]!} mm, ${at[1] + c[1]!} mm`); }
    else if (kind === 'cylinder') { const h = Number(a.named.h ?? a.pos[0] ?? 1), r = Number(a.named.r ?? (a.named.d !== undefined ? Number(a.named.d) / 2 : a.named.r1 ?? a.pos[1] ?? 1)); if (a.named.r2 !== undefined && a.named.r2 !== a.named.r1) notes.push(`${name}: a cone (r1 ≠ r2) is made a cylinder of r1`); steps.push(`place cylinder named ${name} size ${2 * r} x ${h} mm`, `move ${name} to ${at[0]} mm, ${at[2] + (centre ? 0 : h / 2)} mm, ${at[1]} mm`); }
    else if (kind === 'sphere') { const r = Number(a.named.r ?? (a.named.d !== undefined ? Number(a.named.d) / 2 : a.pos[0] ?? 1)); steps.push(`place ball named ${name} size ${2 * r} mm`, `move ${name} to ${at[0]} mm, ${at[2]} mm, ${at[1]} mm`); }
  };
  const statement = (at: [number, number, number]): void => {
    const t = peek(); if (t === undefined) return;
    if (t === ';') { next(); return; }
    if (t === '{') { next(); while (peek() !== '}' && peek() !== undefined) statement(at); want('}'); return; }
    if (/^[A-Za-z_]/.test(t) && toks[i + 1] === '=') { const k = next()!; next(); vars[k] = expr(); if (peek() === ';') next(); return; }
    next();
    if (t === 'translate') { const v = (args().pos[0] as number[]) ?? [0, 0, 0]; statement([at[0] + (v[0] ?? 0), at[1] + (v[1] ?? 0), at[2] + (v[2] ?? 0)]); return; }
    if (t === 'union' || t === 'color') { args(); statement(at); return; }
    if (t === 'difference' || t === 'intersection') { args(); notes.push(`${t}() is not made here: its first solid is kept, what it would cut away is placed as well (look at it)`); statement(at); return; }
    if (t === 'rotate' || t === 'scale' || t === 'mirror') { args(); notes.push(`${t}() is left out: the solid stands as it is`); statement(at); return; }
    if (t === 'cube' || t === 'cylinder' || t === 'sphere') { solid(t, args(), at); if (peek() === ';') next(); return; }
    if (t === 'module' || t === 'function') { notes.push(`${t}s are not read here: write the solids out`); while (peek() !== undefined && peek() !== '}') next(); next(); return; }
    notes.push(`"${t}" is not read here`); while (peek() !== undefined && peek() !== ';' && peek() !== '}') next(); if (peek() === ';') next();
  };
  while (i < toks.length) statement([0, 0, 0]);
  return { steps, notes };
}

// ==== C++ (Arduino), a subset, into JavaScript ==========================================================================
/** C++ as an Arduino sketch is written, turned into JavaScript the sandbox runs: its types taken off its declarations
 *  and functions, Serial.print* made log, delay() kept as a wait asked for; then setup() and loop() run once each. */
export function cppToJs(src: string): string {
  const types = '(?:unsigned\\s+(?:int|long|char)|long\\s+long|const\\s+\\w+|static\\s+\\w+|int|long|short|float|double|bool|boolean|char|byte|word|String|auto|size_t|u?int(?:8|16|32|64)_t)';
  let js = src.replace(/^\s*#\s*(include|define|pragma)[^\n]*$/gm, '').replace(/\busing\s+namespace\s+\w+\s*;/g, '');
  js = js.replace(new RegExp(`\\b(?:void|${types})\\s*\\*?\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g'), (_m, name: string, params: string) => `function ${name}(${params.split(',').map((p) => p.trim().split(/\s+/).pop()!.replace(/[*&]/g, '')).filter(Boolean).join(', ')}) {`);
  js = js.replace(new RegExp(`\\b${types}\\s*\\*?\\s+(?=\\w+\\s*(=|;|,|\\[))`, 'g'), 'let ');
  js = js.replace(/\bSerial\.print(?:ln)?\s*\(/g, 'log(').replace(/\bSerial\.begin\s*\([^)]*\)\s*;/g, '').replace(/\bdelay\s*\(\s*([^)]+)\)/g, 'step(`wait ${($1) / 1000} s`)');
  js = js.replace(/\b(HIGH|true)\b/g, 'true').replace(/\b(LOW|false)\b/g, 'false').replace(/(\d+(?:\.\d+)?)f\b/g, '$1');
  return `${js}\n;if (typeof setup === 'function') setup(); if (typeof loop === 'function') loop();`;
}

// ==== SQL, a SELECT over the inventory ===================================================================================
export function sqlSelect(src: string, rows: Record<string, string>[]): Record<string, string>[] | string {
  const m = /^\s*select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+?))?(?:\s+limit\s+(\d+))?\s*;?\s*$/i.exec(src.trim());
  if (!m) return 'Only SELECT … FROM inventory [WHERE …] [LIMIT n] is read here.';
  if (m[2]!.toLowerCase() !== 'inventory') return `No table ${m[2]}: there is inventory.`;
  const cols = m[1]!.trim() === '*' ? ['id', 'name', 'path', 'kind', 'make', 'says', 'spec'] : m[1]!.split(',').map((c) => c.trim().toLowerCase());
  const conds = m[3] ? m[3].split(/\s+and\s+/i).map((c) => { const x = /^(\w+)\s*(=|!=|like)\s*'([^']*)'$/i.exec(c.trim()); return x ? { col: x[1]!.toLowerCase(), op: x[2]!.toLowerCase(), v: x[3]! } : null; }) : [];
  if (conds.some((c) => !c)) return "WHERE reads column = 'value', column != 'value' and column LIKE 'pattern%', joined by AND.";
  const like = (s: string, p: string) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i').test(s);
  const out = rows.filter((r) => conds.every((c) => { const v = r[c!.col] ?? ''; return c!.op === '=' ? v.toLowerCase() === c!.v.toLowerCase() : c!.op === '!=' ? v.toLowerCase() !== c!.v.toLowerCase() : like(v, c!.v); }));
  return out.slice(0, Number(m[4] ?? 50)).map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? ''])));
}

// The engineering compiler: a design carried through stages as one record, every stage adding to it and none overwriting
// it (each change a new revision), every check kept with who made it, its evidence and a hash of what it checked, so a
// check whose inputs have since changed no longer counts. After the 30-stage CAD compiler the user gave (2026-10-30;
// docs/COMPILER.md maps each of its stages to what does it here, and says plainly which are not built yet). Its five rules
// held as code: geometry is the source of truth (checks read the thing, not what is said of it); every requirement is
// traceable (an id, and the output and limit that test it); a change invalidates what depended on it (hashes); no stage
// certifies its own output (a check names the engine that made it, and a release counts only checks by an engine other
// than the maker); what is unknown stays unknown (UNVERIFIED, never a guess counted as a pass).
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import type { Part } from './kits';
import { designOf, hash } from './assembly';
import { massOf } from './mass';
import { layout } from './make/space';
import { contracts } from './make/critic';
import { rulesOf } from './make/rules';
import { block as blockById, portsOf, defaultsOf } from './blocks';
import { runBlock, runnerOf, stable } from './dataflow';
import { solidsOf, solidsSaid } from './brep';

export type Status = 'PASS' | 'FAIL' | 'UNVERIFIED' | 'BLOCKED';
export interface Requirement { id: string; says: string; output: string; op: '=' | '<' | '>' | '<=' | '>='; value: number; unit: string; tol?: number }
export interface Component { id: string; name: string; parent: string; qty: number; material: string; method: string; standard: string; mass: number; geometry: 'mesh' | 'solid'; source: string }
export interface Iface { id: string; kind: string; parent: string; child: string; ok: boolean; rows: string[] }
export interface Param { name: string; value: number | string; unit: string; status: 'verified' | 'derived' | 'estimated' | 'unknown'; source: string }
export interface Check { stage: number; name: string; status: Status; evidence: string; by: string; input: string; requirement?: string; /** what it checks, where a later check of the same replaces it ("exact-solids") */ key?: string }
export interface DesignRecord {
  project: string; version: number; made: string;
  inputs: { kind: string; ref: string }[]; unknowns: string[];
  requirements: Requirement[]; components: Component[]; interfaces: Iface[]; params: Param[]; checks: Check[];
  revisions: { version: number; stage: number; what: string; hash: string }[];
  release?: { status: string; why: string[] };
  /** what the automated stages could not settle and a person must (stage 27's HUMAN_REVIEW_REQUIRED) */ review?: string[];
}
/** The design the record is of, as a key: what a check's input hash is made of, so a changed thing voids its checks. */
const keyOfThing = (t: Part | undefined) => (t ? designOf(t).key : 'none');
/** A new revision of the record: a copy with what this stage changed said, never the old one edited. */
function revise(r: DesignRecord, stage: number, what: string, change: (n: DesignRecord) => void): DesignRecord {
  const n: DesignRecord = JSON.parse(JSON.stringify(r)); change(n); n.version = r.version + 1;
  n.revisions.push({ version: n.version, stage, what, hash: hash(JSON.stringify({ ...n, revisions: [] })) }); return n;
}
const recOf = (v: unknown): DesignRecord => { const r = v as DesignRecord; if (!r || !Array.isArray(r.checks) || !Array.isArray(r.requirements)) throw new Error('wire a design record in (Compile: start)'); return r; };
const partOf = (v: unknown): Part => { const p = v as Part; if (!p || typeof p.name !== 'string') throw new Error('wire the thing in'); return p; };

/** Requirements as lines: "R1: rate = 40000 N/m ±2 %: the spring's stiffness", "R2: worst > 1.3: its least factor of safety". */
export function requirementsOf(text: string): Requirement[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l, k) => {
    const m = /^(?:(\w+)\s*:\s*)?(\S+)\s*(<=|>=|=|<|>)\s*(-?[\d.eE+-]+)\s*([^:±]*?)\s*(?:±\s*([\d.]+)\s*%)?\s*(?::\s*(.*))?$/.exec(l);
    if (!m) throw new Error(`"${l}": a requirement is "id: output op value unit ±tol %: what it is for"`);
    return { id: m[1] ?? `R${k + 1}`, output: m[2]!, op: m[3] as Requirement['op'], value: Number(m[4]), unit: (m[5] ?? '').trim(), ...(m[6] ? { tol: Number(m[6]) / 100 } : {}), says: (m[7] ?? '').trim() };
  });
}
/** Whether a value meets a requirement: PASS or FAIL, and the margin; UNVERIFIED where there is no value to judge. */
export function judgeRequirement(q: Requirement, y: unknown): { status: Status; evidence: string } {
  const v = Number(y); if (y === undefined || !Number.isFinite(v)) return { status: 'UNVERIFIED', evidence: `no value for ${q.output}` };
  const tol = q.tol ?? 0.005, ok = q.op === '=' ? Math.abs(v - q.value) <= tol * Math.abs(q.value || 1) : q.op === '<' ? v < q.value : q.op === '>' ? v > q.value : q.op === '<=' ? v <= q.value : v >= q.value;
  return { status: ok ? 'PASS' : 'FAIL', evidence: `${q.output} = ${+v.toPrecision(5)}${q.unit ? ` ${q.unit}` : ''} against ${q.op} ${q.value}${q.op === '=' ? ` ±${+(tol * 100).toPrecision(2)} %` : ''}` };
}
/** The release gate (the user's Loop F): any mandatory FAIL rejects; any UNVERIFIED or BLOCKED blocks; all automated
 *  checks passing makes a release candidate, never an approval (that needs people, and is not this code's to give). */
export function releaseOf(r: DesignRecord, thing?: Part): { status: string; why: string[] } {
  // (a requirement's newest check stands for it, and any check's that says what it checks (its key): a correction's re-check replaces the check it corrected, which stays in
  // the record as history)
  const what = (c: Check, k: number) => c.requirement ?? c.key ?? `#${k}`, now = keyOfThing(thing), newest = new Map(r.checks.map((c, k) => [what(c, k), k])), live = r.checks.filter((c, k) => (!thing || c.input === now || c.input === 'record') && newest.get(what(c, k)) === k), stale = r.checks.filter((c) => thing && c.input !== now && c.input !== 'record').length;
  const fail = live.filter((c) => c.status === 'FAIL'), open = live.filter((c) => c.status === 'UNVERIFIED' || c.status === 'BLOCKED'), unchecked = r.requirements.filter((q) => !live.some((c) => c.requirement === q.id));
  const why = [...fail.map((c) => `FAIL (stage ${c.stage}) ${c.name}: ${c.evidence}`), ...open.map((c) => `${c.status} (stage ${c.stage}) ${c.name}: ${c.evidence}`), ...unchecked.map((q) => `UNVERIFIED ${q.id}: nothing has checked it`), ...(stale ? [`${stale} check(s) made on an earlier design no longer count`] : [])];
  for (const w of r.review ?? []) why.push(`HUMAN_REVIEW_REQUIRED: ${w}`);
  return { status: fail.length ? 'REJECTED' : open.length || unchecked.length || r.review?.length ? 'BLOCKED' : 'RELEASE CANDIDATE (awaiting human engineering approval)', why };
}

// ---- the 30 stages, and what does each here ------------------------------------------------------------------------------
/** Each of the user's 30 stages: the node that does it here, or what it waits on. Said in the package so its coverage is seen. */
export const STAGES: { n: number; name: string; here: string; state: 'built' | 'partial' | 'not built' }[] = [
  { n: 1, name: 'Concept ingestion', here: 'compile.start (inputs, unknowns)', state: 'built' },
  { n: 2, name: 'Reference geometry and calibration', here: 'photo.load, photo.features, camera.solve, photo.outline', state: 'built' },
  { n: 3, name: 'Requirements', here: 'compile.start (register with ids, each tied to an output and a limit)', state: 'built' },
  { n: 4, name: 'Architecture and decomposition', here: 'the makers\' trees; research.parts, research.gap', state: 'partial' },
  { n: 5, name: 'Interface control', here: 'ports and interfaces on parts; compile.bom lists and checks them (critic contracts)', state: 'partial' },
  { n: 6, name: 'Hierarchical BOM', here: 'compile.bom', state: 'built' },
  { n: 7, name: 'BOM audit', here: 'compile.bom (material, method, standard, interfaces each checked)', state: 'built' },
  { n: 8, name: 'Parameters (verified, derived, estimated, unknown)', here: 'compile.start params, by status and source', state: 'partial' },
  { n: 9, name: 'Datums and coordinates', here: 'frames (assembly.ts frame, frames.of)', state: 'partial' },
  { n: 10, name: 'Parametric geometry (CAD kernel)', here: 'makers by process; compile.solids and solid.exact make every piece an exact OpenCascade solid (brep.ts); not yet: hollow skins, dense windings, fillets as features', state: 'partial' },
  { n: 11, name: 'Assembly and constraint solving', here: 'mate, assemble, onto, place.solve; no simultaneous solver yet (road map step 4)', state: 'partial' },
  { n: 12, name: 'Solid and topology validation', here: 'compile.solids: each solid checked by the kernel (BRepCheck_Analyzer), its volume against the BOM\'s mass', state: 'built' },
  { n: 13, name: 'Interference and clearance', here: 'compile.verify (rules checker, triangle against triangle)', state: 'built' },
  { n: 14, name: 'Kinematics', here: 'check.turning, sim (Jolt), motion.ts', state: 'partial' },
  { n: 15, name: 'Tolerances and GD&T', here: 'fits in ISO 286 terms in the critic only', state: 'not built' },
  { n: 16, name: 'Thermal and environment', here: 'heat gate, graph flow, bend (thermal growth)', state: 'partial' },
  { n: 17, name: 'Structural', here: 'loads.ts, load.spring, load.engine, bend (frame FE)', state: 'partial' },
  { n: 18, name: 'Fatigue and vibration', here: 'not built', state: 'not built' },
  { n: 19, name: 'Multiphysics', here: 'laws in the book; no coupled solver', state: 'not built' },
  { n: 20, name: 'Design for manufacture', here: 'makers by process, made.of; no tool-reach or draft checks yet', state: 'partial' },
  { n: 21, name: 'Cost, weight, optimisation', here: 'fit.target, trade.offs, what.matters, variants', state: 'built' },
  { n: 22, name: 'Drawings', here: 'not built', state: 'not built' },
  { n: 23, name: 'Export (STEP, STL, 3MF)', here: 'export.files (brep.ts): STEP AP242 named and coloured, STL, 3MF, glTF, BOM CSV; its STEP read back and counted; not yet: a STEP assembly tree', state: 'partial' },
  { n: 24, name: 'Reference comparison', here: 'check.accuracy, view.compare, compare.outline', state: 'built' },
  { n: 25, name: 'Independent audits', here: 'compile.verify (each check names its engine); ai.judge (a blind model)', state: 'partial' },
  { n: 26, name: 'Conflict resolution', here: 'not built', state: 'not built' },
  { n: 27, name: 'Recursive correction', here: 'compile.correct (failed requirements: What matters, then Fit to a target, re-checked by the block alone; rounds, rollback, repeated state, HUMAN_REVIEW_REQUIRED); auto.loop (rules repairs); not yet: the drawn thing rebuilt with the corrected values', state: 'partial' },
  { n: 28, name: 'Final regression', here: 'compile.release (only checks on the current design count)', state: 'built' },
  { n: 29, name: 'Release gate', here: 'compile.release', state: 'built' },
  { n: 30, name: 'Delivery and archive', here: 'compile.release (the record, its revisions, BOM, unknowns, coverage); no CAD files yet', state: 'partial' },
];

// ---- nodes -------------------------------------------------------------------------------------------------------------
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
const node = (b: Omit<BlockDef, 'version' | 'by' | 'pure'>) => register({ version: 1, by: 'built in', pure: true, ...b } as BlockDef);
const CODE = { scheme: 'ACM CCS 2012' as const, code: '10010583.10010682', label: 'Hardware: electronic design automation (design flows and verification)' };
const REF = ['ISO/IEC/IEEE 15288:2023, Systems and software engineering: system life cycle processes (requirements, verification, configuration)', 'ASME Y14.41-2019, Digital product definition data practices'];
const tableOf = (r: DesignRecord) => r.checks.map((c) => ({ stage: c.stage, check: c.name, status: c.status, by: c.by, evidence: c.evidence }));

node({ id: 'compile.start', name: 'Compile: start (inputs, requirements, parameters)', kind: 'generator', ability: 'transform', domains: ['pipelines', 'mechanical', 'vehicles', 'manufacturing'],
  spec: { gloss: 'What is being made, from what, held to which requirements, from which parameters, and what is not known?', discipline: 'pipeline.verification', role: 'data source', codes: [CODE], model: { equations: ['a requirement: id, an output, an operator, a value and unit, a tolerance'], class: 'data', time: 'steady', linear: true, method: 'parsed into the design record, version 1', references: REF } },
  says: 'Stages 1, 3 and 8 of the compiler: a design record begun for a thing: what it came from, its requirements (a line each: "R1: rate = 40000 N/m ±2 %: what it is for"), its parameters with how each is known (verified, derived, estimated or unknown, and from where), and what is not known yet. Every later stage adds to this record, and none overwrites it',
  settings: [{ key: 'project', label: 'Project', type: 'text', default: 'a design' }, { key: 'requirements', label: 'Requirements, a line each: id: output op value unit ±tol %: what for', type: 'code', default: 'R1: mass < 1 kg: light enough to carry' },
    { key: 'params', label: 'Parameters, a line each: name = value unit | verified, derived, estimated or unknown | source', type: 'code', default: '' }, { key: 'unknowns', label: 'Not known yet, a line each', type: 'code', default: '' }, { key: 'source', label: 'Made from (a reference, a record, a concept)', type: 'text', default: '' }],
  ports: { inputs: [P('thing', 'part', { optional: true })], outputs: [P('record', 'record'), P('requirements', 'table'), P('says', 'text')] },
  run: (i, c) => {
    const reqs = requirementsOf(String(c.set.requirements ?? '')), params: Param[] = String(c.set.params ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [a, st, src] = l.split('|').map((x) => x.trim()); const m = /^(\S+)\s*=\s*(\S+)\s*(.*)$/.exec(a ?? ''); if (!m) throw new Error(`"${l}": a parameter is "name = value unit | status | source"`);
      const status = (st || 'unknown') as Param['status']; if (!['verified', 'derived', 'estimated', 'unknown'].includes(status)) throw new Error(`"${st}": a parameter is verified, derived, estimated or unknown`); const v = Number(m[2]); return { name: m[1]!, value: Number.isFinite(v) ? v : m[2]!, unit: m[3]!.trim(), status, source: src || (status === 'verified' ? 'not said' : '') }; });
    const thing = i.thing as Part | undefined, unk = String(c.set.unknowns ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    // (a parameter said verified without a source is not verified: the record says so)
    for (const p of params) if (p.status === 'verified' && (!p.source || p.source === 'not said')) unk.push(`${p.name}: said verified, but no source`);
    const rec: DesignRecord = { project: String(c.set.project), version: 1, made: new Date(0).toISOString(), inputs: [...(c.set.source ? [{ kind: 'source', ref: String(c.set.source) }] : []), ...(thing ? [{ kind: 'thing', ref: `${thing.name} (design ${keyOfThing(thing).slice(0, 8)})` }] : [])], unknowns: unk, requirements: reqs, components: [], interfaces: [], params, checks: [], revisions: [] };
    rec.revisions.push({ version: 1, stage: 1, what: 'begun', hash: hash(JSON.stringify(rec)) });
    return { record: rec, requirements: reqs.map((q) => ({ id: q.id, output: q.output, need: `${q.op} ${q.value} ${q.unit}${q.tol ? ` ±${q.tol * 100} %` : ''}`, for: q.says })), says: `${rec.project}: ${reqs.length} requirement${reqs.length === 1 ? '' : 's'}, ${params.length} parameter${params.length === 1 ? '' : 's'} (${params.filter((p) => p.status === 'verified').length} verified), ${unk.length} not known` };
  },
  tests: [{ inputs: {}, set: { requirements: 'R1: rate = 40000 N/m ±2 %: stiff enough\nR2: worst > 1.3', params: 'd = 0.0036 m | derived | fitted\nG = 81.7e9 Pa | verified' }, outputs: { requirements: [{ id: 'R1', output: 'rate', need: '= 40000 N/m ±2 %', for: 'stiff enough' }, { id: 'R2', output: 'worst', need: '> 1.3 ', for: '' }] } }] });

node({ id: 'compile.bom', name: 'Compile: bill of materials and its audit', kind: 'critic', ability: 'check', domains: ['pipelines', 'mechanical', 'manufacturing', 'vehicles'],
  spec: { gloss: 'What is it made of, piece by piece, and is every piece fully said?', discipline: 'pipeline.verification', role: 'assessment', codes: [CODE], model: { equations: ['a component for each design under each parent, its count the pieces of that design there'], class: 'data', time: 'steady', linear: true, method: 'read from the thing\'s tree; interfaces paired by the critic\'s contracts', references: REF } },
  says: 'Stages 6 and 7: the thing read into a hierarchical bill of materials (each component: its parent, how many, its material, how it is made, the standard it is to, its mass, and that its geometry is a mesh, not yet a solid), and audited: a component with no material, no way of being made or no standard where it should have one is said, and every interface (a shaft in its bore, studs in their holes) checked by the critic\'s contracts. Read from the geometry, never typed',
  ports: { inputs: [P('record', 'record'), P('thing', 'part')], outputs: [P('record', 'record'), P('bom', 'table'), P('findings', 'table'), P('says', 'text')] },
  run: (i) => {
    const rec = recOf(i.record), t = partOf(i.thing), comps = new Map<string, Component>(), input = keyOfThing(t);
    const walk = (p: Part, parent: string) => { const id = `${parent}/${p.name}`, key = `${parent}|${designOf(p).key}`, was = comps.get(key);
      if (was) { was.qty++; return; }
      const made = (p as Part & { made?: { by?: string } }).made?.by ?? (p as Part & { make?: string }).make, item = (p as Part & { item?: string }).item;
      comps.set(key, { id, name: p.name, parent: parent || '(root)', qty: 1, material: p.mat ?? '', method: made ?? '', standard: item ?? '', mass: +massOf(p).toPrecision(4), geometry: 'mesh', source: (p as Part & { published?: unknown }).published ? 'published figures' : 'drawn from its maker' });
      for (const q of p.parts ?? []) walk(q, id); };
    walk(t, '');
    const bom = [...comps.values()], leaves = bom.filter((c) => !bom.some((d) => d.parent === c.id));
    const ifaces: Iface[] = contracts(layout(t)).map((k, n) => ({ id: `I${n + 1}`, kind: k.kind, parent: k.provider, child: k.requirer, ok: k.ok, rows: k.rows.map((r) => `${r.what}: ${r.required} needed, ${r.provided} given${r.ok ? '' : ' (no)'}`) }));
    const noMat = leaves.filter((c) => !c.material), noMethod = leaves.filter((c) => !c.method && !c.material), badIf = ifaces.filter((f) => !f.ok);
    const checks: Check[] = [
      { stage: 7, name: 'every piece has a material', status: noMat.length ? 'FAIL' : 'PASS', evidence: noMat.length ? `${noMat.length} of ${leaves.length} pieces have none: ${noMat.slice(0, 4).map((c) => c.name).join(', ')}` : `${leaves.length} pieces, each with its material`, by: 'BOM audit (compiler.ts, read from the tree)', input },
      { stage: 7, name: 'every piece can be made', status: noMethod.length ? 'UNVERIFIED' : 'PASS', evidence: noMethod.length ? `${noMethod.length} pieces with neither a process nor a material to read one from` : 'each piece has its process or a material that says one', by: 'BOM audit (compiler.ts)', input },
      { stage: 5, name: 'every interface fits its mate', status: badIf.length ? 'FAIL' : ifaces.length ? 'PASS' : 'UNVERIFIED', evidence: badIf.length ? badIf.slice(0, 3).map((f) => `${f.child} on ${f.parent}: ${f.rows.filter((r) => r.endsWith('(no)')).join('; ')}`).join(' | ') : ifaces.length ? `${ifaces.length} interfaces, each met` : 'it declares no interfaces to check', by: 'interface contracts (make/critic.ts)', input },
      { stage: 10, name: 'geometry is exact solids', status: 'BLOCKED', evidence: 'its geometry is meshes until Compile: exact solids makes them solids', by: 'compiler.ts', input, key: 'exact-solids' },
    ];
    const out = revise(rec, 6, `bill of materials: ${bom.length} components, ${ifaces.length} interfaces`, (n) => { n.components = bom; n.interfaces = ifaces; n.checks.push(...checks); });
    return { record: out, bom: bom.map((c) => ({ id: c.id, qty: c.qty, material: c.material || '?', method: c.method || '?', standard: c.standard, kg: c.mass })), findings: checks.map((c) => ({ stage: c.stage, check: c.name, status: c.status, evidence: c.evidence })), says: `${bom.length} components (${leaves.length} pieces), ${ifaces.length} interfaces; ${checks.filter((c) => c.status === 'FAIL').length} failed, ${checks.filter((c) => c.status === 'BLOCKED' || c.status === 'UNVERIFIED').length} open` };
  } });

node({ id: 'compile.verify', name: 'Compile: verify (interference, requirements)', kind: 'critic', ability: 'check', domains: ['pipelines', 'mechanical', 'manufacturing', 'vehicles'],
  spec: { gloss: 'Does the thing as drawn meet its requirements, and does anything run into anything?', discipline: 'pipeline.verification', role: 'assessment', codes: [CODE], model: { equations: ['a requirement passes where its output meets its limit; unverified where nothing gives the output'], class: 'analytical', time: 'steady', linear: false, method: 'the rules checker on the drawn surfaces (triangle against triangle); each requirement against the outputs wired in', references: [...REF, 'Möller, A fast triangle-triangle intersection test, J. Graphics Tools 2, 25 (1997)'] } },
  says: 'Stages 13 and 17 checked by engines other than the one that made the thing: every surface against every other (the rules checker: interference, clearance, heat), and each requirement against the outputs wired in (a load case\'s factor of safety, a maker\'s rate or mass). A requirement nothing gives an output for stays UNVERIFIED; nothing is guessed',
  settings: [{ key: 'rules', label: 'Check interference and clearance', type: 'choice', default: 'yes', choices: ['yes', 'no'] }, { key: 'take', label: 'Values wired in, by the outputs the requirements name (a space between)', type: 'text', default: '' }],
  // (an input for each value the requirements are checked against, named as the requirement names it: a load case's
  // worst wired into "worst"; its mass is the thing's own unless one is wired)
  ports: (st) => ({ inputs: [P('record', 'record'), P('thing', 'part', { optional: true, label: 'the thing (without it, only the values wired in are checked)' }), ...String(st.take ?? '').split(/[\s,]+/).filter(Boolean).map((n) => P(n, 'number', { optional: true })), P('outputs', 'record', { optional: true, label: 'or a record of values by name' })], outputs: [P('record', 'record'), P('checks', 'table'), P('says', 'text')] }),
  run: (i, c) => {
    const taken = Object.fromEntries(String(c.set.take ?? '').split(/[\s,]+/).filter(Boolean).filter((n) => i[n] !== undefined).map((n) => [n, i[n]]));
    const rec = recOf(i.record), t = i.thing === undefined ? undefined : partOf(i.thing), outs: Record<string, unknown> = { ...(t ? { mass: massOf(t) } : {}), ...((i.outputs as Record<string, unknown>) ?? {}), ...taken }, input = t ? keyOfThing(t) : 'record', checks: Check[] = [];
    if (t && c.set.rules !== 'no') { const r = rulesOf(t), by = (k: string) => r.findings.filter((f) => (f as { kind?: string }).kind === k || (f as { rule?: string }).rule === k);
      const inter = by('interference'), all = r.findings;
      checks.push({ stage: 13, name: 'nothing runs into anything', status: all.length ? 'FAIL' : 'PASS', evidence: all.length ? `${all.length} findings over ${r.pieces} meshes, ${inter.length} interference: ${all.slice(0, 2).map((f) => (f as { says?: string }).says ?? '').join('; ')}` : `${r.pieces} meshes, none crossing, none too close, nothing too hot`, by: 'rules checker (make/rules.ts)', input }); }
    for (const q of rec.requirements) { const j = judgeRequirement(q, outs[q.output]); checks.push({ stage: 17, name: `${q.id}${q.says ? `: ${q.says}` : ''}`, status: j.status, evidence: j.evidence, by: 'requirement check (compiler.ts, against the outputs wired in)', input, requirement: q.id }); }
    const out = revise(rec, 13, `verified: ${checks.length} checks`, (n) => n.checks.push(...checks));
    return { record: out, checks: checks.map((x) => ({ stage: x.stage, check: x.name, status: x.status, evidence: x.evidence })), says: `${checks.filter((x) => x.status === 'PASS').length} pass, ${checks.filter((x) => x.status === 'FAIL').length} fail, ${checks.filter((x) => x.status === 'UNVERIFIED').length} unverified` };
  } });

node({ id: 'compile.solids', name: 'Compile: exact solids (B-rep)', kind: 'critic', ability: 'check', domains: ['pipelines', 'mechanical', 'manufacturing', 'vehicles'],
  spec: { gloss: 'Is its geometry exact solids, each valid, and does the mass their volumes give agree with the bill of materials?', discipline: 'pipeline.verification', role: 'assessment', codes: [CODE], model: { equations: ['m = Σ ρ V over the pieces made solids, against the BOM\'s mass of the same pieces'], class: 'analytical', time: 'steady', linear: true, method: 'Exact solids (brep.ts, OpenCascade): each piece made a solid, checked by the kernel, measured', references: [...REF, 'OpenCascade Technology 7.x, Modeling Algorithms user guide'] } },
  says: 'Stages 10 and 12: the thing made exact solids by a CAD kernel other than the code that drew it, each checked valid by it, and the mass their volumes give set against the bill of materials\' for the same pieces. Every piece made and valid passes stage 10; any not made blocks it (said, with why); any not valid fails it. The mass agrees within 1 %, or fails, with the pieces that differ most',
  ports: { inputs: [P('record', 'record'), P('thing', 'part')], outputs: [P('record', 'record'), P('rows', 'table'), P('says', 'text')] },
  run: async (i) => {
    const rec = recOf(i.record), t = partOf(i.thing), input = keyOfThing(t), s = await solidsOf(t), said = solidsSaid(s), off = s.ourKg > 0 ? s.kg / s.ourKg - 1 : 0;
    const checks: Check[] = [
      { stage: 10, name: 'geometry is exact solids', status: s.invalid ? 'FAIL' : s.failed ? 'BLOCKED' : 'PASS', evidence: said.says, by: 'Exact solids (brep.ts, OpenCascade)', input, key: 'exact-solids' },
      { stage: 12, name: 'mass from exact volumes agrees with the BOM', status: Math.abs(off) <= 0.01 ? 'PASS' : 'FAIL', evidence: `${s.kg.toPrecision(5)} kg from ${s.made} solids against ${s.ourKg.toPrecision(5)} kg for them (${(off * 100).toFixed(2)} %)`, by: 'Exact solids (brep.ts, OpenCascade)', input, key: 'exact-mass' },
    ];
    const out = revise(rec, 10, `exact solids: ${s.made} of ${s.rows.length}`, (n) => n.checks.push(...checks));
    return { record: out, rows: said.rows, says: said.says };
  } });

/** A requirement as a goal for Fit to a target: "worst > 1.3" (its limits as fit.target reads them). */
const goalOf = (q: Requirement) => `${q.output} ${q.op === '<=' ? '<' : q.op === '>=' ? '>' : q.op} ${q.value}`;
node({ id: 'compile.correct', name: 'Compile: correct (failed requirements fitted, re-checked)', kind: 'solver', ability: 'optimise', domains: ['pipelines', 'mechanical', 'vehicles', 'manufacturing'],
  spec: { gloss: 'Which design values make the failed requirements pass without failing the rest, or else, what must a person decide?', discipline: 'pipeline.verification', role: 'numerical solver', codes: [CODE, { scheme: 'MSC2020', code: '90C56', label: 'Derivative-free methods and methods using generalized derivatives' }],
    model: { equations: ['the failed requirements\' outputs: the values that move them (elementary effects, What matters)', 'every requirement a goal at once (Fit to a target), so one is not traded for another', 'a round kept only if it fails fewer than the last; a state seen before ends it'], class: 'analytical', time: 'steady', linear: false, method: 'What matters, then Fit to a target over the values it names; the fitted values run again through the block on its own and judged afresh (the fit does not certify itself); up to so many rounds, each with twice the trials', references: [...REF, 'Morris, Factorial sampling plans for preliminary computational experiments, Technometrics 33, 161 (1991)'] } },
  says: 'Stage 27: the requirements the record says fail, corrected by the design values that reach them. What matters is asked which of the values offered move the failed outputs (what moves nothing is left alone); Fit to a target moves those, holding every requirement at once; the values found are run through the block again on its own and every requirement judged afresh, a new check each (the old ones stay, as history). A round is kept only if it fails fewer than the one before (else rolled back); a state seen before stops it; so many rounds at most. What it cannot fix is marked HUMAN_REVIEW_REQUIRED, and the release gate blocks on it. The values it chose join the record\'s parameters as derived, from this stage',
  settings: [{ key: 'block', label: 'The block the requirements\' outputs come from (its id)', type: 'text', default: 'load.engine' }, { key: 'vary', label: 'Design values it may move, each a line: name from..to; chosen: name a|b|c', type: 'code', default: 'bore 0.07..0.09\nstroke 0.08..0.1' },
    { key: 'rounds', label: 'At most, rounds', type: 'number', default: 3 }, { key: 'most', label: 'Trials in its first round', type: 'number', default: 60 }, { key: 'blockSet', label: 'The block\'s other settings (JSON)', type: 'code', default: '{}' }],
  ports: { inputs: [P('record', 'record')], outputs: [P('record', 'record'), P('values', 'record', { label: 'the design values it chose' }), P('rounds', 'table', { label: 'each round: what it tried, what failed' }), P('checks', 'table'), P('says', 'text')] },
  run: async (i, c) => {
    const rec = recOf(i.record), id = String(c.set.block), d = blockById(id); if (!d) throw new Error(`no block "${id}"`);
    let set0: Record<string, unknown>; try { set0 = JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>; } catch { throw new Error('its settings are not JSON'); }
    const last = (q: Requirement) => [...rec.checks].reverse().find((x) => x.requirement === q.id), failed = rec.requirements.filter((q) => last(q)?.status === 'FAIL');
    if (!failed.length) return { record: rec, values: {}, rounds: [], checks: tableOf(rec), says: 'no requirement fails: nothing to correct' };
    const lines = String(c.set.vary ?? '').split('\n').map((l) => l.trim()).filter(Boolean), goals = rec.requirements.map(goalOf).join('\n');
    // (what moves the failed outputs: the rest is left as it is)
    const wm = await runBlock('what.matters', { block: id, vary: lines.join('\n'), watch: [...new Set(failed.map((q) => q.output))].join(' '), paths: 6, blockSet: JSON.stringify(set0) });
    const still = new Set((wm.nothing as string[] | undefined) ?? []), moved = lines.filter((l) => !still.has(l.split(/\s+/)[0]!));
    // (the fitted values run through the block on its own, its inputs as inputs and its settings as settings, and judged)
    const ins = new Set(portsOf(d, { ...defaultsOf(d), ...set0 }).inputs.map((q) => q.name)), run = runnerOf(d);
    const judge = async (v: Record<string, unknown>) => { const inp = Object.fromEntries(Object.entries(v).filter(([k]) => ins.has(k))), st = { ...defaultsOf(d), ...set0, ...Object.fromEntries(Object.entries(v).filter(([k]) => !ins.has(k))) }, o = await run(inp, st);
      // (what holds it back, where the block says each check's factor: its least)
      const rs = Array.isArray((o as Record<string, unknown>).rows) ? ((o as Record<string, unknown>).rows as { what?: string; factor?: number }[]).filter((x) => typeof x.factor === 'number') : [], low = rs.length ? rs.reduce((a, b) => (b.factor! < a.factor! ? b : a)) : undefined;
      return rec.requirements.map((q) => ({ q, ...judgeRequirement(q, (o as Record<string, unknown>)[q.output]), ...(low && Math.abs(Number((o as Record<string, unknown>)[q.output]) - low.factor!) <= 0.01 * low.factor! ? { limit: `it is the least factor of ${rs.length}, ${low.what}` } : {}) })); };
    const rows: Record<string, unknown>[] = [], seen = new Set<string>(); let best: { v: Record<string, unknown>; js: Awaited<ReturnType<typeof judge>> } | undefined, why = '';
    if (!moved.length) why = `none of the values offered (${lines.map((l) => l.split(/\s+/)[0]).join(', ')}) moves ${failed.map((q) => q.output).join(' or ')}`;
    for (let r = 1; moved.length && r <= Number(c.set.rounds ?? 3); r++) {
      const fit = await runBlock('fit.target', { block: id, vary: moved.join('\n'), goals, most: Number(c.set.most ?? 60) * 2 ** (r - 1), blockSet: JSON.stringify(set0) }), v = (fit.best ?? {}) as Record<string, unknown>, key = stable(v);
      if (seen.has(key)) { rows.push({ round: r, tried: key, fails: '', kept: 'no: a state seen before; stopped' }); why ||= 'it came back to values already tried'; break; } seen.add(key);
      const js = await judge(v), nf = js.filter((x) => x.status !== 'PASS').length, was = best ? best.js.filter((x) => x.status !== 'PASS').length : failed.length + 1;
      const keep = nf < was; rows.push({ round: r, tried: key, fails: js.filter((x) => x.status !== 'PASS').map((x) => x.q.id).join(' ') || 'none', kept: keep ? 'yes' : 'no: no better than the last, rolled back' });
      if (keep) best = { v, js }; if (best && best.js.every((x) => x.status === 'PASS')) break;
    }
    const checks: Check[] = [], review: string[] = [];
    if (best) for (const x of best.js) checks.push({ stage: 27, name: `${x.q.id}${x.q.says ? `: ${x.q.says}` : ''} (corrected)`, status: x.status, evidence: `${x.evidence}, at ${Object.entries(best.v).map(([k, y]) => `${k} ${typeof y === 'number' ? +y.toPrecision(4) : y}`).join(', ')} (the ${d.name} run again on its own; the drawn thing not yet rebuilt with them)`, by: 'correction (compiler.ts: What matters, Fit to a target, then the block alone)', input: 'record', requirement: x.q.id });
    const left = best ? best.js.filter((x) => x.status !== 'PASS').map((x) => x.q) : failed, limitOf = (q: Requirement) => (best?.js.find((x) => x.q === q) as { limit?: string } | undefined)?.limit;
    for (const q of left) review.push(`${q.id} (${goalOf(q)}) not reached by ${moved.map((l) => l.split(/\s+/)[0]).join(', ') || 'anything offered'}${why ? `: ${why}` : ''}${limitOf(q) ? `; ${limitOf(q)}` : ''}`);
    const out = revise(rec, 27, best ? `corrected: ${Object.keys(best.v).join(', ')} moved; ${left.length} left for review` : 'not corrected', (n) => {
      n.checks.push(...checks); if (review.length) n.review = [...(n.review ?? []), ...review];
      if (best) for (const [k, y] of Object.entries(best.v)) { n.params = n.params.filter((p) => p.name !== k); n.params.push({ name: k, value: typeof y === 'number' ? +y.toPrecision(6) : String(y), unit: '', status: 'derived', source: 'stage 27 correction: fitted to the requirements' }); } });
    return { record: out, values: best?.v ?? {}, rounds: rows, checks: checks.map((x) => ({ stage: x.stage, check: x.name, status: x.status, evidence: x.evidence })),
      says: `${failed.length} failed (${failed.map((q) => q.id).join(', ')}); moved ${moved.map((l) => l.split(/\s+/)[0]).join(', ') || 'nothing'}${still.size ? ` (${[...still].join(', ')} ${still.size === 1 ? 'moves' : 'move'} nothing failed, left alone)` : ''}; ${rows.length} round${rows.length === 1 ? '' : 's'}; ${left.length ? `HUMAN_REVIEW_REQUIRED: ${left.map((q) => q.id).join(', ')}` : 'every requirement passes'}` };
  },
  tests: [{ inputs: { record: { project: 'x', version: 1, made: '', inputs: [], unknowns: [], requirements: [{ id: 'R1', says: '', output: 'worst', op: '>', value: 1, unit: '' }], components: [], interfaces: [], params: [], checks: [{ stage: 17, name: 'R1', status: 'PASS', evidence: '', by: 'x', input: 'record', requirement: 'R1' }], revisions: [] } }, outputs: { says: 'no requirement fails: nothing to correct' } }] });

node({ id: 'compile.release', name: 'Compile: release gate and package', kind: 'critic', ability: 'check', domains: ['pipelines', 'mechanical', 'manufacturing', 'vehicles'],
  spec: { gloss: 'May this design be released, and if not, what stops it?', discipline: 'pipeline.verification', role: 'assessment', codes: [CODE], model: { equations: ['REJECTED if any check FAILs; BLOCKED if any is UNVERIFIED or BLOCKED or a requirement is unchecked; else RELEASE CANDIDATE'], class: 'data', time: 'steady', linear: true, method: 'only checks on the current design count (by its design hash); approval is a person\'s', references: REF } },
  says: 'Stages 28 to 30: the release gate over every check in the record that was made on the thing as it is now (a check on an earlier design no longer counts): rejected where anything fails, blocked where anything is unverified or not built, a release candidate only where every automated check passes, never approved (that is a person\'s). And the package: the record with all its revisions, the bill of materials, what is not known, every check, and which of the 30 stages are done here and which are not',
  ports: { inputs: [P('record', 'record'), P('thing', 'part', { optional: true })], outputs: [P('status', 'text'), P('why', 'list<text>'), P('checks', 'table'), P('stages', 'table'), P('package', 'record'), P('says', 'text')] },
  run: (i) => { const rec = recOf(i.record), t = i.thing as Part | undefined, rel = releaseOf(rec, t), out = revise(rec, 29, `release: ${rel.status}`, (n) => { n.release = rel; });
    const built = STAGES.filter((s) => s.state === 'built').length, part = STAGES.filter((s) => s.state === 'partial').length;
    return { status: rel.status, why: rel.why, checks: tableOf(out), stages: STAGES.map((s) => ({ stage: s.n, name: s.name, here: s.here, state: s.state })), package: { record: out, bom: out.components, unknowns: out.unknowns, stages: STAGES },
      says: `${rel.status}: ${rel.why.length ? rel.why.slice(0, 2).join('; ') : 'every automated check passes'}; stages here: ${built} built, ${part} partial, ${STAGES.length - built - part} not built` }; },
  tests: [{ inputs: { record: { project: 'x', version: 1, made: '', inputs: [], unknowns: [], requirements: [{ id: 'R1', says: '', output: 'mass', op: '<', value: 1, unit: 'kg' }], components: [], interfaces: [], params: [], checks: [{ stage: 17, name: 'R1', status: 'PASS', evidence: '', by: 'x', input: 'record', requirement: 'R1' }], revisions: [] } }, outputs: { status: 'RELEASE CANDIDATE (awaiting human engineering approval)' } }] });

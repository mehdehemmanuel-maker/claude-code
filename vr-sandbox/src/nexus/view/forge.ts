// The forge (docs/NEXUS-FROM-REALITY.md, section 28): the whole pipeline, live, in the room. The page runs it here
// from nothing: the intent is read, the generator derives its elements, and embodiment designs real hardware from
// them, round after round, each sub-loop (the head, every motor, every axis) designing, finding its flaws and
// remedying them, then the whole checked and remedied again until nothing it can remedy is left. Every step is played
// back at a pace a person can follow: the machine at full size grows part by part in the order it was designed, the
// pipeline above it lights the stage that is running, a flaw lights the parts it lies in red with the law it broke,
// and a remedy rebuilds what it changed. Claude stands beside it, pointing at what it is working on.
//
// And Claude is there to talk to: say anything in the box (or by voice where the browser hears), click or point at a
// part to ask what it is and why, tell it to take an assembly apart, or to build the machine again to a new ask. Mark
// anything with a note (a flaw, a question, an idea, or what is good): it is pinned to the part with a picture of what
// you were looking at, kept with the machine, and read back as a finding for the next round of laws.
//
// Desktop: drag to look, click a part to point at it, type to Claude. Space pauses the playback, → steps it, R runs it
// again. Headset: point and pull the trigger at a part to select it, or at a button on the console; the left stick
// walks, the right stick turns. Query: ?t=seconds (freeze the timeline), ?pace=multiplier, ?view=front|close|side|
// pipeline|wide, ?xr=quest3.

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { printer, type PrinterAsk } from '../asked';
import { embody, type Machine, type Step } from '../embody/embody';
import { describe, makeBrain, type Brain, type PartBrief, type WorldApi } from './brain';
import { makeNotes, STAGES as LOOP_STAGES, type Note, type NoteKind, type Notes, type Proposal } from './notes';
import { buildSteps, nodeAt as treeNodeAt, pathOf, treeOf, type BuildStep, type TreeNode } from '../embody/tree';
import { Unravel } from './unravel';
import { LAW_UPDATES } from '../embody/journal';
import type { Flaw, Part } from '../embody/part';
import { generate, type Structure } from '../manifold';
import type { Intent } from '../want';
import { card, label } from './holo';
import { meshOfPart } from './parts';
import { Robot } from './robot';

const params = new URLSearchParams(location.search);
const frozen = params.has('t') ? Number(params.get('t')) : null;
const pace = Number(params.get('pace') ?? 1);

// ---- the room --------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04070b);
scene.fog = new THREE.Fog(0x04070b, 6, 16);
const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.01, 50);
scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0b1218, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.2, 3.5, 1.8); scene.add(key);
const fill = new THREE.DirectionalLight(0x80deea, 0.5); fill.position.set(-2, 1.5, -1); scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 72), new THREE.MeshStandardMaterial({ color: 0x060b10, roughness: 0.7, metalness: 0.3 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
scene.add(new THREE.GridHelper(20, 40, 0x0f3a48, 0x0a1a24));

// the machine stands at full size on a pedestal in front of you
const M = new THREE.Vector3(0, 0.5, -1.25);
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, M.y, 48), new THREE.MeshStandardMaterial({ color: 0x0b141c, metalness: 0.7, roughness: 0.35 }));
pedestal.position.set(M.x, M.y / 2, M.z); scene.add(pedestal);
const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.006, 8, 96), new THREE.MeshBasicMaterial({ color: 0x4dd0e1 }));
rim.rotation.x = Math.PI / 2; rim.position.set(M.x, M.y + 0.002, M.z); scene.add(rim);
// the machine stands on its feet on the pedestal's top
const machine = new THREE.Group(); machine.position.copy(M).add(new THREE.Vector3(0, 0.015, 0)); scene.add(machine);
const lamp = new THREE.PointLight(0xffffff, 1.4, 2.5); lamp.position.set(0.3, 1.9, -0.6); scene.add(lamp);

// ---- the pipeline, above and behind it -----------------------------------------------------------------------------
const STAGES = ['INTENT', 'GENERATE', 'HEAD', 'MOTORS', 'AXES', 'WIRING', 'CHECK', 'REMEDY'] as const;
type Stage = (typeof STAGES)[number];
const nodeAt = (i: number) => { const th = ((i / (STAGES.length - 1)) * 2 - 1) * 1.15; return new THREE.Vector3(M.x + Math.sin(th) * 1.55, 2.05 - 0.12 * Math.cos(th * 1.4), M.z - Math.cos(th) * 0.75 - 0.15); };
interface Node { ring: THREE.Mesh; core: THREE.Mesh; tag: THREE.Sprite; at: THREE.Vector3 }
const nodes: Node[] = STAGES.map((s, i) => {
  const at = nodeAt(i);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 10, 48), new THREE.MeshBasicMaterial({ color: 0x1d4f5c }));
  ring.position.copy(at); ring.lookAt(0, 1.6, 0.6); scene.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), new THREE.MeshBasicMaterial({ color: 0x1d4f5c }));
  core.position.copy(at); scene.add(core);
  const tag = label(s, 0.042, '#9fdfee', 'rgba(0,0,0,0)'); tag.position.copy(at).add(new THREE.Vector3(0, -0.14, 0)); scene.add(tag);
  return { ring, core, tag, at };
});
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1f5866, transparent: true, opacity: 0.8 });
const curveBetween = (a: THREE.Vector3, b: THREE.Vector3, lift = 0.06) => new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, lift, 0)), b);
const edges = STAGES.slice(1).map((_, i) => curveBetween(nodes[i]!.at, nodes[i + 1]!.at));
for (const c of edges) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(24)), edgeMat));
// the loop: from the remedy back to the head, over the top
const loopBack = new THREE.CubicBezierCurve3(nodes[7]!.at, nodes[7]!.at.clone().add(new THREE.Vector3(0, 0.45, 0.05)), nodes[2]!.at.clone().add(new THREE.Vector3(0, 0.45, 0.05)), nodes[2]!.at);
const loopLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(loopBack.getPoints(48)), new THREE.LineDashedMaterial({ color: 0xffb74d, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.7 }));
loopLine.computeLineDistances(); scene.add(loopLine);
const loopTag = label('generate → identify flaws → update → repeat', 0.04, '#ffcc80', 'rgba(0,0,0,0)'); loopTag.position.copy(loopBack.getPoint(0.5)).add(new THREE.Vector3(0, 0.05, 0)); scene.add(loopTag);
const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(pulse);
const pulseLight = new THREE.PointLight(0x80deea, 0.8, 0.6); pulse.add(pulseLight);

// ---- cards ---------------------------------------------------------------------------------------------------------
const facing = (m: THREE.Object3D, x: number, y: number, z: number) => { m.position.set(x, y, z); m.lookAt(0, 1.55, 0.7); scene.add(m); };
const stepCard = card(0.66, 0.62); facing(stepCard.mesh, -0.78, 1.3, -0.95);
const roundsCard = card(0.66, 0.62); facing(roundsCard.mesh, 0.78, 1.3, -0.95);
const lawsCard = card(0.7, 0.86); facing(lawsCard.mesh, -1.35, 1.25, -0.3);
const liveCard = card(0.7, 0.86); facing(liveCard.mesh, 1.35, 1.25, -0.3);
const subtitle = card(1.1, 0.2, 1400); subtitle.mesh.position.set(0, 1.62, -1.15); subtitle.mesh.lookAt(0, 1.5, 0.6); scene.add(subtitle.mesh);
const title = label('NEXUS · the forge · live', 0.055, '#ffffff', 'rgba(0,0,0,0)'); title.position.set(0, 2.6, -1.7); scene.add(title);

// Claude, beside the machine
const robot = new Robot(); scene.add(robot.root); for (const s of robot.senses) scene.add(s);
const nameplate = label('CLAUDE', 0.035, '#4dd0e1', 'rgba(0,0,0,0)'); nameplate.position.set(0, 1.42, 0); robot.root.add(nameplate);
const beam = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff8a80, transparent: true, opacity: 0.9 })); beam.frustumCulled = false; scene.add(beam);

// ---- the run: here, in the page --------------------------------------------------------------------------------------
interface Run { intent: Intent; s: Structure; m: Machine; genMs: number; embMs: number }
let ask: PrinterAsk = {};
function runAll(a: PrinterAsk): Run | null {
  const intent = printer(a);
  const t0 = performance.now(); const s = generate(intent); const t1 = performance.now();
  const m = embody(intent, s); const t2 = performance.now();
  return m ? { intent, s, m, genMs: t1 - t0, embMs: t2 - t1 } : null;
}

// ---- beats: every step of the run, in order, each with how long it is shown ---------------------------------------------
interface Beat { kind: 'intent' | 'generate' | 'step' | 'check' | 'remedy' | 'done'; stage: Stage; round: number; dur: number; step?: Step; flaws: Flaw[]; says: string; detail: { text: string; color?: string; size?: number }[] }
const stageOf: Record<Step['stage'], Stage> = { head: 'HEAD', motor: 'MOTORS', axis: 'AXES', wiring: 'WIRING', whole: 'CHECK' };
const fmt = (x: number) => (Math.abs(x) >= 1e-2 && Math.abs(x) < 1e5 ? Number(x.toPrecision(3)).toString() : x.toExponential(2).replace('e+', 'e'));
const short = (f: Flaw) => `${f.check} @ ${f.where}: ${f.says}${f.remedy ? ` → ${f.remedy}` : ''}`;

function beatsOf(r: Run): Beat[] {
  const B: Beat[] = [];
  const regions = r.intent.regions.length, quantities = r.intent.regions.reduce((a, x) => a + Object.keys(x.quantities).length, 0);
  B.push({ kind: 'intent', stage: 'INTENT', round: 0, dur: 3.2, flaws: [], says: `You asked for ${r.intent.name}. ${regions} regions and ${quantities} quantities: that is all it starts from.`, detail: r.intent.regions.slice(0, 6).map((x) => ({ text: `${x.id}: ${Object.values(x.quantities).slice(0, 2).map((l) => `${l.name} ${l.value === null ? '?' : fmt(l.value)} ${l.unit}`).join(', ')}`, size: 0.95 })) });
  const kinds = new Map<string, number>(); for (const e of r.s.elements) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
  B.push({ kind: 'generate', stage: 'GENERATE', round: 0, dur: 3.4, flaws: [], says: `The generator derived ${r.s.elements.length} elements from it in ${r.genMs.toFixed(0)} ms, here, in this page. Now I embody them as hardware that exists.`, detail: [...kinds].map(([k, n]) => ({ text: `${n} × ${k}`, color: '#a5f3ff' })) });
  for (const round of r.m.rounds) {
    for (const st of round.trace) {
      const lit = st.flaws.length > 0;
      B.push({ kind: 'step', stage: stageOf[st.stage], round: round.n, step: st, dur: lit ? 2.6 : st.stage === 'whole' ? 2.2 : 1.1, flaws: st.flaws, says: lit ? `${st.where}, its round ${st.round}: ${st.flaws[0]!.says}.${st.remedy ? ` Remedy: ${st.remedy}.` : ''}` : `${st.where}, round ${st.round}: ${st.says}. It holds.`, detail: [{ text: st.says, size: 1.15 }, ...st.flaws.slice(0, 5).map((f) => ({ text: `✗ ${short(f)}`, color: '#ff8a80', size: 0.95 })), ...(st.remedy ? [{ text: `↻ ${st.remedy}`, color: '#ffcc80' }] : lit ? [] : [{ text: '✓ every check of its laws holds', color: '#69f0ae' }])] });
    }
    B.push({ kind: 'check', stage: 'CHECK', round: round.n, dur: round.flaws.length ? 4.2 : 3, flaws: round.flaws, says: round.flaws.length ? `Round ${round.n} checked: ${round.flaws.length} flaw${round.flaws.length > 1 ? 's' : ''}. ${round.flaws[0]!.says}.` : `Round ${round.n} checked: no flaw left that a rule can remedy.`, detail: round.flaws.length ? round.flaws.slice(0, 7).map((f) => ({ text: `✗ ${short(f)}`, color: f.remedy ? '#ff8a80' : '#ffab91', size: 0.95 })) : [{ text: '✓ every check holds', color: '#69f0ae' }] });
    if (round.remedies.length) B.push({ kind: 'remedy', stage: 'REMEDY', round: round.n, dur: 3.4, flaws: [], says: `Updating the design: ${round.remedies.join('; ')}. Then the whole is designed again.`, detail: round.remedies.map((x) => ({ text: `↻ ${x}`, color: '#ffcc80', size: 1 })) });
  }
  const last = r.m.rounds.at(-1)!;
  B.push({ kind: 'done', stage: last.flaws.length ? 'CHECK' : 'REMEDY', round: last.n, dur: 12, flaws: last.flaws, says: last.flaws.length ? `${r.m.rounds.length} rounds. ${last.flaws.length} flaw${last.flaws.length > 1 ? 's' : ''} left that no rule here remedies yet: each is located, in red. That is the next law to write.` : `${r.m.rounds.length} rounds and it holds: ${r.m.parts.length} parts, ${fmt(r.m.parts.reduce((a, p) => a + p.mass, 0))} kg, every one from a law.`, detail: last.flaws.length ? [{ text: 'left for the next law:', color: '#ffcc80', size: 1 }, ...last.flaws.slice(0, 8).map((f) => ({ text: `✗ ${short(f)}`, color: '#ff8a80', size: 0.85 }))] : [{ text: '✓ every check holds', color: '#69f0ae', size: 1.1 }] });
  return B;
}

// ---- the machine as it stands: parts by id, morphed from round to round -----------------------------------------------
interface Shown { obj: THREE.Object3D; part: Part; born: number; dying: number | null; group: string }
const shown = new Map<string, Shown>();
const keyOf = (p: Part) => JSON.stringify([p.shape, p.at.map((x) => Math.round(x * 1e5)), p.turn ?? null]);
const groupOf = (p: Part): string => {
  const id = p.id;
  if (id.startsWith('hot end/')) return 'hot end';
  const ax = id.match(/^(x|y|z\d?)\/(motor\/)?/); if (ax) return ax[2] ? `${ax[1]}/motor` : ax[1]!;
  if (/^(cable:|carrier:|bb:|psu$|controller$|inlet$|switch$|mains)/.test(id)) return 'wiring';
  return 'placement';
};
let run: Run, beats: Beat[] = [], starts: number[] = [], total = 0;
let current = -1;

function setPart(p: Part, t: number, instant: boolean): void {
  const k = keyOf(p), old = shown.get(p.id);
  if (old && old.dying === null && (old.obj.userData.key as string) === k) return;
  if (old) { old.dying = instant ? -1e9 : t; shown.delete(p.id); dyingList.push(old); }
  const obj = meshOfPart(p); obj.userData.key = k; obj.userData.at = obj.position.clone();
  obj.visible = false;
  machine.add(obj);
  shown.set(p.id, { obj, part: p, born: instant ? -1e9 : Infinity, dying: null, group: groupOf(p) });
}
const dyingList: Shown[] = [];
/** Show a round's machine: what changed is rebuilt, what is gone fades, what is new waits for the step that designs it. */
function toRound(n: number, t: number, instant: boolean): void {
  const snap = run.m.rounds[n - 1]!.snapshot, ids = new Set(snap.map((p) => p.id));
  for (const [id, s] of shown) if (!ids.has(id)) { s.dying = instant ? -1e9 : t; shown.delete(id); dyingList.push(s); }
  for (const p of snap) setPart(p, t, instant);
}
/** The step that designs a group lets its waiting parts grow in. */
function bornNow(group: string | null, t: number, instant: boolean): void {
  for (const s of shown.values()) if (s.born === Infinity && (group === null || s.group === group || (group === 'placement' && s.group === 'placement'))) s.born = instant ? -1e9 : t + Math.random() * 0.6;
}

// flaws lit in red, with a tag at each
const tags: THREE.Sprite[] = [];
let lit = new Set<string>();
function partsOfFlaw(f: Flaw): string[] {
  if (f.parts?.length) return f.parts;
  const w = f.where, out: string[] = [];
  for (const id of shown.keys()) if (id === w || id.startsWith(`${w}/`) || id === `cable:${w}` || (w === 'supply' && id === 'psu') || (w === 'hot end' && id.startsWith('hot end/'))) out.push(id);
  return out;
}
function light(flaws: Flaw[]): void {
  for (const t of tags) { scene.remove(t); t.material.map?.dispose(); t.material.dispose(); }
  tags.length = 0;
  lit = new Set(flaws.flatMap(partsOfFlaw));
  flaws.slice(0, 6).forEach((f, i) => {
    const ids = partsOfFlaw(f); if (!ids.length) return;
    const c = new THREE.Vector3(); let n = 0;
    for (const id of ids) { const s = shown.get(id); if (!s) continue; s.obj.getWorldPosition(world); c.add(world); n++; }
    if (!n) return;
    c.divideScalar(n);
    const tg = label(`✗ ${f.check}: ${f.says.length > 70 ? `${f.says.slice(0, 68)}…` : f.says}`, 0.02, '#ffcdd2', 'rgba(60,8,8,0.82)');
    tg.position.copy(c).add(new THREE.Vector3(0, 0.12 + i * 0.045, 0.05)); scene.add(tg); tags.push(tg);
  });
}
const world = new THREE.Vector3();

// ---- entering a beat --------------------------------------------------------------------------------------------------
let lastRound = 0;
function enter(i: number, t: number, instant: boolean): void {
  const b = beats[i]!;
  if (b.kind === 'step' && b.round !== lastRound) { toRound(b.round, t, instant); lastRound = b.round; }
  if (b.kind === 'step' && b.step) {
    const st = b.step;
    const g = st.stage === 'head' ? 'hot end' : st.stage === 'motor' ? st.where : st.stage === 'axis' ? st.where : st.stage === 'wiring' ? 'wiring' : 'placement';
    // the frame and the support go up with the wiring, which runs along them
    if (st.stage === 'wiring') bornNow('placement', t, instant);
    bornNow(g, t, instant);
    if (st.stage === 'axis') bornNow(`${st.where}/motor`, t, instant);
  }
  if (b.kind === 'check' || b.kind === 'done') bornNow(null, t, instant);
  light(b.flaws);
  if (instant && i !== targetBeat) return;
  stepCard.draw(`${b.kind === 'step' ? `${b.stage} · ${b.step!.where} · its round ${b.step!.round}` : b.kind.toUpperCase()}${b.round ? ` · machine round ${b.round}` : ''}`, b.detail, b.flaws.length ? '#ff5252' : b.kind === 'remedy' ? '#ffb74d' : '#4dd0e1');
  subtitle.draw('', [{ text: `Claude: ${b.says}`, size: 1.0 }], b.flaws.length ? '#ff5252' : b.kind === 'remedy' ? '#ffb74d' : '#4dd0e1');
  drawRounds(b);
  drawLive(b);
  if (voice && !instant && 'speechSynthesis' in window && (b.kind !== 'step' || b.flaws.length)) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(b.says); u.rate = 1.1; speechSynthesis.speak(u); }
}
function drawRounds(b: Beat): void {
  const lines: { text: string; color?: string; size?: number }[] = [];
  for (const r of run.m.rounds) {
    if (r.n > b.round) break;
    const done = r.n < b.round || b.kind === 'check' || b.kind === 'remedy' || b.kind === 'done';
    lines.push({ text: `Round ${r.n}: streams ${r.choices.streams}, support from ${r.choices.bedSupport === 2 ? 'both sides' : 'one side'}, plate ${(r.choices.bedT * 1e3).toFixed(0)} mm`, color: '#d9f3ff', size: 0.98 });
    if (done) {
      lines.push({ text: r.flaws.length ? `   ${r.flaws.length} flaw${r.flaws.length > 1 ? 's' : ''}: ${[...new Set(r.flaws.map((f) => f.check))].join(', ')}` : '   ✓ no flaw left', color: r.flaws.length ? '#ff8a80' : '#69f0ae', size: 0.92 });
      if (r.remedies.length && (r.n < b.round || b.kind !== 'check')) lines.push({ text: `   ↻ ${r.remedies.join('; ')}`, color: '#ffcc80', size: 0.92 });
    } else lines.push({ text: '   designing…', color: '#7fb3c8', size: 0.92 });
  }
  if (allNotes.length) {
    const open = allNotes.filter((n) => n.status !== 'done');
    lines.push({ text: `✎ your notes: ${allNotes.length} (${open.length} open), findings for the next round`, color: '#ffd740', size: 0.92 });
    for (const n of allNotes.slice(-3)) lines.push({ text: `   ${n.kind}: ${n.text.slice(0, 60)} (${n.partName.slice(0, 30)})${n.reply ? ' · answered' : ''}`, color: '#ffe8a3', size: 0.8 });
  }
  roundsCard.draw(`ROUNDS · ${Math.min(b.round, run.m.rounds.length)} of ${run.m.rounds.length}`, lines, '#69f0ae');
}
function drawRoundsNow(): void { const b = beats[current]; if (b) drawRounds(b); }
function drawLive(b: Beat): void {
  const m = run.m, parts = [...shown.values()].filter((s) => s.born !== Infinity);
  const mass = parts.reduce((a, s) => a + s.part.mass, 0);
  const val = (n: string) => m.values.find((x) => x.name === n)?.value;
  const lines: { text: string; color?: string; size?: number }[] = [
    { text: `ran here: generated in ${run.genMs.toFixed(0)} ms, embodied in ${run.embMs.toFixed(0)} ms`, color: '#a5f3ff', size: 0.9 },
    { text: `${parts.length} parts shown, ${fmt(mass)} kg`, size: 1.2 },
  ];
  if (b.kind === 'done') {
    lines.push({ text: `${m.parts.length} parts · ${m.bom.length} kinds · ${fmt(m.size[0] * 1e3)} × ${fmt(m.size[1] * 1e3)} × ${fmt(m.size[2] * 1e3)} mm`, color: '#ffe082', size: 0.95 });
    for (const c of m.config.slice(0, 7)) lines.push({ text: `${c.name} = ${fmt(c.value)} ${c.unit}`, color: '#ffe082', size: 0.9 });
    lines.push({ text: `streams ${m.hotEnd?.streams}, heater ${fmt(m.hotEnd?.electrical.P ?? 0)} W, supply ${m.electrical?.psu.id}`, color: '#ffe082', size: 0.9 });
  } else {
    for (const n of ['deposition speed', 'acceleration', 'support sag', 'interferences']) { const x = val(n); if (x !== undefined) lines.push({ text: `${n} = ${fmt(x)}`, color: '#ffe082', size: 0.95 }); }
    const counts = new Map<string, number>(); for (const s of parts) { const c = s.part.category.split('/')[0]!; counts.set(c, (counts.get(c) ?? 0) + 1); }
    for (const [c, n] of [...counts].sort((x, y) => y[1] - x[1]).slice(0, 7)) lines.push({ text: `${n} × ${c}`, color: '#b3e5fc', size: 0.92 });
  }
  liveCard.draw(b.kind === 'done' ? 'BUILT · BILL AND SETTINGS' : 'LIVE', lines, '#4dd0e1');
}
lawsCard.draw('LAWS THE EXPERIMENT UPDATED', LAW_UPDATES.slice(-5).map((l) => ({ text: `${l.n}. ${l.found} → now ${l.now}`, size: 0.8, color: l.n >= 5 ? '#ffe0b2' : '#c8e6f0' })), '#ffb74d');

// ---- time -----------------------------------------------------------------------------------------------------------------
const realStart = performance.now();
let paused = false, pausedAt = 0, offset = 0, voice = false, targetBeat = -1;
const clock = () => (frozen ?? ((paused ? pausedAt : performance.now()) - realStart) / 1000 + offset);
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

function start(a: PrinterAsk = ask): string {
  const next = runAll(a);
  if (!next) return 'The generator gave no axes to embody for that ask: a gap, not a machine.';
  ask = a;
  for (const s of shown.values()) machine.remove(s.obj);
  shown.clear(); for (const d of dyingList) machine.remove(d.obj); dyingList.length = 0;
  run = next; explodeTo.clear(); exploded.clear(); attention = null; selectedId = null;
  tree = treeOf(run.m.parts, run.m.name); partsById = new Map(run.m.parts.map((p) => [p.id, p])); holo.clear(); machineBuild = null;
  beats = beatsOf(run);
  starts = []; total = 0; for (const b of beats) { starts.push(total); total += b.dur * pace; }
  current = -1; lastRound = 0;
  if (frozen === null) offset -= clock();
  if (params.has('end') && !jumped) { offset += total; jumped = true; }
  const last = run.m.rounds.at(-1)!;
  return `${run.m.rounds.length} rounds, ${last.flaws.length} flaw${last.flaws.length === 1 ? '' : 's'} left, ${run.m.parts.length} parts, ${fmt(run.m.parts.reduce((x, p) => x + p.mass, 0))} kg, ${run.m.size.map((x) => fmt(x * 1e3)).join(' × ')} mm; ${run.m.rounds.flatMap((r) => r.remedies).join('; ') || 'no remedy needed'}.`;
}

let lastT = 0, jumped = false;
function tick(): void {
  const t = clock(), dt = Math.min(0.1, Math.max(0, (performance.now() - lastT) / 1000)); lastT = performance.now();
  // a frozen time past the end shows the end; at the end it stays, for you to look round and talk about
  const local = Math.min(frozen ?? t, total - 1e-3);
  let k = -1; for (let i = 0; i < starts.length; i++) if (local >= starts[i]!) k = i;
  if (k > current) { targetBeat = k; for (let i = current + 1; i <= k; i++) enter(i, t, i < k || frozen !== null); current = k; }
  const b = k >= 0 ? beats[k]! : null, u = b ? (local - starts[k]!) / (b.dur * pace) : 0;
  // parts grow into place; what was replaced fades
  for (const s of shown.values()) {
    if (s.born === Infinity) { s.obj.visible = false; continue; }
    const g = ease((t - s.born) / 0.5);
    s.obj.visible = g > 0;
    if (s.part.shape.kind !== 'wire') s.obj.scale.setScalar(Math.max(1e-3, g));
    // taken apart: each assembly out from the machine's centre, each part out from its assembly's
    const e = exploded.get(s.group) ?? 0, gc = centres.get(s.group);
    if (gc) {
      const base = s.part.shape.kind === 'wire' ? ZERO : s.obj.userData.at as THREE.Vector3;
      off.copy(gc).sub(centre0).multiplyScalar(0.9 * e);
      if (s.part.shape.kind !== 'wire') off.add(tmp.copy(base).sub(gc).multiplyScalar(0.8 * e));
      s.obj.position.copy(base).add(off);
    }
    const m = s.obj.userData.material as THREE.MeshStandardMaterial;
    // more sight: the frame and the guard seen through, or only the assembly you are looking at
    const thin = xray && (s.group === 'placement' || /polycarbonate/.test(s.part.material)) && !/support/.test(s.part.id);
    if (!/polycarbonate/.test(s.part.material)) { m.transparent = thin; m.opacity = thin ? 0.12 : 1; m.depthWrite = !thin; }
    if (isolated && !isolated.has(s.part.id)) s.obj.visible = false;
    const red = lit.has(s.part.id), seen = attention?.ids.has(s.part.id) ?? false, sel = s.part.id === selectedId;
    m.emissive.setHex(red ? 0xff1744 : sel ? 0xffd740 : seen ? 0x4dd0e1 : t - s.born < 0.9 && s.born > -1e8 ? 0x4dd0e1 : 0x000000);
    m.emissiveIntensity = red ? 0.55 + 0.45 * Math.sin(t * 7) : sel ? 0.7 + 0.3 * Math.sin(t * 5) : seen ? 0.45 + 0.2 * Math.sin(t * 4) : 0.6 * (1 - (t - s.born) / 0.9);
  }
  for (let i = dyingList.length - 1; i >= 0; i--) { const d = dyingList[i]!; const g = 1 - (t - d.dying!) / 0.4; if (g <= 0) { machine.remove(d.obj); dyingList.splice(i, 1); } else d.obj.scale.setScalar(Math.max(1e-3, g)); }
  // the pipeline: the stage that runs, lit; a pulse along the way it came
  const si = b ? STAGES.indexOf(b.stage) : -1;
  nodes.forEach((n, i) => {
    const on = i === si, hot = on && b!.flaws.length > 0;
    (n.ring.material as THREE.MeshBasicMaterial).color.setHex(on ? (hot ? 0xff5252 : b!.kind === 'remedy' ? 0xffb74d : 0x80deea) : i < si || (b && b.round > 1 && i >= 2) ? 0x2e7d8c : 0x1d4f5c);
    (n.core.material as THREE.MeshBasicMaterial).color.copy((n.ring.material as THREE.MeshBasicMaterial).color);
    n.ring.scale.setScalar(on ? 1.25 + 0.12 * Math.sin(t * 6) : 1);
  });
  const prevStage = k > 0 ? STAGES.indexOf(beats[k - 1]!.stage) : 0;
  const travel = ease(Math.min(1, u * 3));
  if (b && prevStage > si && si === 2) pulse.position.copy(loopBack.getPoint(travel));
  else if (b && si > prevStage) {
    // along the edges from the stage it came from to the one that runs
    const segs = si - prevStage, f = travel * segs, seg = prevStage + Math.min(Math.floor(f), segs - 1);
    pulse.position.copy(edges[seg]!.getPoint(Math.min(1, f - (seg - prevStage))));
  } else if (b) pulse.position.copy(nodes[si]!.at);
  (loopLine.material as THREE.LineDashedMaterial).opacity = b && b.kind === 'remedy' ? 0.6 + 0.4 * Math.sin(t * 8) : 0.55;

  for (const [g, to] of explodeTo) { const now2 = exploded.get(g) ?? 0; exploded.set(g, now2 + (to - now2) * Math.min(1, dt * 4)); }
  holo.update(performance.now() / 1000, eye);
  if (machineBuild) stepMachineBuild(t);
  for (const n of pins) n.update(t);

  // Claude: what it attends to is what you pointed at or asked about, else what the playback is working on, else you
  const asked = attention && t < attention.until ? [...attention.ids] : null;
  const focusIds = asked ?? (b && current < beats.length - 1 ? (b.flaws.length ? b.flaws.flatMap(partsOfFlaw) : b.step ? [...shown.values()].filter((s) => s.group === (b.step!.stage === 'head' ? 'hot end' : b.step!.stage === 'wiring' ? 'wiring' : b.step!.where)).map((s) => s.part.id) : []) : []);
  const focus = new THREE.Vector3(); let nf = 0;
  for (const id of focusIds.slice(0, 40)) { const s = shown.get(id); if (!s || !s.obj.visible) continue; s.obj.getWorldPosition(world); focus.add(world); nf++; }
  const target = nf ? focus.divideScalar(nf) : null;
  eyeOf(eye);
  // beside a hologram when one is out, turned to it; else by what it attends to; else beside the machine, turned to you
  if (holo.showing) { const hp = holo.group.position; goal = { th: clamp(Math.atan2(hp.x - M.x, hp.z - M.z) + 0.95, -2.3, 2.3), r: 0.9 }; faceAt = hp; }
  else if (target) { goal = standFor(target); faceAt = target; }
  else { goal = { th: Math.max(-2.3, Math.min(2.3, Math.atan2(eye.x - M.x, eye.z - M.z) + 1.0)), r: 0.72 }; faceAt = eye; }
  // never between you and what you are looking at: stepped round until it is out of the way
  for (let k2 = 0; k2 < 6; k2++) {
    const gx = M.x + Math.sin(goal.th) * goal.r, gz = M.z + Math.cos(goal.th) * goal.r, look = holo.showing ? holo.group.position : M;
    const ex = look.x - eye.x, ez = look.z - eye.z, L2 = ex * ex + ez * ez, u2 = clamp(((gx - eye.x) * ex + (gz - eye.z) * ez) / Math.max(1e-6, L2), 0, 1);
    if (Math.hypot(gx - (eye.x + u2 * ex), gz - (eye.z + u2 * ez)) > 0.5) break;
    goal = { th: clamp(goal.th + 0.35 * Math.sign(goal.th || 1), -2.6, 2.6), r: goal.r };
  }
  drive(dt);
  robot.root.updateWorldMatrix(true, true);
  const arm: 0 | 1 = target && robot.root.worldToLocal(tmp.copy(target)).x > 0 ? 1 : 0;
  const near = target && robot.root.position.distanceTo(tmp.set(target.x, 0, target.z)) < 1.4;
  robot.reach(arm, near ? target : null); robot.reach(arm === 0 ? 1 : 0, null);
  robot.look(target ?? eye);
  if (target && near) { robot.arms[arm].grip.getWorldPosition(world); beam.geometry.setAttribute('position', new THREE.Float32BufferAttribute([world.x, world.y, world.z, target.x, target.y, target.z], 3)); (beam.material as THREE.LineBasicMaterial).color.setHex(b && b.flaws.length && !asked ? 0xff8a80 : 0x80deea); beam.visible = true; } else beam.visible = false;
  const talking = speaking || ('speechSynthesis' in window && speechSynthesis.speaking);
  robot.speaking(talking ? Math.abs(Math.sin(t * 13)) * Math.abs(Math.sin(t * 5.3)) : b && u < 0.6 && current < beats.length - 1 ? 0.5 * Math.abs(Math.sin(t * 11)) : 0);
  voiceCard.mesh.position.copy(robot.root.position).add(tmp.set(0, 1.58, 0)); voiceCard.mesh.lookAt(eye);
  consoleGroup.visible = renderer.xr.isPresenting;
  stepCard.mesh.visible = roundsCard.mesh.visible = panelsOn && !holo.showing;
  lawsCard.mesh.visible = liveCard.mesh.visible = loopBoard.visible = decideChips.visible = panelsOn;
  // on a screen, the view comes to what you asked about or pointed at
  if (!renderer.xr.isPresenting) {
    const frame = holo.showing ? { at: holo.group.position, d: 1.25 } : machineBuild ? { at: M.clone().add(tmp.set(0, 0.35, 0)), d: 1.7 } : asked && target ? { at: target, d: 0.95 } : null;
    if (frame && framing) { orbit.target.lerp(frame.at, Math.min(1, dt * 2.5)); const want2 = off.copy(camera.position).sub(orbit.target); const d = want2.length(); if (Math.abs(d - frame.d) > 0.02) camera.position.copy(orbit.target).add(want2.setLength(d + (frame.d - d) * Math.min(1, dt * 2))); }
  }
}

// ---- Claude's body: it drives round the machine, never through it, turning to what it attends to ------------------------
const bot = { th: 0.9, r: 0.95, h: 0 };
let goal = { th: 0.9, r: 0.95 }, faceAt: THREE.Vector3 | null = null;
const eye = new THREE.Vector3(), tmp = new THREE.Vector3(), off = new THREE.Vector3(), ZERO = new THREE.Vector3();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const standFor = (p: THREE.Vector3) => ({ th: clamp(Math.atan2(p.x - M.x, p.z - M.z), -2.3, 2.3), r: 0.85 });
function eyeOf(v: THREE.Vector3): void { (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(v); }
function drive(dt: number): void {
  const speed = 0.8, dth = wrap(goal.th - bot.th), maxTh = (speed * dt) / Math.max(bot.r, 0.5);
  const step = clamp(dth, -maxTh, maxTh), dr = clamp(goal.r - bot.r, -speed * dt, speed * dt);
  bot.th += step; bot.r += dr;
  const x = M.x + Math.sin(bot.th) * bot.r, z = M.z + Math.cos(bot.th) * bot.r;
  const moving = Math.abs(step) > 1e-4 || Math.abs(dr) > 1e-4;
  let want: number;
  if (moving) { const vx = Math.cos(bot.th) * step * bot.r + Math.sin(bot.th) * dr, vz = -Math.sin(bot.th) * step * bot.r + Math.cos(bot.th) * dr; want = Math.atan2(-vx, -vz); }
  else { const f = faceAt ?? M; want = Math.atan2(-(f.x - x), -(f.z - z)); }
  bot.h += clamp(wrap(want - bot.h), -4 * dt, 4 * dt);
  robot.pose(x, z, bot.h);
}

// ---- what you can do here: point, ask, take apart, mark -------------------------------------------------------------------
let attention: { ids: Set<string>; until: number } | null = null, selectedId: string | null = null, speaking = false;
const explodeTo = new Map<string, number>(), exploded = new Map<string, number>(), centres = new Map<string, THREE.Vector3>(), centre0 = new THREE.Vector3();
function measureCentres(): void {
  centres.clear(); const n = new Map<string, number>(); centre0.set(0, 0, 0); let all = 0;
  for (const s of shown.values()) { const at = tmp.set(...s.part.at); const c = centres.get(s.group) ?? new THREE.Vector3(); c.add(at); centres.set(s.group, c); n.set(s.group, (n.get(s.group) ?? 0) + 1); centre0.add(at); all++; }
  for (const [g, c] of centres) c.divideScalar(n.get(g)!);
  if (all) centre0.divideScalar(all);
}
const brief = (s: Shown | undefined): PartBrief | null => (s ? { id: s.part.id, name: s.part.name, category: s.part.category, material: s.part.material, mass: s.part.mass, values: s.part.values } : null);
const GROUP_WORDS: [RegExp, string][] = [[/hot ?end|head|nozzle|extruder|heater|heat ?sink|melt/, 'hot end'], [/frame|profile|post|rail|bracket|plate|support|bed|enclosure|panel|door/, 'placement'], [/wir|cable|electr|supply|psu|controller|breadboard|carrier|inlet/, 'wiring']];
function groupFor(q: string): string | null {
  const t = q.toLowerCase().replace(/\baxis\b/g, ' ').replace(/\s+/g, ' ').trim();
  const groups = new Set([...shown.values()].map((s) => s.group));
  if (groups.has(t)) return t;
  const m = t.match(/^(x|y|z ?\d?)\s*\/?\s*(motor)?$/);
  if (m) { const id = m[1]!.replace(' ', '') === 'z' ? ([...groups].find((g) => /^z\d?$/.test(g)) ?? 'z') : m[1]!.replace(' ', ''); return m[2] ? `${id}/motor` : id; }
  return null;
}
function find(q: string): Shown[] {
  const words = q.toLowerCase().split(/[^a-z0-9.×]+/).filter((w) => w.length > 1 && !['the', 'of', 'on', 'in', 'and', 'this', 'that', 'is', 'it', 'me'].includes(w));
  if (!words.length) return [];
  const scored = [...shown.values()].map((s) => { const hay = `${s.part.id} ${s.part.name} ${s.part.category} ${s.group}`.toLowerCase(); return { s, n: words.filter((w) => hay.includes(w)).length }; }).filter((x) => x.n > 0);
  const best = Math.max(0, ...scored.map((x) => x.n));
  return scored.filter((x) => x.n === best).map((x) => x.s);
}
function partsFor(target: string): Shown[] {
  const g = groupFor(target);
  if (g) return [...shown.values()].filter((s) => s.group === g || (g !== 'placement' && g !== 'wiring' && s.group.startsWith(`${g}/`)));
  const direct = shown.get(target); if (direct) return [direct];
  const words = GROUP_WORDS.find(([re]) => re.test(target.toLowerCase()));
  const hits = find(target);
  return hits.length ? hits.slice(0, 60) : words ? [...shown.values()].filter((s) => s.group === words[1]) : [];
}
const world2: WorldApi = {
  brief() {
    const m = run.m, last = m.rounds.at(-1)!, val = (n: string) => m.values.find((x) => x.name === n);
    const groups = new Map<string, number>(); for (const s of shown.values()) groups.set(s.group, (groups.get(s.group) ?? 0) + 1);
    return [
      `${m.name}, asked: largest part ${fmt((ask.size ?? 0.2) * 1e3)} mm, tolerance ${fmt((ask.tolerance ?? 1e-4) * 1e3)} mm, within ${fmt((ask.time ?? 86400) / 3600)} h. ${m.rounds.length} rounds; ${last.flaws.length} flaws left; ${m.parts.length} parts, ${fmt(m.parts.reduce((x, p) => x + p.mass, 0))} kg, ${m.size.map((x) => fmt(x * 1e3)).join(' × ')} mm.`,
      `Rounds: ${m.rounds.map((r) => `${r.n}: ${r.flaws.length} flaws${r.remedies.length ? ` → ${r.remedies.join('; ')}` : ''}`).join(' | ')}`,
      last.flaws.length ? `Left: ${last.flaws.slice(0, 5).map((f) => `${f.check} @ ${f.where}: ${f.says}`).join(' | ')}` : 'Every check holds.',
      `Assemblies (id: parts): ${[...groups].map(([g, n]) => `${g}: ${n}`).join(', ')}.`,
      `Key values: ${['deposition speed', 'acceleration', 'support sag', 'bridge depth', 'nozzle height'].map((n) => { const x = val(n); return x ? `${n} ${fmt(x.value)} ${x.unit}` : ''; }).filter(Boolean).join('; ')}; ${m.hotEnd?.streams} streams, heater ${fmt(m.hotEnd?.electrical.P ?? 0)} W, supply ${m.electrical?.psu.id}.`,
      `Laws the experiment updated: ${LAW_UPDATES.slice(-5).map((l) => `${l.n}. ${l.now}`).join(' | ')}`,
      allNotes.length ? `The person's notes (${allNotes.length}): ${allNotes.slice(-6).map((n) => `${n.kind} on ${n.partName}: ${n.text}`).join(' | ')}` : 'No notes yet.',
    ].join('\n');
  },
  find: (q) => find(q).slice(0, 12).map((s) => brief(s)!),
  part: (id) => brief(shown.get(id)),
  selected: () => (selectedId ? brief(shown.get(selectedId)) : null),
  focus(target) {
    const ps = partsFor(target); framing = true;
    if (!ps.length) return `I can't find ${target} on this machine.`;
    attention = { ids: new Set(ps.map((s) => s.part.id)), until: clock() + 14 };
    return ps.length === 1 ? describe(brief(ps[0])!) : `${ps.length} parts of ${ps[0]!.group}: ${[...new Set(ps.map((s) => s.part.name))].slice(0, 5).join('; ')}`;
  },
  explode(target, amount) {
    // taken apart the way you asked: lifted out as a hologram and unravelled in the air
    if (amount > 0) return expand(target === 'all' ? '' : target, true);
    if (holo.showing) { holo.whole(performance.now() / 1000); return `Putting ${holo.showing.name} back together.`; }
    const g = target === 'all' || !target ? null : groupFor(target) ?? partsFor(target)[0]?.group ?? null;
    measureCentres();
    for (const grp of g ? [g, ...[...new Set([...shown.values()].map((s) => s.group))].filter((x) => x.startsWith(`${g}/`))] : new Set([...shown.values()].map((s) => s.group))) explodeTo.set(grp, Math.max(0, Math.min(1, amount)));
    if (g) attention = { ids: new Set([...shown.values()].filter((s) => s.group === g || s.group.startsWith(`${g}/`)).map((s) => s.part.id)), until: clock() + 10 };
    return amount > 0 ? `Taking ${g ?? 'the whole machine'} apart, in place.` : `Putting ${g ?? 'it'} back together.`;
  },
  async note(target, kind, text) {
    const s = target ? partsFor(target)[0] : selectedId ? shown.get(selectedId) : undefined;
    if (!s) return 'Point at a part first, or tell me which part the note is on.';
    return addNote(s, (['flaw', 'question', 'idea', 'good'].includes(kind) ? kind : 'idea') as NoteKind, text);
  },
  rebuild(a) { const next: PrinterAsk = { ...ask, ...(a.size ? { size: a.size } : {}), ...(a.tolerance ? { tolerance: a.tolerance } : {}), ...(a.hours ? { time: a.hours * 3600 } : {}) }; return `Rebuilt to the new ask: ${start(next)}`; },
  replay() { start(ask); return 'Playing it again from the ask, every round.'; },
  expand: (target) => expand(target, true),
  build: (target) => buildIt(target),
};

// ---- notes: yours, pinned where you put them, with the view you saw -------------------------------------------------------
let notes: Notes | null = null, allNotes: Note[] = [];
const KIND_COLOUR: Record<NoteKind, number> = { flaw: 0xff5252, question: 0xb388ff, idea: 0xffd740, good: 0x69f0ae };
interface Pin { note: Note; group: THREE.Group; update(t: number): void }
const pins: Pin[] = [];
function drawPins(): void {
  for (const p of pins) machine.remove(p.group);
  pins.length = 0;
  for (const n of allNotes) {
    if (reportsMode === 'off') continue;
    const g = new THREE.Group(), c = KIND_COLOUR[n.kind] ?? 0xffd740;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), new THREE.MeshBasicMaterial({ color: c }));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 6), new THREE.MeshBasicMaterial({ color: c }));
    stem.position.y = -0.025; head.position.y = 0;
    const tag = label(`${n.kind === 'flaw' ? '✗' : n.kind === 'good' ? '✓' : n.kind === 'question' ? '?' : '✎'} ${n.text.length > 56 ? `${n.text.slice(0, 54)}…` : n.text}${n.reply ? `\nClaude: ${n.reply.length > 60 ? `${n.reply.slice(0, 58)}…` : n.reply}` : ''}`, 0.014, '#ffffff', 'rgba(20,20,28,0.85)');
    tag.position.set(0, 0.03, 0);
    // as dots by default, out of the centre of your view; the words with the dots on 'full', or for the one you point at
    tag.visible = reportsMode === 'full' || n.partId === selectedId;
    g.add(head, stem, tag);
    g.position.set(...(shown.get(n.partId)?.part.at ?? n.at)).add(new THREE.Vector3(0, 0.05, 0));
    machine.add(g);
    pins.push({ note: n, group: g, update: (t) => { head.scale.setScalar(1 + 0.25 * Math.sin(t * 4 + n.createdAt)); } });
  }
  drawRoundsNow();
  drawLoop();
}
/** What you are looking at, as you see it: the screen, or the headset's left eye. */
function snapshot(): string {
  const w = 768, h = 432, rt = new THREE.WebGLRenderTarget(w, h);
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const src = renderer.xr.isPresenting ? (renderer.xr.getCamera().cameras[0] ?? camera) : camera;
  const shot = new THREE.PerspectiveCamera(70, w / h, 0.01, 50);
  src.updateMatrixWorld(); src.matrixWorld.decompose(shot.position, shot.quaternion, shot.scale); shot.scale.set(1, 1, 1); shot.updateMatrixWorld(); shot.updateProjectionMatrix();
  const xr = renderer.xr.enabled; renderer.xr.enabled = false;
  renderer.setRenderTarget(rt); renderer.render(scene, shot);
  const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
  renderer.setRenderTarget(null); renderer.xr.enabled = xr; rt.dispose();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.72);
}
async function addNote(s: Shown, kind: NoteKind, text: string): Promise<string> {
  if (!notes) return 'Notes are not ready yet.';
  const view = snapshot();
  const body = { partId: s.part.id, partName: s.part.name, assembly: s.group, kind, text: text || `${kind} (marked in the headset)`, at: [...s.part.at] as [number, number, number], ask: { size: ask.size ?? 0.2, tolerance: ask.tolerance ?? 1e-4, hours: (ask.time ?? 86400) / 3600 }, round: run.m.rounds.length, view };
  try { await notes.add(body); } catch (e) { return `The note could not be kept: ${(e as { code?: string }).code ?? 'the store refused it'}.`; }
  return `Noted on ${s.part.name}: ${body.text}.${notes.shared ? ' It is kept with the machine; I read it with your view.' : ' Kept in this browser only.'}`;
}
// ---- the hologram: any assembly lifted out and unravelled in the air ---------------------------------------------------------
let tree: TreeNode = { id: '', name: '', parts: [], children: [] }, partsById = new Map<string, Part>();
const holo = new Unravel(scene, new THREE.Vector3(0, 1.36, -0.62), 0.55);
let xray = false, isolated: Set<string> | null = null, reportsMode: 'dots' | 'full' | 'off' = 'dots', framing = true, panelsOn = true;
// your own dragging takes the view back from me until I am asked to show something again
renderer.domElement.addEventListener('pointerdown', () => { framing = false; });
/** The node a request means: an id or name in the tree, the assembly of a part it names, or what you point at. */
function nodeFor(target: string): TreeNode | null {
  const t = target.toLowerCase().trim();
  if (!t || t === 'this' || t === 'it') {
    const s = selectedId ? partsById.get(selectedId) : null;
    if (!s) return holo.showing;
    const path = pathOf(s), showing = holo.showing;
    // one level deeper than what is out, along the part you point at
    for (let d = 1; d <= path.length; d++) { const id = path.slice(0, d).join('/'); if (!showing || (showing.id !== id && showing.id.split('/').length < d && id.startsWith(showing.id))) return treeNodeAt(tree, id); }
    return treeNodeAt(tree, path.slice(0, 1).join('/'));
  }
  if (/^(the )?(machine|printer|whole|everything|all)/.test(t)) return tree;
  const flat: TreeNode[] = []; const walk = (n: TreeNode) => { flat.push(n); n.children.forEach(walk); }; walk(tree);
  const norm = t.replace(/\baxis\b/g, '').replace(/\s+/g, ' ').trim();
  const exact = flat.find((n) => n.id === norm || n.id === norm.replace(/ /g, '/') || n.name.toLowerCase() === t);
  if (exact) return exact;
  const g = groupFor(t); if (g) { const n = treeNodeAt(tree, g === 'placement' ? 'frame' : g); if (n) return n; }
  // an axis is named by one letter: keep it
  const words = norm.split(' ').filter((w) => w.length > 1 || /^[xyz]$/.test(w));
  const axisWord = words.find((w) => /^[xyz]$/.test(w));
  const scored = flat.filter((n) => n.id && (!axisWord || n.id.split('/')[0]!.startsWith(axisWord))).map((n) => ({ n, k: words.filter((w) => (/^[xyz]$/.test(w) ? n.id.split('/')[0]!.startsWith(w) : `${n.id} ${n.name}`.toLowerCase().includes(w))).length - n.id.split('/').length * 0.01 })).filter((x) => x.k > 0.5).sort((a, b) => b.k - a.k);
  if (scored[0]) return scored[0].n;
  const p = partsFor(target)[0]; return p ? treeNodeAt(tree, pathOf(p.part).slice(0, 1).join('/')) : null;
}
function expand(target: string, apart: boolean): string {
  const node = nodeFor(target); framing = true;
  if (!node) return `I can't find ${target || 'what to open'} on this machine. Point at a part first, or name an assembly.`;
  holo.show(node, partsById, performance.now() / 1000);
  if (apart) window.setTimeout(() => holo.apart(performance.now() / 1000), 900);
  attention = { ids: new Set(node.parts), until: clock() + 16 };
  if (isolated) isolated = new Set(node.parts);
  return `${node.name}: ${node.parts.length} parts${node.children.length ? `, in ${node.children.length} subsystems: ${node.children.map((c) => c.name).join(', ')}` : ''}. Point at any of them to open it.`;
}
function up(): string {
  const n = holo.showing; if (!n) return 'Nothing is out.';
  const parent = n.id.includes('/') ? treeNodeAt(tree, n.id.split('/').slice(0, -1).join('/')) : tree;
  if (!parent || parent === tree) { holo.clear(); return 'Back in the machine.'; }
  holo.show(parent, partsById, performance.now() / 1000); window.setTimeout(() => holo.apart(performance.now() / 1000), 600);
  return `${parent.name}, ${parent.children.length} subsystems.`;
}
function pickHolo(): boolean {
  const hit = holo.pick(ray);
  if (!hit) return false;
  if (hit.kind === 'child') { say(expand(hit.node.id, true)); return true; }
  holo.showPart(hit.part);
  const s = shown.get(hit.part.id); if (s) { selectedId = s.part.id; attention = { ids: new Set([s.part.id]), until: clock() + 14 }; }
  say(describe(brief(s ?? undefined) ?? { id: hit.part.id, name: hit.part.name, category: hit.part.category, material: hit.part.material, mass: hit.part.mass, values: hit.part.values }, 3));
  return true;
}
function toggleIsolate(): void { isolated = isolated ? null : new Set(holo.showing?.parts ?? (selectedId ? nodeFor('')?.parts ?? [] : [])); if (isolated && !isolated.size) isolated = null; }
function cycleReports(): void { reportsMode = reportsMode === 'dots' ? 'full' : reportsMode === 'full' ? 'off' : 'dots'; drawPins(); }

// ---- building the printer: every part to its place, step by step, in the order the build law gives -------------------------
let machineBuild: { steps: BuildStep[]; t0: number; at: number } | null = null;
const STEP_S = 1.4;
function buildIt(target: string): string {
  const node = target ? nodeFor(target) : holo.showing ?? nodeFor(''); framing = true;
  if (!node || node === tree) {
    const steps = buildSteps(run.m.parts);
    machineBuild = { steps, t0: clock() + 0.5, at: -1 }; holo.clear();
    return `Building the printer from nothing: ${steps.length} steps, from the ground up. The frame first, then each axis, the head, the wiring, the guard.`;
  }
  const steps = buildSteps(run.m.parts, node.id);
  holo.show(node, partsById, performance.now() / 1000); holo.build(steps, performance.now() / 1000);
  return `Building ${node.name} in the air: ${steps.length} steps, from the inside out. ${steps[0]?.title ?? ''} first.`;
}
function stepMachineBuild(t: number): void {
  const b = machineBuild!, k = Math.floor((t - b.t0) / STEP_S);
  const stepOf = new Map<string, number>(); b.steps.forEach((s2, i) => { for (const id of s2.parts) stepOf.set(id, i); });
  for (const s2 of shown.values()) {
    const si = stepOf.get(s2.part.id) ?? b.steps.length, u = ease((t - b.t0 - si * STEP_S) / 0.8);
    s2.obj.visible = u > 0;
    const base = s2.part.shape.kind === 'wire' ? ZERO : s2.obj.userData.at as THREE.Vector3;
    s2.obj.position.copy(base).add(tmp.set(0, (1 - u) * 0.35, 0));
    const m = s2.obj.userData.material as THREE.MeshStandardMaterial;
    if (si === Math.min(k, b.steps.length - 1) && u > 0) { m.emissive.setHex(0x4dd0e1); m.emissiveIntensity = 0.6 * (1 - u) + 0.15; }
  }
  if (k !== b.at && k < b.steps.length) {
    b.at = k; const st = b.steps[k]!;
    attention = { ids: new Set(st.parts), until: t + STEP_S * 1.5 };
    stepCard.draw(`BUILD · step ${st.n} of ${b.steps.length}`, [{ text: st.title, size: 1.1, color: '#ffffff' }, { text: st.says, size: 0.9, color: '#ffe082' }, ...b.steps.slice(Math.max(0, k - 5), k).map((x) => ({ text: `✓ ${x.n}. ${x.title}`, size: 0.75, color: '#69f0ae' }))], '#ffb74d');
    subtitle.draw('', [{ text: `Claude: step ${st.n}, ${st.title}: ${st.says.slice(0, 120)}`, size: 1.0 }], '#ffb74d');
  }
  if (k >= b.steps.length + 1) { machineBuild = null; say(`Built: ${b.steps.length} steps, ${run.m.parts.length} parts, every one where its law put it.`); }
}

// ---- Claude's loop: each report you sent, where it is, and what I put to you --------------------------------------------------
const loopCanvas = document.createElement('canvas'); loopCanvas.width = 1800; loopCanvas.height = 1100;
const loopTex = new THREE.CanvasTexture(loopCanvas); loopTex.colorSpace = THREE.SRGBColorSpace;
const loopBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.7), new THREE.MeshBasicMaterial({ map: loopTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
facing(loopBoard, 1.85, 1.45, 0.2); loopBoard.renderOrder = 15;
let proposals: Proposal[] = [];
const STAGE_NAME: Record<string, string> = { reported: 'REPORTED', read: 'READ', diagnosed: 'DIAGNOSED', law: 'LAW WRITTEN', tested: 'TESTED', live: 'LIVE' };
function drawLoop(): void {
  const g = loopCanvas.getContext('2d')!, W = loopCanvas.width, H = loopCanvas.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(3,14,22,0.82)'; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 26); g.fill();
  g.strokeStyle = '#ffb74d'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#ffb74d'; g.font = '600 46px system-ui'; g.textBaseline = 'top'; g.fillText("CLAUDE'S LOOP · your reports, live", 40, 30);
  const cols = LOOP_STAGES.length, cw = (W - 80) / cols, top = 110;
  LOOP_STAGES.forEach((st, i) => {
    const x = 40 + i * cw;
    g.fillStyle = 'rgba(77,208,225,0.08)'; g.fillRect(x + 4, top, cw - 8, H - top - 260);
    g.fillStyle = '#9fdfee'; g.font = '600 26px system-ui'; g.fillText(STAGE_NAME[st]!, x + 14, top + 12);
    if (i < cols - 1) { g.fillStyle = '#2e7d8c'; g.fillText('→', x + cw - 30, top + 12); }
    const here = allNotes.filter((n) => (n.stage ?? 'reported') === st);
    here.slice(0, 6).forEach((n, j) => {
      const y = top + 56 + j * 118, c = `#${(KIND_COLOUR[n.kind] ?? 0xffd740).toString(16).padStart(6, '0')}`;
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 12, y, cw - 24, 108);
      g.fillStyle = c; g.fillRect(x + 12, y, 8, 108);
      g.fillStyle = '#ffffff'; g.font = '500 21px system-ui';
      const words = (n.text || n.kind).split(/\s+/); let line = '', ly = y + 8, lines = 0;
      for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > cw - 48 && line) { g.fillText(line, x + 28, ly); ly += 25; line = w; if (++lines >= 3) { line = '…'; break; } } else line = t; }
      if (lines < 4) g.fillText(line, x + 28, ly);
      g.fillStyle = '#7fb3c8'; g.font = '400 17px system-ui'; g.fillText(`${n.partName.slice(0, 34)}${n.law ? ` · law ${n.law}` : ''}`, x + 28, y + 84);
    });
  });
  // what I put to you
  const py = H - 240;
  g.fillStyle = '#ffd740'; g.font = '600 30px system-ui'; g.fillText('FOR YOU TO DECIDE', 40, py);
  const open = proposals.filter((p) => p.status === 'proposed');
  if (!open.length) { g.fillStyle = '#7fb3c8'; g.font = '400 24px system-ui'; g.fillText(proposals.length ? 'nothing open: every proposal decided' : 'nothing yet', 40, py + 48); }
  open.slice(0, 2).forEach((p, i) => { g.fillStyle = '#ffffff'; g.font = '500 24px system-ui'; g.fillText(`${p.title}`.slice(0, 120), 40, py + 46 + i * 84); g.fillStyle = '#ffe082'; g.font = '400 20px system-ui'; g.fillText(`${(p.options ?? ['approve', 'decline']).join('  ·  ')}`.slice(0, 140), 40, py + 78 + i * 84); });
  loopTex.needsUpdate = true;
  drawDecide();
}
// the choices, pressable: on the screen, and as buttons under the board in the headset
const decide = document.createElement('div');
decide.style.cssText = 'position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(26rem,calc(100vw - 32px));z-index:5;display:flex;flex-direction:column;gap:6px;font:13px/1.4 system-ui;color:#d9f3ff';
document.body.appendChild(decide);
const decideChips = new THREE.Group(); decideChips.position.set(1.85, 1.0, 0.2); decideChips.lookAt(0, 1.55, 0.7); scene.add(decideChips);
const decideMeshes: { mesh: THREE.Mesh; act: () => void }[] = [];
function drawDecide(): void {
  decide.replaceChildren(); for (const c of decideMeshes) decideChips.remove(c.mesh); decideMeshes.length = 0;
  const open = proposals.filter((p) => p.status === 'proposed');
  open.slice(0, 2).forEach((p, pi) => {
    const box = document.createElement('div'); box.style.cssText = 'padding:8px 10px;border-radius:10px;background:rgba(3,14,22,0.85);border:1px solid #ffb74d';
    const h = document.createElement('div'); h.style.cssText = 'font-weight:600;color:#ffe082'; h.textContent = `Claude proposes: ${p.title}`;
    const w = document.createElement('div'); w.textContent = p.why; w.style.cssText = 'color:#bfe6f2;margin:4px 0';
    const row2 = document.createElement('div'); row2.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
    for (const opt of p.options ?? ['approve', 'decline']) {
      const act = () => { void notes?.decide(p.id, opt === 'approve' ? 'approved' : opt === 'decline' ? 'declined' : `chose: ${opt}`); line('you', `decided "${p.title}": ${opt}`); say(`Thank you. "${opt}" it is: I'll take it from here.`); };
      button(opt, act, row2);
      const c = card(0.32, 0.07, 512); c.draw('', [{ text: opt, size: 1.7 }], '#ffb74d'); c.mesh.position.set(((decideMeshes.length % 3) - 1) * 0.34, -pi * 0.16 - Math.floor((decideMeshes.length % 6) / 3) * 0.08, 0); decideChips.add(c.mesh); decideMeshes.push({ mesh: c.mesh, act });
    }
    box.append(h, w, row2); decide.appendChild(box);
  });
}

// ---- controls: the playback ---------------------------------------------------------------------------------------------
const step = () => { if (current + 1 < beats.length) offset += starts[current + 1]! - (clock()); };
const togglePause = () => { if (paused) { offset -= (performance.now() - pausedAt) / 1000; paused = false; } else { pausedAt = performance.now(); paused = true; } };
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;right:16px;top:calc(12px + env(safe-area-inset-top,0px));display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;z-index:5;max-width:calc(100vw - 32px)';
const BTN = 'font:600 13px system-ui;padding:8px 12px;border-radius:8px;border:1px solid #2e7d8c;background:#06141c;color:#bdefff;cursor:pointer';
const button = (text: string, on: (b: HTMLButtonElement) => void, parent: HTMLElement = ui) => { const b = document.createElement('button'); b.textContent = text; b.style.cssText = BTN; b.onclick = () => on(b); parent.appendChild(b); return b; };
button('Pause', (b) => { togglePause(); b.textContent = paused ? 'Play' : 'Pause'; });
button('Next', () => step());
button('Run again', () => say(world2.replay()));
button('Voice on', (b) => { voice = !voice; b.textContent = voice ? 'Voice on' : 'Voice off'; if (!voice) speechSynthesis.cancel(); });
document.body.appendChild(ui);
const tools = document.createElement('div');
tools.style.cssText = 'position:fixed;right:16px;top:calc(60px + env(safe-area-inset-top,0px));display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;z-index:5;max-width:min(34rem,calc(100vw - 32px))';
button('⤢ Expand', () => say(expand('', true)), tools);
button('▶ Build this', () => say(buildIt('')), tools);
button('▶ Build the printer', () => say(buildIt('the machine')), tools);
button('⟲ Up', () => say(up()), tools);
button('✕ Close', () => { holo.clear(); isolated = null; }, tools);
button('X-ray', (b) => { xray = !xray; b.style.borderColor = xray ? '#ffd740' : '#2e7d8c'; }, tools);
button('Isolate', (b) => { toggleIsolate(); b.style.borderColor = isolated ? '#ffd740' : '#2e7d8c'; }, tools);
button('Reports: dots', (b) => { cycleReports(); b.textContent = `Reports: ${reportsMode}`; }, tools);
button('Panels', (b) => { panelsOn = !panelsOn; b.style.borderColor = panelsOn ? '#2e7d8c' : '#ffd740'; }, tools);
button('Look: my loop', () => { framing = false; orbit.target.set(1.85, 1.45, 0.2); camera.position.set(0.45, 1.5, 1.05); }, tools);
button('Look: machine', () => { framing = false; orbit.target.set(view[3], view[4], view[5]); camera.position.set(view[0], view[1], view[2]); }, tools);
document.body.appendChild(tools);
window.addEventListener('keydown', (e) => { if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === ' ') togglePause(); if (e.key === 'ArrowRight') step(); if (e.key === 'r') say(world2.replay()); });

// ---- talking with Claude ------------------------------------------------------------------------------------------------
let brain: Brain | null = null, busy: AbortController | null = null;
voice = true;
const voiceCard = card(0.55, 0.16, 1200); scene.add(voiceCard.mesh);
voiceCard.draw('', [{ text: 'Hi. Ask me anything about this machine, or point at a part.', size: 1.1 }]);
const chat = document.createElement('div');
chat.style.cssText = 'position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(30rem,calc(100vw - 32px));z-index:5;display:flex;flex-direction:column;gap:6px;font:14px/1.4 system-ui';
const log = document.createElement('div');
log.style.cssText = 'max-height:30vh;overflow:auto;display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:10px;background:rgba(3,14,22,0.78);border:1px solid #1f5866;color:#d9f3ff';
const row = document.createElement('form');
row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
const input = document.createElement('input');
input.placeholder = 'Talk to Claude: "show me the y motor", "why is this 9 mm?", "take the head apart"';
input.style.cssText = 'flex:1 1 14rem;min-width:0;font:14px system-ui;padding:9px 10px;border-radius:8px;border:1px solid #2e7d8c;background:#020a10;color:#e6f7ff';
const kindSel = document.createElement('select');
for (const k of ['flaw', 'question', 'idea', 'good']) { const o = document.createElement('option'); o.value = k; o.textContent = k; kindSel.appendChild(o); }
kindSel.style.cssText = BTN;
row.append(input);
const sendBtn = button('Send', () => undefined, row); sendBtn.type = 'submit';
const noteBtn = button('📌 Note', () => { void markNote(kindSel.value as NoteKind, input.value.trim()); }, row); noteBtn.type = 'button'; row.insertBefore(kindSel, noteBtn);
const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
interface SpeechRec { lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; start(): void }
if (SR) { const mic = button('🎤', () => { try { const r = new SR(); r.lang = 'en-US'; r.interimResults = false; r.onresult = (e) => { const said = e.results[0][0].transcript; void converse(said); }; r.onerror = () => line('system', 'The microphone is not available here; type instead.'); r.start(); } catch { line('system', 'The microphone is not available here; type instead.'); } }, row); mic.type = 'button'; }
row.onsubmit = (e) => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ''; void converse(t); } };
const status = document.createElement('div'); status.style.cssText = 'font-size:12px;color:#7fb3c8';
chat.append(log, row, status);
document.body.appendChild(chat);
function line(who: 'you' | 'claude' | 'system', text: string): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = `color:${who === 'you' ? '#ffe082' : who === 'claude' ? '#d9f3ff' : '#7fb3c8'}`;
  d.textContent = `${who === 'you' ? 'You' : who === 'claude' ? 'Claude' : '·'}: ${text}`;
  log.appendChild(d); while (log.children.length > 24) log.firstChild!.remove(); log.scrollTop = log.scrollHeight;
  return d;
}
function say(text: string, el?: HTMLDivElement): void {
  if (!text) return;
  if (el) el.textContent = `Claude: ${text}`; else line('claude', text);
  voiceCard.draw('', [{ text, size: 1.0 }], '#4dd0e1');
  subtitle.draw('', [{ text: `Claude: ${text}`, size: 1.0 }], '#4dd0e1');
  if (voice && 'speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[✗✓✎↻·]/g, '')); u.rate = 1.07; speechSynthesis.speak(u); }
}
async function converse(text: string): Promise<void> {
  if (!brain) return;
  busy?.abort(); busy = new AbortController();
  line('you', text);
  const el = line('claude', 'Thinking…');
  voiceCard.draw('', [{ text: 'Thinking…', size: 1.1, color: '#7fb3c8' }]);
  speaking = true;
  try {
    const answer = await brain.ask(text, (t) => { el.textContent = `Claude: ${t}`; voiceCard.draw('', [{ text: t.slice(-260), size: 1.0 }]); }, busy.signal);
    say(answer, el);
  } finally { speaking = false; status.textContent = statusLine(); }
}
const statusLine = () => `${brain?.mode === 'claude' ? 'Claude is answering, acting on the room with its tools.' : 'Words read plainly here (this view cannot ask Claude).'} ${notes?.shared ? 'Notes are kept with the machine, with your view, for Claude to read.' : 'Notes are kept in this browser only.'}`;
async function markNote(kind: NoteKind, text: string): Promise<void> {
  const s = selectedId ? shown.get(selectedId) : undefined;
  if (!s) { say('Point at a part first: click it, or aim and pull the trigger. Then mark it.'); return; }
  input.value = '';
  line('you', `📌 ${kind} on ${s.part.name}${text ? `: ${text}` : ''}`);
  say(await addNote(s, kind, text));
}

// ---- pointing: a click on a part, or the controller's ray -------------------------------------------------------------------
const ray = new THREE.Raycaster();
function partAt(): Shown | null {
  const hits = ray.intersectObjects(machine.children, true);
  for (const h of hits) { let o: THREE.Object3D | null = h.object; while (o && !o.userData.part) o = o.parent; const p = o?.userData.part as Part | undefined; if (p && o!.visible) { const s = shown.get(p.id); if (s && !/polycarbonate/.test(p.material)) return s; } }
  return null;
}
function select(s: Shown): void {
  selectedId = s.part.id;
  attention = { ids: new Set([s.part.id]), until: clock() + 14 };
  const b = brief(s)!;
  say(describe(b, 2));
  status.textContent = `Pointing at ${s.part.name}. Mark it with 📌, or ask about it.`;
}
let down: [number, number] | null = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1), camera);
  if (pickHolo()) return;
  const s = partAt(); if (s) select(s);
});

// ---- the console, for a headset: buttons the controller's ray presses ------------------------------------------------------
const dolly = new THREE.Group(); scene.add(dolly); dolly.add(camera);
const CHIPS: [string, () => void][] = [
  ['What is this?', () => { const s = selectedId ? shown.get(selectedId) : null; void converse(s ? `What is ${s.part.name}, and why is it this way?` : 'What am I looking at?'); }],
  ['Why this size?', () => void converse('Why is the part I am pointing at the size it is? Give me the law and the numbers.')],
  ['✗ Mark flaw', () => void markNote('flaw', '')], ['? Mark question', () => void markNote('question', '')], ['✓ Mark good', () => void markNote('good', '')],
  ['⤢ Expand', () => say(expand('', true))], ['▶ Build this', () => say(buildIt(''))], ['⟲ Up a level', () => say(up())],
  ['✕ Close hologram', () => { holo.clear(); isolated = null; say('Closed.'); }], ['▶ Build the printer', () => say(buildIt('the machine'))], ['X-ray', () => { xray = !xray; }],
  ['Isolate', () => toggleIsolate()], ['Reports', () => cycleReports()], ['Run again', () => say(world2.replay())],
];
const chips: { mesh: THREE.Mesh; act: () => void }[] = [];
const consoleGroup = new THREE.Group(); consoleGroup.position.set(0.55, 1.05, -0.25); consoleGroup.lookAt(0, 1.6, 0.6); scene.add(consoleGroup);
CHIPS.forEach(([text, act], i) => {
  const c = card(0.2, 0.06, 512); c.draw('', [{ text, size: 2.2 }], '#80deea');
  c.mesh.position.set((i % 3) * 0.215 - 0.215, -Math.floor(i / 3) * 0.07, 0); consoleGroup.add(c.mesh);
  chips.push({ mesh: c.mesh, act });
});
const consoleTitle = label('CONSOLE · point and pull the trigger', 0.018, '#9fdfee', 'rgba(0,0,0,0)'); consoleTitle.position.set(0, 0.06, 0); consoleGroup.add(consoleTitle);
const factory = new XRControllerModelFactory();
const lasers: THREE.Line[] = [];
for (let i = 0; i < 2; i++) {
  const ctl = renderer.xr.getController(i); dolly.add(ctl);
  const grip = renderer.xr.getControllerGrip(i); grip.add(factory.createControllerModel(grip)); dolly.add(grip);
  const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x80deea, transparent: true, opacity: 0.6 }));
  laser.scale.z = 3; ctl.add(laser); lasers.push(laser);
  ctl.addEventListener('selectstart', () => {
    ray.setFromXRController(ctl);
    const all = [...chips, ...decideMeshes], hit = ray.intersectObjects(all.map((c) => c.mesh), false)[0];
    if (hit) { all.find((c) => c.mesh === hit.object)?.act(); return; }
    if (pickHolo()) return;
    const s = partAt(); if (s) select(s);
  });
  ctl.addEventListener('squeezestart', () => togglePause());
}
// walking: the left stick moves you where you look, the right stick turns you a twelfth at a time
let turned = false;
function walk(dt: number): void {
  const session = renderer.xr.getSession(); if (!session) return;
  for (const src of session.inputSources) {
    const ax = src.gamepad?.axes; if (!ax || ax.length < 4) continue;
    const [sx, sy] = [ax[2]!, ax[3]!];
    if (src.handedness === 'left' && Math.hypot(sx, sy) > 0.15) {
      const head = renderer.xr.getCamera(); const fwd = new THREE.Vector3(); head.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      dolly.position.addScaledVector(fwd, -sy * 1.2 * dt).addScaledVector(right, sx * 1.2 * dt);
    }
    if (src.handedness === 'right') { if (Math.abs(sx) > 0.7 && !turned) { dolly.rotateY(-Math.sign(sx) * Math.PI / 6); turned = true; } if (Math.abs(sx) < 0.3) turned = false; }
  }
}

// ---- views, start ---------------------------------------------------------------------------------------------------------
const VIEWS: Record<string, [number, number, number, number, number, number]> = {
  front: [0, 1.6, 0.45, 0, 1.3, -1.3],
  close: [0.25, 1.25, -0.35, 0, 0.85, -1.25],
  side: [1.2, 1.35, -0.2, 0, 0.9, -1.3],
  pipeline: [0, 1.75, 0.3, 0, 1.95, -1.6],
  wide: [0, 2.0, 1.9, 0, 1.2, -1.2],
};
const view = VIEWS[params.get('view') ?? 'front'] ?? VIEWS.front!;
camera.position.set(view[0], view[1], view[2]); camera.lookAt(view[3], view[4], view[5]);
// on a screen: drag to look round it, scroll to come closer (the headset's own pose replaces this)
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(view[3], view[4], view[5]); orbit.enableDamping = true; orbit.maxDistance = 5; orbit.update();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

async function boot() {
  start({});
  if (params.get('xr') === 'quest3') {
    const { XRDevice, metaQuest3 } = await import('iwer');
    const device = new XRDevice(metaQuest3);
    device.installRuntime({ forceInstall: true });
    device.stereoEnabled = true;
    device.position.set(view[0], view[1], view[2]);
    const dir = new THREE.Vector3(view[3] - view[0], view[4] - view[1], view[5] - view[2]).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0)));
    device.quaternion.set(q.x, q.y, q.z, q.w);
    const session = await (navigator as Navigator & { xr: XRSystem }).xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(session as unknown as XRSession);
  } else document.body.appendChild(VRButton.createButton(renderer));
  let last = performance.now();
  renderer.setAnimationLoop(() => { const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; if (renderer.xr.isPresenting) walk(dt); else orbit.update(); tick(); renderer.render(scene, camera); });
  // the mind and the notes arrive when the viewer answers; the room works without them
  void makeNotes().then((n) => { notes = n; n.subscribe((all) => { allNotes = all; drawPins(); }); n.proposals((all) => { proposals = all; drawLoop(); }); status.textContent = statusLine(); });
  drawLoop();
  void makeBrain(world2).then((b) => { brain = b; status.textContent = statusLine(); });
  (window as unknown as { ready: boolean }).ready = true;
}
void boot();

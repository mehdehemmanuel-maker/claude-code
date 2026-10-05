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
import type { Choices, Machine, Step } from '../embody/embody';
import { embodyAny, type Learned } from '../embody/any';
import { practice, type Operation, type OpEvent } from '../embody/operate';
import { breaks, causalOf, trace, type Causal, type CauseKind } from '../embody/causal';
import { readAsk } from '../words';
import { intentFromSpec } from '../spec';
import { Hud } from './hud';
import { Keyboard } from './keyboard';
import { describe, makeBrain, type Brain, type PartBrief, type WorldApi } from './brain';
import { makeNotes, STAGES as LOOP_STAGES, type Note, type NoteKind, type Notes, type Proposal } from './notes';
import { buildSteps, nodeAt as treeNodeAt, pathOf, treeOf, type BuildStep, type TreeNode } from '../embody/tree';
import { Unravel } from './unravel';
import { LAW_UPDATES } from '../embody/journal';
import { boxOf, type Flaw, type Part } from '../embody/part';
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

// ---- the pipeline, above and behind it: shown while it runs, or when you ask for it ---------------------------------------
const pipelineGroup = new THREE.Group(); scene.add(pipelineGroup);
const STAGES = ['INTENT', 'GENERATE', 'HEAD', 'MOTORS', 'AXES', 'WIRING', 'CHECK', 'REMEDY'] as const;
type Stage = (typeof STAGES)[number];
const nodeAt = (i: number) => { const th = ((i / (STAGES.length - 1)) * 2 - 1) * 1.15; return new THREE.Vector3(M.x + Math.sin(th) * 1.55, 2.05 - 0.12 * Math.cos(th * 1.4), M.z - Math.cos(th) * 0.75 - 0.15); };
interface Node { ring: THREE.Mesh; core: THREE.Mesh; tag: THREE.Sprite; at: THREE.Vector3 }
const nodes: Node[] = STAGES.map((s, i) => {
  const at = nodeAt(i);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 10, 48), new THREE.MeshBasicMaterial({ color: 0x1d4f5c }));
  ring.position.copy(at); ring.lookAt(0, 1.6, 0.6); pipelineGroup.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), new THREE.MeshBasicMaterial({ color: 0x1d4f5c }));
  core.position.copy(at); pipelineGroup.add(core);
  const tag = label(s, 0.042, '#9fdfee', 'rgba(0,0,0,0)'); tag.position.copy(at).add(new THREE.Vector3(0, -0.14, 0)); pipelineGroup.add(tag);
  return { ring, core, tag, at };
});
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1f5866, transparent: true, opacity: 0.8 });
const curveBetween = (a: THREE.Vector3, b: THREE.Vector3, lift = 0.06) => new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, lift, 0)), b);
const edges = STAGES.slice(1).map((_, i) => curveBetween(nodes[i]!.at, nodes[i + 1]!.at));
for (const c of edges) pipelineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(24)), edgeMat));
// the loop: from the remedy back to the head, over the top
const loopBack = new THREE.CubicBezierCurve3(nodes[7]!.at, nodes[7]!.at.clone().add(new THREE.Vector3(0, 0.45, 0.05)), nodes[2]!.at.clone().add(new THREE.Vector3(0, 0.45, 0.05)), nodes[2]!.at);
const loopLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(loopBack.getPoints(48)), new THREE.LineDashedMaterial({ color: 0xffb74d, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.7 }));
loopLine.computeLineDistances(); pipelineGroup.add(loopLine);
const loopTag = label('generate → identify flaws → update → repeat', 0.04, '#ffcc80', 'rgba(0,0,0,0)'); loopTag.position.copy(loopBack.getPoint(0.5)).add(new THREE.Vector3(0, 0.05, 0)); pipelineGroup.add(loopTag);
const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); pipelineGroup.add(pulse);
const pulseLight = new THREE.PointLight(0x80deea, 0.8, 0.6); pulse.add(pulseLight);

// ---- cards ---------------------------------------------------------------------------------------------------------
const facing = (m: THREE.Object3D, x: number, y: number, z: number) => { m.position.set(x, y, z); m.lookAt(0, 1.55, 0.7); scene.add(m); };
const stepCard = card(0.66, 0.62); facing(stepCard.mesh, -0.78, 1.3, -0.95);
const roundsCard = card(0.66, 0.62); facing(roundsCard.mesh, 0.78, 1.3, -0.95);
const lawsCard = card(0.7, 0.86); facing(lawsCard.mesh, -1.35, 1.25, -0.3);
const liveCard = card(0.7, 0.86); facing(liveCard.mesh, 1.35, 1.25, -0.3);
// the logic of it: every decision the embodiment took, the law that took it, and what else it tried
const gatesCard = card(0.82, 0.86, 1400); facing(gatesCard.mesh, 1.35, 1.25, 0.3); gatesCard.mesh.visible = false;
function drawGates(): void {
  const gs = run?.m.gates ?? [];
  const lines: { text: string; color?: string; size?: number }[] = gs.length ? gs.slice(0, 14).flatMap((g) => [
    { text: `${g.held ? '◆' : '◇'} ${g.id}: ${g.outcome}`, color: g.held ? '#69f0ae' : '#ff8a80', size: 0.9 },
    { text: `   ${g.question} · ${g.law}`.slice(0, 150), color: '#9fdfee', size: 0.68 },
    ...(g.tried.length > 1 ? [{ text: `   tried: ${g.tried.join(' | ')}`.slice(0, 170), color: '#ffe082', size: 0.62 }] : []),
  ]) : [{ text: 'The printer decides by its remedies, round by round: see the rounds.', color: '#9fdfee', size: 0.9 }];
  gatesCard.draw(`LOGIC GATES · ${gs.length} decisions`, lines, '#b388ff');
}
const subtitle = card(1.1, 0.2, 1400); subtitle.mesh.position.set(0, 1.62, -1.15); subtitle.mesh.lookAt(0, 1.5, 0.6); scene.add(subtitle.mesh);
const title = label('NEXUS · the forge · live', 0.055, '#ffffff', 'rgba(0,0,0,0)'); title.position.set(0, 2.6, -1.7); pipelineGroup.add(title);
// one voice, mine, above my head: the centre of your view stays the machine's
subtitle.mesh.visible = false;
// a part's own card, beside the part you point at, for a while
const partCard = card(0.34, 0.27, 900); scene.add(partCard.mesh); partCard.mesh.visible = false;
let partCardUntil = 0;

// Claude, beside the machine
const robot = new Robot(); scene.add(robot.root); for (const s of robot.senses) scene.add(s);
const nameplate = label('CLAUDE', 0.022, '#4dd0e1', 'rgba(0,0,0,0)'); nameplate.position.set(0, 1.42, 0); robot.root.add(nameplate);
const beam = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff8a80, transparent: true, opacity: 0.9 })); beam.frustumCulled = false; scene.add(beam);
// the edge of your view: the time, the weather, and what I am doing
const hud = new Hud(); scene.add(hud.group);
// the parts bay beside the pedestal, where my arms take each part from when I build
const bay = new THREE.Group(); scene.add(bay);
{
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x0b141c, metalness: 0.7, roughness: 0.35 })); top.position.y = 0.55; bay.add(top);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 16), top.material); legs.position.y = 0.275; bay.add(legs);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.26), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.18, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.562; bay.add(glow);
  const tag = label('PARTS BAY', 0.018, '#9fdfee', 'rgba(0,0,0,0)'); tag.position.set(0, 0.6, 0.16); bay.add(tag);
}
const bayPoint = new THREE.Vector3();
let carry: THREE.Vector3 | null = null;
// a cut through the machine, to see inside: across its depth or its width
let section: 'off' | 'depth' | 'width' = 'off';
const clip = new THREE.Plane();
renderer.localClippingEnabled = true;

// ---- the run: here, in the page --------------------------------------------------------------------------------------
interface Run { intent: Intent; s: Structure; m: Machine; genMs: number; embMs: number }
// nothing stands here until you ask: the room waits, with what you might ask for one press away
const NO_CHOICES: Choices = { bedSupport: 1, bedT: 0, streams: 0, room: [0, 0, 0], exhausted: [] };
const EMPTY_MACHINE: Machine = { name: 'nothing yet', parts: [], values: [], flaws: [], rounds: [{ n: 1, flaws: [], remedies: [], parts: 0, mass: 0, choices: NO_CHOICES, snapshot: [], trace: [] }], trace: [], axes: [], hotEnd: null, electrical: null, size: [0, 0, 0], bom: [], config: [], order: [] };
let empty = true;
// what stands here: a printer to an ask of its size, tolerance and time, or anything asked in words
let ask: PrinterAsk = {}, asked: Intent = printer({}), isPrinter = true;
// what operating it taught the design, kept while the same ask stands
let learnedNow: Learned = {};
function runAll(intent: Intent): Run | null {
  const t0 = performance.now(); const s = generate(intent); const t1 = performance.now();
  const m = embodyAny(intent, s, 8, learnedNow); const t2 = performance.now();
  return m ? { intent, s, m, genMs: t1 - t0, embMs: t2 - t1 } : null;
}

// ---- beats: every step of the run, in order, each with how long it is shown ---------------------------------------------
interface Beat { kind: 'intent' | 'generate' | 'step' | 'check' | 'remedy' | 'done'; stage: Stage; round: number; dur: number; step?: Step; flaws: Flaw[]; says: string; detail: { text: string; color?: string; size?: number }[] }
const stageOf: Record<Step['stage'], Stage> = { head: 'HEAD', motor: 'MOTORS', axis: 'AXES', wiring: 'WIRING', whole: 'CHECK', frame: 'AXES', choose: 'GENERATE' };
const fmt = (x: number) => (x === 0 ? '0' : Math.abs(x) >= 1e-2 && Math.abs(x) < 1e5 ? Number(x.toPrecision(3)).toString() : x.toExponential(2).replace('e+', 'e'));
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
  if (p.unit) return id.startsWith(`${p.unit}/motor/`) ? `${p.unit}/motor` : /^(wiring|control|sensing|supply|battery)$/.test(p.unit) ? 'wiring' : p.unit;
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
  if (b.kind === 'step' && b.step && !isPrinter) {
    // any machine: its structure and running gear with the first step that designs them, each motor with its own, the wiring with the wiring
    const st = b.step;
    if (st.stage === 'motor') bornNow(st.where, t, instant);
    else if (st.stage === 'wiring') bornNow('wiring', t, instant);
    else if (st.stage !== 'choose') for (const s2 of shown.values()) if (s2.born === Infinity && s2.group !== 'wiring' && !s2.group.endsWith('/motor')) s2.born = instant ? -1e9 : t + Math.random() * 0.6;
  } else if (b.kind === 'step' && b.step) {
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
  // silent unless asked: what the run is doing goes on the pipeline's card, for when you summon it, not in my voice
  drawRounds(b);
  drawLive(b);
  if (b.kind === 'done') { drawFlaws(); hud.set('idle'); }
}
function drawRounds(b: Beat): void {
  const lines: { text: string; color?: string; size?: number }[] = [];
  for (const r of run.m.rounds) {
    if (r.n > b.round) break;
    const done = r.n < b.round || b.kind === 'check' || b.kind === 'remedy' || b.kind === 'done';
    lines.push({ text: isPrinter ? `Round ${r.n}: streams ${r.choices.streams}, support from ${r.choices.bedSupport === 2 ? 'both sides' : 'one side'}, plate ${(r.choices.bedT * 1e3).toFixed(0)} mm` : `Round ${r.n}: ${r.parts} parts, ${fmt(r.mass)} kg`, color: '#d9f3ff', size: 0.98 });
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
    if (m.hotEnd) lines.push({ text: `streams ${m.hotEnd.streams}, heater ${fmt(m.hotEnd.electrical.P)} W, supply ${m.electrical?.psu.id}`, color: '#ffe082', size: 0.9 });
  } else {
    for (const n of isPrinter ? ['deposition speed', 'acceleration', 'support sag', 'interferences'] : m.config.slice(0, 4).map((c) => c.name)) { const x = val(n); if (x !== undefined) lines.push({ text: `${n} = ${fmt(x)}`, color: '#ffe082', size: 0.95 }); }
    const counts = new Map<string, number>(); for (const s of parts) { const c = s.part.category.split('/')[0]!; counts.set(c, (counts.get(c) ?? 0) + 1); }
    for (const [c, n] of [...counts].sort((x, y) => y[1] - x[1]).slice(0, 7)) lines.push({ text: `${n} × ${c}`, color: '#b3e5fc', size: 0.92 });
  }
  liveCard.draw(b.kind === 'done' ? 'BUILT · BILL AND SETTINGS' : 'LIVE', lines, '#4dd0e1');
}
lawsCard.draw('LAWS THE EXPERIMENT UPDATED', LAW_UPDATES.slice(-7).map((l) => ({ text: `${l.n}. ${l.found} → now ${l.now}`, size: 0.8, color: l.n >= 5 ? '#ffe0b2' : '#c8e6f0' })), '#ffb74d');

// ---- time -----------------------------------------------------------------------------------------------------------------
const realStart = performance.now();
let paused = false, pausedAt = 0, offset = 0, voice = false, targetBeat = -1;
const clock = () => (frozen ?? ((paused ? pausedAt : performance.now()) - realStart) / 1000 + offset);
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const playing0 = () => current < beats.length - 1 && !machineBuild;
let fps = 60;

// a machine of any size stands on the pedestal at a scale that fits it, centred, its feet on the top
let fitScale = 1, standR = 0.85;
function fit(): void {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of run.m.parts) { if (p.shape.kind === 'wire') continue; const b = boxOf(p); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, b.c[k]! - b.h[k]!); hi[k] = Math.max(hi[k]!, b.c[k]! + b.h[k]!); } }
  if (!Number.isFinite(lo[0]!)) return;
  const span = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
  fitScale = span > 1.2 ? 1.1 / span : 1;
  machine.scale.setScalar(fitScale);
  machine.position.set(M.x - (fitScale * (lo[0]! + hi[0]!)) / 2, M.y + 0.015 - fitScale * Math.min(0, lo[1]!), M.z - (fitScale * (lo[2]! + hi[2]!)) / 2);
  const k = Math.max(1, (fitScale * Math.max(hi[0]! - lo[0]!, hi[2]! - lo[2]!)) / 2 / 0.42);
  pedestal.scale.set(k, 1, k); rim.scale.set(k, k, 1);
  standR = 0.42 * k + 0.43;
  bay.position.set(M.x + (0.42 * k + 0.62), 0, M.z - 0.35);
  bayPoint.set(bay.position.x, 0.62, bay.position.z);
}
/** The pipeline's stages, named for what this machine's rounds design. */
function relabel(): void {
  const names = isPrinter ? STAGES : (['INTENT', 'GENERATE', 'CHOOSE', 'MOTORS', 'STRUCTURE', 'WIRING', 'CHECK', 'REMEDY'] as const);
  nodes.forEach((n, i) => { pipelineGroup.remove(n.tag); n.tag.material.map?.dispose(); n.tag.material.dispose(); n.tag = label(names[i]!, 0.042, '#9fdfee', 'rgba(0,0,0,0)'); n.tag.position.copy(n.at).add(new THREE.Vector3(0, -0.14, 0)); pipelineGroup.add(n.tag); });
  title.material.map?.dispose(); pipelineGroup.remove(title);
}
/** The room with nothing in it yet: the pedestal, me standing by, and what you might ask for. */
function showEmpty(): void {
  empty = true;
  run = { intent: printer({}), s: generate(printer({})), m: EMPTY_MACHINE, genMs: 0, embMs: 0 };
  tree = treeOf([], 'nothing yet'); partsById = new Map(); beats = []; starts = []; total = 0; current = -1;
  hud.set('idle', 'ask me to build anything');
  line('system', 'Nothing here yet. Ask me to build anything, or pick one of these.');
}
const sizeOf = (m: Machine) => (Math.max(...m.size) > 2 ? `${m.size.map((x) => fmt(x)).join(' × ')} m` : `${m.size.map((x) => fmt(x * 1e3)).join(' × ')} mm`);
function start(intent: Intent = asked, o: { replay?: boolean; build?: boolean } = {}): string {
  if (intent !== asked) { learnedNow = {}; operated = null; }
  empty = false;
  const next = runAll(intent);
  if (!next) return 'The generator gave nothing to embody for that ask: a gap, not a machine.';
  asked = intent; isPrinter = !!next.m.hotEnd;
  for (const s of shown.values()) machine.remove(s.obj);
  shown.clear(); for (const d of dyingList) machine.remove(d.obj); dyingList.length = 0;
  run = next; explodeTo.clear(); exploded.clear(); attention = null; selectedId = null;
  tree = treeOf(run.m.parts, run.m.name); partsById = new Map(run.m.parts.map((p) => [p.id, p])); holo.clear(); machineBuild = null; carry = null;
  fit(); relabel(); drawPins(); drawFlaws(); hud.set('working', `designing ${run.m.name}`);
  // on a screen, stand back far enough to see all of it, a little to the side and above
  if (!isPrinter && !renderer.xr.isPresenting) { const c = new THREE.Vector3(M.x, M.y + 0.3, M.z), d = 1.9; orbit.target.copy(c); camera.position.copy(c).add(new THREE.Vector3(-0.55, 0.62, 1).setLength(d)); framing = false; }
  beats = beatsOf(run);
  starts = []; total = 0; for (const b of beats) { starts.push(total); total += b.dur * pace; }
  current = -1; lastRound = 0;
  if (frozen === null) offset -= clock();
  // the design's own process is there to replay when asked; otherwise it stands designed, and I build it, live
  if (!o.replay && frozen === null) { offset += total; if (o.build !== false && !params.has('end')) buildIt('the machine'); }
  const last = run.m.rounds.at(-1)!;
  const gaps = last.flaws.filter((f) => f.check === 'gap').length;
  return `${run.m.rounds.length} rounds, ${last.flaws.length - gaps} flaw${last.flaws.length - gaps === 1 ? '' : 's'} and ${gaps} gap${gaps === 1 ? '' : 's'} left, ${run.m.parts.length} parts, ${fmt(run.m.parts.reduce((x, p) => x + p.mass, 0))} kg, ${sizeOf(run.m)}.`;
}

let lastT = 0;
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
    const thin = xray && (isPrinter ? (s.group === 'placement' || /polycarbonate/.test(s.part.material)) && !/support/.test(s.part.id) : /envelope|guards|insulation/.test(s.part.category));
    if (m.userData.section !== section) { m.clippingPlanes = section === 'off' ? null : [clip]; m.needsUpdate = true; m.userData.section = section; }
    if (!/polycarbonate/.test(s.part.material)) { m.transparent = thin; m.opacity = thin ? 0.12 : 1; m.depthWrite = !thin; }
    if (isolated && !isolated.has(s.part.id)) s.obj.visible = false;
    const red = lit.has(s.part.id), seen = attention?.ids.has(s.part.id) ?? false, sel = s.part.id === selectedId, hov = s.part.id === hoverId;
    m.emissive.setHex(red ? 0xff1744 : sel ? 0xffd740 : hov ? 0xffffff : seen ? 0x4dd0e1 : t - s.born < 0.9 && s.born > -1e8 ? 0x4dd0e1 : 0x000000);
    m.emissiveIntensity = red ? 0.55 + 0.45 * Math.sin(t * 7) : sel ? 0.7 + 0.3 * Math.sin(t * 5) : hov ? 0.35 : seen ? 0.45 + 0.2 * Math.sin(t * 4) : 0.6 * (1 - (t - s.born) / 0.9);
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

  if (section !== 'off') { machine.getWorldPosition(world); const c0 = machine.localToWorld(tmp.copy(centre0)); clip.set(section === 'depth' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(-1, 0, 0), section === 'depth' ? c0.z : c0.x); }
  for (const [g, to] of explodeTo) { const now2 = exploded.get(g) ?? 0; exploded.set(g, now2 + (to - now2) * Math.min(1, dt * 4)); }
  holo.update(performance.now() / 1000, eye);
  if (machineBuild) stepMachineBuild(t);
  for (const n of pins) n.update(t);

  // Claude: what it attends to is what you pointed at or asked about, else what the playback is working on, else you
  const asked = attention && t < attention.until ? [...attention.ids] : null;
  const focusIds = asked ?? (b && current < beats.length - 1 ? (b.flaws.length ? b.flaws.flatMap(partsOfFlaw) : b.step ? [...shown.values()].filter((s) => s.group === (b.step!.stage === 'head' ? 'hot end' : b.step!.stage === 'wiring' ? 'wiring' : b.step!.where)).map((s) => s.part.id) : []) : []);
  const focus = new THREE.Vector3(); let nf = 0;
  for (const id of focusIds.slice(0, 40)) { const s = shown.get(id); if (!s || !s.obj.visible) continue; s.obj.getWorldPosition(world); focus.add(world); nf++; }
  const target = carry ?? (nf ? focus.divideScalar(nf) : null);
  eyeOf(eye);
  // beside a hologram when one is out, turned to it; else by what it attends to; else beside the machine, turned to you
  if (holo.showing) { const hp = holo.group.position; goal = { th: clamp(Math.atan2(hp.x - M.x, hp.z - M.z) + 0.95, -2.3, 2.3), r: standR + 0.05 }; faceAt = hp; }
  else if (carry) { goal = { th: clamp(Math.atan2(bayPoint.x - M.x, bayPoint.z - M.z) - 0.35, -2.6, 2.6), r: standR }; faceAt = carry; }
  else if (target) { goal = standFor(target); faceAt = target; }
  else { goal = { th: Math.max(-2.3, Math.min(2.3, Math.atan2(eye.x - M.x, eye.z - M.z) + 1.0)), r: Math.max(0.72, standR - 0.13) }; faceAt = eye; }
  // never between you and what you are looking at: stepped round until it is out of the way
  for (let k2 = 0; k2 < 6; k2++) {
    const gx = M.x + Math.sin(goal.th) * goal.r, gz = M.z + Math.cos(goal.th) * goal.r, look = holo.showing ? holo.group.position : target ?? M;
    const ex = look.x - eye.x, ez = look.z - eye.z, L2 = ex * ex + ez * ez, u2 = clamp(((gx - eye.x) * ex + (gz - eye.z) * ez) / Math.max(1e-6, L2), 0, 1);
    if (Math.hypot(gx - (eye.x + u2 * ex), gz - (eye.z + u2 * ez)) > 0.5 && Math.hypot(gx - eye.x, gz - eye.z) > 1.0) break;
    goal = { th: clamp(goal.th + 0.35 * Math.sign(goal.th || 1), -2.6, 2.6), r: goal.r };
  }
  drive(dt);
  robot.root.updateWorldMatrix(true, true);
  const arm: 0 | 1 = target && robot.root.worldToLocal(tmp.copy(target)).x > 0 ? 1 : 0;
  const near = target && robot.root.position.distanceTo(tmp.set(target.x, 0, target.z)) < 1.4;
  robot.reach(arm, near ? target : null); robot.reach(arm === 0 ? 1 : 0, carry && near ? target : null);
  robot.look(target ?? eye);
  if (target && near) { robot.arms[arm].grip.getWorldPosition(world); beam.geometry.setAttribute('position', new THREE.Float32BufferAttribute([world.x, world.y, world.z, target.x, target.y, target.z], 3)); (beam.material as THREE.LineBasicMaterial).color.setHex(carry ? 0xffb74d : b && b.flaws.length && !asked ? 0xff8a80 : 0x80deea); beam.visible = true; } else beam.visible = false;
  const talking = speaking || ('speechSynthesis' in window && speechSynthesis.speaking);
  robot.speaking(talking ? Math.abs(Math.sin(t * 13)) * Math.abs(Math.sin(t * 5.3)) : b && u < 0.6 && current < beats.length - 1 ? 0.5 * Math.abs(Math.sin(t * 11)) : 0);
  voiceCard.mesh.position.copy(robot.root.position).add(tmp.set(0, 1.58, 0)); voiceCard.mesh.lookAt(eye);
  // my voice only when I answer you, for a while after
  voiceCard.mesh.visible = !!busy || performance.now() - lastSayAt < 22000;
  if (!machineBuild && !busy && hud.status !== 'listening') hud.set(playing0() ? 'working' : 'idle', playing0() ? `designing ${run.m.name}` : '');
  fps = fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
  const last = run.m.rounds.at(-1)!, gapsN = last.flaws.filter((f) => f.check === 'gap').length;
  hud.info = `${run.m.parts.length} parts · ${fmt(run.m.parts.reduce((a, p) => a + p.mass, 0))} kg · ${last.flaws.length - gapsN} flaws · ${gapsN} gaps · ${Math.round(fps)} fps`;
  hud.update(renderer.xr.isPresenting ? renderer.xr.getCamera() : camera, eye, renderer.xr.isPresenting && hudOn, dt);
  if (!hudOn) hud.dom.style.display = 'none';
  drawModes();
  modeStrip.visible = renderer.xr.isPresenting && modeChips.length > 0;
  if (modeStrip.visible) { modeStrip.position.copy(hud.group.position).add(tmp.set(0, -0.12, 0)); modeStrip.lookAt(eye); }
  settingsGroup.visible = settingsOpen && renderer.xr.isPresenting; settingsBox.style.display = settingsOpen && !renderer.xr.isPresenting ? 'flex' : 'none';
  if (settingsGroup.visible) { settingsGroup.position.copy(hud.group.position).add(tmp.set(0, -0.24, 0)); settingsGroup.lookAt(eye); }
  // what is on: only what you are doing. The pipeline while it runs; one panel you summoned; a part's card while you
  // point at it; the hologram alone when one is out
  const playing = current < beats.length - 1 && !machineBuild;
  pipelineGroup.visible = (playing || panel === 'pipeline') && !holo.showing;
  stepCard.mesh.visible = panel === 'pipeline' && !holo.showing;
  roundsCard.mesh.visible = panel === 'rounds';
  lawsCard.mesh.visible = panel === 'laws';
  liveCard.mesh.visible = panel === 'bill';
  loopBoard.visible = decideChips.visible = panel === 'loop';
  gatesCard.mesh.visible = panel === 'gates';
  // nothing here yet, or a new ask asked for: what you might ask, in front of you; on a screen, over the box you type in
  const wantNew = panel === 'new' || (empty && panel === 'none');
  suggest.group.visible = wantNew && renderer.xr.isPresenting; suggestBox.style.display = wantNew && !renderer.xr.isPresenting ? 'flex' : 'none';
  if (suggest.group.visible && panel !== 'new') { suggest.group.position.copy(M).add(tmp.set(0, 1.25, 0.35)); suggest.group.lookAt(eye); }
  // the dock goes where you look, low; the menu above it when you open it
  dock.group.visible = renderer.xr.isPresenting;
  if (dock.group.visible) { const head = renderer.xr.getCamera(), f2 = new THREE.Vector3(); head.getWorldDirection(f2); f2.y = 0; if (f2.lengthSq() < 1e-6) f2.set(0, 0, -1); f2.normalize(); const want = eye.clone().addScaledVector(f2, 0.62).add(tmp.set(0, -0.38, 0)); dock.group.position.lerp(want, Math.min(1, dt * 2.5)); dock.group.lookAt(eye); }
  menu.group.visible = menuOpen && renderer.xr.isPresenting;
  if (menu.group.visible) { menu.group.position.copy(dock.group.position).add(tmp.set(0, 0.36, 0)); menu.group.lookAt(eye); }
  if (renderer.xr.isPresenting) { const c3 = renderer.xr.getController(pointerHand); ray.setFromXRController(c3); const hit = ray.intersectObjects(machine.children, true)[0]; hover(hit ? hit.point : null, hit ? partAt() : null); }
  simBoard.visible = panel === 'operate';
  causalGroup.visible = panel === 'causes';
  if (panel !== 'causes') { causalCard.mesh.visible = false; for (const c2 of verdictChips) c2.mesh.visible = false; } else for (const c2 of verdictChips) c2.mesh.visible = !!causalNode;
  verdictBox.style.display = panel === 'causes' && causalNode && !renderer.xr.isPresenting ? 'flex' : 'none';
  if (panel === 'causes') for (const m of nodeMesh.values()) if (m.userData.bad) (m.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(clock() * 6) > 0 ? 0xff1744 : 0x7f0000);
  flawBoard.visible = panel === 'flaws'; flawList.style.display = panel === 'flaws' ? 'flex' : 'none';
  chatCard.mesh.visible = keyboard.mesh.visible = panel === 'chat';
  decide.style.display = panel === 'loop' ? 'flex' : 'none';
  partCard.mesh.visible = clock() < partCardUntil && !holo.showing;
  if (partCard.mesh.visible) partCard.mesh.lookAt(eye);
  for (const t2 of tags) t2.visible = playing || panel === 'flaws';
  if (wrist) { wrist.updateMatrixWorld(); const n2 = tmp.set(0, 0, 1).transformDirection(wrist.matrixWorld), to = off.copy(eye).sub(wrist.getWorldPosition(world)).normalize(); wrist.visible = renderer.xr.isPresenting && n2.dot(to) > 0.25; }
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
const standFor = (p: THREE.Vector3) => ({ th: clamp(Math.atan2(p.x - M.x, p.z - M.z), -2.3, 2.3), r: standR });
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
      `${m.name}${isPrinter ? `, asked: largest part ${fmt((ask.size ?? 0.2) * 1e3)} mm, tolerance ${fmt((ask.tolerance ?? 1e-4) * 1e3)} mm, within ${fmt((ask.time ?? 86400) / 3600)} h` : ''}. ${m.rounds.length} rounds; ${last.flaws.filter((f) => f.check !== 'gap').length} flaws and ${last.flaws.filter((f) => f.check === 'gap').length} gaps left; ${m.parts.length} parts, ${fmt(m.parts.reduce((x, p) => x + p.mass, 0))} kg, ${sizeOf(m)}.`,
      `Rounds: ${m.rounds.map((r) => `${r.n}: ${r.flaws.length} flaws${r.remedies.length ? ` → ${r.remedies.join('; ')}` : ''}`).join(' | ')}`,
      last.flaws.length ? `Left: ${last.flaws.slice(0, 5).map((f) => `${f.check} @ ${f.where}: ${f.says}`).join(' | ')}` : 'Every check holds.',
      `Assemblies (id: parts): ${[...groups].map(([g, n]) => `${g}: ${n}`).join(', ')}.`,
      isPrinter ? `Key values: ${['deposition speed', 'acceleration', 'support sag', 'bridge depth', 'nozzle height'].map((n) => { const x = val(n); return x ? `${n} ${fmt(x.value)} ${x.unit}` : ''; }).filter(Boolean).join('; ')}; ${m.hotEnd?.streams} streams, heater ${fmt(m.hotEnd?.electrical.P ?? 0)} W, supply ${m.electrical?.psu.id}.` : `Key values: ${m.values.slice(0, 14).map((x) => `${x.name} ${fmt(x.value)} ${x.unit}`).join('; ')}.`,
      `Laws the experiment updated: ${LAW_UPDATES.slice(-5).map((l) => `${l.n}. ${l.now}`).join(' | ')}`,
      operated?.operation ? `Operated through its duty (${operated.operation.duty}): ${operated.tries.map((t, i) => `run ${i + 1}: ${t.events.length ? t.events.slice(0, 3).map((e) => `${e.node} ${e.check} at ${e.t.toFixed(0)} s: ${e.says}`).join('; ') : 'holds'}`).join(' | ')}; learned: ${(learnedNow.why ?? []).slice(0, 4).join('; ') || 'nothing'}` : '',
      run.m.gates?.length ? `Decisions (gates): ${run.m.gates.slice(0, 10).map((g) => `${g.id}: ${g.outcome} (${g.law.slice(0, 80)})`).join(' | ')}` : '',
      lastMake ? `Asked in words: "${lastMake.words}". Heard: ${lastMake.heard.join('; ') || 'nothing more'}. Assumed: ${lastMake.assumed.join('; ') || 'nothing'}.` : '',
      allNotes.length ? `The person's notes (${allNotes.length}): ${allNotes.slice(-6).map((n) => `${n.kind} on ${n.partName}: ${n.text}`).join(' | ')}` : 'No notes yet.',
    ].filter(Boolean).join('\n');
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
  rebuild(a) {
    if (!isPrinter) return 'That changes a printer\'s ask. For this, ask me to make it again with the new numbers.';
    const next: PrinterAsk = { ...ask, ...(a.size ? { size: a.size } : {}), ...(a.tolerance ? { tolerance: a.tolerance } : {}), ...(a.hours ? { time: a.hours * 3600 } : {}) };
    ask = next; return `Rebuilt: ${start(printer(next))}`;
  },
  replay() { if (empty) return 'Nothing stands here yet: ask me to build something.'; start(asked, { replay: true }); return 'The design process again, every round, as it ran.'; },
  make(words, spec) {
    let intent: Intent | null = null, heard: string[] = [], assumed: string[] = [];
    if (spec && typeof spec === 'object') { const r = intentFromSpec(spec as Parameters<typeof intentFromSpec>[0]); if (r.intent) intent = r.intent; }
    if (!intent) { const r = readAsk(words); if ('problems' in r) return r.problems.join(' '); intent = r.intent; heard = r.heard; assumed = r.assumed; if (r.shape === 'parts') ask = {}; }
    const out = start(intent);
    lastMake = { words, heard, assumed };
    try { localStorage.setItem('forge:last-ask', words); } catch { /* kept nowhere */ }
    return `${intent.name}: ${out}${assumed.length ? ` I assumed ${assumed.join('; ')}.` : ''}`;
  },
  operate() { return operateIt(); },
  flaws() { summonTo('flaws'); return flawRows().slice(0, 8).map((r, i) => `${i + 1}. ${r.text}`).join(' ') || 'No flaw, gap or report left on it.'; },
  expand: (target) => expand(target, true),
  show: (p2) => { if (p2 === 'none') { panel = 'none'; return 'Out of your way.'; } return summonTo((['pipeline', 'rounds', 'laws', 'bill', 'loop', 'flaws', 'chat', 'gates', 'operate', 'causes'].includes(p2) ? p2 : 'loop') as Panel); },
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
    g.position.set(...(shown.get(n.partId)?.part.at ?? n.at)).add(new THREE.Vector3(0, 0.05 / fitScale, 0));
    g.scale.setScalar(1 / fitScale);
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
async function addNote(s: Shown, kind: NoteKind, text: string, on?: { node: string; verdict: 'flag' | 'approve' | 'reject' | 'test' }): Promise<string> {
  if (!notes) return 'Notes are not ready yet.';
  const view = snapshot();
  const body = { partId: s.part.id, partName: s.part.name, assembly: s.group, kind, text: text || `${kind} (marked in the headset)`, at: [...s.part.at] as [number, number, number], ask: { size: ask.size ?? 0.2, tolerance: ask.tolerance ?? 1e-4, hours: (ask.time ?? 86400) / 3600 }, machine: run.m.name, round: run.m.rounds.length, view, ...(on ? { node: on.node, verdict: on.verdict } : {}) };
  try { await notes.add(body); } catch (e) { return `The note could not be kept: ${(e as { code?: string }).code ?? 'the store refused it'}.`; }
  return `Noted on ${s.part.name}: ${body.text}.${notes.shared ? ' It is kept with the machine; I read it with your view.' : ' Kept in this browser only.'}`;
}
// ---- panels, summoned one at a time in front of you, and sent away again --------------------------------------------------
type Panel = 'none' | 'pipeline' | 'rounds' | 'laws' | 'bill' | 'loop' | 'flaws' | 'chat' | 'gates' | 'operate' | 'causes' | 'new';
let panel: Panel = 'none', lastMake: { words: string; heard: string[]; assumed: string[] } | null = null;
/** Bring a panel up, or put it away if it is the one up. */
function summon(p: Panel): string { return summonTo(panel === p ? 'none' : p); }
/** Bring a panel up, in front of you, whatever was up. */
function summonTo(p: Panel): string {
  panel = p;
  if (panel === 'none') return 'Put away.';
  eyeOf(eye);
  const head = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera, fwd = new THREE.Vector3();
  head.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
  // to your left of what you are looking at, so the machine stays in view beside it
  const left = new THREE.Vector3(fwd.z, 0, -fwd.x);
  const xr = renderer.xr.isPresenting, at = eye.clone().addScaledVector(fwd, xr ? 0.9 : 1.35).addScaledVector(left, xr ? 0.38 : 0.6).add(new THREE.Vector3(0, -0.06, 0));
  const place = (o: THREE.Object3D, dy = 0) => { o.position.copy(at).add(new THREE.Vector3(0, dy, 0)); o.lookAt(eye.x, eye.y + dy, eye.z); };
  if (panel === 'pipeline') place(stepCard.mesh, -0.1);
  if (panel === 'rounds') place(roundsCard.mesh);
  if (panel === 'laws') place(lawsCard.mesh);
  if (panel === 'bill') place(liveCard.mesh);
  if (panel === 'loop') { place(loopBoard, 0.12); place(decideChips, -0.3); }
  if (panel === 'flaws') { drawFlaws(); place(flawBoard, 0.05); }
  if (panel === 'gates') { drawGates(); place(gatesCard.mesh); }
  if (panel === 'operate') { drawSim(); place(simBoard, 0.05); }
  if (panel === 'new') place(suggest.group, 0.12);
  if (panel === 'causes') {
    layCausal(); causalNode = null; causalCard.mesh.visible = false;
    // in a headset at arm's reach and level, to walk along; on a screen where the view looks, filling it
    if (renderer.xr.isPresenting) { causalGroup.position.copy(eye).addScaledVector(fwd, 1.5).add(new THREE.Vector3(0, -0.15, 0)); causalGroup.lookAt(eye.x, causalGroup.position.y, eye.z); }
    else { const look = new THREE.Vector3(); camera.getWorldDirection(look); causalGroup.position.copy(eye).addScaledVector(look, 1.6); causalGroup.lookAt(eye); }
  }
  if (panel === 'chat') { drawChat(); place(chatCard.mesh, 0.1); const kb = eye.clone().addScaledVector(fwd, 0.55).add(new THREE.Vector3(0, -0.32, 0)); keyboard.mesh.position.copy(kb); keyboard.mesh.lookAt(eye.x, eye.y + 0.25, eye.z); }
  if (panel === 'pipeline') drawRoundsNow();
  return ({ pipeline: 'The pipeline.', rounds: 'The rounds.', laws: 'The laws the experiment updated.', bill: 'The bill and the settings.', loop: 'Your reports, and what I put to you.', flaws: `${flawRows().length} to look at. Point at one to go to it.`, chat: 'Type, or say it.', gates: `${run.m.gates?.length ?? 0} decisions, each by its law.`, operate: operated ? 'What operating it found, and what it learned.' : 'Press ▶ Operate.', new: 'What shall I build? Pick one, or say your own.', causes: `${causal?.nodes.length ?? 0} subsystems and what passes between them; ${causal ? breaks(causal).length + (operated?.operation?.events.length ?? 0) : 0} breaks. Point at one.` } as Record<string, string>)[panel] ?? '';
}

// ---- the hologram: any assembly lifted out and unravelled in the air ---------------------------------------------------------
let tree: TreeNode = { id: '', name: '', parts: [], children: [] }, partsById = new Map<string, Part>();
const holo = new Unravel(scene, new THREE.Vector3(0, 1.36, -0.62), 0.55);
let xray = false, isolated: Set<string> | null = null, reportsMode: 'dots' | 'full' | 'off' = 'dots', framing = true;
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
let machineBuild: { steps: BuildStep[]; t0: number; at: number; step: number } | null = null;
function buildIt(target: string): string {
  const node = target ? nodeFor(target) : holo.showing ?? nodeFor(''); framing = true;
  if (!node || node === tree) {
    const steps = buildSteps(run.m.parts);
    machineBuild = { steps, t0: clock() + 0.3, at: -1, step: Math.max(0.22, Math.min(1.4, 22 / Math.max(1, steps.length))) }; holo.clear();
    hud.set('building');
    return `Building ${run.m.name} from the bay: ${steps.length} steps, from the ground up.`;
  }
  const steps = buildSteps(run.m.parts, node.id);
  holo.show(node, partsById, performance.now() / 1000); holo.build(steps, performance.now() / 1000);
  return `Building ${node.name} in the air: ${steps.length} steps, from the inside out. ${steps[0]?.title ?? ''} first.`;
}
function stepMachineBuild(t: number): void {
  const b = machineBuild!, STEP_S = b.step, k = Math.floor((t - b.t0) / STEP_S), cur = Math.max(0, Math.min(k, b.steps.length - 1));
  const stepOf = new Map<string, number>(); b.steps.forEach((s2, i) => { for (const id of s2.parts) stepOf.set(id, i); });
  // the step in hand: its parts as one bundle, taken from the bay, carried over, set down where the law put them
  const tau = (t - b.t0 - cur * STEP_S) / STEP_S, ids = b.steps[cur]?.parts ?? [];
  const c = new THREE.Vector3(), lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  let n = 0;
  for (const id of ids) { const s2 = shown.get(id); if (!s2 || s2.part.shape.kind === 'wire') continue; const bx = boxOf(s2.part); c.add(tmp.set(...bx.c)); lo.min(tmp.set(bx.c[0] - bx.h[0], bx.c[1] - bx.h[1], bx.c[2] - bx.h[2])); hi.max(tmp.set(bx.c[0] + bx.h[0], bx.c[1] + bx.h[1], bx.c[2] + bx.h[2])); n++; }
  if (n) c.divideScalar(n);
  const span = n ? hi.sub(lo).length() * fitScale : 0.1, small = Math.min(1, 0.28 / Math.max(span, 1e-3));
  const from = machine.worldToLocal(bayPoint.clone()), lift = 0.3 / fitScale;
  const uB = ease((tau - 0.2) / 0.55), uC = ease((tau - 0.75) / 0.25), shrink = small + (1 - small) * uC;
  const centre = from.clone().lerp(c, uB).add(tmp.set(0, Math.sin(Math.PI * uB) * lift, 0));
  for (const s2 of shown.values()) {
    const si = stepOf.get(s2.part.id) ?? b.steps.length, base = s2.part.shape.kind === 'wire' ? ZERO : s2.obj.userData.at as THREE.Vector3;
    const m = s2.obj.userData.material as THREE.MeshStandardMaterial;
    if (si < cur || (si === cur && tau >= 1)) { s2.obj.visible = !isolated || isolated.has(s2.part.id); s2.obj.position.copy(base); continue; }
    if (si > cur) { s2.obj.visible = false; continue; }
    s2.obj.visible = tau > 0.04;
    if (s2.part.shape.kind === 'wire') { s2.obj.visible = tau > 0.75; continue; }
    s2.obj.position.copy(centre).add(off.copy(base).sub(c).multiplyScalar(shrink));
    s2.obj.scale.setScalar(Math.max(1e-3, shrink));
    m.emissive.setHex(0xffb74d); m.emissiveIntensity = 0.5 * (1 - uC) + 0.15;
  }
  carry = k < b.steps.length && tau < 0.85 ? machine.localToWorld(centre.clone()) : null;
  if (k !== b.at && k < b.steps.length) {
    b.at = k; const st = b.steps[k]!;
    stepCard.draw(`BUILD · step ${st.n} of ${b.steps.length}`, [{ text: st.title, size: 1.1, color: '#ffffff' }, { text: st.says, size: 0.9, color: '#ffe082' }, ...b.steps.slice(Math.max(0, k - 5), k).map((x) => ({ text: `✓ ${x.n}. ${x.title}`, size: 0.75, color: '#69f0ae' }))], '#ffb74d');
    hud.set('building', `step ${st.n} of ${b.steps.length}`);
  }
  if (k >= b.steps.length + 1) { endBuild(); line('system', `Built: ${b.steps.length} steps, ${run.m.parts.length} parts.`); }
}
/** Every part back where its law put it, the build over. */
function endBuild(): void {
  machineBuild = null; carry = null; hud.set('idle');
  for (const s2 of shown.values()) { s2.obj.position.copy(s2.part.shape.kind === 'wire' ? ZERO : s2.obj.userData.at as THREE.Vector3); s2.obj.scale.setScalar(1); s2.obj.visible = !isolated || isolated.has(s2.part.id); }
}

// ---- operating it: the duty its wants ask, run through time; what failed and what asked it; learned, built again ---------
let operated: { operation: Operation | null; tries: { events: OpEvent[]; why: string[] }[] } | null = null;
const simCanvas = document.createElement('canvas'); simCanvas.width = 1600; simCanvas.height = 1100;
const simTex = new THREE.CanvasTexture(simCanvas); simTex.colorSpace = THREE.SRGBColorSpace;
const simBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62), new THREE.MeshBasicMaterial({ map: simTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
simBoard.renderOrder = 15; simBoard.visible = false; scene.add(simBoard);
function operateIt(): string {
  if (empty) return 'Nothing stands here yet: ask me to build something, then I can operate it.';
  if (isPrinter) return 'The printer\'s duty is its deposition: it is checked in its rounds. Ask me to make something that moves or keeps a room, and I\'ll operate it.';
  hud.set('working', 'operating it');
  const r = practice(asked, generate(asked));
  learnedNow = r.learned;
  operated = { operation: r.operation, tries: r.history.map((h) => ({ events: h.events, why: h.learned.why ?? [] })) };
  start(asked);
  if (current < beats.length - 1) offset += total - clock() + 0.01;
  summonTo('operate'); drawFlaws();
  const first = r.history[0]!.events, left = r.operation?.events ?? [];
  if (!r.operation) return 'Nothing here to operate.';
  return first.length === 0 ? `It holds its duty: ${r.operation.duty}.` : `${first.length} failure${first.length > 1 ? 's' : ''} on the first run, the first at ${first[0]!.t.toFixed(0)} s in ${first[0]!.node}: ${first[0]!.says}. ${r.history.length - 1} rebuild${r.history.length > 2 ? 's' : ''} from what I observed${left.length ? `; ${left.length} still fail` : '; now it holds'}.`;
}
function drawSim(): void {
  const g = simCanvas.getContext('2d')!, W = simCanvas.width, H = simCanvas.height, op = operated?.operation;
  g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(3,14,22,0.88)'; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 26); g.fill(); g.strokeStyle = '#69f0ae'; g.lineWidth = 4; g.stroke();
  g.textBaseline = 'top'; g.fillStyle = '#b9f6ca'; g.font = '600 44px system-ui'; g.fillText('OPERATE · observe · trace · learn · rebuild', 40, 30);
  if (!op) { g.fillStyle = '#9fdfee'; g.font = '400 30px system-ui'; g.fillText('Press ▶ Operate to run it through its duty.', 40, 110); simTex.needsUpdate = true; return; }
  g.fillStyle = '#9fdfee'; g.font = '400 26px system-ui'; g.fillText(`duty: ${op.duty}`.slice(0, 110), 40, 88);
  // the tries: each run's failures, and what it learned for the next
  let y = 136;
  operated!.tries.forEach((tr, i) => {
    g.fillStyle = tr.events.length ? '#ff8a80' : '#69f0ae'; g.font = '600 28px system-ui';
    g.fillText(`run ${i + 1}: ${tr.events.length ? `${tr.events.length} failure${tr.events.length > 1 ? 's' : ''}` : 'holds its duty'}`, 40, y); y += 38;
    for (const e of tr.events.slice(0, 3)) { g.fillStyle = '#ffffff'; g.font = '400 23px system-ui'; g.fillText(`✗ ${e.t.toFixed(0)} s · ${e.node}: ${e.says}`.slice(0, 120), 60, y); y += 30; g.fillStyle = '#7fb3c8'; g.font = '400 20px system-ui'; g.fillText(`asked by ${e.demand.slice(0, 3).join(' → ') || '—'} · fed by ${e.supply.slice(0, 3).join(' ← ') || '—'}`.slice(0, 140), 80, y); y += 28; }
    const next = operated!.tries[i + 1]; if (next) for (const w of next.why.slice(-2)) { g.fillStyle = '#ffcc80'; g.font = '400 21px system-ui'; g.fillText(`↻ learned: ${w}`.slice(0, 130), 60, y); y += 28; }
    y += 8;
  });
  // what it observed, over the run: three channels
  const plot = (name: string, values: number[], colour: string, x0: number, w: number, top: number, h: number, unit: string) => {
    if (!values.length) return; const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
    g.strokeStyle = 'rgba(159,223,238,0.25)'; g.lineWidth = 2; g.strokeRect(x0, top, w, h);
    g.strokeStyle = colour; g.lineWidth = 3; g.beginPath(); values.forEach((v, k) => { const px = x0 + (k / Math.max(1, values.length - 1)) * w, py = top + h - ((v - lo) / span) * h; if (k) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke();
    g.fillStyle = colour; g.font = '500 22px system-ui'; g.fillText(`${name}: ${fmt(lo)} to ${fmt(hi)} ${unit}`, x0, top + h + 8);
  };
  const ch = (name: string) => op.channels.filter((c) => c.name === name);
  const first = (name: string) => ch(name)[0]?.values ?? [];
  const winding = ch('winding'), hot = winding.length ? winding[0]!.values.map((_, k) => Math.max(...winding.map((c) => c.values[k] ?? 0))) : [];
  const top = Math.max(y + 10, H - 300), w3 = (W - 120) / 3;
  if (first('speed').length) { plot('speed', first('speed'), '#80deea', 40, w3, top, 200, 'm/s'); plot('hottest winding', hot, '#ff8a65', 60 + w3, w3, top, 200, '°C'); plot('charge', first('charge'), '#69f0ae', 80 + 2 * w3, w3, top, 200, ''); }
  else { plot('inside', first('inside'), '#ffcc80', 40, w3, top, 200, '°C'); plot('outside', first('outside'), '#80deea', 60 + w3, w3, top, 200, '°C'); plot('heating on', first('heating on'), '#ff8a65', 80 + 2 * w3, w3, top, 200, ''); }
  simTex.needsUpdate = true;
}

// ---- the causal space: what causes what in this machine, laid out to walk through, every node its real parts ----------
const causalGroup = new THREE.Group(); scene.add(causalGroup); causalGroup.visible = false;
const KIND_LAYER: CauseKind[] = ['environment', 'store', 'source', 'conductor', 'control', 'sensor', 'actuator', 'transmission', 'effector', 'structure'];
const KIND_HEX: Record<CauseKind, number> = { environment: 0x90a4ae, store: 0x42a5f5, source: 0x7e57c2, conductor: 0xffb74d, control: 0x26a69a, sensor: 0x4dd0e1, actuator: 0xef6c00, transmission: 0x9ccc65, effector: 0x66bb6a, structure: 0x78909c, gate: 0xb388ff };
const CARRY_HEX: Record<string, number> = { power: 0xffb74d, signal: 0x4dd0e1, drive: 0x9ccc65, support: 0x455a64, decision: 0xb388ff };
let causal: Causal | null = null, causalFor: Machine | null = null, causalNode: string | null = null;
const nodeMesh = new Map<string, THREE.Mesh>(), edgeLines: { line: THREE.Line; from: string; to: string; carries: string }[] = [];
const causalCard = card(0.5, 0.42, 1100); scene.add(causalCard.mesh); causalCard.mesh.visible = false;
const verdictChips: { mesh: THREE.Mesh; act: () => void }[] = [];
/** Lay the graph out: a column for each kind in the order power, command and motion flow, the gates above. */
function layCausal(): void {
  if (causalFor === run.m && causal) return;
  for (const c2 of [...causalGroup.children]) causalGroup.remove(c2);
  nodeMesh.clear(); edgeLines.length = 0;
  causal = causalOf(run.m); causalFor = run.m;
  const failing = new Set([...breaks(causal).map((b) => b.node), ...(operated?.operation?.events ?? []).map((e) => e.node)]);
  const cols = KIND_LAYER.map((k) => causal!.nodes.filter((n) => n.kind === k)).filter((l) => l.length);
  const W = 1.7, H = 0.95, at = new Map<string, THREE.Vector3>();
  cols.forEach((list, i) => {
    const x = -W / 2 + (cols.length > 1 ? (i * W) / (cols.length - 1) : W / 2), per = Math.min(list.length, 12);
    list.forEach((n, j) => { const col = Math.floor(j / per), row = j % per; at.set(n.id, new THREE.Vector3(x + col * 0.07, H / 2 - (row + 0.5) * (H / per), -Math.abs(x) * 0.25)); });
  });
  const gates = causal.nodes.filter((n) => n.kind === 'gate');
  gates.forEach((n, j) => at.set(n.id, new THREE.Vector3(-W / 2 + ((j + 0.5) * W) / Math.max(1, gates.length), H / 2 + 0.16, -0.05)));
  for (const n of causal.nodes) {
    const p = at.get(n.id); if (!p) continue;
    const bad = n.status === 'fails' || failing.has(n.id);
    const m = new THREE.Mesh(new THREE.SphereGeometry(n.kind === 'gate' ? 0.012 : 0.018, 16, 12), new THREE.MeshBasicMaterial({ color: bad ? 0xff1744 : KIND_HEX[n.kind] }));
    m.position.copy(p); m.userData.node = n.id; m.userData.bad = bad; causalGroup.add(m); nodeMesh.set(n.id, m);
    if (n.kind !== 'gate' || gates.length < 14) { const tag = label(`${bad ? '✗ ' : ''}${n.name}`.slice(0, 34), 0.014, bad ? '#ffcdd2' : '#d9f3ff', 'rgba(0,0,0,0)'); tag.position.copy(p).add(new THREE.Vector3(0, -0.027, 0)); causalGroup.add(tag); }
  }
  for (const e of causal.edges) {
    const a = at.get(e.from), b = at.get(e.to); if (!a || !b) continue;
    const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 0.06)), b);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)), new THREE.LineBasicMaterial({ color: CARRY_HEX[e.carries] ?? 0x607d8b, transparent: true, opacity: e.carries === 'support' ? 0.18 : 0.55 }));
    causalGroup.add(line); edgeLines.push({ line, from: e.from, to: e.to, carries: e.carries });
  }
  const title = label(`WHAT CAUSES WHAT · ${run.m.name}`.slice(0, 60), 0.03, '#ffffff', 'rgba(0,0,0,0)'); title.position.set(0, H / 2 + 0.28, 0); causalGroup.add(title);
  const legend = label('power ━ orange · signal ━ cyan · drive ━ green · support ━ grey · decision ━ violet · ✗ breaks', 0.013, '#9fdfee', 'rgba(0,0,0,0)'); legend.position.set(0, -H / 2 - 0.06, 0); causalGroup.add(legend);
}
/** Point at a node: its demand and supply lit, its parts lit in the machine, its card and the verdicts beside it. */
function pickCausal(id: string): void {
  if (!causal) return;
  causalNode = id;
  const n = causal.nodes.find((x) => x.id === id)!;
  const supply = new Set(trace(causal, id, 'up', ['power', 'signal', 'decision'])), demand = new Set(trace(causal, id, 'down', ['power', 'drive']));
  for (const e of edgeLines) {
    const lit = (e.to === id || supply.has(e.to)) && (supply.has(e.from) || e.to === id) || (e.from === id || demand.has(e.from)) && (demand.has(e.to) || e.from === id);
    const mat = e.line.material as THREE.LineBasicMaterial; mat.opacity = lit ? 1 : 0.08;
  }
  for (const [nid, m] of nodeMesh) m.scale.setScalar(nid === id ? 1.9 : supply.has(nid) || demand.has(nid) ? 1.35 : 0.8);
  attention = { ids: new Set(n.parts), until: clock() + 30 };
  const ev = (operated?.operation?.events ?? []).filter((e) => e.node === id), br = breaks(causal).filter((b) => b.node === id);
  const name = (x: string) => causal!.nodes.find((y) => y.id === x)?.name ?? x;
  causalCard.draw(`${n.name} · ${n.kind}`, [
    { text: `${n.parts.length} part${n.parts.length === 1 ? '' : 's'}${n.status === 'fails' || ev.length || br.length ? ' · BREAKS' : ' · holds'}`, color: n.status === 'fails' || ev.length || br.length ? '#ff8a80' : '#69f0ae', size: 0.95 },
    ...[...n.why, ...br.map((b) => b.says), ...ev.map((e) => `operating, at ${e.t.toFixed(0)} s: ${e.says}`)].slice(0, 3).map((w) => ({ text: `✗ ${w}`, color: '#ffcdd2', size: 0.78 })),
    { text: `fed and commanded by: ${[...supply].slice(0, 5).map(name).join(' ← ') || 'nothing'}`, color: '#ffe082', size: 0.78 },
    { text: `asks of it, and loses it if it fails: ${[...demand].slice(0, 5).map(name).join(' → ') || 'nothing'}`, color: '#b2ff59', size: 0.78 },
    { text: 'judge it: ✗ flag · ✓ approve · ⨯ reject · ⚗ test it', color: '#9fdfee', size: 0.75 },
  ], n.status === 'fails' || ev.length ? '#ff5252' : '#4dd0e1');
  const p = nodeMesh.get(id)!.getWorldPosition(new THREE.Vector3());
  eyeOf(eye); causalCard.mesh.position.copy(p).add(off.copy(eye).sub(p).setLength(0.12)).add(tmp.set(0.32, 0, 0)); causalCard.mesh.lookAt(eye); causalCard.mesh.visible = true;
  for (const c2 of verdictChips) scene.remove(c2.mesh);
  verdictChips.length = 0;
  ([['✗ flag', 'flag'], ['✓ approve', 'approve'], ['⨯ reject', 'reject'], ['⚗ test it', 'test']] as const).forEach(([text, v], i) => {
    const c2 = card(0.115, 0.032, 420); c2.draw('', [{ text, size: 2.2 }], v === 'approve' ? '#69f0ae' : v === 'test' ? '#80deea' : '#ff8a80');
    c2.mesh.position.copy(causalCard.mesh.position).add(tmp.set(0, -0.24, 0)); c2.mesh.quaternion.copy(causalCard.mesh.quaternion); c2.mesh.translateX((i - 1.5) * 0.122);
    scene.add(c2.mesh); verdictChips.push({ mesh: c2.mesh, act: () => void judge(v) });
  });
  verdictBox.replaceChildren(Object.assign(document.createElement('span'), { textContent: n.name, style: 'color:#e6f7ff;font-weight:600' }));
  for (const [text, v] of [['✗ Flag', 'flag'], ['✓ Approve', 'approve'], ['⨯ Reject', 'reject'], ['⚗ Test it', 'test']] as const) button(text, () => void judge(v), verdictBox);
}
/** A judgment on a node, kept as a structured note on its subsystem: the node, the verdict, what it said, the view. */
async function judge(v: 'flag' | 'approve' | 'reject' | 'test'): Promise<void> {
  if (!causal || !causalNode) return;
  const n = causal.nodes.find((x) => x.id === causalNode)!, s2 = n.parts.map((id) => shown.get(id)).find((x) => !!x);
  if (!s2) { line('system', `${n.name} has no parts to pin a note to.`); return; }
  const text = input.value.trim() || ({ flag: `flagged ${n.name} in the causal graph`, approve: `approved ${n.name}`, reject: `rejected ${n.name}: build it again another way`, test: `test ${n.name}: operate it and watch this` } as const)[v];
  input.value = '';
  say(await addNote(s2, v === 'approve' ? 'good' : v === 'test' ? 'question' : 'flaw', text, { node: n.id, verdict: v }));
  if (v === 'test') say(operateIt());
}
const verdictBox = document.createElement('div');
verdictBox.style.cssText = 'display:none;gap:6px;flex-wrap:wrap;align-items:center;padding:8px;border-radius:10px;background:rgba(3,14,22,0.88);border:1px solid #4dd0e1';

// ---- modes: what is on, each with its own way out, and one way out of the latest (✕ on the strip, Esc, B or Y) ------------
interface Mode { id: string; label: string; exit: () => void }
function modes(): Mode[] {
  const out: Mode[] = [];
  if (panel !== 'none') out.push({ id: 'panel', label: panel === 'chat' ? 'Chat and keyboard' : `${panel[0]!.toUpperCase()}${panel.slice(1)} panel`, exit: () => { panel = 'none'; } });
  if (settingsOpen) out.push({ id: 'settings', label: 'Settings', exit: () => { settingsOpen = false; } });
  if (menuOpen) out.push({ id: 'menu', label: 'Menu', exit: () => { menuOpen = false; } });
  if (holo.showing) out.push({ id: 'holo', label: `Hologram: ${holo.showing.name}`.slice(0, 40), exit: () => holo.clear() });
  if (machineBuild) out.push({ id: 'build', label: `Building ${Math.max(1, machineBuild.at + 1)} of ${machineBuild.steps.length}`, exit: () => endBuild() });
  if (isolated) out.push({ id: 'isolate', label: 'Isolated', exit: () => { isolated = null; } });
  if (section !== 'off') out.push({ id: 'section', label: `Section: ${section}`, exit: () => { section = 'off'; } });
  if (xray) out.push({ id: 'xray', label: 'X-ray', exit: () => { xray = false; } });
  if ([...explodeTo.values()].some((v) => v > 0)) out.push({ id: 'apart', label: 'Taken apart', exit: () => { for (const g of explodeTo.keys()) explodeTo.set(g, 0); } });
  if (selectedId) out.push({ id: 'select', label: `Pointing: ${(shown.get(selectedId)?.part.name ?? selectedId).slice(0, 28)}`, exit: () => { selectedId = null; attention = null; partCardUntil = 0; light([]); } });
  if (!empty && current < beats.length - 1) out.push({ id: 'replay', label: 'Replaying the design process', exit: () => { offset += total - clock() + 0.01; } });
  if (reportFor || reportNext) out.push({ id: 'report', label: reportFor ? `Reporting on ${(shown.get(reportFor)?.part.name ?? reportFor).slice(0, 26)}` : 'Point at what to report', exit: () => { reportFor = null; reportNext = false; } });
  if (paused) out.push({ id: 'paused', label: 'Paused', exit: () => togglePause() });
  return out;
}
/** Out of the latest mode: the panel in front of you first, then what is out in the air, then the ways of seeing. */
function exitLatest(): void { const m = modes()[0]; if (m) { m.exit(); line('system', `Left: ${m.label}.`); } }
function exitAll(): void { const ms = modes(); for (const m of ms) m.exit(); if (ms.length) line('system', 'Back to the room as it stands.'); }
// on a screen, a strip under the clock; in a headset, the same strip under the clock that follows your head
const modeBar = document.createElement('div');
modeBar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
// the top left: the clock and status, then what is on, then the settings; clear of the buttons on the right
const topLeft = document.createElement('div');
topLeft.style.cssText = 'position:fixed;left:16px;top:calc(12px + env(safe-area-inset-top,0px));z-index:6;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:max(18rem,calc(100vw - 640px))';
hud.dom.style.position = 'static'; hud.dom.style.maxWidth = '100%';
topLeft.append(hud.dom, modeBar, verdictBox);
document.body.appendChild(topLeft);
const modeStrip = new THREE.Group(); scene.add(modeStrip);
let modeChips: { mesh: THREE.Mesh; act: () => void }[] = [], modeKey = '';
function drawModes(): void {
  const ms = modes(), key = ms.map((m) => m.label).join('|') + (renderer.xr.isPresenting ? '|xr' : '');
  if (key === modeKey) return;
  modeKey = key;
  modeBar.replaceChildren();
  const chip = (text: string, act: () => void, accent: string) => { const b2 = document.createElement('button'); b2.textContent = text; b2.style.cssText = `font:600 12px system-ui;padding:5px 10px;border-radius:999px;border:1px solid ${accent};background:rgba(3,14,22,0.85);color:#e6f7ff;cursor:pointer`; b2.onclick = act; modeBar.appendChild(b2); };
  for (const m of ms) chip(`${m.label}  ✕`, () => { m.exit(); }, '#ffd740');
  if (ms.length > 1) chip('Exit all', exitAll, '#ff8a80');
  for (const c2 of modeChips) { modeStrip.remove(c2.mesh); (c2.mesh.material as THREE.MeshBasicMaterial).map?.dispose(); }
  modeChips = [];
  const all: [string, () => void, string][] = [...ms.map((m): [string, () => void, string] => [`${m.label} ✕`, () => m.exit(), '#ffd740']), ...(ms.length > 1 ? [['Exit all', exitAll, '#ff8a80'] as [string, () => void, string]] : [])];
  all.forEach(([text, act, accent], i) => { const c2 = card(0.13, 0.03, 512); c2.draw('', [{ text, size: 2.2 }], accent); c2.mesh.position.set(((i % 3) - 1) * 0.135, -Math.floor(i / 3) * 0.034, 0); modeStrip.add(c2.mesh); modeChips.push({ mesh: c2.mesh, act }); });
}
// settings: the small things that make the room yours
let settingsOpen = false, turnStep = Math.PI / 6, smoothTurn = false, hudOn = true;
const settingsGroup = new THREE.Group(); scene.add(settingsGroup); settingsGroup.visible = false;
let settingChips: { mesh: THREE.Mesh; act: () => void }[] = [];
const SETTINGS: [() => string, () => void][] = [
  [() => `Voice: ${voice ? 'on' : 'off'}`, () => { voice = !voice; if (!voice) speechSynthesis.cancel(); }],
  [() => `Clock and status: ${hudOn ? 'shown' : 'hidden'}`, () => { hudOn = !hudOn; }],
  [() => `Turning: ${smoothTurn ? 'smooth' : `${Math.round((turnStep * 180) / Math.PI)}° steps`}`, () => { if (smoothTurn) { smoothTurn = false; turnStep = Math.PI / 6; } else if (turnStep < Math.PI / 4 - 1e-6) turnStep = Math.PI / 4; else smoothTurn = true; }],
  [() => `Reports: ${reportsMode}`, () => cycleReports()],
  [() => `Weather: ${hud.weather ? 'on' : 'find'}`, () => { void hud.locate().then((w) => line('system', w)); }],
  [() => 'Recentre me', () => { dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0); }],
];
function drawSettings(): void {
  for (const c2 of settingChips) settingsGroup.remove(c2.mesh);
  settingChips = SETTINGS.map(([label, act], i) => { const c2 = card(0.2, 0.034, 640); c2.draw('', [{ text: label(), size: 2.2 }], '#b388ff'); c2.mesh.position.set((i % 2 ? 1 : -1) * 0.104, -Math.floor(i / 2) * 0.039, 0); settingsGroup.add(c2.mesh); return { mesh: c2.mesh, act: () => { act(); drawSettings(); } }; });
  settingsBox.replaceChildren(); for (const [label, act] of SETTINGS) button(label(), () => { act(); drawSettings(); }, settingsBox);
}
const settingsBox = document.createElement('div');
settingsBox.style.cssText = 'display:none;flex-wrap:wrap;gap:6px;max-width:30rem;padding:8px;border-radius:10px;background:rgba(3,14,22,0.88);border:1px solid #b388ff';
topLeft.appendChild(settingsBox);
function toggleSettings(): void { settingsOpen = !settingsOpen; if (settingsOpen) drawSettings(); }

// ---- the supervisor's list: every flaw and gap left, and every report you made, each one a jump to where it is ------------
interface FlawRow { kind: 'flaw' | 'gap' | 'report'; text: string; flaw?: Flaw; note?: Note }
function flawRows(): FlawRow[] {
  if (!run) return [];
  const last = run.m.rounds.at(-1)!;
  return [
    ...last.flaws.filter((f) => f.check !== 'gap').map((f): FlawRow => ({ kind: 'flaw', text: `${f.check} · ${f.where}: ${f.says}`, flaw: f })),
    ...(operated?.operation?.events ?? []).map((e): FlawRow => ({ kind: 'flaw', text: `operating · ${e.node} at ${e.t.toFixed(0)} s: ${e.says}`, flaw: { check: e.check, where: e.node, says: e.says, law: e.law, value: 0, limit: 0, remedy: null, parts: run.m.parts.filter((p) => p.id.startsWith(`${e.node.split('/')[0]}/`) || p.id === e.node).map((p) => p.id) } })),
    ...allNotes.filter((n) => n.status !== 'done' && (!n.machine || n.machine === run.m.name)).map((n): FlawRow => ({ kind: 'report', text: `your ${n.kind} · ${n.partName}: ${n.text}${n.reply ? ` (answered)` : ''}`, note: n })),
    ...last.flaws.filter((f) => f.check === 'gap').map((f): FlawRow => ({ kind: 'gap', text: `gap · ${f.where}: ${f.says.replace(/^nothing designs \w+ "[^"]*" yet: ?/, '')}`, flaw: f })),
  ];
}
const flawCanvas = document.createElement('canvas'); flawCanvas.width = 1500; flawCanvas.height = 1100;
const flawTex = new THREE.CanvasTexture(flawCanvas); flawTex.colorSpace = THREE.SRGBColorSpace;
const flawBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.6), new THREE.MeshBasicMaterial({ map: flawTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
flawBoard.renderOrder = 15; flawBoard.visible = false; scene.add(flawBoard);
const FLAW_TOP = 150, FLAW_ROW = 78, FLAW_MAX = 12;
const ROW_COLOUR: Record<FlawRow['kind'], string> = { flaw: '#ff5252', gap: '#90a4ae', report: '#ffd740' };
function drawFlaws(): void {
  const g = flawCanvas.getContext('2d')!, W = flawCanvas.width, H = flawCanvas.height, rows = flawRows();
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(3,14,22,0.86)'; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 26); g.fill();
  g.strokeStyle = '#ff8a80'; g.lineWidth = 4; g.stroke();
  g.textBaseline = 'top'; g.fillStyle = '#ffcdd2'; g.font = '600 46px system-ui'; g.fillText(`FLAWS · ${run ? run.m.name : ''}`.slice(0, 48), 40, 34);
  const nf = rows.filter((r) => r.kind === 'flaw').length, ng = rows.filter((r) => r.kind === 'gap').length, nr = rows.filter((r) => r.kind === 'report').length;
  g.fillStyle = '#9fdfee'; g.font = '400 28px system-ui'; g.fillText(`${nf} flaw${nf === 1 ? '' : 's'} · ${nr} of your reports open · ${ng} gap${ng === 1 ? '' : 's'} · point at one to go to it`, 40, 92);
  if (!rows.length) { flawList.textContent = '✓ nothing left: every check holds, every element is designed'; g.fillStyle = '#69f0ae'; g.font = '500 34px system-ui'; g.fillText('✓ nothing left: every check holds, every element is designed', 40, FLAW_TOP + 20); }
  rows.slice(0, FLAW_MAX).forEach((r, i) => {
    const y = FLAW_TOP + i * FLAW_ROW;
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'; g.fillRect(30, y, W - 60, FLAW_ROW - 8);
    g.fillStyle = ROW_COLOUR[r.kind]; g.fillRect(30, y, 10, FLAW_ROW - 8);
    g.fillStyle = '#ffffff'; g.font = '500 28px system-ui';
    let t2 = r.text; while (g.measureText(t2).width > W - 130 && t2.length > 4) t2 = `${t2.slice(0, -2)}`;
    g.fillText(t2 === r.text ? t2 : `${t2}…`, 58, y + 18);
  });
  if (rows.length > FLAW_MAX) { g.fillStyle = '#7fb3c8'; g.font = '400 26px system-ui'; g.fillText(`and ${rows.length - FLAW_MAX} more`, 58, FLAW_TOP + FLAW_MAX * FLAW_ROW + 6); }
  flawTex.needsUpdate = true;
  if (rows.length) flawList.replaceChildren();
  rows.slice(0, 30).forEach((r) => { const b2 = button(r.text.length > 90 ? `${r.text.slice(0, 88)}…` : r.text, () => jumpTo(r), flawList); b2.style.textAlign = 'left'; b2.style.borderColor = ROW_COLOUR[r.kind]; b2.style.fontWeight = '500'; });
}
const flawRowAt = (uv: THREE.Vector2) => { const y = (1 - uv.y) * flawCanvas.height, i = Math.floor((y - FLAW_TOP) / FLAW_ROW); return y >= FLAW_TOP && i < Math.min(FLAW_MAX, flawRows().length) ? i : -1; };
/** Go to a flaw: to the end of the run if it is still playing, the parts it lies in lit and pointed at, the view brought to them. */
function jumpTo(r: FlawRow): void {
  if (current < beats.length - 1) offset += total - clock() + 0.01;
  framing = true;
  if (r.note) { const s2 = shown.get(r.note.partId); if (s2) select(s2); return; }
  const ids = r.flaw ? partsOfFlaw(r.flaw) : [];
  if (r.flaw) light([r.flaw]);
  if (ids.length) { attention = { ids: new Set(ids), until: clock() + 20 }; const s2 = shown.get(ids[0]!); if (s2) { selectedId = s2.part.id; partCard.draw(r.kind.toUpperCase(), [{ text: r.text, size: 0.9, color: '#ffcdd2' }, ...(r.flaw ? [{ text: `law: ${r.flaw.law}`, size: 0.8, color: '#ffe082' }] : [])], '#ff5252'); s2.obj.getWorldPosition(world); eyeOf(eye); partCard.mesh.position.copy(world).add(off.copy(eye).sub(world).setLength(0.18)).add(tmp.set(0, 0.12, 0)); partCardUntil = clock() + 14; } }
  else line('system', r.kind === 'gap' ? `A gap, not a flaw in a part: ${r.flaw?.says ?? r.text}` : r.text);
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
  const waiting = proposals.filter((p) => p.status === 'proposed').length;
  if (loopBtn) { loopBtn.textContent = waiting ? `My loop · ${waiting} to decide` : 'My loop'; loopBtn.style.borderColor = waiting ? '#ffb74d' : '#2e7d8c'; }
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
button('Voice off', (b) => { voice = !voice; b.textContent = voice ? 'Voice on' : 'Voice off'; if (!voice) speechSynthesis.cancel(); });
document.body.appendChild(ui);
const tools = document.createElement('div');
tools.style.cssText = 'position:fixed;right:16px;top:calc(60px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:flex-end;gap:6px;z-index:5;max-width:min(36rem,calc(100vw - 32px))';
const rowOf = (title: string) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;align-items:center'; const t2 = document.createElement('span'); t2.textContent = title; t2.style.cssText = 'font:600 11px system-ui;color:#7fb3c8;letter-spacing:.08em;text-transform:uppercase'; r.appendChild(t2); tools.appendChild(r); return r; };
const showRow = rowOf('Show'), actRow = rowOf('Do'), seeRow = rowOf('Sight');
let loopBtn: HTMLButtonElement | null = null;
for (const [name, p2] of [['Causes', 'causes'], ['Flaws', 'flaws'], ['Chat', 'chat'], ['Gates', 'gates'], ['Pipeline', 'pipeline'], ['Rounds', 'rounds'], ['Laws', 'laws'], ['Bill', 'bill'], ['My loop', 'loop']] as const) { const b2 = button(name, () => { const said = summon(p2); if (p2 === 'flaws' || p2 === 'chat') line('system', said); else say(said); }, showRow); if (p2 === 'loop') loopBtn = b2; }
button('✗ Report', () => report(), actRow);
button('▶ Operate', () => say(operateIt()), actRow);
button('⤢ Expand', () => say(expand('', true)), actRow);
button('▶ Build this', () => say(buildIt('')), actRow);
button('▶ Build it all', () => say(buildIt('the machine')), actRow);
button('⟲ Up', () => say(up()), actRow);
button('✕ Close', () => { holo.clear(); isolated = null; }, actRow);
button('X-ray', (b2) => { xray = !xray; b2.style.borderColor = xray ? '#ffd740' : '#2e7d8c'; }, seeRow);
button('Isolate', (b2) => { toggleIsolate(); b2.style.borderColor = isolated ? '#ffd740' : '#2e7d8c'; }, seeRow);
button('Reports: dots', (b2) => { cycleReports(); b2.textContent = `Reports: ${reportsMode}`; }, seeRow);
button('Section', (b2) => { section = section === 'off' ? 'depth' : section === 'depth' ? 'width' : 'off'; b2.textContent = section === 'off' ? 'Section' : `Section: ${section}`; b2.style.borderColor = section === 'off' ? '#2e7d8c' : '#ffd740'; }, seeRow);
button('Weather', () => { void hud.locate().then((w) => line('system', w)); }, seeRow);
button('Settings', () => toggleSettings(), seeRow);
button('Recentre', () => { framing = false; panel = 'none'; orbit.target.set(view[3], view[4], view[5]); camera.position.set(view[0], view[1], view[2]); }, seeRow);
document.body.appendChild(tools);
// the supervisor's list on a screen: every flaw, gap and report, each a jump to it
const flawList = document.createElement('div');
flawList.style.cssText = 'position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(30rem,calc(100vw - 32px));max-height:42vh;overflow:auto;z-index:5;display:none;flex-direction:column;gap:5px;padding:8px;border-radius:10px;background:rgba(3,14,22,0.85);border:1px solid #ff8a80';
document.body.appendChild(flawList);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ((e.target as HTMLElement).tagName === 'INPUT') (e.target as HTMLElement).blur(); else if (e.shiftKey) exitAll(); else exitLatest(); return; } if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === ' ') togglePause(); if (e.key === 'ArrowRight') step(); if (e.key === 'r') say(world2.replay()); });

// ---- talking with Claude ------------------------------------------------------------------------------------------------
let brain: Brain | null = null, busy: AbortController | null = null, lastSayAt = -1e9;
voice = false;
const voiceCard = card(0.55, 0.16, 1200); scene.add(voiceCard.mesh);
voiceCard.draw('', [{ text: 'Hi. Ask me anything about this machine, or point at a part.', size: 1.1 }]);
const chat = document.createElement('div');
chat.style.cssText = 'position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(30rem,calc(100vw - 32px));z-index:5;display:flex;flex-direction:column;gap:6px;font:14px/1.4 system-ui';
const log = document.createElement('div');
log.style.cssText = 'max-height:30vh;overflow:auto;display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:10px;background:rgba(3,14,22,0.78);border:1px solid #1f5866;color:#d9f3ff';
const row = document.createElement('form');
row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
const input = document.createElement('input');
input.placeholder = 'Ask, or say what to build: "a cabin of 40 m² for 2 people", "show the flaws", "why is this 9 mm?"';
input.style.cssText = 'flex:1 1 14rem;min-width:0;font:14px system-ui;padding:9px 10px;border-radius:8px;border:1px solid #2e7d8c;background:#020a10;color:#e6f7ff';
const kindSel = document.createElement('select');
for (const k of ['flaw', 'question', 'idea', 'good']) { const o = document.createElement('option'); o.value = k; o.textContent = k; kindSel.appendChild(o); }
kindSel.style.cssText = BTN;
row.append(input);
const sendBtn = button('Send', () => undefined, row); sendBtn.type = 'submit';
const noteBtn = button('📌 Note', () => { void markNote(kindSel.value as NoteKind, input.value.trim()); }, row); noteBtn.type = 'button'; row.insertBefore(kindSel, noteBtn);
const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
interface SpeechRec { lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; start(): void }
function listen(): void {
  if (!SR) { line('system', 'This browser does not hear; type instead.'); return; }
  try { const r = new SR(); r.lang = 'en-US'; r.interimResults = false; hud.set('listening'); r.onresult = (e) => { hud.set('idle'); const said = e.results[0][0].transcript; void converse(said); }; r.onerror = () => { hud.set('idle'); line('system', 'The microphone is not available here; type instead.'); }; r.start(); } catch { hud.set('idle'); line('system', 'The microphone is not available here; type instead.'); }
}
if (SR) { const mic = button('🎤', () => listen(), row); mic.type = 'button'; }
// the same talk as a hologram, with a keyboard of light, for a headset
const chatCard = card(0.56, 0.34, 1200); scene.add(chatCard.mesh); chatCard.mesh.visible = false;
const keyboard = new Keyboard(!!SR); scene.add(keyboard.mesh);
const transcript: { who: 'you' | 'claude' | 'system'; text: string }[] = [];
function drawChat(): void {
  if (panel !== 'chat') return;
  chatCard.draw('CLAUDE · talk', transcript.slice(-9).map((l) => ({ text: `${l.who === 'you' ? 'You' : l.who === 'claude' ? 'Claude' : '·'}: ${l.text.length > 150 ? `${l.text.slice(0, 148)}…` : l.text}`, color: l.who === 'you' ? '#ffe082' : l.who === 'claude' ? '#d9f3ff' : '#7fb3c8', size: 0.82 })), '#4dd0e1');
}
/** A key pressed on the keyboard of light. */
function pressKey(key: string): void {
  const r = keyboard.press(key);
  if (r === 'mic') listen();
  if (r === 'send') { const t2 = keyboard.text.trim(); keyboard.text = ''; keyboard.draw(); if (t2) send(t2); }
}
/** What a ray presses on the boards in the room: a key, a flaw to go to. */
function pressBoards(): boolean {
  if (causalGroup.visible) {
    const vh = ray.intersectObjects(verdictChips.filter((c2) => c2.mesh.visible).map((c2) => c2.mesh), false)[0];
    if (vh) { verdictChips.find((c2) => c2.mesh === vh.object)?.act(); return true; }
    const h = ray.intersectObjects([...nodeMesh.values()], false)[0];
    if (h) { pickCausal(h.object.userData.node as string); return true; }
  }
  if (keyboard.mesh.visible) { const h = ray.intersectObject(keyboard.mesh, false)[0]; if (h?.uv) { const k2 = keyboard.keyAt(h.uv); if (k2) pressKey(k2); return true; } }
  if (flawBoard.visible) { const h = ray.intersectObject(flawBoard, false)[0]; if (h?.uv) { const i = flawRowAt(h.uv); if (i >= 0) jumpTo(flawRows()[i]!); return true; } }
  return false;
}
row.onsubmit = (e) => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ''; send(t); } };
const status = document.createElement('div'); status.style.cssText = 'font-size:12px;color:#7fb3c8';
chat.append(log, row, status);
document.body.appendChild(chat);
function line(who: 'you' | 'claude' | 'system', text: string): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = `color:${who === 'you' ? '#ffe082' : who === 'claude' ? '#d9f3ff' : '#7fb3c8'}`;
  d.textContent = `${who === 'you' ? 'You' : who === 'claude' ? 'Claude' : '·'}: ${text}`;
  log.appendChild(d); while (log.children.length > 24) log.firstChild!.remove(); log.scrollTop = log.scrollHeight;
  transcript.push({ who, text }); while (transcript.length > 40) transcript.shift(); drawChat();
  return d;
}
function say(text: string, el?: HTMLDivElement): void {
  if (!text) return;
  if (el) { el.textContent = `Claude: ${text}`; const last = [...transcript].reverse().find((l) => l.who === 'claude'); if (last) last.text = text; drawChat(); } else line('claude', text);
  voiceCard.draw('', [{ text, size: 1.0 }], '#4dd0e1'); lastSayAt = performance.now();
  if (voice && 'speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[✗✓✎↻·]/g, '')); u.rate = 1.07; speechSynthesis.speak(u); }
}
async function converse(text: string): Promise<void> {
  if (!brain) return;
  busy?.abort(); busy = new AbortController();
  line('you', text);
  const el = line('claude', 'Thinking…');
  voiceCard.draw('', [{ text: 'Thinking…', size: 1.1, color: '#7fb3c8' }]);
  speaking = true; hud.set('thinking');
  try {
    const answer = await brain.ask(text, (t) => { el.textContent = `Claude: ${t}`; voiceCard.draw('', [{ text: t.slice(-260), size: 1.0 }]); }, busy.signal);
    say(answer, el);
  } finally { speaking = false; busy = null; hud.set('idle'); status.textContent = statusLine(); }
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
  if (reportNext) { reportNext = false; openReport(s); }
  partCard.draw(s.part.name, [{ text: `${s.part.material}${s.part.mass > 0 ? ` · ${fmt(s.part.mass * 1e3)} g` : ''}`, color: '#a5f3ff', size: 0.95 }, ...s.part.values.slice(0, 5).map((v) => ({ text: `${v.name} = ${fmt(v.value)} ${v.unit} · ${v.law}`, color: '#ffe082', size: 0.78 })), { text: '⤢ Expand to open it · 📌 to mark it', color: '#7fb3c8', size: 0.75 }], '#ffd740');
  s.obj.getWorldPosition(world); eyeOf(eye);
  partCard.mesh.position.copy(world).add(off.copy(eye).sub(world).setLength(0.18)).add(tmp.set(0, 0.12, 0)); partCard.mesh.lookAt(eye);
  partCardUntil = clock() + 14;
  status.textContent = `Pointing at ${s.part.name}. ✗ Report it, or ask about it.`;
  input.placeholder = `Report on ${s.part.name}, or ask about it`;
}
// ---- reporting: point at it, press Report, say what is wrong; kept on the part with your view, for the next round ----------
let reportFor: string | null = null, reportNext = false;
function report(): void {
  const s2 = selectedId ? shown.get(selectedId) : undefined;
  if (s2) openReport(s2); else { reportNext = true; line('system', 'Point at what is wrong and pull the trigger (or click it).'); }
}
function openReport(s2: Shown): void {
  reportFor = s2.part.id;
  if (renderer.xr.isPresenting) { summonTo('chat'); keyboard.text = ''; keyboard.draw(); }
  else { input.focus(); input.placeholder = `What is wrong with ${s2.part.name}? Enter keeps it.`; }
  line('system', `Reporting on ${s2.part.name}: type or say what is wrong, then send.`);
}
/** What you typed goes to the report you opened, else to me. */
function send(text: string): void {
  if (reportFor) { const s2 = shown.get(reportFor); reportFor = null; if (s2) { void addNote(s2, 'flaw', text).then((r) => say(r)); return; } }
  void converse(text);
}
let down: [number, number, number] | null = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; });
// a click is a press that barely moved: a laser pointer's hand shakes, so it is allowed a little
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 14 || performance.now() - down[2] > 900) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1), camera);
  if (pressBoards()) return;
  if (pickHolo()) return;
  const s = partAt(); if (s) select(s);
});

// ---- chips of light: the dock that is always with you in a headset, the menu, and what you might ask for ----------------
type Chip = { mesh: THREE.Mesh; act: () => void };
function chipGrid(list: [string, () => void][], cols: number, w: number, h: number, accent: (i: number) => string, size = 2.4): { group: THREE.Group; chips: Chip[] } {
  const group = new THREE.Group(), chips2: Chip[] = [];
  list.forEach(([text, act], i) => { const c2 = card(w, h, 512); c2.draw('', [{ text, size }], accent(i)); c2.mesh.position.set(((i % cols) - (cols - 1) / 2) * (w + 0.006), -Math.floor(i / cols) * (h + 0.006), 0); group.add(c2.mesh); chips2.push({ mesh: c2.mesh, act }); });
  scene.add(group); group.visible = false;
  return { group, chips: chips2 };
}
const SUGGESTIONS = ['a cart that carries 150 kg at 8 km/h', 'a cabin of 40 m² for 2 people where winter gets to -25 °C', 'a drone that carries a 2 kg parcel 5 km at 15 m/s', 'a boat that carries 400 kg 20 km at 3 m/s', 'an electric car for 4 people that goes 400 km at 120 km/h', 'a 3D printer for parts up to 250 mm'];
const make = (w: string) => { panel = 'none'; line('you', w); say(world2.make(w)); };
const suggest = chipGrid([...SUGGESTIONS.map((w): [string, () => void] => [`build ${w}`, () => make(w)]), ['… type your own', () => { summonTo('chat'); keyboard.text = 'build me a '; keyboard.draw(); }]], 1, 0.46, 0.042, (i) => (i === SUGGESTIONS.length ? '#b388ff' : '#4dd0e1'), 1.9);
const suggestBox = document.createElement('div');
suggestBox.style.cssText = 'display:none;flex-wrap:wrap;gap:6px';
for (const w of SUGGESTIONS) { const b2 = document.createElement('button'); b2.textContent = `Build ${w}`; b2.style.cssText = 'font:600 12px system-ui;padding:6px 10px;border-radius:999px;border:1px solid #4dd0e1;background:rgba(3,14,22,0.85);color:#e6f7ff;cursor:pointer'; b2.onclick = () => make(w); suggestBox.appendChild(b2); }
chat.prepend(suggestBox);
let menuOpen = false;
const dock = chipGrid([['✗ Report', () => report()], ['Ask', () => summon('chat')], ['＋ New', () => summon('new')], ['▶ Operate', () => say(operateIt())], ['Causes', () => line('system', summon('causes'))], ['Flaws', () => line('system', summon('flaws'))], ['✕ Exit', () => exitLatest()], ['☰ Menu', () => { menuOpen = !menuOpen; }]], 8, 0.1, 0.042, (i) => (i === 0 ? '#ff8a80' : i === 6 ? '#ffd740' : '#80deea'), 2.6);

// what you point at, lit before you press, its name beside it
let hoverId: string | null = null, hoverTagFor: string | null = null;
const hoverTag = label(' ', 0.016, '#ffffff', 'rgba(4,16,24,0.85)'); hoverTag.visible = false; scene.add(hoverTag);
function hover(at: THREE.Vector3 | null, s2: Shown | null): void {
  hoverId = s2?.part.id ?? null;
  if (!s2 || !at) { hoverTag.visible = false; return; }
  if (hoverTagFor !== s2.part.id) { hoverTagFor = s2.part.id; const t2 = label(s2.part.name.slice(0, 48), 0.016, '#ffffff', 'rgba(4,16,24,0.85)'); hoverTag.material.map?.dispose(); hoverTag.material.map = t2.material.map; hoverTag.scale.copy(t2.scale); hoverTag.material.needsUpdate = true; }
  hoverTag.position.copy(at).add(tmp.set(0, 0.05, 0)); hoverTag.visible = true;
}
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.buttons) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1), camera);
  const hit = ray.intersectObjects(machine.children, true)[0];
  hover(hit ? hit.point : null, hit ? partAt() : null);
});

// ---- the console, for a headset: buttons the controller's ray presses ------------------------------------------------------
const dolly = new THREE.Group(); scene.add(dolly); dolly.add(camera);
// the wrist menu, on your left hand: turn your wrist to see it, point at it with your right and pull the trigger
const CHIPS: [string, () => void][] = [
  ['✕ Exit', () => exitLatest()], ['Exit all', () => exitAll()], ['Settings', () => toggleSettings()],
  ['Flaws', () => line('system', summon('flaws'))], ['Chat', () => line('system', summon('chat'))], ['New build', () => { summonTo('chat'); keyboard.text = 'build me a '; keyboard.draw(); }],
  ['Pipeline', () => say(summon('pipeline'))], ['Gates', () => line('system', summon('gates'))], ['Bill', () => say(summon('bill'))],
  ['My loop', () => say(summon('loop'))], ['Rounds', () => say(summon('rounds'))], ['Laws', () => say(summon('laws'))], ['Hide all', () => { panel = 'none'; holo.clear(); isolated = null; }],
  ['▶ Operate', () => say(operateIt())], ['Operate panel', () => line('system', summon('operate'))], ['Causes', () => line('system', summon('causes'))],
  ['⤢ Expand', () => say(expand('', true))], ['▶ Build this', () => say(buildIt(''))], ['▶ Build all', () => say(buildIt('the machine'))],
  ['⟲ Up', () => say(up())], ['✕ Close', () => { holo.clear(); isolated = null; }], ['What is this?', () => { const s2 = selectedId ? shown.get(selectedId) : null; void converse(s2 ? `What is ${s2.part.name}, and why is it this way?` : 'What am I looking at?'); }],
  ['✗ Flaw', () => void markNote('flaw', '')], ['? Question', () => void markNote('question', '')], ['✓ Good', () => void markNote('good', '')],
  ['X-ray', () => { xray = !xray; }], ['Isolate', () => toggleIsolate()], ['Section', () => { section = section === 'off' ? 'depth' : section === 'depth' ? 'width' : 'off'; }],
  ['Reports', () => cycleReports()], ['Weather', () => { void hud.locate().then((w) => line('system', w)); }], ['🎤 Talk', () => listen()],
];
const chips: { mesh: THREE.Mesh; act: () => void }[] = [];
let wrist: THREE.Group | null = null, pointerHand = 1;
// the same menu as the wrist's, floating over the dock for whoever does not turn their wrist
const menu = chipGrid(CHIPS.map(([t2, act]): [string, () => void] => [t2, () => { act(); }]), 3, 0.11, 0.032, (i) => (i < 3 ? '#ffd740' : '#80deea'), 2.4);
function makeWrist(): THREE.Group {
  const g = new THREE.Group();
  const cw = 0.074, chh = 0.027, gap = 0.006;
  CHIPS.forEach(([text, act], i) => {
    const c = card(cw, chh, 384); c.draw('', [{ text, size: 2.6 }], i < 6 ? '#ffd740' : '#80deea');
    c.mesh.position.set(((i % 3) - 1) * (cw + gap), -Math.floor(i / 3) * (chh + gap), 0); g.add(c.mesh);
    chips.push({ mesh: c.mesh, act });
  });
  const t2 = label('CLAUDE · menu', 0.012, '#9fdfee', 'rgba(0,0,0,0)'); t2.position.set(0, chh, 0); g.add(t2);
  // above the back of the hand, tilted toward you
  g.position.set(0, 0.07, 0.03); g.rotation.x = -Math.PI / 3; g.scale.setScalar(1);
  return g;
}
const factory = new XRControllerModelFactory();
const lasers: THREE.Line[] = [];
for (let i = 0; i < 2; i++) {
  const ctl = renderer.xr.getController(i); dolly.add(ctl);
  const grip = renderer.xr.getControllerGrip(i); grip.add(factory.createControllerModel(grip)); dolly.add(grip);
  // the menu goes on the left hand, the pointer is the right
  ctl.addEventListener('connected', (e) => { const hand = (e as unknown as { data?: { handedness?: string } }).data?.handedness; if ((hand === 'left' || (!hand && i === 0)) && !wrist) { wrist = makeWrist(); grip.add(wrist); } });
  const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x80deea, transparent: true, opacity: 0.6 }));
  laser.scale.z = 3; ctl.add(laser); lasers.push(laser);
  ctl.addEventListener('selectstart', () => {
    ray.setFromXRController(ctl);
    pointerHand = i;
    const all = [...(wrist?.visible ? chips : []), ...(decideChips.visible ? decideMeshes : []), ...(modeStrip.visible ? modeChips : []), ...(settingsGroup.visible ? settingChips : []), ...(dock.group.visible ? dock.chips : []), ...(menu.group.visible ? menu.chips : []), ...(suggest.group.visible ? suggest.chips : [])], hit = ray.intersectObjects(all.map((c) => c.mesh), false)[0];
    if (hit) { all.find((c) => c.mesh === hit.object)?.act(); return; }
    if (pressBoards()) return;
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
    if (src.handedness === 'right') {
      if (smoothTurn) { if (Math.abs(sx) > 0.15) dolly.rotateY(-sx * 1.6 * dt); }
      else { if (Math.abs(sx) > 0.7 && !turned) { dolly.rotateY(-Math.sign(sx) * turnStep); turned = true; } if (Math.abs(sx) < 0.3) turned = false; }
    }
    // B on the right hand, Y on the left: out of the latest mode
    const bButton = src.gamepad?.buttons[5]?.pressed ?? false, key2 = src.handedness;
    if (bButton && !backHeld.has(key2)) { backHeld.add(key2); exitLatest(); } else if (!bButton) backHeld.delete(key2);
  }
}
const backHeld = new Set<string>();

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
  // ?ask=words builds what the words ask for; else what you asked last time; else nothing, until you ask
  const lastAsk = (() => { try { return localStorage.getItem('forge:last-ask'); } catch { return null; } })();
  if (params.get('ask')) line('system', world2.make(params.get('ask')!));
  else if (lastAsk) line('system', world2.make(lastAsk));
  else showEmpty();
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
  void hud.watchBattery();
  (window as unknown as { ready: boolean }).ready = true;
  // where a node of the causal space stands on the screen, for a test that points at it: a motor's, else the first
  (window as unknown as { causalPoint: () => [number, number] | null }).causalPoint = () => {
    const m = [...nodeMesh.entries()].find(([id]) => /motor/.test(id))?.[1] ?? [...nodeMesh.values()][0]; if (!m) return null;
    const p = m.getWorldPosition(new THREE.Vector3()).project(camera); return [((p.x + 1) / 2) * window.innerWidth, ((1 - p.y) / 2) * window.innerHeight];
  };
}
void boot();
// installed as an app where the page is served as one; an artifact's frame refuses it, and the room works without it
if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claude.ai') && !location.hostname.endsWith('claudeusercontent.com')) navigator.serviceWorker.register('./sw.js').catch(() => undefined);

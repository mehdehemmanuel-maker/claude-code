// The interpretation wall: draw what you mean and say what it is. Each stroke is read as the shape you drew (a line,
// a circle, a rectangle, a triangle: sketch/strokes.ts) and, with what you say, as a part (sketch/interpret.ts), shown
// on the wall as a ghost at its real size. "No, it's a wheel" reads it again; "build it" makes the parts for real,
// standing out from the wall as drawn.

import * as THREE from 'three';
import type { App } from '../app/app';
import { getMaterial } from '../data/materials';
import { insertFragment, makePart } from '../doc/commands';
import { axisAngle, qmul } from '../doc/math';
import type { Pose, Quat, Vec3 } from '../doc/types';
import { effectiveParams, getPartKind } from '../parts/registry';
import { buildVisual } from '../render/geometry';
import { ghostMaterial } from '../render/materials';
import { correct, interpret, type Interpretation } from '../sketch/interpret';
import { readStroke, type P2, type Reading } from '../sketch/strokes';
import type { PointerEvt, Tool, ToolAction } from './tools';

/** The wall: 2.4 m by 1.4 m, its bottom edge 0.3 m off the floor. */
const WALL_W = 2.4, WALL_H = 1.4, WALL_BASE = 0.3;
/** Parts built from the drawing stand this far out from it. */
const OUT = 0.4;

interface Mark { points: P2[]; reading: Reading; words: string; part: Interpretation; ghost: THREE.Object3D; line: THREE.Line }

export class DrawTool implements Tool {
  id = 'draw';
  label = 'Draw';
  icon = '✏️';
  hint = 'Draw on the wall with the trigger and say what it is; "build it" makes it';
  readonly marks: Mark[] = [];
  /** Metres in the world per metre drawn (1: draw at full size). */
  scale = 1;
  wall: THREE.Group | null = null;
  private drawing: P2[] | null = null;
  private live: THREE.Line | null = null;
  /** What you said before the next stroke, to go with it. */
  private pending = '';

  constructor(private app: App) {}

  // ---- the wall in the world --------------------------------------------------------------------

  /** Set the wall up in front of you, facing you (or move it there). */
  placeWall() {
    const cam = this.app.view.camera;
    const head = cam.getWorldPosition(new THREE.Vector3());
    const fwd = cam.getWorldDirection(new THREE.Vector3()).setY(0);
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    if (!this.wall) {
      this.wall = new THREE.Group();
      this.wall.name = 'interpretation-wall';
      const board = new THREE.Mesh(new THREE.PlaneGeometry(WALL_W, WALL_H), new THREE.MeshBasicMaterial({ color: 0xf2f4f6, transparent: true, opacity: 0.92 }));
      board.position.set(WALL_W / 2, WALL_H / 2, 0);
      board.name = 'board';
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(WALL_W, WALL_H)), new THREE.LineBasicMaterial({ color: 0x8fd3ff }));
      frame.position.copy(board.position);
      this.wall.add(board, frame);
      this.app.view.scene.add(this.wall);
    }
    // its bottom-left corner, so wall coordinates run right and up from there
    const centre = head.clone().addScaledVector(fwd, 1.6);
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    this.wall.position.copy(centre).addScaledVector(right, -WALL_W / 2).setY(WALL_BASE);
    this.wall.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, new THREE.Vector3(0, 1, 0), fwd.clone().negate()));
    this.wall.visible = true;
    for (const m of this.marks) this.poseGhost(m);
  }

  /** Where a ray meets the wall, in wall coordinates (m), if it does. */
  private hit(e: PointerEvt): P2 | null {
    if (!this.wall) return null;
    this.wall.updateMatrixWorld(true);
    const inv = this.wall.matrixWorld.clone().invert();
    const o = e.ray.origin.clone().applyMatrix4(inv), d = e.ray.dir.clone().transformDirection(inv);
    if (Math.abs(d.z) < 1e-6) return null;
    const t = -o.z / d.z;
    if (t <= 0) return null;
    const x = o.x + d.x * t, y = o.y + d.y * t;
    return x >= 0 && x <= WALL_W && y >= 0 && y <= WALL_H ? [x, y] : null;
  }

  /** A point on the wall, in the world. */
  private world(p: P2, out = 0): Vec3 {
    const v = new THREE.Vector3(p[0], p[1], out).applyMatrix4(this.wall!.matrixWorld);
    return [v.x, v.y, v.z];
  }

  /** How a part drawn on the wall sits: in the wall's plane, turned as drawn, its face to you where it has one. */
  private poseOf(it: Interpretation, out: number): Pose {
    const w = this.wall!.quaternion;
    const qWall: Quat = [w.x, w.y, w.z, w.w];
    const kind = getPartKind(it.kind);
    // discs and plates lie flat by default: stood up to face the wall's front; long stock lies along the stroke
    const face = it.kind === 'disc' || it.kind === 'plate' ? axisAngle([1, 0, 0], Math.PI / 2) : kind.spawnRotation;
    const q = qmul(qWall, qmul(axisAngle([0, 0, 1], it.angle), face));
    return { p: this.world(it.at, out), q };
  }

  // ---- drawing ----------------------------------------------------------------------------------

  down(e: PointerEvt) {
    if (!this.wall) this.placeWall();
    const p = this.hit(e);
    if (!p) return;
    this.drawing = [p];
    this.live = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x1a1d22 }));
    this.wall!.add(this.live);
  }

  move(e: PointerEvt) {
    if (!this.drawing) return;
    const p = this.hit(e);
    const last = this.drawing[this.drawing.length - 1]!;
    if (!p || Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.004) return;
    this.drawing.push(p);
    this.live!.geometry.setFromPoints(this.drawing.map(([x, y]) => new THREE.Vector3(x, y, 0.002)));
  }

  up() {
    const pts = this.drawing;
    this.drawing = null;
    if (!pts || pts.length < 2) { this.dropLive(); return; }
    this.addStroke(pts);
  }

  private dropLive() {
    if (this.live) { this.wall?.remove(this.live); this.live.geometry.dispose(); this.live = null; }
  }

  /** A finished stroke, read with what you said: shown on the wall, and said back. */
  addStroke(pts: P2[]): Interpretation | null {
    const reading = readStroke(pts);
    if (!reading) { this.dropLive(); return null; }
    const words = this.pending;
    this.pending = '';
    const part = interpret(reading, words, this.scale);
    const line = this.live ?? new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, y, 0.002))), new THREE.LineBasicMaterial({ color: 0x1a1d22 }));
    if (!this.live) this.wall?.add(line);
    this.live = null;
    const mark: Mark = { points: pts, reading, words, part, ghost: this.ghostOf(part), line };
    this.marks.push(mark);
    this.poseGhost(mark);
    this.app.ego?.reply(`${part.sure < 0.5 ? 'Not sure, but I read ' : ''}${part.said}. Say what it is, or "build it".`);
    this.app.notify();
    return part;
  }

  private ghostOf(it: Interpretation) {
    const k = getPartKind(it.kind);
    const o = buildVisual(k.visual(effectiveParams(k, it.params, getMaterial(it.material))), ghostMaterial, () => ghostMaterial);
    this.app.view.scene.add(o);
    return o;
  }

  private poseGhost(m: Mark) {
    if (!this.wall) return;
    this.wall.updateMatrixWorld(true);
    const pose = this.poseOf(m.part, 0.05);
    m.ghost.position.set(...pose.p);
    m.ghost.quaternion.set(...pose.q);
  }

  // ---- what you say -----------------------------------------------------------------------------

  /**
   * Words while drawing. "Build it" makes the parts; "undo"/"clear" take strokes away; anything else is about the
   * last stroke (or, with none yet, the next): what it is, what it's made of, how big. Returns what she says back.
   */
  hear(words: string): string | null {
    const t = words.toLowerCase().trim();
    if (/^(build|make|create) (it|them|this|that|these)\b|^(yes|yep|yeah|do it|go)\b/.test(t)) return this.build();
    if (/^(undo|remove|delete|erase) (that|the last|it|last)|^undo$/.test(t)) return this.undo();
    if (/^(clear|start over|wipe|erase) ?(it|all|the wall|everything)?$/.test(t)) { this.clear(); return 'Wall cleared.'; }
    if (/^scale\b|^(1|one) ?(:|to) ?\d+/.test(t)) {
      const m = /(\d+)\s*(?::|to)\s*(\d+)/.exec(t);
      if (m) { this.scale = Number(m[2]) / Number(m[1]); this.reread(); return `Drawing at 1:${this.scale}: everything is ${this.scale} times the size drawn.`; }
    }
    const last = this.marks[this.marks.length - 1];
    if (!last) { this.pending = `${this.pending} ${t}`.trim(); return `Got it: the next thing you draw is “${t}”.`; }
    last.part = correct(last.reading, last.words, t, this.scale);
    last.words = `${last.words} ${t}`.trim();
    this.app.view.scene.remove(last.ghost);
    last.ghost = this.ghostOf(last.part);
    this.poseGhost(last);
    this.app.notify();
    return `Now: ${last.part.said}.`;
  }

  private reread() {
    for (const m of this.marks) {
      m.part = interpret(m.reading, m.words, this.scale);
      this.app.view.scene.remove(m.ghost);
      m.ghost = this.ghostOf(m.part);
      this.poseGhost(m);
    }
  }

  undo(): string {
    const m = this.marks.pop();
    if (!m) return 'Nothing drawn yet.';
    this.wall?.remove(m.line);
    this.app.view.scene.remove(m.ghost);
    this.app.notify();
    return `Took away the ${m.part.kind.replace('.', ' ')}.`;
  }

  clear() {
    while (this.marks.length) this.undo();
    this.pending = '';
  }

  /** Make the drawing real: every part, as read, standing out from the wall where it was drawn. One undo takes it back. */
  build(): string {
    if (!this.marks.length) return 'Draw something first.';
    this.wall!.updateMatrixWorld(true);
    const parts = this.marks.map((m, i) => makePart({ kind: m.part.kind, material: m.part.material, params: m.part.params, pose: this.poseOf(m.part, OUT), name: `${getPartKind(m.part.kind).label} ${i + 1}` }));
    const map = insertFragment(this.app.store, { parts, connections: [] }, { p: [0, 0, 0], q: [0, 0, 0, 1] }, 'Build from drawing');
    this.app.select(map.values());
    const n = parts.length;
    this.clear();
    this.app.audio.ui('place');
    return `Built ${n} part${n === 1 ? '' : 's'} from your drawing. Join them, or Play.`;
  }

  actions(): ToolAction[] {
    return [
      { id: 'draw-build', label: `🔨 Build it (${this.marks.length})`, run: () => this.app.ego?.reply(this.build()) },
      { id: 'draw-undo', label: '↶ Undo stroke', run: () => this.app.ego?.reply(this.undo()) },
      { id: 'draw-clear', label: 'Clear wall', run: () => this.clear() },
      { id: 'draw-wall', label: 'Wall here', run: () => this.placeWall() },
      { id: 'draw-scale', label: `Scale 1:${this.scale}`, run: () => { this.scale = this.scale === 1 ? 5 : this.scale === 5 ? 10 : 1; this.reread(); } },
    ];
  }

  cancel() {
    this.drawing = null;
    this.dropLive();
  }

  /** Where the wall is, for tests and for Ego. */
  wallPoint(p: P2) {
    this.wall?.updateMatrixWorld(true);
    return this.world(p);
  }
}

export const WALL = { width: WALL_W, height: WALL_H, base: WALL_BASE, out: OUT };

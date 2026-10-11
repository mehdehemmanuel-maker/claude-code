// The works standing in front of you: the floor plan of src/nexus/works/floor.ts built in the room, so a works is
// something you walk around rather than a table of machines. Every station stands on its own footprint at the size the
// plan gives it, the ones against the outside wall are against a wall you can see, and each carries a card saying what
// it does, how it was come by, what it draws and whether a program can be sent to it or it is hands.
//
// What is drawn and what is not is said rather than faked. Where the library draws the machine (the FFF printer is an
// Ender-3, which is what that station is), it is drawn whole from its maker's own model; where it does not, the station
// stands as the volume of its own footprint with its name on it and its card says "not drawn yet". A box labelled as a
// box is honest; a box pretending to be a lathe is not.
//
// Owner of: the works as a room you stand in.

import * as THREE from 'three';
import { layWorks, type Floor, type Stood } from '../works/floor';
import { stationById } from '../works/stations';
import { linkFor } from '../machines/link';
import { processById } from '../works/families';
import { card, label } from './holo';
import { component, use } from '../parts/components';
import { composeMachine, machinePart } from '../ask/machine';
import type { Part } from '../parts/kits';
import { kitView, type KitView } from './kit3d';
import { worksUnder } from '../works/budget';

/** The machines the library draws whole, by station: the station *is* that machine, not a stand-in for it. */
const DRAWN: Record<string, string> = { 'printer-fff': 'printer3d Ender-3' };

/** Stations the library has no kind for but the *inventor* can compose out of parts it does draw
 *  (src/nexus/ask/machine.ts), each at that station's own envelope from `works/stations.ts`. This is the answer to
 *  "why does everything look bogus": a benchtop CNC is three slides and a spindle, and the composer already makes
 *  exactly that, so the room draws it rather than drawing a box in its shape. Where no composition is honest — a
 *  resin printer is a vat and a lift, not a gantry; a forge is a lined tube — the station stays a stand-in and its
 *  card says so, because a wrong machine is worse than an admitted placeholder. */
export const COMPOSED: Record<string, string> = {
  'cnc-benchtop': 'a machine that cuts 300x180x45',
  'lathe-mini': 'a turning machine that cuts 250x90x90',
  wheel: 'a turning machine that turns 350x350x400',
};

export interface WorksRoom {
  group: THREE.Group; floor: Floor;
  /** which stations are drawn as the machine they are, and what each stand-in says it is */ drawn: Record<string, string>;
  /** the standing things, so the room can be pointed at and asked about */ at(id: string): THREE.Object3D | null;
  /** the cards turned to whoever is looking: a card read edge-on is a card that says nothing */ update(cam: THREE.Object3D): void;
  dispose(): void;
}

const CARD_W = 1.1, CARD_H = 0.62;

/** Metal, paint and firebrick, enough to tell one stand-in from another without pretending to be a photograph. */
const SHELL = (hex: number, rough = 0.6, metal = 0.35) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });
const BODY = SHELL(0x8d99a6, 0.55, 0.4), DARK = SHELL(0x3f4752, 0.7, 0.3), TOP = SHELL(0xb9a483, 0.8, 0.05);
const HOT = SHELL(0x9a6b4a, 0.85, 0.05), BRICK = SHELL(0xd9cdb4, 0.95, 0), RED = SHELL(0xb33a2a, 0.6, 0.1);

/** A station as a few blocks in the shape of the thing: a bench has legs and an overhanging top, a lathe a cabinet with
 *  a bed and a headstock, a forge a lined drum on a stand with a flue. It is a stand-in and its card says so — but a
 *  silhouette you can name across a room is the difference between a workshop and a bar chart with captions. Every
 *  size is its own footprint and the height its kind stands at (src/nexus/works/floor.ts). */
function standIn(s: Stood): THREE.Group {
  const g = new THREE.Group(), [w, d] = s.size, h = s.h, id = s.id;
  const box = (W: number, H: number, D: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  };
  const cyl = (r: number, H: number, m: THREE.Material, x = 0, y = 0, z = 0, lie = false) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 20), m); c.position.set(x, y, z); if (lie) c.rotation.z = Math.PI / 2;
    c.castShadow = true; c.receiveShadow = true; g.add(c); return c;
  };
  const legs = (W: number, D: number, H: number, m = DARK) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.07, H, 0.07, m, sx * (W / 2 - 0.09), H / 2, sz * (D / 2 - 0.09)); };
  if (/bench|soldering|computer|measuring|brake|spot-welder|wheel/.test(id)) {
    // a bench: four legs, a top that overhangs them, and the thing that stands on it
    const top = Math.min(0.92, h);
    legs(w * 0.92, d * 0.92, top - 0.05);
    box(w, 0.05, d, TOP, 0, top, 0);
    box(w * 0.42, 0.16, d * 0.7, DARK, -w * 0.22, top - 0.16 / 2 - 0.3, 0);          // a shelf under it
    if (id === 'bench') { box(0.16, 0.2, 0.12, DARK, w * 0.3, top + 0.1, 0); cyl(0.02, 0.26, DARK, w * 0.3, top + 0.22, 0, true); }  // a vice
    if (id === 'computer') { box(w * 0.5, 0.33, 0.03, DARK, 0, top + 0.2, -d * 0.2); box(w * 0.4, 0.02, 0.14, DARK, 0, top + 0.03, d * 0.1); }
    if (id === 'soldering') { box(0.1, 0.09, 0.18, DARK, -w * 0.2, top + 0.05, 0); cyl(0.012, 0.17, BODY, w * 0.05, top + 0.09, 0, true); }
    if (id === 'measuring') { box(w * 0.75, 0.09, d * 0.75, SHELL(0x55585c, 0.35, 0.1), 0, top + 0.05, 0); }  // the granite plate
    if (id === 'brake') { box(w * 0.9, 0.1, 0.12, BODY, 0, top + 0.06, -d * 0.18); cyl(0.025, w * 0.8, DARK, 0, top + 0.14, 0, true); }
    if (id === 'spot-welder') { box(w * 0.3, 0.3, d * 0.5, BODY, -w * 0.2, top + 0.15, 0); cyl(0.02, 0.34, DARK, w * 0.05, top + 0.2, 0); }
    if (id === 'wheel') { cyl(Math.min(0.17, d * 0.3), 0.04, BODY, 0, top + 0.03, 0); box(w * 0.35, 0.14, d * 0.5, TOP, w * 0.28, top + 0.08, 0); }
  } else if (/lathe|cnc|mill|drill|printer-msla|fuser/.test(id)) {
    // a machine on a cabinet: the cabinet, the bed, a headstock at one end, a column over it
    const cab = Math.min(0.78, h * 0.6);
    box(w * 0.9, cab, d * 0.86, BODY, 0, cab / 2, 0);
    box(w * 0.96, 0.08, d * 0.9, DARK, 0, cab + 0.04, 0);
    box(w * 0.3, h - cab - 0.1, d * 0.5, BODY, -w * 0.3, cab + (h - cab) / 2, 0);     // the headstock or the gantry leg
    cyl(0.035, w * 0.55, SHELL(0xc9ced4, 0.3, 0.9), w * 0.08, cab + 0.18, 0, true);   // the spindle or the screw
    if (/cnc|mill|printer-msla|fuser/.test(id)) box(w * 0.7, 0.07, d * 0.6, DARK, w * 0.08, cab + h * 0.42, 0);
    box(0.2, 0.26, 0.04, DARK, w * 0.34, cab + 0.42, d * 0.3);                        // its control panel
  } else if (/forge|foundry|kiln/.test(id)) {
    // a hot box: a lined drum on a stand, with a flue and a burner going into it
    const stand = 0.5, r = Math.min(d, w) * 0.33;
    legs(w * 0.6, d * 0.7, stand, DARK);
    box(w * 0.66, 0.06, d * 0.76, DARK, 0, stand, 0);
    if (id === 'foundry' || /kiln/.test(id)) { cyl(r, h - stand - 0.1, HOT, 0, stand + (h - stand) / 2, 0); cyl(r * 0.8, 0.05, BRICK, 0, h - 0.08, 0); }
    else { cyl(r, w * 0.5, HOT, 0, stand + r + 0.05, 0, true); cyl(r * 0.6, 0.06, BRICK, -w * 0.26, stand + r + 0.05, 0, true); }
    cyl(0.07, 0.75, DARK, w * 0.22, h + 0.2, 0);                                      // the flue
    cyl(0.05, 0.3, BODY, -w * 0.3, stand + 0.28, 0, true);                            // the burner
    if (id === 'forge') box(0.42, 0.16, 0.14, SHELL(0x6b6f76, 0.5, 0.8), w * 0.3, stand + 0.12, d * 0.2);   // the anvil beside it
  } else if (/welder/.test(id)) {
    const cab = h * 0.52;
    box(w * 0.5, cab, d * 0.7, BODY, -w * 0.18, cab / 2 + 0.22, 0);                   // the machine on a trolley
    legs(w * 0.5, d * 0.7, 0.22, DARK);
    cyl(0.055, 0.8, DARK, w * 0.26, 0.4, -d * 0.2);                                   // the gas bottle, or the wire stand
    box(0.26, 0.2, 0.03, DARK, -w * 0.18, cab + 0.3, d * 0.3);                        // its face
  } else if (/safety/.test(id)) {
    box(w * 0.8, 0.06, d * 0.8, DARK, 0, 1.0, 0);                                     // the board it hangs on
    legs(w * 0.8, d * 0.8, 1.0, DARK);
    cyl(0.07, 0.4, RED, -w * 0.22, 1.25, 0); box(0.22, 0.3, 0.06, SHELL(0xd8c26a, 0.7, 0.05), 0, 1.25, 0);
    cyl(0.1, 0.5, BODY, w * 0.26, 1.4, 0);                                            // the extraction duct
  } else if (/printer|arm|rail/.test(id)) {
    // a frame machine: a base, two uprights and a beam across them
    box(w * 0.8, 0.08, d * 0.8, DARK, 0, 0.04, 0);
    for (const sx of [-1, 1]) box(0.08, h - 0.1, 0.08, BODY, sx * w * 0.3, (h - 0.1) / 2 + 0.08, -d * 0.2);
    box(w * 0.68, 0.08, 0.08, BODY, 0, h - 0.06, -d * 0.2);
    box(w * 0.5, 0.05, d * 0.5, TOP, 0, 0.3, d * 0.05);
  } else {
    box(w * 0.82, h, d * 0.82, BODY, 0, h / 2, 0);
  }
  return g;
}

/** What a station's card says: what it does, what it cost and how, what it draws, and how a program reaches it. */
export function stationCard(s: Stood, drawn: 'model' | 'composed' | 'stand-in'): string[] {
  const st = stationById(s.id);
  const does = st.does.map((d) => processById(d).name ?? d);
  const link = linkFor(s.id);
  const short = (x: string) => (x.length > 64 ? `${x.slice(0, 63)}\u2026` : x);
  return [
    st.name,
    does.length ? short(does.join(', ')) : short(st.why),
    `${s.size[0]} × ${s.size[1]} m${st.kw ? `, ${st.kw} kW` : ''}${st.needs.length ? `, needs ${st.needs.join(', ')}` : ''}`,
    link && link.transport !== 'hand' ? `a program can be sent: ${link.transport}` : 'no port: its program is steps with a check at each one',
    { model: '', composed: 'composed here out of library parts, not a model of a named machine', 'stand-in': 'not drawn yet: it stands as its own floor area' }[drawn],
  ].filter(Boolean);
}

/** The works built in the room: its floor, its outside wall, every station on its own footprint, each with its card. */
export function worksRoom(ids: string[], o: { width?: number } = {}): WorksRoom {
  const floor = layWorks(ids, o);
  const group = new THREE.Group(); group.name = 'the works';
  const views: KitView[] = [];
  const by = new Map<string, THREE.Object3D>();
  const drawn: Record<string, string> = {};
  const [W, D] = floor.room;

  // the room: a floor with a metre grid you can pace out, four walls with a doorway at the open end, and its own
  // light. Without the walls the plan floats in the dark and neither the aisles nor the size of the place reads.
  const H = 3.0, t0 = 0.12;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.1, D + 0.6), new THREE.MeshStandardMaterial({ color: 0x4a4a4e, roughness: 0.95 }));
  slab.position.set(W / 2, -0.05, D / 2); slab.receiveShadow = true; group.add(slab);
  const grid = new THREE.GridHelper(Math.max(W, D) + 0.6, Math.round(Math.max(W, D) + 0.6), 0x6f7780, 0x5a6168);
  grid.position.set(W / 2, 0.003, D / 2); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35; group.add(grid);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b6358, roughness: 0.92 });
  const putWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  };
  putWall(W + 0.6, H, t0, W / 2, H / 2, -0.36);                                     // the outside wall: gas, fume, air
  putWall(t0, H, D + 0.6, -0.36, H / 2, D / 2); putWall(t0, H, D + 0.6, W + 0.36, H / 2, D / 2);
  // the end wall, with a doorway you walk in through (2.1 m, which is what gives the room its scale)
  const door = 1.6, side = (W + 0.6 - door) / 2;
  putWall(side, H, t0, side / 2 - 0.3, H / 2, D + 0.36); putWall(side, H, t0, W + 0.3 - side / 2, H / 2, D + 0.36);
  putWall(door, H - 2.1, t0, W / 2, 2.1 + (H - 2.1) / 2, D + 0.36);
  const sun = new THREE.DirectionalLight(0xfff3e0, 1.15);
  sun.position.set(W * 0.4, 7, D * 0.1); sun.target.position.set(W / 2, 0, D / 2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera as THREE.OrthographicCamera;
  c.left = -W; c.right = W; c.top = D; c.bottom = -D; c.near = 0.5; c.far = 24; c.updateProjectionMatrix();
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  group.add(sun); group.add(sun.target);
  group.add(new THREE.HemisphereLight(0xdfe9f2, 0x2a2622, 0.55));
  const wallSign = label(`outside wall — ${floor.services.join(', ')}`, 0.12);
  wallSign.position.set(W / 2, 2.2, -0.28); group.add(wallSign);

  for (const s of floor.stood) {
    const stand = new THREE.Group(); stand.position.set(s.at[0], 0, s.at[1]); stand.name = s.id;
    // its own floor area, marked out as it is in a real shop: a painted rectangle you do not put anything else in
    const mat = new THREE.Mesh(new THREE.BoxGeometry(s.size[0], 0.012, s.size[1]), new THREE.MeshStandardMaterial({ color: s.wall ? 0x6a4a2a : 0x3a4450, roughness: 0.9 }));
    mat.position.y = 0.006; mat.receiveShadow = true; stand.add(mat);

    const drawnAs = DRAWN[s.id], got = drawnAs ? component(drawnAs) : null;
    const comp = got && typeof got !== 'string' ? got : null;
    // a station with no kind but an honest composition: the inventor builds it out of parts the library does draw
    let made: Part | null = null;
    if (!comp && COMPOSED[s.id]) {
      try { const m = composeMachine(COMPOSED[s.id]!); made = machinePart(m, (w) => use(w)); } catch { made = null; }
    }
    drawn[s.id] = comp ? `drawn: ${comp.part.name}`
      : made ? `composed: ${made.name} — not a model of a named machine, but every part of it real (src/nexus/ask/machine.ts)`
        : drawnAs ? `box: ${typeof got === 'string' ? got : 'no component'}` : 'box: the library does not draw this kind yet';
    if (comp || made) {
      const v = kitView(comp ? comp.part : made!); views.push(v);
      // a maker's model is measured in millimetres and a composed machine is laid out in metres, so the one rule that
      // is right for both is to ask the drawing how big it came out: nothing in a workshop is 20 m across, so a box
      // that says it is was drawn in millimetres
      const raw = new THREE.Box3().setFromObject(v.group), span = Math.max(...raw.getSize(new THREE.Vector3()).toArray());
      v.group.scale.setScalar(span > 20 ? 0.001 : 1);
      const box = new THREE.Box3().setFromObject(v.group);
      v.group.position.set(-(box.min.x + box.max.x) / 2, 0.012 - box.min.y, -(box.min.z + box.max.z) / 2);
      v.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      stand.add(v.group);
    } else {
      stand.add(standIn(s));
      const name = label(stationById(s.id).name.replace(/^(a|an|the) /, ''), 0.1);
      name.position.set(0, s.h + 0.16, 0); stand.add(name);
    }

    const c = card(CARD_W, CARD_H);
    const lines = stationCard(s, comp ? 'model' : made ? 'composed' : 'stand-in');
    c.draw(lines[0]!, lines.slice(1).map((text) => ({ text })), s.wall ? "#c08a4a" : "#4dd0e1");
    c.mesh.position.set(0, s.h + 0.55, 0); c.mesh.userData['faces'] = true; stand.add(c.mesh);
    group.add(stand); by.set(s.id, stand);
  }
  const faces: THREE.Object3D[] = [];
  group.traverse((o) => { if (o.userData['faces']) faces.push(o); });
  return {
    group, floor, drawn,
    at: (id: string) => by.get(id) ?? null,
    // a card is turned to whoever is looking, and shown only where it can be read: closer than about a metre it is a
    // wall across the view, and further than ten it is three pixels of mush that still costs a draw. The name label is
    // a sprite and stays whatever the distance.
    update: (cam: THREE.Object3D) => {
      const p = new THREE.Vector3(), q = new THREE.Vector3();
      cam.getWorldPosition(p);
      for (const f of faces) { f.getWorldPosition(q); const d = q.distanceTo(p); f.visible = d > 1.3 && d < 10; if (f.visible) f.lookAt(p); }
    },
    dispose: () => { for (const v of views) v.dispose(); },
  };
}

// ---- the works as a place you go to -------------------------------------------------------------------------------
// The forge room hands over its own handles (the scene, the camera, the orbit, the headset's dolly) and this owns the
// rest: where the works stands, what the words mean, and taking you to its door. It lives here rather than in
// forge.ts because forge.ts is already the longest file in the tree, and a new concern put into the longest file is
// how it got that way.

/** What a room has to lend for a works to stand in it. */
export interface RoomHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  orbit: { target: THREE.Vector3; maxDistance: number; update(): void };
  dolly: THREE.Object3D;
  /** whether a headset is presenting, so the walk-in is the dolly's and not the camera's */ xr: () => boolean;
  /** put the viewer back where they were when the works is put away */ home: () => void;
}

/** Where the works stands: its own patch of ground, away from the table (0, 0), the warehouse and the workshop corner. */
export const WORKS_AT: [number, number] = [-34, -6];
let standing: WorksRoom | null = null;

/** The works turned to whoever is looking, each frame. */
export const worksStep = (cam: THREE.Object3D): void => standing?.update(cam);

/** What is standing, for a test to read: the layout's own numbers and which stations are drawn as themselves. */
export const worksStood = (): { at: [number, number]; room: [number, number]; drawn: Record<string, string>; stood: { id: string; at: [number, number]; size: [number, number]; wall: boolean }[]; inScene: boolean } | null =>
  (standing ? { at: WORKS_AT, room: standing.floor.room, drawn: standing.drawn, stood: standing.floor.stood.map((s) => ({ id: s.id, at: s.at, size: s.size, wall: s.wall })), inScene: !!standing.group.parent } : null);

/** "show me the works", "stand the works up under $1500", "put away the works": the whole works built on its own
 *  ground and you taken to its door, or taken away again. */
export function worksRoomWords(text: string, r: RoomHandles): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
  if (/^(put away|close|clear) (the )?works( room)?$/.test(t)) {
    if (!standing) return null;
    r.scene.remove(standing.group); standing.dispose(); standing = null; r.orbit.maxDistance = 5; r.home();
    return 'The works is put away, and you are back at the table.';
  }
  const m = /^(?:show|stand|lay|build|set) (?:me )?(?:up )?(?:the )?works(?: up| out| room)?(?: under \$?(\d[\d,]*))?$/.exec(t)
    ?? /^(?:take me (?:to|into)|walk me (?:round|around)) (?:the )?works$/.exec(t);
  if (!m) return null;
  if (standing) { r.scene.remove(standing.group); standing.dispose(); }
  const cap = m[1] ? Number(m[1].replace(/,/g, '')) : 3000;
  standing = worksRoom(worksUnder(cap).ids);
  const [W, D] = standing.floor.room;
  // its own ground: a works is a building you go to, not a thing on a bench, and standing it among the furniture puts
  // a lathe through a wall
  standing.group.position.set(WORKS_AT[0] - W / 2, 0, WORKS_AT[1]);
  r.scene.add(standing.group);
  // and you are taken inside its doorway, looking down the floor at the wall the hot stations are against: the one
  // view from which a works reads as a works rather than as a row of boxes. The table is a thing you lean over, so the
  // orbit is held to 5 m there; in a works it is let out far enough to see the whole floor and no further.
  r.orbit.maxDistance = Math.max(12, Math.hypot(W, D) * 1.2);
  r.orbit.target.set(WORKS_AT[0], 1.0, WORKS_AT[1] + D * 0.35);
  r.camera.position.set(WORKS_AT[0] + W * 0.22, 2.4, WORKS_AT[1] + D - 0.9);
  r.orbit.update();
  if (r.xr()) { r.dolly.position.set(WORKS_AT[0], 0, WORKS_AT[1] + D + 1.2); r.dolly.rotation.set(0, Math.PI, 0); }
  // what is really standing: a maker's own model, a machine composed out of library parts, or an admitted stand-in.
  // (this counted only the models and said "1 of them is drawn, the rest stand as a stand-in" while four were real:
  //  a sentence that goes stale the moment the room gets better at its job has to be derived, not written)
  const kinds = Object.values(standing.drawn);
  const modelled = kinds.filter((x) => x.startsWith('drawn')).length, built = kinds.filter((x) => x.startsWith('composed')).length;
  return `${standing.floor.says} Walk into it: the ones in brown are against the outside wall because they burn or fume. ${modelled} ${modelled === 1 ? 'is' : 'are'} drawn from a maker's own model${built ? `, ${built} ${built === 1 ? 'is' : 'are'} composed out of library parts by the inventor (a benchtop CNC is three slides and a spindle, so it is built rather than boxed)` : ''}, and the other ${kinds.length - modelled - built} stand as a stand-in at their own size. Each card says which it is: a stand-in labelled as one is honest, and a box pretending to be a lathe is not.`;
}

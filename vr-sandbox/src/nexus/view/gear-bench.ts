// The gear bench: a plate of shaft holes you put gears on by hand, and a train that runs because of where you put
// them. There is no "build a gearbox" button here and there is not meant to be one — the whole point is that the
// ratio, the direction and the refusals are consequences of the placement, worked out by `parts/gears.ts` from the
// distance between two centres, exactly as they would be on a steel plate.
//
// WHAT THE BENCH ITSELF DECIDES: nothing. It holds a list of placed gears, snaps each to the nearest hole, and asks
// `train()` what that arrangement does. If two gears are at the wrong centres it does not quietly nudge them into
// mesh — it marks them and prints what is wrong, because the thing a person learns from a gear board is which
// spacings work, and a board that silently fixes your spacing teaches nothing.
//
// THE HOLE PITCH IS WHY IT CAN WORK AT ALL. Two gears of module m mesh at m(z₁+z₂)/2, and tooth counts are whole
// numbers, so every valid centre distance is a whole multiple of m/2. A grid at m/2 therefore contains every
// meshing position exactly, and a grid at any other pitch would contain almost none of them — the board would look
// usable and nothing would ever quite mesh. It is laid out on the two axes so a pair can also be stacked at an
// angle: any two holes whose spacing comes to m(z₁+z₂)/2 are a mesh, wherever they are on the plate.
import * as THREE from 'three';
import { geometryOf } from './kit3d';
import { faults, gearPart, sayGear, section, sizesOf, train, type GearCut, type Placed, type Train } from '../parts/gears';

/** What the bench is made of, in metres. */
const PLATE = { x: 0.36, y: 0.012, z: 0.26 };
/** The stock to pick from: one module, the tooth counts a real small-gear set comes in, and a rack. */
export const GEAR_STOCK: { z: number; kind?: 'rack'; label: string }[] = [
  { z: 12, label: '12T' }, { z: 15, label: '15T' }, { z: 18, label: '18T' }, { z: 20, label: '20T' },
  { z: 24, label: '24T' }, { z: 30, label: '30T' }, { z: 40, label: '40T' }, { z: 60, label: '60T' },
  { z: 30, kind: 'rack', label: 'rack' },
];
const COLOURS = [0xb08d57, 0x9aa7b4, 0xc8743c, 0x7f9a7f, 0xa98cc0, 0x8fa8bd];

export interface BenchGear { id: string; cut: GearCut; at: [number, number]; shaft?: string; holder: THREE.Group; spin: THREE.Group; held?: 'left' | 'right' }

export class GearBench {
  readonly group = new THREE.Group();
  /** module, in metres: every gear on one bench shares it, because gears of different module cannot mesh */
  readonly m: number;
  /** the hole grid's pitch, m/2 — see the header on why it is that and not anything else */
  readonly pitch: number;
  readonly gears: BenchGear[] = [];
  /** which gear is turned. The first one placed, until something else is said. */
  driver: string | null = null;
  /** turns a minute at the driver, and how hard it is turned, N·m */
  rpm = 60; torque = 1;
  running = true;
  private angle = 0;
  private n = 0;
  private solved: Train | null = null;
  private readonly plate = new THREE.Group();
  private readonly stockGroup = new THREE.Group();
  private readonly held: Record<'left' | 'right', BenchGear | null> = { left: null, right: null };

  constructor(m = 0.002, readonly b = 0.008) {
    this.m = m; this.pitch = m / 2;
    this.group.add(this.plate, this.stockGroup);
    this.buildPlate();
    this.buildStock();
  }

  // ─── the board ──────────────────────────────────────────────────────────────────────────────────────────────────
  private buildPlate(): void {
    const top = new THREE.Mesh(new THREE.BoxGeometry(PLATE.x, PLATE.y, PLATE.z), new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.6, metalness: 0.35 }));
    top.position.y = -PLATE.y / 2; top.receiveShadow = true; top.name = 'the plate';
    this.plate.add(top);
    // THE HOLES AS POINTS, not as drilled cylinders: a 360 × 260 mm plate at a 1 mm grid has 93,000 holes, and
    // ninety-three thousand meshes would cost more than everything else in the room put together. They are drawn
    // where a person needs them — as a grid to aim at — and the gear's own bore is the hole that is real.
    const pts: number[] = [];
    for (let x = -PLATE.x / 2 + this.pitch; x < PLATE.x / 2; x += this.pitch) for (let z = -PLATE.z / 2 + this.pitch; z < PLATE.z / 2; z += this.pitch) pts.push(x, 0.0006, z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const dots = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9aa4b0, size: 0.0016, sizeAttenuation: true }));
    dots.name = 'the shaft holes'; this.plate.add(dots);
    for (const [x, z, w] of [[0, -PLATE.z / 2, PLATE.x], [0, PLATE.z / 2, PLATE.x]] as const) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, 0.008), new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.7, metalness: 0.4 }));
      rail.position.set(x, 0.003, z); this.plate.add(rail);
    }
  }

  private buildStock(): void {
    // THE RAIL THE BLANKS STAND ON. Without it they hang in the air off the back edge of the plate, which is what
    // the first picture of this bench showed: nine gears floating in a row with nothing under them.
    const rail = new THREE.Mesh(new THREE.BoxGeometry(PLATE.x + 0.06, 0.01, 0.055), new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.65, metalness: 0.45 }));
    rail.position.set(0, -0.005, -PLATE.z / 2 - 0.05); rail.receiveShadow = true; rail.name = 'the stock rail';
    this.stockGroup.add(rail);
    // the blanks laid out along it, each drawn as the real gear it is
    let x = -PLATE.x / 2 + 0.03;
    for (const s of GEAR_STOCK) {
      const cut = this.cutFor(s.z, s.kind);
      const mesh = this.meshFor(cut, 0x8a8f98);
      const holder = new THREE.Group(); holder.add(mesh);
      holder.rotation.x = -Math.PI / 2;
      holder.position.set(x, 0.001, -PLATE.z / 2 - 0.05);
      holder.userData.stock = s;
      holder.name = `stock ${s.label}`;
      this.stockGroup.add(holder);
      x += Math.max(0.03, sizesOf(cut).ra * 2 + 0.008);
    }
  }

  /** A gear of this many teeth on this bench: one module, one face width, a bore that suits its size. */
  cutFor(z: number, kind?: 'rack'): GearCut {
    const bore = kind === 'rack' ? 0 : Math.max(0.003, Math.round((z * this.m) / 8 / 0.001) * 0.001);
    // A REAL BACKLASH on every gear the bench makes: two nominal teeth touch on both flanks at once, and a pair cut
    // with no play binds. 0.04·m is 0.08 mm at module 2, which is what a commercial spur pair is cut with.
    return { m: this.m, z, b: this.b, kind, bore, jn: 0.04 * this.m, matter: 'steel-low' };
  }

  private meshFor(cut: GearCut, colour: number): THREE.Mesh {
    const part = gearPart(cut, 'gear');
    const geo = geometryOf(part.shape!, part.mat);
    const mesh = new THREE.Mesh(geo ?? new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.42, metalness: 0.78 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = sayGear(cut);
    return mesh;
  }

  // ─── putting one on ─────────────────────────────────────────────────────────────────────────────────────────────
  /** The nearest hole to a point on the plate, which is where a gear let go there goes. */
  snap(at: [number, number]): [number, number] {
    const q = (v: number, span: number) => Math.max(-span / 2 + this.pitch, Math.min(span / 2 - this.pitch, Math.round(v / this.pitch) * this.pitch));
    return [q(at[0], PLATE.x), q(at[1], PLATE.z)];
  }

  /** Put a gear on the board. Nothing is checked away: a gear that meshes with nothing is placed and reported. */
  place(z: number, at: [number, number], kind?: 'rack', shaft?: string): BenchGear {
    const cut = this.cutFor(z, kind);
    const id = `${kind === 'rack' ? 'rack' : `${z}T`}-${++this.n}`;
    const holder = new THREE.Group(), spin = new THREE.Group();
    // LAID FLAT ON THE HOLDER, NOT ON THE MESH. Turning the mesh itself left the spin group above it turning about
    // world Z, so the gears stood on edge and rotated like wheels — right ratio, wrong axis, and only a picture
    // shows it. With the quarter-turn here, `spin.rotation.z` is the plate's own normal.
    holder.rotation.x = -Math.PI / 2;
    spin.add(this.meshFor(cut, COLOURS[this.n % COLOURS.length]!));
    holder.add(spin);
    const [x, y] = this.snap(at);
    holder.position.set(x, 0.001, y);
    holder.name = id;
    this.plate.add(holder);
    const g: BenchGear = { id, cut, at: [x, y], shaft, holder, spin };
    this.gears.push(g);
    if (!this.driver) this.driver = id;
    this.solved = null;
    return g;
  }

  /** Take one off, which is as much a part of building as putting one on. */
  remove(id: string): boolean {
    const i = this.gears.findIndex((g) => g.id === id);
    if (i < 0) return false;
    this.plate.remove(this.gears[i]!.holder);
    this.gears.splice(i, 1);
    if (this.driver === id) this.driver = this.gears[0]?.id ?? null;
    this.solved = null;
    return true;
  }

  /** Two gears keyed to one shaft turn as one piece, which is how a compound reduction is built. */
  key(a: string, b: string): string {
    const x = this.gears.find((g) => g.id === a), y = this.gears.find((g) => g.id === b);
    if (!x || !y) return `there is no ${!x ? a : b} on the board`;
    const shaft = x.shaft ?? y.shaft ?? `shaft-${a}`;
    x.shaft = shaft; y.shaft = shaft;
    y.at = [...x.at]; y.holder.position.set(x.at[0], 0.001, x.at[1]);
    this.solved = null;
    return `${a} and ${b} are keyed to one shaft: they turn as one piece now`;
  }

  drive(id: string): string {
    if (!this.gears.some((g) => g.id === id)) return `there is no ${id} on the board`;
    this.driver = id; this.solved = null;
    return `${id} is the one being turned`;
  }

  // ─── what it does ───────────────────────────────────────────────────────────────────────────────────────────────
  /** What is on the board, as the gear library sees it — public because a drive line (parts/drive.ts) has to read
   *  the same placement the solver does, rather than being handed a copy that can drift from it. */
  placed(): Placed[] { return this.gears.map((g) => ({ id: g.id, gear: g.cut, at: g.at, shaft: g.shaft })); }

  /** What this arrangement is, worked out from where the gears were put. Re-solved when the board changes. */
  solve(): Train | null {
    if (!this.driver) return null;
    if (!this.solved) this.solved = train(this.placed(), this.driver, this.angle, this.torque, this.rpm);
    return this.solved;
  }

  /** Turn the driver by the clock and put every gear where the train says it must be. */
  tick(dt: number): void {
    if (!this.driver || !this.gears.length) return;
    if (this.running) this.angle += (this.rpm / 60) * 2 * Math.PI * dt;
    const t = train(this.placed(), this.driver, this.angle, this.torque, this.rpm);
    this.solved = t;
    for (const g of this.gears) {
      if (g.held) continue;                    // a gear in a hand is not in the train
      const turn = t.turn[g.id];
      if (g.cut.kind === 'rack') {
        // A RACK DOES NOT TURN, IT TRAVELS, and how far is the pinion's pitch circle rolling along it: x = r·θ.
        const by = t.meshes.find((mm) => mm.a === g.id || mm.b === g.id);
        const pin = by && this.gears.find((o) => o.id === (by.a === g.id ? by.b : by.a));
        const th = pin ? (t.turn[pin.id]?.angle ?? 0) : 0;
        const travel = pin ? sizesOf(pin.cut).r * th : 0;
        g.holder.position.x = g.at[0] + (travel % (Math.PI * this.m * 4));
        continue;
      }
      g.spin.rotation.z = turn ? turn.angle : 0;
      // a gear nothing drives is dimmed, so it is obvious on the board rather than only in the readout
      const mat = (g.spin.children[0] as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) mat.emissive = new THREE.Color(turn ? 0x000000 : 0x331a00);
    }
  }

  /** The readout: what the board is, in the order a person asks it. */
  say(): string[] {
    const t = this.solve();
    if (!t) return ['Nothing on the board yet. Put a gear on it.'];
    const out: string[] = [];
    const n = this.gears.length, meshes = t.meshes.length;
    out.push(`${n} gear${n === 1 ? '' : 's'} on the board, ${meshes} pair${meshes === 1 ? '' : 's'} in mesh, turned at ${this.driver} (${this.rpm.toFixed(0)} rpm, ${this.torque.toFixed(2)} N·m).`);
    // A RACK TRAVELS, so it is reported in millimetres per turn and never as a reduction.
    for (const mm of t.meshes) if (mm.travel) out.push(`${mm.a} × ${mm.b}: the rack moves ${(mm.travel * 1000).toFixed(2)} mm per turn of the pinion (${(mm.travel * 1000 / this.rpm * 60).toFixed(1)} mm a minute at ${this.rpm.toFixed(0)} rpm).`);
    if (t.ratio !== null && Math.abs(t.ratio) !== 1) {
      const end = Object.entries(t.turn).reduce((a, b) => (Math.abs(b[1].ratio) > Math.abs(a[1].ratio) ? b : a));
      out.push(`${Math.abs(t.ratio).toFixed(3)} to 1 ${Math.abs(t.ratio) > 1 ? 'reduction' : 'overdrive'} at ${end[0]}: ${end[1].rpm.toFixed(1)} rpm, ${end[1].torque.toFixed(2)} N·m, turning ${t.ratio < 0 ? `the other way` : `the same way`} ${t.ratio < 0 ? `from` : `as`} the driver.`);
    }
    for (const mm of t.meshes) out.push(`${mm.a} × ${mm.b}: ${(mm.centres * 1000).toFixed(1)} mm centres (cut for ${(mm.nominal * 1000).toFixed(1)}), ${mm.contact.toFixed(2)} teeth in contact, ${(mm.backlash * 1000).toFixed(3)} mm backlash.`);
    for (const r of t.refused) out.push(`${r.a} and ${r.b} do not mesh — ${r.why}`);
    for (const l of t.loose) out.push(`${l.id} turns nothing: ${l.why}`);
    for (const s of t.shut) out.push(s);
    for (const f of t.faults) out.push(f);
    return out;
  }

  // ─── hands ──────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Close a hand near the board: it takes the gear it is over, or a new one off the stock rail. */
  grab(hand: 'left' | 'right', grip: THREE.Object3D): string | null {
    if (this.held[hand]) return null;
    const p = new THREE.Vector3(); grip.getWorldPosition(p);
    const local = this.group.worldToLocal(p.clone());
    let best: BenchGear | null = null, bestD = 0.05;
    for (const g of this.gears) {
      const d = Math.hypot(local.x - g.at[0], local.z - g.at[1]);
      if (d < Math.max(sizesOf(g.cut).ra, 0.012) && d < bestD) { best = g; bestD = d; }
    }
    if (best) { best.held = hand; this.held[hand] = best; this.solved = null; return `${best.id} in your ${hand} hand`; }
    // nothing placed under the hand: is it over the stock rail?
    for (const h of this.stockGroup.children) {
      const s = h.userData.stock as { z: number; kind?: 'rack'; label: string } | undefined;
      if (!s) continue;
      if (Math.hypot(local.x - h.position.x, local.z - h.position.z) < 0.022) {
        const g = this.place(s.z, [local.x, 0], s.kind);
        g.held = hand; this.held[hand] = g;
        return `a new ${s.label} in your ${hand} hand`;
      }
    }
    return null;
  }

  /** While a hand holds one, the gear follows it over the board. */
  carry(hand: 'left' | 'right', grip: THREE.Object3D): void {
    const g = this.held[hand];
    if (!g) return;
    const p = new THREE.Vector3(); grip.getWorldPosition(p);
    const local = this.group.worldToLocal(p.clone());
    g.holder.position.set(local.x, Math.max(0.001, local.y), local.z);
  }

  /** Open the hand: the gear drops onto the nearest hole, and the board is re-solved around it. */
  release(hand: 'left' | 'right'): string | null {
    const g = this.held[hand];
    if (!g) return null;
    this.held[hand] = null; g.held = undefined;
    const [x, y] = this.snap([g.holder.position.x, g.holder.position.z]);
    // OFF THE PLATE IS OFF THE BOARD: a gear let go beyond the rails is put back in the stock, not dropped at the
    // edge where it would read as placed and mesh with nothing.
    if (Math.abs(g.holder.position.x) > PLATE.x / 2 || Math.abs(g.holder.position.z) > PLATE.z / 2) { this.remove(g.id); return `${g.id} off the board`; }
    g.at = [x, y]; g.holder.position.set(x, 0.001, y);
    this.solved = null;
    const t = this.solve();
    const mine = t?.meshes.filter((mm) => mm.a === g.id || mm.b === g.id) ?? [];
    const no = t?.refused.filter((r) => r.a === g.id || r.b === g.id) ?? [];
    if (mine.length) return `${g.id} down at ${(x * 1000).toFixed(0)}, ${(y * 1000).toFixed(0)} mm — in mesh with ${mine.map((mm) => (mm.a === g.id ? mm.b : mm.a)).join(' and ')}`;
    if (no.length) return `${g.id} down, but ${no[0]!.why}`;
    return `${g.id} down at ${(x * 1000).toFixed(0)}, ${(y * 1000).toFixed(0)} mm — meshing with nothing yet`;
  }

  /** Where a gear of z teeth would have to go to mesh with one already on the board: the honest answer to "why
   *  doesn't this fit", and the only help the bench gives — it says where, it does not move anything there. */
  wouldMesh(z: number, withId: string): { at: [number, number]; centres: number } | null {
    const g = this.gears.find((x) => x.id === withId);
    if (!g || g.cut.kind === 'rack') return null;
    const centres = ((g.cut.z + z) * this.m) / 2;
    // the nearest hole along +x that is exactly the right distance away, which exists because the grid is m/2
    return { at: this.snap([g.at[0] + centres, g.at[1]]), centres };
  }

  /** WHERE IT STANDS WHEN IT IS SET OUT, worked out by the bench and not by the room. A bench knows the height it
   *  is worked at and how far in front of a person it belongs; the room only knows where the person is looking.
   *  Keeping this here is what the size ratchet on `view/forge.ts` is for — the room had grown by the whole of a
   *  bench's vocabulary and placement, and that is the fifth concern its allowance is written against. */
  setOut(eye: THREE.Vector3, forward: THREE.Vector3): { eye: THREE.Vector3; at: THREE.Vector3 } {
    const f = forward.clone(); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const at = eye.clone().addScaledVector(f, 0.5); at.y = Math.max(0.75, eye.y - 0.55);
    this.group.position.copy(at); this.group.rotation.y = Math.atan2(-f.x, -f.z);
    // A BOARD IS LOOKED DOWN AT. Set back as far as it was raised, it is seen edge-on and reads as a grey quad.
    return { eye: at.clone().add(new THREE.Vector3(0, 0.62, 0)).addScaledVector(f, -0.26), at };
  }

  /** What to say when it is first set out: what is on the rail, and the one rule that makes the board work. */
  greeting(inVR: boolean): string {
    const hands = inVR
      ? 'Grip over the rail at the back to take a gear, carry it over the plate and let go: it drops onto the nearest hole and the board tells you what it meshes with.'
      : 'Say "put a 20 on at 0,0", "put a 40 on at 60,0" (millimetres from the middle), "key 60T-2 and 20T-3", "drive 20T-1", "take off 40T-2", "faster", "stop", "what does it do".';
    return `A gear bench before you: a 360 × 260 mm plate drilled on a ${(this.pitch * 1000).toFixed(0)} mm grid, and module ${(this.m * 1000).toFixed(0)} gears on the rail — ${GEAR_STOCK.map((g) => g.label).join(', ')}. Two gears mesh at (z₁ + z₂) mm apart and nowhere else, so a 20 and a 40 want exactly 60 mm. ${hands}`;
  }

  /** THE BOARD'S OWN WORDS, kept with the board. They lived in the room file for one round and pushed it past the
   *  size its own lint allows, which is what that lint is for: a room that owns every bench's vocabulary is the
   *  five-concerns file the ratchet is holding down. Every one of these changes the board and then asks it what it
   *  has become — none of them reports a ratio without re-solving. */
  act(t: string): string | null {
    let m: RegExpExecArray | null;
    if ((m = /^(?:put|place|add)\s+(?:an?\s+)?(\d+|rack)\s*t?\b(?:\s*(?:on|down))?(?:\s*(?:at|@)\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?))?/i.exec(t))) {
      const rack = /rack/i.test(m[1]!), z = rack ? 30 : Number(m[1]);
      const g = this.place(z, [Number(m[2] ?? 0) / 1000, Number(m[3] ?? 0) / 1000], rack ? 'rack' : undefined);
      const said = this.say();
      return `${g.id} on the hole at ${(g.at[0] * 1000).toFixed(0)}, ${(g.at[1] * 1000).toFixed(0)} mm. ${said.slice(1).join(' ') || said[0]}`;
    }
    if ((m = /^(?:take off|remove|lift)\s+(\S+)/i.exec(t))) return this.remove(m[1]!) ? `${m[1]} off the board. ${this.say().join(' ')}` : `There is no ${m[1]} on the board.`;
    if ((m = /^key\s+(\S+)\s+(?:and|to|with)\s+(\S+)/i.exec(t))) return `${this.key(m[1]!, m[2]!)}. ${this.say().join(' ')}`;
    if ((m = /^drive\s+(\S+)/i.exec(t))) return `${this.drive(m[1]!)}. ${this.say().join(' ')}`;
    if (/^(faster|speed up)/i.test(t)) { this.rpm = Math.min(600, this.rpm * 1.5); return `${this.rpm.toFixed(0)} rpm at the driver.`; }
    if (/^(slower|slow down)/i.test(t)) { this.rpm = Math.max(1, this.rpm / 1.5); return `${this.rpm.toFixed(0)} rpm at the driver.`; }
    if (/^(stop|hold)$/i.test(t)) { this.running = false; return 'The train held still.'; }
    if (/^(go|run|turn it)$/i.test(t)) { this.running = true; return 'Turning.'; }
    if (/^(what does it do|read it|what is it|the ratio)/i.test(t)) return this.say().join(' ');
    return null;
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mm = o as THREE.Mesh;
      if (mm.geometry) mm.geometry.dispose();
      if (mm.material) for (const x of Array.isArray(mm.material) ? mm.material : [mm.material]) x.dispose();
    });
  }
}

/** A gear set as parts, for anything that wants the board as a thing rather than as a view (a bill, a mass, a
 *  breakdown): every gear on it, drawn, where it stands. */
export const benchParts = (bench: GearBench) => bench.gears.map((g) => gearPart(g.cut, g.id, [g.at[0], 0, g.at[1]]));
export const benchFaults = (bench: GearBench) => bench.gears.flatMap((g) => faults(g.cut).map((f) => `${g.id}: ${f}`));
export const benchSection = (cut: GearCut) => section(cut);

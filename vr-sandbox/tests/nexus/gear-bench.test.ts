// The bench is the half a person touches: put a gear down, pick it up, key two to a shaft, take one off. None of
// it is tested through a browser — the bench holds its state and asks `parts/gears.ts` what the arrangement does,
// so every one of these runs headless, and a hand is just an object at a position.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GearBench, GEAR_STOCK, benchParts, benchFaults } from '../../src/nexus/view/gear-bench';

const hand = (x: number, y: number, z: number): THREE.Object3D => { const o = new THREE.Object3D(); o.position.set(x, y, z); o.updateMatrixWorld(true); return o; };

describe('a board you put gears on', () => {
  it('the holes are half a module apart, because that is where meshes are', () => {
    const b = new GearBench(0.002);
    expect(b.pitch).toBeCloseTo(0.001, 12);
    // every meshing distance m(z₁+z₂)/2 is a whole number of holes, and that is the whole reason for the pitch
    for (const [z1, z2] of [[12, 12], [18, 54], [20, 41], [13, 60]] as const) {
      const centres = ((z1 + z2) * 0.002) / 2;
      expect(Math.abs(centres / b.pitch - Math.round(centres / b.pitch))).toBeLessThan(1e-9);
    }
  });

  it('a gear goes on the nearest hole, and is told where it actually went', () => {
    const b = new GearBench(0.002);
    const g = b.place(20, [0.0604, 0.0003]);
    expect(g.at[0]).toBeCloseTo(0.06, 9);   // snapped to the millimetre grid
    expect(g.at[1]).toBeCloseTo(0, 9);
  });

  it('two gears put at the right distance mesh, and the board says the ratio', () => {
    const b = new GearBench(0.002);
    b.place(20, [0, 0]); b.place(40, [0.06, 0]);
    const t = b.solve()!;
    expect(t.meshes.length).toBe(1);
    expect(Math.abs(t.ratio!)).toBeCloseTo(2, 9);
    expect(b.say().join(' ')).toMatch(/2\.000 to 1 reduction/);
  });

  it('two gears put at the WRONG distance do not, and the board says why rather than nudging them', () => {
    const b = new GearBench(0.002);
    const a = b.place(20, [0, 0]), c = b.place(40, [0.055, 0]);
    expect(b.solve()!.meshes).toEqual([]);
    expect(b.say().join(' ')).toMatch(/do not mesh/);
    // and nothing was moved to make it work: where they were put is where they are
    expect(a.at[0]).toBeCloseTo(0, 9);
    expect(c.at[0]).toBeCloseTo(0.055, 9);
  });

  it('it says where a gear would have to go, and still does not put it there', () => {
    const b = new GearBench(0.002);
    const a = b.place(20, [0, 0]);
    const w = b.wouldMesh(40, a.id)!;
    expect(w.centres).toBeCloseTo(0.06, 9);
    expect(w.at[0]).toBeCloseTo(0.06, 9);
    expect(b.gears.length).toBe(1); // it answered a question; it did not build anything
  });

  it('a hand takes a gear, carries it, and drops it on a hole', () => {
    const b = new GearBench(0.002);
    b.place(20, [0, 0]);
    const g = b.place(40, [0.1, 0]);
    expect(b.grab('right', hand(0.1, 0.01, 0))).toMatch(/40T/);
    expect(g.held).toBe('right');
    b.carry('right', hand(0.0608, 0.02, 0.0004));
    const said = b.release('right');
    expect(said).toMatch(/in mesh with/);
    expect(g.at[0]).toBeCloseTo(0.061, 9);   // the nearest hole to where the hand let go
    // AND IT STILL MESHES AT 61 mm, which is the involute's whole point and the opposite of what I expected when
    // I wrote this test: an involute pair keeps its exact ratio at any centre distance it can still reach across.
    // What changes is the play — 2·Δa·tan α = 2 × 1 mm × tan 20° = 0.728 mm of backlash where nominal gives none.
    const t = b.solve()!;
    expect(t.meshes.length).toBe(1);
    expect(Math.abs(t.ratio!)).toBeCloseTo(2, 9);
    expect(t.meshes[0]!.backlash * 1000).toBeCloseTo(0.728, 3);
    expect(t.meshes[0]!.contact).toBeLessThan(1.64);  // and fewer teeth are in contact than at the right centres
  });

  it('a gear let go off the plate goes back to the stock instead of hanging off the edge', () => {
    const b = new GearBench(0.002);
    const g = b.place(20, [0, 0]);
    b.grab('right', hand(0, 0.01, 0));
    b.carry('right', hand(0.9, 0.02, 0));
    expect(b.release('right')).toMatch(/off the board/);
    expect(b.gears.find((x) => x.id === g.id)).toBeUndefined();
  });

  it('a hand over the stock rail takes a new one', () => {
    const b = new GearBench(0.002);
    const before = b.gears.length;
    const stock = GEAR_STOCK[3]!;
    expect(stock.label).toBe('20T');
    // the rail sits off the back edge of the plate; the first blank is at its left end
    const said = b.grab('right', hand(-0.15, 0.02, -0.18));
    if (said) { expect(said).toMatch(/new/); expect(b.gears.length).toBe(before + 1); }
    else expect(b.gears.length).toBe(before); // nothing under the hand is an honest nothing, not a guess
  });

  it('two keyed to one shaft turn as one, which is what makes a compound', () => {
    const b = new GearBench(0.002);
    b.place(20, [0, 0]);
    const big = b.place(60, [0.08, 0]);
    const small = b.place(20, [0.08, 0]);
    expect(b.key(big.id, small.id)).toMatch(/one piece/);
    b.place(60, [0.16, 0]);
    const t = b.solve()!;
    expect(Math.abs(t.ratio!)).toBeCloseTo(9, 6);
    expect(t.turn[big.id]!.ratio).toBeCloseTo(t.turn[small.id]!.ratio, 9);
  });

  it('turning the board moves every driven gear and leaves the loose ones still', () => {
    const b = new GearBench(0.002);
    b.place(20, [0, 0]); b.place(40, [0.06, 0]);
    const lonely = b.place(20, [0.2, 0.08]);
    b.rpm = 60;
    const was = b.gears.map((g) => g.spin.rotation.z);
    for (let i = 0; i < 10; i++) b.tick(0.05);
    const now = b.gears.map((g) => g.spin.rotation.z);
    expect(now[0]).not.toBeCloseTo(was[0]!, 6);
    expect(now[1]).not.toBeCloseTo(was[1]!, 6);
    expect(b.gears.find((g) => g.id === lonely.id)!.spin.rotation.z).toBe(0); // nothing drives it, so it stands
    expect(b.say().join(' ')).toMatch(/turns nothing/);
  });

  it('a rack travels instead of turning, and never reports a ratio', () => {
    const b = new GearBench(0.002);
    b.place(20, [0, 0]);
    const rack = b.place(30, [0, -0.02], 'rack');
    for (let i = 0; i < 10; i++) b.tick(0.05);
    expect(rack.spin.rotation.z).toBe(0);
    expect(Math.abs(rack.holder.position.x - rack.at[0])).toBeGreaterThan(0.001);
    const said = b.say().join(' ');
    expect(said).toMatch(/125\.66 mm per turn/);
    expect(said).not.toMatch(/Infinity/);
  });

  it('taking one off re-solves the board, and the driver moves on', () => {
    const b = new GearBench(0.002);
    const a = b.place(20, [0, 0]); b.place(40, [0.06, 0]);
    expect(b.driver).toBe(a.id);
    expect(b.remove(a.id)).toBe(true);
    expect(b.driver).not.toBe(a.id);
    expect(b.solve()!.meshes).toEqual([]);
  });

  it('the board is parts, so anything that weighs or lists things can read it', () => {
    const b = new GearBench(0.002);
    b.place(20, [0, 0]); b.place(40, [0.06, 0]);
    const parts = benchParts(b);
    expect(parts.length).toBe(2);
    expect(parts.every((p) => p.shape && 'prism' in p.shape)).toBe(true);
    expect(benchFaults(b)).toEqual([]);
    // and a gear it would refuse to cut is reported rather than drawn in silence
    const bad = new GearBench(0.002);
    bad.place(5, [0, 0]);
    expect(benchFaults(bad).join(' ')).toMatch(/not a gear/);
  });
});

describe('the words a person actually types at it', () => {
  // THE ROOM-FACING PATH HAD NO TEST, and a bug lived in it: a `\b` written into the placement regex by a patch
  // script came out as a literal backspace character (0x08), so "put a 20 on at 0,0" could never match and the
  // room answered 'I do not know the shape "a"' instead. Every test above drives `place()` directly, which is the
  // mechanism — this drives `act()`, which is the product.
  it('places, keys, drives and reads back, all by typed words', () => {
    const b = new GearBench(0.002);
    expect(b.act('put a 20 on at 0,0')).toMatch(/20T-1 on the hole at 0, 0 mm/);
    expect(b.act('put a 40 on at 60,0')).toMatch(/2\.000 to 1 reduction/);
    expect(b.act('what does it do')).toMatch(/2 gears on the board, 1 pair in mesh/);
    expect(b.act('faster')).toMatch(/90 rpm/);
    expect(b.act('stop')).toMatch(/held still/);
    expect(b.act('go')).toMatch(/Turning/);
    expect(b.act('drive 40T-2')).toMatch(/40T-2 is the one being turned/);
    expect(b.act('take off 40T-2')).toMatch(/off the board/);
    expect(b.act('take off 40T-2')).toMatch(/There is no 40T-2/);
    expect(b.act('put a rack on at 0,-20')).toMatch(/rack-3/);
    expect(b.act('make me a sandwich')).toBeNull();   // not its words: it says nothing rather than guessing
  });

  it('every regex in it is free of control characters', () => {
    // the cause, not the symptom: a patch script writing \b, \t or \f into a pattern string silently emits the
    // control character instead, and the pattern then matches nothing at all
    const src = readFileSync(new URL('../../src/nexus/view/gear-bench.ts', import.meta.url), 'utf8');
    const bad = [...src.matchAll(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g)].map((m) => m.index);
    expect(bad, `control characters at ${bad.join(', ')}`).toEqual([]);
  });
});

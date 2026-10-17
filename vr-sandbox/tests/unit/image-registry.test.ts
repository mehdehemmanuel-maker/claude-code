// The registry seam (tools/image/registry.mjs), as docs/IMAGE-TOOL.md shows it: a thing registered from outside the
// painter with its words, sizes and a drawer is read with nothing ignored, framed, placed, drawn, counted by the
// critic and carried in the PNG, with no edit to read.mjs or things.mjs. The entry is the docs' lighthouse example
// under another name (a scarecrow: the lighthouse is a built-in now), spliced out again after each test.
import { afterEach, describe, expect, it } from 'vitest';
import type { Ctx, ThingInstance } from '../../tools/image.mjs';
import { paint, read, register, things } from '../../tools/image.mjs';

const ID = 'scarecrow';
afterEach(() => {
  const at = things.findIndex((t) => t.id === ID);
  if (at >= 0) things.splice(at, 1);
});

/** The docs' example, fifteen lines, as a stranger would write it from the page. */
function registerScarecrow() {
  register('things', {
    id: ID, match: /^scarecrows?$/, usual: 1, size: { w: 1.2, h: 2.2, d: 0.4 }, depth: [8, 60],
    draw(ctx: Ctx, inst: ThingInstance) {
      const { W, rect, disc, lit } = ctx, s = ctx.camera.focal / inst.zm!, k = inst.size ?? 1; // px per metre
      const h = 2.2 * k * s, w = 1.2 * k * s, x = inst.ux * W - w / 2, y = inst.fy! - h;
      ctx.shadow(inst.xm!, inst.zm!, { w: 1.2 * k, d: 0.4 * k }, 2.2 * k);
      rect(x + w * 0.45, y, w * 0.1, h, lit([0.45, 0.3, 0.15], 0.7)); // the pole
      rect(x, y + h * 0.3, w, h * 0.12, lit(inst.colour ?? [0.7, 0.15, 0.1], 0.8)); // the arms, in the coat
      disc(x + w / 2, y + h * 0.15, w * 0.22, lit([0.9, 0.8, 0.5], 0.9)); // the straw head
      return { x, y, w, h };
    },
  } as unknown as (typeof things)[number]);
}

describe('a thing registered from outside', () => {
  it('is read by its word with nothing ignored, and its colour and count bind to it', () => {
    registerScarecrow();
    const s = read('two red scarecrows in a field at sunset');
    expect(s.things.scarecrow).toBe(2);
    expect(s.colours.scarecrow).toBe('red');
    expect(s.ignored).toEqual([]);
    expect(read('a scarecrow').ignored).toEqual([]);
  });

  it('is not read before it is registered', () => {
    expect(read('a scarecrow in a field').ignored).toEqual(['scarecrow']);
  });

  it('is placed off the road and the water, drawn, and counted seen by the critic', () => {
    registerScarecrow();
    for (const p of ['a scarecrow in a field at sunset', 'a scarecrow by a road', 'a scarecrow on a beach']) {
      const scene = read(p), img = paint(scene, { width: 320, height: 180, seed: 3 });
      const drawn = img.layout.things.filter((t) => t.kind === ID);
      expect(drawn.length, p).toBe(1);
      expect(drawn[0]!.pixels!, `${p}: pixels`).toBeGreaterThan(50);
      expect(drawn[0]!.visible, `${p}: seen`).toBe(true);
      expect(scene.report!.visible!.scarecrow).toEqual([1, 1]);
      if (img.layout.shore !== null) expect(drawn[0]!.y + drawn[0]!.h).toBeGreaterThan(img.layout.shore * 180 - 1);
    }
  });
});

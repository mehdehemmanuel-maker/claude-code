// The gallery and the batch flags (gallery-docs): the EXAMPLES table paints at a thumbnail size, the shell's --count,
// --strip and --format parse and validate, the P6 writer's header and byte count are right, the README's vocabulary
// paragraph carries every word of the header's, and the README's gallery points at pictures that are committed.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { compose, paint, ppm, read } from '../../tools/image.mjs';
import { DIR, EXAMPLES, MARK, region, vocabulary } from '../../tools/image-examples.mjs';

const TOOL = fileURLToPath(new URL('../../tools/image.mjs', import.meta.url));
const README = fileURLToPath(new URL('../../README.md', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'image-examples-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Runs the shell; returns its exit status and both streams. */
const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
const wordsOf = (text: string) => new Set(text.toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? []);

describe('the gallery table', () => {
  it('is not empty, names a file, a size and a caption per row, and every file once', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(10);
    for (const ex of EXAMPLES) {
      expect(ex.file, ex.file).toMatch(/\.png$/);
      expect(ex.size.length).toBe(2);
      expect(typeof ex.caption).toBe('string');
      expect(ex.cells || typeof ex.prompt === 'string', `${ex.file} has a prompt or cells`).toBeTruthy();
    }
    expect(new Set(EXAMPLES.map((e) => e.file)).size).toBe(EXAMPLES.length);
  });

  it('paints every prompt (each cell, each style) at 64x36 without throwing, every value in 0..1', () => {
    for (const ex of EXAMPLES) {
      const prompts = ex.cells ? ex.cells.map((c) => c.prompt) : [ex.prompt!];
      for (const prompt of prompts) {
        for (const style of ex.styles ?? [undefined]) {
          const img = paint(read(prompt), { width: 64, height: 36, seed: ex.seed ?? 1, style });
          expect(img.data.length, `${prompt} ${style ?? ''}`).toBe(64 * 36 * 3);
          let ok = true;
          for (const v of img.data) if (!(v >= 0 && v <= 1)) ok = false;
          expect(ok, `${prompt} in range`).toBe(true);
        }
      }
    }
  });
});

describe('the batch flags', () => {
  it('--count n writes <out>-1..-n, --strip n one picture n cells wide, both from seeds base + i - 1', () => {
    const count = run('a tree', '--count', '2', '--size', '16x9', '--seed', '5', '--out', join(dir, 'c.png'));
    expect(count.status, count.err).toBe(0);
    expect(existsSync(join(dir, 'c-1.png')) && existsSync(join(dir, 'c-2.png'))).toBe(true);
    expect(existsSync(join(dir, 'c.png'))).toBe(false);
    expect(count.out.trim().split('\n')).toEqual([join(dir, 'c-1.png'), join(dir, 'c-2.png')]);
    expect(count.err).toMatch(/seed 5: visible/);
    expect(count.err).toMatch(/seed 6: visible/);
    const alone = run('a tree', '--size', '16x9', '--seed', '5', '--out', join(dir, 'alone.png'));
    expect(alone.status).toBe(0);
    expect(readFileSync(join(dir, 'c-1.png')).equals(readFileSync(join(dir, 'alone.png')))).toBe(true); // -1 is plain
    const strip = run('a tree', '--strip', '3', '--size', '16x9', '--seed', '5', '--out', join(dir, 's.png'));
    expect(strip.status, strip.err).toBe(0);
    const file = readFileSync(join(dir, 's.png'));
    expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([48, 9]);
    expect(file.includes(Buffer.from('Seeds\0' + '5 6 7', 'latin1'))).toBe(true);
  });

  it('--format ppm writes a P6 the shell names .ppm by default, and the reading goes to stderr', () => {
    const r = run('a tree', '--format', 'ppm', '--size', '8x5', '--seed', '1', '--out', join(dir, 'p.ppm'));
    expect(r.status, r.err).toBe(0);
    const file = readFileSync(join(dir, 'p.ppm')), head = 'P6\n8 5\n255\n';
    expect(file.subarray(0, head.length).toString('ascii')).toBe(head);
    expect(file.length).toBe(head.length + 8 * 5 * 3);
    expect(r.err).toMatch(/^read as: /);
  });

  it('rejects a count or strip outside 1..64 or not a number, an unknown format, and both at once: exit 1', () => {
    for (const args of [
      ['--count', '0'], ['--count', '65'], ['--count', 'x'], ['--strip', '0'], ['--strip', '-3'], ['--format', 'gif'],
      ['--count', '2', '--strip', '2'], ['--count'],
    ]) {
      const r = run('a tree', ...args, '--out', join(dir, 'bad.png'));
      expect(r.status, args.join(' ')).toBe(1);
      expect(r.err, args.join(' ')).toMatch(/^Error: /);
    }
    expect(existsSync(join(dir, 'bad.png')) || existsSync(join(dir, 'bad-1.png'))).toBe(false);
    const help = execFileSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
    for (const flag of ['--count', '--strip', '--format', '--describe', '--strict']) expect(help).toContain(flag);
  });

  it('ppm() is P6\\n<w> <h>\\n255\\n then w*h*3 bytes, rounded from the floats; compose() lays cells in a grid', () => {
    const img = { width: 2, height: 1, data: new Float32Array([0, 0.5, 1, 1, 0, 0]) };
    const out = ppm(img), head = 'P6\n2 1\n255\n';
    expect(out.subarray(0, head.length).toString('ascii')).toBe(head);
    expect([...out.subarray(head.length)]).toEqual([0, 128, 255, 255, 0, 0]);
    const other = { width: 2, height: 1, data: new Float32Array([0.2, 0.2, 0.2, 0.4, 0.4, 0.4]) };
    const row = compose([img, other]);
    expect([row.width, row.height]).toEqual([4, 1]);
    expect([...row.data]).toEqual([0, 0.5, 1, 1, 0, 0, ...other.data].map((v) => Math.fround(v)));
    const col = compose([img, other], 1);
    expect([col.width, col.height, col.layout.cells[1]]).toEqual([2, 2, { x: 0, y: 1, w: 2, h: 1 }]);
    expect(() => compose([img, { ...img, width: 3 }])).toThrow(/one size/);
  });
});

describe('the README', () => {
  const readme = readFileSync(README, 'utf8');

  it('has the "Pictures from words" section, the gallery, the folded JSON of the four header prompts', () => {
    expect(readme).toContain('## Pictures from words');
    const leads = region(readme, MARK.leads), gallery = region(readme, MARK.gallery);
    expect(leads).not.toBeNull();
    expect(gallery).not.toBeNull();
    expect(leads!.match(/<details>/g)?.length).toBe(2);
    expect(gallery!.match(/<details>/g)?.length).toBe(2); // the other two header prompts, in their paired cells
    const cell = /<td valign="top">\n\n\*`a city skyline[^]*?<details>[^]*?"prompt": "a city skyline/;
    expect(gallery).toMatch(cell);
    expect(leads).toMatch(/```json\n\{\n\s+"prompt": "a red go-kart/);
    for (const ex of EXAMPLES) {
      expect(`${leads}\n${gallery}`, ex.file).toContain(`docs/images/${ex.file}`);
      expect(existsSync(join(DIR, ex.file)), `${ex.file} committed`).toBe(true);
    }
    expect(readdirSync(DIR).filter((f) => f.endsWith('.png')).length).toBeGreaterThanOrEqual(10);
    expect(existsSync(join(DIR, 'kart-dusk.json')) && existsSync(join(DIR, 'honesty-dragon.txt'))).toBe(true);
  });

  it('carries every word of the header\'s vocabulary paragraph in its vocabulary paragraph', () => {
    const header = vocabulary(), paragraph = region(readme, MARK.vocabulary);
    expect(paragraph).not.toBeNull();
    expect(header).toMatch(/^What is understood: /);
    const have = wordsOf(paragraph!), missing = [...wordsOf(header)].filter((w) => !have.has(w));
    expect(missing, `the README's vocabulary lacks: ${missing.join(', ')} (run npm run image:examples)`).toEqual([]);
    const families = ['time', 'weather', 'ground', 'water', 'things', 'space', 'abstract', 'portrait', 'underwater'];
    for (const family of families) expect(have.has(family), family).toBe(true);
  });
});

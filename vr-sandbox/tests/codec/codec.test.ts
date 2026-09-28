import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { deflateSync } from 'fflate';
import { PART_KINDS } from '../../src/parts/registry';
import { CONNECTOR_KINDS } from '../../src/connectors/registry';
import { MATERIALS, getMaterial } from '../../src/data/materials';
import { makeConnection, makePart, newDoc } from '../../src/doc/commands';
import { seededIds } from '../../src/doc/ids';
import type { BuildDoc, Pose } from '../../src/doc/types';
import { canonicalStringify } from '../../src/persistence/canonical';
import {
  DecodeError, base64url, crc32, decodeDoc, decodeDocText, encodeDoc, encodeDocText, fromBase64url, fromShareCode, toShareCode,
} from '../../src/persistence/codec';

const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
const unitish = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1, max: 1 });
const pose: fc.Arbitrary<Pose> = fc.record({
  p: fc.tuple(finite, finite, finite),
  q: fc.tuple(unitish, unitish, unitish, unitish),
});

/** Random but valid build documents. Poses are stored raw (not canonicalised) to stress number encoding. */
const docArb = fc.record({
  seed: fc.integer(),
  name: fc.string({ maxLength: 40, unit: 'binary' }),
  parts: fc.array(fc.record({
    kind: fc.constantFrom(...PART_KINDS.map((k) => k.id)),
    pose,
    frozen: fc.boolean(),
    label: fc.string({ maxLength: 20, unit: 'grapheme' }),
    tweak: fc.double({ noNaN: true, noDefaultInfinity: true, min: -10, max: 10 }),
    broken: fc.uniqueArray(fc.integer({ min: 0, max: 11 }), { maxLength: 4 }),
    segments: fc.option(fc.array(pose, { minLength: 1, maxLength: 12 }), { nil: null }),
  }), { maxLength: 12 }),
  links: fc.array(fc.record({ a: fc.nat(), b: fc.nat(), kind: fc.constantFrom(...CONNECTOR_KINDS.map((k) => k.id)), fa: pose, fb: pose, world: fc.boolean() }), { maxLength: 12 }),
  gravity: fc.tuple(finite, finite, finite),
  cureClock: fc.double({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1000 }),
}).map(({ seed, name, parts, links, gravity, cureClock }) => {
  const ids = seededIds(seed);
  const doc = newDoc(name, '2026-09-28T00:00:00.000Z');
  doc.sim.gravity = gravity;
  doc.sim.cureClock = cureClock;
  const made = parts.map((spec) => {
    const kind = PART_KINDS.find((k) => k.id === spec.kind)!;
    const materials = MATERIALS.filter((m) => !kind.materialFilter || kind.materialFilter(m));
    const material = materials[Math.abs(Math.round(spec.tweak * 1000)) % materials.length]!.id;
    const first = kind.params.find((p) => p.type === 'number');
    const params = first ? { [first.key]: spec.tweak } : {};
    const part = makePart({ kind: spec.kind, pose: { p: [0, 0, 0], q: [0, 0, 0, 1] }, material, params, frozen: spec.frozen, name: spec.label }, ids);
    part.pose = spec.pose; // raw floats, including -0 and long fractions
    part.damage = { broken: [...spec.broken].sort((x, y) => x - y), segments: spec.segments };
    doc.parts[part.id] = part;
    doc.materials[material] = getMaterial(material);
    return part;
  });
  if (made.length >= 2) {
    for (const l of links) {
      const a = made[l.a % made.length]!;
      const b = made[(l.a + 1 + (l.b % (made.length - 1))) % made.length]!;
      const c = makeConnection({ kind: l.kind, a: { part: a.id, frame: l.fa }, b: l.world ? null : { part: b.id, frame: l.fb } }, ids);
      doc.connections[c.id] = c;
    }
  }
  return doc;
});

function pruned(doc: BuildDoc): BuildDoc {
  const used = new Set(Object.values(doc.parts).map((p) => p.material));
  return { ...doc, materials: Object.fromEntries(Object.entries(doc.materials).filter(([k]) => used.has(k))) };
}

describe('canonical JSON', () => {
  it('is independent of key insertion order', () => {
    expect(canonicalStringify({ b: 1, a: { d: [1, 2], c: null } })).toBe(canonicalStringify({ a: { c: null, d: [1, 2] }, b: 1 }));
    expect(canonicalStringify({ b: 1, a: { d: [1, 2], c: null } })).toBe('{"a":{"c":null,"d":[1,2]},"b":1}');
  });
  it('normalises -0 and rejects non-finite numbers', () => {
    expect(canonicalStringify([-0, 0.1, 1e21, 5e-324])).toBe('[0,0.1,1e+21,5e-324]');
    expect(() => canonicalStringify([Number.NaN])).toThrow();
    expect(() => canonicalStringify({ x: Number.POSITIVE_INFINITY })).toThrow();
  });
});

describe('build file round trip (byte for byte)', () => {
  it('encode(decode(bytes)) === bytes for random documents', () => {
    fc.assert(fc.property(docArb, (doc) => {
      const bytes = encodeDoc(doc);
      const again = encodeDoc(decodeDoc(bytes));
      expect(Buffer.from(again).equals(Buffer.from(bytes))).toBe(true);
    }), { numRuns: 200 });
  });
  it('decode(encode(doc)) reconstructs the document exactly', () => {
    fc.assert(fc.property(docArb, (doc) => {
      const back = decodeDoc(encodeDoc(doc));
      // -0 becomes 0 in canonical form; compare via canonical text, and structurally via JSON.
      expect(JSON.parse(JSON.stringify(back))).toEqual(JSON.parse(JSON.stringify(pruned(doc))));
    }), { numRuns: 200 });
  });
  it('share codes round trip and are stable', () => {
    fc.assert(fc.property(docArb, (doc) => {
      const code = toShareCode(doc);
      expect(code.startsWith('VRSB1.')).toBe(true);
      const back = fromShareCode(code);
      expect(toShareCode(back)).toBe(code);
      expect(encodeDocText(back)).toBe(encodeDocText(doc));
    }), { numRuns: 100 });
  });
});

describe('untrusted input', () => {
  const sample = () => fc.sample(docArb, { numRuns: 1, seed: 42 })[0]!;

  it('corrupted share codes only ever throw DecodeError', () => {
    const code = toShareCode(sample());
    fc.assert(fc.property(fc.nat(code.length - 1), fc.constantFrom(...'AZaz09-_.x=!'), (i, ch) => {
      const bad = code.slice(0, i) + ch + code.slice(i + 1);
      try {
        fromShareCode(bad);
      } catch (e) {
        expect(e).toBeInstanceOf(DecodeError);
      }
    }), { numRuns: 300 });
  });
  it('random text never crashes the decoder', () => {
    fc.assert(fc.property(fc.string({ maxLength: 200 }), (s) => {
      try {
        decodeDocText(s);
      } catch (e) {
        expect(e).toBeInstanceOf(DecodeError);
      }
    }), { numRuns: 300 });
  });
  it('rejects prototype-pollution keys, dangling references and unknown kinds', () => {
    const text = encodeDocText(sample());
    expect(() => decodeDocText(text.replace('"format"', '"__proto__":{"x":1},"format"'))).toThrow(DecodeError);
    const doc = sample();
    const part = Object.values(doc.parts)[0]!;
    const broken = JSON.parse(encodeDocText(doc));
    broken.parts[0].kind = 'warp-drive';
    expect(() => decodeDocText(JSON.stringify(broken))).toThrow(/Unknown part kind/);
    const dangling = JSON.parse(encodeDocText(doc));
    dangling.connections = [{ ...makeConnection({ kind: 'fixed', a: { part: part.id, frame: { p: [0, 0, 0], q: [0, 0, 0, 1] } }, b: { part: 'p_000000000000', frame: { p: [0, 0, 0], q: [0, 0, 0, 1] } } }, seededIds(9)) }];
    expect(() => decodeDocText(JSON.stringify(dangling))).toThrow(/missing part/);
    expect(() => decodeDocText('{"format":"vrsb","version":1e999}')).toThrow(DecodeError);
  });
  it('rejects decompression bombs', () => {
    const huge = new Uint8Array(20 * 1024 * 1024);
    const code = `VRSB1.${base64url(deflateSync(huge))}.${crc32(huge).toString(16).padStart(8, '0')}`;
    expect(() => fromShareCode(code)).toThrow(/size limit/);
  });
});

describe('base64url and crc32', () => {
  it('base64url round trips arbitrary bytes', () => {
    fc.assert(fc.property(fc.uint8Array({ maxLength: 300 }), (b) => {
      expect(Buffer.from(fromBase64url(base64url(b))).equals(Buffer.from(b))).toBe(true);
      expect(base64url(b)).toBe(Buffer.from(b).toString('base64url'));
    }));
  });
  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

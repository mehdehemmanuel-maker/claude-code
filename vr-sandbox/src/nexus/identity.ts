// Identity is content: the hash of a canonical form. Nothing is identified by its name; a name is a label.

const OFFSET = 0xcbf29ce484222325n, PRIME = 0x100000001b3n, MASK = 0xffffffffffffffffn;
const enc = new TextEncoder();

/** FNV-1a, 64 bits, of a string; 16 hex characters. Computed in four 16-bit limbs: the same number as 64-bit arithmetic. */
export function fnv64(text: string): string {
  // the offset basis 0xcbf29ce484222325 and the prime 0x100000001b3, limb by limb from the lowest
  let h0 = 0x2325, h1 = 0x8422, h2 = 0x9ce4, h3 = 0xcbf2;
  for (const b of enc.encode(text)) {
    h0 ^= b;
    // times 0x100000001b3 = 0x1b3 + 0x100 << 32: each limb times 0x1b3, plus the low two limbs times 0x100 into the high two
    const t0 = h0 * 0x1b3, t1 = h1 * 0x1b3 + (t0 >>> 16), t2 = h2 * 0x1b3 + (t1 >>> 16) + h0 * 0x100, t3 = h3 * 0x1b3 + (t2 >>> 16) + h1 * 0x100;
    h0 = t0 & 0xffff; h1 = t1 & 0xffff; h2 = t2 & 0xffff; h3 = t3 & 0xffff;
  }
  return [h3, h2, h1, h0].map((x) => x.toString(16).padStart(4, '0')).join('');
}

/** FNV-1a by BigInt arithmetic, the definition the limbs are checked against. */
export function fnv64Reference(text: string): string {
  let h = OFFSET;
  for (const b of enc.encode(text)) { h ^= BigInt(b); h = (h * PRIME) & MASK; }
  return h.toString(16).padStart(16, '0');
}

/** JSON with object keys sorted, so equal structures print equally. Numbers print exactly; NaN is refused. */
export function canonical(value: unknown): string {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) throw new Error('a canonical form cannot hold NaN');
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}

export const hashOf = (value: unknown) => fnv64(canonical(value));

// Identity is content: the hash of a canonical form. Nothing is identified by its name; a name is a label.

const OFFSET = 0xcbf29ce484222325n, PRIME = 0x100000001b3n, MASK = 0xffffffffffffffffn;
const enc = new TextEncoder();

/** FNV-1a, 64 bits, of a string; 16 hex characters. */
export function fnv64(text: string): string {
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

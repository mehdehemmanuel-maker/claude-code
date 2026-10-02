// Entity IDs: a type prefix plus 12 Crockford base32 characters (lowercase, no i/l/o/u), 60 random bits.

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

export type IdPrefix = 'a' | 'p' | 'c' | 'f' | 'w';

export type IdSource = (prefix: IdPrefix) => string;

function encode(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i]! & 31];
  return out;
}

export const randomId: IdSource = (prefix) => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${encode(bytes)}`;
};

/** Deterministic IDs for templates and tests (mulberry32). */
export function seededIds(seed: number): IdSource {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (prefix) => {
    const bytes = new Uint8Array(12);
    for (let i = 0; i < 12; i++) bytes[i] = Math.floor(next() * 32);
    return `${prefix}_${encode(bytes)}`;
  };
}


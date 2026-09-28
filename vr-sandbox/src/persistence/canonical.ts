// Canonical JSON: the exact byte form every save uses.
//  - object keys sorted (UTF-16 code unit order; our keys are ASCII so this equals code point order)
//  - no insignificant whitespace; undefined-valued keys omitted
//  - numbers in ECMAScript shortest round-trip form, -0 written as 0, NaN/Infinity rejected
// Encoding the same value always yields the same bytes, and parse(encode(x)) re-encodes identically.

export class CanonicalError extends Error {}

export function canonicalStringify(value: unknown): string {
  const out: string[] = [];
  write(value, out, 0);
  return out.join('');
}

function write(v: unknown, out: string[], depth: number) {
  if (depth > 64) throw new CanonicalError('Nesting too deep');
  if (v === null) {
    out.push('null');
    return;
  }
  switch (typeof v) {
    case 'number':
      if (!Number.isFinite(v)) throw new CanonicalError(`Non-finite number ${v}`);
      out.push(Object.is(v, -0) ? '0' : JSON.stringify(v));
      return;
    case 'string':
      out.push(JSON.stringify(v));
      return;
    case 'boolean':
      out.push(v ? 'true' : 'false');
      return;
    case 'object': {
      if (Array.isArray(v)) {
        out.push('[');
        for (let i = 0; i < v.length; i++) {
          if (i) out.push(',');
          if (v[i] === undefined) throw new CanonicalError('undefined in array');
          write(v[i], out, depth + 1);
        }
        out.push(']');
        return;
      }
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
      out.push('{');
      keys.forEach((k, i) => {
        if (i) out.push(',');
        out.push(JSON.stringify(k), ':');
        write(obj[k], out, depth + 1);
      });
      out.push('}');
      return;
    }
    default:
      throw new CanonicalError(`Cannot encode ${typeof v}`);
  }
}

export const utf8 = new TextEncoder();

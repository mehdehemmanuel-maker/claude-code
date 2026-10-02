// Build document <-> canonical .vrsb bytes, and share codes.
//
//   file bytes  = canonical JSON of the build file (entity arrays sorted by id, only used materials embedded)
//   share code  = "VRSB1." + base64url(deflate-raw(file bytes)) + "." + crc32(file bytes) as 8 hex digits
//
// Decoding treats input as untrusted: size limits, strict schema, reference integrity, no prototype keys.

import { Value } from '@sinclair/typebox/value';
import { Inflate, deflateSync } from 'fflate';
import { hasConnectorKind } from '../connectors/registry';
import { hasPartKind } from '../parts/registry';
import { parseForm } from '../forms/form';
import type { Material } from '../data/materials';
import type { Assembly, BuildDoc, Connection, Part } from '../doc/types';
import { canonicalStringify, utf8 } from './canonical';
import { FileSchema, type BuildFile } from './schema';

export class DecodeError extends Error {}

export const MAX_FILE_BYTES = 16 * 1024 * 1024;
export const MAX_CODE_CHARS = 12 * 1024 * 1024;
export const SHARE_PREFIX = 'VRSB1.';

const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function docToFile(doc: BuildDoc): BuildFile {
  const parts = Object.values(doc.parts).map((p) => ({ ...p, features: [...p.features].sort(byId) })).sort(byId);
  const used = new Set(parts.map((p) => p.material));
  const materials: Record<string, Material> = {};
  for (const id of [...used].sort()) {
    const m = doc.materials[id];
    if (!m) throw new DecodeError(`Material ${id} is used but missing from the document`);
    materials[id] = m;
  }
  return {
    format: 'vrsb',
    version: 1,
    catalog: doc.catalog,
    meta: { ...doc.meta },
    assemblies: Object.values(doc.assemblies).sort(byId),
    parts: parts as BuildFile['parts'],
    connections: Object.values(doc.connections).sort(byId) as BuildFile['connections'],
    materials: materials as BuildFile['materials'],
    sim: { ...doc.sim, fluids: [...doc.sim.fluids].sort(byId) },
    snapshot: null,
  };
}

export function fileToDoc(file: BuildFile): BuildDoc {
  const rec = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x])) as Record<string, T>;
  return {
    format: 'vrsb',
    version: 1,
    catalog: file.catalog,
    meta: { ...file.meta },
    assemblies: rec(file.assemblies as Assembly[]),
    parts: rec(file.parts as unknown as Part[]),
    connections: rec(file.connections as unknown as Connection[]),
    materials: { ...(file.materials as unknown as Record<string, Material>) },
    sim: file.sim as BuildDoc['sim'],
  };
}

export function encodeDoc(doc: BuildDoc): Uint8Array {
  return utf8.encode(canonicalStringify(docToFile(doc)));
}

export function encodeDocText(doc: BuildDoc): string {
  return canonicalStringify(docToFile(doc));
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function checkValues(v: unknown, depth = 0) {
  if (depth > 32) throw new DecodeError('File nested too deeply');
  if (typeof v === 'number' && !Number.isFinite(v)) throw new DecodeError('Non-finite number');
  if (v && typeof v === 'object') {
    if (Array.isArray(v)) for (const x of v) checkValues(x, depth + 1);
    else for (const [k, x] of Object.entries(v)) {
      if (FORBIDDEN_KEYS.has(k)) throw new DecodeError(`Forbidden key "${k}"`);
      checkValues(x, depth + 1);
    }
  }
}

export function decodeDoc(bytes: Uint8Array): BuildDoc {
  if (bytes.length > MAX_FILE_BYTES) throw new DecodeError('File too large');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new DecodeError('File is not valid UTF-8');
  }
  return decodeDocText(text);
}

export function decodeDocText(text: string): BuildDoc {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new DecodeError('File is not valid JSON');
  }
  checkValues(json);
  if (!Value.Check(FileSchema, json)) {
    const first = [...Value.Errors(FileSchema, json)][0];
    throw new DecodeError(`Invalid build file at ${first?.path || '/'}: ${first?.message ?? 'schema mismatch'}`);
  }
  const file = json as BuildFile;
  validateReferences(file);
  return fileToDoc(file);
}

function validateReferences(file: BuildFile) {
  const unique = (ids: string[], what: string) => {
    if (new Set(ids).size !== ids.length) throw new DecodeError(`Duplicate ${what} id`);
  };
  unique(file.assemblies.map((a) => a.id), 'assembly');
  unique(file.parts.map((p) => p.id), 'part');
  unique(file.connections.map((c) => c.id), 'connection');
  unique(file.sim.fluids.map((f) => f.id), 'fluid');
  const asm = new Map(file.assemblies.map((a) => [a.id, a]));
  for (const a of file.assemblies) {
    if (a.parent !== null && !asm.has(a.parent)) throw new DecodeError(`Assembly ${a.id} has a missing parent`);
    // cycle check
    const seen = new Set<string>();
    let cur: string | null = a.id;
    while (cur) {
      if (seen.has(cur)) throw new DecodeError('Assembly hierarchy has a cycle');
      seen.add(cur);
      cur = asm.get(cur)?.parent ?? null;
    }
  }
  const parts = new Set(file.parts.map((p) => p.id));
  for (const p of file.parts) {
    if (!hasPartKind(p.kind)) throw new DecodeError(`Unknown part kind "${p.kind}"`);
    if (!file.materials[p.material]) throw new DecodeError(`Part ${p.id} uses material "${p.material}" not embedded in the file`);
    if (p.assembly !== null && !asm.has(p.assembly)) throw new DecodeError(`Part ${p.id} references a missing assembly`);
    unique(p.features.map((f) => f.id), 'feature');
    for (const [k, v] of Object.entries(p.params)) {
      if (typeof v !== 'string' || v.length <= 200) continue;
      if (k !== 'form') throw new DecodeError(`Part ${p.id}: parameter ${k} is too long`);
      try { parseForm(v); } catch (e) { throw new DecodeError(`Part ${p.id}: its form is invalid (${(e as Error).message})`); }
    }
    if (p.kind === 'form') {
      try { parseForm(String(p.params['form'] ?? '')); } catch (e) { throw new DecodeError(`Part ${p.id}: its form is invalid (${(e as Error).message})`); }
    }
  }
  for (const [key, m] of Object.entries(file.materials)) if (m.id !== key) throw new DecodeError(`Material key ${key} does not match its id`);
  for (const c of file.connections) {
    if (!hasConnectorKind(c.kind)) throw new DecodeError(`Unknown connector kind "${c.kind}"`);
    if (!parts.has(c.a.part) || (c.b && !parts.has(c.b.part))) throw new DecodeError(`Connection ${c.id} references a missing part`);
    if (c.b && c.b.part === c.a.part) throw new DecodeError(`Connection ${c.id} connects a part to itself`);
    if (c.weld) {
      if (c.kind !== 'weld') throw new DecodeError(`Connection ${c.id} is a ${c.kind} but carries weld beads`);
      for (const b of c.weld.beads) {
        if (!(b.leg > 0 && b.leg <= 0.05) || !(b.q >= 0 && b.q <= 1) || !(b.Q >= 0 && b.Q <= 1e8)) throw new DecodeError(`Connection ${c.id} has an impossible weld bead`);
      }
    }
  }
}

// ---- share codes ---------------------------------------------------------------------------------

export function toShareCode(doc: BuildDoc): string {
  const bytes = encodeDoc(doc);
  return `${SHARE_PREFIX}${base64url(deflateSync(bytes, { level: 9 }))}.${crc32(bytes).toString(16).padStart(8, '0')}`;
}

export function fromShareCode(code: string): BuildDoc {
  const trimmed = code.replace(/\s+/g, '');
  if (trimmed.length > MAX_CODE_CHARS) throw new DecodeError('Share code too long');
  const m = /^VRSB1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/.exec(trimmed);
  if (!m) throw new DecodeError('Not a VRSB1 share code');
  let compressed: Uint8Array;
  try {
    compressed = fromBase64url(m[1]!);
  } catch {
    throw new DecodeError('Share code is corrupted (base64)');
  }
  const bytes = inflateLimited(compressed, MAX_FILE_BYTES);
  if (crc32(bytes).toString(16).padStart(8, '0') !== m[2]) throw new DecodeError('Share code checksum mismatch');
  return decodeDoc(bytes);
}

function inflateLimited(data: Uint8Array, limit: number): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let tooBig = false;
  const inf = new Inflate((chunk) => {
    total += chunk.length;
    if (total > limit) tooBig = true;
    else chunks.push(chunk);
  });
  try {
    // Feed in slices so an oversized stream is caught early.
    const step = 64 * 1024;
    for (let i = 0; i < data.length && !tooBig; i += step) inf.push(data.subarray(i, i + step), i + step >= data.length);
  } catch {
    throw new DecodeError('Share code is corrupted (deflate)');
  }
  if (tooBig) throw new DecodeError('Share code expands beyond the size limit');
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INV = new Int16Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) B64_INV[B64.charCodeAt(i)] = i;

export function base64url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + B64[n & 63]!;
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i]! << 16;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]!;
  }
  return out;
}

export function fromBase64url(s: string): Uint8Array {
  if (s.length % 4 === 1) throw new Error('bad length');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => (i + k < s.length ? B64_INV[s.charCodeAt(i + k)] ?? -1 : -2));
    if (c.some((x) => x === -1)) throw new Error('bad char');
    const n = (c[0]! << 18) | (c[1]! << 12) | ((c[2]! < 0 ? 0 : c[2]!) << 6) | (c[3]! < 0 ? 0 : c[3]!);
    out[o++] = (n >> 16) & 255;
    if (c[2]! >= 0) out[o++] = (n >> 8) & 255;
    if (c[3]! >= 0) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

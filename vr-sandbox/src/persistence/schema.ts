// Structural schema for .vrsb build files (TypeBox -> JSON Schema). Semantic checks live in codec.ts.

import { Type, type Static } from '@sinclair/typebox';

const Num = Type.Number();
const Vec3 = Type.Tuple([Num, Num, Num]);
const Quat = Type.Tuple([Num, Num, Num, Num]);
const Pose = Type.Object({ p: Vec3, q: Quat }, { additionalProperties: false });
const Id = (prefix: string) => Type.String({ pattern: `^${prefix}_[0-9a-hjkmnp-tv-z]{12}$` });
const Key = Type.String({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_.-]+$' });
const Text = (max: number) => Type.String({ maxLength: max });
// text values are short, except a form's genome (checked as a form on decode)
const ParamValue = Type.Union([Num, Text(65536), Type.Boolean()]);
const Params = Type.Record(Key, ParamValue);

export const AssemblySchema = Type.Object({
  id: Id('a'),
  name: Text(120),
  parent: Type.Union([Id('a'), Type.Null()]),
  pose: Pose,
}, { additionalProperties: false });

export const FeatureSchema = Type.Object({
  id: Id('f'),
  kind: Type.Literal('hole'),
  p: Vec3,
  axis: Vec3,
  d: Num,
  through: Type.Boolean(),
}, { additionalProperties: false });

export const PartSchema = Type.Object({
  id: Id('p'),
  kind: Key,
  name: Text(120),
  material: Key,
  params: Params,
  pose: Pose,
  frozen: Type.Boolean(),
  assembly: Type.Union([Id('a'), Type.Null()]),
  features: Type.Array(FeatureSchema, { maxItems: 256 }),
  damage: Type.Object({
    broken: Type.Array(Type.Integer({ minimum: 0, maximum: 63 }), { maxItems: 64 }),
    segments: Type.Union([Type.Array(Pose, { maxItems: 64 }), Type.Null()]),
  }, { additionalProperties: false }),
}, { additionalProperties: false });

const Endpoint = Type.Object({ part: Id('p'), frame: Pose }, { additionalProperties: false });

const WeldBead = Type.Object({ p0: Vec3, p1: Vec3, leg: Num, q: Num, Q: Num }, { additionalProperties: false });

export const ConnectionSchema = Type.Object({
  id: Id('c'),
  kind: Key,
  a: Endpoint,
  b: Type.Union([Endpoint, Type.Null()]),
  params: Params,
  state: Type.Object({
    status: Type.Union([Type.Literal('intact'), Type.Literal('broken'), Type.Literal('slipped')]),
    cure: Num,
    note: Text(300),
  }, { additionalProperties: false }),
  weld: Type.Optional(Type.Object({ beads: Type.Array(WeldBead, { maxItems: 4096 }) }, { additionalProperties: false })),
}, { additionalProperties: false });

export const MaterialSchema = Type.Object({
  id: Key,
  name: Text(120),
  category: Key,
  density: Num,
  E: Num,
  nu: Num,
  yield: Num,
  ultimate: Num,
  elongation: Num,
  ductile: Type.Boolean(),
  ferromagnetic: Type.Boolean(),
  conductivity: Num,
  weld: Key,
  friction: Num,
  restitution: Num,
  sound: Key,
  loss: Num,
  sparks: Key,
  specificGravity: Type.Optional(Num),
  crossGrainFactor: Type.Optional(Num),
  remanence: Type.Optional(Num),
  color: Num,
  metalness: Num,
  roughness: Num,
  source: Text(400),
  confidence: Type.Union([Type.Literal('spec'), Type.Literal('handbook'), Type.Literal('estimated')]),
}, { additionalProperties: false });

const Fluid = Type.Object({
  id: Id('w'),
  name: Text(120),
  min: Vec3,
  max: Vec3,
  density: Num,
}, { additionalProperties: false });

export const SimSchema = Type.Object({
  gravity: Vec3,
  airDensity: Num,
  airDrag: Type.Boolean(),
  fluids: Type.Array(Fluid, { maxItems: 64 }),
  cureClock: Num,
  magnetism: Type.Boolean(),
}, { additionalProperties: false });

export const FileSchema = Type.Object({
  format: Type.Literal('vrsb'),
  version: Type.Literal(1),
  catalog: Text(32),
  meta: Type.Object({ name: Text(200), created: Text(40), app: Text(32) }, { additionalProperties: false }),
  assemblies: Type.Array(AssemblySchema, { maxItems: 5000 }),
  parts: Type.Array(PartSchema, { maxItems: 20000 }),
  connections: Type.Array(ConnectionSchema, { maxItems: 40000 }),
  materials: Type.Record(Key, MaterialSchema),
  sim: SimSchema,
  snapshot: Type.Null(),
}, { additionalProperties: false });

export type BuildFile = Static<typeof FileSchema>;

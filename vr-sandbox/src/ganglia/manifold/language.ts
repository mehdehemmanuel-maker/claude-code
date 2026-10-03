// The engineering language: the levels a construction is refined through, from a behaviour wanted to an instance in
// the world, and the manifold, the unit of knowledge at every level. A manifold is not a list of things: it is a
// family of configurations sharing an identity (a behaviour, a transformation, a mechanism, an architecture) with
// controlled variation (its parameters and their ranges), what enters and leaves it (ports), what it cites (laws),
// where it holds (window, invariants), what is known to realise it (datasheets), and how a member of it is made for a
// contract (its scaling). Human names ("battery") are names over regions of this language, never its roots: the root
// of a battery is the behaviour "store", refined to energy, to the electrical domain, to the electrochemical mechanism,
// to the reversible cell, to a chemistry, to a datasheet. docs/MANIFOLD-LANGUAGE.md.
import type { Source } from '../types';

export const BEHAVIORS = ['store', 'transfer', 'transform', 'generate', 'dissipate', 'convert', 'amplify', 'attenuate', 'sense', 'control', 'communicate', 'support', 'move', 'contain', 'isolate', 'filter', 'separate', 'mix', 'heat', 'cool', 'illuminate'] as const;
export type Behavior = (typeof BEHAVIORS)[number];

export const QUANTITIES = ['energy', 'matter', 'momentum', 'charge', 'heat', 'information', 'force', 'torque', 'mass', 'volume', 'pressure', 'radiation'] as const;
export type Quantity = (typeof QUANTITIES)[number];

/** The domain a quantity is held or carried in: the form of the energy, the kind of the flow. */
export const DOMAINS = ['electrical', 'rotational', 'translational', 'elastic', 'pneumatic', 'hydraulic', 'thermal', 'chemical', 'gravitational', 'electrostatic', 'magnetic', 'optical', 'informational'] as const;
export type Domain = (typeof DOMAINS)[number];

export const MECHANISMS = ['electrochemical', 'electrostatic', 'electromagnetic', 'inertial', 'elastic', 'gravitational', 'thermal', 'chemical', 'pneumatic', 'hydraulic', 'optical', 'computational'] as const;
export type Mechanism = (typeof MECHANISMS)[number];

/** The levels of refinement, in order: each arrow between them is a construction action (actions.ts). */
export const LEVELS = ['behavior', 'function', 'transformation', 'mechanism', 'architecture', 'component', 'realization', 'instance'] as const;
export type Level = (typeof LEVELS)[number];

/** What can enter and leave a manifold: a quantity in a domain, in or out. Refinement narrows ports, never adds domains. */
export interface AbstractPort { name: string; quantity: Quantity; domain: Domain; direction: 'in' | 'out' | 'inout'; /** What the chemical domain carries, when it matters which: hydrogen is not petrol. */ species?: string }

/** A number the language stands behind: where it comes from, or that it is an estimate and of what. */
export type Provenance = Source | { estimate: string };

/** A parameter of a manifold: its range over the family, SI, with its provenance. */
export interface Parameter { sym: string; name: string; unit: string; low: number; high: number; of: Provenance }

/**
 * What is wanted, as a contract: a behaviour's numbers and the constraints a member must meet. SI throughout: J, W,
 * K, kg, m. `in`/`out` are the domains the contract is spoken to in (electrical by default: charged from and released
 * to a circuit).
 */
export interface Contract {
  stores?: number;
  releases?: number;
  absorbs?: number;
  window?: [number, number];
  massMax?: number;
  rechargeable?: boolean;
  in?: Domain;
  out?: Domain;
  /** Years it must keep working through (cycles a day assumed daily). */
  cycles?: number;
}

/** The surroundings a construction is made in: what a member may use of them. */
export interface Environment {
  /** A drop available for a raised mass, m. */
  height: number;
  /** The largest radius a rotor or vessel may have here, m. */
  radiusMax: number;
  /** Ambient temperature, K. */
  ambient: number;
  /** The top speed a composed converter can turn a rotor at, rad/s (filled in by composition). */
  speedMax?: number;
}

/** A member of a manifold made for a contract: its mass (a range when the family's parameters are a range), its parameters, and whether it can be put in the world here. */
export interface Member {
  manifold: string;
  /** kg: [least, most] over the family's parameter range; equal when the member is a datasheet realisation. */
  mass: [number, number];
  parameters: Record<string, number>;
  /** A datasheet id realising it, when one is stocked. */
  realization?: string;
  /** It can be placed in the world here (a part kind exists for it). */
  instantiable: boolean;
  says: string;
  laws: string[];
}

export interface Manifold {
  id: string;
  level: Level;
  name: string;
  parent: string | null;
  /** The human names over this region of the language: never its identity. */
  names?: string[];
  behavior?: Behavior;
  quantity?: Quantity;
  domain?: Domain;
  mechanism?: Mechanism;
  /** For a transformation manifold: what it turns into what, by which law, and whether it runs both ways. */
  transformation?: { from: Domain; to: Domain; law: string; reversible: boolean };
  ports: AbstractPort[];
  parameters: Parameter[];
  /** The laws it is bounded by (ids in laws.ts): every manifold cites at least one. */
  laws: string[];
  invariants: string[];
  /** The temperatures it works between, K. */
  window?: [number, number];
  /** It can be refilled in place by what it gives out (rechargeable). */
  reversible?: boolean;
  /** Datasheets realising it, when stocked. */
  realizations?: string[];
  /** The roles it can fill. */
  roles?: string[];
  source: Source;
  /** A member of this manifold for a contract, parameterised by its scaling laws, or why none. */
  member?(c: Contract, env: Environment): Member | { refused: string; law?: string };
}

export const WH = 3600;
export const C0 = 273.15;

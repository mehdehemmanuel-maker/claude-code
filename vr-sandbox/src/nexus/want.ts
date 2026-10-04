// What a person wants, before anything is designed: regions and the states they want of them. A region is named by
// the person (the inside, the people, the part) or by the site (outside air, the ground, the grid, the road). What
// is said of a region is a value with an origin; a region of the environment may hold a quantity whatever is drawn
// from it (a reservoir: the grid's voltage, the air's temperature), supply up to a capacity, or produce something
// (people make heat and breath). A want is a predicate on a quantity of a region: a band to hold, a least flow to
// get on demand, a value to reach by the end. There is no kind of thing here, and no part: what must exist to make a
// want true is for the language to derive.

import type { Field } from './domain';
import type { Leaf } from './term';

export interface Region {
  id: string;
  /** Who describes it. */
  by: string;
  /** The site's (outside the person's design) or the person's. */
  environment: boolean;
  /** What is said of it, by quantity symbol. */
  quantities: Record<string, Leaf>;
  /** Quantities that vary over the region's own coordinates: a climate over t, a road's height over x. */
  fields?: Record<string, Field>;
  /** The regions it touches, by id: where a boundary between them can be. */
  adjoins: string[];
  /** Quantities it holds whatever is drawn from it: a reservoir. */
  holds?: string[];
  /** What it produces, as rates: people make heat, carbon dioxide, vapour and waste water. */
  produces?: Record<string, Leaf>;
  /**
   * What each quantity is about: the carrier it belongs to, by symbol (the air's temperature is about energy, rain is
   * water, the grid's voltage is about charge). The unit alone cannot say it: a pressure of water and a load on a
   * roof have one dimension.
   */
  carriers?: Record<string, string>;
  /** Quantities that are bounds, not things brought: what the region takes or gives at most (a bearing pressure, a service's power). */
  limits?: string[];
  /**
   * Where the region is: its extent along the frame's axes (y opposite gravity), each a quantity the region states
   * or free for the language to choose, with what its faces touch. A region with an extent has faces: up, down and
   * the sides, each with an area and an outward normal. A quantity the region states can tie free extents together
   * (a floor area is x times z).
   */
  extent?: { x: string | null; y: string | null; z: string | null; plan?: string; faces: Partial<Record<'up' | 'down' | 'side', string>> };
  /** For a quantity the region brings: which way it travels in the frame (rain and snow fall, wind blows across, sunlight comes from above). */
  directions?: Record<string, 'down' | 'across' | 'from above' | 'vertical' | 'along'>;
}

export interface Want {
  id: string;
  /** In the person's words. */
  says: string;
  /** The region the want is about. */
  region: string;
  /** The quantity, with its unit, and the carrier it is about when the unit does not say it. */
  quantity: { sym: string; unit: string; name: string; carrier?: string; direction?: 'vertical' | 'across' | 'along' };
  /** For a position: what it is measured from (the road's path, the drawn shape). */
  relativeTo?: string;
  /** The conditions the want holds under, as quantities (a crash from 50 km/h), by symbol and carrier. */
  condition?: Record<string, { leaf: Leaf; carrier: string }>;
  /** The band or bound: at least lo, at most hi. */
  lo?: Leaf;
  hi?: Leaf;
  /** Always (held), on demand (the person asks for it when they want it), or by the end. */
  when: 'always' | 'on demand' | 'by the end';
  by: string;
}

export interface Intent {
  name: string;
  by: string;
  regions: Region[];
  wants: Want[];
  /** How long the wants must hold. */
  duration: Leaf;
}

export const regionOf = (i: Intent, id: string): Region => {
  const r = i.regions.find((x) => x.id === id);
  if (!r) throw new Error(`${i.name}: no region ${id}`);
  return r;
};

/** Whether two regions touch: the same region, or one adjoins the other. */
export const touches = (i: Intent, a: string, b: string): boolean => a === b || regionOf(i, a).adjoins.includes(b) || regionOf(i, b).adjoins.includes(a);

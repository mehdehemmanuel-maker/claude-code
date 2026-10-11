// Where each station stands on the floor. A works is not a list of machines, it is a room you walk around, and the two
// things that decide the room are the floor each station wants with someone standing at it (`Station.floor`, m²) and
// what it has to be near: a forge and a foundry burn gas and have to be on an outside wall, a welder and a kiln want
// extraction, the wheel wants water, and everything wants power.
//
// The rules here are the ones a person laying out a garage uses, in this order:
//   - what burns or fumes goes against the outside wall, where the air and the gas are;
//   - the bench is in the middle of the work, not in a corner, because everything comes back to it;
//   - measuring goes as far from the welder and the grinder as the room allows: a surface plate next to a spark
//     shower is a surface plate with a pit in it;
//   - an aisle of 900 mm anywhere a person carries a part, which is 700 mm of shoulders plus what they are holding;
//   - the deepest station sets the depth of its row, so rows do not interleave.
//
// Owner of: the works' floor plan — which station stands where, how big the room has to be, and what is too close.

import { stationById, type Station } from './stations';

/** One station on the floor: the middle of its footprint in metres from the room's near-left corner, and the footprint
 *  itself. `wall` is true where it was put against the outside wall because of what it does. */
export interface Stood {
  id: string; name: string;
  /** metres, from the near-left corner of the room */ at: [number, number];
  /** metres: across the room, then into it */ size: [number, number];
  /** how tall it stands, m (a bench is 0.9, a lathe 1.3, a printer on a bench 1.4): typical */ h: number;
  wall: boolean; needs: string[]; row: number;
}
export interface Floor {
  stood: Stood[];
  /** the room it wants, m: across, then deep */ room: [number, number];
  /** m², the stations' own floor against the room's */ used: number; area: number;
  /** what the room has to have run to it */ services: string[];
  /** what is too close to what, and why */ faults: string[];
  says: string;
}

/** What has to be on an outside wall, and why. Gas and fume are not preferences. */
const OUTSIDE = /forge|foundry|welder|kiln|laser|fuser|sinter/;
/** How tall each kind of station stands, m. A machine on a bench is its bench plus itself; the rest are typical. */
const HEIGHT: [RegExp, number][] = [
  [/lathe|mill|cnc|drill/, 1.35], [/printer|laser/, 1.45], [/kiln|furnace|forge|foundry/, 1.1],
  [/bench|measuring|soldering|computer|brake|wheel|spot/, 0.95], [/arm|rail|amr/, 1.6], [/safety/, 1.8],
];
const heightOf = (s: Station): number => HEIGHT.find(([re]) => re.test(s.id))?.[1] ?? 1.2;

/** A station's footprint from the floor it wants: wider than deep, because a machine a person stands at is reached
 *  across and not walked into — but no more than about twice, because a 6 m² forge zone is 3.6 × 1.7 with the anvil
 *  in the middle of it and not a five-metre bench. `Station.floor` already includes the standing room. */
export function footprint(s: Station): [number, number] {
  const a = s.floor, d = Math.max(0.55, Math.sqrt(a / 2.2));
  return [+(a / d).toFixed(2), +d.toFixed(2)];
}

/** The floor plan: every station placed in rows, what burns against the outside wall first, and the room it all wants. */
export function layWorks(ids: string[], o: { width?: number; aisle?: number } = {}): Floor {
  const aisle = o.aisle ?? 0.9;
  const stations = ids.map(stationById);
  // the wall row first, in the order given; then everything else, the bench last of the first row so it ends up in the
  // middle of the work rather than in a corner
  // deepest first within each group, so a row packs evenly instead of leaving a strip no station fits in
  const byDepth = (a: Station, b: Station) => footprint(b)[1] - footprint(a)[1];
  const wall = stations.filter((s) => OUTSIDE.test(s.id)).sort(byDepth);
  const rest = stations.filter((s) => !OUTSIDE.test(s.id)).sort(byDepth);
  // the room is the stations' own floor and the aisles between the rows, squared off — but never narrower than two of
  // the widest station side by side, because a row that fits one of them wastes the rest of its own width
  const widest = Math.max(...stations.map((s) => footprint(s)[0]));
  const width = o.width ?? Math.max(4, 2 * widest + 0.3, +Math.sqrt(stations.reduce((a, s) => a + s.floor, 0) * 1.6).toFixed(1));
  const stood: Stood[] = [];
  let row = 0, x = 0, z = 0, deepest = 0;
  // rows are laid in pairs, back to back, with the aisle after the pair: one aisle serves two rows, which is how a
  // real shop is laid out and is the difference between 50 m² and 90 m² for the same sixteen machines
  const place = (s: Station, onWall: boolean) => {
    const [w, d] = footprint(s);
    if (x > 0 && x + w > width) { z += deepest + (row % 2 === 1 ? aisle : 0.2); x = 0; deepest = 0; row++; }
    stood.push({ id: s.id, name: s.name, at: [+(x + w / 2).toFixed(2), +(z + d / 2).toFixed(2)], size: [w, d], h: heightOf(s), wall: onWall, needs: s.needs, row });
    x += w + 0.3; deepest = Math.max(deepest, d);
  };
  for (const s of wall) place(s, true);
  if (wall.length) { z += deepest + aisle; x = 0; deepest = 0; row++; }   // the wall group is always walked to
  for (const s of rest) place(s, false);
  const depth = +(z + deepest).toFixed(1);
  const used = +stations.reduce((a, s) => a + s.floor, 0).toFixed(1);
  // what is too close: a surface plate beside a welder or a grinder, and anything that burns away from the wall
  const faults: string[] = [];
  const at = (id: string) => stood.find((p) => p.id === id);
  const m = (a: Stood, b: Stood) => Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]);
  const plate = at('measuring');
  for (const id of ['welder', 'spot-welder', 'forge', 'cnc-benchtop']) {
    const s = at(id);
    if (plate && s && m(plate, s) < 2) faults.push(`the ${s.name} is ${m(plate, s).toFixed(1)} m from the surface plate: sparks and grit land on it, and a plate with a pit in it measures nothing`);
  }
  for (const p of stood) if (OUTSIDE.test(p.id) && !p.wall) faults.push(`${p.name} burns or fumes and is not on the outside wall`);
  return {
    stood, room: [width, depth], used, area: +(width * depth).toFixed(1),
    services: [...new Set(stations.flatMap((s) => s.needs))], faults,
    says: `${stations.length} stations want ${used} m² of floor and fit a room ${width} × ${depth} m (${+(width * depth).toFixed(1)} m², the rest being the aisles a person walks and carries in). ${wall.length} of them burn or fume and are on the outside wall.`,
  };
}

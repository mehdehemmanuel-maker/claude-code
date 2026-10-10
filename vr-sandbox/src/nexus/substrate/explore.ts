// A derivation at the edge of the language is an experiment. A space's region holds the relations the language
// learned, and a derivation under a preference moves to the region's boundary, where the language knows least: the
// last observation of each class. So the derived address is realized and observed before it is a configuration. If
// the realization disagrees with what the system claims, the observation is added to the ones the relation was
// abduced from, the missing distinction is abduced again over all of them, the contradicted relation is superseded
// (appended, never removed), and the space is derived again. The loop ends when a derived address is observed to
// do what the system claims, or when no relation separates the observations (the language cannot yet say why).

import { candidates, promote, validate, type Language, type Observation, type Relation } from './abduce';
import type { Point } from './domain';
import type { Law } from './law';
import { choose } from './study';
import { derive, type Derived, type Space } from './space';
import type { Derivation } from './evaluate';

export interface Round {
  derived: Derived;
  observation: Observation | null;
  /** The realization did what the system claims at the derived address. */
  agreed: boolean;
  /** The relation abduced over every observation when it did not, and the one it superseded. */
  superseded: { old: Relation; by: Relation } | null;
  language: string;
}

export interface Exploration {
  rounds: Round[];
  /** The last derived address, observed to agree; null when the loop ended without one. */
  configuration: Derived | null;
  observations: Observation[];
  /** Why it ended. */
  ended: 'agreed' | 'no separating relation' | 'no admissible address' | 'rounds spent';
}

export function explore(
  spaceFor: (language: Language) => Space,
  prefs: Law[],
  spacing: Record<string, Derivation>,
  resolution: Record<string, Derivation>,
  observeAt: (at: Point, language: Language) => Observation | null,
  language: Language,
  observations: Observation[],
  rounds: number,
): Exploration {
  const out: Round[] = [];
  const seen = [...observations];
  for (let i = 0; i < rounds; i++) {
    const space = spaceFor(language);
    const d = derive(space, prefs, spacing, resolution);
    if (!d.pick) { out.push({ derived: d, observation: null, agreed: false, superseded: null, language: language.hash }); return { rounds: out, configuration: null, observations: seen, ended: 'no admissible address' }; }
    const o = observeAt(d.pick.at, language);
    const agreed = !!o && o.observed.value === o.derived.value;
    if (agreed || !o) { out.push({ derived: d, observation: o, agreed, superseded: null, language: language.hash }); return { rounds: out, configuration: agreed ? d : null, observations: seen, ended: agreed ? 'agreed' : 'no admissible address' }; }
    seen.push(o);
    // the relations that admitted the address are the ones the observation contradicts
    const contradicted = language.all().filter((r) => o.coupling && Object.keys(r.group.exponents).every((n) => o.quantities[n]));
    const { chosen } = choose(candidates(seen));
    if (!chosen || !validate(chosen).holds || chosen.generality < 2) { out.push({ derived: d, observation: o, agreed: false, superseded: null, language: language.hash }); return { rounds: out, configuration: null, observations: seen, ended: 'no separating relation' }; }
    const old = contradicted[0];
    const name = old ? old.name : `${o.coupling}: abduced while exploring`;
    const by = promote(chosen, name);
    const superseded = old ? { old, by: language.supersede(old, by, `observation ${o.hash} at a derived address contradicts it`) } : (language.add(by), null);
    out.push({ derived: d, observation: o, agreed: false, superseded, language: language.hash });
  }
  return { rounds: out, configuration: null, observations: seen, ended: 'rounds spent' };
}

// The faces of one thing (docs/EGO-NATIVE-LANGUAGE.md section D): an object and its process are projections of one
// structure, so a word that reaches both has one sense, not two. A flow and a quantity it carries (heat the flow,
// heat in joules); a law and the quantity or parameter it is of (Weight, weight); a way and the part that embodies
// it (the rack and pinion as a transformation and as a component); a joint as an interface and as a part; an element
// and the material that is mostly it (oxygen, silver); a part and the manifold that generates its variants; a process
// and the failure it is of a part (corrosion the chemistry, corrosion the failure mode). Used by the word lookup (names.ts) to tell a borrowed name
// from a second meaning, and by the senses of a word (native/polysemy.ts).
import type { Kind } from './model';

const FACES: [Set<string>, Set<string>][] = [
  [new Set(['flow', 'signal']), new Set(['quantity', 'property'])],
  [new Set(['law']), new Set(['quantity', 'parameter', 'property'])],
  [new Set(['transformation']), new Set(['component', 'manifold', 'mechanism', 'subsystem', 'system'])],
  [new Set(['interface']), new Set(['component', 'manifold'])],
  [new Set(['manifold', 'generator']), new Set(['component', 'subsystem', 'mechanism'])],
  [new Set(['chemical', 'element']), new Set(['material'])],
  [new Set(['failure']), new Set(['chemical', 'phenomenon', 'process', 'behavior'])],
];

/** Whether two kinds are faces of one thing. */
export const facesOfOne = (a: Kind | 'flow' | string, b: Kind | 'flow' | string): boolean => a === b || FACES.some(([x, y]) => (x.has(a) && y.has(b)) || (x.has(b) && y.has(a)));

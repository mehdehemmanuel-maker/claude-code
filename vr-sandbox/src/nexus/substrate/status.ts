// The status lattice (docs/NEXUS-RESTART.md Part IX). A value's status says what kind of evidence it rests on; a
// derivation is as weak as its weakest input. There is no default: a variable with no evidence is `unknown`, and an
// unknown stays unknown through every derivation.

export type Status =
  | 'fundamental'   // a declared constant with its fixing source
  | 'measured'      // a measurement leaf with source, instrument, window
  | 'derived'       // an evaluation: the weakest of its inputs, never stronger than this
  | 'given'         // a declared value of the intent or the configuration, by whom
  | 'empirical'     // a fitted relation with its data
  | 'estimated'     // a declared estimate with grounds and a range
  | 'assumed'       // a declared assumption with who and why
  | 'hypothesized'  // a candidate from abduction: never binds a runtime variable until validated
  | 'unobserved'    // a variable the window cannot resolve: not unknown, the observer says why
  | 'unresolved'    // an anomaly without a validated explanation
  | 'unknown'       // a variable with no value
  | 'contradicted'  // two evidences that disagree past tolerance: both kept, the term unusable
  | 'outside-validity'; // an input outside a law's domain: the evaluation refused, the domain named

/** Strongest first. */
export const STATUS_ORDER: readonly Status[] = [
  'fundamental', 'measured', 'derived', 'given', 'empirical', 'estimated', 'assumed', 'hypothesized',
  'unobserved', 'unresolved', 'unknown', 'contradicted', 'outside-validity',
];

export const rank = (s: Status) => STATUS_ORDER.indexOf(s);
/** The weakest of several statuses: what a derivation from them all can claim. */
export const weakest = (...s: Status[]): Status => s.reduce((w, x) => (rank(x) > rank(w) ? x : w), 'fundamental');
/** Statuses that carry a number. */
export const carriesValue = (s: Status) => rank(s) <= rank('hypothesized');
/** Statuses that may bind a runtime variable (a hypothesis may not until it is validated). */
export const mayBind = (s: Status) => rank(s) < rank('hypothesized');

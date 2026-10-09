// The life graph: the things of a life as nodes (a time, a person, a place, a memory), the eleven chemical messengers
// the user named, the brain's regions on a map, the glands and organs that make what the brain does not, and the states
// they shape (sleep, stress, reward…); every link between two nodes seen from either end, so a node clicked shows all it
// touches. The messengers' facts (what each is made from, where it is made, where it acts, what it rises and falls with)
// are textbook neuroscience (Kandel et al., Principles of Neural Science, 6th ed. 2021; Purves et al., Neuroscience,
// 6th ed. 2018), summarised, each a link with its source; the map is schematic (a midline view of one half, the deep
// parts drawn where they lie under it, laid out by eye from those books' figures), said so. A node that is in the
// library (a region's grams and cells in ./brain.ts, a gland in ./human.ts, a molecule in ./molecules.ts) names its
// entry. The user's own nodes and links are theirs, kept on their device.
// Owner of: the life graph (its nodes, links and the user's own) and the brain map's places.

export type Kind = 'time' | 'person' | 'place' | 'memory' | 'note' | 'messenger' | 'region' | 'organ' | 'state';
export interface Node {
  id: string; kind: Kind; name: string; says?: string;
  /** the library's entry for it (./brain.ts, ./human.ts, ./molecules.ts) */ entry?: string;
  /** where it is drawn on the brain map: across from front (0) to back (1), down from top (0) to bottom (1) */ at?: [number, number];
  /** for a messenger: what kind of molecule, and what it is made from */ is?: string; from?: string;
  src?: string; mine?: boolean; made?: number;
}
export interface Link { a: string; b: string; how: string; src?: string; mine?: boolean }
export interface Saved { nodes: Node[]; links: Link[]; day?: Day }

import { clock, hourOf, RHYTHMS, TYPICAL_DAY, type Day } from './rhythm';

const K = 'Kandel et al., Principles of Neural Science, 6th ed. (2021), summarised', P = 'Purves et al., Neuroscience, 6th ed. (2018), summarised';
const MAP = 'its place on the map schematic: a midline view, laid out by eye from the textbooks\' figures';

// ---- the brain's regions, on the map ------------------------------------------------------------------------------
const R = (id: string, name: string, at: [number, number], part: string, says: string, entry?: string): Node & { part: string } => ({ id, kind: 'region', name, at, says, ...(entry ? { entry } : {}), src: `${P}; ${MAP}`, part });
const GROUPS: Node[] = [
  { id: 'cerebrum', kind: 'region', name: 'cerebrum', says: 'the two hemispheres: the cortex, the limbic system and the basal ganglia under it', entry: 'cerebrum', src: P },
  { id: 'limbic-system', kind: 'region', name: 'limbic system', says: 'the ring of cortex and nuclei round the brain\'s core that joins memory, emotion and drive', src: P },
  { id: 'basal-ganglia', kind: 'region', name: 'basal ganglia', says: 'loops under the cortex that pick which movement, habit or goal goes ahead and hold the rest back', src: P },
  { id: 'diencephalon', kind: 'region', name: 'diencephalon', says: 'the between-brain: thalamus, hypothalamus, and the pineal above them', src: P },
  { id: 'brainstem', kind: 'region', name: 'brainstem', says: 'midbrain, pons and medulla: breathing, heartbeat, waking, and the messengers\' sources that reach the whole brain', src: P },
];
const REGIONS = [
  R('frontal-lobe', 'frontal lobe', [0.2, 0.28], 'cerebrum', 'planning, choosing, holding a goal, starting movement, speech (Broca\'s area)', 'frontal-lobe'),
  R('cingulate-cortex', 'cingulate cortex', [0.42, 0.24], 'limbic-system', 'notices errors, pain and conflict; joins feeling to action', 'cingulate-cortex'),
  R('parietal-lobe', 'parietal lobe', [0.6, 0.14], 'cerebrum', 'touch, where the body is, attention to space, number', 'parietal-lobe'),
  R('occipital-lobe', 'occipital lobe', [0.88, 0.34], 'cerebrum', 'sight', 'occipital-lobe'),
  R('corpus-callosum', 'corpus callosum', [0.52, 0.31], 'cerebrum', 'about 200 million fibres joining the two hemispheres', 'corpus-callosum'),
  R('caudate', 'caudate nucleus', [0.34, 0.36], 'basal-ganglia', 'goals and habits: the striatum\'s head', 'caudate'),
  R('putamen', 'putamen', [0.4, 0.43], 'basal-ganglia', 'learned movements: the striatum\'s motor part', 'putamen'),
  R('globus-pallidus', 'globus pallidus', [0.46, 0.46], 'basal-ganglia', 'holds movement back until one is chosen', 'globus-pallidus'),
  R('nucleus-accumbens', 'nucleus accumbens', [0.32, 0.51], 'basal-ganglia', 'reward and wanting', 'nucleus-accumbens'),
  R('subthalamic-nucleus', 'subthalamic nucleus', [0.54, 0.5], 'basal-ganglia', 'the brake on the basal ganglia', 'subthalamic-nucleus'),
  R('insula', 'insula', [0.28, 0.45], 'cerebrum', 'the body\'s inner state, taste, disgust (a lobe hidden under the temporal)', 'insula'),
  R('nucleus-basalis', 'nucleus basalis (basal forebrain)', [0.39, 0.52], 'cerebrum', 'sends acetylcholine over the cortex: attention and memory'),
  R('olfactory-bulb', 'olfactory bulb', [0.15, 0.52], 'cerebrum', 'smell\'s first stop: the only sense not relayed by the thalamus', 'olfactory-bulb'),
  R('temporal-lobe', 'temporal lobe', [0.3, 0.63], 'cerebrum', 'hearing, words heard (Wernicke\'s area), faces and objects (drawn from the side: it lies outside the midline)', 'temporal-lobe'),
  R('amygdala', 'amygdala', [0.52, 0.6], 'limbic-system', 'fear and what matters: it tags an event as important', 'amygdala'),
  R('hippocampus', 'hippocampus', [0.62, 0.57], 'limbic-system', 'makes new memories of events and places, and maps where you are (its place cells)', 'hippocampus'),
  R('thalamus', 'thalamus', [0.55, 0.42], 'diencephalon', 'the relay of every sense but smell to the cortex, and of the cortex\'s loops', 'thalamus'),
  R('pineal', 'pineal gland', [0.66, 0.43], 'diencephalon', 'makes melatonin in the dark', 'pineal'),
  R('hypothalamus', 'hypothalamus', [0.45, 0.54], 'diencephalon', 'hunger, thirst, temperature, sleep, sex, and the pituitary\'s orders', 'hypothalamus'),
  R('scn', 'suprachiasmatic nucleus', [0.4, 0.58], 'diencephalon', 'the body\'s master clock, set each day by light reaching the eyes'),
  R('pvn', 'paraventricular nucleus', [0.49, 0.53], 'diencephalon', 'makes oxytocin and the stress signal CRH that starts the cortisol chain'),
  R('arcuate', 'arcuate nucleus', [0.46, 0.59], 'diencephalon', 'hunger and fullness; makes β-endorphin and the dopamine that holds prolactin back'),
  R('pituitary', 'pituitary gland', [0.44, 0.66], 'diencephalon', 'the master gland: it sends ACTH to the adrenals and lets out oxytocin', 'pituitary'),
  R('midbrain', 'midbrain', [0.63, 0.64], 'brainstem', 'eye movements, the pupil, startle', 'midbrain'),
  R('vta', 'ventral tegmental area', [0.57, 0.65], 'brainstem', 'dopamine to the accumbens and the frontal lobe: reward and motivation'),
  R('substantia-nigra', 'substantia nigra', [0.6, 0.69], 'brainstem', 'dopamine to the striatum: starting movement; its loss is Parkinson\'s', 'substantia-nigra'),
  R('pag', 'periaqueductal grey', [0.67, 0.6], 'brainstem', 'damps pain from within, by the body\'s own opioids'),
  R('pons', 'pons', [0.64, 0.75], 'brainstem', 'relays the cortex to the cerebellum; breathing\'s rhythm and sleep', 'pons'),
  R('locus-coeruleus', 'locus coeruleus', [0.7, 0.71], 'brainstem', 'a small blue spot in the pons sending noradrenaline to almost the whole brain'),
  R('raphe', 'raphe nuclei', [0.6, 0.8], 'brainstem', 'the brain\'s serotonin, along the brainstem\'s midline'),
  R('medulla', 'medulla oblongata', [0.66, 0.87], 'brainstem', 'heartbeat, breathing and blood pressure', 'medulla'),
  R('cerebellum', 'cerebellum', [0.84, 0.7], 'brainstem', 'timing and smoothing movement, and learning it: more than half the brain\'s neurons', 'cerebellum'),
  R('spinal-cord', 'spinal cord', [0.68, 0.97], 'brainstem', 'the brain\'s cable to the body and back, its own reflexes in it', 'spinal-cord'),
];
const ORGANS: Node[] = [
  { id: 'adrenal', kind: 'organ', name: 'adrenal glands', says: 'on each kidney: the cortex makes cortisol, the medulla adrenaline', entry: 'adrenal', src: P },
  { id: 'gut', kind: 'organ', name: 'gut', says: 'its enterochromaffin cells make about 90 % of the body\'s serotonin', src: K },
  { id: 'muscles', kind: 'organ', name: 'muscles', says: 'every skeletal muscle moves on acetylcholine from its motor nerve', entry: 'nmj', src: K },
];
const STATES: Node[] = [
  ['sleep', 'sleep'], ['wakefulness', 'waking and alertness'], ['stress', 'stress'], ['reward', 'reward and wanting'], ['movement', 'movement'], ['mood', 'mood'],
  ['bonding', 'bonding and trust'], ['pain-relief', 'pain relief'], ['memory', 'learning and memory'], ['attention', 'attention'], ['appetite', 'appetite'],
  ['fight-or-flight', 'fight or flight'], ['light', 'light reaching the eyes'], ['exercise', 'long exercise'], ['calm', 'calm'],
].map(([id, name]): Node => ({ id: id!, kind: 'state', name: name! }));

// ---- the eleven messengers ------------------------------------------------------------------------------------------
interface Msg { id: string; name: string; entry?: string; is: string; from: string; says: string; made: string[]; acts: string[]; states: [string, string][]; src: string }
const MSGS: Msg[] = [
  { id: 'dopamine', name: 'dopamine', entry: 'dopamine', is: 'a catecholamine (a monoamine)', from: 'the amino acid tyrosine, by way of L-DOPA', says: 'wanting and learning what pays: its neurons fire at a reward better than expected; the nigra\'s start movement', made: ['substantia-nigra', 'vta', 'arcuate'], acts: ['caudate', 'putamen', 'nucleus-accumbens', 'frontal-lobe', 'pituitary'], states: [['reward', 'rises with'], ['movement', 'needed for'], ['attention', 'sharpens']], src: K },
  { id: 'serotonin', name: 'serotonin', entry: 'serotonin', is: 'an indoleamine (a monoamine)', from: 'the amino acid tryptophan, by way of 5-HTP', says: 'mood, sleep and appetite; the gut\'s, most of the body\'s, does not cross into the brain', made: ['raphe', 'gut'], acts: ['frontal-lobe', 'hippocampus', 'amygdala', 'hypothalamus', 'spinal-cord'], states: [['mood', 'steadies'], ['sleep', 'times'], ['appetite', 'curbs']], src: K },
  { id: 'melatonin', name: 'melatonin', entry: 'melatonin', is: 'an indoleamine hormone', from: 'serotonin', says: 'the night signal: made in the dark, held back by light at night, telling the body when it is night', made: ['pineal'], acts: ['scn'], states: [['sleep', 'readies for'], ['light', 'held back by']], src: P },
  { id: 'oxytocin', name: 'oxytocin', entry: 'oxytocin', is: 'a peptide of nine amino acids', from: 'its gene\'s precursor protein, cut', says: 'bonding, trust, birth and milk: let out by the pituitary into the blood and within the brain', made: ['pvn', 'pituitary'], acts: ['amygdala', 'nucleus-accumbens'], states: [['bonding', 'rises with touch and closeness, and builds'], ['stress', 'eases']], src: K },
  { id: 'adrenaline', name: 'adrenaline (epinephrine)', entry: 'adrenaline', is: 'a catecholamine hormone', from: 'noradrenaline', says: 'fight or flight from the adrenal medulla: the heart faster, glucose out, airways open; from the blood it barely enters the brain', made: ['adrenal'], acts: [], states: [['fight-or-flight', 'drives'], ['stress', 'rises with']], src: P },
  { id: 'noradrenaline', name: 'norepinephrine (noradrenaline)', entry: 'noradrenaline', is: 'a catecholamine (a monoamine)', from: 'dopamine', says: 'alertness: the locus coeruleus reaches almost the whole brain with it; the sympathetic nerves\' transmitter too', made: ['locus-coeruleus'], acts: ['frontal-lobe', 'thalamus', 'hippocampus', 'amygdala', 'cerebellum'], states: [['wakefulness', 'drives'], ['attention', 'focuses'], ['stress', 'rises with']], src: K },
  { id: 'cortisol', name: 'cortisol', entry: 'cortisol', is: 'a steroid hormone', from: 'cholesterol', says: 'the stress hormone, the end of a chain: CRH from the hypothalamus, ACTH from the pituitary, cortisol from the adrenal cortex; it peaks within an hour of waking and turns its own chain down', made: ['adrenal'], acts: ['hippocampus', 'hypothalamus', 'frontal-lobe', 'pituitary'], states: [['stress', 'rises with'], ['wakefulness', 'peaks after']], src: P },
  { id: 'endorphins', name: 'endorphins (β-endorphin)', is: 'an opioid peptide of 31 amino acids', from: 'POMC (pro-opiomelanocortin), cut', says: 'the body\'s own opioid, on μ receptors: pain damped from within, and a reward', made: ['arcuate', 'pituitary'], acts: ['pag', 'nucleus-accumbens'], states: [['pain-relief', 'gives'], ['exercise', 'rises with'], ['reward', 'adds to']], src: K },
  { id: 'acetylcholine', name: 'acetylcholine', entry: 'acetylcholine', is: 'a choline ester', from: 'choline and acetyl-CoA', says: 'attention and memory from the basal forebrain; REM sleep from the brainstem; every muscle\'s command', made: ['nucleus-basalis', 'pons'], acts: ['frontal-lobe', 'hippocampus', 'thalamus', 'muscles'], states: [['attention', 'focuses'], ['memory', 'helps lay down'], ['sleep', 'rises in REM'], ['movement', 'carries to the muscles']], src: K },
  { id: 'gaba', name: 'GABA', entry: 'gaba', is: 'an amino acid', from: 'glutamate', says: 'the brain\'s main brake: it opens chloride channels and quiets the neuron it reaches; benzodiazepines and alcohol act on its receptors', made: ['caudate', 'putamen', 'globus-pallidus', 'cerebellum'], acts: ['thalamus', 'frontal-lobe'], states: [['calm', 'brings'], ['sleep', 'helps']], src: K },
  { id: 'glutamate', name: 'glutamate', entry: 'glutamate', is: 'an amino acid', from: 'glutamine, which astrocytes give back', says: 'the brain\'s main accelerator, at most of its synapses; through NMDA receptors it strengthens a synapse used (learning); too much kills neurons', made: ['frontal-lobe', 'parietal-lobe', 'temporal-lobe', 'occipital-lobe', 'hippocampus', 'thalamus', 'cerebellum'], acts: ['hippocampus', 'frontal-lobe'], states: [['memory', 'lays down'], ['attention', 'carries']], src: K },
];

/** The graph as the textbooks give it, before the user adds to it. */
function builtIn(): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = [...GROUPS, ...REGIONS.map(({ part: _p, ...n }) => n), ...ORGANS, ...STATES], links: Link[] = [];
  for (const r of REGIONS) links.push({ a: r.id, b: r.part, how: 'part of', src: P });
  for (const m of MSGS) {
    nodes.push({ id: m.id, kind: 'messenger', name: m.name, ...(m.entry ? { entry: m.entry } : {}), is: m.is, from: m.from, says: m.says, src: m.src });
    for (const r of m.made) links.push({ a: m.id, b: r, how: 'made in', src: m.src });
    for (const r of m.acts) links.push({ a: m.id, b: r, how: 'acts in', src: m.src });
    for (const [s, how] of m.states) links.push({ a: m.id, b: s, how, src: m.src });
  }
  // (one made from another; the cortisol chain; the clock; the two rhythms opposed)
  links.push({ a: 'melatonin', b: 'serotonin', how: 'made from', src: P }, { a: 'noradrenaline', b: 'dopamine', how: 'made from', src: K }, { a: 'adrenaline', b: 'noradrenaline', how: 'made from', src: K }, { a: 'gaba', b: 'glutamate', how: 'made from', src: K },
    { a: 'pvn', b: 'pituitary', how: 'tells (CRH)', src: P }, { a: 'pituitary', b: 'adrenal', how: 'tells (ACTH)', src: P }, { a: 'light', b: 'scn', how: 'sets the clock of', src: P }, { a: 'scn', b: 'pineal', how: 'times', src: P },
    { a: 'cortisol', b: 'melatonin', how: 'its daily rhythm opposite (cortisol high in the morning, melatonin at night)', src: P });
  return { nodes, links };
}

/** A life graph: the textbooks' nodes and links, and the user's own on top. */
export class LifeGraph {
  readonly nodes = new Map<string, Node>(); links: Link[] = [];
  /** when the user sleeps and wakes, which sets the messengers' daily rhythms (./rhythm.ts); typical till they say */
  day: Day = { ...TYPICAL_DAY };
  constructor(saved?: Saved) {
    const b = builtIn(); for (const n of b.nodes) this.nodes.set(n.id, n); this.links = b.links; if (saved?.day && typeof saved.day.sleep === 'number') this.day = { ...saved.day };
    if (saved) { for (const n of saved.nodes ?? []) if (n?.id && !this.nodes.has(n.id)) this.nodes.set(n.id, { ...n, mine: true }); for (const l of saved.links ?? []) if (l && this.nodes.has(l.a) && this.nodes.has(l.b)) this.link(l.a, l.b, l.how); }
  }
  /** A node of the user's own: a time, a person, a place, a memory or a note. */
  add(kind: Kind, name: string, says?: string): Node {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || kind; let id = `${kind}:${base}`, n = 2;
    while (this.nodes.has(id)) id = `${kind}:${base}-${n++}`;
    const node: Node = { id, kind, name: name.trim(), ...(says ? { says } : {}), mine: true, made: Date.now() }; this.nodes.set(id, node); return node;
  }
  /** Two nodes linked, by the user (once: a link already there is kept as it is). */
  link(a: string, b: string, how = 'linked to'): Link | null {
    if (a === b || !this.nodes.has(a) || !this.nodes.has(b)) return null;
    const had = this.links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)); if (had) return had;
    const l: Link = { a, b, how, mine: true }; this.links.push(l); return l;
  }
  /** A link of the user's own taken away (the textbooks' stay). */
  unlink(a: string, b: string): boolean { const n = this.links.length; this.links = this.links.filter((l) => !(l.mine && ((l.a === a && l.b === b) || (l.a === b && l.b === a)))); return this.links.length < n; }
  /** A node of the user's own taken away, and its links. */
  remove(id: string): boolean { const n = this.nodes.get(id); if (!n?.mine) return false; this.nodes.delete(id); this.links = this.links.filter((l) => l.a !== id && l.b !== id); return true; }
  /** A node and everything linked to it, from either end, each with how (said from this node's side). */
  of(id: string): { node: Node; linked: { node: Node; how: string; out: boolean; mine: boolean; src?: string }[] } | null {
    const node = this.nodes.get(id); if (!node) return null;
    const linked = this.links.filter((l) => l.a === id || l.b === id).map((l) => ({ node: this.nodes.get(l.a === id ? l.b : l.a)!, how: l.how, out: l.a === id, mine: !!l.mine, ...(l.src ? { src: l.src } : {}) }));
    // (a time of day and each messenger with a daily rhythm, linked by what it is doing then: read off its curve for the
    // user's own sleep, so either end shows the other)
    const at = (t: Node, r: (typeof RHYTHMS)[string]) => { const h = hourOf(t.name)!; return `at ${clock(h)}: ${r.at(h, this.day).toFixed(1)} ${r.unit}, ${r.says(h, this.day)}`; };
    if (node.kind === 'time' && hourOf(node.name) !== null) for (const r of Object.values(RHYTHMS)) { const m = this.nodes.get(r.id); if (m) linked.push({ node: m, how: at(node, r), out: true, mine: false, src: r.src }); }
    const r = RHYTHMS[id]; if (r) for (const t of this.ofKind('time')) if (hourOf(t.name) !== null) linked.push({ node: t, how: at(t, r), out: false, mine: false, src: r.src });
    return { node, linked };
  }
  /** The nodes of a kind, in a steady order (the user's newest first). */
  ofKind(kind: Kind): Node[] { return [...this.nodes.values()].filter((n) => n.kind === kind).sort((x, y) => (y.made ?? 0) - (x.made ?? 0)); }
  /** The nodes whose names hold the words. */
  find(words: string): Node[] { const t = words.trim().toLowerCase(); return t ? [...this.nodes.values()].filter((n) => n.name.toLowerCase().includes(t)) : []; }
  /** What is the user's own, to keep. */
  saved(): Saved { return { nodes: [...this.nodes.values()].filter((n) => n.mine), links: this.links.filter((l) => l.mine), day: this.day }; }
}
/** The brain map's regions (those placed on it). */
export const BRAIN_MAP = (): Node[] => REGIONS.map(({ part: _p, ...n }) => n);
/** The eleven messengers, in the user's order. */
export const MESSENGER_IDS = ['dopamine', 'melatonin', 'oxytocin', 'adrenaline', 'cortisol', 'endorphins', 'serotonin', 'acetylcholine', 'noradrenaline', 'gaba', 'glutamate'] as const;

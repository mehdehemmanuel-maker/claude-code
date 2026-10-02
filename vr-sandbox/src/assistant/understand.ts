// Understanding a want. Someone may ask for anything: to chill on a beach, to be a dog, a living world of sky-whales,
// a tutorial, a machine, a blueprint for something no one has made. No want is stored as a script; each is taken to
// what it is made of in this world, its capabilities, the way a machine is taken to its blocks:
//
//   kinds         what the want is: to be somewhere, to fill it with life, to become something, to learn, to make,
//                 to change the rules, to see what is hidden, to feel a mood
//   capabilities  what doing it takes (ground, water, sky, sound, creatures with bodies and behaviour, characters with
//                 memories, a body to wear, steps that check what you did, overlays...), each backed by the code that
//                 does it here (file#symbol, checked by the tests) or marked not built yet
//   acts          what she can do about it right now, in this world (set gravity, slow time, shrink you), done at once
//   plan          the want, made of what she has, with what she builds next named plainly
//
// So every request means something: what she does now, what it becomes when the rest is built, and what that is.

import { placeFromWords } from '../world/place';

export type Kind = 'be somewhere' | 'populate' | 'become' | 'learn' | 'make' | 'change the rules' | 'see the hidden' | 'feel';

export interface Capability {
  id: string;
  name: string;
  /** The code that does it here, as file#symbol (checked by the tests), or null when it isn't built. */
  by: string | null;
  /** What it covers, and what it doesn't yet. */
  says: string;
  /** Words in a request that call for it. */
  words: string[];
}

/** Something she can do about a want at once, in this world. */
export type Act = { command: 'gravity earth' | 'gravity moon' | 'gravity zero' } | { timeScale: number } | { playerScale: number } | { place: string | null };

export const CAPABILITIES: Capability[] = [
  // ------------------------------------------------------------------------------------------------ the world itself
  { id: 'physics', name: 'real physics', by: 'src/physics/world.ts#PhysicsWorld', says: 'rigid bodies, joints, contacts, friction, fracture, magnets, springs and ropes, checked against the laws by the conformance suite', words: ['physics', 'simulation', 'simulate', 'collide', 'fall'] },
  { id: 'gravity', name: 'gravity of any world', by: 'src/forge/apphost.ts#gravity moon', says: 'Earth, Moon or none, at once', words: ['gravity', 'zero-gravity', 'weightless', 'moon', 'orbit', 'orbital', 'deep-space'] },
  { id: 'time', name: 'the speed of time', by: 'src/app/app.ts#setTimeScale', says: 'the world runs from a twentieth of real time to twice it', words: ['slow', 'slowing', 'slower', 'slow motion', 'freeze', 'freezes', 'faster'] },
  { id: 'scale', name: 'your own size', by: 'src/xr/tablet.ts#playerScale', says: 'you from a twentieth of your size (an ant\'s view) to twenty times it', words: ['shrink', 'miniature', 'magnifying', 'microscopic', 'make me'] },
  { id: 'water', name: 'water to swim and float in', by: 'src/physics/environment.ts#poolFluid', says: 'volumes of water with real buoyancy and drag (a pool now; a sea is a bigger volume)', words: ['water', 'sea', 'ocean', 'lake', 'pool', 'swim', 'underwater', 'sunken', 'beach', 'yacht', 'boat', 'river'] },
  { id: 'sky', name: 'sky and air', by: 'src/render/view.ts#fog', says: 'a sky colour and fog; no sun that moves, no clouds yet', words: ['sky', 'clouds', 'misty', 'mist', 'fog', 'night', 'sunset', 'dawn', 'sun'] },
  { id: 'sound', name: 'sound', by: 'src/audio/audio.ts#AudioEngine', says: 'sounds of what happens in the world; no music or ambience of a place yet', words: ['sound', 'music', 'hear', 'whispering', 'noise', 'waves', 'ambient', 'piano', 'note', 'notes'] },
  { id: 'voice', name: 'her voice and yours', by: 'src/assistant/voice.ts#Voice', says: 'she listens and speaks', words: ['talk', 'speak', 'say', 'voice', 'negotiate', 'accent', 'conversation'] },
  { id: 'modes', name: 'walking, flying, your own room', by: 'src/xr/room.ts#RoomScanner', says: 'walk your real room, fly, or mix the world into your room (passthrough)', words: ['walk', 'fly', 'my room', 'mixed reality', 'passthrough', 'pilot', 'cockpit'] },
  { id: 'bench', name: 'a world within the world', by: 'src/app/bench.ts#Bench', says: 'a second physics world beside this one, as her test bench is', words: ['sim-within-a-sim', 'second world', 'within a sim', 'test stand', 'bench'] },
  { id: 'memory', name: 'what she knows about you', by: 'src/assistant/life.ts#Life', says: 'your notes, reminders, money and goals; not your childhood', words: ['remember', 'memory', 'memories', 'my', 'childhood', 'journal', 'goal'] },
  // ----------------------------------------------------------------------------------------------- making things
  { id: 'shapes', name: 'any shape', by: 'src/forms/form.ts#parseForm', says: 'any shape as a tree of primitives, sections, blends and lattices, with exact mass and what can make it', words: ['shape', 'sculpt', 'crystal', 'stone', 'statue', 'geometry', 'form'] },
  { id: 'invent', name: 'parts grown by their loads', by: 'src/forms/say.ts#invent', says: 'a part\'s shape grown for the loads it carries, as bone grows', words: ['invent', 'bracket', 'beam', 'part'] },
  { id: 'machines', name: 'machines grown from what they must do', by: 'src/ganglia/grow.ts#grow', says: 'a whole machine from one flow into another, every part real or said why not', words: ['machine', 'build', 'robot', 'engine', 'vehicle', 'drone', 'elevator', 'gear', 'gears', 'train', 'traffic', 'yacht', 'boat'] },
  { id: 'blueprints', name: 'blueprints for anything asked', by: 'src/ganglia/frontier.ts#explore', says: 'the want under the words, the laws that bound it, the nearest real thing and the path to make it', words: ['blueprint', 'invention', 'how to make', 'how would', 'design'] },
  { id: 'laws', name: 'the laws, with their scales', by: 'src/ganglia/scales.ts#scaleCheck', says: 'every law with where it holds and what it is the limit of', words: ['law', 'physics of', 'how does', 'explain', 'theory'] },
  { id: 'discover', name: 'finding a law herself', by: 'src/ganglia/discover.ts#discover', says: 'from units and measurements in her own world, not from what she was told', words: ['discover', 'find out', 'experiment', 'measure', 'scientist'] },
  { id: 'stress', name: 'what each part carries', by: 'src/forms/topopt.ts#growShape', says: 'stress and deflection in parts and members, worked out; not yet painted on what you look at', words: ['stress', 'structural', 'load', 'strength'] },
  { id: 'draw', name: 'drawing in the air', by: 'src/sketch/interpret.ts#interpret', says: 'strokes you draw read as shapes and built', words: ['draw', 'sketch', 'paint', 'canvas', 'writing'] },
  // ----------------------------------------------------------------------------------------------- not built yet
  { id: 'terrain', name: 'ground of any kind', by: 'src/world/place.ts#heightfield', says: 'beaches, islands, lakeshores, desert dunes, meadows and mountainsides grown as real ground, with their sea or lake and sky; not caves, cliffs or the sea floor yet', words: ['beach', 'desert', 'forest', 'cavern', 'cave', 'mountain', 'mountains', 'island', 'islands', 'dunes', 'wasteland', 'terrain', 'ground', 'garden', 'hollow', 'meadow', 'hills', 'lake'] },
  { id: 'plants', name: 'plants', by: null, says: 'trees, mushrooms, vines, cacti, grass', words: ['forest', 'mushrooms', 'vines', 'plant', 'plants', 'tree', 'trees', 'cacti', 'cactus', 'garden', 'coral', 'jungle'] },
  { id: 'weather', name: 'weather', by: null, says: 'wind, rain, snow, storms that act on things as well as look like them', words: ['weather', 'rain', 'storm', 'snow', 'snowstorm', 'tornado', 'wind', 'winter'] },
  { id: 'buildings', name: 'buildings and cities', by: null, says: 'houses, markets, temples, cities raised from their structure', words: ['city', 'village', 'market', 'bazaar', 'temple', 'temples', 'ruins', 'kingdom', 'metropolis', 'stalls', 'buildings', 'tracks', 'cities'] },
  { id: 'creatures', name: 'creatures with bodies', by: null, says: 'animals with bodies that move by real muscles and gaits, eat, flee and hunt', words: ['creature', 'animal', 'deer', 'whale', 'jellyfish', 'ray', 'predator', 'leviathan', 'fish', 'dog', 'cat', 'bird', 'golem', 'schools of'] },
  { id: 'characters', name: 'characters with minds', by: null, says: 'people and beings that speak, remember, have families and histories, and act on them', words: ['merchant', 'merchants', 'citizen', 'citizens', 'people', 'villagers', 'civilization', 'civilizations', 'society', 'societies', 'family', 'families', 'personified', 'living', 'negotiate', 'friendly'] },
  { id: 'avatar', name: 'a body to wear', by: null, says: 'you as another body: its size, its senses, how it moves', words: ['be a', 'as a', 'me as', 'become', 'turn me into'] },
  { id: 'lessons', name: 'lessons that check what you do', by: null, says: 'steps that show, wait for you to do it, check it was done and say how', words: ['tutorial', 'teach', 'lesson', 'train me', 'training', 'learn', 'practice', 'course', 'guide', 'master', 'skill'] },
  { id: 'ghost', name: 'movement shown ahead of you', by: null, says: 'a master\'s movement recorded and played as a ghost of your own limbs for you to match', words: ['dance', 'combat', 'limbs', 'motor-learning'] },
  { id: 'overlay', name: 'seeing what is hidden', by: null, says: 'labels, colours and lines laid over what you look at: stresses, materials, edible or toxic, tracks', words: ['highlight', 'highlighting', 'aura', 'auras', 'label', 'labeling', 'vision', 'overlay', 'trails', 'see', 'visualizer', 'color-coded'] },
  { id: 'molecules', name: 'atoms and bonds', by: null, says: 'atoms you can hold and bring together, bonding by their real chemistry', words: ['atom', 'atoms', 'molecule', 'molecules', 'chemistry', 'bonds', 'chemical'] },
  { id: 'games', name: 'games and their futures', by: null, says: 'rules of a game and the moves ahead, searched and shown', words: ['chess', 'moves', 'strategy', 'game', 'opponent'] },
  { id: 'economy', name: 'an economy', by: null, says: 'people trading and working under rules you set, and how they fare', words: ['economy', 'economics', 'tax', 'taxes', 'resource', 'resources', 'country'] },
  { id: 'cosmos', name: 'stars and orbits', by: null, says: 'star systems and orbits by gravity, at any scale', words: ['star', 'stars', 'galactic', 'nebulae', 'planet', 'asteroid', 'orbital', 'space-faring'] },
  { id: 'languages', name: 'other languages', by: null, says: 'speech and text in other languages, both ways', words: ['language', 'foreign', 'translator', 'translate'] },
  { id: 'mood', name: 'a mood of light and sound', by: null, says: 'light, music and weather set to a feeling', words: ['chill', 'relax', 'relaxing', 'peaceful', 'calm', 'cozy', 'vibe', 'mood', 'emotional', 'tone'] },
];

const KIND_SIGNS: [Kind, RegExp][] = [
  ['become', /\b(be an?|become an?|turn me into)\b|\bme\b.*\bas an?\b/],
  ['be somewhere', /\b(on an?|in an?|at an?|take me|put me|spawn me|to an?)\b.*\b(beach|sea|island|forest|desert|city|village|garden|cave|cavern|space|sky|mountain|yacht|ruins)\b|\b(spawner|spawns|generates|creates an?|drops an?)\b/],
  ['populate', /\b(populate|populated|filled with|full of|inhabited|hundreds of|thousands of|schools of|ecosystem|civili[sz]ations?|citizens|merchants|villagers|inhabitants)\b/],
  ['learn', /\b(tutorial|teach|lesson|learn|training|train me|practice|show me how|guide|immersion|correct(ing)? (your|my))\b/],
  ['make', /\b(make|build|invent|design|create a machine|blueprint|how (do|would) (i|you) (make|build))\b/],
  ['change the rules', /\b(gravity|zero-gravity|weightless|physics (engine )?(is )?(intentionally )?broken|slow(ing)? (down )?time|time (slows|stops)|freezes the)\b/],
  ['see the hidden', /\b(highlight|aura|labels?|labeling|vision|overlay|see the|visuali[sz])\b/],
  ['feel', /\b(chill|relax|peaceful|calm|cozy|mood|vibe|emotional|soothing)\b/],
];

export interface Understanding {
  said: string;
  kinds: Kind[];
  needs: { cap: Capability; has: boolean }[];
  acts: Act[];
  /** What she does now, and what the rest becomes when built. */
  says: string;
  /** The capabilities to build next, by how many wants call for them. */
  toBuild: string[];
}

/** What a place is made of: a beach is sand, sea, sky and the sound of waves, whichever words it was asked in. */
const PLACES: Record<string, string[]> = {
  beach: ['terrain', 'water', 'sky', 'sound'], island: ['terrain', 'water', 'sky'], sea: ['water', 'sky'], ocean: ['water', 'sky'], lake: ['water', 'terrain', 'sky'],
  forest: ['terrain', 'plants', 'sky', 'sound'], jungle: ['terrain', 'plants', 'creatures', 'sound'], garden: ['terrain', 'plants', 'sky'], desert: ['terrain', 'sky'],
  cavern: ['terrain'], cave: ['terrain'], mountain: ['terrain', 'sky'], city: ['buildings', 'characters', 'sound'], village: ['buildings', 'characters', 'terrain'],
  market: ['buildings', 'characters', 'sound'], bazaar: ['buildings', 'characters', 'sound'], kingdom: ['buildings', 'characters', 'terrain'], ruins: ['buildings', 'terrain'],
  space: ['cosmos'], reef: ['water', 'creatures'], yacht: ['water', 'machines'],
};

/** Words that mean something else in a phrase: a family tree is no tree, a beach ball no beach, a physics engine no machine. */
const NOT_SO: [RegExp, string][] = [
  [/\bfamily trees?\b/g, 'genealogy'], [/\btrees? of\b/g, 'branching'], [/\bbeach balls?\b/g, 'large spheres'], [/\bphysics engine\b/g, 'physics'],
  [/\bmuscle[- ]memory\b/g, 'motor-learning'], [/\bin real time\b/g, 'live'], [/\bliving room\b/g, 'lounge'], [/\bfloating text\b/g, 'labels'],
];

const tokens = (t: string) => t.toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').split(/\s+/).filter(Boolean).flatMap((w) => (w.includes('-') ? [w, ...w.split('-')] : [w]));
const said = (words: Set<string>, w: string) => words.has(w) || words.has(`${w}s`) || words.has(`${w}es`) || (w.endsWith('y') && words.has(`${w.slice(0, -1)}ies`));

/** What a want is made of here, what she can do about it now, and what she builds next. */
export function understand(asked: string): Understanding {
  let t = asked.toLowerCase();
  for (const [re, as] of NOT_SO) t = t.replace(re, as);
  const words = new Set(tokens(t));
  const kinds = KIND_SIGNS.filter(([, re]) => re.test(t)).map(([k]) => k);
  const ids = new Set<string>();
  for (const c of CAPABILITIES) if (c.words.some((w) => (w.includes(' ') ? t.includes(w) : said(words, w)))) ids.add(c.id);
  for (const [place, caps] of Object.entries(PLACES)) if (said(words, place)) for (const id of caps) ids.add(id);
  const needs = CAPABILITIES.filter((c) => ids.has(c.id)).map((c) => ({ cap: c, has: c.by !== null }));
  if (!kinds.length) kinds.push(needs.some((n) => ['machines', 'blueprints', 'shapes', 'invent'].includes(n.cap.id)) ? 'make' : 'be somewhere');
  // what she can do about it now: only what is asked of the world or of you, not what describes something in it
  const acts: Act[] = [];
  if (/\b(zero[- ]gravity|weightless|no gravity|in space|deep[- ]space|orbital mechanics)\b/.test(t)) acts.push({ command: 'gravity zero' });
  else if (/\b(on the moon|moon gravity)\b/.test(t)) acts.push({ command: 'gravity moon' });
  if (/\b(slow(ing|s)? (down )?time|slow motion|time slows)\b/.test(t)) acts.push({ timeScale: 0.25 });
  if (/\b(magnifying glass|shrink me|make me (tiny|small)|me (tiny|small))\b/.test(t)) acts.push({ playerScale: 0.1 });
  else if (/\b(make me (giant|huge|big)|grow me)\b/.test(t)) acts.push({ playerScale: 10 });
  // a place to be in, where it is ground she can grow (not under the ground, the sea or in the sky)
  const going = kinds.includes('be somewhere') || kinds.includes('populate') || kinds.includes('feel');
  if (/\b(back to (the )?workshop|take me home|leave this place)\b/.test(t)) acts.push({ place: null });
  else if (going && !/\b(cavern|cave|subterranean|underground|underwater|sunken|outer space|clouds|airborne)\b/.test(t)) {
    const p = placeFromWords(t);
    if (p) acts.push({ place: t });
  }
  const has = needs.filter((n) => n.has), lack = needs.filter((n) => !n.has);
  const actSays = acts.map((a) => ('command' in a ? (a.command === 'gravity zero' ? 'turned gravity off' : a.command === 'gravity moon' ? 'set the Moon\'s gravity' : 'set Earth\'s gravity')
    : 'timeScale' in a ? `slowed time to ×${a.timeScale}` : 'playerScale' in a ? `made you ×${a.playerScale} your size`
      : a.place === null ? 'taken you back to the workshop' : `taken you to ${placeFromWords(a.place)!.name}`));
  // a world with other rules is still a world with rules: its constants can change, its consistency can't
  const broken = /physics[^.]*\bbroken\b|\bbroken physics\b/.test(t);
  const parts = [
    `You want to ${kinds.join(', and to ')}.`,
    actSays.length ? `I've ${actSays.join(' and ')}.` : '',
    broken ? 'A world whose physics is broken would let nothing be trusted, so I give it other constants instead (gravity now; more of them later): strange, but still a world things work in.' : '',
    has.length ? `I have ${has.map((n) => n.cap.name).join(', ')}.` : '',
    lack.length ? `Still to build for it: ${lack.map((n) => `${n.cap.name} (${n.cap.says})`).join('; ')}.` : 'Everything it takes is here.',
  ].filter(Boolean);
  return { said: asked, kinds, needs, acts, says: parts.join(' '), toBuild: lack.map((n) => n.cap.id) };
}

/** Over many wants: which capabilities they call for that aren't built, most called first (what to build next). */
export function nextToBuild(wants: string[]): { id: string; name: string; calls: number }[] {
  const n = new Map<string, number>();
  for (const w of wants) for (const id of understand(w).toBuild) n.set(id, (n.get(id) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([id, calls]) => ({ id, name: CAPABILITIES.find((c) => c.id === id)!.name, calls }));
}

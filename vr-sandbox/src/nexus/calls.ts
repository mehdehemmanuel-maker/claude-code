// Every call a pipeline step can make, sorted by what it is for: what starts a pipeline, values and calculations,
// matters, shapes and surfaces, where things go, how they are turned and flipped, how big they are and how they
// stretch, patterns and scatters, joining into one piece, rules and conditions, what can be read between things,
// energy, what the room does, and asking. Each call is written as it is said, ready to press and change; every one
// runs offline (asking Claude is the one that needs Claude, and nothing else waits on it).

import type { StepKind } from './flows';

export interface Call { label: string; text: string; says: string }
export interface CallGroup { id: string; name: string; short: string; kind: StepKind; says: string; calls: Call[] }
const c = (label: string, text: string, says: string): Call => ({ label, text, says });

export const CALLS: CallGroup[] = [
  { id: 'start', name: 'Start it', short: 'Start', kind: 'trigger', says: 'what starts a pipeline: press it, or arm it and let this start it', calls: [
    c('When I press run', 'when I press run', '▶ Run starts it'),
    c('When a build finishes', 'when a build finishes', 'any build, made or made again'),
    c('When a flaw is found', 'when a flaw is found', 'a build finished with a flaw left'),
    c('When a note is added', 'when a note is added', 'you mark something'),
    c('When a shape is made', 'when a shape is made', 'a pipeline or you made or changed a shape'),
    c('When the forge opens', 'when the forge opens', 'every time it starts'),
    c('Every 30 seconds', 'every 30 seconds', 'a timer, in seconds, minutes or hours'),
    c('Every 10 minutes', 'every 10 minutes', 'a timer'),
    c('When I say a phrase', 'when I say go', 'heard in what you say or type'),
    c('When a condition turns true', 'when load over 500 N', 'checked all the time; starts it the moment it holds'),
  ] },
  { id: 'values', name: 'Values & calculation', short: 'Values', kind: 'action', says: 'numbers the pipeline keeps, worked out as written, with units', calls: [
    c('Set a value', 'set load = 200 N', 'kept by name; everything made from it follows it'),
    c('Calculate', 'calc load * 0.3 m', 'worked out and said; kept as ans'),
    c('Work it out =', 'B x D =', 'an expression and = says what it comes to'),
    c('A percentage', 'calc B * D% =', 'D% is D / 100'),
    c('Degrees', 'calc 32º + 22 =', 'º or deg, rad'),
    c('If, then, else value', 'set t = if load > 500 N then 6 mm else 4 mm', 'a value that a condition chooses'),
    c('Random value', 'set w = random(20 mm, 80 mm)', 'drawn from the seed'),
    c('Random whole number', 'set n = randint(2, 9)', 'drawn from the seed'),
    c('Seed', 'seed 42', 'the same seed makes the same random things'),
  ] },
  { id: 'matter', name: 'Matter', short: 'Matter', kind: 'action', says: 'what things are made of, from the kept data with its sources', calls: [
    c('Aluminium', 'material aluminium', '6061-T6'), c('Steel', 'material steel', 'A36'), c('Stainless', 'material stainless', '304'),
    c('Brass', 'material brass', 'C360'), c('Copper', 'material copper', 'C110'), c('Titanium', 'material titanium', 'Ti-6Al-4V'),
    c('Wood', 'material wood', 'birch plywood'), c('Acrylic', 'material acrylic', 'PMMA'), c('Nylon', 'material nylon', 'printed, carbon filled'),
    c('Carbon fibre', 'material carbon fibre', 'quasi-isotropic laminate'), c('Concrete', 'material concrete', 'C30'), c('Rubber', 'material rubber', 'natural'),
    c('Pick one at random', 'material one of steel, aluminium, brass, wood', 'drawn from the seed'),
    c('By a condition', 'if load > 500 N then material steel else material aluminium', 'the condition chooses'),
  ] },
  { id: 'shapes', name: 'Shapes', short: 'Shapes', kind: 'action', says: 'solids placed in the room, sized by what they sit on unless sized', calls: [
    c('Plate on a part', 'place plate named cap on bearing', 'covers it, sits on it'),
    c('Box', 'place box named b at 0, 0.5 m, 0 size 100 x 60 x 40 mm', 'width × depth × height'),
    c('Cube', 'place cube named k size 50 mm', 'one size'), c('Wall', 'place wall named w size 1000 x 100 x 2000 mm', 'a thin tall box'),
    c('Cylinder', 'place cylinder named c size 40 x 60 mm', 'diameter × height'), c('Shaft through a part', 'place shaft named axle through bearing', 'takes its bore, along its axis'),
    c('Rod', 'place rod named r size 10 x 200 mm along x', 'along x, y or z'), c('Disc', 'place disc named d size 100 x 8 mm', 'a short cylinder'),
    c('Tube', 'place tube named t size 30 x 60 x 3 mm', 'diameter × length × wall'), c('Ball', 'place ball named o size 40 mm', 'a sphere'),
    c('Cone', 'place cone named n size 40 x 50 mm', 'diameter × height'), c('Ring', 'place ring named g size 50 x 6 mm', 'a torus: across × tube'),
    c('Title', 'place title "6204" above bearing', 'words, sized to what they name'), c('Random shape', 'place one of box, ball, cone, cylinder, ring named s', 'drawn from the seed'),
  ] },
  { id: 'surfaces', name: 'Surfaces', short: 'Surfaces', kind: 'action', says: 'areas with no thickness', calls: [
    c('Plane', 'surface plane named deck at 0, 0, 0 size 1 m x 1 m', 'width × depth'), c('Plane on a part', 'surface plane named top on cap', 'its top face'),
    c('Circle', 'surface circle named spot size 200 mm', 'diameter'),
  ] },
  { id: 'place', name: 'Where it goes', short: 'Place', kind: 'action', says: 'every place a thing can be put: by coordinates, by a thing, by an offset', calls: [
    c('At coordinates', 'move s to 0, 0.4 m, 0.2 m', 'x, y (up), z, in metres or with units'),
    c('On', 'move s on bearing', 'on its top'), c('Under', 'move s under bearing', 'under its bottom'),
    c('Above', 'move s above bearing by 50 mm', 'over it, with a gap'), c('Below', 'move s below bearing by 50 mm', 'beneath it, with a gap'),
    c('Left of', 'move s left of bearing', 'its −x side'), c('Right of', 'move s right of bearing by 10 mm', 'its +x side'),
    c('In front of', 'move s in front of bearing', 'its +z side'), c('Behind', 'move s behind bearing', 'its −z side'),
    c('Through', 'move s through bearing', 'its middle on the thing\'s middle'), c('From, by an offset', 'move s from bearing by 10 mm, 20 mm, 0', 'dx, dy, dz from its middle'),
    c('Joined to', 'place plate named p on cap joined to cap', 'placed, and one piece with it'),
  ] },
  { id: 'turn', name: 'Turn & flip', short: 'Turn & flip', kind: 'action', says: 'turned any angle about x, y and z; flipped or mirrored across any axis', calls: [
    c('Turn about an axis', 'rotate s 45 about y', 'degrees, added to how it is turned'), c('Turn to angles', 'rotate s to x 0 y 90 z 30', 'set how it is turned'),
    c('Turn about x, y, z', 'rotate s x 30 y 45 z 0', 'added to how it is turned'), c('Turn at random', 'rotate s randomly', 'any way, from the seed'),
    c('Turn about one at random', 'rotate s y randomly', 'from the seed'), c('Turn while placing', 'place bar named b size 200 x 20 x 20 mm turned z 30', 'turned as it is placed'),
    c('Flip across x', 'flip s x', 'its place mirrored through the middle of the room'), c('Flip through a thing', 'flip s z through bearing', 'mirrored through its middle'),
    c('Mirror a copy', 'mirror s x named s2', 'a copy on the other side, following its sizes'),
  ] },
  { id: 'size', name: 'Size & stretch', short: 'Size', kind: 'action', says: 'how big: said, worked from a law, or stretched along x, y, z', calls: [
    c('Size by a law', 'size cap.h so 3 * load * cap.w / (2 * cap.d * cap.h^2) <= cap.yield / 2', 'the least size for which it holds, kept and solved again'),
    c('Size a value by a law', 'size t so t^2 > 50 mm * 2 mm', 'the least value for which it holds'),
    c('Size between', 'size axle.D so 16 * torque / (pi * axle.D^3) <= axle.yield / 3 between 5 mm and 50 mm', 'searched only there'),
    c('Set a size', 'cap.h = 3 mm', 'one of its sizes, kept as said'), c('Size from another', 'b.w = cap.w * 2', 'follows the other'),
    c('Expand along x', 'expand s x by 20 mm', 'by a length'), c('Shrink along y', 'shrink s y by 50%', 'by a percentage'),
    c('Stretch to a length', 'stretch s z to 300 mm', 'to a length'), c('Grow every way', 'grow s by 2', 'by a factor, evenly'),
  ] },
  { id: 'many', name: 'Patterns & scatter', short: 'Patterns', kind: 'action', says: 'one thing, many times, by a rule or at random', calls: [
    c('Along a line', 'pattern s 6 along x 30 mm', 'n of it at a pitch'), c('Round an axis', 'pattern s 6 round bearing', 'n of it round its axis'),
    c('Scatter on a thing', 'scatter s 12 on base', 'at random over its top, none overlapping'), c('Scatter, turned', 'scatter s 12 on base turned randomly', 'each turned at random about y'),
  ] },
  { id: 'join', name: 'Join into one', short: 'Join', kind: 'action', says: 'shapes made one piece: moved, turned, flipped and stretched as one, where they meet counted once', calls: [
    c('Join', 'join wall1 and wall2 as walls', 'one piece'), c('Join several', 'join a, b, c as frame', 'one piece'),
    c('Move the piece', 'move walls by 0, 0, 1 m', 'all of it'), c('Turn the piece', 'rotate walls 90 about y', 'about its middle'),
    c('Stretch the piece', 'expand walls y by 2', 'about its middle'), c('Split it', 'split walls', 'apart again'),
  ] },
  { id: 'rules', name: 'Rules & conditions', short: 'Rules', kind: 'check', says: 'what must hold: a check lets the pipeline on only where it holds; a rule undoes a step that breaks it', calls: [
    c('If, then, else', 'if load > 500 N then material steel else material aluminium', 'a step chosen by a condition'),
    c('No overlap', 'rule no overlap', 'nothing made may go into anything else made'), c('No overlap with the build', 'rule no overlap with the build', 'nor into the build'),
    c('Clearance', 'rule clearance 5 mm', 'at least this between things'), c('A rule of any kind', 'rule cap.mass under 50 g', 'kept, or the step is undone'),
    c('Check a number', 'cap.mass under 50 g', 'as a Check: on only where it holds'), c('Check the flaws', 'no flaws', 'as a Check'),
    c('Check both', 'load over 100 N and cap.h at most 4 mm', 'and, or, not'), c('Repeat until', 'until flaws = 0, at most 3 times', 'as a Repeat: round again'),
  ] },
  { id: 'reads', name: 'Read between things', short: 'Reads', kind: 'check', says: 'what can be read of a thing, and between two: for conditions, rules and sizes', calls: [
    c('Gap', 'gap(cap, bearing) at least 1 mm', 'the space between them'), c('Distance', 'dist(cap, bearing) under 0.2 m', 'between their middles'),
    c('Overlap', 'overlap(a, b) = 0', '1 where they overlap'), c('Inside', 'inside(c, a)', '1 where one is wholly in the other'), c('Touches', 'touches(cap, bearing)', '1 where they meet with no gap'),
    c('Its top', 'cap.top under 1 m', 'top, bottom, left, right, front, back, x, y, z'), c('Its size', 'cap.w at least 40 mm', 'w, h, d, D, r, t, wall, length'),
    c('Its mass', 'cap.mass under 50 g', 'mass, volume, area'), c('Its matter', 'cap.yield over 200 MPa', 'density, yield, E, c'),
    c('All made', 'made.mass under 5 kg', 'made (how many), made.mass'),
  ] },
  { id: 'energy', name: 'Energy', short: 'Energy', kind: 'action', says: 'what it takes, by its law', calls: [
    c('Lift', 'energy lift cap 1 m', 'E = m g h'), c('Heat', 'energy heat cap 30 K', 'Q = m c ΔT'),
    c('Spin', 'energy spin axle 3000 rpm', 'E = ½ I ω²'), c('Move', 'energy move cap 2 m/s', 'E = ½ m v²'),
  ] },
  { id: 'room', name: 'The room', short: 'Room', kind: 'action', says: 'what Nexus does with the build standing here', calls: [
    c('Make a build', 'make a cart that carries 150 kg', 'designed and built in front of you'), c('Build again with a change', 'again make it lighter', 'designed again'),
    c('Operate it', 'operate', 'run through its duty'), c('List its flaws', 'flaws', 'what is wrong'), c('Show a panel', 'show flaws', 'put away on the strip while a pipeline runs'),
    c('Note it', 'note flaw: {input}', 'kept with the build, for Claude Code'), c('Say it', 'say {input}', 'said in the room'), c('A board of the build', 'board', 'its parts as a board'),
    c('Wait', 'wait 5 s', 'Stop cuts it short'), c('Report what is made', 'report', 'every shape and piece'), c('Remove one', 'remove s', 'or a piece'), c('Clear all', 'clear', 'everything made'),
  ] },
  { id: 'ask', name: 'Ask Claude (optional)', short: 'Ask', kind: 'ai', says: 'the one call that needs Claude; nothing else waits on it, and where Claude cannot be reached it says so', calls: [
    c('How to fix it', 'Say, in one sentence, the one change to the ask that fixes the worst of these: {input}', 'from the flaws'),
    c('Say it plainly', 'Say this plainly, in one sentence: {input}', 'from what came to it'),
  ] },
];
/** Every call, with its group, for a search. */
export const ALL_CALLS = CALLS.flatMap((g) => g.calls.map((x) => ({ ...x, group: g.id, kind: g.kind })));

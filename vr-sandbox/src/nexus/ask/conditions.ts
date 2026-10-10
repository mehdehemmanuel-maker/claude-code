// The conditions an ask sets, read from what it says, not from what it calls the thing. Whatever it is named (a clamp-on
// bracket, a calf carrier, a boom arm, a walkway, an arm for a lamp), a thing that holds something up is three things:
// the loads it must carry and where they are; what holds it (a post or a tube it clamps to, a wall or a deck it bolts to,
// two banks or two towers it rests across, the ground it sits on, a trunk it grips); and how far it reaches between them
// (out, up, across). With those, and the limits said (how much it may sag, how long its pieces may be, what it may
// weigh, the wind it must stand), the frame is grown, and none of it needs a word for the thing.
//
// Each condition keeps the words it was read from, so what it was grown for can be said back. Where a condition is not
// said, it is taken, and said as taken (an estimate).

import { findQuantities, sameDim, DIMS } from '../../ganglia/units';

const G = 9.80665;
type V3 = [number, number, number];

/** What holds it. A line is a post, a pole, a tube or a trunk it clamps round (along y standing, along x lying); a face
 *  is a wall, a deck's front or a vehicle's guard it bolts to; ends are two banks or towers it rests across; the ground
 *  is what it sits on; above is what it hangs from. */
export interface Hold { kind: 'line' | 'face' | 'ends' | 'ground' | 'above'; along?: 'x' | 'y'; dia?: number; said: string; /** it only pushes up on it (it rests there) */ rests: boolean; /** its feet are cast or bolted into footings, which hold them every way (not by friction) */ footings?: boolean }
export interface Load { N: number; said: string; /** it pushes sideways (a head, a lean, the wind on a face), not down */ side?: boolean; /** how high it pushes, m, where it is a face the wind is on */ at?: number; /** hung along it, N on each metre, where it is said every so far ("25 lb every 10 ft") */ perM?: number; /** people, counted by how many */ who?: boolean }
/** A roof over a floor: its plan, the width down its middle no post may stand in, what lies on it (snow, or what a roof
 *  is made to bear), what hangs along it, and the headroom under it. */
export interface Cover { L: number; W: number; said: string; /** clear of posts, m, across its middle */ clear: number; clearSaid: string; /** what lies on it, Pa */ p: number; pSaid: string; /** headroom kept under it, m */ head: number; headSaid: string }
export interface Conditions {
  loads: Load[]; /** where its load lies spread over a top, how big that top is, m */ area?: [number, number]; /** how much harder than its weight a load comes on, where it is said to (a jump, a hard stop, a kick) */ dyn: number; dynSaid?: string;
  hold: Hold; /** how far out from what holds it the load is */ out?: number; /** how high */ up?: number; /** across between its ends */ span?: number; /** how far below what holds it the load hangs */ drop?: number;
  wind?: number; /** the most its load may move, m */ sagMax?: number; /** the longest a piece may be, m */ pieceMax?: number; /** the most it may weigh in all, and each piece, kg */ massMax?: number; partMax?: number;
  matter?: string; heard: string[]; /** a roof over a floor */ cover?: Cover; /** the highest it may stand, m */ upMax?: number;
}

/** The words before a quantity said, and after it (after its number and its unit). */
const word = (t: string, at: number, said: string, back: number, ahead: number) => { const b = t.slice(0, at).toLowerCase().split(/[^a-z0-9.'-]+/).filter(Boolean).slice(-back), a = t.slice(at + said.length).toLowerCase().split(/[^a-z0-9.'-]+/).filter(Boolean).slice(0, ahead); return { b, a }; };
const LIMIT_BEFORE = /^(under|below|max|maximum|less|lighter|most|than|<|within|no|not|exceed|over)$/;

/** The conditions of a thing that must hold something up, or null where what it says is not that (no load, or nothing
 *  that holds it, or nothing between them). */
export function readConditions(text: string): Conditions | null {
  const t = text.replace(/’/g, "'"), lo = t.toLowerCase(), qs = findQuantities(t), heard: string[] = [];
  const loads: Load[] = []; let massMax: number | undefined, partMax: number | undefined, sagMax: number | undefined, pieceMax: number | undefined, wind: number | undefined;
  let out: number | undefined, up: number | undefined, span: number | undefined, drop: number | undefined, dia: number | undefined, called = false, upMax: number | undefined;
  for (const q of qs) {
    const { b, a } = word(t, q.at, q.text, 5, 6), near = (re: RegExp, k = 3) => b.slice(-k).some((x) => re.test(x)), next = (re: RegExp, k = 3) => a.slice(0, k).some((x) => re.test(x));
    const isMass = sameDim(q.dim, DIMS.mass), isForce = sameDim(q.dim, DIMS.force), isLen = sameDim(q.dim, DIMS.length), isSpeed = sameDim(q.dim, DIMS.speed);
    if (isMass || isForce) {
      const N = isMass ? q.si * G : q.si;
      // "each bracket under 6 kg", "no heavier than 9 kg", "under 120 lb so I can pull it off": a limit on itself
      if (near(LIMIT_BEFORE, 3) && !near(/^(holds?|carry|carries|takes?|lift|lifts|hauls?)$/, 4)) {
        if (lo.slice(Math.max(0, q.at - 90), q.at).match(/\b(pieces?|parts?|sections?|modules?)\b/) && !/\b(whole|all in|in all)\b/.test(lo.slice(Math.max(0, q.at - 30), q.at))) { partMax = q.si / (isMass ? 1 : G); heard.push(`${q.text}: the most a piece of it may weigh`); }
        else { massMax = q.si / (isMass ? 1 : G); heard.push(`${q.text}: the most it may weigh`); }
        continue;
      }
      // "the loader lifts maybe 3000 lb", "a trailer that hauls about 1000 lb": what moves it bears that much, so a limit on it
      const before = lo.slice(Math.max(0, q.at - 70), q.at);
      if (/\b(loader|forks?|trailer|atv|truck|crane|hoist|tractor|winch)\b/.test(before) && /\b(lifts?|hauls?|carries|carry|takes?|pulls?|tows?)\b[^,.;]*$/.test(before)) { massMax = Math.min(massMax ?? Infinity, q.si / (isMass ? 1 : G)); heard.push(`${q.text}: what moves it bears that much, so the most it may weigh`); continue; }
      // "a mad 1400 lb cow will hit it with her head", "cattle leaning on it": a push sideways, about half its weight (estimate)
      const pushing = /^[^,.;]{0,50}?\b(hit|hits|ram|rams|butt|butts|shove|shoves|push|pushes|lean|leans|leaning|rub|rubs|rubbing|charge|charges)\b/.test(lo.slice(q.at + q.text.length, q.at + q.text.length + 60)) && !/^\s*each\b/.test(lo.slice(q.at + q.text.length));
      if (pushing) { loads.push({ N: N * 0.5, said: `${q.text} pushing on it sideways, about half its weight (estimate)`, side: true }); continue; }
      // "so call it 120 kg", "figure 1200 lb in all": what it carries in all, said
      if (/\b(call it|figure|in all|total|altogether|all up)\b/.test(lo.slice(Math.max(0, q.at - 16), q.at + q.text.length + 12))) { loads.splice(0, loads.length, { N, said: `${q.text}, said as what it carries in all` }); called = true; continue; }
      if (called) continue;
      // "lights hung off the beams at up to 25 lb every 10 ft": hung along it, so much on each metre
      const every = /^\s*(?:each\s+)?every\s+(\d+(?:\.\d+)?)\s*(m|metres?|meters?|ft|feet|foot)\b/.exec(lo.slice(q.at + q.text.length, q.at + q.text.length + 30));
      if (every) { const s0 = Number(every[1]) * (/^f/.test(every[2]!) ? 0.3048 : 1); loads.push({ N: 0, perM: N / s0, said: `${q.text} every ${every[1]} ${every[2]}, hung along it` }); continue; }
      // "split over 4 brackets": its share
      const split = /split (?:over|between|across) (\d+)/.exec(lo.slice(q.at, q.at + 60));
      const each = /\beach\b/.test(lo.slice(q.at, q.at + 30)) ? Number(/(\d+|two|three|four)\s+(?:\w+\s+){0,3}(?:ops|operators|people|persons|adults|crew|riders)\b/.exec(lo.slice(Math.max(0, q.at - 80), q.at))?.[1]?.replace('two', '2').replace('three', '3').replace('four', '4') ?? 1) : 1;
      const share = split ? Number(split[1]) : 1;
      loads.push({ N: (N * each) / share, said: `${q.text}${each > 1 ? ` each, ${each} of them` : ''}${share > 1 ? `, split over ${share}` : ''}` });
      continue;
    }
    if (isSpeed && (near(/^(gusts?|winds?|to|of|in)$/, 3) || next(/^(gusts?|winds?)$/, 2)) && /\b(gust|wind)/.test(lo)) { wind = q.si; heard.push(`${q.text}: the wind it must stand`); continue; }
    if (!isLen) continue;
    // "tip can't bounce more than 10mm", "can't droop more than 0.5 mm", "must not move more than 5 microns"
    if (near(/^(bounce|droop|sag|deflect|move|flex|drop|bend)$/, 4) && near(/^(than|over|beyond)$/, 2)) { sagMax = q.si; heard.push(`${q.text}: the most what it holds may move`); continue; }
    // "roof ridge no higher than 28 ft", "no taller than 3 m": the highest it may stand
    if (near(/^(higher|taller)$/, 2) && near(/^than$/, 1)) { upMax = q.si; heard.push(`${q.text}: the highest it may stand`); continue; }
    // "pieces under 2.5 m long", "no longer than 1.5 m", "a road case under 1.3 m long", "fits a 60 cm pack"
    if ((near(/^(pieces?|parts?|sections?)$/, 6) || near(/^(case|bag|van|box|trunk|tube)$/, 4) || next(/^(long|length)$/, 1) && near(/^(under|than|within|max)$/, 2)) && near(/^(under|than|within|max|maximum|no|fit|fits|into)$/, 4)) { pieceMax = q.si; heard.push(`${q.text}: the longest a piece of it may be`); continue; }
    // its reach: "sticks out 2.5m", "3-4 ft ahead", "150 mm sideways", "swings out about 2 m"
    if (next(/^(out|sideways|ahead|outward|outwards|forward)$/, 2) || next(/^clear$/, 1) && !/^(span|of|height|headroom)$/.test(a[1] ?? '') || near(/^(out|sideways)$/, 2)) { out = Math.max(out ?? 0, q.si); heard.push(`${q.text} out: how far it holds its load from what holds it`); continue; }
    // across: "4.5m apart", "gap is 60 mm", "30 ft bank to bank", "a 4 m gap"
    if (next(/^(apart|gap|across|span|between)$/, 2) && /\b(apart|gap|bank|span|across|between|bridge|creek|stream)\b/.test(lo) || next(/^(wide)$/, 1) && /^(gap|creek|stream|river|ditch|opening|lead|leads|channel)$/.test(a[1] ?? '') || near(/^(gap|span)$/, 3) || next(/^(bank)$/, 1)) { if (span === undefined || q.si > span) span = q.si; heard.push(`${q.text} across: what it spans`); continue; }
    // the post or tube it clamps to: "32 mm round post", "50mm tube", "1.5 inch frame clamps", "30 in diameter trunk"
    if (next(/^(round|diameter|dia|od|post|tube|pipe|pole|trunk|frame|chord)$/, 2) && /\b(clamp|clamps|clamping|post|tube|pipe|pole|trunk|chord)\b/.test(lo)) { dia = q.si; heard.push(`${q.text}: the post or tube it clamps round`); continue; }
    // how high: "6m tall", "at 3m height", "7 ft off the ground", "lift them 1 m up"
    if (next(/^(height)$/, 2) && next(/^(difference|drop|change)$/, 3)) { heard.push(`${q.text} of height between its ends: taken level (not weighed)`); continue; }
    if (next(/^(off)$/, 1) && next(/^(wall|walls)$/, 3)) { heard.push(`${q.text} off the wall: how far it may stand out folded (not weighed)`); continue; }
    if (next(/^(tall|high|height|up|above|off)$/, 2) || near(/^(at|height)$/, 1) && next(/^(height)$/, 1)) { up = Math.max(up ?? 0, q.si); heard.push(`${q.text}: how high`); continue; }
  }
  // people said by how many: an adult about 80 kg, a child about 35 kg (estimates)
  const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10 };
  for (const m of lo.matchAll(/\b(\d+|one|two|three|four|five|six|eight|ten)\s+(?:\w+\s+){0,2}?(adults?|people|persons?|kids|children|ops|operators|crew|dancers?|climbers?)\b/g)) {
    const n = Number(m[1]) || NUM[m[1]!] || 0, kid = /kid|child/.test(m[2]!); if (!n || called) continue;
    // "2 crew build it", "two porters can carry it", "2 people put it up": who makes it or carries it, not what it holds
    if (/^\s*(can|could|will|to|build|builds|put|puts|set|sets|assemble|assembles|carry|carries|haul|hauls|install|installs|erect|erects|raise|raises|working|with|need|needs)\b/.test(lo.slice(m.index! + m[0].length, m.index! + m[0].length + 14)) || /\bcrew\b/.test(m[2]!)) continue;
    // a person whose weight is said alongside is counted by it
    if (loads.some((l) => Math.abs(m.index! - lo.indexOf(l.said.split(' ')[0]!.toLowerCase())) < 25)) continue;
    loads.push({ N: n * (kid ? 35 : 80) * G, said: `${m[0]} (${kid ? '35' : '80'} kg each, estimate)`, who: true });
  }
  // a face it carries that the wind pushes on: "holds a 1.5m wide x 5m tall mesh banner", "each one 24 ft long and 10 ft
  // tall, about 80 percent solid": ½ ρ v² by a drag of 1.2 (a flat face, estimate) by how solid it is (a mesh about half)
  const faceM = /\b(banners?|signs?|panels?|screens?|mesh|tarps?|sails?|windbreaks?|boards?|billboards?|walls?)\b/.exec(lo);
  const dimsM = /(\d+(?:\.\d+)?)\s*(m|ft|feet|foot)\s*(?:wide|long)\s*(?:x|by|and)\s*(\d+(?:\.\d+)?)\s*(m|ft|feet|foot)\s*(?:tall|high)/.exec(lo);
  if (faceM && dimsM && wind !== undefined) {
    const u = (v: string, un: string) => Number(v) * (/^f/.test(un) ? 0.3048 : 1), w = u(dimsM[1]!, dimsM[2]!), h = u(dimsM[3]!, dimsM[4]!);
    const solid = /(\d+)\s*(?:percent|%)\s*solid/.exec(lo), k = solid ? Number(solid[1]) / 100 : /\bmesh\b/.test(lo) ? 0.5 : 1, q = 0.5 * 1.204 * wind * wind;
    loads.push({ N: q * 1.2 * k * w * h, said: `the wind on its ${w.toFixed(2)} × ${h.toFixed(2)} m ${faceM[1]} (${k < 1 ? `${Math.round(k * 100)}% solid, ` : ''}½ ρ v² by a drag of 1.2, estimate)`, side: true, at: Math.max(0, (up ?? h) - h / 2) });
    if (up === undefined) up = h;
  }
  // a roof over a floor: the plan said ("100 ft by 50 ft footprint") of what covers (a roof, a canopy, a pavilion, a
  // shelter, a carport). What it bears is what lies on its roof and what hangs from it; who is under it stands on the
  // floor, not on it
  const roofy = /\b(roofs?|roofed|canop(?:y|ies)|pavilions?|shelters?|carports?|awnings?|gazebos?|pergolas?|lean-tos?|shade structures?|covered)\b/.test(lo);
  const fp = /(\d+(?:\.\d+)?)\s*(m|ft|feet|foot|')?\s*(?:x|by|×)\s*(\d+(?:\.\d+)?)\s*(m|ft|feet|foot|')(?![a-z])[^.;,]{0,24}?\b(footprint|plan|area|roof|covered|cover|floor|pavilion|canopy|shelter|carport)\b/.exec(lo);
  let cover: Cover | undefined;
  if (roofy && fp) {
    const u = (v: string, un?: string) => Number(v) * (/^(f|')/.test(un ?? '') ? 0.3048 : 1), a1 = u(fp[1]!, fp[2] ?? fp[4]), a2 = u(fp[3]!, fp[4]), L = Math.max(a1, a2), W = Math.min(a1, a2);
    const crowd = loads.filter((l) => l.who).reduce((x, l) => x + l.N / (80 * G), 0), open = /\b(open[- ]?(?:sided|air)|unheated|carports?|canop(?:y|ies)|awnings?|pergolas?|gazebos?|pavilions?)\b/.test(lo);
    // snow on the ground said, as it lies on a roof: 0.7 Ce Ct Is pg (ASCE 7-16 eq. 7.3-1), Ce 1.0 (estimate), Ct 1.2 open
    // to the air (Table 7.3-2), Is 1.1 sheltering more than 300 (IBC 1604.5, risk category III; ASCE 7-16 Table 1.5-2);
    // no less than 20 Is psf on a low roof where pg is over 20 psf, else pg Is (7.3.4)
    let p = 0, pSaid = '';
    for (const q of qs) if (sameDim(q.dim, DIMS.pressure)) {
      const around = lo.slice(Math.max(0, q.at - 25), q.at + q.text.length + 25);
      if (/\bsnow\b/.test(around)) {
        if (/\bground\b/.test(around)) { const Is = crowd > 300 ? 1.1 : 1, Ct = open ? 1.2 : 1, v = Math.max(0.7 * Ct * Is * q.si, q.si > 957.6 ? 957.6 * Is : q.si * Is); if (v > p) { p = v; pSaid = `${q.text} of snow on the ground lies ${+(v / 1000).toPrecision(3)} kPa on its roof: 0.7 Ce Ct Is pg (ASCE 7-16 eq. 7.3-1), Ce 1.0 (estimate), Ct ${Ct}${open ? ', open to the air' : ''} (Table 7.3-2), Is ${Is}${Is > 1 ? `, as it shelters ${Math.round(crowd)}, more than 300 (IBC 1604.5, risk category III)` : ''} (Table 1.5-2)`; } }
        else if (q.si > p) { p = q.si; pSaid = `${q.text} of snow on its roof, as said`; }
      } else if (/\b(live|roof)\b/.test(around) && q.si > p) { p = q.si; pSaid = `${q.text} on its roof, as said`; }
    }
    // what a roof is made to bear when no snow is more: 20 psf (ASCE 7-16 Table 4.3-1, an ordinary roof), not with snow at once
    if (p < 957.6) { pSaid = `${pSaid ? `${pSaid}; ` : ''}0.958 kPa, what an ordinary roof is made to bear (20 psf, ASCE 7-16 Table 4.3-1)${p ? ', more than that' : ''}`; p = 957.6; }
    // a clear span said is the width down its middle no post stands in; else posts only at its long edges (estimate)
    const clear = span !== undefined ? Math.min(span, W) : W, clearSaid = span !== undefined ? `${+(span / 0.3048).toPrecision(3)} ft clear across its middle, as said: no post in it` : `its floor clear of posts across its ${+W.toPrecision(3)} m width, posts only at its long edges (estimate)`;
    if (span !== undefined) { const k = heard.findIndex((h) => /across: what it spans$/.test(h)); if (k >= 0) heard[k] = heard[k]!.replace('across: what it spans', 'clear across its middle, no post in it'); span = undefined; }
    if (upMax !== undefined) up = upMax; else if (up === undefined) { up = 3; heard.push('3 m high (estimate)'); }
    // a roof reaches out from nothing: what was read as a reach is its plan
    if (out !== undefined) { const k = heard.findIndex((h) => / out: how far it holds its load from what holds it$/.test(h)); if (k >= 0) heard.splice(k, 1); out = undefined; }
    const head = Math.min(2.4, 0.6 * up), headSaid = head < 2.4 ? `${+head.toPrecision(3)} m of headroom under it, six tenths of its height (estimate)` : '2.4 m of headroom under it (estimate; IBC 1208.2 asks 7 ft 6 in, 2.29 m, of a ceiling)';
    for (let i = loads.length - 1; i >= 0; i--) if (loads[i]!.who) { heard.push(`${loads[i]!.said}: under it, on the floor, not on it`); loads.splice(i, 1); }
    loads.push({ N: p * L * W, said: `${pSaid}, over its ${+L.toPrecision(3)} × ${+W.toPrecision(3)} m plan` });
    cover = { L, W, said: `${fp[0].replace(/\s*\b(footprint|plan|area|roof|covered|cover|floor|pavilion|canopy|shelter|carport)$/, '')}, its plan`, clear, clearSaid, p, pSaid, head, headSaid };
  } else
  // a pressure on what it covers: "45 lb/sq ft ground snow", "40 psf", "1.5 kPa": over the area said
  for (const q of qs) if (sameDim(q.dim, DIMS.pressure) && /\b(snow|load|live|roof|crowd|wind)\b/.test(lo.slice(q.at, q.at + 40))) { heard.push(`${q.text}: a load over what it covers (with the area it covers, below)`); }
  if (!loads.some((l) => !l.side) && !loads.some((l) => l.side)) return null;
  if (!loads.length) return null;
  // how hard it comes on: a jump, a landing, a hard stop, a kick, a blow: twice its weight (estimate)
  const dynM = /\b(jumping|jumps?|landing|bounc\w*|kick(?!s? in)\w*|stop hard|stops hard|snatch\w*|hit it|hits it|impact|pitches|waves)\b/.exec(lo);
  // what holds it
  let hold: Hold | null = null;
  const clamp = /\b(clamps?|clamp-on|clamping|grips?|straps?)\b[^.;]{0,100}?\b(posts?|poles?|tubes?|pipes?|chords?|truss|trusses|rails?|frames?|legs?|bars?|trunks?|oaks?|trees?|masts?)\b/.exec(lo);
  const face = /\b(bolts?|bolted|screws?|screwed|fixes|fixed|mounts?|mounted|attaches|attached|fastens?)\b[^.,;]{0,50}?\b(walls?|front|side|face|deck|guard|brush guard|frame|bumper|bed|tailgate)\b/.exec(lo) ?? /\b(walls?|wall-mounted)\b/.exec(lo);
  if (cover) hold = { kind: 'ground', said: /\b(footings?|piers?|anchor bolts?|cast in|bolted down)\b/.test(lo) ? 'footings in the ground it stands on' : 'the ground it stands on, on footings', rests: true, footings: true };
  else if (span !== undefined) hold = { kind: 'ends', said: `its two ends, ${/tower/.test(lo) ? 'on the towers' : /bank|rock|creek|stream/.test(lo) ? 'on the banks' : 'at each side of the gap'}`, rests: true };
  else if (clamp) { const w = clamp[2]!, standing = /post|pole|trunk|oak|tree|leg|mast/.test(w); hold = { kind: 'line', along: standing ? 'y' : 'x', ...(dia !== undefined ? { dia } : {}), said: `the ${w.replace(/s$/, '')} it clamps to${dia !== undefined ? `, ${+(dia * 1000).toPrecision(3)} mm across` : ''}`, rests: false }; }
  else if (face) hold = { kind: 'face', said: `the ${face[2] ?? face[1]} it is fixed to`, rests: false };
  else if (/\b(hang|hangs|hanging|hung)\s+(off|from|under|below)\b/.test(lo)) hold = { kind: 'above', said: 'what it hangs from', rests: false };
  else if (/\b(freestanding|free-standing|sits? on|stands? on|on (the )?(grass|ground|gravel|rocks?|floor|sand|ice|snow|slab|concrete))\b/.test(lo)) hold = { kind: 'ground', said: 'the ground it stands on', rests: true };
  if (!hold) return null;
  // hanging below what holds it: as far below as said, or 300 mm (estimate)
  if (hold.kind === 'above' || /\b(hang|hangs|hanging)\b/.test(lo) && hold.kind === 'line' && hold.along === 'x' && out === undefined) { drop = drop ?? 0.3; heard.push('hanging 300 mm below what holds it (estimate)'); }
  // a seat or a shelf on a wall with no depth said: 450 mm out (EN 1335: a seat 400 to 510 mm deep)
  if (hold.kind === 'face' && out === undefined && /\b(bench|seat|seats|shelf|shelves|ledge)\b/.test(lo)) { out = 0.45; heard.push('450 mm out from the wall, a seat\'s depth (EN 1335, estimate)'); }
  // something between them: a reach, a span or a height; what it clamps to or is fixed to wants a reach or a drop
  if (out === undefined && span === undefined && up === undefined && drop === undefined) return null;
  if ((hold.kind === 'line' || hold.kind === 'face') && out === undefined && drop === undefined) return null;
  // a matter said of what it is made of, not of what it is fixed to ("a steel stage deck" is the deck's)
  const OTHER = /^\s+(stage|deck|decks|truss|shop|building|roof|truck|tank|wall|shed|barn|guard|post|pole|ranger|trailer|chassis|frame of)\b/;
  const matOf = (re: RegExp) => { for (const m of lo.matchAll(new RegExp(re.source, 'g'))) if (!OTHER.test(lo.slice(m.index! + m[0].length, m.index! + m[0].length + 12))) return true; return false; };
  const mat = matOf(/\b(aluminium|aluminum)\b/) ? 'aluminum.6061-t6' : matOf(/\bstainless\b/) ? 'stainless.304' : matOf(/\b(steel|square tube|drill stem|oilfield pipe)\b/) ? 'steel.a36' : matOf(/\b(timber|wood|wooden|fir|glulam)\b/) ? 'wood.douglas-fir' : matOf(/\bcarbon\b/) ? 'composite.cfrp' : undefined;
  // hung along it, where it is not a roof: along as far as it reaches (estimate)
  if (!cover) for (const l of loads) if (l.perM) { const along = Math.max(span ?? 0, out ?? 0, up ?? 0, drop ?? 0); l.N = l.perM * along; l.said += `, over the ${+along.toPrecision(3)} m it reaches (estimate)`; }
  const c: Conditions = { loads, dyn: dynM ? 2 : 1, hold, heard, ...(cover ? { cover } : {}), ...(upMax !== undefined ? { upMax } : {}) };
  if (dynM) c.dynSaid = dynM[0];
  if (out !== undefined) c.out = out; if (up !== undefined) c.up = up; if (span !== undefined) c.span = span; if (drop !== undefined) c.drop = drop;
  if (wind !== undefined) c.wind = wind; if (sagMax !== undefined) c.sagMax = sagMax; if (pieceMax !== undefined) c.pieceMax = pieceMax;
  if (massMax !== undefined) c.massMax = massMax; if (partMax !== undefined) c.partMax = partMax; if (mat) c.matter = mat;
  return c;
}

/** The room a frame for these conditions may take, what in it is held, and where its loads are, about a point at its
 *  foot: for what it clamps to or is fixed to, a room reaching out to its load, as tall and as wide as half that again
 *  either side (estimate), its held joints those on the post, the tube or the face; across a span, from end to end,
 *  as deep as an eighth of it; on the ground, as high as said and as wide as a third of that. */
export function roomOf(c: Conditions, at: V3 = [0, 0, 0]): { lo: V3; hi: V3; held: (p: V3) => boolean; load: V3; heldSay: string; /** points on what holds it, so the ground has joints there */ anchors?: V3[] } {
  const [X, Y, Z] = at, e = 1e-9;
  if (c.hold.kind === 'ends') {
    const L = c.span!, dep = Math.max(0.3, L / 8, Math.min(0.05, L / 4)), W = Math.max(0.05, Math.min(0.6, L / 6)), y0 = Y + (c.up ?? 0);
    return { lo: [X - L / 2, y0, Z - W / 2], hi: [X + L / 2, y0 + dep, Z + W / 2], held: (p) => (Math.abs(p[0] - (X - L / 2)) < e || Math.abs(p[0] - (X + L / 2)) < e) && Math.abs(p[1] - y0) < e, load: [X, y0, Z], heldSay: c.hold.said };
  }
  if (c.hold.kind === 'ground') {
    const H = c.up!, W = Math.max(0.3 * H, 0.3);
    return { lo: [X - W / 2, Y, Z - W / 2], hi: [X + W / 2, Y + H, Z + W / 2], held: (p) => Math.abs(p[1] - Y) < e, load: [X, Y + H, Z], heldSay: c.hold.said };
  }
  // held at a line or a face, reaching out along x to the load, or hanging below it
  const out = c.out ?? 0, drop = c.drop ?? 0, r = c.hold.dia ? c.hold.dia / 2 : 0, reach = Math.max(out, drop, 0.05), half = reach / 2;
  if (c.hold.kind === 'line' && c.hold.along === 'x' && !out) {
    // a tube lying along x it hangs below: held on its underside along a clamp twice as long as the tube is wide, or a tenth of a metre
    const cl = Math.max(0.1, 2 * 2 * r);
    const wz = Math.max(r, 0.02);
    return { lo: [X - Math.max(cl, half), Y - drop, Z - half], hi: [X + Math.max(cl, half), Y, Z + half], held: (p) => Math.abs(p[1] - Y) < e && Math.abs(p[0] - X) <= cl / 2 + e && Math.abs(p[2] - Z) <= wz + e, load: [X, Y - drop, Z], heldSay: c.hold.said, anchors: [[X - cl / 2, Y, Z - wz], [X + cl / 2, Y, Z - wz], [X - cl / 2, Y, Z + wz], [X + cl / 2, Y, Z + wz], [X, Y, Z]] };
  }
  const lying = c.hold.kind === 'line' && c.hold.along === 'x';
  // a post standing: held on its face over a clamp as long as half its reach (or four times its radius), as wide as it is;
  // a tube lying across the reach: held along it so, as tall as it is
  const x0 = X + r, cl = c.hold.kind === 'line' ? (lying ? Math.max(2 * r, 0.02) : Math.max(0.04, 4 * r, half)) : Infinity, w = c.hold.kind === 'line' ? (lying ? Math.max(0.04, 4 * r, half) : Math.max(2 * r, 0.02)) : Infinity;
  const hy = Math.min(cl / 2, half), hz = Math.min(w / 2, half);
  return { lo: [x0, Y - half, Z - half], hi: [x0 + out, Y + half, Z + half], held: (p) => Math.abs(p[0] - x0) < e && Math.abs(p[1] - Y) <= cl / 2 + e && Math.abs(p[2] - Z) <= w / 2 + e, load: [x0 + out, Y, Z], heldSay: c.hold.said, anchors: [[x0, Y - hy, Z - hz], [x0, Y + hy, Z - hz], [x0, Y - hy, Z + hz], [x0, Y + hy, Z + hz], [x0, Y, Z]] };
}

// The three asked intents (src/nexus/ask/asked.ts) as instruments, with the aspects each request names and the evaluator's
// predicates over what the language generated.

export { car, house, printer } from '../../src/nexus/ask/asked';

/**
 * The aspects of each invention the request names, used only to evaluate what the language produced: never given to
 * the attempt. Each aspect is a predicate the evaluation applies to the derived structure.
 */
export const ASPECTS = {
  house: ['structural system', 'foundation', 'framing', 'floors', 'walls', 'windows', 'doors', 'siding', 'roofing', 'insulation', 'waterproofing', 'electrical generation/distribution', 'wiring', 'switches', 'outlets', 'lighting', 'HVAC', 'ventilation', 'thermal transfer', 'plumbing', 'drainage', 'mechanical systems', 'controls', 'safety systems', 'maintenance/access', 'material compatibility', 'manufacturing/construction constraints', 'environmental loads', 'human interaction'],
  car: ['structure', 'power source', 'energy storage', 'energy conversion', 'propulsion', 'transmission', 'steering', 'suspension', 'braking', 'wheels/tires', 'thermal management', 'electrical system', 'sensing', 'control', 'mechanical interfaces', 'safety', 'manufacturing', 'maintenance', 'environmental interaction'],
  printer: ['material feed', 'energy input', 'motion generation', 'positioning', 'structural rigidity', 'thermal systems', 'sensing', 'control', 'extrusion/deposition', 'calibration', 'power distribution', 'geometry', 'tolerances', 'feedback', 'manufacturing constraints', 'failure modes'],
};

/**
 * How the evaluation reads a structure against the aspects the request names: a predicate per aspect over the
 * elements the language generated. Strict: an aspect whose recognition needs what the language does not yet
 * represent (orientation, members, joints, materials, how a thing is made) is not covered by something that only
 * resembles it. These predicates are the evaluator's, never the generator's.
 */
import type { Element, Structure } from '../../src/nexus/substrate/manifold';
type Check = (s: Structure) => boolean;
const has = (s: Structure, f: (e: Element) => boolean) => s.elements.some(f);
const gapFor = (s: Structure, re: RegExp, el?: (id: string) => boolean) => s.gaps.some((g) => re.test(g.lacks) && (!el || (g.element !== null && el(g.element))));
const none: Check = () => false;

export const CHECKS: Record<'house' | 'car' | 'printer', Record<string, Check>> = {
  house: {
    'structural system': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'momentum' && e.regions[e.regions.length - 1] === 'the ground'),
    'foundation': (s) => has(s, (e) => e.kind === 'bound' && e.carrier === 'momentum' && e.regions.includes('the ground')),
    'framing': (s) => ['up', 'side', 'down'].every((f) => has(s, (e) => e.id === `members:inside:${f}` && e.values.some((v) => v.name === 'span'))),
    'floors': (s) => has(s, (e) => e.carrier === 'momentum' && e.values.some((v) => v.name === 'most displacement over span')),
    'walls': (s) => has(s, (e) => e.id === 'boundary:energy:inside|outside air:side') && has(s, (e) => e.id === 'members:inside:side'), 'windows': (s) => has(s, (e) => e.kind === 'boundary' && e.carrier === 'light' && e.regions.includes('inside')),
    'doors': (s) => has(s, (e) => e.id.startsWith('passage:the people|inside')) && has(s, (e) => e.id.startsWith('modulation:passage:')),
    'siding': (s) => has(s, (e) => e.carrier === 'volume of water' && e.id.endsWith(':side') && e.values.some((v) => v.name === 'conductance' && v.value === 0)),
    'roofing': (s) => has(s, (e) => e.carrier === 'volume of water' && e.id.endsWith(':closed:up')) && has(s, (e) => e.id === 'members:inside:up'),
    'insulation': (s) => has(s, (e) => e.kind === 'boundary' && e.carrier === 'energy' && e.regions[0] === 'inside' && e.regions[1] === 'outside air'),
    'waterproofing': (s) => has(s, (e) => e.kind === 'boundary' && e.carrier === 'volume of water' && e.values.some((v) => v.name === 'conductance' && v.value === 0)),
    'electrical generation/distribution': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'charge' && e.regions[0] === 'the grid'),
    'wiring': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'charge' && e.values.some((v) => v.name.startsWith('least conductance'))) && has(s, (e) => e.id.startsWith('return:charge')),
    'switches': (s) => has(s, (e) => e.kind === 'modulation' && (e.carrier === 'charge' || e.carrier === 'light') && /person/.test(e.says)),
    'outlets': (s) => has(s, (e) => e.id === 'use:charge:inside'),
    'lighting': (s) => has(s, (e) => e.kind === 'conversion' && e.carrier === 'light'),
    'HVAC': (s) => has(s, (e) => e.kind === 'conversion' && e.carrier === 'energy' && e.regions[0] === 'inside') && has(s, (e) => e.carrier === 'energy' && (e.id.includes('removal') || (e.kind === 'path' && e.regions[0] === 'inside'))),
    'ventilation': (s) => has(s, (e) => e.kind === 'boundary' && e.carrier === 'amount of carbon dioxide' && e.values.some((v) => v.name.startsWith('least conductance'))),
    'thermal transfer': (s) => has(s, (e) => e.kind === 'boundary' && e.carrier === 'energy'),
    'plumbing': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'volume of water' && e.regions[0] === 'the water main'),
    'drainage': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'volume of water' && e.regions[e.regions.length - 1] === 'the sewer') && !gapFor(s, /nothing drives volume of water/),
    'mechanical systems': (s) => has(s, (e) => e.kind === 'conversion' && (e.carrier === 'momentum' || e.carrier.startsWith('volume of') || e.carrier.startsWith('amount of'))),
    'controls': (s) => has(s, (e) => e.kind === 'observer') && has(s, (e) => e.kind === 'modulation' && /observation/.test(e.says)),
    'safety systems': (s) => has(s, (e) => e.id.startsWith('protection:')),
    'maintenance/access': none, 'material compatibility': none, 'manufacturing/construction constraints': none,
    'environmental loads': (s) => has(s, (e) => e.id.startsWith('load:')),
    'human interaction': (s) => has(s, (e) => e.kind === 'modulation' && /person/.test(e.says)),
  },
  car: {
    'structure': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'momentum' && e.regions.includes('moving:the people')) || has(s, (e) => e.id.startsWith('filter:momentum')),
    'power source': (s) => has(s, (e) => e.id.startsWith('refill:')),
    'energy storage': (s) => has(s, (e) => e.kind === 'store' && e.id.startsWith('store:') && !e.id.includes('smoothing')),
    'energy conversion': (s) => has(s, (e) => e.kind === 'conversion' && e.id.includes('->momentum')),
    'propulsion': (s) => has(s, (e) => e.kind === 'contact') && has(s, (e) => e.kind === 'conversion' && e.id.includes('->momentum')),
    'transmission': none,
    'steering': (s) => has(s, (e) => e.id.endsWith(':direction')) && !gapFor(s, /momentum has a direction/),
    'suspension': (s) => has(s, (e) => e.id.startsWith('filter:momentum')),
    'braking': (s) => has(s, (e) => e.id.startsWith('conversion:momentum') && e.id.endsWith(':removal')),
    'wheels/tires': (s) => has(s, (e) => e.kind === 'contact' && /rolls/.test(e.says)),
    'thermal management': (s) => has(s, (e) => e.id.startsWith('shed:conversion:') && e.regions[1] === 'outside air'),
    'electrical system': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'charge'),
    'sensing': (s) => has(s, (e) => e.kind === 'observer'),
    'control': (s) => has(s, (e) => e.kind === 'modulation'),
    'mechanical interfaces': none,
    'safety': (s) => has(s, (e) => e.id.startsWith('stroke:') && e.values.some((v) => v.name.startsWith('least stroke'))),
    'manufacturing': none, 'maintenance': none,
    'environmental interaction': (s) => has(s, (e) => e.id.startsWith('drag:')) && has(s, (e) => e.carrier === 'volume of water' && e.kind === 'boundary'),
  },
  printer: {
    'material feed': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'volume of PLA' && e.regions[0] === 'a spool of filament'),
    'energy input': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'charge' && e.regions[0] === 'the grid'),
    'motion generation': (s) => has(s, (e) => e.kind === 'conversion' && e.id.includes('->momentum:deposit')),
    'positioning': (s) => has(s, (e) => e.kind === 'observer' && e.values.some((v) => v.name === 'resolution needed' && v.unit === 'm')),
    'structural rigidity': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'momentum' && e.values.some((v) => v.name === 'most displacement')),
    'thermal systems': (s) => has(s, (e) => e.kind === 'conversion' && e.carrier === 'energy' && e.regions.some((r) => r.startsWith('flows:'))) && has(s, (e) => e.kind === 'observer' && e.regions.some((r) => r.startsWith('flows:'))),
    'sensing': (s) => has(s, (e) => e.kind === 'observer'),
    'control': (s) => has(s, (e) => e.kind === 'modulation'),
    'extrusion/deposition': (s) => has(s, (e) => e.kind === 'conversion' && e.carrier === 'volume of PLA') && has(s, (e) => e.id.startsWith('deposit:')),
    'calibration': (s) => has(s, (e) => e.id.startsWith('calibration:') && e.kind === 'observer') && has(s, (e) => e.id.startsWith('compensation:')),
    'power distribution': (s) => has(s, (e) => e.kind === 'path' && e.carrier === 'charge'),
    'geometry': (s) => ['x', 'y', 'z'].every((a) => has(s, (e) => e.id.endsWith(`deposit:the part:${a}`) && e.values.some((v) => v.name === 'travel'))) && has(s, (e) => e.values.some((v) => v.name.startsWith('span it holds'))),
    'tolerances': (s) => has(s, (e) => e.values.some((v) => v.name === 'most position error' || v.name === 'most displacement')),
    'feedback': (s) => has(s, (e) => e.kind === 'modulation' && /observation/.test(e.says)),
    'manufacturing constraints': none,
    'failure modes': (s) => has(s, (e) => e.id.startsWith('protection:')) && has(s, (e) => e.id.startsWith('guard:')),
  },
};

export const covered = (which: keyof typeof CHECKS, s: Structure): string[] => Object.entries(CHECKS[which]).filter(([, f]) => f(s)).map(([k]) => k);

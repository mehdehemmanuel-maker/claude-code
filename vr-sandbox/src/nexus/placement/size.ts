// Picking a catalogue item by its duty (docs/PLACEMENT.md, layer E: size.select). The duty is read from the thing, never
// typed: a starting battery's from its engine (fuel and displacement, as the engine part states them). Every item in the
// catalogue is weighed against the duty; the lightest that meets it is chosen, and what the thing has now is said beside
// it, with its margin. Batteries first; motors, fans, bolts, bearings and pumps are to come (docs/PLACEMENT.md, step 7).

import type { Part } from '../kits';
import { BCI_GROUPS, type BciGroup } from '../../data/batteries';

/** Cold-cranking amps a starting battery should give per cubic inch of engine: about 1 for petrol, 2 for diesel (a rule of
 *  thumb used across battery makers' fitting guides: typical, not a maker's figure for any one engine). */
export const CCA_PER_CUIN = { petrol: 1, diesel: 2 } as const;
const CC_PER_CUIN = 16.387064;

export interface Duty { fuel: 'petrol' | 'diesel'; cc: number; engines: number; cca: number; why: string; source: string }
export interface Option { group: string; cca: number; kg: number; Ah: number; margin: number; meets: boolean; fits: string }
export interface Selection { duty: Duty; /** batteries sharing it, and the CCA each must give */ count: number; need: number; options: Option[]; chosen: Option; has: Option | null; says: string }

/** The starting duty, read from the engine parts in a thing (named like "petrol engine (1987 cc, …)"). */
export function batteryDuty(root: Part): Duty {
  const es: { fuel: 'petrol' | 'diesel'; cc: number }[] = [];
  const walk = (p: Part) => { const m = /^(petrol|diesel) engine \((\d+(?:\.\d+)?) cc/i.exec(p.name); if (m) { es.push({ fuel: m[1]!.toLowerCase() as 'petrol' | 'diesel', cc: Number(m[2]) }); return; } (p.parts ?? []).forEach(walk); };
  walk(root);
  if (!es.length) throw new Error(`${root.name} has no engine that states its fuel and displacement ("petrol engine (1987 cc, …)")`);
  const e = es.reduce((a, b) => (CCA_PER_CUIN[b.fuel] * b.cc > CCA_PER_CUIN[a.fuel] * a.cc ? b : a)), cuin = e.cc / CC_PER_CUIN, cca = Math.ceil(CCA_PER_CUIN[e.fuel] * cuin);
  return { fuel: e.fuel, cc: e.cc, engines: es.length, cca, why: `a ${e.cc} cc ${e.fuel} engine is ${cuin.toFixed(0)} cubic inches, at ${CCA_PER_CUIN[e.fuel]} CCA per cubic inch`, source: 'CCA_PER_CUIN: about 1 per cubic inch for petrol, 2 for diesel (a rule of thumb from battery makers\' fitting guides: typical)' };
}

/** The groups a thing carries now, read from its batteries' names ("…, BCI group 35", "(group 31)"). */
export function groupsIn(root: Part): string[] {
  const out: string[] = []; const walk = (p: Part) => { if (p.item === 'battery-sli') { const m = /group (\w+)/i.exec(p.name); if (m) out.push(m[1]!); return; } (p.parts ?? []).forEach(walk); }; walk(root); return out;
}

/** Every BCI group weighed against the duty, shared among `count` batteries wired in parallel (default: as many as it
 *  has); the lightest that meets it chosen. The rule of thumb is a floor: cold starts, the electrical load with the engine
 *  off and reserve, which makers add margin for, are not weighed here. */
export function selectBattery(root: Part, count?: number): Selection {
  count = Math.max(1, count ?? groupsIn(root).length);
  const duty = batteryDuty(root), need = duty.cca / count;
  const opt = (g: BciGroup): Option => ({ group: g.group, cca: g.cca, kg: g.kg, Ah: g.Ah, margin: g.cca / need - 1, meets: g.cca >= need, fits: g.fits });
  const options = Object.values(BCI_GROUPS).map(opt).sort((a, b) => a.kg - b.kg || b.cca - a.cca), meets = options.filter((o) => o.meets);
  if (!meets.length) throw new Error(`no BCI group gives ${Math.ceil(need)} CCA (the most is ${Math.max(...options.map((o) => o.cca))}): wire more in parallel`);
  const chosen = meets[0]!, g0 = groupsIn(root)[0], has = g0 && BCI_GROUPS[g0] ? opt(BCI_GROUPS[g0]!) : null;
  const says = `${duty.why}: ${Math.ceil(need)} CCA${count > 1 ? ` each of ${count}` : ''}. The lightest that meets it: group ${chosen.group} (${chosen.cca} CCA, ${chosen.kg} kg, ${Math.round(chosen.margin * 100)} % over)` +
    (has ? `; it has group ${has.group} (${has.cca} CCA, ${has.kg} kg, ${Math.round(has.margin * 100)} % over${has.group === chosen.group ? ', the same' : `, ${has.kg - chosen.kg > 0 ? `${has.kg - chosen.kg} kg heavier` : `${chosen.kg - has.kg} kg lighter`}`}: ${has.fits})` : '') + (chosen.margin > 4 ? `. Every group here is a car's: this duty wants a smaller battery (a motorcycle's or a powersports one), which the catalogue does not hold yet` : '') + '. The rule is a floor: cold starts, load with the engine off and reserve, which makers fit more for, are not weighed';
  return { duty, count, need: Math.ceil(need), options, chosen, has, says };
}

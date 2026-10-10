// Make it or buy it, and when a robot is worth having.
//
// Two decisions that are arithmetic and are usually made by feeling: whether your own time is cheaper than the part,
// and whether a job repeats often enough to pay for an arm. Both are here so the answer can be argued with.
//
// Owner of: handling (hands, an arm, an arm on a track, more arms) and make-or-buy.

import { usd as money } from '../prices';
import { stationById, stationUsd } from './stations';

/** How the work gets from station to station. Not an opinion: a rail buys reach at about a fifth of what another arm
 *  costs, so reach is bought with track until two things must happen at once; and a mobile robot docks to ±10 mm where
 *  an arm repeats to ±0.03, so it carries material and never does the work. */
export interface Handling { pick: 'hands' | 'arm' | 'arm on a rail' | 'arms'; usd: number; says: string }
export function handling(o: { span: number; cycles: number; rate?: number; saves?: number }): Handling {
  const rate = o.rate ?? 25, saves = o.saves ?? 20, arm = stationUsd(stationById('arm')), rail = stationUsd(stationById('rail')), reach = 0.85;
  const perDay = (o.cycles * saves) / 3600 * rate, days = perDay > 0 ? Math.ceil(arm / perDay) : Infinity;
  if (days > 500 || o.cycles < 20) return { pick: 'hands', usd: 0,
    says: `${o.cycles} moves a day saving ${saves} s each is ${money(+perDay.toFixed(2))} of time a day, so an arm at ${money(arm)} pays for itself in ${Number.isFinite(days) ? `${days} days` : 'never'}. Under about twenty repeats a day a jig and a pair of hands win, and the jig costs an evening on the printer` };
  if (o.span <= reach) return { pick: 'arm', usd: arm, says: `the work runs ${o.span} m, inside one arm's ${reach} m reach: one arm, bolted down, pays back in ${days} days` };
  const arms = Math.ceil(o.span / reach), track = Math.ceil((o.span - reach) / 3) * 3, railed = arm + rail * (track / 3);
  if (railed < arms * arm) return { pick: 'arm on a rail', usd: railed,
    says: `the work runs ${o.span} m against one arm's ${reach}: ${arms} arms would be ${money(arms * arm)}, one arm on ${track} m of track is ${money(railed)}. Track buys reach at about a fifth of what another arm does, so buy reach with track until two things must happen at the same time` };
  return { pick: 'arms', usd: arms * arm, says: `${o.span} m needs ${arms} arms even with track, because the moves overlap in time` };
}

/** Make it or buy it: what the time costs against what the part costs, and what the waiting costs on top. */
export function worthMaking(o: { usd: number | null; minutes: number; rate?: number; waitDays?: number }): { make: boolean; says: string } {
  const rate = o.rate ?? 25, mine = +((o.minutes / 60) * rate).toFixed(2);
  if (o.usd == null) return { make: true, says: `no one sells it: ${o.minutes} min of your time (${money(mine)}) is the only price it has` };
  if (mine < o.usd) return { make: true, says: `${o.minutes} min at ${money(rate)} an hour is ${money(mine)} against ${money(o.usd)} to buy: make it` };
  const wait = o.waitDays ?? 0, anyway = wait > 3 && mine < o.usd * 3;
  return { make: anyway, says: `${o.minutes} min is ${money(mine)} against ${money(o.usd)} to buy${wait ? `, which arrives in ${wait} days` : ''}: ${anyway ? 'make it anyway, because waiting costs more than the difference' : 'buy it'}` };
}

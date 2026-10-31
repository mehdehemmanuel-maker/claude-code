// The level of detail: how finely things are made and drawn just now, one level every maker and the renderer read.
// (Its own module, depending on nothing, so any module can read it.)

/** How finely things are made and drawn just now: 1 as designed; less, coarser (a surface drawn and sampled with fewer
 *  facets and points, a turned part with fewer sides), for what is far off, small on the screen, or a fit's many trials,
 *  where the fine version costs more than it shows. One level every maker and the renderer read. Set for a while by
 *  `atDetail`; what a coarse level makes is a stand-in of the design, never stored as one (the built-parts library is made
 *  at 1). */
let detailNow = 1;
export const detail = (): number => detailNow;
/** Run f with the detail at d (0.05 to 1), and put it back after. */
export function atDetail<T>(d: number, f: () => T): T { const was = detailNow; detailNow = Math.min(1, Math.max(0.05, d)); try { return f(); } finally { detailNow = was; } }
/** The same for work that waits (a board's run): the level holds across its waits, so run one such at a time. */
export async function atDetailAsync<T>(d: number, f: () => Promise<T>): Promise<T> { const was = detailNow; detailNow = Math.min(1, Math.max(0.05, d)); try { return await f(); } finally { detailNow = was; } }
/** So many divisions at the detail now, never fewer than `least`. */
export const divisions = (n: number, least = 3): number => Math.max(least, Math.round(n * detailNow));

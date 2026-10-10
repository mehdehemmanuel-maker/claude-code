// ISO metric coarse threads, M1.6–M24: the pitch (ISO 261), the socket cap screw's head (ISO 4762: dk across, k high),
// the hex across flats (s) and the nut's height (ISO 4032: m), the plain washer (ISO 7089: d1 × d2 × h). Every
// family and kind of fastener reads its sizes from here.
export const METRIC: Record<string, { p: number; dk: number; k: number; s: number; m: number; d1: number; d2: number; h: number }> = {
  'M1.6': { p: 0.35, dk: 3, k: 1.6, s: 3.2, m: 1.3, d1: 1.7, d2: 4, h: 0.3 },
  M2: { p: 0.4, dk: 3.8, k: 2, s: 4, m: 1.6, d1: 2.2, d2: 5, h: 0.3 }, 'M2.5': { p: 0.45, dk: 4.5, k: 2.5, s: 5, m: 2, d1: 2.7, d2: 6, h: 0.5 },
  M3: { p: 0.5, dk: 5.5, k: 3, s: 5.5, m: 2.4, d1: 3.2, d2: 7, h: 0.5 }, M4: { p: 0.7, dk: 7, k: 4, s: 7, m: 3.2, d1: 4.3, d2: 9, h: 0.8 },
  M5: { p: 0.8, dk: 8.5, k: 5, s: 8, m: 4.7, d1: 5.3, d2: 10, h: 1 }, M6: { p: 1, dk: 10, k: 6, s: 10, m: 5.2, d1: 6.4, d2: 12, h: 1.6 },
  M8: { p: 1.25, dk: 13, k: 8, s: 13, m: 6.8, d1: 8.4, d2: 16, h: 1.6 }, M10: { p: 1.5, dk: 16, k: 10, s: 16, m: 8.4, d1: 10.5, d2: 20, h: 2 },
  M12: { p: 1.75, dk: 18, k: 12, s: 18, m: 10.8, d1: 13, d2: 24, h: 2.5 }, M14: { p: 2, dk: 21, k: 14, s: 21, m: 12.8, d1: 15, d2: 28, h: 2.5 },
  M16: { p: 2, dk: 24, k: 16, s: 24, m: 14.8, d1: 17, d2: 30, h: 3 }, M20: { p: 2.5, dk: 30, k: 20, s: 30, m: 18, d1: 21, d2: 37, h: 3 }, M24: { p: 3, dk: 36, k: 24, s: 36, m: 21.5, d1: 25, d2: 44, h: 4 },
};
/** ISO 7045 pan head screws with a cross recess: the head's diameter dk and height k (their maxima, mm). */
export const PAN: Record<string, { dk: number; k: number }> = {
  'M1.6': { dk: 3.2, k: 1.3 }, M2: { dk: 4, k: 1.6 }, 'M2.5': { dk: 5, k: 2.1 }, M3: { dk: 5.6, k: 2.4 }, M4: { dk: 8, k: 3.1 }, M5: { dk: 9.5, k: 3.7 }, M6: { dk: 12, k: 4.6 }, M8: { dk: 16, k: 6 },
};
/** ISO 7380-1 button head socket screws: the head's diameter dk and height k, its hex key s and the socket's depth t
 *  (mm; dk and k their maxima, t its minimum). */
export const BUTTON: Record<string, { dk: number; k: number; s: number; t: number }> = {
  M3: { dk: 5.7, k: 1.65, s: 2, t: 1.04 }, M4: { dk: 7.6, k: 2.2, s: 2.5, t: 1.3 }, M5: { dk: 9.5, k: 2.75, s: 3, t: 1.56 }, M6: { dk: 10.5, k: 3.3, s: 4, t: 2.08 },
  M8: { dk: 14, k: 4.4, s: 5, t: 2.6 }, M10: { dk: 17.5, k: 5.5, s: 6, t: 3.12 }, M12: { dk: 21, k: 6.6, s: 8, t: 4.16 }, M14: { dk: 24.5, k: 7.7, s: 10, t: 4.68 }, M16: { dk: 28, k: 8.8, s: 10, t: 5.2 },
};
/** ISO 4029 set screws (cup point): the hex key s across flats (mm). */
export const SETSCREW_KEY: Record<string, number> = { 'M1.6': 0.7, M2: 0.9, 'M2.5': 1.3, M3: 1.5, M4: 2, M5: 2.5, M6: 3, M8: 4, M10: 5, M12: 6, M16: 8, M20: 10, M24: 12 };

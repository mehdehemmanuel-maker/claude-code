// The Raspberry Pi 4 Model B's small parts, as its photo shows them: found by tools/measure/photo.py small on its photo
// calibrated by known points (what is neither its mask nor its silkscreen, outside the parts and words its layout
// places, 0.45-4 mm across; rows of chips touching split by their width; each put to the nearest EIA case by its width).
// Made with: small --erode 2 --skip 8.5:19.5:16:22.5 --skip 62:3.5:65.5:7 --skip 23:8.5:26:11 --silk (its ink, from photo.py silk)
// (each skipped region checked by eye against the photo: what was found there was words, a test pad or a hole's rim).
// Generated: re-run the tool and this file is written again. The smallest (0201s in dense clusters, 4 pixels wide in
// a photo of 12.2 px/mm) are at the edge of what the photo resolves, so many are missed; none is placed that the photo
// does not show. Each row: c capacitor, r resistor, t a small transistor package (its package last, SOT-23 or SOT-323 by its
// body's length, its pins by the legs counted), q a small dark no-lead chip (its size as seen), l a moulded inductor,
// p a chip as small as an 0201 whose kind its photo does not show; middle x, z (mm from the lower-left corner); length
// and width (mm); its angle (degrees from +x).
export const PI4_SMALL: ['c' | 'r' | 't' | 'q' | 'l' | 'p', number, number, number, number, number, string?][] = [
  ['p', 29.22, 46.76, 0.60, 0.30, 90], ['c', 47.67, 42.15, 0.60, 0.30, 90], ['c', 2.85, 16.19, 0.60, 0.30, 0], ['c', 4.36, 14.23, 1.00, 0.50, 58], ['c', 2.49, 10.76, 1.00, 0.50, 0], ['c', 20.17, 17.18, 1.00, 0.50, 90],
  ['p', 19.75, 16.06, 0.60, 0.30, 0], ['c', 15.13, 11.95, 1.00, 0.50, 0], ['c', 15.59, 10.91, 2.00, 1.25, 90], ['c', 51.90, 31.26, 1.00, 0.50, 90], ['c', 57.94, 33.45, 1.00, 0.50, 90], ['c', 60.05, 33.58, 1.00, 0.50, 0],
  ['c', 36.91, 9.69, 1.00, 0.50, 0], ['c', 59.07, 11.77, 1.60, 0.80, 90], ['c', 59.17, 9.74, 1.00, 0.50, 90], ['c', 61.01, 10.84, 1.00, 0.50, 90], ['c', 61.02, 8.85, 1.00, 0.50, 90], ['c', 7.86, 16.84, 1.00, 0.50, 90],
  ['t', 8.00, 18.65, 2.90, 1.30, 0, 'SOT-23-6'], ['t', 4.97, 11.02, 2.90, 1.30, 0, 'SOT-23-6'], ['r', 14.66, 10.41, 1.60, 0.80, 90], ['t', 52.40, 20.42, 2.90, 1.30, 0, 'SOT-23'], ['r', 55.78, 17.76, 1.60, 0.80, 141], ['t', 59.51, 13.90, 2.90, 1.30, 90, 'SOT-23-6'],
  ['r', 62.28, 10.92, 1.00, 0.50, 90], ['r', 62.25, 8.83, 1.00, 0.50, 0], ['t', 31.58, 4.48, 2.00, 1.25, 69, 'SOT-323'], ['t', 31.04, 3.25, 2.00, 1.25, 145, 'SOT-323'],
];

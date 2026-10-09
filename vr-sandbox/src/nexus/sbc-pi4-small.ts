// The Raspberry Pi 4 Model B's small parts, as its photo shows them: found by tools/measure/photo.py small on its photo
// calibrated by known points (what is neither its mask nor its silkscreen, outside the parts and words its layout
// places, 0.45-4 mm across; rows of chips touching split by their width; each put to the nearest EIA case by its width).
// Made with: small --erode 2 --skip 8.5:19.5:16:22.5 --skip 62:3.5:65.5:7 --skip 23:8.5:26:11 --skip 2.4:9.0:21.0:19.6 --silk (its ink, from photo.py silk)
// (each skipped region checked by eye against the photo: what was found there was words, a test pad or a hole's rim).
// Generated: re-run the tool and this file is written again. The smallest (0201s in dense clusters, 4 pixels wide in
// a photo of 12.2 px/mm) are at the edge of what the photo resolves, so many are missed; none is placed that the photo
// does not show. Each row: c capacitor, r resistor, t a small transistor package (its package last, SOT-23 or SOT-323 by its
// body's length, its pins by the legs counted), q a small dark no-lead chip (its size as seen), l a moulded inductor,
// p a chip as small as an 0201 whose kind its photo does not show; middle x, z (mm from the lower-left corner); length
// and width (mm); its angle (degrees from +x).
export const PI4_SMALL: ['c' | 'r' | 't' | 'q' | 'l' | 'p', number, number, number, number, number, string?][] = [
  ['p', 29.22, 46.76, 0.60, 0.30, 90], ['p', 35.82, 46.97, 0.60, 0.30, 0], ['c', 47.66, 42.44, 2.00, 1.25, 0], ['c', 49.82, 41.81, 0.60, 0.30, 90], ['c', 51.74, 31.35, 1.60, 0.80, 154], ['c', 57.48, 33.33, 1.60, 0.80, 0],
  ['c', 60.10, 33.31, 1.60, 0.80, 0], ['c', 59.15, 11.83, 2.00, 1.25, 0], ['c', 60.98, 12.42, 0.60, 0.30, 0], ['c', 59.44, 9.60, 2.00, 1.25, 90], ['c', 60.98, 10.54, 1.00, 0.50, 90], ['c', 61.02, 8.85, 1.00, 0.50, 90],
  ['t', 52.40, 20.40, 2.90, 1.30, 0, 'SOT-23'], ['t', 55.63, 17.39, 2.00, 1.25, 68, 'SOT-323-6'], ['r', 57.16, 16.90, 1.00, 0.50, 90], ['t', 59.48, 13.91, 2.90, 1.30, 90, 'SOT-23-6'], ['r', 62.28, 10.92, 1.00, 0.50, 90], ['r', 60.18, 9.24, 0.60, 0.30, 0],
  ['r', 66.88, 3.65, 1.00, 0.50, 90],
];

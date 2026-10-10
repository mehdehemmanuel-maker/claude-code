// The Raspberry Pi 5's small parts, as its photo shows them: found by tools/measure/photo.py small on its photo
// calibrated by known points (what is neither its mask nor its silkscreen, outside the parts and words its layout
// places, 0.45-4 mm across; rows of chips touching split by their width; each put to the nearest EIA case by its width).
// Made with: small --erode 0 --skip 42.5:42.0:58.5:44.4 --skip 43.6:34.8:50.6:41.6 --skip 18.7:35.2:20.4:45.6 --skip 44.2:0.8:46.7:5.6 --skip 17.0:0.8:20.8:2.7 --skip 62.6:44.4:64.2:47.3 --skip 3.6:19.8:5.4:21.6 --skip 4.3:7.6:6.0:9.8 --skip 2.9:40.4:4.4:42.0 --silk (its ink, from photo.py silk)
// (each skipped region checked by eye against the photo: what was found there was words, a test pad or a hole's rim).
// Generated: re-run the tool and this file is written again. The smallest (0201s in dense clusters, 4 pixels wide in
// a photo of 13.9 px/mm) are at the edge of what the photo resolves, so many are missed; none is placed that the photo
// does not show. Each row: c capacitor, r resistor, t a small transistor package (its package last, SOT-23 or SOT-323 by its
// body's length, its pins by the legs counted), q a small dark no-lead chip (its size as seen), l a moulded inductor,
// p a chip as small as an 0201 whose kind its photo does not show; middle x, z (mm from the lower-left corner); length
// and width (mm); its angle (degrees from +x).
export const PI5_SMALL: ['c' | 'r' | 't' | 'q' | 'l' | 'p', number, number, number, number, number, string?][] = [
  ['c', 66.59, 30.32, 0.60, 0.30, 90], ['c', 20.34, 29.57, 0.60, 0.30, 0], ['c', 15.09, 19.34, 0.60, 0.30, 0], ['c', 19.79, 11.86, 1.00, 0.50, 0], ['c', 16.93, 12.22, 1.00, 0.50, 0], ['c', 15.64, 11.77, 1.00, 0.50, 90],
  ['c', 6.99, 11.21, 0.60, 0.30, 0], ['c', 10.17, 9.49, 0.60, 0.30, 90], ['r', 43.63, 15.07, 1.60, 0.80, 0], ['r', 21.96, 19.29, 1.60, 0.80, 90], ['t', 17.04, 10.03, 2.00, 1.25, 151, 'SOT-323-6'], ['p', 66.88, 38.53, 1.00, 0.50, 90],
  ['p', 22.02, 43.11, 1.00, 0.50, 0], ['p', 51.60, 26.02, 1.00, 0.50, 154], ['p', 45.51, 27.30, 1.00, 0.50, 124], ['p', 48.69, 24.38, 1.00, 0.50, 155], ['p', 43.64, 26.70, 1.00, 0.50, 136], ['p', 46.66, 23.57, 1.00, 0.50, 130],
];

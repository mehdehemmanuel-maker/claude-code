// What is marked on the reference photographs (docs/RECONSTRUCT.md): each point a name, where it is in the image (pixels
// from its top left) and who marked it how. Marked by eye are observations, not measurements: the Features node snaps
// each to the strongest edge near it and says how far it moved, and only then is it counted as measured from the image.
// Outline points are named by the region of the thing they lie on, in order round it, so a comparison says where the
// model is wrong (its roof, its tail), not only how much.

export interface Mark { name: string; u: number; v: number }
/** `concept`: a picture made (an AI's, a render, an edit) of how the thing is wanted, not a photograph of it: matched as the
 *  goal, and nothing read off it is a measurement of the thing. */
/** `base`: the record of the thing as its maker published it (its dimensions set beside the model's), where `object` is a
 *  build of it (a car with a kit). */
export interface Photo { id: string; says: string; object: string; base?: string; w: number; h: number; by: string; marks: Mark[]; concept?: boolean; traces?: Trace[] }
/** A feature traced on a picture: its region (a polygon, pixels) or its point, and which of the model's parts it is (a
 *  pattern on their names): so the model's own part, seen from the picture's camera, is set against it, feature by
 *  feature (its windows, its door, its flares, its wing), not only its outline. */
export interface Trace { name: string; parts: string; poly?: [number, number][]; at?: [number, number] }
/** A circle as a polygon (a wheel's rim, seen square on). */
const ring = (u: number, v: number, r: number, n = 24): [number, number][] => Array.from({ length: n }, (_, i) => [u + r * Math.cos((2 * Math.PI * i) / n), v + r * Math.sin((2 * Math.PI * i) / n)] as [number, number]);

const pts = (region: string, s: string): Mark[] => s.trim().split(/\s+/).map((p, i) => { const [u, v] = p.split(',').map(Number); return { name: `outline ${region} ${i + 1}`, u: u!, v: v! }; });

export const PHOTOS: Photo[] = [
  {
    id: 'mc-side', w: 1152, h: 864, object: 'montecarlo04-kit', base: 'monte carlo', concept: true,
    says: 'an AI-generated picture of the user\'s Monte Carlo as they want it built (their goal; the user, 2026-10-29: "that was an ai generated version that is the goal"), not a photograph of the car: side on from its left, the car facing left, in sun',
    by: 'marked by eye by Claude on an edge map of the photograph (2026-10-29): estimates to a few pixels, refined by snapping to edges',
    marks: [
      // its wheels: what the camera is solved from (their places are published: wheelbase, track, tyre size)
      { name: 'front wheel centre', u: 258, v: 596 }, { name: 'front tyre top', u: 258, v: 518 }, { name: 'front tyre bottom', u: 258, v: 676 }, { name: 'front tyre front', u: 172, v: 600 }, { name: 'front tyre back', u: 344, v: 600 },
      { name: 'rear wheel centre', u: 898, v: 606 }, { name: 'rear tyre top', u: 898, v: 528 }, { name: 'rear tyre bottom', u: 898, v: 684 }, { name: 'rear tyre front', u: 816, v: 608 }, { name: 'rear tyre back', u: 980, v: 608 },
      // its outline, round it from the front lip, over the top, down the tail and back under (clockwise as seen)
      ...pts('nose', '78,634 82,580 98,528 106,508'),
      ...pts('hood', '200,482 290,458 380,438'),
      ...pts('windscreen', '440,410 500,388'),
      ...pts('roof', '560,372 640,368 720,376'),
      ...pts('backlight', '800,400 880,426'),
      ...pts('wing', '908,410 1000,410 1092,414 1072,450'),
      ...pts('tail', '1080,456 1092,508 1108,564 1104,616 1092,634'),
      ...pts('rear', '1000,644 980,640'),
      ...pts('rocker', '790,650 600,651 360,652'),
      ...pts('front', '172,640 82,640'),
    ],
    // (its features, traced by eye by Claude on a 20-pixel grid over the picture at twice its size, 2026-10-29: estimates
    // to a few pixels; each set against the model's own part of that name, seen from the fitted camera)
    traces: [
      { name: 'side glass', parts: '^side windows$', poly: [[386, 470], [430, 440], [480, 412], [530, 393], [600, 380], [681, 378], [682, 463], [600, 464], [500, 466]] },
      { name: 'quarter glass', parts: '^rear quarter windows$', poly: [[702, 390], [712, 385], [760, 394], [787, 414], [796, 435], [786, 455], [702, 457]] },
      { name: 'door', parts: '^doors$', poly: [[388, 472], [686, 464], [687, 620], [362, 623], [372, 540]] },
      { name: 'door handle', parts: '^door handle$', at: [645, 507] },
      { name: 'mirror', parts: '^wing mirror$', poly: [[415, 440], [445, 435], [470, 445], [474, 465], [460, 485], [430, 487], [418, 470]] },
      { name: 'fuel door', parts: '^fuel (filler )?door$', poly: [[962, 486], [990, 484], [996, 497], [990, 510], [962, 510]] },
      { name: 'front flare', parts: '^front fender flare', poly: [[167, 580], [180, 545], [205, 520], [235, 508], [260, 505], [290, 508], [318, 520], [338, 543], [347, 577], [334, 575], [325, 548], [305, 532], [280, 526], [260, 526], [238, 529], [215, 537], [195, 552], [178, 580]] },
      { name: 'rear flare', parts: '^rear fender flare', poly: [[812, 580], [830, 540], [860, 515], [900, 506], [940, 512], [975, 535], [992, 570], [982, 572], [960, 540], [930, 527], [900, 525], [865, 532], [840, 550], [825, 580]] },
      // (its intake's insert a frame open at the front, round its vent: its outer edge, then its vent's back)
      { name: 'intake', parts: '^quarter scoop', poly: [[692, 507], [796, 504], [797, 522], [782, 548], [762, 574], [742, 590], [690, 593], [697, 586], [712, 582], [730, 565], [748, 540], [760, 515], [697, 515]] },
      { name: 'intake vent', parts: '^scoop vent', poly: [[697, 515], [760, 515], [748, 540], [730, 565], [712, 582], [697, 586]] },
      { name: 'wing', parts: '^wing (blade|end plate|upright)', poly: [[895, 418], [912, 405], [1000, 401], [1060, 406], [1092, 412], [1088, 422], [1070, 442], [1050, 450], [1020, 452], [1000, 447], [960, 437], [925, 428]] },
      { name: 'side skirt', parts: '^side skirt', poly: [[352, 627], [810, 623], [812, 640], [795, 650], [352, 651]] },
      { name: 'front lip', parts: '^front lip( side (left|right))?$', poly: [[70, 627], [165, 630], [166, 652], [110, 648], [75, 640]] },
      { name: 'rear valance', parts: '^rear valance( side (left|right))?$', poly: [[995, 615], [1098, 594], [1110, 585], [1104, 625], [1085, 638], [995, 628]] },
      { name: 'headlamp', parts: '^headlights$', poly: [[97, 522], [118, 518], [128, 528], [125, 543], [100, 545], [95, 535]] },
      { name: 'tail lamp', parts: '^tail (lamp|lights)$', poly: [[1063, 458], [1072, 458], [1086, 505], [1086, 527], [1078, 527], [1066, 490]] },
      { name: 'front rim', parts: 'alloy rim$|^spoke \\d', poly: ring(254, 604, 63) },
      { name: 'rear rim', parts: 'alloy rim$|^spoke \\d', poly: ring(903, 608, 62) },
    ],
  },
];
export const photoOf = (id: string): Photo | undefined => PHOTOS.find((p) => p.id === id);

// What is marked on the reference photographs (docs/RECONSTRUCT.md): each point a name, where it is in the image (pixels
// from its top left) and who marked it how. Marked by eye are observations, not measurements: the Features node snaps
// each to the strongest edge near it and says how far it moved, and only then is it counted as measured from the image.
// Outline points are named by the region of the thing they lie on, in order round it, so a comparison says where the
// model is wrong (its roof, its tail), not only how much.

export interface Mark { name: string; u: number; v: number }
export interface Photo { id: string; says: string; object: string; w: number; h: number; by: string; marks: Mark[] }

const pts = (region: string, s: string): Mark[] => s.trim().split(/\s+/).map((p, i) => { const [u, v] = p.split(',').map(Number); return { name: `outline ${region} ${i + 1}`, u: u!, v: v! }; });

export const PHOTOS: Photo[] = [
  {
    id: 'mc-side', w: 1152, h: 864, object: 'montecarlo04-kit',
    says: 'the user\'s reference for their Monte Carlo as they want it built: side on from its left, the car facing left, in sun (2026-10-29)',
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
  },
];
export const photoOf = (id: string): Photo | undefined => PHOTOS.find((p) => p.id === id);

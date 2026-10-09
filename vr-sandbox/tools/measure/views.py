#!/usr/bin/env python3
"""Look at one thing in many photos: what a single photo cannot show (a port's face, what is under a lid, a part a
heatsink hides), another photo from another side can.

  sheet  PHOTO... --out sheet.jpg [--h 420]        every photo side by side, numbered, to see what each one shows
  tiles  PHOTO --grid 3x3 --out PREFIX              one photo cut into tiles at full size, to scan it for small things
  zoom   PHOTO --box X0,Y0,X1,Y1 --out out.png      a region (pixels, or fractions 0..1 of the photo) enlarged
  find   PHOTO --box X0,Y0,X1,Y1 OTHER... --out out.png
                                                    a part boxed in one photo found in every other: SIFT features
                                                    matched (Lowe's ratio test), a homography fitted to them by RANSAC,
                                                    the box carried into each photo and cut out, all side by side
                                                    with how many features agreed (under 12: not found, said so)
"""
import argparse, math, os
import numpy as np
import cv2


def read(p):
    im = cv2.imread(p)
    if im is None: raise SystemExit(f'cannot read {p}')
    return im


def box_of(im, s):
    v = [float(t) for t in s.split(',')]
    if all(0 <= t <= 1 for t in v): v = [v[0] * im.shape[1], v[1] * im.shape[0], v[2] * im.shape[1], v[3] * im.shape[0]]
    return [int(round(t)) for t in v]


def label(im, text):
    cv2.rectangle(im, (0, 0), (min(im.shape[1], 12 + 11 * len(text)), 26), (255, 255, 255), -1)
    cv2.putText(im, text, (6, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)
    return im


def row(ims, h):
    ims = [cv2.resize(i, (max(1, int(i.shape[1] * h / i.shape[0])), h)) for i in ims]
    return np.hstack(ims) if ims else np.zeros((h, h, 3), np.uint8)


def cmd_sheet(a):
    ims = [label(cv2.resize(read(p), None, fx=a.h / read(p).shape[0], fy=a.h / read(p).shape[0]), f'{i}: {os.path.basename(p)[:28]}') for i, p in enumerate(a.photos)]
    cv2.imwrite(a.out, np.hstack(ims)); print(a.out, '·', len(ims), 'photos')


def cmd_tiles(a):
    im = read(a.photo); nx, ny = map(int, a.grid.lower().split('x')); H, W = im.shape[:2]
    for j in range(ny):
        for i in range(nx):
            x0, y0, x1, y1 = W * i // nx, H * j // ny, W * (i + 1) // nx, H * (j + 1) // ny
            out = f'{a.out}_{j}{i}.png'; cv2.imwrite(out, label(im[y0:y1, x0:x1].copy(), f'tile {j},{i}: px {x0}..{x1} x {y0}..{y1}')); print(out)


def cmd_zoom(a):
    im = read(a.photo); x0, y0, x1, y1 = box_of(im, a.box); crop = im[y0:y1, x0:x1]
    s = a.scale or max(1.0, 900 / max(1, crop.shape[1]))
    cv2.imwrite(a.out, cv2.resize(crop, None, fx=s, fy=s, interpolation=cv2.INTER_LANCZOS4)); print(a.out, f'×{s:.1f}')


def cmd_find(a):
    src = read(a.photo); x0, y0, x1, y1 = box_of(src, a.box)
    sift = cv2.SIFT_create(nfeatures=6000)
    # (the box's features, from a margin round it so its edges have context; matched only if they lie inside it)
    g = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY); kp, de = sift.detectAndCompute(g, None)
    keep = [i for i, k in enumerate(kp) if x0 <= k.pt[0] <= x1 and y0 <= k.pt[1] <= y1]
    kp = [kp[i] for i in keep]; de = de[keep] if de is not None and keep else None
    tiles = [label(src[y0:y1, x0:x1].copy(), f'boxed in {os.path.basename(a.photo)[:20]}')]
    if de is None or len(kp) < 8: raise SystemExit('too few features in the box: make it larger or pick a busier part')
    flann = cv2.FlannBasedMatcher({'algorithm': 1, 'trees': 5}, {'checks': 64})
    for p in a.others:
        im = read(p); kp2, de2 = sift.detectAndCompute(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), None)
        good = []
        if de2 is not None and len(kp2) > 2:
            for m in flann.knnMatch(de, de2, k=2):
                if len(m) == 2 and m[0].distance < 0.75 * m[1].distance: good.append(m[0])
        Hm, n = None, 0
        if len(good) >= 8:
            A = np.float32([kp[m.queryIdx].pt for m in good]); B = np.float32([kp2[m.trainIdx].pt for m in good])
            Hm, inl = cv2.findHomography(A, B, cv2.RANSAC, 6.0); n = int(inl.sum()) if inl is not None else 0
        name = os.path.basename(p)[:20]
        if Hm is None or n < 12:
            tiles.append(label(np.full((y1 - y0, x1 - x0, 3), 235, np.uint8), f'{name}: not found ({n} agree)')); print(f'{p}: not found ({n} features agree)'); continue
        corners = cv2.perspectiveTransform(np.float32([[[x0, y0]], [[x1, y0]], [[x1, y1]], [[x0, y1]]]), Hm).reshape(-1, 2)
        bx0, by0 = np.maximum(corners.min(axis=0).astype(int) - a.pad, 0); bx1, by1 = np.minimum(corners.max(axis=0).astype(int) + a.pad, [im.shape[1], im.shape[0]])
        cut = im[by0:by1, bx0:bx1].copy(); cv2.polylines(cut, [np.int32(corners - [bx0, by0])], True, (0, 255, 255), 2)
        tiles.append(label(cut, f'{name}: {n} agree')); print(f'{p}: found, {n} features agree, at px {bx0}..{bx1} x {by0}..{by1}')
    cv2.imwrite(a.out, row(tiles, a.h)); print(a.out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('sheet'); p.add_argument('photos', nargs='+'); p.add_argument('--out', required=True); p.add_argument('--h', type=int, default=420); p.set_defaults(f=cmd_sheet)
    p = sp.add_parser('tiles'); p.add_argument('photo'); p.add_argument('--grid', default='3x3'); p.add_argument('--out', required=True); p.set_defaults(f=cmd_tiles)
    p = sp.add_parser('zoom'); p.add_argument('photo'); p.add_argument('--box', required=True); p.add_argument('--scale', type=float); p.add_argument('--out', required=True); p.set_defaults(f=cmd_zoom)
    p = sp.add_parser('find'); p.add_argument('photo'); p.add_argument('--box', required=True); p.add_argument('others', nargs='+'); p.add_argument('--out', required=True); p.add_argument('--h', type=int, default=360); p.add_argument('--pad', type=int, default=40); p.set_defaults(f=cmd_find)
    a = ap.parse_args(); a.f(a)


if __name__ == '__main__':
    main()

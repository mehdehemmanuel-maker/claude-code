#!/usr/bin/env python3
"""Measure a real thing from a photo of it, in millimetres.

A photo is calibrated by four or more points whose places are known in millimetres (a board's mounting holes, from its
maker's drawing): each guessed point is pulled onto the round pad or hole nearest it, and the photo's plane is mapped to
millimetres by the homography through them. Then:

  calibrate  photo.jpg --point PX,PY=X,Z ... [--pad] --out cal.json   (X right, Z up, from the lower-left corner)
  grid       cal.json --region NAME:X0:Z0:X1:Z1 ... --out PREFIX      a crop of each region with its millimetre grid
  at         cal.json PX,PY ...                                       where a pixel is, mm
  px         cal.json X,Z ...                                         where a point in mm is in the photo
  outline    cal.json --mode bright|dark|notblue NAME:X:Z ... [--box=X0:Z0:X1:Z1] [--ground 240]
                                                                      the outline of the part round each point, mm
  overlay    cal.json boardmap.json --out out.png [--side top]        each drawn part's footprint on the photo
  same       CAL... --region X0:Z0:X1:Z1 [--up H] --out out.png       one region of the thing cut from every calibrated
                                                                      photo of it, side by side: the same part from
                                                                      each angle (each photo calibrated by four points
                                                                      of the same plane; --up takes in what stands H mm
                                                                      above it, by the region's box raised that much in
                                                                      each photo's own view of the plane)

What lies on the plane is measured true; a tall part's top leans out from the photo's middle by its height over the
camera's distance, so its footprint is read at its base, or its top's place corrected for it.
"""
import argparse, json, math, sys
import numpy as np
import cv2
from scipy import ndimage


def load(cal):
    c = json.load(open(cal)); c['H'] = np.array(c['H']); c['Hi'] = np.linalg.inv(c['H']); return c


def to_px(c, x, z):
    v = c['H'] @ [x, z, 1.0]; return v[0] / v[2], v[1] / v[2]


def to_mm(c, px, py):
    v = c['Hi'] @ [px, py, 1.0]; return v[0] / v[2], v[1] / v[2]


def blue_mask(im):
    b, g, r = [im[:, :, i].astype(int) for i in range(3)]
    return (b - r > 45) & (b > 110)


def pad_centre(im, px, py, rlo=10, rhi=34):
    """The centre of the round pad or hole nearest a guess: a circle fitted to the edge of what is not the board's mask
    round it (its solder mask's colour taken as the commonest round it), refitted three times inside a narrowing ring."""
    win = 60; x0, y0 = int(px) - win, int(py) - win; sub = im[max(y0, 0):y0 + 2 * win, max(x0, 0):x0 + 2 * win]
    mask = blue_mask(sub)
    if mask.mean() < 0.2:  # not a blue board: the mask is the commonest hue round the guess
        hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV); h = int(np.median(hsv[:, :, 0])); mask = np.abs(hsv[:, :, 0].astype(int) - h) < 12
    edge = mask & ~ndimage.binary_erosion(mask); ey, ex = np.nonzero(edge); ex = ex + max(x0, 0); ey = ey + max(y0, 0)
    cx, cy = float(px), float(py)
    for _ in range(6):
        d = np.hypot(ex - cx, ey - cy); k = (d > rlo) & (d < rhi)
        if k.sum() < 12: break
        X, Y = ex[k].astype(float), ey[k].astype(float)
        sol = np.linalg.lstsq(np.c_[2 * X, 2 * Y, np.ones_like(X)], X ** 2 + Y ** 2, rcond=None)[0]
        cx, cy = sol[0], sol[1]; r = math.sqrt(max(sol[2] + cx * cx + cy * cy, 1)); rlo, rhi = r - 3, r + 3
    return cx, cy


def cmd_calibrate(a):
    im = cv2.imread(a.photo); px, mm = [], []
    for p in a.point:
        l, r = p.split('='); x, y = map(float, l.split(',')); X, Z = map(float, r.split(','))
        if a.pad: x, y = pad_centre(im, x, y)
        px.append([x, y]); mm.append([X, Z])
    H, _ = cv2.findHomography(np.float32(mm), np.float32(px), 0)
    c = {'photo': a.photo, 'H': H.tolist(), 'points': [{'px': p, 'mm': m} for p, m in zip(px, mm)]}
    c2 = dict(c); c2['H'] = np.array(H); c2['Hi'] = np.linalg.inv(H)
    res = [math.hypot(*(np.subtract(to_mm(c2, *p), m))) for p, m in zip(px, mm)]
    c['residual_mm'] = [round(r, 3) for r in res]; c['scale_px_per_mm'] = round(float(np.hypot(*(np.subtract(to_px(c2, 1, 0), to_px(c2, 0, 0))))), 3)
    json.dump(c, open(a.out, 'w'), indent=1)
    for p, m, r in zip(px, mm, res): print('pixel (%.2f, %.2f) is (%.2f, %.2f) mm, off by %.3f mm' % (*p, *m, r))
    print('%.2f px/mm; written %s' % (c['scale_px_per_mm'], a.out))


def cmd_grid(a):
    c = load(a.cal); im = cv2.imread(c['photo']); S = a.scale
    for spec in a.region:
        name, *v = spec.split(':'); x0, z0, x1, z1 = map(float, v)
        pts = [to_px(c, x, z) for x in (x0, x1) for z in (z0, z1)]
        X0, Y0 = max(int(min(p[0] for p in pts)) - 5, 0), max(int(min(p[1] for p in pts)) - 5, 0)
        X1, Y1 = int(max(p[0] for p in pts)) + 5, int(max(p[1] for p in pts)) + 5
        crop = cv2.resize(im[Y0:Y1, X0:X1], None, fx=S, fy=S, interpolation=cv2.INTER_LANCZOS4)
        q = lambda x, z: (int((to_px(c, x, z)[0] - X0) * S), int((to_px(c, x, z)[1] - Y0) * S))
        for x in range(math.ceil(x0), int(x1) + 1):
            major = x % 5 == 0; cv2.line(crop, q(x, z0), q(x, z1), (0, 0, 255) if major else (0, 200, 255), 2 if major else 1)
            if major: cv2.putText(crop, str(x), (q(x, z1)[0] + 3, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        for z in range(math.ceil(z0), int(z1) + 1):
            major = z % 5 == 0; cv2.line(crop, q(x0, z), q(x1, z), (255, 0, 255) if major else (255, 180, 0), 2 if major else 1)
            if major: cv2.putText(crop, str(z), (3, q(x0, z)[1] - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
        out = '%s_%s.png' % (a.out, name); cv2.imwrite(out, crop); print(out)


def cmd_at(a):
    c = load(a.cal)
    for p in a.pts: x, y = map(float, p.split(',')); print('pixel (%s) is (%.2f, %.2f) mm' % (p, *to_mm(c, x, y)))


def cmd_px(a):
    c = load(a.cal)
    for p in a.pts: x, z = map(float, p.split(',')); print('(%s) mm is pixel (%.1f, %.1f)' % (p, *to_px(c, x, z)))


def cmd_outline(a):
    c = load(a.cal); im = cv2.imread(c['photo']).astype(int); B, G, R = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    mx, mn = np.maximum(np.maximum(R, G), B), np.minimum(np.minimum(R, G), B)
    mask = {'bright': (mx > 150) & (mx - mn < 60) & (mx < a.ground), 'dark': mx < a.dark, 'notblue': ~blue_mask(im.astype(np.uint8))}[a.mode]
    if a.box:  # only within a box (mm): a part at the edge kept apart from the ground beyond it
        x0, z0, x1, z1 = map(float, a.box.split(':')); poly = np.int32([to_px(c, x, z) for x, z in [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]])
        keep = np.zeros(mask.shape, np.uint8); cv2.fillPoly(keep, [poly], 1); mask = mask & keep.astype(bool)
    if a.open: mask = ndimage.binary_opening(mask, iterations=a.open)  # (parts touching through a shadow or a thin line, parted)
    lab, _ = ndimage.label(mask)
    for spec in a.at:
        name, x, z = spec.split(':'); px, py = map(lambda v: int(round(v)), to_px(c, float(x), float(z)))
        l = lab[py, px]
        if not l: print('%-12s not in the %s mask there (%s)' % (name, a.mode, im[py, px].tolist())); continue
        ys, xs = np.nonzero(lab == l); pts = np.array([to_mm(c, u, v) for u, v in zip(xs[::2], ys[::2])])
        print('%-12s x %.2f..%.2f  z %.2f..%.2f  (%.2f × %.2f mm), its middle (%.2f, %.2f)' % (name, pts[:, 0].min(), pts[:, 0].max(), pts[:, 1].min(), pts[:, 1].max(), np.ptp(pts[:, 0]), np.ptp(pts[:, 1]), pts[:, 0].mean(), pts[:, 1].mean()))


def cmd_overlay(a):
    c = load(a.cal); im = cv2.imread(c['photo']); m = json.load(open(a.map)); S = a.scale
    big = cv2.resize(im, None, fx=S, fy=S, interpolation=cv2.INTER_LANCZOS4)
    for i, p in enumerate(q for q in m['parts'] if q.get('side', 'top') == a.side):
        (x, z), (w, d), t = p['at'], p['size'][:2], math.radians(p.get('turn', 0))
        corners = [(x + u * math.cos(t) - v * math.sin(t), z + u * math.sin(t) + v * math.cos(t)) for u, v in [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]]
        poly = np.int32([[to_px(c, X, Z)[0] * S, to_px(c, X, Z)[1] * S] for X, Z in corners])
        col = [(0, 255, 255), (255, 0, 255), (0, 255, 0), (0, 128, 255)][i % 4]
        cv2.polylines(big, [poly], True, col, 2)
        cx, cy = poly.mean(axis=0).astype(int); cv2.putText(big, p['name'][:18], (int(cx) - 30, int(cy)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1)
    cv2.imwrite(a.out, big); print(a.out)


def cmd_same(a):
    x0, z0, x1, z1 = map(float, a.region.split(':')); tiles = []
    for f in a.cals:
        c = load(f); im = cv2.imread(c['photo'])
        pts = [to_px(c, x, z) for x in (x0 - a.up, x1 + a.up) for z in (z0 - a.up, z1 + a.up)]
        X0, Y0 = max(int(min(p[0] for p in pts)), 0), max(int(min(p[1] for p in pts)), 0)
        X1, Y1 = min(int(max(p[0] for p in pts)), im.shape[1]), min(int(max(p[1] for p in pts)), im.shape[0])
        if X1 - X0 < 4 or Y1 - Y0 < 4: print(f'{f}: the region is outside its photo'); continue
        cut = im[Y0:Y1, X0:X1].copy(); poly = np.int32([[to_px(c, x, z)[0] - X0, to_px(c, x, z)[1] - Y0] for x, z in [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]])
        cv2.polylines(cut, [poly], True, (0, 255, 255), 2)
        h = a.h; cut = cv2.resize(cut, (max(1, int(cut.shape[1] * h / cut.shape[0])), h), interpolation=cv2.INTER_LANCZOS4)
        cv2.putText(cut, c['photo'].split('/')[-1][:24], (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1); tiles.append(cut)
    if tiles: cv2.imwrite(a.out, np.hstack(tiles)); print(a.out, '·', len(tiles), 'views')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('calibrate'); p.add_argument('photo'); p.add_argument('--point', action='append', required=True); p.add_argument('--pad', action='store_true'); p.add_argument('--out', required=True); p.set_defaults(f=cmd_calibrate)
    p = sp.add_parser('grid'); p.add_argument('cal'); p.add_argument('--region', action='append', required=True); p.add_argument('--out', required=True); p.add_argument('--scale', type=float, default=3); p.set_defaults(f=cmd_grid)
    p = sp.add_parser('at'); p.add_argument('cal'); p.add_argument('pts', nargs='+'); p.set_defaults(f=cmd_at)
    p = sp.add_parser('px'); p.add_argument('cal'); p.add_argument('pts', nargs='+'); p.set_defaults(f=cmd_px)
    p = sp.add_parser('outline'); p.add_argument('cal'); p.add_argument('--mode', choices=['bright', 'dark', 'notblue'], required=True); p.add_argument('--dark', type=int, default=110); p.add_argument('--ground', type=int, default=240, help='brighter than this is the ground the photo was taken on, not metal'); p.add_argument('--box'); p.add_argument('--open', type=int, default=0, help='part blobs that touch by this many pixels of opening'); p.add_argument('at', nargs='+'); p.set_defaults(f=cmd_outline)
    p = sp.add_parser('overlay'); p.add_argument('cal'); p.add_argument('map'); p.add_argument('--out', required=True); p.add_argument('--side', default='top'); p.add_argument('--scale', type=float, default=1.5); p.set_defaults(f=cmd_overlay)
    p = sp.add_parser('same'); p.add_argument('cals', nargs='+'); p.add_argument('--region', required=True); p.add_argument('--up', type=float, default=0); p.add_argument('--h', type=int, default=360); p.add_argument('--out', required=True); p.set_defaults(f=cmd_same)
    a = ap.parse_args(); a.f(a)


if __name__ == '__main__':
    main()

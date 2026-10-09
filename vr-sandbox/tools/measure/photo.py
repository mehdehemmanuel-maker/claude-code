#!/usr/bin/env python3
"""Measure a real thing from a photo of it, in millimetres.

A photo is calibrated by four or more points whose places are known in millimetres (a board's mounting holes, from its
maker's drawing): each guessed point is pulled onto the round pad or hole nearest it, and the photo's plane is mapped to
millimetres by the homography through them. Then:

  calibrate  photo.jpg --point PX,PY=X,Z ... [--pad] --out cal.json   (X right, Z up, from the lower-left corner;
             [--tall PX,PY=X,Z,Y ...]                                 a point ending ! is not pulled onto a pad; --tall:
                                                                      points Y mm up, a pin's tip, to fix the lens)
  grid       cal.json --region NAME:X0:Z0:X1:Z1 ... --out PREFIX      a crop of each region with its millimetre grid
  at         cal.json PX,PY[@H] ...                                   where a pixel is, mm (@H: on a top H mm up)
  px         cal.json X,Z ...                                         where a point in mm is in the photo
  outline    cal.json --mode bright|dark|notblue NAME:X:Z ... [--box=X0:Z0:X1:Z1] [--ground 240]
                                                                      the outline of the part round each point, mm
  overlay    cal.json boardmap.json --out out.png [--side top]        each drawn part's footprint on the photo
  small      cal.json [--map boardmap.json] [--box=X0:Z0:X1:Z1] --out small.json [--show out.png] [--ts NAME:file.ts]
             [--why X,Z] [--skip X0:Z0:X1:Z1]                         (--why: how the blob at a point was taken, or not;
                                                                      --skip: a region with no parts, a logo)
                                                                      every small part on a board seen in its photo
                                                                      (what is not its mask, 0.4–4 mm, outside the
                                                                      parts the map already places): each one's middle,
                                                                      length, width and angle in mm, and what it looks
                                                                      like (a tan capacitor, a black resistor or chip,
                                                                      a grey inductor, a white LED)
  colour     REAL.json DRAWN.json --at X,Z[@Y][:R] ... [--now 0xRRGGBB]  the same places' colour in a photo and a render
                                                                      of the drawing, and the colour to draw it to match
  traces     cal.json [--map boardmap.json] --out traces.png [--ts NAME:file.ts] [--res 10] [--lift 8]
                                                                      the copper under a board's mask as its photo shows
                                                                      it (traces, planes, vias), on the board's own mm
  silk       cal.json [--map boardmap.json] --out silk.png [--ts NAME:file.ts] [--res 20] [--sat 45] [--val 215]
                                                                      the silkscreen as its photo shows it (its words,
                                                                      logos, outlines: the white ink on its mask), on the
                                                                      board's own mm, with the ink's colour
  camera     cal.json --L 85 --W 56 --top LIFT [--render r.png --render-cal r.json]
                                                                      the photo's camera as the look page's query
                                                                      (cam, aim, up, fov; render at the photo's size), so
                                                                      the drawing is rendered as the photo saw it, and a
                                                                      calibration for that render, for same and colour
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


def fit_camera(obj, img, shape):
    """A camera fitted to points known in 3D (board mm: x, z, y) and seen at pixels: its principal point the photo's
    middle, square pixels, its lens the one whose rigid pose (solvePnP) puts them where they are seen, searched over
    every lens from half the photo's width to thirty times it. Returns K, R, t and the fit's rms, px."""
    h, w = shape[:2]; obj, img = np.float64(obj), np.float64(img)
    def fit(f):
        K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1.0]])
        ok, rv, tv = cv2.solvePnP(obj, img, K, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: return 1e9, K, None, None
        ok, rv, tv = cv2.solvePnP(obj, img, K, None, rv, tv, True, cv2.SOLVEPNP_ITERATIVE)
        pr, _ = cv2.projectPoints(obj, rv, tv, K, None); return float(np.sqrt(np.mean(np.sum((pr.reshape(-1, 2) - img) ** 2, 1)))), K, rv, tv
    fs = np.geomspace(0.5 * w, 30 * w, 90); best = min(fs, key=lambda f: fit(f)[0])
    lo, hi = math.log(best / 1.1), math.log(best * 1.1); g = (math.sqrt(5) - 1) / 2
    for _ in range(50):
        m1, m2 = hi - g * (hi - lo), lo + g * (hi - lo)
        if fit(math.exp(m1))[0] < fit(math.exp(m2))[0]: hi = m2
        else: lo = m1
    err, K, rv, tv = fit(math.exp((lo + hi) / 2)); R, _ = cv2.Rodrigues(rv)
    return K, R, tv.reshape(3), err


def camera(c, shape):
    """The camera a photo was taken with, from its calibration: its principal point the photo's middle, square pixels; its
    focal length the one that makes the plane's two directions square and of a length (Zhang's constraints on H), or,
    where the calibration has points of known height (`tall`: a pin's tip, a jack's top corner), the one that puts them
    where the photo shows them; its turn and place a rigid pose fitted to every point (solvePnP). Returns
    project(x, z, y): the pixel a point y mm above the board at (x, z) is seen at; None when the photo is too square-on
    to tell (an orthographic view, where nothing leans). project.R, project.t, project.f: the pose (board mm, its axes
    x, z, y, to the camera's), project.err: the fit's rms, px."""
    h, w = shape[:2]; T = np.array([[1, 0, -w / 2], [0, 1, -h / 2], [0, 0, 1.0]]); A = T @ c['H']; a1, a2 = A[:, 0], A[:, 1]
    fs = []
    if abs(a1[2] * a2[2]) > 1e-12: fs.append(-(a1[0] * a2[0] + a1[1] * a2[1]) / (a1[2] * a2[2]))
    if abs(a1[2] ** 2 - a2[2] ** 2) > 1e-12: fs.append(-((a1[0] ** 2 + a1[1] ** 2) - (a2[0] ** 2 + a2[1] ** 2)) / (a1[2] ** 2 - a2[2] ** 2))
    fs = [f for f in fs if f > 0]
    if not fs: return None
    f0 = math.sqrt(float(np.median(fs)))
    obj = [[*p['mm'], 0.0] for p in c['points']] + [list(p['mm']) for p in c.get('tall', [])]
    img = [p['px'] for p in c['points']] + [p['px'] for p in c.get('tall', [])]
    obj, img = np.float64(obj), np.float64(img)
    def fit(f):
        K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1.0]])
        ok, rv, tv = cv2.solvePnP(obj, img, K, None, flags=cv2.SOLVEPNP_ITERATIVE)
        if not ok: return 1e9, K, None, None
        pr, _ = cv2.projectPoints(obj, rv, tv, K, None); return float(np.sqrt(np.mean(np.sum((pr.reshape(-1, 2) - img) ** 2, 1)))), K, rv, tv
    f = f0
    if c.get('tall'):
        # (a golden search for the lens over a decade either side of the plane's own estimate)
        lo, hi = math.log(f0 / 4), math.log(f0 * 4); g = (math.sqrt(5) - 1) / 2
        for _ in range(60):
            m1, m2 = hi - g * (hi - lo), lo + g * (hi - lo)
            if fit(math.exp(m1))[0] < fit(math.exp(m2))[0]: hi = m2
            else: lo = m1
        f = math.exp((lo + hi) / 2)
    err, K, rv, tv = fit(f)
    if rv is None: return None
    R, _ = cv2.Rodrigues(rv); t = tv.reshape(3)
    def project(x, z, y):
        v = K @ (R @ [x, z, y] + t); return v[0] / v[2], v[1] / v[2]
    def unproject(px, py, y):   # (the point y mm above the board seen at a pixel: the plane at that height, inverted)
        Hy = K @ np.c_[R[:, 0], R[:, 1], y * R[:, 2] + t]; v = np.linalg.solve(Hy, [px, py, 1.0]); return v[0] / v[2], v[1] / v[2]
    project.f = f; project.unproject = unproject; project.R = R; project.t = t; project.err = err
    return project


def shadow(c, cam, corners, top, pts3=None):
    """What of the board's plane a part hides in a photo: its footprint, and each corner of its solids seen along the
    camera's rays down onto the plane from its own height (or, given only the part's box, its top's outline), as one
    hull, mm."""
    pts = [tuple(p) for p in corners]
    if cam and pts3:
        for x, z, y in pts3:
            if y > 0.05: px, py = cam(x, z, y); pts.append(to_mm(c, px, py))
    elif cam and top > 0.05:
        for x, z in corners: px, py = cam(x, z, top); pts.append(to_mm(c, px, py))
    return cv2.convexHull(np.float32(pts)).reshape(-1, 2)


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
        # (a point ending in ! is taken where it is given, not pulled onto a pad: a board's corner, a hole hidden)
        l, r = p.split('='); keep = r.endswith('!'); x, y = map(float, l.split(',')); X, Z = map(float, r.rstrip('!').split(','))
        if a.pad and not keep: x, y = pad_centre(im, x, y)
        px.append([x, y]); mm.append([X, Z])
    # (points of known height, PX,PY=X,Z,Y: a pin's tip, a jack's corner; they fix the camera's lens, and, where fewer
    # than four points of the plane are seen, the plane itself through the camera they fit)
    tall = [{'px': list(map(float, l.split(','))), 'mm': list(map(float, r.split(',')))} for l, r in (t.split('=') for t in a.tall or [])]
    if len(px) >= 4: H, _ = cv2.findHomography(np.float32(mm), np.float32(px), 0)
    elif len(px) + len(tall) >= 5:
        K, R, t, err = fit_camera([[*m, 0.0] for m in mm] + [p['mm'] for p in tall], px + [p['px'] for p in tall], im.shape)
        H = K @ np.c_[R[:, 0], R[:, 1], t]; H = H / H[2, 2]; print('the plane from the camera fitted to %d points, %.2f px rms (lens %.0f px)' % (len(px) + len(tall), err, K[0, 0]))
    else: sys.exit('four points of the plane, or three and two of known height, are needed')
    c = {'photo': a.photo, 'H': H.tolist(), 'points': [{'px': p, 'mm': m} for p, m in zip(px, mm)]}
    if tall: c['tall'] = tall
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
    # (PX,PY on the board's plane; PX,PY@H on a part's top H mm above it, by the camera the calibration gives)
    c = load(a.cal); cam = None
    for p in a.pts:
        xy, _, hh = p.partition('@'); x, y = map(float, xy.split(','))
        if hh:
            cam = cam or camera(c, cv2.imread(c['photo']).shape)
            if not cam: print('pixel (%s): the photo is too square-on to tell a height' % p); continue
            print('pixel (%s) is (%.2f, %.2f) mm, %s mm up' % (xy, *cam.unproject(x, y, float(hh)), hh))
        else: print('pixel (%s) is (%.2f, %.2f) mm' % (p, *to_mm(c, x, y)))


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
        corners = p['corners']
        poly = np.int32([[to_px(c, X, Z)[0] * S, to_px(c, X, Z)[1] * S] for X, Z in corners])
        col = [(0, 255, 255), (255, 0, 255), (0, 255, 0), (0, 128, 255)][i % 4]
        cv2.polylines(big, [poly], True, col, 2)
        cx, cy = poly.mean(axis=0).astype(int); cv2.putText(big, p['name'][:18], (int(cx) - 30, int(cy)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1)
    cv2.imwrite(a.out, big); print(a.out)


def cmd_small(a):
    """Small parts by what their bodies look like: a ceramic capacitor's tan, a resistor's or a small chip's black, an
    inductor's or a part's grey; each body's blob measured (its ends' tin not in it, so a part is its body's length
    and a termination each end), put to the nearest EIA case by its width, its angle to the nearest 90° where it is
    within 15°."""
    c = load(a.cal); im = cv2.imread(c['photo']); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(int)
    H_, S_, V_ = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    keep = np.zeros(im.shape[:2], np.uint8)
    x0, z0, x1, z1 = map(float, (a.box or '0.8:0.8:99.2:61.2').split(':'))
    cv2.fillPoly(keep, [np.int32([to_px(c, x, z) for x, z in [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]])], 1)
    if a.map:   # leave out what the drawing already places (each footprint a little larger) and its holes' pads
        m = json.load(open(a.map)); cam = camera(c, im.shape); hid = np.zeros_like(keep)
        for p in m['parts']:
            if p.get('side', 'top') != 'top': continue
            # (each footprint a little larger, and the plane its top hides in a photo taken from aside)
            cs = np.array(p['corners']); mid = cs.mean(axis=0); cs = cs + (cs - mid) * 0.06 + np.sign(cs - mid) * 0.35
            cv2.fillPoly(hid, [np.int32([to_px(c, x, z) for x, z in shadow(c, cam, cs, p.get('top', 0), p.get('pts'))])], 1)
        # (all of it widened 0.3 mm: the camera's lean is good to about 0.5 mm, its footprint already a little larger, and a
        # part's bright edge is no small part)
        r_ = max(1, int(round(0.3 * (c.get('scale_px_per_mm') or 9.7)))); keep[cv2.dilate(hid, np.ones((2 * r_ + 1, 2 * r_ + 1), np.uint8)) > 0] = 0
        for w in m.get('silk', []):
            cv2.fillPoly(keep, [np.int32([to_px(c, x, z) for x, z in w['corners']])], 0)
        for h in m.get('holes', []):
            X, Y = to_px(c, *h['at']); cv2.circle(keep, (int(X), int(Y)), int(h['pad'] / 2 * c['scale_px_per_mm'] + 3), 0, -1)
    if a.silk:   # (the board's ink as photo.py silk found it, laid back onto the photo: words and logos are not parts)
        ink = cv2.imread(a.silk, 0); m_ = json.load(open(a.map)) if a.map else {}; Wb = m_.get('W', 62); Rs = ink.shape[1] / m_.get('L', 100)
        Mi = c['H'] @ np.array([[1 / Rs, 0, 0.5 / Rs], [0, -1 / Rs, Wb - 0.5 / Rs], [0, 0, 1]])
        inkp = cv2.warpPerspective(ink, Mi, (im.shape[1], im.shape[0]), flags=cv2.INTER_NEAREST)
        keep[cv2.dilate(inkp, np.ones((5, 5), np.uint8)) > 0] = 0
    for sk in a.skip or []:   # (regions known to hold no part: a logo, a drawing printed on the board)
        x0_, z0_, x1_, z1_ = map(float, sk.split(':')); cv2.fillPoly(keep, [np.int32([to_px(c, x, z) for x, z in [(x0_, z0_), (x1_, z0_), (x1_, z1_), (x0_, z1_)]])], 0)
    keep = keep.astype(bool)
    if a.keep: cv2.imwrite(a.keep, np.where(keep[:, :, None], im, im // 4))   # (where it looked: the rest darkened)
    # (a part is tan (a ceramic body, a moulded inductor's) with its bright tin ends, or dark (a resistor's body, a small
    # chip's or transistor's): two masks, so a dark shadow between two tan parts does not join them, each opened to drop
    # thin traces; the board's blue mask, its white silkscreen and the ground are neither)
    # (the board's mask by its own hue, blue or green, and how saturated and bright it is: tin is far paler than any mask,
    # under half its saturation and brighter, whatever the mask's colour; a ceramic body is a dull tan, a copper pad's
    # orange far more saturated)
    blue, _ = mask_of(hsv, keep); Sm, Vm = float(np.median(S_[blue & keep])), float(np.median(V_[blue & keep]))
    # (white is ink when the ink is not known; when photo.py silk has found it, white is tin's highlight, the ink left out)
    blue &= S_ >= 0.5 * Sm; white = np.zeros_like(blue) if a.silk else (S_ < 30) & (V_ > 215)
    bright = (V_ > max(170, Vm + 10)) & (S_ < max(70, 0.5 * Sm)) & ~white
    tanpx = (H_ >= 5) & (H_ <= 35) & (S_ >= 12) & (S_ < 120) & (V_ >= 100) & ~white
    darkpx = (V_ < 125) & ~blue & ~tanpx
    # (a body's holes filled: its marking, a greyer patch, a highlight are still the part)
    masks = [(k, ndimage.binary_fill_holes(ndimage.binary_opening(m & keep, iterations=1))) for k, m in (('tan', (tanpx | bright) & ~blue), ('dark', darkpx))]
    # (parts side by side touch through their pads: each blob eroded until it is one part, a little more each pass,
    # what is taken at one pass left out of the next; each measured with what erosion took from it put back)
    pxmm = c.get('scale_px_per_mm') or 9.7; out = []; unnamed = []; tins = []
    CASES = [(0.42, '0201', 0.6, 0.3), (0.66, '0402', 1.0, 0.5), (1.0, '0603', 1.6, 0.8), (1.45, '0805', 2.0, 1.25), (9, '1206', 3.2, 1.6)]
    why = [to_px(c, *map(float, w.split(','))) for w in (a.why or [])]
    # (what each point asked about is, before any blob: left out as under a drawn part, a word or a hole, or which mask
    # its colour falls in)
    for w, (X, Y) in zip(a.why or [], why):
        X_, Y_ = int(round(X)), int(round(Y))
        print(f'  why {w}: ' + ('left out (under a drawn part or its shadow, a word, a hole or a skip)' if not keep[Y_, X_] else
              f'HSV {hsv[Y_, X_].tolist()}: ' + ', '.join(n for n, m_ in (('mask', blue), ('tan', tanpx), ('bright', bright), ('dark', darkpx)) if m_[Y_, X_]) or 'in no mask'))
    for src, left in masks:
      for er in range(a.erode, a.erode + 4):
        lab, n = ndimage.label(ndimage.binary_erosion(left, iterations=er) if er else left); last = er == a.erode + 3
        for i, sl in enumerate(ndimage.find_objects(lab), start=1):
            ys, xs = np.nonzero(lab[sl] == i)
            if len(xs) < 5: continue
            ys = ys + sl[0].start; xs = xs + sl[1].start
            (cx, cy), (w, h), ang = cv2.minAreaRect(np.float32(np.c_[xs, ys]))
            dens = len(xs) / max(w * h, 1); w, h = w + 2 * er, h + 2 * er; L, W = max(w, h) / pxmm, min(w, h) / pxmm
            if why and any(((xs - X) ** 2 + (ys - Y) ** 2).min() < 9 for X, Y in why):
                print(f'  why: {src} mask, eroded {er}: a blob {L:.2f} × {W:.2f} mm, {dens:.2f} of its box filled' + ('' if (dens >= 0.62 and L <= 4.4) or last else ': not one part yet, split further'))
            if (dens < 0.62 or L > 4.4) and not last: continue        # (not one part yet: split further next pass)
            took = np.zeros_like(left); took[ys, xs] = True; left &= ~ndimage.binary_dilation(took, iterations=er + 1)
            if src == 'tan' and L < 0.45 and W >= 0.12 and dens >= 0.6:
                mx_, mz_ = to_mm(c, cx, cy); tins.append((mx_, mz_, L, W)); continue   # (a tin end alone: paired below)
            if dens < 0.45 or W < 0.25 or L < 0.45 or L > 4.4: continue
            th = math.radians(ang if w >= h else ang + 90); mx, mz = to_mm(c, cx, cy)
            # (where each pixel is along the part (u) and across it (v), as a share of its half-length and half-width)
            px_ = np.arange(max(0, int(cx - L * pxmm)), min(im.shape[1], int(cx + L * pxmm) + 1)); py_ = np.arange(max(0, int(cy - L * pxmm)), min(im.shape[0], int(cy + L * pxmm) + 1))
            gx, gy = np.meshgrid(px_, py_); u = ((gx - cx) * math.cos(th) + (gy - cy) * math.sin(th)) / (L * pxmm / 2); v = (-(gx - cx) * math.sin(th) + (gy - cy) * math.cos(th)) / (W * pxmm / 2)
            core = (abs(u) < 0.45) & (abs(v) < 0.45); ends = (abs(u) > 0.62) & (abs(u) < 1.0) & (abs(v) < 0.6); sides = (abs(v) > 0.62) & (abs(v) < 1.0) & (abs(u) < 0.6)
            med = lambda v: float(np.median(v)) if v.size else 0.0
            cH, cS, cV = (med(ch[gy[core], gx[core]]) for ch in (H_, S_, V_))
            eV, sV = med(V_[gy[ends], gx[ends]]), med(V_[gy[sides], gx[sides]])
            beyond = (abs(u) > 1.0) & (abs(u) < 1.7) & (abs(v) < 0.7); bV = med(V_[gy[beyond], gx[beyond]])
            ex, ez = np.subtract(to_mm(c, cx + math.cos(th), cy + math.sin(th)), (mx, mz)); a_ = math.degrees(math.atan2(ez, ex)) % 180
            # (to the nearest right angle within 15°, or always where it is under 1 mm long: its angle not measurable)
            d = round(a_ / 90) * 90 % 180 if min(a_ % 90, 90 - a_ % 90) < 15 or L < 1.0 else round(a_)
            tan = src == 'tan' and 5 <= cH <= 35 and cS >= 10; dark = src == 'dark'
            at = [round(mx, 2), round(mz, 2)]
            if dark and 1.7 <= L <= 3.6 and W >= 1.2:
                # (a small transistor or regulator: a dark body, its bright legs out of its long sides, counted in a band
                # round it; by its body's length a SOT-23 (2.9 mm) or the smaller SOT-323 (SC-70, 2.0 mm))
                ring = (abs(u) < 1.15) & (abs(v) > 0.5) & (abs(v) < 1.9) & bright[gy, gx]
                legs = ndimage.label(ring)[1]; pins = 6 if legs >= 6 else 5 if legs == 5 else 3
                pk = ('SOT-23' if L >= 2.55 else 'SOT-323') + ('' if pins == 3 else f'-{pins}')
                out.append({'at': at, 'kind': 'sot23', 'pkg': pk, 'L': 2.9 if L >= 2.55 else 2.0, 'W': 1.3 if L >= 2.55 else 1.25, 'dir': d, 'seen': [round(L, 2), round(W, 2)], 'legs': legs}); continue
            if tan and 0.9 <= W <= 2.1 and L / W >= 1.45 and sV > eV + 12:
                # (a row of chips side by side, touching: their bright ends along the row's long sides, not its ends; as
                # long as k of their widths, each about twice as long as it is wide (EIA cases are), split into k)
                k = int(round(L / (W / 2)))
                if 2 <= k <= 6:
                    case = next(cs for cs in CASES if W / 2 < cs[0])
                    for j in range(k):
                        off = (j - (k - 1) / 2) * (L / k)
                        out.append({'at': [round(mx + off * math.cos(math.radians(a_)), 2), round(mz + off * math.sin(math.radians(a_)), 2)], 'kind': 'capacitor', 'case': case[1], 'L': case[2], 'W': case[3], 'dir': (d + 90) % 180, 'seen': [round(L / k, 2), round(W, 2)], 'row': k})
                    continue
            if tan and L >= 1.5 and L / W < 1.45 and eV < cV + 25:
                # (tan, near square, no bright ends: a moulded power inductor, its size as seen)
                out.append({'at': at, 'kind': 'inductor', 'L': round(L, 2), 'W': round(W, 2), 'dir': d}); continue
            if (tan or (dark and bV > cV + 40)) and L <= 3.4 and W < 1.75:
                # (a resistor: its black body between bright tin ends, which lie past the ends of the dark blob)
                case = next(cs for cs in CASES if W < cs[0]); kind = 'resistor' if dark else 'capacitor'
                out.append({'at': at, 'kind': kind, 'case': case[1], 'L': case[2], 'W': case[3], 'dir': d, 'seen': [round(L, 2), round(W, 2)]}); continue
            if dark and W >= 1.2:
                out.append({'at': at, 'kind': 'chip', 'L': round(L, 2), 'W': round(W, 2), 'dir': d}); continue
            if src == 'tan' and not tan and cV > 170 and 0.45 <= L <= 0.8 and W <= 0.45 and L / W >= 1.4:
                # (bright all over, as long as an 0201 and half as wide: its 0.3 mm body too small to show its colour
                # between its tin ends at this photo's scale; what it is not seen, drawn as the commoner, a capacitor)
                out.append({'at': at, 'kind': 'capacitor', 'case': '0201', 'L': 0.6, 'W': 0.3, 'dir': d, 'seen': [round(L, 2), round(W, 2)], 'unseen': 'kind'}); continue
            unnamed.append({'at': at, 'L': round(L, 2), 'W': round(W, 2), 'mask': src, 'hsv': [round(cH), round(cS), round(cV)], 'ends': round(eV), 'sides': round(sV)})   # (seen, but like none of these: left out and listed, not guessed)
    # (where a part's body is too small to show between its ends at the photo's scale, its two tin ends are seen as two
    # pale blobs: a pair of them, alike, their middles as far apart as an EIA case's ends are (an 0201's about 0.45 mm,
    # an 0402's 0.75), is that part; what it is (capacitor or resistor) not seen, drawn as the commoner)
    if a.tins: json.dump([[round(v, 3) for v in t] for t in tins], open(a.tins, 'w'))
    used = set()
    for i, (x1, z1, l1, w1) in enumerate(tins):
        if i in used: continue
        best = None
        for j, (x2, z2, l2, w2) in enumerate(tins):
            if j == i or j in used: continue
            d = math.hypot(x2 - x1, z2 - z1)
            if 0.3 <= d <= 0.9 and max(l1, l2) < 1.8 * min(l1, l2) + 0.1 and (best is None or d < best[0]): best = (d, j)
        if not best: continue
        d, j = best; x2, z2 = tins[j][:2]; used |= {i, j}
        a_ = math.degrees(math.atan2(z2 - z1, x2 - x1)) % 180; dd = round(a_ / 90) * 90 % 180 if min(a_ % 90, 90 - a_ % 90) < 15 else round(a_)
        case = ('0201', 0.6, 0.3) if d < 0.6 else ('0402', 1.0, 0.5)
        out.append({'at': [round((x1 + x2) / 2, 2), round((z1 + z2) / 2, 2)], 'kind': 'capacitor', 'case': case[0], 'L': case[1], 'W': case[2], 'dir': dd, 'seen': [round(d, 2), round((tins[i][3] + tins[j][3]) / 2, 2)], 'unseen': 'kind', 'pair': True})
    json.dump({'photo': c['photo'], 'count': len(out), 'parts': out, 'unnamed': unnamed}, open(a.out, 'w'), indent=0)
    if a.ts:   # the same as a TypeScript table a board's data imports: NAME:path.ts
        name, path = a.ts.split(':', 1); k = {'capacitor': 'c', 'resistor': 'r', 'sot23': 't', 'chip': 'q', 'inductor': 'l', 'unseen': 'p'}
        rows = ["['%s', %.2f, %.2f, %.2f, %.2f, %d%s]" % (k['unseen' if p.get('unseen') else p['kind']], p['at'][0], p['at'][1], p['L'], p['W'], int(p['dir']), ", '%s'" % p['pkg'] if 'pkg' in p else '') for p in out]
        body = ',\n  '.join(', '.join(rows[i:i + 6]) for i in range(0, len(rows), 6))
        open(path, 'w').write(f"""// {a.board or 'A board'}'s small parts, as its photo shows them: found by tools/measure/photo.py small on its photo
// calibrated by known points (what is neither its mask nor its silkscreen, outside the parts and words its layout
// places, 0.45-4 mm across; rows of chips touching split by their width; each put to the nearest EIA case by its width).
// Made with: small --erode {a.erode}{''.join(' --skip ' + k for k in (a.skip or []))}{' --silk (its ink, from photo.py silk)' if a.silk else ''}
// (each skipped region checked by eye against the photo: what was found there was words, a test pad or a hole's rim).
// Generated: re-run the tool and this file is written again. The smallest (0201s in dense clusters, {0.3 * pxmm:.0f} pixels wide in
// a photo of {pxmm:.1f} px/mm) are at the edge of what the photo resolves, so many are missed; none is placed that the photo
// does not show. Each row: c capacitor, r resistor, t a small transistor package (its package last, SOT-23 or SOT-323 by its
// body's length, its pins by the legs counted), q a small dark no-lead chip (its size as seen), l a moulded inductor,
// p a chip as small as an 0201 whose kind its photo does not show; middle x, z (mm from the lower-left corner); length
// and width (mm); its angle (degrees from +x).
export const {name}: ['c' | 'r' | 't' | 'q' | 'l' | 'p', number, number, number, number, number, string?][] = [
  {body},
];
"""); print(path, len(rows), 'rows')
    from collections import Counter
    print('%d small parts: %s; cases %s; packages %s; %d seen but like none of these, left out' % (len(out), dict(Counter(p['kind'] for p in out)), dict(Counter(p.get('case', '-') for p in out)), dict(Counter(p['pkg'] for p in out if 'pkg' in p)), len(unnamed)))
    if a.show:
        big = cv2.resize(im, None, fx=1.4, fy=1.4); col = {'capacitor': (0, 200, 255), 'resistor': (255, 0, 255), 'chip': (0, 0, 255), 'inductor': (0, 255, 0), 'sot23': (255, 120, 0)}
        for p in out:
            X, Y = to_px(c, *p['at']); t = math.radians(p['dir']); L, W = p['L'], p['W']
            cs = [(p['at'][0] + u * math.cos(t) - v * math.sin(t), p['at'][1] + u * math.sin(t) + v * math.cos(t)) for u, v in [(-L / 2, -W / 2), (L / 2, -W / 2), (L / 2, W / 2), (-L / 2, W / 2)]]
            cv2.polylines(big, [np.int32([[to_px(c, x, z)[0] * 1.4, to_px(c, x, z)[1] * 1.4] for x, z in cs])], True, col[p['kind']], 1)
        cv2.imwrite(a.show, big); print(a.show)


def cmd_colour(a):
    """The same places' colour in two calibrated pictures (a photo of the real thing and a render of the drawing): each
    one's median within a radius, and, given the colour the drawing now has, the colour that would make its render
    match the photo (each channel scaled in linear light by what the photo has over what the render has: the render's
    light taken as fixed)."""
    cr, cd = load(a.real), load(a.drawn); ir, idr = cv2.imread(cr['photo']), cv2.imread(cd['photo'])
    lin = lambda v: np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4); srgb = lambda v: np.where(v <= 0.0031308, v * 12.92, 1.055 * v ** (1 / 2.4) - 0.055)
    # (a place y mm up, X,Z@Y, is where each picture's camera sees it: a pin's side, a housing's top)
    cams = {id(cr): camera(cr, ir.shape), id(cd): camera(cd, idr.shape)}
    def med(c, im, x, z, r, y=0.0):
        X, Y = cams[id(c)](x, z, y) if y and cams[id(c)] else to_px(c, x, z); R = max(1, r * c['scale_px_per_mm']); yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
        return np.median(im[(xx - X) ** 2 + (yy - Y) ** 2 <= R * R], axis=0)[::-1] / 255.0   # (RGB, 0..1)
    ratios = []
    for spec in a.at:
        xz, _, r = spec.partition(':'); xz, _, y = xz.partition('@'); x, z = map(float, xz.split(',')); r = float(r or 1.5); y = float(y or 0)
        pr, pd = med(cr, ir, x, z, r, y), med(cd, idr, x, z, r, y); ratios.append(lin(pr) / np.maximum(lin(pd), 1e-4))
        print('(%.1f, %.1f%s) r %.1f mm: real #%s, drawn #%s' % (x, z, ' @%.1f' % y if y else '', r, ''.join('%02x' % int(round(v * 255)) for v in pr), ''.join('%02x' % int(round(v * 255)) for v in pd)))
    if a.now:
        now = np.array([int(a.now.replace('0x', '').replace('#', '')[i:i + 2], 16) / 255 for i in (0, 2, 4)])
        new = srgb(np.clip(lin(now) * np.median(np.array(ratios), axis=0), 0, 1))
        print('drawn now 0x%s; to match: 0x%s' % (a.now.replace('0x', '').replace('#', ''), ''.join('%02x' % int(round(v * 255)) for v in new)))


def board_view(a):
    """The photo rectified to the board's own millimetres (R px/mm, its far edge at the top), and where on it the drawing
    places nothing (no part on top, no word, no hole's pad): what traces and silk read."""
    c = load(a.cal); im = cv2.imread(c['photo']); R = a.res; m = json.load(open(a.map)) if a.map else {'parts': [], 'silk': []}
    L, W = m.get('L', a.L), m.get('W', a.W); w, h = int(round(L * R)), int(round(W * R))
    # (each output pixel's place in mm, mapped into the photo by its calibration)
    M = c['H'] @ np.array([[1 / R, 0, 0.5 / R], [0, -1 / R, W - 0.5 / R], [0, 0, 1]])
    rect = cv2.warpPerspective(im, M, (w, h), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
    keep = np.ones((h, w), np.uint8)
    tp = lambda x, z: (x * R, (W - z) * R)
    # (each part hides its footprint and, in a photo taken from aside, the plane behind it out to where its top is seen)
    cam = camera(c, im.shape)
    for p in m.get('parts', []):
        if p.get('side', 'top') != 'top': continue
        cs = np.array(p['corners']); mid = cs.mean(axis=0); cs = cs + np.sign(cs - mid) * 0.15
        hull = shadow(c, cam, cs, p.get('top', p.get('h', 0)), p.get('pts'))
        cv2.fillPoly(keep, [np.int32([tp(x, z) for x, z in hull])], 0)
    for s_ in m.get('silk', []): cv2.fillPoly(keep, [np.int32([tp(x, z) for x, z in s_['corners']])], 0)
    for hl in m.get('holes', []): X, Y = tp(*hl['at']); cv2.circle(keep, (int(X), int(Y)), int(hl['pad'] / 2 * R + 2), 0, -1)
    if cam: print('camera: focal length %.0f px' % cam.f)
    # (the board's own outline: what lies past its edges is the ground the photo was taken on)
    edge = int(round(0.3 * R)); keep[:edge, :] = 0; keep[-edge:, :] = 0; keep[:, :edge] = 0; keep[:, -edge:] = 0
    hsv = cv2.cvtColor(rect, cv2.COLOR_BGR2HSV).astype(int)
    return c, rect, hsv, keep.astype(bool), (L, W, R, w, h)


def mask_of(hsv, keep):
    """The solder mask told by its own hue: the median hue of the board's strongly coloured pixels where nothing is
    placed (a blue mask's about 105 of OpenCV's 180, a green one's about 60), and every pixel within 18 of it."""
    H_, S_ = hsv[:, :, 0], hsv[:, :, 1]
    hm = int(np.median(H_[keep & (S_ >= 90)])); return (np.abs(H_ - hm) <= 18) & (S_ >= 60), hm


def hexof(bgr):
    return '0x' + ''.join('%02x' % int(round(v)) for v in bgr[::-1])


def write_ts(a, out, w, h, R, what, says, extra=''):
    import base64
    name, path = a.ts.split(':', 1); ok, png = cv2.imencode('.png', out, [cv2.IMWRITE_PNG_BILEVEL, 1]); b64 = base64.b64encode(png.tobytes()).decode()
    open(path, 'w').write(f"""// {a.board or 'A board'}'s {what}, as its photo shows it: found by tools/measure/photo.py {a.cmd}
// on its photo calibrated by known points (rectified to the board at {R:g} px/mm, its far edge at the top; {says}; the
// parts and words its layout places left out, so under them it is not known). Generated: re-run the tool and this file
// is written again. A PNG, {what} white, {w} x {h} px.
export const {name} = {{ res: {R:g}, w: {w}, h: {h}{extra}, png: 'data:image/png;base64,{b64}' }};
"""); print(path, len(b64), 'chars')


def cmd_traces(a):
    """Where a board's photo shows copper under its solder mask: its traces, planes' edges and vias, lighter than the bare
    mask round them. The photo is rectified to the board's own millimetres (R px/mm, its far edge at the top), the mask
    told by its hue, and a pixel taken as copper where it stands lighter than the mask's median round it by more than
    --lift; specks smaller than --speck pixels dropped; the parts and words the drawing places left out. Written as a
    grey PNG (copper white), and with --ts as a data URL a board's data imports. Prints the bare mask's colour and the
    copper's, each the median of its pixels."""
    c, rect, hsv, keep, (L, W, R, w, h) = board_view(a); V_ = hsv[:, :, 2]
    blue, hm = mask_of(hsv, keep)
    v = V_.astype(np.uint8); bg = cv2.medianBlur(v, a.win | 1); d = V_ - bg.astype(int)
    # (copper is a little lighter, still the mask's hue: not the bright metal of a pad or a part, nor its halo)
    cu = blue & (d > a.lift) & (d < 45) & keep
    near = ndimage.binary_dilation(~blue | ~keep, iterations=2); cu &= ~near
    # (a trace is a line: kept where a run of --run pixels along one of four directions lies in it)
    k = a.run; lines = np.zeros_like(cu)
    for ker in (np.ones((1, k), bool), np.ones((k, 1), bool), np.eye(k, dtype=bool), np.fliplr(np.eye(k, dtype=bool))):
        lines |= ndimage.binary_opening(cu, structure=ker)
    lab, n = ndimage.label(lines); sizes = ndimage.sum(lines, lab, range(1, n + 1)); big = np.isin(lab, 1 + np.nonzero(sizes >= a.speck)[0])
    out = (big * 255).astype(np.uint8); cv2.imwrite(a.out, out)
    bare = blue & keep & ~ndimage.binary_dilation(big, iterations=2)
    print('%s: %d × %d px at %g px/mm, %.1f %% of the board copper under its mask (its mask\'s hue %d)' % (a.out, w, h, R, 100 * big.mean(), hm))
    print('bare mask %s, over copper %s (medians)' % (hexof(np.median(rect[bare], axis=0)), hexof(np.median(rect[big.astype(bool)], axis=0)) if big.any() else '-'))
    if a.ts: write_ts(a, out, w, h, R, 'copper under its solder mask', 'copper where the photo stands lighter than the mask round it')


def cmd_silk(a):
    """A board's silkscreen as its photo shows it: the white ink on its mask, its words, logos and outlines, every one
    where it is. Ink is what is pale and grey (saturation under --sat, value over --val) on the board where the drawing
    places nothing; a solid little blob (fuller than 0.75 of its box and under 1 mm) is a part's tinned end, not ink, and
    is dropped, as are specks under --speck pixels. Written as a PNG (ink white), and with --ts as a data URL, with the
    ink's colour (the median of its pixels)."""
    c, rect, hsv, keep, (L, W, R, w, h) = board_view(a); S_, V_ = hsv[:, :, 1], hsv[:, :, 2]
    ink = (S_ < a.sat) & (V_ > a.val) & keep
    lab, n = ndimage.label(ink); out = np.zeros((h, w), np.uint8)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        blob = lab[sl] == i + 1; area = int(blob.sum())
        if area < a.speck: continue
        bh, bw = blob.shape
        if max(bh, bw) < R * 1.0 and area > 0.75 * bh * bw: continue
        out[sl][blob] = 255
    cv2.imwrite(a.out, out); col = np.median(rect[out > 0], axis=0) if (out > 0).any() else np.array([240, 240, 240])
    print('%s: %d × %d px at %g px/mm, %.2f %% of the board ink; the ink %s (median)' % (a.out, w, h, R, 100 * (out > 0).mean(), hexof(col)))
    if a.ts: write_ts(a, out, w, h, R, 'silkscreen', 'ink where the photo is pale and grey on its mask', f", ink: {hexof(col)}")


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


def cmd_camera(a):
    """The look page's camera for a photo: where it stood, what it looked at, its up and its lens, in the room's frame
    (x across the board from its middle, y up from its top, z toward the viewer: drawing z = W/2 - z), so the drawing is
    rendered as that photo saw it; and a calibration for the render (the same plane on the same pixels)."""
    c = load(a.cal); im = cv2.imread(c['photo']); h, w = im.shape[:2]; cam = camera(c, im.shape)
    if cam is None: sys.exit('the photo is too square-on to recover its camera')
    R, t, f = cam.R, cam.t, cam.f
    C = -R.T @ t; look, up = R.T @ [0, 0, 1.0], R.T @ [0, -1.0, 0]      # (board mm: x, z, y)
    P = np.array([C[0] - a.L / 2, C[2] + a.top, a.W / 2 - C[1]]); room = lambda v: np.array([v[0], v[2], -v[1]])
    A = P + room(look) * np.linalg.norm(t); U = room(up)
    fov = math.degrees(2 * math.atan(h / 2 / f)); m = lambda v: ','.join('%.5f' % (x / 1000) for x in v)
    print('lens %.0f px (fov %.3f°), fitted to %d points to %.2f px rms' % (f, fov, len(c['points']) + len(c.get('tall', [])), cam.err))
    print('LOOK_W=%d LOOK_H=%d' % (w, h)); print('cam=%s&aim=%s&up=%s&fov=%.3f' % (m(P), m(A), ','.join('%.4f' % x for x in U / np.linalg.norm(U)), fov))
    if a.render: json.dump({'photo': a.render, 'H': c['H'].tolist(), 'points': c['points'], 'scale_px_per_mm': c.get('scale_px_per_mm'), **({'tall': c['tall']} if c.get('tall') else {})}, open(a.render_cal, 'w'), indent=1); print('written', a.render_cal)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('calibrate'); p.add_argument('photo'); p.add_argument('--point', action='append', required=True); p.add_argument('--pad', action='store_true'); p.add_argument('--tall', action='append', help='PX,PY=X,Z,Y: a point Y mm above the board, for the camera'); p.add_argument('--out', required=True); p.set_defaults(f=cmd_calibrate)
    p = sp.add_parser('grid'); p.add_argument('cal'); p.add_argument('--region', action='append', required=True); p.add_argument('--out', required=True); p.add_argument('--scale', type=float, default=3); p.set_defaults(f=cmd_grid)
    p = sp.add_parser('at'); p.add_argument('cal'); p.add_argument('pts', nargs='+'); p.set_defaults(f=cmd_at)
    p = sp.add_parser('px'); p.add_argument('cal'); p.add_argument('pts', nargs='+'); p.set_defaults(f=cmd_px)
    p = sp.add_parser('outline'); p.add_argument('cal'); p.add_argument('--mode', choices=['bright', 'dark', 'notblue'], required=True); p.add_argument('--dark', type=int, default=110); p.add_argument('--ground', type=int, default=240, help='brighter than this is the ground the photo was taken on, not metal'); p.add_argument('--box'); p.add_argument('--open', type=int, default=0, help='part blobs that touch by this many pixels of opening'); p.add_argument('at', nargs='+'); p.set_defaults(f=cmd_outline)
    p = sp.add_parser('overlay'); p.add_argument('cal'); p.add_argument('map'); p.add_argument('--out', required=True); p.add_argument('--side', default='top'); p.add_argument('--scale', type=float, default=1.5); p.set_defaults(f=cmd_overlay)
    p = sp.add_parser('small'); p.add_argument('cal'); p.add_argument('--map'); p.add_argument('--erode', type=int, default=2); p.add_argument('--ts'); p.add_argument('--board'); p.add_argument('--box'); p.add_argument('--out', required=True); p.add_argument('--show'); p.add_argument('--why', action='append', help='X,Z (mm): say how the blob there was taken or why it was not'); p.add_argument('--skip', action='append', help='X0:Z0:X1:Z1 (mm): a region known to hold no part (a logo)'); p.add_argument('--silk', help='the ink photo.py silk found: left out'); p.add_argument('--keep', help='a PNG of where it looked'); p.add_argument('--tins', help='a JSON of the lone tin ends seen'); p.set_defaults(f=cmd_small)
    p = sp.add_parser('colour'); p.add_argument('real'); p.add_argument('drawn'); p.add_argument('--at', action='append', required=True); p.add_argument('--now'); p.set_defaults(f=cmd_colour)
    p = sp.add_parser('traces'); p.add_argument('cal'); p.add_argument('--map'); p.add_argument('--res', type=float, default=10); p.add_argument('--win', type=int, default=15); p.add_argument('--lift', type=int, default=8); p.add_argument('--speck', type=int, default=12); p.add_argument('--run', type=int, default=7); p.add_argument('--L', type=float, default=100); p.add_argument('--W', type=float, default=62); p.add_argument('--out', required=True); p.add_argument('--ts'); p.add_argument('--board'); p.set_defaults(f=cmd_traces)
    p = sp.add_parser('silk'); p.add_argument('cal'); p.add_argument('--map'); p.add_argument('--res', type=float, default=20); p.add_argument('--sat', type=int, default=45); p.add_argument('--val', type=int, default=215); p.add_argument('--speck', type=int, default=6); p.add_argument('--L', type=float, default=100); p.add_argument('--W', type=float, default=62); p.add_argument('--out', required=True); p.add_argument('--ts'); p.add_argument('--board'); p.set_defaults(f=cmd_silk)
    p = sp.add_parser('camera'); p.add_argument('cal'); p.add_argument('--L', type=float, required=True); p.add_argument('--W', type=float, required=True); p.add_argument('--top', type=float, default=0, help='the board top\'s height in the room, mm: the look page\'s lift (look.mjs prints it)'); p.add_argument('--render', help='the render this camera will make'); p.add_argument('--render-cal', dest='render_cal', help='its calibration, written'); p.set_defaults(f=cmd_camera)
    p = sp.add_parser('same'); p.add_argument('cals', nargs='+'); p.add_argument('--region', required=True); p.add_argument('--up', type=float, default=0); p.add_argument('--h', type=int, default=360); p.add_argument('--out', required=True); p.set_defaults(f=cmd_same)
    a = ap.parse_args(); a.f(a)


if __name__ == '__main__':
    main()

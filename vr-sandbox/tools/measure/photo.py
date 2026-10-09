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
  small      cal.json [--map boardmap.json] [--box=X0:Z0:X1:Z1] --out small.json [--show out.png] [--ts NAME:file.ts]
             [--why X,Z] [--skip X0:Z0:X1:Z1]                         (--why: how the blob at a point was taken, or not;
                                                                      --skip: a region with no parts, a logo)
                                                                      every small part on a board seen in its photo
                                                                      (what is not its mask, 0.4–4 mm, outside the
                                                                      parts the map already places): each one's middle,
                                                                      length, width and angle in mm, and what it looks
                                                                      like (a tan capacitor, a black resistor or chip,
                                                                      a grey inductor, a white LED)
  colour     REAL.json DRAWN.json --at X,Z[:R] ... [--now 0xRRGGBB]  the same places' colour in a photo and a render
                                                                      of the drawing, and the colour to draw it to match
  traces     cal.json [--map boardmap.json] --out traces.png [--ts NAME:file.ts] [--res 10] [--lift 8]
                                                                      the copper under a board's mask as its photo shows
                                                                      it (traces, planes, vias), on the board's own mm
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
        m = json.load(open(a.map))
        for p in m['parts']:
            if p.get('side', 'top') != 'top': continue
            cs = np.array(p['corners']); mid = cs.mean(axis=0); cs = mid + (cs - mid) * 1.06 + np.sign(cs - mid) * 0.35
            cv2.fillPoly(keep, [np.int32([to_px(c, x, z) for x, z in cs])], 0)
        for w in m.get('silk', []):
            cv2.fillPoly(keep, [np.int32([to_px(c, x, z) for x, z in w['corners']])], 0)
        for h in m.get('holes', []):
            X, Y = to_px(c, *h['at']); cv2.circle(keep, (int(X), int(Y)), int(h['pad'] / 2 * c['scale_px_per_mm'] + 3), 0, -1)
    for sk in a.skip or []:   # (regions known to hold no part: a logo, a drawing printed on the board)
        x0_, z0_, x1_, z1_ = map(float, sk.split(':')); cv2.fillPoly(keep, [np.int32([to_px(c, x, z) for x, z in [(x0_, z0_), (x1_, z0_), (x1_, z1_), (x0_, z1_)]])], 0)
    keep = keep.astype(bool)
    # (a part is tan (a ceramic body, a moulded inductor's) with its bright tin ends, or dark (a resistor's body, a small
    # chip's or transistor's): two masks, so a dark shadow between two tan parts does not join them, each opened to drop
    # thin traces; the board's blue mask, its white silkscreen and the ground are neither)
    blue = (H_ >= 90) & (H_ <= 130) & (S_ >= 90); white = (S_ < 30) & (V_ > 215)
    bright = (V_ > 170) & (S_ < 70) & ~white
    tanpx = (H_ >= 5) & (H_ <= 35) & (S_ >= 12) & (V_ >= 100) & ~white
    darkpx = (V_ < 125) & ~blue & ~tanpx
    # (a body's holes filled: its marking, a greyer patch, a highlight are still the part)
    masks = [(k, ndimage.binary_fill_holes(ndimage.binary_opening(m & keep, iterations=1))) for k, m in (('tan', (tanpx | bright) & ~blue), ('dark', darkpx))]
    # (parts side by side touch through their pads: each blob eroded until it is one part, a little more each pass,
    # what is taken at one pass left out of the next; each measured with what erosion took from it put back)
    pxmm = c.get('scale_px_per_mm') or 9.7; out = []; unnamed = []
    CASES = [(0.42, '0201', 0.6, 0.3), (0.66, '0402', 1.0, 0.5), (1.0, '0603', 1.6, 0.8), (1.45, '0805', 2.0, 1.25), (9, '1206', 3.2, 1.6)]
    why = [to_px(c, *map(float, w.split(','))) for w in (a.why or [])]
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
    json.dump({'photo': c['photo'], 'count': len(out), 'parts': out, 'unnamed': unnamed}, open(a.out, 'w'), indent=0)
    if a.ts:   # the same as a TypeScript table a board's data imports: NAME:path.ts
        name, path = a.ts.split(':', 1); k = {'capacitor': 'c', 'resistor': 'r', 'sot23': 't', 'chip': 'q', 'inductor': 'l', 'unseen': 'p'}
        rows = ["['%s', %.2f, %.2f, %.2f, %.2f, %d%s]" % (k['unseen' if p.get('unseen') else p['kind']], p['at'][0], p['at'][1], p['L'], p['W'], int(p['dir']), ", '%s'" % p['pkg'] if 'pkg' in p else '') for p in out]
        body = ',\n  '.join(', '.join(rows[i:i + 6]) for i in range(0, len(rows), 6))
        open(path, 'w').write(f"""// {a.board or 'A board'}'s small parts, as its photo shows them: found by tools/measure/photo.py small on its photo
// calibrated by known points (what is neither its mask nor its silkscreen, outside the parts and words its layout
// places, 0.45-4 mm across; rows of chips touching split by their width; each put to the nearest EIA case by its width).
// Generated: re-run the tool and this file is written again. The smallest (0201s in dense clusters, three pixels wide in
// a photo of 10 px/mm) are below what the photo resolves, so some are missed; none is placed that the photo does not
// show. Each row: c capacitor, r resistor, t a small transistor package (its package last, SOT-23 or SOT-323 by its
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
    def med(c, im, x, z, r):
        X, Y = to_px(c, x, z); R = max(1, r * c['scale_px_per_mm']); yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
        return np.median(im[(xx - X) ** 2 + (yy - Y) ** 2 <= R * R], axis=0)[::-1] / 255.0   # (RGB, 0..1)
    ratios = []
    for spec in a.at:
        xz, _, r = spec.partition(':'); x, z = map(float, xz.split(',')); r = float(r or 1.5)
        pr, pd = med(cr, ir, x, z, r), med(cd, idr, x, z, r); ratios.append(lin(pr) / np.maximum(lin(pd), 1e-4))
        print('(%.1f, %.1f) r %.1f mm: real #%s, drawn #%s' % (x, z, r, ''.join('%02x' % int(round(v * 255)) for v in pr), ''.join('%02x' % int(round(v * 255)) for v in pd)))
    if a.now:
        now = np.array([int(a.now.replace('0x', '').replace('#', '')[i:i + 2], 16) / 255 for i in (0, 2, 4)])
        new = srgb(np.clip(lin(now) * np.median(np.array(ratios), axis=0), 0, 1))
        print('drawn now 0x%s; to match: 0x%s' % (a.now.replace('0x', '').replace('#', ''), ''.join('%02x' % int(round(v * 255)) for v in new)))


def cmd_traces(a):
    """Where a board's photo shows copper under its solder mask: its traces, planes' edges and vias, lighter than the bare
    mask round them. The photo is rectified to the board's own millimetres (R px/mm, its far edge at the top), the mask
    told by its hue, and a pixel taken as copper where it stands lighter than the mask's median round it by more than
    --lift; specks smaller than --speck pixels dropped; the parts and words the drawing places left out. Written as a
    grey PNG (copper white), and with --ts as a data URL a board's data imports."""
    c = load(a.cal); im = cv2.imread(c['photo']); R = a.res; m = json.load(open(a.map)) if a.map else {'parts': [], 'silk': []}
    L, W = m.get('L', a.L), m.get('W', a.W); w, h = int(round(L * R)), int(round(W * R))
    # (each output pixel's place in mm, mapped into the photo by its calibration)
    M = c['H'] @ np.array([[1 / R, 0, 0.5 / R], [0, -1 / R, W - 0.5 / R], [0, 0, 1]])
    rect = cv2.warpPerspective(im, M, (w, h), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
    hsv = cv2.cvtColor(rect, cv2.COLOR_BGR2HSV).astype(int); H_, S_, V_ = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    blue = (H_ >= 90) & (H_ <= 130) & (S_ >= 90)
    keep = np.ones((h, w), np.uint8)
    tp = lambda x, z: (x * R, (W - z) * R)
    for p in m.get('parts', []):
        if p.get('side', 'top') != 'top': continue
        cs = np.array(p['corners']); mid = cs.mean(axis=0); cs = mid + (cs - mid) * 1.04 + np.sign(cs - mid) * 0.25
        cv2.fillPoly(keep, [np.int32([tp(x, z) for x, z in cs])], 0)
    for s_ in m.get('silk', []): cv2.fillPoly(keep, [np.int32([tp(x, z) for x, z in s_['corners']])], 0)
    for hl in m.get('holes', []): X, Y = tp(*hl['at']); cv2.circle(keep, (int(X), int(Y)), int(hl['pad'] / 2 * R + 2), 0, -1)
    v = V_.astype(np.uint8); bg = cv2.medianBlur(v, a.win | 1); d = V_ - bg.astype(int)
    # (copper is a little lighter, still the mask's blue: not the bright metal of a pad or a part, nor its halo)
    cu = blue & (d > a.lift) & (d < 45) & keep.astype(bool)
    near = ndimage.binary_dilation(~blue | ~keep.astype(bool), iterations=2); cu &= ~near
    # (a trace is a line: kept where a run of --run pixels along one of four directions lies in it)
    k = a.run; lines = np.zeros_like(cu)
    for ker in (np.ones((1, k), bool), np.ones((k, 1), bool), np.eye(k, dtype=bool), np.fliplr(np.eye(k, dtype=bool))):
        lines |= ndimage.binary_opening(cu, structure=ker)
    lab, n = ndimage.label(lines); sizes = ndimage.sum(lines, lab, range(1, n + 1)); big = np.isin(lab, 1 + np.nonzero(sizes >= a.speck)[0])
    out = (big * 255).astype(np.uint8); cv2.imwrite(a.out, out)
    print('%s: %d × %d px at %g px/mm, %.1f %% of the board copper under its mask' % (a.out, w, h, R, 100 * big.mean()))
    if a.ts:
        import base64
        name, path = a.ts.split(':', 1); ok, png = cv2.imencode('.png', out, [cv2.IMWRITE_PNG_BILEVEL, 1]); b64 = base64.b64encode(png.tobytes()).decode()
        open(path, 'w').write(f"""// {a.board or 'A board'}'s copper under its solder mask, as its photo shows it: found by tools/measure/photo.py traces
// on its photo calibrated by known points (rectified to the board at {R:g} px/mm, its far edge at the top; copper where
// the photo stands lighter than the mask round it; the parts and words its layout places left out, so under them it is
// not known). Generated: re-run the tool and this file is written again. A PNG, copper white, {w} x {h} px.
export const {name} = {{ res: {R:g}, w: {w}, h: {h}, png: 'data:image/png;base64,{b64}' }};
"""); print(path, len(b64), 'chars')


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
    p = sp.add_parser('small'); p.add_argument('cal'); p.add_argument('--map'); p.add_argument('--erode', type=int, default=2); p.add_argument('--ts'); p.add_argument('--board'); p.add_argument('--box'); p.add_argument('--out', required=True); p.add_argument('--show'); p.add_argument('--why', action='append', help='X,Z (mm): say how the blob there was taken or why it was not'); p.add_argument('--skip', action='append', help='X0:Z0:X1:Z1 (mm): a region known to hold no part (a logo)'); p.set_defaults(f=cmd_small)
    p = sp.add_parser('colour'); p.add_argument('real'); p.add_argument('drawn'); p.add_argument('--at', action='append', required=True); p.add_argument('--now'); p.set_defaults(f=cmd_colour)
    p = sp.add_parser('traces'); p.add_argument('cal'); p.add_argument('--map'); p.add_argument('--res', type=float, default=10); p.add_argument('--win', type=int, default=15); p.add_argument('--lift', type=int, default=8); p.add_argument('--speck', type=int, default=12); p.add_argument('--run', type=int, default=7); p.add_argument('--L', type=float, default=100); p.add_argument('--W', type=float, default=62); p.add_argument('--out', required=True); p.add_argument('--ts'); p.add_argument('--board'); p.set_defaults(f=cmd_traces)
    p = sp.add_parser('same'); p.add_argument('cals', nargs='+'); p.add_argument('--region', required=True); p.add_argument('--up', type=float, default=0); p.add_argument('--h', type=int, default=360); p.add_argument('--out', required=True); p.set_defaults(f=cmd_same)
    a = ap.parse_args(); a.f(a)


if __name__ == '__main__':
    main()

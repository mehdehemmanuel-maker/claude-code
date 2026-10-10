"""Measure a closed mesh (an STL) as loft stations: cut it across an axis every so many millimetres and, for each cut,
the section's extent across it two ways (its bottom and top one way, its half-width and middle the other) and how square
it is (the superellipse exponent whose area, in that box, is the section's own: 2 an ellipse, more a squarer one).
Those are what src/nexus/form.ts's Loft takes, so a part whose maker publishes only its mesh is drawn as its measured
sections, not its mesh copied. Measured facts only: the sections' sizes, never the triangles.

  python -I meshloft.py loft FILE.stl --along z --up x [--step 10] [--clip "x>25,z<0"] [--scale 1000]
  python -I meshloft.py volume FILE.stl [--scale 1000]
  python -I meshloft.py ts NAME OUT.ts "SOURCE" "label=FILE.stl:along:up[:clip]" ... [--step 10] [--scale 1000]

`--along` is the axis cut across (the loft's own x), `--up` the one its bottom and top are along (the loft's y); the
third is the right-handed rest (the loft's z: its half-width and middle). Units out are the mesh's times `--scale`
(1000 for a mesh in metres, out in millimetres). `--clip` keeps only the part of the mesh a box says (each term an axis,
< or >, a value, in output units), to measure one piece of an L-shaped part on its own.
"""
import argparse, json, math, struct, sys

AX = {'x': 0, 'y': 1, 'z': 2}


def read_stl(path, scale):
    b = open(path, 'rb').read()
    tris = []
    if b[:5] == b'solid' and b'facet' in b[:400]:
        pts = [tuple(float(v) * scale for v in line.split()[1:4]) for line in b.decode(errors='ignore').splitlines() if line.strip().startswith('vertex')]
        tris = [pts[i:i + 3] for i in range(0, len(pts) - 2, 3)]
    else:
        n = struct.unpack('<I', b[80:84])[0]
        for i in range(n):
            v = struct.unpack('<9f', b[84 + i * 50 + 12:84 + i * 50 + 48])
            tris.append([tuple(v[j] * scale for j in range(k, k + 3)) for k in (0, 3, 6)])
    return tris


def volume(tris):
    # (the signed volumes of the tetrahedra each face makes with the origin, summed: the closed mesh's volume)
    return abs(sum((a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6 for a, b, c in tris))


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def area(poly):
    return abs(sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))) / 2


def ratio(n):
    # (a superellipse |u/a|^n + |v/b|^n = 1 fills this share of its 2a × 2b box)
    return math.gamma(1 + 1 / n) ** 2 / math.gamma(1 + 2 / n)


def squareness(share):
    lo, hi = 1.5, 12.0
    if share <= ratio(lo):
        return lo
    if share >= ratio(hi):
        return hi
    for _ in range(50):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if ratio(m) < share else (lo, m)
    return (lo + hi) / 2


def clipper(spec):
    terms = []
    for t in filter(None, (spec or '').split(',')):
        t = t.strip()
        op = '<' if '<' in t else '>'
        a, v = t.split(op)
        terms.append((AX[a.strip()], op, float(v)))
    return lambda p: all((p[a] < v) if op == '<' else (p[a] > v) for a, op, v in terms)


def section(tris, a, v, keep):
    out = []
    for t in tris:
        for i in range(3):
            p, q = t[i], t[(i + 1) % 3]
            if (p[a] - v) * (q[a] - v) < 0:
                f = (v - p[a]) / (q[a] - p[a])
                c = tuple(p[k] + (q[k] - p[k]) * f for k in range(3))
                if keep(c):
                    out.append(c)
    return out


def loft(tris, along, up, step, keep):
    a, u = AX[along], AX[up]
    # (the third axis the right-handed rest: along × up)
    w = 3 - a - u
    sign = 1 if (a, u) in ((0, 1), (1, 2), (2, 0)) else -1
    vals = [p[a] for t in tris for p in t if keep(p)]
    lo, hi = min(vals), max(vals)
    cuts = [lo + 0.6] + [lo + step * k for k in range(1, int((hi - lo) / step) + 1) if lo + step * k < hi - 0.6] + [hi - 0.6]
    st = []
    for x in cuts:
        pts = section(tris, a, x + 0.013, keep)
        if len(pts) < 3:
            continue
        yz = [(p[u], sign * p[w]) for p in pts]
        ys, zs = [p[0] for p in yz], [p[1] for p in yz]
        y0, y1, z0, z1 = min(ys), max(ys), min(zs), max(zs)
        box = (y1 - y0) * (z1 - z0)
        share = area(hull([(round(p[0], 3), round(p[1], 3)) for p in yz])) / box if box > 0 else 1
        # (a faceted round reads as less than an ellipse, its polygon inside its circle: no less than one taken)
        st.append({"x": round(x, 1), "w": round((z1 - z0) / 2, 1), "lo": round(y0, 1), "hi": round(y1, 1), "n": round(max(2.0, squareness(share)), 2), 'z': round((z0 + z1) / 2, 1)})
    return st


def ts(name, out, source, specs, step, scale):
    # (each piece its label, the axis it runs along and the one its bottom and top are along, its stations, and its
    # mesh's whole volume, cm3, to weigh it by)
    rows = []
    for spec in specs:
        label, rest = spec.split('=', 1)
        f, along, up, *clip = rest.split(':')
        tris = read_stl(f, scale)
        st = loft(tris, along, up, step, clipper(clip[0] if clip else ''))
        rows.append(f"  {{ label: {json.dumps(label)}, along: '{along}', up: '{up}', cm3: {round(volume(tris) / 1000, 1)}, st: {json.dumps(st, separators=(',', ':'))} }},")
    head = (f"// Generated by tools/measure/meshloft.py from {source}: each piece's sections, measured across the axis it runs\n"
            f"// along every {step:g} mm (its bottom and top, half-width and middle, mm, and how square: Loft's stations), and its\n"
            "// mesh's volume. Sizes measured, no triangles copied. Do not edit by hand: rerun the tool.\n\n"
            "export interface MeshLoft { label: string; along: 'x' | 'y' | 'z'; up: 'x' | 'y' | 'z'; cm3: number; st: { x: number; w: number; lo: number; hi: number; n: number; z: number }[] }\n")
    open(out, 'w').write(head + f"export const {name}: MeshLoft[] = [\n" + '\n'.join(rows) + '\n];\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['loft', 'volume', 'ts'])
    ap.add_argument('file')
    ap.add_argument('rest', nargs='*')
    ap.add_argument('--along', default='z')
    ap.add_argument('--up', default='x')
    ap.add_argument('--step', type=float, default=10)
    ap.add_argument('--clip', default='')
    ap.add_argument('--scale', type=float, default=1)
    o = ap.parse_args()
    if o.cmd == 'ts':
        ts(o.file, o.rest[0], o.rest[1], o.rest[2:], o.step, o.scale)
        return
    tris = read_stl(o.file, o.scale)
    if o.cmd == 'volume':
        print(json.dumps({'volume': round(volume(tris), 1), 'faces': len(tris)}))
        return
    json.dump(loft(tris, o.along, o.up, o.step, clipper(o.clip)), sys.stdout)
    print()


if __name__ == '__main__':
    main()

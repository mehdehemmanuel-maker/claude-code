#!/usr/bin/env python3
"""Read a maker's 3D assembly in STEP (ISO 10303-21, AP203/AP214: what Fusion 360, SOLIDWORKS, Onshape and FreeCAD
export; the Voron 2.4 is published so): every part's name, its place in the assembly (the product tree's transforms
composed down from the root), the box its own boundary spans in its own frame, how much of each box face its flat faces
cover, and the material and colour the model gives it. The same rows tools/measure/xml3d.py writes for a 3DXML model,
read straight from the file's entities, no CAD kernel: a 240 MB assembly reads in minutes.

  tree   model.step                      the product tree: each instance, its product's name, its depth
  parts  model.step [--json out.json]    every part drawn (an instance whose product has a solid): path, size, world box
  count  model.step                      how many of each part by name (the model's bill of materials)
  ts     model.step --id ID --name NAME --src SRC [--out file.ts]
                                         the parts as a TypeScript data file for src/nexus/machines/makermodel.ts

How the boundary is measured: each edge of each solid is walked along its curve (lines end to end, circles and ellipses
by angle from vertex to vertex, B-splines evaluated by de Boor's algorithm), so a hole's or a boss's round extent is
in the box and not only its vertices. A sphere's cap adds its pole. A curved face's bulge between its edges (a torus, a
B-spline surface) is not walked: the box is its edges' box. The middle is the edges' length-weighted middle (which end
is heavier). A box face's cover is the area of the flat faces lying in its plane and facing along its axis, each face
its outer loop less its holes, over the box face's area. Its outline: the convex hull of its edges seen along whichever
of its axes shows it least like its box, cut to 20 corners (`outline`): a measure, as a drawing's outline is.

Units are the file's (mm for these exports; a conversion-based unit is refused, not guessed).
"""
import argparse, json, math, re, sys

TOK = re.compile(r"'(?:[^']|'')*'|#\d+|\.[A-Z_0-9]+\.|[-+]?\d+\.?\d*(?:[Ee][-+]?\d+)?|\$|\*|[A-Za-z_][A-Za-z_0-9]*|[(),]")


def load(path):
    """The DATA section as {id: body}: each record's text after '#id=', joined across its lines."""
    txt = open(path, encoding='latin-1').read()
    if 'CONVERSION_BASED_UNIT' in txt: sys.exit('the file uses a conversion-based length unit: not read (mm expected)')
    data = txt[txt.index('DATA;') + 5: txt.rindex('ENDSEC;')]
    E = {}
    for rec in data.split(';\n'):
        rec = rec.strip()
        if not rec.startswith('#'): continue
        i = rec.index('=')
        E[int(rec[1:i])] = rec[i + 1:].replace('\n', '').replace('\r', '')
    return E


def parse(body):
    """One record: ('TYPE', [args]) or ('COMPLEX', {TYPE: [args]}). A reference reads as an int, a number as a float,
    a string as str, an enum as '.X.', '$' as None, a typed value as (TYPE, [args])."""
    toks = TOK.findall(body); pos = 0
    def val():
        nonlocal pos
        t = toks[pos]; pos += 1
        if t == '(':
            out = []
            while toks[pos] != ')':
                out.append(val())
                if toks[pos] == ',': pos += 1
            pos += 1; return out
        if t[0] == '#': return int(t[1:])
        if t[0] == "'": return t[1:-1].replace("''", "'")
        if t == '$': return None
        if t == '*' or t[0] == '.': return t
        if t[0].isalpha() or t[0] == '_':
            if pos < len(toks) and toks[pos] == '(': return (t, val())
            return t
        return float(t)
    v = val()
    if isinstance(v, tuple): return v
    return ('COMPLEX', {t[0]: t[1] for t in v if isinstance(t, tuple)})


class Model:
    def __init__(s, E): s.E = E; s.P = {}; s.edges = {}

    def ent(s, i):
        p = s.P.get(i)
        if p is None: p = s.P[i] = parse(s.E[i])
        return p

    def drop(s): s.P = {}

    def pt(s, i): return s.ent(i)[1][1]

    def dirn(s, i):
        if i is None: return None
        v = s.ent(i)[1][1]; L = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / L for x in v]

    def place(s, i):
        """An AXIS2_PLACEMENT_3D as (origin, x, y, z), orthonormal."""
        a = s.ent(i)[1]; o = s.pt(a[1]); z = s.dirn(a[2]) or [0.0, 0.0, 1.0]; x = s.dirn(a[3]) if len(a) > 3 else None
        if x is None: x = [1.0, 0.0, 0.0] if abs(z[0]) < 0.9 else [0.0, 1.0, 0.0]
        d = sum(x[k] * z[k] for k in range(3)); x = [x[k] - d * z[k] for k in range(3)]; L = math.sqrt(sum(c * c for c in x)) or 1.0; x = [c / L for c in x]
        y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
        return o, x, y, z

    def m4(s, i):
        o, x, y, z = s.place(i)
        return [[x[0], y[0], z[0], o[0]], [x[1], y[1], z[1], o[1]], [x[2], y[2], z[2], o[2]], [0, 0, 0, 1]]

    # ---- curves ----
    def curve(s, c, a, b, same):
        """Points along curve c from point a to point b (the edge's vertices), same: the edge runs with the curve."""
        t, args = s.ent(c)
        if t in ('SURFACE_CURVE', 'SEAM_CURVE'): return s.curve(args[1], a, b, same)
        if t == 'LINE': return [a, b]
        if t in ('CIRCLE', 'ELLIPSE'):
            o, x, y, z = s.place(args[1]); r1 = args[2]; r2 = args[3] if t == 'ELLIPSE' else r1
            ang = lambda p: math.atan2(sum((p[k] - o[k]) * y[k] for k in range(3)) / r2, sum((p[k] - o[k]) * x[k] for k in range(3)) / r1)
            a1, a2 = ang(a), ang(b); full = sum((a[k] - b[k]) ** 2 for k in range(3)) < 1e-12
            if same: da = 2 * math.pi if full else (a2 - a1) % (2 * math.pi)
            else: da = -2 * math.pi if full else -((a1 - a2) % (2 * math.pi))
            n = max(2, math.ceil(abs(da) / (math.pi / 12)))
            return [[o[k] + r1 * math.cos(a1 + da * j / n) * x[k] + r2 * math.sin(a1 + da * j / n) * y[k] for k in range(3)] for j in range(n + 1)]
        if t == 'B_SPLINE_CURVE_WITH_KNOTS':
            pts = s.bspline(int(args[1]), [s.pt(q) for q in args[2]], args[6], args[7], None)
        elif t == 'COMPLEX' and 'B_SPLINE_CURVE' in args:
            bc, bk = args['B_SPLINE_CURVE'], args.get('B_SPLINE_CURVE_WITH_KNOTS')
            if not bk: return [a, b]
            w = args.get('RATIONAL_B_SPLINE_CURVE', [None])[0]
            pts = s.bspline(int(bc[0]), [s.pt(q) for q in bc[1]], bk[0], bk[1], w)
        else: return [a, b]
        d0 = sum((pts[0][k] - a[k]) ** 2 for k in range(3)); d1 = sum((pts[-1][k] - a[k]) ** 2 for k in range(3))
        return pts if d0 <= d1 else pts[::-1]

    @staticmethod
    def bspline(p, cps, mults, knots, w):
        U = [k for k, m in zip(knots, mults) for _ in range(int(m))]; n = len(cps) - 1
        if len(U) != n + p + 2: return cps
        H = [[c[0] * (w[i] if w else 1), c[1] * (w[i] if w else 1), c[2] * (w[i] if w else 1), (w[i] if w else 1)] for i, c in enumerate(cps)]
        lo, hi = U[p], U[n + 1]; N = min(64, max(8, 3 * (n + 1))); out = []
        for j in range(N + 1):
            u = lo + (hi - lo) * j / N
            k = p
            while k < n and U[k + 1] <= u: k += 1
            d = [H[k - p + i][:] for i in range(p + 1)]
            for r in range(1, p + 1):
                for i in range(p, r - 1, -1):
                    den = U[i + k - p + 1 + p - r] - U[i + k - p]
                    al = 0 if den == 0 else (u - U[i + k - p]) / den
                    d[i] = [(1 - al) * d[i - 1][c] + al * d[i][c] for c in range(4)]
            h = d[p]; out.append([h[0] / h[3], h[1] / h[3], h[2] / h[3]])
        return out

    def edge(s, e):
        """An EDGE_CURVE's points from its first vertex to its second (cached: two faces share each edge)."""
        q = s.edges.get(e)
        if q is None:
            a = s.ent(e)[1]; v1 = s.pt(s.ent(a[1])[1][1]); v2 = s.pt(s.ent(a[2])[1][1])
            q = s.edges[e] = s.curve(a[3], v1, v2, a[4] == '.T.')
        return q

    def loop(s, lp):
        """A loop's points in order, and whether it is a vertex loop (no area)."""
        t, a = s.ent(lp)
        if t != 'EDGE_LOOP': return []
        out = []
        for oe in a[1]:
            o = s.ent(oe)[1]; q = s.edge(o[3])
            out.extend(q if o[4] == '.T.' else q[::-1])
        return out

    def solid_faces(s, root):
        """Every ADVANCED_FACE under a solid (through its shells)."""
        out, seen, todo = [], set(), [root]
        while todo:
            i = todo.pop()
            if i in seen: continue
            seen.add(i); t, a = s.ent(i)
            if t == 'ADVANCED_FACE' or t == 'FACE_SURFACE': out.append(i); continue
            if t in ('MANIFOLD_SOLID_BREP',): todo.append(a[1])
            elif t == 'BREP_WITH_VOIDS': todo.append(a[1]); todo.extend(a[2])
            elif t in ('CLOSED_SHELL', 'OPEN_SHELL'): todo.extend(a[1])
            elif t == 'ORIENTED_CLOSED_SHELL': todo.append(a[2])
            elif t == 'SHELL_BASED_SURFACE_MODEL': todo.extend(a[1])
        return out

    def measure(s, solids):
        """The box, edges' middle and box faces' cover of a set of solids, each (solid, its transform into the frame
        measured in, or None), in that frame."""
        pts, segs, flats = [], [0.0, 0.0, 0.0, 0.0], []
        for so, m in solids:
            tp = (lambda q: q) if m is None else (lambda q: [apply(m, x) for x in q])
            for f in s.solid_faces(so):
                a = s.ent(f)[1]; loops = []
                for b in a[1]:
                    bt, ba = s.ent(b); q = tp(s.loop(ba[1])); loops.append((bt == 'FACE_OUTER_BOUND', q)); pts.extend(q)
                    for j in range(len(q) - 1):
                        L = math.dist(q[j], q[j + 1]); segs[3] += L
                        for k in range(3): segs[k] += L * (q[j][k] + q[j + 1][k]) / 2
                st, sa = s.ent(a[2])
                if st == 'PLANE':
                    o, x, y, z = s.place(sa[1])
                    if m is not None: o = apply(m, o); z = [sum(m[i][k] * z[k] for k in range(3)) for i in range(3)]
                    flats.append((z, o, loops))
                elif st == 'SPHERICAL_SURFACE':
                    o = s.place(sa[1])[0]; r = sa[2]; ring = [p for _, q in loops for p in q]
                    if m is not None: o = apply(m, o)
                    if not ring: pts.extend([[o[0] + d * r * (k == 0), o[1] + d * r * (k == 1), o[2] + d * r * (k == 2)] for k in range(3) for d in (-1, 1)]); continue
                    g = [sum(p[k] for p in ring) / len(ring) - o[k] for k in range(3)]; L = math.sqrt(sum(c * c for c in g))
                    if L > 1e-6 * r: pts.append([o[k] + r * g[k] / L for k in range(3)])
        if not pts: return None
        lb = [[min(p[k] for p in pts) for k in range(3)], [max(p[k] for p in pts) for k in range(3)]]
        ext = [lb[1][k] - lb[0][k] for k in range(3)]; acc = [0.0] * 6
        for n, o, loops in flats:
            area = lambda q: abs(sum(n[k] * sum((q[j][(k + 1) % 3] * q[j + 1][(k + 2) % 3] - q[j][(k + 2) % 3] * q[j + 1][(k + 1) % 3]) for j in range(len(q) - 1)) for k in range(3))) / 2
            ar = [(outer, area(q)) for outer, q in loops if len(q) > 2]
            if not ar: continue
            out = [x for o_, x in ar if o_] or [max(x for _, x in ar)]; A = max(0.0, out[0] - (sum(x for _, x in ar) - out[0]))
            for k in range(3):
                if abs(n[k]) < 0.9: continue
                tol = max(0.6, 0.03 * ext[k])
                if abs(o[k] - lb[0][k]) < tol: acc[2 * k] += A
                if abs(o[k] - lb[1][k]) < tol: acc[2 * k + 1] += A
        fa = [ext[1] * ext[2], ext[0] * ext[2], ext[0] * ext[1]]
        faces = [round(min(1.0, acc[i] / fa[i // 2]), 2) if fa[i // 2] > 0 else 0 for i in range(6)]
        mid = [segs[k] / segs[3] for k in range(3)] if segs[3] > 0 else [(lb[0][k] + lb[1][k]) / 2 for k in range(3)]
        return lb, mid, faces, outline(pts, lb)


def hull2(ps):
    """The convex hull of 2D points, counter-clockwise (Andrew's monotone chain)."""
    ps = sorted(set((round(x, 3), round(y, 3)) for x, y in ps))
    if len(ps) < 3: return ps
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in ps:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(ps):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    return lo[:-1] + hi[:-1]


def area2(q):
    return abs(sum(q[i][0] * q[(i + 1) % len(q)][1] - q[(i + 1) % len(q)][0] * q[i][1] for i in range(len(q)))) / 2


def outline(pts, lb, n=20):
    """A part's outline seen along whichever of its own axes shows it least like its box: the convex hull of its edges
    projected along that axis, cut to n corners by dropping the corner that adds least area each time (Visvalingam), in
    the other two axes' order (axis k: (k+1) % 3, (k+2) % 3), about its box's middle; with how much of its box's face the
    outline fills. A measure of its shape from one side, as a drawing's outline is, not its surface."""
    best = None
    for k in range(3):
        u, v = (k + 1) % 3, (k + 2) % 3
        fa = (lb[1][u] - lb[0][u]) * (lb[1][v] - lb[0][v])
        if fa <= 0: continue
        cu, cv = (lb[0][u] + lb[1][u]) / 2, (lb[0][v] + lb[1][v]) / 2
        q = hull2([(p[u] - cu, p[v] - cv) for p in pts])
        while len(q) > n:
            i = min(range(len(q)), key=lambda j: area2([q[j - 1], q[j], q[(j + 1) % len(q)]]))
            q.pop(i)
        if len(q) < 3: continue
        r = area2(q) / fa
        if best is None or r < best[0]: best = (r, k, q)
    if not best: return None
    return [best[1], round(best[0], 3), [round(c, 1) for p in best[2] for c in p]]


def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def inv(m):
    """A rigid transform's inverse."""
    R = [[m[j][i] for j in range(3)] for i in range(3)]; t = [-sum(R[i][k] * m[k][3] for k in range(3)) for i in range(3)]
    return [R[0] + [t[0]], R[1] + [t[1]], R[2] + [t[2]], [0, 0, 0, 1]]


def apply(m, p):
    return [m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] for i in range(3)]


I4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]


def tree(M):
    """The product tree: product definitions with their names, solids and materials; instances with their transforms."""
    E = M.E; byt = {}
    want = ('PRODUCT(', 'PRODUCT_DEFINITION_FORMATION', 'PRODUCT_DEFINITION(', 'PRODUCT_DEFINITION_SHAPE', 'SHAPE_DEFINITION_REPRESENTATION', 'NEXT_ASSEMBLY_USAGE_OCCURRENCE',
            'CONTEXT_DEPENDENT_SHAPE_REPRESENTATION', 'SHAPE_REPRESENTATION_RELATIONSHIP(', 'ADVANCED_BREP_SHAPE_REPRESENTATION', 'MANIFOLD_SURFACE_SHAPE_REPRESENTATION',
            'PROPERTY_DEFINITION(', 'PROPERTY_DEFINITION_REPRESENTATION', 'STYLED_ITEM')
    for i, b in E.items():
        for w in want:
            if b.startswith(w): byt.setdefault(w.rstrip('('), []).append(i); break
    name = {}
    for i in byt.get('PRODUCT_DEFINITION', []):
        a = M.ent(i)[1]; pr = M.ent(M.ent(a[2])[1][2])[1]; name[i] = pr[1] or pr[0]
    pds_of = {}
    for i in byt.get('PRODUCT_DEFINITION_SHAPE', []): pds_of[i] = M.ent(i)[1][2]
    sr_of = {}
    for i in byt.get('SHAPE_DEFINITION_REPRESENTATION', []):
        a = M.ent(i)[1]; d = pds_of.get(a[0])
        if d in name: sr_of[d] = a[1]
    geo = {}
    for i in byt.get('SHAPE_REPRESENTATION_RELATIONSHIP', []):
        a = M.ent(i)[1]
        for x, y in ((a[2], a[3]), (a[3], a[2])):
            if E[y].startswith(('ADVANCED_BREP', 'MANIFOLD_SURFACE')): geo.setdefault(x, []).append(y)
    for i in byt.get('ADVANCED_BREP_SHAPE_REPRESENTATION', []) + byt.get('MANIFOLD_SURFACE_SHAPE_REPRESENTATION', []): geo.setdefault(i, []).append(i)
    solids = {}
    for d, sr in sr_of.items():
        for g in geo.get(sr, []):
            for it in M.ent(g)[1][1]:
                if E[it].startswith(('MANIFOLD_SOLID_BREP', 'BREP_WITH_VOIDS', 'SHELL_BASED_SURFACE_MODEL')): solids.setdefault(d, []).append(it)
    # materials: Fusion's 'material name' and 'density of part' properties on a product definition
    rep_of = {}
    for i in byt.get('PROPERTY_DEFINITION_REPRESENTATION', []):
        a = M.ent(i)[1]; rep_of[a[0]] = a[1]
    mat = {}
    for i in byt.get('PROPERTY_DEFINITION', []):
        a = M.ent(i)[1]
        if a[0] != 'material property' or a[2] not in name or i not in rep_of: continue
        it = M.ent(M.ent(rep_of[i])[1][1][0])
        if a[1] == 'material name': mat.setdefault(a[2], {})['mat'] = it[1][1] or it[1][0]
        elif a[1] == 'density of part':
            v = it[1][1]; mat.setdefault(a[2], {})['rho'] = v[1][0] if isinstance(v, tuple) else v
    # colours: a solid's styled item down to its COLOUR_RGB
    colour = {}
    for i in byt.get('STYLED_ITEM', []):
        a = M.ent(i)[1]; todo = list(a[1]); seen = set()
        while todo:
            j = todo.pop()
            if j in seen or not isinstance(j, int): continue
            seen.add(j); t, b = M.ent(j)
            if t == 'COLOUR_RGB': colour[a[2]] = (b[0], round(b[1] * 255) << 16 | round(b[2] * 255) << 8 | round(b[3] * 255)); break
            if t == 'DRAUGHTING_PRE_DEFINED_COLOUR': break
            for x in b:
                if isinstance(x, int): todo.append(x)
                elif isinstance(x, list): todo.extend(y for y in x if isinstance(y, int))
                elif isinstance(x, tuple): todo.extend(y for y in x[1] if isinstance(y, int))
    # instances: NAUO parent -> child, its transform from its CDSR
    nauo = {}
    for i in byt.get('NEXT_ASSEMBLY_USAGE_OCCURRENCE', []):
        a = M.ent(i)[1]; nauo[i] = (a[0] or a[1], a[3], a[4])
    place = {}
    for i in byt.get('CONTEXT_DEPENDENT_SHAPE_REPRESENTATION', []):
        a = M.ent(i)[1]; n = pds_of.get(a[1])
        if n not in nauo: continue
        rr = M.ent(a[0])
        parts = rr[1] if rr[0] == 'COMPLEX' else {rr[0]: rr[1]}
        r1, r2 = parts['REPRESENTATION_RELATIONSHIP'][2], parts['REPRESENTATION_RELATIONSHIP'][3]
        tr = parts['REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION'][0]; tt, ta = M.ent(tr)
        if tt != 'ITEM_DEFINED_TRANSFORMATION': sys.exit(f'transform #{tr} is {tt}: not read')
        A, B = M.m4(ta[2]), M.m4(ta[3])
        _, parent, child = nauo[n]
        # rep_1 holds item_1 and rep_2 item_2; the child's frame goes to the parent's: from the child's item to the parent's
        if sr_of.get(child) == r1 or sr_of.get(parent) == r2: place[n] = mul(B, inv(A))
        else: place[n] = mul(A, inv(B))
    kids = {}
    for n, (nm, parent, child) in nauo.items(): kids.setdefault(parent, []).append((n, nm, child))
    roots = [d for d in name if d not in {c for _, _, c in nauo.values()}]
    return name, solids, mat, colour, kids, place, roots


def walk(M, info, drop=(), whole=()):
    """Every part drawn, its world place composed down the tree: an instance whose path matches a drop left out with all
    under it (a model's alternatives: one of its options built); one whose path matches a whole measured as one part,
    the solids of all under it in its frame (a bought assembly its maker models piece by piece: a carriage, a board)."""
    name, solids, mat, colour, kids, place, roots = info
    cache, out = {}, []
    def under(d, m):
        own = [(x, m) for x in solids.get(d, [])]
        for n, nm, c in kids.get(d, []): own += under(c, mul(m, place[n]) if m is not None else place[n])
        return own
    def go(d, m, path, depth, one=False):
        if d in solids or one:
            key = (d, one)
            if key not in cache:
                cache[key] = M.measure(under(d, None) if one else [(x, None) for x in solids[d]])
                if len(M.P) > 400000: M.drop()
            r = cache[key]
            if r:
                lb, mid, faces, hull = r
                corners = [[lb[a][0], lb[b][1], lb[c][2]] for a in (0, 1) for b in (0, 1) for c in (0, 1)]
                w = [apply(m, c) for c in corners]
                sol = [x for x, _ in under(d, None)] if one else solids[d]
                col = next((colour[x] for x in sol if x in colour), None)
                out.append({'path': path or [name[d]], 'name': name[d], 'depth': depth, 'm': [row[:] for row in m[:3]], 'local': lb,
                            'world': [[min(p[k] for p in w) for k in range(3)], [max(p[k] for p in w) for k in range(3)]],
                            'size': [round(lb[1][k] - lb[0][k], 3) for k in range(3)], 'mid': mid, 'faces': faces,
                            'mat': mat.get(d, {}).get('mat'), 'rho': mat.get(d, {}).get('rho'), 'colour': col, 'in': path[-2] if len(path) > 1 else None, 'hull': hull})
        if one: return
        for n, nm, c in kids.get(d, []):
            p2 = path + [nm]; s2 = '/'.join(p2)
            if any(re.search(x, s2) for x in drop): continue
            go(c, mul(m, place[n]), p2, depth + 1, any(re.search(x, s2) for x in whole))
    for r in roots: go(r, I4, [], 0)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['tree', 'parts', 'count', 'ts']); ap.add_argument('file'); ap.add_argument('--json')
    ap.add_argument('--id'); ap.add_argument('--name'); ap.add_argument('--src'); ap.add_argument('--out')
    ap.add_argument('--drop', action='append', default=[], help='leave out an instance and all under it whose path (instance names joined by /) matches')
    ap.add_argument('--whole', action='append', default=[], help='measure an instance whose path matches as one part')
    ap.add_argument('--no-outline', default='', help='write no outline for parts whose name matches (the parts the library draws)')
    a = ap.parse_args()
    M = Model(load(a.file)); info = tree(M); name, solids, mat, colour, kids, place, roots = info
    if a.cmd == 'tree':
        def go(d, depth):
            for n, nm, c in kids.get(d, []): print('  ' * depth + f"{nm}  ({name[c]}){'  solids ' + str(len(solids[c])) if c in solids else ''}"); go(c, depth + 1)
        for r in roots: print(name[r]); go(r, 1)
        return
    parts = walk(M, info, a.drop, a.whole)
    if a.cmd == 'count':
        n = {}
        for p in parts: n[p['name']] = n.get(p['name'], 0) + 1
        for k, v in sorted(n.items(), key=lambda kv: -kv[1]): print(f'{v:4d}  {k}')
        return
    if a.cmd == 'ts':
        r = lambda v, k=3: round(v, k)
        def extra(p):
            e = {}
            if p['mat']: e['mat'] = p['mat']
            if p['rho']: e['rho'] = p['rho']
            if p['colour']: e['look'] = p['colour'][0]; e['rgb'] = p['colour'][1]
            if p['in']: e['in'] = re.sub(r':\d+$', '', p['in'])
            # (its outline from its least box-like side, where it fills under nine tenths of its box's face there)
            if p.get('hull') and p['hull'][1] < 0.9 and not (a.no_outline and re.search(a.no_outline, p['name'])): e['hull'] = p['hull']
            return ', ' + json.dumps(e, ensure_ascii=False) if e else ''
        rows = [f"  [{json.dumps(p['name'], ensure_ascii=False)}, {json.dumps(p['path'][-1], ensure_ascii=False)}, [{', '.join(str(r(x, 5)) for row in p['m'] for x in row)}], [{', '.join(str(r(x)) for x in p['local'][0] + p['local'][1])}], [{', '.join(str(r(x)) for x in p['mid'])}], [{', '.join(str(x) for x in p['faces'])}]{extra(p)}],"
                for p in parts]
        chose = ''.join(f"\n//   left out: {x}" for x in a.drop) + ''.join(f"\n//   measured whole: {x}" for x in a.whole)
        txt = (f"// Generated by tools/measure/stepasm.py from {a.src}: each part's name, its instance's name, its place (the\n"
               f"// model's transform: rotation rows then translation, mm), its box in its own frame (min then max, mm), its edges' middle,\n// how much of each of its box's faces (x-, x+, y-, y+, z-, z+) its flat faces cover, and the model's material, its look\n// (its appearance's name and colour), the assembly it is in, and its outline from its least box-like side (its axis,\n// how much of its box's face the outline fills, its convex corners about its box's middle, mm).{chose}\n"
               f"// Measured numbers only; none of the model's surface is copied. Do not edit by hand: regenerate.\n"
               f"import type {{ MakerModel }} from '../makermodel';\n\n"
               f"export const {a.id.upper().replace('-', '_')}: MakerModel = {{ id: {json.dumps(a.id)}, name: {json.dumps(a.name)}, src: {json.dumps(a.src)}, parts: [\n" + '\n'.join(rows) + "\n] };\n")
        if a.out: open(a.out, 'w').write(txt); print(f'{len(parts)} parts to {a.out}', file=sys.stderr)
        else: print(txt)
        return
    if a.json: json.dump(parts, open(a.json, 'w'), indent=1, ensure_ascii=False); print(f'{len(parts)} parts to {a.json}', file=sys.stderr); return
    for p in parts:
        w = p['world']; print(f"{'/'.join(p['path'])[:70]:70s} {p['name'][:28]:28s} size {p['size']} world {[round(x, 1) for x in w[0]]}..{[round(x, 1) for x in w[1]]} {p['mat'] or ''}")


if __name__ == '__main__':
    main()

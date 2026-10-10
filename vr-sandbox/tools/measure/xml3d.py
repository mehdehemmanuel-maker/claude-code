#!/usr/bin/env python3
"""Read a maker's 3D assembly in 3DXML (Dassault's format, which SOLIDWORKS and CATIA export: Creality's Ender-3 is
published so): every part's name, its place in the assembly (the product tree's matrices composed down from the
root), and the box its own tessellated surface spans, in the part's own frame and in the assembly's. A maker's model is
where its parts are; the library draws them from their standards and is placed by this.

  tree   model.3DXML                     the product tree: each instance, its reference's name, its depth
  parts  model.3DXML [--json out.json]   every part drawn (an instance whose reference has a surface): its path, its
                                         world matrix (mm), its box in its own frame and in the world's, its size, and
                                         the middle of its surface (area-weighted, its own frame: which end is heavier)
  count  model.3DXML                     how many of each part by name (the model's bill of materials)
  ts     model.3DXML --id ID --name NAME --src SRC [--out file.ts]
                                         the parts as a TypeScript data file for src/nexus/machines/makermodel.ts: each part's
                                         name, place (its matrix, mm) and box, its surface's middle, how much of each
                                         box face its surface covers; numbers measured from the model, none of its
                                         surface copied

Units are the model's (mm for SOLIDWORKS' export). A 3DXML file is a zip: it is read in place, nothing extracted.
"""
import argparse, json, re, sys, zipfile, xml.etree.ElementTree as ET

NS = {'x': 'http://www.3ds.com/xsd/3DXML'}
XSI = '{http://www.w3.org/2001/XMLSchema-instance}type'


def mat(s):
    """A 3DXML RelativeMatrix (its rotation's three columns, then its translation) as a 4x4, row-major."""
    v = [float(t) for t in s.split()]
    c = [v[0:3], v[3:6], v[6:9]]
    return [[c[0][0], c[1][0], c[2][0], v[9]], [c[0][1], c[1][1], c[2][1], v[10]], [c[0][2], c[1][2], c[2][2], v[11]], [0, 0, 0, 1]]


def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def apply(m, p):
    return [m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] for i in range(3)]


I4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]


def load(path):
    z = zipfile.ZipFile(path)
    root = re.search(r'<Root>([^<]+)</Root>', z.read('Manifest.xml').decode()).group(1)
    t = ET.fromstring(z.read(root))
    ps = t.find('x:ProductStructure', NS)
    refs, inst, reps, irep = {}, [], {}, {}
    for e in ps:
        kind = e.get(XSI) or e.tag.split('}')[1]
        if 'Reference3D' in kind: refs[e.get('id')] = e.get('name')
        elif 'ReferenceRep' in kind: reps[e.get('id')] = (e.get('associatedFile') or '').replace('urn:3DXML:', '')
        elif 'InstanceRep' in kind: irep.setdefault(e.find('x:IsAggregatedBy', NS).text, []).append(e.find('x:IsInstanceOf', NS).text)
        elif 'Instance3D' in kind:
            m = e.find('x:RelativeMatrix', NS)
            inst.append({'id': e.get('id'), 'name': e.get('name'), 'parent': e.find('x:IsAggregatedBy', NS).text, 'ref': e.find('x:IsInstanceOf', NS).text, 'm': mat(m.text) if m is not None else I4})
    return z, ps.get('root'), refs, inst, reps, irep


def points(z, f, cache={}):
    """Every vertex a part's surface lists (its triangles' positions, or its edges' polylines)."""
    if f in cache: return cache[f]
    d = z.read(f).decode('utf-8', 'replace'); out = []
    for blk in re.findall(r'<Positions>([^<]*)</Positions>', d) + re.findall(r'vertices="([^"]*)"', d):
        for tri in blk.split(','):
            v = tri.split()
            if len(v) == 3: out.append([float(x) for x in v])
    cache[f] = out; return out


def middle(z, f, cache={}):
    """The area-weighted middle of a part's triangles (its surface's centre), or its vertices' mean."""
    if f in cache: return cache[f]
    d = z.read(f).decode('utf-8', 'replace'); pos = []
    for blk in re.findall(r'<Positions>([^<]*)</Positions>', d):
        pos += [[float(x) for x in t.split()] for t in blk.split(',') if len(t.split()) == 3]
    tot, acc = 0.0, [0.0, 0.0, 0.0]
    for tri in re.findall(r'triangles="([^"]*)"', d):
        ix = [int(x) for x in tri.split()]
        for k in range(0, len(ix) - 2, 3):
            a, b, c = pos[ix[k]], pos[ix[k + 1]], pos[ix[k + 2]]
            u = [b[i] - a[i] for i in range(3)]; v = [c[i] - a[i] for i in range(3)]
            n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; ar = 0.5 * (n[0] ** 2 + n[1] ** 2 + n[2] ** 2) ** 0.5
            tot += ar
            for i in range(3): acc[i] += ar * (a[i] + b[i] + c[i]) / 3
    if tot > 0: r = [x / tot for x in acc]
    else:
        ps = points(z, f); r = [sum(p[i] for p in ps) / len(ps) for i in range(3)] if ps else None
    cache[f] = r; return r


def tris(z, f, cache={}):
    """A part's surface as triangles (three points each): each polygonal rep's own vertex buffer, its faces' triangles,
    strips (each run of indices a strip: every three in a row a triangle) and fans."""
    if f in cache: return cache[f]
    d = z.read(f).decode('utf-8', 'replace'); out = []
    for rep in d.split('xsi:type="PolygonalRepType"')[1:]:
        pos = []
        for blk in re.findall(r'<Positions>([^<]*)</Positions>', rep):
            pos += [[float(x) for x in t.split()] for t in blk.split(',') if len(t.split()) == 3]
        def add(a, b, c):
            if max(a, b, c) < len(pos): out.append((pos[a], pos[b], pos[c]))
        for face in re.findall(r'<Face ([^>]*)>', rep):
            for key, runs in re.findall(r'(triangles|strips|fans)="([^"]*)"', face):
                for run in runs.split(','):
                    ix = [int(x) for x in run.split()]
                    if key == 'triangles':
                        for k in range(0, len(ix) - 2, 3): add(ix[k], ix[k + 1], ix[k + 2])
                    elif key == 'strips':
                        for k in range(len(ix) - 2): add(ix[k], ix[k + 1], ix[k + 2])
                    else:
                        for k in range(1, len(ix) - 1): add(ix[0], ix[k], ix[k + 1])
    cache[f] = out; return out


def faces(z, files, lb):
    """How much of each of its box's six faces (x-, x+, y-, y+, z-, z+) the part's own surface covers, 0 to 1: the area of
    its triangles that lie in that face's plane (within 0.6 mm, or 3 % of the box across it) and face that way, over the
    face's area. A sheet's or a moulding's open sides read near 0; a block's six near 1. A measure, not its surface."""
    ext = [lb[1][k] - lb[0][k] for k in range(3)]; acc = [0.0] * 6
    for f in files:
        for a, b, c in tris(z, f):
            u = [b[i] - a[i] for i in range(3)]; v = [c[i] - a[i] for i in range(3)]
            n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; L = (n[0] ** 2 + n[1] ** 2 + n[2] ** 2) ** 0.5
            if L == 0: continue
            area = 0.5 * L; cen = [(a[i] + b[i] + c[i]) / 3 for i in range(3)]
            for k in range(3):
                if abs(n[k]) / L < 0.9: continue
                tol = max(0.6, 0.03 * ext[k])
                if abs(cen[k] - lb[0][k]) < tol: acc[2 * k] += area
                if abs(cen[k] - lb[1][k]) < tol: acc[2 * k + 1] += area
    fa = [ext[1] * ext[2], ext[0] * ext[2], ext[0] * ext[1]]
    return [round(min(1.0, acc[i] / fa[i // 2]), 2) if fa[i // 2] > 0 else 0 for i in range(6)]


def box(ps):
    if not ps: return None
    return [[min(p[i] for p in ps) for i in range(3)], [max(p[i] for p in ps) for i in range(3)]]


def walk(z, root, refs, inst, reps, irep):
    kids = {}
    for i in inst: kids.setdefault(i['parent'], []).append(i)
    out = []
    def go(ref, m, path, depth):
        for i in kids.get(ref, []):
            mm = mul(m, i['m']); p = path + [i['name']]
            files = [reps[r] for r in irep.get(i['ref'], []) if r in reps]
            if files:
                local = [pt for f in files for pt in points(z, f)]
                lb = box(local)
                if lb:
                    corners = [[lb[a][0], lb[b][1], lb[c][2]] for a in (0, 1) for b in (0, 1) for c in (0, 1)]
                    wb = box([apply(mm, c) for c in corners])
                    mids = [middle(z, f) for f in files]; mids = [x for x in mids if x]
                    out.append({'path': p, 'name': refs.get(i['ref'], i['name']), 'depth': depth, 'm': [r[:] for r in mm[:3]], 'local': lb, 'world': wb,
                                'size': [round(lb[1][k] - lb[0][k], 3) for k in range(3)], 'mid': [sum(x[k] for x in mids) / len(mids) for k in range(3)] if mids else None,
                                'faces': faces(z, files, lb)})
            go(i['ref'], mm, p, depth + 1)
    go(root, I4, [], 0)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['tree', 'parts', 'count', 'ts']); ap.add_argument('file'); ap.add_argument('--json')
    ap.add_argument('--id'); ap.add_argument('--name'); ap.add_argument('--src'); ap.add_argument('--out')
    a = ap.parse_args()
    z, root, refs, inst, reps, irep = load(a.file)
    if a.cmd == 'tree':
        kids = {}
        for i in inst: kids.setdefault(i['parent'], []).append(i)
        def go(ref, d):
            for i in kids.get(ref, []): print('  ' * d + f"{i['name']}  ({refs.get(i['ref'])})"); go(i['ref'], d + 1)
        go(root, 0); return
    parts = walk(z, root, refs, inst, reps, irep)
    if a.cmd == 'count':
        n = {}
        for p in parts: n[p['name']] = n.get(p['name'], 0) + 1
        for k, v in sorted(n.items(), key=lambda kv: -kv[1]): print(f'{v:4d}  {k}')
        return
    if a.cmd == 'ts':
        r = lambda v, k=3: round(v, k)
        rows = [f"  [{json.dumps(p['name'], ensure_ascii=False)}, {json.dumps(p['path'][-1], ensure_ascii=False)}, [{', '.join(str(r(x, 5)) for row in p['m'] for x in row)}], [{', '.join(str(r(x)) for x in p['local'][0] + p['local'][1])}], [{', '.join(str(r(x)) for x in (p['mid'] or [0, 0, 0]))}], [{', '.join(str(x) for x in p['faces'])}]],"
                for p in parts]
        txt = (f"// Generated by tools/measure/xml3d.py from {a.src}: each part's name, its instance's name, its place (the model's\n"
               f"// matrix: rotation rows then translation, mm), its box in its own frame (min then max, mm), its surface's middle and how\n// much of each of its box's faces (x-, x+, y-, y+, z-, z+) its surface covers.\n"
               f"// Measured numbers only; none of the model's surface is copied. Do not edit by hand: regenerate.\n"
               f"import type {{ MakerModel }} from '../makermodel';\n\n"
               f"export const {a.id.upper().replace('-', '_')}: MakerModel = {{ id: {json.dumps(a.id)}, name: {json.dumps(a.name)}, src: {json.dumps(a.src)}, parts: [\n" + '\n'.join(rows) + "\n] };\n")
        if a.out: open(a.out, 'w').write(txt); print(f'{len(parts)} parts to {a.out}', file=sys.stderr)
        else: print(txt)
        return
    if a.json: json.dump(parts, open(a.json, 'w'), indent=1, ensure_ascii=False); print(f'{len(parts)} parts to {a.json}', file=sys.stderr); return
    for p in parts:
        w = p['world']; print(f"{'/'.join(p['path'])[:70]:70s} {p['name'][:28]:28s} size {p['size']} world {[round(x, 1) for x in w[0]]}..{[round(x, 1) for x in w[1]]}")


if __name__ == '__main__':
    main()

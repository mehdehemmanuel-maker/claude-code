#!/usr/bin/env python3
"""A part's drawing as KiCad keeps it: each footprint's outline on its fabrication layer (the body, from its maker's
datasheet), its courtyard, its pads and holes, the datasheet it was drawn from, and its 3D model's name.

KiCad's footprints (https://github.com/KiCad/kicad-footprints) are drawn from makers' datasheets and name them, so a
part's size can be taken from them and cited. Clone them once (sparse, only the libraries needed):

    git clone --depth 1 --filter=blob:none --sparse https://github.com/KiCad/kicad-footprints
    git -C kicad-footprints sparse-checkout set Connector_USB.pretty Connector_RJ.pretty ...

    python3 tools/measure/kicad.py 'kicad-footprints/Connector_USB.pretty/USB_C_Receptacle_*' [--pads] [--json]
"""
import glob, json, os, re, sys

def parse(path):
    t = open(path, encoding='utf-8').read()
    def one(key):
        m = re.search(r'\(' + key + r' "([^"]*)"', t); return m.group(1) if m else ''
    out = {'name': os.path.basename(path)[:-len('.kicad_mod')], 'descr': one('descr'), 'tags': one('tags')}
    for layer in ['F.Fab', 'F.CrtYd', 'F.SilkS', 'Dwgs.User']:
        xs, ys = [], []
        for m in re.finditer(r'\(fp_line \(start ([-\d.]+) ([-\d.]+)\) \(end ([-\d.]+) ([-\d.]+)\) \(layer ' + re.escape(layer) + r'\)', t):
            a, b, c, d = map(float, m.groups()); xs += [a, c]; ys += [b, d]
        if xs: out[layer] = {'x': [min(xs), max(xs)], 'y': [min(ys), max(ys)], 'size': [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3)]}
    pads = []
    for m in re.finditer(r'\(pad "?([^"\s]*)"? (\w+) (\w+) \(at ([-\d.]+) ([-\d.]+)(?: ([-\d.]+))?\) \(size ([-\d.]+) ([-\d.]+)\)(?: \(drill (?:oval )?([-\d.]+)(?: ([-\d.]+))?)?', t):
        n, typ, shp, x, y, rot, sx, sy, d1, d2 = m.groups()
        pads.append({'n': n, 'type': typ, 'shape': shp, 'at': [float(x), float(y)], 'rot': float(rot or 0), 'size': [float(sx), float(sy)], 'drill': [float(d1), float(d2 or d1)] if d1 else None})
    out['pads'] = pads
    m3 = re.search(r'\(model ([^\s)]+)', t); out['model'] = m3.group(1) if m3 else ''
    return out

def main(argv):
    as_json, show_pads = '--json' in argv, '--pads' in argv
    pats = [a for a in argv if not a.startswith('--')]
    if not pats: print(__doc__); return 1
    found = [parse(f) for p in pats for f in sorted(glob.glob(p))]
    if as_json: print(json.dumps(found, indent=1)); return 0
    for o in found:
        print('==', o['name'])
        if o['descr']: print('  drawn from:', o['descr'][:300])
        for k in ['F.Fab', 'F.CrtYd']:
            if k in o: print('  %-8s x %.2f..%.2f  y %.2f..%.2f  (%.2f × %.2f mm)' % (k, *o[k]['x'], *o[k]['y'], *o[k]['size']))
        sig = [p for p in o['pads'] if p['type'] != 'np_thru_hole']; npth = [p for p in o['pads'] if p['type'] == 'np_thru_hole']
        print('  pads %d (%s), unplated holes %d' % (len(sig), ', '.join(sorted({p['type'] for p in sig})), len(npth)))
        if show_pads:
            for p in o['pads']: print('   ', p)
    return 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))

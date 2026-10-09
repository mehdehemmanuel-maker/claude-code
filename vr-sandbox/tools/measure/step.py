#!/usr/bin/env python3
"""Read a maker's 3D model (STEP) of a board: every solid's box in the board's own drawing frame, with the name the
model gives it. A maker's mechanical reference model (Raspberry Pi's RP-004882-DD for the Pi 5) places each connector
exactly; its boxes are what a layout is taken from.

  boxes  model.step [--flip] [--json out.json]

The board is the largest flat solid. Its frame: x right from its left edge, y up the drawing from its near edge (the
model's +z taken as toward the near edge; --flip for a model the other way), each part's height above the board's top
or, under it, below its bottom. Needs gmsh (pip install gmsh; it links OpenCASCADE, and libGLU and libXft at run time).
"""
import argparse, json, sys


def boxes(path):
    import gmsh
    gmsh.initialize(); gmsh.option.setNumber('General.Terminal', 0); gmsh.option.setNumber('Geometry.OCCImportLabels', 1)
    gmsh.model.occ.importShapes(path); gmsh.model.occ.synchronize()
    out = [{'tag': t, 'name': (gmsh.model.getEntityName(d, t) or '').split('/')[-1], 'b': gmsh.model.getBoundingBox(d, t)} for d, t in gmsh.model.getEntities(3)]
    gmsh.finalize(); return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('boxes'); p.add_argument('step'); p.add_argument('--flip', action='store_true'); p.add_argument('--json')
    a = ap.parse_args(); bs = boxes(a.step)
    # (the board: the solid with the most area and the least height)
    board = max(bs, key=lambda o: (o['b'][3] - o['b'][0]) * (o['b'][5] - o['b'][2]) / max(1e-6, o['b'][4] - o['b'][1]))
    x0, y0, z0, x1, y1, z1 = board['b']; L, W = x1 - x0, z1 - z0
    out = []
    for o in bs:
        a0, b0, c0, a1, b1, c1 = o['b']
        X0, X1 = a0 - x0, a1 - x0; Y0, Y1 = ((c0 - z0), (c1 - z0)) if a.flip else ((z1 - c1), (z1 - c0))
        under = b1 <= y0 + 0.05 and o is not board
        out.append({'tag': o['tag'], 'name': o['name'], 'x': [round(X0, 3), round(X1, 3)], 'y': [round(Y0, 3), round(Y1, 3)], 'mid': [round((X0 + X1) / 2, 3), round((Y0 + Y1) / 2, 3)],
                    'size': [round(X1 - X0, 3), round(Y1 - Y0, 3)], 'side': 'under' if under else 'top', 'h': round((y0 - b0) if under else (b1 - y1), 3), 'base': round(b0 - y1, 3), 'board': o is board})
    print('board %.2f × %.2f mm, %.2f thick (solid %d)' % (L, W, y1 - y0, board['tag']))
    for o in out:
        if o['board']: continue
        print('%3d %-24s x %7.2f..%7.2f  y %7.2f..%7.2f  mid (%6.2f, %6.2f)  %5.2f × %5.2f  %s %5.2f' % (o['tag'], o['name'][:24] or '(not named)', *o['x'], *o['y'], *o['mid'], *o['size'], o['side'], o['h']))
    if a.json: json.dump({'L': round(L, 3), 'W': round(W, 3), 't': round(y1 - y0, 3), 'parts': out}, open(a.json, 'w'), indent=0)


if __name__ == '__main__':
    main()

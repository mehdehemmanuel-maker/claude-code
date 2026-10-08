// The share of its box a shape fills, by geometry alone, and the least box that holds a volume: what lets a size and a
// mass check each other (src/nexus/derive.ts) and lets a table give a part's proportions and leave its size to its mass.

/** The shape a look draws, and the share of its box it fills: a block or sheet all of it (and anything drawn as a slab:
 *  a gram's swatch, a mat of mycelium, blood as a pool), a hexagonal prism √3/2, a disc, rod or tube a cylinder's π/4,
 *  everything rounded an ellipsoid's π/6. */
export function boxShape(look?: string, size?: readonly number[]): { name: string; phi: number; says: string } {
  const sorted = size ? [...size].sort((a, b) => a - b) : null;
  if ((look && /^(swatch|sheet|membrane|block|valve|flatbone|skull|shell|flake|crystal|mycelium|blood|vessels|gut|skin)$/.test(look)) || (sorted && sorted[0]! < 0.2 * sorted[1]!)) return { name: 'block', phi: 1, says: 'all' };
  if (look === 'column') return { name: 'hexagonal prism', phi: Math.sqrt(3) / 2, says: '√3/2 (in a square box)' };
  if (look && /disc|rod|tube|cord|nerve|axon|longbone|column|fibre|spindle|stem|chromosome|bacterium|spirillum|helix|tendon|sperm|ring|worm|mito|sarcomere/.test(look)) return { name: 'cylinder', phi: Math.PI / 4, says: 'π/4' };
  return { name: 'ellipsoid', phi: Math.PI / 6, says: 'π/6' };
}
/** A size grown, in its own proportions, until its shape holds a volume (in the size's units cubed): the least box a
 *  thing can be drawn in. A size that already holds it is kept. */
export function holding<T extends readonly number[]>(size: T, volume: number, look?: string): T {
  const held = boxShape(look, size).phi * size.reduce((a, b) => a * b, 1);
  if (!(held > 0) || held >= volume) return size;
  const k = Math.cbrt(volume / held);
  return size.map((x) => +(x * k).toPrecision(3)) as unknown as T;
}

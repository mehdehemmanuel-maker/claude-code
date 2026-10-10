// Geometry: what a shape is, before what it is for. Sixteen ways of ordering it, from how many numbers it takes to say
// where on it you are (its dimension) to the machines and places made of shapes (composite). Each entry says what it
// is and, where a law decides it, the law; `made` names what in Nexus makes or measures it today. An entry without
// `made` is known by its name and its law only: nothing generates it yet, and that is a gap to fill, not a feature.

import type { Node, Principle } from './taxonomy';

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** An entry: its name, what it is, the law that decides it (if any), what in Nexus makes it (if anything), what is under it. */
type E = [name: string, says: string, law?: string | null, made?: string | null, children?: E[]];
function build(under: string, [name, says, law, made, children]: E): Node {
  const id = `${under}/${slug(name)}`, principles: Principle[] = law ? [{ id: `${id}#law`, says: `${name}: ${says}`, law }] : [];
  return { id, name, says, principles, children: (children ?? []).map((c) => build(id, c)), ...(made ? { made } : {}) };
}

const PART = 'src/nexus/embody/part.ts', SHAPE = 'src/nexus/substrate/shape.ts';
const TREE: E[] = [
  ['Dimension', 'how many numbers it takes to say where on it you are', 'a curve is measured by length (m), a surface by area (m²), a solid by volume (m³)', null, [
    ['0D', 'no extent: a place only', null, null, [['Point', 'a position: three coordinates and nothing else', null, `a part's place \`at\` (${PART}); a note's pin`]]],
    ['1D', 'one number along it', null, null, [['Curve / Path', 'a one-parameter run of points', 'its length is ∫ |r′(t)| dt', `a wire: a run of points with a radius (${PART})`]]],
    ['2D', 'two numbers across it', null, null, [['Surface / Region', 'a two-parameter sheet of points, or the part of a plane it bounds', 'its area is ∬ |r_u × r_v| du dv', `a region's faces, each with its area and outward normal (${SHAPE})`]]],
    ['3D', 'three numbers within it', null, null, [['Volume / Solid', 'all the points a closed surface holds', 'its volume is ∭ dV', `a part's solid (block, round, screw, nut), its volume and so its mass (${PART})`]]],
  ]],
  ['Topology', 'what stays the same when a shape is bent and stretched without tearing or gluing', 'a closed solid has V − E + F = 2 − 2g, g the holes right through it (Euler–Poincaré)', null, [
    ['Connected', 'in one piece: any two of its points joined by a path within it'],
    ['Disconnected', 'in pieces that no path within it joins'],
    ['Inside / Outside', 'which side of a closed boundary a point is on', 'a ray from the point crosses the boundary an odd number of times exactly when it is inside (Jordan curve theorem)'],
    ['Boundary', 'where a shape meets what it is not; a solid\'s boundary is a closed surface'],
    ['Hole', 'a passage right through, which changes the count of holes g'],
    ['Cavity', 'a void wholly inside, closed off from the outside'],
    ['Channel', 'a passage open at its ends that a fluid or a wire runs along'],
    ['Loop', 'a closed path that comes back to where it began'],
    ['Branch', 'where one path becomes several'],
    ['Network', 'paths and the nodes where they meet', 'a load at the joints is carried by the bars only if it lies in the span of the equilibrium matrix\'s columns', 'a network of bars between joints and what loads it can carry (src/nexus/substrate/network.ts)'],
    ['Containment', 'one shape wholly inside another'],
  ]],
  ['Primitive forms', 'shapes said in full by a few numbers', null, null, [
    ['Point', 'a position with no extent', null, `a part's place (${PART})`],
    ['Line', 'straight, the shortest way between two points', 'p(t) = a + t (b − a)'],
    ['Circle', 'every point one radius from a centre, in a plane', 'C = 2π r, A = π r²', 'a circle surface a pipeline places (surface circle, src/nexus/ask/generate.ts)'],
    ['Arc', 'a part of a circle', 's = r θ'],
    ['Plane', 'flat and without end', 'n · x = d', `the faces of a region, up, down and to the sides (${SHAPE})`],
    ['Sphere', 'every point one radius from a centre', 'A = 4π r², V = 4/3 π r³', 'a ball a pipeline places, sized and turned (src/nexus/ask/generate.ts)'],
    ['Cylinder', 'a circle carried along its axis', 'V = π r² h, A = 2π r (r + h)', `a round bar or tube: its radius, length, axis and bore (${PART})`],
    ['Cone', 'a circle drawn to a point', 'V = π r² h / 3', 'a cone a pipeline places, sized and turned (src/nexus/ask/generate.ts)'],
    ['Torus', 'a circle turned about an axis in its plane', 'V = 2π² R r², A = 4π² R r', 'a ring a pipeline places: across and tube (src/nexus/ask/generate.ts)'],
    ['Box', 'six rectangular faces, all at right angles', 'V = a b c', `a block: its three sizes (${PART})`],
    ['Prism', 'a polygon carried straight along, its two ends alike and parallel', 'V = A_base h'],
    ['Pyramid', 'a polygon drawn to a point', 'V = A_base h / 3'],
    ['Polyhedron', 'flat faces meeting at straight edges', 'V − E + F = 2 for one without a hole (Euler)'],
  ]],
  ['Generated forms', 'shapes made by moving or changing another', null, null, [
    ['Extrusion', 'a section carried straight along a direction', 'V = A L', `a block is a rectangle extruded, a round bar a circle along its axis (${PART})`],
    ['Revolution', 'a section turned about an axis', 'V = 2π R̄ A, R̄ the distance of the section\'s centroid from the axis (Pappus–Guldinus)', 'a cylinder, tube, cone and ring are sections turned about their axis (src/nexus/ask/generate.ts)'],
    ['Sweep', 'a section carried along a path', 'V = A L while the path bends more gently than the section is wide', `a wire: a circle swept along its run of points (${PART})`],
    ['Loft', 'a surface or solid through a series of sections'],
    ['Offset', 'every point moved the same distance along its normal', 'defined while the distance stays under the smallest radius of curvature'],
    ['Deformation', 'a shape whose points have each moved: x′ = x + u(x)', null, 'stretched along x, y, z: expand, shrink, stretch (src/nexus/ask/generate.ts)'],
    ['Morph', 'one shape carried continuously into another'],
    ['Field-generated', 'the points where a field takes a value: {x : f(x) = c}'],
    ['Implicit', 'given by f(x) = 0, inside where f < 0'],
  ]],
  ['Curve families', 'kinds of curve, by how they are written', 'a curve turns as fast as κ = |r′ × r″| / |r′|³, one over the radius of the circle that fits it there', null, [
    ['Linear', 'straight: κ = 0 everywhere'],
    ['Circular', 'κ = 1/r everywhere'],
    ['Elliptical', 'x²/a² + y²/b² = 1'],
    ['Spline', 'pieces of polynomial joined smoothly at knots'],
    ['Bézier', 'a polynomial curve pulled by its control points', 'B(t) = Σ C(n,i) (1 − t)ⁿ⁻ⁱ tⁱ Pᵢ'],
    ['NURBS', 'weighted B-splines, which can be exact circles and conics', 'C(u) = Σ Nᵢ,ₚ(u) wᵢ Pᵢ / Σ Nᵢ,ₚ(u) wᵢ'],
    ['Helical', 'turning round an axis while advancing along it', 'r(t) = (a cos t, a sin t, b t), its pitch 2π b'],
    ['Spiral', 'further from its centre as it turns', 'r = a + b θ (Archimedes)'],
    ['Involute', 'traced by the end of a string unwound from a circle: the flank of a gear tooth', 'x = r_b (cos θ + θ sin θ), y = r_b (sin θ − θ cos θ)'],
    ['Cycloidal', 'traced by a point on a rolling circle', 'x = r (t − sin t), y = r (1 − cos t)'],
    ['Arbitrary Parametric', 'any r(t) that has a derivative', 'its length is ∫ |r′(t)| dt'],
  ]],
  ['Surface families', 'kinds of surface, by how they are made and how they bend', 'a surface bends both ways at once as K = κ₁ κ₂, the product of its principal curvatures (Gauss)', null, [
    ['Planar', 'flat: κ₁ = κ₂ = 0', null, `a region's faces (${SHAPE})`],
    ['Ruled', 'through every point of it a straight line lies on it'],
    ['Revolved', 'a profile turned about an axis'],
    ['Swept', 'a profile carried along a path'],
    ['Lofted', 'through a series of profiles'],
    ['Developable', 'unrolls flat without stretching, so it bends from flat sheet', 'K = 0'],
    ['Freeform', 'patches with no simpler rule, NURBS commonly'],
    ['Minimal', 'the least area its boundary allows, as a soap film', 'H = (κ₁ + κ₂) / 2 = 0'],
    ['Implicit', 'f(x, y, z) = 0'],
  ]],
  ['Solid families', 'kinds of solid, by how they are made', 'a solid\'s mass is its volume times its matter\'s density: m = ρ V', `every part's mass from its shape and matter (${PART})`, [
    ['Prismatic', 'a section extruded: plates, bars, blocks', null, `a block (${PART})`],
    ['Rotational', 'round about an axis, as a lathe turns it', null, `a round bar or tube, a screw, a nut (${PART})`],
    ['Swept', 'a section along a path', null, `a wire (${PART})`],
    ['Lofted', 'through a series of sections'],
    ['Freeform', 'no simpler rule'],
    ['Cellular', 'closed or open cells: foams, honeycombs', 'an open-cell foam stiffens as E*/E_s ≈ (ρ*/ρ_s)² (Gibson & Ashby, Cellular Solids)'],
    ['Lattice', 'struts repeated on a grid', 'a stretch-dominated lattice stiffens as ρ*/ρ_s, a bending-dominated one as (ρ*/ρ_s)² (Deshpande, Ashby & Fleck 2001)'],
    ['Composite', 'several matters, each where its job is'],
  ]],
  ['Geometric features', 'the shapes a part has for a purpose: to take a fastener, guide, stiffen, seal or pass heat', 'a sharp inside corner raises the stress at it; a radius lowers it (Peterson\'s Stress Concentration Factors)', null, [
    ['Hole', 'a passage cut through'],
    ['Bore', 'a hole made exact, for a shaft or a bearing', null, `a round bar's bore (${PART})`],
    ['Slot', 'a hole longer than it is wide, so what goes in it can slide'],
    ['Groove', 'a channel cut round or along a surface, for an O-ring or a circlip'],
    ['Pocket', 'a recess cut in from one face, not through'],
    ['Cavity', 'a closed void inside a part'],
    ['Rib', 'a thin wall that stiffens a plate', 'a section\'s bending stiffness rises with the cube of its depth: I = b h³ / 12'],
    ['Boss', 'a raised round, for a screw or a pin'],
    ['Flange', 'a rim that stands out, to bolt by', null, 'a motor\'s mounting flange and its bolt circle (src/nexus/embody/motor.ts)'],
    ['Tab', 'a small flat that sticks out, to locate or fix'],
    ['Lug', 'an ear with a hole, to pin or lift by'],
    ['Fin', 'thin plates that pass heat into air', 'Q = h A ΔT', 'a heater\'s heatsink fins, their area from Q = h A ΔT (src/nexus/embody/heater.ts)'],
    ['Blade', 'a thin curved plate that turns a flow'],
    ['Tooth', 'one of many that mesh, on a gear or a belt', 'involute flanks keep the speed ratio constant as teeth roll (the fundamental law of gearing)'],
    ['Edge', 'where two faces meet'],
    ['Fillet', 'an edge rounded to a radius'],
    ['Chamfer', 'an edge cut at an angle'],
    ['Thread', 'a helical ridge, on a screw or in a nut', 'ISO metric sizes and pitches (ISO 261, ISO 262)', `screws and nuts by their ISO metric size (${PART})`],
    ['Port', 'an opening where fluid, air or a wire enters or leaves'],
  ]],
  ['Patterns', 'one thing repeated by a rule', 'a pattern is one instance and its rule: n copies at a pitch', null, [
    ['Linear', 'copies at a pitch along a line', 'xᵢ = x₀ + i p', 'pattern along a line at a pitch (src/nexus/ask/generate.ts)'],
    ['Radial', 'copies spread out from a centre'],
    ['Circular', 'copies round a circle', 'θᵢ = 2π i / n', 'pattern round an axis (src/nexus/ask/generate.ts)'],
    ['Helical', 'each copy turned and lifted, as a spiral stair'],
    ['Grid', 'copies in rows and columns'],
    ['Symmetric', 'unchanged by a reflection or a turn', null, 'mirrored copies across x, y or z (src/nexus/ask/generate.ts)'],
    ['Periodic', 'repeats every period', 'f(x + T) = f(x)'],
    ['Aperiodic', 'ordered but never repeating, as a Penrose tiling'],
    ['Cellular', 'cells packed to fill space', 'regular hexagons divide a plane into equal areas with the least boundary (the honeycomb conjecture, Hales 1999)'],
    ['Fractal', 'alike at every scale', 'D = log N / log (1/r), for N copies each r of the whole'],
  ]],
  ['Transformations', 'how a shape is moved or changed, as a map of its points', 'a rigid move keeps every distance: x′ = R x + t, with Rᵀ R = I and det R = 1', null, [
    ['Translate', 'every point moved by one offset', 'x′ = x + t', `an assembly placed by an offset (placeParts, ${PART})`],
    ['Rotate', 'every point turned about an axis', 'x′ = R x', `an assembly turned to any axis and rolled by quarter turns (placeParts, ${PART})`],
    ['Scale', 'every point moved away from a centre in proportion', 'lengths × s, areas × s², volumes × s³', 'expand and shrink along x, y, z or every way (src/nexus/ask/generate.ts)'],
    ['Reflect', 'mirrored: left becomes right', 'det R = −1', 'flip and mirror across x, y or z (src/nexus/ask/generate.ts)'],
    ['Shear', 'layers slid over each other: angles change, area is kept', 'x′ = x + k y'],
    ['Bend', 'a straight thing curved: its fibres stretch on the outside and shorten inside', 'ε = y / ρ'],
    ['Twist', 'turned along its length', 'θ = T L / (G J)'],
    ['Taper', 'its section shrinking along its length'],
    ['Thicken', 'a surface given a thickness, so it is a solid'],
    ['Thin', 'material taken from inside, leaving a shell'],
    ['Subdivide', 'each face split into smaller ones'],
    ['Deform', 'any smooth map of its points', 'x′ = x + u(x)'],
  ]],
  ['Relations', 'what holds between two shapes', null, null, [
    ['Distance', 'how far apart', 'd = ‖a − b‖', 'dist(a, b) between what is made and the build (src/nexus/ask/generate.ts)'],
    ['Angle', 'how far turned from each other', 'cos θ = a · b / (‖a‖ ‖b‖)'],
    ['Alignment', 'on one line or one axis'],
    ['Parallel', 'the same direction', 'a × b = 0'],
    ['Perpendicular', 'at a right angle', 'a · b = 0'],
    ['Tangent', 'touching at a point with the same direction there'],
    ['Concentric', 'sharing a centre or an axis'],
    ['Coplanar', 'in one plane', '(b − a) · ((c − a) × (d − a)) = 0'],
    ['Symmetric', 'each a mirror of the other about a plane', null, 'mirrored copies (src/nexus/ask/generate.ts)'],
    ['Offset', 'parallel at a set distance', null, 'placed from a thing by dx, dy, dz (src/nexus/ask/generate.ts)'],
    ['Contact', 'surfaces meeting with no gap and no overlap', null, 'a contact wherever two places\' surfaces meet, a face, an edge or a corner against a face (src/nexus/substrate/contact.ts)'],
    ['Intersection', 'what two shapes share', null, `two parts' boxes tested for overlap (boxOf, ${PART})`],
  ]],
  ['Boundaries & interfaces', 'where parts meet, and what the meeting must do', null, null, [
    ['Contact', 'surfaces meeting', null, 'contacts formed from geometry (src/nexus/substrate/contact.ts)'],
    ['Mating', 'two features made to fit each other, as a shaft in a bore'],
    ['Clearance', 'room left between mating parts', 'c = D_hole − d_shaft > 0 (ISO 286 fits)', 'a rule of clearance between things made, kept or the step undone (src/nexus/ask/generate.ts)'],
    ['Interference', 'overlap: a press fit by design, or a fault', 'c = D_hole − d_shaft < 0 (ISO 286 fits)', `parts that are not joined may not take one place: their boxes are checked (${PART}, src/nexus/embody/embody.ts)`],
    ['Opening', 'a way through a boundary'],
    ['Seal', 'a meeting nothing passes, as an O-ring squeezed in its groove', 'a static O-ring is squeezed by a set fraction of its cord (Parker O-Ring Handbook)'],
    ['Joint', 'where parts are held together: bolted, welded, pinned', null, 'bolted joints, their preload and thread engagement (src/nexus/substrate/realize-joint.ts)'],
    ['Interface', 'what passes across a meeting: load, heat, charge, fluid'],
  ]],
  ['Geometric properties', 'the numbers a shape has', null, null, [
    ['Length', 'how long', null, `a block's sizes; a region's extents (${PART}, ${SHAPE})`],
    ['Width', 'how wide', null, `a block's sizes; a region's extents (${PART}, ${SHAPE})`],
    ['Height', 'how high', null, `a block's sizes; a region's extents (${PART}, ${SHAPE})`],
    ['Radius', 'from the centre to the edge', null, `a round's r (${PART})`],
    ['Diameter', 'right across', 'd = 2 r', `a round's 2r; a screw's nominal size (${PART})`],
    ['Area', 'how much surface', null, `each face's area (${SHAPE})`],
    ['Volume', 'how much room', null, `each part's volume, and so its mass (${PART})`],
    ['Thickness', 'across a wall'],
    ['Curvature', 'how fast it turns', 'κ = 1 / ρ'],
    ['Torsion', 'how fast a curve leaves its plane', 'τ = (r′ × r″) · r‴ / |r′ × r″|²'],
    ['Centroid', 'the mean of its points', 'x̄ = ∫ x dV / V', 'the centre of mass the beam and coupling laws use (src/nexus/substrate/beam.ts, src/nexus/substrate/coupling.ts)'],
    ['Moment', 'how area or mass lies about an axis', 'I = ∫ r² dA, and I = I_c + A d² about a parallel axis', 'the second moment of area in the book\'s beam laws (src/nexus/book/structures.ts)'],
  ]],
  ['Distributions / fields', 'a value at every point of a shape', null, null, [
    ['Distance Field', 'at each point, how far the nearest surface is; negative inside'],
    ['Density', 'mass per volume, point by point', 'ρ = dm / dV'],
    ['Thickness Field', 'a wall\'s thickness over its surface'],
    ['Stress Field', 'force per area inside a body, a tensor at each point', 'σ = F / A on average over a section'],
    ['Temperature Field', 'how hot, point by point', 'ρ c ∂T/∂t = ∇ · (k ∇T) + q (the heat equation)'],
    ['Pressure Field', 'a fluid\'s push per area, point by point'],
    ['Material Field', 'which matter is where'],
  ]],
  ['Motion geometry', 'the shapes motion takes', null, null, [
    ['Translation', 'moving without turning'],
    ['Rotation', 'turning about an axis', null, 'a bar turning on its hinge (src/nexus/substrate/swing.ts)'],
    ['Helical Motion', 'turning while advancing, as a screw in its nut', 'v = n · lead'],
    ['Oscillation', 'back and forth about a rest', 'T = 2π √(I / (m g d)) for a body swinging on a pivot', 'the hinged bar\'s swing, its period from its inertia (src/nexus/substrate/swing.ts)'],
    ['Deformation', 'its shape changing as it moves'],
    ['Trajectory', 'the path a point takes over time'],
    ['Flow', 'a continuum moving: a velocity at every point'],
  ]],
  ['Composite / assembled', 'shapes made of shapes', null, null, [
    ['Part', 'one shape of one matter', null, `a part: a shape of a matter at a place, with every value that decided it (${PART})`],
    ['Feature', 'a shape on a part, for a purpose'],
    ['Mechanism', 'parts joined so they move only as wanted', 'M = 6 (n − 1) − Σ (6 − fᵢ) degrees of freedom (Grübler–Kutzbach)', 'a network\'s mechanisms: the motions no bar resists (src/nexus/substrate/network.ts)'],
    ['Assembly', 'parts designed together in their own frame, then placed', null, `an assembly placed as one (placeParts, ${PART})`],
    ['Structure', 'what carries the loads to the ground', null, 'frames embodied from their load paths (src/nexus/embody/)'],
    ['Lattice', 'struts repeated in space'],
    ['Machine', 'parts that do work together', null, 'everything embodied for an ask (src/nexus/embody/embody.ts)'],
    ['Environment', 'what a machine stands in: ground, air, water'],
  ]],
];

/** Geometry, as the taxonomy holds it. */
export const GEOMETRY: Node = {
  id: 'geometry', name: 'Geometry', says: 'what a shape is: its dimension, its topology, its forms and how they are made, its features, patterns, transformations, relations, interfaces, properties, fields, motion and what is made of shapes',
  principles: [], children: TREE.map((e) => build('geometry', e)),
};
/** Every entry under a node, and how many of them Nexus makes. */
export function census(node: Node): { entries: number; made: number } {
  let entries = 0, made = 0;
  const walk = (n: Node) => { for (const c of n.children) { entries++; if (c.made) made++; walk(c); } };
  walk(node); return { entries, made };
}

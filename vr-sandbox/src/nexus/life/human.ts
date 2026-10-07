// The human body, every part of it down to its cells and molecules: the reference adult man of ICRP Publication 89
// (73 kg, 176 cm) by system, organ and tissue, each organ the grams of each tissue in it, each tissue (a gram of it) the
// cells and matrix it is made of, each cell built in ./cells.ts. All 206 bones by name, with their sizes; the muscles,
// tendons and ligaments by name; the blood by its cells, counted. Organ masses are ICRP 89's reference values; where a
// part has none there (a single muscle, a single bone), its mass is an estimate from its typical size, and says so.

import { cellOf, type CellType } from './cells';
import { entries, type LifeEntry } from './core';

// ---- tissues, a gram of each ------------------------------------------------------------------------------------------
export const TISSUES = entries(`
cortical-bone | compact bone (a gram) | Life/Human/Tissues/Bone | part | osteocyte*7600000 bone-matrix:* | 1 | 8.1x8.1x8.1 | swatch | dense lamellar bone in osteons round Haversian canals: mineralised collagen with about 14,000 osteocytes a mm³, so about 42 billion in a skeleton (Buenzli & Sims 2015) | density about 1.9 g/cm³
trabecular-bone | spongy bone (a gram) | Life/Human/Tissues/Bone | part | osteocyte*7600000 osteoblast*100000 bone-matrix:* | 1 | 8.1x8.1x8.1 | swatch | the lattice of struts inside bone ends and vertebrae, the same tissue as compact bone, its spaces filled with marrow |
red-marrow | red bone marrow (a gram) | Life/Human/Tissues/Bone | part | haematopoietic-cell:0.4 adipocyte:0.5 extracellular-fluid:* | 1 | 10x10x10 | swatch | where blood is made: about 500 billion blood cells a day; about half blood-making cells and half fat (typical) |
yellow-marrow | yellow bone marrow (a gram) | Life/Human/Tissues/Bone | part | adipocyte:0.93 haematopoietic-cell:0.02 extracellular-fluid:* | 1 | 10.5x10.5x10.5 | swatch | marrow turned to fat: the shafts of adult long bones |
hyaline-cartilage | hyaline cartilage (a gram) | Life/Human/Tissues/Cartilage | part | chondrocyte:0.01 cartilage-matrix:* | 1 | 9.7x9.7x9.7 | swatch | the glassy cartilage that caps joints and joins ribs to the sternum: collagen II and water, about 10,000 cells a mm³ |
elastic-cartilage | elastic cartilage (a gram) | Life/Human/Tissues/Cartilage | part | chondrocyte:0.02 elastin:0.05 cartilage-matrix:* | 1 | 9.7x9.7x9.7 | swatch | cartilage with elastin, that bends back: the outer ear and the epiglottis |
fibrocartilage | fibrocartilage (a gram) | Life/Human/Tissues/Cartilage | part | chondrocyte:0.01 collagen:0.2 cartilage-matrix:* | 1 | 9.6x9.6x9.6 | swatch | cartilage with collagen I that takes load: the menisci and the discs between vertebrae |
skeletal-muscle-tissue | skeletal muscle (a gram) | Life/Human/Tissues/Muscle | part | muscle-fibre-i:0.42 muscle-fibre-iia:0.25 muscle-fibre-iix:0.16 collagen:0.012 elastin:0.002 adipocyte:0.02 fibroblast:0.002 endothelial-cell:0.01 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | fibres in bundles (fascicles) in sheaths of collagen: here half slow fibres, a third fast fatigue-resistant, a fifth fast (a mixed muscle, typical) | 1.06 g/cm³
slow-muscle-tissue | slow skeletal muscle (a gram) | Life/Human/Tissues/Muscle | part | muscle-fibre-i:0.66 muscle-fibre-iia:0.15 muscle-fibre-iix:0.02 collagen:0.012 elastin:0.002 adipocyte:0.02 fibroblast:0.002 endothelial-cell:0.012 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | a postural muscle of mostly slow fibres: the soleus is about 80 % type I |
cardiac-muscle | heart muscle (a gram) | Life/Human/Tissues/Muscle | part | cardiomyocyte:0.75 fibroblast:0.03 endothelial-cell:0.03 collagen:0.015 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | heart cells joined by intercalated discs, each beating with the wave that passes through them |
smooth-muscle | smooth muscle (a gram) | Life/Human/Tissues/Muscle | part | smooth-muscle-cell:0.75 collagen:0.04 elastin:0.03 fibroblast:0.02 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | sheets of spindle cells in the walls of gut, vessels, airways and bladder |
adipose-tissue | fat (adipose tissue, a gram) | Life/Human/Tissues/Fat | part | adipocyte:0.86 fibroblast:0.005 endothelial-cell:0.01 collagen:0.02 stem-cell:0.002 extracellular-fluid:* | 1 | 10.4x10.4x10.4 | swatch | fat cells in a net of collagen and capillaries: about 37 kJ a gram of its fat stored | 0.92 g/cm³
tendon-tissue | tendon (a gram) | Life/Human/Tissues/Connective | part | tenocyte:0.03 collagen:0.3 elastin:0.01 chondroitin-sulfate:0.005 extracellular-fluid:* | 1 | 9.6x9.6x9.6 | swatch | parallel collagen I in a hierarchy (fibril, fibre, fascicle): stiff in pull, about 1 GPa modulus, 100 MPa to break (typical) |
ligament-tissue | ligament (a gram) | Life/Human/Tissues/Connective | part | fibroblast:0.03 collagen:0.25 elastin:0.04 chondroitin-sulfate:0.005 extracellular-fluid:* | 1 | 9.6x9.6x9.6 | swatch | collagen bundles a little less ordered than tendon, with more elastin: joins bone to bone |
elastic-ligament-tissue | elastic ligament (a gram) | Life/Human/Tissues/Connective | part | fibroblast:0.02 elastin:0.22 collagen:0.08 extracellular-fluid:* | 1 | 9.6x9.6x9.6 | swatch | ligament that is mostly elastin, yellow: the ligamenta flava between the vertebrae |
fascia-tissue | fascia (a gram) | Life/Human/Tissues/Connective | part | fibroblast:0.03 collagen:0.2 elastin:0.02 hyaluronic-acid:0.005 adipocyte:0.05 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | sheets of collagen that wrap muscles and organs and let them slide |
epidermis-tissue | epidermis (a gram) | Life/Human/Tissues/Skin | part | keratinocyte:0.6 corneocyte:0.2 melanocyte:0.02 extracellular-fluid:* | 1 | 9.6x9.6x9.6 | swatch | the outer skin, 0.05–1.5 mm: living keratinocytes below, dead corneocytes above; renewed every 4 weeks or so |
dermis-tissue | dermis (a gram) | Life/Human/Tissues/Skin | part | fibroblast:0.03 collagen:0.27 elastin:0.02 hyaluronic-acid:0.005 adipocyte:0.04 endothelial-cell:0.01 extracellular-fluid:* | 1 | 9.6x9.6x9.6 | swatch | the leather of the skin: collagen and elastin with its vessels, nerves, glands and follicles |
liver-tissue | liver (a gram) | Life/Human/Tissues/Organs | part | hepatocyte:0.78 endothelial-cell:0.03 monocyte:0.02 fibroblast:0.01 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | plates of hepatocytes between sinusoids, in lobules round a central vein; its Kupffer cells are macrophages |
lung-tissue | lung (a gram) | Life/Human/Tissues/Organs | part | alveolar-cell-1:0.08 alveolar-cell-2:0.08 endothelial-cell:0.12 fibroblast:0.05 monocyte:0.03 collagen:0.05 elastin:0.03 dppc:0.005 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | alveoli 200 µm across, about 480 million of them (Ochs et al. 2004), 70 m² for air to meet blood across 0.6 µm |
gut-wall-tissue | gut wall (a gram) | Life/Human/Tissues/Organs | part | enterocyte:0.25 goblet-cell:0.05 smooth-muscle:0.35 lymphocyte:0.03 fibroblast:0.03 collagen:0.03 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | four layers: the lining (mucosa) folded into villi, the submucosa, two coats of muscle, and the serosa |
kidney-tissue | kidney (a gram) | Life/Human/Tissues/Organs | part | nephron*5800 endothelial-cell:0.04 fibroblast:0.02 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | nephrons packed in cortex and medulla, with their vessels |
gland-tissue | gland (a gram) | Life/Human/Tissues/Organs | part | acinar-cell:0.7 fibroblast:0.03 endothelial-cell:0.03 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | secreting cells round ducts, in lobules (a salivary gland or the pancreas, typical) |
lymphoid-tissue | lymphoid tissue (a gram) | Life/Human/Tissues/Organs | part | lymphocyte:0.7 monocyte:0.05 fibroblast:0.02 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | lymphocytes packed in follicles on a mesh of reticular fibres: nodes, spleen, thymus, tonsils |
thyroid-tissue | thyroid (a gram) | Life/Human/Tissues/Organs | part | follicular-cell:0.45 protein:0.15 thyroxine:0.00075 endothelial-cell:0.05 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | follicles of cells round a colloid of thyroglobulin, where iodine is stored: the thyroid holds most of the body's 15–20 mg of it |
nerve-tissue | peripheral nerve (a gram) | Life/Human/Tissues/Nerve | part | schwann-cell:0.3 fibroblast:0.03 collagen:0.08 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | axons in their Schwann cells' myelin, in bundles wrapped in collagen (the axons are their neurons', counted in the brain and cord) |
`);

// ---- the bones: all 206, with their sizes ---------------------------------------------------------------------------------
// id | name | count in a body | where | length x width x depth (mm, a 176 cm man; the long bones from Trotter & Gleser 1952,
// the rest typical) | mass of bone in it (g, an estimate from its size, before scaling to ICRP's 5.5 kg) | share of it
// spongy | its shape | what it is
const BONE_TABLE = `
frontal-bone | frontal bone | 1 | Skull/Cranium | 140x120x85 | 140 | 0.15 | flatbone | the forehead and the roofs of the eye sockets
parietal-bone | parietal bone | 2 | Skull/Cranium | 125x110x10 | 115 | 0.15 | flatbone | the sides and roof of the skull, meeting at the sagittal suture
temporal-bone | temporal bone | 2 | Skull/Cranium | 90x70x50 | 90 | 0.15 | irregularbone | holds the ear: its petrous part, the densest bone of the body, houses the cochlea and the ossicles
occipital-bone | occipital bone | 1 | Skull/Cranium | 120x110x60 | 125 | 0.15 | flatbone | the back and base of the skull, round the foramen magnum where the cord leaves
sphenoid-bone | sphenoid bone | 1 | Skull/Cranium | 110x60x50 | 35 | 0.2 | irregularbone | the butterfly at the skull's base: the pituitary sits in its saddle (sella turcica)
ethmoid-bone | ethmoid bone | 1 | Skull/Cranium | 50x30x40 | 8 | 0.3 | irregularbone | between the eye sockets: its sieve plate lets the smell nerves through
nasal-bone | nasal bone | 2 | Skull/Face | 25x10x3 | 1.5 | 0.1 | flatbone | the bridge of the nose
maxilla | maxilla | 2 | Skull/Face | 60x45x40 | 25 | 0.2 | irregularbone | the upper jaw: holds the upper teeth and the maxillary sinus
lacrimal-bone | lacrimal bone | 2 | Skull/Face | 13x8x2 | 0.5 | 0.1 | flatbone | the smallest bone of the face, in the eye socket's wall: the tear duct runs by it
zygomatic-bone | zygomatic bone | 2 | Skull/Face | 50x40x15 | 10 | 0.2 | irregularbone | the cheekbone
palatine-bone | palatine bone | 2 | Skull/Face | 40x25x10 | 3 | 0.2 | irregularbone | the back of the hard palate
inferior-nasal-concha | inferior nasal concha | 2 | Skull/Face | 40x12x5 | 1.5 | 0.3 | flatbone | a scroll in the nose that warms and wets the air
vomer | vomer | 1 | Skull/Face | 40x30x2 | 2 | 0.1 | flatbone | the back of the nasal septum
mandible | mandible | 1 | Skull/Face | 100x95x65 | 80 | 0.2 | jawbone | the lower jaw, the only skull bone that moves: holds the lower teeth
malleus | malleus | 2 | Ear/Ossicles | 8x4x3 | 0.024 | 0 | shortbone | the hammer, on the eardrum: about 24 mg
incus | incus | 2 | Ear/Ossicles | 7x5x3 | 0.027 | 0 | shortbone | the anvil: about 27 mg
stapes | stapes | 2 | Ear/Ossicles | 3.2x2.8x1.4 | 0.003 | 0 | shortbone | the stirrup, the smallest bone of the body: about 3 mg, its footplate in the oval window
hyoid | hyoid bone | 1 | Neck | 50x30x10 | 3 | 0.2 | jawbone | a U under the jaw touching no other bone: holds the tongue's root and the larynx
atlas | atlas (C1) | 1 | Spine/Cervical | 80x45x15 | 12 | 0.35 | vertebra | a ring with no body that carries the skull: the yes-nod is here
axis | axis (C2) | 1 | Spine/Cervical | 55x45x40 | 18 | 0.4 | vertebra | its peg (the dens) is the pivot the atlas turns on: the no-shake
${spine('c', 'cervical', 3, 7, [50, 25, 15], [55, 30, 17], 12, 15, 'Spine/Cervical', 'a neck vertebra: small body, holes for the vertebral arteries in its side processes')}
${spine('t', 'thoracic', 1, 12, [60, 28, 20], [75, 40, 27], 20, 40, 'Spine/Thoracic', 'a vertebra of the chest: each carries a pair of ribs')}
${spine('l', 'lumbar', 1, 5, [80, 45, 28], [90, 52, 30], 55, 65, 'Spine/Lumbar', 'a vertebra of the lower back: the largest, carrying the body\'s weight')}
sacrum | sacrum | 1 | Spine/Sacrum | 110x110x50 | 150 | 0.5 | flatbone | five vertebrae fused into a wedge between the hip bones
coccyx | coccyx | 1 | Spine/Sacrum | 30x25x10 | 6 | 0.5 | shortbone | the tailbone: three to five tiny fused vertebrae
sternum | sternum | 1 | Thorax | 170x40x12 | 40 | 0.5 | flatbone | the breastbone: manubrium, body and xiphoid; red marrow all life
${ribs()}
clavicle | clavicle | 2 | Upper limb/Shoulder | 150x15x12 | 30 | 0.15 | longbone | the collarbone, the only bony tie of arm to trunk; the most often broken
scapula | scapula | 2 | Upper limb/Shoulder | 160x100x30 | 80 | 0.2 | flatbone | the shoulder blade: a triangle that glides on the ribs, its socket the shoulder joint's
humerus | humerus | 2 | Upper limb/Arm | 343x50x45 | 200 | 0.12 | longbone | the upper arm: 343 mm for a 176 cm man (stature = 3.08 × humerus + 70.45 cm)
radius | radius | 2 | Upper limb/Forearm | 257x30x22 | 70 | 0.12 | longbone | the forearm's thumb side: it turns round the ulna to turn the palm (stature = 3.78 × radius + 79.01 cm)
ulna | ulna | 2 | Upper limb/Forearm | 276x25x30 | 85 | 0.12 | longbone | the forearm's little-finger side, the point of the elbow (stature = 3.70 × ulna + 74.05 cm)
scaphoid | scaphoid | 2 | Upper limb/Wrist | 27x15x12 | 4 | 0.45 | shortbone | the boat: the most often broken wrist bone
lunate | lunate | 2 | Upper limb/Wrist | 20x15x15 | 3 | 0.45 | shortbone | the moon, at the wrist's centre
triquetrum | triquetrum | 2 | Upper limb/Wrist | 18x14x12 | 2.5 | 0.45 | shortbone | the three-cornered one
pisiform | pisiform | 2 | Upper limb/Wrist | 12x10x8 | 1 | 0.45 | sesamoidbone | the pea: a sesamoid in a tendon, at the heel of the hand
trapezium | trapezium | 2 | Upper limb/Wrist | 20x15x13 | 3.5 | 0.45 | shortbone | the saddle the thumb turns on
trapezoid | trapezoid | 2 | Upper limb/Wrist | 15x12x10 | 2 | 0.45 | shortbone | the smallest of the distal row
capitate | capitate | 2 | Upper limb/Wrist | 25x18x15 | 5.5 | 0.45 | shortbone | the largest wrist bone
hamate | hamate | 2 | Upper limb/Wrist | 22x18x14 | 4 | 0.45 | shortbone | its hook is the edge of the carpal tunnel
metacarpal-1 | first metacarpal | 2 | Upper limb/Hand | 45x12x10 | 4 | 0.15 | longbone | the thumb's palm bone
metacarpal-2 | second metacarpal | 2 | Upper limb/Hand | 68x10x9 | 6 | 0.15 | longbone | the index finger's palm bone, the longest
metacarpal-3 | third metacarpal | 2 | Upper limb/Hand | 65x10x9 | 6 | 0.15 | longbone | the middle finger's palm bone
metacarpal-4 | fourth metacarpal | 2 | Upper limb/Hand | 58x8x8 | 3.5 | 0.15 | longbone | the ring finger's palm bone
metacarpal-5 | fifth metacarpal | 2 | Upper limb/Hand | 54x8x8 | 3.5 | 0.15 | longbone | the little finger's palm bone: the boxer's fracture
hand-proximal-phalanx | proximal phalanx of the hand | 10 | Upper limb/Fingers | 40x9x7 | 2.5 | 0.15 | longbone | the first bone of each finger and of the thumb
hand-middle-phalanx | middle phalanx of the hand | 8 | Upper limb/Fingers | 26x8x6 | 1.3 | 0.15 | longbone | the second bone of each finger (the thumb has none)
hand-distal-phalanx | distal phalanx of the hand | 10 | Upper limb/Fingers | 18x7x5 | 0.7 | 0.15 | longbone | the fingertip bone, under the nail
hip-bone | hip bone | 2 | Lower limb/Pelvis | 220x160x110 | 300 | 0.3 | flatbone | ilium, ischium and pubis fused at the hip socket (acetabulum)
femur | femur | 2 | Lower limb/Thigh | 481x50x45 | 480 | 0.12 | longbone | the thigh bone, the longest and strongest: 481 mm for a 176 cm man (stature = 2.38 × femur + 61.41 cm, Trotter & Gleser 1952); takes about 3 times body weight walking
patella | patella | 2 | Lower limb/Knee | 50x45x22 | 25 | 0.4 | sesamoidbone | the kneecap, the largest sesamoid, in the quadriceps tendon
tibia | tibia | 2 | Lower limb/Leg | 386x45x40 | 360 | 0.12 | longbone | the shin bone, carrying the weight (stature = 2.52 × tibia + 78.62 cm)
fibula | fibula | 2 | Lower limb/Leg | 389x15x15 | 75 | 0.1 | longbone | the thin bone beside the tibia: muscles hang from it; the outer ankle (stature = 2.68 × fibula + 71.78 cm)
calcaneus | calcaneus | 2 | Lower limb/Ankle | 80x40x45 | 60 | 0.5 | shortbone | the heel bone, the largest of the foot: the Achilles tendon pulls on it
talus | talus | 2 | Lower limb/Ankle | 55x40x35 | 40 | 0.45 | shortbone | the ankle bone between leg and foot, with no muscle on it
navicular | navicular | 2 | Lower limb/Ankle | 35x25x15 | 10 | 0.45 | shortbone | the boat of the foot's inner arch
cuboid | cuboid | 2 | Lower limb/Ankle | 35x25x25 | 12 | 0.45 | shortbone | on the outer side, in front of the heel
medial-cuneiform | medial cuneiform | 2 | Lower limb/Ankle | 30x20x25 | 8 | 0.45 | shortbone | the largest wedge
intermediate-cuneiform | intermediate cuneiform | 2 | Lower limb/Ankle | 20x15x20 | 4 | 0.45 | shortbone | the smallest wedge
lateral-cuneiform | lateral cuneiform | 2 | Lower limb/Ankle | 22x15x20 | 5 | 0.45 | shortbone | the outer wedge
metatarsal-1 | first metatarsal | 2 | Lower limb/Foot | 63x20x18 | 15 | 0.15 | longbone | the big toe's, shortest and thickest: a third of standing weight
metatarsal-2 | second metatarsal | 2 | Lower limb/Foot | 75x12x12 | 10 | 0.15 | longbone | the longest: where stress fractures come
metatarsal-3 | third metatarsal | 2 | Lower limb/Foot | 70x11x11 | 8 | 0.15 | longbone | the middle toe's
metatarsal-4 | fourth metatarsal | 2 | Lower limb/Foot | 68x10x10 | 7 | 0.15 | longbone | the fourth toe's
metatarsal-5 | fifth metatarsal | 2 | Lower limb/Foot | 68x12x10 | 7 | 0.15 | longbone | the little toe's, with a tubercle at its base
foot-proximal-phalanx | proximal phalanx of the foot | 10 | Lower limb/Toes | 25x10x8 | 2.6 | 0.15 | longbone | the first bone of each toe (the big toe's about 5 g)
foot-middle-phalanx | middle phalanx of the foot | 8 | Lower limb/Toes | 10x8x6 | 0.8 | 0.15 | longbone | the second bone of the lesser toes (the big toe has none)
foot-distal-phalanx | distal phalanx of the foot | 10 | Lower limb/Toes | 10x9x6 | 0.8 | 0.15 | longbone | the toe-tip bone
`;
/** Vertebrae from one to another, their sizes and masses stepping between the first's and the last's (estimates). */
function spine(p: string, kind: string, a: number, b: number, s0: number[], s1: number[], m0: number, m1: number, where: string, says: string): string {
  const out: string[] = [];
  for (let k = a; k <= b; k++) { const t = b === a ? 0 : (k - a) / (b - a), sz = s0.map((x, i) => Math.round(x + t * (s1[i]! - x))); out.push(`${p}${k} | ${kind} vertebra ${p.toUpperCase()}${k} | 1 | ${where} | ${sz.join('x')} | ${+(m0 + t * (m1 - m0)).toFixed(1)} | ${kind === 'cervical' ? 0.35 : 0.45} | vertebra | ${says}`); }
  return out.join('\n');
}
/** The twelve pairs of ribs: seven true (to the sternum), three false (to the cartilage above), two floating. */
function ribs(): string {
  const len = [120, 180, 230, 260, 275, 285, 290, 280, 260, 230, 170, 120];
  return len.map((L, i) => { const n = i + 1, kind = n <= 7 ? 'a true rib: its cartilage joins the sternum' : n <= 10 ? 'a false rib: its cartilage joins the one above' : 'a floating rib: free at its front'; return `rib-${n} | rib ${n} | 2 | Thorax/Ribs | ${L}x${n === 1 ? 25 : 15}x${n === 1 ? 6 : 9} | ${+(L * 0.085).toFixed(1)} | 0.25 | rib | ${kind}${n === 1 ? '; the shortest and flattest' : ''}`; }).join('\n');
}
interface Bone { id: string; name: string; count: number; where: string; size: [number, number, number]; m: number; trab: number; look: string; says: string }
export const BONES: Bone[] = BONE_TABLE.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [id, name, count, where, size, m, trab, look, says] = l.split(' | ').map((x) => x.trim()) as string[]; return { id: id!, name: name!, count: Number(count), where: where!, size: size!.split('x').map(Number) as [number, number, number], m: Number(m), trab: Number(trab), look: look!, says: says! }; });
/** Compact and spongy bone in all, g (ICRP 89: 4,400 and 1,100). */
const CORTICAL = 4400, TRABECULAR = 1100;
const sumC = BONES.reduce((a, b) => a + b.count * b.m * (1 - b.trab), 0), sumT = BONES.reduce((a, b) => a + b.count * b.m * b.trab, 0);
const sig = (x: number) => +x.toPrecision(3);
export const BONE_ENTRIES: LifeEntry[] = BONES.map((b) => {
  const c = sig((b.m * (1 - b.trab) * CORTICAL) / sumC), t = sig((b.m * b.trab * TRABECULAR) / sumT);
  return { id: b.id, name: b.name, path: `Life/Human/Bones/${b.where.split('/')[0]}`, kind: 'part', of: [{ id: 'cortical-bone', n: c }, ...(t > 0 ? [{ id: 'trabecular-bone', n: t }] : [])], mass: { 'cortical-bone': c, ...(t > 0 ? { 'trabecular-bone': t } : {}) }, g: NaN, size: b.size, look: b.look, says: b.says, spec: `${b.count === 1 ? 'one' : b.count} in a body; ${b.where.replace('/', ', ').toLowerCase()}; ${(c + t).toFixed(c + t < 1 ? 3 : 0)} g of bone (its share of ICRP 89's 5.5 kg, from its size: an estimate)` } satisfies LifeEntry;
});
const boneN = (id: string) => BONES.find((b) => b.id === id)!.count;
const bones = (...ids: string[]) => ids.map((id) => (boneN(id) > 2 ? `${id}*${boneN(id) / 2}` : id)).join(' ');
const bonesAll = (...ids: string[]) => ids.map((id) => (boneN(id) > 1 ? `${id}*${boneN(id)}` : id)).join(' ');

// ---- the teeth: 32 ----------------------------------------------------------------------------------------------------------
const TEETH = entries(`
incisor | incisor | Life/Human/Teeth | part | enamel:0.2 dentin:0.5 pulp-tissue:0.05 | = | 23x7x6 | tooth | a chisel for cutting: eight in an adult, four upper and four lower (masses of each tooth estimates) |
canine | canine | Life/Human/Teeth | part | enamel:0.3 dentin:0.72 pulp-tissue:0.08 | = | 27x8x8 | tooth | the longest root: four |
premolar | premolar | Life/Human/Teeth | part | enamel:0.3 dentin:0.8 pulp-tissue:0.1 | = | 22x8x9 | tooth | two cusps for crushing: eight |
molar | molar | Life/Human/Teeth | part | enamel:0.55 dentin:1.5 pulp-tissue:0.15 | = | 20x11x10 | tooth | four or five cusps for grinding: twelve, the last four the wisdom teeth |
pulp-tissue | tooth pulp (a gram) | Life/Human/Teeth | part | fibroblast:0.05 collagen:0.1 endothelial-cell:0.03 extracellular-fluid:* | 1 | 10x10x10 | swatch | the living core of a tooth: nerve, vessels and the odontoblasts that make dentine |
teeth | the teeth (32) | Life/Human/Teeth | assembly | incisor*8 canine*4 premolar*8 molar*12 | = | 120x60x40 | jawbone | the permanent teeth: about 50 g in all (ICRP 89) |
`);

// ---- the skeleton --------------------------------------------------------------------------------------------------------
const SKELETON = entries(`
cranium | cranium | Life/Human/Skeleton | assembly | ${bonesAll('frontal-bone', 'parietal-bone', 'temporal-bone', 'occipital-bone', 'sphenoid-bone', 'ethmoid-bone')} | = | 190x150x140 | skull | the eight bones round the brain, joined by sutures that close in adulthood |
face-bones | the bones of the face | Life/Human/Skeleton | assembly | ${bonesAll('nasal-bone', 'maxilla', 'lacrimal-bone', 'zygomatic-bone', 'palatine-bone', 'inferior-nasal-concha', 'vomer', 'mandible')} | = | 140x120x100 | skull | the fourteen bones of the face |
skull | skull | Life/Human/Skeleton | assembly | cranium face-bones | = | 190x150x220 | skull | 22 bones: 8 of the cranium, 14 of the face |
ossicles | the ear's bones | Life/Human/Skeleton | assembly | malleus incus stapes | = | 10x8x6 | shortbone | three bones each side that carry sound from the eardrum to the cochlea, multiplying its pressure about 20 times |
spine | spine (vertebral column) | Life/Human/Skeleton | assembly | atlas axis c3 c4 c5 c6 c7 t1 t2 t3 t4 t5 t6 t7 t8 t9 t10 t11 t12 l1 l2 l3 l4 l5 sacrum coccyx intervertebral-disc*23 | = | 720x90x120 | spine | 26 bones: 7 cervical, 12 thoracic, 5 lumbar, the sacrum and the coccyx; 23 discs between them |
ribcage | ribcage | Life/Human/Skeleton | assembly | sternum ${Array.from({ length: 12 }, (_, i) => `rib-${i + 1}*2`).join(' ')} costal-cartilage*20 | = | 300x280x220 | ribcage | the sternum and 24 ribs: 25 bones round heart and lungs |
arm-bones | the bones of an arm | Life/Human/Skeleton | assembly | clavicle scapula humerus radius ulna hand-bones | = | 750x160x100 | longbone | 32 bones a side, shoulder to fingertip |
hand-bones | the bones of a hand | Life/Human/Skeleton | assembly | scaphoid lunate triquetrum pisiform trapezium trapezoid capitate hamate metacarpal-1 metacarpal-2 metacarpal-3 metacarpal-4 metacarpal-5 ${bones('hand-proximal-phalanx', 'hand-middle-phalanx', 'hand-distal-phalanx')} | = | 190x90x30 | shortbone | 27 bones: 8 of the wrist, 5 of the palm, 14 of the fingers |
leg-bones | the bones of a leg | Life/Human/Skeleton | assembly | hip-bone femur patella tibia fibula foot-bones meniscus*2 | = | 1000x160x120 | longbone | 31 bones a side, hip to toe |
foot-bones | the bones of a foot | Life/Human/Skeleton | assembly | calcaneus talus navicular cuboid medial-cuneiform intermediate-cuneiform lateral-cuneiform metatarsal-1 metatarsal-2 metatarsal-3 metatarsal-4 metatarsal-5 ${bones('foot-proximal-phalanx', 'foot-middle-phalanx', 'foot-distal-phalanx')} | = | 260x95x70 | shortbone | 26 bones: 7 of the ankle, 5 of the sole, 14 of the toes |
intervertebral-disc | intervertebral disc | Life/Human/Skeleton | part | fibrocartilage:4 cartilage-matrix:2 | = | 45x35x9 | disc | a ring of fibrocartilage (annulus) round a gel (nucleus pulposus): the spine's shock absorber (its mass an estimate: lumbar ones larger) |
costal-cartilage | costal cartilage | Life/Human/Skeleton | part | hyaline-cartilage:12 | = | 100x15x8 | rod | hyaline cartilage that joins a rib to the sternum and lets the chest spring (an estimate) |
meniscus | meniscus | Life/Human/Skeleton | part | fibrocartilage:8 | = | 45x35x8 | disc | a C of fibrocartilage between femur and tibia: two in each knee, medial and lateral (an estimate) |
skeleton | skeleton | Life/Human/Systems | assembly | skull ossicles*2 hyoid spine ribcage arm-bones*2 leg-bones*2 teeth red-marrow:1170 yellow-marrow:2480 hyaline-cartilage:* dense-connective-skeleton:200 | 10500 | 1760x450x300 | skeleton | 206 bones, and the marrow, cartilage and teeth in them: about 14.5 % of the body (ICRP 89: bone 5.5 kg, red marrow 1.17 kg, yellow marrow 2.48 kg, cartilage 1.1 kg, teeth 50 g, other 200 g) | ICRP 89
dense-connective-skeleton | periosteum and joint tissue (a gram) | Life/Human/Tissues/Connective | part | fibroblast:0.03 collagen:0.25 hyaluronic-acid:0.005 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | the skin of bone (periosteum) and the capsules of joints |
`);

// ---- the muscles, by name ---------------------------------------------------------------------------------------------------
// id | name | a side (2) or one (1) | where | g (each, an estimate for a typical adult man) | what it does | from → to | nerve
const MUSCLE_TABLE = `
gluteus-maximus | gluteus maximus | 2 | Hip | 850 | extends and turns out the thigh: climbing, standing up; the largest muscle | ilium, sacrum, coccyx → gluteal tuberosity of the femur, iliotibial band | inferior gluteal nerve
gluteus-medius | gluteus medius | 2 | Hip | 330 | holds the pelvis level on one leg; lifts the thigh sideways | ilium → greater trochanter | superior gluteal nerve
gluteus-minimus | gluteus minimus | 2 | Hip | 110 | helps gluteus medius; turns the thigh in | ilium → greater trochanter | superior gluteal nerve
tensor-fasciae-latae | tensor fasciae latae | 2 | Hip | 70 | tightens the iliotibial band; steadies the knee | iliac crest → iliotibial band | superior gluteal nerve
deep-hip-rotators | deep hip rotators (piriformis, obturators, gemelli, quadratus femoris) | 2 | Hip | 80 | turn the thigh out and seat the hip | sacrum, pelvis → greater trochanter | sacral plexus
iliacus | iliacus | 2 | Hip | 150 | flexes the hip | iliac fossa → lesser trochanter | femoral nerve
psoas-major | psoas major | 2 | Hip | 230 | flexes the hip and the spine | lumbar vertebrae → lesser trochanter | lumbar plexus
rectus-femoris | rectus femoris | 2 | Thigh | 210 | straightens the knee and flexes the hip: a kick | anterior inferior iliac spine → patella, tibial tuberosity | femoral nerve
vastus-lateralis | vastus lateralis | 2 | Thigh | 600 | straightens the knee: the largest of the quadriceps | femur → patella, tibial tuberosity | femoral nerve
vastus-medialis | vastus medialis | 2 | Thigh | 380 | straightens the knee, tracks the patella | femur → patella, tibial tuberosity | femoral nerve
vastus-intermedius | vastus intermedius | 2 | Thigh | 340 | straightens the knee | femur → patella, tibial tuberosity | femoral nerve
sartorius | sartorius | 2 | Thigh | 120 | flexes, turns out hip and knee: the tailor's muscle, the longest | anterior superior iliac spine → tibia (pes anserinus) | femoral nerve
gracilis | gracilis | 2 | Thigh | 80 | draws the thigh in, flexes the knee | pubis → tibia (pes anserinus) | obturator nerve
adductor-longus | adductor longus | 2 | Thigh | 140 | draws the thigh in | pubis → femur (linea aspera) | obturator nerve
adductor-brevis | adductor brevis | 2 | Thigh | 90 | draws the thigh in | pubis → femur | obturator nerve
adductor-magnus | adductor magnus | 2 | Thigh | 600 | draws in and extends the thigh | pubis, ischium → femur | obturator and sciatic nerves
pectineus | pectineus | 2 | Thigh | 50 | draws in and flexes the thigh | pubis → femur | femoral nerve
biceps-femoris | biceps femoris | 2 | Thigh | 240 | flexes the knee, extends the hip: the outer hamstring | ischial tuberosity, femur → fibula head | sciatic nerve
semitendinosus | semitendinosus | 2 | Thigh | 160 | flexes the knee, extends the hip | ischial tuberosity → tibia (pes anserinus) | sciatic nerve
semimembranosus | semimembranosus | 2 | Thigh | 230 | flexes the knee, extends the hip | ischial tuberosity → tibia | sciatic nerve
gastrocnemius | gastrocnemius | 2 | Leg | 330 | points the foot and flexes the knee: jumping | femoral condyles → calcaneus (Achilles tendon) | tibial nerve
soleus | soleus | 2 | Leg | 450 | points the foot: standing and walking; mostly slow fibres | tibia, fibula → calcaneus (Achilles tendon) | tibial nerve
tibialis-anterior | tibialis anterior | 2 | Leg | 120 | lifts the foot and turns its sole in | tibia → medial cuneiform, first metatarsal | deep fibular nerve
tibialis-posterior | tibialis posterior | 2 | Leg | 90 | points the foot, holds up the arch | tibia, fibula → navicular, cuneiforms | tibial nerve
fibularis-longus | fibularis (peroneus) longus | 2 | Leg | 80 | turns the sole out, holds the arch | fibula → first metatarsal, medial cuneiform | superficial fibular nerve
fibularis-brevis | fibularis (peroneus) brevis | 2 | Leg | 40 | turns the sole out | fibula → fifth metatarsal | superficial fibular nerve
extensor-digitorum-longus | extensor digitorum longus | 2 | Leg | 60 | lifts the toes and foot | tibia, fibula → toes 2–5 | deep fibular nerve
extensor-hallucis-longus | extensor hallucis longus | 2 | Leg | 20 | lifts the big toe | fibula → big toe | deep fibular nerve
flexor-digitorum-longus | flexor digitorum longus | 2 | Leg | 30 | curls the toes | tibia → toes 2–5 | tibial nerve
flexor-hallucis-longus | flexor hallucis longus | 2 | Leg | 60 | curls the big toe: the push-off of a step | fibula → big toe | tibial nerve
popliteus | popliteus | 2 | Leg | 20 | unlocks the straight knee | femur → tibia | tibial nerve
foot-muscles | the foot's own muscles | 2 | Foot | 100 | spread, curl and steady the toes; hold the arches | in the foot | plantar nerves
deltoid | deltoid | 2 | Shoulder | 400 | lifts the arm: front, side and back | clavicle, acromion, scapular spine → humerus (deltoid tuberosity) | axillary nerve
supraspinatus | supraspinatus | 2 | Shoulder | 70 | starts lifting the arm; part of the rotator cuff | scapula → greater tubercle | suprascapular nerve
infraspinatus | infraspinatus | 2 | Shoulder | 150 | turns the arm out; rotator cuff | scapula → greater tubercle | suprascapular nerve
teres-minor | teres minor | 2 | Shoulder | 30 | turns the arm out; rotator cuff | scapula → greater tubercle | axillary nerve
subscapularis | subscapularis | 2 | Shoulder | 200 | turns the arm in; rotator cuff | scapula (front) → lesser tubercle | subscapular nerves
teres-major | teres major | 2 | Shoulder | 90 | draws the arm down and in | scapula → humerus | lower subscapular nerve
pectoralis-major | pectoralis major | 2 | Chest | 400 | draws the arm across and down: pushing, hugging | clavicle, sternum, ribs → humerus | pectoral nerves
pectoralis-minor | pectoralis minor | 2 | Chest | 70 | draws the shoulder blade forward and down | ribs 3–5 → coracoid | medial pectoral nerve
serratus-anterior | serratus anterior | 2 | Chest | 250 | holds the shoulder blade to the ribs and swings it: punching | ribs 1–8 → scapula | long thoracic nerve
latissimus-dorsi | latissimus dorsi | 2 | Back | 350 | pulls the arm down and back: climbing, rowing | spine, pelvis → humerus | thoracodorsal nerve
trapezius | trapezius | 2 | Back | 300 | lifts, draws back and turns the shoulder blade | skull, spine → clavicle, scapula | accessory nerve
rhomboids | rhomboids | 2 | Back | 100 | draw the shoulder blades together | spine → scapula | dorsal scapular nerve
levator-scapulae | levator scapulae | 2 | Back | 50 | lifts the shoulder blade | cervical vertebrae → scapula | dorsal scapular nerve
erector-spinae | erector spinae (iliocostalis, longissimus, spinalis) | 2 | Back | 700 | holds the spine up and straightens it | sacrum, pelvis, vertebrae → ribs, vertebrae, skull | spinal nerves
multifidus | multifidus | 2 | Back | 120 | steadies each vertebra | vertebrae → vertebrae two to four above | spinal nerves
quadratus-lumborum | quadratus lumborum | 2 | Back | 60 | bends the trunk sideways, holds the pelvis | iliac crest → rib 12, lumbar vertebrae | lumbar plexus
rectus-abdominis | rectus abdominis | 2 | Abdomen | 150 | flexes the trunk: the six-pack | pubis → ribs 5–7, sternum | intercostal nerves
external-oblique | external oblique | 2 | Abdomen | 250 | twists and flexes the trunk | ribs 5–12 → iliac crest, linea alba | intercostal nerves
internal-oblique | internal oblique | 2 | Abdomen | 180 | twists and flexes the trunk | iliac crest → ribs 10–12, linea alba | intercostal nerves
transversus-abdominis | transversus abdominis | 2 | Abdomen | 120 | draws the belly in: a corset | ribs, iliac crest → linea alba | intercostal nerves
diaphragm | diaphragm | 1 | Thorax | 300 | the muscle of breathing: its dome drops and draws air in, about 12 times a minute | ribs, sternum, lumbar vertebrae → its central tendon | phrenic nerve
intercostals | intercostal muscles | 1 | Thorax | 300 | lift and lower the ribs | between the ribs | intercostal nerves
sternocleidomastoid | sternocleidomastoid | 2 | Neck | 70 | turns and bends the head | sternum, clavicle → mastoid process | accessory nerve
scalenes | scalenes | 2 | Neck | 50 | lift the first ribs; bend the neck | cervical vertebrae → ribs 1–2 | cervical nerves
biceps-brachii | biceps brachii | 2 | Arm | 180 | bends the elbow and turns the palm up | scapula (two heads) → radial tuberosity | musculocutaneous nerve
brachialis | brachialis | 2 | Arm | 150 | bends the elbow: its main flexor | humerus → ulna | musculocutaneous nerve
coracobrachialis | coracobrachialis | 2 | Arm | 30 | draws the arm forward and in | coracoid → humerus | musculocutaneous nerve
triceps-brachii | triceps brachii | 2 | Arm | 450 | straightens the elbow: pushing | scapula, humerus (three heads) → olecranon | radial nerve
brachioradialis | brachioradialis | 2 | Forearm | 70 | bends the elbow, the thumb up | humerus → radius (styloid) | radial nerve
forearm-flexors | the forearm's flexors (flexor carpi, digitorum, pollicis, palmaris) | 2 | Forearm | 200 | bend the wrist and curl the fingers: gripping | medial epicondyle, radius, ulna → wrist, fingers | median and ulnar nerves
forearm-extensors | the forearm's extensors (extensor carpi, digitorum, pollicis) | 2 | Forearm | 150 | straighten the wrist and fingers | lateral epicondyle, radius, ulna → wrist, fingers | radial nerve
pronator-teres | pronator teres | 2 | Forearm | 40 | turns the palm down | humerus, ulna → radius | median nerve
supinator | supinator | 2 | Forearm | 25 | turns the palm up | humerus, ulna → radius | radial nerve
hand-muscles | the hand's own muscles (thenar, hypothenar, interossei, lumbricals) | 2 | Hand | 60 | the fine moves of thumb and fingers | in the hand | median and ulnar nerves
masseter | masseter | 2 | Head | 25 | closes the jaw: chewing, the strongest bite for its size | zygomatic arch → mandible | trigeminal nerve
temporalis | temporalis | 2 | Head | 30 | closes and draws back the jaw | temporal fossa → coronoid process | trigeminal nerve
face-muscles | the muscles of the face | 1 | Head | 60 | expression: about 20 pairs, from orbicularis oculi to zygomaticus (a smile) | skull → skin | facial nerve
eye-muscles | the eye's muscles | 2 | Head | 6 | turn the eye: four recti, two obliques | the orbit → the eye | oculomotor, trochlear and abducens nerves
pelvic-floor | pelvic floor (levator ani, coccygeus) | 1 | Pelvis | 60 | holds up the pelvic organs; continence | pelvis → coccyx, perineum | pudendal nerve
`;
interface Muscle { id: string; name: string; count: number; where: string; g: number; does: string; runs: string; nerve: string }
export const MUSCLES: Muscle[] = MUSCLE_TABLE.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [id, name, count, where, g, does, runs, nerve] = l.split(' | ').map((x) => x.trim()) as string[]; return { id: id!, name: name!, count: Number(count), where: where!, g: Number(g), does: does!, runs: runs!, nerve: nerve! }; });
export const MUSCLE_ENTRIES: LifeEntry[] = MUSCLES.map((m) => {
  const t = m.id === 'soleus' ? 'slow-muscle-tissue' : 'skeletal-muscle-tissue';
  return { id: m.id, name: m.name, path: `Life/Human/Muscles/${m.where}`, kind: 'part', of: [{ id: t, n: m.g }], mass: { [t]: m.g }, g: m.g, size: muscleSize(m.g), look: 'muscle', says: `${m.does}. ${m.runs}; ${m.nerve}`, spec: `${m.count === 2 ? 'one each side' : 'one'}; about ${m.g} g (an estimate for a typical adult man)` };
});
/** A spindle of a muscle's mass, mm: its length about 4 times its width (an estimate). */
function muscleSize(g: number): [number, number, number] { const v = (g / 1.06) * 1000, w = Math.cbrt(v / (4 * 0.52)); return [Math.round(4 * w), Math.round(w), Math.round(w * 0.7)]; }
const musclesOf = () => MUSCLES.map((m) => (m.count === 2 ? `${m.id}*2` : m.id)).join(' ');

// ---- tendons and ligaments, by name --------------------------------------------------------------------------------------
// id | name | a side or one | where | its tissue | g (an estimate from its typical size) | LxWxH mm | what it is
const CONNECTIVE_TABLE = `
achilles-tendon | Achilles (calcaneal) tendon | 2 | Tendons/Leg | tendon-tissue | 12 | 150x15x6 | the thickest, strongest tendon: gastrocnemius and soleus to the heel; takes up to 12 times body weight running
patellar-tendon | patellar tendon (ligament) | 2 | Tendons/Knee | tendon-tissue | 8 | 50x30x5 | patella to tibial tuberosity: carries the quadriceps' pull
quadriceps-tendon | quadriceps tendon | 2 | Tendons/Knee | tendon-tissue | 10 | 70x35x6 | the four quadriceps to the patella
hamstring-tendons | hamstring tendons | 2 | Tendons/Thigh | tendon-tissue | 12 | 120x10x5 | the hamstrings to the ischium above, tibia and fibula below
iliotibial-band | iliotibial band | 2 | Tendons/Thigh | fascia-tissue | 30 | 450x40x2 | a strap of fascia down the outer thigh, hip to tibia
tibialis-tendons | tendons of the leg's front and back (tibialis, fibularis, toe flexors and extensors) | 2 | Tendons/Leg | tendon-tissue | 15 | 200x5x3 | they cross the ankle under retinacula to the foot
plantar-fascia | plantar fascia (aponeurosis) | 2 | Tendons/Foot | tendon-tissue | 10 | 200x25x2 | the bowstring of the foot's arch, heel to toes
rotator-cuff-tendons | rotator cuff tendons | 2 | Tendons/Shoulder | tendon-tissue | 8 | 40x30x5 | supraspinatus, infraspinatus, teres minor and subscapularis blended into the shoulder's capsule
biceps-tendons | biceps tendons | 2 | Tendons/Arm | tendon-tissue | 4 | 90x6x4 | the long head through the shoulder, the distal one to the radius
triceps-tendon | triceps tendon | 2 | Tendons/Arm | tendon-tissue | 4 | 50x20x4 | to the olecranon
forearm-tendons | the wrist's and fingers' tendons (flexors through the carpal tunnel, extensors on the back) | 2 | Tendons/Hand | tendon-tissue | 18 | 200x4x2 | about 20 a side: they move the fingers from the forearm, like a puppet's strings
palmar-aponeurosis | palmar aponeurosis | 2 | Tendons/Hand | tendon-tissue | 3 | 70x40x1 | under the palm's skin: shields the tendons
central-tendon | central tendon of the diaphragm | 1 | Tendons/Trunk | tendon-tissue | 15 | 150x100x1 | the diaphragm's tendon centre, under the heart
linea-alba | linea alba and the abdominal aponeuroses | 1 | Tendons/Trunk | tendon-tissue | 60 | 350x200x1 | the white line where the abdominal muscles' tendinous sheets meet
thoracolumbar-fascia | thoracolumbar fascia | 1 | Tendons/Trunk | fascia-tissue | 60 | 300x250x1.5 | a diamond of fascia over the lower back
acl | anterior cruciate ligament | 2 | Ligaments/Knee | ligament-tissue | 2 | 32x11x7 | stops the tibia sliding forward under the femur; the one torn in sport
pcl | posterior cruciate ligament | 2 | Ligaments/Knee | ligament-tissue | 3 | 38x13x8 | stops the tibia sliding back
mcl | medial collateral ligament | 2 | Ligaments/Knee | ligament-tissue | 3 | 100x15x2 | the knee's inner side
lcl | lateral collateral ligament | 2 | Ligaments/Knee | ligament-tissue | 1 | 60x5x3 | the knee's outer side
ankle-ligaments | ankle ligaments (anterior talofibular, calcaneofibular, deltoid) | 2 | Ligaments/Ankle | ligament-tissue | 4 | 30x15x3 | the ankle's sides: the anterior talofibular the one a sprain tears
foot-ligaments | foot ligaments (spring, plantar, interosseous) | 2 | Ligaments/Foot | ligament-tissue | 10 | 30x10x3 | tie the 26 bones of the foot into arches
hip-ligaments | hip ligaments (iliofemoral, pubofemoral, ischiofemoral, ligament of the head) | 2 | Ligaments/Hip | ligament-tissue | 25 | 80x40x5 | the iliofemoral, the strongest ligament, stops the hip over-extending
pelvic-ligaments | pelvic ligaments (sacroiliac, sacrospinous, sacrotuberous, inguinal) | 2 | Ligaments/Pelvis | ligament-tissue | 30 | 100x30x5 | bind sacrum to hip bones
shoulder-ligaments | shoulder ligaments (glenohumeral, coracohumeral, coracoclavicular, acromioclavicular) | 2 | Ligaments/Shoulder | ligament-tissue | 8 | 40x15x3 | the shoulder's loose capsule and the collarbone's ties
elbow-ligaments | elbow ligaments (ulnar and radial collateral, annular) | 2 | Ligaments/Elbow | ligament-tissue | 3 | 30x10x2 | the annular ring holds the radius's head to the ulna
wrist-hand-ligaments | wrist and hand ligaments (transverse carpal, scapholunate, collaterals) | 2 | Ligaments/Hand | ligament-tissue | 6 | 25x8x2 | tie the carpals; the transverse carpal roofs the carpal tunnel
spinal-ligaments | spinal ligaments (anterior and posterior longitudinal, interspinous, supraspinous, nuchal) | 1 | Ligaments/Spine | ligament-tissue | 60 | 700x20x2 | run the spine's length, front and back
ligamenta-flava | ligamenta flava | 1 | Ligaments/Spine | elastic-ligament-tissue | 20 | 15x15x4 | yellow elastic ligaments joining each vertebra's arch to the next: 23 of them
deep-fascia | deep fascia and muscle sheaths | 1 | Fascia | fascia-tissue | 500 | 1700x500x1 | wraps every muscle (epimysium) and limb in compartments (an estimate)
`;
interface Band { id: string; name: string; count: number; where: string; tissue: string; g: number; size: [number, number, number]; says: string }
export const BANDS: Band[] = CONNECTIVE_TABLE.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [id, name, count, where, tissue, g, size, says] = l.split(' | ').map((x) => x.trim()) as string[]; return { id: id!, name: name!, count: Number(count), where: where!, tissue: tissue!, g: Number(g), size: size!.split('x').map(Number) as [number, number, number], says: says! }; });
export const BAND_ENTRIES: LifeEntry[] = BANDS.map((b) => ({ id: b.id, name: b.name, path: `Life/Human/${b.where}`, kind: 'part', of: [{ id: b.tissue, n: b.g }], mass: { [b.tissue]: b.g }, g: b.g, size: b.size, look: b.tissue === 'fascia-tissue' ? 'sheet' : 'tendon', says: b.says, spec: `${b.count === 2 ? 'one each side' : 'one'}; about ${b.g} g (an estimate from its typical size)` }));
const bandsOf = () => BANDS.map((b) => (b.count === 2 ? `${b.id}*2` : b.id)).join(' ');

// ---- organs and systems ----------------------------------------------------------------------------------------------------
const ORGANS = entries(`
// ---- blood: its cells counted (ICRP 89 blood volume 5.3 l; the reference ranges' middles) -------------------------
blood | blood | Life/Human/Blood | assembly | red-blood-cell*2.65e13 neutrophil*2.2e10 lymphocyte*1.1e10 monocyte*2.1e9 eosinophil*1.1e9 basophil*1.9e8 platelet*1.33e12 plasma:* | 5600 | 300x300x60 | blood | 5.3 litres (ICRP 89): red cells 5.0 million a µl (4.5–5.9), white 7,000 (4,000–11,000), platelets 250,000 (150,000–400,000); haematocrit about 46 %; type O, A, B or AB by the sugars on its red cells, Rh + or − | its counts are the reference ranges' middles for a man; Sender et al. 2016: about 25 trillion red cells
// ---- the heart ----------------------------------------------------------------------------------------------------------------
left-ventricle | left ventricle | Life/Human/Heart | part | cardiac-muscle:150 | = | 90x55x55 | chamber | pumps blood to the whole body at 120 mmHg; its wall about 10 mm thick |
right-ventricle | right ventricle | Life/Human/Heart | part | cardiac-muscle:60 | = | 80x50x30 | chamber | pumps blood through the lungs at 25 mmHg; its wall 3–5 mm |
atria | atria | Life/Human/Heart | part | cardiac-muscle:45 | = | 60x50x40 | chamber | the two receiving chambers; the right holds the pacemaker (sinoatrial node) |
heart-valve | heart valve | Life/Human/Heart | part | dense-connective-skeleton:2 | = | 30x30x2 | valve | flaps of collagen that let blood one way: mitral, tricuspid, aortic, pulmonary (an estimate) |
pericardium | pericardium | Life/Human/Heart | part | dense-connective-skeleton:20 | = | 120x100x1 | sheet | the bag round the heart (an estimate) |
heart | heart | Life/Human/Circulatory | assembly | left-ventricle right-ventricle atria heart-valve*4 pericardium adipose-tissue:20 cardiac-muscle:* | 330 | 120x85x60 | heart | pumps about 5 litres a minute at rest, 100,000 beats a day | ICRP 89: 330 g (tissue)
circulatory-system | circulatory system | Life/Human/Systems | assembly | heart blood | = | 1760x450x300 | vessels | the heart and blood, through about 100,000 km of vessels (an estimate) |
// ---- breathing ---------------------------------------------------------------------------------------------------------------
right-lung | right lung | Life/Human/Lungs | part | lung-tissue:270 | = | 250x150x100 | lung | three lobes: upper, middle and lower | 55 % of lung tissue (typical)
left-lung | left lung | Life/Human/Lungs | part | lung-tissue:230 | = | 240x130x100 | lung | two lobes, upper and lower, and a notch for the heart |
trachea | trachea | Life/Human/Lungs | part | hyaline-cartilage:4 smooth-muscle:2 gut-wall-tissue:* | 10 | 110x20x20 | tube | the windpipe: 16–20 C-rings of cartilage | ICRP 89: 10 g
larynx | larynx | Life/Human/Lungs | part | hyaline-cartilage:12 elastic-cartilage:2 skeletal-muscle-tissue:10 gut-wall-tissue:* | 28 | 50x45x40 | larynx | the voice box: the vocal folds vibrate at about 100–150 Hz in a man's voice | ICRP 89: 28 g
respiratory-system | respiratory system | Life/Human/Systems | assembly | right-lung left-lung trachea larynx | = | 300x250x150 | lung | breathes about 12 times a minute, 0.5 l a breath at rest; 5 l of vital capacity (ICRP 89) |
// ---- digestion ---------------------------------------------------------------------------------------------------------------
tongue | tongue | Life/Human/Digestive | part | skeletal-muscle-tissue:60 gut-wall-tissue:* | 73 | 90x50x25 | tongue | muscle in three directions under a skin of papillae and about 5,000 taste buds | ICRP 89: 73 g
salivary-glands | salivary glands | Life/Human/Digestive | part | gland-tissue:85 | = | 50x30x20 | gland | parotid, submandibular and sublingual, a pair of each: 0.5–1.5 l of saliva a day | ICRP 89: 85 g
oesophagus | oesophagus | Life/Human/Digestive | part | gut-wall-tissue:40 | = | 250x20x20 | tube | 25 cm of muscle tube: swallowing pushes food down in waves | ICRP 89: 40 g
stomach | stomach | Life/Human/Digestive | part | gut-wall-tissue:150 | = | 250x150x80 | stomach | churns food in acid and pepsin | ICRP 89: 150 g wall
small-intestine | small intestine | Life/Human/Digestive | part | gut-wall-tissue:650 | = | 300x250x100 | intestine | duodenum, jejunum and ileum, about 6 m coiled in the belly (its box here as it lies): villi and microvilli make 30 m² to take food in | ICRP 89: 650 g wall
colon | colon | Life/Human/Digestive | part | gut-wall-tissue:370 | = | 320x260x80 | colon | about 1.5 m framing the small intestine: right, transverse, left, sigmoid and rectum; takes water back | ICRP 89: right 150, left 150, rectosigmoid 70 g
liver | liver | Life/Human/Digestive | part | liver-tissue:1800 | = | 210x160x110 | liver | the body's chemistry works: makes albumin and bile, stores glycogen and iron, breaks down drugs; four lobes | ICRP 89: 1,800 g
gallbladder | gallbladder | Life/Human/Digestive | part | gut-wall-tissue:10 bile:58 | = | 90x35x35 | bag | stores bile and squeezes it out after a fat meal | ICRP 89: 10 g wall, 58 g bile
pancreas | pancreas | Life/Human/Digestive | part | gland-tissue:138 islet*1000000 | = | 150x50x25 | gland | makes digestive enzymes (exocrine) and, in about a million islets, insulin and glucagon | ICRP 89: 140 g
islet | islet of Langerhans | Life/Human/Endocrine | part | beta-cell*900 alpha-cell*350 endothelial-cell*100 extracellular-fluid:* | 1.9e-6 | 0.15x0.15x0.15 | islet | a cluster of about 1,300 cells 150 µm across: beta cells (insulin) and alpha cells (glucagon), with a few delta cells (somatostatin) | about a million in a pancreas, 1–2 % of it (estimates)
gut-contents | what is in the gut | Life/Human/Digestive | part | gastric-juice:250 chyme:350 faeces:300 | = | 300x200x100 | swatch | food on its way: stomach 250 g, small intestine 350 g, colon 300 g (ICRP 89) |
chyme | chyme (a gram) | Life/Human/Digestive | part | water:0.85 enzyme:0.04 glucose:0.04 triglyceride:0.03 protein:0.03 bile:0.01 | = | 10x10x10 | swatch | half-digested food and juices in the small intestine (typical) |
faeces | faeces (a gram) | Life/Human/Digestive | part | gut-bacterium*1.27e11 water:0.733 cellulose:0.08 protein:0.03 triglyceride:0.03 | = | 10x10x10 | swatch | water, fibre and gut bacteria: about 38 trillion bacteria in a colon's contents (Sender et al. 2016) |
digestive-system | digestive system | Life/Human/Systems | assembly | tongue salivary-glands oesophagus stomach small-intestine colon liver gallbladder pancreas gut-contents | = | 600x350x200 | gut | mouth to anus, about 9 m: takes in about 2.5 kg of food and water a day |
// ---- urinary --------------------------------------------------------------------------------------------------------------
nephron | nephron | Life/Human/Kidney | part | podocyte*500 endothelial-cell*1500 tubule-cell*50000 extracellular-fluid:* | 1.3e-4 | 40x0.2x0.2 | nephron | the kidney's filter: a glomerulus (a knot of capillaries in podocytes' feet) and a tubule 4 cm long that takes back 99 % of what it filters (its cell counts estimates) |
kidney | kidney | Life/Human/Urinary | part | kidney-tissue:155 | = | 115x55x35 | kidney | about 0.9 million nephrons (Bertram et al. 2011): filters 180 l of blood plasma a day into 1.5 l of urine | ICRP 89: 310 g for both
ureter | ureter | Life/Human/Urinary | part | gut-wall-tissue:8 | = | 280x5x5 | tube | carries urine from kidney to bladder by waves | ICRP 89: 16 g both
bladder | urinary bladder | Life/Human/Urinary | part | smooth-muscle:30 gut-wall-tissue:* | 50 | 90x80x60 | bag | holds 400–600 ml | ICRP 89: 50 g
urethra | urethra | Life/Human/Urinary | part | gut-wall-tissue:10 | = | 200x8x8 | tube | about 20 cm in a man | ICRP 89: 10 g
urinary-system | urinary system | Life/Human/Systems | assembly | kidney*2 ureter*2 bladder urethra | = | 400x300x150 | kidney | keeps the blood's water, salt and acid right |
// ---- glands ----------------------------------------------------------------------------------------------------------------------
thyroid | thyroid | Life/Human/Endocrine | part | thyroid-tissue:20 | = | 50x50x20 | gland | sets the body's pace with thyroxine (T4) and T3, made with iodine | ICRP 89: 20 g
parathyroid | parathyroid gland | Life/Human/Endocrine | part | gland-tissue:0.03 | = | 6x4x2 | gland | four of them, a grain of rice each: hold blood calcium with parathyroid hormone | about 30 mg each (typical)
adrenal | adrenal gland | Life/Human/Endocrine | part | gland-tissue:6 adipose-tissue:1 | = | 50x25x6 | gland | on each kidney: the cortex makes cortisol and aldosterone, the medulla adrenaline | ICRP 89: 14 g both
pituitary | pituitary gland | Life/Human/Endocrine | part | gland-tissue:0.6 | = | 12x9x6 | gland | the master gland under the brain: growth hormone, ACTH, TSH, prolactin, LH, FSH, oxytocin, vasopressin | ICRP 89: 0.6 g
pineal | pineal gland | Life/Human/Endocrine | part | gland-tissue:0.2 | = | 8x5x4 | gland | makes melatonin in the dark | ICRP 89: 0.2 g
endocrine-system | endocrine system | Life/Human/Systems | assembly | thyroid parathyroid*4 adrenal*2 pituitary pineal | = | 300x200x100 | gland | the glands that steer the body with hormones (the pancreas's islets are with the pancreas) |
// ---- immune ------------------------------------------------------------------------------------------------------------------
spleen | spleen | Life/Human/Immune | part | lymphoid-tissue:150 | = | 120x70x30 | spleen | filters the blood: old red cells out, and an immune check | ICRP 89: 150 g
thymus | thymus | Life/Human/Immune | part | lymphoid-tissue:15 adipose-tissue:10 | = | 50x40x10 | gland | where T cells learn; it turns to fat with age | ICRP 89: 25 g
lymph-node | lymph node | Life/Human/Immune | part | lymphoid-tissue:0.4 | = | 10x8x5 | node | a bean on the lymph vessels that filters lymph: about 600 of them (estimate) | ICRP 89: 250 g all
tonsils | tonsils | Life/Human/Immune | part | lymphoid-tissue:3 | = | 25x15x10 | node | guard the throat | ICRP 89: 3 g
immune-system | lymphatic and immune system | Life/Human/Systems | assembly | spleen thymus lymph-node*625 tonsils | = | 1700x400x200 | node | the organs of immunity: its white cells are also in blood and every tissue |
// ---- skin ------------------------------------------------------------------------------------------------------------------
hair | hair | Life/Human/Skin | part | keratin:17.5 melanin:0.3 triglyceride:0.4 water:* | 20 | 100x100x50 | hair | about 100,000 on the scalp and 5 million follicles in all, growing about 1 cm a month | ICRP 89: 20 g
nail | nail | Life/Human/Skin | part | keratin:0.12 water:* | 0.15 | 15x13x0.5 | sheet | hard keratin, growing about 3 mm a month: twenty of them (its mass an estimate) |
epidermis | epidermis | Life/Human/Skin | part | epidermis-tissue:120 | = | 1900x1000x0.1 | sheet | the outer skin over 1.9 m² (ICRP 89) | ICRP 89: 120 g
dermis | dermis | Life/Human/Skin | part | dermis-tissue:3180 | = | 1900x1000x1.7 | sheet | the leather under it: holds about 2–4 million sweat glands | ICRP 89: 3,180 g
skin | skin | Life/Human/Systems | assembly | epidermis dermis hair nail*20 | = | 1900x1000x2 | skin | the largest organ, 1.9 m² and 3.3 kg: barrier, temperature, touch | ICRP 89: 3,300 g
// ---- muscles, fat, connective tissue ----------------------------------------------------------------------------------
muscles | the skeletal muscles | Life/Human/Systems | assembly | ${musclesOf()} other-muscles:* | 29000 | 1760x450x300 | muscle | about 600 named muscles: 29 kg, 40 % of the body (ICRP 89); here the large ones by name and mass (estimates), the rest together | ICRP 89: 29,000 g
other-muscles | the other muscles (a gram) | Life/Human/Muscles | part | skeletal-muscle-tissue:1 | = | 9.8x9.8x9.8 | swatch | the small muscles not named here: the neck's and spine's deep ones, the larynx's, the ear's |
connective-tissue | tendons, ligaments and fascia | Life/Human/Systems | assembly | ${bandsOf()} fascia-tissue:* | 1600 | 1760x450x300 | tendon | the separable connective tissue (ICRP 89: 1.6 kg): the named tendons and ligaments (masses estimates) and the fascia | ICRP 89: 1,600 g
subcutaneous-fat | fat under the skin | Life/Human/Fat | part | adipose-tissue:14000 | = | 1900x1000x8 | sheet | the fat under the skin: insulation and store (about three quarters of the body's fat, an estimate) |
visceral-fat | fat round the organs | Life/Human/Fat | part | adipose-tissue:2500 | = | 300x250x100 | fat | the fat in the belly round the organs: the omentum and mesentery (an estimate) |
other-fat | fat between muscles and elsewhere | Life/Human/Fat | part | adipose-tissue:* | 1700 | 300x300x100 | fat | the rest (an estimate) |
adipose | fat (adipose tissue) | Life/Human/Systems | assembly | subcutaneous-fat visceral-fat other-fat | = | 1900x1000x50 | fat | 18.2 kg of fat tissue in the reference man (ICRP 89), about 15 kg of it fat itself | ICRP 89: 18,200 g
// ---- the nervous system (the brain is in ./brain.ts) -------------------------------------------------------------
spinal-cord | spinal cord | Life/Human/Nervous | part | white-matter:20 deep-grey:* | 30 | 450x10x8 | cord | 45 cm of nerve tissue in the spine: 31 pairs of spinal nerves leave it | ICRP 89: 30 g
eye | eye | Life/Human/Senses | part | retina vitreous-humour:4 lens:0.2 cornea:0.2 sclera:1.5 smooth-muscle:0.3 extracellular-fluid:* | 7.5 | 24x24x24 | eye | a ball 24 mm across: cornea and lens focus light on the retina | ICRP 89: 15 g both, lens 0.4 g both
retina | retina | Life/Human/Senses | part | rod-cell*92000000 cone-cell*4600000 deep-grey:0.15 extracellular-fluid:* | 0.3 | 40x40x0.25 | sheet | rods for dim light (about 92 million), cones for colour (about 4.6 million) (Curcio et al. 1990), and the nerve cells that send it on through 1.2 million fibres |
lens | lens | Life/Human/Senses | part | protein:0.07 water:* | 0.2 | 9x9x4 | lens | a lens of living cells filled with crystallin protein, about 35 % protein |
cornea | cornea | Life/Human/Senses | part | collagen:0.04 water:* | 0.2 | 11x11x0.55 | lens | clear collagen in layers: two thirds of the eye's focusing |
sclera | sclera | Life/Human/Senses | part | collagen:0.4 elastin:0.02 water:* | 1.5 | 24x24x0.6 | sheet | the white of the eye: tough collagen |
vitreous-humour | vitreous humour (a gram) | Life/Human/Senses | part | water:0.99 hyaluronic-acid:0.002 collagen:0.001 nacl:0.007 | = | 10x10x10 | swatch | the clear gel that fills the eye |
inner-ear | inner ear | Life/Human/Senses | part | hair-cell*15500 deep-grey:0.03 extracellular-fluid:* | 0.2 | 10x8x6 | cochlea | the cochlea, a snail of 2.5 turns that hears 20 Hz to 20 kHz (3,500 inner hair cells and 12,000 outer), and the balance organs |
peripheral-nerves | peripheral nerves | Life/Human/Nervous | part | nerve-tissue:300 | = | 1760x450x5 | nerve | 12 pairs of cranial and 31 of spinal nerves, branching to every part (their mass an estimate) |
nervous-system | nervous system | Life/Human/Systems | assembly | brain cerebrospinal-fluid-volume spinal-cord peripheral-nerves eye*2 inner-ear*2 | = | 1760x450x300 | brain | the brain, the cord, the nerves and the senses |
// ---- male reproductive ----------------------------------------------------------------------------------------------
testis | testis | Life/Human/Reproductive | part | seminiferous-tissue:17.5 | = | 45x30x25 | gland | makes about 100 million sperm a day, and testosterone | ICRP 89: 35 g both
seminiferous-tissue | testis tissue (a gram) | Life/Human/Reproductive | part | sperm*20000000 stem-cell:0.4 gland-tissue:0.2 extracellular-fluid:* | 1 | 9.8x9.8x9.8 | swatch | coiled tubules where sperm are made, with the cells that make testosterone between them |
prostate | prostate | Life/Human/Reproductive | part | gland-tissue:10 smooth-muscle:* | 17 | 40x30x25 | gland | makes part of semen; round the urethra under the bladder | ICRP 89: 17 g
reproductive-accessory | epididymides, seminal vesicles and erectile tissue | Life/Human/Reproductive | part | smooth-muscle:30 gland-tissue:15 dermis-tissue:10 extracellular-fluid:* | 60 | 150x50x40 | gland | stores and carries sperm, adds fluid; the erectile tissue (masses estimates) |
reproductive-system | reproductive system (male) | Life/Human/Systems | assembly | testis*2 prostate reproductive-accessory | = | 200x150x100 | gland | the reference body is ICRP 89's reference man |
// ---- the whole --------------------------------------------------------------------------------------------------------------
human | human body | Life/Human | product | skin skeleton muscles connective-tissue adipose circulatory-system respiratory-system digestive-system urinary-system nervous-system endocrine-system immune-system reproductive-system | = | 1760x450x300 | human | ICRP 89's reference adult man, 176 cm: every system, organ, tissue and cell down to molecules and elements; about 30 trillion human cells of 37 kinds here, and about 38 trillion bacteria in the gut | ICRP 89 reference male: 73 kg
`);

// a few cells the organs need, built like the others
const MORE_CELLS: LifeEntry[] = ([
  { id: 'tubule-cell', name: 'kidney tubule cell', path: 'Life/Cells/Kidney', v: 2000, size: [15, 15, 10] as [number, number, number], nuc: 150, mito: 18, pm: 4000, look: 'column', says: 'lines the nephron\'s tubule and takes back salt, glucose and water: a brush border of microvilli and many mitochondria' },
  { id: 'podocyte', name: 'podocyte', path: 'Life/Cells/Kidney', v: 1000, size: [20, 20, 5] as [number, number, number], nuc: 100, mito: 5, look: 'star', says: 'wraps the glomerulus\'s capillaries in interlocking feet: the slits between them are the kidney\'s finest filter' },
  { id: 'follicular-cell', name: 'thyroid follicular cell', path: 'Life/Cells/Thyroid', v: 1000, size: [12, 12, 10] as [number, number, number], nuc: 100, mito: 6, rer: 4, look: 'column', says: 'takes up iodide from the blood and makes thyroglobulin, the store of thyroid hormone' },
  { id: 'schwann-cell', name: 'Schwann cell', path: 'Life/Cells/Nerve', v: 2400, dens: 1.0e-12, size: [100, 10, 5] as [number, number, number], nuc: 100, mito: 4, also: 'myelin-um2*200000', look: 'spindle', says: 'wraps one segment of a peripheral axon in myelin, about 1 mm of it' },
  { id: 'alpha-cell', name: 'glucagon cell (alpha cell)', path: 'Life/Cells/Pancreas', v: 800, size: [11, 11, 11] as [number, number, number], nuc: 120, mito: 6, rer: 4, golgi: 2, also: 'glucagon*500000000', look: 'cell', says: 'in the islets: lets out glucagon as blood glucose falls, so the liver gives glucose back' },
] as CellType[]).flatMap(cellOf);

export const HUMAN: LifeEntry[] = [...TISSUES, ...BONE_ENTRIES, ...TEETH, ...SKELETON, ...MUSCLE_ENTRIES, ...BAND_ENTRIES, ...ORGANS, ...MORE_CELLS];

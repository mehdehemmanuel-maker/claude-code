// Cells, built from what they are: membranes a square micrometre at a time, the machines (ribosomes, nuclear pores,
// nucleosomes), the genome chromosome by chromosome at its sequenced length, the organelles, and every kind of cell of
// the body made from its volume and what is special to it, the rest of it cytosol. Each part is its molecules by count
// or mass, so a cell comes down, through them, to its elements.

import { entries, type LifeEntry } from './core';
import { holding } from '../substrate/boxfill';

/** g a cubic micrometre: a cell is 1.05–1.10 g/ml (typical). */
export const DENS = 1.07e-12;

/** The chromosomes: name, length in base pairs (GRCh38), protein-coding genes (about, Ensembl). */
export const CHROMOSOMES: [string, number, number?][] = [
  ['1', 248956422, 2050], ['2', 242193529, 1300], ['3', 198295559, 1080], ['4', 190214555, 760], ['5', 181538259, 880], ['6', 170805979, 1040], ['7', 159345973, 920], ['8', 145138636, 680], ['9', 138394717, 780], ['10', 133797422, 730],
  ['11', 135086622, 1300], ['12', 133275309, 1030], ['13', 114364328, 320], ['14', 107043718, 610], ['15', 101991189, 600], ['16', 90338345, 850], ['17', 83257441, 1180], ['18', 80373285, 270], ['19', 58617616, 1470], ['20', 64444167, 540],
  ['21', 46709983, 230], ['22', 50818468, 440], ['x', 156040895, 840], ['y', 57227415, 63],
];

export const PARTS = entries(`
// ---- membranes, a square micrometre each -------------------------------------------------------------------------
membrane-um2 | a square micrometre of membrane | Life/Cells/Membranes | part | membrane-lipids:3.0e-15 protein:3.0e-15 | = | 0.001x0.001x0.000005 | membrane | a lipid bilayer 5 nm thick, about 3 million lipids (each about 0.65 nm² of a leaflet) and as much protein by mass | organelle membranes, typical
plasma-membrane-um2 | a square micrometre of cell membrane | Life/Cells/Membranes | part | membrane-lipids:3.0e-15 protein:3.0e-15 glucose:0.3e-15 | = | 0.001x0.001x0.000007 | membrane | the cell's skin: a bilayer with its proteins, and the sugar coat (glycocalyx) outside it |
inner-membrane-um2 | a square micrometre of inner mitochondrial membrane | Life/Cells/Membranes | part | membrane-lipids:2.4e-15 cardiolipin:0.6e-15 protein:5.4e-15 atp-synthase*1000 | = | 0.001x0.001x0.000007 | membrane | folded into cristae: about three parts protein to one of lipid, cardiolipin a fifth of the lipid, ATP synthases in rows along the folds (about 1,000 a µm², an estimate) |
myelin-um2 | a square micrometre of myelin | Life/Cells/Membranes | part | myelin-lipids:3.4e-15 myelin-protein:1.2e-15 | = | 0.001x0.001x0.000008 | membrane | the insulating wrap of nerves: membrane about 70–80 % lipid by dry mass, rich in cholesterol and cerebroside |
rough-er-um2 | a square micrometre of rough ER | Life/Cells/Organelles | part | membrane-um2*1 ribosome*100 | = | 0.001x0.001x0.00003 | membrane | the membrane where proteins for export are made: ribosomes on its face (about 100 a µm², an estimate) |
smooth-er-um2 | a square micrometre of smooth ER | Life/Cells/Organelles | part | membrane-um2*1 | = | 0.001x0.001x0.000005 | membrane | makes lipids and steroids, and stores calcium |
golgi-um2 | a square micrometre of Golgi membrane | Life/Cells/Organelles | part | membrane-um2*1 | = | 0.001x0.001x0.000005 | membrane | sorts and sugar-coats what the ER made, and ships it in vesicles |
sr-um2 | a square micrometre of sarcoplasmic reticulum | Life/Cells/Organelles | part | membrane-um2*1 serca*10000 calcium-chloride:1e-16 | = | 0.001x0.001x0.00005 | membrane | a muscle fibre's calcium store: lets Ca²⁺ out on the nerve's signal and pumps it back (SERCA packed at about 10,000 a µm², an estimate) |
// ---- the machines ------------------------------------------------------------------------------------------------
ribosome | ribosome (80S) | Life/Cells/Machines | part | rna*1804 ribosomal-protein*80 | = | 0.000025x0.000025x0.000025 | blob | reads messenger RNA and joins amino acids into protein, a few a second: four RNA strands (28S, 18S, 5.8S and 5S, 7,215 nucleotides) and about 80 proteins | 4.3 MDa measured; its parts here add to 3.8
ribosome-70s | ribosome (70S, bacterial) | Life/Cells/Machines | part | rna*1142 ribosomal-protein*55 | = | 0.00002x0.00002x0.00002 | blob | the bacterial ribosome: 16S, 23S and 5S RNA (4,566 nucleotides) and 54 proteins; many antibiotics jam it | 2.5 MDa
nucleosome | nucleosome | Life/Cells/Machines | part | histone*1 dna*100 | = | 0.00001x0.00001x0.0000057 | blob | 147 base pairs wound 1.65 times round eight histones, and about 53 of linker: one every 200 base pairs |
nuclear-pore | nuclear pore complex | Life/Cells/Machines | part | nucleoporin*1000 | = | 0.00012x0.00012x0.00005 | ring | the gate of the nucleus, 120 nm across: rings of eightfold symmetry that let RNA out and proteins in | 110–120 MDa
actin-filament-um | a micrometre of actin filament | Life/Cells/Machines | part | actin*370 | = | 0.001x0.000007x0.000007 | rod | two strands of actin wound a half-turn every 37 nm |
microtubule-um | a micrometre of microtubule | Life/Cells/Machines | part | tubulin*1625 | = | 0.001x0.000025x0.000025 | tube | 13 protofilaments of tubulin pairs 8 nm long, a tube 25 nm across: the rails kinesin and dynein walk |
centriole | centriole | Life/Cells/Machines | part | microtubule-um*13.5 | = | 0.0005x0.0002x0.0002 | tube | nine triplets of microtubules in a barrel 0.5 µm long |
centrosome | centrosome | Life/Cells/Organelles | part | centriole*2 enzyme:3e-15 | = | 0.001x0.001x0.001 | blob | two centrioles at right angles in a cloud of protein: where the cell's microtubules start |
// ---- the genome: each chromosome at its length (GRCh38), as nucleosomes ------------------------------------------
${CHROMOSOMES.map(([c, bp, genes]) => `chr${c} | chromosome ${c.toUpperCase()} | Life/Cells/Genome | part | nucleosome*${Math.round(bp / 200)} | = | 0.008x0.0014x0.0014 | chromosome | ${bp.toLocaleString('en')} base pairs of DNA on histones (GRCh38)${genes ? `: about ${genes} protein-coding genes` : ''} |`).join('\n')}
genome | the human genome (46,XY) | Life/Cells/Genome | assembly | ${CHROMOSOMES.filter(([c]) => /^\d/.test(c)).map(([c]) => `chr${c}*2`).join(' ')} chrx chry | = | 0.006x0.006x0.006 | chromosome | two of each of the 22 autosomes, an X and a Y: about 6.2 billion base pairs, 2 m of DNA in a nucleus 6 µm across | the reference body is male (ICRP 89)
genome-xx | the human genome (46,XX) | Life/Cells/Genome | assembly | ${CHROMOSOMES.filter(([c]) => /^\d/.test(c)).map(([c]) => `chr${c}*2`).join(' ')} chrx*2 | = | 0.006x0.006x0.006 | chromosome | two of each autosome and two X: about 6.2 billion base pairs |
genome-haploid | the human genome, haploid (23,X) | Life/Cells/Genome | assembly | ${CHROMOSOMES.filter(([c]) => /^\d/.test(c)).map(([c]) => `chr${c}`).join(' ')} chrx | = | 0.004x0.004x0.004 | chromosome | one of each autosome and an X: the egg's, or half the sperm's (the rest carry a Y) |
mtdna | mitochondrial DNA | Life/Cells/Genome | part | dna*8285 | = | 0.0015x0.0015x0.0001 | ring | 16,569 base pairs in a circle: 37 genes, 13 of them parts of the respiratory chain; from the mother only | GRCh38 chrM
// ---- organelles ------------------------------------------------------------------------------------------------------
mitochondrion | mitochondrion | Life/Cells/Organelles | part | membrane-um2*3.5 inner-membrane-um2*10.5 mtdna*5 enzyme:5e-14 potassium-phosphate:3e-15 water:* | 4.2e-13 | 0.002x0.0005x0.0005 | mito | burns food with oxygen and makes most of the cell's ATP: a typical one 0.5 µm across and 2 µm long, its inner membrane three times its outer, its matrix about 200 mg/ml protein (estimates); 2–10 copies of its own DNA |
lysosome | lysosome | Life/Cells/Organelles | part | membrane-um2*0.8 enzyme:1.3e-14 water:* | 7e-14 | 0.0005x0.0005x0.0005 | sphere | a bag of acid (pH 4.5–5) and digestive enzymes, 0.5 µm across: breaks down what the cell eats or wears out |
peroxisome | peroxisome | Life/Cells/Organelles | part | membrane-um2*0.8 enzyme:2e-14 water:* | 7e-14 | 0.0005x0.0005x0.0005 | sphere | burns fatty acids and breaks hydrogen peroxide down with catalase |
nucleolus | nucleolus | Life/Cells/Organelles | part | rna:2e-12 enzyme:3e-12 nucleoplasm:* | 1.5e-11 | 0.003x0.003x0.003 | sphere | where ribosomes are made, about 3 µm across: RNA and protein, no membrane |
lipid-droplet | lipid droplet | Life/Cells/Organelles | part | fat-droplet:* | 5e-13 | 0.001x0.001x0.001 | sphere | stored fat in a cell that is not a fat cell, about 1 µm across |
glycogen-granule | glycogen granule | Life/Cells/Organelles | part | glycogen:1.48e-17 water:* | 4.4e-17 | 0.000042x0.000042x0.000042 | sphere | a full β-particle of glycogen, 42 nm across: 55,000 glucoses (8.9 MDa) in 12 tiers round a protein core, the rest of it water (Meléndez-Hevia et al. 1993) |
synaptic-vesicle | synaptic vesicle | Life/Brain/Synapse | part | synaptobrevin*70 synaptophysin*32 synaptotagmin*15 vglut*10 v-atpase*1.5 rab3*10 membrane-lipids:1.23e-17 glutamate*2000 water:2.2e-17 | = | 0.000042x0.000042x0.000042 | sphere | a 42 nm bubble of glutamate: its protein copies by count (Takamori et al. 2006), about 7,000 phospholipids and 5,600 cholesterols, and about 2,000 glutamates (an estimate) | Takamori 2006
gaba-vesicle | synaptic vesicle (GABA) | Life/Brain/Synapse | part | synaptobrevin*70 synaptophysin*32 synaptotagmin*15 vgat*10 v-atpase*1.5 rab3*10 membrane-lipids:1.23e-17 gaba*2000 water:2.2e-17 | = | 0.000042x0.000042x0.000042 | sphere | an inhibitory vesicle: GABA in place of glutamate (its counts by analogy, an estimate) |
ach-vesicle | synaptic vesicle (acetylcholine) | Life/Brain/Synapse | part | synaptobrevin*70 synaptophysin*32 synaptotagmin*15 v-atpase*1.5 rab3*10 membrane-lipids:1.23e-17 acetylcholine*7000 water:2.6e-17 | = | 0.00005x0.00005x0.00005 | sphere | at the neuromuscular junction: about 5,000–10,000 acetylcholines a vesicle, a quantum |
`);

/** A kind of cell, built from its volume (µm³) and what is special to it; everything else typical. Its size gives its
 *  proportions and a typical length; where that size's shape cannot hold its volume it is grown, in proportion, until it
 *  does (src/nexus/substrate/boxfill.ts). */
export interface CellType {
  id: string; name: string; path: string; v: number; size: [number, number, number]; says: string; spec?: string; look?: string;
  /** g/µm³ */ dens?: number;
  /** nucleus µm³ (0: none), how many, and the genome in it */ nuc?: number; nuclei?: number; genome?: string;
  /** mitochondria, % of the cell's volume */ mito?: number;
  /** µm² of each membrane a µm³ of cell */ rer?: number; ser?: number; golgi?: number;
  /** lysosomes and peroxisomes a 1,000 µm³ */ lyso?: number; perox?: number;
  /** cell membrane, µm² (else 1.5 times a sphere's of its volume) */ pm?: number;
  /** free ribosomes a µm³; actin and tubulin a µm³ */ ribo?: number; actin?: number; tubulin?: number;
  /** what else is in it ("id*n id:g …"), and what the rest of it is */ also?: string; rest?: string;
}
const sig = (x: number) => +x.toPrecision(3);
/** A cell and its nucleus as entries. */
export function cellOf(t: CellType): LifeEntry[] {
  const out: LifeEntry[] = [], g = t.v * (t.dens ?? DENS), of: LifeEntry['of'] = [], mass: Record<string, number> = {};
  const add = (id: string, n: number) => { if (n > 0) of.push({ id, n: sig(n) }); };
  const nuc = t.nuc ?? Math.min(0.1 * t.v, 400);
  if (nuc > 0) {
    const r = Math.cbrt((3 * nuc) / (4 * Math.PI)), area = 4 * Math.PI * r * r, nid = `${t.id}-nucleus`;
    out.push({ id: nid, name: `${t.name}: its nucleus`, path: 'Life/Cells/Nuclei', kind: 'part', of: [{ id: t.genome ?? 'genome', n: 1 }, { id: 'membrane-um2', n: sig(2 * area) }, { id: 'nuclear-pore', n: Math.round(10 * area) }, ...(nuc >= 100 ? [{ id: 'nucleolus', n: 1 }] : []), { id: 'nucleoplasm', n: 1 }], mass: {}, rest: 'nucleoplasm', g: nuc * 1.1e-12, size: [2 * r / 1000, 2 * r / 1000, 2 * r / 1000], look: 'nucleus', says: `holds the genome in a double membrane ${(2 * r).toFixed(1)} µm across, its pores about 10 a µm² (an estimate)` });
    add(nid, t.nuclei ?? 1);
  }
  const cyto = t.v * (1 - (t.mito ?? 8) / 100) - nuc * (t.nuclei ?? 1);
  add('mitochondrion', ((t.mito ?? 8) / 100) * t.v / 0.39);
  add('rough-er-um2', (t.rer ?? 2) * t.v); add('smooth-er-um2', (t.ser ?? 0.5) * t.v); add('golgi-um2', (t.golgi ?? 0.8) * t.v);
  add('lysosome', ((t.lyso ?? 60) * t.v) / 1000); add('peroxisome', ((t.perox ?? 80) * t.v) / 1000);
  add('plasma-membrane-um2', t.pm ?? 1.5 * 4 * Math.PI * Math.cbrt((3 * t.v) / (4 * Math.PI)) ** 2);
  add('ribosome', (t.ribo ?? 1000) * Math.max(cyto, 0)); add('actin', (t.actin ?? 60000) * t.v); add('tubulin', (t.tubulin ?? 12000) * t.v);
  if (nuc > 0 && t.nuclei === undefined) add('centrosome', 1);
  for (const tok of (t.also ?? '').split(/\s+/).filter(Boolean)) { const mm = /^([\w.-]+):([\d.e+-]+)$/.exec(tok), mc = /^([\w.-]+)\*([\d.e+-]+)$/.exec(tok); if (mm) { of.push({ id: mm[1]!, n: 1 }); mass[mm[1]!] = Number(mm[2]); } else if (mc) add(mc[1]!, Number(mc[2])); else throw new Error(`${t.id}: cannot read "${tok}"`); }
  const rest = t.rest ?? 'cytosol'; of.push({ id: rest, n: 1 });
  out.push({ id: t.id, name: t.name, path: t.path, kind: 'assembly', of, mass, rest, g, size: holding(t.size, t.v, t.look ?? 'cell').map((x) => x / 1000) as [number, number, number], look: t.look ?? 'cell', says: t.says, ...(t.spec ? { spec: t.spec } : {}) });
  return out;
}

/** The kinds of cell of the body. Volumes and what is special to each are typical values (the source each names), the
 *  rest of the build typical of a mammalian cell; where a number is an estimate it says so. Counts of a cell's lesser
 *  parts (its pores, its dystrophin) are estimates of their order. */
export const CELL_TYPES: CellType[] = [
  // ---- blood --------------------------------------------------------------------------------------------------------
  { id: 'red-blood-cell', name: 'red blood cell', path: 'Life/Cells/Blood', v: 90, size: [7.8, 7.8, 2.5], dens: 1.1e-12, nuc: 0, mito: 0, rer: 0, ser: 0, golgi: 0, lyso: 0, perox: 0, pm: 136, ribo: 0, actin: 5500, tubulin: 0, also: 'haemoglobin*270000000 spectrin*200000 kcl:4.8e-13', rest: 'water', look: 'disc', says: 'a disc 7.8 µm across with no nucleus, a bag of haemoglobin: about 270 million molecules (30 pg), each carrying four O₂; lives about 120 days', spec: 'MCV 80–100 fl, MCH 27–33 pg (reference ranges)' },
  { id: 'platelet', name: 'platelet', path: 'Life/Cells/Blood', v: 7.5, size: [3, 3, 1], nuc: 0, mito: 6, rer: 0, ser: 1, lyso: 400, ribo: 0, also: 'fibrinogen*2000000', look: 'disc', says: 'a fragment of a megakaryocyte with no nucleus: it sticks where a vessel is cut and starts the clot; lives about 10 days', spec: 'MPV 7–11 fl' },
  { id: 'neutrophil', name: 'neutrophil', path: 'Life/Cells/Blood/White cells', v: 330, size: [12, 12, 12], nuc: 90, mito: 2, lyso: 600, ribo: 300, look: 'cell', says: 'the commonest white cell (40–70 %): a nucleus of 3–5 lobes and granules of enzymes; eats bacteria and dies within days' },
  { id: 'lymphocyte', name: 'lymphocyte', path: 'Life/Cells/Blood/White cells', v: 180, size: [7, 7, 7], nuc: 110, mito: 5, ribo: 1500, look: 'cell', says: 'a small round cell, nearly all nucleus (20–40 % of white cells): T cells kill and direct, B cells make antibodies, NK cells kill infected cells' },
  { id: 'monocyte', name: 'monocyte', path: 'Life/Cells/Blood/White cells', v: 470, size: [15, 15, 15], nuc: 120, mito: 4, lyso: 200, look: 'cell', says: 'the largest white cell (2–8 %), with a kidney-shaped nucleus: leaves the blood and becomes a macrophage' },
  { id: 'eosinophil', name: 'eosinophil', path: 'Life/Cells/Blood/White cells', v: 350, size: [12, 12, 12], nuc: 80, mito: 3, lyso: 500, look: 'cell', says: 'a white cell with red-staining granules (1–4 %): fights parasites, and drives allergy' },
  { id: 'basophil', name: 'basophil', path: 'Life/Cells/Blood/White cells', v: 300, size: [11, 11, 11], nuc: 80, mito: 3, lyso: 500, also: 'histamine:1e-12', look: 'cell', says: 'the rarest white cell (under 1 %): granules of histamine and heparin' },
  { id: 'haematopoietic-cell', name: 'haematopoietic cell', path: 'Life/Cells/Blood', v: 400, size: [9, 9, 9], nuc: 150, mito: 5, ribo: 1500, look: 'cell', says: 'a cell of red marrow that divides into blood cells: stem cells and the blasts they become (as one, typical)' },
  // ---- muscle -------------------------------------------------------------------------------------------------------
  { id: 'muscle-fibre-i', name: 'muscle fibre, type I (slow)', path: 'Life/Cells/Muscle', v: 1.96e8, size: [100000, 50, 50], dens: 1.06e-12, nuc: 85, nuclei: 4000, mito: 6, rer: 0.02, ser: 0, golgi: 0.01, lyso: 1, perox: 2, ribo: 50, actin: 0, tubulin: 400, also: 'myofibril*1900 sr-um2*1.2e8 glycogen:2.5e-6 myoglobin:1.25e-6 fat-droplet:1e-6 dystrophin*1e8', rest: 'sarcoplasm', look: 'fibre', says: 'one cell 50 µm across and as long as its muscle (here 10 cm), with about 40 nuclei a millimetre (an estimate): red with myoglobin and mitochondria (about 6 % of its volume, Howald 1985), slow to tire', spec: 'twitch about 100 ms; myosin heavy chain I' },
  { id: 'muscle-fibre-iia', name: 'muscle fibre, type IIa (fast, fatigue-resistant)', path: 'Life/Cells/Muscle', v: 1.96e8, size: [100000, 50, 50], dens: 1.06e-12, nuc: 85, nuclei: 3500, mito: 4.5, rer: 0.02, ser: 0, golgi: 0.01, lyso: 1, perox: 2, ribo: 50, actin: 0, tubulin: 400, also: 'myofibril*1950 sr-um2*2.4e8 glycogen:3e-6 myoglobin:0.9e-6 fat-droplet:0.5e-6 dystrophin*1e8', rest: 'sarcoplasm', look: 'fibre', says: 'a fast fibre that still burns oxygen (mitochondria about 4.5 %, Howald 1985)', spec: 'twitch about 50 ms; myosin heavy chain IIa' },
  { id: 'muscle-fibre-iix', name: 'muscle fibre, type IIx (fast)', path: 'Life/Cells/Muscle', v: 1.96e8, size: [100000, 50, 50], dens: 1.06e-12, nuc: 85, nuclei: 3000, mito: 2.3, rer: 0.02, ser: 0, golgi: 0.01, lyso: 1, perox: 2, ribo: 50, actin: 0, tubulin: 400, also: 'myofibril*2000 sr-um2*3e8 glycogen:3.5e-6 myoglobin:0.6e-6 dystrophin*1e8', rest: 'sarcoplasm', look: 'fibre', says: 'the fastest and strongest fibre, white, living on glycogen; tires in seconds (mitochondria about 2.3 %, Howald 1985)', spec: 'twitch about 30 ms; myosin heavy chain IIx' },
  { id: 'cardiomyocyte', name: 'heart muscle cell', path: 'Life/Cells/Muscle', v: 30000, size: [120, 25, 15], dens: 1.06e-12, nuc: 200, mito: 32, rer: 0.05, ser: 0, ribo: 200, actin: 0, also: 'cardiac-myofibril*190 sr-um2*30000 glycogen:6e-10 myoglobin:1.5e-10 fat-droplet:3e-10', rest: 'sarcoplasm', look: 'fibre', says: 'a branched cell joined end to end by intercalated discs, beating about 3 billion times a lifetime: a third of it mitochondria' },
  { id: 'smooth-muscle-cell', name: 'smooth muscle cell', path: 'Life/Cells/Muscle', v: 2500, size: [200, 6, 6], dens: 1.06e-12, nuc: 120, mito: 5, actin: 400000, also: 'myosin*2000000 tropomyosin*1e7', rest: 'sarcoplasm', look: 'spindle', says: 'a spindle 200 µm long with no stripes, in the walls of gut, vessels and bladder: contracts slowly and holds' },
  // ---- liver, gut, gland, fat ------------------------------------------------------------------------------------
  { id: 'hepatocyte', name: 'liver cell (hepatocyte)', path: 'Life/Cells/Liver', v: 5000, size: [25, 25, 25], nuc: 300, mito: 22, rer: 7.7, ser: 3.5, golgi: 1.5, lyso: 60, perox: 80, pm: 2200, also: 'glycogen-granule*1.8e7 lipid-droplet*200', look: 'cell', says: 'the liver\'s worker: makes plasma proteins and bile, stores glycogen, breaks down drugs; its volume, membrane and organelles from Alberts (about 5,000 µm³ and 110,000 µm² of membrane)', spec: 'Alberts, Molecular Biology of the Cell, tables 12-1 and 12-2' },
  { id: 'enterocyte', name: 'gut lining cell (enterocyte)', path: 'Life/Cells/Gut', v: 1400, size: [25, 8, 8], nuc: 150, mito: 10, rer: 3, pm: 3500, look: 'column', says: 'a column with 3,000 microvilli on its top that take food in; replaced every 3–5 days' },
  { id: 'goblet-cell', name: 'goblet cell', path: 'Life/Cells/Gut', v: 1200, size: [25, 8, 8], nuc: 120, mito: 5, rer: 5, golgi: 2, also: 'glucose:3e-10 protein:2e-10', look: 'column', says: 'makes mucus, the gel that lines gut and airway' },
  { id: 'beta-cell', name: 'insulin cell (beta cell)', path: 'Life/Cells/Pancreas', v: 900, size: [12, 12, 12], nuc: 120, mito: 6, rer: 4, golgi: 2, also: 'insulin*1200000000', look: 'cell', says: 'in the islets of the pancreas: about 10,000 granules holding about 12 pg of insulin in all (typical; 10–20 pg measured), let out as blood glucose rises' },
  { id: 'acinar-cell', name: 'pancreatic acinar cell', path: 'Life/Cells/Pancreas', v: 1000, size: [12, 12, 12], nuc: 100, mito: 8, rer: 7.8, golgi: 1, pm: 1100, also: 'enzyme:1.2e-10', look: 'cell', says: 'makes the digestive enzymes of pancreatic juice: 60 % of its membrane rough ER (Alberts: 1,000 µm³, 13,000 µm² of membrane)' },
  { id: 'adipocyte', name: 'fat cell (adipocyte)', path: 'Life/Cells/Fat', v: 520000, size: [100, 100, 100], dens: 0.92e-12, nuc: 400, mito: 1, rer: 0.1, ser: 0.1, golgi: 0.05, lyso: 2, perox: 4, ribo: 50, actin: 3000, tubulin: 1000, also: 'fat-droplet:4.24e-7', look: 'sphere', says: 'a single droplet of fat 90 % of its volume, the nucleus pressed to its side: 100 µm across holds about 0.42 µg of fat (37 kJ/g)' },
  // ---- bone, cartilage, connective -------------------------------------------------------------------------------
  { id: 'osteoblast', name: 'bone-making cell (osteoblast)', path: 'Life/Cells/Bone', v: 1500, size: [20, 10, 10], nuc: 150, mito: 8, rer: 6, golgi: 2, also: 'collagen*500000', look: 'cell', says: 'lays down collagen and mineralises it; becomes an osteocyte when walled in' },
  { id: 'osteocyte', name: 'bone cell (osteocyte)', path: 'Life/Cells/Bone', v: 400, size: [20, 8, 5], nuc: 80, mito: 5, rer: 1, look: 'osteocyte', says: 'a bone-making cell walled into its own bone, in a lacuna, with about 50 fine arms through canaliculi to its neighbours: senses strain and directs remodelling; about 42 billion in a skeleton (Buenzli & Sims 2015)' },
  { id: 'osteoclast', name: 'bone-eating cell (osteoclast)', path: 'Life/Cells/Bone', v: 50000, size: [60, 50, 20], nuc: 200, nuclei: 12, mito: 15, lyso: 200, also: 'hydrochloric-acid:1e-12', look: 'cell', says: 'a giant cell of fused macrophages (here 12 nuclei): seals onto bone and dissolves it with acid and enzymes' },
  { id: 'chondrocyte', name: 'cartilage cell (chondrocyte)', path: 'Life/Cells/Cartilage', v: 1000, size: [12, 12, 12], nuc: 100, mito: 3, rer: 3, golgi: 2, look: 'cell', says: 'lives without blood vessels in its own matrix and makes it: collagen II and the sugars that hold its water' },
  { id: 'fibroblast', name: 'fibroblast', path: 'Life/Cells/Connective', v: 2000, size: [50, 15, 5], nuc: 200, mito: 5, rer: 4, golgi: 1.5, look: 'spindle', says: 'makes the collagen and elastin of skin, fascia and scar' },
  { id: 'tenocyte', name: 'tendon cell (tenocyte)', path: 'Life/Cells/Connective', v: 600, size: [40, 5, 3], nuc: 80, mito: 4, rer: 3, look: 'spindle', says: 'a flat cell in rows between a tendon\'s collagen fibres' },
  // ---- skin, lining ----------------------------------------------------------------------------------------------
  { id: 'keratinocyte', name: 'skin cell (keratinocyte)', path: 'Life/Cells/Skin', v: 1500, size: [15, 15, 7], nuc: 150, mito: 4, also: 'keratin*10000000', look: 'cell', says: 'the cell of the epidermis: born at its base, it fills with keratin as it rises, and dies at the top as a corneocyte' },
  { id: 'corneocyte', name: 'dead skin cell (corneocyte)', path: 'Life/Cells/Skin', v: 900, size: [35, 35, 0.8], dens: 1.25e-12, nuc: 0, mito: 0, rer: 0, ser: 0, golgi: 0, lyso: 0, perox: 0, pm: 2500, ribo: 0, actin: 0, tubulin: 0, also: 'keratin:7.5e-10 cholesterol:4e-11 sphingomyelin:4e-11', rest: 'water', look: 'flake', says: 'a flat dead shell of keratin in lipid mortar, 15–20 layers of them the skin\'s barrier; about 500 million shed a day (an estimate)' },
  { id: 'melanocyte', name: 'pigment cell (melanocyte)', path: 'Life/Cells/Skin', v: 1000, size: [20, 10, 10], nuc: 100, mito: 5, also: 'melanin:3e-11', look: 'star', says: 'makes melanin and hands it to the keratinocytes round it: the colour of skin and hair' },
  { id: 'endothelial-cell', name: 'vessel lining cell (endothelial cell)', path: 'Life/Cells/Vessels', v: 1000, size: [50, 15, 1.5], nuc: 120, mito: 4, look: 'flake', says: 'one thin layer of them lines every vessel: about 600 billion in the body (estimate)' },
  { id: 'alveolar-cell-1', name: 'alveolar cell, type I', path: 'Life/Cells/Lung', v: 1800, size: [80, 80, 0.3], nuc: 100, mito: 2, look: 'flake', says: 'spread 0.2 µm thin over 95 % of the lung\'s surface, so oxygen crosses it in under a millisecond' },
  { id: 'alveolar-cell-2', name: 'alveolar cell, type II', path: 'Life/Cells/Lung', v: 900, size: [10, 10, 10], nuc: 100, mito: 6, rer: 4, also: 'dppc:1e-10', look: 'cell', says: 'makes surfactant, the lipid that keeps alveoli from collapsing, and replaces type I cells' },
  // ---- senses ---------------------------------------------------------------------------------------------------
  { id: 'rod-cell', name: 'rod cell', path: 'Life/Cells/Eye', v: 200, size: [100, 2, 2], nuc: 25, mito: 12, also: 'rhodopsin*100000000 membrane-um2*6300', look: 'rod', says: 'a dim-light sensor that can count single photons: about 1,000 membrane discs in its outer segment, about 100 million rhodopsins; 92 million of them in a retina' },
  { id: 'cone-cell', name: 'cone cell', path: 'Life/Cells/Eye', v: 250, size: [60, 5, 5], nuc: 30, mito: 12, also: 'photopsin*50000000 membrane-um2*3000', look: 'rod', says: 'a colour sensor: L, M or S opsin for red, green or blue; 4.6 million in a retina, most of them at the fovea' },
  { id: 'hair-cell', name: 'inner-ear hair cell', path: 'Life/Cells/Ear', v: 1000, size: [35, 9, 9], nuc: 100, mito: 6, also: 'actin*30000000', look: 'column', says: 'its bundle of stiff actin hairs bends with sound, opening channels: 3,500 inner hair cells in a cochlea hear; they do not grow back' },
  // ---- germ cells -----------------------------------------------------------------------------------------------
  { id: 'sperm', name: 'sperm cell', path: 'Life/Cells/Germ', v: 22, size: [55, 3, 1], nuc: 8, genome: 'genome-haploid', mito: 12, rer: 0, ser: 0, golgi: 0, lyso: 0, perox: 0, ribo: 0, also: 'microtubule-um*900 dynein*18000 protamine*1000000', look: 'sperm', says: 'a head of tightly packed DNA (protamine in place of histones), a midpiece of about 75 mitochondria wound in a helix, and a tail 45 µm long beaten by dynein; swims about 3 mm a minute', spec: 'head 4.5 µm, midpiece 4.5 µm, tail 45 µm (ICRP 89)' },
  { id: 'oocyte', name: 'egg cell (oocyte)', path: 'Life/Cells/Germ', v: 900000, size: [120, 120, 120], nuc: 14000, genome: 'genome-haploid', mito: 3, ribo: 2000, also: 'fat-droplet:5e-9 glycogen:2e-9', look: 'sphere', says: 'the largest cell of the body, 120 µm across, about 100,000 mitochondria: everything an embryo needs for its first days' },
  { id: 'stem-cell', name: 'stem cell (typical)', path: 'Life/Cells/Stem', v: 400, size: [9, 9, 9], nuc: 150, mito: 4, ribo: 1500, look: 'cell', says: 'a cell that makes more of itself and cells of other kinds' },
];
export const CELLS: LifeEntry[] = CELL_TYPES.flatMap(cellOf);

/** Muscle's working parts, from the molecule up. */
export const MUSCLE = entries(`
thick-filament | thick filament | Life/Cells/Machines/Muscle | part | myosin*294 titin*12 | = | 0.0016x0.000015x0.000015 | rod | 1.6 µm of myosin, its tails bundled and its heads out to pull on actin; titins (six each side) spring it to the Z-discs | about 294 myosins a filament
thin-filament | thin filament | Life/Cells/Machines/Muscle | part | actin*364 tropomyosin*52 troponin*52 nebulin*1 | = | 0.001x0.000007x0.000007 | rod | 1 µm of actin, two strands; tropomyosin along it hides the myosin sites until calcium binds troponin and moves it | one tropomyosin and troponin each 7 actins
sarcomere | sarcomere | Life/Cells/Machines/Muscle | part | thick-filament*500 thin-filament*2000 alpha-actinin*2000 sarcoplasm:* | 2.1e-12 | 0.0025x0.001x0.001 | sarcomere | the unit that contracts, between two Z-discs: thick filaments between thin; each myosin stroke slides them about 10 nm on an ATP | 2.5 µm at rest (2.0–3.6 working); a myofibril 1 µm across: about 500 thick and 2,000 thin
myofibril | myofibril | Life/Cells/Machines/Muscle | part | sarcomere*40000 | = | 100x0.001x0.001 | rod | sarcomeres end to end the fibre's length: 40,000 in 10 cm |
cardiac-myofibril | heart myofibril | Life/Cells/Machines/Muscle | part | sarcomere*48 | = | 0.12x0.001x0.001 | rod | 48 sarcomeres the length of a heart cell |
`);

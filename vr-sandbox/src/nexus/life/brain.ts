// The brain, down to its synapses' molecules. Its parts by mass and neuron count from Azevedo et al. 2009 (four men's
// brains: 86 billion neurons; the cerebral cortex 16.3 billion of them in 1,233 g, the cerebellum 69.0 billion in 154 g,
// the rest 0.69 billion in 118 g), scaled to ICRP 89's 1,450 g; the cortex by lobe and by the areas Brodmann numbered
// (1909), the deep nuclei and the brainstem by name. Each region is grey or white matter by the gram, each gram its
// neurons and glia by count, each neuron its synapses, each synapse its vesicles and receptors, each of those its
// molecules (./cells.ts, ./molecules.ts). Shares of a region not measured are estimates, and say so.

import { cellOf, type CellType } from './cells';
import { entries, type LifeEntry } from './core';

const CELLS: CellType[] = [
  { id: 'pyramidal-neuron', name: 'pyramidal neuron', path: 'Life/Brain/Neurons', v: 26000, size: [20, 20, 1000], nuc: 520, mito: 6, rer: 1.5, pm: 100000, ribo: 300, tubulin: 30000, also: 'synapse*10000 neurofilament*3000000 nav-channel*1000000 kv-channel*1000000 na-k-atpase*10000000', look: 'neuron', says: 'the excitatory neuron of the cortex, about 80 % of its neurons: a triangular soma, an apical dendrite up through the layers with about 10,000 spines, and an axon to other areas; about 10,000 synapses out (Tang et al. 2001: about 164 trillion in a man\'s neocortex). Here its part in grey matter (soma, dendrites, local axon: about 26,000 µm³, an estimate); its long axon is in the white matter. Its channel and pump counts are estimates', spec: 'fires up to about 100 spikes a second; rests at −70 mV' },
  { id: 'interneuron', name: 'interneuron (inhibitory)', path: 'Life/Brain/Neurons', v: 20000, size: [15, 15, 300], nuc: 300, mito: 7, pm: 80000, ribo: 300, tubulin: 30000, also: 'synapse-gaba*10000 nav-channel*800000 kv-channel*1000000 na-k-atpase*8000000', look: 'neuron', says: 'a GABA neuron, about 20 % of the cortex\'s: basket, chandelier and Martinotti cells that brake and time the pyramidal cells (its size an estimate)' },
  { id: 'purkinje-cell', name: 'Purkinje cell', path: 'Life/Brain/Neurons', v: 100000, size: [30, 250, 300], nuc: 600, mito: 6, pm: 250000, ribo: 300, tubulin: 30000, also: 'synapse-gaba*1000 nav-channel*2000000 cav-channel*1000000', look: 'neuron', says: 'the cerebellum\'s output neuron, about 15 million of them: a flat fan of dendrite that about 200,000 parallel fibres cross and touch; inhibits the deep nuclei (its size an estimate)' },
  { id: 'granule-cell', name: 'cerebellar granule cell', path: 'Life/Brain/Neurons', v: 450, size: [6, 6, 3000], nuc: 70, mito: 3, pm: 3000, ribo: 200, tubulin: 20000, also: 'synapse*45', look: 'neuron', says: 'the most numerous neuron: 69 billion of the brain\'s 86 (Azevedo et al. 2009); a 6 µm soma whose axon rises and splits into a parallel fibre 3 mm long' },
  { id: 'deep-neuron', name: 'projection neuron (deep nuclei)', path: 'Life/Brain/Neurons', v: 40000, size: [30, 30, 600], nuc: 600, mito: 7, pm: 120000, ribo: 400, tubulin: 30000, also: 'synapse*5000 nav-channel*1000000 kv-channel*1000000', look: 'neuron', says: 'a neuron of the thalamus, basal ganglia or brainstem (as one, typical; its size an estimate)' },
  { id: 'dopamine-neuron', name: 'dopamine neuron', path: 'Life/Brain/Neurons', v: 60000, size: [25, 25, 2000], nuc: 600, mito: 8, pm: 200000, ribo: 400, tubulin: 30000, also: 'synapse*30000 dopamine*1000000000', look: 'neuron', says: 'in the substantia nigra, about 450,000 each side in a young adult: its axon branches over the striatum to vast numbers of synapses (in the millions, Bolam & Pissadaki 2012), most of them in the striatum and not counted here; its loss is Parkinson\'s (its sizes and counts estimates)' },
  { id: 'astrocyte', name: 'astrocyte', path: 'Life/Brain/Glia', v: 4000, size: [100, 100, 100], nuc: 150, mito: 5, pm: 60000, look: 'star', says: 'a star of fine processes that feeds neurons, clears glutamate and K⁺, and wraps synapses: a human one touches about 2 million synapses (Oberheim et al. 2009)' },
  { id: 'oligodendrocyte', name: 'oligodendrocyte', path: 'Life/Brain/Glia', v: 6100, size: [10, 10, 10], dens: 1.0e-12, nuc: 100, mito: 2, rer: 1, pm: 3000, actin: 10000, tubulin: 5000, also: 'myelin-um2*700000', look: 'star', says: 'wraps segments of up to about 50 axons in myelin (here about 700,000 µm² of it, an estimate), so spikes leap node to node at up to 100 m/s; its myelin is 40 % water' },
  { id: 'microglia', name: 'microglia', path: 'Life/Brain/Glia', v: 600, size: [40, 40, 40], nuc: 100, mito: 3, lyso: 200, look: 'star', says: 'the brain\'s own immune cells, 5–10 % of its cells: they prune synapses and clear debris' },
  { id: 'opc', name: 'oligodendrocyte precursor', path: 'Life/Brain/Glia', v: 500, size: [30, 30, 30], nuc: 100, mito: 3, look: 'star', says: 'makes new oligodendrocytes all life: about 5 % of glia' },
];

const AZEVEDO = { cortex: 1232.9, cerebellum: 154.0, rest: 117.9 }, BRAIN = 1450, k = BRAIN / (AZEVEDO.cortex + AZEVEDO.cerebellum + AZEVEDO.rest);
const CORTEX = +(AZEVEDO.cortex * k).toFixed(1), CEREBELLUM = +(AZEVEDO.cerebellum * k).toFixed(1), REST = +(BRAIN - CORTEX - CEREBELLUM).toFixed(1);

// The areas Brodmann numbered in the human cortex (1909), each with what it does; each lobe's grey matter shared
// equally among its areas (an estimate: they differ in size).
const AREAS: [number, string, string, string][] = [
  [4, 'frontal', 'primary motor cortex', 'drives the muscles of the opposite side, mapped body part by body part (the homunculus)'],
  [6, 'frontal', 'premotor and supplementary motor cortex', 'plans and sequences movement'],
  [8, 'frontal', 'frontal eye fields', 'moves the eyes to what you choose to look at'],
  [9, 'frontal', 'dorsolateral prefrontal cortex (part)', 'working memory and planning'],
  [10, 'frontal', 'frontopolar cortex', 'holds goals while doing something else; the most human of areas'],
  [11, 'frontal', 'orbitofrontal cortex', 'values and rewards, and decisions by them'],
  [44, 'frontal', 'Broca\'s area (pars opercularis)', 'speaking: grammar and the moves of speech'],
  [45, 'frontal', 'Broca\'s area (pars triangularis)', 'the meaning of words in speech'],
  [46, 'frontal', 'dorsolateral prefrontal cortex', 'working memory, attention and control'],
  [47, 'frontal', 'pars orbitalis', 'the meaning and rhythm of language'],
  [3, 'parietal', 'primary somatosensory cortex (3)', 'touch and body position, mapped body part by body part'],
  [1, 'parietal', 'primary somatosensory cortex (1)', 'texture'],
  [2, 'parietal', 'primary somatosensory cortex (2)', 'size and shape by touch'],
  [5, 'parietal', 'somatosensory association cortex', 'where the limbs are'],
  [7, 'parietal', 'superior parietal lobule', 'reaching and grasping guided by sight'],
  [39, 'parietal', 'angular gyrus', 'reading, arithmetic, and knowing where you are'],
  [40, 'parietal', 'supramarginal gyrus', 'the sounds of words, and using tools'],
  [43, 'parietal', 'subcentral area', 'taste'],
  [41, 'temporal', 'primary auditory cortex', 'hearing, tone by tone (Heschl\'s gyrus)'],
  [42, 'temporal', 'secondary auditory cortex', 'sounds as patterns'],
  [22, 'temporal', 'superior temporal gyrus (with Wernicke\'s area)', 'understanding speech'],
  [21, 'temporal', 'middle temporal gyrus', 'the meanings of words, and faces in motion'],
  [20, 'temporal', 'inferior temporal gyrus', 'recognising objects'],
  [37, 'temporal', 'fusiform gyrus', 'faces and written words'],
  [38, 'temporal', 'temporal pole', 'knowing people, and feeling about them'],
  [52, 'temporal', 'parainsular area', 'the border of the insula and the temporal lobe'],
  [28, 'temporal', 'entorhinal cortex', 'the gateway to the hippocampus: its grid cells map space'],
  [34, 'temporal', 'dorsal entorhinal cortex (uncus)', 'smell'],
  [35, 'temporal', 'perirhinal cortex', 'knowing that you have seen a thing before'],
  [36, 'temporal', 'parahippocampal cortex', 'places and scenes'],
  [27, 'temporal', 'presubiculum', 'which way the head faces'],
  [48, 'temporal', 'retrosubicular area', 'beside the hippocampus'],
  [17, 'occipital', 'primary visual cortex (V1)', 'sight, point by point of the visual field'],
  [18, 'occipital', 'secondary visual cortex (V2)', 'contours and depth'],
  [19, 'occipital', 'visual association cortex (V3, V4, V5)', 'colour, form and motion'],
  [24, 'cingulate', 'ventral anterior cingulate', 'pain\'s unpleasantness, and the effort a thing is worth'],
  [32, 'cingulate', 'dorsal anterior cingulate', 'noticing a mistake'],
  [33, 'cingulate', 'pregenual area', 'in the callosal sulcus'],
  [25, 'cingulate', 'subgenual area', 'mood: a target for treating depression'],
  [23, 'cingulate', 'ventral posterior cingulate', 'memory and the self'],
  [31, 'cingulate', 'dorsal posterior cingulate', 'the default mode: the mind wandering'],
  [26, 'cingulate', 'ectosplenial area', 'behind the corpus callosum'],
  [29, 'cingulate', 'granular retrosplenial area', 'memory of places'],
  [30, 'cingulate', 'agranular retrosplenial area', 'memory of places'],
];
/** The cerebral cortex, g: what is not lobe is these (estimates from typical volumes). */
const OTHER = { hippocampus: 3.5, amygdala: 1.3, callosum: 20, bulb: 0.06, insulaGrey: 15, insulaWhite: 10, cingulateGrey: 18, cingulateWhite: 7 };
const LOBES = { frontal: 0.41, parietal: 0.25, temporal: 0.22, occipital: 0.12 }, GREY = 0.55;
const lobesTotal = CORTEX - (2 * OTHER.hippocampus + 2 * OTHER.amygdala + OTHER.callosum + 2 * OTHER.bulb + OTHER.insulaGrey + OTHER.insulaWhite + OTHER.cingulateGrey + OTHER.cingulateWhite);
const sig = (x: number) => +x.toPrecision(4);
const areaLines = AREAS.map(([n, lobe, name, does]) => {
  const greyOf = lobe === 'cingulate' ? OTHER.cingulateGrey : (GREY * lobesTotal * LOBES[lobe as keyof typeof LOBES]) / 2, inLobe = AREAS.filter((a) => a[1] === lobe).length;
  return `brodmann-${n} | Brodmann area ${n}: ${name} | Life/Brain/Cortex/${lobe[0]!.toUpperCase()}${lobe.slice(1)} | part | cortical-grey:${sig(greyOf / inLobe)} | = | 40x30x3 | cortex | ${does} | Brodmann 1909; its mass an equal share of its lobe's grey matter (an estimate)`;
}).join('\n');
const lobeLine = (lobe: keyof typeof LOBES, name: string, does: string) => `${lobe}-lobe | ${name} | Life/Brain/Cortex | assembly | ${AREAS.filter((a) => a[1] === lobe).map((a) => `brodmann-${a[0]}`).join(' ')} white-matter:${sig(((1 - GREY) * lobesTotal * LOBES[lobe]) / 2)} | = | 120x80x70 | lobe | ${does} | one hemisphere's; ${Math.round(LOBES[lobe] * 100)} % of the lobes' mass, ${Math.round(GREY * 100)} % of it grey (estimates)`;

export const BRAIN_ENTRIES: LifeEntry[] = [...CELLS.flatMap(cellOf), ...entries(`
// ---- synapses: what neurons touch each other with ----------------------------------------------------------------
psd | postsynaptic density | Life/Brain/Synapse | part | psd95*300 ampa-receptor*20 nmda-receptor*10 enzyme:1.76e-15 | = | 0.0004x0.0004x0.00004 | disc | a disc of protein under the receptors, about 1.1 GDa (Chen et al. 2005): PSD-95 holds AMPA and NMDA receptors in place, CaMKII and the rest make memory of what passes (its receptor counts estimates) |
presynaptic-bouton | presynaptic bouton | Life/Brain/Synapse | part | synaptic-vesicle*200 mitochondrion*0.5 cav-channel*50 plasma-membrane-um2*3 cytosol:* | 5.3e-13 | 0.001x0.001x0.0008 | bouton | a swelling of the axon holding about 200 vesicles of glutamate, half of them with a mitochondrion; calcium in through its channels lets a vesicle go in under a millisecond (counts estimates) |
dendritic-spine | dendritic spine | Life/Brain/Synapse | part | psd plasma-membrane-um2*0.8 actin*20000 cytosol:* | 1.1e-13 | 0.001x0.0006x0.0006 | spine | a mushroom on a dendrite that takes one synapse: it grows and shrinks as the synapse learns |
synapse | synapse (glutamate) | Life/Brain/Synapse | part | presynaptic-bouton dendritic-spine extracellular-fluid:2e-15 | = | 0.0015x0.001x0.001 | synapse | where one neuron speaks to the next: a vesicle's 2,000 glutamates cross a 20 nm cleft and open receptors on the spine, all in about a millisecond |
gaba-bouton | presynaptic bouton (GABA) | Life/Brain/Synapse | part | gaba-vesicle*200 mitochondrion*0.5 cav-channel*50 plasma-membrane-um2*3 cytosol:* | 5.3e-13 | 0.001x0.001x0.0008 | bouton | an inhibitory neuron's terminal |
gaba-postsynapse | inhibitory postsynapse | Life/Brain/Synapse | part | gaba-a-receptor*50 gephyrin*200 plasma-membrane-um2*0.3 | = | 0.0004x0.0004x0.00003 | disc | GABA-A receptors held by gephyrin on the shaft of a dendrite or the soma (counts estimates) |
synapse-gaba | synapse (GABA) | Life/Brain/Synapse | part | gaba-bouton gaba-postsynapse extracellular-fluid:2e-15 | = | 0.0015x0.001x0.001 | synapse | an inhibitory synapse: GABA opens chloride channels and holds the next cell back |
nmj | neuromuscular junction | Life/Brain/Synapse | part | ach-vesicle*200000 nachr*10000000 mitochondrion*100 plasma-membrane-um2*1000 cytosol:* | 1.2e-10 | 0.03x0.03x0.003 | synapse | where a motor nerve meets a muscle fibre, one to a fibre: each spike frees about 50 vesicles of acetylcholine, more than enough to fire the fibre (counts estimates) |
axon-mm | a millimetre of axon | Life/Brain/Axons | part | microtubule-um*16000 neurofilament*400000 mitochondrion*200 plasma-membrane-um2*3140 nav-channel*30000 kv-channel*20000 na-k-atpase*300000 cytosol:* | 8.4e-10 | 1x0.001x0.001 | axon | a millimetre of a long axon 1 µm across: a cable of microtubules for transport, mitochondria every 5 µm, sodium channels packed at its nodes (counts estimates); the myelin round it is its oligodendrocytes' |
// ---- tissue, a gram -------------------------------------------------------------------------------------------------
cortical-grey | cortical grey matter (a gram) | Life/Brain/Tissue | part | pyramidal-neuron*2.0e7 interneuron*5.0e6 astrocyte*1.5e7 oligodendrocyte*5e6 microglia*5e6 opc*3e6 endothelial-cell*5e6 extracellular-fluid:* | 1 | 9.7x9.7x9.7 | swatch | the cortex's six layers: about 25,000 neurons a mm³ (typical), a kilometre of axon and a billion synapses a mm³ |
white-matter | white matter (a gram) | Life/Brain/Tissue | part | axon-mm*3.6e8 oligodendrocyte*6e7 astrocyte*1e7 microglia*5e6 endothelial-cell*5e6 extracellular-fluid:* | 1 | 9.9x9.9x9.9 | swatch | bundles of myelinated axons: the brain's wiring between areas (its cell counts estimates) |
deep-grey | grey matter of the deep nuclei (a gram) | Life/Brain/Tissue | part | deep-neuron*9e6 astrocyte*3e7 oligodendrocyte*2e7 microglia*1e7 endothelial-cell*5e6 extracellular-fluid:* | 1 | 9.7x9.7x9.7 | swatch | the nuclei below the cortex: fewer, larger neurons among more glia (counts from Azevedo et al. 2009's rest of brain, shared by an estimate) |
cerebellar-cortex | cerebellar cortex (a gram) | Life/Brain/Tissue | part | granule-cell*6.3e8 purkinje-cell*136000 interneuron*1.5e6 astrocyte*6e7 oligodendrocyte*5e6 microglia*5e6 endothelial-cell*5e6 extracellular-fluid:* | 1 | 9.7x9.7x9.7 | swatch | three layers folded into folia: molecular (Purkinje dendrites and parallel fibres), Purkinje, granular (the granule cells, packed) |
// ---- the cerebrum's parts -----------------------------------------------------------------------------------------------
${areaLines}
${lobeLine('frontal', 'frontal lobe', 'movement, speech, planning, the self\'s control')}
${lobeLine('parietal', 'parietal lobe', 'touch, the body\'s place, attention to space, number')}
${lobeLine('temporal', 'temporal lobe', 'hearing, language, objects and faces, memory')}
${lobeLine('occipital', 'occipital lobe', 'sight')}
insula | insula | Life/Brain/Cortex | assembly | cortical-grey:${OTHER.insulaGrey} white-matter:${OTHER.insulaWhite} | = | 50x40x20 | lobe | the hidden lobe under the temporal: the body's inner state, taste, disgust | its mass an estimate
cingulate-cortex | cingulate cortex | Life/Brain/Cortex | assembly | ${AREAS.filter((a) => a[1] === 'cingulate').map((a) => `brodmann-${a[0]}`).join(' ')} white-matter:${OTHER.cingulateWhite} | = | 120x20x20 | lobe | the girdle round the corpus callosum: emotion, pain, error and memory (the limbic lobe) | its mass an estimate
hippocampus | hippocampus | Life/Brain/Limbic | part | cortical-grey:2.8 white-matter:0.7 | = | 45x15x10 | seahorse | makes new memories of events and places (its place cells); CA1–CA3 and the dentate gyrus | about 3.5 g each (an estimate from MRI volumes)
amygdala | amygdala | Life/Brain/Limbic | part | deep-grey:1.3 | = | 15x12x10 | almond | fear and what matters: an almond of nuclei in front of the hippocampus | about 1.3 g each (an estimate)
corpus-callosum | corpus callosum | Life/Brain/Cortex | part | white-matter:${OTHER.callosum} | = | 80x15x10 | arch | about 200 million axons joining the two hemispheres (Aboitiz et al. 1992) | its mass an estimate
olfactory-bulb | olfactory bulb | Life/Brain/Cortex | part | deep-grey:0.03 white-matter:* | ${OTHER.bulb} | 12x5x3 | bulb | where smell nerves first meet the brain | its mass an estimate
cerebrum | cerebrum | Life/Brain | assembly | frontal-lobe*2 parietal-lobe*2 temporal-lobe*2 occipital-lobe*2 insula cingulate-cortex hippocampus*2 amygdala*2 corpus-callosum olfactory-bulb*2 | = | 170x140x95 | cerebrum | the two hemispheres: the cerebral cortex and its white matter, ${CORTEX} g with 16.3 billion neurons (Azevedo et al. 2009, scaled to ICRP's brain) | each lobe here is one hemisphere's
// ---- the deep nuclei and the brainstem -------------------------------------------------------------------------------
thalamus | thalamus | Life/Brain/Deep nuclei | part | deep-grey:6 white-matter:* | 7 | 30x20x20 | egg | the relay of every sense but smell to the cortex, and of the cortex's loops | about 7 g each (an estimate)
hypothalamus | hypothalamus | Life/Brain/Deep nuclei | part | deep-grey:3.5 white-matter:* | 4 | 15x15x10 | almond | hunger, thirst, temperature, sleep, sex and the pituitary's orders | an estimate
caudate | caudate nucleus | Life/Brain/Basal ganglia | part | deep-grey:3.7 | = | 60x15x10 | comma | the striatum's head and tail: habits and goals | about 3.7 g each (an estimate)
putamen | putamen | Life/Brain/Basal ganglia | part | deep-grey:5 | = | 40x25x15 | shell | the striatum's motor part: learned movements | about 5 g each (an estimate)
globus-pallidus | globus pallidus | Life/Brain/Basal ganglia | part | deep-grey:1.6 | = | 25x15x10 | almond | the basal ganglia's output: it holds movement back until chosen | about 1.6 g each (an estimate)
nucleus-accumbens | nucleus accumbens | Life/Brain/Basal ganglia | part | deep-grey:0.6 | = | 10x10x8 | almond | reward and wanting | an estimate
subthalamic-nucleus | subthalamic nucleus | Life/Brain/Basal ganglia | part | deep-grey:0.12 | = | 10x6x4 | almond | the brake on the basal ganglia: where deep-brain stimulators go for Parkinson's | an estimate
substantia-nigra | substantia nigra | Life/Brain/Basal ganglia | part | dopamine-neuron*450000 deep-grey:* | 0.45 | 15x10x3 | almond | the black substance, dark with neuromelanin: its dopamine neurons drive the striatum | about 450,000 dopamine neurons a side in a young adult (estimates)
midbrain | midbrain | Life/Brain/Brainstem | part | deep-grey:4 white-matter:* | 10 | 25x25x20 | stem | eye movements, the pupil, startle; the red nucleus and the colliculi | an estimate
pons | pons | Life/Brain/Brainstem | part | deep-grey:5 white-matter:* | 16 | 30x35x25 | stem | relays cortex to cerebellum; breathing's rhythm, and sleep | an estimate
medulla | medulla oblongata | Life/Brain/Brainstem | part | deep-grey:2.5 white-matter:* | 7 | 30x20x15 | stem | heartbeat, breathing and blood pressure: life itself | an estimate
deep-white-matter | the internal capsule and other deep white matter | Life/Brain/Deep nuclei | part | white-matter:1 | = | 9.9x9.9x9.9 | swatch | the fibres between cortex, nuclei and cord (a gram) |
rest-of-brain | diencephalon, basal ganglia and brainstem | Life/Brain | assembly | thalamus*2 hypothalamus caudate*2 putamen*2 globus-pallidus*2 nucleus-accumbens*2 subthalamic-nucleus*2 substantia-nigra*2 midbrain pons medulla choroid-plexus*4 deep-white-matter:* | ${REST} | 80x60x80 | stem | Azevedo et al. 2009's "rest of brain": 0.69 billion neurons and 7.7 billion other cells | ${REST} g (scaled to ICRP's brain)
// ---- the cerebellum -------------------------------------------------------------------------------------------------------
dentate-nucleus | dentate nucleus | Life/Brain/Cerebellum | part | deep-grey:1.2 | = | 20x10x10 | almond | the largest of the cerebellum's deep nuclei: its output to the thalamus and cortex | an estimate
cerebellar-nuclei | interposed and fastigial nuclei | Life/Brain/Cerebellum | part | deep-grey:0.5 | = | 10x8x8 | almond | the cerebellum's other outputs, to the brainstem | an estimate
cerebellum | cerebellum | Life/Brain | assembly | cerebellar-cortex:110 dentate-nucleus*2 cerebellar-nuclei*2 white-matter:* | ${CEREBELLUM} | 100x60x50 | cerebellum | the little brain: a tenth of the brain's mass, four fifths of its neurons (69 billion, Azevedo et al. 2009): timing, balance and the fine tuning of every movement | ${CEREBELLUM} g (scaled to ICRP's brain); its cortex 110 g (an estimate)
// ---- the brain ------------------------------------------------------------------------------------------------------------
brain | brain | Life/Human/Nervous | assembly | cerebrum cerebellum rest-of-brain | = | 170x140x130 | brain | 1.45 kg (ICRP 89) of about 86 billion neurons and as many other cells (Azevedo et al. 2009), with about 150 trillion synapses; it uses about 20 W, a fifth of the body's energy at rest | ICRP 89: 1,450 g
cerebrospinal-fluid-volume | cerebrospinal fluid | Life/Human/Nervous | part | cerebrospinal-fluid:150 | = | 100x100x15 | swatch | 150 ml round brain and cord, made afresh about four times a day | ICRP 89: 150 ml
`)];

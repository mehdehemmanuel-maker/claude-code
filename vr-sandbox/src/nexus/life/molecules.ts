// The molecules life is made of, each to its formula (a polymer as its repeating unit) or, where it is a mix, its blend.
// A protein with no single formula is the average protein (its residues' typical make-up) at its molecular weight, so a
// count of molecules is a mass. Weights in daltons, from UniProt or the paper each names; "about" where it varies.

import { molecules } from './core';

export const MOLECULES = molecules(`
// ---- water, salts and gases --------------------------------------------------------------------------------------
nacl | sodium chloride | Biomolecules/Salts and ions | NaCl | the salt of blood and sweat: Na⁺ and Cl⁻ in solution
kcl | potassium chloride | Biomolecules/Salts and ions | KCl | K⁺, the ion inside cells, with its Cl⁻
sodium-bicarbonate | bicarbonate (as sodium bicarbonate) | Biomolecules/Salts and ions | NaHCO3 | the buffer of blood: HCO₃⁻ holds its pH near 7.4
calcium-chloride | calcium ions (as CaCl₂) | Biomolecules/Salts and ions | CaCl2 | Ca²⁺: the trigger of muscle, nerve and clotting
magnesium-chloride | magnesium ions (as MgCl₂) | Biomolecules/Salts and ions | MgCl2 | Mg²⁺, which ATP is bound to in a cell
potassium-phosphate | potassium and phosphate ions (as K₂HPO₄) | Biomolecules/Salts and ions | K2HPO4 | the cell's K⁺ (about 140 mmol/l) and its phosphate: inside a cell potassium's partners are phosphates and proteins, not chloride
sodium-phosphate | phosphate ions (as Na₂HPO₄) | Biomolecules/Salts and ions | Na2HPO4 | the phosphate of cells, bone and DNA in solution
hydrochloric-acid | hydrochloric acid | Biomolecules/Salts and ions | HCl | the stomach's acid, at about pH 1.5–3.5
oxygen-gas | oxygen | Biomolecules/Gases | O2 | breathed in, carried by haemoglobin, burnt in mitochondria
methane | methane | Biomolecules/Gases | CH4 | what methanogens breathe out
// ---- sugars ---------------------------------------------------------------------------------------------------------
glucose | glucose | Biomolecules/Sugars | C6H12O6 | the fuel of cells: 5 mmol/l in blood
glycogen | glycogen | Biomolecules/Sugars | C6H10O5 | glucose stored in liver and muscle, as its unit
lactic-acid | lactic acid | Biomolecules/Sugars | C3H6O3 | what muscle makes of glucose without oxygen
cellulose | cellulose | Biomolecules/Sugars | C6H10O5 | the fibre of plant walls, as its glucose unit; the most made polymer on Earth
beta-glucan | β-glucan | Biomolecules/Sugars | C6H10O5 | the glucose chains of fungal walls
chitin | chitin | Biomolecules/Sugars | C8H13NO5 | the wall of fungi and the shell of insects, as its N-acetylglucosamine unit
agarose | agarose | Biomolecules/Sugars | C12H18O9 | the gel of agar, from red seaweed, as its repeating disaccharide
hyaluronic-acid | hyaluronic acid | Biomolecules/Sugars | C14H21NO11 | the slippery chain of joint fluid and skin, as its disaccharide
chondroitin-sulfate | chondroitin sulfate | Biomolecules/Sugars | C14H21NO14S | the sulfated sugar of cartilage that holds its water, as its disaccharide
// ---- nucleic acids -------------------------------------------------------------------------------------------------
dna | DNA | Biomolecules/Nucleic acids | C39H49N15O24P4 | the double helix, as two base pairs (one each of dA, dC, dG, dT); about 618 Da a base pair | 1236
rna | RNA | Biomolecules/Nucleic acids | C38H47N15O28P4 | as one each of A, C, G and U | 1286
atp | ATP | Biomolecules/Small molecules | C10H16N5O13P3 | the cell's energy currency: each body turns over about its own weight of it a day
nadh | NADH | Biomolecules/Small molecules | C21H29N7O14P2 | carries electrons from food to the respiratory chain
// ---- lipids -------------------------------------------------------------------------------------------------------
phosphatidylcholine | phosphatidylcholine (POPC) | Biomolecules/Lipids | C42H82NO8P | the commonest lipid of membranes: two tails, one head
phosphatidylethanolamine | phosphatidylethanolamine (POPE) | Biomolecules/Lipids | C39H76NO8P | the inner leaflet's lipid
sphingomyelin | sphingomyelin | Biomolecules/Lipids | C39H79N2O6P | a membrane lipid of nerve sheaths
cholesterol | cholesterol | Biomolecules/Lipids | C27H46O | stiffens membranes; the start of steroid hormones
triglyceride | triglyceride (tripalmitin) | Biomolecules/Lipids | C51H98O6 | stored fat: three fatty acids on glycerol
galactocerebroside | galactocerebroside | Biomolecules/Lipids | C48H93NO8 | the sugar lipid of myelin
cardiolipin | cardiolipin | Biomolecules/Lipids | C81H142O17P2 | the four-tailed lipid of the inner mitochondrial membrane
dppc | dipalmitoylphosphatidylcholine | Biomolecules/Lipids | C40H80NO8P | lung surfactant: it lets alveoli open
wax-ester | wax ester | Biomolecules/Lipids | C46H92O2 | beeswax's main part (triacontanyl palmitate)
// ---- small molecules: messengers --------------------------------------------------------------------------------
glutamate | glutamate | Biomolecules/Neurotransmitters | C5H9NO4 | the main excitatory transmitter of the brain
gaba | GABA | Biomolecules/Neurotransmitters | C4H9NO2 | the main inhibitory transmitter of the brain
glycine | glycine | Biomolecules/Neurotransmitters | C2H5NO2 | an inhibitory transmitter of the spinal cord, and the smallest amino acid
dopamine | dopamine | Biomolecules/Neurotransmitters | C8H11NO2 | reward, movement and motivation
serotonin | serotonin | Biomolecules/Neurotransmitters | C10H12N2O | mood, sleep and gut
acetylcholine | acetylcholine | Biomolecules/Neurotransmitters | C7H16NO2 | nerve to muscle, and memory
noradrenaline | noradrenaline | Biomolecules/Neurotransmitters | C8H11NO3 | alertness; the sympathetic nerves' transmitter
adrenaline | adrenaline | Biomolecules/Hormones | C9H13NO3 | the adrenal medulla's fight-or-flight hormone
histamine | histamine | Biomolecules/Neurotransmitters | C5H9N3 | wakefulness, and inflammation
cortisol | cortisol | Biomolecules/Hormones | C21H30O5 | the stress hormone of the adrenal cortex
testosterone | testosterone | Biomolecules/Hormones | C19H28O2 | the male sex hormone
estradiol | estradiol | Biomolecules/Hormones | C18H24O2 | the main female sex hormone
thyroxine | thyroxine (T4) | Biomolecules/Hormones | C15H11I4NO4 | the thyroid's hormone: four iodine atoms set the body's pace
melatonin | melatonin | Biomolecules/Hormones | C13H16N2O2 | the pineal gland's night hormone
oxytocin | oxytocin | Biomolecules/Hormones | C43H66N12O12S2 | nine amino acids: bonding, birth and milk
vasopressin | vasopressin | Biomolecules/Hormones | C46H65N15O12S2 | holds water at the kidney
insulin | insulin | Biomolecules/Hormones | C257H383N65O77S6 | the beta cell's hormone: glucose into cells | 5808
glucagon | glucagon | Biomolecules/Hormones | C153H225N43O49S | the alpha cell's hormone: glucose out of the liver | 3483
// ---- small molecules: other -----------------------------------------------------------------------------------------
urea | urea | Biomolecules/Small molecules | CH4N2O | how nitrogen leaves the body, in urine
creatine | creatine | Biomolecules/Small molecules | C4H9N3O2 | muscle's quick phosphate store
bilirubin | bilirubin | Biomolecules/Small molecules | C33H36N4O6 | what haem becomes: the yellow of bruises and bile
cholic-acid | cholic acid | Biomolecules/Small molecules | C24H40O5 | the main bile acid: fat into droplets
heme | haem | Biomolecules/Small molecules | C34H32FeN4O4 | the iron ring that holds oxygen
retinal | retinal | Biomolecules/Small molecules | C20H28O | vitamin A's aldehyde: it bends when a photon strikes it
melanin | melanin (eumelanin) | Biomolecules/Pigments | C8H5NO2 | the brown-black pigment of skin, hair and eye, as its indolequinone unit (approximate)
chlorophyll | chlorophyll a | Biomolecules/Pigments | C55H72MgN4O5 | the green of plants: a magnesium ring that catches red and blue light
carminic-acid | carminic acid | Biomolecules/Pigments | C22H20O13 | the red of cochineal insects (E120)
luciferin | D-luciferin | Biomolecules/Small molecules | C11H8N2O3S2 | the firefly's light: oxidised by luciferase, it glows at about 560 nm
levodopa | L-DOPA | Biomolecules/Small molecules | C9H11NO4 | the catechol that lets mussel glue stick under water
aleuritic-acid | shellac (as aleuritic acid) | Biomolecules/Resins | C16H32O5 | the lac insect's resin
polyisoprene | natural rubber (cis-polyisoprene) | Biomolecules/Polymers | C5H8 | the latex of the rubber tree, as its isoprene unit
penicillin | penicillin G | Biomolecules/Antibiotics | C16H18N2O4S | the first antibiotic (Penicillium, Fleming 1928): it stops bacteria building their walls
streptomycin | streptomycin | Biomolecules/Antibiotics | C21H39N7O12 | from Streptomyces griseus: it jams bacterial ribosomes
ethanol | ethanol | Biomolecules/Small molecules | C2H6O | what yeast makes of sugar: C₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂
citric-acid | citric acid | Biomolecules/Small molecules | C6H8O7 | made by Aspergillus niger in tonnes a year
// ---- minerals of life ----------------------------------------------------------------------------------------------
hydroxyapatite | hydroxyapatite | Biomolecules/Biominerals | Ca10P6O26H2 | the mineral of bone and teeth, Ca₁₀(PO₄)₆(OH)₂
magnetite | magnetite | Biomolecules/Biominerals | Fe3O4 | the iron oxide of magnetotactic bacteria's compass, and of ferrofluid
aragonite | aragonite | Biomolecules/Biominerals | CaCO3 | the calcium carbonate of nacre and coral
biosilica | biogenic silica | Biomolecules/Biominerals | blend: SiO2 88, H2O 12 | the glass diatoms and sponges build
// ---- proteins (the average protein at each one's weight) ----------------------------------------------------------
protein | protein (average) | Biomolecules/Proteins | C245H389N68O75S2 | chains of amino acids, as the average residue's make-up (typical: C 53 %, N 17 %, S 1 %) | 5551
collagen | collagen (type I, tropocollagen) | Biomolecules/Proteins/Structural | C12H17N3O4 | three chains wound in a helix 300 nm long: the most abundant protein of the body, as its Gly-Pro-Hyp triplet | 300000
elastin | elastin | Biomolecules/Proteins/Structural | blend: protein 100 | the stretch of arteries, skin and lung | 64000
keratin | keratin | Biomolecules/Proteins/Structural | C245H389N68O75S8 | the protein of hair, nails and the skin's surface, cross-linked by cystine (about 4.5 % sulfur) | 50000
actin | actin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the thin filament, and the cell's skeleton (UniProt P68133) | 42000
myosin | myosin II | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the motor of muscle: two heads that pull actin, an ATP a stroke | 520000
titin | titin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the largest protein: a spring a micrometre long from Z-disc to M-line (UniProt Q8WZ42) | 3800000
tropomyosin | tropomyosin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | lies along actin and hides its myosin sites | 66000
troponin | troponin complex | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | binds calcium and moves tropomyosin off actin: the switch of contraction | 80000
nebulin | nebulin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the ruler of the thin filament | 800000
tubulin | tubulin (αβ dimer) | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the unit of microtubules | 110000
kinesin | kinesin-1 | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | walks cargo out along microtubules, 8 nm a step, an ATP a step | 380000
dynein | cytoplasmic dynein | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | walks cargo back along microtubules | 1400000
spectrin | spectrin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the net under a red cell's membrane | 520000
neurofilament | neurofilament protein | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | the intermediate filament of axons | 200000
haemoglobin | haemoglobin | Biomolecules/Proteins/Carriers | C2952H4664N812O832S8Fe4 | four chains, four haems: each carries four O₂ | 64500
myoglobin | myoglobin | Biomolecules/Proteins/Carriers | blend: protein 96.4, heme 3.6 | muscle's own oxygen store: one haem in 17 kDa | 17000
albumin | serum albumin | Biomolecules/Proteins/Plasma | blend: protein 100 | the main protein of plasma: it holds water in the vessels (UniProt P02768) | 66500
immunoglobulin | immunoglobulin G | Biomolecules/Proteins/Plasma | blend: protein 97, glucose 3 | an antibody: two heavy chains and two light, a Y | 150000
fibrinogen | fibrinogen | Biomolecules/Proteins/Plasma | blend: protein 100 | becomes fibrin, the mesh of a clot | 340000
ferritin | ferritin | Biomolecules/Proteins/Carriers | blend: protein 80, Fe5H9O12 20 | a shell of 24 chains holding up to 4,500 iron atoms as ferrihydrite (Fe₅HO₈·4H₂O) | 474000
histone | histone octamer | Biomolecules/Proteins/Chromatin | blend: protein 100 | the spool DNA winds 1.65 times round: a nucleosome every 200 base pairs | 108000
ribosomal-protein | ribosomal protein | Biomolecules/Proteins/Ribosome | blend: protein 100 | the proteins of the ribosome, 6–50 kDa (as their mean) | 18000
atp-synthase | ATP synthase | Biomolecules/Proteins/Enzymes | blend: protein 100 | a rotary motor in the inner membrane: protons turn it, it makes ATP, three a turn | 600000
na-k-atpase | Na⁺/K⁺-ATPase | Biomolecules/Proteins/Pumps and channels | blend: protein 100 | pumps 3 Na⁺ out and 2 K⁺ in for each ATP: what keeps a cell charged | 160000
nav-channel | voltage-gated sodium channel | Biomolecules/Proteins/Pumps and channels | blend: protein 100 | opens at about −55 mV: the rising edge of a spike | 260000
kv-channel | voltage-gated potassium channel | Biomolecules/Proteins/Pumps and channels | blend: protein 100 | the falling edge of a spike | 200000
cav-channel | voltage-gated calcium channel | Biomolecules/Proteins/Pumps and channels | blend: protein 100 | lets Ca²⁺ in at the terminal: the signal to release | 250000
ampa-receptor | AMPA receptor | Biomolecules/Proteins/Receptors | blend: protein 100 | the fast glutamate receptor: four subunits round a cation pore | 400000
nmda-receptor | NMDA receptor | Biomolecules/Proteins/Receptors | blend: protein 100 | opens only to glutamate and a depolarised cell together: the coincidence detector of learning | 500000
gaba-a-receptor | GABA-A receptor | Biomolecules/Proteins/Receptors | blend: protein 100 | a chloride channel opened by GABA: five subunits of about 50 kDa | 250000
nachr | nicotinic acetylcholine receptor | Biomolecules/Proteins/Receptors | blend: protein 100 | where nerve meets muscle | 290000
psd95 | PSD-95 | Biomolecules/Proteins/Synapse | blend: protein 100 | the scaffold of the postsynaptic density | 95000
synaptobrevin | synaptobrevin | Biomolecules/Proteins/Synapse | blend: protein 100 | the vesicle's SNARE (about 70 a vesicle, Takamori 2006) | 13000
syntaxin | syntaxin | Biomolecules/Proteins/Synapse | blend: protein 100 | the membrane's SNARE | 33000
snap25 | SNAP-25 | Biomolecules/Proteins/Synapse | blend: protein 100 | the third SNARE: the three zip a vesicle into the membrane | 25000
synaptophysin | synaptophysin | Biomolecules/Proteins/Synapse | blend: protein 100 | the most common vesicle protein (about 32 a vesicle) | 38000
v-atpase | V-ATPase | Biomolecules/Proteins/Pumps and channels | blend: protein 100 | the proton pump that charges a vesicle to load it | 900000
vglut | vesicular glutamate transporter | Biomolecules/Proteins/Synapse | blend: protein 100 | loads glutamate into a vesicle (about 10 a vesicle, Takamori 2006, an estimate) | 62000
myelin-protein | myelin proteins (MBP, PLP) | Biomolecules/Proteins/Myelin | blend: protein 100 | hold myelin's wraps together | 25000
rhodopsin | rhodopsin | Biomolecules/Proteins/Receptors | blend: protein 99.3, retinal 0.7 | the light receptor of rods | 40000
enzyme | enzyme (typical) | Biomolecules/Proteins/Enzymes | blend: protein 100 | a protein that speeds one reaction | 50000
mota | MotA | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the stator's proton channel (UniProt P09348) | 32000
motb | MotB | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | anchors the stator to the cell wall | 34000
flig | FliG | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the rotor's torque ring, pushed by the stator | 37000
flim | FliM | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the switch: binds CheY-P and reverses the motor | 38000
flin | FliN | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the bottom of the C-ring | 15000
flif | FliF | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the MS ring in the inner membrane | 61000
flge | FlgE | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the hook: a flexible universal joint | 42000
flic | flagellin (FliC) | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the filament's unit: about 20,000 of them make a propeller 10 µm long | 51000
flgh | FlgH and FlgI | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the L and P rings: the bushing through the outer wall (FlgH 25 kDa, FlgI 38 kDa, as their mean) | 31500
rod-protein | rod proteins (FlgB, C, F, G) | Biomolecules/Proteins/Bacterial motor | blend: protein 100 | the drive shaft (15–28 kDa each, as their mean) | 21000
pilin | pilin | Biomolecules/Proteins/Appendages | blend: protein 100 | the unit of pili (typical; Geobacter's, about 6.5 kDa, make pili that conduct electricity) | 15000
gfp | green fluorescent protein | Biomolecules/Proteins/Tools | blend: protein 100 | from the jellyfish Aequorea victoria: glows green (509 nm) under blue light, on its own | 26900
luciferase | firefly luciferase | Biomolecules/Proteins/Tools | blend: protein 100 | turns luciferin, ATP and O₂ into light | 62000
bacteriorhodopsin | bacteriorhodopsin | Biomolecules/Proteins/Pumps and channels | blend: protein 99, retinal 1 | a light-driven proton pump of archaea: sunlight to a charged membrane | 27000
taq-polymerase | Taq DNA polymerase | Biomolecules/Proteins/Tools | blend: protein 100 | copies DNA at 72 °C: the enzyme of PCR, from Thermus aquaticus | 94000
cas9 | Cas9 | Biomolecules/Proteins/Tools | blend: protein 100 | cuts DNA where its guide RNA matches: gene editing (from Streptococcus pyogenes) | 160000
cellulase | cellulase | Biomolecules/Proteins/Enzymes | blend: protein 100 | breaks cellulose into sugar | 60000
hemocyanin | haemocyanin | Biomolecules/Proteins/Carriers | blend: protein 99.83, Cu 0.17 | the copper oxygen carrier, two copper atoms a 75 kDa unit: the blue of horseshoe crab blood | 75000
fibroin | silk fibroin | Biomolecules/Proteins/Structural | C15H24N6O7 | the silkworm's thread: crystals of GAGAGS repeats in an amorphous matrix | 390000
sericin | sericin | Biomolecules/Proteins/Structural | blend: protein 100 | the gum round silk threads | 300000
spidroin | spidroin | Biomolecules/Proteins/Structural | blend: fibroin 60, protein 40 | spider dragline protein: tougher than steel by weight | 300000
mussel-adhesive | mussel foot protein (Mfp-5) | Biomolecules/Proteins/Structural | blend: protein 85, levodopa 15 | glue that sets under sea water: about a third of its residues are DOPA (its share by mass an estimate) | 9500
factor-c | factor C (of Limulus amebocyte lysate) | Biomolecules/Proteins/Tools | blend: protein 100 | the horseshoe crab's endotoxin sensor, first step of the clot that the LAL test uses to find bacterial endotoxin in drugs | 123000
nucleoporin | nucleoporin | Biomolecules/Proteins/Nucleus | blend: protein 100 | the 30 kinds of protein a nuclear pore is built of, about a thousand copies a pore (as their mean weight, an estimate) | 100000
synaptotagmin | synaptotagmin | Biomolecules/Proteins/Synapse | blend: protein 100 | the vesicle's calcium sensor (about 15 a vesicle, Takamori 2006) | 65000
rab3 | Rab3A | Biomolecules/Proteins/Synapse | blend: protein 100 | a GTPase that docks the vesicle (about 10 a vesicle) | 25000
alpha-actinin | α-actinin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | cross-links thin filaments at the Z-disc | 200000
dystrophin | dystrophin | Biomolecules/Proteins/Motor and cytoskeleton | blend: protein 100 | ties a muscle fibre's filaments to its membrane: what Duchenne muscular dystrophy lacks | 427000
capsid-protein | coat protein (typical) | Biomolecules/Proteins/Viral | blend: protein 100 | the unit a virus's shell is built of | 30000
tmv-coat | TMV coat protein | Biomolecules/Proteins/Viral | blend: protein 100 | 2,130 of them wind a helix round tobacco mosaic virus's RNA | 17500
gp8 | M13 major coat protein (gp8) | Biomolecules/Proteins/Viral | blend: protein 100 | about 2,700 of them sheathe the M13 phage, the one grown into battery wires (Belcher, 2009) | 5200
rubisco | RuBisCO | Biomolecules/Proteins/Enzymes | blend: protein 100 | the enzyme that fixes CO₂ from the air: perhaps the most abundant protein on Earth | 550000
photosystem | photosystem II | Biomolecules/Proteins/Photosynthesis | blend: protein 90, chlorophyll 10 | splits water with light and gives off oxygen (a dimer, with its chlorophylls) | 700000
starch | starch | Biomolecules/Sugars | C6H10O5 | plants' stored glucose, as its unit
sucrose | sucrose | Biomolecules/Sugars | C12H22O11 | table sugar: glucose and fructose joined; what a plant moves in its sap
lignin | lignin | Biomolecules/Polymers | C10H12O3 | the rigid glue of wood, as its coniferyl-alcohol unit (approximate)
hemicellulose | hemicellulose | Biomolecules/Sugars | C5H8O4 | branched sugar chains between cellulose fibres, as xylose
pectin | pectin | Biomolecules/Sugars | C6H8O6 | the gel between plant cells, as galacturonic acid; jam is set with it
carotene | β-carotene | Biomolecules/Pigments | C40H56 | the orange of carrots: it gathers light for photosynthesis
archaeol | archaeol | Biomolecules/Lipids | C43H88O3 | the lipid of archaea: ether-linked branched chains, which stand boiling and acid
photopsin | photopsin (cone opsin) | Biomolecules/Proteins/Receptors | blend: protein 99.3, retinal 0.7 | the light receptor of cones: L, M and S kinds, for red, green and blue | 40000
vgat | vesicular GABA transporter | Biomolecules/Proteins/Synapse | blend: protein 100 | loads GABA into an inhibitory vesicle | 57000
gephyrin | gephyrin | Biomolecules/Proteins/Synapse | blend: protein 100 | the scaffold under an inhibitory synapse's receptors | 93000
protamine | protamine | Biomolecules/Proteins/Chromatin | blend: protein 100 | packs a sperm's DNA six times tighter than histones do | 5100
serca | SERCA pump | Biomolecules/Proteins/Pumps and channels | blend: protein 100 | pumps calcium back into the sarcoplasmic reticulum, two Ca²⁺ an ATP: what lets a muscle relax | 110000
fructose | fructose | Biomolecules/Sugars | C6H12O6 | fruit sugar: glucose's isomer, sweeter
trehalose | trehalose | Biomolecules/Sugars | C12H22O11 | a sugar that glasses and keeps cells alive dried out (brine shrimp, resurrection plants)
suberin | suberin | Biomolecules/Polymers | C22H42O4 | the waxy polyester of cork and bark, as an ω-hydroxy acid unit (approximate)
tannin | tannic acid | Biomolecules/Small molecules | C76H52O46 | the bitter polyphenol of bark and oak galls: leather is tanned with it
cytochrome-c | cytochrome c | Biomolecules/Proteins/Carriers | blend: protein 95, heme 5 | a small haem protein that carries electrons: Geobacter's wires are chains of such haems | 12500
pfu-polymerase | Pfu DNA polymerase | Biomolecules/Proteins/Tools | blend: protein 100 | from Pyrococcus furiosus, which lives at 100 °C: copies DNA with proofreading, ten times fewer errors than Taq | 90000
channelrhodopsin | channelrhodopsin-2 | Biomolecules/Proteins/Tools | blend: protein 99.6, retinal 0.4 | a light-gated channel from Chlamydomonas: put in a neuron, blue light fires it (optogenetics) | 77000
spike-protein | SARS-CoV-2 spike (trimer) | Biomolecules/Proteins/Viral | blend: protein 85, glucose 15 | the virus's key to ACE2: the protein mRNA vaccines teach the body (sugar-coated, a trimer) | 600000
aequorin | aequorin | Biomolecules/Proteins/Tools | blend: protein 100 | the jellyfish's calcium-lit photoprotein: its blue light is what GFP turns green | 22000
dsup | Dsup | Biomolecules/Proteins/Tools | blend: protein 100 | the tardigrade's damage-suppressor: it shields DNA from X-rays (Hashimoto et al. 2016) | 50000
cahs | CAHS protein | Biomolecules/Proteins/Tools | blend: protein 100 | tardigrade proteins that turn to gel as it dries, holding its cells intact | 25000
// ---- matrices and mixes of life -----------------------------------------------------------------------------------
peptidoglycan | peptidoglycan | Biomolecules/Walls | blend: chitin 35, C11H17NO7 35, protein 30 | the bacterial wall: sugar chains cross-linked by short peptides
lipopolysaccharide | lipopolysaccharide | Biomolecules/Walls | blend: glucose 50, triglyceride 40, sodium-phosphate 10 | the outer membrane's sugar coat (endotoxin); approximate
mycelium | mycelium | Biomolecules/Walls | blend: chitin 40, beta-glucan 40, protein 20 | fungal threads: grown into packaging, leather and bricks
nacre | nacre | Biomolecules/Biominerals | blend: aragonite 95, protein 5 | mother of pearl: tablets of aragonite glued by protein, 3000 times tougher than aragonite alone
bone-matrix | bone matrix | Biomolecules/Matrices | blend: hydroxyapatite 57, collagen 28, water 15 | bone's mineralised collagen, by mass: mineral about 57 % (typical; ICRU 46 compact bone is 22.5 % calcium)
cartilage-matrix | cartilage matrix | Biomolecules/Matrices | blend: water 75, collagen 15, chondroitin-sulfate 10 | collagen II holding water by its sulfated sugars
enamel | tooth enamel | Biomolecules/Matrices | blend: hydroxyapatite 96, water 3, protein 1 | the hardest tissue of the body
dentin | dentine | Biomolecules/Matrices | blend: hydroxyapatite 70, collagen 20, water 10 | the bulk of a tooth
synovial-fluid | synovial fluid | Biomolecules/Fluids | blend: water 97, hyaluronic-acid 0.3, albumin 2.5, glucose 0.2 | lubricates joints
cerebrospinal-fluid | cerebrospinal fluid | Biomolecules/Fluids | blend: water 99.14, nacl 0.75, glucose 0.06, albumin 0.03, kcl 0.02 | bathes and floats the brain (about 150 ml)
cytosol | cytosol | Biomolecules/Fluids | blend: water 79.6, enzyme 15, potassium-phosphate 1.2, kcl 0.1, glycogen 1, rna 2, atp 0.3, glucose 0.2, magnesium-chloride 0.1, sodium-phosphate 0.5 | the cell's fluid: about 17 % protein and RNA, crowded; K⁺ about 140 mmol/l, Cl⁻ about 10
nucleoplasm | nucleoplasm | Biomolecules/Fluids | blend: water 82.3, enzyme 12, rna 4, potassium-phosphate 1.5, kcl 0.2 | the fluid of the nucleus
extracellular-fluid | interstitial fluid | Biomolecules/Fluids | blend: water 98.14, nacl 0.9, sodium-bicarbonate 0.2, glucose 0.1, albumin 0.6, kcl 0.03, calcium-chloride 0.03 | the fluid between cells
membrane-lipids | membrane lipids | Biomolecules/Lipids | blend: phosphatidylcholine 45, phosphatidylethanolamine 20, cholesterol 25, sphingomyelin 10 | a typical plasma membrane's lipids, by mass
myelin-lipids | myelin lipids | Biomolecules/Lipids | blend: cholesterol 40, galactocerebroside 25, phosphatidylethanolamine 20, sphingomyelin 15 | myelin's lipids: rich in cholesterol and cerebroside
fat-droplet | stored fat | Biomolecules/Lipids | blend: triglyceride 99, cholesterol 1 | what an adipocyte holds
bile | bile | Biomolecules/Fluids | blend: water 97, cholic-acid 1.5, phosphatidylcholine 0.5, cholesterol 0.2, bilirubin 0.1, nacl 0.7 | from liver to gut: it breaks fat into droplets
gastric-juice | gastric juice | Biomolecules/Fluids | blend: water 99.4, hydrochloric-acid 0.4, enzyme 0.2 | the stomach's acid and pepsin
urine | urine | Biomolecules/Fluids | blend: water 95.8, urea 2, nacl 1, kcl 0.6, creatine 0.2, sodium-phosphate 0.4 | about 1.5 l a day
saliva | saliva | Biomolecules/Fluids | blend: water 99.5, enzyme 0.3, nacl 0.1, sodium-bicarbonate 0.1 | starts digestion with amylase
sweat | sweat | Biomolecules/Fluids | blend: water 99, nacl 0.8, urea 0.1, lactic-acid 0.1 | cools by evaporating: about 2.4 kJ a gram
bacterial-biomass | bacterial biomass (Gram-negative) | Biomolecules/Biomass | blend: water 70, protein 16.5, rna 6.15, phosphatidylethanolamine 2.73, lipopolysaccharide 1.02, dna 0.93, peptidoglycan 0.75, glycogen 0.75, kcl 1.17 | a growing E. coli's make-up: 70 % water; of its dry mass 55 % protein, 20.5 % RNA, 9.1 % lipid, 3.4 % LPS, 3.1 % DNA, 2.5 % wall, 2.5 % glycogen, 3.9 % small molecules and ions (Neidhardt 1987)
gram-positive-biomass | bacterial biomass (Gram-positive) | Biomolecules/Biomass | blend: water 70, protein 16.5, rna 6.15, phosphatidylethanolamine 1.8, peptidoglycan 3.5, dna 0.93, glycogen 0.5, kcl 0.62 | a Gram-positive's: no outer membrane, a wall of peptidoglycan many layers thick (as E. coli's otherwise, an estimate)
archaeal-biomass | archaeal biomass | Biomolecules/Biomass | blend: water 70, protein 17, rna 6, archaeol 2.5, dna 1, glycogen 0.5, kcl 3 | an archaeon's: ether lipids, a protein wall, and (in salt-lovers) molar potassium inside (an estimate)
fungal-biomass | fungal biomass | Biomolecules/Biomass | blend: water 80, protein 7, chitin 2, beta-glucan 5, glycogen 2, triglyceride 2, rna 1.5, kcl 0.5 | mycelium: hyphae walled with chitin and glucan (typical, an estimate)
yeast-wall | yeast cell wall | Biomolecules/Walls | blend: beta-glucan 55, protein 40, chitin 2, water 3 | β-glucan and mannoproteins, with a little chitin (typical)
plant-wall | plant cell wall | Biomolecules/Walls | blend: cellulose 30, hemicellulose 25, pectin 30, protein 5, water 10 | a growing cell's primary wall: cellulose fibres in hemicellulose and pectin (typical, dry share)
vacuole-sap | vacuole sap | Biomolecules/Fluids | blend: water 97.5, sucrose 1, kcl 1, citric-acid 0.5 | the plant cell's central store of water, salts and sugar
insect-tissue | insect body tissue | Biomolecules/Biomass | blend: water 70, protein 18, triglyceride 7, chitin 3, glycogen 1, kcl 1 | an insect's body: muscle, fat body and cuticle together (typical)
jelly-tissue | jellyfish tissue | Biomolecules/Biomass | blend: water 96, nacl 3, protein 0.7, collagen 0.3 | a jellyfish is about 96 % water: a collagen jelly (mesoglea) between two thin skins
marine-tissue | soft tissue of a shellfish | Biomolecules/Biomass | blend: water 80, protein 12, glycogen 3, triglyceride 2, nacl 3 | a mussel's or snail's flesh (typical)
vertebrate-tissue | small vertebrate body | Biomolecules/Biomass | blend: water 66, protein 18, triglyceride 10, hydroxyapatite 4, glycogen 0.5, kcl 0.8, nacl 0.7 | a small animal's body, bone and all (typical)
honey | honey | Biomolecules/Made by life | blend: fructose 38.5, glucose 34, water 17.2, sucrose 9, protein 0.3, kcl 0.3, citric-acid 0.7 | nectar the bees thicken: fructose 38 %, glucose 31 %, water 17 %, maltose and sucrose (typical, USDA)
beeswax | beeswax | Biomolecules/Made by life | blend: wax-ester 72, C27H56 14, C16H32O2 14 | made by worker bees from glands under their belly: wax esters, hydrocarbons and free acids; melts at 62–64 °C
shellac | shellac | Biomolecules/Made by life | blend: aleuritic-acid 40, C15H20O6 30, C16H22O5 20, wax-ester 5, water 5 | the lac insect's resin: aleuritic, jalaric and shellolic acids (approximate); a varnish and the first records' plastic
latex | rubber latex | Biomolecules/Made by life | blend: polyisoprene 35, water 60, protein 2, triglyceride 2, glucose 1 | tapped from the rubber tree: a third rubber, the rest water (typical)
cotton | cotton fibre | Biomolecules/Made by life | blend: cellulose 88, water 7, pectin 1.2, protein 1.3, wax-ester 0.6, glucose 0.3, kcl 1.6 | the seed hair of the cotton plant: nearly pure cellulose
hemp-fibre | hemp fibre | Biomolecules/Made by life | blend: cellulose 70, hemicellulose 15, lignin 4, pectin 1, water 8, kcl 2 | the bast fibre of hemp: rope, cloth, composites (typical)
flax-fibre | flax (linen) fibre | Biomolecules/Made by life | blend: cellulose 71, hemicellulose 18.6, pectin 2.3, lignin 2.2, wax-ester 1.7, water 4.2 | the stem fibre linen is spun from (typical)
bamboo | bamboo culm | Biomolecules/Made by life | blend: cellulose 45, hemicellulose 25, lignin 22, water 8 | a grass as strong as timber: grows up to about a metre a day (typical)
cork | cork | Biomolecules/Made by life | blend: suberin 40, lignin 22, cellulose 10, hemicellulose 8, wax-ester 5, tannin 6, water 8, kcl 1 | the bark of the cork oak: dead cells walled in suberin, half air (typical)
maize-grain | maize grain | Biomolecules/Made by life | blend: starch 64, protein 9, triglyceride 4, cellulose 2.5, sucrose 2, kcl 1.5, water 17 | corn: its starch is fermented to lactic acid for PLA, the printer's plastic (typical)
sugarcane | sugarcane stalk | Biomolecules/Made by life | blend: sucrose 13, water 72, cellulose 6, hemicellulose 4, lignin 3, glucose 1, kcl 0.5, protein 0.5 | crushed for sugar and fermented to ethanol (typical)
fruit-body | mushroom flesh | Biomolecules/Biomass | blend: water 92, protein 3, chitin 1.5, beta-glucan 1.5, glucose 1, triglyceride 0.3, kcl 0.7 | a mushroom is about 92 % water (typical)
plasma | blood plasma | Biomolecules/Fluids | blend: water 91.5, albumin 4.2, immunoglobulin 1.2, protein 1.0, fibrinogen 0.3, plasma-solutes 1.2, triglyceride 0.15, cholesterol 0.2, phosphatidylcholine 0.25 | blood's fluid: albumin 35–50 g/l, globulins, fibrinogen 2–4 g/l, salts (Na⁺ 135–145 mmol/l), glucose and lipids (reference ranges)
sarcoplasm | sarcoplasm | Biomolecules/Fluids | blend: water 85.1, enzyme 12, potassium-phosphate 1.2, kcl 0.1, creatine 0.6, atp 0.5, magnesium-chloride 0.1, sodium-phosphate 0.4 | a muscle fibre's cytoplasm: glycolytic enzymes, K⁺, and creatine for quick ATP
plasma-solutes | plasma salts and solutes | Biomolecules/Fluids | blend: nacl 60, sodium-bicarbonate 20, glucose 8, kcl 3, calcium-chloride 2, urea 4, magnesium-chloride 1, sodium-phosphate 2 | the 1 % of plasma that is neither water nor protein
`);

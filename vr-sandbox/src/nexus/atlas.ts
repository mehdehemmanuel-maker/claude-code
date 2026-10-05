// The build domain manifold: every field a build can be of, as a graph, not a tree. A domain is a view: a name over a
// set of terms, and a term is one node however many domains name it (a battery is the same node in electrical,
// chemical and energy). What joins terms across domains is first-class and has a reason each time:
//
//   shares     a term two domains both name: the domains meet in it
//   involves   what a term is about physically, read from its words: charge, momentum, heat, light, information,
//              matter, life, fluid, field, space, time. These carriers are the cross-domain layer: two terms of any
//              two domains that involve the same carrier exchange it, and every domain reaches every other through them
//   grounded   how far Nexus has made it, from the census (src/nexus/census.ts), never from a claim: built directly
//              from an ask, made as a part of something built, or a gap
//   calls      what a real build of it called, from its execution graph: the decision that called it and its law
//
// The terms are the ones the person set out (2026-10-05); the carriers each term involves are read from its words by
// the stems below, a reading of the vocabulary and said to be one. Nothing here claims Nexus can build a term: only
// the census grounds one.

export interface Domain { id: string; name: string; terms: string[] }
export type Carrier = 'energy' | 'charge' | 'momentum' | 'heat' | 'light' | 'information' | 'matter' | 'life' | 'fluid' | 'field' | 'space' | 'time';
export interface Term { id: string; name: string; domains: string[]; involves: Carrier[]; grounded: Grounding; calls: Call[] }
export interface Grounding { how: 'built' | 'part' | 'gap'; by: string }
export interface Call { to: string; law: string; via: string }
export interface Relation { from: string; to: string; kind: 'shares' | 'involves' | 'calls' | 'in'; because: string }
export interface Atlas { domains: Domain[]; terms: Term[]; relations: Relation[] }

const D = (id: string, name: string, terms: string): Domain => ({ id, name, terms: terms.split(',').map((t) => t.trim()).filter(Boolean) });
export const DOMAINS: Domain[] = [
  D('mechanical', 'Mechanical', 'mechanisms, structures, machines, fasteners, joints, bearings, gears, transmissions, actuators, hydraulics, pneumatics, springs, linkages, robotics, manipulators, tools, manufacturing machinery, vehicles, industrial machinery'),
  D('electrical', 'Electrical / electronics', 'power, batteries, generators, motors, circuits, wiring, conductors, semiconductors, transistors, diodes, capacitors, inductors, resistors, sensors, actuators, converters, controllers, PCBs, power electronics, RF, antennas, communications, embedded systems'),
  D('computing', 'Computing', 'processors, memory, storage, computers, servers, GPUs, accelerators, embedded computers, operating systems, runtimes, compilers, programming languages, algorithms, data structures, networks, distributed systems, AI systems, autonomous systems, simulation systems, quantum computing'),
  D('software', 'Software / digital worlds', 'applications, interfaces, APIs, protocols, operating environments, agents, simulations, virtual environments, digital twins, procedural worlds, game engines, visualization, databases, knowledge systems, generative systems'),
  D('automotive', 'Automotive', 'cars, trucks, motorcycles, buses, trains, drivetrains, engines, EV systems, suspension, steering, braking, wheels, tires, chassis, body structures, vehicle electronics, autonomous driving, vehicle software'),
  D('aerospace', 'Aircraft / aerospace', 'airplanes, helicopters, drones, VTOL, gliders, propulsion, wings, control surfaces, avionics, navigation, flight control, airframes, turbines, jet engines, electric propulsion'),
  D('spacecraft', 'Spacecraft', 'rockets, launch vehicles, spacecraft, satellites, probes, rovers, landers, orbital systems, propulsion, guidance, thermal protection, life support, radiation protection, space robotics, docking, orbital infrastructure, habitats'),
  D('biological', 'Biological', 'cells, tissues, organs, organisms, plants, animals, microbes, viruses, biological structures, metabolism, signaling, genetics, development, regeneration, biological materials, neural systems, ecosystems, synthetic biology'),
  D('medical', 'Medical / bioengineering', 'prosthetics, implants, surgical systems, diagnostic devices, medical robotics, drug delivery, tissue engineering, artificial organs, neural interfaces, biosensors, rehabilitation systems, laboratory systems'),
  D('chemical', 'Chemical', 'molecules, reactions, synthesis, catalysts, solvents, polymers, fuels, batteries, pharmaceuticals, coatings, adhesives, materials processing, electrochemistry, biochemical systems'),
  D('materials', 'Materials', 'metals, ceramics, polymers, composites, glass, crystals, semiconductors, superconductors, biomaterials, nanomaterials, metamaterials, foams, fibers, coatings, alloys, microstructures, molecular structures'),
  D('energy', 'Energy', 'generation, storage, conversion, transmission, batteries, fuel cells, solar, nuclear, thermal, mechanical, electromagnetic, chemical, electrical, energy harvesting, power grids'),
  D('robotics', 'Robotics', 'robotic arms, hands, grippers, legs, wheels, drones, mobile robots, humanoids, autonomous machines, sensors, perception, control, manipulation, locomotion, tool use, self-repair, self-fabrication'),
  D('manufacturing', 'Manufacturing / fabrication', '3D printing, CNC, machining, casting, molding, forging, welding, laser processing, semiconductor fabrication, lithography, deposition, etching, assembly, microfabrication, nanofabrication, biological fabrication'),
  D('architecture', 'Architecture / construction', 'buildings, bridges, roads, tunnels, towers, habitats, structural systems, foundations, HVAC, plumbing, electrical infrastructure, elevators, environmental systems, smart buildings'),
  D('spatial', 'Spatial / environmental systems', 'rooms, terrain, cities, infrastructure, landscapes, oceans, atmosphere, underground, underwater, planetary environments, controlled environments, factories, laboratories'),
  D('xr', 'Virtual / augmented / mixed reality', 'VR, AR, MR, spatial computing, tracking, controllers, hand tracking, eye tracking, haptics, spatial audio, holographic interfaces, digital twins, embodied agents, shared virtual environments'),
  D('human', 'Human / ergonomic systems', 'human-machine interfaces, accessibility, ergonomics, biomechanics, perception, cognition, controls, reach, visibility, comfort, safety, human factors'),
  D('communication', 'Communication', 'Bluetooth, Wi-Fi, Ethernet, cellular, radio, optical communication, satellite communication, networking, protocols, addressing, synchronization, signaling'),
  D('control', 'Control / autonomy', 'feedback, sensors, controllers, planning, stabilization, navigation, regulation, adaptive control, autonomous behavior, multi-agent systems, learning systems'),
  D('fluid', 'Fluid / thermal', 'fluids, gases, liquids, flow, pressure, turbulence, heat transfer, cooling, combustion, phase transitions, refrigeration, thermal management'),
  D('optical', 'Optical / photonic', 'lenses, mirrors, cameras, lasers, fiber optics, sensors, displays, photonic circuits, imaging, spectroscopy, optical communication'),
  D('acoustic', 'Acoustic / vibration', 'sound, waves, resonance, vibration, damping, acoustic structures, microphones, speakers, ultrasonic systems'),
  D('agricultural', 'Agricultural / ecological', 'plants, crops, soil, irrigation, greenhouses, biological production, ecosystems, environmental control, food systems'),
  D('ocean', 'Ocean / underwater', 'submarines, underwater robots, marine vehicles, buoyancy, hydrodynamics, pressure systems, diving systems, underwater communication, marine structures'),
  D('earth', 'Earth / planetary', 'geology, minerals, atmosphere, weather, climate, oceans, terrain, planetary processes, resource systems'),
  D('cosmic', 'Astronomical / cosmic', 'planets, moons, stars, galaxies, black holes, plasma, orbital systems, stellar systems, large-scale structures'),
  D('micro', 'Micro / nano', 'MEMS, microfluidics, nanostructures, nanomaterials, microelectronics, nanoscale mechanics, molecular machines, atomic-scale structures'),
  D('information', 'Information / knowledge', 'data, information, representations, models, laws, relationships, knowledge structures, semantic systems, causal graphs, generative manifolds'),
  D('safety', 'Safety / reliability', 'failure modes, redundancy, fault tolerance, containment, protection, monitoring, recovery, verification, validation, testing'),
  D('self', 'Self-building / self-modifying systems', 'self-fabrication, self-assembly, self-repair, self-programming, self-calibration, self-testing, self-optimization, tool creation, machine creation, recursive construction'),
  D('universal', 'Universal / cross-domain', 'interfaces, transformations, flows, networks, fields, feedback, control, energy transfer, information transfer, material transformation, assembly, decomposition, emergence, scaling, geometry, topology, time, observation, causality, constraints, optimization, adaptation, interaction, communication, computation, manufacturing'),
];

/** A term as one node: lower case, its plural made singular where English does so plainly. */
const KEEP = /(ics|ss|us|is|data|series|species)$/;
export function termId(name: string): string {
  const w = name.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim();
  return w.split(' ').map((p, i, a) => {
    if (i !== a.length - 1 || p.length < 4 || KEEP.test(p)) return p;
    if (p.endsWith('ies')) return `${p.slice(0, -3)}y`;
    if (/(s|x|z|ch|sh)es$/.test(p)) return p.slice(0, -2);
    if (p.endsWith('s') && !p.endsWith('ss')) return p.slice(0, -1);
    return p;
  }).join(' ');
}

/** What a term is about physically, by its words: the stems that name each carrier. A reading, not a law. */
const STEMS: Record<Carrier, RegExp> = {
  energy: /energ|power|generat|conver|harvest|fuel|batter|solar|nuclear|engine|turbine|propuls|combust|grid|transmission|storage|motor|generation/,
  charge: /electr|batter|generator|motor|circuit|wiring|conductor|semiconductor|transistor|diode|capacitor|inductor|resistor|converter|pcb|\bev\b|superconduct|fuel cell|solar|grid|embedded|microelectronic|power/,
  momentum: /mechan|structur|machine|fasten|joint|bearing|gear|transmission|actuator|hydraulic|pneumatic|spring|linkage|manipulat|tool|vehicle|\bcar\b|truck|motorcycle|bus\b|train|wheel|tire|chassis|suspension|steering|brak|leg|locomotion|gripper|hand|arm\b|robot|wing|airframe|rocket|propuls|drivetrain|engine|turbine|bridge|tower|foundation|elevator|vibration|wave|resonance|damping|biomechanic|docking|lander|rover|drone|helicopter|airplane|glider|vtol|submarine|launch|haptic|controller|surface|road|tunnel|building|craft|probe|sound|speaker|ultrason|acoust|microphone|mems|interaction/,
  heat: /therm|heat|cool|combust|refrigerat|hvac|engine|turbine|phase|fuel|nuclear|climate|weather|star\b|stellar/,
  light: /optic|photon|lens|mirror|camera|laser|fiber|display|imaging|spectro|solar|holograph|eye|lithograph|visib|vr\b|ar\b|mr\b|star|galax/,
  information: /data|inform|signal|sensor|communicat|protocol|network|software|comput|processor|memory|storage|server|gpu|accelerator|algorithm|program|compiler|runtime|operating|api|interface|database|knowledge|\bai\b|agent|autonom|navigation|avionic|guidance|control|feedback|planning|learning|tracking|synchroniz|address|bluetooth|wi-fi|ethernet|cellular|radio|\brf\b|antenna|semantic|model|simulat|visualiz|twin|game|causal|verification|validation|testing|monitor|perception|cognition|representation|law|relationship|manifold|generative|application|digital|virtual|world|genetic|neural|diagnos|smart|self-programming|self-calibration|self-testing|distributed|optimiz|observ|redundan|fault|recursive/,
  matter: /material|metal|ceramic|polymer|composite|glass|crystal|alloy|fiber|foam|coating|adhesive|molecul|reaction|synthesis|catalyst|solvent|fuel|pharmac|mineral|geolog|soil|cast|mold|forg|weld|machining|cnc|print|deposition|etch|fabricat|assembl|microstructure|nano|chemi|electrochem|resource|biomaterial|metamaterial|drug|transformation|decomposition|containment|batter|manufactur|repair|construct|mems/,
  life: /cell|tissue|organ\b|organs|organism|plant|animal|microbe|virus|metabol|genetic|development|regenerat|neural|ecosystem|biolog|\bbio|crop|food|prosthet|implant|medical|surgical|drug|human|cognition|perception|ergonom|comfort|rehabilit|greenhouse|life support|accessib|reach|safety|agricult/,
  fluid: /fluid|gas|liquid|flow|pressure|turbulen|hydraul|pneumat|plumbing|irrigation|ocean|atmospher|weather|underwater|buoyan|hydrodynam|microfluid|submarine|diving|marine|cooling|refrigerat|hvac|wing|propuls|jet|aero/,
  field: /magnet|electromagnet|\brf\b|antenna|radio|field|orbit|gravit|planet|moon|star|galax|black hole|plasma|radiation|nuclear|satellite|cellular|wi-fi|bluetooth|wave/,
  space: /geometr|topolog|scal|spatial|position|room|terrain|cit(y|ies)|landscape|workspace|clearance|underground|environment|infrastructure|habitat|laborator|factor(y|ies)|reach|large-scale|planetary|tracking|navigation|interior|structure/,
  time: /\btime|synchroniz|timing|schedul|feedback|regulation|stabiliz|dynamic|development|regenerat|emergence|adaptation|learning|recovery|weather|climate|wear|failure|fault|redundan|protect|reliab/,
};
export const involves = (name: string): Carrier[] => (Object.keys(STEMS) as Carrier[]).filter((c) => STEMS[c].test(` ${name.toLowerCase()} ${termId(name)} `));

/** The atlas, with what the census found folded in: each term's grounding and the calls its builds made. */
export function atlasOf(census?: { term: string; how: 'built' | 'part'; by: string; calls?: Call[] }[]): Atlas {
  const terms = new Map<string, Term>();
  for (const d of DOMAINS) for (const name of d.terms) {
    const id = termId(name), t = terms.get(id);
    if (t) { if (!t.domains.includes(d.id)) t.domains.push(d.id); } else terms.set(id, { id, name, domains: [d.id], involves: involves(name), grounded: { how: 'gap', by: 'no build of it yet, and no build made it as a part' }, calls: [] });
  }
  for (const c of census ?? []) {
    const t = terms.get(c.term); if (!t) continue;
    if (t.grounded.how === 'gap' || (c.how === 'built' && t.grounded.how === 'part')) t.grounded = { how: c.how, by: c.by };
    for (const k of c.calls ?? []) if (!t.calls.some((x) => x.to === k.to)) t.calls.push(k);
  }
  const relations: Relation[] = [];
  for (const t of terms.values()) {
    for (const d of t.domains) relations.push({ from: `domain:${d}`, to: t.id, kind: 'in', because: `${DOMAINS.find((x) => x.id === d)!.name} names it` });
    if (t.domains.length > 1) for (let i = 0; i < t.domains.length; i++) for (let j = i + 1; j < t.domains.length; j++) relations.push({ from: `domain:${t.domains[i]}`, to: `domain:${t.domains[j]}`, kind: 'shares', because: `both name ${t.name}` });
    for (const c of t.involves) relations.push({ from: t.id, to: `carrier:${c}`, kind: 'involves', because: `${t.name} is about ${c}, by its words` });
    for (const k of t.calls) relations.push({ from: t.id, to: k.to, kind: 'calls', because: `${k.via}: ${k.law}` });
  }
  return { domains: DOMAINS, terms: [...terms.values()], relations };
}

/** What a term reaches: its domains, the carriers it involves, and through them every term of another domain that exchanges the same; and what it calls. */
export function reach(a: Atlas, id: string): { term: Term; domains: string[]; carriers: Carrier[]; acrossDomains: { carrier: Carrier; terms: string[] }[]; calls: Call[] } | null {
  const t = a.terms.find((x) => x.id === id || x.id === termId(id)); if (!t) return null;
  const across = t.involves.map((c) => ({ carrier: c, terms: a.terms.filter((o) => o.id !== t.id && o.involves.includes(c) && !o.domains.some((d) => t.domains.includes(d))).map((o) => o.name) }));
  return { term: t, domains: t.domains, carriers: t.involves, acrossDomains: across, calls: t.calls };
}

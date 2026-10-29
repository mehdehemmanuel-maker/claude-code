// The engineering disciplines as a tree: discipline, branch, specialty (docs/REALITY.md step K: nodes classified and named
// as the disciplines name things). Each discipline is organised after the professional body that divides it (its
// institutes, divisions, societies or technical committees), and a process family after the standard that names it; that
// body is said on the discipline (`after`). Compiled from those bodies' published structures as they are generally
// given, not copied from any one list: an organisation of the field, labelled so, to be corrected where a body divides
// it otherwise. Written as an indented outline (two spaces a level): an id, then its name; "|" and what it is after.

const OUTLINE = `
civil Civil engineering | ASCE's institutes (SEI, Geo-Institute, T&DI, EWRI, COPRI, CI, UESI, AEI) and technical divisions
  structural Structural engineering
    analysis Structural analysis (static, dynamic, stability)
    steel Steel structures
    concrete Reinforced and prestressed concrete structures
    timber Timber structures
    masonry Masonry structures
    composite Composite and hybrid structures
    bridge Bridge engineering
    tall Tall buildings and long-span structures
    seismic Earthquake engineering
    wind Wind engineering
    shm Structural health monitoring
  geotechnical Geotechnical engineering
    soil Soil mechanics
    rock Rock mechanics
    foundation Foundation engineering (shallow and deep)
    retention Slope stability and earth retention
    improvement Ground improvement
    geoseismic Geotechnical earthquake engineering
    underground Tunnelling and underground construction
  transportation Transportation engineering
    highway Highway geometric design
    pavement Pavement engineering
    traffic Traffic engineering and operations
    rail Railway engineering
    airport Airport engineering
    transit Public transport systems
    planning Transportation planning and demand modelling
    its Intelligent transportation systems
  water Water resources engineering
    hydrology Hydrology
    hydraulics Hydraulics (open-channel and pressurised flow)
    supply Water supply and distribution networks
    stormwater Stormwater management and urban drainage
    flood Flood risk management
    irrigation Irrigation and land drainage
    dams Dams and reservoirs
  environmental Environmental engineering
    treatment Water and wastewater treatment
    air Air quality engineering
    waste Solid and hazardous waste management
    remediation Contaminated land remediation
    eia Environmental impact assessment
  coastal Coastal, ocean and port engineering
    processes Coastal processes and sediment transport
    ports Ports and harbours
    offshore Offshore structures
    protection Coastal protection works
  construction Construction engineering and management
    management Project and construction management
    estimating Cost estimating
    scheduling Scheduling (critical path)
    methods Construction methods and temporary works
    bim Building information modelling
  geomatics Geomatics engineering
    surveying Land and engineering surveying
    geodesy Geodesy
    remote Photogrammetry and remote sensing
    gis Geographic information systems
  urban Urban and land development engineering
    planning Urban planning and zoning
    site Site development, grading and earthworks
    landscape Landscape engineering
    municipal Municipal infrastructure
  architectural Architectural (building) engineering
    envelope Building envelope and building physics
    services Building services (mechanical, electrical, plumbing)
    lighting Lighting engineering
    acoustics Architectural acoustics
    fire Fire protection engineering
  utility Utility and pipeline engineering
    pipelines Pipelines
    networks Utility networks
    trenchless Trenchless construction

mechanical Mechanical engineering | ASME's technical divisions
  solid Solid mechanics
    elasticity Elasticity
    plasticity Plasticity
    fracture Fracture mechanics
    fatigue Fatigue
    contact Contact mechanics
    dynamics Structural dynamics and vibration
    fea Finite element analysis
  design Machine design
    elements Machine elements (shafts, bearings, gears, fasteners, springs, seals)
    mechanisms Mechanisms and kinematics
    tribology Tribology (friction, wear, lubrication)
    dfm Design for manufacture and assembly
    tolerancing Dimensioning and tolerancing (GD&T)
    reliability Mechanical reliability
    cad Computer-aided design and geometric modelling
  thermofluids Thermal and fluid sciences
    thermodynamics Engineering thermodynamics
    conduction Conduction heat transfer
    convection Convection heat transfer
    radiation Radiation heat transfer
    fluids Fluid mechanics
    cfd Computational fluid dynamics
    multiphase Multiphase flow
  hvac Heating, ventilation, air conditioning and refrigeration
    loads Heating and cooling loads
    psychrometrics Psychrometrics
    refrigeration Refrigeration cycles
    distribution Air and water distribution
  conversion Energy conversion machinery
    ice Internal combustion engines
    turbines Gas and steam turbines
    turbomachinery Turbomachinery (pumps, fans, compressors)
    combustion Combustion
  pressure Pressure vessels and piping
    vessels Pressure vessel design
    piping Piping systems and flexibility
    integrity Fitness for service
  acoustics Acoustics and noise control
  mechatronics Mechatronics and dynamic systems

electrical Electrical engineering | IEEE's societies (PES, PELS, IAS, APS, SPS, ComSoc, IMS)
  power Power systems
    generation Generation
    transmission Transmission
    distribution Distribution
    protection Protection and switchgear
    quality Power quality
    grid Smart grids and grid integration
  powerelectronics Power electronics
    converters DC-DC converters
    inverters Inverters and rectifiers
    drives Motor drives
  machines Electric machines
    motors Motors
    generators Generators
    transformers Transformers
  electromagnetics Electromagnetics
    antennas Antennas and propagation
    rf Microwave and RF engineering
    emc Electromagnetic compatibility
  signals Signal processing
    dsp Digital signal processing
    estimation Statistical signal processing and estimation
    image Image and video processing
  communications Communications
    wireless Wireless communications
    optical Optical communications
    networks Communication networks
  instrumentation Instrumentation and measurement
  wiring Electrical installations and wiring

electronics Electronic and computer engineering | IEEE's Circuits and Systems, Electron Devices, Solid-State Circuits and Computer societies
  circuits Circuit design
    analog Analog circuits
    digital Digital logic
    mixed Mixed-signal circuits
  devices Semiconductor devices
    physics Device physics
    process Fabrication process
  vlsi Integrated circuit (VLSI) design
    logic Logic synthesis
    physical Physical design (placement and routing)
    verification Design verification
  architecture Computer architecture
    processors Processor microarchitecture
    memory Memory systems
  embedded Embedded systems
    microcontrollers Microcontrollers
    firmware Firmware
    rtos Real-time operating systems
  packaging Electronic packaging and printed circuit boards
    pcb Printed circuit board design
    thermal Electronics thermal management
    interconnect Interconnects and connectors
  sensors Sensors, transducers and MEMS
  photonics Photonics and optoelectronics

controls Control and robotics engineering | IEEE's Control Systems and Robotics and Automation societies; IFAC's technical committees
  theory Control theory
    classical Classical control (frequency domain)
    statespace State-space control
    optimal Optimal control
    robust Robust control
    adaptive Adaptive control
    nonlinear Nonlinear control
    mpc Model predictive control
  estimation System identification and state estimation
  robotics Robotics
    kinematics Robot kinematics
    dynamics Robot dynamics
    planning Motion planning
    manipulation Manipulation and grasping
    mobile Mobile robotics
    perception Robot perception
    hri Human-robot interaction
  automation Industrial automation
    plc Programmable logic control
    networks Industrial networks
    scada Supervisory control (SCADA)

chemical Chemical and process engineering | AIChE's divisions
  transport Transport phenomena (momentum, heat and mass transfer)
  thermodynamics Chemical thermodynamics and phase equilibria
  reaction Chemical reaction engineering and catalysis
  separation Separation processes
    distillation Distillation
    absorption Absorption and stripping
    extraction Liquid-liquid extraction
    membranes Membrane separations
    crystallisation Crystallisation
    adsorption Adsorption
  process Process design and control
    design Process design and simulation
    control Process control
    safety Process safety (hazard analysis)
  particles Particle technology
  polymer Polymer engineering
  electrochemical Electrochemical engineering (cells, batteries, electrolysis, corrosion)
  biochemical Biochemical engineering

materials Materials science and engineering | TMS, ASM International and MRS
  metals Metallurgy
    physical Physical metallurgy (phases, heat treatment)
    mechanical Mechanical metallurgy
    extractive Extractive metallurgy
  ceramics Ceramics and glasses
  polymers Polymers and elastomers
  composites Composite materials
  functional Electronic, magnetic and optical materials
  biomaterials Biomaterials
  characterisation Materials characterisation
    microscopy Microscopy
    diffraction Diffraction
    spectroscopy Spectroscopy
    testing Mechanical testing
  degradation Corrosion and degradation
  computational Computational materials (first principles, CALPHAD, molecular dynamics)

manufacturing Manufacturing and industrial engineering | SME and IISE; additive processes by ISO/ASTM 52900
  subtractive Subtractive processes (machining)
    turning Turning
    milling Milling
    drilling Drilling and boring
    grinding Grinding and abrasive machining
    edm Electrical discharge machining
  forming Forming
    forging Forging
    rolling Rolling
    extrusion Extrusion and drawing
    sheet Sheet metal forming
  casting Casting and moulding
    sand Sand casting
    die Die casting
    investment Investment casting
    injection Injection moulding
  joining Joining
    welding Welding
    brazing Brazing and soldering
    adhesive Adhesive bonding
    fastening Mechanical fastening
  additive Additive manufacturing
    pbf Powder bed fusion
    ded Directed energy deposition
    mex Material extrusion
    mjt Material jetting
    bjt Binder jetting
    vpp Vat photopolymerisation
    shl Sheet lamination
  surface Surface engineering and finishing
  metrology Metrology and quality
    inspection Dimensional inspection
    spc Statistical process control
  industrial Industrial engineering
    or Operations research
    production Production planning and scheduling
    layout Facility layout and material handling
    ergonomics Human factors and ergonomics
    supply Supply chain engineering
    lean Lean manufacturing
    maintenance Reliability and maintenance engineering
  cost Manufacturing cost engineering

aerospace Aerospace engineering | AIAA's technical committees
  aerodynamics Aerodynamics
    subsonic Subsonic aerodynamics
    compressible Transonic and supersonic aerodynamics
    hypersonic Hypersonics
  propulsion Propulsion
    airbreathing Air-breathing propulsion
    rocket Rocket propulsion
    electric Electric propulsion
  flight Flight mechanics, stability and control
  structures Aerospace structures and aeroelasticity
  astrodynamics Astrodynamics and orbital mechanics
  spacecraft Spacecraft systems
  avionics Avionics

vehicle Vehicle engineering | SAE International's technical areas
  powertrain Powertrain
    engines Engines
    transmissions Transmissions and drivelines
    electrified Electrified powertrains
  chassis Chassis
    suspension Suspension
    steering Steering
    brakes Braking
    tyres Tyres and wheels
  dynamics Vehicle dynamics
  body Body structures and crashworthiness
  nvh Noise, vibration and harshness
  electrical Vehicle electrical and electronic systems
  automated Driver assistance and automated driving
  rail Rail vehicles
  offroad Off-road and agricultural machinery

marine Marine engineering and naval architecture | SNAME
  hydrostatics Hydrostatics and stability
  resistance Resistance and propulsion
  seakeeping Seakeeping and manoeuvring
  structures Ship structures
  machinery Marine machinery
  offshore Offshore engineering

energy Energy engineering | IEA's technology areas, ASES and AWEA divisions
  solar Solar energy
    pv Photovoltaics
    thermal Solar thermal
  wind Wind energy
  hydro Hydropower and marine energy
  geothermal Geothermal energy
  bioenergy Bioenergy
  storage Energy storage
    batteries Batteries
    hydrogen Hydrogen and fuel cells
    thermal Thermal storage
  systems Energy systems and efficiency

nuclear Nuclear engineering | ANS's divisions
  reactor Reactor physics
  thermalhydraulics Reactor thermal hydraulics
  materials Nuclear materials
  fuel Fuel cycle and waste management
  radiation Radiation protection and shielding
  fusion Fusion engineering

biomedical Biomedical engineering | BMES's areas
  biomechanics Biomechanics
  biomaterials Biomaterials and tissue engineering
  imaging Biomedical imaging
  instrumentation Bioinstrumentation
  devices Medical devices
  neural Neural engineering
  rehabilitation Rehabilitation engineering

systems Systems and software engineering | INCOSE's handbook; ACM CCS 2012 for computing
  requirements Requirements engineering
  architecture System architecture and model-based systems engineering
  vv Verification and validation
  safety Safety and reliability engineering
    fmea Failure modes and effects analysis
    fta Fault tree analysis
  software Software engineering
    design Software design
    testing Software testing
    data Data engineering

earth Mining, petroleum and geological engineering | SME (mining) and SPE
  mining Mining engineering
    surface Surface mining
    underground Underground mining
    processing Mineral processing
  petroleum Petroleum engineering
    reservoir Reservoir engineering
    drilling Drilling engineering
    production Production engineering
  geological Geological engineering

agricultural Agricultural and biosystems engineering | ASABE's technical communities
  machinery Agricultural machinery
  soilwater Soil and water engineering
  food Food process engineering
  structures Agricultural structures and environment
`;

export interface Discipline { id: string; name: string; after?: string; sub: Discipline[] }

/** The tree, read from the outline once. Ids are the path from the discipline down (`civil.transportation.rail`). */
export const DISCIPLINES: Discipline[] = (() => {
  const roots: Discipline[] = [], stack: { depth: number; d: Discipline }[] = [];
  for (const line of OUTLINE.split('\n')) {
    if (!line.trim()) continue;
    const depth = (line.length - line.trimStart().length) / 2, [head, after] = line.trim().split(' | '), sp = head!.indexOf(' ');
    while (stack.length && stack[stack.length - 1]!.depth >= depth) stack.pop();
    const up = stack[stack.length - 1]?.d, d: Discipline = { id: (up ? `${up.id}.` : '') + head!.slice(0, sp), name: head!.slice(sp + 1), ...(after ? { after } : {}), sub: [] };
    (up ? up.sub : roots).push(d); stack.push({ depth, d });
  }
  return roots;
})();

/** Every discipline, branch and specialty by its id. */
export const DISCIPLINE: Map<string, Discipline> = new Map();
const walk = (d: Discipline) => { DISCIPLINE.set(d.id, d); d.sub.forEach(walk); }; DISCIPLINES.forEach(walk);

/** The library's fields (`DOMAINS` in blocks.ts) and the disciplines each reaches into. */
export const FIELD_DISCIPLINES: Record<string, string[]> = {
  mechanical: ['mechanical'], structural: ['civil'], electrical: ['electrical'], electronics: ['electronics'], controls: ['controls'],
  thermal: ['mechanical.thermofluids', 'mechanical.hvac'], materials: ['materials'], manufacturing: ['manufacturing'], vehicles: ['vehicle', 'marine'],
  aerospace: ['aerospace'], chemical: ['chemical'], energy: ['energy', 'nuclear'], life: ['biomedical', 'agricultural'], software: ['systems'],
  operations: ['manufacturing.industrial', 'civil.construction'],
};

/** The tree as an outline, for the docs. */
export function disciplinesText(): string {
  const n = DISCIPLINE.size, lines = ['# Engineering disciplines', '', `Generated from \`src/data/disciplines.ts\`: ${DISCIPLINES.length} disciplines, ${n} entries in all (discipline, branch, specialty). Each discipline is organised after the body named with it; nodes are classified to the deepest entry that fits (docs/REALITY.md, step K).`, ''];
  const put = (d: Discipline, depth: number) => { lines.push(depth === 0 ? `## ${d.name} (\`${d.id}\`)${d.after ? `\n\nAfter ${d.after}.\n` : ''}` : `${'  '.repeat(depth - 1)}- ${d.name} (\`${d.id}\`)`); d.sub.forEach((s) => put(s, depth + 1)); if (depth === 0) lines.push(''); };
  DISCIPLINES.forEach((d) => put(d, 0));
  return lines.join('\n');
}

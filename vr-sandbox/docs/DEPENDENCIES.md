# The dependency map

Written from the code by `tests/nexus/dependencies.test.ts` (step 0 of `docs/REALITY.md`); the test fails when it is out of date (`UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts`).

## Laws and the engines that hold them

241 laws in the book (terms: dimensions checked, domains, derivations); 144 as closures; 144 as nodes (built from the closures). In the book only: 97. As closures only: 0.

| Field | In the book | Also a closure and a node | Only in the book |
| --- | --- | --- | --- |
| mechanics | 29 | 29 | 0 |
| structures | 13 | 13 | 0 |
| materials | 12 | 12 | 0 |
| machine elements | 16 | 16 | 0 |
| electrical | 24 | 24 | 0 |
| thermal | 17 | 17 | 0 |
| fluids | 12 | 12 | 0 |
| magnetism | 5 | 5 | 0 |
| information | 7 | 7 | 0 |
| chemistry | 6 | 6 | 0 |
| optics | 3 | 3 | 0 |
| derived (slice) | 22 | 0 | 22 |
| universal | 75 | 0 | 75 |

### mechanics

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `newton.second` Newton's second law | m: mass, kg; a: acceleration, m/s^2 | F: net force, N | book, closure, node |
| `weight` Weight | m: mass, kg; g: gravity, m/s^2 | W: weight, N | book, closure, node |
| `friction.coulomb` Coulomb friction | mu: friction coefficient, -; N: normal force, N | F: friction force (limit), N | book, closure, node |
| `rolling.resistance` Rolling resistance | Crr: rolling resistance coefficient, -; N: normal force, N | F: rolling resistance, N | book, closure, node |
| `grade.force` Grade resistance | m: mass, kg; theta: slope angle, rad | F: grade force, N | book, closure, node |
| `power.linear` Power of a force | F: force, N; v: speed, m/s | P: power, W | book, closure, node |
| `power.rotary` Power of a torque | T: torque, N m; w: angular speed, rad/s | P: power, W | book, closure, node |
| `wheel.torque` Torque at a wheel | F: tractive force, N; r: wheel radius, m | T: axle torque, N m | book, closure, node |
| `traction.limit` Traction limit | mu: tyre-road friction, -; N: load on driven wheels, N | F: most tractive force, N | book, closure, node |
| `energy.kinetic` Kinetic energy | m: mass, kg; v: speed, m/s | E: kinetic energy, J | book, closure, node |
| `energy.potential` Gravitational potential energy | m: mass, kg; h: height, m | E: potential energy, J | book, closure, node |
| `braking.distance` Stopping distance | v: speed, m/s; a: deceleration, m/s^2 | d: distance, m | book, closure, node |
| `cornering.limit` Cornering speed limit | mu: tyre friction, -; R: bend radius, m | v: most speed, m/s | book, closure, node |
| `pendulum.period` Pendulum period | L: length, m | T: period, s | book, closure, node |
| `natural.frequency` Natural frequency of a mass on a spring | k: stiffness, N/m; m: mass, kg | f: frequency, Hz | book, closure, node |
| `centripetal` Centripetal force | m: mass, kg; v: speed, m/s; r: radius, m | F: centripetal force, N | book, closure, node |
| `inertia.disc` Moment of inertia of a disc | m: mass, kg; r: radius, m | I: moment of inertia, kg m^2 | book, closure, node |
| `inertia.rod-end` Moment of inertia of a rod about its end | m: mass, kg; L: length, m | I: moment of inertia, kg m^2 | book, closure, node |
| `parallel-axis` Parallel axis theorem | Icm: inertia about the centre of mass, kg m^2; m: mass, kg; d: offset, m | I: moment of inertia, kg m^2 | book, closure, node |
| `energy.rotational` Rotational kinetic energy | I: moment of inertia, kg m^2; w: angular speed, rad/s | E: energy, J | book, closure, node |
| `free-fall.speed` Speed after a fall | h: height, m | v: impact speed, m/s | book, closure, node |
| `flywheel.specific-energy` Energy a flywheel can hold per kilogram | K: shape factor, -; sigma: allowable stress, Pa; rho: density, kg/m^3 | e: specific energy, J/kg | book, closure, node |
| `spring.energy` Energy in a spring | k: rate, N/m; x: deflection, m | E: stored energy, J | book, closure, node |
| `time.dilation.gravity` Gravitational time dilation | M: mass, kg; r: distance from its centre, m | k: clock rate against far away, - | book, closure, node |
| `sound.speed` Speed of a longitudinal wave in a bar | E: modulus, Pa; rho: density, kg/m^3 | c: wave speed, m/s | book, closure, node |
| `conservation.momentum` Conservation of momentum (two bodies that stick) | m1: mass, kg; v1: speed, m/s; m2: mass, kg; v2: speed, m/s | v: common speed after, m/s | book, closure, node |
| `hill.muscle` Hill's muscle equation | F0: isometric force, N; a: Hill force constant, N; b: Hill speed constant, m/s; v: shortening speed, m/s | F: force, N | book, closure, node |
| `froude` Froude number of a gait | v: speed, m/s; L: leg length, m | Fr: Froude number, - | book, closure, node |
| `tsiolkovsky` Rocket equation | ve: exhaust speed, m/s; m0: initial mass, kg; m1: final mass, kg | dv: velocity gained, m/s | book, closure, node |

### structures

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `stress.axial` Axial stress | F: force, N; A: section area, m^2 | sigma: stress, Pa | book, closure, node |
| `stress.bending` Bending stress | M: bending moment, N m; S: section modulus I/c, m^3 | sigma: stress, Pa | book, closure, node |
| `beam.simply-supported.udl` Sag of a simply supported beam under a spread load | w: load per length, N/m; L: span, m; E: modulus, Pa; I: second moment, m^4 | d: mid-span sag, m | book, closure, node |
| `beam.simply-supported.point` Sag of a simply supported beam under a central load | P: load, N; L: span, m; E: modulus, Pa; I: second moment, m^4 | d: mid-span sag, m | book, closure, node |
| `beam.cantilever.point` Deflection of a cantilever under an end load | P: end load, N; L: length, m; E: modulus, Pa; I: second moment, m^4 | d: tip deflection, m | book, closure, node |
| `buckling.euler` Euler buckling | E: modulus, Pa; I: least second moment, m^4; L: length, m; K: effective length factor, - | P: buckling load, N | book, closure, node |
| `torsion.solid` Shear stress in a twisted round shaft | T: torque, N m; d: diameter, m | tau: surface shear stress, Pa | book, closure, node |
| `torsion.twist` Angle of twist | T: torque, N m; L: length, m; G: shear modulus, Pa; J: polar moment, m^4 | theta: twist, rad | book, closure, node |
| `buckling.johnson` Johnson column formula | A: section area, m^2; Sy: yield strength, Pa; E: modulus, Pa; K: effective length factor, -; L: length, m; r: radius of gyration, m | P: critical load, N | book, closure, node |
| `slenderness.transition` Euler-Johnson transition slenderness | E: modulus, Pa; Sy: yield strength, Pa | s: transition slenderness, - | book, closure, node |
| `stress.hoop` Hoop stress in a thin-walled cylinder | p: internal pressure, Pa; r: mean radius, m; t: wall, m | sigma: hoop stress, Pa | book, closure, node |
| `weld.fillet.shear` Shear in a fillet weld | F: load, N; a: leg, m; L: weld length, m | tau: throat shear, Pa | book, closure, node |
| `beam.plastic-moment` Plastic moment of a section | Z: plastic section modulus, m^3; Sy: yield stress, Pa | Mp: plastic moment, N m | book, closure, node |

### materials

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `hooke` Hooke's law | E: elastic modulus, Pa; eps: strain, - | sigma: stress, Pa | book, closure, node |
| `stress.von-mises` Von Mises stress | sigma: normal stress, Pa; tau: shear stress, Pa | s: equivalent stress, Pa | book, closure, node |
| `thermal.expansion` Thermal expansion | alpha: expansion coefficient, 1/K; L: length, m; dT: temperature rise, K | dL: growth, m | book, closure, node |
| `fatigue.endurance.steel` Endurance limit of steel | Sut: tensile strength, Pa | Se: rotating-beam endurance limit, Pa | book, closure, node |
| `composite.rule-of-mixtures` Rule of mixtures (along the fibre) | Vf: fibre volume fraction, -; Ef: fibre modulus, Pa; Em: matrix modulus, Pa | E: longitudinal modulus, Pa | book, closure, node |
| `composite.transverse` Inverse rule of mixtures (across the fibre) | Vf: fibre volume fraction, -; Ef: fibre modulus (transverse), Pa; Em: matrix modulus, Pa | E: transverse modulus, Pa | book, closure, node |
| `sinter.scale` Scale-up for sintering shrinkage | s: linear sintering shrinkage, - | k: print scale, - | book, closure, node |
| `piezo.stroke` Piezo stack stroke | n: layers, -; d33: piezoelectric charge constant, m/V; V: voltage per layer, V | dL: free stroke, m | book, closure, node |
| `young.contact` Contact angle (Young) | gsv: solid-vapour surface energy, J/m^2; gsl: solid-liquid surface energy, J/m^2; glv: liquid surface tension, J/m^2 | theta: contact angle, rad | book, closure, node |
| `carbonation.capacity` Carbon dioxide a lime can hold | m: calcium oxide, kg | mCO2: CO₂ held for good, kg | book, closure, node |
| `griffith` Griffith criterion | E: Young's modulus, Pa; gamma: surface energy, J/m^2; a: crack length, m | sigma: fracture stress, Pa | book, closure, node |
| `hall-petch` Hall-Petch relation | sigma0: friction stress, Pa; ky: Hall-Petch coefficient, Pa m^0.5; d: grain size, m | sigma: yield strength, Pa | book, closure, node |

### machine elements

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `shaft.diameter.static` Shaft diameter for bending and torque (static) | M: bending moment, N m; T: torque, N m; n: safety factor, -; Sy: yield strength, Pa | d: least diameter, m | book, closure, node |
| `bearing.life.l10` Bearing rating life (L10) | C: basic dynamic load rating, N; P: equivalent dynamic load, N; p: life exponent, - | L: rating life, rev | book, closure, node |
| `bearing.life.hours` Bearing life in hours | L: rating life, rev; n: speed, rpm | h: rating life, h | book, closure, node |
| `spring.rate` Helical spring rate | G: shear modulus, Pa; d: wire diameter, m; D: mean coil diameter, m; n: active coils, - | k: rate, N/m | book, closure, node |
| `capstan` Capstan (belt friction) equation | mu: friction coefficient, -; theta: wrap angle, rad | r: tension ratio, - | book, closure, node |
| `chain.speed` Chain speed | z: sprocket teeth, -; p: pitch, m; n: speed, rpm | v: chain speed, m/s | book, closure, node |
| `chain.pull` Chain pull | P: power, W; v: chain speed, m/s | F: tight-side pull, N | book, closure, node |
| `gear.output.torque` Torque through a gear train | T: input torque, N m; i: ratio, -; eta: efficiency, - | Tout: output torque, N m | book, closure, node |
| `bolt.torque.nut-factor` Bolt tightening torque (nut factor) | K: nut factor, -; F: preload, N; d: nominal diameter, m | T: wrench torque, N m | book, closure, node |
| `belt.speed` Belt or rim speed | D: diameter, m; n: speed, rpm | v: rim speed, m/s | book, closure, node |
| `screw.force` Force from a power screw | T: torque, N m; eta: efficiency, -; l: lead, m | F: axial force, N | book, closure, node |
| `gear.lewis` Gear tooth bending stress (Lewis) | Wt: tangential load, N; b: face width, m; m: module, m; Y: Lewis form factor, - | sigma: root bending stress, Pa | book, closure, node |
| `spring.torsion.rate` Helical torsion spring rate | d: wire diameter, m; D: mean coil diameter, m; N: active turns, -; E: modulus, Pa | k: rate, N m/rad | book, closure, node |
| `screw.efficiency` Efficiency of a power screw | l: lead, m; d2: pitch diameter, m; mu: friction coefficient, -; alpha: thread half-angle, rad | eta: efficiency, - | book, closure, node |
| `hertz.contact` Hertzian contact (a sphere on a flat) | F: load, N; Estar: contact modulus, Pa; R: sphere radius, m | p0: peak contact pressure, Pa | book, closure, node |
| `grubler` Gruebler's equation (planar) | n: links, the ground among them, -; j1: full joints (pins, sliders), -; j2: half joints (cam, gear contacts), - | M: degrees of freedom, - | book, closure, node |

### electrical

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `ohm` Ohm's law | I: current, A; R: resistance, ohm | V: voltage, V | book, closure, node |
| `joule` Joule heating | I: current, A; R: resistance, ohm | P: heat, W | book, closure, node |
| `wire.resistance` Resistance of a wire | rho: resistivity, ohm m; L: length, m; A: section, m^2 | R: resistance, ohm | book, closure, node |
| `copper.tempco` Copper's resistance with temperature | R0: resistance at T0, ohm; T: temperature, degC; T0: reference temperature, degC | R: resistance, ohm | book, closure, node |
| `wire.drop` Voltage drop along a pair | I: current, A; L: run length, m; Rm: resistance per metre, ohm/m | dV: drop, V | book, closure, node |
| `motor.torque` DC motor torque | Kt: torque constant, N m/A; I: current, A | T: torque, N m | book, closure, node |
| `motor.back-emf` Back-EMF | Ke: back-EMF constant, V s/rad; w: speed, rad/s | E: back-EMF, V | book, closure, node |
| `motor.current` DC motor current | V: applied voltage, V; Ke: back-EMF constant, V s/rad; w: speed, rad/s; R: winding resistance, ohm | I: current, A | book, closure, node |
| `motor.time-constant` Mechanical time constant | R: winding resistance, ohm; J: inertia, kg m^2; Kt: torque constant, N m/A | tau: time constant, s | book, closure, node |
| `lead-acid.ocv` Lead-acid open-circuit voltage | SG: specific gravity of the acid, - | V: cell voltage, V | book, closure, node |
| `energy.electric` Electrical energy | V: voltage, V; I: current, A; t: time, s | E: energy, J | book, closure, node |
| `rc.time-constant` RC time constant | R: resistance, ohm; C: capacitance, F | tau: time constant, s | book, closure, node |
| `capacitor.energy` Energy in a capacitor | C: capacitance, F; V: voltage, V | E: stored energy, J | book, closure, node |
| `inductor.energy` Energy in an inductor | L: inductance, H; I: current, A | E: stored energy, J | book, closure, node |
| `power.electric` Electrical power | V: voltage, V; I: current, A | P: power, W | book, closure, node |
| `electrostatic.pull` Electrostatic pull between plates | er: relative permittivity, -; A: plate area, m^2; V: voltage, V; d: gap, m | F: pull, N | book, closure, node |
| `cmos.dynamic` Switching power of CMOS logic | alpha: fraction switching each cycle, -; C: switched capacitance, F; V: supply voltage, V; f: clock rate, Hz | P: dynamic power, W | book, closure, node |
| `seebeck` Seebeck voltage (thermocouple) | S: Seebeck coefficient, V/K; dT: temperature difference, K | V: voltage, V | book, closure, node |
| `strain.gauge` Strain gauge | GF: gauge factor, -; eps: strain, -; R: gauge resistance, ohm | dR: change in resistance, ohm | book, closure, node |
| `pv.power` Solar cell power | eta: efficiency, -; G: irradiance, W/m^2; A: area, m^2 | P: electric power, W | book, closure, node |
| `coulomb.law` Coulomb's law | q1: charge, C; q2: charge, C; r: distance, m | F: force, N | book, closure, node |
| `shockley.diode` Shockley diode equation | Is: saturation current, A; V: forward voltage, V; n: ideality factor, -; Vt: thermal voltage k T / q, V | I: current, A | book, closure, node |
| `wave.speed.electromagnetic` Speed of an electromagnetic wave | mu: permeability, N/A^2; eps: permittivity, F/m | v: wave speed, m/s | book, closure, node |
| `cable.equation` Cable equation (the length constant) | rm: leak resistance of a unit length, ohm m; ri: inner resistance per length, ohm/m | lambda: length constant, m | book, closure, node |

### thermal

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `convection` Newton's law of cooling | h: heat transfer coefficient, W/m^2 K; A: area, m^2; dT: temperature excess, K | q: heat flow, W | book, closure, node |
| `conduction` Fourier's law | k: conductivity, W/m K; A: area, m^2; dT: temperature difference, K; L: thickness, m | q: heat flow, W | book, closure, node |
| `convection.natural` Free convection in still air | dT: temperature excess, K; L: size, m | h: heat transfer coefficient, W/m^2 K | book, closure, node |
| `radiation` Stefan-Boltzmann radiation | eps: emissivity, -; A: area, m^2; T: surface temperature, K; Tinf: surroundings, K | q: net heat flow, W | book, closure, node |
| `heat.capacity` Heat capacity | m: mass, kg; c: specific heat, J/kg K; dT: temperature rise, K | Q: heat, J | book, closure, node |
| `lumped.time-constant` Lumped thermal time constant | m: mass, kg; c: specific heat, J/kg K; h: heat transfer coefficient, W/m^2 K; A: area, m^2 | tau: time constant, s | book, closure, node |
| `thermal.network` Temperature rise through thermal resistances | P: heat flow, W; R: sum of thermal resistances, K/W | dT: temperature rise, K | book, closure, node |
| `thermal.resistance.conduction` Thermal resistance of a wall | L: thickness, m; k: conductivity, W/m K; A: area, m^2 | R: thermal resistance, K/W | book, closure, node |
| `carnot` Carnot efficiency | Tc: cold side, K; Th: hot side, K | eta: most efficiency, - | book, closure, node |
| `weld.heat-input` Arc welding heat input | eta: arc efficiency, -; V: arc voltage, V; I: current, A; v: travel speed, m/s | Q: heat input, J/m | book, closure, node |
| `arrhenius` Arrhenius rate | A: pre-exponential factor, 1/s; Ea: activation energy, J/mol; T: temperature, K | k: rate, 1/s | book, closure, node |
| `absorbed.solar` Sunlight a surface absorbs | a: albedo (reflected share), -; G: sunlight, W/m^2; A: area, m^2 | P: absorbed power, W | book, closure, node |
| `separation.work` Least work to take out a trace | T: temperature, K; x: share left (mole fraction), - | W: least work a mole, J/mol | book, closure, node |
| `ideal.gas` Ideal gas law | n: amount, mol; T: temperature, K; V: volume, m^3 | p: pressure, Pa | book, closure, node |
| `clausius-clapeyron` Clausius-Clapeyron relation | L: latent heat, J/kg; T: temperature, K; dv: change of specific volume, m^3/kg | dpdT: slope of the boundary, Pa/K | book, closure, node |
| `boltzmann.distribution` Boltzmann distribution | dE: energy above the ground state, J; T: temperature, K | ratio: population ratio, - | book, closure, node |
| `first.law` First law of thermodynamics | Q: heat in, J; W: work out, J | dU: change in internal energy, J | book, closure, node |

### fluids

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `drag.aero` Aerodynamic drag | rho: air density, kg/m^3; Cd: drag coefficient, -; A: frontal area, m^2; v: speed, m/s | F: drag, N | book, closure, node |
| `lift.aero` Aerodynamic lift | rho: fluid density, kg/m^3; CL: lift coefficient, -; A: planform area, m^2; v: speed, m/s | L: lift, N | book, closure, node |
| `gas.isothermal-work` Work in a compressed gas (isothermal) | p: stored pressure, Pa; V: stored volume, m^3; p0: pressure let down to, Pa | W: work, J | book, closure, node |
| `reynolds` Reynolds number | rho: density, kg/m^3; v: speed, m/s; L: size, m; mu: dynamic viscosity, Pa s | Re: Reynolds number, - | book, closure, node |
| `darcy-weisbach` Pressure drop in a pipe (Darcy-Weisbach) | f: Darcy friction factor, -; L: length, m; D: bore, m; rho: density, kg/m^3; v: mean speed, m/s | dp: pressure drop, Pa | book, closure, node |
| `buoyancy` Archimedes' principle | rho: fluid density, kg/m^3; V: displaced volume, m^3 | F: buoyancy, N | book, closure, node |
| `hydrostatic` Hydrostatic pressure | rho: density, kg/m^3; h: depth, m | p: gauge pressure, Pa | book, closure, node |
| `thrust.ideal-static` Ideal static thrust of a rotor (momentum theory) | rho: fluid density, kg/m^3; A: disc area, m^2; P: shaft power, W | T: thrust, N | book, closure, node |
| `acoustic.mass-law` Sound insulation of a wall (mass law) | m: mass per area, kg/m^2; f: frequency, Hz | TL: transmission loss, dB | book, closure, node |
| `diffusion.time` Time to diffuse a distance | x: distance, m; D: diffusion coefficient, m^2/s | t: time, s | book, closure, node |
| `bernoulli` Bernoulli's equation | p1: pressure upstream, Pa; rho: density, kg/m^3; v1: speed upstream, m/s; v2: speed downstream, m/s | p2: pressure downstream, Pa | book, closure, node |
| `continuity` Continuity equation | v1: speed upstream, m/s; A1: area upstream, m^2; A2: area downstream, m^2 | v2: speed downstream, m/s | book, closure, node |

### magnetism

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `lorentz.force` Lorentz force on a conductor | B: flux density, T; I: current, A; L: conductor length in the field, m | F: force, N | book, closure, node |
| `magnetic.pull` Magnetic pull across a gap (Maxwell) | B: flux density in the gap, T; A: pole face area, m^2 | F: pull, N | book, closure, node |
| `skin.depth` Skin depth | f: frequency, Hz; sigma: conductivity, S/m | delta: skin depth, m | book, closure, node |
| `ampere.law` Ampère's law (a long solenoid) | N: turns, -; I: current, A; L: coil length, m | B: field inside, T | book, closure, node |
| `faraday.induction` Faraday's law of induction | N: turns, -; A: loop area, m^2; dBdt: rate of change of the field, T/s | V: induced voltage, V | book, closure, node |

### information

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `landauer` Landauer's limit | T: temperature, K | E: least energy per bit erased, J | book, closure, node |
| `information.choices` Information in a choice | N: number of choices, - | H: information (bits), - | book, closure, node |
| `rayleigh.resolution` Resolution of optical lithography (Rayleigh) | k1: process factor, -; lambda: wavelength, m; NA: numerical aperture, - | CD: smallest half-pitch, m | book, closure, node |
| `diffraction.limit` Diffraction limit of an aperture | lambda: wavelength, m; D: aperture diameter, m | theta: smallest angle resolved, rad | book, closure, node |
| `shannon.capacity` Shannon capacity | B: bandwidth, Hz; snr: signal to noise power ratio, - | C: capacity (bits per second), Hz | book, closure, node |
| `shannon.sampling` Nyquist-Shannon sampling theorem | fmax: highest frequency in the signal, Hz | fs: least sampling rate, Hz | book, closure, node |
| `queueing` Little's law | lambda: arrival rate, 1/s; W: time in the system, s | L: items in the system, - | book, closure, node |

### chemistry

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `fick.diffusion` Fick's law of diffusion | D: diffusivity, m^2/s; dC: concentration difference, mol/m^3; L: distance, m | J: flux, mol/m^2 s | book, closure, node |
| `nernst` Nernst equation | E0: standard potential, V; T: temperature, K; z: electrons transferred, -; Q: reaction quotient, - | E: potential, V | book, closure, node |
| `gibbs.energy` Gibbs free energy | dH: enthalpy change, J/mol; T: temperature, K; dS: entropy change, J/mol K | dG: free energy change, J/mol | book, closure, node |
| `michaelis-menten` Michaelis-Menten kinetics | Vmax: maximum rate, mol/m^3 s; S: substrate concentration, mol/m^3; Km: Michaelis constant, mol/m^3 | v: rate, mol/m^3 s | book, closure, node |
| `faraday.electrolysis` Faraday's laws of electrolysis | M: molar mass, kg/mol; I: current, A; t: time, s; z: electrons per ion, - | m: mass, kg | book, closure, node |
| `butler-volmer` Butler-Volmer equation | i0: exchange current density, A/m^2; eta: overpotential, V; Vt: thermal voltage R T / F, V; alphaA: anodic transfer coefficient, -; alphaC: cathodic transfer coefficient, - | i: current density, A/m^2 | book, closure, node |

### optics

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `planck.energy` Planck relation | lambda: wavelength, m | E: photon energy, J | book, closure, node |
| `snell.law` Snell's law | n1: index of the first medium, -; n2: index of the second, -; theta1: angle of incidence, rad | theta2: angle of refraction, rad | book, closure, node |
| `bragg.law` Bragg's law | d: plane spacing, m; theta: glancing angle, rad; n: order, - | lambda: wavelength, m | book, closure, node |

### derived (slice)

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `mass.prism` Mass of a rectangular prism | rho: density, kg/m^3; x: extent x, m; y: extent y, m; z: extent z, m | m: mass, kg | book |
| `extent.from-mass` Height of a prism of given mass and footprint | m: mass, kg; rho: density, kg/m^3; x: extent x, m; z: extent z, m | y: height, m | book |
| `weight.per-length` Weight per length of a rectangular bar | rho: density, kg/m^3; b: breadth, m; h: depth, m; g: gravity, m/s^2 | q: weight per length, N/m | book |
| `statics.two-supports.symmetric` Reactions of a symmetric beam on two supports | P: load, N; W: self weight, N | R: reaction at each support, N | book |
| `beam.simply-supported.central-patch.moment` Bending moment under a central patch load | P: load, N; L: span, m; w: patch width, m; a: station from mid-span, m | M: bending moment, N m | book |
| `beam.overhang.self-moment` Bending moment from a beam's own weight, with overhangs | q: weight per length, N/m; L: span, m; Lt: total length, m; a: station from mid-span, m | M: bending moment, N m | book |
| `section.rect.area` Area of a rectangle | b: breadth, m; h: depth, m | A: area, m^2 | book |
| `section.rect.modulus` Section modulus of a rectangle | b: breadth, m; h: depth, m | S: section modulus, m^3 | book |
| `section.rect.second-moment` Second moment of a rectangle | b: breadth, m; h: depth, m | I: second moment, m^4 | book |
| `beam.simply-supported.central-patch.sag` Mid-span sag under a central patch load | P: load, N; L: span, m; w: patch width, m; E: modulus, Pa; I: second moment, m^4; h: depth, m | delta: mid-span sag, m | book |
| `beam.overhang.self-sag` Mid-span sag from a beam's own weight, with overhangs | q: weight per length, N/m; L: span, m; Lt: total length, m; E: modulus, Pa; I: second moment, m^4; h: depth, m | delta: mid-span sag, m | book |
| `beam.simply-supported.first-period` Period of the first mode of a simply supported beam | L: span, m; E: modulus, Pa; I: second moment, m^4; rho: density, kg/m^3; A: section area, m^2; h: depth, m | T1: first period, s | book |
| `cantilever.root-moment` Moment at the root of a cantilever | P: load, N; a: reach of the load from the root, m; q: weight per length, N/m; ell: length of the arm, m | M: root moment, N m | book |
| `cantilever.root-shear` Shear at the root of a cantilever | P: load, N; q: weight per length, N/m; ell: length of the arm, m | V: root shear, N | book |
| `cantilever.tip-sag` Tip deflection of a cantilever under a patch load at reach a and its own weight | P: load, N; a: reach of the load from the root, m; w: patch width, m; ell: length of the arm, m; q: weight per length, N/m; E: modulus, Pa; I: second moment, m^4; h: depth, m | delta: tip sag, m | book |
| `bolt.tensile-stress-area` Tensile stress area of a metric thread | d: nominal diameter, m; p: thread pitch, m | As: tensile stress area, m^2 | book |
| `bolt-group.tension` Tensile capacity of a bolt group | n: bolts, 1; As: tensile stress area, m^2; Rm: tensile strength of the bolt, Pa | Ft: tensile capacity of the group, N | book |
| `bolt-group.bending` Bending capacity of a bolt group prying about the footprint edge | Ft: tensile capacity of the group, N; lever: lever of the group, m | Mcap: bending capacity, N m | book |
| `inertia.prism.centre` Moment of inertia of a rectangular prism about its centre | m: mass, kg; a: extent along the swing, m; b: extent across the swing, in its plane, m | I: moment of inertia about the centre, kg m^2 | book |
| `pendulum.physical.period` Period of a physical pendulum, small swings | I: moment of inertia about the pivot, kg m^2; m: mass, kg; g: gravity, m/s^2; d: distance from the pivot to the centre of mass, m | T0: small-swing period, s | book |
| `pendulum.period-factor` Lengthening of the period with the swing, from energy conservation | theta0: release angle, rad | f: period factor, 1 | book |
| `pendulum.amplitude-factor` Lengthening of the period with the swing (the series) | theta0: release angle, rad | f: period factor, 1 | book |

### universal

| Law | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- |
| `balance.steady` Steady mass balance | Qin: flow in, m^3/s; f: share taken back, - | Q: flow out, m^3/s | book |
| `residence.stock` Stock, flow and residence time | Q: flow through, m^3/s; tau: residence time, s | V: volume held, m^3 | book |
| `balance.difference` What is left of a flow | Qin: flow in, m^3/s; Qout: flow out by the other ways, m^3/s | Q: flow left, m^3/s | book |
| `junction.sum` Flows meeting at a junction | Q1: one flow, m^3/s; Q2: the other, m^3/s | Q: flow together, m^3/s | book |
| `transport.advection` What a flow carries | Q: flow, m^3/s; dc: concentration out less in, mol/m^3 | n: amount carried, mol/s | book |
| `concentration.difference` Difference of two concentrations | c1: one concentration, mol/m^3; c2: the other, mol/m^3 | dc: difference, mol/m^3 | book |
| `flux.area` A flux over an area | J: flux, kg/m^2 s; A: area, m^2 | m: mass crossing, kg/s | book |
| `total.mass` The mass of many | n: count, -; m1: mass of one, kg | m: mass of all, kg | book |
| `total.volume` The room many take | n: count, -; V1: volume of one, m^3 | V: volume of all, m^3 | book |
| `total.flow` The flow of many | n: count, -; q: flow of one, m^3/s | Q: flow of all, m^3/s | book |
| `total.rate` The rate of many | n: count, -; r1: rate of one, 1/s | r: rate of all, 1/s | book |
| `rate.per-mass` A flow from a mass that makes it | q: flow a kilogram, m^3/s kg; m: mass, kg | Q: flow, m^3/s | book |
| `share.of` A share of a mass | w: share, -; M: whole, kg | m: part, kg | book |
| `residence.mass` A stock of mass and its turnover | mdot: flow through, kg/s; tau: residence time, s | m: stock, kg | book |
| `amount.concentration` Amount in a volume | c: concentration, mol/m^3; V: volume, m^3 | n: amount, mol | book |
| `power.molar` Power of a flow of moles | n: rate, mol/s; E: energy a mole, J/mol | P: power, W | book |
| `stoichiometry.mass` Stoichiometry by mass | m: reactant, kg; nu: moles made a mole, -; Mp: molar mass of the product, g/mol; Mr: molar mass of the reactant, g/mol | mp: product, kg | book |
| `stoichiometry.moles` Stoichiometry by moles | nu: how many each, -; n: moles of it, mol | np: moles of the other, mol | book |
| `saturation.share` A share of what it can hold | theta: share filled, -; cmax: capacity, mol/m^3 | c: held, mol/m^3 | book |
| `heat.latent-flow` Heat carried by a phase change | mdot: mass flow, kg/s; L: latent heat, J/kg | P: heat carried, W | book |
| `reaction.rate-from-power` Reaction rate from its power | P: power, W; V: volume it runs in, m^3; dH: energy a mole, J/mol | q: rate a volume, mol/m^3 s | book |
| `distance.speed-time` Distance at a steady speed | v: speed, m/s; t: time, s | x: distance, m | book |
| `volume.cylinder` Volume of a cylinder | r: radius, m; L: length, m | V: volume, m^3 | book |
| `volume.ellipsoid` Volume of an ellipsoid | a: extent, m; b: width, m; c: height, m | V: volume, m^3 | book |
| `volume.of-box` Volume by shape in a box | phi: share of its box, -; a: extent, m; b: width, m; c: height, m | V: volume, m^3 | book |
| `area.sphere-of-volume` The least surface a volume can have | V: volume, m^3 | A: surface, m^2 | book |
| `area.shaped` A shape's surface over its sphere's | s: shape factor, -; A0: the sphere's surface, m^2 | A: surface, m^2 | book |
| `power.per-mass` Power from a mass that gives it | p: power a kilogram, W/kg; m: mass, kg | P: power, W | book |
| `mass.volume` Mass of a volume | rho: density, kg/m^3; V: volume, m^3 | m: mass, kg | book |
| `mass.flow` Mass flow of a volume flow | rho: density, kg/m^3; Q: volume flow, m^3/s | mdot: mass flow, kg/s | book |
| `molar.mass-flow` Mass flow of a molar flow | n: molar flow, mol/s; M: molar mass, kg/mol | mdot: mass flow, kg/s | book |
| `mixing.density` Density of a mixture | w: mass share of the first, -; rho1: density of the first, kg/m^3; rho2: density of the second, kg/m^3 | rho: density, kg/m^3 | book |
| `starling.filtration` Filtration through a membrane (Starling) | Kf: filtration coefficient, m^3/s Pa; dP: hydraulic pressure difference, Pa; dPi: osmotic pressure difference, Pa | J: filtration rate, m^3/s | book |
| `poiseuille` Laminar flow in a tube (Hagen–Poiseuille) | r: radius, m; dP: pressure drop, Pa; mu: viscosity, Pa s; L: length, m | Q: flow, m^3/s | book |
| `murray.branching` Murray's law of branching | r1: radius of one branch, m; r2: radius of the other, m | r0: radius of the parent, m | book |
| `network.scaling` The exponent of a space-filling network | n: branches at each level, -; beta: radius ratio, -; gamma: length ratio, - | a: scaling exponent, - | book |
| `kleiber.scaling` Metabolic scaling (Kleiber) | B0: coefficient, W; M: body mass, kg; a: exponent, - | B: resting power, W | book |
| `diffusion.front` A front advanced by diffusion | D: diffusivity through the reacted layer, m^2/s; C: concentration at the surface, mol/m^3; t: time, s; a: capacity to react, mol/m^3 | x: depth of the front, m | book |
| `diffusion.erf` Diffusion in from a held surface (Fick's second law) | Cs: at the surface, -; x: depth, m; D: diffusivity, m^2/s; t: time, s | C: at that depth, - | book |
| `diffusion.sphere-limit` The largest a sphere can live by diffusion | D: diffusivity, m^2/s; C: concentration at the surface, mol/m^3; q: consumption a volume, mol/m^3 s | R: largest radius, m | book |
| `osmotic.van-t-hoff` Osmotic pressure (van 't Hoff) | c: concentration of particles, mol/m^3; T: temperature, K | pi: osmotic pressure, Pa | book |
| `free-energy.gradient` The free energy of a gradient | T: temperature, K; ratio: concentration ratio, to over from, -; z: charge, -; psi: voltage, to less from, V | dG: free energy a mole, J/mol | book |
| `henry.solubility` Gas dissolved in a liquid (Henry) | p: partial pressure, Pa; kH: Henry constant, Pa m^3/mol | C: dissolved concentration, mol/m^3 | book |
| `gas.concentration` Concentration of a gas | x: mole fraction, -; p: pressure, Pa; T: temperature, K | c: concentration, mol/m^3 | book |
| `vapour.pressure` Vapour pressure (Clausius–Clapeyron, integrated) | p0: vapour pressure at the reference, Pa; T0: reference temperature, K; T: temperature, K; L: latent heat, J/kg; M: molar mass, kg/mol | p: vapour pressure, Pa | book |
| `sorption.gab` Water held by a material (GAB isotherm) | Mm: monolayer water content, -; C: first-layer constant, -; K: multilayer constant, -; h: relative humidity, - | M: water content (mass over dry mass), - | book |
| `arrhenius.ratio` Arrhenius factor between two temperatures | Ea: activation energy, J/mol; T: temperature, K; Tref: reference temperature, K | f: rate over its rate at the reference, - | book |
| `decay.first-order` First-order decay | N0: amount at the start, -; k: rate constant, 1/s; t: time, s | N: amount left, - | book |
| `loss.first-order` Loss at a first-order rate | k: rate constant, 1/s; m: stock, kg | mdot: loss (and making, when steady), kg/s | book |
| `half-life` Half-life | k: rate constant, 1/s | t: half-life, s | book |
| `growth.doubling` Growth by doubling | N0: count at the start, -; t: time, s; td: doubling time, s | N: count, - | book |
| `mortality.gompertz` Mortality rising with age (Gompertz) | A: hazard at age nought, 1/s; G: Gompertz rate, 1/s; t: age, s | mu: hazard, 1/s | book |
| `time.scaled-by-rate` Time at a faster rate | t0: time at the reference, s; f: rate over the reference rate, - | t: time, s | book |
| `stages.series` Stages one after another | t1: first stage, s; t2: second stage, s | t: whole time, s | book |
| `moles.of-mass` Moles in a mass | m: mass, kg; M: molar mass, kg/mol | n: amount, mol | book |
| `faraday.flux` Current from a flux of reactant (Faraday) | n: electrons a mole, -; J: molar flux, mol/m^2 s | i: current density, A/m^2 | book |
| `radiation.linear` Radiation as a conductance | eps: emissivity, -; T: mean temperature, K | hr: radiative coefficient, W/m^2 K | book |
| `conductance.parallel` Paths in parallel | h1: one path, W/m^2 K; h2: the other, W/m^2 K | h: both, W/m^2 K | book |
| `power.net` Net power | Pout: power out, W; Pin: power in, W | P: net power out, W | book |
| `power.sum` Powers together | P1: one, W; P2: the other, W | P: together, W | book |
| `energy.power-time` Energy at a power over a time | P: power, W; t: time, s | E: energy, J | book |
| `dose.time` Dose at a dose rate | rate: dose rate, Gy/s; t: time, s | D: dose, Gy | book |
| `life.expectancy.gompertz-makeham` Years left by the Gompertz–Makeham law | lam: hazard that does not age (Makeham), 1/s; A: hazard at age nought, 1/s; G: Gompertz rate, 1/s; a: age now, s | e: years left, s | book |
| `humidity.vapour-pressure` Vapour pressure at a humidity | phi: relative humidity, -; psat: saturation vapour pressure, Pa | pv: vapour pressure, Pa | book |
| `rates.add` Independent rates add | r1: one rate, 1/s; r2: the other, 1/s | r: together, 1/s | book |
| `hazard.dose` Hazard from a dose rate | k: risk a gray, 1/Gy; rate: dose rate, Gy/s | h: hazard, 1/s | book |
| `column.self-weight` The tallest column that holds its own weight | sigma: compressive strength, Pa; rho: density, kg/m^3 | H: height, m | book |
| `fatigue.basquin` Fatigue life (Basquin) | sa: stress amplitude, Pa; sf: fatigue strength coefficient, Pa; b: fatigue strength exponent, - | N: cycles to failure, - | book |
| `conduction.series` Heat through two layers in series | A: area, m^2; dT: temperature difference, K; h1: first conductance, W/m^2 K; h2: second conductance, W/m^2 K | q: heat flow, W | book |
| `evaporation.max` The most a wet skin can evaporate | hc: convective heat-transfer coefficient, W/m^2 K; psk: vapour pressure at the skin, Pa; pa: vapour pressure in the air, Pa; A: area, m^2 | E: heat evaporated, W | book |
| `laplace.pressure` Pressure in a curved surface (Young–Laplace) | gamma: surface tension, N/m; r: radius, m | dP: pressure inside over outside, Pa | book |
| `stokes.drag` Drag at low Reynolds number (Stokes) | mu: viscosity, Pa s; r: radius, m; v: speed, m/s | F: drag, N | book |
| `corrosion.penetration` Corrosion rate from its current (Faraday) | i: corrosion current density, A/m^2; M: molar mass of the metal, g/mol; n: electrons an atom gives up, -; rho: density of the metal, kg/m^3 | v: loss of thickness a second, m/s | book |
| `porosity.powers` Capillary porosity of cement paste (Powers) | wc: water–cement ratio, -; alpha: degree of hydration, - | eps: capillary porosity, - | book |
| `diffusivity.papadakis` CO₂ diffusivity in concrete (Papadakis) | eps: paste porosity, -; rh: relative humidity, - | D: effective CO₂ diffusivity, m^2/s | book |

## Quantities the laws share (by name and dimension, as their ports say them)

558 distinct names-with-dimension across 892 ports; 117 shared by two laws or more. Step 2 makes these one registry; the names below are the laws' own words, so one quantity can appear under several names.

| Quantity [dimension] | Laws |
| --- | --- |
| mass [kg] | 23: `newton.second`, `weight`, `grade.force`, `energy.kinetic`, `energy.potential`, `natural.frequency`, `centripetal`, `inertia.disc`, … |
| density [kg m^-3] | 14: `flywheel.specific-energy`, `sound.speed`, `reynolds`, `darcy-weisbach`, `hydrostatic`, `bernoulli`, `mass.prism`, `extent.from-mass`, … |
| temperature [K] | 14: `copper.tempco`, `arrhenius`, `separation.work`, `ideal.gas`, `clausius-clapeyron`, `boltzmann.distribution`, `landauer`, `nernst`, … |
| current [A] | 13: `ohm`, `joule`, `wire.drop`, `motor.torque`, `motor.current`, `energy.electric`, `inductor.energy`, `power.electric`, … |
| modulus [kg m^-1 s^-2] | 12: `sound.speed`, `beam.simply-supported.udl`, `beam.simply-supported.point`, `beam.cantilever.point`, `buckling.euler`, `buckling.johnson`, `slenderness.transition`, `spring.torsion.rate`, … |
| speed [m s^-1] | 11: `power.linear`, `energy.kinetic`, `braking.distance`, `centripetal`, `conservation.momentum`, `froude`, `drag.aero`, `lift.aero`, … |
| length [m] | 11: `pendulum.period`, `inertia.rod-end`, `beam.cantilever.point`, `buckling.euler`, `torsion.twist`, `buckling.johnson`, `thermal.expansion`, `wire.resistance`, … |
| time [s] | 11: `energy.electric`, `diffusion.time`, `faraday.electrolysis`, `distance.speed-time`, `diffusion.front`, `diffusion.erf`, `decay.first-order`, `growth.doubling`, … |
| area [m^2] | 11: `pv.power`, `convection`, `conduction`, `radiation`, `lumped.time-constant`, `thermal.resistance.conduction`, `absorbed.solar`, `section.rect.area`, … |
| depth [m] | 10: `hydrostatic`, `weight.per-length`, `section.rect.area`, `section.rect.modulus`, `section.rect.second-moment`, `beam.simply-supported.central-patch.sag`, `beam.overhang.self-sag`, `beam.simply-supported.first-period`, … |
| load [kg m s^-2] | 9: `beam.simply-supported.point`, `weld.fillet.shear`, `hertz.contact`, `statics.two-supports.symmetric`, `beam.simply-supported.central-patch.moment`, `beam.simply-supported.central-patch.sag`, `cantilever.root-moment`, `cantilever.root-shear`, … |
| power [kg m^2 s^-3] | 8: `power.linear`, `power.rotary`, `chain.pull`, `power.electric`, `power.molar`, `reaction.rate-from-power`, `power.per-mass`, `energy.power-time` |
| second moment [m^4] | 8: `beam.simply-supported.udl`, `beam.simply-supported.point`, `beam.cantilever.point`, `section.rect.second-moment`, `beam.simply-supported.central-patch.sag`, `beam.overhang.self-sag`, `beam.simply-supported.first-period`, `cantilever.tip-sag` |
| span [m] | 7: `beam.simply-supported.udl`, `beam.simply-supported.point`, `beam.simply-supported.central-patch.moment`, `beam.overhang.self-moment`, `beam.simply-supported.central-patch.sag`, `beam.overhang.self-sag`, `beam.simply-supported.first-period` |
| volume [m^3] | 7: `ideal.gas`, `amount.concentration`, `volume.cylinder`, `volume.ellipsoid`, `volume.of-box`, `area.sphere-of-volume`, `mass.volume` |
| torque [kg m^2 s^-2] | 6: `power.rotary`, `torsion.solid`, `torsion.twist`, `shaft.diameter.static`, `screw.force`, `motor.torque` |
| height [m] | 6: `energy.potential`, `free-fall.speed`, `extent.from-mass`, `volume.ellipsoid`, `volume.of-box`, `column.self-weight` |
| radius [m] | 6: `centripetal`, `inertia.disc`, `volume.cylinder`, `poiseuille`, `laplace.pressure`, `stokes.drag` |
| voltage [kg m^2 s^-3 A^-1] | 6: `ohm`, `energy.electric`, `capacitor.energy`, `power.electric`, `electrostatic.pull`, `seebeck` |
| weight per length [kg s^-2] | 6: `weight.per-length`, `beam.overhang.self-moment`, `beam.overhang.self-sag`, `cantilever.root-moment`, `cantilever.root-shear`, `cantilever.tip-sag` |
| force [kg m s^-2] | 5: `power.linear`, `hill.muscle`, `stress.axial`, `coulomb.law`, `lorentz.force` |
| distance [m] | 5: `braking.distance`, `coulomb.law`, `diffusion.time`, `fick.diffusion`, `distance.speed-time` |
| speed [s^-1] | 5: `bearing.life.hours`, `chain.speed`, `belt.speed`, `motor.back-emf`, `motor.current` |
| resistance [kg m^2 s^-3 A^-2] | 5: `ohm`, `joule`, `wire.resistance`, `copper.tempco`, `rc.time-constant` |
| count [1] | 5: `total.mass`, `total.volume`, `total.flow`, `total.rate`, `growth.doubling` |
| moment of inertia [kg m^2] | 4: `inertia.disc`, `inertia.rod-end`, `parallel-axis`, `energy.rotational` |
| bending moment [kg m^2 s^-2] | 4: `stress.bending`, `shaft.diameter.static`, `beam.simply-supported.central-patch.moment`, `beam.overhang.self-moment` |
| mid-span sag [m] | 4: `beam.simply-supported.udl`, `beam.simply-supported.point`, `beam.simply-supported.central-patch.sag`, `beam.overhang.self-sag` |
| yield strength [kg m^-1 s^-2] | 4: `buckling.johnson`, `slenderness.transition`, `hall-petch`, `shaft.diameter.static` |
| efficiency [1] | 4: `gear.output.torque`, `screw.force`, `screw.efficiency`, `pv.power` |
| heat flow [kg m^2 s^-3] | 4: `convection`, `conduction`, `thermal.network`, `conduction.series` |
| wavelength [m] | 4: `rayleigh.resolution`, `diffraction.limit`, `planck.energy`, `bragg.law` |
| molar mass [kg] | 4: `faraday.electrolysis`, `molar.mass-flow`, `vapour.pressure`, `moles.of-mass` |
| breadth [m] | 4: `weight.per-length`, `section.rect.area`, `section.rect.modulus`, `section.rect.second-moment` |
| gravity [m s^-2] | 3: `weight`, `weight.per-length`, `pendulum.physical.period` |
| friction coefficient [1] | 3: `friction.coulomb`, `capstan`, `screw.efficiency` |
| frequency [s^-1] | 3: `natural.frequency`, `acoustic.mass-law`, `skin.depth` |
| energy [kg m^2 s^-2] | 3: `energy.rotational`, `energy.electric`, `energy.power-time` |
| stored energy [kg m^2 s^-2] | 3: `spring.energy`, `capacitor.energy`, `inductor.energy` |
| section area [m^2] | 3: `stress.axial`, `buckling.johnson`, `beam.simply-supported.first-period` |
| stress [kg m^-1 s^-2] | 3: `stress.axial`, `stress.bending`, `hooke` |
| temperature rise [K] | 3: `thermal.expansion`, `heat.capacity`, `thermal.network` |
| reference temperature [K] | 3: `copper.tempco`, `vapour.pressure`, `arrhenius.ratio` |
| time constant [s] | 3: `motor.time-constant`, `rc.time-constant`, `lumped.time-constant` |
| temperature difference [K] | 3: `seebeck`, `conduction`, `conduction.series` |
| heat transfer coefficient [kg s^-3 K^-1] | 3: `convection`, `convection.natural`, `lumped.time-constant` |
| amount [1] | 3: `ideal.gas`, `amount.concentration`, `moles.of-mass` |
| latent heat [m^2 s^-2] | 3: `clausius-clapeyron`, `heat.latent-flow`, `vapour.pressure` |
| fluid density [kg m^-3] | 3: `lift.aero`, `buoyancy`, `thrust.ideal-static` |
| diffusivity [m^2 s^-1] | 3: `fick.diffusion`, `diffusion.erf`, `diffusion.sphere-limit` |
| patch width [m] | 3: `beam.simply-supported.central-patch.moment`, `beam.simply-supported.central-patch.sag`, `cantilever.tip-sag` |
| length of the arm [m] | 3: `cantilever.root-moment`, `cantilever.root-shear`, `cantilever.tip-sag` |
| flow [m^3 s^-1] | 3: `transport.advection`, `rate.per-mass`, `poiseuille` |
| mass flow [kg s^-1] | 3: `heat.latent-flow`, `mass.flow`, `molar.mass-flow` |
| relative humidity [1] | 3: `sorption.gab`, `humidity.vapour-pressure`, `diffusivity.papadakis` |
| rate constant [s^-1] | 3: `decay.first-order`, `loss.first-order`, `half-life` |
| normal force [kg m s^-2] | 2: `friction.coulomb`, `rolling.resistance` |
| angular speed [s^-1] | 2: `power.rotary`, `energy.rotational` |
| shape factor [1] | 2: `flywheel.specific-energy`, `area.shaped` |
| rate [kg s^-2] | 2: `spring.energy`, `spring.rate` |
| wave speed [m s^-1] | 2: `sound.speed`, `wave.speed.electromagnetic` |
| effective length factor [1] | 2: `buckling.euler`, `buckling.johnson` |
| diameter [m] | 2: `torsion.solid`, `belt.speed` |
| shear modulus [kg m^-1 s^-2] | 2: `torsion.twist`, `spring.rate` |
| strain [1] | 2: `hooke`, `strain.gauge` |
| fibre volume fraction [1] | 2: `composite.rule-of-mixtures`, `composite.transverse` |
| matrix modulus [kg m^-1 s^-2] | 2: `composite.rule-of-mixtures`, `composite.transverse` |
| rating life [1] | 2: `bearing.life.l10`, `bearing.life.hours` |
| wire diameter [m] | 2: `spring.rate`, `spring.torsion.rate` |
| mean coil diameter [m] | 2: `spring.rate`, `spring.torsion.rate` |
| chain speed [m s^-1] | 2: `chain.speed`, `chain.pull` |
| nominal diameter [m] | 2: `bolt.torque.nut-factor`, `bolt.tensile-stress-area` |
| lead [m] | 2: `screw.force`, `screw.efficiency` |
| torque constant [kg m^2 s^-2 A^-1] | 2: `motor.torque`, `motor.time-constant` |
| back-emf constant [kg m^2 s^-2 A^-1] | 2: `motor.back-emf`, `motor.current` |
| winding resistance [kg m^2 s^-3 A^-2] | 2: `motor.current`, `motor.time-constant` |
| capacitance [kg^-1 m^-2 s^4 A^2] | 2: `rc.time-constant`, `capacitor.energy` |
| pull [kg m s^-2] | 2: `electrostatic.pull`, `magnetic.pull` |
| temperature excess [K] | 2: `convection`, `convection.natural` |
| conductivity [kg m s^-3 K^-1] | 2: `conduction`, `thermal.resistance.conduction` |
| thickness [m] | 2: `conduction`, `thermal.resistance.conduction` |
| size [m] | 2: `convection.natural`, `reynolds` |
| emissivity [1] | 2: `radiation`, `radiation.linear` |
| specific heat [m^2 s^-2 K^-1] | 2: `heat.capacity`, `lumped.time-constant` |
| activation energy [kg m^2 s^-2] | 2: `arrhenius`, `arrhenius.ratio` |
| rate [s^-1] | 2: `arrhenius`, `power.molar` |
| pressure [kg m^-1 s^-2] | 2: `ideal.gas`, `gas.concentration` |
| drag [kg m s^-2] | 2: `drag.aero`, `stokes.drag` |
| pressure drop [kg m^-1 s^-2] | 2: `darcy-weisbach`, `poiseuille` |
| speed upstream [m s^-1] | 2: `bernoulli`, `continuity` |
| speed downstream [m s^-1] | 2: `bernoulli`, `continuity` |
| turns [1] | 2: `ampere.law`, `faraday.induction` |
| current density [m^-2 A] | 2: `butler-volmer`, `faraday.flux` |
| extent x [m] | 2: `mass.prism`, `extent.from-mass` |
| extent z [m] | 2: `mass.prism`, `extent.from-mass` |
| station from mid-span [m] | 2: `beam.simply-supported.central-patch.moment`, `beam.overhang.self-moment` |
| total length [m] | 2: `beam.overhang.self-moment`, `beam.overhang.self-sag` |
| reach of the load from the root [m] | 2: `cantilever.root-moment`, `cantilever.tip-sag` |
| tensile stress area [m^2] | 2: `bolt.tensile-stress-area`, `bolt-group.tension` |
| tensile capacity of the group [kg m s^-2] | 2: `bolt-group.tension`, `bolt-group.bending` |
| release angle [1] | 2: `pendulum.period-factor`, `pendulum.amplitude-factor` |
| period factor [1] | 2: `pendulum.period-factor`, `pendulum.amplitude-factor` |
| flow in [m^3 s^-1] | 2: `balance.steady`, `balance.difference` |
| residence time [s] | 2: `residence.stock`, `residence.mass` |
| stock [kg] | 2: `residence.mass`, `loss.first-order` |
| concentration [m^-3] | 2: `amount.concentration`, `gas.concentration` |
| energy a mole [kg m^2 s^-2] | 2: `power.molar`, `reaction.rate-from-power` |
| extent [m] | 2: `volume.ellipsoid`, `volume.of-box` |
| width [m] | 2: `volume.ellipsoid`, `volume.of-box` |
| surface [m^2] | 2: `area.sphere-of-volume`, `area.shaped` |
| viscosity [kg m^-1 s^-1] | 2: `poiseuille`, `stokes.drag` |
| concentration at the surface [m^-3] | 2: `diffusion.front`, `diffusion.sphere-limit` |
| vapour pressure [kg m^-1 s^-2] | 2: `vapour.pressure`, `humidity.vapour-pressure` |
| hazard at age nought [s^-1] | 2: `mortality.gompertz`, `life.expectancy.gompertz-makeham` |
| gompertz rate [s^-1] | 2: `mortality.gompertz`, `life.expectancy.gompertz-makeham` |
| hazard [s^-1] | 2: `mortality.gompertz`, `hazard.dose` |
| dose rate [m^2 s^-3] | 2: `dose.time`, `hazard.dose` |

### One letter, different things

53 symbols stand for quantities of different dimensions in different laws: joining laws by the letter would join the wrong things, so they are joined by the quantity.

| Symbol | Means |
| --- | --- |
| n | layers [1]; safety factor [1]; speed [s^-1]; active coils [1]; links, the ground among them [1]; ideality factor [1]; … |
| P | power [kg m^2 s^-3]; load [kg m s^-2]; end load [kg m s^-2]; buckling load [kg m s^-2]; critical load [kg m s^-2]; equivalent dynamic load [kg m s^-2]; … |
| E | kinetic energy [kg m^2 s^-2]; potential energy [kg m^2 s^-2]; energy [kg m^2 s^-2]; stored energy [kg m^2 s^-2]; modulus [kg m^-1 s^-2]; elastic modulus [kg m^-1 s^-2]; … |
| L | length [m]; leg length [m]; span [m]; weld length [m]; rating life [1]; run length [m]; … |
| V | voltage per layer [kg m^2 s^-3 A^-1]; voltage [kg m^2 s^-3 A^-1]; applied voltage [kg m^2 s^-3 A^-1]; cell voltage [kg m^2 s^-3 A^-1]; supply voltage [kg m^2 s^-3 A^-1]; forward voltage [kg m^2 s^-3 A^-1]; … |
| a | acceleration [m s^-2]; deceleration [m s^-2]; hill force constant [kg m s^-2]; leg [m]; crack length [m]; albedo (reflected share) [1]; … |
| v | speed [m s^-1]; most speed [m s^-1]; impact speed [m s^-1]; common speed after [m s^-1]; shortening speed [m s^-1]; chain speed [m s^-1]; … |
| A | section area [m^2]; section [m^2]; plate area [m^2]; area [m^2]; pre-exponential factor [s^-1]; frontal area [m^2]; … |
| Q | heat [kg m^2 s^-2]; heat input [kg m s^-2]; heat in [kg m^2 s^-2]; reaction quotient [1]; flow out [m^3 s^-1]; flow through [m^3 s^-1]; … |
| p | internal pressure [kg m^-1 s^-2]; life exponent [1]; pitch [m]; pressure [kg m^-1 s^-2]; stored pressure [kg m^-1 s^-2]; gauge pressure [kg m^-1 s^-2]; … |
| m | mass [kg]; calcium oxide [kg]; module [m]; mass per area [kg m^-2]; mass crossing [kg s^-1]; mass of all [kg]; … |
| T | torque [kg m^2 s^-2]; axle torque [kg m^2 s^-2]; period [s]; input torque [kg m^2 s^-2]; wrench torque [kg m^2 s^-2]; temperature [K]; … |
| r | wheel radius [m]; radius [m]; distance from its centre [m]; radius of gyration [m]; mean radius [m]; tension ratio [1]; … |
| R | bend radius [m]; sphere radius [m]; resistance [kg m^2 s^-3 A^-2]; winding resistance [kg m^2 s^-3 A^-2]; gauge resistance [kg m^2 s^-3 A^-2]; sum of thermal resistances [kg^-1 m^-2 s^3 K]; … |
| k | stiffness [kg s^-2]; rate [kg s^-2]; clock rate against far away [1]; print scale [1]; rate [kg m^2 s^-2]; conductivity [kg m s^-3 K^-1]; … |
| sigma | allowable stress [kg m^-1 s^-2]; stress [kg m^-1 s^-2]; hoop stress [kg m^-1 s^-2]; normal stress [kg m^-1 s^-2]; fracture stress [kg m^-1 s^-2]; yield strength [kg m^-1 s^-2]; … |
| M | mass [kg]; bending moment [kg m^2 s^-2]; degrees of freedom [1]; molar mass [kg]; root moment [kg m^2 s^-2]; whole [kg]; … |
| D | mean coil diameter [m]; diameter [m]; bore [m]; diffusion coefficient [m^2 s^-1]; aperture diameter [m]; diffusivity [m^2 s^-1]; … |
| N | normal force [kg m s^-2]; load on driven wheels [kg m s^-2]; active turns [1]; turns [1]; number of choices [1]; amount left [1]; … |
| C | basic dynamic load rating [kg m s^-2]; capacitance [kg^-1 m^-2 s^4 A^2]; switched capacitance [kg^-1 m^-2 s^4 A^2]; capacity (bits per second) [s^-1]; concentration at the surface [m^-3]; at that depth [1]; … |
| mu | friction coefficient [1]; tyre-road friction [1]; tyre friction [1]; permeability [kg m s^-2 A^-2]; dynamic viscosity [kg m^-1 s^-1]; viscosity [kg m^-1 s^-1]; … |
| h | height [m]; rating life [s]; heat transfer coefficient [kg s^-3 K^-1]; depth [m]; relative humidity [1]; both [kg s^-3 K^-1]; … |
| f | frequency [s^-1]; clock rate [s^-1]; darcy friction factor [1]; period factor [1]; share taken back [1]; rate over its rate at the reference [1]; … |
| x | deflection [m]; share left (mole fraction) [1]; distance [m]; extent x [m]; depth of the front [m]; depth [m]; … |
| q | heat flow [kg m^2 s^-3]; net heat flow [kg m^2 s^-3]; weight per length [kg s^-2]; flow of one [m^3 s^-1]; flow a kilogram [kg^-1 m^3 s^-1]; rate a volume [m^-3 s^-1]; … |
| W | weight [kg m s^-2]; least work a mole [kg m^2 s^-2]; work out [kg m^2 s^-2]; work [kg m^2 s^-2]; time in the system [s]; self weight [kg m s^-2] |
| w | angular speed [s^-1]; load per length [kg s^-2]; speed [s^-1]; patch width [m]; share [1]; mass share of the first [1] |
| I | moment of inertia [kg m^2]; second moment [m^4]; least second moment [m^4]; current [A]; moment of inertia about the centre [kg m^2]; moment of inertia about the pivot [kg m^2] |
| c | wave speed [m s^-1]; specific heat [m^2 s^-2 K^-1]; concentration [m^-3]; held [m^-3]; height [m]; concentration of particles [m^-3] |
| b | hill speed constant [m s^-1]; face width [m]; breadth [m]; extent across the swing, in its plane [m]; width [m]; fatigue strength exponent [1] |
| J | polar moment [m^4]; inertia [kg m^2]; flux [m^-2 s^-1]; flux [kg m^-2 s^-1]; filtration rate [m^3 s^-1]; molar flux [m^-2 s^-1] |
| rho | density [kg m^-3]; resistivity [kg m^3 s^-3 A^-2]; air density [kg m^-3]; fluid density [kg m^-3]; density of the metal [kg m^-3] |
| tau | surface shear stress [kg m^-1 s^-2]; throat shear [kg m^-1 s^-2]; shear stress [kg m^-1 s^-2]; time constant [s]; residence time [s] |
| t | wall [m]; time [s]; half-life [s]; age [s]; whole time [s] |
| eps | strain [1]; permittivity [kg^-1 m^-3 s^4 A^2]; emissivity [1]; capillary porosity [1]; paste porosity [1] |
| z | sprocket teeth [1]; electrons transferred [1]; electrons per ion [1]; extent z [m]; charge [1] |
| B | flux density [kg s^-2 A^-1]; flux density in the gap [kg s^-2 A^-1]; field inside [kg s^-2 A^-1]; bandwidth [s^-1]; resting power [kg m^2 s^-3] |
| S | section modulus i/c [m^3]; seebeck coefficient [kg m^2 s^-3 A^-1 K^-1]; substrate concentration [m^-3]; section modulus [m^3] |
| G | shear modulus [kg m^-1 s^-2]; irradiance [kg s^-3]; sunlight [kg s^-3]; gompertz rate [s^-1] |
| s | transition slenderness [1]; equivalent stress [kg m^-1 s^-2]; linear sintering shrinkage [1]; shape factor [1] |
| alpha | expansion coefficient [K^-1]; thread half-angle [1]; fraction switching each cycle [1]; degree of hydration [1] |
| eta | efficiency [1]; most efficiency [1]; arc efficiency [1]; overpotential [kg m^2 s^-3 A^-1] |
| gamma | surface energy [kg s^-2]; length ratio [1]; surface tension [kg s^-2] |
| i | ratio [1]; current density [m^-2 A]; corrosion current density [m^-2 A] |
| lambda | length constant [m]; wavelength [m]; arrival rate [s^-1] |
| r1 | rate of one [s^-1]; radius of one branch [m]; one rate [s^-1] |
| e | specific energy [m^2 s^-2]; years left [s] |
| dv | velocity gained [m s^-1]; change of specific volume [kg^-1 m^3] |
| Mp | plastic moment [kg m^2 s^-2]; molar mass of the product [kg] |
| T0 | reference temperature [K]; small-swing period [s] |
| Rm | resistance per metre [kg m s^-3 A^-2]; tensile strength of the bolt [kg m^-1 s^-2] |
| H | information (bits) [1]; height [m] |
| r2 | radius of the other [m]; other [s^-1] |

## Material tables and the code that reads them

| Table | Defined in | Holds | Read by |
| --- | --- | --- | --- |
| handbook materials | `src/data/materials.ts` | E, ν, yield, ultimate, elongation, conductivity, friction, restitution, colour; source and confidence; ids like steel.a36 | `nexus/blocks.ts`, `nexus/book/index.ts`, `nexus/generate.ts`, `nexus/loads.ts`, `nexus/machines.ts`, `nexus/navigate.ts`, `nexus/sim.ts` |
| thermal | `src/engineering/thermal.ts` | c, k, emissivity by handbook id | `engineering/dcmotor.ts`, `engineering/motorrun.ts`, `nexus/blocks.ts`, `nexus/generate.ts`, `nexus/heatflow.ts` |
| fusion | `src/engineering/fusion.ts` | melting, expansion, bond, base element by handbook id | `nexus/generate.ts` |
| density | `src/nexus/mass.ts` | density by the ids parts carry (typical) | `nexus/assembly.ts`, `nexus/blocks.ts`, `nexus/components.ts`, `nexus/drivetrain.ts`, `nexus/engines.ts`, `nexus/gauntlet.ts`, `nexus/kits.ts`, `nexus/loads.ts`, `nexus/machines.ts`, `nexus/view/kit3d.ts`, `nexus/view/nodes3d.ts` |
| composition | `src/nexus/elements.ts` | alloys, formulas, blends down to elements, by the ids parts carry | `nexus/inventory.ts`, `nexus/life/index.ts`, `nexus/pieces.ts` |
| service limit | `src/nexus/make/rules.ts` | most service temperature, °C, by the ids parts carry | `nexus/placement/line.ts`, `nexus/placement/model.ts`, `nexus/placement/repair.ts`, `nexus/placement/solve.ts` |
| strength map | `src/nexus/loads.ts` | part id → handbook grade for yield, ultimate, E (14 mapped) | `nexus/placement/line.ts` |
| friction map | `src/nexus/sim.ts` | part id → handbook grade for friction and bounce, by spelling | **nothing** |
| words to matter | `src/nexus/kinds/core.ts` | a word → inventory id, density, label | **nothing** |
| spring wires | `src/engineering/springs.ts` | ASTM spring wires: A, m, G, E, density | `nexus/blocks.ts`, `nexus/engines.ts`, `nexus/loads.ts` |
| adhesives | `src/engineering/joining.ts` | adhesives by the handbook categories | `nexus/generate.ts` |
| liquids | `src/engineering/motorrun.ts` | density, c, viscosity, k of four liquids | **nothing** |
| gases | `src/nexus/aware/gas.ts` | molar mass, smell, harm, flammable limits | `nexus/aware/sense.ts`, `nexus/navigate.ts` |
| edges | `src/nexus/finish.ts` | edge radius by material | **nothing** |

## Where numbers are solved for or stepped in time

The numeric layer is `src/nexus/numeric.ts`: each answer with its method, whether it converged, its steps and its error.

| What | Where | Through the numeric layer |
| --- | --- | --- |
| a law solved for an input | `src/nexus/law.ts` | yes |
| a law solved for an input (rearranged where it can be, else inverted) | `src/nexus/lawgraph.ts` | yes |
| internal rate of return | `src/nexus/blocks.ts` | yes |
| an integral in a term (Simpson's rule, its error by halving) | `src/nexus/evaluate.ts` | yes |
| a PID loop's plant stepped in time | `src/nexus/blocks.ts` | yes |
| roots, integrals, slopes and paths on a board | `src/nexus/blocks.ts` | yes |
| a battery drained | `src/engineering/battery.ts` | no: one step of charge counted (I dt over the capacity at that rate): no equation to solve |
| a motor run in time | `src/engineering/motorrun.ts` | no: its steps switch between spin-up and a steady state, with events (overheating, the rise time) and energy counted each step; kept until a stepper with events replaces it whole, its results held by the baseline |
| warming in substeps | `src/engineering/thermal.ts` | no: a frame's step of a part cooling, its sub-step limited so it never crosses the room's temperature: called each frame, not run over a span |
| heat through a grid | `src/nexus/heatflow.ts` | no: a field solver (implicit, Gauss–Seidel over cells), not one equation in time |

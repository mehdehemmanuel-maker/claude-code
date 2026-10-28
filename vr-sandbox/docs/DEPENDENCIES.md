# The dependency map

Written from the code by `tests/nexus/dependencies.test.ts` (step 0 of `docs/REALITY.md`); the test fails when it is out of date (`UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts`).

## Laws and the engines that hold them

241 laws in the book (terms: dimensions checked, domains, derivations); 241 of them nodes, built from the book (step 3: the closures that ran the first 144 are gone). In the book without a node: 0.

Each law's kind (`src/nexus/book/kinds.ts`): fundamental, a definition, derived, constitutive (how a material behaves), empirical (a fit), an approximation (another law in a limit), or geometry.

| Field | In the book | Nodes | Kinds |
| --- | --- | --- | --- |
| mechanics | 29 | 29 | 13 derived, 5 definition, 4 empirical, 3 fundamental, 3 geometry, 1 approximation |
| structures | 13 | 13 | 9 derived, 2 approximation, 1 definition, 1 empirical |
| materials | 12 | 12 | 3 constitutive, 3 derived, 2 empirical, 2 approximation, 2 geometry |
| machine elements | 16 | 16 | 8 derived, 3 geometry, 2 empirical, 2 definition, 1 approximation |
| electrical | 24 | 24 | 14 derived, 4 constitutive, 2 empirical, 2 definition, 2 fundamental |
| thermal | 17 | 17 | 4 fundamental, 4 derived, 3 empirical, 3 constitutive, 2 definition, 1 approximation |
| fluids | 12 | 12 | 4 derived, 3 empirical, 2 fundamental, 2 approximation, 1 definition |
| magnetism | 5 | 5 | 2 fundamental, 2 derived, 1 approximation |
| information | 7 | 7 | 4 fundamental, 1 definition, 1 empirical, 1 derived |
| chemistry | 6 | 6 | 3 derived, 1 constitutive, 1 definition, 1 fundamental |
| optics | 3 | 3 | 2 derived, 1 fundamental |
| derived (slice) | 22 | 22 | 14 derived, 5 geometry, 3 approximation |
| universal | 75 | 75 | 25 definition, 15 derived, 11 geometry, 11 empirical, 6 fundamental, 5 approximation, 2 constitutive |
| all | 241 | 241 | 92 derived, 40 definition, 29 empirical, 25 fundamental, 24 geometry, 18 approximation, 13 constitutive |

### mechanics

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `newton.second` Newton's second law | fundamental | m: mass, kg; a: acceleration, m/s^2 | F: net force, N | book, node |
| `weight` Weight | definition | m: mass, kg; g: gravity, m/s^2 | W: weight, N | book, node |
| `friction.coulomb` Coulomb friction | empirical | mu: friction coefficient, -; N: normal force, N | F: friction force (limit), N | book, node |
| `rolling.resistance` Rolling resistance | empirical | Crr: rolling resistance coefficient, -; N: normal force, N | F: rolling resistance, N | book, node |
| `grade.force` Grade resistance | derived | m: mass, kg; theta: slope angle, rad | F: grade force, N | book, node |
| `power.linear` Power of a force | definition | F: force, N; v: speed, m/s | P: power, W | book, node |
| `power.rotary` Power of a torque | definition | T: torque, N m; w: angular speed, rad/s | P: power, W | book, node |
| `wheel.torque` Torque at a wheel | definition | F: tractive force, N; r: wheel radius, m | T: axle torque, N m | book, node |
| `traction.limit` Traction limit | empirical | mu: tyre-road friction, -; N: load on driven wheels, N | F: most tractive force, N | book, node |
| `energy.kinetic` Kinetic energy | derived | m: mass, kg; v: speed, m/s | E: kinetic energy, J | book, node |
| `energy.potential` Gravitational potential energy | derived | m: mass, kg; h: height, m | E: potential energy, J | book, node |
| `braking.distance` Stopping distance | derived | v: speed, m/s; a: deceleration, m/s^2 | d: distance, m | book, node |
| `cornering.limit` Cornering speed limit | derived | mu: tyre friction, -; R: bend radius, m | v: most speed, m/s | book, node |
| `pendulum.period` Pendulum period | approximation | L: length, m | T: period, s | book, node |
| `natural.frequency` Natural frequency of a mass on a spring | derived | k: stiffness, N/m; m: mass, kg | f: frequency, Hz | book, node |
| `centripetal` Centripetal force | derived | m: mass, kg; v: speed, m/s; r: radius, m | F: centripetal force, N | book, node |
| `inertia.disc` Moment of inertia of a disc | geometry | m: mass, kg; r: radius, m | I: moment of inertia, kg m^2 | book, node |
| `inertia.rod-end` Moment of inertia of a rod about its end | geometry | m: mass, kg; L: length, m | I: moment of inertia, kg m^2 | book, node |
| `parallel-axis` Parallel axis theorem | geometry | Icm: inertia about the centre of mass, kg m^2; m: mass, kg; d: offset, m | I: moment of inertia, kg m^2 | book, node |
| `energy.rotational` Rotational kinetic energy | derived | I: moment of inertia, kg m^2; w: angular speed, rad/s | E: energy, J | book, node |
| `free-fall.speed` Speed after a fall | derived | h: height, m | v: impact speed, m/s | book, node |
| `flywheel.specific-energy` Energy a flywheel can hold per kilogram | derived | K: shape factor, -; sigma: allowable stress, Pa; rho: density, kg/m^3 | e: specific energy, J/kg | book, node |
| `spring.energy` Energy in a spring | derived | k: rate, N/m; x: deflection, m | E: stored energy, J | book, node |
| `time.dilation.gravity` Gravitational time dilation | fundamental | M: mass, kg; r: distance from its centre, m | k: clock rate against far away, - | book, node |
| `sound.speed` Speed of a longitudinal wave in a bar | derived | E: modulus, Pa; rho: density, kg/m^3 | c: wave speed, m/s | book, node |
| `conservation.momentum` Conservation of momentum (two bodies that stick) | fundamental | m1: mass, kg; v1: speed, m/s; m2: mass, kg; v2: speed, m/s | v: common speed after, m/s | book, node |
| `hill.muscle` Hill's muscle equation | empirical | F0: isometric force, N; a: Hill force constant, N; b: Hill speed constant, m/s; v: shortening speed, m/s | F: force, N | book, node |
| `froude` Froude number of a gait | definition | v: speed, m/s; L: leg length, m | Fr: Froude number, - | book, node |
| `tsiolkovsky` Rocket equation | derived | ve: exhaust speed, m/s; m0: initial mass, kg; m1: final mass, kg | dv: velocity gained, m/s | book, node |

### structures

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `stress.axial` Axial stress | definition | F: force, N; A: section area, m^2 | sigma: stress, Pa | book, node |
| `stress.bending` Bending stress | derived | M: bending moment, N m; S: section modulus I/c, m^3 | sigma: stress, Pa | book, node |
| `beam.simply-supported.udl` Sag of a simply supported beam under a spread load | derived | w: load per length, N/m; L: span, m; E: modulus, Pa; I: second moment, m^4 | d: mid-span sag, m | book, node |
| `beam.simply-supported.point` Sag of a simply supported beam under a central load | derived | P: load, N; L: span, m; E: modulus, Pa; I: second moment, m^4 | d: mid-span sag, m | book, node |
| `beam.cantilever.point` Deflection of a cantilever under an end load | derived | P: end load, N; L: length, m; E: modulus, Pa; I: second moment, m^4 | d: tip deflection, m | book, node |
| `buckling.euler` Euler buckling | derived | E: modulus, Pa; I: least second moment, m^4; L: length, m; K: effective length factor, - | P: buckling load, N | book, node |
| `torsion.solid` Shear stress in a twisted round shaft | derived | T: torque, N m; d: diameter, m | tau: surface shear stress, Pa | book, node |
| `torsion.twist` Angle of twist | derived | T: torque, N m; L: length, m; G: shear modulus, Pa; J: polar moment, m^4 | theta: twist, rad | book, node |
| `buckling.johnson` Johnson column formula | empirical | A: section area, m^2; Sy: yield strength, Pa; E: modulus, Pa; K: effective length factor, -; L: length, m; r: radius of gyration, m | P: critical load, N | book, node |
| `slenderness.transition` Euler-Johnson transition slenderness | derived | E: modulus, Pa; Sy: yield strength, Pa | s: transition slenderness, - | book, node |
| `stress.hoop` Hoop stress in a thin-walled cylinder | approximation | p: internal pressure, Pa; r: mean radius, m; t: wall, m | sigma: hoop stress, Pa | book, node |
| `weld.fillet.shear` Shear in a fillet weld | approximation | F: load, N; a: leg, m; L: weld length, m | tau: throat shear, Pa | book, node |
| `beam.plastic-moment` Plastic moment of a section | derived | Z: plastic section modulus, m^3; Sy: yield stress, Pa | Mp: plastic moment, N m | book, node |

### materials

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `hooke` Hooke's law | constitutive | E: elastic modulus, Pa; eps: strain, - | sigma: stress, Pa | book, node |
| `stress.von-mises` Von Mises stress | derived | sigma: normal stress, Pa; tau: shear stress, Pa | s: equivalent stress, Pa | book, node |
| `thermal.expansion` Thermal expansion | constitutive | alpha: expansion coefficient, 1/K; L: length, m; dT: temperature rise, K | dL: growth, m | book, node |
| `fatigue.endurance.steel` Endurance limit of steel | empirical | Sut: tensile strength, Pa | Se: rotating-beam endurance limit, Pa | book, node |
| `composite.rule-of-mixtures` Rule of mixtures (along the fibre) | approximation | Vf: fibre volume fraction, -; Ef: fibre modulus, Pa; Em: matrix modulus, Pa | E: longitudinal modulus, Pa | book, node |
| `composite.transverse` Inverse rule of mixtures (across the fibre) | approximation | Vf: fibre volume fraction, -; Ef: fibre modulus (transverse), Pa; Em: matrix modulus, Pa | E: transverse modulus, Pa | book, node |
| `sinter.scale` Scale-up for sintering shrinkage | geometry | s: linear sintering shrinkage, - | k: print scale, - | book, node |
| `piezo.stroke` Piezo stack stroke | constitutive | n: layers, -; d33: piezoelectric charge constant, m/V; V: voltage per layer, V | dL: free stroke, m | book, node |
| `young.contact` Contact angle (Young) | derived | gsv: solid-vapour surface energy, J/m^2; gsl: solid-liquid surface energy, J/m^2; glv: liquid surface tension, J/m^2 | theta: contact angle, rad | book, node |
| `carbonation.capacity` Carbon dioxide a lime can hold | geometry | m: calcium oxide, kg | mCO2: CO₂ held for good, kg | book, node |
| `griffith` Griffith criterion | derived | E: Young's modulus, Pa; gamma: surface energy, J/m^2; a: crack length, m | sigma: fracture stress, Pa | book, node |
| `hall-petch` Hall-Petch relation | empirical | sigma0: friction stress, Pa; ky: Hall-Petch coefficient, Pa m^0.5; d: grain size, m | sigma: yield strength, Pa | book, node |

### machine elements

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `shaft.diameter.static` Shaft diameter for bending and torque (static) | derived | M: bending moment, N m; T: torque, N m; n: safety factor, -; Sy: yield strength, Pa | d: least diameter, m | book, node |
| `bearing.life.l10` Bearing rating life (L10) | empirical | C: basic dynamic load rating, N; P: equivalent dynamic load, N; p: life exponent, - | L: rating life, rev | book, node |
| `bearing.life.hours` Bearing life in hours | definition | L: rating life, rev; n: speed, rpm | h: rating life, h | book, node |
| `spring.rate` Helical spring rate | derived | G: shear modulus, Pa; d: wire diameter, m; D: mean coil diameter, m; n: active coils, - | k: rate, N/m | book, node |
| `capstan` Capstan (belt friction) equation | derived | mu: friction coefficient, -; theta: wrap angle, rad | r: tension ratio, - | book, node |
| `chain.speed` Chain speed | geometry | z: sprocket teeth, -; p: pitch, m; n: speed, rpm | v: chain speed, m/s | book, node |
| `chain.pull` Chain pull | definition | P: power, W; v: chain speed, m/s | F: tight-side pull, N | book, node |
| `gear.output.torque` Torque through a gear train | derived | T: input torque, N m; i: ratio, -; eta: efficiency, - | Tout: output torque, N m | book, node |
| `bolt.torque.nut-factor` Bolt tightening torque (nut factor) | empirical | K: nut factor, -; F: preload, N; d: nominal diameter, m | T: wrench torque, N m | book, node |
| `belt.speed` Belt or rim speed | geometry | D: diameter, m; n: speed, rpm | v: rim speed, m/s | book, node |
| `screw.force` Force from a power screw | derived | T: torque, N m; eta: efficiency, -; l: lead, m | F: axial force, N | book, node |
| `gear.lewis` Gear tooth bending stress (Lewis) | approximation | Wt: tangential load, N; b: face width, m; m: module, m; Y: Lewis form factor, - | sigma: root bending stress, Pa | book, node |
| `spring.torsion.rate` Helical torsion spring rate | derived | d: wire diameter, m; D: mean coil diameter, m; N: active turns, -; E: modulus, Pa | k: rate, N m/rad | book, node |
| `screw.efficiency` Efficiency of a power screw | derived | l: lead, m; d2: pitch diameter, m; mu: friction coefficient, -; alpha: thread half-angle, rad | eta: efficiency, - | book, node |
| `hertz.contact` Hertzian contact (a sphere on a flat) | derived | F: load, N; Estar: contact modulus, Pa; R: sphere radius, m | p0: peak contact pressure, Pa | book, node |
| `grubler` Gruebler's equation (planar) | geometry | n: links, the ground among them, -; j1: full joints (pins, sliders), -; j2: half joints (cam, gear contacts), - | M: degrees of freedom, - | book, node |

### electrical

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `ohm` Ohm's law | constitutive | I: current, A; R: resistance, ohm | V: voltage, V | book, node |
| `joule` Joule heating | derived | I: current, A; R: resistance, ohm | P: heat, W | book, node |
| `wire.resistance` Resistance of a wire | constitutive | rho: resistivity, ohm m; L: length, m; A: section, m^2 | R: resistance, ohm | book, node |
| `copper.tempco` Copper's resistance with temperature | empirical | R0: resistance at T0, ohm; T: temperature, degC; T0: reference temperature, degC | R: resistance, ohm | book, node |
| `wire.drop` Voltage drop along a pair | derived | I: current, A; L: run length, m; Rm: resistance per metre, ohm/m | dV: drop, V | book, node |
| `motor.torque` DC motor torque | derived | Kt: torque constant, N m/A; I: current, A | T: torque, N m | book, node |
| `motor.back-emf` Back-EMF | derived | Ke: back-EMF constant, V s/rad; w: speed, rad/s | E: back-EMF, V | book, node |
| `motor.current` DC motor current | derived | V: applied voltage, V; Ke: back-EMF constant, V s/rad; w: speed, rad/s; R: winding resistance, ohm | I: current, A | book, node |
| `motor.time-constant` Mechanical time constant | derived | R: winding resistance, ohm; J: inertia, kg m^2; Kt: torque constant, N m/A | tau: time constant, s | book, node |
| `lead-acid.ocv` Lead-acid open-circuit voltage | empirical | SG: specific gravity of the acid, - | V: cell voltage, V | book, node |
| `energy.electric` Electrical energy | derived | V: voltage, V; I: current, A; t: time, s | E: energy, J | book, node |
| `rc.time-constant` RC time constant | derived | R: resistance, ohm; C: capacitance, F | tau: time constant, s | book, node |
| `capacitor.energy` Energy in a capacitor | derived | C: capacitance, F; V: voltage, V | E: stored energy, J | book, node |
| `inductor.energy` Energy in an inductor | derived | L: inductance, H; I: current, A | E: stored energy, J | book, node |
| `power.electric` Electrical power | definition | V: voltage, V; I: current, A | P: power, W | book, node |
| `electrostatic.pull` Electrostatic pull between plates | derived | er: relative permittivity, -; A: plate area, m^2; V: voltage, V; d: gap, m | F: pull, N | book, node |
| `cmos.dynamic` Switching power of CMOS logic | derived | alpha: fraction switching each cycle, -; C: switched capacitance, F; V: supply voltage, V; f: clock rate, Hz | P: dynamic power, W | book, node |
| `seebeck` Seebeck voltage (thermocouple) | constitutive | S: Seebeck coefficient, V/K; dT: temperature difference, K | V: voltage, V | book, node |
| `strain.gauge` Strain gauge | constitutive | GF: gauge factor, -; eps: strain, -; R: gauge resistance, ohm | dR: change in resistance, ohm | book, node |
| `pv.power` Solar cell power | definition | eta: efficiency, -; G: irradiance, W/m^2; A: area, m^2 | P: electric power, W | book, node |
| `coulomb.law` Coulomb's law | fundamental | q1: charge, C; q2: charge, C; r: distance, m | F: force, N | book, node |
| `shockley.diode` Shockley diode equation | derived | Is: saturation current, A; V: forward voltage, V; n: ideality factor, -; Vt: thermal voltage k T / q, V | I: current, A | book, node |
| `wave.speed.electromagnetic` Speed of an electromagnetic wave | fundamental | mu: permeability, N/A^2; eps: permittivity, F/m | v: wave speed, m/s | book, node |
| `cable.equation` Cable equation (the length constant) | derived | rm: leak resistance of a unit length, ohm m; ri: inner resistance per length, ohm/m | lambda: length constant, m | book, node |

### thermal

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `convection` Newton's law of cooling | empirical | h: heat transfer coefficient, W/m^2 K; A: area, m^2; dT: temperature excess, K | q: heat flow, W | book, node |
| `conduction` Fourier's law | constitutive | k: conductivity, W/m K; A: area, m^2; dT: temperature difference, K; L: thickness, m | q: heat flow, W | book, node |
| `convection.natural` Free convection in still air | empirical | dT: temperature excess, K; L: size, m | h: heat transfer coefficient, W/m^2 K | book, node |
| `radiation` Stefan-Boltzmann radiation | fundamental | eps: emissivity, -; A: area, m^2; T: surface temperature, K; Tinf: surroundings, K | q: net heat flow, W | book, node |
| `heat.capacity` Heat capacity | constitutive | m: mass, kg; c: specific heat, J/kg K; dT: temperature rise, K | Q: heat, J | book, node |
| `lumped.time-constant` Lumped thermal time constant | approximation | m: mass, kg; c: specific heat, J/kg K; h: heat transfer coefficient, W/m^2 K; A: area, m^2 | tau: time constant, s | book, node |
| `thermal.network` Temperature rise through thermal resistances | derived | P: heat flow, W; R: sum of thermal resistances, K/W | dT: temperature rise, K | book, node |
| `thermal.resistance.conduction` Thermal resistance of a wall | derived | L: thickness, m; k: conductivity, W/m K; A: area, m^2 | R: thermal resistance, K/W | book, node |
| `carnot` Carnot efficiency | fundamental | Tc: cold side, K; Th: hot side, K | eta: most efficiency, - | book, node |
| `weld.heat-input` Arc welding heat input | definition | eta: arc efficiency, -; V: arc voltage, V; I: current, A; v: travel speed, m/s | Q: heat input, J/m | book, node |
| `arrhenius` Arrhenius rate | empirical | A: pre-exponential factor, 1/s; Ea: activation energy, J/mol; T: temperature, K | k: rate, 1/s | book, node |
| `absorbed.solar` Sunlight a surface absorbs | definition | a: albedo (reflected share), -; G: sunlight, W/m^2; A: area, m^2 | P: absorbed power, W | book, node |
| `separation.work` Least work to take out a trace | derived | T: temperature, K; x: share left (mole fraction), - | W: least work a mole, J/mol | book, node |
| `ideal.gas` Ideal gas law | constitutive | n: amount, mol; T: temperature, K; V: volume, m^3 | p: pressure, Pa | book, node |
| `clausius-clapeyron` Clausius-Clapeyron relation | derived | L: latent heat, J/kg; T: temperature, K; dv: change of specific volume, m^3/kg | dpdT: slope of the boundary, Pa/K | book, node |
| `boltzmann.distribution` Boltzmann distribution | fundamental | dE: energy above the ground state, J; T: temperature, K | ratio: population ratio, - | book, node |
| `first.law` First law of thermodynamics | fundamental | Q: heat in, J; W: work out, J | dU: change in internal energy, J | book, node |

### fluids

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `drag.aero` Aerodynamic drag | empirical | rho: air density, kg/m^3; Cd: drag coefficient, -; A: frontal area, m^2; v: speed, m/s | F: drag, N | book, node |
| `lift.aero` Aerodynamic lift | empirical | rho: fluid density, kg/m^3; CL: lift coefficient, -; A: planform area, m^2; v: speed, m/s | L: lift, N | book, node |
| `gas.isothermal-work` Work in a compressed gas (isothermal) | derived | p: stored pressure, Pa; V: stored volume, m^3; p0: pressure let down to, Pa | W: work, J | book, node |
| `reynolds` Reynolds number | definition | rho: density, kg/m^3; v: speed, m/s; L: size, m; mu: dynamic viscosity, Pa s | Re: Reynolds number, - | book, node |
| `darcy-weisbach` Pressure drop in a pipe (Darcy-Weisbach) | empirical | f: Darcy friction factor, -; L: length, m; D: bore, m; rho: density, kg/m^3; v: mean speed, m/s | dp: pressure drop, Pa | book, node |
| `buoyancy` Archimedes' principle | fundamental | rho: fluid density, kg/m^3; V: displaced volume, m^3 | F: buoyancy, N | book, node |
| `hydrostatic` Hydrostatic pressure | derived | rho: density, kg/m^3; h: depth, m | p: gauge pressure, Pa | book, node |
| `thrust.ideal-static` Ideal static thrust of a rotor (momentum theory) | approximation | rho: fluid density, kg/m^3; A: disc area, m^2; P: shaft power, W | T: thrust, N | book, node |
| `acoustic.mass-law` Sound insulation of a wall (mass law) | approximation | m: mass per area, kg/m^2; f: frequency, Hz | TL: transmission loss, dB | book, node |
| `diffusion.time` Time to diffuse a distance | derived | x: distance, m; D: diffusion coefficient, m^2/s | t: time, s | book, node |
| `bernoulli` Bernoulli's equation | derived | p1: pressure upstream, Pa; rho: density, kg/m^3; v1: speed upstream, m/s; v2: speed downstream, m/s | p2: pressure downstream, Pa | book, node |
| `continuity` Continuity equation | fundamental | v1: speed upstream, m/s; A1: area upstream, m^2; A2: area downstream, m^2 | v2: speed downstream, m/s | book, node |

### magnetism

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `lorentz.force` Lorentz force on a conductor | fundamental | B: flux density, T; I: current, A; L: conductor length in the field, m | F: force, N | book, node |
| `magnetic.pull` Magnetic pull across a gap (Maxwell) | derived | B: flux density in the gap, T; A: pole face area, m^2 | F: pull, N | book, node |
| `skin.depth` Skin depth | derived | f: frequency, Hz; sigma: conductivity, S/m | delta: skin depth, m | book, node |
| `ampere.law` Ampère's law (a long solenoid) | approximation | N: turns, -; I: current, A; L: coil length, m | B: field inside, T | book, node |
| `faraday.induction` Faraday's law of induction | fundamental | N: turns, -; A: loop area, m^2; dBdt: rate of change of the field, T/s | V: induced voltage, V | book, node |

### information

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `landauer` Landauer's limit | fundamental | T: temperature, K | E: least energy per bit erased, J | book, node |
| `information.choices` Information in a choice | definition | N: number of choices, - | H: information (bits), - | book, node |
| `rayleigh.resolution` Resolution of optical lithography (Rayleigh) | empirical | k1: process factor, -; lambda: wavelength, m; NA: numerical aperture, - | CD: smallest half-pitch, m | book, node |
| `diffraction.limit` Diffraction limit of an aperture | derived | lambda: wavelength, m; D: aperture diameter, m | theta: smallest angle resolved, rad | book, node |
| `shannon.capacity` Shannon capacity | fundamental | B: bandwidth, Hz; snr: signal to noise power ratio, - | C: capacity (bits per second), Hz | book, node |
| `shannon.sampling` Nyquist-Shannon sampling theorem | fundamental | fmax: highest frequency in the signal, Hz | fs: least sampling rate, Hz | book, node |
| `queueing` Little's law | fundamental | lambda: arrival rate, 1/s; W: time in the system, s | L: items in the system, - | book, node |

### chemistry

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `fick.diffusion` Fick's law of diffusion | constitutive | D: diffusivity, m^2/s; dC: concentration difference, mol/m^3; L: distance, m | J: flux, mol/m^2 s | book, node |
| `nernst` Nernst equation | derived | E0: standard potential, V; T: temperature, K; z: electrons transferred, -; Q: reaction quotient, - | E: potential, V | book, node |
| `gibbs.energy` Gibbs free energy | definition | dH: enthalpy change, J/mol; T: temperature, K; dS: entropy change, J/mol K | dG: free energy change, J/mol | book, node |
| `michaelis-menten` Michaelis-Menten kinetics | derived | Vmax: maximum rate, mol/m^3 s; S: substrate concentration, mol/m^3; Km: Michaelis constant, mol/m^3 | v: rate, mol/m^3 s | book, node |
| `faraday.electrolysis` Faraday's laws of electrolysis | fundamental | M: molar mass, kg/mol; I: current, A; t: time, s; z: electrons per ion, - | m: mass, kg | book, node |
| `butler-volmer` Butler-Volmer equation | derived | i0: exchange current density, A/m^2; eta: overpotential, V; Vt: thermal voltage R T / F, V; alphaA: anodic transfer coefficient, -; alphaC: cathodic transfer coefficient, - | i: current density, A/m^2 | book, node |

### optics

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `planck.energy` Planck relation | fundamental | lambda: wavelength, m | E: photon energy, J | book, node |
| `snell.law` Snell's law | derived | n1: index of the first medium, -; n2: index of the second, -; theta1: angle of incidence, rad | theta2: angle of refraction, rad | book, node |
| `bragg.law` Bragg's law | derived | d: plane spacing, m; theta: glancing angle, rad; n: order, - | lambda: wavelength, m | book, node |

### derived (slice)

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `mass.prism` Mass of a rectangular prism | derived | rho: density, kg/m^3; x: extent x, m; y: extent y, m; z: extent z, m | m: mass, kg | book, node |
| `extent.from-mass` Height of a prism of given mass and footprint | derived | m: mass, kg; rho: density, kg/m^3; x: extent x, m; z: extent z, m | y: height, m | book, node |
| `weight.per-length` Weight per length of a rectangular bar | derived | rho: density, kg/m^3; b: breadth, m; h: depth, m; g: gravity, m/s^2 | q: weight per length, N/m | book, node |
| `statics.two-supports.symmetric` Reactions of a symmetric beam on two supports | derived | P: load, N; W: self weight, N | R: reaction at each support, N | book, node |
| `beam.simply-supported.central-patch.moment` Bending moment under a central patch load | derived | P: load, N; L: span, m; w: patch width, m; a: station from mid-span, m | M: bending moment, N m | book, node |
| `beam.overhang.self-moment` Bending moment from a beam's own weight, with overhangs | derived | q: weight per length, N/m; L: span, m; Lt: total length, m; a: station from mid-span, m | M: bending moment, N m | book, node |
| `section.rect.area` Area of a rectangle | geometry | b: breadth, m; h: depth, m | A: area, m^2 | book, node |
| `section.rect.modulus` Section modulus of a rectangle | geometry | b: breadth, m; h: depth, m | S: section modulus, m^3 | book, node |
| `section.rect.second-moment` Second moment of a rectangle | geometry | b: breadth, m; h: depth, m | I: second moment, m^4 | book, node |
| `beam.simply-supported.central-patch.sag` Mid-span sag under a central patch load | derived | P: load, N; L: span, m; w: patch width, m; E: modulus, Pa; I: second moment, m^4; h: depth, m | delta: mid-span sag, m | book, node |
| `beam.overhang.self-sag` Mid-span sag from a beam's own weight, with overhangs | derived | q: weight per length, N/m; L: span, m; Lt: total length, m; E: modulus, Pa; I: second moment, m^4; h: depth, m | delta: mid-span sag, m | book, node |
| `beam.simply-supported.first-period` Period of the first mode of a simply supported beam | derived | L: span, m; E: modulus, Pa; I: second moment, m^4; rho: density, kg/m^3; A: section area, m^2; h: depth, m | T1: first period, s | book, node |
| `cantilever.root-moment` Moment at the root of a cantilever | derived | P: load, N; a: reach of the load from the root, m; q: weight per length, N/m; ell: length of the arm, m | M: root moment, N m | book, node |
| `cantilever.root-shear` Shear at the root of a cantilever | derived | P: load, N; q: weight per length, N/m; ell: length of the arm, m | V: root shear, N | book, node |
| `cantilever.tip-sag` Tip deflection of a cantilever under a patch load at reach a and its own weight | derived | P: load, N; a: reach of the load from the root, m; w: patch width, m; ell: length of the arm, m; q: weight per length, N/m; E: modulus, Pa; I: second moment, m^4; h: depth, m | delta: tip sag, m | book, node |
| `bolt.tensile-stress-area` Tensile stress area of a metric thread | geometry | d: nominal diameter, m; p: thread pitch, m | As: tensile stress area, m^2 | book, node |
| `bolt-group.tension` Tensile capacity of a bolt group | derived | n: bolts, 1; As: tensile stress area, m^2; Rm: tensile strength of the bolt, Pa | Ft: tensile capacity of the group, N | book, node |
| `bolt-group.bending` Bending capacity of a bolt group prying about the footprint edge | approximation | Ft: tensile capacity of the group, N; lever: lever of the group, m | Mcap: bending capacity, N m | book, node |
| `inertia.prism.centre` Moment of inertia of a rectangular prism about its centre | geometry | m: mass, kg; a: extent along the swing, m; b: extent across the swing, in its plane, m | I: moment of inertia about the centre, kg m^2 | book, node |
| `pendulum.physical.period` Period of a physical pendulum, small swings | approximation | I: moment of inertia about the pivot, kg m^2; m: mass, kg; g: gravity, m/s^2; d: distance from the pivot to the centre of mass, m | T0: small-swing period, s | book, node |
| `pendulum.period-factor` Lengthening of the period with the swing, from energy conservation | derived | theta0: release angle, rad | f: period factor, 1 | book, node |
| `pendulum.amplitude-factor` Lengthening of the period with the swing (the series) | approximation | theta0: release angle, rad | f: period factor, 1 | book, node |

### universal

| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |
| --- | --- | --- | --- | --- |
| `balance.steady` Steady mass balance | fundamental | Qin: flow in, m^3/s; f: share taken back, - | Q: flow out, m^3/s | book, node |
| `residence.stock` Stock, flow and residence time | definition | Q: flow through, m^3/s; tau: residence time, s | V: volume held, m^3 | book, node |
| `balance.difference` What is left of a flow | fundamental | Qin: flow in, m^3/s; Qout: flow out by the other ways, m^3/s | Q: flow left, m^3/s | book, node |
| `junction.sum` Flows meeting at a junction | fundamental | Q1: one flow, m^3/s; Q2: the other, m^3/s | Q: flow together, m^3/s | book, node |
| `transport.advection` What a flow carries | definition | Q: flow, m^3/s; dc: concentration out less in, mol/m^3 | n: amount carried, mol/s | book, node |
| `concentration.difference` Difference of two concentrations | definition | c1: one concentration, mol/m^3; c2: the other, mol/m^3 | dc: difference, mol/m^3 | book, node |
| `flux.area` A flux over an area | definition | J: flux, kg/m^2 s; A: area, m^2 | m: mass crossing, kg/s | book, node |
| `total.mass` The mass of many | geometry | n: count, -; m1: mass of one, kg | m: mass of all, kg | book, node |
| `total.volume` The room many take | geometry | n: count, -; V1: volume of one, m^3 | V: volume of all, m^3 | book, node |
| `total.flow` The flow of many | geometry | n: count, -; q: flow of one, m^3/s | Q: flow of all, m^3/s | book, node |
| `total.rate` The rate of many | geometry | n: count, -; r1: rate of one, 1/s | r: rate of all, 1/s | book, node |
| `rate.per-mass` A flow from a mass that makes it | definition | q: flow a kilogram, m^3/s kg; m: mass, kg | Q: flow, m^3/s | book, node |
| `share.of` A share of a mass | definition | w: share, -; M: whole, kg | m: part, kg | book, node |
| `residence.mass` A stock of mass and its turnover | definition | mdot: flow through, kg/s; tau: residence time, s | m: stock, kg | book, node |
| `amount.concentration` Amount in a volume | definition | c: concentration, mol/m^3; V: volume, m^3 | n: amount, mol | book, node |
| `power.molar` Power of a flow of moles | definition | n: rate, mol/s; E: energy a mole, J/mol | P: power, W | book, node |
| `stoichiometry.mass` Stoichiometry by mass | geometry | m: reactant, kg; nu: moles made a mole, -; Mp: molar mass of the product, g/mol; Mr: molar mass of the reactant, g/mol | mp: product, kg | book, node |
| `stoichiometry.moles` Stoichiometry by moles | geometry | nu: how many each, -; n: moles of it, mol | np: moles of the other, mol | book, node |
| `saturation.share` A share of what it can hold | definition | theta: share filled, -; cmax: capacity, mol/m^3 | c: held, mol/m^3 | book, node |
| `heat.latent-flow` Heat carried by a phase change | definition | mdot: mass flow, kg/s; L: latent heat, J/kg | P: heat carried, W | book, node |
| `reaction.rate-from-power` Reaction rate from its power | definition | P: power, W; V: volume it runs in, m^3; dH: energy a mole, J/mol | q: rate a volume, mol/m^3 s | book, node |
| `distance.speed-time` Distance at a steady speed | definition | v: speed, m/s; t: time, s | x: distance, m | book, node |
| `volume.cylinder` Volume of a cylinder | geometry | r: radius, m; L: length, m | V: volume, m^3 | book, node |
| `volume.ellipsoid` Volume of an ellipsoid | geometry | a: extent, m; b: width, m; c: height, m | V: volume, m^3 | book, node |
| `volume.of-box` Volume by shape in a box | geometry | phi: share of its box, -; a: extent, m; b: width, m; c: height, m | V: volume, m^3 | book, node |
| `area.sphere-of-volume` The least surface a volume can have | geometry | V: volume, m^3 | A: surface, m^2 | book, node |
| `area.shaped` A shape's surface over its sphere's | geometry | s: shape factor, -; A0: the sphere's surface, m^2 | A: surface, m^2 | book, node |
| `power.per-mass` Power from a mass that gives it | definition | p: power a kilogram, W/kg; m: mass, kg | P: power, W | book, node |
| `mass.volume` Mass of a volume | definition | rho: density, kg/m^3; V: volume, m^3 | m: mass, kg | book, node |
| `mass.flow` Mass flow of a volume flow | definition | rho: density, kg/m^3; Q: volume flow, m^3/s | mdot: mass flow, kg/s | book, node |
| `molar.mass-flow` Mass flow of a molar flow | definition | n: molar flow, mol/s; M: molar mass, kg/mol | mdot: mass flow, kg/s | book, node |
| `mixing.density` Density of a mixture | approximation | w: mass share of the first, -; rho1: density of the first, kg/m^3; rho2: density of the second, kg/m^3 | rho: density, kg/m^3 | book, node |
| `starling.filtration` Filtration through a membrane (Starling) | empirical | Kf: filtration coefficient, m^3/s Pa; dP: hydraulic pressure difference, Pa; dPi: osmotic pressure difference, Pa | J: filtration rate, m^3/s | book, node |
| `poiseuille` Laminar flow in a tube (Hagen–Poiseuille) | derived | r: radius, m; dP: pressure drop, Pa; mu: viscosity, Pa s; L: length, m | Q: flow, m^3/s | book, node |
| `murray.branching` Murray's law of branching | derived | r1: radius of one branch, m; r2: radius of the other, m | r0: radius of the parent, m | book, node |
| `network.scaling` The exponent of a space-filling network | empirical | n: branches at each level, -; beta: radius ratio, -; gamma: length ratio, - | a: scaling exponent, - | book, node |
| `kleiber.scaling` Metabolic scaling (Kleiber) | empirical | B0: coefficient, W; M: body mass, kg; a: exponent, - | B: resting power, W | book, node |
| `diffusion.front` A front advanced by diffusion | derived | D: diffusivity through the reacted layer, m^2/s; C: concentration at the surface, mol/m^3; t: time, s; a: capacity to react, mol/m^3 | x: depth of the front, m | book, node |
| `diffusion.erf` Diffusion in from a held surface (Fick's second law) | derived | Cs: at the surface, -; x: depth, m; D: diffusivity, m^2/s; t: time, s | C: at that depth, - | book, node |
| `diffusion.sphere-limit` The largest a sphere can live by diffusion | derived | D: diffusivity, m^2/s; C: concentration at the surface, mol/m^3; q: consumption a volume, mol/m^3 s | R: largest radius, m | book, node |
| `osmotic.van-t-hoff` Osmotic pressure (van 't Hoff) | approximation | c: concentration of particles, mol/m^3; T: temperature, K | pi: osmotic pressure, Pa | book, node |
| `free-energy.gradient` The free energy of a gradient | derived | T: temperature, K; ratio: concentration ratio, to over from, -; z: charge, -; psi: voltage, to less from, V | dG: free energy a mole, J/mol | book, node |
| `henry.solubility` Gas dissolved in a liquid (Henry) | constitutive | p: partial pressure, Pa; kH: Henry constant, Pa m^3/mol | C: dissolved concentration, mol/m^3 | book, node |
| `gas.concentration` Concentration of a gas | constitutive | x: mole fraction, -; p: pressure, Pa; T: temperature, K | c: concentration, mol/m^3 | book, node |
| `vapour.pressure` Vapour pressure (Clausius–Clapeyron, integrated) | approximation | p0: vapour pressure at the reference, Pa; T0: reference temperature, K; T: temperature, K; L: latent heat, J/kg; M: molar mass, kg/mol | p: vapour pressure, Pa | book, node |
| `sorption.gab` Water held by a material (GAB isotherm) | empirical | Mm: monolayer water content, -; C: first-layer constant, -; K: multilayer constant, -; h: relative humidity, - | M: water content (mass over dry mass), - | book, node |
| `arrhenius.ratio` Arrhenius factor between two temperatures | empirical | Ea: activation energy, J/mol; T: temperature, K; Tref: reference temperature, K | f: rate over its rate at the reference, - | book, node |
| `decay.first-order` First-order decay | derived | N0: amount at the start, -; k: rate constant, 1/s; t: time, s | N: amount left, - | book, node |
| `loss.first-order` Loss at a first-order rate | definition | k: rate constant, 1/s; m: stock, kg | mdot: loss (and making, when steady), kg/s | book, node |
| `half-life` Half-life | derived | k: rate constant, 1/s | t: half-life, s | book, node |
| `growth.doubling` Growth by doubling | derived | N0: count at the start, -; t: time, s; td: doubling time, s | N: count, - | book, node |
| `mortality.gompertz` Mortality rising with age (Gompertz) | empirical | A: hazard at age nought, 1/s; G: Gompertz rate, 1/s; t: age, s | mu: hazard, 1/s | book, node |
| `time.scaled-by-rate` Time at a faster rate | definition | t0: time at the reference, s; f: rate over the reference rate, - | t: time, s | book, node |
| `stages.series` Stages one after another | definition | t1: first stage, s; t2: second stage, s | t: whole time, s | book, node |
| `moles.of-mass` Moles in a mass | definition | m: mass, kg; M: molar mass, kg/mol | n: amount, mol | book, node |
| `faraday.flux` Current from a flux of reactant (Faraday) | fundamental | n: electrons a mole, -; J: molar flux, mol/m^2 s | i: current density, A/m^2 | book, node |
| `radiation.linear` Radiation as a conductance | approximation | eps: emissivity, -; T: mean temperature, K | hr: radiative coefficient, W/m^2 K | book, node |
| `conductance.parallel` Paths in parallel | derived | h1: one path, W/m^2 K; h2: the other, W/m^2 K | h: both, W/m^2 K | book, node |
| `power.net` Net power | definition | Pout: power out, W; Pin: power in, W | P: net power out, W | book, node |
| `power.sum` Powers together | fundamental | P1: one, W; P2: the other, W | P: together, W | book, node |
| `energy.power-time` Energy at a power over a time | definition | P: power, W; t: time, s | E: energy, J | book, node |
| `dose.time` Dose at a dose rate | definition | rate: dose rate, Gy/s; t: time, s | D: dose, Gy | book, node |
| `life.expectancy.gompertz-makeham` Years left by the Gompertz–Makeham law | derived | lam: hazard that does not age (Makeham), 1/s; A: hazard at age nought, 1/s; G: Gompertz rate, 1/s; a: age now, s | e: years left, s | book, node |
| `humidity.vapour-pressure` Vapour pressure at a humidity | definition | phi: relative humidity, -; psat: saturation vapour pressure, Pa | pv: vapour pressure, Pa | book, node |
| `rates.add` Independent rates add | fundamental | r1: one rate, 1/s; r2: the other, 1/s | r: together, 1/s | book, node |
| `hazard.dose` Hazard from a dose rate | empirical | k: risk a gray, 1/Gy; rate: dose rate, Gy/s | h: hazard, 1/s | book, node |
| `column.self-weight` The tallest column that holds its own weight | derived | sigma: compressive strength, Pa; rho: density, kg/m^3 | H: height, m | book, node |
| `fatigue.basquin` Fatigue life (Basquin) | empirical | sa: stress amplitude, Pa; sf: fatigue strength coefficient, Pa; b: fatigue strength exponent, - | N: cycles to failure, - | book, node |
| `conduction.series` Heat through two layers in series | derived | A: area, m^2; dT: temperature difference, K; h1: first conductance, W/m^2 K; h2: second conductance, W/m^2 K | q: heat flow, W | book, node |
| `evaporation.max` The most a wet skin can evaporate | empirical | hc: convective heat-transfer coefficient, W/m^2 K; psk: vapour pressure at the skin, Pa; pa: vapour pressure in the air, Pa; A: area, m^2 | E: heat evaporated, W | book, node |
| `laplace.pressure` Pressure in a curved surface (Young–Laplace) | derived | gamma: surface tension, N/m; r: radius, m | dP: pressure inside over outside, Pa | book, node |
| `stokes.drag` Drag at low Reynolds number (Stokes) | approximation | mu: viscosity, Pa s; r: radius, m; v: speed, m/s | F: drag, N | book, node |
| `corrosion.penetration` Corrosion rate from its current (Faraday) | derived | i: corrosion current density, A/m^2; M: molar mass of the metal, g/mol; n: electrons an atom gives up, -; rho: density of the metal, kg/m^3 | v: loss of thickness a second, m/s | book, node |
| `porosity.powers` Capillary porosity of cement paste (Powers) | empirical | wc: water–cement ratio, -; alpha: degree of hydration, - | eps: capillary porosity, - | book, node |
| `diffusivity.papadakis` CO₂ diffusivity in concrete (Papadakis) | empirical | eps: paste porosity, -; rh: relative humidity, - | D: effective CO₂ diffusivity, m^2/s | book, node |

## Quantities: what joins the laws

The registry (`src/nexus/quantities.ts`) holds 85 quantities; every one of the 892 ports of the book is one of them (0 are not). 61 quantities are shared by two laws or more: those are the joins a chain of laws runs along.

| Quantity | Unit | Laws |
| --- | --- | --- |
| length | m | 86: `wheel.torque`, `energy.potential`, `braking.distance`, `cornering.limit`, `pendulum.period`, `centripetal`, `inertia.disc`, `inertia.rod-end`, … |
| force | N | 39: `newton.second`, `weight`, `friction.coulomb`, `rolling.resistance`, `grade.force`, `power.linear`, `wheel.torque`, `traction.limit`, … |
| ratio | 1 | 35: `rolling.resistance`, `flywheel.specific-energy`, `time.dilation.gravity`, `buckling.euler`, `buckling.johnson`, `sinter.scale`, `shaft.diameter.static`, `capstan`, … |
| mass | kg | 31: `newton.second`, `weight`, `grade.force`, `energy.kinetic`, `energy.potential`, `natural.frequency`, `centripetal`, `inertia.disc`, … |
| count | 1 | 27: `piezo.stroke`, `bearing.life.l10`, `bearing.life.hours`, `spring.rate`, `chain.speed`, `spring.torsion.rate`, `grubler`, `ampere.law`, … |
| area | m^2 | 26: `stress.axial`, `buckling.johnson`, `wire.resistance`, `electrostatic.pull`, `pv.power`, `convection`, `conduction`, `radiation`, … |
| time | s | 25: `pendulum.period`, `bearing.life.hours`, `motor.time-constant`, `energy.electric`, `rc.time-constant`, `lumped.time-constant`, `diffusion.time`, `queueing`, … |
| speed | m/s | 25: `power.linear`, `energy.kinetic`, `braking.distance`, `cornering.limit`, `centripetal`, `free-fall.speed`, `sound.speed`, `conservation.momentum`, … |
| power | W | 23: `power.linear`, `power.rotary`, `chain.pull`, `joule`, `power.electric`, `cmos.dynamic`, `pv.power`, `convection`, … |
| elastic modulus | Pa | 19: `sound.speed`, `beam.simply-supported.udl`, `beam.simply-supported.point`, `beam.cantilever.point`, `buckling.euler`, `torsion.twist`, `buckling.johnson`, `slenderness.transition`, … |
| stress | Pa | 19: `flywheel.specific-energy`, `stress.axial`, `stress.bending`, `torsion.solid`, `buckling.johnson`, `slenderness.transition`, `stress.hoop`, `weld.fillet.shear`, … |
| density | kg/m^3 | 19: `flywheel.specific-energy`, `sound.speed`, `drag.aero`, `lift.aero`, `reynolds`, `darcy-weisbach`, `buoyancy`, `hydrostatic`, … |
| voltage | V | 18: `piezo.stroke`, `ohm`, `wire.drop`, `motor.back-emf`, `motor.current`, `lead-acid.ocv`, `energy.electric`, `capacitor.energy`, … |
| fraction | 1 | 17: `composite.rule-of-mixtures`, `composite.transverse`, `cmos.dynamic`, `radiation`, `absorbed.solar`, `separation.work`, `balance.steady`, `share.of`, … |
| temperature | K | 17: `copper.tempco`, `radiation`, `carnot`, `arrhenius`, `separation.work`, `ideal.gas`, `clausius-clapeyron`, `boltzmann.distribution`, … |
| frequency or rate | Hz | 16: `natural.frequency`, `cmos.dynamic`, `arrhenius`, `acoustic.mass-law`, `skin.depth`, `shannon.capacity`, `shannon.sampling`, `queueing`, … |
| pressure | Pa | 16: `stress.hoop`, `hertz.contact`, `ideal.gas`, `gas.isothermal-work`, `darcy-weisbach`, `hydrostatic`, `bernoulli`, `starling.filtration`, … |
| torque or moment | N m | 15: `power.rotary`, `wheel.torque`, `stress.bending`, `torsion.solid`, `torsion.twist`, `beam.plastic-moment`, `shaft.diameter.static`, `gear.output.torque`, … |
| energy | J | 14: `energy.kinetic`, `energy.potential`, `energy.rotational`, `spring.energy`, `energy.electric`, `capacitor.energy`, `inductor.energy`, `heat.capacity`, … |
| electric current | A | 13: `ohm`, `joule`, `wire.drop`, `motor.torque`, `motor.current`, `energy.electric`, `inductor.energy`, `power.electric`, … |
| volume | m^3 | 12: `ideal.gas`, `gas.isothermal-work`, `buoyancy`, `residence.stock`, `total.volume`, `amount.concentration`, `reaction.rate-from-power`, `volume.cylinder`, … |
| concentration | mol/m^3 | 11: `fick.diffusion`, `michaelis-menten`, `transport.advection`, `concentration.difference`, `amount.concentration`, `saturation.share`, `diffusion.front`, `diffusion.sphere-limit`, … |
| angle | rad | 10: `grade.force`, `torsion.twist`, `young.contact`, `capstan`, `screw.efficiency`, `diffraction.limit`, `snell.law`, `bragg.law`, … |
| second moment of area | m^4 | 10: `beam.simply-supported.udl`, `beam.simply-supported.point`, `beam.cantilever.point`, `buckling.euler`, `torsion.twist`, `section.rect.second-moment`, `beam.simply-supported.central-patch.sag`, `beam.overhang.self-sag`, … |
| volume flow | m^3/s | 10: `balance.steady`, `residence.stock`, `balance.difference`, `junction.sum`, `transport.advection`, `total.flow`, `rate.per-mass`, `mass.flow`, … |
| temperature difference | K | 8: `thermal.expansion`, `seebeck`, `convection`, `conduction`, `convection.natural`, `heat.capacity`, `thermal.network`, `conduction.series` |
| electrical resistance | ohm | 8: `ohm`, `joule`, `wire.resistance`, `copper.tempco`, `motor.current`, `motor.time-constant`, `rc.time-constant`, `strain.gauge` |
| angular speed | rad/s | 7: `power.rotary`, `energy.rotational`, `bearing.life.hours`, `chain.speed`, `belt.speed`, `motor.back-emf`, `motor.current` |
| load per length | N/m | 7: `beam.simply-supported.udl`, `weight.per-length`, `beam.overhang.self-moment`, `beam.overhang.self-sag`, `cantilever.root-moment`, `cantilever.root-shear`, `cantilever.tip-sag` |
| moment of inertia | kg m^2 | 7: `inertia.disc`, `inertia.rod-end`, `parallel-axis`, `energy.rotational`, `motor.time-constant`, `inertia.prism.centre`, `pendulum.physical.period` |
| heat transfer coefficient | W/m^2 K | 7: `convection`, `convection.natural`, `lumped.time-constant`, `radiation.linear`, `conductance.parallel`, `conduction.series`, `evaporation.max` |
| molar energy | J/mol | 7: `arrhenius`, `separation.work`, `gibbs.energy`, `power.molar`, `reaction.rate-from-power`, `free-energy.gradient`, `arrhenius.ratio` |
| efficiency | 1 | 6: `gear.output.torque`, `screw.force`, `screw.efficiency`, `pv.power`, `carnot`, `weld.heat-input` |
| mass flow | kg/s | 6: `flux.area`, `residence.mass`, `heat.latent-flow`, `mass.flow`, `molar.mass-flow`, `loss.first-order` |
| molar mass | kg/mol | 6: `faraday.electrolysis`, `stoichiometry.mass`, `molar.mass-flow`, `vapour.pressure`, `moles.of-mass`, `corrosion.penetration` |
| diffusivity | m^2/s | 6: `diffusion.time`, `fick.diffusion`, `diffusion.front`, `diffusion.erf`, `diffusion.sphere-limit`, `diffusivity.papadakis` |
| friction coefficient | 1 | 5: `friction.coulomb`, `traction.limit`, `cornering.limit`, `capstan`, `screw.efficiency` |
| dimensionless group | 1 | 5: `froude`, `slenderness.transition`, `reynolds`, `rayleigh.resolution`, `shannon.capacity` |
| acceleration | m/s^2 | 5: `newton.second`, `weight`, `braking.distance`, `weight.per-length`, `pendulum.physical.period` |
| exponent | 1 | 4: `bearing.life.l10`, `network.scaling`, `kleiber.scaling`, `fatigue.basquin` |
| amount of substance | mol | 4: `ideal.gas`, `amount.concentration`, `stoichiometry.moles`, `moles.of-mass` |
| specific energy | J/kg | 4: `flywheel.specific-energy`, `clausius-clapeyron`, `heat.latent-flow`, `vapour.pressure` |
| motor constant | N m/A | 4: `motor.torque`, `motor.back-emf`, `motor.current`, `motor.time-constant` |
| strain | 1 | 3: `hooke`, `sinter.scale`, `strain.gauge` |
| section modulus | m^3 | 3: `stress.bending`, `beam.plastic-moment`, `section.rect.modulus` |
| stiffness | N/m | 3: `natural.frequency`, `spring.energy`, `spring.rate` |
| surface tension or energy | J/m^2 | 3: `young.contact`, `griffith`, `laplace.pressure` |
| dynamic viscosity | Pa s | 3: `reynolds`, `poiseuille`, `stokes.drag` |
| capacitance | F | 3: `rc.time-constant`, `capacitor.energy`, `cmos.dynamic` |
| current density | A/m^2 | 3: `butler-volmer`, `faraday.flux`, `corrosion.penetration` |
| magnetic flux density | T | 3: `lorentz.force`, `magnetic.pull`, `ampere.law` |
| molar flow | mol/s | 3: `transport.advection`, `power.molar`, `molar.mass-flow` |
| reaction rate per volume | mol/m^3 s | 3: `michaelis-menten`, `reaction.rate-from-power`, `diffusion.sphere-limit` |
| thermal conductivity | W/m K | 2: `conduction`, `thermal.resistance.conduction` |
| thermal resistance | K/W | 2: `thermal.network`, `thermal.resistance.conduction` |
| heat flux or irradiance | W/m^2 | 2: `pv.power`, `absorbed.solar` |
| specific heat | J/kg K | 2: `heat.capacity`, `lumped.time-constant` |
| dose rate | Gy/s | 2: `dose.time`, `hazard.dose` |
| resistance per length | ohm/m | 2: `wire.drop`, `cable.equation` |
| resistivity | ohm m | 2: `wire.resistance`, `cable.equation` |
| molar flux | mol/m^2 s | 2: `fick.diffusion`, `faraday.flux` |
| information | 1 | 1: `information.choices` |
| heat input per length | J/m | 1: `weld.heat-input` |
| torsional stiffness | N m/rad | 1: `spring.torsion.rate` |
| mass per area | kg/m^2 | 1: `acoustic.mass-law` |
| mass flux | kg/m^2 s | 1: `flux.area` |
| specific volume | m^3/kg | 1: `clausius-clapeyron` |
| flow per mass | m^3/kg s | 1: `rate.per-mass` |
| filtration coefficient | m^4 s/kg | 1: `starling.filtration` |
| stress over root length | Pa m^0.5 | 1: `hall-petch` |
| pressure per temperature | Pa/K | 1: `clausius-clapeyron` |
| absorbed dose | Gy | 1: `dose.time` |
| power per mass | W/kg | 1: `power.per-mass` |
| risk per dose | 1/Gy | 1: `hazard.dose` |
| thermal expansion coefficient | 1/K | 1: `thermal.expansion` |
| electrical conductivity | S/m | 1: `skin.depth` |
| inductance | H | 1: `inductor.energy` |
| electric charge | C | 1: `coulomb.law` |
| rate of change of flux density | T/s | 1: `faraday.induction` |
| magnetic permeability | N/A^2 | 1: `wave.speed.electromagnetic` |
| electric permittivity | F/m | 1: `wave.speed.electromagnetic` |
| Seebeck coefficient | V/K | 1: `seebeck` |
| piezoelectric charge constant | m/V | 1: `piezo.stroke` |
| Henry constant | Pa m^3/mol | 1: `henry.solubility` |
| molar entropy | J/mol K | 1: `gibbs.energy` |

### One letter, different things

55 symbols stand for different quantities in different laws: laws are joined by the quantity, never by the letter.

| Symbol | Means |
| --- | --- |
| a | acceleration; force; length; fraction; exponent; concentration; time |
| k | stiffness; ratio; torsional stiffness; thermal conductivity; frequency or rate; risk per dose |
| E | energy; elastic modulus; voltage; molar energy; power |
| h | length; time; heat transfer coefficient; fraction; frequency or rate |
| L | length; count; inductance; specific energy; force |
| M | mass; torque or moment; count; molar mass; fraction |
| J | second moment of area; moment of inertia; molar flux; mass flux; volume flow |
| n | count; ratio; angular speed; amount of substance; molar flow |
| C | force; capacitance; frequency or rate; concentration; ratio |
| q | power; load per length; volume flow; flow per mass; reaction rate per volume |
| m | mass; length; mass per area; mass flow |
| W | force; molar energy; energy; time |
| mu | friction coefficient; magnetic permeability; dynamic viscosity; frequency or rate |
| T | torque or moment; time; temperature; force |
| w | angular speed; load per length; length; fraction |
| R | length; electrical resistance; thermal resistance; force |
| c | speed; specific heat; concentration; length |
| s | dimensionless group; stress; strain; ratio |
| p | pressure; exponent; length; power per mass |
| Q | energy; heat input per length; ratio; volume flow |
| N | force; count; ratio |
| r | length; ratio; frequency or rate |
| f | frequency or rate; ratio; fraction |
| I | moment of inertia; second moment of area; electric current |
| b | speed; length; exponent |
| S | section modulus; Seebeck coefficient; concentration |
| G | elastic modulus; heat flux or irradiance; frequency or rate |
| eps | strain; electric permittivity; fraction |
| alpha | thermal expansion coefficient; angle; fraction |
| V | voltage; volume; force |
| D | length; diffusivity; absorbed dose |
| B | magnetic flux density; frequency or rate; power |
| theta | angle; fraction |
| v | speed; reaction rate per volume |
| P | power; force |
| sigma | stress; electrical conductivity |
| rho | density; resistivity |
| e | specific energy; time |
| x | length; fraction |
| dv | speed; specific volume |
| A | area; frequency or rate |
| tau | stress; time |
| t | length; time |
| Mp | torque or moment; molar mass |
| gamma | surface tension or energy; ratio |
| z | count; length |
| i | ratio; current density |
| eta | efficiency; voltage |
| T0 | temperature; time |
| Rm | resistance per length; stress |
| lambda | length; frequency or rate |
| H | information; length |
| r1 | frequency or rate; length |
| r2 | length; frequency or rate |
| N0 | ratio; count |

## The laws checked against each other

Each law's worked example given, its output sought through the other laws alone (`crossCheck` in `src/nexus/lawgraph.ts`, three laws deep, values joined by name, or by quantity where both the port and the value are named plainly). 7 of 241 laws have another way to their output; 5 agree to 10⁻⁶; 2 do not. A disagreement is an approximation against its exact law, a second model of the same thing, or a fault; each is read and said in `docs/REALITY.md`.

| Law | Its example | By the others | Through | |
| --- | --- | --- | --- | --- |
| `ohm` | 6 V | 6 V | `joule` → `power.electric` | agree |
| `joule` | 120 W | 120 W | `ohm` → `power.electric` | agree |
| `energy.electric` | 864000 J | 864000 J | `power.electric` → `energy.power-time` | agree |
| `power.electric` | 240 W | 240 W | `ohm` → `joule` | agree |
| `beam.simply-supported.central-patch.sag` | 0.0078125 m | 0.0078125 m | `beam.simply-supported.point` | agree |
| `pendulum.amplitude-factor` | 1.0174039 1 | 1.0174088 1 | `pendulum.period-factor` | **differ** |
| `volume.of-box` | 0.000031415927 m^3 | 0.000020943951 m^3 | `volume.ellipsoid` | **differ** |

## Material tables and the code that reads them

| Table | Defined in | Holds | Read by |
| --- | --- | --- | --- |
| handbook materials | `src/data/materials.ts` | E, ν, yield, ultimate, elongation, conductivity, friction, restitution, colour; source and confidence; ids like steel.a36 | `nexus/blocks.ts`, `nexus/generate.ts`, `nexus/loads.ts`, `nexus/machines.ts`, `nexus/navigate.ts`, `nexus/sim.ts` |
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
| a motor run in time | `src/engineering/motorrun.ts` | no: its steps switch between spin-up and a steady state, with events (overheating, the rise time) and energy counted each step; kept until a stepper with events replaces it whole, its results held by the baseline |
| warming in substeps | `src/engineering/thermal.ts` | no: a frame's step of a part cooling, its sub-step limited so it never crosses the room's temperature: called each frame, not run over a span |
| heat through a grid | `src/nexus/heatflow.ts` | no: a field solver (implicit, Gauss–Seidel over cells), not one equation in time |

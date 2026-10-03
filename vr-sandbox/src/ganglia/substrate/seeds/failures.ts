// Failure modes: how things stop doing what they do. Each says the mechanism and names the law behind it, so that a
// fails-by arrow is a path into physics, never a label. What any arrow names, the index describes (S-6): a seed that
// names a new failure mode describes it here, or the build test fails.
import type { Source } from '../../types';
import { Pack, type Links } from '../dsl';

const COLLINS: Source = { cite: 'Collins, Busby & Staab, Mechanical Design of Machine Elements and Machines, 2nd ed., Wiley 2010 (ch. 2, failure modes)', kind: 'textbook' };
const CALLISTER: Source = { cite: 'Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018 (ch. 8 failure, ch. 17 corrosion and degradation)', kind: 'textbook' };
const HH: Source = { cite: 'Horowitz & Hill, The Art of Electronics, 3rd ed., Cambridge 2015', kind: 'textbook' };
const NEWMAN: Source = { cite: 'Newman & Thomas-Alyea, Electrochemical Systems, 3rd ed., Wiley 2004', kind: 'textbook' };
const KALPAKJIAN: Source = { cite: 'Kalpakjian & Schmid, Manufacturing Engineering and Technology, 8th ed., Pearson 2020', kind: 'textbook' };
const GUYTON: Source = { cite: 'Hall & Hall, Guyton and Hall Textbook of Medical Physiology, 14th ed., Elsevier 2021', kind: 'textbook' };
const TANENBAUM: Source = { cite: 'Tanenbaum & Bos, Modern Operating Systems, 4th ed., Pearson 2015; Kleppmann, Designing Data-Intensive Applications, O\'Reilly 2017', kind: 'textbook' };
const GOODFELLOW: Source = { cite: 'Goodfellow, Bengio & Courville, Deep Learning, MIT Press 2016', kind: 'textbook' };
const WALLACE: Source = { cite: 'Wallace & Hobbs, Atmospheric Science: An Introductory Survey, 2nd ed., Academic Press 2006', kind: 'textbook' };
const MARSHAK: Source = { cite: 'Marshak, Earth: Portrait of a Planet, 6th ed., Norton 2019', kind: 'textbook' };
const OGATA: Source = { cite: 'Ogata, Modern Control Engineering, 5th ed., Pearson 2010', kind: 'textbook' };

export function failures(): Pack {
  const p = new Pack('failures', COLLINS);
  const f = (id: string, says: string, links: Links = {}, src: Source = COLLINS) => { p.e(id, 'failure', says, { source: src }); if (Object.keys(links).length) p.link(id, links, src); };

  // ------------------------------------------------------------------------------------------- mechanical
  f('failure.shear', 'A pin, rivet or key cut across its section: the shear stress on it past the shear yield, about 0.58 of the tensile yield by von Mises, and the load path is open.', { 'governed-by': ['stress.von-mises', 'stress.axial'] });
  f('failure.bearing-yield', 'The hole or the keyway crushed where a pin, rivet or key presses on it: load over projected area past the softer part\'s yield, so the fit goes loose and the joint works.', { 'governed-by': ['stress.axial'] });
  f('failure.adhesive-failure', 'A glued joint parting at the interface: the glue never wetted or bonded the surface (oil, oxide, release agent, the wrong surface energy), so the bond is weaker than the glue.', { 'governed-by': ['young.contact'] });
  f('failure.cohesive-failure', 'A glued joint parting inside the glue layer: the adhesive itself tears, which means the surfaces were bonded and the glue was the weakest link, as designed.', { 'governed-by': ['griffith'] });
  f('failure.lubricant-starvation', 'A bearing running without its oil film: metal touches metal, friction and heat rise together, and wear or seizure follows; the film thickness is set by speed, viscosity and load.', { 'governed-by': ['friction.coulomb', 'bearing.life.l10'] });
  f('failure.overheating', 'Temperature rising past a rating because heat in exceeds heat out: I²R, friction or core loss against conduction and convection away; strength, viscosity, insulation and lubricant all give way with it.', { 'governed-by': ['joule', 'conduction', 'convection', 'thermal.network', 'arrhenius'] });
  f('failure.seizure', 'Two sliding parts welding themselves together: the oil film lost, asperities bond under heat and pressure, and the friction force climbs until the motion stops or a part shears.', { 'governed-by': ['friction.coulomb', 'thermal.expansion'] });
  f('failure.control-loss', 'An actively held system whose loop can no longer hold its target: a sensor, a driver or the supply fails, or the gain is wrong for the load, and the thing falls to its touchdown bearing or its stops.', { 'governed-by': ['nyquist.stability'] }, OGATA);
  f('failure.oxidation', 'Metal consumed by oxygen at temperature: the oxide grows by diffusion, parabolic in time, protective if it adheres (chromium, aluminium), scaling if it does not (iron above 570 °C).', { 'governed-by': ['arrhenius', 'fick.diffusion'] }, CALLISTER);
  f('failure.contamination', 'Dirt, water or wear particles in a lubricant or a fluid: particles abrade the surfaces, water corrodes them and breaks the film; filtration and seals are the defence.', { 'governed-by': ['friction.coulomb'] });
  f('failure.extrusion', 'An elastomer seal pushed into the gap it was meant to close: pressure times gap width against the seal\'s hardness; backup rings and smaller clearances stop it.', { 'governed-by': ['hydrostatic'] });
  f('failure.compression-set', 'A seal that stays squashed after the load is lifted: cross-links broken and chains rearranged over time and temperature, so the sealing force is gone.', { 'governed-by': ['arrhenius'] }, CALLISTER);
  f('failure.hook-fatigue', 'An extension spring breaking at the bend of its hook: the stress there is the coil\'s plus a bending term, so the hook is the weakest turn.', { 'governed-by': ['spring.rate', 'stress.bending', 'fatigue.endurance.steel'] });
  f('failure.tooth-skipping', 'A timing belt jumping a tooth: the load exceeds what the engaged teeth carry under the belt\'s tension, so a tooth climbs out and the timing is lost.', { 'governed-by': ['belt.speed', 'friction.coulomb'] });
  f('failure.misalignment', 'Two shafts joined off their common axis: each turn bends the coupling and loads the bearings once per revolution, heating the coupling and wearing the bearings.', { 'governed-by': ['stress.bending', 'natural.frequency'] });
  f('failure.fade', 'A brake losing its grip as it heats: the lining\'s friction coefficient falls with temperature and gas from the binder lifts the pad; the energy of the stop has to go somewhere.', { 'governed-by': ['friction.coulomb', 'energy.kinetic', 'braking.distance'] });
  f('failure.follower-jump', 'A cam follower leaving the cam: its inertia at speed exceeds what the spring holds it down with, so it flies and lands with a hit.', { 'governed-by': ['newton.second', 'spring.rate'] });
  f('failure.dead-point', 'A linkage at the position where its input can exert no torque on the output, the two aligned: it stalls or goes either way; a flywheel or a second linkage carries it through.', { 'governed-by': ['grubler'] });
  f('failure.sticking', 'A valve or a plunger that does not move when told: friction, varnish, corrosion or a side load exceeds the force the actuator can give, so it stays until it breaks free with a jump.', { 'governed-by': ['friction.coulomb', 'magnetic.pull'] });
  f('failure.dry-running', 'A pump run without liquid: the liquid was its seal\'s coolant and its bearing\'s lubricant, so the seal faces score and the pump overheats in minutes.', { 'governed-by': ['friction.coulomb', 'conduction'] });
  f('failure.erosion', 'Material worn away by a fluid carrying particles or bubbles: sand striking, or cavitation bubbles collapsing on the surface; the rate rises steeply with speed.', { 'governed-by': ['bernoulli', 'energy.kinetic'] });
  f('failure.puncture', 'A tyre or a wheel pierced: a point load through the carcass, and the air that carried the load escapes.', { 'governed-by': ['hydrostatic', 'ideal.gas'] });
  f('failure.hydroplaning', 'A tyre riding on water: above a speed set by the inflation pressure the water cannot escape the contact patch and the tread lifts off the road; grip falls to nearly nothing.', { 'governed-by': ['traction.limit', 'bernoulli'] });
  f('failure.brittle-fracture', 'A crack running at the speed of sound in the material without warning: when the stress intensity at a flaw reaches the fracture toughness, Griffith\'s balance tips and the energy released outruns the energy needed to make new surface.', { 'governed-by': ['griffith', 'paris.law'] }, CALLISTER);
  f('failure.cracking', 'A brittle body cracked by stress it could not yield to: a ceramic capacitor bent with its board, a sintered magnet dropped, a silicon cell flexed, concrete in tension; the crack starts at a flaw and runs when the stress intensity reaches the toughness.', { 'governed-by': ['griffith', 'stress.bending'] }, CALLISTER);
  f('failure.thermal-shock', 'A brittle material cracking from a sudden temperature change: the surface wants to shrink or grow before the inside does, and the strain mismatch times the stiffness passes the strength.', { 'governed-by': ['thermal.expansion', 'griffith', 'conduction'] }, CALLISTER);
  f('failure.pitting-corrosion', 'Localised holes in a passive metal: chloride breaks the oxide at one spot, the pit becomes anodic to the whole surface round it, and it digs in while the surface looks sound.', { 'governed-by': ['nernst', 'butler-volmer'] }, CALLISTER);
  f('failure.stress-corrosion-cracking', 'A crack grown by tension and a corrosive together, each far below what alone would do it: chloride on stainless, ammonia on brass, caustic on steel.', { 'governed-by': ['nernst', 'griffith'] }, CALLISTER);
  f('failure.uv-degradation', 'A polymer chalking, yellowing and embrittling under sunlight: ultraviolet photons carry more energy than a carbon bond and break chains at the surface; absorbers and carbon black screen it.', { 'governed-by': ['planck.energy'] }, CALLISTER);
  f('failure.stress-cracking', 'A polymer cracking under a steady stress below its strength when a liquid is present: environmental stress cracking, the liquid helping chains disentangle at the crack tip.', { 'governed-by': ['griffith'] }, CALLISTER);
  f('failure.ozone-cracking', 'Rubber cracking across the direction of strain in air with ozone: ozone cuts the double bonds of a stretched surface; antiozonants and saturated elastomers resist it.', {}, CALLISTER);
  f('failure.fibre-breakage', 'A composite failing by its fibres: the strain along them past the fibre\'s failure strain, the strongest and last mode, usually sudden.', { 'governed-by': ['composite.rule-of-mixtures'] }, CALLISTER);
  f('failure.matrix-cracking', 'A composite failing in its matrix first: cracks between the fibres under transverse or shear load, long before the fibres go, letting water in and stiffness out.', { 'governed-by': ['composite.transverse'] }, CALLISTER);
  f('failure.rot', 'Wood eaten by fungi: they need moisture above about 20 %, oxygen and warmth, and digest cellulose or lignin; dry wood lasts for centuries.', { 'governed-by': ['arrhenius'] }, CALLISTER);
  f('failure.splitting', 'Wood cracking along the grain: it is weakest across the fibres, so a nail, a shrinking cross-section or a load across the grain opens it.', { 'governed-by': ['composite.transverse'] }, CALLISTER);
  f('failure.carbonation', 'Concrete losing the alkalinity that protects its steel: carbon dioxide diffusing in reacts with calcium hydroxide, the front advancing as the square root of time, and when it reaches the rebar the steel rusts and bursts the cover.', { 'governed-by': ['carbonation.capacity', 'fick.diffusion'] }, CALLISTER);
  f('failure.freeze-thaw', 'Concrete or stone broken by water freezing in its pores: ice takes 9 % more room, and each cycle pries the surface off; entrained air leaves room for the ice.', { 'governed-by': ['clausius-clapeyron'] }, CALLISTER);
  f('failure.knock', 'Fuel ahead of the flame front igniting on its own: pressure waves ring the cylinder, and sustained knock breaks pistons; octane, timing and compression ratio set the margin.', { 'governed-by': ['arrhenius', 'ideal.gas'] });
  f('failure.foreign-object-damage', 'A gas turbine blade struck by what the intake swallowed, a bird, ice, a bolt: the dent is a crack starter at ten thousand revolutions a minute.', { 'governed-by': ['griffith', 'energy.kinetic'] });
  f('failure.collision', 'A robot or a vehicle meeting what it did not expect or could not stop for: the kinetic energy goes into deformation at the contact.', { 'governed-by': ['energy.kinetic', 'braking.distance'] });
  f('failure.battery-depletion', 'A battery emptied: the stored charge used or self-discharged, the voltage sagging under load before it goes; the robot stops where it is.', { 'governed-by': ['energy.electric', 'lead-acid.ocv'] }, NEWMAN);
  f('failure.sensor-failure', 'A sensor giving nothing or the wrong thing: open, stuck, drifted, dirty; the controller then acts on a world that is not there.', { 'governed-by': ['shannon.sampling'] }, OGATA);

  // ------------------------------------------------------------------------------------------- manufacturing
  f('failure.work-hardening', 'A cut surface made harder by the cut itself: plastic strain multiplies dislocations, so the next pass meets a harder skin, dulls the tool and hardens it again; stainless and nickel alloys do it most.', { 'governed-by': ['hall-petch'] }, KALPAKJIAN);
  f('failure.dross', 'Molten metal left clinging to the underside of a laser or plasma cut: the gas jet failed to clear it, from too little pressure, too much speed or a dull focus.', {}, KALPAKJIAN);
  f('failure.inclusion', 'Sand, slag or oxide trapped in a casting: a hard spot or a void where the metal should be, a crack starter under load.', { 'governed-by': ['griffith'] }, KALPAKJIAN);
  f('failure.lap', 'A forging fold: metal folded over onto itself without fusing, leaving a crack-like seam at the surface.', { 'governed-by': ['griffith'] }, KALPAKJIAN);
  f('failure.cold-shut', 'Two streams of metal meeting too cold to fuse, in a casting or a forging: a seam with the strength of nothing.', { 'governed-by': ['heat.capacity'] }, KALPAKJIAN);
  f('failure.tearing', 'Sheet metal torn in forming: the strain at one place past the forming limit, usually where the sheet thins over a punch radius; lubrication and radius decide it.', { 'governed-by': ['stress.axial'] }, KALPAKJIAN);
  f('failure.wrinkling', 'Sheet metal buckling in forming where it is compressed in its plane, the flange of a deep draw: a blankholder presses it flat.', { 'governed-by': ['buckling.euler'] }, KALPAKJIAN);
  f('failure.void', 'A gap in a laminate or a casting: air or volatiles trapped, so the part is lighter, weaker and leaks where it should not.', { 'governed-by': ['griffith'] }, KALPAKJIAN);
  f('failure.bridge', 'Solder joining two pads that must stay apart: too much paste, too fine a pitch or a dragged iron; a short where there should be air.', { 'governed-by': ['ohm'] }, KALPAKJIAN);
  f('failure.overlay-error', 'One lithography layer printed off from the last: the alignment error eats the margin between features, and at the limit the via misses its line.', { 'governed-by': ['diffraction.limit'] }, KALPAKJIAN);
  f('failure.misassembly', 'A part put in wrong, reversed, the wrong one, the wrong place: the design that lets it happen is the cause, and a feature that makes it impossible is the cure.', {}, KALPAKJIAN);
  f('failure.missing-part', 'A part left out: the assembly looks done and is not; counting, weighing or a sensor at the station catches it.', {}, KALPAKJIAN);
  f('failure.chipping', 'A cutting edge losing flakes: a brittle tool meeting an interrupted cut, a hard inclusion or vibration; the flake takes the edge with it.', { 'governed-by': ['griffith', 'hertz.contact'] }, KALPAKJIAN);

  // ------------------------------------------------------------------------------------------- electrical and electronic
  f('failure.open', 'A conductor broken: a resistor burnt through, a lead cracked, a wire fatigued; the circuit sees infinite resistance and the current stops.', { 'governed-by': ['ohm', 'kirchhoff.current'] }, HH);
  f('failure.drift', 'A value walking away with time, temperature or age, a resistor\'s resistance, a sensor\'s zero: the tempco and the aging rate set how far.', { 'governed-by': ['copper.tempco', 'arrhenius'] }, HH);
  f('failure.dielectric-breakdown', 'The insulator of a capacitor punched through: the field across it, voltage over thickness, past its dielectric strength, and the stored energy discharges through the hole.', { 'governed-by': ['energy.electric', 'coulomb.law'] }, HH);
  f('failure.electrolyte-dryout', 'An electrolytic capacitor losing its electrolyte through its seal: capacitance falls, series resistance rises, and life halves for every 10 K of temperature.', { 'governed-by': ['arrhenius'] }, HH);
  f('failure.esr-rise', 'A capacitor whose series resistance has grown: it heats with every ripple cycle, I²R, which dries it further.', { 'governed-by': ['joule'] }, HH);
  f('failure.short', 'A path where there should be none: a punctured dielectric, a bridged pad, a junction melted through; the current is limited only by what is left in series.', { 'governed-by': ['ohm', 'joule'] }, HH);
  f('failure.saturation', 'A magnetic core past the flux density it can hold: its permeability collapses toward air, the inductance with it, and the current climbs as if the winding were a wire.', { 'governed-by': ['ampere.law', 'faraday.induction'] }, HH);
  f('failure.insulation-breakdown', 'The enamel or the paper between turns punctured: voltage across it past its strength, often after heat has aged it; a short between turns follows.', { 'governed-by': ['arrhenius', 'coulomb.law'] }, HH);
  f('failure.shorted-turn', 'One turn of a winding shorted to its neighbour: it becomes a one-turn secondary with a huge current, heating until the whole winding goes.', { 'governed-by': ['faraday.induction', 'joule'] }, HH);
  f('failure.eddy-loss', 'Currents induced in a conducting core by the changing flux, heating it: proportional to frequency squared and lamination thickness squared, which is why cores are laminated or ferrite.', { 'governed-by': ['faraday.induction', 'joule', 'skin.depth'] }, HH);
  f('failure.hysteresis-loss', 'Energy lost each cycle in walking a core round its B-H loop: the loop area times the frequency, a property of the material.', { 'governed-by': ['faraday.induction'] }, HH);
  f('failure.demagnetization', 'A permanent magnet losing its magnetisation: heat near its Curie point, an opposing field past its coercivity, or a shock; neodymium grades give way between about 80 and 150 °C.', { 'governed-by': ['ampere.law', 'magnetic.pull'] }, CALLISTER);
  f('failure.thermal-runaway', 'Heat that makes more heat: a junction\'s leakage or a cell\'s reaction rate grows with temperature, which grows the heat, until something melts; the loop gain passes one.', { 'governed-by': ['arrhenius', 'shockley.diode', 'joule'] }, HH);
  f('failure.breakdown', 'A junction conducting in reverse: the field at the depletion layer past the avalanche or Zener threshold; harmless if the current is limited, a melt if it is not.', { 'governed-by': ['shockley.diode'] }, HH);
  f('failure.lumen-depreciation', 'An LED or a cell giving less light or less power with age: phosphor and die aging, driven by temperature and current; L70 is the hour when 70 % remains.', { 'governed-by': ['arrhenius', 'planck.energy'] }, HH);
  f('failure.esd', 'A static discharge, kilovolts from a body, punching through a gate oxide nanometres thick: the energy is small, the field is not; protection diodes clamp it.', { 'governed-by': ['coulomb.law', 'energy.electric'] }, HH);
  f('failure.bond-wire-fatigue', 'The gold or aluminium wire inside a package broken by thermal cycling: die and wire expand differently, and each cycle bends the heel until it cracks.', { 'governed-by': ['thermal.expansion', 'paris.law'] }, HH);
  f('failure.electromigration', 'Metal in a chip\'s wires carried along by the electrons themselves: at mega-amps per square centimetre atoms drift, voids open upstream and hillocks grow downstream.', { 'governed-by': ['arrhenius', 'fick.diffusion'] }, HH);
  f('failure.latch-up', 'A parasitic thyristor in a CMOS chip turned on: a glitch past a rail forward-biases a junction, the npn and the pnp feed each other, and the chip shorts rail to rail until the power is cut.', { 'governed-by': ['shockley.diode'] }, HH);
  f('failure.contact-wear', 'A switch or a connector contact worn by making and breaking: arcing erodes it, sliding abrades it, the plating goes and the resistance rises.', { 'governed-by': ['friction.coulomb', 'joule'] }, HH);
  f('failure.contact-welding', 'Contacts stuck closed: the arc or the inrush melted a spot and it froze shut; the relay cannot open.', { 'governed-by': ['joule'] }, HH);
  f('failure.coil-open', 'A relay coil broken: fine wire fatigued or corroded; the relay never pulls in.', { 'governed-by': ['ohm'] }, HH);
  f('failure.bounce', 'A mechanical contact closing several times in a millisecond before it settles: the spring and the mass ring; a counter reads one press as many unless debounced.', { 'governed-by': ['natural.frequency'] }, HH);
  f('failure.nuisance-trip', 'A fuse or a breaker opening when nothing was wrong: inrush or a transient within its rating but not its curve; a slow-blow fuse rides it out.', { 'governed-by': ['joule'] }, HH);
  f('failure.aging', 'Properties walking with time at a rate that doubles for every 10 K: a fuse element, a capacitor, a human; the Arrhenius clock.', { 'governed-by': ['arrhenius'] }, CALLISTER);
  f('failure.brush-wear', 'Carbon brushes worn down by the commutator: friction and sparking take material each turn; when they are gone the motor stops.', { 'governed-by': ['friction.coulomb', 'joule'] }, HH);
  f('failure.bearing-failure', 'A rolling bearing past its life: subsurface fatigue spalls the race, the noise rises, the shaft wobbles; L10 life goes as the inverse cube of load.', { 'governed-by': ['bearing.life.l10', 'hertz.contact'] });
  f('failure.step-loss', 'A stepper losing steps: the load torque or the acceleration demanded exceeds the pull-out torque at that speed, the rotor falls a pole behind, and the open-loop count is wrong from then on.', { 'governed-by': ['motor.torque', 'newton.second'] }, HH);
  f('failure.arcing', 'Current jumping the gap as a contact opens or a brush lifts: the inductance insists on continuing the current, the gap ionises, and the arc erodes both sides.', { 'governed-by': ['faraday.induction', 'lenz.law'] }, HH);
  f('failure.capacity-fade', 'A battery holding less each cycle: lithium lost to the interface layer, active material cracked and isolated, electrolyte consumed; faster when hot, full or fast-charged.', { 'governed-by': ['arrhenius', 'faraday.electrolysis'] }, NEWMAN);
  f('failure.internal-short', 'A cell shorted inside: a separator punctured by a dendrite or a crush, so the stored energy heats its own cell.', { 'governed-by': ['joule'] }, NEWMAN);
  f('failure.dendrite', 'Metal plated as needles instead of a layer: lithium or zinc at high rate or low temperature grows toward the other electrode and pierces the separator.', { 'governed-by': ['butler-volmer', 'faraday.electrolysis'] }, NEWMAN);
  f('failure.overcharge', 'A cell pushed past full: the electrolyte oxidises, lithium plates, gas forms; heat and pressure follow.', { 'governed-by': ['nernst', 'faraday.electrolysis'] }, NEWMAN);
  f('failure.sulfation', 'A lead-acid battery left discharged: the lead sulfate crystals grow large and hard and no longer dissolve on charge; capacity gone.', { 'governed-by': ['lead-acid.ocv', 'nernst'] }, NEWMAN);
  f('failure.decomposition', 'An electrolyte broken down at an electrode: the voltage outside its stability window, gas and solids made instead of charge moved.', { 'governed-by': ['nernst', 'gibbs.energy'] }, NEWMAN);
  f('failure.whisker', 'Tin growing hair-fine crystals from a plated surface, driven by compressive stress in the plating: they reach millimetres and short neighbouring leads; lead in the solder stopped them.', { 'governed-by': ['fick.diffusion'] }, CALLISTER);
  f('failure.via-cracking', 'A plated hole in a circuit board cracked by thermal cycling: the board expands through its thickness more than the copper barrel can stretch.', { 'governed-by': ['thermal.expansion', 'paris.law'] }, HH);
  f('failure.parasitic-capacitance', 'Capacitance where none was drawn, breadboard rows, long leads, adjacent tracks: picofarads that roll off or make an amplifier sing.', { 'governed-by': ['lumped.time-constant'] }, HH);
  f('failure.hysteresis', 'A sensor giving a different reading on the way up than on the way down: friction, magnetic memory or elastic lag inside it.', { 'governed-by': ['friction.coulomb'] }, HH);
  f('failure.noise', 'A signal with random error on it: thermal noise of the resistance, shot noise of the current, pickup from outside; averaging buys resolution with bandwidth.', { 'governed-by': ['shannon.capacity', 'shannon.sampling'] }, HH);
  f('failure.dead-pixel', 'A pixel stuck on or off: its transistor or its emitter failed; one in millions.', {}, HH);
  f('failure.burn-in', 'An image left in a display: organic emitters age with what they have shown, so the static parts are dimmer than the rest.', { 'governed-by': ['arrhenius'] }, HH);
  f('failure.loading', 'A voltage divider pulled down by what it feeds: the load is in parallel with the lower resistor, and the ratio is no longer the one designed.', { 'governed-by': ['ohm', 'kirchhoff.current'] }, HH);
  f('failure.ripple', 'The AC left on a DC rail: the capacitor discharges between peaks, by current times time over capacitance.', { 'governed-by': ['lumped.time-constant'] }, HH);
  f('failure.inrush', 'The current that charges an empty capacitor at switch-on, limited only by the source and the wiring: fuses blow and contacts weld on it.', { 'governed-by': ['lumped.time-constant', 'joule'] }, HH);
  f('failure.oscillation', 'A loop that feeds itself: gain of one or more at a frequency where the phase has gone round 180°; the amplifier or the controller sings.', { 'governed-by': ['nyquist.stability', 'barkhausen'] }, HH);
  f('failure.clipping', 'An amplifier run past its rails: the output flattens at the supply, and the waveform gains harmonics.', { 'governed-by': ['kirchhoff.voltage'] }, HH);
  f('failure.switching-loss', 'Energy lost each time a transistor passes through its linear region: voltage and current overlap for the switching time, so the loss grows with frequency.', { 'governed-by': ['joule', 'cmos.dynamic'] }, HH);
  f('failure.shoot-through', 'Both transistors of a half bridge on at once, if only for nanoseconds: the supply is shorted through them; dead time between them prevents it.', { 'governed-by': ['joule', 'kirchhoff.current'] }, HH);
  f('failure.undervoltage', 'A gate driver or a logic chip below the voltage it needs: the transistor half on and hot, or the logic wrong; lockout holds everything off until the rail is up.', { 'governed-by': ['joule'] }, HH);
  f('failure.overcurrent', 'More current than the conductor or the device can carry: heating as the square, then melting; a limit or a fuse must act within the thermal time.', { 'governed-by': ['joule', 'lumped.time-constant'] }, HH);
  f('failure.body-diode-recovery', 'The intrinsic diode of a MOSFET still conducting backwards for a moment after its current reverses: the stored charge sweeps out as a current spike into the other switch.', { 'governed-by': ['shockley.diode'] }, HH);
  f('failure.dc-link-failure', 'The capacitor bank between rectifier and inverter failing: ripple current heats it, the electrolyte dries, and the inverter sees a rail that sags or vanishes.', { 'governed-by': ['joule', 'arrhenius'] }, HH);
  f('failure.instability', 'A controlled system that diverges or oscillates instead of settling: too much gain for the delay and the dynamics, so each correction overshoots the next.', { 'governed-by': ['nyquist.stability'] }, OGATA);
  f('failure.windup', 'An integrator that kept summing while the actuator was at its limit: when the error reverses it unwinds first, and the overshoot is large and long.', { 'governed-by': ['nyquist.stability'] }, OGATA);
  f('failure.sensor-noise', 'Noise on the measurement amplified by the derivative term and fed to the actuator: the output chatters; filter it, or lower the gain.', { 'governed-by': ['shannon.sampling'] }, OGATA);
  f('failure.voltage-drop', 'The rail lower at the load than at the source: current times the wire resistance; the motor is weak, the logic resets.', { 'governed-by': ['wire.drop', 'wire.resistance'] }, HH);
  f('failure.ground-loop', 'Two grounds joined by two paths: the loop picks up induced current and the return currents of other loads, so the reference differs from place to place and hum rides on the signal.', { 'governed-by': ['faraday.induction', 'kirchhoff.voltage'] }, HH);
  f('failure.soft-error', 'A bit flipped by a particle: an alpha from the package or a cosmic neutron deposits charge in a cell; nothing is broken, the value is wrong.', { 'governed-by': ['radioactive.decay'] }, HH);
  f('failure.head-crash', 'A disk head touching the platter it flies nanometres above: shock, dust or a worn bearing; the magnetic surface is scraped off.', { 'governed-by': ['bernoulli'] }, TANENBAUM);

  // ------------------------------------------------------------------------------------------- computing
  f('failure.bug', 'A program that does what was written, not what was meant: the specification, the model of the world and the code disagree.', { 'governed-by': ['computability'] }, TANENBAUM);
  f('failure.race-condition', 'Two threads touching one thing with the order left to chance: the result depends on who gets there first, so it passes a thousand times and fails once.', {}, TANENBAUM);
  f('failure.overflow', 'A number past what its bits can hold, wrapping round: a 16-bit timer at 65 535 becomes 0; a buffer written past its end writes something else.', { 'governed-by': ['information.choices'] }, TANENBAUM);
  f('failure.congestion', 'More packets offered than a link can carry: queues fill, delay grows, then packets are dropped and retried, which offers more.', { 'governed-by': ['queueing', 'shannon.capacity'] }, TANENBAUM);
  f('failure.partition', 'A network split into parts that cannot reach each other: each must choose between answering and staying consistent.', { 'governed-by': ['cap.theorem'] }, TANENBAUM);
  f('failure.packet-loss', 'Packets that never arrive: dropped by a full queue, corrupted by noise, lost on a bad link; the protocol must notice and resend.', { 'governed-by': ['shannon.capacity', 'queueing'] }, TANENBAUM);
  f('failure.split-brain', 'Two halves of a cluster each believing it is the leader after a partition: both write, and the writes conflict when they meet.', { 'governed-by': ['cap.theorem'] }, TANENBAUM);
  f('failure.corruption', 'Stored data no longer what was written: a crash mid-write, a bit flip, a bug; checksums find it, journals and replicas repair it.', { 'governed-by': ['information.choices'] }, TANENBAUM);
  f('failure.deadlock', 'Two transactions each waiting for a lock the other holds: neither can move; one must be killed.', { 'governed-by': ['queueing'] }, TANENBAUM);
  f('failure.overfitting', 'A model that memorised its training data: it fits the noise and fails on anything new; more data or fewer parameters.', { 'governed-by': ['universal.approximation', 'bayes.theorem'] }, GOODFELLOW);
  f('failure.vanishing-gradient', 'A deep network whose early layers learn nothing: the gradient is a product of many small factors and dies on the way back.', { 'governed-by': ['universal.approximation'] }, GOODFELLOW);
  f('failure.distribution-shift', 'A model used on a world that differs from the one it learned: the inputs come from elsewhere, and the learned map does not apply.', { 'governed-by': ['bayes.theorem'] }, GOODFELLOW);

  // ------------------------------------------------------------------------------------------- biological
  f('failure.disease', 'The body\'s regulation failed, by pathogen, by its own genes or by wear: a set point lost, a tissue invaded, a loop broken.', {}, GUYTON);
  f('failure.injury', 'Tissue torn, crushed or cut by a load it could not carry: bone fractures, tendons rupture, skin opens; repair by inflammation, then growth.', { 'governed-by': ['stress.axial'] }, GUYTON);
  f('failure.fracture-bone', 'Bone broken: a load past its strength, about 130 MPa in compression along the grain of cortical bone, or many small loads (a stress fracture); it heals by callus, then remodelling.', { 'governed-by': ['stress.bending', 'wolff.law', 'paris.law'] }, GUYTON);
  f('failure.osteoporosis', 'Bone lost faster than made: resorption outruns deposition with age and hormones, the trabeculae thin, and a fall breaks a hip.', { 'governed-by': ['wolff.law'] }, GUYTON);
  f('failure.osteoarthritis', 'Cartilage worn through to bone: the low-friction, water-swollen surface thins with load and age, and the joint grinds and stiffens.', { 'governed-by': ['friction.coulomb', 'hertz.contact'] }, GUYTON);
  f('failure.rupture', 'A tendon snapping under a load past its strength, about 100 MPa, often after degeneration; the muscle then pulls on nothing.', { 'governed-by': ['stress.axial'] }, GUYTON);
  f('failure.tendinopathy', 'A tendon overused: micro-tears faster than repair, disordered collagen, pain and weakness.', { 'governed-by': ['paris.law'] }, GUYTON);
  f('failure.dislocation', 'A joint pushed out of its socket: the capsule and ligaments stretched past their length, so the surfaces no longer meet.', { 'governed-by': ['hooke'] }, GUYTON);
  f('failure.fatigue-muscle', 'A muscle unable to keep up its force: ATP, calcium handling and the nerve-muscle junction all tire; the force decays over seconds to minutes and returns with rest.', { 'governed-by': ['hill.muscle', 'michaelis-menten'] }, GUYTON);
  f('failure.tear', 'Muscle fibres torn by a stretch under load, lengthening contraction most: bleeding, swelling, then repair with some scar.', { 'governed-by': ['hill.muscle'] }, GUYTON);
  f('failure.atrophy', 'Muscle shrinking when unused: protein broken down faster than made; weeks in bed cost a fifth of the strength.', {}, GUYTON);
  f('failure.infarction', 'Heart muscle dying for want of blood: a coronary artery blocked, the tissue beyond it starved of oxygen within minutes.', { 'governed-by': ['fick.diffusion'] }, GUYTON);
  f('failure.arrhythmia', 'The heart\'s rhythm wrong: a pacemaker cell firing out of turn, a conduction path blocked or re-entering; fibrillation pumps nothing.', { 'governed-by': ['hodgkin-huxley'] }, GUYTON);
  f('failure.valve-stenosis', 'A heart valve narrowed: calcified leaflets open less, so the heart works harder across a higher pressure drop.', { 'governed-by': ['bernoulli', 'darcy-weisbach'] }, GUYTON);
  f('failure.wound', 'Skin opened: the barrier against water loss and microbes gone until clotting, inflammation, new tissue and remodelling close it.', {}, GUYTON);
  f('failure.burn', 'Skin cooked: proteins denature above about 45 °C held long enough, deeper with heat and time; the barrier and the fluid balance go with it.', { 'governed-by': ['conduction', 'arrhenius'] }, GUYTON);
  f('failure.apoptosis', 'A cell dismantling itself on command: caspases cut it into packets for its neighbours to eat; the planned death that shapes fingers and removes damaged cells.', {}, GUYTON);
  f('failure.necrosis', 'A cell dying by injury: the membrane fails, the contents spill, inflammation follows.', {}, GUYTON);
  f('failure.cancer', 'A cell lineage that stopped obeying: mutations in growth and checkpoint genes, so it divides without limit, evades death and invades.', { 'governed-by': ['natural.selection'] }, GUYTON);
  f('failure.denaturation', 'A protein unfolded by heat, acid or solvent: the weak bonds that held its shape broken, its function gone with the shape; egg white at 60 °C.', { 'governed-by': ['arrhenius', 'van-der-waals'] }, GUYTON);
  f('failure.misfolding', 'A protein folded wrong: it aggregates with others of its kind, and the aggregate kills cells; prions and amyloids.', { 'governed-by': ['gibbs.energy'] }, GUYTON);
  f('failure.mutation', 'A change in the DNA sequence: copying error, radiation, chemistry; most are silent, some break a protein, a few are the raw material of evolution.', { 'governed-by': ['natural.selection', 'radioactive.decay'] }, GUYTON);
  f('failure.moulting-vulnerability', 'An arthropod between skeletons: the old one shed, the new one soft for hours to days; it can neither defend itself nor carry its weight.', {}, GUYTON);
  f('failure.antibiotic', 'A bacterium killed or stopped by a molecule aimed at what it has and we lack, its wall, its ribosome: resistance is selected whenever some survive.', { 'governed-by': ['natural.selection'] }, GUYTON);
  f('failure.antibody-neutralization', 'A virus coated by antibodies that fit its surface: it can no longer bind its receptor, and is marked for clearing.', {}, GUYTON);
  f('failure.rejection', 'An implant attacked by the immune system or walled off in fibrous tissue: the body reads its surface as foreign; titanium and its oxide are read as nearly nothing.', {}, GUYTON);

  // ------------------------------------------------------------------------------------------- earth
  f('failure.predictability', 'Weather beyond about two weeks: the atmosphere amplifies small differences exponentially, so no measurement is fine enough; the forecast becomes climate.', { 'governed-by': ['navier-stokes'] }, WALLACE);
  f('failure.earthquake', 'A fault slipping: strain stored over decades across a locked fault released in seconds, as waves.', { 'governed-by': ['hooke', 'spring.energy'] }, MARSHAK);
  return p;
}

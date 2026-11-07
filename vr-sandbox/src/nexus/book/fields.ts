// What each field of physics, chemistry and engineering holds as its core laws, and which of them the book has
// (docs/REALITY.md, step 5): the coverage map. Each field's list is what its standard textbook teaches in its opening
// chapters (the sources named), so a law missing here is one a student of the field would expect and not find. A law
// with an id is in the book; one without is missing, named with its formula, so the gap is said, not hidden. The list
// is not every law there is: it is the core each field builds on, and it grows as the book does.

export interface FieldLaw { name: string; formula: string; id?: string }
export interface Field { field: string; from: string; laws: FieldLaw[] }

const l = (name: string, formula: string, id?: string): FieldLaw => ({ name, formula, ...(id ? { id } : {}) });

export const FIELDS: Field[] = [
  { field: 'Mechanics: motion and force', from: 'Young & Freedman, University Physics, 15th ed., ch. 2–11', laws: [
    l('Newton\'s second law', 'F = m a', 'newton.second'), l('Weight', 'W = m g', 'weight'), l('Momentum', 'p = m v', 'momentum.definition'),
    l('Impulse', 'J = F Δt', 'impulse'), l('Conservation of momentum', 'Σ m v before = after', 'conservation.momentum'), l('Work', 'W = F d', 'work.definition'),
    l('Kinetic energy', 'E = ½ m v²', 'energy.kinetic'), l('Potential energy in a field', 'E = m g h', 'energy.potential'), l('Power', 'P = F v', 'power.linear'),
    l('Steady acceleration: speed', 'v = v₀ + a t', 'kinematics.velocity'), l('Steady acceleration: distance', 'x = v₀ t + ½ a t²', 'kinematics.displacement'), l('Steady acceleration: no time', 'v² = v₀² + 2 a x', 'kinematics.timeless'),
    l('Projectile range', 'R = v² sin 2θ / g', 'projectile.range'), l('Centripetal force', 'F = m v² / r', 'centripetal'), l('Dry friction', 'F ≤ μ N', 'friction.coulomb'),
    l('Coefficient of restitution', 'e = v_sep / v_app', 'restitution'), l('Elastic collision of two bodies', 'v₁′ = ((m₁ − m₂) v₁ + 2 m₂ v₂)/(m₁ + m₂)', 'collision.elastic'),
  ] },
  { field: 'Mechanics: rotation and oscillation', from: 'Young & Freedman, ch. 9–10, 14', laws: [
    l('Torque', 'T = F r', 'wheel.torque'), l('Newton\'s second law for rotation', 'T = I α', 'newton.rotational'), l('Angular momentum', 'L = I ω', 'angular-momentum'),
    l('Rotational kinetic energy', 'E = ½ I ω²', 'energy.rotational'), l('Parallel axis theorem', 'I = I_cm + m d²', 'parallel-axis'), l('Power of a torque', 'P = T ω', 'power.rotary'),
    l('Simple pendulum', 'T = 2π √(L/g)', 'pendulum.period'), l('Mass on a spring', 'f = (1/2π) √(k/m)', 'natural.frequency'), l('Damped oscillator', 'x = A e^(−ζ ω t) cos(ω_d t)', 'oscillator.damped'),
    l('Gyroscopic precession', 'Ω = T / (I ω)', 'precession'),
  ] },
  { field: 'Gravitation and orbits', from: 'Young & Freedman, ch. 13', laws: [
    l('Newton\'s law of gravitation', 'F = G m₁ m₂ / r²', 'gravitation.newton'), l('Circular orbit speed', 'v = √(G M / r)', 'orbit.circular-speed'), l('Escape speed', 'v = √(2 G M / r)', 'escape.speed'),
    l('Kepler\'s third law', 'T² = 4π² a³ / (G M)', 'kepler.third'), l('Gravitational potential energy', 'U = −G M m / r', 'gravitation.potential'), l('Vis-viva', 'v² = G M (2/r − 1/a)', 'vis-viva'),
    l('Rocket equation', 'Δv = v_e ln(m₀/m₁)', 'tsiolkovsky'),
  ] },
  { field: 'Relativity', from: 'Young & Freedman, ch. 37', laws: [
    l('Mass–energy equivalence', 'E = m c²', 'mass-energy'), l('Gravitational time dilation', 'τ/t = √(1 − 2GM/(r c²))', 'time.dilation.gravity'),
    l('Lorentz factor', 'γ = 1/√(1 − v²/c²)', 'lorentz.factor'), l('Time dilation of motion', 'Δt = γ Δτ', 'time.dilation.motion'), l('Length contraction', 'L = L₀ / γ', 'length.contraction'), l('Relativistic momentum', 'p = γ m v', 'momentum.relativistic'),
  ] },
  { field: 'Solids: elasticity, strength, fracture, fatigue', from: 'Budynas & Nisbett, Shigley\'s, 10th ed., ch. 3–6; Callister, ch. 6–8', laws: [
    l('Axial stress', 'σ = F / A', 'stress.axial'), l('Strain', 'ε = ΔL / L', 'strain.definition'), l('Hooke\'s law', 'σ = E ε', 'hooke'), l('Poisson contraction', 'ε_t = −ν ε', 'poisson.lateral'),
    l('Shear modulus of an isotropic solid', 'G = E / (2(1+ν))', 'shear-modulus.isotropic'), l('Thermal stress', 'σ = E α ΔT', 'thermal.stress'), l('Bending stress', 'σ = M / S', 'stress.bending'),
    l('Torsion', 'τ = T r / J', 'torsion.solid'), l('Euler buckling', 'P = π² E I / (K L)²', 'buckling.euler'), l('Von Mises', 'σ′ = √(σ² + 3τ²)', 'stress.von-mises'),
    l('Hoop stress', 'σ = p r / t', 'stress.hoop'), l('Griffith fracture', 'σ_f = √(2 E γ / (π a))', 'griffith'), l('Fracture toughness', 'K = Y σ √(π a)', 'fracture.toughness'),
    l('Fatigue life (Basquin)', 'σ_a = σ′_f (2N)^b', 'fatigue.basquin'), l('Goodman mean-stress line', 'σ_a/S_e + σ_m/S_ut = 1/n', 'fatigue.goodman'), l('Hall–Petch', 'σ_y = σ₀ + k d^−½', 'hall-petch'),
    l('Creep (power law)', 'ε̇ = A σⁿ e^(−Q/RT)', 'creep.power-law'), l('Strain energy density', 'u = σ² / (2E)', 'strain-energy.density'),
  ] },
  { field: 'Fluids', from: 'Fox, McDonald & Pritchard, Introduction to Fluid Mechanics, 9th ed., ch. 3–8', laws: [
    l('Pressure', 'p = F / A', 'pressure.definition'), l('Hydrostatic pressure', 'p = ρ g h', 'hydrostatic'), l('Buoyancy', 'F = ρ g V', 'buoyancy'), l('Continuity', 'A₁ v₁ = A₂ v₂', 'continuity'),
    l('Bernoulli', 'p + ½ ρ v² + ρ g z = const', 'bernoulli'), l('Reynolds number', 'Re = ρ v L / μ', 'reynolds'), l('Pipe friction (Darcy–Weisbach)', 'Δp = f (L/D) ρ v²/2', 'darcy-weisbach'),
    l('Laminar pipe flow (Hagen–Poiseuille)', 'Q = π r⁴ Δp / (8 μ L)', 'poiseuille'), l('Drag', 'F = ½ ρ C_d A v²', 'drag.aero'), l('Lift', 'L = ½ ρ C_L A v²', 'lift.aero'),
    l('Stokes drag', 'F = 6π μ r v', 'stokes.drag'), l('Terminal speed', 'v = √(2 m g / (ρ C_d A))', 'terminal.speed'), l('Torricelli', 'v = √(2 g h)', 'free-fall.speed'),
    l('Turbulent friction factor (Colebrook: implicit, f on both sides, so not a term; solved through Haaland\'s fit)', '1/√f = −2 log(ε/3.7D + 2.51/(Re √f))'), l('Turbulent friction factor, explicit (Haaland)', '1/√f = −1.8 log((ε/D/3.7)^1.11 + 6.9/Re)', 'friction-factor.haaland'), l('Surface tension pressure (Young–Laplace)', 'ΔP = 2γ/r', 'laplace.pressure'),
  ] },
  { field: 'Heat and thermodynamics', from: 'Bergman et al., Fundamentals of Heat and Mass Transfer, 7th ed.; Çengel & Boles, Thermodynamics, 9th ed.', laws: [
    l('First law', 'ΔU = Q − W', 'first.law'), l('Carnot efficiency', 'η = 1 − T_c/T_h', 'carnot'), l('Heat engine efficiency', 'η = W/Q_h', 'heat-engine.efficiency'),
    l('Heat capacity', 'Q = m c ΔT', 'heat.capacity'), l('Latent heat', 'Q = m L', 'heat.latent-flow'), l('Conduction (Fourier)', 'q = k A ΔT/L', 'conduction'),
    l('Convection (Newton)', 'q = h A ΔT', 'convection'), l('Radiation (Stefan–Boltzmann)', 'q = ε σ A (T⁴ − T∞⁴)', 'radiation'), l('Thermal expansion', 'ΔL = α L ΔT', 'thermal.expansion'),
    l('Ideal gas', 'p V = n R T', 'ideal.gas'), l('Kinetic theory: mean energy', 'E = 3/2 k T', 'gas.molecular-energy'), l('Kinetic theory: rms speed', 'v = √(3RT/M)', 'gas.rms-speed'),
    l('Adiabatic ideal gas', 'p V^γ = const', 'gas.adiabatic'), l('Entropy change of heating', 'ΔS = m c ln(T₂/T₁)', 'entropy.heating'), l('Clausius–Clapeyron', 'dp/dT = L/(T Δv)', 'clausius-clapeyron'),
    l('Lumped cooling', 'τ = m c/(h A)', 'lumped.time-constant'), l('Fin efficiency', 'η = tanh(m L)/(m L)', 'fin.efficiency'), l('Dittus–Boelter', 'Nu = 0.023 Re^0.8 Pr^n', 'dittus-boelter'),
  ] },
  { field: 'Waves, sound and acoustics', from: 'Kinsler et al., Fundamentals of Acoustics, 4th ed.; Young & Freedman, ch. 15–16', laws: [
    l('Wave speed', 'v = f λ', 'wave.speed'), l('Speed of sound in a gas', 'c = √(γ R T/M)', 'sound.speed.gas'), l('Speed of sound in a bar', 'c = √(E/ρ)', 'sound.speed'),
    l('Doppler shift', 'f′ = f c/(c − v_s)', 'doppler.source'), l('Sound intensity level', 'L = 10 log(I/I₀)', 'sound.level'), l('Mass law of a wall', 'TL = 20 log(m f) − 47', 'acoustic.mass-law'),
    l('String harmonics', 'f_n = n v / (2L)', 'string.harmonics'), l('Inverse square spreading', 'I = P / (4π r²)', 'inverse-square'), l('Wave speed on a string', 'v = √(T/μ)', 'string.wave-speed'),
  ] },
  { field: 'Optics and light', from: 'Hecht, Optics, 5th ed.', laws: [
    l('Snell\'s law', 'n₁ sin θ₁ = n₂ sin θ₂', 'snell.law'), l('Thin lens', '1/f = 1/d_o + 1/d_i', 'thin.lens'), l('Diffraction limit', 'θ = 1.22 λ/D', 'diffraction.limit'),
    l('Bragg\'s law', 'n λ = 2 d sin θ', 'bragg.law'), l('Photon energy', 'E = h f', 'photon.energy.frequency'), l('Photon energy from wavelength', 'E = h c/λ', 'planck.energy'),
    l('Wien displacement', 'λ_max = b/T', 'wien'), l('Magnification', 'm = −d_i/d_o', 'magnification'), l('Double-slit fringes', 'y = m λ L / d', 'double-slit'), l('Malus\'s law', 'I = I₀ cos² θ', 'malus'),
    l('Beer–Lambert absorption', 'A = ε l c', 'beer-lambert'),
  ] },
  { field: 'Electricity and magnetism', from: 'Griffiths, Introduction to Electrodynamics, 4th ed.; Horowitz & Hill, ch. 1', laws: [
    l('Coulomb\'s law', 'F = k q₁q₂/r²', 'coulomb.law'), l('Ohm\'s law', 'V = I R', 'ohm'), l('Electric power', 'P = V I', 'power.electric'), l('Joule heating', 'P = I²R', 'joule'),
    l('Charge and current', 'Q = I t', 'charge.definition'), l('Capacitance', 'Q = C V', 'capacitor.charge'), l('Parallel plates', 'C = ε₀ε_r A/d', 'capacitance.plates'),
    l('Energy in a capacitor', 'E = ½ C V²', 'capacitor.energy'), l('Energy in an inductor', 'E = ½ L I²', 'inductor.energy'), l('RC time constant', 'τ = R C', 'rc.time-constant'),
    l('Resistance of a wire', 'R = ρ L/A', 'wire.resistance'), l('Lorentz force on a charge', 'F = q v B', 'lorentz.charge'), l('Force on a current', 'F = B I L', 'lorentz.force'),
    l('Faraday induction', 'V = −N dΦ/dt', 'faraday.induction'), l('Solenoid field', 'B = μ₀ N I/L', 'ampere.law'), l('Field of a long wire', 'B = μ₀ I / (2π r)', 'wire.field'),
    l('Resistors in series', 'R = R₁ + R₂', 'resistors.series'), l('Resistors in parallel', '1/R = 1/R₁ + 1/R₂', 'resistors.parallel'), l('Transformer', 'V₂/V₁ = N₂/N₁', 'transformer'), l('Skin depth', 'δ = 1/√(π f μ σ)', 'skin.depth'),
    l('EM wave speed', 'v = 1/√(μ ε)', 'wave.speed.electromagnetic'), l('LC resonance', 'f = 1/(2π √(L C))', 'lc.resonance'),
  ] },
  { field: 'Atomic, nuclear and quantum', from: 'Griffiths & Schroeter, Introduction to Quantum Mechanics, 3rd ed.; Young & Freedman, ch. 38–43', laws: [
    l('Planck–Einstein', 'E = h f', 'photon.energy.frequency'), l('de Broglie', 'λ = h/(m v)', 'de-broglie'), l('Hydrogen levels', 'E_n = −13.6 eV/n²', 'hydrogen.levels'),
    l('First-order decay', 'N = N₀ e^(−λ t)', 'decay.first-order'), l('Half-life', 't½ = ln 2/λ', 'half-life'), l('Activity', 'A = λ N', 'radioactive.activity'),
    l('Boltzmann distribution', 'n₂/n₁ = e^(−ΔE/kT)', 'boltzmann.distribution'), l('Photoelectric effect', 'K_max = h f − φ', 'photoelectric'), l('Heisenberg uncertainty', 'Δx Δp ≥ ħ/2', 'uncertainty.heisenberg'),
    l('Particle in a box', 'E_n = n² h²/(8 m L²)', 'particle-in-box'), l('Binding energy', 'E_b = Δm c²', 'mass-energy'), l('Compton shift', 'Δλ = (h/m c)(1 − cos θ)', 'compton'),
  ] },
  { field: 'Chemistry: equilibrium, kinetics, electrochemistry', from: 'Atkins, de Paula & Keeler, Physical Chemistry, 11th ed.', laws: [
    l('Ideal gas', 'p V = n R T', 'ideal.gas'), l('Gibbs energy', 'ΔG = ΔH − TΔS', 'gibbs.energy'), l('Arrhenius rate', 'k = A e^(−E_a/RT)', 'arrhenius'), l('Nernst', 'E = E⁰ − (RT/zF) ln Q', 'nernst'),
    l('Faraday\'s electrolysis', 'm = M I t/(z F)', 'faraday.electrolysis'), l('pH', 'pH = −log[H⁺]', 'ph'), l('Michaelis–Menten', 'v = V S/(K + S)', 'michaelis-menten'),
    l('Fick\'s first law', 'J = D ΔC/L', 'fick.diffusion'), l('Henry\'s law', 'C = p/k_H', 'henry.solubility'), l('Osmotic pressure', 'π = c R T', 'osmotic.van-t-hoff'),
    l('Equilibrium constant from ΔG', 'K = e^(−ΔG°/RT)', 'equilibrium.constant'), l('Raoult\'s law', 'p = x p*', 'raoult'), l('Second-order rate law', '1/[A] = 1/[A]₀ + k t', 'rate.second-order'), l('Van \'t Hoff equation', 'ln(K₂/K₁) = −ΔH/R (1/T₂ − 1/T₁)', 'vant-hoff'),
  ] },
  { field: 'Information and signals', from: 'Cover & Thomas, Elements of Information Theory, 2nd ed.', laws: [
    l('Information in a choice', 'H = log₂ N', 'information.choices'), l('Shannon capacity', 'C = B log₂(1 + S/N)', 'shannon.capacity'), l('Sampling theorem', 'f_s ≥ 2 f_max', 'shannon.sampling'),
    l('Landauer\'s limit', 'E = k T ln 2', 'landauer'), l('Little\'s law', 'L = λ W', 'queueing'), l('Entropy of a distribution, for two outcomes', 'H = −p log₂ p − (1−p) log₂(1−p)', 'entropy.binary'), l('Entropy of a distribution of many outcomes', 'H = −Σ p log₂ p'),
  ] },
  { field: 'Machine elements', from: 'Budynas & Nisbett, Shigley\'s, 10th ed., ch. 7–18', laws: [
    l('Bolt torque', 'T = K F d', 'bolt.torque.nut-factor'), l('Helical spring rate', 'k = G d⁴/(8 D³ n)', 'spring.rate'), l('Spring force', 'F = k x', 'spring.hooke'),
    l('Bearing life', 'L10 = (C/P)^p', 'bearing.life.l10'), l('Gear torque', 'T_out = T_in i η', 'gear.output.torque'), l('Lewis bending', 'σ = W_t/(b m Y)', 'gear.lewis'),
    l('Capstan', 'T₁/T₂ = e^(μθ)', 'capstan'), l('Power screw efficiency', 'η = tan λ/tan(λ + φ)', 'screw.efficiency'), l('Hertz contact', 'p₀ = (6 F E*²/(π³R²))^⅓', 'hertz.contact'),
    l('Shaft critical speed', 'ω = √(k/m)', 'shaft.critical-speed'), l('Belt power', 'P = (T₁ − T₂) v', 'belt.power'), l('Clutch torque (uniform wear)', 'T = μ F (r_o + r_i)/2', 'clutch.torque'),
  ] },
];

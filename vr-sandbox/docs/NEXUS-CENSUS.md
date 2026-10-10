# Nexus census

2026-10-05: 704 asks in 51 s on 4 threads. Written by `npm run nexus:census -- out.jsonl --report docs/NEXUS-CENSUS.md` (src/nexus/substrate/census.ts); every build counts as built only when its own checks hold.

## How each kind of ask fared

| kind | built | with flaws | read, not embodied | not read | past its budget |
| --- | ---: | ---: | ---: | ---: | ---: |
| carried | 65 | 119 | 30 | 0 | 0 |
| people | 24 | 8 | 0 | 0 | 0 |
| place | 36 | 0 | 0 | 0 | 0 |
| parts | 1 | 13 | 0 | 0 | 4 |
| term | 16 | 1 | 0 | 387 | 0 |

## What stops builds, by how many it stops

- **387** × unread: no reading of a build of this kind: the words name nothing the reader turns into an ask — e.g. *build a mechanism*
- **276** × flaw: gap: every element the generator derived is embodied, or is a gap — e.g. *a cart that is pedal powered that carries 5 kg at 8 km/h → nothing designs conversion "aboard:the payload" yet: power a person can keep up becomes the momentum the moving region g*
- **171** × gap: the hottest it may run is a property of what it is made of: no available matter states its most potential for energy — e.g. *a cart that runs on solar that carries 5 kg at 8 km/h*
- **122** × gap: how hard the fluid pushes back on a shape where its momentum is carried (its drag coefficient) is not generated: the store and the power cannot be sized — e.g. *a cart that runs on solar that carries 5 kg at 8 km/h*
- **72** × flaw: source: every load has a source — e.g. *a cart that is pedal powered that carries 5 kg at 8 km/h → it draws power and stores none: no source designed*
- **51** × gap: the structure's own weight is its members' matter times their size: no system is generated from an element — e.g. *a cart that runs on solar that carries 5 kg at 8 km/h*
- **30** × gap: moving across a moving medium needs a push across from a second medium (a keel in water, a contact on ice): the language does not yet pair two media — e.g. *a cart driven by the wind that carries 5 kg at 30 km/h*
- **29** × flaw: solar area: A = P/(G η) — e.g. *a cart that runs on solar that carries 5 kg at 8 km/h → cruising takes 0.41 m² of panel on 1000 W/m²; its top has 0.14 m²*
- **19** × flaw: mass: the mass a drive moves includes the drive and its store: m = f(m) settles only where f grows slower than m — e.g. *a drone that carries 5 kg at 10 m/s → its mass runs away: 6.1 → 12.7 → 19.3 → 26.9 kg, each round adding more than the last; what it carries, as asked, is pas*
- **18** × gap: the want asks 2 m/s² and the contact carries at most 1.96 m/s² with the site's friction — e.g. *a train on rails that runs on solar that carries 5 kg at 60 km/h*
- **18** × unbuilt: nothing designs conversion "thrust:the payload/light" yet: or the moving region emits light behind it and is pushed by its momentum: nothing is spent but power, and each watt pushes by one over the speed of light — e.g. *a craft in a vacuum that carries 5 kg at 100 m/s*
- **17** × gap: the want asks 2 m/s² and the contact carries at most 0.49 m/s² with the site's friction — e.g. *a sled on ice that runs on solar that carries 5 kg at 15 km/h*
- **17** × gap: what load:the ice->the payload carries from the ice is not derived, so what the ice gives at most (friction on ice) cannot be checked — e.g. *a sled on ice that runs on solar that carries 5 kg at 15 km/h*
- **17** × flaw: interference: no two solids in one place — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part → M5×30 socket head cap screw (ISO 4762), through rail z top right into the tapped end and spool bracket 40 × 40 × 4 mm, a*
- **13** × gap: what refill:charge:moving:the payload carries from a charging point is not derived, so what a charging point gives at most (most power it gives) cannot be checked — e.g. *a drone that carries 5 kg at 10 m/s*
- **13** × gap: strength between layers over the material's strength (1) is about no carrier: the language has no rule for it — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part*
- **13** × gap: time to take the part out (s) is about no carrier: a want on how long a process takes, and the language has no process — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part*
- **13** × gap: shortening it means splitting the flow into streams side by side, or bringing the change into the matter otherwise than through its surface (mixing it, heating it within): neither is generated — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part*
- **13** × gap: what path:charge:the grid->the part carries from the grid is not derived, so what the grid gives at most (most power the outlet gives) cannot be checked — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part*
- **13** × gap: what path:charge:the grid->flows:volume of PLA:the part carries from the grid is not derived, so what the grid gives at most (most power the outlet gives) cannot be checked — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part*
- **13** × gap: the depth of voltage at the wall [the grid]: a potential of 120 V across 0.00175 m gives a unit charge of what settles at 5.29e-11 m between 5.82e-25 J and 1.92e-17 J, and its binding (2.18e-18 J) lies between: whether it is taken apart is set by how far a charge moves freely before it strikes something, a datum of the matter's state that no kept matter states — e.g. *a 3D printer for parts up to 100 mm, tolerance 0.1 mm, 8 hours a part*
- **12** × gap: nothing offers the power to move — e.g. *a submarine driven by the wind that carries 5 kg at 1 m/s*
- **10** × flaw: held: every part has a load path to the ground — e.g. *a 3D printer for parts up to 250 mm, tolerance 0.1 mm, 2 hours a part → 1 part held by nothing: brass nozzle M6×1, 0.20 mm orifice, stream 1 of 563*
- **9** × gap: whether the water boils around the moving region is its shape's least pressure coefficient: not generated — e.g. *a boat that runs on solar that carries 5 kg at 12 m/s*
- **8** × flaw: strength: σ = M c / I — e.g. *a car for 7 people on petrol that goes 50 km at 60 km/h → no stocked section holds 13.7 kN m within a third of yield*
- **8** × gap: whether outside air flows is not said (its temperature against what its matter flows above): it is taken to, as the moving region passes through it — e.g. *a car for 7 people on petrol that goes 50 km at 60 km/h*
- **8** × gap: the want asks 8 m/s² and the contact carries at most 6.86 m/s² with the site's friction — e.g. *a car for 7 people on petrol that goes 50 km at 60 km/h*
- **8** × gap: nothing in the site receives volume of water — e.g. *a car for 7 people on petrol that goes 50 km at 60 km/h*
- **8** × gap: what the boundary is made of: no available matter states its conductivity for energy — e.g. *a car for 7 people on petrol that goes 50 km at 60 km/h*
- **8** × gap: what the boundary is made of: no available matter states its conductivity for volume of water — e.g. *a car for 7 people on petrol that goes 50 km at 60 km/h*

## How far each domain of the manifold is reached

| domain | built from its ask | made as a part | gap | terms |
| --- | ---: | ---: | ---: | ---: |
| Mechanical | 1 | 7 | 11 | 19 |
| Electrical / electronics | 0 | 12 | 11 | 23 |
| Computing | 0 | 0 | 20 | 20 |
| Software / digital worlds | 0 | 0 | 15 | 15 |
| Automotive | 6 | 5 | 7 | 18 |
| Aircraft / aerospace | 1 | 0 | 14 | 15 |
| Spacecraft | 2 | 0 | 15 | 17 |
| Biological | 0 | 1 | 17 | 18 |
| Medical / bioengineering | 0 | 0 | 12 | 12 |
| Chemical | 0 | 2 | 12 | 14 |
| Materials | 0 | 2 | 15 | 17 |
| Energy | 0 | 5 | 10 | 15 |
| Robotics | 2 | 4 | 11 | 17 |
| Manufacturing / fabrication | 1 | 0 | 15 | 16 |
| Architecture / construction | 2 | 2 | 10 | 14 |
| Spatial / environmental systems | 1 | 0 | 12 | 13 |
| Virtual / augmented / mixed reality | 0 | 1 | 13 | 14 |
| Human / ergonomic systems | 0 | 2 | 10 | 12 |
| Communication | 0 | 0 | 12 | 12 |
| Control / autonomy | 0 | 2 | 9 | 11 |
| Fluid / thermal | 0 | 4 | 8 | 12 |
| Optical / photonic | 0 | 2 | 9 | 11 |
| Acoustic / vibration | 0 | 0 | 9 | 9 |
| Agricultural / ecological | 0 | 0 | 9 | 9 |
| Ocean / underwater | 2 | 0 | 7 | 9 |
| Earth / planetary | 0 | 1 | 8 | 9 |
| Astronomical / cosmic | 0 | 0 | 9 | 9 |
| Micro / nano | 0 | 0 | 8 | 8 |
| Information / knowledge | 0 | 0 | 10 | 10 |
| Safety / reliability | 0 | 3 | 7 | 10 |
| Self-building / self-modifying systems | 0 | 0 | 10 | 10 |
| Universal / cross-domain | 0 | 1 | 25 | 26 |

## The slowest

- 20.0 s, timeout: a 3D printer for parts up to 500 mm, tolerance 0.1 mm, 8 hours a part
- 20.0 s, timeout: a 3D printer for parts up to 500 mm, tolerance 0.1 mm, 2 hours a part
- 20.0 s, timeout: a 3D printer for parts up to 500 mm, tolerance 0.1 mm, 24 hours a part
- 20.0 s, timeout: a 3D printer for parts up to 500 mm, tolerance 0.3 mm, 2 hours a part
- 19.0 s, flawed: a 3D printer for parts up to 250 mm, tolerance 0.1 mm, 2 hours a part
- 6.3 s, flawed: a 3D printer for parts up to 500 mm, tolerance 0.3 mm, 8 hours a part
- 4.6 s, flawed: a 3D printer for parts up to 500 mm, tolerance 0.3 mm, 24 hours a part
- 2.5 s, flawed: a 3D printer for parts up to 250 mm, tolerance 0.1 mm, 8 hours a part

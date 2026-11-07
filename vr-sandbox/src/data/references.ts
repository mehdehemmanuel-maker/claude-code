// What real things are made of, as research notes (src/nexus/research.ts reads the format): each part named with the
// page it was read on, and how sure: confirmed (the page says it of this very engine), sibling (of its sister in the same
// series, the A25A), typical (of every such engine). A pattern's alternatives are split by ; (| splits the columns). Researched by web search on 2026-10-27; where a page was found only
// in a search's summary and not opened, that is what it is cited for. A dealer's parts listing is cited as typical where
// its fit to this car was not confirmed.

/** Toyota's M20A-FKS (2.0 L Dynamic Force four, the 2025 Corolla LE's), with what hangs on it in the car. */
export const M20A_FKS_NOTES = `
@TOY | https://global.toyota/en/mobility/tnga/powertrain2018/engine/index.html | Toyota: TNGA powertrain 2018, the Dynamic Force engine (D-4S, multi-hole direct injector, VVT-iE, variable cooling, motor-driven water pump, heated thermostat, continuously variable-capacity oil pump, compact hydraulic lash adjuster)
@TC | https://toyota-club.net/files/faq/18-03-20_faq_df_r4_eng.htm | Toyota-Club: A25·M20 Dynamic Force series (R4): D-4S combined injection, DVVT-iE, Miller cycle; open-deck aluminium block with cast-iron liners; 1987 cc, 80.5 × 97.6 mm
@WIKI | https://en.wikipedia.org/wiki/Toyota_Dynamic_Force_engine | Wikipedia: Toyota Dynamic Force engine (A25A: VVT-iE on the intake cam, hydraulic VVT on the exhaust; the high-pressure pump on its own lobe of the exhaust cam)
@MML | https://mymotorlist.com/engines/toyota/m20a-fks/ | mymotorlist: M20A-FKS (16 valves, hydraulic lifters, timing chain, EGR and its liquid cooler)
@VSP | https://vehicleservicepros.com/service-repair/diagnostics-and-drivability/article/55037008/toyotas-dynamic-force-engines | Vehicle Service Pros: Toyota's Dynamic Force engines (laser-clad intake valve seats, press-fit exhaust seats; mapped thermostat opening at 176–183 °F)
@ACR | https://australiancar.reviews/review-toyota-e210-corolla-sedan-2019-on/ | AustralianCar.Reviews: E210 Corolla (D-4S port or direct injection by conditions; CVT with a launch gear)
@MNT | https://parts.olathetoyota.com/v-2025-toyota-corolla--fx--2-0l-l4-gas/engine--engine-and-trans-mounting?assembly=3 | Olathe Toyota parts: 2025 Corolla 2.0 L, engine and transmission mounting
@ENG | https://parts.olathetoyota.com/v-2025-toyota-corolla--le--2-0l-l4-gas/engine--engine | Olathe Toyota parts: 2025 Corolla LE 2.0 L, engine (dipstick, VVT oil control valve listed; fit across models not confirmed)
@EMI | https://www.autonationparts.com/v-2025-toyota-corolla-cross--le--2-0l-l4-gas/emission-system--emission-components | AutoNation parts: 2025 Corolla Cross 2.0 L (the same M20A), emission components (crankcase vent valve)
@SNS | https://www.hptuners.com/?p=1183410 | HP Tuners: common EFI sensors (crank and cam position, knock, MAP, coolant temperature, oxygen)
@SNS2 | https://www.enginelabs.com/?p=6229 | EngineLabs: the modern engine sensors listed and explained
@BELT | https://www.vehicleservicepros.com/sponsored/video/55312692/tech-tip-from-serpentine-belts-to-oaps-what-to-know-about-accessory-drive-systems | Vehicle Service Pros: accessory drive systems (one belt off the crank to the alternator, water pump, A/C compressor; spring-loaded tensioner and idler)
@HAR | https://www.hpacademy.com/forum/practical-harness-construction-club-level/show/harness-layout-help/ | HP Academy: harness layout (sensor loom and output loom joining the chassis harness at bulkhead connectors; three wires a sensor)
@ECU | https://patents.google.com/patent/US6712052 | US 6712052 B2: engine control unit (reads its sensors, drives injectors and coils)

# id | name | in | n | finds | source | level | says | wrong
block-sys | the block and what turns in it | | 1 | | | typical | its casting, crank, pistons and rods
block | cylinder block casting | block-sys | 1 | ^block casting$ | TC | confirmed | open deck, aluminium
liner | cylinder liner | block-sys | 4 | ^cylinder liner$ | TC | confirmed | cast iron, cast in
crank | crankshaft | block-sys | 1 | ^crankshaft$ | TC | typical | turns in five mains (four cylinders)
piston | piston | block-sys | 4 | ^piston$ | TC | typical | one a cylinder
rod | connecting rod | block-sys | 4 | ^connecting rod$ | TC | typical | one a cylinder
knock | knock sensor | block-sys | 1 | ^knock sensor$ | SNS | typical | a piezoelectric element bolted to the block, listening for detonation
knock-piezo | piezo element | knock | 1 | piezo | SNS | typical | the crystal that gives a voltage when the block rings
ckp | crank position sensor | block-sys | 1 | ^crank(shaft)? position sensor$ | SNS | typical | the crank's speed and where it is, for spark and fuel timing
ckp-wheel | crank timing rotor | block-sys | 1 | timing rotor;reluctor;tone wheel | SNS2 | typical | the toothed wheel on the crank the sensor reads
mounts | engine mount | block-sys | 3+ | engine mount;transmission mount | MNT | typical | rubber mounts holding the engine and gearbox in the car (the left one listed for this car)
drive | CVT drive plate and ring gear | block-sys | 1 | drive plate;flex ?plate | ACR | confirmed | the Corolla LE's gearbox is a CVT (with a launch gear): its engine drives a torque converter through a thin drive plate, not a clutch on a flywheel | ^flywheel$

head-sys | the head and its valvetrain | | 1 | | | typical | its casting, valves, cams, timing
head | cylinder head casting | head-sys | 1 | ^head casting$ | MML | typical | aluminium, four valves a cylinder
valves | valve | head-sys | 16 | ^(intake;exhaust) valve$ | MML | confirmed | 16 valves
seat | valve seat | head-sys | 16 | valve seat | VSP | sibling | intake seats laser-clad into the head (thin), exhaust seats pressed in
hla | hydraulic lash adjuster | head-sys | 16 | lash adjuster | TOY | confirmed | a compact hydraulic lash adjuster under each valve's rocker | ^bucket tappet$
rocker | rocker arm (roller finger follower) | head-sys | 16 | rocker arm;finger follower | TOY | typical | a lash adjuster is the pivot of a finger rocker riding on the cam: one a valve
cams | camshaft | head-sys | 2 | ^(intake;exhaust) camshaft$ | TC | confirmed | twin cams (DVVT-iE)
vvt-in | intake cam phaser, electric (VVT-iE) | head-sys | 1 | vvt-ie;electric (cam )?phaser | WIKI | sibling | an electric motor turns the intake cam against its sprocket
vvt-ex | exhaust cam phaser, hydraulic (VVT-i) | head-sys | 1 | hydraulic (cam )?phaser;vvt-i (actuator;phaser) | WIKI | sibling | oil pressure turns the exhaust cam against its sprocket
ocv | VVT oil control valve | head-sys | 1 | oil control valve | ENG | typical | the solenoid that ports oil to the exhaust phaser
cmp | cam position sensor | head-sys | 2 | ^cam(shaft)? position sensor$ | SNS | typical | one a cam (each cam is phased on its own)
chain | timing chain | head-sys | 1 | ^timing chain$ | MML | confirmed | a chain, not a belt
cover | cam cover | head-sys | 1 | ^cam cover$ | MML | typical | the head's lid
plug | spark plug | head-sys | 4 | ^spark plug$ | TC | typical | one a cylinder
coil | ignition coil | head-sys | 4 | ^ignition coil$ | TC | typical | a coil on each plug

fuel-sys | fuel (D-4S) | | 1 | | | typical | direct and port injection
di | direct injector | fuel-sys | 4 | direct injector | TOY | confirmed | a multi-hole injector into each cylinder
pfi | port injector | fuel-sys | 4 | port injector | ACR | confirmed | D-4S injects into the ports at light load, both at mid load
hpp | high-pressure fuel pump | fuel-sys | 1 | high.pressure (fuel )?pump | WIKI | sibling | driven by its own lobe on the exhaust cam
hpp-lobe | its cam lobe | hpp | 1 | lobe;plunger | WIKI | sibling | the pump's plunger rides a lobe of the exhaust cam
rail | fuel rail | fuel-sys | 2 | fuel rail;delivery pipe | ACR | typical | a high-pressure rail for the direct injectors and a low-pressure one for the port injectors
fps | fuel pressure sensor | fuel-sys | 1 | fuel pressure sensor | SNS2 | typical | on the high-pressure rail

air-sys | air in | | 1 | | | typical | manifold, throttle, sensors, EGR
manifold | intake manifold | air-sys | 1 | ^intake manifold$ | TC | typical | runners to each port
throttle | electronic throttle body | air-sys | 1 | ^throttle body$ | SNS | typical | a motor-driven throttle plate
tps | throttle position sensor | throttle | 1 | ^throttle position sensor$ | SNS | typical | where the plate is, to the ECU
map | manifold pressure sensor | air-sys | 1 | ^manifold (absolute )?pressure sensor$;^map sensor$ | SNS | typical | the manifold's vacuum, for how much air goes in
egr | EGR valve | air-sys | 1 | ^egr valve$ | MML | confirmed | exhaust let back into the intake
egrc | EGR cooler | air-sys | 1 | ^egr cooler$ | MML | confirmed | a liquid cooler on the EGR path
pcv | PCV (crankcase vent) valve | air-sys | 1 | pcv;crankcase vent | EMI | typical | lets blow-by out of the crankcase into the intake

exh-sys | exhaust | | 1 | | | typical | manifold, catalyst, sensors
exman | exhaust manifold | exh-sys | 1 | ^exhaust manifold$ | TC | typical | the four ports gathered
cat | catalytic converter | exh-sys | 1 | catalytic converter;catalyst | SNS | typical | close to the manifold so it lights off soon
o2 | air-fuel ratio sensor and oxygen sensor | exh-sys | 2 | oxygen sensor;o2 sensor;air.fuel (ratio )?sensor;lambda | SNS | typical | an air-fuel ratio sensor before the catalyst for the mixture, an oxygen sensor after it to watch the catalyst
shield | exhaust heat shield | exh-sys | 1 | heat shield | TC | typical | between the manifold and what is near it

cool-sys | cooling | | 1 | | | typical | electric pump, thermostat, sensor, hoses
ewp | electric water pump | cool-sys | 1 | ^water pump$ | TOY | confirmed | motor-driven, not off the belt | water pump pulley
ewp-motor | its motor | ewp | 1 | motor;stator;winding | TOY | confirmed | the pump turned by its own motor
thermo | thermostat (heated, mapped) | cool-sys | 1 | thermostat | VSP | confirmed | opens at 176–183 °F, heated to open sooner when the ECU asks
ect | coolant temperature sensor | cool-sys | 1 | ^coolant temperature sensor$;^ect sensor$ | SNS | typical | cold starts, fan, fuel
hoses | coolant hose | cool-sys | 3+ | (coolant;radiator;heater) hose | BELT | typical | to the radiator and the heater core

oil-sys | oiling | | 1 | | | typical | pump, filter, pan, dipstick
pump | variable-capacity oil pump | oil-sys | 1 | ^oil pump$ | TOY | confirmed | its delivery varied continuously
pump-sol | its control solenoid | pump | 1 | solenoid;control valve | TOY | typical | sets how much the pump gives
filter | oil filter | oil-sys | 1 | ^oil filter$ | ENG | typical | spin-on or cartridge
pan | oil pan | oil-sys | 1 | ^oil pan$ | ENG | typical | holds the oil under the crank
dipstick | oil dipstick and its tube | oil-sys | 1 | dipstick | ENG | typical | to read the oil's level
ops | oil pressure switch | oil-sys | 1 | ^oil pressure (switch;sensor)$ | SNS2 | typical | lights the warning lamp when pressure falls

acc-sys | what the belt drives, and the starter | | 1 | | | typical | one ribbed belt off the crank
belt | ribbed belt | acc-sys | 1 | ribbed belt | BELT | typical | one belt off the crank pulley
tens | belt tensioner | acc-sys | 1 | belt tensioner | BELT | typical | spring-loaded, with its idler
alt | alternator | acc-sys | 1 | ^alternator$ | BELT | typical | on the belt
alt-stator | stator | alt | 1 | ^stator$ | BELT | typical | three-phase windings
alt-rotor | rotor | alt | 1 | ^rotor$ | BELT | typical | claw poles round a field coil
alt-diode | rectifier diode | alt | 6 | rectifier diode | BELT | typical | three phases rectified both ways
alt-reg | voltage regulator | alt | 1 | voltage regulator | BELT | typical | holds the field current to the charge wanted
ac | A/C compressor | acc-sys | 1 | a/?c compressor;air.conditioning compressor | BELT | typical | on the belt, through its clutch
ac-clutch | its magnetic clutch | ac | 1 | clutch;pulley | BELT | typical | engages the compressor from its pulley
starter | starter motor | acc-sys | 1 | ^starter motor$ | HAR | typical | its own heavy cable
sol | starter solenoid | starter | 1 | starter solenoid | HAR | typical | throws the pinion in and closes the motor's contacts

ctl-sys | control | | 1 | | | typical | the ECU and the harness to everything it reads and drives
ecu | engine control unit (ECU) | ctl-sys | 1 | \\becu\\b;engine control unit | ECU | typical | reads the sensors, drives injectors, coils, throttle, phasers
harness | engine wiring harness | ctl-sys | 1 | harness | HAR | typical | a sensor loom and an output loom joined to the car's at bulkhead connectors
conn | connector | harness | 20+ | connector | HAR | typical | one on each sensor and actuator (three wires a sensor)
`;

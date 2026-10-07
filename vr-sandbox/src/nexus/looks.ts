// The typical size and shape of each entry of the inventory that was written out by hand without its size: a shape
// kind (src/nexus/pieces.ts draws each), its box in millimetres, and for some a tooth count (z44) or a mark (a vehicle's
// "two" or "four" wheels, a frame's "tri"angle). These are typical sizes, an estimate for each: a bicycle wheel 700 mm
// across, a NEMA 17 stator 42 mm, an Arduino Uno 69 × 53 mm. Parts made to sizes by their families carry their own.

export const LOOKS: Record<string, string> = {
  // motors and their parts
  'lamination-stack': 'ring 30 30 20', winding: 'ring 28 28 18', 'shaft-steel': 'rod 5 5 60', commutator: 'ring 10 10 8', 'carbon-brush': 'box 5 5 8', 'brush-spring': 'spring 5 5 10',
  'magnet-ferrite-arc': 'box 20 6 25', 'magnet-ndfeb': 'box 10 3 10', 'motor-can': 'tube 28 28 38', 'sleeve-bearing': 'ring 6 6 6', armature: 'can 22 22 25', 'gearbox-n20': 'box 12 10 9',
  'stator-stepper': 'ring 42 42 30', 'rotor-stepper': 'can 22 22 28', 'bldc-outrunner': 'motor 28 28 30', solenoid: 'box 20 15 30', 'rotor-cage': 'can 40 40 50', 'motor-shaded-pole': 'box 60 50 40',
  'dcmotor-550': 'motor 36 36 57', 'field-coil': 'ring 50 50 30', 'motor-universal': 'motor 60 60 90', 'rotor-claw': 'can 90 90 70', alternator: 'can 140 140 160', 'hub-motor': 'can 200 200 60',
  // electronics
  'pcb-bare': 'board 50 1.6 30', 'lead-wire': 'rod 0.6 0.6 25', 'si-die': 'sheet 3 0.3 3', 'bond-wire': 'rod 0.03 0.03 2', 'lead-frame': 'sheet 10 0.2 10', 'mould-compound': 'box 6 2 6', 'ic-package': 'chip 10 6 3',
  'pin-header': 'box 51 8.5 2.5', 'screw-terminal': 'box 10 10 7.5', 'wire-hookup': 'coil 1.6 1.6 1000', 'crimp-contact': 'box 2 2 10', 'jst-xh': 'box 10 7 6', 'usb-c-socket': 'box 9 3.3 7', 'smd-passives': 'box 2 0.5 1.25',
  'resistor-film': 'can 2.5 2.5 6.3', 'capacitor-electrolytic': 'can 8 8 12', 'capacitor-ceramic': 'box 2 1.25 1.25', 'inductor-power': 'box 6 3 6', potentiometer: 'can 17 17 10', 'fuse-glass': 'can 5 5 20', crystal: 'box 11 3.5 4.5',
  'thermistor-ntc': 'dome 2 2 4', 'led-5mm': 'dome 5 5 8.6', 'diode-1n4007': 'can 2.7 2.7 5.2', 'mosfet-to220': 'chip 10 15 4.5', ws2812b: 'chip 5 5 1.6', 'esp32-module': 'board 18 3 25.5', 'esp32-devkit': 'board 28 12 55',
  'drv8833-board': 'board 18 3 16', 'a4988-board': 'board 15 10 20', 'buck-module': 'board 43 14 21', 'vl53l1x-board': 'board 13 3 18', 'mpu6050-board': 'board 21 3 16', 'bme280-board': 'board 13 3 10', 'strain-gauge': 'sheet 6 0.1 12',
  'thermocouple-k': 'rod 3 3 150', 'image-sensor': 'chip 8 8 1', 'lens-stack': 'can 12 12 10', 'camera-module': 'board 25 9 24', 'servo-board': 'board 20 2 15', relay: 'box 19 15 15.5', pushbutton: 'box 6 5 6',
  transformer: 'box 57 46 48', 'bms-board': 'board 45 3 10', 'heater-cartridge': 'rod 6 6 20', 'heated-bed': 'board 220 1.6 220', speaker: 'can 66 66 30', 'buzzer-piezo': 'can 12 12 9.5', 'led-bulb': 'dome 60 60 110',
  'led-strip': 'coil 10 3 1000', 'usb-cable': 'coil 4 4 1000', multimeter: 'case 75 35 145', 'lcd-glass': 'sheet 71 2 24', probes: 'rod 8 8 120', 'transformer-ferrite': 'box 25 20 25', 'printer-board': 'board 100 15 70',
  'lcd-module': 'board 98 12 60', esc: 'board 30 6 15', 'flight-controller': 'board 36 6 36', xt60: 'box 16 8 16', 'rc-receiver': 'box 40 12 20', 'micro-switch': 'box 20 10 6.5', 'encoder-rotary': 'can 12 12 20',
  'optical-sensor': 'chip 10 10 3', keyswitch: 'box 15.6 18 15.6', 'arduino-uno': 'board 69 15 53', 'raspberry-pi': 'board 85 17 56', 'laser-diode': 'can 5.6 5.6 6', 'lens-collimator': 'can 6 6 3', 'laser-driver': 'board 12 3 12',
  'servo-driver': 'board 62 10 25', 'ir-sensor': 'board 30 7 14', 'boost-module': 'board 30 6 17', 'pcb-matrix': 'board 160 1.6 160', 'junction-box': 'box 110 25 100', 'guitar-pickup': 'box 70 18 18',
  // power
  'jelly-roll': 'can 17.5 17.5 60', 'cell-can': 'tube 18 18 65', 'cell-cap': 'can 15 15 2', 'pack-2s': 'box 37 19 70', 'pouch-cell': 'box 35 6 70', 'pack-lipo-4s': 'box 35 30 75', 'pack-5s': 'box 75 75 120',
  'psu-24v': 'box 215 30 115', 'solar-cell': 'sheet 156 0.2 156', 'solar-panel': 'sheet 1700 35 1000', 'power-bank': 'case 140 15 70', 'power-cord': 'coil 7 7 1500',
  // bearings, motion, springs
  'bearing-625': 'bearing 16 16 5', 'bearing-ring': 'ring 22 22 7', 'bearing-ball': 'ball 4 4 4', 'bearing-cage': 'ring 18 18 3', 'bearing-shield': 'ring 21 21 0.4', lm8uu: 'tube 15 15 24', 'bushing-bronze': 'ring 12 12 10',
  'worm-set': 'gear 30 30 10', 'planet-gearbox': 'can 36 36 30', 'gt2-belt': 'loop 130 130 6', 'lead-screw-t8': 'rod 8 8 300', 'linear-rail': 'tslot 12 8 300', 'smooth-rod': 'rod 8 8 300',
  'spring-compression': 'spring 10 10 30', 'spring-extension': 'spring 8 8 30', 'spring-torsion': 'spring 12 12 8', 'gas-spring': 'can 18 18 250', caster: 'wheel 50 50 20', 'wheel-robot': 'wheel 65 65 26', 'omni-wheel': 'wheel 58 58 25',
  'hinge-butt': 'sheet 50 2 75', 'rod-end': 'box 22 40 8', 'u-joint': 'rod 16 16 40', 'drive-gear': 'gear 11 11 11 z36', 'shock-rc': 'can 12 12 80', 'heat-pipe': 'rod 6 6 200',
  // fluid
  'pump-gear': 'box 60 70 50', 'pump-peristaltic': 'box 40 60 40', 'valve-ball': 'box 50 45 40', 'valve-solenoid': 'box 40 70 30', 'cylinder-hydraulic': 'can 50 50 300', hose: 'coil 35 35 1500', diaphragm: 'ring 30 30 1', 'valve-flap': 'sheet 10 0.5 10', 'pump-diaphragm': 'box 90 60 40',
  // hardware and stock
  'extrusion-2020': 'tslot 20 20 500', 'screw-m5': 'screw 5 5 16', 'screw-set': 'rod 3 3 4', 'screw-wood': 'screw 4 4 30', 'nut-m3': 'hex 5.5 5.5 2.4', 'nut-lock': 'hex 5.5 5.5 4', 'washer-m3': 'ring 7 7 0.5', 'rivet-pop': 'rod 3.2 3.2 10',
  'sheet-al': 'sheet 300 2 200', 'tube-steel': 'box 20 20 500', 'acrylic-sheet': 'sheet 300 3 200', plywood: 'sheet 300 6 200',
  // tools
  screwdriver: 'rod 30 30 200', 'driver-shaft': 'rod 6 6 100', 'hex-key': 'rod 3 3 66', pliers: 'box 50 160 12', 'caliper-digital': 'sheet 230 16 70', 'soldering-iron': 'rod 20 20 220', 'iron-plating': 'rod 4 4 15',
  'drill-chuck': 'can 35 35 45', 'clutch-drill': 'ring 40 40 15', 'trigger-switch': 'box 30 40 20', 'drill-cordless': 'case 250 230 80',
  // the 3D printer
  nozzle: 'hex 7 7 13', 'heat-break': 'rod 6 6 22', hotend: 'box 23 60 16', 'fan-30': 'fan 30 30 10', extruder: 'box 45 50 45', 'printer-frame': 'frame 440 470 440', 'printer-fdm': 'frame 440 470 440',
  // vehicles
  'rim-bike': 'torus 640 640 22', spoke: 'rod 2 2 290', 'nipple-spoke': 'rod 4 4 12', 'hub-bike': 'can 60 60 100', 'tyre-bike': 'torus 700 700 28', 'inner-tube': 'torus 690 690 25', 'wheel-bike': 'wheel 700 700 28',
  'frame-bike': 'frame 1000 600 100 tri', 'fork-bike': 'box 100 400 50', 'crank-arm': 'box 30 170 15', chainring: 'gear 200 200 4 z44', 'bottom-bracket': 'can 35 35 68', crankset: 'gear 200 200 60 z44', 'chain-bike': 'loop 440 440 8',
  freewheel: 'gear 70 70 25 z16', pedal: 'box 100 25 70', saddle: 'case 270 60 150', handlebar: 'rod 25 25 600', 'brake-arm': 'box 15 80 30', 'brake-pad': 'box 50 15 10', 'brake-rim': 'box 100 120 40', 'brake-cable': 'coil 5 5 1500',
  bicycle: 'vehicle 1750 1050 600 two', 'tyre-scooter': 'torus 200 200 50', 'wheel-scooter': 'wheel 200 200 50', 'deck-scooter': 'sheet 500 40 150', 'stem-scooter': 'rod 35 35 900', 'brake-disc': 'ring 120 120 2',
  'brake-caliper-disc': 'box 70 60 40', 'throttle-thumb': 'box 50 30 40', 'e-scooter': 'vehicle 1100 1150 450 two', 'deck-skate': 'sheet 800 12 210', griptape: 'sheet 840 1 230', truck: 'box 180 60 60',
  skateboard: 'vehicle 800 110 210 four', 'rc-car': 'vehicle 400 150 250 four', quadcopter: 'frame 350 80 350',
  // the home
  'toaster-case': 'case 280 180 190', 'toast-carriage': 'box 250 130 20', toaster: 'case 280 180 190', 'blade-blender': 'blade 60 20 60', 'blade-assembly': 'blade 70 50 70', 'jar-blender': 'can 130 130 220', blender: 'can 160 160 400',
  'fan-vacuum': 'fan 120 120 40', 'filter-hepa': 'box 130 60 130', 'dust-bin': 'can 130 130 250', 'brush-roll': 'rod 40 40 250', 'vacuum-cleaner': 'case 450 300 350', 'heater-coil': 'spring 30 30 60',
  'dryer-housing': 'case 230 230 90', 'hair-dryer': 'case 230 230 90', 'driver-headphone': 'can 40 40 10', headband: 'loop 180 180 30', 'ear-cushion': 'torus 70 70 20', 'audio-cable': 'coil 3.5 3.5 1200', headphones: 'loop 200 200 70',
  'fan-guard': 'ring 300 300 20', 'desk-fan': 'fan 300 300 120', mouse: 'case 60 38 115', keyboard: 'case 440 35 135', 'bimetal-strip': 'ring 14 14 0.5', 'thermostat-bimetal': 'can 20 20 15', 'heating-element': 'torus 150 150 8',
  kettle: 'can 160 160 230', flashlight: 'can 25 25 140', 'smoke-alarm': 'can 110 110 40', 'spark-plug': 'rod 21 21 80', 'irrigation-controller': 'case 150 100 50',
  // light, heat, sound, robots
  'laser-module': 'can 12 12 35', 'te-pellet': 'box 1.4 1.6 1.4', 'copper-tab': 'sheet 3 0.3 1.5', 'peltier-module': 'sheet 40 3.8 40', 'fin-stack': 'tslot 120 100 50 fins', 'base-cooler': 'box 40 5 40', 'cpu-cooler': 'tslot 125 155 75 fins',
  gripper: 'box 80 100 40', 'robot-arm-desk': 'box 150 300 150', 'line-follower': 'vehicle 150 50 120 two', 'led-matrix': 'board 165 15 165',
};
/** An entry's typical look, read from the table: its shape, its size (mm), its teeth and its mark. */
export function lookRow(id: string): { kind: string; size: [number, number, number]; teeth?: number; mark?: string } | null {
  const r = LOOKS[id]; if (!r) return null;
  const [kind, x, y, z, ...rest] = r.split(/\s+/) as [string, string, string, string, ...string[]];
  const teeth = rest.find((t) => /^z\d+$/.test(t)), mark = rest.find((t) => !/^z\d+$/.test(t));
  return { kind, size: [Number(x), Number(y), Number(z)], ...(teeth ? { teeth: Number(teeth.slice(1)) } : {}), ...(mark ? { mark } : {}) };
}

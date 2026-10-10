// Electrical and electronic parts sold by the reel and the bag: fuses, chip resistors and capacitors, inductors,
// crystals, potentiometers, diodes, transistors, regulators, chips, LEDs, cells and batteries, power supplies,
// connectors and terminals, switches, cables, sensors, displays, lamps and lasers. Values from their standards (IEC
// 60127 fuse ratings, IEC 60063 E-series, IEC 60086 cell sizes, IEC 60584 thermocouples, IEC 60751 RTDs, BS 7671
// flexible cord ratings); parts named by their makers' part numbers carry those numbers' datasheet ratings.

import { ax, bare, cyl, decades, E12, E24, gOf, range, ring, si, unit, type KindDef, type P } from './core';
import { chipSolids, pkgBox, pkgMakeup, pkgMass, pkgOf, smdLedDies, smdLedSolids, solidsMass } from '../packages';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
/** IEC 60127 rated currents (the R10 series), A. */
const R10A = [0.05, 0.063, 0.08, 0.1, 0.125, 0.16, 0.2, 0.25, 0.315, 0.4, 0.5, 0.63, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10, 12.5, 16, 20];
const E96 = Array.from({ length: 96 }, (_, k) => +(10 ** (k / 96)).toPrecision(3));
/** Chip resistor packages: length, width, height (mm) and their usual power (W). */
const CHIP: Record<string, [number, number, number, number]> = { '0201': [0.6, 0.3, 0.23, 0.05], '0402': [1, 0.5, 0.35, 0.0625], '0603': [1.6, 0.8, 0.45, 0.1], '0805': [2, 1.25, 0.5, 0.125], '1206': [3.2, 1.6, 0.55, 0.25], '2010': [5, 2.5, 0.55, 0.5], '2512': [6.3, 3.2, 0.55, 1] };
/** Diodes by part number: kind, reverse volts, forward amps, forward volts at that current, package. */
const DIODES: Record<string, [string, number, number, number, string]> = {
  '1N4001': ['rectifier', 50, 1, 1.1, 'DO-41'], '1N4002': ['rectifier', 100, 1, 1.1, 'DO-41'], '1N4004': ['rectifier', 400, 1, 1.1, 'DO-41'], '1N4007': ['rectifier', 1000, 1, 1.1, 'DO-41'],
  '1N5400': ['rectifier', 50, 3, 1.2, 'DO-201'], '1N5404': ['rectifier', 400, 3, 1.2, 'DO-201'], '1N5408': ['rectifier', 1000, 3, 1.2, 'DO-201'], UF4007: ['ultrafast', 1000, 1, 1.7, 'DO-41'],
  '1N4148': ['signal', 100, 0.2, 1, 'DO-35'], '1N5817': ['Schottky', 20, 1, 0.45, 'DO-41'], '1N5819': ['Schottky', 40, 1, 0.6, 'DO-41'], '1N5822': ['Schottky', 40, 3, 0.525, 'DO-201'],
  SS14: ['Schottky', 40, 1, 0.5, 'SMA'], SS34: ['Schottky', 40, 3, 0.5, 'SMA'], BAT54: ['Schottky', 30, 0.2, 0.8, 'SOT-23'], M7: ['rectifier', 1000, 1, 1.1, 'SMA'],
};
/** Transistors by part number: type, volts, amps, package; a MOSFET's on-resistance (Ω) at 10 V gate. */
const TRANS: Record<string, [string, number, number, string, number?]> = {
  '2N2222A': ['NPN', 40, 0.6, 'TO-92'], '2N3904': ['NPN', 40, 0.2, 'TO-92'], '2N3906': ['PNP', 40, 0.2, 'TO-92'], BC547: ['NPN', 45, 0.1, 'TO-92'], BC557: ['PNP', 45, 0.1, 'TO-92'],
  S8050: ['NPN', 25, 0.5, 'TO-92'], S8550: ['PNP', 25, 0.5, 'TO-92'], TIP120: ['NPN Darlington', 60, 5, 'TO-220'], TIP31C: ['NPN', 100, 3, 'TO-220'], TIP32C: ['PNP', 100, 3, 'TO-220'],
  '2N7000': ['N-MOSFET', 60, 0.2, 'TO-92', 5], BS170: ['N-MOSFET', 60, 0.5, 'TO-92', 5], AO3400: ['N-MOSFET', 30, 5.7, 'SOT-23', 0.027], AO3401: ['P-MOSFET', 30, 4, 'SOT-23', 0.044],
  IRLZ44N: ['N-MOSFET', 55, 47, 'TO-220', 0.022], IRF540N: ['N-MOSFET', 100, 33, 'TO-220', 0.044], IRF9540N: ['P-MOSFET', 100, 23, 'TO-220', 0.117], IRFZ44N: ['N-MOSFET', 55, 49, 'TO-220', 0.0175],
};
/** Regulators by part number: output volts ("adj" for adjustable), amps, dropout volts, package. */
const REGS: Record<string, [string, number, number, string]> = {
  '7805': ['5', 1.5, 2, 'TO-220'], '7806': ['6', 1.5, 2, 'TO-220'], '7808': ['8', 1.5, 2, 'TO-220'], '7809': ['9', 1.5, 2, 'TO-220'], '7812': ['12', 1.5, 2, 'TO-220'], '7815': ['15', 1.5, 2, 'TO-220'], '7824': ['24', 1.5, 2, 'TO-220'],
  '7905': ['-5', 1.5, 2, 'TO-220'], '7912': ['-12', 1.5, 2, 'TO-220'], '78L05': ['5', 0.1, 1.7, 'TO-92'], LM317: ['adj', 1.5, 3, 'TO-220'], LM337: ['adj-', 1.5, 3, 'TO-220'],
  'AMS1117-1.8': ['1.8', 1, 1.3, 'SOT-223'], 'AMS1117-3.3': ['3.3', 1, 1.3, 'SOT-223'], 'AMS1117-5.0': ['5', 1, 1.3, 'SOT-223'], 'MCP1700-3.3': ['3.3', 0.25, 0.178, 'SOT-23'], 'LM2940-5.0': ['5', 1, 0.5, 'TO-220'],
};
/** Chips by part number: what each is, and the packages it is sold in. */
const CHIPS: Record<string, [string, string[]]> = {
  NE555: ['timer', ['DIP-8', 'SOIC-8']], NE556: ['dual timer', ['DIP-14', 'SOIC-14']], LM358: ['dual op-amp', ['DIP-8', 'SOIC-8']], LM324: ['quad op-amp', ['DIP-14', 'SOIC-14']], TL072: ['dual JFET op-amp', ['DIP-8', 'SOIC-8']], NE5532: ['dual low-noise op-amp', ['DIP-8', 'SOIC-8']],
  LM393: ['dual comparator', ['DIP-8', 'SOIC-8']], LM386: ['audio amplifier, 0.3 W', ['DIP-8', 'SOIC-8']], '74HC00': ['quad NAND', ['DIP-14', 'SOIC-14']], '74HC04': ['hex inverter', ['DIP-14', 'SOIC-14']], '74HC08': ['quad AND', ['DIP-14', 'SOIC-14']],
  '74HC14': ['hex Schmitt inverter', ['DIP-14', 'SOIC-14']], '74HC32': ['quad OR', ['DIP-14', 'SOIC-14']], '74HC86': ['quad XOR', ['DIP-14', 'SOIC-14']], '74HC138': ['3-to-8 decoder', ['DIP-16', 'SOIC-16']], '74HC165': ['parallel-in shift register', ['DIP-16', 'SOIC-16']],
  '74HC245': ['octal bus transceiver', ['DIP-20', 'SOIC-20']], '74HC595': ['serial-in shift register with latch', ['DIP-16', 'SOIC-16']], CD4017: ['decade counter', ['DIP-16', 'SOIC-16']], CD4051: ['8-channel analogue mux', ['DIP-16', 'SOIC-16']],
  ULN2003: ['seven Darlington drivers', ['DIP-16', 'SOIC-16']], L293D: ['dual H-bridge, 0.6 A', ['DIP-16']], ATMEGA328P: ['8-bit microcontroller, 32 KB flash', ['DIP-28', 'TQFP-32']], ATTINY85: ['8-bit microcontroller, 8 KB flash', ['DIP-8', 'SOIC-8']],
  ATMEGA2560: ['8-bit microcontroller, 256 KB flash', ['TQFP-100']], STM32F103C8: ['32-bit Cortex-M3, 64 KB flash', ['LQFP-48']], RP2040: ['dual Cortex-M0+, 264 KB RAM', ['QFN-56']], CH340G: ['USB to serial', ['SOIC-16']], FT232RL: ['USB to serial', ['SSOP-28']],
  MAX232: ['RS-232 driver', ['DIP-16', 'SOIC-16']], MAX485: ['RS-485 transceiver', ['DIP-8', 'SOIC-8']], PCF8574: ['I²C 8-bit port expander', ['DIP-16', 'SOIC-16']], DS3231: ['I²C real-time clock with its crystal', ['SOIC-16']], DS1307: ['I²C real-time clock', ['DIP-8', 'SOIC-8']],
  AT24C256: ['I²C EEPROM, 32 KB', ['DIP-8', 'SOIC-8']], W25Q32: ['SPI flash, 4 MB', ['SOIC-8']], TP4056: ['one-cell Li-ion charger, 1 A', ['SOIC-8']], MCP3008: ['8-channel 10-bit ADC', ['DIP-16', 'SOIC-16']], ADS1115: ['4-channel 16-bit ADC', ['MSOP-10']],
  MCP2515: ['CAN controller', ['DIP-18', 'SOIC-18']], HX711: ['24-bit ADC for load cells', ['SOIC-16']], PAM8403: ['stereo class-D amplifier, 3 W', ['SOIC-16']], DRV8825: ['stepper driver, 1.5 A', ['HTSSOP-28']], A4988: ['stepper driver, 1 A', ['QFN-28']], TMC2209: ['quiet stepper driver, 2 A', ['QFN-28']],
  INA219: ['I²C current and power monitor', ['SOIC-8']], LM2596: ['buck regulator, 3 A', ['TO-263']], MT3608: ['boost regulator, 2 A', ['SOT-23-6']], A3144: ['Hall switch', ['TO-92']], SS49E: ['linear Hall sensor', ['TO-92']], DS18B20: ['1-wire thermometer', ['TO-92']],
  PC817: ['optocoupler', ['DIP-4']], '6N137': ['fast optocoupler, 10 Mbit/s', ['DIP-8']], MOC3021: ['opto triac driver', ['DIP-6']], LM35: ['analogue thermometer, 10 mV/°C', ['TO-92']],
};
/** A package's pins, and its box, mass and make-up as its outline draws it (src/nexus/packages.ts: JEDEC, nominal). */
const PKG = (pk: string): [number, number] => { const q = pkgOf(pk)!; return [q.pins, +pkgMass(q).toFixed(4)]; };
const pkgBoxOf = (pk: string): [number, number, number] => pkgBox(pkgOf(pk)!);
const pkgOfMakeup = (pk: string): string => pkgMakeup(pkgOf(pk)!);
/** A Zener's package by its power: 0.5 W in glass (DO-35), 1 W moulded (DO-41), 5 W moulded (DO-201). */
const ZENER_PKG = (P: number) => (P >= 5 ? 'DO-201' : P >= 1 ? 'DO-41' : 'DO-35');
/** A ceramic chip capacitor's thickness by its case (mm; its width, but a 1210's 2.5, typical). */
const MLCC_LWT = (pk: string): [number, number, number] => { const c = CHIP[pk] ?? [3.2, 2.5, 1, 0]; return [c[0], c[1], pk === '1210' ? 2.5 : c[1]]; };
/** What the library draws each electronic size as (src/nexus/components.ts): a semiconductor's package by its family
 *  and sizes; a chip passive's case; a surface LED's; an LED's die by its colour. */
export const packageOf = (family: string, p: P): string | null => (family === 'chip' ? s(p, 'pkg') : family === 'transistor' ? TRANS[s(p, 'part')]?.[3] ?? null : family === 'regulator' ? REGS[s(p, 'part')]?.[3] ?? null : family === 'diode' ? DIODES[s(p, 'part')]?.[4] ?? null : family === 'zener' ? ZENER_PKG(n(p, 'P')) : null);
export const chipCase = (pk: string): [number, number, number] | null => (CHIP[pk] ? (CHIP[pk]!.slice(0, 3) as [number, number, number]) : null);
export const mlccCase = (pk: string): [number, number, number] => MLCC_LWT(pk);
export const smdLedCase = (pk: string): [number, number, number] | null => (LED_PKG[pk] ? (LED_PKG[pk]!.slice(0, 3) as [number, number, number]) : null);
export const ledDieOf = (colour: string): 'gan' | 'algainp' => (LED_VF[colour]?.[1].startsWith('algainp') ? 'algainp' : 'gan');
/** IEC 60086 cells: dimensions (mm; diameter × height, or w × d × h), mass (g) and capacity (mAh) by chemistry (typical). */
const CELLS: Record<string, { dim: number[]; chem: Record<string, [number, number, number]> }> = {
  AA: { dim: [14.5, 50.5], chem: { alkaline: [1.5, 2500, 23], lithium: [1.5, 3000, 15], nimh: [1.2, 2000, 27] } }, AAA: { dim: [10.5, 44.5], chem: { alkaline: [1.5, 1150, 11.5], lithium: [1.5, 1200, 7.6], nimh: [1.2, 800, 12] } },
  C: { dim: [26.2, 50], chem: { alkaline: [1.5, 7800, 66], nimh: [1.2, 4500, 80] } }, D: { dim: [34.2, 61.5], chem: { alkaline: [1.5, 17000, 135], nimh: [1.2, 9000, 160] } }, '9V': { dim: [26.5, 17.5, 48.5], chem: { alkaline: [9, 550, 45], lithium: [9, 1200, 34], nimh: [8.4, 200, 40] } },
  AAAA: { dim: [8.3, 42.5], chem: { alkaline: [1.5, 600, 6.5] } }, N: { dim: [12, 30.2], chem: { alkaline: [1.5, 1000, 9] } }, '23A': { dim: [10.3, 28.5], chem: { alkaline: [12, 55, 8] } },
  CR2032: { dim: [20, 3.2], chem: { lithium: [3, 225, 3] } }, CR2025: { dim: [20, 2.5], chem: { lithium: [3, 160, 2.5] } }, CR2016: { dim: [20, 1.6], chem: { lithium: [3, 90, 1.7] } }, CR1220: { dim: [12.5, 2], chem: { lithium: [3, 40, 0.8] } },
  CR1632: { dim: [16, 3.2], chem: { lithium: [3, 140, 1.8] } }, CR2450: { dim: [24.5, 5], chem: { lithium: [3, 620, 6.2] } }, CR123A: { dim: [17, 34.5], chem: { lithium: [3, 1500, 17] } }, LR44: { dim: [11.6, 5.4], chem: { alkaline: [1.5, 150, 2] } }, SR626: { dim: [6.8, 2.6], chem: { silveroxide: [1.55, 28, 0.4] } },
};
const CHEM_OF: Record<string, string> = { alkaline: 'battery-can cathode-ring anode-gel cell-separator current-collector cell-seal negative-cap battery-label', lithium: 'battery-can lithium-anode cathode-ring cell-separator cell-seal negative-cap electrolyte-li', nimh: 'battery-can nimh-positive nimh-negative cell-separator*2 cap-plate cell-seal koh-electrolyte battery-label', silveroxide: 'battery-can silver-oxide-pellet anode-gel cell-separator cell-seal negative-cap' };
/** Thermocouple types (IEC 60584): legs, the range a class 2 one is good over (°C), and its Seebeck coefficient near 25 °C (µV/K, about). */
const TC: Record<string, [string, string, number, number, number]> = { K: ['chromel', 'alumel', -40, 1200, 41], J: ['iron', 'constantan', -40, 750, 52], T: ['copper', 'constantan', -40, 350, 41], E: ['chromel', 'constantan', -40, 900, 61], N: ['nicrosil', 'nisil', -40, 1200, 27], R: ['pt-rh13', 'platinum', 0, 1600, 6], S: ['pt-rh10', 'platinum', 0, 1600, 6], B: ['pt-rh30', 'pt-rh6', 600, 1700, 0.3] };
const SECTIONS = [0.14, 0.25, 0.5, 0.75, 1, 1.5, 2.5];
/** Flexible cords: current a 2-core carries (A), BS 7671 table 4F3A. */
const CORD_A: Record<number, number> = { 0.5: 3, 0.75: 6, 1: 10, 1.25: 13, 1.5: 16, 2.5: 25, 4: 32 };
/** Coax types: impedance (Ω), outside (mm), centre conductor (mm). */
const COAX: Record<string, [number, number, number]> = { RG174: [50, 2.8, 0.48], RG316: [50, 2.5, 0.53], RG58: [50, 4.95, 0.9], RG59: [75, 6.15, 0.81], RG6: [75, 6.9, 1.02], RG213: [50, 10.3, 2.26], LMR400: [50, 10.29, 2.74] };
/** Inductive proximity sensors (IEC 60947-5-2): rated sensing distance, flush and non-flush, mm. */
const PROX: Record<string, [number, number]> = { M8: [1.5, 2.5], M12: [2, 4], M18: [5, 8], M30: [10, 15] };
/** DIN 46228-4 ferrule colours by cross-section, mm². */
const FERRULE: Record<number, string> = { 0.5: 'white', 0.75: 'grey', 1: 'red', 1.5: 'black', 2.5: 'blue', 4: 'grey', 6: 'yellow', 10: 'red', 16: 'blue', 25: 'yellow', 35: 'red', 50: 'blue' };
/** ISO 8820-3 blade fuse colours, by rating. */
const BLADE: Record<number, string> = { 1: 'black', 2: 'grey', 3: 'violet', 4: 'pink', 5: 'tan', 7.5: 'brown', 10: 'red', 15: 'blue', 20: 'yellow', 25: 'natural', 30: 'green', 35: 'blue-green', 40: 'orange' };
const LED_VF: Record<string, [number, string]> = { red: [2, 'algainp'], orange: [2, 'algainp'], yellow: [2.1, 'algainp'], green: [3, 'gan'], blue: [3.1, 'gan'], white: [3.1, 'gan yag-phosphor'], warmwhite: [3.1, 'gan yag-phosphor'] };
const LED_PKG: Record<string, [number, number, number, number]> = { '0603': [1.6, 0.8, 0.6, 0.02], '0805': [2, 1.25, 0.8, 0.02], '1206': [3.2, 1.6, 1, 0.02], '2835': [3.5, 2.8, 0.8, 0.15], '3528': [3.5, 2.8, 1.9, 0.02], '5050': [5, 5, 1.6, 0.06], '5730': [5.7, 3, 0.8, 0.15] };
/** Displays: what each is, its active size, its board (w × h mm, typical). */
const DISPLAYS: Record<string, [string, number, number, string]> = {
  LCD1602: ['16 × 2 character LCD (HD44780)', 80, 36, 'lcd-glass'], LCD2004: ['20 × 4 character LCD (HD44780)', 98, 60, 'lcd-glass'], OLED096: ['0.96" 128 × 64 OLED (SSD1306)', 27, 27, 'glass'], OLED130: ['1.3" 128 × 64 OLED (SH1106)', 36, 34, 'glass'],
  TFT18: ['1.8" 128 × 160 TFT (ST7735)', 35, 57, 'lcd-glass'], TFT24: ['2.4" 240 × 320 TFT (ILI9341)', 43, 70, 'lcd-glass'], TFT28: ['2.8" 240 × 320 TFT touch (ILI9341)', 50, 86, 'lcd-glass'], TFT35: ['3.5" 320 × 480 TFT (ILI9486)', 56, 98, 'lcd-glass'],
  EPD29: ['2.9" 296 × 128 e-paper', 79, 36, 'glass'], SEG4: ['0.56" four-digit 7-segment LED', 50, 19, 'gan'], MAX7219: ['8 × 8 LED matrix (MAX7219)', 32, 32, 'algainp'],
};

/** Micro switches' bodies by size, mm (length, thickness, height) and weight, g (typical of the subminiature, miniature and
 *  standard bodies makers sell, Omron's SS, D2F-type and V-type among them); its housing's share of its box (its cavity
 *  the rest, typical). One table for its drawing (components.ts) and its weight. */
export const SNAP: Record<string, { L: number; T: number; H: number; g: number; fill: number }> = {
  subminiature: { L: 20, T: 6.5, H: 10, g: 2, fill: 0.85 }, miniature: { L: 28, T: 10, H: 16, g: 5, fill: 0.6 }, standard: { L: 49, T: 18, H: 17, g: 15, fill: 0.55 } };
export const ELECTRICAL: KindDef[] = [
  {
    id: 'fuse', name: 'cartridge fuse', path: 'Electrical/Circuit protection/Cartridge fuses', says: 'a wire in a glass or ceramic tube that melts open when too much current flows', std: 'IEC 60127, 5 × 20 and 6.3 × 32 mm, the rated currents of its R10 series',
    axes: [bare('size', 'size', ['5x20', '6.3x32']), bare('speed', 'speed', ['F', 'T']), unit('A', 'rated current', 'A', (p) => R10A.filter((a) => a <= (p.size === '5x20' ? 10 : 20)))],
    title: (p) => `fuse ${String(p.size).replace('x', ' × ')} mm, ${p.speed === 'F' ? 'fast' : 'time-lag'}, ${p.A} A`, of: () => 'fuse-tube fuse-cap*2 fuse-element', make: 'assemble', how: 'a fuse wire (or a spiral, for time-lag) soldered between two plated brass caps on a glass or ceramic tube',
    spec: (p) => `${p.A} A; ${p.speed === 'F' ? 'fast-acting (F)' : 'time-lag (T): it rides out a switch-on surge'}; 250 V; opens within about 2 min at 2.1 × (IEC 60127-2)`, box: (p) => { const [d, L] = String(p.size).split('x').map(Number) as [number, number]; return [d, d, L]; }, g: (p) => (p.size === '5x20' ? 0.5 : 1.8),
  },
  {
    id: 'bladefuse', name: 'blade fuse', path: 'Electrical/Circuit protection/Blade fuses', says: 'a plastic-bodied fuse with two blades, for cars and 12 V', std: 'ISO 8820-3 mini and regular (ATO) blades, with their colours',
    axes: [bare('type', 'type', ['mini', 'regular']), unit('A', 'rating', 'A', (p) => [1, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 35, 40].filter((a) => a <= (p.type === 'mini' ? 30 : 40)))],
    title: (p) => `${p.type} blade fuse, ${p.A} A (${BLADE[n(p, 'A')]})`, of: () => 'fuse-element faceplate', make: 'assemble', how: 'a stamped zinc-alloy element moulded into a coloured polycarbonate body', spec: (p) => `${p.A} A, ${BLADE[n(p, 'A')]}; 32 V`,
    box: (p) => (p.type === 'mini' ? [10.9, 3.6, 16.3] : [19.1, 5.1, 18.5]), g: (p) => (p.type === 'mini' ? 0.6 : 1.4),
  },
  {
    id: 'chipresistor', name: 'chip resistor', path: 'Electrical/Passive components/Resistors', says: 'a thick-film resistor on a ceramic chip, for soldering to a board\'s surface', std: 'E96 values at 1 % and E24 values at 5 %, 1 Ω–10 MΩ (IEC 60063), in the standard packages and their usual powers',
    axes: [bare('pkg', 'package', Object.keys(CHIP)), bare('tol', 'tolerance', ['1%', '5%']), unit('R', 'resistance', 'ohm', (p) => (p.tol === '5%' ? [...decades(E24, 1, 9.99e6), 1e7] : [...decades(E96, 1, 9.99e6), 1e7]))],
    title: (p) => `${si(n(p, 'R'))}Ω chip resistor, ${p.pkg}, ${String(p.tol).replace('%', ' %')}`, of: () => 'chip-substrate resistive-film overglaze chip-termination*2', make: 'assemble', how: 'a ruthenium-oxide film printed on an alumina chip and fired, laser-trimmed to value, its ends plated nickel then tin',
    spec: (p) => { const [, , , W] = CHIP[s(p, 'pkg')]!; return `${si(n(p, 'R'))}Ω ±${String(p.tol).replace('%', ' %')}; ${W} W at 70 °C; up to ${Math.sqrt(W / n(p, 'R')).toPrecision(3)} A at that power (I = √(P/R))`; },
    box: (p) => CHIP[s(p, 'pkg')]!.slice(0, 3) as [number, number, number], g: (p) => { const [l, w, h] = CHIP[s(p, 'pkg')]!; return gOf(l * w * h, 3.5); },
  },
  {
    id: 'mlcc', name: 'ceramic chip capacitor', path: 'Electrical/Passive components/Capacitors', says: 'a stack of ceramic layers and nickel electrodes fired into a chip', std: 'E6 values (IEC 60063) in each dielectric\'s usual range, in the standard packages',
    axes: [bare('dielectric', 'dielectric', ['C0G', 'X7R', 'X5R']), bare('pkg', 'package', ['0402', '0603', '0805', '1206', '1210']), unit('C', 'capacitance', 'F', (p) => decades([1, 1.5, 2.2, 3.3, 4.7, 6.8], ...(({ C0G: [1e-12, ({ '0402': 1e-9, '0603': 4.7e-9, '0805': 2.2e-8, '1206': 1e-7, '1210': 1e-7 } as Record<string, number>)[s(p, 'pkg')]!], X7R: [1e-10, ({ '0402': 1e-7, '0603': 1e-6, '0805': 4.7e-6, '1206': 1e-5, '1210': 2.2e-5 } as Record<string, number>)[s(p, 'pkg')]!], X5R: [1e-8, ({ '0402': 1e-6, '0603': 1e-5, '0805': 2.2e-5, '1206': 4.7e-5, '1210': 1e-4 } as Record<string, number>)[s(p, 'pkg')]!] } as Record<string, [number, number]>)[s(p, 'dielectric')]!))), unit('V', 'rated voltage', 'V', [6.3, 10, 16, 25, 50, 100])],
    title: (p) => `${si(n(p, 'C'))}F ${p.dielectric} capacitor, ${p.pkg}, ${p.V} V`, of: () => 'mlcc-body chip-termination*2', make: 'sinter', how: 'barium titanate (or, for C0G, a stable titanate) tape printed with nickel, stacked, cut, fired, its ends terminated',
    spec: (p) => `${si(n(p, 'C'))}F; ${p.dielectric === 'C0G' ? 'C0G: ±30 ppm/°C, no loss of capacitance with voltage' : p.dielectric === 'X7R' ? 'X7R: ±15 % over −55…125 °C; loses some capacitance under DC bias' : 'X5R: ±15 % over −55…85 °C; loses much under DC bias'}; ${p.V} V`,
    box: (p) => MLCC_LWT(s(p, 'pkg')), g: (p) => { const [L, W, T] = MLCC_LWT(s(p, 'pkg')); return +solidsMass(chipSolids('capacitor', L, W, T)).toFixed(6); },
  },
  {
    id: 'inductor', look: 'can', name: 'inductor', path: 'Electrical/Passive components/Inductors', says: 'a coil of wire on a ferrite core, to store energy in its field and smooth a current', std: 'E12 values (IEC 60063) in the ranges each style is wound in; current ratings typical',
    axes: [bare('style', 'style', ['axial', 'radial', 'cd54', 'toroid']), unit('L', 'inductance', 'H', (p) => decades(E12, ...(({ axial: [1e-6, 1e-2], radial: [1e-6, 1e-2], cd54: [1e-6, 1e-3], toroid: [1e-5, 1e-3] } as Record<string, [number, number]>)[s(p, 'style')]!)))],
    title: (p) => `${si(n(p, 'L'))}H ${p.style === 'cd54' ? 'SMD power (CD54)' : p.style} inductor`, of: () => 'ferrite-core winding lead-wire*2 dip-coat', make: 'wind', how: 'enamelled copper wound on a ferrite core (a drum, a bobbin, or a ring), its ends terminated',
    spec: (p) => { const L = n(p, 'L'), base = ({ axial: 0.5, radial: 1.5, cd54: 2, toroid: 5 } as Record<string, number>)[s(p, 'style')]!, I = base * Math.sqrt(1e-5 / L); return `${si(L)}H ±10 %; about ${Math.min(base * 3, I).toPrecision(2)} A before its core saturates (typical: rating falls as √L)`; },
    box: (p) => ({ axial: [4, 4, 10], radial: [8, 8, 10], cd54: [5.8, 5.2, 4.5], toroid: [20, 20, 10] } as Record<string, [number, number, number]>)[s(p, 'style')]!, g: (p) => ({ axial: 0.4, radial: 1.5, cd54: 0.4, toroid: 12 } as Record<string, number>)[s(p, 'style')]!,
  },
  {
    id: 'xtal', look: 'can', name: 'quartz crystal', path: 'Electrical/Passive components/Crystals', says: 'a sliver of quartz that rings at one frequency, to clock a chip', std: 'the frequencies and load capacitances makers stock',
    axes: [bare('pkg', 'package', ['HC49S', '3225', '5032', 'tuningfork']), unit('f', 'frequency', 'Hz', (p) => (p.pkg === 'tuningfork' ? [32768] : [4e6, 6e6, 8e6, 1e7, 1.10592e7, 1.2e7, 1.47456e7, 1.6e7, 2e7, 2.4e7, 2.5e7, 2.6e7, 2.7e7, 3.2e7, 4e7, 4.8e7])), unit('CL', 'load capacitance', 'pF', [12, 18, 20])],
    title: (p) => `${si(n(p, 'f'))}Hz crystal, ${p.pkg === 'tuningfork' ? '2 × 6 mm can' : p.pkg}, ${p.CL} pF`, of: (p) => (p.pkg === '3225' || p.pkg === '5032' ? 'quartz-blank ceramic-package seam-lid' : 'quartz-blank crystal-base crystal-can lead-wire*2'), make: 'assemble', how: 'a quartz blank cut at its angle, lapped to frequency, silvered, sealed in a can', spec: (p) => `${si(n(p, 'f'))}Hz ±20 ppm; for ${p.CL} pF load: each of its two capacitors about 2 × (${p.CL} − 3) pF`,
    box: (p) => ({ HC49S: [11, 4.5, 3.5], '3225': [3.2, 2.5, 0.8], '5032': [5, 3.2, 1], tuningfork: [2, 2, 6] } as Record<string, [number, number, number]>)[s(p, 'pkg')]!, g: (p) => (p.pkg === 'HC49S' ? 0.4 : 0.05),
  },
  {
    id: 'pot', look: 'can', name: 'potentiometer', path: 'Electrical/Passive components/Potentiometers', says: 'a resistive track with a wiper turned or slid along it: a voltage divider you set by hand', std: 'the values and tapers sold (A logarithmic, B linear)',
    axes: [bare('style', 'style', ['rotary9', 'rotary16', 'rotary24', 'slide', 'trimmer']), unit('R', 'resistance', 'ohm', [100, 500, 1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2.5e5, 5e5, 1e6]), bare('taper', 'taper', (p) => (p.style === 'trimmer' ? ['B'] : ['B', 'A']))],
    title: (p) => `${si(n(p, 'R'))}Ω ${p.taper === 'A' ? 'log' : 'linear'} ${({ rotary9: '9 mm rotary', rotary16: '16 mm rotary', rotary24: '24 mm rotary', slide: 'slide', trimmer: 'multi-turn trimmer (3296)' } as Record<string, string>)[s(p, 'style')]} potentiometer`, of: () => 'pot-track pot-wiper pot-shaft pot-cover pot-terminal*3', make: 'assemble', how: 'a carbon (or cermet) track on a board, a sprung wiper on a shaft, a metal case',
    spec: (p) => `${si(n(p, 'R'))}Ω ±20 %; ${p.taper === 'A' ? 'A (log): for volume' : 'B (linear)'}; about ${p.style === 'rotary24' ? 0.5 : p.style === 'trimmer' ? 0.5 : 0.1} W`, box: (p) => ({ rotary9: [10, 11, 20], rotary16: [17, 18, 25], rotary24: [24, 26, 30], slide: [9, 60, 15], trimmer: [9.5, 4.8, 10] } as Record<string, [number, number, number]>)[s(p, 'style')]!, g: (p) => ({ rotary9: 2, rotary16: 6, rotary24: 15, slide: 8, trimmer: 1 } as Record<string, number>)[s(p, 'style')]!,
  },
  {
    id: 'diode', look: 'rod', name: 'diode', path: 'Electrical/Discrete semiconductors/Diodes', says: 'a one-way valve for current', std: 'the common part numbers, with their datasheet ratings',
    axes: [bare('part', 'part number', Object.keys(DIODES))],
    title: (p) => { const [k, V, A] = DIODES[s(p, 'part')]!; return `${p.part} ${k} diode, ${V} V ${A} A`; }, of: (p) => pkgOfMakeup(DIODES[s(p, 'part')]![4]), make: 'assemble', how: 'a doped silicon die between two leads, in glass or moulded epoxy',
    spec: (p) => { const [k, V, A, Vf, pkg] = DIODES[s(p, 'part')]!; return `${k}; ${V} V reverse, ${A} A forward, about ${Vf} V dropped at ${A} A (so ${(Vf * A).toFixed(2)} W as heat); ${pkg}`; },
    box: (p) => pkgBoxOf(DIODES[s(p, 'part')]![4]), g: (p) => PKG(DIODES[s(p, 'part')]![4])[1],
  },
  {
    id: 'zener', look: 'rod', name: 'Zener diode', path: 'Electrical/Discrete semiconductors/Diodes', says: 'a diode that conducts backwards at a set voltage: a simple voltage reference', std: 'E24 voltages 2.4–100 V (IEC 60063), 0.5 W, 1 W and 5 W',
    axes: [unit('Vz', 'Zener voltage', 'V', decades(E24, 2.4, 100)), unit('P', 'power', 'W', [0.5, 1, 5])],
    title: (p) => `${p.Vz} V Zener diode, ${p.P} W`, of: (p) => pkgOfMakeup(ZENER_PKG(n(p, 'P'))), make: 'assemble', how: 'a heavily doped silicon junction between two leads', spec: (p) => `${p.Vz} V ±5 %; at most ${((n(p, 'P') / n(p, 'Vz')) * 1000).toFixed(0)} mA through it (I = P/V); its series resistor (Vin − ${p.Vz}) / I`,
    box: (p) => pkgBoxOf(ZENER_PKG(n(p, 'P'))), g: (p) => PKG(ZENER_PKG(n(p, 'P')))[1],
  },
  {
    id: 'transistor', name: 'transistor', path: 'Electrical/Discrete semiconductors/Transistors', says: 'a switch or amplifier: a small current (or a gate voltage) controls a large one', std: 'the common part numbers, with their datasheet ratings',
    axes: [bare('part', 'part number', Object.keys(TRANS))],
    title: (p) => { const [t, V, A] = TRANS[s(p, 'part')]!; return `${p.part} ${t}, ${V} V ${A} A`; }, of: (p) => pkgOfMakeup(TRANS[s(p, 'part')]![3]), make: 'assemble', how: 'a silicon die bonded to a lead frame by fine wires, moulded in epoxy',
    spec: (p) => { const [t, V, A, pkg, R] = TRANS[s(p, 'part')]!; return `${t}; ${V} V, ${A} A; ${pkg}${R ? `; ${R * 1000} mΩ on (at 10 V gate): ${(R * A * A).toFixed(2)} W at full current` : ''}`; },
    box: (p) => pkgBoxOf(TRANS[s(p, 'part')]![3]), g: (p) => PKG(TRANS[s(p, 'part')]![3])[1],
  },
  {
    id: 'regulator', name: 'linear voltage regulator', path: 'Electrical/Power/Linear regulators', says: 'a chip that holds its output at a set voltage, burning off the rest as heat', std: 'the common part numbers, with their datasheet ratings',
    axes: [bare('part', 'part number', Object.keys(REGS))],
    title: (p) => { const [v, A] = REGS[s(p, 'part')]!; return `${p.part} regulator, ${v.startsWith('adj') ? 'adjustable' : `${v} V`}, ${A} A`; }, of: (p) => pkgOfMakeup(REGS[s(p, 'part')]![3]), make: 'assemble', how: 'a silicon die with a reference, an error amplifier and a pass transistor, moulded in epoxy on a copper tab',
    spec: (p) => { const [v, A, drop, pkg] = REGS[s(p, 'part')]!; return `${v.startsWith('adj') ? `adjustable (Vout = 1.25 × (1 + R2/R1))` : `${v} V out`}, up to ${A} A; needs ${drop} V over its output; heat (Vin − Vout) × I; ${pkg}`; },
    box: (p) => pkgBoxOf(REGS[s(p, 'part')]![3]), g: (p) => PKG(REGS[s(p, 'part')]![3])[1],
  },
  {
    id: 'chip', name: 'integrated circuit', path: 'Electrical/Integrated circuits/Chips', says: 'a silicon die of many transistors, packaged with its pins', std: 'common part numbers, in the packages each is sold in',
    axes: [bare('part', 'part number', Object.keys(CHIPS)), bare('pkg', 'package', (p) => CHIPS[s(p, 'part')]![1])],
    title: (p) => `${p.part} ${CHIPS[s(p, 'part')]![0]}, ${p.pkg}`, of: (p) => pkgOfMakeup(s(p, 'pkg')), make: 'assemble', how: 'a silicon die cut from a wafer, bonded to a lead frame by gold or copper wires, moulded in epoxy, its leads plated',
    spec: (p) => `${CHIPS[s(p, 'part')]![0]}; ${p.pkg}, ${PKG(s(p, 'pkg'))[0]} pins`, box: (p) => pkgBoxOf(s(p, 'pkg')), g: (p) => PKG(s(p, 'pkg'))[1],
  },
  {
    id: 'smdled', name: 'SMD LED', path: 'Electrical/Optoelectronics/LEDs', says: 'a light-emitting die in a chip package, for a board\'s surface', std: 'the packages and colours sold; forward voltages typical',
    axes: [bare('pkg', 'package', Object.keys(LED_PKG)), bare('colour', 'colour', Object.keys(LED_VF))],
    title: (p) => `${p.colour === 'warmwhite' ? 'warm white' : p.colour} SMD LED, ${p.pkg}`, of: (p) => { const [L, W] = LED_PKG[s(p, 'pkg')]!, k = smdLedDies(L, W); return `${LED_VF[s(p, 'colour')]![1].startsWith('algainp') ? 'led-die-algainp' : 'led-die-ingan'}*${k} bond-wire*${k} lead-frame${s(p, 'colour').includes('white') ? ' yag-phosphor' : ''} epoxy silicone`; }, make: 'assemble', how: (p) => `a ${LED_VF[s(p, 'colour')]![1].startsWith('algainp') ? 'AlGaInP' : 'GaN'} die${s(p, 'colour').includes('white') ? ' under a yellow phosphor that turns its blue white' : ''} on a lead frame, under a clear lens`,
    spec: (p) => { const [Vf] = LED_VF[s(p, 'colour')]!, I = LED_PKG[s(p, 'pkg')]![3]; return `about ${Vf} V at ${I * 1000} mA (typical); its resistor (V − ${Vf}) / ${I} Ω`; }, box: (p) => LED_PKG[s(p, 'pkg')]!.slice(0, 3) as [number, number, number], g: (p) => { const [L, W, H] = LED_PKG[s(p, 'pkg')]!; return +solidsMass(smdLedSolids(L, W, H, LED_VF[s(p, 'colour')]![1].startsWith('algainp') ? 'algainp' : 'gan', s(p, 'colour').includes('white'))).toFixed(6); },
  },
  {
    id: 'battery', name: 'battery (primary or NiMH cell)', path: 'Electrical/Power/Batteries', says: 'a cell or small battery of a standard size', std: 'IEC 60086 sizes; capacities and masses typical for each chemistry',
    axes: [bare('size', 'size', Object.keys(CELLS)), bare('chem', 'chemistry', (p) => Object.keys(CELLS[s(p, 'size')]!.chem))],
    title: (p) => `${p.size} ${p.chem === 'nimh' ? 'NiMH rechargeable' : p.chem === 'silveroxide' ? 'silver oxide' : p.chem} ${/^(CR|LR|SR)/.test(s(p, 'size')) ? 'coin cell' : 'battery'}`, of: (p) => CHEM_OF[s(p, 'chem')]!, make: 'assemble', how: (p) => (p.chem === 'alkaline' ? 'a zinc paste and a manganese dioxide ring in potassium hydroxide, in a steel can' : p.chem === 'lithium' ? 'lithium metal against manganese dioxide (or iron disulfide) in an organic electrolyte, sealed' : p.chem === 'nimh' ? 'a wound roll of nickel hydroxide and a hydrogen-storing alloy in potassium hydroxide' : 'silver oxide against zinc in potassium hydroxide'),
    spec: (p) => { const [V, mAh] = CELLS[s(p, 'size')]!.chem[s(p, 'chem')]!; return `${V} V, about ${mAh} mAh (${((V * mAh) / 1000).toFixed(2)} Wh, typical at a light load)`; },
    box: (p) => { const d = CELLS[s(p, 'size')]!.dim; return d.length === 3 ? [d[0]!, d[1]!, d[2]!] : [d[0]!, d[0]!, d[1]!]; }, g: (p) => CELLS[s(p, 'size')]!.chem[s(p, 'chem')]![2],
  },
  {
    id: 'lipo', look: 'sheet', name: 'lithium polymer pack', path: 'Electrical/Power/Packs', says: 'flat pouch cells in series, wrapped, with a power lead and a balance lead', std: 'the cell counts, capacities and C-ratings sold; mass from about 130 Wh/kg (typical of such packs)',
    axes: [unit('S', 'cells in series', 'S', [1, 2, 3, 4, 5, 6]), unit('mAh', 'capacity', 'mAh', [300, 450, 650, 850, 1000, 1300, 1500, 1800, 2200, 3000, 4000, 5000, 6000, 8000, 10000]), unit('C', 'discharge rating', 'C', [25, 50, 75, 100])],
    title: (p) => `LiPo pack ${p.S}S ${p.mAh} mAh ${p.C}C`, of: (p) => `pouch-cell*${p.S} copper silicone pvc ${n(p, 'S') > 1 ? 'jst-xh' : ''}`, make: 'assemble', how: 'pouch cells stacked, tabbed in series, a balance lead to each joint, shrink-wrapped',
    spec: (p) => { const V = 3.7 * n(p, 'S'), Ah = n(p, 'mAh') / 1000; return `${V.toFixed(1)} V nominal (${(4.2 * n(p, 'S')).toFixed(1)} V full); ${(V * Ah).toFixed(1)} Wh; up to ${(n(p, 'C') * Ah).toFixed(0)} A (its C-rating × capacity)`; },
    box: (p) => { const wh = 3.7 * n(p, 'S') * n(p, 'mAh') / 1000, v = (wh / 0.3) * 1000; return [Math.cbrt(v) * 1.6, Math.cbrt(v) * 1.0, Math.cbrt(v) * 0.6]; }, g: (p) => (3.7 * n(p, 'S') * n(p, 'mAh')) / 1000 / 0.13 + 10,
  },
  {
    id: 'slabattery', name: 'sealed lead-acid battery', path: 'Electrical/Power/Batteries', says: 'lead plates in absorbed sulfuric acid, sealed: the battery of alarms, UPSs and ride-ons', std: 'the voltages and capacities sold; mass from about 35 Wh/kg (typical)',
    axes: [unit('V', 'voltage', 'V', [6, 12]), unit('Ah', 'capacity', 'Ah', (p) => (n(p, 'V') === 6 ? [1.2, 4.5, 7, 12] : [1.2, 2.3, 4.5, 7, 9, 12, 18, 26, 33, 40, 55, 75, 100]))],
    title: (p) => `${p.V} V ${p.Ah} Ah sealed lead-acid battery`, of: (p) => `battery-case battery-lid battery-post*2 plate-positive*${(n(p, 'V') / 2) * Math.max(2, Math.round(n(p, 'Ah') / 4))} plate-negative*${(n(p, 'V') / 2) * (Math.max(2, Math.round(n(p, 'Ah') / 4)) + 1)} plate-separator*${(n(p, 'V') / 2) * Math.max(2, Math.round(n(p, 'Ah') / 4))} acid-electrolyte`, make: 'assemble', how: 'pasted lead grids with glass-mat separators soaked in acid, in an ABS case with a one-way valve',
    spec: (p) => `${p.V} V, ${p.Ah} Ah (${n(p, 'V') * n(p, 'Ah')} Wh at the 20-hour rate); float at ${(n(p, 'V') * 2.275).toFixed(2)} V`, box: (p) => { const v = ((n(p, 'V') * n(p, 'Ah')) / 0.08) * 1000; return [Math.cbrt(v) * 1.6, Math.cbrt(v) * 0.7, Math.cbrt(v)]; }, g: (p) => ((n(p, 'V') * n(p, 'Ah')) / 35) * 1000,
  },
  {
    id: 'psu', look: 'case', name: 'enclosed switching power supply', path: 'Electrical/Power/Power supplies', says: 'a mains-to-DC switching supply in a vented metal case, with screw terminals', std: 'the voltages and powers sold; sizes as Mean Well\'s LRS series (100 W 129 × 97 × 30, 150 W 159 × 97 × 30, 200 and 350 W 215 × 115 × 30 mm), masses typical',
    axes: [unit('V', 'output', 'V', [5, 12, 15, 24, 36, 48]), unit('W', 'power', 'W', [35, 50, 75, 100, 150, 200, 350, 600])],
    title: (p) => `${p.W} W ${p.V} V power supply`, of: () => 'psu-case pcb-bare transformer-ferrite capacitor-electrolytic*3 mosfet-to220 diode-1n4007*4 fan-30 screw-terminal', make: 'assemble', how: 'mains rectified and chopped at tens of kHz through a ferrite transformer, rectified and filtered, regulated by feedback',
    spec: (p) => `${p.V} V at up to ${(n(p, 'W') / n(p, 'V')).toFixed(2)} A; 100–240 V AC in; about 88 % efficient (typical)${n(p, 'W') >= 350 ? '; fan-cooled' : ''}`, box: (p) => { const W = n(p, 'W'); return W <= 50 ? [85, 58, 33] : W <= 100 ? [129, 97, 30] : W <= 150 ? [159, 97, 30] : W <= 350 ? [215, 115, 30] : [215, 115, 50]; }, g: (p) => 150 + n(p, 'W') * 1.5,
  },
  {
    id: 'walladapter', look: 'case', name: 'plug-in power adapter', path: 'Electrical/Power/Power supplies', says: 'a wall-plug switching supply on a lead with a barrel plug', std: 'the voltages and currents sold (typical)',
    axes: [unit('V', 'output', 'V', [5, 6, 9, 12, 15, 19, 24]), unit('A', 'current', 'A', [0.5, 1, 1.5, 2, 3, 5])],
    title: (p) => `${p.V} V ${p.A} A plug-in adapter`, of: () => 'pc pcb-bare transformer-ferrite capacitor-electrolytic copper pvc', make: 'assemble', how: 'a small flyback converter in a plug case, its lead ending in a 5.5 × 2.1 mm plug', spec: (p) => `${p.V} V at up to ${p.A} A (${(n(p, 'V') * n(p, 'A')).toFixed(0)} W); 5.5 × 2.1 mm plug, centre positive (typical)`,
    box: (p) => [45, 35 + n(p, 'V') * n(p, 'A') * 0.2, 60], g: (p) => 70 + n(p, 'V') * n(p, 'A') * 2,
  },
  {
    id: 'pcbterminal', name: 'PCB terminal block', path: 'Electrical/Connectors/Terminal blocks', says: 'a row of screw or spring clamps soldered to a board, to take loose wires', std: 'the pitches and pole counts sold; current ratings typical',
    axes: [ax('p', 'pitch', 'mm', [2.54, 3.5, 3.81, 5, 5.08, 7.5]), ax('n', 'poles', '', range(2, 12, 1)), bare('clamp', 'clamp', ['screw', 'spring', 'plug'])],
    title: (p) => `${p.n}-pole terminal block, ${p.p} mm, ${p.clamp === 'plug' ? 'pluggable' : p.clamp}`, of: (p) => `terminal-housing terminal-clamp*${p.n} ${p.clamp === 'spring' ? 'terminal-spring' : 'terminal-screw'}*${p.n}`, make: 'assemble', how: 'brass clamps and steel screws (or springs) in a moulded PBT housing',
    spec: (p) => `${p.n} poles at ${p.p} mm; about ${({ 2.54: 6, 3.5: 8, 3.81: 8, 5: 16, 5.08: 16, 7.5: 24 } as Record<number, number>)[n(p, 'p')]} A, 300 V (typical)`, box: (p) => [n(p, 'n') * n(p, 'p'), n(p, 'p') * 1.6 + 2, n(p, 'p') * 2 + 4], g: (p) => n(p, 'n') * n(p, 'p') * 0.25,
  },
  {
    id: 'crimpterminal', look: 'rod', name: 'insulated crimp terminal', path: 'Electrical/Connectors/Crimp terminals', says: 'a tinned copper terminal with a coloured sleeve, crimped onto a wire\'s end', std: 'the colour bands (red 0.5–1.5, blue 1.5–2.5, yellow 4–6 mm²) and the studs and tabs sold',
    axes: [bare('type', 'type', ['ring', 'fork', 'spade', 'butt']), bare('band', 'wire band', ['red', 'blue', 'yellow']), bare('stud', 'stud or tab', (p) => (p.type === 'ring' || p.type === 'fork' ? ['M3', 'M4', 'M5', 'M6', 'M8', 'M10'] : p.type === 'spade' ? ['tab2.8', 'tab4.8', 'tab6.3'] : ['none']))],
    title: (p) => `${p.band} ${p.type} terminal${p.stud === 'none' ? '' : `, ${String(p.stud).replace('tab', '').replace(/^(\d)/, '$1 mm tab').replace(/^M/, 'M')}`}`, of: () => 'terminal-barrel terminal-insulation', make: 'stamp', how: 'stamped from copper strip, tin-plated, a PVC sleeve over its barrel',
    spec: (p) => `for ${({ red: '0.5–1.5', blue: '1.5–2.5', yellow: '4–6' } as Record<string, string>)[s(p, 'band')]} mm² wire (${({ red: '22–16', blue: '16–14', yellow: '12–10' } as Record<string, string>)[s(p, 'band')]} AWG)`, box: (p) => [p.band === 'yellow' ? 9 : 7, 5, 22], g: (p) => (p.band === 'yellow' ? 1.6 : 0.8),
  },
  {
    id: 'ferrule', name: 'bootlace ferrule', path: 'Electrical/Connectors/Crimp terminals', says: 'a tinned copper tube with a plastic collar, crimped onto stranded wire so a terminal clamps it cleanly', std: 'DIN 46228-4 cross-sections, with its colour code',
    axes: [ax('cs', 'cross-section', 'mm²', Object.keys(FERRULE).map(Number)), unit('L', 'tube length', 'mm', (p) => (n(p, 'cs') <= 1.5 ? [8, 10] : n(p, 'cs') <= 6 ? [10, 12] : [12, 18]))],
    title: (p) => `${p.cs} mm² ferrule (${FERRULE[n(p, 'cs')]}), ${p.L} mm`, of: () => 'ferrule-sleeve ferrule-collar', make: 'draw', how: 'a copper tube drawn and tin-plated, a polypropylene collar pressed on', spec: (p) => `${p.cs} mm², ${FERRULE[n(p, 'cs')]} (DIN 46228-4); ${p.L} mm into the terminal`,
    box: (p) => [Math.sqrt(n(p, 'cs')) * 1.6 + 2, Math.sqrt(n(p, 'cs')) * 1.6 + 2, n(p, 'L') + 6], g: (p) => 0.05 + n(p, 'cs') * 0.06,
  },
  {
    id: 'heatshrink', name: 'heat-shrink tubing', path: 'Electrical/Wire management/Heat shrink', says: 'polyolefin tubing that shrinks to half (or a third) its size when heated, to insulate a joint', std: 'the diameters and colours sold, any length cut to the centimetre',
    axes: [ax('d', 'diameter as supplied', 'mm', [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12, 14, 16, 20, 25, 30, 40, 50]), bare('ratio', 'shrink ratio', ['2to1', '3to1']), bare('colour', 'colour', ['black', 'red', 'blue', 'yellow', 'green', 'white', 'clear']), unit('L', 'length', 'm', [1, 5, 10], [0.01, 100, 0.01])],
    title: (p) => `heat shrink ${p.d} mm ${p.ratio === '2to1' ? '2:1' : '3:1 glue-lined'}, ${p.colour}, ${p.L} m`, of: (p) => (/glue|lined/.test(String(p.glue ?? p.lined ?? '')) || p.ratio === '3to1' ? 'shrink-tube adhesive-liner' : 'pe'), make: 'extrude', how: 'polyolefin extruded, cross-linked by radiation, expanded warm and cooled so it remembers its smaller size',
    spec: (p) => `${p.d} mm, to ${(n(p, 'd') / (p.ratio === '2to1' ? 2 : 3)).toFixed(2)} mm at about 90–120 °C${p.ratio === '3to1' ? '; its lining melts and seals' : ''}`, box: (p) => [n(p, 'd'), n(p, 'd'), Math.min(n(p, 'L') * 1000, 300)], g: (p) => gOf(ring(n(p, 'd'), n(p, 'd') - 0.5 - n(p, 'd') * 0.04, n(p, 'L') * 1000), 1),
  },
  {
    id: 'multicore', name: 'multicore control cable', path: 'Electrical/Wiring and connectors/Cable', says: 'insulated stranded cores twisted together under a PVC sheath', std: 'the core counts and sections sold, any length cut to the centimetre',
    axes: [ax('c', 'cores', '', [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 25]), unit('cs', 'core section', 'mm²', SECTIONS), bare('screen', 'screen', ['plain', 'screened']), unit('L', 'length', 'm', [1, 5, 10, 25, 50, 100], [0.01, 500, 0.01])],
    title: (p) => `${p.c}-core ${p.cs} mm² ${p.screen === 'screened' ? 'screened ' : ''}cable, ${p.L} m`, of: (p) => `insulated-conductor*${n(p, 'c')} cable-filler cable-jacket${p.screen === 'screened' ? ' cable-shield' : ''}`, make: 'extrude', how: 'fine copper strands bunched, insulated in PVC, the cores laid up and sheathed',
    spec: (p) => { const R = (1.7241e-8 * n(p, 'L')) / (n(p, 'cs') * 1e-6); return `each core ${R.toFixed(3)} Ω over ${p.L} m (IACS copper); outside about ${(Math.sqrt(n(p, 'c')) * (Math.sqrt(n(p, 'cs')) * 1.6 + 1.4) + 1.6).toFixed(1)} mm (typical)`; },
    box: (p) => { const D = Math.sqrt(n(p, 'c')) * (Math.sqrt(n(p, 'cs')) * 1.6 + 1.4) + 1.6; return [D, D, Math.min(n(p, 'L') * 1000, 400)]; }, g: (p) => { const D = Math.sqrt(n(p, 'c')) * (Math.sqrt(n(p, 'cs')) * 1.6 + 1.4) + 1.6; return n(p, 'L') * (n(p, 'c') * n(p, 'cs') * 8.96 + cyl(D, 1) * 0.5 * 1.4); },
  },
  {
    id: 'mainscord', name: 'flexible mains cord', path: 'Electrical/Wiring and connectors/Cable', says: 'PVC (H05VV-F) or rubber (H07RN-F) flexible cord for mains appliances', std: 'the cores and sections sold, with the currents BS 7671 table 4F3A allows; any length to the centimetre',
    axes: [bare('type', 'type', ['H05VV-F', 'H07RN-F']), ax('c', 'cores', '', [2, 3, 4, 5]), unit('cs', 'core section', 'mm²', [0.75, 1, 1.5, 2.5, 4]), unit('L', 'length', 'm', [1, 5, 10, 25, 50], [0.01, 100, 0.01])],
    title: (p) => `${p.type} ${p.c} × ${p.cs} mm² cord, ${p.L} m`, of: (p) => `insulated-conductor*${n(p, 'c')} cable-jacket`, make: 'extrude', how: 'fine copper strands, each core insulated and coloured, sheathed in PVC (or in rubber and a tough neoprene)',
    spec: (p) => `up to ${CORD_A[n(p, 'cs')]} A (BS 7671 4F3A, two cores at 30 °C); ${p.type === 'H05VV-F' ? '300/500 V, indoors' : '450/750 V, outdoors and on sites'}`, box: (p) => [Math.sqrt(n(p, 'c')) * 3.2 + 2, Math.sqrt(n(p, 'c')) * 3.2 + 2, Math.min(n(p, 'L') * 1000, 400)], g: (p) => n(p, 'L') * (n(p, 'c') * n(p, 'cs') * 8.96 + 40),
  },
  {
    id: 'coax', name: 'coaxial cable', path: 'Electrical/Wiring and connectors/Cable', says: 'a centre conductor in a dielectric under a braided screen: radio and video', std: 'the RG and LMR types, with their impedances and sizes; any length to the centimetre',
    axes: [bare('type', 'type', Object.keys(COAX)), unit('L', 'length', 'm', [1, 5, 10, 25, 50, 100], [0.01, 500, 0.01])],
    title: (p) => `${p.type} coax, ${p.L} m`, of: () => 'conductor-strand coax-dielectric foil-shield cable-shield cable-jacket', make: 'extrude', how: 'a copper centre in foamed or solid polyethylene, a copper braid (and foil), a PVC jacket', spec: (p) => { const [Z, D, d] = COAX[s(p, 'type')]!; return `${Z} Ω; ${D} mm outside, ${d} mm centre`; },
    box: (p) => [COAX[s(p, 'type')]![1], COAX[s(p, 'type')]![1], Math.min(n(p, 'L') * 1000, 400)], g: (p) => n(p, 'L') * COAX[s(p, 'type')]![1] ** 2 * 1.1,
  },
  {
    id: 'patchcord', name: 'Ethernet patch cord', path: 'Electrical/Wiring and connectors/Cable assemblies', says: 'four twisted pairs with an RJ45 plug at each end', std: 'categories 5e, 6 and 6A (ISO/IEC 11801), the lengths sold',
    axes: [bare('cat', 'category', ['cat5e', 'cat6', 'cat6a']), unit('L', 'length', 'm', [0.25, 0.5, 1, 2, 3, 5, 10, 15, 20, 30, 50]), bare('colour', 'colour', ['grey', 'blue', 'black', 'red', 'yellow', 'green'])],
    title: (p) => `${String(p.cat).replace('cat', 'Cat ')} patch cord, ${p.L} m, ${p.colour}`, of: () => 'insulated-conductor*8 cable-jacket rj45-plug*2 boot*2', make: 'assemble', how: 'four twisted pairs of solid or stranded copper, sheathed, crimped into RJ45 plugs', spec: (p) => `${p.cat === 'cat5e' ? '1 Gbit/s, 100 MHz' : p.cat === 'cat6' ? '1 Gbit/s (10 to 55 m), 250 MHz' : '10 Gbit/s to 100 m, 500 MHz'}`,
    box: (p) => [6, 6, Math.min(n(p, 'L') * 1000, 400)], g: (p) => 10 + n(p, 'L') * 40,
  },
  {
    id: 'usbcable', name: 'USB cable', path: 'Electrical/Wiring and connectors/Cable assemblies', says: 'a USB lead with a plug at each end', std: 'the plug pairs and lengths sold',
    axes: [bare('ends', 'ends', ['A-B', 'A-microB', 'A-miniB', 'A-C', 'C-C']), unit('L', 'length', 'm', [0.25, 0.5, 1, 1.5, 2, 3])],
    title: (p) => `USB ${String(p.ends).replace('-', ' to ')} cable, ${p.L} m`, of: () => 'insulated-conductor*4 cable-shield cable-jacket usb-plug*2', make: 'assemble', how: 'two power and two data wires (more for USB 3) under a screen, moulded into plugs', spec: (p) => `${p.ends === 'C-C' ? 'USB 2.0 data, up to 3 A (60 W) at 20 V' : 'USB 2.0, 480 Mbit/s'}`,
    box: (p) => [12, 8, Math.min(n(p, 'L') * 1000, 400)], g: (p) => 12 + n(p, 'L') * 25,
  },
  {
    id: 'dcjack', name: 'DC barrel connector', path: 'Electrical/Connectors/Power connectors', says: 'the round plug or socket of low-voltage power', std: 'the barrel sizes in use (outside × pin, mm)',
    axes: [bare('size', 'size', ['5.5x2.1', '5.5x2.5', '3.5x1.35', '4.0x1.7', '2.5x0.7']), bare('form', 'form', ['plug', 'panel', 'pcb'])],
    title: (p) => `DC ${p.form === 'plug' ? 'plug' : `${p.form} socket`} ${String(p.size).replace('x', ' × ')} mm`, of: (p) => (p.form === 'plug' ? 'jack-sleeve contact-pin jack-insulator plug-handle' : 'insulator-insert contact-pin contact-spring*2 switch-terminal*3'), make: 'assemble', how: 'turned and nickel-plated brass contacts in a moulded body', spec: (p) => `${p.size} mm; centre positive by custom; about 3–5 A (typical)`,
    box: (p) => (p.form === 'plug' ? [9, 9, 30] : [9, 14, 11]), g: (p) => (p.form === 'plug' ? 3 : 2),
  },
  {
    id: 'powerconn', name: 'high-current DC connector', path: 'Electrical/Connectors/Power connectors', says: 'the gold-plated bullet connectors of battery packs, in a keyed housing', std: 'the XT, EC and Anderson types; continuous ratings from their makers (about)',
    axes: [bare('type', 'type', ['XT30', 'XT60', 'XT90', 'EC3', 'EC5', 'PP15', 'PP30', 'PP45']), bare('gender', 'gender', ['male', 'female', 'pair'])],
    title: (p) => `${p.type} connector, ${p.gender}`, of: (p) => `connector-housing plug-pin*${/90|45/.test(String(p.type)) ? 2 : 2}`, make: 'assemble', how: 'gold-plated brass contacts in a high-temperature nylon housing', spec: (p) => `about ${({ XT30: 15, XT60: 30, XT90: 40, EC3: 60, EC5: 120, PP15: 15, PP30: 30, PP45: 45 } as Record<string, number>)[s(p, 'type')]} A continuous (maker's rating)`,
    box: (p) => ({ XT30: [10, 5, 16], XT60: [16, 8, 16], XT90: [22, 11, 21], EC3: [16, 8, 20], EC5: [21, 10, 25], PP15: [8, 16, 24], PP30: [8, 16, 24], PP45: [8, 16, 24] } as Record<string, [number, number, number]>)[s(p, 'type')]!, g: (p) => (p.gender === 'pair' ? 2 : 1) * ({ XT30: 1, XT60: 2.5, XT90: 5, EC3: 2, EC5: 4, PP15: 4, PP30: 4, PP45: 4 } as Record<string, number>)[s(p, 'type')]!,
  },
  {
    id: 'dsub', name: 'D-subminiature connector', path: 'Electrical/Connectors/D-sub', says: 'the trapezoid-shelled connector of serial ports, VGA and old PCs', std: 'the shell sizes and pin counts (IEC 60807-3)',
    axes: [bare('type', 'type', ['DE9', 'DA15', 'DB25', 'DC37', 'DD50', 'DE15HD']), bare('gender', 'gender', ['male', 'female']), bare('term', 'termination', ['solder', 'pcb', 'idc'])],
    title: (p) => `${p.type} ${p.gender}, ${p.term === 'pcb' ? 'PCB mount' : p.term === 'idc' ? 'ribbon (IDC)' : 'solder cup'}`, of: (p) => `connector-shell insulator-insert contact-pin*${({ DE9: 9, DA15: 15, DB25: 25, DC37: 37, DD50: 50, DE15HD: 15 } as Record<string, number>)[String(p.type)] ?? 9}`, make: 'assemble', how: 'gold-flashed brass contacts in a PBT insert in a stamped steel shell', spec: (p) => `${({ DE9: 9, DA15: 15, DB25: 25, DC37: 37, DD50: 50, DE15HD: 15 } as Record<string, number>)[s(p, 'type')]} contacts; about 5 A each`,
    box: (p) => [({ DE9: 31, DA15: 39, DB25: 53, DC37: 69, DD50: 67, DE15HD: 31 } as Record<string, number>)[s(p, 'type')]!, 12.5, 15], g: (p) => ({ DE9: 5, DA15: 7, DB25: 10, DC37: 14, DD50: 15, DE15HD: 6 } as Record<string, number>)[s(p, 'type')]!,
  },
  {
    id: 'sensorconn', name: 'M8/M12 sensor connector', path: 'Electrical/Connectors/Circular', says: 'the screw-locking round connector of industrial sensors, sealed to IP67', std: 'IEC 61076-2-101/104, A-coded, 3–8 poles',
    axes: [bare('thread', 'thread', ['M8', 'M12']), ax('n', 'poles', '', (p) => (p.thread === 'M8' ? [3, 4, 8] : [3, 4, 5, 8])), bare('gender', 'gender', ['male', 'female']), bare('form', 'form', ['cable', 'panel', 'fieldwire'])],
    title: (p) => `${p.thread} ${p.n}-pole ${p.gender} ${p.form === 'cable' ? 'moulded cable, 2 m' : p.form === 'panel' ? 'panel socket' : 'field-wireable plug'}`, of: (p) => `connector-contact*${n(p, 'n')} connector-overmould coupling-nut seal-ring${p.form === 'cable' ? ` insulated-conductor*${n(p, 'n')} cable-jacket` : ''}`, make: 'assemble', how: 'gold-plated contacts in a moulded insert, a knurled brass coupling nut, an O-ring seal', spec: (p) => `${p.n} poles, A-coded; IP67 mated; about ${p.thread === 'M8' ? 3 : 4} A`,
    box: (p) => (p.thread === 'M8' ? [10, 10, 35] : [15, 15, 45]), g: (p) => (p.form === 'cable' ? 90 : p.thread === 'M8' ? 6 : 15),
  },
  {
    id: 'toggleswitch', name: 'toggle switch', path: 'Electrical/Switches/Toggle switches', says: 'a lever switch that snaps between positions', std: 'the poles, actions and sizes sold; ratings typical',
    axes: [bare('poles', 'poles', ['SPST', 'SPDT', 'DPDT']), bare('action', 'action', (p) => (p.poles === 'SPST' ? ['on-off', 'mom-off'] : ['on-on', 'on-off-on', 'mom-off-mom'])), bare('size', 'size', ['mini', 'standard'])],
    title: (p) => `${p.size} toggle switch ${p.poles} ${String(p.action).replace(/mom/g, '(on)')}`, of: (p) => `switch-housing toggle-lever return-spring contact-spring*${p.poles === 'DPDT' ? 2 : 1} contact-silver*${p.poles === 'DPDT' ? 6 : p.poles === 'SPDT' ? 3 : 2} switch-terminal*${p.poles === 'DPDT' ? 6 : p.poles === 'SPDT' ? 3 : 2}`, make: 'assemble', how: 'a sprung lever rocking silver-plated contacts in a phenolic base, a threaded brass bushing', spec: (p) => `${p.size === 'mini' ? '6 mm bushing; about 6 A at 125 V AC' : '12 mm bushing; about 15 A at 250 V AC'} (typical)`,
    box: (p) => (p.size === 'mini' ? [8, 13, 30] : [15, 20, 45]), g: (p) => (p.size === 'mini' ? 7 : 25),
  },
  {
    id: 'rockerswitch', name: 'rocker switch', path: 'Electrical/Switches/Rocker switches', says: 'a see-saw switch that snaps into a panel cut-out', std: 'the poles and sizes sold; ratings typical',
    axes: [bare('poles', 'poles', ['SPST', 'DPST', 'SPDT']), bare('lamp', 'lit', ['plain', 'lit']), bare('size', 'size', ['small', 'large'])],
    title: (p) => `${p.size} ${p.lamp === 'lit' ? 'lit ' : ''}rocker switch ${p.poles}`, of: (p) => `switch-housing switch-actuator return-spring contact-spring*${p.poles === 'SPST' ? 1 : 2} contact-silver*${p.poles === 'SPDT' ? 3 : 2 * (p.poles === 'DPST' ? 2 : 1)} switch-terminal*${p.poles === 'SPDT' ? 3 : p.poles === 'DPST' ? 4 : 2}${p.lamp === 'lit' ? ' led-5mm' : ''}`, make: 'assemble', how: 'a rocker over a sprung contact in a snap-in nylon housing', spec: (p) => `cut-out ${p.size === 'small' ? '19 × 13' : '29 × 22'} mm; ${p.size === 'small' ? '6' : '16'} A at 250 V AC (typical)`,
    box: (p) => (p.size === 'small' ? [21, 15, 20] : [31, 25, 28]), g: (p) => (p.size === 'small' ? 3 : 8),
  },
  {
    id: 'tactswitch', name: 'tactile push switch', path: 'Electrical/Switches/Push buttons', says: 'the little clicking button on boards: a metal dome that snaps when pressed', std: 'the sizes, heights and forces sold',
    axes: [bare('size', 'size', ['6x6', '12x12', '3x6']), ax('h', 'height', 'mm', (p) => (p.size === '6x6' ? [4.3, 5, 7, 9.5, 13] : p.size === '12x12' ? [4.3, 7.3, 12] : [2.5, 4.3])), unit('F', 'operating force', 'gf', [160, 260])],
    title: (p) => `tactile switch ${String(p.size).replace('x', ' × ')} × ${p.h} mm, ${p.F} gf`, of: () => 'switch-housing snap-dome switch-actuator switch-terminal*4', make: 'assemble', how: 'a stainless snap dome over silver contacts in a nylon base, a plunger on top', spec: (p) => `${p.F} gf to click (${((n(p, 'F') / 1000) * 9.81).toFixed(2)} N); 50 mA at 12 V`,
    box: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return [a, b, n(p, 'h')]; }, g: () => 0.3,
  },
  {
    id: 'snapswitch', name: 'snap-action micro switch', path: 'Electrical/Switches/Micro switches', says: 'a switch that snaps over at a fixed point of a short travel: limit switches, doors, endstops', std: 'the subminiature, miniature and standard bodies; ratings typical',
    axes: [bare('size', 'body', ['subminiature', 'miniature', 'standard']), bare('lever', 'actuator', ['plunger', 'lever', 'roller'])],
    title: (p) => `${p.size} micro switch, ${p.lever}`, of: () => 'switch-housing switch-actuator contact-spring contact-silver*3 switch-terminal*3', make: 'assemble', how: 'a phosphor-bronze spring that snaps a silver contact between two others, in a PBT body', spec: (p) => `${p.size === 'subminiature' ? '20 × 10 mm; 3 A' : p.size === 'miniature' ? '28 × 16 mm; 5 A' : '49 × 17 mm; 15 A'} at 250 V AC (typical); changeover`,
    box: (p) => { const s = SNAP[String(p.size)]!; return [s.L, s.T, s.H]; }, g: (p) => SNAP[String(p.size)]!.g,
  },
  {
    id: 'endstop', name: 'endstop switch board', path: 'Electrical/Switches/Limit switches', says: 'a lever micro switch upright on a small board with a 3-way socket for its cable: a 3D printer\'s endstop',
    std: 'the Ender-3\'s (its board 26 × 20 mm, 11 mm over its switch\'s lever: its maker\'s model); a subminiature lever switch and a JST XH 3-way socket on it (typical)',
    axes: [bare('form', 'form', ['creality'])], title: () => 'endstop board, lever switch', of: () => 'pcb-bare {snapswitch subminiature lever} jst-xh-3-top', make: 'assemble', how: 'a lever micro switch and a socket soldered through a small board',
    spec: () => '26 × 20 mm board; normally open or closed by its wiring; 3-way XH socket', box: () => [26, 11.6, 20], g: () => gOf(26 * 20 * 1.6, 1.85) + SNAP.subminiature!.g + gOf(9.9 * 7 * 5.75 * 0.45, 1.14) + 3 * gOf(0.64 * 0.64 * 9.5, 8.5), look: 'board',
  },
  {
    id: 'proxsensor', name: 'inductive proximity sensor', path: 'Electrical/Sensors/Proximity', says: 'a threaded barrel that senses metal near its face, with no contact', std: 'IEC 60947-5-2 barrels, with their rated sensing distances',
    axes: [bare('thread', 'barrel', Object.keys(PROX)), bare('mount', 'mounting', ['flush', 'nonflush']), bare('out', 'output', ['NPN-NO', 'NPN-NC', 'PNP-NO', 'PNP-NC'])],
    title: (p) => `inductive sensor ${p.thread}, ${p.mount === 'nonflush' ? 'non-flush' : 'flush'}, ${p.out}`, of: () => 'brass nickel ferrite-soft magnet-wire pcb-bare epoxy pvc copper', make: 'assemble', how: 'a coil on a ferrite pot core driven as an oscillator; metal nearby damps it, a circuit switches the output', spec: (p) => `senses mild steel within ${PROX[s(p, 'thread')]![p.mount === 'flush' ? 0 : 1]} mm (rated, IEC 60947-5-2; less for other metals); 10–30 V DC`,
    box: (p) => { const d = Number(String(p.thread).slice(1)); return [d, d, d * 4 + 20]; }, g: (p) => Number(String(p.thread).slice(1)) * 6 + 60,
  },
  {
    id: 'thermocouple', name: 'thermocouple probe', path: 'Electrical/Sensors/Temperature', says: 'two different metals welded at a tip: their junction makes a voltage that grows with heat', std: 'IEC 60584 types; class 2 ranges',
    axes: [bare('type', 'type', Object.keys(TC)), bare('form', 'form', ['bead', 'sheath3', 'sheath6']), unit('L', 'probe length', 'mm', [100, 150, 200, 300, 500])],
    title: (p) => `type ${p.type} thermocouple, ${p.form === 'bead' ? 'bare bead' : `${String(p.form).replace('sheath', '')} mm sheathed`}, ${p.L} mm`, of: (p) => `thermoelement-${TC[s(p, 'type')]![0]} thermoelement-${TC[s(p, 'type')]![1]} ${p.form === 'bead' ? 'tc-sleeving*3' : 'tc-sheath mgo'}`, make: 'assemble', how: (p) => (p.form === 'bead' ? 'two alloy wires welded at a bead, insulated with glass braid' : 'two alloy wires in packed magnesia inside an Inconel sheath, welded closed at its tip'),
    spec: (p) => { const [, , lo, hi, sb] = TC[s(p, 'type')]!; return `${lo} to ${hi} °C (class 2, IEC 60584-2); about ${sb} µV/K near room temperature`; }, box: (p) => [p.form === 'sheath6' ? 6 : 3, p.form === 'sheath6' ? 6 : 3, n(p, 'L')], g: (p) => gOf(cyl(p.form === 'sheath6' ? 6 : 3, n(p, 'L')), 6),
  },
  {
    id: 'rtd', name: 'platinum resistance thermometer', path: 'Electrical/Sensors/Temperature', says: 'a platinum resistor whose resistance rises steadily with heat', std: 'IEC 60751: Pt100 and Pt1000, classes AA, A and B',
    axes: [bare('type', 'element', ['Pt100', 'Pt1000']), bare('cls', 'class', ['AA', 'A', 'B']), bare('form', 'form', ['film', 'probe4', 'probe6'])],
    title: (p) => `${p.type} class ${p.cls} ${p.form === 'film' ? 'thin-film element' : `${String(p.form).replace('probe', '')} mm probe`}`, of: () => 'chip-substrate platinum-film overglaze lead-wire*2', make: 'assemble', how: 'a platinum film laser-trimmed on an alumina chip and glazed (in a probe, sealed in a stainless tube)',
    spec: (p) => { const R0 = p.type === 'Pt100' ? 100 : 1000, tol = ({ AA: [0.1, 0.0017], A: [0.15, 0.002], B: [0.3, 0.005] } as Record<string, [number, number]>)[s(p, 'cls')]!; return `R(t) = ${R0}(1 + 3.9083e-3 t − 5.775e-7 t²) Ω above 0 °C; ${(R0 * (1 + 3.9083e-3 * 100 - 5.775e-7 * 1e4)).toFixed(2)} Ω at 100 °C; ±(${tol[0]} + ${tol[1]}|t|) °C`; },
    box: (p) => (p.form === 'film' ? [2, 2.3, 0.8] : [p.form === 'probe6' ? 6 : 4, p.form === 'probe6' ? 6 : 4, 100]), g: (p) => (p.form === 'film' ? 0.02 : 25),
  },
  {
    id: 'loadcell', name: 'strain-gauge load cell', path: 'Electrical/Sensors/Force', says: 'a metal spring element with strain gauges in a bridge: its output in millivolts a volt grows with load', std: 'the bar and S-beam capacities sold; sensitivities typical',
    axes: [bare('form', 'form', ['bar', 'sbeam']), unit('cap', 'capacity', 'kg', (p) => (p.form === 'bar' ? [1, 3, 5, 10, 20, 50, 100, 200] : [50, 100, 200, 300, 500, 1000, 2000]))],
    title: (p) => `${p.form === 'bar' ? 'bar' : 'S-beam'} load cell, ${p.cap} kg`, of: (p) => `${p.form === 'bar' ? 'al-6061' : 'steel-alloy'} strain-gauge*4 copper pvc epoxy`, make: 'assemble', how: 'four foil strain gauges bonded on a machined spring element in a Wheatstone bridge',
    spec: (p) => { const mv = p.form === 'bar' ? 1 : 2; return `${mv} mV/V at ${p.cap} kg (typical): ${mv * 5} mV full scale on 5 V; read it through a 24-bit ADC such as the HX711`; }, box: (p) => (p.form === 'bar' ? [12.7, 12.7, 80] : [51, 19, 64]), g: (p) => (p.form === 'bar' ? 30 : 300),
  },
  {
    id: 'pressuresensor', look: 'can', name: 'pressure transducer', path: 'Electrical/Sensors/Pressure', says: 'a steel diaphragm with a strain bridge behind it and the circuit that turns its strain into a signal', std: 'the EN 837 ranges (bar), the outputs and threads sold',
    axes: [unit('bar', 'range', 'bar', [1, 1.6, 2.5, 4, 6, 10, 16, 25, 40, 60, 100, 160, 250, 400, 600]), bare('out', 'output', ['0.5-4.5V', '4-20mA', '0-10V']), bare('port', 'port', ['G1/4', 'G1/8', '1/4NPT'])],
    title: (p) => `pressure transducer 0–${p.bar} bar, ${p.out}, ${p.port}`, of: () => 'stainless-304 silicon pcb-bare epoxy nbr copper pvc', make: 'assemble', how: 'a stainless diaphragm with a thick-film strain bridge, a conditioning chip, a sealed stainless body',
    spec: (p) => `0–${p.bar} bar (0–${(n(p, 'bar') * 0.1).toFixed(2)} MPa); ${p.out}; ±0.5 % of span (typical)`, box: () => [22, 22, 55], g: () => 60,
  },
  {
    id: 'pressuregauge', look: 'can', name: 'dial pressure gauge', path: 'Fluid/Instruments/Gauges', says: 'a Bourdon tube that straightens under pressure and turns a needle', std: 'EN 837-1 dials, ranges and accuracy classes',
    axes: [unit('dial', 'dial', 'mm', [40, 50, 63, 100]), unit('bar', 'range', 'bar', [1, 1.6, 2.5, 4, 6, 10, 16, 25, 40, 60, 100, 160, 250, 400]), bare('port', 'port', (p) => (n(p, 'dial') <= 50 ? ['G1/8', 'G1/4'] : n(p, 'dial') === 63 ? ['G1/4'] : ['G1/2']))],
    title: (p) => `${p.dial} mm pressure gauge 0–${p.bar} bar, ${p.port}`, of: () => 'bourdon-tube gauge-movement gauge-dial gauge-case gauge-window gauge-socket', make: 'assemble', how: 'a curled phosphor-bronze Bourdon tube, a gear segment and pinion turning the needle over a printed dial',
    spec: (p) => `0–${p.bar} bar; class ${n(p, 'dial') >= 100 ? 1 : n(p, 'dial') >= 63 ? 1.6 : 2.5} (±${n(p, 'dial') >= 100 ? 1 : n(p, 'dial') >= 63 ? 1.6 : 2.5} % of span, EN 837-1)`, box: (p) => [n(p, 'dial') + 4, n(p, 'dial') * 0.5 + 15, n(p, 'dial') + 20], g: (p) => n(p, 'dial') ** 2 * 0.035,
  },
  {
    id: 'rotaryencoder', look: 'can', name: 'optical rotary encoder', path: 'Electrical/Sensors/Encoders', says: 'a slotted disc and light gates on a shaft: two square waves a quarter-step apart count its turning', std: 'the resolutions, shafts and outputs sold',
    axes: [unit('ppr', 'pulses a turn', 'ppr', [100, 200, 360, 400, 500, 600, 1000, 1024, 2000, 2500]), ax('shaft', 'shaft', 'mm', [6, 8]), bare('out', 'output', ['NPN', 'pushpull', 'linedriver'])],
    title: (p) => `rotary encoder ${p.ppr} ppr, ${p.shaft} mm shaft, ${p.out === 'pushpull' ? 'push-pull' : p.out === 'linedriver' ? 'line driver' : 'NPN open collector'}`, of: () => 'al-6061 glass gan silicon {bearing 606}*2 pcb-bare copper pvc', make: 'assemble', how: 'a printed glass (or metal) disc on a shaft in two bearings, an LED and photo-sensors either side',
    spec: (p) => `${p.ppr} pulses a turn, ${4 * n(p, 'ppr')} counts in quadrature (${(360 / (4 * n(p, 'ppr'))).toFixed(4)}° each); 5–24 V`, box: () => [38, 38, 50], g: () => 120,
  },
  {
    id: 'display', name: 'display module', path: 'Electrical/Displays/Modules', says: 'a display on its driver board, ready to wire to a microcontroller', std: 'the common modules (typical board sizes)',
    axes: [bare('type', 'type', Object.keys(DISPLAYS))],
    title: (p) => DISPLAYS[s(p, 'type')]![0], of: (p) => `${DISPLAYS[s(p, 'type')]![3]} pcb-bare ic-package pin-header`, make: 'solder', how: 'the panel bonded to its controller and soldered to a carrier board with a pin header', spec: (p) => `${DISPLAYS[s(p, 'type')]![0]}; board about ${DISPLAYS[s(p, 'type')]![1]} × ${DISPLAYS[s(p, 'type')]![2]} mm`,
    box: (p) => [DISPLAYS[s(p, 'type')]![1], DISPLAYS[s(p, 'type')]![2], 8], g: (p) => DISPLAYS[s(p, 'type')]![1] * DISPLAYS[s(p, 'type')]![2] * 0.006,
  },
  {
    id: 'lamp', name: 'LED lamp', path: 'Electrical/Lighting/Lamps', says: 'an LED bulb for a standard lamp base', std: 'the bases (IEC 60061), powers and colour temperatures sold; light about 100 lm a watt (typical)',
    axes: [bare('base', 'base', ['E27', 'E14', 'B22', 'GU10', 'GU5.3']), unit('W', 'power', 'W', (p) => (p.base === 'GU10' || p.base === 'GU5.3' ? [3, 5, 7] : [3, 5, 7, 9, 12, 15, 20])), unit('K', 'colour temperature', 'K', [2700, 3000, 4000, 6500])],
    title: (p) => `${p.base} LED lamp, ${p.W} W, ${p.K} K`, of: () => 'gan yag-phosphor al-6061 pc pcb-bare capacitor-electrolytic brass', make: 'assemble', how: 'LEDs on an aluminium board behind a diffusing dome, a small driver in the base',
    spec: (p) => `about ${n(p, 'W') * 100} lm (typical); ${n(p, 'K') <= 3000 ? 'warm white' : n(p, 'K') <= 4000 ? 'neutral white' : 'daylight'}; ${p.base === 'GU5.3' ? '12 V' : '230 V'}`, box: (p) => (String(p.base).startsWith('GU') ? [50, 50, 55] : [60, 60, 110]), g: (p) => 25 + n(p, 'W') * 5,
  },
  {
    id: 'laserdiode', name: 'laser diode', path: 'Electrical/Optoelectronics/Laser diodes', says: 'a semiconductor laser in a small can', std: 'the wavelengths and powers sold; laser class by IEC 60825-1',
    axes: [unit('nm', 'wavelength', 'nm', [405, 450, 520, 638, 650, 780, 808, 980]), unit('mW', 'power', 'mW', (p) => [5, 50, 100, 200, 500, 1000, 2000, 5000].filter((w) => w <= ({ 405: 1000, 450: 5000, 520: 1000, 638: 500, 650: 200, 780: 200, 808: 5000, 980: 5000 } as Record<number, number>)[n(p, 'nm')]!))],
    title: (p) => `${p.nm} nm laser diode, ${n(p, 'mW') >= 1000 ? `${n(p, 'mW') / 1000} W` : `${p.mW} mW`}`, of: () => 'laser-chip submount to-header to-cap monitor-photodiode', make: 'assemble', how: 'a cleaved semiconductor chip on a copper heat-sink in a windowed can',
    spec: (p) => { const E = (6.626e-34 * 2.998e8) / (n(p, 'nm') * 1e-9), mw = n(p, 'mW'); return `each photon ${(E / 1.602e-19).toFixed(2)} eV (E = hc/λ); class ${mw <= 5 ? '3R' : mw <= 500 ? '3B' : '4'} (IEC 60825-1): ${mw <= 5 ? 'never look into it' : 'eye damage from any reflection: goggles for its wavelength'}`; },
    box: (p) => (n(p, 'mW') <= 200 ? [5.6, 5.6, 6] : [9, 9, 7]), g: (p) => (n(p, 'mW') <= 200 ? 0.4 : 1.5),
  },
  {
    id: 'lens', name: 'plano-convex lens', path: 'Optics/Lenses/Plano-convex', says: 'a lens flat one side, curved the other, to focus or collimate light', std: 'the diameters and focal lengths sold, in N-BK7 glass',
    axes: [ax('d', 'diameter', 'mm', [6, 10, 12.7, 25.4, 50.8]), ax('f', 'focal length', 'mm', (p) => [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 500, 1000].filter((f) => f >= n(p, 'd') * 0.8)), bare('coat', 'coating', ['uncoated', 'ARvis'])],
    title: (p) => `plano-convex lens ${p.d} mm, f ${p.f} mm${p.coat === 'ARvis' ? ', AR-coated' : ''}`, of: (p) => `bk7${p.coat === 'ARvis' ? ' mgo' : ''}`, make: 'grind', how: 'N-BK7 glass ground and polished to its curve, centred and edged',
    spec: (p) => { const R = (1.5168 - 1) * n(p, 'f'), sag = R - Math.sqrt(R * R - (n(p, 'd') / 2) ** 2); return `R = (n − 1) f = ${R.toFixed(2)} mm (n = 1.5168 at 587.6 nm); centre ${(sag + 2).toFixed(2)} mm thick, its edge 2 mm`; },
    box: (p) => { const R = 0.5168 * n(p, 'f'), sag = R - Math.sqrt(Math.max(0, R * R - (n(p, 'd') / 2) ** 2)); return [n(p, 'd'), n(p, 'd'), sag + 2]; }, g: (p) => { const R = 0.5168 * n(p, 'f'), sag = R - Math.sqrt(Math.max(0, R * R - (n(p, 'd') / 2) ** 2)); return gOf(cyl(n(p, 'd'), 2 + sag / 2), 2.51); },
  },
  {
    id: 'mirror', name: 'flat mirror', path: 'Optics/Mirrors/Flat', says: 'a polished glass flat with a reflecting coat on its front', std: 'the diameters sold; reflectances typical for each coat',
    axes: [ax('d', 'diameter', 'mm', [12.7, 25.4, 50.8]), bare('coat', 'coating', ['aluminium', 'silver', 'gold', 'dielectric'])],
    title: (p) => `${p.d} mm ${p.coat} mirror`, of: () => 'mirror-substrate mirror-coating', make: 'coat', how: 'glass polished flat to a quarter-wave, coated in a vacuum, a protective layer over it', spec: (p) => `reflects about ${({ aluminium: 90, silver: 97, gold: 98, dielectric: 99.5 } as Record<string, number>)[s(p, 'coat')]} % ${p.coat === 'gold' ? 'of infrared' : p.coat === 'dielectric' ? 'over its design band' : 'of visible light'} (typical)`,
    box: (p) => [n(p, 'd'), n(p, 'd'), n(p, 'd') / 4], g: (p) => gOf(cyl(n(p, 'd'), n(p, 'd') / 4), 2.51),
  },
];

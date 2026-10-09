// A lesson for every step of making a thing for real: what to do, in order, and how you can tell each step is done (a
// check you can see or measure), with its tools by their price keys (src/nexus/prices.ts) and its dangers said before
// its steps. A build's lessons are the ones its processes call for (src/nexus/buildpack.ts): solder a header on, flash a
// card, wire an LED, order a plate. A process with no lesson yet is said as one, so nothing is skipped unseen.
// Steps are from the sources each lesson names; a figure that is a rule of thumb is marked typical.
// Owner of: the lessons, and which a set of processes needs.

import { BAND, bandsOf } from './packages';
import { ADAFRUIT_GUIDE, buildOn, lessonOf, PERMA_PROTO_HALF, type Build, type PartHow } from './edges';
import { layProto, type Component, type Rails } from './embody/breadboard';

export interface Step { do: string; /** how you can tell it is done */ check?: string }
export interface Lesson { id: string; title: string; why: string; tools: string[]; safety: string[]; steps: Step[]; src: string }

/** E12, the series resistors are sold in (IEC 60063). */
const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
/** The least standard resistor of at least R, Ω. */
export function e12AtLeast(R: number): number { const d = 10 ** Math.floor(Math.log10(R)); const m = E12.find((x) => x * d >= R - 1e-9); return +(m ? m * d : 10 * d).toPrecision(3); }
/** An LED's resistor from a pin: (supply − forward voltage) / current, the next standard value up, and the current it
 *  then lets through. */
export function ledResistor(supply: number, vf: number, mA: number): { R: number; mA: number; bands: string } {
  const R = e12AtLeast((supply - vf) / (mA / 1000));
  return { R, mA: +(((supply - vf) / R) * 1000).toFixed(1), bands: bandsOf(R).map((b) => BAND[b]![0]).join('-') };
}

const SAFE_IRON = ['The tip runs above 300 °C: hold the iron only by its grip and put it in its stand every time it leaves your hand.', 'Solder where air moves (a window, or a fan drawing the smoke away from your face).', 'Wear glasses when you trim leads: clipped ends fly.', 'Wash your hands after handling solder, before eating; leaded solder most of all.', 'Never use acid-core solder or acid flux (for plumbing): it eats electronics (Adafruit\'s guide).'];
const ADA = ADAFRUIT_GUIDE;
const red = ledResistor(3.3, 2.0, 5);

/** The tip's temperature for leaded solder, °C (typical: lead-free wants more heat, and often more flux). */
export const LEADED_TIP = 330;
/** The LED lesson's circuit, as nets: two AA cells in Adafruit's 3951 holder, off the board on their leads, across the
 *  top rails; the 330 Ω from the + supply to the LED's anode; the LED's cathode to the − rail. Laid on the Perma-Proto
 *  by its nets (src/nexus/embody/breadboard.ts's layProto): the holder into the rails at columns 1 and 3, the + rail
 *  brought to column 5 by a link, the resistor along row c from column 5 to 9 (four holes: its body and bends), the LED
 *  in column 9 from row a into the − rail. */
export const LED_CIRCUIT: Component[] = [
  { id: 'battery', name: 'battery holder', flying: true, span: 2, body: [0.058, 0.014, 0.032], colour: 0x1a1a1b, pins: [{ name: '+', net: 'V+' }, { name: '−', net: '0 V' }] },
  { id: 'resistor', name: '330 Ω resistor', span: 4, body: [0.0063, 0.0025, 0.0025], colour: 0x6f9fd8, pins: [{ name: '1', net: 'V+' }, { name: '2', net: 'LED anode' }] },
  { id: 'led', name: 'red LED', body: [0.0058, 0.0086, 0.0058], colour: 0xd8262e, pins: [{ name: 'anode', net: 'LED anode' }, { name: 'cathode', net: '0 V' }] },
];
export const LED_RAILS: Rails = { topPlus: 'V+', topMinus: '0 V', bottomPlus: 'none', bottomMinus: 'none' };
/** How each of its parts goes in, in words the edges say (src/nexus/edges.ts). */
const LED_HOW: Record<string, PartHow> = {
  resistor: { name: 'the resistor', form: 'axial', watts: 0.25, height: 2.5, leads: [{ name: 'its first lead', tag: 'first', pin: 0.6, round: true }, { name: 'its second lead', tag: 'second', pin: 0.6, round: true }] },
  led: { name: 'the LED', form: 'radial', height: 11.6, mark: { what: 'the flat of its rim', by: 1 }, leads: [{ name: 'its long lead, the anode,', tag: 'anode', pin: 0.5, round: false }, { name: 'its short lead, by the flat on its rim,', tag: 'cathode', pin: 0.5, round: false }] },
  battery: { name: 'the battery holder', form: 'flying', hangs: true, ready: { do: 'Put two AA cells in the battery holder, its knife switch up (open)', check: 'the switch open' },
    leads: [{ name: 'its red lead\'s pin', tag: 'red', pin: 0.64, round: false }, { name: 'its black lead\'s', tag: 'black', pin: 0.64, round: false }] },
};
/** The LED lesson's build: its circuit laid on the board by its nets, the soldering kit, two fresh alkaline AAs
 *  through the 330 Ω and Adafruit's red LED (its 299: 1.85–2.5 V at 20 mA, taken as 1.95 there, falling by
 *  n·kT/q·ln(I/20 mA) below it with n about 2, an estimate typical of red AlGaInP LEDs; each cell 1.6 V fresh (its
 *  listing) and about 0.15 Ω (typical of alkaline AAs)). Its lesson's steps are its edges, said. */
const LED_LAYOUT = layProto(LED_CIRCUIT, LED_RAILS);
if (LED_LAYOUT.refused.length || LED_LAYOUT.opens.length || LED_LAYOUT.shorts.length) throw new Error(`the LED circuit does not lay out: ${[...LED_LAYOUT.refused.map((r) => `${r.id}: ${r.why}`), ...LED_LAYOUT.opens, ...LED_LAYOUT.shorts].join('; ')}`);
export const PROTO_BUILD: Build = buildOn(PERMA_PROTO_HALF, LED_LAYOUT, LED_HOW, [
    { role: 'iron', name: 'the iron', key: 'soldering-iron', fig: { set: LEADED_TIP }, src: 'PINE64\'s Pinecil; 330 °C for leaded solder (typical)' },
    { role: 'solder', name: 'the solder', key: 'solder-leaded', fig: { d: 0.5 }, alloy: 'Sn63Pb37', src: 'Adafruit\'s 1886 reel: 0.5 mm 63/37 with a rosin core' },
    { role: 'cleaner', name: 'the brass wool', key: 'tip-cleaner', fig: {}, src: 'Hakko\'s 599B: dry brass, cools the tip less than a wet sponge' },
    { role: 'cutters', name: 'the flush cutters', key: 'flush-cutters', fig: { cu: 1.3, jaw: 8 }, src: 'Hakko\'s CHP-170: copper to 1.3 mm (16 AWG), its jaws 8 mm' },
    { role: 'hands', name: 'the helping hands', key: 'helping-hands', fig: { span: 150 }, src: 'Adafruit\'s 291, the MZ101: its clips on a 150 mm bar (its reach an estimate)' },
    { role: 'stand', name: 'its stand', key: 'iron-stand', fig: {}, src: 'Atten\'s S-11' },
], { source: 'battery', cells: 2, cell: 1.6, rCell: 0.15, ohms: 330, led: { vf20: 1.95, nVt: 0.0514, max: 20 }, closes: 'the knife switch', src: 'Adafruit\'s 3951 holder and LR6 cells (1.6 V fresh); its 299 LED (1.85–2.5 V at 20 mA); 0.15 Ω a cell (typical)' });
const PROTO_LESSON = lessonOf(PROTO_BUILD);
if (PROTO_LESSON.refused.length) throw new Error(`the LED lesson's build cannot be done: ${PROTO_LESSON.refused.join('; ')}`);
export const LESSONS: Record<string, Lesson> = {
  'solder-joint': {
    id: 'solder-joint', title: 'Solder a through-hole joint', why: 'every header, every leaded part and every wire is held and joined this way',
    tools: ['soldering-iron', 'solder-leaded', 'tip-cleaner', 'flush-cutters'], safety: SAFE_IRON,
    steps: [
      { do: 'Heat the iron; for leaded solder start near 330 °C (typical; lead-free wants more heat, and often more flux). Wipe the tip on the damp sponge and melt a little solder onto it.', check: 'the tip is shiny silver, not black' },
      { do: 'Touch the tip to the pad and the lead together, so both heat. A drop of solder on the tip carries the heat across.' },
      { do: 'Feed solder to the joint, not to the iron, so it touches pad and lead. It should melt and flow onto both; if it does not, heat a second or two longer and try again.', check: 'it flows onto the pin and the pad' },
      { do: 'Keep heating and let it flow into the hole, then take the solder away, then the iron. Let it cool without moving it.', check: 'smooth, filling the hole, wetting both pad and pin; not a ball sitting on top' },
      { do: 'Trim the lead close to the board with the flush cutters.' },
    ], src: `${ADA}, "Making a good solder joint" and "Tools"`,
  },
  'solder-headers': {
    id: 'solder-headers', title: 'Solder headers onto a Pico', why: 'its pins are holes until headers are soldered in; then it plugs into a breadboard',
    tools: ['soldering-iron', 'solder-leaded', 'tip-cleaner', 'breadboard'], safety: SAFE_IRON,
    steps: [
      { do: 'Push the two 20-pin headers, long pins down, into the breadboard, as far apart as the Pico\'s two rows of holes.', check: 'the Pico drops onto them with its pins through every hole' },
      { do: 'Lay the Pico on them. The breadboard holds the pins square while you solder.' },
      { do: 'Solder one pin at each end of each row first, as the joint lesson says.', check: 'the Pico sits flat on the header plastic' },
      { do: 'Solder the other 36, one at a time, letting each cool.', check: 'every pin has its cone; no joint runs into its neighbour (a multimeter on continuity stays silent between neighbours)' },
    ], src: `${ADA}; raspberrypi.com, "Raspberry Pi Pico" documentation`,
  },
  'solder-proto': {
    id: 'solder-proto', title: 'Solder an LED and its resistor onto a Perma-Proto', why: 'every leaded part goes in this way: through its holes, bent to hold, soldered from underneath, its leads trimmed',
    tools: ['soldering-iron', 'solder-leaded', 'tip-cleaner', 'flush-cutters', 'helping-hands', 'hookup-wire'], safety: [...SAFE_IRON, 'Hold a lead\'s end as you cut it, or point it down: a cut lead flies.'],
    steps: PROTO_LESSON.steps.map((q) => ({ do: q.do, ...(q.check ? { check: q.check } : {}) })),
    src: `${ADA}, "Common Problems" and "Making a good solder joint"; Adafruit's Perma-Proto listing; IPC-A-610's lead protrusion`,
  },
  'flash-pi-os': {
    id: 'flash-pi-os', title: 'Put Raspberry Pi OS on a card and start the Pi', why: 'a Pi has no OS until its card holds one',
    tools: ['microsd-32gb', 'pi-27w-psu'], safety: ['Plug the power in last, once the card is in.'],
    steps: [
      { do: 'On your computer install Raspberry Pi Imager (raspberrypi.com/software).' },
      { do: 'Choose the device (your Pi), the OS (Raspberry Pi OS, 64-bit) and the storage (your card in its reader).' },
      { do: 'In its settings set a hostname, your user and password, your Wi-Fi, and turn SSH on. Write the card.', check: 'Imager says the write and its check finished' },
      { do: 'Put the card in the Pi and plug in its supply.', check: 'the green light flickers as it boots' },
      { do: 'From your computer: ssh <user>@<hostname>.local (or open Raspberry Pi Connect from your phone\'s browser).', check: 'it asks for your password and gives you a prompt on the Pi' },
    ], src: 'raspberrypi.com/documentation/computers/getting-started.html',
  },
  'flash-micropython': {
    id: 'flash-micropython', title: 'Put MicroPython on a Pico', why: 'then it runs the Python programs the Computer app runs here',
    tools: [], safety: [],
    steps: [
      { do: 'Download the MicroPython UF2 file for your exact board (Pico, Pico W, Pico 2, Pico 2 W each has its own).' },
      { do: 'Hold the BOOTSEL button and plug the Pico into your computer with a micro-USB cable that carries data (not a charge-only one).', check: 'a drive appears (RPI-RP2 or RP2350)' },
      { do: 'Drag the UF2 file onto that drive.', check: 'the drive disappears: the Pico has restarted into MicroPython' },
      { do: 'Open Thonny, choose the MicroPython (Raspberry Pi Pico) interpreter, and type print("hello").', check: 'its shell answers hello' },
    ], src: 'raspberrypi.com/documentation/microcontrollers/micropython.html',
  },
  'led-circuit': {
    id: 'led-circuit', title: 'Light an LED from a pin, its resistor by Ohm\'s law', why: 'the first circuit; every output after it is this with a bigger load',
    tools: ['breadboard', 'jumper-wires', 'led-red-5mm'], safety: ['Never wire an LED straight across a pin and ground: with nothing to limit it the current is limited only by the pin, which it can damage.'],
    steps: [
      { do: `Work out its resistor: (3.3 V from the pin − 2.0 V across a red LED, typical of its die) ÷ 5 mA = ${((3.3 - 2.0) / 0.005).toFixed(0)} Ω; the next standard value up is ${red.R} Ω (E12), which lets ${red.mA} mA through. A loose ${red.R} Ω resistor's bands read ${red.bands}. LEDs sold with a resistor on their lead already have one: read its bands and work out the current it lets through the same way.`, check: 'you can say what current your LED will take' },
      { do: 'On the breadboard: the pin\'s wire to the resistor, the resistor to the LED\'s long leg (anode), its short leg (the flat side, cathode) to a ground pin.' },
      { do: 'Run the blink program from the Computer app here first, then on the board.', check: 'it blinks as often as the program says' },
    ], src: 'Ohm\'s law; the LED\'s forward voltage from the library\'s LED family (typical of its die); E12 from IEC 60063',
  },
  'multimeter': {
    id: 'multimeter', title: 'Check with a multimeter', why: 'see what a circuit does instead of guessing',
    tools: ['multimeter'], safety: ['Never measure mains with a meter you are learning on.'],
    steps: [
      { do: 'Black lead in COM, red in the V/Ω socket.' },
      { do: 'Continuity (the sound symbol): touch the leads together.', check: 'it beeps' },
      { do: 'Touch both ends of one jumper wire.', check: 'it beeps; across two neighbouring header pins it must stay silent' },
      { do: 'DC volts: red on the board\'s 3V3 pin, black on a GND pin, the board powered.', check: 'about 3.3 V' },
    ], src: 'a meter\'s own manual; Adafruit, "Multimeters" (learn.adafruit.com/multimeters)',
  },
  'mount-standoffs': {
    id: 'mount-standoffs', title: 'Mount boards on the plate', why: 'a board held off the bench on standoffs cannot short on anything under it',
    tools: ['m25-standoffs', 'screwdriver'], safety: ['Unplug a board before you screw it down.'],
    steps: [
      { do: 'From under the plate, screw a standoff on through each board hole.' },
      { do: 'Set the board on them and screw it down, finger-tight and a little more: nylon threads strip if forced.', check: 'it does not rock, and nothing under it touches the plate' },
    ], src: 'the plate\'s holes are each board\'s maker\'s pattern (src/nexus/sbc.ts), cleared by ISO 273',
  },
  'order-board-plate': {
    id: 'order-board-plate', title: 'Order the plate as a bare circuit board', why: 'a board maker\'s prototype offer makes a drilled FR-4 plate cheaper than any cutter',
    tools: [], safety: [],
    steps: [
      { do: 'On jlcpcb.com (or oshpark.com, made in the US) choose its instant quote and upload plate-gerbers.zip.', check: 'it reads the plate\'s size from its outline' },
      { do: 'Keep 2 layers, 1.6 mm FR-4, quantity 5 (JLCPCB) or 3 (OSH Park). With no copper on it, its finish does not matter.' },
      { do: 'Open its viewer before paying.', check: 'the outline and every hole are where README.txt says' },
      { do: 'Pay. To the US, JLCPCB collects the tariff at checkout (its U.S. Tariff Policy FAQ).' },
    ], src: 'jlcpcb.com; docs.oshpark.com/services; JLCPCB, "U.S. Tariff Policy FAQ" (8 September 2026)',
  },
  'order-laser': {
    id: 'order-laser', title: 'Order the plate laser-cut in aluminium', why: 'metal, and stiffest, when it must carry more',
    tools: [], safety: ['Cut aluminium edges can be sharp: run a file or fine paper along them.'],
    steps: [
      { do: 'On sendcutsend.com upload plate.dxf and say its units are millimetres.', check: 'it reads the size README.txt gives' },
      { do: 'Choose 5052 aluminium, 0.125 in, quantity 1; it prices it there and then.' },
      { do: 'Check its preview for every hole. Orders of $39 or more ship free in the US.' },
    ], src: 'sendcutsend.com/pricing',
  },
  'print-part': {
    id: 'print-part', title: 'Print the plate', why: 'with your own printer it costs only its plastic',
    tools: [], safety: ['A printer\'s nozzle and bed are hot.'],
    steps: [
      { do: 'Open plate.stl in your slicer (it is in millimetres) and lay it flat.' },
      { do: 'PLA, three walls and about 30 % infill are a common start (typical, not a source\'s figure). Slice and print.', check: 'it comes off flat, its holes round' },
      { do: 'Try a screw in each hole; ream a tight one with a drill bit of its size by hand.' },
    ], src: 'the slicer\'s own guide',
  },
  'assemble': {
    id: 'assemble', title: 'Put it together', why: 'a machine is its parts held where they belong: by screws done up in order, square, and nothing forced',
    tools: ['hex-key', 'screwdriver', 'caliper-digital'], safety: ['Nothing powered while you build it.', 'Where a part must be forced, stop: it is the wrong part, the wrong way round, or something is in its way.'],
    steps: [
      { do: 'Lay every part out and count it against the list before you start.', check: 'nothing is missing, and nothing is left over that should not be' },
      { do: 'Start every screw by hand for its first turns, so it cannot cross its thread.' },
      { do: 'Do a joint up in a cross pattern, a little at a time, until each screw is snug, then a quarter turn more (typical for small screws by hand; a part with a torque in its manual takes that torque).' },
      { do: 'Square a frame before its last screws are tight: measure both diagonals with the caliper or a rule.', check: 'the two diagonals are equal: a rectangle\'s diagonals are, and only a rectangle\'s are' },
      { do: 'Move every moving part through all of its travel by hand before anything is powered.', check: 'it moves freely the whole way, without catching' },
    ], src: 'a rectangle is the only parallelogram whose diagonals are equal (geometry); the rest is common workshop practice, marked typical where it is a rule of thumb',
  },
  'crimp': {
    id: 'crimp', title: 'Crimp a connector', why: 'motors, sensors and fans plug in by crimped contacts in small housings (JST-XH and the like)',
    tools: ['crimper', 'wire-stripper'], safety: ['Cut wire ends fly: wear glasses.'],
    steps: [
      { do: 'Strip only as much insulation as the contact\'s own drawing says (a couple of millimetres for small contacts).' },
      { do: 'Lay the wire in the contact: its bare end under the front pair of wings, its insulation under the back pair.' },
      { do: 'Crimp it in the tool\'s die that matches the contact, until the ratchet lets go.', check: 'the front wings bite the bare wire, the back wings grip the insulation, no strands outside' },
      { do: 'Tug the wire firmly.', check: 'it does not move' },
      { do: 'Push the contact into its housing the right way up until it clicks.', check: 'a gentle pull on the wire does not draw it out' },
    ], src: 'the contact maker\'s crimping guidance (JST, Molex handbooks): strip length and die from its drawing; a crimp tool must name the contact or its die size',
  },
  'order-custom': {
    id: 'order-custom', title: 'Have a part made from its drawing', why: 'a shaped part (a moulded case, a cast bracket, a bent cover) is made from a drawing; without one no service can quote it',
    tools: ['caliper-digital'], safety: [],
    steps: [
      { do: 'Ask for its drawing first ("draw the …"): this pack lists it, with its size where the inventory gives one, but it is not drawn yet.' },
      { do: 'Check its size against what it meets with the caliper (the holes it must line up with, the board it must hold).', check: 'every hole and edge matches what it joins' },
      { do: 'Upload its file to the way this pack names (a moulded part printed at JLC3DP or at home; a stamped part laser-cut at SendCutSend; a machined part to a CNC service) and choose its material.', check: 'the service\'s preview shows the part at its true size' },
      { do: 'Order the made parts first: they are made, then shipped, while bought parts come from stock.' },
    ], src: 'the services\' own upload pages (jlc3dp.com, sendcutsend.com)',
  },
  'program-with-claude': {
    id: 'program-with-claude', title: 'Program it with Claude beside you', why: 'write it, run it here, ask why, then put it on the real board',
    tools: [], safety: [],
    steps: [
      { do: 'Open the Computer app on the phone and choose your board.' },
      { do: 'Run its example here.', check: 'its pins change as the bars show' },
      { do: 'Ask Claude to change it ("blink twice as fast", "read a button on GP15").', check: 'the program changes, and runs here' },
      { do: 'Open For real and do its steps on the board.', check: 'the real board does what it did here' },
    ], src: 'the Computer app (src/nexus/codesim.ts)',
  },
};

/** The lessons a set of processes calls for, in the order they are done; the processes no lesson covers yet, said. */
export function lessonsFor(processes: string[]): { lessons: Lesson[]; none: string[] } {
  const order = Object.keys(LESSONS), want = [...new Set(processes)];
  return { lessons: order.filter((k) => want.includes(k)).map((k) => LESSONS[k]!), none: want.filter((k) => !LESSONS[k]) };
}

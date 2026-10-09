// A lesson for every step of making a thing for real: what to do, in order, and how you can tell each step is done (a
// check you can see or measure), with its tools by their price keys (src/nexus/prices.ts) and its dangers said before
// its steps. A build's lessons are the ones its processes call for (src/nexus/buildpack.ts): solder a header on, flash a
// card, wire an LED, order a plate. A process with no lesson yet is said as one, so nothing is skipped unseen.
// Steps are from the sources each lesson names; a figure that is a rule of thumb is marked typical.
// Owner of: the lessons, and which a set of processes needs.

import { BAND, bandsOf } from './packages';

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
const ADA = 'Adafruit Guide to Excellent Soldering (learn.adafruit.com/adafruit-guide-excellent-soldering)';
const red = ledResistor(3.3, 2.0, 5);

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

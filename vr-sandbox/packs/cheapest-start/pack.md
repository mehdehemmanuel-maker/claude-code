# Build pack: pico 2 w, red led, soldering kit, I have a laptop

Prices as seen 2026-10-09, US dollars before tax. Total **$65.35**; the nice-to-haves another $56.80. The total is what to buy, the bench, and the plate made (its shipping and tariff estimated); not tax, nor the shops' own shipping.

## Buy

| what | buy | from | cost | why |
| --- | --- | --- | --- | --- |
| Raspberry Pi Pico 2 W | [Raspberry Pi Pico 2 W](https://www.pishop.us/product/raspberry-pi-pico-2-w/) | PiShop.us (official Raspberry Pi reseller) | $7.00 | you asked for it |
| red LED, 5 mm | [LED - Red with Resistor 5mm (25 pack)](https://www.sparkfun.com/led-red-with-resistor-5mm-25-pack.html) | SparkFun | $12.50 | you asked for it |
| solderless breadboard | [Half Sized Premium Breadboard - 400 Tie Points](https://www.adafruit.com/product/64) | Adafruit | $4.95 | to wire the LED without soldering |
| jumper wires, male to male | [Premium Male/Male Jumper Wires - 20 x 6" (150mm)](https://www.adafruit.com/product/1957) | Adafruit | $1.95 | to wire the breadboard |

## Bench (what the steps need)

| what | buy | from | cost | why |
| --- | --- | --- | --- | --- |
| soldering iron | [Adjustable 60W Pen-Style Soldering Iron - 120VAC USA Plug - BEST 102C](https://www.adafruit.com/product/3685) | Adafruit | $19.95 | to solder |
| solder wire, 60/40 tin-lead, rosin core | [Solder Wire - 60/40 Rosin Core - 0.5mm/0.02" diameter - 50 grams](https://www.adafruit.com/product/1886) | Adafruit | $9.25 | leaded 60/40 is the easiest to learn on (Adafruit); say lead-free for none |
| tip cleaner | [Square 60mm x 60mm Soldering Sponge - 3 Pack](https://www.adafruit.com/product/3540) | Adafruit | $2.50 | a clean tip is what makes solder flow |
| flush cutters | [Flush diagonal cutters - CHP170](https://www.adafruit.com/product/152) | Adafruit | $7.25 | to trim leads after soldering |

## Nice to have

| what | buy | from | cost | why |
| --- | --- | --- | --- | --- |
| soldering iron stand | [Soldering iron stand](https://www.adafruit.com/product/150) | Adafruit | $10.95 | somewhere safe to put it down |
| no-clean flux pen | [Chip Quik No-Clean Liquid Flux Pen - 10ml Pen w/ Tip - CQ4LF](https://www.adafruit.com/product/3468) | Adafruit | $7.95 | solder flows better with more flux |
| desoldering braid | [Solder wick - 1.5mm wide and 1.5m / 5 feet long](https://www.adafruit.com/product/149) | Adafruit | $3.50 | to take a bad joint apart |
| helping hands with magnifier | [Helping Third Hand Magnifier W/Magnifying Glass Tool - MZ101](https://www.adafruit.com/product/291) | Adafruit | $6.95 | holds the work |
| silicone work mat | [Insulated Silicone Rework Mat - 34cm x 23cm Work Surface - Blue](https://www.adafruit.com/product/3536) | Adafruit | $9.95 | a bench that does not burn |
| digital multimeter | [Digital Multimeter - Model 9205B+](https://www.adafruit.com/product/2034) | Adafruit | $17.50 | to check joints and voltages |

## Said

- Digital Multimeter - Model 9205B+ was out of stock at Adafruit when seen (2026-10-09); also: Pocket Autoranging Digital Multimeter $24.95

## Lessons

### Solder a through-hole joint

every header, every leaded part and every wire is held and joined this way. Tools: soldering iron, solder wire, 60/40 tin-lead, rosin core, tip cleaner, flush cutters.

Safety: The tip runs above 300 °C: hold the iron only by its grip and put it in its stand every time it leaves your hand. Solder where air moves (a window, or a fan drawing the smoke away from your face). Wear glasses when you trim leads: clipped ends fly. Wash your hands after handling solder, before eating; leaded solder most of all. Never use acid-core solder or acid flux (for plumbing): it eats electronics (Adafruit's guide).

1. Heat the iron; for leaded solder start near 330 °C (typical; lead-free wants more heat, and often more flux). Wipe the tip on the damp sponge and melt a little solder onto it. *Done when: the tip is shiny silver, not black.*
2. Touch the tip to the pad and the lead together, so both heat. A drop of solder on the tip carries the heat across.
3. Feed solder to the joint, not to the iron, so it touches pad and lead. It should melt and flow onto both; if it does not, heat a second or two longer and try again. *Done when: it flows onto the pin and the pad.*
4. Keep heating and let it flow into the hole, then take the solder away, then the iron. Let it cool without moving it. *Done when: smooth, filling the hole, wetting both pad and pin; not a ball sitting on top.*
5. Trim the lead close to the board with the flush cutters.

Source: Adafruit Guide to Excellent Soldering (learn.adafruit.com/adafruit-guide-excellent-soldering), "Making a good solder joint" and "Tools".

### Solder headers onto a Pico

its pins are holes until headers are soldered in; then it plugs into a breadboard. Tools: soldering iron, solder wire, 60/40 tin-lead, rosin core, tip cleaner, solderless breadboard.

Safety: The tip runs above 300 °C: hold the iron only by its grip and put it in its stand every time it leaves your hand. Solder where air moves (a window, or a fan drawing the smoke away from your face). Wear glasses when you trim leads: clipped ends fly. Wash your hands after handling solder, before eating; leaded solder most of all. Never use acid-core solder or acid flux (for plumbing): it eats electronics (Adafruit's guide).

1. Push the two 20-pin headers, long pins down, into the breadboard, as far apart as the Pico's two rows of holes. *Done when: the Pico drops onto them with its pins through every hole.*
2. Lay the Pico on them. The breadboard holds the pins square while you solder.
3. Solder one pin at each end of each row first, as the joint lesson says. *Done when: the Pico sits flat on the header plastic.*
4. Solder the other 36, one at a time, letting each cool. *Done when: every pin has its cone; no joint runs into its neighbour (a multimeter on continuity stays silent between neighbours).*

Source: Adafruit Guide to Excellent Soldering (learn.adafruit.com/adafruit-guide-excellent-soldering); raspberrypi.com, "Raspberry Pi Pico" documentation.

### Put MicroPython on a Pico

then it runs the Python programs the Computer app runs here.

1. Download the MicroPython UF2 file for your exact board (Pico, Pico W, Pico 2, Pico 2 W each has its own).
2. Hold the BOOTSEL button and plug the Pico into your computer with a micro-USB cable that carries data (not a charge-only one). *Done when: a drive appears (RPI-RP2 or RP2350).*
3. Drag the UF2 file onto that drive. *Done when: the drive disappears: the Pico has restarted into MicroPython.*
4. Open Thonny, choose the MicroPython (Raspberry Pi Pico) interpreter, and type print("hello"). *Done when: its shell answers hello.*

Source: raspberrypi.com/documentation/microcontrollers/micropython.html.

### Light an LED from a pin, its resistor by Ohm's law

the first circuit; every output after it is this with a bigger load. Tools: solderless breadboard, jumper wires, male to male, red LED, 5 mm.

Safety: Never wire an LED straight across a pin and ground: with nothing to limit it the current is limited only by the pin, which it can damage.

1. Work out its resistor: (3.3 V from the pin − 2.0 V across a red LED, typical of its die) ÷ 5 mA = 260 Ω; the next standard value up is 270 Ω (E12), which lets 4.8 mA through. A loose 270 Ω resistor's bands read red-violet-black-black-brown. LEDs sold with a resistor on their lead already have one: read its bands and work out the current it lets through the same way. *Done when: you can say what current your LED will take.*
2. On the breadboard: the pin's wire to the resistor, the resistor to the LED's long leg (anode), its short leg (the flat side, cathode) to a ground pin.
3. Run the blink program from the Computer app here first, then on the board. *Done when: it blinks as often as the program says.*

Source: Ohm's law; the LED's forward voltage from the library's LED family (typical of its die); E12 from IEC 60063.

### Check with a multimeter

see what a circuit does instead of guessing. Tools: digital multimeter.

Safety: Never measure mains with a meter you are learning on.

1. Black lead in COM, red in the V/Ω socket.
2. Continuity (the sound symbol): touch the leads together. *Done when: it beeps.*
3. Touch both ends of one jumper wire. *Done when: it beeps; across two neighbouring header pins it must stay silent.*
4. DC volts: red on the board's 3V3 pin, black on a GND pin, the board powered. *Done when: about 3.3 V.*

Source: a meter's own manual; Adafruit, "Multimeters" (learn.adafruit.com/multimeters).

### Program it with Claude beside you

write it, run it here, ask why, then put it on the real board.

1. Open the Computer app on the phone and choose your board.
2. Run its example here. *Done when: its pins change as the bars show.*
3. Ask Claude to change it ("blink twice as fast", "read a button on GP15"). *Done when: the program changes, and runs here.*
4. Open For real and do its steps on the board. *Done when: the real board does what it did here.*

Source: the Computer app (src/nexus/codesim.ts).

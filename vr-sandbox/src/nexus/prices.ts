// What things cost and where they are sold. Every price is a seller's own page, the figure it showed and the day it was
// seen. A price is a sighting, never a constant: Raspberry Pi raised every board that carries LPDDR4 twice in 2026 as
// memory rose (raspberrypi.com, "More memory-driven price rises", 2 February 2026; the 16 GB Pi 5 is $305 as seen here).
// Where no seller lists a price, it says so (Mecademic sells the Meca500 by quote) and gives what one was seen offered at,
// marked used. US sellers and US dollars, before tax; shipping only where the seller states it. Stock is said only where
// the seller's page said it; otherwise it was not checked.
// Owner of: what a thing costs, where to buy it, and which offer is cheapest for how many (src/nexus/buildpack.ts).

export interface Offer {
  /** what is sold, as the seller names it */ name: string;
  usd: number; /** pieces one buys at that price (a 25-pack of LEDs: 25) */ per?: number; /** fewest pieces sold at it */ min?: number;
  seller: string; url: string; /** the day it was seen, YYYY-MM-DD */ seen: string;
  /** in or out of stock where the seller's page said so */ stock?: 'in' | 'out';
  /** sold used, or only asked for (a listing, not a sale) */ cond?: 'used';
  /** what else must be had for it to work, by key (a Pinecil wants a USB-C PD supply) */ needs?: string[];
  note?: string;
}
export interface Price { /** what it is, plainly */ what: string; /** the inventory item it is, where the library keeps one */ item?: string; offers: Offer[] }

const D = '2026-10-09', D2 = '2026-10-10';
const pishop = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'PiShop.us (official Raspberry Pi reseller)', url: `https://www.pishop.us/product/${path}/`, seen: D, ...o });
const ada = (name: string, usd: number, pid: number, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'Adafruit', url: `https://www.adafruit.com/product/${pid}`, seen: D, ...o });
const lcsc = (name: string, usd: number, c: string, min: number, o: Partial<Offer> = {}): Offer => ({ name, usd, min, seller: 'LCSC', url: `https://www.lcsc.com/product-detail/${c}.html`, seen: D, note: `the price at ${min}+ pieces; it falls with more`, ...o });
const kb = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'KB-3D', url: `https://kb-3d.com/store/${path}`, seen: D2, ...o });
const zyl = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'ZYLtech Engineering', url: `https://www.zyltech.com/${path}`, seen: D2, ...o });
const pi5 = (gb: number, usd: number): [string, Price] => [`sbc-pi5-${gb}gb`, { what: `Raspberry Pi 5, ${gb} GB`, item: `sbc-pi5-${gb}gb`, offers: [pishop(`Raspberry Pi 5/${gb}GB`, usd, `raspberry-pi-5-${gb}gb`)] }];
const pi4 = (gb: number, usd: number): [string, Price] => [`sbc-pi4b-${gb}gb`, { what: `Raspberry Pi 4 Model B, ${gb} GB`, item: `sbc-pi4b-${gb}gb`, offers: [pishop(`Raspberry Pi 4 Model B/${gb}GB`, usd, `raspberry-pi-4-model-b-${gb}gb`)] }];

export const PRICES: Record<string, Price> = {
  // ---- boards --------------------------------------------------------------------------------------------------------
  ...Object.fromEntries([pi5(1, 45), pi5(2, 77.5), pi5(4, 110), pi5(8, 175), pi5(16, 305), pi4(1, 35), pi4(2, 67.5), pi4(4, 100), pi4(8, 165)]),
  'sbc-pizero2w-0.5gb': { what: 'Raspberry Pi Zero 2 W', item: 'sbc-pizero2w-0.5gb', offers: [pishop('Raspberry Pi Zero 2 W', 17.25, 'raspberry-pi-zero-2-w'), pishop('Raspberry Pi Zero 2 W with Header', 20.75, 'raspberry-pi-zero-2w-with-headers', { note: 'its 40-pin header soldered on: no soldering' })] },
  'pico-pico1': { what: 'Raspberry Pi Pico', item: 'pico-pico1', offers: [pishop('Raspberry Pi Pico (Non-Wireless)', 3.95, 'raspberry-pi-pico'), pishop('Raspberry Pi Pico H (Pre-Soldered Headers)', 5, 'raspberry-pi-pico-h-pre-soldered-headers', { note: 'headers soldered on: no soldering' })] },
  'pico-pico1w': { what: 'Raspberry Pi Pico W', item: 'pico-pico1w', offers: [pishop('Raspberry Pi Pico W', 6, 'raspberry-pi-pico-w'), pishop('Raspberry Pi Pico WH (Pre-Soldered Headers)', 7, 'raspberry-pi-pico-wh-pre-soldered-headers', { note: 'headers soldered on: no soldering' })] },
  'pico-pico2': { what: 'Raspberry Pi Pico 2', item: 'pico-pico2', offers: [pishop('Raspberry Pi Pico 2', 5, 'raspberry-pi-pico-2'), pishop('Raspberry Pi Pico 2 with Header', 6, 'raspberry-pi-pico-2-with-header', { note: 'headers soldered on: no soldering' })] },
  'pico-pico2w': { what: 'Raspberry Pi Pico 2 W', item: 'pico-pico2w', offers: [pishop('Raspberry Pi Pico 2 W', 7, 'raspberry-pi-pico-2-w'), pishop('Raspberry Pi Pico 2W with Header', 8, 'raspberry-pi-pico-2w-with-header', { note: 'headers soldered on: no soldering' })] },
  'sbc-rdkx5-4gb': { what: 'D-Robotics RDK X5, 4 GB', item: 'sbc-rdkx5-4gb', offers: [{ name: 'D-Robotics RDK X5 AI Developer Kit, 4GB', usd: 130, seller: 'DFRobot', url: 'https://www.dfrobot.com/product-2945.html', seen: D, stock: 'in' }] },
  'sbc-rdkx5-8gb': { what: 'D-Robotics RDK X5, 8 GB', item: 'sbc-rdkx5-8gb', offers: [{ name: 'D-Robotics RDK X5 (8GB, 10 TOPS)', usd: 190, seller: 'DFRobot', url: 'https://www.dfrobot.com/product-2945.html', seen: D }] },
  'sbc-opi5-8gb': { what: 'Orange Pi 5, 8 GB', item: 'sbc-opi5-8gb', offers: [{ name: 'Orange Pi 5 RAM 8GB', usd: 199, seller: 'OrangePi.net (distributor)', url: 'https://orangepi.net/product/orange-pi-5-ram-8gb', seen: D }] },
  'sbc-opi5-16gb': { what: 'Orange Pi 5, 16 GB', item: 'sbc-opi5-16gb', offers: [{ name: 'Orange Pi 5 16GB (Amazon listing)', usd: 335.99, seller: 'Amazon', url: 'https://www.amazon.com/Orange-Pi-4GB-Rockchip-Development/dp/B0GTYWLYDC', seen: D, note: 'as its listing showed in a search; not opened' }] },
  ...Object.fromEntries(['r3', 'r4'].map((r) => [`robotarm-meca500-${r}`, { what: `Mecademic Meca500 ${r.toUpperCase()}`, item: `robotarm-meca500-${r}`, offers: [
    { name: 'Mecademic Meca500 (used)', usd: 16425, seller: 'Vial Manufacturing, on LabX', url: 'https://www.labx.com/item/mecademic-meca500/scp-222223-d1bb64d8-0eab-4e79-8061-ea6c379c4d8a', seen: D, cond: 'used', note: 'Mecademic and its distributors (Electromate in North America) sell it new by quote only; no new price is published' },
    { name: 'Mecademic Meca500 (eBay listing)', usd: 17827, seller: 'eBay seller', url: 'https://www.ebay.com/itm/186243995072', seen: D, cond: 'used', note: 'an asking price, or best offer' },
  ] } satisfies Price])),
  // ---- what a Pi needs to run --------------------------------------------------------------------------------------------
  'pi-27w-psu': { what: 'USB-C power supply for a Pi 5 (5.1 V, 5 A)', offers: [pishop('Raspberry Pi 27W USB-C Power Supply White US', 12.95, 'raspberry-pi-27w-usb-c-power-supply-white-us', { note: 'Raspberry Pi\'s own; a Pi 5 on a weaker supply limits its USB ports' })] },
  'microsd-32gb': { what: 'microSD card, 32 GB', offers: [pishop('Sandisk Ultra MicroSDHC - 32GB - Class 10 - BLANK', 14.95, 'microsd-card-32-gb-class-10-blank'), pishop('Official Raspberry Pi microSD Card, A2, V30, 32GB - BLANK', 19.95, 'official-raspberry-pi-microsd-card-a2-v30-32gb-blank', { note: 'A2-rated: faster for an OS than a plain Class 10 card' })] },
  'pi5-cooler': { what: 'heat sink for a Pi 5', offers: [pishop('Passive Cooler for Raspberry Pi 5 - ED-Pi5PCOOLER', 5.95, 'passive-cooler-for-raspberry-pi-5-ed-pi5pcooler')] },
  'pi5-case': { what: 'case for a Pi 5', offers: [pishop('HighPi Pro 5H Case for Raspberry Pi 5', 10.95, 'highpi-pro-5h-case-for-raspberry-pi-5')] },
  // Raspberry Pi 5 Desktop Kits: a Pi 5, Raspberry Pi keyboard and mouse, 2 micro-HDMI to HDMI cables, the 27W supply, a
  // case, the Beginner's Guide and a 32GB card with its OS (the 2 GB kit as PiShop sells it adds an active cooler, an
  // Ethernet cable, a card reader, a webcam and a sleeve); a screen is in none (any TV with HDMI does)
  ...Object.fromEntries(([[2, 145], [4, 155.95], [8, 200.95], [16, 385]] as const).map(([gb, usd]) => [`pi5-desktop-kit-${gb}gb`, { what: `a whole computer to program on: Raspberry Pi 5 Desktop Kit, ${gb} GB`, offers: [pishop(`Raspberry Pi 5 Desktop Kit - ${gb}GB`, usd, `raspberry-pi-5-desktop-kit-${gb}gb`, { stock: 'out', note: gb === 2 ? 'with an active cooler, Ethernet cable, card reader, webcam and sleeve besides' : 'a screen is not in it (any TV with HDMI does)' })] } satisfies Price])),
  // ---- the bench -----------------------------------------------------------------------------------------------------
  'soldering-iron': { what: 'soldering iron', item: 'soldering-iron', offers: [
    ada('Adjustable 60W Pen-Style Soldering Iron - 120VAC USA Plug - BEST 102C', 19.95, 3685, { note: 'plugs into the wall: nothing else to buy' }),
    { name: 'PINECIL Smart Mini Portable Soldering Iron (Version 2)', usd: 25.99, seller: 'PINE64 store', url: 'https://pine64.com/product/pinecil-smart-mini-portable-soldering-iron/', seen: D, stock: 'in', needs: ['usbc-pd-65w'], note: 'community price ($35.99 retail); runs on USB-C PD 12-20 V 3 A or a 12-24 V barrel supply, which it does not come with; one short tip in the box' },
    ada('ATTEN 65-Watt Soldering Iron With Digital Adjustable Temperature - ST-2065D 110V', 37.5, 4695),
  ] },
  'usbc-pd-65w': { what: 'USB-C Power Delivery charger, 65 W', offers: [{ name: 'PinePower - 65W GaN 2C1A Charger with international plugs', usd: 29.99, seller: 'PINE64 store', url: 'https://pine64.com/product/pinepower-65w-gan-2c1a-charger-with-international-plugs/', seen: D, stock: 'in', note: 'retail price; 20 V 3.25 A on one USB-C port; no cable in the box (a USB-C to C cable rated 3 A does)' }] },
  'solder-leaded': { what: 'solder wire, tin-lead, rosin core', item: 'solder-wire', offers: [ada('Solder Wire - 60/40 Rosin Core - 0.5mm/0.02" diameter - 50 grams', 9.25, 1886, { note: 'sold as 60/40, but 63/37 since 2019 (its listing: Atten\'s TS-635050, 63 % tin, 37 % lead, rosin core); the easiest kind to work with (Adafruit\'s guide); lead: wash your hands after' })] },
  'solder-lead-free': { what: 'solder wire, lead-free', item: 'solder-wire', offers: [ada('Solder Wire - RoHS Lead Free - 0.5mm/.02" diameter - 50g', 12.5, 2473), ada('Solder Spool - 1/4 lb SAC305 RoHS lead-free / 0.031" rosin-core - 0.25 lb / 100 g', 29.95, 734)] },
  'flux-pen': { what: 'no-clean flux pen', item: 'fluxpen-cq4lf', offers: [ada('Chip Quik No-Clean Liquid Flux Pen - 10ml Pen w/ Tip - CQ4LF', 7.95, 3468)] },
  'tip-cleaner': { what: 'tip cleaner', offers: [ada('Square 60mm x 60mm Soldering Sponge - 3 Pack', 2.5, 3540, { note: 'used damp' }), ada('Hakko Brass Sponge Solder Tip Cleaner', 10.95, 1172, { note: 'dry: cools the tip less than a wet sponge' })] },
  'iron-stand': { what: 'soldering iron stand', offers: [ada('Soldering iron stand', 10.95, 150)] },
  'battery-holder-knife': { what: '2 × AA battery holder with knife switch', item: 'switchholder-3951', offers: [ada('2 x AA Battery Holder with Knife Switch', 0.95, 3951)] },
  'helping-hands': { what: 'helping hands with magnifier', offers: [ada('Helping Third Hand Magnifier W/Magnifying Glass Tool - MZ101', 6.95, 291)] },
  'solder-wick': { what: 'desoldering braid', offers: [ada('Solder wick - 1.5mm wide and 1.5m / 5 feet long', 3.5, 149)] },
  'flush-cutters': { what: 'flush cutters', item: 'pliers', offers: [ada('Flush diagonal cutters - CHP170', 7.25, 152)] },
  'wire-stripper': { what: 'wire stripper', offers: [ada('Multi-size wire stripper & cutter - 5023', 6.95, 147)] },
  'multimeter': { what: 'digital multimeter', item: 'multimeter', offers: [ada('Digital Multimeter - Model 9205B+', 17.5, 2034, { stock: 'out' }), ada('Pocket Autoranging Digital Multimeter', 24.95, 850, { stock: 'out' })] },
  'silicone-mat': { what: 'silicone work mat', offers: [ada('Insulated Silicone Rework Mat - 34cm x 23cm Work Surface - Blue', 9.95, 3536)] },
  'breadboard': { what: 'solderless breadboard', offers: [ada('Half Sized Premium Breadboard - 400 Tie Points', 4.95, 64), ada('Full Sized Premium Breadboard - 830 Tie Points', 5.95, 239)] },
  'jumper-wires': { what: 'jumper wires, male to male', offers: [ada('Premium Male/Male Jumper Wires - 20 x 6" (150mm)', 1.95, 1957, { per: 20 }), ada('Premium Male/Male Jumper Wires - 40 x 6" (150mm)', 3.95, 758, { per: 40 })] },
  'jumper-wires-ff': { what: 'jumper wires with a female end (for a Pi\'s header pins)', offers: [ada('Premium Female/Female Jumper Wires - 20 x 6" (150mm)', 1.95, 1950, { per: 20 }), ada('Premium Female/Male \'Extension\' Jumper Wires - 20 x 6"', 1.95, 1954, { per: 20, note: 'female at one end for a Pi\'s pins, male at the other for a breadboard' })] },
  'hookup-wire': { what: 'hook-up wire, 22 AWG solid', offers: [ada('Hook-up Wire Spool Set - 22AWG Solid Core - 6 x 25 ft', 15.95, 1311)] },
  'screwdriver': { what: 'precision screwdrivers', item: 'screwdriver', offers: [ada('Precision screwdriver set (6 pieces)', 7.95, 424)] },
  'hex-key': { what: 'metric hex keys', item: 'hex-key', offers: [ada('Rainbow Allen Wrench / Hex Key Set - Metric 9 Piece', 12.5, 5473)] },
  'm25-standoffs': { what: 'M2.5 screws and standoffs', item: 'standoff', offers: [ada('Black Nylon Machine Screw and Stand-off Set - M2.5 Thread', 16.95, 3299)] },
  'crimper': { what: 'crimp tool for small open-barrel contacts', offers: [ada('Universal Crimping Pliers - 1.6 to 2.5mm Size Contacts - PA-21', 49.95, 349, { note: 'check the contact\'s maker names this tool or its die size before buying' }), ada('Ratcheting Crimper Pliers - #18-28 AWG', 34.95, 1213, { note: 'its dies must fit the contact: check before buying' })] },
  'caliper-digital': { what: 'digital calipers', item: 'caliper-digital', offers: [ada('Solar Digital Calipers', 14.95, 3720)] },
  'heat-shrink': { what: 'heat-shrink tubing', offers: [ada('Pre-Cut Multi-Colored Heat Shrink Pack Kit - 280 pcs', 9.95, 4559)] },
  'tweezers': { what: 'fine tweezers', offers: [ada('Fine tip curved tweezers - ESD safe - 120mm', 3.95, 422)] },
  // ---- parts ---------------------------------------------------------------------------------------------------------
  'led-red-5mm-plain': { what: 'red LED, 5 mm, diffused, no resistor (for a circuit with its own: the Perma-Proto lesson\'s)', item: 'led-red-5mm', offers: [ada('Diffused Red 5mm LED (25 pack)', 4.0, 299, { per: 25, note: '660 nm, 1.85–2.5 V at 20 mA, 250 mcd (its listing): through a 330 Ω resistor on 5 V about 9 mA' })] },
  'led-red-5mm': { what: 'red LED, 5 mm', item: 'led-red-5mm', offers: [{ name: 'LED - Red with Resistor 5mm (25 pack)', usd: 12.5, per: 25, seller: 'SparkFun', url: 'https://www.sparkfun.com/led-red-with-resistor-5mm-25-pack.html', seen: D, stock: 'in', note: 'each with its resistor already on its lead' }] },
  'chipresistor-0603-1-10000': { what: '10 kΩ chip resistor, 0603, 1 %', item: 'chipresistor-0603-1-10000', offers: [lcsc('YAGEO RC0603FR-0710KL', 0.0034, 'C98220', 100)] },
  'mlcc-x7r-0805-1e-7-100': { what: '100 nF X7R capacitor, 0805, 100 V', item: 'mlcc-x7r-0805-1e-7-100', offers: [lcsc('Samsung CL21B104KCFNNNE', 0.0332, 'C28233', 50, { stock: 'out' })] },
  'regulator-ams1117-3.3': { what: 'AMS1117-3.3 regulator', item: 'regulator-ams1117-3.3', offers: [lcsc('Advanced Monolithic Systems AMS1117-3.3', 0.21, 'C6186', 5)] },
  'chip-rp2040-qfn-56': { what: 'RP2040 microcontroller', item: 'chip-rp2040-qfn-56', offers: [lcsc('Raspberry Pi RP2040', 0.9975, 'C2040', 1)] },

  // ---- what a 3D printer is made of -----------------------------------------------------------------------------------
  // (the parts a build pack kept listing with no price: a printer asked for whole came back fifteen lines of them. Every
  //  figure below is its seller's own page, read on the day said, and where a page did not show the figure itself it says so)
  nema17: { what: 'NEMA 17 stepper motor', offers: [
    zyl('Nema 17 Stepper Motor 1.5 A, 0.42 Nm, 59 ozin', 9.95, 'nema-17-stepper-motor-1-5-a-0-42-nm-59-ozin-1-3-or-5-pack', { note: 'the 42 × 40 mm motor an Ender-3 uses on all four axes (Creality\'s is 0.4 N·m at 1.5 A)' }),
    zyl('Nema 17 Stepper Motor 1.5 A, 0.42 Nm — 5-pack', 42.95, 'nema-17-stepper-motor-1-5-a-0-42-nm-59-ozin-1-3-or-5-pack', { per: 5, note: 'five at once, which is what a whole printer needs' }),
    zyl('Nema 17 Stepper Motor 1.7 A, 0.59 Nm, 84 ozin', 10.95, 'nema-17-stepper-motor-1-7-a-0-59-nm-84-ozin-1-3-or-5-pack', { note: 'more torque, for a bed or a direct-drive extruder' })] },
  hotend: { what: 'hot end', offers: [
    { name: 'E3D V6 All-Metal HotEnd 1.75mm 24V Full Kit - Direct Drive', usd: 61.46, seller: '3D Printing USA', url: 'https://3dprintingusa.com/products/official-e3d-v6-all-metal-hotend-1-75mm-24v-full-kit-direct-drive', seen: D2, note: 'as its listing showed in a search; the page itself did not show the figure when read, so check it before ordering' }] },
  extruder: { what: 'extruder', offers: [kb('Bondtech BMG Extruder', 80, 'bmg/280-bondtech-bmg-extruder-7350011410309.html', { stock: 'in', note: '3:1 dual-drive, for any NEMA 17 with a 5 mm shaft; its Bowden adapter is sold apart at $7.90' })] },
  'heated-bed': { what: 'heated bed', offers: [kb('LDO Motors Heated Bed for Switchwire / Prusa MK3 - Magnetic - 24V', 86.99, 'heated-bed-electronics/812-ldo-motors-heated-bed-for-switchwire-prusa-mk3-magnetic-24v-1677363868661.html', { note: 'complete: magnets for a flex plate, guide pins and its thermistor. The spring-steel plate itself is $21.99 beside it' })] },
  'printer-board': { what: 'printer control board', offers: [kb('BIGTREETECH SKR Mini E3 V3.0 32 Bit Control Board', 44.99, 'controllers-displays-drivers/420-bigtreetech-skr-mini-e3-v30-32-bit-control-board-1639888431041.html', { stock: 'in', note: 'STM32G0B1RET6, four TMC2209 drivers on the board; a drop-in for an Ender-3, and it runs Marlin or Klipper' })] },
  'psu-24v': { what: 'switching power supply, 24 V', offers: [kb('Mean Well LRS-350-24 Switching Power Supply - 24V - 350W', 38.99, 'power-supplies-converters/185-mean-well-lrs-350-24-switching-power-supply-24v-350w.html', { stock: 'in', note: '24 V at 14.6 A: a 350 W bed and a hot end with room over' })] },
  'gt2-belt': { what: 'GT2 belt (6 mm)', offers: [
    zyl('Steel-Reinforced GT2 T2 Timing Belt - 6mm', 2.4, 'steel-reinforced-gt2-t2-timing-belt-6mm', { note: 'the price for one metre, sent as one continuous length' }),
    kb('Gates PowerGrip 2GT Belt - Open - 6mm Width', 0.49, '49-motion', { note: 'Gates\' own, by the piece on its motion page; the length each piece is was not on the listing read' })] },
  'gt2-pulley': { what: 'GT2 pulley, 20 teeth', offers: [kb('Gates PowerGrip 2GT Pulley - 20 Tooth - 5mm - 6mm', 3.99, '49-motion', { note: '5 mm bore for a NEMA 17 shaft, 6 mm wide for the belt above; read off its motion page' })] },
  'pulley-gt2-20t-5': { what: 'GT2 pulley, 20 teeth, 5 mm bore', offers: [kb('Gates PowerGrip 2GT Pulley - 20 Tooth - 5mm - 6mm', 3.99, '49-motion', { note: 'read off its motion page' })] },
  'rail-mgn12h-400': { what: 'MGN12H rail, 400 mm, with its carriage', offers: [kb('KB3D MGN12H Linear Rail / Guide - With Carriage - 400mm', 35.99, 'motion/384-kb3d-linear-rail-guide-kit-trident-350mm.html', { note: 'the figure its own kit pages list for the 400 mm length; the rail\'s page sells every length from one listing' })] },
  'bearing-625': { what: 'ball bearing 625 (5 × 16 × 5)', offers: [kb('5x16x5 Metric Ball-Bearing - 625-RS', 1.19, '49-motion', { note: 'rubber sealed; read off its motion page' })] },
  'heater-cartridge': { what: 'cartridge heater', offers: [
    kb('Generic Heater Cartridge - 24V - 40W', 4.29, 'heaters-thermistors/3663-generic-heater-cartridge-24v-40w-1740625556153.html', { stock: 'in', note: '6 × 20 mm, bare leads, 1 m of wire: the size a V6 or an MK8 block takes' }),
    kb('E3D 24V 40W Heater Cartridge', 18.99, 'heaters-thermistors/175-e3d-24v-40w-heater-cartridge-1644021678917.html', { note: 'E3D\'s own, ferruled' })] },
  'thermistor-ntc': { what: 'NTC thermistor (100 kΩ)', offers: [kb('E3D Thermistor Cartridge - Temperature Sensor', 4.99, '68-heaters-thermistors', { note: 'read off its heaters page; a PT1000 is $18.99 and a PT100 $16.99 beside it' })] },
  'fan-30': { what: 'fan, 30 mm', offers: [
    kb('3010 Ball Bearing Cooling Fan / 24V / Axial', 6.49, 'fans/571-3010-ball-bearing-cooling-fan-24v-axial-1654721311496.html', { stock: 'in', note: '30 × 30 × 10 mm, 4.7 CFM, 0.15 A, on a JST-XH lead: the fan that blows over a hot end\'s heat sink' }),
    kb('3010 Ball Bearing Blower Fan / 24V', 5.99, 'fans/3-3010-ball-bearing-blower-fan-24v.html', { note: 'the blower, for the part-cooling duct' })] },
  'jst-xh': { what: 'JST XH connector (2.5 mm)', offers: [kb('JST-XH Connector Kit - 195 Pieces', 15.99, '5-electronics?page=3', { per: 195, note: 'housings, headers and crimps in one box; read off its electronics page' })] },
  'coupling-flex': { what: 'flexible shaft coupling 5 × 8', offers: [
    zyl('Aluminum Flexible Shaft Coupler - 5/8', 2.95, 'flexible-plum-coupler-shaft-various-combinations-from-5mm-to-12-7mm', { note: 'the helical-cut aluminium one, 5 mm motor shaft to 8 mm lead screw; read beside the plum coupler, which is $3.95 and up' })] },

  // ---- what a quadcopter is made of -----------------------------------------------------------------------------------
  'bldc-outrunner': { what: 'brushless outrunner motor', offers: [
    { name: 'Headsup | FIVE33 2207 Motor w/ MR30 (1960 Kv)', usd: 23.97, seller: 'RaceDayQuads', url: 'https://www.racedayquads.com/products/headsup-five33-2207-motor-w-mr30', seen: D2, stock: 'in', note: '2207 stator, 28.4 g: the size a 5-inch quadcopter flies on. Four are wanted' }] },
  'pack-lipo-4s': { what: 'LiPo pack 4S', offers: [
    { name: 'CNHL MINISTAR 1500mAh 14.8V 4S 120C', usd: 25.99, seller: 'Pyrodrone', url: 'https://pyrodrone.com/products/cnhl-ministar-1500mah-14-8v-4s-120c-lipo-battery', seen: D2, note: '189 g with its leads; 120C continuous. Batteries ship by ground only, and not outside the United States' },
    { name: 'RDQ Series 14.8V 4S 1500mAh 100C LiPo - XT60', usd: 32.49, seller: 'RaceDayQuads', url: 'https://www.racedayquads.com/products/rdq-series-14-8v-4s-1500mah-100c-lipo-battery-xt60', seen: D2, note: 'measured at 60 A continuous and 80 A pulse in Bardwell\'s tests, which the seller publishes' }] },
  // ---- the machines a works is made of (src/nexus/works.ts) ----------------------------------------------------------
  'printer-fff': { what: 'FFF 3D printer', offers: [
    { name: 'Creality Ender-3 V3 SE', usd: 179, seller: 'MatterHackers', url: 'https://www.matterhackers.com/store/l/creality-ender-3-v3-se-3d-printer/sk/M5EYNWU0', seen: D2, note: '220 × 220 × 250 mm, 0.4 mm nozzle; the cheapest machine that makes its own fixtures, jigs and patterns, which is most of what it is for' }] },
  'cnc-benchtop': { what: 'benchtop CNC router/mill', offers: [
    { name: 'Genmitsu 3018-PRO Desktop CNC Router DIY Kit', usd: 149, seller: 'SainSmart', url: 'https://www.sainsmart.com/products/sainsmart-genmitsu-cnc-router-3018-pro-diy-kit', seen: D2, note: '300 × 180 × 45 mm; wood, acrylic and soft aluminium in light cuts. The cheapest way to hold a flat face and a bored hole, which no printer does' },
    { name: 'Genmitsu 3018-PROVer V2, semi-assembled', usd: 269, seller: 'SainSmart', url: 'https://www.sainsmart.com/products/genmitsu-3018-prover-v2-upgraded-semi-assembled-cnc-router-kit', seen: D2, note: 'the same envelope in a stiffer frame with limit switches and an emergency stop' }] },
  'welder-fluxcore': { what: 'flux-core/MIG welder', offers: [
    { name: 'TITANIUM 125 Amp Easy Flux-Core Inverter Welder, 120V', usd: 149.99, seller: 'Harbor Freight', url: 'https://www.harborfreight.com/search?category=2291&q=titanium', seen: D2, note: '120 V, up to 3/16 in; read off its search listing. Flux core needs no gas bottle, which is what makes it the cheapest way to join steel' }] },
  'lathe-mini': { what: 'benchtop metal lathe', offers: [
    { name: 'CENTRAL MACHINERY 7 in. x 10 in. Precision Benchtop Mini Lathe (93212)', usd: 729.99, seller: 'Harbor Freight', url: 'https://www.harborfreight.com/7-inch-x-10-inch-precision-mini-lathe-93212.html', seen: D2, stock: 'in', note: 'read off its own listing and the lathes category page; 180 mm swing over the bed, 250 mm between centres, 2500 rev/min, 120 V. The cheapest new machine that makes a round part a bearing will sit on, and the only station in a cheap works that does' }] },
  'xiao-esp32c3': { what: 'BLE-UART bridge board', offers: [
    { name: 'Seeed Studio XIAO ESP32C3', usd: 4.99, seller: 'Seeed Studio', url: 'https://www.seeedstudio.com/Seeed-XIAO-ESP32C3-p-5431.html', seen: D2, stock: 'in', note: 'Seeed\'s own price; $13.49 for three, so $4.50 each. 2.4 GHz wifi and Bluetooth LE on a 21 \u00d7 17.5 mm board: this is the part that turns a printer\'s serial header into the Nordic UART service a browser can reach (link.ts)' }] },
  'rc-receiver': { what: 'radio receiver', offers: [
    { name: 'RadioMaster DBR4 Dual-band Xross Gemini ExpressLRS Receiver', usd: 38.99, seller: 'Pyrodrone', url: 'https://pyrodrone.com/collections/receivers', seen: D2, note: 'read off its receivers page; ExpressLRS, so it binds to any ELRS handset' }] },
};

/** What n of it would cost by one offer: how many packs (the seller's least taken), and the money, with what it needs
 *  that is not had (its cost carried in). */
export function costBy(o: Offer, n: number, has: (key: string) => boolean = () => false): { packs: number; usd: number; needs: { key: string; offer: Offer; usd: number }[] } {
  const per = o.per ?? 1, packs = Math.max(Math.ceil(n / per), Math.ceil((o.min ?? 1) / per));
  const needs = (o.needs ?? []).filter((k) => !has(k)).flatMap((k) => { const b = cheapest(k, 1, has); return b ? [{ key: k, offer: b.offer, usd: b.usd }] : []; });
  return { packs, usd: +(packs * o.usd + needs.reduce((a, x) => a + x.usd, 0)).toFixed(4), needs };
}

/** The cheapest way to have n of a thing: among its offers, those in stock (or not said) first, new before used, then by
 *  what n costs with what each needs that is not had. Null when nothing is priced for it. */
export function cheapest(key: string, n = 1, has: (key: string) => boolean = () => false): { offer: Offer; packs: number; usd: number; needs: { key: string; offer: Offer; usd: number }[]; others: Offer[] } | null {
  const p = PRICES[key]; if (!p?.offers.length) return null;
  const rank = (o: Offer) => (o.stock === 'out' ? 2 : 0) + (o.cond === 'used' ? 1 : 0);
  const all = p.offers.map((o) => ({ o, ...costBy(o, n, has) })).sort((a, b) => rank(a.o) - rank(b.o) || a.usd - b.usd);
  const b = all[0]!;
  return { offer: b.o, packs: b.packs, usd: b.usd, needs: b.needs, others: all.slice(1).map((x) => x.o) };
}

/** The key a library item is priced under, if any (an item's own id, else the price that names it as its item). */
export function priceKeyOf(item: string): string | null {
  if (PRICES[item]) return item;
  return Object.keys(PRICES).find((k) => PRICES[k]!.item === item) ?? null;
}

/** Money, as a person reads it: $0.0034 for a resistor, $1.95, $16,425. */
export const usd = (x: number): string => x >= 1000 ? `$${Math.round(x).toLocaleString('en')}` : x >= 1 || x === 0 ? `$${x.toFixed(2)}` : `$${+x.toPrecision(2)}`;

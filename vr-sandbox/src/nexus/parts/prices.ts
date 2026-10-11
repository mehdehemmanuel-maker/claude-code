// What things cost and where they are sold. Every price is a seller's own page, the figure it showed and the day it was
// seen. A price is a sighting, never a constant: Raspberry Pi raised every board that carries LPDDR4 twice in 2026 as
// memory rose (raspberrypi.com, "More memory-driven price rises", 2 February 2026; the 16 GB Pi 5 is $305 as seen here).
// Where no seller lists a price, it says so (Mecademic sells the Meca500 by quote) and gives what one was seen offered at,
// marked used. US sellers and US dollars, before tax; shipping only where the seller states it. Stock is said only where
// the seller's page said it; otherwise it was not checked.
// Owner of: what a thing costs, where to buy it, and which offer is cheapest for how many (src/nexus/teach/buildpack.ts).

export interface Offer {
  /** what is sold, as the seller names it */ name: string;
  usd: number; /** pieces one buys at that price (a 25-pack of LEDs: 25) */ per?: number; /** fewest pieces sold at it */ min?: number;
  seller: string; url: string; /** the day it was seen, YYYY-MM-DD */ seen: string;
  /** in or out of stock where the seller's page said so */ stock?: 'in' | 'out';
  /** sold used, or only asked for (a listing, not a sale) */ cond?: 'used';
  /** what else must be had for it to work, by key (a Pinecil wants a USB-C PD supply) */ needs?: string[];
  /** the seller's own number for it, which is what you type into their site to order the same thing twice */ sku?: string;
  /** how many the seller's page said were on the shelf, where it said a number rather than a word */ onHand?: number;
  /** working days the seller says it takes to come from the factory, where it says */ leadDays?: number;
  /** the seller's own break table: what it costs at other quantities. A price at one quantity is not a price curve,
   *  and a bill that buys 100 of something is charged the wrong figure without this. */
  breaks?: { n: number; usd: number }[];
  note?: string;
}
export interface Price {
  /** what it is, plainly */ what: string;
  /** the inventory item it is, where the library keeps one */ item?: string;
  offers: Offer[];
  /** the maker and its own part number. A seller's product title is not an identity - two sellers write the same part
   *  three ways - so this is the only field by which an offer here and an offer anywhere else are the same thing. */
  maker?: string; mpn?: string;
  /** the maker's own sheet, where the figures come from */ datasheet?: string;
  /** where it is in its life. Being told to buy a part that is out of production is worse than being told it has no
   *  price: the first wastes an order, the second only wastes a decision. */
  life?: 'active' | 'new' | 'not-recommended' | 'obsolete';
  /** other keys here that do the same job, if this one cannot be had */ instead?: string[];
}

const D = '2026-10-09', D2 = '2026-10-10', D3 = '2026-10-11';
const pishop = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'PiShop.us (official Raspberry Pi reseller)', url: `https://www.pishop.us/product/${path}/`, seen: D, ...o });
const ada = (name: string, usd: number, pid: number, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'Adafruit', url: `https://www.adafruit.com/product/${pid}`, seen: D, ...o });
const lcsc = (name: string, usd: number, c: string, min: number, o: Partial<Offer> = {}): Offer => ({ name, usd, min, seller: 'LCSC', url: `https://www.lcsc.com/product-detail/${c}.html`, seen: D, note: `the price at ${min}+ pieces; it falls with more`, ...o });
const kb = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'KB-3D', url: `https://kb-3d.com/store/${path}`, seen: D2, ...o });
const zyl = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'ZYLtech Engineering', url: `https://www.zyltech.com/${path}`, seen: D2, ...o });
// the stock and hardware sellers the bills' own lines are priced from (2026-10-11). A figure read off one of these
// sellers' own pages says nothing extra; a figure read off a search result says SEARCHED, which is the whole of the
// difference between a price and a rumour.
const SEARCHED = 'read off a search listing, not the seller\'s own page';
const sm = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'Speedy Metals', url: `https://www.speedymetals.com/${path}`, seen: D3, ...o });
const om = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'OnlineMetals', url: `https://www.onlinemetals.com/en/buy/${path}`, seen: D3, ...o });
const hd = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'The Home Depot', url: `https://www.homedepot.com/p/${path}`, seen: D3, note: SEARCHED, ...o });
const zoro = (name: string, usd: number, path: string, o: Partial<Offer> = {}): Offer => ({ name, usd, seller: 'Zoro', url: `https://www.zoro.com/${path}`, seen: D3, note: SEARCHED, ...o });
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
  // ---- fasteners, by the thread the bill says ------------------------------------------------------------------------
  // A bill says "M8 × 30 bolt and nut" and the only word of that a price book can be found by is "M8", so each thread
  // is one entry and every length the bills ask for is an offer in it. `cheapest` then takes the lowest, which is the
  // right fastener where the lengths are listed and the nearest one where they are not — said in each note, because a
  // bolt 10 mm longer is cents and a bolt of the wrong thread is useless. Nuts and washers are extra on every one of
  // these listings, which is how fasteners are sold: the pack is the screw. So a bill line that is a nut or a washer
  // alone ("nut M8 lock", "springwasher M4") is charged its thread's screw pack, which is the thread right and the
  // part wrong — the lookup has only the thread to go on, and saying so beats a figure nobody can trace.
  m4: { what: 'M4 stainless screws and nuts, 50 mm', offers: [
    zoro('ZORO SELECT M4-0.70 Socket Head Cap Screw, Plain 18-8 Stainless Steel, 50 mm Length, 50 PK', 7.15, 'zoro-select-m4-070-socket-head-cap-screw-socket-plain-18-8-stainless-steel-50-mm-length-50-pk-m510500400050/i/G5346345/', { per: 50, note: `${SEARCHED}: $0.14 each in a 50-pack. The kiln's element terminal is a stainless post and nuts, and this is the stainless screw that stands as that post; its nuts are extra` })] },
  m6: { what: 'M6 screws and nuts, 20 mm, zinc-plated steel', offers: [
    zoro('ZORO SELECT M6-1.00 Socket Head Cap Screw, Zinc Plated Steel, 20 mm Length, 100 PK', 4.99, 'zoro-select-m6-100-socket-head-cap-screw-socket-zinc-plated-steel-20-mm-length-100-pk-m071600600020/i/G2650649/', { per: 100, note: `${SEARCHED}: $0.05 each in a 100-pack. The length the gearbox's cover screws are, exactly; nuts are extra` })] },
  m8: { what: 'M8 bolts and nuts, 25 to 40 mm, zinc-plated steel', offers: [
    zoro('ZORO SELECT M8-1.25 Socket Head Cap Screw, Zinc Plated Steel, 40 mm Length, 100 PK', 17.99, 'zoro-select-m8-125-socket-head-cap-screw-socket-zinc-plated-steel-40-mm-length-100-pk-m071600800040/i/G0410280/', { per: 100, note: `${SEARCHED}: $0.18 each in a 100-pack. The 40 mm is the spot welder's own length and the nearest listed one to the 25 and 30 mm the forge, the furnace and the wheel ask for (the 60 mm is listed at the same page's G0305299); a socket head where the bills say hex; nuts are extra` })] },
  m10: { what: 'M10 bolts, nuts and washers, 40 to 60 mm, zinc-plated steel', offers: [
    zoro('ZORO SELECT M10-1.50 Socket Head Cap Screw, Zinc Plated Steel, 40 mm Length, 50 PK', 13.39, 'zoro-select-m10-150-socket-head-cap-screw-socket-zinc-plated-steel-40-mm-length-50-pk-m071601000040/i/G1941838/', { per: 50, note: `${SEARCHED}: $0.27 each in a 50-pack, and the length the bench's sixteen top bolts are` }),
    zoro('ZORO SELECT M10-1.50 Socket Head Cap Screw, Zinc Plated Steel, 50 mm Length, 50 PK', 30.39, 'zoro-select-m10-150-socket-head-cap-screw-socket-zinc-plated-steel-50-mm-length-50-pk-m071601000050/i/G0410247/', { per: 50, note: `${SEARCHED}: $0.61 each in a 50-pack. A socket head where the bills say hex, which is the nearest listed M10 × 50 fastener and costs the same; nuts are extra. No zinc-plated M10 × 60 was listed at all — the brake's six are charged the 40 mm figure above, and the only 60 mm this seller showed is a 316 stainless one at $33.29 each` })] },
  'bench-vice': { what: 'a 100 mm (4 in) cast-iron bench vice', item: 'benchvice', maker: 'WEN', mpn: 'BV454', life: 'active', offers: [
    { name: 'SEBLAFF 4" Bench Vise with Anvil', usd: 32.89, seller: 'Walmart', url: 'https://www.walmart.com/', seen: D3, note: 'read off a search listing, not the seller\'s own page: the cheapest 100 mm vice seen. Sealey\'s own CV100E, the vice drawn in the library, lists at \u00a349.95 (about $63) and is the one whose four figures the drawing uses' },
    { name: 'WEN 4 in. Heavy-Duty Cast Iron Bench Vise with Swivel Base (BV454)', usd: 46.23, seller: 'The Home Depot', url: 'https://www.homedepot.com/p/WEN-4-in-Heavy-Duty-Cast-Iron-Bench-Vise-with-Swivel-Base-BV454/321729726', seen: D3, note: 'the maker is WEN and the model BV454, on its own product page; 2,440 lb (10.9 kN) clamping force and a swivel base. The $57.38 this line carried was read off a search listing and was wrong by $11.15, which is what finding it a page of its own was for' }] },
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
  'welder-fluxcore': { what: 'flux-core/MIG welder', maker: 'Harbor Freight (TITANIUM)', mpn: '57861', life: 'active', offers: [
    { name: 'TITANIUM 125 Amp Easy Flux-Core Inverter Welder, 120V', usd: 149.99, seller: 'Harbor Freight', url: 'https://www.harborfreight.com/125-amp-easy-flux-core-welder-57861.html', seen: D3, note: '120 V, up to 3/16 in, 15 lb; item 57861. Its own product page renders its price in JavaScript and reads empty to anything but a browser, so the figure is the one Harbor Freight\'s own flux-welders category page shows. Flux core needs no gas bottle, which is what makes it the cheapest way to join steel' }] },
  'lathe-mini': { what: 'benchtop metal lathe', offers: [
    { name: 'CENTRAL MACHINERY 7 in. x 10 in. Precision Benchtop Mini Lathe (93212)', usd: 729.99, seller: 'Harbor Freight', url: 'https://www.harborfreight.com/7-inch-x-10-inch-precision-mini-lathe-93212.html', seen: D2, stock: 'in', note: 'read off its own listing and the lathes category page; 180 mm swing over the bed, 250 mm between centres, 2500 rev/min, 120 V. The cheapest new machine that makes a round part a bearing will sit on, and the only station in a cheap works that does' }] },
  'xiao-esp32c3': { what: 'BLE-UART bridge board', offers: [
    { name: 'Seeed Studio XIAO ESP32C3', usd: 4.99, seller: 'Seeed Studio', url: 'https://www.seeedstudio.com/Seeed-XIAO-ESP32C3-p-5431.html', seen: D2, stock: 'in', note: 'Seeed\'s own price; $13.49 for three, so $4.50 each. 2.4 GHz wifi and Bluetooth LE on a 21 \u00d7 17.5 mm board: this is the part that turns a printer\'s serial header into the Nordic UART service a browser can reach (link.ts)' }] },
  'level-shifter': { what: 'logic level converter, 3.3 V to 5 V', offers: [
    { name: '4-channel I2C-safe Bi-directional Logic Level Converter - BSS138', usd: 3.95, seller: 'Adafruit', url: 'https://www.adafruit.com/product/757', seen: D3, stock: 'in', note: 'read off Adafruit\u2019s own category pages (Breakout Boards, Raspberry Pi); four channels, open-drain with 10k pull-ups, so it carries a UART as well as I\u00b2C. Needed only where the controller\u2019s logic is 5 V' }] },
  'rc-receiver': { what: 'radio receiver', offers: [
    { name: 'RadioMaster DBR4 Dual-band Xross Gemini ExpressLRS Receiver', usd: 38.99, seller: 'Pyrodrone', url: 'https://pyrodrone.com/collections/receivers', seen: D2, note: 'read off its receivers page; ExpressLRS, so it binds to any ELRS handset' }] },

  // ---- stock, bought by the length, the sheet or the brick and cut here (the STOCK list in works/lines.ts) ----------
  // Every one of these is a line of a real bill that priced at nothing until now, and each is keyed on the word the
  // bill itself uses ("box section", "round bar", "plate", "sheet", "angle"), because that is all `priceOfLine` has to
  // go on. Two rules, said once here rather than in forty notes:
  //  - one length to a piece. The figure is a single cut length as the seller cuts it, so a line of n pieces is charged
  //    n lengths: the offcut is paid for with the piece. Where the bill's piece is LONGER than the length sold, the
  //    note says so, because that line is then charged short and a reader has to know it.
  //  - the US stock size, named. The bills are metric and US stock is not: 40 × 40 × 2 box section is bought as
  //    1 1/2 in × .083 in (38.1 × 38.1 × 2.1), 50 × 50 × 6 angle as 2 × 2 × 1/4. Each note says which size the figure
  //    is for and how far it is from the bill's.
  section: { what: '40 × 40 × 2 mm steel box section, as a bench, a forge stand and a wheel\'s legs and rails take it', offers: [
    om('1 1/2" X .083" Carbon Steel Square Tube A500/A513, 36 in', 24.2, 'carbon-steel/1-1-2-inch-x-083-inch-carbon-steel-square-tube-a500-a513/pid/mp-00064366', { note: '38.1 × 38.1 × 2.1 mm: the nearest US stock size to the bills\' 40 × 40 × 2, and the same wall to a tenth of a millimetre. One 36 in (914 mm) length, the 12 in being $10.76 and the 72 in $41.95 on the same page — so the bench\'s 1,420 mm long rail is two of these, and is charged one. The spot welder\'s 20 × 20 × 2 lever is priced here too and is charged this heavier section' })] },
  'box-25': { what: '25 × 25 × 2 mm steel box section: a kart\'s frame tube', offers: [
    om('1" X .083" Carbon Steel Square Tube A500/A513, 36 in', 15.8, 'carbon-steel/1-inch-x-083-inch-carbon-steel-square-tube-a500-a513/pid/mp-00064364', { note: '25.4 × 25.4 × 2.1 mm, which is the bills\' 25 × 25 × 2 to a tenth of a millimetre; 36 in (914 mm) is the kart\'s own 900 mm tube, one length to a tube. In stock, 86 lengths, shipping from Mesa, Arizona' })] },
  angle: { what: 'mild steel angle: 50 × 50 × 6 for a sheet brake\'s bed, clamp and leaf, 25 × 25 × 3 for a kiln or a welder frame', offers: [
    sm('1/8" x 1" x 1" A-36 Steel Angle, Hot Rolled, 36 in', 5.44, 'p-3930-1-x-1-x-18-angle-a-36-1020-hot-rolled-steel.aspx', { note: '25.4 × 25.4 × 3.2 mm for the bills\' 25 × 25 × 3: the kiln\'s frame and the spot welder\'s. One 36 in length a piece, which is the kiln\'s 330 and 350 mm uprights and rails with offcut to spare; by the inch it is $0.15' }),
    sm('1/4" x 2" x 2" A-36 Steel Angle, Hot Rolled, 36 in', 19.14, 'p-3947-2-x-2-x-14-angle-a-36-1020-hot-rolled-steel.aspx', { note: '50.8 × 50.8 × 6.35 mm for the bills\' 50 × 50 × 6: the brake\'s three 600 mm angles, whose own length is the 24 in at $14.35. This is the offer to read for them — `cheapest` takes the lighter section above, so those three lines are charged it' })] },
  round: { what: 'round bar, mild steel, 10 and 12 mm: a hinge pin, a lifting ring, a tong arm, a lid handle', offers: [
    sm('3/8" Rd Cold Finished 1018, 36 in', 7.72, 'p-25-18r375.aspx', { note: '9.53 mm for the bills\' 10 mm. One 36 in length a piece: the furnace\'s 900 mm lifting ring exactly, and four of the brake\'s 70 mm hinge pins out of one (the 12 in is $3.06)' }),
    sm('1/2" Rd Cold Finished 1018, 36 in', 10.36, 'p-27-18r5.aspx', { note: '12.7 mm for the bills\' 12 mm: the furnace\'s two 600 mm tong arms. `cheapest` takes the 3/8 in above, so the tong arms are charged that; this is their own figure' })] },
  shaft: { what: 'round bar, 25 mm: a potter\'s wheel shaft, a gearbox input shaft', offers: [
    sm('1" Rd Cold Finished 1018, 36 in', 26.75, 'p-35-18r1.aspx', { note: '25.4 mm for the bills\' 25 mm, and cold-finished, which is what a bearing seat is turned from. One 36 in length a piece: the wheel\'s 500 mm shaft and the gearbox\'s 160 mm one each come out of one (the 12 in is $9.99)' })] },
  plate: { what: 'steel plate and flat, 3 to 8 mm: a foot pad, a hinge lug, a bearing plate, a base plate, a gasket-face cover', offers: [
    sm('1/4" x 2" A-36 Steel Flat, Hot Rolled, 12 in', 5.1, 'p-4049-14-x-2-a-36-1020-hot-rolled-steel.aspx', { per: 4, note: '6.35 mm for the bills\' 6 mm, 50.8 mm wide against their 60: one 12 in length makes four of the bench\'s 60 × 60 foot pads or the brake\'s four 60 × 40 hinge lugs, hence `per` 4 (the 36 in is $10.20). Lines charged this that are not it, because "plate" is all the words give the lookup: the wheel\'s 160 × 160 bearing plate is wider than the flat (it is cut from the sheet below), the gearbox\'s 180 × 120 × 8 cover is aluminium (5/16 in 6061, which this seller lists apart), and a printer\'s bed plate — a Voron\'s 10 in MIC6 — is a $60 cast-and-ground plate charged a $5 off-cut here' })] },
  sheet: { what: 'mild steel sheet, 1.5 to 2 mm: a seat pan, a splash pan, a control box, an enclosure', offers: [
    om('14 Gauge (0.075") Carbon Steel Sheet ASTM A1011 Hot Rolled, 12 × 24 in', 19.93, 'carbon-steel/14-ga-0-075-carbon-steel-sheet-a569-astm-a1011-hot-rolled/pid/10272', { note: '1.9 mm for the bills\' 2 mm. The 12 × 24 in piece folds the kiln\'s control box and the welder\'s enclosure; the kart\'s 420 × 380 seat pan and the wheel\'s 520 mm splash pan want the 24 × 24 in at $33.81 on the same page, and are charged this. 16 gauge (1.5 mm) is the boxes\' own thickness: the same seller\'s part 9900' })] },
  flat: { what: 'flat bar, 40 × 4 mm: a forge cradle\'s bearer', offers: [
    sm('3/16" x 1-1/2" Hot Rolled Commercial Quality Steel Flat, 24 in', 4.21, 'p-4030-316-x-1-12-hot-rolled-commercial-quality-steel.aspx', { note: `${SEARCHED}: 4.8 × 38.1 mm for the bills' 40 × 4. One 24 in (610 mm) length a bearer, which is the forge's own 420 mm with the cut; the 36 in is listed at $5.61 and by the inch at $0.16` })] },
  'tube-20': { what: 'steel round tube, 20 mm by 2 mm wall: a brake leaf\'s handle', offers: [
    sm('3/4" OD x .065" Wall DOM Steel Tube, 18 in', 18.56, 'p-3427-34-od-x-065-wall-dom-steel-tube.aspx', { note: `${SEARCHED}: 19.05 mm OD, 1.65 mm wall, for the bills' 20 × 2. One 18 in (457 mm) length is the brake's 400 mm handle; the 12 in is listed at $14.14 and the 24 in at $22.63` })] },
  birch: { what: 'birch plywood, 19 mm: a bench top, a wheel head, a ply pulley disc', offers: [
    hd('Falken Design 3/4 in. x 2 ft. x 4 ft. Birch Plywood Project Panel', 41.62, 'Falken-Design-3-4-in-x-2-ft-x-4-ft-Birch-Plywood-Project-Panel-FALKENDESIGN-PW-Birch-B3-3-4-2448/319137372', { note: `${SEARCHED}: 19 mm against the bills' 25 mm, which is the thickest birch panel this seller listed, and 610 × 1,220 mm. The wheel's 300 mm head and its 240 mm ply pulley come out of one panel each; the bench's 1,500 × 700 top does not — it is longer than the panel is wide and wants a full 4 × 8 ft sheet, whose figure the listing read did not show` })] },
  carbon: { what: 'carbon fibre plate, 2 to 4 mm: a quadcopter\'s unibody and its top deck', offers: [
    { name: 'DragonPlate EconomyPlate Carbon Fiber Sheet, 1/8" x 12" x 12" (texture/texture)', usd: 96.58, seller: 'DragonPlate', url: 'https://tools.dragonplate.com/category/18-economy-carbon-fiber-sheets', seen: D3, note: `${SEARCHED}, off its own 1/8 in category listing: 3.2 mm, between the bills' 4 mm unibody and 2 mm deck, and a 12 × 12 in sheet holds both (220 × 180 and 90 × 80). The matte face is $101.08 and the gloss $104.08; the 1/16 in and 5 mm sheets are the sizes either side` }] },
  copper: { what: 'copper bar and rod, C110: a spot welder\'s arms and its electrodes', offers: [
    sm('3/8" Rd CA 110 Copper, 12 in', 10.07, 'p-2941-38-rd-ca-110-copper.aspx', { note: `${SEARCHED}: 9.53 mm for the bills' 10 mm electrode rod, and one 12 in length makes both of the welder's 80 mm electrodes with plenty over. The 36 in is listed at $24.17. A line whose only copper word is "copper" (an Ender's copper hot-end cover) is charged this rod and is not it` }),
    sm('1/4" x 3/4" CA 110 Copper Flat, 12 in', 22.8, 'p-2883-14-x-34-ca-110-copper.aspx', { note: `${SEARCHED}: 6.35 × 19.05 mm for the bills' 20 × 6 arm bar, one 12 in length an arm (the welder's is 180 mm). \`cheapest\` takes the rod above, so the two arms are charged it; this is their own figure, and the 24 in is $38.40` })] },

  // ---- what a forge, a furnace and a kiln are lined and fired with --------------------------------------------------
  firebrick: { what: 'K23 insulating firebrick, 229 × 114 × 64 mm, whole or sawn: a kiln\'s wall, its offcut, its floor and lid packer, a forge\'s floor split', offers: [
    { name: 'K23 Insulating Firebrick 9 x 4.5 x 2.5 Thermal Ceramics 2300F, case of 24', usd: 193.57, per: 24, seller: 'an eBay seller in Hesperia, California', url: 'https://www.ebay.com/itm/202269160961', seen: D3, note: `${SEARCHED}: $8.07 a brick in a case of 24; delivery is stated apart at $118.58. A box of 12 was listed at $101.88 and a 4-pack at Walmart at $19.49 a brick. One case covers all four of the kiln's brick lines — its offcuts and packers are sawn off the same bricks as its walls, so each of those lines is charged a case here and the kiln really buys one. The forge's floor is a 32 mm split, half this brick's thickness, and is charged a whole one` }] },
  ceramic: { what: 'ceramic fibre blanket, 25 mm, 2,300 °F: a forge\'s lining', offers: [
    { name: 'OSCO Ceramic Fiber Blanket Roll, 1" thick x 24" x 25 ft (50 sq ft), 2300 °F', usd: 170.73, seller: 'Oswald Supply', url: 'https://oswaldsupply.com/products/1-thick-48-width-ceramic-fiber-blanket-50-sq-ft-roll', seen: D3, note: `${SEARCHED}, shown in stock: the roll is the smallest form this seller listed, and the forge's 50 mm lining is two layers over about 1 m² of it — a sixth of the roll, charged whole, because a sixth of a roll is not a thing you can buy` }] },
  rigidised: { what: 'rigidised refractory coating over a fibre lining', offers: [
    { name: 'ITC-100HT High Temperature Ceramic Coating, pint', usd: 54, seller: 'anvilfire', url: 'https://anvilfire.com/sales/blacksmith-supplies/itc-100ht', seen: D3, note: `${SEARCHED}: a pint covers up to 12 sq ft thinned, which is more than the forge's 0.3 m² chamber wall; the gallon is $539` }] },
  refractory: { what: 'refractory castable, by the tub: a crucible furnace\'s 50 mm lining', offers: [
    { name: 'Rutland Castable Refractory Cement, 25 lb tub', usd: 107.99, seller: 'FireplacesDirect', url: 'https://fireplacesdirect.com/products/rutland-castable-refractory-cement-25-lb-tub', seen: D3, note: `${SEARCHED}: the furnace's lining is 16.5 litres, about 33 kg, so it is three of these tubs and is charged one. Tractor Supply's listing for the same 25 lb tub showed $54.99 and Home Depot's is discontinued; this is the cheapest page with a figure on it that was opened` }] },
  plaster: { what: 'pottery plaster, 50 lb bag: a wheel head\'s facing', offers: [
    { name: 'USG No. 1 Pottery Plaster, 50 lb bag', usd: 31.98, seller: 'New Mexico Clay', url: 'https://nmclay.com/usg-1-pottery-plaster', seen: D3, note: `${SEARCHED}: the wheel head's 10 mm facing is 0.7 litres, about 1.3 kg, of a 23 kg bag — a bag is the smallest it is sold in` },
    { name: 'Pottery Plaster (USG) No. 1 – 50 lb Bag', usd: 44, seller: 'Clay-King', url: 'https://www.clay-king.com/product/pottery-plaster-no-1-50-lb-bag/', seen: D3, note: SEARCHED }] },
  pail: { what: 'steel pail, 5 US gallon: a crucible furnace\'s shell', offers: [
    { name: 'Steel Pail - 5 Gallon, Open Top, Unlined, Gray (S-20030GR)', usd: 15, min: 3, seller: 'Uline', url: 'https://www.uline.com/Product/Detail/S-20030GR/Pails/Steel-Pail-5-Gallon-Open-Top-Unlined-Gray', seen: D3, note: `${SEARCHED}: $15 each and three is the least it sells, so one furnace shell is a $45 order; lids are sold apart. 286 mm across and 375 mm tall against the bill's 300 × 350` }] },
  // the burner: black iron fittings and a welding tip, which is the cheapest pattern there is and the one the forge's
  // own bill names piece by piece (the 1/8 in nipple the jet screws into was not found listed on its own)
  pipe: { what: '3/4 in black steel pipe nipple, 250 mm, threaded both ends', offers: [
    hd('The Plumber\'s Choice Black Steel Pipe 3/4 in. x 10 in. Nipple Fitting, 4-pack', 17.71, 'The-Plumber-s-Choice-Black-Steel-Pipe-3-4-in-x-10-in-Nipple-Fitting-Pack-of-4-3410NPBL-4/309802368', { per: 4, note: `${SEARCHED}: $4.43 a nipple, and a 10 in (254 mm) one is the burner's 230 mm mixing tube with the thread. The store page showed none in stock at the store it checked; an STZ single was listed at $7.96` })] },
  'pipe-32': { what: '1 1/4 in (32 NB) black steel pipe: the mount a forge burner drops through', offers: [
    hd('PLUMBFLEX Black Steel Pipe 1-1/4 in. x 6 in. Nipple Fitting, 10-pack', 40.71, 'PLUMBFLEX-Black-Steel-Pipe-1-1-4-in-x-6-in-Nipple-Fitting-10-Pack-1160NPBL-10/309739970', { per: 10, note: `${SEARCHED}: $4.07 a nipple. 1 1/4 in nominal bore is 42.2 mm outside, which is the forge's 42 mm mount, and a 6 in (152 mm) nipple cut down is its 120 mm. The store page showed none in stock at the store it checked; a single malleable one was listed elsewhere at $5.49` })] },
  tee: { what: '3/4 in black iron tee: a burner\'s body', offers: [
    hd('PIPE DECOR 3/4 in. Black Iron Tee Fitting, 8-pack', 37.99, 'PIPE-DECOR-3-4-in-Black-Iron-Tee-Fitting-8-Pack-PDB-T-34-8/317889483', { per: 8, note: `${SEARCHED}: $4.75 a tee in an 8-pack, which is the smallest pack this seller listed; a single malleable-iron tee of the same size was listed elsewhere at $4.44` })] },
  reducing: { what: '1 1/4 × 3/4 in black malleable iron reducing coupling: a burner\'s flare', offers: [
    hd('Southland 1-1/4 in. x 3/4 in. Black Malleable Iron FPT x FPT Reducing Coupling Fitting', 3.49, 'Southland-1-1-4-in-x-3-4-in-Black-Malleable-Iron-FPT-x-FPT-Reducing-Coupling-Fitting-521-364HN/302639750', { note: `${SEARCHED}: the flare of a naturally aspirated burner, bought as one fitting. The store page showed none in stock at the store it checked` })] },
  mig: { what: 'a 0.035 in MIG contact tip: the jet of a naturally aspirated burner', offers: [
    zoro('LINCOLN ELECTRIC Contact Tip KP11-35, .035 in (0.9 mm)', 17.5, 'lincoln-electric-contact-tip-lincoln-electric-threaded-kp11-35/i/G602659245/', { per: 10, min: 10, note: `${SEARCHED}: $1.75 each and sold in tens. A 0.035 in tip is a 0.9 mm orifice drilled and held to a welding tolerance for a dollar, which is why a forge's jet is one; the 1/8 in nipple it threads into is extra and was not found listed on its own` })] },

  // ---- a kiln's and a welder's own electrics, and the parts a machine turns on --------------------------------------
  controller: { what: 'PID temperature controller with a type-K input', offers: [
    { name: 'Inkbird ITC-106VH PID Temperature Controller with K sensor', usd: 29.99, seller: 'Inkbird', url: 'https://inkbird.com/products/itc-106-ksensor', seen: D3, note: `${SEARCHED}: the kit as this seller sells it is the controller, a 25 A solid-state relay on its heat sink and a K-type probe — the kiln's three electrical lines in one purchase, so pricing its relay and its thermocouple again would count this twice` }] },
  thermocouple: { what: 'type K thermocouple probe, 300 mm', offers: [
    { name: 'uxcell K-Type Ceramic Kiln Furnace Probe Thermocouple Sensor, 3 × 300 mm', usd: 16.89, seller: 'Walmart', url: 'https://www.walmart.com/ip/K-Type-Ceramic-Kiln-Furnace-Probe-Thermocouple-Sensor-Muffle-Furnace-Oven-High-Temperature-3x300mm/5334209392', seen: D3, stock: 'out', note: `${SEARCHED}, and shown out of stock: 3 × 300 mm rated to 1,100 °C, which is the kiln's length and over its cone-6 firing. Its sheath is ceramic where the bill says mineral-insulated — that is the kiln-rated form of the same probe; the 100 mm one is $14.59` }] },
  kanthal: { what: 'Kanthal A-1 resistance wire, 16 AWG', maker: 'TEMCo', mpn: 'Kanthal A-1 16 AWG', offers: [
    { name: 'TEMCo Kanthal A-1 Round Resistance Wire, 16 AWG, 50 ft', usd: 17.5, seller: 'TEMCo Industrial', url: 'https://temcoindustrial.com/electrical/wire/resistance-wire/', seen: D3, stock: 'out', note: `${SEARCHED}, off its resistance-wire category page, and shown out of stock: $15.75 on its own account. 50 ft (15.2 m) is the smallest spool listed in this gauge and the kiln's element is 7.2 m of it, so half a spool, charged whole` }] },
  // the 25 A solid-state relay and the spot welder's timer board are left unpriced on purpose: the only figures found
  // for a bare SSR were marketplace lots from outside the US, and pricing it from the Inkbird kit above would count
  // that one $29.99 purchase twice. A line with no honest price of its own stays unpriced.
  // keyed on "extension" and not on "spring": a printer's bed springs and an extruder's idler spring are compression
  // springs wound to their own rate, and charging them an extension spring's figure would be a price for another part
  extension: { what: 'extension spring', offers: [
    hd('Everbilt 2.625 in. x 0.75 in. x 0.105 in. Zinc Extension Spring', 2.75, 'Everbilt-2-625-in-x-0-75-in-x-0-105-Zinc-Extension-Spring-81778/203576946', { note: `${SEARCHED}: the welder's bill says only "return spring, extension" and gives it no size, so what is priced is a stock extension spring of a size that would lift its arm — 67 × 19 mm of 2.7 mm wire` })] },
  clevis: { what: 'clevis pin, 8 mm, and its split pin', offers: [
    { name: '5/16 x 1 Zinc Plated Steel Universal Clevis Pins, 8 pcs', usd: 15.58, per: 8, seller: 'Walmart', url: 'https://www.walmart.com/ip/600926595', seen: D3, note: `${SEARCHED}: 7.94 mm for the bill's 8 mm, which is the nearest inch pin; cotter pins come with these universal pins, and a 50-pack of 1/8 in cotters was listed at $14.49 besides` }] },
  phenolic: { what: 'phenolic (G-10) sheet, 6 mm: a spot welder\'s insulators', offers: [
    zoro('G-10 Garolite Sheet - 1/4" Thick x 12" Wide x 24" Long', 75.99, 'i/G7916822/', { per: 2, note: `${SEARCHED}: 6.35 mm for the bill's 6 mm, and one 12 × 24 in sheet makes both of the welder's 120 × 60 insulators many times over, hence \`per\` 2. It is sold in multiples of two sheets ($151.98); the 1/8 in 12 × 12 is $26.69` })] },
  welding: { what: '1/0 AWG welding cable', offers: [
    { name: 'TEMCo 1/0 Gauge AWG Welding Cable, 20 ft, black', usd: 64.68, seller: 'TEMCo Industrial', url: 'https://temcoindustrial.com/electrical/wire/welding-cable/', seen: D3, note: `${SEARCHED}, off its welding-cable category page: the sale figure for the shortest length listed, about $3.23 a foot. The welder's secondary is two turns, 600 mm of it, and is charged the 20 ft length because that is what is sold` }] },
  pneumatic: { what: 'pneumatic wheel, 10 in (4.10/3.50-4)', offers: [
    hd('Marathon 10 in. Pneumatic Universal Hand Truck Wheels, 2-pack', 28.97, 'Marathon-10-in-Pneumatic-Universal-Hand-Truck-Wheels-2-Pack-02310/205228244', { per: 2, note: `${SEARCHED}: $14.49 a wheel, 4.10/3.50-4 on a steel rim with a 5/8 in bore — the size the kart's bill names. A flat-free pair was listed at $55.88` })] },
  '6204': { what: 'ball bearing 6204-2RS (20 × 47 × 14)', maker: 'Timken', mpn: '6204-2RS', offers: [
    { name: 'Timken 6204-2RS Double Rubber Deep Groove Ball Bearing, 2-pack', usd: 11.92, per: 2, seller: 'an eBay seller', url: 'https://www.ebay.com/p/28046081013', seen: D3, note: `${SEARCHED}: $5.96 a bearing in a pair, free shipping, a US seller. Ten-packs of the same Timken bearing were listed at $6.00 and $6.50 each and a 100-pack at $1.78` }] },
  '6205': { what: 'ball bearing 6205-2RS (25 × 52 × 15)', maker: 'SKF', mpn: '6205-2RS', offers: [
    { name: 'SKF 6205-2RS C3 Rubber Seal Ball Bearing, 25x52x15', usd: 15.6, seller: 'Walmart', url: 'https://www.walmart.com/ip/6205-2RS-C3-SKF-Brand-Rubber-Seal-Ball-Bearing-25x52x15-6205-2RS-6205RS/5173968737', seen: D3, note: `${SEARCHED}: an SKF bearing from a marketplace seller. VXB's open 6205 was listed at $9.95 and a sealed no-name at $6.99; this is the one with a maker's name on it` }] },
  // a V-belt and the pulley it runs on: the bill's own words are "A-section V-belt 1000 mm" and "pulley, 60 mm V on
  // the motor", and until now the first of those was priced as a length of GT2 printer belt
  'v-belt': { what: 'V-belt, A section, 1,000 mm', offers: [
    { name: 'D&D Global Classic V-Belt A39/4L410, 1/2 in × 41 in', usd: 4.41, seller: 'Quality Farm Supply', url: 'https://www.qualityfarmsupply.com/products/classic-v-belt-1-2-x-41-a39-4l410', seen: D3, note: `${SEARCHED}, shown with six left: an A39 is 39 in (991 mm) inside, which is the wheel's 1,000 mm belt over its 240 and 60 mm pulleys at 260 mm centres. A Bestorq 4L410 was listed at $3.79 and a Gates Hi-Power A39 at $16.09` }] },
  'pulley-v-60': { what: 'V-belt pulley, 60 mm, on a motor shaft', offers: [
    { name: 'AMEC AK25X5/8 single groove fixed bore A pulley, 2.5 in OD × 5/8 in bore, cast iron', usd: 25, seller: 'Electric Motor Warehouse', url: 'https://electricmotorwarehouse.com/2-5-x-5-8-single-groove-fixed-bore-a-pulley-ak25x5-8/', seen: D3, note: `${SEARCHED}, free shipping: 63.5 mm for the bill's 60 mm, 5/8 in bore for a washing-machine motor's shaft, A section for the belt above. An import of the same size was listed at $14 and Browning's own at $57.80` }] },
  // a forge's gas train and a furnace's crucible, which are bought whole or not at all
  propane: { what: '20 lb propane cylinder: a forge\'s shell', offers: [
    hd('Flame King 20 lbs. Empty Propane Cylinder with Overflow Protection Device', 57.94, 'Flame-King-20-lbs-Empty-Propane-Cylinder-with-Overflow-Protection-Device-YSN201/302477701', { note: `${SEARCHED}: a new empty cylinder. The forge's own bill says a used one is free or a few dollars second-hand, which is what it is really built from — this is what it costs when nobody gives you one, and it is cut open only after it has been filled with water and had its valve out` })] },
  regulator: { what: 'propane regulator, 0–30 psi, POL, with its hose', offers: [
    { name: 'Bayou Classic 48 in. Stainless Steel High Pressure LP Hose & Adjustable Regulator', usd: 54.99, seller: 'Hemlock Hardware', url: 'https://hemlockhardware.com/products/801630-bayou-classic-48-in-stainless-steel-high-pressure-lp-hose-adjustable-regulator', seen: D3, note: `${SEARCHED}: 0–30 psi adjustable on a 4 ft stainless hose with a soft-nose POL nut, which is the forge bill's line entire. A gauge is not on it; kits with one were listed around $46` }] },
  crucible: { what: 'clay-graphite crucible, #6', offers: [
    { name: 'Nelyrho #6 (6 kg) silicon carbide clay graphite crucible', usd: 9.64, seller: 'Walmart', url: 'https://www.walmart.com/ip/149073534', seen: D3, note: `${SEARCHED}, a marketplace seller: cheap for a #6, and the figure is what the listing showed. A trade crucible of that size is dearer — PMC's 6 kg was listed at $134.34 and a #3 with tongs at $35.99 — and the furnace is sized round a #6, so read this as the bottom of the range` }] },
  footswitch: { what: 'momentary foot switch, 10 A', offers: [
    { name: 'TEMCo CN0002 Foot Switch, single pedal, momentary, 10 A', usd: 12.45, seller: 'TEMCo Industrial', url: 'https://temcoindustrial.com/electrical/relays-switches/foot-switches/', seen: D3, note: `${SEARCHED}, off its foot-switch category page: $11.21 on its own account. The welder's foot switch carries only the timer's trigger, not the weld current, which is why a 10 A pedal is enough` }] },
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

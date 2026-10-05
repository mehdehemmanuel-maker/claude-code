// The laws the embodiment's experiment updated (docs/NEXUS-FROM-REALITY.md, section 28): each found by generating the
// printer, reading what came out against the laws, and changing the law, never the example. The rounds inside one run
// remedy the design; these are the changes to the rules the rounds run by. Kept, so how the rules came to be is part of
// what they are.

export interface LawUpdate { n: number; found: string; was: string; now: string; module: string }

export const LAW_UPDATES: LawUpdate[] = [
  { n: 1, module: 'motor', found: 'a gauge chooser picked the thickest wire that fit', was: 'the last size that holds', now: 'the thinnest that holds its insulation and drop' },
  { n: 2, module: 'motor', found: 'turns set by the voltage overflowed the slots and the stack ran away', was: 'turns from E = 4.44 f N k_w Φ alone', now: 'the fewest of what the voltage allows, what slots five widths deep hold, and what the thinnest wire fills' },
  { n: 3, module: 'motor', found: 'the heat remedy lengthened the stack even when the iron made the heat', was: 'one remedy for heat', now: 'fewer poles when iron loss dominates, a longer stack when copper does' },
  { n: 4, module: 'axis', found: 'rods clamped at both ends were bent as if merely resting', was: 'δ = 5 F L³ / (384 E I)', now: 'δ = F L³ / (192 E I), fixed at both ends' },
  { n: 5, module: 'embody', found: 'every motor winding at 296–378 °C at 0.13 A, every cable at 293 °C', was: 'room temperature read as its stored value', now: 'a leaf holds kelvin; the parts\' rules read degrees Celsius' },
  { n: 6, module: 'embody', found: 'one stream at 2.3 m/s and 1340 m/s²: a 417 A motor, a 102 kW supply', was: 'the stream count set by the heater alone', now: 'what grows with speed is relieved by more streams: n √(δ/limit) for a stretch, n ∛(P/limit) for power' },
  { n: 7, module: 'embody', found: 'acceleration taken as reaching speed within ten stream widths', was: 'a = v² / (20 w)', now: 'a = v² / (ℓ (1/η − 1)): a line as long as the part spends a tenth of its time changing speed' },
  { n: 8, module: 'embody', found: 'overlapping parts counted to 50 and never called a flaw', was: 'a count', now: 'each pair of assemblies that overlap is a flaw, located in its parts' },
  { n: 9, module: 'placement', found: '23 overlaps: axes, frame and supply set by hand coordinates', was: 'positions written in', now: 'each thing rests on what holds it, from the plate up; a member wherever a mount lands' },
  { n: 10, module: 'placement', found: 'only one pose was checked: the head could crash into the z towers at the end of its travel', was: 'parts where they stand', now: 'each moving part sweeps its travel; nothing fixed may stand in it, else the frame is made larger along it' },
  { n: 11, module: 'placement', found: 'two corner brackets met in the inside corner, eight times', was: 'a bracket on every joint', now: 'where three members meet, one joint bracketed, the other end-tapped through the post' },
  { n: 12, module: 'axis', found: 'the y motor stood inside the member its own axis hangs from', was: 'the motor on the far side of the carriage', now: 'the drive stands on the carriage\'s side, away from the face the axis mounts by' },
  { n: 13, module: 'placement', found: 'the supply through a post, the inlet through a member', was: 'a corner chosen by hand', now: 'the nearest place to where it is wanted that is clear of every part and every sweep' },
  { n: 14, module: 'electrical', found: 'both of an encoder\'s signal conductors yellow in one cable', was: 'a colour by function alone', now: 'conductors in one cable told apart: where a colour is taken, the next in IEC 60062 order' },
  { n: 15, module: 'embody', found: 'for a 300 mm part the split ran away to 55 streams and a 462 mm block: each stream added the mass that loaded the axes', was: 'a remedy applied while its flaw stands', now: 'a remedy that does not relieve its flaw is undone and the flaw located; streams no more than span the part' },
  { n: 16, module: 'heater', found: 'a 12-hour part needed 210 W from a block allowed two cartridges', was: 'at most a second cartridge', now: 'another cartridge alongside, as many as the streams the block holds' },
];

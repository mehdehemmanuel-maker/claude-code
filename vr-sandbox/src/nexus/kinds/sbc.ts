// Single-board computers and the microcontroller boards their makers sell beside them: every Raspberry Pi board that
// is a board (5, 4 Model B, 3 Model B+, Zero 2 W, Compute Module 5, Pico, Pico W, Pico 2, Pico 2 W), the Orange Pi 5
// line, and D-Robotics' robot development kits (RDK X3, RDK X5, RDK S100, S100P). Each board's chip, cores and clock,
// its AI accelerator, the memory it is sold with, its size, its weight where its maker gives one, its power and its
// ports, from its maker's own page or datasheet (named in `src`); where a maker gives no weight, the board's drawing
// weighs it (src/nexus/sbc.ts) and says so.

import { bare, type KindDef, type P } from './core';
import { boardDef, BOARD_DEFS, boardMakeup, boardMass } from '../sbc';

const s = (p: P, k: string) => String(p[k]);

export const SBC_KINDS: KindDef[] = [
  {
    id: 'sbc', name: 'single-board computer', path: 'Electrical/Boards and controllers/Single-board computers', says: 'a whole computer on one board: its system-on-chip, its memory, its ports and its 40-pin header, ready to boot from a card', std: 'the boards Raspberry Pi, Orange Pi and D-Robotics sell, each as its maker\'s page or datasheet gives it',
    axes: [bare('board', 'board', Object.keys(BOARD_DEFS).filter((k) => BOARD_DEFS[k]!.cls !== 'pico')), bare('ram', 'memory', (p) => boardDef(s(p, 'board')).ram.map((r) => `${r}GB`))],
    title: (p) => `${boardDef(s(p, 'board')).name}, ${s(p, 'ram').replace('GB', ' GB')}`,
    of: (p) => boardMakeup(s(p, 'board')), make: 'solder', how: 'its chips and parts printed with paste on a many-layer board, placed, reflowed; its connectors through-hole, wave- or selectively soldered',
    spec: (p) => { const b = boardDef(s(p, 'board')); return `${b.soc}: ${b.cpu}${b.ai ? `; ${b.ai}` : ''}${b.gpu ? `; ${b.gpu}` : ''}; ${s(p, 'ram').replace('GB', ' GB')} ${b.ramType}; ${b.ports}; power ${b.power}; ${b.L} × ${b.W} mm (${b.src})`; },
    box: (p) => { const b = boardDef(s(p, 'board')); return [b.L, b.W, b.H]; },
    g: (p) => { const b = boardDef(s(p, 'board')); return b.g ?? +boardMass(s(p, 'board')).toFixed(1); }, look: 'board',
  },
  {
    id: 'pico', name: 'Raspberry Pi Pico board', path: 'Electrical/Boards and controllers/Microcontroller boards', says: 'Raspberry Pi\'s microcontroller board: its RP2040 or RP2350 on a castellated board 51 × 21 mm, programmed in MicroPython or C over USB', std: 'Raspberry Pi\'s Pico datasheets',
    axes: [bare('board', 'board', Object.keys(BOARD_DEFS).filter((k) => BOARD_DEFS[k]!.cls === 'pico'))],
    title: (p) => boardDef(s(p, 'board')).name, of: (p) => boardMakeup(s(p, 'board')), make: 'solder', how: 'its chip, flash, crystal and regulator reflowed on a two-layer board, its edges castellated to solder it flat to another board or take headers',
    spec: (p) => { const b = boardDef(s(p, 'board')); return `${b.soc}: ${b.cpu}; ${b.ramType}; ${b.ports}; power ${b.power}; ${b.L} × ${b.W} mm (${b.src})`; },
    box: (p) => { const b = boardDef(s(p, 'board')); return [b.L, b.W, b.H]; },
    g: (p) => { const b = boardDef(s(p, 'board')); return b.g ?? +boardMass(s(p, 'board')).toFixed(1); }, look: 'board',
  },
];

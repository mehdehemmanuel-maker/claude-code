// Molecular-biology bench instruments as kinds, by their makers' own published figures: a thermal cycler, a
// microcentrifuge, a horizontal gel tank with its supply, a blue-light transilluminator, an air-displacement pipette and
// a Class II Type A2 safety cabinet. Their figures and their drawings are in src/nexus/lab.ts, which also holds what
// each does as numbers (a program's time, the force at a speed, a gel's field, a melting point, a pipette's error,
// a cabinet's airflow).

import { bare, type KindDef, type P } from './core';
import { BSC_A2, C5425, C5425_RADIUS, MINISUB, POWERPAC, RESEARCH_PLUS, SAFE_IMAGER, T100, cabinetAir } from '../lab';

const s = (p: P, k: string) => String(p[k]);
const air = cabinetAir();

export const LAB_KINDS: KindDef[] = [
  {
    id: 'thermalcycler', look: 'case', name: 'thermal cycler', path: 'Electrical/Instruments/Thermal cyclers',
    says: 'a block of 96 wells driven up and down a program of temperatures by Peltier modules, under a lid held hot so nothing condenses on the tubes\' caps',
    std: 'its maker\'s specification bulletin (Bio-Rad\'s T100)',
    axes: [bare('model', 'model', ['T100'])], title: () => T100.name,
    of: () => 'cycler-block cycler-lid heatsink-cast {fan 60x25 24V} pcb-bare stand-foot*4', make: 'assemble',
    how: 'its block clamped on three Peltier modules over a finned sink its fan pulls air through; the current through the Peltiers reversed to heat or cool, its block\'s temperature read and held; its lid heated above the reaction so the liquid stays in the bottom of the tube',
    spec: () => `${T100.wells} × ${T100.tubeMl} ml tubes or one 96-well plate; ${T100.range[0]}–${T100.range[1]} °C; ${T100.ramp.max} °C/s at most and ${T100.ramp.avg} °C/s on average; a gradient of ${T100.gradient.span[0]}–${T100.gradient.span[1]} °C across ${T100.gradient.range[0]}–${T100.gradient.range[1]} °C, so eight annealing temperatures run at once; ±${T100.accuracy} °C of its target, ±${T100.uniformity} °C well to well; 100–240 V, ${T100.watts} W at most; ${T100.size[0]} × ${T100.size[1]} × ${T100.size[2]} mm, ${T100.kg} kg (${T100.src})`,
    box: () => T100.size, g: () => T100.kg * 1000,
  },
  {
    id: 'centrifuge', look: 'case', name: 'microcentrifuge', path: 'Electrical/Instruments/Centrifuges',
    says: 'a fixed-angle rotor spun fast in a steel bowl, so what is heavier in a tube is thrown to its bottom',
    std: 'its maker\'s figures as its sellers list them (Eppendorf\'s 5425)',
    axes: [bare('model', 'model', ['5425'])], title: () => C5425.name,
    of: () => 'centrifuge-rotor centrifuge-bowl centrifuge-lid pcb-bare stand-foot*4', make: 'assemble',
    how: 'its rotor on a brushless motor hung under a steel bowl on damping mounts; its lid latched shut while it turns and its speed watched, so an unbalanced rotor is caught and braked',
    spec: () => `${C5425.places} × ${C5425.tubeMl[0]}/${C5425.tubeMl[1]} ml; ${C5425.rpm.toLocaleString('en')} rpm, ${C5425.g.toLocaleString('en')} × g at most (its tubes about ${C5425_RADIUS.toFixed(0)} mm out, from those two figures); ${C5425.size[0]} × ${C5425.size[1]} × ${C5425.size[2]} mm, ${C5425.kg} kg; 120 V, ${C5425.watts} W (${C5425.src}). Hazards: a rotor loaded unevenly or past its speed can burst; its bowl and latched lid are what stands between that and the room, so it is never run with its lid forced or its rotor past the maker\'s rating, and a rotor is retired at the hours its maker gives`,
    box: () => C5425.size, g: () => C5425.kg * 1000,
  },
  {
    id: 'geltank', look: 'box', name: 'horizontal electrophoresis tank', path: 'Electrical/Instruments/Electrophoresis',
    says: 'a buffer tank with a platinum wire down each end: a voltage across them pulls what is charged through a gel set in the middle, the smaller the faster',
    std: 'its maker\'s figures as its sellers list them (Bio-Rad\'s Mini-Sub Cell GT)',
    axes: [bare('model', 'model', ['Mini-Sub-GT'])], title: () => MINISUB.name,
    of: () => 'gel-tank gel-tray gel-comb gel-electrode*2 gel-lid gel-agarose gel-buffer', make: 'assemble',
    how: 'the gel cast in its tray with the comb stood in it, the comb lifted out, the tray set in the tank and the buffer poured over it; the lid\'s two leads onto its supply, which cannot be connected with the lid off',
    spec: () => `a ${MINISUB.tray[0] / 10} × ${MINISUB.tray[1] / 10} cm tray, about ${MINISUB.bufferMl} ml of buffer, ${MINISUB.size[0]} × ${MINISUB.size[2]} × ${MINISUB.size[1]} mm; its electrodes platinum, which does not corrode at these voltages (${MINISUB.src}). Hazards: its lid carries the voltage, so it is on before the supply is, and the leads are pulled before a hand goes in`,
    box: () => MINISUB.size, g: () => MINISUB.kg * 1000,
  },
  {
    id: 'gelsupply', look: 'case', name: 'electrophoresis power supply', path: 'Electrical/Power/Laboratory supplies',
    says: 'a supply that holds either its volts or its current steady, whichever it reaches first, and counts the volt-hours a run has had',
    std: 'its maker\'s figures as its sellers list them (Bio-Rad\'s PowerPac Basic)',
    axes: [bare('model', 'model', ['PowerPac-Basic'])], title: () => POWERPAC.name,
    of: () => 'pcb-bare stand-foot*4', make: 'assemble',
    how: 'it is set to a voltage or a current; it gives whichever it reaches first and crosses over by itself as the gel\'s resistance changes through the run',
    spec: () => `${POWERPAC.volts[0]}–${POWERPAC.volts[1]} V in 1 V steps, ${POWERPAC.mA[0]}–${POWERPAC.mA[1]} mA in 1 mA steps, ${POWERPAC.watts} W at most; constant voltage or constant current with automatic crossover; ${POWERPAC.size[0]} × ${POWERPAC.size[2]} × ${POWERPAC.size[1]} mm, ${POWERPAC.kg} kg (${POWERPAC.src}). Hazards: at its full ${POWERPAC.volts[1]} V its output is dangerous to touch; it is switched off and its leads pulled before a lid comes off`,
    box: () => POWERPAC.size, g: () => POWERPAC.kg * 1000,
  },
  {
    id: 'transilluminator', look: 'case', name: 'blue-light transilluminator', path: 'Electrical/Instruments/Imaging',
    says: 'a lit viewing surface of blue LEDs: a stained gel laid on it is read through an amber screen, without the ultraviolet an older one used',
    std: 'its maker\'s own figures (Invitrogen\'s Safe Imager 2.0)',
    axes: [bare('model', 'model', ['Safe-Imager-2'])], title: () => SAFE_IMAGER.name,
    of: () => 'pcb-bare cover-glass amber-filter stand-foot*4', make: 'assemble',
    how: 'its LEDs under a diffuser light the gel from below; the stain in it glows, and the amber screen over it cuts the blue so the glow can be seen and photographed',
    spec: () => `LEDs peaking near ${SAFE_IMAGER.nm} nm, no ultraviolet; a ${SAFE_IMAGER.view[0] / 10} × ${SAFE_IMAGER.view[1] / 10} cm viewing surface; ${SAFE_IMAGER.size[0]} × ${SAFE_IMAGER.size[2]} × ${SAFE_IMAGER.size[1]} mm; ${SAFE_IMAGER.hours.toLocaleString('en')} h of LED life; its amber filter and viewing glasses with it (${SAFE_IMAGER.src}). Hazards: its light is bright, so it is looked at through the amber screen or the glasses, not straight on — and the stains a gel carries are handled by their own safety data sheet, gloved`,
    box: () => SAFE_IMAGER.size, g: () => SAFE_IMAGER.kg * 1000,
  },
  {
    id: 'pipette', look: 'box', name: 'air-displacement pipette', path: 'Electrical/Instruments/Liquid handling',
    says: 'a piston in a barrel: its stroke, set by the volume dial, moves a column of air that draws liquid into a disposable tip and pushes it out again',
    std: 'its maker\'s calibration figures by EN ISO 8655 (Eppendorf\'s Research plus)',
    axes: [bare('model', 'model', ['Research-plus-1000'])], title: () => RESEARCH_PLUS.name,
    of: () => 'pipette-body pipette-plunger pipette-piston piston-seal spring-compression pipette-dial pipette-ejector pipette-cone', make: 'assemble',
    how: 'the plunger is pressed to its first stop, the tip put in the liquid and the plunger let up to draw; pressed to the first stop again to deliver, and past it to blow out the last of it; the ejector drops the used tip without it being touched',
    spec: (p) => `${RESEARCH_PLUS.ul[0]}–${RESEARCH_PLUS.ul[1]} µl${s(p, 'model') ? '' : ''}; by EN ISO 8655 with its maker's own tips: ${RESEARCH_PLUS.error.map(([v, sys, rnd]) => `at ${v} µl ±${sys} % systematic and ±${rnd} % random`).join(', ')}; about ${RESEARCH_PLUS.length} mm long, ${RESEARCH_PLUS.kg * 1000} g (${RESEARCH_PLUS.src}). Its error figures hold only with the tips they were measured with, and only while its calibration is in date`,
    box: () => [26, RESEARCH_PLUS.length, 30], g: () => RESEARCH_PLUS.kg * 1000,
  },
  {
    id: 'biosafetycabinet', look: 'box', name: 'Class II Type A2 microbiological safety cabinet', path: 'Mechanical/Enclosures/Safety cabinets',
    says: 'a cabinet whose blower pulls air in through its front opening and down through the work on HEPA-filtered air, so what is on the bench stays on the bench and what is in the air stays in the cabinet',
    std: 'its maker\'s listing (Labconco\'s Purifier Logic+ 4 ft) and NSF/ANSI 49',
    axes: [bare('model', 'model', ['Logic-plus-4ft'])], title: () => BSC_A2.name,
    of: () => 'bsc-panel*4 bsc-tray bsc-grille*2 bsc-blower bsc-sash bsc-stand*4', make: 'assemble',
    how: 'its blower pushes air up the back plenum and down through the work zone\'s HEPA filter; the grilles at the front and back draw it off again, about 70 % of it round once more and the rest out through the second HEPA filter and the collar on its top',
    spec: () => `${BSC_A2.inner[0] / 10} cm wide inside, ${BSC_A2.height / 10} cm high without its stand, a ${BSC_A2.sash} mm sash opening, under 63 dBA; at NSF/ANSI 49's velocities that is about ${Math.round(air.inflow)} m³/h in through the opening, ${Math.round(air.downflow)} m³/h down through the work zone and ${Math.round(air.exhaust)} m³/h out of the collar; about ${BSC_A2.recirculated * 100} % of its air round again (${BSC_A2.src}). Hazards: ${BSC_A2.hazard}`,
    box: () => [BSC_A2.inner[0] + 40, BSC_A2.height + 760, BSC_A2.inner[1] + 60], g: () => BSC_A2.kg * 1000,
  },
];

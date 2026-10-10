// Instruments that see what an eye cannot, each sized by the law that makes it work (src/nexus/instruments.ts): an
// x-ray tube by its voltage and the heat its anode must take, a flat panel by its pixels, a thermal camera by its
// array and its lens, an interferometer by how far its mirror travels, a lidar by what comes back off a target. Every
// spec here is that arithmetic run, not a figure looked up, and the two that are dangerous say so in every size.

import { ax, bare, type KindDef, type P } from './core';
import { HAZARDS, anodeSeconds, camKg, ftir, ftirKg, glow, halfValue, lidar, lidarKg, panelKg, pulseResolution, shieldFor, thermalCam, tubeKg, xrayTube, MU_100KEV } from '../instruments';

const n = (p: P, k: string): number => Number(p[k]);
const s = (p: P, k: string): string => String(p[k]);

export const INSTRUMENT_KINDS: KindDef[] = [
  {
    id: 'xraytube', look: 'case', name: 'x-ray tube', path: 'Electrical/Instruments/X-ray',
    says: 'a vacuum tube that turns electricity into x-rays by stopping electrons in metal: a filament boils them off, a hundred thousand volts throws them at a tungsten target, and about one part in a hundred and twenty of what arrives leaves as a beam. The rest is heat, and the whole design is about that heat',
    std: 'Duane–Hunt for the hardest photon it can make and the thick-target yield for how much of it there is (Attix; Bushberg); its sizes those of medical and industrial tubes, its masses estimates',
    axes: [ax('kV', 'tube voltage', 'kV', [50, 80, 100, 125, 160]), ax('mA', 'tube current', 'mA', [20, 50, 100, 200, 400]), bare('anode', 'anode', ['rotating', 'fixed'])],
    title: (p) => `${n(p, 'kV')} kV x-ray tube, ${n(p, 'mA')} mA, ${s(p, 'anode')} anode`,
    of: () => 'glass tungsten molybdenum lead oil-transformer al-6061 copper nickel steel-chrome steel-electrical pbt xray-anode filament-tungsten lead-sheet xray-window',
    make: 'assemble',
    how: 'an insert made and pumped down to vacuum, aged at voltage, then set in a lead-lined housing and the housing filled with oil',
    spec: (p) => { const t = xrayTube(n(p, 'kV'), n(p, 'mA')); const hvl = halfValue(MU_100KEV.lead!) * 1000;
      return `${t.says}. ${(hvl).toFixed(2)} mm of lead halves that beam and ${(shieldFor(MU_100KEV.lead!, 0.001) * 1000).toFixed(1)} mm cuts it to a thousandth. An anode storing 300 kJ takes ${anodeSeconds(t.heat, 300000)} s of this before it is at its limit. ${HAZARDS.xray!.join('. ')}`; },
    // (the housing is what is seen: about 220 mm across and 330 long, with the collimator under it)
    box: () => [330, 260, 220],
    g: (p) => tubeKg(n(p, 'kV'), n(p, 'mA'), s(p, 'anode') as 'rotating' | 'fixed') * 1000,
  },
  {
    id: 'xraypanel', look: 'board', name: 'flat-panel x-ray detector', path: 'Electrical/Instruments/X-ray',
    says: 'what replaced film: a scintillator that turns x-rays into light, grown in needles so each one keeps its light to itself, read by a transistor array on glass. It makes a picture in a second where a cassette took a trip to the darkroom',
    std: 'the sizes panels are sold in (the 35 × 43 cm that replaced the 14 × 17 inch cassette, and the 24 × 30); its masses fitted to what makers publish',
    axes: [bare('size', 'format', ['35x43', '27x35', '24x30']), ax('pitch', 'pixel pitch', 'µm', [100, 125, 150])],
    title: (p) => `${s(p, 'size').replace('x', ' × ')} cm flat panel, ${n(p, 'pitch')} µm`,
    of: () => 'cfrp csi-tl glass al-6061 fr4 scintillator-csi tft-array pcb-bare',
    make: 'assemble',
    how: 'a TFT array bonded to its backing plate, the scintillator grown onto it, the stack sealed into a tub with its boards and battery',
    spec: (p) => { const [w, h] = s(p, 'size').split('x').map((x) => Number(x) * 10), pitch = n(p, 'pitch');
      const px = Math.round(w * 1000 / pitch), py = Math.round(h * 1000 / pitch);
      return `${px} × ${py} pixels at ${pitch} µm over ${w} × ${h} mm: ${((px * py) / 1e6).toFixed(1)} megapixels, and the finest thing it can show is two pixels across, ${(pitch * 2 / 1000).toFixed(2)} mm. ${HAZARDS.xray![1]}`; },
    box: (p) => { const [w, h] = s(p, 'size').split('x').map((x) => Number(x) * 10); return [w!, 15, h!]; },
    g: (p) => { const [w, h] = s(p, 'size').split('x').map((x) => Number(x) * 10); return panelKg(w!, h!) * 1000; },
  },
  {
    id: 'thermalcamera', look: 'case', name: 'thermal camera', path: 'Electrical/Instruments/Infrared',
    says: 'a camera for the light everything warm gives off: a germanium lens, because glass is opaque past 2.5 µm, and an array of tiny bridges whose resistance changes as the heat arriving warms them. It sees in the dark and through smoke, and it cannot see through a window',
    std: 'Wien\'s displacement law for what it must be built to see and the array\'s own geometry for what it resolves; its sizes and masses those of handheld cameras, fitted to what makers publish',
    axes: [bare('px', 'detectors across', [160, 320, 640]), ax('pitch', 'detector pitch', 'µm', [12, 17]), ax('f', 'lens focal length', 'mm', [9, 13, 25])],
    title: (p) => `thermal camera, ${n(p, 'px')} × ${Math.round(n(p, 'px') * 0.75)}, ${n(p, 'f')} mm`,
    of: () => 'germanium al-6061 kovar silicon fr4 glass abs lens-germanium bolometer-array pcb-bare',
    make: 'assemble',
    how: 'an array wafer diced and sealed under vacuum with its getter, the lens barrel threaded onto the body, and the whole calibrated against a black body at two temperatures',
    spec: (p) => { const c = thermalCam(n(p, 'px'), n(p, 'pitch'), n(p, 'f'));
      return `${c.says}. ${glow(293.15).says}, which is the band this is built for. ${HAZARDS.infrared!.join('. ')}`; },
    box: () => [115, 95, 62],
    g: (p) => camKg(n(p, 'px'), n(p, 'f')) * 1000,
  },
  {
    id: 'ftir', look: 'case', name: 'FTIR spectrometer', path: 'Electrical/Instruments/Spectrometers',
    says: 'an infrared spectrometer with no grating and no slit: a beamsplitter sends light down two arms, one mirror moves, and what comes out is every wavelength at once, interfering. The spectrum is the Fourier transform of that, which is where the name comes from and why it takes a second where a scanning instrument takes minutes',
    std: 'the interferometer\'s own resolution (Griffiths & de Haseth: Δν̃ = 1/OPD); its sizes those of benchtop instruments, its masses estimates',
    axes: [ax('res', 'resolution', '1/cm', [0.25, 0.5, 1, 2, 4]), bare('detector', 'detector', ['DTGS', 'MCT'])],
    title: (p) => `FTIR spectrometer, ${n(p, 'res')} cm⁻¹, ${s(p, 'detector')}`,
    of: (p) => `cast-iron al-6061 kbr zinc-selenide silicon-carbide glass kovar abs ir-glower beamsplitter-kbr helium-neon-laser ${s(p, 'detector') === 'MCT' ? 'mct-detector' : 'dtgs-detector'}`,
    make: 'assemble',
    how: 'an optical bench aligned on a cast base, its mirrors on kinematic mounts, the whole purged with dry air and left purged for its life',
    spec: (p) => { const f = ftir(n(p, 'res'));
      return `${f.says}. ${s(p, 'detector') === 'MCT' ? 'Its MCT detector is a hundred times more sensitive and must be filled with liquid nitrogen every day it is used' : 'Its DTGS detector works at room temperature and needs nothing'}. ${HAZARDS.spectrometer!.join('. ')}`; },
    box: () => [580, 260, 500],
    g: (p) => ftirKg(n(p, 'res')) * 1000,
  },
  {
    id: 'lidar', look: 'can', name: 'scanning lidar', path: 'Electrical/Sensors/Lidar',
    says: 'a laser that measures by its own echo: a pulse goes out, a photodiode times what comes back, and the range is half that time times the speed of light. A head of them spins, so a point becomes a line and a line becomes a cloud',
    std: 'time of flight and the lidar range equation (Richmond & Cain); its sizes and masses Velodyne\'s published figures for the VLP-16 and VLP-32C',
    axes: [bare('channels', 'channels', [1, 16, 32, 64]), ax('rpm', 'spin', 'rev/min', [300, 600, 1200]), bare('wave', 'wavelength', [905, 1550])],
    title: (p) => `${n(p, 'channels')}-channel lidar, ${n(p, 'rpm')} rev/min, ${n(p, 'wave')} nm`,
    of: () => 'al-6061 pc pbt brass steel-electrical silicon fr4 pmma slip-ring photodiode-apd lens-plastic lamination-stack pcb-bare connector-housing',
    make: 'assemble',
    how: 'each channel\'s laser and detector aimed and potted, the head balanced, and the whole calibrated against a target board at a known range',
    spec: (p) => { const ch = n(p, 'channels'), rpm = n(p, 'rpm');
      const l = lidar({ Pt: n(p, 'wave') === 1550 ? 120 : 25, rho: 0.1, apertureMm: 25, nepW: 1e-9, channels: ch, rpm, hz: 18000 });
      return `${l.says}. A 5 ns pulse cannot tell apart two things closer than ${pulseResolution(5)} m, which is why a lidar reports more than one return for a shot through leaves. ${HAZARDS.lidar!.join('. ')}`; },
    box: () => [103, 72, 103],
    g: (p) => lidarKg(n(p, 'channels')) * 1000,
  },
];

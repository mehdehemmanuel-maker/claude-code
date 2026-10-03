// Standards: the documents that fix a part's dimensions, grades and tests so that any maker's part fits any other's.
// Each is described by what it fixes, and sourced to itself (S-6).
import type { Source } from '../../types';
import { Pack } from '../dsl';

const ISO: Source = { cite: 'ISO and IEC standards catalogue (iso.org, iec.ch), scopes as published', kind: 'standard' };

export function standards(): Pack {
  const p = new Pack('standards', ISO);
  const st = (id: string, cite: string, says: string, links: Parameters<Pack['link']>[1] = {}) => { const src: Source = { cite, kind: 'standard' }; p.e(id, 'standard', says, { source: src }); if (Object.keys(links).length) p.link(id, links, src); };
  st('std.iso-286', 'ISO 286-1:2010, ISO 286-2:2010', 'The ISO code system for tolerances on linear sizes: tolerance grades IT01 to IT18 and the fundamental deviations that make clearance, transition and interference fits (H7/g6 running, H7/k6 location, H7/p6 press).', { 'governed-by': ['hertz.contact'] });
  st('std.iso-15', 'ISO 15:2017', 'Rolling bearings, radial bearings: boundary dimensions, the bore, outside diameter and width series, so a 6204 is the same from every maker.');
  st('std.iso-3290', 'ISO 3290-1:2014', 'Rolling bearings, balls: dimensions, grades and tolerances of steel balls, grade 3 to grade 200 by sphericity.');
  st('std.iso-1328', 'ISO 1328-1:2013', 'Cylindrical gears: the accuracy grades of their teeth, pitch, profile and helix deviations, grade 1 finest to grade 11.');
  st('std.iso-14', 'ISO 14:1982', 'Straight-sided splines for cylindrical shafts with internal centering: dimensions, tolerances and verification.');
  st('std.din-5480', 'DIN 5480-1:2006', 'Involute splines with 30° pressure angle: modules, tooth counts, fits and reference diameters.');
  st('std.iso-773', 'ISO 773:1969', 'Rectangular or square parallel keys and their keyways: width and height by shaft diameter, in millimetres.');
  st('std.din-6885', 'DIN 6885-1:1968', 'Parallel keys and their keyways: the key section for each shaft diameter range, forms A round-ended and B square-ended.');
  st('std.iso-14589', 'ISO 14589:2000', 'Blind rivets: the mechanical tests, shear and tensile strength of the set rivet.');
  st('std.iso-3601', 'ISO 3601-1:2012', 'Fluid power systems, O-rings: inside diameters, cross-sections, tolerances and the housing groove dimensions.');
  st('std.din-2095', 'DIN 2095:1973 (superseded by DIN EN 15800:2009)', 'Cold-formed helical compression springs: quality grades and tolerances on load, length and diameter.');
  st('std.en-13906', 'EN 13906-1:2013, -2, -3', 'Helical springs of round wire and bar: design and calculation of compression, extension and torsion springs.', { 'governed-by': ['spring.rate'] });
  st('std.iso-4184', 'ISO 4184:1992', 'Classical and narrow V-belts: lengths and sections Z, A, B, C, D and SPZ, SPA, SPB, SPC.');
  st('std.iso-5296', 'ISO 5296-1:1989', 'Synchronous belts: pitches, tooth profiles, widths and the matching pulleys, MXL to XXH.');
  st('std.iso-606', 'ISO 606:2015', 'Short-pitch transmission precision roller and bush chains: dimensions and tensile strengths of the metric series, 06B, 08B, 10B, 12B, 16B.');
  st('std.ansi-b29.1', 'ANSI/ASME B29.1-2011', 'Precision power transmission roller chains: pitches, dimensions and tensile strengths of the inch series, 40, 50, 60, 80.');
  st('std.awg', 'ASTM B258-18 (American Wire Gauge)', 'American Wire Gauge: wire diameters by gauge number, each step 1.123 times the last in diameter, ten gauges a tenfold area.', { 'governed-by': ['wire.resistance'] });
  st('std.iec-60228', 'IEC 60228:2004', 'Conductors of insulated cables: classes 1 solid, 2 stranded, 5 and 6 flexible, their cross-sections and maximum resistances per kilometre.', { 'governed-by': ['wire.resistance'] });
  st('std.ipc-2221', 'IPC-2221B:2012', 'Generic standard on printed board design: trace widths for a current and a temperature rise, clearances for a voltage, materials and layout rules.', { 'governed-by': ['joule', 'wire.resistance'] });
  st('std.ipc-6012', 'IPC-6012E:2020', 'Qualification and performance of rigid printed boards: plating thicknesses, hole quality and acceptance by class 1, 2 or 3.');
  st('std.ipc-j-std-001', 'IPC J-STD-001H:2020', 'Requirements for soldered electrical and electronic assemblies: what an acceptable solder joint is, materials, processes and inspection.');
  return p;
}

// What a conductor can be made as: the sections a wire is sold in, and the insulation around it. The insulation's
// temperature limit is a standard's; its conductivity, thickness and the room air's surface coefficient are estimates.

/** Nominal cross-sections of conductors, mm² (IEC 60228). */
export const SECTIONS_MM2 = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
export const SECTIONS_SOURCE = 'IEC 60228: nominal cross-sectional areas of conductors';

export const PVC = {
  hottest: { value: 70, unit: 'degC', source: 'IEC 60364-5-52: the largest conductor temperature for PVC insulation, 70 °C' },
  conductivity: { value: 0.17, unit: 'W/m K', source: 'estimate: PVC conducts heat at about 0.15 to 0.2 W/m K' },
  thickness: { value: 1e-3, unit: 'm', source: 'estimate: building wire is insulated about a millimetre thick' },
};

export const STILL_AIR_SURFACE = { value: 10, unit: 'W/m^2 K', source: 'estimate: still room air takes heat from a surface at about 10 W/m² K, convection and radiation together' };

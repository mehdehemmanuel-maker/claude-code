// What a body makes and holds, for holding a temperature across scale (src/nexus/substrate/hold.ts). Kleiber's law is a measured
// regularity of whole animals, kept here as data and never explained by the code; the tissue values and the observed
// smallest mammals are labelled estimates.

/** Basal metabolic rate of mammals against mass: 70 kcal per day times the mass in kg to the 3/4 (Kleiber, Hilgardia 6, 315, 1932), in watts. */
export const KLEIBER = { a: (70 * 4184) / 86400, b: 0.75, source: 'Kleiber, Hilgardia 6, 315 (1932): 70 kcal/day × (M/kg)^0.75' };

export const TISSUE = { density: 1000, cp: 3500, source: 'estimate: soft tissue is near water\'s density, and its specific heat near 3.5 kJ/kg K' };

export const BODY_TEMPERATURE = 310.15;

/** Thermal conductivities of the media a body sits in, W/(m K), at 25 °C. */
export const MEDIA_CONDUCTIVITY = { air: { k: 0.0262, source: 'CRC Handbook: air at 25 °C, 0.0262 W/m K' }, water: { k: 0.6065, source: 'IAPWS 2011: water at 25 °C, 0.6065 W/m K' } };

/** The smallest mammals observed on land and in the sea, kg: estimates of commonly cited adult masses. */
export const SMALLEST_MAMMAL = { land: { M: 0.0018, source: 'estimate: the Etruscan shrew, about 1.8 g' }, sea: { M: 14, source: 'estimate: the sea otter, adults from about 14 kg' } };

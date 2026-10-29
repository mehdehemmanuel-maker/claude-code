// What heat each material stands and how heat falls off in an engine bay: plain figures the heat gate (rules.ts) judges
// by, kept apart so what places parts by heat (machines.ts: a cooling module clear of a hot manifold) reads the same
// figures without importing the gate.

/** The most a material stands in service, °C (typical continuous ratings: makers' datasheets for each polymer family;
 *  metals and glass well above anything near an engine, given as where they begin to lose their strength or temper). */
export const MAX_SERVICE: Record<string, number> = {
  rubber: 80, nbr: 120, epdm: 150, neoprene: 120, silicone: 230, fkm: 230, pu: 90, foam: 90, pet: 150, cotton: 120, paper: 150,
  pp: 100, pe: 80, xlpe: 125, abs: 85, pvc: 60, pc: 120, pmma: 80, nylon: 120, pbt: 140, pom: 100, ptfe: 260, epoxy: 150, phenolic: 200, fibreglass: 300,
  'al-6061': 200, 'al-6063': 200, 'al-a380': 250, 'al-5052': 200, 'al-2024': 150, 'al-7075': 150, zamak: 100, lead: 150, solder: 150, copper: 250, brass: 250,
  glass: 450, 'glass-wool': 540, 'steel-low': 450, 'steel-alloy': 500, 'steel-spring': 250, 'steel-chrome': 400, 'cast-iron': 600, 'stainless-304': 870, 'nickel-alloy': 1000, ceramic: 1200, mica: 700, alumina: 1500,
};
/** How fast the heat of a hot surface falls off with distance from it (a length: its excess over the air about e times
 *  smaller each 40 mm, an estimate for an engine bay's mix of radiation and moving air). */
export const HEAT_FALLOFF = 0.04;
export const AMBIENT = 40;
